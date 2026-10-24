/**
 * Seeded discovery: a seed (an NCAI draft, a typed search, a committee area or
 * an official record) becomes a plan of lanes, one source and one query each.
 * The page sends the automatic lanes within a request budget, and Results shows
 * the merged rows by group, each row with every reason it was shown and each
 * lane with its outcome.
 *
 * Everything here is pure. The page owns requests, AbortController and sequence
 * ownership, and turns each skip reason code into words.
 */
import { appendMergedResults, isCongressReference } from "./merge";
import type { MergedResult } from "./merge";
import {
  cfrQuery,
  documentTypeFilter,
  parseCfrQuery,
  searchCriteria,
  supportsDatedGovinfoQuery,
} from "./search-contract";
import type {
  DemoCitation,
  DemoSearchCursor,
  DemoSearchMatch,
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

/**
 * Results sections, in display order. Name searches are not a group. "related"
 * holds a record's exact-identifier lanes (Find related), after "case".
 */
export type LaneGroup = "policy" | "legislation" | "bill" | "case" | "related";

/** An identifier kind a lane matches exactly; absent means free text. */
export type LaneMatch = Exclude<DemoSearchMatch, "text">;

/**
 * What a plan grows from. A draft seed holds its ID only; the page supplies the
 * title it shows. A record seed is an official record's own identity.
 */
export type Seed =
  | { readonly kind: "draft"; readonly id: string }
  | { readonly kind: "typed"; readonly query: string }
  | { readonly kind: "area"; readonly label: string }
  | {
      readonly kind: "record";
      readonly sourceId: string;
      readonly identifier: string;
    };

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
  /** An exact identifier in `query`, as `source` itself spells it. */
  readonly match?: LaneMatch;
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
  | "grants_dates"
  | "budget";

export interface Lane {
  /**
   * sourceId, identifier kind and query, so two GovInfo lanes, or a docket and
   * a RIN with the same text, never collide.
   */
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
  /** An exact identifier in `query`; the lane is sent with that match. */
  readonly match?: LaneMatch;
  /**
   * The plan has a type filter this source has no equivalent for, so the lane
   * runs without it and the page states "type filter not applied".
   */
  readonly typeNotApplied?: true;
}

/** Dates, the document type filter (null or absent: any type) and the Grants.gov eligibility filter. */
export type PlanDates = Pick<
  DemoSearchOptions,
  "dateFrom" | "dateTo" | "documentType" | "eligibility"
>;

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

/** A text lane keeps its 0.8.0 id; source ids hold no "#", so no text id collides. */
export const laneId = (
  sourceId: string,
  query: string,
  match?: LaneMatch,
): string => (match ? `${sourceId}#${match}:${query}` : `${sourceId}:${query}`);

/**
 * The search options a lane is sent with, first page or `continuation`. Every
 * lane opts in to contract v2; the type filter goes only where the source has
 * an equivalent, the eligibility filter only to Grants.gov, and the plan's
 * dates always go.
 */
export function laneOptions(
  plan: PlanDates,
  lane: Pick<Lane, "sourceId" | "match" | "typeNotApplied">,
  continuation: DemoSearchCursor | null = null,
): DemoSearchOptions {
  return {
    dateFrom: plan.dateFrom,
    dateTo: plan.dateTo,
    continuation,
    version: 2,
    match: lane.match ?? "text",
    documentType: lane.typeNotApplied ? null : (plan.documentType ?? null),
    ...(lane.sourceId === "grants" &&
      plan.eligibility && { eligibility: plan.eligibility }),
  };
}

/** Whether a lane's source can take its query as written; Find related and Follow both ask this. */
export function lookupReady(
  plan: PlanDates,
  lane: Pick<Lane, "sourceId" | "query" | "match" | "typeNotApplied">,
): boolean {
  try {
    searchCriteria(lane.sourceId, lane.query, 1, laneOptions(plan, lane));
    return true;
  } catch {
    return false;
  }
}

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
  if (sourceId === "grants" && dates.dateFrom) return "grants_dates";
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
      const id = laneId(sourceId, search.query, search.match);
      if (seen.has(id)) continue;
      seen.add(id);
      let skip = skipReason(sourceId, search.query, sources, dates);
      if (auto && !skip && ++requests > AUTO_REQUEST_BUDGET) skip = "budget";
      const typeNotApplied =
        Boolean(dates.documentType) &&
        documentTypeFilter(sourceId, dates.documentType!) === null;
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
        ...(search.match && { match: search.match }),
        ...(typeNotApplied && { typeNotApplied: true as const }),
      });
    }
  }
  return { seed, ...dates, lanes };
}

/**
 * Find related: one automatic lane per exact identifier the record's own source
 * stated, searched only in that source and in its spelling. Federal Register
 * dockets, RINs and CFR parts go to the Federal Register; a Regulations.gov
 * docket goes to Regulations.gov. Nothing is rewritten into another source's
 * format, and no words are matched. Identifier lists past the request budget
 * stay as buttons, marked "budget". Other sources state no identifiers here,
 * so their plan has no lanes.
 */
export function recordPlan(
  citation: DemoCitation,
  sources: PlanSources,
  dates: PlanDates = NO_DATES,
): Plan {
  const { sourceId } = citation;
  const lane = (
    match: LaneMatch,
    query: string,
    label: string,
  ): PlanSearch => ({
    group: "related",
    source: sourceId,
    query,
    label,
    terms: query,
    auto: true,
    match,
  });
  const searches: PlanSearch[] =
    sourceId === "federal-register"
      ? [
          ...(citation.docketIds ?? []).map((id) =>
            lane("docket", id, `Same docket: ${id} (Federal Register)`),
          ),
          ...(citation.rins ?? []).map((rin) =>
            lane("rin", rin, `Same RIN: ${rin}`),
          ),
          ...(citation.cfrRefs ?? [])
            .filter((ref) => parseCfrQuery(cfrQuery(ref)))
            .map((ref) =>
              lane("cfr", cfrQuery(ref), `Same CFR part: ${cfrQuery(ref)}`),
            ),
        ]
      : sourceId === "regulations"
        ? (citation.docketIds ?? []).map((id) =>
            lane("docket", id, `Same docket: ${id} (Regulations.gov)`),
          )
        : [];
  return buildPlan(
    { kind: "record", sourceId, identifier: citation.identifier },
    searches,
    sources,
    dates,
  );
}

/** The listing's own source fields state the identifier a lookup searched for. */
export function statesIdentifier(
  citation: DemoCitation,
  match: LaneMatch,
  query: string,
): boolean {
  if (match === "docket") return citation.docketIds?.includes(query) ?? false;
  if (match === "rin") return citation.rins?.includes(query) ?? false;
  return citation.cfrRefs?.some((ref) => cfrQuery(ref) === query) ?? false;
}

/**
 * What an identifier lookup keeps: only listings that state the identifier
 * themselves. Other lanes keep everything (undefined).
 */
export function laneKeep(
  lane: Pick<Lane, "match" | "query">,
): ((citation: DemoCitation) => boolean) | undefined {
  const { match, query } = lane;
  return match
    ? (citation) => statesIdentifier(citation, match, query)
    : undefined;
}

/** A row is the record Find related started from, listed again by its own identifiers. */
export const isSeedRecord = (seed: Seed, row: MergedResult): boolean =>
  seed.kind === "record" &&
  [row.citation, ...row.alternates].some(
    (c) => c.sourceId === seed.sourceId && c.identifier === seed.identifier,
  );

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
  /** Listings the source returned that an identifier lookup left out (safeguard 8). */
  leftOut?: number;
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
  keep?: (citation: DemoCitation) => boolean,
): LaneSearch {
  const seen = new Set<string>();
  const distinct = response.results.filter(
    (item) => !seen.has(keyOf(item)) && seen.add(keyOf(item)),
  );
  const listings = keep ? distinct.filter(keep) : distinct;
  return {
    ...search,
    state: listings.length ? "results" : "empty",
    listings,
    response,
    ...(keep && { leftOut: distinct.length - listings.length }),
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
  keep?: (citation: DemoCitation) => boolean,
): { readonly search: LaneSearch; readonly added: DemoCitation[] } {
  const seen = new Set(search.listings.map(keyOf));
  const distinct = response.results.filter(
    (item) => !seen.has(keyOf(item)) && seen.add(keyOf(item)),
  );
  const added = keep ? distinct.filter(keep) : distinct;
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
      ...(keep && {
        leftOut: (search.leftOut ?? 0) + distinct.length - added.length,
      }),
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
  /** Copied from the lane: the identifier kind matched exactly. */
  readonly match?: LaneMatch;
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
  // An exact identifier match is narrower than any words searched.
  "related",
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
  // Identifier lookups already hold only listings that state the identifier
  // (laneKeep, applied as each answer settles), so counts match the rows.
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
      ...(lane.match && { match: lane.match }),
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

/** The lane fields a cached answer depends on. */
export type LaneKey = Pick<
  Lane,
  "sourceId" | "query" | "match" | "typeNotApplied"
>;

/**
 * The only criteria a cached response may be found by: what the lane is sent
 * with, so answers never cross identifier kinds or type filters. Pass the plan
 * as `dates`, so its type filter is included.
 */
export function laneSignature(lane: LaneKey, dates: PlanDates): string {
  const sent = laneOptions(dates, lane);
  return JSON.stringify([
    lane.sourceId,
    lane.query,
    sent.dateFrom,
    sent.dateTo,
    sent.match,
    sent.documentType,
    sent.eligibility ?? null,
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
  keep?: (citation: DemoCitation) => boolean,
): LaneSearch {
  return outcome.ok
    ? settleLane(search, outcome, keep)
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

  get(lane: LaneKey, dates: PlanDates): LaneOutcome | undefined {
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

  set(lane: LaneKey, dates: PlanDates, outcome: LaneOutcome): void {
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
