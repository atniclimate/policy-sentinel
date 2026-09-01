import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import assertionSchema from "../../../schemas/assertion.schema.v1.json";
import jurisdictionEvidenceSchema from "../../../schemas/experimental/jurisdiction-evidence.schema.v1.json";
import spatialObservationSchema from "../../../schemas/experimental/spatial-observation.schema.v1.json";
import spatialRelationSchema from "../../../schemas/experimental/spatial-relation.schema.v1.json";
import {
  createSourceFact,
  type SourceFact,
  type SourceProvenance,
} from "../../../src/kernel/assertions";
import {
  createJurisdictionEvidence,
  validateJurisdictionEvidence as validateJurisdictionEvidenceRuntime,
} from "../../../src/experimental/spatial/jurisdiction-evidence";
import {
  createSpatialObservation,
  createSpatialObservationCollection,
  validateSpatialObservation,
} from "../../../src/experimental/spatial/observation";
import {
  createSpatialRelation,
  validateSpatialRelation,
} from "../../../src/experimental/spatial/relation";
import type {
  SpatialObservationInput,
  SpatialUnknownReason,
} from "../../../src/experimental/spatial/types";
import {
  validateCoordinateSpace,
  validateFixtureSlug,
  validateLayerVersion,
  validateNormalizedBounds,
  validateTemporalValue3785,
} from "../../../src/experimental/spatial/validation";

const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
addFormats(ajv);
ajv.addSchema(assertionSchema);
ajv.addSchema(spatialObservationSchema);
ajv.addSchema(spatialRelationSchema);
ajv.addSchema(jurisdictionEvidenceSchema);

const validateObservation = ajv.getSchema(spatialObservationSchema.$id)!;
const validateRelation = ajv.getSchema(spatialRelationSchema.$id)!;
const validateJurisdictionEvidence = ajv.getSchema(
  jurisdictionEvidenceSchema.$id,
)!;
const validateFixtureSlugSchema = ajv.compile({
  $ref: `${spatialObservationSchema.$id}#/$defs/fixtureSlug`,
});
const validateLayerVersionSchema = ajv.compile({
  $ref: `${spatialObservationSchema.$id}#/$defs/layerVersion`,
});
const validateCoordinateSpaceSchema = ajv.compile({
  $ref: `${spatialObservationSchema.$id}#/$defs/coordinateSpace`,
});
const validateTemporalValueSchema = ajv.compile({
  $ref: `${spatialObservationSchema.$id}#/$defs/s0TemporalValue`,
});

const clone = <T>(value: T): T => structuredClone(value);

function digestFor(slug: string): string {
  const suffix = Number(slug.slice(-4));
  return ((suffix % 15) + 1).toString(16).repeat(64);
}

function sourceIdentity(fixtureSlug: string) {
  return {
    sourceId: "s0-impossible",
    sourceRecordId: `s0-impossible:fixture:${fixtureSlug}`,
  };
}

function provenance(
  fixtureSlug: string,
  sourcePath: string,
  sourceContentDigest: string,
): SourceProvenance {
  return {
    sourceIdentity: sourceIdentity(fixtureSlug),
    sourceUrl: `https://policy-sentinel.invalid/fixtures/s0/1.0.0/${fixtureSlug}.json`,
    sourcePath,
    retrievedAt: "3785-01-02T03:04:05Z",
    sourceUpdatedAt: null,
    adapterId: "s0-impossible-fixture",
    adapterVersion: "1.0.0",
    sourceContentDigest,
    validationState: "validated",
  };
}

function observation(fixtureSlug = "fixture-0001") {
  const observationDigest = digestFor(fixtureSlug);
  const geometryDigest = "a".repeat(64);
  const identity = sourceIdentity(fixtureSlug);
  const observedTimeValue = {
    kind: "date_time" as const,
    value: "3785-01-01T00:00:00Z",
  };
  const validTimeValue = {
    kind: "date" as const,
    value: "3785-01-01",
  };
  const fragmentDigestFact = createSourceFact({
    sourceIdentity: identity,
    predicate: "rendition_digest",
    value: { kind: "sha256_digest", value: observationDigest },
    provenance: provenance(fixtureSlug, "$", observationDigest),
  });
  const observedTimeFact = createSourceFact({
    sourceIdentity: identity,
    predicate: "observed_time",
    value: observedTimeValue,
    provenance: provenance(
      fixtureSlug,
      "$.observedTimeValue",
      observationDigest,
    ),
  });
  const validTimeFact = createSourceFact({
    sourceIdentity: identity,
    predicate: "valid_time",
    value: validTimeValue,
    provenance: provenance(fixtureSlug, "$.validTimeValue", observationDigest),
  });

  return {
    contractVersion: "1.0.0",
    experimental: true,
    synthetic: true,
    fixtureClass: "impossible_synthetic_geometry",
    observationId: `s0-impossible:observation:${observationDigest}`,
    observationDigest,
    fixtureSlug,
    sourceIdentity: identity,
    layerId: `s0-impossible:layer:${fixtureSlug}`,
    layerVersion: "1.0.0",
    featureId: `s0-impossible:feature:${fixtureSlug}`,
    coordinateSpace: {
      id: "urn:policy-sentinel:crs:impossible-grid:1.0.0",
      axes: ["synthetic_x", "synthetic_y"],
      axisOrder: ["synthetic_x", "synthetic_y"],
      unit: "impossible_unit",
      representation: "axis_aligned_integer_box_v1",
    },
    geometry: { minimum: [-1, -1], maximum: [1, 1] },
    geometryDigest,
    resolution: 1,
    observedTime: {
      value: observedTimeValue,
      evidence: {
        state: "supported",
        factReferences: [reference(observedTimeFact)],
      },
    },
    validTime: {
      value: validTimeValue,
      evidence: {
        state: "supported",
        factReferences: [reference(validTimeFact)],
      },
    },
    coverage: "complete_fixture_extent",
    uncertainty: { state: "certain" },
    attribution: "Policy Sentinel impossible synthetic fixture",
    usageBasis:
      "Repository-authored impossible synthetic fixture; no external source or reuse grant.",
    factManifest: {
      fragmentDigestFact,
      observedTimeFact,
      validTimeFact,
    },
  };
}

function reference(fact: SourceFact) {
  return { factId: fact.factId, factDigest: fact.factDigest };
}

function relation() {
  const subjectObservation = observation("fixture-0001");
  const objectObservation = observation("fixture-0002");
  objectObservation.geometryDigest = "b".repeat(64);
  const facts = [
    ...Object.values(subjectObservation.factManifest),
    ...Object.values(objectObservation.factManifest),
  ].sort((left, right) =>
    left.factId < right.factId ? -1 : left.factId > right.factId ? 1 : 0,
  );
  const factReferences = facts.map(reference);
  const validTimeReferences = [
    reference(subjectObservation.factManifest.validTimeFact),
    reference(objectObservation.factManifest.validTimeFact),
  ].sort((left, right) =>
    left.factId < right.factId ? -1 : left.factId > right.factId ? 1 : 0,
  );
  const relationDigest = "c".repeat(64);

  return {
    contractVersion: "1.0.0",
    experimental: true,
    synthetic: true,
    fixtureClass: "impossible_synthetic_geometry",
    relationId: `s0-impossible:relation:${relationDigest}`,
    subject: {
      observationId: subjectObservation.observationId,
      observationDigest: subjectObservation.observationDigest,
      geometryDigest: subjectObservation.geometryDigest,
    },
    object: {
      observationId: objectObservation.observationId,
      observationDigest: objectObservation.observationDigest,
      geometryDigest: objectObservation.geometryDigest,
    },
    relation: "intersects",
    sharedValidTime: {
      state: "overlap",
      value: { kind: "date", value: "3785-01-01" },
      factReferences: validTimeReferences,
    },
    algorithm: {
      id: "s0-axis-aligned-box-topology",
      version: "1.0.0",
      canonicalizationVersion: "ps-c14n-json-1",
      tolerance: 0,
      unit: "impossible_unit",
    },
    derivedAssertion: {
      contractVersion: "1.0.0",
      assertionId: `k0:spatial_relation:${relationDigest}`,
      assertionClass: "spatial_relation",
      inputFactIds: factReferences.map((entry) => entry.factId),
      inputFactDigests: factReferences.map((entry) => entry.factDigest),
      ruleId: "s0-axis-aligned-box-topology",
      ruleVersion: "1.0.0",
      canonicalizationVersion: "ps-c14n-json-1",
      resultDigest: "d".repeat(64),
      evidence: { state: "supported", factReferences },
      validationState: "validated",
    },
    uncertainty: { state: "certain" },
    unknownReason: null,
    interpretation: "geometric_relation_only",
  };
}

type RelationUnknownReason =
  | "missing_geometry"
  | "partial_coverage"
  | "unknown_coverage"
  | "observation_uncertain"
  | "resolution_mismatch"
  | "valid_time_mixed_precision"
  | "valid_time_disjoint"
  | "tolerance_ambiguity";

type MutableRelationExemplar = Record<string, unknown> & {
  relation:
    "intersects" | "contains" | "within" | "touches" | "disjoint" | "unknown";
  subject: {
    geometryDigest: string | null;
  };
  sharedValidTime:
    | {
        state: "overlap";
        value: { kind: "date" | "date_time"; value: string };
        factReferences: readonly { factId: string; factDigest: string }[];
      }
    | {
        state: "indeterminate";
        reason: "mixed_precision";
        factReferences: readonly { factId: string; factDigest: string }[];
      }
    | {
        state: "disjoint";
        factReferences: readonly { factId: string; factDigest: string }[];
      };
  uncertainty:
    | { state: "certain" }
    | { state: "uncertain"; reason: RelationUnknownReason };
  unknownReason: RelationUnknownReason | null;
};

function mutableRelationExemplar(
  value: ReturnType<typeof relation>,
): MutableRelationExemplar {
  return clone(value) as unknown as MutableRelationExemplar;
}

function jurisdictionEvidence() {
  const fixtureSlug = "fixture-0001";
  const statementDigest = "e".repeat(64);
  const identity = sourceIdentity(fixtureSlug);
  const sourceLabel =
    "Policy Sentinel impossible synthetic administrative statement";
  const titleFact = createSourceFact({
    sourceIdentity: identity,
    predicate: "instrument_title",
    value: { kind: "text", value: sourceLabel },
    provenance: provenance(fixtureSlug, "$.sourceLabel", statementDigest),
  });
  const fragmentDigestFact = createSourceFact({
    sourceIdentity: identity,
    predicate: "rendition_digest",
    value: { kind: "sha256_digest", value: statementDigest },
    provenance: provenance(fixtureSlug, "$", statementDigest),
  });
  const factReferences = [
    reference(titleFact),
    reference(fragmentDigestFact),
  ].sort((left, right) =>
    left.factId < right.factId ? -1 : left.factId > right.factId ? 1 : 0,
  );

  return {
    contractVersion: "1.0.0",
    experimental: true,
    synthetic: true,
    fixtureClass: "impossible_synthetic_geometry",
    jurisdictionEvidenceId: `s0-impossible:jurisdiction-evidence:${statementDigest}`,
    fixtureSlug,
    sourceIdentity: identity,
    featureId: `s0-impossible:feature:${fixtureSlug}`,
    administrativeUnitId: `s0-impossible:administrative-unit:${fixtureSlug}`,
    sourceLabel,
    statement:
      "Impossible synthetic source statement: s0-impossible:feature:fixture-0001 is assigned to s0-impossible:administrative-unit:fixture-0001 in this fixture only.",
    statementDigest,
    syntheticLevel: "impossible_administrative_unit",
    evidenceBasis: "explicit_synthetic_source_statement",
    derivation: "source_citation_only_not_spatial",
    reviewState: "validated_synthetic_fixture",
    attribution: "Policy Sentinel impossible synthetic fixture",
    usageBasis:
      "Repository-authored impossible synthetic fixture; no external source or reuse grant.",
    factManifest: { titleFact, fragmentDigestFact },
    evidence: { state: "supported", factReferences },
  };
}

function acceptedByRuntime(run: () => unknown): boolean {
  try {
    run();
    return true;
  } catch {
    return false;
  }
}

describe("S0 strict schema and structural-runtime parity", () => {
  it("compiles all three schemas strictly and accepts closed representatives", () => {
    expect(
      validateObservation(observation()),
      ajv.errorsText(validateObservation.errors),
    ).toBe(true);
    expect(
      validateRelation(relation()),
      ajv.errorsText(validateRelation.errors),
    ).toBe(true);
    expect(
      validateJurisdictionEvidence(jurisdictionEvidence()),
      ajv.errorsText(validateJurisdictionEvidence.errors),
    ).toBe(true);
  });

  it("expresses every valid observation matrix variant", () => {
    const cases = [
      {
        coverage: "complete_fixture_extent",
        uncertainty: { state: "certain" },
      },
      ...[
        "fixture_limitation",
        "coordinate_limitation",
        "temporal_limitation",
      ].map((reason) => ({
        coverage: "complete_fixture_extent",
        uncertainty: { state: "uncertain", reason },
      })),
      {
        coverage: "partial_fixture_extent",
        uncertainty: { state: "uncertain", reason: "coverage_limitation" },
      },
      {
        coverage: "unknown",
        uncertainty: { state: "uncertain", reason: "coverage_limitation" },
      },
    ];

    for (const entry of cases) {
      const candidate = observation() as Record<string, unknown>;
      candidate.coverage = entry.coverage;
      candidate.uncertainty = entry.uncertainty;
      expect(validateObservation(candidate), JSON.stringify(entry)).toBe(true);
    }

    const missing = observation() as Record<string, unknown>;
    missing.coverage = "missing_fixture_geometry";
    missing.geometry = null;
    missing.geometryDigest = null;
    missing.uncertainty = {
      state: "uncertain",
      reason: "coverage_limitation",
    };
    expect(
      validateObservation(missing),
      ajv.errorsText(validateObservation.errors),
    ).toBe(true);
  });

  it("rejects every observation matrix near-miss", () => {
    const invalid = [
      {
        coverage: "complete_fixture_extent",
        geometry: null,
        geometryDigest: null,
      },
      {
        coverage: "partial_fixture_extent",
        geometry: null,
        geometryDigest: null,
      },
      { coverage: "unknown", geometry: null, geometryDigest: null },
      { coverage: "missing_fixture_geometry" },
      { coverage: "partial_fixture_extent", uncertainty: { state: "certain" } },
      {
        coverage: "complete_fixture_extent",
        uncertainty: { state: "uncertain", reason: "coverage_limitation" },
      },
      {
        coverage: "complete_fixture_extent",
        uncertainty: { state: "uncertain", reason: "tolerance_ambiguity" },
      },
      { geometryDigest: null },
    ];

    for (const changes of invalid) {
      const candidate = Object.assign(clone(observation()), changes);
      expect(validateObservation(candidate), JSON.stringify(changes)).toBe(
        false,
      );
    }
  });

  it("enforces resolution lattice structure and leaves ordering to runtime", () => {
    for (let resolution = 1; resolution <= 8; resolution += 1) {
      const candidate = clone(observation());
      candidate.resolution = resolution;
      candidate.geometry = {
        minimum: [-resolution, -resolution],
        maximum: [resolution, resolution],
      };
      expect(validateObservation(candidate), `resolution ${resolution}`).toBe(
        true,
      );
    }

    const offLattice = clone(observation());
    offLattice.resolution = 2;
    offLattice.geometry = { minimum: [-1, -2], maximum: [2, 2] };
    expect(validateObservation(offLattice)).toBe(false);

    const inverted = clone(observation());
    inverted.geometry = { minimum: [1, -1], maximum: [-1, 1] };
    expect(validateObservation(inverted)).toBe(true);
    expect(() =>
      validateNormalizedBounds(
        {
          synthetic_x: { minimum: 1, maximum: -1 },
          synthetic_y: { minimum: -1, maximum: 1 },
        },
        1,
        "$.geometry",
      ),
    ).toThrow(/strictly less/);
  });

  it("keeps shared primitive schema and runtime lexical checks aligned", () => {
    const fixtureSlugs = [
      ["fixture-0001", true],
      ["fixture-9999", true],
      ["fixture-alpha", false],
      ["fixture-001", false],
      ["fixture-10000", false],
    ] as const;
    for (const [value, expected] of fixtureSlugs) {
      expect(Boolean(validateFixtureSlugSchema(value)), value).toBe(expected);
      expect(
        acceptedByRuntime(() => validateFixtureSlug(value, "$.fixtureSlug")),
        value,
      ).toBe(expected);
    }

    const versions = [
      ["0.0.0", true],
      ["1.0.0", true],
      ["10.20.30", true],
      ["01.0.0", false],
      ["1.0.0-beta", false],
      ["1.0.0+build", false],
    ] as const;
    for (const [value, expected] of versions) {
      expect(Boolean(validateLayerVersionSchema(value)), value).toBe(expected);
      expect(
        acceptedByRuntime(() => validateLayerVersion(value, "$.layerVersion")),
        value,
      ).toBe(expected);
    }

    const coordinateSpaces = [
      observation().coordinateSpace,
      {
        ...observation().coordinateSpace,
        axes: ["synthetic_y", "synthetic_x"],
      },
      { ...observation().coordinateSpace, unit: "meters" },
    ];
    for (const [index, value] of coordinateSpaces.entries()) {
      const expected = index === 0;
      expect(Boolean(validateCoordinateSpaceSchema(value)), String(index)).toBe(
        expected,
      );
      expect(
        acceptedByRuntime(() =>
          validateCoordinateSpace(value, "$.coordinateSpace"),
        ),
        String(index),
      ).toBe(expected);
    }

    const temporalValues = [
      [{ kind: "date", value: "3785-01-01" }, true],
      [{ kind: "date_time", value: "3785-01-01T00:00:00Z" }, true],
      [{ kind: "date", value: "3784-12-31" }, false],
      [{ kind: "date_time", value: "3785-02-30T00:00:00Z" }, false],
    ] as const;
    for (const [value, expected] of temporalValues) {
      expect(
        Boolean(validateTemporalValueSchema(value)),
        JSON.stringify(value),
      ).toBe(expected);
      expect(
        acceptedByRuntime(() =>
          validateTemporalValue3785(value, "$.validTime.value"),
        ),
        JSON.stringify(value),
      ).toBe(expected);
    }
  });

  it("expresses all relation result/reason consistency branches", () => {
    const base = relation();
    expect(validateRelation(base)).toBe(true);

    const reasons = [
      "missing_geometry",
      "partial_coverage",
      "unknown_coverage",
      "observation_uncertain",
      "resolution_mismatch",
      "valid_time_mixed_precision",
      "valid_time_disjoint",
      "tolerance_ambiguity",
    ] as const;
    for (const reason of reasons) {
      const candidate = mutableRelationExemplar(base);
      candidate.relation = "unknown";
      candidate.uncertainty = { state: "uncertain", reason };
      candidate.unknownReason = reason;
      if (reason === "missing_geometry") {
        candidate.subject.geometryDigest = null;
      }
      if (reason === "valid_time_mixed_precision") {
        candidate.sharedValidTime = {
          state: "indeterminate",
          reason: "mixed_precision",
          factReferences: base.sharedValidTime.factReferences,
        };
      }
      if (reason === "valid_time_disjoint") {
        candidate.sharedValidTime = {
          state: "disjoint",
          factReferences: base.sharedValidTime.factReferences,
        };
      }
      expect(validateRelation(candidate), reason).toBe(true);
    }

    const disagreement = mutableRelationExemplar(base);
    disagreement.relation = "unknown";
    disagreement.uncertainty = {
      state: "uncertain",
      reason: "partial_coverage",
    };
    disagreement.unknownReason = "unknown_coverage";
    expect(validateRelation(disagreement)).toBe(false);

    const nullDigestLaundering = mutableRelationExemplar(base);
    nullDigestLaundering.subject.geometryDigest = null;
    expect(validateRelation(nullDigestLaundering)).toBe(false);
  });

  it("keeps jurisdiction evidence source-only and exactly supported", () => {
    const valid = jurisdictionEvidence();
    expect(validateJurisdictionEvidence(valid)).toBe(true);

    expect(
      validateJurisdictionEvidence({ ...valid, geometry: { minimum: [0, 0] } }),
    ).toBe(false);
    expect(
      validateJurisdictionEvidence({
        ...valid,
        sourceLabel: "Synthetic jurisdiction conclusion",
      }),
    ).toBe(false);
    expect(
      validateJurisdictionEvidence({
        ...valid,
        evidence: {
          ...valid.evidence,
          factReferences: valid.evidence.factReferences.slice(0, 1),
        },
      }),
    ).toBe(false);
  });
});

type FullDomain = "observation" | "relation" | "jurisdiction";
type KeywordFamily =
  | "required"
  | "additionalProperties"
  | "type"
  | "const"
  | "enum"
  | "pattern"
  | "format"
  | "minItems"
  | "maxItems"
  | "uniqueItems"
  | "minimum"
  | "maximum"
  | "integer"
  | "nullability"
  | "oneOf"
  | "if/then"
  | "propertyNames";

type Path = readonly (string | number)[];

interface FullExemplar {
  readonly domain: FullDomain;
  readonly value: unknown;
  readonly observations?: unknown;
}

interface ParityMutation {
  readonly name: string;
  readonly domain: FullDomain;
  readonly family: KeywordFamily;
  readonly branchTags: readonly string[];
  readonly make: () => FullExemplar;
  readonly mutate: (candidate: unknown) => unknown;
}

function fullObservationInput(
  fixtureSlug = "fixture-1001",
  overrides: Partial<SpatialObservationInput> = {},
): SpatialObservationInput {
  return {
    fixtureSlug,
    layerVersion: "1.2.3",
    axisOrder: ["synthetic_x", "synthetic_y"],
    geometry: { minimum: [-8, -8], maximum: [8, 8] },
    resolution: 1,
    observedTimeValue: {
      kind: "date_time",
      value: "3785-01-01T00:00:00Z",
    },
    validTimeValue: { kind: "date", value: "3785-01-03" },
    coverage: "complete_fixture_extent",
    uncertainty: { state: "certain" },
    retrievedAt: "3785-01-04T00:00:00Z",
    ...overrides,
  };
}

function fullObservationExemplar(
  overrides: Partial<SpatialObservationInput> = {},
): FullExemplar {
  return {
    domain: "observation",
    value: createSpatialObservation(
      fullObservationInput("fixture-1001", overrides),
    ),
  };
}

type RelationBranch = "determinate" | SpatialUnknownReason;

function fullRelationExemplar(
  branch: RelationBranch = "determinate",
): FullExemplar {
  let subjectOverrides: Partial<SpatialObservationInput> = {};
  let objectOverrides: Partial<SpatialObservationInput> = {
    geometry: { minimum: [-4, -4], maximum: [4, 4] },
  };
  let tolerance = 0;

  if (branch === "missing_geometry") {
    subjectOverrides = {
      coverage: "missing_fixture_geometry",
      uncertainty: { state: "uncertain", reason: "coverage_limitation" },
      geometry: null,
    };
  } else if (branch === "partial_coverage") {
    subjectOverrides = {
      coverage: "partial_fixture_extent",
      uncertainty: { state: "uncertain", reason: "coverage_limitation" },
    };
  } else if (branch === "unknown_coverage") {
    subjectOverrides = {
      coverage: "unknown",
      uncertainty: { state: "uncertain", reason: "coverage_limitation" },
    };
  } else if (branch === "observation_uncertain") {
    subjectOverrides = {
      uncertainty: { state: "uncertain", reason: "fixture_limitation" },
    };
  } else if (branch === "resolution_mismatch") {
    objectOverrides = {
      geometry: { minimum: [-4, -4], maximum: [4, 4] },
      resolution: 2,
    };
  } else if (branch === "valid_time_mixed_precision") {
    objectOverrides = {
      ...objectOverrides,
      validTimeValue: {
        kind: "date_time",
        value: "3785-01-03T00:00:00Z",
      },
    };
  } else if (branch === "valid_time_disjoint") {
    objectOverrides = {
      ...objectOverrides,
      validTimeValue: { kind: "date", value: "3785-01-04" },
    };
  } else if (branch === "tolerance_ambiguity") {
    subjectOverrides = {
      geometry: { minimum: [-4, -4], maximum: [4, 4] },
    };
    objectOverrides = {
      geometry: { minimum: [5, -4], maximum: [9, 4] },
    };
    tolerance = 1;
  }

  const subject = createSpatialObservation(
    fullObservationInput("fixture-1001", subjectOverrides),
  );
  const object = createSpatialObservation(
    fullObservationInput("fixture-1002", objectOverrides),
  );
  const observations = createSpatialObservationCollection([subject, object]);
  return {
    domain: "relation",
    value: createSpatialRelation(subject, object, { tolerance }),
    observations,
  };
}

function fullRelationWithValidTime(
  validTimeValue: SpatialObservationInput["validTimeValue"],
): FullExemplar {
  const subject = createSpatialObservation(
    fullObservationInput("fixture-1001", { validTimeValue }),
  );
  const object = createSpatialObservation(
    fullObservationInput("fixture-1002", {
      geometry: { minimum: [-4, -4], maximum: [4, 4] },
      validTimeValue,
    }),
  );
  const observations = createSpatialObservationCollection([subject, object]);
  return {
    domain: "relation",
    value: createSpatialRelation(subject, object, { tolerance: 0 }),
    observations,
  };
}

function fullJurisdictionExemplar(): FullExemplar {
  return {
    domain: "jurisdiction",
    value: createJurisdictionEvidence({
      fixtureSlug: "fixture-1042",
      retrievedAt: "3785-06-07T08:09:10-07:00",
    }),
  };
}

function recordAt(value: unknown, path: Path): Record<string, unknown> {
  let current = value;
  for (const segment of path) {
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current as Record<string, unknown>;
}

function arrayAt(value: unknown, path: Path): unknown[] {
  let current = value;
  for (const segment of path) {
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current as unknown[];
}

function setAt(value: unknown, path: Path, replacement: unknown): void {
  const parent = recordAt(value, path.slice(0, -1));
  parent[path.at(-1)!] = replacement;
}

function deleteAt(value: unknown, path: Path): void {
  const parent = recordAt(value, path.slice(0, -1));
  delete parent[path.at(-1)!];
}

function schemaFor(domain: FullDomain, value: unknown): boolean {
  if (domain === "observation") return Boolean(validateObservation(value));
  if (domain === "relation") return Boolean(validateRelation(value));
  return Boolean(validateJurisdictionEvidence(value));
}

function validateAtRuntime(exemplar: FullExemplar, value: unknown): unknown {
  if (exemplar.domain === "observation") {
    return validateSpatialObservation(value);
  }
  if (exemplar.domain === "relation") {
    return validateSpatialRelation(value, exemplar.observations);
  }
  return validateJurisdictionEvidenceRuntime(value);
}

const fullObjectMutations: ParityMutation[] = [];

function addMutation(
  name: string,
  family: KeywordFamily,
  branchTags: readonly string[],
  make: () => FullExemplar,
  mutate: (candidate: unknown) => unknown,
): void {
  const prefix = name.split(".", 1)[0];
  if (
    prefix !== "observation" &&
    prefix !== "relation" &&
    prefix !== "jurisdiction"
  ) {
    throw new TypeError(`mutation ${name} has no S0 domain prefix`);
  }
  fullObjectMutations.push({
    name,
    domain: prefix,
    family,
    branchTags,
    make,
    mutate,
  });
}

function addClosedObjectMutations(
  domain: FullDomain,
  rootName: string,
  make: () => FullExemplar,
  path: Path,
  keys: readonly string[],
  branchTags: readonly string[] = [],
): void {
  for (const key of keys) {
    addMutation(
      `${domain}.${rootName}.required.${key}`,
      "required",
      [`${domain}.root.${rootName}`, ...branchTags],
      make,
      (candidate) => deleteAt(candidate, [...path, key]),
    );
  }
  addMutation(
    `${domain}.${rootName}.additionalProperties`,
    "additionalProperties",
    [`${domain}.root.${rootName}`, ...branchTags],
    make,
    (candidate) => {
      recordAt(candidate, path).schemaAttack = true;
    },
  );
}

const observationRootKeys = [
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
const sourceFactKeys = [
  "contractVersion",
  "factId",
  "assertionClass",
  "sourceIdentity",
  "predicate",
  "value",
  "provenance",
  "factDigest",
] as const;
const provenanceKeys = [
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

addClosedObjectMutations(
  "observation",
  "spatialObservation",
  fullObservationExemplar,
  [],
  observationRootKeys,
);
addClosedObjectMutations(
  "observation",
  "sourceIdentity",
  fullObservationExemplar,
  ["sourceIdentity"],
  ["sourceId", "sourceRecordId"],
);
addClosedObjectMutations(
  "observation",
  "coordinateSpace",
  fullObservationExemplar,
  ["coordinateSpace"],
  ["id", "axes", "axisOrder", "unit", "representation"],
  ["observation.axisOrder.xy"],
);
addClosedObjectMutations(
  "observation",
  "box",
  fullObservationExemplar,
  ["geometry"],
  ["minimum", "maximum"],
  ["observation.geometry.present"],
);
addClosedObjectMutations(
  "observation",
  "certainObservation",
  fullObservationExemplar,
  ["uncertainty"],
  ["state"],
  ["observation.uncertainty.certain"],
);
addClosedObjectMutations(
  "observation",
  "completeUncertainObservation",
  () =>
    fullObservationExemplar({
      uncertainty: { state: "uncertain", reason: "fixture_limitation" },
    }),
  ["uncertainty"],
  ["state", "reason"],
  ["observation.uncertainty.complete_uncertain"],
);
addClosedObjectMutations(
  "observation",
  "coverageUncertainObservation",
  () =>
    fullObservationExemplar({
      coverage: "partial_fixture_extent",
      uncertainty: { state: "uncertain", reason: "coverage_limitation" },
    }),
  ["uncertainty"],
  ["state", "reason"],
  ["observation.uncertainty.coverage_uncertain"],
);
addClosedObjectMutations(
  "observation",
  "supportedTemporalAssertion",
  fullObservationExemplar,
  ["observedTime"],
  ["evidence", "value"],
  ["observation.temporal.observed.supported"],
);
addClosedObjectMutations(
  "observation",
  "singleSupportedEvidence",
  fullObservationExemplar,
  ["observedTime", "evidence"],
  ["state", "factReferences"],
  ["observation.temporal.observed.supported"],
);
addClosedObjectMutations(
  "observation",
  "factReference",
  fullObservationExemplar,
  ["observedTime", "evidence", "factReferences", 0],
  ["factId", "factDigest"],
);
addClosedObjectMutations(
  "observation",
  "dateTimeValue",
  fullObservationExemplar,
  ["observedTime", "value"],
  ["kind", "value"],
  ["observation.temporal.date_time"],
);
addClosedObjectMutations(
  "observation",
  "dateValue",
  fullObservationExemplar,
  ["validTime", "value"],
  ["kind", "value"],
  ["observation.temporal.date"],
);
const intervalObservation = () =>
  fullObservationExemplar({
    validTimeValue: {
      kind: "interval",
      start: { kind: "date", value: "3785-01-01", inclusive: true },
      end: { kind: "date", value: "3785-01-31", inclusive: false },
    },
  });
addClosedObjectMutations(
  "observation",
  "intervalValue",
  intervalObservation,
  ["validTime", "value"],
  ["kind", "start", "end"],
  ["observation.temporal.interval.date"],
);
addClosedObjectMutations(
  "observation",
  "dateEndpoint",
  intervalObservation,
  ["validTime", "value", "start"],
  ["kind", "value", "inclusive"],
  ["observation.temporal.interval.date"],
);
const dateTimeIntervalObservation = () =>
  fullObservationExemplar({
    validTimeValue: {
      kind: "interval",
      start: {
        kind: "date_time",
        value: "3785-01-01T00:00:00Z",
        inclusive: true,
      },
      end: {
        kind: "date_time",
        value: "3785-01-31T00:00:00Z",
        inclusive: false,
      },
    },
  });
addClosedObjectMutations(
  "observation",
  "dateTimeEndpoint",
  dateTimeIntervalObservation,
  ["validTime", "value", "start"],
  ["kind", "value", "inclusive"],
  ["observation.temporal.interval.date-time"],
);
addClosedObjectMutations(
  "observation",
  "factManifest",
  fullObservationExemplar,
  ["factManifest"],
  ["fragmentDigestFact", "observedTimeFact", "validTimeFact"],
);
addClosedObjectMutations(
  "observation",
  "sourceFact",
  fullObservationExemplar,
  ["factManifest", "observedTimeFact"],
  sourceFactKeys,
  ["k0.sourceFact"],
);
addClosedObjectMutations(
  "observation",
  "sourceProvenance",
  fullObservationExemplar,
  ["factManifest", "observedTimeFact", "provenance"],
  provenanceKeys,
  ["k0.sourceProvenance"],
);
addClosedObjectMutations(
  "observation",
  "sha256DigestValue",
  fullObservationExemplar,
  ["factManifest", "fragmentDigestFact", "value"],
  ["kind", "value"],
  ["k0.typedValue.sha256_digest"],
);

const relationRootKeys = [
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
addClosedObjectMutations(
  "relation",
  "spatialRelation",
  fullRelationExemplar,
  [],
  relationRootKeys,
  ["relation.result.determinate"],
);
addClosedObjectMutations(
  "relation",
  "observationReference",
  fullRelationExemplar,
  ["subject"],
  ["observationId", "observationDigest", "geometryDigest"],
  ["relation.reference.geometry.present"],
);
addClosedObjectMutations(
  "relation",
  "sharedValidTimeOverlap",
  fullRelationExemplar,
  ["sharedValidTime"],
  ["state", "value", "factReferences"],
  ["relation.sharedTime.overlap"],
);
addClosedObjectMutations(
  "relation",
  "sharedValidTimeIndeterminate",
  () => fullRelationExemplar("valid_time_mixed_precision"),
  ["sharedValidTime"],
  ["state", "reason", "factReferences"],
  ["relation.sharedTime.indeterminate"],
);
addClosedObjectMutations(
  "relation",
  "sharedValidTimeDisjoint",
  () => fullRelationExemplar("valid_time_disjoint"),
  ["sharedValidTime"],
  ["state", "factReferences"],
  ["relation.sharedTime.disjoint"],
);
addClosedObjectMutations(
  "relation",
  "algorithm",
  fullRelationExemplar,
  ["algorithm"],
  ["id", "version", "canonicalizationVersion", "tolerance", "unit"],
);
addClosedObjectMutations(
  "relation",
  "derivedAssertion",
  fullRelationExemplar,
  ["derivedAssertion"],
  [
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
  ],
  ["k0.derivedAssertion"],
);
addClosedObjectMutations(
  "relation",
  "sixSupportedEvidence",
  fullRelationExemplar,
  ["derivedAssertion", "evidence"],
  ["state", "factReferences"],
  ["k0.evidence.supported.six"],
);
addClosedObjectMutations(
  "relation",
  "factReference",
  fullRelationExemplar,
  ["derivedAssertion", "evidence", "factReferences", 0],
  ["factId", "factDigest"],
);
addClosedObjectMutations(
  "relation",
  "certainRelation",
  fullRelationExemplar,
  ["uncertainty"],
  ["state"],
  ["relation.uncertainty.certain"],
);
addClosedObjectMutations(
  "relation",
  "uncertainRelation",
  () => fullRelationExemplar("partial_coverage"),
  ["uncertainty"],
  ["state", "reason"],
  ["relation.uncertainty.uncertain"],
);

const jurisdictionRootKeys = [
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
addClosedObjectMutations(
  "jurisdiction",
  "jurisdictionEvidence",
  fullJurisdictionExemplar,
  [],
  jurisdictionRootKeys,
);
addClosedObjectMutations(
  "jurisdiction",
  "factManifest",
  fullJurisdictionExemplar,
  ["factManifest"],
  ["titleFact", "fragmentDigestFact"],
);
addClosedObjectMutations(
  "jurisdiction",
  "sourceIdentity",
  fullJurisdictionExemplar,
  ["sourceIdentity"],
  ["sourceId", "sourceRecordId"],
);
addClosedObjectMutations(
  "jurisdiction",
  "sourceFact",
  fullJurisdictionExemplar,
  ["factManifest", "titleFact"],
  sourceFactKeys,
  ["k0.sourceFact"],
);
addClosedObjectMutations(
  "jurisdiction",
  "sourceProvenance",
  fullJurisdictionExemplar,
  ["factManifest", "titleFact", "provenance"],
  provenanceKeys,
  ["k0.sourceProvenance"],
);
addClosedObjectMutations(
  "jurisdiction",
  "textValue",
  fullJurisdictionExemplar,
  ["factManifest", "titleFact", "value"],
  ["kind", "value"],
  ["k0.typedValue.text"],
);
addClosedObjectMutations(
  "jurisdiction",
  "twoSupportedEvidence",
  fullJurisdictionExemplar,
  ["evidence"],
  ["state", "factReferences"],
  ["k0.evidence.supported.two"],
);

const pathMutation = (
  name: string,
  domain: FullDomain,
  family: KeywordFamily,
  branches: readonly string[],
  make: () => FullExemplar,
  path: Path,
  replacement: unknown,
): void =>
  addMutation(name, family, branches, make, (candidate) =>
    setAt(candidate, path, replacement),
  );

for (const [domain, make] of [
  ["observation", fullObservationExemplar],
  ["relation", fullRelationExemplar],
  ["jurisdiction", fullJurisdictionExemplar],
] as const) {
  pathMutation(
    `${domain}.future-contract-version`,
    domain,
    "const",
    [`${domain}.contractVersion`],
    make,
    ["contractVersion"],
    "2.0.0",
  );
  pathMutation(
    `${domain}.experimental-false`,
    domain,
    "const",
    [`${domain}.markers`],
    make,
    ["experimental"],
    false,
  );
  pathMutation(
    `${domain}.synthetic-false`,
    domain,
    "const",
    [`${domain}.markers`],
    make,
    ["synthetic"],
    false,
  );
  pathMutation(
    `${domain}.fixture-class`,
    domain,
    "const",
    [`${domain}.markers`],
    make,
    ["fixtureClass"],
    "real_geometry",
  );
}

const observationConstantMutations: readonly [string, Path, unknown][] = [
  ["source-id", ["sourceIdentity", "sourceId"], "other-source"],
  ["coordinate-space-id", ["coordinateSpace", "id"], "future-crs"],
  [
    "coordinate-axes",
    ["coordinateSpace", "axes"],
    ["synthetic_y", "synthetic_x"],
  ],
  ["coordinate-unit", ["coordinateSpace", "unit"], "meters"],
  ["representation", ["coordinateSpace", "representation"], "GeoJSON"],
  ["attribution", ["attribution"], "Different attribution"],
  ["usage-basis", ["usageBasis"], "Different usage basis"],
  ["observed-evidence-state", ["observedTime", "evidence", "state"], "unknown"],
  ["observed-kind", ["observedTime", "value", "kind"], "date"],
  [
    "fact-contract-version",
    ["factManifest", "observedTimeFact", "contractVersion"],
    "2.0.0",
  ],
  [
    "fact-assertion-class",
    ["factManifest", "observedTimeFact", "assertionClass"],
    "derived",
  ],
  [
    "fragment-predicate",
    ["factManifest", "fragmentDigestFact", "predicate"],
    "valid_time",
  ],
  [
    "observed-predicate",
    ["factManifest", "observedTimeFact", "predicate"],
    "valid_time",
  ],
  [
    "valid-predicate",
    ["factManifest", "validTimeFact", "predicate"],
    "observed_time",
  ],
  [
    "fragment-value-kind",
    ["factManifest", "fragmentDigestFact", "value", "kind"],
    "text",
  ],
  [
    "root-source-path",
    ["factManifest", "fragmentDigestFact", "provenance", "sourcePath"],
    "$.geometry",
  ],
  [
    "observed-source-path",
    ["factManifest", "observedTimeFact", "provenance", "sourcePath"],
    "$",
  ],
  [
    "valid-source-path",
    ["factManifest", "validTimeFact", "provenance", "sourcePath"],
    "$",
  ],
  [
    "adapter-id",
    ["factManifest", "observedTimeFact", "provenance", "adapterId"],
    "other-adapter",
  ],
  [
    "adapter-version",
    ["factManifest", "observedTimeFact", "provenance", "adapterVersion"],
    "2.0.0",
  ],
  [
    "source-updated-null",
    ["factManifest", "observedTimeFact", "provenance", "sourceUpdatedAt"],
    "3785-01-01T00:00:00Z",
  ],
  [
    "validation-state",
    ["factManifest", "observedTimeFact", "provenance", "validationState"],
    "unvalidated",
  ],
];
for (const [label, path, replacement] of observationConstantMutations) {
  pathMutation(
    `observation.const.${label}`,
    "observation",
    "const",
    ["k0.nested.constants"],
    fullObservationExemplar,
    path,
    replacement,
  );
}

const relationConstantMutations: readonly [string, Path, unknown][] = [
  ["algorithm-id", ["algorithm", "id"], "other-topology"],
  ["algorithm-version", ["algorithm", "version"], "2.0.0"],
  ["algorithm-c14n", ["algorithm", "canonicalizationVersion"], "other-c14n"],
  ["algorithm-unit", ["algorithm", "unit"], "meters"],
  ["assertion-contract", ["derivedAssertion", "contractVersion"], "2.0.0"],
  [
    "assertion-class",
    ["derivedAssertion", "assertionClass"],
    "relationship_assertion",
  ],
  [
    "assertion-rule-id-regression",
    ["derivedAssertion", "ruleId"],
    "another-rule",
  ],
  ["assertion-rule-version", ["derivedAssertion", "ruleVersion"], "2.0.0"],
  [
    "assertion-c14n",
    ["derivedAssertion", "canonicalizationVersion"],
    "other-c14n",
  ],
  [
    "assertion-evidence-state",
    ["derivedAssertion", "evidence", "state"],
    "unknown",
  ],
  [
    "assertion-validation-state",
    ["derivedAssertion", "validationState"],
    "unvalidated",
  ],
  ["interpretation", ["interpretation"], "jurisdictional_relation"],
];
for (const [label, path, replacement] of relationConstantMutations) {
  pathMutation(
    `relation.const.${label}`,
    "relation",
    "const",
    ["k0.derivedAssertion.constants"],
    fullRelationExemplar,
    path,
    replacement,
  );
}

const jurisdictionConstantMutations: readonly [string, Path, unknown][] = [
  ["source-id", ["sourceIdentity", "sourceId"], "other-source"],
  ["source-label", ["sourceLabel"], "Synthetic jurisdiction conclusion"],
  ["synthetic-level", ["syntheticLevel"], "real_administrative_unit"],
  ["evidence-basis", ["evidenceBasis"], "geometry"],
  ["derivation", ["derivation"], "spatial"],
  ["review-state", ["reviewState"], "unreviewed"],
  ["attribution", ["attribution"], "Different attribution"],
  ["usage-basis", ["usageBasis"], "Different usage basis"],
  [
    "title-predicate",
    ["factManifest", "titleFact", "predicate"],
    "event_label",
  ],
  ["title-kind", ["factManifest", "titleFact", "value", "kind"], "identifier"],
  [
    "title-value",
    ["factManifest", "titleFact", "value", "value"],
    "Different title",
  ],
  [
    "title-path",
    ["factManifest", "titleFact", "provenance", "sourcePath"],
    "$",
  ],
  [
    "fragment-predicate",
    ["factManifest", "fragmentDigestFact", "predicate"],
    "instrument_title",
  ],
  [
    "fragment-path",
    ["factManifest", "fragmentDigestFact", "provenance", "sourcePath"],
    "$.sourceLabel",
  ],
  ["evidence-state", ["evidence", "state"], "unknown"],
];
for (const [label, path, replacement] of jurisdictionConstantMutations) {
  pathMutation(
    `jurisdiction.const.${label}`,
    "jurisdiction",
    "const",
    ["jurisdiction.source-only.constants"],
    fullJurisdictionExemplar,
    path,
    replacement,
  );
}

const patternMutations: readonly [
  string,
  FullDomain,
  () => FullExemplar,
  Path,
  unknown,
][] = [
  [
    "observation-id",
    "observation",
    fullObservationExemplar,
    ["observationId"],
    "s0-impossible:observation:XYZ",
  ],
  [
    "observation-digest",
    "observation",
    fullObservationExemplar,
    ["observationDigest"],
    "A".repeat(64),
  ],
  [
    "fixture-slug",
    "observation",
    fullObservationExemplar,
    ["fixtureSlug"],
    "fixture-place",
  ],
  [
    "source-record-id",
    "observation",
    fullObservationExemplar,
    ["sourceIdentity", "sourceRecordId"],
    "s0-impossible:fixture:fixture-place",
  ],
  [
    "layer-id",
    "observation",
    fullObservationExemplar,
    ["layerId"],
    "s0-impossible:layer:fixture-place",
  ],
  [
    "feature-id",
    "observation",
    fullObservationExemplar,
    ["featureId"],
    "s0-impossible:feature:fixture-place",
  ],
  [
    "layer-version-prerelease",
    "observation",
    fullObservationExemplar,
    ["layerVersion"],
    "1.2.3-beta",
  ],
  [
    "layer-version-build",
    "observation",
    fullObservationExemplar,
    ["layerVersion"],
    "1.2.3+build",
  ],
  [
    "sentinel-url-format",
    "observation",
    fullObservationExemplar,
    ["factManifest", "observedTimeFact", "provenance", "sourceUrl"],
    "not a uri",
  ],
  [
    "sentinel-url-pattern-port",
    "observation",
    fullObservationExemplar,
    ["factManifest", "observedTimeFact", "provenance", "sourceUrl"],
    "https://policy-sentinel.invalid:443/fixtures/s0/1.0.0/fixture-1001.json",
  ],
  [
    "retrieved-year",
    "observation",
    fullObservationExemplar,
    ["factManifest", "observedTimeFact", "provenance", "retrievedAt"],
    "3784-01-01T00:00:00Z",
  ],
  [
    "date-year",
    "observation",
    fullObservationExemplar,
    ["validTime", "value", "value"],
    "3784-01-03",
  ],
  [
    "date-time-lexeme",
    "observation",
    fullObservationExemplar,
    ["observedTime", "value", "value"],
    "3785-02-30T00:00:00Z",
  ],
  [
    "fact-id",
    "observation",
    fullObservationExemplar,
    ["factManifest", "observedTimeFact", "factId"],
    "not-a-fact-id",
  ],
  [
    "fact-digest",
    "observation",
    fullObservationExemplar,
    ["factManifest", "observedTimeFact", "factDigest"],
    "g".repeat(64),
  ],
  [
    "relation-id",
    "relation",
    fullRelationExemplar,
    ["relationId"],
    "s0-impossible:relation:XYZ",
  ],
  [
    "assertion-id",
    "relation",
    fullRelationExemplar,
    ["derivedAssertion", "assertionId"],
    "k0:spatial_relation:XYZ",
  ],
  [
    "jurisdiction-id",
    "jurisdiction",
    fullJurisdictionExemplar,
    ["jurisdictionEvidenceId"],
    "s0-impossible:jurisdiction-evidence:XYZ",
  ],
  [
    "administrative-unit-id",
    "jurisdiction",
    fullJurisdictionExemplar,
    ["administrativeUnitId"],
    "s0-impossible:administrative-unit:fixture-place",
  ],
  [
    "statement",
    "jurisdiction",
    fullJurisdictionExemplar,
    ["statement"],
    "Real place is assigned to real jurisdiction.",
  ],
];
for (const [label, domain, make, path, replacement] of patternMutations) {
  pathMutation(
    `${domain}.pattern.${label}`,
    domain,
    label === "sentinel-url-format" ? "format" : "pattern",
    [`${domain}.lexical.${label}`],
    make,
    path,
    replacement,
  );
}

const typeMutations: readonly [
  string,
  FullDomain,
  () => FullExemplar,
  Path,
  unknown,
][] = [
  ["observation-root", "observation", fullObservationExemplar, [], []],
  ["relation-root", "relation", fullRelationExemplar, [], []],
  ["jurisdiction-root", "jurisdiction", fullJurisdictionExemplar, [], []],
  ["string", "observation", fullObservationExemplar, ["fixtureSlug"], 1001],
  ["boolean", "observation", fullObservationExemplar, ["experimental"], "true"],
  ["object", "observation", fullObservationExemplar, ["coordinateSpace"], []],
  [
    "array",
    "observation",
    fullObservationExemplar,
    ["coordinateSpace", "axisOrder"],
    {},
  ],
  ["integer", "observation", fullObservationExemplar, ["resolution"], "1"],
  [
    "null-nonnullable",
    "jurisdiction",
    fullJurisdictionExemplar,
    ["statement"],
    null,
  ],
];
for (const [label, domain, make, path, replacement] of typeMutations) {
  addMutation(
    `${domain}.type.${label}`,
    "type",
    [`keyword.type.${label}`],
    make,
    (candidate) => {
      if (path.length === 0) {
        return replacement;
      } else {
        setAt(candidate, path, replacement);
      }
    },
  );
}

pathMutation(
  "observation.enum.coverage",
  "observation",
  "enum",
  ["observation.coverage.enum"],
  fullObservationExemplar,
  ["coverage"],
  "comprehensive",
);
pathMutation(
  "observation.enum.uncertainty-reason",
  "observation",
  "enum",
  ["observation.uncertainty.complete_uncertain"],
  () =>
    fullObservationExemplar({
      uncertainty: { state: "uncertain", reason: "fixture_limitation" },
    }),
  ["uncertainty", "reason"],
  "tolerance_ambiguity",
);
pathMutation(
  "observation.axis-order.xy-branch",
  "observation",
  "oneOf",
  ["observation.axisOrder.xy"],
  fullObservationExemplar,
  ["coordinateSpace", "axisOrder"],
  ["synthetic_y", "synthetic_y"],
);
pathMutation(
  "observation.axis-order.yx-branch",
  "observation",
  "oneOf",
  ["observation.axisOrder.yx"],
  () =>
    fullObservationExemplar({
      axisOrder: ["synthetic_y", "synthetic_x"],
      geometry: { minimum: [-8, -8], maximum: [8, 8] },
    }),
  ["coordinateSpace", "axisOrder"],
  ["synthetic_x", "synthetic_x"],
);
pathMutation(
  "relation.enum.relation",
  "relation",
  "enum",
  ["relation.kind.enum"],
  fullRelationExemplar,
  ["relation"],
  "overlaps",
);
pathMutation(
  "relation.enum.unknown-reason",
  "relation",
  "enum",
  ["relation.result.partial_coverage"],
  () => fullRelationExemplar("partial_coverage"),
  ["unknownReason"],
  "axis_error",
);

pathMutation(
  "observation.integer.resolution",
  "observation",
  "integer",
  ["observation.resolution.integer"],
  fullObservationExemplar,
  ["resolution"],
  1.5,
);
pathMutation(
  "observation.minimum.resolution",
  "observation",
  "minimum",
  ["observation.resolution.bounds"],
  fullObservationExemplar,
  ["resolution"],
  0,
);
pathMutation(
  "observation.maximum.resolution",
  "observation",
  "maximum",
  ["observation.resolution.bounds"],
  fullObservationExemplar,
  ["resolution"],
  9,
);
pathMutation(
  "observation.minimum.coordinate",
  "observation",
  "minimum",
  ["observation.coordinate.bounds"],
  fullObservationExemplar,
  ["geometry", "minimum", 0],
  -33,
);
pathMutation(
  "observation.maximum.coordinate",
  "observation",
  "maximum",
  ["observation.coordinate.bounds"],
  fullObservationExemplar,
  ["geometry", "maximum", 0],
  33,
);
pathMutation(
  "relation.integer.tolerance",
  "relation",
  "integer",
  ["relation.tolerance.integer"],
  fullRelationExemplar,
  ["algorithm", "tolerance"],
  0.5,
);
pathMutation(
  "relation.minimum.tolerance",
  "relation",
  "minimum",
  ["relation.tolerance.bounds"],
  fullRelationExemplar,
  ["algorithm", "tolerance"],
  -1,
);
pathMutation(
  "relation.maximum.tolerance",
  "relation",
  "maximum",
  ["relation.tolerance.bounds"],
  fullRelationExemplar,
  ["algorithm", "tolerance"],
  3,
);

addMutation(
  "observation.coordinate-pair.minItems",
  "minItems",
  ["observation.coordinatePair"],
  fullObservationExemplar,
  (candidate) => {
    arrayAt(candidate, ["geometry", "minimum"]).pop();
  },
);
addMutation(
  "observation.coordinate-pair.maxItems",
  "maxItems",
  ["observation.coordinatePair"],
  fullObservationExemplar,
  (candidate) => {
    arrayAt(candidate, ["geometry", "minimum"]).push(0);
  },
);
addMutation(
  "observation.temporal-reference.minItems",
  "minItems",
  ["observation.temporal.observed.supported"],
  fullObservationExemplar,
  (candidate) => {
    arrayAt(candidate, ["observedTime", "evidence", "factReferences"]).pop();
  },
);
addMutation(
  "observation.temporal-reference.maxItems-regression",
  "maxItems",
  ["observation.temporal.observed.supported"],
  fullObservationExemplar,
  (candidate) => {
    const references = arrayAt(candidate, [
      "observedTime",
      "evidence",
      "factReferences",
    ]);
    references.push(clone(references[0]));
  },
);
for (const [label, path] of [
  ["inputFactIds", ["derivedAssertion", "inputFactIds"]],
  ["inputFactDigests", ["derivedAssertion", "inputFactDigests"]],
  ["assertionEvidence", ["derivedAssertion", "evidence", "factReferences"]],
] as const) {
  addMutation(
    `relation.${label}.minItems`,
    "minItems",
    ["k0.derivedAssertion.six-inputs"],
    fullRelationExemplar,
    (candidate) => {
      arrayAt(candidate, path).pop();
    },
  );
  addMutation(
    `relation.${label}.maxItems`,
    "maxItems",
    ["k0.derivedAssertion.six-inputs"],
    fullRelationExemplar,
    (candidate) => {
      const values = arrayAt(candidate, path);
      values.push(clone(values[0]));
    },
  );
  addMutation(
    `relation.${label}.uniqueItems`,
    "uniqueItems",
    ["k0.derivedAssertion.six-inputs"],
    fullRelationExemplar,
    (candidate) => {
      const values = arrayAt(candidate, path);
      values[1] = clone(values[0]);
    },
  );
}
for (const [label, make, path] of [
  [
    "shared-overlap",
    fullRelationExemplar,
    ["sharedValidTime", "factReferences"],
  ],
  [
    "shared-indeterminate",
    () => fullRelationExemplar("valid_time_mixed_precision"),
    ["sharedValidTime", "factReferences"],
  ],
  [
    "shared-disjoint",
    () => fullRelationExemplar("valid_time_disjoint"),
    ["sharedValidTime", "factReferences"],
  ],
] as const) {
  addMutation(
    `relation.${label}.uniqueItems`,
    "uniqueItems",
    [`relation.${label}`],
    make,
    (candidate) => {
      const values = arrayAt(candidate, path);
      values[1] = clone(values[0]);
    },
  );
}
addMutation(
  "jurisdiction.evidence.minItems",
  "minItems",
  ["k0.evidence.supported.two"],
  fullJurisdictionExemplar,
  (candidate) => {
    arrayAt(candidate, ["evidence", "factReferences"]).pop();
  },
);
addMutation(
  "jurisdiction.evidence.maxItems",
  "maxItems",
  ["k0.evidence.supported.two"],
  fullJurisdictionExemplar,
  (candidate) => {
    const values = arrayAt(candidate, ["evidence", "factReferences"]);
    values.push(clone(values[0]));
  },
);
addMutation(
  "jurisdiction.evidence.uniqueItems",
  "uniqueItems",
  ["k0.evidence.supported.two"],
  fullJurisdictionExemplar,
  (candidate) => {
    const values = arrayAt(candidate, ["evidence", "factReferences"]);
    values[1] = clone(values[0]);
  },
);

pathMutation(
  "observation.geometry.null-only",
  "observation",
  "nullability",
  ["observation.geometry.null", "observation.matrix.geometry-digest-asymmetry"],
  fullObservationExemplar,
  ["geometry"],
  null,
);
pathMutation(
  "observation.digest.null-only",
  "observation",
  "nullability",
  [
    "observation.digest.string",
    "observation.digest.null",
    "observation.matrix.geometry-digest-asymmetry",
  ],
  fullObservationExemplar,
  ["geometryDigest"],
  null,
);
pathMutation(
  "relation.unknownReason.non-null-determinate",
  "relation",
  "nullability",
  ["relation.unknownReason.null", "relation.result.determinate"],
  fullRelationExemplar,
  ["unknownReason"],
  "partial_coverage",
);
pathMutation(
  "relation.unknownReason.null-unknown",
  "relation",
  "nullability",
  ["relation.unknownReason.enum", "relation.result.partial_coverage"],
  () => fullRelationExemplar("partial_coverage"),
  ["unknownReason"],
  null,
);

const matrixCases: readonly [
  string,
  Partial<SpatialObservationInput>,
  (candidate: unknown) => void,
][] = [
  ["complete-certain", {}, (candidate) => setAt(candidate, ["geometry"], null)],
  [
    "complete-uncertain-fixture",
    { uncertainty: { state: "uncertain", reason: "fixture_limitation" } },
    (candidate) => setAt(candidate, ["coverage"], "partial_fixture_extent"),
  ],
  [
    "complete-uncertain-coordinate",
    { uncertainty: { state: "uncertain", reason: "coordinate_limitation" } },
    (candidate) => setAt(candidate, ["coverage"], "partial_fixture_extent"),
  ],
  [
    "complete-uncertain-temporal",
    { uncertainty: { state: "uncertain", reason: "temporal_limitation" } },
    (candidate) => setAt(candidate, ["coverage"], "partial_fixture_extent"),
  ],
  [
    "partial",
    {
      coverage: "partial_fixture_extent",
      uncertainty: { state: "uncertain", reason: "coverage_limitation" },
    },
    (candidate) => setAt(candidate, ["uncertainty"], { state: "certain" }),
  ],
  [
    "missing",
    {
      coverage: "missing_fixture_geometry",
      uncertainty: { state: "uncertain", reason: "coverage_limitation" },
      geometry: null,
    },
    (candidate) =>
      setAt(candidate, ["geometry"], { minimum: [-8, -8], maximum: [8, 8] }),
  ],
  [
    "unknown",
    {
      coverage: "unknown",
      uncertainty: { state: "uncertain", reason: "coverage_limitation" },
    },
    (candidate) => {
      setAt(candidate, ["geometry"], null);
      setAt(candidate, ["geometryDigest"], null);
    },
  ],
];
for (const [label, overrides, mutate] of matrixCases) {
  addMutation(
    `observation.matrix.${label}`,
    "oneOf",
    [
      `observation.matrix.${label}`,
      ...(label === "missing"
        ? ["observation.geometry.null", "observation.digest.null"]
        : []),
    ],
    () => fullObservationExemplar(overrides),
    mutate,
  );
}
for (let resolution = 1; resolution <= 8; resolution += 1) {
  addMutation(
    `observation.resolution-branch-${resolution}`,
    "if/then",
    [`observation.resolution.${resolution}`],
    () =>
      fullObservationExemplar({
        resolution,
        geometry: {
          minimum: [-resolution, -resolution],
          maximum: [resolution, resolution],
        },
      }),
    (candidate) =>
      setAt(
        candidate,
        ["geometry", "minimum", 0],
        resolution === 1 ? -32.5 : 1,
      ),
  );
}

const temporalUnionCases: readonly [
  string,
  Partial<SpatialObservationInput>,
  Path,
  unknown,
][] = [
  ["date", {}, ["validTime", "value", "kind"], "identifier"],
  [
    "date-time",
    { validTimeValue: { kind: "date_time", value: "3785-01-03T00:00:00Z" } },
    ["validTime", "value", "kind"],
    "identifier",
  ],
  [
    "interval-date",
    {
      validTimeValue: {
        kind: "interval",
        start: { kind: "date", value: "3785-01-01", inclusive: true },
        end: { kind: "date", value: "3785-01-31", inclusive: true },
      },
    },
    ["validTime", "value", "end", "kind"],
    "date_time",
  ],
  [
    "interval-date-time",
    {
      validTimeValue: {
        kind: "interval",
        start: {
          kind: "date_time",
          value: "3785-01-01T00:00:00Z",
          inclusive: true,
        },
        end: {
          kind: "date_time",
          value: "3785-01-31T00:00:00Z",
          inclusive: true,
        },
      },
    },
    ["validTime", "value", "end", "kind"],
    "date",
  ],
  [
    "interval-open-start",
    {
      validTimeValue: {
        kind: "interval",
        start: null,
        end: { kind: "date", value: "3785-01-31", inclusive: true },
      },
    },
    ["validTime", "value", "start"],
    "open",
  ],
  [
    "interval-open-end",
    {
      validTimeValue: {
        kind: "interval",
        start: { kind: "date", value: "3785-01-01", inclusive: true },
        end: null,
      },
    },
    ["validTime", "value", "end"],
    "open",
  ],
];
for (const [label, overrides, path, replacement] of temporalUnionCases) {
  pathMutation(
    `observation.temporal-union.${label}`,
    "observation",
    "oneOf",
    [`observation.temporal.${label}`],
    () => fullObservationExemplar(overrides),
    path,
    replacement,
  );
}

const relationTemporalUnionCases: readonly [
  string,
  SpatialObservationInput["validTimeValue"],
  Path,
  unknown,
][] = [
  [
    "date",
    { kind: "date", value: "3785-01-03" },
    ["sharedValidTime", "value", "kind"],
    "identifier",
  ],
  [
    "date-time",
    { kind: "date_time", value: "3785-01-03T00:00:00Z" },
    ["sharedValidTime", "value", "kind"],
    "identifier",
  ],
  [
    "interval-date",
    {
      kind: "interval",
      start: { kind: "date", value: "3785-01-01", inclusive: true },
      end: { kind: "date", value: "3785-01-31", inclusive: true },
    },
    ["sharedValidTime", "value", "end", "kind"],
    "date_time",
  ],
  [
    "interval-date-time",
    {
      kind: "interval",
      start: {
        kind: "date_time",
        value: "3785-01-01T00:00:00Z",
        inclusive: true,
      },
      end: {
        kind: "date_time",
        value: "3785-01-31T00:00:00Z",
        inclusive: true,
      },
    },
    ["sharedValidTime", "value", "end", "kind"],
    "date",
  ],
];
for (const [
  label,
  validTimeValue,
  path,
  replacement,
] of relationTemporalUnionCases) {
  pathMutation(
    `relation.temporal-union.${label}`,
    "relation",
    "oneOf",
    [`relation.temporal.${label}`],
    () => fullRelationWithValidTime(validTimeValue),
    path,
    replacement,
  );
}

pathMutation(
  "observation.temporal.unsupported-state-regression",
  "observation",
  "oneOf",
  ["observation.temporal.supported-only"],
  fullObservationExemplar,
  ["observedTime", "evidence"],
  {
    state: "unknown",
    reason: "unsupported temporal evidence",
    factReferences: [],
  },
);
addMutation(
  "observation.temporal.multiple-references-regression",
  "maxItems",
  ["observation.temporal.single-reference"],
  fullObservationExemplar,
  (candidate) => {
    const references = arrayAt(candidate, [
      "validTime",
      "evidence",
      "factReferences",
    ]);
    references.push(clone(references[0]));
  },
);

for (const branch of [
  "determinate",
  "missing_geometry",
  "partial_coverage",
  "unknown_coverage",
  "observation_uncertain",
  "resolution_mismatch",
  "valid_time_mixed_precision",
  "valid_time_disjoint",
  "tolerance_ambiguity",
] as const) {
  pathMutation(
    `relation.result-branch.${branch}`,
    "relation",
    "oneOf",
    [
      `relation.result.${branch}`,
      ...(branch === "missing_geometry"
        ? ["relation.reference.geometry.null"]
        : []),
    ],
    () => fullRelationExemplar(branch),
    ["unknownReason"],
    branch === "determinate" ? "partial_coverage" : null,
  );
}
for (const branch of [
  "missing_geometry",
  "partial_coverage",
  "unknown_coverage",
  "observation_uncertain",
  "resolution_mismatch",
  "valid_time_mixed_precision",
  "valid_time_disjoint",
  "tolerance_ambiguity",
] as const) {
  pathMutation(
    `relation.uncertainty-reason-branch.${branch}`,
    "relation",
    "oneOf",
    [`relation.uncertainty.reason.${branch}`],
    () => fullRelationExemplar(branch),
    ["uncertainty", "reason"],
    branch === "missing_geometry" ? "partial_coverage" : "missing_geometry",
  );
}

pathMutation(
  "relation.shared-time.overlap-branch",
  "relation",
  "oneOf",
  ["relation.sharedTime.overlap"],
  fullRelationExemplar,
  ["sharedValidTime", "state"],
  "disjoint",
);
pathMutation(
  "relation.shared-time.indeterminate-branch",
  "relation",
  "oneOf",
  ["relation.sharedTime.indeterminate"],
  () => fullRelationExemplar("valid_time_mixed_precision"),
  ["sharedValidTime", "reason"],
  "other_precision",
);
pathMutation(
  "relation.shared-time.disjoint-branch",
  "relation",
  "oneOf",
  ["relation.sharedTime.disjoint"],
  () => fullRelationExemplar("valid_time_disjoint"),
  ["sharedValidTime", "state"],
  "overlap",
);

for (const [name, path, attack] of [
  ["geojson-type", ["geometry", "type"], "Polygon"],
  ["geojson-coordinates", ["geometry", "coordinates"], []],
  ["geojson-properties", ["geometry", "properties"], {}],
] as const) {
  addMutation(
    `observation.attack.${name}`,
    "additionalProperties",
    ["attack.GeoJSON", `attack.${name}`],
    fullObservationExemplar,
    (candidate) => setAt(candidate, path, attack),
  );
}
addMutation(
  "observation.attack.feature-collection",
  "additionalProperties",
  ["attack.FeatureCollection"],
  fullObservationExemplar,
  (candidate) => {
    recordAt(candidate, []).features = [];
  },
);
addMutation(
  "observation.attack.root-properties",
  "additionalProperties",
  ["attack.properties"],
  fullObservationExemplar,
  (candidate) => {
    recordAt(candidate, []).properties = { jurisdiction: "smuggled" };
  },
);
addMutation(
  "jurisdiction.attack.geometry",
  "additionalProperties",
  ["attack.geometry-to-statement"],
  fullJurisdictionExemplar,
  (candidate) => {
    recordAt(candidate, []).geometry = { type: "Polygon", coordinates: [] };
  },
);
addMutation(
  "observation.recursive-protected-key",
  "propertyNames",
  ["attack.recursive-protected-key"],
  fullObservationExemplar,
  (candidate) => {
    recordAt(candidate, [
      "factManifest",
      "observedTimeFact",
      "value",
    ]).legalEffect = "claimed";
  },
);

const expectedKeywordFamilies: readonly KeywordFamily[] = [
  "required",
  "additionalProperties",
  "type",
  "const",
  "enum",
  "pattern",
  "format",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minimum",
  "maximum",
  "integer",
  "nullability",
  "oneOf",
  "if/then",
  "propertyNames",
];
const expectedBranchCoverage = [
  "observation.matrix.complete-certain",
  "observation.matrix.complete-uncertain-fixture",
  "observation.matrix.complete-uncertain-coordinate",
  "observation.matrix.complete-uncertain-temporal",
  "observation.matrix.partial",
  "observation.matrix.missing",
  "observation.matrix.unknown",
  ...Array.from(
    { length: 8 },
    (_, index) => `observation.resolution.${index + 1}`,
  ),
  "observation.temporal.date",
  "observation.temporal.date-time",
  "observation.temporal.interval-date",
  "observation.temporal.interval-date-time",
  "observation.temporal.interval-open-start",
  "observation.temporal.interval-open-end",
  "observation.temporal.supported-only",
  "observation.temporal.single-reference",
  "observation.axisOrder.xy",
  "observation.axisOrder.yx",
  "relation.result.determinate",
  "relation.result.missing_geometry",
  "relation.result.partial_coverage",
  "relation.result.unknown_coverage",
  "relation.result.observation_uncertain",
  "relation.result.resolution_mismatch",
  "relation.result.valid_time_mixed_precision",
  "relation.result.valid_time_disjoint",
  "relation.result.tolerance_ambiguity",
  "relation.uncertainty.reason.missing_geometry",
  "relation.uncertainty.reason.partial_coverage",
  "relation.uncertainty.reason.unknown_coverage",
  "relation.uncertainty.reason.observation_uncertain",
  "relation.uncertainty.reason.resolution_mismatch",
  "relation.uncertainty.reason.valid_time_mixed_precision",
  "relation.uncertainty.reason.valid_time_disjoint",
  "relation.uncertainty.reason.tolerance_ambiguity",
  "relation.sharedTime.overlap",
  "relation.sharedTime.indeterminate",
  "relation.sharedTime.disjoint",
  "relation.temporal.date",
  "relation.temporal.date-time",
  "relation.temporal.interval-date",
  "relation.temporal.interval-date-time",
  "observation.geometry.present",
  "observation.geometry.null",
  "observation.digest.null",
  "observation.digest.string",
  "relation.unknownReason.null",
  "relation.unknownReason.enum",
  "relation.reference.geometry.null",
  "k0.sourceFact",
  "k0.sourceProvenance",
  "k0.derivedAssertion",
  "k0.typedValue.sha256_digest",
  "k0.typedValue.text",
  "k0.evidence.supported.six",
  "k0.evidence.supported.two",
  "attack.GeoJSON",
  "attack.FeatureCollection",
  "attack.properties",
  "attack.recursive-protected-key",
] as const;
const expectedMutationCounts: Readonly<Record<KeywordFamily, number>> = {
  required: 170,
  additionalProperties: 43,
  type: 9,
  const: 61,
  enum: 4,
  pattern: 19,
  format: 1,
  minItems: 6,
  maxItems: 7,
  uniqueItems: 7,
  minimum: 3,
  maximum: 3,
  integer: 2,
  nullability: 4,
  oneOf: 40,
  "if/then": 8,
  propertyNames: 1,
};

describe("S0 deterministic bounded full-object schema/runtime parity catalog", () => {
  it("covers every schema keyword family, closed-object root, union, and matrix branch", () => {
    for (const [index, entry] of fullObjectMutations.entries()) {
      expect(typeof entry.name, `mutation[${index}].name`).toBe("string");
      expect(
        ["observation", "relation", "jurisdiction"],
        `mutation[${index}].domain`,
      ).toContain(entry.domain);
      expect(expectedKeywordFamilies, `mutation[${index}].family`).toContain(
        entry.family,
      );
      expect(
        Array.isArray(entry.branchTags),
        `mutation[${index}].branchTags`,
      ).toBe(true);
      expect(typeof entry.make, `mutation[${index}].make`).toBe("function");
      expect(typeof entry.mutate, `mutation[${index}].mutate`).toBe("function");
    }

    const keywordFamilies = new Set(
      fullObjectMutations.map((entry) => entry.family),
    );
    const branchTags = new Set(
      fullObjectMutations.flatMap((entry) => entry.branchTags),
    );
    expect([...keywordFamilies].sort()).toEqual(
      [...expectedKeywordFamilies].sort(),
    );
    const actualCounts = Object.fromEntries(
      expectedKeywordFamilies.map((family) => [
        family,
        fullObjectMutations.filter((entry) => entry.family === family).length,
      ]),
    );
    expect(actualCounts).toEqual(expectedMutationCounts);
    expect(fullObjectMutations).toHaveLength(388);
    expect(
      expectedBranchCoverage.filter((branch) => !branchTags.has(branch)),
    ).toEqual([]);

    const closedRoots = new Set(
      fullObjectMutations
        .flatMap((entry) => entry.branchTags)
        .filter((branch) => branch.includes(".root.")),
    );
    expect([...closedRoots].sort()).toEqual(
      [
        "jurisdiction.root.factManifest",
        "jurisdiction.root.jurisdictionEvidence",
        "jurisdiction.root.sourceIdentity",
        "jurisdiction.root.sourceFact",
        "jurisdiction.root.sourceProvenance",
        "jurisdiction.root.textValue",
        "jurisdiction.root.twoSupportedEvidence",
        "observation.root.box",
        "observation.root.certainObservation",
        "observation.root.completeUncertainObservation",
        "observation.root.coordinateSpace",
        "observation.root.coverageUncertainObservation",
        "observation.root.dateEndpoint",
        "observation.root.dateTimeValue",
        "observation.root.dateTimeEndpoint",
        "observation.root.dateValue",
        "observation.root.factManifest",
        "observation.root.factReference",
        "observation.root.intervalValue",
        "observation.root.sha256DigestValue",
        "observation.root.singleSupportedEvidence",
        "observation.root.sourceFact",
        "observation.root.sourceIdentity",
        "observation.root.sourceProvenance",
        "observation.root.spatialObservation",
        "observation.root.supportedTemporalAssertion",
        "relation.root.algorithm",
        "relation.root.certainRelation",
        "relation.root.derivedAssertion",
        "relation.root.factReference",
        "relation.root.observationReference",
        "relation.root.sharedValidTimeDisjoint",
        "relation.root.sharedValidTimeIndeterminate",
        "relation.root.sharedValidTimeOverlap",
        "relation.root.sixSupportedEvidence",
        "relation.root.spatialRelation",
        "relation.root.uncertainRelation",
      ].sort(),
    );
  });

  it("rejects every named schema-invalid mutation in both schema and full runtime", () => {
    expect(new Set(fullObjectMutations.map((entry) => entry.name)).size).toBe(
      fullObjectMutations.length,
    );
    for (const mutation of fullObjectMutations) {
      const exemplar = mutation.make();
      expect(
        schemaFor(exemplar.domain, exemplar.value),
        `${mutation.name}: baseline schema`,
      ).toBe(true);
      expect(
        acceptedByRuntime(() => validateAtRuntime(exemplar, exemplar.value)),
        `${mutation.name}: baseline runtime`,
      ).toBe(true);

      const candidate = clone(exemplar.value);
      const mutationResult = mutation.mutate(candidate);
      const mutated = mutationResult === undefined ? candidate : mutationResult;
      expect(
        schemaFor(exemplar.domain, mutated),
        `${mutation.name}: ${
          exemplar.domain === "observation"
            ? ajv.errorsText(validateObservation.errors)
            : exemplar.domain === "relation"
              ? ajv.errorsText(validateRelation.errors)
              : ajv.errorsText(validateJurisdictionEvidence.errors)
        }`,
      ).toBe(false);
      expect(
        acceptedByRuntime(() => validateAtRuntime(exemplar, mutated)),
        `${mutation.name}: full runtime accepted schema-invalid input`,
      ).toBe(false);
    }
  }, 30_000);

  it("keeps schema-valid semantic and replay mutations explicitly separate", () => {
    const semanticOnly: readonly ParityMutation[] = [
      {
        name: "observation.semantic.inverted-bounds",
        domain: "observation",
        family: "oneOf",
        branchTags: ["runtime-only.bounds-order"],
        make: fullObservationExemplar,
        mutate: (candidate) =>
          setAt(candidate, ["geometry"], {
            minimum: [8, -8],
            maximum: [-8, 8],
          }),
      },
      {
        name: "observation.replay.geometry-digest",
        domain: "observation",
        family: "pattern",
        branchTags: ["runtime-only.geometry-digest-replay"],
        make: fullObservationExemplar,
        mutate: (candidate) =>
          setAt(candidate, ["geometryDigest"], "0".repeat(64)),
      },
      {
        name: "observation.semantic.namespace-cross-field",
        domain: "observation",
        family: "pattern",
        branchTags: ["runtime-only.namespace-consistency"],
        make: fullObservationExemplar,
        mutate: (candidate) =>
          setAt(candidate, ["layerId"], "s0-impossible:layer:fixture-9999"),
      },
      {
        name: "relation.semantic.context-reference",
        domain: "relation",
        family: "pattern",
        branchTags: ["runtime-only.exact-observation-context"],
        make: fullRelationExemplar,
        mutate: (candidate) =>
          setAt(candidate, ["subject", "observationDigest"], "0".repeat(64)),
      },
      {
        name: "relation.replay.result-digest",
        domain: "relation",
        family: "pattern",
        branchTags: ["runtime-only.result-digest-replay"],
        make: fullRelationExemplar,
        mutate: (candidate) =>
          setAt(
            candidate,
            ["derivedAssertion", "resultDigest"],
            "0".repeat(64),
          ),
      },
      {
        name: "jurisdiction.semantic.statement-cross-field",
        domain: "jurisdiction",
        family: "pattern",
        branchTags: ["runtime-only.statement-consistency"],
        make: fullJurisdictionExemplar,
        mutate: (candidate) =>
          setAt(
            candidate,
            ["statement"],
            "Impossible synthetic source statement: s0-impossible:feature:fixture-9999 is assigned to s0-impossible:administrative-unit:fixture-1042 in this fixture only.",
          ),
      },
      {
        name: "jurisdiction.replay.statement-digest",
        domain: "jurisdiction",
        family: "pattern",
        branchTags: ["runtime-only.statement-digest-replay"],
        make: fullJurisdictionExemplar,
        mutate: (candidate) =>
          setAt(candidate, ["statementDigest"], "0".repeat(64)),
      },
    ];

    expect(semanticOnly).toHaveLength(7);
    for (const mutation of semanticOnly) {
      const exemplar = mutation.make();
      const candidate = clone(exemplar.value);
      const mutationResult = mutation.mutate(candidate);
      const mutated = mutationResult === undefined ? candidate : mutationResult;
      expect(
        schemaFor(exemplar.domain, mutated),
        `${mutation.name}: intentionally schema-valid`,
      ).toBe(true);
      expect(
        acceptedByRuntime(() => validateAtRuntime(exemplar, mutated)),
        `${mutation.name}: runtime replay must reject`,
      ).toBe(false);
    }
  });
});
