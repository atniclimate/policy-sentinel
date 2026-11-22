// @vitest-environment node
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { runAcquire } from "../../scripts/demo-index/acquire.mjs";
import {
  cfrShard,
  removeTemps,
  RIGHTS,
  tempDir,
  vocabFile,
  writeIndex,
} from "./fixtures/demo-index/build-index";

afterEach(removeTemps);

const moduleUrl = new URL(
  "../../scripts/demo-index/acquire.mjs",
  import.meta.url,
).href;
const agency = "vocab/fr-agencies.json";
const title = "cfr/title-25.json";
const absent = "vocab/fr-topics.json";

function setup() {
  const root = tempDir();
  const dataDir = join(root, "docs", "demo-data");
  writeIndex(dataDir, [
    { path: agency, value: vocabFile() },
    { path: title, value: cfrShard() },
  ]);
  const rights = join(root, "rights.json");
  writeFileSync(rights, JSON.stringify(RIGHTS));
  const args = [
    "vocab",
    "--only",
    "fr-topics",
    "--work-dir",
    join(root, "work"),
    "--report",
    join(root, "report.json"),
    "--rights-file",
    rights,
  ];
  return { dataDir, args };
}

// Exit inside a completed OS rename. This bypasses JavaScript catch/finally,
// just as a terminated installer does. Production code has no test hooks.
function interrupt(
  dataDir: string,
  destination: string,
  writes: readonly string[],
) {
  const program = `
    import fs from "node:fs";
    import { syncBuiltinESMExports } from "node:module";
    import { join, relative } from "node:path";
    const [url, dir, destination, paths] = process.argv.slice(1);
    const rename = fs.renameSync;
    fs.renameSync = (from, to) => {
      rename(from, to);
      if (relative(to, fs.realpathSync.native(join(dir, destination))) === "") process.exit(73);
    };
    syncBuiltinESMExports();
    const { installIndexFiles } = await import(url);
    installIndexFiles(dir, JSON.parse(paths).map(path => ({path, bytes: Buffer.from("uncommitted")})));
  `;
  const child = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      program,
      moduleUrl,
      dataDir,
      destination,
      JSON.stringify(writes),
    ],
    { encoding: "utf8", windowsHide: true, timeout: 10_000 },
  );
  expect(child.status, child.error?.message ?? child.stderr).toBe(73);
}

it("repairs a killed install and a killed rollback before validating or fetching", async () => {
  const { dataDir, args } = setup();
  const read = (name: string) => readFileSync(join(dataDir, name));
  const before = [read(agency), read(title), read("manifest.json")];
  interrupt(dataDir, title, [absent, agency, title, "manifest.json"]);
  expect(read(title).toString()).toBe("uncommitted");
  expect(existsSync(join(dataDir, absent))).toBe(true);

  interrupt(dataDir, agency, []);
  expect(existsSync(join(dataDir, absent))).toBe(false);
  expect(read(agency)).toEqual(before[0]);
  expect(read(title).toString()).toBe("uncommitted");

  let recovered: Buffer[] = [];
  const result = await runAcquire(args, {
    dataDir,
    log: () => {},
    fetch: async () => {
      recovered = [read(agency), read(title), read("manifest.json")];
      return Response.json({
        "synthetic-topic": { name: "Synthetic topic", count: 1 },
      });
    },
  });
  expect(recovered).toEqual(before);
  expect(result.exitCode).toBe(0);
});

it("refuses an overlapping acquisition before fetching its snapshot", async () => {
  const { dataDir, args } = setup();
  let competitor: SpawnSyncReturns<string> | undefined;
  const result = await runAcquire(args, {
    dataDir,
    log: () => {},
    fetch: async () => {
      const program = `
        const [url, dir, args] = process.argv.slice(1);
        const { runAcquire } = await import(url);
        const result = await runAcquire(JSON.parse(args), {
          dataDir: dir, fetch: () => process.exit(99),
        });
        process.exitCode = result.exitCode;
      `;
      competitor = spawnSync(
        process.execPath,
        [
          "--input-type=module",
          "--eval",
          program,
          moduleUrl,
          process.platform === "win32" ? dataDir.toUpperCase() : dataDir,
          JSON.stringify(args),
        ],
        { encoding: "utf8", windowsHide: true, timeout: 10_000 },
      );
      return Response.json({
        "synthetic-topic": { name: "Synthetic topic", count: 1 },
      });
    },
  });
  expect(result.exitCode).toBe(0);
  expect(competitor?.status, competitor?.stderr).toBe(1);
  expect(competitor?.stdout).toMatch(/locked.*nothing fetched/);
});

it("refuses recovery through a replaced shard directory", async () => {
  const { dataDir, args } = setup();
  interrupt(dataDir, agency, [agency, "manifest.json"]);
  const outside = join(tempDir(), "elsewhere");
  mkdirSync(outside);
  const otherFile = join(outside, "fr-agencies.json");
  writeFileSync(otherFile, "unrelated");
  renameSync(join(dataDir, "vocab"), join(dataDir, "old-vocab"));
  symlinkSync(outside, join(dataDir, "vocab"), "junction");
  const lines: string[] = [];
  const result = await runAcquire(args, {
    dataDir,
    log: (line) => lines.push(line),
    fetch: () => {
      throw new Error("unexpected request");
    },
  });
  expect(result.exitCode).toBe(1);
  expect(lines.join(" ")).toMatch(/linked path/);
  expect(readFileSync(otherFile, "utf8")).toBe("unrelated");
});
