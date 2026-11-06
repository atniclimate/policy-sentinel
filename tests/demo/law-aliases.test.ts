// @vitest-environment node
// The reviewed law alias table (index conditions A2, E3, F5 and G3): it
// validates strictly, every citation parses with the shared patterns, no
// string holds a Nation name or a personal pattern, and it stays within
// 128 KiB and 400 entries. It ships with no entries until the owner approves
// the reviewed list (design rule 8).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
// @ts-expect-error build script has no declaration file
import * as vocab from "../../scripts/build-vocab.mjs";
import type { LawAlias, LawAliasFile } from "../../src/demo/index-types";
import {
  nationNameBases,
  nationNameProbes,
} from "../support/nation-name-probes";

const aliasProblems = vocab.aliasProblems as (
  text: string,
  options?: { names?: readonly string[] },
) => string[];
const stringProblems = vocab.stringProblems as (
  text: string,
  names?: readonly string[],
  path?: string,
) => string[];

const ROOT = process.cwd();
const text = readFileSync(resolve(ROOT, "config/law-aliases.v1.json"), "utf8");
const table = JSON.parse(text) as LawAliasFile;
const schema = JSON.parse(
  readFileSync(resolve(ROOT, "schemas/law-aliases.schema.v1.json"), "utf8"),
) as Record<string, unknown>;
const ajv = new Ajv2020({
  strict: true,
  allErrors: false,
  removeAdditional: false,
  useDefaults: false,
  coerceTypes: false,
});
const validateTable = ajv.compile(schema);

const entry = (over: Partial<LawAlias> = {}): LawAlias => ({
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
  olrcUrl:
    "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title33-section1251&num=0&edition=prelim",
  reviewedOn: "2026-11-05",
  reviewerRole: "staff",
  ...over,
});
const withEntries = (entries: unknown[]) =>
  JSON.stringify({ ...table, entries });

describe("the committed alias table", () => {
  it("validates strictly against its schema", () => {
    expect(schema.$id).toBe(
      "https://policy-sentinel.invalid/schemas/law-aliases.schema.v1.json",
    );
    expect(validateTable(table), JSON.stringify(validateTable.errors)).toBe(
      true,
    );
  });

  it("ships with no entries until the owner approves the reviewed list", () => {
    expect(table.entries).toEqual([]);
  });

  it("passes every content check with the Nation-name probes as exact names", () => {
    expect(aliasProblems(text, { names: nationNameBases() })).toEqual([]);
  });

  it("stays within 128 KiB and 400 entries", () => {
    expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(128 * 1024);
    expect(table.entries.length).toBeLessThanOrEqual(400);
  });
});

describe("the alias checks", () => {
  it("accepts a well-formed synthetic entry", () => {
    expect(validateTable(JSON.parse(withEntries([entry()])))).toBe(true);
    expect(aliasProblems(withEntries([entry()]))).toEqual([]);
  });

  it.each([
    ["an extra field", { ...entry(), nation: "x" }],
    [
      "a reviewer outside the closed roles",
      entry({ reviewerRole: "admin" as "staff" }),
    ],
    [
      "an OLRC link on another host",
      entry({ olrcUrl: "https://example.org/x" }),
    ],
    ["markup in the name", entry({ popularName: "Sample <b>Act</b>" })],
    ["no citation", entry({ citations: [] })],
  ])("rejects %s", (_name, bad) => {
    expect(validateTable(JSON.parse(withEntries([bad])))).toBe(false);
    expect(aliasProblems(withEntries([bad])).length).toBeGreaterThan(0);
  });

  it("rejects a citation whose text does not parse as its fields say", () => {
    const [c] = entry().citations;
    const bad = entry({ citations: [{ ...c!, section: "1252" }] });
    expect(aliasProblems(withEntries([bad]))).toEqual([
      "entries[0].citations[0] does not parse as its fields say",
    ]);
  });

  it("rejects entries out of popularName order", () => {
    const problems = aliasProblems(
      withEntries([
        entry({ popularName: "B Act" }),
        entry({ popularName: "A Act" }),
      ]),
    );
    expect(problems).toContain(
      "entries[1] is out of popularName order or repeats a name",
    );
  });

  it("rejects more than 400 entries and more than 128 KiB", () => {
    const many = Array.from({ length: 401 }, (_, i) =>
      entry({ popularName: `Sample Act ${String(i).padStart(3, "0")}` }),
    );
    const problems = aliasProblems(withEntries(many));
    expect(problems.some((p) => p.startsWith("401 entries"))).toBe(true);
    expect(problems.some((p) => p.startsWith("alias table is"))).toBe(true);
  });

  it("flags a personal pattern in any string", () => {
    const bad = entry({
      popularName: "Sample Act (write to someone@example.org)",
    });
    expect(aliasProblems(withEntries([bad])).join(" ")).toMatch(
      /personal pattern/,
    );
  });

  describe("reviewed titles with a mask anchor word", () => {
    const anchorTitles = vocab.ANCHOR_WORD_TITLES as ReadonlyMap<
      string,
      readonly string[]
    >;
    const titles = [...anchorTitles.keys()];

    it("holds exactly the five owner-directed titles", () => {
      expect(titles).toEqual([
        "Community Services Block Grant Act",
        "Emergency Planning and Community Right-To-Know Act of 1986",
        "Housing and Community Development Act of 1974",
        "Indian Community Economic Enhancement Act of 2020",
        "PROGRESS for Indian Tribes Act",
      ]);
    });

    it("lets each listed title in as a popular name, probes included", () => {
      const names = nationNameBases();
      for (const popularName of titles) {
        expect(
          aliasProblems(withEntries([entry({ popularName })]), { names }),
          popularName,
        ).toEqual([]);
      }
    });

    it("still refuses the same title outside popularName", () => {
      expect(
        stringProblems(
          "Community Services Block Grant Act",
          [],
          ".entries[0].citations[0].text",
        ),
      ).toContain("Nation name shape");
      expect(stringProblems("Community Services Block Grant Act")).toContain(
        "Nation name shape",
      );
    });

    it("refuses a near variant of a listed title", () => {
      for (const popularName of [
        "Community Services Block Grant Act of 1981",
        "community services block grant act",
        "Sample Indian Community Economic Enhancement Act of 2020",
        "Example Valley PROGRESS for Indian Tribes Act",
      ])
        expect(
          aliasProblems(withEntries([entry({ popularName })])).join(" "),
          popularName,
        ).toMatch(/Nation name shape/);
    });

    it("refuses a listed title when an exact name widens its span", () => {
      expect(
        aliasProblems(
          withEntries([
            entry({ popularName: "Community Services Block Grant Act" }),
          ]),
          { names: ["Community Services"] },
        ).join(" "),
      ).toMatch(/Nation name shape/);
    });

    it("pins the spans the mask produces today, so a mask change forces a re-review", () => {
      for (const [title, spans] of anchorTitles) {
        const found = stringProblems(title, [], ".entries[0].popularName");
        expect(found, title).toEqual([]);
        expect(spans.length, title).toBeGreaterThan(0);
      }
    });
  });

  it("flags every Nation-name probe placed in a popular name", () => {
    const names = nationNameBases();
    const probes = nationNameProbes();
    expect(probes.length).toBeGreaterThan(0);
    for (const probe of probes)
      expect(stringProblems(`${probe} Settlement Act`, names), probe).toContain(
        "Nation name shape",
      );
  });
});
