import { createHash } from "node:crypto";
import { URL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import recordSchema from "../../schemas/record.schema.v1.json" with { type: "json" };

import {
  completeSyntheticProvenance,
  sourceDerivedLeafPointers,
  validateRecordSetPolicy,
} from "./policy-validation.mjs";
import canonicalSources from "../../config/sources.v1.json" with { type: "json" };
import canonicalTaxonomy from "../../config/taxonomy.v1.json" with { type: "json" };
import federalFixture from "../../fixtures/records/general-jurisdiction.valid.json" with { type: "json" };
import countyFixture from "../../fixtures/records/county-explicit.valid.json" with { type: "json" };
import accordFixture from "../../fixtures/records/intergovernmental-accord.valid.json" with { type: "json" };

export const SYNTHETIC_APPLICATION_PROFILE =
  "synthetic_application_compatibility";
const applicationFixtures = [federalFixture, countyFixture, accordFixture].map(
  (value) => completeSyntheticProvenance(globalThis.structuredClone(value)),
);
const isApplicationProfile = (value) =>
  value.recordProfile === SYNTHETIC_APPLICATION_PROFILE;

export function canonicalCorpusDigest(value) {
  return digestValue(capturePlainJson(value, "$digest"));
}

export function syntheticApplicationPins() {
  return deepFreeze({
    sourceRegistryDigest: digestValue(canonicalSources),
    taxonomyDigest: digestValue(canonicalTaxonomy),
    fixtureDigests: applicationFixtures
      .map((record) => ({
        recordId: record.internalId,
        digest: digestValue({
          ...record,
          fieldProvenance: canonicalProvenance(record),
        }),
      }))
      .sort((a, b) => compareText(a.recordId, b.recordId)),
  });
}

export const ANALYZED_CORPUS_SCHEMA_ID =
  "https://policy-sentinel.invalid/schemas/analyzed-corpus.schema.v1.json";
export const ANALYZED_CORPUS_SCHEMA_VERSION = "1.0.0";

const RECORD_SCHEMA_ID =
  "https://policy-sentinel.invalid/schemas/record.schema.v1.json";
const RECORD_SCHEMA_VERSION = "1.4.0";
const VISIBILITY = "non_public_ignored_prerelease";
const HEALTH_SCOPES = [
  "source_contract",
  "acquisition_operation",
  "selected_range",
];
const GENERAL_JURISDICTION_LABEL = "General jurisdiction only";
const GENERAL_JURISDICTION_EVIDENCE =
  "Configured general-jurisdiction scope; no Nation association or legal, rights, membership, geographic, consultation, or community-position determination.";

export const REQUIRED_ANALYZED_CORPUS_NON_CLAIMS = deepFreeze([
  "not_a_nation_relationship",
  "not_an_organization_membership_determination",
  "not_a_legal_applicability_determination",
  "not_a_rights_impact_determination",
  "not_a_jurisdiction_determination",
  "not_a_geographic_applicability_or_association_determination",
  "not_a_consultation_obligation_determination",
  "not_comprehensive_coverage",
  "not_a_community_position",
  "not_legal_advice",
  "not_an_official_source_substitute",
]);

const STABLE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const RECORD_ID = /^psr:[a-z0-9]+(?:-[a-z0-9]+)*:[A-Za-z0-9._~:-]+$/;
const VERSION = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const DIGEST = /^[a-f0-9]{64}$/;
const TIMESTAMP =
  /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])Z$/;

const recordSchemaValidator = new Ajv2020({
  allErrors: true,
  strict: true,
});
addFormats(recordSchemaValidator);
const validatePolicyRecordSchema = recordSchemaValidator.compile(recordSchema);

const RECORD_KEYS = [
  "schemaVersion",
  "internalId",
  "source",
  "officialTitle",
  "sourceDocumentIdentifier",
  "documentType",
  "jurisdiction",
  "issuingBodies",
  "legislativeContext",
  "judicialContext",
  "accordContext",
  "status",
  "dates",
  "urls",
  "texts",
  "sponsors",
  "committees",
  "actionHistory",
  "statusHistory",
  "sourceDocumentRelationships",
  "officialSubjects",
  "taxonomyMemberships",
  "isUnclassified",
  "relevance",
  "nationAssociations",
  "landmark",
  "historical",
  "dataQuality",
  "sourceHealth",
  "change",
  "aiSummary",
  "fieldProvenance",
];

const COMMON_BINDING_KEYS = [
  "kind",
  "id",
  "version",
  "contentDigest",
  "synthetic",
  "trustDomain",
  "sourceId",
  "visibility",
];

const SYNTHETIC_BINDING_KEYS = [
  ...COMMON_BINDING_KEYS,
  "syntheticEvidenceRef",
  "fieldPolicyRef",
  "revisionRef",
  "lifecycleEvaluationRef",
  "lifecycleScopeRef",
  "artifactEligibilityRef",
  "coverageRef",
  "healthRefs",
  "reviewRef",
  "reviewExpiresAt",
  "lkgRef",
];

const REAL_BINDING_KEYS = [
  ...COMMON_BINDING_KEYS,
  "lifecycleAsOf",
  "lifecycleEvaluationDigest",
  "lifecycleBundleRef",
  "lifecycleScopeRef",
  "fieldPolicyRef",
  "revisionRef",
  "artifactEligibilityRef",
  "coverageRef",
  "healthRefs",
  "reviewRef",
  "reviewExpiresAt",
  "lkgRef",
];

const CREATE_SYNTHETIC_BINDING_KEYS = SYNTHETIC_BINDING_KEYS.filter(
  (key) => key !== "contentDigest",
);
const CREATE_REAL_BINDING_KEYS = REAL_BINDING_KEYS.filter(
  (key) => key !== "contentDigest",
);

const ROOT_KEYS = [
  "$schema",
  "schemaVersion",
  "kind",
  "id",
  "version",
  "contentDigest",
  "synthetic",
  "trustDomain",
  "generatedAt",
  "dataAsOf",
  "recordSchemaRef",
  "projectionInputs",
  "sourceEvidenceBindings",
  "recordEntries",
  "views",
  "nonClaims",
  "publication",
];

const CREATE_ROOT_KEYS = [
  "id",
  "version",
  "synthetic",
  "trustDomain",
  "generatedAt",
  "dataAsOf",
  "projectionInputs",
  "sourceEvidenceBindings",
  "recordEntries",
  "views",
];

export class AnalyzedCorpusValidationError extends TypeError {
  constructor(code, path, detail) {
    super(`${code} at ${path}: ${detail}`);
    this.name = "AnalyzedCorpusValidationError";
    this.code = code;
    this.path = path;
  }
}

function fail(code, path, detail) {
  const structuralPath = path.replace(/\/(?:0|[1-9][0-9]*)(?=\/|$)/g, "/*");
  throw new AnalyzedCorpusValidationError(code, structuralPath, detail);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function hasUnpairedSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!Number.isInteger(next) || next < 0xdc00 || next > 0xdfff) {
        return true;
      }
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function captureInternal(value, path, ancestors, budget, depth) {
  budget.nodes += 1;
  if (budget.nodes > 500_000 || depth > 64) {
    fail("INVALID_BOUNDS", path, "plain-JSON input exceeds the closed budget");
  }
  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    budget.stringUnits += value.length;
    if (budget.stringUnits > 16_777_216 || hasUnpairedSurrogate(value)) {
      fail(
        "INVALID_JSON",
        path,
        "strings must be bounded Unicode scalar sequences",
      );
    }
    return value;
  }
  if (typeof value === "number") {
    if (
      !Number.isFinite(value) ||
      !Number.isSafeInteger(value) ||
      Object.is(value, -0)
    ) {
      fail("INVALID_JSON", path, "expected a finite safe JSON integer");
    }
    return value;
  }
  if (typeof value !== "object") {
    fail("INVALID_JSON", path, "expected a plain JSON value");
  }
  if (ancestors.has(value)) {
    fail("INVALID_JSON", path, "cyclic containers are rejected");
  }
  ancestors.add(value);
  try {
    const isArray = Array.isArray(value);
    if (
      Object.getPrototypeOf(value) !==
      (isArray ? Array.prototype : Object.prototype)
    ) {
      fail("INVALID_JSON", path, "expected a plain JSON container");
    }
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) {
      fail("INVALID_JSON", path, "symbol properties are rejected");
    }
    if (!isArray && ownKeys.length > 256) {
      fail("INVALID_BOUNDS", path, "object property count exceeds 256");
    }
    if (isArray) {
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (
        lengthDescriptor === undefined ||
        !("value" in lengthDescriptor) ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0 ||
        lengthDescriptor.value > 4096
      ) {
        fail("INVALID_JSON", path, "array length is not canonical or bounded");
      }
      const length = lengthDescriptor.value;
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const key = String(index);
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          descriptor === undefined ||
          !("value" in descriptor) ||
          !descriptor.enumerable
        ) {
          fail(
            "INVALID_JSON",
            `${path}/${index}`,
            "sparse arrays are rejected",
          );
        }
        result.push(
          captureInternal(
            descriptor.value,
            `${path}/${index}`,
            ancestors,
            budget,
            depth + 1,
          ),
        );
      }
      const canonicalKeys = new Set([
        "length",
        ...Array.from({ length }, (_, index) => String(index)),
      ]);
      if (ownKeys.some((key) => !canonicalKeys.has(key))) {
        fail("INVALID_JSON", path, "array has a non-canonical own property");
      }
      return result;
    }
    const entries = [];
    for (const key of ownKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        !descriptor.enumerable
      ) {
        fail(
          "INVALID_JSON",
          `${path}/*`,
          "getters and hidden properties are rejected",
        );
      }
      entries.push([
        key,
        captureInternal(
          descriptor.value,
          `${path}/*`,
          ancestors,
          budget,
          depth + 1,
        ),
      ]);
    }
    return Object.fromEntries(entries);
  } finally {
    ancestors.delete(value);
  }
}

function capturePlainJson(value, path) {
  try {
    return deepFreeze(
      captureInternal(
        value,
        path,
        new WeakSet(),
        { nodes: 0, stringUnits: 0 },
        0,
      ),
    );
  } catch (error) {
    if (error instanceof AnalyzedCorpusValidationError) {
      throw error;
    }
    fail(
      "INVALID_JSON",
      path,
      "input could not be captured as one stable plain-JSON snapshot",
    );
  }
}

function canonicalEncode(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalEncode).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort(compareText)
    .map((key) => `${JSON.stringify(key)}:${canonicalEncode(value[key])}`)
    .join(",")}}`;
}

function digestValue(value) {
  return createHash("sha256")
    .update(canonicalEncode(value), "utf8")
    .digest("hex");
}

function contentDigest(value) {
  return digestValue(
    Object.fromEntries(
      Object.entries(value).filter(([key]) => key !== "contentDigest"),
    ),
  );
}

function sameValue(left, right) {
  return canonicalEncode(left) === canonicalEncode(right);
}

function expectObject(value, path, keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_SHAPE", path, "expected an object");
  }
  const allowed = new Set(keys);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) {
      fail("INVALID_SHAPE", `${path}/${key}`, "required property is missing");
    }
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      fail(
        "INVALID_SHAPE",
        `${path}/${key}`,
        "unexpected property is rejected",
      );
    }
  }
  return value;
}

function expectArray(value, path, minimum, maximum) {
  if (!Array.isArray(value)) {
    fail("INVALID_SHAPE", path, "expected an array");
  }
  if (value.length < minimum || value.length > maximum) {
    fail("INVALID_BOUNDS", path, "array length is outside the closed bound");
  }
  return value;
}

function expectString(value, path, maximum = 2048) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum
  ) {
    fail("INVALID_SHAPE", path, "expected a bounded non-empty string");
  }
  return value;
}

function expectLiteral(value, expected, path) {
  if (value !== expected) {
    fail("INVALID_LITERAL", path, "value does not match the closed contract");
  }
  return expected;
}

function expectStableId(value, path) {
  const text = expectString(value, path, 128);
  if (!STABLE_ID.test(text)) {
    fail("INVALID_ID", path, "expected a stable lowercase identifier");
  }
  return text;
}

function expectRecordId(value, path) {
  const text = expectString(value, path, 512);
  if (!RECORD_ID.test(text)) {
    fail("INVALID_ID", path, "expected a PolicyRecord stable identifier");
  }
  return text;
}

function expectVersion(value, path) {
  const text = expectString(value, path, 32);
  if (!VERSION.test(text)) {
    fail("INVALID_VERSION", path, "expected a semantic version");
  }
  return text;
}

function expectDigest(value, path) {
  const text = expectString(value, path, 64);
  if (!DIGEST.test(text)) {
    fail("INVALID_DIGEST", path, "expected a lowercase SHA-256 digest");
  }
  return text;
}

function expectTimestamp(value, path) {
  const text = expectString(value, path, 20);
  const match = TIMESTAMP.exec(text);
  if (match === null) {
    fail("INVALID_TIMESTAMP", path, "expected canonical UTC seconds");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [
    31,
    leap ? 29 : 28,
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
  if (year === 0 || day > monthDays[month - 1]) {
    fail("INVALID_TIMESTAMP", path, "calendar date is invalid");
  }
  return text;
}

function parseDigestedRef(value, kind, path) {
  const object = expectObject(value, path, ["kind", "id", "version", "digest"]);
  expectLiteral(object.kind, kind, `${path}/kind`);
  expectStableId(object.id, `${path}/id`);
  expectVersion(object.version, `${path}/version`);
  expectDigest(object.digest, `${path}/digest`);
  return object;
}

function parseContentRef(value, kind, path) {
  const object = expectObject(value, path, [
    "kind",
    "id",
    "version",
    "contentDigest",
  ]);
  expectLiteral(object.kind, kind, `${path}/kind`);
  expectStableId(object.id, `${path}/id`);
  expectVersion(object.version, `${path}/version`);
  expectDigest(object.contentDigest, `${path}/contentDigest`);
  return object;
}

function refKey(value) {
  return `${value.kind}:${value.id}@${value.version}`;
}

function bindingKey(value) {
  return `${value.id}@${value.version}`;
}

function requireCanonicalOrder(values, key, path) {
  const keys = values.map(key);
  const ordered = [...keys].sort(compareText);
  if (keys.some((value, index) => value !== ordered[index])) {
    fail(
      "NON_CANONICAL_ORDER",
      path,
      "set-like arrays require stable ordinal order",
    );
  }
  if (new Set(keys).size !== keys.length) {
    fail("DUPLICATE_REFERENCE", path, "set-like array contains a duplicate");
  }
}

function assertNonClaims(value, path) {
  const claims = expectArray(
    value,
    path,
    REQUIRED_ANALYZED_CORPUS_NON_CLAIMS.length,
    REQUIRED_ANALYZED_CORPUS_NON_CLAIMS.length,
  );
  if (!sameValue(claims, REQUIRED_ANALYZED_CORPUS_NON_CLAIMS)) {
    fail(
      "INVALID_NON_CLAIM",
      path,
      "the complete ordered non-claim set is required",
    );
  }
}

function validateProjectionInputs(value, path) {
  const object = expectObject(value, path, [
    "regionPackRef",
    "deploymentProfileRef",
    "taxonomyRef",
    "configurationAuthorityRef",
    "visibilityPolicyRef",
    "limitationRefs",
  ]);
  parseDigestedRef(
    object.regionPackRef,
    "region_pack",
    `${path}/regionPackRef`,
  );
  parseDigestedRef(
    object.deploymentProfileRef,
    "deployment_profile",
    `${path}/deploymentProfileRef`,
  );
  parseDigestedRef(object.taxonomyRef, "taxonomy", `${path}/taxonomyRef`);
  parseDigestedRef(
    object.configurationAuthorityRef,
    "configuration_authority",
    `${path}/configurationAuthorityRef`,
  );
  parseDigestedRef(
    object.visibilityPolicyRef,
    "visibility_policy",
    `${path}/visibilityPolicyRef`,
  );
  const limitationRefs = expectArray(
    object.limitationRefs,
    `${path}/limitationRefs`,
    1,
    64,
  );
  limitationRefs.forEach((reference, index) =>
    parseDigestedRef(
      reference,
      "limitation",
      `${path}/limitationRefs/${index}`,
    ),
  );
  requireCanonicalOrder(limitationRefs, refKey, `${path}/limitationRefs`);
  return object;
}

function validateBinding(value, path, root) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_SHAPE", path, "expected an object");
  }
  const keys = value.synthetic ? SYNTHETIC_BINDING_KEYS : REAL_BINDING_KEYS;
  const object = expectObject(value, path, keys);
  expectLiteral(object.kind, "source_evidence_binding", `${path}/kind`);
  expectStableId(object.id, `${path}/id`);
  expectVersion(object.version, `${path}/version`);
  expectDigest(object.contentDigest, `${path}/contentDigest`);
  if (contentDigest(object) !== object.contentDigest) {
    fail(
      "CONTENT_DIGEST_MISMATCH",
      `${path}/contentDigest`,
      "binding bytes do not match their digest",
    );
  }
  expectLiteral(object.synthetic, root.synthetic, `${path}/synthetic`);
  expectLiteral(object.trustDomain, root.trustDomain, `${path}/trustDomain`);
  expectStableId(object.sourceId, `${path}/sourceId`);
  expectLiteral(object.visibility, VISIBILITY, `${path}/visibility`);
  if (root.synthetic) {
    parseDigestedRef(
      object.syntheticEvidenceRef,
      "synthetic_corpus_evidence",
      `${path}/syntheticEvidenceRef`,
    );
    parseDigestedRef(
      object.fieldPolicyRef,
      "synthetic_field_policy",
      `${path}/fieldPolicyRef`,
    );
    parseDigestedRef(
      object.revisionRef,
      "synthetic_normalized_revision",
      `${path}/revisionRef`,
    );
    parseDigestedRef(
      object.lifecycleEvaluationRef,
      "synthetic_lifecycle_evaluation",
      `${path}/lifecycleEvaluationRef`,
    );
    parseDigestedRef(
      object.lifecycleScopeRef,
      "synthetic_lifecycle_scope",
      `${path}/lifecycleScopeRef`,
    );
    parseDigestedRef(
      object.artifactEligibilityRef,
      "synthetic_artifact_eligibility",
      `${path}/artifactEligibilityRef`,
    );
    parseDigestedRef(
      object.coverageRef,
      "synthetic_bounded_coverage",
      `${path}/coverageRef`,
    );
    const healthRefs = expectArray(
      object.healthRefs,
      `${path}/healthRefs`,
      3,
      3,
    );
    healthRefs.forEach((entry, index) => {
      const health = expectObject(entry, `${path}/healthRefs/${index}`, [
        "scope",
        "evidenceRef",
      ]);
      expectLiteral(
        health.scope,
        HEALTH_SCOPES[index],
        `${path}/healthRefs/${index}/scope`,
      );
      parseDigestedRef(
        health.evidenceRef,
        "synthetic_health_evidence",
        `${path}/healthRefs/${index}/evidenceRef`,
      );
    });
    parseDigestedRef(
      object.reviewRef,
      "synthetic_review_evidence",
      `${path}/reviewRef`,
    );
    const syntheticReviewExpiresAt = expectTimestamp(
      object.reviewExpiresAt,
      `${path}/reviewExpiresAt`,
    );
    if (syntheticReviewExpiresAt <= root.generatedAt) {
      fail(
        "EXPIRED_REVIEW",
        `${path}/reviewExpiresAt`,
        "synthetic review evidence must remain current at corpus generation",
      );
    }
    if (object.lkgRef !== null) {
      parseDigestedRef(
        object.lkgRef,
        "synthetic_lkg_evidence",
        `${path}/lkgRef`,
      );
    }
    return object;
  }
  expectTimestamp(object.lifecycleAsOf, `${path}/lifecycleAsOf`);
  expectDigest(
    object.lifecycleEvaluationDigest,
    `${path}/lifecycleEvaluationDigest`,
  );
  parseContentRef(
    object.lifecycleBundleRef,
    "real_source_lifecycle_bundle",
    `${path}/lifecycleBundleRef`,
  );
  parseContentRef(
    object.lifecycleScopeRef,
    "lifecycle_scope",
    `${path}/lifecycleScopeRef`,
  );
  parseDigestedRef(
    object.fieldPolicyRef,
    "field_policy",
    `${path}/fieldPolicyRef`,
  );
  parseDigestedRef(
    object.revisionRef,
    "normalized_revision",
    `${path}/revisionRef`,
  );
  parseContentRef(
    object.artifactEligibilityRef,
    "artifact_eligibility_receipt",
    `${path}/artifactEligibilityRef`,
  );
  parseContentRef(
    object.coverageRef,
    "coverage_receipt",
    `${path}/coverageRef`,
  );
  const healthRefs = expectArray(object.healthRefs, `${path}/healthRefs`, 3, 3);
  healthRefs.forEach((entry, index) => {
    const health = expectObject(entry, `${path}/healthRefs/${index}`, [
      "scope",
      "receiptRef",
    ]);
    expectLiteral(
      health.scope,
      HEALTH_SCOPES[index],
      `${path}/healthRefs/${index}/scope`,
    );
    parseContentRef(
      health.receiptRef,
      "health_receipt",
      `${path}/healthRefs/${index}/receiptRef`,
    );
  });
  parseContentRef(object.reviewRef, "review_receipt", `${path}/reviewRef`);
  const reviewExpiresAt = expectTimestamp(
    object.reviewExpiresAt,
    `${path}/reviewExpiresAt`,
  );
  if (reviewExpiresAt <= root.generatedAt) {
    fail(
      "EXPIRED_REVIEW",
      `${path}/reviewExpiresAt`,
      "review must remain current at corpus generation",
    );
  }
  if (object.lkgRef !== null) {
    parseContentRef(object.lkgRef, "lkg_receipt", `${path}/lkgRef`);
  }
  return object;
}

function validateSyntheticUrlLeaves(value, path) {
  if (typeof value === "string") {
    if (/^http:\/\//iu.test(value)) {
      fail(
        "SYNTHETIC_URL_BOUNDARY",
        path,
        "synthetic URL values must use HTTPS on an impossible origin",
      );
    }
    if (!/^https:\/\//iu.test(value)) {
      return;
    }
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      fail("INVALID_URL", path, "synthetic HTTPS value is not a valid URL");
    }
    const authority = value
      .slice(value.indexOf("://") + 3)
      .split(/[/?#]/u, 1)[0];
    const hasUserInfoDelimiter = authority.includes("@");
    const hostPort = authority.slice(authority.lastIndexOf("@") + 1);
    const hasPortDelimiter = hostPort.includes(":");
    if (
      parsed.protocol !== "https:" ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      hasUserInfoDelimiter ||
      parsed.port !== "" ||
      hasPortDelimiter ||
      !parsed.hostname.toLowerCase().endsWith(".invalid")
    ) {
      fail(
        "SYNTHETIC_URL_BOUNDARY",
        path,
        "synthetic HTTPS values require a credential-free, port-free .invalid origin",
      );
    }
    return;
  }
  if (value === null || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      validateSyntheticUrlLeaves(entry, `${path}/${index}`),
    );
    return;
  }
  Object.entries(value).forEach(([key, child]) =>
    validateSyntheticUrlLeaves(child, `${path}/${key}`),
  );
}

function validatePolicyRecord(record, path, root) {
  const object = expectObject(record, path, RECORD_KEYS);
  if (root.synthetic) {
    validateSyntheticUrlLeaves(object, path);
  }
  if (!validatePolicyRecordSchema(object)) {
    const firstPath =
      validatePolicyRecordSchema.errors?.[0]?.instancePath ?? "";
    fail(
      "INVALID_POLICY_RECORD",
      `${path}${firstPath}`,
      "embedded value does not satisfy the complete PolicyRecord 1.4 schema",
    );
  }
  if (isApplicationProfile(root)) {
    expectLiteral(root.synthetic, true, "/synthetic");
    const canonicalRecord = {
      ...object,
      fieldProvenance: canonicalProvenance(object),
    };
    const expected = syntheticApplicationPins().fixtureDigests.find(
      (entry) => entry.recordId === object.internalId,
    );
    if (!expected || expected.digest !== digestValue(canonicalRecord)) {
      fail(
        "APPLICATION_FIXTURE_PIN_MISMATCH",
        path,
        "only exact reviewed application fixtures are accepted",
      );
    }
    if (
      object.dataQuality.validatedAt > root.generatedAt ||
      object.sourceHealth.checkedAt > root.generatedAt
    ) {
      fail(
        "FUTURE_VALIDATION",
        path,
        "fixture evidence cannot follow corpus generation",
      );
    }
    return canonicalRecord;
  }
  expectLiteral(
    object.schemaVersion,
    RECORD_SCHEMA_VERSION,
    `${path}/schemaVersion`,
  );
  expectRecordId(object.internalId, `${path}/internalId`);
  const source = expectObject(object.source, `${path}/source`, [
    "id",
    "name",
    "provider",
    "recordId",
    "adapterId",
    "adapterVersion",
    "coverage",
    "attribution",
  ]);
  const sourceId = expectStableId(source.id, `${path}/source/id`);
  if (!object.internalId.startsWith(`psr:${sourceId}:`)) {
    fail(
      "RECORD_IDENTITY_MISMATCH",
      `${path}/internalId`,
      "record ID must remain in the exact source identity namespace",
    );
  }
  expectString(source.recordId, `${path}/source/recordId`, 512);
  expectStableId(source.adapterId, `${path}/source/adapterId`);
  expectVersion(source.adapterVersion, `${path}/source/adapterVersion`);
  if (root.synthetic) {
    if (!sourceId.startsWith("synthetic-")) {
      fail(
        "TRUST_DOMAIN_MISMATCH",
        `${path}/source/id`,
        "synthetic corpus records require an explicit synthetic source ID",
      );
    }
    const officialSource = expectObject(object.urls, `${path}/urls`, [
      "officialSource",
      "officialFullText",
    ]).officialSource;
    let hostname;
    try {
      hostname = new URL(officialSource).hostname.toLowerCase();
    } catch {
      fail(
        "INVALID_URL",
        `${path}/urls/officialSource`,
        "expected an absolute URL",
      );
    }
    if (!hostname.endsWith(".invalid")) {
      fail(
        "TRUST_DOMAIN_MISMATCH",
        `${path}/urls/officialSource`,
        "synthetic corpus records require an impossible .invalid origin",
      );
    }
  } else if (sourceId.startsWith("synthetic-")) {
    fail(
      "TRUST_DOMAIN_MISMATCH",
      `${path}/source/id`,
      "real-source corpus cannot contain a synthetic source ID",
    );
  }
  const jurisdiction = expectObject(
    object.jurisdiction,
    `${path}/jurisdiction`,
    ["level", "name", "stateCode", "generalJurisdictionOnly"],
  );
  expectLiteral(
    jurisdiction.generalJurisdictionOnly,
    true,
    `${path}/jurisdiction/generalJurisdictionOnly`,
  );
  expectArray(object.nationAssociations, `${path}/nationAssociations`, 0, 0);
  expectArray(object.taxonomyMemberships, `${path}/taxonomyMemberships`, 0, 0);
  expectLiteral(object.isUnclassified, true, `${path}/isUnclassified`);
  const relevance = expectArray(object.relevance, `${path}/relevance`, 1, 1);
  const relevanceEntry = expectObject(relevance[0], `${path}/relevance/0`, [
    "basis",
    "label",
    "sourceUrl",
    "evidence",
  ]);
  expectLiteral(
    relevanceEntry.basis,
    "general_jurisdiction",
    `${path}/relevance/0/basis`,
  );
  expectLiteral(
    relevanceEntry.label,
    GENERAL_JURISDICTION_LABEL,
    `${path}/relevance/0/label`,
  );
  expectLiteral(
    relevanceEntry.evidence,
    GENERAL_JURISDICTION_EVIDENCE,
    `${path}/relevance/0/evidence`,
  );
  expectLiteral(
    relevanceEntry.sourceUrl,
    object.urls.officialSource,
    `${path}/relevance/0/sourceUrl`,
  );
  const aiSummary = expectObject(object.aiSummary, `${path}/aiSummary`, [
    "exists",
    "label",
  ]);
  expectLiteral(aiSummary.exists, false, `${path}/aiSummary/exists`);
  expectLiteral(
    aiSummary.label,
    "AI-generated source summary",
    `${path}/aiSummary/label`,
  );
  const landmark = expectObject(object.landmark, `${path}/landmark`, [
    "isLandmark",
  ]);
  expectLiteral(landmark.isLandmark, false, `${path}/landmark/isLandmark`);

  const dataQuality = expectObject(object.dataQuality, `${path}/dataQuality`, [
    "state",
    "validatedAt",
    "validator",
    "issues",
  ]);
  expectLiteral(dataQuality.state, "validated", `${path}/dataQuality/state`);
  const validatedAt = expectTimestamp(
    dataQuality.validatedAt,
    `${path}/dataQuality/validatedAt`,
  );
  expectString(dataQuality.validator, `${path}/dataQuality/validator`, 256);
  if (validatedAt > root.generatedAt) {
    fail(
      "FUTURE_VALIDATION",
      `${path}/dataQuality/validatedAt`,
      "record validation cannot follow corpus generation",
    );
  }
  const retrievedAt = expectTimestamp(
    object.dates.retrieved,
    `${path}/dates/retrieved`,
  );
  if (retrievedAt > root.generatedAt) {
    fail(
      "FUTURE_RETRIEVAL",
      `${path}/dates/retrieved`,
      "record retrieval cannot follow corpus generation",
    );
  }
  if (validatedAt < retrievedAt) {
    fail(
      "INVALID_VALIDATION_TIME_ORDER",
      `${path}/dataQuality/validatedAt`,
      "record validation cannot precede retrieval",
    );
  }
  const sourceHealth = expectObject(
    object.sourceHealth,
    `${path}/sourceHealth`,
    [
      "status",
      "checkedAt",
      "dataAsOf",
      "lastSuccessfulRetrievalAt",
      "usingLastKnownGood",
      "message",
    ],
  );
  const healthCheckedAt = expectTimestamp(
    sourceHealth.checkedAt,
    `${path}/sourceHealth/checkedAt`,
  );
  const healthDataAsOf = expectTimestamp(
    sourceHealth.dataAsOf,
    `${path}/sourceHealth/dataAsOf`,
  );
  if (
    healthDataAsOf > healthCheckedAt ||
    healthDataAsOf > retrievedAt ||
    retrievedAt > healthCheckedAt ||
    healthCheckedAt > root.generatedAt
  ) {
    fail(
      "INVALID_HEALTH_TIME_ORDER",
      `${path}/sourceHealth`,
      "health data, retrieval, check, and corpus generation must remain causal",
    );
  }
  if (!["healthy", "degraded"].includes(sourceHealth.status)) {
    fail(
      "UNUSABLE_SOURCE_HEALTH",
      `${path}/sourceHealth/status`,
      "only healthy or degraded sources can contribute an emitted corpus record",
    );
  }
  if (sourceHealth.lastSuccessfulRetrievalAt === null) {
    fail(
      "MISSING_LAST_SUCCESSFUL_RETRIEVAL",
      `${path}/sourceHealth/lastSuccessfulRetrievalAt`,
      "every emitted record requires a prior successful retrieval",
    );
  }
  const successfulAt = expectTimestamp(
    sourceHealth.lastSuccessfulRetrievalAt,
    `${path}/sourceHealth/lastSuccessfulRetrievalAt`,
  );
  if (successfulAt > healthCheckedAt || successfulAt > root.generatedAt) {
    fail(
      "INVALID_HEALTH_TIME_ORDER",
      `${path}/sourceHealth/lastSuccessfulRetrievalAt`,
      "last successful retrieval cannot follow health check or corpus generation",
    );
  }
  if (successfulAt !== retrievedAt) {
    fail(
      "HEALTH_RETRIEVAL_MISMATCH",
      `${path}/sourceHealth/lastSuccessfulRetrievalAt`,
      "emitted records must preserve their exact successful retrieval timestamp",
    );
  }

  const expectedPointers = sourceDerivedLeafPointers(object);
  const expectedPointerSet = new Set(expectedPointers);
  const sourceUpdatedValue = object.dates.updated ?? object.dates.published;
  const expectedSourceUpdatedAt =
    sourceUpdatedValue === null
      ? null
      : sourceUpdatedValue.includes("T")
        ? sourceUpdatedValue
        : `${sourceUpdatedValue}T00:00:00Z`;
  const provenance = expectArray(
    object.fieldProvenance,
    `${path}/fieldProvenance`,
    expectedPointers.length,
    expectedPointers.length,
  );
  const observedPointers = [];
  provenance.forEach((entry, index) => {
    const provenanceEntry = expectObject(
      entry,
      `${path}/fieldProvenance/${index}`,
      [
        "field",
        "sourcePath",
        "sourceId",
        "sourceRecordId",
        "sourceUrl",
        "retrievedAt",
        "sourceUpdatedAt",
        "adapterId",
        "transformation",
        "transformRuleId",
        "validationState",
      ],
    );
    const field = expectString(
      provenanceEntry.field,
      `${path}/fieldProvenance/${index}/field`,
      2048,
    );
    if (!expectedPointerSet.has(field)) {
      fail(
        "UNBOUND_PROVENANCE",
        `${path}/fieldProvenance/${index}/field`,
        "provenance field is outside the complete source-derived pointer set",
      );
    }
    observedPointers.push(field);
    expectLiteral(
      provenanceEntry.sourceId,
      source.id,
      `${path}/fieldProvenance/${index}/sourceId`,
    );
    expectLiteral(
      provenanceEntry.sourceRecordId,
      source.recordId,
      `${path}/fieldProvenance/${index}/sourceRecordId`,
    );
    expectLiteral(
      provenanceEntry.adapterId,
      source.adapterId,
      `${path}/fieldProvenance/${index}/adapterId`,
    );
    expectLiteral(
      provenanceEntry.sourceUrl,
      object.urls.officialSource,
      `${path}/fieldProvenance/${index}/sourceUrl`,
    );
    expectLiteral(
      provenanceEntry.retrievedAt,
      object.dates.retrieved,
      `${path}/fieldProvenance/${index}/retrievedAt`,
    );
    expectLiteral(
      provenanceEntry.sourceUpdatedAt,
      expectedSourceUpdatedAt,
      `${path}/fieldProvenance/${index}/sourceUpdatedAt`,
    );
    expectLiteral(
      provenanceEntry.validationState,
      "validated",
      `${path}/fieldProvenance/${index}/validationState`,
    );
    if (field === "/relevance/0/label" || field === "/relevance/0/evidence") {
      expectLiteral(
        provenanceEntry.sourcePath,
        "$analyzedCorpus.generalJurisdictionRule",
        `${path}/fieldProvenance/${index}/sourcePath`,
      );
      expectLiteral(
        provenanceEntry.transformation,
        "deterministic_mapping",
        `${path}/fieldProvenance/${index}/transformation`,
      );
      expectLiteral(
        provenanceEntry.transformRuleId,
        "analyzed-corpus-general-jurisdiction-relevance-v1",
        `${path}/fieldProvenance/${index}/transformRuleId`,
      );
    }
  });
  if (
    new Set(observedPointers).size !== observedPointers.length ||
    !sameValue(
      [...observedPointers].sort(compareText),
      [...expectedPointers].sort(compareText),
    )
  ) {
    fail(
      "INCOMPLETE_PROVENANCE",
      `${path}/fieldProvenance`,
      "every source-derived leaf requires one exact provenance entry",
    );
  }
  return {
    ...object,
    fieldProvenance: canonicalProvenance(object),
  };
}

function canonicalProvenance(record) {
  return [...record.fieldProvenance].sort((left, right) => {
    const foldedOrder = compareText(
      left.field.toLowerCase(),
      right.field.toLowerCase(),
    );
    return foldedOrder || compareText(left.field, right.field);
  });
}

function validateRecordBindingHealth(record, binding, path) {
  const { sourceHealth } = record;
  const hasLkgReference = binding.lkgRef !== null;
  if (sourceHealth.status === "healthy") {
    if (sourceHealth.usingLastKnownGood) {
      fail(
        "INVALID_LKG_STATE",
        `${path}/record/sourceHealth`,
        "healthy records cannot use last-known-good fallback",
      );
    }
    if (hasLkgReference) {
      fail(
        "UNEXPECTED_LKG_REFERENCE",
        `${path}/sourceEvidenceBindingRef`,
        "healthy records cannot carry last-known-good evidence",
      );
    }
    if (sourceHealth.message !== null) {
      fail(
        "INVALID_HEALTH_MESSAGE",
        `${path}/record/sourceHealth/message`,
        "healthy records cannot carry a degradation message",
      );
    }
    return;
  }
  if (!sourceHealth.usingLastKnownGood) {
    fail(
      "INVALID_LKG_STATE",
      `${path}/record/sourceHealth`,
      "degraded records must use last-known-good fallback",
    );
  }
  if (!hasLkgReference) {
    fail(
      "LKG_REFERENCE_REQUIRED",
      `${path}/sourceEvidenceBindingRef`,
      "last-known-good reuse requires an explicit binding reference",
    );
  }
  if (
    typeof sourceHealth.message !== "string" ||
    sourceHealth.message.trim() === "" ||
    sourceHealth.message.length > 240
  ) {
    fail(
      "INVALID_HEALTH_MESSAGE",
      `${path}/record/sourceHealth/message`,
      "degraded records require a bounded nonblank neutral message",
    );
  }
}

function validateWhyShown(value, path, corpus, binding) {
  const object = expectObject(value, path, [
    "basis",
    "evidenceField",
    "configurationAuthorityRef",
    "ruleRef",
    "validFrom",
    "validThrough",
    "reviewEvidenceRef",
    "nonClaims",
  ]);
  expectLiteral(
    object.basis,
    isApplicationProfile(corpus)
      ? "synthetic_compatibility"
      : "general_jurisdiction",
    `${path}/basis`,
  );
  expectLiteral(
    object.evidenceField,
    isApplicationProfile(corpus)
      ? "/source/id"
      : "/jurisdiction/generalJurisdictionOnly",
    `${path}/evidenceField`,
  );
  parseDigestedRef(
    object.configurationAuthorityRef,
    "configuration_authority",
    `${path}/configurationAuthorityRef`,
  );
  if (
    !sameValue(
      object.configurationAuthorityRef,
      corpus.projectionInputs.configurationAuthorityRef,
    )
  ) {
    fail(
      "REFERENCE_MISMATCH",
      `${path}/configurationAuthorityRef`,
      "whyShown must bind the corpus configuration authority",
    );
  }
  parseDigestedRef(object.ruleRef, "why_shown_rule", `${path}/ruleRef`);
  const validFrom = expectTimestamp(object.validFrom, `${path}/validFrom`);
  if (validFrom > corpus.generatedAt) {
    fail(
      "TIME_OUTSIDE_INTERVAL",
      `${path}/validFrom`,
      "whyShown is not yet effective",
    );
  }
  if (object.validThrough !== null) {
    const validThrough = expectTimestamp(
      object.validThrough,
      `${path}/validThrough`,
    );
    if (validThrough <= validFrom || validThrough <= corpus.generatedAt) {
      fail(
        "TIME_OUTSIDE_INTERVAL",
        `${path}/validThrough`,
        "whyShown review is not current",
      );
    }
  }
  expectLiteral(
    object.validThrough,
    binding.reviewExpiresAt,
    `${path}/validThrough`,
  );
  const expectedReviewEvidence = corpus.synthetic
    ? binding.reviewRef
    : binding.reviewRef;
  if (corpus.synthetic) {
    parseDigestedRef(
      object.reviewEvidenceRef,
      "synthetic_review_evidence",
      `${path}/reviewEvidenceRef`,
    );
  } else {
    parseContentRef(
      object.reviewEvidenceRef,
      "review_receipt",
      `${path}/reviewEvidenceRef`,
    );
  }
  if (!sameValue(object.reviewEvidenceRef, expectedReviewEvidence)) {
    fail(
      "REFERENCE_MISMATCH",
      `${path}/reviewEvidenceRef`,
      "whyShown must share the binding's exact review evidence",
    );
  }
  assertNonClaims(object.nonClaims, `${path}/nonClaims`);
  return object;
}

function recordRef(entry) {
  return {
    recordId: entry.recordId,
    recordDigest: entry.recordDigest,
    sourceEvidenceBindingRef: entry.sourceEvidenceBindingRef,
  };
}

function validateCorpusSnapshot(corpus, authority) {
  const compatibility = corpus.schemaVersion === "1.1.0";
  const root = expectObject(
    corpus,
    "$analyzedCorpus",
    compatibility ? [...ROOT_KEYS, "recordProfile"] : ROOT_KEYS,
  );
  if (compatibility) {
    expectLiteral(
      root.recordProfile,
      SYNTHETIC_APPLICATION_PROFILE,
      "/recordProfile",
    );
    expectLiteral(root.synthetic, true, "/synthetic");
  }
  expectLiteral(root.$schema, ANALYZED_CORPUS_SCHEMA_ID, "/$schema");
  expectLiteral(
    root.schemaVersion,
    compatibility ? "1.1.0" : ANALYZED_CORPUS_SCHEMA_VERSION,
    "/schemaVersion",
  );
  expectLiteral(root.kind, "analyzed_corpus", "/kind");
  expectStableId(root.id, "/id");
  expectVersion(root.version, "/version");
  expectDigest(root.contentDigest, "/contentDigest");
  if (contentDigest(root) !== root.contentDigest) {
    fail(
      "CONTENT_DIGEST_MISMATCH",
      "/contentDigest",
      "corpus bytes do not match the declared digest",
    );
  }
  if (typeof root.synthetic !== "boolean") {
    fail("INVALID_SHAPE", "/synthetic", "expected a boolean");
  }
  const expectedTrustDomain = root.synthetic
    ? "synthetic_test_only"
    : "real_source_local_prerelease";
  expectLiteral(root.trustDomain, expectedTrustDomain, "/trustDomain");
  expectTimestamp(root.generatedAt, "/generatedAt");
  expectTimestamp(root.dataAsOf, "/dataAsOf");
  if (root.dataAsOf > root.generatedAt) {
    fail(
      "INVALID_TIME_ORDER",
      "/dataAsOf",
      "dataAsOf cannot follow generatedAt",
    );
  }
  const recordSchemaRef = expectObject(
    root.recordSchemaRef,
    "/recordSchemaRef",
    ["schemaId", "version"],
  );
  expectLiteral(
    recordSchemaRef.schemaId,
    RECORD_SCHEMA_ID,
    "/recordSchemaRef/schemaId",
  );
  expectLiteral(
    recordSchemaRef.version,
    RECORD_SCHEMA_VERSION,
    "/recordSchemaRef/version",
  );
  validateProjectionInputs(root.projectionInputs, "/projectionInputs");
  assertNonClaims(root.nonClaims, "/nonClaims");
  const publication = expectObject(root.publication, "/publication", [
    "state",
    "boundary",
    "authorityReceiptRefs",
  ]);
  expectLiteral(publication.state, "closed", "/publication/state");
  expectLiteral(publication.boundary, VISIBILITY, "/publication/boundary");
  expectArray(
    publication.authorityReceiptRefs,
    "/publication/authorityReceiptRefs",
    0,
    0,
  );

  const bindings = expectArray(
    root.sourceEvidenceBindings,
    "/sourceEvidenceBindings",
    1,
    4096,
  );
  bindings.forEach((binding, index) =>
    validateBinding(binding, `/sourceEvidenceBindings/${index}`, root),
  );
  requireCanonicalOrder(bindings, bindingKey, "/sourceEvidenceBindings");
  const bindingByKey = new Map(
    bindings.map((binding) => [bindingKey(binding), binding]),
  );

  const entries = expectArray(root.recordEntries, "/recordEntries", 1, 4096);
  const sourceIdentityKeys = [];
  entries.forEach((entry, index) => {
    const path = `/recordEntries/${index}`;
    const object = expectObject(entry, path, [
      "recordId",
      "recordDigest",
      "provenanceDigest",
      "sourceEvidenceBindingRef",
      "whyShown",
      "visibility",
      "record",
    ]);
    expectRecordId(object.recordId, `${path}/recordId`);
    expectDigest(object.recordDigest, `${path}/recordDigest`);
    expectDigest(object.provenanceDigest, `${path}/provenanceDigest`);
    const bindingRef = parseContentRef(
      object.sourceEvidenceBindingRef,
      "source_evidence_binding",
      `${path}/sourceEvidenceBindingRef`,
    );
    const binding = bindingByKey.get(`${bindingRef.id}@${bindingRef.version}`);
    if (
      binding === undefined ||
      binding.contentDigest !== bindingRef.contentDigest
    ) {
      fail(
        "UNRESOLVED_REFERENCE",
        `${path}/sourceEvidenceBindingRef`,
        "record binding reference does not resolve exactly",
      );
    }
    const record = validatePolicyRecord(object.record, `${path}/record`, root);
    if (!sameValue(object.record.fieldProvenance, record.fieldProvenance)) {
      fail(
        "NON_CANONICAL_ORDER",
        `${path}/record/fieldProvenance`,
        "stored provenance entries must use canonical pointer order",
      );
    }
    expectLiteral(object.recordId, record.internalId, `${path}/recordId`);
    if (digestValue(record) !== object.recordDigest) {
      fail(
        "CONTENT_DIGEST_MISMATCH",
        `${path}/recordDigest`,
        "record bytes do not match their digest",
      );
    }
    if (digestValue(canonicalProvenance(record)) !== object.provenanceDigest) {
      fail(
        "CONTENT_DIGEST_MISMATCH",
        `${path}/provenanceDigest`,
        "field provenance bytes do not match their digest",
      );
    }
    expectLiteral(
      binding.sourceId,
      record.source.id,
      `${path}/sourceEvidenceBindingRef`,
    );
    validateRecordBindingHealth(record, binding, path);
    validateWhyShown(object.whyShown, `${path}/whyShown`, root, binding);
    expectLiteral(object.visibility, VISIBILITY, `${path}/visibility`);
    sourceIdentityKeys.push(
      `${record.source.id}\u0000${record.source.recordId}`,
    );
  });
  requireCanonicalOrder(entries, (entry) => entry.recordId, "/recordEntries");
  if (compatibility) {
    const pins = syntheticApplicationPins();
    if (
      !sameValue(
        entries.map((entry) => ({
          recordId: entry.recordId,
          digest: entry.recordDigest,
        })),
        pins.fixtureDigests,
      )
    ) {
      fail(
        "APPLICATION_FIXTURE_SET_MISMATCH",
        "/recordEntries",
        "all three exact fixtures are required once",
      );
    }
    expectLiteral(
      root.projectionInputs.taxonomyRef.digest,
      pins.taxonomyDigest,
      "/projectionInputs/taxonomyRef/digest",
    );
    expectLiteral(
      root.projectionInputs.configurationAuthorityRef.digest,
      pins.sourceRegistryDigest,
      "/projectionInputs/configurationAuthorityRef/digest",
    );
    validateRecordSetPolicy(
      entries.map((entry) => entry.record),
      { sourceRegistry: canonicalSources, taxonomy: canonicalTaxonomy },
    );
  }
  const derivedDataAsOf = entries
    .map((entry) => entry.record.sourceHealth.dataAsOf)
    .sort(compareText)
    .at(-1);
  expectLiteral(root.dataAsOf, derivedDataAsOf, "/dataAsOf");
  if (new Set(sourceIdentityKeys).size !== sourceIdentityKeys.length) {
    fail(
      "DUPLICATE_RECORD",
      "/recordEntries",
      "source ID and source record ID must be unique",
    );
  }
  if (bindings.length !== entries.length) {
    fail(
      "CARDINALITY_MISMATCH",
      "/sourceEvidenceBindings",
      "each record requires exactly one exclusive source binding",
    );
  }
  const usedBindings = entries.map((entry) =>
    refKey(entry.sourceEvidenceBindingRef),
  );
  if (new Set(usedBindings).size !== bindings.length) {
    fail(
      "CARDINALITY_MISMATCH",
      "/recordEntries",
      "a source binding cannot serve more than one record",
    );
  }
  const recordById = new Map(entries.map((entry) => [entry.recordId, entry]));
  const limitationByKey = new Map(
    root.projectionInputs.limitationRefs.map((reference) => [
      refKey(reference),
      reference,
    ]),
  );

  const views = expectArray(root.views, "/views", 1, 128);
  views.forEach((view, viewIndex) => {
    const path = `/views/${viewIndex}`;
    const object = expectObject(view, path, [
      "kind",
      "id",
      "version",
      "contentDigest",
      "visibility",
      "recordRefs",
      "limitationRefs",
    ]);
    expectLiteral(object.kind, "analyzed_corpus_view", `${path}/kind`);
    expectStableId(object.id, `${path}/id`);
    expectVersion(object.version, `${path}/version`);
    expectDigest(object.contentDigest, `${path}/contentDigest`);
    if (contentDigest(object) !== object.contentDigest) {
      fail(
        "CONTENT_DIGEST_MISMATCH",
        `${path}/contentDigest`,
        "view bytes do not match their digest",
      );
    }
    expectLiteral(object.visibility, VISIBILITY, `${path}/visibility`);
    const refs = expectArray(
      object.recordRefs,
      `${path}/recordRefs`,
      1,
      entries.length,
    );
    refs.forEach((reference, refIndex) => {
      const refPath = `${path}/recordRefs/${refIndex}`;
      const parsed = expectObject(reference, refPath, [
        "recordId",
        "recordDigest",
        "sourceEvidenceBindingRef",
      ]);
      expectRecordId(parsed.recordId, `${refPath}/recordId`);
      expectDigest(parsed.recordDigest, `${refPath}/recordDigest`);
      parseContentRef(
        parsed.sourceEvidenceBindingRef,
        "source_evidence_binding",
        `${refPath}/sourceEvidenceBindingRef`,
      );
      const entry = recordById.get(parsed.recordId);
      if (entry === undefined || !sameValue(parsed, recordRef(entry))) {
        fail(
          "UNRESOLVED_REFERENCE",
          refPath,
          "view record reference does not resolve exactly",
        );
      }
    });
    requireCanonicalOrder(
      refs,
      (reference) => reference.recordId,
      `${path}/recordRefs`,
    );
    const limitations = expectArray(
      object.limitationRefs,
      `${path}/limitationRefs`,
      1,
      64,
    );
    limitations.forEach((reference, index) => {
      parseDigestedRef(
        reference,
        "limitation",
        `${path}/limitationRefs/${index}`,
      );
      const expected = limitationByKey.get(refKey(reference));
      if (expected === undefined || !sameValue(reference, expected)) {
        fail(
          "UNRESOLVED_REFERENCE",
          `${path}/limitationRefs/${index}`,
          "view limitation must resolve to an exact caller-pinned corpus input",
        );
      }
    });
    requireCanonicalOrder(limitations, refKey, `${path}/limitationRefs`);
    if (!sameValue(limitations, root.projectionInputs.limitationRefs)) {
      fail(
        "LIMITATION_OMISSION",
        `${path}/limitationRefs`,
        "every view must preserve the complete caller-pinned limitation set",
      );
    }
  });
  requireCanonicalOrder(views, bindingKey, "/views");

  validateLifecycleAuthority(root, authority);
  return root;
}

function validateLifecycleAuthority(corpus, authorityValue) {
  if (corpus.synthetic) {
    if (authorityValue !== undefined) {
      const authority = expectObject(authorityValue, "$lifecycleAuthority", [
        "realSourceLifecyclePins",
      ]);
      expectArray(
        authority.realSourceLifecyclePins,
        "/realSourceLifecyclePins",
        0,
        0,
      );
    }
    return;
  }
  void authorityValue;
  fail(
    "REAL_SOURCE_LIFECYCLE_INTEGRATION_REQUIRED",
    "/sourceEvidenceBindings",
    "version 1.0.0 fails closed until the accepted lifecycle parser and evaluator are callable through a source-neutral integration",
  );
}

function bindingInputToFinal(value, path, root) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_SHAPE", path, "expected an object");
  }
  const inputKeys = root.synthetic
    ? CREATE_SYNTHETIC_BINDING_KEYS
    : CREATE_REAL_BINDING_KEYS;
  const outputKeys = root.synthetic
    ? SYNTHETIC_BINDING_KEYS
    : REAL_BINDING_KEYS;
  const object = expectObject(value, path, inputKeys);
  const final = { ...object, contentDigest: "0".repeat(64) };
  const ordered = Object.fromEntries(
    outputKeys.map((key) => [key, final[key]]),
  );
  ordered.contentDigest = contentDigest(ordered);
  validateBinding(ordered, path, root);
  return ordered;
}

export function createAnalyzedCorpus(inputValue, lifecycleAuthority) {
  const input = capturePlainJson(inputValue, "$createAnalyzedCorpus");
  const authority =
    lifecycleAuthority === undefined
      ? undefined
      : capturePlainJson(lifecycleAuthority, "$lifecycleAuthority");
  const compatibility = Object.hasOwn(input, "recordProfile");
  const object = expectObject(
    input,
    "$createAnalyzedCorpus",
    compatibility ? [...CREATE_ROOT_KEYS, "recordProfile"] : CREATE_ROOT_KEYS,
  );
  if (compatibility)
    expectLiteral(
      object.recordProfile,
      SYNTHETIC_APPLICATION_PROFILE,
      "/recordProfile",
    );
  const root = {
    synthetic: object.synthetic,
    trustDomain: object.trustDomain,
    generatedAt: object.generatedAt,
    ...(compatibility ? { recordProfile: object.recordProfile } : {}),
  };
  if (typeof root.synthetic !== "boolean") {
    fail("INVALID_SHAPE", "/synthetic", "expected a boolean");
  }
  expectLiteral(
    root.trustDomain,
    root.synthetic ? "synthetic_test_only" : "real_source_local_prerelease",
    "/trustDomain",
  );
  expectTimestamp(root.generatedAt, "/generatedAt");
  const bindings = expectArray(
    object.sourceEvidenceBindings,
    "/sourceEvidenceBindings",
    1,
    4096,
  )
    .map((binding, index) =>
      bindingInputToFinal(binding, `/sourceEvidenceBindings/${index}`, root),
    )
    .sort((left, right) => compareText(bindingKey(left), bindingKey(right)));
  const bindingByKey = new Map(
    bindings.map((binding) => [bindingKey(binding), binding]),
  );
  const projectionInputs = validateProjectionInputs(
    object.projectionInputs,
    "/projectionInputs",
  );
  const draftRoot = {
    ...root,
    projectionInputs,
  };
  const entries = expectArray(object.recordEntries, "/recordEntries", 1, 4096)
    .map((entry, index) => {
      const path = `/recordEntries/${index}`;
      const item = expectObject(entry, path, [
        "record",
        "sourceEvidenceBindingRef",
        "whyShown",
        "visibility",
      ]);
      const record = validatePolicyRecord(
        item.record,
        `${path}/record`,
        draftRoot,
      );
      const requestedBinding = expectObject(
        item.sourceEvidenceBindingRef,
        `${path}/sourceEvidenceBindingRef`,
        ["id", "version"],
      );
      expectStableId(
        requestedBinding.id,
        `${path}/sourceEvidenceBindingRef/id`,
      );
      expectVersion(
        requestedBinding.version,
        `${path}/sourceEvidenceBindingRef/version`,
      );
      const binding = bindingByKey.get(
        `${requestedBinding.id}@${requestedBinding.version}`,
      );
      if (binding === undefined) {
        fail(
          "UNRESOLVED_REFERENCE",
          `${path}/sourceEvidenceBindingRef`,
          "record binding is absent",
        );
      }
      const bindingRef = {
        kind: "source_evidence_binding",
        id: binding.id,
        version: binding.version,
        contentDigest: binding.contentDigest,
      };
      validateWhyShown(item.whyShown, `${path}/whyShown`, draftRoot, binding);
      expectLiteral(item.visibility, VISIBILITY, `${path}/visibility`);
      return {
        recordId: record.internalId,
        recordDigest: digestValue(record),
        provenanceDigest: digestValue(canonicalProvenance(record)),
        sourceEvidenceBindingRef: bindingRef,
        whyShown: item.whyShown,
        visibility: VISIBILITY,
        record,
      };
    })
    .sort((left, right) => compareText(left.recordId, right.recordId));
  const entryById = new Map(entries.map((entry) => [entry.recordId, entry]));
  const views = expectArray(object.views, "/views", 1, 128)
    .map((view, index) => {
      const path = `/views/${index}`;
      const item = expectObject(view, path, [
        "id",
        "version",
        "visibility",
        "recordIds",
        "limitationRefs",
      ]);
      expectStableId(item.id, `${path}/id`);
      expectVersion(item.version, `${path}/version`);
      expectLiteral(item.visibility, VISIBILITY, `${path}/visibility`);
      const recordIds = expectArray(
        item.recordIds,
        `${path}/recordIds`,
        1,
        entries.length,
      );
      requireCanonicalOrder(
        recordIds,
        (recordId) => expectRecordId(recordId, `${path}/recordIds`),
        `${path}/recordIds`,
      );
      const recordRefs = recordIds.map((recordId) => {
        const entry = entryById.get(recordId);
        if (entry === undefined) {
          fail(
            "UNRESOLVED_REFERENCE",
            `${path}/recordIds`,
            "view record ID is absent from the corpus",
          );
        }
        return recordRef(entry);
      });
      const limitationRefs = expectArray(
        item.limitationRefs,
        `${path}/limitationRefs`,
        1,
        64,
      );
      limitationRefs.forEach((reference, refIndex) => {
        parseDigestedRef(
          reference,
          "limitation",
          `${path}/limitationRefs/${refIndex}`,
        );
        const expected = projectionInputs.limitationRefs.find(
          (candidate) => refKey(candidate) === refKey(reference),
        );
        if (expected === undefined || !sameValue(reference, expected)) {
          fail(
            "UNRESOLVED_REFERENCE",
            `${path}/limitationRefs/${refIndex}`,
            "view limitation must resolve to an exact corpus input",
          );
        }
      });
      requireCanonicalOrder(limitationRefs, refKey, `${path}/limitationRefs`);
      if (!sameValue(limitationRefs, projectionInputs.limitationRefs)) {
        fail(
          "LIMITATION_OMISSION",
          `${path}/limitationRefs`,
          "every view must preserve the complete corpus limitation set",
        );
      }
      const draft = {
        kind: "analyzed_corpus_view",
        id: item.id,
        version: item.version,
        contentDigest: "0".repeat(64),
        visibility: VISIBILITY,
        recordRefs,
        limitationRefs,
      };
      draft.contentDigest = contentDigest(draft);
      return draft;
    })
    .sort((left, right) => compareText(bindingKey(left), bindingKey(right)));
  const corpus = {
    $schema: ANALYZED_CORPUS_SCHEMA_ID,
    schemaVersion: compatibility ? "1.1.0" : ANALYZED_CORPUS_SCHEMA_VERSION,
    ...(compatibility ? { recordProfile: object.recordProfile } : {}),
    kind: "analyzed_corpus",
    id: expectStableId(object.id, "/id"),
    version: expectVersion(object.version, "/version"),
    contentDigest: "0".repeat(64),
    synthetic: root.synthetic,
    trustDomain: root.trustDomain,
    generatedAt: root.generatedAt,
    dataAsOf: expectTimestamp(object.dataAsOf, "/dataAsOf"),
    recordSchemaRef: {
      schemaId: RECORD_SCHEMA_ID,
      version: RECORD_SCHEMA_VERSION,
    },
    projectionInputs,
    sourceEvidenceBindings: bindings,
    recordEntries: entries,
    views,
    nonClaims: [...REQUIRED_ANALYZED_CORPUS_NON_CLAIMS],
    publication: {
      state: "closed",
      boundary: VISIBILITY,
      authorityReceiptRefs: [],
    },
  };
  corpus.contentDigest = contentDigest(corpus);
  return parseAnalyzedCorpus(corpus, authority);
}

export function parseAnalyzedCorpus(value, lifecycleAuthority) {
  const corpus = capturePlainJson(value, "$analyzedCorpus");
  const authority =
    lifecycleAuthority === undefined
      ? undefined
      : capturePlainJson(lifecycleAuthority, "$lifecycleAuthority");
  return validateCorpusSnapshot(corpus, authority);
}

export function serializeAnalyzedCorpus(corpus, lifecycleAuthority) {
  return `${canonicalEncode(parseAnalyzedCorpus(corpus, lifecycleAuthority))}\n`;
}

export function assertAnalyzedCorpusCompatibility(
  corpusValue,
  expectationValue,
  lifecycleAuthority,
) {
  const corpus = parseAnalyzedCorpus(corpusValue, lifecycleAuthority);
  const expectation = capturePlainJson(expectationValue, "$corpusExpectation");
  const object = expectObject(expectation, "$corpusExpectation", [
    "corpusRef",
    "synthetic",
    "trustDomain",
    "recordSchemaRef",
  ]);
  const expectedRef = parseContentRef(
    object.corpusRef,
    "analyzed_corpus",
    "/corpusRef",
  );
  const actualRef = {
    kind: "analyzed_corpus",
    id: corpus.id,
    version: corpus.version,
    contentDigest: corpus.contentDigest,
  };
  if (!sameValue(expectedRef, actualRef)) {
    fail(
      "CORPUS_PIN_MISMATCH",
      "/corpusRef",
      "corpus differs from the caller-pinned identity and digest",
    );
  }
  expectLiteral(object.synthetic, corpus.synthetic, "/synthetic");
  expectLiteral(object.trustDomain, corpus.trustDomain, "/trustDomain");
  if (!sameValue(object.recordSchemaRef, corpus.recordSchemaRef)) {
    fail(
      "RECORD_SCHEMA_MISMATCH",
      "/recordSchemaRef",
      "record contract differs from the caller pin",
    );
  }
  return corpus;
}

export function projectAnalyzedCorpus(
  corpusValue,
  requestValue,
  lifecycleAuthority,
) {
  const corpus = parseAnalyzedCorpus(corpusValue, lifecycleAuthority);
  const request = capturePlainJson(requestValue, "$projectionRequest");
  const object = expectObject(request, "$projectionRequest", [
    "expectedCorpusRef",
    "contextRef",
    "expectedViewRef",
    "expectedRecordRefs",
  ]);
  const expectedCorpusRef = parseContentRef(
    object.expectedCorpusRef,
    "analyzed_corpus",
    "/expectedCorpusRef",
  );
  const actualCorpusRef = {
    kind: "analyzed_corpus",
    id: corpus.id,
    version: corpus.version,
    contentDigest: corpus.contentDigest,
  };
  if (!sameValue(expectedCorpusRef, actualCorpusRef)) {
    fail(
      "CORPUS_PIN_MISMATCH",
      "/expectedCorpusRef",
      "projection requires the exact caller-pinned corpus",
    );
  }
  const contextRef = parseDigestedRef(
    object.contextRef,
    "projection_context",
    "/contextRef",
  );
  const expectedViewRef = parseContentRef(
    object.expectedViewRef,
    "analyzed_corpus_view",
    "/expectedViewRef",
  );
  const view = corpus.views.find(
    (candidate) =>
      candidate.id === expectedViewRef.id &&
      candidate.version === expectedViewRef.version,
  );
  if (
    view === undefined ||
    view.contentDigest !== expectedViewRef.contentDigest
  ) {
    fail(
      "VIEW_PIN_MISMATCH",
      "/expectedViewRef",
      "view differs from the caller pin",
    );
  }
  const expectedRecordRefs = expectArray(
    object.expectedRecordRefs,
    "/expectedRecordRefs",
    1,
    corpus.recordEntries.length,
  );
  if (!sameValue(expectedRecordRefs, view.recordRefs)) {
    fail(
      "RECORD_PIN_MISMATCH",
      "/expectedRecordRefs",
      "record references differ from the caller-pinned view",
    );
  }
  const projection = {
    schemaVersion: ANALYZED_CORPUS_SCHEMA_VERSION,
    kind: "analyzed_corpus_projection",
    corpusRef: actualCorpusRef,
    contextRef,
    viewRef: expectedViewRef,
    recordRefs: view.recordRefs,
    fingerprint: "0".repeat(64),
  };
  projection.fingerprint = digestValue(
    Object.fromEntries(
      Object.entries(projection).filter(([key]) => key !== "fingerprint"),
    ),
  );
  return deepFreeze(capturePlainJson(projection, "$projection"));
}
