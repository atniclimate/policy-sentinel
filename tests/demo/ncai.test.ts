// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isCongressReference } from "../../src/demo/merge";
import {
  areaPlan,
  areaSearches,
  courtLinks,
  draftPlan,
  ncaiAreas,
  namesSponsor,
  ncaiSearches,
  NO_COMMITTEE,
  FEDERAL_COURT_LINKS,
  STATE_RESEARCH_SOURCES,
} from "../../src/demo/ncai-2026";
import type { NcaiDraft } from "../../src/demo/ncai-2026";

// Synthetic drafts; the real ones ship only encrypted and are checked when sealed.
const drafts: readonly NcaiDraft[] = [
  {
    id: "PSC-26-001",
    title: "Example draft on a named rule",
    sponsor: "Example Tribe",
    status: "In order",
    committee: "Land Committee",
    subcommittee: "Water",
    topics: ['"Example Rule"', "example program"],
    bills: ["hr 1234"],
    cases: ['"Example Act"'],
    names: ["Example Tribe"],
  },
  {
    id: "PSC-26-002",
    title: "Example draft without case words",
    sponsor: "Example Organization",
    status: "In order",
    committee: "Land Committee",
    subcommittee: "Water",
    topics: ['"Example Rule"'],
  },
  {
    id: "PSC-26-003",
    title: "Example draft with no committee or topic",
    sponsor: "Example Nation",
    status: "Withdrawn",
    names: ["Example Nation"],
  },
  {
    id: "PSC-26-004",
    title: "Example draft under another committee",
    sponsor: "Example Council",
    status: "Deferred",
    committee: "Climate Committee",
    subcommittee: "Water",
    topics: ["example climate program"],
  },
  {
    id: "PSC-26-005",
    title: "Example draft with no subcommittee",
    sponsor: "Example Council",
    status: "Out of order",
    committee: "Land Committee",
    topics: ["example land program"],
  },
];

describe("NCAI draft searches", () => {
  it("offers the seven explicitly chosen research states with fixed HTTPS links", () => {
    expect(STATE_RESEARCH_SOURCES.map((state) => state.code)).toEqual([
      "WA",
      "OR",
      "ID",
      "AK",
      "CA",
      "MT",
      "NV",
    ]);
    for (const link of [
      ...FEDERAL_COURT_LINKS,
      ...STATE_RESEARCH_SOURCES.flatMap((state) => [...state.links]),
    ]) {
      const url = new URL(link.url);
      expect(url.protocol).toBe("https:");
      expect(url.username + url.password + url.search + url.hash).toBe("");
    }
  });
  it("builds policy, bill, court and sponsor searches in panel order", () => {
    expect(ncaiSearches(drafts[0])).toEqual([
      { group: "policy", source: "federal", query: '"Example Rule"' },
      { group: "policy", source: "federal", query: "example program" },
      {
        group: "legislation",
        source: "govinfo",
        query: 'collection:BILLS AND ("Example Rule")',
        label: 'Federal bills and resolutions: "Example Rule"',
        terms: '"Example Rule"',
        collection: "Federal bills and resolutions",
      },
      {
        group: "legislation",
        source: "govinfo",
        query: 'collection:PLAW AND lawtype:public AND ("Example Rule")',
        label: 'Federal public laws: "Example Rule"',
        terms: '"Example Rule"',
        collection: "Federal public laws",
      },
      {
        group: "legislation",
        source: "govinfo",
        query: "collection:BILLS AND (example program)",
        label: "Federal bills and resolutions: example program",
        terms: "example program",
        collection: "Federal bills and resolutions",
      },
      {
        group: "legislation",
        source: "govinfo",
        query: "collection:PLAW AND lawtype:public AND (example program)",
        label: "Federal public laws: example program",
        terms: "example program",
        collection: "Federal public laws",
      },
      { group: "bill", source: "congress", query: "hr 1234 119" },
      {
        group: "case",
        source: "govinfo",
        query: 'collection:USCOURTS AND ("Example Act")',
        label: 'Federal court opinions: "Example Act"',
        terms: '"Example Act"',
        collection: "Federal court opinions",
      },
      {
        group: "case",
        source: "govinfo",
        query: 'collection:USCOURTS AND circuit:9 AND ("Example Act")',
        label: 'Federal opinions in the Ninth Circuit: "Example Act"',
        terms: '"Example Act"',
        collection: "Federal opinions in the Ninth Circuit",
      },
      {
        group: "case",
        source: "govinfo",
        query: 'collection:USREPORTS AND ("Example Act")',
        label:
          'Supreme Court opinions in the United States Reports: "Example Act"',
        terms: '"Example Act"',
        collection: "Supreme Court opinions in the United States Reports",
      },
      {
        group: "sponsor",
        source: "federal",
        query: '"Example Tribe" "Example Rule"',
      },
    ]);
    expect(isCongressReference("hr 1234 119")).toBe(true);
  });

  it("falls back to the first topic for court searches, and to the bare name", () => {
    expect(
      ncaiSearches(drafts[1])
        .filter((s) => s.group === "case")
        .map((s) => s.query),
    ).toEqual([
      'collection:USCOURTS AND ("Example Rule")',
      'collection:USCOURTS AND circuit:9 AND ("Example Rule")',
      'collection:USREPORTS AND ("Example Rule")',
    ]);
    expect(ncaiSearches(drafts[2])).toEqual([
      { group: "sponsor", source: "federal", query: '"Example Nation"' },
    ]);
    expect(courtLinks(drafts[2])).toEqual([]);
  });

  it("runs the probe's automatic set on choosing a draft and keeps the rest as buttons", () => {
    const plan = draftPlan({
      ...drafts[0],
      bills: ["hr 1234", "s 5"],
      cases: ['"Example Act"', "example words"],
    });
    expect(plan.filter((s) => s.auto).map((s) => [s.group, s.query])).toEqual([
      ["policy", '"Example Rule"'],
      ["legislation", 'collection:BILLS AND ("Example Rule")'],
      [
        "legislation",
        'collection:PLAW AND lawtype:public AND ("Example Rule")',
      ],
      ["bill", "hr 1234 119"],
      ["case", 'collection:USCOURTS AND ("Example Act")'],
      ["case", 'collection:USCOURTS AND circuit:9 AND ("Example Act")'],
      ["case", 'collection:USREPORTS AND ("Example Act")'],
    ]);
    expect(plan.filter((s) => !s.auto).map((s) => [s.group, s.query])).toEqual([
      ["policy", "example program"],
      ["legislation", "collection:BILLS AND (example program)"],
      [
        "legislation",
        "collection:PLAW AND lawtype:public AND (example program)",
      ],
      ["bill", "s 5 119"],
      ["case", "collection:USCOURTS AND (example words)"],
      ["case", "collection:USCOURTS AND circuit:9 AND (example words)"],
      ["case", "collection:USREPORTS AND (example words)"],
      ["sponsor", '"Example Tribe" "Example Rule"'],
    ]);
    // Every suggested search is offered once, automatic or not.
    expect(plan).toHaveLength(ncaiSearches(drafts[0]).length + 4);
  });

  it("never runs a name search on its own", () => {
    for (const draft of drafts)
      for (const search of draftPlan(draft))
        if (search.group === "sponsor") expect(search.auto).toBe(false);
    expect(draftPlan(drafts[2])).toEqual([
      {
        group: "sponsor",
        source: "federal",
        query: '"Example Nation"',
        auto: false,
      },
    ]);
  });

  it("never runs a search holding the sponsor's name on its own", () => {
    const plan = draftPlan({
      ...drafts[0],
      topics: ["example tribe water rights", "example program"],
      cases: ["Example Tribe v. United States", "treaty fishing"],
    });
    const auto = plan.filter((s) => s.auto).map((s) => s.query);
    for (const query of auto)
      expect(query.toLowerCase()).not.toContain("tribe");
    // The next search of each group takes the automatic place.
    expect(auto).toEqual([
      "example program",
      "collection:BILLS AND (example program)",
      "collection:PLAW AND lawtype:public AND (example program)",
      "hr 1234 119",
      "collection:USCOURTS AND (treaty fishing)",
      "collection:USCOURTS AND circuit:9 AND (treaty fishing)",
      "collection:USREPORTS AND (treaty fishing)",
    ]);
    expect(namesSponsor(drafts[2], "EXAMPLE NATION v. State")).toBe(true);
    expect(namesSponsor({ ...drafts[2], names: [" "] }, "salmon")).toBe(false);
  });

  it("offers an area's searches on request only", () => {
    const area = ncaiAreas(drafts)[2];
    expect(areaPlan(area)).toEqual(
      areaSearches(area).map((search) => ({ ...search, auto: false })),
    );
  });

  it("links out to CourtListener opinions and dockets with encoded words", () => {
    expect(courtLinks(drafts[0])).toEqual([
      {
        kind: "opinions",
        words: '"Example Act"',
        url: "https://www.courtlistener.com/?q=%22Example+Act%22&type=o",
      },
      {
        kind: "dockets",
        words: '"Example Act"',
        url: "https://www.courtlistener.com/?q=%22Example+Act%22&type=r",
      },
    ]);
  });

  it("keeps both sides of an OR expression inside each court collection", () => {
    const searches = ncaiSearches({
      ...drafts[0],
      cases: ["water OR forestry"],
    }).filter((search) => search.group === "case");
    expect(searches.map((search) => search.query)).toEqual([
      "collection:USCOURTS AND (water OR forestry)",
      "collection:USCOURTS AND circuit:9 AND (water OR forestry)",
      "collection:USREPORTS AND (water OR forestry)",
    ]);
  });

  it("groups drafts by committee area with unassigned drafts last", () => {
    const areas = ncaiAreas(drafts);
    expect(areas.map((a) => [a.committee, a.label, a.drafts.length])).toEqual([
      ["Climate Committee", "Water", 1],
      ["Land Committee", "Land Committee", 1],
      ["Land Committee", "Water", 2],
      [NO_COMMITTEE, NO_COMMITTEE, 1],
    ]);
    expect(areas.map((area) => area.drafts.map((draft) => draft.id))).toEqual([
      ["PSC-26-004"],
      ["PSC-26-005"],
      ["PSC-26-001", "PSC-26-002"],
      ["PSC-26-003"],
    ]);
    // Area chips keep policy and bill searches once each; courts and names stay in the panel.
    expect(areaSearches(areas[2]).map((s) => s.query)).toEqual([
      '"Example Rule"',
      "example program",
      "hr 1234 119",
    ]);
  });
});
