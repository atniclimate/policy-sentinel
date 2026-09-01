import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import assertionSchema from "../../../schemas/assertion.schema.v1.json";
import spatialRelationSchema from "../../../schemas/experimental/spatial-relation.schema.v1.json";
import {
  canonicalJsonDigest,
  validateDerivedAssertion,
  validateEvidenceReferences,
  type JsonValue,
  type TemporalValue,
} from "../../../src/kernel/assertions";
import {
  createSpatialObservation,
  createSpatialObservationCollection,
  validateSpatialObservation,
} from "../../../src/experimental/spatial/observation";
import {
  createSpatialRelation,
  createSpatialRelationCollection,
  validateSpatialRelation,
  validateSpatialRelationCollection,
} from "../../../src/experimental/spatial/relation";
import type {
  ImmutableSpatialObservation,
  ImmutableSpatialRelation,
  ObservationCoverage,
  ObservationUncertainty,
  SpatialObservationInput,
  SpatialUnknownReason,
} from "../../../src/experimental/spatial/types";

const root = resolve(import.meta.dirname, "..", "..", "..");
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(assertionSchema);
const validateRelationSchema = ajv.compile(spatialRelationSchema);

function mutableClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function observationInput(
  fixtureSlug: string,
  overrides: Partial<SpatialObservationInput> = {},
): SpatialObservationInput {
  return {
    fixtureSlug,
    layerVersion: "1.0.0",
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

function observationsForPinnedRelation(): readonly [
  ImmutableSpatialObservation,
  ImmutableSpatialObservation,
] {
  return [
    createSpatialObservation(observationInput("fixture-0001")),
    createSpatialObservation(
      observationInput("fixture-0002", {
        geometry: { minimum: [-4, -4], maximum: [4, 4] },
      }),
    ),
  ];
}

function sortedObservations(
  ...observations: readonly ImmutableSpatialObservation[]
): readonly ImmutableSpatialObservation[] {
  return createSpatialObservationCollection(observations);
}

function relationRecord(
  relation: ImmutableSpatialRelation,
): Record<string, unknown> {
  return mutableClone(relation) as unknown as Record<string, unknown>;
}

function nestedRecord(
  object: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return object[key] as Record<string, unknown>;
}

function nestedArray(object: Record<string, unknown>, key: string): unknown[] {
  return object[key] as unknown[];
}

function forgeLateFields(candidate: Record<string, unknown>): void {
  candidate.relation = "disjoint";
  candidate.uncertainty = { state: "certain" };
  candidate.unknownReason = null;
  const assertion = nestedRecord(candidate, "derivedAssertion");
  assertion.assertionId = `k0:spatial_relation:${"0".repeat(64)}`;
  assertion.resultDigest = "1".repeat(64);
}

function changeSharedTime(candidate: Record<string, unknown>): void {
  const sharedValidTime = nestedRecord(candidate, "sharedValidTime");
  sharedValidTime.value = { kind: "date", value: "3785-12-31" };
}

function misalignInputDigests(candidate: Record<string, unknown>): void {
  const assertion = nestedRecord(candidate, "derivedAssertion");
  const digests = nestedArray(assertion, "inputFactDigests");
  digests[0] = "0".repeat(64);
}

function expectedFactPairs(
  subject: ImmutableSpatialObservation,
  object: ImmutableSpatialObservation,
): readonly { factId: string; factDigest: string }[] {
  return [
    ...Object.values(subject.factManifest),
    ...Object.values(object.factManifest),
  ]
    .map((fact) => ({
      factId: fact.factId,
      factDigest: fact.factDigest,
    }))
    .sort((left, right) =>
      left.factId < right.factId ? -1 : left.factId > right.factId ? 1 : 0,
    );
}

describe("S0 SpatialRelation ordered identity and K0 custody", () => {
  it("pins ordered relation identity, assertion identity, and complete result digest", () => {
    const [subject, object] = observationsForPinnedRelation();
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const observations = sortedObservations(subject, object);
    const identityPreimage = {
      contractVersion: "1.0.0",
      subject: relation.subject,
      object: relation.object,
      algorithm: relation.algorithm,
    } as unknown as JsonValue;
    const identityDigest = canonicalJsonDigest(identityPreimage);

    expect(relation.relation).toBe("contains");
    expect(relation.relationId).toBe(
      `s0-impossible:relation:${identityDigest}`,
    );
    expect(relation.derivedAssertion.assertionId).toBe(
      `k0:spatial_relation:${identityDigest}`,
    );
    expect(relation.relationId).toBe(
      "s0-impossible:relation:a67f55f273efd735477b05e201859d884450de506510bbbc137f7dd53c4069c6",
    );
    expect(relation.derivedAssertion.assertionId).toBe(
      "k0:spatial_relation:a67f55f273efd735477b05e201859d884450de506510bbbc137f7dd53c4069c6",
    );
    expect(relation.derivedAssertion.resultDigest).toBe(
      "18e9bb75f7908aaa83d160b531c23c920989aa8219f569270fad2e64e0958860",
    );

    const resultPreimage = relationRecord(relation);
    const assertion = nestedRecord(resultPreimage, "derivedAssertion");
    delete assertion.resultDigest;
    expect(canonicalJsonDigest(resultPreimage as JsonValue)).toBe(
      relation.derivedAssertion.resultDigest,
    );
    expect(validateSpatialRelation(relation, observations)).toEqual(relation);
  });

  it("preserves subject/object semantics and maps only containment direction", () => {
    const [outer, inner] = observationsForPinnedRelation();
    const forward = createSpatialRelation(outer, inner, { tolerance: 0 });
    const reverse = createSpatialRelation(inner, outer, { tolerance: 0 });

    expect(forward.relation).toBe("contains");
    expect(reverse.relation).toBe("within");
    expect(forward.subject.observationId).toBe(outer.observationId);
    expect(reverse.subject.observationId).toBe(inner.observationId);
    expect(forward.relationId).not.toBe(reverse.relationId);
    expect(forward.derivedAssertion.assertionId).not.toBe(
      reverse.derivedAssertion.assertionId,
    );
    expect(forward.sharedValidTime).toEqual(reverse.sharedValidTime);
  });

  it("binds exactly six sorted, unique, aligned fact pairs as supported evidence", () => {
    const [subject, object] = observationsForPinnedRelation();
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const pairs = expectedFactPairs(subject, object);
    const facts = [
      ...Object.values(subject.factManifest),
      ...Object.values(object.factManifest),
    ];

    expect(pairs).toHaveLength(6);
    expect(new Set(pairs.map((pair) => pair.factId)).size).toBe(6);
    expect(new Set(pairs.map((pair) => pair.factDigest)).size).toBe(6);
    expect(relation.derivedAssertion.inputFactIds).toEqual(
      pairs.map((pair) => pair.factId),
    );
    expect(relation.derivedAssertion.inputFactDigests).toEqual(
      pairs.map((pair) => pair.factDigest),
    );
    expect(relation.derivedAssertion.evidence).toEqual({
      state: "supported",
      factReferences: pairs,
    });
    expect(validateDerivedAssertion(relation.derivedAssertion)).toEqual(
      relation.derivedAssertion,
    );
    expect(() =>
      validateEvidenceReferences(relation.derivedAssertion.evidence, facts),
    ).not.toThrow();
  });

  it("rejects independent pair reordering, forged collisions, and evidence misalignment", () => {
    const [subject, object] = observationsForPinnedRelation();
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const observations = sortedObservations(subject, object);

    const reorderedIds = relationRecord(relation);
    const reorderedAssertion = nestedRecord(reorderedIds, "derivedAssertion");
    const ids = nestedArray(reorderedAssertion, "inputFactIds");
    [ids[0], ids[1]] = [ids[1], ids[0]];
    expect(() => validateSpatialRelation(reorderedIds, observations)).toThrow(
      /six exact aligned pairs/,
    );

    const reorderedDigests = relationRecord(relation);
    const digestAssertion = nestedRecord(reorderedDigests, "derivedAssertion");
    const digests = nestedArray(digestAssertion, "inputFactDigests");
    [digests[0], digests[1]] = [digests[1], digests[0]];
    expect(() =>
      validateSpatialRelation(reorderedDigests, observations),
    ).toThrow(/six exact aligned pairs/);

    const duplicateId = relationRecord(relation);
    const duplicateIdAssertion = nestedRecord(duplicateId, "derivedAssertion");
    const duplicateIds = nestedArray(duplicateIdAssertion, "inputFactIds");
    duplicateIds[1] = duplicateIds[0];
    expect(() => validateSpatialRelation(duplicateId, observations)).toThrow(
      /six exact aligned pairs/,
    );

    const duplicateDigest = relationRecord(relation);
    const duplicateDigestAssertion = nestedRecord(
      duplicateDigest,
      "derivedAssertion",
    );
    const duplicateDigests = nestedArray(
      duplicateDigestAssertion,
      "inputFactDigests",
    );
    duplicateDigests[1] = duplicateDigests[0];
    expect(() =>
      validateSpatialRelation(duplicateDigest, observations),
    ).toThrow(/six exact aligned pairs/);

    const evidenceMismatch = relationRecord(relation);
    const evidenceAssertion = nestedRecord(
      evidenceMismatch,
      "derivedAssertion",
    );
    const evidence = nestedRecord(evidenceAssertion, "evidence");
    const references = nestedArray(evidence, "factReferences");
    [references[0], references[1]] = [references[1], references[0]];
    expect(() =>
      validateSpatialRelation(evidenceMismatch, observations),
    ).toThrow(/cite exactly the six aligned input facts/);
  });

  it("rejects a complete third-observation fact triple outside the resolved pair", () => {
    const [subject, object] = observationsForPinnedRelation();
    const third = createSpatialObservation(
      observationInput("fixture-0003", {
        geometry: { minimum: [10, 10], maximum: [12, 12] },
      }),
    );
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const observations = sortedObservations(subject, object, third);
    const thirdFact = third.factManifest.observedTimeFact;
    const candidate = relationRecord(relation);
    const assertion = nestedRecord(candidate, "derivedAssertion");
    const inputFactIds = nestedArray(assertion, "inputFactIds");
    const inputFactDigests = nestedArray(assertion, "inputFactDigests");
    const evidence = nestedRecord(assertion, "evidence");
    const references = nestedArray(evidence, "factReferences");
    const substitutionIndex = inputFactIds.length - 1;

    inputFactIds[substitutionIndex] = thirdFact.factId;
    inputFactDigests[substitutionIndex] = thirdFact.factDigest;
    references[substitutionIndex] = {
      factId: thirdFact.factId,
      factDigest: thirdFact.factDigest,
    };

    expect(new Set(inputFactIds).size).toBe(6);
    expect(new Set(inputFactDigests).size).toBe(6);
    expect(() => validateSpatialRelation(candidate, observations)).toThrow(
      /six exact aligned pairs/,
    );
  });

  it("rejects separately missing and extra aligned IDs, digests, and references", () => {
    const [subject, object] = observationsForPinnedRelation();
    const third = createSpatialObservation(
      observationInput("fixture-0004", {
        geometry: { minimum: [10, 10], maximum: [14, 14] },
      }),
    );
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const observations = sortedObservations(subject, object, third);

    const missing = relationRecord(relation);
    const missingAssertion = nestedRecord(missing, "derivedAssertion");
    nestedArray(missingAssertion, "inputFactIds").pop();
    nestedArray(missingAssertion, "inputFactDigests").pop();
    nestedArray(
      nestedRecord(missingAssertion, "evidence"),
      "factReferences",
    ).pop();
    expect(() => validateSpatialRelation(missing, observations)).toThrow(
      /exactly six fact IDs/,
    );

    const extra = relationRecord(relation);
    const extraAssertion = nestedRecord(extra, "derivedAssertion");
    const extraFact = third.factManifest.fragmentDigestFact;
    nestedArray(extraAssertion, "inputFactIds").push(extraFact.factId);
    nestedArray(extraAssertion, "inputFactDigests").push(extraFact.factDigest);
    nestedArray(
      nestedRecord(extraAssertion, "evidence"),
      "factReferences",
    ).push({
      factId: extraFact.factId,
      factDigest: extraFact.factDigest,
    });
    expect(() => validateSpatialRelation(extra, observations)).toThrow(
      /exactly six fact IDs/,
    );
  });

  it("rejects assertion-identity and sole-exclusion result-digest tampering", () => {
    const [subject, object] = observationsForPinnedRelation();
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const observations = sortedObservations(subject, object);

    const assertionIdentity = relationRecord(relation);
    nestedRecord(assertionIdentity, "derivedAssertion").assertionId =
      `k0:spatial_relation:${"0".repeat(64)}`;
    expect(() =>
      validateSpatialRelation(assertionIdentity, observations),
    ).toThrow(/exact S0 K0 assertion and result digest/);

    const resultDigest = relationRecord(relation);
    nestedRecord(resultDigest, "derivedAssertion").resultDigest = "0".repeat(
      64,
    );
    expect(() => validateSpatialRelation(resultDigest, observations)).toThrow(
      /exact S0 K0 assertion and result digest/,
    );
  });
});

type CoverageMode = "certain" | "missing" | "partial" | "unknown" | "uncertain";
type TemporalMode = "overlap" | "mixed" | "disjoint";

const unknownReasonOrder: readonly SpatialUnknownReason[] = [
  "missing_geometry",
  "partial_coverage",
  "unknown_coverage",
  "observation_uncertain",
  "resolution_mismatch",
  "valid_time_mixed_precision",
  "valid_time_disjoint",
  "tolerance_ambiguity",
];

const coverageCombinations: readonly {
  label: string;
  subject: CoverageMode;
  object: CoverageMode;
  reasons: readonly SpatialUnknownReason[];
}[] = [
  { label: "none", subject: "certain", object: "certain", reasons: [] },
  {
    label: "missing",
    subject: "missing",
    object: "certain",
    reasons: ["missing_geometry"],
  },
  {
    label: "partial",
    subject: "partial",
    object: "certain",
    reasons: ["partial_coverage"],
  },
  {
    label: "unknown",
    subject: "unknown",
    object: "certain",
    reasons: ["unknown_coverage"],
  },
  {
    label: "uncertain",
    subject: "uncertain",
    object: "certain",
    reasons: ["observation_uncertain"],
  },
  {
    label: "missing+partial",
    subject: "missing",
    object: "partial",
    reasons: ["missing_geometry", "partial_coverage"],
  },
  {
    label: "missing+unknown",
    subject: "missing",
    object: "unknown",
    reasons: ["missing_geometry", "unknown_coverage"],
  },
  {
    label: "missing+uncertain",
    subject: "missing",
    object: "uncertain",
    reasons: ["missing_geometry", "observation_uncertain"],
  },
  {
    label: "partial+unknown",
    subject: "partial",
    object: "unknown",
    reasons: ["partial_coverage", "unknown_coverage"],
  },
  {
    label: "partial+uncertain",
    subject: "partial",
    object: "uncertain",
    reasons: ["partial_coverage", "observation_uncertain"],
  },
  {
    label: "unknown+uncertain",
    subject: "unknown",
    object: "uncertain",
    reasons: ["unknown_coverage", "observation_uncertain"],
  },
];

function coverageOverrides(mode: CoverageMode): {
  coverage: ObservationCoverage;
  uncertainty: ObservationUncertainty;
  geometry: SpatialObservationInput["geometry"];
} {
  switch (mode) {
    case "missing":
      return {
        coverage: "missing_fixture_geometry",
        uncertainty: { state: "uncertain", reason: "coverage_limitation" },
        geometry: null,
      };
    case "partial":
      return {
        coverage: "partial_fixture_extent",
        uncertainty: { state: "uncertain", reason: "coverage_limitation" },
        geometry: { minimum: [-8, -8], maximum: [8, 8] },
      };
    case "unknown":
      return {
        coverage: "unknown",
        uncertainty: { state: "uncertain", reason: "coverage_limitation" },
        geometry: { minimum: [-8, -8], maximum: [8, 8] },
      };
    case "uncertain":
      return {
        coverage: "complete_fixture_extent",
        uncertainty: { state: "uncertain", reason: "fixture_limitation" },
        geometry: { minimum: [-8, -8], maximum: [8, 8] },
      };
    case "certain":
      return {
        coverage: "complete_fixture_extent",
        uncertainty: { state: "certain" },
        geometry: { minimum: [-8, -8], maximum: [8, 8] },
      };
  }
}

function temporalValues(
  mode: TemporalMode,
): readonly [TemporalValue, TemporalValue] {
  if (mode === "mixed") {
    return [
      { kind: "date", value: "3785-01-03" },
      { kind: "date_time", value: "3785-01-03T00:00:00Z" },
    ];
  }
  if (mode === "disjoint") {
    return [
      { kind: "date", value: "3785-01-03" },
      { kind: "date", value: "3785-01-04" },
    ];
  }
  return [
    { kind: "date", value: "3785-01-03" },
    { kind: "date", value: "3785-01-03" },
  ];
}

describe("S0 SpatialRelation total unknown precedence", () => {
  it("covers every reachable earlier-reason combination and reversal", () => {
    let fixtureNumber = 1000;
    let checkedCombinations = 0;

    for (const coverageCase of coverageCombinations) {
      for (const resolutionMismatch of [false, true]) {
        for (const temporalMode of ["overlap", "mixed", "disjoint"] as const) {
          const [subjectTime, objectTime] = temporalValues(temporalMode);
          const subjectSlug = `fixture-${String(fixtureNumber).padStart(4, "0")}`;
          fixtureNumber += 1;
          const objectSlug = `fixture-${String(fixtureNumber).padStart(4, "0")}`;
          fixtureNumber += 1;
          const subject = createSpatialObservation(
            observationInput(subjectSlug, {
              ...coverageOverrides(coverageCase.subject),
              resolution: 1,
              validTimeValue: subjectTime,
            }),
          );
          const object = createSpatialObservation(
            observationInput(objectSlug, {
              ...coverageOverrides(coverageCase.object),
              resolution: resolutionMismatch ? 2 : 1,
              validTimeValue: objectTime,
            }),
          );
          const applicable = [
            ...coverageCase.reasons,
            ...(resolutionMismatch ? (["resolution_mismatch"] as const) : []),
            ...(temporalMode === "mixed"
              ? (["valid_time_mixed_precision"] as const)
              : temporalMode === "disjoint"
                ? (["valid_time_disjoint"] as const)
                : []),
          ];
          const expectedReason = unknownReasonOrder.find((reason) =>
            applicable.includes(reason),
          );
          const context = `${coverageCase.label}/${resolutionMismatch ? "resolution-mismatch" : "same-resolution"}/${temporalMode}`;

          for (const [left, right] of [
            [subject, object],
            [object, subject],
          ] as const) {
            const relation = createSpatialRelation(left, right, {
              tolerance: 0,
            });
            if (expectedReason === undefined) {
              expect(relation.relation, context).toBe("intersects");
              expect(relation.uncertainty, context).toEqual({
                state: "certain",
              });
              expect(relation.unknownReason, context).toBeNull();
            } else {
              expect(relation.relation, context).toBe("unknown");
              expect(relation.uncertainty, context).toEqual({
                state: "uncertain",
                reason: expectedReason,
              });
              expect(relation.unknownReason, context).toBe(expectedReason);
            }
          }
          checkedCombinations += 1;
        }
      }
    }

    expect(checkedCombinations).toBe(66);
  }, 30_000);

  it("selects tolerance ambiguity only after all seven earlier reasons are absent", () => {
    const subject = createSpatialObservation(
      observationInput("fixture-0201", {
        geometry: { minimum: [-4, -4], maximum: [4, 4] },
      }),
    );
    const object = createSpatialObservation(
      observationInput("fixture-0202", {
        geometry: { minimum: [5, -4], maximum: [9, 4] },
      }),
    );

    for (const [left, right] of [
      [subject, object],
      [object, subject],
    ] as const) {
      const relation = createSpatialRelation(left, right, { tolerance: 1 });
      expect(relation.relation).toBe("unknown");
      expect(relation.uncertainty).toEqual({
        state: "uncertain",
        reason: "tolerance_ambiguity",
      });
      expect(relation.unknownReason).toBe("tolerance_ambiguity");
    }
  });
});

describe("S0 SpatialRelation fail-closed references and replay order", () => {
  it("rejects every derived-assertion Stage-1 constant or lexical namespace before later failures", () => {
    const [subject, object] = observationsForPinnedRelation();
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const observations = sortedObservations(subject, object);
    const stageOneCases: readonly {
      label: string;
      mutate: (assertion: Record<string, unknown>) => void;
      expected: RegExp;
    }[] = [
      {
        label: "contract version",
        mutate: (assertion) => {
          assertion.contractVersion = "1.0.1";
        },
        expected: /derivedAssertion\.contractVersion.*expected 1\.0\.0/,
      },
      {
        label: "assertion class",
        mutate: (assertion) => {
          assertion.assertionClass = "other_relation";
        },
        expected: /derivedAssertion\.assertionClass.*expected spatial_relation/,
      },
      {
        label: "assertion namespace",
        mutate: (assertion) => {
          assertion.assertionId = `k0:spatial_relation:${"A".repeat(64)}`;
        },
        expected: /derivedAssertion\.assertionId.*exact S0 K0 spatial-relation/,
      },
      {
        label: "input fact ID grammar",
        mutate: (assertion) => {
          nestedArray(assertion, "inputFactIds")[0] = "k0:fact:malformed";
        },
        expected: /inputFactPairs\[0\]\.factId.*exact K0 fact ID/,
      },
      {
        label: "input fact digest grammar",
        mutate: (assertion) => {
          nestedArray(assertion, "inputFactDigests")[0] = "A".repeat(64);
        },
        expected: /inputFactPairs\[0\]\.factDigest.*lowercase SHA-256/,
      },
      {
        label: "rule ID",
        mutate: (assertion) => {
          assertion.ruleId = "other-rule";
        },
        expected:
          /derivedAssertion\.ruleId.*expected s0-axis-aligned-box-topology/,
      },
      {
        label: "rule version",
        mutate: (assertion) => {
          assertion.ruleVersion = "1.0.1";
        },
        expected: /derivedAssertion\.ruleVersion.*expected 1\.0\.0/,
      },
      {
        label: "canonicalization version",
        mutate: (assertion) => {
          assertion.canonicalizationVersion = "other-canonicalization";
        },
        expected:
          /derivedAssertion\.canonicalizationVersion.*expected ps-c14n-json-1/,
      },
      {
        label: "result digest grammar",
        mutate: (assertion) => {
          assertion.resultDigest = "A".repeat(64);
        },
        expected: /derivedAssertion\.resultDigest.*lowercase SHA-256/,
      },
      {
        label: "evidence state",
        mutate: (assertion) => {
          nestedRecord(assertion, "evidence").state = "unknown";
        },
        expected: /derivedAssertion\.evidence\.state.*expected supported/,
      },
      {
        label: "evidence fact ID grammar",
        mutate: (assertion) => {
          const references = nestedArray(
            nestedRecord(assertion, "evidence"),
            "factReferences",
          );
          (references[0] as Record<string, unknown>).factId =
            "k0:fact:malformed";
        },
        expected: /evidence\.factReferences\[0\]\.factId.*exact K0 fact ID/,
      },
      {
        label: "evidence fact digest grammar",
        mutate: (assertion) => {
          const references = nestedArray(
            nestedRecord(assertion, "evidence"),
            "factReferences",
          );
          (references[0] as Record<string, unknown>).factDigest = "A".repeat(
            64,
          );
        },
        expected:
          /evidence\.factReferences\[0\]\.factDigest.*lowercase SHA-256/,
      },
      {
        label: "validation state",
        mutate: (assertion) => {
          assertion.validationState = "pending";
        },
        expected: /derivedAssertion\.validationState.*expected validated/,
      },
    ];

    for (const stageOneCase of stageOneCases) {
      const candidate = relationRecord(relation);
      nestedRecord(candidate, "subject").observationId =
        `s0-impossible:observation:${"0".repeat(64)}`;
      changeSharedTime(candidate);
      candidate.relationId = `s0-impossible:relation:${"0".repeat(64)}`;
      misalignInputDigests(candidate);
      forgeLateFields(candidate);
      stageOneCase.mutate(nestedRecord(candidate, "derivedAssertion"));

      expect(
        () => validateSpatialRelation(candidate, observations),
        stageOneCase.label,
      ).toThrow(stageOneCase.expected);
    }
  });

  it("rejects shared-time fact-reference lexical grammar before resolution and derivation", () => {
    const [subject, object] = observationsForPinnedRelation();
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const observations = sortedObservations(subject, object);
    const candidate = relationRecord(relation);
    const sharedTime = nestedRecord(candidate, "sharedValidTime");
    const references = nestedArray(sharedTime, "factReferences");

    (references[0] as Record<string, unknown>).factId = "k0:fact:malformed";
    nestedRecord(candidate, "subject").observationId =
      `s0-impossible:observation:${"0".repeat(64)}`;
    changeSharedTime(candidate);
    candidate.relationId = `s0-impossible:relation:${"0".repeat(64)}`;
    misalignInputDigests(candidate);
    forgeLateFields(candidate);

    expect(() => validateSpatialRelation(candidate, observations)).toThrow(
      /sharedValidTime\.factReferences\[0\]\.factId.*exact K0 fact ID/,
    );
  });

  it("rejects unresolved, mismatched, and self references before derivation", () => {
    const [subject, object] = observationsForPinnedRelation();
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const observations = sortedObservations(subject, object);

    const unresolved = relationRecord(relation);
    nestedRecord(unresolved, "subject").observationId =
      `s0-impossible:observation:${"0".repeat(64)}`;
    changeSharedTime(unresolved);
    unresolved.relationId = `s0-impossible:relation:${"0".repeat(64)}`;
    misalignInputDigests(unresolved);
    forgeLateFields(unresolved);
    expect(() => validateSpatialRelation(unresolved, observations)).toThrow(
      /unresolved observation ID/,
    );

    const unresolvedBeforeTemporalSemantics = relationRecord(relation);
    nestedRecord(unresolvedBeforeTemporalSemantics, "subject").observationId =
      `s0-impossible:observation:${"0".repeat(64)}`;
    nestedRecord(unresolvedBeforeTemporalSemantics, "sharedValidTime").value = {
      kind: "interval",
      start: null,
      end: null,
    };
    forgeLateFields(unresolvedBeforeTemporalSemantics);
    expect(() =>
      validateSpatialRelation(unresolvedBeforeTemporalSemantics, observations),
    ).toThrow(/unresolved observation ID/);

    const mismatched = relationRecord(relation);
    nestedRecord(mismatched, "subject").observationDigest = "0".repeat(64);
    changeSharedTime(mismatched);
    mismatched.relationId = `s0-impossible:relation:${"0".repeat(64)}`;
    misalignInputDigests(mismatched);
    forgeLateFields(mismatched);
    expect(() => validateSpatialRelation(mismatched, observations)).toThrow(
      /reference does not match all three exact fields/,
    );

    const self = relationRecord(relation);
    self.object = mutableClone(self.subject);
    changeSharedTime(self);
    forgeLateFields(self);
    expect(() => validateSpatialRelation(self, observations)).toThrow(
      /subject and object observations must differ/,
    );
    expect(() =>
      createSpatialRelation(subject, subject, { tolerance: 0 }),
    ).toThrow(/subject and object observations must differ/);
  });

  it("checks shared time before relation identity, inputs, outcome, and assertion", () => {
    const [subject, object] = observationsForPinnedRelation();
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const observations = sortedObservations(subject, object);
    const candidate = relationRecord(relation);

    changeSharedTime(candidate);
    candidate.relationId = `s0-impossible:relation:${"0".repeat(64)}`;
    misalignInputDigests(candidate);
    forgeLateFields(candidate);
    expect(() => validateSpatialRelation(candidate, observations)).toThrow(
      /exact shared valid-time derivation/,
    );
  });

  it("checks relation identity before input pairs, outcome, and assertion", () => {
    const [subject, object] = observationsForPinnedRelation();
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const observations = sortedObservations(subject, object);
    const candidate = relationRecord(relation);

    candidate.relationId = `s0-impossible:relation:${"0".repeat(64)}`;
    misalignInputDigests(candidate);
    forgeLateFields(candidate);
    expect(() => validateSpatialRelation(candidate, observations)).toThrow(
      /exact relation identity/,
    );
  });

  it("checks aligned input arrays and evidence before outcome and assertion", () => {
    const [subject, object] = observationsForPinnedRelation();
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const observations = sortedObservations(subject, object);

    const inputCandidate = relationRecord(relation);
    misalignInputDigests(inputCandidate);
    forgeLateFields(inputCandidate);
    expect(() => validateSpatialRelation(inputCandidate, observations)).toThrow(
      /six exact aligned pairs/,
    );

    const evidenceCandidate = relationRecord(relation);
    const assertion = nestedRecord(evidenceCandidate, "derivedAssertion");
    const evidence = nestedRecord(assertion, "evidence");
    const references = nestedArray(evidence, "factReferences");
    const reference = references[0] as Record<string, unknown>;
    reference.factDigest = "0".repeat(64);
    forgeLateFields(evidenceCandidate);
    expect(() =>
      validateSpatialRelation(evidenceCandidate, observations),
    ).toThrow(/cite exactly the six aligned input facts/);
  });

  it("checks outcome before assertion identity and result digest", () => {
    const [subject, object] = observationsForPinnedRelation();
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const observations = sortedObservations(subject, object);
    const candidate = relationRecord(relation);

    forgeLateFields(candidate);
    expect(() => validateSpatialRelation(candidate, observations)).toThrow(
      /relation, uncertainty, and unknown reason do not replay/,
    );
  });
});

describe("S0 SpatialRelation collections and immutability", () => {
  it("sorts only in constructors and rejects unsorted or duplicate relations", () => {
    const [subject, object] = observationsForPinnedRelation();
    const observations = sortedObservations(subject, object);
    const forward = createSpatialRelation(subject, object, { tolerance: 0 });
    const reverse = createSpatialRelation(object, subject, { tolerance: 0 });
    const constructed = createSpatialRelationCollection(
      [reverse, forward],
      observations,
    );

    expect(constructed.map((entry) => entry.relationId)).toEqual(
      constructed.map((entry) => entry.relationId).toSorted(),
    );
    expect(
      validateSpatialRelationCollection(constructed, observations),
    ).toEqual(constructed);
    expect(() =>
      validateSpatialRelationCollection(
        [...constructed].reverse(),
        observations,
      ),
    ).toThrow(/sorted unique/);
    expect(() =>
      createSpatialRelationCollection([forward, forward], observations),
    ).toThrow(/sorted unique/);

    const duplicateBeforeOutcome = relationRecord(forward);
    forgeLateFields(duplicateBeforeOutcome);
    expect(() =>
      validateSpatialRelationCollection(
        [forward, duplicateBeforeOutcome],
        observations,
      ),
    ).toThrow(/sorted unique/);
  });

  it("is deterministic, detached from mutable inputs, and recursively frozen", () => {
    const [frozenSubject, object] = observationsForPinnedRelation();
    const mutableSubject = mutableClone(frozenSubject);
    const first = createSpatialRelation(mutableSubject, object, {
      tolerance: 0,
    });
    const second = createSpatialRelation(frozenSubject, object, {
      tolerance: 0,
    });
    const mutableGeometry = mutableSubject.geometry;
    if (mutableGeometry === null) {
      throw new Error("test requires a present subject geometry");
    }
    (mutableGeometry.minimum as [number, number])[0] = -16;

    expect(first).toEqual(second);
    expect(first.subject.observationDigest).toBe(
      frozenSubject.observationDigest,
    );
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.subject)).toBe(true);
    expect(Object.isFrozen(first.sharedValidTime)).toBe(true);
    expect(Object.isFrozen(first.sharedValidTime.factReferences)).toBe(true);
    expect(Object.isFrozen(first.derivedAssertion)).toBe(true);
    expect(Object.isFrozen(first.derivedAssertion.evidence)).toBe(true);
    expect(
      Object.isFrozen(first.derivedAssertion.evidence.factReferences),
    ).toBe(true);
    expect(() => {
      (first.derivedAssertion.inputFactIds as string[])[0] = "changed";
    }).toThrow(TypeError);
  });
});

describe("S0 committed SpatialRelation fixtures", () => {
  function readFixture(name: string): unknown {
    return JSON.parse(
      readFileSync(
        resolve(root, "fixtures", "experimental", "spatial", name),
        "utf8",
      ),
    ) as unknown;
  }

  function readCommittedObservations(): readonly [
    ImmutableSpatialObservation,
    ImmutableSpatialObservation,
  ] {
    return [
      validateSpatialObservation(
        readFixture("observation-complete-certain.valid.json"),
      ),
      validateSpatialObservation(
        readFixture("observation-partial-coverage.valid.json"),
      ),
    ];
  }

  it("replays the pinned full relation through schema, constructor, and runtime custody", () => {
    const [subject, object] = readCommittedObservations();
    const observations = createSpatialObservationCollection([subject, object]);
    const relationFixture = readFixture("relation-partial-coverage.valid.json");

    expect(
      validateRelationSchema(relationFixture),
      ajv.errorsText(validateRelationSchema.errors),
    ).toBe(true);
    const replayed = validateSpatialRelation(relationFixture, observations);
    expect(replayed).toEqual(relationFixture);
    expect(createSpatialRelation(subject, object, { tolerance: 0 })).toEqual(
      relationFixture,
    );
    expect(replayed.relationId).toBe(
      "s0-impossible:relation:4d6e778837788e65cf8b2f421db1f3372435096d727355c5ba696d6bd1f21123",
    );
    expect(replayed.derivedAssertion.assertionId).toBe(
      "k0:spatial_relation:4d6e778837788e65cf8b2f421db1f3372435096d727355c5ba696d6bd1f21123",
    );
    expect(replayed.derivedAssertion.resultDigest).toBe(
      "43dafd7a45e747910792c36628f28d9297c3b805d31048f77250b448a24f38a8",
    );
  });

  it("rejects the committed duplicate input-digest collision in schema and runtime", () => {
    const [subject, object] = readCommittedObservations();
    const observations = createSpatialObservationCollection([subject, object]);
    const malformed = readFixture(
      "relation-duplicate-input-digest.invalid.json",
    );

    expect(validateRelationSchema(malformed)).toBe(false);
    expect(validateRelationSchema.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: "/derivedAssertion/inputFactDigests",
          keyword: "uniqueItems",
        }),
      ]),
    );
    expect(() => validateSpatialRelation(malformed, observations)).toThrow(
      /six exact aligned pairs/,
    );
  });
});
