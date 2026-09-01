import {
  CANONICALIZATION_VERSION,
  canonicalJsonDigest,
  validateDerivedAssertion,
  validateEvidenceReferences,
  validateFactReference,
  validateSourceFact,
  type DeepReadonly,
  type DerivedAssertion,
  type FactReference,
  type JsonValue,
  type SourceFact,
} from "../../kernel/assertions/index";

import {
  S0_CONTRACT_VERSION,
  S0_INTERPRETATION,
  S0_MARKERS,
  S0_MAX_RELATIONS,
  S0_OBSERVATION_ID_PATTERN,
  S0_RELATION_ID_PATTERN,
  S0_SOURCE_ID,
  S0_TOPOLOGY_RULE_ID,
  S0_TOPOLOGY_RULE_VERSION,
  S0_UNIT,
  S0_UNKNOWN_REASON_ORDER,
} from "./constants";
import {
  createSpatialObservationCollection,
  normalizedBoundsForObservation,
  validateSpatialObservation,
  validateSpatialObservationCollection,
} from "./observation";
import {
  deriveSharedValidTime,
  inspectSharedValidTimeStructure,
  validateSharedValidTime,
} from "./temporal";
import { classifyTopologyWithTolerance } from "./topology";
import type {
  ImmutableSpatialObservation,
  ImmutableSpatialRelation,
  SharedValidTime,
  SpatialAlgorithm,
  SpatialObservationFactManifest,
  SpatialObservationReference,
  SpatialRelation,
  SpatialRelationKind,
  SpatialRelationOptions,
  SpatialRelationUncertainty,
  SpatialUnknownReason,
} from "./types";
import {
  assertS0JsonValue,
  assertSortedUniqueIds,
  compareUnicodeCodePoints,
  exactKeys,
  exactString,
  exactText,
  fail,
  immutableClone,
  jsonEqual,
  objectValue,
  sortByStableId,
  validateSha256,
  validateS0Markers,
  validateTolerance,
} from "./validation";

const RELATION_KEYS = [
  "contractVersion",
  "experimental",
  "synthetic",
  "fixtureClass",
  "relationId",
  "subject",
  "object",
  "relation",
  "sharedValidTime",
  "algorithm",
  "derivedAssertion",
  "uncertainty",
  "unknownReason",
  "interpretation",
] as const;

const OBSERVATION_REFERENCE_KEYS = [
  "observationId",
  "observationDigest",
  "geometryDigest",
] as const;

const ALGORITHM_KEYS = [
  "id",
  "version",
  "canonicalizationVersion",
  "tolerance",
  "unit",
] as const;

const DERIVED_ASSERTION_KEYS = [
  "contractVersion",
  "assertionId",
  "assertionClass",
  "inputFactIds",
  "inputFactDigests",
  "ruleId",
  "ruleVersion",
  "canonicalizationVersion",
  "resultDigest",
  "evidence",
  "validationState",
] as const;

const S0_SPATIAL_ASSERTION_ID_PATTERN = /^k0:spatial_relation:[a-f0-9]{64}$/;

interface ParsedRelation {
  relationId: string;
  subject: SpatialObservationReference;
  object: SpatialObservationReference;
  relation: SpatialRelationKind;
  sharedValidTime: DeepReadonly<SharedValidTime>;
  algorithm: SpatialAlgorithm;
  derivedAssertion: unknown;
  uncertainty: SpatialRelationUncertainty;
  unknownReason: SpatialUnknownReason | null;
}

interface FactInputs {
  facts: readonly SourceFact[];
  references: readonly FactReference[];
  inputFactIds: readonly string[];
  inputFactDigests: readonly string[];
}

function validateRelationId(value: unknown, path: string): string {
  const relationId = exactText(value, path);
  if (!S0_RELATION_ID_PATTERN.test(relationId)) {
    fail(path, "expected an exact S0 relation ID");
  }
  return relationId;
}

function validateObservationId(value: unknown, path: string): string {
  const observationId = exactText(value, path);
  if (!S0_OBSERVATION_ID_PATTERN.test(observationId)) {
    fail(path, "expected an exact S0 observation ID");
  }
  return observationId;
}

function validateObservationReference(
  value: unknown,
  path: string,
): SpatialObservationReference {
  const object = objectValue(value, path);
  exactKeys(object, path, OBSERVATION_REFERENCE_KEYS);
  return {
    observationId: validateObservationId(
      object.observationId,
      `${path}.observationId`,
    ),
    observationDigest: validateSha256(
      object.observationDigest,
      `${path}.observationDigest`,
    ),
    geometryDigest:
      object.geometryDigest === null
        ? null
        : validateSha256(object.geometryDigest, `${path}.geometryDigest`),
  };
}

function validateRelationKind(
  value: unknown,
  path: string,
): SpatialRelationKind {
  if (
    value !== "intersects" &&
    value !== "contains" &&
    value !== "within" &&
    value !== "touches" &&
    value !== "disjoint" &&
    value !== "unknown"
  ) {
    fail(path, "expected a frozen S0 spatial relation");
  }
  return value;
}

function validateUnknownReason(
  value: unknown,
  path: string,
): SpatialUnknownReason {
  if (
    typeof value !== "string" ||
    !(S0_UNKNOWN_REASON_ORDER as readonly string[]).includes(value)
  ) {
    fail(path, "expected a frozen S0 unknown reason");
  }
  return value as SpatialUnknownReason;
}

function validateUncertainty(
  value: unknown,
  path: string,
): SpatialRelationUncertainty {
  const object = objectValue(value, path);
  if (object.state === "certain") {
    exactKeys(object, path, ["state"]);
    return { state: "certain" };
  }
  exactKeys(object, path, ["state", "reason"]);
  exactString(object.state, "uncertain", `${path}.state`);
  return {
    state: "uncertain",
    reason: validateUnknownReason(object.reason, `${path}.reason`),
  };
}

function validateAlgorithm(value: unknown, path: string): SpatialAlgorithm {
  const object = objectValue(value, path);
  exactKeys(object, path, ALGORITHM_KEYS);
  return {
    id: exactString(object.id, S0_TOPOLOGY_RULE_ID, `${path}.id`),
    version: exactString(
      object.version,
      S0_TOPOLOGY_RULE_VERSION,
      `${path}.version`,
    ),
    canonicalizationVersion: exactString(
      object.canonicalizationVersion,
      CANONICALIZATION_VERSION,
      `${path}.canonicalizationVersion`,
    ),
    tolerance: validateTolerance(object.tolerance, `${path}.tolerance`),
    unit: exactString(object.unit, S0_UNIT, `${path}.unit`),
  };
}

function inspectDerivedAssertion(value: unknown, path: string): void {
  const object = objectValue(value, path);
  exactKeys(object, path, DERIVED_ASSERTION_KEYS);
  exactString(
    object.contractVersion,
    S0_CONTRACT_VERSION,
    `${path}.contractVersion`,
  );
  const assertionId = exactText(object.assertionId, `${path}.assertionId`);
  if (!S0_SPATIAL_ASSERTION_ID_PATTERN.test(assertionId)) {
    fail(
      `${path}.assertionId`,
      "expected an exact S0 K0 spatial-relation assertion ID",
    );
  }
  exactString(
    object.assertionClass,
    "spatial_relation",
    `${path}.assertionClass`,
  );
  if (!Array.isArray(object.inputFactIds) || object.inputFactIds.length !== 6) {
    fail(`${path}.inputFactIds`, "expected exactly six fact IDs");
  }
  if (
    !Array.isArray(object.inputFactDigests) ||
    object.inputFactDigests.length !== 6
  ) {
    fail(`${path}.inputFactDigests`, "expected exactly six fact digests");
  }
  for (let index = 0; index < 6; index += 1) {
    validateFactReference(
      {
        factId: object.inputFactIds[index],
        factDigest: object.inputFactDigests[index],
      },
      `${path}.inputFactPairs[${index}]`,
    );
  }
  exactString(object.ruleId, S0_TOPOLOGY_RULE_ID, `${path}.ruleId`);
  exactString(
    object.ruleVersion,
    S0_TOPOLOGY_RULE_VERSION,
    `${path}.ruleVersion`,
  );
  exactString(
    object.canonicalizationVersion,
    CANONICALIZATION_VERSION,
    `${path}.canonicalizationVersion`,
  );
  validateSha256(object.resultDigest, `${path}.resultDigest`);
  const evidence = objectValue(object.evidence, `${path}.evidence`);
  exactKeys(evidence, `${path}.evidence`, ["state", "factReferences"]);
  exactString(evidence.state, "supported", `${path}.evidence.state`);
  if (
    !Array.isArray(evidence.factReferences) ||
    evidence.factReferences.length !== 6
  ) {
    fail(
      `${path}.evidence.factReferences`,
      "expected exactly six fact references",
    );
  }
  for (let index = 0; index < evidence.factReferences.length; index += 1) {
    validateFactReference(
      evidence.factReferences[index],
      `${path}.evidence.factReferences[${index}]`,
    );
  }
  exactString(object.validationState, "validated", `${path}.validationState`);
}

function parseRelation(value: unknown, path: string): ParsedRelation {
  assertS0JsonValue(value);
  const object = objectValue(value, path);
  exactKeys(object, path, RELATION_KEYS);
  validateS0Markers(object, path);
  const relationId = validateRelationId(
    object.relationId,
    `${path}.relationId`,
  );
  const subject = validateObservationReference(
    object.subject,
    `${path}.subject`,
  );
  const relatedObject = validateObservationReference(
    object.object,
    `${path}.object`,
  );
  const relation = validateRelationKind(object.relation, `${path}.relation`);
  const sharedValidTime = inspectSharedValidTimeStructure(
    object.sharedValidTime,
    `${path}.sharedValidTime`,
  );
  const algorithm = validateAlgorithm(object.algorithm, `${path}.algorithm`);
  inspectDerivedAssertion(object.derivedAssertion, `${path}.derivedAssertion`);
  const uncertainty = validateUncertainty(
    object.uncertainty,
    `${path}.uncertainty`,
  );
  const unknownReason =
    object.unknownReason === null
      ? null
      : validateUnknownReason(object.unknownReason, `${path}.unknownReason`);
  exactString(
    object.interpretation,
    S0_INTERPRETATION,
    `${path}.interpretation`,
  );
  return {
    relationId,
    subject,
    object: relatedObject,
    relation,
    sharedValidTime,
    algorithm,
    derivedAssertion: object.derivedAssertion,
    uncertainty,
    unknownReason,
  };
}

function observationReference(
  observation: ImmutableSpatialObservation,
): SpatialObservationReference {
  return {
    observationId: observation.observationId,
    observationDigest: observation.observationDigest,
    geometryDigest: observation.geometryDigest,
  };
}

function relationIdentityPreimage(
  subject: SpatialObservationReference,
  object: SpatialObservationReference,
  algorithm: SpatialAlgorithm,
): JsonValue {
  return {
    contractVersion: S0_CONTRACT_VERSION,
    subject,
    object,
    algorithm,
  } as unknown as JsonValue;
}

function manifestFacts(
  manifest: DeepReadonly<SpatialObservationFactManifest>,
  path: string,
): readonly SourceFact[] {
  return [
    validateSourceFact(
      manifest.fragmentDigestFact,
      `${path}.fragmentDigestFact`,
    ) as SourceFact,
    validateSourceFact(
      manifest.observedTimeFact,
      `${path}.observedTimeFact`,
    ) as SourceFact,
    validateSourceFact(
      manifest.validTimeFact,
      `${path}.validTimeFact`,
    ) as SourceFact,
  ];
}

function relationFactInputs(
  subject: ImmutableSpatialObservation,
  object: ImmutableSpatialObservation,
): FactInputs {
  const facts = [
    ...manifestFacts(subject.factManifest, "$subject.factManifest"),
    ...manifestFacts(object.factManifest, "$object.factManifest"),
  ];
  const pairs = facts
    .map((fact) => ({
      factId: fact.factId,
      factDigest: fact.factDigest,
      fact,
    }))
    .sort((left, right) => compareUnicodeCodePoints(left.factId, right.factId));
  for (let index = 1; index < pairs.length; index += 1) {
    if (pairs[index - 1]!.factId === pairs[index]!.factId) {
      fail("$relationFacts", "input fact IDs must be unique");
    }
  }
  if (new Set(pairs.map((pair) => pair.factDigest)).size !== pairs.length) {
    fail("$relationFacts", "equal input fact digests are an invalid collision");
  }
  const references = pairs.map(({ factId, factDigest }) => ({
    factId,
    factDigest,
  }));
  return {
    facts: pairs.map((pair) => pair.fact),
    references,
    inputFactIds: references.map((reference) => reference.factId),
    inputFactDigests: references.map((reference) => reference.factDigest),
  };
}

function applicableUnknownReasons(
  subject: ImmutableSpatialObservation,
  object: ImmutableSpatialObservation,
  sharedValidTime: DeepReadonly<SharedValidTime>,
): readonly SpatialUnknownReason[] {
  const observations = [subject, object];
  const conditions: readonly [SpatialUnknownReason, boolean][] = [
    [
      "missing_geometry",
      observations.some(
        (observation) => observation.coverage === "missing_fixture_geometry",
      ),
    ],
    [
      "partial_coverage",
      observations.some(
        (observation) => observation.coverage === "partial_fixture_extent",
      ),
    ],
    [
      "unknown_coverage",
      observations.some((observation) => observation.coverage === "unknown"),
    ],
    [
      "observation_uncertain",
      observations.some(
        (observation) =>
          observation.coverage === "complete_fixture_extent" &&
          observation.uncertainty.state === "uncertain",
      ),
    ],
    ["resolution_mismatch", subject.resolution !== object.resolution],
    ["valid_time_mixed_precision", sharedValidTime.state === "indeterminate"],
    ["valid_time_disjoint", sharedValidTime.state === "disjoint"],
  ];
  return conditions
    .filter((condition) => condition[1])
    .map((condition) => condition[0]);
}

function relationOutcome(
  subject: ImmutableSpatialObservation,
  object: ImmutableSpatialObservation,
  sharedValidTime: DeepReadonly<SharedValidTime>,
  tolerance: number,
): {
  relation: SpatialRelationKind;
  uncertainty: SpatialRelationUncertainty;
  unknownReason: SpatialUnknownReason | null;
} {
  const earlierReasons = applicableUnknownReasons(
    subject,
    object,
    sharedValidTime,
  );
  const earlierReason = earlierReasons[0];
  if (earlierReason !== undefined) {
    return {
      relation: "unknown",
      uncertainty: { state: "uncertain", reason: earlierReason },
      unknownReason: earlierReason,
    };
  }

  const subjectBounds = normalizedBoundsForObservation(subject);
  const objectBounds = normalizedBoundsForObservation(object);
  if (subjectBounds === null || objectBounds === null) {
    fail("$relation", "eligible topology requires two present geometries");
  }
  const classification = classifyTopologyWithTolerance(
    subjectBounds,
    objectBounds,
    tolerance,
  );
  if (classification === "tolerance_ambiguity") {
    return {
      relation: "unknown",
      uncertainty: {
        state: "uncertain",
        reason: "tolerance_ambiguity",
      },
      unknownReason: "tolerance_ambiguity",
    };
  }
  return {
    relation: classification,
    uncertainty: { state: "certain" },
    unknownReason: null,
  };
}

function resultDigestPreimage(
  relation: Omit<SpatialRelation, "derivedAssertion"> & {
    derivedAssertion: Omit<DerivedAssertion, "resultDigest">;
  },
): JsonValue {
  return relation as unknown as JsonValue;
}

function assembleRelation(
  subjectReference: SpatialObservationReference,
  objectReference: SpatialObservationReference,
  algorithm: SpatialAlgorithm,
  relationIdentityDigest: string,
  sharedValidTime: DeepReadonly<SharedValidTime>,
  outcome: {
    relation: SpatialRelationKind;
    uncertainty: SpatialRelationUncertainty;
    unknownReason: SpatialUnknownReason | null;
  },
  factInputs: FactInputs,
): ImmutableSpatialRelation {
  const relationId = `${S0_SOURCE_ID}:relation:${relationIdentityDigest}`;
  const assertionWithoutDigest: Omit<DerivedAssertion, "resultDigest"> = {
    contractVersion: S0_CONTRACT_VERSION,
    assertionId: `k0:spatial_relation:${relationIdentityDigest}`,
    assertionClass: "spatial_relation",
    inputFactIds: factInputs.inputFactIds,
    inputFactDigests: factInputs.inputFactDigests,
    ruleId: S0_TOPOLOGY_RULE_ID,
    ruleVersion: S0_TOPOLOGY_RULE_VERSION,
    canonicalizationVersion: CANONICALIZATION_VERSION,
    evidence: {
      state: "supported",
      factReferences: factInputs.references,
    },
    validationState: "validated",
  };
  const relationWithoutResultDigest = {
    ...S0_MARKERS,
    relationId,
    subject: subjectReference,
    object: objectReference,
    relation: outcome.relation,
    sharedValidTime,
    algorithm,
    derivedAssertion: assertionWithoutDigest,
    uncertainty: outcome.uncertainty,
    unknownReason: outcome.unknownReason,
    interpretation: S0_INTERPRETATION,
  } as Omit<SpatialRelation, "derivedAssertion"> & {
    derivedAssertion: Omit<DerivedAssertion, "resultDigest">;
  };
  const resultDigest = canonicalJsonDigest(
    resultDigestPreimage(relationWithoutResultDigest),
  );
  const derivedAssertion = validateDerivedAssertion({
    ...assertionWithoutDigest,
    resultDigest,
  });
  validateEvidenceReferences(derivedAssertion.evidence, factInputs.facts);

  return immutableClone<SpatialRelation>({
    ...relationWithoutResultDigest,
    derivedAssertion: derivedAssertion as DerivedAssertion,
  });
}

function constructValidatedRelation(
  subject: ImmutableSpatialObservation,
  object: ImmutableSpatialObservation,
  tolerance: number,
): ImmutableSpatialRelation {
  if (subject.observationId === object.observationId) {
    fail(
      "$createSpatialRelation",
      "subject and object observations must differ",
    );
  }
  const subjectReference = observationReference(subject);
  const objectReference = observationReference(object);
  const algorithm: SpatialAlgorithm = {
    id: S0_TOPOLOGY_RULE_ID,
    version: S0_TOPOLOGY_RULE_VERSION,
    canonicalizationVersion: CANONICALIZATION_VERSION,
    tolerance,
    unit: S0_UNIT,
  };
  const relationIdentityDigest = canonicalJsonDigest(
    relationIdentityPreimage(subjectReference, objectReference, algorithm),
  );
  const sharedValidTime = deriveSharedValidTime(subject, object);
  const factInputs = relationFactInputs(subject, object);
  const outcome = relationOutcome(subject, object, sharedValidTime, tolerance);
  return assembleRelation(
    subjectReference,
    objectReference,
    algorithm,
    relationIdentityDigest,
    sharedValidTime,
    outcome,
    factInputs,
  );
}

function resolveObservation(
  reference: SpatialObservationReference,
  index: ReadonlyMap<string, ImmutableSpatialObservation>,
  path: string,
): ImmutableSpatialObservation {
  const observation = index.get(reference.observationId);
  if (observation === undefined) {
    fail(path, `unresolved observation ID ${reference.observationId}`);
  }
  if (!jsonEqual(reference, observationReference(observation))) {
    fail(path, "observation reference does not match all three exact fields");
  }
  return observation;
}

export function createSpatialRelation(
  subjectInput: ImmutableSpatialObservation,
  objectInput: ImmutableSpatialObservation,
  options: SpatialRelationOptions,
): ImmutableSpatialRelation {
  assertS0JsonValue(options);
  const optionObject = objectValue(options, "$createSpatialRelation.options");
  exactKeys(optionObject, "$createSpatialRelation.options", ["tolerance"]);
  const tolerance = validateTolerance(
    optionObject.tolerance,
    "$createSpatialRelation.options.tolerance",
  );
  const subject = validateSpatialObservation(subjectInput, "$subject");
  const object = validateSpatialObservation(objectInput, "$object");
  return constructValidatedRelation(subject, object, tolerance);
}

export function validateSpatialRelation(
  value: unknown,
  observationsInput: unknown,
  path = "$",
): ImmutableSpatialRelation {
  // Stage 1: canonical JSON, protected fields, exact closed structure,
  // constants, namespaces, strings, safe integers, and year-3785 values.
  const parsed = parseRelation(value, path);

  // Stages 2-5 occur while each candidate observation is revalidated.
  // Stage 6: collection uniqueness and exact reference resolution.
  const observations = validateSpatialObservationCollection(
    observationsInput,
    "$observations",
  );
  const index = new Map(
    observations.map((observation) => [observation.observationId, observation]),
  );
  const subject = resolveObservation(parsed.subject, index, `${path}.subject`);
  const object = resolveObservation(parsed.object, index, `${path}.object`);
  if (subject.observationId === object.observationId) {
    fail(path, "subject and object observations must differ");
  }

  // Stage 7a: independently replay shared valid time before every later
  // relation or assertion result.
  const sharedValidTime = validateSharedValidTime(
    parsed.sharedValidTime,
    subject,
    object,
    `${path}.sharedValidTime`,
  );

  // Stage 7b: replay ordered relation identity without running topology.
  const relationIdentityDigest = canonicalJsonDigest(
    relationIdentityPreimage(parsed.subject, parsed.object, parsed.algorithm),
  );
  const expectedRelationId = `${S0_SOURCE_ID}:relation:${relationIdentityDigest}`;
  if (parsed.relationId !== expectedRelationId) {
    fail(`${path}.relationId`, "does not match the exact relation identity");
  }

  // Stage 7c: compare the six inseparable ID/digest pairs and their exact
  // supported references before topology or K0 assertion replay.
  const factInputs = relationFactInputs(subject, object);
  const suppliedAssertionObject = objectValue(
    parsed.derivedAssertion,
    `${path}.derivedAssertion`,
  );
  const suppliedEvidence = objectValue(
    suppliedAssertionObject.evidence,
    `${path}.derivedAssertion.evidence`,
  );
  if (
    !jsonEqual(suppliedAssertionObject.inputFactIds, factInputs.inputFactIds) ||
    !jsonEqual(
      suppliedAssertionObject.inputFactDigests,
      factInputs.inputFactDigests,
    )
  ) {
    fail(
      `${path}.derivedAssertion`,
      "input fact IDs and digests do not match the six exact aligned pairs",
    );
  }
  exactString(
    suppliedEvidence.state,
    "supported",
    `${path}.derivedAssertion.evidence.state`,
  );
  if (!jsonEqual(suppliedEvidence.factReferences, factInputs.references)) {
    fail(
      `${path}.derivedAssertion.evidence.factReferences`,
      "must cite exactly the six aligned input facts",
    );
  }

  // Stage 7d: only now evaluate topology/tolerance and total precedence.
  const outcome = relationOutcome(
    subject,
    object,
    sharedValidTime,
    parsed.algorithm.tolerance,
  );
  if (
    parsed.relation !== outcome.relation ||
    !jsonEqual(parsed.uncertainty, outcome.uncertainty) ||
    parsed.unknownReason !== outcome.unknownReason
  ) {
    fail(path, "relation, uncertainty, and unknown reason do not replay");
  }

  // Stage 8: K0 assertion identity and complete outer result-digest replay.
  const expected = assembleRelation(
    parsed.subject,
    parsed.object,
    parsed.algorithm,
    relationIdentityDigest,
    sharedValidTime,
    outcome,
    factInputs,
  );
  const suppliedAssertion = validateDerivedAssertion(
    parsed.derivedAssertion,
    `${path}.derivedAssertion`,
  );
  validateEvidenceReferences(suppliedAssertion.evidence, factInputs.facts);
  if (!jsonEqual(suppliedAssertion, expected.derivedAssertion)) {
    fail(
      `${path}.derivedAssertion`,
      "does not match the exact S0 K0 assertion and result digest",
    );
  }
  if (!jsonEqual(value, expected)) {
    fail(path, "does not match the complete canonical relation replay");
  }
  return expected;
}

export function validateSpatialRelationCollection(
  value: unknown,
  observations: unknown,
  path = "$",
): readonly ImmutableSpatialRelation[] {
  assertS0JsonValue(value);
  if (!Array.isArray(value)) {
    fail(path, "expected a spatial-relation array");
  }
  if (value.length > S0_MAX_RELATIONS) {
    fail(path, `expected no more than ${S0_MAX_RELATIONS} relations`);
  }
  const parsed = value.map((entry, index) =>
    parseRelation(entry, `${path}[${index}]`),
  );
  const validatedObservations = validateSpatialObservationCollection(
    observations,
    "$observations",
  );
  assertSortedUniqueIds(parsed, (relation) => relation.relationId, path);
  const relations = value.map((entry, index) =>
    validateSpatialRelation(entry, validatedObservations, `${path}[${index}]`),
  );
  return immutableClone(relations);
}

export function createSpatialRelationCollection(
  relations: readonly ImmutableSpatialRelation[],
  observations: readonly ImmutableSpatialObservation[],
): readonly ImmutableSpatialRelation[] {
  assertS0JsonValue(relations);
  if (relations.length > S0_MAX_RELATIONS) {
    fail(
      "$createSpatialRelationCollection",
      `expected no more than ${S0_MAX_RELATIONS} relations`,
    );
  }
  const sortedObservations = createSpatialObservationCollection(observations);
  const validated = relations.map((relation) =>
    validateSpatialRelation(relation, sortedObservations),
  );
  const sorted = sortByStableId(validated, (relation) => relation.relationId);
  assertSortedUniqueIds(
    sorted,
    (relation) => relation.relationId,
    "$createSpatialRelationCollection",
  );
  return immutableClone(sorted);
}
