import {
  REGULATIONS_GOV_API_ROOT,
  REGULATIONS_GOV_DOCKET_SORT,
  REGULATIONS_GOV_DOCKET_TYPES,
  REGULATIONS_GOV_DOCUMENT_SORT,
  REGULATIONS_GOV_DOCUMENT_TYPES,
  REGULATIONS_GOV_QUERY_POLICY,
  type RegulationsGovDocketType,
  type RegulationsGovDocumentType,
} from "./constants";
import { failRegulationsGovContract } from "./errors";

export type RegulationsGovResourceKind =
  "document-list" | "document-detail" | "docket-list" | "docket-detail";

export interface RegulationsGovResourcePath {
  path: string;
  kind: RegulationsGovResourceKind;
  family: "documents" | "dockets";
  paginated: boolean;
  identifier?: string;
}

export interface RegulationsGovQueryOptions {
  lastModifiedDateGe?: string;
  lastModifiedDateLe?: string;
  pageNumber?: number;
  pageSize?: number;
  agencyId?: string;
  documentType?: RegulationsGovDocumentType;
  docketType?: RegulationsGovDocketType;
  docketId?: string;
  subtype?: string;
  include?: "attachments";
}

export interface RegulationsGovRelativeRequest {
  resource: RegulationsGovResourcePath;
  options: RegulationsGovQueryOptions;
  canonicalPathAndQuery: string;
}

const LAST_MODIFIED_DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]*$/;
const CREDENTIAL_QUERY_KEY_PATTERN =
  /(?:api.?key|access.?token|auth|credential|secret|signature)/i;
const SEARCH_QUERY_KEY_PATTERN = /(?:search|keyword|relevance)/i;
const OPTION_KEYS = new Set([
  "lastModifiedDateGe",
  "lastModifiedDateLe",
  "pageNumber",
  "pageSize",
  "agencyId",
  "documentType",
  "docketType",
  "docketId",
  "subtype",
  "include",
]);
const QUERY_KEYS = new Set([
  "filter[lastModifiedDate][ge]",
  "filter[lastModifiedDate][le]",
  "filter[agencyId]",
  "filter[documentType]",
  "filter[docketType]",
  "filter[docketId]",
  "filter[subtype]",
  "sort",
  "page[number]",
  "page[size]",
  "include",
]);

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function lastModifiedDate(value: unknown, path: string): string {
  if (typeof value !== "string") {
    failRegulationsGovContract(
      "invalid_type",
      path,
      "expected a literal last-modified date-time",
    );
  }
  const match = LAST_MODIFIED_DATE_PATTERN.exec(value);
  if (!match) {
    failRegulationsGovContract(
      "invalid_value",
      path,
      "expected literal YYYY-MM-DD HH:mm:ss",
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
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
    day > (monthLengths[month - 1] ?? 0) ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    failRegulationsGovContract(
      "invalid_value",
      path,
      "expected a real calendar date and clock time",
    );
  }
  return value;
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
    failRegulationsGovContract(
      "invalid_value",
      path,
      `expected an integer from ${minimum} through ${maximum}`,
    );
  }
  return value;
}

function safeIdentifier(
  value: unknown,
  path: string,
  maximumLength: number = REGULATIONS_GOV_QUERY_POLICY.maximumIdentifierLength,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    !SAFE_IDENTIFIER_PATTERN.test(value) ||
    value === "." ||
    value === ".."
  ) {
    failRegulationsGovContract(
      "invalid_value",
      path,
      "expected a bounded opaque safe identifier",
    );
  }
  return value;
}

function exactText(
  value: unknown,
  path: string,
  maximumLength: number,
): string {
  if (typeof value !== "string") {
    failRegulationsGovContract("invalid_type", path, "expected a string");
  }
  if (
    value.length === 0 ||
    value.length > maximumLength ||
    value.trim() !== value ||
    Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 31 || codePoint === 127;
    })
  ) {
    failRegulationsGovContract(
      "invalid_value",
      path,
      "expected bounded exact text without surrounding whitespace or controls",
    );
  }
  return value;
}

function exactMember<T extends string>(
  value: unknown,
  path: string,
  members: readonly T[],
): T {
  if (typeof value !== "string" || !members.includes(value as T)) {
    failRegulationsGovContract(
      "invalid_value",
      path,
      "value is outside the reviewed official vocabulary",
    );
  }
  return value as T;
}

function exactOptionKeys(options: RegulationsGovQueryOptions): void {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.getPrototypeOf(options) !== Object.prototype
  ) {
    failRegulationsGovContract(
      "invalid_type",
      "$options",
      "expected a plain query-options object",
    );
  }
  for (const key of Object.keys(options)) {
    if (!OPTION_KEYS.has(key)) {
      failRegulationsGovContract(
        "unexpected_field",
        `$options.${key}`,
        "query option is not allowed",
      );
    }
  }
}

export function parseRegulationsGovResourcePath(
  value: unknown,
): RegulationsGovResourcePath {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > REGULATIONS_GOV_QUERY_POLICY.maximumCanonicalRequestLength ||
    !value.startsWith(`${REGULATIONS_GOV_API_ROOT}/`) ||
    value.includes("?") ||
    value.includes("#") ||
    value.includes("%") ||
    value.includes("\\") ||
    value.includes("//")
  ) {
    failRegulationsGovContract(
      "invalid_url",
      "$resourcePath",
      "expected a bounded canonical relative /v4 resource path",
    );
  }
  const segments = value.slice(1).split("/");
  if (segments[0] !== "v4") {
    failRegulationsGovContract(
      "invalid_url",
      "$resourcePath",
      "expected the reviewed /v4 root",
    );
  }
  const family = segments[1];
  if (family !== "documents" && family !== "dockets") {
    failRegulationsGovContract(
      "invalid_url",
      "$resourcePath",
      "only document and docket GET resources are reviewed",
    );
  }
  if (segments.length === 2) {
    return {
      path: value,
      kind: family === "documents" ? "document-list" : "docket-list",
      family,
      paginated: true,
    };
  }
  if (segments.length === 3) {
    return {
      path: value,
      kind: family === "documents" ? "document-detail" : "docket-detail",
      family,
      paginated: false,
      identifier: safeIdentifier(
        segments[2] ?? "",
        `$resourcePath.${family === "documents" ? "documentId" : "docketId"}`,
      ),
    };
  }
  failRegulationsGovContract(
    "invalid_url",
    "$resourcePath",
    "resource path is outside the reviewed GET contract",
  );
}

function validateListOptions(
  resource: RegulationsGovResourcePath,
  options: RegulationsGovQueryOptions,
): RegulationsGovQueryOptions {
  if (
    options.lastModifiedDateGe === undefined ||
    options.lastModifiedDateLe === undefined ||
    options.pageNumber === undefined ||
    options.pageSize === undefined
  ) {
    failRegulationsGovContract(
      "missing_field",
      "$options",
      "list queries require both lastModifiedDate bounds, pageNumber, and pageSize",
    );
  }
  if (options.include !== undefined) {
    failRegulationsGovContract(
      "unexpected_field",
      "$options.include",
      "include is valid only for document details",
    );
  }
  const validated: RegulationsGovQueryOptions = {
    lastModifiedDateGe: lastModifiedDate(
      options.lastModifiedDateGe,
      "$options.lastModifiedDateGe",
    ),
    lastModifiedDateLe: lastModifiedDate(
      options.lastModifiedDateLe,
      "$options.lastModifiedDateLe",
    ),
    pageNumber: boundedInteger(
      options.pageNumber,
      "$options.pageNumber",
      REGULATIONS_GOV_QUERY_POLICY.firstPageNumber,
      REGULATIONS_GOV_QUERY_POLICY.maximumPageNumber,
    ),
    pageSize: boundedInteger(
      options.pageSize,
      "$options.pageSize",
      REGULATIONS_GOV_QUERY_POLICY.minimumPageSize,
      REGULATIONS_GOV_QUERY_POLICY.maximumPageSize,
    ),
  };
  if (validated.lastModifiedDateGe! > validated.lastModifiedDateLe!) {
    failRegulationsGovContract(
      "inconsistent_value",
      "$options",
      "lastModifiedDate window is reversed",
    );
  }
  if (options.agencyId !== undefined) {
    validated.agencyId = safeIdentifier(
      options.agencyId,
      "$options.agencyId",
      REGULATIONS_GOV_QUERY_POLICY.maximumAgencyIdLength,
    );
  }
  if (resource.kind === "document-list") {
    if (options.docketType !== undefined) {
      failRegulationsGovContract(
        "unexpected_field",
        "$options.docketType",
        "docketType applies only to docket lists",
      );
    }
    if (options.documentType !== undefined) {
      validated.documentType = exactMember(
        options.documentType,
        "$options.documentType",
        REGULATIONS_GOV_DOCUMENT_TYPES,
      );
    }
    if (options.docketId !== undefined) {
      validated.docketId = safeIdentifier(
        options.docketId,
        "$options.docketId",
      );
    }
    if (options.subtype !== undefined) {
      validated.subtype = exactText(
        options.subtype,
        "$options.subtype",
        REGULATIONS_GOV_QUERY_POLICY.maximumSubtypeLength,
      );
    }
  } else {
    for (const key of ["documentType", "docketId", "subtype"] as const) {
      if (options[key] !== undefined) {
        failRegulationsGovContract(
          "unexpected_field",
          `$options.${key}`,
          `${key} applies only to document lists`,
        );
      }
    }
    if (options.docketType !== undefined) {
      validated.docketType = exactMember(
        options.docketType,
        "$options.docketType",
        REGULATIONS_GOV_DOCKET_TYPES,
      );
    }
  }
  return validated;
}

function validateDetailOptions(
  resource: RegulationsGovResourcePath,
  options: RegulationsGovQueryOptions,
): RegulationsGovQueryOptions {
  const listKeys = [
    "lastModifiedDateGe",
    "lastModifiedDateLe",
    "pageNumber",
    "pageSize",
    "agencyId",
    "documentType",
    "docketType",
    "docketId",
    "subtype",
  ] as const;
  for (const key of listKeys) {
    if (options[key] !== undefined) {
      failRegulationsGovContract(
        "unexpected_field",
        `$options.${key}`,
        "list filters are not valid on detail resources",
      );
    }
  }
  if (resource.kind === "docket-detail") {
    if (options.include !== undefined) {
      failRegulationsGovContract(
        "unexpected_field",
        "$options.include",
        "docket details do not accept include",
      );
    }
    return {};
  }
  if (options.include === undefined) {
    return {};
  }
  if (options.include !== "attachments") {
    failRegulationsGovContract(
      "invalid_value",
      "$options.include",
      "document detail include must be exactly attachments",
    );
  }
  return { include: "attachments" };
}

function validateOptions(
  resource: RegulationsGovResourcePath,
  options: RegulationsGovQueryOptions,
): RegulationsGovQueryOptions {
  exactOptionKeys(options);
  return resource.paginated
    ? validateListOptions(resource, options)
    : validateDetailOptions(resource, options);
}

function canonicalRequest(
  resource: RegulationsGovResourcePath,
  options: RegulationsGovQueryOptions,
): string {
  if (!resource.paginated) {
    return options.include === undefined
      ? resource.path
      : `${resource.path}?include=attachments`;
  }
  const query = new URLSearchParams();
  query.set("filter[lastModifiedDate][ge]", options.lastModifiedDateGe ?? "");
  query.set("filter[lastModifiedDate][le]", options.lastModifiedDateLe ?? "");
  if (options.agencyId !== undefined) {
    query.set("filter[agencyId]", options.agencyId);
  }
  if (options.documentType !== undefined) {
    query.set("filter[documentType]", options.documentType);
  }
  if (options.docketType !== undefined) {
    query.set("filter[docketType]", options.docketType);
  }
  if (options.docketId !== undefined) {
    query.set("filter[docketId]", options.docketId);
  }
  if (options.subtype !== undefined) {
    query.set("filter[subtype]", options.subtype);
  }
  query.set(
    "sort",
    resource.kind === "document-list"
      ? REGULATIONS_GOV_DOCUMENT_SORT
      : REGULATIONS_GOV_DOCKET_SORT,
  );
  query.set("page[number]", String(options.pageNumber));
  query.set("page[size]", String(options.pageSize));
  return `${resource.path}?${query.toString()}`;
}

function assertCanonicalLength(value: string, path: string): void {
  if (
    value.length > REGULATIONS_GOV_QUERY_POLICY.maximumCanonicalRequestLength
  ) {
    failRegulationsGovContract(
      "limit_exceeded",
      path,
      "canonical request exceeds the contract size limit",
    );
  }
}

export function buildRegulationsGovRelativeRequest(
  resourcePath: string,
  options: RegulationsGovQueryOptions = {},
): RegulationsGovRelativeRequest {
  const resource = parseRegulationsGovResourcePath(resourcePath);
  const validatedOptions = validateOptions(resource, options);
  const canonicalPathAndQuery = canonicalRequest(resource, validatedOptions);
  assertCanonicalLength(canonicalPathAndQuery, "$request");
  return { resource, options: validatedOptions, canonicalPathAndQuery };
}

function rawPositiveInteger(value: string | null, path: string): number {
  if (value === null || !/^[1-9]\d*$/.test(value)) {
    failRegulationsGovContract(
      "invalid_value",
      path,
      "expected a positive base-10 integer without padding",
    );
  }
  return Number(value);
}

export function assertRegulationsGovRelativeRequest(
  value: unknown,
): RegulationsGovRelativeRequest {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    !value.startsWith(`${REGULATIONS_GOV_API_ROOT}/`) ||
    value.startsWith("//") ||
    value.includes("#")
  ) {
    failRegulationsGovContract(
      "invalid_url",
      "$request",
      "expected a bounded keyless relative /v4 request",
    );
  }
  assertCanonicalLength(value, "$request");
  const separator = value.indexOf("?");
  const path = separator === -1 ? value : value.slice(0, separator);
  const rawQuery = separator === -1 ? "" : value.slice(separator + 1);
  const resource = parseRegulationsGovResourcePath(path);
  const parameters = new URLSearchParams(rawQuery);
  for (const key of parameters.keys()) {
    if (CREDENTIAL_QUERY_KEY_PATTERN.test(key)) {
      failRegulationsGovContract(
        "unexpected_field",
        `$request.${key}`,
        "credential-bearing query parameters are forbidden",
      );
    }
    if (SEARCH_QUERY_KEY_PATTERN.test(key)) {
      failRegulationsGovContract(
        "unexpected_field",
        `$request.${key}`,
        "search, keyword, and relevance queries are forbidden",
      );
    }
    if (!QUERY_KEYS.has(key)) {
      failRegulationsGovContract(
        "unexpected_field",
        `$request.${key}`,
        "query parameter is outside the reviewed contract",
      );
    }
    if (parameters.getAll(key).length !== 1) {
      failRegulationsGovContract(
        "duplicate_value",
        `$request.${key}`,
        "duplicate query parameter",
      );
    }
  }

  const options: RegulationsGovQueryOptions = {};
  if (resource.paginated) {
    const sort = parameters.get("sort");
    const expectedSort =
      resource.kind === "document-list"
        ? REGULATIONS_GOV_DOCUMENT_SORT
        : REGULATIONS_GOV_DOCKET_SORT;
    if (sort !== expectedSort) {
      failRegulationsGovContract(
        "invalid_value",
        "$request.sort",
        `expected the stable ascending sort ${expectedSort}`,
      );
    }
    const ge = parameters.get("filter[lastModifiedDate][ge]");
    const le = parameters.get("filter[lastModifiedDate][le]");
    if (ge !== null) options.lastModifiedDateGe = ge;
    if (le !== null) options.lastModifiedDateLe = le;
    options.pageNumber = rawPositiveInteger(
      parameters.get("page[number]"),
      "$request.page[number]",
    );
    options.pageSize = rawPositiveInteger(
      parameters.get("page[size]"),
      "$request.page[size]",
    );
    const agencyId = parameters.get("filter[agencyId]");
    const documentType = parameters.get("filter[documentType]");
    const docketType = parameters.get("filter[docketType]");
    const docketId = parameters.get("filter[docketId]");
    const subtype = parameters.get("filter[subtype]");
    if (agencyId !== null) options.agencyId = agencyId;
    if (documentType !== null) {
      options.documentType = documentType as RegulationsGovDocumentType;
    }
    if (docketType !== null) {
      options.docketType = docketType as RegulationsGovDocketType;
    }
    if (docketId !== null) options.docketId = docketId;
    if (subtype !== null) options.subtype = subtype;
    if (parameters.has("include")) {
      options.include = parameters.get("include") as "attachments";
    }
  } else if (parameters.has("include")) {
    options.include = parameters.get("include") as "attachments";
  }

  const validatedOptions = validateOptions(resource, options);
  const canonicalPathAndQuery = canonicalRequest(resource, validatedOptions);
  if (value !== canonicalPathAndQuery) {
    failRegulationsGovContract(
      "invalid_url",
      "$request",
      "request is not in canonical keyless form",
    );
  }
  return { resource, options: validatedOptions, canonicalPathAndQuery };
}
