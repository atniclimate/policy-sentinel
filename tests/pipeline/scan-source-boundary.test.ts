import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const scanner = resolve(process.cwd(), "scripts/scan-source-boundary.mjs");
let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe("source-boundary scan", () => {
  it("skips a tracked file deleted from the working tree but not staged", async () => {
    root = await mkdtemp(join(tmpdir(), "scan-source-boundary-"));
    await mkdir(join(root, "scripts"));
    await copyFile(scanner, join(root, "scripts", "scan-source-boundary.mjs"));
    await writeFile(join(root, "kept.txt"), "kept\n");
    await writeFile(join(root, "deleted.txt"), "deleted\n");
    const git = (...args: string[]) =>
      spawnSync("git", args, { cwd: root, encoding: "utf8" });
    expect(git("init", "-q").status).toBe(0);
    expect(git("add", "kept.txt", "deleted.txt").status).toBe(0);
    await unlink(join(root, "deleted.txt"));

    const result = spawnSync(
      process.execPath,
      [join(root, "scripts", "scan-source-boundary.mjs")],
      { cwd: root, encoding: "utf8" },
    );
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Source-boundary scan passed/);
  });
});
