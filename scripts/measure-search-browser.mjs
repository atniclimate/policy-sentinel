import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { searchCases } from "./measure-engineering.mjs";
import { checkOwnedAncestors } from "./measure-bounded-search.mjs";

// Explicit, already-installed tooling only. No download or provider input.
const base = "C:/dev/_scratch/policy-sentinel/autonomous-2026-10-07";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const deadline = performance.now() + 600000;
async function bounded(operation, milliseconds, code) {
  let timer;
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(code)),
          Math.max(1, milliseconds),
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function readPinnedFile(directory, name, maximum) {
  const target = path.join(directory, name);
  const before = await fs.lstat(target);
  assert.ok(
    before.isFile() &&
      !before.isSymbolicLink() &&
      before.nlink === 1 &&
      before.size <= maximum,
  );
  assert.equal((await fs.realpath(target)).toLowerCase(), target.toLowerCase());
  const handle = await fs.open(target, "r");
  let bytes;
  try {
    const opened = await handle.stat();
    assert.ok(opened.isFile() && opened.nlink === 1 && opened.size <= maximum);
    assert.equal(opened.ino, before.ino);
    assert.equal(opened.size, before.size);
    bytes = await handle.readFile();
    const finished = await handle.stat();
    assert.equal(finished.size, opened.size);
    assert.equal(finished.mtimeMs, opened.mtimeMs);
  } finally {
    await handle.close();
  }
  const after = await fs.lstat(target);
  assert.ok(after.isFile() && !after.isSymbolicLink());
  assert.equal(after.size, before.size);
  assert.equal(after.mtimeMs, before.mtimeMs);
  assert.equal(after.ino, before.ino);
  assert.equal(bytes.length, before.size);
  return bytes;
}
const args = process.argv.slice(2);
assert.deepEqual(
  args.filter((_, i) => i % 2 === 0),
  ["--measurement-root", "--out", "--playwright-core", "--browser"],
);
assert.equal(args.length, 8);
const [inputRoot, outputRoot, runtimeRoot, executablePath] = [
  args[1],
  args[3],
  args[5],
  args[7],
].map((value) => path.resolve(value));
assert.equal(
  inputRoot.toLowerCase(),
  path.resolve(base, "search-01").toLowerCase(),
);
assert.equal(
  outputRoot.toLowerCase(),
  path.resolve(base, "search-browser-01").toLowerCase(),
);
await checkOwnedAncestors(inputRoot);
await checkOwnedAncestors(path.dirname(outputRoot));
await fs.mkdir(outputRoot); // Existing evidence is never overwritten.
await checkOwnedAncestors(outputRoot);
const report = {
  protocol: "gd32-search-browser-synthetic-v1",
  status: "incomplete",
  startedAt: new Date().toISOString(),
  cases: [],
  limitations: [
    "Search module harness only; no application loader, UI or analyst journey acceptance.",
    "Browser heap is an optional phase sample, not process RSS or an index allocation measurement.",
    "Page request routing is not a system-wide browser packet capture.",
    "Cold means a fresh index; disk and operating-system caches are not cleared.",
    "Awaited filesystem/report I/O is not bounded by the browser watchdog; concurrent privileged writers are outside metadata checks.",
  ],
};
let server;
let browser;
try {
  let runtime;
  try {
    runtime = JSON.parse(
      await fs.readFile(path.join(runtimeRoot, "package.json"), "utf8"),
    );
    await fs.access(executablePath);
  } catch {
    report.failure = "INSTALLED_BROWSER_RUNTIME_UNAVAILABLE";
    runtime = undefined;
  }
  if (runtime) {
    assert.equal(runtime.name, "playwright-core");
    assert.equal(runtime.version, "1.61.1");
    assert.equal(runtime.license, "Apache-2.0");
    const require = createRequire(path.join(runtimeRoot, "index.js"));
    assert.equal(
      require.resolve("playwright-core"),
      path.join(runtimeRoot, "index.js"),
    );
    const { chromium } = require("playwright-core");
    browser = await chromium.launch({
      executablePath,
      headless: true,
      timeout: 30000,
    });
    report.runtime = {
      packageVersion: runtime.version,
      browserVersion: browser.version(),
    };
  }
  const modules = new Map();
  for (const name of ["policy-search.mjs", "temporal-operations.mjs"])
    modules.set(
      `/${name}`,
      await fs.readFile(new URL(`../src/engine/${name}`, import.meta.url)),
    );
  const routes = new Map([
    [
      "/",
      {
        type: "text/html",
        bytes: Buffer.from(
          '<!doctype html><meta charset="utf-8"><title>Synthetic search measurement</title>',
        ),
      },
    ],
    ...[...modules].map(([name, bytes]) => [
      name,
      { type: "text/javascript", bytes },
    ]),
  ]);
  server = http.createServer((request, response) => {
    const file = request.method === "GET" ? routes.get(request.url) : undefined;
    if (!file) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, {
      "content-type": file.type,
      "content-length": file.bytes.length,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    response.end(file.bytes);
  });
  // Missing runtime never starts a server or opens a browser.
  let origin;
  if (browser) {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    origin = `http://127.0.0.1:${server.address().port}`;
    report.origin = origin;
  }
  for (const size of [100, 500, 2000]) {
    if (performance.now() >= deadline - 5000) {
      report.failure = "BROWSER_TOTAL_TIME_LIMIT";
      break;
    }
    const row = {
      size,
      status: "incomplete",
      memory: { status: "unavailable" },
    };
    report.cases.push(row);
    try {
      const owned = path.join(inputRoot, `size-${size}`);
      await checkOwnedAncestors(owned);
      const payload = await readPinnedFile(
        owned,
        "input.json",
        128 * 1024 ** 2,
      );
      const pin = JSON.parse(
        (
          await readPinnedFile(
            owned,
            "oracle-before-timing.json",
            2 * 1024 ** 2,
          )
        ).toString("utf8"),
      );
      assert.equal(pin.trustDomain, "synthetic_test_only");
      assert.equal(pin.protocol, "gd32-bounded-search-synthetic-v1");
      assert.deepEqual(pin.queryCases, searchCases());
      assert.equal(payload.length, pin.inputBytes);
      assert.equal(hash(payload), pin.inputSha256);
      assert.ok(payload.length <= 128 * 1024 ** 2);
      const corpus = JSON.parse(payload.toString("utf8"));
      assert.equal(corpus.trustDomain, "synthetic_test_only");
      assert.equal(corpus.contentDigest, pin.corpusDigest);
      row.payloadBytes = payload.length;
      row.inputSha256 = pin.inputSha256;
      row.corpusDigest = pin.corpusDigest;
      if (!browser) {
        row.failure = report.failure;
        continue;
      }
      routes.set("/input.json", { type: "application/json", bytes: payload });
      const context = await browser.newContext({ serviceWorkers: "block" });
      const denied = [];
      try {
        await context.route("**/*", (route) => {
          const url = new URL(route.request().url());
          if (url.origin === origin && !url.search && routes.has(url.pathname))
            return route.continue();
          denied.push("NON_ALLOWLISTED_PAGE_REQUEST");
          return route.abort();
        });
        const page = await context.newPage();
        await page.goto(origin, { timeout: 30000 });
        row.observation = await bounded(
          page.evaluate(
            async ({ pin, specifications }) => {
              const digest = async (bytes) =>
                [
                  ...new Uint8Array(
                    await crypto.subtle.digest("SHA-256", bytes),
                  ),
                ]
                  .map((byte) => byte.toString(16).padStart(2, "0"))
                  .join("");
              const clock = () => performance.now();
              const start = clock();
              const response = await fetch("/input.json", {
                cache: "no-store",
                credentials: "omit",
                redirect: "error",
              });
              const bytes = await response.arrayBuffer();
              const fetchMs = clock() - start;
              const verificationAt = clock();
              if (
                !response.ok ||
                bytes.byteLength !== pin.inputBytes ||
                (await digest(bytes)) !== pin.inputSha256
              )
                throw new Error("PAYLOAD_PIN_MISMATCH");
              const digestVerificationMs = clock() - verificationAt;
              const decodedAt = clock();
              const corpus = JSON.parse(
                new TextDecoder("utf-8", { fatal: true }).decode(bytes),
              );
              const decodeMs = clock() - decodedAt;
              const api = await import("/policy-search.mjs");
              const encoder = new TextEncoder();
              const observations = [];
              for (let repetition = 0; repetition < 13; repetition += 1) {
                const buildAt = clock();
                const warmIndex = api.createPolicySearchIndex(corpus);
                const indexMs = clock() - buildAt;
                const queries = [];
                for (const spec of specifications) {
                  const coldIndex = api.createPolicySearchIndex(corpus);
                  const coldAt = clock();
                  const cold = api.searchPolicyCorpus(coldIndex, spec.request);
                  const coldMs = clock() - coldAt;
                  api.searchPolicyCorpus(warmIndex, spec.request);
                  const warmAt = clock();
                  const warm = api.searchPolicyCorpus(warmIndex, spec.request);
                  const warmMs = clock() - warmAt;
                  for (const result of [cold, warm]) {
                    if (
                      (await digest(encoder.encode(JSON.stringify(result)))) !==
                      pin.queryResultSha256[spec.id]
                    )
                      throw new Error("RESULT_ORACLE_MISMATCH");
                    for (const hit of result.hits)
                      for (const passage of hit.passages) {
                        const segment = corpus.segments.find(
                          (entry) => entry.id === passage.segmentId,
                        );
                        const rendition = corpus.renditions.find(
                          (entry) => entry.id === segment.renditionId,
                        );
                        const text = new TextDecoder("utf-8", {
                          fatal: true,
                        }).decode(
                          encoder
                            .encode(rendition.text)
                            .subarray(segment.startByte, segment.endByte),
                        );
                        if (
                          api.policySearchPassage(warmIndex, segment.id)
                            .text !== text
                        )
                          throw new Error("CITATION_REPLAY_MISMATCH");
                      }
                  }
                  queries.push({
                    id: spec.id,
                    coldMs,
                    warmMs,
                    total: warm.total,
                    returned: warm.hits.length,
                  });
                }
                if (repetition >= 3)
                  observations.push({
                    repetition: repetition - 3,
                    indexMs,
                    queries,
                  });
              }
              const memory = performance.memory?.usedJSHeapSize;
              return {
                fetchMs,
                digestVerificationMs,
                decodeMs,
                payloadBytes: bytes.byteLength,
                observations,
                memory: Number.isFinite(memory)
                  ? {
                      status: "unreliable_estimate",
                      usedJSHeapBytes: memory,
                      limitation:
                        "Deprecated nonstandard Chromium heap estimate; not an acceptance metric.",
                    }
                  : { status: "unavailable" },
              };
            },
            { pin, specifications: searchCases() },
          ),
          Math.min(115000, deadline - performance.now() - 5000),
          "BROWSER_CASE_TIME_LIMIT",
        );
        assert.equal(denied.length, 0);
        row.memory = row.observation.memory;
        row.status = "complete";
      } finally {
        try {
          await bounded(context.close(), 5000, "CONTEXT_CLOSE_UNCONFIRMED");
          row.contextClose = "settled";
        } catch {
          row.contextClose = "unconfirmed";
          row.status = "incomplete";
          row.failure = "CONTEXT_CLOSE_UNCONFIRMED";
          report.stopReason = "CONTEXT_CLOSE_UNCONFIRMED";
        }
      }
    } catch {
      row.status = "incomplete";
      row.failure = "BROWSER_CASE_INCOMPLETE";
    }
    if (report.stopReason) break;
  }
  report.status =
    !report.stopReason &&
    report.cases.length === 3 &&
    report.cases.every((row) => row.status === "complete")
      ? "complete"
      : "incomplete";
} catch {
  report.failure ??= "BROWSER_MEASUREMENT_REFUSED";
} finally {
  try {
    if (browser)
      await bounded(browser.close(), 5000, "BROWSER_CLOSE_UNCONFIRMED");
    report.browserClose = browser ? "settled" : "not_started";
  } catch {
    report.browserClose = "unconfirmed";
    report.status = "incomplete";
  }
  if (server?.listening) {
    try {
      await bounded(
        new Promise((resolve) => server.close(resolve)),
        5000,
        "SERVER_CLOSE_UNCONFIRMED",
      );
      report.serverClose = "settled";
    } catch {
      report.serverClose = "unconfirmed";
      report.status = "incomplete";
      server.closeAllConnections();
    }
  } else report.serverClose = "not_started";
  report.endedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputRoot, "report.json"), json(report), {
    flag: "wx",
  });
  process.stdout.write(
    json({
      status: report.status,
      failure: report.failure,
      cases: report.cases.map(({ size, status, failure, payloadBytes }) => ({
        size,
        status,
        failure,
        payloadBytes,
      })),
    }),
  );
  process.exitCode = report.status === "complete" ? 0 : 2;
}
