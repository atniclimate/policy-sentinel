// @vitest-environment node
// scripts/build-vocab.mjs: no network, never run by build, check, demo:build
// or test, enforces the combined vocabulary ceiling (index condition E2), and
// writes the owner's review packet only outside the repository.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error build script has no declaration file
import * as vocab from "../../scripts/build-vocab.mjs";
import { probeHashFile } from "../../scripts/demo-index/common.mjs";
import type { LawAliasFile } from "../../src/demo/index-types";
import { SYNTHETIC_PROBE_NAMES } from "../support/nation-name-probes";

interface Ceiling {
  files: number;
  rawBytes: number;
  gzipBytes: number;
  problems: string[];
}
const ALIAS_PATH = vocab.ALIAS_PATH as string;
const REPO = vocab.REPO as string;
const LIMITS = vocab.LIMITS as Record<
  "vocabFileBytes" | "vocabTotalBytes" | "vocabTotalGzipBytes",
  number
>;
const vocabularyCeiling = vocab.vocabularyCeiling as (
  dir: string,
  aliasPath: string,
) => Ceiling;
const entriesDigest = vocab.entriesDigest as (entries: unknown) => string;
const reviewPacket = vocab.reviewPacket as (file: LawAliasFile) => string;
const writeReviewPacket = vocab.writeReviewPacket as (
  path: string,
  file: LawAliasFile,
) => void;
const insideRepo = vocab.insideRepo as (path: string) => boolean;

const ROOT = process.cwd();
const temps: string[] = [];
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), "ps-build-vocab-"));
  temps.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of temps.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("build-vocab boundaries", () => {
  it("is never run by the build, check, demo:build or test scripts", () => {
    const scripts = (
      JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
        scripts: Record<string, string>;
      }
    ).scripts;
    const seen = new Set<string>();
    const expand = (name: string): string => {
      if (seen.has(name)) return "";
      seen.add(name);
      const command = scripts[name] ?? "";
      const nested = [...command.matchAll(/npm run ([\w:.-]+)/g)].map((m) =>
        expand(m[1] ?? ""),
      );
      return [command, ...nested].join("\n");
    };
    for (const name of ["build", "check", "demo:build", "test"])
      expect(expand(name), name).not.toMatch(/build-vocab/);
  });

  it("makes no network call", () => {
    const source = readFileSync(
      resolve(ROOT, "scripts/build-vocab.mjs"),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|node:https?\b|node:net\b|node:dns\b|from\s+"[^"]*acquire-demo-index/,
    );
  });

  it("resolves its default paths inside the repository", () => {
    expect(resolve(REPO)).toBe(resolve(ROOT));
    expect(ALIAS_PATH).toBe(resolve(ROOT, "config/law-aliases.v1.json"));
  });
});

describe("the vocabulary ceiling", () => {
  it("counts the alias table alone when no vocabulary file exists yet", () => {
    const result = vocabularyCeiling(join(temp(), "missing"), ALIAS_PATH);
    expect(result.files).toBe(0);
    expect(result.rawBytes).toBe(readFileSync(ALIAS_PATH).length);
    expect(result.problems).toEqual([]);
  });

  it("passes small vocabulary files and ignores files that are not JSON", () => {
    const dir = temp();
    writeFileSync(join(dir, "fr-agencies.json"), '{"entries":[]}\n');
    writeFileSync(
      join(dir, "notes.txt"),
      "x".repeat(LIMITS.vocabTotalBytes + 1),
    );
    const result = vocabularyCeiling(dir, ALIAS_PATH);
    expect(result.files).toBe(1);
    expect(result.problems).toEqual([]);
  });

  it("fails one file over 512 KiB and a total over 1 MiB raw", () => {
    const dir = temp();
    const big = "a".repeat(LIMITS.vocabFileBytes + 1);
    writeFileSync(join(dir, "fr-topics.json"), big);
    writeFileSync(join(dir, "fr-agencies.json"), big);
    const problems = vocabularyCeiling(dir, ALIAS_PATH).problems;
    expect(
      problems.filter((p) => p.includes("the cap is 524288")),
    ).toHaveLength(2);
    expect(problems.some((p) => p.includes("bytes raw"))).toBe(true);
  });

  it("fails a total over 400 KB gzipped", () => {
    const dir = temp();
    // Random hex does not compress below half its size.
    let noise = "";
    for (let i = 0; noise.length < 500 * 1024; i += 1)
      noise += Math.random().toString(16).slice(2);
    writeFileSync(join(dir, "fr-topics.json"), noise.slice(0, 500 * 1024));
    writeFileSync(join(dir, "fr-agencies.json"), noise.slice(0, 500 * 1024));
    const result = vocabularyCeiling(dir, ALIAS_PATH);
    expect(result.gzipBytes).toBeGreaterThan(LIMITS.vocabTotalGzipBytes);
    expect(result.problems.some((p) => p.includes("gzipped"))).toBe(true);
  });
});

describe("the review packet", () => {
  const file = (): LawAliasFile => ({
    $schema: "../schemas/law-aliases.schema.v1.json",
    schemaVersion: "1.0.0",
    artifactType: "law-aliases",
    basis: "curated",
    sourceUrl: "https://uscode.house.gov/popularnames/popularnames.htm",
    entries: [
      {
        popularName: "Sample Water Quality Act",
        citations: [
          {
            kind: "usc",
            text: "33 U.S.C. 1251 et seq.",
            basis: "curated",
            pattern: { id: "usc-section", version: "1.0.0" },
            title: 33,
            section: "1251",
            etSeq: true,
          },
        ],
        olrcUrl: "https://uscode.house.gov/view.xhtml?req=33",
        reviewedOn: "2026-11-05",
        reviewerRole: "staff",
      },
    ],
  });

  it("lists each entry, the count and the SHA-256 of the canonical entries", () => {
    const packet = reviewPacket(file());
    expect(packet).toContain("Entries: 1");
    expect(packet).toContain(entriesDigest(file().entries));
    expect(entriesDigest(file().entries)).toMatch(/^[a-f0-9]{64}$/);
    expect(packet).toContain(
      "- Sample Water Quality Act: 33 U.S.C. 1251 et seq.",
    );
  });

  it("runs the hashed Nation-name probe over the alias table and needs the full list (G3)", () => {
    const dir = temp();
    const write = (name: string, value: unknown) => {
      writeFileSync(join(dir, name), JSON.stringify(value));
      return join(dir, name);
    };
    const full = [...SYNTHETIC_PROBE_NAMES];
    const hashes = write("full.json", probeHashFile(full, full.length));
    const short = write("short.json", probeHashFile(full.slice(0, 3), 3));
    const named = file();
    named.entries[0].popularName = "Synthetic Probe Entity 042 Water Act";
    const run = (aliases: unknown, hashFile: string) =>
      spawnSync(
        process.execPath,
        [
          "scripts/build-vocab.mjs",
          "--aliases",
          write("aliases.json", aliases),
          "--vocab-dir",
          join(dir, "missing"),
          "--nation-hashes",
          hashFile,
        ],
        { env: { ...process.env, DEMO_NATION_NAMES: "" }, encoding: "utf8" },
      );
    // Citation checks belong to aliasProblems; only the G3 lines are pinned here.
    const clean = run(file(), hashes);
    expect(clean.stdout).toMatch(/Nation-name probes: .*hashed/);
    expect(clean.stderr).not.toMatch(/G3/);
    const hit = run(named, hashes);
    expect(hit.status).toBe(1);
    expect(hit.stderr).toMatch(
      /\.entries\[0\]\.popularName: Nation-name probe hit \(G3\)/,
    );
    const partial = run(file(), short);
    expect(partial.status).toBe(1);
    expect(partial.stderr).toMatch(/not the full list of 575 \(G3\)/);
  });

  it("writes outside the repository and refuses a path inside it", () => {
    const out = join(temp(), "packet.md");
    writeReviewPacket(out, file());
    expect(readFileSync(out, "utf8")).toBe(reviewPacket(file()));
    const inside = resolve(ROOT, "docs", "packet.md");
    expect(insideRepo(inside)).toBe(true);
    expect(() => writeReviewPacket(inside, file())).toThrow(/outside/);
  });
});
