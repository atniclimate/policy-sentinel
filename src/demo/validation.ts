import type {
  CongressRelatedBills,
  DemoCitation,
  DemoPolicyResponse,
  DemoSearchResponse,
  DemoSearchOptions,
  DemoSearchContinuation,
  DemoSource,
  GovInfoRelatedRecords,
  GovInfoRelations,
  IssueType,
  LinkFamily,
} from "./types";
import { LINK_NOTICES, linkLabel } from "./link-labels.ts";
import { withheldRowsNote, type ChainRow } from "./links.ts";
import { hasPersonalPattern } from "./personal-guard.ts";
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
  "govinfo-courts": ["www.govinfo.gov"],
  congress: ["www.congress.gov"],
  regulations: ["www.regulations.gov"],
  grants: ["www.grants.gov"],
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
  | "applicationsCloseOn"
  | "listedEligibility"
  | "court"
  | "docketNumber"
  | "packageId"
  | "lastModified"
  | "caseCitationProvided"
  | "assistanceListings"
  | "authorityPassage"
  | "versionDate"
  | "correctionOf"
  | "corrections"
  | "authorityLine"
  | "authorityLinePresent"
>;

/** Field names search contract v3 adds (design section 3 T1.1 rule 3). */
const V3_FIELDS = [
  "court",
  "docketNumber",
  "packageId",
  "lastModified",
  "caseCitationProvided",
  "assistanceListings",
  "authorityPassage",
  "versionDate",
  "correctionOf",
  "corrections",
  "authorityLine",
  "authorityLinePresent",
] as const;

/**
 * The search contract v2 and v3 citation fields, parsed leniently for the
 * Worker and the page alike: an absent field stays absent, a malformed field
 * or list item is dropped, every list and string is bounded, and nothing
 * here throws except a v3-only field on a version 1 or 2 answer.
 */
export function citationFields(
  v: {
    readonly commentsCloseOn?: unknown;
    readonly commentsCloseWithheld?: unknown;
    readonly docketIds?: unknown;
    readonly rins?: unknown;
    readonly cfrRefs?: unknown;
    readonly topics?: unknown;
    readonly applicationsCloseOn?: unknown;
    readonly listedEligibility?: unknown;
    readonly court?: unknown;
    readonly docketNumber?: unknown;
    readonly packageId?: unknown;
    readonly lastModified?: unknown;
    readonly caseCitationProvided?: unknown;
    readonly assistanceListings?: unknown;
    readonly authorityPassage?: unknown;
    readonly versionDate?: unknown;
    readonly correctionOf?: unknown;
    readonly corrections?: unknown;
    readonly authorityLine?: unknown;
    readonly authorityLinePresent?: unknown;
  },
  version: 1 | 2 | 3 = 3,
): CitationFields {
  if (version !== 3 && V3_FIELDS.some((key) => v[key] !== undefined))
    throw new Error(
      `Search contract v3 citation fields on a version ${version} answer`,
    );
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
  if (calendarDate(v.applicationsCloseOn))
    fields.applicationsCloseOn = v.applicationsCloseOn;
  if (v.listedEligibility === "tribal") fields.listedEligibility = "tribal";
  if (version !== 3) return fields;
  if (typeof v.court === "string" && plainSourceText(v.court, 10))
    fields.court = v.court;
  if (
    typeof v.docketNumber === "string" &&
    plainSourceText(v.docketNumber, MAX_DOCKET_LENGTH)
  )
    fields.docketNumber = v.docketNumber;
  if (typeof v.packageId === "string" && plainSourceText(v.packageId, 120))
    fields.packageId = v.packageId;
  if (
    typeof v.lastModified === "string" &&
    plainSourceText(v.lastModified, 40) &&
    Number.isFinite(Date.parse(v.lastModified))
  )
    fields.lastModified = v.lastModified;
  if (typeof v.caseCitationProvided === "boolean")
    fields.caseCitationProvided = v.caseCitationProvided;
  if (Array.isArray(v.assistanceListings))
    fields.assistanceListings = v.assistanceListings
      .slice(0, 50)
      .flatMap((item: unknown) => {
        const listing =
          item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : {};
        return plainSourceText(listing.number, 20) &&
          plainSourceText(listing.title, 400)
          ? [{ number: listing.number, title: listing.title }]
          : [];
      });
  if (v.authorityPassage && typeof v.authorityPassage === "object") {
    const passage = v.authorityPassage as Record<string, unknown>;
    if (
      plainSourceText(passage.text, 4000) &&
      plainSourceText(passage.heading, 200) &&
      plainSourceText(passage.locator, 500)
    )
      fields.authorityPassage = {
        text: passage.text,
        heading: passage.heading,
        locator: passage.locator,
      };
  }
  if (calendarDate(v.versionDate)) fields.versionDate = v.versionDate;
  if (
    typeof v.correctionOf === "string" &&
    plainSourceText(v.correctionOf, 100)
  )
    fields.correctionOf = v.correctionOf;
  const corrections = strings(v.corrections, 50, (item) =>
    plainSourceText(item, 100),
  );
  if (corrections) fields.corrections = corrections;
  if (
    typeof v.authorityLine === "string" &&
    plainSourceText(v.authorityLine, 2000)
  )
    fields.authorityLine = v.authorityLine;
  if (typeof v.authorityLinePresent === "boolean")
    fields.authorityLinePresent = v.authorityLinePresent;
  return fields;
}

/**
 * `version` gates the search contract v3 citation fields: pass the search
 * criteria version where it is known (searchValue does); other callers
 * (follow.ts, report-state.ts) read back an already-validated citation and
 * default to the most permissive version.
 */
export function citationValue(
  value: unknown,
  version: 1 | 2 | 3 = 3,
): DemoCitation {
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
    ...citationFields(v, version),
  };
}

export function sourcesValue(value: unknown, max = 8): DemoSource[] {
  const v = object(value);
  if (v.ok !== true) throw new Error("Invalid source response");
  const ids = new Set<string>();
  const sources = list(v.sources, max).map((item): DemoSource => {
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

/**
 * GET /api/sources?version=2: the same entries plus keyed later sources such
 * as "govinfo-courts". A Worker that predates version 2 answers the plain
 * catalog (no version field), which reads the same way without them.
 */
export function sourcesValueV2(value: unknown): DemoSource[] {
  const v = object(value);
  if (v.version !== undefined && v.version !== 2)
    throw new Error("Invalid source catalog version");
  return sourcesValue(v, 16);
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
        ["congress", "washington"].includes(source) ||
        // A court docket or U.S. Reports lookup names one record; paging does not apply.
        (source === "govinfo-courts" &&
          criteria.version === 3 &&
          (criteria.match === "court_docket" ||
            criteria.match === "us_reports"))) &&
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
    const citation = citationValue(item, criteria.version);
    if (citation.sourceId !== source || ids.has(keyOf(citation)))
      throw new Error("Invalid search result identity");
    // A row may say it was found by the eligibility filter only when the filter was sent.
    if (
      citation.listedEligibility &&
      !(criteria.version === 2 && criteria.eligibility === "tribal")
    )
      throw new Error("Invalid eligibility statement");
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

/** The Worker's cap on chain rows in one version 3 policy answer. */
const CHAIN_MAX = 200;
/** The official hosts a citation_in_text target may link to (links.ts targetOf). */
const CHAIN_TARGET_HOSTS: Readonly<Record<string, string | null>> = {
  "usc-index": "uscode.house.gov",
  "cfr-index": "www.ecfr.gov",
  govinfo: "www.govinfo.gov",
  "federal-register": "www.federalregister.gov",
  washington: "app.leg.wa.gov",
  oregon: null,
  idaho: null,
  "govinfo-courts": null,
};
const LINK_FAMILIES: readonly LinkFamily[] = [
  "rules_and_notices",
  "laws_and_bills",
  "cases",
  "grants",
  "state",
  "intertribal",
];

/** One citation_in_text row of a version 3 policy answer, closed and rebuilt. */
function chainRowValue(value: unknown, citation: DemoCitation): ChainRow {
  const r = object(value);
  if (r.section !== "inText" || r.quote !== null)
    throw new Error("Invalid chain row");
  const sourceWording = text(r.sourceWording, 500);
  // The row's provenance is the record's own, as recordProvenance states it.
  const provenance = {
    sourceName: text(r.sourceName, 200),
    asOfLabel: "published",
    asOfText: text(r.asOfText, 100),
    asOfField: null,
    retrievedAt: citation.retrievedAt,
    stale: false,
    liveUrl: citation.officialUrl,
  } as const;
  if (
    r.asOfLabel !== "published" ||
    r.asOfField !== null ||
    r.retrievedAt !== citation.retrievedAt ||
    r.stale !== false ||
    r.liveUrl !== citation.officialUrl
  )
    throw new Error("Invalid chain row provenance");
  if (r.kind === "note") {
    const label = text(r.label, 600);
    if (
      r.notice !== LINK_NOTICES.shortForm ||
      !label.startsWith(linkLabel("short_form", "forward"))
    )
      throw new Error("Invalid chain note");
    return {
      kind: "note",
      section: "inText",
      label,
      notice: LINK_NOTICES.shortForm,
      quote: null,
      sourceWording,
      ...provenance,
    };
  }
  const locator = text(r.locator, 500);
  const label = linkLabel("citation_in_text", "forward", locator);
  if (
    r.kind !== "link" ||
    r.basis !== "citation_in_text" ||
    r.labelId !== "citation_in_text" ||
    r.direction !== "forward" ||
    r.label !== label ||
    !LINK_FAMILIES.includes(r.family as LinkFamily)
  )
    throw new Error("Invalid chain link");
  const t = object(r.target);
  const targetSource = text(t.sourceId, 40);
  if (!Object.hasOwn(CHAIN_TARGET_HOSTS, targetSource))
    throw new Error("Invalid chain target");
  const host = CHAIN_TARGET_HOSTS[targetSource];
  let url: string | undefined;
  if (t.officialUrl !== undefined) {
    url = text(t.officialUrl, 2000);
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== host ||
      parsed.username ||
      parsed.password ||
      parsed.port ||
      parsed.hash ||
      parsed.href !== url
    )
      throw new Error("Invalid chain link URL");
  }
  // A target with no live source carries the notice instead of a link.
  if ((url === undefined) !== (r.notice === LINK_NOTICES.notLive))
    throw new Error("Invalid chain link notice");
  return {
    kind: "link",
    section: "inText",
    basis: "citation_in_text",
    labelId: "citation_in_text",
    direction: "forward",
    label,
    target: {
      sourceId: targetSource,
      identifier: text(t.identifier, 300),
      ...(url && { officialUrl: url }),
    },
    targetText: text(r.targetText, 300),
    family: r.family as LinkFamily,
    sourceWording,
    locator,
    quote: null,
    notice: url ? null : LINK_NOTICES.notLive,
    ...provenance,
  };
}

/**
 * GET /api/policy with version=3 (Federal Register and Washington): the
 * version 1 answer plus its citation_in_text chain rows. An answer with no
 * version field (a Worker that predates version 3) reads as version 1.
 */
export function policyValueV3(
  value: unknown,
  expected?: { source: string; id: string },
): DemoPolicyResponse {
  const v = object(value);
  const read = policyValue(v, expected);
  // The guard again, page side, so an answer cached before a guard change is still checked.
  const { authorityLine, ...rest } = read.citation;
  const base =
    authorityLine !== undefined && hasPersonalPattern(authorityLine)
      ? { ...read, citation: rest }
      : read;
  if (v.version === undefined && v.chain === undefined) return base;
  if (v.version !== 3) throw new Error("Invalid policy version");
  const rows = list(v.chain, CHAIN_MAX).map((row) =>
    chainRowValue(row, base.citation),
  );
  const chain = rows.filter((row) => !hasPersonalPattern(rowWording(row)));
  // Rows the Worker or the page withheld are counted in one stated row.
  const workerWithheld = v.chainWithheld ?? 0;
  if (
    typeof workerWithheld !== "number" ||
    !Number.isInteger(workerWithheld) ||
    workerWithheld < 0 ||
    workerWithheld > 10_000
  )
    throw new Error("Invalid chain withheld count");
  const withheld = workerWithheld + rows.length - chain.length;
  return {
    ...base,
    version: 3,
    chain: withheld
      ? [...chain, withheldRowsNote(base.citation, withheld)]
      : chain,
  };
}

/** The wording of a chain row the Worker guards (worker/src/sources/shared.ts rowWording). */
function rowWording(row: ChainRow): string {
  return [
    row.label,
    row.sourceWording,
    row.quote?.text,
    row.notice,
    row.kind === "link" ? row.targetText : null,
  ]
    .filter(Boolean)
    .join(" ");
}

/** A related bill title as the Worker passes it: null when flagged or a private bill's. */
function titleShown(title: string | null): string | null {
  return title === null ||
    hasPersonalPattern(title) ||
    /\bfor the relief of\b/i.test(title)
    ? null
    : title;
}

export type RelatedRequest =
  | {
      readonly source: "govinfo";
      readonly id: string;
      readonly collection?: string;
    }
  | { readonly source: "congress"; readonly bill: string };

/** GET /api/related: GovInfo relations, one GovInfo collection, or Congress.gov related bills. */
export function relatedValue(
  value: unknown,
  expected: RelatedRequest,
): GovInfoRelations | GovInfoRelatedRecords | CongressRelatedBills {
  const v = object(value);
  if (
    v.ok !== true ||
    v.basis !== "source_field" ||
    v.source !== expected.source
  )
    throw new Error("Invalid related records response");
  const retrievedAt = timestamp(v.retrievedAt);
  const maybe = (item: unknown, max: number) =>
    item === null ? null : text(item, max);
  if (expected.source === "congress") {
    const records = list(v.records, 20).map((item) => {
      const r = object(item);
      return {
        relation: text(r.relation, 200),
        identifiedBy: text(r.identifiedBy, 200),
        identifier: text(r.identifier, 200),
        title: titleShown(maybe(r.title, 4000)),
        officialUrl: officialUrl(r.officialUrl, "congress"),
      };
    });
    return {
      ok: true,
      source: "congress",
      basis: "source_field",
      bill: text(v.bill, 200),
      records,
      total:
        v.total === null
          ? null
          : integer(v.total, Number.MAX_SAFE_INTEGER, records.length),
      retrievedAt,
    };
  }
  if (v.accessId !== expected.id) throw new Error("Invalid related identity");
  if (expected.collection === undefined) {
    if (v.collection !== undefined) throw new Error("Invalid related shape");
    return {
      ok: true,
      source: "govinfo",
      basis: "source_field",
      accessId: expected.id,
      relations: list(v.relations, 50).map((item) => {
        const r = object(item);
        const collection = text(r.collection, 12);
        if (!/^[A-Z]{2,12}$/.test(collection))
          throw new Error("Invalid related collection");
        return { relation: text(r.relation, 200), collection };
      }),
      retrievedAt,
    };
  }
  if (v.collection !== expected.collection)
    throw new Error("Invalid related collection");
  const records = list(v.records, 20).map((item) => {
    const r = object(item);
    const date = maybe(r.date, 10);
    if (date !== null && !calendarDate(date))
      throw new Error("Invalid related date");
    return {
      identifier: text(r.identifier, 200),
      title: maybe(r.title, 4000),
      date,
      officialUrl: officialUrl(r.officialUrl, "govinfo"),
    };
  });
  return {
    ok: true,
    source: "govinfo",
    basis: "source_field",
    accessId: expected.id,
    collection: expected.collection,
    records,
    total: integer(v.total, Number.MAX_SAFE_INTEGER, records.length),
    retrievedAt,
  };
}
