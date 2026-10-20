// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  appendPage,
  AUTO_REQUEST_BUDGET,
  buildPlan,
  failLane,
  groupDiscovery,
  isSeedRecord,
  LANE_KEEP_MS,
  LaneCache,
  laneId,
  laneKeep,
  laneOptions,
  laneSignature,
  mergeLanes,
  NO_FEDERAL_SOURCE,
  recordPlan,
  replayLane,
  settleLane,
  startLane,
  startPlan,
  typedPlan,
  unresolvedEmpty,
} from "../../src/demo/discovery";
import type { LaneSearch, Plan, PlanSearch } from "../../src/demo/discovery";
import { draftPlan } from "../../src/demo/ncai-2026";
import {
  REGULATIONS_V2_CONFIRMED,
  searchCriteria,
} from "../../src/demo/search-contract";
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

  it("never crosses identifier kinds or type filters", () => {
    const cache = new LaneCache();
    const text = { sourceId: "federal-register", query: "0648-BO46" };
    const rin = { ...text, match: "rin" as const };
    const first = response(text.sourceId, text.query, []);
    cache.set(rin, dates, first);
    expect(cache.get(text, dates)).toBeUndefined();
    expect(cache.get(rin, { ...dates, documentType: "RULE" })).toBeUndefined();
    expect(cache.get(rin, { ...dates, documentType: null })).toBe(first);
    // A lane sent without the plan's filter is the same request as an unfiltered one.
    const govinfo = { sourceId: "govinfo", query: "salmon" };
    expect(
      laneSignature(
        { ...govinfo, typeNotApplied: true },
        { ...dates, documentType: "RULE" },
      ),
    ).toBe(laneSignature(govinfo, dates));
  });
});

describe("the document type filter", () => {
  const sources = {
    federal: ["federal-register", "govinfo", "regulations"],
    live: ALL_LIVE,
  };
  const dates = { dateFrom: null, dateTo: null };

  it("flags each lane whose source has no equivalent, and sends the filter only where it applies", () => {
    const plan = typedPlan("salmon", "federal", sources, {
      ...dates,
      documentType: "RULE",
    });
    expect(plan.documentType).toBe("RULE");
    // Regulations.gov takes the filter only once its live check is recorded.
    expect(plan.lanes.map((l) => [l.sourceId, l.typeNotApplied])).toEqual([
      ["federal-register", undefined],
      ["govinfo", true],
      ["regulations", REGULATIONS_V2_CONFIRMED ? undefined : true],
    ]);
    expect(plan.lanes.map((l) => laneOptions(plan, l).documentType)).toEqual([
      "RULE",
      null,
      REGULATIONS_V2_CONFIRMED ? "RULE" : null,
    ]);
    // Every lane's options are ones the contract accepts.
    for (const lane of plan.lanes)
      expect(() =>
        searchCriteria(lane.sourceId, lane.query, 1, laneOptions(plan, lane)),
      ).not.toThrow();
    const presidential = typedPlan("salmon", "federal", sources, {
      ...dates,
      documentType: "PRESDOCU",
    });
    expect(presidential.lanes.map((l) => l.typeNotApplied)).toEqual([
      undefined,
      true,
      true,
    ]);
  });

  it("flags nothing without a filter, and carries a continuation unchanged", () => {
    const plan = typedPlan("salmon", "federal", sources);
    expect(plan.lanes.some((l) => l.typeNotApplied)).toBe(false);
    const next = criteria("federal-register", "salmon", 2);
    expect(laneOptions(plan, plan.lanes[0], next)).toEqual({
      dateFrom: null,
      dateTo: null,
      continuation: next,
      version: 2,
      match: "text",
      documentType: null,
    });
  });
});

describe("a record plan (Find related)", () => {
  const fr: DemoCitation = {
    ...listing("federal-register"),
    docketIds: ["Docket No. 260916-0002"],
    rins: ["0648-BO46"],
    cfrRefs: [{ title: 50, part: "660" }],
    topics: ["Fisheries"],
  };
  const regs: DemoCitation = {
    ...listing("regulations", "NOAA-NMFS-2099-0001"),
    docketIds: ["NOAA-NMFS-2099-0001"],
  };

  it("expands only the identifiers the Federal Register stated, within the Federal Register", () => {
    const plan = recordPlan(fr, defaults);
    expect(plan.seed).toEqual({
      kind: "record",
      sourceId: "federal-register",
      identifier: fr.identifier,
    });
    expect(
      plan.lanes.map((l) => [l.id, l.group, l.sourceId, l.match, l.label]),
    ).toEqual([
      [
        "federal-register#docket:Docket No. 260916-0002",
        "related",
        "federal-register",
        "docket",
        "Same docket: Docket No. 260916-0002 (Federal Register)",
      ],
      [
        "federal-register#rin:0648-BO46",
        "related",
        "federal-register",
        "rin",
        "Same RIN: 0648-BO46",
      ],
      [
        "federal-register#cfr:50 CFR 660",
        "related",
        "federal-register",
        "cfr",
        "Same CFR part: 50 CFR 660",
      ],
    ]);
    expect(startPlan(plan).every((s) => s.state === "loading")).toBe(true);
    for (const lane of plan.lanes) {
      const options = laneOptions(plan, lane);
      expect(options).toMatchObject({ version: 2, match: lane.match });
      expect(
        searchCriteria(lane.sourceId, lane.query, 1, options),
      ).toMatchObject({ version: 2, sort: "newest", query: lane.query });
    }
  });

  it("tells the starting record apart when its own identifiers list it again", () => {
    const { seed } = recordPlan(fr, defaults);
    const other = listing("federal-register", "2099-00002");
    expect(isSeedRecord(seed, { citation: fr, alternates: [] })).toBe(true);
    // Listed by another source first, with the seed as an alternate listing.
    expect(
      isSeedRecord(seed, { citation: listing("govinfo"), alternates: [fr] }),
    ).toBe(true);
    expect(isSeedRecord(seed, { citation: other, alternates: [] })).toBe(false);
    // Same identifier text from another source is not the seed.
    expect(
      isSeedRecord(seed, {
        citation: {
          ...other,
          sourceId: "regulations",
          identifier: fr.identifier,
        },
        alternates: [],
      }),
    ).toBe(false);
    expect(
      isSeedRecord(
        { kind: "typed", query: "x" },
        { citation: fr, alternates: [] },
      ),
    ).toBe(false);
  });

  it("sends a Regulations.gov docket to Regulations.gov only, and nothing for other sources", () => {
    const plan = recordPlan(regs, defaults);
    expect(plan.lanes.map((l) => [l.id, l.sourceId, l.label])).toEqual([
      [
        "regulations#docket:NOAA-NMFS-2099-0001",
        "regulations",
        "Same docket: NOAA-NMFS-2099-0001 (Regulations.gov)",
      ],
    ]);
    // Held until its live check is recorded: the contract refuses it, so the page offers no Find related.
    const send = () =>
      searchCriteria(
        "regulations",
        plan.lanes[0].query,
        1,
        laneOptions(plan, plan.lanes[0]),
      );
    if (REGULATIONS_V2_CONFIRMED) expect(send).not.toThrow();
    else
      expect(send).toThrow(
        expect.objectContaining({ code: "unsupported_criteria" }),
      );
    // A Federal Register docket is never rewritten into Regulations.gov's spelling.
    expect(
      recordPlan(fr, defaults).lanes.some((l) => l.sourceId === "regulations"),
    ).toBe(false);
    expect(
      recordPlan(
        { ...listing("govinfo"), docketIds: ["X-1"], rins: ["0648-BO46"] },
        defaults,
      ).lanes,
    ).toEqual([]);
  });

  it("keeps a docket and a RIN with the same text apart", () => {
    const plan = recordPlan(
      { ...fr, docketIds: ["0648-BO46"], cfrRefs: [] },
      defaults,
    );
    expect(plan.lanes.map((l) => l.id)).toEqual([
      laneId("federal-register", "0648-BO46", "docket"),
      laneId("federal-register", "0648-BO46", "rin"),
    ]);
    expect(laneId("federal-register", "0648-BO46")).toBe(
      "federal-register:0648-BO46",
    );
  });

  it("marks lanes past the request budget, and a source that is not live", () => {
    const many: DemoCitation = {
      ...fr,
      docketIds: Array.from({ length: 8 }, (_, i) => `Docket No. ${i}`),
      rins: ["0648-BO46", "0648-BO47", "0648-BO48", "0648-BO49"],
    };
    const plan = recordPlan(many, defaults);
    expect(plan.lanes).toHaveLength(13);
    expect(plan.lanes.filter((l) => !l.skip)).toHaveLength(AUTO_REQUEST_BUDGET);
    expect(plan.lanes.slice(AUTO_REQUEST_BUDGET).map((l) => l.skip)).toEqual([
      "budget",
      "budget",
      "budget",
    ]);
    const off = recordPlan(regs, {
      federal: ["federal-register"],
      live: ["federal-register"],
    });
    expect(startPlan(off)).toMatchObject([
      { state: "not_searched", skip: "source_off" },
    ]);
  });

  it("applies a type filter where the source has one, and copies the match onto reasons", () => {
    const plan = recordPlan(regs, defaults, {
      dateFrom: null,
      dateTo: null,
      documentType: "PRESDOCU",
    });
    expect(plan.lanes[0].typeNotApplied).toBe(true);
    expect(laneOptions(plan, plan.lanes[0]).documentType).toBeNull();
    const frPlan = recordPlan(fr, defaults);
    const doc: DemoCitation = {
      ...listing("federal-register", "2099-00009"),
      docketIds: fr.docketIds,
      rins: fr.rins,
      cfrRefs: [{ title: 50, part: "17" }, ...fr.cfrRefs!],
    };
    const { rows } = mergeLanes(
      frPlan,
      frPlan.lanes.map((lane) => ({
        ...startLane(lane),
        state: "results" as const,
        listings: [doc],
      })),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].groups).toEqual(["related"]);
    expect(rows[0].reasons.map((r) => r.match)).toEqual([
      "docket",
      "rin",
      "cfr",
    ]);
  });

  it("lists a lookup's document under an identifier only when the document states it", () => {
    const plan = recordPlan(fr, defaults);
    const [docket, rin, cfr] = plan.lanes;
    const states = (id: string, fields: Partial<DemoCitation>) => ({
      ...listing("federal-register", id),
      ...fields,
    });
    // Each states one identifier; "none" states none; "near" states a different part.
    const docs = [
      states("2099-00021", { docketIds: ["Docket No. 260916-0002"] }),
      states("2099-00022", { rins: ["0648-BO46"] }),
      states("2099-00023", { cfrRefs: [{ title: 50, part: "660" }] }),
      states("2099-00024", {}),
      states("2099-00025", { cfrRefs: [{ title: 50, part: "1-700" }] }),
    ];
    // Each answer settles through its lane's keep rule, as the page does.
    const searches = [docket, rin, cfr].map((lane) =>
      settleLane(
        startLane(lane),
        response("federal-register", lane.query, docs),
        laneKeep(lane),
      ),
    );
    // The lane's own count is the rows it shows, and the rest are counted apart.
    expect(searches.map((s) => [s.listings.length, s.leftOut])).toEqual([
      [1, 4],
      [1, 4],
      [1, 4],
    ]);
    const { rows } = mergeLanes(plan, searches);
    expect(
      rows.map((row) => [
        row.citation.identifier,
        row.reasons.map((r) => r.laneId),
      ]),
    ).toEqual([
      ["federal-register 2099-00021", [docket.id]],
      ["federal-register 2099-00022", [rin.id]],
      ["federal-register 2099-00023", [cfr.id]],
    ]);
  });

  it("calls a lookup empty, with its left-out count, when no listing states the identifier", () => {
    const [docket] = recordPlan(fr, defaults).lanes;
    const stray = { ...listing("federal-register", "2099-00031"), rins: [] };
    const settled = settleLane(
      startLane(docket),
      response("federal-register", docket.query, [stray]),
      laneKeep(docket),
    );
    expect(settled).toMatchObject({ state: "empty", listings: [], leftOut: 1 });
    // A later page adds to the count rather than replacing it.
    const { search } = appendPage(
      settled,
      response("federal-register", docket.query, [
        listing("federal-register", "2099-00032"),
      ]),
      criteria("federal-register", docket.query, 2),
      laneKeep(docket),
    );
    expect(search.leftOut).toBe(2);
    // Lanes without an identifier keep everything and carry no count.
    expect(laneKeep({ query: "water" })).toBeUndefined();
  });

  it("builds no lookup for a CFR part range, whose matching is unconfirmed", () => {
    const plan = recordPlan(
      {
        ...fr,
        docketIds: [],
        rins: [],
        cfrRefs: [{ title: 50, part: "1-50" }],
      },
      defaults,
    );
    expect(plan.lanes).toEqual([]);
  });
});
