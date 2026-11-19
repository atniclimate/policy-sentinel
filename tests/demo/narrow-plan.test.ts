// @vitest-environment node
// D-186, D-188: the owner ruling of 2026-11-19 approving part (a) of the
// narrowing design. A typed federal search may narrow to the Federal
// Register's own agency or topic field; every other lane in the plan states
// plainly that it has no such field (safeguard 8).
import { describe, expect, it } from "vitest";
import {
  laneKeep,
  laneOptions,
  mergeLanes,
  settleLane,
  startLane,
  typedPlan,
} from "../../src/demo/discovery";
import type { Narrow, Plan, PlanSources } from "../../src/demo/discovery";
import type { DemoCitation, DemoSearchResponse } from "../../src/demo/types";
import { listing } from "./fixtures";

const SOURCES: PlanSources = {
  federal: ["federal-register", "govinfo", "congress"],
  live: ["federal-register", "govinfo", "congress"],
};

const AGENCY: Narrow = {
  field: "agency",
  id: "indian-affairs-bureau",
  label: "Indian Affairs Bureau",
};
const TOPIC: Narrow = {
  field: "topic",
  id: "indians-lands",
  label: "Indians-lands",
};

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

describe("narrowing a typed federal search by agency or topic (D-186)", () => {
  it("sends version 3 with the id on the Federal Register's text lane; every other lane is unchanged and marked not narrowed", () => {
    const plain = typedPlan("consultation", "federal", SOURCES);
    const plan = typedPlan("consultation", "federal", SOURCES, {
      dateFrom: null,
      dateTo: null,
      documentType: null,
      narrow: AGENCY,
    });
    const fr = plan.lanes.find((l) => l.sourceId === "federal-register")!;
    expect(fr.narrow).toEqual(AGENCY);
    expect(fr.narrowNotApplied).toBeUndefined();
    expect(laneOptions(plan, fr)).toMatchObject({
      version: 3,
      match: "text",
      agency: "indian-affairs-bureau",
    });
    expect(laneOptions(plan, fr)).not.toHaveProperty("topic");
    for (const lane of plan.lanes.filter(
      (l) => l.sourceId !== "federal-register",
    )) {
      const plainLane = plain.lanes.find((l) => l.sourceId === lane.sourceId)!;
      expect(lane.narrow).toBeUndefined();
      expect(lane.narrowNotApplied).toBe(true);
      expect(lane.query).toBe(plainLane.query);
      expect(lane.skip).toBe(plainLane.skip);
    }
  });

  it("holds the Federal Register lane with an empty query and skips the other checked sources with the no-words reason", () => {
    const plan = typedPlan("", "federal", SOURCES, {
      dateFrom: null,
      dateTo: null,
      documentType: null,
      narrow: TOPIC,
    });
    const fr = plan.lanes.find((l) => l.sourceId === "federal-register")!;
    expect(fr.query).toBe("");
    expect(fr.skip).toBeUndefined();
    expect(fr.narrow).toEqual(TOPIC);
    for (const lane of plan.lanes.filter(
      (l) => l.sourceId !== "federal-register",
    )) {
      expect(lane.skip).toBe("narrow_no_words");
      expect(lane.narrowNotApplied).toBe(true);
    }
  });

  it("without a narrowing, an empty query is not specially skipped by this reason", () => {
    const plan = typedPlan("", "federal", SOURCES);
    for (const lane of plan.lanes)
      expect(lane.skip).not.toBe("narrow_no_words");
  });

  it('laneKeep keeps a listing whose issuingBody holds the agency label among its "; " parts', () => {
    const keep = laneKeep({ query: "consultation", narrow: AGENCY });
    expect(keep).toBeDefined();
    expect(
      keep!({
        ...listing("federal-register"),
        issuingBody: "Interior Department; Indian Affairs Bureau",
      }),
    ).toBe(true);
    expect(
      keep!({
        ...listing("federal-register"),
        issuingBody: "Interior Department",
      }),
    ).toBe(false);
  });

  it("laneKeep keeps a listing whose topics holds the topic label", () => {
    const keep = laneKeep({ query: "", narrow: TOPIC });
    expect(
      keep!({
        ...listing("federal-register"),
        topics: ["Indians-lands", "Water supply"],
      }),
    ).toBe(true);
    expect(
      keep!({ ...listing("federal-register"), topics: ["Water supply"] }),
    ).toBe(false);
    expect(keep!({ ...listing("federal-register") })).toBe(false);
  });

  it("mergeLanes returns identical row order for identical listings with and without the narrowing", () => {
    const plain = typedPlan("consultation", "federal", SOURCES);
    const narrowed = typedPlan("consultation", "federal", SOURCES, {
      dateFrom: null,
      dateTo: null,
      documentType: null,
      narrow: AGENCY,
    });
    const citations = plain.lanes.map((lane, i) => ({
      ...listing(
        lane.sourceId as
          "federal-register" | "govinfo" | "regulations" | "congress",
        `${i}`,
      ),
      issuingBody: "Interior Department; Indian Affairs Bureau",
    }));
    const rowsOf = (plan: Plan) => {
      const searches = plan.lanes.map((lane, i) =>
        settleLane(
          startLane(lane),
          response(lane.sourceId, lane.query, [citations[i]]),
          laneKeep(lane),
        ),
      );
      return mergeLanes(plan, searches).rows.map((r) => r.citation.identifier);
    };
    expect(rowsOf(narrowed)).toEqual(rowsOf(plain));
  });

  it("keeps name: true on a narrowed plan with a Tribe-shaped typed name", () => {
    const plan = typedPlan("Example River Nation", "federal", SOURCES, {
      dateFrom: null,
      dateTo: null,
      documentType: null,
      narrow: AGENCY,
    });
    const fr = plan.lanes.find((l) => l.sourceId === "federal-register")!;
    expect(fr.name).toBe(true);
    expect(fr.narrow).toEqual(AGENCY);
  });

  it("adds no field named for a Nation, Tribe or jurisdiction to a narrowed lane or reason", () => {
    const plain = typedPlan("consultation", "federal", SOURCES).lanes.find(
      (l) => l.sourceId === "federal-register",
    )!;
    const plan = typedPlan("consultation", "federal", SOURCES, {
      dateFrom: null,
      dateTo: null,
      documentType: null,
      narrow: AGENCY,
    });
    const fr = plan.lanes.find((l) => l.sourceId === "federal-register")!;
    const other = plan.lanes.find((l) => l.sourceId === "govinfo")!;
    // The only keys the narrowing adds beyond an unnarrowed lane's own fields.
    const addedToFr = Object.keys(fr).filter((k) => !(k in plain));
    const addedToOther = Object.keys(other).filter(
      (k) => !["narrowNotApplied"].includes(k) && !(k in plain),
    );
    expect(addedToFr.sort()).toEqual(["narrow"]);
    for (const key of [...addedToFr, "narrowNotApplied"])
      expect(key.toLowerCase()).not.toMatch(/nation|tribe|jurisdiction/);
    expect(addedToOther).toEqual([]);
    expect(Object.keys(AGENCY).sort()).toEqual(["field", "id", "label"]);
  });
});
