import {
  canonicalJsonDigest,
  createSourceFact,
  validateEvidenceReferences,
  validateSourceFact,
  validateTemporalAssertion,
  type DeepReadonly,
  type JsonValue,
  type SourceFact,
  type SupportedTemporalAssertion,
  type TemporalValue,
} from "../../kernel/assertions/index";

import {
  S0_ADAPTER_ID,
  S0_ADAPTER_VERSION,
  S0_ATTRIBUTION,
  S0_AXES,
  S0_CONTRACT_VERSION,
  S0_COORDINATE_SPACE_ID,
  S0_EXPERIMENTAL,
  S0_FIXTURE_CLASS,
  S0_MARKERS,
  S0_MAX_OBSERVATIONS,
  S0_OBSERVATION_ID_PATTERN,
  S0_REPRESENTATION,
  S0_SOURCE_ID,
  S0_SYNTHETIC,
  S0_UNIT,
  S0_USAGE_BASIS,
} from "./constants";
import type {
  ImmutableSpatialObservation,
  ObservationCoverage,
  ObservationUncertainty,
  ObservationUncertaintyReason,
  S0AxisOrder,
  S0Box,
  S0CoordinateSpace,
  S0NormalizedBounds,
  SpatialObservation,
  SpatialObservationFactManifest,
  SpatialObservationInput,
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
  makeFeatureId,
  makeLayerId,
  makeProvenance,
  makeSentinelSourceUrl,
  makeSourceIdentity,
  normalizeBounds,
  objectValue,
  sortByStableId,
  validateAxisOrder,
  validateCoordinateSpace,
  validateFixtureSlug,
  validateLayerVersion,
  validateNormalizedBounds,
  validateResolution,
  validateS0Markers,
  validateS0SourceIdentity,
  validateSha256,
  validateStoredBox,
  validateTemporalValue3785,
  validateYear3785DateTime,
} from "./validation";

const OBSERVATION_KEYS = [
  "contractVersion",
  "experimental",
  "synthetic",
  "fixtureClass",
  "observationId",
  "observationDigest",
  "fixtureSlug",
  "sourceIdentity",
  "layerId",
  "layerVersion",
  "featureId",
  "coordinateSpace",
  "geometry",
  "geometryDigest",
  "resolution",
  "observedTime",
  "validTime",
  "coverage",
  "uncertainty",
  "attribution",
  "usageBasis",
  "factManifest",
] as const;

const OBSERVATION_INPUT_KEYS = [
  "fixtureSlug",
  "layerVersion",
  "axisOrder",
  "geometry",
  "resolution",
  "observedTimeValue",
  "validTimeValue",
  "coverage",
  "uncertainty",
  "retrievedAt",
] as const;

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

const COMPLETE_UNCERTAINTY_REASONS = new Set<ObservationUncertaintyReason>([
  "fixture_limitation",
  "coordinate_limitation",
  "temporal_limitation",
]);

interface ValidatedObservationCore {
  fixtureSlug: string;
  layerVersion: string;
  coordinateSpace: S0CoordinateSpace;
  geometry: S0Box | null;
  geometryDigest: string | null;
  resolution: number;
  observedTimeValue: TemporalValue;
  validTimeValue: TemporalValue;
  coverage: ObservationCoverage;
  uncertainty: ObservationUncertainty;
}

interface ValidatedFactCustody {
  factManifest: SpatialObservationFactManifest;
  observedTime: SupportedTemporalAssertion;
  validTime: SupportedTemporalAssertion;
}

function validateObservationId(value: unknown, path: string): string {
  const observationId = exactText(value, path);
  if (!S0_OBSERVATION_ID_PATTERN.test(observationId)) {
    fail(path, "expected an exact S0 observation ID");
  }
  return observationId;
}

function validateCoverage(value: unknown, path: string): ObservationCoverage {
  if (
    value !== "complete_fixture_extent" &&
    value !== "partial_fixture_extent" &&
    value !== "missing_fixture_geometry" &&
    value !== "unknown"
  ) {
    fail(path, "expected a frozen observation coverage state");
  }
  return value;
}

function validateUncertainty(
  value: unknown,
  path: string,
): ObservationUncertainty {
  const object = objectValue(value, path);
  if (object.state === "certain") {
    exactKeys(object, path, ["state"]);
    return { state: "certain" };
  }
  exactKeys(object, path, ["state", "reason"]);
  if (object.state !== "uncertain") {
    fail(`${path}.state`, "expected certain or uncertain");
  }
  if (
    object.reason !== "fixture_limitation" &&
    object.reason !== "coverage_limitation" &&
    object.reason !== "coordinate_limitation" &&
    object.reason !== "temporal_limitation"
  ) {
    fail(`${path}.reason`, "expected a frozen observation uncertainty reason");
  }
  return { state: "uncertain", reason: object.reason };
}

function validateObservationMatrix(
  coverage: ObservationCoverage,
  geometry: S0Box | null,
  geometryDigest: string | null,
  uncertainty: ObservationUncertainty,
  path: string,
): void {
  const geometryPresent = geometry !== null;
  const digestPresent = geometryDigest !== null;
  if (geometryPresent !== digestPresent) {
    fail(path, "geometry and geometryDigest must be present or null together");
  }

  if (coverage === "complete_fixture_extent") {
    if (!geometryPresent || !digestPresent) {
      fail(path, "complete fixture coverage requires geometry and its digest");
    }
    if (uncertainty.state === "certain") {
      return;
    }
    if (COMPLETE_UNCERTAINTY_REASONS.has(uncertainty.reason)) {
      return;
    }
    fail(
      `${path}.uncertainty`,
      "complete coverage cannot use coverage_limitation",
    );
  }

  if (
    uncertainty.state !== "uncertain" ||
    uncertainty.reason !== "coverage_limitation"
  ) {
    fail(
      `${path}.uncertainty`,
      "incomplete coverage requires uncertain coverage_limitation",
    );
  }

  if (coverage === "missing_fixture_geometry") {
    if (geometryPresent || digestPresent) {
      fail(path, "missing fixture geometry requires null geometry and digest");
    }
    return;
  }

  if (!geometryPresent || !digestPresent) {
    fail(path, `${coverage} requires present geometry and its exact digest`);
  }
}

function validateObservedTimeValue(
  value: unknown,
  path: string,
): TemporalValue {
  const validated = validateTemporalValue3785(value, path);
  if (validated.kind !== "date_time") {
    fail(path, "observedTimeValue must be a supported date_time point");
  }
  return validated as TemporalValue;
}

function temporalLexicalYear(value: unknown, path: string): string {
  const text = exactText(value, path);
  if (!text.startsWith("3785-")) {
    fail(path, "temporal lexical year must be 3785");
  }
  return text;
}

function inspectTemporalEndpointShape(value: unknown, path: string): void {
  const object = objectValue(value, path);
  exactKeys(object, path, ["kind", "value", "inclusive"]);
  if (object.kind !== "date" && object.kind !== "date_time") {
    fail(`${path}.kind`, "expected date or date_time");
  }
  temporalLexicalYear(object.value, `${path}.value`);
  if (typeof object.inclusive !== "boolean") {
    fail(`${path}.inclusive`, "expected a boolean");
  }
}

function inspectTemporalValueShape(
  value: unknown,
  path: string,
  observed: boolean,
): TemporalValue {
  const object = objectValue(value, path);
  if (observed) {
    exactKeys(object, path, ["kind", "value"]);
    exactString(object.kind, "date_time", `${path}.kind`);
    temporalLexicalYear(object.value, `${path}.value`);
    return object as unknown as TemporalValue;
  }
  if (object.kind === "date" || object.kind === "date_time") {
    exactKeys(object, path, ["kind", "value"]);
    temporalLexicalYear(object.value, `${path}.value`);
    return object as unknown as TemporalValue;
  }
  if (object.kind !== "interval") {
    fail(`${path}.kind`, "expected date, date_time, or interval");
  }
  exactKeys(object, path, ["kind", "start", "end"]);
  if (object.start !== null) {
    inspectTemporalEndpointShape(object.start, `${path}.start`);
  }
  if (object.end !== null) {
    inspectTemporalEndpointShape(object.end, `${path}.end`);
  }
  return object as unknown as TemporalValue;
}

function validateValidTimeValue(value: unknown, path: string): TemporalValue {
  return validateTemporalValue3785(value, path) as TemporalValue;
}

function validateSingleFactReferenceShape(value: unknown, path: string): void {
  const object = objectValue(value, path);
  exactKeys(object, path, ["factId", "factDigest"]);
  exactText(object.factId, `${path}.factId`);
  validateSha256(object.factDigest, `${path}.factDigest`);
}

function temporalAssertionValue(
  value: unknown,
  path: string,
  observed: boolean,
): TemporalValue {
  const object = objectValue(value, path);
  exactKeys(object, path, ["evidence", "value"]);
  const evidence = objectValue(object.evidence, `${path}.evidence`);
  exactKeys(evidence, `${path}.evidence`, ["state", "factReferences"]);
  exactString(evidence.state, "supported", `${path}.evidence.state`);
  if (
    !Array.isArray(evidence.factReferences) ||
    evidence.factReferences.length !== 1
  ) {
    fail(
      `${path}.evidence.factReferences`,
      "expected exactly one fact reference",
    );
  }
  validateSingleFactReferenceShape(
    evidence.factReferences[0],
    `${path}.evidence.factReferences[0]`,
  );
  return inspectTemporalValueShape(object.value, `${path}.value`, observed);
}

function inspectFactShape(
  value: unknown,
  fixtureSlug: string,
  expectedPredicate: "rendition_digest" | "observed_time" | "valid_time",
  _expectedSourcePath: "$" | "$.observedTimeValue" | "$.validTimeValue",
  path: string,
): string {
  const object = objectValue(value, path);
  exactKeys(object, path, SOURCE_FACT_KEYS);
  exactString(
    object.contractVersion,
    S0_CONTRACT_VERSION,
    `${path}.contractVersion`,
  );
  exactText(object.factId, `${path}.factId`);
  exactString(object.assertionClass, "source_fact", `${path}.assertionClass`);
  const factIdentity = objectValue(
    object.sourceIdentity,
    `${path}.sourceIdentity`,
  );
  exactKeys(factIdentity, `${path}.sourceIdentity`, [
    "sourceId",
    "sourceRecordId",
  ]);
  exactText(factIdentity.sourceId, `${path}.sourceIdentity.sourceId`);
  exactText(
    factIdentity.sourceRecordId,
    `${path}.sourceIdentity.sourceRecordId`,
  );
  exactText(object.predicate, `${path}.predicate`);
  exactText(object.factDigest, `${path}.factDigest`);

  if (expectedPredicate === "rendition_digest") {
    const typedValue = objectValue(object.value, `${path}.value`);
    exactKeys(typedValue, `${path}.value`, ["kind", "value"]);
    exactText(typedValue.kind, `${path}.value.kind`);
    exactText(typedValue.value, `${path}.value.value`);
  } else if (expectedPredicate === "observed_time") {
    inspectTemporalValueShape(object.value, `${path}.value`, true);
  } else {
    inspectTemporalValueShape(object.value, `${path}.value`, false);
  }

  const provenance = objectValue(object.provenance, `${path}.provenance`);
  exactKeys(provenance, `${path}.provenance`, PROVENANCE_KEYS);
  const provenanceIdentity = objectValue(
    provenance.sourceIdentity,
    `${path}.provenance.sourceIdentity`,
  );
  exactKeys(provenanceIdentity, `${path}.provenance.sourceIdentity`, [
    "sourceId",
    "sourceRecordId",
  ]);
  exactText(
    provenanceIdentity.sourceId,
    `${path}.provenance.sourceIdentity.sourceId`,
  );
  exactText(
    provenanceIdentity.sourceRecordId,
    `${path}.provenance.sourceIdentity.sourceRecordId`,
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
  exactText(
    provenance.sourceContentDigest,
    `${path}.provenance.sourceContentDigest`,
  );
  exactString(
    provenance.validationState,
    "validated",
    `${path}.provenance.validationState`,
  );
  return retrievedAt;
}

function validateFactManifestShape(
  value: unknown,
  fixtureSlug: string,
  path: string,
): string {
  const manifest = objectValue(value, path);
  exactKeys(manifest, path, [
    "fragmentDigestFact",
    "observedTimeFact",
    "validTimeFact",
  ]);
  const retrievedAt = inspectFactShape(
    manifest.fragmentDigestFact,
    fixtureSlug,
    "rendition_digest",
    "$",
    `${path}.fragmentDigestFact`,
  );
  inspectFactShape(
    manifest.observedTimeFact,
    fixtureSlug,
    "observed_time",
    "$.observedTimeValue",
    `${path}.observedTimeFact`,
  );
  inspectFactShape(
    manifest.validTimeFact,
    fixtureSlug,
    "valid_time",
    "$.validTimeValue",
    `${path}.validTimeFact`,
  );
  return retrievedAt;
}

function geometryDigestPreimage(
  axisOrder: S0AxisOrder,
  normalizedBounds: S0NormalizedBounds,
  resolution: number,
): JsonValue {
  return {
    contractVersion: S0_CONTRACT_VERSION,
    coordinateSpaceId: S0_COORDINATE_SPACE_ID,
    axes: [...S0_AXES],
    axisOrder: [...axisOrder],
    unit: S0_UNIT,
    representation: S0_REPRESENTATION,
    normalizedBounds: {
      synthetic_x: {
        minimum: normalizedBounds.synthetic_x.minimum,
        maximum: normalizedBounds.synthetic_x.maximum,
      },
      synthetic_y: {
        minimum: normalizedBounds.synthetic_y.minimum,
        maximum: normalizedBounds.synthetic_y.maximum,
      },
    },
    resolution,
  };
}

function computeGeometryDigest(
  axisOrder: S0AxisOrder,
  geometry: S0Box,
  resolution: number,
): string {
  return canonicalJsonDigest(
    geometryDigestPreimage(
      axisOrder,
      normalizeBounds(axisOrder, geometry),
      resolution,
    ),
  );
}

function preFactFragment(core: ValidatedObservationCore): JsonValue {
  const sourceIdentity = makeSourceIdentity(core.fixtureSlug);
  return {
    ...S0_MARKERS,
    fragmentClass: "spatial_observation",
    fixtureSlug: core.fixtureSlug,
    sourceIdentity,
    layerId: makeLayerId(core.fixtureSlug),
    layerVersion: core.layerVersion,
    featureId: makeFeatureId(core.fixtureSlug),
    coordinateSpace: {
      id: core.coordinateSpace.id,
      axes: [...core.coordinateSpace.axes],
      axisOrder: [...core.coordinateSpace.axisOrder],
      unit: core.coordinateSpace.unit,
      representation: core.coordinateSpace.representation,
    },
    geometry:
      core.geometry === null
        ? null
        : {
            minimum: [...core.geometry.minimum],
            maximum: [...core.geometry.maximum],
          },
    geometryDigest: core.geometryDigest,
    resolution: core.resolution,
    observedTimeValue: core.observedTimeValue,
    validTimeValue: core.validTimeValue,
    coverage: core.coverage,
    uncertainty: core.uncertainty,
    attribution: S0_ATTRIBUTION,
    usageBasis: S0_USAGE_BASIS,
  } as unknown as JsonValue;
}

function factReference(fact: SourceFact): {
  factId: string;
  factDigest: string;
} {
  return { factId: fact.factId, factDigest: fact.factDigest };
}

function constructFactCustody(
  core: ValidatedObservationCore,
  observationDigest: string,
  retrievedAt: string,
): ValidatedFactCustody {
  const sourceIdentity = makeSourceIdentity(core.fixtureSlug);
  const fragmentDigestFact = createSourceFact({
    sourceIdentity,
    predicate: "rendition_digest",
    value: { kind: "sha256_digest", value: observationDigest },
    provenance: makeProvenance(
      core.fixtureSlug,
      "$",
      retrievedAt,
      observationDigest,
    ),
  }) as SourceFact;
  const observedTimeFact = createSourceFact({
    sourceIdentity,
    predicate: "observed_time",
    value: core.observedTimeValue,
    provenance: makeProvenance(
      core.fixtureSlug,
      "$.observedTimeValue",
      retrievedAt,
      observationDigest,
    ),
  }) as SourceFact;
  const validTimeFact = createSourceFact({
    sourceIdentity,
    predicate: "valid_time",
    value: core.validTimeValue,
    provenance: makeProvenance(
      core.fixtureSlug,
      "$.validTimeValue",
      retrievedAt,
      observationDigest,
    ),
  }) as SourceFact;

  return {
    factManifest: {
      fragmentDigestFact,
      observedTimeFact,
      validTimeFact,
    },
    observedTime: {
      value: core.observedTimeValue,
      evidence: {
        state: "supported",
        factReferences: [factReference(observedTimeFact)],
      },
    },
    validTime: {
      value: core.validTimeValue,
      evidence: {
        state: "supported",
        factReferences: [factReference(validTimeFact)],
      },
    },
  };
}

function validateExactFactCustody(
  value: unknown,
  core: ValidatedObservationCore,
  observationDigest: string,
  retrievedAt: string,
  observedTimeInput: unknown,
  validTimeInput: unknown,
  observationPath: string,
): ValidatedFactCustody {
  const manifestPath = `${observationPath}.factManifest`;
  const observedTimePath = `${observationPath}.observedTime`;
  const validTimePath = `${observationPath}.validTime`;
  const manifest = objectValue(value, manifestPath);
  const suppliedFacts = {
    fragmentDigestFact: validateSourceFact(
      manifest.fragmentDigestFact,
      `${manifestPath}.fragmentDigestFact`,
    ),
    observedTimeFact: validateSourceFact(
      manifest.observedTimeFact,
      `${manifestPath}.observedTimeFact`,
    ),
    validTimeFact: validateSourceFact(
      manifest.validTimeFact,
      `${manifestPath}.validTimeFact`,
    ),
  };
  const expected = constructFactCustody(core, observationDigest, retrievedAt);

  for (const key of [
    "fragmentDigestFact",
    "observedTimeFact",
    "validTimeFact",
  ] as const) {
    if (!jsonEqual(suppliedFacts[key], expected.factManifest[key])) {
      fail(
        `${manifestPath}.${key}`,
        "fact does not match exact S0 fragment custody",
      );
    }
  }

  const observedTime = validateTemporalAssertion(
    observedTimeInput,
    observedTimePath,
  );
  const validTime = validateTemporalAssertion(validTimeInput, validTimePath);
  if (
    observedTime.evidence.state !== "supported" ||
    !("value" in observedTime)
  ) {
    fail(observedTimePath, "S0 observed time requires supported evidence");
  }
  if (validTime.evidence.state !== "supported" || !("value" in validTime)) {
    fail(validTimePath, "S0 valid time requires supported evidence");
  }
  validateEvidenceReferences(observedTime.evidence, [
    suppliedFacts.observedTimeFact,
  ]);
  validateEvidenceReferences(validTime.evidence, [suppliedFacts.validTimeFact]);
  if (!jsonEqual(observedTime, expected.observedTime)) {
    fail(observedTimePath, "assertion must cite the exact observed-time fact");
  }
  if (!jsonEqual(validTime, expected.validTime)) {
    fail(validTimePath, "assertion must cite the exact valid-time fact");
  }

  return {
    factManifest: suppliedFacts as SpatialObservationFactManifest,
    observedTime: observedTime as SupportedTemporalAssertion,
    validTime: validTime as SupportedTemporalAssertion,
  };
}

function validateGeometryAndMatrix(
  coordinateSpaceValue: unknown,
  geometryValue: unknown,
  geometryDigestValue: unknown,
  resolutionValue: unknown,
  coverageValue: unknown,
  uncertaintyValue: unknown,
  path: string,
): Omit<
  ValidatedObservationCore,
  "fixtureSlug" | "layerVersion" | "observedTimeValue" | "validTimeValue"
> {
  const coordinateSpace = validateCoordinateSpace(
    coordinateSpaceValue,
    `${path}.coordinateSpace`,
  );
  const geometry =
    geometryValue === null
      ? null
      : validateStoredBox(geometryValue, `${path}.geometry`);
  const geometryDigest =
    geometryDigestValue === null
      ? null
      : validateSha256(geometryDigestValue, `${path}.geometryDigest`);
  const resolution = validateResolution(resolutionValue, `${path}.resolution`);
  const coverage = validateCoverage(coverageValue, `${path}.coverage`);
  const uncertainty = validateUncertainty(
    uncertaintyValue,
    `${path}.uncertainty`,
  );
  validateObservationMatrix(
    coverage,
    geometry,
    geometryDigest,
    uncertainty,
    path,
  );
  if (geometry !== null) {
    validateNormalizedBounds(
      normalizeBounds(coordinateSpace.axisOrder, geometry),
      resolution,
      `${path}.geometry`,
    );
  }
  return {
    coordinateSpace,
    geometry,
    geometryDigest,
    resolution,
    coverage,
    uncertainty,
  };
}

export function validateSpatialObservation(
  value: unknown,
  path = "$",
): ImmutableSpatialObservation {
  // Stage 1: canonical JSON, protected fields, exact structure, constants,
  // namespaces, lexical values, URL custody, and year-3785 rules.
  assertS0JsonValue(value);
  const object = objectValue(value, path);
  exactKeys(object, path, OBSERVATION_KEYS);
  validateS0Markers(object, path);
  const fixtureSlug = validateFixtureSlug(
    object.fixtureSlug,
    `${path}.fixtureSlug`,
  );
  const observationId = validateObservationId(
    object.observationId,
    `${path}.observationId`,
  );
  const observationDigest = validateSha256(
    object.observationDigest,
    `${path}.observationDigest`,
  );
  const sourceIdentity = validateS0SourceIdentity(
    object.sourceIdentity,
    fixtureSlug,
    `${path}.sourceIdentity`,
  );
  const layerId = exactString(
    object.layerId,
    makeLayerId(fixtureSlug),
    `${path}.layerId`,
  );
  const layerVersion = validateLayerVersion(
    object.layerVersion,
    `${path}.layerVersion`,
  );
  const featureId = exactString(
    object.featureId,
    makeFeatureId(fixtureSlug),
    `${path}.featureId`,
  );
  exactString(object.attribution, S0_ATTRIBUTION, `${path}.attribution`);
  exactString(object.usageBasis, S0_USAGE_BASIS, `${path}.usageBasis`);
  const observedTimeValue = temporalAssertionValue(
    object.observedTime,
    `${path}.observedTime`,
    true,
  );
  const validTimeValue = temporalAssertionValue(
    object.validTime,
    `${path}.validTime`,
    false,
  );
  const retrievedAt = validateFactManifestShape(
    object.factManifest,
    fixtureSlug,
    `${path}.factManifest`,
  );

  // Stage 2: coordinate, bounds, resolution, coverage, uncertainty, and
  // geometry-presence matrix.
  const geometryState = validateGeometryAndMatrix(
    object.coordinateSpace,
    object.geometry,
    object.geometryDigest,
    object.resolution,
    object.coverage,
    object.uncertainty,
    path,
  );
  const core: ValidatedObservationCore = {
    fixtureSlug,
    layerVersion,
    ...geometryState,
    observedTimeValue,
    validTimeValue,
  };

  // Stage 3: exact geometry-digest replay.
  if (core.geometry !== null && core.geometryDigest !== null) {
    const expectedGeometryDigest = computeGeometryDigest(
      core.coordinateSpace.axisOrder,
      core.geometry,
      core.resolution,
    );
    if (core.geometryDigest !== expectedGeometryDigest) {
      fail(
        `${path}.geometryDigest`,
        "does not match the canonical geometry digest",
      );
    }
  }

  // Stage 4: pre-fact fragment, observation digest, and observation ID replay.
  const expectedObservationDigest = canonicalJsonDigest(preFactFragment(core));
  if (observationDigest !== expectedObservationDigest) {
    fail(
      `${path}.observationDigest`,
      "does not match the exact pre-fact fragment digest",
    );
  }
  const expectedObservationId = `${S0_SOURCE_ID}:observation:${expectedObservationDigest}`;
  if (observationId !== expectedObservationId) {
    fail(
      `${path}.observationId`,
      "does not match the stable observation digest identity",
    );
  }

  // Stage 5: K0 fact, provenance, predicate/value, temporal assertion, and
  // exact evidence-reference replay.
  const custody = validateExactFactCustody(
    object.factManifest,
    core,
    observationDigest,
    retrievedAt,
    object.observedTime,
    object.validTime,
    path,
  );

  return immutableClone<SpatialObservation>({
    contractVersion: S0_CONTRACT_VERSION,
    experimental: S0_EXPERIMENTAL,
    synthetic: S0_SYNTHETIC,
    fixtureClass: S0_FIXTURE_CLASS,
    observationId,
    observationDigest,
    fixtureSlug,
    sourceIdentity: sourceIdentity as SpatialObservation["sourceIdentity"],
    layerId,
    layerVersion,
    featureId,
    coordinateSpace: core.coordinateSpace,
    geometry: core.geometry,
    geometryDigest: core.geometryDigest,
    resolution: core.resolution,
    observedTime: custody.observedTime,
    validTime: custody.validTime,
    coverage: core.coverage,
    uncertainty: core.uncertainty,
    attribution: S0_ATTRIBUTION,
    usageBasis: S0_USAGE_BASIS,
    factManifest: custody.factManifest,
  });
}

export function createSpatialObservation(
  input: SpatialObservationInput,
): ImmutableSpatialObservation {
  assertS0JsonValue(input);
  const object = objectValue(input, "$createSpatialObservation");
  exactKeys(object, "$createSpatialObservation", OBSERVATION_INPUT_KEYS);
  const fixtureSlug = validateFixtureSlug(object.fixtureSlug, "$.fixtureSlug");
  const layerVersion = validateLayerVersion(
    object.layerVersion,
    "$.layerVersion",
  );
  const axisOrder = validateAxisOrder(object.axisOrder, "$.axisOrder");
  const geometry =
    object.geometry === null
      ? null
      : validateStoredBox(object.geometry, "$.geometry");
  const resolution = validateResolution(object.resolution, "$.resolution");
  const observedTimeValue = validateObservedTimeValue(
    object.observedTimeValue,
    "$.observedTimeValue",
  );
  const validTimeValue = validateValidTimeValue(
    object.validTimeValue,
    "$.validTimeValue",
  );
  const coverage = validateCoverage(object.coverage, "$.coverage");
  const uncertainty = validateUncertainty(object.uncertainty, "$.uncertainty");
  const retrievedAt = validateYear3785DateTime(
    object.retrievedAt,
    "$.retrievedAt",
  );
  if (geometry !== null) {
    validateNormalizedBounds(
      normalizeBounds(axisOrder, geometry),
      resolution,
      "$.geometry",
    );
  }
  const geometryDigest =
    geometry === null
      ? null
      : computeGeometryDigest(axisOrder, geometry, resolution);
  validateObservationMatrix(
    coverage,
    geometry,
    geometryDigest,
    uncertainty,
    "$createSpatialObservation",
  );
  const coordinateSpace: S0CoordinateSpace = {
    id: S0_COORDINATE_SPACE_ID,
    axes: [...S0_AXES],
    axisOrder,
    unit: S0_UNIT,
    representation: S0_REPRESENTATION,
  };
  const core: ValidatedObservationCore = {
    fixtureSlug,
    layerVersion,
    coordinateSpace,
    geometry,
    geometryDigest,
    resolution,
    observedTimeValue,
    validTimeValue,
    coverage,
    uncertainty,
  };
  const observationDigest = canonicalJsonDigest(preFactFragment(core));
  const custody = constructFactCustody(core, observationDigest, retrievedAt);
  const observation: SpatialObservation = {
    contractVersion: S0_CONTRACT_VERSION,
    experimental: S0_EXPERIMENTAL,
    synthetic: S0_SYNTHETIC,
    fixtureClass: S0_FIXTURE_CLASS,
    observationId: `${S0_SOURCE_ID}:observation:${observationDigest}`,
    observationDigest,
    fixtureSlug,
    sourceIdentity: makeSourceIdentity(fixtureSlug),
    layerId: makeLayerId(fixtureSlug),
    layerVersion,
    featureId: makeFeatureId(fixtureSlug),
    coordinateSpace,
    geometry,
    geometryDigest,
    resolution,
    observedTime: custody.observedTime,
    validTime: custody.validTime,
    coverage,
    uncertainty,
    attribution: S0_ATTRIBUTION,
    usageBasis: S0_USAGE_BASIS,
    factManifest: custody.factManifest,
  };
  return validateSpatialObservation(observation);
}

export function validateSpatialObservationCollection(
  value: unknown,
  path = "$",
): readonly ImmutableSpatialObservation[] {
  assertS0JsonValue(value);
  if (!Array.isArray(value)) {
    fail(path, "expected a spatial-observation array");
  }
  if (value.length > S0_MAX_OBSERVATIONS) {
    fail(path, `expected no more than ${S0_MAX_OBSERVATIONS} observations`);
  }
  const observations = value.map((entry, index) =>
    validateSpatialObservation(entry, `${path}[${index}]`),
  );
  assertSortedUniqueIds(
    observations,
    (observation) => observation.observationId,
    path,
  );
  return immutableClone(observations);
}

export function createSpatialObservationCollection(
  observations: readonly ImmutableSpatialObservation[],
): readonly ImmutableSpatialObservation[] {
  assertS0JsonValue(observations);
  if (observations.length > S0_MAX_OBSERVATIONS) {
    fail(
      "$createSpatialObservationCollection",
      `expected no more than ${S0_MAX_OBSERVATIONS} observations`,
    );
  }
  const validated = observations.map((observation) =>
    validateSpatialObservation(observation),
  );
  const sorted = sortByStableId(
    validated,
    (observation) => observation.observationId,
  );
  assertSortedUniqueIds(
    sorted,
    (observation) => observation.observationId,
    "$createSpatialObservationCollection",
  );
  return immutableClone(sorted);
}

export function normalizedBoundsForObservation(
  observation: ImmutableSpatialObservation,
): DeepReadonly<S0NormalizedBounds> | null {
  const validated = validateSpatialObservation(observation);
  if (validated.geometry === null) {
    return null;
  }
  return immutableClone(
    normalizeBounds(
      validated.coordinateSpace.axisOrder as S0AxisOrder,
      validated.geometry as S0Box,
    ),
  );
}
