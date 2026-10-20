/**
 * Seeded discovery: a seed (an NCAI draft, a typed search or a committee area)
 * becomes a plan of lanes, one source and one query each. The page sends the
 * automatic lanes within a request budget, and Results shows the merged rows by
 * group, each row with every reason it was shown and each lane with its outcome.
 *
 * Everything here is pure. The page owns requests, AbortController and sequence
 * ownership, and turns each skip reason code into words.
 */
import { appendMergedResults, isCongressReference } from "./merge";
import type { MergedResult } from "./merge";
import { supportsDatedGovinfoQuery } from "./search-contract";
import type {
  DemoCitation,
  DemoSearchCursor,
  DemoSearchOptions,
  DemoSearchResponse,
} from "./types";
import { keyOf } from "./validation";

/** Worker requests one seed may send on its own; later automatic lanes wait. */
export const AUTO_REQUEST_BUDGET = 10;

/** Lane outcomes kept per tab, so re-choosing a seed sends nothing. */
export const LANE_CACHE_LIMIT = 64;

/**
 * How long a kept outcome is replayed. After that the source is asked again,
 * so an old answer is never shown as current (safeguard 8).
 */
export const LANE_KEEP_MS = 15 * 60_000;

/** Results sections, in display order. Name searches are not a group. */
export type LaneGroup = "policy" | "legislation" | "bill" | "case";

/**
 * What a plan grows from. A result record seed can join this union later.
 * A draft seed holds its ID only: reuse of the tracker title waits on the owner.
 */
export type Seed =
  | { readonly kind: "draft"; readonly id: string }
  | { readonly kind: "typed"; readonly query: string }
  | { readonly kind: "area"; readonly label: string };

/** One suggested or typed search, before it is spread over sources. */
export interface PlanSearch {
  /** "sponsor" runs as a policy lane and never automatically. */
  readonly group: LaneGroup | "sponsor";
  /**
   * "federal" spreads over the checked live federal sources (with none
   * checked, one lane on NO_FEDERAL_SOURCE, never sent); otherwise one
   * source id, sent when live whether or not the reader checked it. The owner
   * asked for court searches to run automatically (2026-10-19) and only the
   * Federal Register is checked by default, so Results names every source asked.
   */
  readonly source: string;
  readonly query: string;
  readonly label?: string;
  /** The words alone, when the query wraps them in provider syntax. */
  readonly terms?: string;
  /** The collection searched within the source, in plain words. */
  readonly collection?: string;
  readonly auto: boolean;
}

/**
 * The source id of the one lane a "federal" search keeps when no live federal
 * source is checked, so its section says it was not searched (safeguard 8).
 */
export const NO_FEDERAL_SOURCE = "federal";

/** Why a lane is not sent. The page owns the words for each. */
export type SkipReason =
  | "none_checked"
  | "source_off"
  | "congress_reference"
  | "congress_dates"
  | "govinfo_dates"
  | "budget";

export interface Lane {
  /** sourceId and query, so two GovInfo lanes never collide. */
  readonly id: string;
  readonly group: LaneGroup;
  readonly sourceId: string;
  readonly query: string;
  readonly label: string;
  /** The words matched, for "Why shown"; the query itself when it is plain. */
  readonly terms: string;
  readonly collection?: string;
  /** Sent when the plan starts; otherwise it waits for its button. */
  readonly auto: boolean;
  readonly skip?: SkipReason;
  /**
   * A sponsor-name search. Its matches do not show that a record concerns that
   * Tribe or organization (safeguard 1), so the page words it apart.
   */
  readonly name?: true;
}

export type PlanDates = Pick<DemoSearchOptions, "dateFrom" | "dateTo">;

export interface PlanSources {
  /** Live federal sources the reader has checked, in catalog order. */
  readonly federal: readonly string[];
  /** Every live source, federal or state. */
  readonly live: readonly string[];
}

export interface Plan extends PlanDates {
  readonly seed: Seed;
  readonly lanes: readonly Lane[];
}

const NO_DATES: PlanDates = { dateFrom: null, dateTo: null };

export const laneId = (sourceId: string, query: string): string =>
  `${sourceId}:${query}`;

function skipReason(
  sourceId: string,
  query: string,
  sources: PlanSources,
  dates: PlanDates,
): SkipReason | undefined {
  if (sourceId === NO_FEDERAL_SOURCE) return "none_checked";
  if (!sources.live.includes(sourceId)) return "source_off";
  if (sourceId === "congress") {
    if (dates.dateFrom) return "congress_dates";
    if (!isCongressReference(query)) return "congress_reference";
  }
  if (
    sourceId === "govinfo" &&
    dates.dateFrom &&
    !supportsDatedGovinfoQuery(query)
  )
    return "govinfo_dates";
  return undefined;
}

/**
 * Spread each search over its sources, in search order. A repeated lane is
 * kept once. Automatic lanes past the request budget stay in the plan, marked
 * "budget", so the page can say they were not searched.
 */
export function buildPlan(
  seed: Seed,
  searches: readonly PlanSearch[],
  sources: PlanSources,
  dates: PlanDates = NO_DATES,
): Plan {
  const lanes: Lane[] = [];
  const seen = new Set<string>();
  let requests = 0;
  for (const search of searches) {
    // Safeguard 1: a name search runs only when the reader asks for it.
    const auto = search.auto && search.group !== "sponsor";
    const group = search.group === "sponsor" ? "policy" : search.group;
    const ids =
      search.source !== "federal"
        ? [search.source]
        : sources.federal.length
          ? sources.federal
          : [NO_FEDERAL_SOURCE];
    for (const sourceId of ids) {
      const id = laneId(sourceId, search.query);
      if (seen.has(id)) continue;
      seen.add(id);
      let skip = skipReason(sourceId, search.query, sources, dates);
      if (auto && !skip && ++requests > AUTO_REQUEST_BUDGET) skip = "budget";
      lanes.push({
        id,
        group,
        sourceId,
        query: search.query,
        label: search.label ?? search.query,
        terms: search.terms ?? search.query,
        ...(search.collection && { collection: search.collection }),
        auto,
        ...(skip && { skip }),
        ...(search.group === "sponsor" && { name: true as const }),
      });
    }
  }
  return { seed, ...dates, lanes };
}

/** A typed search is a one-group plan; `source` is "federal" or a state id. */
export function typedPlan(
  query: string,
  source: string,
  sources: PlanSources,
  dates: PlanDates = NO_DATES,
): Plan {
  return buildPlan(
    { kind: "typed", query },
    [{ group: "policy", source, query, auto: true }],
    sources,
    dates,
  );
}

/** One lane's search, as the page tracks it; mirrors the single-query state. */
export interface LaneSearch {
  laneId: string;
  sourceId: string;
  state: "loading" | "results" | "empty" | "unavailable" | "not_searched";
  listings: readonly DemoCitation[];
  response?: DemoSearchResponse;
  skip?: SkipReason;
  /** Failure words from the page. */
  reason?: string;
  loadingMore?: boolean;
  pagingStarted?: boolean;
  pageError?: string;
  /** Prior opaque tokens, to stop cycles without interpreting provider syntax. */
  cursors: readonly string[];
}

export function startLane(lane: Lane): LaneSearch {
  return {
    laneId: lane.id,
    sourceId: lane.sourceId,
    state: lane.skip ? "not_searched" : "loading",
    listings: [],
    cursors: [],
    ...(lane.skip && { skip: lane.skip }),
  };
}

/** The lanes sent, or shown as not searched, when the plan starts. */
export function startPlan(plan: Plan): LaneSearch[] {
  return plan.lanes.filter((lane) => lane.auto).map(startLane);
}

/** A first page answered: listings without repeats, results or empty. */
export function settleLane(
  search: LaneSearch,
  response: DemoSearchResponse,
): LaneSearch {
  const seen = new Set<string>();
  const listings = response.results.filter(
    (item) => !seen.has(keyOf(item)) && seen.add(keyOf(item)),
  );
  return {
    ...search,
    state: listings.length ? "results" : "empty",
    listings,
    response,
  };
}

/** A failed first page. `empty` is a missing exact reference, not an outage. */
export function failLane(
  search: LaneSearch,
  reason: string,
  empty = false,
): LaneSearch {
  return { ...search, state: empty ? "empty" : "unavailable", reason };
}

export function listingCap(sourceId: string): number {
  return sourceId === "regulations" ? 200 : 500;
}

/**
 * A further page answered for continuation `sent`. Drops repeats, throws past
 * the listing cap, and stops when the source hands back a cursor already used.
 */
export function appendPage(
  search: LaneSearch,
  response: DemoSearchResponse,
  sent: DemoSearchCursor,
): { readonly search: LaneSearch; readonly added: DemoCitation[] } {
  const seen = new Set(search.listings.map(keyOf));
  const added = response.results.filter(
    (item) => !seen.has(keyOf(item)) && seen.add(keyOf(item)),
  );
  if (search.listings.length + added.length > listingCap(search.sourceId))
    throw new Error("The source exceeded the demo listing limit.");
  const cursors = [...search.cursors, ...(sent.cursor ? [sent.cursor] : [])];
  const next = response.continuation;
  const cycled =
    next.kind === "more" &&
    Boolean(next.next.cursor) &&
    cursors.includes(next.next.cursor!);
  const listings = [...search.listings, ...added];
  return {
    added,
    search: {
      ...search,
      state: listings.length ? "results" : "empty",
      listings,
      response: cycled
        ? { ...response, continuation: { kind: "stopped", reason: "unknown" } }
        : response,
      cursors,
      loadingMore: false,
      pageError: undefined,
    },
  };
}

/** Empty on this page, but the source reports or may hold more. */
export function unresolvedEmpty(search: LaneSearch): boolean {
  if (search.state !== "empty" || !search.response) return false;
  const { total, continuation } = search.response;
  return (
    (total !== null && total > 0) ||
    continuation.kind === "more" ||
    (continuation.kind === "stopped" &&
      (continuation.reason === "unknown" || continuation.reason === "cap"))
  );
}

/** Why a row is shown: the lane that listed it. */
export interface Reason {
  readonly laneId: string;
  readonly group: LaneGroup;
  readonly sourceId: string;
  readonly query: string;
  readonly label: string;
  readonly terms: string;
  readonly collection?: string;
  /** Copied from the lane: a name search, worded apart (safeguard 1). */
  readonly name?: true;
}

export interface DiscoveryRow extends MergedResult {
  /** Every lane that listed this document, in plan order. */
  readonly reasons: readonly Reason[];
  /** The reasons' groups, most specific first; the first is the row's section. */
  readonly groups: readonly LaneGroup[];
}

/**
 * A row's section is its most specific group, so a broad policy lane never
 * takes an opinion or bill that a court or bill lane also listed.
 */
const SPECIFICITY: readonly LaneGroup[] = [
  "case",
  "bill",
  "legislation",
  "policy",
];

function planGroups(plan: Plan): LaneGroup[] {
  return [...new Set(plan.lanes.map((lane) => lane.group))];
}

/**
 * Merge every lane's listings with the single-query identity rules, keeping
 * `previous` row order so loaded pages and lanes run later append at the end.
 * A previous row that no current lane lists is dropped, so every row has a
 * reason and a section.
 */
export function mergeLanes(
  plan: Plan,
  searches: readonly LaneSearch[],
  previous: readonly MergedResult[] = [],
): { readonly rows: DiscoveryRow[]; readonly merged: number } {
  const order = new Map(plan.lanes.map((lane, index) => [lane.id, index]));
  const position = (laneId: string) => {
    const index = order.get(laneId);
    if (index === undefined) throw new Error(`Lane not in plan: ${laneId}`);
    return index;
  };
  const ordered = [...searches].sort(
    (a, b) => position(a.laneId) - position(b.laneId),
  );
  const { results, merged } = appendMergedResults(
    previous,
    ordered.map(({ sourceId, listings }) => ({ sourceId, results: listings })),
  );
  const shownBy = new Map<string, Reason[]>();
  for (const search of ordered) {
    const lane = plan.lanes[position(search.laneId)];
    const reason: Reason = {
      laneId: lane.id,
      group: lane.group,
      sourceId: lane.sourceId,
      query: lane.query,
      label: lane.label,
      terms: lane.terms,
      ...(lane.collection && { collection: lane.collection }),
      ...(lane.name && { name: true as const }),
    };
    for (const citation of search.listings) {
      const reasons = shownBy.get(keyOf(citation)) ?? [];
      if (!reasons.includes(reason)) reasons.push(reason);
      shownBy.set(keyOf(citation), reasons);
    }
  }
  const rows = results
    .map((row): DiscoveryRow => {
      const reasons = [
        ...new Set(
          [row.citation, ...row.alternates].flatMap(
            (citation) => shownBy.get(keyOf(citation)) ?? [],
          ),
        ),
      ].sort((a, b) => position(a.laneId) - position(b.laneId));
      return {
        ...row,
        reasons,
        groups: SPECIFICITY.filter((group) =>
          reasons.some((reason) => reason.group === group),
        ),
      };
    })
    .filter((row) => row.reasons.length > 0);
  return { rows, merged };
}

export interface GroupView {
  readonly group: LaneGroup;
  readonly lanes: readonly {
    readonly lane: Lane;
    readonly search: LaneSearch;
  }[];
  /** Rows whose most specific group is this one, so each document appears once. */
  readonly rows: readonly DiscoveryRow[];
}

/** Results sections in plan order, holding only lanes that were started. */
export function groupDiscovery(
  plan: Plan,
  searches: readonly LaneSearch[],
  rows: readonly DiscoveryRow[],
): GroupView[] {
  const byId = new Map(searches.map((search) => [search.laneId, search]));
  return planGroups(plan)
    .map((group) => ({
      group,
      lanes: plan.lanes
        .filter((lane) => lane.group === group && byId.has(lane.id))
        .map((lane) => ({ lane, search: byId.get(lane.id)! })),
      rows: rows.filter((row) => row.groups[0] === group),
    }))
    .filter((view) => view.lanes.length > 0);
}

/** The only criteria a cached response may be found by. */
export function laneSignature(
  lane: Pick<Lane, "sourceId" | "query">,
  dates: PlanDates,
): string {
  return JSON.stringify([
    lane.sourceId,
    lane.query,
    dates.dateFrom,
    dates.dateTo,
  ]);
}

/**
 * A settled first lane answer worth keeping: a first page, or a definite
 * "no such reference" (failLane's empty). An outage is not an answer, so it is
 * never kept and choosing the seed again asks again.
 */
export type LaneOutcome =
  DemoSearchResponse | { readonly ok: false; readonly missing: string };

/** A kept outcome, settled into a lane search as if it had just answered. */
export function replayLane(
  search: LaneSearch,
  outcome: LaneOutcome,
): LaneSearch {
  return outcome.ok
    ? settleLane(search, outcome)
    : failLane(search, outcome.missing, true);
}

/**
 * Lane outcomes for this tab only: memory, never storage, gone on reload.
 * The Worker keeps no search text, and neither does anything here.
 */
export class LaneCache {
  private readonly entries = new Map<
    string,
    { readonly outcome: LaneOutcome; readonly at: number }
  >();

  constructor(readonly limit = LANE_CACHE_LIMIT) {}

  get size(): number {
    return this.entries.size;
  }

  get(
    lane: Pick<Lane, "sourceId" | "query">,
    dates: PlanDates,
  ): LaneOutcome | undefined {
    const key = laneSignature(lane, dates);
    const hit = this.entries.get(key);
    if (!hit) return undefined;
    this.entries.delete(key);
    // Too old, or kept "later" than now after a clock change: asked again.
    const age = Date.now() - hit.at;
    if (age < 0 || age >= LANE_KEEP_MS) return undefined;
    // Most recently used last, so the oldest is dropped first.
    this.entries.set(key, hit);
    return hit.outcome;
  }

  set(
    lane: Pick<Lane, "sourceId" | "query">,
    dates: PlanDates,
    outcome: LaneOutcome,
  ): void {
    if (outcome.ok && outcome.page !== 1) return;
    const key = laneSignature(lane, dates);
    this.entries.delete(key);
    this.entries.set(key, { outcome, at: Date.now() });
    for (const oldest of this.entries.keys()) {
      if (this.entries.size <= this.limit) break;
      this.entries.delete(oldest);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}
