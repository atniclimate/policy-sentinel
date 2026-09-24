import { createServer } from "node:http";
import { lstat, open, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { Buffer } from "node:buffer";
import { withPreservedCleanup } from "./policy-assurance.mjs";
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
  createAnalyzedCorpusV2,
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
  return withPreservedCleanup(
    async () => {
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
    },
    () => handle.close(),
  );
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

export function localCorpusBytes(corpus, replayOptions) {
  const valid = parseAnalyzedCorpusV2(corpus, replayOptions);
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
  return Buffer.from(serializeAnalyzedCorpusV2(valid, replayOptions));
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
  return { manifest, files, manifestDigest: digest(manifestBytes) };
}

export function validateLocalOutputFiles(files, manifest, run, replayOptions) {
  const corpus = parseAnalyzedCorpusV2(
    JSON.parse(files.get("corpus.json").toString("utf8")),
    replayOptions,
  );
  const bytes = localCorpusBytes(corpus, replayOptions);
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

function checksumOutputSnapshot(output, run) {
  if (
    !output ||
    !(output.files instanceof Map) ||
    !output.manifest ||
    !/^[a-f0-9]{64}$/.test(output.manifestDigest) ||
    digest(Buffer.from(`${JSON.stringify(output.manifest, null, 2)}\n`)) !==
      output.manifestDigest ||
    !Array.isArray(output.manifest.files) ||
    output.manifest.files.length !== output.files.size ||
    output.manifest.files.length > 1000 ||
    output.manifest.runId !== run.owner.runId ||
    output.manifest.publication !== "closed"
  )
    fail("SIMULATION_APPROVED_OUTPUT_CHECKSUM_REQUIRED");
  const seen = new Set();
  for (const entry of output.manifest.files) {
    const bytes = output.files.get(entry.path);
    if (
      !safeFile(entry.path) ||
      seen.has(entry.path) ||
      !Buffer.isBuffer(bytes) ||
      bytes.length !== entry.bytes ||
      digest(bytes) !== entry.digest
    )
      fail("SIMULATION_OUTPUT_FILE_CHECKSUM_MISMATCH");
    seen.add(entry.path);
  }
  validateLocalOutputFiles(output.files, output.manifest, run);
  return parseAnalyzedCorpusV2(
    JSON.parse(output.files.get("corpus.json").toString("utf8")),
  );
}

/**
 * Controlled failure projection only, with no acquisition, retry, filesystem write
 * or normal output-pointer change. The caller supplies a reviewed snapshot from
 * readLocalOutput; its manifest checksum, files, source policies and capture
 * receipts are checked again here. A prior snapshot must be the exact accepted
 * baseline under test. This is not a general refresh/merge or automatic fallback.
 */
export function simulateLocalSourceFailure({
  output,
  run,
  sourceProfileId,
  generatedAt,
  priorOutput = null,
}) {
  const baseline = checksumOutputSnapshot(output, run);
  const health = baseline.coverage.find(
    (entry) => entry.sourceProfileId === sourceProfileId,
  );
  if (!health || health.status !== "healthy")
    fail("SIMULATION_HEALTHY_SOURCE_REQUIRED");
  if (
    !Number.isFinite(Date.parse(generatedAt)) ||
    Date.parse(generatedAt) <= Date.parse(baseline.generatedAt)
  )
    fail("SIMULATION_LATER_TIME_REQUIRED");
  let prior = null;
  if (priorOutput !== null) {
    prior = checksumOutputSnapshot(priorOutput, run);
    if (
      prior.contentDigest !== baseline.contentDigest ||
      priorOutput.manifestDigest !== output.manifestDigest
    )
      fail("SIMULATION_EXACT_APPROVED_BASELINE_REQUIRED");
  }
  const catalogs = [
    "sourceProfiles",
    "captures",
    "works",
    "versions",
    "renditions",
    "segments",
    "events",
    "relationships",
    "analyses",
    "findings",
    "coverage",
  ];
  const input = Object.fromEntries(
    ["id", "runId", "trustDomain", ...catalogs].map((key) => [
      key,
      JSON.parse(JSON.stringify(baseline[key])),
    ]),
  );
  input.generatedAt = generatedAt;
  const selectedHealth = input.coverage.find(
    (entry) => entry.sourceProfileId === sourceProfileId,
  );
  selectedHealth.failureStage = "controlled_refresh_failure_simulation";
  selectedHealth.limitations = [
    ...new Set([
      ...selectedHealth.limitations,
      "Controlled local failure simulation; no provider failure was induced and no automatic refresh is implemented.",
    ]),
  ];
  if (prior) {
    selectedHealth.status = "degraded";
    selectedHealth.lastKnownGoodDigest = prior.contentDigest;
  } else {
    const works = new Set(
      input.works
        .filter((entry) => entry.sourceProfileId === sourceProfileId)
        .map((entry) => entry.id),
    );
    const versions = new Set(
      input.versions
        .filter((entry) => works.has(entry.workId))
        .map((entry) => entry.id),
    );
    const renditions = new Set(
      input.renditions
        .filter((entry) => versions.has(entry.versionId))
        .map((entry) => entry.id),
    );
    const segments = new Set(
      input.segments
        .filter((entry) => renditions.has(entry.renditionId))
        .map((entry) => entry.id),
    );
    input.captures = input.captures.filter(
      (entry) => entry.sourceProfileId !== sourceProfileId,
    );
    input.works = input.works.filter((entry) => !works.has(entry.id));
    input.versions = input.versions.filter((entry) => !versions.has(entry.id));
    input.renditions = input.renditions.filter(
      (entry) => !renditions.has(entry.id),
    );
    input.segments = input.segments.filter((entry) => !segments.has(entry.id));
    input.events = input.events.filter(
      (entry) => !versions.has(entry.versionId),
    );
    input.relationships = input.relationships
      .filter((entry) => !versions.has(entry.fromVersionId))
      .map((entry) => {
        if (
          versions.has(entry.target.versionId) ||
          entry.target.candidateVersionIds.some((id) => versions.has(id))
        )
          return {
            ...entry,
            target: {
              state: "unresolved",
              workId: null,
              versionId: null,
              sourceIdentifier: entry.target.sourceIdentifier,
              candidateVersionIds: [],
            },
          };
        return entry;
      });
    input.analyses = input.analyses.filter(
      (entry) => !versions.has(entry.versionId),
    );
    input.findings = input.findings.filter(
      (entry) =>
        !entry.populationVersionIds.some((id) => versions.has(id)) &&
        ![...entry.supportingSegmentIds, ...entry.contrarySegmentIds].some(
          (id) => segments.has(id),
        ),
    );
    Object.assign(selectedHealth, {
      status: "unavailable",
      documentCount: 0,
      versionCount: 0,
      dataAsOf: null,
      lastSuccessfulAt: null,
      lastKnownGoodDigest: null,
      from: { value: null, precision: "unknown" },
      through: { value: null, precision: "unknown" },
    });
  }
  const replayOptions = { lastKnownGoodCorpora: prior ? [prior] : [] };
  for (const name of catalogs)
    for (const entry of input[name]) delete entry.contentDigest;
  const corpus = createAnalyzedCorpusV2(input, replayOptions);
  const corpusBytes = localCorpusBytes(corpus, replayOptions);
  const profile = {
    kind: "policy_local_profile",
    schemaVersion: "1.0.0",
    trustDomain: "real_source_local",
    corpusDigest: corpus.contentDigest,
    corpusFile: "corpus.json",
    corpusFileDigest: digest(corpusBytes),
    corpusBytes: corpusBytes.length,
    publication: "closed",
  };
  const files = new Map([
    [
      "index.html",
      Buffer.from(
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Controlled source-failure simulation</title></head><body><main><h1>Controlled source-failure simulation</h1><p>This separate in-memory projection tests source health and retained evidence. It does not implement automatic refresh or replace the reviewed workbench output.</p><p><a href="corpus.json">Inspect simulated corpus and coverage</a></p></main></body></html>\n',
      ),
    ],
    ["corpus.json", corpusBytes],
    [
      "local-profile.json",
      Buffer.from(`${JSON.stringify(profile, null, 2)}\n`),
    ],
  ]);
  const manifest = {
    version: "1.0.0",
    kind: "controlled_source_failure_output",
    runId: corpus.runId,
    corpusDigest: corpus.contentDigest,
    baselineCorpusDigest: baseline.contentDigest,
    priorManifestDigest: prior ? priorOutput.manifestDigest : null,
    publication: "closed",
    files: [...files].map(([path, bytes]) => ({
      path,
      digest: digest(bytes),
      bytes: bytes.length,
    })),
  };
  validateLocalOutputFiles(files, manifest, run, replayOptions);
  return {
    corpus,
    files,
    manifest,
    replayOptions,
    sourceProfileId,
    status: selectedHealth.status,
    automaticRefresh: false,
    normalOutputChanged: false,
  };
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
