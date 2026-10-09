import sourceRegistryJson from "../config/sources.v1.json";
import type {
  ProjectionProfileBundle,
  VersionedReference,
} from "../src/engine/contracts";
import type { GeographyRightsBundle } from "../src/engine/geography-rights-contracts";
import {
  parseGeographyRightsBundle,
  parseProjectionProfileBundle,
  parseTaxonomyBundle,
} from "./configured-engine";
import {
  SOURCE_PACK_BUNDLE_SCHEMA_ID,
  SOURCE_PACK_BUNDLE_SCHEMA_VERSION,
  type SourcePackAdmissionPlan,
  type SourcePackAdmissionRequest,
  type SourcePackAdmissionState,
  type SourcePackAuthorityBinding,
  type SourcePackAvailabilityObservation,
  type SourcePackAvailabilityState,
  type SourcePackBundle,
  type SourcePackCatalogKind,
  type SourcePackContractReceipt,
  type SourcePackCoverageDeclaration,
  type SourcePackCoverageSlotState,
  type SourcePackCoverageState,
  type SourcePackDisclosure,
  type SourcePackEvidenceKind,
  type SourcePackEvidenceReceipt,
  type SourcePackEvidenceSubject,
  type SourcePackExclusion,
  type SourcePackExclusionReason,
  type SourcePackGapState,
  type SourcePackHealthObservation,
  type SourcePackHealthState,
  type SourcePackPredecessorBundles,
  type SourcePackPredecessorReference,
  type SourcePackReference,
  type SourcePackReviewAttestation,
  type SourcePackSourceBinding,
  type SourcePackSourceIdentity,
} from "../src/engine/source-pack-contracts";
import type { TaxonomyBundle } from "../src/engine/taxonomy-contracts";

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
type JsonObject = Record<string, unknown>;

interface CanonicalRegistrySource {
  readonly id: string;
  readonly synthetic: boolean;
  readonly adapter: {
    readonly id: string;
    readonly version: string;
    readonly module: string;
  } | null;
  readonly access: { readonly method: string };
}

interface CanonicalSourceRegistry {
  readonly registryVersion: string;
  readonly sources: readonly CanonicalRegistrySource[];
}

type CatalogMember =
  | SourcePackBundle["sourceContexts"][number]
  | SourcePackBundle["jurisdictionContexts"][number]
  | SourcePackBundle["accessContexts"][number]
  | SourcePackBundle["authorityBindings"][number]
  | SourcePackBundle["evidenceReceipts"][number]
  | SourcePackBundle["contractReceipts"][number]
  | SourcePackBundle["coverageDeclarations"][number]
  | SourcePackBundle["reviewAttestations"][number]
  | SourcePackBundle["admissionReceipts"][number]
  | SourcePackBundle["availabilityObservations"][number]
  | SourcePackBundle["healthObservations"][number]
  | SourcePackBundle["sourceBindings"][number]
  | SourcePackBundle["deploymentBindings"][number];

const sourceRegistry = sourceRegistryJson as unknown as CanonicalSourceRegistry;
const STABLE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const VERSION = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const TIMESTAMP =
  /^[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$/;
const FINGERPRINT = /^[a-f0-9]{64}$/;

const CATALOG_KINDS = [
  "source_context",
  "jurisdiction_context",
  "access_context",
  "authority_binding",
  "evidence_receipt",
  "contract_receipt",
  "coverage_declaration",
  "review_attestation",
  "admission_receipt",
  "availability_observation",
  "health_observation",
  "source_binding",
  "deployment_binding",
] as const;
const DISCLOSURES = ["public", "internal", "restricted"] as const;
const OPERATIONS = [
  "acquisition",
  "retention",
  "transformation",
  "internal_analysis",
  "redistribution",
  "public_projection",
] as const;
const COVERAGE_STATES = [
  "covered",
  "partial",
  "outside_coverage",
  "unknown_coverage",
  "not_assessed",
] as const;
const AVAILABILITY_STATES = [
  "available",
  "unavailable",
  "not_observed",
  "unknown",
] as const;
const HEALTH_STATES = [
  "healthy",
  "degraded",
  "failed",
  "not_observed",
  "unknown",
] as const;
const OBSERVATION_SCOPES = [
  "source",
  "jurisdiction",
  "source_within_jurisdiction",
] as const;
const EXCLUSION_ORDER = [
  "PACK_BINDING_DISABLED",
  "NOT_ADMITTED",
  "ADMISSION_NOT_CURRENT",
  "PERSONA_NOT_GRANTED",
  "OUTPUT_NOT_GRANTED",
  "OPERATION_NOT_GRANTED",
  "OUTSIDE_DECLARED_COVERAGE",
  "COVERAGE_UNKNOWN",
  "COVERAGE_NOT_ASSESSED",
  "SOURCE_UNAVAILABLE",
  "AVAILABILITY_NOT_OBSERVED",
  "AVAILABILITY_UNKNOWN",
  "HEALTH_NOT_OBSERVED",
  "HEALTH_UNKNOWN",
  "HEALTH_DEGRADED",
  "HEALTH_FAILED",
] as const satisfies readonly SourcePackExclusionReason[];

export class SourcePackValidationError extends TypeError {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string, detail: string) {
    super(`${code} at ${path}: ${detail}`);
    this.name = "SourcePackValidationError";
    this.code = code;
    this.path = path;
  }
}

function fail(code: string, path: string, detail: string): never {
  const structuralPath = path.replace(/\/(?:0|[1-9][0-9]*)(?=\/|$)/g, "/*");
  throw new SourcePackValidationError(code, structuralPath, detail);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
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
    fail("INVALID_JSON", path, "cyclic values are rejected");
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
        fail("INVALID_JSON", path, "symbol properties are rejected");
      }
      if (Array.isArray(value) && key === "length") {
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      const childPath = Array.isArray(value) ? `${path}/${key}` : `${path}/*`;
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        !descriptor.enumerable
      ) {
        fail("INVALID_JSON", childPath, "expected a data property");
      }
      assertPlainJsonInternal(descriptor.value, childPath, ancestors);
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
  for (const key of keys) {
    if (!Object.hasOwn(object, key)) {
      fail("INVALID_SHAPE", `${path}/${key}`, "required property is missing");
    }
  }
  const allowed = new Set(keys);
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) {
      fail("INVALID_SHAPE", `${path}/*`, "unknown property is rejected");
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
  if (
    !Array.isArray(value) ||
    value.length < minimum ||
    value.length > maximum
  ) {
    fail("INVALID_SHAPE", path, "array length is outside the closed bound");
  }
  return value;
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    fail("INVALID_VALUE", path, "expected a string");
  }
  return value;
}

function expectStableId(value: unknown, path: string): string {
  const result = expectString(value, path);
  if (result.length < 3 || result.length > 96 || !STABLE_ID.test(result)) {
    fail("INVALID_VALUE", path, "expected a stable opaque identifier");
  }
  return result;
}

function expectVersion(value: unknown, path: string): string {
  const result = expectString(value, path);
  if (result.length > 64 || !VERSION.test(result)) {
    fail("INVALID_VALUE", path, "expected a semantic version");
  }
  return result;
}

function expectTimestamp(value: unknown, path: string): string {
  const result = expectString(value, path);
  if (!TIMESTAMP.test(result)) {
    fail("INVALID_VALUE", path, "expected canonical UTC second precision");
  }
  const instant = new Date(result);
  if (
    Number.isNaN(instant.getTime()) ||
    instant.toISOString().replace(".000Z", "Z") !== result
  ) {
    fail("INVALID_VALUE", path, "expected a valid canonical UTC instant");
  }
  return result;
}

function expectFingerprint(value: unknown, path: string): string {
  const result = expectString(value, path);
  if (!FINGERPRINT.test(result)) {
    fail("INVALID_VALUE", path, "expected a lowercase SHA-256 fingerprint");
  }
  return result;
}

function expectLiteral<T extends JsonPrimitive>(
  value: unknown,
  expected: T,
  path: string,
): T {
  if (value !== expected) {
    fail("INVALID_VALUE", path, "expected the closed contract literal");
  }
  return expected;
}

function expectEnum<T extends string>(
  value: unknown,
  values: readonly T[],
  path: string,
): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    fail("INVALID_VALUE", path, "value is outside the closed vocabulary");
  }
  return value as T;
}

function parseReference(value: unknown, path: string): VersionedReference {
  const object = expectObject(value, path, ["id", "version"]);
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
  };
}

function parseTypedReference<Kind extends SourcePackCatalogKind>(
  value: unknown,
  expectedKind: Kind,
  path: string,
): SourcePackReference<Kind> {
  const object = expectObject(value, path, ["kind", "id", "version"]);
  const kind = expectEnum(object.kind, CATALOG_KINDS, `${path}/kind`);
  if (kind !== expectedKind) {
    fail(
      "WRONG_KIND",
      `${path}/kind`,
      "reference kind does not match its field",
    );
  }
  return {
    kind: expectedKind,
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
  };
}

function refKey(reference: VersionedReference): string {
  return `${reference.id}\u0000${reference.version}`;
}

function typedRefKey(reference: SourcePackReference): string {
  return `${reference.kind}\u0000${refKey(reference)}`;
}

function sameRef(left: VersionedReference, right: VersionedReference): boolean {
  return left.id === right.id && left.version === right.version;
}

function parseSourceIdentity(
  value: unknown,
  path: string,
): SourcePackSourceIdentity {
  const object = expectObject(value, path, [
    "sourceId",
    "sourceRegistryVersion",
  ]);
  return {
    sourceId: expectStableId(object.sourceId, `${path}/sourceId`),
    sourceRegistryVersion: expectVersion(
      object.sourceRegistryVersion,
      `${path}/sourceRegistryVersion`,
    ),
  };
}

function sourceKey(source: SourcePackSourceIdentity): string {
  return `${source.sourceId}\u0000${source.sourceRegistryVersion}`;
}

function sameSource(
  left: SourcePackSourceIdentity,
  right: SourcePackSourceIdentity,
): boolean {
  return sourceKey(left) === sourceKey(right);
}

function validateInterval(
  validFrom: string,
  validThrough: string | null,
  path: string,
): void {
  if (validThrough !== null && validFrom > validThrough) {
    fail("INVALID_VALUE", path, "validity interval is reversed");
  }
}

function parseValidity(object: JsonObject, path: string) {
  const validFrom = expectTimestamp(object.validFrom, `${path}/validFrom`);
  const validThrough =
    object.validThrough === null
      ? null
      : expectTimestamp(object.validThrough, `${path}/validThrough`);
  validateInterval(validFrom, validThrough, path);
  return { validFrom, validThrough };
}

function parseMemberHeader<Kind extends SourcePackCatalogKind>(
  object: JsonObject,
  kind: Kind,
  path: string,
) {
  expectLiteral(object.kind, kind, `${path}/kind`);
  return {
    kind,
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    synthetic: expectLiteral(object.synthetic, true, `${path}/synthetic`),
  } as const;
}

function parseTypedReferenceSet<Kind extends SourcePackCatalogKind>(
  value: unknown,
  kind: Kind,
  path: string,
  minimum: number,
  maximum = 256,
): readonly SourcePackReference<Kind>[] {
  const parsed = expectArray(value, path, minimum, maximum).map(
    (entry, index) => parseTypedReference(entry, kind, `${path}/${index}`),
  );
  const sorted = [...parsed].sort((left, right) =>
    compareText(typedRefKey(left), typedRefKey(right)),
  );
  for (let index = 1; index < sorted.length; index += 1) {
    if (typedRefKey(sorted[index - 1]!) === typedRefKey(sorted[index]!)) {
      fail("DUPLICATE_REFERENCE", path, "reference set contains a duplicate");
    }
  }
  return sorted;
}

function parseEnumSet<T extends string>(
  value: unknown,
  values: readonly T[],
  path: string,
  minimum: number,
): readonly T[] {
  const sorted = expectArray(value, path, minimum, values.length)
    .map((entry, index) => expectEnum(entry, values, `${path}/${index}`))
    .sort(compareText);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index - 1] === sorted[index]) {
      fail("DUPLICATE_REFERENCE", path, "set contains a duplicate");
    }
  }
  return sorted;
}

function parseCatalog<T extends CatalogMember>(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
  parse: (entry: unknown, entryPath: string) => T,
): readonly T[] {
  const parsed = expectArray(value, path, minimum, maximum).map(
    (entry, index) => parse(entry, `${path}/${index}`),
  );
  return [...parsed].sort((left, right) =>
    compareText(refKey(left), refKey(right)),
  );
}

function parseSourceContext(value: unknown, path: string) {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "synthetic",
    "role",
  ]);
  return {
    ...parseMemberHeader(object, "source_context", path),
    role: expectEnum(
      object.role,
      [
        "federal_context",
        "state_context",
        "regional_intergovernmental_context",
        "other_opaque_context",
      ] as const,
      `${path}/role`,
    ),
  };
}

function parseJurisdictionContext(value: unknown, path: string) {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "synthetic",
    "contextKind",
    "configuredJurisdictionRef",
    "publisherJurisdictionEquivalence",
  ]);
  return {
    ...parseMemberHeader(object, "jurisdiction_context", path),
    contextKind: expectLiteral(
      object.contextKind,
      "opaque_monitoring_context",
      `${path}/contextKind`,
    ),
    configuredJurisdictionRef: parseReference(
      object.configuredJurisdictionRef,
      `${path}/configuredJurisdictionRef`,
    ),
    publisherJurisdictionEquivalence: expectLiteral(
      object.publisherJurisdictionEquivalence,
      "not_asserted",
      `${path}/publisherJurisdictionEquivalence`,
    ),
  };
}

function parseAccessContext(value: unknown, path: string) {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "synthetic",
    "deploymentProfileRef",
    "personaProjectionRef",
    "outputAdapterRef",
    "disclosureCeiling",
  ]);
  return {
    ...parseMemberHeader(object, "access_context", path),
    deploymentProfileRef: parseReference(
      object.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    ),
    personaProjectionRef: parseReference(
      object.personaProjectionRef,
      `${path}/personaProjectionRef`,
    ),
    outputAdapterRef: parseReference(
      object.outputAdapterRef,
      `${path}/outputAdapterRef`,
    ),
    disclosureCeiling: expectEnum(
      object.disclosureCeiling,
      DISCLOSURES,
      `${path}/disclosureCeiling`,
    ),
  };
}

function parseAuthorityBinding(
  value: unknown,
  path: string,
): SourcePackAuthorityBinding {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "synthetic",
    "deploymentProfileRef",
    "authorityIdentityRef",
    "configuredJurisdictionRef",
    "role",
    "evidenceRefs",
    "validFrom",
    "validThrough",
  ]);
  return {
    ...parseMemberHeader(object, "authority_binding", path),
    deploymentProfileRef: parseReference(
      object.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    ),
    authorityIdentityRef: parseReference(
      object.authorityIdentityRef,
      `${path}/authorityIdentityRef`,
    ),
    configuredJurisdictionRef: parseReference(
      object.configuredJurisdictionRef,
      `${path}/configuredJurisdictionRef`,
    ),
    role: expectLiteral(
      object.role,
      "synthetic_test_configuration",
      `${path}/role`,
    ),
    evidenceRefs: parseTypedReferenceSet(
      object.evidenceRefs,
      "evidence_receipt",
      `${path}/evidenceRefs`,
      1,
    ),
    ...parseValidity(object, path),
  };
}

function parseEvidenceReceipt(
  value: unknown,
  path: string,
): SourcePackEvidenceReceipt {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "synthetic",
    "source",
    "evidenceClass",
    "evidenceKind",
    "subject",
    "fixtureFingerprint",
    "validFrom",
    "validThrough",
  ]);
  const evidenceKind = expectEnum<SourcePackEvidenceKind>(
    object.evidenceKind,
    [
      "synthetic_fixture_identity",
      "synthetic_contract_structure",
      "synthetic_coverage_declaration",
      "synthetic_configuration_authority",
    ],
    `${path}/evidenceKind`,
  );
  const subjectObject = expectObject(object.subject, `${path}/subject`, [
    "kind",
    "ref",
  ]);
  const subjectKind = expectEnum(
    subjectObject.kind,
    ["contract_receipt", "coverage_declaration", "authority_binding"] as const,
    `${path}/subject/kind`,
  );
  const subject = {
    kind: subjectKind,
    ref: parseTypedReference(
      subjectObject.ref,
      subjectKind,
      `${path}/subject/ref`,
    ),
  } as SourcePackEvidenceSubject;
  return {
    ...parseMemberHeader(object, "evidence_receipt", path),
    source: parseSourceIdentity(object.source, `${path}/source`),
    evidenceClass: expectLiteral(
      object.evidenceClass,
      "repository_authored_synthetic_test",
      `${path}/evidenceClass`,
    ),
    evidenceKind,
    subject,
    fixtureFingerprint: expectFingerprint(
      object.fixtureFingerprint,
      `${path}/fixtureFingerprint`,
    ),
    ...parseValidity(object, path),
  };
}

function parseContractReceipt(
  value: unknown,
  path: string,
): SourcePackContractReceipt {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "synthetic",
    "source",
    "adapterRef",
    "fixtureFingerprint",
    "providerLayer",
    "internalLayer",
    "publicLayer",
    "qualification",
    "evidenceRefs",
    "validFrom",
    "validThrough",
  ]);
  return {
    ...parseMemberHeader(object, "contract_receipt", path),
    source: parseSourceIdentity(object.source, `${path}/source`),
    adapterRef: parseReference(object.adapterRef, `${path}/adapterRef`),
    fixtureFingerprint: expectFingerprint(
      object.fixtureFingerprint,
      `${path}/fixtureFingerprint`,
    ),
    providerLayer: expectLiteral(
      object.providerLayer,
      "synthetic_fixture_reference",
      `${path}/providerLayer`,
    ),
    internalLayer: expectLiteral(
      object.internalLayer,
      "closed_normalized_reference",
      `${path}/internalLayer`,
    ),
    publicLayer: expectLiteral(
      object.publicLayer,
      "reference_only_no_payload",
      `${path}/publicLayer`,
    ),
    qualification: expectLiteral(
      object.qualification,
      "synthetic_test_qualified",
      `${path}/qualification`,
    ),
    evidenceRefs: parseTypedReferenceSet(
      object.evidenceRefs,
      "evidence_receipt",
      `${path}/evidenceRefs`,
      2,
    ),
    ...parseValidity(object, path),
  };
}

function parseCoverageSlotStates(
  value: unknown,
  path: string,
): readonly SourcePackCoverageSlotState[] {
  const parsed = expectArray(value, path, 1, 128).map((entry, index) => {
    const itemPath = `${path}/${index}`;
    const object = expectObject(entry, itemPath, ["slotRef", "state"]);
    return {
      slotRef: expectStableId(object.slotRef, `${itemPath}/slotRef`),
      state: expectEnum<SourcePackCoverageState>(
        object.state,
        COVERAGE_STATES,
        `${itemPath}/state`,
      ),
    };
  });
  const sorted = [...parsed].sort((left, right) =>
    compareText(left.slotRef, right.slotRef),
  );
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index - 1]?.slotRef === sorted[index]?.slotRef) {
      fail("DUPLICATE_REFERENCE", path, "coverage slot is declared twice");
    }
  }
  return sorted;
}

function parseCoverageDeclaration(
  value: unknown,
  path: string,
): SourcePackCoverageDeclaration {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "synthetic",
    "source",
    "sourceContextRef",
    "jurisdictionContextRef",
    "evidenceRefs",
    "slotStates",
  ]);
  return {
    ...parseMemberHeader(object, "coverage_declaration", path),
    source: parseSourceIdentity(object.source, `${path}/source`),
    sourceContextRef: parseTypedReference(
      object.sourceContextRef,
      "source_context",
      `${path}/sourceContextRef`,
    ),
    jurisdictionContextRef: parseTypedReference(
      object.jurisdictionContextRef,
      "jurisdiction_context",
      `${path}/jurisdictionContextRef`,
    ),
    evidenceRefs: parseTypedReferenceSet(
      object.evidenceRefs,
      "evidence_receipt",
      `${path}/evidenceRefs`,
      1,
    ),
    slotStates: parseCoverageSlotStates(
      object.slotStates,
      `${path}/slotStates`,
    ),
  };
}

function parseReviewAttestation(
  value: unknown,
  path: string,
): SourcePackReviewAttestation {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "synthetic",
    "subject",
    "authorityBindingRef",
    "evidenceRefs",
    "state",
    "reviewedAt",
    "validFrom",
    "validThrough",
  ]);
  const subjectObject = expectObject(object.subject, `${path}/subject`, [
    "kind",
    "ref",
  ]);
  const subjectKind = expectEnum(
    subjectObject.kind,
    ["contract_receipt", "coverage_declaration"] as const,
    `${path}/subject/kind`,
  );
  const subject = {
    kind: subjectKind,
    ref: parseTypedReference(
      subjectObject.ref,
      subjectKind,
      `${path}/subject/ref`,
    ),
  } as SourcePackReviewAttestation["subject"];
  return {
    ...parseMemberHeader(object, "review_attestation", path),
    subject,
    authorityBindingRef: parseTypedReference(
      object.authorityBindingRef,
      "authority_binding",
      `${path}/authorityBindingRef`,
    ),
    evidenceRefs: parseTypedReferenceSet(
      object.evidenceRefs,
      "evidence_receipt",
      `${path}/evidenceRefs`,
      1,
    ),
    state: expectEnum(
      object.state,
      [
        "synthetic_test_accepted",
        "synthetic_test_pending",
        "synthetic_test_rejected",
      ] as const,
      `${path}/state`,
    ),
    reviewedAt: expectTimestamp(object.reviewedAt, `${path}/reviewedAt`),
    ...parseValidity(object, path),
  };
}

function parseAdmissionReceipt(value: unknown, path: string) {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "synthetic",
    "source",
    "contractReceiptRef",
    "coverageDeclarationRef",
    "authorityBindingRef",
    "reviewAttestationRefs",
    "sourceContextRef",
    "jurisdictionContextRef",
    "deploymentProfileRef",
    "regionPackRef",
    "personaProjectionRef",
    "outputAdapterRef",
    "operationGrants",
    "state",
    "validFrom",
    "validThrough",
  ]);
  return {
    ...parseMemberHeader(object, "admission_receipt", path),
    source: parseSourceIdentity(object.source, `${path}/source`),
    contractReceiptRef: parseTypedReference(
      object.contractReceiptRef,
      "contract_receipt",
      `${path}/contractReceiptRef`,
    ),
    coverageDeclarationRef: parseTypedReference(
      object.coverageDeclarationRef,
      "coverage_declaration",
      `${path}/coverageDeclarationRef`,
    ),
    authorityBindingRef: parseTypedReference(
      object.authorityBindingRef,
      "authority_binding",
      `${path}/authorityBindingRef`,
    ),
    reviewAttestationRefs: parseTypedReferenceSet(
      object.reviewAttestationRefs,
      "review_attestation",
      `${path}/reviewAttestationRefs`,
      2,
    ),
    sourceContextRef: parseTypedReference(
      object.sourceContextRef,
      "source_context",
      `${path}/sourceContextRef`,
    ),
    jurisdictionContextRef: parseTypedReference(
      object.jurisdictionContextRef,
      "jurisdiction_context",
      `${path}/jurisdictionContextRef`,
    ),
    deploymentProfileRef: parseReference(
      object.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    ),
    regionPackRef: parseReference(
      object.regionPackRef,
      `${path}/regionPackRef`,
    ),
    personaProjectionRef: parseReference(
      object.personaProjectionRef,
      `${path}/personaProjectionRef`,
    ),
    outputAdapterRef: parseReference(
      object.outputAdapterRef,
      `${path}/outputAdapterRef`,
    ),
    operationGrants: parseEnumSet(
      object.operationGrants,
      OPERATIONS,
      `${path}/operationGrants`,
      1,
    ),
    state: expectEnum<SourcePackAdmissionState>(
      object.state,
      [
        "synthetic_test_admitted",
        "pack_binding_disabled",
        "not_admitted",
        "expired",
        "revoked",
      ],
      `${path}/state`,
    ),
    ...parseValidity(object, path),
  };
}

function parseObservationBase<
  Kind extends "availability_observation" | "health_observation",
>(value: unknown, path: string, kind: Kind) {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "synthetic",
    "source",
    "sourceContextRef",
    "jurisdictionContextRef",
    "deploymentProfileRef",
    "scope",
    "observedAt",
    "state",
  ]);
  return {
    object,
    base: {
      ...parseMemberHeader(object, kind, path),
      source: parseSourceIdentity(object.source, `${path}/source`),
      sourceContextRef: parseTypedReference(
        object.sourceContextRef,
        "source_context",
        `${path}/sourceContextRef`,
      ),
      jurisdictionContextRef: parseTypedReference(
        object.jurisdictionContextRef,
        "jurisdiction_context",
        `${path}/jurisdictionContextRef`,
      ),
      deploymentProfileRef: parseReference(
        object.deploymentProfileRef,
        `${path}/deploymentProfileRef`,
      ),
      scope: expectEnum(object.scope, OBSERVATION_SCOPES, `${path}/scope`),
      observedAt: expectTimestamp(object.observedAt, `${path}/observedAt`),
    },
  };
}

function parseAvailabilityObservation(
  value: unknown,
  path: string,
): SourcePackAvailabilityObservation {
  const { object, base } = parseObservationBase(
    value,
    path,
    "availability_observation",
  );
  return {
    ...base,
    state: expectEnum(object.state, AVAILABILITY_STATES, `${path}/state`),
  };
}

function parseHealthObservation(
  value: unknown,
  path: string,
): SourcePackHealthObservation {
  const { object, base } = parseObservationBase(
    value,
    path,
    "health_observation",
  );
  return {
    ...base,
    state: expectEnum(object.state, HEALTH_STATES, `${path}/state`),
  };
}

function parsePredecessorReferences(
  value: unknown,
  path: string,
): readonly SourcePackPredecessorReference[] {
  const parsed = expectArray(value, path, 0, 32).map((entry, index) => {
    const itemPath = `${path}/${index}`;
    const object = expectObject(entry, itemPath, [
      "kind",
      "bundleRef",
      "objectRef",
    ]);
    return {
      kind: expectEnum(
        object.kind,
        ["geographic_relation", "rights_frame", "taxonomy_namespace"] as const,
        `${itemPath}/kind`,
      ),
      bundleRef: parseReference(object.bundleRef, `${itemPath}/bundleRef`),
      objectRef: parseReference(object.objectRef, `${itemPath}/objectRef`),
    };
  });
  const sorted = [...parsed].sort((left, right) =>
    compareText(
      `${left.kind}\u0000${refKey(left.bundleRef)}\u0000${refKey(left.objectRef)}`,
      `${right.kind}\u0000${refKey(right.bundleRef)}\u0000${refKey(right.objectRef)}`,
    ),
  );
  for (let index = 1; index < sorted.length; index += 1) {
    const left = sorted[index - 1]!;
    const right = sorted[index]!;
    if (
      left.kind === right.kind &&
      sameRef(left.bundleRef, right.bundleRef) &&
      sameRef(left.objectRef, right.objectRef)
    ) {
      fail("DUPLICATE_REFERENCE", path, "predecessor reference is duplicated");
    }
  }
  return sorted;
}

function parseSourceBinding(
  value: unknown,
  path: string,
): SourcePackSourceBinding {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "synthetic",
    "source",
    "sourceContextRef",
    "jurisdictionContextRef",
    "contractReceiptRef",
    "coverageDeclarationRef",
    "authorityBindingRef",
    "admissionReceiptRef",
    "visibility",
    "predecessorRefs",
  ]);
  return {
    ...parseMemberHeader(object, "source_binding", path),
    source: parseSourceIdentity(object.source, `${path}/source`),
    sourceContextRef: parseTypedReference(
      object.sourceContextRef,
      "source_context",
      `${path}/sourceContextRef`,
    ),
    jurisdictionContextRef: parseTypedReference(
      object.jurisdictionContextRef,
      "jurisdiction_context",
      `${path}/jurisdictionContextRef`,
    ),
    contractReceiptRef: parseTypedReference(
      object.contractReceiptRef,
      "contract_receipt",
      `${path}/contractReceiptRef`,
    ),
    coverageDeclarationRef: parseTypedReference(
      object.coverageDeclarationRef,
      "coverage_declaration",
      `${path}/coverageDeclarationRef`,
    ),
    authorityBindingRef: parseTypedReference(
      object.authorityBindingRef,
      "authority_binding",
      `${path}/authorityBindingRef`,
    ),
    admissionReceiptRef: parseTypedReference(
      object.admissionReceiptRef,
      "admission_receipt",
      `${path}/admissionReceiptRef`,
    ),
    visibility: expectEnum(
      object.visibility,
      DISCLOSURES,
      `${path}/visibility`,
    ),
    predecessorRefs: parsePredecessorReferences(
      object.predecessorRefs,
      `${path}/predecessorRefs`,
    ),
  };
}

function parseDeploymentBinding(value: unknown, path: string) {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "synthetic",
    "deploymentProfileRef",
    "regionPackRef",
    "sourceBindingRefs",
    "accessContextRefs",
  ]);
  return {
    ...parseMemberHeader(object, "deployment_binding", path),
    deploymentProfileRef: parseReference(
      object.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    ),
    regionPackRef: parseReference(
      object.regionPackRef,
      `${path}/regionPackRef`,
    ),
    sourceBindingRefs: parseTypedReferenceSet(
      object.sourceBindingRefs,
      "source_binding",
      `${path}/sourceBindingRefs`,
      1,
    ),
    accessContextRefs: parseTypedReferenceSet(
      object.accessContextRefs,
      "access_context",
      `${path}/accessContextRefs`,
      1,
    ),
  };
}

function resolveCanonicalSource(
  source: SourcePackSourceIdentity,
  path: string,
): CanonicalRegistrySource {
  if (source.sourceRegistryVersion !== sourceRegistry.registryVersion) {
    fail(
      "INVALID_SOURCE_IDENTITY",
      `${path}/sourceRegistryVersion`,
      "source configuration version does not match the canonical registry",
    );
  }
  const matches = sourceRegistry.sources.filter(
    (candidate) => candidate.id === source.sourceId,
  );
  if (matches.length !== 1) {
    fail(
      "INVALID_SOURCE_IDENTITY",
      `${path}/sourceId`,
      "source identity does not resolve exactly once",
    );
  }
  const candidate = matches[0]!;
  if (
    candidate.synthetic !== true ||
    candidate.access.method !== "fixture" ||
    candidate.adapter === null ||
    !candidate.adapter.module.startsWith("fixtures/")
  ) {
    fail(
      "INVALID_SYNTHETIC_TRUST",
      path,
      "source is outside the synthetic fixture trust domain",
    );
  }
  return candidate;
}

function allCatalogMembers(bundle: SourcePackBundle): readonly CatalogMember[] {
  return [
    ...bundle.sourceContexts,
    ...bundle.jurisdictionContexts,
    ...bundle.accessContexts,
    ...bundle.authorityBindings,
    ...bundle.evidenceReceipts,
    ...bundle.contractReceipts,
    ...bundle.coverageDeclarations,
    ...bundle.reviewAttestations,
    ...bundle.admissionReceipts,
    ...bundle.availabilityObservations,
    ...bundle.healthObservations,
    ...bundle.sourceBindings,
    ...bundle.deploymentBindings,
  ];
}

interface LocalCatalogs {
  readonly byId: ReadonlyMap<string, CatalogMember>;
  readonly byKind: ReadonlyMap<
    SourcePackCatalogKind,
    ReadonlyMap<string, CatalogMember>
  >;
}

function makeCatalogs(bundle: SourcePackBundle): LocalCatalogs {
  const byId = new Map<string, CatalogMember>();
  const mutableByKind = new Map<
    SourcePackCatalogKind,
    Map<string, CatalogMember>
  >();
  for (const member of allCatalogMembers(bundle)) {
    if (byId.has(member.id)) {
      fail("DUPLICATE_ID", "/catalogs", "catalog IDs must be globally unique");
    }
    byId.set(member.id, member);
    const catalog = mutableByKind.get(member.kind) ?? new Map();
    catalog.set(refKey(member), member);
    mutableByKind.set(member.kind, catalog);
  }
  return { byId, byKind: mutableByKind };
}

function resolveLocal<Kind extends SourcePackCatalogKind>(
  catalogs: LocalCatalogs,
  reference: SourcePackReference<Kind>,
  expectedKind: Kind,
  path: string,
): Extract<CatalogMember, { readonly kind: Kind }> {
  const byId = catalogs.byId.get(reference.id);
  if (byId === undefined) {
    fail("UNKNOWN_REFERENCE", path, "reference does not resolve");
  }
  if (reference.kind !== expectedKind || byId.kind !== expectedKind) {
    fail("WRONG_KIND", path, "reference resolves to the wrong catalog kind");
  }
  if (byId.version !== reference.version) {
    fail("WRONG_VERSION", path, "reference version does not match");
  }
  return byId as Extract<CatalogMember, { readonly kind: Kind }>;
}

function requireSameSource(
  expected: SourcePackSourceIdentity,
  actual: SourcePackSourceIdentity,
  path: string,
): void {
  if (!sameSource(expected, actual)) {
    fail("CROSS_SOURCE_REFERENCE", path, "reference crosses source identity");
  }
}

function requireSameRef(
  expected: VersionedReference,
  actual: VersionedReference,
  code: string,
  path: string,
): void {
  if (!sameRef(expected, actual)) {
    fail(code, path, "reference crosses its configured scope");
  }
}

function requireEvidenceKinds(
  references: readonly SourcePackReference<"evidence_receipt">[],
  source: SourcePackSourceIdentity,
  requiredKinds: readonly SourcePackEvidenceKind[],
  catalogs: LocalCatalogs,
  path: string,
): ReadonlyMap<SourcePackEvidenceKind, SourcePackEvidenceReceipt> {
  if (references.length !== requiredKinds.length) {
    fail(
      "CROSS_TRUST_REFERENCE",
      path,
      "evidence references must exactly match the required structural roles",
    );
  }
  const found = new Map<SourcePackEvidenceKind, SourcePackEvidenceReceipt>();
  references.forEach((reference, index) => {
    const evidence = resolveLocal(
      catalogs,
      reference,
      "evidence_receipt",
      `${path}/${index}`,
    );
    requireSameSource(source, evidence.source, `${path}/${index}`);
    if (found.has(evidence.evidenceKind)) {
      fail("CROSS_TRUST_REFERENCE", path, "evidence roles must be unique");
    }
    found.set(evidence.evidenceKind, evidence);
  });
  if (requiredKinds.some((kind) => !found.has(kind))) {
    fail(
      "CROSS_TRUST_REFERENCE",
      path,
      "required synthetic structural evidence role is absent",
    );
  }
  return found;
}

function validateLocalGraph(bundle: SourcePackBundle): LocalCatalogs {
  const catalogs = makeCatalogs(bundle);
  const configuredAuthorityKeys = new Set(
    bundle.configurationAuthorityBindingRefs.map((reference, index) => {
      resolveLocal(
        catalogs,
        reference,
        "authority_binding",
        `/configurationAuthorityBindingRefs/${index}`,
      );
      return typedRefKey(reference);
    }),
  );
  const catalogAuthorityKeys = new Set(
    bundle.authorityBindings.map((authority) => typedRefKey(authority)),
  );
  const admissionAuthorityKeys = new Set(
    bundle.admissionReceipts.map((admission) =>
      typedRefKey(admission.authorityBindingRef),
    ),
  );
  if (
    configuredAuthorityKeys.size !== catalogAuthorityKeys.size ||
    configuredAuthorityKeys.size !== admissionAuthorityKeys.size ||
    [...configuredAuthorityKeys].some(
      (key) =>
        !catalogAuthorityKeys.has(key) || !admissionAuthorityKeys.has(key),
    )
  ) {
    fail(
      "CROSS_TRUST_REFERENCE",
      "/configurationAuthorityBindingRefs",
      "configuration authority references must exactly close the used authority catalog",
    );
  }

  const sourceBearing: readonly {
    readonly source: SourcePackSourceIdentity;
    readonly path: string;
  }[] = [
    ...bundle.evidenceReceipts.map((value, index) => ({
      source: value.source,
      path: `/evidenceReceipts/${index}/source`,
    })),
    ...bundle.contractReceipts.map((value, index) => ({
      source: value.source,
      path: `/contractReceipts/${index}/source`,
    })),
    ...bundle.coverageDeclarations.map((value, index) => ({
      source: value.source,
      path: `/coverageDeclarations/${index}/source`,
    })),
    ...bundle.admissionReceipts.map((value, index) => ({
      source: value.source,
      path: `/admissionReceipts/${index}/source`,
    })),
    ...bundle.availabilityObservations.map((value, index) => ({
      source: value.source,
      path: `/availabilityObservations/${index}/source`,
    })),
    ...bundle.healthObservations.map((value, index) => ({
      source: value.source,
      path: `/healthObservations/${index}/source`,
    })),
    ...bundle.sourceBindings.map((value, index) => ({
      source: value.source,
      path: `/sourceBindings/${index}/source`,
    })),
  ];
  sourceBearing.forEach(({ source, path }) =>
    resolveCanonicalSource(source, path),
  );

  type PrimaryEvidenceConsumer = {
    readonly kind:
      "contract_receipt" | "coverage_declaration" | "authority_binding";
    readonly ref: VersionedReference;
  };
  const primaryConsumers = new Map<string, PrimaryEvidenceConsumer[]>();
  const registerPrimaryConsumers = (
    consumer: PrimaryEvidenceConsumer,
    references: readonly SourcePackReference<"evidence_receipt">[],
  ) => {
    references.forEach((reference) => {
      const key = refKey(reference);
      const consumers = primaryConsumers.get(key) ?? [];
      consumers.push(consumer);
      primaryConsumers.set(key, consumers);
    });
  };
  bundle.contractReceipts.forEach((contract) =>
    registerPrimaryConsumers(
      {
        kind: "contract_receipt",
        ref: contract,
      },
      contract.evidenceRefs,
    ),
  );
  bundle.coverageDeclarations.forEach((coverage) =>
    registerPrimaryConsumers(
      {
        kind: "coverage_declaration",
        ref: coverage,
      },
      coverage.evidenceRefs,
    ),
  );
  bundle.authorityBindings.forEach((authority) =>
    registerPrimaryConsumers(
      {
        kind: "authority_binding",
        ref: authority,
      },
      authority.evidenceRefs,
    ),
  );

  const validateEvidenceSubjectsAndClosure = () =>
    bundle.evidenceReceipts.forEach((evidence, index) => {
      const expectedSubjectKind =
        evidence.evidenceKind === "synthetic_coverage_declaration"
          ? "coverage_declaration"
          : evidence.evidenceKind === "synthetic_configuration_authority"
            ? "authority_binding"
            : "contract_receipt";
      if (evidence.subject.kind !== expectedSubjectKind) {
        fail(
          "CROSS_TRUST_REFERENCE",
          `/evidenceReceipts/${index}/subject`,
          "evidence role and subject kind do not match",
        );
      }
      const subject = resolveLocal(
        catalogs,
        evidence.subject.ref,
        evidence.subject.kind,
        `/evidenceReceipts/${index}/subject/ref`,
      );
      const consumers = primaryConsumers.get(refKey(evidence)) ?? [];
      if (consumers.length !== 1) {
        fail(
          "CROSS_TRUST_REFERENCE",
          `/evidenceReceipts/${index}`,
          "evidence must have exactly one primary contract, coverage, or authority consumer",
        );
      }
      const consumer = consumers[0]!;
      if (
        consumer.kind !== evidence.subject.kind ||
        !sameRef(consumer.ref, evidence.subject.ref)
      ) {
        fail(
          "CROSS_TRUST_REFERENCE",
          `/evidenceReceipts/${index}/subject`,
          "evidence subject does not match its sole primary consumer",
        );
      }
      if (
        subject.kind === "contract_receipt" ||
        subject.kind === "coverage_declaration"
      ) {
        requireSameSource(
          subject.source,
          evidence.source,
          `/evidenceReceipts/${index}/subject`,
        );
      } else {
        const authorityAdmissions = bundle.admissionReceipts.filter(
          (admission) => sameRef(admission.authorityBindingRef, subject),
        );
        if (
          authorityAdmissions.length === 0 ||
          authorityAdmissions.some(
            (admission) => !sameSource(admission.source, evidence.source),
          )
        ) {
          fail(
            "CROSS_TRUST_REFERENCE",
            `/evidenceReceipts/${index}/subject`,
            "authority evidence crosses its exact source and admission scope",
          );
        }
      }
    });

  bundle.authorityBindings.forEach((authority, index) => {
    const evidence = authority.evidenceRefs.map((reference, evidenceIndex) =>
      resolveLocal(
        catalogs,
        reference,
        "evidence_receipt",
        `/authorityBindings/${index}/evidenceRefs/${evidenceIndex}`,
      ),
    );
    if (
      evidence.length !== 1 ||
      evidence[0]?.evidenceKind !== "synthetic_configuration_authority"
    ) {
      fail(
        "CROSS_TRUST_REFERENCE",
        `/authorityBindings/${index}/evidenceRefs`,
        "configuration authority evidence is absent",
      );
    }
  });

  bundle.contractReceipts.forEach((contract, index) => {
    const canonical = resolveCanonicalSource(
      contract.source,
      `/contractReceipts/${index}/source`,
    );
    if (
      canonical.adapter === null ||
      !sameRef(contract.adapterRef, canonical.adapter)
    ) {
      fail(
        "INVALID_SOURCE_IDENTITY",
        `/contractReceipts/${index}/adapterRef`,
        "adapter reference does not match the canonical source entry",
      );
    }
    const evidence = requireEvidenceKinds(
      contract.evidenceRefs,
      contract.source,
      ["synthetic_fixture_identity", "synthetic_contract_structure"],
      catalogs,
      `/contractReceipts/${index}/evidenceRefs`,
    );
    if (
      evidence.get("synthetic_contract_structure")?.fixtureFingerprint !==
      contract.fixtureFingerprint
    ) {
      fail(
        "CROSS_TRUST_REFERENCE",
        `/contractReceipts/${index}/fixtureFingerprint`,
        "contract fingerprint does not match its exact structural evidence",
      );
    }
  });

  bundle.coverageDeclarations.forEach((coverage, index) => {
    resolveLocal(
      catalogs,
      coverage.sourceContextRef,
      "source_context",
      `/coverageDeclarations/${index}/sourceContextRef`,
    );
    resolveLocal(
      catalogs,
      coverage.jurisdictionContextRef,
      "jurisdiction_context",
      `/coverageDeclarations/${index}/jurisdictionContextRef`,
    );
    requireEvidenceKinds(
      coverage.evidenceRefs,
      coverage.source,
      ["synthetic_coverage_declaration"],
      catalogs,
      `/coverageDeclarations/${index}/evidenceRefs`,
    );
  });

  validateEvidenceSubjectsAndClosure();

  bundle.reviewAttestations.forEach((review, index) => {
    const authority = resolveLocal(
      catalogs,
      review.authorityBindingRef,
      "authority_binding",
      `/reviewAttestations/${index}/authorityBindingRef`,
    );
    const subject = resolveLocal(
      catalogs,
      review.subject.ref,
      review.subject.kind,
      `/reviewAttestations/${index}/subject/ref`,
    );
    const subjectSource = subject.source;
    if (subject.kind === "coverage_declaration") {
      const jurisdictionContext = resolveLocal(
        catalogs,
        subject.jurisdictionContextRef,
        "jurisdiction_context",
        `/reviewAttestations/${index}/subject/ref`,
      );
      requireSameRef(
        jurisdictionContext.configuredJurisdictionRef,
        authority.configuredJurisdictionRef,
        "CROSS_JURISDICTION_REFERENCE",
        `/reviewAttestations/${index}/authorityBindingRef`,
      );
    }
    const requiredEvidenceKind =
      review.subject.kind === "contract_receipt"
        ? "synthetic_contract_structure"
        : "synthetic_coverage_declaration";
    const subjectEvidenceRefs = subject.evidenceRefs.filter((reference) => {
      const evidence = resolveLocal(
        catalogs,
        reference,
        "evidence_receipt",
        `/reviewAttestations/${index}/subject/ref`,
      );
      return evidence.evidenceKind === requiredEvidenceKind;
    });
    if (
      subjectEvidenceRefs.length !== 1 ||
      review.evidenceRefs.length !== 1 ||
      typedRefKey(subjectEvidenceRefs[0]!) !==
        typedRefKey(review.evidenceRefs[0]!)
    ) {
      fail(
        "CROSS_TRUST_REFERENCE",
        `/reviewAttestations/${index}/evidenceRefs`,
        "review evidence must exactly match the reviewed subject evidence",
      );
    }
    const reviewEvidence = review.evidenceRefs.map((reference, evidenceIndex) =>
      resolveLocal(
        catalogs,
        reference,
        "evidence_receipt",
        `/reviewAttestations/${index}/evidenceRefs/${evidenceIndex}`,
      ),
    );
    reviewEvidence.forEach((evidence, evidenceIndex) => {
      requireSameSource(
        subjectSource,
        evidence.source,
        `/reviewAttestations/${index}/evidenceRefs/${evidenceIndex}`,
      );
      if (evidence.evidenceKind !== requiredEvidenceKind) {
        fail(
          "CROSS_TRUST_REFERENCE",
          `/reviewAttestations/${index}/evidenceRefs/${evidenceIndex}`,
          "review evidence has the wrong structural role",
        );
      }
    });
    const authorityEvidence = authority.evidenceRefs.map(
      (reference, evidenceIndex) =>
        resolveLocal(
          catalogs,
          reference,
          "evidence_receipt",
          `/reviewAttestations/${index}/authorityBindingRef/evidenceRefs/${evidenceIndex}`,
        ),
    );
    authorityEvidence.forEach((evidence, evidenceIndex) =>
      requireSameSource(
        subjectSource,
        evidence.source,
        `/reviewAttestations/${index}/authorityBindingRef/evidenceRefs/${evidenceIndex}`,
      ),
    );
    if (review.reviewedAt < review.validFrom) {
      fail(
        "CROSS_TRUST_REFERENCE",
        `/reviewAttestations/${index}/reviewedAt`,
        "review predates its validity interval",
      );
    }
    if (
      review.validThrough !== null &&
      review.reviewedAt > review.validThrough
    ) {
      fail(
        "CROSS_TRUST_REFERENCE",
        `/reviewAttestations/${index}/reviewedAt`,
        "review is outside its validity interval",
      );
    }
    const subjectWasCurrent =
      review.subject.kind !== "contract_receipt" ||
      isCurrent(subject as SourcePackContractReceipt, review.reviewedAt);
    if (
      !subjectWasCurrent ||
      !isCurrent(authority, review.reviewedAt) ||
      !reviewEvidence.every((evidence) =>
        isCurrent(evidence, review.reviewedAt),
      ) ||
      !authorityEvidence.every((evidence) =>
        isCurrent(evidence, review.reviewedAt),
      )
    ) {
      fail(
        "CROSS_TRUST_REFERENCE",
        `/reviewAttestations/${index}/reviewedAt`,
        "review time is outside its exact subject, evidence, or authority proof interval",
      );
    }
  });

  bundle.admissionReceipts.forEach((admission, index) => {
    const contract = resolveLocal(
      catalogs,
      admission.contractReceiptRef,
      "contract_receipt",
      `/admissionReceipts/${index}/contractReceiptRef`,
    );
    const coverage = resolveLocal(
      catalogs,
      admission.coverageDeclarationRef,
      "coverage_declaration",
      `/admissionReceipts/${index}/coverageDeclarationRef`,
    );
    const authority = resolveLocal(
      catalogs,
      admission.authorityBindingRef,
      "authority_binding",
      `/admissionReceipts/${index}/authorityBindingRef`,
    );
    resolveLocal(
      catalogs,
      admission.sourceContextRef,
      "source_context",
      `/admissionReceipts/${index}/sourceContextRef`,
    );
    const jurisdiction = resolveLocal(
      catalogs,
      admission.jurisdictionContextRef,
      "jurisdiction_context",
      `/admissionReceipts/${index}/jurisdictionContextRef`,
    );
    requireSameSource(
      admission.source,
      contract.source,
      `/admissionReceipts/${index}`,
    );
    requireSameSource(
      admission.source,
      coverage.source,
      `/admissionReceipts/${index}`,
    );
    requireSameRef(
      admission.sourceContextRef,
      coverage.sourceContextRef,
      "CROSS_CONTEXT_REFERENCE",
      `/admissionReceipts/${index}/sourceContextRef`,
    );
    requireSameRef(
      admission.jurisdictionContextRef,
      coverage.jurisdictionContextRef,
      "CROSS_JURISDICTION_REFERENCE",
      `/admissionReceipts/${index}/jurisdictionContextRef`,
    );
    requireSameRef(
      admission.deploymentProfileRef,
      authority.deploymentProfileRef,
      "CROSS_DEPLOYMENT_REFERENCE",
      `/admissionReceipts/${index}/authorityBindingRef`,
    );
    requireSameRef(
      jurisdiction.configuredJurisdictionRef,
      authority.configuredJurisdictionRef,
      "CROSS_JURISDICTION_REFERENCE",
      `/admissionReceipts/${index}/authorityBindingRef`,
    );
    const authorityEvidence = authority.evidenceRefs.map((reference) =>
      resolveLocal(
        catalogs,
        reference,
        "evidence_receipt",
        "/authorityBindings",
      ),
    );
    if (
      !authorityEvidence.some(
        (evidence) =>
          sameSource(evidence.source, admission.source) &&
          evidence.evidenceKind === "synthetic_configuration_authority",
      )
    ) {
      fail(
        "CROSS_TRUST_REFERENCE",
        `/admissionReceipts/${index}/authorityBindingRef`,
        "authority lacks source-scoped configuration evidence",
      );
    }
    let contractReviewed = false;
    let coverageReviewed = false;
    admission.reviewAttestationRefs.forEach((reference, reviewIndex) => {
      const review = resolveLocal(
        catalogs,
        reference,
        "review_attestation",
        `/admissionReceipts/${index}/reviewAttestationRefs/${reviewIndex}`,
      );
      if (review.state !== "synthetic_test_accepted") {
        fail(
          "CROSS_TRUST_REFERENCE",
          `/admissionReceipts/${index}/reviewAttestationRefs/${reviewIndex}`,
          "admission may bind only accepted synthetic-test reviews",
        );
      }
      requireSameRef(
        admission.authorityBindingRef,
        review.authorityBindingRef,
        "CROSS_TRUST_REFERENCE",
        `/admissionReceipts/${index}/reviewAttestationRefs/${reviewIndex}`,
      );
      const reviewSubject = resolveLocal(
        catalogs,
        review.subject.ref,
        review.subject.kind,
        `/admissionReceipts/${index}/reviewAttestationRefs/${reviewIndex}`,
      );
      requireSameSource(
        admission.source,
        reviewSubject.source,
        `/admissionReceipts/${index}/reviewAttestationRefs/${reviewIndex}`,
      );
      if (review.subject.kind === "contract_receipt") {
        if (!sameRef(review.subject.ref, admission.contractReceiptRef)) {
          fail(
            "CROSS_TRUST_REFERENCE",
            `/admissionReceipts/${index}/reviewAttestationRefs/${reviewIndex}`,
            "contract review subject is outside the exact admission proof",
          );
        }
        contractReviewed = true;
      } else {
        if (!sameRef(review.subject.ref, admission.coverageDeclarationRef)) {
          fail(
            "CROSS_TRUST_REFERENCE",
            `/admissionReceipts/${index}/reviewAttestationRefs/${reviewIndex}`,
            "coverage review subject is outside the exact admission proof",
          );
        }
        coverageReviewed = true;
      }
    });
    if (!contractReviewed || !coverageReviewed) {
      fail(
        "CROSS_TRUST_REFERENCE",
        `/admissionReceipts/${index}/reviewAttestationRefs`,
        "contract and coverage each require an accepted review",
      );
    }
  });

  bundle.sourceBindings.forEach((binding, index) => {
    const contract = resolveLocal(
      catalogs,
      binding.contractReceiptRef,
      "contract_receipt",
      `/sourceBindings/${index}/contractReceiptRef`,
    );
    const coverage = resolveLocal(
      catalogs,
      binding.coverageDeclarationRef,
      "coverage_declaration",
      `/sourceBindings/${index}/coverageDeclarationRef`,
    );
    const authority = resolveLocal(
      catalogs,
      binding.authorityBindingRef,
      "authority_binding",
      `/sourceBindings/${index}/authorityBindingRef`,
    );
    const admission = resolveLocal(
      catalogs,
      binding.admissionReceiptRef,
      "admission_receipt",
      `/sourceBindings/${index}/admissionReceiptRef`,
    );
    resolveLocal(
      catalogs,
      binding.sourceContextRef,
      "source_context",
      `/sourceBindings/${index}/sourceContextRef`,
    );
    resolveLocal(
      catalogs,
      binding.jurisdictionContextRef,
      "jurisdiction_context",
      `/sourceBindings/${index}/jurisdictionContextRef`,
    );
    requireSameSource(
      binding.source,
      contract.source,
      `/sourceBindings/${index}`,
    );
    requireSameSource(
      binding.source,
      coverage.source,
      `/sourceBindings/${index}`,
    );
    requireSameSource(
      binding.source,
      admission.source,
      `/sourceBindings/${index}`,
    );
    requireSameRef(
      binding.sourceContextRef,
      coverage.sourceContextRef,
      "CROSS_CONTEXT_REFERENCE",
      `/sourceBindings/${index}/sourceContextRef`,
    );
    requireSameRef(
      binding.sourceContextRef,
      admission.sourceContextRef,
      "CROSS_CONTEXT_REFERENCE",
      `/sourceBindings/${index}/sourceContextRef`,
    );
    requireSameRef(
      binding.jurisdictionContextRef,
      coverage.jurisdictionContextRef,
      "CROSS_JURISDICTION_REFERENCE",
      `/sourceBindings/${index}/jurisdictionContextRef`,
    );
    requireSameRef(
      binding.jurisdictionContextRef,
      admission.jurisdictionContextRef,
      "CROSS_JURISDICTION_REFERENCE",
      `/sourceBindings/${index}/jurisdictionContextRef`,
    );
    requireSameRef(
      binding.authorityBindingRef,
      admission.authorityBindingRef,
      "CROSS_TRUST_REFERENCE",
      `/sourceBindings/${index}/authorityBindingRef`,
    );
    requireSameRef(
      binding.contractReceiptRef,
      admission.contractReceiptRef,
      "CROSS_TRUST_REFERENCE",
      `/sourceBindings/${index}/contractReceiptRef`,
    );
    requireSameRef(
      binding.coverageDeclarationRef,
      admission.coverageDeclarationRef,
      "CROSS_TRUST_REFERENCE",
      `/sourceBindings/${index}/coverageDeclarationRef`,
    );
    void authority;
  });

  const observationKey = (
    observation:
      SourcePackAvailabilityObservation | SourcePackHealthObservation,
  ) =>
    [
      sourceKey(observation.source),
      typedRefKey(observation.sourceContextRef),
      typedRefKey(observation.jurisdictionContextRef),
      refKey(observation.deploymentProfileRef),
      observation.scope,
      observation.observedAt,
    ].join("\u0001");
  for (const [collectionName, observations] of [
    ["availabilityObservations", bundle.availabilityObservations],
    ["healthObservations", bundle.healthObservations],
  ] as const) {
    const states = new Map<string, string>();
    observations.forEach((observation, index) => {
      resolveLocal(
        catalogs,
        observation.sourceContextRef,
        "source_context",
        `/${collectionName}/${index}/sourceContextRef`,
      );
      resolveLocal(
        catalogs,
        observation.jurisdictionContextRef,
        "jurisdiction_context",
        `/${collectionName}/${index}/jurisdictionContextRef`,
      );
      const matchingBinding = bundle.sourceBindings.some((binding) => {
        const admission = resolveLocal(
          catalogs,
          binding.admissionReceiptRef,
          "admission_receipt",
          `/${collectionName}/${index}`,
        );
        return (
          sameSource(binding.source, observation.source) &&
          sameRef(binding.sourceContextRef, observation.sourceContextRef) &&
          sameRef(
            binding.jurisdictionContextRef,
            observation.jurisdictionContextRef,
          ) &&
          sameRef(
            admission.deploymentProfileRef,
            observation.deploymentProfileRef,
          )
        );
      });
      if (!matchingBinding) {
        fail(
          "CROSS_CONTEXT_REFERENCE",
          `/${collectionName}/${index}`,
          "observation does not match a source binding scope",
        );
      }
      const key = observationKey(observation);
      const prior = states.get(key);
      if (prior !== undefined && prior !== observation.state) {
        fail(
          "INVALID_OBSERVATION_CONFLICT",
          `/${collectionName}/${index}`,
          "equal-time observations disagree",
        );
      }
      states.set(key, observation.state);
    });
  }

  const deploymentScopeKeys = new Set<string>();
  bundle.deploymentBindings.forEach((deployment) => {
    const scopeKey = `${refKey(deployment.deploymentProfileRef)}\u0001${refKey(
      deployment.regionPackRef,
    )}`;
    if (deploymentScopeKeys.has(scopeKey)) {
      fail(
        "DUPLICATE_SCOPE",
        "/deploymentBindings",
        "deployment and region scope tuple must resolve exactly once",
      );
    }
    deploymentScopeKeys.add(scopeKey);
  });

  const boundSources = new Set<string>();
  const boundAccess = new Set<string>();
  bundle.deploymentBindings.forEach((deployment, index) => {
    deployment.sourceBindingRefs.forEach((reference, sourceIndex) => {
      const binding = resolveLocal(
        catalogs,
        reference,
        "source_binding",
        `/deploymentBindings/${index}/sourceBindingRefs/${sourceIndex}`,
      );
      const admission = resolveLocal(
        catalogs,
        binding.admissionReceiptRef,
        "admission_receipt",
        `/deploymentBindings/${index}/sourceBindingRefs/${sourceIndex}`,
      );
      requireSameRef(
        deployment.deploymentProfileRef,
        admission.deploymentProfileRef,
        "CROSS_DEPLOYMENT_REFERENCE",
        `/deploymentBindings/${index}/sourceBindingRefs/${sourceIndex}`,
      );
      requireSameRef(
        deployment.regionPackRef,
        admission.regionPackRef,
        "CROSS_DEPLOYMENT_REFERENCE",
        `/deploymentBindings/${index}/regionPackRef`,
      );
      const key = refKey(reference);
      if (boundSources.has(key)) {
        fail(
          "CROSS_DEPLOYMENT_REFERENCE",
          `/deploymentBindings/${index}/sourceBindingRefs/${sourceIndex}`,
          "source binding occurs in more than one deployment",
        );
      }
      boundSources.add(key);
    });
    deployment.accessContextRefs.forEach((reference, accessIndex) => {
      const access = resolveLocal(
        catalogs,
        reference,
        "access_context",
        `/deploymentBindings/${index}/accessContextRefs/${accessIndex}`,
      );
      requireSameRef(
        deployment.deploymentProfileRef,
        access.deploymentProfileRef,
        "CROSS_DEPLOYMENT_REFERENCE",
        `/deploymentBindings/${index}/accessContextRefs/${accessIndex}`,
      );
      const key = refKey(reference);
      if (boundAccess.has(key)) {
        fail(
          "CROSS_DEPLOYMENT_REFERENCE",
          `/deploymentBindings/${index}/accessContextRefs/${accessIndex}`,
          "access context occurs in more than one deployment",
        );
      }
      boundAccess.add(key);
    });
  });
  if (
    bundle.sourceBindings.some(
      (binding) => !boundSources.has(refKey(binding)),
    ) ||
    bundle.accessContexts.some((access) => !boundAccess.has(refKey(access)))
  ) {
    fail(
      "UNKNOWN_REFERENCE",
      "/deploymentBindings",
      "a binding is outside the closed deployment graph",
    );
  }

  const reviewConsumerCounts = new Map<string, number>();
  bundle.admissionReceipts.forEach((admission) => {
    admission.reviewAttestationRefs.forEach((reference) => {
      const key = refKey(reference);
      reviewConsumerCounts.set(key, (reviewConsumerCounts.get(key) ?? 0) + 1);
    });
  });
  bundle.reviewAttestations.forEach((review, index) => {
    const consumerCount = reviewConsumerCounts.get(refKey(review)) ?? 0;
    const expectedCount = review.state === "synthetic_test_accepted" ? 1 : 0;
    if (consumerCount !== expectedCount) {
      fail(
        "CROSS_TRUST_REFERENCE",
        `/reviewAttestations/${index}`,
        "review consumption does not match its exact synthetic-test state",
      );
    }
  });
  return catalogs;
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

export function parseSourcePackBundle(value: unknown): SourcePackBundle {
  assertPlainJson(value, "$sourcePackBundle");
  const object = expectObject(value, "$sourcePackBundle", [
    "$schema",
    "schemaVersion",
    "id",
    "version",
    "synthetic",
    "trustDomain",
    "lifecycleState",
    "profileBundleRef",
    "configurationAuthorityBindingRefs",
    "sourceContexts",
    "jurisdictionContexts",
    "accessContexts",
    "authorityBindings",
    "evidenceReceipts",
    "contractReceipts",
    "coverageDeclarations",
    "reviewAttestations",
    "admissionReceipts",
    "availabilityObservations",
    "healthObservations",
    "sourceBindings",
    "deploymentBindings",
  ]);
  const bundle: SourcePackBundle = {
    $schema: expectLiteral(
      object.$schema,
      SOURCE_PACK_BUNDLE_SCHEMA_ID,
      "/$schema",
    ),
    schemaVersion: expectLiteral(
      object.schemaVersion,
      SOURCE_PACK_BUNDLE_SCHEMA_VERSION,
      "/schemaVersion",
    ),
    id: expectStableId(object.id, "/id"),
    version: expectVersion(object.version, "/version"),
    synthetic: expectLiteral(object.synthetic, true, "/synthetic"),
    trustDomain: expectLiteral(
      object.trustDomain,
      "synthetic_test_only",
      "/trustDomain",
    ),
    lifecycleState: expectLiteral(
      object.lifecycleState,
      "synthetic_test_configuration",
      "/lifecycleState",
    ),
    profileBundleRef: parseReference(
      object.profileBundleRef,
      "/profileBundleRef",
    ),
    configurationAuthorityBindingRefs: parseTypedReferenceSet(
      object.configurationAuthorityBindingRefs,
      "authority_binding",
      "/configurationAuthorityBindingRefs",
      1,
      128,
    ),
    sourceContexts: parseCatalog(
      object.sourceContexts,
      "/sourceContexts",
      1,
      64,
      parseSourceContext,
    ),
    jurisdictionContexts: parseCatalog(
      object.jurisdictionContexts,
      "/jurisdictionContexts",
      1,
      64,
      parseJurisdictionContext,
    ),
    accessContexts: parseCatalog(
      object.accessContexts,
      "/accessContexts",
      1,
      128,
      parseAccessContext,
    ),
    authorityBindings: parseCatalog(
      object.authorityBindings,
      "/authorityBindings",
      1,
      128,
      parseAuthorityBinding,
    ),
    evidenceReceipts: parseCatalog(
      object.evidenceReceipts,
      "/evidenceReceipts",
      1,
      512,
      parseEvidenceReceipt,
    ),
    contractReceipts: parseCatalog(
      object.contractReceipts,
      "/contractReceipts",
      1,
      256,
      parseContractReceipt,
    ),
    coverageDeclarations: parseCatalog(
      object.coverageDeclarations,
      "/coverageDeclarations",
      1,
      512,
      parseCoverageDeclaration,
    ),
    reviewAttestations: parseCatalog(
      object.reviewAttestations,
      "/reviewAttestations",
      1,
      1024,
      parseReviewAttestation,
    ),
    admissionReceipts: parseCatalog(
      object.admissionReceipts,
      "/admissionReceipts",
      1,
      512,
      parseAdmissionReceipt,
    ),
    availabilityObservations: parseCatalog(
      object.availabilityObservations,
      "/availabilityObservations",
      1,
      4096,
      parseAvailabilityObservation,
    ),
    healthObservations: parseCatalog(
      object.healthObservations,
      "/healthObservations",
      1,
      4096,
      parseHealthObservation,
    ),
    sourceBindings: parseCatalog(
      object.sourceBindings,
      "/sourceBindings",
      1,
      512,
      parseSourceBinding,
    ),
    deploymentBindings: parseCatalog(
      object.deploymentBindings,
      "/deploymentBindings",
      1,
      128,
      parseDeploymentBinding,
    ),
  };
  validateLocalGraph(bundle);
  return canonicalClone(bundle);
}

export function serializeSourcePackBundle(bundle: SourcePackBundle): string {
  return encodeCanonical(parseSourcePackBundle(bundle) as unknown as JsonValue);
}

function profileMap<T extends VersionedReference>(values: readonly T[]) {
  return new Map(values.map((value) => [refKey(value), value]));
}

function resolveProfileReference<T extends VersionedReference>(
  map: ReadonlyMap<string, T>,
  reference: VersionedReference,
  path: string,
): T {
  const result = map.get(refKey(reference));
  if (result === undefined) {
    fail(
      "UNKNOWN_REFERENCE",
      path,
      "reference does not resolve in the profile",
    );
  }
  return result;
}

function validateProfileGraph(
  profile: ProjectionProfileBundle,
  bundle: SourcePackBundle,
  catalogs: LocalCatalogs,
): void {
  requireSameRef(
    bundle.profileBundleRef,
    profile,
    "CROSS_PROFILE_REFERENCE",
    "/profileBundleRef",
  );
  const authorities = profileMap(profile.authorityReferences);
  const outputs = profileMap(profile.outputAdapters);
  const regions = profileMap(profile.regionPacks);
  const deployments = profileMap(profile.deploymentProfiles);
  const personas = profileMap(profile.personaProjections);

  bundle.jurisdictionContexts.forEach((context, index) => {
    const matches = profile.regionPacks.flatMap((region) =>
      region.jurisdictionReferences.filter((jurisdiction) =>
        sameRef(jurisdiction, context.configuredJurisdictionRef),
      ),
    );
    if (
      matches.length !== 1 ||
      matches[0]?.authorityState !== "synthetic_demo"
    ) {
      fail(
        "CROSS_JURISDICTION_REFERENCE",
        `/jurisdictionContexts/${index}/configuredJurisdictionRef`,
        "configured jurisdiction does not resolve exactly once as synthetic demo",
      );
    }
  });

  bundle.authorityBindings.forEach((binding, index) => {
    const deployment = resolveProfileReference(
      deployments,
      binding.deploymentProfileRef,
      `/authorityBindings/${index}/deploymentProfileRef`,
    );
    if (deployment.authorityState !== "synthetic_demo") {
      fail(
        "CROSS_TRUST_REFERENCE",
        `/authorityBindings/${index}/deploymentProfileRef`,
        "deployment is outside synthetic-demo authority",
      );
    }
    resolveProfileReference(
      authorities,
      binding.authorityIdentityRef,
      `/authorityBindings/${index}/authorityIdentityRef`,
    );
    const region = resolveProfileReference(
      regions,
      deployment.regionPackRef,
      `/authorityBindings/${index}/deploymentProfileRef`,
    );
    const jurisdiction = region.jurisdictionReferences.find((candidate) =>
      sameRef(candidate, binding.configuredJurisdictionRef),
    );
    if (
      jurisdiction === undefined ||
      !sameRef(jurisdiction.assertingAuthorityRef, binding.authorityIdentityRef)
    ) {
      fail(
        "CROSS_JURISDICTION_REFERENCE",
        `/authorityBindings/${index}/configuredJurisdictionRef`,
        "authority and configured jurisdiction do not share exact profile scope",
      );
    }
  });

  bundle.accessContexts.forEach((access, index) => {
    const deployment = resolveProfileReference(
      deployments,
      access.deploymentProfileRef,
      `/accessContexts/${index}/deploymentProfileRef`,
    );
    const persona = resolveProfileReference(
      personas,
      access.personaProjectionRef,
      `/accessContexts/${index}/personaProjectionRef`,
    );
    requireSameRef(
      deployment,
      persona.deploymentProfileRef,
      "CROSS_DEPLOYMENT_REFERENCE",
      `/accessContexts/${index}/personaProjectionRef`,
    );
    resolveProfileReference(
      outputs,
      access.outputAdapterRef,
      `/accessContexts/${index}/outputAdapterRef`,
    );
    if (
      !persona.outputAdapterRefs.some((output) =>
        sameRef(output, access.outputAdapterRef),
      )
    ) {
      fail(
        "CROSS_DEPLOYMENT_REFERENCE",
        `/accessContexts/${index}/outputAdapterRef`,
        "output is outside the exact persona scope",
      );
    }
  });

  bundle.admissionReceipts.forEach((admission, index) => {
    const deployment = resolveProfileReference(
      deployments,
      admission.deploymentProfileRef,
      `/admissionReceipts/${index}/deploymentProfileRef`,
    );
    const region = resolveProfileReference(
      regions,
      admission.regionPackRef,
      `/admissionReceipts/${index}/regionPackRef`,
    );
    requireSameRef(
      deployment.regionPackRef,
      region,
      "CROSS_DEPLOYMENT_REFERENCE",
      `/admissionReceipts/${index}/regionPackRef`,
    );
    if (!region.sourceIds.includes(admission.source.sourceId)) {
      fail(
        "CROSS_PROFILE_REFERENCE",
        `/admissionReceipts/${index}/source`,
        "source is outside the exact region source set",
      );
    }
    const persona = resolveProfileReference(
      personas,
      admission.personaProjectionRef,
      `/admissionReceipts/${index}/personaProjectionRef`,
    );
    requireSameRef(
      deployment,
      persona.deploymentProfileRef,
      "CROSS_DEPLOYMENT_REFERENCE",
      `/admissionReceipts/${index}/personaProjectionRef`,
    );
    resolveProfileReference(
      outputs,
      admission.outputAdapterRef,
      `/admissionReceipts/${index}/outputAdapterRef`,
    );
    if (
      !persona.outputAdapterRefs.some((output) =>
        sameRef(output, admission.outputAdapterRef),
      )
    ) {
      fail(
        "CROSS_DEPLOYMENT_REFERENCE",
        `/admissionReceipts/${index}/outputAdapterRef`,
        "output is outside the exact persona scope",
      );
    }
    const jurisdiction = resolveLocal(
      catalogs,
      admission.jurisdictionContextRef,
      "jurisdiction_context",
      `/admissionReceipts/${index}/jurisdictionContextRef`,
    );
    if (
      !region.jurisdictionReferences.some((candidate) =>
        sameRef(candidate, jurisdiction.configuredJurisdictionRef),
      )
    ) {
      fail(
        "CROSS_JURISDICTION_REFERENCE",
        `/admissionReceipts/${index}/jurisdictionContextRef`,
        "opaque monitoring context is outside the exact profile region",
      );
    }
  });

  bundle.deploymentBindings.forEach((binding, index) => {
    const deployment = resolveProfileReference(
      deployments,
      binding.deploymentProfileRef,
      `/deploymentBindings/${index}/deploymentProfileRef`,
    );
    const region = resolveProfileReference(
      regions,
      binding.regionPackRef,
      `/deploymentBindings/${index}/regionPackRef`,
    );
    requireSameRef(
      deployment.regionPackRef,
      region,
      "CROSS_DEPLOYMENT_REFERENCE",
      `/deploymentBindings/${index}/regionPackRef`,
    );
  });
}

interface ParsedPredecessors {
  readonly geographyRightsBundle?: GeographyRightsBundle;
  readonly taxonomyBundle?: TaxonomyBundle;
}

function parsePredecessors(
  value: SourcePackPredecessorBundles | undefined,
  profile: ProjectionProfileBundle,
): ParsedPredecessors {
  if (value === undefined) {
    return {};
  }
  assertPlainJson(value, "$predecessors");
  const object = value as JsonObject;
  const allowed = new Set(["geographyRightsBundle", "taxonomyBundle"]);
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) {
      fail("INVALID_SHAPE", "/predecessors/*", "unknown predecessor input");
    }
  }
  const geographyRightsBundle = Object.hasOwn(object, "geographyRightsBundle")
    ? parseGeographyRightsBundle(object.geographyRightsBundle)
    : undefined;
  const taxonomyBundle = Object.hasOwn(object, "taxonomyBundle")
    ? parseTaxonomyBundle(object.taxonomyBundle)
    : undefined;
  if (
    geographyRightsBundle !== undefined &&
    !sameRef(geographyRightsBundle.profileBundleRef, profile)
  ) {
    fail(
      "CROSS_PROFILE_REFERENCE",
      "/predecessors/geographyRightsBundle/profileBundleRef",
      "predecessor crosses the profile bundle",
    );
  }
  if (
    taxonomyBundle !== undefined &&
    !sameRef(taxonomyBundle.profileBundleRef, profile)
  ) {
    fail(
      "CROSS_PROFILE_REFERENCE",
      "/predecessors/taxonomyBundle/profileBundleRef",
      "predecessor crosses the profile bundle",
    );
  }
  return { geographyRightsBundle, taxonomyBundle };
}

function resolvePredecessors(
  bundle: SourcePackBundle,
  catalogs: LocalCatalogs,
  predecessors: ParsedPredecessors,
): void {
  bundle.sourceBindings.forEach((binding, bindingIndex) => {
    const admission = resolveLocal(
      catalogs,
      binding.admissionReceiptRef,
      "admission_receipt",
      `/sourceBindings/${bindingIndex}/admissionReceiptRef`,
    );
    binding.predecessorRefs.forEach((reference, predecessorIndex) => {
      const path = `/sourceBindings/${bindingIndex}/predecessorRefs/${predecessorIndex}`;
      if (
        reference.kind === "geographic_relation" ||
        reference.kind === "rights_frame"
      ) {
        const geography = predecessors.geographyRightsBundle;
        if (
          geography === undefined ||
          !sameRef(geography, reference.bundleRef)
        ) {
          fail(
            "UNKNOWN_REFERENCE",
            `${path}/bundleRef`,
            "geography/rights predecessor bundle does not resolve",
          );
        }
        const values =
          reference.kind === "geographic_relation"
            ? geography.geographicRelations
            : geography.rightsFrames;
        const object = values.find((candidate) =>
          sameRef(candidate, reference.objectRef),
        );
        if (object === undefined) {
          fail(
            "UNKNOWN_REFERENCE",
            `${path}/objectRef`,
            "predecessor object does not resolve by kind and version",
          );
        }
        requireSameRef(
          admission.deploymentProfileRef,
          object.deploymentProfileRef,
          "CROSS_DEPLOYMENT_REFERENCE",
          `${path}/objectRef`,
        );
        requireSameRef(
          admission.regionPackRef,
          object.regionPackRef,
          "CROSS_DEPLOYMENT_REFERENCE",
          `${path}/objectRef`,
        );
        if (object.visibility !== "public" || object.sensitivity !== "public") {
          fail(
            "UNAUTHORIZED_PREDECESSOR",
            `${path}/objectRef`,
            "geography/rights predecessor is outside the public source-reference boundary",
          );
        }
        if (reference.kind === "rights_frame") {
          const frame = geography.rightsFrames.find((candidate) =>
            sameRef(candidate, reference.objectRef),
          );
          if (
            frame === undefined ||
            !frame.approvedUses.includes("source_reference") ||
            !frame.approvedAudiences.includes("public")
          ) {
            fail(
              "UNAUTHORIZED_PREDECESSOR",
              `${path}/objectRef`,
              "rights-frame predecessor is not approved for public source references",
            );
          }
        }
      } else {
        const taxonomy = predecessors.taxonomyBundle;
        if (taxonomy === undefined || !sameRef(taxonomy, reference.bundleRef)) {
          fail(
            "UNKNOWN_REFERENCE",
            `${path}/bundleRef`,
            "taxonomy predecessor bundle does not resolve",
          );
        }
        const namespace = taxonomy.namespaces.find((candidate) =>
          sameRef(candidate, reference.objectRef),
        );
        if (namespace === undefined) {
          fail(
            "UNKNOWN_REFERENCE",
            `${path}/objectRef`,
            "taxonomy namespace does not resolve by version",
          );
        }
        if (
          namespace.role !== "source_native" ||
          namespace.scope.kind !== "source_region" ||
          namespace.scope.sourceId !== binding.source.sourceId ||
          !sameRef(namespace.scope.regionPackRef, admission.regionPackRef)
        ) {
          fail(
            "CROSS_SOURCE_REFERENCE",
            `${path}/objectRef`,
            "source-native namespace crosses source or region scope",
          );
        }
      }
    });
  });
}

function parseAdmissionRequest(value: unknown): SourcePackAdmissionRequest {
  assertPlainJson(value, "$request");
  const object = expectObject(value, "$request", [
    "profileBundleRef",
    "regionPackRef",
    "deploymentProfileRef",
    "personaProjectionRef",
    "outputAdapterRef",
    "accessContextRef",
    "disclosureCeiling",
    "requestedOperation",
    "asOf",
    "requestedCoverageSlotRefs",
  ]);
  const slots = expectArray(
    object.requestedCoverageSlotRefs,
    "/request/requestedCoverageSlotRefs",
    1,
    128,
  )
    .map((slot, index) =>
      expectStableId(slot, `/request/requestedCoverageSlotRefs/${index}`),
    )
    .sort(compareText);
  for (let index = 1; index < slots.length; index += 1) {
    if (slots[index - 1] === slots[index]) {
      fail(
        "DUPLICATE_REFERENCE",
        "/request/requestedCoverageSlotRefs",
        "requested slot set contains a duplicate",
      );
    }
  }
  return {
    profileBundleRef: parseReference(
      object.profileBundleRef,
      "/request/profileBundleRef",
    ),
    regionPackRef: parseReference(
      object.regionPackRef,
      "/request/regionPackRef",
    ),
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
    accessContextRef: parseTypedReference(
      object.accessContextRef,
      "access_context",
      "/request/accessContextRef",
    ),
    disclosureCeiling: expectEnum(
      object.disclosureCeiling,
      DISCLOSURES,
      "/request/disclosureCeiling",
    ),
    requestedOperation: expectEnum(
      object.requestedOperation,
      OPERATIONS,
      "/request/requestedOperation",
    ),
    asOf: expectTimestamp(object.asOf, "/request/asOf"),
    requestedCoverageSlotRefs: slots,
  };
}

function disclosureRank(value: SourcePackDisclosure): number {
  return DISCLOSURES.indexOf(value);
}

function validateRequestScope(
  profile: ProjectionProfileBundle,
  bundle: SourcePackBundle,
  request: SourcePackAdmissionRequest,
  catalogs: LocalCatalogs,
) {
  requireSameRef(
    request.profileBundleRef,
    profile,
    "CROSS_PROFILE_REFERENCE",
    "/request/profileBundleRef",
  );
  const deployment = resolveProfileReference(
    profileMap(profile.deploymentProfiles),
    request.deploymentProfileRef,
    "/request/deploymentProfileRef",
  );
  const region = resolveProfileReference(
    profileMap(profile.regionPacks),
    request.regionPackRef,
    "/request/regionPackRef",
  );
  requireSameRef(
    deployment.regionPackRef,
    region,
    "CROSS_DEPLOYMENT_REFERENCE",
    "/request/regionPackRef",
  );
  const persona = resolveProfileReference(
    profileMap(profile.personaProjections),
    request.personaProjectionRef,
    "/request/personaProjectionRef",
  );
  requireSameRef(
    deployment,
    persona.deploymentProfileRef,
    "CROSS_DEPLOYMENT_REFERENCE",
    "/request/personaProjectionRef",
  );
  if (
    !persona.outputAdapterRefs.some((output) =>
      sameRef(output, request.outputAdapterRef),
    )
  ) {
    fail(
      "UNAUTHORIZED_REQUEST",
      "/request/outputAdapterRef",
      "output is outside the exact persona scope",
    );
  }
  const deploymentBinding = bundle.deploymentBindings.find(
    (candidate) =>
      sameRef(candidate.deploymentProfileRef, request.deploymentProfileRef) &&
      sameRef(candidate.regionPackRef, request.regionPackRef),
  );
  if (deploymentBinding === undefined) {
    fail(
      "UNAUTHORIZED_REQUEST",
      "/request/deploymentProfileRef",
      "no exact source-pack deployment binding exists",
    );
  }
  if (
    !deploymentBinding.accessContextRefs.some((reference) =>
      sameRef(reference, request.accessContextRef),
    )
  ) {
    fail(
      "UNAUTHORIZED_REQUEST",
      "/request/accessContextRef",
      "access context is outside the deployment binding",
    );
  }
  const access = resolveLocal(
    catalogs,
    request.accessContextRef,
    "access_context",
    "/request/accessContextRef",
  );
  if (
    !sameRef(access.deploymentProfileRef, request.deploymentProfileRef) ||
    !sameRef(access.personaProjectionRef, request.personaProjectionRef) ||
    !sameRef(access.outputAdapterRef, request.outputAdapterRef) ||
    disclosureRank(request.disclosureCeiling) >
      disclosureRank(access.disclosureCeiling)
  ) {
    fail(
      "UNAUTHORIZED_REQUEST",
      "/request/accessContextRef",
      "request exceeds the exact access-context grant",
    );
  }
  return { deploymentBinding, access };
}

function rotateRight(value: number, count: number): number {
  return (value >>> count) | (value << (32 - count));
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

function sha256(value: string): string {
  const input = new TextEncoder().encode(value);
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(input);
  bytes[input.length] = 0x80;
  const bitLength = input.length * 8;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);
  const state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ]);
  const words = new Uint32Array(64);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const word15 = words[index - 15]!;
      const word2 = words[index - 2]!;
      const sigma0 =
        rotateRight(word15, 7) ^ rotateRight(word15, 18) ^ (word15 >>> 3);
      const sigma1 =
        rotateRight(word2, 17) ^ rotateRight(word2, 19) ^ (word2 >>> 10);
      words[index] =
        (words[index - 16]! + sigma0 + words[index - 7]! + sigma1) >>> 0;
    }
    let a = state[0]!;
    let b = state[1]!;
    let c = state[2]!;
    let d = state[3]!;
    let e = state[4]!;
    let f = state[5]!;
    let g = state[6]!;
    let h = state[7]!;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 =
        (h + sum1 + choice + SHA256_CONSTANTS[index]! + words[index]!) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }
    state[0] = (state[0]! + a) >>> 0;
    state[1] = (state[1]! + b) >>> 0;
    state[2] = (state[2]! + c) >>> 0;
    state[3] = (state[3]! + d) >>> 0;
    state[4] = (state[4]! + e) >>> 0;
    state[5] = (state[5]! + f) >>> 0;
    state[6] = (state[6]! + g) >>> 0;
    state[7] = (state[7]! + h) >>> 0;
  }
  return [...state].map((word) => word.toString(16).padStart(8, "0")).join("");
}

function isCurrent(
  value: { readonly validFrom: string; readonly validThrough: string | null },
  asOf: string,
): boolean {
  return (
    value.validFrom <= asOf &&
    (value.validThrough === null || asOf <= value.validThrough)
  );
}

function latestObservation<State extends string>(
  observations: readonly {
    readonly source: SourcePackSourceIdentity;
    readonly sourceContextRef: SourcePackReference<"source_context">;
    readonly jurisdictionContextRef: SourcePackReference<"jurisdiction_context">;
    readonly deploymentProfileRef: VersionedReference;
    readonly scope: "source" | "jurisdiction" | "source_within_jurisdiction";
    readonly observedAt: string;
    readonly state: State;
  }[],
  binding: SourcePackSourceBinding,
  deploymentProfileRef: VersionedReference,
  scope: "source" | "jurisdiction" | "source_within_jurisdiction",
  asOf: string,
): State | "not_observed" {
  const matches = observations
    .filter(
      (observation) =>
        observation.observedAt <= asOf &&
        observation.scope === scope &&
        sameSource(observation.source, binding.source) &&
        sameRef(observation.sourceContextRef, binding.sourceContextRef) &&
        sameRef(
          observation.jurisdictionContextRef,
          binding.jurisdictionContextRef,
        ) &&
        sameRef(observation.deploymentProfileRef, deploymentProfileRef),
    )
    .sort((left, right) => compareText(right.observedAt, left.observedAt));
  return matches[0]?.state ?? "not_observed";
}

function currentProof(
  admission: SourcePackBundle["admissionReceipts"][number],
  contract: SourcePackContractReceipt,
  authority: SourcePackAuthorityBinding,
  coverage: SourcePackCoverageDeclaration,
  reviews: readonly SourcePackReviewAttestation[],
  catalogs: LocalCatalogs,
  asOf: string,
): boolean {
  const evidenceRefs = [
    ...contract.evidenceRefs,
    ...coverage.evidenceRefs,
    ...authority.evidenceRefs,
    ...reviews.flatMap((review) => review.evidenceRefs),
  ];
  const evidence = evidenceRefs.map((reference) =>
    resolveLocal(
      catalogs,
      reference,
      "evidence_receipt",
      "/proof/evidenceRefs",
    ),
  );
  return (
    isCurrent(admission, asOf) &&
    isCurrent(contract, asOf) &&
    isCurrent(authority, asOf) &&
    reviews.every((review) => isCurrent(review, asOf)) &&
    reviews.every((review) => review.reviewedAt <= asOf) &&
    evidence.every((receipt) => isCurrent(receipt, asOf))
  );
}

function reasonsForSlot(
  binding: SourcePackSourceBinding,
  slotRef: string,
  request: SourcePackAdmissionRequest,
  bundle: SourcePackBundle,
  catalogs: LocalCatalogs,
): {
  readonly coverageState: SourcePackCoverageState | null;
  readonly reasons: readonly SourcePackExclusionReason[];
} {
  const admission = resolveLocal(
    catalogs,
    binding.admissionReceiptRef,
    "admission_receipt",
    "/plan/sourceBinding/admissionReceiptRef",
  );
  const contract = resolveLocal(
    catalogs,
    binding.contractReceiptRef,
    "contract_receipt",
    "/plan/sourceBinding/contractReceiptRef",
  );
  const coverage = resolveLocal(
    catalogs,
    binding.coverageDeclarationRef,
    "coverage_declaration",
    "/plan/sourceBinding/coverageDeclarationRef",
  );
  const authority = resolveLocal(
    catalogs,
    binding.authorityBindingRef,
    "authority_binding",
    "/plan/sourceBinding/authorityBindingRef",
  );
  const reviews = admission.reviewAttestationRefs.map((reference) =>
    resolveLocal(
      catalogs,
      reference,
      "review_attestation",
      "/plan/sourceBinding/reviewAttestationRefs",
    ),
  );
  const found = new Set<SourcePackExclusionReason>();
  if (admission.state === "pack_binding_disabled") {
    found.add("PACK_BINDING_DISABLED");
  } else if (
    admission.state === "not_admitted" ||
    admission.state === "revoked"
  ) {
    found.add("NOT_ADMITTED");
  } else if (admission.state === "expired") {
    found.add("ADMISSION_NOT_CURRENT");
  }
  if (
    !currentProof(
      admission,
      contract,
      authority,
      coverage,
      reviews,
      catalogs,
      request.asOf,
    )
  ) {
    found.add("ADMISSION_NOT_CURRENT");
  }
  if (!sameRef(admission.personaProjectionRef, request.personaProjectionRef)) {
    found.add("PERSONA_NOT_GRANTED");
  }
  if (!sameRef(admission.outputAdapterRef, request.outputAdapterRef)) {
    found.add("OUTPUT_NOT_GRANTED");
  }
  if (!admission.operationGrants.includes(request.requestedOperation)) {
    found.add("OPERATION_NOT_GRANTED");
  }
  const coverageState =
    coverage.slotStates.find((state) => state.slotRef === slotRef)?.state ??
    null;
  if (coverageState === null || coverageState === "not_assessed") {
    found.add("COVERAGE_NOT_ASSESSED");
  } else if (coverageState === "outside_coverage") {
    found.add("OUTSIDE_DECLARED_COVERAGE");
  } else if (coverageState === "unknown_coverage") {
    found.add("COVERAGE_UNKNOWN");
  }
  for (const scope of OBSERVATION_SCOPES) {
    const availability = latestObservation(
      bundle.availabilityObservations,
      binding,
      admission.deploymentProfileRef,
      scope,
      request.asOf,
    ) as SourcePackAvailabilityState;
    if (availability === "unavailable") {
      found.add("SOURCE_UNAVAILABLE");
    } else if (availability === "not_observed") {
      found.add("AVAILABILITY_NOT_OBSERVED");
    } else if (availability === "unknown") {
      found.add("AVAILABILITY_UNKNOWN");
    }
    const health = latestObservation(
      bundle.healthObservations,
      binding,
      admission.deploymentProfileRef,
      scope,
      request.asOf,
    ) as SourcePackHealthState;
    if (health === "not_observed") {
      found.add("HEALTH_NOT_OBSERVED");
    } else if (health === "unknown") {
      found.add("HEALTH_UNKNOWN");
    } else if (health === "degraded") {
      found.add("HEALTH_DEGRADED");
    } else if (health === "failed") {
      found.add("HEALTH_FAILED");
    }
  }
  return {
    coverageState,
    reasons: EXCLUSION_ORDER.filter((reason) => found.has(reason)),
  };
}

function gapStateFor(
  exclusions: readonly SourcePackExclusion[],
  hasVisibleBindings: boolean,
): SourcePackGapState {
  if (!hasVisibleBindings) {
    return "opaque_coverage_gap";
  }
  const reasons = new Set(
    exclusions.flatMap((exclusion) => exclusion.reasonCodes),
  );
  if (reasons.has("PACK_BINDING_DISABLED")) return "disabled";
  if (
    reasons.has("NOT_ADMITTED") ||
    reasons.has("ADMISSION_NOT_CURRENT") ||
    reasons.has("PERSONA_NOT_GRANTED") ||
    reasons.has("OUTPUT_NOT_GRANTED") ||
    reasons.has("OPERATION_NOT_GRANTED")
  ) {
    return "not_admitted";
  }
  if (reasons.has("OUTSIDE_DECLARED_COVERAGE")) return "outside_coverage";
  if (reasons.has("COVERAGE_UNKNOWN")) return "unknown_coverage";
  if (reasons.has("COVERAGE_NOT_ASSESSED")) return "not_assessed";
  if (reasons.has("SOURCE_UNAVAILABLE")) return "unavailable";
  if (reasons.has("AVAILABILITY_UNKNOWN")) {
    return "availability_unknown";
  }
  if (reasons.has("HEALTH_UNKNOWN")) {
    return "health_unknown";
  }
  if (
    reasons.has("AVAILABILITY_NOT_OBSERVED") ||
    reasons.has("HEALTH_NOT_OBSERVED")
  ) {
    return "not_observed";
  }
  if (reasons.has("HEALTH_DEGRADED") || reasons.has("HEALTH_FAILED")) {
    return "unhealthy";
  }
  return "not_assessed";
}

export function createSourcePackAdmissionPlan(
  profileBundleValue: unknown,
  sourcePackBundleValue: unknown,
  requestValue: unknown,
  predecessorValues?: SourcePackPredecessorBundles,
): SourcePackAdmissionPlan {
  const profile = parseProjectionProfileBundle(profileBundleValue);
  const bundle = parseSourcePackBundle(sourcePackBundleValue);
  const catalogs = validateLocalGraph(bundle);
  validateProfileGraph(profile, bundle, catalogs);
  const predecessors = parsePredecessors(predecessorValues, profile);
  resolvePredecessors(bundle, catalogs, predecessors);
  const request = parseAdmissionRequest(requestValue);
  const { deploymentBinding } = validateRequestScope(
    profile,
    bundle,
    request,
    catalogs,
  );
  const visibleBindings = deploymentBinding.sourceBindingRefs
    .map((reference) =>
      resolveLocal(
        catalogs,
        reference,
        "source_binding",
        "/deploymentBinding/sourceBindingRefs",
      ),
    )
    .filter(
      (binding) =>
        disclosureRank(binding.visibility) <=
        disclosureRank(request.disclosureCeiling),
    );

  const exclusions: SourcePackExclusion[] = [];
  const eligibleBindings = visibleBindings.flatMap((binding) => {
    const admission = resolveLocal(
      catalogs,
      binding.admissionReceiptRef,
      "admission_receipt",
      "/plan/sourceBinding/admissionReceiptRef",
    );
    const eligibleSlots: SourcePackCoverageSlotState[] = [];
    for (const slotRef of request.requestedCoverageSlotRefs) {
      const result = reasonsForSlot(
        binding,
        slotRef,
        request,
        bundle,
        catalogs,
      );
      if (
        result.reasons.length === 0 &&
        (result.coverageState === "covered" ||
          result.coverageState === "partial")
      ) {
        eligibleSlots.push({ slotRef, state: result.coverageState });
      } else {
        exclusions.push({
          sourceBindingRef: {
            kind: "source_binding",
            id: binding.id,
            version: binding.version,
          },
          source: { ...binding.source },
          slotRef,
          declaredCoverageState: result.coverageState,
          reasonCodes: result.reasons,
        });
      }
    }
    if (eligibleSlots.length === 0) {
      return [];
    }
    return [
      {
        sourceBindingRef: {
          kind: "source_binding" as const,
          id: binding.id,
          version: binding.version,
        },
        source: { ...binding.source },
        proofRefs: {
          contractReceiptRef: { ...binding.contractReceiptRef },
          coverageDeclarationRef: { ...binding.coverageDeclarationRef },
          authorityBindingRef: { ...binding.authorityBindingRef },
          reviewAttestationRefs: admission.reviewAttestationRefs.map(
            (reference) => ({
              ...reference,
            }),
          ),
          admissionReceiptRef: { ...binding.admissionReceiptRef },
        },
        slotStates: eligibleSlots,
        predecessorRefs: binding.predecessorRefs.map((reference) => ({
          kind: reference.kind,
          bundleRef: { ...reference.bundleRef },
          objectRef: { ...reference.objectRef },
        })),
      },
    ];
  });
  exclusions.sort((left, right) =>
    compareText(
      `${left.slotRef}\u0000${typedRefKey(left.sourceBindingRef)}`,
      `${right.slotRef}\u0000${typedRefKey(right.sourceBindingRef)}`,
    ),
  );
  eligibleBindings.sort((left, right) =>
    compareText(
      typedRefKey(left.sourceBindingRef),
      typedRefKey(right.sourceBindingRef),
    ),
  );
  const gaps = request.requestedCoverageSlotRefs.flatMap((slotRef) => {
    const fullyServed = eligibleBindings.some((eligible) =>
      eligible.slotStates.some(
        (slot) => slot.slotRef === slotRef && slot.state === "covered",
      ),
    );
    if (fullyServed) return [];
    const partiallyServed = eligibleBindings.some((eligible) =>
      eligible.slotStates.some(
        (slot) => slot.slotRef === slotRef && slot.state === "partial",
      ),
    );
    if (partiallyServed) {
      return [
        {
          slotRef,
          state: "partial" as const,
          notEvidenceOfAbsence: true as const,
        },
      ];
    }
    const relevant = exclusions.filter(
      (exclusion) => exclusion.slotRef === slotRef,
    );
    return [
      {
        slotRef,
        state: gapStateFor(relevant, visibleBindings.length > 0),
        notEvidenceOfAbsence: true as const,
      },
    ];
  });
  const withoutFingerprint = {
    schemaVersion: SOURCE_PACK_BUNDLE_SCHEMA_VERSION,
    profileBundleRef: { ...bundle.profileBundleRef },
    context: {
      ...request,
      disclosureState: "authorized_subset_not_comprehensive" as const,
    },
    eligibleBindings,
    exclusions,
    gaps,
  };
  const fingerprint = sha256(
    encodeCanonical(withoutFingerprint as unknown as JsonValue),
  );
  return canonicalClone({ ...withoutFingerprint, fingerprint });
}

export function serializeSourcePackAdmissionPlan(
  plan: SourcePackAdmissionPlan,
): string {
  assertPlainJson(plan, "$sourcePackAdmissionPlan");
  return encodeCanonical(plan as unknown as JsonValue);
}

export function assertSourcePackPlanCompatibility(
  plan: SourcePackAdmissionPlan,
  requestValue: unknown,
): void {
  assertPlainJson(plan as unknown, "$sourcePackAdmissionPlan");
  const request = parseAdmissionRequest(requestValue);
  const expectedContext = {
    ...request,
    disclosureState: "authorized_subset_not_comprehensive" as const,
  };
  if (
    encodeCanonical(plan.context as unknown as JsonValue) !==
    encodeCanonical(expectedContext as unknown as JsonValue)
  ) {
    fail(
      "PLAN_CONTEXT_MISMATCH",
      "/request",
      "request tuple does not match the admission plan context",
    );
  }
  const { fingerprint, ...withoutFingerprint } = plan;
  if (
    !FINGERPRINT.test(fingerprint) ||
    sha256(encodeCanonical(withoutFingerprint as unknown as JsonValue)) !==
      fingerprint
  ) {
    fail(
      "PLAN_CONTEXT_MISMATCH",
      "/fingerprint",
      "plan bytes do not match the authorized projection fingerprint",
    );
  }
}
