import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import assertionSchema from "../../../schemas/assertion.schema.v1.json";
import jurisdictionEvidenceSchema from "../../../schemas/experimental/jurisdiction-evidence.schema.v1.json";
import spatialObservationSchema from "../../../schemas/experimental/spatial-observation.schema.v1.json";
import spatialRelationSchema from "../../../schemas/experimental/spatial-relation.schema.v1.json";
import {
  assertS0JsonValue,
  validateStoredBox,
} from "../../../src/experimental/spatial/validation";

const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
addFormats(ajv);
ajv.addSchema(assertionSchema);
ajv.addSchema(spatialObservationSchema);
ajv.addSchema(spatialRelationSchema);
ajv.addSchema(jurisdictionEvidenceSchema);

const validateNoObservationProtectedKeys = ajv.compile({
  $ref: `${spatialObservationSchema.$id}#/$defs/noProtectedKeys`,
});
const validateCoordinate = ajv.compile({
  $ref: `${spatialObservationSchema.$id}#/$defs/coordinate`,
});
const validateSentinelUrl = ajv.compile({
  $ref: `${spatialObservationSchema.$id}#/$defs/sentinelUrl`,
});
const validateK0Provenance = ajv.compile({
  $ref: `${assertionSchema.$id}#/$defs/sourceProvenance`,
});
const validateS0Provenance = ajv.compile({
  $ref: `${spatialObservationSchema.$id}#/$defs/provenanceBase`,
});
const validateK0TemporalValue = ajv.compile({
  $ref: `${assertionSchema.$id}#/$defs/temporalValue`,
});
const validateS0TemporalValue = ajv.compile({
  $ref: `${spatialObservationSchema.$id}#/$defs/s0TemporalValue`,
});
const validateDerivedAssertion = ajv.compile({
  $ref: `${spatialRelationSchema.$id}#/$defs/derivedAssertion`,
});
const validateJurisdictionStatement = ajv.compile({
  $ref: `${jurisdictionEvidenceSchema.$id}#/$defs/jurisdictionEvidence/properties/statement`,
});

function baseProvenance() {
  return {
    sourceIdentity: {
      sourceId: "s0-impossible",
      sourceRecordId: "s0-impossible:fixture:fixture-0001",
    },
    sourceUrl:
      "https://policy-sentinel.invalid/fixtures/s0/1.0.0/fixture-0001.json",
    sourcePath: "$",
    retrievedAt: "3785-01-01T00:00:00Z",
    sourceUpdatedAt: null,
    adapterId: "s0-impossible-fixture",
    adapterVersion: "1.0.0",
    sourceContentDigest: "a".repeat(64),
    validationState: "validated",
  };
}

function sixFactAssertion() {
  const factReferences = Array.from({ length: 6 }, (_, index) => {
    const digest = (index + 1).toString(16).repeat(64);
    return {
      factId: `k0:fact:s0-impossible:Zml4dHVyZS0wMDAx:JA:rendition_digest:${digest}`,
      factDigest: digest,
    };
  });
  return {
    contractVersion: "1.0.0",
    assertionId: `k0:spatial_relation:${"a".repeat(64)}`,
    assertionClass: "spatial_relation",
    inputFactIds: factReferences.map((entry) => entry.factId),
    inputFactDigests: factReferences.map((entry) => entry.factDigest),
    ruleId: "s0-axis-aligned-box-topology",
    ruleVersion: "1.0.0",
    canonicalizationVersion: "ps-c14n-json-1",
    resultDigest: "b".repeat(64),
    evidence: { state: "supported", factReferences },
    validationState: "validated",
  };
}

describe("S0 schema/runtime adversarial boundary", () => {
  it("rejects every protected key recursively in schema and runtime", () => {
    const protectedKeys = [
      "nationId",
      "nationIds",
      "officialName",
      "authorizedAliases",
      "recognitionBaselineVersion",
      "stateCoverage",
      "nationAssociations",
      "jurisdiction",
      "issuingBodies",
      "officialSubjects",
      "taxonomyMemberships",
      "relevance",
      "landmark",
      "legalEffect",
      "legalApplicability",
      "rights",
      "consent",
      "affiliation",
      "interest",
      "eligibility",
      "impact",
    ];

    for (const key of protectedKeys) {
      const candidate = { safe: [{ nested: { [key]: "forbidden" } }] };
      expect(validateNoObservationProtectedKeys(candidate), key).toBe(false);
      expect(() => assertS0JsonValue(candidate), key).toThrow(
        /protected semantic field/,
      );
    }

    const safe = { safe: [{ nested: { value: "synthetic" } }] };
    expect(validateNoObservationProtectedKeys(safe)).toBe(true);
    expect(() => assertS0JsonValue(safe)).not.toThrow();
  });

  it("rejects non-JSON mutation surfaces before domain validation", () => {
    const customPrototype = Object.create({ inherited: true }) as Record<
      string,
      unknown
    >;
    customPrototype.value = "synthetic";

    const nullPrototype = Object.create(null) as Record<string, unknown>;
    nullPrototype.value = "synthetic";

    const accessor: Record<string, unknown> = {};
    Object.defineProperty(accessor, "value", {
      enumerable: true,
      get: () => "synthetic",
    });

    const hidden: Record<string, unknown> = { value: "synthetic" };
    Object.defineProperty(hidden, "hidden", {
      enumerable: false,
      value: "synthetic",
    });

    const symbolValue: Record<string | symbol, unknown> = {
      value: "synthetic",
    };
    symbolValue[Symbol("hidden")] = "synthetic";

    const sparse = new Array(2);
    sparse[1] = "synthetic";

    const decoratedArray = ["synthetic"] as unknown[] & { extra?: string };
    decoratedArray.extra = "forbidden";

    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;

    for (const candidate of [
      customPrototype,
      nullPrototype,
      accessor,
      hidden,
      symbolValue,
      sparse,
      decoratedArray,
      cyclic,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
      -0,
    ]) {
      expect(() => assertS0JsonValue(candidate)).toThrow();
    }
  });

  it("records negative zero as an intentional runtime-only invariant", () => {
    expect(validateCoordinate(-0)).toBe(true);
    expect(() =>
      validateStoredBox({ minimum: [-0, -1], maximum: [1, 1] }, "$.geometry"),
    ).toThrow(/safe integer/);
  });

  it("narrows generic K0 provenance to the sole S0 sentinel URL and year", () => {
    const valid = baseProvenance();
    expect(validateK0Provenance(valid)).toBe(true);
    expect(validateS0Provenance(valid)).toBe(true);

    const genericK0Url = {
      ...valid,
      sourceUrl: "https://example.invalid/synthetic",
    };
    expect(validateK0Provenance(genericK0Url)).toBe(true);
    expect(validateS0Provenance(genericK0Url)).toBe(false);

    const genericK0Year = {
      ...valid,
      retrievedAt: "2026-01-01T00:00:00Z",
    };
    expect(validateK0Provenance(genericK0Year)).toBe(true);
    expect(validateS0Provenance(genericK0Year)).toBe(false);
  });

  it("accepts only the exact non-resolving sentinel URL grammar", () => {
    const cases = [
      [
        "https://policy-sentinel.invalid/fixtures/s0/1.0.0/fixture-0001.json",
        true,
      ],
      [
        "https://policy-sentinel.invalid:443/fixtures/s0/1.0.0/fixture-0001.json",
        false,
      ],
      [
        "https://user@policy-sentinel.invalid/fixtures/s0/1.0.0/fixture-0001.json",
        false,
      ],
      [
        "https://policy-sentinel.invalid/fixtures/s0/1.0.0/fixture-0001.json?x=1",
        false,
      ],
      [
        "https://policy-sentinel.invalid/fixtures/s0/1.0.0/fixture-0001.json#x",
        false,
      ],
      [
        "https://policy-sentinel.invalid/fixtures/s0/1.0.0/fixture-%30%30%30%31.json",
        false,
      ],
      ["https://other.invalid/fixtures/s0/1.0.0/fixture-0001.json", false],
    ] as const;

    for (const [value, expected] of cases) {
      expect(Boolean(validateSentinelUrl(value)), value).toBe(expected);
    }
  });

  it("narrows K0 temporal values to exact year 3785", () => {
    const otherYear = { kind: "date", value: "2026-09-01" };
    expect(validateK0TemporalValue(otherYear)).toBe(true);
    expect(validateS0TemporalValue(otherYear)).toBe(false);

    const mixedEndpointYears = {
      kind: "interval",
      start: { kind: "date", value: "3785-01-01", inclusive: true },
      end: { kind: "date", value: "3786-01-01", inclusive: true },
    };
    expect(validateK0TemporalValue(mixedEndpointYears)).toBe(true);
    expect(validateS0TemporalValue(mixedEndpointYears)).toBe(false);
  });

  it("requires exactly six specialized K0 inputs and supported references", () => {
    const valid = sixFactAssertion();
    expect(
      validateDerivedAssertion(valid),
      ajv.errorsText(validateDerivedAssertion.errors),
    ).toBe(true);

    expect(
      validateDerivedAssertion({
        ...valid,
        inputFactIds: valid.inputFactIds.slice(0, 5),
      }),
    ).toBe(false);
    expect(
      validateDerivedAssertion({
        ...valid,
        evidence: {
          state: "supported",
          factReferences: valid.evidence.factReferences.slice(0, 5),
        },
      }),
    ).toBe(false);
    expect(
      validateDerivedAssertion({
        ...valid,
        assertionClass: "relationship_assertion",
      }),
    ).toBe(false);
    expect(
      validateDerivedAssertion({
        ...valid,
        ruleId: "another-rule",
      }),
    ).toBe(false);
  });

  it("permits only the generated jurisdiction statement lexical form", () => {
    const valid =
      "Impossible synthetic source statement: s0-impossible:feature:fixture-0001 is assigned to s0-impossible:administrative-unit:fixture-0001 in this fixture only.";
    expect(validateJurisdictionStatement(valid)).toBe(true);
    expect(
      validateJurisdictionStatement(
        "Impossible synthetic source statement: Real Place is assigned to real jurisdiction.",
      ),
    ).toBe(false);
    expect(
      validateJurisdictionStatement(`${valid} Additional conclusion.`),
    ).toBe(false);
  });
});
