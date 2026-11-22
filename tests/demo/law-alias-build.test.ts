// @vitest-environment node
// Law alias rows from the official OLRC Popular Names table (D-142): the
// parser, the row rules, the review table and the command line. The fixture
// holds twelve entries copied byte for byte from the table.
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

// @ts-expect-error build script has no declaration file
import * as cli from "../../scripts/build-law-aliases.mjs";
// @ts-expect-error build script has no declaration file
import * as vocab from "../../scripts/build-vocab.mjs";
import {
  StageError,
  loadNationProbe,
} from "../../scripts/demo-index/common.mjs";
import {
  TABLE_URL,
  buildAliasRows,
  outcomeCounts,
  parsePopularNames,
  releasePoints,
  reviewMarkdown,
  type PopularNameEntry,
  type PopularNameLine,
} from "../../scripts/demo-index/popular-names.mjs";
import { PATTERN_SET_VERSION } from "../../src/demo/cite-patterns";
import type { LawAlias, LawAliasCitation } from "../../src/demo/index-types";
import { nationNameBases } from "../support/nation-name-probes";

const runBuildLawAliases = cli.runBuildLawAliases as (
  argv: string[],
  deps?: { log?: (line: string) => void; probe?: unknown },
) => { exitCode: number };
const aliasProblems = vocab.aliasProblems as (
  text: string,
  options?: { names?: readonly string[] },
) => string[];

const FIXTURE =
  "tests/demo/fixtures/demo-index/olrc-popular-names-trimmed.html";
const HTML = readFileSync(FIXTURE, "utf8");
const REVIEWED_ON = "2026-11-18";
const probe = loadNationProbe();
const entries = parsePopularNames(HTML);
const build = (wanted: string[], from: readonly PopularNameEntry[] = entries) =>
  buildAliasRows(from, wanted, { probe, reviewedOn: REVIEWED_ON });

const usc = (
  text: string,
  title: number,
  section: string,
  etSeq: boolean,
  note = false,
): LawAliasCitation => ({
  kind: "usc",
  text,
  basis: "curated",
  pattern: { id: "usc-section", version: PATTERN_SET_VERSION },
  title,
  section,
  etSeq,
  ...(note ? { note: true as const } : {}),
});
const row = (
  popularName: string,
  id: string,
  citations: LawAliasCitation[],
): LawAlias => ({
  popularName,
  citations,
  olrcUrl: `${TABLE_URL}#${id}`,
  reviewedOn: REVIEWED_ON,
  reviewerRole: "owner",
});

// Synthetic entries for the branches the twelve real ones do not reach.
const line = (
  type: PopularNameLine["type"],
  text: string,
): PopularNameLine => ({
  type,
  text,
  uscKey: null,
  usc: [],
});
const cite = (parenthetical?: string) =>
  line(
    "cite",
    `Pub. L. 199-1, Jan. 2, 2099,199 Stat. 1${parenthetical ? ` (${parenthetical})` : ""}`,
  );
const made = (
  name: string,
  lines: PopularNameLine[],
  id = name.replaceAll(/[^A-Za-z0-9]/g, ""),
): PopularNameEntry => ({ id, item: 1, name, lines });

const NAGPRA = "Native American Graves Protection and Repatriation Act";

describe("the trimmed table fixture", () => {
  it("holds no Nation name from the probe set", () => {
    const text = HTML.toLowerCase();
    for (const base of nationNameBases())
      expect(text).not.toContain(base.toLowerCase());
  });
});

describe("parsePopularNames", () => {
  it("reads every entry with its address, number and official name", () => {
    expect(entries.map((e) => e.name)).toEqual([
      "1950 Amendment to Public Law 38",
      "21st Century Cures Act",
      "Adult Education Act of 1966",
      "Adult Education and Family Literacy Act",
      "Antiquities Act of 1906",
      "Clean Water Act",
      "Clean Water Act of 1977",
      "Federal Water Pollution Control Act",
      "Marine Protection, Research, and Sanctuaries Act of 1972",
      "Migratory Bird Treaty Act",
      "National Historic Preservation Act",
      NAGPRA,
    ]);
    expect(entries.at(-1)).toEqual({
      id: "NativeAmericanGravesProtectionandRepatriationAct",
      item: 9195,
      name: NAGPRA,
      lines: [
        {
          type: "cite",
          text: "Pub. L. 101-601, Nov. 16, 1990,104 Stat. 3048 (25 U.S.C. 3001 et seq.)",
          uscKey: "25:3001",
          usc: [{ title: 25, section: "3001" }],
        },
        {
          type: "short-title-ref",
          text: "Short title, see 25 U.S.C. 3001 note",
          uscKey: "25:3001",
          usc: [{ title: 25, section: "3001" }],
        },
      ],
    });
  });

  it("reads each kind of line, linked or not", () => {
    const kinds = (name: string) =>
      entries.find((e) => e.name === name)?.lines.map((l) => l.type);
    expect(kinds("Antiquities Act of 1906")).toEqual(["also-known-as", "cite"]);
    expect(kinds("Clean Water Act")).toEqual(["see"]);
    expect(kinds("Adult Education Act of 1966")).toEqual(["renamed"]);
    expect(kinds("Adult Education and Family Literacy Act")).toEqual([
      "cite",
      "short-title-ref",
      "cite",
      "short-title-ref",
    ]);
    // The table prints this citation without a link; the key is still kept.
    expect(
      entries.find((e) => e.name === "Adult Education and Family Literacy Act")
        ?.lines[1],
    ).toEqual({
      type: "short-title-ref",
      text: "Short title, see 20 U.S.C. 9201 note",
      uscKey: "20:9201",
      usc: [],
    });
    expect(
      entries.find((e) => e.name === "1950 Amendment to Public Law 38")
        ?.lines[0],
    ).toMatchObject({ uscKey: null, usc: [] });
  });

  const one = (name: string, more = "") =>
    `<div id='SampleAct' class='popular-name-table-entry' release-point='199-1' item='7'>\n    <p class='popular-name'>${name}</p>${more}\n  </div>`;

  it("removes tags, decodes entities and collapses whitespace", () => {
    const [entry] = parsePopularNames(
      one(
        "Sample  Farmers&apos;\n Caf&#233; &amp; <i>Market</i> Act",
        "<p class='popular-name-information' content-type='also-known-as'>Also known as  the Sample &amp; Example Act</p>",
      ),
    );
    // Code point 233 is the accented e; this file stays plain ASCII.
    expect(entry?.name).toBe(
      `Sample Farmers' Caf${String.fromCodePoint(233)} & Market Act`,
    );
    expect(entry?.lines[0]?.text).toBe(
      "Also known as the Sample & Example Act",
    );
  });

  it.each([
    ["an entry without a name", one("  ")],
    ["an entity it does not know", one("Sample &nbsp; Act")],
    [
      "a line of a kind it does not know",
      one(
        "Sample Act",
        "<p class='popular-name-information' content-type='repealed'>Repealed</p>",
      ),
    ],
    [
      "a paragraph that is not a line",
      one("Sample Act", "<p class='popular-name-note'>Sample</p>"),
    ],
    [
      "an entry in another shape",
      "<div class='popular-name-table-entry' id='SampleAct'><p class='popular-name'>Sample Act</p></div>",
    ],
  ])("stops on %s", (_name, html) => {
    let thrown: unknown;
    try {
      parsePopularNames(html);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(StageError);
    expect((thrown as StageError).stage).toBe("normalize");
  });

  it("reports the release point the entries state", () => {
    expect(releasePoints(HTML)).toEqual(["119-142"]);
  });
});

describe("buildAliasRows", () => {
  it("takes the citation in the parentheses of a cite line", () => {
    const { rows, review } = build([NAGPRA]);
    expect(rows).toEqual([
      row(NAGPRA, "NativeAmericanGravesProtectionandRepatriationAct", [
        usc("25 U.S.C. 3001 et seq.", 25, "3001", true),
      ]),
    ]);
    expect(review).toEqual([
      {
        wanted: NAGPRA,
        outcome: "approved",
        reason: null,
        detail: null,
        officialName: NAGPRA,
        citations: ["25 U.S.C. 3001 et seq."],
        olrcUrl: `${TABLE_URL}#NativeAmericanGravesProtectionandRepatriationAct`,
        nearest: [],
      },
    ]);
  });

  it("falls back to the short-title line as a note citation", () => {
    expect(build(["National Historic Preservation Act"]).rows).toEqual([
      row(
        "National Historic Preservation Act",
        "NationalHistoricPreservationAct",
        [usc("54 U.S.C. 100101 note", 54, "100101", false, true)],
      ),
    ]);
  });

  it("keeps every cite line's citation in table order", () => {
    expect(
      build(["Adult Education and Family Literacy Act"]).rows[0]?.citations,
    ).toEqual([
      usc("20 U.S.C. 9201 et seq.", 20, "9201", true),
      usc("29 U.S.C. 3271 et seq.", 29, "3271", true),
    ]);
  });

  it("matches without case and across a trailing year, keeping the official name", () => {
    const { rows, review } = build([
      "antiquities act",
      "National Historic Preservation Act of 1966",
      NAGPRA.toUpperCase(),
    ]);
    expect(rows.map((r) => r.popularName)).toEqual([
      "Antiquities Act of 1906",
      "National Historic Preservation Act",
      NAGPRA,
    ]);
    expect(review.map((r) => r.outcome)).toEqual([
      "approved",
      "approved",
      "approved",
    ]);
  });

  it("does not match a different year", () => {
    const { rows, review } = build(["Antiquities Act of 1907"]);
    expect(rows).toEqual([]);
    expect(review[0]).toMatchObject({
      outcome: "no_row",
      reason: "no official entry by this name",
      officialName: null,
    });
  });

  it("follows a see line one hop and keeps the row's own name and address", () => {
    const { rows, review } = build(["Clean Water Act"]);
    expect(rows).toEqual([
      row("Clean Water Act", "CleanWaterAct", [
        usc("33 U.S.C. 1251 et seq.", 33, "1251", true),
      ]),
    ]);
    // The exact name wins; the other year is listed for the reviewer.
    expect(review[0]).toMatchObject({
      outcome: "approved",
      detail:
        "citations from the row it names, Federal Water Pollution Control Act",
      nearest: ["Clean Water Act of 1977"],
    });
  });

  it("stops at one hop and at a see line that names no single row", () => {
    const table = [
      made("Sample A Act", [line("see", "See Sample B Act")]),
      made("Sample B Act", [line("see", "See Sample C Act")]),
      made("Sample C Act", [cite("16 U.S.C. 1")]),
      made("Sample D Act", [line("see", "See the Sample C Act")]),
    ];
    const { rows, review } = build(
      ["Sample A Act", "Sample B Act", "Sample D Act"],
      table,
    );
    expect(rows).toEqual([
      row("Sample B Act", "SampleBAct", [usc("16 U.S.C. 1", 16, "1", false)]),
    ]);
    expect(review[0]).toMatchObject({
      outcome: "no_row",
      reason: "the row it names is itself a cross-reference",
      detail: "See Sample B Act",
    });
    expect(review[2]).toMatchObject({
      outcome: "no_row",
      reason: "the cross-reference names no single official row",
      detail: "See the Sample C Act",
    });
  });

  it("gives no row without a U.S.C. citation and says why", () => {
    const { rows, review } = build([
      "1950 Amendment to Public Law 38",
      "Adult Education Act of 1966",
    ]);
    expect(rows).toEqual([]);
    expect(review[0]).toMatchObject({
      outcome: "no_row",
      reason: "no U.S.C. citation",
      officialName: "1950 Amendment to Public Law 38",
      olrcUrl: `${TABLE_URL}#1950AmendmenttoPublicLaw38`,
      citations: [],
    });
    expect(review[1]).toMatchObject({
      outcome: "no_row",
      reason: "no U.S.C. citation",
      detail: "Renamed Adult Education Act",
    });
  });

  it("gives no row when the pattern cannot parse a printed citation", () => {
    const { rows, review } = build([
      "Marine Protection, Research, and Sanctuaries Act of 1972",
      "21st Century Cures Act",
    ]);
    expect(rows).toEqual([]);
    expect(review[0]).toMatchObject({
      outcome: "no_row",
      reason: "a citation the pattern cannot parse",
      citations: [
        "16 U.S.C. 1431 et seq., 1447 et seq.; 33 U.S.C. 1401 et seq., 2801 et seq.",
      ],
    });
    // "notes" is not the note locator the pattern reads.
    expect(review[1]).toMatchObject({
      outcome: "no_row",
      reason: "a citation the pattern cannot parse",
      citations: ["42 U.S.C. 201 notes"],
    });
  });

  it("reads a section with its own parentheses and drops repeats", () => {
    const table = [
      made("Sample Parks Act", [
        cite("16 U.S.C. 1a-2(k)(1)"),
        cite("16 U.S.C. 1a-2(k)(1)"),
        cite("54 U.S.C. 100101 note; 16 U.S.C. 1 et seq."),
      ]),
    ];
    expect(build(["Sample Parks Act"], table).rows[0]?.citations).toEqual([
      usc("16 U.S.C. 1a-2(k)(1)", 16, "1a-2(k)(1)", false),
      usc("54 U.S.C. 100101 note", 54, "100101", false, true),
      usc("16 U.S.C. 1 et seq.", 16, "1", true),
    ]);
  });

  it("gives no row for more than 8 citations or a title outside the Code", () => {
    const table = [
      made(
        "Sample Rivers Act",
        Array.from({ length: 9 }, (_, i) => cite(`16 U.S.C. ${i + 1}`)),
      ),
      made("Sample Lakes Act", [cite("99 U.S.C. 1")]),
    ];
    const { rows, review } = build(
      ["Sample Rivers Act", "Sample Lakes Act"],
      table,
    );
    expect(rows).toEqual([]);
    expect(review.map((r) => r.reason)).toEqual([
      "more than 8 citations",
      "a citation the pattern cannot parse",
    ]);
  });

  it("gives no row when several official entries match and lists them", () => {
    const table = [
      made("Sample Rivers Act of 1990", [cite("16 U.S.C. 1")]),
      made("Sample Rivers Act of 1996", [cite("16 U.S.C. 2")]),
      made("Sample Rivers and Harbors Act", [cite("16 U.S.C. 3")]),
    ];
    const { rows, review } = build(["Sample Rivers Act"], table);
    expect(rows).toEqual([]);
    expect(review[0]).toMatchObject({
      outcome: "no_row",
      reason: "several official entries match",
      nearest: [
        "Sample Rivers Act of 1990",
        "Sample Rivers Act of 1996",
        "Sample Rivers and Harbors Act",
      ],
    });
  });

  it("lists up to five official names that hold every word of an unmatched name", () => {
    expect(build(["Water Pollution Act"]).review[0]).toMatchObject({
      outcome: "no_row",
      reason: "no official entry by this name",
      nearest: ["Federal Water Pollution Control Act"],
    });
    expect(build(["Sample Unknown Act"]).review[0]?.nearest).toEqual([]);
    const many = Array.from({ length: 7 }, (_, i) =>
      made(`Sample Rivers Act Amendments of 199${i}`, [cite("16 U.S.C. 1")]),
    );
    expect(
      build(["Sample Rivers Amendments"], many).review[0]?.nearest,
    ).toHaveLength(5);
  });

  it("gives no row when two official rows share one address", () => {
    const table = [
      made("Sample Parks, Act", [cite("16 U.S.C. 1")], "SampleParksAct"),
      made("Sample Parks Act", [cite("16 U.S.C. 2")], "SampleParksAct"),
    ];
    const { rows, review } = build(["Sample Parks Act"], table);
    expect(rows).toEqual([]);
    expect(review[0]).toMatchObject({
      outcome: "no_row",
      reason: "the row address is shared by another official row",
    });
  });

  it("flags a name with the word Treaty and keeps it out of the rows", () => {
    const { rows, review } = build(["Migratory Bird Treaty Act"]);
    expect(rows).toEqual([]);
    expect(review[0]).toMatchObject({
      outcome: "flagged",
      reason: "treaty_word",
      officialName: "Migratory Bird Treaty Act",
      citations: ["16 U.S.C. 703 et seq."],
    });
  });

  it("lets in an exact official name the owner named in, and only that name", () => {
    const table = [
      made("Sample Treaties Study Act", [cite("25 U.S.C. 3")]),
      made("Sample Treaties Study Act of 2099", [cite("25 U.S.C. 4")]),
    ];
    const { rows, review } = buildAliasRows(
      table,
      table.map((e) => e.name),
      {
        probe,
        reviewedOn: REVIEWED_ON,
        namedIn: ["Sample Treaties Study Act"],
      },
    );
    expect(review.map((r) => [r.outcome, r.reason])).toEqual([
      ["named_in", "treaty_word"],
      ["flagged", "treaty_word"],
    ]);
    expect(rows.map((r) => r.popularName)).toEqual([
      "Sample Treaties Study Act",
    ]);
    // The review table never calls a named-in row approved by rule.
    expect(outcomeCounts(review)).toMatchObject({
      approved: 0,
      namedIn: { treaty_word: 1 },
      flagged: { treaty_word: 1 },
    });
    const table2 = reviewMarkdown(review);
    expect(table2).toContain(
      "| named in by the owner despite the flag: treaty_word;",
    );
    expect(table2).not.toContain("approved by rule");
  });

  it("flags what the wording check refuses, and not a person's name", () => {
    const table = [
      made("Sample Reservation Roads Act", [cite("25 U.S.C. 1")]),
      made("Dr. Sample Memorial Act", [cite("25 U.S.C. 2")]),
      made("Sample Treaties Study Act", [cite("25 U.S.C. 3")]),
      made("Robin Q. Sample, Jr. Memorial Wildlife Act", [cite("16 U.S.C. 4")]),
    ];
    const { rows, review } = build(
      table.map((e) => e.name),
      table,
    );
    expect(review.map((r) => [r.outcome, r.reason])).toEqual([
      ["flagged", "nation_name_probe"],
      ["flagged", "personal_pattern"],
      ["flagged", "treaty_word"],
      ["approved", null],
    ]);
    expect(rows.map((r) => r.popularName)).toEqual([
      "Robin Q. Sample, Jr. Memorial Wildlife Act",
    ]);
  });

  it("flags a name from the probe's own list", () => {
    const table = [made("Sample Council Housing Act", [cite("25 U.S.C. 1")])];
    expect(
      buildAliasRows(table, ["Sample Council Housing Act"], {
        probe: { ...probe, names: ["Sample Council"] },
        reviewedOn: REVIEWED_ON,
      }).review[0],
    ).toMatchObject({ outcome: "flagged", reason: "nation_name_probe" });
  });

  it("gives one row when two wanted names select one entry, sorted by name", () => {
    const { rows, review } = build([
      NAGPRA,
      "Clean Water Act",
      "Antiquities Act of 1906",
      "Antiquities Act",
    ]);
    expect(rows.map((r) => r.popularName)).toEqual([
      "Antiquities Act of 1906",
      "Clean Water Act",
      NAGPRA,
    ]);
    expect(review.map((r) => r.outcome)).toEqual(Array(4).fill("approved"));
  });
});

describe("the candidate file and the review table", () => {
  const wanted = [...entries.map((e) => e.name), "Sample Unknown Act"];
  const { rows, review } = build(wanted);
  const text = `${JSON.stringify(
    {
      $schema: "../schemas/law-aliases.schema.v1.json",
      schemaVersion: "1.0.0",
      artifactType: "law-aliases",
      basis: "curated",
      sourceUrl: TABLE_URL,
      entries: rows,
    },
    null,
    2,
  )}\n`;

  it("passes the checks the committed alias table passes", () => {
    const schema = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "schemas/law-aliases.schema.v1.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const validate = new Ajv2020({
      strict: true,
      allErrors: false,
      removeAdditional: false,
      useDefaults: false,
      coerceTypes: false,
    }).compile(schema);
    expect(validate(JSON.parse(text)), JSON.stringify(validate.errors)).toBe(
      true,
    );
    expect(aliasProblems(text, { names: nationNameBases() })).toEqual([]);
    expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(128 * 1024);
    expect(rows.length).toBeLessThanOrEqual(400);
    expect(rows.map((r) => r.popularName)).toEqual([
      "Adult Education and Family Literacy Act",
      "Antiquities Act of 1906",
      "Clean Water Act",
      "Clean Water Act of 1977",
      "Federal Water Pollution Control Act",
      "National Historic Preservation Act",
      NAGPRA,
    ]);
  });

  it("counts every wanted name once by outcome", () => {
    expect(outcomeCounts(review)).toEqual({
      approved: 7,
      namedIn: {},
      flagged: { treaty_word: 1 },
      noRow: {
        "a citation the pattern cannot parse": 2,
        "no U.S.C. citation": 2,
        "no official entry by this name": 1,
      },
    });
  });

  it("writes one table line for each wanted name", () => {
    const table = reviewMarkdown(review, "Source: sample.");
    const lines = table.split("\n");
    expect(lines.filter((l) => /^\| \d+ \|/.test(l))).toHaveLength(
      wanted.length,
    );
    expect(table).toContain("Source: sample.");
    expect(lines).toContain(
      "| # | Wanted name | Official name | Citations as printed | Official row address | Outcome |",
    );
    expect(lines).toContain(
      `| 12 | ${NAGPRA} | ${NAGPRA} | 25 U.S.C. 3001 et seq. | ${TABLE_URL}#NativeAmericanGravesProtectionandRepatriationAct | approved by rule |`,
    );
    expect(lines).toContain(
      `| 6 | Clean Water Act | Clean Water Act | 33 U.S.C. 1251 et seq. | ${TABLE_URL}#CleanWaterAct | approved by rule; citations from the row it names, Federal Water Pollution Control Act; nearest official names: Clean Water Act of 1977 |`,
    );
    expect(lines).toContain(
      `| 10 | Migratory Bird Treaty Act | Migratory Bird Treaty Act | 16 U.S.C. 703 et seq. | ${TABLE_URL}#MigratoryBirdTreatyAct | flagged: treaty_word |`,
    );
    expect(lines).toContain(
      `| 3 | Adult Education Act of 1966 | Adult Education Act of 1966 |  | ${TABLE_URL}#AdultEducationActof1966 | no row: no U.S.C. citation (Renamed Adult Education Act) |`,
    );
    expect(lines).toContain(
      "| 13 | Sample Unknown Act |  |  |  | no row: no official entry by this name |",
    );
  });

  it("keeps a table bar inside a cell", () => {
    const [first] = review;
    expect(reviewMarkdown([{ ...first!, wanted: "Sample | Act" }])).toContain(
      "| 1 | Sample \\| Act |",
    );
  });
});

describe("the command line", () => {
  const logged = () => {
    const lines: string[] = [];
    return { lines, log: (text: string) => lines.push(text) };
  };
  const scratch = () => mkdtempSync(join(tmpdir(), "ps-law-alias-build-"));

  it("needs every option and a full date", () => {
    for (const argv of [
      [],
      ["--table", FIXTURE, "--wanted", FIXTURE, "--out", "x"],
      [
        "--table",
        FIXTURE,
        "--wanted",
        FIXTURE,
        "--out",
        "x",
        "--reviewed-on",
        "2026-11",
      ],
      ["--unknown"],
    ]) {
      const { lines, log } = logged();
      expect(runBuildLawAliases(argv, { log }).exitCode).toBe(2);
      expect(lines.join("\n")).toContain(
        "usage: node scripts/build-law-aliases.mjs",
      );
    }
  });

  it("refuses an out folder inside the repository", () => {
    const out = resolve(process.cwd(), "tests", "law-alias-out-never-made");
    const { lines, log } = logged();
    const result = runBuildLawAliases(
      [
        "--table",
        FIXTURE,
        "--wanted",
        FIXTURE,
        "--out",
        out,
        "--reviewed-on",
        REVIEWED_ON,
      ],
      { log },
    );
    expect(result.exitCode).toBe(2);
    expect(lines).toEqual(["--out must be outside the repository"]);
    expect(existsSync(out)).toBe(false);
  });

  it("refuses to build without the full Nation-name list", () => {
    const dir = scratch();
    try {
      const wantedPath = join(dir, "names.txt");
      writeFileSync(wantedPath, `${NAGPRA}\n`);
      const { lines, log } = logged();
      const result = runBuildLawAliases(
        [
          "--table",
          FIXTURE,
          "--wanted",
          wantedPath,
          "--out",
          join(dir, "out"),
          "--reviewed-on",
          REVIEWED_ON,
        ],
        { log, probe: { source: "test", names: [], entryCount: 575 } },
      );
      expect(result.exitCode).toBe(2);
      expect(lines.join("\n")).toMatch(/reviewed 575-Nation inventory/);
      expect(existsSync(join(dir, "out"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("adds a name the owner named in, and an acronym only to a law that has a row", () => {
    const dir = scratch();
    try {
      const out = join(dir, "out");
      const file = (name: string, text: string) => {
        writeFileSync(join(dir, name), text);
        return join(dir, name);
      };
      const acronym = (popularName: string) => ({
        popularName,
        acronym: "NAGPRA",
        sourceUrl: "https://www.federalregister.gov/d/2099-00001",
        text: `${NAGPRA} (NAGPRA)`,
      });
      const result = runBuildLawAliases(
        [
          "--table",
          FIXTURE,
          "--wanted",
          file("names.txt", `Migratory Bird Treaty Act\n${NAGPRA}\n`),
          "--out",
          out,
          "--reviewed-on",
          REVIEWED_ON,
          "--named-in",
          file("named-in.txt", "Migratory Bird Treaty Act\r\n\n"),
          "--acronyms",
          file(
            "acronyms.json",
            JSON.stringify([acronym(NAGPRA), acronym("Sample Unknown Act")]),
          ),
        ],
        { log: () => {} },
      );
      expect(result.exitCode).toBe(0);
      expect((result as { summary?: unknown }).summary).toMatchObject({
        rows: 2,
        acronyms: { carried: 1, withoutRow: 1 },
        outcomes: { approved: 1, namedIn: { treaty_word: 1 }, flagged: {} },
      });
      const entries = JSON.parse(
        readFileSync(join(out, "law-aliases.candidate.json"), "utf8"),
      ).entries as { popularName: string; acronyms?: unknown[] }[];
      expect(entries.map((e) => [e.popularName, e.acronyms ?? null])).toEqual([
        ["Migratory Bird Treaty Act", null],
        [
          NAGPRA,
          [
            {
              acronym: "NAGPRA",
              sourceUrl: "https://www.federalregister.gov/d/2099-00001",
              text: `${NAGPRA} (NAGPRA)`,
            },
          ],
        ],
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes the wanted list, the candidate, the review table and the summary", () => {
    const dir = scratch();
    try {
      const wantedPath = join(dir, "names.txt");
      const out = join(dir, "out");
      writeFileSync(
        wantedPath,
        `Migratory Bird Treaty Act\r\n\n  ${NAGPRA}  \nClean Water Act\n${NAGPRA}\nSample Unknown Act\n`,
      );
      const { lines, log } = logged();
      const result = runBuildLawAliases(
        [
          "--table",
          FIXTURE,
          "--wanted",
          wantedPath,
          "--out",
          out,
          "--reviewed-on",
          REVIEWED_ON,
        ],
        { log },
      );
      expect(lines.join("\n")).toMatch(
        /2 rows: 2 wanted names approved by rule, 0 named in by the owner, 1 flagged, 1 with no row, of 4/,
      );
      expect(result.exitCode).toBe(0);
      expect(readFileSync(join(out, "wanted.txt"), "utf8")).toBe(
        `Clean Water Act\nMigratory Bird Treaty Act\n${NAGPRA}\nSample Unknown Act\n`,
      );
      const candidateText = readFileSync(
        join(out, "law-aliases.candidate.json"),
        "utf8",
      );
      expect(aliasProblems(candidateText)).toEqual([]);
      expect(JSON.parse(candidateText)).toEqual({
        $schema: "../schemas/law-aliases.schema.v1.json",
        schemaVersion: "1.0.0",
        artifactType: "law-aliases",
        basis: "curated",
        sourceUrl: "https://uscode.house.gov/popularnames/popularnames.html",
        entries: [
          row("Clean Water Act", "CleanWaterAct", [
            usc("33 U.S.C. 1251 et seq.", 33, "1251", true),
          ]),
          row(NAGPRA, "NativeAmericanGravesProtectionandRepatriationAct", [
            usc("25 U.S.C. 3001 et seq.", 25, "3001", true),
          ]),
        ],
      });
      expect(readFileSync(join(out, "ALIAS-REVIEW.md"), "utf8")).toContain(
        "| flagged: treaty_word |",
      );
      expect(
        JSON.parse(readFileSync(join(out, "summary.json"), "utf8")),
      ).toEqual({
        sourceUrl: "https://uscode.house.gov/popularnames/popularnames.html",
        table: {
          sha256: createHash("sha256")
            .update(readFileSync(FIXTURE))
            .digest("hex"),
          bytes: readFileSync(FIXTURE).length,
          releasePoint: "119-142",
          entryCount: 12,
        },
        reviewedOn: REVIEWED_ON,
        wanted: 4,
        rows: 2,
        acronyms: { carried: 0, withoutRow: 0 },
        candidateBytes: Buffer.byteLength(candidateText, "utf8"),
        outcomes: {
          approved: 2,
          namedIn: {},
          flagged: { treaty_word: 1 },
          noRow: { "no official entry by this name": 1 },
        },
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
