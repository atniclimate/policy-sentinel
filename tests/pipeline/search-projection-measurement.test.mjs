import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import {
  PROJECTION_MEASUREMENT_OUTPUT,
  PROJECTION_MEASUREMENT_PROTOCOL as protocol,
  createProjectionMeasurementWriter,
  exactProjectionOutputPath,
  readOwnedMeasurementFile,
  summarizeProjectionObservations,
  verifyProjectionCitations,
  verifyProjectionHealth,
} from "../../scripts/measure-search-projection.mjs";
import {
  SEARCH_MEASUREMENT_PROTOCOL as historical,
  payloadSha256,
} from "../../scripts/measure-bounded-search.mjs";
import {
  searchCases,
  searchFixture,
} from "../../scripts/measure-engineering.mjs";
import { createAnalyzedCorpusV2 } from "../../src/pipeline/analyzed-corpus-v2.mjs";
import { createSearchProjection } from "../../src/modules/output/local-workbench/search-projection.mjs";

test("successor names new output and preserves every frozen workload and finite ceiling", () => {
  assert.equal(protocol.id, "gd35-search-projection-synthetic-v1");
  assert.notEqual(protocol.id, historical.id);
  for (const key of [
    "sizes",
    "warmups",
    "repetitions",
    "queryCases",
    "caseMilliseconds",
    "totalMilliseconds",
    "reapMilliseconds",
    "payloadCeilingBytes",
    "resultCeiling",
    "caseGeneratedBytes",
    "caseGeneratedFiles",
  ])
    assert.deepEqual(protocol[key], historical[key]);
  assert.deepEqual(protocol.sizes, [100, 500, 2000]);
  assert.equal(protocol.warmups, 3);
  assert.equal(protocol.repetitions, 10);
  assert.equal(protocol.queryCases, 16);
  assert.equal(protocol.payloadCeilingBytes, 128 * 1024 ** 2);
  assert.equal(protocol.resultCeiling, 1000);
  assert.ok(Object.isFrozen(protocol));
  assert.equal(
    PROJECTION_MEASUREMENT_OUTPUT,
    "C:/dev/_scratch/policy-sentinel/study-engine-20261008/search-projection-01",
  );
  if (process.platform === "win32") {
    assert.equal(
      exactProjectionOutputPath(PROJECTION_MEASUREMENT_OUTPUT),
      path.resolve(PROJECTION_MEASUREMENT_OUTPUT),
    );
    for (const value of [
      "C:/dev/_scratch/policy-sentinel/autonomous-2026-10-07/search-01",
      `${PROJECTION_MEASUREMENT_OUTPUT}/child`,
      "search-projection-01",
    ])
      assert.throws(
        () => exactProjectionOutputPath(value),
        /FIXED_PROJECTION_OUTPUT_PATH_REQUIRED/u,
      );
  } else
    assert.throws(
      () => exactProjectionOutputPath(PROJECTION_MEASUREMENT_OUTPUT),
      /FIXED_WINDOWS_HOST_REQUIRED/u,
    );
});

test("measurement writer charges attempted bytes before I/O and creates files exclusively", async () => {
  const calls = [];
  const writer = createProjectionMeasurementWriter(
    "owned",
    { files: 0, bytes: 0 },
    async (...args) => {
      calls.push(args);
    },
  );
  const receipt = await writer.write("passage.json", Buffer.from("café"));
  assert.equal(receipt.bytes, 5);
  assert.equal(receipt.sha256, payloadSha256(Buffer.from("café")));
  assert.deepEqual(calls[0][2], { flag: "wx" });
  assert.deepEqual(writer.generated, { files: 1, bytes: 5 });
  await assert.rejects(
    writer.write("../outside.json", "{}"),
    /FIXED_FILE_NAME_REQUIRED/u,
  );
  assert.equal(calls.length, 1);
  const failed = createProjectionMeasurementWriter(
    "owned",
    { files: 0, bytes: 0 },
    async () => {
      throw new Error("authored-write-failure");
    },
  );
  await assert.rejects(
    failed.write("failure.json", "{}"),
    /authored-write-failure/u,
  );
  assert.deepEqual(failed.generated, { files: 1, bytes: 2 });
});

test("restart shares its predecessor's attempted byte/file account instead of gaining a second budget", async () => {
  let calls = 0;
  const resumed = createProjectionMeasurementWriter(
    "owned",
    { files: protocol.caseGeneratedFiles, bytes: 1 },
    async () => {
      calls += 1;
    },
  );
  await assert.rejects(
    resumed.write("restart.json", "{}"),
    /GENERATED_CASE_BUDGET_EXCEEDED/u,
  );
  const full = createProjectionMeasurementWriter(
    "owned",
    { files: 1, bytes: protocol.caseGeneratedBytes },
    async () => {
      calls += 1;
    },
  );
  await assert.rejects(
    full.write("restart.json", "{}"),
    /GENERATED_CASE_BUDGET_EXCEEDED/u,
  );
  assert.equal(calls, 0);
  for (const initial of [
    { files: -1, bytes: 0 },
    { files: 0, bytes: NaN },
    { files: 0, bytes: protocol.caseGeneratedBytes + 1 },
  ])
    assert.throws(
      () => createProjectionMeasurementWriter("owned", initial),
      /INVALID_GENERATED_ACCOUNTING/u,
    );
});

test("disk replay checks exact pins and never overwrites existing evidence", async (t) => {
  const tempRoot = await realpath(tmpdir());
  const prefix = path.join(tempRoot, "gd35-measurement-test-");
  const directory = await mkdtemp(prefix);
  t.after(async () => {
    assert.ok(path.resolve(directory).startsWith(path.resolve(prefix)));
    assert.equal(path.dirname(path.resolve(directory)), tempRoot);
    await rm(directory, { recursive: true, force: true });
  });
  const writer = createProjectionMeasurementWriter(directory);
  const entry = await writer.write("input.json", '{"synthetic":"café"}');
  assert.deepEqual(
    await readOwnedMeasurementFile(directory, entry),
    await readFile(path.join(directory, entry.path)),
  );
  await assert.rejects(writer.write("input.json", "{}"), { code: "EEXIST" });
  assert.equal(
    (await readFile(path.join(directory, entry.path))).length,
    entry.bytes,
  );
  await assert.rejects(
    readOwnedMeasurementFile(directory, { ...entry, path: "../input.json" }),
    /FIXED_FILE_NAME_REQUIRED/u,
  );
  await assert.rejects(
    readOwnedMeasurementFile(directory, {
      ...entry,
      bytes: protocol.payloadCeilingBytes + 1,
    }),
    /PAYLOAD_CEILING_EXCEEDED/u,
  );
  await assert.rejects(
    readOwnedMeasurementFile(directory, { ...entry, sha256: "0".repeat(64) }),
    /PINNED_FILE_DIGEST_MISMATCH/u,
  );
  const changed = Buffer.from(await readFile(path.join(directory, entry.path)));
  changed[0] = 32;
  await writeFile(path.join(directory, entry.path), changed);
  await assert.rejects(
    readOwnedMeasurementFile(directory, entry),
    /PINNED_FILE_DIGEST_MISMATCH/u,
  );
});

function observations() {
  return Array.from({ length: 13 }, (_, repetition) => ({
    repetition,
    warmup: repetition < 3,
    projectionMs: repetition,
    serializationMs: repetition,
    replayMs: repetition,
    indexMs: repetition,
    resultCapQueryMs: repetition,
    queries: searchCases().map((spec) => ({
      id: spec.id,
      coldIndexMs: repetition,
      coldMs: repetition,
      warmMs: repetition,
    })),
  }));
}

test("all ten observations survive summaries and warmups never enter reported medians", () => {
  const result = summarizeProjectionObservations(observations(), searchCases());
  assert.deepEqual(
    result.projectionMs.observations,
    [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  );
  assert.equal(result.projectionMs.median, 7.5);
  assert.equal(result.queries.length, 16);
  assert.deepEqual(result.queries[0].coldMs, result.projectionMs);
  assert.equal("p99" in result.projectionMs, false);
});

test("partial, duplicate or incomplete query observations cannot produce a passing summary", () => {
  for (const mutate of [
    (rows) => rows.pop(),
    (rows) => {
      rows[3].warmup = true;
    },
    (rows) => {
      rows[3].repetition = 2;
    },
    (rows) => {
      rows[3].queries.pop();
    },
    (rows) => {
      rows[3].queries[0].id = "unknown";
    },
  ]) {
    const rows = observations();
    mutate(rows);
    assert.throws(
      () => summarizeProjectionObservations(rows, searchCases()),
      /INCOMPLETE_MEASUREMENT_OBSERVATIONS/u,
    );
  }
  const nonfinite = observations();
  nonfinite[3].projectionMs = NaN;
  assert.throws(
    () => summarizeProjectionObservations(nonfinite, searchCases()),
    /INVALID_OBSERVATIONS/u,
  );
});

test("production projections preserve every authored byte citation and distinct source-health meanings", async () => {
  const fixture = await searchFixture(100);
  const parent = createAnalyzedCorpusV2(fixture.input);
  const projection = createSearchProjection(parent, {
    sourceProfileIds: ["synthetic-profile"],
  });
  const replay = verifyProjectionCitations(projection.corpus, fixture);
  assert.equal(replay.segments, 400);
  assert.equal(replay.multibyteSegments, 100);
  assert.match(replay.citation.quote, /café/u);
  const health = verifyProjectionHealth(parent);
  assert.equal(health.healthyNoMatch.total, 0);
  assert.equal(health.healthyNoMatch.coverage[0].searched, true);
  assert.equal(health.degraded[0].status, "degraded");
  assert.equal(health.degraded[0].lastKnownGoodDigest, parent.contentDigest);
  assert.equal(health.degraded[0].dataAsOf, parent.coverage[0].dataAsOf);
  assert.equal(health.unavailable[0].status, "unavailable");
  assert.equal(health.unavailable[0].searched, false);
  assert.equal(health.unsearched.selected, false);
  assert.equal(health.unsearched.retained, false);
  assert.equal(parent.sourceProfiles.length, 1);
  const forged = JSON.parse(JSON.stringify(projection.corpus));
  forged.renditions[0].text = forged.renditions[0].text.replace("café", "cafe");
  assert.throws(() => verifyProjectionCitations(forged, fixture));
});
