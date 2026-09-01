import {
  canonicalJsonDigest,
  createSourceFact,
  validateEvidenceReferences,
  validateEvidenceState,
  validateSourceFact,
  type FactReference,
  type JsonValue,
  type SourceFact,
  type SupportedEvidence,
} from "../../kernel/assertions/index";

import {
  S0_ADAPTER_ID,
  S0_ADAPTER_VERSION,
  S0_ATTRIBUTION,
  S0_CONTRACT_VERSION,
  S0_EVIDENCE_BASIS,
  S0_EXPERIMENTAL,
  S0_FIXTURE_CLASS,
  S0_JURISDICTION_DERIVATION,
  S0_JURISDICTION_EVIDENCE_ID_PATTERN,
  S0_MARKERS,
  S0_MAX_JURISDICTION_EVIDENCE,
  S0_REVIEW_STATE,
  S0_SOURCE_ID,
  S0_SOURCE_LABEL,
  S0_SYNTHETIC,
  S0_SYNTHETIC_LEVEL,
  S0_USAGE_BASIS,
} from "./constants";
import type {
  ImmutableJurisdictionEvidence,
  JurisdictionEvidence,
  JurisdictionEvidenceFactManifest,
  JurisdictionEvidenceInput,
} from "./types";
import {
  assertS0JsonValue,
  assertSortedUniqueIds,
  exactKeys,
  exactString,
  exactText,
  fail,
  immutableClone,
  jsonEqual,
  makeAdministrativeUnitId,
  makeFeatureId,
  makeJurisdictionStatement,
  makeProvenance,
  makeSentinelSourceUrl,
  makeSourceIdentity,
  objectValue,
  sortByStableId,
  validateFixtureSlug,
  validateS0Markers,
  validateS0SourceIdentity,
  validateSha256,
  validateYear3785DateTime,
} from "./validation";

const JURISDICTION_EVIDENCE_KEYS = [
  "contractVersion",
  "experimental",
  "synthetic",
  "fixtureClass",
  "jurisdictionEvidenceId",
  "fixtureSlug",
  "sourceIdentity",
  "featureId",
  "administrativeUnitId",
  "sourceLabel",
  "statement",
  "statementDigest",
  "syntheticLevel",
  "evidenceBasis",
  "derivation",
  "reviewState",
  "attribution",
  "usageBasis",
  "factManifest",
  "evidence",
] as const;

const JURISDICTION_EVIDENCE_INPUT_KEYS = [
  "fixtureSlug",
  "retrievedAt",
] as const;

const FACT_MANIFEST_KEYS = ["titleFact", "fragmentDigestFact"] as const;

const SOURCE_FACT_KEYS = [
  "contractVersion",
  "factId",
  "assertionClass",
  "sourceIdentity",
  "predicate",
  "value",
  "provenance",
  "factDigest",
] as const;

const PROVENANCE_KEYS = [
  "sourceIdentity",
  "sourceUrl",
  "sourcePath",
  "retrievedAt",
  "sourceUpdatedAt",
  "adapterId",
  "adapterVersion",
  "sourceContentDigest",
  "validationState",
] as const;

function validateJurisdictionEvidenceId(value: unknown, path: string): string {
  const identifier = exactText(value, path);
  if (!S0_JURISDICTION_EVIDENCE_ID_PATTERN.test(identifier)) {
    fail(path, "expected an exact S0 jurisdiction-evidence ID");
  }
  return identifier;
}

function statementFragment(fixtureSlug: string): JsonValue {
  const sourceIdentity = makeSourceIdentity(fixtureSlug);
  const featureId = makeFeatureId(fixtureSlug);
  const administrativeUnitId = makeAdministrativeUnitId(fixtureSlug);
  return {
    ...S0_MARKERS,
    fragmentClass: "jurisdiction_statement",
    fixtureSlug,
    sourceIdentity: {
      sourceId: sourceIdentity.sourceId,
      sourceRecordId: sourceIdentity.sourceRecordId,
    },
    featureId,
    administrativeUnitId,
    sourceLabel: S0_SOURCE_LABEL,
    statement: makeJurisdictionStatement(featureId, administrativeUnitId),
    syntheticLevel: S0_SYNTHETIC_LEVEL,
    evidenceBasis: S0_EVIDENCE_BASIS,
    derivation: S0_JURISDICTION_DERIVATION,
    reviewState: S0_REVIEW_STATE,
    attribution: S0_ATTRIBUTION,
    usageBasis: S0_USAGE_BASIS,
  };
}

function factReference(fact: SourceFact): FactReference {
  return { factId: fact.factId, factDigest: fact.factDigest };
}

function constructJurisdictionEvidence(
  fixtureSlug: string,
  retrievedAt: string,
): JurisdictionEvidence {
  const sourceIdentity = makeSourceIdentity(fixtureSlug);
  const featureId = makeFeatureId(fixtureSlug);
  const administrativeUnitId = makeAdministrativeUnitId(fixtureSlug);
  const statement = makeJurisdictionStatement(featureId, administrativeUnitId);
  const statementDigest = canonicalJsonDigest(statementFragment(fixtureSlug));
  const titleFact = createSourceFact({
    sourceIdentity,
    predicate: "instrument_title",
    value: { kind: "text", value: S0_SOURCE_LABEL },
    provenance: makeProvenance(
      fixtureSlug,
      "$.sourceLabel",
      retrievedAt,
      statementDigest,
    ),
  }) as SourceFact;
  const fragmentDigestFact = createSourceFact({
    sourceIdentity,
    predicate: "rendition_digest",
    value: { kind: "sha256_digest", value: statementDigest },
    provenance: makeProvenance(fixtureSlug, "$", retrievedAt, statementDigest),
  }) as SourceFact;
  const references = sortByStableId(
    [factReference(titleFact), factReference(fragmentDigestFact)],
    (reference) => reference.factId,
  );

  return {
    contractVersion: S0_CONTRACT_VERSION,
    experimental: S0_EXPERIMENTAL,
    synthetic: S0_SYNTHETIC,
    fixtureClass: S0_FIXTURE_CLASS,
    jurisdictionEvidenceId: `${S0_SOURCE_ID}:jurisdiction-evidence:${statementDigest}`,
    fixtureSlug,
    sourceIdentity,
    featureId,
    administrativeUnitId,
    sourceLabel: S0_SOURCE_LABEL,
    statement,
    statementDigest,
    syntheticLevel: S0_SYNTHETIC_LEVEL,
    evidenceBasis: S0_EVIDENCE_BASIS,
    derivation: S0_JURISDICTION_DERIVATION,
    reviewState: S0_REVIEW_STATE,
    attribution: S0_ATTRIBUTION,
    usageBasis: S0_USAGE_BASIS,
    factManifest: { titleFact, fragmentDigestFact },
    evidence: { state: "supported", factReferences: references },
  };
}

function inspectExactSourceIdentity(
  value: unknown,
  fixtureSlug: string,
  path: string,
): void {
  const identity = objectValue(value, path);
  exactKeys(identity, path, ["sourceId", "sourceRecordId"]);
  const expected = makeSourceIdentity(fixtureSlug);
  exactString(identity.sourceId, expected.sourceId, `${path}.sourceId`);
  exactString(
    identity.sourceRecordId,
    expected.sourceRecordId,
    `${path}.sourceRecordId`,
  );
}

function inspectFactShape(
  value: unknown,
  fixtureSlug: string,
  path: string,
): string {
  const fact = objectValue(value, path);
  exactKeys(fact, path, SOURCE_FACT_KEYS);
  exactString(
    fact.contractVersion,
    S0_CONTRACT_VERSION,
    `${path}.contractVersion`,
  );
  exactText(fact.factId, `${path}.factId`);
  exactString(fact.assertionClass, "source_fact", `${path}.assertionClass`);
  inspectExactSourceIdentity(
    fact.sourceIdentity,
    fixtureSlug,
    `${path}.sourceIdentity`,
  );
  exactText(fact.predicate, `${path}.predicate`);
  const typedValue = objectValue(fact.value, `${path}.value`);
  exactKeys(typedValue, `${path}.value`, ["kind", "value"]);
  exactText(typedValue.kind, `${path}.value.kind`);
  exactText(typedValue.value, `${path}.value.value`);

  const provenance = objectValue(fact.provenance, `${path}.provenance`);
  exactKeys(provenance, `${path}.provenance`, PROVENANCE_KEYS);
  inspectExactSourceIdentity(
    provenance.sourceIdentity,
    fixtureSlug,
    `${path}.provenance.sourceIdentity`,
  );
  exactString(
    provenance.sourceUrl,
    makeSentinelSourceUrl(fixtureSlug),
    `${path}.provenance.sourceUrl`,
  );
  exactText(provenance.sourcePath, `${path}.provenance.sourcePath`);
  const retrievedAt = validateYear3785DateTime(
    provenance.retrievedAt,
    `${path}.provenance.retrievedAt`,
  );
  if (provenance.sourceUpdatedAt !== null) {
    fail(`${path}.provenance.sourceUpdatedAt`, "expected null");
  }
  exactString(
    provenance.adapterId,
    S0_ADAPTER_ID,
    `${path}.provenance.adapterId`,
  );
  exactString(
    provenance.adapterVersion,
    S0_ADAPTER_VERSION,
    `${path}.provenance.adapterVersion`,
  );
  validateSha256(
    provenance.sourceContentDigest,
    `${path}.provenance.sourceContentDigest`,
  );
  exactString(
    provenance.validationState,
    "validated",
    `${path}.provenance.validationState`,
  );
  validateSha256(fact.factDigest, `${path}.factDigest`);
  return retrievedAt;
}

function inspectFactManifest(
  value: unknown,
  fixtureSlug: string,
  path: string,
): string {
  const manifest = objectValue(value, path);
  exactKeys(manifest, path, FACT_MANIFEST_KEYS);
  const retrievedAt = inspectFactShape(
    manifest.titleFact,
    fixtureSlug,
    `${path}.titleFact`,
  );
  inspectFactShape(
    manifest.fragmentDigestFact,
    fixtureSlug,
    `${path}.fragmentDigestFact`,
  );
  return retrievedAt;
}

function inspectEvidence(value: unknown, path: string): void {
  const evidence = objectValue(value, path);
  exactKeys(evidence, path, ["state", "factReferences"]);
  exactText(evidence.state, `${path}.state`);
  if (
    !Array.isArray(evidence.factReferences) ||
    evidence.factReferences.length !== 2
  ) {
    fail(`${path}.factReferences`, "expected exactly two fact references");
  }
  for (let index = 0; index < evidence.factReferences.length; index += 1) {
    const reference = objectValue(
      evidence.factReferences[index],
      `${path}.factReferences[${index}]`,
    );
    exactKeys(reference, `${path}.factReferences[${index}]`, [
      "factId",
      "factDigest",
    ]);
    exactText(reference.factId, `${path}.factReferences[${index}].factId`);
    validateSha256(
      reference.factDigest,
      `${path}.factReferences[${index}].factDigest`,
    );
  }
}

export function validateJurisdictionEvidence(
  value: unknown,
  path = "$",
): ImmutableJurisdictionEvidence {
  assertS0JsonValue(value);
  const object = objectValue(value, path);
  exactKeys(object, path, JURISDICTION_EVIDENCE_KEYS);
  validateS0Markers(object, path);
  const fixtureSlug = validateFixtureSlug(
    object.fixtureSlug,
    `${path}.fixtureSlug`,
  );
  const jurisdictionEvidenceId = validateJurisdictionEvidenceId(
    object.jurisdictionEvidenceId,
    `${path}.jurisdictionEvidenceId`,
  );
  const sourceIdentity = validateS0SourceIdentity(
    object.sourceIdentity,
    fixtureSlug,
    `${path}.sourceIdentity`,
  );
  const featureId = exactString(
    object.featureId,
    makeFeatureId(fixtureSlug),
    `${path}.featureId`,
  );
  const administrativeUnitId = exactString(
    object.administrativeUnitId,
    makeAdministrativeUnitId(fixtureSlug),
    `${path}.administrativeUnitId`,
  );
  const sourceLabel = exactString(
    object.sourceLabel,
    S0_SOURCE_LABEL,
    `${path}.sourceLabel`,
  );
  const statement = exactString(
    object.statement,
    makeJurisdictionStatement(featureId, administrativeUnitId),
    `${path}.statement`,
  );
  const statementDigest = validateSha256(
    object.statementDigest,
    `${path}.statementDigest`,
  );
  const syntheticLevel = exactString(
    object.syntheticLevel,
    S0_SYNTHETIC_LEVEL,
    `${path}.syntheticLevel`,
  );
  const evidenceBasis = exactString(
    object.evidenceBasis,
    S0_EVIDENCE_BASIS,
    `${path}.evidenceBasis`,
  );
  const derivation = exactString(
    object.derivation,
    S0_JURISDICTION_DERIVATION,
    `${path}.derivation`,
  );
  const reviewState = exactString(
    object.reviewState,
    S0_REVIEW_STATE,
    `${path}.reviewState`,
  );
  const attribution = exactString(
    object.attribution,
    S0_ATTRIBUTION,
    `${path}.attribution`,
  );
  const usageBasis = exactString(
    object.usageBasis,
    S0_USAGE_BASIS,
    `${path}.usageBasis`,
  );
  const retrievedAt = inspectFactManifest(
    object.factManifest,
    fixtureSlug,
    `${path}.factManifest`,
  );
  inspectEvidence(object.evidence, `${path}.evidence`);

  const expectedStatementDigest = canonicalJsonDigest(
    statementFragment(fixtureSlug),
  );
  if (statementDigest !== expectedStatementDigest) {
    fail(
      `${path}.statementDigest`,
      "does not match the exact jurisdiction statement fragment",
    );
  }
  const expectedEvidenceId = `${S0_SOURCE_ID}:jurisdiction-evidence:${expectedStatementDigest}`;
  if (jurisdictionEvidenceId !== expectedEvidenceId) {
    fail(
      `${path}.jurisdictionEvidenceId`,
      "does not match the statement digest identity",
    );
  }

  const manifest = objectValue(object.factManifest, `${path}.factManifest`);
  const facts: JurisdictionEvidenceFactManifest = {
    titleFact: validateSourceFact(
      manifest.titleFact,
      `${path}.factManifest.titleFact`,
    ) as SourceFact,
    fragmentDigestFact: validateSourceFact(
      manifest.fragmentDigestFact,
      `${path}.factManifest.fragmentDigestFact`,
    ) as SourceFact,
  };
  const evidence = validateEvidenceState(object.evidence, `${path}.evidence`);
  if (evidence.state !== "supported") {
    fail(`${path}.evidence`, "jurisdiction evidence must be supported");
  }
  validateEvidenceReferences(evidence, [
    facts.titleFact,
    facts.fragmentDigestFact,
  ]);

  const expected = constructJurisdictionEvidence(fixtureSlug, retrievedAt);
  if (!jsonEqual(facts, expected.factManifest)) {
    fail(
      `${path}.factManifest`,
      "facts do not match exact jurisdiction statement custody",
    );
  }
  if (!jsonEqual(evidence, expected.evidence)) {
    fail(
      `${path}.evidence`,
      "evidence must cite the exact two fact-ID-sorted references",
    );
  }

  const validated: JurisdictionEvidence = {
    contractVersion: S0_CONTRACT_VERSION,
    experimental: S0_EXPERIMENTAL,
    synthetic: S0_SYNTHETIC,
    fixtureClass: S0_FIXTURE_CLASS,
    jurisdictionEvidenceId,
    fixtureSlug,
    sourceIdentity: sourceIdentity as JurisdictionEvidence["sourceIdentity"],
    featureId,
    administrativeUnitId,
    sourceLabel,
    statement,
    statementDigest,
    syntheticLevel,
    evidenceBasis,
    derivation,
    reviewState,
    attribution,
    usageBasis,
    factManifest: facts,
    evidence: evidence as SupportedEvidence,
  };
  if (!jsonEqual(validated, expected)) {
    fail(path, "does not match the complete canonical jurisdiction replay");
  }
  return immutableClone(validated);
}

export function createJurisdictionEvidence(
  input: JurisdictionEvidenceInput,
): ImmutableJurisdictionEvidence {
  assertS0JsonValue(input);
  const object = objectValue(input, "$createJurisdictionEvidence");
  exactKeys(
    object,
    "$createJurisdictionEvidence",
    JURISDICTION_EVIDENCE_INPUT_KEYS,
  );
  const fixtureSlug = validateFixtureSlug(object.fixtureSlug, "$.fixtureSlug");
  const retrievedAt = validateYear3785DateTime(
    object.retrievedAt,
    "$.retrievedAt",
  );
  return validateJurisdictionEvidence(
    constructJurisdictionEvidence(fixtureSlug, retrievedAt),
  );
}

export function validateJurisdictionEvidenceCollection(
  value: unknown,
  path = "$",
): readonly ImmutableJurisdictionEvidence[] {
  assertS0JsonValue(value);
  if (!Array.isArray(value)) {
    fail(path, "expected a jurisdiction-evidence array");
  }
  if (value.length > S0_MAX_JURISDICTION_EVIDENCE) {
    fail(
      path,
      `expected no more than ${S0_MAX_JURISDICTION_EVIDENCE} jurisdiction-evidence entries`,
    );
  }
  const entries = value.map((entry, index) =>
    validateJurisdictionEvidence(entry, `${path}[${index}]`),
  );
  assertSortedUniqueIds(entries, (entry) => entry.jurisdictionEvidenceId, path);
  return immutableClone(entries);
}

export function createJurisdictionEvidenceCollection(
  entries: readonly ImmutableJurisdictionEvidence[],
): readonly ImmutableJurisdictionEvidence[] {
  assertS0JsonValue(entries);
  if (entries.length > S0_MAX_JURISDICTION_EVIDENCE) {
    fail(
      "$createJurisdictionEvidenceCollection",
      `expected no more than ${S0_MAX_JURISDICTION_EVIDENCE} jurisdiction-evidence entries`,
    );
  }
  const validated = entries.map((entry) => validateJurisdictionEvidence(entry));
  const sorted = sortByStableId(
    validated,
    (entry) => entry.jurisdictionEvidenceId,
  );
  assertSortedUniqueIds(
    sorted,
    (entry) => entry.jurisdictionEvidenceId,
    "$createJurisdictionEvidenceCollection",
  );
  return immutableClone(sorted);
}
