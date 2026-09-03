import type { VersionedReference } from "./contracts";
import sourceRegistryJson from "../../config/sources.v1.json";
import {
  REAL_SOURCE_LIFECYCLE_BUNDLE_SCHEMA_ID,
  REAL_SOURCE_LIFECYCLE_BUNDLE_SCHEMA_VERSION,
  REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS,
  type RealSourceActivationReceipt,
  type RealSourceAdmissionReceipt,
  type RealSourceArtifactEligibilityReceipt,
  type RealSourceAuthorityReceipt,
  type RealSourceAuthorityRole,
  type RealSourceBindingReceipt,
  type RealSourceCatalogKind,
  type RealSourceCatalogMember,
  type RealSourceCoverageReceipt,
  type RealSourceCoverageStages,
  type RealSourceDigestedReference,
  type RealSourceDatedObservationEvidence,
  type RealSourceEvidenceReceipt,
  type RealSourceHealthReceipt,
  type RealSourceHealthScope,
  type RealSourceHttpMethod,
  type RealSourceLkgReceipt,
  type RealSourceLifecycleBundle,
  type RealSourceLifecycleEvaluation,
  type RealSourceLifecycleEvaluationRequest,
  type RealSourceLifecycleReasonCode,
  type RealSourceLifecycleScope,
  type RealSourceOperation,
  type RealSourceOperationGrant,
  type RealSourceProjectControlEvidence,
  type RealSourceProviderFactEvidence,
  type RealSourceQualificationReceipt,
  type RealSourceRequiredUnknownQuestion,
  type RealSourceReceiptState,
  type RealSourceReference,
  type RealSourceResidualCondition,
  type RealSourceResidualRiskEvidence,
  type RealSourceRequestPlan,
  type RealSourceReviewKind,
  type RealSourceReviewReceipt,
  type RealSourceReviewSubjectKind,
  type RealSourceScopeReference,
  type RealSourceUnknownEvidence,
  type RealSourceRequiredUnknownKind,
  type RealSourceValidityInterval,
} from "./real-source-lifecycle-contracts";

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
type JsonObject = Record<string, unknown>;

const STABLE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const VERSION = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const DIGEST = /^[a-f0-9]{64}$/;
const TIMESTAMP =
  /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])Z$/;
const DAY_MS = 86_400_000;
const MAX_REVIEW_DAYS = 90;

interface CanonicalRegistrySource {
  readonly id: string;
  readonly synthetic: boolean;
  readonly enabled: boolean;
}

interface CanonicalSourceRegistry {
  readonly registryVersion: string;
  readonly sources: readonly CanonicalRegistrySource[];
}

const SOURCE_REGISTRY = canonicalClone(
  sourceRegistryJson,
) as unknown as CanonicalSourceRegistry & JsonValue;

const CATALOG_KINDS = [
  "authority_receipt",
  "evidence_receipt",
  "review_receipt",
  "operation_grant",
  "qualification_receipt",
  "admission_receipt",
  "activation_receipt",
  "binding_receipt",
  "artifact_eligibility_receipt",
  "coverage_receipt",
  "health_receipt",
  "lkg_receipt",
] as const satisfies readonly RealSourceCatalogKind[];
const OPERATIONS = REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.contract
  .allowedOperations satisfies readonly RealSourceOperation[];
const AUTHORITY_ROLES = [
  "originating_publisher",
  "issuing_agency",
  "official_edition_custodian",
  "service_operator",
  "owner_configuration_authority",
  "source_evidence_reviewer",
  "sovereignty_reviewer",
  "security_reviewer",
] as const satisfies readonly RealSourceAuthorityRole[];
const PROVIDER_FACT_AUTHORITY_ROLES = {
  source_identity: new Set<RealSourceAuthorityRole>([
    "originating_publisher",
    "service_operator",
  ]),
  official_status: new Set<RealSourceAuthorityRole>([
    "originating_publisher",
    "issuing_agency",
    "official_edition_custodian",
  ]),
  field_meaning: new Set<RealSourceAuthorityRole>([
    "originating_publisher",
    "service_operator",
  ]),
  rendition_custody: new Set<RealSourceAuthorityRole>([
    "originating_publisher",
    "official_edition_custodian",
  ]),
  access_requirement: new Set<RealSourceAuthorityRole>(["service_operator"]),
  affirmative_restriction: new Set<RealSourceAuthorityRole>([
    "originating_publisher",
    "service_operator",
  ]),
  reproduction_right: new Set<RealSourceAuthorityRole>([
    "originating_publisher",
    "official_edition_custodian",
  ]),
} as const satisfies Record<
  RealSourceProviderFactEvidence["factKind"],
  ReadonlySet<RealSourceAuthorityRole>
>;
const REVIEW_KINDS = [
  "source_contract",
  "source_evidence",
  "sovereignty",
  "security",
] as const satisfies readonly RealSourceReviewKind[];
const REVIEW_SUBJECT_KINDS = [
  "operation_grant",
  "qualification_receipt",
  "admission_receipt",
  "activation_receipt",
  "binding_receipt",
  "artifact_eligibility_receipt",
  "coverage_receipt",
  "health_receipt",
  "lkg_receipt",
] as const satisfies readonly RealSourceReviewSubjectKind[];
const RECEIPT_STATES = [
  "accepted",
  "revoked",
  "superseded",
] as const satisfies readonly RealSourceReceiptState[];
const RESIDUAL_CONDITIONS = [
  "keyless_read_only",
  "impersonal_metadata_links_only",
  "build_time_only",
  "bounded_unpublished_local_use",
  "no_private_contact_comment_attachment_or_sensitive_location",
  "no_conflicting_affirmative_restriction",
] as const satisfies readonly RealSourceResidualCondition[];
const UNKNOWN_LIMITATION_BY_KIND = {
  numeric_rate_limit: "serial_bounded_requests_only",
  paging_stability: "closed_selection_no_completeness",
  snapshot_stability: "closed_selection_no_completeness",
  retry_backoff: "no_automatic_retry",
  formal_response_error_schema: "parser_fail_closed",
  service_level: "no_availability_promise",
  change_notice: "fail_closed_on_drift",
  api_specific_terms: "owner_risk_acceptance_required",
  api_specific_privacy: "owner_risk_acceptance_required",
  authentication_requirement: "owner_risk_acceptance_required",
} as const satisfies Record<
  RealSourceUnknownEvidence["unknownKind"],
  RealSourceUnknownEvidence["limitationCode"]
>;

const REQUIRED_UNKNOWN_KINDS = [
  "api_specific_privacy",
  "api_specific_terms",
  "change_notice",
  "formal_response_error_schema",
  "numeric_rate_limit",
  "paging_stability",
  "retry_backoff",
  "service_level",
  "snapshot_stability",
] as const satisfies readonly RealSourceRequiredUnknownKind[];

const REQUIRED_UNKNOWN_QUESTIONS = [
  "api_specific_privacy.collection_use_disclosure_retention",
  "api_specific_terms.attribution",
  "api_specific_terms.bulk_access",
  "api_specific_terms.cache_rules",
  "api_specific_terms.clickthrough",
  "api_specific_terms.polling",
  "api_specific_terms.redistribution",
  "change_notice.change_notice",
  "change_notice.deprecation_notice",
  "formal_response_error_schema.error_schema",
  "formal_response_error_schema.response_schema",
  "numeric_rate_limit.concurrency_limit",
  "numeric_rate_limit.numeric_quota",
  "numeric_rate_limit.numeric_rate_limit",
  "paging_stability.cursor_stability",
  "paging_stability.paging_stability",
  "retry_backoff.backoff_rules",
  "retry_backoff.retry_rules",
  "service_level.incident_response",
  "service_level.indexing_latency",
  "service_level.timeout_promises",
  "snapshot_stability.snapshot_consistency",
  "snapshot_stability.total_consistency",
] as const satisfies readonly RealSourceRequiredUnknownQuestion[];

const HTTP_METHODS = [
  "GET",
  "HEAD",
] as const satisfies readonly RealSourceHttpMethod[];

const FEDERAL_REGISTER_A1_FIELDS = [
  "document_number",
  "title",
  "type",
  "subtype",
  "publication_date",
  "effective_on",
  "comments_close_on",
  "signing_date",
  "citation",
  "volume",
  "start_page",
  "end_page",
  "agencies",
  "docket_ids",
  "regulation_id_numbers",
  "cfr_references",
  "topics",
  "cfr_topics",
  "html_url",
  "pdf_url",
  "json_url",
  "full_text_xml_url",
  "raw_text_url",
] as const;

export class RealSourceLifecycleValidationError extends TypeError {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string, detail: string) {
    super(`${code} at ${path}: ${detail}`);
    this.name = "RealSourceLifecycleValidationError";
    this.code = code;
    this.path = path;
  }
}

function fail(code: string, path: string, detail: string): never {
  const structuralPath = path.replace(/\/(?:0|[1-9][0-9]*)(?=\/|$)/g, "/*");
  throw new RealSourceLifecycleValidationError(code, structuralPath, detail);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireCanonicalTextOrder(
  values: readonly string[],
  path: string,
): void {
  const ordered = [...values].sort(compareText);
  if (values.some((value, index) => value !== ordered[index])) {
    fail(
      "NON_CANONICAL_ORDER",
      path,
      "set-like string arrays must use stable ordinal order",
    );
  }
}

function capturePlainJsonInternal(
  value: unknown,
  path: string,
  ancestors: WeakSet<object>,
): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (
      !Number.isFinite(value) ||
      !Number.isSafeInteger(value) ||
      Object.is(value, -0)
    ) {
      fail("INVALID_JSON", path, "expected a finite safe JSON number");
    }
    return value;
  }
  if (typeof value !== "object") {
    fail("INVALID_JSON", path, "expected a JSON value");
  }
  if (ancestors.has(value)) {
    fail("INVALID_JSON", path, "cyclic values are rejected");
  }
  ancestors.add(value);
  try {
    const isArray = Array.isArray(value);
    const expectedPrototype = isArray ? Array.prototype : Object.prototype;
    if (Object.getPrototypeOf(value) !== expectedPrototype) {
      fail("INVALID_JSON", path, "expected a plain JSON container");
    }
    const keys = Reflect.ownKeys(value);
    const entries: [string, JsonValue][] = [];
    let arrayLength: number | null = null;
    if (isArray) {
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (
        lengthDescriptor === undefined ||
        !("value" in lengthDescriptor) ||
        typeof lengthDescriptor.value !== "number" ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0
      ) {
        fail("INVALID_JSON", path, "array length is not canonical");
      }
      arrayLength = lengthDescriptor.value;
    }
    for (const key of keys) {
      if (typeof key !== "string") {
        fail("INVALID_JSON", path, "symbol properties are rejected");
      }
      if (isArray && key === "length") {
        continue;
      }
      if (
        isArray &&
        (!/^(?:0|[1-9][0-9]*)$/.test(key) ||
          Number(key) >= (arrayLength as number))
      ) {
        fail("INVALID_JSON", path, "array has a non-canonical own property");
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      const childPath = isArray ? `${path}/${key}` : `${path}/*`;
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        !descriptor.enumerable
      ) {
        fail("INVALID_JSON", childPath, "expected an enumerable data property");
      }
      entries.push([
        key,
        capturePlainJsonInternal(descriptor.value, childPath, ancestors),
      ]);
    }
    if (isArray) {
      const ordered = entries.sort(
        ([left], [right]) => Number(left) - Number(right),
      );
      if (ordered.length !== arrayLength) {
        fail("INVALID_JSON", path, "sparse arrays are rejected");
      }
      return ordered.map(([key, child], index) => {
        if (Number(key) !== index) {
          fail(
            "INVALID_JSON",
            `${path}/${index}`,
            "sparse arrays are rejected",
          );
        }
        return child;
      });
    }
    return Object.fromEntries(entries) as JsonValue;
  } finally {
    ancestors.delete(value);
  }
}

function capturePlainJsonSnapshot(value: unknown, path: string): JsonValue {
  try {
    return deepFreeze(
      capturePlainJsonInternal(value, path, new WeakSet<object>()),
    );
  } catch {
    fail(
      "INVALID_JSON",
      path,
      "input could not be captured as one stable plain-JSON snapshot",
    );
  }
}

function expectObject(
  value: unknown,
  path: string,
  keys: readonly string[],
): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_SHAPE", path, "expected an object");
  }
  const object = value as JsonObject;
  for (const key of keys) {
    if (!Object.hasOwn(object, key)) {
      fail("INVALID_SHAPE", `${path}/${key}`, "required property is missing");
    }
  }
  const allowed = new Set(keys);
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) {
      fail(
        "INVALID_SHAPE",
        `${path}/${key}`,
        "unexpected property is rejected",
      );
    }
  }
  return object;
}

function expectArray(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): readonly unknown[] {
  if (!Array.isArray(value)) {
    fail("INVALID_SHAPE", path, "expected an array");
  }
  if (value.length < minimum || value.length > maximum) {
    fail("INVALID_BOUNDS", path, "array length is outside the closed bound");
  }
  return value;
}

function expectString(value: unknown, path: string, maximum = 2048): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum
  ) {
    fail("INVALID_SHAPE", path, "expected a bounded non-empty string");
  }
  return value;
}

function expectLiteral<const T extends JsonPrimitive>(
  value: unknown,
  expected: T,
  path: string,
): T {
  if (value !== expected) {
    fail("INVALID_LITERAL", path, "value does not match the closed contract");
  }
  return expected;
}

function expectEnum<const T extends string>(
  value: unknown,
  values: readonly T[],
  path: string,
): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    fail("INVALID_ENUM", path, "value is outside the closed vocabulary");
  }
  return value as T;
}

function expectStableId(value: unknown, path: string): string {
  const text = expectString(value, path, 128);
  if (!STABLE_ID.test(text)) {
    fail("INVALID_ID", path, "expected a stable lowercase identifier");
  }
  return text;
}

function expectVersion(value: unknown, path: string): string {
  const text = expectString(value, path, 32);
  if (!VERSION.test(text)) {
    fail("INVALID_VERSION", path, "expected a semantic version");
  }
  return text;
}

function expectDigest(value: unknown, path: string): string {
  const text = expectString(value, path, 64);
  if (!DIGEST.test(text)) {
    fail("INVALID_DIGEST", path, "expected a lowercase SHA-256 digest");
  }
  return text;
}

function leapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function expectTimestamp(value: unknown, path: string): string {
  const text = expectString(value, path, 20);
  const match = TIMESTAMP.exec(text);
  if (match === null) {
    fail("INVALID_TIMESTAMP", path, "expected canonical UTC seconds");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const monthDays = [
    31,
    leapYear(year) ? 29 : 28,
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
  if (day > (monthDays[month - 1] ?? 0) || !Number.isFinite(Date.parse(text))) {
    fail("INVALID_TIMESTAMP", path, "calendar date is invalid");
  }
  return text;
}

function timestampValue(value: string): number {
  return Date.parse(value);
}

function expectHttpsUrl(value: unknown, path: string): string {
  const text = expectString(value, path, 2048);
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    fail("INVALID_URL", path, "expected an absolute HTTPS URL");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username.length > 0 ||
    parsed.password.length > 0 ||
    parsed.hash.length > 0
  ) {
    fail("INVALID_URL", path, "URL violates the closed HTTPS policy");
  }
  return text;
}

function expectCount(value: unknown, path: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 1_000_000
  ) {
    fail("INVALID_BOUNDS", path, "expected a bounded non-negative count");
  }
  return value;
}

function parseDigestedReference(
  value: unknown,
  path: string,
): RealSourceDigestedReference {
  const object = expectObject(value, path, ["id", "version", "digest"]);
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    digest: expectDigest(object.digest, `${path}/digest`),
  };
}

function parseScopeReference(
  value: unknown,
  path: string,
): RealSourceScopeReference {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "contentDigest",
  ]);
  return {
    kind: expectLiteral(object.kind, "lifecycle_scope", `${path}/kind`),
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    contentDigest: expectDigest(object.contentDigest, `${path}/contentDigest`),
  };
}

function parseReference<Kind extends RealSourceCatalogKind>(
  value: unknown,
  kind: Kind,
  path: string,
): RealSourceReference<Kind> {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "contentDigest",
  ]);
  return {
    kind: expectLiteral(object.kind, kind, `${path}/kind`),
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    contentDigest: expectDigest(object.contentDigest, `${path}/contentDigest`),
  };
}

function parseReferenceSet<Kind extends RealSourceCatalogKind>(
  value: unknown,
  kind: Kind,
  path: string,
  minimum: number,
  maximum: number,
): readonly RealSourceReference<Kind>[] {
  const refs = expectArray(value, path, minimum, maximum).map((entry, index) =>
    parseReference(entry, kind, `${path}/${index}`),
  );
  const keys = refs.map(refKey);
  if (new Set(keys).size !== keys.length) {
    fail("DUPLICATE_REFERENCE", path, "reference set contains a duplicate");
  }
  return refs;
}

function parseNullableReference<Kind extends RealSourceCatalogKind>(
  value: unknown,
  kind: Kind,
  path: string,
): RealSourceReference<Kind> | null {
  return value === null ? null : parseReference(value, kind, path);
}

function parseCatalogHeader<Kind extends RealSourceCatalogKind>(
  object: JsonObject,
  kind: Kind,
  path: string,
): RealSourceCatalogMember<Kind> {
  return {
    kind: expectLiteral(object.kind, kind, `${path}/kind`),
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    contentDigest: expectDigest(object.contentDigest, `${path}/contentDigest`),
    synthetic: expectLiteral(object.synthetic, false, `${path}/synthetic`),
    scopeRef: parseScopeReference(object.scopeRef, `${path}/scopeRef`),
  };
}

function parseValidity(
  object: JsonObject,
  path: string,
): RealSourceValidityInterval {
  const issuedAt = expectTimestamp(object.issuedAt, `${path}/issuedAt`);
  const expiresAt = expectTimestamp(object.expiresAt, `${path}/expiresAt`);
  if (timestampValue(expiresAt) <= timestampValue(issuedAt)) {
    fail("INVALID_INTERVAL", path, "validity must have positive duration");
  }
  return { issuedAt, expiresAt };
}

function assertNinetyDayMaximum(
  interval: RealSourceValidityInterval,
  path: string,
): void {
  if (
    timestampValue(interval.expiresAt) - timestampValue(interval.issuedAt) >
    MAX_REVIEW_DAYS * DAY_MS
  ) {
    fail("EXPIRY_TOO_LONG", path, "review or risk validity exceeds 90 days");
  }
}

function assertTimeWithin(
  time: string,
  interval: RealSourceValidityInterval,
  path: string,
): void {
  const value = timestampValue(time);
  if (
    value < timestampValue(interval.issuedAt) ||
    value >= timestampValue(interval.expiresAt)
  ) {
    fail(
      "TIME_OUTSIDE_INTERVAL",
      path,
      "timestamp is outside receipt validity",
    );
  }
}

function refKey(value: {
  readonly kind?: string;
  readonly id: string;
  readonly version: string;
}): string {
  return `${value.kind ?? "versioned"}:${value.id}@${value.version}`;
}

function sameRef(
  left: {
    readonly kind?: string;
    readonly id: string;
    readonly version: string;
    readonly contentDigest?: string;
  },
  right: {
    readonly kind?: string;
    readonly id: string;
    readonly version: string;
    readonly contentDigest?: string;
  },
): boolean {
  return (
    refKey(left) === refKey(right) &&
    (left.contentDigest === undefined ||
      right.contentDigest === undefined ||
      left.contentDigest === right.contentDigest)
  );
}

function sameDigestedRef(
  left: RealSourceDigestedReference,
  right: RealSourceDigestedReference,
): boolean {
  return (
    left.id === right.id &&
    left.version === right.version &&
    left.digest === right.digest
  );
}

function stableDigestedReferenceKey(
  reference: RealSourceDigestedReference,
): string {
  return `${reference.id}@${reference.version}`;
}

function registerStableDigestedReference(
  references: Map<string, string>,
  reference: RealSourceDigestedReference,
  path: string,
  domain: "authority identity" | "normalized revision",
): string {
  const key = stableDigestedReferenceKey(reference);
  const priorDigest = references.get(key);
  if (priorDigest !== undefined && priorDigest !== reference.digest) {
    fail(
      "INCONSISTENT_DIGESTED_REFERENCE",
      path,
      `${domain} id and version resolve to more than one digest`,
    );
  }
  references.set(key, reference.digest);
  return key;
}

function encodeCanonical(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => encodeCanonical(entry)).join(",")}]`;
  }
  const object = value as { readonly [key: string]: JsonValue };
  return `{${Object.keys(object)
    .sort(compareText)
    .map(
      (key) =>
        `${JSON.stringify(key)}:${encodeCanonical(object[key] as JsonValue)}`,
    )
    .join(",")}}`;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function canonicalClone<T>(value: T): T {
  return capturePlainJsonSnapshot(value, "$canonical") as T;
}

const SHA256_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

function rotateRight(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256Text(text: string): string {
  const source = new TextEncoder().encode(text);
  const paddedLength = Math.ceil((source.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(source);
  bytes[source.length] = 0x80;
  const bitLength = source.length * 8;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);
  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ]);
  const words = new Uint32Array(64);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const left = words[index - 15] as number;
      const right = words[index - 2] as number;
      const sigma0 =
        rotateRight(left, 7) ^ rotateRight(left, 18) ^ (left >>> 3);
      const sigma1 =
        rotateRight(right, 17) ^ rotateRight(right, 19) ^ (right >>> 10);
      words[index] =
        ((words[index - 16] as number) +
          sigma0 +
          (words[index - 7] as number) +
          sigma1) >>>
        0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const bigSigma1 =
        rotateRight(e as number, 6) ^
        rotateRight(e as number, 11) ^
        rotateRight(e as number, 25);
      const choose =
        ((e as number) & (f as number)) ^ (~(e as number) & (g as number));
      const temporary1 =
        ((h as number) +
          bigSigma1 +
          choose +
          (SHA256_CONSTANTS[index] as number) +
          (words[index] as number)) >>>
        0;
      const bigSigma0 =
        rotateRight(a as number, 2) ^
        rotateRight(a as number, 13) ^
        rotateRight(a as number, 22);
      const majority =
        ((a as number) & (b as number)) ^
        ((a as number) & (c as number)) ^
        ((b as number) & (c as number));
      const temporary2 = (bigSigma0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (((d as number) + temporary1) >>> 0) as number;
      d = c;
      c = b;
      b = a;
      a = ((temporary1 + temporary2) >>> 0) as number;
    }
    hash[0] = ((hash[0] as number) + (a as number)) >>> 0;
    hash[1] = ((hash[1] as number) + (b as number)) >>> 0;
    hash[2] = ((hash[2] as number) + (c as number)) >>> 0;
    hash[3] = ((hash[3] as number) + (d as number)) >>> 0;
    hash[4] = ((hash[4] as number) + (e as number)) >>> 0;
    hash[5] = ((hash[5] as number) + (f as number)) >>> 0;
    hash[6] = ((hash[6] as number) + (g as number)) >>> 0;
    hash[7] = ((hash[7] as number) + (h as number)) >>> 0;
  }
  return [...hash].map((word) => word.toString(16).padStart(8, "0")).join("");
}

function computedContentDigest(value: JsonValue): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(
      "INVALID_DIGEST_TARGET",
      "/contentDigest",
      "digest target must be an object",
    );
  }
  const payload = Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "contentDigest"),
  ) as JsonValue;
  return sha256Text(encodeCanonical(payload));
}

// Reciprocal supersession/LKG edges cannot recursively embed each other's hash.
// Member hashes therefore cover every non-digest field; resolveMember checks each
// edge digest exactly, and the bundle digest covers the complete reciprocal graph.
function stripNestedContentDigests(value: JsonValue): JsonValue {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(stripNestedContentDigests);
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "contentDigest")
      .map(([key, child]) => [key, stripNestedContentDigests(child)]),
  );
}

function computedMemberContentDigest(value: JsonValue): string {
  return sha256Text(encodeCanonical(stripNestedContentDigests(value)));
}

function verifyContentDigest(
  value: { readonly contentDigest: string },
  path: string,
): void {
  if (
    computedContentDigest(value as unknown as JsonValue) !== value.contentDigest
  ) {
    fail(
      "CONTENT_DIGEST_MISMATCH",
      `${path}/contentDigest`,
      "content bytes do not match the declared digest",
    );
  }
}

function verifyMemberContentDigest(member: CatalogMember, path: string): void {
  if (
    computedMemberContentDigest(member as unknown as JsonValue) !==
    member.contentDigest
  ) {
    fail(
      "CONTENT_DIGEST_MISMATCH",
      `${path}/contentDigest`,
      "receipt content does not match its declared digest",
    );
  }
}

function verifyDigestedObject(
  value: JsonObject,
  digestValue: string,
  path: string,
): void {
  const payload = Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "digest"),
  ) as JsonValue;
  if (sha256Text(encodeCanonical(payload)) !== digestValue) {
    fail(
      "CONTENT_DIGEST_MISMATCH",
      `${path}/digest`,
      "digest-bound object bytes do not match the declared digest",
    );
  }
}

function parseTargetDescriptorReference<
  T extends { readonly id: string; readonly version: string },
>(value: unknown, descriptor: T, path: string): RealSourceDigestedReference {
  const reference = parseDigestedReference(value, path);
  const expectedDigest = sha256Text(
    encodeCanonical(descriptor as unknown as JsonValue),
  );
  if (
    reference.id !== descriptor.id ||
    reference.version !== descriptor.version ||
    reference.digest !== expectedDigest
  ) {
    fail(
      "UNTRUSTED_SCOPE_REFERENCE",
      path,
      "scope identity and digest must resolve to the immutable repository descriptor bytes",
    );
  }
  return reference;
}

function parseHttpMethods(
  value: unknown,
  path: string,
): readonly RealSourceHttpMethod[] {
  const methods = expectArray(value, path, 1, 2).map((entry, index) =>
    expectEnum(entry, HTTP_METHODS, `${path}/${index}`),
  );
  if (new Set(methods).size !== methods.length) {
    fail("DUPLICATE_SCOPE", path, "method scope contains a duplicate");
  }
  requireCanonicalTextOrder(methods, path);
  return methods;
}

function resolveCanonicalSourceIdentity(
  sourceId: string,
  sourceRegistryVersion: string,
  registryRef: RealSourceDigestedReference,
  entryRef: RealSourceDigestedReference,
  path: string,
): void {
  if (sourceId !== "federal-register") {
    fail(
      "UNTRUSTED_SOURCE_REGISTRY",
      `${path}/sourceId`,
      "the 1.0.0 lifecycle contract is bound to the reviewed Federal Register entry",
    );
  }
  if (
    sourceRegistryVersion !== SOURCE_REGISTRY.registryVersion ||
    registryRef.id !== "policy-sentinel-source-registry" ||
    registryRef.version !== SOURCE_REGISTRY.registryVersion ||
    registryRef.digest !==
      sha256Text(encodeCanonical(SOURCE_REGISTRY as unknown as JsonValue))
  ) {
    fail(
      "UNTRUSTED_SOURCE_REGISTRY",
      `${path}/sourceRegistryRef`,
      "source registry identity does not match the exact repository-controlled bytes",
    );
  }
  const matches = SOURCE_REGISTRY.sources.filter(({ id }) => id === sourceId);
  if (matches.length !== 1) {
    fail(
      "UNTRUSTED_SOURCE_REGISTRY",
      `${path}/sourceId`,
      "source identity does not resolve exactly once in the trusted registry",
    );
  }
  const source = matches[0]!;
  if (
    source.synthetic !== false ||
    source.enabled !== false ||
    entryRef.id !== sourceId ||
    entryRef.version !== sourceRegistryVersion ||
    entryRef.digest !==
      sha256Text(encodeCanonical(source as unknown as JsonValue))
  ) {
    fail(
      "UNTRUSTED_SOURCE_REGISTRY",
      `${path}/sourceRegistryEntryRef`,
      "real source must resolve to the exact disabled canonical registry entry",
    );
  }
}

function parseLifecycleScope(
  value: unknown,
  path = "/scope",
): RealSourceLifecycleScope {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "contentDigest",
    "synthetic",
    "source",
    "contractRef",
    "fieldPolicyRef",
    "transformRef",
    "deploymentRef",
    "regionPackRef",
    "personaProjectionRef",
    "outputAdapterRef",
    "selectedRange",
    "unknownChecklist",
    "requestPlan",
    "artifactBoundaryRef",
    "authoritySetDigest",
    "accessScope",
    "relationshipPolicy",
    "authorityPolicy",
    "taxonomyPolicy",
    "artifactBoundary",
  ]);
  const scopeId = expectStableId(object.id, `${path}/id`);
  const scopeVersion = expectVersion(object.version, `${path}/version`);
  if (
    scopeId !== "federal-register-roadless-local-scope" ||
    scopeVersion !== "1.0.0"
  ) {
    fail(
      "UNTRUSTED_SCOPE_REFERENCE",
      path,
      "the 1.0.0 bundle is restricted to the reviewed Federal Register local scope",
    );
  }
  const source = expectObject(object.source, `${path}/source`, [
    "sourceId",
    "sourceRegistryVersion",
    "sourceRegistryRef",
    "sourceRegistryEntryRef",
  ]);
  const sourceId = expectStableId(source.sourceId, `${path}/source/sourceId`);
  if (sourceId.startsWith("synthetic-")) {
    fail(
      "INVALID_REAL_TRUST",
      `${path}/source/sourceId`,
      "synthetic source identity is rejected",
    );
  }
  const sourceRegistryVersion = expectVersion(
    source.sourceRegistryVersion,
    `${path}/source/sourceRegistryVersion`,
  );
  const sourceRegistryRef = parseDigestedReference(
    source.sourceRegistryRef,
    `${path}/source/sourceRegistryRef`,
  );
  const sourceRegistryEntryRef = parseDigestedReference(
    source.sourceRegistryEntryRef,
    `${path}/source/sourceRegistryEntryRef`,
  );
  resolveCanonicalSourceIdentity(
    sourceId,
    sourceRegistryVersion,
    sourceRegistryRef,
    sourceRegistryEntryRef,
    `${path}/source`,
  );
  const contractRef = parseTargetDescriptorReference(
    object.contractRef,
    REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.contract,
    `${path}/contractRef`,
  );
  const fieldPolicyRef = parseTargetDescriptorReference(
    object.fieldPolicyRef,
    REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.fieldPolicy,
    `${path}/fieldPolicyRef`,
  );
  const transformRef = parseTargetDescriptorReference(
    object.transformRef,
    REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.transform,
    `${path}/transformRef`,
  );
  const selected = expectObject(object.selectedRange, `${path}/selectedRange`, [
    "kind",
    "id",
    "version",
    "digest",
    "memberCount",
    "coverageClaim",
  ]);
  const unknownChecklist = expectObject(
    object.unknownChecklist,
    `${path}/unknownChecklist`,
    ["id", "version", "digest", "requiredUnknownKinds", "requiredQuestions"],
  );
  const checklistKinds = expectArray(
    unknownChecklist.requiredUnknownKinds,
    `${path}/unknownChecklist/requiredUnknownKinds`,
    REQUIRED_UNKNOWN_KINDS.length,
    REQUIRED_UNKNOWN_KINDS.length,
  ).map((entry, index) =>
    expectEnum(
      entry,
      REQUIRED_UNKNOWN_KINDS,
      `${path}/unknownChecklist/requiredUnknownKinds/${index}`,
    ),
  );
  if (
    checklistKinds.some((kind, index) => kind !== REQUIRED_UNKNOWN_KINDS[index])
  ) {
    fail(
      "INCOMPLETE_UNKNOWN_CHECKLIST",
      `${path}/unknownChecklist/requiredUnknownKinds`,
      "known unknown applicability must use the exact closed checklist",
    );
  }
  const checklistQuestions = expectArray(
    unknownChecklist.requiredQuestions,
    `${path}/unknownChecklist/requiredQuestions`,
    REQUIRED_UNKNOWN_QUESTIONS.length,
    REQUIRED_UNKNOWN_QUESTIONS.length,
  ).map((entry, index) =>
    expectEnum(
      entry,
      REQUIRED_UNKNOWN_QUESTIONS,
      `${path}/unknownChecklist/requiredQuestions/${index}`,
    ),
  );
  if (
    checklistQuestions.some(
      (question, index) => question !== REQUIRED_UNKNOWN_QUESTIONS[index],
    )
  ) {
    fail(
      "INCOMPLETE_UNKNOWN_CHECKLIST",
      `${path}/unknownChecklist/requiredQuestions`,
      "applicable source-review questions must use the exact closed inventory",
    );
  }
  const checklistDigest = expectDigest(
    unknownChecklist.digest,
    `${path}/unknownChecklist/digest`,
  );
  const checklistId = expectStableId(
    unknownChecklist.id,
    `${path}/unknownChecklist/id`,
  );
  const checklistVersion = expectVersion(
    unknownChecklist.version,
    `${path}/unknownChecklist/version`,
  );
  if (
    checklistId !== "federal-register-known-unknown-checklist" ||
    checklistVersion !== "1.0.0"
  ) {
    fail(
      "INCOMPLETE_UNKNOWN_CHECKLIST",
      `${path}/unknownChecklist`,
      "unknown checklist identity does not match the reviewed FR-A1 inventory",
    );
  }
  verifyDigestedObject(
    unknownChecklist,
    checklistDigest,
    `${path}/unknownChecklist`,
  );
  const requestPlan = expectObject(object.requestPlan, `${path}/requestPlan`, [
    "id",
    "version",
    "digest",
    "operation",
    "method",
    "host",
    "path",
    "query",
    "selectedRangeRef",
    "ceilings",
    "redirectPolicy",
  ]);
  const requestQuery = expectArray(
    requestPlan.query,
    `${path}/requestPlan/query`,
    FEDERAL_REGISTER_A1_FIELDS.length,
    FEDERAL_REGISTER_A1_FIELDS.length,
  ).map((entry, index) => {
    const query = expectObject(entry, `${path}/requestPlan/query/${index}`, [
      "name",
      "value",
    ]);
    const name = expectString(
      query.name,
      `${path}/requestPlan/query/${index}/name`,
      64,
    );
    if (name !== "fields[]") {
      fail(
        "INVALID_REQUEST_PLAN",
        `${path}/requestPlan/query/${index}/name`,
        "the FR-A1 request accepts only the fields[] parameter",
      );
    }
    return {
      name,
      value: expectString(
        query.value,
        `${path}/requestPlan/query/${index}/value`,
        256,
      ),
    };
  });
  if (
    requestQuery.some(
      ({ value }, index) => value !== FEDERAL_REGISTER_A1_FIELDS[index],
    )
  ) {
    fail(
      "INVALID_REQUEST_PLAN",
      `${path}/requestPlan/query`,
      "the FR-A1 fields[] inventory and order must match the frozen envelope",
    );
  }
  const ceilings = expectObject(
    requestPlan.ceilings,
    `${path}/requestPlan/ceilings`,
    [
      "requestCount",
      "pageCount",
      "itemCount",
      "concurrency",
      "timeoutMs",
      "responseBytes",
    ],
  );
  const requestPath = expectString(
    requestPlan.path,
    `${path}/requestPlan/path`,
    1024,
  );
  if (
    !requestPath.startsWith("/") ||
    requestPath.includes("?") ||
    requestPath.includes("#") ||
    requestPath.includes("\\") ||
    requestPath.includes("//") ||
    requestPath.split("/").includes("..")
  ) {
    fail(
      "INVALID_REQUEST_PLAN",
      `${path}/requestPlan/path`,
      "request path must be an exact canonical origin-relative path",
    );
  }
  const relationship = expectObject(
    object.relationshipPolicy,
    `${path}/relationshipPolicy`,
    [
      "jurisdictionClass",
      "nationAssociation",
      "organizationMembershipInference",
      "geographyInference",
      "rightsInference",
      "positionInference",
    ],
  );
  const authority = expectObject(
    object.authorityPolicy,
    `${path}/authorityPolicy`,
    ["missingIssuerDisposition", "authorityFallback"],
  );
  const taxonomy = expectObject(
    object.taxonomyPolicy,
    `${path}/taxonomyPolicy`,
    ["topicSchemes", "crossSchemeMerge", "unmappedDisposition"],
  );
  const topicSchemes = expectArray(
    taxonomy.topicSchemes,
    `${path}/taxonomyPolicy/topicSchemes`,
    2,
    2,
  );
  const artifact = expectObject(
    object.artifactBoundary,
    `${path}/artifactBoundary`,
    ["artifactClass", "ordinaryBuildAdmission", "publicOutputAdmission"],
  );
  const access = expectObject(object.accessScope, `${path}/accessScope`, [
    "hosts",
    "methods",
  ]);
  const accessHosts = expectArray(
    access.hosts,
    `${path}/accessScope/hosts`,
    1,
    8,
  ).map((entry, index) =>
    expectHost(entry, `${path}/accessScope/hosts/${index}`),
  );
  if (new Set(accessHosts).size !== accessHosts.length) {
    fail(
      "DUPLICATE_SCOPE",
      `${path}/accessScope/hosts`,
      "access host scope contains a duplicate",
    );
  }
  requireCanonicalTextOrder(accessHosts, `${path}/accessScope/hosts`);
  if (
    accessHosts.length !== 1 ||
    accessHosts[0] !== "www.federalregister.gov"
  ) {
    fail(
      "INVALID_REQUEST_PLAN",
      `${path}/accessScope/hosts`,
      "the frozen FR-A1 acquisition permits only www.federalregister.gov",
    );
  }
  const accessMethods = parseHttpMethods(
    access.methods,
    `${path}/accessScope/methods`,
  );
  if (
    sourceId === "federal-register" &&
    (accessMethods.length !== 1 || accessMethods[0] !== "GET")
  ) {
    fail(
      "INVALID_REQUEST_PLAN",
      `${path}/accessScope/methods`,
      "the current Federal Register candidate is restricted to GET",
    );
  }
  const selectedRange = {
    kind: expectLiteral(
      selected.kind,
      "explicit_document_identities",
      `${path}/selectedRange/kind`,
    ),
    id: expectStableId(selected.id, `${path}/selectedRange/id`),
    version: expectVersion(selected.version, `${path}/selectedRange/version`),
    digest: expectDigest(selected.digest, `${path}/selectedRange/digest`),
    memberCount: expectLiteral(
      selected.memberCount,
      1,
      `${path}/selectedRange/memberCount`,
    ),
    coverageClaim: expectLiteral(
      selected.coverageClaim,
      "bounded_non_comprehensive",
      `${path}/selectedRange/coverageClaim`,
    ),
  } as const;
  if (
    selectedRange.id !== "federal-register-document-2026-16965" ||
    selectedRange.version !== "1.0.0"
  ) {
    fail(
      "UNTRUSTED_SCOPE_REFERENCE",
      `${path}/selectedRange`,
      "selected range does not identify the single reviewed Federal Register document",
    );
  }
  verifyDigestedObject(selected, selectedRange.digest, `${path}/selectedRange`);
  const requestPlanRef = {
    id: expectStableId(requestPlan.id, `${path}/requestPlan/id`),
    version: expectVersion(requestPlan.version, `${path}/requestPlan/version`),
    digest: expectDigest(requestPlan.digest, `${path}/requestPlan/digest`),
  };
  if (
    requestPlanRef.id !== "federal-register-document-request-plan" ||
    requestPlanRef.version !== "1.0.0"
  ) {
    fail(
      "INVALID_REQUEST_PLAN",
      `${path}/requestPlan`,
      "request plan identity does not match the frozen FR-A1 plan",
    );
  }
  const requestMethod = expectEnum(
    requestPlan.method,
    HTTP_METHODS,
    `${path}/requestPlan/method`,
  );
  const requestHost = expectHost(requestPlan.host, `${path}/requestPlan/host`);
  if (
    requestHost !== "www.federalregister.gov" ||
    requestPath !== "/api/v1/documents/2026-16965.json"
  ) {
    fail(
      "INVALID_REQUEST_PLAN",
      `${path}/requestPlan`,
      "request origin and path do not match the frozen FR-A1 document envelope",
    );
  }
  const timeoutMs = expectCount(
    ceilings.timeoutMs,
    `${path}/requestPlan/ceilings/timeoutMs`,
  );
  const responseBytes = expectCount(
    ceilings.responseBytes,
    `${path}/requestPlan/ceilings/responseBytes`,
  );
  if (timeoutMs !== 30_000 || responseBytes !== 65_536) {
    fail(
      "INVALID_REQUEST_PLAN",
      `${path}/requestPlan/ceilings`,
      "request ceilings do not match the frozen FR-A1 envelope",
    );
  }
  const selectedRangeRef = parseDigestedReference(
    requestPlan.selectedRangeRef,
    `${path}/requestPlan/selectedRangeRef`,
  );
  if (
    !sameDigestedRef(selectedRangeRef, selectedRange) ||
    !accessMethods.includes(requestMethod) ||
    !accessHosts.includes(requestHost)
  ) {
    fail(
      "INVALID_REQUEST_PLAN",
      `${path}/requestPlan`,
      "request plan is outside the exact host, method, or selected-range scope",
    );
  }
  const parsedRequestPlan: RealSourceRequestPlan = {
    ...requestPlanRef,
    operation: expectLiteral(
      requestPlan.operation,
      "acquisition",
      `${path}/requestPlan/operation`,
    ),
    method: requestMethod,
    host: requestHost,
    path: requestPath,
    query: requestQuery,
    selectedRangeRef,
    ceilings: {
      requestCount: expectLiteral(
        ceilings.requestCount,
        1,
        `${path}/requestPlan/ceilings/requestCount`,
      ),
      pageCount: expectLiteral(
        ceilings.pageCount,
        1,
        `${path}/requestPlan/ceilings/pageCount`,
      ),
      itemCount: expectLiteral(
        ceilings.itemCount,
        1,
        `${path}/requestPlan/ceilings/itemCount`,
      ),
      concurrency: expectLiteral(
        ceilings.concurrency,
        1,
        `${path}/requestPlan/ceilings/concurrency`,
      ),
      timeoutMs,
      responseBytes,
    },
    redirectPolicy: expectLiteral(
      requestPlan.redirectPolicy,
      "forbidden",
      `${path}/requestPlan/redirectPolicy`,
    ),
  };
  verifyDigestedObject(
    requestPlan,
    parsedRequestPlan.digest,
    `${path}/requestPlan`,
  );
  const artifactBoundaryRef = parseDigestedReference(
    object.artifactBoundaryRef,
    `${path}/artifactBoundaryRef`,
  );
  const parsedArtifactBoundary = {
    artifactClass: expectLiteral(
      artifact.artifactClass,
      "ignored_local_prerelease",
      `${path}/artifactBoundary/artifactClass`,
    ),
    ordinaryBuildAdmission: expectLiteral(
      artifact.ordinaryBuildAdmission,
      "forbidden",
      `${path}/artifactBoundary/ordinaryBuildAdmission`,
    ),
    publicOutputAdmission: expectLiteral(
      artifact.publicOutputAdmission,
      "forbidden",
      `${path}/artifactBoundary/publicOutputAdmission`,
    ),
  } as const;
  const expectedArtifactBoundaryDigest = sha256Text(
    encodeCanonical([
      "real-source-lifecycle-artifact-boundary-v1",
      artifactBoundaryRef.id,
      artifactBoundaryRef.version,
      parsedArtifactBoundary,
    ] as unknown as JsonValue),
  );
  if (
    artifactBoundaryRef.id !== "local-prerelease-artifact-boundary" ||
    artifactBoundaryRef.digest !== expectedArtifactBoundaryDigest
  ) {
    fail(
      "UNTRUSTED_SCOPE_REFERENCE",
      `${path}/artifactBoundaryRef`,
      "artifact boundary reference does not bind the exact closed boundary",
    );
  }
  return {
    kind: expectLiteral(object.kind, "lifecycle_scope", `${path}/kind`),
    id: scopeId,
    version: scopeVersion,
    contentDigest: expectDigest(object.contentDigest, `${path}/contentDigest`),
    synthetic: expectLiteral(object.synthetic, false, `${path}/synthetic`),
    source: {
      sourceId,
      sourceRegistryVersion,
      sourceRegistryRef,
      sourceRegistryEntryRef,
    },
    contractRef,
    fieldPolicyRef,
    transformRef,
    deploymentRef: parseTargetDescriptorReference(
      object.deploymentRef,
      REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.deployment,
      `${path}/deploymentRef`,
    ),
    regionPackRef: parseTargetDescriptorReference(
      object.regionPackRef,
      REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.region,
      `${path}/regionPackRef`,
    ),
    personaProjectionRef: parseTargetDescriptorReference(
      object.personaProjectionRef,
      REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.persona,
      `${path}/personaProjectionRef`,
    ),
    outputAdapterRef: parseTargetDescriptorReference(
      object.outputAdapterRef,
      REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.output,
      `${path}/outputAdapterRef`,
    ),
    selectedRange,
    unknownChecklist: {
      id: checklistId,
      version: checklistVersion,
      digest: checklistDigest,
      requiredUnknownKinds: checklistKinds,
      requiredQuestions: checklistQuestions,
    },
    requestPlan: parsedRequestPlan,
    artifactBoundaryRef,
    authoritySetDigest: expectDigest(
      object.authoritySetDigest,
      `${path}/authoritySetDigest`,
    ),
    accessScope: {
      hosts: accessHosts,
      methods: accessMethods,
    },
    relationshipPolicy: {
      jurisdictionClass: expectLiteral(
        relationship.jurisdictionClass,
        "general_jurisdiction",
        `${path}/relationshipPolicy/jurisdictionClass`,
      ),
      nationAssociation: expectLiteral(
        relationship.nationAssociation,
        "forbidden",
        `${path}/relationshipPolicy/nationAssociation`,
      ),
      organizationMembershipInference: expectLiteral(
        relationship.organizationMembershipInference,
        "forbidden",
        `${path}/relationshipPolicy/organizationMembershipInference`,
      ),
      geographyInference: expectLiteral(
        relationship.geographyInference,
        "forbidden",
        `${path}/relationshipPolicy/geographyInference`,
      ),
      rightsInference: expectLiteral(
        relationship.rightsInference,
        "forbidden",
        `${path}/relationshipPolicy/rightsInference`,
      ),
      positionInference: expectLiteral(
        relationship.positionInference,
        "forbidden",
        `${path}/relationshipPolicy/positionInference`,
      ),
    },
    authorityPolicy: {
      missingIssuerDisposition: expectLiteral(
        authority.missingIssuerDisposition,
        "unresolved",
        `${path}/authorityPolicy/missingIssuerDisposition`,
      ),
      authorityFallback: expectLiteral(
        authority.authorityFallback,
        "forbidden",
        `${path}/authorityPolicy/authorityFallback`,
      ),
    },
    taxonomyPolicy: {
      topicSchemes: [
        expectLiteral(
          topicSchemes[0],
          "federal_register_topics",
          `${path}/taxonomyPolicy/topicSchemes/0`,
        ),
        expectLiteral(
          topicSchemes[1],
          "cfr_topics",
          `${path}/taxonomyPolicy/topicSchemes/1`,
        ),
      ],
      crossSchemeMerge: expectLiteral(
        taxonomy.crossSchemeMerge,
        "forbidden",
        `${path}/taxonomyPolicy/crossSchemeMerge`,
      ),
      unmappedDisposition: expectLiteral(
        taxonomy.unmappedDisposition,
        "Unclassified",
        `${path}/taxonomyPolicy/unmappedDisposition`,
      ),
    },
    artifactBoundary: parsedArtifactBoundary,
  };
}

function parseAuthorityReceipt(
  value: unknown,
  path: string,
): RealSourceAuthorityReceipt {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "contentDigest",
    "synthetic",
    "scopeRef",
    "issuedAt",
    "expiresAt",
    "authorityRole",
    "authorityIdentityRef",
    "state",
    "supersededBy",
  ]);
  return {
    ...parseCatalogHeader(object, "authority_receipt", path),
    ...parseValidity(object, path),
    authorityRole: expectEnum(
      object.authorityRole,
      AUTHORITY_ROLES,
      `${path}/authorityRole`,
    ),
    authorityIdentityRef: parseDigestedReference(
      object.authorityIdentityRef,
      `${path}/authorityIdentityRef`,
    ),
    state: expectEnum(object.state, RECEIPT_STATES, `${path}/state`),
    supersededBy: parseNullableReference(
      object.supersededBy,
      "authority_receipt",
      `${path}/supersededBy`,
    ),
  };
}

function evidenceBaseKeys(extra: readonly string[]): readonly string[] {
  return [
    "kind",
    "id",
    "version",
    "contentDigest",
    "synthetic",
    "scopeRef",
    "evidenceClass",
    ...extra,
  ];
}

function parseProviderFactEvidence(
  value: unknown,
  path: string,
): RealSourceProviderFactEvidence {
  const object = expectObject(
    value,
    path,
    evidenceBaseKeys([
      "factKind",
      "authorityReceiptRef",
      "accessState",
      "restrictionState",
      "evidenceUrl",
      "accessedAt",
      "statementDigest",
    ]),
  );
  const factKind = expectEnum(
    object.factKind,
    [
      "source_identity",
      "official_status",
      "field_meaning",
      "rendition_custody",
      "access_requirement",
      "affirmative_restriction",
      "reproduction_right",
    ] as const,
    `${path}/factKind`,
  );
  const accessState = expectEnum(
    object.accessState,
    [
      "not_applicable",
      "credentials_not_required",
      "credentials_required",
    ] as const,
    `${path}/accessState`,
  );
  const restrictionState = expectEnum(
    object.restrictionState,
    ["not_applicable", "compatible", "incompatible"] as const,
    `${path}/restrictionState`,
  );
  if (
    (factKind === "access_requirement") !==
    (accessState !== "not_applicable")
  ) {
    fail(
      "INVALID_PROVIDER_FACT",
      `${path}/accessState`,
      "only an access-requirement fact may assert a credential state",
    );
  }
  if (
    (factKind === "affirmative_restriction") !==
    (restrictionState !== "not_applicable")
  ) {
    fail(
      "INVALID_PROVIDER_FACT",
      `${path}/restrictionState`,
      "only an affirmative-restriction fact may assert compatibility",
    );
  }
  return {
    ...parseCatalogHeader(object, "evidence_receipt", path),
    evidenceClass: expectLiteral(
      object.evidenceClass,
      "provider_fact",
      `${path}/evidenceClass`,
    ),
    factKind,
    authorityReceiptRef: parseReference(
      object.authorityReceiptRef,
      "authority_receipt",
      `${path}/authorityReceiptRef`,
    ),
    accessState,
    restrictionState,
    evidenceUrl: expectHttpsUrl(object.evidenceUrl, `${path}/evidenceUrl`),
    accessedAt: expectTimestamp(object.accessedAt, `${path}/accessedAt`),
    statementDigest: expectDigest(
      object.statementDigest,
      `${path}/statementDigest`,
    ),
  };
}

function parseDatedObservationEvidence(
  value: unknown,
  path: string,
): RealSourceDatedObservationEvidence {
  const object = expectObject(
    value,
    path,
    evidenceBaseKeys([
      "observationKind",
      "operation",
      "requestDigest",
      "resultState",
      "observedAt",
      "responseDigest",
    ]),
  );
  const resultState = expectEnum(
    object.resultState,
    ["observed", "not_observed", "failed"] as const,
    `${path}/resultState`,
  );
  const responseDigest =
    object.responseDigest === null
      ? null
      : expectDigest(object.responseDigest, `${path}/responseDigest`);
  if ((resultState === "observed") !== (responseDigest !== null)) {
    fail(
      "OBSERVATION_DIGEST_MISMATCH",
      `${path}/responseDigest`,
      "observation digest state is inconsistent",
    );
  }
  return {
    ...parseCatalogHeader(object, "evidence_receipt", path),
    evidenceClass: expectLiteral(
      object.evidenceClass,
      "dated_observation",
      `${path}/evidenceClass`,
    ),
    observationKind: expectEnum(
      object.observationKind,
      [
        "response_shape",
        "error_shape",
        "response_headers",
        "paging_behavior",
        "availability",
      ] as const,
      `${path}/observationKind`,
    ),
    operation: expectEnum(object.operation, OPERATIONS, `${path}/operation`),
    requestDigest: expectDigest(object.requestDigest, `${path}/requestDigest`),
    resultState,
    observedAt: expectTimestamp(object.observedAt, `${path}/observedAt`),
    responseDigest,
  };
}

function parseProjectControlEvidence(
  value: unknown,
  path: string,
): RealSourceProjectControlEvidence {
  const object = expectObject(
    value,
    path,
    evidenceBaseKeys([
      "controlKind",
      "controlRef",
      "enforcementState",
      "documentedAt",
    ]),
  );
  return {
    ...parseCatalogHeader(object, "evidence_receipt", path),
    evidenceClass: expectLiteral(
      object.evidenceClass,
      "project_control",
      `${path}/evidenceClass`,
    ),
    controlKind: expectEnum(
      object.controlKind,
      [
        "field_allowlist",
        "selected_range",
        "request_budget",
        "concurrency_limit",
        "time_limit",
        "byte_limit",
        "no_automatic_retry",
        "parser_fail_closed",
        "drift_policy",
        "lkg_retention",
        "artifact_isolation",
        "request_plan",
        "source_registry",
        "source_registry_entry",
        "deployment_scope",
        "region_scope",
        "persona_scope",
        "output_scope",
      ] as const,
      `${path}/controlKind`,
    ),
    controlRef: parseDigestedReference(object.controlRef, `${path}/controlRef`),
    enforcementState: expectLiteral(
      object.enforcementState,
      "fail_closed",
      `${path}/enforcementState`,
    ),
    documentedAt: expectTimestamp(object.documentedAt, `${path}/documentedAt`),
  };
}

function parseUnknownEvidence(
  value: unknown,
  path: string,
): RealSourceUnknownEvidence {
  const object = expectObject(
    value,
    path,
    evidenceBaseKeys([
      "unknownKind",
      "resolution",
      "recordedAt",
      "limitationCode",
    ]),
  );
  const unknownKind = expectEnum(
    object.unknownKind,
    [
      "numeric_rate_limit",
      "paging_stability",
      "snapshot_stability",
      "retry_backoff",
      "formal_response_error_schema",
      "service_level",
      "change_notice",
      "api_specific_terms",
      "api_specific_privacy",
      "authentication_requirement",
    ] as const,
    `${path}/unknownKind`,
  );
  const limitationCode = expectEnum(
    object.limitationCode,
    [
      "serial_bounded_requests_only",
      "closed_selection_no_completeness",
      "no_availability_promise",
      "fail_closed_on_drift",
      "no_automatic_retry",
      "parser_fail_closed",
      "owner_risk_acceptance_required",
    ] as const,
    `${path}/limitationCode`,
  );
  if (limitationCode !== UNKNOWN_LIMITATION_BY_KIND[unknownKind]) {
    fail(
      "UNKNOWN_LIMITATION_MISMATCH",
      `${path}/limitationCode`,
      "unknown kind and fail-closed limitation are not the exact approved pair",
    );
  }
  return {
    ...parseCatalogHeader(object, "evidence_receipt", path),
    evidenceClass: expectLiteral(
      object.evidenceClass,
      "unknown",
      `${path}/evidenceClass`,
    ),
    unknownKind,
    resolution: expectEnum(
      object.resolution,
      [
        "not_located_after_diligent_official_source_review",
        "not_documented_by_provider",
        "not_observed",
      ] as const,
      `${path}/resolution`,
    ),
    recordedAt: expectTimestamp(object.recordedAt, `${path}/recordedAt`),
    limitationCode,
  };
}

function expectHost(value: unknown, path: string): string {
  const host = expectString(value, path, 253);
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(host) || host.includes("..")) {
    fail("INVALID_HOST", path, "expected a canonical hostname");
  }
  return host;
}

function parseResidualRiskEvidence(
  value: unknown,
  path: string,
): RealSourceResidualRiskEvidence {
  const object = expectObject(
    value,
    path,
    evidenceBaseKeys([
      "issuedAt",
      "expiresAt",
      "riskKind",
      "ownerAuthorityRef",
      "unknownEvidenceRefs",
      "acceptedAt",
      "riskScope",
      "conditions",
      "state",
      "supersededBy",
    ]),
  );
  const interval = parseValidity(object, path);
  assertNinetyDayMaximum(interval, path);
  const acceptedAt = expectTimestamp(object.acceptedAt, `${path}/acceptedAt`);
  assertTimeWithin(acceptedAt, interval, `${path}/acceptedAt`);
  const riskScope = expectObject(object.riskScope, `${path}/riskScope`, [
    "hosts",
    "methods",
    "fieldPolicyRef",
    "outputBoundary",
  ]);
  const hosts = expectArray(
    riskScope.hosts,
    `${path}/riskScope/hosts`,
    1,
    8,
  ).map((entry, index) =>
    expectHost(entry, `${path}/riskScope/hosts/${index}`),
  );
  if (new Set(hosts).size !== hosts.length) {
    fail(
      "DUPLICATE_SCOPE",
      `${path}/riskScope/hosts`,
      "host scope contains a duplicate",
    );
  }
  requireCanonicalTextOrder(hosts, `${path}/riskScope/hosts`);
  const methods = parseHttpMethods(
    riskScope.methods,
    `${path}/riskScope/methods`,
  );
  const conditions = expectArray(
    object.conditions,
    `${path}/conditions`,
    6,
    6,
  ).map((entry, index) =>
    expectEnum(entry, RESIDUAL_CONDITIONS, `${path}/conditions/${index}`),
  );
  if (
    new Set(conditions).size !== RESIDUAL_CONDITIONS.length ||
    RESIDUAL_CONDITIONS.some((condition) => !conditions.includes(condition))
  ) {
    fail(
      "INCOMPLETE_RISK_SCOPE",
      `${path}/conditions`,
      "every closed residual-risk condition is required",
    );
  }
  requireCanonicalTextOrder(conditions, `${path}/conditions`);
  return {
    ...parseCatalogHeader(object, "evidence_receipt", path),
    ...interval,
    evidenceClass: expectLiteral(
      object.evidenceClass,
      "residual_risk_decision",
      `${path}/evidenceClass`,
    ),
    riskKind: expectLiteral(
      object.riskKind,
      "api_terms_or_privacy_not_located",
      `${path}/riskKind`,
    ),
    ownerAuthorityRef: parseReference(
      object.ownerAuthorityRef,
      "authority_receipt",
      `${path}/ownerAuthorityRef`,
    ),
    unknownEvidenceRefs: parseReferenceSet(
      object.unknownEvidenceRefs,
      "evidence_receipt",
      `${path}/unknownEvidenceRefs`,
      1,
      16,
    ),
    acceptedAt,
    riskScope: {
      hosts,
      methods,
      fieldPolicyRef: parseDigestedReference(
        riskScope.fieldPolicyRef,
        `${path}/riskScope/fieldPolicyRef`,
      ),
      outputBoundary: expectLiteral(
        riskScope.outputBoundary,
        "ignored_local_prerelease_only",
        `${path}/riskScope/outputBoundary`,
      ),
    },
    conditions,
    state: expectEnum(object.state, RECEIPT_STATES, `${path}/state`),
    supersededBy: parseNullableReference(
      object.supersededBy,
      "evidence_receipt",
      `${path}/supersededBy`,
    ),
  };
}

function parseEvidenceReceipt(
  value: unknown,
  path: string,
): RealSourceEvidenceReceipt {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_SHAPE", path, "expected an evidence receipt");
  }
  const evidenceClass = (value as JsonObject).evidenceClass;
  switch (evidenceClass) {
    case "provider_fact":
      return parseProviderFactEvidence(value, path);
    case "dated_observation":
      return parseDatedObservationEvidence(value, path);
    case "project_control":
      return parseProjectControlEvidence(value, path);
    case "unknown":
      return parseUnknownEvidence(value, path);
    case "residual_risk_decision":
      return parseResidualRiskEvidence(value, path);
    default:
      fail(
        "INVALID_EVIDENCE_CLASS",
        `${path}/evidenceClass`,
        "evidence class is outside the closed partition",
      );
  }
}

function parseAnyReference(value: unknown, path: string): RealSourceReference {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "contentDigest",
  ]);
  return {
    kind: expectEnum(object.kind, CATALOG_KINDS, `${path}/kind`),
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    contentDigest: expectDigest(object.contentDigest, `${path}/contentDigest`),
  };
}

function receiptKeys(extra: readonly string[]): readonly string[] {
  return [
    "kind",
    "id",
    "version",
    "contentDigest",
    "synthetic",
    "scopeRef",
    "issuedAt",
    "expiresAt",
    ...extra,
  ];
}

function parseReviewReceipt(
  value: unknown,
  path: string,
): RealSourceReviewReceipt {
  const object = expectObject(
    value,
    path,
    receiptKeys([
      "reviewKind",
      "subject",
      "reviewerAuthorityRef",
      "ownerAuthorityRef",
      "reviewedAt",
      "state",
      "supersededBy",
    ]),
  );
  const interval = parseValidity(object, path);
  assertNinetyDayMaximum(interval, path);
  const reviewedAt = expectTimestamp(object.reviewedAt, `${path}/reviewedAt`);
  assertTimeWithin(reviewedAt, interval, `${path}/reviewedAt`);
  const subject = expectObject(object.subject, `${path}/subject`, [
    "kind",
    "ref",
  ]);
  const subjectKind = expectEnum(
    subject.kind,
    REVIEW_SUBJECT_KINDS,
    `${path}/subject/kind`,
  );
  const subjectRef = parseAnyReference(subject.ref, `${path}/subject/ref`);
  if (subjectRef.kind !== subjectKind) {
    fail(
      "CROSS_KIND_REFERENCE",
      `${path}/subject`,
      "review subject kind and reference differ",
    );
  }
  return {
    ...parseCatalogHeader(object, "review_receipt", path),
    ...interval,
    reviewKind: expectEnum(
      object.reviewKind,
      REVIEW_KINDS,
      `${path}/reviewKind`,
    ),
    subject: { kind: subjectKind, ref: subjectRef },
    reviewerAuthorityRef: parseReference(
      object.reviewerAuthorityRef,
      "authority_receipt",
      `${path}/reviewerAuthorityRef`,
    ),
    ownerAuthorityRef: parseReference(
      object.ownerAuthorityRef,
      "authority_receipt",
      `${path}/ownerAuthorityRef`,
    ),
    reviewedAt,
    state: expectEnum(object.state, RECEIPT_STATES, `${path}/state`),
    supersededBy: parseNullableReference(
      object.supersededBy,
      "review_receipt",
      `${path}/supersededBy`,
    ),
  };
}

function parseOperationGrant(
  value: unknown,
  path: string,
): RealSourceOperationGrant {
  const object = expectObject(
    value,
    path,
    receiptKeys([
      "operation",
      "requestPlanRef",
      "ownerAuthorityRef",
      "reviewReceiptRefs",
      "state",
      "supersededBy",
    ]),
  );
  return {
    ...parseCatalogHeader(object, "operation_grant", path),
    ...parseValidity(object, path),
    operation: expectEnum(object.operation, OPERATIONS, `${path}/operation`),
    requestPlanRef: parseDigestedReference(
      object.requestPlanRef,
      `${path}/requestPlanRef`,
    ),
    ownerAuthorityRef: parseReference(
      object.ownerAuthorityRef,
      "authority_receipt",
      `${path}/ownerAuthorityRef`,
    ),
    reviewReceiptRefs: parseReferenceSet(
      object.reviewReceiptRefs,
      "review_receipt",
      `${path}/reviewReceiptRefs`,
      1,
      16,
    ),
    state: expectEnum(
      object.state,
      ["granted", "revoked", "superseded"] as const,
      `${path}/state`,
    ),
    supersededBy: parseNullableReference(
      object.supersededBy,
      "operation_grant",
      `${path}/supersededBy`,
    ),
  };
}

function parseQualificationReceipt(
  value: unknown,
  path: string,
): RealSourceQualificationReceipt {
  const object = expectObject(
    value,
    path,
    receiptKeys([
      "providerFactEvidenceRefs",
      "projectControlEvidenceRefs",
      "unknownEvidenceRefs",
      "issuedByAuthorityRef",
      "reviewReceiptRefs",
      "state",
      "supersededBy",
    ]),
  );
  return {
    ...parseCatalogHeader(object, "qualification_receipt", path),
    ...parseValidity(object, path),
    providerFactEvidenceRefs: parseReferenceSet(
      object.providerFactEvidenceRefs,
      "evidence_receipt",
      `${path}/providerFactEvidenceRefs`,
      1,
      64,
    ),
    projectControlEvidenceRefs: parseReferenceSet(
      object.projectControlEvidenceRefs,
      "evidence_receipt",
      `${path}/projectControlEvidenceRefs`,
      1,
      64,
    ),
    unknownEvidenceRefs: parseReferenceSet(
      object.unknownEvidenceRefs,
      "evidence_receipt",
      `${path}/unknownEvidenceRefs`,
      0,
      64,
    ),
    issuedByAuthorityRef: parseReference(
      object.issuedByAuthorityRef,
      "authority_receipt",
      `${path}/issuedByAuthorityRef`,
    ),
    reviewReceiptRefs: parseReferenceSet(
      object.reviewReceiptRefs,
      "review_receipt",
      `${path}/reviewReceiptRefs`,
      1,
      16,
    ),
    state: expectEnum(
      object.state,
      ["qualified", "revoked", "superseded"] as const,
      `${path}/state`,
    ),
    supersededBy: parseNullableReference(
      object.supersededBy,
      "qualification_receipt",
      `${path}/supersededBy`,
    ),
  };
}

function parseAdmissionReceipt(
  value: unknown,
  path: string,
): RealSourceAdmissionReceipt {
  const object = expectObject(
    value,
    path,
    receiptKeys([
      "qualificationReceiptRef",
      "ownerAuthorityRef",
      "reviewReceiptRefs",
      "residualRiskEvidenceRefs",
      "state",
      "supersededBy",
    ]),
  );
  return {
    ...parseCatalogHeader(object, "admission_receipt", path),
    ...parseValidity(object, path),
    qualificationReceiptRef: parseReference(
      object.qualificationReceiptRef,
      "qualification_receipt",
      `${path}/qualificationReceiptRef`,
    ),
    ownerAuthorityRef: parseReference(
      object.ownerAuthorityRef,
      "authority_receipt",
      `${path}/ownerAuthorityRef`,
    ),
    reviewReceiptRefs: parseReferenceSet(
      object.reviewReceiptRefs,
      "review_receipt",
      `${path}/reviewReceiptRefs`,
      1,
      16,
    ),
    residualRiskEvidenceRefs: parseReferenceSet(
      object.residualRiskEvidenceRefs,
      "evidence_receipt",
      `${path}/residualRiskEvidenceRefs`,
      0,
      16,
    ),
    state: expectEnum(
      object.state,
      ["admitted", "revoked", "superseded"] as const,
      `${path}/state`,
    ),
    supersededBy: parseNullableReference(
      object.supersededBy,
      "admission_receipt",
      `${path}/supersededBy`,
    ),
  };
}

function parseActivationReceipt(
  value: unknown,
  path: string,
): RealSourceActivationReceipt {
  const object = expectObject(
    value,
    path,
    receiptKeys([
      "admissionReceiptRef",
      "ownerAuthorityRef",
      "operationGrantRefs",
      "reviewReceiptRefs",
      "state",
      "supersededBy",
    ]),
  );
  return {
    ...parseCatalogHeader(object, "activation_receipt", path),
    ...parseValidity(object, path),
    admissionReceiptRef: parseReference(
      object.admissionReceiptRef,
      "admission_receipt",
      `${path}/admissionReceiptRef`,
    ),
    ownerAuthorityRef: parseReference(
      object.ownerAuthorityRef,
      "authority_receipt",
      `${path}/ownerAuthorityRef`,
    ),
    operationGrantRefs: parseReferenceSet(
      object.operationGrantRefs,
      "operation_grant",
      `${path}/operationGrantRefs`,
      1,
      6,
    ),
    reviewReceiptRefs: parseReferenceSet(
      object.reviewReceiptRefs,
      "review_receipt",
      `${path}/reviewReceiptRefs`,
      1,
      16,
    ),
    state: expectEnum(
      object.state,
      ["active", "revoked", "superseded"] as const,
      `${path}/state`,
    ),
    supersededBy: parseNullableReference(
      object.supersededBy,
      "activation_receipt",
      `${path}/supersededBy`,
    ),
  };
}

function parseBindingReceipt(
  value: unknown,
  path: string,
): RealSourceBindingReceipt {
  const object = expectObject(
    value,
    path,
    receiptKeys([
      "activationReceiptRef",
      "ownerAuthorityRef",
      "reviewReceiptRefs",
      "state",
      "supersededBy",
    ]),
  );
  return {
    ...parseCatalogHeader(object, "binding_receipt", path),
    ...parseValidity(object, path),
    activationReceiptRef: parseReference(
      object.activationReceiptRef,
      "activation_receipt",
      `${path}/activationReceiptRef`,
    ),
    ownerAuthorityRef: parseReference(
      object.ownerAuthorityRef,
      "authority_receipt",
      `${path}/ownerAuthorityRef`,
    ),
    reviewReceiptRefs: parseReferenceSet(
      object.reviewReceiptRefs,
      "review_receipt",
      `${path}/reviewReceiptRefs`,
      1,
      16,
    ),
    state: expectEnum(
      object.state,
      ["bound", "revoked", "superseded"] as const,
      `${path}/state`,
    ),
    supersededBy: parseNullableReference(
      object.supersededBy,
      "binding_receipt",
      `${path}/supersededBy`,
    ),
  };
}

function parseArtifactEligibilityReceipt(
  value: unknown,
  path: string,
): RealSourceArtifactEligibilityReceipt {
  const object = expectObject(
    value,
    path,
    receiptKeys([
      "bindingReceiptRef",
      "localProjectionGrantRef",
      "ownerAuthorityRef",
      "reviewReceiptRefs",
      "artifactClass",
      "outputBoundary",
      "state",
      "supersededBy",
    ]),
  );
  return {
    ...parseCatalogHeader(object, "artifact_eligibility_receipt", path),
    ...parseValidity(object, path),
    bindingReceiptRef: parseReference(
      object.bindingReceiptRef,
      "binding_receipt",
      `${path}/bindingReceiptRef`,
    ),
    localProjectionGrantRef: parseReference(
      object.localProjectionGrantRef,
      "operation_grant",
      `${path}/localProjectionGrantRef`,
    ),
    ownerAuthorityRef: parseReference(
      object.ownerAuthorityRef,
      "authority_receipt",
      `${path}/ownerAuthorityRef`,
    ),
    reviewReceiptRefs: parseReferenceSet(
      object.reviewReceiptRefs,
      "review_receipt",
      `${path}/reviewReceiptRefs`,
      1,
      16,
    ),
    artifactClass: expectLiteral(
      object.artifactClass,
      "ignored_local_prerelease",
      `${path}/artifactClass`,
    ),
    outputBoundary: expectLiteral(
      object.outputBoundary,
      "isolated_from_default_and_public",
      `${path}/outputBoundary`,
    ),
    state: expectEnum(
      object.state,
      ["eligible", "revoked", "superseded"] as const,
      `${path}/state`,
    ),
    supersededBy: parseNullableReference(
      object.supersededBy,
      "artifact_eligibility_receipt",
      `${path}/supersededBy`,
    ),
  };
}

function parseCoverageStages(
  value: unknown,
  path: string,
): RealSourceCoverageStages {
  const object = expectObject(value, path, [
    "documented",
    "selected",
    "attempted",
    "received",
    "validated",
    "emitted",
    "omitted",
    "claimed",
  ]);
  const stages: RealSourceCoverageStages = {
    documented: expectCount(object.documented, `${path}/documented`),
    selected: expectCount(object.selected, `${path}/selected`),
    attempted: expectCount(object.attempted, `${path}/attempted`),
    received: expectCount(object.received, `${path}/received`),
    validated: expectCount(object.validated, `${path}/validated`),
    emitted: expectCount(object.emitted, `${path}/emitted`),
    omitted: expectCount(object.omitted, `${path}/omitted`),
    claimed: expectCount(object.claimed, `${path}/claimed`),
  };
  if (
    stages.selected > stages.documented ||
    stages.attempted > stages.selected ||
    stages.received > stages.attempted ||
    stages.validated > stages.received ||
    stages.emitted > stages.validated ||
    stages.claimed > stages.emitted ||
    stages.omitted !== stages.selected - stages.emitted
  ) {
    fail(
      "INVALID_COVERAGE_ALGEBRA",
      path,
      "coverage stage counts are not monotone and reconciled",
    );
  }
  return stages;
}

function parseCoverageReceipt(
  value: unknown,
  path: string,
): RealSourceCoverageReceipt {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "contentDigest",
    "synthetic",
    "scopeRef",
    "issuedByAuthorityRef",
    "operation",
    "operationGrantRef",
    "admissionReceiptRef",
    "activationReceiptRef",
    "bindingReceiptRef",
    "requestPlanRef",
    "requestDigest",
    "evidenceDigest",
    "observedAt",
    "resultState",
    "revisionRef",
    "stages",
    "completeness",
    "absenceInference",
  ]);
  const resultState = expectEnum(
    object.resultState,
    ["not_attempted", "successful", "failed", "partial"] as const,
    `${path}/resultState`,
  );
  const stages = parseCoverageStages(object.stages, `${path}/stages`);
  const revisionRef =
    object.revisionRef === null
      ? null
      : parseDigestedReference(object.revisionRef, `${path}/revisionRef`);
  if (
    (resultState === "failed" || resultState === "partial") &&
    (stages.validated !== 0 || stages.emitted !== 0 || stages.claimed !== 0)
  ) {
    fail(
      "PARTIAL_EMISSION",
      `${path}/stages`,
      "failed or partial retrieval cannot validate, emit, or claim records",
    );
  }
  if (
    resultState === "not_attempted" &&
    (stages.attempted !== 0 ||
      stages.received !== 0 ||
      stages.validated !== 0 ||
      stages.emitted !== 0 ||
      stages.claimed !== 0)
  ) {
    fail(
      "UNATTEMPTED_EMISSION",
      `${path}/stages`,
      "unattempted retrieval has no downstream counts",
    );
  }
  if (
    resultState === "successful" &&
    (stages.selected === 0 || stages.attempted !== stages.selected)
  ) {
    fail(
      "INVALID_COVERAGE_ALGEBRA",
      `${path}/stages`,
      "successful retrieval must attempt its selected set",
    );
  }
  const hasValidatedEmission =
    resultState === "successful" && stages.validated > 0 && stages.emitted > 0;
  if (hasValidatedEmission !== (revisionRef !== null)) {
    fail(
      "INVALID_COVERAGE_REVISION",
      `${path}/revisionRef`,
      "a revision is required exactly for successful validated emission",
    );
  }
  return {
    ...parseCatalogHeader(object, "coverage_receipt", path),
    issuedByAuthorityRef: parseReference(
      object.issuedByAuthorityRef,
      "authority_receipt",
      `${path}/issuedByAuthorityRef`,
    ),
    operation: expectEnum(object.operation, OPERATIONS, `${path}/operation`),
    operationGrantRef: parseReference(
      object.operationGrantRef,
      "operation_grant",
      `${path}/operationGrantRef`,
    ),
    admissionReceiptRef: parseReference(
      object.admissionReceiptRef,
      "admission_receipt",
      `${path}/admissionReceiptRef`,
    ),
    activationReceiptRef: parseReference(
      object.activationReceiptRef,
      "activation_receipt",
      `${path}/activationReceiptRef`,
    ),
    bindingReceiptRef: parseReference(
      object.bindingReceiptRef,
      "binding_receipt",
      `${path}/bindingReceiptRef`,
    ),
    requestPlanRef: parseDigestedReference(
      object.requestPlanRef,
      `${path}/requestPlanRef`,
    ),
    requestDigest: expectDigest(object.requestDigest, `${path}/requestDigest`),
    evidenceDigest: expectDigest(
      object.evidenceDigest,
      `${path}/evidenceDigest`,
    ),
    observedAt: expectTimestamp(object.observedAt, `${path}/observedAt`),
    resultState,
    revisionRef,
    stages,
    completeness: expectLiteral(
      object.completeness,
      "bounded_non_comprehensive",
      `${path}/completeness`,
    ),
    absenceInference: expectLiteral(
      object.absenceInference,
      "forbidden",
      `${path}/absenceInference`,
    ),
  };
}

const HEALTH_SCOPES = [
  "source_contract",
  "acquisition_operation",
  "selected_range",
] as const satisfies readonly RealSourceHealthScope[];

function parseHealthReceipt(
  value: unknown,
  path: string,
): RealSourceHealthReceipt {
  const object = expectObject(
    value,
    path,
    receiptKeys([
      "healthScope",
      "issuedByAuthorityRef",
      "evidenceDigest",
      "observedAt",
      "state",
      "coverageReceiptRef",
    ]),
  );
  const interval = parseValidity(object, path);
  const observedAt = expectTimestamp(object.observedAt, `${path}/observedAt`);
  assertTimeWithin(observedAt, interval, `${path}/observedAt`);
  return {
    ...parseCatalogHeader(object, "health_receipt", path),
    ...interval,
    healthScope: expectEnum(
      object.healthScope,
      HEALTH_SCOPES,
      `${path}/healthScope`,
    ),
    issuedByAuthorityRef: parseReference(
      object.issuedByAuthorityRef,
      "authority_receipt",
      `${path}/issuedByAuthorityRef`,
    ),
    evidenceDigest: expectDigest(
      object.evidenceDigest,
      `${path}/evidenceDigest`,
    ),
    observedAt,
    state: expectEnum(
      object.state,
      ["healthy", "degraded", "failed", "unavailable", "unknown"] as const,
      `${path}/state`,
    ),
    coverageReceiptRef:
      object.coverageReceiptRef === null
        ? null
        : parseReference(
            object.coverageReceiptRef,
            "coverage_receipt",
            `${path}/coverageReceiptRef`,
          ),
  };
}

function parseLkgReceipt(value: unknown, path: string): RealSourceLkgReceipt {
  const object = expectObject(
    value,
    path,
    receiptKeys([
      "revisionRef",
      "manifestDigest",
      "issuedByAuthorityRef",
      "reviewReceiptRefs",
      "createdAt",
      "validatedAt",
      "validationState",
      "coverageReceiptRef",
      "healthReceiptRef",
      "lineage",
      "state",
      "supersededBy",
    ]),
  );
  const interval = parseValidity(object, path);
  const createdAt = expectTimestamp(object.createdAt, `${path}/createdAt`);
  const validatedAt = expectTimestamp(
    object.validatedAt,
    `${path}/validatedAt`,
  );
  assertTimeWithin(createdAt, interval, `${path}/createdAt`);
  assertTimeWithin(validatedAt, interval, `${path}/validatedAt`);
  if (timestampValue(validatedAt) < timestampValue(createdAt)) {
    fail(
      "INVALID_LKG_TIME",
      `${path}/validatedAt`,
      "validation precedes revision creation",
    );
  }
  const lineage = expectObject(object.lineage, `${path}/lineage`, [
    "kind",
    "predecessorRef",
  ]);
  const lineageKind = expectEnum(
    lineage.kind,
    ["genesis", "successor"] as const,
    `${path}/lineage/kind`,
  );
  const predecessorRef =
    lineageKind === "genesis"
      ? expectLiteral(
          lineage.predecessorRef,
          null,
          `${path}/lineage/predecessorRef`,
        )
      : parseReference(
          lineage.predecessorRef,
          "lkg_receipt",
          `${path}/lineage/predecessorRef`,
        );
  return {
    ...parseCatalogHeader(object, "lkg_receipt", path),
    ...interval,
    revisionRef: parseDigestedReference(
      object.revisionRef,
      `${path}/revisionRef`,
    ),
    manifestDigest: expectDigest(
      object.manifestDigest,
      `${path}/manifestDigest`,
    ),
    issuedByAuthorityRef: parseReference(
      object.issuedByAuthorityRef,
      "authority_receipt",
      `${path}/issuedByAuthorityRef`,
    ),
    reviewReceiptRefs: parseReferenceSet(
      object.reviewReceiptRefs,
      "review_receipt",
      `${path}/reviewReceiptRefs`,
      1,
      16,
    ),
    createdAt,
    validatedAt,
    validationState: expectLiteral(
      object.validationState,
      "fully_validated",
      `${path}/validationState`,
    ),
    coverageReceiptRef: parseReference(
      object.coverageReceiptRef,
      "coverage_receipt",
      `${path}/coverageReceiptRef`,
    ),
    healthReceiptRef: parseReference(
      object.healthReceiptRef,
      "health_receipt",
      `${path}/healthReceiptRef`,
    ),
    lineage:
      lineageKind === "genesis"
        ? { kind: "genesis", predecessorRef: null }
        : {
            kind: "successor",
            predecessorRef:
              predecessorRef as RealSourceReference<"lkg_receipt">,
          },
    state: expectEnum(
      object.state,
      ["eligible", "revoked", "superseded"] as const,
      `${path}/state`,
    ),
    supersededBy: parseNullableReference(
      object.supersededBy,
      "lkg_receipt",
      `${path}/supersededBy`,
    ),
  };
}

function parseCatalog<T>(
  value: unknown,
  path: string,
  maximum: number,
  parser: (entry: unknown, entryPath: string) => T,
  minimum = 0,
): readonly T[] {
  return expectArray(value, path, minimum, maximum).map((entry, index) =>
    parser(entry, `${path}/${index}`),
  );
}

type CatalogMember =
  | RealSourceAuthorityReceipt
  | RealSourceEvidenceReceipt
  | RealSourceReviewReceipt
  | RealSourceOperationGrant
  | RealSourceQualificationReceipt
  | RealSourceAdmissionReceipt
  | RealSourceActivationReceipt
  | RealSourceBindingReceipt
  | RealSourceArtifactEligibilityReceipt
  | RealSourceCoverageReceipt
  | RealSourceHealthReceipt
  | RealSourceLkgReceipt;

type Catalogs = ReadonlyMap<string, CatalogMember>;

function resolveMember<Kind extends RealSourceCatalogKind>(
  catalogs: Catalogs,
  reference: RealSourceReference<Kind>,
  kind: Kind,
  path: string,
): Extract<CatalogMember, { readonly kind: Kind }> {
  const member = catalogs.get(refKey(reference));
  if (member === undefined) {
    fail(
      "UNKNOWN_REFERENCE",
      path,
      "reference does not resolve in the closed bundle",
    );
  }
  if (member.kind !== kind) {
    fail(
      "CROSS_KIND_REFERENCE",
      path,
      "reference resolves to the wrong receipt kind",
    );
  }
  if (member.contentDigest !== reference.contentDigest) {
    fail(
      "CONTENT_DIGEST_MISMATCH",
      path,
      "reference digest does not match the resolved receipt",
    );
  }
  return member as Extract<CatalogMember, { readonly kind: Kind }>;
}

function requireAuthorityRole(
  catalogs: Catalogs,
  reference: RealSourceReference<"authority_receipt">,
  expected: RealSourceAuthorityRole | ReadonlySet<RealSourceAuthorityRole>,
  path: string,
): RealSourceAuthorityReceipt {
  const authority = resolveMember(
    catalogs,
    reference,
    "authority_receipt",
    path,
  );
  const accepted =
    typeof expected === "string"
      ? authority.authorityRole === expected
      : expected.has(authority.authorityRole);
  if (!accepted) {
    fail(
      "INVALID_AUTHORITY_ROLE",
      path,
      "authority role does not authorize this claim class",
    );
  }
  return authority;
}

function requireAuthorityRoleAt(
  catalogs: Catalogs,
  reference: RealSourceReference<"authority_receipt">,
  expected: RealSourceAuthorityRole | ReadonlySet<RealSourceAuthorityRole>,
  at: string,
  path: string,
): RealSourceAuthorityReceipt {
  const authority = requireAuthorityRole(catalogs, reference, expected, path);
  if (!wasUsableAt(catalogs, authority, "accepted", at)) {
    fail(
      "AUTHORITY_NOT_CURRENT_AT_EVENT",
      path,
      "authority was not accepted and current at the decisive event",
    );
  }
  return authority;
}

function requireScopeRef(
  member: CatalogMember,
  scope: RealSourceLifecycleScope,
  path: string,
): void {
  if (!sameRef(member.scopeRef, scope)) {
    fail(
      "CROSS_SCOPE_REFERENCE",
      `${path}/scopeRef`,
      "receipt is outside the exact lifecycle scope",
    );
  }
}

type Supersedable = {
  readonly id: string;
  readonly version: string;
  readonly kind: RealSourceCatalogKind;
  readonly contentDigest: string;
  readonly scopeRef: VersionedReference & { readonly kind: "lifecycle_scope" };
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly state: string;
  readonly supersededBy: RealSourceReference | null;
};

function wasUsableAt(
  catalogs: Catalogs,
  value: Supersedable,
  positiveState: string,
  at: string,
): boolean {
  const eventTime = timestampValue(at);
  if (
    timestampValue(value.issuedAt) > eventTime ||
    eventTime >= timestampValue(value.expiresAt)
  ) {
    return false;
  }
  if (value.state === positiveState) {
    return true;
  }
  if (value.state !== "superseded" || value.supersededBy === null) {
    return false;
  }
  const successor = catalogs.get(refKey(value.supersededBy));
  return (
    successor !== undefined &&
    successor.kind === value.kind &&
    successor.contentDigest === value.supersededBy.contentDigest &&
    "issuedAt" in successor &&
    timestampValue(successor.issuedAt) > eventTime
  );
}

function supersessionAxis(value: Supersedable): string {
  const member = value as unknown as CatalogMember;
  switch (member.kind) {
    case "authority_receipt":
      return encodeCanonical([
        member.kind,
        member.authorityRole,
      ] as unknown as JsonValue);
    case "evidence_receipt":
      return member.evidenceClass === "residual_risk_decision"
        ? encodeCanonical([
            member.kind,
            member.evidenceClass,
            member.riskKind,
          ] as unknown as JsonValue)
        : encodeCanonical([
            member.kind,
            member.evidenceClass,
          ] as unknown as JsonValue);
    case "review_receipt":
      return encodeCanonical([
        member.kind,
        member.reviewKind,
        member.subject.kind,
        refKey(member.subject.ref),
      ] as unknown as JsonValue);
    case "operation_grant":
      return encodeCanonical([
        member.kind,
        member.operation,
      ] as unknown as JsonValue);
    case "admission_receipt":
      return encodeCanonical([
        member.kind,
        refKey(member.qualificationReceiptRef),
      ] as unknown as JsonValue);
    case "activation_receipt":
      return encodeCanonical([
        member.kind,
        refKey(member.admissionReceiptRef),
      ] as unknown as JsonValue);
    case "binding_receipt":
      return encodeCanonical([
        member.kind,
        refKey(member.activationReceiptRef),
      ] as unknown as JsonValue);
    case "artifact_eligibility_receipt":
      return encodeCanonical([
        member.kind,
        member.artifactClass,
        member.outputBoundary,
      ] as unknown as JsonValue);
    case "lkg_receipt":
      return encodeCanonical([
        member.kind,
        member.revisionRef.id,
      ] as unknown as JsonValue);
    default:
      return member.kind;
  }
}

function validateSupersession(
  values: readonly Supersedable[],
  catalogs: Catalogs,
  path: string,
): void {
  const incoming = new Map<string, number>();
  for (const [index, value] of values.entries()) {
    const isSuperseded = value.state === "superseded";
    if (isSuperseded !== (value.supersededBy !== null)) {
      fail(
        "INVALID_SUPERSESSION",
        `${path}/${index}/supersededBy`,
        "supersession state and reference disagree",
      );
    }
    if (value.supersededBy === null) {
      continue;
    }
    const successor = catalogs.get(refKey(value.supersededBy));
    if (
      successor === undefined ||
      successor.kind !== value.kind ||
      !("issuedAt" in successor) ||
      !("state" in successor) ||
      !("supersededBy" in successor)
    ) {
      fail(
        "INVALID_SUPERSESSION",
        `${path}/${index}/supersededBy`,
        "successor does not resolve to the same receipt kind",
      );
    }
    if (successor.contentDigest !== value.supersededBy.contentDigest) {
      fail(
        "INVALID_SUPERSESSION",
        `${path}/${index}/supersededBy`,
        "successor reference does not bind the exact successor content digest",
      );
    }
    if (
      !sameRef(successor.scopeRef, value.scopeRef) ||
      timestampValue(successor.issuedAt) <= timestampValue(value.issuedAt) ||
      supersessionAxis(successor as Supersedable) !== supersessionAxis(value)
    ) {
      fail(
        "INVALID_SUPERSESSION",
        `${path}/${index}/supersededBy`,
        "successor is not later in the exact same scope",
      );
    }
    const successorKey = refKey(successor);
    incoming.set(successorKey, (incoming.get(successorKey) ?? 0) + 1);
    const visited = new Set<string>([refKey(value)]);
    let cursor: Supersedable | null = successor as Supersedable;
    while (cursor !== null) {
      const key = refKey(cursor);
      if (visited.has(key)) {
        fail(
          "SUPERSESSION_CYCLE",
          `${path}/${index}/supersededBy`,
          "supersession cycle is rejected",
        );
      }
      visited.add(key);
      if (cursor.supersededBy === null) {
        cursor = null;
      } else {
        const next = catalogs.get(refKey(cursor.supersededBy));
        cursor =
          next !== undefined &&
          "issuedAt" in next &&
          "state" in next &&
          "supersededBy" in next
            ? (next as Supersedable)
            : null;
      }
    }
  }
  if ([...incoming.values()].some((count) => count > 1)) {
    fail(
      "INVALID_SUPERSESSION",
      path,
      "a receipt cannot have multiple supersession predecessors",
    );
  }
}

function requireReviewsForSubject(
  catalogs: Catalogs,
  references: readonly RealSourceReference<"review_receipt">[],
  subject: CatalogMember,
  path: string,
  requiredKinds: readonly RealSourceReviewKind[] = [],
): readonly RealSourceReviewReceipt[] {
  let subjectOwnerAuthorityRef: RealSourceReference<"authority_receipt">;
  switch (subject.kind) {
    case "qualification_receipt":
    case "coverage_receipt":
    case "health_receipt":
    case "lkg_receipt":
      subjectOwnerAuthorityRef = subject.issuedByAuthorityRef;
      break;
    case "operation_grant":
    case "admission_receipt":
    case "activation_receipt":
    case "binding_receipt":
    case "artifact_eligibility_receipt":
      subjectOwnerAuthorityRef = subject.ownerAuthorityRef;
      break;
    default:
      fail(
        "INVALID_REVIEW_SUBJECT",
        path,
        "receipt kind is not eligible for a decisive review",
      );
  }
  const reviews = references.map((reference, index) => {
    const review = resolveMember(
      catalogs,
      reference,
      "review_receipt",
      `${path}/${index}`,
    );
    if (
      review.subject.kind !== subject.kind ||
      !sameRef(review.subject.ref, subject)
    ) {
      fail(
        "CROSS_SUBJECT_REFERENCE",
        `${path}/${index}`,
        "review does not bind this exact receipt",
      );
    }
    if (!sameRef(review.ownerAuthorityRef, subjectOwnerAuthorityRef)) {
      fail(
        "OWNER_AUTHORITY_MISMATCH",
        `${path}/${index}`,
        "review does not bind the subject's exact owner authority",
      );
    }
    return review;
  });
  const kinds = new Set(reviews.map(({ reviewKind }) => reviewKind));
  if (requiredKinds.some((kind) => !kinds.has(kind))) {
    fail(
      "MISSING_REQUIRED_REVIEW",
      path,
      "receipt lacks a required typed review",
    );
  }
  return reviews;
}

function reviewSubjectTime(subject: CatalogMember): string {
  if (subject.kind === "coverage_receipt") {
    return subject.observedAt;
  }
  if (subject.kind === "health_receipt") {
    return timestampValue(subject.observedAt) > timestampValue(subject.issuedAt)
      ? subject.observedAt
      : subject.issuedAt;
  }
  if (subject.kind === "lkg_receipt") {
    return timestampValue(subject.validatedAt) >
      timestampValue(subject.issuedAt)
      ? subject.validatedAt
      : subject.issuedAt;
  }
  if ("issuedAt" in subject && typeof subject.issuedAt === "string") {
    return subject.issuedAt;
  }
  fail(
    "INVALID_REVIEW_SUBJECT",
    "/reviewReceipts",
    "review subject has no authoritative event time",
  );
}

function projectControlTarget(
  scope: RealSourceLifecycleScope,
  kind: RealSourceProjectControlEvidence["controlKind"],
): RealSourceDigestedReference {
  switch (kind) {
    case "field_allowlist":
      return scope.fieldPolicyRef;
    case "selected_range":
      return scope.selectedRange;
    case "request_plan":
    case "request_budget":
    case "concurrency_limit":
    case "time_limit":
    case "byte_limit":
    case "no_automatic_retry":
      return scope.requestPlan;
    case "source_registry":
      return scope.source.sourceRegistryRef;
    case "source_registry_entry":
      return scope.source.sourceRegistryEntryRef;
    case "deployment_scope":
      return scope.deploymentRef;
    case "region_scope":
      return scope.regionPackRef;
    case "persona_scope":
      return scope.personaProjectionRef;
    case "output_scope":
      return scope.outputAdapterRef;
    case "artifact_isolation":
      return scope.artifactBoundaryRef;
    case "parser_fail_closed":
      return scope.transformRef;
    case "drift_policy":
    case "lkg_retention":
      return scope.contractRef;
  }
}

function maxTimestamp(...values: readonly string[]): string {
  return values.reduce((latest, value) =>
    timestampValue(value) > timestampValue(latest) ? value : latest,
  );
}

function reviewEffectiveAt(
  catalogs: Catalogs,
  references: readonly RealSourceReference<"review_receipt">[],
  issuedAt: string,
): string {
  return maxTimestamp(
    issuedAt,
    ...references.map(
      (reference) =>
        resolveMember(catalogs, reference, "review_receipt", "/").reviewedAt,
    ),
  );
}

function decisiveEffectiveAt(
  catalogs: Catalogs,
  member:
    | RealSourceOperationGrant
    | RealSourceQualificationReceipt
    | RealSourceAdmissionReceipt
    | RealSourceActivationReceipt
    | RealSourceBindingReceipt
    | RealSourceArtifactEligibilityReceipt,
): string {
  const reviewed = reviewEffectiveAt(
    catalogs,
    member.reviewReceiptRefs,
    member.issuedAt,
  );
  switch (member.kind) {
    case "operation_grant":
    case "qualification_receipt":
      return reviewed;
    case "admission_receipt": {
      const qualification = resolveMember(
        catalogs,
        member.qualificationReceiptRef,
        "qualification_receipt",
        "/",
      );
      const risks = member.residualRiskEvidenceRefs.map((reference) => {
        const risk = resolveMember(
          catalogs,
          reference,
          "evidence_receipt",
          "/",
        );
        return risk.evidenceClass === "residual_risk_decision"
          ? risk.acceptedAt
          : member.issuedAt;
      });
      return maxTimestamp(
        reviewed,
        decisiveEffectiveAt(catalogs, qualification),
        ...risks,
      );
    }
    case "activation_receipt": {
      const admission = resolveMember(
        catalogs,
        member.admissionReceiptRef,
        "admission_receipt",
        "/",
      );
      return maxTimestamp(
        reviewed,
        decisiveEffectiveAt(catalogs, admission),
        ...member.operationGrantRefs.map((reference) =>
          decisiveEffectiveAt(
            catalogs,
            resolveMember(catalogs, reference, "operation_grant", "/"),
          ),
        ),
      );
    }
    case "binding_receipt":
      return maxTimestamp(
        reviewed,
        decisiveEffectiveAt(
          catalogs,
          resolveMember(
            catalogs,
            member.activationReceiptRef,
            "activation_receipt",
            "/",
          ),
        ),
      );
    case "artifact_eligibility_receipt":
      return maxTimestamp(
        reviewed,
        decisiveEffectiveAt(
          catalogs,
          resolveMember(
            catalogs,
            member.bindingReceiptRef,
            "binding_receipt",
            "/",
          ),
        ),
        decisiveEffectiveAt(
          catalogs,
          resolveMember(
            catalogs,
            member.localProjectionGrantRef,
            "operation_grant",
            "/",
          ),
        ),
      );
  }
}

function decisiveReceiptUsableAt(
  catalogs: Catalogs,
  member:
    | RealSourceOperationGrant
    | RealSourceQualificationReceipt
    | RealSourceAdmissionReceipt
    | RealSourceActivationReceipt
    | RealSourceBindingReceipt
    | RealSourceArtifactEligibilityReceipt,
  positiveState: string,
  asOf: string,
): boolean {
  if (
    timestampValue(decisiveEffectiveAt(catalogs, member)) >
      timestampValue(asOf) ||
    !wasUsableAt(catalogs, member, positiveState, asOf) ||
    !reviewsAreCurrent(catalogs, member.reviewReceiptRefs, asOf)
  ) {
    return false;
  }
  const authorityRef =
    member.kind === "qualification_receipt"
      ? member.issuedByAuthorityRef
      : member.ownerAuthorityRef;
  if (!ownerIsCurrent(catalogs, authorityRef, asOf)) {
    return false;
  }
  switch (member.kind) {
    case "qualification_receipt":
      return member.providerFactEvidenceRefs.every((reference) => {
        const evidence = resolveMember(
          catalogs,
          reference,
          "evidence_receipt",
          "/",
        );
        return (
          evidence.evidenceClass === "provider_fact" &&
          authorityIsCurrent(
            catalogs,
            evidence.authorityReceiptRef,
            resolveMember(
              catalogs,
              evidence.authorityReceiptRef,
              "authority_receipt",
              "/",
            ).authorityRole,
            asOf,
          )
        );
      });
    case "admission_receipt":
      return (
        decisiveReceiptUsableAt(
          catalogs,
          resolveMember(
            catalogs,
            member.qualificationReceiptRef,
            "qualification_receipt",
            "/",
          ),
          "qualified",
          asOf,
        ) &&
        member.residualRiskEvidenceRefs.every((reference) => {
          const risk = resolveMember(
            catalogs,
            reference,
            "evidence_receipt",
            "/",
          );
          return (
            risk.evidenceClass === "residual_risk_decision" &&
            timestampValue(risk.acceptedAt) <= timestampValue(asOf) &&
            wasUsableAt(catalogs, risk, "accepted", asOf) &&
            ownerIsCurrent(catalogs, risk.ownerAuthorityRef, asOf)
          );
        })
      );
    case "activation_receipt": {
      const admission = resolveMember(
        catalogs,
        member.admissionReceiptRef,
        "admission_receipt",
        "/",
      );
      return (
        decisiveReceiptUsableAt(catalogs, admission, "admitted", asOf) &&
        member.operationGrantRefs.every((reference) =>
          decisiveReceiptUsableAt(
            catalogs,
            resolveMember(catalogs, reference, "operation_grant", "/"),
            "granted",
            asOf,
          ),
        )
      );
    }
    case "binding_receipt":
      return decisiveReceiptUsableAt(
        catalogs,
        resolveMember(
          catalogs,
          member.activationReceiptRef,
          "activation_receipt",
          "/",
        ),
        "active",
        asOf,
      );
    case "artifact_eligibility_receipt":
      return (
        decisiveReceiptUsableAt(
          catalogs,
          resolveMember(
            catalogs,
            member.bindingReceiptRef,
            "binding_receipt",
            "/",
          ),
          "bound",
          asOf,
        ) &&
        decisiveReceiptUsableAt(
          catalogs,
          resolveMember(
            catalogs,
            member.localProjectionGrantRef,
            "operation_grant",
            "/",
          ),
          "granted",
          asOf,
        )
      );
    default:
      return true;
  }
}

function validateLocalGraph(bundle: RealSourceLifecycleBundle): Catalogs {
  const groups = [
    bundle.authorityReceipts,
    bundle.evidenceReceipts,
    bundle.reviewReceipts,
    bundle.operationGrants,
    bundle.qualificationReceipts,
    bundle.admissionReceipts,
    bundle.activationReceipts,
    bundle.bindingReceipts,
    bundle.artifactEligibilityReceipts,
    bundle.coverageReceipts,
    bundle.healthReceipts,
    bundle.lkgReceipts,
  ] as const;
  const members = groups.flat() as readonly CatalogMember[];
  const catalogs = new Map<string, CatalogMember>();
  verifyContentDigest(bundle.scope, "/scope");
  for (const member of members) {
    verifyMemberContentDigest(member, "/");
    const key = refKey(member);
    if (catalogs.has(key)) {
      fail("DUPLICATE_IDENTITY", "/", "catalog identity occurs more than once");
    }
    catalogs.set(key, member);
    requireScopeRef(member, bundle.scope, "/");
    if (member.synthetic !== false) {
      fail(
        "INVALID_REAL_TRUST",
        "/",
        "synthetic receipt is rejected from the real trust domain",
      );
    }
  }
  const authoritySetDigest = sha256Text(
    encodeCanonical(
      bundle.authorityReceipts
        .map(({ contentDigest }) => contentDigest)
        .sort(compareText) as unknown as JsonValue,
    ),
  );
  if (authoritySetDigest !== bundle.scope.authoritySetDigest) {
    fail(
      "AUTHORITY_SET_DIGEST_MISMATCH",
      "/scope/authoritySetDigest",
      "authority receipt set does not match the scoped digest",
    );
  }

  const revisionDigests = new Map<string, string>();
  for (const [index, coverage] of bundle.coverageReceipts.entries()) {
    if (coverage.revisionRef !== null) {
      registerStableDigestedReference(
        revisionDigests,
        coverage.revisionRef,
        `/coverageReceipts/${index}/revisionRef`,
        "normalized revision",
      );
    }
  }
  for (const [index, lkg] of bundle.lkgReceipts.entries()) {
    registerStableDigestedReference(
      revisionDigests,
      lkg.revisionRef,
      `/lkgReceipts/${index}/revisionRef`,
      "normalized revision",
    );
  }

  validateSupersession(
    bundle.authorityReceipts,
    catalogs,
    "/authorityReceipts",
  );
  validateSupersession(
    bundle.evidenceReceipts.filter(
      (receipt): receipt is RealSourceResidualRiskEvidence =>
        receipt.evidenceClass === "residual_risk_decision",
    ),
    catalogs,
    "/evidenceReceipts",
  );
  validateSupersession(bundle.reviewReceipts, catalogs, "/reviewReceipts");
  validateSupersession(bundle.operationGrants, catalogs, "/operationGrants");
  validateSupersession(
    bundle.qualificationReceipts,
    catalogs,
    "/qualificationReceipts",
  );
  validateSupersession(
    bundle.admissionReceipts,
    catalogs,
    "/admissionReceipts",
  );
  validateSupersession(
    bundle.activationReceipts,
    catalogs,
    "/activationReceipts",
  );
  validateSupersession(bundle.bindingReceipts, catalogs, "/bindingReceipts");
  validateSupersession(
    bundle.artifactEligibilityReceipts,
    catalogs,
    "/artifactEligibilityReceipts",
  );
  validateSupersession(bundle.lkgReceipts, catalogs, "/lkgReceipts");

  for (const [index, evidence] of bundle.evidenceReceipts.entries()) {
    const path = `/evidenceReceipts/${index}`;
    if (evidence.evidenceClass === "provider_fact") {
      requireAuthorityRoleAt(
        catalogs,
        evidence.authorityReceiptRef,
        PROVIDER_FACT_AUTHORITY_ROLES[evidence.factKind],
        evidence.accessedAt,
        `${path}/authorityReceiptRef`,
      );
    } else if (evidence.evidenceClass === "dated_observation") {
      if (
        evidence.operation === bundle.scope.requestPlan.operation &&
        evidence.requestDigest !== bundle.scope.requestPlan.digest
      ) {
        fail(
          "REQUEST_PLAN_MISMATCH",
          `${path}/requestDigest`,
          "acquisition observation does not bind the exact scoped request plan",
        );
      }
    } else if (evidence.evidenceClass === "residual_risk_decision") {
      requireAuthorityRoleAt(
        catalogs,
        evidence.ownerAuthorityRef,
        "owner_configuration_authority",
        evidence.issuedAt,
        `${path}/ownerAuthorityRef`,
      );
      requireAuthorityRoleAt(
        catalogs,
        evidence.ownerAuthorityRef,
        "owner_configuration_authority",
        evidence.acceptedAt,
        `${path}/ownerAuthorityRef`,
      );
      if (
        encodeCanonical(
          evidence.riskScope.fieldPolicyRef as unknown as JsonValue,
        ) !==
        encodeCanonical(bundle.scope.fieldPolicyRef as unknown as JsonValue)
      ) {
        fail(
          "CROSS_SCOPE_REFERENCE",
          `${path}/riskScope/fieldPolicyRef`,
          "risk acceptance widens the field policy",
        );
      }
      if (
        encodeCanonical(evidence.riskScope.hosts as unknown as JsonValue) !==
          encodeCanonical(
            bundle.scope.accessScope.hosts as unknown as JsonValue,
          ) ||
        encodeCanonical(evidence.riskScope.methods as unknown as JsonValue) !==
          encodeCanonical(
            bundle.scope.accessScope.methods as unknown as JsonValue,
          )
      ) {
        fail(
          "CROSS_SCOPE_REFERENCE",
          `${path}/riskScope`,
          "risk acceptance widens or changes host/method scope",
        );
      }
      for (const [
        refIndex,
        reference,
      ] of evidence.unknownEvidenceRefs.entries()) {
        const unknown = resolveMember(
          catalogs,
          reference,
          "evidence_receipt",
          `${path}/unknownEvidenceRefs/${refIndex}`,
        );
        if (
          unknown.evidenceClass !== "unknown" ||
          (unknown.unknownKind !== "api_specific_terms" &&
            unknown.unknownKind !== "api_specific_privacy") ||
          unknown.resolution !==
            "not_located_after_diligent_official_source_review" ||
          unknown.limitationCode !== "owner_risk_acceptance_required"
        ) {
          fail(
            "RISK_EVIDENCE_MISMATCH",
            `${path}/unknownEvidenceRefs/${refIndex}`,
            "risk decision binds only exact API terms or privacy unknowns",
          );
        }
        if (
          timestampValue(unknown.recordedAt) >
          timestampValue(evidence.acceptedAt)
        ) {
          fail(
            "FUTURE_EVIDENCE",
            `${path}/unknownEvidenceRefs/${refIndex}`,
            "risk acceptance cannot predate the exact unknown it accepts",
          );
        }
      }
    }
  }

  const reviewerRoles: Record<RealSourceReviewKind, RealSourceAuthorityRole> = {
    source_contract: "source_evidence_reviewer",
    source_evidence: "source_evidence_reviewer",
    sovereignty: "sovereignty_reviewer",
    security: "security_reviewer",
  };
  for (const [index, review] of bundle.reviewReceipts.entries()) {
    const path = `/reviewReceipts/${index}`;
    const subject = resolveMember(
      catalogs,
      review.subject.ref,
      review.subject.kind,
      `${path}/subject/ref`,
    );
    if (
      timestampValue(review.reviewedAt) <
      timestampValue(reviewSubjectTime(subject))
    ) {
      fail(
        "REVIEW_PRECEDES_SUBJECT",
        `${path}/reviewedAt`,
        "review cannot precede the exact subject evidence or issuance",
      );
    }
    const reviewerAuthority = requireAuthorityRoleAt(
      catalogs,
      review.reviewerAuthorityRef,
      reviewerRoles[review.reviewKind],
      review.reviewedAt,
      `${path}/reviewerAuthorityRef`,
    );
    const ownerAuthority = requireAuthorityRoleAt(
      catalogs,
      review.ownerAuthorityRef,
      "owner_configuration_authority",
      review.reviewedAt,
      `${path}/ownerAuthorityRef`,
    );
    if (
      sameRef(review.reviewerAuthorityRef, review.ownerAuthorityRef) ||
      reviewerAuthority.authorityIdentityRef.digest ===
        ownerAuthority.authorityIdentityRef.digest
    ) {
      fail(
        "REVIEWER_OWNER_IDENTITY_COLLISION",
        path,
        "reviewer identity must be distinct from owner configuration authority",
      );
    }
  }

  type IdentityTrustGroup =
    | "provider"
    | "owner"
    | "source_reviewer"
    | "sovereignty_reviewer"
    | "security_reviewer";
  const authorityTrustGroups: Record<
    RealSourceAuthorityRole,
    IdentityTrustGroup
  > = {
    originating_publisher: "provider",
    issuing_agency: "provider",
    official_edition_custodian: "provider",
    service_operator: "provider",
    owner_configuration_authority: "owner",
    source_evidence_reviewer: "source_reviewer",
    sovereignty_reviewer: "sovereignty_reviewer",
    security_reviewer: "security_reviewer",
  };
  const identityDigests = new Map<string, string>();
  const identityTrustGroups = new Map<string, IdentityTrustGroup>();
  const digestTrustGroups = new Map<string, IdentityTrustGroup>();
  for (const [index, authorityReceipt] of bundle.authorityReceipts.entries()) {
    const trustGroup = authorityTrustGroups[authorityReceipt.authorityRole];
    const identityKey = registerStableDigestedReference(
      identityDigests,
      authorityReceipt.authorityIdentityRef,
      `/authorityReceipts/${index}/authorityIdentityRef`,
      "authority identity",
    );
    const priorIdentityGroup = identityTrustGroups.get(identityKey);
    const priorDigestGroup = digestTrustGroups.get(
      authorityReceipt.authorityIdentityRef.digest,
    );
    if (
      (priorIdentityGroup !== undefined && priorIdentityGroup !== trustGroup) ||
      (priorDigestGroup !== undefined && priorDigestGroup !== trustGroup)
    ) {
      fail(
        "AUTHORITY_IDENTITY_COLLISION",
        `/authorityReceipts/${index}/authorityIdentityRef`,
        "owner and independent reviewer trust groups require identities distinct from each other and from providers",
      );
    }
    identityTrustGroups.set(identityKey, trustGroup);
    digestTrustGroups.set(
      authorityReceipt.authorityIdentityRef.digest,
      trustGroup,
    );
  }

  for (const [index, grant] of bundle.operationGrants.entries()) {
    const path = `/operationGrants/${index}`;
    if (!sameDigestedRef(grant.requestPlanRef, bundle.scope.requestPlan)) {
      fail(
        "REQUEST_PLAN_MISMATCH",
        `${path}/requestPlanRef`,
        "operation grant must bind the exact governing acquisition request plan",
      );
    }
    requireAuthorityRoleAt(
      catalogs,
      grant.ownerAuthorityRef,
      "owner_configuration_authority",
      grant.issuedAt,
      `${path}/ownerAuthorityRef`,
    );
    requireReviewsForSubject(
      catalogs,
      grant.reviewReceiptRefs,
      grant,
      `${path}/reviewReceiptRefs`,
    );
  }

  for (const [index, qualification] of bundle.qualificationReceipts.entries()) {
    const path = `/qualificationReceipts/${index}`;
    requireAuthorityRoleAt(
      catalogs,
      qualification.issuedByAuthorityRef,
      "owner_configuration_authority",
      qualification.issuedAt,
      `${path}/issuedByAuthorityRef`,
    );
    const providerFacts = qualification.providerFactEvidenceRefs.map(
      (reference, refIndex) => {
        const evidence = resolveMember(
          catalogs,
          reference,
          "evidence_receipt",
          `${path}/providerFactEvidenceRefs/${refIndex}`,
        );
        if (evidence.evidenceClass !== "provider_fact") {
          fail(
            "EVIDENCE_CLASS_MISMATCH",
            `${path}/providerFactEvidenceRefs/${refIndex}`,
            "project evidence cannot become a provider fact",
          );
        }
        return evidence;
      },
    );
    if (
      providerFacts.some(
        ({ accessedAt }) =>
          timestampValue(accessedAt) > timestampValue(qualification.issuedAt),
      )
    ) {
      fail(
        "FUTURE_EVIDENCE",
        `${path}/providerFactEvidenceRefs`,
        "qualification cannot cite provider evidence obtained after issuance",
      );
    }
    const requiredFacts: readonly RealSourceProviderFactEvidence["factKind"][] =
      [
        "source_identity",
        "official_status",
        "field_meaning",
        "rendition_custody",
        "access_requirement",
        "reproduction_right",
      ];
    const factKinds = new Set(providerFacts.map(({ factKind }) => factKind));
    if (requiredFacts.some((kind) => !factKinds.has(kind))) {
      fail(
        "MISSING_PROVIDER_FACT",
        `${path}/providerFactEvidenceRefs`,
        "qualification lacks a required provider-established fact",
      );
    }
    if (
      !providerFacts.some(
        (evidence) =>
          evidence.factKind === "access_requirement" &&
          evidence.accessState === "credentials_not_required",
      ) ||
      bundle.evidenceReceipts.some(
        (evidence) =>
          evidence.evidenceClass === "provider_fact" &&
          evidence.factKind === "access_requirement" &&
          evidence.accessState === "credentials_required",
      )
    ) {
      fail(
        "AUTHENTICATION_NOT_CLOSED",
        `${path}/providerFactEvidenceRefs`,
        "qualification requires exact provider evidence of credential-free access",
      );
    }
    if (
      bundle.evidenceReceipts.some(
        (evidence) =>
          evidence.evidenceClass === "provider_fact" &&
          evidence.factKind === "affirmative_restriction" &&
          evidence.restrictionState === "incompatible",
      )
    ) {
      fail(
        "INCOMPATIBLE_PROVIDER_RESTRICTION",
        `${path}/providerFactEvidenceRefs`,
        "an in-scope affirmative restriction blocks qualification",
      );
    }
    const projectControls = qualification.projectControlEvidenceRefs.map(
      (reference, refIndex) => {
        const evidence = resolveMember(
          catalogs,
          reference,
          "evidence_receipt",
          `${path}/projectControlEvidenceRefs/${refIndex}`,
        );
        if (evidence.evidenceClass !== "project_control") {
          fail(
            "EVIDENCE_CLASS_MISMATCH",
            `${path}/projectControlEvidenceRefs/${refIndex}`,
            "provider facts and observations cannot become project controls",
          );
        }
        return evidence;
      },
    );
    if (
      projectControls.some(
        ({ documentedAt }) =>
          timestampValue(documentedAt) > timestampValue(qualification.issuedAt),
      )
    ) {
      fail(
        "FUTURE_EVIDENCE",
        `${path}/projectControlEvidenceRefs`,
        "qualification cannot cite a control documented after issuance",
      );
    }
    const requiredControls: readonly RealSourceProjectControlEvidence["controlKind"][] =
      [
        "field_allowlist",
        "selected_range",
        "request_budget",
        "concurrency_limit",
        "time_limit",
        "byte_limit",
        "no_automatic_retry",
        "parser_fail_closed",
        "drift_policy",
        "lkg_retention",
        "artifact_isolation",
        "request_plan",
        "source_registry",
        "source_registry_entry",
        "deployment_scope",
        "region_scope",
        "persona_scope",
        "output_scope",
      ];
    const controlKinds = new Set(
      projectControls.map(({ controlKind }) => controlKind),
    );
    if (requiredControls.some((kind) => !controlKinds.has(kind))) {
      fail(
        "MISSING_PROJECT_CONTROL",
        `${path}/projectControlEvidenceRefs`,
        "qualification lacks a required fail-closed control",
      );
    }
    if (
      projectControls.length !== requiredControls.length ||
      controlKinds.size !== requiredControls.length
    ) {
      fail(
        "MISSING_PROJECT_CONTROL",
        `${path}/projectControlEvidenceRefs`,
        "qualification must bind exactly one receipt for each required control",
      );
    }
    for (const [controlIndex, control] of projectControls.entries()) {
      if (
        !sameDigestedRef(
          control.controlRef,
          projectControlTarget(bundle.scope, control.controlKind),
        )
      ) {
        fail(
          "PROJECT_CONTROL_SCOPE_MISMATCH",
          `${path}/projectControlEvidenceRefs/${controlIndex}`,
          "project control does not bind its exact scoped policy or request bytes",
        );
      }
    }
    for (const [
      refIndex,
      reference,
    ] of qualification.unknownEvidenceRefs.entries()) {
      const evidence = resolveMember(
        catalogs,
        reference,
        "evidence_receipt",
        `${path}/unknownEvidenceRefs/${refIndex}`,
      );
      if (evidence.evidenceClass !== "unknown") {
        fail(
          "EVIDENCE_CLASS_MISMATCH",
          `${path}/unknownEvidenceRefs/${refIndex}`,
          "only explicit unknown evidence belongs in the unknown set",
        );
      }
      if (
        timestampValue(evidence.recordedAt) >
        timestampValue(qualification.issuedAt)
      ) {
        fail(
          "FUTURE_EVIDENCE",
          `${path}/unknownEvidenceRefs/${refIndex}`,
          "qualification cannot cite an unknown recorded after issuance",
        );
      }
    }
    const scopedUnknowns = bundle.evidenceReceipts.filter(
      (evidence): evidence is RealSourceUnknownEvidence =>
        evidence.evidenceClass === "unknown",
    );
    const requiredUnknowns = REQUIRED_UNKNOWN_KINDS.map((unknownKind) => {
      const matches = scopedUnknowns.filter(
        (evidence) => evidence.unknownKind === unknownKind,
      );
      if (matches.length !== 1) {
        fail(
          "INCOMPLETE_UNKNOWN_CHECKLIST",
          `${path}/unknownEvidenceRefs`,
          "each applicable known unknown requires exactly one digest-bound receipt",
        );
      }
      return matches[0]!;
    });
    if (
      scopedUnknowns.length !== qualification.unknownEvidenceRefs.length ||
      scopedUnknowns.some(
        (unknown) =>
          !qualification.unknownEvidenceRefs.some((reference) =>
            sameRef(reference, unknown),
          ),
      )
    ) {
      fail(
        "UNKNOWN_EVIDENCE_OMITTED",
        `${path}/unknownEvidenceRefs`,
        "qualification must bind every explicit unknown in its exact scope",
      );
    }
    if (
      requiredUnknowns.some(
        (unknown) =>
          !qualification.unknownEvidenceRefs.some((reference) =>
            sameRef(reference, unknown),
          ),
      )
    ) {
      fail(
        "INCOMPLETE_UNKNOWN_CHECKLIST",
        `${path}/unknownEvidenceRefs`,
        "qualification omitted an applicable checklist receipt",
      );
    }
    const authenticationUnknown = scopedUnknowns.some(
      ({ unknownKind }) => unknownKind === "authentication_requirement",
    );
    if (authenticationUnknown) {
      fail(
        "AUTHENTICATION_NOT_CLOSED",
        `${path}/unknownEvidenceRefs`,
        "unknown authentication requirements block qualification",
      );
    }
    requireReviewsForSubject(
      catalogs,
      qualification.reviewReceiptRefs,
      qualification,
      `${path}/reviewReceiptRefs`,
      ["source_contract", "source_evidence", "sovereignty"],
    );
  }

  for (const [index, admission] of bundle.admissionReceipts.entries()) {
    const path = `/admissionReceipts/${index}`;
    const qualification = resolveMember(
      catalogs,
      admission.qualificationReceiptRef,
      "qualification_receipt",
      `${path}/qualificationReceiptRef`,
    );
    if (
      timestampValue(decisiveEffectiveAt(catalogs, qualification)) >
      timestampValue(admission.issuedAt)
    ) {
      fail(
        "FUTURE_DECISIVE_REFERENCE",
        `${path}/qualificationReceiptRef`,
        "admission cannot predate qualification",
      );
    }
    requireAuthorityRoleAt(
      catalogs,
      admission.ownerAuthorityRef,
      "owner_configuration_authority",
      admission.issuedAt,
      `${path}/ownerAuthorityRef`,
    );
    requireReviewsForSubject(
      catalogs,
      admission.reviewReceiptRefs,
      admission,
      `${path}/reviewReceiptRefs`,
      ["source_evidence", "sovereignty", "security"],
    );
    for (const [
      refIndex,
      reference,
    ] of admission.residualRiskEvidenceRefs.entries()) {
      const risk = resolveMember(
        catalogs,
        reference,
        "evidence_receipt",
        `${path}/residualRiskEvidenceRefs/${refIndex}`,
      );
      if (risk.evidenceClass !== "residual_risk_decision") {
        fail(
          "EVIDENCE_CLASS_MISMATCH",
          `${path}/residualRiskEvidenceRefs/${refIndex}`,
          "only residual-risk decisions may be consumed here",
        );
      }
      if (
        timestampValue(risk.acceptedAt) > timestampValue(admission.issuedAt)
      ) {
        fail(
          "FUTURE_DECISIVE_REFERENCE",
          `${path}/residualRiskEvidenceRefs/${refIndex}`,
          "admission cannot predate residual-risk acceptance",
        );
      }
    }
    const requiredRiskUnknowns = qualification.unknownEvidenceRefs.filter(
      (reference) => {
        const unknown = resolveMember(
          catalogs,
          reference,
          "evidence_receipt",
          `${path}/qualificationReceiptRef`,
        );
        return (
          unknown.evidenceClass === "unknown" &&
          (unknown.unknownKind === "api_specific_terms" ||
            unknown.unknownKind === "api_specific_privacy")
        );
      },
    );
    if (
      requiredRiskUnknowns.some(
        (unknownRef) =>
          !admission.residualRiskEvidenceRefs.some((riskRef) => {
            const risk = resolveMember(
              catalogs,
              riskRef,
              "evidence_receipt",
              `${path}/residualRiskEvidenceRefs`,
            );
            return (
              risk.evidenceClass === "residual_risk_decision" &&
              risk.unknownEvidenceRefs.some((reference) =>
                sameRef(reference, unknownRef),
              )
            );
          }),
      )
    ) {
      fail(
        "MISSING_RESIDUAL_RISK_ACCEPTANCE",
        `${path}/residualRiskEvidenceRefs`,
        "admission must cover each exact API terms and privacy unknown",
      );
    }
  }

  for (const [index, activation] of bundle.activationReceipts.entries()) {
    const path = `/activationReceipts/${index}`;
    const admission = resolveMember(
      catalogs,
      activation.admissionReceiptRef,
      "admission_receipt",
      `${path}/admissionReceiptRef`,
    );
    if (
      timestampValue(decisiveEffectiveAt(catalogs, admission)) >
      timestampValue(activation.issuedAt)
    ) {
      fail(
        "FUTURE_DECISIVE_REFERENCE",
        `${path}/admissionReceiptRef`,
        "activation cannot predate admission",
      );
    }
    requireAuthorityRoleAt(
      catalogs,
      activation.ownerAuthorityRef,
      "owner_configuration_authority",
      activation.issuedAt,
      `${path}/ownerAuthorityRef`,
    );
    const operations = activation.operationGrantRefs.map(
      (reference, refIndex) =>
        resolveMember(
          catalogs,
          reference,
          "operation_grant",
          `${path}/operationGrantRefs/${refIndex}`,
        ),
    );
    if (
      new Set(operations.map(({ operation }) => operation)).size !==
      operations.length
    ) {
      fail(
        "DUPLICATE_OPERATION_GRANT",
        `${path}/operationGrantRefs`,
        "activation contains more than one grant for an operation",
      );
    }
    if (
      operations.some(
        (operation) =>
          timestampValue(decisiveEffectiveAt(catalogs, operation)) >
          timestampValue(activation.issuedAt),
      )
    ) {
      fail(
        "FUTURE_DECISIVE_REFERENCE",
        `${path}/operationGrantRefs`,
        "activation cannot predate a referenced operation grant",
      );
    }
    requireReviewsForSubject(
      catalogs,
      activation.reviewReceiptRefs,
      activation,
      `${path}/reviewReceiptRefs`,
      ["source_evidence", "sovereignty", "security"],
    );
  }

  for (const [index, binding] of bundle.bindingReceipts.entries()) {
    const path = `/bindingReceipts/${index}`;
    const activation = resolveMember(
      catalogs,
      binding.activationReceiptRef,
      "activation_receipt",
      `${path}/activationReceiptRef`,
    );
    if (
      timestampValue(decisiveEffectiveAt(catalogs, activation)) >
      timestampValue(binding.issuedAt)
    ) {
      fail(
        "FUTURE_DECISIVE_REFERENCE",
        `${path}/activationReceiptRef`,
        "binding cannot predate activation",
      );
    }
    requireAuthorityRoleAt(
      catalogs,
      binding.ownerAuthorityRef,
      "owner_configuration_authority",
      binding.issuedAt,
      `${path}/ownerAuthorityRef`,
    );
    requireReviewsForSubject(
      catalogs,
      binding.reviewReceiptRefs,
      binding,
      `${path}/reviewReceiptRefs`,
      ["sovereignty", "security"],
    );
  }

  for (const [
    index,
    artifact,
  ] of bundle.artifactEligibilityReceipts.entries()) {
    const path = `/artifactEligibilityReceipts/${index}`;
    const binding = resolveMember(
      catalogs,
      artifact.bindingReceiptRef,
      "binding_receipt",
      `${path}/bindingReceiptRef`,
    );
    const grant = resolveMember(
      catalogs,
      artifact.localProjectionGrantRef,
      "operation_grant",
      `${path}/localProjectionGrantRef`,
    );
    if (grant.operation !== "local_projection") {
      fail(
        "OPERATION_NOT_GRANTED",
        `${path}/localProjectionGrantRef`,
        "artifact eligibility requires the independent local-projection grant",
      );
    }
    if (
      timestampValue(decisiveEffectiveAt(catalogs, binding)) >
        timestampValue(artifact.issuedAt) ||
      timestampValue(decisiveEffectiveAt(catalogs, grant)) >
        timestampValue(artifact.issuedAt)
    ) {
      fail(
        "FUTURE_DECISIVE_REFERENCE",
        path,
        "artifact eligibility cannot predate binding or its local grant",
      );
    }
    requireAuthorityRoleAt(
      catalogs,
      artifact.ownerAuthorityRef,
      "owner_configuration_authority",
      artifact.issuedAt,
      `${path}/ownerAuthorityRef`,
    );
    requireReviewsForSubject(
      catalogs,
      artifact.reviewReceiptRefs,
      artifact,
      `${path}/reviewReceiptRefs`,
      ["sovereignty", "security"],
    );
  }

  for (const [index, coverage] of bundle.coverageReceipts.entries()) {
    const path = `/coverageReceipts/${index}`;
    requireAuthorityRoleAt(
      catalogs,
      coverage.issuedByAuthorityRef,
      "owner_configuration_authority",
      coverage.observedAt,
      `${path}/issuedByAuthorityRef`,
    );
    const grant = resolveMember(
      catalogs,
      coverage.operationGrantRef,
      "operation_grant",
      `${path}/operationGrantRef`,
    );
    const admission = resolveMember(
      catalogs,
      coverage.admissionReceiptRef,
      "admission_receipt",
      `${path}/admissionReceiptRef`,
    );
    const activation = resolveMember(
      catalogs,
      coverage.activationReceiptRef,
      "activation_receipt",
      `${path}/activationReceiptRef`,
    );
    const binding = resolveMember(
      catalogs,
      coverage.bindingReceiptRef,
      "binding_receipt",
      `${path}/bindingReceiptRef`,
    );
    if (
      grant.operation !== coverage.operation ||
      coverage.operation !== bundle.scope.requestPlan.operation ||
      !sameDigestedRef(coverage.requestPlanRef, bundle.scope.requestPlan) ||
      coverage.requestDigest !== bundle.scope.requestPlan.digest ||
      !sameRef(activation.admissionReceiptRef, admission) ||
      !activation.operationGrantRefs.some((reference) =>
        sameRef(reference, grant),
      ) ||
      !sameRef(binding.activationReceiptRef, activation)
    ) {
      fail(
        "COVERAGE_CHAIN_MISMATCH",
        path,
        "coverage does not bind the exact plan, grant, admission, activation, and binding chain",
      );
    }
    if (
      !decisiveReceiptUsableAt(
        catalogs,
        grant,
        "granted",
        coverage.observedAt,
      ) ||
      !decisiveReceiptUsableAt(
        catalogs,
        admission,
        "admitted",
        coverage.observedAt,
      ) ||
      !decisiveReceiptUsableAt(
        catalogs,
        activation,
        "active",
        coverage.observedAt,
      ) ||
      !decisiveReceiptUsableAt(
        catalogs,
        binding,
        "bound",
        coverage.observedAt,
      ) ||
      timestampValue(coverage.observedAt) <
        timestampValue(decisiveEffectiveAt(catalogs, binding))
    ) {
      fail(
        "COVERAGE_PRECEDES_ACTIVE_CHAIN",
        `${path}/observedAt`,
        "coverage must occur after the exact effective active and bound chain",
      );
    }
    const { stages } = coverage;
    if (
      stages.documented !== bundle.scope.selectedRange.memberCount ||
      stages.selected !== bundle.scope.selectedRange.memberCount
    ) {
      fail(
        "INVALID_COVERAGE_ALGEBRA",
        `${path}/stages`,
        "coverage documented and selected counts must equal the one-member range",
      );
    }
    if (
      coverage.resultState === "successful" &&
      (stages.attempted !== 1 ||
        stages.received !== 1 ||
        stages.validated !== 1 ||
        stages.emitted !== 1 ||
        stages.omitted !== 0 ||
        stages.claimed !== 1)
    ) {
      fail(
        "INVALID_COVERAGE_ALGEBRA",
        `${path}/stages`,
        "successful one-document coverage must reconcile every stage to one",
      );
    }
    if (
      (coverage.resultState === "failed" ||
        coverage.resultState === "partial") &&
      (stages.attempted !== 1 ||
        stages.emitted !== 0 ||
        stages.claimed !== 0 ||
        stages.omitted !== 1)
    ) {
      fail(
        "INVALID_COVERAGE_ALGEBRA",
        `${path}/stages`,
        "failed or partial one-document attempts must emit zero and omit the selected member",
      );
    }
  }

  for (const [index, health] of bundle.healthReceipts.entries()) {
    const path = `/healthReceipts/${index}`;
    requireAuthorityRoleAt(
      catalogs,
      health.issuedByAuthorityRef,
      "owner_configuration_authority",
      health.issuedAt,
      `${path}/issuedByAuthorityRef`,
    );
    requireAuthorityRoleAt(
      catalogs,
      health.issuedByAuthorityRef,
      "owner_configuration_authority",
      health.observedAt,
      `${path}/issuedByAuthorityRef`,
    );
    if (health.coverageReceiptRef !== null) {
      const coverage = resolveMember(
        catalogs,
        health.coverageReceiptRef,
        "coverage_receipt",
        `${path}/coverageReceiptRef`,
      );
      if (
        timestampValue(health.observedAt) < timestampValue(coverage.observedAt)
      ) {
        fail(
          "HEALTH_PRECEDES_COVERAGE",
          `${path}/observedAt`,
          "health evidence cannot predate the exact coverage it assesses",
        );
      }
    }
    if (
      health.state === "healthy" &&
      health.healthScope !== "source_contract" &&
      health.coverageReceiptRef === null
    ) {
      fail(
        "MISSING_HEALTH_EVIDENCE",
        `${path}/coverageReceiptRef`,
        "healthy operation or range requires exact coverage evidence",
      );
    }
  }

  for (const [index, lkg] of bundle.lkgReceipts.entries()) {
    const path = `/lkgReceipts/${index}`;
    requireAuthorityRoleAt(
      catalogs,
      lkg.issuedByAuthorityRef,
      "owner_configuration_authority",
      lkg.issuedAt,
      `${path}/issuedByAuthorityRef`,
    );
    requireAuthorityRoleAt(
      catalogs,
      lkg.issuedByAuthorityRef,
      "owner_configuration_authority",
      lkg.validatedAt,
      `${path}/issuedByAuthorityRef`,
    );
    requireReviewsForSubject(
      catalogs,
      lkg.reviewReceiptRefs,
      lkg,
      `${path}/reviewReceiptRefs`,
      ["security"],
    );
    const coverage = resolveMember(
      catalogs,
      lkg.coverageReceiptRef,
      "coverage_receipt",
      `${path}/coverageReceiptRef`,
    );
    const health = resolveMember(
      catalogs,
      lkg.healthReceiptRef,
      "health_receipt",
      `${path}/healthReceiptRef`,
    );
    if (
      health.state !== "healthy" ||
      !isCurrent(health, lkg.createdAt) ||
      !isCurrent(health, lkg.validatedAt) ||
      !ownerIsCurrent(catalogs, health.issuedByAuthorityRef, lkg.createdAt) ||
      !ownerIsCurrent(catalogs, health.issuedByAuthorityRef, lkg.validatedAt)
    ) {
      fail(
        "LKG_HEALTH_NOT_CURRENT",
        `${path}/healthReceiptRef`,
        "LKG creation and validation require then-current healthy evidence and authority",
      );
    }
    if (
      timestampValue(lkg.createdAt) < timestampValue(coverage.observedAt) ||
      timestampValue(lkg.createdAt) < timestampValue(health.observedAt) ||
      timestampValue(lkg.validatedAt) < timestampValue(coverage.observedAt) ||
      timestampValue(lkg.validatedAt) < timestampValue(health.observedAt)
    ) {
      fail(
        "LKG_PRECEDES_BOUND_EVIDENCE",
        path,
        "LKG creation and validation cannot predate bound coverage or health evidence",
      );
    }
    if (
      coverage.operation !== "acquisition" ||
      coverage.resultState !== "successful" ||
      coverage.stages.emitted === 0 ||
      coverage.revisionRef === null ||
      !sameDigestedRef(coverage.revisionRef, lkg.revisionRef) ||
      health.healthScope !== "selected_range" ||
      health.state !== "healthy" ||
      health.coverageReceiptRef === null ||
      !sameRef(health.coverageReceiptRef, coverage)
    ) {
      fail(
        "LKG_NOT_FULLY_VALIDATED",
        path,
        "LKG does not bind successful emitted coverage and healthy selected range",
      );
    }
    if (lkg.lineage.kind === "successor") {
      const predecessor = resolveMember(
        catalogs,
        lkg.lineage.predecessorRef,
        "lkg_receipt",
        `${path}/lineage/predecessorRef`,
      );
      const predecessorCoverage = resolveMember(
        catalogs,
        predecessor.coverageReceiptRef,
        "coverage_receipt",
        `${path}/lineage/predecessorRef`,
      );
      if (
        timestampValue(predecessor.createdAt) >=
          timestampValue(lkg.createdAt) ||
        timestampValue(predecessorCoverage.observedAt) >=
          timestampValue(coverage.observedAt) ||
        timestampValue(
          reviewEffectiveAt(
            catalogs,
            predecessor.reviewReceiptRefs,
            predecessor.validatedAt,
          ),
        ) > timestampValue(lkg.createdAt) ||
        predecessor.revisionRef.digest === lkg.revisionRef.digest
      ) {
        fail(
          "INVALID_LKG_LINEAGE",
          `${path}/lineage`,
          "successor lineage is not strictly later and distinct",
        );
      }
    }
  }

  for (const [index, coverage] of bundle.coverageReceipts.entries()) {
    if (coverage.resultState !== "successful") {
      continue;
    }
    const matchingLkg = bundle.lkgReceipts.filter((lkg) =>
      sameRef(lkg.coverageReceiptRef, coverage),
    );
    if (matchingLkg.length !== 1) {
      fail(
        "MISSING_LKG_GENESIS",
        `/coverageReceipts/${index}`,
        "each successful emitted revision must atomically create exactly one LKG receipt",
      );
    }
  }

  if (bundle.lkgReceipts.length > 0) {
    const genesis = bundle.lkgReceipts.filter(
      ({ lineage }) => lineage.kind === "genesis",
    );
    const tips = bundle.lkgReceipts.filter(
      ({ supersededBy }) => supersededBy === null,
    );
    if (
      genesis.length !== 1 ||
      tips.length !== 1 ||
      tips[0]?.state !== "eligible"
    ) {
      fail(
        "INVALID_LKG_LINEAGE",
        "/lkgReceipts",
        "LKG history requires one genesis and one canonical eligible tip",
      );
    }
    const successorByPredecessor = new Map<string, RealSourceLkgReceipt>();
    for (const [index, lkg] of bundle.lkgReceipts.entries()) {
      if (lkg.lineage.kind === "genesis") {
        continue;
      }
      const predecessor = resolveMember(
        catalogs,
        lkg.lineage.predecessorRef,
        "lkg_receipt",
        `/lkgReceipts/${index}/lineage/predecessorRef`,
      );
      const predecessorKey = refKey(predecessor);
      if (
        successorByPredecessor.has(predecessorKey) ||
        predecessor.state !== "superseded" ||
        predecessor.supersededBy === null ||
        !sameRef(predecessor.supersededBy, lkg)
      ) {
        fail(
          "INVALID_LKG_LINEAGE",
          `/lkgReceipts/${index}/lineage`,
          "LKG predecessor and successor must form one reciprocal digest-bound edge",
        );
      }
      successorByPredecessor.set(predecessorKey, lkg);
    }
    let cursor: RealSourceLkgReceipt = genesis[0]!;
    const visited = new Set<string>();
    while (true) {
      const key = refKey(cursor);
      if (visited.has(key)) {
        fail("INVALID_LKG_LINEAGE", "/lkgReceipts", "LKG lineage cycles");
      }
      visited.add(key);
      const successor = successorByPredecessor.get(key);
      if (successor === undefined) {
        break;
      }
      cursor = successor;
    }
    if (
      visited.size !== bundle.lkgReceipts.length ||
      !sameRef(cursor, tips[0]!) ||
      bundle.lkgReceipts.some(
        (lkg) => !sameRef(lkg, tips[0]!) && lkg.state !== "superseded",
      )
    ) {
      fail(
        "INVALID_LKG_LINEAGE",
        "/lkgReceipts",
        "LKG lineage must be one connected linear history ending at the eligible tip",
      );
    }
  }

  const positiveStates = new Map<string, readonly CatalogMember[]>([
    [
      "qualified",
      bundle.qualificationReceipts.filter(({ state }) => state === "qualified"),
    ],
    [
      "admitted",
      bundle.admissionReceipts.filter(({ state }) => state === "admitted"),
    ],
    [
      "active",
      bundle.activationReceipts.filter(({ state }) => state === "active"),
    ],
    ["bound", bundle.bindingReceipts.filter(({ state }) => state === "bound")],
    [
      "local_artifact_eligible",
      bundle.artifactEligibilityReceipts.filter(
        ({ state }) => state === "eligible",
      ),
    ],
  ]);
  const progressiveStates = [
    "qualified",
    "admitted",
    "active",
    "bound",
    "local_artifact_eligible",
  ] as const;
  const usablePositiveStates = new Map<string, number>([
    [
      "qualified",
      bundle.qualificationReceipts.filter((receipt) =>
        decisiveReceiptUsableAt(
          catalogs,
          receipt,
          "qualified",
          bundle.lifecycleAsOf,
        ),
      ).length,
    ],
    [
      "admitted",
      bundle.admissionReceipts.filter((receipt) =>
        decisiveReceiptUsableAt(
          catalogs,
          receipt,
          "admitted",
          bundle.lifecycleAsOf,
        ),
      ).length,
    ],
    [
      "active",
      bundle.activationReceipts.filter((receipt) =>
        decisiveReceiptUsableAt(
          catalogs,
          receipt,
          "active",
          bundle.lifecycleAsOf,
        ),
      ).length,
    ],
    [
      "bound",
      bundle.bindingReceipts.filter((receipt) =>
        decisiveReceiptUsableAt(
          catalogs,
          receipt,
          "bound",
          bundle.lifecycleAsOf,
        ),
      ).length,
    ],
    [
      "local_artifact_eligible",
      bundle.artifactEligibilityReceipts.filter((receipt) =>
        decisiveReceiptUsableAt(
          catalogs,
          receipt,
          "eligible",
          bundle.lifecycleAsOf,
        ),
      ).length,
    ],
  ]);
  const assertedStage = progressiveStates.indexOf(
    bundle.lifecycleState as (typeof progressiveStates)[number],
  );
  if (assertedStage >= 0) {
    for (const [index, state] of progressiveStates.entries()) {
      const positiveReceipts = positiveStates.get(state) ?? [];
      if (index <= assertedStage && positiveReceipts.length === 0) {
        fail(
          "UNSUPPORTED_LIFECYCLE_CLAIM",
          "/lifecycleState",
          "lifecycle state lacks its exact progressive receipt chain",
        );
      }
      if (index <= assertedStage && usablePositiveStates.get(state) !== 1) {
        fail(
          "UNSUPPORTED_LIFECYCLE_CLAIM",
          "/lifecycleState",
          "lifecycle state is not usable at the declared lifecycleAsOf",
        );
      }
      if (index > assertedStage && positiveReceipts.length > 0) {
        fail(
          "LIFECYCLE_STAGE_OVERSTATEMENT",
          "/lifecycleState",
          "a later positive receipt is incompatible with the asserted lifecycle stage",
        );
      }
    }
  }
  if (
    bundle.lifecycleState === "candidate" &&
    (bundle.qualificationReceipts.length > 0 ||
      bundle.admissionReceipts.length > 0 ||
      bundle.activationReceipts.length > 0 ||
      bundle.bindingReceipts.length > 0 ||
      bundle.artifactEligibilityReceipts.length > 0)
  ) {
    fail(
      "CANDIDATE_HAS_DECISIVE_RECEIPT",
      "/lifecycleState",
      "candidate cannot contain qualification, admission, activation, binding, or artifact eligibility receipts",
    );
  }
  if (
    bundle.lifecycleState === "rejected" &&
    (bundle.admissionReceipts.length > 0 ||
      bundle.activationReceipts.length > 0 ||
      bundle.bindingReceipts.length > 0 ||
      bundle.artifactEligibilityReceipts.length > 0)
  ) {
    fail(
      "REJECTED_AFTER_ADMISSION",
      "/lifecycleState",
      "the pre-admission rejected state cannot contain admission or later-stage receipts",
    );
  }
  return catalogs;
}

export function parseRealSourceLifecycleBundle(
  value: unknown,
): RealSourceLifecycleBundle {
  const snapshot = capturePlainJsonSnapshot(
    value,
    "$realSourceLifecycleBundle",
  );
  const object = expectObject(snapshot, "$realSourceLifecycleBundle", [
    "$schema",
    "schemaVersion",
    "contentDigest",
    "id",
    "version",
    "synthetic",
    "trustDomain",
    "lifecycleState",
    "lifecycleAsOf",
    "scope",
    "authorityReceipts",
    "evidenceReceipts",
    "reviewReceipts",
    "operationGrants",
    "qualificationReceipts",
    "admissionReceipts",
    "activationReceipts",
    "bindingReceipts",
    "artifactEligibilityReceipts",
    "coverageReceipts",
    "healthReceipts",
    "lkgReceipts",
    "publication",
  ]);
  const rootContentDigest = expectDigest(
    object.contentDigest,
    "/contentDigest",
  );
  verifyContentDigest(
    object as unknown as { readonly contentDigest: string },
    "/",
  );
  const publication = expectObject(object.publication, "/publication", [
    "state",
    "authorityReceiptRefs",
  ]);
  expectArray(
    publication.authorityReceiptRefs,
    "/publication/authorityReceiptRefs",
    0,
    0,
  );
  const bundle: RealSourceLifecycleBundle = {
    $schema: expectLiteral(
      object.$schema,
      REAL_SOURCE_LIFECYCLE_BUNDLE_SCHEMA_ID,
      "/$schema",
    ),
    schemaVersion: expectLiteral(
      object.schemaVersion,
      REAL_SOURCE_LIFECYCLE_BUNDLE_SCHEMA_VERSION,
      "/schemaVersion",
    ),
    contentDigest: rootContentDigest,
    id: expectStableId(object.id, "/id"),
    version: expectVersion(object.version, "/version"),
    synthetic: expectLiteral(object.synthetic, false, "/synthetic"),
    trustDomain: expectLiteral(
      object.trustDomain,
      "real_source_local_prerelease",
      "/trustDomain",
    ),
    lifecycleState: expectEnum(
      object.lifecycleState,
      [
        "candidate",
        "evidence_blocked",
        "rejected",
        "qualified",
        "admitted",
        "active",
        "bound",
        "local_artifact_eligible",
        "suspended",
        "expired",
        "revoked",
        "retired",
      ] as const,
      "/lifecycleState",
    ),
    lifecycleAsOf: expectTimestamp(object.lifecycleAsOf, "/lifecycleAsOf"),
    scope: parseLifecycleScope(object.scope),
    authorityReceipts: parseCatalog(
      object.authorityReceipts,
      "/authorityReceipts",
      64,
      parseAuthorityReceipt,
      1,
    ),
    evidenceReceipts: parseCatalog(
      object.evidenceReceipts,
      "/evidenceReceipts",
      256,
      parseEvidenceReceipt,
      1,
    ),
    reviewReceipts: parseCatalog(
      object.reviewReceipts,
      "/reviewReceipts",
      128,
      parseReviewReceipt,
    ),
    operationGrants: parseCatalog(
      object.operationGrants,
      "/operationGrants",
      64,
      parseOperationGrant,
    ),
    qualificationReceipts: parseCatalog(
      object.qualificationReceipts,
      "/qualificationReceipts",
      32,
      parseQualificationReceipt,
    ),
    admissionReceipts: parseCatalog(
      object.admissionReceipts,
      "/admissionReceipts",
      32,
      parseAdmissionReceipt,
    ),
    activationReceipts: parseCatalog(
      object.activationReceipts,
      "/activationReceipts",
      32,
      parseActivationReceipt,
    ),
    bindingReceipts: parseCatalog(
      object.bindingReceipts,
      "/bindingReceipts",
      32,
      parseBindingReceipt,
    ),
    artifactEligibilityReceipts: parseCatalog(
      object.artifactEligibilityReceipts,
      "/artifactEligibilityReceipts",
      32,
      parseArtifactEligibilityReceipt,
    ),
    coverageReceipts: parseCatalog(
      object.coverageReceipts,
      "/coverageReceipts",
      256,
      parseCoverageReceipt,
    ),
    healthReceipts: parseCatalog(
      object.healthReceipts,
      "/healthReceipts",
      768,
      parseHealthReceipt,
    ),
    lkgReceipts: parseCatalog(
      object.lkgReceipts,
      "/lkgReceipts",
      256,
      parseLkgReceipt,
    ),
    publication: {
      state: expectLiteral(publication.state, "closed", "/publication/state"),
      authorityReceiptRefs: [],
    },
  };
  const frozenBundle = canonicalClone(bundle);
  verifyContentDigest(frozenBundle, "/");
  validateLocalGraph(frozenBundle);
  return frozenBundle;
}

export function serializeRealSourceLifecycleBundle(
  bundle: RealSourceLifecycleBundle,
): string {
  return encodeCanonical(
    parseRealSourceLifecycleBundle(bundle) as unknown as JsonValue,
  );
}

export function assertRealSourceLifecycleCompatibility(
  bundleValue: unknown,
  expectedScopeValue: unknown,
  expectedBundleContentDigest: string,
): RealSourceLifecycleBundle {
  const bundle = parseRealSourceLifecycleBundle(bundleValue);
  const expectedScopeSnapshot = capturePlainJsonSnapshot(
    expectedScopeValue,
    "$expectedScope",
  );
  const expectedScope = parseLifecycleScope(
    expectedScopeSnapshot,
    "$expectedScope",
  );
  if (
    expectDigest(
      expectedBundleContentDigest,
      "/expectedBundleContentDigest",
    ) !== bundle.contentDigest
  ) {
    fail(
      "CONTENT_DIGEST_MISMATCH",
      "/contentDigest",
      "bundle digest differs from the trusted expectation",
    );
  }
  if (
    encodeCanonical(bundle.scope as unknown as JsonValue) !==
    encodeCanonical(expectedScope as unknown as JsonValue)
  ) {
    fail(
      "SCOPE_MISMATCH",
      "/scope",
      "bundle is incompatible with the exact expected lifecycle scope",
    );
  }
  return bundle;
}

function isCurrent(value: RealSourceValidityInterval, asOf: string): boolean {
  const time = timestampValue(asOf);
  return (
    timestampValue(value.issuedAt) <= time &&
    time < timestampValue(value.expiresAt)
  );
}

function currentSingle<T extends RealSourceValidityInterval>(
  values: readonly T[],
  asOf: string,
  path: string,
): T | null {
  const current = values.filter((value) => isCurrent(value, asOf));
  if (current.length > 1) {
    fail(
      "AMBIGUOUS_CURRENT_RECEIPT",
      path,
      "more than one receipt is current for a singular gate",
    );
  }
  return current[0] ?? null;
}

function authorityIsCurrent(
  catalogs: Catalogs,
  reference: RealSourceReference<"authority_receipt">,
  role: RealSourceAuthorityRole,
  asOf: string,
): boolean {
  const authority = resolveMember(
    catalogs,
    reference,
    "authority_receipt",
    "/",
  );
  return (
    authority.authorityRole === role &&
    wasUsableAt(catalogs, authority, "accepted", asOf)
  );
}

function reviewIsCurrent(
  catalogs: Catalogs,
  review: RealSourceReviewReceipt,
  asOf: string,
): boolean {
  const reviewerRoles: Record<RealSourceReviewKind, RealSourceAuthorityRole> = {
    source_contract: "source_evidence_reviewer",
    source_evidence: "source_evidence_reviewer",
    sovereignty: "sovereignty_reviewer",
    security: "security_reviewer",
  };
  return (
    timestampValue(review.reviewedAt) <= timestampValue(asOf) &&
    wasUsableAt(catalogs, review, "accepted", asOf) &&
    authorityIsCurrent(
      catalogs,
      review.reviewerAuthorityRef,
      reviewerRoles[review.reviewKind],
      asOf,
    ) &&
    authorityIsCurrent(
      catalogs,
      review.ownerAuthorityRef,
      "owner_configuration_authority",
      asOf,
    )
  );
}

function reviewsAreCurrent(
  catalogs: Catalogs,
  references: readonly RealSourceReference<"review_receipt">[],
  asOf: string,
): boolean {
  return references.every((reference) =>
    reviewIsCurrent(
      catalogs,
      resolveMember(catalogs, reference, "review_receipt", "/"),
      asOf,
    ),
  );
}

function ownerIsCurrent(
  catalogs: Catalogs,
  reference: RealSourceReference<"authority_receipt">,
  asOf: string,
): boolean {
  return authorityIsCurrent(
    catalogs,
    reference,
    "owner_configuration_authority",
    asOf,
  );
}

function parseEvaluationRequest(
  value: RealSourceLifecycleEvaluationRequest,
): RealSourceLifecycleEvaluationRequest {
  const snapshot = capturePlainJsonSnapshot(value, "$evaluationRequest");
  const object = expectObject(snapshot, "$evaluationRequest", [
    "expectedScope",
    "expectedBundleContentDigest",
    "requestedOperation",
    "asOf",
    "currentAttempt",
    "currentRevisionRef",
    "requestedLkgRef",
  ]);
  const currentAttempt = expectEnum(
    object.currentAttempt,
    ["not_attempted", "successful", "failed", "partial"] as const,
    "/currentAttempt",
  );
  const currentRevisionRef =
    object.currentRevisionRef === null
      ? null
      : parseDigestedReference(
          object.currentRevisionRef,
          "/currentRevisionRef",
        );
  if ((currentAttempt === "successful") !== (currentRevisionRef !== null)) {
    fail(
      "INVALID_EVALUATION",
      "/currentRevisionRef",
      "only a successful current attempt may supply a current revision",
    );
  }
  return {
    expectedScope: parseLifecycleScope(object.expectedScope, "$expectedScope"),
    expectedBundleContentDigest: expectDigest(
      object.expectedBundleContentDigest,
      "/expectedBundleContentDigest",
    ),
    requestedOperation: expectEnum(
      object.requestedOperation,
      OPERATIONS,
      "/requestedOperation",
    ),
    asOf: expectTimestamp(object.asOf, "/asOf"),
    currentAttempt,
    currentRevisionRef,
    requestedLkgRef:
      object.requestedLkgRef === null
        ? null
        : parseReference(
            object.requestedLkgRef,
            "lkg_receipt",
            "/requestedLkgRef",
          ),
  };
}

function latestCoverage(
  bundle: RealSourceLifecycleBundle,
  asOf: string,
  operation: RealSourceOperation,
): RealSourceCoverageReceipt | null {
  const eligible = bundle.coverageReceipts
    .filter(
      (receipt) =>
        receipt.operation === operation &&
        timestampValue(receipt.observedAt) <= timestampValue(asOf),
    )
    .sort(
      (left, right) =>
        compareText(right.observedAt, left.observedAt) ||
        compareText(refKey(left), refKey(right)),
    );
  if (
    eligible.length > 1 &&
    eligible[0]?.observedAt === eligible[1]?.observedAt
  ) {
    fail(
      "AMBIGUOUS_CURRENT_RECEIPT",
      "/coverageReceipts",
      "latest coverage time is not unique",
    );
  }
  return eligible[0] ?? null;
}

function currentHealth(
  bundle: RealSourceLifecycleBundle,
  scope: RealSourceHealthScope,
  asOf: string,
): RealSourceHealthReceipt | null {
  return currentSingle(
    bundle.healthReceipts.filter(
      (receipt) => receipt.healthScope === scope && receipt.observedAt <= asOf,
    ),
    asOf,
    "/healthReceipts",
  );
}

const REASON_ORDER = [
  "SCOPE_MISMATCH",
  "NOT_QUALIFIED",
  "NOT_ADMITTED",
  "OPERATION_NOT_GRANTED",
  "NOT_ACTIVATED",
  "NOT_BOUND",
  "LOCAL_ARTIFACT_NOT_ELIGIBLE",
  "REQUIRED_REVIEW_NOT_CURRENT",
  "OWNER_AUTHORITY_NOT_CURRENT",
  "PROVIDER_AUTHORITY_NOT_CURRENT",
  "HEALTH_NOT_CURRENT",
  "CURRENT_ATTEMPT_FAILED",
  "CURRENT_ATTEMPT_PARTIAL",
  "NO_PRIOR_LKG",
  "LKG_UNKNOWN",
  "LKG_NOT_CURRENT",
  "LKG_NOT_FULLY_VALIDATED",
  "LKG_NOT_COMPATIBLE",
  "LKG_FUTURE_DATED",
  "PUBLICATION_CLOSED",
] as const satisfies readonly RealSourceLifecycleReasonCode[];

function sortedReasons(
  reasons: ReadonlySet<RealSourceLifecycleReasonCode>,
): readonly RealSourceLifecycleReasonCode[] {
  return REASON_ORDER.filter((reason) => reasons.has(reason));
}

const LIFECYCLE_STAGE_RANK = {
  candidate: 0,
  evidence_blocked: -1,
  rejected: -1,
  qualified: 1,
  admitted: 2,
  active: 3,
  bound: 4,
  local_artifact_eligible: 5,
  suspended: -1,
  expired: -1,
  revoked: -1,
  retired: -1,
} as const;

function lifecycleAllows(
  bundle: RealSourceLifecycleBundle,
  requiredRank: 1 | 2 | 3 | 4 | 5,
): boolean {
  return LIFECYCLE_STAGE_RANK[bundle.lifecycleState] >= requiredRank;
}

export function evaluateRealSourceLifecycle(
  bundleValue: unknown,
  requestValue: RealSourceLifecycleEvaluationRequest,
): RealSourceLifecycleEvaluation {
  const request = parseEvaluationRequest(requestValue);
  const bundle = assertRealSourceLifecycleCompatibility(
    bundleValue,
    request.expectedScope,
    request.expectedBundleContentDigest,
  );
  const catalogs = validateLocalGraph(bundle);
  const reasons = new Set<RealSourceLifecycleReasonCode>();
  const asOf = request.asOf;

  const qualification = currentSingle(
    bundle.qualificationReceipts.filter((receipt) =>
      wasUsableAt(catalogs, receipt, "qualified", asOf),
    ),
    asOf,
    "/qualificationReceipts",
  );
  const qualificationOwnerCurrent =
    qualification !== null &&
    ownerIsCurrent(catalogs, qualification.issuedByAuthorityRef, asOf);
  const qualificationReviewsCurrent =
    qualification !== null &&
    reviewsAreCurrent(catalogs, qualification.reviewReceiptRefs, asOf);
  const qualificationProviderAuthoritiesCurrent =
    qualification !== null &&
    qualification.providerFactEvidenceRefs.every((reference) => {
      const evidence = resolveMember(
        catalogs,
        reference,
        "evidence_receipt",
        "/",
      );
      if (evidence.evidenceClass !== "provider_fact") {
        return false;
      }
      const authority = resolveMember(
        catalogs,
        evidence.authorityReceiptRef,
        "authority_receipt",
        "/",
      );
      return authorityIsCurrent(
        catalogs,
        evidence.authorityReceiptRef,
        authority.authorityRole,
        asOf,
      );
    });
  const qualified =
    lifecycleAllows(bundle, 1) &&
    qualification !== null &&
    qualificationOwnerCurrent &&
    qualificationReviewsCurrent &&
    qualificationProviderAuthoritiesCurrent;
  if (!qualified) {
    reasons.add("NOT_QUALIFIED");
  }
  if (qualification !== null && !qualificationOwnerCurrent) {
    reasons.add("OWNER_AUTHORITY_NOT_CURRENT");
  }
  if (qualification !== null && !qualificationReviewsCurrent) {
    reasons.add("REQUIRED_REVIEW_NOT_CURRENT");
  }
  if (qualification !== null && !qualificationProviderAuthoritiesCurrent) {
    reasons.add("PROVIDER_AUTHORITY_NOT_CURRENT");
  }

  const admission = currentSingle(
    bundle.admissionReceipts.filter(
      (receipt) =>
        wasUsableAt(catalogs, receipt, "admitted", asOf) &&
        qualification !== null &&
        sameRef(receipt.qualificationReceiptRef, qualification),
    ),
    asOf,
    "/admissionReceipts",
  );
  const admissionOwnerCurrent =
    admission !== null &&
    ownerIsCurrent(catalogs, admission.ownerAuthorityRef, asOf);
  const admissionReviewsCurrent =
    admission !== null &&
    reviewsAreCurrent(catalogs, admission.reviewReceiptRefs, asOf);
  const admissionRisksCurrent =
    admission !== null &&
    admission.residualRiskEvidenceRefs.every((reference) => {
      const risk = resolveMember(catalogs, reference, "evidence_receipt", "/");
      return (
        risk.evidenceClass === "residual_risk_decision" &&
        timestampValue(risk.acceptedAt) <= timestampValue(asOf) &&
        wasUsableAt(catalogs, risk, "accepted", asOf) &&
        ownerIsCurrent(catalogs, risk.ownerAuthorityRef, asOf)
      );
    });
  const requiredResidualUnknownRefs =
    qualification?.unknownEvidenceRefs.filter((reference) => {
      const evidence = resolveMember(
        catalogs,
        reference,
        "evidence_receipt",
        "/",
      );
      return (
        evidence.evidenceClass === "unknown" &&
        evidence.limitationCode === "owner_risk_acceptance_required"
      );
    }) ?? [];
  const riskRequirementMet =
    requiredResidualUnknownRefs.length === 0 ||
    (admission !== null &&
      requiredResidualUnknownRefs.every((unknownReference) =>
        admission.residualRiskEvidenceRefs.some((riskReference) => {
          const risk = resolveMember(
            catalogs,
            riskReference,
            "evidence_receipt",
            "/",
          );
          return (
            risk.evidenceClass === "residual_risk_decision" &&
            risk.unknownEvidenceRefs.some((reference) =>
              sameRef(reference, unknownReference),
            )
          );
        }),
      ));
  const admitted =
    qualified &&
    lifecycleAllows(bundle, 2) &&
    admission !== null &&
    admissionOwnerCurrent &&
    admissionReviewsCurrent &&
    admissionRisksCurrent &&
    riskRequirementMet;
  if (!admitted) {
    reasons.add("NOT_ADMITTED");
  }
  if (
    admission !== null &&
    (!admissionOwnerCurrent || !admissionRisksCurrent)
  ) {
    reasons.add("OWNER_AUTHORITY_NOT_CURRENT");
  }
  if (admission !== null && !admissionReviewsCurrent) {
    reasons.add("REQUIRED_REVIEW_NOT_CURRENT");
  }

  const grant = currentSingle(
    bundle.operationGrants.filter(
      (receipt) =>
        wasUsableAt(catalogs, receipt, "granted", asOf) &&
        receipt.operation === request.requestedOperation,
    ),
    asOf,
    "/operationGrants",
  );
  const grantOwnerCurrent =
    grant !== null && ownerIsCurrent(catalogs, grant.ownerAuthorityRef, asOf);
  const grantReviewsCurrent =
    grant !== null &&
    reviewsAreCurrent(catalogs, grant.reviewReceiptRefs, asOf);
  const operationGranted =
    grant !== null && grantOwnerCurrent && grantReviewsCurrent;
  if (!operationGranted) {
    reasons.add("OPERATION_NOT_GRANTED");
  }
  if (grant !== null && !grantOwnerCurrent) {
    reasons.add("OWNER_AUTHORITY_NOT_CURRENT");
  }
  if (grant !== null && !grantReviewsCurrent) {
    reasons.add("REQUIRED_REVIEW_NOT_CURRENT");
  }

  const activation = currentSingle(
    bundle.activationReceipts.filter(
      (receipt) =>
        wasUsableAt(catalogs, receipt, "active", asOf) &&
        admission !== null &&
        sameRef(receipt.admissionReceiptRef, admission) &&
        grant !== null &&
        receipt.operationGrantRefs.some((reference) =>
          sameRef(reference, grant),
        ),
    ),
    asOf,
    "/activationReceipts",
  );
  const activationOwnerCurrent =
    activation !== null &&
    ownerIsCurrent(catalogs, activation.ownerAuthorityRef, asOf);
  const activationReviewsCurrent =
    activation !== null &&
    reviewsAreCurrent(catalogs, activation.reviewReceiptRefs, asOf);
  const activated =
    admitted &&
    lifecycleAllows(bundle, 3) &&
    operationGranted &&
    activation !== null &&
    activationOwnerCurrent &&
    activationReviewsCurrent;
  if (!activated) {
    reasons.add("NOT_ACTIVATED");
  }
  if (activation !== null && !activationOwnerCurrent) {
    reasons.add("OWNER_AUTHORITY_NOT_CURRENT");
  }
  if (activation !== null && !activationReviewsCurrent) {
    reasons.add("REQUIRED_REVIEW_NOT_CURRENT");
  }

  const binding = currentSingle(
    bundle.bindingReceipts.filter(
      (receipt) =>
        wasUsableAt(catalogs, receipt, "bound", asOf) &&
        activation !== null &&
        sameRef(receipt.activationReceiptRef, activation),
    ),
    asOf,
    "/bindingReceipts",
  );
  const bindingOwnerCurrent =
    binding !== null &&
    ownerIsCurrent(catalogs, binding.ownerAuthorityRef, asOf);
  const bindingReviewsCurrent =
    binding !== null &&
    reviewsAreCurrent(catalogs, binding.reviewReceiptRefs, asOf);
  const bound =
    activated &&
    lifecycleAllows(bundle, 4) &&
    binding !== null &&
    bindingOwnerCurrent &&
    bindingReviewsCurrent;
  if (!bound) {
    reasons.add("NOT_BOUND");
  }
  if (binding !== null && !bindingOwnerCurrent) {
    reasons.add("OWNER_AUTHORITY_NOT_CURRENT");
  }
  if (binding !== null && !bindingReviewsCurrent) {
    reasons.add("REQUIRED_REVIEW_NOT_CURRENT");
  }

  const localGrant = currentSingle(
    bundle.operationGrants.filter(
      (receipt) =>
        wasUsableAt(catalogs, receipt, "granted", asOf) &&
        receipt.operation === "local_projection",
    ),
    asOf,
    "/operationGrants",
  );
  const localGrantCurrent =
    localGrant !== null &&
    ownerIsCurrent(catalogs, localGrant.ownerAuthorityRef, asOf) &&
    reviewsAreCurrent(catalogs, localGrant.reviewReceiptRefs, asOf) &&
    activation !== null &&
    activation.operationGrantRefs.some((reference) =>
      sameRef(reference, localGrant),
    );
  const artifact = currentSingle(
    bundle.artifactEligibilityReceipts.filter(
      (receipt) =>
        wasUsableAt(catalogs, receipt, "eligible", asOf) &&
        binding !== null &&
        sameRef(receipt.bindingReceiptRef, binding) &&
        localGrant !== null &&
        sameRef(receipt.localProjectionGrantRef, localGrant),
    ),
    asOf,
    "/artifactEligibilityReceipts",
  );
  const artifactCurrent =
    artifact !== null &&
    ownerIsCurrent(catalogs, artifact.ownerAuthorityRef, asOf) &&
    reviewsAreCurrent(catalogs, artifact.reviewReceiptRefs, asOf);
  const artifactEligible =
    bound && lifecycleAllows(bundle, 5) && localGrantCurrent && artifactCurrent;
  if (!artifactEligible) {
    reasons.add("LOCAL_ARTIFACT_NOT_ELIGIBLE");
  }

  const coverage = latestCoverage(bundle, asOf, request.requestedOperation);
  if (request.currentAttempt !== "not_attempted" && coverage === null) {
    fail(
      "MISSING_CURRENT_COVERAGE",
      "/currentAttempt",
      "an attempted result requires exact operation-bound coverage evidence",
    );
  }
  if (coverage !== null && coverage.resultState !== request.currentAttempt) {
    fail(
      "INVALID_EVALUATION",
      "/currentAttempt",
      "current attempt does not match the latest coverage receipt",
    );
  }
  if (
    request.currentAttempt === "successful" &&
    (coverage === null ||
      coverage.revisionRef === null ||
      request.currentRevisionRef === null ||
      !sameDigestedRef(coverage.revisionRef, request.currentRevisionRef))
  ) {
    fail(
      "CURRENT_REVISION_MISMATCH",
      "/currentRevisionRef",
      "the current revision does not match successful normalized coverage",
    );
  }
  const healthReceipts = HEALTH_SCOPES.map((scope) =>
    currentHealth(bundle, scope, asOf),
  );
  const coverageAuthorityCurrent =
    coverage !== null &&
    ownerIsCurrent(catalogs, coverage.issuedByAuthorityRef, asOf);
  const healthCurrent = healthReceipts.every((receipt) => {
    if (
      receipt === null ||
      receipt.state !== "healthy" ||
      !ownerIsCurrent(catalogs, receipt.issuedByAuthorityRef, asOf)
    ) {
      return false;
    }
    return (
      receipt.healthScope === "source_contract" ||
      (coverage !== null &&
        receipt.coverageReceiptRef !== null &&
        sameRef(receipt.coverageReceiptRef, coverage))
    );
  });
  if (!healthCurrent) {
    reasons.add("HEALTH_NOT_CURRENT");
  }
  if (coverage !== null && !coverageAuthorityCurrent) {
    reasons.add("OWNER_AUTHORITY_NOT_CURRENT");
  }
  const failureHealthCurrent =
    coverage !== null &&
    (coverage.resultState === "failed" || coverage.resultState === "partial") &&
    HEALTH_SCOPES.every((scope) => {
      const receipt = healthReceipts[HEALTH_SCOPES.indexOf(scope)] ?? null;
      return (
        receipt !== null &&
        (receipt.state === "degraded" ||
          receipt.state === "failed" ||
          receipt.state === "unavailable") &&
        receipt.coverageReceiptRef !== null &&
        sameRef(receipt.coverageReceiptRef, coverage) &&
        ownerIsCurrent(catalogs, receipt.issuedByAuthorityRef, asOf)
      );
    });

  let lkgState: RealSourceLifecycleEvaluation["lkgState"] = "not_requested";
  let selectedRevisionRef: RealSourceDigestedReference | null = null;
  let usableLkg = false;
  if (
    request.currentAttempt === "failed" ||
    request.currentAttempt === "partial"
  ) {
    reasons.add(
      request.currentAttempt === "failed"
        ? "CURRENT_ATTEMPT_FAILED"
        : "CURRENT_ATTEMPT_PARTIAL",
    );
    if (request.requestedLkgRef === null) {
      lkgState = "unavailable_no_prior";
      reasons.add("NO_PRIOR_LKG");
    } else {
      const lkg = bundle.lkgReceipts.find((receipt) =>
        sameRef(receipt, request.requestedLkgRef!),
      );
      if (lkg === undefined) {
        lkgState = "rejected";
        reasons.add("LKG_UNKNOWN");
      } else {
        const canonicalTip = bundle.lkgReceipts.find(
          ({ state, supersededBy }) =>
            state === "eligible" && supersededBy === null,
        );
        const lkgCurrent =
          canonicalTip !== undefined &&
          sameRef(lkg, canonicalTip) &&
          lkg.state === "eligible" &&
          isCurrent(lkg, asOf);
        const notFuture =
          timestampValue(lkg.createdAt) <= timestampValue(asOf) &&
          timestampValue(lkg.validatedAt) <= timestampValue(asOf);
        const lkgOwnerCurrent = ownerIsCurrent(
          catalogs,
          lkg.issuedByAuthorityRef,
          asOf,
        );
        const lkgReviewsCurrent = reviewsAreCurrent(
          catalogs,
          lkg.reviewReceiptRefs,
          asOf,
        );
        if (!lkgCurrent) {
          reasons.add("LKG_NOT_CURRENT");
        }
        if (!notFuture) {
          reasons.add("LKG_FUTURE_DATED");
        }
        if (!lkgOwnerCurrent || !lkgReviewsCurrent) {
          reasons.add("LKG_NOT_COMPATIBLE");
        }
        const lkgCoverage = resolveMember(
          catalogs,
          lkg.coverageReceiptRef,
          "coverage_receipt",
          "/requestedLkgRef",
        );
        const lkgCoverageCompatible =
          request.requestedOperation === "acquisition" &&
          lkgCoverage.operation === "acquisition" &&
          lkgCoverage.revisionRef !== null &&
          sameDigestedRef(lkgCoverage.revisionRef, lkg.revisionRef);
        if (!lkgCoverageCompatible) {
          reasons.add("LKG_NOT_COMPATIBLE");
        }
        usableLkg =
          lkgCurrent &&
          notFuture &&
          lkgOwnerCurrent &&
          lkgReviewsCurrent &&
          lkgCoverageCompatible &&
          coverageAuthorityCurrent &&
          failureHealthCurrent &&
          qualified &&
          admitted &&
          activated &&
          bound &&
          artifactEligible;
        if (usableLkg) {
          lkgState = "eligible_stale_degraded";
          selectedRevisionRef = lkg.revisionRef;
        } else {
          lkgState = "rejected";
        }
      }
    }
  } else if (request.currentAttempt === "successful") {
    lkgState = "current_not_needed";
    selectedRevisionRef = coverage?.revisionRef ?? null;
  }

  const currentEmissionEligible =
    request.currentAttempt === "successful" &&
    request.currentRevisionRef !== null &&
    coverage?.resultState === "successful" &&
    coverage.operation === request.requestedOperation &&
    coverage.revisionRef !== null &&
    sameDigestedRef(coverage.revisionRef, request.currentRevisionRef) &&
    coverageAuthorityCurrent &&
    coverage.stages.emitted > 0 &&
    healthCurrent;
  const canExecute =
    qualified && admitted && activated && bound && operationGranted;
  const canEmitLocalArtifact =
    canExecute && artifactEligible && (currentEmissionEligible || usableLkg);
  reasons.add("PUBLICATION_CLOSED");

  return canonicalClone({
    schemaVersion: REAL_SOURCE_LIFECYCLE_BUNDLE_SCHEMA_VERSION,
    bundleRef: { id: bundle.id, version: bundle.version },
    scopeRef: {
      kind: "lifecycle_scope",
      id: bundle.scope.id,
      version: bundle.scope.version,
      contentDigest: bundle.scope.contentDigest,
    },
    requestedOperation: request.requestedOperation,
    asOf,
    qualificationState: qualified ? "qualified" : "not_qualified",
    admissionState: admitted ? "admitted" : "not_admitted",
    activationState: activated ? "active" : "inactive",
    bindingState: bound ? "bound" : "unbound",
    artifactEligibilityState: artifactEligible ? "eligible" : "ineligible",
    publicationState: "closed",
    operationGranted,
    currentAttempt: request.currentAttempt,
    currentCoverageRef:
      coverage === null
        ? null
        : {
            kind: "coverage_receipt",
            id: coverage.id,
            version: coverage.version,
            contentDigest: coverage.contentDigest,
          },
    healthStates: HEALTH_SCOPES.map((scope, index) => {
      const receipt = healthReceipts[index] ?? null;
      return {
        scope,
        state: receipt?.state ?? "not_observed",
        receiptRef:
          receipt === null
            ? null
            : {
                kind: "health_receipt" as const,
                id: receipt.id,
                version: receipt.version,
                contentDigest: receipt.contentDigest,
              },
      };
    }),
    lkgState,
    selectedRevisionRef,
    canExecute,
    canEmitLocalArtifact,
    canPublish: false,
    reasonCodes: sortedReasons(reasons),
  } satisfies RealSourceLifecycleEvaluation);
}

export function serializeRealSourceLifecycleEvaluation(
  evaluation: RealSourceLifecycleEvaluation,
): string {
  return encodeCanonical(
    capturePlainJsonSnapshot(evaluation, "$realSourceLifecycleEvaluation"),
  );
}
