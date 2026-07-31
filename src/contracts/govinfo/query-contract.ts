import {
  GOVINFO_COLLECTIONS,
  GOVINFO_QUERY_POLICY,
  type GovInfoCollection,
} from "./constants";

export type GovInfoResourceKind =
  | "collections"
  | "collection-packages"
  | "published-packages"
  | "package-summary"
  | "granule-list"
  | "granule-summary";

export interface GovInfoQueryOptions {
  offsetMark?: string;
  pageSize?: number;
  collections?: readonly GovInfoCollection[];
}

export interface GovInfoResourcePath {
  path: string;
  kind: GovInfoResourceKind;
  paginated: boolean;
  collection?: GovInfoCollection;
  startDate?: string;
  endDate?: string;
  packageId?: string;
  granuleId?: string;
}

export interface GovInfoRelativeRequest {
  resource: GovInfoResourcePath;
  options: GovInfoQueryOptions;
  canonicalPathAndQuery: string;
}

export class GovInfoQueryContractError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "GovInfoQueryContractError";
    this.path = path;
  }
}

const MODIFIED_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/;
const PUBLISHED_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9._~-]+$/;
const ALLOWED_OPTION_KEYS = new Set(["offsetMark", "pageSize", "collections"]);
const ALLOWED_QUERY_KEYS = new Set(["offsetMark", "pageSize", "collection"]);
const CONTRACT_ORIGIN = "https://contract.invalid";

function fail(path: string, message: string): never {
  throw new GovInfoQueryContractError(path, message);
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function validateCalendarDate(
  year: number,
  month: number,
  day: number,
  path: string,
): void {
  const monthLengths = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > (monthLengths[month - 1] ?? 0)
  ) {
    fail(path, "expected a real UTC calendar date");
  }
}

function publishedDate(value: string, path: string): string {
  const match = PUBLISHED_DATE_PATTERN.exec(value);
  if (!match) {
    fail(path, "expected YYYY-MM-DD");
  }
  validateCalendarDate(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    path,
  );
  return value;
}

function modifiedTimestamp(value: string, path: string): string {
  const match = MODIFIED_TIMESTAMP_PATTERN.exec(value);
  if (!match) {
    fail(path, "expected YYYY-MM-DDTHH:mm:ssZ");
  }
  validateCalendarDate(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    path,
  );
  if (Number(match[4]) > 23 || Number(match[5]) > 59 || Number(match[6]) > 59) {
    fail(path, "expected a real UTC clock time");
  }
  return value;
}

function collection(value: string, path: string): GovInfoCollection {
  const candidate = value as GovInfoCollection;
  if (!GOVINFO_COLLECTIONS.includes(candidate)) {
    fail(path, "expected a current documented collection code");
  }
  return candidate;
}

function safeIdentifier(value: string, path: string): string {
  if (
    value.length === 0 ||
    value.length > GOVINFO_QUERY_POLICY.maximumIdentifierLength ||
    !SAFE_IDENTIFIER_PATTERN.test(value) ||
    value === "." ||
    value === ".."
  ) {
    fail(path, "expected a bounded opaque safe path segment");
  }
  return value;
}

function parseCollectionPath(
  path: string,
  segments: readonly string[],
): GovInfoResourcePath | undefined {
  if (segments.length === 1) {
    return { path, kind: "collections", paginated: false };
  }
  if (segments.length !== 3 && segments.length !== 4) {
    return undefined;
  }
  const sourceCollection = collection(
    segments[1] ?? "",
    "$resourcePath.collection",
  );
  const startDate = modifiedTimestamp(
    segments[2] ?? "",
    "$resourcePath.startDate",
  );
  const endDate =
    segments.length === 4
      ? modifiedTimestamp(segments[3] ?? "", "$resourcePath.endDate")
      : undefined;
  if (endDate !== undefined && startDate > endDate) {
    fail("$resourcePath", "modified timestamp range is reversed");
  }
  return {
    path,
    kind: "collection-packages",
    paginated: true,
    collection: sourceCollection,
    startDate,
    ...(endDate === undefined ? {} : { endDate }),
  };
}

function parsePublishedPath(
  path: string,
  segments: readonly string[],
): GovInfoResourcePath | undefined {
  if (segments.length !== 2 && segments.length !== 3) {
    return undefined;
  }
  const startDate = publishedDate(segments[1] ?? "", "$resourcePath.startDate");
  const endDate =
    segments.length === 3
      ? publishedDate(segments[2] ?? "", "$resourcePath.endDate")
      : undefined;
  if (endDate !== undefined && startDate > endDate) {
    fail("$resourcePath", "published date range is reversed");
  }
  return {
    path,
    kind: "published-packages",
    paginated: true,
    startDate,
    ...(endDate === undefined ? {} : { endDate }),
  };
}

function parsePackagePath(
  path: string,
  segments: readonly string[],
): GovInfoResourcePath | undefined {
  if (segments.length < 3) {
    return undefined;
  }
  const packageId = safeIdentifier(
    segments[1] ?? "",
    "$resourcePath.packageId",
  );
  if (segments.length === 3 && segments[2] === "summary") {
    return {
      path,
      kind: "package-summary",
      paginated: false,
      packageId,
    };
  }
  if (segments.length === 3 && segments[2] === "granules") {
    return { path, kind: "granule-list", paginated: true, packageId };
  }
  if (
    segments.length === 5 &&
    segments[2] === "granules" &&
    segments[4] === "summary"
  ) {
    return {
      path,
      kind: "granule-summary",
      paginated: false,
      packageId,
      granuleId: safeIdentifier(segments[3] ?? "", "$resourcePath.granuleId"),
    };
  }
  return undefined;
}

export function parseGovInfoResourcePath(value: unknown): GovInfoResourcePath {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > GOVINFO_QUERY_POLICY.maximumUrlLength ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("?") ||
    value.includes("#") ||
    value.includes("%") ||
    value.includes("\\") ||
    value.includes("//")
  ) {
    fail(
      "$resourcePath",
      "expected a bounded canonical relative resource path",
    );
  }
  const segments = value.slice(1).split("/");
  const family = segments[0];
  const resource =
    family === "collections"
      ? parseCollectionPath(value, segments)
      : family === "published"
        ? parsePublishedPath(value, segments)
        : family === "packages"
          ? parsePackagePath(value, segments)
          : undefined;
  if (resource === undefined) {
    fail("$resourcePath", "resource path is outside the reviewed contract");
  }
  return resource;
}

function exactOptionKeys(options: GovInfoQueryOptions): void {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.getPrototypeOf(options) !== Object.prototype
  ) {
    fail("$options", "expected a plain query-options object");
  }
  for (const key of Object.keys(options)) {
    if (!ALLOWED_OPTION_KEYS.has(key)) {
      fail(`$options.${key}`, "query option is not allowed");
    }
  }
}

function hasUnsafeCursorCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (
      codePoint <= 0x20 ||
      codePoint === 0x7f ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) {
      return true;
    }
  }
  return false;
}

function offsetMark(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > GOVINFO_QUERY_POLICY.maximumCursorLength ||
    hasUnsafeCursorCharacter(value)
  ) {
    fail(
      path,
      "expected * or a bounded opaque cursor without control characters",
    );
  }
  return value;
}

function pageSize(value: unknown, path: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > GOVINFO_QUERY_POLICY.maximumPageSize
  ) {
    fail(path, "expected a page size from 1 through 1000");
  }
  return value;
}

function canonicalCollections(
  value: unknown,
  path: string,
): readonly GovInfoCollection[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail(path, "expected a nonempty collection-code list");
  }
  const validated = value.map((item, index) => {
    if (typeof item !== "string") {
      fail(`${path}[${index}]`, "expected a collection code");
    }
    return collection(item, `${path}[${index}]`);
  });
  if (new Set(validated).size !== validated.length) {
    fail(path, "duplicate collection code");
  }
  const order = new Map(
    GOVINFO_COLLECTIONS.map((item, index) => [item, index] as const),
  );
  return validated.toSorted(
    (left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0),
  );
}

function validateOptions(
  resource: GovInfoResourcePath,
  options: GovInfoQueryOptions,
): GovInfoQueryOptions {
  exactOptionKeys(options);
  if (!resource.paginated) {
    if (Object.keys(options).length !== 0) {
      fail("$options", "this resource accepts no query options");
    }
    return {};
  }
  if (options.offsetMark === undefined || options.pageSize === undefined) {
    fail("$options", "paginated resources require offsetMark and pageSize");
  }
  const validated: GovInfoQueryOptions = {
    offsetMark: offsetMark(options.offsetMark, "$options.offsetMark"),
    pageSize: pageSize(options.pageSize, "$options.pageSize"),
  };
  if (resource.kind === "published-packages") {
    validated.collections = canonicalCollections(
      options.collections,
      "$options.collections",
    );
  } else if (options.collections !== undefined) {
    fail(
      "$options.collections",
      "collection lists apply only to published routes",
    );
  }
  return validated;
}

function canonicalRequest(
  resource: GovInfoResourcePath,
  options: GovInfoQueryOptions,
): string {
  if (!resource.paginated) {
    return resource.path;
  }
  const query = new URLSearchParams();
  query.set("offsetMark", options.offsetMark ?? "");
  query.set("pageSize", String(options.pageSize));
  if (options.collections !== undefined) {
    query.set("collection", options.collections.join(","));
  }
  return `${resource.path}?${query.toString()}`;
}

export function buildGovInfoRelativeRequest(
  resourcePath: string,
  options: GovInfoQueryOptions = {},
): GovInfoRelativeRequest {
  const resource = parseGovInfoResourcePath(resourcePath);
  const validatedOptions = validateOptions(resource, options);
  const canonicalPathAndQuery = canonicalRequest(resource, validatedOptions);
  if (canonicalPathAndQuery.length > GOVINFO_QUERY_POLICY.maximumUrlLength) {
    fail("$request", "canonical request exceeds the contract URL limit");
  }
  return {
    resource,
    options: validatedOptions,
    canonicalPathAndQuery,
  };
}

export function assertGovInfoRelativeRequest(
  value: unknown,
): GovInfoRelativeRequest {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > GOVINFO_QUERY_POLICY.maximumUrlLength ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("#")
  ) {
    fail("$request", "expected a bounded keyless relative request");
  }
  const parsed = new URL(value, CONTRACT_ORIGIN);
  if (parsed.origin !== CONTRACT_ORIGIN) {
    fail("$request", "absolute runtime hosts are outside this contract");
  }
  const resource = parseGovInfoResourcePath(parsed.pathname);
  for (const key of parsed.searchParams.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      fail(`$request.${key}`, "unknown or credential-bearing query field");
    }
    if (parsed.searchParams.getAll(key).length !== 1) {
      fail(`$request.${key}`, "duplicate query field");
    }
  }
  const options: GovInfoQueryOptions = {};
  const rawOffsetMark = parsed.searchParams.get("offsetMark");
  if (rawOffsetMark !== null) {
    options.offsetMark = rawOffsetMark;
  }
  const rawPageSize = parsed.searchParams.get("pageSize");
  if (rawPageSize !== null) {
    if (!/^[1-9]\d*$/.test(rawPageSize)) {
      fail("$request.pageSize", "expected a positive base-10 integer");
    }
    options.pageSize = Number(rawPageSize);
  }
  const rawCollections = parsed.searchParams.get("collection");
  if (rawCollections !== null) {
    options.collections = rawCollections.split(",") as GovInfoCollection[];
  }
  const validatedOptions = validateOptions(resource, options);
  const canonicalPathAndQuery = canonicalRequest(resource, validatedOptions);
  if (value !== canonicalPathAndQuery) {
    fail("$request", "request is not in canonical keyless form");
  }
  return { resource, options: validatedOptions, canonicalPathAndQuery };
}
