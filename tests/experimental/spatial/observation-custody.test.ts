import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import assertionSchema from "../../../schemas/assertion.schema.v1.json";
import spatialObservationSchema from "../../../schemas/experimental/spatial-observation.schema.v1.json";
import {
  canonicalJsonDigest,
  canonicalizeJson,
  createSourceFact,
  validateSourceFact,
  type SourceFactPredicate,
  type SourceFactValue,
  type SourceProvenance,
  type SourceQualifiedIdentity,
} from "../../../src/kernel/assertions";
import {
  createSpatialObservation,
  createSpatialObservationCollection,
  normalizedBoundsForObservation,
  validateSpatialObservation,
  validateSpatialObservationCollection,
} from "../../../src/experimental/spatial/observation";
import type {
  ObservationCoverage,
  ObservationUncertainty,
  SpatialObservationInput,
} from "../../../src/experimental/spatial/types";

const root = resolve(import.meta.dirname, "..", "..", "..");
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(assertionSchema);
const validateObservationSchema = ajv.compile(spatialObservationSchema);

function mutableClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function observationInput(
  fixtureSlug = "fixture-0001",
  overrides: Partial<SpatialObservationInput> = {},
): SpatialObservationInput {
  return {
    fixtureSlug,
    layerVersion: "1.2.3",
    axisOrder: ["synthetic_x", "synthetic_y"],
    geometry: { minimum: [-4, -2], maximum: [6, 8] },
    resolution: 2,
    observedTimeValue: {
      kind: "date_time",
      value: "3785-01-02T03:04:05-07:00",
    },
    validTimeValue: { kind: "date", value: "3785-01-03" },
    coverage: "complete_fixture_extent",
    uncertainty: { state: "certain" },
    retrievedAt: "3785-01-04T05:06:07Z",
    ...overrides,
  };
}

function assertSchemaValid(observation: unknown): void {
  expect(
    validateObservationSchema(observation),
    ajv.errorsText(validateObservationSchema.errors),
  ).toBe(true);
}

type ObservationFactKey =
  "fragmentDigestFact" | "observedTimeFact" | "validTimeFact";

interface ObservationTamperCase {
  name: string;
  mutate: (candidate: Record<string, unknown>) => void;
  schemaRejects?: true;
  expectedError?: RegExp;
}

function nestedObject(
  object: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return object[key] as Record<string, unknown>;
}

function observationFact(
  candidate: Record<string, unknown>,
  key: ObservationFactKey,
): Record<string, unknown> {
  return nestedObject(nestedObject(candidate, "factManifest"), key);
}

function factProvenance(
  candidate: Record<string, unknown>,
  key: ObservationFactKey,
): Record<string, unknown> {
  return nestedObject(observationFact(candidate, key), "provenance");
}

function temporalEvidence(
  candidate: Record<string, unknown>,
  key: "observedTime" | "validTime",
): Record<string, unknown> {
  return nestedObject(nestedObject(candidate, key), "evidence");
}

function rebuildObservationFact(
  candidate: Record<string, unknown>,
  key: ObservationFactKey,
): void {
  const fact = observationFact(candidate, key);
  const rebuilt = createSourceFact({
    sourceIdentity: fact.sourceIdentity as SourceQualifiedIdentity,
    predicate: fact.predicate as SourceFactPredicate,
    value: fact.value as SourceFactValue,
    provenance: fact.provenance as SourceProvenance,
  });
  nestedObject(candidate, "factManifest")[key] = rebuilt;

  const assertionKey =
    key === "observedTimeFact"
      ? "observedTime"
      : key === "validTimeFact"
        ? "validTime"
        : null;
  if (assertionKey !== null) {
    temporalEvidence(candidate, assertionKey).factReferences = [
      { factId: rebuilt.factId, factDigest: rebuilt.factDigest },
    ];
  }
}

const observationTamperCases: readonly ObservationTamperCase[] = [
  {
    name: "$.factManifest.observedTimeFact.predicate rejects a wrong fact predicate",
    schemaRejects: true,
    expectedError: /fact does not match exact S0 fragment custody/,
    mutate: (candidate) => {
      observationFact(candidate, "observedTimeFact").predicate = "valid_time";
      rebuildObservationFact(candidate, "observedTimeFact");
    },
  },
  {
    name: "$.factManifest.validTimeFact.value.kind rejects a wrong K0-valid fact value kind",
    expectedError: /fact does not match exact S0 fragment custody/,
    mutate: (candidate) => {
      observationFact(candidate, "validTimeFact").value = {
        kind: "date_time",
        value: "3785-01-03T00:00:00Z",
      };
      rebuildObservationFact(candidate, "validTimeFact");
    },
  },
  {
    name: "$.factManifest.observedTimeFact.value.value rejects a wrong K0-valid fact value",
    expectedError: /fact does not match exact S0 fragment custody/,
    mutate: (candidate) => {
      observationFact(candidate, "observedTimeFact").value = {
        kind: "date_time",
        value: "3785-01-02T03:04:06-07:00",
      };
      rebuildObservationFact(candidate, "observedTimeFact");
    },
  },
  {
    name: "$.factManifest.validTimeFact.provenance.sourcePath rejects the wrong source path",
    schemaRejects: true,
    expectedError: /fact does not match exact S0 fragment custody/,
    mutate: (candidate) => {
      factProvenance(candidate, "validTimeFact").sourcePath =
        "$.observedTimeValue";
      rebuildObservationFact(candidate, "validTimeFact");
    },
  },
  {
    name: "$.factManifest.observedTimeFact.sourceIdentity.sourceRecordId + provenance.sourceIdentity.sourceRecordId reject a wrong fact identity",
    expectedError: /fact does not match exact S0 fragment custody/,
    mutate: (candidate) => {
      const fact = observationFact(candidate, "observedTimeFact");
      nestedObject(fact, "sourceIdentity").sourceRecordId =
        "s0-impossible:fixture:fixture-9999";
      nestedObject(
        factProvenance(candidate, "observedTimeFact"),
        "sourceIdentity",
      ).sourceRecordId = "s0-impossible:fixture:fixture-9999";
      rebuildObservationFact(candidate, "observedTimeFact");
    },
  },
  {
    name: "$.factManifest.observedTimeFact.provenance.retrievedAt rejects a valid year-3785 divergent custody time",
    expectedError: /fact does not match exact S0 fragment custody/,
    mutate: (candidate) => {
      factProvenance(candidate, "observedTimeFact").retrievedAt =
        "3785-01-04T05:06:08Z";
      rebuildObservationFact(candidate, "observedTimeFact");
    },
  },
  {
    name: "$.factManifest.observedTimeFact.provenance.adapterId rejects the wrong adapter ID",
    schemaRejects: true,
    expectedError: /expected s0-impossible-fixture/,
    mutate: (candidate) => {
      factProvenance(candidate, "observedTimeFact").adapterId =
        "s0-impossible-fixture-other";
      rebuildObservationFact(candidate, "observedTimeFact");
    },
  },
  {
    name: "$.factManifest.observedTimeFact.provenance.adapterVersion rejects the wrong adapter version",
    schemaRejects: true,
    expectedError: /expected 1\.0\.0/,
    mutate: (candidate) => {
      factProvenance(candidate, "observedTimeFact").adapterVersion = "1.0.1";
      rebuildObservationFact(candidate, "observedTimeFact");
    },
  },
  {
    name: "$.factManifest.observedTimeFact.provenance.sourceContentDigest rejects the wrong content digest",
    expectedError: /fact does not match exact S0 fragment custody/,
    mutate: (candidate) => {
      factProvenance(candidate, "observedTimeFact").sourceContentDigest =
        "0".repeat(64);
      rebuildObservationFact(candidate, "observedTimeFact");
    },
  },
  {
    name: "$.factManifest.observedTimeFact.factId rejects a syntactically valid wrong fact ID",
    mutate: (candidate) => {
      const fact = observationFact(candidate, "observedTimeFact");
      fact.factId = (fact.factId as string).replace(
        /[a-f0-9]{64}$/,
        "0".repeat(64),
      );
    },
  },
  {
    name: "$.factManifest.observedTimeFact.factDigest rejects a syntactically valid wrong fact digest",
    expectedError: /canonical fact digest/,
    mutate: (candidate) => {
      observationFact(candidate, "observedTimeFact").factDigest = "0".repeat(
        64,
      );
    },
  },
  {
    name: "$.factManifest.{observedTimeFact,validTimeFact}.provenance.retrievedAt reject provenance divergence between facts",
    expectedError: /fact does not match exact S0 fragment custody/,
    mutate: (candidate) => {
      factProvenance(candidate, "observedTimeFact").retrievedAt =
        "3785-01-04T05:06:08Z";
      factProvenance(candidate, "validTimeFact").retrievedAt =
        "3785-01-04T05:06:09Z";
      rebuildObservationFact(candidate, "observedTimeFact");
      rebuildObservationFact(candidate, "validTimeFact");
    },
  },
  {
    name: "$.observedTime.evidence.state rejects unsupported temporal evidence",
    schemaRejects: true,
    expectedError: /expected supported/,
    mutate: (candidate) => {
      temporalEvidence(candidate, "observedTime").state =
        "insufficient_evidence";
    },
  },
  {
    name: "$.observedTime.evidence.factReferences rejects multiple temporal fact references",
    schemaRejects: true,
    expectedError: /exactly one fact reference/,
    mutate: (candidate) => {
      const evidence = temporalEvidence(candidate, "observedTime");
      const references = evidence.factReferences as Record<string, unknown>[];
      const validTimeFact = observationFact(candidate, "validTimeFact");
      references.push({
        factId: validTimeFact.factId,
        factDigest: validTimeFact.factDigest,
      });
    },
  },
  {
    name: "$.geometry present + $.geometryDigest null rejects a split presence state before digest replay",
    schemaRejects: true,
    expectedError:
      /geometry and geometryDigest must be present or null together/,
    mutate: (candidate) => {
      candidate.geometryDigest = null;
    },
  },
  {
    name: "$.geometry null + $.geometryDigest present rejects a split presence state before digest replay",
    schemaRejects: true,
    expectedError:
      /geometry and geometryDigest must be present or null together/,
    mutate: (candidate) => {
      candidate.geometry = null;
    },
  },
  {
    name: "$.contractVersion rejects a future top-level contract version",
    schemaRejects: true,
    expectedError: /expected 1\.0\.0/,
    mutate: (candidate) => {
      candidate.contractVersion = "1.0.1";
    },
  },
  {
    name: "$.geometry.type + $.geometry.coordinates reject a GeoJSON Polygon attack",
    schemaRejects: true,
    expectedError: /unexpected field/,
    mutate: (candidate) => {
      candidate.geometry = {
        type: "Polygon",
        coordinates: [
          [
            [-4, -2],
            [6, -2],
            [6, 8],
            [-4, 8],
            [-4, -2],
          ],
        ],
      };
    },
  },
  {
    name: "$.geometry.type + $.geometry.features reject a GeoJSON FeatureCollection attack",
    schemaRejects: true,
    expectedError: /unexpected field/,
    mutate: (candidate) => {
      candidate.geometry = { type: "FeatureCollection", features: [] };
    },
  },
  {
    name: "$.geometry.properties rejects a free-form geometry properties attack",
    schemaRejects: true,
    expectedError: /unexpected field/,
    mutate: (candidate) => {
      nestedObject(candidate, "geometry").properties = {
        label: "forbidden geometry metadata",
      };
    },
  },
];

const matrixCases: readonly {
  label: string;
  slug: string;
  coverage: ObservationCoverage;
  uncertainty: ObservationUncertainty;
  geometry: SpatialObservationInput["geometry"];
}[] = [
  {
    label: "complete/certain",
    slug: "fixture-0001",
    coverage: "complete_fixture_extent",
    uncertainty: { state: "certain" },
    geometry: { minimum: [-4, -2], maximum: [6, 8] },
  },
  ...(
    [
      "fixture_limitation",
      "coordinate_limitation",
      "temporal_limitation",
    ] as const
  ).map((reason, index) => ({
    label: `complete/${reason}`,
    slug: `fixture-000${index + 2}`,
    coverage: "complete_fixture_extent" as const,
    uncertainty: { state: "uncertain" as const, reason },
    geometry: { minimum: [-4, -2], maximum: [6, 8] } as const,
  })),
  {
    label: "partial/coverage limitation",
    slug: "fixture-0005",
    coverage: "partial_fixture_extent",
    uncertainty: { state: "uncertain", reason: "coverage_limitation" },
    geometry: { minimum: [-4, -2], maximum: [6, 8] },
  },
  {
    label: "missing/coverage limitation",
    slug: "fixture-0006",
    coverage: "missing_fixture_geometry",
    uncertainty: { state: "uncertain", reason: "coverage_limitation" },
    geometry: null,
  },
  {
    label: "unknown/coverage limitation",
    slug: "fixture-0007",
    coverage: "unknown",
    uncertainty: { state: "uncertain", reason: "coverage_limitation" },
    geometry: { minimum: [-4, -2], maximum: [6, 8] },
  },
];

describe("S0 SpatialObservation construction and custody", () => {
  it.each(matrixCases)("constructs the $label matrix branch", (matrixCase) => {
    const observation = createSpatialObservation(
      observationInput(matrixCase.slug, {
        coverage: matrixCase.coverage,
        uncertainty: matrixCase.uncertainty,
        geometry: matrixCase.geometry,
      }),
    );

    expect(validateSpatialObservation(observation)).toEqual(observation);
    assertSchemaValid(observation);
    expect(observation.geometry === null).toBe(
      matrixCase.coverage === "missing_fixture_geometry",
    );
    expect(observation.geometryDigest === null).toBe(
      matrixCase.coverage === "missing_fixture_geometry",
    );
  });

  it("pins the literal geometry, observation, fact, and source-qualified identities", () => {
    const observation = createSpatialObservation(observationInput());
    const preFactFragment = {
      contractVersion: "1.0.0",
      experimental: true,
      synthetic: true,
      fixtureClass: "impossible_synthetic_geometry",
      fragmentClass: "spatial_observation",
      fixtureSlug: "fixture-0001",
      sourceIdentity: {
        sourceId: "s0-impossible",
        sourceRecordId: "s0-impossible:fixture:fixture-0001",
      },
      layerId: "s0-impossible:layer:fixture-0001",
      layerVersion: "1.2.3",
      featureId: "s0-impossible:feature:fixture-0001",
      coordinateSpace: {
        id: "urn:policy-sentinel:crs:impossible-grid:1.0.0",
        axes: ["synthetic_x", "synthetic_y"],
        axisOrder: ["synthetic_x", "synthetic_y"],
        unit: "impossible_unit",
        representation: "axis_aligned_integer_box_v1",
      },
      geometry: { minimum: [-4, -2], maximum: [6, 8] },
      geometryDigest: observation.geometryDigest,
      resolution: 2,
      observedTimeValue: {
        kind: "date_time",
        value: "3785-01-02T03:04:05-07:00",
      },
      validTimeValue: { kind: "date", value: "3785-01-03" },
      coverage: "complete_fixture_extent",
      uncertainty: { state: "certain" },
      attribution: "Policy Sentinel impossible synthetic fixture",
      usageBasis:
        "Repository-authored impossible synthetic fixture; no external source or reuse grant.",
    };

    expect(observation.geometryDigest).toBe(
      "71355974b65c9977de73f013c3550f8db0f9dfdbe8c8bd9d5bd95465bfcabc3f",
    );
    expect(observation.observationDigest).toBe(
      "491a5f9dd0a90c1354e4cbb5fdb8b1b00e9ee360aa4dcf858b64f3dd2236a842",
    );
    expect(observation.observationId).toBe(
      "s0-impossible:observation:491a5f9dd0a90c1354e4cbb5fdb8b1b00e9ee360aa4dcf858b64f3dd2236a842",
    );
    expect(canonicalJsonDigest(preFactFragment)).toBe(
      observation.observationDigest,
    );
    expect({
      fragmentDigestFact: {
        factId: observation.factManifest.fragmentDigestFact.factId,
        factDigest: observation.factManifest.fragmentDigestFact.factDigest,
      },
      observedTimeFact: {
        factId: observation.factManifest.observedTimeFact.factId,
        factDigest: observation.factManifest.observedTimeFact.factDigest,
      },
      validTimeFact: {
        factId: observation.factManifest.validTimeFact.factId,
        factDigest: observation.factManifest.validTimeFact.factDigest,
      },
    }).toEqual({
      fragmentDigestFact: {
        factId:
          "k0:fact:s0-impossible:czAtaW1wb3NzaWJsZTpmaXh0dXJlOmZpeHR1cmUtMDAwMQ:JA:rendition_digest:491a5f9dd0a90c1354e4cbb5fdb8b1b00e9ee360aa4dcf858b64f3dd2236a842",
        factDigest:
          "7d6986144d9885e18bd9275bac2b06d650a9b917060213c5cf232204d5c7b555",
      },
      observedTimeFact: {
        factId:
          "k0:fact:s0-impossible:czAtaW1wb3NzaWJsZTpmaXh0dXJlOmZpeHR1cmUtMDAwMQ:JC5vYnNlcnZlZFRpbWVWYWx1ZQ:observed_time:491a5f9dd0a90c1354e4cbb5fdb8b1b00e9ee360aa4dcf858b64f3dd2236a842",
        factDigest:
          "cab125d90825045b294a2734fc3bed8721a99827f2fe085fed23b668343c9620",
      },
      validTimeFact: {
        factId:
          "k0:fact:s0-impossible:czAtaW1wb3NzaWJsZTpmaXh0dXJlOmZpeHR1cmUtMDAwMQ:JC52YWxpZFRpbWVWYWx1ZQ:valid_time:491a5f9dd0a90c1354e4cbb5fdb8b1b00e9ee360aa4dcf858b64f3dd2236a842",
        factDigest:
          "b9b4d4068efda7302ba41db1df2ebb7d849ce6bb8aaa222b4fddada99cca7ccf",
      },
    });
  });

  it("constructs the exact three-fact manifest and supported temporal assertions", () => {
    const observation = createSpatialObservation(observationInput());
    expect(Object.keys(observation.factManifest).sort()).toEqual([
      "fragmentDigestFact",
      "observedTimeFact",
      "validTimeFact",
    ]);
    const facts = Object.values(observation.factManifest);
    for (const fact of facts) {
      expect(validateSourceFact(fact)).toEqual(fact);
      expect(fact.sourceIdentity).toEqual(observation.sourceIdentity);
      expect(fact.provenance.sourceContentDigest).toBe(
        observation.observationDigest,
      );
      expect(fact.provenance.sourceUrl).toBe(
        "https://policy-sentinel.invalid/fixtures/s0/1.0.0/fixture-0001.json",
      );
      expect(fact.provenance.retrievedAt).toBe("3785-01-04T05:06:07Z");
      expect(fact.provenance.sourceUpdatedAt).toBeNull();
    }
    expect(facts.map((fact) => fact.provenance.sourcePath).sort()).toEqual([
      "$",
      "$.observedTimeValue",
      "$.validTimeValue",
    ]);
    expect(observation.factManifest.fragmentDigestFact).toMatchObject({
      predicate: "rendition_digest",
      value: { kind: "sha256_digest", value: observation.observationDigest },
    });
    expect(observation.factManifest.observedTimeFact.value).toEqual(
      observation.observedTime.value,
    );
    expect(observation.factManifest.validTimeFact.value).toEqual(
      observation.validTime.value,
    );
    expect(observation.observedTime.evidence.factReferences).toEqual([
      {
        factId: observation.factManifest.observedTimeFact.factId,
        factDigest: observation.factManifest.observedTimeFact.factDigest,
      },
    ]);
    expect(observation.validTime.evidence.factReferences).toEqual([
      {
        factId: observation.factManifest.validTimeFact.factId,
        factDigest: observation.factManifest.validTimeFact.factDigest,
      },
    ]);
  });

  it("keeps storage-axis identity distinct while named-axis bounds normalize exactly", () => {
    const xy = createSpatialObservation(observationInput());
    const yx = createSpatialObservation(
      observationInput("fixture-0002", {
        axisOrder: ["synthetic_y", "synthetic_x"],
        geometry: { minimum: [-2, -4], maximum: [8, 6] },
      }),
    );

    expect(normalizedBoundsForObservation(xy)).toEqual(
      normalizedBoundsForObservation(yx),
    );
    expect(xy.geometryDigest).not.toBe(yx.geometryDigest);
    expect(xy.observationDigest).not.toBe(yx.observationDigest);
  });

  it("preserves open intervals and keeps retrieved, observed, and valid time distinct", () => {
    const observation = createSpatialObservation(
      observationInput("fixture-0008", {
        observedTimeValue: {
          kind: "date_time",
          value: "3785-08-01T10:00:00+02:00",
        },
        validTimeValue: {
          kind: "interval",
          start: null,
          end: {
            kind: "date_time",
            value: "3785-08-31T10:00:00+02:00",
            inclusive: false,
          },
        },
        retrievedAt: "3785-09-01T00:00:00Z",
      }),
    );

    expect(observation.validTime.value).toEqual({
      kind: "interval",
      start: null,
      end: {
        kind: "date_time",
        value: "3785-08-31T10:00:00+02:00",
        inclusive: false,
      },
    });
    expect(
      observation.factManifest.observedTimeFact.provenance.retrievedAt,
    ).toBe("3785-09-01T00:00:00Z");
  });

  it("is key-order deterministic and detached from recursively frozen caller input", () => {
    const input = observationInput();
    const first = createSpatialObservation(input);
    if (input.geometry === null) {
      throw new Error("test requires geometry");
    }
    (input.geometry.minimum as [number, number])[0] = -32;
    expect(first.geometry?.minimum[0]).toBe(-4);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.coordinateSpace)).toBe(true);
    expect(
      Object.isFrozen(first.factManifest.observedTimeFact.provenance),
    ).toBe(true);
    expect(() => {
      (first.coordinateSpace.axisOrder as [string, string])[0] = "changed";
    }).toThrow(TypeError);

    const reordered = createSpatialObservation({
      retrievedAt: "3785-01-04T05:06:07Z",
      uncertainty: { state: "certain" },
      coverage: "complete_fixture_extent",
      validTimeValue: { kind: "date", value: "3785-01-03" },
      observedTimeValue: {
        kind: "date_time",
        value: "3785-01-02T03:04:05-07:00",
      },
      resolution: 2,
      geometry: { maximum: [6, 8], minimum: [-4, -2] },
      axisOrder: ["synthetic_x", "synthetic_y"],
      layerVersion: "1.2.3",
      fixtureSlug: "fixture-0001",
    });
    expect(canonicalizeJson(reordered)).toBe(canonicalizeJson(first));
  });
});

describe("S0 SpatialObservation fail-closed validation", () => {
  it.each([
    [
      "complete with null geometry",
      { coverage: "complete_fixture_extent", geometry: null },
    ],
    [
      "complete coverage limitation",
      {
        coverage: "complete_fixture_extent",
        uncertainty: { state: "uncertain", reason: "coverage_limitation" },
      },
    ],
    [
      "partial certain",
      {
        coverage: "partial_fixture_extent",
        uncertainty: { state: "certain" },
      },
    ],
    [
      "partial null geometry",
      {
        coverage: "partial_fixture_extent",
        uncertainty: { state: "uncertain", reason: "coverage_limitation" },
        geometry: null,
      },
    ],
    [
      "missing present geometry",
      {
        coverage: "missing_fixture_geometry",
        uncertainty: { state: "uncertain", reason: "coverage_limitation" },
      },
    ],
    [
      "missing wrong reason",
      {
        coverage: "missing_fixture_geometry",
        uncertainty: { state: "uncertain", reason: "fixture_limitation" },
        geometry: null,
      },
    ],
    [
      "unknown null geometry",
      {
        coverage: "unknown",
        uncertainty: { state: "uncertain", reason: "coverage_limitation" },
        geometry: null,
      },
    ],
    [
      "unknown certain",
      { coverage: "unknown", uncertainty: { state: "certain" } },
    ],
  ] as const)("rejects matrix near miss: %s", (_label, overrides) => {
    expect(() =>
      createSpatialObservation(
        observationInput(
          "fixture-0001",
          overrides as unknown as Partial<SpatialObservationInput>,
        ),
      ),
    ).toThrow(TypeError);
  });

  it.each([
    ["semantic slug", { fixtureSlug: "fixture-place" }],
    ["short slug", { fixtureSlug: "fixture-001" }],
    ["prerelease layer", { layerVersion: "1.2.3-beta" }],
    ["build layer", { layerVersion: "1.2.3+build" }],
    ["leading-zero layer", { layerVersion: "01.2.3" }],
    ["wrong axis", { axisOrder: ["synthetic_x", "synthetic_x"] }],
    ["outside domain", { geometry: { minimum: [-33, -2], maximum: [6, 8] } }],
    ["inverted bound", { geometry: { minimum: [6, -2], maximum: [-4, 8] } }],
    ["off resolution", { geometry: { minimum: [-3, -2], maximum: [6, 8] } }],
    ["negative zero", { geometry: { minimum: [-0, -2], maximum: [6, 8] } }],
    ["resolution zero", { resolution: 0 }],
    ["resolution nine", { resolution: 9 }],
    [
      "observed date",
      { observedTimeValue: { kind: "date", value: "3785-01-02" } },
    ],
    [
      "observed wrong year",
      {
        observedTimeValue: {
          kind: "date_time",
          value: "3784-01-02T03:04:05Z",
        },
      },
    ],
    [
      "valid wrong year",
      { validTimeValue: { kind: "date", value: "3784-01-03" } },
    ],
    ["retrieved wrong year", { retrievedAt: "3784-01-04T05:06:07Z" }],
    [
      "relation-only reason",
      { uncertainty: { state: "uncertain", reason: "tolerance_ambiguity" } },
    ],
  ] as const)(
    "rejects malformed constructor input: %s",
    (_label, overrides) => {
      expect(() =>
        createSpatialObservation(
          observationInput(
            "fixture-0001",
            overrides as unknown as Partial<SpatialObservationInput>,
          ),
        ),
      ).toThrow(TypeError);
    },
  );

  it("rejects extra/protected fields, custom prototypes, accessors, and sparse tuples", () => {
    expect(() =>
      createSpatialObservation({
        ...observationInput(),
        legalEffect: "claimed",
      } as unknown as SpatialObservationInput),
    ).toThrow(/protected semantic field/);

    const customPrototype = Object.create({ inherited: true }) as Record<
      string,
      unknown
    >;
    Object.assign(customPrototype, observationInput());
    expect(() =>
      createSpatialObservation(
        customPrototype as unknown as SpatialObservationInput,
      ),
    ).toThrow(/plain object/);

    const accessor = observationInput() as SpatialObservationInput & {
      extra?: string;
    };
    Object.defineProperty(accessor, "extra", {
      enumerable: true,
      get: () => "hidden",
    });
    expect(() => createSpatialObservation(accessor)).toThrow(/data property/);

    const sparse = Array.from({ length: 2 }) as unknown as [number, number];
    sparse[1] = -2;
    expect(() =>
      createSpatialObservation(
        observationInput("fixture-0001", {
          geometry: { minimum: sparse, maximum: [6, 8] },
        }),
      ),
    ).toThrow(/expected a JSON value|sparse arrays/);
  });

  it("rejects namespace, sentinel URL, provenance, fact, and temporal-reference tampering", () => {
    const original = createSpatialObservation(observationInput());
    const cases: Array<(candidate: Record<string, unknown>) => void> = [
      (candidate) => {
        candidate.layerId = "s0-impossible:layer:fixture-9999";
      },
      (candidate) => {
        const manifest = candidate.factManifest as Record<string, unknown>;
        const fact = manifest.observedTimeFact as Record<string, unknown>;
        const provenance = fact.provenance as Record<string, unknown>;
        provenance.sourceUrl = `${provenance.sourceUrl as string}?query=1`;
      },
      (candidate) => {
        const manifest = candidate.factManifest as Record<string, unknown>;
        const fact = manifest.validTimeFact as Record<string, unknown>;
        const provenance = fact.provenance as Record<string, unknown>;
        provenance.sourceUpdatedAt = "3785-01-01T00:00:00Z";
      },
      (candidate) => {
        const manifest = candidate.factManifest as Record<string, unknown>;
        const fact = manifest.observedTimeFact as Record<string, unknown>;
        fact.factId = `${fact.factId as string}x`;
      },
      (candidate) => {
        const observedTime = candidate.observedTime as Record<string, unknown>;
        const evidence = observedTime.evidence as Record<string, unknown>;
        const references = evidence.factReferences as Record<string, unknown>[];
        references[0]!.factDigest = "0".repeat(64);
      },
    ];

    for (const mutate of cases) {
      const candidate = mutableClone(original) as unknown as Record<
        string,
        unknown
      >;
      mutate(candidate);
      expect(() => validateSpatialObservation(candidate)).toThrow(TypeError);
    }
  });

  it.each(observationTamperCases)("$name", (testCase) => {
    const candidate = mutableClone(
      createSpatialObservation(observationInput()),
    ) as unknown as Record<string, unknown>;
    testCase.mutate(candidate);

    if (testCase.schemaRejects === true) {
      expect(
        validateObservationSchema(candidate),
        `${testCase.name}: JSON Schema must reject the expressible attack`,
      ).toBe(false);
    }

    let failure: unknown;
    try {
      validateSpatialObservation(candidate);
    } catch (error) {
      failure = error;
    }
    expect(failure, `${testCase.name}: runtime must reject`).toBeInstanceOf(
      TypeError,
    );
    if (testCase.expectedError !== undefined) {
      expect(
        (failure as Error).message,
        `${testCase.name}: runtime rejection must preserve frozen stage order`,
      ).toMatch(testCase.expectedError);
    }
  });

  it("honors geometry, observation, identity, then K0 custody replay order", () => {
    const original = createSpatialObservation(observationInput());

    const matrixFirst = mutableClone(original) as unknown as Record<
      string,
      unknown
    >;
    matrixFirst.coverage = "partial_fixture_extent";
    matrixFirst.geometryDigest = "0".repeat(64);
    expect(() => validateSpatialObservation(matrixFirst)).toThrow(
      /incomplete coverage requires uncertain coverage_limitation/,
    );

    const geometryFirst = mutableClone(original) as unknown as Record<
      string,
      unknown
    >;
    geometryFirst.geometryDigest = "0".repeat(64);
    geometryFirst.observationDigest = "1".repeat(64);
    expect(() => validateSpatialObservation(geometryFirst)).toThrow(
      /canonical geometry digest/,
    );

    const observationSecond = mutableClone(original) as unknown as Record<
      string,
      unknown
    >;
    observationSecond.observationDigest = "1".repeat(64);
    const manifest = observationSecond.factManifest as Record<string, unknown>;
    const observedFact = manifest.observedTimeFact as Record<string, unknown>;
    observedFact.factDigest = "2".repeat(64);
    const observedAssertion = observationSecond.observedTime as Record<
      string,
      unknown
    >;
    const evidence = observedAssertion.evidence as Record<string, unknown>;
    const references = evidence.factReferences as Array<
      Record<string, unknown>
    >;
    references[0].factDigest = "2".repeat(64);
    expect(() => validateSpatialObservation(observationSecond)).toThrow(
      /pre-fact fragment digest/,
    );

    const identityThird = mutableClone(original) as unknown as Record<
      string,
      unknown
    >;
    identityThird.observationId = `s0-impossible:observation:${"1".repeat(64)}`;
    expect(() => validateSpatialObservation(identityThird)).toThrow(
      /stable observation digest identity/,
    );

    const factLast = mutableClone(original) as unknown as Record<
      string,
      unknown
    >;
    const factManifest = factLast.factManifest as Record<string, unknown>;
    const fragmentFact = factManifest.fragmentDigestFact as Record<
      string,
      unknown
    >;
    fragmentFact.factDigest = "3".repeat(64);
    expect(() => validateSpatialObservation(factLast)).toThrow(
      /canonical fact digest/,
    );
  });
});

describe("S0 SpatialObservation collection and committed fixtures", () => {
  it("sorts constructor input and rejects unsorted, duplicate, and oversized validator input", () => {
    const first = createSpatialObservation(observationInput("fixture-0001"));
    const second = createSpatialObservation(observationInput("fixture-0002"));
    const constructed = createSpatialObservationCollection([second, first]);
    expect(constructed.map((entry) => entry.observationId)).toEqual(
      constructed.map((entry) => entry.observationId).toSorted(),
    );
    expect(Object.isFrozen(constructed)).toBe(true);
    expect(validateSpatialObservationCollection(constructed)).toEqual(
      constructed,
    );

    expect(() =>
      validateSpatialObservationCollection([...constructed].reverse()),
    ).toThrow(/sorted unique/);
    expect(() => createSpatialObservationCollection([first, first])).toThrow(
      /sorted unique/,
    );
    expect(() =>
      validateSpatialObservationCollection(
        Array.from({ length: 65 }, () => first),
      ),
    ).toThrow(/no more than 64/);
  });

  it("replays all committed valid fixtures and rejects the malformed fixture", () => {
    for (const name of [
      "observation-complete-certain.valid.json",
      "observation-partial-coverage.valid.json",
      "observation-missing-geometry.valid.json",
      "observation-unknown-coverage.valid.json",
      "observation-swapped-axis-open-interval.valid.json",
    ]) {
      const fixture = JSON.parse(
        readFileSync(
          resolve(root, "fixtures", "experimental", "spatial", name),
          "utf8",
        ),
      ) as unknown;
      assertSchemaValid(fixture);
      expect(validateSpatialObservation(fixture)).toEqual(fixture);
    }

    const malformed = JSON.parse(
      readFileSync(
        resolve(
          root,
          "fixtures",
          "experimental",
          "spatial",
          "observation-malformed.invalid.json",
        ),
        "utf8",
      ),
    ) as unknown;
    expect(validateObservationSchema(malformed)).toBe(false);
    expect(() => validateSpatialObservation(malformed)).toThrow(TypeError);
  });
});
