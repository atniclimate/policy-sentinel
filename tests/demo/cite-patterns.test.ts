import { describe, expect, it } from "vitest";
import {
  findCitations,
  parseCitation,
  parseUslmHref,
  PATTERN_SET_VERSION,
  PATTERNS,
  SHORT_FORM_NOTE,
  type ParsedCitation,
} from "../../src/demo/cite-patterns";

const EN_DASH = "–";

/** Strip offsets and pattern so fixtures read as the structured fields only. */
function fields(c: ParsedCitation | null): Record<string, unknown> | null {
  if (!c) return null;
  const rest: Record<string, unknown> = { ...c };
  delete rest.start;
  delete rest.end;
  delete rest.pattern;
  return rest;
}

function one(text: string): ParsedCitation {
  const c = parseCitation(text);
  if (!c) throw new Error(`no single citation in: ${text}`);
  return c;
}

describe("pattern table", () => {
  it("is semver, starts at 1.0.0 and every pattern carries that version", () => {
    expect(PATTERN_SET_VERSION).toBe("1.0.0");
    expect(PATTERN_SET_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(PATTERNS.map((p) => p.id)).toEqual([
      "usc-section",
      "cfr-part-section",
      "pl-number",
      "stat-page",
      "fr-page",
      "us-reports-page",
      "rcw-section",
      "ors-section",
      "idaho-code-section",
      "short-form",
      "uslm-pl-href",
      "uslm-stat-href",
      "uslm-act-href",
      "uslm-usc-href",
    ]);
    for (const p of PATTERNS) {
      expect(p.version).toBe(PATTERN_SET_VERSION);
      expect(p.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });
});

describe("usc-section", () => {
  it("parses title and section", () => {
    const c = one("25 U.S.C. 5304");
    expect(fields(c)).toEqual({
      kind: "usc",
      text: "25 U.S.C. 5304",
      title: 25,
      section: "5304",
      etSeq: false,
    });
    expect(c.pattern).toEqual({ id: "usc-section", version: "1.0.0" });
  });

  it("keeps a letter l subsection in the section", () => {
    expect(fields(one("25 U.S.C. 5304(l)"))).toMatchObject({
      section: "5304(l)",
    });
  });

  it("accepts a section sign and spaced periods", () => {
    expect(fields(one("25 U.S.C. § 450f"))).toMatchObject({
      title: 25,
      section: "450f",
    });
    expect(fields(one("42 U. S. C. 4321"))).toMatchObject({
      title: 42,
      section: "4321",
    });
  });

  it("keeps et seq. as the starting section, never a range", () => {
    expect(fields(one("25 U.S.C. 450f et seq."))).toEqual({
      kind: "usc",
      text: "25 U.S.C. 450f et seq.",
      title: 25,
      section: "450f",
      etSeq: true,
    });
    expect(fields(one("16 U.S.C. 1531 et. seq."))).toMatchObject({
      section: "1531",
      etSeq: true,
    });
  });

  it("keeps section ranges as written", () => {
    expect(fields(one("25 U.S.C. 450f through 450n"))).toMatchObject({
      section: "450f through 450n",
      etSeq: false,
    });
    expect(fields(one("25 U.S.C. 450f-450n"))).toMatchObject({
      section: "450f-450n",
    });
  });

  it("splits a comma and semicolon list, each section its own citation", () => {
    const text = "25 U.S.C. 2, 9; 5 U.S.C. 301";
    const found = findCitations(text);
    expect(found.map(fields)).toEqual([
      {
        kind: "usc",
        text: "25 U.S.C. 2",
        title: 25,
        section: "2",
        etSeq: false,
      },
      { kind: "usc", text: "9", title: 25, section: "9", etSeq: false },
      {
        kind: "usc",
        text: "5 U.S.C. 301",
        title: 5,
        section: "301",
        etSeq: false,
      },
    ]);
    for (const c of found) expect(text.slice(c.start, c.end)).toBe(c.text);
  });

  it("does not take the next citation's volume as a list item", () => {
    const found = findCitations("25 U.S.C. 450f, 88 Stat. 2203");
    expect(found.map((c) => c.kind)).toEqual(["usc", "stat"]);
  });

  it("is not a citation without a section", () => {
    expect(findCitations("as set out in 25 U.S.C. and elsewhere")).toEqual([]);
    expect(parseCitation("25 U.S.C.")).toBeNull();
  });
});

describe("cfr-part-section", () => {
  it("parses a part alone", () => {
    expect(fields(one("40 CFR part 131"))).toEqual({
      kind: "cfr",
      text: "40 CFR part 131",
      title: 40,
      part: "131",
      section: null,
    });
  });

  it("parses a section with its part", () => {
    expect(fields(one("40 CFR 131.10"))).toEqual({
      kind: "cfr",
      text: "40 CFR 131.10",
      title: 40,
      part: "131",
      section: "131.10",
    });
  });

  it("accepts C.F.R. followed by a section sign", () => {
    const c = one("25 C.F.R. § 900.1");
    expect(fields(c)).toMatchObject({
      title: 25,
      part: "900",
      section: "900.1",
    });
    expect(c.pattern.id).toBe("cfr-part-section");
  });

  it("is not a citation without a part", () => {
    expect(findCitations("see 40 CFR for the rules")).toEqual([]);
    expect(parseCitation("40 CFR")).toBeNull();
  });
});

describe("pl-number", () => {
  it("parses Pub. L. with a hyphen", () => {
    expect(fields(one("Pub. L. 93-638"))).toEqual({
      kind: "pl",
      text: "Pub. L. 93-638",
      congress: 93,
      number: 638,
      section: null,
    });
  });

  it("parses Pub. L. with an en dash", () => {
    const text = `Pub. L. 93${EN_DASH}638`;
    expect(fields(one(text))).toMatchObject({
      text,
      congress: 93,
      number: 638,
    });
  });

  it("parses P. L. and Public Law", () => {
    expect(fields(one("P. L. 117-58"))).toMatchObject({
      congress: 117,
      number: 58,
    });
    expect(fields(one("Public Law 117-58"))).toMatchObject({
      congress: 117,
      number: 58,
    });
  });

  it("carries a stated section", () => {
    expect(fields(one("Pub. L. 93-638, § 102"))).toMatchObject({
      congress: 93,
      number: 638,
      section: "102",
    });
  });
});

describe("stat-page", () => {
  it("parses volume and page", () => {
    expect(fields(one("88 Stat. 2203"))).toEqual({
      kind: "stat",
      text: "88 Stat. 2203",
      volume: 88,
      page: 2203,
      pageEnd: null,
    });
  });

  it("parses a page range", () => {
    expect(fields(one("88 Stat. 2203-2217"))).toMatchObject({
      page: 2203,
      pageEnd: 2217,
    });
  });
});

describe("fr-page", () => {
  it("parses volume and page, with or without a thousands comma", () => {
    expect(fields(one("61 FR 32482"))).toEqual({
      kind: "fr",
      text: "61 FR 32482",
      volume: 61,
      page: 32482,
    });
    expect(fields(one("61 Fed. Reg. 32,482"))).toMatchObject({
      volume: 61,
      page: 32482,
    });
  });
});

describe("us-reports-page", () => {
  it("parses volume and page, with a spaced U. S.", () => {
    expect(fields(one("609 U.S. 1"))).toEqual({
      kind: "us_reports",
      text: "609 U.S. 1",
      volume: 609,
      page: 1,
    });
    expect(fields(one("609 U. S. 255"))).toMatchObject({
      volume: 609,
      page: 255,
    });
  });
});

describe("state code sections", () => {
  it("rcw-section", () => {
    const c = one("RCW 43.21C.030");
    expect(fields(c)).toEqual({
      kind: "rcw",
      text: "RCW 43.21C.030",
      section: "43.21C.030",
    });
    expect(c.pattern.id).toBe("rcw-section");
  });

  it("ors-section", () => {
    const c = one("ORS 197.015");
    expect(fields(c)).toEqual({
      kind: "ors",
      text: "ORS 197.015",
      section: "197.015",
    });
    expect(c.pattern.id).toBe("ors-section");
  });

  it("idaho-code-section, both orders", () => {
    const a = one("Idaho Code § 67-6501");
    expect(fields(a)).toEqual({
      kind: "idaho_code",
      text: "Idaho Code § 67-6501",
      section: "67-6501",
    });
    expect(a.pattern.id).toBe("idaho-code-section");
    expect(fields(one("Section 67-6501, Idaho Code"))).toEqual({
      kind: "idaho_code",
      text: "Section 67-6501, Idaho Code",
      section: "67-6501",
    });
  });

  it("chapter-only forms are not citations", () => {
    expect(findCitations("ORS chapter 197 and RCW 43.21C")).toEqual([]);
  });
});

describe("short-form", () => {
  it.each([
    ["Id.", "Id."],
    ["see id. at 5", "id."],
    ["supra note 3", "supra"],
    ["ibid.", "ibid."],
    ["as described in the Act", "the Act"],
    ["see section 4 of the Act", "section 4 of the Act"],
    ["in § 4(a)", "§ 4(a)"],
  ])("recognizes %j without resolving it", (text, span) => {
    const found = findCitations(text);
    expect(found).toHaveLength(1);
    expect(fields(found[0])).toEqual({
      kind: "short_form",
      text: span,
      note: "short form, not resolved",
    });
    expect(found[0].pattern).toEqual({ id: "short-form", version: "1.0.0" });
    expect(SHORT_FORM_NOTE).toBe("short form, not resolved");
  });

  it("does not take id from inside a word or a section sign inside a full citation", () => {
    expect(findCitations("keep the sample liquid.")).toEqual([]);
    expect(findCitations("25 U.S.C. § 450f").map((c) => c.kind)).toEqual([
      "usc",
    ]);
  });
});

describe("negatives", () => {
  it.each([
    ["a docket number", "Docket EPA-HQ-OW-2021-0602"],
    ["a phone-like number", "Call (555) 010-0199 or 555-010-0100"],
    ["a ZIP code", "ZIP 99999-0000 or 99999"],
    ["a partial CFR form", "40 CFR"],
    ["a partial U.S.C. form", "25 U.S.C."],
    ["an FR document number", "FR Doc. 2021-12345"],
  ])("%s is not a citation", (_label, text) => {
    expect(findCitations(text)).toEqual([]);
  });
});

describe("findCitations", () => {
  it("returns every citation and short form in source order with exact spans", () => {
    const text =
      "Authority: 25 U.S.C. 450f et seq.; Pub. L. 93-638, 88 Stat. 2203-2217; 61 FR 32482. Id.";
    const found = findCitations(text);
    expect(found.map((c) => c.kind)).toEqual([
      "usc",
      "pl",
      "stat",
      "fr",
      "short_form",
    ]);
    for (const c of found) {
      expect(text.slice(c.start, c.end)).toBe(c.text);
      expect(c.pattern.version).toBe(PATTERN_SET_VERSION);
    }
    expect(found.map((c) => c.start)).toEqual(
      [...found.map((c) => c.start)].sort((a, b) => a - b),
    );
  });

  it("puts no URL in any parsed output", () => {
    const text =
      "25 U.S.C. 2, 9; 40 CFR 131.10; P. L. 117-58; 609 U. S. 1; RCW 43.21C.030; ORS 197.015; Idaho Code § 67-6501; supra";
    expect(JSON.stringify(findCitations(text))).not.toMatch(/https?:|www\./);
  });
});

describe("parseUslmHref", () => {
  it("uslm-pl-href with and without a section", () => {
    expect(parseUslmHref("/us/pl/93/638")).toMatchObject({
      kind: "pl",
      congress: 93,
      number: 638,
      section: null,
      pattern: { id: "uslm-pl-href", version: "1.0.0" },
    });
    expect(parseUslmHref("/us/pl/93/638/s102")).toMatchObject({
      section: "102",
    });
  });

  it("uslm-pl-href with a title segment or subdivisions keeps them in the verbatim href", () => {
    expect(parseUslmHref("/us/pl/100/472/tI/s103")).toMatchObject({
      kind: "pl",
      congress: 100,
      number: 472,
      section: "103",
      text: "/us/pl/100/472/tI/s103",
      pattern: { id: "uslm-pl-href", version: "1.0.0" },
    });
    expect(parseUslmHref("/us/pl/101/301/s2/a/1")).toMatchObject({
      kind: "pl",
      congress: 101,
      number: 301,
      section: "2",
      text: "/us/pl/101/301/s2/a/1",
    });
    expect(parseUslmHref("/us/pl/95/561/tXI/s1103/b")).toMatchObject({
      section: "1103",
    });
    expect(parseUslmHref("/us/pl/106/568/tXIII")).toMatchObject({
      number: 568,
      section: null,
    });
    // Grammar outside the table stays unparsed and is counted, not guessed.
    for (const href of [
      "/us/pl/116/260/dA/s101",
      "/us/pl/100/472/t1/s103",
      "/us/pl/100/472/tI/tII/s103",
      "/us/pl/100/472/s103/",
      "/us/pl/100/472/a/1",
    ])
      expect(parseUslmHref(href), href).toBeNull();
  });

  it("uslm-stat-href", () => {
    expect(parseUslmHref("/us/stat/88/2203")).toMatchObject({
      kind: "stat",
      volume: 88,
      page: 2203,
      pageEnd: null,
      pattern: { id: "uslm-stat-href" },
    });
  });

  it("uslm-act-href is kept verbatim", () => {
    const href = "/us/act/1926-05-17/ch309/s1";
    expect(parseUslmHref(href)).toMatchObject({
      kind: "act",
      href,
      pattern: { id: "uslm-act-href" },
    });
    expect(parseUslmHref("/us/act/1926-05-17/ch309")).toMatchObject({
      kind: "act",
    });
  });

  it("uslm-usc-href, including an en dash in the section", () => {
    expect(parseUslmHref("/us/usc/t25/s5304")).toMatchObject({
      kind: "usc",
      title: 25,
      section: "5304",
      etSeq: false,
      pattern: { id: "uslm-usc-href" },
    });
    expect(parseUslmHref(`/us/usc/t42/s300aa${EN_DASH}1`)).toMatchObject({
      section: `300aa${EN_DASH}1`,
    });
  });

  it("returns null for other hrefs", () => {
    expect(parseUslmHref("/us/cfr/t25/s900")).toBeNull();
    expect(parseUslmHref("/us/pl/93")).toBeNull();
    expect(parseUslmHref("/us/act/1926/ch309")).toBeNull();
  });
});
