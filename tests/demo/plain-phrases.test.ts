// @vitest-environment node
// The reviewed plain-phrase table (owner decision 9, 2026-11-06): a closed
// schema, shipped with no entries, and every string clear of the D-068
// personal-pattern guard and the structural Nation-name mask, with the
// fixture's synthetic Nation-name probes as exact names and no exceptions.
// The first row also needs the full Nation-name list (G3), as the alias table does.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import {
  isFullProbe,
  loadNationProbe,
  probeHit,
} from "../../scripts/demo-index/common.mjs";
import { maskProtectedSpans } from "../../src/demo/nation-mask";
import { personalPatternHits } from "../../src/demo/personal-guard";
import type { PlainPhrase, PlainPhraseFile } from "../../src/demo/suggest";
import {
  nationNameBases,
  nationNameProbes,
} from "../support/nation-name-probes";

const ROOT = process.cwd();
const text = readFileSync(
  resolve(ROOT, "config/plain-phrases.v1.json"),
  "utf8",
);
const table = JSON.parse(text) as PlainPhraseFile;
const schema = JSON.parse(
  readFileSync(resolve(ROOT, "schemas/plain-phrases.schema.v1.json"), "utf8"),
) as Record<string, unknown>;
const validate = new Ajv2020({ strict: true, allErrors: true }).compile(schema);
const NAMES = nationNameBases();

function* strings(value: unknown, path = ""): Generator<[string, string]> {
  if (typeof value === "string") yield [path, value];
  else if (Array.isArray(value))
    for (const [i, v] of value.entries()) yield* strings(v, `${path}[${i}]`);
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      yield [`${path}.${k}#key`, k];
      yield* strings(v, `${path}.${k}`);
    }
}

/** Every key and value that hits the personal guard or any protected span. */
function contentProblems(file: unknown, names: readonly string[] = NAMES) {
  const problems: string[] = [];
  for (const [path, value] of strings(file)) {
    if (personalPatternHits(value).length)
      problems.push(`${path}: personal pattern`);
    if (maskProtectedSpans(value, { names }).spans.length)
      problems.push(`${path}: protected span`);
  }
  return problems;
}

const row = (over: Partial<PlainPhrase> = {}): PlainPhrase => ({
  phrase: "fish runs",
  termFamily: "federal_register_topic",
  term: "Sample Fisheries Topic",
  termSourceUrl: "https://www.federalregister.gov/topics/sample-fisheries",
  reviewedOn: "2099-01-01",
  reviewerRole: "owner",
  basis: "curated",
  ...over,
});
const withEntries = (entries: unknown[]) => ({ ...table, entries });

describe("the committed plain-phrase table", () => {
  it("validates strictly against its schema", () => {
    expect(schema.$id).toBe(
      "https://policy-sentinel.invalid/schemas/plain-phrases.schema.v1.json",
    );
    expect(validate(table), JSON.stringify(validate.errors)).toBe(true);
  });

  it("ships with no entries until the owner ticks each row", () => {
    expect(table.entries).toEqual([]);
  });

  it("passes the personal guard and the Nation-name mask, probes included", () => {
    expect(contentProblems(table)).toEqual([]);
  });

  it("needs the full Nation-name list before any row, and no row hits it (G3)", () => {
    if (!table.entries.length) return;
    const probe = loadNationProbe();
    expect(isFullProbe(probe)).toBe(true);
    for (const [path, value] of strings(table))
      expect(probeHit(value, probe), path).toBe(false);
  });
});

describe("the plain-phrase checks", () => {
  it.each([
    ["federal_register_topic", "https://www.federalregister.gov/topics/x"],
    ["agency", "https://www.federalregister.gov/agencies/x"],
    ["congress_subject_term", "https://www.congress.gov/x"],
    ["cfr_title_name", "https://www.ecfr.gov/current/title-99"],
  ] as const)("accepts a %s row cited on its own host", (family, url) => {
    const file = withEntries([row({ termFamily: family, termSourceUrl: url })]);
    expect(validate(file), JSON.stringify(validate.errors)).toBe(true);
    expect(contentProblems(file)).toEqual([]);
  });

  it.each([
    ["an extra field", { ...row(), law: "x" }],
    [
      "a reviewer other than the owner",
      row({ reviewerRole: "staff" as "owner" }),
    ],
    ["a basis other than curated", row({ basis: "model" as "curated" })],
    [
      "a family outside the closed list",
      row({ termFamily: "law" as "agency" }),
    ],
    ["an unofficial host", row({ termSourceUrl: "https://example.org/x" })],
    [
      "a Congress.gov term cited on the Federal Register",
      row({ termFamily: "congress_subject_term" }),
    ],
    [
      "a CFR title cited on Congress.gov",
      row({
        termFamily: "cfr_title_name",
        termSourceUrl: "https://www.congress.gov/x",
      }),
    ],
    ["markup in the term", row({ term: "Sample <b>Topic</b>" })],
    ["an empty phrase", row({ phrase: "" })],
    ["a date not in YYYY-MM-DD form", row({ reviewedOn: "2099-1-1" })],
  ])("rejects %s", (_name, bad) => {
    expect(validate(withEntries([bad]))).toBe(false);
  });

  it("flags a personal pattern in any string", () => {
    expect(
      contentProblems(
        withEntries([row({ phrase: "write someone@example.org" })]),
      ),
    ).toEqual([".entries[0].phrase: personal pattern"]);
  });

  it("flags a Nation-name shape with no exception for any title", () => {
    expect(
      contentProblems(
        withEntries([row({ term: "Community Services Block Grant Act" })]),
      ),
    ).toEqual([".entries[0].term: protected span"]);
    expect(
      contentProblems(
        withEntries([row({ phrase: "Example Sample Tribe consultation" })]),
      ),
    ).toEqual([".entries[0].phrase: protected span"]);
  });

  it("flags every Nation-name probe placed in a phrase", () => {
    const probes = nationNameProbes();
    expect(probes.length).toBeGreaterThan(0);
    for (const probe of probes)
      expect(
        contentProblems(withEntries([row({ phrase: probe })])),
        probe,
      ).toEqual([".entries[0].phrase: protected span"]);
  });
});
