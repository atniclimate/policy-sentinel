import {
  FEDERAL_REGISTER_DISCOVERY_FIELDS,
  FEDERAL_REGISTER_ORIGIN,
  FEDERAL_REGISTER_PATHS,
  FEDERAL_REGISTER_QUERY_POLICY,
} from "./constants";

export type FederalRegisterDocumentType =
  | "Rule"
  | "Proposed Rule"
  | "Notice"
  | "Presidential Document"
  | "Uncategorized Document";

export interface FederalRegisterAgency {
  raw_name: string;
  name?: string;
  id?: number;
  url?: string;
  json_url?: string;
  parent_id?: number | null;
  slug?: string;
}

export interface FederalRegisterCfrTopic {
  cfr_part: string;
  cfr_chapter: string | null;
  topics: string[];
  cfr_title: number;
}

export interface FederalRegisterCfrReference {
  chapter: string | number | null;
  citation_url: string | null;
  part: string | number | null;
  title: number;
}

export interface FederalRegisterRelatedDocument {
  document_number: string;
  relationship_type: string | null;
  html_url: string;
  action: string | null;
  publication_date: string;
  title: string;
  docket_number: string | null;
}

export type FederalRegisterRelatedDocuments = Record<
  string,
  FederalRegisterRelatedDocument[]
>;

export interface FederalRegisterDocument {
  document_number: string;
  title: string;
  type: FederalRegisterDocumentType;
  subtype: string | null;
  abstract: string | null;
  action: string | null;
  dates: string | null;
  publication_date: string;
  effective_on: string | null;
  comments_close_on: string | null;
  signing_date: string | null;
  citation: string | null;
  volume: number;
  start_page: number;
  end_page: number;
  agencies: FederalRegisterAgency[];
  agency_names: string[];
  docket_ids: string[];
  regulation_id_numbers: string[];
  topics: string[];
  cfr_topics: FederalRegisterCfrTopic[] | null;
  cfr_references: FederalRegisterCfrReference[] | null;
  correction_of: string | null;
  corrections: string[];
  related_documents: FederalRegisterRelatedDocuments;
  disposition_notes: string | null;
  html_url: string;
  pdf_url: string | null;
  json_url: string;
  mods_url: string | null;
}

export interface FederalRegisterSearchPage {
  description: string;
  count: number;
  total_pages?: number;
  next_page_url?: string | null;
  previous_page_url?: string | null;
  results?: FederalRegisterDocument[];
}

export interface FederalRegisterDocumentBatch {
  count: number;
  results: FederalRegisterDocument[];
}

export interface FederalRegisterDailyFacetEntry {
  count: number;
  name: string;
}

export type FederalRegisterDailyFacet = Record<
  string,
  FederalRegisterDailyFacetEntry
>;

export interface FederalRegisterIssueInventory {
  publicationDate: string;
  documentNumbers: string[];
  occurrenceCount: number;
}

export interface FederalRegisterDateBounds {
  start: string;
  end: string;
}

export interface FederalRegisterSearchPageContext {
  range: FederalRegisterDateBounds;
  expectedCount?: number;
}

export type FederalRegisterContractErrorCode =
  | "duplicate_value"
  | "inconsistent_response"
  | "invalid_type"
  | "invalid_url"
  | "invalid_value"
  | "limit_exceeded"
  | "missing_field"
  | "relationship_mismatch"
  | "unexpected_field";

export class FederalRegisterContractError extends Error {
  readonly code: FederalRegisterContractErrorCode;
  readonly path: string;

  constructor(
    code: FederalRegisterContractErrorCode,
    path: string,
    message: string,
  ) {
    super(`Federal Register contract ${code} at ${path}: ${message}`);
    this.name = "FederalRegisterContractError";
    this.code = code;
    this.path = path;
  }
}

type JsonObject = Record<string, unknown>;

const DOCUMENT_TYPES = new Set<FederalRegisterDocumentType>([
  "Rule",
  "Proposed Rule",
  "Notice",
  "Presidential Document",
  "Uncategorized Document",
]);
const DOCUMENT_NUMBER_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function fail(
  code: FederalRegisterContractErrorCode,
  path: string,
  message: string,
): never {
  throw new FederalRegisterContractError(code, path, message);
}

function object(value: unknown, path: string): JsonObject {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail("invalid_type", path, "expected a plain object");
  }
  return value as JsonObject;
}

function exactKeys(
  value: JsonObject,
  path: string,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      fail("unexpected_field", `${path}.${key}`, "field is not retained");
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      fail("missing_field", `${path}.${key}`, "required field is missing");
    }
  }
}

function string(value: unknown, path: string, maximumLength = 16_384): string {
  if (typeof value !== "string") {
    fail("invalid_type", path, "expected a string");
  }
  if (value.length === 0 || value.trim().length === 0) {
    fail("invalid_value", path, "expected a nonblank string");
  }
  if (value.length > maximumLength) {
    fail("limit_exceeded", path, "string exceeds the contract limit");
  }
  return value;
}

function nullableString(
  value: unknown,
  path: string,
  maximumLength = 16_384,
): string | null {
  return value === null ? null : string(value, path, maximumLength);
}

function integer(
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
    fail("invalid_value", path, "expected a bounded safe integer");
  }
  return value;
}

function date(value: unknown, path: string): string {
  const parsed = string(value, path, 10);
  const match = DATE_PATTERN.exec(parsed);
  if (!match) {
    fail("invalid_value", path, "expected an ISO calendar date");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) {
    fail("invalid_value", path, "expected a real ISO calendar date");
  }
  return parsed;
}

function nullableDate(value: unknown, path: string): string | null {
  return value === null ? null : date(value, path);
}

function documentNumber(value: unknown, path: string): string {
  const parsed = string(value, path, 64);
  if (!DOCUMENT_NUMBER_PATTERN.test(parsed)) {
    fail("invalid_value", path, "expected a Federal Register identifier");
  }
  return parsed;
}

function uniqueStrings(
  value: unknown,
  path: string,
  maximumItems = 1_000,
  maximumLength = 2_048,
): string[] {
  if (!Array.isArray(value)) {
    fail("invalid_type", path, "expected an array");
  }
  if (value.length > maximumItems) {
    fail("limit_exceeded", path, "array exceeds the contract limit");
  }
  const result = value.map((item, index) =>
    string(item, `${path}[${index}]`, maximumLength),
  );
  if (new Set(result).size !== result.length) {
    fail("duplicate_value", path, "array contains a duplicate value");
  }
  return result;
}

function strings(
  value: unknown,
  path: string,
  maximumItems = 1_000,
  maximumLength = 2_048,
): string[] {
  if (!Array.isArray(value)) {
    fail("invalid_type", path, "expected an array");
  }
  if (value.length > maximumItems) {
    fail("limit_exceeded", path, "array exceeds the contract limit");
  }
  return value.map((item, index) =>
    string(item, `${path}[${index}]`, maximumLength),
  );
}

function httpsUrl(value: unknown, path: string): URL {
  const raw = string(value, path, 8_192);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    fail("invalid_url", path, "expected an absolute URL");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.port !== "" ||
    parsed.hash !== ""
  ) {
    fail("invalid_url", path, "URL violates the HTTPS boundary");
  }
  return parsed;
}

function federalRegisterUrl(
  value: unknown,
  path: string,
  expectedPath?: string,
): string {
  const parsed = httpsUrl(value, path);
  if (parsed.origin !== FEDERAL_REGISTER_ORIGIN || parsed.search !== "") {
    fail("invalid_url", path, "URL is outside the Federal Register boundary");
  }
  if (expectedPath !== undefined && parsed.pathname !== expectedPath) {
    fail("invalid_url", path, "URL path does not match its identifier");
  }
  return parsed.href;
}

function searchPageUrl(value: unknown, path: string): string {
  const parsed = httpsUrl(value, path);
  if (
    parsed.origin !== FEDERAL_REGISTER_ORIGIN ||
    parsed.pathname !== FEDERAL_REGISTER_PATHS.search
  ) {
    fail("invalid_url", path, "URL is not a Federal Register search URL");
  }
  return parsed.href;
}

function parseAgency(value: unknown, path: string): FederalRegisterAgency {
  const parsed = object(value, path);
  exactKeys(
    parsed,
    path,
    ["raw_name"],
    ["name", "id", "url", "json_url", "parent_id", "slug"],
  );
  const agency: FederalRegisterAgency = {
    raw_name: string(parsed.raw_name, `${path}.raw_name`, 1_024),
  };
  if (Object.hasOwn(parsed, "name")) {
    agency.name = string(parsed.name, `${path}.name`, 1_024);
  }
  if (Object.hasOwn(parsed, "id")) {
    agency.id = integer(parsed.id, `${path}.id`, 1, Number.MAX_SAFE_INTEGER);
  }
  if (Object.hasOwn(parsed, "url")) {
    agency.url = federalRegisterUrl(parsed.url, `${path}.url`);
  }
  if (Object.hasOwn(parsed, "json_url")) {
    agency.json_url = federalRegisterUrl(parsed.json_url, `${path}.json_url`);
  }
  if (Object.hasOwn(parsed, "parent_id")) {
    agency.parent_id =
      parsed.parent_id === null
        ? null
        : integer(
            parsed.parent_id,
            `${path}.parent_id`,
            1,
            Number.MAX_SAFE_INTEGER,
          );
  }
  if (Object.hasOwn(parsed, "slug")) {
    agency.slug = string(parsed.slug, `${path}.slug`, 256);
  }
  return agency;
}

function parseCfrTopic(value: unknown, path: string): FederalRegisterCfrTopic {
  const parsed = object(value, path);
  exactKeys(parsed, path, ["cfr_part", "cfr_chapter", "topics", "cfr_title"]);
  return {
    cfr_part: string(parsed.cfr_part, `${path}.cfr_part`, 64),
    cfr_chapter: nullableString(parsed.cfr_chapter, `${path}.cfr_chapter`, 64),
    topics: uniqueStrings(parsed.topics, `${path}.topics`, 100, 512),
    cfr_title: integer(parsed.cfr_title, `${path}.cfr_title`, 1, 50),
  };
}

function parseCfrReference(
  value: unknown,
  path: string,
): FederalRegisterCfrReference {
  const parsed = object(value, path);
  exactKeys(parsed, path, ["chapter", "citation_url", "part", "title"]);
  const part =
    parsed.part === null
      ? null
      : typeof parsed.part === "number"
        ? integer(parsed.part, `${path}.part`, 0, 100_000)
        : string(parsed.part, `${path}.part`, 64);
  let citationUrl: string | null = null;
  if (parsed.citation_url !== null) {
    const url = httpsUrl(parsed.citation_url, `${path}.citation_url`);
    if (url.hostname !== "www.ecfr.gov" || url.search !== "") {
      fail("invalid_url", `${path}.citation_url`, "expected an eCFR URL");
    }
    citationUrl = url.href;
  }
  const chapter =
    parsed.chapter === null
      ? null
      : typeof parsed.chapter === "number"
        ? integer(parsed.chapter, `${path}.chapter`, 0, 100_000)
        : string(parsed.chapter, `${path}.chapter`, 64);
  return {
    chapter,
    citation_url: citationUrl,
    part,
    title: integer(parsed.title, `${path}.title`, 1, 50),
  };
}

function parseRelatedDocument(
  value: unknown,
  path: string,
): FederalRegisterRelatedDocument {
  const parsed = object(value, path);
  exactKeys(parsed, path, [
    "document_number",
    "relationship_type",
    "html_url",
    "action",
    "publication_date",
    "title",
    "docket_number",
  ]);
  const id = documentNumber(parsed.document_number, `${path}.document_number`);
  const htmlUrl = string(parsed.html_url, `${path}.html_url`, 256);
  if (
    htmlUrl !== `/d/${id}` &&
    htmlUrl !== `${FEDERAL_REGISTER_ORIGIN}/d/${id}`
  ) {
    fail(
      "invalid_url",
      `${path}.html_url`,
      "related-document path does not match its identifier",
    );
  }
  return {
    document_number: id,
    relationship_type: nullableString(
      parsed.relationship_type,
      `${path}.relationship_type`,
      256,
    ),
    html_url: htmlUrl,
    action: nullableString(parsed.action, `${path}.action`, 32_768),
    publication_date: date(parsed.publication_date, `${path}.publication_date`),
    title: string(parsed.title, `${path}.title`, 16_384),
    docket_number: nullableString(
      parsed.docket_number,
      `${path}.docket_number`,
      1_024,
    ),
  };
}

function parseRelatedDocuments(
  value: unknown,
  path: string,
): FederalRegisterRelatedDocuments {
  const parsed = object(value, path);
  const result: FederalRegisterRelatedDocuments = {};
  const seenIds = new Map<
    string,
    { docketLabel: string; document: FederalRegisterRelatedDocument }
  >();
  if (Object.keys(parsed).length > 1_000) {
    fail("limit_exceeded", path, "too many related-document groups");
  }
  for (const [docketLabel, documentsValue] of Object.entries(parsed)) {
    string(docketLabel, `${path}.$key`, 1_024);
    const documents = parseArray(
      documentsValue,
      `${path}[${JSON.stringify(docketLabel)}]`,
      1_000,
      parseRelatedDocument,
    );
    if (documents.length === 0) {
      fail(
        "invalid_value",
        `${path}[${JSON.stringify(docketLabel)}]`,
        "related-document group cannot be empty",
      );
    }
    for (const document of documents) {
      const previous = seenIds.get(document.document_number);
      if (
        previous !== undefined &&
        (previous.docketLabel === docketLabel ||
          previous.document.relationship_type !== document.relationship_type ||
          previous.document.html_url !== document.html_url ||
          previous.document.action !== document.action ||
          previous.document.publication_date !== document.publication_date ||
          previous.document.title !== document.title)
      ) {
        fail(
          "inconsistent_response",
          path,
          "repeated related-document metadata differs across docket groups",
        );
      }
      if (previous === undefined) {
        seenIds.set(document.document_number, { docketLabel, document });
      }
    }
    result[docketLabel] = documents;
  }
  return result;
}

function parseArray<T>(
  value: unknown,
  path: string,
  maximumItems: number,
  parser: (item: unknown, itemPath: string) => T,
): T[] {
  if (!Array.isArray(value)) {
    fail("invalid_type", path, "expected an array");
  }
  if (value.length > maximumItems) {
    fail("limit_exceeded", path, "array exceeds the contract limit");
  }
  return value.map((item, index) => parser(item, `${path}[${index}]`));
}

function parseCorrectionUrl(
  value: unknown,
  path: string,
  ownerId?: string,
): string {
  const parsed = httpsUrl(value, path);
  const prefix = FEDERAL_REGISTER_PATHS.detail;
  if (
    parsed.origin !== FEDERAL_REGISTER_ORIGIN ||
    parsed.search !== "" ||
    !parsed.pathname.startsWith(prefix) ||
    parsed.pathname === prefix
  ) {
    fail("invalid_url", path, "expected a Federal Register document API URL");
  }
  let id: string;
  try {
    id = decodeURIComponent(parsed.pathname.slice(prefix.length));
  } catch {
    fail("invalid_url", path, "document API URL has invalid path encoding");
  }
  documentNumber(id, path);
  if (id === ownerId) {
    fail("relationship_mismatch", path, "document cannot relate to itself");
  }
  return parsed.href;
}

function parseProviderJsonUrl(
  value: unknown,
  path: string,
  id: string,
  publicationDate: string,
): string {
  const parsed = httpsUrl(value, path);
  if (
    parsed.origin !== FEDERAL_REGISTER_ORIGIN ||
    parsed.pathname !== `${FEDERAL_REGISTER_PATHS.detail}${id}` ||
    parsed.searchParams.size !== 1 ||
    parsed.searchParams.getAll("publication_date").length !== 1 ||
    parsed.searchParams.get("publication_date") !== publicationDate
  ) {
    fail(
      "invalid_url",
      path,
      "JSON URL does not match its identifier and publication date",
    );
  }
  return parsed.href;
}

function parseProviderDocumentUrl(
  value: unknown,
  path: string,
  id: string,
  publicationDate: string,
): string {
  const parsed = httpsUrl(value, path);
  const [year, month, day] = publicationDate.split("-");
  const prefix = `/documents/${year}/${month}/${day}/${id}`;
  if (
    parsed.origin !== FEDERAL_REGISTER_ORIGIN ||
    parsed.search !== "" ||
    (parsed.pathname !== prefix && !parsed.pathname.startsWith(`${prefix}/`))
  ) {
    fail(
      "invalid_url",
      path,
      "document URL does not match its identifier/date",
    );
  }
  return parsed.href;
}

function parseGovInfoUrl(
  value: unknown,
  path: string,
  id: string,
  publicationDate: string,
  kind: "pdf" | "mods",
): string {
  const parsed = httpsUrl(value, path);
  if (parsed.hostname !== "www.govinfo.gov" || parsed.search !== "") {
    fail("invalid_url", path, "expected a GovInfo URL");
  }
  if (kind === "pdf") {
    const expectedFragment = `/FR-${publicationDate}/pdf/${id}.pdf`;
    if (!parsed.pathname.endsWith(expectedFragment)) {
      fail("invalid_url", path, "PDF URL does not match its identifier/date");
    }
  } else if (!parsed.pathname.includes(`/${id}/`)) {
    fail("invalid_url", path, "MODS URL does not match its identifier");
  }
  return parsed.href;
}

export function parseFederalRegisterDocument(
  value: unknown,
  path = "$",
): FederalRegisterDocument {
  const parsed = object(value, path);
  exactKeys(parsed, path, FEDERAL_REGISTER_DISCOVERY_FIELDS);

  const id = documentNumber(parsed.document_number, `${path}.document_number`);
  const publicationDate = date(
    parsed.publication_date,
    `${path}.publication_date`,
  );
  const type = string(parsed.type, `${path}.type`, 64);
  if (!DOCUMENT_TYPES.has(type as FederalRegisterDocumentType)) {
    fail("invalid_value", `${path}.type`, "unknown document type");
  }

  const corrections = parseArray(
    parsed.corrections,
    `${path}.corrections`,
    100,
    (item, itemPath) => parseCorrectionUrl(item, itemPath, id),
  );
  if (new Set(corrections).size !== corrections.length) {
    fail(
      "duplicate_value",
      `${path}.corrections`,
      "correction URL is duplicated",
    );
  }

  const relatedDocuments = parseRelatedDocuments(
    parsed.related_documents,
    `${path}.related_documents`,
  );
  if (
    Object.values(relatedDocuments).some((documents) =>
      documents.some((document) => document.document_number === id),
    )
  ) {
    fail(
      "relationship_mismatch",
      `${path}.related_documents`,
      "document cannot relate to itself",
    );
  }

  const volume = integer(parsed.volume, `${path}.volume`, 1, 10_000);
  const startPage = integer(
    parsed.start_page,
    `${path}.start_page`,
    0,
    10_000_000,
  );
  const endPage = integer(parsed.end_page, `${path}.end_page`, 0, 10_000_000);
  if (
    (startPage === 0) !== (endPage === 0) ||
    (startPage > 0 && endPage < startPage)
  ) {
    fail(
      "inconsistent_response",
      path,
      "page bounds must be ordered positive values or the observed zero pair",
    );
  }

  return {
    document_number: id,
    title: string(parsed.title, `${path}.title`, 16_384),
    type: type as FederalRegisterDocumentType,
    subtype: nullableString(parsed.subtype, `${path}.subtype`, 512),
    abstract: nullableString(parsed.abstract, `${path}.abstract`, 128_000),
    action: nullableString(parsed.action, `${path}.action`, 32_768),
    dates: nullableString(parsed.dates, `${path}.dates`, 64_000),
    publication_date: publicationDate,
    effective_on: nullableDate(parsed.effective_on, `${path}.effective_on`),
    comments_close_on: nullableDate(
      parsed.comments_close_on,
      `${path}.comments_close_on`,
    ),
    signing_date: nullableDate(parsed.signing_date, `${path}.signing_date`),
    citation: nullableString(parsed.citation, `${path}.citation`, 256),
    volume,
    start_page: startPage,
    end_page: endPage,
    agencies: parseArray(parsed.agencies, `${path}.agencies`, 100, parseAgency),
    agency_names: strings(
      parsed.agency_names,
      `${path}.agency_names`,
      100,
      1_024,
    ),
    docket_ids: uniqueStrings(
      parsed.docket_ids,
      `${path}.docket_ids`,
      1_000,
      1_024,
    ),
    regulation_id_numbers: uniqueStrings(
      parsed.regulation_id_numbers,
      `${path}.regulation_id_numbers`,
      1_000,
      256,
    ),
    topics: uniqueStrings(parsed.topics, `${path}.topics`, 1_000, 1_024),
    cfr_topics:
      parsed.cfr_topics === null
        ? null
        : parseArray(
            parsed.cfr_topics,
            `${path}.cfr_topics`,
            1_000,
            parseCfrTopic,
          ),
    cfr_references:
      parsed.cfr_references === null
        ? null
        : parseArray(
            parsed.cfr_references,
            `${path}.cfr_references`,
            1_000,
            parseCfrReference,
          ),
    correction_of:
      parsed.correction_of === null
        ? null
        : parseCorrectionUrl(parsed.correction_of, `${path}.correction_of`, id),
    corrections,
    related_documents: relatedDocuments,
    disposition_notes: nullableString(
      parsed.disposition_notes,
      `${path}.disposition_notes`,
      32_768,
    ),
    html_url: parseProviderDocumentUrl(
      parsed.html_url,
      `${path}.html_url`,
      id,
      publicationDate,
    ),
    pdf_url:
      parsed.pdf_url === null
        ? null
        : parseGovInfoUrl(
            parsed.pdf_url,
            `${path}.pdf_url`,
            id,
            publicationDate,
            "pdf",
          ),
    json_url: parseProviderJsonUrl(
      parsed.json_url,
      `${path}.json_url`,
      id,
      publicationDate,
    ),
    mods_url:
      parsed.mods_url === null
        ? null
        : parseGovInfoUrl(
            parsed.mods_url,
            `${path}.mods_url`,
            id,
            publicationDate,
            "mods",
          ),
  };
}

function assertDateBounds(bounds: FederalRegisterDateBounds, path: string) {
  const start = date(bounds.start, `${path}.start`);
  const end = date(bounds.end, `${path}.end`);
  if (start > end) {
    fail("invalid_value", path, "date range is reversed");
  }
  return { start, end };
}

export function parseFederalRegisterSearchPage(
  value: unknown,
  context: FederalRegisterSearchPageContext,
): FederalRegisterSearchPage {
  const parsed = object(value, "$");
  exactKeys(
    parsed,
    "$",
    ["description", "count"],
    ["total_pages", "next_page_url", "previous_page_url", "results"],
  );
  const range = assertDateBounds(context.range, "$context.range");
  const count = integer(
    parsed.count,
    "$.count",
    0,
    FEDERAL_REGISTER_QUERY_POLICY.maximumObservedWindow,
  );
  if (context.expectedCount !== undefined && count !== context.expectedCount) {
    fail(
      "inconsistent_response",
      "$.count",
      "page count changed during traversal",
    );
  }

  const result: FederalRegisterSearchPage = {
    description: string(parsed.description, "$.description", 16_384),
    count,
  };
  const results = Object.hasOwn(parsed, "results")
    ? parseArray(
        parsed.results,
        "$.results",
        1_000,
        parseFederalRegisterDocument,
      )
    : undefined;

  if (count === 0) {
    if (results !== undefined && results.length !== 0) {
      fail(
        "inconsistent_response",
        "$.results",
        "zero-count response contains results",
      );
    }
    if (
      Object.hasOwn(parsed, "total_pages") &&
      integer(parsed.total_pages, "$.total_pages", 0, 0) !== 0
    ) {
      fail("inconsistent_response", "$.total_pages", "expected zero pages");
    }
    if (
      (Object.hasOwn(parsed, "next_page_url") &&
        parsed.next_page_url !== null) ||
      (Object.hasOwn(parsed, "previous_page_url") &&
        parsed.previous_page_url !== null)
    ) {
      fail(
        "inconsistent_response",
        "$",
        "zero-count response cannot contain pagination links",
      );
    }
  } else {
    if (results === undefined || results.length === 0) {
      fail(
        "inconsistent_response",
        "$.results",
        "nonzero response has no results",
      );
    }
    if (results.length > count) {
      fail(
        "inconsistent_response",
        "$.results",
        "page contains more results than the reported count",
      );
    }
    if (!Object.hasOwn(parsed, "total_pages")) {
      fail(
        "missing_field",
        "$.total_pages",
        "nonzero response needs page count",
      );
    }
    const totalPages = integer(
      parsed.total_pages,
      "$.total_pages",
      1,
      FEDERAL_REGISTER_QUERY_POLICY.maximumPageNumber,
    );
    if (
      totalPages !== Math.ceil(count / FEDERAL_REGISTER_QUERY_POLICY.pageSize)
    ) {
      fail(
        "inconsistent_response",
        "$.total_pages",
        "page count does not match result count",
      );
    }
  }

  if (results !== undefined) {
    const ids = new Set<string>();
    for (const [index, document] of results.entries()) {
      if (
        document.publication_date < range.start ||
        document.publication_date > range.end
      ) {
        fail(
          "inconsistent_response",
          `$.results[${index}].publication_date`,
          "document falls outside the requested slice",
        );
      }
      if (ids.has(document.document_number)) {
        fail(
          "duplicate_value",
          `$.results[${index}].document_number`,
          "page repeats a document identifier",
        );
      }
      ids.add(document.document_number);
    }
    result.results = results;
  }
  if (Object.hasOwn(parsed, "total_pages")) {
    result.total_pages = integer(
      parsed.total_pages,
      "$.total_pages",
      0,
      FEDERAL_REGISTER_QUERY_POLICY.maximumPageNumber,
    );
  }
  if (Object.hasOwn(parsed, "next_page_url")) {
    result.next_page_url =
      parsed.next_page_url === null
        ? null
        : searchPageUrl(parsed.next_page_url, "$.next_page_url");
  }
  if (Object.hasOwn(parsed, "previous_page_url")) {
    result.previous_page_url =
      parsed.previous_page_url === null
        ? null
        : searchPageUrl(parsed.previous_page_url, "$.previous_page_url");
  }
  return result;
}

export function parseFederalRegisterDocumentBatch(
  value: unknown,
  expectedDocumentNumbers: readonly string[],
): FederalRegisterDocumentBatch {
  if (
    expectedDocumentNumbers.length === 0 ||
    expectedDocumentNumbers.length >
      FEDERAL_REGISTER_QUERY_POLICY.maximumDocumentBatchSize
  ) {
    fail("limit_exceeded", "$expected", "invalid document batch size");
  }
  const expected = expectedDocumentNumbers.map((id, index) =>
    documentNumber(id, `$expected[${index}]`),
  );
  if (new Set(expected).size !== expected.length) {
    fail("duplicate_value", "$expected", "requested identifier is duplicated");
  }

  const parsed = object(value, "$");
  exactKeys(parsed, "$", ["count", "results"], ["errors"]);
  if (Object.hasOwn(parsed, "errors")) {
    const errors = object(parsed.errors, "$.errors");
    exactKeys(errors, "$.errors", ["not_found"]);
    uniqueStrings(errors.not_found, "$.errors.not_found", 25, 64);
    fail(
      "inconsistent_response",
      "$.errors",
      "provider returned a partial document batch",
    );
  }
  const results = parseArray(
    parsed.results,
    "$.results",
    FEDERAL_REGISTER_QUERY_POLICY.maximumDocumentBatchSize,
    parseFederalRegisterDocument,
  );
  const count = integer(
    parsed.count,
    "$.count",
    0,
    FEDERAL_REGISTER_QUERY_POLICY.maximumDocumentBatchSize,
  );
  if (count !== results.length || count !== expected.length) {
    fail(
      "inconsistent_response",
      "$.count",
      "batch count does not match the requested exact set",
    );
  }
  const byId = new Map(
    results.map((document) => [document.document_number, document]),
  );
  if (byId.size !== results.length || expected.some((id) => !byId.has(id))) {
    fail(
      "inconsistent_response",
      "$.results",
      "returned identifiers differ from the requested exact set",
    );
  }
  return {
    count,
    results: expected.map((id) => byId.get(id) as FederalRegisterDocument),
  };
}

export function parseFederalRegisterDailyFacet(
  value: unknown,
  bounds: FederalRegisterDateBounds,
): FederalRegisterDailyFacet {
  const parsed = object(value, "$");
  const range = assertDateBounds(bounds, "$context.range");
  const result: FederalRegisterDailyFacet = {};
  for (const [key, entryValue] of Object.entries(parsed)) {
    const entryDate = date(key, `$[${JSON.stringify(key)}]`);
    if (entryDate < range.start || entryDate > range.end) {
      fail(
        "inconsistent_response",
        `$[${JSON.stringify(key)}]`,
        "facet date falls outside the requested range",
      );
    }
    const entry = object(entryValue, `$[${JSON.stringify(key)}]`);
    exactKeys(entry, `$[${JSON.stringify(key)}]`, ["count", "name"]);
    result[entryDate] = {
      count: integer(
        entry.count,
        `$[${JSON.stringify(key)}].count`,
        0,
        1_000_000,
      ),
      name: string(entry.name, `$[${JSON.stringify(key)}].name`, 128),
    };
  }
  return result;
}

export const parseFederalRegisterFacet = parseFederalRegisterDailyFacet;

export function parseFederalRegisterIssueInventory(
  value: unknown,
  expectedPublicationDate: string,
): FederalRegisterIssueInventory {
  const expectedDate = date(
    expectedPublicationDate,
    "$expectedPublicationDate",
  );
  const parsed = object(value, "$");
  exactKeys(parsed, "$", ["agencies"], ["meta"]);
  if (Object.hasOwn(parsed, "meta")) {
    const meta = object(parsed.meta, "$.meta");
    exactKeys(meta, "$.meta", [], ["publication_date"]);
    if (
      Object.hasOwn(meta, "publication_date") &&
      date(meta.publication_date, "$.meta.publication_date") !== expectedDate
    ) {
      fail(
        "inconsistent_response",
        "$.meta.publication_date",
        "issue date differs from the requested date",
      );
    }
  }

  const occurrences: string[] = [];
  const agencies = parseArray(
    parsed.agencies,
    "$.agencies",
    1_000,
    (item, path) => {
      const agency = object(item, path);
      exactKeys(
        agency,
        path,
        ["name", "slug", "document_categories"],
        ["see_also"],
      );
      string(agency.name, `${path}.name`, 1_024);
      string(agency.slug, `${path}.slug`, 256);
      if (Object.hasOwn(agency, "see_also")) {
        parseArray(
          agency.see_also,
          `${path}.see_also`,
          1_000,
          (seeAlsoValue, seeAlsoPath) => {
            const seeAlso = object(seeAlsoValue, seeAlsoPath);
            exactKeys(seeAlso, seeAlsoPath, ["name", "slug"]);
            string(seeAlso.name, `${seeAlsoPath}.name`, 1_024);
            string(seeAlso.slug, `${seeAlsoPath}.slug`, 256);
            return null;
          },
        );
      }
      return parseArray(
        agency.document_categories,
        `${path}.document_categories`,
        1_000,
        (categoryValue, categoryPath) => {
          const category = object(categoryValue, categoryPath);
          exactKeys(category, categoryPath, ["type", "documents"]);
          if (category.type !== "") {
            string(category.type, `${categoryPath}.type`, 256);
          }
          return parseArray(
            category.documents,
            `${categoryPath}.documents`,
            10_000,
            (documentValue, documentPath) => {
              const document = object(documentValue, documentPath);
              if (!Object.hasOwn(document, "document_numbers")) {
                fail(
                  "missing_field",
                  `${documentPath}.document_numbers`,
                  "required field is missing",
                );
              }
              for (const key of Object.keys(document)) {
                if (
                  key !== "document_numbers" &&
                  !/^subject_[1-9]\d*$/.test(key)
                ) {
                  fail(
                    "unexpected_field",
                    `${documentPath}.${key}`,
                    "unknown issue presentation field",
                  );
                }
                if (key !== "document_numbers" && document[key] !== null) {
                  string(document[key], `${documentPath}.${key}`, 32_768);
                }
              }
              const ids = parseArray(
                document.document_numbers,
                `${documentPath}.document_numbers`,
                100,
                documentNumber,
              );
              if (ids.length === 0) {
                fail(
                  "invalid_value",
                  `${documentPath}.document_numbers`,
                  "document-number group cannot be empty",
                );
              }
              if (new Set(ids).size !== ids.length) {
                fail(
                  "duplicate_value",
                  `${documentPath}.document_numbers`,
                  "document-number group contains a duplicate",
                );
              }
              occurrences.push(...ids);
              if (occurrences.length > 20_000) {
                fail(
                  "limit_exceeded",
                  "$.agencies",
                  "issue inventory exceeds the contract limit",
                );
              }
              return null;
            },
          );
        },
      );
    },
  );
  void agencies;

  if (occurrences.length === 0) {
    fail(
      "inconsistent_response",
      "$.agencies",
      "issue has no document numbers",
    );
  }
  return {
    publicationDate: expectedDate,
    documentNumbers: [...new Set(occurrences)],
    occurrenceCount: occurrences.length,
  };
}

export function parseFederalRegisterCorrectionDocumentNumber(
  value: unknown,
): string {
  const url = parseCorrectionUrl(value, "$");
  return decodeURIComponent(
    new URL(url).pathname.slice(FEDERAL_REGISTER_PATHS.detail.length),
  );
}

export function reconcileFederalRegisterCorrections(
  documents: readonly FederalRegisterDocument[],
): void {
  const byId = new Map<string, FederalRegisterDocument>();
  for (const [index, document] of documents.entries()) {
    if (byId.has(document.document_number)) {
      fail(
        "duplicate_value",
        `$[${index}].document_number`,
        "document identifier is duplicated",
      );
    }
    byId.set(document.document_number, document);
  }

  const visited = new Set<string>();
  const active = new Set<string>();
  const visitCorrectionOf = (document: FederalRegisterDocument): void => {
    if (active.has(document.document_number)) {
      fail(
        "relationship_mismatch",
        `$.${document.document_number}.correction_of`,
        "correction_of graph contains a cycle",
      );
    }
    if (visited.has(document.document_number)) {
      return;
    }
    active.add(document.document_number);
    if (document.correction_of !== null) {
      const antecedentId = parseFederalRegisterCorrectionDocumentNumber(
        document.correction_of,
      );
      const antecedent = byId.get(antecedentId);
      if (antecedent !== undefined) {
        visitCorrectionOf(antecedent);
      }
    }
    active.delete(document.document_number);
    visited.add(document.document_number);
  };
  for (const document of documents) {
    visitCorrectionOf(document);
  }

  for (const document of documents) {
    for (const correctionUrl of document.corrections) {
      const correctionId =
        parseFederalRegisterCorrectionDocumentNumber(correctionUrl);
      const correction = byId.get(correctionId);
      if (
        correction === undefined ||
        correction.correction_of === null ||
        parseFederalRegisterCorrectionDocumentNumber(
          correction.correction_of,
        ) !== document.document_number
      ) {
        fail(
          "relationship_mismatch",
          `$.${document.document_number}.corrections`,
          "correction is missing or nonreciprocal",
        );
      }
    }
    if (document.correction_of !== null) {
      const originalId = parseFederalRegisterCorrectionDocumentNumber(
        document.correction_of,
      );
      const original = byId.get(originalId);
      if (
        original === undefined ||
        !original.corrections.some(
          (url) =>
            parseFederalRegisterCorrectionDocumentNumber(url) ===
            document.document_number,
        )
      ) {
        fail(
          "relationship_mismatch",
          `$.${document.document_number}.correction_of`,
          "antecedent is missing or nonreciprocal",
        );
      }
      if (document.publication_date < original.publication_date) {
        fail(
          "relationship_mismatch",
          `$.${document.document_number}.publication_date`,
          "correction publication precedes its antecedent",
        );
      }
    }
  }
}

const REQUIRED_OPEN_API_PATHS = [
  "/documents.{format}",
  "/documents/{document_number}.{format}",
  "/documents/{document_numbers}.{format}",
  "/documents/facets/{facet}",
  "/issues/{publication_date}.{format}",
] as const;

const REQUIRED_SEARCH_PARAMETERS = [
  "format",
  "fields[]",
  "per_page",
  "page",
  "order",
  "conditions[publication_date][gte]",
  "conditions[publication_date][lte]",
] as const;

const REQUIRED_BATCH_PARAMETERS = [
  "format",
  "fields[]",
  "document_numbers",
] as const;

const REQUIRED_FACET_PARAMETERS = [
  "facet",
  "conditions[publication_date][gte]",
  "conditions[publication_date][lte]",
] as const;

interface OpenApiParameterEntry {
  value: JsonObject;
  path: string;
}

function openApiSchema(value: JsonObject, path: string): JsonObject {
  if (!Object.hasOwn(value, "schema")) {
    fail("missing_field", `${path}.schema`, "parameter schema is missing");
  }
  return object(value.schema, `${path}.schema`);
}

function assertOpenApiReference(
  value: unknown,
  path: string,
  expected: string,
): void {
  if (string(value, path, 256) !== expected) {
    fail("inconsistent_response", path, "schema reference changed");
  }
}

function openApiParameters(
  operation: JsonObject,
  operationPath: string,
): Map<string, OpenApiParameterEntry> {
  const parameterEntries = parseArray(
    operation.parameters,
    `${operationPath}.parameters`,
    1_000,
    (entry, path) => ({ value: object(entry, path), path }),
  );
  const parameters = new Map<string, OpenApiParameterEntry>();
  for (const entry of parameterEntries) {
    if (typeof entry.value.name !== "string") {
      continue;
    }
    if (parameters.has(entry.value.name)) {
      fail(
        "duplicate_value",
        `${entry.path}.name`,
        "parameter name is duplicated",
      );
    }
    parameters.set(entry.value.name, entry);
  }
  return parameters;
}

function requireOpenApiParameters(
  parameters: ReadonlyMap<string, OpenApiParameterEntry>,
  names: readonly string[],
  operationPath: string,
): void {
  for (const name of names) {
    if (!parameters.has(name)) {
      fail(
        "missing_field",
        `${operationPath}.parameters`,
        "required operation parameter is missing",
      );
    }
  }
}

/**
 * Checks only the reviewed capabilities used by this adapter. The upstream
 * description and enumerations are intentionally allowed to grow.
 */
export function assertFederalRegisterOpenApiProjection(value: unknown): void {
  const root = object(value, "$");
  if (string(root.openapi, "$.openapi", 32) !== "3.0.0") {
    fail("inconsistent_response", "$.openapi", "OpenAPI version changed");
  }
  if (Object.hasOwn(root, "security")) {
    fail(
      "inconsistent_response",
      "$.security",
      "top-level security declaration was introduced",
    );
  }

  const servers = parseArray(root.servers, "$.servers", 100, (entry, path) => {
    const server = object(entry, path);
    return string(server.url, `${path}.url`, 2_048);
  });
  if (
    !servers.some(
      (url) =>
        url === "/api/v1/" || url === `${FEDERAL_REGISTER_ORIGIN}/api/v1/`,
    )
  ) {
    fail(
      "inconsistent_response",
      "$.servers",
      "reviewed API server is missing",
    );
  }

  const paths = object(root.paths, "$.paths");
  for (const requiredPath of REQUIRED_OPEN_API_PATHS) {
    if (!Object.hasOwn(paths, requiredPath)) {
      fail(
        "missing_field",
        `$.paths[${JSON.stringify(requiredPath)}]`,
        "required API path is missing",
      );
    }
    const pathItem = object(
      paths[requiredPath],
      `$.paths[${JSON.stringify(requiredPath)}]`,
    );
    if (!Object.hasOwn(pathItem, "get")) {
      fail(
        "missing_field",
        `$.paths[${JSON.stringify(requiredPath)}].get`,
        "required GET operation is missing",
      );
    }
    object(pathItem.get, `$.paths[${JSON.stringify(requiredPath)}].get`);
  }

  const searchOperation = object(
    object(paths["/documents.{format}"], '$.paths["/documents.{format}"]').get,
    '$.paths["/documents.{format}"].get',
  );
  const parameters = openApiParameters(
    searchOperation,
    '$.paths["/documents.{format}"].get',
  );
  requireOpenApiParameters(
    parameters,
    REQUIRED_SEARCH_PARAMETERS,
    '$.paths["/documents.{format}"].get',
  );

  const formatParameter = parameters.get("format") as {
    value: JsonObject;
    path: string;
  };
  if (
    formatParameter.value.in !== "path" ||
    formatParameter.value.required !== true
  ) {
    fail(
      "inconsistent_response",
      formatParameter.path,
      "format parameter binding changed",
    );
  }
  assertOpenApiReference(
    openApiSchema(formatParameter.value, formatParameter.path).$ref,
    `${formatParameter.path}.schema.$ref`,
    "#/components/schemas/Format",
  );

  const fieldsParameter = parameters.get("fields[]") as {
    value: JsonObject;
    path: string;
  };
  if (
    fieldsParameter.value.in !== "query" ||
    fieldsParameter.value.explode !== true
  ) {
    fail(
      "inconsistent_response",
      fieldsParameter.path,
      "fields parameter binding changed",
    );
  }
  const fieldsSchema = openApiSchema(
    fieldsParameter.value,
    fieldsParameter.path,
  );
  assertOpenApiReference(
    fieldsSchema.$ref,
    `${fieldsParameter.path}.schema.$ref`,
    "#/components/schemas/DocumentField",
  );

  for (const name of REQUIRED_SEARCH_PARAMETERS.filter(
    (parameterName) => parameterName !== "format",
  )) {
    const parameter = parameters.get(name) as {
      value: JsonObject;
      path: string;
    };
    if (parameter.value.in !== "query") {
      fail(
        "inconsistent_response",
        `${parameter.path}.in`,
        "search parameter is no longer query-bound",
      );
    }
  }

  const perPageParameter = parameters.get("per_page") as {
    value: JsonObject;
    path: string;
  };
  const perPageSchema = openApiSchema(
    perPageParameter.value,
    perPageParameter.path,
  );
  if (
    perPageSchema.type !== "integer" ||
    perPageSchema.minimum !== 1 ||
    perPageSchema.maximum !== FEDERAL_REGISTER_QUERY_POLICY.pageSize
  ) {
    fail(
      "inconsistent_response",
      `${perPageParameter.path}.schema`,
      "documented page-size contract changed",
    );
  }

  const orderParameter = parameters.get("order") as {
    value: JsonObject;
    path: string;
  };
  const orderSchema = openApiSchema(orderParameter.value, orderParameter.path);
  const orderItems = object(
    orderSchema.items,
    `${orderParameter.path}.schema.items`,
  );
  const orderValues = uniqueStrings(
    orderItems.enum,
    `${orderParameter.path}.schema.items.enum`,
    100,
    128,
  );
  if (!orderValues.includes(FEDERAL_REGISTER_QUERY_POLICY.order)) {
    fail(
      "inconsistent_response",
      `${orderParameter.path}.schema.items.enum`,
      "oldest-first ordering is missing",
    );
  }

  for (const dateParameterName of [
    "conditions[publication_date][gte]",
    "conditions[publication_date][lte]",
  ] as const) {
    const parameter = parameters.get(dateParameterName) as {
      value: JsonObject;
      path: string;
    };
    const schema = openApiSchema(parameter.value, parameter.path);
    assertOpenApiReference(
      schema.$ref,
      `${parameter.path}.schema.$ref`,
      "#/components/schemas/FrDate",
    );
  }

  const batchOperationPath =
    '$.paths["/documents/{document_numbers}.{format}"].get';
  const batchOperation = object(
    object(
      paths["/documents/{document_numbers}.{format}"],
      '$.paths["/documents/{document_numbers}.{format}"]',
    ).get,
    batchOperationPath,
  );
  const batchParameters = openApiParameters(batchOperation, batchOperationPath);
  requireOpenApiParameters(
    batchParameters,
    REQUIRED_BATCH_PARAMETERS,
    batchOperationPath,
  );

  const batchFormatParameter = batchParameters.get(
    "format",
  ) as OpenApiParameterEntry;
  if (
    batchFormatParameter.value.in !== "path" ||
    batchFormatParameter.value.required !== true
  ) {
    fail(
      "inconsistent_response",
      batchFormatParameter.path,
      "batch format parameter binding changed",
    );
  }
  assertOpenApiReference(
    openApiSchema(batchFormatParameter.value, batchFormatParameter.path).$ref,
    `${batchFormatParameter.path}.schema.$ref`,
    "#/components/schemas/Format",
  );

  const batchFieldsParameter = batchParameters.get(
    "fields[]",
  ) as OpenApiParameterEntry;
  if (
    batchFieldsParameter.value.in !== "query" ||
    batchFieldsParameter.value.explode !== true
  ) {
    fail(
      "inconsistent_response",
      batchFieldsParameter.path,
      "batch fields parameter binding changed",
    );
  }
  assertOpenApiReference(
    openApiSchema(batchFieldsParameter.value, batchFieldsParameter.path).$ref,
    `${batchFieldsParameter.path}.schema.$ref`,
    "#/components/schemas/DocumentField",
  );

  const documentNumbersParameter = batchParameters.get(
    "document_numbers",
  ) as OpenApiParameterEntry;
  if (
    documentNumbersParameter.value.in !== "path" ||
    documentNumbersParameter.value.required !== true ||
    documentNumbersParameter.value.explode !== false
  ) {
    fail(
      "inconsistent_response",
      documentNumbersParameter.path,
      "batch document-number parameter binding changed",
    );
  }
  const documentNumbersSchema = openApiSchema(
    documentNumbersParameter.value,
    documentNumbersParameter.path,
  );
  const documentNumberItems = object(
    documentNumbersSchema.items,
    `${documentNumbersParameter.path}.schema.items`,
  );
  if (
    documentNumbersSchema.type !== "array" ||
    documentNumberItems.type !== "string"
  ) {
    fail(
      "inconsistent_response",
      `${documentNumbersParameter.path}.schema`,
      "batch document-number schema changed",
    );
  }

  const facetOperationPath = '$.paths["/documents/facets/{facet}"].get';
  const facetOperation = object(
    object(
      paths["/documents/facets/{facet}"],
      '$.paths["/documents/facets/{facet}"]',
    ).get,
    facetOperationPath,
  );
  const facetParameters = openApiParameters(facetOperation, facetOperationPath);
  requireOpenApiParameters(
    facetParameters,
    REQUIRED_FACET_PARAMETERS,
    facetOperationPath,
  );

  const facetParameter = facetParameters.get("facet") as OpenApiParameterEntry;
  if (
    facetParameter.value.in !== "path" ||
    facetParameter.value.required !== true
  ) {
    fail(
      "inconsistent_response",
      facetParameter.path,
      "facet selector parameter binding changed",
    );
  }
  assertOpenApiReference(
    openApiSchema(facetParameter.value, facetParameter.path).$ref,
    `${facetParameter.path}.schema.$ref`,
    "#/components/schemas/Facet",
  );

  for (const dateParameterName of [
    "conditions[publication_date][gte]",
    "conditions[publication_date][lte]",
  ] as const) {
    const parameter = facetParameters.get(
      dateParameterName,
    ) as OpenApiParameterEntry;
    if (parameter.value.in !== "query") {
      fail(
        "inconsistent_response",
        `${parameter.path}.in`,
        "facet date parameter is no longer query-bound",
      );
    }
    assertOpenApiReference(
      openApiSchema(parameter.value, parameter.path).$ref,
      `${parameter.path}.schema.$ref`,
      "#/components/schemas/FrDate",
    );
  }

  const components = object(root.components, "$.components");
  if (Object.hasOwn(components, "securitySchemes")) {
    fail(
      "inconsistent_response",
      "$.components.securitySchemes",
      "security schemes were introduced",
    );
  }
  const schemas = object(components.schemas, "$.components.schemas");
  const format = object(schemas.Format, "$.components.schemas.Format");
  const formats = uniqueStrings(
    format.enum,
    "$.components.schemas.Format.enum",
    100,
    128,
  );
  if (!formats.includes("json")) {
    fail(
      "inconsistent_response",
      "$.components.schemas.Format.enum",
      "JSON format is missing",
    );
  }
  const documentField = object(
    schemas.DocumentField,
    "$.components.schemas.DocumentField",
  );
  if (documentField.type !== "array") {
    fail(
      "inconsistent_response",
      "$.components.schemas.DocumentField.type",
      "document-field schema is no longer an array",
    );
  }
  const documentFieldItems = object(
    documentField.items,
    "$.components.schemas.DocumentField.items",
  );
  if (documentFieldItems.type !== "string") {
    fail(
      "inconsistent_response",
      "$.components.schemas.DocumentField.items.type",
      "document-field items are no longer strings",
    );
  }
  const documentFields = new Set(
    uniqueStrings(
      documentFieldItems.enum,
      "$.components.schemas.DocumentField.items.enum",
      1_000,
      256,
    ),
  );
  for (const field of FEDERAL_REGISTER_DISCOVERY_FIELDS) {
    if (!documentFields.has(field)) {
      fail(
        "inconsistent_response",
        "$.components.schemas.DocumentField.items.enum",
        "a selected discovery field is missing",
      );
    }
  }

  const federalRegisterDate = object(
    schemas.FrDate,
    "$.components.schemas.FrDate",
  );
  if (
    federalRegisterDate.type !== "string" ||
    federalRegisterDate.format !== "date"
  ) {
    fail(
      "inconsistent_response",
      "$.components.schemas.FrDate",
      "Federal Register date schema changed",
    );
  }

  const facet = object(schemas.Facet, "$.components.schemas.Facet");
  if (facet.type !== "string") {
    fail(
      "inconsistent_response",
      "$.components.schemas.Facet.type",
      "facet selector schema is no longer a string",
    );
  }
  const facetValues = uniqueStrings(
    facet.enum,
    "$.components.schemas.Facet.enum",
    100,
    128,
  );
  if (!facetValues.includes("daily")) {
    fail(
      "inconsistent_response",
      "$.components.schemas.Facet.enum",
      "daily facet selector is missing",
    );
  }
}
