// @vitest-environment node
// Issues come up from identifiers results state, never from words (D-164).
import { describe, expect, it } from "vitest";
import {
  issuesInResults,
  issuesInText,
  issuesSharedByRows,
} from "../../src/demo/issue-match";
import type { ChainLink } from "../../src/demo/links";
import type {
  IssueFile,
  IssueIdentifier,
  IssueIdentifier as Identifier,
} from "../../src/demo/issues";
import type { DemoCitation } from "../../src/demo/types";

function identifier(kind: Identifier["kind"], id: string): IssueIdentifier {
  return {
    kind,
    id,
    label: id,
    url: "https://example.gov/read",
    stated: id,
    readOn: "2026-11-18",
  };
}

const TABLE: IssueFile = {
  $schema: "../schemas/issues.schema.v1.json",
  schemaVersion: "1.0.0",
  artifactType: "issues",
  entries: [
    {
      kind: "issue",
      id: "section-106",
      label: "Section 106",
      names: [],
      searches: [],
      reviewedOn: "2026-11-18",
      reviewerRole: "owner",
      restsOn: [
        identifier("cfr", "36 CFR 800"),
        identifier("usc", "54 U.S.C. 306108"),
      ],
    },
    {
      kind: "issue",
      id: "forest-planning-rule",
      label: "Forest planning rule",
      names: [],
      searches: [],
      reviewedOn: "2026-11-18",
      reviewerRole: "owner",
      restsOn: [
        identifier("docket", "FS-2025-0001"),
        identifier("rin", "0596-AD66"),
        identifier("fr_document", "2026-16965"),
      ],
    },
    {
      kind: "measure",
      id: "ndaa-fy2027",
      label: "NDAA FY2027",
      names: [],
      searches: [],
      reviewedOn: "2026-11-18",
      reviewerRole: "owner",
      identifiers: [identifier("bill", "s 5653 119")],
      provisions: [],
    },
  ],
};

function citation(overrides: Partial<DemoCitation> = {}): DemoCitation {
  return {
    sourceId: "federal-register",
    identifier: "FR Doc. 2026-16965",
    title: "A rule",
    issuingBody: "Forest Service",
    kind: "RULE",
    date: "2026-01-01",
    officialUrl: "https://example.gov/doc",
    textUrl: null,
    retrievedAt: "2026-01-01T00:00:00.000Z",
    summary: null,
    textAvailable: false,
    matchKey: null,
    ...overrides,
  };
}

function row(
  target: ChainLink["target"],
  overrides: Partial<ChainLink> = {},
): ChainLink {
  return {
    kind: "link",
    section: "inText",
    basis: "citation_in_text",
    labelId: "citation_in_text",
    direction: "forward",
    label: "Cites",
    quote: null,
    sourceWording: null,
    locator: "para 1",
    notice: null,
    sourceName: "Federal Register",
    asOfLabel: "published",
    asOfText: "2026-01-01",
    asOfField: null,
    retrievedAt: "2026-01-01T00:00:00.000Z",
    stale: false,
    liveUrl: null,
    family: "laws_and_bills",
    target,
    targetText: "",
    ...overrides,
  };
}

describe("issuesInResults", () => {
  it("brings up an issue a result's cfrRefs state", () => {
    const c = citation({ cfrRefs: [{ title: 36, part: "800" }] });
    const found = issuesInResults(TABLE, [c]);
    expect(found).toHaveLength(1);
    expect(found[0].entry.id).toBe("section-106");
    expect(found[0].matches).toEqual([
      { identifier: identifier("cfr", "36 CFR 800"), count: 1 },
    ]);
  });

  it("brings up nothing for a title match with no stated identifier", () => {
    const c = citation({
      title: "Historic Preservation notice",
      summary: "Discusses 36 CFR 800 in prose only",
      topics: ["Historic preservation"],
    });
    expect(issuesInResults(TABLE, [c])).toEqual([]);
  });

  it("matches a docket id", () => {
    const c = citation({ docketIds: ["FS-2025-0001"] });
    const found = issuesInResults(TABLE, [c]);
    expect(found).toHaveLength(1);
    expect(found[0].entry.id).toBe("forest-planning-rule");
    expect(found[0].matches).toEqual([
      { identifier: identifier("docket", "FS-2025-0001"), count: 1 },
    ]);
  });

  it("matches a RIN", () => {
    const c = citation({ rins: ["0596-AD66"] });
    const found = issuesInResults(TABLE, [c]);
    expect(found).toHaveLength(1);
    expect(found[0].matches).toEqual([
      { identifier: identifier("rin", "0596-AD66"), count: 1 },
    ]);
  });

  it("matches the Federal Register document number by matchKey", () => {
    const c = citation({ matchKey: "fr:2026-16965" });
    const found = issuesInResults(TABLE, [c]);
    expect(found[0].entry.id).toBe("forest-planning-rule");
    expect(found[0].matches).toEqual([
      { identifier: identifier("fr_document", "2026-16965"), count: 1 },
    ]);
  });

  it("matches a GovInfo BILLS package and a Congress.gov bill to the same measure", () => {
    const govinfo = citation({
      sourceId: "govinfo",
      identifier: "BILLS-119s5653is",
    });
    const congress = citation({
      sourceId: "congress",
      identifier: "S 5653, 119th Congress",
    });
    const found = issuesInResults(TABLE, [govinfo, congress]);
    expect(found).toHaveLength(1);
    expect(found[0].entry.id).toBe("ndaa-fy2027");
    expect(found[0].matches).toEqual([
      { identifier: identifier("bill", "s 5653 119"), count: 2 },
    ]);
  });

  it("counts every result that states the identifier", () => {
    const a = citation({ docketIds: ["FS-2025-0001"] });
    const b = citation({ docketIds: ["FS-2025-0001"] });
    const found = issuesInResults(TABLE, [a, b]);
    expect(found[0].matches[0].count).toBe(2);
  });
});

describe("issuesSharedByRows", () => {
  const stated = citation({ cfrRefs: [{ title: 36, part: "800" }] });
  const listed = (name?: true) => ({
    citation: stated,
    alternates: [],
    reasons: [name ? { name } : {}],
  });

  it("counts a document two sources list as one result", () => {
    const { hits } = issuesSharedByRows(TABLE, [
      { citation: stated, alternates: [stated], reasons: [{}] },
    ]);
    expect(hits.map((h) => [h.entry.id, h.matches[0].count])).toEqual([
      ["section-106", 1],
    ]);
  });

  // Safeguard 1 (review B1): a sponsor-name search links nothing to an issue.
  it("leaves out a row only a name search listed, and says when a name search also listed one", () => {
    expect(issuesSharedByRows(TABLE, [listed(true)])).toEqual({
      hits: [],
      named: false,
    });
    const mixed = {
      citation: stated,
      alternates: [],
      reasons: [{}, { name: true as const }],
    };
    const both = issuesSharedByRows(TABLE, [mixed]);
    expect(both.hits.map((h) => h.entry.id)).toEqual(["section-106"]);
    expect(both.named).toBe(true);
  });

  it("does not repeat the entry being run", () => {
    expect(issuesSharedByRows(TABLE, [listed()], "Section 106").hits).toEqual(
      [],
    );
  });
});

describe("issuesInText", () => {
  it("matches a U.S.C. citation on title and base section", () => {
    const r = row({
      sourceId: "usc-index",
      identifier: "/us/usc/t54/s306108",
    });
    const found = issuesInText(TABLE, [r]);
    expect(found).toHaveLength(1);
    expect(found[0].entry.id).toBe("section-106");
    expect(found[0].matches).toEqual([
      { identifier: identifier("usc", "54 U.S.C. 306108"), count: 1 },
    ]);
  });

  it("matches only the starting section for an et seq. citation, never an expanded range", () => {
    // targetOf keeps the starting section as the target identity even when
    // the parsed citation read "et seq."; nothing here expands it.
    const r = row({
      sourceId: "usc-index",
      identifier: "/us/usc/t54/s306108",
    });
    const found = issuesInText(TABLE, [r]);
    expect(found[0].matches[0].count).toBe(1);
  });

  it("matches a CFR citation on its part", () => {
    const r = row({
      sourceId: "cfr-index",
      identifier: "36 CFR part 800",
    });
    const found = issuesInText(TABLE, [r]);
    expect(found[0].entry.id).toBe("section-106");
    expect(found[0].matches).toEqual([
      { identifier: identifier("cfr", "36 CFR 800"), count: 1 },
    ]);
  });

  it("brings up nothing for a non citation_in_text link", () => {
    const r = row(
      { sourceId: "usc-index", identifier: "/us/usc/t54/s306108" },
      { basis: "source_field" },
    );
    expect(issuesInText(TABLE, [r])).toEqual([]);
  });

  it("counts grouped places, not just rows", () => {
    const r = row(
      { sourceId: "cfr-index", identifier: "36 CFR part 800" },
      { places: 3 },
    );
    const found = issuesInText(TABLE, [r]);
    expect(found[0].matches[0].count).toBe(3);
  });
});
