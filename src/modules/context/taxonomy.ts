import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import recordSchema from "../../../schemas/record.schema.v1.json";
import type { PolicyRecord, TaxonomyConfig } from "../../shared/contracts";
import type {
  EngineProjection,
  ProjectionProfileBundle,
  VersionedReference,
} from "../../engine/contracts";
import {
  TAXONOMY_BUNDLE_SCHEMA_ID,
  TAXONOMY_BUNDLE_SCHEMA_VERSION,
  type AuthorityNativeTaxonomyConcept,
  type RequiredTaxonomyNonClaims,
  type RetainedGeneralTaxonomyConcept,
  type SourceProvidedTaxonomyLabel,
  type TaxonomyAssignment,
  type TaxonomyAssignmentKind,
  type TaxonomyAssignmentState,
  type TaxonomyAuthorityBinding,
  type TaxonomyAuthorityClass,
  type TaxonomyAuthorityRole,
  type TaxonomyAuthorityScope,
  type TaxonomyBundle,
  type TaxonomyClassificationReference,
  type TaxonomyConcept,
  type TaxonomyConceptReference,
  type TaxonomyCrosswalk,
  type TaxonomyCrosswalkLifecycleState,
  type TaxonomyDeploymentBinding,
  type TaxonomyEvidenceAvailability,
  type TaxonomyEvidenceKind,
  type TaxonomyEvidenceReference,
  type TaxonomyNamespace,
  type TaxonomyNamespaceRole,
  type TaxonomyPersonaGrant,
  type TaxonomyProjection,
  type TaxonomyProjectionRequest,
  type TaxonomyReviewAttestation,
  type TaxonomyReviewKind,
  type TaxonomyReviewState,
  type TaxonomyReviewSubjectReference,
} from "../../engine/taxonomy-contracts";
import {
  createProjectionRuntime,
  type ProjectionConfiguration,
  serializeEngineProjection,
} from "../../core/projection";

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
type JsonObject = Record<string, unknown>;

const STABLE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const VERSION = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const RECORD_ID = /^psr:[a-z0-9]+(?:-[a-z0-9]+)*:[A-Za-z0-9._~-]+$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z$/;
const LOCATOR = /^[a-z0-9][a-z0-9-]{0,95}$/;
const EVIDENCE_URL =
  /^https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*\.invalid(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*\/?$/;

const SAFE_STRUCTURAL_KEYS = new Set([
  "$schema",
  "schemaVersion",
  "id",
  "version",
  "synthetic",
  "profileBundleRef",
  "authorityBindings",
  "namespaces",
  "concepts",
  "evidenceReferences",
  "reviewAttestations",
  "crosswalks",
  "assignments",
  "deploymentBindings",
  "authorityIdentityRef",
  "role",
  "authorityClass",
  "scope",
  "kind",
  "sourceId",
  "regionPackRef",
  "deploymentProfileRef",
  "officialSubjectScheme",
  "ownerAuthorityBindingRef",
  "status",
  "vocabularyVersion",
  "retainedTaxonomyVersion",
  "namespaceRef",
  "conceptRef",
  "lifecycleState",
  "parentRef",
  "supersedesRef",
  "retainedTaxonomyRef",
  "taxonomyVersion",
  "categoryId",
  "subcategoryId",
  "code",
  "preferredLabel",
  "alternateLabels",
  "description",
  "suppliedByAuthorityBindingRef",
  "citation",
  "url",
  "locator",
  "observedAt",
  "availability",
  "visibility",
  "reviewerAuthorityBindingRef",
  "subject",
  "ref",
  "evidenceRefs",
  "reviewedAt",
  "state",
  "sourceConceptRef",
  "targetConceptRefs",
  "authorizerAuthorityBindingRef",
  "reviewAttestationRefs",
  "effectivePeriod",
  "from",
  "through",
  "nonClaims",
  "recordId",
  "targetNamespaceRef",
  "sourceProvidedLabel",
  "scheme",
  "label",
  "authorityBindingRef",
  "personaProjectionRef",
  "outputAdapterRefs",
  "namespaceRefs",
  "crosswalkRefs",
  "assignmentRefs",
  "personaGrants",
  "requestedVisibility",
  "asOf",
  "profileBundleRef",
  "records",
  "views",
  "recordReferences",
  "reasons",
  "internalId",
  "source",
  "officialSubjects",
  "taxonomyMemberships",
  "isUnclassified",
]);

const recordAjv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
addFormats(recordAjv);
const validatePolicyRecord14Schema = recordAjv.compile(recordSchema);

const AUTHORITY_ROLES = [
  "vocabulary_owner",
  "crosswalk_authorizer",
  "source_classifier",
  "community_configurator",
  "analyst_assigner",
  "evidence_provider",
  "reviewer",
] as const;
const AUTHORITY_CLASSES = [
  "synthetic_project",
  "synthetic_source",
  "synthetic_regional_organization",
  "synthetic_national_organization",
  "synthetic_community",
  "synthetic_analyst",
] as const;
const NAMESPACE_ROLES = [
  "project_general",
  "source_native",
  "regional_organization",
  "national_organization",
  "community_deployment",
] as const;
const CONCEPT_LIFECYCLE_STATES = ["active", "retired", "superseded"] as const;
const EVIDENCE_KINDS = [
  "source_documentation",
  "authority_configuration",
  "analyst_review",
] as const;
const EVIDENCE_AVAILABILITIES = [
  "observed",
  "not_observed",
  "unknown",
  "unavailable",
  "outside_coverage",
] as const;
const REVIEW_KINDS = [
  "source_verified",
  "authority_configured",
  "analyst_reviewed",
] as const;
const REVIEW_STATES = [
  "accepted",
  "pending",
  "disputed",
  "rejected",
  "withdrawn",
] as const;
const CROSSWALK_STATES = [
  "active",
  "pending",
  "disputed",
  "rejected",
  "withdrawn",
  "superseded",
  "expired",
] as const;
const ASSIGNMENT_KINDS = [
  "source_provided",
  "authority_configured",
  "analyst_reviewed",
  "unmapped",
  "unclassified",
  "not_assessed",
] as const;
const ASSIGNMENT_STATES = [
  "accepted",
  "pending",
  "disputed",
  "rejected",
  "withdrawn",
  "superseded",
  "expired",
] as const;

export const REQUIRED_TAXONOMY_NONCLAIMS = [
  "not_identity_evidence",
  "not_recognition_evidence",
  "not_organization_membership_evidence",
  "not_source_record_association_evidence",
  "not_a_why_shown_basis",
  "not_semantic_equivalence",
  "not_endpoint_authority_endorsement",
  "not_legal_effect_evidence",
  "not_consultation_evidence",
  "not_affiliation_consent_or_endorsement_evidence",
  "not_program_or_grant_eligibility_evidence",
  "not_urgency_priority_or_recommended_action",
  "not_a_nation_position",
] as const satisfies RequiredTaxonomyNonClaims;

export class TaxonomyValidationError extends TypeError {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string, detail: string) {
    super(`${code} at ${path}: ${detail}`);
    this.name = "TaxonomyValidationError";
    this.code = code;
    this.path = path;
  }
}

function fail(code: string, path: string, detail: string): never {
  throw new TaxonomyValidationError(code, path, detail);
}

function assertPlainJsonInternal(
  value: unknown,
  path: string,
  ancestors: WeakSet<object>,
): asserts value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isSafeInteger(value)) {
      fail("INVALID_JSON", path, "expected a finite safe JSON number");
    }
    return;
  }
  if (typeof value !== "object") {
    fail("INVALID_JSON", path, "expected a JSON value");
  }
  if (ancestors.has(value)) {
    fail("INVALID_JSON", path, "cyclic values are not accepted");
  }
  ancestors.add(value);
  try {
    const isArray = Array.isArray(value);
    const expectedPrototype = isArray ? Array.prototype : Object.prototype;
    if (Object.getPrototypeOf(value) !== expectedPrototype) {
      fail("INVALID_JSON", path, "expected a plain JSON container");
    }
    let inheritedContainer: object | null = expectedPrototype;
    while (inheritedContainer !== null) {
      if (
        Reflect.ownKeys(inheritedContainer).some(
          (key) =>
            Object.getOwnPropertyDescriptor(inheritedContainer as object, key)
              ?.enumerable === true,
        )
      ) {
        fail(
          "INVALID_JSON",
          path,
          "inherited enumerable state is not accepted",
        );
      }
      inheritedContainer = Object.getPrototypeOf(inheritedContainer) as
        object | null;
    }
    for (const enumerableKey in value) {
      if (!Object.hasOwn(value, enumerableKey)) {
        fail(
          "INVALID_JSON",
          path,
          "inherited enumerable state is not accepted",
        );
      }
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        fail("INVALID_JSON", path, "symbol properties are not accepted");
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (isArray && key === "length") {
        if (
          descriptor === undefined ||
          !("value" in descriptor) ||
          descriptor.enumerable ||
          descriptor.value !== value.length
        ) {
          fail("INVALID_JSON", path, "array length state is not canonical");
        }
        continue;
      }
      if (isArray) {
        if (!/^(?:0|[1-9][0-9]*)$/.test(key)) {
          fail("INVALID_JSON", path, "array contains non-index state");
        }
        const numericIndex = Number(key);
        if (
          !Number.isSafeInteger(numericIndex) ||
          numericIndex < 0 ||
          numericIndex >= value.length ||
          numericIndex >= 4_294_967_295 ||
          String(numericIndex) !== key
        ) {
          fail("INVALID_JSON", path, "array index state is not canonical");
        }
      }
      const childPath = isArray
        ? `${path}/${key}`
        : SAFE_STRUCTURAL_KEYS.has(key)
          ? `${path}/${key}`
          : path;
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        !descriptor.enumerable
      ) {
        fail("INVALID_JSON", childPath, "expected an enumerable data property");
      }
      assertPlainJsonInternal(descriptor.value, childPath, ancestors);
    }
    if (isArray) {
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          fail(
            "INVALID_JSON",
            `${path}/${index}`,
            "sparse arrays are rejected",
          );
        }
      }
    }
  } finally {
    ancestors.delete(value);
  }
}

function assertPlainJson(
  value: unknown,
  path: string,
): asserts value is JsonValue {
  assertPlainJsonInternal(value, path, new WeakSet<object>());
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
  const missing = keys.find((key) => !Object.hasOwn(object, key));
  if (missing !== undefined) {
    fail("INVALID_SHAPE", `${path}/${missing}`, "required field is missing");
  }
  const unexpected = Object.keys(object).find((key) => !keys.includes(key));
  if (unexpected !== undefined) {
    fail("INVALID_SHAPE", path, "unexpected field is not accepted");
  }
  return object;
}

function expectArray(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): readonly unknown[] {
  if (
    !Array.isArray(value) ||
    value.length < minimum ||
    value.length > maximum
  ) {
    fail("INVALID_SHAPE", path, "array length is outside the accepted range");
  }
  return value;
}

function expectString(
  value: unknown,
  path: string,
  pattern: RegExp,
  maximum: number,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    !pattern.test(value)
  ) {
    fail("INVALID_SHAPE", path, "string does not match the closed contract");
  }
  return value;
}

function expectOpaqueText(
  value: unknown,
  path: string,
  maximum: number,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    value.trim() !== value ||
    containsAsciiControl(value)
  ) {
    fail("INVALID_SHAPE", path, "text does not match the closed contract");
  }
  return value;
}

function containsAsciiControl(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || codeUnit === 0x7f) {
      return true;
    }
  }
  return false;
}

function expectLiteral<T extends string | boolean | null>(
  value: unknown,
  expected: T,
  path: string,
): T {
  if (value !== expected) {
    fail("INVALID_SHAPE", path, "literal does not match the closed contract");
  }
  return expected;
}

function expectEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail("INVALID_SHAPE", path, "value is outside the closed vocabulary");
  }
  return value as T;
}

function expectStableId(value: unknown, path: string): string {
  const id = expectString(value, path, STABLE_ID, 96);
  if (id.length < 3) {
    fail(
      "INVALID_SHAPE",
      path,
      "stable identifier is shorter than the closed contract",
    );
  }
  return id;
}

function expectVersion(value: unknown, path: string): string {
  return expectString(value, path, VERSION, 64);
}

function expectRecordId(value: unknown, path: string): string {
  return expectString(value, path, RECORD_ID, 256);
}

function expectDate(value: unknown, path: string): string {
  if (typeof value !== "string") {
    fail("INVALID_SHAPE", path, "expected an ISO date");
  }
  const match = DATE.exec(value);
  if (match === null) {
    fail("INVALID_SHAPE", path, "expected an ISO date");
  }
  const parsed = new Date(0);
  parsed.setUTCHours(0, 0, 0, 0);
  parsed.setUTCFullYear(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  if (
    parsed.getUTCFullYear() !== Number(match[1]) ||
    parsed.getUTCMonth() !== Number(match[2]) - 1 ||
    parsed.getUTCDate() !== Number(match[3])
  ) {
    fail("INVALID_SHAPE", path, "expected a real calendar date");
  }
  return value;
}

function expectDateTime(value: unknown, path: string): string {
  if (typeof value !== "string" || DATE_TIME.exec(value) === null) {
    fail("INVALID_SHAPE", path, "expected a canonical UTC date-time");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    fail("INVALID_SHAPE", path, "expected a real UTC date-time");
  }
  const normalized = parsed.toISOString();
  const expected = value.includes(".") ? value : value.replace("Z", ".000Z");
  if (normalized !== expected) {
    fail("INVALID_SHAPE", path, "expected a canonical UTC date-time");
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function refKey(reference: VersionedReference): string {
  return `${reference.id}\u0000${reference.version}`;
}

function sameRef(left: VersionedReference, right: VersionedReference): boolean {
  return left.id === right.id && left.version === right.version;
}

function compareRef(
  left: VersionedReference,
  right: VersionedReference,
): number {
  return compareText(refKey(left), refKey(right));
}

function conceptKey(reference: TaxonomyConceptReference): string {
  return `${refKey(reference.namespaceRef)}\u0001${refKey(reference.conceptRef)}`;
}

function compareConceptRef(
  left: TaxonomyConceptReference,
  right: TaxonomyConceptReference,
): number {
  return compareText(conceptKey(left), conceptKey(right));
}

function conceptReference(concept: TaxonomyConcept): TaxonomyConceptReference {
  return {
    namespaceRef: { ...concept.namespaceRef },
    conceptRef: { id: concept.id, version: concept.version },
  };
}

function parseReference(value: unknown, path: string): VersionedReference {
  const object = expectObject(value, path, ["id", "version"]);
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
  };
}

function parseNullableReference(
  value: unknown,
  path: string,
): VersionedReference | null {
  return value === null ? null : parseReference(value, path);
}

function parseConceptReference(
  value: unknown,
  path: string,
): TaxonomyConceptReference {
  const object = expectObject(value, path, ["namespaceRef", "conceptRef"]);
  return {
    namespaceRef: parseReference(object.namespaceRef, `${path}/namespaceRef`),
    conceptRef: parseReference(object.conceptRef, `${path}/conceptRef`),
  };
}

function parseNullableConceptReference(
  value: unknown,
  path: string,
): TaxonomyConceptReference | null {
  return value === null ? null : parseConceptReference(value, path);
}

function assertUniqueReferences(
  references: readonly VersionedReference[],
  path: string,
): void {
  const seen = new Set<string>();
  for (const reference of references) {
    if (seen.has(refKey(reference))) {
      fail("DUPLICATE_REFERENCE", path, "duplicate composite reference");
    }
    seen.add(refKey(reference));
  }
}

function parseReferenceSet(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): readonly VersionedReference[] {
  const references = expectArray(value, path, minimum, maximum).map(
    (entry, index) => parseReference(entry, `${path}/${index}`),
  );
  assertUniqueReferences(references, path);
  return references.sort(compareRef);
}

function parseConceptReferenceSet(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): readonly TaxonomyConceptReference[] {
  const references = expectArray(value, path, minimum, maximum).map(
    (entry, index) => parseConceptReference(entry, `${path}/${index}`),
  );
  const seen = new Set<string>();
  for (const reference of references) {
    if (seen.has(conceptKey(reference))) {
      fail("DUPLICATE_REFERENCE", path, "duplicate concept reference");
    }
    seen.add(conceptKey(reference));
  }
  return references.sort(compareConceptRef);
}

function parseScope(value: unknown, path: string): TaxonomyAuthorityScope {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_SHAPE", path, "expected an authority scope");
  }
  const kind = (value as JsonObject).kind;
  if (kind === "bundle") {
    const object = expectObject(value, path, ["kind"]);
    return { kind: expectLiteral(object.kind, "bundle", `${path}/kind`) };
  }
  if (kind === "source_region") {
    const object = expectObject(value, path, [
      "kind",
      "sourceId",
      "regionPackRef",
    ]);
    return {
      kind: expectLiteral(object.kind, "source_region", `${path}/kind`),
      sourceId: expectStableId(object.sourceId, `${path}/sourceId`),
      regionPackRef: parseReference(
        object.regionPackRef,
        `${path}/regionPackRef`,
      ),
    };
  }
  if (kind === "region") {
    const object = expectObject(value, path, ["kind", "regionPackRef"]);
    return {
      kind: expectLiteral(object.kind, "region", `${path}/kind`),
      regionPackRef: parseReference(
        object.regionPackRef,
        `${path}/regionPackRef`,
      ),
    };
  }
  if (kind === "deployment_region") {
    const object = expectObject(value, path, [
      "kind",
      "deploymentProfileRef",
      "regionPackRef",
    ]);
    return {
      kind: expectLiteral(object.kind, "deployment_region", `${path}/kind`),
      deploymentProfileRef: parseReference(
        object.deploymentProfileRef,
        `${path}/deploymentProfileRef`,
      ),
      regionPackRef: parseReference(
        object.regionPackRef,
        `${path}/regionPackRef`,
      ),
    };
  }
  fail(
    "INVALID_SHAPE",
    `${path}/kind`,
    "scope kind is outside the closed vocabulary",
  );
}

function scopeKey(scope: TaxonomyAuthorityScope): string {
  if (scope.kind === "bundle") {
    return "bundle";
  }
  if (scope.kind === "source_region") {
    return `${scope.kind}\u0000${scope.sourceId}\u0000${refKey(scope.regionPackRef)}`;
  }
  if (scope.kind === "region") {
    return `${scope.kind}\u0000${refKey(scope.regionPackRef)}`;
  }
  return `${scope.kind}\u0000${refKey(scope.deploymentProfileRef)}\u0000${refKey(scope.regionPackRef)}`;
}

function sameScope(
  left: TaxonomyAuthorityScope,
  right: TaxonomyAuthorityScope,
): boolean {
  return scopeKey(left) === scopeKey(right);
}

function parseNonClaims(
  value: unknown,
  path: string,
): RequiredTaxonomyNonClaims {
  const entries = expectArray(
    value,
    path,
    REQUIRED_TAXONOMY_NONCLAIMS.length,
    REQUIRED_TAXONOMY_NONCLAIMS.length,
  );
  for (const [index, expected] of REQUIRED_TAXONOMY_NONCLAIMS.entries()) {
    if (entries[index] !== expected) {
      fail(
        "INVALID_INFERENCE_LIMIT",
        `${path}/${index}`,
        "mandatory non-claim mismatch",
      );
    }
  }
  return [...REQUIRED_TAXONOMY_NONCLAIMS];
}

function parseEvidenceUrl(value: unknown, path: string): string {
  const url = expectString(value, path, EVIDENCE_URL, 512);
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname.endsWith(".invalid") ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.port !== "" ||
      parsed.search !== "" ||
      parsed.hash !== ""
    ) {
      fail("INVALID_SHAPE", path, "citation is not canonical synthetic HTTPS");
    }
  } catch (error) {
    if (error instanceof TaxonomyValidationError) {
      throw error;
    }
    fail("INVALID_SHAPE", path, "citation is not a valid URL");
  }
  return url;
}

function parseAuthorityBinding(
  value: unknown,
  path: string,
): TaxonomyAuthorityBinding {
  const object = expectObject(value, path, [
    "id",
    "version",
    "synthetic",
    "authorityIdentityRef",
    "role",
    "authorityClass",
    "scope",
  ]);
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    synthetic: expectLiteral(object.synthetic, true, `${path}/synthetic`),
    authorityIdentityRef: parseReference(
      object.authorityIdentityRef,
      `${path}/authorityIdentityRef`,
    ),
    role: expectEnum<TaxonomyAuthorityRole>(
      object.role,
      AUTHORITY_ROLES,
      `${path}/role`,
    ),
    authorityClass: expectEnum<TaxonomyAuthorityClass>(
      object.authorityClass,
      AUTHORITY_CLASSES,
      `${path}/authorityClass`,
    ),
    scope: parseScope(object.scope, `${path}/scope`),
  };
}

function parseNamespace(value: unknown, path: string): TaxonomyNamespace {
  const object = expectObject(value, path, [
    "id",
    "version",
    "synthetic",
    "role",
    "officialSubjectScheme",
    "ownerAuthorityBindingRef",
    "scope",
    "status",
    "vocabularyVersion",
    "retainedTaxonomyVersion",
  ]);
  const retainedTaxonomyVersion =
    object.retainedTaxonomyVersion === null
      ? null
      : expectLiteral(
          object.retainedTaxonomyVersion,
          "1.0.0",
          `${path}/retainedTaxonomyVersion`,
        );
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    synthetic: expectLiteral(object.synthetic, true, `${path}/synthetic`),
    role: expectEnum<TaxonomyNamespaceRole>(
      object.role,
      NAMESPACE_ROLES,
      `${path}/role`,
    ),
    officialSubjectScheme:
      object.officialSubjectScheme === null
        ? null
        : expectOpaqueText(
            object.officialSubjectScheme,
            `${path}/officialSubjectScheme`,
            128,
          ),
    ownerAuthorityBindingRef: parseReference(
      object.ownerAuthorityBindingRef,
      `${path}/ownerAuthorityBindingRef`,
    ),
    scope: parseScope(object.scope, `${path}/scope`),
    status: expectEnum(
      object.status,
      ["active", "retired"] as const,
      `${path}/status`,
    ),
    vocabularyVersion: expectVersion(
      object.vocabularyVersion,
      `${path}/vocabularyVersion`,
    ),
    retainedTaxonomyVersion,
  };
}

function parseConceptBase(object: JsonObject, path: string) {
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    synthetic: expectLiteral(object.synthetic, true, `${path}/synthetic`),
    namespaceRef: parseReference(object.namespaceRef, `${path}/namespaceRef`),
    lifecycleState: expectEnum(
      object.lifecycleState,
      CONCEPT_LIFECYCLE_STATES,
      `${path}/lifecycleState`,
    ),
    parentRef: parseNullableConceptReference(
      object.parentRef,
      `${path}/parentRef`,
    ),
    supersedesRef: parseNullableConceptReference(
      object.supersedesRef,
      `${path}/supersedesRef`,
    ),
  } as const;
}

function parseConcept(value: unknown, path: string): TaxonomyConcept {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_SHAPE", path, "expected a concept object");
  }
  const kind = (value as JsonObject).kind;
  if (kind === "retained_general_reference") {
    const object = expectObject(value, path, [
      "id",
      "version",
      "synthetic",
      "namespaceRef",
      "kind",
      "retainedTaxonomyRef",
      "lifecycleState",
      "parentRef",
      "supersedesRef",
    ]);
    const retained = expectObject(
      object.retainedTaxonomyRef,
      `${path}/retainedTaxonomyRef`,
      ["taxonomyVersion", "categoryId", "subcategoryId"],
    );
    return {
      ...parseConceptBase(object, path),
      kind: expectLiteral(
        object.kind,
        "retained_general_reference",
        `${path}/kind`,
      ),
      retainedTaxonomyRef: {
        taxonomyVersion: expectLiteral(
          retained.taxonomyVersion,
          "1.0.0",
          `${path}/retainedTaxonomyRef/taxonomyVersion`,
        ),
        categoryId: expectStableId(
          retained.categoryId,
          `${path}/retainedTaxonomyRef/categoryId`,
        ),
        subcategoryId:
          retained.subcategoryId === null
            ? null
            : expectStableId(
                retained.subcategoryId,
                `${path}/retainedTaxonomyRef/subcategoryId`,
              ),
      },
    } satisfies RetainedGeneralTaxonomyConcept;
  }
  if (kind === "authority_native") {
    const object = expectObject(value, path, [
      "id",
      "version",
      "synthetic",
      "namespaceRef",
      "kind",
      "code",
      "preferredLabel",
      "alternateLabels",
      "description",
      "lifecycleState",
      "parentRef",
      "supersedesRef",
    ]);
    const alternateLabels = expectArray(
      object.alternateLabels,
      `${path}/alternateLabels`,
      0,
      32,
    ).map((entry, index) =>
      expectOpaqueText(entry, `${path}/alternateLabels/${index}`, 256),
    );
    if (new Set(alternateLabels).size !== alternateLabels.length) {
      fail(
        "AMBIGUOUS_LABEL",
        `${path}/alternateLabels`,
        "duplicate alternate label",
      );
    }
    const preferredLabel = expectOpaqueText(
      object.preferredLabel,
      `${path}/preferredLabel`,
      256,
    );
    if (alternateLabels.includes(preferredLabel)) {
      fail(
        "AMBIGUOUS_LABEL",
        `${path}/alternateLabels`,
        "preferred label repeats as an alternate",
      );
    }
    return {
      ...parseConceptBase(object, path),
      kind: expectLiteral(object.kind, "authority_native", `${path}/kind`),
      code: expectOpaqueText(object.code, `${path}/code`, 128),
      preferredLabel,
      alternateLabels,
      description: expectOpaqueText(
        object.description,
        `${path}/description`,
        1024,
      ),
    } satisfies AuthorityNativeTaxonomyConcept;
  }
  fail(
    "INVALID_SHAPE",
    `${path}/kind`,
    "concept kind is outside the closed vocabulary",
  );
}

function parseEvidenceReference(
  value: unknown,
  path: string,
): TaxonomyEvidenceReference {
  const object = expectObject(value, path, [
    "id",
    "version",
    "synthetic",
    "suppliedByAuthorityBindingRef",
    "kind",
    "citation",
    "observedAt",
    "availability",
    "visibility",
  ]);
  const citation = expectObject(object.citation, `${path}/citation`, [
    "url",
    "locator",
  ]);
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    synthetic: expectLiteral(object.synthetic, true, `${path}/synthetic`),
    suppliedByAuthorityBindingRef: parseReference(
      object.suppliedByAuthorityBindingRef,
      `${path}/suppliedByAuthorityBindingRef`,
    ),
    kind: expectEnum<TaxonomyEvidenceKind>(
      object.kind,
      EVIDENCE_KINDS,
      `${path}/kind`,
    ),
    citation: {
      url: parseEvidenceUrl(citation.url, `${path}/citation/url`),
      locator: expectString(
        citation.locator,
        `${path}/citation/locator`,
        LOCATOR,
        96,
      ),
    },
    observedAt: expectDateTime(object.observedAt, `${path}/observedAt`),
    availability: expectEnum<TaxonomyEvidenceAvailability>(
      object.availability,
      EVIDENCE_AVAILABILITIES,
      `${path}/availability`,
    ),
    visibility: expectLiteral(
      object.visibility,
      "public",
      `${path}/visibility`,
    ),
  };
}

function parseReviewSubject(
  value: unknown,
  path: string,
): TaxonomyReviewSubjectReference {
  const object = expectObject(value, path, ["kind", "ref"]);
  return {
    kind: expectEnum(
      object.kind,
      ["crosswalk", "assignment"] as const,
      `${path}/kind`,
    ),
    ref: parseReference(object.ref, `${path}/ref`),
  };
}

function parseReviewAttestation(
  value: unknown,
  path: string,
): TaxonomyReviewAttestation {
  const object = expectObject(value, path, [
    "id",
    "version",
    "synthetic",
    "reviewerAuthorityBindingRef",
    "subject",
    "evidenceRefs",
    "reviewedAt",
    "kind",
    "state",
    "visibility",
  ]);
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    synthetic: expectLiteral(object.synthetic, true, `${path}/synthetic`),
    reviewerAuthorityBindingRef: parseReference(
      object.reviewerAuthorityBindingRef,
      `${path}/reviewerAuthorityBindingRef`,
    ),
    subject: parseReviewSubject(object.subject, `${path}/subject`),
    evidenceRefs: parseReferenceSet(
      object.evidenceRefs,
      `${path}/evidenceRefs`,
      1,
      256,
    ),
    reviewedAt: expectDateTime(object.reviewedAt, `${path}/reviewedAt`),
    kind: expectEnum<TaxonomyReviewKind>(
      object.kind,
      REVIEW_KINDS,
      `${path}/kind`,
    ),
    state: expectEnum<TaxonomyReviewState>(
      object.state,
      REVIEW_STATES,
      `${path}/state`,
    ),
    visibility: expectLiteral(
      object.visibility,
      "public",
      `${path}/visibility`,
    ),
  };
}

function parseEffectivePeriod(
  value: unknown,
  path: string,
): { readonly from: string; readonly through: string | null } {
  const object = expectObject(value, path, ["from", "through"]);
  const from = expectDate(object.from, `${path}/from`);
  const through =
    object.through === null
      ? null
      : expectDate(object.through, `${path}/through`);
  if (through !== null && through < from) {
    fail("INVALID_TEMPORAL_SCOPE", path, "inclusive date range is reversed");
  }
  return { from, through };
}

function parseCrosswalk(value: unknown, path: string): TaxonomyCrosswalk {
  const object = expectObject(value, path, [
    "id",
    "version",
    "synthetic",
    "kind",
    "sourceConceptRef",
    "targetConceptRefs",
    "authorizerAuthorityBindingRef",
    "evidenceRefs",
    "reviewAttestationRefs",
    "scope",
    "observedAt",
    "effectivePeriod",
    "lifecycleState",
    "supersedesRef",
    "visibility",
    "nonClaims",
  ]);
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    synthetic: expectLiteral(object.synthetic, true, `${path}/synthetic`),
    kind: expectLiteral(object.kind, "monitoring_crosswalk", `${path}/kind`),
    sourceConceptRef: parseConceptReference(
      object.sourceConceptRef,
      `${path}/sourceConceptRef`,
    ),
    targetConceptRefs: parseConceptReferenceSet(
      object.targetConceptRefs,
      `${path}/targetConceptRefs`,
      1,
      64,
    ),
    authorizerAuthorityBindingRef: parseReference(
      object.authorizerAuthorityBindingRef,
      `${path}/authorizerAuthorityBindingRef`,
    ),
    evidenceRefs: parseReferenceSet(
      object.evidenceRefs,
      `${path}/evidenceRefs`,
      1,
      256,
    ),
    reviewAttestationRefs: parseReferenceSet(
      object.reviewAttestationRefs,
      `${path}/reviewAttestationRefs`,
      1,
      256,
    ),
    scope: parseScope(object.scope, `${path}/scope`),
    observedAt: expectDateTime(object.observedAt, `${path}/observedAt`),
    effectivePeriod: parseEffectivePeriod(
      object.effectivePeriod,
      `${path}/effectivePeriod`,
    ),
    lifecycleState: expectEnum<TaxonomyCrosswalkLifecycleState>(
      object.lifecycleState,
      CROSSWALK_STATES,
      `${path}/lifecycleState`,
    ),
    supersedesRef: parseNullableReference(
      object.supersedesRef,
      `${path}/supersedesRef`,
    ),
    visibility: expectLiteral(
      object.visibility,
      "public",
      `${path}/visibility`,
    ),
    nonClaims: parseNonClaims(object.nonClaims, `${path}/nonClaims`),
  };
}

function parseSourceProvidedLabel(
  value: unknown,
  path: string,
): SourceProvidedTaxonomyLabel | null {
  if (value === null) {
    return null;
  }
  const object = expectObject(value, path, ["sourceId", "scheme", "label"]);
  return {
    sourceId: expectStableId(object.sourceId, `${path}/sourceId`),
    scheme: expectOpaqueText(object.scheme, `${path}/scheme`, 128),
    label: expectOpaqueText(object.label, `${path}/label`, 256),
  };
}

function parseAssignment(value: unknown, path: string): TaxonomyAssignment {
  const object = expectObject(value, path, [
    "id",
    "version",
    "synthetic",
    "recordId",
    "deploymentProfileRef",
    "kind",
    "conceptRef",
    "targetNamespaceRef",
    "sourceProvidedLabel",
    "authorityBindingRef",
    "evidenceRefs",
    "reviewAttestationRefs",
    "observedAt",
    "state",
    "visibility",
    "nonClaims",
  ]);
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    synthetic: expectLiteral(object.synthetic, true, `${path}/synthetic`),
    recordId: expectRecordId(object.recordId, `${path}/recordId`),
    deploymentProfileRef: parseReference(
      object.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    ),
    kind: expectEnum<TaxonomyAssignmentKind>(
      object.kind,
      ASSIGNMENT_KINDS,
      `${path}/kind`,
    ),
    conceptRef: parseNullableConceptReference(
      object.conceptRef,
      `${path}/conceptRef`,
    ),
    targetNamespaceRef: parseReference(
      object.targetNamespaceRef,
      `${path}/targetNamespaceRef`,
    ),
    sourceProvidedLabel: parseSourceProvidedLabel(
      object.sourceProvidedLabel,
      `${path}/sourceProvidedLabel`,
    ),
    authorityBindingRef: parseReference(
      object.authorityBindingRef,
      `${path}/authorityBindingRef`,
    ),
    evidenceRefs: parseReferenceSet(
      object.evidenceRefs,
      `${path}/evidenceRefs`,
      1,
      256,
    ),
    reviewAttestationRefs: parseReferenceSet(
      object.reviewAttestationRefs,
      `${path}/reviewAttestationRefs`,
      1,
      256,
    ),
    observedAt: expectDateTime(object.observedAt, `${path}/observedAt`),
    state: expectEnum<TaxonomyAssignmentState>(
      object.state,
      ASSIGNMENT_STATES,
      `${path}/state`,
    ),
    visibility: expectLiteral(
      object.visibility,
      "public",
      `${path}/visibility`,
    ),
    nonClaims: parseNonClaims(object.nonClaims, `${path}/nonClaims`),
  };
}

function parsePersonaGrant(value: unknown, path: string): TaxonomyPersonaGrant {
  const object = expectObject(value, path, [
    "id",
    "version",
    "personaProjectionRef",
    "outputAdapterRefs",
    "namespaceRefs",
    "crosswalkRefs",
    "assignmentRefs",
  ]);
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    personaProjectionRef: parseReference(
      object.personaProjectionRef,
      `${path}/personaProjectionRef`,
    ),
    outputAdapterRefs: parseReferenceSet(
      object.outputAdapterRefs,
      `${path}/outputAdapterRefs`,
      1,
      32,
    ),
    namespaceRefs: parseReferenceSet(
      object.namespaceRefs,
      `${path}/namespaceRefs`,
      1,
      128,
    ),
    crosswalkRefs: parseReferenceSet(
      object.crosswalkRefs,
      `${path}/crosswalkRefs`,
      0,
      1024,
    ),
    assignmentRefs: parseReferenceSet(
      object.assignmentRefs,
      `${path}/assignmentRefs`,
      1,
      2048,
    ),
  };
}

function parseDeploymentBinding(
  value: unknown,
  path: string,
): TaxonomyDeploymentBinding {
  const object = expectObject(value, path, [
    "id",
    "version",
    "deploymentProfileRef",
    "regionPackRef",
    "namespaceRefs",
    "crosswalkRefs",
    "assignmentRefs",
    "personaGrants",
  ]);
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    deploymentProfileRef: parseReference(
      object.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    ),
    regionPackRef: parseReference(
      object.regionPackRef,
      `${path}/regionPackRef`,
    ),
    namespaceRefs: parseReferenceSet(
      object.namespaceRefs,
      `${path}/namespaceRefs`,
      1,
      128,
    ),
    crosswalkRefs: parseReferenceSet(
      object.crosswalkRefs,
      `${path}/crosswalkRefs`,
      0,
      1024,
    ),
    assignmentRefs: parseReferenceSet(
      object.assignmentRefs,
      `${path}/assignmentRefs`,
      1,
      2048,
    ),
    personaGrants: parseCollection(
      object.personaGrants,
      `${path}/personaGrants`,
      1,
      128,
      parsePersonaGrant,
      (grant) => refKey(grant),
    ),
  };
}

function parseCollection<T>(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
  parser: (entry: unknown, path: string) => T,
  key: (entry: T) => string,
): readonly T[] {
  const entries = expectArray(value, path, minimum, maximum).map(
    (entry, index) => parser(entry, `${path}/${index}`),
  );
  const seen = new Set<string>();
  for (const entry of entries) {
    const entryKey = key(entry);
    if (seen.has(entryKey)) {
      fail("DUPLICATE_IDENTITY", path, "duplicate catalog identity");
    }
    seen.add(entryKey);
  }
  return entries.sort((left, right) => compareText(key(left), key(right)));
}

interface LocalCatalogs {
  readonly authorityBindings: ReadonlyMap<string, TaxonomyAuthorityBinding>;
  readonly namespaces: ReadonlyMap<string, TaxonomyNamespace>;
  readonly concepts: ReadonlyMap<string, TaxonomyConcept>;
  readonly evidenceReferences: ReadonlyMap<string, TaxonomyEvidenceReference>;
  readonly reviewAttestations: ReadonlyMap<string, TaxonomyReviewAttestation>;
  readonly crosswalks: ReadonlyMap<string, TaxonomyCrosswalk>;
  readonly assignments: ReadonlyMap<string, TaxonomyAssignment>;
  readonly deploymentBindings: ReadonlyMap<string, TaxonomyDeploymentBinding>;
  readonly personaGrants: ReadonlyMap<string, TaxonomyPersonaGrant>;
  readonly globalKinds: ReadonlyMap<string, string>;
}

function mapByReference<T extends VersionedReference>(
  values: readonly T[],
): ReadonlyMap<string, T> {
  return new Map(values.map((value) => [refKey(value), value]));
}

function makeCatalogs(bundle: TaxonomyBundle): LocalCatalogs {
  const personaGrants = bundle.deploymentBindings.flatMap((binding) =>
    binding.personaGrants.map((grant) => grant),
  );
  const kinds: Array<readonly [string, readonly VersionedReference[]]> = [
    ["bundle", [bundle]],
    ["authorityBinding", bundle.authorityBindings],
    ["namespace", bundle.namespaces],
    ["evidenceReference", bundle.evidenceReferences],
    ["reviewAttestation", bundle.reviewAttestations],
    ["crosswalk", bundle.crosswalks],
    ["assignment", bundle.assignments],
    ["deploymentBinding", bundle.deploymentBindings],
    ["personaGrant", personaGrants],
  ];
  const globalKinds = new Map<string, string>();
  for (const [kind, values] of kinds) {
    for (const value of values) {
      const key = refKey(value);
      if (globalKinds.has(key)) {
        fail(
          "DUPLICATE_IDENTITY",
          `/${kind}s`,
          "identity collides across catalog kinds",
        );
      }
      globalKinds.set(key, kind);
    }
  }
  return {
    authorityBindings: mapByReference(bundle.authorityBindings),
    namespaces: mapByReference(bundle.namespaces),
    concepts: new Map(
      bundle.concepts.map((concept) => [
        conceptKey(conceptReference(concept)),
        concept,
      ]),
    ),
    evidenceReferences: mapByReference(bundle.evidenceReferences),
    reviewAttestations: mapByReference(bundle.reviewAttestations),
    crosswalks: mapByReference(bundle.crosswalks),
    assignments: mapByReference(bundle.assignments),
    deploymentBindings: mapByReference(bundle.deploymentBindings),
    personaGrants: mapByReference(personaGrants),
    globalKinds,
  };
}

function resolveLocal<T extends VersionedReference>(
  map: ReadonlyMap<string, T>,
  catalogs: LocalCatalogs,
  reference: VersionedReference,
  expectedKind: string,
  path: string,
): T {
  const value = map.get(refKey(reference));
  if (value !== undefined) {
    return value;
  }
  if (catalogs.globalKinds.has(refKey(reference))) {
    fail(
      "WRONG_REFERENCE_KIND",
      path,
      "reference resolves to the wrong catalog kind",
    );
  }
  fail("UNKNOWN_REFERENCE", path, "reference does not resolve in the bundle");
}

function resolveConcept(
  reference: TaxonomyConceptReference,
  catalogs: LocalCatalogs,
  path: string,
): TaxonomyConcept {
  resolveLocal(
    catalogs.namespaces,
    catalogs,
    reference.namespaceRef,
    "namespace",
    `${path}/namespaceRef`,
  );
  const concept = catalogs.concepts.get(conceptKey(reference));
  if (concept === undefined) {
    fail(
      "UNKNOWN_REFERENCE",
      path,
      "concept reference does not resolve in its namespace",
    );
  }
  return concept;
}

function sameReferenceSet(
  left: readonly VersionedReference[],
  right: readonly VersionedReference[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const leftKeys = [...left].map(refKey).sort(compareText);
  const rightKeys = [...right].map(refKey).sort(compareText);
  return leftKeys.every((key, index) => key === rightKeys[index]);
}

function compareSemanticVersion(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const delta = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }
  return 0;
}

const CLASS_SCOPE_KINDS: Readonly<
  Record<TaxonomyAuthorityClass, TaxonomyAuthorityScope["kind"]>
> = {
  synthetic_project: "bundle",
  synthetic_source: "source_region",
  synthetic_regional_organization: "region",
  synthetic_national_organization: "bundle",
  synthetic_community: "deployment_region",
  synthetic_analyst: "deployment_region",
};

const ROLE_CLASSES: Readonly<
  Record<TaxonomyAuthorityRole, readonly TaxonomyAuthorityClass[]>
> = {
  vocabulary_owner: [
    "synthetic_project",
    "synthetic_source",
    "synthetic_regional_organization",
    "synthetic_national_organization",
    "synthetic_community",
  ],
  crosswalk_authorizer: [
    "synthetic_source",
    "synthetic_regional_organization",
    "synthetic_national_organization",
    "synthetic_community",
  ],
  source_classifier: ["synthetic_source"],
  community_configurator: ["synthetic_community"],
  analyst_assigner: ["synthetic_analyst"],
  evidence_provider: [
    "synthetic_project",
    "synthetic_source",
    "synthetic_regional_organization",
    "synthetic_national_organization",
    "synthetic_community",
    "synthetic_analyst",
  ],
  reviewer: [
    "synthetic_project",
    "synthetic_source",
    "synthetic_regional_organization",
    "synthetic_national_organization",
    "synthetic_community",
    "synthetic_analyst",
  ],
};

const NAMESPACE_CLASSES: Readonly<
  Record<TaxonomyNamespaceRole, TaxonomyAuthorityClass>
> = {
  project_general: "synthetic_project",
  source_native: "synthetic_source",
  regional_organization: "synthetic_regional_organization",
  national_organization: "synthetic_national_organization",
  community_deployment: "synthetic_community",
};

const NAMESPACE_SCOPE_KINDS: Readonly<
  Record<TaxonomyNamespaceRole, TaxonomyAuthorityScope["kind"]>
> = {
  project_general: "bundle",
  source_native: "source_region",
  regional_organization: "region",
  national_organization: "bundle",
  community_deployment: "deployment_region",
};

function validateAuthorityBindings(
  bundle: TaxonomyBundle,
  catalogs: LocalCatalogs,
): void {
  const identityPosture = new Map<
    string,
    {
      readonly version: string;
      readonly authorityClass: string;
      readonly scope: string;
    }
  >();
  for (const [index, binding] of bundle.authorityBindings.entries()) {
    if (!ROLE_CLASSES[binding.role].includes(binding.authorityClass)) {
      fail(
        "INVALID_AUTHORITY_BINDING",
        `/authorityBindings/${index}/authorityClass`,
        "authority class is not permitted for the declared role",
      );
    }
    if (CLASS_SCOPE_KINDS[binding.authorityClass] !== binding.scope.kind) {
      fail(
        "INVALID_AUTHORITY_BINDING",
        `/authorityBindings/${index}/scope`,
        "authority class does not permit this scope kind",
      );
    }
    const posture = {
      version: binding.authorityIdentityRef.version,
      authorityClass: binding.authorityClass,
      scope: scopeKey(binding.scope),
    };
    const prior = identityPosture.get(binding.authorityIdentityRef.id);
    if (
      prior !== undefined &&
      (prior.version !== posture.version ||
        prior.authorityClass !== posture.authorityClass ||
        prior.scope !== posture.scope)
    ) {
      fail(
        "INVALID_AUTHORITY_BINDING",
        `/authorityBindings/${index}/authorityIdentityRef`,
        "stable authority identity changes class, version, or scope",
      );
    }
    identityPosture.set(binding.authorityIdentityRef.id, posture);

    if (
      binding.role === "source_classifier" &&
      binding.scope.kind !== "source_region"
    ) {
      fail(
        "INVALID_AUTHORITY_BINDING",
        `/authorityBindings/${index}/scope`,
        "source classification requires exact source-region scope",
      );
    }
    if (
      (binding.role === "community_configurator" ||
        binding.role === "analyst_assigner") &&
      binding.scope.kind !== "deployment_region"
    ) {
      fail(
        "INVALID_AUTHORITY_BINDING",
        `/authorityBindings/${index}/scope`,
        "deployment assignment authority requires exact deployment-region scope",
      );
    }
  }

  // Force catalog construction to detect a binding disguised as another kind.
  for (const binding of bundle.authorityBindings) {
    resolveLocal(
      catalogs.authorityBindings,
      catalogs,
      binding,
      "authorityBinding",
      "/authorityBindings",
    );
  }
}

function retainedReferenceKey(concept: RetainedGeneralTaxonomyConcept): string {
  const reference = concept.retainedTaxonomyRef;
  return `${reference.taxonomyVersion}\u0000${reference.categoryId}\u0000${reference.subcategoryId ?? ""}`;
}

function validateConceptLineage(
  bundle: TaxonomyBundle,
  catalogs: LocalCatalogs,
): void {
  const groups = new Map<string, TaxonomyConcept[]>();
  for (const concept of bundle.concepts) {
    const stableKey = `${refKey(concept.namespaceRef)}\u0000${concept.id}`;
    const group = groups.get(stableKey) ?? [];
    group.push(concept);
    groups.set(stableKey, group);
  }
  for (const group of groups.values()) {
    group.sort((left, right) =>
      compareSemanticVersion(left.version, right.version),
    );
    for (const [index, concept] of group.entries()) {
      const path = `/concepts/${bundle.concepts.indexOf(concept)}`;
      if (index === 0) {
        if (concept.supersedesRef !== null) {
          fail(
            "INVALID_LINEAGE",
            `${path}/supersedesRef`,
            "root concept version cannot name a predecessor",
          );
        }
      } else {
        const predecessor = group[index - 1];
        if (
          predecessor === undefined ||
          concept.supersedesRef === null ||
          !sameRef(concept.supersedesRef.namespaceRef, concept.namespaceRef) ||
          concept.supersedesRef.conceptRef.id !== predecessor.id ||
          concept.supersedesRef.conceptRef.version !== predecessor.version ||
          predecessor.lifecycleState !== "superseded"
        ) {
          fail(
            "INVALID_LINEAGE",
            `${path}/supersedesRef`,
            "concept must name its immediate superseded predecessor",
          );
        }
        if (concept.kind !== predecessor.kind) {
          fail(
            "INVALID_LINEAGE",
            `${path}/kind`,
            "concept kind changes across one stable identity",
          );
        }
        if (
          concept.kind === "authority_native" &&
          predecessor.kind === "authority_native" &&
          concept.code !== predecessor.code
        ) {
          fail(
            "INVALID_LINEAGE",
            `${path}/code`,
            "authority-native code changes across one stable identity",
          );
        }
        if (
          concept.kind === "retained_general_reference" &&
          predecessor.kind === "retained_general_reference" &&
          retainedReferenceKey(concept) !== retainedReferenceKey(predecessor)
        ) {
          fail(
            "INVALID_LINEAGE",
            `${path}/retainedTaxonomyRef`,
            "retained taxonomy endpoint changes across one stable identity",
          );
        }
      }
      if (index < group.length - 1 && concept.lifecycleState !== "superseded") {
        fail(
          "INVALID_LINEAGE",
          `${path}/lifecycleState`,
          "non-leaf concept version must be superseded",
        );
      }
      if (
        index === group.length - 1 &&
        concept.lifecycleState === "superseded"
      ) {
        fail(
          "INVALID_LINEAGE",
          `${path}/lifecycleState`,
          "leaf concept version cannot remain superseded",
        );
      }
    }
  }

  for (const [index, concept] of bundle.concepts.entries()) {
    if (concept.supersedesRef !== null) {
      resolveConcept(
        concept.supersedesRef,
        catalogs,
        `/concepts/${index}/supersedesRef`,
      );
    }
  }
}

function validateEvidenceAndReviews(
  bundle: TaxonomyBundle,
  catalogs: LocalCatalogs,
): void {
  for (const [index, evidence] of bundle.evidenceReferences.entries()) {
    const supplier = resolveLocal(
      catalogs.authorityBindings,
      catalogs,
      evidence.suppliedByAuthorityBindingRef,
      "authorityBinding",
      `/evidenceReferences/${index}/suppliedByAuthorityBindingRef`,
    );
    if (supplier.role !== "evidence_provider") {
      fail(
        "INVALID_EVIDENCE_BINDING",
        `/evidenceReferences/${index}/suppliedByAuthorityBindingRef`,
        "evidence supplier does not hold the evidence-provider role",
      );
    }
  }

  const reviewClasses: Readonly<
    Record<TaxonomyReviewKind, readonly TaxonomyAuthorityClass[]>
  > = {
    source_verified: ["synthetic_source"],
    authority_configured: [
      "synthetic_project",
      "synthetic_regional_organization",
      "synthetic_national_organization",
      "synthetic_community",
    ],
    analyst_reviewed: ["synthetic_analyst"],
  };
  for (const [index, review] of bundle.reviewAttestations.entries()) {
    const reviewer = resolveLocal(
      catalogs.authorityBindings,
      catalogs,
      review.reviewerAuthorityBindingRef,
      "authorityBinding",
      `/reviewAttestations/${index}/reviewerAuthorityBindingRef`,
    );
    if (
      reviewer.role !== "reviewer" ||
      !reviewClasses[review.kind].includes(reviewer.authorityClass)
    ) {
      fail(
        "INVALID_REVIEW_BINDING",
        `/reviewAttestations/${index}/reviewerAuthorityBindingRef`,
        "review authority does not match the review kind",
      );
    }
    for (const [evidenceIndex, reference] of review.evidenceRefs.entries()) {
      const evidence = resolveLocal(
        catalogs.evidenceReferences,
        catalogs,
        reference,
        "evidenceReference",
        `/reviewAttestations/${index}/evidenceRefs/${evidenceIndex}`,
      );
      if (review.reviewedAt < evidence.observedAt) {
        fail(
          "INVALID_REVIEW_BINDING",
          `/reviewAttestations/${index}/reviewedAt`,
          "review predates its exact evidence",
        );
      }
    }
    if (review.subject.kind === "crosswalk") {
      resolveLocal(
        catalogs.crosswalks,
        catalogs,
        review.subject.ref,
        "crosswalk",
        `/reviewAttestations/${index}/subject/ref`,
      );
    } else {
      resolveLocal(
        catalogs.assignments,
        catalogs,
        review.subject.ref,
        "assignment",
        `/reviewAttestations/${index}/subject/ref`,
      );
    }
  }
}

function evidenceForGovernedObject(
  references: readonly VersionedReference[],
  expectedKind: TaxonomyEvidenceKind,
  governingAuthority: TaxonomyAuthorityBinding,
  scope: TaxonomyAuthorityScope,
  observedAt: string,
  requireObserved: boolean,
  catalogs: LocalCatalogs,
  path: string,
): readonly TaxonomyEvidenceReference[] {
  const evidence = references.map((reference, index) => {
    const resolved = resolveLocal(
      catalogs.evidenceReferences,
      catalogs,
      reference,
      "evidenceReference",
      `${path}/${index}`,
    );
    const supplier = resolveLocal(
      catalogs.authorityBindings,
      catalogs,
      resolved.suppliedByAuthorityBindingRef,
      "authorityBinding",
      `${path}/${index}`,
    );
    if (
      resolved.kind !== expectedKind ||
      !sameRef(
        supplier.authorityIdentityRef,
        governingAuthority.authorityIdentityRef,
      ) ||
      supplier.authorityClass !== governingAuthority.authorityClass ||
      !sameScope(supplier.scope, scope) ||
      !sameScope(supplier.scope, governingAuthority.scope)
    ) {
      fail(
        "INVALID_EVIDENCE_BINDING",
        `${path}/${index}`,
        "evidence kind, authority identity, class, or scope does not match the governed object",
      );
    }
    if (resolved.observedAt > observedAt) {
      fail(
        "INVALID_EVIDENCE_BINDING",
        `${path}/${index}`,
        "governed object predates its cited evidence",
      );
    }
    if (requireObserved && resolved.availability !== "observed") {
      fail(
        "INVALID_EVIDENCE_BINDING",
        `${path}/${index}/availability`,
        "eligible governed object requires observed evidence",
      );
    }
    return resolved;
  });
  return evidence;
}

function reviewsForGovernedObject(
  subjectKind: "crosswalk" | "assignment",
  subjectRef: VersionedReference,
  references: readonly VersionedReference[],
  evidenceRefs: readonly VersionedReference[],
  expectedKind: TaxonomyReviewKind,
  authority: TaxonomyAuthorityBinding,
  observedAt: string,
  requireAccepted: boolean,
  catalogs: LocalCatalogs,
  path: string,
): readonly TaxonomyReviewAttestation[] {
  const reviews = references.map((reference, index) => {
    const review = resolveLocal(
      catalogs.reviewAttestations,
      catalogs,
      reference,
      "reviewAttestation",
      `${path}/${index}`,
    );
    if (
      review.subject.kind !== subjectKind ||
      !sameRef(review.subject.ref, subjectRef) ||
      !sameReferenceSet(review.evidenceRefs, evidenceRefs)
    ) {
      fail(
        "INVALID_REVIEW_BINDING",
        `${path}/${index}`,
        "review subject or exact evidence set does not match",
      );
    }
    const reviewer = resolveLocal(
      catalogs.authorityBindings,
      catalogs,
      review.reviewerAuthorityBindingRef,
      "authorityBinding",
      `${path}/${index}`,
    );
    if (
      review.kind !== expectedKind ||
      !sameRef(reviewer.authorityIdentityRef, authority.authorityIdentityRef) ||
      !sameScope(reviewer.scope, authority.scope) ||
      review.reviewedAt < observedAt
    ) {
      fail(
        "INVALID_REVIEW_BINDING",
        `${path}/${index}`,
        "review does not bind the exact authority, scope, kind, and time",
      );
    }
    return review;
  });
  if (
    requireAccepted &&
    !reviews.some((review) => review.state === "accepted")
  ) {
    fail(
      "INVALID_REVIEW_BINDING",
      path,
      "eligible governed object lacks an accepted exact review",
    );
  }
  return reviews;
}

function expectedCrosswalkEvidenceKind(
  role: TaxonomyNamespaceRole,
): TaxonomyEvidenceKind {
  return role === "source_native"
    ? "source_documentation"
    : "authority_configuration";
}

function expectedCrosswalkReviewKind(
  role: TaxonomyNamespaceRole,
): TaxonomyReviewKind {
  return role === "source_native" ? "source_verified" : "authority_configured";
}

function validateCrosswalkLineage(bundle: TaxonomyBundle): void {
  const groups = new Map<string, TaxonomyCrosswalk[]>();
  for (const crosswalk of bundle.crosswalks) {
    const group = groups.get(crosswalk.id) ?? [];
    group.push(crosswalk);
    groups.set(crosswalk.id, group);
  }
  for (const group of groups.values()) {
    group.sort((left, right) =>
      compareSemanticVersion(left.version, right.version),
    );
    for (const [index, crosswalk] of group.entries()) {
      const path = `/crosswalks/${bundle.crosswalks.indexOf(crosswalk)}`;
      if (index === 0) {
        if (crosswalk.supersedesRef !== null) {
          fail(
            "INVALID_LINEAGE",
            `${path}/supersedesRef`,
            "root crosswalk version cannot name a predecessor",
          );
        }
      } else {
        const predecessor = group[index - 1];
        if (
          predecessor === undefined ||
          crosswalk.supersedesRef === null ||
          crosswalk.supersedesRef.id !== predecessor.id ||
          crosswalk.supersedesRef.version !== predecessor.version ||
          predecessor.lifecycleState !== "superseded"
        ) {
          fail(
            "INVALID_LINEAGE",
            `${path}/supersedesRef`,
            "crosswalk must name its immediate superseded predecessor",
          );
        }
        if (
          crosswalk.kind !== predecessor.kind ||
          conceptKey(crosswalk.sourceConceptRef) !==
            conceptKey(predecessor.sourceConceptRef) ||
          crosswalk.authorizerAuthorityBindingRef.id !==
            predecessor.authorizerAuthorityBindingRef.id ||
          !sameScope(crosswalk.scope, predecessor.scope) ||
          crosswalk.targetConceptRefs.length !==
            predecessor.targetConceptRefs.length ||
          crosswalk.targetConceptRefs.some(
            (target, targetIndex) =>
              conceptKey(target) !==
              conceptKey(
                predecessor.targetConceptRefs[
                  targetIndex
                ] as TaxonomyConceptReference,
              ),
          )
        ) {
          fail(
            "INVALID_LINEAGE",
            path,
            "crosswalk endpoints, kind, authority, or scope change across one identity",
          );
        }
        if (
          predecessor.effectivePeriod.through === null ||
          predecessor.effectivePeriod.through >=
            crosswalk.effectivePeriod.from ||
          predecessor.observedAt > crosswalk.observedAt
        ) {
          fail(
            "INVALID_TEMPORAL_SCOPE",
            `${path}/effectivePeriod`,
            "successor time overlaps or predates its immediate predecessor",
          );
        }
      }
      if (
        index < group.length - 1 &&
        crosswalk.lifecycleState !== "superseded"
      ) {
        fail(
          "INVALID_LINEAGE",
          `${path}/lifecycleState`,
          "non-leaf crosswalk version must be superseded",
        );
      }
      if (
        index === group.length - 1 &&
        crosswalk.lifecycleState === "superseded"
      ) {
        fail(
          "INVALID_LINEAGE",
          `${path}/lifecycleState`,
          "leaf crosswalk version cannot remain superseded",
        );
      }
    }
  }
}

function validateCrosswalks(
  bundle: TaxonomyBundle,
  catalogs: LocalCatalogs,
): void {
  const semanticEdges = new Map<string, string>();
  for (const [index, crosswalk] of bundle.crosswalks.entries()) {
    const path = `/crosswalks/${index}`;
    const source = resolveConcept(
      crosswalk.sourceConceptRef,
      catalogs,
      `${path}/sourceConceptRef`,
    );
    const sourceNamespace = resolveLocal(
      catalogs.namespaces,
      catalogs,
      crosswalk.sourceConceptRef.namespaceRef,
      "namespace",
      `${path}/sourceConceptRef/namespaceRef`,
    );
    if (
      sourceNamespace.role === "project_general" ||
      sourceNamespace.status !== "active"
    ) {
      fail(
        "INVALID_DIRECTION",
        `${path}/sourceConceptRef`,
        "crosswalk source must be an active non-general namespace",
      );
    }
    if (
      crosswalk.lifecycleState === "active" &&
      source.lifecycleState !== "active"
    ) {
      fail(
        "INACTIVE_REFERENCE",
        `${path}/sourceConceptRef`,
        "active crosswalk cannot use an inactive source concept",
      );
    }
    for (const [
      targetIndex,
      targetRef,
    ] of crosswalk.targetConceptRefs.entries()) {
      const target = resolveConcept(
        targetRef,
        catalogs,
        `${path}/targetConceptRefs/${targetIndex}`,
      );
      const targetNamespace = resolveLocal(
        catalogs.namespaces,
        catalogs,
        targetRef.namespaceRef,
        "namespace",
        `${path}/targetConceptRefs/${targetIndex}/namespaceRef`,
      );
      if (
        targetNamespace.role !== "project_general" ||
        targetNamespace.status !== "active" ||
        (crosswalk.lifecycleState === "active" &&
          target.lifecycleState !== "active")
      ) {
        fail(
          "INVALID_DIRECTION",
          `${path}/targetConceptRefs/${targetIndex}`,
          "crosswalk target must be an active retained-general concept",
        );
      }
      if (conceptKey(targetRef) === conceptKey(crosswalk.sourceConceptRef)) {
        fail(
          "INVALID_DIRECTION",
          `${path}/targetConceptRefs/${targetIndex}`,
          "crosswalk cannot be a self edge",
        );
      }
      const semanticKey = `${conceptKey(crosswalk.sourceConceptRef)}\u0000${conceptKey(targetRef)}\u0000${scopeKey(crosswalk.scope)}`;
      const priorLineage = semanticEdges.get(semanticKey);
      if (priorLineage !== undefined && priorLineage !== crosswalk.id) {
        fail(
          "MAPPING_CONFLICT",
          `${path}/targetConceptRefs/${targetIndex}`,
          "semantic source-target-scope edge is duplicated by another lineage",
        );
      }
      semanticEdges.set(semanticKey, crosswalk.id);
    }
    if (!sameScope(crosswalk.scope, sourceNamespace.scope)) {
      fail(
        "CROSS_SCOPE_REFERENCE",
        `${path}/scope`,
        "crosswalk scope does not match its source namespace",
      );
    }
    const authorizer = resolveLocal(
      catalogs.authorityBindings,
      catalogs,
      crosswalk.authorizerAuthorityBindingRef,
      "authorityBinding",
      `${path}/authorizerAuthorityBindingRef`,
    );
    const owner = resolveLocal(
      catalogs.authorityBindings,
      catalogs,
      sourceNamespace.ownerAuthorityBindingRef,
      "authorityBinding",
      `${path}/sourceConceptRef/namespaceRef`,
    );
    if (
      authorizer.role !== "crosswalk_authorizer" ||
      !sameRef(authorizer.authorityIdentityRef, owner.authorityIdentityRef) ||
      authorizer.authorityClass !== owner.authorityClass ||
      !sameScope(authorizer.scope, sourceNamespace.scope)
    ) {
      fail(
        "INVALID_AUTHORITY_BINDING",
        `${path}/authorizerAuthorityBindingRef`,
        "crosswalk authorizer is not the exact source-namespace authority",
      );
    }
    evidenceForGovernedObject(
      crosswalk.evidenceRefs,
      expectedCrosswalkEvidenceKind(sourceNamespace.role),
      authorizer,
      crosswalk.scope,
      crosswalk.observedAt,
      crosswalk.lifecycleState === "active",
      catalogs,
      `${path}/evidenceRefs`,
    );
    const reviews = reviewsForGovernedObject(
      "crosswalk",
      crosswalk,
      crosswalk.reviewAttestationRefs,
      crosswalk.evidenceRefs,
      expectedCrosswalkReviewKind(sourceNamespace.role),
      authorizer,
      crosswalk.observedAt,
      crosswalk.lifecycleState === "active",
      catalogs,
      `${path}/reviewAttestationRefs`,
    );
    const expectedState: Partial<
      Record<TaxonomyCrosswalkLifecycleState, TaxonomyReviewState>
    > = {
      pending: "pending",
      disputed: "disputed",
      rejected: "rejected",
      withdrawn: "withdrawn",
    };
    const requiredState = expectedState[crosswalk.lifecycleState];
    if (
      requiredState !== undefined &&
      !reviews.some((review) => review.state === requiredState)
    ) {
      fail(
        "INVALID_REVIEW_BINDING",
        `${path}/reviewAttestationRefs`,
        "inactive lifecycle state lacks its exact review state",
      );
    }
  }
  validateCrosswalkLineage(bundle);
}

function validateAssignments(
  bundle: TaxonomyBundle,
  catalogs: LocalCatalogs,
): void {
  const semanticAssignments = new Set<string>();
  for (const [index, assignment] of bundle.assignments.entries()) {
    const path = `/assignments/${index}`;
    const targetNamespace = resolveLocal(
      catalogs.namespaces,
      catalogs,
      assignment.targetNamespaceRef,
      "namespace",
      `${path}/targetNamespaceRef`,
    );
    if (
      targetNamespace.role !== "project_general" ||
      targetNamespace.status !== "active"
    ) {
      fail(
        "INVALID_ASSIGNMENT",
        `${path}/targetNamespaceRef`,
        "assignment target must be the active retained-general namespace",
      );
    }

    const concept =
      assignment.conceptRef === null
        ? null
        : resolveConcept(assignment.conceptRef, catalogs, `${path}/conceptRef`);
    const conceptNamespace =
      assignment.conceptRef === null
        ? null
        : resolveLocal(
            catalogs.namespaces,
            catalogs,
            assignment.conceptRef.namespaceRef,
            "namespace",
            `${path}/conceptRef/namespaceRef`,
          );
    if (
      conceptNamespace?.role === "project_general" ||
      (assignment.state === "accepted" &&
        concept !== null &&
        (conceptNamespace?.status === "retired" ||
          concept?.lifecycleState !== "active"))
    ) {
      fail(
        "INVALID_ASSIGNMENT",
        `${path}/conceptRef`,
        "accepted assignment requires an active authority-native concept",
      );
    }

    const nullConceptKind =
      assignment.kind === "unclassified" || assignment.kind === "not_assessed";
    if (nullConceptKind !== (assignment.conceptRef === null)) {
      fail(
        "INVALID_ASSIGNMENT",
        `${path}/conceptRef`,
        "assignment kind and concept presence do not match",
      );
    }
    if (
      (assignment.kind === "source_provided") !==
      (assignment.sourceProvidedLabel !== null)
    ) {
      fail(
        "INVALID_ASSIGNMENT",
        `${path}/sourceProvidedLabel`,
        "only a source-provided assignment may carry an exact source label",
      );
    }

    const authority = resolveLocal(
      catalogs.authorityBindings,
      catalogs,
      assignment.authorityBindingRef,
      "authorityBinding",
      `${path}/authorityBindingRef`,
    );
    const conceptOwner =
      conceptNamespace === null
        ? null
        : resolveLocal(
            catalogs.authorityBindings,
            catalogs,
            conceptNamespace.ownerAuthorityBindingRef,
            "authorityBinding",
            `${path}/conceptRef/namespaceRef`,
          );
    let expectedEvidenceKind: TaxonomyEvidenceKind;
    let expectedReviewKind: TaxonomyReviewKind;
    if (assignment.kind === "source_provided") {
      if (
        conceptNamespace?.role !== "source_native" ||
        authority.role !== "source_classifier" ||
        authority.authorityClass !== "synthetic_source" ||
        conceptOwner === null ||
        !sameRef(
          authority.authorityIdentityRef,
          conceptOwner.authorityIdentityRef,
        ) ||
        authority.authorityClass !== conceptOwner.authorityClass ||
        !sameScope(authority.scope, conceptNamespace.scope) ||
        concept?.kind !== "authority_native" ||
        assignment.sourceProvidedLabel === null ||
        conceptNamespace.scope.kind !== "source_region" ||
        assignment.sourceProvidedLabel.sourceId !==
          conceptNamespace.scope.sourceId ||
        assignment.sourceProvidedLabel.scheme !==
          conceptNamespace.officialSubjectScheme ||
        assignment.sourceProvidedLabel.label !== concept.preferredLabel
      ) {
        fail(
          "INVALID_SOURCE_LABEL",
          `${path}/sourceProvidedLabel`,
          "source label, concept, source scope, or classifier is not exact",
        );
      }
      expectedEvidenceKind = "source_documentation";
      expectedReviewKind = "source_verified";
    } else if (assignment.kind === "authority_configured") {
      if (
        conceptNamespace?.role !== "community_deployment" ||
        authority.role !== "community_configurator" ||
        authority.authorityClass !== "synthetic_community" ||
        conceptOwner === null ||
        !sameRef(
          authority.authorityIdentityRef,
          conceptOwner.authorityIdentityRef,
        ) ||
        authority.authorityClass !== conceptOwner.authorityClass ||
        !sameRef(
          conceptNamespace.scope.kind === "deployment_region"
            ? conceptNamespace.scope.deploymentProfileRef
            : { id: "synthetic-invalid", version: "0.0.0" },
          assignment.deploymentProfileRef,
        ) ||
        !sameScope(authority.scope, conceptNamespace.scope)
      ) {
        fail(
          "INVALID_AUTHORITY_BINDING",
          `${path}/authorityBindingRef`,
          "community assignment is not owned by its exact deployment authority",
        );
      }
      expectedEvidenceKind = "authority_configuration";
      expectedReviewKind = "authority_configured";
    } else if (assignment.kind === "analyst_reviewed") {
      if (
        conceptNamespace === null ||
        authority.role !== "analyst_assigner" ||
        authority.authorityClass !== "synthetic_analyst" ||
        authority.scope.kind !== "deployment_region" ||
        !sameRef(
          authority.scope.deploymentProfileRef,
          assignment.deploymentProfileRef,
        )
      ) {
        fail(
          "INVALID_AUTHORITY_BINDING",
          `${path}/authorityBindingRef`,
          "analyst assignment lacks exact deployment-scoped analyst authority",
        );
      }
      expectedEvidenceKind = "analyst_review";
      expectedReviewKind = "analyst_reviewed";
    } else {
      if (
        !["community_configurator", "analyst_assigner"].includes(
          authority.role,
        ) ||
        authority.scope.kind !== "deployment_region" ||
        !sameRef(
          authority.scope.deploymentProfileRef,
          assignment.deploymentProfileRef,
        )
      ) {
        fail(
          "INVALID_AUTHORITY_BINDING",
          `${path}/authorityBindingRef`,
          "epistemic-state assignment lacks exact deployment configuration authority",
        );
      }
      expectedEvidenceKind =
        authority.authorityClass === "synthetic_analyst"
          ? "analyst_review"
          : "authority_configuration";
      expectedReviewKind =
        authority.authorityClass === "synthetic_analyst"
          ? "analyst_reviewed"
          : "authority_configured";
    }

    let exactScope = authority.scope;
    if (assignment.kind === "source_provided" && conceptNamespace !== null) {
      exactScope = conceptNamespace.scope;
    }
    evidenceForGovernedObject(
      assignment.evidenceRefs,
      expectedEvidenceKind,
      authority,
      exactScope,
      assignment.observedAt,
      assignment.state === "accepted",
      catalogs,
      `${path}/evidenceRefs`,
    );
    const reviews = reviewsForGovernedObject(
      "assignment",
      assignment,
      assignment.reviewAttestationRefs,
      assignment.evidenceRefs,
      expectedReviewKind,
      authority,
      assignment.observedAt,
      assignment.state === "accepted",
      catalogs,
      `${path}/reviewAttestationRefs`,
    );
    const expectedState: Partial<
      Record<TaxonomyAssignmentState, TaxonomyReviewState>
    > = {
      pending: "pending",
      disputed: "disputed",
      rejected: "rejected",
      withdrawn: "withdrawn",
    };
    const requiredState = expectedState[assignment.state];
    if (
      requiredState !== undefined &&
      !reviews.some((review) => review.state === requiredState)
    ) {
      fail(
        "INVALID_REVIEW_BINDING",
        `${path}/reviewAttestationRefs`,
        "inactive assignment state lacks its exact review state",
      );
    }

    const semanticKey = [
      assignment.recordId,
      refKey(assignment.deploymentProfileRef),
      assignment.kind,
      assignment.conceptRef === null ? "" : conceptKey(assignment.conceptRef),
      refKey(assignment.targetNamespaceRef),
    ].join("\u0000");
    if (semanticAssignments.has(semanticKey)) {
      fail(
        "DUPLICATE_IDENTITY",
        path,
        "semantic assignment is duplicated under another identity",
      );
    }
    semanticAssignments.add(semanticKey);
  }
}

function scopeAvailableToDeployment(
  scope: TaxonomyAuthorityScope,
  binding: TaxonomyDeploymentBinding,
): boolean {
  if (scope.kind === "bundle") {
    return true;
  }
  if (scope.kind === "source_region" || scope.kind === "region") {
    return sameRef(scope.regionPackRef, binding.regionPackRef);
  }
  return (
    sameRef(scope.deploymentProfileRef, binding.deploymentProfileRef) &&
    sameRef(scope.regionPackRef, binding.regionPackRef)
  );
}

function setContainsReference(
  references: readonly VersionedReference[],
  reference: VersionedReference,
): boolean {
  return references.some((candidate) => sameRef(candidate, reference));
}

function validateDeploymentBindings(
  bundle: TaxonomyBundle,
  catalogs: LocalCatalogs,
): void {
  const boundNamespaces = new Set<string>();
  const boundCrosswalks = new Set<string>();
  const assignmentBindingCounts = new Map<string, number>();
  const seenDeployments = new Set<string>();
  for (const [index, binding] of bundle.deploymentBindings.entries()) {
    const path = `/deploymentBindings/${index}`;
    if (seenDeployments.has(refKey(binding.deploymentProfileRef))) {
      fail(
        "DUPLICATE_IDENTITY",
        `${path}/deploymentProfileRef`,
        "deployment has more than one taxonomy binding",
      );
    }
    seenDeployments.add(refKey(binding.deploymentProfileRef));

    for (const [namespaceIndex, reference] of binding.namespaceRefs.entries()) {
      const namespace = resolveLocal(
        catalogs.namespaces,
        catalogs,
        reference,
        "namespace",
        `${path}/namespaceRefs/${namespaceIndex}`,
      );
      if (!scopeAvailableToDeployment(namespace.scope, binding)) {
        fail(
          "CROSS_SCOPE_REFERENCE",
          `${path}/namespaceRefs/${namespaceIndex}`,
          "namespace is outside this deployment and region",
        );
      }
      boundNamespaces.add(refKey(reference));
    }

    for (const [crosswalkIndex, reference] of binding.crosswalkRefs.entries()) {
      const crosswalk = resolveLocal(
        catalogs.crosswalks,
        catalogs,
        reference,
        "crosswalk",
        `${path}/crosswalkRefs/${crosswalkIndex}`,
      );
      if (!scopeAvailableToDeployment(crosswalk.scope, binding)) {
        fail(
          "CROSS_SCOPE_REFERENCE",
          `${path}/crosswalkRefs/${crosswalkIndex}`,
          "crosswalk is outside this deployment and region",
        );
      }
      if (
        !setContainsReference(
          binding.namespaceRefs,
          crosswalk.sourceConceptRef.namespaceRef,
        ) ||
        crosswalk.targetConceptRefs.some(
          (target) =>
            !setContainsReference(binding.namespaceRefs, target.namespaceRef),
        )
      ) {
        fail(
          "CROSS_SCOPE_REFERENCE",
          `${path}/crosswalkRefs/${crosswalkIndex}`,
          "crosswalk endpoint namespace is not authorized by the binding",
        );
      }
      boundCrosswalks.add(refKey(reference));
    }

    for (const [
      assignmentIndex,
      reference,
    ] of binding.assignmentRefs.entries()) {
      const assignment = resolveLocal(
        catalogs.assignments,
        catalogs,
        reference,
        "assignment",
        `${path}/assignmentRefs/${assignmentIndex}`,
      );
      if (
        !sameRef(assignment.deploymentProfileRef, binding.deploymentProfileRef)
      ) {
        fail(
          "CROSS_SCOPE_REFERENCE",
          `${path}/assignmentRefs/${assignmentIndex}`,
          "assignment crosses deployment",
        );
      }
      if (
        !setContainsReference(
          binding.namespaceRefs,
          assignment.targetNamespaceRef,
        ) ||
        (assignment.conceptRef !== null &&
          !setContainsReference(
            binding.namespaceRefs,
            assignment.conceptRef.namespaceRef,
          ))
      ) {
        fail(
          "CROSS_SCOPE_REFERENCE",
          `${path}/assignmentRefs/${assignmentIndex}`,
          "assignment namespace is not authorized by the binding",
        );
      }
      assignmentBindingCounts.set(
        refKey(reference),
        (assignmentBindingCounts.get(refKey(reference)) ?? 0) + 1,
      );
    }

    const namespaceKeys = new Set(binding.namespaceRefs.map(refKey));
    const crosswalkKeys = new Set(binding.crosswalkRefs.map(refKey));
    const assignmentKeys = new Set(binding.assignmentRefs.map(refKey));
    const personaKeys = new Set<string>();
    for (const [grantIndex, grant] of binding.personaGrants.entries()) {
      const grantPath = `${path}/personaGrants/${grantIndex}`;
      const personaKey = refKey(grant.personaProjectionRef);
      if (personaKeys.has(personaKey)) {
        fail(
          "DUPLICATE_REFERENCE",
          `${grantPath}/personaProjectionRef`,
          "persona has more than one grant in a deployment",
        );
      }
      personaKeys.add(personaKey);
      if (
        grant.namespaceRefs.some(
          (reference) => !namespaceKeys.has(refKey(reference)),
        ) ||
        grant.crosswalkRefs.some(
          (reference) => !crosswalkKeys.has(refKey(reference)),
        ) ||
        grant.assignmentRefs.some(
          (reference) => !assignmentKeys.has(refKey(reference)),
        )
      ) {
        fail(
          "CROSS_SCOPE_REFERENCE",
          grantPath,
          "persona grant exceeds its deployment binding",
        );
      }
      for (const [
        grantNamespaceIndex,
        reference,
      ] of grant.namespaceRefs.entries()) {
        resolveLocal(
          catalogs.namespaces,
          catalogs,
          reference,
          "namespace",
          `${grantPath}/namespaceRefs/${grantNamespaceIndex}`,
        );
      }
      for (const [
        grantCrosswalkIndex,
        reference,
      ] of grant.crosswalkRefs.entries()) {
        const crosswalk = resolveLocal(
          catalogs.crosswalks,
          catalogs,
          reference,
          "crosswalk",
          `${grantPath}/crosswalkRefs/${grantCrosswalkIndex}`,
        );
        if (
          !setContainsReference(
            grant.namespaceRefs,
            crosswalk.sourceConceptRef.namespaceRef,
          ) ||
          crosswalk.targetConceptRefs.some(
            (target) =>
              !setContainsReference(grant.namespaceRefs, target.namespaceRef),
          )
        ) {
          fail(
            "CROSS_SCOPE_REFERENCE",
            `${grantPath}/crosswalkRefs/${grantCrosswalkIndex}`,
            "persona grant omits a crosswalk endpoint namespace",
          );
        }
      }
      for (const [
        grantAssignmentIndex,
        reference,
      ] of grant.assignmentRefs.entries()) {
        const assignment = resolveLocal(
          catalogs.assignments,
          catalogs,
          reference,
          "assignment",
          `${grantPath}/assignmentRefs/${grantAssignmentIndex}`,
        );
        if (
          !setContainsReference(
            grant.namespaceRefs,
            assignment.targetNamespaceRef,
          ) ||
          (assignment.conceptRef !== null &&
            !setContainsReference(
              grant.namespaceRefs,
              assignment.conceptRef.namespaceRef,
            ))
        ) {
          fail(
            "CROSS_SCOPE_REFERENCE",
            `${grantPath}/assignmentRefs/${grantAssignmentIndex}`,
            "persona grant omits an assignment namespace",
          );
        }
      }
    }
  }

  if (
    bundle.namespaces.some(
      (namespace) => !boundNamespaces.has(refKey(namespace)),
    )
  ) {
    fail(
      "UNKNOWN_REFERENCE",
      "/deploymentBindings",
      "a namespace is not bound to any deployment",
    );
  }
  if (
    bundle.crosswalks.some(
      (crosswalk) => !boundCrosswalks.has(refKey(crosswalk)),
    )
  ) {
    fail(
      "UNKNOWN_REFERENCE",
      "/deploymentBindings",
      "a crosswalk is not bound to any deployment",
    );
  }
  for (const assignment of bundle.assignments) {
    if (assignmentBindingCounts.get(refKey(assignment)) !== 1) {
      fail(
        "CROSS_SCOPE_REFERENCE",
        "/deploymentBindings",
        "each assignment must be bound exactly once",
      );
    }
  }
}

function profileMap<T extends VersionedReference>(
  values: readonly T[],
): ReadonlyMap<string, T> {
  return new Map(values.map((value) => [refKey(value), value]));
}

function resolveProfileReference<T extends VersionedReference>(
  map: ReadonlyMap<string, T>,
  reference: VersionedReference,
  path: string,
): T {
  const value = map.get(refKey(reference));
  if (value === undefined) {
    fail(
      "UNKNOWN_REFERENCE",
      path,
      "reference does not resolve in the profile bundle",
    );
  }
  return value;
}

interface ProfileCatalogs {
  readonly regions: ReadonlyMap<
    string,
    ProjectionProfileBundle["regionPacks"][number]
  >;
  readonly deployments: ReadonlyMap<
    string,
    ProjectionProfileBundle["deploymentProfiles"][number]
  >;
  readonly personas: ReadonlyMap<
    string,
    ProjectionProfileBundle["personaProjections"][number]
  >;
  readonly outputs: ReadonlyMap<
    string,
    ProjectionProfileBundle["outputAdapters"][number]
  >;
}

function makeProfileCatalogs(
  profile: ProjectionProfileBundle,
): ProfileCatalogs {
  return {
    regions: profileMap(profile.regionPacks),
    deployments: profileMap(profile.deploymentProfiles),
    personas: profileMap(profile.personaProjections),
    outputs: profileMap(profile.outputAdapters),
  };
}

function validateScopeAgainstProfile(
  scope: TaxonomyAuthorityScope,
  profiles: ProfileCatalogs,
  path: string,
): void {
  if (scope.kind === "bundle") {
    return;
  }
  const region = resolveProfileReference(
    profiles.regions,
    scope.regionPackRef,
    `${path}/regionPackRef`,
  );
  if (scope.kind === "source_region") {
    if (!region.sourceIds.includes(scope.sourceId)) {
      fail(
        "CROSS_SCOPE_REFERENCE",
        `${path}/sourceId`,
        "source is outside the exact profile region",
      );
    }
    return;
  }
  if (scope.kind === "deployment_region") {
    const deployment = resolveProfileReference(
      profiles.deployments,
      scope.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    );
    if (
      deployment.authorityState !== "synthetic_demo" ||
      !sameRef(deployment.regionPackRef, region)
    ) {
      fail(
        deployment.authorityState !== "synthetic_demo"
          ? "UNAUTHORIZED_PROJECTION"
          : "CROSS_SCOPE_REFERENCE",
        path,
        "deployment scope is not an exact synthetic-demo region binding",
      );
    }
  }
}

function retainedConceptAvailableInRegion(
  concept: RetainedGeneralTaxonomyConcept,
  region: ProjectionProfileBundle["regionPacks"][number],
): boolean {
  const reference = concept.retainedTaxonomyRef;
  return (
    region.taxonomy.version === reference.taxonomyVersion &&
    (region.taxonomy.taxonomyIds.includes(reference.categoryId) ||
      (reference.subcategoryId !== null &&
        region.taxonomy.taxonomyIds.includes(reference.subcategoryId)))
  );
}

function validateProfileBindings(
  profile: ProjectionProfileBundle,
  bundle: TaxonomyBundle,
  catalogs: LocalCatalogs,
): ProfileCatalogs {
  if (!sameRef(bundle.profileBundleRef, profile)) {
    fail(
      "UNKNOWN_REFERENCE",
      "/profileBundleRef",
      "profile bundle reference does not match the parsed profile",
    );
  }
  const profiles = makeProfileCatalogs(profile);

  for (const [index, authority] of bundle.authorityBindings.entries()) {
    validateScopeAgainstProfile(
      authority.scope,
      profiles,
      `/authorityBindings/${index}/scope`,
    );
  }
  for (const [index, namespace] of bundle.namespaces.entries()) {
    validateScopeAgainstProfile(
      namespace.scope,
      profiles,
      `/namespaces/${index}/scope`,
    );
  }
  for (const [index, crosswalk] of bundle.crosswalks.entries()) {
    validateScopeAgainstProfile(
      crosswalk.scope,
      profiles,
      `/crosswalks/${index}/scope`,
    );
  }
  for (const [index, assignment] of bundle.assignments.entries()) {
    const deployment = resolveProfileReference(
      profiles.deployments,
      assignment.deploymentProfileRef,
      `/assignments/${index}/deploymentProfileRef`,
    );
    if (deployment.authorityState !== "synthetic_demo") {
      fail(
        "UNAUTHORIZED_PROJECTION",
        `/assignments/${index}/deploymentProfileRef`,
        "assignment deployment is not synthetic-demo authorized",
      );
    }
  }

  for (const [index, binding] of bundle.deploymentBindings.entries()) {
    const path = `/deploymentBindings/${index}`;
    const deployment = resolveProfileReference(
      profiles.deployments,
      binding.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    );
    const region = resolveProfileReference(
      profiles.regions,
      binding.regionPackRef,
      `${path}/regionPackRef`,
    );
    if (
      deployment.authorityState !== "synthetic_demo" ||
      !sameRef(deployment.regionPackRef, region)
    ) {
      fail(
        deployment.authorityState !== "synthetic_demo"
          ? "UNAUTHORIZED_PROJECTION"
          : "CROSS_SCOPE_REFERENCE",
        path,
        "binding is not the exact synthetic-demo deployment region",
      );
    }
    for (const [crosswalkIndex, reference] of binding.crosswalkRefs.entries()) {
      const crosswalk = resolveLocal(
        catalogs.crosswalks,
        catalogs,
        reference,
        "crosswalk",
        `${path}/crosswalkRefs/${crosswalkIndex}`,
      );
      for (const [
        targetIndex,
        targetRef,
      ] of crosswalk.targetConceptRefs.entries()) {
        const target = resolveConcept(
          targetRef,
          catalogs,
          `${path}/crosswalkRefs/${crosswalkIndex}/targetConceptRefs/${targetIndex}`,
        );
        if (
          target.kind !== "retained_general_reference" ||
          !retainedConceptAvailableInRegion(target, region)
        ) {
          fail(
            "CROSS_SCOPE_REFERENCE",
            `${path}/crosswalkRefs/${crosswalkIndex}`,
            "crosswalk target is outside the profile region taxonomy scope",
          );
        }
      }
    }
    for (const [grantIndex, grant] of binding.personaGrants.entries()) {
      const grantPath = `${path}/personaGrants/${grantIndex}`;
      const persona = resolveProfileReference(
        profiles.personas,
        grant.personaProjectionRef,
        `${grantPath}/personaProjectionRef`,
      );
      if (
        !sameRef(persona.deploymentProfileRef, deployment) ||
        persona.visibility !== "public"
      ) {
        fail(
          "CROSS_SCOPE_REFERENCE",
          `${grantPath}/personaProjectionRef`,
          "persona does not belong to the exact public deployment",
        );
      }
      for (const [
        outputIndex,
        outputRef,
      ] of grant.outputAdapterRefs.entries()) {
        resolveProfileReference(
          profiles.outputs,
          outputRef,
          `${grantPath}/outputAdapterRefs/${outputIndex}`,
        );
        if (
          !persona.outputAdapterRefs.some((candidate) =>
            sameRef(candidate, outputRef),
          )
        ) {
          fail(
            "UNAUTHORIZED_PROJECTION",
            `${grantPath}/outputAdapterRefs/${outputIndex}`,
            "output is not configured for this exact persona",
          );
        }
      }
    }
  }
  return profiles;
}

interface EngineRecordView {
  readonly record: JsonObject;
  readonly internalId: string;
  readonly sourceId: string;
  readonly officialSubjects: readonly {
    readonly scheme: string;
    readonly label: string;
  }[];
  readonly taxonomyMembershipCount: number;
  readonly isUnclassified: boolean;
}

interface EngineViewRecordReference {
  readonly recordId: string;
}

interface EngineViewShape extends VersionedReference {
  readonly deploymentProfileRef: VersionedReference;
  readonly personaProjectionRef: VersionedReference;
  readonly outputAdapterRefs: readonly VersionedReference[];
  readonly recordReferences: readonly EngineViewRecordReference[];
}

interface ValidatedEngineProjection {
  readonly records: ReadonlyMap<string, EngineRecordView>;
  readonly views: ReadonlyMap<string, EngineViewShape>;
}

function validateAssignmentRecords(
  bundle: TaxonomyBundle,
  engine: ValidatedEngineProjection,
): void {
  for (const [index, assignment] of bundle.assignments.entries()) {
    const path = `/assignments/${index}`;
    const record = engine.records.get(assignment.recordId);
    if (record === undefined) {
      fail(
        "INVALID_RECORD",
        `${path}/recordId`,
        "assignment record does not exist",
      );
    }
    if (assignment.kind === "source_provided") {
      const label = assignment.sourceProvidedLabel;
      if (
        label === null ||
        label.sourceId !== record.sourceId ||
        !record.officialSubjects.some(
          (subject) =>
            subject.scheme === label.scheme && subject.label === label.label,
        )
      ) {
        fail(
          "INVALID_SOURCE_LABEL",
          `${path}/sourceProvidedLabel`,
          "source-provided label does not match the canonical record exactly",
        );
      }
    }
    if (
      assignment.kind === "unclassified" &&
      (record.taxonomyMembershipCount !== 0 || !record.isUnclassified)
    ) {
      fail(
        "INVALID_ASSIGNMENT",
        `${path}/kind`,
        "unclassified assignment does not mirror the exact legacy record state",
      );
    }
    if (
      assignment.kind !== "unclassified" &&
      assignment.kind !== "not_assessed" &&
      record.isUnclassified &&
      record.taxonomyMembershipCount !== 0
    ) {
      fail(
        "INVALID_RECORD",
        `${path}/recordId`,
        "legacy record has an internally inconsistent classification state",
      );
    }
  }
}

function validateExactPolicyRecordContracts(
  engine: ValidatedEngineProjection,
): void {
  for (const [index, record] of [...engine.records.values()].entries()) {
    const recordBefore = encodeCanonical(record.record as JsonValue);
    if (!validatePolicyRecord14Schema(record.record)) {
      fail(
        "INVALID_RECORD",
        `/engineProjection/records/${index}`,
        "record does not satisfy the closed PolicyRecord 1.4 schema",
      );
    }
    if (encodeCanonical(record.record as JsonValue) !== recordBefore) {
      fail(
        "INVALID_RECORD",
        `/engineProjection/records/${index}`,
        "record schema validation mutated its input",
      );
    }
    if ((record.taxonomyMembershipCount === 0) !== record.isUnclassified) {
      fail(
        "INVALID_RECORD",
        `/engineProjection/records/${index}/isUnclassified`,
        "legacy taxonomy membership and Unclassified state are inconsistent",
      );
    }
  }
}

function parseProjectionRequest(value: unknown): TaxonomyProjectionRequest {
  assertPlainJson(value, "$request");
  const object = expectObject(value, "$request", [
    "deploymentProfileRef",
    "personaProjectionRef",
    "outputAdapterRef",
    "requestedVisibility",
    "asOf",
  ]);
  return {
    deploymentProfileRef: parseReference(
      object.deploymentProfileRef,
      "/request/deploymentProfileRef",
    ),
    personaProjectionRef: parseReference(
      object.personaProjectionRef,
      "/request/personaProjectionRef",
    ),
    outputAdapterRef: parseReference(
      object.outputAdapterRef,
      "/request/outputAdapterRef",
    ),
    requestedVisibility: expectLiteral(
      object.requestedVisibility,
      "public",
      "/request/requestedVisibility",
    ),
    asOf: expectDate(object.asOf, "/request/asOf"),
  };
}

function hasAcceptedReviewBy(
  references: readonly VersionedReference[],
  asOf: string,
  catalogs: LocalCatalogs,
): boolean {
  return references.some((reference) => {
    const review = catalogs.reviewAttestations.get(refKey(reference));
    return (
      review?.state === "accepted" && review.reviewedAt.slice(0, 10) <= asOf
    );
  });
}

function eligibleOnDate(
  crosswalk: TaxonomyCrosswalk,
  asOf: string,
  catalogs: LocalCatalogs,
): boolean {
  return (
    crosswalk.lifecycleState === "active" &&
    crosswalk.observedAt.slice(0, 10) <= asOf &&
    crosswalk.effectivePeriod.from <= asOf &&
    (crosswalk.effectivePeriod.through === null ||
      asOf <= crosswalk.effectivePeriod.through) &&
    hasAcceptedReviewBy(crosswalk.reviewAttestationRefs, asOf, catalogs)
  );
}

function uniqueReferenceSet(
  references: readonly VersionedReference[],
): readonly VersionedReference[] {
  const values = new Map<string, VersionedReference>();
  for (const reference of references) {
    values.set(refKey(reference), { ...reference });
  }
  return [...values.values()].sort(compareRef);
}

function assignmentOnlyClassification(
  assignment: TaxonomyAssignment,
  state: "unmapped" | "not_assessed" | "unclassified",
): TaxonomyClassificationReference {
  return {
    recordId: assignment.recordId,
    assignmentRef: { id: assignment.id, version: assignment.version },
    assignmentKind: assignment.kind,
    resolutionState: state,
    sourceConceptRef:
      assignment.conceptRef === null
        ? null
        : {
            namespaceRef: { ...assignment.conceptRef.namespaceRef },
            conceptRef: { ...assignment.conceptRef.conceptRef },
          },
    targetNamespaceRef: { ...assignment.targetNamespaceRef },
    targetConceptRef: null,
    crosswalkRef: null,
    authorityBindingRefs: [{ ...assignment.authorityBindingRef }],
    evidenceRefs: assignment.evidenceRefs.map((reference) => ({
      ...reference,
    })),
    reviewAttestationRefs: assignment.reviewAttestationRefs.map(
      (reference) => ({
        ...reference,
      }),
    ),
    nonClaims: [...REQUIRED_TAXONOMY_NONCLAIMS],
  };
}

function mappedClassifications(
  assignment: TaxonomyAssignment,
  crosswalks: readonly TaxonomyCrosswalk[],
): readonly TaxonomyClassificationReference[] {
  return crosswalks.flatMap((crosswalk) =>
    crosswalk.targetConceptRefs.map((target) => ({
      recordId: assignment.recordId,
      assignmentRef: { id: assignment.id, version: assignment.version },
      assignmentKind: assignment.kind,
      resolutionState: "mapped" as const,
      sourceConceptRef:
        assignment.conceptRef === null
          ? null
          : {
              namespaceRef: { ...assignment.conceptRef.namespaceRef },
              conceptRef: { ...assignment.conceptRef.conceptRef },
            },
      targetNamespaceRef: { ...assignment.targetNamespaceRef },
      targetConceptRef: {
        namespaceRef: { ...target.namespaceRef },
        conceptRef: { ...target.conceptRef },
      },
      crosswalkRef: { id: crosswalk.id, version: crosswalk.version },
      authorityBindingRefs: uniqueReferenceSet([
        assignment.authorityBindingRef,
        crosswalk.authorizerAuthorityBindingRef,
      ]),
      evidenceRefs: uniqueReferenceSet([
        ...assignment.evidenceRefs,
        ...crosswalk.evidenceRefs,
      ]),
      reviewAttestationRefs: uniqueReferenceSet([
        ...assignment.reviewAttestationRefs,
        ...crosswalk.reviewAttestationRefs,
      ]),
      nonClaims: [...REQUIRED_TAXONOMY_NONCLAIMS],
    })),
  );
}

function classificationOrderKey(
  classification: TaxonomyClassificationReference,
): string {
  return [
    classification.recordId,
    classification.sourceConceptRef === null
      ? ""
      : conceptKey(classification.sourceConceptRef),
    classification.targetConceptRef === null
      ? ""
      : conceptKey(classification.targetConceptRef),
    classification.crosswalkRef === null
      ? ""
      : refKey(classification.crosswalkRef),
    refKey(classification.assignmentRef),
  ].join("\u0002");
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
  assertPlainJson(value, "$canonical");
  return deepFreeze(JSON.parse(encodeCanonical(value)) as T);
}

export function serializeTaxonomyProjection(
  projection: TaxonomyProjection,
): string {
  assertPlainJson(projection, "$projection");
  return encodeCanonical(projection);
}

export function createTaxonomyRuntime({
  taxonomyConfig,
  projectionConfiguration,
}: {
  readonly taxonomyConfig: TaxonomyConfig;
  readonly projectionConfiguration: ProjectionConfiguration;
}) {
  const { createEngineProjection, parseProjectionProfileBundle } =
    createProjectionRuntime(projectionConfiguration);
  function validateNamespaces(
    bundle: TaxonomyBundle,
    catalogs: LocalCatalogs,
  ): void {
    const namespaceVersions = new Map<string, string>();
    for (const [index, namespace] of bundle.namespaces.entries()) {
      const priorVersion = namespaceVersions.get(namespace.id);
      if (priorVersion !== undefined && priorVersion !== namespace.version) {
        fail(
          "INVALID_LINEAGE",
          `/namespaces/${index}/version`,
          "namespace v1 has no predecessor contract and permits one version per stable identity",
        );
      }
      namespaceVersions.set(namespace.id, namespace.version);
    }
    const general = bundle.namespaces.filter(
      (namespace) => namespace.role === "project_general",
    );
    if (general.length !== 1) {
      fail(
        "INVALID_NAMESPACE",
        "/namespaces",
        "exactly one retained project-general namespace is required",
      );
    }
    for (const [index, namespace] of bundle.namespaces.entries()) {
      const owner = resolveLocal(
        catalogs.authorityBindings,
        catalogs,
        namespace.ownerAuthorityBindingRef,
        "authorityBinding",
        `/namespaces/${index}/ownerAuthorityBindingRef`,
      );
      if (
        owner.role !== "vocabulary_owner" ||
        owner.authorityClass !== NAMESPACE_CLASSES[namespace.role] ||
        !sameScope(owner.scope, namespace.scope) ||
        namespace.scope.kind !== NAMESPACE_SCOPE_KINDS[namespace.role]
      ) {
        fail(
          "INVALID_NAMESPACE",
          `/namespaces/${index}/ownerAuthorityBindingRef`,
          "namespace ownership does not match role, class, and exact scope",
        );
      }
      if (
        (namespace.role === "project_general") !==
        (namespace.retainedTaxonomyVersion === "1.0.0")
      ) {
        fail(
          "INVALID_NAMESPACE",
          `/namespaces/${index}/retainedTaxonomyVersion`,
          "only the project-general namespace may reference retained taxonomy v1",
        );
      }
      if (
        (namespace.role === "source_native") !==
        (namespace.officialSubjectScheme !== null)
      ) {
        fail(
          "INVALID_NAMESPACE",
          `/namespaces/${index}/officialSubjectScheme`,
          "only a source-native namespace may declare an official subject scheme",
        );
      }
      if (
        namespace.role === "project_general" &&
        (namespace.vocabularyVersion !== taxonomyConfig.taxonomyVersion ||
          namespace.status !== "active")
      ) {
        fail(
          "INVALID_TAXONOMY_REFERENCE",
          `/namespaces/${index}`,
          "retained taxonomy namespace must bind the active canonical v1 vocabulary",
        );
      }
    }
  }

  function validateRetainedTaxonomyReference(
    concept: RetainedGeneralTaxonomyConcept,
    path: string,
  ): void {
    if (
      concept.retainedTaxonomyRef.taxonomyVersion !==
      taxonomyConfig.taxonomyVersion
    ) {
      fail(
        "INVALID_TAXONOMY_REFERENCE",
        `${path}/retainedTaxonomyRef/taxonomyVersion`,
        "retained taxonomy version does not match the canonical configuration",
      );
    }
    const category = taxonomyConfig.categories.find(
      (candidate) => candidate.id === concept.retainedTaxonomyRef.categoryId,
    );
    if (category === undefined) {
      fail(
        "INVALID_TAXONOMY_REFERENCE",
        `${path}/retainedTaxonomyRef/categoryId`,
        "retained category reference does not resolve",
      );
    }
    if (
      concept.retainedTaxonomyRef.subcategoryId !== null &&
      !category.subcategories.some(
        (subcategory) =>
          subcategory.id === concept.retainedTaxonomyRef.subcategoryId,
      )
    ) {
      fail(
        "INVALID_TAXONOMY_REFERENCE",
        `${path}/retainedTaxonomyRef/subcategoryId`,
        "retained subcategory reference is not owned by the exact category",
      );
    }
  }

  function validateConcepts(
    bundle: TaxonomyBundle,
    catalogs: LocalCatalogs,
  ): void {
    const labelOwners = new Map<string, string>();
    const codeOwners = new Map<string, string>();
    const retainedOwners = new Map<string, string>();
    for (const [index, concept] of bundle.concepts.entries()) {
      const path = `/concepts/${index}`;
      const namespace = resolveLocal(
        catalogs.namespaces,
        catalogs,
        concept.namespaceRef,
        "namespace",
        `${path}/namespaceRef`,
      );
      if (
        (namespace.role === "project_general") !==
        (concept.kind === "retained_general_reference")
      ) {
        fail(
          "INVALID_NAMESPACE",
          `${path}/kind`,
          "concept kind does not match its namespace role",
        );
      }
      if (concept.kind === "retained_general_reference") {
        validateRetainedTaxonomyReference(concept, path);
        const retainedKey = `${refKey(namespace)}\u0000${retainedReferenceKey(concept)}`;
        const priorOwner = retainedOwners.get(retainedKey);
        if (priorOwner !== undefined && priorOwner !== concept.id) {
          fail(
            "DUPLICATE_IDENTITY",
            `${path}/retainedTaxonomyRef`,
            "retained taxonomy endpoint has more than one concept identity",
          );
        }
        retainedOwners.set(retainedKey, concept.id);
      } else {
        const owner = `${refKey(namespace)}\u0000${concept.id}`;
        const codeKey = `${refKey(namespace)}\u0000${concept.code}`;
        const priorCodeOwner = codeOwners.get(codeKey);
        if (priorCodeOwner !== undefined && priorCodeOwner !== owner) {
          fail(
            "DUPLICATE_IDENTITY",
            `${path}/code`,
            "authority-native code is reused in one namespace",
          );
        }
        codeOwners.set(codeKey, owner);
        for (const label of [
          concept.preferredLabel,
          ...concept.alternateLabels,
        ]) {
          const labelKey = `${refKey(namespace)}\u0000${label}`;
          const priorLabelOwner = labelOwners.get(labelKey);
          if (priorLabelOwner !== undefined && priorLabelOwner !== owner) {
            fail(
              "AMBIGUOUS_LABEL",
              `${path}/preferredLabel`,
              "exact label is ambiguous within one namespace",
            );
          }
          labelOwners.set(labelKey, owner);
        }
      }

      if (concept.parentRef !== null) {
        if (!sameRef(concept.parentRef.namespaceRef, concept.namespaceRef)) {
          fail(
            "INVALID_HIERARCHY",
            `${path}/parentRef/namespaceRef`,
            "parent reference crosses namespace",
          );
        }
        if (
          conceptKey(concept.parentRef) ===
          conceptKey(conceptReference(concept))
        ) {
          fail(
            "INVALID_HIERARCHY",
            `${path}/parentRef`,
            "concept cannot be its own parent",
          );
        }
        const parent = resolveConcept(
          concept.parentRef,
          catalogs,
          `${path}/parentRef`,
        );
        if (
          concept.lifecycleState === "active" &&
          parent.lifecycleState !== "active"
        ) {
          fail(
            "INACTIVE_REFERENCE",
            `${path}/parentRef`,
            "active concept cannot depend on an inactive parent",
          );
        }
        if (
          concept.kind === "retained_general_reference" &&
          parent.kind === "retained_general_reference"
        ) {
          const childRef = concept.retainedTaxonomyRef;
          const parentRef = parent.retainedTaxonomyRef;
          if (
            childRef.subcategoryId === null ||
            parentRef.subcategoryId !== null ||
            childRef.categoryId !== parentRef.categoryId
          ) {
            fail(
              "INVALID_HIERARCHY",
              `${path}/parentRef`,
              "retained hierarchy does not match canonical category ownership",
            );
          }
        }
      }
    }

    const visitState = new Map<string, "visiting" | "visited">();
    const visit = (concept: TaxonomyConcept): void => {
      const key = conceptKey(conceptReference(concept));
      const state = visitState.get(key);
      if (state === "visiting") {
        fail(
          "INVALID_HIERARCHY",
          "/concepts",
          "concept parent graph contains a cycle",
        );
      }
      if (state === "visited") {
        return;
      }
      visitState.set(key, "visiting");
      if (concept.parentRef !== null) {
        visit(
          resolveConcept(concept.parentRef, catalogs, "/concepts/parentRef"),
        );
      }
      visitState.set(key, "visited");
    };
    bundle.concepts.forEach(visit);
    validateConceptLineage(bundle, catalogs);
  }

  function validateLocalGraph(bundle: TaxonomyBundle): LocalCatalogs {
    const catalogs = makeCatalogs(bundle);
    validateAuthorityBindings(bundle, catalogs);
    validateNamespaces(bundle, catalogs);
    validateConcepts(bundle, catalogs);
    validateEvidenceAndReviews(bundle, catalogs);
    validateCrosswalks(bundle, catalogs);
    validateAssignments(bundle, catalogs);
    validateDeploymentBindings(bundle, catalogs);
    return catalogs;
  }

  function parseTaxonomyBundle(value: unknown): TaxonomyBundle {
    assertPlainJson(value, "$taxonomyBundle");
    const object = expectObject(value, "$taxonomyBundle", [
      "$schema",
      "schemaVersion",
      "id",
      "version",
      "synthetic",
      "profileBundleRef",
      "authorityBindings",
      "namespaces",
      "concepts",
      "evidenceReferences",
      "reviewAttestations",
      "crosswalks",
      "assignments",
      "deploymentBindings",
    ]);
    const bundle: TaxonomyBundle = {
      $schema: expectLiteral(
        object.$schema,
        TAXONOMY_BUNDLE_SCHEMA_ID,
        "/$schema",
      ),
      schemaVersion: expectLiteral(
        object.schemaVersion,
        TAXONOMY_BUNDLE_SCHEMA_VERSION,
        "/schemaVersion",
      ),
      id: expectStableId(object.id, "/id"),
      version: expectVersion(object.version, "/version"),
      synthetic: expectLiteral(object.synthetic, true, "/synthetic"),
      profileBundleRef: parseReference(
        object.profileBundleRef,
        "/profileBundleRef",
      ),
      authorityBindings: parseCollection(
        object.authorityBindings,
        "/authorityBindings",
        1,
        256,
        parseAuthorityBinding,
        (binding) => refKey(binding),
      ),
      namespaces: parseCollection(
        object.namespaces,
        "/namespaces",
        1,
        128,
        parseNamespace,
        (namespace) => refKey(namespace),
      ),
      concepts: parseCollection(
        object.concepts,
        "/concepts",
        1,
        1024,
        parseConcept,
        (concept) => conceptKey(conceptReference(concept)),
      ),
      evidenceReferences: parseCollection(
        object.evidenceReferences,
        "/evidenceReferences",
        1,
        512,
        parseEvidenceReference,
        (evidence) => refKey(evidence),
      ),
      reviewAttestations: parseCollection(
        object.reviewAttestations,
        "/reviewAttestations",
        1,
        1024,
        parseReviewAttestation,
        (review) => refKey(review),
      ),
      crosswalks: parseCollection(
        object.crosswalks,
        "/crosswalks",
        0,
        1024,
        parseCrosswalk,
        (crosswalk) => refKey(crosswalk),
      ),
      assignments: parseCollection(
        object.assignments,
        "/assignments",
        1,
        2048,
        parseAssignment,
        (assignment) => refKey(assignment),
      ),
      deploymentBindings: parseCollection(
        object.deploymentBindings,
        "/deploymentBindings",
        1,
        128,
        parseDeploymentBinding,
        (binding) => refKey(binding),
      ),
    };
    validateLocalGraph(bundle);
    return canonicalClone(bundle) as TaxonomyBundle;
  }

  function validateEngineProjection(
    value: unknown,
    profile: ProjectionProfileBundle,
    profiles: ProfileCatalogs,
  ): ValidatedEngineProjection {
    assertPlainJson(value, "$engineProjection");
    const object = expectObject(value, "$engineProjection", [
      "schemaVersion",
      "profileBundleRef",
      "records",
      "views",
    ]);
    expectLiteral(
      object.schemaVersion,
      "1.0.0",
      "/engineProjection/schemaVersion",
    );
    const profileBundleRef = parseReference(
      object.profileBundleRef,
      "/engineProjection/profileBundleRef",
    );
    if (!sameRef(profileBundleRef, profile)) {
      fail(
        "INVALID_ENGINE_PROJECTION",
        "/engineProjection/profileBundleRef",
        "engine projection does not bind the exact profile bundle",
      );
    }

    const records = new Map<string, EngineRecordView>();
    for (const [index, valueRecord] of expectArray(
      object.records,
      "/engineProjection/records",
      0,
      4096,
    ).entries()) {
      if (
        valueRecord === null ||
        typeof valueRecord !== "object" ||
        Array.isArray(valueRecord)
      ) {
        fail(
          "INVALID_ENGINE_PROJECTION",
          `/engineProjection/records/${index}`,
          "expected an accepted PolicyRecord object",
        );
      }
      const record = valueRecord as JsonObject;
      if (record.schemaVersion !== "1.4.0") {
        fail(
          "INVALID_RECORD",
          `/engineProjection/records/${index}/schemaVersion`,
          "record schema version is not PolicyRecord 1.4",
        );
      }
      const internalId = expectRecordId(
        record.internalId,
        `/engineProjection/records/${index}/internalId`,
      );
      if (records.has(internalId)) {
        fail(
          "INVALID_ENGINE_PROJECTION",
          `/engineProjection/records/${index}/internalId`,
          "engine projection contains a duplicate record identity",
        );
      }
      if (
        record.source === null ||
        typeof record.source !== "object" ||
        Array.isArray(record.source)
      ) {
        fail(
          "INVALID_ENGINE_PROJECTION",
          `/engineProjection/records/${index}/source`,
          "record source shape is invalid",
        );
      }
      const sourceId = expectStableId(
        (record.source as JsonObject).id,
        `/engineProjection/records/${index}/source/id`,
      );
      const officialSubjects = expectArray(
        record.officialSubjects,
        `/engineProjection/records/${index}/officialSubjects`,
        0,
        256,
      ).map((subject, subjectIndex) => {
        const subjectObject = expectObject(
          subject,
          `/engineProjection/records/${index}/officialSubjects/${subjectIndex}`,
          ["scheme", "label", "sourceUrl"],
        );
        return {
          scheme: expectOpaqueText(
            subjectObject.scheme,
            `/engineProjection/records/${index}/officialSubjects/${subjectIndex}/scheme`,
            128,
          ),
          label: expectOpaqueText(
            subjectObject.label,
            `/engineProjection/records/${index}/officialSubjects/${subjectIndex}/label`,
            256,
          ),
        };
      });
      const taxonomyMemberships = expectArray(
        record.taxonomyMemberships,
        `/engineProjection/records/${index}/taxonomyMemberships`,
        0,
        256,
      );
      if (typeof record.isUnclassified !== "boolean") {
        fail(
          "INVALID_ENGINE_PROJECTION",
          `/engineProjection/records/${index}/isUnclassified`,
          "record classification state is invalid",
        );
      }
      records.set(internalId, {
        record,
        internalId,
        sourceId,
        officialSubjects,
        taxonomyMembershipCount: taxonomyMemberships.length,
        isUnclassified: record.isUnclassified,
      });
    }

    const views = new Map<string, EngineViewShape>();
    for (const [index, valueView] of expectArray(
      object.views,
      "/engineProjection/views",
      0,
      256,
    ).entries()) {
      const path = `/engineProjection/views/${index}`;
      const view = expectObject(valueView, path, [
        "id",
        "version",
        "deploymentProfileRef",
        "personaProjectionRef",
        "outputAdapterRefs",
        "recordReferences",
      ]);
      const parsed: EngineViewShape = {
        id: expectStableId(view.id, `${path}/id`),
        version: expectVersion(view.version, `${path}/version`),
        deploymentProfileRef: parseReference(
          view.deploymentProfileRef,
          `${path}/deploymentProfileRef`,
        ),
        personaProjectionRef: parseReference(
          view.personaProjectionRef,
          `${path}/personaProjectionRef`,
        ),
        outputAdapterRefs: parseReferenceSet(
          view.outputAdapterRefs,
          `${path}/outputAdapterRefs`,
          1,
          32,
        ),
        recordReferences: expectArray(
          view.recordReferences,
          `${path}/recordReferences`,
          0,
          4096,
        ).map((recordReference, recordIndex) => {
          if (
            recordReference === null ||
            typeof recordReference !== "object" ||
            Array.isArray(recordReference)
          ) {
            fail(
              "INVALID_ENGINE_PROJECTION",
              `${path}/recordReferences/${recordIndex}`,
              "view record reference is invalid",
            );
          }
          const recordReferenceObject = expectObject(
            recordReference,
            `${path}/recordReferences/${recordIndex}`,
            ["recordId", "reasons"],
          );
          expectArray(
            recordReferenceObject.reasons,
            `${path}/recordReferences/${recordIndex}/reasons`,
            1,
            128,
          );
          const recordId = expectRecordId(
            recordReferenceObject.recordId,
            `${path}/recordReferences/${recordIndex}/recordId`,
          );
          if (!records.has(recordId)) {
            fail(
              "INVALID_ENGINE_PROJECTION",
              `${path}/recordReferences/${recordIndex}/recordId`,
              "view references a record outside the engine projection",
            );
          }
          return { recordId };
        }),
      };
      const persona = resolveProfileReference(
        profiles.personas,
        parsed.personaProjectionRef,
        `${path}/personaProjectionRef`,
      );
      if (
        !sameRef(parsed, persona) ||
        !sameRef(parsed.deploymentProfileRef, persona.deploymentProfileRef) ||
        !sameReferenceSet(parsed.outputAdapterRefs, persona.outputAdapterRefs)
      ) {
        fail(
          "INVALID_ENGINE_PROJECTION",
          path,
          "view does not preserve the exact PNW-01 persona projection",
        );
      }
      if (views.has(refKey(parsed.personaProjectionRef))) {
        fail(
          "INVALID_ENGINE_PROJECTION",
          `${path}/personaProjectionRef`,
          "engine projection contains duplicate persona views",
        );
      }
      views.set(refKey(parsed.personaProjectionRef), parsed);
    }
    if (views.size !== profile.personaProjections.length) {
      fail(
        "INVALID_ENGINE_PROJECTION",
        "/engineProjection/views",
        "engine projection does not contain the exact profile view set",
      );
    }

    let recomputed: EngineProjection;
    try {
      recomputed = createEngineProjection(
        object.records as unknown as readonly PolicyRecord[],
        profile,
      );
    } catch {
      fail(
        "INVALID_ENGINE_PROJECTION",
        "/engineProjection",
        "projection cannot be reproduced by the accepted PNW-01 engine",
      );
    }
    if (
      serializeEngineProjection(recomputed) !==
      encodeCanonical(value as JsonValue)
    ) {
      fail(
        "INVALID_ENGINE_PROJECTION",
        "/engineProjection",
        "projection differs from the exact reproducible PNW-01 output",
      );
    }
    return { records, views };
  }

  function createTaxonomyProjection(
    profileBundle: unknown,
    engineProjection: unknown,
    taxonomyBundle: unknown,
    requestValue: unknown,
  ): TaxonomyProjection {
    // Parse every input before constructing output so any late failure is atomic.
    const profile = parseProjectionProfileBundle(profileBundle);
    const bundle = parseTaxonomyBundle(taxonomyBundle);
    const catalogs = makeCatalogs(bundle);
    const profiles = validateProfileBindings(profile, bundle, catalogs);
    const engine = validateEngineProjection(
      engineProjection,
      profile,
      profiles,
    );
    validateAssignmentRecords(bundle, engine);
    validateExactPolicyRecordContracts(engine);
    const request = parseProjectionRequest(requestValue);

    const binding = bundle.deploymentBindings.find((candidate) =>
      sameRef(candidate.deploymentProfileRef, request.deploymentProfileRef),
    );
    if (binding === undefined) {
      fail(
        "UNAUTHORIZED_PROJECTION",
        "/request/deploymentProfileRef",
        "no exact taxonomy deployment binding exists",
      );
    }
    const grant = binding.personaGrants.find((candidate) =>
      sameRef(candidate.personaProjectionRef, request.personaProjectionRef),
    );
    if (grant === undefined) {
      fail(
        "UNAUTHORIZED_PROJECTION",
        "/request/personaProjectionRef",
        "no exact taxonomy persona grant exists",
      );
    }
    if (
      !grant.outputAdapterRefs.some((candidate) =>
        sameRef(candidate, request.outputAdapterRef),
      )
    ) {
      fail(
        "UNAUTHORIZED_PROJECTION",
        "/request/outputAdapterRef",
        "output adapter is not granted to this exact persona",
      );
    }
    const view = engine.views.get(refKey(request.personaProjectionRef));
    if (
      view === undefined ||
      !sameRef(view.deploymentProfileRef, request.deploymentProfileRef) ||
      !view.outputAdapterRefs.some((candidate) =>
        sameRef(candidate, request.outputAdapterRef),
      )
    ) {
      fail(
        "INVALID_ENGINE_PROJECTION",
        "/engineProjection/views",
        "PNW-01 view does not close the requested deployment, persona, and output",
      );
    }
    const viewRecords = new Set(
      view.recordReferences.map((reference) => reference.recordId),
    );
    const bindingCrosswalks = binding.crosswalkRefs.map((reference, index) =>
      resolveLocal(
        catalogs.crosswalks,
        catalogs,
        reference,
        "crosswalk",
        `/deploymentBindings/crosswalkRefs/${index}`,
      ),
    );
    const grantedCrosswalks = grant.crosswalkRefs.map((reference, index) =>
      resolveLocal(
        catalogs.crosswalks,
        catalogs,
        reference,
        "crosswalk",
        `/deploymentBindings/personaGrants/crosswalkRefs/${index}`,
      ),
    );

    const classifications: TaxonomyClassificationReference[] = [];
    for (const [index, reference] of grant.assignmentRefs.entries()) {
      const assignment = resolveLocal(
        catalogs.assignments,
        catalogs,
        reference,
        "assignment",
        `/deploymentBindings/personaGrants/assignmentRefs/${index}`,
      );
      if (!viewRecords.has(assignment.recordId)) {
        fail(
          "UNAUTHORIZED_PROJECTION",
          `/deploymentBindings/personaGrants/assignmentRefs/${index}`,
          "assignment record is outside the exact PNW-01 public view",
        );
      }
      if (
        assignment.state !== "accepted" ||
        assignment.visibility !== request.requestedVisibility ||
        assignment.observedAt.slice(0, 10) > request.asOf ||
        !hasAcceptedReviewBy(
          assignment.reviewAttestationRefs,
          request.asOf,
          catalogs,
        )
      ) {
        continue;
      }
      if (assignment.kind === "unclassified") {
        classifications.push(
          assignmentOnlyClassification(assignment, "unclassified"),
        );
        continue;
      }
      if (assignment.kind === "not_assessed") {
        classifications.push(
          assignmentOnlyClassification(assignment, "not_assessed"),
        );
        continue;
      }
      if (assignment.conceptRef === null) {
        fail(
          "INVALID_ASSIGNMENT",
          `/assignments/${bundle.assignments.indexOf(assignment)}/conceptRef`,
          "assessed assignment has no exact concept",
        );
      }
      const matchesEligibleDirectEdge = (crosswalk: TaxonomyCrosswalk) =>
        conceptKey(crosswalk.sourceConceptRef) ===
          conceptKey(assignment.conceptRef as TaxonomyConceptReference) &&
        crosswalk.targetConceptRefs.every((target) =>
          sameRef(target.namespaceRef, assignment.targetNamespaceRef),
        ) &&
        eligibleOnDate(crosswalk, request.asOf, catalogs);
      const eligible = grantedCrosswalks.filter(matchesEligibleDirectEdge);
      const bindingEligible =
        assignment.kind === "unmapped"
          ? bindingCrosswalks.filter(matchesEligibleDirectEdge)
          : eligible;
      if (assignment.kind === "unmapped") {
        if (bindingEligible.length !== 0) {
          fail(
            "INVALID_ASSIGNMENT",
            `/assignments/${bundle.assignments.indexOf(assignment)}/kind`,
            "explicit unmapped state has an eligible accepted direct edge",
          );
        }
        classifications.push(
          assignmentOnlyClassification(assignment, "unmapped"),
        );
        continue;
      }
      if (eligible.length === 0) {
        fail(
          "INVALID_ASSIGNMENT",
          `/assignments/${bundle.assignments.indexOf(assignment)}/conceptRef`,
          "accepted classified assignment lacks an eligible granted direct edge",
        );
      }
      classifications.push(...mappedClassifications(assignment, eligible));
    }

    classifications.sort((left, right) =>
      compareText(classificationOrderKey(left), classificationOrderKey(right)),
    );
    const duplicateOutputs = new Set<string>();
    for (const classification of classifications) {
      const key = classificationOrderKey(classification);
      if (duplicateOutputs.has(key)) {
        fail(
          "MAPPING_CONFLICT",
          "/classifications",
          "projection would emit a duplicate classification reference",
        );
      }
      duplicateOutputs.add(key);
    }

    const projection: TaxonomyProjection = {
      schemaVersion: TAXONOMY_BUNDLE_SCHEMA_VERSION,
      profileBundleRef: { ...bundle.profileBundleRef },
      taxonomyBundleRef: { id: bundle.id, version: bundle.version },
      context: {
        deploymentProfileRef: { ...request.deploymentProfileRef },
        personaProjectionRef: { ...request.personaProjectionRef },
        outputAdapterRef: { ...request.outputAdapterRef },
        requestedVisibility: request.requestedVisibility,
        asOf: request.asOf,
        disclosureState: "authorized_subset_not_comprehensive",
      },
      classifications,
    };
    return canonicalClone(projection) as TaxonomyProjection;
  }

  return { parseTaxonomyBundle, createTaxonomyProjection };
}
