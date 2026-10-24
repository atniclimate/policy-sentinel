/**
 * Following: a docket, a RIN or a document the person chose to look up again
 * later. The list lives in this browser only (and in a file the person exports);
 * nothing is sent until the person presses Check for new, and then only the
 * exact identifier lookups Find related already uses, in the source that stated
 * each identifier. Everything here is pure; the page owns storage and requests.
 */
import { laneKeep, laneOptions, recordPlan } from "./discovery";
import type { Lane, PlanDates } from "./discovery";
import { searchCriteria } from "./search-contract";
import type { DemoCitation, DemoSearchResponse } from "./types";
import { citationValue, keyOf, object, text } from "./validation";

export const FOLLOW_KEY = "ps-demo-following-v1";
export const FOLLOW_VERSION = 1;
export const MAX_FOLLOWED = 50;
/** Far above 50 items with their records; a larger file is refused unread. */
export const MAX_FOLLOW_FILE = 1_000_000;

export type FollowKind = "docket" | "rin" | "document";
const KINDS: readonly FollowKind[] = ["docket", "rin", "document"];
const FIELDS = [
  "id",
  "sourceId",
  "kind",
  "value",
  "record",
  "followedAt",
  "lastChecked",
];

export interface Followed {
  /** Source, kind and value, so a docket and a RIN with the same text never collide. */
  readonly id: string;
  readonly sourceId: string;
  readonly kind: FollowKind;
  /** The docket or RIN as the source spells it, or the document's identifier. */
  readonly value: string;
  /** The official record it was followed from: its identifiers drive the lookups. */
  readonly record: DemoCitation;
  readonly followedAt: string;
  /** When Check for new last answered for every lookup; null before the first. */
  readonly lastChecked: string | null;
}

export const followId = (sourceId: string, kind: FollowKind, value: string) =>
  `${sourceId}#${kind}:${value}`;

/**
 * The exact identifier lookups for an item, as Find related plans them for its
 * record: a docket or RIN its own lookup, a document every identifier its source
 * stated. Only lookups the source can take as written are kept.
 * shortcut: a document past the request budget follows its first identifiers only; upgrade if a record states more than ten.
 */
export function followLookups(
  item: Pick<Followed, "kind" | "value" | "record">,
): Lane[] {
  const { sourceId } = item.record;
  const plan = recordPlan(item.record, { federal: [], live: [sourceId] });
  return plan.lanes.filter((lane) => {
    if (lane.skip) return false;
    if (item.kind !== "document")
      if (lane.match !== item.kind || lane.query !== item.value) return false;
    try {
      searchCriteria(sourceId, lane.query, 1, laneOptions(plan, lane));
      return true;
    } catch {
      return false;
    }
  });
}

/** A new item, or null when the record offers no lookup for it. */
export function followItem(
  record: DemoCitation,
  kind: FollowKind,
  value: string,
  now: Date,
): Followed | null {
  const item: Followed = {
    id: followId(record.sourceId, kind, value),
    sourceId: record.sourceId,
    kind,
    value,
    // The summary is not needed to look anything up, so it is not kept.
    record: { ...record, summary: null },
    followedAt: now.toISOString(),
    lastChecked: null,
  };
  return followLookups(item).length ? item : null;
}

/** Adds once; a full list or a repeat comes back unchanged. */
export function addFollow(
  list: readonly Followed[],
  item: Followed,
): readonly Followed[] {
  if (list.length >= MAX_FOLLOWED || list.some((each) => each.id === item.id))
    return list;
  return [...list, item];
}

export const removeFollow = (list: readonly Followed[], id: string) =>
  list.filter((item) => item.id !== id);

function instant(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  )
    throw new Error("Invalid time");
  return value;
}

/** One stored or imported item, rebuilt field by field; anything else throws. */
function followedValue(value: unknown): Followed {
  const v = object(value);
  if (Object.keys(v).some((key) => !FIELDS.includes(key)))
    throw new Error("Unknown followed field");
  const kind = v.kind as FollowKind;
  if (!KINDS.includes(kind)) throw new Error("Unknown followed kind");
  const record = citationValue(v.record);
  const stated = text(v.value, 300);
  const listed =
    kind === "document"
      ? record.identifier === stated
      : (kind === "docket" ? record.docketIds : record.rins)?.includes(stated);
  if (
    v.sourceId !== record.sourceId ||
    !listed ||
    v.id !== followId(record.sourceId, kind, stated)
  )
    throw new Error("Followed item does not match its record");
  const item: Followed = {
    id: followId(record.sourceId, kind, stated),
    sourceId: record.sourceId,
    kind,
    value: stated,
    record,
    followedAt: instant(v.followedAt),
    lastChecked: v.lastChecked === null ? null : instant(v.lastChecked),
  };
  if (followLookups(item).length === 0)
    throw new Error("Followed item has no lookup");
  return item;
}

/** The stored and exported shape: a version and the items, nothing else. */
export function serializeFollows(list: readonly Followed[]): string {
  return JSON.stringify({ version: FOLLOW_VERSION, followed: list }, null, 2);
}

/** Throws on an unknown file shape; reports items that did not validate. */
function readFollows(raw: string): { list: Followed[]; damaged: boolean } {
  if (raw.length > MAX_FOLLOW_FILE) throw new Error("Followed list too large");
  const saved = object(JSON.parse(raw));
  if (
    saved.version !== FOLLOW_VERSION ||
    !Array.isArray(saved.followed) ||
    Object.keys(saved).length !== 2
  )
    throw new Error("Unknown followed list");
  const list: Followed[] = [];
  let damaged = saved.followed.length > MAX_FOLLOWED;
  for (const value of saved.followed.slice(0, MAX_FOLLOWED)) {
    try {
      const item = followedValue(value);
      if (list.some((each) => each.id === item.id)) damaged = true;
      else list.push(item);
    } catch {
      damaged = true;
    }
  }
  return { list, damaged };
}

export type FollowRestore = "ok" | "partial" | "failed";

/** Browser storage: valid items survive partial damage. */
export function restoreFollows(raw: string | null): {
  list: Followed[];
  restored: FollowRestore;
} {
  if (raw === null) return { list: [], restored: "ok" };
  try {
    const { list, damaged } = readFollows(raw);
    return { list, restored: damaged ? "partial" : "ok" };
  } catch {
    return { list: [], restored: "failed" };
  }
}

/**
 * An imported file crosses a trust boundary, so it is taken whole or not at
 * all. Items already followed keep their own dates; new ones are added up to
 * the limit.
 */
export function importFollows(
  current: readonly Followed[],
  raw: string,
): {
  list: readonly Followed[];
  added: number;
  already: number;
  dropped: number;
} | null {
  let incoming: Followed[];
  try {
    const read = readFollows(raw);
    if (read.damaged) return null;
    incoming = read.list;
  } catch {
    return null;
  }
  let list = current;
  let added = 0;
  let already = 0;
  let dropped = 0;
  for (const item of incoming) {
    if (list.some((each) => each.id === item.id)) already++;
    else if (list.length >= MAX_FOLLOWED) dropped++;
    else {
      list = [...list, item];
      added++;
    }
  }
  return { list, added, already, dropped };
}

/**
 * Items for one Check for new, oldest check first, within the request budget.
 * The rest wait for the next press, so the oldest go first again.
 */
export function checkBatch(
  list: readonly Followed[],
  budget: number,
): { now: Followed[]; later: Followed[] } {
  const order = [...list].sort((a, b) =>
    (a.lastChecked ?? "").localeCompare(b.lastChecked ?? ""),
  );
  const now: Followed[] = [];
  let requests = 0;
  for (const item of order) {
    const cost = followLookups(item).length;
    if (requests + cost > budget) break;
    requests += cost;
    now.push(item);
  }
  return { now, later: order.slice(now.length) };
}

/** Sources whose lookups take a publication or posted date range. */
const DATED = new Set(["federal-register", "regulations"]);

/** The reader's calendar day for an instant, as YYYY-MM-DD; stored times stay UTC. */
export function localDay(value: string | Date): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The day new documents are counted from: the last check, or the day it was followed. */
export function sinceDay(item: Followed, now: Date): string {
  const since = localDay(item.lastChecked ?? item.followedAt);
  const today = localDay(now);
  // A clock set back never asks for a range that ends before it starts.
  return since > today ? today : since;
}

/**
 * What a lookup is sent with: the date floor at the last check where the source
 * takes a date range, no type filter.
 * shortcut: day granularity, so a document published on the day last checked is shown again rather than missed.
 */
export function checkDates(item: Followed, now: Date): PlanDates {
  if (!DATED.has(item.sourceId))
    return { dateFrom: null, dateTo: null, documentType: null };
  return {
    dateFrom: sinceDay(item, now),
    dateTo: now.toISOString().slice(0, 10),
    documentType: null,
  };
}

export type FollowAnswer =
  | { readonly ok: true; readonly response: DemoSearchResponse }
  | { readonly ok: false; readonly reason: string };

export type FollowCheck =
  | { readonly state: "checking" }
  /** Held back by the request budget this time. */
  | { readonly state: "waiting" }
  /** A lookup failed: nothing is established, and lastChecked stays. */
  | { readonly state: "unavailable"; readonly reason: string }
  | {
      readonly state: "checked";
      readonly since: string;
      readonly fresh: readonly DemoCitation[];
      /** Listings that state no date, so none is called new. */
      readonly undated: number;
      /** A source holds more than its first page. */
      readonly more: boolean;
    };

/**
 * Settles one item from its lookups' answers, in followLookups order. Any
 * failure makes the item unavailable, never "nothing new". Only listings that
 * state the identifier count, the record it was followed from never does, and
 * a listing is new when its stated date is on or after the day counted from.
 */
export function settleCheck(
  item: Followed,
  answers: readonly FollowAnswer[],
  now: Date,
): { check: FollowCheck; item: Followed } {
  const lanes = followLookups(item);
  const failed = answers.find(
    (answer): answer is Extract<FollowAnswer, { ok: false }> => !answer.ok,
  );
  if (failed)
    return { check: { state: "unavailable", reason: failed.reason }, item };
  if (answers.length !== lanes.length)
    throw new Error("Each lookup needs one answer");
  const since = sinceDay(item, now);
  const seen = new Set([keyOf(item.record)]);
  const fresh: DemoCitation[] = [];
  let undated = 0;
  let more = false;
  answers.forEach((answer, index) => {
    if (!answer.ok) return;
    const keep = laneKeep(lanes[index])!;
    if (answer.response.continuation.kind === "more") more = true;
    for (const listing of answer.response.results) {
      if (!keep(listing) || seen.has(keyOf(listing))) continue;
      seen.add(keyOf(listing));
      if (listing.date === null) undated++;
      else if (listing.date >= since) fresh.push(listing);
    }
  });
  return {
    check: { state: "checked", since, fresh, undated, more },
    // Listings past the loaded page are unseen, so the next check counts from the same day.
    item: more ? item : { ...item, lastChecked: now.toISOString() },
  };
}
