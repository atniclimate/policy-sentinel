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

  function run(command: "open" | "scan", file: string) {
    return spawnSync(
      process.execPath,
      ["scripts/ncai-vault.mjs", command, file],
      {
        cwd: root,
        env: {
          ...process.env,
          NCAI_DEMO_PASSWORD: command === "open" ? PASSWORD : "",
        },
        encoding: "utf8",
        windowsHide: true,
      },
    );
  }

  it("opens only to a new ignored private file and preserves existing output", async () => {
    const output = "private/drafts.json";
    expect(run("open", output).status).toBe(0);
    const plaintext = await readFile(join(root, output), "utf8");
    expect(JSON.parse(plaintext)).toEqual(DRAFTS);
    const again = run("open", output);
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
    const result = run("open", output);
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
    const result = run("open", output);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Git-ignored and untracked");
    await expect(readFile(join(root, output))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("rejects private output when ignore protection is absent", async () => {
    await writeFile(join(root, ".gitignore"), "");
    const result = run("open", "private/drafts.json");
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
    const result = run("open", output);
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
      const result = run("open", `${link}/drafts.json`);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("linked directories");
      await expect(
        readFile(join(outside, "drafts.json")),
      ).rejects.toMatchObject({ code: "ENOENT" });
    },
  );

  describe("artifact plaintext scan", () => {
    const source = "private/scan.json";
    const draft = {
      ...DRAFTS[0],
      title: "Sensitive café draft title",
      note: "Confidential synthetic note phrase",
      topics: ['"Example topic phrase"'],
    };

    beforeEach(async () => {
      await writeFile(join(root, source), JSON.stringify([draft]));
      await mkdir(join(root, "docs/demo-assets"), { recursive: true });
      await writeFile(
        join(root, "docs/index.html"),
        "<!doctype html><title>Demo</title>",
      );
      await writeFile(
        join(root, "docs/demo-assets/main.js"),
        "export const ready = true;",
      );
    });

    it("scans without a password and emits only counts without writes", async () => {
      const result = run("scan", source);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toBe("");
      expect(JSON.parse(result.stdout)).toEqual({
        drafts: 1,
        needles: expect.any(Number),
        files: 2,
        hits: 0,
      });
      expect(await readFile(join(root, source), "utf8")).toBe(
        JSON.stringify([draft]),
      );
      expect(
        await readFile(join(root, "src/demo/ncai-2026.vault.json"), "utf8"),
      ).toBe(vault);
    });

    it.each([
      ["title", draft.title],
      ["note", draft.note],
      ["topic", draft.topics[0]],
      ["escaped Unicode title", draft.title.replace("é", "\\u00E9")],
      ["escaped topic", JSON.stringify(draft.topics[0])],
      ["private input filename", "scan.json"],
      ["private path", "private/sensitive-file.json"],
      ["escaped private path", String.raw`private\\sensitive-file.json`],
    ])("rejects a nested %s hit without printing it", async (_, text) => {
      await mkdir(join(root, "docs/demo-assets/nested"));
      await writeFile(join(root, "docs/demo-assets/nested/leak.js"), text);
      const result = run("scan", source);
      expect(result.status).toBe(1);
      expect(result.stderr).toBe("");
      expect(JSON.parse(result.stdout)).toEqual({
        drafts: 1,
        needles: expect.any(Number),
        files: 3,
        hits: 1,
      });
    });

    it.each([
      ["malformed JSON", '"sensitive malformed input'],
      [
        "invalid drafts",
        JSON.stringify([{ title: "sensitive invalid draft" }]),
      ],
      ["empty drafts", "[]"],
    ])("fails safely on %s", async (_, text) => {
      await writeFile(join(root, source), text);
      const result = run("scan", source);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe(
        "ncai-vault failed: Artifact scan could not complete.\n",
      );
    });

    it("refuses linked runtime directories", async () => {
      const outside = join(root, "elsewhere");
      await mkdir(outside);
      await writeFile(join(outside, "sensitive-file.txt"), draft.title);
      await symlink(
        outside,
        join(root, "docs/demo-assets/linked"),
        process.platform === "win32" ? "junction" : "dir",
      );
      const result = run("scan", source);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe(
        "ncai-vault failed: Artifact scan could not complete.\n",
      );
    });

    it("refuses hardlinked runtime files", async () => {
      await link(
        join(root, source),
        join(root, "docs/demo-assets/linked.json"),
      );
      const result = run("scan", source);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe(
        "ncai-vault failed: Artifact scan could not complete.\n",
      );
    });

    it("does not report completion when the artifact is missing", async () => {
      await unlink(join(root, "docs/index.html"));
      const result = run("scan", source);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe(
        "ncai-vault failed: Artifact scan could not complete.\n",
      );
    });
  });
});
