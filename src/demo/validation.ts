import type {
  DemoCitation,
  DemoPolicyResponse,
  DemoSearchResponse,
  DemoSearchOptions,
  DemoSearchContinuation,
  DemoSource,
  IssueType,
} from "./types";
import {
  MAX_DOCKET_LENGTH,
  RIN_PATTERN,
  nextSearchCursor,
  plainSourceText,
  sameSearchCriteria,
  searchCriteria,
  searchPageLimit,
  validCfrRef,
  validCursorToken,
} from "./search-contract";

const SOURCE_HOSTS: Record<string, readonly string[]> = {
  "federal-register": ["www.federalregister.gov", "www.govinfo.gov"],
  washington: ["lawfilesext.leg.wa.gov", "app.leg.wa.gov", "apps.leg.wa.gov"],
  govinfo: ["www.govinfo.gov"],
  congress: ["www.congress.gov"],
  regulations: ["www.regulations.gov"],
  oregon: ["www.oregonlegislature.gov"],
  idaho: ["legislature.idaho.gov"],
};
const ISSUE_TYPES: readonly IssueType[] = [
  "consultation_language",
  "consultation_absent",
  "tribal_reference",
  "date_or_deadline",
  "cross_reference",
  "status_signal",
];

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid object");
  return value as Record<string, unknown>;
}

export function text(value: unknown, max: number, allowEmpty = false): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!allowEmpty && !value.trim())
  )
    throw new Error("Invalid text");
  return value;
}

function integer(value: unknown, max: number, min = 0): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new Error("Invalid count");
  return value;
}

function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error("Invalid list");
  return value;
}

function timestamp(value: unknown): string {
  const result = text(value, 40);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(result) ||
    !Number.isFinite(Date.parse(result)) ||
    new Date(result).toISOString().slice(0, 10) !== result.slice(0, 10)
  )
    throw new Error("Invalid retrieval date");
  return result;
}

function digest(value: unknown): string {
  const result = text(value, 64);
  if (!/^[a-f0-9]{64}$/.test(result)) throw new Error("Invalid digest");
  return result;
}

function sourceId(value: unknown): string {
  const result = text(value, 40);
  if (!Object.hasOwn(SOURCE_HOSTS, result)) throw new Error("Unknown source");
  return result;
}

function officialUrl(value: unknown, source: string): string {
  const result = text(value, 4096);
  const url = new URL(result);
  // The document prints this string as text, so it must be exactly the address
  // the parser read: no second address after a space, in a query or a fragment.
  // No official address the demo service builds carries a query or a fragment.
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    url.href !== result ||
    !SOURCE_HOSTS[source].includes(url.hostname)
  )
    throw new Error("Invalid official URL");
  return result;
}

export const keyOf = (citation: DemoCitation) =>
  `${citation.sourceId}:${citation.identifier}`;

/** The id accepted by the demo's policy endpoint. */
export function policyId(
  citation: Pick<DemoCitation, "sourceId" | "identifier">,
): string {
  if (citation.sourceId === "federal-register") {
    const match = /FR Doc\. ([A-Za-z0-9-]+)\)?$/.exec(citation.identifier);
    return match ? match[1] : citation.identifier;
  }
  if (citation.sourceId === "washington") {
    const match = /^(HB|SB) (\d+), (\d{4}-\d{2})/.exec(citation.identifier);
    return match ? `${match[1]} ${match[2]} ${match[3]}` : citation.identifier;
  }
  return citation.identifier;
}

function calendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

type CitationFields = Pick<
  DemoCitation,
  | "commentsCloseOn"
  | "commentsCloseWithheld"
  | "docketIds"
  | "rins"
  | "cfrRefs"
  | "topics"
>;

/**
 * The search contract v2 citation fields, parsed leniently for the Worker and
 * the page alike: an absent field stays absent, a malformed field or list item
 * is dropped, every list and string is bounded, and nothing here throws.
 */
export function citationFields(v: {
  readonly commentsCloseOn?: unknown;
  readonly commentsCloseWithheld?: unknown;
  readonly docketIds?: unknown;
  readonly rins?: unknown;
  readonly cfrRefs?: unknown;
  readonly topics?: unknown;
}): CitationFields {
  const strings = (
    value: unknown,
    max: number,
    valid: (item: unknown) => boolean,
  ) =>
    Array.isArray(value)
      ? value.slice(0, max).filter((item): item is string => valid(item))
      : undefined;
  const fields: { -readonly [K in keyof CitationFields]: CitationFields[K] } =
    {};
  if (v.commentsCloseOn === null || calendarDate(v.commentsCloseOn))
    fields.commentsCloseOn = v.commentsCloseOn;
  if (v.commentsCloseWithheld === true) fields.commentsCloseWithheld = true;
  const docketIds = strings(v.docketIds, 20, (item) =>
    plainSourceText(item, MAX_DOCKET_LENGTH),
  );
  if (docketIds) fields.docketIds = docketIds;
  const rins = strings(
    v.rins,
    20,
    (item) => typeof item === "string" && RIN_PATTERN.test(item),
  );
  if (rins) fields.rins = rins;
  if (Array.isArray(v.cfrRefs))
    fields.cfrRefs = v.cfrRefs.slice(0, 50).flatMap((item: unknown) => {
      const ref =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
      return validCfrRef(ref.title, ref.part)
        ? [{ title: ref.title as number, part: ref.part as string }]
        : [];
    });
  const topics = strings(v.topics, 50, (item) => plainSourceText(item, 200));
  if (topics) fields.topics = topics;
  return fields;
}

export function citationValue(value: unknown): DemoCitation {
  const v = object(value);
  const source = sourceId(v.sourceId);
  const date = v.date === null ? null : text(v.date, 10);
  if (date !== null && !calendarDate(date))
    throw new Error("Invalid policy date");
  if (typeof v.textAvailable !== "boolean")
    throw new Error("Invalid text availability");
  // Reports saved before match keys existed carry none.
  const matchKey = v.matchKey ?? null;
  if (
    matchKey !== null &&
    (typeof matchKey !== "string" ||
      !/^fr:[A-Za-z0-9][A-Za-z0-9-]{0,39}$/.test(matchKey))
  )
    throw new Error("Invalid match key");
  return {
    sourceId: source,
    identifier: text(v.identifier, 300),
    title: text(v.title, 4000),
    issuingBody: text(v.issuingBody, 4000),
    kind: text(v.kind, 200),
    date,
    officialUrl: officialUrl(v.officialUrl, source),
    textUrl: v.textUrl === null ? null : officialUrl(v.textUrl, source),
    retrievedAt: timestamp(v.retrievedAt),
    summary: v.summary === null ? null : text(v.summary, 20000, true),
    textAvailable: v.textAvailable,
    matchKey,
    ...citationFields(v),
  };
}

export function sourcesValue(value: unknown): DemoSource[] {
  const v = object(value);
  if (v.ok !== true) throw new Error("Invalid source response");
  const ids = new Set<string>();
  const sources = list(v.sources, 7).map((item): DemoSource => {
    const s = object(item);
    const id = sourceId(s.id);
    if (ids.has(id)) throw new Error("Duplicate source");
    ids.add(id);
    if (s.level !== "federal" && s.level !== "state")
      throw new Error("Invalid source level");
    if (
      s.status !== "live" &&
      s.status !== "key_pending" &&
      s.status !== "not_available" &&
      s.status !== "unknown"
    )
      throw new Error("Invalid source status");
    return {
      id,
      label: text(s.label, 200),
      level: s.level,
      status: s.status,
      note: text(s.note, 2000, true),
    };
  });
  if (!sources.length) throw new Error("Empty source catalog");
  return sources;
}

export function searchValue(
  value: unknown,
  source: string,
  query: string,
  page: number,
  options?: DemoSearchOptions,
): DemoSearchResponse {
  const v = object(value);
  const criteria = searchCriteria(source, query, page, options);
  if (
    v.ok !== true ||
    v.source !== source ||
    v.query !== query ||
    v.page !== page
  )
    throw new Error("Search response does not match request");
  let continuation: DemoSearchContinuation;
  if (v.criteria === undefined && options === undefined && page === 1) {
    continuation = { kind: "stopped", reason: "unknown" };
  } else {
    if (!sameSearchCriteria(v.criteria, criteria))
      throw new Error("Search criteria do not match request");
    const next = object(v.continuation);
    if (next.kind === "more") {
      const envelope = object(next.next);
      const cursor = source === "govinfo" ? envelope.cursor : null;
      if (
        page >= searchPageLimit(source) ||
        (source === "govinfo" &&
          (!validCursorToken(cursor) ||
            cursor === "*" ||
            cursor === criteria.cursor)) ||
        !sameSearchCriteria(
          envelope,
          nextSearchCursor(criteria, cursor as string | null),
        )
      )
        throw new Error("Invalid search continuation");
      continuation = {
        kind: "more",
        next: nextSearchCursor(criteria, cursor as string | null),
      };
    } else if (
      next.kind === "stopped" &&
      ["complete", "cap", "unknown", "not_applicable"].includes(
        String(next.reason),
      ) &&
      (next.reason !== "cap" || page === searchPageLimit(source)) &&
      (next.reason !== "not_applicable" ||
        ["congress", "washington"].includes(source)) &&
      (source !== "govinfo" || next.reason !== "complete")
    ) {
      continuation = {
        kind: "stopped",
        reason: next.reason as
          "complete" | "cap" | "unknown" | "not_applicable",
      };
    } else throw new Error("Invalid search continuation");
  }
  const ids = new Set<string>();
  const results = list(v.results, 10).map((item) => {
    const citation = citationValue(item);
    if (citation.sourceId !== source || ids.has(keyOf(citation)))
      throw new Error("Invalid search result identity");
    ids.add(keyOf(citation));
    return citation;
  });
  return {
    ok: true,
    source,
    query,
    page,
    criteria,
    continuation,
    results,
    total: v.total === null ? null : integer(v.total, Number.MAX_SAFE_INTEGER),
    retrievedAt: timestamp(v.retrievedAt),
  };
}

export function policyValue(
  value: unknown,
  expected?: { source: string; id: string },
): DemoPolicyResponse {
  const v = object(value);
  if (v.ok !== true) throw new Error("Invalid policy response");
  const citation = citationValue(v.citation);
  if (
    expected &&
    (citation.sourceId !== expected.source ||
      policyId(citation) !== expected.id)
  )
    throw new Error("Policy response does not match request");
  const r = object(v.receipt);
  const receipt = {
    sha256: digest(r.sha256),
    bytes: integer(r.bytes, 1_500_000, 1),
    retrievedAt: timestamp(r.retrievedAt),
    textUrl: officialUrl(r.textUrl, citation.sourceId),
  };
  if (!citation.textAvailable || citation.textUrl !== receipt.textUrl)
    throw new Error("Citation and receipt do not match");
  const e = object(v.engine);
  const engine = {
    parser: text(e.parser, 200),
    parserVersion: text(e.parserVersion, 100),
    parserConfigDigest: digest(e.parserConfigDigest),
    rulesVersion: text(e.rulesVersion, 100),
  };
  const ids = new Set<string>();
  const issues = list(v.issues, 100).map((item) => {
    const i = object(item);
    const type = text(i.type, 40) as IssueType;
    const id = text(i.id, 100);
    if (!ISSUE_TYPES.includes(type) || ids.has(id) || !/^[a-z_]+-\d+$/.test(id))
      throw new Error("Invalid issue identity");
    ids.add(id);
    return {
      id,
      type,
      label: text(i.label, 300),
      quote: text(i.quote, 4000),
      locator: text(i.locator, 4000),
      rule: text(i.rule, 4000),
      limits: text(i.limits, 4000),
      check: text(i.check, 4000),
    };
  });
  return {
    ok: true,
    citation,
    receipt,
    engine,
    issues,
    blockCount: integer(v.blockCount, 1_500_000, 1),
    characterCount: integer(v.characterCount, 10_000_000, 1),
    exclusions: list(v.exclusions, 100).map((item) => {
      const x = object(item);
      return {
        reason: text(x.reason, 1000),
        count: integer(x.count, 1_500_000),
      };
    }),
    warnings: list(v.warnings, 100).map((warning) => text(warning, 2000)),
    opening: text(v.opening, 4000, true),
  };
}
