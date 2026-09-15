import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import malformed from "../../fixtures/engine/land-boundary-malformed.invalid.json";
import fixture from "../../fixtures/engine/land-boundary.synthetic.valid.json";
import schema from "../../schemas/land-boundary.schema.v1.json";
import {
  LAND_BOUNDARY_SCHEMA_ID,
  LAND_BOUNDARY_SCHEMA_VERSION,
  LandBoundaryValidationError,
  parseLandBoundary,
  serializeLandBoundary,
} from "../../src/engine/land-boundary-contracts";
import type { LandBoundary } from "../../src/engine/land-boundary-contracts";

type Mutation = {
  operation: string;
  path: string;
  value?: unknown;
};

function mutate(base: unknown, mutations: readonly Mutation[]): unknown {
  const result = structuredClone(base);
  for (const mutation of mutations) {
    const parts = mutation.path
      .slice(1)
      .split("/")
      .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
    const last = parts.pop()!;
    let parent = result as Record<string, unknown>;
    for (const part of parts) parent = parent[part] as Record<string, unknown>;
    if (mutation.operation === "remove") {
      if (Array.isArray(parent)) parent.splice(Number(last), 1);
      else delete parent[last];
    } else if (Array.isArray(parent) && last === "-") {
      parent.push(structuredClone(mutation.value));
    } else {
      parent[last] = structuredClone(mutation.value);
    }
  }
  return result;
}

function failure(run: () => unknown): LandBoundaryValidationError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(LandBoundaryValidationError);
    return error as LandBoundaryValidationError;
  }
  throw new Error("Malformed synthetic land boundary was accepted");
}

const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

describe("land boundary schema and semantic closure", () => {
  it("compiles strictly and pins contract constants independently of runtime", () => {
    expect(ajv.validateSchema(schema)).toBe(true);
    expect(schema.$id).toBe(LAND_BOUNDARY_SCHEMA_ID);
    expect(schema.properties.schemaVersion.const).toBe(
      LAND_BOUNDARY_SCHEMA_VERSION,
    );
    expect(schema.additionalProperties).toBe(false);
    expect(validate(fixture), ajv.errorsText(validate.errors)).toBe(true);
    expect(() => parseLandBoundary(fixture)).not.toThrow();
  });

  it("pins a finite independently classified malformed inventory", () => {
    expect(malformed.fixtureFamilyVersion).toBe("1.0.0");
    expect(malformed.baseFixture).toBe("land-boundary.synthetic.valid.json");
    expect(malformed.cases).toHaveLength(17);
    expect(
      malformed.cases.filter((entry) => entry.expectedLayer === "schema"),
    ).toHaveLength(13);
    expect(
      malformed.cases.filter((entry) => entry.expectedLayer === "semantic"),
    ).toHaveLength(4);
    expect(new Set(malformed.cases.map((entry) => entry.id)).size).toBe(
      malformed.cases.length,
    );
    expect(
      malformed.cases.every(
        (entry) => entry.expectedPath.length > 0 && entry.mutations.length > 0,
      ),
    ).toBe(true);
  });

  it.each(malformed.cases)(
    "fails closed at the documented layer: $id",
    (entry) => {
      const candidate = mutate(fixture, entry.mutations);
      const before = JSON.stringify(candidate);
      const accepted = validate(candidate);
      expect(accepted, entry.id + ": " + ajv.errorsText(validate.errors)).toBe(
        entry.expectedLayer !== "schema",
      );
      const error = failure(() => parseLandBoundary(candidate));
      expect(error.code, entry.id).toBe(entry.expectedCode);
      expect(error.path, entry.id).toBe(entry.expectedPath);
      expect(JSON.stringify(candidate)).toBe(before);
    },
  );

  it("rejects non-JSON inputs before invoking getters or serializing caller code", () => {
    let calls = 0;
    const accessor = structuredClone(fixture);
    Object.defineProperty(accessor, "boundaryId", {
      enumerable: true,
      get() {
        calls++;
        return fixture.boundaryId;
      },
    });
    const withToJson = structuredClone(fixture) as Record<string, unknown>;
    withToJson.toJSON = () => {
      calls++;
      return fixture;
    };
    const symbol = structuredClone(fixture) as Record<PropertyKey, unknown>;
    symbol[Symbol("synthetic-hidden")] = "Synthetic hidden";
    const cyclic = structuredClone(fixture) as Record<string, unknown>;
    cyclic.cycle = cyclic;
    const sparse = structuredClone(fixture) as unknown as Record<
      string,
      unknown
    >;
    delete (sparse.sourceEvidence as unknown[])[0];
    const inherited = Object.assign(
      Object.create({ inherited: true }) as object,
      fixture,
    );
    const nonfinite = { ...fixture, extraCount: Number.POSITIVE_INFINITY };
    for (const candidate of [
      accessor,
      withToJson,
      symbol,
      cyclic,
      sparse,
      inherited,
      nonfinite,
    ]) {
      expect(failure(() => parseLandBoundary(candidate)).code).toBe(
        "INVALID_JSON",
      );
    }
    expect(calls).toBe(0);
  });

  it("bounds oversized strings and recursive JSON before schema validation", () => {
    expect(
      failure(() =>
        parseLandBoundary({
          ...fixture,
          boundaryId: "x".repeat(8193),
        }),
      ).code,
    ).toBe("INPUT_LIMIT");
    let deep: unknown = null;
    for (let index = 0; index < 40; index++) deep = { child: deep };
    expect(failure(() => parseLandBoundary(deep)).code).toBe("INPUT_LIMIT");
  });

  it("does not reflect an unvalidated private property name in diagnostics", () => {
    const marker = "synthetic-private-marker-that-must-not-be-logged";
    const candidate = { ...fixture, [marker]: () => null };
    const error = failure(() => parseLandBoundary(candidate));
    expect(error.message).not.toContain(marker);
    expect(error.path).not.toContain(marker);
  });

  it("returns a byte-stable, round-trippable, detached and frozen value", () => {
    const input = structuredClone(fixture);
    const before = JSON.stringify(input);
    const parsedOnce = parseLandBoundary(input as unknown as LandBoundary);
    const parsedTwice = parseLandBoundary(
      structuredClone(fixture) as unknown as LandBoundary,
    );

    expect(JSON.stringify(input)).toBe(before);

    const bytesOnce = serializeLandBoundary(parsedOnce);
    const bytesTwice = serializeLandBoundary(parsedTwice);
    expect(bytesOnce).toBe(bytesTwice);
    expect(JSON.parse(bytesOnce)).toEqual(
      JSON.parse(JSON.stringify(parsedOnce)),
    );

    expect(Object.isFrozen(parsedOnce)).toBe(true);
    expect(Object.isFrozen(parsedOnce.geometryRef)).toBe(true);
    expect(Object.isFrozen(parsedOnce.sourceEvidence)).toBe(true);
    expect(Object.isFrozen(parsedOnce.sourceEvidence[0])).toBe(true);
    expect(Object.isFrozen(parsedOnce.nonClaims)).toBe(true);

    (input as Record<string, unknown>).boundaryId = "synthetic-mutated-after";
    expect(parsedOnce.boundaryId).not.toBe("synthetic-mutated-after");
  });
});
