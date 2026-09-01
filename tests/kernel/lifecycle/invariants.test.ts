import {
  computeLifecycleAssertionResultDigest,
  createEquivalenceAssertionId,
  createRelationshipAssertionId,
  normalizeLifecycleBundle,
  type EquivalenceAssertion,
  type InstrumentReference,
  type LifecycleBundleWithoutDigest,
  type RelationshipAssertion,
  type RelationshipType,
} from "../../../src/kernel/lifecycle";
import { describe, expect, it } from "vitest";
import {
  createFact,
  createInstrumentKit,
  createLifecycleFixture,
  mutableClone,
  referenceEvidence,
} from "./fixtures";

const ZERO_DIGEST = "0".repeat(64);

function emptyBundle(
  sourceFacts: LifecycleBundleWithoutDigest["sourceFacts"],
  instruments: LifecycleBundleWithoutDigest["instruments"],
): LifecycleBundleWithoutDigest {
  return {
    contractVersion: "1.0.0",
    assertionContractVersion: "1.0.0",
    canonicalizationVersion: "ps-c14n-json-1",
    sourceFacts,
    instruments,
    versions: [],
    events: [],
    equivalenceAssertions: [],
    relationshipAssertions: [],
  };
}

function instrumentReference(
  kit: ReturnType<typeof createInstrumentKit>,
): InstrumentReference {
  return {
    entityType: "instrument",
    instrumentId: kit.instrument.instrumentId,
    sourceIdentity: kit.identity,
  };
}

function relationshipFixture(
  relationshipType: RelationshipType,
  evidenceState: "supported" | "unknown" = "supported",
): {
  input: LifecycleBundleWithoutDigest;
  assertion: RelationshipAssertion;
} {
  const left = createInstrumentKit("left");
  const right = createInstrumentKit("right");
  const labelIdentity =
    relationshipType === "withdrawal" || relationshipType === "stay"
      ? right.identity
      : left.identity;
  const label = createFact(labelIdentity, "relationship_label", {
    kind: "text",
    value: `Synthetic ${relationshipType} relation`,
  });
  const subject = instrumentReference(left);
  const affected = instrumentReference(right);
  const endpoints =
    relationshipType === "withdrawal" || relationshipType === "stay"
      ? { affected }
      : { subject, affected };
  const labelInput = referenceEvidence(label);
  const evidence =
    evidenceState === "unknown"
      ? ({
          state: "unknown",
          reason: "not_observed",
          factReferences: [],
        } as const)
      : labelInput;
  const assertion = {
    contractVersion: "1.0.0",
    assertionId: createRelationshipAssertionId(
      relationshipType,
      endpoints,
      evidence.factReferences.map((reference) => reference.factId),
    ),
    assertionClass: "relationship_assertion",
    inputFactIds: labelInput.factReferences.map(
      (reference) => reference.factId,
    ),
    inputFactDigests: labelInput.factReferences.map(
      (reference) => reference.factDigest,
    ),
    ruleId: "reviewed-source-relationship",
    ruleVersion: "1.0.0",
    canonicalizationVersion: "ps-c14n-json-1",
    resultDigest: ZERO_DIGEST,
    evidence,
    validationState: "validated",
    relationshipType,
    ...endpoints,
    relationshipLabelFactId: label.factId,
  } as RelationshipAssertion;
  assertion.resultDigest = computeLifecycleAssertionResultDigest(assertion);
  const input = emptyBundle(
    [...left.facts, ...right.facts, label],
    [left.instrument, right.instrument],
  );
  input.relationshipAssertions = [assertion];
  return { input, assertion };
}

function equivalenceFixture(
  resolution: EquivalenceAssertion["resolution"] = "reviewed_equivalent",
): {
  input: LifecycleBundleWithoutDigest;
  assertion: EquivalenceAssertion;
} {
  const left = createInstrumentKit("left-equivalence", "synthetic-left");
  const right = createInstrumentKit("right-equivalence", "synthetic-right");
  const label = createFact(left.identity, "equivalence_label", {
    kind: "text",
    value: "Synthetic cross-source equivalence review",
  });
  const leftReference = instrumentReference(left);
  const rightReference = instrumentReference(right);
  const evidence =
    resolution === "unknown"
      ? ({
          state: "unknown",
          reason: "not_observed",
          factReferences: [],
        } as const)
      : resolution === "possible_equivalent"
        ? ({
            state: "ambiguous_evidence",
            factReferences: referenceEvidence(label).factReferences,
          } as const)
        : referenceEvidence(label);
  const assertion = {
    contractVersion: "1.0.0",
    assertionId: createEquivalenceAssertionId(
      leftReference,
      rightReference,
      evidence.factReferences.map((reference) => reference.factId),
    ),
    assertionClass: "equivalence_assertion",
    inputFactIds: referenceEvidence(label).factReferences.map(
      (reference) => reference.factId,
    ),
    inputFactDigests: referenceEvidence(label).factReferences.map(
      (reference) => reference.factDigest,
    ),
    ruleId: "reviewed-source-equivalence",
    ruleVersion: "1.0.0",
    canonicalizationVersion: "ps-c14n-json-1",
    resultDigest: ZERO_DIGEST,
    evidence,
    validationState: "validated",
    left: leftReference,
    right: rightReference,
    equivalenceLabelFactId: label.factId,
    resolution,
    automaticCrossSourceMerge: false,
  } as EquivalenceAssertion;
  assertion.resultDigest = computeLifecycleAssertionResultDigest(assertion);
  const input = emptyBundle(
    [...left.facts, ...right.facts, label],
    [left.instrument, right.instrument],
  );
  input.equivalenceAssertions = [assertion];
  return { input, assertion };
}

describe("K0 actor invariant", () => {
  it("accepts an actor only from a same-identity supported actor_label fact", () => {
    expect(() =>
      normalizeLifecycleBundle(createLifecycleFixture().input),
    ).not.toThrow();

    const fixture = createLifecycleFixture();
    const invalid = mutableClone(fixture.input) as unknown as Record<
      string,
      unknown
    >;
    const event = (invalid.events as Record<string, unknown>[])[0]!;
    const actor = event.actor as Record<string, unknown>;
    actor.actorLabelFactId = fixture.facts.event_label!.factId;
    expect(() => normalizeLifecycleBundle(invalid as never)).toThrow(
      /actor_label/,
    );
  });

  it("allows actor omission and rejects substitute issuing-body metadata", () => {
    const fixture = createLifecycleFixture();
    const withoutActor = mutableClone(fixture.input) as unknown as Record<
      string,
      unknown
    >;
    delete (
      (withoutActor.events as Record<string, unknown>[])[0] as Record<
        string,
        unknown
      >
    ).actor;
    expect(() => normalizeLifecycleBundle(withoutActor as never)).not.toThrow();

    const substitute = mutableClone(fixture.input) as unknown as Record<
      string,
      unknown
    >;
    const event = (substitute.events as Record<string, unknown>[])[0]!;
    delete event.actor;
    event.issuingBody = "Not an actor fact";
    expect(() => normalizeLifecycleBundle(substitute as never)).toThrow(
      /unexpected field/,
    );
  });
});

describe("K0 relationship invariants", () => {
  it.each<RelationshipType>([
    "correction",
    "amendment",
    "withdrawal",
    "stay",
    "substitution",
    "supersession",
  ])("validates the closed %s endpoint form", (relationshipType) => {
    const fixture = relationshipFixture(relationshipType);
    expect(
      normalizeLifecycleBundle(fixture.input).relationshipAssertions[0]
        ?.relationshipType,
    ).toBe(relationshipType);
  });

  it("binds the relationship label as exact evidence when evidence is supplied", () => {
    const fixture = relationshipFixture("amendment");
    const invalid = mutableClone(fixture.input);
    const assertion = invalid
      .relationshipAssertions[0] as RelationshipAssertion;
    const label = invalid.sourceFacts.find(
      ({ predicate }) => predicate === "relationship_label",
    )!;
    const unrelated = invalid.sourceFacts.find(
      ({ predicate }) => predicate === "instrument_identifier",
    )!;
    const inputReferences = referenceEvidence(label, unrelated).factReferences;
    const unrelatedEvidence = referenceEvidence(unrelated);
    assertion.inputFactIds = inputReferences.map(({ factId }) => factId);
    assertion.inputFactDigests = inputReferences.map(
      ({ factDigest }) => factDigest,
    );
    assertion.evidence = unrelatedEvidence;
    if (!("subject" in assertion)) {
      throw new TypeError("expected binary relationship");
    }
    assertion.assertionId = createRelationshipAssertionId(
      assertion.relationshipType,
      { subject: assertion.subject, affected: assertion.affected },
      unrelatedEvidence.factReferences.map(({ factId }) => factId),
    );
    assertion.resultDigest = computeLifecycleAssertionResultDigest(assertion);

    expect(() => normalizeLifecycleBundle(invalid)).toThrow(
      /evidence does not cite/,
    );
  });

  it("keeps an unknown relationship label as an exact input without inventing evidence", () => {
    const fixture = relationshipFixture("stay", "unknown");
    const normalized = normalizeLifecycleBundle(fixture.input);
    const relationship = normalized.relationshipAssertions[0]!;
    expect(relationship.evidence).toEqual({
      state: "unknown",
      reason: "not_observed",
      factReferences: [],
    });
    expect(relationship.inputFactIds).toContain(
      relationship.relationshipLabelFactId,
    );

    const invalid = mutableClone(fixture.input);
    const missingInput = invalid
      .relationshipAssertions[0] as RelationshipAssertion;
    missingInput.inputFactIds = [];
    missingInput.inputFactDigests = [];
    missingInput.resultDigest =
      computeLifecycleAssertionResultDigest(missingInput);
    expect(() => normalizeLifecycleBundle(invalid)).toThrow(
      /derived inputs do not cite/,
    );
  });

  it("rejects a binary self-edge and a subject on a unary relationship", () => {
    const binary = relationshipFixture("amendment");
    const selfEdge = mutableClone(binary.input) as unknown as Record<
      string,
      unknown
    >;
    const assertion = (
      selfEdge.relationshipAssertions as Record<string, unknown>[]
    )[0]!;
    assertion.affected = assertion.subject;
    expect(() => normalizeLifecycleBundle(selfEdge as never)).toThrow(
      /endpoints must differ/,
    );

    const unary = relationshipFixture("stay");
    const inventedSubject = mutableClone(unary.input) as unknown as Record<
      string,
      unknown
    >;
    const unaryAssertion = (
      inventedSubject.relationshipAssertions as Record<string, unknown>[]
    )[0]!;
    unaryAssertion.subject = unaryAssertion.affected;
    expect(() => normalizeLifecycleBundle(inventedSubject as never)).toThrow(
      /unexpected field/,
    );
  });

  it("keeps directional relationship endpoint order in the stable ID", () => {
    const fixture = relationshipFixture("correction");
    if (!("subject" in fixture.assertion)) {
      throw new TypeError("expected binary assertion");
    }
    const forward = fixture.assertion.assertionId;
    const reverse = createRelationshipAssertionId(
      "correction",
      {
        subject: fixture.assertion.affected,
        affected: fixture.assertion.subject,
      },
      fixture.assertion.evidence.factReferences.map(
        (reference) => reference.factId,
      ),
    );
    expect(reverse).not.toBe(forward);
  });
});

describe("K0 equivalence invariants", () => {
  it.each([
    "reviewed_equivalent",
    "reviewed_not_equivalent",
    "possible_equivalent",
    "unknown",
  ] as const)(
    "accepts only the frozen evidence pairing for %s",
    (resolution) => {
      const fixture = equivalenceFixture(resolution);
      expect(
        normalizeLifecycleBundle(fixture.input).equivalenceAssertions[0]
          ?.resolution,
      ).toBe(resolution);
    },
  );

  it("keeps cross-source identities distinct and rejects automatic merge", () => {
    const fixture = equivalenceFixture("unknown");
    const normalized = normalizeLifecycleBundle(fixture.input);
    expect(
      normalized.equivalenceAssertions[0]?.left.sourceIdentity,
    ).not.toEqual(normalized.equivalenceAssertions[0]?.right.sourceIdentity);
    expect(normalized.equivalenceAssertions[0]?.automaticCrossSourceMerge).toBe(
      false,
    );

    const merge = mutableClone(fixture.input) as unknown as Record<
      string,
      unknown
    >;
    const assertion = (
      merge.equivalenceAssertions as Record<string, unknown>[]
    )[0]!;
    assertion.automaticCrossSourceMerge = true;
    expect(() => normalizeLifecycleBundle(merge as never)).toThrow(
      /expected false/,
    );
  });

  it("makes equivalence identity independent of endpoint input order", () => {
    const fixture = equivalenceFixture();
    expect(
      createEquivalenceAssertionId(
        fixture.assertion.right,
        fixture.assertion.left,
        fixture.assertion.evidence.factReferences.map(
          (reference) => reference.factId,
        ),
      ),
    ).toBe(fixture.assertion.assertionId);
  });
});
