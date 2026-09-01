import {
  normalizeLifecycleBundle,
  validateLifecycleBundle,
  verifyLifecycleBundleDigest,
} from "../../../src/kernel/lifecycle";
import { describe, expect, it } from "vitest";
import {
  createFact,
  createLifecycleFixture,
  mutableClone,
  referenceEvidence,
} from "./fixtures";

describe("K0 lifecycle bundle replay", () => {
  it("sorts lifecycle collections, replays one digest, freezes output, and does not mutate input", () => {
    const fixture = createLifecycleFixture();
    const before = JSON.stringify(fixture.input);
    const normalized = normalizeLifecycleBundle(fixture.input);

    expect(JSON.stringify(fixture.input)).toBe(before);
    expect(normalized.sourceFacts.map((fact) => fact.factId)).toEqual(
      [...normalized.sourceFacts.map((fact) => fact.factId)].sort(),
    );
    expect(Object.isFrozen(normalized)).toBe(true);
    expect(Object.isFrozen(normalized.events[0]?.sourceStatus)).toBe(true);
    expect(validateLifecycleBundle(normalized)).toEqual(normalized);
    expect(verifyLifecycleBundleDigest(normalized)).toBe(true);
  });

  it("produces the same canonical digest when lifecycle collection input order changes", () => {
    const fixture = createLifecycleFixture();
    const first = normalizeLifecycleBundle(fixture.input);
    const reordered = {
      ...mutableClone(fixture.input),
      sourceFacts: [...fixture.input.sourceFacts].reverse(),
    };

    expect(normalizeLifecycleBundle(reordered).bundleDigest).toBe(
      first.bundleDigest,
    );
  });

  it("rejects source-fact and bundle-digest tampering", () => {
    const normalized = normalizeLifecycleBundle(createLifecycleFixture().input);
    const factTamper = mutableClone(normalized);
    const titleFact = factTamper.sourceFacts.find(
      (fact) => fact.predicate === "instrument_title",
    );
    if (titleFact?.value.kind !== "text") {
      throw new TypeError("expected title fact");
    }
    titleFact.value.value = "Tampered title";

    expect(() => validateLifecycleBundle(factTamper)).toThrow(/factDigest/);

    const digestTamper = mutableClone(normalized) as { bundleDigest: string };
    digestTamper.bundleDigest = "0".repeat(64);
    expect(verifyLifecycleBundleDigest(digestTamper)).toBe(false);
    expect(() => validateLifecycleBundle(digestTamper)).toThrow(/bundleDigest/);
  });

  it("preserves incomplete and conflicting dates without inventing a value", () => {
    const fixture = createLifecycleFixture();
    const conflict = createFact(
      fixture.instrument.sourceIdentity,
      "valid_time",
      { kind: "date", value: "2026-09-01" },
      "conflicting-valid-time",
    );
    const input = mutableClone(fixture.input);
    input.sourceFacts = [...input.sourceFacts, conflict];
    input.events[0]!.validTime = {
      evidence: {
        state: "conflicting_evidence",
        factReferences: referenceEvidence(fixture.facts.valid_time!, conflict)
          .factReferences,
      },
    };

    const normalized = normalizeLifecycleBundle(input);
    expect(normalized.events[0]?.observedTime).toEqual({
      evidence: {
        state: "unknown",
        reason: "not_supplied",
        factReferences: [],
      },
    });
    expect(normalized.events[0]?.validTime.evidence.state).toBe(
      "conflicting_evidence",
    );
    expect(normalized.events[0]?.validTime).not.toHaveProperty("value");
  });

  it.each(["currentStatus", "nationId", "legalEffect", "rights", "impact"])(
    "rejects the closed overclaim field %s",
    (field) => {
      const normalized = normalizeLifecycleBundle(
        createLifecycleFixture().input,
      );
      const overclaim = mutableClone(normalized) as unknown as Record<
        string,
        unknown
      >;
      const events = overclaim.events as Record<string, unknown>[];
      events[0]![field] = "synthetic-overclaim";
      expect(() => validateLifecycleBundle(overclaim)).toThrow(
        /unexpected field/,
      );
    },
  );
});
