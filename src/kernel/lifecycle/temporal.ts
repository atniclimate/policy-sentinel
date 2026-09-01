import type {
  TemporalAssertion,
  TemporalEndpoint,
  TemporalPoint,
  TemporalValue,
} from "../assertions";
import { compareTemporalPoints } from "../assertions";

export type TemporalComparison = "before" | "after" | "indeterminate";

interface ClosedBounds {
  start: TemporalEndpoint | null;
  end: TemporalEndpoint | null;
}

function pointOrder(
  left: TemporalPoint,
  right: TemporalPoint,
): -1 | 0 | 1 | null {
  return compareTemporalPoints(left, right);
}

function bounds(value: TemporalValue): ClosedBounds {
  if (value.kind !== "interval") {
    const endpoint = { ...value, inclusive: true } as const;
    return { start: endpoint, end: endpoint };
  }
  return { start: value.start, end: value.end };
}

function isStrictlySeparated(
  leftEnd: TemporalEndpoint,
  rightStart: TemporalEndpoint,
): boolean | null {
  const order = pointOrder(leftEnd, rightStart);
  if (order === null) {
    return null;
  }
  if (order < 0) {
    return true;
  }
  if (order > 0) {
    return false;
  }
  return !(leftEnd.inclusive && rightStart.inclusive);
}

export function compareTemporalValues(
  left: TemporalValue,
  right: TemporalValue,
): TemporalComparison {
  const leftBounds = bounds(left);
  const rightBounds = bounds(right);

  if (
    leftBounds.start === null ||
    leftBounds.end === null ||
    rightBounds.start === null ||
    rightBounds.end === null
  ) {
    return "indeterminate";
  }

  const leftBefore = isStrictlySeparated(leftBounds.end, rightBounds.start);
  if (leftBefore === null) {
    return "indeterminate";
  }
  if (leftBefore) {
    return "before";
  }

  const leftAfter = isStrictlySeparated(rightBounds.end, leftBounds.start);
  if (leftAfter === null) {
    return "indeterminate";
  }
  if (leftAfter) {
    return "after";
  }

  return "indeterminate";
}

export function compareTemporalAssertions(
  left: TemporalAssertion,
  right: TemporalAssertion,
): TemporalComparison {
  if (
    left.evidence.state !== "supported" ||
    right.evidence.state !== "supported" ||
    !("value" in left) ||
    !("value" in right)
  ) {
    return "indeterminate";
  }
  return compareTemporalValues(left.value, right.value);
}

export type TemporalOrderResult<T> =
  | { state: "ordered"; items: readonly T[] }
  | { state: "indeterminate"; assertionIds: readonly string[] };

export function orderTemporalAssertions<T>(
  items: readonly T[],
  temporalAssertion: (item: T) => TemporalAssertion,
  assertionId: (item: T) => string,
): TemporalOrderResult<T> {
  const unresolved = new Set<string>();
  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < items.length;
      rightIndex += 1
    ) {
      const comparison = compareTemporalAssertions(
        temporalAssertion(items[leftIndex]!),
        temporalAssertion(items[rightIndex]!),
      );
      if (comparison !== "before" && comparison !== "after") {
        unresolved.add(assertionId(items[leftIndex]!));
        unresolved.add(assertionId(items[rightIndex]!));
      }
    }
  }

  if (unresolved.size > 0) {
    return {
      state: "indeterminate",
      assertionIds: [...unresolved].sort(),
    };
  }

  return {
    state: "ordered",
    items: [...items].sort((left, right) =>
      compareTemporalAssertions(
        temporalAssertion(left),
        temporalAssertion(right),
      ) === "before"
        ? -1
        : 1,
    ),
  };
}

export type LatestTemporalResult<T> =
  | { state: "latest"; item: T }
  | { state: "indeterminate"; assertionIds: readonly string[] };

export function findProvablyLatestTemporalAssertion<T>(
  items: readonly T[],
  temporalAssertion: (item: T) => TemporalAssertion,
  assertionId: (item: T) => string,
): LatestTemporalResult<T> {
  const latest = items.filter((candidate, candidateIndex) =>
    items.every(
      (other, otherIndex) =>
        candidateIndex === otherIndex ||
        compareTemporalAssertions(
          temporalAssertion(candidate),
          temporalAssertion(other),
        ) === "after",
    ),
  );

  if (latest.length === 1) {
    return { state: "latest", item: latest[0]! };
  }
  return {
    state: "indeterminate",
    assertionIds: items.map(assertionId).sort(),
  };
}
