import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import assertionSchema from "../../../schemas/assertion.schema.v1.json";
import jurisdictionEvidenceSchema from "../../../schemas/experimental/jurisdiction-evidence.schema.v1.json";
import { S0_PROTECTED_KEYS } from "../../../src/experimental/spatial/constants";
import {
  createJurisdictionEvidence,
  createJurisdictionEvidenceCollection,
  validateJurisdictionEvidence,
  validateJurisdictionEvidenceCollection,
} from "../../../src/experimental/spatial/jurisdiction-evidence";
import { createSpatialObservation } from "../../../src/experimental/spatial/observation";
import { createSpatialRelation } from "../../../src/experimental/spatial/relation";
import type {
  JurisdictionEvidence,
  JurisdictionEvidenceInput,
} from "../../../src/experimental/spatial/types";

const fixtureRoot = resolve("fixtures/experimental/spatial");
const validFixture = JSON.parse(
  readFileSync(
    resolve(fixtureRoot, "jurisdiction-evidence.valid.json"),
    "utf8",
  ),
) as unknown;
const malformedFixture = JSON.parse(
  readFileSync(
    resolve(fixtureRoot, "jurisdiction-evidence-malformed.invalid.json"),
    "utf8",
  ),
) as unknown;

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(assertionSchema);
const validateSchema = ajv.compile(jurisdictionEvidenceSchema);

function mutableClone<T>(value: T): T {
  return structuredClone(value);
}

function jurisdictionInput(
  fixtureSlug = "fixture-0042",
): JurisdictionEvidenceInput {
  return {
    fixtureSlug,
    retrievedAt: "3785-06-07T08:09:10-07:00",
  };
}

function observation(fixtureSlug: string, minimum: number) {
  return createSpatialObservation({
    fixtureSlug,
    layerVersion: "1.0.0",
    axisOrder: ["synthetic_x", "synthetic_y"],
    geometry: {
      minimum: [minimum, minimum],
      maximum: [minimum + 2, minimum + 2],
    },
    resolution: 1,
    observedTimeValue: {
      kind: "date_time",
      value: "3785-01-01T00:00:00Z",
    },
    validTimeValue: { kind: "date", value: "3785-01-01" },
    coverage: "complete_fixture_extent",
    uncertainty: { state: "certain" },
    retrievedAt: "3785-01-02T00:00:00Z",
  });
}

function expectRecursivelyFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") {
    return;
  }
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) {
    expectRecursivelyFrozen(child);
  }
}

describe("S0 JurisdictionEvidence source-statement custody", () => {
  it("constructs the exact statement fragment, ID, two facts, and supported evidence", () => {
    const input = jurisdictionInput();
    const evidence = createJurisdictionEvidence(input);

    expect(evidence).toEqual(validFixture);
    expect(
      validateSchema(evidence),
      JSON.stringify(validateSchema.errors),
    ).toBe(true);
    expect(evidence.statement).toBe(
      "Impossible synthetic source statement: s0-impossible:feature:fixture-0042 is assigned to s0-impossible:administrative-unit:fixture-0042 in this fixture only.",
    );
    expect(evidence.jurisdictionEvidenceId).toBe(
      `s0-impossible:jurisdiction-evidence:${evidence.statementDigest}`,
    );
    expect(evidence.factManifest.titleFact.predicate).toBe("instrument_title");
    expect(evidence.factManifest.titleFact.value).toEqual({
      kind: "text",
      value: evidence.sourceLabel,
    });
    expect(evidence.factManifest.titleFact.provenance.sourcePath).toBe(
      "$.sourceLabel",
    );
    expect(evidence.factManifest.fragmentDigestFact.predicate).toBe(
      "rendition_digest",
    );
    expect(evidence.factManifest.fragmentDigestFact.value).toEqual({
      kind: "sha256_digest",
      value: evidence.statementDigest,
    });
    expect(evidence.factManifest.fragmentDigestFact.provenance.sourcePath).toBe(
      "$",
    );
    expect(evidence.evidence).toEqual({
      state: "supported",
      factReferences: [
        evidence.factManifest.fragmentDigestFact,
        evidence.factManifest.titleFact,
      ]
        .map(({ factId, factDigest }) => ({ factId, factDigest }))
        .sort((left, right) => (left.factId < right.factId ? -1 : 1)),
    });
    expect(evidence.factManifest.titleFact.provenance.retrievedAt).toBe(
      evidence.factManifest.fragmentDigestFact.provenance.retrievedAt,
    );
    expectRecursivelyFrozen(evidence);

    input.fixtureSlug = "fixture-9999";
    expect(evidence.fixtureSlug).toBe("fixture-0042");
  });

  it("replays the committed valid fixture and rejects the full malformed fixture", () => {
    expect(validateJurisdictionEvidence(validFixture)).toEqual(validFixture);
    expect(validateSchema(malformedFixture)).toBe(false);
    expect(() => validateJurisdictionEvidence(malformedFixture)).toThrow(
      /protected semantic field|unexpected field/,
    );
  });

  it("rejects statement, digest, ID, fact, provenance, and evidence tampering", () => {
    const valid = createJurisdictionEvidence(jurisdictionInput());
    const attacks: Array<(candidate: JurisdictionEvidence) => void> = [
      (candidate) => {
        candidate.statement = `${candidate.statement} altered`;
      },
      (candidate) => {
        candidate.statementDigest = "0".repeat(64);
      },
      (candidate) => {
        candidate.jurisdictionEvidenceId = `s0-impossible:jurisdiction-evidence:${"0".repeat(64)}`;
      },
      (candidate) => {
        candidate.featureId = "s0-impossible:feature:fixture-0043";
      },
      (candidate) => {
        candidate.factManifest.titleFact.predicate = "event_label";
      },
      (candidate) => {
        candidate.factManifest.titleFact.provenance.sourcePath = "$";
      },
      (candidate) => {
        candidate.factManifest.fragmentDigestFact.provenance.sourceUrl =
          "https://policy-sentinel.invalid/fixtures/s0/1.0.0/fixture-0043.json";
      },
      (candidate) => {
        candidate.factManifest.fragmentDigestFact.provenance.retrievedAt =
          "3785-06-07T08:09:11-07:00";
      },
      (candidate) => {
        candidate.factManifest.fragmentDigestFact.provenance.sourceContentDigest =
          "1".repeat(64);
      },
      (candidate) => {
        candidate.factManifest.titleFact.factDigest = "2".repeat(64);
      },
      (candidate) => {
        candidate.evidence.factReferences = [
          ...candidate.evidence.factReferences,
        ].reverse();
      },
      (candidate) => {
        candidate.evidence.factReferences[0]!.factDigest = "3".repeat(64);
      },
    ];

    for (const attack of attacks) {
      const candidate = mutableClone(valid) as JurisdictionEvidence;
      attack(candidate);
      expect(() => validateJurisdictionEvidence(candidate)).toThrow();
    }
  });

  it("replays statement digest and evidence ID before forged K0 semantics", () => {
    const candidate = mutableClone(
      createJurisdictionEvidence(jurisdictionInput()),
    ) as JurisdictionEvidence;
    candidate.statementDigest = "0".repeat(64);
    candidate.jurisdictionEvidenceId = `s0-impossible:jurisdiction-evidence:${"0".repeat(64)}`;
    candidate.factManifest.titleFact.predicate = "event_label";
    candidate.factManifest.titleFact.value = {
      kind: "text",
      value: "Forged but structurally valid fact",
    };
    candidate.factManifest.titleFact.provenance.sourcePath = "$.forged";
    candidate.factManifest.fragmentDigestFact.provenance.retrievedAt =
      "3785-06-07T08:09:11-07:00";

    expect(() => validateJurisdictionEvidence(candidate)).toThrow(
      /statementDigest.*exact jurisdiction statement fragment/,
    );
  });

  it("rejects observations, relations, spatial fields, and every protected semantic key", () => {
    const subject = observation("fixture-0044", -4);
    const object = observation("fixture-0045", 0);
    const relation = createSpatialRelation(subject, object, { tolerance: 0 });

    for (const value of [subject, relation]) {
      expect(() =>
        createJurisdictionEvidence(
          value as unknown as JurisdictionEvidenceInput,
        ),
      ).toThrow(/unexpected field/);
    }
    expect(() =>
      createJurisdictionEvidence({
        ...jurisdictionInput(),
        geometry: null,
      } as unknown as JurisdictionEvidenceInput),
    ).toThrow(/unexpected field/);

    const valid = createJurisdictionEvidence(jurisdictionInput());
    for (const protectedKey of S0_PROTECTED_KEYS) {
      expect(() =>
        createJurisdictionEvidence({
          ...jurisdictionInput(),
          [protectedKey]: "forged",
        } as unknown as JurisdictionEvidenceInput),
      ).toThrow(/protected semantic field/);

      const nested = mutableClone(valid) as unknown as Record<string, unknown>;
      const manifest = nested.factManifest as Record<string, unknown>;
      const titleFact = manifest.titleFact as Record<string, unknown>;
      const factValue = titleFact.value as Record<string, unknown>;
      factValue[protectedKey] = "forged";
      expect(() => validateJurisdictionEvidence(nested)).toThrow(
        /protected semantic field/,
      );
    }
  });

  it("sorts only in collection construction and rejects duplicates or overflow", () => {
    const first = createJurisdictionEvidence(jurisdictionInput("fixture-0046"));
    const second = createJurisdictionEvidence(
      jurisdictionInput("fixture-0047"),
    );
    const descending =
      first.jurisdictionEvidenceId > second.jurisdictionEvidenceId
        ? [first, second]
        : [second, first];
    const collection = createJurisdictionEvidenceCollection(descending);

    expect(collection.map((entry) => entry.jurisdictionEvidenceId)).toEqual(
      [...collection].map((entry) => entry.jurisdictionEvidenceId).sort(),
    );
    expect(() => validateJurisdictionEvidenceCollection(descending)).toThrow(
      /stable-ID-sorted/,
    );
    expect(() =>
      validateJurisdictionEvidenceCollection([first, first]),
    ).toThrow(/stable-ID-sorted/);
    expect(() =>
      createJurisdictionEvidenceCollection(Array(17).fill(first)),
    ).toThrow(/no more than 16/);
    expectRecursivelyFrozen(collection);
  });
});
