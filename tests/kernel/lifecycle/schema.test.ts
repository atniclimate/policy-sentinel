import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import emptyFixture from "../../../fixtures/lifecycle/empty.synthetic.valid.json";
import assertionSchema from "../../../schemas/assertion.schema.v1.json";
import lifecycleSchema from "../../../schemas/lifecycle.schema.v1.json";
import {
  normalizeLifecycleBundle,
  validateLifecycleBundle,
} from "../../../src/kernel/lifecycle";
import { createLifecycleFixture, mutableClone } from "./fixtures";

const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
addFormats(ajv);
ajv.addSchema(assertionSchema);
const validateAssertion = ajv.getSchema(assertionSchema.$id);
const validateLifecycle = ajv.compile(lifecycleSchema);

describe("K0 strict JSON Schemas", () => {
  it("compile strictly and accept runtime-created representative contracts", () => {
    expect(validateAssertion).toBeTypeOf("function");
    const bundle = normalizeLifecycleBundle(createLifecycleFixture().input);
    for (const fact of bundle.sourceFacts) {
      expect(
        validateAssertion?.(fact),
        ajv.errorsText(validateAssertion?.errors),
      ).toBe(true);
    }
    expect(
      validateLifecycle(bundle),
      ajv.errorsText(validateLifecycle.errors),
    ).toBe(true);
  });

  it("accepts and replays the committed empty synthetic fixture", () => {
    expect(
      validateLifecycle(emptyFixture),
      ajv.errorsText(validateLifecycle.errors),
    ).toBe(true);
    expect(validateLifecycleBundle(emptyFixture).bundleDigest).toBe(
      emptyFixture.bundleDigest,
    );
  });

  it("rejects malformed, overclaiming, and automatic-merge shapes", () => {
    const bundle = mutableClone(
      normalizeLifecycleBundle(createLifecycleFixture().input),
    ) as unknown as Record<string, unknown>;
    const event = (bundle.events as Record<string, unknown>[])[0]!;
    event.legalEffect = "synthetic overclaim";
    expect(validateLifecycle(bundle)).toBe(false);

    delete event.legalEffect;
    const instrument = (bundle.instruments as Record<string, unknown>[])[0]!;
    instrument.automaticCrossSourceMerge = true;
    expect(validateLifecycle(bundle)).toBe(false);

    instrument.automaticCrossSourceMerge = false;
    const validTime = event.validTime as Record<string, unknown>;
    validTime.evidence = {
      state: "unknown",
      reason: "not_supplied",
      factReferences: [],
    };
    expect(validateLifecycle(bundle)).toBe(false);
  });
});
