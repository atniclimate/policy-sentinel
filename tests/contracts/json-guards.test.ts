import { describe, expect, it } from "vitest";

import { createJsonGuards } from "../../src/contracts/json-guards";

class GuardError extends Error {
  constructor(
    readonly code: string,
    readonly path: string,
    message: string,
  ) {
    super(`${code} at ${path}: ${message}`);
  }
}

const guards = createJsonGuards((code, path, message) => {
  throw new GuardError(code, path, message);
});

function failure(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(GuardError);
    return (error as GuardError).message;
  }
  throw new Error("expected the guard to throw");
}

describe("shared JSON guards", () => {
  it("throws through the bound fail function with the contract wording", () => {
    expect(failure(() => guards.object([], "$"))).toBe(
      "invalid_type at $: expected a plain object",
    );
    expect(failure(() => guards.object(new Date(), "$"))).toBe(
      "invalid_type at $: expected a plain object",
    );
    expect(guards.object(Object.create(null), "$")).toEqual({});
    expect(failure(() => guards.exactKeys({ a: 1, b: 2 }, "$", ["a"]))).toBe(
      "unexpected_field at $.b: field is not retained",
    );
    expect(failure(() => guards.exactKeys({}, "$", ["a"], ["b"]))).toBe(
      "missing_field at $.a: required field is missing",
    );
    expect(failure(() => guards.boundedString(1, "$"))).toBe(
      "invalid_type at $: expected a string",
    );
    expect(failure(() => guards.boundedString("  ", "$"))).toBe(
      "invalid_value at $: expected a nonblank string",
    );
    expect(failure(() => guards.boundedString("abc", "$", 2))).toBe(
      "limit_exceeded at $: string exceeds the contract limit",
    );
    expect(failure(() => guards.exactString("b", "$", "a"))).toBe(
      'invalid_value at $: expected "a"',
    );
    expect(failure(() => guards.boundedInteger(1.5, "$", 0, 2))).toBe(
      "invalid_value at $: expected a bounded safe integer",
    );
    expect(failure(() => guards.boundedInteger(3, "$", 0, 2))).toBe(
      "invalid_value at $: expected a bounded safe integer",
    );
    expect(failure(() => guards.assertUnique(["a", "a"], "$"))).toBe(
      "duplicate_value at $: duplicate retained identity",
    );
  });

  it("checks real calendar dates, including years before 0100", () => {
    expect(guards.calendarDate("2024-02-29", "$")).toBe("2024-02-29");
    expect(failure(() => guards.calendarDate("2023-02-29", "$"))).toBe(
      "invalid_value at $: expected a real ISO calendar date",
    );
    expect(failure(() => guards.calendarDate("0050-01-01", "$"))).toBe(
      "invalid_value at $: expected a real ISO calendar date",
    );
    expect(failure(() => guards.calendarDate("2024-1-01", "$"))).toBe(
      "invalid_value at $: expected an ISO calendar date",
    );
  });

  it("parses bounded lists and optional fields with indexed paths", () => {
    const paths: string[] = [];
    expect(
      guards.list([1, 2], "$.x", 2, (value, path) => {
        paths.push(path);
        return value;
      }),
    ).toEqual([1, 2]);
    expect(paths).toEqual(["$.x[0]", "$.x[1]"]);
    expect(failure(() => guards.list({}, "$", 2, (value) => value))).toBe(
      "invalid_type at $: expected an array",
    );
    expect(
      failure(() => guards.list([1, 2, 3], "$", 2, (value) => value)),
    ).toBe("limit_exceeded at $: array exceeds the contract limit");
    expect(guards.optional({}, "a", "$", (value) => value)).toBeUndefined();
    expect(guards.optional({ a: 1 }, "a", "$", (_value, path) => path)).toBe(
      "$.a",
    );
  });
});
