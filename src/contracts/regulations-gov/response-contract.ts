import {
  REGULATIONS_GOV_CONTRACT_VERSION,
  REGULATIONS_GOV_DOCUMENT_TYPES,
  REGULATIONS_GOV_DOCKET_TYPES,
  REGULATIONS_GOV_QUERY_POLICY,
  REGULATIONS_GOV_SOURCE_ID,
  REGULATIONS_GOV_SYNTHETIC_NOTICE,
  type RegulationsGovDocumentType,
  type RegulationsGovDocketType,
} from "./constants";
import {
  RegulationsGovContractError,
  type RegulationsGovContractErrorCode,
} from "./errors";

export const REGULATIONS_GOV_RESOURCE_BUNDLE_KIND =
  "repository_owned_resource_bundle" as const;
export const REGULATIONS_GOV_MUTATION_OBSERVATION_KIND =
  "repository_owned_mutation_observation" as const;
export const REGULATIONS_GOV_RATE_LIMIT_KIND =
  "repository_owned_rate_limit_projection" as const;

export const REGULATIONS_GOV_HISTORICAL_COMPLETENESS =
  "not_documented" as const;
export const REGULATIONS_GOV_JURISDICTION = "general_jurisdiction" as const;
export const REGULATIONS_GOV_CLASSIFICATION = "Unclassified" as const;
export const REGULATIONS_GOV_MUTATION_IDENTITY_POLICY = {
  observationScope: "same_synthetic_document_id",
  providerBehavior: "unverified",
  identityReplacement: "not_inferred",
} as const;

export const REGULATIONS_GOV_RESOURCE_BUDGET_POLICY = {
  maximumDocumentsPerBundle: 250,
  maximumAttachmentsPerDocument: 64,
  maximumFormatsPerAttachment: 8,
  maximumAttachmentsPerBundle: 256,
  maximumFormatsPerBundle: 1_024,
} as const;

export const REGULATIONS_GOV_ELIGIBLE_DOCUMENT_TYPES = [
  "Notice",
  "Rule",
  "Proposed Rule",
] as const satisfies readonly RegulationsGovDocumentType[];

export type RegulationsGovEligibility = "eligible" | "review_required_excluded";

export interface RegulationsGovGovernanceProjection {
  jurisdiction: typeof REGULATIONS_GOV_JURISDICTION;
  classification: typeof REGULATIONS_GOV_CLASSIFICATION;
  nationEvidence: readonly [];
}

export interface RegulationsGovSourceStatusProjection {
  openForComment: boolean;
  allowLateComments: boolean;
  withdrawn: boolean;
}

export interface RegulationsGovAttachmentFormatProjection {
  format: string;
  sizeBytes: number;
  fileUrl: string;
}

export interface RegulationsGovAttachmentProjection {
  attachmentId: string;
  parentDocumentId: string;
  order: number;
  restricted: boolean;
  modifyDate: string | null;
  publication: string | null;
  formats: readonly RegulationsGovAttachmentFormatProjection[];
}

export interface RegulationsGovDocumentProjection {
  stableId: string;
  documentId: string;
  docketId: string;
  agencyId: string;
  documentType: RegulationsGovDocumentType;
  subtype: string;
  eligibility: RegulationsGovEligibility;
  title: string;
  lastModifiedDate: string | null;
  postedDate: string | null;
  commentStartDate: string | null;
  commentEndDate: string | null;
  effectiveDate: string | null;
  implementationDate: string | null;
  authorDate: string | null;
  postmarkDate: string | null;
  receiveDate: string | null;
  sourceStatus: RegulationsGovSourceStatusProjection;
  detailUrl: string;
  attachmentIds: readonly string[];
  attachments: readonly RegulationsGovAttachmentProjection[];
  governance: RegulationsGovGovernanceProjection;
  historicalCompleteness: typeof REGULATIONS_GOV_HISTORICAL_COMPLETENESS;
}

export interface RegulationsGovDocketProjection {
  stableId: string;
  docketId: string;
  agencyId: string;
  docketType: RegulationsGovDocketType;
  title: string;
  lastModifiedDate: string | null;
  detailUrl: string;
  documentIds: readonly string[];
  governance: RegulationsGovGovernanceProjection;
  historicalCompleteness: typeof REGULATIONS_GOV_HISTORICAL_COMPLETENESS;
}

export interface RegulationsGovSyntheticResourceBundle {
  contractVersion: typeof REGULATIONS_GOV_CONTRACT_VERSION;
  fixtureNotice: typeof REGULATIONS_GOV_SYNTHETIC_NOTICE;
  kind: typeof REGULATIONS_GOV_RESOURCE_BUNDLE_KIND;
  sourceId: typeof REGULATIONS_GOV_SOURCE_ID;
  providerEnvelope: false;
  agencyId: string;
  docket: RegulationsGovDocketProjection;
  documents: readonly RegulationsGovDocumentProjection[];
}

export const REGULATIONS_GOV_MUTABLE_DOCUMENT_FIELDS = [
  "docketId",
  "agencyId",
  "documentType",
  "title",
  "subtype",
  "lastModifiedDate",
  "postedDate",
  "commentStartDate",
  "commentEndDate",
  "effectiveDate",
  "implementationDate",
  "authorDate",
  "postmarkDate",
  "receiveDate",
  "sourceStatus.openForComment",
  "sourceStatus.allowLateComments",
  "sourceStatus.withdrawn",
  "attachments",
] as const;

export type RegulationsGovMutableDocumentField =
  (typeof REGULATIONS_GOV_MUTABLE_DOCUMENT_FIELDS)[number];

export interface RegulationsGovDocumentObservation {
  observedAt: string;
  document: RegulationsGovDocumentProjection;
}

export interface RegulationsGovMutationIdentityPolicyProjection {
  observationScope: "same_synthetic_document_id";
  providerBehavior: "unverified";
  identityReplacement: "not_inferred";
}

export interface RegulationsGovSyntheticMutationObservation {
  contractVersion: typeof REGULATIONS_GOV_CONTRACT_VERSION;
  fixtureNotice: typeof REGULATIONS_GOV_SYNTHETIC_NOTICE;
  kind: typeof REGULATIONS_GOV_MUTATION_OBSERVATION_KIND;
  sourceId: typeof REGULATIONS_GOV_SOURCE_ID;
  providerEnvelope: false;
  identityPolicy: RegulationsGovMutationIdentityPolicyProjection;
  before: RegulationsGovDocumentObservation;
  after: RegulationsGovDocumentObservation;
  changedFields: readonly RegulationsGovMutableDocumentField[];
}

export interface RegulationsGovRatePolicyProjection {
  verificationState: "generic_unverified";
  window: "rolling_hour";
  defaultLimit: 1000;
}

export interface RegulationsGovRateHeadersProjection {
  "X-RateLimit-Limit": string;
  "X-RateLimit-Remaining": string;
}

export interface RegulationsGovSyntheticRateLimitProjection {
  contractVersion: typeof REGULATIONS_GOV_CONTRACT_VERSION;
  fixtureNotice: typeof REGULATIONS_GOV_SYNTHETIC_NOTICE;
  kind: typeof REGULATIONS_GOV_RATE_LIMIT_KIND;
  sourceId: typeof REGULATIONS_GOV_SOURCE_ID;
  providerEnvelope: false;
  ratePolicy: RegulationsGovRatePolicyProjection;
  statusCode: 200 | 429;
  gatewayCode: "OVER_RATE_LIMIT" | null;
  headers: RegulationsGovRateHeadersProjection;
}

type JsonObject = Record<string, unknown>;
type Parser<T> = (value: unknown, path: string) => T;

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]*$/;
const FORMAT_PATTERN = /^[a-z0-9][a-z0-9.+-]{0,31}$/;
const SOURCE_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;
const UTC_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{3})?Z$/;
const NONNEGATIVE_INTEGER_STRING_PATTERN = /^(?:0|[1-9]\d*)$/;
const MAXIMUM_TITLE_LENGTH = 8_192;
const MAXIMUM_PUBLICATION_LENGTH = 512;
const MAXIMUM_ATTACHMENT_ORDER = 10_000;

interface ResourceBudget {
  attachments: number;
  formats: number;
}

function fail(
  code: RegulationsGovContractErrorCode,
  path: string,
  message: string,
): never {
  throw new RegulationsGovContractError(code, path, message);
}

function plainObject(value: unknown, path: string): JsonObject {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail("invalid_type", path, "expected a plain repository projection object");
  }
  return value as JsonObject;
}

function exactKeys(
  value: JsonObject,
  path: string,
  required: readonly string[],
): void {
  const expected = new Set(required);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) {
      fail("unexpected_field", `${path}.${key}`, "field is not retained");
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      fail(
        "missing_field",
        `${path}.${key}`,
        "required projection field is missing",
      );
    }
  }
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1f || codePoint === 0x7f) {
      return true;
    }
  }
  return false;
}

function boundedString(
  value: unknown,
  path: string,
  maximumLength: number,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    value.trim() !== value ||
    hasControlCharacter(value)
  ) {
    fail("invalid_value", path, "expected a bounded nonblank string");
  }
  return value;
}

function exactString<T extends string>(
  value: unknown,
  path: string,
  expected: T,
): T {
  if (value !== expected) {
    fail("invalid_value", path, `expected ${expected}`);
  }
  return expected;
}

function member<T extends string>(
  value: unknown,
  path: string,
  allowed: readonly T[],
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail("invalid_value", path, "value is outside the reviewed vocabulary");
  }
  return value as T;
}

function booleanValue(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    fail("invalid_type", path, "expected a source boolean");
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
    fail("invalid_value", path, "expected a bounded safe integer");
  }
  return value;
}

function list<T>(
  value: unknown,
  path: string,
  maximumLength: number,
  parser: Parser<T>,
  minimumLength = 0,
): T[] {
  if (!Array.isArray(value)) {
    fail("invalid_type", path, "expected an array");
  }
  if (value.length < minimumLength || value.length > maximumLength) {
    fail("limit_exceeded", path, "array length is outside the contract bound");
  }
  return value.map((entry, index) => parser(entry, `${path}[${index}]`));
}

function reserveResourceBudget(
  value: unknown,
  path: string,
  budget: ResourceBudget | undefined,
  field: keyof ResourceBudget,
  maximum: number,
): void {
  if (!Array.isArray(value)) {
    fail("invalid_type", path, "expected an array");
  }
  if (budget === undefined) {
    return;
  }
  budget[field] += value.length;
  if (budget[field] > maximum) {
    fail(
      "limit_exceeded",
      path,
      `aggregate ${field} count exceeds the repository safety budget`,
    );
  }
}

function assertUnique(values: readonly string[], path: string): void {
  if (new Set(values).size !== values.length) {
    fail("duplicate_value", path, "duplicate retained identity");
  }
}

function identifier(
  value: unknown,
  path: string,
  maximumLength: number = REGULATIONS_GOV_QUERY_POLICY.maximumIdentifierLength,
): string {
  const parsed = boundedString(value, path, maximumLength);
  if (!IDENTIFIER_PATTERN.test(parsed) || !parsed.includes("SYNTHETIC")) {
    fail(
      "invalid_value",
      path,
      "expected a clearly synthetic bounded opaque identifier",
    );
  }
  return parsed;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function validateDateTimeMatch(match: RegExpExecArray, path: string): void {
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
    fail("invalid_value", path, "expected a real ISO 8601 date-time");
  }
  const offset = match[7];
  if (offset !== "Z") {
    const offsetHour = Number(offset?.slice(1, 3));
    const offsetMinute = Number(offset?.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) {
      fail("invalid_value", path, "expected a real ISO 8601 offset");
    }
  }
}

function sourceDateTime(value: unknown, path: string): string {
  const parsed = boundedString(value, path, 64);
  const match = SOURCE_DATE_TIME_PATTERN.exec(parsed);
  if (!match) {
    fail(
      "invalid_value",
      path,
      "expected an offset-bearing ISO 8601 date-time",
    );
  }
  validateDateTimeMatch(match, path);
  return parsed;
}

function nullableSourceDateTime(value: unknown, path: string): string | null {
  return value === null ? null : sourceDateTime(value, path);
}

function observationDateTime(value: unknown, path: string): string {
  const parsed = boundedString(value, path, 32);
  const match = UTC_DATE_TIME_PATTERN.exec(parsed);
  if (!match) {
    fail("invalid_value", path, "expected a normalized UTC observation time");
  }
  validateDateTimeMatch(match, path);
  return parsed;
}

function governance(
  value: unknown,
  path: string,
): RegulationsGovGovernanceProjection {
  const source = plainObject(value, path);
  exactKeys(source, path, ["jurisdiction", "classification", "nationEvidence"]);
  exactString(
    source.jurisdiction,
    `${path}.jurisdiction`,
    REGULATIONS_GOV_JURISDICTION,
  );
  exactString(
    source.classification,
    `${path}.classification`,
    REGULATIONS_GOV_CLASSIFICATION,
  );
  if (
    !Array.isArray(source.nationEvidence) ||
    source.nationEvidence.length !== 0
  ) {
    fail(
      "invalid_value",
      `${path}.nationEvidence`,
      "Regulations.gov projections retain no Nation evidence",
    );
  }
  return {
    jurisdiction: REGULATIONS_GOV_JURISDICTION,
    classification: REGULATIONS_GOV_CLASSIFICATION,
    nationEvidence: [],
  };
}

function publicDetailUrl(
  value: unknown,
  resource: "docket" | "document",
  resourceId: string,
  path: string,
): string {
  const text = boundedString(
    value,
    path,
    REGULATIONS_GOV_QUERY_POLICY.maximumCanonicalRequestLength,
  );
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    fail("invalid_url", path, "expected an absolute public detail URL");
  }
  const expected = `https://www.regulations.gov/${resource}/${resourceId}`;
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "www.regulations.gov" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.port !== "" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.href !== expected
  ) {
    fail(
      "invalid_url",
      path,
      `expected the exact keyless Regulations.gov ${resource} identity URL`,
    );
  }
  return parsed.href;
}

function attachmentFileUrl(
  value: unknown,
  parentDocumentId: string,
  order: number,
  format: string,
  path: string,
): string {
  const text = boundedString(
    value,
    path,
    REGULATIONS_GOV_QUERY_POLICY.maximumCanonicalRequestLength,
  );
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    fail("invalid_url", path, "expected an absolute attachment URL");
  }
  const expected = `https://downloads.regulations.gov/${parentDocumentId}/attachment_${order}.${format}`;
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "downloads.regulations.gov" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.port !== "" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.href !== expected
  ) {
    fail(
      "invalid_url",
      path,
      "expected the exact keyless parent-bound Regulations.gov attachment path",
    );
  }
  return parsed.href;
}

function parseSourceStatus(
  value: unknown,
  path: string,
): RegulationsGovSourceStatusProjection {
  const source = plainObject(value, path);
  exactKeys(source, path, ["openForComment", "allowLateComments", "withdrawn"]);
  return {
    openForComment: booleanValue(
      source.openForComment,
      `${path}.openForComment`,
    ),
    allowLateComments: booleanValue(
      source.allowLateComments,
      `${path}.allowLateComments`,
    ),
    withdrawn: booleanValue(source.withdrawn, `${path}.withdrawn`),
  };
}

function parseAttachmentFormat(
  value: unknown,
  parentDocumentId: string,
  order: number,
  path: string,
): RegulationsGovAttachmentFormatProjection {
  const source = plainObject(value, path);
  exactKeys(source, path, ["format", "sizeBytes", "fileUrl"]);
  const format = boundedString(source.format, `${path}.format`, 32);
  if (!FORMAT_PATTERN.test(format)) {
    fail(
      "invalid_value",
      `${path}.format`,
      "expected a bounded lowercase attachment format label",
    );
  }
  const sizeBytes = boundedInteger(
    source.sizeBytes,
    `${path}.sizeBytes`,
    1,
    Number.MAX_SAFE_INTEGER,
  );
  return {
    format,
    sizeBytes,
    fileUrl: attachmentFileUrl(
      source.fileUrl,
      parentDocumentId,
      order,
      format,
      `${path}.fileUrl`,
    ),
  };
}

function parseAttachment(
  value: unknown,
  parentDocumentId: string,
  path: string,
  budget?: ResourceBudget,
): RegulationsGovAttachmentProjection {
  const source = plainObject(value, path);
  exactKeys(source, path, [
    "attachmentId",
    "parentDocumentId",
    "order",
    "restricted",
    "modifyDate",
    "publication",
    "formats",
  ]);
  const order = boundedInteger(
    source.order,
    `${path}.order`,
    1,
    MAXIMUM_ATTACHMENT_ORDER,
  );
  const expectedAttachmentId = `${parentDocumentId}-ATTACHMENT-${order}`;
  const attachmentId = identifier(source.attachmentId, `${path}.attachmentId`);
  if (attachmentId !== expectedAttachmentId) {
    fail(
      "inconsistent_value",
      `${path}.attachmentId`,
      "attachment identity must be derived from its parent document and order",
    );
  }
  const retainedParent = identifier(
    source.parentDocumentId,
    `${path}.parentDocumentId`,
  );
  if (retainedParent !== parentDocumentId) {
    fail(
      "inconsistent_value",
      `${path}.parentDocumentId`,
      "attachment belongs to a different parent document",
    );
  }
  reserveResourceBudget(
    source.formats,
    `${path}.formats`,
    budget,
    "formats",
    REGULATIONS_GOV_RESOURCE_BUDGET_POLICY.maximumFormatsPerBundle,
  );
  const formats = list(
    source.formats,
    `${path}.formats`,
    REGULATIONS_GOV_RESOURCE_BUDGET_POLICY.maximumFormatsPerAttachment,
    (entry, entryPath) =>
      parseAttachmentFormat(entry, parentDocumentId, order, entryPath),
    1,
  );
  assertUnique(
    formats.map(({ format }) => format),
    `${path}.formats`,
  );
  assertUnique(
    formats.map(({ fileUrl }) => fileUrl),
    `${path}.formats`,
  );
  const publication =
    source.publication === null
      ? null
      : boundedString(
          source.publication,
          `${path}.publication`,
          MAXIMUM_PUBLICATION_LENGTH,
        );
  return {
    attachmentId,
    parentDocumentId,
    order,
    restricted: booleanValue(source.restricted, `${path}.restricted`),
    modifyDate: nullableSourceDateTime(source.modifyDate, `${path}.modifyDate`),
    publication,
    formats,
  };
}

function expectedEligibility(
  documentType: RegulationsGovDocumentType,
): RegulationsGovEligibility {
  return REGULATIONS_GOV_ELIGIBLE_DOCUMENT_TYPES.includes(
    documentType as (typeof REGULATIONS_GOV_ELIGIBLE_DOCUMENT_TYPES)[number],
  )
    ? "eligible"
    : "review_required_excluded";
}

function parseDocument(
  value: unknown,
  path: string,
  budget?: ResourceBudget,
): RegulationsGovDocumentProjection {
  const source = plainObject(value, path);
  exactKeys(source, path, [
    "stableId",
    "documentId",
    "docketId",
    "agencyId",
    "documentType",
    "subtype",
    "eligibility",
    "title",
    "lastModifiedDate",
    "postedDate",
    "commentStartDate",
    "commentEndDate",
    "effectiveDate",
    "implementationDate",
    "authorDate",
    "postmarkDate",
    "receiveDate",
    "sourceStatus",
    "detailUrl",
    "attachmentIds",
    "attachments",
    "governance",
    "historicalCompleteness",
  ]);
  const documentId = identifier(source.documentId, `${path}.documentId`);
  const docketId = identifier(source.docketId, `${path}.docketId`);
  const agencyId = identifier(
    source.agencyId,
    `${path}.agencyId`,
    REGULATIONS_GOV_QUERY_POLICY.maximumAgencyIdLength,
  );
  const stableId = exactString(
    source.stableId,
    `${path}.stableId`,
    `regulations-gov:document:${documentId}`,
  );
  const documentType = member(
    source.documentType,
    `${path}.documentType`,
    REGULATIONS_GOV_DOCUMENT_TYPES,
  );
  const eligibility = expectedEligibility(documentType);
  exactString(source.eligibility, `${path}.eligibility`, eligibility);
  reserveResourceBudget(
    source.attachments,
    `${path}.attachments`,
    budget,
    "attachments",
    REGULATIONS_GOV_RESOURCE_BUDGET_POLICY.maximumAttachmentsPerBundle,
  );
  const attachments = list(
    source.attachments,
    `${path}.attachments`,
    REGULATIONS_GOV_RESOURCE_BUDGET_POLICY.maximumAttachmentsPerDocument,
    (entry, entryPath) => parseAttachment(entry, documentId, entryPath, budget),
  );
  const attachmentIds = list(
    source.attachmentIds,
    `${path}.attachmentIds`,
    REGULATIONS_GOV_RESOURCE_BUDGET_POLICY.maximumAttachmentsPerDocument,
    identifier,
  );
  assertUnique(attachmentIds, `${path}.attachmentIds`);
  assertUnique(
    attachments.map(({ attachmentId }) => attachmentId),
    `${path}.attachments`,
  );
  assertUnique(
    attachments.map(({ order }) => String(order)),
    `${path}.attachments`,
  );
  for (let index = 1; index < attachments.length; index += 1) {
    if (
      (attachments[index - 1]?.order ?? 0) >= (attachments[index]?.order ?? 0)
    ) {
      fail(
        "inconsistent_value",
        `${path}.attachments`,
        "attachments must be ordered by their source order",
      );
    }
  }
  const projectedAttachmentIds = attachments.map(
    ({ attachmentId }) => attachmentId,
  );
  if (
    JSON.stringify(attachmentIds) !== JSON.stringify(projectedAttachmentIds)
  ) {
    fail(
      "inconsistent_value",
      `${path}.attachmentIds`,
      "attachment identity list must exactly match retained attachments",
    );
  }
  return {
    stableId,
    documentId,
    docketId,
    agencyId,
    documentType,
    subtype: boundedString(
      source.subtype,
      `${path}.subtype`,
      REGULATIONS_GOV_QUERY_POLICY.maximumSubtypeLength,
    ),
    eligibility,
    title: boundedString(source.title, `${path}.title`, MAXIMUM_TITLE_LENGTH),
    lastModifiedDate: nullableSourceDateTime(
      source.lastModifiedDate,
      `${path}.lastModifiedDate`,
    ),
    postedDate: nullableSourceDateTime(source.postedDate, `${path}.postedDate`),
    commentStartDate: nullableSourceDateTime(
      source.commentStartDate,
      `${path}.commentStartDate`,
    ),
    commentEndDate: nullableSourceDateTime(
      source.commentEndDate,
      `${path}.commentEndDate`,
    ),
    effectiveDate: nullableSourceDateTime(
      source.effectiveDate,
      `${path}.effectiveDate`,
    ),
    implementationDate: nullableSourceDateTime(
      source.implementationDate,
      `${path}.implementationDate`,
    ),
    authorDate: nullableSourceDateTime(source.authorDate, `${path}.authorDate`),
    postmarkDate: nullableSourceDateTime(
      source.postmarkDate,
      `${path}.postmarkDate`,
    ),
    receiveDate: nullableSourceDateTime(
      source.receiveDate,
      `${path}.receiveDate`,
    ),
    sourceStatus: parseSourceStatus(
      source.sourceStatus,
      `${path}.sourceStatus`,
    ),
    detailUrl: publicDetailUrl(
      source.detailUrl,
      "document",
      documentId,
      `${path}.detailUrl`,
    ),
    attachmentIds,
    attachments,
    governance: governance(source.governance, `${path}.governance`),
    historicalCompleteness: exactString(
      source.historicalCompleteness,
      `${path}.historicalCompleteness`,
      REGULATIONS_GOV_HISTORICAL_COMPLETENESS,
    ),
  };
}

function parseDocket(
  value: unknown,
  path: string,
): RegulationsGovDocketProjection {
  const source = plainObject(value, path);
  exactKeys(source, path, [
    "stableId",
    "docketId",
    "agencyId",
    "docketType",
    "title",
    "lastModifiedDate",
    "detailUrl",
    "documentIds",
    "governance",
    "historicalCompleteness",
  ]);
  const docketId = identifier(source.docketId, `${path}.docketId`);
  const agencyId = identifier(
    source.agencyId,
    `${path}.agencyId`,
    REGULATIONS_GOV_QUERY_POLICY.maximumAgencyIdLength,
  );
  const documentIds = list(
    source.documentIds,
    `${path}.documentIds`,
    REGULATIONS_GOV_RESOURCE_BUDGET_POLICY.maximumDocumentsPerBundle,
    identifier,
    1,
  );
  assertUnique(documentIds, `${path}.documentIds`);
  return {
    stableId: exactString(
      source.stableId,
      `${path}.stableId`,
      `regulations-gov:docket:${docketId}`,
    ),
    docketId,
    agencyId,
    docketType: member(
      source.docketType,
      `${path}.docketType`,
      REGULATIONS_GOV_DOCKET_TYPES,
    ),
    title: boundedString(source.title, `${path}.title`, MAXIMUM_TITLE_LENGTH),
    lastModifiedDate: nullableSourceDateTime(
      source.lastModifiedDate,
      `${path}.lastModifiedDate`,
    ),
    detailUrl: publicDetailUrl(
      source.detailUrl,
      "docket",
      docketId,
      `${path}.detailUrl`,
    ),
    documentIds,
    governance: governance(source.governance, `${path}.governance`),
    historicalCompleteness: exactString(
      source.historicalCompleteness,
      `${path}.historicalCompleteness`,
      REGULATIONS_GOV_HISTORICAL_COMPLETENESS,
    ),
  };
}

function parseProjectionMarkers(
  source: JsonObject,
  path: string,
  expectedKind: string,
): void {
  exactString(
    source.contractVersion,
    `${path}.contractVersion`,
    REGULATIONS_GOV_CONTRACT_VERSION,
  );
  exactString(
    source.fixtureNotice,
    `${path}.fixtureNotice`,
    REGULATIONS_GOV_SYNTHETIC_NOTICE,
  );
  exactString(source.kind, `${path}.kind`, expectedKind);
  exactString(source.sourceId, `${path}.sourceId`, REGULATIONS_GOV_SOURCE_ID);
  if (source.providerEnvelope !== false) {
    fail(
      "invalid_value",
      `${path}.providerEnvelope`,
      "synthetic projection must not masquerade as a provider envelope",
    );
  }
}

export function parseRegulationsGovSyntheticResourceBundle(
  value: unknown,
  path = "$",
): RegulationsGovSyntheticResourceBundle {
  const source = plainObject(value, path);
  exactKeys(source, path, [
    "contractVersion",
    "fixtureNotice",
    "kind",
    "sourceId",
    "providerEnvelope",
    "agencyId",
    "docket",
    "documents",
  ]);
  parseProjectionMarkers(source, path, REGULATIONS_GOV_RESOURCE_BUNDLE_KIND);
  const agencyId = identifier(
    source.agencyId,
    `${path}.agencyId`,
    REGULATIONS_GOV_QUERY_POLICY.maximumAgencyIdLength,
  );
  const docket = parseDocket(source.docket, `${path}.docket`);
  const resourceBudget: ResourceBudget = { attachments: 0, formats: 0 };
  const documents = list(
    source.documents,
    `${path}.documents`,
    REGULATIONS_GOV_RESOURCE_BUDGET_POLICY.maximumDocumentsPerBundle,
    (entry, entryPath) => parseDocument(entry, entryPath, resourceBudget),
    1,
  );
  assertUnique(
    documents.map(({ documentId }) => documentId),
    `${path}.documents`,
  );
  assertUnique(
    documents.map(({ stableId }) => stableId),
    `${path}.documents`,
  );
  if (docket.agencyId !== agencyId) {
    fail(
      "inconsistent_value",
      `${path}.docket.agencyId`,
      "docket agency does not match the bundle agency",
    );
  }
  documents.forEach((document, index) => {
    if (document.docketId !== docket.docketId) {
      fail(
        "inconsistent_value",
        `${path}.documents[${index}].docketId`,
        "document belongs to a different docket",
      );
    }
    if (document.agencyId !== agencyId) {
      fail(
        "inconsistent_value",
        `${path}.documents[${index}].agencyId`,
        "document agency does not match the bundle agency",
      );
    }
  });
  const projectedDocumentIds = documents.map(({ documentId }) => documentId);
  if (
    JSON.stringify(docket.documentIds) !== JSON.stringify(projectedDocumentIds)
  ) {
    fail(
      "inconsistent_value",
      `${path}.docket.documentIds`,
      "docket document list must exactly match retained documents",
    );
  }
  return {
    contractVersion: REGULATIONS_GOV_CONTRACT_VERSION,
    fixtureNotice: REGULATIONS_GOV_SYNTHETIC_NOTICE,
    kind: REGULATIONS_GOV_RESOURCE_BUNDLE_KIND,
    sourceId: REGULATIONS_GOV_SOURCE_ID,
    providerEnvelope: false,
    agencyId,
    docket,
    documents,
  };
}

function parseObservation(
  value: unknown,
  path: string,
): RegulationsGovDocumentObservation {
  const source = plainObject(value, path);
  exactKeys(source, path, ["observedAt", "document"]);
  return {
    observedAt: observationDateTime(source.observedAt, `${path}.observedAt`),
    document: parseDocument(source.document, `${path}.document`),
  };
}

function valueAtMutableField(
  document: RegulationsGovDocumentProjection,
  field: RegulationsGovMutableDocumentField,
): unknown {
  if (field === "sourceStatus.openForComment") {
    return document.sourceStatus.openForComment;
  }
  if (field === "sourceStatus.allowLateComments") {
    return document.sourceStatus.allowLateComments;
  }
  if (field === "sourceStatus.withdrawn") {
    return document.sourceStatus.withdrawn;
  }
  return document[field];
}

function changedMutableFields(
  before: RegulationsGovDocumentProjection,
  after: RegulationsGovDocumentProjection,
): RegulationsGovMutableDocumentField[] {
  return REGULATIONS_GOV_MUTABLE_DOCUMENT_FIELDS.filter(
    (field) =>
      JSON.stringify(valueAtMutableField(before, field)) !==
      JSON.stringify(valueAtMutableField(after, field)),
  );
}

function parseMutationIdentityPolicy(
  value: unknown,
  path: string,
): RegulationsGovMutationIdentityPolicyProjection {
  const source = plainObject(value, path);
  exactKeys(source, path, [
    "observationScope",
    "providerBehavior",
    "identityReplacement",
  ]);
  return {
    observationScope: exactString(
      source.observationScope,
      `${path}.observationScope`,
      REGULATIONS_GOV_MUTATION_IDENTITY_POLICY.observationScope,
    ),
    providerBehavior: exactString(
      source.providerBehavior,
      `${path}.providerBehavior`,
      REGULATIONS_GOV_MUTATION_IDENTITY_POLICY.providerBehavior,
    ),
    identityReplacement: exactString(
      source.identityReplacement,
      `${path}.identityReplacement`,
      REGULATIONS_GOV_MUTATION_IDENTITY_POLICY.identityReplacement,
    ),
  };
}

function assertSameSyntheticDocumentScope(
  before: RegulationsGovDocumentProjection,
  after: RegulationsGovDocumentProjection,
  path: string,
): void {
  if (before.documentId !== after.documentId) {
    fail(
      "inconsistent_value",
      `${path}.documentId`,
      "same-document observation scope cannot represent identity replacement",
    );
  }
}

export function parseRegulationsGovSyntheticMutationObservation(
  value: unknown,
  path = "$",
): RegulationsGovSyntheticMutationObservation {
  const source = plainObject(value, path);
  exactKeys(source, path, [
    "contractVersion",
    "fixtureNotice",
    "kind",
    "sourceId",
    "providerEnvelope",
    "identityPolicy",
    "before",
    "after",
    "changedFields",
  ]);
  parseProjectionMarkers(
    source,
    path,
    REGULATIONS_GOV_MUTATION_OBSERVATION_KIND,
  );
  const identityPolicy = parseMutationIdentityPolicy(
    source.identityPolicy,
    `${path}.identityPolicy`,
  );
  const before = parseObservation(source.before, `${path}.before`);
  const after = parseObservation(source.after, `${path}.after`);
  if (Date.parse(before.observedAt) >= Date.parse(after.observedAt)) {
    fail(
      "inconsistent_value",
      `${path}.after.observedAt`,
      "mutation observations must progress forward in time",
    );
  }
  assertSameSyntheticDocumentScope(
    before.document,
    after.document,
    `${path}.after.document`,
  );
  const changedFields = list(
    source.changedFields,
    `${path}.changedFields`,
    REGULATIONS_GOV_MUTABLE_DOCUMENT_FIELDS.length,
    (entry, entryPath) =>
      member(entry, entryPath, REGULATIONS_GOV_MUTABLE_DOCUMENT_FIELDS),
    1,
  );
  assertUnique(changedFields, `${path}.changedFields`);
  const actualChanges = changedMutableFields(before.document, after.document);
  if (JSON.stringify(changedFields) !== JSON.stringify(actualChanges)) {
    fail(
      "inconsistent_value",
      `${path}.changedFields`,
      "declared changedFields must exactly match mutable field differences",
    );
  }
  return {
    contractVersion: REGULATIONS_GOV_CONTRACT_VERSION,
    fixtureNotice: REGULATIONS_GOV_SYNTHETIC_NOTICE,
    kind: REGULATIONS_GOV_MUTATION_OBSERVATION_KIND,
    sourceId: REGULATIONS_GOV_SOURCE_ID,
    providerEnvelope: false,
    identityPolicy,
    before,
    after,
    changedFields,
  };
}

function nonnegativeIntegerHeader(
  value: unknown,
  path: string,
  minimum: number,
): number {
  if (
    typeof value !== "string" ||
    value.length > 16 ||
    !NONNEGATIVE_INTEGER_STRING_PATTERN.test(value)
  ) {
    fail("invalid_value", path, "expected a canonical integer header value");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    fail(
      "invalid_value",
      path,
      "rate header is outside the safe integer bound",
    );
  }
  return parsed;
}

export function parseRegulationsGovSyntheticRateLimitProjection(
  value: unknown,
  path = "$",
): RegulationsGovSyntheticRateLimitProjection {
  const source = plainObject(value, path);
  exactKeys(source, path, [
    "contractVersion",
    "fixtureNotice",
    "kind",
    "sourceId",
    "providerEnvelope",
    "ratePolicy",
    "statusCode",
    "gatewayCode",
    "headers",
  ]);
  parseProjectionMarkers(source, path, REGULATIONS_GOV_RATE_LIMIT_KIND);
  const ratePolicySource = plainObject(source.ratePolicy, `${path}.ratePolicy`);
  exactKeys(ratePolicySource, `${path}.ratePolicy`, [
    "verificationState",
    "window",
    "defaultLimit",
  ]);
  const ratePolicy: RegulationsGovRatePolicyProjection = {
    verificationState: exactString(
      ratePolicySource.verificationState,
      `${path}.ratePolicy.verificationState`,
      "generic_unverified",
    ),
    window: exactString(
      ratePolicySource.window,
      `${path}.ratePolicy.window`,
      "rolling_hour",
    ),
    defaultLimit: boundedInteger(
      ratePolicySource.defaultLimit,
      `${path}.ratePolicy.defaultLimit`,
      1000,
      1000,
    ) as 1000,
  };
  const statusCode = boundedInteger(
    source.statusCode,
    `${path}.statusCode`,
    200,
    429,
  );
  if (statusCode !== 200 && statusCode !== 429) {
    fail("invalid_value", `${path}.statusCode`, "expected status 200 or 429");
  }
  const gatewayCode = source.gatewayCode;
  if (
    (statusCode === 200 && gatewayCode !== null) ||
    (statusCode === 429 && gatewayCode !== "OVER_RATE_LIMIT")
  ) {
    fail(
      "inconsistent_value",
      `${path}.gatewayCode`,
      "gateway code does not match the synthetic response status",
    );
  }
  const headerSource = plainObject(source.headers, `${path}.headers`);
  exactKeys(headerSource, `${path}.headers`, [
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
  ]);
  const limit = nonnegativeIntegerHeader(
    headerSource["X-RateLimit-Limit"],
    `${path}.headers.X-RateLimit-Limit`,
    1,
  );
  const remaining = nonnegativeIntegerHeader(
    headerSource["X-RateLimit-Remaining"],
    `${path}.headers.X-RateLimit-Remaining`,
    0,
  );
  if (remaining > limit) {
    fail(
      "inconsistent_value",
      `${path}.headers.X-RateLimit-Remaining`,
      "remaining requests cannot exceed the reported limit",
    );
  }
  return {
    contractVersion: REGULATIONS_GOV_CONTRACT_VERSION,
    fixtureNotice: REGULATIONS_GOV_SYNTHETIC_NOTICE,
    kind: REGULATIONS_GOV_RATE_LIMIT_KIND,
    sourceId: REGULATIONS_GOV_SOURCE_ID,
    providerEnvelope: false,
    ratePolicy,
    statusCode: statusCode as 200 | 429,
    gatewayCode: gatewayCode as "OVER_RATE_LIMIT" | null,
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
    },
  };
}
