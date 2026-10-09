import type {
  ProjectionProfileBundle,
  RequiredCommunityRelevanceNonClaims,
  VersionedReference,
} from "../../engine/contracts";
import {
  GEOGRAPHY_RIGHTS_SCHEMA_ID,
  GEOGRAPHY_RIGHTS_SCHEMA_VERSION,
  type GeographicRelation,
  type GeographicRelationAllowedInference,
  type GeographicRelationKind,
  type GeographyRightsAuthorityBinding,
  type GeographyRightsAuthorityClass,
  type GeographyRightsAuthorityRole,
  type GeographyRightsBundle,
  type GeographyRightsDeploymentBinding,
  type GeographyRightsEvidenceReference,
  type GeographyRightsGeometryReference,
  type GeographyRightsPersonaGrant,
  type GeographyRightsProjection,
  type GeographyRightsProjectionRequest,
  type GeographyRightsReviewAttestation,
  type GeographyRightsReviewKind,
  type GeographyRightsReviewState,
  type GeographyRightsSensitivity,
  type GeographyRightsTemporalBound,
  type GeographyRightsTemporalScope,
  type GeographyRightsVisibility,
  type GeographyScopeKind,
  type GeographyScopeReference,
  type RequiredGeographyRightsForbiddenInferences,
  type RightsFrame,
  type RightsFrameAllowedInference,
  type RightsFrameApprovedUse,
  type RightsFrameType,
} from "../../engine/geography-rights-contracts";
import {
  REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS,
  createProjectionRuntime,
  type ProjectionConfiguration,
} from "../../core/projection";

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
type JsonObject = Record<string, unknown>;

const STABLE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const VERSION = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const SOURCE_ID = STABLE_ID;
const LOCATOR = /^[a-z0-9][a-z0-9-]{0,95}$/;
const EVIDENCE_URL =
  /^https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*\.invalid(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*\/?$/;
const OPAQUE_GEOMETRY =
  /^urn:policy-sentinel:synthetic-geography:[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const VISIBILITIES = [
  "public",
  "internal",
  "restricted",
  "privileged",
] as const;
const AUTHORITY_ROLES = [
  "relation_asserting",
  "frame_source",
  "frame_configuration",
  "evidence_source",
  "geometry_custody",
  "geometry_derivation",
  "community_configuration_review",
  "source_verification_review",
  "analyst_review",
  "counsel_review",
  "geometry_review",
] as const;
const AUTHORITY_CLASSES = [
  "synthetic_community",
  "synthetic_source",
  "synthetic_custodian",
  "synthetic_deriver",
  "synthetic_analyst",
  "synthetic_counsel",
] as const;
const SCOPE_KINDS = [
  "administrative_scope",
  "ecological_scope",
  "agreement_scope",
  "project_scope",
  "other_opaque_scope",
] as const;
const REVIEW_KINDS = [
  "community_configured",
  "source_verified",
  "analyst_reviewed",
  "counsel_reviewed",
  "geometry_reviewed",
] as const;
const REVIEW_STATES = ["accepted", "pending", "rejected"] as const;
const RELATION_KINDS = [
  "reservation_boundary",
  "trust_land",
  "reservation_fee_land",
  "allotted_land",
  "ceded_territory",
  "usual_and_accustomed_area",
  "ancestral_territory",
  "service_area",
  "co_management_area",
  "adjudicated_or_reserved_rights_geography",
  "watershed",
  "species_range",
  "project_footprint",
  "intergovernmental_service_or_agreement_area",
] as const;
const FRAME_TYPES = [
  "treaty",
  "tribal_law",
  "code",
  "plan",
  "resolution",
  "compact",
  "statute",
  "adjudication",
  "litigation_record",
  "agreement",
  "other_approved_authority",
] as const;
const RELATION_ALLOWED = [
  "asserted_relation_reference",
  "configured_monitoring_scope",
] as const;
const FRAME_ALLOWED = [
  "configured_frame_reference",
  "source_citation_reference",
] as const;
const APPROVED_USES = [
  "monitoring_context",
  "source_reference",
  "human_review_context",
] as const;

export const REQUIRED_GEOGRAPHY_RIGHTS_FORBIDDEN_INFERENCES = [
  "not_identity_evidence",
  "not_ownership_or_land_status_evidence",
  "not_jurisdiction_evidence",
  "not_legal_applicability_evidence",
  "not_rights_impact_violation_remedy_or_outcome_evidence",
  "not_consultation_evidence",
  "not_affiliation_membership_consent_or_endorsement_evidence",
  "not_program_or_grant_eligibility_evidence",
  "not_urgency_priority_or_recommended_action",
  "not_community_position_evidence",
] as const satisfies RequiredGeographyRightsForbiddenInferences;

const ROLE_CLASSES: Readonly<
  Record<GeographyRightsAuthorityRole, GeographyRightsAuthorityClass>
> = {
  relation_asserting: "synthetic_community",
  frame_source: "synthetic_source",
  frame_configuration: "synthetic_community",
  evidence_source: "synthetic_source",
  geometry_custody: "synthetic_custodian",
  geometry_derivation: "synthetic_deriver",
  community_configuration_review: "synthetic_community",
  source_verification_review: "synthetic_source",
  analyst_review: "synthetic_analyst",
  counsel_review: "synthetic_counsel",
  geometry_review: "synthetic_analyst",
};

const REVIEW_ROLES: Readonly<
  Record<GeographyRightsReviewKind, GeographyRightsAuthorityRole>
> = {
  community_configured: "community_configuration_review",
  source_verified: "source_verification_review",
  analyst_reviewed: "analyst_review",
  counsel_reviewed: "counsel_review",
  geometry_reviewed: "geometry_review",
};

export class GeographyRightsValidationError extends TypeError {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string, detail: string) {
    super(`${code} at ${path}: ${detail}`);
    this.name = "GeographyRightsValidationError";
    this.code = code;
    this.path = path;
  }
}

function fail(code: string, path: string, detail: string): never {
  throw new GeographyRightsValidationError(code, path, detail);
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
    const expectedPrototype = Array.isArray(value)
      ? Array.prototype
      : Object.prototype;
    if (Object.getPrototypeOf(value) !== expectedPrototype) {
      fail("INVALID_JSON", path, "expected a plain JSON container");
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        fail("INVALID_JSON", path, "symbol properties are not accepted");
      }
      if (Array.isArray(value) && key === "length") {
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        !descriptor.enumerable
      ) {
        fail("INVALID_JSON", `${path}/${key}`, "expected a data property");
      }
      assertPlainJsonInternal(descriptor.value, `${path}/${key}`, ancestors);
    }
    if (Array.isArray(value)) {
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
    fail("INVALID_SHAPE", path, "required field is missing");
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
  maximum = 512,
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
  return expectString(value, path, STABLE_ID, 96);
}

function expectVersion(value: unknown, path: string): string {
  return expectString(value, path, VERSION, 64);
}

function expectDate(value: unknown, path: string): string {
  if (typeof value !== "string") {
    fail("INVALID_SHAPE", path, "expected an ISO date");
  }
  const match = DATE.exec(value);
  if (match === null) {
    fail("INVALID_SHAPE", path, "expected an ISO date");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(0);
  parsed.setUTCHours(0, 0, 0, 0);
  parsed.setUTCFullYear(year, month - 1, day);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    fail("INVALID_SHAPE", path, "expected a real calendar date");
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

function parseReference(value: unknown, path: string): VersionedReference {
  const object = expectObject(value, path, ["id", "version"]);
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
  };
}

function assertUniqueReferences(
  values: readonly VersionedReference[],
  path: string,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    const key = refKey(value);
    if (seen.has(key)) {
      fail("DUPLICATE_REFERENCE", path, "duplicate composite reference");
    }
    seen.add(key);
  }
}

function parseReferenceSet(
  value: unknown,
  path: string,
  minimum = 0,
  maximum = 256,
): readonly VersionedReference[] {
  const refs = expectArray(value, path, minimum, maximum).map((entry, index) =>
    parseReference(entry, `${path}/${index}`),
  );
  assertUniqueReferences(refs, path);
  return refs.sort(compareRef);
}

function parseStringSet<T extends string>(
  value: unknown,
  path: string,
  allowed: readonly T[],
  minimum = 1,
  maximum = allowed.length,
): readonly T[] {
  const values = expectArray(value, path, minimum, maximum).map(
    (entry, index) => expectEnum(entry, allowed, `${path}/${index}`),
  );
  if (new Set(values).size !== values.length) {
    fail("DUPLICATE_REFERENCE", path, "duplicate vocabulary value");
  }
  return values.sort(compareText);
}

function parseTemporalBound(
  value: unknown,
  path: string,
): GeographyRightsTemporalBound {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_SHAPE", path, "expected a temporal bound");
  }
  const state = (value as JsonObject).state;
  if (state === "known") {
    const object = expectObject(value, path, ["state", "date"]);
    return { state: "known", date: expectDate(object.date, `${path}/date`) };
  }
  const object = expectObject(value, path, ["state"]);
  return {
    state: expectEnum(
      object.state,
      ["open", "unknown"] as const,
      `${path}/state`,
    ),
  };
}

function parseTemporalScope(
  value: unknown,
  path: string,
): GeographyRightsTemporalScope {
  const object = expectObject(value, path, ["kind", "from", "through"]);
  const from = parseTemporalBound(object.from, `${path}/from`);
  const through = parseTemporalBound(object.through, `${path}/through`);
  if (
    from.state === "known" &&
    through.state === "known" &&
    through.date < from.date
  ) {
    fail("INVALID_TEMPORAL_SCOPE", path, "known interval is reversed");
  }
  return {
    kind: expectLiteral(object.kind, "inclusive_date_range", `${path}/kind`),
    from,
    through,
  };
}

function parseNonClaims(
  value: unknown,
  path: string,
): RequiredCommunityRelevanceNonClaims {
  const entries = expectArray(
    value,
    path,
    REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS.length,
    REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS.length,
  );
  for (const [
    index,
    expected,
  ] of REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS.entries()) {
    if (entries[index] !== expected) {
      fail(
        "INVALID_INFERENCE_LIMIT",
        `${path}/${index}`,
        "mandatory non-claim mismatch",
      );
    }
  }
  return [...REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS];
}

function parseForbidden(
  value: unknown,
  path: string,
): RequiredGeographyRightsForbiddenInferences {
  const entries = expectArray(
    value,
    path,
    REQUIRED_GEOGRAPHY_RIGHTS_FORBIDDEN_INFERENCES.length,
    REQUIRED_GEOGRAPHY_RIGHTS_FORBIDDEN_INFERENCES.length,
  );
  for (const [
    index,
    expected,
  ] of REQUIRED_GEOGRAPHY_RIGHTS_FORBIDDEN_INFERENCES.entries()) {
    if (entries[index] !== expected) {
      fail(
        "INVALID_INFERENCE_LIMIT",
        `${path}/${index}`,
        "mandatory inference limit mismatch",
      );
    }
  }
  return [...REQUIRED_GEOGRAPHY_RIGHTS_FORBIDDEN_INFERENCES];
}

function parseSyntheticBase(value: JsonObject, path: string) {
  return {
    id: expectStableId(value.id, `${path}/id`),
    version: expectVersion(value.version, `${path}/version`),
    synthetic: expectLiteral(value.synthetic, true, `${path}/synthetic`),
  } as const;
}

function parseVisibility(
  value: unknown,
  path: string,
): GeographyRightsVisibility {
  return expectEnum(value, VISIBILITIES, path);
}

function parseAuthorityBinding(
  value: unknown,
  path: string,
): GeographyRightsAuthorityBinding {
  const object = expectObject(value, path, [
    "id",
    "version",
    "synthetic",
    "deploymentProfileRef",
    "authorityIdentityRef",
    "profileAuthorityScopeRef",
    "role",
    "authorityClass",
  ]);
  const role = expectEnum<GeographyRightsAuthorityRole>(
    object.role,
    AUTHORITY_ROLES,
    `${path}/role`,
  );
  const authorityClass = expectEnum<GeographyRightsAuthorityClass>(
    object.authorityClass,
    AUTHORITY_CLASSES,
    `${path}/authorityClass`,
  );
  if (ROLE_CLASSES[role] !== authorityClass) {
    fail(
      "INVALID_AUTHORITY_BINDING",
      `${path}/authorityClass`,
      "authority class does not match its role",
    );
  }
  return {
    ...parseSyntheticBase(object, path),
    deploymentProfileRef: parseReference(
      object.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    ),
    authorityIdentityRef: parseReference(
      object.authorityIdentityRef,
      `${path}/authorityIdentityRef`,
    ),
    profileAuthorityScopeRef: parseReference(
      object.profileAuthorityScopeRef,
      `${path}/profileAuthorityScopeRef`,
    ),
    role,
    authorityClass,
  };
}

function parseScopeReference(
  value: unknown,
  path: string,
): GeographyScopeReference {
  const object = expectObject(value, path, [
    "id",
    "version",
    "synthetic",
    "deploymentProfileRef",
    "kind",
    "visibility",
    "sensitivity",
  ]);
  return {
    ...parseSyntheticBase(object, path),
    deploymentProfileRef: parseReference(
      object.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    ),
    kind: expectEnum<GeographyScopeKind>(
      object.kind,
      SCOPE_KINDS,
      `${path}/kind`,
    ),
    visibility: parseVisibility(object.visibility, `${path}/visibility`),
    sensitivity: parseVisibility(object.sensitivity, `${path}/sensitivity`),
  };
}

function parseEvidenceUrl(value: unknown, path: string): string {
  const url = expectString(value, path, EVIDENCE_URL, 512);
  if (/\s/.test(url) || /%(?![0-9A-Fa-f]{2})/.test(url)) {
    fail(
      "INVALID_SHAPE",
      path,
      "citation URL is not canonical synthetic HTTPS",
    );
  }
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname.endsWith(".invalid") ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.port !== ""
    ) {
      fail("INVALID_SHAPE", path, "citation URL is not permitted");
    }
  } catch (error) {
    if (error instanceof GeographyRightsValidationError) {
      throw error;
    }
    fail("INVALID_SHAPE", path, "citation URL is invalid");
  }
  return url;
}

function parseEvidenceReference(
  value: unknown,
  path: string,
): GeographyRightsEvidenceReference {
  const object = expectObject(value, path, [
    "id",
    "version",
    "synthetic",
    "deploymentProfileRef",
    "sourceId",
    "sourceAuthorityBindingRef",
    "citation",
    "observedTemporalScope",
    "visibility",
    "sensitivity",
  ]);
  const citation = expectObject(object.citation, `${path}/citation`, [
    "url",
    "locator",
  ]);
  return {
    ...parseSyntheticBase(object, path),
    deploymentProfileRef: parseReference(
      object.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    ),
    sourceId: expectString(object.sourceId, `${path}/sourceId`, SOURCE_ID, 96),
    sourceAuthorityBindingRef: parseReference(
      object.sourceAuthorityBindingRef,
      `${path}/sourceAuthorityBindingRef`,
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
    observedTemporalScope: parseTemporalScope(
      object.observedTemporalScope,
      `${path}/observedTemporalScope`,
    ),
    visibility: parseVisibility(object.visibility, `${path}/visibility`),
    sensitivity: parseVisibility(object.sensitivity, `${path}/sensitivity`),
  };
}

function parseReviewAttestation(
  value: unknown,
  path: string,
): GeographyRightsReviewAttestation {
  const object = expectObject(value, path, [
    "id",
    "version",
    "synthetic",
    "deploymentProfileRef",
    "kind",
    "state",
    "reviewerAuthorityBindingRef",
    "evidenceRefs",
    "visibility",
    "sensitivity",
  ]);
  return {
    ...parseSyntheticBase(object, path),
    deploymentProfileRef: parseReference(
      object.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    ),
    kind: expectEnum<GeographyRightsReviewKind>(
      object.kind,
      REVIEW_KINDS,
      `${path}/kind`,
    ),
    state: expectEnum<GeographyRightsReviewState>(
      object.state,
      REVIEW_STATES,
      `${path}/state`,
    ),
    reviewerAuthorityBindingRef: parseReference(
      object.reviewerAuthorityBindingRef,
      `${path}/reviewerAuthorityBindingRef`,
    ),
    evidenceRefs: parseReferenceSet(
      object.evidenceRefs,
      `${path}/evidenceRefs`,
      1,
    ),
    visibility: parseVisibility(object.visibility, `${path}/visibility`),
    sensitivity: parseVisibility(object.sensitivity, `${path}/sensitivity`),
  };
}

function parseGeometryReference(
  value: unknown,
  path: string,
): GeographyRightsGeometryReference {
  const object = expectObject(value, path, [
    "id",
    "version",
    "synthetic",
    "deploymentProfileRef",
    "representation",
    "opaqueReference",
    "custodyAuthorityBindingRef",
    "evidenceRefs",
    "reviewAttestationRef",
    "derivation",
    "visibility",
    "sensitivity",
  ]);
  const derivationValue = object.derivation;
  if (
    derivationValue === null ||
    typeof derivationValue !== "object" ||
    Array.isArray(derivationValue)
  ) {
    fail("INVALID_SHAPE", `${path}/derivation`, "expected derivation metadata");
  }
  const kind = (derivationValue as JsonObject).kind;
  const derivation =
    kind === "source_supplied"
      ? (() => {
          const source = expectObject(derivationValue, `${path}/derivation`, [
            "kind",
            "sourceGeometryRef",
            "deriverAuthorityBindingRef",
          ]);
          return {
            kind: expectLiteral(
              source.kind,
              "source_supplied",
              `${path}/derivation/kind`,
            ),
            sourceGeometryRef: expectLiteral(
              source.sourceGeometryRef,
              null,
              `${path}/derivation/sourceGeometryRef`,
            ),
            deriverAuthorityBindingRef: expectLiteral(
              source.deriverAuthorityBindingRef,
              null,
              `${path}/derivation/deriverAuthorityBindingRef`,
            ),
          } as const;
        })()
      : (() => {
          const derived = expectObject(derivationValue, `${path}/derivation`, [
            "kind",
            "sourceGeometryRef",
            "deriverAuthorityBindingRef",
          ]);
          return {
            kind: expectLiteral(
              derived.kind,
              "reviewed_derivative",
              `${path}/derivation/kind`,
            ),
            sourceGeometryRef: parseReference(
              derived.sourceGeometryRef,
              `${path}/derivation/sourceGeometryRef`,
            ),
            deriverAuthorityBindingRef: parseReference(
              derived.deriverAuthorityBindingRef,
              `${path}/derivation/deriverAuthorityBindingRef`,
            ),
          } as const;
        })();
  return {
    ...parseSyntheticBase(object, path),
    deploymentProfileRef: parseReference(
      object.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    ),
    representation: expectLiteral(
      object.representation,
      "opaque_reference",
      `${path}/representation`,
    ),
    opaqueReference: expectString(
      object.opaqueReference,
      `${path}/opaqueReference`,
      OPAQUE_GEOMETRY,
      192,
    ),
    custodyAuthorityBindingRef: parseReference(
      object.custodyAuthorityBindingRef,
      `${path}/custodyAuthorityBindingRef`,
    ),
    evidenceRefs: parseReferenceSet(
      object.evidenceRefs,
      `${path}/evidenceRefs`,
      1,
    ),
    reviewAttestationRef: parseReference(
      object.reviewAttestationRef,
      `${path}/reviewAttestationRef`,
    ),
    derivation,
    visibility: parseVisibility(object.visibility, `${path}/visibility`),
    sensitivity: parseVisibility(object.sensitivity, `${path}/sensitivity`),
  };
}

function parseGeographicRelation(
  value: unknown,
  path: string,
): GeographicRelation {
  const object = expectObject(value, path, [
    "id",
    "version",
    "synthetic",
    "deploymentProfileRef",
    "regionPackRef",
    "subjectRef",
    "objectRef",
    "relationKind",
    "vocabularyVersion",
    "assertingAuthorityBindingRef",
    "evidenceRefs",
    "observedTemporalScope",
    "effectiveTemporalScope",
    "geometryRef",
    "reviewAttestationRefs",
    "visibility",
    "sensitivity",
    "allowedInferences",
    "forbiddenInferences",
    "nonClaims",
    "supersedesRef",
  ]);
  const subject = expectObject(object.subjectRef, `${path}/subjectRef`, [
    "kind",
    "ref",
  ]);
  const governedObject = expectObject(object.objectRef, `${path}/objectRef`, [
    "kind",
    "ref",
  ]);
  return {
    ...parseSyntheticBase(object, path),
    deploymentProfileRef: parseReference(
      object.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    ),
    regionPackRef: parseReference(
      object.regionPackRef,
      `${path}/regionPackRef`,
    ),
    subjectRef: {
      kind: expectLiteral(
        subject.kind,
        "deployment_profile",
        `${path}/subjectRef/kind`,
      ),
      ref: parseReference(subject.ref, `${path}/subjectRef/ref`),
    },
    objectRef: {
      kind: expectLiteral(
        governedObject.kind,
        "governed_scope",
        `${path}/objectRef/kind`,
      ),
      ref: parseReference(governedObject.ref, `${path}/objectRef/ref`),
    },
    relationKind: expectEnum<GeographicRelationKind>(
      object.relationKind,
      RELATION_KINDS,
      `${path}/relationKind`,
    ),
    vocabularyVersion: expectVersion(
      object.vocabularyVersion,
      `${path}/vocabularyVersion`,
    ),
    assertingAuthorityBindingRef: parseReference(
      object.assertingAuthorityBindingRef,
      `${path}/assertingAuthorityBindingRef`,
    ),
    evidenceRefs: parseReferenceSet(
      object.evidenceRefs,
      `${path}/evidenceRefs`,
      1,
    ),
    observedTemporalScope: parseTemporalScope(
      object.observedTemporalScope,
      `${path}/observedTemporalScope`,
    ),
    effectiveTemporalScope: parseTemporalScope(
      object.effectiveTemporalScope,
      `${path}/effectiveTemporalScope`,
    ),
    geometryRef:
      object.geometryRef === null
        ? null
        : parseReference(object.geometryRef, `${path}/geometryRef`),
    reviewAttestationRefs: parseReferenceSet(
      object.reviewAttestationRefs,
      `${path}/reviewAttestationRefs`,
      2,
    ),
    visibility: parseVisibility(object.visibility, `${path}/visibility`),
    sensitivity: parseVisibility(object.sensitivity, `${path}/sensitivity`),
    allowedInferences: parseStringSet<GeographicRelationAllowedInference>(
      object.allowedInferences,
      `${path}/allowedInferences`,
      RELATION_ALLOWED,
    ),
    forbiddenInferences: parseForbidden(
      object.forbiddenInferences,
      `${path}/forbiddenInferences`,
    ),
    nonClaims: parseNonClaims(object.nonClaims, `${path}/nonClaims`),
    supersedesRef:
      object.supersedesRef === null
        ? null
        : parseReference(object.supersedesRef, `${path}/supersedesRef`),
  };
}

function parseRightsFrame(value: unknown, path: string): RightsFrame {
  const object = expectObject(value, path, [
    "id",
    "version",
    "synthetic",
    "deploymentProfileRef",
    "regionPackRef",
    "frameType",
    "vocabularyVersion",
    "sourceAuthorityBindingRef",
    "configurationAuthorityBindingRef",
    "evidenceRefs",
    "reviewAttestationRefs",
    "observedTemporalScope",
    "effectiveTemporalScope",
    "visibility",
    "sensitivity",
    "approvedUses",
    "approvedAudiences",
    "allowedInferences",
    "forbiddenInferences",
    "nonClaims",
    "supersedesRef",
  ]);
  return {
    ...parseSyntheticBase(object, path),
    deploymentProfileRef: parseReference(
      object.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    ),
    regionPackRef: parseReference(
      object.regionPackRef,
      `${path}/regionPackRef`,
    ),
    frameType: expectEnum<RightsFrameType>(
      object.frameType,
      FRAME_TYPES,
      `${path}/frameType`,
    ),
    vocabularyVersion: expectVersion(
      object.vocabularyVersion,
      `${path}/vocabularyVersion`,
    ),
    sourceAuthorityBindingRef: parseReference(
      object.sourceAuthorityBindingRef,
      `${path}/sourceAuthorityBindingRef`,
    ),
    configurationAuthorityBindingRef: parseReference(
      object.configurationAuthorityBindingRef,
      `${path}/configurationAuthorityBindingRef`,
    ),
    evidenceRefs: parseReferenceSet(
      object.evidenceRefs,
      `${path}/evidenceRefs`,
      1,
    ),
    reviewAttestationRefs: parseReferenceSet(
      object.reviewAttestationRefs,
      `${path}/reviewAttestationRefs`,
      2,
    ),
    observedTemporalScope: parseTemporalScope(
      object.observedTemporalScope,
      `${path}/observedTemporalScope`,
    ),
    effectiveTemporalScope: parseTemporalScope(
      object.effectiveTemporalScope,
      `${path}/effectiveTemporalScope`,
    ),
    visibility: parseVisibility(object.visibility, `${path}/visibility`),
    sensitivity: parseVisibility(object.sensitivity, `${path}/sensitivity`),
    approvedUses: parseStringSet<RightsFrameApprovedUse>(
      object.approvedUses,
      `${path}/approvedUses`,
      APPROVED_USES,
    ),
    approvedAudiences: parseStringSet<GeographyRightsVisibility>(
      object.approvedAudiences,
      `${path}/approvedAudiences`,
      VISIBILITIES,
    ),
    allowedInferences: parseStringSet<RightsFrameAllowedInference>(
      object.allowedInferences,
      `${path}/allowedInferences`,
      FRAME_ALLOWED,
    ),
    forbiddenInferences: parseForbidden(
      object.forbiddenInferences,
      `${path}/forbiddenInferences`,
    ),
    nonClaims: parseNonClaims(object.nonClaims, `${path}/nonClaims`),
    supersedesRef:
      object.supersedesRef === null
        ? null
        : parseReference(object.supersedesRef, `${path}/supersedesRef`),
  };
}

function parsePersonaGrant(
  value: unknown,
  path: string,
): GeographyRightsPersonaGrant {
  const object = expectObject(value, path, [
    "id",
    "version",
    "personaProjectionRef",
    "outputAdapterRefs",
    "approvedUses",
    "visibilityClearance",
    "sensitivityClearance",
    "geographicRelationRefs",
    "rightsFrameRefs",
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
    approvedUses: parseStringSet<RightsFrameApprovedUse>(
      object.approvedUses,
      `${path}/approvedUses`,
      APPROVED_USES,
    ),
    visibilityClearance: parseVisibility(
      object.visibilityClearance,
      `${path}/visibilityClearance`,
    ),
    sensitivityClearance: parseVisibility(
      object.sensitivityClearance,
      `${path}/sensitivityClearance`,
    ),
    geographicRelationRefs: parseReferenceSet(
      object.geographicRelationRefs,
      `${path}/geographicRelationRefs`,
    ),
    rightsFrameRefs: parseReferenceSet(
      object.rightsFrameRefs,
      `${path}/rightsFrameRefs`,
    ),
  };
}

function parseDeploymentBinding(
  value: unknown,
  path: string,
): GeographyRightsDeploymentBinding {
  const object = expectObject(value, path, [
    "id",
    "version",
    "deploymentProfileRef",
    "regionPackRef",
    "geographicRelationRefs",
    "rightsFrameRefs",
    "personaGrants",
  ]);
  const grants = expectArray(
    object.personaGrants,
    `${path}/personaGrants`,
    1,
    128,
  ).map((entry, index) =>
    parsePersonaGrant(entry, `${path}/personaGrants/${index}`),
  );
  assertUniqueReferences(grants, `${path}/personaGrants`);
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
    geographicRelationRefs: parseReferenceSet(
      object.geographicRelationRefs,
      `${path}/geographicRelationRefs`,
    ),
    rightsFrameRefs: parseReferenceSet(
      object.rightsFrameRefs,
      `${path}/rightsFrameRefs`,
    ),
    personaGrants: grants.sort(compareRef),
  };
}

function parseCollection<T extends VersionedReference>(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
  parser: (entry: unknown, entryPath: string) => T,
): readonly T[] {
  const parsed = expectArray(value, path, minimum, maximum).map(
    (entry, index) => parser(entry, `${path}/${index}`),
  );
  assertUniqueReferences(parsed, path);
  return parsed.sort(compareRef);
}

type CatalogName =
  | "bundle"
  | "authorityBinding"
  | "scopeReference"
  | "evidenceReference"
  | "reviewAttestation"
  | "geometryReference"
  | "geographicRelation"
  | "rightsFrame"
  | "deploymentBinding"
  | "personaGrant";

interface LocalCatalogs {
  readonly authorityBindings: ReadonlyMap<
    string,
    GeographyRightsAuthorityBinding
  >;
  readonly scopeReferences: ReadonlyMap<string, GeographyScopeReference>;
  readonly evidenceReferences: ReadonlyMap<
    string,
    GeographyRightsEvidenceReference
  >;
  readonly reviewAttestations: ReadonlyMap<
    string,
    GeographyRightsReviewAttestation
  >;
  readonly geometryReferences: ReadonlyMap<
    string,
    GeographyRightsGeometryReference
  >;
  readonly geographicRelations: ReadonlyMap<string, GeographicRelation>;
  readonly rightsFrames: ReadonlyMap<string, RightsFrame>;
  readonly deploymentBindings: ReadonlyMap<
    string,
    GeographyRightsDeploymentBinding
  >;
  readonly kinds: ReadonlyMap<string, CatalogName>;
}

function makeMap<T extends VersionedReference>(values: readonly T[]) {
  return new Map(values.map((value) => [refKey(value), value]));
}

function makeCatalogs(bundle: GeographyRightsBundle): LocalCatalogs {
  const kinds = new Map<string, CatalogName>();
  const add = (kind: CatalogName, values: readonly VersionedReference[]) => {
    for (const value of values) {
      const key = refKey(value);
      if (kinds.has(key)) {
        fail(
          "DUPLICATE_IDENTITY",
          "$bundle",
          "composite identity is reused across declaration kinds",
        );
      }
      kinds.set(key, kind);
    }
  };
  add("bundle", [bundle]);
  add("authorityBinding", bundle.authorityBindings);
  add("scopeReference", bundle.scopeReferences);
  add("evidenceReference", bundle.evidenceReferences);
  add("reviewAttestation", bundle.reviewAttestations);
  add("geometryReference", bundle.geometryReferences);
  add("geographicRelation", bundle.geographicRelations);
  add("rightsFrame", bundle.rightsFrames);
  add("deploymentBinding", bundle.deploymentBindings);
  add(
    "personaGrant",
    bundle.deploymentBindings.flatMap((binding) => binding.personaGrants),
  );
  return {
    authorityBindings: makeMap(bundle.authorityBindings),
    scopeReferences: makeMap(bundle.scopeReferences),
    evidenceReferences: makeMap(bundle.evidenceReferences),
    reviewAttestations: makeMap(bundle.reviewAttestations),
    geometryReferences: makeMap(bundle.geometryReferences),
    geographicRelations: makeMap(bundle.geographicRelations),
    rightsFrames: makeMap(bundle.rightsFrames),
    deploymentBindings: makeMap(bundle.deploymentBindings),
    kinds,
  };
}

function resolveLocal<T extends VersionedReference>(
  map: ReadonlyMap<string, T>,
  catalogs: LocalCatalogs,
  reference: VersionedReference,
  expectedKind: CatalogName,
  path: string,
): T {
  const key = refKey(reference);
  const value = map.get(key);
  if (value !== undefined) {
    return value;
  }
  if (catalogs.kinds.has(key)) {
    fail(
      "WRONG_REFERENCE_TYPE",
      path,
      "reference resolves to the wrong declaration kind",
    );
  }
  fail("UNKNOWN_REFERENCE", path, "reference does not resolve");
}

function requireSameDeployment(
  expected: VersionedReference,
  actual: VersionedReference,
  path: string,
): void {
  if (!sameRef(expected, actual)) {
    fail(
      "CROSS_DEPLOYMENT_REFERENCE",
      path,
      "reference crosses deployment scope",
    );
  }
}

function restrictionRank(value: GeographyRightsVisibility): number {
  return VISIBILITIES.indexOf(value);
}

function requireMonotonic(
  container: {
    readonly visibility: GeographyRightsVisibility;
    readonly sensitivity: GeographyRightsSensitivity;
  },
  dependency: {
    readonly visibility: GeographyRightsVisibility;
    readonly sensitivity: GeographyRightsSensitivity;
  },
  path: string,
): void {
  if (
    restrictionRank(container.visibility) <
      restrictionRank(dependency.visibility) ||
    restrictionRank(container.sensitivity) <
      restrictionRank(dependency.sensitivity)
  ) {
    fail(
      "VISIBILITY_ESCALATION",
      path,
      "classification is less restrictive than a dependency",
    );
  }
}

function sameReferenceSet(
  left: readonly VersionedReference[],
  right: readonly VersionedReference[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightKeys = new Set(right.map(refKey));
  return left.every((reference) => rightKeys.has(refKey(reference)));
}

function requireAuthorityRole(
  catalogs: LocalCatalogs,
  reference: VersionedReference,
  role: GeographyRightsAuthorityRole,
  deployment: VersionedReference,
  path: string,
): GeographyRightsAuthorityBinding {
  const binding = resolveLocal(
    catalogs.authorityBindings,
    catalogs,
    reference,
    "authorityBinding",
    path,
  );
  requireSameDeployment(deployment, binding.deploymentProfileRef, path);
  if (binding.role !== role) {
    fail(
      "INVALID_AUTHORITY_BINDING",
      path,
      "authority binding has the wrong role",
    );
  }
  return binding;
}

function requireEvidence(
  catalogs: LocalCatalogs,
  reference: VersionedReference,
  deployment: VersionedReference,
  path: string,
): GeographyRightsEvidenceReference {
  const evidence = resolveLocal(
    catalogs.evidenceReferences,
    catalogs,
    reference,
    "evidenceReference",
    path,
  );
  requireSameDeployment(deployment, evidence.deploymentProfileRef, path);
  return evidence;
}

function requireReview(
  catalogs: LocalCatalogs,
  reference: VersionedReference,
  deployment: VersionedReference,
  path: string,
): GeographyRightsReviewAttestation {
  const review = resolveLocal(
    catalogs.reviewAttestations,
    catalogs,
    reference,
    "reviewAttestation",
    path,
  );
  requireSameDeployment(deployment, review.deploymentProfileRef, path);
  return review;
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(BigInt);
  const rightParts = right.split(".").map(BigInt);
  for (let index = 0; index < 3; index += 1) {
    const leftPart = leftParts[index] ?? 0n;
    const rightPart = rightParts[index] ?? 0n;
    if (leftPart < rightPart) {
      return -1;
    }
    if (leftPart > rightPart) {
      return 1;
    }
  }
  return 0;
}

function validateSupersession<T extends GeographicRelation | RightsFrame>(
  values: readonly T[],
  map: ReadonlyMap<string, T>,
  catalogs: LocalCatalogs,
  expectedKind: "geographicRelation" | "rightsFrame",
  basePath: string,
): void {
  for (const [index, value] of values.entries()) {
    if (value.supersedesRef === null) {
      continue;
    }
    const predecessor = resolveLocal(
      map,
      catalogs,
      value.supersedesRef,
      expectedKind,
      `${basePath}/${index}/supersedesRef`,
    );
    requireSameDeployment(
      value.deploymentProfileRef,
      predecessor.deploymentProfileRef,
      `${basePath}/${index}/supersedesRef`,
    );
    if (
      value.id !== predecessor.id ||
      compareVersions(value.version, predecessor.version) <= 0
    ) {
      fail(
        "INVALID_SUPERSESSION",
        `${basePath}/${index}/supersedesRef`,
        "successor must retain identity and increase version",
      );
    }
    const oldThrough = predecessor.effectiveTemporalScope.through;
    const newFrom = value.effectiveTemporalScope.from;
    if (oldThrough.state !== "known" || newFrom.state !== "known") {
      fail(
        "INVALID_SUPERSESSION",
        `${basePath}/${index}/effectiveTemporalScope`,
        "supersession requires known predecessor-through and successor-from bounds",
      );
    }
    if (newFrom.date <= oldThrough.date) {
      fail(
        "INVALID_SUPERSESSION",
        `${basePath}/${index}/effectiveTemporalScope`,
        "successor interval must begin strictly after its predecessor",
      );
    }
    if (expectedKind === "geographicRelation") {
      const current = value as GeographicRelation;
      const previous = predecessor as GeographicRelation;
      if (
        current.relationKind !== previous.relationKind ||
        !sameRef(current.subjectRef.ref, previous.subjectRef.ref) ||
        !sameRef(current.objectRef.ref, previous.objectRef.ref)
      ) {
        fail(
          "INVALID_SUPERSESSION",
          `${basePath}/${index}/supersedesRef`,
          "relation lineage changes its governed meaning",
        );
      }
    } else if (
      (value as RightsFrame).frameType !==
      (predecessor as RightsFrame).frameType
    ) {
      fail(
        "INVALID_SUPERSESSION",
        `${basePath}/${index}/supersedesRef`,
        "frame lineage changes its governed type",
      );
    }
  }

  const indexes = new Map(values.map((value, index) => [refKey(value), index]));
  const lineages = new Map<string, T[]>();
  for (const value of values) {
    const lineage = lineages.get(value.id) ?? [];
    lineage.push(value);
    lineages.set(value.id, lineage);
  }
  for (const lineage of lineages.values()) {
    lineage.sort((left, right) => compareVersions(left.version, right.version));
    const root = lineage[0];
    if (root !== undefined && root.supersedesRef !== null) {
      const index = indexes.get(refKey(root)) ?? 0;
      fail(
        "INVALID_SUPERSESSION",
        `${basePath}/${index}/supersedesRef`,
        "lowest available version must be the lineage root",
      );
    }
    for (
      let lineageIndex = 1;
      lineageIndex < lineage.length;
      lineageIndex += 1
    ) {
      const value = lineage[lineageIndex];
      const predecessor = lineage[lineageIndex - 1];
      if (
        value === undefined ||
        predecessor === undefined ||
        value.supersedesRef === null ||
        !sameRef(value.supersedesRef, predecessor)
      ) {
        const index =
          value === undefined ? 0 : (indexes.get(refKey(value)) ?? 0);
        fail(
          "INVALID_SUPERSESSION",
          `${basePath}/${index}/supersedesRef`,
          "each later version must supersede the immediately previous version",
        );
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (value: T): void => {
    const key = refKey(value);
    if (visiting.has(key)) {
      fail(
        "SUPERSESSION_CYCLE",
        basePath,
        "supersession graph contains a cycle",
      );
    }
    if (visited.has(key)) {
      return;
    }
    visiting.add(key);
    if (value.supersedesRef !== null) {
      const previous = map.get(refKey(value.supersedesRef));
      if (previous !== undefined) {
        visit(previous);
      }
    }
    visiting.delete(key);
    visited.add(key);
  };
  values.forEach(visit);
}

function validateReviews(
  owner: {
    readonly deploymentProfileRef: VersionedReference;
    readonly visibility: GeographyRightsVisibility;
    readonly sensitivity: GeographyRightsSensitivity;
    readonly evidenceRefs: readonly VersionedReference[];
    readonly reviewAttestationRefs: readonly VersionedReference[];
  },
  requiredKinds: readonly GeographyRightsReviewKind[],
  catalogs: LocalCatalogs,
  path: string,
): void {
  const kinds = new Set<GeographyRightsReviewKind>();
  for (const [index, reference] of owner.reviewAttestationRefs.entries()) {
    const review = requireReview(
      catalogs,
      reference,
      owner.deploymentProfileRef,
      `${path}/reviewAttestationRefs/${index}`,
    );
    if (!sameReferenceSet(review.evidenceRefs, owner.evidenceRefs)) {
      fail(
        "INVALID_REVIEW",
        `${path}/reviewAttestationRefs/${index}`,
        "review evidence set does not match the governed object",
      );
    }
    kinds.add(review.kind);
    requireMonotonic(owner, review, `${path}/reviewAttestationRefs/${index}`);
  }
  if (requiredKinds.some((kind) => !kinds.has(kind))) {
    fail(
      "INVALID_REVIEW",
      `${path}/reviewAttestationRefs`,
      "required independent review kind is absent",
    );
  }
}

function validateLocalGraph(bundle: GeographyRightsBundle): LocalCatalogs {
  const catalogs = makeCatalogs(bundle);

  const authorityIdentities = new Map<
    string,
    GeographyRightsAuthorityBinding
  >();
  for (const [index, binding] of bundle.authorityBindings.entries()) {
    const identityKey = binding.authorityIdentityRef.id;
    const previous = authorityIdentities.get(identityKey);
    if (
      previous !== undefined &&
      (previous.authorityIdentityRef.version !==
        binding.authorityIdentityRef.version ||
        !sameRef(previous.deploymentProfileRef, binding.deploymentProfileRef) ||
        !sameRef(
          previous.profileAuthorityScopeRef,
          binding.profileAuthorityScopeRef,
        ) ||
        previous.authorityClass !== binding.authorityClass)
    ) {
      fail(
        "INVALID_AUTHORITY_BINDING",
        `/authorityBindings/${index}/authorityIdentityRef`,
        "authority identity bindings disagree on immutable scope or class",
      );
    }
    authorityIdentities.set(identityKey, binding);
  }

  for (const [index, evidence] of bundle.evidenceReferences.entries()) {
    requireAuthorityRole(
      catalogs,
      evidence.sourceAuthorityBindingRef,
      "evidence_source",
      evidence.deploymentProfileRef,
      `/evidenceReferences/${index}/sourceAuthorityBindingRef`,
    );
  }

  for (const [index, review] of bundle.reviewAttestations.entries()) {
    requireAuthorityRole(
      catalogs,
      review.reviewerAuthorityBindingRef,
      REVIEW_ROLES[review.kind],
      review.deploymentProfileRef,
      `/reviewAttestations/${index}/reviewerAuthorityBindingRef`,
    );
    for (const [evidenceIndex, reference] of review.evidenceRefs.entries()) {
      const evidence = requireEvidence(
        catalogs,
        reference,
        review.deploymentProfileRef,
        `/reviewAttestations/${index}/evidenceRefs/${evidenceIndex}`,
      );
      requireMonotonic(
        review,
        evidence,
        `/reviewAttestations/${index}/evidenceRefs/${evidenceIndex}`,
      );
    }
  }

  for (const [index, geometry] of bundle.geometryReferences.entries()) {
    requireAuthorityRole(
      catalogs,
      geometry.custodyAuthorityBindingRef,
      "geometry_custody",
      geometry.deploymentProfileRef,
      `/geometryReferences/${index}/custodyAuthorityBindingRef`,
    );
    for (const [evidenceIndex, reference] of geometry.evidenceRefs.entries()) {
      const evidence = requireEvidence(
        catalogs,
        reference,
        geometry.deploymentProfileRef,
        `/geometryReferences/${index}/evidenceRefs/${evidenceIndex}`,
      );
      requireMonotonic(
        geometry,
        evidence,
        `/geometryReferences/${index}/evidenceRefs/${evidenceIndex}`,
      );
    }
    const review = requireReview(
      catalogs,
      geometry.reviewAttestationRef,
      geometry.deploymentProfileRef,
      `/geometryReferences/${index}/reviewAttestationRef`,
    );
    if (review.kind !== "geometry_reviewed") {
      fail(
        "INVALID_REVIEW",
        `/geometryReferences/${index}/reviewAttestationRef`,
        "geometry requires geometry review",
      );
    }
    if (!sameReferenceSet(review.evidenceRefs, geometry.evidenceRefs)) {
      fail(
        "INVALID_REVIEW",
        `/geometryReferences/${index}/reviewAttestationRef`,
        "review evidence set does not match the governed object",
      );
    }
    requireMonotonic(
      geometry,
      review,
      `/geometryReferences/${index}/reviewAttestationRef`,
    );
    if (geometry.derivation.kind === "reviewed_derivative") {
      const source = resolveLocal(
        catalogs.geometryReferences,
        catalogs,
        geometry.derivation.sourceGeometryRef,
        "geometryReference",
        `/geometryReferences/${index}/derivation/sourceGeometryRef`,
      );
      requireSameDeployment(
        geometry.deploymentProfileRef,
        source.deploymentProfileRef,
        `/geometryReferences/${index}/derivation/sourceGeometryRef`,
      );
      requireAuthorityRole(
        catalogs,
        geometry.derivation.deriverAuthorityBindingRef,
        "geometry_derivation",
        geometry.deploymentProfileRef,
        `/geometryReferences/${index}/derivation/deriverAuthorityBindingRef`,
      );
      requireMonotonic(
        geometry,
        source,
        `/geometryReferences/${index}/derivation`,
      );
    }
  }

  const geometryIndexes = new Map(
    bundle.geometryReferences.map((geometry, index) => [
      refKey(geometry),
      index,
    ]),
  );
  const geometryVisiting = new Set<string>();
  const geometryVisited = new Set<string>();
  const visitGeometry = (geometry: GeographyRightsGeometryReference): void => {
    const key = refKey(geometry);
    const index = geometryIndexes.get(key) ?? 0;
    if (geometryVisiting.has(key)) {
      fail(
        "INVALID_DERIVATION",
        `/geometryReferences/${index}/derivation/sourceGeometryRef`,
        "geometry derivation graph contains a cycle",
      );
    }
    if (geometryVisited.has(key)) {
      return;
    }
    geometryVisiting.add(key);
    if (geometry.derivation.kind === "reviewed_derivative") {
      const source = catalogs.geometryReferences.get(
        refKey(geometry.derivation.sourceGeometryRef),
      );
      if (source !== undefined) {
        visitGeometry(source);
      }
    }
    geometryVisiting.delete(key);
    geometryVisited.add(key);
  };
  bundle.geometryReferences.forEach(visitGeometry);

  for (const [index, relation] of bundle.geographicRelations.entries()) {
    requireSameDeployment(
      relation.deploymentProfileRef,
      relation.subjectRef.ref,
      `/geographicRelations/${index}/subjectRef/ref`,
    );
    const scope = resolveLocal(
      catalogs.scopeReferences,
      catalogs,
      relation.objectRef.ref,
      "scopeReference",
      `/geographicRelations/${index}/objectRef/ref`,
    );
    requireSameDeployment(
      relation.deploymentProfileRef,
      scope.deploymentProfileRef,
      `/geographicRelations/${index}/objectRef/ref`,
    );
    requireMonotonic(
      relation,
      scope,
      `/geographicRelations/${index}/objectRef/ref`,
    );
    requireAuthorityRole(
      catalogs,
      relation.assertingAuthorityBindingRef,
      "relation_asserting",
      relation.deploymentProfileRef,
      `/geographicRelations/${index}/assertingAuthorityBindingRef`,
    );
    for (const [evidenceIndex, reference] of relation.evidenceRefs.entries()) {
      const evidence = requireEvidence(
        catalogs,
        reference,
        relation.deploymentProfileRef,
        `/geographicRelations/${index}/evidenceRefs/${evidenceIndex}`,
      );
      requireMonotonic(
        relation,
        evidence,
        `/geographicRelations/${index}/evidenceRefs/${evidenceIndex}`,
      );
    }
    validateReviews(
      relation,
      ["source_verified", "analyst_reviewed"],
      catalogs,
      `/geographicRelations/${index}`,
    );
    if (relation.geometryRef !== null) {
      const geometry = resolveLocal(
        catalogs.geometryReferences,
        catalogs,
        relation.geometryRef,
        "geometryReference",
        `/geographicRelations/${index}/geometryRef`,
      );
      requireSameDeployment(
        relation.deploymentProfileRef,
        geometry.deploymentProfileRef,
        `/geographicRelations/${index}/geometryRef`,
      );
      requireMonotonic(
        relation,
        geometry,
        `/geographicRelations/${index}/geometryRef`,
      );
    }
  }

  for (const [index, frame] of bundle.rightsFrames.entries()) {
    const frameSource = requireAuthorityRole(
      catalogs,
      frame.sourceAuthorityBindingRef,
      "frame_source",
      frame.deploymentProfileRef,
      `/rightsFrames/${index}/sourceAuthorityBindingRef`,
    );
    requireAuthorityRole(
      catalogs,
      frame.configurationAuthorityBindingRef,
      "frame_configuration",
      frame.deploymentProfileRef,
      `/rightsFrames/${index}/configurationAuthorityBindingRef`,
    );
    for (const [evidenceIndex, reference] of frame.evidenceRefs.entries()) {
      const evidence = requireEvidence(
        catalogs,
        reference,
        frame.deploymentProfileRef,
        `/rightsFrames/${index}/evidenceRefs/${evidenceIndex}`,
      );
      const evidenceSource = requireAuthorityRole(
        catalogs,
        evidence.sourceAuthorityBindingRef,
        "evidence_source",
        frame.deploymentProfileRef,
        `/rightsFrames/${index}/evidenceRefs/${evidenceIndex}`,
      );
      if (
        !sameRef(
          frameSource.authorityIdentityRef,
          evidenceSource.authorityIdentityRef,
        )
      ) {
        fail(
          "INVALID_AUTHORITY_BINDING",
          `/rightsFrames/${index}/evidenceRefs/${evidenceIndex}`,
          "frame source identity does not match its evidence source identity",
        );
      }
      requireMonotonic(
        frame,
        evidence,
        `/rightsFrames/${index}/evidenceRefs/${evidenceIndex}`,
      );
    }
    validateReviews(
      frame,
      ["community_configured", "source_verified"],
      catalogs,
      `/rightsFrames/${index}`,
    );
    const requiredRank = Math.max(
      restrictionRank(frame.visibility),
      restrictionRank(frame.sensitivity),
    );
    if (
      frame.approvedAudiences.some(
        (audience) => restrictionRank(audience) < requiredRank,
      )
    ) {
      fail(
        "VISIBILITY_ESCALATION",
        `/rightsFrames/${index}/approvedAudiences`,
        "audience is below frame classification",
      );
    }
  }

  validateSupersession(
    bundle.geographicRelations,
    catalogs.geographicRelations,
    catalogs,
    "geographicRelation",
    "/geographicRelations",
  );
  validateSupersession(
    bundle.rightsFrames,
    catalogs.rightsFrames,
    catalogs,
    "rightsFrame",
    "/rightsFrames",
  );

  const seenDeployments = new Set<string>();
  const boundRelations = new Set<string>();
  const boundFrames = new Set<string>();
  for (const [index, binding] of bundle.deploymentBindings.entries()) {
    const deploymentKey = refKey(binding.deploymentProfileRef);
    if (seenDeployments.has(deploymentKey)) {
      fail(
        "DUPLICATE_REFERENCE",
        `/deploymentBindings/${index}/deploymentProfileRef`,
        "deployment has more than one binding",
      );
    }
    seenDeployments.add(deploymentKey);
    const relationKeys = new Set(binding.geographicRelationRefs.map(refKey));
    const frameKeys = new Set(binding.rightsFrameRefs.map(refKey));
    for (const [
      relationIndex,
      reference,
    ] of binding.geographicRelationRefs.entries()) {
      const relation = resolveLocal(
        catalogs.geographicRelations,
        catalogs,
        reference,
        "geographicRelation",
        `/deploymentBindings/${index}/geographicRelationRefs/${relationIndex}`,
      );
      requireSameDeployment(
        binding.deploymentProfileRef,
        relation.deploymentProfileRef,
        `/deploymentBindings/${index}/geographicRelationRefs/${relationIndex}`,
      );
      if (!sameRef(binding.regionPackRef, relation.regionPackRef)) {
        fail(
          "CROSS_DEPLOYMENT_REFERENCE",
          `/deploymentBindings/${index}/geographicRelationRefs/${relationIndex}`,
          "relation crosses region scope",
        );
      }
      boundRelations.add(refKey(reference));
    }
    for (const [frameIndex, reference] of binding.rightsFrameRefs.entries()) {
      const frame = resolveLocal(
        catalogs.rightsFrames,
        catalogs,
        reference,
        "rightsFrame",
        `/deploymentBindings/${index}/rightsFrameRefs/${frameIndex}`,
      );
      requireSameDeployment(
        binding.deploymentProfileRef,
        frame.deploymentProfileRef,
        `/deploymentBindings/${index}/rightsFrameRefs/${frameIndex}`,
      );
      if (!sameRef(binding.regionPackRef, frame.regionPackRef)) {
        fail(
          "CROSS_DEPLOYMENT_REFERENCE",
          `/deploymentBindings/${index}/rightsFrameRefs/${frameIndex}`,
          "frame crosses region scope",
        );
      }
      boundFrames.add(refKey(reference));
    }
    const seenPersonas = new Set<string>();
    for (const [grantIndex, grant] of binding.personaGrants.entries()) {
      const personaKey = refKey(grant.personaProjectionRef);
      if (seenPersonas.has(personaKey)) {
        fail(
          "DUPLICATE_REFERENCE",
          `/deploymentBindings/${index}/personaGrants/${grantIndex}/personaProjectionRef`,
          "persona has more than one grant",
        );
      }
      seenPersonas.add(personaKey);
      if (
        restrictionRank(grant.sensitivityClearance) >
        restrictionRank(grant.visibilityClearance)
      ) {
        fail(
          "VISIBILITY_ESCALATION",
          `/deploymentBindings/${index}/personaGrants/${grantIndex}`,
          "sensitivity clearance exceeds visibility clearance",
        );
      }
      if (
        grant.geographicRelationRefs.some(
          (reference) => !relationKeys.has(refKey(reference)),
        )
      ) {
        fail(
          "CROSS_DEPLOYMENT_REFERENCE",
          `/deploymentBindings/${index}/personaGrants/${grantIndex}/geographicRelationRefs`,
          "grant references an unbound relation",
        );
      }
      if (
        grant.rightsFrameRefs.some(
          (reference) => !frameKeys.has(refKey(reference)),
        )
      ) {
        fail(
          "CROSS_DEPLOYMENT_REFERENCE",
          `/deploymentBindings/${index}/personaGrants/${grantIndex}/rightsFrameRefs`,
          "grant references an unbound frame",
        );
      }
    }
  }
  if (
    bundle.geographicRelations.some(
      (relation) => !boundRelations.has(refKey(relation)),
    ) ||
    bundle.rightsFrames.some((frame) => !boundFrames.has(refKey(frame)))
  ) {
    fail(
      "UNKNOWN_REFERENCE",
      "/deploymentBindings",
      "a governed object is not bound to its deployment",
    );
  }
  return catalogs;
}

export function parseGeographyRightsBundle(
  value: unknown,
): GeographyRightsBundle {
  assertPlainJson(value, "$geographyRightsBundle");
  const object = expectObject(value, "$geographyRightsBundle", [
    "$schema",
    "schemaVersion",
    "id",
    "version",
    "synthetic",
    "profileBundleRef",
    "authorityBindings",
    "scopeReferences",
    "evidenceReferences",
    "reviewAttestations",
    "geometryReferences",
    "geographicRelations",
    "rightsFrames",
    "deploymentBindings",
  ]);
  const bundle: GeographyRightsBundle = {
    $schema: expectLiteral(
      object.$schema,
      GEOGRAPHY_RIGHTS_SCHEMA_ID,
      "/$schema",
    ),
    schemaVersion: expectLiteral(
      object.schemaVersion,
      GEOGRAPHY_RIGHTS_SCHEMA_VERSION,
      "/schemaVersion",
    ),
    ...parseSyntheticBase(object, "$geographyRightsBundle"),
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
    ),
    scopeReferences: parseCollection(
      object.scopeReferences,
      "/scopeReferences",
      0,
      256,
      parseScopeReference,
    ),
    evidenceReferences: parseCollection(
      object.evidenceReferences,
      "/evidenceReferences",
      1,
      256,
      parseEvidenceReference,
    ),
    reviewAttestations: parseCollection(
      object.reviewAttestations,
      "/reviewAttestations",
      2,
      512,
      parseReviewAttestation,
    ),
    geometryReferences: parseCollection(
      object.geometryReferences,
      "/geometryReferences",
      0,
      256,
      parseGeometryReference,
    ),
    geographicRelations: parseCollection(
      object.geographicRelations,
      "/geographicRelations",
      0,
      512,
      parseGeographicRelation,
    ),
    rightsFrames: parseCollection(
      object.rightsFrames,
      "/rightsFrames",
      0,
      256,
      parseRightsFrame,
    ),
    deploymentBindings: parseCollection(
      object.deploymentBindings,
      "/deploymentBindings",
      1,
      128,
      parseDeploymentBinding,
    ),
  };
  validateLocalGraph(bundle);
  return canonicalClone(bundle) as GeographyRightsBundle;
}

function profileMap<T extends VersionedReference>(values: readonly T[]) {
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

function validateProfileBindings(
  profile: ProjectionProfileBundle,
  bundle: GeographyRightsBundle,
): void {
  if (!sameRef(bundle.profileBundleRef, profile)) {
    fail(
      "UNKNOWN_REFERENCE",
      "/profileBundleRef",
      "profile bundle reference does not match",
    );
  }
  const authorities = profileMap(profile.authorityReferences);
  const regions = profileMap(profile.regionPacks);
  const deployments = profileMap(profile.deploymentProfiles);
  const personas = profileMap(profile.personaProjections);
  const outputs = profileMap(profile.outputAdapters);
  const requireSyntheticDeployment = (
    reference: VersionedReference,
    path: string,
  ) => {
    const deployment = resolveProfileReference(deployments, reference, path);
    if (deployment.authorityState !== "synthetic_demo") {
      fail(
        "UNAUTHORIZED_PROJECTION",
        path,
        "PNW-03 accepts only synthetic-demo deployment authority",
      );
    }
    return deployment;
  };

  for (const [index, binding] of bundle.authorityBindings.entries()) {
    const deployment = requireSyntheticDeployment(
      binding.deploymentProfileRef,
      `/authorityBindings/${index}/deploymentProfileRef`,
    );
    const region = resolveProfileReference(
      regions,
      deployment.regionPackRef,
      `/authorityBindings/${index}/deploymentProfileRef`,
    );
    resolveProfileReference(
      authorities,
      binding.profileAuthorityScopeRef,
      `/authorityBindings/${index}/profileAuthorityScopeRef`,
    );
    const scopedAuthorities = region.jurisdictionReferences.filter(
      (jurisdiction) =>
        sameRef(
          jurisdiction.assertingAuthorityRef,
          binding.profileAuthorityScopeRef,
        ),
    );
    if (scopedAuthorities.length === 0) {
      fail(
        "CROSS_DEPLOYMENT_REFERENCE",
        `/authorityBindings/${index}/profileAuthorityScopeRef`,
        "profile authority scope is outside the deployment region",
      );
    }
    if (scopedAuthorities.length > 1) {
      fail(
        "INVALID_AUTHORITY_BINDING",
        `/authorityBindings/${index}/profileAuthorityScopeRef`,
        "profile authority scope must resolve exactly once in the deployment region",
      );
    }
    const scopedAuthority = scopedAuthorities[0];
    if (scopedAuthority === undefined) {
      fail(
        "INVALID_AUTHORITY_BINDING",
        `/authorityBindings/${index}/profileAuthorityScopeRef`,
        "profile authority scope resolution is incomplete",
      );
    }
    if (scopedAuthority.authorityState !== "synthetic_demo") {
      fail(
        "UNAUTHORIZED_PROJECTION",
        `/authorityBindings/${index}/profileAuthorityScopeRef`,
        "PNW-03 accepts only synthetic-demo jurisdiction authority",
      );
    }
  }
  for (const [index, evidence] of bundle.evidenceReferences.entries()) {
    const deployment = requireSyntheticDeployment(
      evidence.deploymentProfileRef,
      `/evidenceReferences/${index}/deploymentProfileRef`,
    );
    const region = resolveProfileReference(
      regions,
      deployment.regionPackRef,
      `/evidenceReferences/${index}/deploymentProfileRef`,
    );
    if (!region.sourceIds.includes(evidence.sourceId)) {
      fail(
        "UNKNOWN_REFERENCE",
        `/evidenceReferences/${index}/sourceId`,
        "source is outside the deployment region",
      );
    }
  }
  for (const [index, scope] of bundle.scopeReferences.entries()) {
    requireSyntheticDeployment(
      scope.deploymentProfileRef,
      `/scopeReferences/${index}/deploymentProfileRef`,
    );
  }
  for (const [index, review] of bundle.reviewAttestations.entries()) {
    requireSyntheticDeployment(
      review.deploymentProfileRef,
      `/reviewAttestations/${index}/deploymentProfileRef`,
    );
  }
  for (const [index, geometry] of bundle.geometryReferences.entries()) {
    requireSyntheticDeployment(
      geometry.deploymentProfileRef,
      `/geometryReferences/${index}/deploymentProfileRef`,
    );
  }
  const validateGovernedScope = (
    value: GeographicRelation | RightsFrame,
    path: string,
  ) => {
    const deployment = requireSyntheticDeployment(
      value.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    );
    const region = resolveProfileReference(
      regions,
      value.regionPackRef,
      `${path}/regionPackRef`,
    );
    if (!sameRef(deployment.regionPackRef, region)) {
      fail(
        "CROSS_DEPLOYMENT_REFERENCE",
        `${path}/regionPackRef`,
        "governed object crosses profile region",
      );
    }
  };
  bundle.geographicRelations.forEach((value, index) =>
    validateGovernedScope(value, `/geographicRelations/${index}`),
  );
  bundle.rightsFrames.forEach((value, index) =>
    validateGovernedScope(value, `/rightsFrames/${index}`),
  );

  for (const [index, binding] of bundle.deploymentBindings.entries()) {
    const deployment = requireSyntheticDeployment(
      binding.deploymentProfileRef,
      `/deploymentBindings/${index}/deploymentProfileRef`,
    );
    const region = resolveProfileReference(
      regions,
      binding.regionPackRef,
      `/deploymentBindings/${index}/regionPackRef`,
    );
    if (!sameRef(deployment.regionPackRef, region)) {
      fail(
        "CROSS_DEPLOYMENT_REFERENCE",
        `/deploymentBindings/${index}/regionPackRef`,
        "binding crosses profile region",
      );
    }
    for (const [grantIndex, grant] of binding.personaGrants.entries()) {
      const persona = resolveProfileReference(
        personas,
        grant.personaProjectionRef,
        `/deploymentBindings/${index}/personaGrants/${grantIndex}/personaProjectionRef`,
      );
      if (!sameRef(persona.deploymentProfileRef, deployment)) {
        fail(
          "CROSS_DEPLOYMENT_REFERENCE",
          `/deploymentBindings/${index}/personaGrants/${grantIndex}/personaProjectionRef`,
          "persona crosses deployment scope",
        );
      }
      const personaOutputs = new Set(persona.outputAdapterRefs.map(refKey));
      for (const [
        outputIndex,
        outputRef,
      ] of grant.outputAdapterRefs.entries()) {
        resolveProfileReference(
          outputs,
          outputRef,
          `/deploymentBindings/${index}/personaGrants/${grantIndex}/outputAdapterRefs/${outputIndex}`,
        );
        if (!personaOutputs.has(refKey(outputRef))) {
          fail(
            "UNAUTHORIZED_PROJECTION",
            `/deploymentBindings/${index}/personaGrants/${grantIndex}/outputAdapterRefs/${outputIndex}`,
            "output is not configured for the persona",
          );
        }
      }
    }
  }
}

function parseProjectionRequest(
  value: unknown,
): GeographyRightsProjectionRequest {
  assertPlainJson(value, "$request");
  const object = expectObject(value, "$request", [
    "deploymentProfileRef",
    "personaProjectionRef",
    "outputAdapterRef",
    "requestedVisibility",
    "requestedUse",
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
    requestedVisibility: parseVisibility(
      object.requestedVisibility,
      "/request/requestedVisibility",
    ),
    requestedUse: expectEnum<RightsFrameApprovedUse>(
      object.requestedUse,
      APPROVED_USES,
      "/request/requestedUse",
    ),
  };
}

function hasAcceptedReviews(
  references: readonly VersionedReference[],
  requiredKinds: readonly GeographyRightsReviewKind[],
  catalogs: LocalCatalogs,
): boolean {
  const reviews = references.map((reference) =>
    catalogs.reviewAttestations.get(refKey(reference)),
  );
  return (
    reviews.every((review) => review?.state === "accepted") &&
    requiredKinds.every((kind) =>
      reviews.some((review) => review?.kind === kind),
    )
  );
}

function withinAccess(
  value: {
    readonly visibility: GeographyRightsVisibility;
    readonly sensitivity: GeographyRightsSensitivity;
  },
  grant: GeographyRightsPersonaGrant,
  requestedVisibility: GeographyRightsVisibility,
): boolean {
  const requested = restrictionRank(requestedVisibility);
  return (
    requested <= restrictionRank(grant.visibilityClearance) &&
    requested <= restrictionRank(grant.sensitivityClearance) &&
    restrictionRank(value.visibility) <= requested &&
    restrictionRank(value.sensitivity) <= requested
  );
}

function geometryReviewAccepted(
  relation: GeographicRelation,
  catalogs: LocalCatalogs,
): boolean {
  if (relation.geometryRef === null) {
    return true;
  }
  const geometry = catalogs.geometryReferences.get(
    refKey(relation.geometryRef),
  );
  if (geometry === undefined) {
    return false;
  }
  const review = catalogs.reviewAttestations.get(
    refKey(geometry.reviewAttestationRef),
  );
  return review?.kind === "geometry_reviewed" && review.state === "accepted";
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

export function serializeGeographyRightsProjection(
  projection: GeographyRightsProjection,
): string {
  assertPlainJson(projection, "$projection");
  return encodeCanonical(projection);
}

export function createGeographyRightsRuntime(
  configuration: ProjectionConfiguration,
) {
  const { parseProjectionProfileBundle } =
    createProjectionRuntime(configuration);
  function createGeographyRightsProjection(
    profileBundle: unknown,
    geographyRightsBundle: unknown,
    requestValue: unknown,
  ): GeographyRightsProjection {
    const profile = parseProjectionProfileBundle(profileBundle);
    const bundle = parseGeographyRightsBundle(geographyRightsBundle);
    const request = parseProjectionRequest(requestValue);
    validateProfileBindings(profile, bundle);
    const catalogs = makeCatalogs(bundle);

    const binding = bundle.deploymentBindings.find((candidate) =>
      sameRef(candidate.deploymentProfileRef, request.deploymentProfileRef),
    );
    if (binding === undefined) {
      fail(
        "UNAUTHORIZED_PROJECTION",
        "/request/deploymentProfileRef",
        "no exact deployment binding exists",
      );
    }
    const grant = binding.personaGrants.find((candidate) =>
      sameRef(candidate.personaProjectionRef, request.personaProjectionRef),
    );
    if (grant === undefined) {
      fail(
        "UNAUTHORIZED_PROJECTION",
        "/request/personaProjectionRef",
        "no exact persona grant exists",
      );
    }
    if (
      !grant.outputAdapterRefs.some((reference) =>
        sameRef(reference, request.outputAdapterRef),
      )
    ) {
      fail(
        "UNAUTHORIZED_PROJECTION",
        "/request/outputAdapterRef",
        "output is not granted",
      );
    }
    if (!grant.approvedUses.includes(request.requestedUse)) {
      fail(
        "UNAUTHORIZED_PROJECTION",
        "/request/requestedUse",
        "requested use is not granted",
      );
    }
    if (
      restrictionRank(request.requestedVisibility) >
        restrictionRank(grant.visibilityClearance) ||
      restrictionRank(request.requestedVisibility) >
        restrictionRank(grant.sensitivityClearance)
    ) {
      fail(
        "UNAUTHORIZED_PROJECTION",
        "/request/requestedVisibility",
        "requested class exceeds the exact grant",
      );
    }

    const relationRefs = grant.geographicRelationRefs.filter((reference) => {
      const relation = catalogs.geographicRelations.get(refKey(reference));
      return (
        relation !== undefined &&
        withinAccess(relation, grant, request.requestedVisibility) &&
        hasAcceptedReviews(
          relation.reviewAttestationRefs,
          ["source_verified", "analyst_reviewed"],
          catalogs,
        ) &&
        geometryReviewAccepted(relation, catalogs)
      );
    });
    const frameRefs = grant.rightsFrameRefs.filter((reference) => {
      const frame = catalogs.rightsFrames.get(refKey(reference));
      return (
        frame !== undefined &&
        frame.approvedAudiences.includes(request.requestedVisibility) &&
        frame.approvedUses.includes(request.requestedUse) &&
        withinAccess(frame, grant, request.requestedVisibility) &&
        hasAcceptedReviews(
          frame.reviewAttestationRefs,
          ["community_configured", "source_verified"],
          catalogs,
        )
      );
    });

    const projection: GeographyRightsProjection = {
      schemaVersion: GEOGRAPHY_RIGHTS_SCHEMA_VERSION,
      profileBundleRef: { ...bundle.profileBundleRef },
      geographyRightsBundleRef: { id: bundle.id, version: bundle.version },
      context: {
        deploymentProfileRef: { ...request.deploymentProfileRef },
        personaProjectionRef: { ...request.personaProjectionRef },
        outputAdapterRef: { ...request.outputAdapterRef },
        requestedVisibility: request.requestedVisibility,
        requestedUse: request.requestedUse,
        disclosureState: "authorized_subset_not_comprehensive",
        geographicRelationRefs: relationRefs.map((reference) => ({
          ...reference,
        })),
        rightsFrameRefs: frameRefs.map((reference) => ({ ...reference })),
        nonClaims: [...REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS],
      },
    };
    return canonicalClone(projection) as GeographyRightsProjection;
  }

  return { createGeographyRightsProjection };
}
