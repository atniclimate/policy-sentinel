import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";
import {
  searchCases,
  searchFixture,
  summarize,
  verifySearch,
} from "./measure-engineering.mjs";
import {
  SEARCH_MEASUREMENT_PROTOCOL,
  assertMeasurementFileName,
  assertPayloadBytes,
  chargeGenerated,
  checkOwnedAncestors,
  payloadSha256,
  superviseMeasurementChild,
  verifyResultCap,
} from "./measure-bounded-search.mjs";
import * as corpusApi from "../src/pipeline/analyzed-corpus-v2.mjs";
import * as search from "../src/engine/policy-search.mjs";
import {
  createSearchProjection,
  serializeSearchProjectionManifest,
  verifySearchProjection,
} from "../src/modules/output/local-workbench/search-projection.mjs";

// Only pure fixtures, guards and the finite owned-child supervisor are reused.
// Neither historical runner entry point nor its spent output directory is used.
export const PROJECTION_MEASUREMENT_PROTOCOL = Object.freeze({
  ...SEARCH_MEASUREMENT_PROTOCOL,
  id: "gd35-search-projection-synthetic-v1",
  projectionRule: "whole-work-evidence-closure/1",
  replacementGeneratedAt: "2026-09-04T00:00:00Z",
});
export const PROJECTION_MEASUREMENT_OUTPUT =
  "C:/dev/_scratch/policy-sentinel/study-engine-20261008/search-projection-04";
const protocol = PROJECTION_MEASUREMENT_PROTOCOL;
const repository = path.resolve(import.meta.dirname, "..");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const fail = (code) => {
  throw Object.assign(new Error(code), { code });
};
const ensure = (condition, code) => {
  if (!condition) fail(code);
};
const unseal = ({ contentDigest, ...value }) => {
  void contentDigest;
  return value;
};
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
const selection = { sourceProfileIds: ["synthetic-profile"] };
const capRequest = { query: "", limit: 1000, passageLimit: 4 };

export function exactProjectionOutputPath(value) {
  ensure(process.platform === "win32", "FIXED_WINDOWS_HOST_REQUIRED");
  ensure(
    typeof value === "string" &&
      path.isAbsolute(value) &&
      path.resolve(value).toLowerCase() ===
        path.resolve(PROJECTION_MEASUREMENT_OUTPUT).toLowerCase(),
    "FIXED_PROJECTION_OUTPUT_PATH_REQUIRED",
  );
  return path.resolve(PROJECTION_MEASUREMENT_OUTPUT);
}

export function createProjectionMeasurementWriter(
  directory,
  initial = { files: 0, bytes: 0 },
  writeFile = fs.writeFile,
) {
  ensure(
    Number.isSafeInteger(initial.files) &&
      initial.files >= 0 &&
      initial.files <= protocol.caseGeneratedFiles &&
      Number.isSafeInteger(initial.bytes) &&
      initial.bytes >= 0 &&
      initial.bytes <= protocol.caseGeneratedBytes,
    "INVALID_GENERATED_ACCOUNTING",
  );
  const generated = { ...initial };
  return {
    generated,
    async write(name, value) {
      assertMeasurementFileName(name);
      const bytes = Buffer.isBuffer(value)
        ? value
        : Buffer.from(typeof value === "string" ? value : json(value));
      chargeGenerated(generated, bytes.length);
      await writeFile(path.join(directory, name), bytes, { flag: "wx" });
      return { path: name, bytes: bytes.length, sha256: payloadSha256(bytes) };
    },
  };
}

function memory() {
  const used = process.memoryUsage();
  return {
    rssBytes: used.rss,
    heapUsedBytes: used.heapUsed,
    heapTotalBytes: used.heapTotal,
    externalBytes: used.external,
    arrayBuffersBytes: used.arrayBuffers,
    processHighWaterRssBytes: process.resourceUsage().maxRSS * 1024,
  };
}
function inputFromCorpus(corpus, generatedAt = corpus.generatedAt) {
  return {
    id: corpus.id,
    runId: corpus.runId,
    trustDomain: corpus.trustDomain,
    generatedAt,
    ...Object.fromEntries(
      catalogs.map((key) => [key, corpus[key].map(unseal)]),
    ),
  };
}

export function summarizeProjectionObservations(observations, cases) {
  const measured = observations.filter((row) => !row.warmup);
  ensure(
    observations.length === protocol.warmups + protocol.repetitions &&
      measured.length === protocol.repetitions &&
      observations.every(
        (row, i) => row.repetition === i && row.warmup === i < protocol.warmups,
      ) &&
      cases.length === protocol.queryCases &&
      measured.every(
        (row) =>
          row.queries.length === cases.length &&
          row.queries.every((query, i) => query.id === cases[i].id),
      ),
    "INCOMPLETE_MEASUREMENT_OBSERVATIONS",
  );
  return {
    ...Object.fromEntries(
      [
        "projectionMs",
        "serializationMs",
        "replayMs",
        "indexMs",
        "resultCapQueryMs",
      ].map((key) => [key, summarize(measured.map((row) => row[key]))]),
    ),
    queries: cases.map((spec) => ({
      id: spec.id,
      ...Object.fromEntries(
        ["coldIndexMs", "coldMs", "warmMs"].map((key) => [
          key,
          summarize(
            measured.map(
              (row) => row.queries.find((query) => query.id === spec.id)[key],
            ),
          ),
        ]),
      ),
    })),
  };
}

export async function readOwnedMeasurementFile(directory, entry) {
  assertMeasurementFileName(entry.path);
  assertPayloadBytes(entry.bytes);
  ensure(/^[a-f0-9]{64}$/u.test(entry.sha256), "INVALID_FILE_PIN");
  const file = path.join(directory, entry.path);
  const before = await fs.lstat(file);
  ensure(
    before.isFile() &&
      !before.isSymbolicLink() &&
      before.nlink === 1 &&
      before.size === entry.bytes,
    "PINNED_FILE_METADATA_MISMATCH",
  );
  ensure(
    (await fs.realpath(file)).toLowerCase() === file.toLowerCase(),
    "PATH_ALIAS_REFUSED",
  );
  const handle = await fs.open(file, "r");
  let bytes;
  try {
    const opened = await handle.stat();
    ensure(
      opened.isFile() &&
        opened.nlink === 1 &&
        opened.ino === before.ino &&
        opened.size === entry.bytes,
      "PINNED_FILE_METADATA_MISMATCH",
    );
    bytes = await handle.readFile();
    const after = await handle.stat();
    ensure(
      after.size === opened.size &&
        after.mtimeMs === opened.mtimeMs &&
        after.ino === opened.ino,
      "PINNED_FILE_CHANGED",
    );
  } finally {
    await handle.close();
  }
  const final = await fs.lstat(file);
  ensure(
    final.isFile() &&
      !final.isSymbolicLink() &&
      final.ino === before.ino &&
      final.size === before.size &&
      final.mtimeMs === before.mtimeMs,
    "PINNED_FILE_CHANGED",
  );
  ensure(
    bytes.length === entry.bytes && payloadSha256(bytes) === entry.sha256,
    "PINNED_FILE_DIGEST_MISMATCH",
  );
  return bytes;
}

function oracleFor(index, fixture, cases, check) {
  return Object.fromEntries(
    cases.map((spec) => {
      check();
      return [
        spec.id,
        verifySearch(
          search.searchPolicyCorpus(index, spec.request),
          index,
          spec,
          fixture,
          search.policySearchPassage,
        ),
      ];
    }),
  );
}

export function verifyProjectionCitations(corpus, fixture) {
  const renditions = new Map(corpus.renditions.map((row) => [row.id, row]));
  const captures = new Map(corpus.captures.map((row) => [row.id, row]));
  let multibyteSegments = 0;
  for (const segment of corpus.segments) {
    const expected = fixture.exactSegments.get(segment.id);
    assert.ok(expected, "Projection has an unauthored segment");
    const rendition = renditions.get(segment.renditionId);
    const bytes = Buffer.from(rendition.text);
    assert.equal(segment.renditionId, expected.renditionId);
    assert.equal(rendition.versionId, expected.versionId);
    assert.equal(rendition.captureId, expected.captureId);
    assert.equal(payloadSha256(bytes), rendition.outputDigest);
    assert.equal(
      payloadSha256(bytes),
      captures.get(rendition.captureId).objectDigest,
    );
    const exact = bytes.subarray(segment.startByte, segment.endByte);
    assert.equal(exact.toString("utf8"), expected.text);
    assert.equal(payloadSha256(exact), segment.textDigest);
    if (expected.text.includes("café")) multibyteSegments += 1;
  }
  assert.equal(multibyteSegments, corpus.works.length);
  // Also run the production citation replay contract over one multibyte passage.
  const segment = corpus.segments.find((row) =>
    fixture.exactSegments.get(row.id).text.includes("café"),
  );
  const rendition = renditions.get(segment.renditionId);
  const replay = corpusApi.replayCorpusCitation({
    corpus,
    segmentId: segment.id,
    objectBytes: Buffer.from(rendition.text),
    renditionBytes: Buffer.from(rendition.text),
  });
  assert.equal(replay.quote, fixture.exactSegments.get(segment.id).text);
  return {
    segments: corpus.segments.length,
    multibyteSegments,
    citation: replay,
  };
}

export function verifyProjectionHealth(parent) {
  const initial = inputFromCorpus(parent);
  initial.generatedAt = protocol.replacementGeneratedAt;
  Object.assign(initial.coverage[0], {
    status: "degraded",
    failureStage: "authored_transport_failure",
    lastKnownGoodDigest: parent.contentDigest,
  });
  const replayOptions = { lastKnownGoodCorpora: [parent] };
  const degraded = corpusApi.createAnalyzedCorpusV2(initial, replayOptions);
  assert.throws(
    () => createSearchProjection(degraded, selection),
    /VERIFIED_PRIOR_CORPUS_REQUIRED/u,
  );
  const retained = createSearchProjection(degraded, selection, replayOptions);
  verifySearchProjection(
    degraded,
    retained.manifest,
    retained.bytes,
    replayOptions,
  );
  assert.equal(
    retained.corpus.coverage[0].dataAsOf,
    parent.coverage[0].dataAsOf,
  );
  assert.equal(
    retained.corpus.coverage[0].lastSuccessfulAt,
    parent.coverage[0].lastSuccessfulAt,
  );
  assert.equal(
    retained.corpus.coverage[0].lastKnownGoodDigest,
    parent.contentDigest,
  );
  const unavailableInput = inputFromCorpus(parent);
  for (const key of catalogs.filter(
    (key) => !["sourceProfiles", "coverage"].includes(key),
  ))
    unavailableInput[key] = [];
  Object.assign(unavailableInput.coverage[0], {
    status: "unavailable",
    documentCount: 0,
    versionCount: 0,
    dataAsOf: null,
    lastSuccessfulAt: null,
    failureStage: "authored_transport_failure",
    lastKnownGoodDigest: null,
    from: { value: null, precision: "unknown" },
    through: { value: null, precision: "unknown" },
  });
  const unavailable = createSearchProjection(
    corpusApi.createAnalyzedCorpusV2(unavailableInput),
    selection,
  );
  assert.equal(unavailable.corpus.works.length, 0);
  assert.equal(unavailable.manifest.coverage[0].searched, false);
  assert.equal(unavailable.manifest.coverage[0].status, "unavailable");
  const healthy = createSearchProjection(parent, selection);
  const unsearchedInput = inputFromCorpus(parent);
  unsearchedInput.sourceProfiles.push({
    ...unsearchedInput.sourceProfiles[0],
    id: "synthetic-unsearched-profile",
    sourceId: "synthetic-unsearched-source",
    interfaceId: "synthetic-unsearched-interface",
  });
  unsearchedInput.coverage.push({
    ...unavailableInput.coverage[0],
    id: "synthetic-unsearched-coverage",
    sourceProfileId: "synthetic-unsearched-profile",
  });
  const withUnsearched = createSearchProjection(
    corpusApi.createAnalyzedCorpusV2(unsearchedInput),
    selection,
  );
  const unsearched = withUnsearched.manifest.coverage.find(
    (row) => row.sourceProfileId === "synthetic-unsearched-profile",
  );
  assert.equal(unsearched.selected, false);
  assert.equal(unsearched.searched, false);
  assert.equal(unsearched.retained, false);
  const noMatch = search.searchPolicyCorpus(
    search.createPolicySearchIndex(healthy.corpus),
    { query: "zzzznomatchzzzz" },
  );
  assert.equal(noMatch.total, 0);
  assert.equal(healthy.manifest.coverage[0].searched, true);
  assert.equal(healthy.manifest.coverage[0].status, "healthy");
  assert.throws(
    () => createSearchProjection(parent, { ...selection, from: "2030-01-01" }),
    /EMPTY_SELECTED_POPULATION/u,
  );
  assert.throws(
    () =>
      createSearchProjection(parent, {
        ...selection,
        maxBytes: healthy.bytes.length - 1,
      }),
    /PROJECTION_BYTE_CEILING/u,
  );
  return {
    healthyNoMatch: {
      total: noMatch.total,
      coverage: healthy.manifest.coverage,
    },
    degraded: retained.manifest.coverage,
    unavailable: unavailable.manifest.coverage,
    unsearched,
    boundedFailure: [
      "empty healthy selection refused",
      "byte ceiling refused",
      "unverified last-known-good refused",
    ],
  };
}

async function measureCase(size, directory, check) {
  const started = performance.now();
  const write = createProjectionMeasurementWriter(directory);
  const fixture = await searchFixture(size);
  const parent = corpusApi.createAnalyzedCorpusV2(fixture.input);
  check();
  const parentBytes = Buffer.from(corpusApi.serializeAnalyzedCorpusV2(parent));
  assertPayloadBytes(parentBytes.length);
  const projected = createSearchProjection(parent, selection);
  assert.equal(projected.manifest.ruleVersion, protocol.projectionRule);
  assert.deepEqual(projected.corpus.works, parent.works);
  assert.deepEqual(projected.corpus.segments, parent.segments);
  const cases = searchCases();
  ensure(cases.length === protocol.queryCases, "FIXED_QUERY_CASES_REQUIRED");
  const index = search.createPolicySearchIndex(projected.corpus);
  const oracle = oracleFor(index, fixture, cases, check);
  const capDigest = verifyResultCap(
    search.searchPolicyCorpus(index, capRequest),
    index,
    fixture,
    search.policySearchPassage,
  );
  const citations = verifyProjectionCitations(projected.corpus, fixture);
  const partial = createSearchProjection(parent, {
    ...selection,
    through: "2026-06-01",
  });
  // Authored unknown item1 and future item2 are excluded. The year-only item3
  // overlaps the selection and remains qualified as partial source dating.
  assert.deepEqual(partial.manifest.excludedVersionIds, [
    "version-0001",
    "version-0002",
  ]);
  assert.equal(partial.corpus.works.length, size - 2);
  const parentFile = await write.write("parent.json", parentBytes);
  const oldManifestFile = await write.write(
    "old-projection-manifest.json",
    serializeSearchProjectionManifest(projected.manifest),
  );
  const pin = {
    protocol: protocol.id,
    size,
    parentFile,
    parentCorpusDigest: parent.contentDigest,
    projectedFileSha256: payloadSha256(projected.bytes),
    projectedBytes: projected.bytes.length,
    projectionContentDigest: projected.corpus.contentDigest,
    projectionManifest: oldManifestFile,
    queryCases: cases,
    queryResultSha256: oracle,
    resultCapSha256: capDigest,
    works: size,
    versions: size,
    segments: size * 4,
    maxSegmentBytes: Math.max(
      ...[...fixture.exactSegments.values()].map((row) =>
        Buffer.byteLength(row.text),
      ),
    ),
    citations,
    partialSelection: {
      selection: partial.manifest.selection,
      excludedVersionIds: partial.manifest.excludedVersionIds,
      retainedWorks: partial.corpus.works.length,
    },
    oracleRule:
      "Authored independent identity/order/date/population and exact UTF-8 citations asserted before result digest pinning.",
  };
  const pinFile = await write.write("oracle-before-timing.json", pin);
  if (size === protocol.sizes[0]) {
    check();
    await write.write("source-health.json", verifyProjectionHealth(parent));
  }
  const setupMs = performance.now() - started;
  const observations = [];
  for (
    let repetition = 0;
    repetition < protocol.warmups + protocol.repetitions;
    repetition += 1
  ) {
    check();
    let phase = performance.now();
    const projection = createSearchProjection(parent, selection);
    const projectionMs = performance.now() - phase;
    const afterProjection = memory();
    phase = performance.now();
    const serialized = Buffer.from(
      corpusApi.serializeAnalyzedCorpusV2(projection.corpus),
    );
    const serializationMs = performance.now() - phase;
    assert.equal(payloadSha256(serialized), pin.projectedFileSha256);
    phase = performance.now();
    const parsed = corpusApi.parseAnalyzedCorpusV2(
      JSON.parse(serialized.toString("utf8")),
    );
    const replay = verifySearchProjection(
      parent,
      projection.manifest,
      serialized,
    );
    const replayMs = performance.now() - phase;
    assert.equal(parsed.contentDigest, replay.corpus.contentDigest);
    const afterReplay = memory();
    phase = performance.now();
    const warmIndex = search.createPolicySearchIndex(parsed);
    const indexMs = performance.now() - phase;
    const afterIndex = memory();
    const queries = [];
    for (const spec of cases) {
      check();
      phase = performance.now();
      const coldIndex = search.createPolicySearchIndex(parsed);
      const coldIndexMs = performance.now() - phase;
      phase = performance.now();
      const cold = search.searchPolicyCorpus(coldIndex, spec.request);
      const coldMs = performance.now() - phase;
      search.searchPolicyCorpus(warmIndex, spec.request);
      phase = performance.now();
      const warm = search.searchPolicyCorpus(warmIndex, spec.request);
      const warmMs = performance.now() - phase;
      assert.equal(
        verifySearch(
          cold,
          coldIndex,
          spec,
          fixture,
          search.policySearchPassage,
        ),
        oracle[spec.id],
      );
      assert.equal(
        verifySearch(
          warm,
          warmIndex,
          spec,
          fixture,
          search.policySearchPassage,
        ),
        oracle[spec.id],
      );
      queries.push({
        id: spec.id,
        coldIndexMs,
        coldMs,
        warmMs,
        total: warm.total,
        returned: warm.hits.length,
        limit: spec.request.limit,
        truncated: warm.total > warm.hits.length,
        memory: memory(),
      });
    }
    check();
    phase = performance.now();
    const capped = search.searchPolicyCorpus(warmIndex, capRequest);
    const resultCapQueryMs = performance.now() - phase;
    assert.equal(
      verifyResultCap(capped, warmIndex, fixture, search.policySearchPassage),
      capDigest,
    );
    observations.push({
      repetition,
      warmup: repetition < protocol.warmups,
      projectionMs,
      serializationMs,
      replayMs,
      indexMs,
      resultCapQueryMs,
      afterProjection,
      afterReplay,
      afterIndex,
      queries,
    });
    await write.write(`progress-${String(repetition).padStart(2, "0")}.json`, {
      status: "incomplete",
      size,
      pinFile,
      setupMs,
      observations,
      generated: { ...write.generated },
    });
  }
  check();
  const rebuildStart = performance.now();
  const replacementParent = corpusApi.createAnalyzedCorpusV2(
    inputFromCorpus(parent, protocol.replacementGeneratedAt),
  );
  const replacement = createSearchProjection(replacementParent, selection);
  assert.notEqual(
    replacement.corpus.contentDigest,
    projected.corpus.contentDigest,
  );
  const replacementIndex = search.createPolicySearchIndex(replacement.corpus);
  const replacementOracle = oracleFor(replacementIndex, fixture, cases, check);
  const oldFile = await write.write("old-projection.json", projected.bytes);
  const stagedFile = await write.write(
    "staged-projection.json",
    replacement.bytes,
  );
  const manifestFile = await write.write(
    "replacement-projection-manifest.json",
    serializeSearchProjectionManifest(replacement.manifest),
  );
  const committedFile = await write.write(
    "committed-projection.json",
    replacement.bytes,
  );
  const coexistenceFiles = [
    parentFile,
    oldFile,
    stagedFile,
    committedFile,
    oldManifestFile,
    manifestFile,
    pinFile,
  ];
  for (const entry of coexistenceFiles) {
    check();
    await readOwnedMeasurementFile(directory, entry);
  }
  const result = {
    status: "measured_pending_restart",
    protocol,
    size,
    processId: process.pid,
    setupMs,
    pinFile,
    observations,
    summaries: summarizeProjectionObservations(observations, cases),
    rebuild: {
      milliseconds: performance.now() - rebuildStart,
      coexistenceFiles,
      logicalBytes: coexistenceFiles.reduce(
        (total, entry) => total + entry.bytes,
        0,
      ),
      memory: memory(),
      recipe: {
        parentFile,
        generatedAt: protocol.replacementGeneratedAt,
        selection,
      },
      replacementParentCorpusDigest: replacementParent.contentDigest,
      manifestFile,
      committedFile,
      queryResultSha256: replacementOracle,
      capSha256: verifyResultCap(
        search.searchPolicyCorpus(replacementIndex, capRequest),
        replacementIndex,
        fixture,
        search.policySearchPassage,
      ),
    },
    finalMemory: memory(),
    memoryMethod:
      "Phase RSS/heap/ArrayBuffer samples and process high-water maxRSS include fixture, oracle, projections and transient indexes; not isolated index allocation.",
    cacheState:
      "Cold query uses a fresh in-memory index; warm query uses a primed retained index. No disk or OS cache clearing.",
    limitations: [
      "Authored short-document fixtures only; no browser, real source, long-document or 50 GB capacity claim.",
      "Projection timing includes production validation and serialization; separate serialization/replay metrics report their own complete calls, not additive subphases.",
      "Rebuild is explicit simultaneous logical file bytes, excluding progress logs and filesystem allocation overhead; no production storage transaction is claimed.",
      "Ten recorded observations support median/range, not p99; watchdog partials never become complete measurements.",
      "Source-health proof uses the 100-work population once, outside latency timing.",
      "A separate owned fresh process must replay the committed files before case completion.",
    ],
    generatedBeforeResult: { ...write.generated },
  };
  const resultFile = await write.write("result.json", result);
  return { generated: write.generated, resultFile };
}

async function restartCase(size, directory, check, initial) {
  const started = performance.now();
  const resultEntry = JSON.parse(process.env.GD35_RESULT_PIN ?? "null");
  ensure(resultEntry?.path === "result.json", "RESTART_PIN_REQUIRED");
  const result = JSON.parse(
    (await readOwnedMeasurementFile(directory, resultEntry)).toString("utf8"),
  );
  ensure(
    result.protocol.id === protocol.id &&
      result.size === size &&
      result.status === "measured_pending_restart",
    "RESTART_RESULT_MISMATCH",
  );
  const pin = JSON.parse(
    (await readOwnedMeasurementFile(directory, result.pinFile)).toString(
      "utf8",
    ),
  );
  const parent = corpusApi.parseAnalyzedCorpusV2(
    JSON.parse(
      (
        await readOwnedMeasurementFile(
          directory,
          result.rebuild.recipe.parentFile,
        )
      ).toString("utf8"),
    ),
  );
  assert.equal(parent.contentDigest, pin.parentCorpusDigest);
  assert.equal(
    result.rebuild.recipe.generatedAt,
    protocol.replacementGeneratedAt,
  );
  assert.deepEqual(result.rebuild.recipe.selection, selection);
  const replacementParent = corpusApi.createAnalyzedCorpusV2(
    inputFromCorpus(parent, protocol.replacementGeneratedAt),
  );
  assert.equal(
    replacementParent.contentDigest,
    result.rebuild.replacementParentCorpusDigest,
  );
  const manifest = JSON.parse(
    (
      await readOwnedMeasurementFile(directory, result.rebuild.manifestFile)
    ).toString("utf8"),
  );
  const bytes = await readOwnedMeasurementFile(
    directory,
    result.rebuild.committedFile,
  );
  const replay = verifySearchProjection(replacementParent, manifest, bytes);
  const fixture = await searchFixture(size);
  const index = search.createPolicySearchIndex(replay.corpus);
  assert.deepEqual(
    oracleFor(index, fixture, searchCases(), check),
    result.rebuild.queryResultSha256,
  );
  assert.equal(
    verifyResultCap(
      search.searchPolicyCorpus(index, capRequest),
      index,
      fixture,
      search.policySearchPassage,
    ),
    result.rebuild.capSha256,
  );
  const citations = verifyProjectionCitations(replay.corpus, fixture);
  for (const entry of result.rebuild.coexistenceFiles) {
    check();
    await readOwnedMeasurementFile(directory, entry);
  }
  const write = createProjectionMeasurementWriter(directory, initial);
  await write.write("restart.json", {
    protocol: protocol.id,
    status: "complete",
    processId: process.pid,
    wallMs: performance.now() - started,
    corpusDigest: replay.corpus.contentDigest,
    manifestDigest: manifest.contentDigest,
    citations,
    memory: memory(),
    scope:
      "Separate fresh owned Node process; reads checksum-pinned committed output and parent, reconstructs index, replays all 16 oracles and exact UTF-8 citations without acquisition.",
  });
  return { generated: write.generated };
}

const implementationPaths = [
  "scripts/measure-search-projection.mjs",
  "scripts/measure-bounded-search.mjs",
  "scripts/measure-engineering.mjs",
  "src/pipeline/analyzed-corpus-v2.mjs",
  "src/core/jurisdiction-reference.mjs",
  "src/engine/policy-search.mjs",
  "src/engine/temporal-operations.mjs",
  "src/modules/output/local-workbench/search-projection.mjs",
];
async function implementationPins() {
  return Promise.all(
    implementationPaths.map(async (file) => ({
      path: file,
      sha256: payloadSha256(await fs.readFile(path.join(repository, file))),
    })),
  );
}
function child(directory, size, token, mode, env = {}) {
  return fork(import.meta.filename, [mode, String(size), directory, token], {
    execPath: process.execPath,
    execArgv: [],
    cwd: repository,
    windowsHide: true,
    env: {
      SystemRoot: process.env.SystemRoot ?? "C:/Windows",
      GD35_MEASUREMENT_TOKEN: token,
      ...env,
    },
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
}
async function caseChild() {
  const [, , mode, rawSize, directory, token] = process.argv;
  const size = Number(rawSize);
  const root = exactProjectionOutputPath(PROJECTION_MEASUREMENT_OUTPUT);
  ensure(
    process.argv.length === 6 &&
      ["--case", "--restart"].includes(mode) &&
      protocol.sizes.includes(size) &&
      directory === path.join(root, `size-${size}`) &&
      typeof token === "string" &&
      /^[a-f0-9-]{36}$/u.test(token) &&
      token === process.env.GD35_MEASUREMENT_TOKEN &&
      process.connected,
    "OWNED_CHILD_REQUIRED",
  );
  await checkOwnedAncestors(directory);
  const deadline =
    performance.now() + protocol.caseMilliseconds - protocol.reapMilliseconds;
  const check = () => ensure(performance.now() < deadline, "CASE_TIME_LIMIT");
  try {
    const initial = {
      files: Number(process.env.GD35_GENERATED_FILES),
      bytes: Number(process.env.GD35_GENERATED_BYTES),
    };
    const measured =
      mode === "--case"
        ? await measureCase(size, directory, check)
        : await restartCase(size, directory, check, initial);
    process.send({
      status: "complete",
      token,
      generated: measured.generated,
      resultFile: measured.resultFile ?? null,
      finalMemory: memory(),
    });
  } catch (error) {
    process.send({
      status: "incomplete",
      token,
      failure: String(error.code ?? error.name ?? "MEASUREMENT_FAILED"),
    });
    process.exitCode = 1;
  } finally {
    process.disconnect();
  }
}

async function main() {
  ensure(
    process.argv.length === 4 && process.argv[2] === "--out",
    "EXPLICIT_OUTPUT_REQUIRED",
  );
  const directory = exactProjectionOutputPath(process.argv[3]);
  await checkOwnedAncestors(path.dirname(directory));
  await fs.mkdir(directory);
  await checkOwnedAncestors(directory);
  const started = performance.now();
  const write = createProjectionMeasurementWriter(directory);
  const pins = await implementationPins();
  await write.write("implementation-pins.json", pins);
  const report = {
    protocol,
    status: "incomplete",
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    startedAt: new Date().toISOString(),
    cases: [],
    browser: "not measured",
    generatedBudget:
      "Three case directories plus parent: at most 256 MiB and 256 attempted files, including restart receipts. Existing evidence is never overwritten or deleted.",
    timingScope:
      "120s per complete measurement and fresh-process replay case with a 5s reaping reserve; 600s parent total. Filesystem/report writes are awaited and not claimed bounded if they never settle.",
  };
  await write.write("protocol.json", report);
  for (const size of protocol.sizes) {
    let remaining = protocol.totalMilliseconds - (performance.now() - started);
    if (remaining <= protocol.reapMilliseconds) {
      report.stopReason = "TOTAL_TIME_LIMIT";
      break;
    }
    assert.deepEqual(await implementationPins(), pins);
    remaining = protocol.totalMilliseconds - (performance.now() - started);
    if (remaining <= protocol.reapMilliseconds) {
      report.stopReason = "TOTAL_TIME_LIMIT";
      break;
    }
    const caseStarted = performance.now();
    const caseBudget = Math.min(protocol.caseMilliseconds, remaining);
    const owned = path.join(directory, `size-${size}`);
    await fs.mkdir(owned);
    await checkOwnedAncestors(owned);
    const measurementBudget = Math.min(
      caseBudget - (performance.now() - caseStarted),
      protocol.totalMilliseconds - (performance.now() - started),
    );
    if (measurementBudget <= protocol.reapMilliseconds) {
      report.stopReason = "CASE_SETUP_TIME_LIMIT";
      break;
    }
    const token = randomUUID();
    const measuring = child(owned, size, token, "--case");
    let resultFile = null;
    let measurementMemory = null;
    measuring.on("message", (message) => {
      if (message?.token === token && message.status === "complete") {
        resultFile = message.resultFile;
        measurementMemory = message.finalMemory;
      }
    });
    const measured = await superviseMeasurementChild(
      measuring,
      token,
      measurementBudget,
    );
    let restarted = null;
    let restartMemory = null;
    let restartProcessId = null;
    const restartBudget = Math.min(
      caseBudget - (performance.now() - caseStarted),
      protocol.totalMilliseconds - (performance.now() - started),
    );
    if (
      measured.status === "complete" &&
      measured.reaped &&
      restartBudget > protocol.reapMilliseconds &&
      resultFile?.path === "result.json"
    ) {
      const restartToken = randomUUID();
      const replaying = child(owned, size, restartToken, "--restart", {
        GD35_GENERATED_FILES: String(measured.generated.files),
        GD35_GENERATED_BYTES: String(measured.generated.bytes),
        GD35_RESULT_PIN: JSON.stringify(resultFile),
      });
      restartProcessId = replaying.pid ?? null;
      replaying.on("message", (message) => {
        if (message?.token === restartToken && message.status === "complete")
          restartMemory = message.finalMemory;
      });
      restarted = await superviseMeasurementChild(
        replaying,
        restartToken,
        restartBudget,
      );
    }
    const status =
      measured.status === "complete" && restarted?.status === "complete"
        ? "complete"
        : "incomplete";
    report.cases.push({
      size,
      status,
      measured,
      restarted,
      measurementProcessId: measuring.pid ?? null,
      restartProcessId,
      measurementMemory,
      restartMemory,
      wallMs: performance.now() - caseStarted,
      failure:
        status === "complete"
          ? null
          : (measured.failure ?? restarted?.failure ?? "RESTART_NOT_COMPLETED"),
      evidence: `size-${size}/result.json`,
      restartEvidence: `size-${size}/restart.json`,
      partials: `size-${size}/progress-NN.json when oracle setup completed`,
    });
    await write.write(`checkpoint-${size}.json`, report);
    if (!measured.reaped || (restarted && !restarted.reaped)) {
      report.stopReason = "OWNED_CHILD_REAP_UNCONFIRMED";
      break;
    }
    assert.deepEqual(await implementationPins(), pins);
  }
  report.wallMs = performance.now() - started;
  report.status =
    !report.stopReason &&
    report.wallMs < protocol.totalMilliseconds &&
    report.cases.length === protocol.sizes.length &&
    report.cases.every((row) => row.status === "complete")
      ? "complete"
      : "incomplete";
  report.endedAt = new Date().toISOString();
  await write.write("report.json", report);
  process.stdout.write(
    json({
      status: report.status,
      cases: report.cases.map(({ size, status, failure }) => ({
        size,
        status,
        failure,
      })),
      report: path.join(directory, "report.json"),
    }),
  );
  process.exitCode = report.status === "complete" ? 0 : 1;
}
if (path.resolve(process.argv[1] ?? "") === import.meta.filename) {
  (["--case", "--restart"].includes(process.argv[2])
    ? caseChild()
    : main()
  ).catch(() => {
    process.stderr.write(
      "Successor projection measurement refused or incomplete.\n",
    );
    if (process.connected) process.disconnect();
    process.exitCode = 1;
  });
}
