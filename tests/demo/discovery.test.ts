// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  appendPage,
  AUTO_REQUEST_BUDGET,
  buildPlan,
  failLane,
  groupDiscovery,
  LANE_KEEP_MS,
  LaneCache,
  laneId,
  laneSignature,
  mergeLanes,
  NO_FEDERAL_SOURCE,
  replayLane,
  settleLane,
  startLane,
  startPlan,
  typedPlan,
  unresolvedEmpty,
} from "../../src/demo/discovery";
import type { LaneSearch, Plan, PlanSearch } from "../../src/demo/discovery";
import { draftPlan } from "../../src/demo/ncai-2026";
import type { NcaiDraft } from "../../src/demo/ncai-2026";
import type {
  DemoCitation,
  DemoSearchContinuation,
  DemoSearchCursor,
  DemoSearchResponse,
} from "../../src/demo/types";
import { listing } from "./fixtures";

// Synthetic draft; the real ones ship only encrypted.
const draft: NcaiDraft = {
  id: "PSC-26-001",
  title: "Example draft on a named rule",
  sponsor: "Example Tribe",
  status: "In order",
  topics: ['"Example Rule"', "example program"],
  bills: ["hr 1234"],
  cases: ['"Example Act"'],
  names: ["Example Tribe"],
};
const seed = { kind: "draft", id: draft.id } as const;
const ALL_LIVE = ["federal-register", "govinfo", "congress", "regulations"];
const defaults = { federal: ["federal-register"], live: ALL_LIVE };

function criteria(
  source: string,
  query: string,
  page = 1,
  cursor: string | null = null,
): DemoSearchCursor {
  return {
    version: 1,
    source,
    query,
    dateFrom: null,
    dateTo: null,
    page,
    pageSize: 10,
    sort: "relevance",
    resultLevel: null,
    historical: null,
    cursor,
  };
}

function response(
  source: string,
  query: string,
  results: readonly DemoCitation[],
  continuation: DemoSearchContinuation = {
    kind: "stopped",
    reason: "complete",
  },
  page = 1,
): DemoSearchResponse {
  return {
    ok: true,
    source,
    query,
    total: results.length,
    page,
    results,
    retrievedAt: "2099-01-07T12:00:00.000Z",
    criteria: criteria(source, query, page),
    continuation,
  };
}

describe("building a discovery plan", () => {
  it("sends the draft's automatic set in order, one lane per collection", () => {
    const plan = buildPlan(seed, draftPlan(draft), defaults);
    expect(
      startPlan(plan).map((search) => [search.laneId, search.state]),
    ).toEqual([
      ['federal-register:"Example Rule"', "loading"],
      ['govinfo:collection:BILLS AND ("Example Rule")', "loading"],
      [
        'govinfo:collection:PLAW AND lawtype:public AND ("Example Rule")',
        "loading",
      ],
      ["congress:hr 1234 119", "loading"],
      ['govinfo:collection:USCOURTS AND ("Example Act")', "loading"],
      [
        'govinfo:collection:USCOURTS AND circuit:9 AND ("Example Act")',
        "loading",
      ],
      ['govinfo:collection:USREPORTS AND ("Example Act")', "loading"],
    ]);
    expect(plan.lanes.filter((lane) => lane.auto).map((l) => l.group)).toEqual([
      "policy",
      "legislation",
      "legislation",
      "bill",
      "case",
      "case",
      "case",
    ]);
  });

  it("never sends a name search on its own, even when asked to", () => {
    const plan = buildPlan(
      seed,
      [{ group: "sponsor", source: "federal", query: '"Example"', auto: true }],
      { federal: ["federal-register", "govinfo"], live: ALL_LIVE },
    );
    expect(
      plan.lanes.map((lane) => [lane.group, lane.auto, lane.name]),
    ).toEqual([
      ["policy", false, true],
      ["policy", false, true],
    ]);
    expect(startPlan(plan)).toEqual([]);
  });

  it("marks a draft's name lane, and its reasons, as a name search", () => {
    const plan = buildPlan(seed, draftPlan(draft), defaults);
    const name = plan.lanes.find((lane) => lane.name)!;
    expect(name).toMatchObject({
      group: "policy",
      query: '"Example Tribe" "Example Rule"',
      auto: false,
    });
    expect(plan.lanes.filter((lane) => lane.name)).toEqual([name]);
    const doc = listing("federal-register", "2099-00001");
    const topic = plan.lanes[0];
    const { rows } = mergeLanes(plan, [
      { ...startLane(topic), state: "results", listings: [doc] },
      { ...startLane(name), state: "results", listings: [doc] },
    ]);
    expect(rows[0].reasons.map((r) => [r.laneId, r.name])).toEqual([
      [topic.id, undefined],
      [name.id, true],
    ]);
  });

  it("gives each lane the words searched and the collection, apart from GovInfo syntax", () => {
    const plan = buildPlan(seed, draftPlan(draft), defaults);
    const lane = (query: string) =>
      plan.lanes.find((item) => item.query === query)!;
    expect(lane('collection:USCOURTS AND ("Example Act")')).toMatchObject({
      terms: '"Example Act"',
      collection: "Federal court opinions",
      label: 'Federal court opinions: "Example Act"',
    });
    expect(lane('collection:USREPORTS AND ("Example Act")')).toMatchObject({
      terms: '"Example Act"',
      collection: "Supreme Court opinions in the United States Reports",
    });
    expect(lane('"Example Rule"').terms).toBe('"Example Rule"');
    expect(lane('"Example Rule"').collection).toBeUndefined();
    // No lane reads its label or words from the raw provider query.
    for (const item of plan.lanes.filter((l) => l.sourceId === "govinfo"))
      expect(`${item.label} ${item.terms}`).not.toContain("collection:");
  });

  it("carries the draft ID but never the draft title (owner decision pending)", () => {
    const plan = buildPlan(seed, draftPlan(draft), defaults);
    expect(plan.seed).toEqual({ kind: "draft", id: draft.id });
    expect(JSON.stringify(plan)).not.toContain(draft.title);
  });

  it("keeps each lane once and never collides two GovInfo queries", () => {
    const plan = buildPlan(
      seed,
      [
        ...draftPlan(draft),
        {
          group: "policy",
          source: "federal",
          query: '"Example Rule"',
          auto: true,
        },
      ],
      { federal: ["federal-register", "govinfo"], live: ALL_LIVE },
    );
    const ids = plan.lanes.map((lane) => lane.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(laneId("govinfo", '"Example Rule"'));
    expect(ids).toContain(
      laneId("govinfo", 'collection:BILLS AND ("Example Rule")'),
    );
  });

  it("marks a single source that is not live as not searched, with its reason", () => {
    const plan = buildPlan(seed, draftPlan(draft), {
      federal: ["federal-register"],
      live: ["federal-register"],
    });
    const govinfo = startPlan(plan).filter(
      (s) => s.sourceId !== "federal-register",
    );
    expect(govinfo.length).toBe(6);
    for (const search of govinfo) {
      expect(search.state).toBe("not_searched");
      expect(search.skip).toBe("source_off");
    }
  });

  it("skips Congress.gov for a topic and for any date range, and GovInfo for dated syntax", () => {
    const sources = {
      federal: ["federal-register", "govinfo", "congress"],
      live: ALL_LIVE,
    };
    const topic = typedPlan("salmon habitat", "federal", sources);
    expect(topic.lanes.map((lane) => [lane.sourceId, lane.skip])).toEqual([
      ["federal-register", undefined],
      ["govinfo", undefined],
      ["congress", "congress_reference"],
    ]);
    const dates = { dateFrom: "2099-01-01", dateTo: "2099-02-01" };
    const dated = typedPlan('"salmon habitat"', "federal", sources, dates);
    expect(dated.lanes.map((lane) => lane.skip)).toEqual([
      undefined,
      "govinfo_dates",
      "congress_dates",
    ]);
    expect(dated).toMatchObject({ seed: { kind: "typed" }, ...dates });
    expect(
      typedPlan("salmon habitat", "federal", sources, dates).lanes[1].skip,
    ).toBeUndefined();
  });

  it("makes a typed search a one-group plan, on a state source too", () => {
    const plan = typedPlan("water", "washington", {
      federal: [],
      live: ["washington"],
    });
    expect(plan.lanes).toEqual([
      {
        id: "washington:water",
        group: "policy",
        sourceId: "washington",
        query: "water",
        label: "water",
        terms: "water",
        auto: true,
      },
    ]);
  });

  it("keeps automatic lanes past the request budget, marked not searched", () => {
    const searches: PlanSearch[] = Array.from({ length: 12 }, (_, index) => ({
      group: "case",
      source: "govinfo",
      query: `collection:USCOURTS AND (words ${index})`,
      auto: true,
    }));
    const plan = buildPlan(
      seed,
      [
        { group: "policy", source: "congress", query: "salmon", auto: true },
        ...searches,
      ],
      defaults,
    );
    const started = startPlan(plan);
    expect(started).toHaveLength(13);
    // The skipped Congress.gov lane sends nothing, so it does not count.
    expect(started.filter((s) => s.state === "loading")).toHaveLength(
      AUTO_REQUEST_BUDGET,
    );
    expect(started.slice(-2).map((s) => [s.state, s.skip])).toEqual([
      ["not_searched", "budget"],
      ["not_searched", "budget"],
    ]);
  });

  it("keeps a federal search with no checked live federal source as one lane, never sent", () => {
    const searches: PlanSearch[] = [
      { group: "policy", source: "federal", query: "salmon", auto: true },
      ...Array.from({ length: AUTO_REQUEST_BUDGET }, (_, index) => ({
        group: "case" as const,
        source: "govinfo",
        query: `collection:USCOURTS AND (words ${index})`,
        auto: true,
      })),
    ];
    const plan = buildPlan(seed, searches, { federal: [], live: ALL_LIVE });
    expect(plan.lanes[0]).toMatchObject({
      id: laneId(NO_FEDERAL_SOURCE, "salmon"),
      group: "policy",
      sourceId: NO_FEDERAL_SOURCE,
      skip: "none_checked",
    });
    const started = startPlan(plan);
    expect(started[0]).toMatchObject({
      state: "not_searched",
      skip: "none_checked",
    });
    // It sends nothing, so it takes no place in the request budget.
    expect(started.filter((s) => s.state === "loading")).toHaveLength(
      AUTO_REQUEST_BUDGET,
    );
  });

  it("stays within the budget with every federal source checked", () => {
    const plan = buildPlan(seed, draftPlan(draft), {
      federal: ["federal-register", "govinfo", "congress", "regulations"],
      live: ALL_LIVE,
    });
    expect(startPlan(plan).some((s) => s.skip === "budget")).toBe(false);
  });
});

describe("lane searches", () => {
  const lane = buildPlan(seed, draftPlan(draft), defaults).lanes[0];

  it("settles a first page without repeats, and keeps a failure distinct from empty", () => {
    const first = startLane(lane);
    const doc = listing("federal-register", "2099-00001");
    const settled = settleLane(
      first,
      response("federal-register", lane.query, [doc, doc]),
    );
    expect(settled.state).toBe("results");
    expect(settled.listings).toEqual([doc]);
    expect(failLane(first, "Down").state).toBe("unavailable");
    expect(failLane(first, "Not found", true)).toMatchObject({
      state: "empty",
      reason: "Not found",
    });
  });

  it("calls an empty page with more reported unresolved", () => {
    const empty = settleLane(
      startLane(lane),
      response("federal-register", lane.query, [], {
        kind: "stopped",
        reason: "cap",
      }),
    );
    expect(unresolvedEmpty(empty)).toBe(true);
    expect(
      unresolvedEmpty(
        settleLane(startLane(lane), response("federal-register", "q", [])),
      ),
    ).toBe(false);
  });

  it("appends a page, stops on a repeated cursor and refuses past the cap", () => {
    const sent = criteria("regulations", "q", 2, "token-a");
    const base: LaneSearch = {
      ...startLane({ ...lane, sourceId: "regulations" }),
      state: "results",
      listings: [listing("regulations", "1")],
    };
    const more: DemoSearchContinuation = {
      kind: "more",
      next: criteria("regulations", "q", 3, "token-a"),
    };
    const { search, added } = appendPage(
      base,
      response(
        "regulations",
        "q",
        [listing("regulations", "1"), listing("regulations", "2")],
        more,
        2,
      ),
      sent,
    );
    expect(added.map((c) => c.identifier)).toEqual(["regulations 2"]);
    expect(search.cursors).toEqual(["token-a"]);
    expect(search.response?.continuation).toEqual({
      kind: "stopped",
      reason: "unknown",
    });
    const full = {
      ...base,
      listings: Array.from({ length: 200 }, (_, i) =>
        listing("regulations", `x${i}`),
      ),
    };
    expect(() =>
      appendPage(
        full,
        response("regulations", "q", [listing("regulations", "new")], more, 2),
        sent,
      ),
    ).toThrow("listing limit");
  });
});

describe("merging lanes", () => {
  const plan: Plan = buildPlan(
    seed,
    [
      { group: "policy", source: "federal", query: "salmon", auto: true },
      {
        group: "legislation",
        source: "govinfo",
        query: "collection:BILLS AND (salmon)",
        terms: "salmon",
        collection: "Federal bills and resolutions",
        auto: true,
      },
      {
        group: "case",
        source: "govinfo",
        query: "collection:USCOURTS AND (salmon)",
        auto: true,
      },
    ],
    { federal: ["federal-register", "govinfo"], live: ALL_LIVE },
  );
  const [frPolicy, giPolicy, giBills, giCourts] = plan.lanes;
  const shared = listing("federal-register", "2099-00001");
  const sharedGi = listing("govinfo", "2099-00001");
  const bill = listing("govinfo", "2099-00002", null);
  const opinion = listing("govinfo", "2099-00003", null);
  const searches: LaneSearch[] = [
    // Out of plan order on purpose; the merge orders by plan.
    { ...startLane(giCourts), state: "results", listings: [opinion] },
    { ...startLane(frPolicy), state: "results", listings: [shared] },
    { ...startLane(giPolicy), state: "results", listings: [sharedGi, bill] },
    { ...startLane(giBills), state: "results", listings: [bill] },
  ];

  it("shows a document found by several lanes once, with every reason", () => {
    const { rows, merged } = mergeLanes(plan, searches);
    expect(rows).toHaveLength(3);
    expect(merged).toBe(1);
    const first = rows.find((row) => row.citation === shared)!;
    expect(first.alternates).toEqual([sharedGi]);
    expect(first.reasons.map((r) => r.laneId)).toEqual([
      frPolicy.id,
      giPolicy.id,
    ]);
    const billRow = rows.find((row) => row.citation === bill)!;
    expect(billRow.reasons.map((r) => [r.laneId, r.group])).toEqual([
      [giPolicy.id, "policy"],
      [giBills.id, "legislation"],
    ]);
    // Most specific first: the bill lane decides the row's section.
    expect(billRow.groups).toEqual(["legislation", "policy"]);
    expect(billRow.reasons[1]).toEqual({
      laneId: giBills.id,
      group: "legislation",
      sourceId: "govinfo",
      query: "collection:BILLS AND (salmon)",
      label: "collection:BILLS AND (salmon)",
      terms: "salmon",
      collection: "Federal bills and resolutions",
    });
  });

  it("keeps distinct documents distinct and appends later pages at the end", () => {
    const { rows } = mergeLanes(plan, searches);
    const later = listing("govinfo", "2099-00004", null);
    const next = mergeLanes(
      plan,
      searches.map((search) =>
        search.laneId === giCourts.id
          ? { ...search, listings: [...search.listings, later, sharedGi] }
          : search,
      ),
      rows,
    );
    expect(next.rows.map((row) => row.citation)).toEqual([
      ...rows.map((row) => row.citation),
      later,
    ]);
    // The court lane listed the shared document too, so it gains that reason.
    expect(next.rows[0].reasons.map((r) => r.laneId)).toContain(giCourts.id);
  });

  it("drops a previous row that no current lane lists", () => {
    const { rows } = mergeLanes(plan, searches);
    const reset = searches.map((search) =>
      search.laneId === giCourts.id ? startLane(giCourts) : search,
    );
    const next = mergeLanes(plan, reset, rows);
    expect(next.rows.map((row) => row.citation)).not.toContain(opinion);
    expect(next.rows).toHaveLength(rows.length - 1);
    expect(next.rows.every((row) => row.reasons.length > 0)).toBe(true);
  });

  it("refuses a lane that is not in the plan", () => {
    expect(() =>
      mergeLanes(plan, [startLane({ ...frPolicy, id: "nowhere:x" })]),
    ).toThrow("not in plan");
  });

  it("groups started lanes and rows in plan order, each row once", () => {
    const { rows } = mergeLanes(plan, searches);
    const views = groupDiscovery(plan, searches, rows);
    expect(views.map((view) => view.group)).toEqual([
      "policy",
      "legislation",
      "case",
    ]);
    expect(views[0].lanes.map((entry) => entry.lane.id)).toEqual([
      frPolicy.id,
      giPolicy.id,
    ]);
    expect(views.flatMap((view) => view.rows)).toHaveLength(rows.length);
    // The bill that the broad GovInfo policy lane also listed sits under its bill lane.
    expect(views[0].rows.map((row) => row.citation)).toEqual([shared]);
    expect(views[1].rows.map((row) => row.citation)).toEqual([bill]);
    expect(views[2].rows.map((row) => row.citation)).toEqual([opinion]);
    // A group with no started lane has no section.
    expect(
      groupDiscovery(plan, searches.slice(0, 2), rows).map((v) => v.group),
    ).toEqual(["policy", "case"]);
  });
});

describe("the lane cache", () => {
  const dates = { dateFrom: null, dateTo: null };
  const lane = { sourceId: "govinfo", query: "collection:BILLS AND (salmon)" };

  it("finds a first page only by source, query and dates", () => {
    const cache = new LaneCache();
    const first = response(lane.sourceId, lane.query, []);
    cache.set(lane, dates, first);
    expect(cache.get(lane, dates)).toBe(first);
    expect(
      cache.get({ ...lane, sourceId: "federal-register" }, dates),
    ).toBeUndefined();
    expect(cache.get({ ...lane, query: "salmon" }, dates)).toBeUndefined();
    expect(
      cache.get(lane, { dateFrom: "2099-01-01", dateTo: "2099-02-01" }),
    ).toBeUndefined();
    const fuller = { ...lane, id: "other", label: "x", auto: false };
    expect(laneSignature(fuller, dates)).toBe(laneSignature(lane, dates));
    cache.set(
      lane,
      dates,
      response(lane.sourceId, lane.query, [], undefined, 2),
    );
    expect(cache.get(lane, dates)).toBe(first);
  });

  it("keeps a missing reference, so choosing the draft again sends nothing", () => {
    const cache = new LaneCache();
    const bill = buildPlan(seed, draftPlan(draft), defaults).lanes.find(
      (item) => item.sourceId === "congress",
    )!;
    cache.set(bill, dates, { ok: false, missing: "No such bill." });
    const kept = cache.get(bill, dates);
    expect(kept).toBeDefined();
    expect(replayLane(startLane(bill), kept!)).toMatchObject({
      state: "empty",
      reason: "No such bill.",
    });
    const first = response(lane.sourceId, lane.query, [
      listing("govinfo", "2099-00002", null),
    ]);
    expect(replayLane(startLane({ ...bill, ...lane }), first)).toMatchObject({
      state: "results",
      response: first,
    });
  });

  it("asks again once a kept outcome is old, or the clock went back", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    const cache = new LaneCache();
    cache.set(lane, dates, response(lane.sourceId, lane.query, []));
    now.mockReturnValue(1_000_000 + LANE_KEEP_MS - 1);
    expect(cache.get(lane, dates)).toBeDefined();
    now.mockReturnValue(1_000_000 + LANE_KEEP_MS);
    expect(cache.get(lane, dates)).toBeUndefined();
    expect(cache.size).toBe(0);
    cache.set(lane, dates, { ok: false, missing: "No such bill." });
    // Kept at the later time; the clock is then set back before it.
    now.mockReturnValue(1_000_000 + LANE_KEEP_MS - 1);
    expect(cache.get(lane, dates)).toBeUndefined();
    now.mockRestore();
  });

  it("drops the least recently used entry past its bound, and clears", () => {
    const cache = new LaneCache(2);
    const at = (query: string) => ({ sourceId: "govinfo", query });
    cache.set(at("a"), dates, response("govinfo", "a", []));
    cache.set(at("b"), dates, response("govinfo", "b", []));
    cache.get(at("a"), dates);
    cache.set(at("c"), dates, response("govinfo", "c", []));
    expect(cache.size).toBe(2);
    expect(cache.get(at("b"), dates)).toBeUndefined();
    expect(cache.get(at("a"), dates)).toBeDefined();
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
