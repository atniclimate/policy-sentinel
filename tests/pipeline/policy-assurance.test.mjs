import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { URL } from "node:url";
import {
  childFailure,
  observeCleanup,
  sealBrowserReport,
  withPreservedCleanup,
} from "../../src/pipeline/policy-assurance.mjs";

const batchSource = await readFile(
  new URL("../../scripts/acquire-policy-batch.mjs", import.meta.url),
  "utf8",
);
test("actual browser CLI boundary keeps raw persistence failures off the console", async () => {
  const source = await readFile(
    new URL("../../scripts/verify-policy-browser.mjs", import.meta.url),
    "utf8",
  );
  const boundary = source.slice(
    source.lastIndexOf("} finally {") + "} finally {".length,
  );
  const output = [];
  const process = {
    exitCode: 0,
    stdout: { write: (value) => output.push(value) },
  };
  const failure = new Error("SYNTHETIC_PRIVATE_PRIMARY");
  const report = {
    passed: false,
    cleanupErrors: [],
    persistenceError: { code: "EIO" },
  };
  await runInNewContext(`(async () => { { ${boundary} })()`, {
    process,
    report,
    failure,
    smokeOnly: false,
    browser: undefined,
    downloadCancellationTasks: [],
    sealBrowserReport: async () => {
      throw new AggregateError(
        [failure, new Error("SYNTHETIC_PRIVATE_WRITE")],
        "BROWSER_REPORT_PERSISTENCE_FAILED",
      );
    },
  });
  assert.equal(process.exitCode, 1);
  assert.match(output.join(""), /"passed":false/);
  assert.doesNotMatch(output.join(""), /PRIVATE|AggregateError|stack/);
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

const report = () => ({ contexts: [], checks: [], screenshots: [] });
test("browser close and cancellation failures are settled before failed report persistence", async () => {
  const value = report();
  const tasks = [];
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
      downloadTasks: [],
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
      downloadTasks: [],
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
    downloadTasks: [],
    persist: async () => ({}),
  });
  assert.equal(value.passed, true);
  assert.equal(value.outcome, "smoke_passed");
  assert.equal(value.acceptanceComplete, false);
});
