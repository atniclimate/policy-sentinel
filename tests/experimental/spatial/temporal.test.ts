import { describe, expect, it } from "vitest";

import type { TemporalValue } from "../../../src/kernel/assertions";
import { createSpatialObservation } from "../../../src/experimental/spatial/observation";
import {
  deriveSharedValidTime,
  validateSharedValidTime,
} from "../../../src/experimental/spatial/temporal";
import type {
  ImmutableSpatialObservation,
  SharedValidTime,
} from "../../../src/experimental/spatial/types";

function observation(
  fixtureSlug: string,
  validTimeValue: TemporalValue,
): ImmutableSpatialObservation {
  return createSpatialObservation({
    fixtureSlug,
    layerVersion: "1.0.0",
    axisOrder: ["synthetic_x", "synthetic_y"],
    geometry: { minimum: [-4, -2], maximum: [6, 8] },
    resolution: 2,
    observedTimeValue: {
      kind: "date_time",
      value: "3785-01-02T03:04:05-07:00",
    },
    validTimeValue,
    coverage: "complete_fixture_extent",
    uncertainty: { state: "certain" },
    retrievedAt: "3785-01-04T05:06:07Z",
  });
}

function expectedFactReferences(
  subject: ImmutableSpatialObservation,
  object: ImmutableSpatialObservation,
) {
  return [subject, object]
    .map((entry) => ({
      factId: entry.factManifest.validTimeFact.factId,
      factDigest: entry.factManifest.validTimeFact.factDigest,
    }))
    .sort((left, right) =>
      left.factId === right.factId ? 0 : left.factId < right.factId ? -1 : 1,
    );
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

describe("S0 shared valid time", () => {
  it("intersects date points and intervals without changing precision", () => {
    const point = observation("fixture-0101", {
      kind: "date",
      value: "3785-05-10",
    });
    const enclosingInterval = observation("fixture-0102", {
      kind: "interval",
      start: {
        kind: "date",
        value: "3785-05-01",
        inclusive: true,
      },
      end: {
        kind: "date",
        value: "3785-05-20",
        inclusive: false,
      },
    });
    const overlap = deriveSharedValidTime(point, enclosingInterval);

    expect(overlap).toEqual({
      state: "overlap",
      value: { kind: "date", value: "3785-05-10" },
      factReferences: expectedFactReferences(point, enclosingInterval),
    });

    const left = observation("fixture-0103", {
      kind: "interval",
      start: {
        kind: "date",
        value: "3785-05-01",
        inclusive: true,
      },
      end: {
        kind: "date",
        value: "3785-05-10",
        inclusive: true,
      },
    });
    const right = observation("fixture-0104", {
      kind: "interval",
      start: {
        kind: "date",
        value: "3785-05-05",
        inclusive: false,
      },
      end: {
        kind: "date",
        value: "3785-05-15",
        inclusive: true,
      },
    });

    expect(deriveSharedValidTime(left, right)).toEqual({
      state: "overlap",
      value: {
        kind: "interval",
        start: {
          kind: "date",
          value: "3785-05-05",
          inclusive: false,
        },
        end: {
          kind: "date",
          value: "3785-05-10",
          inclusive: true,
        },
      },
      factReferences: expectedFactReferences(left, right),
    });

    const laterPoint = observation("fixture-0105", {
      kind: "date",
      value: "3785-05-11",
    });
    expect(deriveSharedValidTime(point, laterPoint)).toEqual({
      state: "disjoint",
      factReferences: expectedFactReferences(point, laterPoint),
    });
  });

  it("applies inclusive equality and keeps open output bounds open", () => {
    const exclusiveLeft = observation("fixture-0111", {
      kind: "interval",
      start: {
        kind: "date",
        value: "3785-06-01",
        inclusive: true,
      },
      end: {
        kind: "date",
        value: "3785-06-05",
        inclusive: false,
      },
    });
    const inclusiveRight = observation("fixture-0112", {
      kind: "interval",
      start: {
        kind: "date",
        value: "3785-06-05",
        inclusive: true,
      },
      end: {
        kind: "date",
        value: "3785-06-10",
        inclusive: true,
      },
    });

    expect(deriveSharedValidTime(exclusiveLeft, inclusiveRight)).toEqual({
      state: "disjoint",
      factReferences: expectedFactReferences(exclusiveLeft, inclusiveRight),
    });

    const inclusiveLeft = observation("fixture-0113", {
      kind: "interval",
      start: {
        kind: "date",
        value: "3785-06-01",
        inclusive: true,
      },
      end: {
        kind: "date",
        value: "3785-06-05",
        inclusive: true,
      },
    });
    expect(deriveSharedValidTime(inclusiveLeft, inclusiveRight)).toEqual({
      state: "overlap",
      value: { kind: "date", value: "3785-06-05" },
      factReferences: expectedFactReferences(inclusiveLeft, inclusiveRight),
    });

    const openStart = observation("fixture-0114", {
      kind: "interval",
      start: null,
      end: {
        kind: "date",
        value: "3785-06-10",
        inclusive: true,
      },
    });
    const openEnd = observation("fixture-0115", {
      kind: "interval",
      start: {
        kind: "date",
        value: "3785-06-05",
        inclusive: false,
      },
      end: null,
    });
    expect(deriveSharedValidTime(openStart, openEnd)).toEqual({
      state: "overlap",
      value: {
        kind: "interval",
        start: {
          kind: "date",
          value: "3785-06-05",
          inclusive: false,
        },
        end: {
          kind: "date",
          value: "3785-06-10",
          inclusive: true,
        },
      },
      factReferences: expectedFactReferences(openStart, openEnd),
    });

    const earlierOpenStart = observation("fixture-0116", {
      kind: "interval",
      start: null,
      end: {
        kind: "date",
        value: "3785-06-08",
        inclusive: false,
      },
    });
    expect(deriveSharedValidTime(openStart, earlierOpenStart)).toEqual({
      state: "overlap",
      value: {
        kind: "interval",
        start: null,
        end: {
          kind: "date",
          value: "3785-06-08",
          inclusive: false,
        },
      },
      factReferences: expectedFactReferences(openStart, earlierOpenStart),
    });
  });

  it("preserves a later-start open-end overlap in both subject/object orders", () => {
    const earlierStart = observation("fixture-0117", {
      kind: "interval",
      start: {
        kind: "date",
        value: "3785-06-01",
        inclusive: true,
      },
      end: null,
    });
    const laterStart = observation("fixture-0118", {
      kind: "interval",
      start: {
        kind: "date",
        value: "3785-06-05",
        inclusive: false,
      },
      end: null,
    });
    const expected = {
      state: "overlap",
      value: {
        kind: "interval",
        start: {
          kind: "date",
          value: "3785-06-05",
          inclusive: false,
        },
        end: null,
      },
      factReferences: expectedFactReferences(earlierStart, laterStart),
    } as const;

    expect(deriveSharedValidTime(earlierStart, laterStart)).toEqual(expected);
    expect(deriveSharedValidTime(laterStart, earlierStart)).toEqual(expected);
  });

  it("reports mixed date and date-time precision without a fallback", () => {
    const date = observation("fixture-0121", {
      kind: "date",
      value: "3785-07-01",
    });
    const dateTime = observation("fixture-0122", {
      kind: "date_time",
      value: "3785-07-01T00:00:00Z",
    });

    expect(deriveSharedValidTime(date, dateTime)).toEqual({
      state: "indeterminate",
      reason: "mixed_precision",
      factReferences: expectedFactReferences(date, dateTime),
    });
  });

  it("keeps the lexical minimum for equal date-time instants in either order", () => {
    const utc = observation("fixture-0131", {
      kind: "date_time",
      value: "3785-08-10T00:00:00Z",
    });
    const offset = observation("fixture-0132", {
      kind: "date_time",
      value: "3785-08-09T16:00:00-08:00",
    });
    const expected = {
      state: "overlap",
      value: {
        kind: "date_time",
        value: "3785-08-09T16:00:00-08:00",
      },
      factReferences: expectedFactReferences(utc, offset),
    } as const;

    expect(deriveSharedValidTime(utc, offset)).toEqual(expected);
    expect(deriveSharedValidTime(offset, utc)).toEqual(expected);
  });

  it("replays exact sorted fact references and rejects validly shaped tampering", () => {
    const subject = observation("fixture-0141", {
      kind: "date",
      value: "3785-09-10",
    });
    const object = observation("fixture-0142", {
      kind: "interval",
      start: {
        kind: "date",
        value: "3785-09-01",
        inclusive: true,
      },
      end: {
        kind: "date",
        value: "3785-09-20",
        inclusive: true,
      },
    });
    const shared = deriveSharedValidTime(subject, object);

    expect(shared.factReferences).toEqual(
      expectedFactReferences(subject, object),
    );
    expect(
      shared.factReferences[0]?.factId < shared.factReferences[1]?.factId,
    ).toBe(true);
    expect(validateSharedValidTime(shared, subject, object)).toEqual(shared);

    if (shared.state !== "overlap") {
      throw new Error("expected overlap fixture");
    }
    const tamperedValue: SharedValidTime = {
      ...shared,
      value: { kind: "date", value: "3785-09-11" },
    };
    expect(() =>
      validateSharedValidTime(tamperedValue, subject, object),
    ).toThrow(/exact shared valid-time derivation/);

    const tamperedReferences = {
      ...shared,
      factReferences: shared.factReferences.map((reference, index) => ({
        ...reference,
        factDigest: index === 0 ? "0".repeat(64) : reference.factDigest,
      })),
    };
    expect(() =>
      validateSharedValidTime(tamperedReferences, subject, object),
    ).toThrow(/exact shared valid-time derivation/);

    const reversedReferences = {
      ...shared,
      factReferences: [...shared.factReferences].reverse(),
    };
    expect(() =>
      validateSharedValidTime(reversedReferences, subject, object),
    ).toThrow(/sorted|fact references/i);
  });

  it("returns deterministic recursively frozen values detached from caller data", () => {
    const mutableValue: TemporalValue = {
      kind: "interval",
      start: {
        kind: "date",
        value: "3785-10-01",
        inclusive: true,
      },
      end: {
        kind: "date",
        value: "3785-10-31",
        inclusive: true,
      },
    };
    const subject = observation("fixture-0151", mutableValue);
    const object = observation("fixture-0152", {
      kind: "date",
      value: "3785-10-15",
    });
    const first = deriveSharedValidTime(subject, object);

    if (mutableValue.kind !== "interval" || mutableValue.start === null) {
      throw new Error("expected mutable interval fixture");
    }
    mutableValue.start.value = "3785-10-14";

    const second = deriveSharedValidTime(subject, object);
    expect(second).toEqual(first);
    expect(deriveSharedValidTime(object, subject)).toEqual(first);
    expectRecursivelyFrozen(first);

    const writableView = first as unknown as { state: string };
    expect(() => {
      writableView.state = "disjoint";
    }).toThrow(TypeError);
    expect(first.state).toBe("overlap");
  });
});
