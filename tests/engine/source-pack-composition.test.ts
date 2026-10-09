import { describe, expect, it } from "vitest";

import profileFixture from "../../fixtures/engine/projection-profiles.synthetic.valid.json";
import packFixture from "../../fixtures/engine/source-pack.synthetic.valid.json";
import * as composition from "../../scripts/source-pack";
import * as legacy from "../../src/engine/source-pack";

const names = [
  "SourcePackValidationError",
  "assertSourcePackPlanCompatibility",
  "createSourcePackAdmissionPlan",
  "parseSourcePackBundle",
  "serializeSourcePackAdmissionPlan",
  "serializeSourcePackBundle",
] as const;

describe("Source-pack composition compatibility", () => {
  it("preserves all six bindings and the singleton error constructor", () => {
    expect(Object.keys(legacy).sort()).toEqual([...names].sort());
    expect(Object.keys(composition).sort()).toEqual([...names].sort());
    for (const name of names)
      expect(legacy[name], name).toBe(composition[name]);
  });

  it("preserves canonical bundle bytes, validation and immutable inputs", () => {
    const before = JSON.stringify(packFixture);
    const direct = composition.parseSourcePackBundle(packFixture);
    const compatible = legacy.parseSourcePackBundle(packFixture);
    expect(composition.serializeSourcePackBundle(direct)).toBe(
      legacy.serializeSourcePackBundle(compatible),
    );
    expect(Object.isFrozen(direct)).toBe(true);
    expect(JSON.stringify(packFixture)).toBe(before);
    const malformed = structuredClone(packFixture);
    malformed.id = "Invalid identifier";
    expect(() => composition.parseSourcePackBundle(malformed)).toThrow(
      legacy.SourcePackValidationError,
    );
    expect(() => legacy.parseSourcePackBundle(malformed)).toThrow(
      composition.SourcePackValidationError,
    );
  });

  it("keeps predecessor and request failures atomic through both entry points", () => {
    const inputs = [
      profileFixture,
      packFixture,
      { requestedOperation: "network_fetch" },
    ] as const;
    const before = JSON.stringify(inputs);
    function failure(
      create: typeof composition.createSourcePackAdmissionPlan,
    ): Error {
      try {
        create(...inputs);
      } catch (error) {
        expect(error).toBeInstanceOf(composition.SourcePackValidationError);
        return error as Error;
      }
      throw new Error("Invalid source-pack graph unexpectedly succeeded.");
    }
    expect(failure(legacy.createSourcePackAdmissionPlan).message).toBe(
      failure(composition.createSourcePackAdmissionPlan).message,
    );
    expect(JSON.stringify(inputs)).toBe(before);
  });
});
