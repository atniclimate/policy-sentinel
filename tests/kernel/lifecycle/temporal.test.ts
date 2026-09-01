import {
  compareTemporalAssertions,
  compareTemporalValues,
  findProvablyLatestTemporalAssertion,
  orderTemporalAssertions,
  type TemporalAssertion,
  type TemporalValue,
} from "../../../src/kernel/lifecycle";
import { describe, expect, it } from "vitest";
import { createFact, referenceEvidence } from "./fixtures";

const identity = { sourceId: "synthetic-k0", sourceRecordId: "temporal" };

function supported(value: TemporalValue, suffix: string): TemporalAssertion {
  const predicate = value.kind === "date_time" ? "observed_time" : "valid_time";
  const fact = createFact(identity, predicate, value, suffix);
  return { evidence: referenceEvidence(fact), value };
}

describe("K0 temporal comparison", () => {
  it("keeps date and date-time precision incomparable", () => {
    expect(
      compareTemporalValues(
        { kind: "date", value: "2026-08-31" },
        { kind: "date_time", value: "2026-08-31T00:00:00Z" },
      ),
    ).toBe("indeterminate");
  });

  it("compares date-times by exact represented instant without Date.parse truncation", () => {
    expect(
      compareTemporalValues(
        { kind: "date_time", value: "2026-09-01T00:00:00.000000001Z" },
        { kind: "date_time", value: "2026-09-01T00:00:00.000000002Z" },
      ),
    ).toBe("before");
    expect(
      compareTemporalValues(
        { kind: "date_time", value: "2026-09-01T01:00:00+01:00" },
        { kind: "date_time", value: "2026-09-01T00:00:00Z" },
      ),
    ).toBe("indeterminate");
  });

  it("treats inclusive touching bounds as overlap and an exclusive touch as ordered", () => {
    const first = {
      kind: "interval",
      start: { kind: "date", value: "2026-01-01", inclusive: true },
      end: { kind: "date", value: "2026-02-01", inclusive: true },
    } as const;
    const inclusive = {
      kind: "interval",
      start: { kind: "date", value: "2026-02-01", inclusive: true },
      end: { kind: "date", value: "2026-03-01", inclusive: true },
    } as const;
    const exclusive = {
      ...inclusive,
      start: { ...inclusive.start, inclusive: false },
    } as const;

    expect(compareTemporalValues(first, inclusive)).toBe("indeterminate");
    expect(compareTemporalValues(first, exclusive)).toBe("before");
  });

  it("does not invent chronology for open, overlapping, equal, or unsupported times", () => {
    const open = {
      kind: "interval",
      start: null,
      end: { kind: "date", value: "2026-01-01", inclusive: true },
    } as const;
    expect(
      compareTemporalValues(open, { kind: "date", value: "2026-02-01" }),
    ).toBe("indeterminate");

    const items = [
      { id: "a", time: supported({ kind: "date", value: "2026-01-01" }, "a") },
      { id: "b", time: supported({ kind: "date", value: "2026-01-01" }, "b") },
    ];
    expect(
      orderTemporalAssertions(
        items,
        (item) => item.time,
        (item) => item.id,
      ),
    ).toEqual({
      state: "indeterminate",
      assertionIds: ["a", "b"],
    });
    expect(
      findProvablyLatestTemporalAssertion(
        items,
        (item) => item.time,
        (item) => item.id,
      ),
    ).toEqual({ state: "indeterminate", assertionIds: ["a", "b"] });

    const unknown: TemporalAssertion = {
      evidence: {
        state: "unknown",
        reason: "not_observed",
        factReferences: [],
      },
    };
    expect(compareTemporalAssertions(items[0]!.time, unknown)).toBe(
      "indeterminate",
    );
  });

  it("selects a latest candidate only when it is provably after every other candidate", () => {
    const items = [
      {
        id: "early",
        time: supported({ kind: "date", value: "2026-01-01" }, "early"),
      },
      {
        id: "late",
        time: supported({ kind: "date", value: "2026-02-01" }, "late"),
      },
    ];
    expect(
      findProvablyLatestTemporalAssertion(
        items,
        (item) => item.time,
        (item) => item.id,
      ),
    ).toEqual({ state: "latest", item: items[1] });
  });
});
