import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it, vi } from "vitest";

import sourceRegistryJson from "../../../config/sources.v1.json";
import taxonomyJson from "../../../config/taxonomy.v1.json";
import baseRecordJson from "../../../fixtures/records/general-jurisdiction.valid.json";
import recordSchema from "../../../schemas/record.schema.v1.json";
import {
  canonicalJsonDigest,
  canonicalizeJson,
  createEventId,
  createInstrumentId,
  createSourceFact,
  sha256Hex,
  type EvidenceState,
  type SourceFact,
  type SourceFactPredicate,
  type SourceFactValue,
  type SourceQualifiedIdentity,
  type SupportedEvidence,
  type SupportedTemporalAssertion,
  type TemporalAssertion,
  type TemporalPoint,
} from "../../../src/kernel/assertions";
import {
  POLICY_RECORD_14_PROJECTION_VERSION,
  computeLifecycleAssertionResultDigest,
  createRelationshipAssertionId,
  normalizeLifecycleBundle,
  projectLifecycleToPolicyRecord14,
  validatePolicyRecord14Compatibility,
  type InstrumentReference,
  type LifecycleBundle,
  type LifecycleBundleWithoutDigest,
  type LifecycleEvent,
  type PolicyRecord14ProjectionInput,
  type PolicyRecord14ValidationContext,
  type PolicyRecord14ProjectionPolicy,
  type RelationshipAssertion,
} from "../../../src/kernel/lifecycle";
import {
  sourceDerivedLeafPointers,
  validateRecordPolicy,
  validateRecordSetPolicy,
} from "../../../src/pipeline/policy-validation.mjs";
import type {
  PolicyRecord,
  SourceConfig,
  SourceRegistry,
  TaxonomyConfig,
} from "../../../src/shared/contracts";
import {
  createFact as createFixtureFact,
  createInstrumentKit,
  createLifecycleFixture,
  referenceEvidence,
} from "./fixtures";

const identity: SourceQualifiedIdentity = {
  sourceId: "synthetic-federal",
  sourceRecordId: "SYN-001",
};
const sourceUrl = "https://official.example.invalid/records/SYN-001";
const unknownTime: TemporalAssertion = {
  evidence: {
    state: "unknown",
    reason: "not_supplied",
    factReferences: [],
  },
};

function supported(...facts: readonly SourceFact[]): SupportedEvidence {
  return {
    state: "supported",
    factReferences: facts
      .map(({ factId, factDigest }) => ({ factId, factDigest }))
      .sort((left, right) =>
        left.factId < right.factId ? -1 : left.factId > right.factId ? 1 : 0,
      ),
  };
}

function makeFact(
  predicate: SourceFactPredicate,
  value: SourceFactValue,
  sourcePath: string,
): SourceFact {
  const sourceContentDigest = sha256Hex(
    canonicalizeJson({ predicate, sourcePath, value }),
  );
  return createSourceFact({
    sourceIdentity: identity,
    predicate,
    value,
    provenance: {
      sourceIdentity: identity,
      sourceUrl,
      sourcePath,
      retrievedAt: "2026-07-30T12:00:00Z",
      sourceUpdatedAt: "2026-07-29T12:00:00Z",
      adapterId: "synthetic-adapter",
      adapterVersion: "1.0.0",
      sourceContentDigest,
      validationState: "validated",
    },
  }) as SourceFact;
}

function supportedTemporal(fact: SourceFact): SupportedTemporalAssertion {
  if (
    fact.value.kind !== "date" &&
    fact.value.kind !== "date_time" &&
    fact.value.kind !== "interval"
  ) {
    throw new TypeError("expected a temporal source fact");
  }
  return { evidence: supported(fact), value: fact.value };
}

function supportedPointTemporal(fact: SourceFact): {
  evidence: SupportedEvidence;
  value: TemporalPoint;
} {
  if (fact.value.kind !== "date" && fact.value.kind !== "date_time") {
    throw new TypeError("expected a point temporal source fact");
  }
  return { evidence: supported(fact), value: fact.value };
}

function statusEvidence(
  state: EvidenceState["state"],
  label: SourceFact,
  asOf: SourceFact,
): EvidenceState {
  if (state === "unknown") {
    return { state, reason: "not_observed", factReferences: [] };
  }
  if (state === "conflicting_evidence") {
    return {
      state,
      factReferences: supported(label, asOf).factReferences,
    };
  }
  return {
    state,
    factReferences: supported(label, asOf).factReferences,
  } as EvidenceState;
}

interface ProjectionFixtureOptions {
  sourceStatusEvidence?: EvidenceState["state"];
  secondConcurrentStatus?: boolean;
}

function buildProjectionBundle(
  options: ProjectionFixtureOptions = {},
): LifecycleBundle {
  const facts: SourceFact[] = [];
  const addFact = (
    predicate: SourceFactPredicate,
    value: SourceFactValue,
    sourcePath: string,
  ) => {
    const fact = makeFact(predicate, value, sourcePath);
    facts.push(fact);
    return fact;
  };
  const identifier = addFact(
    "instrument_identifier",
    { kind: "identifier", value: "SYN-001" },
    "$.identifier",
  );
  const title = addFact(
    "instrument_title",
    { kind: "text", value: "Synthetic public notice for contract validation" },
    "$.title",
  );
  const instrumentId = createInstrumentId(identity);
  const events: LifecycleEvent[] = [];

  const makeEvent = ({
    key,
    label,
    eventType,
    validDate,
    publishedDate,
    effectiveDate,
    sourceStatusLabel,
    sourceStatusState = "supported",
  }: {
    key: string;
    label: string;
    eventType: LifecycleEvent["eventType"];
    validDate: string;
    publishedDate?: string;
    effectiveDate?: string;
    sourceStatusLabel?: string;
    sourceStatusState?: EvidenceState["state"];
  }) => {
    const eventIdentifier = addFact(
      "event_identifier",
      { kind: "identifier", value: key },
      `$.events.${key}.id`,
    );
    const eventLabel = addFact(
      "event_label",
      { kind: "text", value: label },
      `$.events.${key}.label`,
    );
    const validTimeFact = addFact(
      "valid_time",
      { kind: "date", value: validDate },
      `$.events.${key}.valid`,
    );
    const validTime = supportedTemporal(validTimeFact);
    const publishedTime = publishedDate
      ? (() => {
          const fact = addFact(
            "published_time",
            { kind: "date", value: publishedDate },
            `$.events.${key}.published`,
          );
          return supportedTemporal(fact);
        })()
      : unknownTime;
    const effectiveTime = effectiveDate
      ? (() => {
          const fact = addFact(
            "effective_time",
            { kind: "date", value: effectiveDate },
            `$.events.${key}.effective`,
          );
          return supportedTemporal(fact);
        })()
      : unknownTime;

    let sourceStatus: LifecycleEvent["sourceStatus"];
    if (sourceStatusLabel !== undefined) {
      const labelFact = addFact(
        "source_status_label",
        { kind: "text", value: sourceStatusLabel },
        `$.events.${key}.status.label`,
      );
      const asOfFact = addFact(
        "status_as_of",
        { kind: "date", value: validDate },
        `$.events.${key}.status.asOf`,
      );
      sourceStatus = {
        statusLabelFactId: labelFact.factId,
        statusAsOf: supportedPointTemporal(asOfFact),
        evidence: statusEvidence(sourceStatusState, labelFact, asOfFact),
      };
    }

    events.push({
      contractVersion: "1.0.0",
      eventId: createEventId(identity, key),
      instrumentId,
      sourceIdentity: identity,
      eventIdentifierFactId: eventIdentifier.factId,
      eventType,
      eventLabelFactId: eventLabel.factId,
      evidence: supported(eventIdentifier, eventLabel),
      observedTime: unknownTime,
      publishedTime,
      effectiveTime,
      validTime,
      ...(sourceStatus === undefined ? {} : { sourceStatus }),
    });
  };

  makeEvent({
    key: "introduced",
    label: "Introduced",
    eventType: "introduction",
    validDate: "2026-07-01",
  });
  makeEvent({
    key: "published",
    label: "Published",
    eventType: "publication",
    validDate: "2026-07-10",
    publishedDate: "2026-07-10",
  });
  makeEvent({
    key: "effective",
    label: "Effective date supplied",
    eventType: "effective_date",
    validDate: "2026-07-20",
    effectiveDate: "2026-07-20",
  });
  makeEvent({
    key: "status-open",
    label: "Status observed",
    eventType: "status_observation",
    validDate: "2026-07-29",
    sourceStatusLabel: "Open",
    sourceStatusState: options.sourceStatusEvidence,
  });
  if (options.secondConcurrentStatus) {
    makeEvent({
      key: "status-closed",
      label: "Conflicting concurrent status observed",
      eventType: "status_observation",
      validDate: "2026-07-29",
      sourceStatusLabel: "Closed",
    });
  }

  const input: LifecycleBundleWithoutDigest = {
    contractVersion: "1.0.0",
    assertionContractVersion: "1.0.0",
    canonicalizationVersion: "ps-c14n-json-1",
    sourceFacts: facts.reverse(),
    instruments: [
      {
        contractVersion: "1.0.0",
        instrumentId,
        sourceIdentity: identity,
        sourceIdentifierFactId: identifier.factId,
        titleFactId: title.factId,
        identityRule: {
          ruleId: "source-qualified-instrument-identity",
          ruleVersion: "1.0.0",
        },
        evidence: supported(identifier, title),
        automaticCrossSourceMerge: false,
      },
    ],
    versions: [],
    events: events.reverse(),
    equivalenceAssertions: [],
    relationshipAssertions: [],
  };
  return normalizeLifecycleBundle(input) as LifecycleBundle;
}

function mutateNormalizedBundle(
  bundle: LifecycleBundle,
  mutate: (value: LifecycleBundleWithoutDigest) => void,
): LifecycleBundle {
  const mutable = structuredClone(bundle) as LifecycleBundleWithoutDigest & {
    bundleDigest?: string;
  };
  delete mutable.bundleDigest;
  mutate(mutable);
  return normalizeLifecycleBundle(mutable) as LifecycleBundle;
}

function rawBundleDigest(value: LifecycleBundle): string {
  const withoutDigest = structuredClone(value) as unknown as Record<
    string,
    unknown
  >;
  delete withoutDigest.bundleDigest;
  return canonicalJsonDigest(withoutDigest);
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

function addUnrelatedRelationship(
  bundle: LifecycleBundle,
  options: { crossSource?: boolean; unknown?: boolean } = {},
): LifecycleBundle {
  const left = createInstrumentKit("unrelated-left", "synthetic-federal");
  const right = createInstrumentKit(
    "unrelated-right",
    options.crossSource ? "synthetic-other" : "synthetic-federal",
  );
  const label = createFixtureFact(left.identity, "relationship_label", {
    kind: "text",
    value: "Synthetic unrelated amendment",
  });
  const subject = instrumentReference(left);
  const affected = instrumentReference(right);
  const labelInput = referenceEvidence(label);
  const evidence = options.unknown
    ? ({
        state: "unknown",
        reason: "not_observed",
        factReferences: [],
      } as const)
    : labelInput;
  const relationship = {
    contractVersion: "1.0.0",
    assertionId: createRelationshipAssertionId(
      "amendment",
      { subject, affected },
      evidence.factReferences.map(({ factId }) => factId),
    ),
    assertionClass: "relationship_assertion",
    inputFactIds: labelInput.factReferences.map(({ factId }) => factId),
    inputFactDigests: labelInput.factReferences.map(
      ({ factDigest }) => factDigest,
    ),
    ruleId: "reviewed-source-relationship",
    ruleVersion: "1.0.0",
    canonicalizationVersion: "ps-c14n-json-1",
    resultDigest: "0".repeat(64),
    evidence,
    validationState: "validated",
    relationshipType: "amendment",
    subject,
    affected,
    relationshipLabelFactId: label.factId,
  } as RelationshipAssertion;
  relationship.resultDigest =
    computeLifecycleAssertionResultDigest(relationship);

  return mutateNormalizedBundle(bundle, (mutable) => {
    mutable.sourceFacts = [
      ...mutable.sourceFacts,
      ...left.facts,
      ...right.facts,
      label,
    ];
    mutable.instruments = [
      ...mutable.instruments,
      left.instrument,
      right.instrument,
    ];
    mutable.relationshipAssertions = [
      ...mutable.relationshipAssertions,
      relationship,
    ];
  });
}

function addUnrelatedLifecycleEvent(bundle: LifecycleBundle): LifecycleBundle {
  const fixture = createLifecycleFixture();
  return mutateNormalizedBundle(bundle, (mutable) => {
    mutable.sourceFacts = [
      ...mutable.sourceFacts,
      ...fixture.input.sourceFacts,
    ];
    mutable.instruments = [
      ...mutable.instruments,
      ...fixture.input.instruments,
    ];
    mutable.versions = [...mutable.versions, ...fixture.input.versions];
    mutable.events = [...mutable.events, ...fixture.input.events];
  });
}

function statusOnlyWithoutSupportedAction(
  bundle: LifecycleBundle,
): LifecycleBundle {
  return mutateNormalizedBundle(bundle, (mutable) => {
    mutable.events = mutable.events.filter(
      ({ eventType }) => eventType === "status_observation",
    );
    const statusEvent = mutable.events[0]!;
    statusEvent.evidence = {
      state: "unknown",
      reason: "not_observed",
      factReferences: [],
    };
  });
}

function unknownIntroductionTime(bundle: LifecycleBundle): LifecycleBundle {
  return mutateNormalizedBundle(bundle, (mutable) => {
    const introduction = mutable.events.find(
      ({ eventType }) => eventType === "introduction",
    )!;
    introduction.validTime = {
      evidence: {
        state: "unknown",
        reason: "not_observed",
        factReferences: [],
      },
    };
  });
}

function addSameDateActorVariant(bundle: LifecycleBundle): {
  bundle: LifecycleBundle;
  dateFactIds: readonly [string, string];
} {
  const original = bundle.events.find(
    ({ eventType }) => eventType === "introduction",
  )!;
  const originalDateFactId =
    original.validTime.evidence.factReferences[0]!.factId;
  const eventIdentifier = makeFact(
    "event_identifier",
    { kind: "identifier", value: "introduced-actor-variant" },
    "$.events.introducedActorVariant.id",
  );
  const dateFact = makeFact(
    "valid_time",
    { kind: "date", value: "2026-07-01" },
    "$.events.introducedActorVariant.valid",
  );
  const actorFact = makeFact(
    "actor_label",
    { kind: "text", value: "Synthetic alternate actor" },
    "$.events.introducedActorVariant.actor",
  );
  const labelFact = bundle.sourceFacts.find(
    ({ factId }) => factId === original.eventLabelFactId,
  )!;
  const variant: LifecycleEvent = {
    ...structuredClone(original),
    eventId: createEventId(identity, "introduced-actor-variant"),
    eventIdentifierFactId: eventIdentifier.factId,
    evidence: supported(eventIdentifier, labelFact),
    validTime: supportedTemporal(dateFact),
    actor: {
      actorLabelFactId: actorFact.factId,
      evidence: supported(actorFact),
    },
  };
  return {
    bundle: mutateNormalizedBundle(bundle, (mutable) => {
      mutable.sourceFacts = [
        ...mutable.sourceFacts,
        eventIdentifier,
        dateFact,
        actorFact,
      ];
      mutable.events = [...mutable.events, variant];
    }),
    dateFactIds: [originalDateFactId, dateFact.factId],
  };
}

function addSameTupleDifferentLabelFact(
  bundle: LifecycleBundle,
): LifecycleBundle {
  const original = bundle.events.find(
    ({ eventType }) => eventType === "introduction",
  )!;
  const originalIdentifier = bundle.sourceFacts.find(
    ({ factId }) => factId === original.eventIdentifierFactId,
  )!;
  const originalLabel = bundle.sourceFacts.find(
    ({ factId }) => factId === original.eventLabelFactId,
  )!;
  const eventIdentifier = makeFact(
    "event_identifier",
    { kind: "identifier", value: "introduced-label-variant" },
    "$.events.introducedLabelVariant.id",
  );
  const eventLabel = makeFact(
    "event_label",
    { kind: "text", value: "Introduced" },
    "$.events.introducedLabelVariant.label",
  );
  const sharedEvidence = supported(
    originalIdentifier,
    originalLabel,
    eventIdentifier,
    eventLabel,
  );
  const variant: LifecycleEvent = {
    ...structuredClone(original),
    eventId: createEventId(identity, "introduced-label-variant"),
    eventIdentifierFactId: eventIdentifier.factId,
    eventLabelFactId: eventLabel.factId,
    evidence: sharedEvidence,
  };
  return mutateNormalizedBundle(bundle, (mutable) => {
    mutable.sourceFacts = [...mutable.sourceFacts, eventIdentifier, eventLabel];
    mutable.events.find(
      ({ eventId }) => eventId === original.eventId,
    )!.evidence = sharedEvidence;
    mutable.events = [...mutable.events, variant];
  });
}

function replaceEventTemporalDimension(
  bundle: LifecycleBundle,
  eventType: LifecycleEvent["eventType"],
  dimension: "publishedTime" | "effectiveTime",
  predicate: "published_time" | "effective_time",
  value: SourceFactValue,
): { bundle: LifecycleBundle; fact: SourceFact } {
  const fact = makeFact(predicate, value, `$.events.audit.${dimension}`);
  return {
    fact,
    bundle: mutateNormalizedBundle(bundle, (mutable) => {
      mutable.sourceFacts = [...mutable.sourceFacts, fact];
      const event = mutable.events.find(
        (candidate) => candidate.eventType === eventType,
      )!;
      if (
        fact.value.kind !== "date" &&
        fact.value.kind !== "date_time" &&
        fact.value.kind !== "interval"
      ) {
        throw new TypeError("expected temporal fact");
      }
      event[dimension] = {
        evidence: supported(fact),
        value: fact.value,
      };
    }),
  };
}

function completeBaseRecord(): PolicyRecord {
  const record = structuredClone(baseRecordJson) as PolicyRecord;
  const existing = new Set(record.fieldProvenance.map(({ field }) => field));
  for (const field of sourceDerivedLeafPointers(record)) {
    if (existing.has(field)) {
      continue;
    }
    record.fieldProvenance.push({
      field,
      sourcePath: `$fixture${field}`,
      sourceId: record.source.id,
      sourceRecordId: record.source.recordId,
      sourceUrl: record.urls.officialSource,
      retrievedAt: record.dates.retrieved,
      sourceUpdatedAt: record.dates.updated,
      adapterId: record.source.adapterId,
      transformation: "copied",
      transformRuleId: null,
      validationState: "validated",
    });
  }
  record.fieldProvenance.sort((left, right) =>
    left.field < right.field ? -1 : left.field > right.field ? 1 : 0,
  );
  return record;
}

const sourceRegistry = sourceRegistryJson as unknown as SourceRegistry;
const taxonomy = taxonomyJson as unknown as TaxonomyConfig;
const sourceConfig = sourceRegistry.sources.find(
  ({ id }) => id === "synthetic-federal",
) as SourceConfig;
const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
addFormats(ajv);
const validateRecordSchema = ajv.compile(recordSchema);
const validationContext: PolicyRecord14ValidationContext = {
  sourceRegistry,
  taxonomy,
  nationCollection: null,
};

function validateTargetRecord(record: PolicyRecord): void {
  if (!validateRecordSchema(record)) {
    throw new TypeError(ajv.errorsText(validateRecordSchema.errors));
  }
  validateRecordPolicy(record, { sourceConfig, taxonomy });
  validateRecordSetPolicy([record], { sourceRegistry, taxonomy });
}

function policy(
  statusMappings: PolicyRecord14ProjectionPolicy["statusMappings"] = [
    { sourceLabel: "Closed", normalizedStatus: "closed" },
    { sourceLabel: "Open", normalizedStatus: "active" },
  ],
): PolicyRecord14ProjectionPolicy {
  return {
    projectionVersion: POLICY_RECORD_14_PROJECTION_VERSION,
    validationContextDigest: canonicalJsonDigest(validationContext),
    sourceId: "synthetic-federal",
    ruleId: "synthetic-status-mapping",
    ruleVersion: "1.0.0",
    statusMappings,
  };
}

function project(bundle: LifecycleBundle, projectionPolicy = policy()) {
  return projectLifecycleToPolicyRecord14({
    bundle,
    instrumentId: createInstrumentId(identity),
    baseRecord: completeBaseRecord(),
    policy: projectionPolicy,
    validationContext,
  });
}

function valueAtPointer(value: unknown, pointer: string): unknown {
  if (pointer === "") {
    return value;
  }
  return pointer
    .split("/")
    .slice(1)
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce<unknown>((current, segment) => {
      if (current === null || typeof current !== "object") {
        return undefined;
      }
      return (current as Record<string, unknown>)[segment];
    }, value);
}

function provenanceAtPointer(record: PolicyRecord, pointer: string) {
  return record.fieldProvenance
    .filter(({ field }) => field === pointer || field.startsWith(`${pointer}/`))
    .sort((left, right) => {
      const leftCanonical = canonicalizeJson(left);
      const rightCanonical = canonicalizeJson(right);
      return leftCanonical < rightCanonical
        ? -1
        : leftCanonical > rightCanonical
          ? 1
          : 0;
    });
}

function expectCompleteProjectionAccounting(
  bundle: LifecycleBundle,
  result: ReturnType<typeof projectLifecycleToPolicyRecord14>,
  baseRecord: PolicyRecord = completeBaseRecord(),
): void {
  expect(result.outcome).toBe("projected");
  if (result.outcome !== "projected") {
    throw new TypeError(result.reasonCodes.join(","));
  }
  const receiptInputFactIds = new Set(
    result.replacementReceipts.flatMap(({ inputFactIds }) => inputFactIds),
  );
  const factLossIds = new Set(
    result.losses
      .filter(({ lossCode }) => lossCode === "source_fact_not_projected")
      .map(({ assertionId }) => assertionId),
  );
  expect(
    [...receiptInputFactIds].filter((factId) => factLossIds.has(factId)),
  ).toEqual([]);
  expect([...new Set([...receiptInputFactIds, ...factLossIds])].sort()).toEqual(
    bundle.sourceFacts.map(({ factId }) => factId).sort(),
  );

  const accountedAssertionIds = new Set([
    ...result.replacementReceipts.flatMap(({ assertionReferences }) =>
      assertionReferences.map(({ assertionId }) => assertionId),
    ),
    ...result.losses.map(({ assertionId }) => assertionId),
  ]);
  for (const assertionId of [
    ...bundle.instruments.map(({ instrumentId }) => instrumentId),
    ...bundle.versions.map(({ versionId }) => versionId),
    ...bundle.events.map(({ eventId }) => eventId),
    ...bundle.equivalenceAssertions.map(({ assertionId }) => assertionId),
  ]) {
    expect(accountedAssertionIds.has(assertionId), assertionId).toBe(true);
  }

  const accountedFacets = new Set([
    ...result.replacementReceipts.flatMap(({ assertionReferences }) =>
      assertionReferences.map(
        ({ assertionId, sourcePointer }) =>
          `${assertionId}\u0000${sourcePointer}`,
      ),
    ),
    ...result.losses.map(
      ({ assertionId, sourcePointer }) =>
        `${assertionId}\u0000${sourcePointer}`,
    ),
  ]);
  for (const event of bundle.events) {
    for (const sourcePointer of [
      "/observedTime",
      "/publishedTime",
      "/effectiveTime",
      "/validTime",
    ]) {
      expect(
        accountedFacets.has(`${event.eventId}\u0000${sourcePointer}`),
        `${event.eventId}${sourcePointer}`,
      ).toBe(true);
    }
    if (event.sourceStatus === undefined) {
      expect(
        accountedFacets.has(`${event.eventId}\u0000/eventType`),
        `${event.eventId}/eventType`,
      ).toBe(true);
    } else {
      const wholeStatusAccounted = accountedFacets.has(
        `${event.eventId}\u0000/sourceStatus`,
      );
      const statusPartsAccounted = [
        "/sourceStatus/statusLabelFactId",
        "/sourceStatus/statusAsOf",
      ].every((sourcePointer) =>
        accountedFacets.has(`${event.eventId}\u0000${sourcePointer}`),
      );
      expect(
        wholeStatusAccounted || statusPartsAccounted,
        `${event.eventId}/sourceStatus`,
      ).toBe(true);
    }
  }

  const pointers = result.replacementReceipts.map(({ pointer }) => pointer);
  expect(pointers).toEqual([...new Set(pointers)].sort());
  expect(canonicalJsonDigest(baseRecord)).toBe(result.baseRecordDigest);
  for (const receipt of result.replacementReceipts) {
    expect(receipt.inputFactIds).toEqual(
      [...new Set(receipt.inputFactIds)].sort(),
    );
    expect(receipt.provenanceFactIds).toEqual(
      [...new Set(receipt.provenanceFactIds)].sort(),
    );
    expect(
      receipt.provenanceFactIds.every((factId) =>
        receipt.inputFactIds.includes(factId),
      ),
    ).toBe(true);
    for (const digest of [
      receipt.baseValueDigest,
      receipt.outputValueDigest,
      receipt.baseProvenanceDigest,
      receipt.outputProvenanceDigest,
    ]) {
      expect(digest).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(receipt.baseValueDigest).toBe(
      canonicalJsonDigest(valueAtPointer(baseRecord, receipt.pointer)),
    );
    expect(receipt.outputValueDigest).toBe(
      canonicalJsonDigest(valueAtPointer(result.record, receipt.pointer)),
    );
    expect(receipt.baseProvenanceDigest).toBe(
      canonicalJsonDigest(provenanceAtPointer(baseRecord, receipt.pointer)),
    );
    expect(receipt.outputProvenanceDigest).toBe(
      canonicalJsonDigest(provenanceAtPointer(result.record, receipt.pointer)),
    );
  }

  const assertionsById = new Map<string, unknown>([
    ...bundle.sourceFacts.map(
      (assertion) => [assertion.factId, assertion] as const,
    ),
    ...bundle.instruments.map(
      (assertion) => [assertion.instrumentId, assertion] as const,
    ),
    ...bundle.versions.map(
      (assertion) => [assertion.versionId, assertion] as const,
    ),
    ...bundle.events.map(
      (assertion) => [assertion.eventId, assertion] as const,
    ),
    ...bundle.equivalenceAssertions.map(
      (assertion) => [assertion.assertionId, assertion] as const,
    ),
  ]);
  for (const receipt of result.replacementReceipts) {
    for (const reference of receipt.assertionReferences) {
      const assertion = assertionsById.get(reference.assertionId);
      expect(assertion, reference.assertionId).toBeDefined();
      expect(
        valueAtPointer(assertion, reference.sourcePointer),
        `${reference.assertionId}${reference.sourcePointer}`,
      ).not.toBeUndefined();
    }
  }
  for (const loss of result.losses) {
    const assertion = assertionsById.get(loss.assertionId);
    expect(assertion, loss.assertionId).toBeDefined();
    if (loss.sourcePointer !== "") {
      expect(
        valueAtPointer(assertion, loss.sourcePointer),
        `${loss.assertionId}${loss.sourcePointer}`,
      ).not.toBeUndefined();
    }
  }

  const lossKeys = result.losses.map(
    ({ assertionId, sourcePointer, targetPointer, lossCode }) =>
      `${assertionId}\u0000${sourcePointer}\u0000${targetPointer ?? ""}\u0000${lossCode}`,
  );
  expect(lossKeys).toEqual([...new Set(lossKeys)].sort());
  expect(canonicalizeJson(result)).not.toContain("event_time_not_projected");
}

describe("K0 PolicyRecord 1.4 compatibility projection", () => {
  it("projects deterministically, declares loss, passes unchanged validators, and preserves protected semantics", () => {
    const bundle = buildProjectionBundle();
    const base = completeBaseRecord();
    const beforeBundle = canonicalizeJson(bundle);
    const beforeBase = canonicalizeJson(base);
    const first = projectLifecycleToPolicyRecord14({
      bundle,
      instrumentId: createInstrumentId(identity),
      baseRecord: base,
      policy: policy(),
      validationContext,
    });
    const second = project(bundle);

    expect(first.outcome).toBe("projected");
    expect(first).toEqual(second);
    expect(canonicalizeJson(bundle)).toBe(beforeBundle);
    expect(canonicalizeJson(base)).toBe(beforeBase);
    if (first.outcome !== "projected") {
      throw new TypeError(first.reasonCodes.join(","));
    }
    expect(first.lossy).toBe(true);
    expect(first.record.schemaVersion).toBe("1.4.0");
    expect(first.record.status).toEqual({
      normalized: "active",
      sourceLabel: "Open",
      asOf: "2026-07-29",
    });
    expect(first.record.dates).toMatchObject({
      introduced: "2026-07-01",
      published: "2026-07-10",
      effective: "2026-07-20",
      lastAction: "2026-07-29",
    });
    expect(
      first.record.actionHistory.map(({ sourceLabel }) => sourceLabel),
    ).toEqual([
      "Introduced",
      "Published",
      "Effective date supplied",
      "Status observed",
    ]);
    expect(first.losses.length).toBeGreaterThan(0);
    expectCompleteProjectionAccounting(bundle, first, base);
    expect(first.outputRecordDigest).toBe(canonicalJsonDigest(first.record));
    expect(() => validateTargetRecord(first.record)).not.toThrow();
    const unchangedValueReceipt = first.replacementReceipts.find(
      ({ pointer }) => pointer === "/status/normalized",
    )!;
    expect(unchangedValueReceipt.baseValueDigest).toBe(
      unchangedValueReceipt.outputValueDigest,
    );
    expect(unchangedValueReceipt.baseProvenanceDigest).not.toBe(
      unchangedValueReceipt.outputProvenanceDigest,
    );
    expect(unchangedValueReceipt.provenanceFactIds).toEqual(
      unchangedValueReceipt.inputFactIds,
    );

    const lifecycleProvenance = (field: string) =>
      field === "/status/normalized" ||
      field === "/status/sourceLabel" ||
      field === "/status/asOf" ||
      field === "/dates/introduced" ||
      field === "/dates/published" ||
      field === "/dates/effective" ||
      field === "/dates/lastAction" ||
      field.startsWith("/actionHistory/") ||
      field.startsWith("/statusHistory/");
    expect(
      first.record.fieldProvenance.filter(
        ({ field }) => !lifecycleProvenance(field),
      ),
    ).toEqual(
      base.fieldProvenance.filter(({ field }) => !lifecycleProvenance(field)),
    );

    for (const key of [
      "jurisdiction",
      "issuingBodies",
      "officialSubjects",
      "taxonomyMemberships",
      "isUnclassified",
      "relevance",
      "nationAssociations",
      "landmark",
      "texts",
      "source",
      "urls",
    ] as const) {
      expect(canonicalizeJson(first.record[key])).toBe(
        canonicalizeJson(base[key]),
      );
    }
  });

  it("clears absent and unknown dates without inventing provenance", () => {
    const statusOnlyBundle = statusOnlyWithoutSupportedAction(
      buildProjectionBundle(),
    );
    const statusOnly = project(statusOnlyBundle);
    expectCompleteProjectionAccounting(statusOnlyBundle, statusOnly);
    if (statusOnly.outcome !== "projected") {
      throw new TypeError(statusOnly.reasonCodes.join(","));
    }
    expect(statusOnly.record.actionHistory).toEqual([]);
    for (const pointer of [
      "/dates/introduced",
      "/dates/published",
      "/dates/effective",
      "/dates/lastAction",
    ]) {
      const leaf = pointer.split("/").at(-1)! as keyof PolicyRecord["dates"];
      expect(statusOnly.record.dates[leaf], pointer).toBeNull();
      expect(
        statusOnly.record.fieldProvenance.some(
          ({ field }) => field === pointer || field.startsWith(`${pointer}/`),
        ),
        pointer,
      ).toBe(false);
      const receipt = statusOnly.replacementReceipts.find(
        (candidate) => candidate.pointer === pointer,
      )!;
      expect(receipt.inputFactIds, pointer).toEqual([]);
      expect(receipt.provenanceFactIds, pointer).toEqual([]);
    }

    const unknownBundle = unknownIntroductionTime(buildProjectionBundle());
    const unknown = project(unknownBundle);
    expectCompleteProjectionAccounting(unknownBundle, unknown);
    if (unknown.outcome !== "projected") {
      throw new TypeError(unknown.reasonCodes.join(","));
    }
    const introduction = unknownBundle.events.find(
      ({ eventType }) => eventType === "introduction",
    )!;
    const receipt = unknown.replacementReceipts.find(
      ({ pointer }) => pointer === "/dates/introduced",
    )!;
    expect(unknown.record.dates.introduced).toBeNull();
    expect(receipt.inputFactIds).toEqual([]);
    expect(receipt.provenanceFactIds).toEqual([]);
    expect(receipt.inputFactIds).not.toContain(introduction.eventLabelFactId);
    expect(
      unknown.record.fieldProvenance.some(
        ({ field }) => field === "/dates/introduced",
      ),
    ).toBe(false);
    expect(unknown.losses).toContainEqual({
      assertionId: introduction.eventId,
      sourcePointer: "/validTime",
      targetPointer: "/dates/introduced",
      lossCode: "temporal_assertion_not_projected",
    });
  });

  it("keeps multi-fact date provenance honest and rejects semantic event-ID ordering", () => {
    const fixture = addSameDateActorVariant(buildProjectionBundle());
    const result = project(fixture.bundle);
    expectCompleteProjectionAccounting(fixture.bundle, result);
    if (result.outcome !== "projected") {
      throw new TypeError(result.reasonCodes.join(","));
    }

    expect(result.record.actionHistory).toEqual([]);
    const introductionEvents = fixture.bundle.events.filter(
      ({ eventType }) => eventType === "introduction",
    );
    for (const event of introductionEvents) {
      expect(result.losses).toContainEqual({
        assertionId: event.eventId,
        sourcePointer: "/validTime",
        targetPointer: "/actionHistory",
        lossCode: "history_order_not_projected",
      });
    }

    const receipt = result.replacementReceipts.find(
      ({ pointer }) => pointer === "/dates/introduced",
    )!;
    expect(receipt.inputFactIds).toEqual([...fixture.dateFactIds].sort());
    const selectedFactId = [...fixture.dateFactIds].sort()[0]!;
    expect(receipt.provenanceFactIds).toEqual([selectedFactId]);
    const selectedFact = fixture.bundle.sourceFacts.find(
      ({ factId }) => factId === selectedFactId,
    )!;
    expect(
      result.record.fieldProvenance.filter(
        ({ field }) => field === "/dates/introduced",
      ),
    ).toEqual([
      expect.objectContaining({
        sourcePath: selectedFact.provenance.sourcePath,
      }),
    ]);
  });

  it("rejects event-ID ordering across distinct exact label facts", () => {
    const bundle = addSameTupleDifferentLabelFact(buildProjectionBundle());
    const introductions = bundle.events.filter(
      ({ eventType }) => eventType === "introduction",
    );
    expect(introductions).toHaveLength(2);
    expect(introductions[0]!.eventLabelFactId).not.toBe(
      introductions[1]!.eventLabelFactId,
    );
    const labelFacts = introductions.map((event) =>
      bundle.sourceFacts.find(
        ({ factId }) => factId === event.eventLabelFactId,
      ),
    );
    expect(labelFacts.map((fact) => fact?.value)).toEqual([
      { kind: "text", value: "Introduced" },
      { kind: "text", value: "Introduced" },
    ]);
    expect(labelFacts[0]!.provenance.sourceUrl).toBe(
      labelFacts[1]!.provenance.sourceUrl,
    );
    expect(labelFacts[0]!.provenance.sourcePath).not.toBe(
      labelFacts[1]!.provenance.sourcePath,
    );

    const result = project(bundle);
    expectCompleteProjectionAccounting(bundle, result);
    if (result.outcome !== "projected") {
      throw new TypeError(result.reasonCodes.join(","));
    }
    expect(result.record.actionHistory).toEqual([]);
    for (const event of introductions) {
      expect(result.losses).toContainEqual({
        assertionId: event.eventId,
        sourcePointer: "/validTime",
        targetPointer: "/actionHistory",
        lossCode: "history_order_not_projected",
      });
    }
  });

  it("declares date-time and interval precision loss without provenance on null targets", () => {
    const publication = replaceEventTemporalDimension(
      buildProjectionBundle(),
      "publication",
      "publishedTime",
      "published_time",
      { kind: "date_time", value: "2026-07-10T12:00:00Z" },
    );
    const publicationResult = project(publication.bundle);
    expectCompleteProjectionAccounting(publication.bundle, publicationResult);
    if (publicationResult.outcome !== "projected") {
      throw new TypeError(publicationResult.reasonCodes.join(","));
    }
    expect(publicationResult.record.dates.published).toBeNull();
    const publishedReceipt = publicationResult.replacementReceipts.find(
      ({ pointer }) => pointer === "/dates/published",
    )!;
    expect(publishedReceipt.inputFactIds).toContain(publication.fact.factId);
    expect(publishedReceipt.provenanceFactIds).toEqual([]);
    expect(
      publicationResult.record.fieldProvenance.some(
        ({ field }) => field === "/dates/published",
      ),
    ).toBe(false);
    expect(publicationResult.losses).toContainEqual(
      expect.objectContaining({
        sourcePointer: "/publishedTime",
        targetPointer: "/dates/published",
        lossCode: "temporal_precision_not_projected",
      }),
    );

    const effective = replaceEventTemporalDimension(
      buildProjectionBundle(),
      "effective_date",
      "effectiveTime",
      "effective_time",
      {
        kind: "interval",
        start: { kind: "date", value: "2026-07-20", inclusive: true },
        end: { kind: "date", value: "2026-07-21", inclusive: true },
      },
    );
    const effectiveResult = project(effective.bundle);
    expectCompleteProjectionAccounting(effective.bundle, effectiveResult);
    if (effectiveResult.outcome !== "projected") {
      throw new TypeError(effectiveResult.reasonCodes.join(","));
    }
    expect(effectiveResult.record.dates.effective).toBeNull();
    const effectiveReceipt = effectiveResult.replacementReceipts.find(
      ({ pointer }) => pointer === "/dates/effective",
    )!;
    expect(effectiveReceipt.inputFactIds).toContain(effective.fact.factId);
    expect(effectiveReceipt.provenanceFactIds).toEqual([]);
    expect(effectiveResult.losses).toContainEqual(
      expect.objectContaining({
        sourcePointer: "/effectiveTime",
        targetPointer: "/dates/effective",
        lossCode: "temporal_interval_not_projected",
      }),
    );
  });

  it("accounts for non-selected instruments, versions, events, and facts bundle-globally", () => {
    const bundle = addUnrelatedLifecycleEvent(buildProjectionBundle());
    const result = project(bundle);
    expectCompleteProjectionAccounting(bundle, result);
    if (result.outcome !== "projected") {
      throw new TypeError(result.reasonCodes.join(","));
    }
    const unrelated = bundle.events.find(
      ({ sourceIdentity }) => sourceIdentity.sourceId === "synthetic-k0",
    )!;
    expect(
      result.losses.filter(
        ({ assertionId, lossCode }) =>
          assertionId === unrelated.eventId &&
          lossCode === "temporal_assertion_not_projected",
      ),
    ).toHaveLength(4);
    expect(result.losses).toContainEqual({
      assertionId: unrelated.eventId,
      sourcePointer: "/sourceStatus",
      targetPointer: "/status/normalized",
      lossCode: "source_status_not_projected",
    });
  });

  it("classifies integrity replay failures separately from invalid structure", () => {
    const bundle = buildProjectionBundle();
    const factTamper = structuredClone(bundle);
    factTamper.sourceFacts[0]!.factDigest = "0".repeat(64);
    factTamper.bundleDigest = rawBundleDigest(factTamper);
    const factResult = project(factTamper);
    expect(factResult.outcome).toBe("refused");
    if (factResult.outcome === "refused") {
      expect(factResult.reasonCodes).toEqual(["input_digest_mismatch"]);
    }

    const invalidBase = completeBaseRecord();
    invalidBase.officialTitle = "";
    const combinedFactResult = projectLifecycleToPolicyRecord14({
      bundle: factTamper,
      instrumentId: createInstrumentId(identity),
      baseRecord: invalidBase,
      policy: { ...policy(), ruleVersion: "01.0.0" },
      validationContext,
    });
    expect(combinedFactResult.outcome).toBe("refused");
    if (combinedFactResult.outcome === "refused") {
      expect(combinedFactResult.reasonCodes).toEqual([
        "input_digest_mismatch",
        "projection_policy_mismatch",
        "target_record_1_4_validation_failed",
      ]);
    }

    const outerTamper = structuredClone(bundle);
    outerTamper.bundleDigest = "0".repeat(64);
    const policyMismatch = {
      ...policy(),
      ruleVersion: "01.0.0",
    } as PolicyRecord14ProjectionPolicy;
    const combined = project(outerTamper, policyMismatch);
    expect(combined.outcome).toBe("refused");
    if (combined.outcome === "refused") {
      expect(combined.reasonCodes).toEqual([
        "input_digest_mismatch",
        "projection_policy_mismatch",
      ]);
    }

    const invalid = structuredClone(bundle) as unknown as Record<
      string,
      unknown
    >;
    (invalid.events as Record<string, unknown>[])[0]!.legalEffect =
      "synthetic overclaim";
    (invalid as { bundleDigest: string }).bundleDigest = rawBundleDigest(
      invalid as unknown as LifecycleBundle,
    );
    const invalidResult = project(invalid as unknown as LifecycleBundle);
    expect(invalidResult.outcome).toBe("refused");
    if (invalidResult.outcome === "refused") {
      expect(invalidResult.reasonCodes).toEqual(["invalid_lifecycle_bundle"]);
    }
  });

  it("uses only the repository-owned PolicyRecord 1.4 validation path", () => {
    const bundle = buildProjectionBundle();
    const noOpValidator = vi.fn();
    const schemaInvalid = completeBaseRecord();
    schemaInvalid.officialTitle = "";
    const injected = {
      bundle,
      instrumentId: createInstrumentId(identity),
      baseRecord: schemaInvalid,
      policy: policy(),
      validationContext,
      validateTargetRecord: noOpValidator,
    } as unknown as PolicyRecord14ProjectionInput;
    const schemaResult = projectLifecycleToPolicyRecord14(injected);
    expect(schemaResult.outcome).toBe("refused");
    if (schemaResult.outcome === "refused") {
      expect(schemaResult.reasonCodes).toEqual([
        "target_record_1_4_validation_failed",
      ]);
      expect(schemaResult).not.toHaveProperty("record");
    }
    expect(noOpValidator).not.toHaveBeenCalled();

    const semanticInvalid = completeBaseRecord();
    semanticInvalid.fieldProvenance = semanticInvalid.fieldProvenance.filter(
      ({ field }) => field !== "/officialTitle",
    );
    const semanticResult = projectLifecycleToPolicyRecord14({
      bundle,
      instrumentId: createInstrumentId(identity),
      baseRecord: semanticInvalid,
      policy: policy(),
      validationContext,
    });
    expect(semanticResult.outcome).toBe("refused");
    if (semanticResult.outcome === "refused") {
      expect(semanticResult.reasonCodes).toEqual([
        "target_record_1_4_validation_failed",
      ]);
    }

    const mismatchedContext = structuredClone(validationContext);
    mismatchedContext.sourceRegistry.sources =
      mismatchedContext.sourceRegistry.sources.filter(
        ({ id }) => id !== sourceConfig.id,
      );
    const base = completeBaseRecord();
    const beforeBase = canonicalizeJson(base);
    const beforeContext = canonicalizeJson(mismatchedContext);
    const contextResult = projectLifecycleToPolicyRecord14({
      bundle,
      instrumentId: createInstrumentId(identity),
      baseRecord: base,
      policy: policy(),
      validationContext: mismatchedContext,
    });
    expect(contextResult.outcome).toBe("refused");
    if (contextResult.outcome === "refused") {
      expect(contextResult.reasonCodes).toEqual([
        "projection_policy_mismatch",
        "target_record_1_4_validation_failed",
      ]);
    }
    expect(canonicalizeJson(base)).toBe(beforeBase);
    expect(canonicalizeJson(mismatchedContext)).toBe(beforeContext);

    const permissiveContext = structuredClone(validationContext);
    permissiveContext.sourceRegistry.sources
      .find(({ id }) => id === sourceConfig.id)!
      .access.allowedHosts.push("attacker.invalid");
    const permissiveDigest = canonicalJsonDigest(permissiveContext);
    expect(() =>
      validatePolicyRecord14Compatibility(
        completeBaseRecord(),
        permissiveContext,
        permissiveDigest,
      ),
    ).toThrow(/not repository-authorized/);
    const permissiveResult = projectLifecycleToPolicyRecord14({
      bundle,
      instrumentId: createInstrumentId(identity),
      baseRecord: completeBaseRecord(),
      policy: { ...policy(), validationContextDigest: permissiveDigest },
      validationContext: permissiveContext,
    });
    expect(permissiveResult.outcome).toBe("refused");
    if (permissiveResult.outcome === "refused") {
      expect(permissiveResult.reasonCodes).toEqual([
        "target_record_1_4_validation_failed",
      ]);
    }
  });

  it("refuses every relationship bundle-globally and classifies its own endpoints", () => {
    const scenarios = [
      {
        bundle: addUnrelatedRelationship(buildProjectionBundle()),
        codes: ["relationship_unrepresentable_in_one_record"],
      },
      {
        bundle: addUnrelatedRelationship(buildProjectionBundle(), {
          crossSource: true,
        }),
        codes: [
          "cross_source_relationship_unrepresentable",
          "relationship_unrepresentable_in_one_record",
        ],
      },
      {
        bundle: addUnrelatedRelationship(buildProjectionBundle(), {
          unknown: true,
        }),
        codes: [
          "relationship_unrepresentable_in_one_record",
          "uncertain_relationship_unrepresentable",
        ],
      },
    ] as const;
    for (const scenario of scenarios) {
      const relationship = scenario.bundle.relationshipAssertions[0]!;
      const result = project(scenario.bundle);
      expect(result.outcome).toBe("refused");
      if (result.outcome === "refused") {
        expect(result.reasonCodes).toEqual(scenario.codes);
        expect(result.blockingAssertionIds).toEqual([relationship.assertionId]);
        expect(result).not.toHaveProperty("record");
      }
    }
  });

  it("replays the same projection after all lifecycle collection inputs are reordered", () => {
    const bundle = buildProjectionBundle();
    const reordered = mutateNormalizedBundle(bundle, (mutable) => {
      mutable.sourceFacts = [...mutable.sourceFacts].reverse();
      mutable.instruments = [...mutable.instruments].reverse();
      mutable.versions = [...mutable.versions].reverse();
      mutable.events = [...mutable.events].reverse();
      mutable.equivalenceAssertions = [
        ...mutable.equivalenceAssertions,
      ].reverse();
      mutable.relationshipAssertions = [
        ...mutable.relationshipAssertions,
      ].reverse();
    });
    expect(reordered.bundleDigest).toBe(bundle.bundleDigest);
    expect(project(reordered)).toEqual(project(bundle));
  });

  it("refuses ambiguous, conflicting, unknown, and concurrent source status without a partial record", () => {
    const scenarios = [
      ["ambiguous_evidence", "ambiguous_lifecycle_state"],
      ["conflicting_evidence", "conflicting_status_evidence"],
      ["unknown", "unknown_status_evidence"],
    ] as const;
    for (const [state, code] of scenarios) {
      const result = project(
        buildProjectionBundle({ sourceStatusEvidence: state }),
      );
      expect(result.outcome).toBe("refused");
      if (result.outcome === "refused") {
        expect(result.reasonCodes).toContain(code);
        expect(result).not.toHaveProperty("record");
      }
    }

    const concurrent = project(
      buildProjectionBundle({ secondConcurrentStatus: true }),
    );
    expect(concurrent.outcome).toBe("refused");
    if (concurrent.outcome === "refused") {
      expect(concurrent.reasonCodes).toContain(
        "concurrent_unrepresentable_state",
      );
      expect(concurrent).not.toHaveProperty("record");
    }
  });

  it("refuses missing mappings, identity substitution, and digest tampering", () => {
    const bundle = buildProjectionBundle();
    const unmapped = project(bundle, policy([]));
    expect(unmapped.outcome).toBe("refused");
    if (unmapped.outcome === "refused") {
      expect(unmapped.reasonCodes).toContain("missing_status_mapping");
    }

    const malformedPolicy = {
      ...policy(),
      statusMappings: null,
    } as unknown as PolicyRecord14ProjectionPolicy;
    const malformedPolicyResult = project(bundle, malformedPolicy);
    expect(malformedPolicyResult.outcome).toBe("refused");
    if (malformedPolicyResult.outcome === "refused") {
      expect(malformedPolicyResult.reasonCodes).toContain(
        "projection_policy_mismatch",
      );
    }

    const wrongBase = completeBaseRecord();
    wrongBase.source.recordId = "OTHER";
    const identityResult = projectLifecycleToPolicyRecord14({
      bundle,
      instrumentId: createInstrumentId(identity),
      baseRecord: wrongBase,
      policy: policy(),
      validationContext,
    });
    expect(identityResult.outcome).toBe("refused");
    if (identityResult.outcome === "refused") {
      expect(identityResult.reasonCodes).toContain("base_identity_mismatch");
    }

    const tampered = structuredClone(bundle);
    tampered.bundleDigest = "0".repeat(64);
    const tamperedResult = project(tampered);
    expect(tamperedResult.outcome).toBe("refused");
    if (tamperedResult.outcome === "refused") {
      expect(tamperedResult.reasonCodes).toEqual(["input_digest_mismatch"]);
    }
  });

  it("refuses specialized and relationship-bearing PolicyRecord bases", () => {
    const bundle = buildProjectionBundle();
    const specialized = completeBaseRecord();
    specialized.documentType = "court_decision";
    const specializedResult = projectLifecycleToPolicyRecord14({
      bundle,
      instrumentId: createInstrumentId(identity),
      baseRecord: specialized,
      policy: policy(),
      validationContext,
    });
    expect(specializedResult.outcome).toBe("refused");
    if (specializedResult.outcome === "refused") {
      expect(specializedResult.reasonCodes).toContain(
        "base_specialization_unsupported",
      );
    }

    const relationshipBase = completeBaseRecord();
    relationshipBase.sourceDocumentRelationships.push({
      relationshipType: "related_document",
      targetSourceRecordId: "SYN-OTHER",
      targetUrl: "https://official.example.invalid/records/SYN-OTHER",
      sourceLabel: "Synthetic relationship",
    });
    const relationshipResult = projectLifecycleToPolicyRecord14({
      bundle,
      instrumentId: createInstrumentId(identity),
      baseRecord: relationshipBase,
      policy: policy(),
      validationContext,
    });
    expect(relationshipResult.outcome).toBe("refused");
    if (relationshipResult.outcome === "refused") {
      expect(relationshipResult.reasonCodes).toContain(
        "base_relationship_graph_requires_batch_projection",
      );
    }
  });

  it("rejects legal-status overclaim fields before any projection", () => {
    const bundle = structuredClone(
      buildProjectionBundle(),
    ) as unknown as Record<string, unknown>;
    const events = bundle.events as Record<string, unknown>[];
    events[0]!.legalEffect = "synthetic overclaim";
    const result = projectLifecycleToPolicyRecord14({
      bundle: bundle as unknown as LifecycleBundle,
      instrumentId: createInstrumentId(identity),
      baseRecord: completeBaseRecord(),
      policy: policy(),
      validationContext,
    });
    expect(result.outcome).toBe("refused");
    if (result.outcome === "refused") {
      expect(result.reasonCodes).toEqual(["invalid_lifecycle_bundle"]);
      expect(result).not.toHaveProperty("record");
    }
  });
});
