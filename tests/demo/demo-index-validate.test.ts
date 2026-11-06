// @vitest-environment node
import {
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { VERBATIM_FIELDS } from "../../src/demo/index-types";
import {
  schemaVerbatimFields,
  validateDemoIndex,
} from "../../scripts/demo-index/validate.mjs";
import { nationNameBases } from "../support/nation-name-probes";
import {
  cfrShard,
  probeFile,
  removeTemps,
  tempDir,
  uscShard,
  vocabFile,
  writeIndex,
  type FixtureFile,
} from "./fixtures/demo-index/build-index";

afterEach(removeTemps);

const all = (): FixtureFile[] => [
  { path: "cfr/title-25.json", value: cfrShard() },
  { path: "usc/title-25.json", value: uscShard() },
  { path: "vocab/fr-agencies.json", value: vocabFile() },
];

function check(
  files: FixtureFile[],
  tweak?: Parameters<typeof writeIndex>[2],
  now?: Date,
) {
  const dir = tempDir();
  writeIndex(dir, files, tweak);
  return validateDemoIndex(dir, now ? { now } : {});
}

const shortestName = () =>
  nationNameBases().reduce((a, b) => (b.length < a.length ? b : a));

function withVocabLabel(label: string): FixtureFile[] {
  const file = vocabFile();
  file.entries[0].label = label;
  return [{ path: "vocab/fr-agencies.json", value: file }];
}

describe("static index validator", () => {
  it("accepts the committed manifest, with every planned file unavailable", () => {
    const result = validateDemoIndex("docs/demo-data");
    expect(result.errors).toEqual([]);
    expect(result.fileCount).toBe(0);
    expect(result.probe.nameCount).toBeGreaterThan(0);
  });

  it("accepts a manifested CFR, U.S.C. and vocabulary file", () => {
    const result = check(all());
    expect(result.errors).toEqual([]);
    expect(result).toMatchObject({ ok: true, fileCount: 3, currentCount: 3 });
  });

  it("fails the check script when index files are present without the full Nation-name list (G3)", () => {
    const dir = tempDir();
    writeIndex(dir, all());
    // npm run check passes no flag; DEMO_NATION_NAMES is unset here.
    const env = { ...process.env, DEMO_NATION_NAMES: "" };
    const run = (...args: string[]) =>
      spawnSync(
        process.execPath,
        ["scripts/validate-demo-index.mjs", "--dir", ...args],
        { env, encoding: "utf8" },
      );
    const refused = run(dir);
    expect(refused.status).toBe(1);
    expect(refused.stderr).toMatch(
      /3 index files present, but the Nation-name probes hold \d+ entries, not the full list of 575 \(G3\)/,
    );
    const full = run(dir, "--nation-names", probeFile());
    expect(full.stdout).toMatch(/^demo index valid: 3 files present/);
    expect(full.status).toBe(0);
    // Zero index files passes as before.
    expect(run("docs/demo-data").status).toBe(0);
  });

  it("marks exactly the verbatim fields in the schema (F6)", () => {
    // popularName lives in the law alias table's own schema.
    expect([...schemaVerbatimFields()].sort()).toEqual(
      VERBATIM_FIELDS.filter((f) => f !== "popularName").sort(),
    );
  });

  it("names no Nation, treaty, jurisdiction, relationship, eligibility, land or parcel field (G4)", () => {
    const schema = readFileSync("schemas/demo-index.schema.v1.json", "utf8");
    const names = [...schema.matchAll(/"([A-Za-z$]+)":/g)].map((m) => m[1]);
    for (const name of names)
      expect(name).not.toMatch(
        /nation|treaty|jurisdiction|relationship|eligib|land|parcel/i,
      );
  });

  it.each<[string, () => ReturnType<typeof check>, RegExp]>([
    [
      "an unmanifested shard",
      () =>
        check([
          {
            path: "cfr/title-25.json",
            value: cfrShard(),
            entry: {
              status: "unavailable",
              sha256: null,
              sizeBytes: null,
              entryCount: null,
              source: null,
            },
          },
        ]),
      /file not listed in the manifest/,
    ],
    [
      "a hash mismatch",
      () =>
        check([
          {
            path: "vocab/fr-agencies.json",
            value: vocabFile(),
            entry: { sha256: "f".repeat(64) },
          },
        ]),
      /hash mismatch/,
    ],
    [
      "a size mismatch",
      () =>
        check([
          {
            path: "vocab/fr-agencies.json",
            value: vocabFile(),
            entry: { sizeBytes: 9 },
          },
        ]),
      /size mismatch/,
    ],
    [
      "bytes that are not canonical",
      () => {
        const value = vocabFile();
        const pretty = Buffer.from(JSON.stringify(value, null, 2));
        return check([
          { path: "vocab/fr-agencies.json", value, bytes: pretty },
        ]);
      },
      /size mismatch|hash mismatch/,
    ],
    [
      "unsorted entries",
      () => {
        const value = vocabFile();
        value.entries.reverse();
        return check([{ path: "vocab/fr-agencies.json", value }]);
      },
      /not sorted/,
    ],
    [
      "a failed count identity (D1)",
      () => {
        const value = cfrShard();
        value.partsExpected = 4;
        return check([{ path: "cfr/title-25.json", value }]);
      },
      /count identity fails/,
    ],
    [
      "an edition that differs between manifest and shard",
      () => {
        const value = cfrShard();
        return check([{ path: "cfr/title-25.json", value }], (m) => {
          const source = m.files.find(
            (f) => f.path === "cfr/title-25.json",
          )!.source!;
          (source as { revisedAsOfText: string }).revisedAsOfText =
            "Revised as of July 1, 2025";
        });
      },
      /edition differs/,
    ],
    [
      "a pattern version that differs (H5)",
      () => {
        const value = uscShard();
        value.entries[1].credits[0].pattern.version = "0.9.0";
        return check([{ path: "usc/title-25.json", value }]);
      },
      /pattern version 0\.9\.0 differs/,
    ],
    [
      "an unavailable entry with a hash (status rules)",
      () =>
        check([], (m) => {
          m.files[0].sha256 = "a".repeat(64);
        }),
      /manifest\.json schema/,
    ],
    [
      "an email in a label (G1)",
      () => check(withVocabLabel("Write to someone@example.org")),
      /personal pattern/,
    ],
    [
      "a URL inside a shard (G2)",
      () => check(withVocabLabel("See www.example.org today")),
      /URL in shard/,
    ],
    [
      "a manifest URL off the host allowlist (G2)",
      () =>
        check([{ path: "vocab/fr-agencies.json", value: vocabFile() }], (m) => {
          m.files.find(
            (f) => f.path === "vocab/fr-agencies.json",
          )!.source!.linkTemplate = "https://example.org/{id}";
        }),
      /manifest\.json schema/,
    ],
    [
      "a Nation-name probe (G3)",
      () => check(withVocabLabel(shortestName())),
      /Nation-name probe hit/,
    ],
    [
      "a model word outside official wording (G5)",
      () =>
        check([{ path: "vocab/fr-agencies.json", value: vocabFile() }], (m) => {
          m.files.find(
            (f) => f.path === "vocab/fr-agencies.json",
          )!.source!.name = "Model output";
        }),
      /model word/,
    ],
    [
      "an entity in official wording (G6)",
      () => check(withVocabLabel("Alpha &amp; Beta")),
      /markup or entity/,
    ],
    [
      "raw XML in official wording (G6)",
      () => check(withVocabLabel("<AUTH>5 U.S.C. 301</AUTH>")),
      /schema/,
    ],
    [
      "a local path (G7)",
      () => check(withVocabLabel("C:/Users/Example/notes")),
      /prohibited content/,
    ],
    [
      "an oversize vocabulary file (E2)",
      () => {
        const value = vocabFile();
        value.entries = Array.from({ length: 3000 }, (_, i) => ({
          id: `agency-${String(i).padStart(5, "0")}`,
          label: `Synthetic agency ${"x".repeat(170)} ${i}`,
          shortLabel: null,
          parentId: null,
        }));
        return check([{ path: "vocab/fr-agencies.json", value }]);
      },
      /over 512 KiB/,
    ],
    [
      "verbatimFields that differ (F6)",
      () =>
        check([], (m) => {
          m.verbatimFields = m.verbatimFields.filter((f) => f !== "label");
        }),
      /verbatimFields differ/,
    ],
  ])("refuses %s", (_name, run, pattern) => {
    const result = run();
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(pattern);
  });

  it("refuses a listed file that is missing", () => {
    const dir = tempDir();
    writeIndex(dir, [{ path: "vocab/fr-agencies.json", value: vocabFile() }]);
    rmSync(join(dir, "vocab", "fr-agencies.json"));
    const result = validateDemoIndex(dir);
    expect(result.errors.join("\n")).toMatch(/listed as current but missing/);
  });

  it("refuses other file types, nested directories and links (A1)", () => {
    for (const make of [
      (dir: string) =>
        writeFileSync(join(dir, "cfr", "title-25.xml"), "<CFRDOC/>"),
      (dir: string) => mkdirSync(join(dir, "cfr", "deeper")),
      (dir: string) => writeFileSync(join(dir, "notes.txt"), "x"),
      (dir: string) =>
        symlinkSync(join(dir, "cfr"), join(dir, "linked"), "junction"),
    ]) {
      const dir = tempDir();
      writeIndex(dir, [{ path: "cfr/title-25.json", value: cfrShard() }]);
      make(dir);
      expect(validateDemoIndex(dir).ok).toBe(false);
    }
  });

  it("refuses a manifest that is not in canonical form (H1)", () => {
    const dir = tempDir();
    writeIndex(dir);
    const parsed = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(parsed));
    expect(validateDemoIndex(dir).errors.join("\n")).toMatch(/canonical form/);
  });

  it("reports a stale snapshot before 2027 and fails it from 2027-01-01 unless acknowledged (C3)", () => {
    const old = { retrievedAt: "2026-05-01T00:00:00Z" };
    const files = (ack: string | null): FixtureFile[] => {
      const value = vocabFile();
      return [
        {
          path: "vocab/fr-agencies.json",
          value,
          entry: { staleAcknowledgedOn: ack },
        },
      ];
    };
    const tweak = (
      m: Parameters<NonNullable<Parameters<typeof writeIndex>[2]>>[0],
    ) => {
      Object.assign(
        m.files.find((f) => f.path === "vocab/fr-agencies.json")!.source!,
        old,
      );
    };
    const before = check(files(null), tweak, new Date("2026-12-01T00:00:00Z"));
    expect(before.ok).toBe(true);
    expect(before.stale).toEqual(["vocab/fr-agencies.json"]);
    expect(before.warnings.join("\n")).toMatch(/older than 180 days/);
    const after = check(files(null), tweak, new Date("2027-03-01T00:00:00Z"));
    expect(after.errors.join("\n")).toMatch(/older than 180 days \(C3\)/);
    const acknowledged = check(
      files("2027-02-28"),
      tweak,
      new Date("2027-03-01T00:00:00Z"),
    );
    expect(acknowledged.ok).toBe(true);
  });

  it("allows official wording that holds a model word (G5 skips verbatim fields)", () => {
    expect(check(withVocabLabel("Model Codes Office")).ok).toBe(true);
  });
});
