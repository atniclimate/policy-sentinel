import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { fork } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
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

// Importing the historical module uses only its pure fixture/oracle exports.
// Its entry point and historical filesystem namespace are never invoked.
export const SEARCH_MEASUREMENT_PROTOCOL = Object.freeze({
  id: "gd32-bounded-search-synthetic-v1",
  sizes: Object.freeze([100, 500, 2000]),
  warmups: 3,
  repetitions: 10,
  queryCases: 16,
  caseMilliseconds: 120000,
  totalMilliseconds: 600000,
  reapMilliseconds: 5000,
  payloadCeilingBytes: 128 * 1024 * 1024,
  resultCeiling: 1000,
  caseGeneratedBytes: 64 * 1024 * 1024,
  caseGeneratedFiles: 64,
});
const outputRoot =
  "C:/dev/_scratch/policy-sentinel/autonomous-2026-10-07/search-01";
const implementationRoot = path.resolve(import.meta.dirname, "..");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const failure = (code) => Object.assign(new Error(code), { code });
const ensure = (condition, code) => {
  if (!condition) throw failure(code);
};
export const payloadSha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

export function assertPayloadBytes(bytes) {
  ensure(
    Number.isSafeInteger(bytes) &&
      bytes >= 0 &&
      bytes <= SEARCH_MEASUREMENT_PROTOCOL.payloadCeilingBytes,
    "PAYLOAD_CEILING_EXCEEDED",
  );
}

export function exactOutputPath(value) {
  ensure(process.platform === "win32", "FIXED_WINDOWS_HOST_REQUIRED");
  ensure(
    typeof value === "string" &&
      path.isAbsolute(value) &&
      path.resolve(value).toLowerCase() ===
        path.resolve(outputRoot).toLowerCase(),
    "FIXED_OUTPUT_PATH_REQUIRED",
  );
  return path.resolve(outputRoot);
}

// Check only the selected path and its ancestors; never enumerate siblings.
export async function checkOwnedAncestors(target) {
  let current = path.resolve(target);
  for (;;) {
    const entry = await fs.lstat(current);
    ensure(
      entry.isDirectory() && !entry.isSymbolicLink(),
      "PLAIN_DIRECTORY_REQUIRED",
    );
    ensure(
      (await fs.realpath(current)).toLowerCase() === current.toLowerCase(),
      "PATH_ALIAS_REFUSED",
    );
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
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

export function verifyResultCap(result, index, fixture, passage) {
  assert.equal(result.kind, "policy_search_results");
  assert.equal(result.corpusDigest, index.corpusDigest);
  assert.deepEqual(result.method, {
    id: "source-passage-bm25",
    version: "2.0.0",
  });
  const expected = fixture.input.works.map((work) => work.id).sort();
  const authoredByWork = new Map();
  for (const [id, authored] of fixture.exactSegments) {
    const ids = authoredByWork.get(authored.workId) ?? [];
    ids.push(id);
    authoredByWork.set(authored.workId, ids);
  }
  assert.equal(result.total, expected.length);
  assert.equal(result.temporal, null);
  assert.deepEqual(
    result.hits.map((hit) => hit.workId),
    expected.slice(0, SEARCH_MEASUREMENT_PROTOCOL.resultCeiling),
  );
  for (const hit of result.hits) {
    assert.equal(hit.versionId, hit.workId.replace("work-", "version-"));
    assert.equal(hit.passages.length, 4);
    assert.deepEqual(
      hit.passages.map((entry) => entry.segmentId).sort(),
      [...authoredByWork.get(hit.workId)].sort(),
    );
    for (const entry of hit.passages) {
      const authored = fixture.exactSegments.get(entry.segmentId);
      assert.ok(authored);
      assert.equal(authored.workId, hit.workId);
      assert.equal(authored.versionId, hit.versionId);
      assert.equal(authored.captureId, entry.captureId);
      assert.equal(authored.renditionId, entry.renditionId);
      assert.equal(passage(index, entry.segmentId).text, authored.text);
    }
  }
  return payloadSha256(JSON.stringify(result));
}

export function assertMeasurementFileName(name) {
  ensure(
    typeof name === "string" &&
      name.endsWith(".json") &&
      /^[a-z0-9-]+\.json$/u.test(name),
    "FIXED_FILE_NAME_REQUIRED",
  );
}

export function chargeGenerated(generated, bytes) {
  ensure(
    Number.isSafeInteger(bytes) &&
      bytes >= 0 &&
      Number.isSafeInteger(generated.files) &&
      generated.files >= 0 &&
      Number.isSafeInteger(generated.bytes) &&
      generated.bytes >= 0 &&
      generated.files + 1 <= SEARCH_MEASUREMENT_PROTOCOL.caseGeneratedFiles &&
      generated.bytes + bytes <= SEARCH_MEASUREMENT_PROTOCOL.caseGeneratedBytes,
    "GENERATED_CASE_BUDGET_EXCEEDED",
  );
  generated.files += 1;
  generated.bytes += bytes;
}

function writer(directory) {
  const generated = { files: 0, bytes: 0 };
  return {
    generated,
    async write(name, value) {
      assertMeasurementFileName(name);
      const encoded = typeof value === "string" ? value : json(value);
      const bytes = Buffer.byteLength(encoded);
      // Charge attempted writes before I/O. No existing file is overwritten.
      chargeGenerated(generated, bytes);
      await fs.writeFile(path.join(directory, name), encoded, { flag: "wx" });
      return { path: name, bytes, sha256: payloadSha256(encoded) };
    },
  };
}

async function measureCase(size, directory, check) {
  const started = performance.now();
  const write = writer(directory);
  const api = await import("../src/pipeline/analyzed-corpus-v2.mjs");
  const search = await import("../src/engine/policy-search.mjs");
  const fixture = await searchFixture(size);
  check();
  const encoded = api.serializeAnalyzedCorpusV2(
    api.createAnalyzedCorpusV2(fixture.input),
  );
  assertPayloadBytes(Buffer.byteLength(encoded));
  const corpus = api.parseAnalyzedCorpusV2(JSON.parse(encoded));
  const cases = searchCases();
  ensure(
    cases.length === SEARCH_MEASUREMENT_PROTOCOL.queryCases,
    "FIXED_QUERY_CASES_REQUIRED",
  );
  const index = search.createPolicySearchIndex(corpus);
  const oracle = Object.fromEntries(
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
  const capRequest = { query: "", limit: 1000, passageLimit: 4 };
  const capDigest = verifyResultCap(
    search.searchPolicyCorpus(index, capRequest),
    index,
    fixture,
    search.policySearchPassage,
  );
  // A deterministic timestamp revision produces a distinct immutable snapshot.
  // It does not invent changed policy text or measure production refresh logic.
  const replacementEncoded = api.serializeAnalyzedCorpusV2(
    api.createAnalyzedCorpusV2({
      ...fixture.input,
      generatedAt: "2026-09-04T00:00:00Z",
    }),
  );
  assertPayloadBytes(Buffer.byteLength(replacementEncoded));
  const replacementCorpus = api.parseAnalyzedCorpusV2(
    JSON.parse(replacementEncoded),
  );
  const replacementIndex = search.createPolicySearchIndex(replacementCorpus);
  const replacementOracle = Object.fromEntries(
    cases.map((spec) => [
      spec.id,
      verifySearch(
        search.searchPolicyCorpus(replacementIndex, spec.request),
        replacementIndex,
        spec,
        fixture,
        search.policySearchPassage,
      ),
    ]),
  );
  assert.notEqual(corpus.contentDigest, replacementCorpus.contentDigest);
  const inputFile = await write.write("input.json", encoded);
  const pin = {
    protocol: SEARCH_MEASUREMENT_PROTOCOL.id,
    inputSha256: inputFile.sha256,
    inputBytes: inputFile.bytes,
    corpusDigest: corpus.contentDigest,
    trustDomain: "synthetic_test_only",
    works: size,
    versions: size,
    segments: size * 4,
    maxSegmentBytes: Math.max(
      ...[...fixture.exactSegments.values()].map((entry) =>
        Buffer.byteLength(entry.text),
      ),
    ),
    queryCases: cases,
    queryResultSha256: oracle,
    resultCapCheck: {
      request: capRequest,
      queryResultSha256: capDigest,
      rule: "Separate unfiltered browse assertion: exact authored population, ordered first min(size,1000) works and exact four UTF-8 source passages per hit. Not one of the sixteen historical query cases.",
    },
    replacement: {
      inputSha256: payloadSha256(replacementEncoded),
      inputBytes: Buffer.byteLength(replacementEncoded),
      corpusDigest: replacementCorpus.contentDigest,
      queryResultSha256: replacementOracle,
    },
    oracleRule:
      "Independent authored identity/order, temporal eligibility and exact UTF-8 passage replay assertions precede full result digest pinning. This is not an independent search implementation.",
  };
  const pinFile = await write.write("oracle-before-timing.json", pin);
  const setupMs = performance.now() - started;
  const observations = [];
  for (
    let repetition = 0;
    repetition <
    SEARCH_MEASUREMENT_PROTOCOL.warmups +
      SEARCH_MEASUREMENT_PROTOCOL.repetitions;
    repetition += 1
  ) {
    check();
    const validationStart = performance.now();
    const validated = api.parseAnalyzedCorpusV2(JSON.parse(encoded));
    const validationMs = performance.now() - validationStart;
    const afterValidation = memory();
    const buildStart = performance.now();
    const warmIndex = search.createPolicySearchIndex(validated);
    const indexMs = performance.now() - buildStart;
    const afterIndex = memory();
    const queries = [];
    for (const spec of cases) {
      check();
      const coldBuildStart = performance.now();
      const coldIndex = search.createPolicySearchIndex(validated);
      const coldIndexMs = performance.now() - coldBuildStart;
      const coldStart = performance.now();
      const cold = search.searchPolicyCorpus(coldIndex, spec.request);
      const coldMs = performance.now() - coldStart;
      search.searchPolicyCorpus(warmIndex, spec.request);
      const warmStart = performance.now();
      const warm = search.searchPolicyCorpus(warmIndex, spec.request);
      const warmMs = performance.now() - warmStart;
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
        populationMatches: warm.total,
        returned: warm.hits.length,
        queryLimit: spec.request.limit,
        resultsLimited: warm.total > warm.hits.length,
        memory: memory(),
      });
    }
    check();
    const capIndex = search.createPolicySearchIndex(validated);
    const capStart = performance.now();
    const capped = search.searchPolicyCorpus(capIndex, capRequest);
    const capMs = performance.now() - capStart;
    assert.equal(
      verifyResultCap(capped, capIndex, fixture, search.policySearchPassage),
      capDigest,
    );
    observations.push({
      repetition,
      warmup: repetition < SEARCH_MEASUREMENT_PROTOCOL.warmups,
      validationMs,
      indexMs,
      afterValidation,
      afterIndex,
      queries,
      resultCapCheck: {
        queryMs: capMs,
        populationMatches: capped.total,
        returned: capped.hits.length,
        limit: capRequest.limit,
        resultsLimited: capped.total > capped.hits.length,
        memory: memory(),
      },
    });
    await write.write(`progress-${String(repetition).padStart(2, "0")}.json`, {
      status: "incomplete",
      size,
      pin,
      observations,
      generated: { ...write.generated },
    });
  }
  check();
  const rebuildStart = performance.now();
  const oldFile = await write.write("old-projection.json", encoded);
  const stagedFile = await write.write(
    "staged-projection.json",
    replacementEncoded,
  );
  const manifestFile = await write.write("projection-manifests.json", {
    protocol: SEARCH_MEASUREMENT_PROTOCOL.id,
    parent: { ...inputFile, corpusDigest: corpus.contentDigest },
    oldProjection: { ...oldFile, corpusDigest: corpus.contentDigest },
    replacement: {
      ...stagedFile,
      corpusDigest: replacementCorpus.contentDigest,
      parentCorpusDigest: corpus.contentDigest,
    },
    projectionRule: "fixed-authored-full-population-v1",
    retainedWorkIds: fixture.input.works.map((entry) => entry.id),
    exclusions: [],
  });
  // Publish a separate exclusive measurement copy while retaining the stage.
  // This avoids rename replacement semantics and measures the extra copy too.
  const committedFile = await write.write(
    "committed-projection.json",
    replacementEncoded,
  );
  const coexistenceFiles = [
    inputFile,
    oldFile,
    stagedFile,
    committedFile,
    manifestFile,
    pinFile,
  ];
  for (const file of coexistenceFiles) {
    check();
    const actual = await fs.readFile(path.join(directory, file.path));
    assert.equal(actual.length, file.bytes);
    assert.equal(payloadSha256(actual), file.sha256);
  }
  const coexistence = {
    files: coexistenceFiles,
    bytes: coexistenceFiles.reduce((sum, file) => sum + file.bytes, 0),
    memory: memory(),
  };
  const committedPath = path.join(directory, "committed-projection.json");
  const committedBytes = await fs.readFile(committedPath);
  assert.equal(payloadSha256(committedBytes), pin.replacement.inputSha256);
  const rebuiltCorpus = api.parseAnalyzedCorpusV2(
    JSON.parse(committedBytes.toString("utf8")),
  );
  const rebuiltIndex = search.createPolicySearchIndex(rebuiltCorpus);
  for (const spec of cases) {
    check();
    assert.equal(
      verifySearch(
        search.searchPolicyCorpus(rebuiltIndex, spec.request),
        rebuiltIndex,
        spec,
        fixture,
        search.policySearchPassage,
      ),
      replacementOracle[spec.id],
    );
  }
  const rebuildMs = performance.now() - rebuildStart;
  const measured = observations.filter((entry) => !entry.warmup);
  const result = {
    status: "complete",
    protocol: SEARCH_MEASUREMENT_PROTOCOL,
    size,
    pin,
    setupMs,
    observations,
    summaries: {
      validationMs: summarize(measured.map((entry) => entry.validationMs)),
      indexMs: summarize(measured.map((entry) => entry.indexMs)),
      resultCapQueryMs: summarize(
        measured.map((entry) => entry.resultCapCheck.queryMs),
      ),
      queries: cases.map((spec) => ({
        id: spec.id,
        ...Object.fromEntries(
          ["coldIndexMs", "coldMs", "warmMs"].map((metric) => [
            metric,
            summarize(
              measured.map(
                (entry) =>
                  entry.queries.find((query) => query.id === spec.id)[metric],
              ),
            ),
          ]),
        ),
      })),
    },
    rebuild: {
      rebuildMs,
      coexistence,
      committedProjectionSha256: payloadSha256(committedBytes),
      phaseScope:
        "Write old/staged projection, manifests and exclusive committed measurement copy; verify concurrent owned files, then validate/rebuild/replay replacement oracle. Timestamp revision only; no production transaction or persistent index is measured.",
      coexistenceScope:
        "Explicit payload/manifest/oracle files only; excludes runtime/source/module files, progress logs and filesystem allocation overhead.",
    },
    memoryMethod:
      "RSS/heap/external/ArrayBuffer boundary samples and process maxRSS high-water; includes fixtures, oracle, old/replacement corpora and transient indexes. No forced GC or isolated retained-index estimate.",
    cacheState:
      "Fresh child per size; cold is a fresh in-memory index, not an empty OS cache. Warm query follows priming on its retained index. Setup and oracle assertions are excluded from query timings.",
    limitations: [
      "Synthetic fixed short-document population; no live source, 50 GB or long-document performance claim.",
      "No browser, production-loader, offline case persistence or output-style journey acceptance is supplied by this Node measurement.",
      "The sixteen queries request 20 hits and four passages. A separate exact browse assertion measures the 1000-hit cap; neither demonstrates pagination or source-wide completeness.",
      "Ten measured repetitions support median/range summaries, not a p99 estimate.",
    ],
    generatedBeforeResult: { ...write.generated },
  };
  await write.write("result.json", result);
  return { status: "complete", generated: write.generated, setupMs };
}

async function caseChild() {
  const [, , mode, rawSize, directory, token] = process.argv;
  const size = Number(rawSize);
  const root = exactOutputPath(outputRoot);
  ensure(
    mode === "--case" &&
      SEARCH_MEASUREMENT_PROTOCOL.sizes.includes(size) &&
      directory === path.join(root, `size-${size}`) &&
      token === process.env.GD32_MEASUREMENT_TOKEN &&
      typeof token === "string" &&
      /^[a-f0-9-]{36}$/u.test(token) &&
      process.connected,
    "OWNED_CHILD_REQUIRED",
  );
  await checkOwnedAncestors(directory);
  const deadline =
    performance.now() +
    SEARCH_MEASUREMENT_PROTOCOL.caseMilliseconds -
    SEARCH_MEASUREMENT_PROTOCOL.reapMilliseconds;
  const check = () => ensure(performance.now() < deadline, "CASE_TIME_LIMIT");
  try {
    const result = await measureCase(size, directory, check);
    process.send({ ...result, token });
  } catch (error) {
    process.send({
      status: "incomplete",
      failure: String(error.code ?? error.name ?? "MEASUREMENT_FAILED"),
      token,
    });
    process.exitCode = 1;
  } finally {
    process.disconnect();
  }
}

export async function superviseMeasurementChild(
  child,
  token,
  milliseconds,
  {
    setTimer = setTimeout,
    clearTimer = clearTimeout,
    now = () => performance.now(),
  } = {},
) {
  ensure(
    Number.isFinite(milliseconds) &&
      milliseconds > SEARCH_MEASUREMENT_PROTOCOL.reapMilliseconds &&
      milliseconds <= SEARCH_MEASUREMENT_PROTOCOL.caseMilliseconds,
    "INVALID_CHILD_WATCHDOG",
  );
  const deadline =
    now() + milliseconds - SEARCH_MEASUREMENT_PROTOCOL.reapMilliseconds;
  return await new Promise((resolve) => {
    let message = null;
    let timedOut = false;
    let killAccepted = null;
    let finished = false;
    let reapTimer;
    const finish = (value) => {
      if (finished) return;
      finished = true;
      clearTimer(timer);
      if (reapTimer !== undefined) clearTimer(reapTimer);
      resolve(value);
    };
    child.on("message", (value) => {
      if (value?.token === token) message = value;
    });
    child.on("error", () => {
      message = { status: "incomplete", failure: "CHILD_PROCESS_ERROR" };
    });
    child.on("close", (exitCode, signal) => {
      const deadlineExpired = now() >= deadline;
      const accounting = message?.generated;
      const accountingValid =
        accounting !== null &&
        typeof accounting === "object" &&
        !Array.isArray(accounting) &&
        Number.isSafeInteger(accounting.files) &&
        accounting.files >= 0 &&
        accounting.files <= SEARCH_MEASUREMENT_PROTOCOL.caseGeneratedFiles &&
        Number.isSafeInteger(accounting.bytes) &&
        accounting.bytes >= 0 &&
        accounting.bytes <= SEARCH_MEASUREMENT_PROTOCOL.caseGeneratedBytes;
      const complete =
        !timedOut &&
        !deadlineExpired &&
        exitCode === 0 &&
        signal === null &&
        message?.status === "complete" &&
        accountingValid;
      finish({
        status: complete ? "complete" : "incomplete",
        failure: complete
          ? null
          : timedOut || deadlineExpired
            ? "CASE_WATCHDOG"
            : message?.status === "complete" && !accountingValid
              ? "CHILD_ACCOUNTING_INVALID"
              : signal !== null
                ? "CHILD_SIGNAL_EXIT"
                : (message?.failure ?? "CHILD_RESULT_MISSING"),
        exitCode,
        signal,
        reaped: true,
        killAccepted,
        generated: message?.generated ?? null,
      });
    });
    const timer = setTimer(() => {
      if (finished) return;
      timedOut = true;
      // This reference names only the direct child created by this invocation.
      try {
        killAccepted = child.kill();
      } catch {
        killAccepted = false;
      }
      if (finished) return;
      reapTimer = setTimer(() => {
        if (finished) return;
        const cleanupUncertainty = [];
        try {
          child.unref();
        } catch {
          cleanupUncertainty.push("UNREF_FAILED");
        }
        try {
          if (child.connected) child.disconnect();
        } catch {
          cleanupUncertainty.push("DISCONNECT_FAILED");
        }
        finish({
          status: "incomplete",
          failure: "OWNED_CHILD_REAP_UNCONFIRMED",
          reaped: false,
          killAccepted,
          generated: message?.generated ?? null,
          cleanupUncertainty,
        });
      }, SEARCH_MEASUREMENT_PROTOCOL.reapMilliseconds);
    }, milliseconds - SEARCH_MEASUREMENT_PROTOCOL.reapMilliseconds);
  });
}

async function main() {
  ensure(
    process.argv.length === 4 && process.argv[2] === "--out",
    "EXPLICIT_OUTPUT_REQUIRED",
  );
  const directory = exactOutputPath(process.argv[3]);
  await checkOwnedAncestors(path.dirname(directory));
  // mkdir without recursive mode refuses an existing directory, including links.
  await fs.mkdir(directory);
  await checkOwnedAncestors(directory);
  const started = performance.now();
  const report = {
    protocol: SEARCH_MEASUREMENT_PROTOCOL,
    status: "incomplete",
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    startedAt: new Date().toISOString(),
    cases: [],
    generatedBudget:
      "Three cases plus parent reports: at most 256 MiB and 256 attempted generated files. No cleanup or historical accounting reservation.",
    browser: "not measured by this command",
  };
  const parentWrite = writer(directory);
  await parentWrite.write("protocol.json", report);
  for (const size of SEARCH_MEASUREMENT_PROTOCOL.sizes) {
    const remaining =
      SEARCH_MEASUREMENT_PROTOCOL.totalMilliseconds -
      (performance.now() - started);
    if (remaining <= SEARCH_MEASUREMENT_PROTOCOL.reapMilliseconds) {
      report.stopReason = "TOTAL_TIME_LIMIT";
      break;
    }
    const owned = path.join(directory, `size-${size}`);
    await fs.mkdir(owned);
    await checkOwnedAncestors(owned);
    const token = randomUUID();
    const child = fork(
      import.meta.filename,
      ["--case", String(size), owned, token],
      {
        execPath: process.execPath,
        execArgv: [],
        cwd: implementationRoot,
        env: {
          SystemRoot: process.env.SystemRoot ?? "C:/Windows",
          GD32_MEASUREMENT_TOKEN: token,
        },
        windowsHide: true,
        stdio: ["ignore", "ignore", "ignore", "ipc"],
      },
    );
    const caseStarted = performance.now();
    const result = await superviseMeasurementChild(
      child,
      token,
      Math.min(SEARCH_MEASUREMENT_PROTOCOL.caseMilliseconds, remaining),
    );
    report.cases.push({
      size,
      ...result,
      wallMs: performance.now() - caseStarted,
      evidence: `size-${size}/result.json`,
      partials: `size-${size}/progress-NN.json (if oracle setup completed)`,
    });
    await parentWrite.write(`checkpoint-${size}.json`, report);
    if (!result.reaped) {
      report.stopReason = "OWNED_CHILD_REAP_UNCONFIRMED";
      break;
    }
  }
  report.wallMs = performance.now() - started;
  report.status =
    !report.stopReason &&
    report.wallMs < SEARCH_MEASUREMENT_PROTOCOL.totalMilliseconds &&
    report.cases.length === SEARCH_MEASUREMENT_PROTOCOL.sizes.length &&
    report.cases.every((entry) => entry.status === "complete")
      ? "complete"
      : "incomplete";
  report.endedAt = new Date().toISOString();
  report.wallScope =
    "Parent start after fresh directory verification through case completion, immediately before final report write. Synchronous child work is bounded by parent watchdog; parent filesystem I/O is awaited and cannot be claimed bounded if it never settles.";
  await parentWrite.write("report.json", report);
  process.stdout.write(
    `${JSON.stringify({
      status: report.status,
      cases: report.cases.map(({ size, status, failure: code }) => ({
        size,
        status,
        failure: code,
      })),
      report: path.join(directory, "report.json"),
    })}\n`,
  );
  process.exitCode = report.status === "complete" ? 0 : 1;
}

if (path.resolve(process.argv[1] ?? "") === import.meta.filename) {
  (process.argv[2] === "--case" ? caseChild() : main()).catch(() => {
    process.stderr.write(
      "Bounded synthetic search measurement refused or incomplete.\n",
    );
    if (process.connected) process.disconnect();
    process.exitCode = 1;
  });
}
