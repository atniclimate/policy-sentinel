import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import malformedFixtureFamily from "../../fixtures/engine/projection-profiles-malformed.invalid.json";
import validProfileBundle from "../../fixtures/engine/projection-profiles.synthetic.valid.json";
import federalRecord from "../../fixtures/records/general-jurisdiction.valid.json";
import projectionProfileSchema from "../../schemas/projection-profile.schema.v1.json";
import {
  ProjectionValidationError,
  createEngineProjection,
  parseProjectionProfileBundle,
} from "../../src/engine";
import type { PolicyRecord } from "../../src/shared/contracts";

type Mutation = {
  operation: "add" | "remove" | "replace";
  path: string;
  value?: unknown;
};

type MalformedCase = {
  id: string;
  expectedLayer: "schema" | "semantic" | "projection";
  mutations: Mutation[];
};

function pointerParts(pointer: string): string[] {
  if (!pointer.startsWith("/")) {
    throw new TypeError(`invalid fixture mutation pointer ${pointer}`);
  }
  return pointer
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
}

function applyMutations(
  base: unknown,
  mutations: readonly Mutation[],
): unknown {
  const result = structuredClone(base) as Record<string, unknown>;
  for (const mutation of mutations) {
    const parts = pointerParts(mutation.path);
    const final = parts.pop();
    if (final === undefined) {
      throw new TypeError("fixture mutation cannot target the document root");
    }
    let parent: unknown = result;
    for (const part of parts) {
      if (Array.isArray(parent)) {
        parent = parent[Number(part)];
      } else {
        parent = (parent as Record<string, unknown>)[part];
      }
    }
    if (mutation.operation === "remove") {
      if (Array.isArray(parent)) {
        parent.splice(Number(final), 1);
      } else {
        delete (parent as Record<string, unknown>)[final];
      }
    } else if (Array.isArray(parent)) {
      if (mutation.operation === "add" && final === "-") {
        parent.push(structuredClone(mutation.value));
      } else {
        parent[Number(final)] = structuredClone(mutation.value);
      }
    } else {
      (parent as Record<string, unknown>)[final] = structuredClone(
        mutation.value,
      );
    }
  }
  return result;
}

const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
addFormats(ajv);
const validateProfile = ajv.compile(projectionProfileSchema);
const malformedCases = malformedFixtureFamily.cases as MalformedCase[];

const expectedCaseIds = [
  "missing-bundle-id",
  "unknown-root-field",
  "unknown-nested-field",
  "malformed-region-id",
  "malformed-rule-version",
  "unsupported-authority-state",
  "unsupported-visibility",
  "malformed-temporal-date",
  "missing-nonclaims",
  "invalid-nonclaim",
  "duplicate-source-reference",
  "duplicate-region-id",
  "duplicate-watch-rule-id",
  "duplicate-deployment-id",
  "duplicate-persona-id",
  "duplicate-output-id",
  "duplicate-authority-id",
  "cross-kind-duplicate-stable-id",
  "duplicate-jurisdiction-reference-id",
  "unknown-source-reference",
  "unknown-authority-reference",
  "unknown-taxonomy-reference",
  "unknown-taxonomy-version",
  "unknown-region-reference",
  "unknown-deployment-reference",
  "unknown-rule-reference",
  "unknown-output-reference",
  "cross-region-rule-reference",
  "inverted-temporal-scope",
  "basis-evidence-mismatch",
  "unknown-record-reference",
];

const expectedSemanticCodes = new Map<string, string>([
  ["duplicate-region-id", "DUPLICATE_ID"],
  ["duplicate-watch-rule-id", "DUPLICATE_ID"],
  ["duplicate-deployment-id", "DUPLICATE_ID"],
  ["duplicate-persona-id", "DUPLICATE_ID"],
  ["duplicate-output-id", "DUPLICATE_ID"],
  ["duplicate-authority-id", "DUPLICATE_ID"],
  ["cross-kind-duplicate-stable-id", "DUPLICATE_ID"],
  ["duplicate-jurisdiction-reference-id", "DUPLICATE_ID"],
  ["unknown-source-reference", "UNKNOWN_SOURCE"],
  ["unknown-authority-reference", "UNKNOWN_REFERENCE"],
  ["unknown-taxonomy-reference", "UNKNOWN_TAXONOMY"],
  ["unknown-taxonomy-version", "UNKNOWN_TAXONOMY"],
  ["unknown-region-reference", "UNKNOWN_REFERENCE"],
  ["unknown-deployment-reference", "UNKNOWN_REFERENCE"],
  ["unknown-rule-reference", "UNKNOWN_REFERENCE"],
  ["unknown-output-reference", "UNKNOWN_REFERENCE"],
  ["cross-region-rule-reference", "CROSS_PROFILE_REFERENCE"],
  ["inverted-temporal-scope", "INVALID_TEMPORAL_SCOPE"],
  ["basis-evidence-mismatch", "INVALID_REASON"],
]);

describe("projection profile schema and runtime closure", () => {
  it("pins a strict standalone schema and accepts the representative bundle", () => {
    expect(ajv.validateSchema(projectionProfileSchema)).toBe(true);
    expect(projectionProfileSchema.$id).toBe(
      "https://policy-sentinel.invalid/schemas/projection-profile.schema.v1.json",
    );
    expect(projectionProfileSchema.additionalProperties).toBe(false);
    expect(
      validateProfile(validProfileBundle),
      ajv.errorsText(validateProfile.errors),
    ).toBe(true);
    expect(() =>
      parseProjectionProfileBundle(validProfileBundle),
    ).not.toThrow();

    expect(validProfileBundle.synthetic).toBe(true);
    expect(validProfileBundle.regionPacks).toHaveLength(2);
    expect(validProfileBundle.deploymentProfiles).toHaveLength(2);
    expect(validProfileBundle.personaProjections).toHaveLength(2);
    expect(
      new Set(validProfileBundle.watchRules.flatMap((rule) => rule.recordIds)),
    ).toEqual(new Set(["psr:synthetic-federal:record-001"]));
    expect(
      new Set(validProfileBundle.watchRules.map((rule) => rule.basis)).size,
    ).toBe(2);
    expect(
      validProfileBundle.personaProjections.every(
        ({ visibility }) => visibility === "public",
      ),
    ).toBe(true);
    expect(JSON.stringify(validProfileBundle)).toContain(".invalid/");
  });

  it("allows a structurally complete single-profile bundle", () => {
    const minimal = structuredClone(validProfileBundle);
    minimal.regionPacks = minimal.regionPacks.slice(0, 1);
    minimal.watchRules = minimal.watchRules.slice(0, 1);
    minimal.deploymentProfiles = minimal.deploymentProfiles.slice(0, 1);
    minimal.personaProjections = minimal.personaProjections.slice(0, 1);
    minimal.outputAdapters = minimal.outputAdapters.slice(0, 1);

    expect(
      validateProfile(minimal),
      ajv.errorsText(validateProfile.errors),
    ).toBe(true);
    expect(
      parseProjectionProfileBundle(minimal).personaProjections,
    ).toHaveLength(1);
  });

  it("keeps schema and runtime aligned for early dates, version limits, and URI escapes", () => {
    const earlyDates = structuredClone(validProfileBundle);
    earlyDates.watchRules[0]!.temporalScope.from = "0000-01-01";
    earlyDates.watchRules[0]!.temporalScope.through = "0099-12-31";
    expect(
      validateProfile(earlyDates),
      ajv.errorsText(validateProfile.errors),
    ).toBe(true);
    expect(() => parseProjectionProfileBundle(earlyDates)).not.toThrow();

    const longVersion = structuredClone(
      validProfileBundle,
    ) as unknown as Record<string, unknown>;
    longVersion.version = `${"1".repeat(61)}.0.0`;
    expect(validateProfile(longVersion)).toBe(false);
    expect(() => parseProjectionProfileBundle(longVersion)).toThrow(
      ProjectionValidationError,
    );

    for (const invalidUrl of [
      "https://x.invalid/%zz",
      "https://x.invalid/{",
      "https://x.invalid/|",
      'https://x.invalid/"',
      "https://x.invalid/é",
      "https://x.invalid/\\x",
    ]) {
      const invalidEvidenceUrl = structuredClone(validProfileBundle);
      invalidEvidenceUrl.watchRules[0]!.evidenceUrl = invalidUrl;
      expect(validateProfile(invalidEvidenceUrl), invalidUrl).toBe(false);
      expect(
        () => parseProjectionProfileBundle(invalidEvidenceUrl),
        invalidUrl,
      ).toThrow(ProjectionValidationError);
    }
  });

  it("pins the complete malformed fixture inventory", () => {
    expect(malformedFixtureFamily.fixtureFamilyVersion).toBe("1.0.0");
    expect(malformedFixtureFamily.baseFixture).toBe(
      "projection-profiles.synthetic.valid.json",
    );
    expect(malformedCases.map(({ id }) => id)).toEqual(expectedCaseIds);
  });

  it.each(malformedCases)(
    "fails closed for malformed case $id",
    (fixtureCase) => {
      const candidate = applyMutations(
        validProfileBundle,
        fixtureCase.mutations,
      );
      const schemaAccepted = validateProfile(candidate);

      if (fixtureCase.expectedLayer === "schema") {
        expect(schemaAccepted, fixtureCase.id).toBe(false);
        expect(() => parseProjectionProfileBundle(candidate)).toThrow(
          ProjectionValidationError,
        );
        return;
      }

      expect(
        schemaAccepted,
        `${fixtureCase.id}: ${ajv.errorsText(validateProfile.errors)}`,
      ).toBe(true);
      if (fixtureCase.expectedLayer === "semantic") {
        const expectedCode = expectedSemanticCodes.get(fixtureCase.id);
        expect(expectedCode).toBeDefined();
        try {
          parseProjectionProfileBundle(candidate);
          throw new Error(`${fixtureCase.id} was accepted`);
        } catch (error) {
          expect(error).toBeInstanceOf(ProjectionValidationError);
          expect((error as ProjectionValidationError).code).toBe(expectedCode);
        }
        return;
      }

      expect(() => parseProjectionProfileBundle(candidate)).not.toThrow();
      let result: unknown = Symbol("no partial projection");
      expect(() => {
        result = createEngineProjection(
          [structuredClone(federalRecord) as PolicyRecord],
          candidate,
        );
      }).toThrowError(
        expect.objectContaining({
          code: "UNKNOWN_RECORD",
        }) as ProjectionValidationError,
      );
      expect(typeof result).toBe("symbol");
    },
  );
});
