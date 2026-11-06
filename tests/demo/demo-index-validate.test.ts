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
import {
  PROBE_NORMALIZATION,
  hashedProbe,
  loadNationProbe,
  loadProbeNames,
  probeHashFile,
  type NationProbe,
  type NationProbeHashFile,
} from "../../scripts/demo-index/common.mjs";
import { fullProbeNames, nationNameBases } from "../support/nation-name-probes";
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

const make = (...args: string[]) =>
  spawnSync(
    process.execPath,
    ["scripts/make-nation-probe-hashes.mjs", ...args],
    { env: { ...process.env, DEMO_NATION_NAMES: "" }, encoding: "utf8" },
  );

/** A full synthetic hash file written by the script under test. */
function hashFile(): string {
  const out = join(tempDir(), "hashes.json");
  const run = make("--nation-names", probeFile(), "--out", out);
  expect(run.status, run.stderr).toBe(0);
  expect(run.stdout).toMatch(/^wrote \d+ hashes for \d+ entries/);
  return out;
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
    // Decision 10: a full hash file replaces the plain list.
    const hashed = run(dir, "--nation-hashes", hashFile());
    expect(hashed.stdout).toMatch(/^demo index valid: 3 files present/);
    expect(hashed.stdout).toMatch(/, \d+ hashes$/m);
    expect(hashed.status).toBe(0);
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

describe("hashed Nation-name probes (decision 10)", () => {
  it("writes sorted hashes, the count and the version, never a name", () => {
    const out = hashFile();
    const text = readFileSync(out, "utf8");
    const file = JSON.parse(text) as NationProbeHashFile;
    expect(Object.keys(file)).toEqual([
      "artifactType",
      "normalization",
      "entryCount",
      "maxWords",
      "hashes",
    ]);
    expect(file.normalization).toBe(PROBE_NORMALIZATION);
    expect(file.entryCount).toBe(loadProbeNames(probeFile()).entryCount);
    expect(file.hashes.every((h) => /^[0-9a-f]{64}$/.test(h))).toBe(true);
    expect([...file.hashes].sort()).toEqual(file.hashes);
    expect(new Set(file.hashes).size).toBe(file.hashes.length);
    expect(text).not.toMatch(/synthetic|probe entity/i);
    for (const base of nationNameBases())
      expect(text.toLowerCase()).not.toContain(base.toLowerCase());
  });

  it("refuses a list inside the repository and a short list", () => {
    const inside = make(
      "--nation-names",
      "fixtures/sources/bia/recognition-structure.html",
    );
    expect(inside.status).toBe(2);
    expect(inside.stderr).toMatch(/outside the repository/);
    const out = join(tempDir(), "short.json");
    const short = make("--nation-names", probeFile(0), "--out", out);
    expect(short.status).toBe(1);
    expect(short.stderr).toMatch(/not the full list of 575; nothing written/);
    expect(() => readFileSync(out)).toThrow();
  });

  it("catches each word run after the same normalization, and nothing shorter", () => {
    const names = fullProbeNames();
    const probe = hashedProbe(probeHashFile(names, names.length), "synthetic");
    const plainOnly = { source: "no hashes", names: [] };
    const scan = (label: string, p: NationProbe = probe) => {
      const dir = tempDir();
      writeIndex(dir, withVocabLabel(label));
      return validateDemoIndex(dir, { probe: p }).errors.join("\n");
    };
    for (const label of [
      "Report of the SYNTHETIC PROBE ENTITY 007, Oregon.",
      "Example Valley Sample Council staff",
      "the example  valley sample-council",
      "Synthetic Probe Entity 574",
    ])
      expect(scan(label), label).toMatch(/Nation-name probe hit \(G3\)/);
    for (const [label, p] of [
      ["Report of the SYNTHETIC PROBE ENTITY 007", plainOnly],
      ["Synthetic Probe Entity", probe],
      ["Synthetic Probe Entity 0070", probe],
      ["Example Valley Sample", probe],
    ] as const)
      expect(scan(label, p), label).not.toMatch(/Nation-name probe hit/);
  });

  it("loads the default hash file only when present and a named one always", () => {
    const missing = join(tempDir(), "missing.json");
    expect(() => loadNationProbe({ hashPath: missing })).toThrow();
    const probe = loadNationProbe({ hashPath: hashFile() });
    expect(probe.entryCount).toBeGreaterThanOrEqual(575);
    expect(probe.names).toEqual(loadProbeNames().names);
    expect(probe.source).toMatch(/fixture \+ hashed recognition list/);
    const unsorted = JSON.parse(
      readFileSync(hashFile(), "utf8"),
    ) as NationProbeHashFile;
    unsorted.hashes.reverse();
    expect(() => hashedProbe(unsorted, "unsorted")).toThrow(/not a sorted/);
    expect(() =>
      hashedProbe({ ...unsorted, normalization: "other" }, "other"),
    ).toThrow(/not a sorted/);
  });
});
