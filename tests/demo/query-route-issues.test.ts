// The query router's issue and measure readings (D-161 to D-167, design T1.2
// rule 8): names come only from entry.names and entry.label, scanned last so
// an identifier, acronym or law name keeps its own reading and a protected
// span never matches.
// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { PlanSearch } from "../../src/demo/discovery";
import type { IssueFile } from "../../src/demo/issues";
import { routeQuery } from "../../src/demo/query-route";

const search = (query: string): PlanSearch => ({
  group: "policy",
  source: "federal-register",
  query,
  auto: true,
});

const ISSUES: IssueFile = {
  $schema: "../schemas/issues.schema.v1.json",
  schemaVersion: "1.0.0",
  artifactType: "issues",
  entries: [
    {
      kind: "issue",
      id: "section-106",
      label: "Section 106 consultation",
      names: [
        {
          name: "Section 106 consultation",
          basis: "official",
          reviewedOn: "2026-11-18",
        },
      ],
      restsOn: [],
      searches: [search("section 106 consultation")],
      reviewedOn: "2026-11-18",
      reviewerRole: "owner",
    },
    {
      kind: "issue",
      id: "baaja",
      label: "BAAJA",
      names: [{ name: "BAAJA", basis: "official", reviewedOn: "2026-11-18" }],
      restsOn: [],
      searches: [search("BAAJA")],
      reviewedOn: "2026-11-18",
      reviewerRole: "owner",
    },
    {
      kind: "issue",
      id: "shared-one",
      label: "Shared One",
      names: [
        { name: "Shared Policy", basis: "official", reviewedOn: "2026-11-18" },
      ],
      restsOn: [],
      searches: [search("shared policy one")],
      reviewedOn: "2026-11-18",
      reviewerRole: "owner",
    },
    {
      kind: "issue",
      id: "shared-two",
      label: "Shared Two",
      names: [
        { name: "Shared Policy", basis: "official", reviewedOn: "2026-11-18" },
      ],
      restsOn: [],
      searches: [search("shared policy two")],
      reviewedOn: "2026-11-18",
      reviewerRole: "owner",
    },
    {
      kind: "issue",
      id: "number-only",
      label: "Number Only Test Issue",
      names: [{ name: "638", basis: "official", reviewedOn: "2026-11-18" }],
      restsOn: [],
      searches: [search("638")],
      reviewedOn: "2026-11-18",
      reviewerRole: "owner",
    },
    {
      kind: "measure",
      id: "ndaa-fy2027",
      label: "NDAA FY2027 Test Bill",
      names: [],
      identifiers: [
        {
          kind: "bill",
          id: "hr 8800 119",
          label: "H.R. 8800 (119th Congress)",
          url: "https://example.gov/hr8800",
          stated: "H.R. 8800",
          readOn: "2026-11-18",
        },
      ],
      provisions: [
        {
          issue: "section-106",
          bill: "hr 8800 119",
          version: "Introduced in House",
          section: "219",
          heading: "Section 106 test heading",
          url: "https://example.gov/hr8800/sec219",
          readOn: "2026-11-18",
          basis: "cites",
          cites: [],
          reviewedOn: "2026-11-18",
        },
      ],
      searches: [search("NDAA FY2027")],
      reviewedOn: "2026-11-18",
      reviewerRole: "owner",
    },
  ],
};

describe("query router, issue and measure names", () => {
  it("offers an entry's reading when one of its names matches", () => {
    const route = routeQuery("news on Section 106 consultation today", {
      issues: ISSUES,
    });
    const r = route.readings.find((x) => x.kind === "issue");
    expect(r).toMatchObject({
      kind: "issue",
      identifier: "Section 106 consultation",
      jurisdiction: "federal",
      action: "live_lookup",
      label: "Issue: Section 106 consultation",
    });
  });

  it("matches an all-caps name exactly and case-sensitively", () => {
    const upper = routeQuery("read about BAAJA today", { issues: ISSUES });
    expect(upper.readings.map((r) => r.identifier)).toContain("BAAJA");
    const lower = routeQuery("read about baaja today", { issues: ISSUES });
    expect(lower.readings.map((r) => r.identifier)).not.toContain("BAAJA");
  });

  it("offers both entries and chooses neither when they share a name", () => {
    const route = routeQuery("news on Shared Policy today", {
      issues: ISSUES,
    });
    const shared = route.readings.filter((r) => r.kind === "issue");
    expect(shared.map((r) => r.identifier).sort()).toEqual([
      "Shared One",
      "Shared Two",
    ]);
    expect(route.ambiguous).toBe(true);
  });

  it("does not match a name inside a masked span", () => {
    const route = routeQuery("Example Tribe of BAAJA Nation here", {
      issues: ISSUES,
    });
    expect(route.maskedSpans.length).toBeGreaterThan(0);
    expect(route.readings.map((r) => r.kind)).not.toContain("issue");
  });

  it("keeps the public law reading for Pub. L. 93-638 without an extra issue reading for 638", () => {
    const route = routeQuery("Pub. L. 93-638", { issues: ISSUES });
    expect(route.readings).toHaveLength(1);
    expect(route.readings[0]).toMatchObject({
      kind: "public_law",
      identifier: "Pub. L. 93-638",
    });
  });

  it("labels a measure's reading as a bill with its issue count, matched by its label alone", () => {
    const route = routeQuery("read the NDAA FY2027 Test Bill text", {
      issues: ISSUES,
    });
    const r = route.readings.find(
      (x) => x.kind === "issue" && x.identifier === "NDAA FY2027 Test Bill",
    );
    expect(r?.label).toBe("Bill: NDAA FY2027 Test Bill, 1 issue listed");
  });

  it("changes nothing when no issues option is passed", () => {
    const route = routeQuery("Section 106 consultation");
    expect(route.readings).toEqual([]);
    expect(route.plainWords).toBe(true);
  });
});
