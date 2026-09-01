import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { S0_UNKNOWN_REASON_TEXT } from "../../../src/experimental/spatial/constants";
import {
  createSpatialEvidenceInput,
  createSpatialEvidenceViewModel,
  validateSpatialEvidenceInput,
} from "../../../src/experimental/spatial/evidence-view";
import { createJurisdictionEvidence } from "../../../src/experimental/spatial/jurisdiction-evidence";
import { createSpatialObservation } from "../../../src/experimental/spatial/observation";
import { createSpatialRelation } from "../../../src/experimental/spatial/relation";
import type {
  ImmutableSpatialObservation,
  ImmutableSpatialRelation,
  ObservationCoverage,
  ObservationUncertainty,
  S0AxisOrder,
  S0Box,
  SpatialEvidenceInput,
  SpatialObservationInput,
} from "../../../src/experimental/spatial/types";
import type { TemporalValue } from "../../../src/kernel/assertions";

const expectedViewFixture = JSON.parse(
  readFileSync(
    resolve(
      "fixtures/experimental/spatial/evidence-view-representative.expected.json",
    ),
    "utf8",
  ),
) as {
  heading: string;
  explanationId: string;
  explanation: string;
  spatialCaption: string;
  spatialHeaders: readonly string[];
  representativeSpatialCells: readonly string[];
  jurisdictionHeading: string;
  jurisdictionCaption: string;
  jurisdictionHeaders: readonly string[];
  representativeJurisdictionCells: readonly string[];
};

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

function observation(
  fixtureSlug: string,
  geometry: S0Box | null,
  options: {
    axisOrder?: S0AxisOrder;
    resolution?: number;
    validTime?: TemporalValue;
    coverage?: ObservationCoverage;
    uncertainty?: ObservationUncertainty;
  } = {},
): ImmutableSpatialObservation {
  const overrides: Partial<SpatialObservationInput> = { geometry };
  if (options.axisOrder !== undefined) {
    overrides.axisOrder = options.axisOrder;
  }
  if (options.resolution !== undefined) {
    overrides.resolution = options.resolution;
  }
  if (options.validTime !== undefined) {
    overrides.validTimeValue = options.validTime;
  }
  if (options.coverage !== undefined) {
    overrides.coverage = options.coverage;
  }
  if (options.uncertainty !== undefined) {
    overrides.uncertainty = options.uncertainty;
  }
  return createSpatialObservation(observationInput(fixtureSlug, overrides));
}

function sortedInput(
  observations: readonly ImmutableSpatialObservation[],
  relations: readonly ImmutableSpatialRelation[],
  jurisdictionEvidence = [
    createJurisdictionEvidence({
      fixtureSlug: "fixture-0042",
      retrievedAt: "3785-06-07T08:09:10-07:00",
    }),
  ],
) {
  return createSpatialEvidenceInput({
    observations,
    relations,
    jurisdictionEvidence,
  });
}

function relationView(
  relation: ImmutableSpatialRelation,
  observations: readonly ImmutableSpatialObservation[],
) {
  return createSpatialEvidenceViewModel(
    sortedInput(observations, [relation], []),
  ).spatialTable.rows[0]!;
}

function expectRecursivelyFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") {
    return;
  }
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) {
    expectRecursivelyFrozen(child);
  }
}

describe("S0 pure accessible evidence view model", () => {
  it("projects the exact representative rows, literals, order, and source separation", () => {
    const subject = observation(
      "fixture-0301",
      { minimum: [-8, -8], maximum: [8, 8] },
      {
        validTime: {
          kind: "interval",
          start: { kind: "date", value: "3785-01-01", inclusive: true },
          end: null,
        },
      },
    );
    const object = observation(
      "fixture-0302",
      { minimum: [-4, -4], maximum: [4, 4] },
      {
        axisOrder: ["synthetic_y", "synthetic_x"],
        validTime: {
          kind: "interval",
          start: {
            kind: "date",
            value: "3785-01-02",
            inclusive: false,
          },
          end: {
            kind: "date",
            value: "3785-01-04",
            inclusive: true,
          },
        },
      },
    );
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const input = sortedInput([object, subject], [relation]);
    const view = createSpatialEvidenceViewModel(input);

    expect({
      heading: view.heading,
      explanationId: view.explanationId,
      explanation: view.explanation,
      spatialCaption: view.spatialTable.caption,
      spatialHeaders: view.spatialTable.headers,
      representativeSpatialCells: view.spatialTable.rows[0]!.cells,
      jurisdictionHeading: view.jurisdictionSection?.heading,
      jurisdictionCaption: view.jurisdictionSection?.caption,
      jurisdictionHeaders: view.jurisdictionSection?.headers,
      representativeJurisdictionCells: view.jurisdictionSection?.rows[0]?.cells,
    }).toEqual(expectedViewFixture);
    expect(view.spatialTable.rows[0]!.cells).toEqual([
      "s0-impossible:feature:fixture-0301",
      "s0-impossible:feature:fixture-0302",
      "Contains",
      "(3785-01-02, 3785-01-04]",
      "urn:policy-sentinel:crs:impossible-grid:1.0.0",
      "Subject: [synthetic_x, synthetic_y]; object: [synthetic_y, synthetic_x].",
      "Subject: 1 impossible_unit; object: 1 impossible_unit.",
      "0 impossible_unit",
      "Subject: complete_fixture_extent; object: complete_fixture_extent.",
      "Subject: certain; object: certain; relation: certain.",
      "s0-axis-aligned-box-topology 1.0.0",
      "Policy Sentinel impossible synthetic fixture",
    ]);
    expect(view.jurisdictionSection?.rows[0]?.cells).toEqual([
      "s0-impossible:feature:fixture-0042",
      "s0-impossible:administrative-unit:fixture-0042",
      "Policy Sentinel impossible synthetic administrative statement",
      "Impossible synthetic source statement: s0-impossible:feature:fixture-0042 is assigned to s0-impossible:administrative-unit:fixture-0042 in this fixture only.",
      "explicit_synthetic_source_statement",
      "validated_synthetic_fixture",
      "Policy Sentinel impossible synthetic fixture",
    ]);
    expect(view.spatialTable.rows[0]!.cells.join(" ")).not.toContain(
      "administrative-unit",
    );
    expectRecursivelyFrozen(view);
  });

  it("renders all determinate labels and every exact unknown-reason sentence", () => {
    const determinateCases = [
      [
        "Intersects",
        { minimum: [-4, -4], maximum: [4, 4] },
        { minimum: [-4, -4], maximum: [4, 4] },
      ],
      [
        "Contains",
        { minimum: [-8, -8], maximum: [8, 8] },
        { minimum: [-4, -4], maximum: [4, 4] },
      ],
      [
        "Within",
        { minimum: [-4, -4], maximum: [4, 4] },
        { minimum: [-8, -8], maximum: [8, 8] },
      ],
      [
        "Touches",
        { minimum: [-4, -4], maximum: [0, 0] },
        { minimum: [0, 0], maximum: [4, 4] },
      ],
      [
        "Disjoint",
        { minimum: [-8, -4], maximum: [-4, 4] },
        { minimum: [0, -4], maximum: [4, 4] },
      ],
    ] as const;
    for (let index = 0; index < determinateCases.length; index += 1) {
      const [expected, subjectBox, objectBox] = determinateCases[index]!;
      const subject = observation(`fixture-04${String(index)}0`, subjectBox);
      const object = observation(`fixture-04${String(index)}1`, objectBox);
      const relation = createSpatialRelation(subject, object, { tolerance: 0 });
      expect(relationView(relation, [subject, object]).cells[2]).toBe(expected);
    }

    const certain = (slug: string, box: S0Box, resolution = 1) =>
      observation(slug, box, { resolution });
    const completeBox = { minimum: [-4, -4], maximum: [4, 4] } as const;
    const unknownCases: readonly [
      string,
      ImmutableSpatialObservation,
      ImmutableSpatialObservation,
      number,
    ][] = [
      [
        "missing_geometry",
        observation("fixture-0500", null, {
          coverage: "missing_fixture_geometry",
          uncertainty: { state: "uncertain", reason: "coverage_limitation" },
        }),
        certain("fixture-0501", completeBox),
        0,
      ],
      [
        "partial_coverage",
        observation("fixture-0502", completeBox, {
          coverage: "partial_fixture_extent",
          uncertainty: { state: "uncertain", reason: "coverage_limitation" },
        }),
        certain("fixture-0503", completeBox),
        0,
      ],
      [
        "unknown_coverage",
        observation("fixture-0504", completeBox, {
          coverage: "unknown",
          uncertainty: { state: "uncertain", reason: "coverage_limitation" },
        }),
        certain("fixture-0505", completeBox),
        0,
      ],
      [
        "observation_uncertain",
        observation("fixture-0506", completeBox, {
          uncertainty: { state: "uncertain", reason: "fixture_limitation" },
        }),
        certain("fixture-0507", completeBox),
        0,
      ],
      [
        "resolution_mismatch",
        certain("fixture-0508", completeBox, 1),
        certain("fixture-0509", completeBox, 2),
        0,
      ],
      [
        "valid_time_mixed_precision",
        observation("fixture-0510", completeBox, {
          validTime: { kind: "date", value: "3785-01-01" },
        }),
        observation("fixture-0511", completeBox, {
          validTime: {
            kind: "date_time",
            value: "3785-01-01T00:00:00Z",
          },
        }),
        0,
      ],
      [
        "valid_time_disjoint",
        observation("fixture-0512", completeBox, {
          validTime: { kind: "date", value: "3785-01-01" },
        }),
        observation("fixture-0513", completeBox, {
          validTime: { kind: "date", value: "3785-01-02" },
        }),
        0,
      ],
      [
        "tolerance_ambiguity",
        certain("fixture-0514", {
          minimum: [-4, -4],
          maximum: [4, 4],
        }),
        certain("fixture-0515", {
          minimum: [5, -4],
          maximum: [9, 4],
        }),
        1,
      ],
    ];
    for (const [reason, subject, object, tolerance] of unknownCases) {
      const relation = createSpatialRelation(subject, object, { tolerance });
      expect(relation.unknownReason).toBe(reason);
      expect(relationView(relation, [subject, object]).cells[2]).toBe(
        S0_UNKNOWN_REASON_TEXT[reason as keyof typeof S0_UNKNOWN_REASON_TEXT],
      );
    }
  }, 30_000);

  it("renders all four observation uncertainty reasons exactly", () => {
    const box = { minimum: [-4, -4], maximum: [4, 4] } as const;
    const object = observation("fixture-0520", box);
    const cases = [
      {
        fixtureSlug: "fixture-0521",
        coverage: "complete_fixture_extent",
        observationReason: "fixture_limitation",
        relationReason: "observation_uncertain",
      },
      {
        fixtureSlug: "fixture-0522",
        coverage: "complete_fixture_extent",
        observationReason: "coordinate_limitation",
        relationReason: "observation_uncertain",
      },
      {
        fixtureSlug: "fixture-0523",
        coverage: "complete_fixture_extent",
        observationReason: "temporal_limitation",
        relationReason: "observation_uncertain",
      },
      {
        fixtureSlug: "fixture-0524",
        coverage: "partial_fixture_extent",
        observationReason: "coverage_limitation",
        relationReason: "partial_coverage",
      },
    ] as const;

    for (const testCase of cases) {
      const subject = observation(testCase.fixtureSlug, box, {
        coverage: testCase.coverage,
        uncertainty: {
          state: "uncertain",
          reason: testCase.observationReason,
        },
      });
      const relation = createSpatialRelation(subject, object, { tolerance: 0 });
      const row = relationView(relation, [subject, object]);
      expect(row.cells[9]).toBe(
        `Subject: uncertain(${testCase.observationReason}); object: certain; relation: uncertain(${testCase.relationReason}).`,
      );
    }
  });

  it("renders point, interval, open-bound, mixed-precision, and disjoint time exactly", () => {
    const box = { minimum: [-4, -4], maximum: [4, 4] } as const;
    const cases: readonly [TemporalValue, TemporalValue, string][] = [
      [
        { kind: "date", value: "3785-02-01" },
        { kind: "date", value: "3785-02-01" },
        "3785-02-01",
      ],
      [
        { kind: "date_time", value: "3785-02-01T12:00:00Z" },
        { kind: "date_time", value: "3785-02-01T12:00:00Z" },
        "3785-02-01T12:00:00Z",
      ],
      [
        {
          kind: "interval",
          start: { kind: "date", value: "3785-02-01", inclusive: true },
          end: { kind: "date", value: "3785-02-03", inclusive: false },
        },
        {
          kind: "interval",
          start: { kind: "date", value: "3785-02-01", inclusive: true },
          end: { kind: "date", value: "3785-02-03", inclusive: false },
        },
        "[3785-02-01, 3785-02-03)",
      ],
      [
        {
          kind: "interval",
          start: null,
          end: { kind: "date", value: "3785-02-03", inclusive: true },
        },
        {
          kind: "interval",
          start: null,
          end: { kind: "date", value: "3785-02-03", inclusive: true },
        },
        "(-infinity, 3785-02-03]",
      ],
      [
        {
          kind: "interval",
          start: { kind: "date", value: "3785-02-01", inclusive: false },
          end: null,
        },
        {
          kind: "interval",
          start: { kind: "date", value: "3785-02-01", inclusive: false },
          end: null,
        },
        "(3785-02-01, +infinity)",
      ],
      [
        { kind: "date", value: "3785-02-01" },
        { kind: "date_time", value: "3785-02-01T00:00:00Z" },
        "No shared valid time - mixed date/date-time precision.",
      ],
      [
        { kind: "date", value: "3785-02-01" },
        { kind: "date", value: "3785-02-02" },
        "No shared valid time - disjoint valid times.",
      ],
    ];

    for (let index = 0; index < cases.length; index += 1) {
      const [subjectTime, objectTime, expected] = cases[index]!;
      const subject = observation(`fixture-06${String(index)}0`, box, {
        validTime: subjectTime,
      });
      const object = observation(`fixture-06${String(index)}1`, box, {
        validTime: objectTime,
      });
      const relation = createSpatialRelation(subject, object, { tolerance: 0 });
      expect(relationView(relation, [subject, object]).cells[3]).toBe(expected);
    }
  });

  it("sorts only through the explicit constructor and validates exact closed bounds", () => {
    const first = observation("fixture-0701", {
      minimum: [-8, -8],
      maximum: [-4, -4],
    });
    const second = observation("fixture-0702", {
      minimum: [0, 0],
      maximum: [4, 4],
    });
    const forward = createSpatialRelation(first, second, { tolerance: 0 });
    const reverse = createSpatialRelation(second, first, { tolerance: 0 });
    const jurisdictionFirst = createJurisdictionEvidence({
      fixtureSlug: "fixture-0703",
      retrievedAt: "3785-01-01T00:00:00Z",
    });
    const jurisdictionSecond = createJurisdictionEvidence({
      fixtureSlug: "fixture-0704",
      retrievedAt: "3785-01-01T00:00:00Z",
    });
    const constructed = createSpatialEvidenceInput({
      observations: [second, first],
      relations: [reverse, forward],
      jurisdictionEvidence: [jurisdictionSecond, jurisdictionFirst],
    });
    for (const [collection, id] of [
      [constructed.observations, "observationId"],
      [constructed.relations, "relationId"],
      [constructed.jurisdictionEvidence, "jurisdictionEvidenceId"],
    ] as const) {
      const identifiers = collection.map((entry) =>
        String((entry as unknown as Record<string, unknown>)[id]),
      );
      expect(identifiers).toEqual([...identifiers].sort());
    }
    expect(validateSpatialEvidenceInput(constructed)).toEqual(constructed);

    const unsortedObservations = {
      ...constructed,
      observations: [...constructed.observations].reverse(),
    };
    expect(() => validateSpatialEvidenceInput(unsortedObservations)).toThrow(
      /stable-ID-sorted/,
    );
    expect(() =>
      validateSpatialEvidenceInput({
        ...constructed,
        relations: [constructed.relations[0]!, constructed.relations[0]!],
      }),
    ).toThrow(/stable-ID-sorted/);
    expect(() =>
      validateSpatialEvidenceInput({ ...constructed, callback: "forbidden" }),
    ).toThrow(/unexpected field/);
    expect(() =>
      validateSpatialEvidenceInput({
        ...constructed,
        observations: Array(65).fill(first),
      }),
    ).toThrow(/no more than 64/);
    expect(() =>
      validateSpatialEvidenceInput({
        ...constructed,
        relations: Array(65).fill(forward),
      }),
    ).toThrow(/no more than 64/);
    expect(() =>
      validateSpatialEvidenceInput({
        ...constructed,
        jurisdictionEvidence: Array(17).fill(jurisdictionFirst),
      }),
    ).toThrow(/no more than 16/);
  });

  it("projects multiple spatial and jurisdiction rows in exact stable-ID order", () => {
    const first = observation("fixture-0711", {
      minimum: [-8, -8],
      maximum: [-4, -4],
    });
    const second = observation(
      "fixture-0712",
      { minimum: [0, 0], maximum: [4, 4] },
      { axisOrder: ["synthetic_y", "synthetic_x"] },
    );
    const forward = createSpatialRelation(first, second, { tolerance: 0 });
    const reverse = createSpatialRelation(second, first, { tolerance: 0 });
    const expectedRelations = [forward, reverse].sort((left, right) =>
      left.relationId < right.relationId ? -1 : 1,
    );
    const callerRelations = [...expectedRelations].reverse();

    const jurisdictionFirst = createJurisdictionEvidence({
      fixtureSlug: "fixture-0713",
      retrievedAt: "3785-01-01T00:00:00Z",
    });
    const jurisdictionSecond = createJurisdictionEvidence({
      fixtureSlug: "fixture-0714",
      retrievedAt: "3785-01-01T00:00:00Z",
    });
    const expectedJurisdiction = [jurisdictionFirst, jurisdictionSecond].sort(
      (left, right) =>
        left.jurisdictionEvidenceId < right.jurisdictionEvidenceId ? -1 : 1,
    );
    const callerJurisdiction = [...expectedJurisdiction].reverse();

    expect(callerRelations.map((relation) => relation.relationId)).toEqual(
      expectedRelations.map((relation) => relation.relationId).reverse(),
    );
    expect(
      callerJurisdiction.map((evidence) => evidence.jurisdictionEvidenceId),
    ).toEqual(
      expectedJurisdiction
        .map((evidence) => evidence.jurisdictionEvidenceId)
        .reverse(),
    );

    const view = createSpatialEvidenceViewModel(
      createSpatialEvidenceInput({
        observations: [second, first],
        relations: callerRelations,
        jurisdictionEvidence: callerJurisdiction,
      }),
    );
    const observationIndex = new Map(
      [first, second].map((entry) => [entry.observationId, entry]),
    );
    expect(view.spatialTable.rows).toEqual(
      expectedRelations.map((relation) => {
        const subject = observationIndex.get(relation.subject.observationId)!;
        const object = observationIndex.get(relation.object.observationId)!;
        return {
          id: relation.relationId,
          cells: [
            subject.featureId,
            object.featureId,
            "Disjoint",
            "3785-01-03",
            "urn:policy-sentinel:crs:impossible-grid:1.0.0",
            `Subject: [${subject.coordinateSpace.axisOrder[0]}, ${subject.coordinateSpace.axisOrder[1]}]; object: [${object.coordinateSpace.axisOrder[0]}, ${object.coordinateSpace.axisOrder[1]}].`,
            "Subject: 1 impossible_unit; object: 1 impossible_unit.",
            "0 impossible_unit",
            "Subject: complete_fixture_extent; object: complete_fixture_extent.",
            "Subject: certain; object: certain; relation: certain.",
            "s0-axis-aligned-box-topology 1.0.0",
            "Policy Sentinel impossible synthetic fixture",
          ],
        };
      }),
    );
    expect(view.jurisdictionSection?.rows).toEqual(
      expectedJurisdiction.map((evidence) => ({
        id: evidence.jurisdictionEvidenceId,
        cells: [
          evidence.featureId,
          evidence.administrativeUnitId,
          evidence.sourceLabel,
          evidence.statement,
          evidence.evidenceBasis,
          evidence.reviewState,
          evidence.attribution,
        ],
      })),
    );
  });

  it("rejects unresolved references and returns detached immutable output", () => {
    const subject = observation("fixture-0801", {
      minimum: [-4, -4],
      maximum: [0, 0],
    });
    const object = observation("fixture-0802", {
      minimum: [0, 0],
      maximum: [4, 4],
    });
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const input = sortedInput([subject, object], [relation], []);
    const mutable = structuredClone(input) as SpatialEvidenceInput;
    const forged = structuredClone(input) as SpatialEvidenceInput;
    forged.relations[0]!.subject.observationId = `s0-impossible:observation:${"0".repeat(64)}`;
    expect(() => validateSpatialEvidenceInput(forged)).toThrow(
      /unresolved observation ID/,
    );

    const view = createSpatialEvidenceViewModel(mutable);
    mutable.relations[0]!.relation = "disjoint";
    expect(view.spatialTable.rows[0]!.cells[2]).toBe("Touches");
    expectRecursivelyFrozen(view);
  });

  it("omits only the separate jurisdiction section for an empty valid array", () => {
    const subject = observation("fixture-0901", {
      minimum: [-4, -4],
      maximum: [0, 0],
    });
    const object = observation("fixture-0902", {
      minimum: [0, 0],
      maximum: [4, 4],
    });
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });
    const view = createSpatialEvidenceViewModel(
      sortedInput([subject, object], [relation], []),
    );
    expect(view.jurisdictionSection).toBeNull();
    expect(view.spatialTable.rows).toHaveLength(1);
  });
});
