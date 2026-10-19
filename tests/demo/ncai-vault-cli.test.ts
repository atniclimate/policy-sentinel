// @vitest-environment node
import { spawnSync } from "node:child_process";
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  rmdir,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sealNcaiDrafts } from "../../src/demo/ncai-vault";

const PASSWORD = "synthetic-cli-passphrase";
const DRAFTS = [
  {
    id: "PSC-26-001",
    title: "Synthetic draft",
    sponsor: "Example Council",
    status: "Pending",
  },
];

describe("NCAI vault CLI plaintext output boundary", () => {
  let root: string;
  let vault: string;

  beforeAll(async () => {
    vault = JSON.stringify(await sealNcaiDrafts(DRAFTS, PASSWORD, 100_000));
  });

  function git(...args: string[]) {
    const result = spawnSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      windowsHide: true,
    });
    expect(result.status, result.stderr).toBe(0);
  }

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ncai-vault-cli-"));
    await mkdir(join(root, "scripts"));
    await mkdir(join(root, "src/demo"), { recursive: true });
    await mkdir(join(root, "private"));
    for (const file of [
      "scripts/ncai-vault.mjs",
      "src/demo/ncai-vault.ts",
      "src/demo/ncai-2026.ts",
    ])
      await copyFile(
        new URL(`../../${file}`, import.meta.url),
        join(root, file),
      );
    await writeFile(join(root, "package.json"), '{"type":"module"}\n');
    await writeFile(join(root, ".gitignore"), "private/\n.cache/\n");
    await writeFile(join(root, "src/demo/ncai-2026.vault.json"), vault);
    git("init", "--quiet");
  });

  afterEach(async () => {
    expect(dirname(resolve(root))).toBe(resolve(tmpdir()));
    await rm(root, { recursive: true, force: true });
  });

  function open(file: string) {
    return spawnSync(
      process.execPath,
      ["scripts/ncai-vault.mjs", "open", file],
      {
        cwd: root,
        env: { ...process.env, NCAI_DEMO_PASSWORD: PASSWORD },
        encoding: "utf8",
        windowsHide: true,
      },
    );
  }

  it("opens only to a new ignored private file and preserves existing output", async () => {
    const output = "private/drafts.json";
    expect(open(output).status).toBe(0);
    const plaintext = await readFile(join(root, output), "utf8");
    expect(JSON.parse(plaintext)).toEqual(DRAFTS);
    const again = open(output);
    expect(again.status).toBe(1);
    expect(again.stderr).toContain("EEXIST");
    expect(await readFile(join(root, output), "utf8")).toBe(plaintext);
  });

  it.each([
    "drafts.json",
    "private/../escaped.json",
    "private-copy/drafts.json",
    ".cache/drafts.json",
  ])("rejects plaintext outside private/: %s", async (output) => {
    const result = open(output);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("inside this checkout's private/");
    await expect(readFile(join(root, output))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("rejects a tracked private path even when its working file is missing", async () => {
    const output = "private/tracked.json";
    await writeFile(join(root, output), "synthetic tracked file");
    git("add", "--force", "--", output);
    await unlink(join(root, output));
    const result = open(output);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Git-ignored and untracked");
    await expect(readFile(join(root, output))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("rejects private output when ignore protection is absent", async () => {
    await writeFile(join(root, ".gitignore"), "");
    const result = open("private/drafts.json");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Git-ignored and untracked");
    await expect(
      readFile(join(root, "private/drafts.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects alternate stream paths through a hardlink", async () => {
    const outside = join(root, "tracked.json");
    const output = "private/linked.json:drafts";
    await writeFile(outside, "synthetic tracked file");
    git("add", "--", "tracked.json");
    await link(outside, join(root, "private/linked.json"));
    const result = open(output);
    await expect(readFile(`${outside}:drafts`, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toContain("must not name a file stream");
    await expect(readFile(join(root, output))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(await readFile(outside, "utf8")).toBe("synthetic tracked file");
  });

  it.each(["private", "private/linked"])(
    "rejects a directory link escaping private/: %s",
    async (link) => {
      const outside = join(root, "outside");
      await mkdir(outside);
      if (link === "private") await rmdir(join(root, link));
      await symlink(
        outside,
        join(root, link),
        process.platform === "win32" ? "junction" : "dir",
      );
      const result = open(`${link}/drafts.json`);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("linked directories");
      await expect(
        readFile(join(outside, "drafts.json")),
      ).rejects.toMatchObject({ code: "ENOENT" });
    },
  );
});
