import type { DeepReadonly } from "../../kernel/assertions/index";

import type {
  DeterminateSpatialRelationKind,
  S0NormalizedBounds,
} from "./types";
import {
  assertS0JsonValue,
  exactKeys,
  fail,
  immutableClone,
  objectValue,
  validateSafeInteger,
  validateTolerance,
} from "./validation";
import { S0_MAX_COORDINATE, S0_MIN_COORDINATE } from "./constants";

export type ToleranceClassification =
  DeterminateSpatialRelationKind | "tolerance_ambiguity";

export type ImmutableNormalizedBounds = DeepReadonly<S0NormalizedBounds>;

function validateAxisBounds(
  value: unknown,
  path: string,
): { minimum: number; maximum: number } {
  const object = objectValue(value, path);
  exactKeys(object, path, ["minimum", "maximum"]);
  const minimum = validateSafeInteger(
    object.minimum,
    S0_MIN_COORDINATE,
    S0_MAX_COORDINATE,
    `${path}.minimum`,
  );
  const maximum = validateSafeInteger(
    object.maximum,
    S0_MIN_COORDINATE,
    S0_MAX_COORDINATE,
    `${path}.maximum`,
  );
  if (minimum >= maximum) {
    fail(path, "minimum must be strictly less than maximum");
  }
  return { minimum, maximum };
}

function validateNormalizedBox(
  value: ImmutableNormalizedBounds,
  path: string,
): S0NormalizedBounds {
  assertS0JsonValue(value);
  const object = objectValue(value, path);
  exactKeys(object, path, ["synthetic_x", "synthetic_y"]);
  return {
    synthetic_x: validateAxisBounds(object.synthetic_x, `${path}.synthetic_x`),
    synthetic_y: validateAxisBounds(object.synthetic_y, `${path}.synthetic_y`),
  };
}

function classifyExactUnchecked(
  subject: ImmutableNormalizedBounds,
  object: ImmutableNormalizedBounds,
): DeterminateSpatialRelationKind {
  const xOverlap =
    Math.min(subject.synthetic_x.maximum, object.synthetic_x.maximum) -
    Math.max(subject.synthetic_x.minimum, object.synthetic_x.minimum);
  const yOverlap =
    Math.min(subject.synthetic_y.maximum, object.synthetic_y.maximum) -
    Math.max(subject.synthetic_y.minimum, object.synthetic_y.minimum);

  if (xOverlap < 0 || yOverlap < 0) {
    return "disjoint";
  }
  if (xOverlap === 0 || yOverlap === 0) {
    return "touches";
  }

  const contains =
    subject.synthetic_x.minimum < object.synthetic_x.minimum &&
    subject.synthetic_x.maximum > object.synthetic_x.maximum &&
    subject.synthetic_y.minimum < object.synthetic_y.minimum &&
    subject.synthetic_y.maximum > object.synthetic_y.maximum;
  if (contains) {
    return "contains";
  }

  const within =
    object.synthetic_x.minimum < subject.synthetic_x.minimum &&
    object.synthetic_x.maximum > subject.synthetic_x.maximum &&
    object.synthetic_y.minimum < subject.synthetic_y.minimum &&
    object.synthetic_y.maximum > subject.synthetic_y.maximum;
  if (within) {
    return "within";
  }
  return "intersects";
}

export function classifyExactTopology(
  subjectInput: ImmutableNormalizedBounds,
  objectInput: ImmutableNormalizedBounds,
): DeterminateSpatialRelationKind {
  const subject = validateNormalizedBox(subjectInput, "$subject");
  const object = validateNormalizedBox(objectInput, "$object");
  return classifyExactUnchecked(subject, object);
}

function* admissiblePerturbations(
  box: ImmutableNormalizedBounds,
  tolerance: number,
): Generator<S0NormalizedBounds> {
  for (
    let xMinimumDelta = -tolerance;
    xMinimumDelta <= tolerance;
    xMinimumDelta += 1
  ) {
    for (
      let xMaximumDelta = -tolerance;
      xMaximumDelta <= tolerance;
      xMaximumDelta += 1
    ) {
      for (
        let yMinimumDelta = -tolerance;
        yMinimumDelta <= tolerance;
        yMinimumDelta += 1
      ) {
        for (
          let yMaximumDelta = -tolerance;
          yMaximumDelta <= tolerance;
          yMaximumDelta += 1
        ) {
          const candidate: S0NormalizedBounds = {
            synthetic_x: {
              minimum: box.synthetic_x.minimum + xMinimumDelta,
              maximum: box.synthetic_x.maximum + xMaximumDelta,
            },
            synthetic_y: {
              minimum: box.synthetic_y.minimum + yMinimumDelta,
              maximum: box.synthetic_y.maximum + yMaximumDelta,
            },
          };
          if (
            candidate.synthetic_x.minimum < S0_MIN_COORDINATE ||
            candidate.synthetic_x.maximum > S0_MAX_COORDINATE ||
            candidate.synthetic_y.minimum < S0_MIN_COORDINATE ||
            candidate.synthetic_y.maximum > S0_MAX_COORDINATE ||
            candidate.synthetic_x.minimum >= candidate.synthetic_x.maximum ||
            candidate.synthetic_y.minimum >= candidate.synthetic_y.maximum
          ) {
            continue;
          }
          yield candidate;
        }
      }
    }
  }
}

export function classifyTopologyWithTolerance(
  subjectInput: ImmutableNormalizedBounds,
  objectInput: ImmutableNormalizedBounds,
  toleranceInput: number,
): ToleranceClassification {
  const subject = validateNormalizedBox(subjectInput, "$subject");
  const object = validateNormalizedBox(objectInput, "$object");
  const tolerance = validateTolerance(toleranceInput, "$tolerance");
  if (tolerance === 0) {
    return classifyExactUnchecked(subject, object);
  }

  let observed: DeterminateSpatialRelationKind | undefined;
  for (const subjectCandidate of admissiblePerturbations(subject, tolerance)) {
    for (const objectCandidate of admissiblePerturbations(object, tolerance)) {
      const classification = classifyExactUnchecked(
        subjectCandidate,
        objectCandidate,
      );
      if (observed === undefined) {
        observed = classification;
      } else if (classification !== observed) {
        return "tolerance_ambiguity";
      }
    }
  }
  if (observed === undefined) {
    fail("$tolerance", "zero perturbation was not included");
  }
  return observed;
}

export function cloneNormalizedBounds(
  value: ImmutableNormalizedBounds,
): ImmutableNormalizedBounds {
  return immutableClone(validateNormalizedBox(value, "$bounds"));
}
