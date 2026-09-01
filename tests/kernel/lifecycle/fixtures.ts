import {
  canonicalizeJson,
  createEventId,
  createInstrumentId,
  createSourceFact,
  createVersionId,
  sha256Hex,
  type EvidenceState,
  type SourceFact,
  type SourceFactPredicate,
  type SourceFactValue,
  type SourceQualifiedIdentity,
  type SupportedEvidence,
  type TemporalAssertion,
} from "../../../src/kernel/assertions";
import {
  LIFECYCLE_CONTRACT_VERSION,
  type InstrumentVersion,
  type LifecycleBundleWithoutDigest,
  type LifecycleEvent,
  type PolicyInstrument,
} from "../../../src/kernel/lifecycle";

export const UNKNOWN_TIME: TemporalAssertion = {
  evidence: {
    state: "unknown",
    reason: "not_supplied",
    factReferences: [],
  },
};

export function referenceEvidence(
  ...facts: readonly SourceFact[]
): SupportedEvidence {
  return {
    state: "supported",
    factReferences: facts
      .map((fact) => ({ factId: fact.factId, factDigest: fact.factDigest }))
      .sort((left, right) =>
        left.factId < right.factId ? -1 : left.factId > right.factId ? 1 : 0,
      ),
  };
}

export function createFact(
  sourceIdentity: SourceQualifiedIdentity,
  predicate: SourceFactPredicate,
  value: SourceFactValue,
  pathSuffix: string = predicate,
): SourceFact {
  const sourcePath = `/synthetic/${sourceIdentity.sourceRecordId}/${pathSuffix}`;
  const sourceContentDigest = sha256Hex(
    `${sourceIdentity.sourceId}\u0000${sourceIdentity.sourceRecordId}\u0000${sourcePath}\u0000${predicate}\u0000${canonicalizeJson(value)}`,
  );
  return createSourceFact({
    sourceIdentity,
    predicate,
    value,
    provenance: {
      sourceIdentity,
      sourceUrl: `https://example.invalid/synthetic/${encodeURIComponent(sourceIdentity.sourceRecordId)}`,
      sourcePath,
      retrievedAt: "2026-09-01T12:00:00Z",
      sourceUpdatedAt: null,
      adapterId: "synthetic-k0",
      adapterVersion: "1.0.0",
      sourceContentDigest,
      validationState: "validated",
    },
  }) as SourceFact;
}

export interface InstrumentKit {
  identity: SourceQualifiedIdentity;
  facts: readonly SourceFact[];
  instrument: PolicyInstrument;
}

export function createInstrumentKit(
  sourceRecordId: string,
  sourceId = "synthetic-k0",
): InstrumentKit {
  const identity = { sourceId, sourceRecordId };
  const identifier = createFact(identity, "instrument_identifier", {
    kind: "identifier",
    value: `instrument-${sourceRecordId}`,
  });
  const title = createFact(identity, "instrument_title", {
    kind: "text",
    value: `Synthetic instrument ${sourceRecordId}`,
  });
  return {
    identity,
    facts: [identifier, title],
    instrument: {
      contractVersion: LIFECYCLE_CONTRACT_VERSION,
      instrumentId: createInstrumentId(identity),
      sourceIdentity: identity,
      sourceIdentifierFactId: identifier.factId,
      titleFactId: title.factId,
      identityRule: {
        ruleId: "source-qualified-instrument-identity",
        ruleVersion: "1.0.0",
      },
      evidence: referenceEvidence(identifier, title),
      automaticCrossSourceMerge: false,
    },
  };
}

export interface LifecycleFixture {
  input: LifecycleBundleWithoutDigest;
  facts: Record<string, SourceFact>;
  instrument: PolicyInstrument;
  version: InstrumentVersion;
  event: LifecycleEvent;
}

export function createLifecycleFixture(): LifecycleFixture {
  const kit = createInstrumentKit("record-1");
  const renditionIdentifierValue = "rendition-1";
  const renditionDigestValue = "a".repeat(64);
  const eventIdentifierValue = "event-1";
  const validTimeValue = { kind: "date", value: "2026-08-31" } as const;
  const statusAsOfValue = {
    kind: "date_time",
    value: "2026-08-31T10:30:00-07:00",
  } as const;
  const renditionIdentifier = createFact(kit.identity, "rendition_identifier", {
    kind: "identifier",
    value: renditionIdentifierValue,
  });
  const renditionDigest = createFact(kit.identity, "rendition_digest", {
    kind: "sha256_digest",
    value: renditionDigestValue,
  });
  const eventIdentifier = createFact(kit.identity, "event_identifier", {
    kind: "identifier",
    value: eventIdentifierValue,
  });
  const eventLabel = createFact(kit.identity, "event_label", {
    kind: "text",
    value: "Status recorded",
  });
  const validTime = createFact(kit.identity, "valid_time", validTimeValue);
  const actorLabel = createFact(kit.identity, "actor_label", {
    kind: "text",
    value: "Source-supplied synthetic actor",
  });
  const statusLabel = createFact(kit.identity, "source_status_label", {
    kind: "text",
    value: "Source supplied status",
  });
  const statusAsOf = createFact(kit.identity, "status_as_of", statusAsOfValue);
  const version: InstrumentVersion = {
    contractVersion: LIFECYCLE_CONTRACT_VERSION,
    versionId: createVersionId(
      kit.identity,
      renditionIdentifierValue,
      renditionDigestValue,
    ),
    instrumentId: kit.instrument.instrumentId,
    sourceIdentity: kit.identity,
    renditionIdentifierFactId: renditionIdentifier.factId,
    renditionDigestFactId: renditionDigest.factId,
    reproductionBasis: "metadata_and_links",
    observedTime: UNKNOWN_TIME,
    publishedTime: UNKNOWN_TIME,
    effectiveTime: UNKNOWN_TIME,
    validTime: UNKNOWN_TIME,
    evidence: referenceEvidence(renditionIdentifier, renditionDigest),
  };
  const supportedValidTime: TemporalAssertion = {
    evidence: referenceEvidence(validTime),
    value: validTimeValue,
  };
  const event: LifecycleEvent = {
    contractVersion: LIFECYCLE_CONTRACT_VERSION,
    eventId: createEventId(kit.identity, eventIdentifierValue),
    instrumentId: kit.instrument.instrumentId,
    versionId: version.versionId,
    sourceIdentity: kit.identity,
    eventIdentifierFactId: eventIdentifier.factId,
    eventType: "status_observation",
    eventLabelFactId: eventLabel.factId,
    evidence: referenceEvidence(eventIdentifier, eventLabel),
    observedTime: UNKNOWN_TIME,
    publishedTime: UNKNOWN_TIME,
    effectiveTime: UNKNOWN_TIME,
    validTime: supportedValidTime,
    actor: {
      actorLabelFactId: actorLabel.factId,
      evidence: referenceEvidence(actorLabel),
    },
    sourceStatus: {
      statusLabelFactId: statusLabel.factId,
      statusAsOf: {
        evidence: referenceEvidence(statusAsOf),
        value: statusAsOfValue,
      },
      evidence: referenceEvidence(statusLabel, statusAsOf),
    },
  };
  const allFacts = [
    ...kit.facts,
    renditionIdentifier,
    renditionDigest,
    eventIdentifier,
    eventLabel,
    validTime,
    actorLabel,
    statusLabel,
    statusAsOf,
  ];
  return {
    input: {
      contractVersion: LIFECYCLE_CONTRACT_VERSION,
      assertionContractVersion: "1.0.0",
      canonicalizationVersion: "ps-c14n-json-1",
      sourceFacts: [...allFacts].reverse(),
      instruments: [kit.instrument],
      versions: [version],
      events: [event],
      equivalenceAssertions: [],
      relationshipAssertions: [],
    },
    facts: Object.fromEntries(allFacts.map((fact) => [fact.predicate, fact])),
    instrument: kit.instrument,
    version,
    event,
  };
}

export function mutableClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function evidenceForState(
  state: EvidenceState["state"],
  fact?: SourceFact,
): EvidenceState {
  if (state === "unknown") {
    return { state, reason: "not_observed", factReferences: [] };
  }
  if (fact === undefined) {
    throw new TypeError("non-unknown evidence requires a fact");
  }
  if (state === "conflicting_evidence") {
    throw new TypeError(
      "fixture helper requires two facts for conflicting evidence",
    );
  }
  return { state, factReferences: referenceEvidence(fact).factReferences };
}
