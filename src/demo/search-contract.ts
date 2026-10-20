import type {
  DemoCfrRef,
  DemoDocumentType,
  DemoSearchCriteria,
  DemoSearchCriteriaV1,
  DemoSearchCursor,
  DemoSearchMatch,
  DemoSearchOptions,
} from "./types";

export const MAX_CURSOR_LENGTH = 4096;
export const MAX_CONTINUATION_LENGTH = 12_000;
export const MAX_DOCKET_LENGTH = 120;

const MATCHES: readonly DemoSearchMatch[] = ["text", "docket", "rin", "cfr"];
const DOCUMENT_TYPES: readonly DemoDocumentType[] = [
  "RULE",
  "PRORULE",
  "NOTICE",
  "PRESDOCU",
];
// Regulations.gov documentType enum (v4 OpenAPI); it has no Presidential Document.
const REGULATIONS_TYPES: Partial<Record<DemoDocumentType, string>> = {
  RULE: "Rule",
  PRORULE: "Proposed Rule",
  NOTICE: "Notice",
};
export const RIN_PATTERN = /^\d{4}-[A-Z0-9]{4}$/;
// A Regulations.gov docket id; no commas or spaces, so a filter names one docket.
const REGULATIONS_DOCKET = /^[A-Za-z0-9][A-Za-z0-9_.-]{1,79}$/;
const CFR_PART = /^([1-9]\d{0,4})(?:-([1-9]\d{0,4}))?$/;

/**
 * Regulations.gov docket lookup (filter[docketId]), its type filter
 * (filter[documentType]) and comment dates (commentEndDate) are built but held
 * back: the source note allows them only after the terms page is read and each
 * has one bounded live call. Off, those lanes say the filter was not applied and
 * offer no Find related.
 * shortcut: held off until those checks are recorded, then set true; the skipped tests come back with it.
 */
export const REGULATIONS_V2_CONFIRMED: boolean = false;

/** Source text kept verbatim: bounded, already trimmed, no control characters. */
export function plainSourceText(value: unknown, max: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= max &&
    value.trim() === value &&
    !Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || (code >= 127 && code <= 159);
    })
  );
}

/** A CFR title 1-50 and a part such as "17" or a range such as "1-50". */
export function validCfrRef(title: unknown, part: unknown): boolean {
  const range = typeof part === "string" ? CFR_PART.exec(part) : null;
  return (
    typeof title === "number" &&
    Number.isInteger(title) &&
    title >= 1 &&
    title <= 50 &&
    range !== null &&
    (range[2] === undefined || Number(range[1]) < Number(range[2]))
  );
}

/** The query text of a CFR identifier search, such as "50 CFR 660". */
export const cfrQuery = (ref: DemoCfrRef) => `${ref.title} CFR ${ref.part}`;

/** One CFR part only: how the Federal Register matches a part range is unconfirmed. */
export function parseCfrQuery(query: string): DemoCfrRef | null {
  const match = /^([1-9]\d?) CFR ([1-9]\d{0,4})$/.exec(query);
  const ref = match && { title: Number(match[1]), part: match[2] };
  return ref && validCfrRef(ref.title, ref.part) ? ref : null;
}

/** Whether this source can match the identifier kind exactly, in its own spelling. */
export function supportsMatch(source: string, match: DemoSearchMatch): boolean {
  return (
    match === "text" ||
    source === "federal-register" ||
    (REGULATIONS_V2_CONFIRMED && source === "regulations" && match === "docket")
  );
}

/**
 * The provider value a type filter maps to on this source, or null when the
 * source has no equivalent. A null filter is never sent: that lane runs
 * without it and states "type filter not applied".
 */
export function documentTypeFilter(
  source: string,
  type: DemoDocumentType,
): string | null {
  if (source === "federal-register") return type;
  if (source === "regulations" && REGULATIONS_V2_CONFIRMED)
    return REGULATIONS_TYPES[type] ?? null;
  return null;
}

function validIdentifier(
  source: string,
  match: DemoSearchMatch,
  query: string,
): boolean {
  if (match === "docket")
    return source === "regulations"
      ? REGULATIONS_DOCKET.test(query)
      : plainSourceText(query, MAX_DOCKET_LENGTH);
  if (match === "rin") return RIN_PATTERN.test(query);
  if (match === "cfr") return parseCfrQuery(query) !== null;
  return true;
}

export class SearchCriteriaError extends Error {
  constructor(
    message: string,
    readonly code: "bad_query" | "unsupported_criteria" = "bad_query",
  ) {
    super(message);
  }
}

export function dateRangeValue(dateFrom: unknown, dateTo: unknown) {
  const date = (value: unknown): string | null => {
    if (value === null || value === "") return null;
    if (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      value.startsWith("0000-") ||
      !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ||
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
    )
      throw new SearchCriteriaError("Enter a valid date in both date fields.");
    return value;
  };
  const from = date(dateFrom);
  const to = date(dateTo);
  if ((from === null) !== (to === null))
    throw new SearchCriteriaError(
      "Enter both the start and end dates, or clear both.",
    );
  if (from !== null && to !== null && from > to)
    throw new SearchCriteriaError(
      "The start date must be on or before the end date.",
    );
  return { dateFrom: from, dateTo: to };
}

export function searchPageLimit(source: string): number {
  return source === "regulations"
    ? 20
    : source === "federal-register" || source === "govinfo"
      ? 50
      : 1;
}

/** GovInfo's documented grouping/range grammar, restricted to unambiguous words. */
export function supportsDatedGovinfoQuery(query: string): boolean {
  return (
    /^[A-Za-z0-9]+(?: +[A-Za-z0-9]+)*$/.test(query) &&
    !query.split(/ +/).some((word) => /^(AND|OR|NOT)$/i.test(word))
  );
}

export function validCursorToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_CURSOR_LENGTH &&
    !Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 32 || (code >= 127 && code <= 159);
    })
  );
}

/** Exact projection rejects missing/extra fields instead of accepting loose envelopes. */
export function sameSearchCriteria(
  value: unknown,
  expected: DemoSearchCriteria,
): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const want = expected as unknown as Record<string, unknown>;
  const keys = Object.keys(want);
  return (
    Object.keys(record).length === keys.length &&
    keys.every((key) => record[key] === want[key])
  );
}

export function searchCriteria(
  source: string,
  query: string,
  page: number,
  options?: DemoSearchOptions,
): DemoSearchCriteria {
  if (
    ![
      "federal-register",
      "govinfo",
      "regulations",
      "congress",
      "washington",
    ].includes(source) ||
    query.trim() !== query ||
    query.length < 2 ||
    query.length > 200 ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > searchPageLimit(source)
  )
    throw new SearchCriteriaError("The search or page number is not valid.");
  const dates = dateRangeValue(
    options?.dateFrom ?? null,
    options?.dateTo ?? null,
  );
  if (
    dates.dateFrom !== null &&
    !["federal-register", "regulations", "govinfo"].includes(source)
  )
    throw new SearchCriteriaError(
      "This source cannot search with this date range.",
      "unsupported_criteria",
    );
  if (
    dates.dateFrom !== null &&
    source === "govinfo" &&
    !supportsDatedGovinfoQuery(query)
  )
    throw new SearchCriteriaError(
      "GovInfo date searches accept plain words and numbers without operators or punctuation.",
      "unsupported_criteria",
    );
  const version = options?.version ?? 1;
  const match = options?.match ?? "text";
  const documentType = options?.documentType ?? null;
  if (
    (version !== 1 && version !== 2) ||
    (version === 1 && (match !== "text" || documentType !== null))
  )
    throw new SearchCriteriaError("The search contract is not supported.");
  if (
    !MATCHES.includes(match) ||
    (documentType !== null && !DOCUMENT_TYPES.includes(documentType))
  )
    throw new SearchCriteriaError("The search or page number is not valid.");
  if (!supportsMatch(source, match))
    throw new SearchCriteriaError(
      "The demo does not look up that kind of identifier on this source.",
      "unsupported_criteria",
    );
  if (!validIdentifier(source, match, query))
    throw new SearchCriteriaError(
      "That identifier is not written the way this source writes it.",
    );
  if (
    documentType !== null &&
    documentTypeFilter(source, documentType) === null
  )
    throw new SearchCriteriaError(
      "The demo does not apply this document type filter on this source.",
      "unsupported_criteria",
    );
  const supplied = options?.continuation ?? null;
  const token = supplied?.cursor ?? null;
  const base: DemoSearchCriteriaV1 = {
    version: 1,
    source,
    query,
    ...dates,
    page,
    pageSize: 10,
    sort:
      source === "federal-register"
        ? match === "text"
          ? "relevance"
          : "newest"
        : source === "regulations"
          ? "-postedDate"
          : source === "govinfo"
            ? "provider-default"
            : "reference",
    resultLevel: source === "govinfo" ? "default" : null,
    historical: source === "govinfo" ? false : null,
    cursor: token,
  };
  // A v1 echo stays byte-identical for the published page; v2 fields never echo on v1.
  const criteria: DemoSearchCriteria =
    version === 1 ? base : { ...base, version: 2, match, documentType };
  if (
    (page === 1 && supplied !== null) ||
    (page > 1 && source === "govinfo" && supplied === null) ||
    (source === "govinfo" &&
      page > 1 &&
      (!validCursorToken(token) || token === "*")) ||
    (source !== "govinfo" && token !== null) ||
    (supplied !== null && !sameSearchCriteria(supplied, criteria))
  )
    throw new SearchCriteriaError(
      "The continuation does not match this search.",
    );
  return criteria;
}

export function nextSearchCursor(
  criteria: DemoSearchCriteria,
  cursor: string | null = null,
): DemoSearchCursor {
  return { ...criteria, page: criteria.page + 1, cursor };
}
