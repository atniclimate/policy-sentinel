import { Buffer } from "node:buffer";
import {
  digest,
  openPolicyRun,
  writePolicyDerived,
} from "../src/pipeline/policy-custody.mjs";
import { serializeAnalyzedCorpusV2 } from "../src/pipeline/analyzed-corpus-v2.mjs";
import {
  safeFile,
  assertProfileBindings,
  assertCaptureBindings,
} from "../src/core/local-output-bindings.mjs";
import {
  readOwnedFile,
  replayReviewedCorpus,
} from "../src/modules/intake/replay.mjs";
import {
  localCorpusBytes,
  validateLocalOutputFiles,
} from "../src/modules/output/local-workbench/write.mjs";
import {
  createSearchProjection,
  MAX_SEARCH_PROJECTION_MANIFEST_BYTES,
  serializeSearchProjectionManifest,
  verifySearchProjection,
} from "../src/modules/output/local-workbench/search-projection.mjs";

const fail = (code) => {
  throw new Error(code);
};

export async function writeLocalOutput(
  root,
  corpus,
  assets,
  { name = "gold", selection } = {},
) {
  if (!["gold", "discovery"].includes(name)) fail("INVALID_CORPUS_SELECTION");
  const run = await openPolicyRun(root);
  if (
    run.owner.runId !== corpus.runId ||
    run.owner.trustDomain !== "real_source_local"
  )
    fail("OUTPUT_RUN_MISMATCH");
  assertProfileBindings(corpus, run);
  assertCaptureBindings(corpus, run);
  let corpusBytes = localCorpusBytes(corpus);
  const sealBytes = await readOwnedFile(root, `review/${name}-seal.json`, 4096);
  const seal = JSON.parse(sealBytes.toString("utf8"));
  if (
    seal.corpusDigest !== corpus.contentDigest ||
    seal.outputDigest !== digest(corpusBytes)
  )
    fail("OUTPUT_REVIEW_SEAL_MISMATCH");
  let searchProjection;
  let projectionBytes;
  if (selection !== undefined) {
    // The caller supplies the reviewed parent, never a self-asserted subset.
    const replay = await replayReviewedCorpus(root, { name });
    if (replay.corpus.contentDigest !== corpus.contentDigest)
      fail("OUTPUT_SOURCE_REPLAY_MISMATCH");
    const projected = createSearchProjection(replay.corpus, selection);
    corpus = projected.corpus;
    corpusBytes = localCorpusBytes(corpus);
    projectionBytes = serializeSearchProjectionManifest(projected.manifest);
    searchProjection = {
      file: "search-projection.json",
      fileDigest: digest(projectionBytes),
      bytes: projectionBytes.length,
      parentCorpusDigest: replay.corpus.contentDigest,
    };
  }
  const files = new Map(assets);
  if (
    files.has("corpus.json") ||
    files.has("local-profile.json") ||
    files.has("search-projection.json") ||
    !files.has("index.html")
  )
    fail("OUTPUT_ASSET_CONFLICT");
  files.set("corpus.json", corpusBytes);
  if (projectionBytes) files.set("search-projection.json", projectionBytes);
  files.set(
    "local-profile.json",
    Buffer.from(
      `${JSON.stringify({ kind: "policy_local_profile", schemaVersion: "1.0.0", trustDomain: "real_source_local", corpusDigest: corpus.contentDigest, corpusFile: "corpus.json", corpusFileDigest: digest(corpusBytes), corpusBytes: corpusBytes.length, publication: "closed", ...(searchProjection ? { searchProjection } : {}) }, null, 2)}\n`,
    ),
  );
  for (const [name, bytes] of files)
    if (!safeFile(name) || !Buffer.isBuffer(bytes) || name.endsWith(".map"))
      fail("INVALID_LOCAL_ASSET");
  const fileEntries = [...files]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, bytes]) => ({
      path,
      digest: digest(bytes),
      bytes: bytes.length,
    }));
  const buildId = `build-${digest(Buffer.from(JSON.stringify(fileEntries))).slice(0, 32)}`;
  const manifest = {
    version: "1.0.0",
    runId: corpus.runId,
    buildId,
    corpusDigest: corpus.contentDigest,
    corpusSelection: name,
    corpusSealDigest: digest(sealBytes),
    publication: "closed",
    files: fileEntries,
    ...(searchProjection ? { searchProjection } : {}),
  };
  // The pointer is written last. Interrupted builds never replace the last complete output.
  for (const [name, bytes] of files)
    await writePolicyDerived(root, `local-output/${buildId}/${name}`, bytes);
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  await writePolicyDerived(
    root,
    `local-output/${buildId}/output-manifest.json`,
    manifestBytes,
  );
  const pointer = {
    version: "1.0.0",
    buildId,
    manifestDigest: digest(manifestBytes),
  };
  await writePolicyDerived(
    root,
    "review/local-output-current.json",
    Buffer.from(`${JSON.stringify(pointer, null, 2)}\n`),
  );
  return {
    ...pointer,
    corpusDigest: corpus.contentDigest,
    files: fileEntries.length,
    bytes: fileEntries.reduce((n, entry) => n + entry.bytes, 0),
  };
}

export async function readLocalOutput(root) {
  const run = await openPolicyRun(root);
  if (run.owner.trustDomain !== "real_source_local")
    fail("REAL_LOCAL_RUN_REQUIRED");
  const pointer = JSON.parse(
    (
      await readOwnedFile(root, "review/local-output-current.json", 4096)
    ).toString("utf8"),
  );
  if (!/^build-[a-f0-9]{32}$/.test(pointer.buildId))
    fail("INVALID_OUTPUT_POINTER");
  const base = `local-output/${pointer.buildId}`;
  const manifestBytes = await readOwnedFile(
    root,
    `${base}/output-manifest.json`,
    1024 * 1024,
  );
  if (digest(manifestBytes) !== pointer.manifestDigest)
    fail("OUTPUT_MANIFEST_DIGEST_MISMATCH");
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (
    manifest.runId !== run.owner.runId ||
    manifest.buildId !== pointer.buildId ||
    manifest.publication !== "closed" ||
    !Array.isArray(manifest.files) ||
    manifest.files.length > 1000
  )
    fail("INVALID_OUTPUT_MANIFEST");
  const files = new Map();
  let totalBytes = 0;
  for (const entry of manifest.files) {
    if (!safeFile(entry.path) || files.has(entry.path))
      fail("INVALID_OUTPUT_FILE");
    if (
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 0 ||
      entry.bytes > 128 * 1024 ** 2 ||
      (entry.path === "search-projection.json" &&
        entry.bytes > MAX_SEARCH_PROJECTION_MANIFEST_BYTES) ||
      !/^[a-f0-9]{64}$/.test(entry.digest)
    )
      fail("INVALID_OUTPUT_FILE_SIZE_OR_DIGEST");
    totalBytes += entry.bytes;
    if (totalBytes > 512 * 1024 ** 2) fail("OUTPUT_MEMORY_BOUND");
    const bytes = await readOwnedFile(
      root,
      `${base}/${entry.path}`,
      entry.path === "search-projection.json"
        ? MAX_SEARCH_PROJECTION_MANIFEST_BYTES
        : undefined,
    );
    if (bytes.length !== entry.bytes || digest(bytes) !== entry.digest)
      fail("OUTPUT_FILE_DIGEST_MISMATCH");
    files.set(entry.path, bytes);
  }
  if (
    !files.has("index.html") ||
    !files.has("corpus.json") ||
    !files.has("local-profile.json")
  )
    fail("INCOMPLETE_LOCAL_OUTPUT");
  validateLocalOutputFiles(files, manifest, run);
  if (!["gold", "discovery"].includes(manifest.corpusSelection))
    fail("INVALID_CORPUS_SELECTION");
  const sealBytes = await readOwnedFile(
    root,
    `review/${manifest.corpusSelection}-seal.json`,
    4096,
  );
  if (digest(sealBytes) !== manifest.corpusSealDigest)
    fail("OUTPUT_REVIEW_SEAL_MISMATCH");
  const replay = await replayReviewedCorpus(root, {
    name: manifest.corpusSelection,
  });
  if (manifest.searchProjection) {
    const projection = verifySearchProjection(
      replay.corpus,
      JSON.parse(files.get("search-projection.json").toString("utf8")),
      files.get("corpus.json"),
    );
    if (projection.corpus.contentDigest !== manifest.corpusDigest)
      fail("OUTPUT_SOURCE_REPLAY_MISMATCH");
    return { manifest, files, manifestDigest: digest(manifestBytes) };
  }
  if (
    replay.corpus.contentDigest !== manifest.corpusDigest ||
    !Buffer.from(serializeAnalyzedCorpusV2(replay.corpus)).equals(
      files.get("corpus.json"),
    )
  )
    fail("OUTPUT_SOURCE_REPLAY_MISMATCH");
  return { manifest, files, manifestDigest: digest(manifestBytes) };
}
