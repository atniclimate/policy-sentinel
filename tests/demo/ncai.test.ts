// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isCongressReference } from "../../src/demo/merge";
import {
  areaSearches,
  courtLinks,
  ncaiAreas,
  ncaiSearches,
  NO_COMMITTEE,
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
];

describe("NCAI draft searches", () => {
  it("builds policy, bill, court and sponsor searches in panel order", () => {
    expect(ncaiSearches(drafts[0])).toEqual([
      { group: "policy", source: "federal", query: '"Example Rule"' },
      { group: "policy", source: "federal", query: "example program" },
      { group: "bill", source: "congress", query: "hr 1234 119" },
      {
        group: "case",
        source: "govinfo",
        query: 'collection:USCOURTS AND "Example Act"',
      },
      {
        group: "case",
        source: "govinfo",
        query: 'collection:USREPORTS AND "Example Act"',
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
      'collection:USCOURTS AND "Example Rule"',
      'collection:USREPORTS AND "Example Rule"',
    ]);
    expect(ncaiSearches(drafts[2])).toEqual([
      { group: "sponsor", source: "federal", query: '"Example Nation"' },
    ]);
    expect(courtLinks(drafts[2])).toEqual([]);
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

  it("groups drafts by committee area with unassigned drafts last", () => {
    const areas = ncaiAreas(drafts);
    expect(areas.map((a) => [a.committee, a.label, a.drafts.length])).toEqual([
      ["Land Committee", "Water", 2],
      [NO_COMMITTEE, NO_COMMITTEE, 1],
    ]);
    // Area chips keep policy and bill searches once each; courts and names stay in the panel.
    expect(areaSearches(areas[0]).map((s) => s.query)).toEqual([
      '"Example Rule"',
      "example program",
      "hr 1234 119",
    ]);
  });
});
