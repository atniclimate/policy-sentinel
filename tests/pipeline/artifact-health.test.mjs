import assert from "node:assert/strict";
import test from "node:test";
import { assertArtifactSourceHealthState } from "../../src/pipeline/artifact-health.mjs";

const sourceId = "official-source";
const checkedAt = "2026-07-31T20:00:00.000Z";
const dataAsOf = "2026-07-31T19:00:00.000Z";
const lastSuccessfulRetrievalAt = "2026-07-31T19:30:00.000Z";

function recordHealth(overrides = {}) {
  return {
    status: "healthy",
    checkedAt,
    dataAsOf,
    lastSuccessfulRetrievalAt,
    usingLastKnownGood: false,
    message: null,
    ...overrides,
  };
}

function record(overrides = {}) {
  return {
    sourceHealth: recordHealth(overrides),
  };
}

function receipt(overrides = {}) {
  return {
    sourceId,
    status: "healthy",
    checkedAt,
    dataAsOf,
    lastSuccessfulRetrievalAt,
    usingLastKnownGood: false,
    stale: false,
    recordCount: 1,
    failureStage: null,
    message: null,
    ...overrides,
  };
}

test("accepts coherent healthy and degraded public states", () => {
  assert.doesNotThrow(() =>
    assertArtifactSourceHealthState({
      health: receipt(),
      sourceRecords: [record()],
    }),
  );

  const degraded = {
    status: "degraded",
    usingLastKnownGood: true,
    message: "The current refresh failed; prior validated records are shown.",
  };
  assert.doesNotThrow(() =>
    assertArtifactSourceHealthState({
      health: receipt({
        ...degraded,
        stale: true,
        failureStage: "fetch",
      }),
      sourceRecords: [record(degraded)],
    }),
  );
});

test("accepts a coherent recordless unavailable state", () => {
  assert.doesNotThrow(() =>
    assertArtifactSourceHealthState({
      health: receipt({
        status: "unavailable",
        dataAsOf: null,
        lastSuccessfulRetrievalAt: null,
        stale: true,
        recordCount: 0,
        failureStage: "fetch",
        message: "No validated records are available.",
      }),
      sourceRecords: [],
    }),
  );
});

test("rejects contradictory healthy and degraded states", () => {
  for (const inconsistent of [
    { stale: true },
    { usingLastKnownGood: true },
    { failureStage: "fetch" },
    { message: "A refresh failed." },
  ]) {
    assert.throws(
      () =>
        assertArtifactSourceHealthState({
          health: receipt(inconsistent),
          sourceRecords: [record()],
        }),
      /(?:receipt differs from record health|healthy receipt is inconsistent)/,
    );
  }

  const degradedRecord = record({
    status: "degraded",
    usingLastKnownGood: true,
    message: "A refresh failed.",
  });
  for (const inconsistent of [
    { usingLastKnownGood: false },
    { stale: false },
    { failureStage: null },
    { message: null },
  ]) {
    assert.throws(
      () =>
        assertArtifactSourceHealthState({
          health: receipt({
            status: "degraded",
            usingLastKnownGood: true,
            stale: true,
            failureStage: "fetch",
            message: "A refresh failed.",
            ...inconsistent,
          }),
          sourceRecords: [degradedRecord],
        }),
      /(?:receipt differs from record health|degraded receipt is inconsistent)/,
    );
  }
});

test("rejects failed or unknown states that expose records", () => {
  for (const status of ["failed", "unknown", "unavailable"]) {
    assert.throws(
      () =>
        assertArtifactSourceHealthState({
          health: receipt({ status }),
          sourceRecords: [record({ status })],
        }),
      status === "unavailable"
        ? /unavailable state mismatch/
        : /status cannot expose public records/,
    );
  }
});

test("binds receipt checkedAt and health fields to every record", () => {
  assert.throws(
    () =>
      assertArtifactSourceHealthState({
        health: receipt({ checkedAt: "2026-07-31T20:01:00.000Z" }),
        sourceRecords: [record()],
      }),
    /receipt differs from record health/,
  );
});

test("rejects contradictory unavailable states", () => {
  for (const inconsistent of [
    { status: "failed" },
    { dataAsOf },
    { lastSuccessfulRetrievalAt },
    { usingLastKnownGood: true },
    { stale: false },
    { message: null },
  ]) {
    assert.throws(
      () =>
        assertArtifactSourceHealthState({
          health: receipt({
            status: "unavailable",
            dataAsOf: null,
            lastSuccessfulRetrievalAt: null,
            stale: true,
            recordCount: 0,
            failureStage: null,
            message: "No validated records are available.",
            ...inconsistent,
          }),
          sourceRecords: [],
        }),
      inconsistent.status === "failed"
        ? /unavailable state mismatch/
        : /unavailable receipt is inconsistent/,
    );
  }
});
