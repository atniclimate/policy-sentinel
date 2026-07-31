import {
  FEDERAL_REGISTER_DISCOVERY_FIELDS,
  FEDERAL_REGISTER_ORIGIN,
  FEDERAL_REGISTER_PATHS,
  FEDERAL_REGISTER_QUERY_POLICY,
} from "./constants";
import { FederalRegisterContractError } from "./response-contract";

export interface FederalRegisterDateRange {
  start: string;
  end: string;
}

export interface FederalRegisterNextPageContext {
  range: FederalRegisterDateRange;
  seenUrls?: ReadonlySet<string>;
  seenCursors?: ReadonlySet<string>;
}

export interface FederalRegisterNextPage {
  url: URL;
  cursor: string;
  canonicalUrl: string;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MILLISECONDS = 24 * 60 * 60 * 1_000;

function invalid(path: string, message: string): never {
  throw new FederalRegisterContractError("invalid_value", path, message);
}

function parseDate(
  value: unknown,
  path: string,
): {
  value: string;
  epoch: number;
} {
  if (typeof value !== "string") {
    invalid(path, "expected an ISO calendar date");
  }
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    invalid(path, "expected an ISO calendar date");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const epoch = Date.UTC(year, month - 1, day);
  const reconstructed = new Date(epoch);
  if (
    reconstructed.getUTCFullYear() !== year ||
    reconstructed.getUTCMonth() + 1 !== month ||
    reconstructed.getUTCDate() !== day
  ) {
    invalid(path, "expected a real ISO calendar date");
  }
  return { value, epoch };
}

export function assertFederalRegisterDateRange(
  range: FederalRegisterDateRange,
): FederalRegisterDateRange {
  if (
    range === null ||
    typeof range !== "object" ||
    Array.isArray(range) ||
    Object.getPrototypeOf(range) !== Object.prototype
  ) {
    invalid("$range", "expected a plain date-range object");
  }
  const keys = Object.keys(range);
  if (
    keys.length !== 2 ||
    !Object.hasOwn(range, "start") ||
    !Object.hasOwn(range, "end")
  ) {
    invalid("$range", "date range must contain only start and end");
  }
  const start = parseDate(range.start, "$range.start");
  const end = parseDate(range.end, "$range.end");
  if (start.value < FEDERAL_REGISTER_QUERY_POLICY.earliestPublicationDate) {
    invalid("$range.start", "date precedes reviewed API coverage");
  }
  if (start.epoch > end.epoch) {
    invalid("$range", "date range is reversed");
  }
  return { start: start.value, end: end.value };
}

function appendDiscoveryQuery(url: URL, range: FederalRegisterDateRange): void {
  for (const field of FEDERAL_REGISTER_DISCOVERY_FIELDS) {
    url.searchParams.append("fields[]", field);
  }
  url.searchParams.set("conditions[publication_date][gte]", range.start);
  url.searchParams.set("conditions[publication_date][lte]", range.end);
  url.searchParams.set(
    "per_page",
    String(FEDERAL_REGISTER_QUERY_POLICY.pageSize),
  );
  url.searchParams.set("order", FEDERAL_REGISTER_QUERY_POLICY.order);
}

export function buildFederalRegisterSearchUrl(
  range: FederalRegisterDateRange,
): URL {
  const validated = assertFederalRegisterDateRange(range);
  const url = new URL(FEDERAL_REGISTER_PATHS.search, FEDERAL_REGISTER_ORIGIN);
  appendDiscoveryQuery(url, validated);
  return url;
}

function formatDate(epoch: number): string {
  return new Date(epoch).toISOString().slice(0, 10);
}

export function splitFederalRegisterDateRange(
  range: FederalRegisterDateRange,
): readonly [FederalRegisterDateRange, FederalRegisterDateRange] {
  const validated = assertFederalRegisterDateRange(range);
  const start = parseDate(validated.start, "$range.start").epoch;
  const end = parseDate(validated.end, "$range.end").epoch;
  if (start === end) {
    invalid("$range", "cannot split a single-day date range");
  }
  const dayCount = Math.floor((end - start) / DAY_MILLISECONDS);
  const midpoint = start + Math.floor(dayCount / 2) * DAY_MILLISECONDS;
  return [
    {
      start: validated.start,
      end: formatDate(midpoint),
    },
    {
      start: formatDate(midpoint + DAY_MILLISECONDS),
      end: validated.end,
    },
  ];
}

export function shouldSplitFederalRegisterDateRange(count: number): boolean {
  if (
    !Number.isSafeInteger(count) ||
    count < 0 ||
    count > FEDERAL_REGISTER_QUERY_POLICY.maximumObservedWindow
  ) {
    invalid("$count", "expected a count inside the observed search window");
  }
  return count >= FEDERAL_REGISTER_QUERY_POLICY.sliceThreshold;
}

function sortedPairs(parameters: URLSearchParams): string[] {
  return [...parameters.entries()]
    .map(([key, value]) => JSON.stringify([key, value]))
    .sort();
}

function canonicalize(url: URL): string {
  const canonical = new URL(url.origin + url.pathname);
  const pairs = [...url.searchParams.entries()].sort(
    ([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue),
  );
  for (const [key, value] of pairs) {
    canonical.searchParams.append(key, value);
  }
  return canonical.href;
}

function hasAsciiControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

export function validateFederalRegisterNextPageUrl(
  value: unknown,
  context: FederalRegisterNextPageContext,
): FederalRegisterNextPage {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > FEDERAL_REGISTER_QUERY_POLICY.maximumUrlLength
  ) {
    throw new FederalRegisterContractError(
      "invalid_url",
      "$next_page_url",
      "expected a bounded URL string",
    );
  }
  const range = assertFederalRegisterDateRange(context.range);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new FederalRegisterContractError(
      "invalid_url",
      "$next_page_url",
      "expected an absolute URL",
    );
  }
  if (
    url.protocol !== "https:" ||
    url.origin !== FEDERAL_REGISTER_ORIGIN ||
    url.pathname !== FEDERAL_REGISTER_PATHS.search ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    url.hash !== ""
  ) {
    throw new FederalRegisterContractError(
      "invalid_url",
      "$next_page_url",
      "URL is outside the exact Federal Register search boundary",
    );
  }

  if (url.searchParams.has("page")) {
    throw new FederalRegisterContractError(
      "invalid_url",
      "$next_page_url.page",
      "provider cursor URL must not contain page",
    );
  }
  const cursors = url.searchParams.getAll("search_after_cursor");
  if (cursors.length !== 1) {
    throw new FederalRegisterContractError(
      "invalid_url",
      "$next_page_url.search_after_cursor",
      "expected exactly one opaque cursor",
    );
  }
  const cursor = cursors[0] ?? "";
  if (
    cursor.length === 0 ||
    cursor.trim() !== cursor ||
    hasAsciiControlCharacter(cursor) ||
    cursor.length > FEDERAL_REGISTER_QUERY_POLICY.maximumCursorLength
  ) {
    throw new FederalRegisterContractError(
      "invalid_url",
      "$next_page_url.search_after_cursor",
      "cursor is empty, padded, or oversized",
    );
  }

  const expected = buildFederalRegisterSearchUrl(range);
  const actualWithoutCursor = new URL(url.href);
  actualWithoutCursor.searchParams.delete("search_after_cursor");
  if (
    JSON.stringify(sortedPairs(actualWithoutCursor.searchParams)) !==
    JSON.stringify(sortedPairs(expected.searchParams))
  ) {
    throw new FederalRegisterContractError(
      "invalid_url",
      "$next_page_url",
      "immutable query parameters changed or contain unknown/duplicate values",
    );
  }

  const canonicalUrl = canonicalize(url);
  if (
    context.seenUrls?.has(url.href) === true ||
    context.seenUrls?.has(canonicalUrl) === true ||
    context.seenCursors?.has(cursor) === true
  ) {
    throw new FederalRegisterContractError(
      "duplicate_value",
      "$next_page_url",
      "pagination URL or cursor repeats",
    );
  }
  return { url, cursor, canonicalUrl };
}
