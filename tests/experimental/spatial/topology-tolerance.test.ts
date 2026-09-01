import { describe, expect, it } from "vitest";

import topologyCases from "../../../fixtures/experimental/spatial/relation-topology-cases.v1.json";
import {
  classifyExactTopology,
  classifyTopologyWithTolerance,
  type ToleranceClassification,
} from "../../../src/experimental/spatial/topology";
import { normalizeBounds } from "../../../src/experimental/spatial/validation";
import type {
  DeterminateSpatialRelationKind,
  S0AxisOrder,
  S0Box,
  S0NormalizedBounds,
} from "../../../src/experimental/spatial/types";

interface OracleResult {
  classification: ToleranceClassification;
  candidatePairClassifications: number;
  subjectCandidates: number;
  objectCandidates: number;
}

interface NamedToleranceCase {
  name: string;
  pairName: string;
  direction: "forward" | "reverse";
  subject: S0NormalizedBounds;
  object: S0NormalizedBounds;
  tolerance: number;
  expected: ToleranceClassification;
}

function exactOracle(
  subject: S0NormalizedBounds,
  object: S0NormalizedBounds,
): DeterminateSpatialRelationKind {
  const xOverlap =
    Math.min(subject.synthetic_x.maximum, object.synthetic_x.maximum) -
    Math.max(subject.synthetic_x.minimum, object.synthetic_x.minimum);
  const yOverlap =
    Math.min(subject.synthetic_y.maximum, object.synthetic_y.maximum) -
    Math.max(subject.synthetic_y.minimum, object.synthetic_y.minimum);
  if (xOverlap < 0 || yOverlap < 0) return "disjoint";
  if (xOverlap === 0 || yOverlap === 0) return "touches";
  if (
    subject.synthetic_x.minimum < object.synthetic_x.minimum &&
    subject.synthetic_x.maximum > object.synthetic_x.maximum &&
    subject.synthetic_y.minimum < object.synthetic_y.minimum &&
    subject.synthetic_y.maximum > object.synthetic_y.maximum
  ) {
    return "contains";
  }
  if (
    object.synthetic_x.minimum < subject.synthetic_x.minimum &&
    object.synthetic_x.maximum > subject.synthetic_x.maximum &&
    object.synthetic_y.minimum < subject.synthetic_y.minimum &&
    object.synthetic_y.maximum > subject.synthetic_y.maximum
  ) {
    return "within";
  }
  return "intersects";
}

function perturbations(
  box: S0NormalizedBounds,
  tolerance: number,
): S0NormalizedBounds[] {
  const candidates: S0NormalizedBounds[] = [];
  for (let xMin = -tolerance; xMin <= tolerance; xMin += 1) {
    for (let xMax = -tolerance; xMax <= tolerance; xMax += 1) {
      for (let yMin = -tolerance; yMin <= tolerance; yMin += 1) {
        for (let yMax = -tolerance; yMax <= tolerance; yMax += 1) {
          const candidate: S0NormalizedBounds = {
            synthetic_x: {
              minimum: box.synthetic_x.minimum + xMin,
              maximum: box.synthetic_x.maximum + xMax,
            },
            synthetic_y: {
              minimum: box.synthetic_y.minimum + yMin,
              maximum: box.synthetic_y.maximum + yMax,
            },
          };
          if (
            candidate.synthetic_x.minimum < -32 ||
            candidate.synthetic_x.maximum > 32 ||
            candidate.synthetic_y.minimum < -32 ||
            candidate.synthetic_y.maximum > 32 ||
            candidate.synthetic_x.minimum >= candidate.synthetic_x.maximum ||
            candidate.synthetic_y.minimum >= candidate.synthetic_y.maximum
          ) {
            continue;
          }
          candidates.push(candidate);
        }
      }
    }
  }
  return candidates;
}

function toleranceOracle(
  subject: S0NormalizedBounds,
  object: S0NormalizedBounds,
  tolerance: number,
): OracleResult {
  const subjects = perturbations(subject, tolerance);
  const objects = perturbations(object, tolerance);
  let first: DeterminateSpatialRelationKind | undefined;
  let candidatePairClassifications = 0;
  for (const subjectCandidate of subjects) {
    for (const objectCandidate of objects) {
      candidatePairClassifications += 1;
      const classification = exactOracle(subjectCandidate, objectCandidate);
      if (first === undefined) {
        first = classification;
      } else if (classification !== first) {
        return {
          classification: "tolerance_ambiguity",
          candidatePairClassifications,
          subjectCandidates: subjects.length,
          objectCandidates: objects.length,
        };
      }
    }
  }
  if (first === undefined) throw new Error("zero perturbation was omitted");
  return {
    classification: first,
    candidatePairClassifications,
    subjectCandidates: subjects.length,
    objectCandidates: objects.length,
  };
}

function storedBox(bounds: S0NormalizedBounds, order: S0AxisOrder): S0Box {
  const first = bounds[order[0]];
  const second = bounds[order[1]];
  return {
    minimum: [first.minimum, second.minimum],
    maximum: [first.maximum, second.maximum],
  };
}

function reverseClassification(
  classification: ToleranceClassification,
): ToleranceClassification {
  if (classification === "contains") return "within";
  if (classification === "within") return "contains";
  return classification;
}

function transformBox(
  box: S0NormalizedBounds,
  scale: 1 | 2,
  translation: number,
): S0NormalizedBounds {
  return {
    synthetic_x: {
      minimum: box.synthetic_x.minimum * scale + translation,
      maximum: box.synthetic_x.maximum * scale + translation,
    },
    synthetic_y: {
      minimum: box.synthetic_y.minimum * scale + translation,
      maximum: box.synthetic_y.maximum * scale + translation,
    },
  };
}

const fixtureToleranceCases = topologyCases.toleranceCases as readonly Omit<
  NamedToleranceCase,
  "pairName" | "direction"
>[];

const positiveTransformBases = [
  fixtureToleranceCases.find((entry) => entry.name === "stable-contains-t1"),
  fixtureToleranceCases.find((entry) => entry.name === "near-gap-ambiguous-t1"),
];
if (positiveTransformBases.some((entry) => entry === undefined)) {
  throw new Error("required positive-tolerance transform base is absent");
}

const positiveTransformedCases = positiveTransformBases.flatMap((entry) => {
  if (entry === undefined) return [];
  return ([-4, 4] as const).map((translation) => ({
    name: `${entry.name}-scale-2-translate-${translation < 0 ? "minus" : "plus"}-${Math.abs(translation)}`,
    subject: transformBox(entry.subject, 2, translation),
    object: transformBox(entry.object, 2, translation),
    tolerance: entry.tolerance,
    expected: entry.expected,
  }));
});

const boundedPositiveCases: readonly NamedToleranceCase[] = [
  ...fixtureToleranceCases,
  ...positiveTransformedCases,
].flatMap((entry) => [
  {
    ...entry,
    pairName: entry.name,
    direction: "forward" as const,
  },
  {
    ...entry,
    name: `${entry.name}-reversed`,
    pairName: entry.name,
    direction: "reverse" as const,
    subject: entry.object,
    object: entry.subject,
    expected: reverseClassification(entry.expected),
  },
]);

const axisOrders: readonly S0AxisOrder[] = [
  ["synthetic_x", "synthetic_y"],
  ["synthetic_y", "synthetic_x"],
];

describe("S0 exact axis-aligned topology", () => {
  it.each(topologyCases.exactCases)("classifies $name", (testCase) => {
    expect(classifyExactTopology(testCase.subject, testCase.object)).toBe(
      testCase.expected,
    );
  });

  it("enumerates exactly 40,000 resolution-1 classifications and reuses them for every bounded property", () => {
    const values = [-2, -1, 0, 1, 2];
    const intervals = values.flatMap((minimum, minimumIndex) =>
      values.slice(minimumIndex + 1).map((maximum) => ({ minimum, maximum })),
    );
    const boxes = intervals.flatMap((syntheticX) =>
      intervals.map((syntheticY) => ({
        synthetic_x: syntheticX,
        synthetic_y: syntheticY,
      })),
    );
    expect(boxes).toHaveLength(100);

    const cached: DeterminateSpatialRelationKind[][] = Array.from(
      { length: boxes.length },
      () => [],
    );
    let classifications = 0;
    for (let subjectIndex = 0; subjectIndex < boxes.length; subjectIndex += 1) {
      const subject = boxes[subjectIndex]!;
      for (let objectIndex = 0; objectIndex < boxes.length; objectIndex += 1) {
        const object = boxes[objectIndex]!;
        const expected = exactOracle(subject, object);
        const storageOrderResults: DeterminateSpatialRelationKind[] = [];
        for (const subjectOrder of axisOrders) {
          for (const objectOrder of axisOrders) {
            const normalizedSubject = normalizeBounds(
              subjectOrder,
              storedBox(subject, subjectOrder),
            );
            const normalizedObject = normalizeBounds(
              objectOrder,
              storedBox(object, objectOrder),
            );
            const actual =
              subjectOrder[0] === "synthetic_x" &&
              objectOrder[0] === "synthetic_x"
                ? classifyTopologyWithTolerance(
                    normalizedSubject,
                    normalizedObject,
                    0,
                  )
                : classifyExactTopology(normalizedSubject, normalizedObject);
            expect(actual).toBe(expected);
            if (actual === "tolerance_ambiguity") {
              throw new Error("tolerance zero produced an ambiguous result");
            }
            storageOrderResults.push(actual);
            classifications += 1;
          }
        }
        expect(new Set(storageOrderResults)).toEqual(new Set([expected]));
        cached[subjectIndex]![objectIndex] = storageOrderResults[0]!;
      }
    }
    expect(classifications).toBe(40_000);
    let reversalAssertions = 0;
    for (let subjectIndex = 0; subjectIndex < boxes.length; subjectIndex += 1) {
      for (let objectIndex = 0; objectIndex < boxes.length; objectIndex += 1) {
        const forward = cached[subjectIndex]![objectIndex]!;
        const reverse = cached[objectIndex]![subjectIndex]!;
        expect(reverse).toBe(reverseClassification(forward));
        expect([
          "intersects",
          "contains",
          "within",
          "touches",
          "disjoint",
        ]).toContain(forward);
        reversalAssertions += 1;
      }
    }
    expect(reversalAssertions).toBe(10_000);
    console.info(
      `S0 exact topology enumeration: ${classifications} classifications; ${reversalAssertions} cached reversal/duality/exclusivity assertions`,
    );
  });

  it("covers at most 256 valid full-domain, resolution, translation, and scale transforms", () => {
    const bases: readonly [S0NormalizedBounds, S0NormalizedBounds][] = [
      [
        {
          synthetic_x: { minimum: -32, maximum: 32 },
          synthetic_y: { minimum: -32, maximum: 32 },
        },
        {
          synthetic_x: { minimum: -8, maximum: 8 },
          synthetic_y: { minimum: -8, maximum: 8 },
        },
      ],
      [
        {
          synthetic_x: { minimum: -16, maximum: 0 },
          synthetic_y: { minimum: -16, maximum: 16 },
        },
        {
          synthetic_x: { minimum: 0, maximum: 16 },
          synthetic_y: { minimum: -8, maximum: 8 },
        },
      ],
      [
        {
          synthetic_x: { minimum: -16, maximum: -8 },
          synthetic_y: { minimum: -8, maximum: 8 },
        },
        {
          synthetic_x: { minimum: 8, maximum: 16 },
          synthetic_y: { minimum: -8, maximum: 8 },
        },
      ],
    ];
    let cases = 0;
    for (const [subject, object] of bases) {
      const expected = exactOracle(subject, object);
      for (const scale of [1, 2]) {
        for (const translation of [-8, 0, 8]) {
          const transformedSubject = transformBox(
            subject,
            scale as 1 | 2,
            translation,
          );
          const transformedObject = transformBox(
            object,
            scale as 1 | 2,
            translation,
          );
          const coordinates = [
            transformedSubject.synthetic_x.minimum,
            transformedSubject.synthetic_x.maximum,
            transformedSubject.synthetic_y.minimum,
            transformedSubject.synthetic_y.maximum,
            transformedObject.synthetic_x.minimum,
            transformedObject.synthetic_x.maximum,
            transformedObject.synthetic_y.minimum,
            transformedObject.synthetic_y.maximum,
          ];
          if (
            coordinates.some(
              (coordinate) => coordinate < -32 || coordinate > 32,
            )
          )
            continue;
          for (const resolution of [1, 8]) {
            if (coordinates.some((coordinate) => coordinate % resolution !== 0))
              continue;
            const forward = classifyExactTopology(
              transformedSubject,
              transformedObject,
            );
            const reverse = classifyExactTopology(
              transformedObject,
              transformedSubject,
            );
            expect(forward).toBe(expected);
            expect(reverse).toBe(reverseClassification(forward));
            cases += 2;
          }
        }
      }
    }
    expect(cases).toBeGreaterThan(0);
    expect(cases).toBeLessThanOrEqual(256);
    console.info(
      `S0 full-domain/resolution/translation/scale transforms: ${cases} forward-or-reverse classifications`,
    );
  });
});

describe("S0 bounded whole-box tolerance", () => {
  it("matches the streamed oracle with reversal, duality, transforms, and every frozen ceiling", () => {
    expect(boundedPositiveCases).toHaveLength(32);
    expect(boundedPositiveCases.length).toBeLessThanOrEqual(64);
    expect(new Set(boundedPositiveCases.map((entry) => entry.name)).size).toBe(
      boundedPositiveCases.length,
    );
    let oracleClassifications = 0;
    let implementationClassificationCeiling = 0;
    let implementationCases = 0;
    const perCaseCounts: Record<string, number> = {};
    const results = new Map<
      string,
      Partial<Record<"forward" | "reverse", ToleranceClassification>>
    >();
    for (const testCase of boundedPositiveCases) {
      const oracle = toleranceOracle(
        testCase.subject,
        testCase.object,
        testCase.tolerance,
      );
      expect(oracle.subjectCandidates, testCase.name).toBeLessThanOrEqual(625);
      expect(oracle.objectCandidates, testCase.name).toBeLessThanOrEqual(625);
      const implementationCaseCeiling =
        oracle.subjectCandidates * oracle.objectCandidates;
      expect(implementationCaseCeiling, testCase.name).toBeLessThanOrEqual(
        390_625,
      );
      expect(
        oracle.candidatePairClassifications,
        testCase.name,
      ).toBeLessThanOrEqual(390_625);
      expect(oracle.classification, testCase.name).toBe(testCase.expected);
      const actual = classifyTopologyWithTolerance(
        testCase.subject,
        testCase.object,
        testCase.tolerance,
      );
      expect(actual, testCase.name).toBe(oracle.classification);
      implementationCases += 1;
      if (oracle.classification !== "tolerance_ambiguity") {
        expect(oracle.classification, testCase.name).toBe(
          exactOracle(testCase.subject, testCase.object),
        );
      }
      oracleClassifications += oracle.candidatePairClassifications;
      implementationClassificationCeiling += implementationCaseCeiling;
      perCaseCounts[testCase.name] = oracle.candidatePairClassifications;
      const pairResults = results.get(testCase.pairName) ?? {};
      pairResults[testCase.direction] = actual;
      results.set(testCase.pairName, pairResults);
    }
    for (const [pairName, result] of results) {
      expect(result.forward, pairName).toBeDefined();
      expect(result.reverse, pairName).toBe(
        reverseClassification(result.forward!),
      );
    }
    expect(implementationCases).toBe(boundedPositiveCases.length);
    expect(oracleClassifications).toBeLessThanOrEqual(25_000_000);
    expect(implementationClassificationCeiling).toBeLessThanOrEqual(25_000_000);
    expect(
      oracleClassifications + implementationClassificationCeiling,
    ).toBeLessThanOrEqual(25_000_000);
    console.info(
      `S0 tolerance enumeration: ${boundedPositiveCases.length} named implementation cases; ${oracleClassifications} oracle candidate-pair classifications; ${implementationClassificationCeiling} implementation candidate-pair ceiling; ${oracleClassifications + implementationClassificationCeiling} combined bounded work; per-case ${JSON.stringify(perCaseCounts)}`,
    );
  }, 30_000);

  it("rejects tolerance outside the exact bounded integer range", () => {
    expect(() =>
      classifyTopologyWithTolerance(
        topologyCases.exactCases[0]!.subject,
        topologyCases.exactCases[0]!.object,
        3,
      ),
    ).toThrow(/safe integer from 0 through 2/);
  });
});
