// @vitest-environment node
// D-186b, the owner ruling of 2026-11-19: a typed Tribe-shaped name is worded
// as a name search, with nothing else about the plan changed, no row it alone
// lists counted toward a shared issue, and no state or jurisdiction set from
// a state word the mask folds into the name.
import { describe, expect, it } from "vitest";
import {
  buildPlan,
  mergeLanes,
  settleLane,
  startLane,
  typedPlan,
} from "../../src/demo/discovery";
import type { Plan, PlanSources } from "../../src/demo/discovery";
import { issuesSharedByRows } from "../../src/demo/issue-match";
import type { IssueFile, IssueIdentifier } from "../../src/demo/issues";
import { routeQuery } from "../../src/demo/query-route";
import type { DemoCitation, DemoSearchResponse } from "../../src/demo/types";
import { listing } from "./fixtures";

const SOURCES: PlanSources = {
  federal: ["federal-register", "govinfo"],
  live: ["federal-register", "govinfo"],
};

// Synthetic: a clearly made-up name, not a real Tribe or organization.
const NAME_QUERY = "Example River Nation";
const PLAIN_QUERY = "example river water";

function response(
  source: string,
  query: string,
  results: readonly DemoCitation[],
): DemoSearchResponse {
  return {
    ok: true,
    source,
    query,
    total: results.length,
    page: 1,
    results,
    retrievedAt: "2099-01-07T12:00:00.000Z",
    criteria: {
      version: 1,
      source,
      query,
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
      sort: "relevance",
      resultLevel: null,
      historical: null,
      cursor: null,
    },
    continuation: { kind: "stopped", reason: "complete" },
  };
}

/** Each lane's listings merged, as the page would settle them. */
function rowsOf(plan: Plan, citations: readonly DemoCitation[]) {
  const searches = plan.lanes.map((lane, i) =>
    settleLane(
      startLane(lane),
      response(lane.sourceId, lane.query, [citations[i]]),
    ),
  );
  return mergeLanes(plan, searches).rows;
}

describe("a typed Tribe-shaped name (D-186b)", () => {
  it("carries name: true on every text lane, with the query sent exactly as typed", () => {
    const plan = typedPlan(NAME_QUERY, "federal", SOURCES);
    expect(plan.lanes.length).toBeGreaterThan(0);
    for (const lane of plan.lanes) {
      expect(lane.name).toBe(true);
      expect(lane.query).toBe(NAME_QUERY);
    }
  });

  it("changes nothing else about the plan: same lanes, sources, order and queries as a name-free search", () => {
    const named = typedPlan(NAME_QUERY, "federal", SOURCES);
    const plain = typedPlan(PLAIN_QUERY, "federal", SOURCES);
    // id, label and terms default to the query text, so they differ only
    // because the typed words differ, not because of the flag; compared here
    // by every other lane field instead.
    const strip = (plan: Plan) =>
      plan.lanes.map((lane) => ({
        group: lane.group,
        sourceId: lane.sourceId,
        collection: lane.collection,
        auto: lane.auto,
        skip: lane.skip,
        match: lane.match,
        lookup: lane.lookup,
        typeNotApplied: lane.typeNotApplied,
      }));
    expect(strip(named)).toEqual(strip(plain));
    expect(named.lanes.map((l) => l.sourceId)).toEqual(
      plain.lanes.map((l) => l.sourceId),
    );
  });

  it("does not change ranking: mergeLanes keeps the same row order with or without the flag", () => {
    const build = (name?: true): Plan =>
      buildPlan(
        { kind: "typed", query: NAME_QUERY },
        [
          {
            group: "policy",
            source: "federal",
            query: NAME_QUERY,
            auto: true,
            ...(name && { name }),
          },
        ],
        SOURCES,
      );
    const citations = [
      listing("federal-register", "1"),
      listing("govinfo", "2"),
    ];
    const order = (plan: Plan) =>
      rowsOf(plan, citations).map((row) => row.citation.identifier);
    expect(order(build(true))).toEqual(order(build()));
  });

  it("counts nothing toward shared issues: a row only a name search listed never counts, even when it states an issue's identifier", () => {
    const identifier: IssueIdentifier = {
      kind: "cfr",
      id: "36 CFR 800",
      label: "36 CFR 800",
      url: "https://example.gov/read",
      stated: "36 CFR 800",
      readOn: "2026-11-18",
    };
    const table: IssueFile = {
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
          restsOn: [identifier],
        },
      ],
    };
    const plan = typedPlan(NAME_QUERY, "federal", {
      federal: ["federal-register"],
      live: ["federal-register"],
    });
    const withCfr: DemoCitation = {
      ...listing("federal-register", "1"),
      cfrRefs: [{ title: 36, part: "800" }],
    };
    const rows = rowsOf(plan, [withCfr]);
    expect(rows).toHaveLength(1);
    expect(issuesSharedByRows(table, rows)).toEqual({
      hits: [],
      named: false,
    });
  });

  it("sets no state or jurisdiction reading from a state word folded into the name", () => {
    const route = routeQuery(`${NAME_QUERY} of Washington`);
    expect(route.readings.some((r) => r.jurisdiction !== null)).toBe(false);
  });
});
