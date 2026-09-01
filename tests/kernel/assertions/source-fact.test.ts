import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import assertionSchema from "../../../schemas/assertion.schema.v1.json";
import {
  ASSERTION_CONTRACT_VERSION,
  CANONICALIZATION_VERSION,
  createEventId,
  createFactId,
  createInstrumentId,
  createSourceFact,
  createVersionId,
  validateDerivedAssertion,
  validateEvidenceReferences,
  validateEvidenceState,
  validateSourceFact,
  type SourceFactInput,
  type SourceProvenance,
  type SourceQualifiedIdentity,
} from "../../../src/kernel/assertions";

const SOURCE_DIGEST = "a".repeat(64);
const RENDITION_DIGEST = "b".repeat(64);

const sourceIdentity: SourceQualifiedIdentity = {
  sourceId: "synthetic-register",
  sourceRecordId: "Record / 1",
};
const assertionAjv = new Ajv2020({ allErrors: true, strict: true });
addFormats(assertionAjv);
assertionAjv.addSchema(assertionSchema);
const validateAssertion = assertionAjv.getSchema(assertionSchema.$id)!;
const validateHttpsUrl = assertionAjv.compile({
  $ref: `${assertionSchema.$id}#/$defs/httpsUrl`,
});
const validateExactText = assertionAjv.compile({
  $ref: `${assertionSchema.$id}#/$defs/exactText`,
});

function provenance(
  overrides: Partial<SourceProvenance> = {},
): SourceProvenance {
  return {
    sourceIdentity,
    sourceUrl: "https://example.invalid/synthetic/record-1",
    sourcePath: "$.items[0]",
    retrievedAt: "2026-09-01T10:20:30-07:00",
    sourceUpdatedAt: null,
    adapterId: "synthetic-adapter",
    adapterVersion: "1.0.0",
    sourceContentDigest: SOURCE_DIGEST,
    validationState: "validated",
    ...overrides,
  };
}

function factInput(overrides: Partial<SourceFactInput> = {}): SourceFactInput {
  return {
    sourceIdentity,
    predicate: "instrument_title",
    value: { kind: "text", value: "Impossible synthetic instrument" },
    provenance: provenance(),
    ...overrides,
  };
}

describe("source-qualified IDs", () => {
  it("uses exact UTF-8 unpadded base64url and full digests", () => {
    expect(createInstrumentId(sourceIdentity)).toBe(
      "k0:instrument:synthetic-register:UmVjb3JkIC8gMQ",
    );
    expect(
      createVersionId(sourceIdentity, "Rendition 1", RENDITION_DIGEST),
    ).toBe(
      `k0:version:synthetic-register:UmVjb3JkIC8gMQ:UmVuZGl0aW9uIDE:${RENDITION_DIGEST}`,
    );
    expect(createEventId(sourceIdentity, "Event 1")).toBe(
      "k0:event:synthetic-register:UmVjb3JkIC8gMQ:RXZlbnQgMQ",
    );
    expect(() =>
      createFactId(
        sourceIdentity,
        "$.items[0]",
        "inferred_legal_status",
        SOURCE_DIGEST,
      ),
    ).toThrow(/allowlisted source-fact predicate/);
  });
});

describe("SourceFact 1.0.0", () => {
  it("creates a stable immutable fact whose runtime shape validates against the schema", () => {
    const input = factInput();
    const fact = createSourceFact(input);

    expect(ASSERTION_CONTRACT_VERSION).toBe("1.0.0");
    expect(fact.contractVersion).toBe("1.0.0");
    expect(fact.factId).toBe(
      `k0:fact:synthetic-register:UmVjb3JkIC8gMQ:JC5pdGVtc1swXQ:instrument_title:${SOURCE_DIGEST}`,
    );
    expect(fact.factDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(fact)).toBe(true);
    expect(Object.isFrozen(fact.provenance)).toBe(true);
    expect(Object.isFrozen(fact.sourceIdentity)).toBe(true);

    input.value = { kind: "text", value: "Caller mutation" };
    expect(fact.value).toEqual({
      kind: "text",
      value: "Impossible synthetic instrument",
    });

    expect(
      validateAssertion(fact),
      JSON.stringify(validateAssertion.errors),
    ).toBe(true);
  });

  it("replays identically across caller key order", () => {
    const first = createSourceFact(factInput());
    const second = createSourceFact({
      provenance: {
        validationState: "validated",
        sourceContentDigest: SOURCE_DIGEST,
        adapterVersion: "1.0.0",
        adapterId: "synthetic-adapter",
        sourceUpdatedAt: null,
        retrievedAt: "2026-09-01T10:20:30-07:00",
        sourcePath: "$.items[0]",
        sourceUrl: "https://example.invalid/synthetic/record-1",
        sourceIdentity: {
          sourceRecordId: "Record / 1",
          sourceId: "synthetic-register",
        },
      },
      value: { value: "Impossible synthetic instrument", kind: "text" },
      predicate: "instrument_title",
      sourceIdentity: {
        sourceRecordId: "Record / 1",
        sourceId: "synthetic-register",
      },
    });

    expect(second).toEqual(first);
    expect(second.factDigest).toBe(first.factDigest);
  });

  it("rejects identity divergence, kind mismatch, ID tampering, and digest tampering", () => {
    expect(() =>
      createSourceFact(
        factInput({
          provenance: provenance({
            sourceIdentity: {
              sourceId: "other-source",
              sourceRecordId: "Record / 1",
            },
          }),
        }),
      ),
    ).toThrow(/must match/);

    expect(() =>
      createSourceFact(
        factInput({
          value: { kind: "identifier", value: "wrong-kind" },
        }),
      ),
    ).toThrow(/does not match predicate/);

    const fact = createSourceFact(factInput());
    expect(() =>
      validateSourceFact({ ...fact, factId: `${fact.factId}-x` }),
    ).toThrow(/stable source-qualified fact ID/);
    expect(() =>
      validateSourceFact({ ...fact, factDigest: "0".repeat(64) }),
    ).toThrow(/canonical fact digest/);
  });

  it("rejects protected semantic fields instead of retaining an overclaim", () => {
    const fact = createSourceFact(factInput());
    for (const field of [
      "legalEffect",
      "relevance",
      "nationId",
      "rights",
      "interest",
      "eligibility",
      "impact",
    ]) {
      expect(() => validateSourceFact({ ...fact, [field]: "claimed" })).toThrow(
        /unexpected field/,
      );
    }

    expect(() =>
      createSourceFact({
        ...factInput(),
        legalEffect: "claimed",
      } as unknown as SourceFactInput),
    ).toThrow(/unexpected field/);
  });

  it("rejects non-JSON input properties before reading them", () => {
    const input = factInput() as SourceFactInput & { hidden?: string };
    Object.defineProperty(input, "hidden", {
      enumerable: true,
      get: () => "not-data",
    });
    expect(() => createSourceFact(input)).toThrow(/data property/);
  });

  it("keeps the schema and runtime aligned on exact HTTPS and text profiles", () => {
    const urlCases = [
      ["https://example.invalid/path", true],
      ["https://example.invalid/a%20b", true],
      ["https://example.invalid/%C3%A9", true],
      ["HTTPS://example.invalid/path", false],
      ["https://user@example.invalid/path", false],
      ["https://user:secret@example.invalid/path", false],
      ["https://example.invalid/a b", false],
      ["https://example.invalid/a\\b", false],
      ["https://example.invalid/é", false],
    ] as const;
    for (const [sourceUrl, expected] of urlCases) {
      const runtimeAccepted = (() => {
        try {
          createSourceFact(
            factInput({ provenance: provenance({ sourceUrl }) }),
          );
          return true;
        } catch {
          return false;
        }
      })();
      expect(Boolean(validateHttpsUrl(sourceUrl)), sourceUrl).toBe(expected);
      expect(runtimeAccepted, sourceUrl).toBe(expected);
    }

    const textCases = [
      ["$.items[0]", true],
      [" leading", false],
      ["trailing ", false],
      ["   ", false],
      ["line\nbreak", false],
    ] as const;
    for (const [sourcePath, expected] of textCases) {
      const runtimeAccepted = (() => {
        try {
          createSourceFact(
            factInput({ provenance: provenance({ sourcePath }) }),
          );
          return true;
        } catch {
          return false;
        }
      })();
      expect(
        Boolean(validateExactText(sourcePath)),
        JSON.stringify(sourcePath),
      ).toBe(expected);
      expect(runtimeAccepted, JSON.stringify(sourcePath)).toBe(expected);
    }
  });
});

describe("evidence and derived assertions", () => {
  it("enforces the exact evidence cardinalities and canonical reference order", () => {
    const fact = createSourceFact(factInput());
    const reference = { factId: fact.factId, factDigest: fact.factDigest };

    expect(
      validateEvidenceState({
        state: "supported",
        factReferences: [reference],
      }),
    ).toEqual({
      state: "supported",
      factReferences: [reference],
    });
    expect(
      validateEvidenceState({
        state: "unknown",
        reason: "not_observed",
        factReferences: [],
      }),
    ).toEqual({
      state: "unknown",
      reason: "not_observed",
      factReferences: [],
    });
    expect(() =>
      validateEvidenceState({ state: "supported", factReferences: [] }),
    ).toThrow(/at least 1/);
    expect(() =>
      validateEvidenceState({
        state: "conflicting_evidence",
        factReferences: [reference],
      }),
    ).toThrow(/at least 2/);
    expect(() =>
      validateEvidenceState({
        state: "unknown",
        reason: "not_supplied",
        factReferences: [reference],
      }),
    ).toThrow(/cannot cite facts/);
  });

  it("binds fact references to exact immutable facts and digests", () => {
    const fact = createSourceFact(factInput());
    const evidence = validateEvidenceState({
      state: "supported",
      factReferences: [{ factId: fact.factId, factDigest: fact.factDigest }],
    });
    expect(() => validateEvidenceReferences(evidence, [fact])).not.toThrow();
    expect(() =>
      validateEvidenceReferences(
        {
          state: "supported",
          factReferences: [{ factId: fact.factId, factDigest: "0".repeat(64) }],
        },
        [fact],
      ),
    ).toThrow(/fact digest does not match/);
  });

  it("validates the no-custody DerivedAssertion seam and exact input bindings", () => {
    const fact = createSourceFact(factInput());
    const reference = { factId: fact.factId, factDigest: fact.factDigest };
    const assertion = validateDerivedAssertion({
      contractVersion: "1.0.0",
      assertionId: "k0:test:synthetic",
      assertionClass: "test_assertion",
      inputFactIds: [fact.factId],
      inputFactDigests: [fact.factDigest],
      ruleId: "synthetic-rule",
      ruleVersion: "1.0.0",
      canonicalizationVersion: CANONICALIZATION_VERSION,
      resultDigest: "c".repeat(64),
      evidence: { state: "supported", factReferences: [reference] },
      validationState: "validated",
    });

    expect(Object.isFrozen(assertion)).toBe(true);
    expect(assertion).not.toHaveProperty("provenance");
    expect(() =>
      validateDerivedAssertion({
        ...assertion,
        inputFactDigests: ["d".repeat(64)],
      }),
    ).toThrow(/input facts must include/);
  });

  it("keeps derived-assertion schema and runtime lexical validation in parity", () => {
    const fact = createSourceFact(factInput());
    const reference = { factId: fact.factId, factDigest: fact.factDigest };
    const valid = {
      contractVersion: "1.0.0",
      assertionId: "k0:test:synthetic",
      assertionClass: "test_assertion",
      inputFactIds: [fact.factId],
      inputFactDigests: [fact.factDigest],
      ruleId: "synthetic-rule",
      ruleVersion: "1.0.0",
      canonicalizationVersion: CANONICALIZATION_VERSION,
      resultDigest: "c".repeat(64),
      evidence: { state: "supported", factReferences: [reference] },
      validationState: "validated",
    };
    const unknown = {
      ...valid,
      inputFactIds: [],
      inputFactDigests: [],
      evidence: {
        state: "unknown",
        reason: "not_supplied",
        factReferences: [],
      },
    };
    const malformedFactId = "k0:fact:x";
    const cases: readonly [string, unknown, boolean][] = [
      ["supported", valid, true],
      ["unknown-empty", unknown, true],
      [
        "short-fact-id",
        {
          ...valid,
          inputFactIds: [malformedFactId],
          evidence: {
            state: "supported",
            factReferences: [
              { factId: malformedFactId, factDigest: fact.factDigest },
            ],
          },
        },
        false,
      ],
      [
        "short-extra-input-fact-id",
        {
          ...unknown,
          inputFactIds: [malformedFactId],
          inputFactDigests: [fact.factDigest],
        },
        false,
      ],
      ["plain-assertion-id", { ...valid, assertionId: "plain" }, false],
      ["source-fact-class", { ...valid, assertionClass: "source_fact" }, false],
      ["bad-assertion-class", { ...valid, assertionClass: "Bad-Class" }, false],
      ["bad-rule-id", { ...valid, ruleId: "Bad_Rule" }, false],
      ["short-rule-version", { ...valid, ruleVersion: "1.0" }, false],
      ["leading-zero-version", { ...valid, ruleVersion: "01.0.0" }, false],
    ];

    for (const [label, candidate, expected] of cases) {
      const runtimeAccepted = (() => {
        try {
          validateDerivedAssertion(candidate);
          return true;
        } catch {
          return false;
        }
      })();
      expect(Boolean(validateAssertion(candidate)), label).toBe(expected);
      expect(runtimeAccepted, label).toBe(expected);
    }
  });
});
