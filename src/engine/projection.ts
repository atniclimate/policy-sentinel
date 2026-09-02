import sourceRegistryJson from "../../config/sources.v1.json";
import taxonomyJson from "../../config/taxonomy.v1.json";

import type { PolicyRecord } from "../shared/contracts";
import {
  PROJECTION_PROFILE_SCHEMA_VERSION,
  type CommunityDeploymentProfile,
  type CommunityRelevanceAssertion,
  type CommunityRelevanceBasis,
  type CommunityRelevanceReviewState,
  type DeepReadonly,
  type DeploymentView,
  type EngineProjection,
  type PersonaProjection,
  type ProjectionAuthorityState,
  type ProjectionProfileBundle,
  type ProjectionTemporalScope,
  type ProjectionWatchRule,
  type RegionPack,
  type RequiredCommunityRelevanceNonClaims,
  type VersionedReference,
} from "./contracts";

const PROFILE_SCHEMA_ID =
  "https://policy-sentinel.invalid/schemas/projection-profile.schema.v1.json";
const STABLE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const SEMANTIC_VERSION_PATTERN =
  /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const RECORD_ID_PATTERN = /^psr:[a-z0-9]+(?:-[a-z0-9]+)*:[A-Za-z0-9._~-]+$/;
const SYNTHETIC_EVIDENCE_URL_PATTERN =
  /^https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*\.invalid(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*\/?$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS = [
  "not_a_nation_relationship",
  "not_a_legal_applicability_determination",
  "not_a_rights_impact_determination",
  "not_a_jurisdiction_determination",
  "not_comprehensive_coverage",
  "not_a_community_position",
] as const satisfies RequiredCommunityRelevanceNonClaims;

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
type JsonObject = Record<string, unknown>;

interface SourceRegistryProjectionView {
  readonly sources: readonly {
    readonly id: string;
    readonly synthetic: boolean;
  }[];
}

interface TaxonomyProjectionView {
  readonly taxonomyVersion: string;
  readonly categories: readonly {
    readonly id: string;
    readonly subcategories: readonly { readonly id: string }[];
  }[];
}

const sourceRegistry = sourceRegistryJson as SourceRegistryProjectionView;
const taxonomy = taxonomyJson as TaxonomyProjectionView;
const knownSources = new Map(
  sourceRegistry.sources.map((source) => [source.id, source]),
);
const knownTaxonomyIds = new Set(
  taxonomy.categories.flatMap((category) => [
    category.id,
    ...category.subcategories.map((subcategory) => subcategory.id),
  ]),
);

export class ProjectionValidationError extends TypeError {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string, detail: string) {
    super(`${code} at ${path}: ${detail}`);
    this.name = "ProjectionValidationError";
    this.code = code;
    this.path = path;
  }
}

function fail(code: string, path: string, detail: string): never {
  throw new ProjectionValidationError(code, path, detail);
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
    if (
      !Number.isFinite(value) ||
      (Number.isInteger(value) && !Number.isSafeInteger(value))
    ) {
      fail("INVALID_JSON", path, "number is not a finite safe JSON number");
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
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        fail("INVALID_JSON", path, "expected a plain array");
      }
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          fail(
            "INVALID_JSON",
            `${path}/${index}`,
            "sparse arrays are not accepted",
          );
        }
        const descriptor = Object.getOwnPropertyDescriptor(
          value,
          String(index),
        );
        if (
          descriptor === undefined ||
          !("value" in descriptor) ||
          !descriptor.enumerable
        ) {
          fail(
            "INVALID_JSON",
            `${path}/${index}`,
            "expected an enumerable data value",
          );
        }
        assertPlainJsonInternal(
          descriptor.value,
          `${path}/${index}`,
          ancestors,
        );
      }
      for (const key of Reflect.ownKeys(value)) {
        if (typeof key !== "string") {
          fail("INVALID_JSON", path, "symbol properties are not accepted");
        }
        if (key !== "length" && !/^(?:0|[1-9]\d*)$/.test(key)) {
          fail(
            "INVALID_JSON",
            `${path}/${key}`,
            "array has a non-index property",
          );
        }
      }
      return;
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      fail("INVALID_JSON", path, "expected a plain object");
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        fail("INVALID_JSON", path, "symbol properties are not accepted");
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        !descriptor.enumerable
      ) {
        fail(
          "INVALID_JSON",
          `${path}/${key}`,
          "expected an enumerable data value",
        );
      }
      assertPlainJsonInternal(descriptor.value, `${path}/${key}`, ancestors);
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
  requiredKeys: readonly string[],
): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_SHAPE", path, "expected an object");
  }
  const object = value as JsonObject;
  const actualKeys = Object.keys(object).sort();
  const expectedKeys = [...requiredKeys].sort();
  const missing = expectedKeys.filter((key) => !Object.hasOwn(object, key));
  const unexpected = actualKeys.filter((key) => !expectedKeys.includes(key));
  if (missing.length > 0) {
    fail("INVALID_SHAPE", path, `missing required field ${missing[0]}`);
  }
  if (unexpected.length > 0) {
    fail("INVALID_SHAPE", path, `unexpected field ${unexpected[0]}`);
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
    fail(
      "INVALID_SHAPE",
      path,
      `expected between ${minimum} and ${maximum} entries`,
    );
  }
  return value;
}

function expectString(
  value: unknown,
  path: string,
  pattern: RegExp,
  label: string,
  maximum = 512,
  minimum = 1,
): string {
  if (
    typeof value !== "string" ||
    value.length < minimum ||
    value.length > maximum ||
    !pattern.test(value)
  ) {
    fail("INVALID_SHAPE", path, `expected ${label}`);
  }
  return value;
}

function expectStableId(value: unknown, path: string): string {
  return expectString(
    value,
    path,
    STABLE_ID_PATTERN,
    "a stable lowercase ID",
    96,
    3,
  );
}

function expectVersion(value: unknown, path: string): string {
  return expectString(
    value,
    path,
    SEMANTIC_VERSION_PATTERN,
    "a semantic version",
    64,
  );
}

function expectRecordId(value: unknown, path: string): string {
  return expectString(
    value,
    path,
    RECORD_ID_PATTERN,
    "a stable PolicyRecord ID",
    256,
  );
}

function expectEvidenceUrl(value: unknown, path: string): string {
  const url = expectString(
    value,
    path,
    SYNTHETIC_EVIDENCE_URL_PATTERN,
    "an HTTPS .invalid synthetic evidence URL",
  );
  if (/\s/.test(url)) {
    fail(
      "INVALID_SHAPE",
      path,
      "synthetic evidence URLs cannot contain whitespace",
    );
  }
  if (/%(?![0-9A-Fa-f]{2})/.test(url)) {
    fail(
      "INVALID_SHAPE",
      path,
      "synthetic evidence URLs require valid percent encoding",
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
      fail("INVALID_SHAPE", path, "expected an HTTPS .invalid evidence URL");
    }
  } catch (error) {
    if (error instanceof ProjectionValidationError) {
      throw error;
    }
    fail("INVALID_SHAPE", path, "expected a valid synthetic evidence URL");
  }
  return url;
}

function expectLiteral<T extends string | boolean>(
  value: unknown,
  expected: T,
  path: string,
): T {
  if (value !== expected) {
    fail("INVALID_SHAPE", path, `expected ${JSON.stringify(expected)}`);
  }
  return expected;
}

function expectEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail("INVALID_SHAPE", path, `expected one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function expectIsoDate(value: unknown, path: string): string {
  if (typeof value !== "string") {
    fail("INVALID_SHAPE", path, "expected an ISO date");
  }
  const match = DATE_PATTERN.exec(value);
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

function compareVersioned(
  left: VersionedReference,
  right: VersionedReference,
): number {
  return compareText(
    `${left.id}\u0000${left.version}`,
    `${right.id}\u0000${right.version}`,
  );
}

function assertUniqueStrings(values: readonly string[], path: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      fail("DUPLICATE_REFERENCE", path, `duplicate value ${value}`);
    }
    seen.add(value);
  }
}

function assertUniqueIds(
  values: readonly { readonly id: string }[],
  path: string,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) {
      fail("DUPLICATE_ID", path, `duplicate stable ID ${value.id}`);
    }
    seen.add(value.id);
  }
}

function parseStringSet(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
  parser: (entry: unknown, entryPath: string) => string,
): readonly string[] {
  const array = expectArray(value, path, minimum, maximum);
  const parsed = array.map((entry, index) => parser(entry, `${path}/${index}`));
  assertUniqueStrings(parsed, path);
  return parsed.sort(compareText);
}

function parseVersionedReference(
  value: unknown,
  path: string,
): VersionedReference {
  const object = expectObject(value, path, ["id", "version"]);
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
  };
}

function parseVersionedReferenceSet(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): readonly VersionedReference[] {
  const parsed = expectArray(value, path, minimum, maximum).map(
    (entry, index) => parseVersionedReference(entry, `${path}/${index}`),
  );
  assertUniqueIds(parsed, path);
  return parsed.sort(compareVersioned);
}

function parseAuthorityState(
  value: unknown,
  path: string,
): ProjectionAuthorityState {
  return expectEnum(value, ["synthetic_demo", "candidate"], path);
}

function parseTemporalScope(
  value: unknown,
  path: string,
): ProjectionTemporalScope {
  const object = expectObject(value, path, ["kind", "from", "through"]);
  const from = expectIsoDate(object.from, `${path}/from`);
  const through =
    object.through === null
      ? null
      : expectIsoDate(object.through, `${path}/through`);
  if (through !== null && through < from) {
    fail("INVALID_TEMPORAL_SCOPE", path, "through must not precede from");
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
  const array = expectArray(
    value,
    path,
    REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS.length,
    REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS.length,
  );
  for (
    let index = 0;
    index < REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS.length;
    index += 1
  ) {
    if (array[index] !== REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS[index]) {
      fail(
        "INVALID_NONCLAIMS",
        `${path}/${index}`,
        `expected ${REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS[index]}`,
      );
    }
  }
  return [...REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS];
}

function parseRegionPack(value: unknown, path: string): RegionPack {
  const object = expectObject(value, path, [
    "id",
    "version",
    "sourceIds",
    "taxonomy",
    "jurisdictionReferences",
  ]);
  const taxonomyObject = expectObject(object.taxonomy, `${path}/taxonomy`, [
    "version",
    "taxonomyIds",
  ]);
  const jurisdictionReferences = expectArray(
    object.jurisdictionReferences,
    `${path}/jurisdictionReferences`,
    1,
    64,
  ).map((entry, index) => {
    const entryPath = `${path}/jurisdictionReferences/${index}`;
    const jurisdiction = expectObject(entry, entryPath, [
      "id",
      "version",
      "synthetic",
      "authorityState",
      "assertingAuthorityRef",
      "evidenceUrl",
    ]);
    return {
      id: expectStableId(jurisdiction.id, `${entryPath}/id`),
      version: expectVersion(jurisdiction.version, `${entryPath}/version`),
      synthetic: expectLiteral(
        jurisdiction.synthetic,
        true,
        `${entryPath}/synthetic`,
      ),
      authorityState: parseAuthorityState(
        jurisdiction.authorityState,
        `${entryPath}/authorityState`,
      ),
      assertingAuthorityRef: parseVersionedReference(
        jurisdiction.assertingAuthorityRef,
        `${entryPath}/assertingAuthorityRef`,
      ),
      evidenceUrl: expectEvidenceUrl(
        jurisdiction.evidenceUrl,
        `${entryPath}/evidenceUrl`,
      ),
    } as const;
  });
  assertUniqueIds(jurisdictionReferences, `${path}/jurisdictionReferences`);
  jurisdictionReferences.sort(compareVersioned);

  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    sourceIds: parseStringSet(
      object.sourceIds,
      `${path}/sourceIds`,
      1,
      64,
      expectStableId,
    ),
    taxonomy: {
      version: expectVersion(
        taxonomyObject.version,
        `${path}/taxonomy/version`,
      ),
      taxonomyIds: parseStringSet(
        taxonomyObject.taxonomyIds,
        `${path}/taxonomy/taxonomyIds`,
        1,
        128,
        expectStableId,
      ),
    },
    jurisdictionReferences,
  };
}

function parseWatchRule(value: unknown, path: string): ProjectionWatchRule {
  const object = expectObject(value, path, [
    "id",
    "version",
    "regionPackRef",
    "recordIds",
    "basis",
    "evidenceField",
    "evidenceUrl",
    "reviewState",
    "temporalScope",
    "nonClaims",
  ]);
  const basis = expectEnum<CommunityRelevanceBasis>(
    object.basis,
    [
      "configured_source_scope",
      "configured_taxonomy_scope",
      "configured_general_jurisdiction_scope",
    ],
    `${path}/basis`,
  );
  const evidenceField = expectEnum(
    object.evidenceField,
    [
      "/source/id",
      "/taxonomyMemberships",
      "/jurisdiction/generalJurisdictionOnly",
    ] as const,
    `${path}/evidenceField`,
  );
  const expectedEvidenceField = {
    configured_source_scope: "/source/id",
    configured_taxonomy_scope: "/taxonomyMemberships",
    configured_general_jurisdiction_scope:
      "/jurisdiction/generalJurisdictionOnly",
  }[basis];
  if (evidenceField !== expectedEvidenceField) {
    fail(
      "INVALID_REASON",
      `${path}/evidenceField`,
      `${basis} requires ${expectedEvidenceField}`,
    );
  }
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    regionPackRef: parseVersionedReference(
      object.regionPackRef,
      `${path}/regionPackRef`,
    ),
    recordIds: parseStringSet(
      object.recordIds,
      `${path}/recordIds`,
      1,
      256,
      expectRecordId,
    ),
    basis,
    evidenceField,
    evidenceUrl: expectEvidenceUrl(object.evidenceUrl, `${path}/evidenceUrl`),
    reviewState: expectEnum<CommunityRelevanceReviewState>(
      object.reviewState,
      ["synthetic_reviewed", "candidate_pending"],
      `${path}/reviewState`,
    ),
    temporalScope: parseTemporalScope(
      object.temporalScope,
      `${path}/temporalScope`,
    ),
    nonClaims: parseNonClaims(object.nonClaims, `${path}/nonClaims`),
  };
}

function parseDeploymentProfile(
  value: unknown,
  path: string,
): CommunityDeploymentProfile {
  const object = expectObject(value, path, [
    "id",
    "version",
    "authorityState",
    "regionPackRef",
    "watchRuleRefs",
  ]);
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    authorityState: parseAuthorityState(
      object.authorityState,
      `${path}/authorityState`,
    ),
    regionPackRef: parseVersionedReference(
      object.regionPackRef,
      `${path}/regionPackRef`,
    ),
    watchRuleRefs: parseVersionedReferenceSet(
      object.watchRuleRefs,
      `${path}/watchRuleRefs`,
      1,
      128,
    ),
  };
}

function parsePersonaProjection(
  value: unknown,
  path: string,
): PersonaProjection {
  const object = expectObject(value, path, [
    "id",
    "version",
    "deploymentProfileRef",
    "visibility",
    "outputAdapterRefs",
  ]);
  return {
    id: expectStableId(object.id, `${path}/id`),
    version: expectVersion(object.version, `${path}/version`),
    deploymentProfileRef: parseVersionedReference(
      object.deploymentProfileRef,
      `${path}/deploymentProfileRef`,
    ),
    visibility: expectLiteral(
      object.visibility,
      "public",
      `${path}/visibility`,
    ),
    outputAdapterRefs: parseVersionedReferenceSet(
      object.outputAdapterRefs,
      `${path}/outputAdapterRefs`,
      1,
      32,
    ),
  };
}

function referenceKey(reference: VersionedReference): string {
  return `${reference.id}@${reference.version}`;
}

function sameReference(
  left: VersionedReference,
  right: VersionedReference,
): boolean {
  return left.id === right.id && left.version === right.version;
}

function resolveReference<T extends VersionedReference>(
  references: ReadonlyMap<string, T>,
  reference: VersionedReference,
  path: string,
  label: string,
): T {
  const resolved = references.get(reference.id);
  if (resolved === undefined || resolved.version !== reference.version) {
    fail(
      "UNKNOWN_REFERENCE",
      path,
      `unknown ${label} ${referenceKey(reference)}`,
    );
  }
  return resolved;
}

function validateBundleGraph(bundle: ProjectionProfileBundle): void {
  const authorities = new Map(
    bundle.authorityReferences.map((authority) => [authority.id, authority]),
  );
  const regions = new Map(
    bundle.regionPacks.map((region) => [region.id, region]),
  );
  const rules = new Map(bundle.watchRules.map((rule) => [rule.id, rule]));
  const deployments = new Map(
    bundle.deploymentProfiles.map((deployment) => [deployment.id, deployment]),
  );
  const outputs = new Map(
    bundle.outputAdapters.map((output) => [output.id, output]),
  );

  for (const [index, region] of bundle.regionPacks.entries()) {
    for (const sourceId of region.sourceIds) {
      const source = knownSources.get(sourceId);
      if (source === undefined || source.synthetic !== true) {
        fail(
          "UNKNOWN_SOURCE",
          `/regionPacks/${index}/sourceIds`,
          `source ${sourceId} is not a known synthetic registry source`,
        );
      }
    }
    if (region.taxonomy.version !== taxonomy.taxonomyVersion) {
      fail(
        "UNKNOWN_TAXONOMY",
        `/regionPacks/${index}/taxonomy/version`,
        `unknown taxonomy version ${region.taxonomy.version}`,
      );
    }
    for (const taxonomyId of region.taxonomy.taxonomyIds) {
      if (!knownTaxonomyIds.has(taxonomyId)) {
        fail(
          "UNKNOWN_TAXONOMY",
          `/regionPacks/${index}/taxonomy/taxonomyIds`,
          `unknown taxonomy ID ${taxonomyId}`,
        );
      }
    }
    for (const [
      jurisdictionIndex,
      jurisdiction,
    ] of region.jurisdictionReferences.entries()) {
      resolveReference(
        authorities,
        jurisdiction.assertingAuthorityRef,
        `/regionPacks/${index}/jurisdictionReferences/${jurisdictionIndex}/assertingAuthorityRef`,
        "asserting authority",
      );
    }
  }

  for (const [index, rule] of bundle.watchRules.entries()) {
    resolveReference(
      regions,
      rule.regionPackRef,
      `/watchRules/${index}/regionPackRef`,
      "region pack",
    );
  }

  for (const [index, deployment] of bundle.deploymentProfiles.entries()) {
    const region = resolveReference(
      regions,
      deployment.regionPackRef,
      `/deploymentProfiles/${index}/regionPackRef`,
      "region pack",
    );
    for (const [ruleIndex, ruleRef] of deployment.watchRuleRefs.entries()) {
      const rule = resolveReference(
        rules,
        ruleRef,
        `/deploymentProfiles/${index}/watchRuleRefs/${ruleIndex}`,
        "watch rule",
      );
      if (!sameReference(rule.regionPackRef, region)) {
        fail(
          "CROSS_PROFILE_REFERENCE",
          `/deploymentProfiles/${index}/watchRuleRefs/${ruleIndex}`,
          `watch rule ${referenceKey(ruleRef)} belongs to a different region pack`,
        );
      }
      const expectedReviewState =
        deployment.authorityState === "synthetic_demo"
          ? "synthetic_reviewed"
          : "candidate_pending";
      if (rule.reviewState !== expectedReviewState) {
        fail(
          "CROSS_PROFILE_REFERENCE",
          `/deploymentProfiles/${index}/watchRuleRefs/${ruleIndex}`,
          `${deployment.authorityState} requires ${expectedReviewState}`,
        );
      }
    }
  }

  for (const [index, persona] of bundle.personaProjections.entries()) {
    resolveReference(
      deployments,
      persona.deploymentProfileRef,
      `/personaProjections/${index}/deploymentProfileRef`,
      "deployment profile",
    );
    for (const [
      outputIndex,
      outputRef,
    ] of persona.outputAdapterRefs.entries()) {
      resolveReference(
        outputs,
        outputRef,
        `/personaProjections/${index}/outputAdapterRefs/${outputIndex}`,
        "output adapter",
      );
    }
  }
}

export function parseProjectionProfileBundle(
  value: unknown,
): ProjectionProfileBundle {
  assertPlainJson(value, "$profile");
  const object = expectObject(value, "$profile", [
    "$schema",
    "schemaVersion",
    "id",
    "version",
    "synthetic",
    "authorityReferences",
    "outputAdapters",
    "regionPacks",
    "watchRules",
    "deploymentProfiles",
    "personaProjections",
  ]);
  const authorityReferences = parseVersionedReferenceSet(
    object.authorityReferences,
    "/authorityReferences",
    1,
    64,
  );
  const outputAdapters = parseVersionedReferenceSet(
    object.outputAdapters,
    "/outputAdapters",
    1,
    32,
  );
  const regionPacks = expectArray(
    object.regionPacks,
    "/regionPacks",
    1,
    32,
  ).map((entry, index) => parseRegionPack(entry, `/regionPacks/${index}`));
  const watchRules = expectArray(object.watchRules, "/watchRules", 1, 128).map(
    (entry, index) => parseWatchRule(entry, `/watchRules/${index}`),
  );
  const deploymentProfiles = expectArray(
    object.deploymentProfiles,
    "/deploymentProfiles",
    1,
    64,
  ).map((entry, index) =>
    parseDeploymentProfile(entry, `/deploymentProfiles/${index}`),
  );
  const personaProjections = expectArray(
    object.personaProjections,
    "/personaProjections",
    1,
    128,
  ).map((entry, index) =>
    parsePersonaProjection(entry, `/personaProjections/${index}`),
  );

  assertUniqueIds(regionPacks, "/regionPacks");
  assertUniqueIds(watchRules, "/watchRules");
  assertUniqueIds(deploymentProfiles, "/deploymentProfiles");
  assertUniqueIds(personaProjections, "/personaProjections");
  assertUniqueIds(
    regionPacks.flatMap((region) => region.jurisdictionReferences),
    "/regionPacks/*/jurisdictionReferences",
  );
  assertUniqueIds(
    [
      { id: expectStableId(object.id, "/id") },
      ...authorityReferences,
      ...outputAdapters,
      ...regionPacks,
      ...regionPacks.flatMap((region) => region.jurisdictionReferences),
      ...watchRules,
      ...deploymentProfiles,
      ...personaProjections,
    ],
    "$profile/stableIds",
  );

  regionPacks.sort(compareVersioned);
  watchRules.sort(compareVersioned);
  deploymentProfiles.sort(compareVersioned);
  personaProjections.sort(compareVersioned);

  const bundle: ProjectionProfileBundle = {
    $schema: expectLiteral(object.$schema, PROFILE_SCHEMA_ID, "/$schema"),
    schemaVersion: expectLiteral(
      object.schemaVersion,
      PROJECTION_PROFILE_SCHEMA_VERSION,
      "/schemaVersion",
    ),
    id: expectStableId(object.id, "/id"),
    version: expectVersion(object.version, "/version"),
    synthetic: expectLiteral(object.synthetic, true, "/synthetic"),
    authorityReferences,
    outputAdapters,
    regionPacks,
    watchRules,
    deploymentProfiles,
    personaProjections,
  };
  validateBundleGraph(bundle);
  deepFreeze(bundle);
  return bundle;
}

interface RecordProjectionView {
  readonly record: PolicyRecord;
  readonly internalId: string;
  readonly sourceId: string;
}

function validateProjectionRecords(
  records: readonly PolicyRecord[],
): readonly RecordProjectionView[] {
  if (!Array.isArray(records)) {
    fail(
      "INVALID_RECORD",
      "$records",
      "expected an array of validated PolicyRecord values",
    );
  }
  assertPlainJson(records, "$records");
  const views = records.map((record, index) => {
    const path = `$records/${index}`;
    const object = record as unknown as JsonObject;
    if (object.schemaVersion !== "1.4.0") {
      fail(
        "INVALID_RECORD",
        `${path}/schemaVersion`,
        "expected PolicyRecord 1.4.0",
      );
    }
    const internalId = expectRecordId(object.internalId, `${path}/internalId`);
    if (
      object.source === null ||
      typeof object.source !== "object" ||
      Array.isArray(object.source)
    ) {
      fail(
        "INVALID_RECORD",
        `${path}/source`,
        "expected a record source object",
      );
    }
    const sourceId = expectStableId(
      (object.source as JsonObject).id,
      `${path}/source/id`,
    );
    const source = knownSources.get(sourceId);
    if (source === undefined || source.synthetic !== true) {
      fail(
        "INVALID_RECORD",
        `${path}/source/id`,
        `source ${sourceId} is not a known synthetic registry source`,
      );
    }
    return { record, internalId, sourceId };
  });
  assertUniqueIds(
    views.map((view) => ({ id: view.internalId })),
    "$records",
  );
  return views.sort((left, right) =>
    compareText(left.internalId, right.internalId),
  );
}

function recordSupportsRule(
  record: PolicyRecord,
  rule: ProjectionWatchRule,
  region: RegionPack,
  path: string,
): void {
  if (!region.sourceIds.includes(record.source.id)) {
    fail(
      "RECORD_OUTSIDE_REGION",
      path,
      `record source ${record.source.id} is not included by region ${region.id}`,
    );
  }
  if (rule.basis === "configured_source_scope") {
    return;
  }
  if (rule.basis === "configured_general_jurisdiction_scope") {
    if (record.jurisdiction.generalJurisdictionOnly !== true) {
      fail(
        "UNSUPPORTED_RELEVANCE",
        path,
        "record lacks explicit general-jurisdiction evidence",
      );
    }
    return;
  }
  const matchesTaxonomy = record.taxonomyMemberships.some(
    (membership) =>
      membership.taxonomyVersion === region.taxonomy.version &&
      (region.taxonomy.taxonomyIds.includes(membership.categoryId) ||
        (membership.subcategoryId !== null &&
          region.taxonomy.taxonomyIds.includes(membership.subcategoryId))),
  );
  if (!matchesTaxonomy) {
    fail(
      "UNSUPPORTED_RELEVANCE",
      path,
      "record lacks an exact configured taxonomy membership",
    );
  }
}

function validateRuleTargets(
  bundle: ProjectionProfileBundle,
  recordMap: ReadonlyMap<string, RecordProjectionView>,
): void {
  const regionMap = new Map(
    bundle.regionPacks.map((region) => [region.id, region]),
  );
  for (const [ruleIndex, rule] of bundle.watchRules.entries()) {
    const region = resolveReference(
      regionMap,
      rule.regionPackRef,
      `/watchRules/${ruleIndex}/regionPackRef`,
      "region pack",
    );
    for (const [recordIndex, recordId] of rule.recordIds.entries()) {
      const target = recordMap.get(recordId);
      const path = `/watchRules/${ruleIndex}/recordIds/${recordIndex}`;
      if (target === undefined) {
        fail("UNKNOWN_RECORD", path, `unknown input record ${recordId}`);
      }
      recordSupportsRule(target.record, rule, region, path);
    }
  }
}

function relevanceAssertion(
  recordId: string,
  deployment: CommunityDeploymentProfile,
  rule: ProjectionWatchRule,
): CommunityRelevanceAssertion {
  return {
    basis: rule.basis,
    ruleRef: { id: rule.id, version: rule.version },
    configurationRef: { id: deployment.id, version: deployment.version },
    evidenceReference: {
      kind: "policy_record_field",
      recordId,
      field: rule.evidenceField,
      configurationEvidenceUrl: rule.evidenceUrl,
    },
    reviewState: rule.reviewState,
    temporalScope: { ...rule.temporalScope },
    nonClaims: [...rule.nonClaims],
  };
}

function buildViews(
  bundle: ProjectionProfileBundle,
): readonly DeploymentView[] {
  const deployments = new Map(
    bundle.deploymentProfiles.map((deployment) => [deployment.id, deployment]),
  );
  const rules = new Map(bundle.watchRules.map((rule) => [rule.id, rule]));
  return bundle.personaProjections.map((persona) => {
    const deployment = resolveReference(
      deployments,
      persona.deploymentProfileRef,
      `/personaProjections/${persona.id}/deploymentProfileRef`,
      "deployment profile",
    );
    const reasonsByRecord = new Map<string, CommunityRelevanceAssertion[]>();
    for (const ruleRef of deployment.watchRuleRefs) {
      const rule = resolveReference(
        rules,
        ruleRef,
        `/deploymentProfiles/${deployment.id}/watchRuleRefs`,
        "watch rule",
      );
      for (const recordId of rule.recordIds) {
        const reasons = reasonsByRecord.get(recordId) ?? [];
        reasons.push(relevanceAssertion(recordId, deployment, rule));
        reasonsByRecord.set(recordId, reasons);
      }
    }
    return {
      id: persona.id,
      version: persona.version,
      deploymentProfileRef: {
        id: deployment.id,
        version: deployment.version,
      },
      personaProjectionRef: { id: persona.id, version: persona.version },
      outputAdapterRefs: persona.outputAdapterRefs.map((reference) => ({
        ...reference,
      })),
      recordReferences: [...reasonsByRecord.entries()]
        .sort(([left], [right]) => compareText(left, right))
        .map(([recordId, reasons]) => ({
          recordId,
          reasons: reasons.sort((left, right) =>
            compareVersioned(left.ruleRef, right.ruleRef),
          ),
        })),
    };
  });
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

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}

function canonicalClone<T>(value: T): DeepReadonly<T> {
  assertPlainJson(value, "$projection");
  return deepFreeze(JSON.parse(encodeCanonical(value)) as T);
}

export function createEngineProjection(
  records: readonly PolicyRecord[],
  profileBundle: unknown,
): EngineProjection {
  const bundle = parseProjectionProfileBundle(profileBundle);
  const recordViews = validateProjectionRecords(records);
  const recordMap = new Map(
    recordViews.map((record) => [record.internalId, record]),
  );
  validateRuleTargets(bundle, recordMap);

  const projection = {
    schemaVersion: PROJECTION_PROFILE_SCHEMA_VERSION,
    profileBundleRef: { id: bundle.id, version: bundle.version },
    records: recordViews.map((record) => record.record),
    views: buildViews(bundle),
  } satisfies EngineProjection;
  return canonicalClone(projection) as EngineProjection;
}

export function serializeEngineProjection(
  projection: EngineProjection,
): string {
  assertPlainJson(projection, "$projection");
  return encodeCanonical(projection);
}
