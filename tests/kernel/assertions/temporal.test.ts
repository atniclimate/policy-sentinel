import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import assertionSchema from "../../../schemas/assertion.schema.v1.json";
import {
  compareTemporalOrder,
  compareTemporalPoints,
  validateTemporalAssertion,
  validateTemporalValue,
} from "../../../src/kernel/assertions";

const reference = {
  factId: `k0:fact:synthetic-register:cmVjb3Jk:cGF0aA:observed_time:${"a".repeat(64)}`,
  factDigest: "b".repeat(64),
};
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(assertionSchema);
const validateDateTime = ajv.compile({
  $ref: `${assertionSchema.$id}#/$defs/dateTime`,
});

describe("temporal primitives", () => {
  it("keeps date precision distinct from date-time and compares only like precision", () => {
    const date = validateTemporalValue({ kind: "date", value: "2026-09-01" });
    const dateTime = validateTemporalValue({
      kind: "date_time",
      value: "2026-09-01T00:00:00-07:00",
    });

    if (date.kind !== "date" || dateTime.kind !== "date_time") {
      throw new Error("validated point changed kind");
    }
    expect(compareTemporalPoints(date, dateTime)).toBeNull();
    expect(date.value).toBe("2026-09-01");
    expect(dateTime.value).toBe("2026-09-01T00:00:00-07:00");
  });

  it("compares RFC 3339 date-times by exact represented instant", () => {
    expect(
      compareTemporalPoints(
        { kind: "date_time", value: "2026-09-01T10:00:00.0001Z" },
        { kind: "date_time", value: "2026-09-01T03:00:00.0002-07:00" },
      ),
    ).toBe(-1);
    expect(
      compareTemporalPoints(
        { kind: "date_time", value: "2026-09-01T10:00:00Z" },
        { kind: "date_time", value: "2026-09-01T03:00:00-07:00" },
      ),
    ).toBe(0);
  });

  it("keeps the canonical RFC 3339 schema and runtime profiles in parity", () => {
    const cases = [
      ["2026-09-01T10:20:30Z", true],
      ["2026-09-01T10:20:30.000000001-07:00", true],
      ["0000-12-31T23:59:59Z", true],
      ["2026-09-01 10:20:30Z", false],
      ["2026-09-01t10:20:30Z", false],
      ["2026-09-01T10:20:30z", false],
      ["2026-12-31T23:59:60Z", false],
      ["2026-09-01T10:20:30", false],
      ["2026-09-01T24:00:00Z", false],
      ["2026-09-01T10:00:00+24:00", false],
      ["2026-09-01T10:20:30-00:00", false],
    ] as const;

    for (const [value, expected] of cases) {
      const runtimeAccepted = (() => {
        try {
          validateTemporalValue({ kind: "date_time", value });
          return true;
        } catch {
          return false;
        }
      })();
      expect(Boolean(validateDateTime(value)), value).toBe(expected);
      expect(runtimeAccepted, value).toBe(expected);
    }
  });

  it("orders the proleptic-Gregorian year-zero boundary exactly", () => {
    expect(
      compareTemporalPoints(
        { kind: "date_time", value: "0000-12-31T23:59:59Z" },
        { kind: "date_time", value: "0001-01-01T00:00:00Z" },
      ),
    ).toBe(-1);
    expect(
      compareTemporalPoints(
        { kind: "date_time", value: "0000-12-31T23:00:00-01:00" },
        { kind: "date_time", value: "0001-01-01T00:00:00Z" },
      ),
    ).toBe(0);
  });

  it("validates flat interval endpoints without converting dates to midnight", () => {
    const interval = validateTemporalValue({
      kind: "interval",
      start: { kind: "date", value: "2026-09-01", inclusive: true },
      end: { kind: "date", value: "2026-09-03", inclusive: false },
    });

    expect(interval).toEqual({
      kind: "interval",
      start: { kind: "date", value: "2026-09-01", inclusive: true },
      end: { kind: "date", value: "2026-09-03", inclusive: false },
    });
    expect(JSON.stringify(interval)).not.toContain("T00:00");
  });

  it("treats exclusive touching endpoints as ordered and inclusive touching as indeterminate", () => {
    expect(
      compareTemporalOrder(
        {
          kind: "interval",
          start: { kind: "date", value: "2026-09-01", inclusive: true },
          end: { kind: "date", value: "2026-09-02", inclusive: false },
        },
        { kind: "date", value: "2026-09-02" },
      ),
    ).toBe("before");
    expect(
      compareTemporalOrder(
        {
          kind: "interval",
          start: { kind: "date", value: "2026-09-01", inclusive: true },
          end: { kind: "date", value: "2026-09-02", inclusive: true },
        },
        { kind: "date", value: "2026-09-02" },
      ),
    ).toBe("indeterminate");
  });

  it("keeps open, overlapping, and mixed-precision order indeterminate", () => {
    expect(
      compareTemporalOrder(
        {
          kind: "interval",
          start: { kind: "date", value: "2026-09-01", inclusive: true },
          end: null,
        },
        { kind: "date", value: "2026-09-03" },
      ),
    ).toBe("indeterminate");
    expect(
      compareTemporalOrder(
        { kind: "date", value: "2026-09-01" },
        { kind: "date_time", value: "2026-09-02T00:00:00Z" },
      ),
    ).toBe("indeterminate");
  });

  it.each([
    {
      kind: "date",
      value: "2026-02-29",
    },
    {
      kind: "date_time",
      value: "2026-09-01T10:00:00",
    },
    {
      kind: "interval",
      start: null,
      end: null,
    },
    {
      kind: "interval",
      start: { kind: "date", value: "2026-09-02", inclusive: true },
      end: { kind: "date", value: "2026-09-01", inclusive: true },
    },
    {
      kind: "interval",
      start: { kind: "date", value: "2026-09-01", inclusive: false },
      end: { kind: "date", value: "2026-09-01", inclusive: true },
    },
    {
      kind: "interval",
      start: { kind: "date", value: "2026-09-01", inclusive: true },
      end: {
        kind: "date_time",
        value: "2026-09-02T00:00:00Z",
        inclusive: true,
      },
    },
  ])("rejects invalid or incomparable temporal value %#", (value) => {
    expect(() => validateTemporalValue(value)).toThrow(TypeError);
  });

  it("permits a value only for supported temporal evidence", () => {
    expect(
      validateTemporalAssertion({
        evidence: { state: "supported", factReferences: [reference] },
        value: { kind: "date", value: "2026-09-01" },
      }),
    ).toEqual({
      evidence: { state: "supported", factReferences: [reference] },
      value: { kind: "date", value: "2026-09-01" },
    });
    expect(
      validateTemporalAssertion({
        evidence: {
          state: "unknown",
          reason: "not_observed",
          factReferences: [],
        },
      }),
    ).toEqual({
      evidence: {
        state: "unknown",
        reason: "not_observed",
        factReferences: [],
      },
    });
    expect(() =>
      validateTemporalAssertion({
        evidence: {
          state: "unknown",
          reason: "not_observed",
          factReferences: [],
        },
        value: null,
      }),
    ).toThrow(/unexpected field/);
  });
});
