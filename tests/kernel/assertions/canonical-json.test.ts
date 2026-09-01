import { describe, expect, it } from "vitest";

import {
  CANONICALIZATION_VERSION,
  assertSortedUniqueStrings,
  canonicalJsonDigest,
  canonicalizeJson,
  immutableCanonicalClone,
  sha256Hex,
} from "../../../src/kernel/assertions";

describe("ps-c14n-json-1", () => {
  it("sorts object keys by Unicode code point and preserves array order", () => {
    expect(CANONICALIZATION_VERSION).toBe("ps-c14n-json-1");
    expect(
      canonicalizeJson({
        "😀": 3,
        z: [{ b: 2, a: 1 }, 0],
        "\uE000": 2,
        a: 1,
      }),
    ).toBe('{"a":1,"z":[{"a":1,"b":2},0],"":2,"😀":3}');
  });

  it("emits stable lowercase SHA-256 digests", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(canonicalJsonDigest({ b: 2, a: 1 })).toBe(
      canonicalJsonDigest({ a: 1, b: 2 }),
    );
  });

  it("returns a detached recursively frozen canonical clone", () => {
    const input = { z: [{ mutable: "before" }], a: true };
    const clone = immutableCanonicalClone(input);

    input.z[0]!.mutable = "after";
    expect(clone).toEqual({ a: true, z: [{ mutable: "before" }] });
    expect(Object.isFrozen(clone)).toBe(true);
    expect(Object.isFrozen(clone.z)).toBe(true);
    expect(Object.isFrozen(clone.z[0])).toBe(true);
    expect(() => {
      (clone.z[0] as { mutable: string }).mutable = "changed";
    }).toThrow(TypeError);
  });

  it.each([
    ["undefined", { value: undefined }],
    ["non-finite", { value: Number.POSITIVE_INFINITY }],
    ["unsafe integer", { value: Number.MAX_SAFE_INTEGER + 1 }],
    ["negative zero", { value: -0 }],
    ["non-plain prototype", { value: new Date("2026-09-01T00:00:00Z") }],
  ])("rejects %s", (_label, value) => {
    expect(() => canonicalizeJson(value)).toThrow(TypeError);
  });

  it("rejects sparse arrays, extra array properties, accessors, symbols, and cycles", () => {
    const sparse = Array.from({ length: 2 }) as unknown[];
    delete sparse[0];

    const extended = [1] as number[] & { extra?: number };
    extended.extra = 2;

    const accessor: Record<string, unknown> = {};
    Object.defineProperty(accessor, "value", {
      enumerable: true,
      get: () => 1,
    });

    const symbol = { value: 1 } as Record<PropertyKey, unknown>;
    symbol[Symbol("hidden")] = 2;

    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;

    for (const value of [sparse, extended, accessor, symbol, cyclic]) {
      expect(() => canonicalizeJson(value)).toThrow(TypeError);
    }
  });

  it("requires evidence and stable-ID lists to be sorted and unique", () => {
    expect(() => assertSortedUniqueStrings(["a", "b"], "$ids")).not.toThrow();
    expect(() => assertSortedUniqueStrings(["b", "a"], "$ids")).toThrow(
      /sorted unique/,
    );
    expect(() => assertSortedUniqueStrings(["a", "a"], "$ids")).toThrow(
      /sorted unique/,
    );
  });

  it("rejects duplicate stable IDs inside a collection", () => {
    expect(() =>
      canonicalizeJson([
        { factId: "k0:fact:one", value: 1 },
        { factId: "k0:fact:one", value: 2 },
      ]),
    ).toThrow(/duplicate factId/);
  });
});
