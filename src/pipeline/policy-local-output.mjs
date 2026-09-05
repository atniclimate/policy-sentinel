import { createServer } from "node:http";
import { lstat, open, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { Buffer } from "node:buffer";
import {
  digest,
  openPolicyRun,
  verifyPolicyRun,
  writePolicyDerived,
} from "./policy-custody.mjs";
import { extractPolicyText } from "./policy-text.mjs";
import { createPolicyCorpus } from "./policy-corpus-builder.mjs";
import {
  parseAnalyzedCorpusV2,
  canonicalV2Digest,
  serializeAnalyzedCorpusV2,
} from "./analyzed-corpus-v2.mjs";

const fail = (code) => {
  throw new Error(code);
};
const safeFile = (value) =>
  typeof value === "string" &&
  /^[a-zA-Z0-9_./-]+$/.test(value) &&
  value
    .split("/")
    .every(
      (part) =>
        part &&
        part !== "." &&
        part !== ".." &&
        !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
    );
async function readOwnedFile(root, relativePath, limit = 128 * 1024 ** 2) {
  if (!safeFile(relativePath)) fail("INVALID_OWNED_FILE_PATH");
  const base = await realpath(root);
  const path = join(base, relativePath);
  let cursor = base;
  for (const part of relativePath.split("/")) {
    cursor = join(cursor, part);
    const info = await lstat(cursor);
    if (
      info.isSymbolicLink() ||
      (!info.isDirectory() && !info.isFile()) ||
      (info.isFile() && info.nlink !== 1)
    )
      fail("LINKED_OUTPUT_REJECTED");
  }
  const resolved = await realpath(path);
  const rel = relative(base, resolved);
  if (
    isAbsolute(rel) ||
    rel === ".." ||
    rel.startsWith(`..${sep}`) ||
    resolve(resolved).toLowerCase() !== resolve(path).toLowerCase()
  )
    fail("OUTPUT_PATH_ESCAPE");
  const before = await lstat(path);
  const handle = await open(path, "r");
  try {
    const stat = await handle.stat();
    if (
      !stat.isFile() ||
      stat.nlink !== 1 ||
      stat.size > limit ||
      stat.ino !== before.ino ||
      stat.dev !== before.dev
    )
      fail("UNSAFE_OR_OVERSIZED_OUTPUT_FILE");
    const bytes = await handle.readFile();
    if (bytes.length !== stat.size) fail("OUTPUT_FILE_CHANGED_DURING_READ");
    return bytes;
  } finally {
    await handle.close();
  }
}
function assertProfileBindings(corpusOrInput, run) {
  for (const profile of corpusOrInput.sourceProfiles) {
    const admitted = run.manifest.profiles.find(
      (source) => source.id === profile.id,
    );
    const selected = Object.fromEntries(
      ["id", "hosts", "pathPrefixes", "review", "uses"].map((key) => [
        key,
        profile[key],
      ]),
    );
    if (
      !admitted ||
      canonicalV2Digest(selected) !== canonicalV2Digest(admitted)
    )
      fail("SOURCE_POLICY_ADMISSION_MISMATCH");
  }
}
function assertCaptureBindings(corpus, run) {
  for (const capture of corpus.captures) {
    const receipt = run.ledger.operations[capture.operationId];
    if (
      !receipt ||
      receipt.state !== "complete" ||
      receipt.profileId !== capture.sourceProfileId ||
      receipt.objectDigest !== capture.objectDigest ||
      receipt.url !== capture.requestedUrl ||
      receipt.finalUrl !== capture.finalUrl ||
      receipt.completedAt !== capture.retrievedAt ||
      receipt.mediaType !== capture.mediaType ||
      receipt.decodedBytes !== capture.decodedBytes ||
      receipt.encodedBytes !== capture.encodedBytes
    )
      fail("OUTPUT_CAPTURE_ADMISSION_MISMATCH");
  }
}
export async function replayReviewedCorpus(root, { name = "gold" } = {}) {
  if (!["gold", "discovery"].includes(name)) fail("INVALID_CORPUS_SELECTION");
  const custody = await verifyPolicyRun(root);
  const run = await openPolicyRun(root);
  const inputBytes = await readFile(join(root, `review/${name}-input.json`));
  const corpusBytes = await readFile(join(root, `work/${name}-corpus.json`));
  const seal = JSON.parse(
    await readFile(join(root, `review/${name}-seal.json`), "utf8"),
  );
  if (
    seal.inputDigest !== digest(inputBytes) ||
    seal.outputDigest !== digest(corpusBytes)
  )
    fail("REVIEW_SEAL_MISMATCH");
  const portable = JSON.parse(inputBytes.toString("utf8"));
  assertProfileBindings(portable, run);
  if (
    portable.runId !== run.owner.runId ||
    portable.trustDomain !== run.owner.trustDomain
  )
    fail("RUN_IDENTITY_MISMATCH");
  const objects = new Map();
  const items = [];
  for (const item of portable.items) {
    const captures = [];
    for (const recipe of item.captures) {
      const receipt = run.ledger.operations[recipe.operationId];
      if (
        !receipt ||
        receipt.state !== "complete" ||
        receipt.objectDigest !== recipe.objectDigest
      )
        fail("CAPTURE_REPLAY_MISMATCH");
      let sourceBytes = objects.get(receipt.objectDigest);
      if (!sourceBytes) {
        sourceBytes = await readFile(join(root, receipt.objectPath));
        if (digest(sourceBytes) !== receipt.objectDigest)
          fail("OBJECT_DIGEST_MISMATCH");
        objects.set(receipt.objectDigest, sourceBytes);
      }
      const parsed = extractPolicyText({
        bytes: sourceBytes,
        mediaType: receipt.mediaType,
        sourceKind: recipe.sourceKind,
        url: receipt.url,
        expectedIdentity: receipt.expectedIdentity,
        excludedBlockLocators: recipe.excludedBlockLocators,
      });
      const renditionDigest = digest(Buffer.from(parsed.text));
      if (
        renditionDigest !== recipe.renditionDigest ||
        JSON.stringify(parsed.parser) !== JSON.stringify(recipe.parser)
      )
        fail("PARSER_REPLAY_MISMATCH");
      captures.push({
        receipt,
        sourceBytes,
        extraction: {
          version: "1.0.0",
          state: "extracted_pending_review",
          captureOperationId: receipt.operationId,
          objectDigest: receipt.objectDigest,
          renditionDigest,
          sourceKind: recipe.sourceKind,
          ...parsed,
        },
      });
    }
    items.push({ ...item, captures });
  }
  const corpus = createPolicyCorpus({ ...portable, items });
  const expected = parseAnalyzedCorpusV2(
    JSON.parse(corpusBytes.toString("utf8")),
  );
  if (
    corpus.contentDigest !== seal.corpusDigest ||
    corpus.contentDigest !== expected.contentDigest ||
    serializeAnalyzedCorpusV2(corpus) !== corpusBytes.toString("utf8")
  )
    fail("CORPUS_REPLAY_MISMATCH");
  return {
    corpus,
    custody,
    seal,
    input: portable,
    reviewedInput: { ...portable, items },
  };
}

export function localCorpusBytes(corpus) {
  const valid = parseAnalyzedCorpusV2(corpus);
  if (valid.trustDomain !== "real_source_local")
    fail("REAL_LOCAL_CORPUS_REQUIRED");
  // This full-text projection is deliberately narrower than the general schema.
  // A source with restricted display/export requires a separately tested projection.
  if (
    valid.sourceProfiles.some(
      (source) =>
        source.uses.localDisplay !== "full_text" ||
        source.uses.localExport !== "full_text" ||
        !source.uses.excerpts ||
        source.uses.publicRedistribution !== "prohibited",
    )
  )
    fail("FULL_LOCAL_DISPLAY_EXPORT_POLICY_REQUIRED");
  return Buffer.from(serializeAnalyzedCorpusV2(valid));
}

export async function writeLocalOutput(
  root,
  corpus,
  assets,
  { name = "gold" } = {},
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
  const corpusBytes = localCorpusBytes(corpus);
  const sealBytes = await readOwnedFile(root, `review/${name}-seal.json`, 4096);
  const seal = JSON.parse(sealBytes.toString("utf8"));
  if (
    seal.corpusDigest !== corpus.contentDigest ||
    seal.outputDigest !== digest(corpusBytes)
  )
    fail("OUTPUT_REVIEW_SEAL_MISMATCH");
  const files = new Map(assets);
  if (
    files.has("corpus.json") ||
    files.has("local-profile.json") ||
    !files.has("index.html")
  )
    fail("OUTPUT_ASSET_CONFLICT");
  files.set("corpus.json", corpusBytes);
  files.set(
    "local-profile.json",
    Buffer.from(
      `${JSON.stringify({ kind: "policy_local_profile", schemaVersion: "1.0.0", trustDomain: "real_source_local", corpusDigest: corpus.contentDigest, corpusFile: "corpus.json", corpusFileDigest: digest(corpusBytes), corpusBytes: corpusBytes.length, publication: "closed" }, null, 2)}\n`,
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
      !/^[a-f0-9]{64}$/.test(entry.digest)
    )
      fail("INVALID_OUTPUT_FILE_SIZE_OR_DIGEST");
    totalBytes += entry.bytes;
    if (totalBytes > 512 * 1024 ** 2) fail("OUTPUT_MEMORY_BOUND");
    const bytes = await readOwnedFile(root, `${base}/${entry.path}`);
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
  if (
    replay.corpus.contentDigest !== manifest.corpusDigest ||
    !Buffer.from(serializeAnalyzedCorpusV2(replay.corpus)).equals(
      files.get("corpus.json"),
    )
  )
    fail("OUTPUT_SOURCE_REPLAY_MISMATCH");
  return { manifest, files };
}

export function validateLocalOutputFiles(files, manifest, run) {
  const corpus = parseAnalyzedCorpusV2(
    JSON.parse(files.get("corpus.json").toString("utf8")),
  );
  const bytes = localCorpusBytes(corpus);
  assertProfileBindings(corpus, run);
  assertCaptureBindings(corpus, run);
  if (
    corpus.runId !== run.owner.runId ||
    corpus.contentDigest !== manifest.corpusDigest ||
    !bytes.equals(files.get("corpus.json"))
  )
    fail("OUTPUT_CORPUS_BINDING_MISMATCH");
  const profile = JSON.parse(files.get("local-profile.json").toString("utf8"));
  const expectedProfile = {
    kind: "policy_local_profile",
    schemaVersion: "1.0.0",
    trustDomain: "real_source_local",
    corpusDigest: corpus.contentDigest,
    corpusFile: "corpus.json",
    corpusFileDigest: digest(bytes),
    corpusBytes: bytes.length,
    publication: "closed",
  };
  if (JSON.stringify(profile) !== JSON.stringify(expectedProfile))
    fail("OUTPUT_PROFILE_BINDING_MISMATCH");
  return { corpusDigest: corpus.contentDigest, valid: true };
}

const contentType = (path) =>
  ({
    html: "text/html; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json; charset=utf-8",
    svg: "image/svg+xml",
    txt: "text/plain; charset=utf-8",
    md: "text/plain; charset=utf-8",
  })[path.split(".").at(-1)] ?? "application/octet-stream";
export function createLoopbackOutputServer(files, port = 4179) {
  if (
    !(files instanceof Map) ||
    !Number.isInteger(port) ||
    port < 0 ||
    port > 65535
  )
    fail("INVALID_SERVE_CONFIGURATION");
  const server = createServer((request, response) => {
    const expectedHost = `127.0.0.1:${server.address().port}`;
    const ownOrigin = `http://${expectedHost}`;
    // No DNS-rebinding host, cross-origin embedding, proxying, logs, or directory fallback.
    if (
      request.headers.host !== expectedHost ||
      (request.headers.origin && request.headers.origin !== ownOrigin) ||
      request.headers["sec-fetch-site"] === "cross-site" ||
      !["GET", "HEAD"].includes(request.method)
    ) {
      response.writeHead(403);
      response.end();
      return;
    }
    const url = request.url;
    const name = url === "/" ? "index.html" : url.slice(1);
    if (!url.startsWith("/") || !safeFile(name) || !files.has(name)) {
      response.writeHead(404);
      response.end();
      return;
    }
    const bytes = files.get(name);
    response.writeHead(200, {
      "content-type": contentType(name),
      "content-length": bytes.length,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "cross-origin-resource-policy": "same-origin",
      "content-security-policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    });
    response.end(request.method === "HEAD" ? undefined : bytes);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
