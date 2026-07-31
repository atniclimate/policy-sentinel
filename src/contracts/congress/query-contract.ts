import {
  CONGRESS_GOV_API_ROOT,
  CONGRESS_GOV_BILL_SUBRESOURCES,
  CONGRESS_GOV_BILL_TYPES,
  CONGRESS_GOV_LAW_TYPES,
  CONGRESS_GOV_QUERY_POLICY,
  type CongressGovBillSubresource,
  type CongressGovBillType,
  type CongressGovLawType,
} from "./constants";
import { CongressGovContractError } from "./response-contract";

export interface CongressGovQueryOptions {
  offset?: number;
  limit?: number;
  fromDateTime?: string;
  toDateTime?: string;
  sort?: "updateDate+asc" | "updateDate+desc";
}

export interface CongressGovResourcePath {
  path: string;
  collection: boolean;
  sortable: boolean;
  updateWindow: boolean;
  congress?: number;
  billType?: CongressGovBillType;
  billNumber?: number;
  lawType?: CongressGovLawType;
  lawNumber?: number;
  subresource?: CongressGovBillSubresource;
}

export interface CongressGovRelativeRequest {
  resource: CongressGovResourcePath;
  options: CongressGovQueryOptions;
  canonicalPathAndQuery: string;
}

const UPDATE_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T00:00:00Z$/;
const ALLOWED_QUERY_KEYS = new Set([
  "format",
  "offset",
  "limit",
  "fromDateTime",
  "toDateTime",
  "sort",
]);

function fail(path: string, message: string): never {
  throw new CongressGovContractError("invalid_value", path, message);
}

function boundedInteger(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    fail(path, "expected a bounded safe integer");
  }
  return value;
}

function parseIntegerSegment(
  value: string,
  path: string,
  maximum: number,
): number {
  if (!/^[1-9]\d*$/.test(value)) {
    fail(path, "expected a positive base-10 integer without padding");
  }
  return boundedInteger(Number(value), path, 1, maximum);
}

function updateDateTime(value: unknown, path: string): string {
  if (typeof value !== "string") {
    fail(path, "expected a documented UTC update timestamp");
  }
  const match = UPDATE_DATE_TIME_PATTERN.exec(value);
  if (!match) {
    fail(path, "expected YYYY-MM-DDT00:00:00Z");
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
    fail(path, "expected a real UTC calendar date");
  }
  return value;
}

function exactOptionKeys(options: CongressGovQueryOptions): void {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.getPrototypeOf(options) !== Object.prototype
  ) {
    fail("$options", "expected a plain query-options object");
  }
  for (const key of Object.keys(options)) {
    if (!ALLOWED_QUERY_KEYS.has(key) || key === "format") {
      fail(`$options.${key}`, "query option is not allowed");
    }
  }
}

export function parseCongressGovResourcePath(
  value: unknown,
): CongressGovResourcePath {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 256 ||
    !value.startsWith(`${CONGRESS_GOV_API_ROOT}/`) ||
    value.includes("?") ||
    value.includes("#") ||
    value.includes("%") ||
    value.includes("\\") ||
    value.includes("//")
  ) {
    fail("$resourcePath", "expected a bounded canonical /v3 resource path");
  }
  const segments = value.slice(1).split("/");
  const [version, family, ...rest] = segments;
  if (version !== "v3") {
    fail("$resourcePath", "expected the reviewed v3 resource root");
  }

  if (family === "congress") {
    if (rest.length === 0) {
      return {
        path: value,
        collection: true,
        sortable: false,
        updateWindow: false,
      };
    }
    if (rest.length === 1 && rest[0] === "current") {
      return {
        path: value,
        collection: false,
        sortable: false,
        updateWindow: false,
      };
    }
    if (rest.length === 1) {
      return {
        path: value,
        collection: false,
        sortable: false,
        updateWindow: false,
        congress: parseIntegerSegment(
          rest[0] ?? "",
          "$resourcePath.congress",
          CONGRESS_GOV_QUERY_POLICY.maximumCongress,
        ),
      };
    }
  }

  if (family === "bill") {
    if (rest.length === 0) {
      return {
        path: value,
        collection: true,
        sortable: false,
        updateWindow: true,
      };
    }
    const congress = parseIntegerSegment(
      rest[0] ?? "",
      "$resourcePath.congress",
      CONGRESS_GOV_QUERY_POLICY.maximumCongress,
    );
    if (rest.length === 1) {
      return {
        path: value,
        collection: true,
        sortable: false,
        updateWindow: true,
        congress,
      };
    }
    const billType = rest[1] as CongressGovBillType;
    if (!CONGRESS_GOV_BILL_TYPES.includes(billType)) {
      fail("$resourcePath.billType", "expected a documented bill type");
    }
    if (rest.length === 2) {
      return {
        path: value,
        collection: true,
        sortable: false,
        updateWindow: true,
        congress,
        billType,
      };
    }
    const billNumber = parseIntegerSegment(
      rest[2] ?? "",
      "$resourcePath.billNumber",
      CONGRESS_GOV_QUERY_POLICY.maximumBillOrLawNumber,
    );
    if (rest.length === 3) {
      return {
        path: value,
        collection: false,
        sortable: false,
        updateWindow: false,
        congress,
        billType,
        billNumber,
      };
    }
    const subresource = rest[3] as CongressGovBillSubresource;
    if (
      rest.length === 4 &&
      CONGRESS_GOV_BILL_SUBRESOURCES.includes(subresource)
    ) {
      return {
        path: value,
        collection: true,
        sortable: subresource === "cosponsors",
        updateWindow: [
          "actions",
          "amendments",
          "cosponsors",
          "subjects",
          "titles",
        ].includes(subresource),
        congress,
        billType,
        billNumber,
        subresource,
      };
    }
  }

  if (family === "law") {
    const congress = parseIntegerSegment(
      rest[0] ?? "",
      "$resourcePath.congress",
      CONGRESS_GOV_QUERY_POLICY.maximumCongress,
    );
    if (rest.length === 1) {
      return {
        path: value,
        collection: true,
        sortable: false,
        updateWindow: false,
        congress,
      };
    }
    const lawType = rest[1] as CongressGovLawType;
    if (!CONGRESS_GOV_LAW_TYPES.includes(lawType)) {
      fail("$resourcePath.lawType", "expected pub or priv");
    }
    if (rest.length === 2) {
      return {
        path: value,
        collection: true,
        sortable: false,
        updateWindow: false,
        congress,
        lawType,
      };
    }
    if (rest.length === 3) {
      return {
        path: value,
        collection: false,
        sortable: false,
        updateWindow: false,
        congress,
        lawType,
        lawNumber: parseIntegerSegment(
          rest[2] ?? "",
          "$resourcePath.lawNumber",
          CONGRESS_GOV_QUERY_POLICY.maximumBillOrLawNumber,
        ),
      };
    }
  }

  if (family === "summaries" && rest.length <= 2) {
    if (rest.length === 0) {
      return {
        path: value,
        collection: true,
        sortable: true,
        updateWindow: true,
      };
    }
    const congress = parseIntegerSegment(
      rest[0] ?? "",
      "$resourcePath.congress",
      CONGRESS_GOV_QUERY_POLICY.maximumCongress,
    );
    if (rest.length === 1) {
      return {
        path: value,
        collection: true,
        sortable: true,
        updateWindow: true,
        congress,
      };
    }
    const billType = rest[1] as CongressGovBillType;
    if (!CONGRESS_GOV_BILL_TYPES.includes(billType)) {
      fail("$resourcePath.billType", "expected a documented bill type");
    }
    return {
      path: value,
      collection: true,
      sortable: true,
      updateWindow: true,
      congress,
      billType,
    };
  }

  fail("$resourcePath", "resource path is outside the reviewed contract");
}

function validateOptions(
  resource: CongressGovResourcePath,
  options: CongressGovQueryOptions,
): CongressGovQueryOptions {
  exactOptionKeys(options);
  const validated: CongressGovQueryOptions = {};
  if (
    !resource.collection &&
    (options.offset !== undefined ||
      options.limit !== undefined ||
      options.fromDateTime !== undefined ||
      options.toDateTime !== undefined ||
      options.sort !== undefined)
  ) {
    fail("$options", "detail resources accept only format=json");
  }
  if (options.offset !== undefined) {
    validated.offset = boundedInteger(
      options.offset,
      "$options.offset",
      CONGRESS_GOV_QUERY_POLICY.firstOffset,
      Number.MAX_SAFE_INTEGER,
    );
  }
  if (options.limit !== undefined) {
    validated.limit = boundedInteger(
      options.limit,
      "$options.limit",
      1,
      CONGRESS_GOV_QUERY_POLICY.maximumLimit,
    );
  }
  if (options.fromDateTime !== undefined) {
    if (!resource.updateWindow) {
      fail(
        "$options.fromDateTime",
        "update-date filters are unsupported for this resource",
      );
    }
    validated.fromDateTime = updateDateTime(
      options.fromDateTime,
      "$options.fromDateTime",
    );
  }
  if (options.toDateTime !== undefined) {
    if (!resource.updateWindow) {
      fail(
        "$options.toDateTime",
        "update-date filters are unsupported for this resource",
      );
    }
    validated.toDateTime = updateDateTime(
      options.toDateTime,
      "$options.toDateTime",
    );
  }
  if (
    validated.fromDateTime !== undefined &&
    validated.toDateTime !== undefined &&
    validated.fromDateTime > validated.toDateTime
  ) {
    fail("$options", "update-date window is reversed");
  }
  if (options.sort !== undefined) {
    if (
      !resource.sortable ||
      !["updateDate+asc", "updateDate+desc"].includes(options.sort)
    ) {
      fail("$options.sort", "sort is unsupported for this resource");
    }
    validated.sort = options.sort;
  }
  return validated;
}

function canonicalQuery(
  resource: CongressGovResourcePath,
  options: CongressGovQueryOptions,
): string {
  const query = new URLSearchParams();
  query.set("format", CONGRESS_GOV_QUERY_POLICY.format);
  if (options.offset !== undefined) {
    query.set("offset", String(options.offset));
  }
  if (options.limit !== undefined) {
    query.set("limit", String(options.limit));
  }
  if (options.fromDateTime !== undefined) {
    query.set("fromDateTime", options.fromDateTime);
  }
  if (options.toDateTime !== undefined) {
    query.set("toDateTime", options.toDateTime);
  }
  if (options.sort !== undefined) {
    query.set("sort", options.sort);
  }
  return `${resource.path}?${query.toString()}`;
}

export function buildCongressGovRelativeRequest(
  resourcePath: string,
  options: CongressGovQueryOptions = {},
): CongressGovRelativeRequest {
  const resource = parseCongressGovResourcePath(resourcePath);
  const validatedOptions = validateOptions(resource, options);
  return {
    resource,
    options: validatedOptions,
    canonicalPathAndQuery: canonicalQuery(resource, validatedOptions),
  };
}

export function assertCongressGovRelativeRequest(
  value: unknown,
): CongressGovRelativeRequest {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > CONGRESS_GOV_QUERY_POLICY.maximumUrlLength ||
    !value.startsWith(`${CONGRESS_GOV_API_ROOT}/`) ||
    value.startsWith("//") ||
    value.includes("#")
  ) {
    fail("$request", "expected a bounded keyless relative v3 request");
  }
  const parsed = new URL(value, "https://contract.invalid");
  if (parsed.origin !== "https://contract.invalid") {
    fail("$request", "absolute runtime hosts are outside this contract");
  }
  const resource = parseCongressGovResourcePath(parsed.pathname);
  const options: CongressGovQueryOptions = {};
  for (const key of parsed.searchParams.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      fail(`$request.${key}`, "unknown or credential-bearing query field");
    }
    if (parsed.searchParams.getAll(key).length !== 1) {
      fail(`$request.${key}`, "duplicate query field");
    }
  }
  if (parsed.searchParams.get("format") !== CONGRESS_GOV_QUERY_POLICY.format) {
    fail("$request.format", "format=json is required exactly once");
  }

  const offset = parsed.searchParams.get("offset");
  if (offset !== null) {
    if (!/^(?:0|[1-9]\d*)$/.test(offset)) {
      fail("$request.offset", "expected a nonnegative base-10 integer");
    }
    options.offset = Number(offset);
  }
  const limit = parsed.searchParams.get("limit");
  if (limit !== null) {
    if (!/^[1-9]\d*$/.test(limit)) {
      fail("$request.limit", "expected a positive base-10 integer");
    }
    options.limit = Number(limit);
  }
  const fromDateTime = parsed.searchParams.get("fromDateTime");
  if (fromDateTime !== null) {
    options.fromDateTime = fromDateTime;
  }
  const toDateTime = parsed.searchParams.get("toDateTime");
  if (toDateTime !== null) {
    options.toDateTime = toDateTime;
  }
  const sort = parsed.searchParams.get("sort");
  if (sort !== null) {
    options.sort = sort as CongressGovQueryOptions["sort"];
  }

  const validatedOptions = validateOptions(resource, options);
  const canonicalPathAndQuery = canonicalQuery(resource, validatedOptions);
  if (value !== canonicalPathAndQuery) {
    fail("$request", "request is not in canonical keyless form");
  }
  return { resource, options: validatedOptions, canonicalPathAndQuery };
}
