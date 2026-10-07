import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import process from "node:process";
import test from "node:test";
import {
  SEARCH_MEASUREMENT_PROTOCOL as protocol,
  assertMeasurementFileName,
  assertPayloadBytes,
  chargeGenerated,
  exactOutputPath,
  superviseMeasurementChild,
  verifyResultCap,
} from "../../scripts/measure-bounded-search.mjs";

function fakeChild() {
  const child = new EventEmitter();
  child.connected = true;
  child.kills = 0;
  child.unrefs = 0;
  child.disconnects = 0;
  child.kill = () => {
    child.kills += 1;
    return true;
  };
  child.unref = () => {
    child.unrefs += 1;
  };
  child.disconnect = () => {
    child.disconnects += 1;
    child.connected = false;
  };
  const timers = [];
  const clock = {
    setTimer(callback, delay) {
      const timer = { callback, delay, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimer(timer) {
      timer.cleared = true;
    },
  };
  return { child, timers, clock };
}

test("namespace and byte guards refuse alternatives before any filesystem operation", () => {
  assertMeasurementFileName("progress-00.json");
  for (const name of [
    "../input.json",
    "input.json/extra",
    "C:/input.json",
    "input.txt",
    "input.json\n",
  ]) {
    assert.throws(
      () => assertMeasurementFileName(name),
      /FIXED_FILE_NAME_REQUIRED/u,
    );
  }
  assertPayloadBytes(protocol.payloadCeilingBytes);
  for (const bytes of [-1, 0.5, NaN, protocol.payloadCeilingBytes + 1]) {
    assert.throws(() => assertPayloadBytes(bytes), /PAYLOAD_CEILING_EXCEEDED/u);
  }
  if (process.platform === "win32") {
    assert.throws(
      () => exactOutputPath("C:/dev/_scratch/policy-sentinel/other"),
      /FIXED_OUTPUT_PATH_REQUIRED/u,
    );
    assert.throws(
      () => exactOutputPath("search-01"),
      /FIXED_OUTPUT_PATH_REQUIRED/u,
    );
  } else {
    assert.throws(
      () => exactOutputPath("/tmp/search-01"),
      /FIXED_WINDOWS_HOST_REQUIRED/u,
    );
  }
});

test("attempted-write accounting fails before a file or byte ceiling is exceeded", () => {
  const generated = { files: 0, bytes: 0 };
  chargeGenerated(generated, protocol.caseGeneratedBytes);
  assert.deepEqual(generated, { files: 1, bytes: protocol.caseGeneratedBytes });
  assert.throws(
    () => chargeGenerated(generated, 1),
    /GENERATED_CASE_BUDGET_EXCEEDED/u,
  );
  assert.deepEqual(generated, { files: 1, bytes: protocol.caseGeneratedBytes });
  const full = { files: protocol.caseGeneratedFiles, bytes: 0 };
  assert.throws(
    () => chargeGenerated(full, 0),
    /GENERATED_CASE_BUDGET_EXCEEDED/u,
  );
  assert.equal(full.files, protocol.caseGeneratedFiles);
});

test("success requires a matching owned-child message and confirmed close", async () => {
  const { child, timers, clock } = fakeChild();
  const pending = superviseMeasurementChild(child, "owned", 120000, clock);
  child.emit("message", { token: "other", status: "complete" });
  child.emit("close", 0, null);
  const result = await pending;
  assert.equal(result.status, "incomplete");
  assert.equal(result.failure, "CHILD_RESULT_MISSING");
  assert.equal(result.reaped, true);
  assert.equal(child.kills, 0);
  assert.equal(timers[0].cleared, true);
  const valid = fakeChild();
  const success = superviseMeasurementChild(
    valid.child,
    "owned",
    120000,
    valid.clock,
  );
  valid.child.emit("message", {
    token: "owned",
    status: "complete",
    generated: { files: 1, bytes: 2 },
  });
  valid.child.emit("close", 0, null);
  assert.equal((await success).status, "complete");
});

test("watchdog targets only the created child and retains the reaping reserve", async () => {
  const { child, timers, clock } = fakeChild();
  const pending = superviseMeasurementChild(child, "owned", 120000, clock);
  assert.equal(timers[0].delay, 115000);
  timers[0].callback();
  assert.equal(child.kills, 1);
  assert.equal(timers[1].delay, 5000);
  child.emit("close", null, "SIGTERM");
  const result = await pending;
  assert.equal(result.failure, "CASE_WATCHDOG");
  assert.equal(result.reaped, true);
  assert.equal(timers[1].cleared, true);
});

test("unconfirmed reaping stops with an explicit failure and releases only its child handle", async () => {
  const { child, timers, clock } = fakeChild();
  const pending = superviseMeasurementChild(child, "owned", 120000, clock);
  timers[0].callback();
  timers[1].callback();
  const result = await pending;
  assert.equal(result.failure, "OWNED_CHILD_REAP_UNCONFIRMED");
  assert.equal(result.reaped, false);
  assert.equal(child.kills, 1);
  assert.equal(child.unrefs, 1);
  assert.equal(child.disconnects, 1);
});

test("throwing owned-handle cleanup still produces an incomplete bounded receipt", async () => {
  const { child, timers, clock } = fakeChild();
  child.unref = () => {
    child.unrefs += 1;
    throw new Error("unref failed");
  };
  child.disconnect = () => {
    child.disconnects += 1;
    throw new Error("disconnect failed");
  };
  const pending = superviseMeasurementChild(child, "owned", 120000, clock);
  timers[0].callback();
  timers[1].callback();
  const result = await pending;
  assert.equal(result.status, "incomplete");
  assert.equal(result.failure, "OWNED_CHILD_REAP_UNCONFIRMED");
  assert.equal(result.reaped, false);
  assert.deepEqual(result.cleanupUncertainty, [
    "UNREF_FAILED",
    "DISCONNECT_FAILED",
  ]);
  assert.equal(child.unrefs, 1);
  assert.equal(child.disconnects, 1);
});

test("monotonic deadline rejects completion even when the watchdog callback was delayed", async () => {
  const { child, timers, clock } = fakeChild();
  let elapsed = 0;
  const pending = superviseMeasurementChild(child, "owned", 120000, {
    ...clock,
    now: () => elapsed,
  });
  child.emit("message", {
    token: "owned",
    status: "complete",
    generated: { files: 1, bytes: 2 },
  });
  elapsed = 115000;
  child.emit("close", 0, null);
  const result = await pending;
  assert.equal(result.status, "incomplete");
  assert.equal(result.failure, "CASE_WATCHDOG");
  assert.equal(result.reaped, true);
  assert.equal(child.kills, 0);
  // A stale timer callback cannot target a child after confirmed close.
  timers[0].callback();
  assert.equal(child.kills, 0);
});

test("completion rejects signal exits and malformed or over-budget accounting", async () => {
  for (const generated of [
    undefined,
    null,
    { files: NaN, bytes: 2 },
    { files: 1, bytes: Infinity },
    { files: -1, bytes: 2 },
    { files: 1, bytes: 0.5 },
    { files: protocol.caseGeneratedFiles + 1, bytes: 2 },
    { files: 1, bytes: protocol.caseGeneratedBytes + 1 },
  ]) {
    const { child, clock } = fakeChild();
    const pending = superviseMeasurementChild(child, "owned", 120000, clock);
    child.emit("message", { token: "owned", status: "complete", generated });
    child.emit("close", 0, null);
    const result = await pending;
    assert.equal(result.status, "incomplete");
    assert.equal(result.failure, "CHILD_ACCOUNTING_INVALID");
    assert.equal(result.reaped, true);
  }
  const { child, clock } = fakeChild();
  const pending = superviseMeasurementChild(child, "owned", 120000, clock);
  child.emit("message", {
    token: "owned",
    status: "complete",
    generated: { files: 1, bytes: 2 },
  });
  child.emit("close", 0, "SIGTERM");
  const result = await pending;
  assert.equal(result.status, "incomplete");
  assert.equal(result.failure, "CHILD_SIGNAL_EXIT");
});

test("cap oracle rejects omitted, duplicate or altered source passages and wrong population", () => {
  const fixture = {
    input: { works: [{ id: "work-0000" }] },
    exactSegments: new Map(),
  };
  const passages = Array.from({ length: 4 }, (_, i) => {
    const segmentId = `segment-${i}`;
    fixture.exactSegments.set(segmentId, {
      workId: "work-0000",
      versionId: "version-0000",
      captureId: "capture-0000",
      renditionId: "rendition-0000",
      text: `Exact café line ${i}.\n`,
    });
    return {
      segmentId,
      captureId: "capture-0000",
      renditionId: "rendition-0000",
    };
  });
  const index = { corpusDigest: "synthetic-digest" };
  const result = {
    kind: "policy_search_results",
    corpusDigest: index.corpusDigest,
    method: { id: "source-passage-bm25", version: "2.0.0" },
    total: 1,
    temporal: null,
    hits: [{ workId: "work-0000", versionId: "version-0000", passages }],
  };
  const passage = (_, id) => ({ text: fixture.exactSegments.get(id).text });
  assert.match(
    verifyResultCap(result, index, fixture, passage),
    /^[a-f0-9]{64}$/u,
  );
  assert.throws(() =>
    verifyResultCap({ ...result, total: 2 }, index, fixture, passage),
  );
  assert.throws(() =>
    verifyResultCap(result, index, fixture, () => ({ text: "Altered bytes" })),
  );
  const duplicate = globalThis.structuredClone(result);
  duplicate.hits[0].passages[3] = duplicate.hits[0].passages[0];
  assert.throws(() => verifyResultCap(duplicate, index, fixture, passage));
  const omitted = globalThis.structuredClone(result);
  omitted.hits[0].passages.pop();
  assert.throws(() => verifyResultCap(omitted, index, fixture, passage));
});
