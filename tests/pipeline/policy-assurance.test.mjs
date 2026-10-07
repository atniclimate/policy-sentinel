import assert from "node:assert/strict";
import { safeFile } from "../../src/core/local-output-bindings.mjs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { URL } from "node:url";
import {
  childFailure,
  boundedFailure,
  createCleanupCollection,
  observeCleanup,
  sealBrowserReport,
  withPreservedCleanup,
} from "../../src/pipeline/policy-assurance.mjs";

const batchSource = await readFile(
  new URL("../../scripts/acquire-policy-batch.mjs", import.meta.url),
  "utf8",
);
test("actual browser CLI catch/seal/write boundary redacts all settled failures", async () => {
  const source = await readFile(
    new URL("../../scripts/verify-policy-browser.mjs", import.meta.url),
    "utf8",
  );
  const boundary = source.slice(source.lastIndexOf("} catch (error) {"));
  for (const writeFails of [false, true]) {
    const output = [];
    const process = {
      exitCode: 0,
      stdout: { write: (value) => output.push(value) },
    };
    const failure = new Error("SYNTHETIC_PRIVATE_PRIMARY");
    const value = report();
    const tasks = createCleanupCollection();
    observeCleanup(tasks, "download_cancel", async () => {
      throw new Error("SYNTHETIC_PRIVATE_CANCEL");
    });
    let persisted;
    await runInNewContext(
      `(async () => { try { throw failure; ${boundary} })()`,
      {
        process,
        report: value,
        failure,
        smokeOnly: false,
        browser: {
          close: async () => {
            throw new Error("SYNTHETIC_PRIVATE_CLOSE");
          },
        },
        activePage: undefined,
        downloadCancellationTasks: tasks,
        sealBrowserReport,
        boundedFailure,
        Buffer: globalThis.Buffer,
        root: "owned-synthetic",
        artifactBase: "synthetic",
        writePolicyDerived: async (_root, _path, bytes) => {
          persisted = JSON.parse(bytes.toString());
          if (writeFails)
            throw Object.assign(new Error("SYNTHETIC_PRIVATE_WRITE"), {
              code: "EIO",
            });
          return { path: "synthetic/report.json", digest: "synthetic" };
        },
      },
    );
    assert.equal(process.exitCode, 1);
    assert.match(output.join(""), /"passed":false/);
    assert.doesNotMatch(output.join(""), /PRIVATE|AggregateError|stack/);
    assert.doesNotMatch(
      JSON.stringify(persisted),
      /PRIVATE|AggregateError|stack/,
    );
    assert.equal(persisted.cleanupErrors.length, 2);
    assert.equal(persisted.passed, false);
    assert.equal(value.persistenceError?.code, writeFails ? "EIO" : undefined);
  }
});
async function batch(children, ledger = {}) {
  const output = [];
  const calls = [];
  const process = {
    argv: [
      "node",
      "batch",
      "--root",
      "synthetic-root",
      "--phase",
      "bodies",
      "--count",
      "3",
    ],
    execPath: "never-launched",
    stdout: { write: (text) => output.push(text) },
    exitCode: 0,
  };
  const records = ["one", "two", "three"].map((id) => ({
    bodyOperationId: id,
    bodyUrl: `https://example.invalid/${id}`,
  }));
  const sandbox = {
    process,
    childFailure,
    moduleDir: "synthetic-module",
    join: (...parts) => parts.join("/"),
    openPolicyRun: async () => ({ ledger: { operations: ledger } }),
    readFile: async () => JSON.stringify({ records }),
    spawnSync: (...args) => {
      calls.push(args);
      return children.shift() ?? { status: 0 };
    },
  };
  const source = batchSource
    .replace(/^import .+;\r?\n/gm, "")
    .replaceAll("import.meta.dirname", "moduleDir");
  let error;
  try {
    await runInNewContext(`(async () => {${source}\n})()`, sandbox, {
      timeout: 1000,
    });
  } catch (caught) {
    error = caught;
  }
  return { process, calls, output: output.join(""), error };
}

test("actual batch preserves accounted failure as nonzero and skips every spent ID", async () => {
  const result = await batch(
    [{ status: 2, stderr: "PRIVATE_RESPONSE_MUST_NOT_LOG" }, { status: 0 }],
    { one: { state: "failed" } },
  );
  assert.equal(result.process.exitCode, 1);
  assert.equal(result.error, undefined);
  assert.equal(result.calls.length, 2);
  assert.match(result.output, /"failed":1/);
  assert.match(result.output, /"retryAttempts":0/);
  assert.doesNotMatch(result.output, /PRIVATE_RESPONSE|https:/);
  assert.equal(result.calls[0][1][5], "two");
});

for (const [name, child, expected] of [
  [
    "empty stderr spawn",
    {
      status: null,
      stderr: "",
      error: Object.assign(new Error("PRIVATE_PATH"), { code: "ENOENT" }),
    },
    "ENOENT",
  ],
  [
    "timeout",
    { status: null, error: { code: "ETIMEDOUT", message: "PRIVATE_URL" } },
    "ETIMEDOUT",
  ],
  [
    "signal",
    { status: null, signal: "SIGTERM", stderr: "PRIVATE_RESPONSE" },
    "SIGTERM",
  ],
  ["missing exit", { status: null }, "CHILD_NONZERO_OR_MISSING_EXIT"],
  ["local failure", { status: 1 }, "CHILD_NONZERO_OR_MISSING_EXIT"],
  [
    "error despite zero status",
    { status: 0, error: { message: "PRIVATE_CONFIG" } },
    "UNCLASSIFIED_FAILURE",
  ],
]) {
  test(`actual batch stops on ${name} with bounded evidence`, async () => {
    const result = await batch([child]);
    assert.equal(result.process.exitCode, 1);
    assert.match(
      result.error.message,
      /BATCH_STOPPED_FOR_UNSETTLED_OR_LOCAL_FAILURE/,
    );
    assert.equal(result.calls.length, 1);
    assert.match(result.output, new RegExp(expected));
    assert.doesNotMatch(result.output, /PRIVATE_/);
  });
}

test("actual batch success and fully spent selection perform no retry", async () => {
  const success = await batch([{ status: 0 }]);
  assert.equal(success.process.exitCode, 0);
  assert.equal(success.error, undefined);
  const spent = await batch([], { one: {}, two: {}, three: {} });
  assert.equal(spent.calls.length, 0);
  assert.match(spent.output, /"attempted":0/);
});

const custodySource = await readFile(
  new URL("../../src/pipeline/policy-custody.mjs", import.meta.url),
  "utf8",
);
function custodyFunction(name, next, injected) {
  const start = custodySource.indexOf(`async function ${name}(`);
  const end = custodySource.indexOf(next, start);
  assert.ok(start > 0 && end > start);
  return runInNewContext(`(${custodySource.slice(start, end).trim()})`, {
    withPreservedCleanup,
    safePath: async () => {},
    dirname: () => "owned",
    join: (...parts) => parts.join("/"),
    randomUUID: () => "synthetic",
    process: { pid: 1 },
    jsonBytes: JSON.stringify,
    ...injected,
  });
}

for (const kind of ["atomic", "locked"]) {
  for (const cleanup of ["close", "remove"]) {
    if (kind === "atomic" && cleanup === "remove") continue;
    test(`actual custody ${kind} preserves primary and ${cleanup} failure`, async () => {
      const primary = new Error("SYNTHETIC_PRIMARY");
      const secondary = new Error("SYNTHETIC_CLEANUP");
      let removals = 0;
      let renames = 0;
      const fn = custodyFunction(
        kind,
        kind === "atomic"
          ? "\nasync function json("
          : "\nexport async function admitPolicyTargets",
        {
          open: async () => ({
            writeFile: async () => {
              if (kind === "atomic") throw primary;
            },
            sync: async () => {},
            close: async () => {
              if (cleanup === "close") throw secondary;
            },
          }),
          rm: async () => {
            removals++;
            throw secondary;
          },
          rename: async () => {
            renames++;
          },
        },
      );
      await assert.rejects(
        kind === "atomic"
          ? fn("owned/file", "synthetic")
          : fn("owned", async () => {
              throw primary;
            }),
        (error) =>
          error.cause === primary &&
          error.errors[0] === primary &&
          error.errors[1] === secondary,
      );
      assert.equal(renames, 0);
      assert.equal(removals, cleanup === "remove" ? 1 : 0);
    });
  }
}

test("cleanup preserves a lone primary, cleanup-only failure and successful return", async () => {
  const primary = new Error("PRIMARY");
  await assert.rejects(
    withPreservedCleanup(
      async () => {
        throw primary;
      },
      async () => {},
    ),
    (error) => error === primary,
  );
  await assert.rejects(
    withPreservedCleanup(
      async () => 1,
      async () => {
        throw primary;
      },
    ),
    (error) => error === primary,
  );
  assert.equal(
    await withPreservedCleanup(
      async () => 7,
      async () => {},
    ),
    7,
  );
});

const localOutputSource = await readFile(
  new URL("../../src/modules/intake/replay.mjs", import.meta.url),
  "utf8",
);
function localOutputRead(injected) {
  const start = localOutputSource.indexOf("async function readOwnedFile(");
  const end = localOutputSource.indexOf(
    "export async function replayReviewedCorpus(",
    start,
  );
  assert.ok(start > 0 && end > start);
  return runInNewContext(
    `${localOutputSource.slice(start, end)}\nreadOwnedFile;`,
    {
      withPreservedCleanup,
      safeFile,
      fail: (code) => {
        throw new Error(code);
      },
      realpath: async (value) => value,
      join: (...parts) => parts.join("/"),
      relative: (base, value) => value.slice(base.length + 1),
      resolve: (value) => value,
      isAbsolute: (value) => value.startsWith("/"),
      sep: "/",
      ...injected,
    },
  );
}
for (const stage of ["stat", "read", "length", "success"]) {
  for (const cleanupFails of [false, true]) {
    test(`actual local output ${stage} retains separate cleanup=${cleanupFails}`, async () => {
      const primary = new Error(`SYNTHETIC_PRIVATE_${stage}`);
      const cleanup = new Error("SYNTHETIC_PRIVATE_CLOSE");
      const bytes = globalThis.Buffer.from("abc");
      const stat = {
        isSymbolicLink: () => false,
        isDirectory: () => false,
        isFile: () => true,
        nlink: 1,
        size: stage === "length" ? 4 : bytes.length,
        ino: 1,
        dev: 1,
      };
      let closes = 0;
      const read = localOutputRead({
        lstat: async () => stat,
        open: async () => ({
          stat: async () => {
            if (stage === "stat") throw primary;
            return stat;
          },
          readFile: async () => {
            if (stage === "read") throw primary;
            return bytes;
          },
          close: async () => {
            closes++;
            if (cleanupFails) throw cleanup;
          },
        }),
      });
      if (stage === "success" && !cleanupFails) {
        assert.equal(await read("owned", "review/output.json"), bytes);
      } else {
        await assert.rejects(read("owned", "review/output.json"), (error) => {
          if (stage === "success") assert.equal(error, cleanup);
          else {
            const observedPrimary = cleanupFails ? error.cause : error;
            if (stage === "length")
              assert.equal(
                observedPrimary.message,
                "OUTPUT_FILE_CHANGED_DURING_READ",
              );
            else assert.equal(observedPrimary, primary);
            if (cleanupFails) {
              assert.equal(error.message, "PRIMARY_AND_CLEANUP_FAILURE");
              assert.equal(error.errors.length, 2);
              assert.equal(error.errors[0], observedPrimary);
              assert.equal(error.errors[1], cleanup);
            }
          }
          assert.doesNotMatch(JSON.stringify(boundedFailure(error)), /PRIVATE/);
          return true;
        });
      }
      assert.equal(closes, 1);
    });
  }
}

function report() {
  return { contexts: [], checks: [], screenshots: [] };
}
test("never-settling browser close cannot prevent the owned report attempt", async () => {
  let writes = 0;
  const sealing = sealBrowserReport({
    report: report(),
    failure: null,
    smokeOnly: false,
    close: () => new Promise(() => {}),
    downloadTasks: createCleanupCollection(),
    cleanupBudgetMs: 20,
    persist: async () => {
      writes++;
      return "attempted";
    },
  });
  let timer;
  const result = await Promise.race([
    sealing,
    new Promise((resolve) => {
      timer = globalThis.setTimeout(() => resolve("WATCHDOG"), 200);
    }),
  ]);
  globalThis.clearTimeout(timer);
  assert.equal(result, "attempted");
  assert.equal(writes, 1);
});
test("browser close and cancellation failures are settled before failed report persistence", async () => {
  const value = report();
  const tasks = createCleanupCollection();
  let cancelled = false;
  let writes = 0;
  observeCleanup(tasks, "download_cancel", async () => {
    await Promise.resolve();
    cancelled = true;
    throw Object.assign(new Error("PRIVATE_DOWNLOAD"), { code: "EIO" });
  });
  const artifact = await sealBrowserReport({
    report: value,
    failure: null,
    smokeOnly: false,
    close: async () => {
      throw new Error("PRIVATE_CLOSE");
    },
    downloadTasks: tasks,
    persist: async (sealed) => {
      writes++;
      assert.equal(cancelled, true);
      assert.equal(sealed.passed, false);
      assert.equal(sealed.cleanupErrors.length, 2);
      assert.doesNotMatch(JSON.stringify(sealed), /PRIVATE_/);
      return "artifact";
    },
  });
  assert.equal(writes, 1);
  assert.equal(artifact, "artifact");
});

test("browser primary, close and write failures remain separate and write is attempted", async () => {
  const primary = new Error("PRIMARY");
  const write = Object.assign(new Error("WRITE"), { code: "ENOSPC" });
  const value = report();
  let attempted = false;
  await assert.rejects(
    sealBrowserReport({
      report: value,
      failure: primary,
      smokeOnly: false,
      close: async () => {
        throw new Error("CLOSE");
      },
      downloadTasks: createCleanupCollection(),
      persist: async () => {
        attempted = true;
        throw write;
      },
    }),
    (error) =>
      error.cause === primary &&
      error.errors[0] === primary &&
      error.errors.at(-1) === write &&
      error.errors.length === 3,
  );
  assert.equal(attempted, true);
  assert.equal(value.passed, false);
  assert.equal(value.persistenceError.code, "ENOSPC");
});

test("browser incompletes remain unresolved and smoke cannot become acceptance", async () => {
  for (const smokeOnly of [false, true]) {
    const value = report();
    value.contexts.push({
      accessibility: [{ incomplete: [{ nodes: [{}, {}] }] }],
    });
    await sealBrowserReport({
      report: value,
      failure: null,
      smokeOnly,
      close: async () => {},
      downloadTasks: createCleanupCollection(),
      persist: async () => ({}),
    });
    assert.equal(value.outcome, "needs_accessibility_review");
    assert.equal(value.accessibilityReview.unresolvedNodes, 2);
    assert.equal(value.acceptanceComplete, false);
  }
  const value = report();
  await sealBrowserReport({
    report: value,
    failure: null,
    smokeOnly: true,
    close: async () => {},
    downloadTasks: createCleanupCollection(),
    persist: async () => ({}),
  });
  assert.equal(value.passed, true);
  assert.equal(value.outcome, "smoke_passed");
  assert.equal(value.acceptanceComplete, false);
});

test("one total deadline covers never-settling close and appended cancellation", async () => {
  const value = report();
  const tasks = createCleanupCollection();
  let rejectLate;
  let postClosedObserved = false;
  let snapshot;
  let writes = 0;
  const started = globalThis.performance.now();
  const artifact = await sealBrowserReport({
    report: value,
    failure: null,
    smokeOnly: false,
    downloadTasks: tasks,
    cleanupBudgetMs: 30,
    close: async () => {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));
      assert.equal(
        observeCleanup(
          tasks,
          "download_cancel",
          () =>
            new Promise((_resolve, reject) => {
              rejectLate = reject;
            }),
        ),
        true,
      );
      await new Promise(() => {});
    },
    persist: async (sealed) => {
      writes++;
      snapshot = sealed;
      return "owned";
    },
  });
  assert.equal(artifact, "owned");
  assert.equal(writes, 1);
  assert.ok(
    globalThis.performance.now() - started < 250,
    "bounded local scheduling tolerance",
  );
  assert.equal(snapshot.cleanupSettlement.deadlineReached, true);
  assert.equal(snapshot.cleanupSettlement.pendingAtDeadline, 2);
  assert.equal(snapshot.cleanupSettlement.terminationConfirmed, false);
  assert.deepEqual(
    snapshot.cleanupErrors.map((issue) => issue.code),
    ["ETIMEDOUT", "ETIMEDOUT"],
  );
  const bytes = JSON.stringify(snapshot);
  rejectLate(new Error("PRIVATE_LATE_CANCEL"));
  assert.equal(
    observeCleanup(tasks, "download_cancel", async () => {
      postClosedObserved = true;
      throw new Error("PRIVATE_POST_CLOSED");
    }),
    false,
  );
  value.contexts.push({ accessibility: [{ incomplete: [{ nodes: [{}] }] }] });
  value.cleanupErrors.push({ operation: "live_event", code: "SYNTHETIC" });
  await new Promise((resolve) => globalThis.setImmediate(resolve));
  assert.equal(postClosedObserved, true);
  assert.equal(JSON.stringify(snapshot), bytes);
  assert.ok(
    Object.isFrozen(snapshot) && Object.isFrozen(snapshot.cleanupErrors),
  );
  assert.throws(() => snapshot.contexts.push({}), TypeError);
});

test("cancellation alone times out and pending tasks added during settlement are counted", async () => {
  for (const never of [false, true]) {
    const value = report();
    const tasks = createCleanupCollection();
    observeCleanup(tasks, "download_cancel", async () => {
      await Promise.resolve();
      observeCleanup(tasks, "download_cancel", async () => {
        if (never) await new Promise(() => {});
        else
          throw Object.assign(new Error("PRIVATE_APPENDED"), { code: "EIO" });
      });
    });
    await sealBrowserReport({
      report: value,
      failure: null,
      smokeOnly: false,
      close: async () => {},
      downloadTasks: tasks,
      cleanupBudgetMs: 20,
      persist: async (sealed) => {
        assert.equal(sealed.cleanupErrors.length, 1);
        assert.equal(sealed.cleanupErrors[0].code, never ? "ETIMEDOUT" : "EIO");
      },
    });
    assert.equal(value.passed, false);
  }
});

test("closed collection and immutable snapshot stay closed while owned persistence is awaited", async () => {
  const value = report();
  value.contexts.push({ accessibility: [{ incomplete: [] }] });
  const tasks = createCleanupCollection();
  let releaseWrite;
  let beginWrite;
  const startedWrite = new Promise((resolve) => {
    beginWrite = resolve;
  });
  let snapshot;
  const sealing = sealBrowserReport({
    report: value,
    failure: null,
    smokeOnly: false,
    close: async () => {},
    downloadTasks: tasks,
    cleanupBudgetMs: 5,
    persist: async (sealed) => {
      snapshot = sealed;
      beginWrite();
      await new Promise((resolve) => {
        releaseWrite = resolve;
      });
      return "completed_owned_write";
    },
  });
  await startedWrite;
  const bytes = JSON.stringify(snapshot);
  value.contexts[0].accessibility[0].incomplete.push({ nodes: [{}] });
  assert.equal(
    observeCleanup(tasks, "download_cancel", async () => {
      throw new Error("PRIVATE_LATE");
    }),
    false,
  );
  await new Promise((resolve) => globalThis.setTimeout(resolve, 15));
  assert.equal(JSON.stringify(snapshot), bytes);
  assert.equal(snapshot.passed, true);
  assert.ok(Object.isFrozen(snapshot.contexts[0].accessibility[0].incomplete));
  releaseWrite();
  assert.equal(await sealing, "completed_owned_write");
  await assert.rejects(
    sealBrowserReport({
      report: value,
      close: async () => {},
      downloadTasks: tasks,
      persist: async () => {},
    }),
    /INVALID_BROWSER_SEAL_BOUNDARY/,
  );
});

test("cleanup collection rejects arbitrary handles, operations and extended deadlines", async () => {
  assert.throws(
    () => observeCleanup([], "download_cancel", async () => {}),
    /INVALID_CLEANUP/,
  );
  assert.throws(
    () =>
      observeCleanup(
        createCleanupCollection(),
        "PRIVATE_OPERATION",
        async () => {},
      ),
    /INVALID_CLEANUP/,
  );
  await assert.rejects(
    sealBrowserReport({
      report: report(),
      close: async () => {},
      downloadTasks: createCleanupCollection(),
      persist: async () => {},
      cleanupBudgetMs: 5001,
    }),
    /INVALID_BROWSER_SEAL_BOUNDARY/,
  );
});

test("actual sealer schedules one shared default deadline for close and cancellation", async () => {
  const source = await readFile(
    new URL("../../src/pipeline/policy-assurance.mjs", import.meta.url),
    "utf8",
  );
  const timers = [];
  const cleared = [];
  const actual = runInNewContext(
    `(() => { ${source.replace(/^export /gm, "")}\n return {createCleanupCollection, observeCleanup, sealBrowserReport}; })()`,
    {
      structuredClone: globalThis.structuredClone,
      performance: { now: () => 0 },
      setTimeout: (fn, delay) => {
        timers.push({ fn, delay });
        return timers.length;
      },
      clearTimeout: (id) => cleared.push(id),
    },
  );
  const tasks = actual.createCleanupCollection();
  let resolveClose;
  const close = new Promise((resolve) => {
    resolveClose = resolve;
  });
  actual.observeCleanup(tasks, "download_cancel", () => new Promise(() => {}));
  let sealed;
  const result = actual.sealBrowserReport({
    report: report(),
    failure: null,
    smokeOnly: false,
    close: () => close,
    downloadTasks: tasks,
    persist: async (value) => {
      sealed = value;
      return "written";
    },
  });
  await Promise.resolve();
  resolveClose();
  for (let n = 0; n < 8; n++) await Promise.resolve();
  assert.deepEqual(
    timers.map((timer) => timer.delay),
    [5000],
  );
  timers[0].fn();
  assert.equal(await result, "written");
  assert.equal(sealed.cleanupErrors[0].operation, "download_cancel");
  assert.equal(sealed.cleanupErrors[0].code, "ETIMEDOUT");
  assert.deepEqual(cleared, [1]);
});

test("continuously appended cleanup microtasks cannot starve the deadline", async () => {
  const tasks = createCleanupCollection();
  let appended = 0;
  let admitted = true;
  function append() {
    if (!admitted) return;
    appended++;
    admitted = observeCleanup(tasks, "download_cancel", append);
  }
  observeCleanup(tasks, "download_cancel", append);
  const value = report();
  await sealBrowserReport({
    report: value,
    failure: null,
    smokeOnly: false,
    close: async () => {},
    downloadTasks: tasks,
    cleanupBudgetMs: 10,
    persist: async () => "written",
  });
  assert.ok(appended > 0);
  assert.equal(value.cleanupSettlement.deadlineReached, true);
  assert.equal(value.passed, false);
});

test("cleanup observed settled after the total deadline cannot pass", async () => {
  const source = await readFile(
    new URL("../../src/pipeline/policy-assurance.mjs", import.meta.url),
    "utf8",
  );
  let clock = 0;
  const actual = runInNewContext(
    `(() => { ${source.replace(/^export /gm, "")}\n return {createCleanupCollection, sealBrowserReport}; })()`,
    {
      structuredClone: globalThis.structuredClone,
      performance: { now: () => clock },
      setTimeout: () => 1,
      clearTimeout: () => {},
    },
  );
  let snapshot;
  await actual.sealBrowserReport({
    report: report(),
    failure: null,
    smokeOnly: false,
    close: async () => {
      clock = 5001;
    },
    downloadTasks: actual.createCleanupCollection(),
    persist: async (sealed) => {
      snapshot = sealed;
    },
  });
  assert.equal(snapshot.passed, false);
  assert.equal(snapshot.acceptanceComplete, false);
  assert.equal(snapshot.outcome, "failed");
  assert.equal(snapshot.cleanupSettlement.deadlineReached, true);
  assert.equal(snapshot.cleanupSettlement.pendingAtDeadline, 0);
  assert.equal(snapshot.cleanupErrors[0].operation, "cleanup_deadline");
  assert.equal(snapshot.cleanupErrors[0].code, "ETIMEDOUT");
});
