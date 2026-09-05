import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import malformed from "../../fixtures/engine/identity-authority-scenarios-malformed.invalid.json";
import fixture from "../../fixtures/engine/identity-authority-scenarios.synthetic.valid.json";
import schema from "../../schemas/identity-authority-scenarios.schema.v1.json";
import {
  IDENTITY_AUTHORITY_SCENARIOS_SCHEMA_ID,
  IDENTITY_AUTHORITY_SCENARIOS_SCHEMA_VERSION,
} from "../../src/engine/identity-authority-scenarios-contracts";
import {
  IdentityAuthorityScenariosValidationError,
  parseIdentityAuthorityScenariosBundle,
} from "../../src/engine/identity-authority-scenarios";

type Mutation = { operation: string; path: string; value?: unknown };
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
    } else parent[last] = structuredClone(mutation.value);
  }
  return result;
}
function failure(run: () => unknown) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(IdentityAuthorityScenariosValidationError);
    return error as IdentityAuthorityScenariosValidationError;
  }
  throw new Error("Malformed synthetic identity graph was accepted");
}
const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

describe("identity authority scenario schema and semantic closure", () => {
  it("compiles strictly and pins contract constants independently of runtime", () => {
    expect(ajv.validateSchema(schema)).toBe(true);
    expect(schema.$id).toBe(IDENTITY_AUTHORITY_SCENARIOS_SCHEMA_ID);
    expect(schema.properties.schemaVersion.const).toBe(
      IDENTITY_AUTHORITY_SCENARIOS_SCHEMA_VERSION,
    );
    expect(schema.additionalProperties).toBe(false);
    expect(validate(fixture), ajv.errorsText(validate.errors)).toBe(true);
    expect(() => parseIdentityAuthorityScenariosBundle(fixture)).not.toThrow();
  });

  it("pins a finite independently classified malformed inventory", () => {
    expect(malformed.fixtureFamilyVersion).toBe("1.0.0");
    expect(malformed.baseFixture).toBe(
      "identity-authority-scenarios.synthetic.valid.json",
    );
    expect(malformed.cases).toHaveLength(67);
    expect(
      malformed.cases.filter((entry) => entry.expectedLayer === "schema"),
    ).toHaveLength(17);
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
      const error = failure(() =>
        parseIdentityAuthorityScenariosBundle(candidate),
      );
      expect(error.code, entry.id).toBe(entry.expectedCode);
      expect(error.path, entry.id).toBe(entry.expectedPath);
      expect(JSON.stringify(candidate)).toBe(before);
    },
  );

  it("rejects non-JSON inputs before invoking getters or serializing caller code", () => {
    let calls = 0;
    const accessor = structuredClone(fixture);
    Object.defineProperty(accessor, "id", {
      enumerable: true,
      get() {
        calls++;
        return fixture.id;
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
    const sparse = structuredClone(fixture);
    delete sparse.entities[0];
    const inherited = Object.assign(
      Object.create({ inherited: true }) as object,
      fixture,
    );
    const nonfinite = { ...fixture, count: Number.POSITIVE_INFINITY };
    for (const candidate of [
      accessor,
      withToJson,
      symbol,
      cyclic,
      sparse,
      inherited,
      nonfinite,
    ]) {
      expect(
        failure(() => parseIdentityAuthorityScenariosBundle(candidate)).code,
      ).toBe("INVALID_JSON");
    }
    expect(calls).toBe(0);
  });

  it("bounds oversized strings and recursive JSON before schema validation", () => {
    expect(
      failure(() =>
        parseIdentityAuthorityScenariosBundle({
          ...fixture,
          id: "x".repeat(8193),
        }),
      ).code,
    ).toBe("INPUT_LIMIT");
    let deep: unknown = null;
    for (let index = 0; index < 40; index++) deep = { child: deep };
    expect(
      failure(() => parseIdentityAuthorityScenariosBundle(deep)).code,
    ).toBe("INPUT_LIMIT");
  });

  it("does not reflect an unvalidated private property name in diagnostics", () => {
    const marker = "synthetic-private-marker-that-must-not-be-logged";
    const candidate = { ...fixture, [marker]: () => null };
    const error = failure(() =>
      parseIdentityAuthorityScenariosBundle(candidate),
    );
    expect(error.code).toBe("INVALID_JSON");
    expect(error.message).not.toContain(marker);
    expect(error.path).not.toContain(marker);
  });
});
