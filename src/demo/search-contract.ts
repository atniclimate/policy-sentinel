import type {
  DemoSearchCriteria,
  DemoSearchCursor,
  DemoSearchOptions,
} from "./types";

export const MAX_CURSOR_LENGTH = 4096;
export const MAX_CONTINUATION_LENGTH = 12_000;

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
  const keys = Object.keys(expected) as (keyof DemoSearchCriteria)[];
  return (
    Object.keys(record).length === keys.length &&
    keys.every((key) => record[key] === expected[key])
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
  const supplied = options?.continuation ?? null;
  const token = supplied?.cursor ?? null;
  const criteria: DemoSearchCriteria = {
    version: 1,
    source,
    query,
    ...dates,
    page,
    pageSize: 10,
    sort:
      source === "federal-register"
        ? "relevance"
        : source === "regulations"
          ? "-postedDate"
          : source === "govinfo"
            ? "provider-default"
            : "reference",
    resultLevel: source === "govinfo" ? "default" : null,
    historical: source === "govinfo" ? false : null,
    cursor: token,
  };
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
