import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  compareCodeUnits,
  deepFreeze,
} from "../../src/core/canonical-json.mjs";

describe("canonical JSON helpers", () => {
  it("writes nested object keys in code-unit order and keeps array order", () => {
    expect(
      canonicalJson({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: null }, B: true }),
    ).toBe('{"B":true,"a":{"c":null,"d":[3,{"y":2,"z":1}]},"b":1}');
  });

  it("sorts integer-like keys by code unit too", () => {
    expect(canonicalJson({ "10": 1, "9": 2, a: 3 })).toBe(
      '{"10":1,"9":2,"a":3}',
    );
  });

  it("matches JSON.stringify on key-sorted plain JSON", () => {
    const value = { a: [1, "x", { b: false }], c: { d: null }, e: -0.5 };
    expect(canonicalJson(value)).toBe(JSON.stringify(value));
    expect(canonicalJson(new Date(0))).toBe(JSON.stringify(new Date(0)));
    expect(canonicalJson(undefined)).toBe(JSON.stringify(undefined));
  });

  it("follows JSON.stringify for values JSON cannot hold", () => {
    expect(canonicalJson({ a: undefined, b: [undefined], c: Number.NaN })).toBe(
      '{"b":[null],"c":null}',
    );
  });

  it("orders by UTF-16 code unit, not by locale", () => {
    const keys = ["é", "z", "Z", "a", "\u{1F600}", "￿"];
    expect([...keys].sort(compareCodeUnits)).toEqual([...keys].sort());
  });

  it("freezes every nested object and array and returns the same value", () => {
    const value = { a: { b: [1, { c: 2 }] } };
    expect(deepFreeze(value)).toBe(value);
    expect(Object.isFrozen(value.a.b[1])).toBe(true);
    expect(Object.isFrozen(value.a.b)).toBe(true);
  });
});
