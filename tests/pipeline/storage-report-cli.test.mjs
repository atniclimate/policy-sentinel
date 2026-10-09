import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import process from "node:process";
import test from "node:test";

const script = resolve("scripts/report-storage.mjs");
async function cleanup(directory) {
  assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
  assert.match(basename(directory), /^ps-storage-(?:cli|data)-/u);
  await rm(directory, { recursive: true, force: true });
}
function run(args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 30000,
    maxBuffer: 1024 * 1024,
  });
}

test("storage CLI explains read-only scope and rejects malformed flags", () => {
  const help = run(["--help"]);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /future capacity is not evaluated/);
  const invalid = run(["--root", "sensitive-local-path"]);
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, "");
  assert.match(invalid.stderr, /INVALID_ARGUMENTS/);
  assert.doesNotMatch(invalid.stderr, /sensitive-local-path/);
});

test("storage CLI returns bounded sanitized errors for invalid input", async () => {
  const parent = await mkdtemp(join(tmpdir(), "ps-storage-cli-"));
  try {
    const file = join(parent, "private-manifest.json");
    await writeFile(file, '{"private-content":');
    const invalid = run(["--manifest", file, "--json"]);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /INVALID_MANIFEST_JSON/);
    assert.doesNotMatch(invalid.stdout + invalid.stderr, /private-/);
    const absent = run(["--manifest", join(parent, "secret-missing.json")]);
    assert.equal(absent.status, 1);
    assert.doesNotMatch(
      absent.stdout + absent.stderr,
      /secret-missing|ps-storage-cli/,
    );
    await writeFile(file, " ".repeat(1024 * 1024 + 1));
    const large = run(["--manifest", file]);
    assert.equal(large.status, 1);
    assert.match(large.stderr, /INVALID_MANIFEST_FILE/);
  } finally {
    await cleanup(parent);
  }
});

test("storage CLI inventories without contents, leaves bytes unchanged and refuses forecasts", async () => {
  const parent = await mkdtemp(join(tmpdir(), "ps-storage-cli-"));
  const root = await mkdtemp(join(tmpdir(), "ps-storage-data-"));
  try {
    const document = join(root, "sensitive-document-name.txt");
    const body = "private document body must never enter a report";
    await writeFile(document, body);
    const manifest = {
      version: "1.0.0",
      roots: [{ id: "retained", path: root, categories: [], runs: [] }],
      projections: [],
    };
    const file = join(parent, "manifest.json");
    await writeFile(file, JSON.stringify(manifest));
    const result = run(["--manifest", file, "--json"]);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, "complete");
    assert.equal(report.totalBytes, body.length);
    assert.equal(report.forecast.status, "not_evaluated");
    assert.equal(report.roots[0].categories.unclassified.bytes, body.length);
    assert.doesNotMatch(
      result.stdout,
      /sensitive-document|private document|ps-storage-data/,
    );
    assert.equal(await readFile(document, "utf8"), body);

    manifest.roots[0].runs.push({
      id: "existing",
      path: ".",
      state: "existing",
    });
    manifest.projections.push({
      id: "expansion",
      rootId: "retained",
      runId: "existing",
      retainedBytes: 50_000_000_000,
      temporaryBytes: 1,
    });
    await writeFile(file, JSON.stringify(manifest));
    const refused = run(["--manifest", file]);
    assert.equal(refused.status, 2, refused.stderr);
    assert.match(refused.stdout, /Forecast: refused/);
    assert.equal(await readFile(document, "utf8"), body);

    manifest.roots[0].path = join(root, "not-present");
    manifest.roots[0].runs = [];
    manifest.projections = [];
    await writeFile(file, JSON.stringify(manifest));
    const missing = run(["--manifest", file, "--json"]);
    assert.equal(missing.status, 2, missing.stderr);
    assert.equal(JSON.parse(missing.stdout).status, "incomplete");
    assert.doesNotMatch(
      missing.stdout + missing.stderr,
      /not-present|ps-storage-data/,
    );
  } finally {
    await cleanup(parent);
    await cleanup(root);
  }
});
