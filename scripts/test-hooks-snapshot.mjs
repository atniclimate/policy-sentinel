import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const sourceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const npmCli = process.env.npm_execpath;
assert.ok(
  npmCli && path.isAbsolute(npmCli),
  "Run via npm run hooks:test:snapshot",
);

const run = (command, args, cwd, timeout = 30_000) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    timeout,
    windowsHide: true,
    shell: false,
  });
  assert.ifError(result.error);
  assert.equal(
    result.status,
    0,
    `${command} failed:\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout;
};

const trackedPaths = run("git", ["ls-files", "-z"], sourceRoot)
  .split("\0")
  .filter(Boolean);
// Include this leased harness before its first commit; no other untracked input.
const sourcePaths = [
  ...new Set([...trackedPaths, "scripts/test-hooks-snapshot.mjs"]),
].sort();
const forbiddenSourcePath =
  /^(?:\.git|node_modules|generated-data|raw-data|cached-responses|public-data|private|secrets|\.local|\.cache)(?:\/|$)|(?:^|\/)(?:settings\.local\.json|\.env(?:\.[^/]*)?|[^/]*\.pem|id_rsa[^/]*)$/iu;
const scratchParent = realpathSync.native(tmpdir());
const snapshotRoot = mkdtempSync(
  path.join(scratchParent, "policy-sentinel-hooks-snapshot-"),
);
const sourceDigest = createHash("sha256");
let sourceBytes = 0;

const assertContained = (root, target) => {
  const relative = path.relative(root, target);
  assert.ok(
    relative && !relative.startsWith("..") && !path.isAbsolute(relative),
  );
};
const assertNoHistoricalInputs = () => {
  for (const relative of [
    "generated-data",
    ".local",
    ".claude/settings.local.json",
    ".env",
  ]) {
    assert.equal(
      existsSync(path.join(snapshotRoot, relative)),
      false,
      relative,
    );
  }
};

try {
  for (const relative of sourcePaths) {
    assert.equal(
      forbiddenSourcePath.test(relative),
      false,
      `Excluded source path: ${relative}`,
    );
    const from = path.resolve(sourceRoot, relative);
    const to = path.resolve(snapshotRoot, relative);
    assertContained(sourceRoot, from);
    assertContained(snapshotRoot, to);
    assert.equal(realpathSync.native(from), from, `Source alias: ${relative}`);
    assert.ok(lstatSync(from).isFile(), `Not a source file: ${relative}`);
    mkdirSync(path.dirname(to), { recursive: true });
    copyFileSync(from, to);
    const bytes = readFileSync(to);
    sourceBytes += bytes.length;
    sourceDigest.update(
      `${relative}\0${createHash("sha256").update(bytes).digest("hex")}\n`,
    );
  }

  // Hooks load only yaml at runtime. Reuse that installed dependency in an
  // ordinary copy, without a junction back into this checkout or an npm install.
  const yamlSource = path.join(sourceRoot, "node_modules", "yaml");
  const yamlPackage = JSON.parse(
    readFileSync(path.join(yamlSource, "package.json"), "utf8"),
  );
  const lock = JSON.parse(
    readFileSync(path.join(snapshotRoot, "package-lock.json"), "utf8"),
  );
  assert.equal(yamlPackage.version, lock.packages["node_modules/yaml"].version);
  cpSync(yamlSource, path.join(snapshotRoot, "node_modules", "yaml"), {
    recursive: true,
    filter: (entry) => {
      assert.equal(
        lstatSync(entry).isSymbolicLink(),
        false,
        "Dependency must not contain links",
      );
      return true;
    },
  });
  const emptyTemplate = path.join(snapshotRoot, ".empty-git-template");
  mkdirSync(emptyTemplate);
  run("git", ["init", "--quiet", `--template=${emptyTemplate}`], snapshotRoot);
  assertNoHistoricalInputs();
  console.log(
    `Fresh source snapshot: ${sourcePaths.length} files, ${sourceBytes} bytes, SHA-256 ${sourceDigest.digest("hex")}`,
  );
  console.log(
    `Dependency reuse: yaml ${yamlPackage.version}; no install, ignored receipts or local settings copied.`,
  );
  process.stdout.write(
    run(process.execPath, [npmCli, "run", "hooks:test"], snapshotRoot, 180_000),
  );
  assertNoHistoricalInputs();
  console.log(
    "Snapshot hooks passed; historical inputs absent before and after.",
  );
} finally {
  // Delete only the canonical directory created by this process under tmpdir.
  assertContained(scratchParent, snapshotRoot);
  assert.equal(path.dirname(snapshotRoot), scratchParent);
  assert.equal(realpathSync.native(snapshotRoot), snapshotRoot);
  rmSync(snapshotRoot, { recursive: true, force: true });
}
