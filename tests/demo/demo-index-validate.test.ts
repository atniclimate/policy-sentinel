// @vitest-environment node
import { createHash } from "node:crypto";
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
  DEFAULT_PROBE_FIXTURE,
  FULL_PROBE_ENTRIES,
  PROBE_NORMALIZATION,
  hashedProbe,
  loadNationProbe,
  loadProbeNames,
  probeHashFile,
  probeHashHit,
  probeHit,
  wordingProblem,
  type NationProbe,
  type NationProbeHashFile,
} from "../../scripts/demo-index/common.mjs";
import { fullProbeNames, nationNameBases } from "../support/nation-name-probes";
import {
  RETRIEVED,
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
  it("accepts the committed index: five CFR titles, two U.S. Code titles, the two Federal Register lists, every other planned file unavailable", () => {
    const result = validateDemoIndex("docs/demo-data");
    expect(result.errors).toEqual([]);
    // Vocabulary acquired 2026-11-18 (D-180); CFR and U.S. Code 2026-11-19
    // (D-190). A later acquisition changes this list. U.S. Code titles 16 and
    // 42 stay unavailable: one fetch to redo, one title over its size ceiling.
    const manifest = JSON.parse(
      readFileSync("docs/demo-data/manifest.json", "utf8"),
    ) as { files: { path: string; status: string }[] };
    expect(
      manifest.files
        .filter((f) => f.status !== "unavailable")
        .map((f) => f.path),
    ).toEqual([
      "cfr/title-25.json",
      "cfr/title-36.json",
      "cfr/title-40.json",
      "cfr/title-43.json",
      "cfr/title-50.json",
      "usc/title-25.json",
      "usc/title-33.json",
      "vocab/fr-agencies.json",
      "vocab/fr-topics.json",
    ]);
    expect(result.fileCount).toBe(9);
    expect(result.probe.nameCount).toBeGreaterThan(0);
    // 3.5 MB of official wording goes through the Nation-name probe: about 5 seconds.
  }, 60_000);

  it("accepts a manifested CFR, U.S.C. and vocabulary file", () => {
    const result = check(all());
    expect(result.errors).toEqual([]);
    expect(result).toMatchObject({ ok: true, fileCount: 3, currentCount: 3 });
  });

  it("accepts a transferred U.S.C. section whose codification note names no U.S.C. ref (U1)", () => {
    const value = uscShard();
    value.entries[0].reclassifiedAs = {
      targets: [],
      noteText:
        "Section 450f was transferred by the Act and redesignated elsewhere.",
      noteTextOmitted: false,
    };
    const result = check([{ path: "usc/title-25.json", value }]);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
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
    // A short hash file, since the committed full one (D-175) is the default.
    const short = join(tempDir(), "short-hashes.json");
    writeFileSync(
      short,
      JSON.stringify(probeHashFile(["Example Sample Nation"], 1)),
    );
    const refused = run(dir, "--nation-hashes", short);
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
    // The committed index passes with the committed full hash file (about 5 seconds for its 3.5 MB).
    expect(run("docs/demo-data").status).toBe(0);
  }, 60_000);

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

  it("refuses a vocabulary file that carries a held-out entry (G3)", () => {
    // Regression (review of 2026-11-18). The list holds hashes of entry ids.
    const dir = tempDir();
    const file = vocabFile();
    writeIndex(dir, [{ path: "vocab/fr-agencies.json", value: file }]);
    const heldOutList = {
      fr_agency: [
        createHash("sha256").update(file.entries[0].id, "utf8").digest("hex"),
      ],
    };
    expect(validateDemoIndex(dir).errors).toEqual([]);
    expect(validateDemoIndex(dir, { heldOutList }).errors).toEqual([
      "vocab/fr-agencies.json: holds a held-out entry (G3)",
    ]);
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

  it("stamps fixture files with the real clock, so C3 never trips on the test date (C3)", () => {
    // The G3 test validates in a child process, which no fake clock reaches.
    expect(Date.now() - Date.parse(RETRIEVED)).toBeLessThan(3_600_000);
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
    // D-175: the count is the notice's stated number of Tribes, not its paragraphs.
    expect(file.entryCount).toBe(FULL_PROBE_ENTRIES);
    expect(loadProbeNames(probeFile()).entryCount).toBeGreaterThanOrEqual(
      FULL_PROBE_ENTRIES,
    );
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

  it("also probes a name printed without the state its entry ends with (G3)", () => {
    const notice = join(tempDir(), "recognition-notice.html");
    writeFileSync(
      notice,
      readFileSync(DEFAULT_PROBE_FIXTURE, "utf8").replace(
        "</body>",
        [
          '<p class="flush-paragraph flush-paragraph-1">Example Owingeh, New Mexico (previously listed as the Pueblo of Example)</p>',
          '<p class="flush-paragraph flush-paragraph-1">Sampleton Folk, Arizona, California &amp; Nevada</p>',
          "</body>",
        ].join("\n"),
      ),
    );
    const { names, entryCount } = loadProbeNames(notice);
    const hashed = {
      ...hashedProbe(probeHashFile(names, entryCount), "t"),
      names: [],
    };
    for (const text of [
      "Pub. L. 99-1 relating to Example Owingeh water rights",
      "Sampleton Folk",
    ]) {
      expect(wordingProblem(text, names), text).toBe("nation_name_probe");
      expect(probeHit(text, hashed), text).toBe(true);
    }
  });

  it("sets maxWords by the shortest listed form, not the long entry text", () => {
    const { names, entryCount } = loadProbeNames();
    const file = probeHashFile(names, entryCount);
    const words = (name: string) => name.split(/\s+/).length;
    expect(file.maxWords).toBeLessThan(Math.max(...names.map(words)));
    const probe = hashedProbe(file, "fixture");
    for (const name of names)
      expect(probeHashHit(`Report on ${name}.`, probe), name).toBe(true);
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
