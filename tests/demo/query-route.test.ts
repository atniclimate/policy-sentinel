// @vitest-environment node
// The query router (design T1.2, rules 3, 4 and 6): each identifier form gives
// its reading and one action, dashed numbers and bare bill numbers offer
// choices, jurisdiction comes only from explicit words outside masked spans,
// and law names come only from the alias table passed in.
import { describe, expect, it } from "vitest";
import {
  READING_ACTIONS,
  routeQuery,
  type ReadingKind,
  type RouteReading,
} from "../../src/demo/query-route";
import type { LawAliasFile } from "../../src/demo/index-types";
import { nationNameProbeCases } from "../support/nation-name-probes";

const only = (input: string) => {
  const route = routeQuery(input);
  expect(route.readings).toHaveLength(1);
  expect(route.ambiguous).toBe(false);
  expect(route.plainWords).toBe(false);
  return route.readings[0] as RouteReading;
};
const pick = (r: RouteReading) => ({
  kind: r.kind,
  identifier: r.identifier,
  jurisdiction: r.jurisdiction,
  action: r.action,
});

const FORBIDDEN =
  /\b(governs|applies|applicable|implements|authorizes|authorized by|under|eligible|eligibility|valid|binding|jurisdiction|good law|overrule|enacted by|supporting legislation|the law behind)\b/i;

describe("identifier forms", () => {
  it.each<[string, ReadingKind, string, RouteReading["jurisdiction"], string]>([
    [
      "EPA-HQ-OW-2021-0602",
      "docket",
      "EPA-HQ-OW-2021-0602",
      "federal",
      "live_lookup",
    ],
    [
      "docket bia-2013-0005",
      "docket",
      "BIA-2013-0005",
      "federal",
      "live_lookup",
    ],
    ["1076-AF81", "rin", "1076-AF81", "federal", "live_lookup"],
    ["RIN 1076-af81", "rin", "1076-AF81", "federal", "live_lookup"],
    ["2024-28302", "fr_document", "2024-28302", "federal", "live_lookup"],
    ["89 FR 101234", "fr_citation", "89 FR 101234", "federal", "not_covered"],
    [
      "89 Fed. Reg. 101,234",
      "fr_citation",
      "89 FR 101234",
      "federal",
      "not_covered",
    ],
    ["25 CFR 900", "cfr", "25 CFR 900", "federal", "live_lookup"],
    ["25 CFR part 900", "cfr", "25 CFR 900", "federal", "live_lookup"],
    ["40 C.F.R. § 131.10", "cfr", "40 CFR 131.10", "federal", "live_lookup"],
    ["25 U.S.C. 5321", "usc", "25 U.S.C. 5321", "federal", "static_index"],
    [
      "25 USC 450f et seq.",
      "usc",
      "25 U.S.C. 450f et seq.",
      "federal",
      "static_index",
    ],
    [
      "Pub. L. 93-638",
      "public_law",
      "Pub. L. 93-638",
      "federal",
      "not_covered",
    ],
    [
      "Pub. L. 93–638",
      "public_law",
      "Pub. L. 93-638",
      "federal",
      "not_covered",
    ],
    ["P.L. 117-58", "public_law", "Pub. L. 117-58", "federal", "not_covered"],
    ["PL 93-638", "public_law", "Pub. L. 93-638", "federal", "not_covered"],
    ["117-58", "public_law", "Pub. L. 117-58", "federal", "not_covered"],
    ["88 Stat. 2203", "statute", "88 Stat. 2203", "federal", "not_covered"],
    ["609 U.S. 142", "us_reports", "609 U.S. 142", "federal", "live_lookup"],
    ["609 US 142", "us_reports", "609 U.S. 142", "federal", "live_lookup"],
    [
      "H.R. 1234, 118th Congress",
      "federal_bill",
      "hr 1234 118",
      "federal",
      "live_lookup",
    ],
    ["S. 99 119", "federal_bill", "s 99 119", "federal", "live_lookup"],
    ["hr 1234 119", "federal_bill", "hr 1234 119", "federal", "live_lookup"],
    [
      "118th Congress H.R. 1234",
      "federal_bill",
      "hr 1234 118",
      "federal",
      "live_lookup",
    ],
    [
      "S.J.Res. 12 118",
      "federal_bill",
      "sjres 12 118",
      "federal",
      "live_lookup",
    ],
    ["H.R. 1234", "federal_bill", "hr 1234", "federal", "not_covered"],
    ["Washington HB 1100", "state_bill", "HB 1100", "WA", "live_lookup"],
    ["WA HB 1100", "state_bill", "HB 1100", "WA", "live_lookup"],
    ["HB 1100 (WA)", "state_bill", "HB 1100", "WA", "live_lookup"],
    [
      "Washington SB 5100 2023-24",
      "state_bill",
      "SB 5100 2023-24",
      "WA",
      "live_lookup",
    ],
    [
      "Washington House Bill 1100",
      "state_bill",
      "HB 1100",
      "WA",
      "live_lookup",
    ],
    ["Oregon HB 2001", "state_bill", "HB 2001", "OR", "link_out"],
    ["OR SB 99", "state_bill", "SB 99", "OR", "link_out"],
    ["Idaho H0123", "state_bill", "H0123", "ID", "link_out"],
    ["Idaho S 1001", "state_bill", "S1001", "ID", "link_out"],
    ["RCW 43.376.020", "state_code", "RCW 43.376.020", "WA", "link_out"],
    ["rcw 43.376", "state_code", "RCW 43.376", "WA", "link_out"],
    ["chapter 43.376 RCW", "state_code", "RCW 43.376", "WA", "link_out"],
    ["WAC 173-201A-020", "state_code", "WAC 173-201A-020", "WA", "link_out"],
    ["ORS 196.800", "state_code", "ORS 196.800", "OR", "link_out"],
    ["OAR 340-041-0002", "state_code", "OAR 340-041-0002", "OR", "link_out"],
    [
      "Idaho Code § 67-4001",
      "state_code",
      "Idaho Code 67-4001",
      "ID",
      "link_out",
    ],
    ["IDAPA 58.01.02", "state_code", "IDAPA 58.01.02", "ID", "link_out"],
    // No Supreme Court lookup exists: USCOURTS has no Supreme Court packages.
    [
      "Supreme Court 23-1234",
      "court_docket",
      "23-1234",
      "federal",
      "not_covered",
    ],
    ["ca9 21-35000", "court_docket", "21-35000", "federal", "live_lookup"],
    [
      "Ninth Circuit No. 21-35000",
      "court_docket",
      "21-35000",
      "federal",
      "live_lookup",
    ],
    ["9th Cir. 21-35000", "court_docket", "21-35000", "federal", "live_lookup"],
    ["2:21-cv-01234", "court_docket", "2:21-cv-01234", null, "not_covered"],
  ])("reads %s as %s", (input, kind, identifier, jurisdiction, action) => {
    expect(pick(only(input))).toEqual({
      kind,
      identifier,
      jurisdiction,
      action,
    });
  });

  it.each<[string, ReadingKind, string]>([
    ["25 cfr part 900", "cfr", "25 CFR 900"],
    ["25 usc 5321", "usc", "25 U.S.C. 5321"],
    ["25 u.s.c. 450f et seq.", "usc", "25 U.S.C. 450f et seq."],
    ["89 fr 101234", "fr_citation", "89 FR 101234"],
    ["pub. l. 93-638", "public_law", "Pub. L. 93-638"],
    ["public law 117-58", "public_law", "Pub. L. 117-58"],
    ["88 stat. 2203", "statute", "88 Stat. 2203"],
    ["609 u.s. 142", "us_reports", "609 U.S. 142"],
    ["ors 196.800", "state_code", "ORS 196.800"],
    ["idaho code 67-4001", "state_code", "Idaho Code 67-4001"],
  ])("reads lower-case %s", (input, kind, identifier) => {
    expect(only(input)).toMatchObject({ kind, identifier });
  });

  it("does not read the year and number inside a docket as a Federal Register document", () => {
    const kinds = routeQuery("EPA-HQ-OW-2021-0602").readings.map((r) => r.kind);
    expect(kinds).toEqual(["docket"]);
  });

  it("names the court in the label of a court docket", () => {
    expect(only("ca9 21-35000").label).toBe("Ninth Circuit docket 21-35000");
    expect(only("Supreme Court 23-1234").label).toBe(
      "Supreme Court docket 23-1234",
    );
  });

  it("keeps a reading for each identifier in a mixed query, in order", () => {
    const route = routeQuery("Pub. L. 93-638 and 25 U.S.C. 5301");
    expect(route.readings.map((r) => r.kind)).toEqual(["public_law", "usc"]);
    expect(route.ambiguous).toBe(true);
  });

  it("finds a citation inside plain words and makes it the default suggestion", () => {
    const route = routeQuery("tribal consultation 25 CFR 900");
    expect(route.plainWords).toBe(false);
    expect(route.readings[0]?.identifier).toBe("25 CFR 900");
  });
});

describe("dashed numbers", () => {
  it("offers every court reading of a bare docket number, nothing chosen", () => {
    const route = routeQuery("23-1234");
    expect(route.ambiguous).toBe(true);
    expect(route.readings.map((r) => r.label)).toEqual([
      "Supreme Court docket 23-1234",
      "Court of appeals docket 23-1234, court not named",
    ]);
  });

  it("offers the public law reading beside the court readings of 93-638", () => {
    const route = routeQuery("93-638");
    expect(route.ambiguous).toBe(true);
    expect(route.readings.map((r) => r.kind)).toEqual([
      "public_law",
      "court_docket",
      "court_docket",
    ]);
  });

  it("chooses the named court only", () => {
    const route = routeQuery("No. 23-1234 Supreme Court");
    expect(route.readings).toHaveLength(1);
    expect(route.ambiguous).toBe(false);
  });

  it("gives a state supreme court docket no federal reading", () => {
    const r = only("Washington Supreme Court 23-1234");
    expect(pick(r)).toEqual({
      kind: "court_docket",
      identifier: "23-1234",
      jurisdiction: "WA",
      action: "not_covered",
    });
  });
});

describe("bare bill numbers", () => {
  const states = (input: string) =>
    routeQuery(input).readings.map((r) => r.jurisdiction);

  it.each([
    ["HB 1100", ["WA"]],
    ["HB 2100", ["WA", "OR"]],
    ["HB 500", ["ID"]],
    ["SB 5000", ["WA"]],
    ["SB 1001", ["OR", "ID"]],
    ["S 1001", ["ID", "federal"]],
    ["H0123", ["ID"]],
    ["House Bill 2500", ["WA", "OR"]],
  ])("offers %s as choices only (%j)", (input, expected) => {
    expect(states(input)).toEqual(expected);
    expect(routeQuery(input).ambiguous).toBe(true);
  });

  it("gives no reading for a number outside every range for its form", () => {
    const route = routeQuery("HB 9999");
    expect(route.readings).toEqual([]);
    expect(route.plainWords).toBe(true);
  });

  it("gives no reading when the named state's range does not fit", () => {
    expect(routeQuery("Oregon HB 1100").readings).toEqual([]);
    expect(routeQuery("Washington SB 99").readings).toEqual([]);
  });

  it("chooses Congress for a Senate number with a Congress number", () => {
    expect(pick(only("S 1001 119"))).toEqual({
      kind: "federal_bill",
      identifier: "s 1001 119",
      jurisdiction: "federal",
      action: "live_lookup",
    });
  });

  it("drops a biennium that is not a Washington biennium", () => {
    expect(only("Washington HB 1100 2024-25").identifier).toBe("HB 1100");
  });
});

describe("jurisdiction only from explicit evidence", () => {
  it.each([
    "or HB 2100",
    "HB 2100 or",
    "id HB 500 wa",
    "Washington, D.C. HB 1100",
  ])("%s chooses no state", (input) => {
    expect(routeQuery(input).ambiguous).toBe(true);
  });

  it("counts an upper-case postal code only next to the bill", () => {
    expect(
      routeQuery("OR HB 2100").readings.map((r) => r.jurisdiction),
    ).toEqual(["OR"]);
    expect(routeQuery("OR notes on HB 2100").ambiguous).toBe(true);
  });

  it("counts a state name written out anywhere outside a masked span", () => {
    expect(only("HB 2100 from the Oregon session").jurisdiction).toBe("OR");
  });

  it("takes no state from a masked organization name or case caption", () => {
    for (const input of [
      "Sample Washington Tribes HB 2100",
      "Example Band of Oregon Indians HB 2100",
      "Example v. Washington HB 2100",
    ]) {
      const route = routeQuery(input);
      expect(route.maskedSpans.length).toBeGreaterThan(0);
      expect(route.ambiguous).toBe(true);
    }
  });

  it("takes no state from a Nation-name probe", () => {
    const stateWord = /\b(washington|oregon|idaho)\b/i;
    let checked = 0;
    for (const probe of nationNameProbeCases()) {
      const text = `${probe.text} HB 2100`;
      const outside =
        text.slice(0, probe.nameStart) + text.slice(probe.nameEnd);
      if (stateWord.test(outside)) continue;
      const route = routeQuery(text);
      checked += 1;
      expect(route.ambiguous, text).toBe(true);
      expect(route.readings.map((r) => r.jurisdiction)).toEqual(["WA", "OR"]);
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe("law names and plain words", () => {
  const aliases: LawAliasFile = {
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
            text: "99 U.S.C. 100 et seq.",
            basis: "curated",
            pattern: { id: "usc-section", version: "1.0.0" },
            title: 99,
            section: "100",
            etSeq: true,
          },
        ],
        olrcUrl: "https://uscode.house.gov/view.xhtml?req=99",
        reviewedOn: "2026-11-05",
        reviewerRole: "staff",
      },
    ],
  };

  it("reads a law name only from the table passed in", () => {
    expect(routeQuery("sample water quality act").plainWords).toBe(true);
    const r = routeQuery("the sample water quality act", { aliases })
      .readings[0];
    expect(r).toMatchObject({
      kind: "law_name",
      identifier: "Sample Water Quality Act",
      jurisdiction: "federal",
      action: "static_index",
      label: "Sample Water Quality Act, 99 U.S.C. 100 et seq.",
    });
  });

  it.each([
    "salmon habitat consultation",
    "tribal broadband grants 2025",
    "2025-26",
    "",
    "   ",
  ])("treats %j as plain words", (input) => {
    const route = routeQuery(input);
    expect(route.readings).toEqual([]);
    expect(route.plainWords).toBe(true);
    expect(route.ambiguous).toBe(false);
  });

  it("keeps the input as given", () => {
    expect(routeQuery("  25 CFR 900 ").input).toBe("  25 CFR 900 ");
  });
});

describe("the action table", () => {
  it("documents an action for every reading kind", () => {
    expect(Object.keys(READING_ACTIONS).sort()).toEqual(
      [
        "cfr",
        "court_docket",
        "docket",
        "federal_bill",
        "fr_citation",
        "fr_document",
        "law_name",
        "public_law",
        "rin",
        "state_bill",
        "state_code",
        "statute",
        "us_reports",
        "usc",
      ].sort(),
    );
  });

  it("writes no label with a design rule 2 word", () => {
    for (const input of [
      "EPA-HQ-OW-2021-0602 1076-AF81 2024-28302 89 FR 101234 25 CFR 900",
      "25 USC 450f et seq. Pub. L. 93-638 88 Stat. 2203 609 U.S. 142",
      "H.R. 1234 hr 12 118 HB 2100 S 1001 RCW 43.376.020 WAC 173-201A-020",
      "ORS 196.800 OAR 340-041-0002 Idaho Code 67-4001 IDAPA 58.01.02",
      "23-1234 ca9 21-35000 2:21-cv-01234",
    ]) {
      for (const r of routeQuery(input).readings)
        expect(r.label).not.toMatch(FORBIDDEN);
    }
  });
});
