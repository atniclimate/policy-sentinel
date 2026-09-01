import type { PolicyRecord } from "../../shared/contracts";
import {
  canonicalJsonDigest,
  canonicalizeJson,
  immutableCanonicalClone,
  isIntegrityReplayError,
  type EvidenceState,
  type JsonValue,
  type SourceFact,
  type SupportedTemporalAssertion,
  type TemporalAssertion,
} from "../assertions";
import {
  assertPolicyRecord14Schema,
  validatePolicyRecord14Compatibility,
  type PolicyRecord14ValidationContext,
} from "./policy-record-14-validator";
import { compareTemporalValues } from "./temporal";
import type {
  LifecycleBundle,
  LifecycleBundleWithoutDigest,
  LifecycleEvent,
  PolicyInstrument,
  RelationshipAssertion,
} from "./types";
import { normalizeLifecycleBundle } from "./bundle";

export const POLICY_RECORD_14_PROJECTION_VERSION =
  "policy-record-1.4-from-k0-1.0.1" as const;
export const POLICY_RECORD_14_TARGET_VERSION = "1.4.0" as const;

const PROJECTION_RULE_ID = "k0-policy-record14-projection";
const PROJECTION_RULE_VERSION = "1.0.0";

export const POLICY_RECORD_14_NORMALIZED_STATUSES = [
  "proposed",
  "active",
  "committee",
  "enacted",
  "effective",
  "historical",
  "closed",
  "withdrawn",
  "decided",
  "superseded",
  "unknown",
] as const;

export type PolicyRecord14NormalizedStatus =
  (typeof POLICY_RECORD_14_NORMALIZED_STATUSES)[number];

export interface PolicyRecord14StatusMapping {
  sourceLabel: string;
  normalizedStatus: PolicyRecord14NormalizedStatus;
}

export interface PolicyRecord14ProjectionPolicy {
  projectionVersion: typeof POLICY_RECORD_14_PROJECTION_VERSION;
  validationContextDigest: string;
  sourceId: string;
  ruleId: string;
  ruleVersion: string;
  statusMappings: readonly PolicyRecord14StatusMapping[];
}

export const PROJECTION_LOSS_CODES = [
  "source_fact_not_projected",
  "instrument_metadata_not_projected",
  "version_not_projected",
  "equivalence_not_projected",
  "actor_not_projected",
  "non_status_event_not_projected_to_status",
  "source_status_not_projected",
  "temporal_precision_not_projected",
  "temporal_interval_not_projected",
  "temporal_assertion_not_projected",
  "history_order_not_projected",
] as const;

export type ProjectionLossCode = (typeof PROJECTION_LOSS_CODES)[number];

export const PROJECTION_REFUSAL_CODES = [
  "invalid_lifecycle_bundle",
  "input_digest_mismatch",
  "projection_policy_mismatch",
  "base_record_schema_version_mismatch",
  "base_identity_mismatch",
  "base_specialization_unsupported",
  "base_relationship_graph_requires_batch_projection",
  "missing_status_observation",
  "unknown_status_evidence",
  "insufficient_status_evidence",
  "ambiguous_lifecycle_state",
  "conflicting_status_evidence",
  "missing_status_as_of",
  "missing_status_mapping",
  "concurrent_unrepresentable_state",
  "version_cardinality_unrepresentable",
  "cross_source_relationship_unrepresentable",
  "uncertain_relationship_unrepresentable",
  "relationship_unrepresentable_in_one_record",
  "protected_field_mutation_detected",
  "provenance_replacement_failed",
  "target_record_1_4_validation_failed",
] as const;

export type ProjectionRefusalCode = (typeof PROJECTION_REFUSAL_CODES)[number];

export interface ProjectionLoss {
  assertionId: string;
  sourcePointer: string;
  targetPointer: string | null;
  lossCode: ProjectionLossCode;
}

export interface ProjectionAssertionReference {
  assertionId: string;
  sourcePointer: string;
}

export interface ReplacementReceipt {
  pointer: string;
  baseValueDigest: string;
  outputValueDigest: string;
  baseProvenanceDigest: string;
  outputProvenanceDigest: string;
  assertionReferences: readonly ProjectionAssertionReference[];
  inputFactIds: readonly string[];
  provenanceFactIds: readonly string[];
  ruleId: string;
  ruleVersion: string;
}

interface ProjectionIdentityReceipt {
  projectionVersion: typeof POLICY_RECORD_14_PROJECTION_VERSION;
  targetRecordVersion: typeof POLICY_RECORD_14_TARGET_VERSION;
  bundleDigest: string;
  instrumentId: string;
  baseRecordDigest: string;
  projectionPolicyDigest: string;
  validationContextDigest: string;
}

export interface ProjectedPolicyRecord14 extends ProjectionIdentityReceipt {
  outcome: "projected";
  lossy: true;
  outputRecordDigest: string;
  losses: readonly ProjectionLoss[];
  replacementReceipts: readonly ReplacementReceipt[];
  record: PolicyRecord;
}

export interface RefusedPolicyRecord14Projection extends ProjectionIdentityReceipt {
  outcome: "refused";
  reasonCodes: readonly ProjectionRefusalCode[];
  blockingAssertionIds: readonly string[];
}

export type PolicyRecord14ProjectionResult =
  ProjectedPolicyRecord14 | RefusedPolicyRecord14Projection;

export interface PolicyRecord14ProjectionInput {
  bundle: LifecycleBundle;
  instrumentId: string;
  baseRecord: PolicyRecord;
  policy: PolicyRecord14ProjectionPolicy;
  validationContext: PolicyRecord14ValidationContext;
}

interface StatusCandidate {
  event: LifecycleEvent;
  labelFact: SourceFact;
  asOfFact: SourceFact;
  label: string;
  asOf: SupportedTemporalAssertion;
  normalizedStatus: PolicyRecord14NormalizedStatus;
}

type TextSourceFact = SourceFact & {
  value: { kind: "text"; value: string };
};

interface MutableProjectionState {
  record: PolicyRecord;
  facts: ReadonlyMap<string, SourceFact>;
  accountedFactIds: Set<string>;
  accountedAssertionFacets: Set<string>;
  losses: ProjectionLoss[];
  receipts: ReplacementReceipt[];
  provenanceFailed: boolean;
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function assertionFacetKey(reference: ProjectionAssertionReference): string {
  return `${reference.assertionId}\u0000${reference.sourcePointer}`;
}

function sortedAssertionReferences(
  references: readonly ProjectionAssertionReference[],
): ProjectionAssertionReference[] {
  const unique = new Map<string, ProjectionAssertionReference>();
  for (const reference of references) {
    unique.set(assertionFacetKey(reference), reference);
  }
  return [...unique.values()].sort((left, right) => {
    const leftKey = assertionFacetKey(left);
    const rightKey = assertionFacetKey(right);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
}

function safeDigest(value: unknown): string {
  try {
    return canonicalJsonDigest(value);
  } catch {
    return "0".repeat(64);
  }
}

function identityReceipt(
  bundle: LifecycleBundle,
  instrumentId: string,
  baseRecord: PolicyRecord,
  policy: PolicyRecord14ProjectionPolicy,
  validationContext: PolicyRecord14ValidationContext,
): ProjectionIdentityReceipt {
  return {
    projectionVersion: POLICY_RECORD_14_PROJECTION_VERSION,
    targetRecordVersion: POLICY_RECORD_14_TARGET_VERSION,
    bundleDigest:
      typeof bundle?.bundleDigest === "string"
        ? bundle.bundleDigest
        : "0".repeat(64),
    instrumentId,
    baseRecordDigest: safeDigest(baseRecord),
    projectionPolicyDigest: safeDigest(policy),
    validationContextDigest: safeDigest(validationContext),
  };
}

function refused(
  receipt: ProjectionIdentityReceipt,
  reasonCodes: Iterable<ProjectionRefusalCode>,
  blockingAssertionIds: Iterable<string>,
): RefusedPolicyRecord14Projection {
  return immutableCanonicalClone({
    outcome: "refused",
    ...receipt,
    reasonCodes: sortedUnique(reasonCodes),
    blockingAssertionIds: sortedUnique(blockingAssertionIds),
  } as unknown as JsonValue) as unknown as RefusedPolicyRecord14Projection;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function validProjectionPolicy(
  policy: unknown,
  expectedSourceId?: string,
): policy is PolicyRecord14ProjectionPolicy {
  if (!isPlainObject(policy)) {
    return false;
  }
  const keys = Object.keys(policy).sort();
  if (
    canonicalizeJson(keys) !==
      canonicalizeJson(
        [
          "projectionVersion",
          "ruleId",
          "ruleVersion",
          "sourceId",
          "statusMappings",
          "validationContextDigest",
        ].sort(),
      ) ||
    policy.projectionVersion !== POLICY_RECORD_14_PROJECTION_VERSION ||
    typeof policy.validationContextDigest !== "string" ||
    !/^[a-f0-9]{64}$/.test(policy.validationContextDigest) ||
    (expectedSourceId !== undefined && policy.sourceId !== expectedSourceId) ||
    typeof policy.ruleId !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(policy.ruleId) ||
    typeof policy.ruleVersion !== "string" ||
    !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(
      policy.ruleVersion,
    ) ||
    !Array.isArray(policy.statusMappings)
  ) {
    return false;
  }

  let priorLabel: string | undefined;
  for (const mapping of policy.statusMappings) {
    if (
      !isPlainObject(mapping) ||
      canonicalizeJson(Object.keys(mapping).sort()) !==
        canonicalizeJson(["normalizedStatus", "sourceLabel"]) ||
      typeof mapping.sourceLabel !== "string" ||
      mapping.sourceLabel.length === 0 ||
      !POLICY_RECORD_14_NORMALIZED_STATUSES.includes(
        mapping.normalizedStatus as PolicyRecord14NormalizedStatus,
      ) ||
      (priorLabel !== undefined && priorLabel >= mapping.sourceLabel)
    ) {
      return false;
    }
    priorLabel = mapping.sourceLabel;
  }
  return true;
}

function factIndex(bundle: LifecycleBundle): ReadonlyMap<string, SourceFact> {
  return new Map(bundle.sourceFacts.map((fact) => [fact.factId, fact]));
}

function factText(
  facts: ReadonlyMap<string, SourceFact>,
  factId: string,
  predicate: SourceFact["predicate"],
): TextSourceFact | null {
  const fact = facts.get(factId);
  if (
    fact === undefined ||
    fact.predicate !== predicate ||
    fact.value.kind !== "text"
  ) {
    return null;
  }
  return fact as TextSourceFact;
}

type TemporalFactPredicate = Extract<
  SourceFact["predicate"],
  | "observed_time"
  | "published_time"
  | "effective_time"
  | "valid_time"
  | "status_as_of"
>;

function sameFactIdentity(
  fact: SourceFact,
  sourceIdentity: LifecycleEvent["sourceIdentity"],
): boolean {
  return (
    fact.sourceIdentity.sourceId === sourceIdentity.sourceId &&
    fact.sourceIdentity.sourceRecordId === sourceIdentity.sourceRecordId
  );
}

function temporalEvidenceFacts(
  assertion: TemporalAssertion,
  facts: ReadonlyMap<string, SourceFact>,
  predicate: TemporalFactPredicate,
  sourceIdentity: LifecycleEvent["sourceIdentity"],
): SourceFact[] {
  return assertion.evidence.factReferences
    .map(({ factId }) => facts.get(factId))
    .filter(
      (fact): fact is SourceFact =>
        fact !== undefined &&
        fact.predicate === predicate &&
        sameFactIdentity(fact, sourceIdentity),
    );
}

function exactTemporalFacts(
  assertion: SupportedTemporalAssertion,
  facts: ReadonlyMap<string, SourceFact>,
  predicate: TemporalFactPredicate,
  sourceIdentity: LifecycleEvent["sourceIdentity"],
): SourceFact[] {
  const expectedValue = canonicalizeJson(assertion.value);
  return temporalEvidenceFacts(
    assertion,
    facts,
    predicate,
    sourceIdentity,
  ).filter((fact) => canonicalizeJson(fact.value) === expectedValue);
}

function exactTemporalFact(
  assertion: SupportedTemporalAssertion,
  facts: ReadonlyMap<string, SourceFact>,
  predicate: TemporalFactPredicate,
  sourceIdentity: LifecycleEvent["sourceIdentity"],
): SourceFact | null {
  return (
    exactTemporalFacts(assertion, facts, predicate, sourceIdentity)[0] ?? null
  );
}

function evidenceRefusalCode(
  evidence: EvidenceState,
): ProjectionRefusalCode | null {
  switch (evidence.state) {
    case "supported":
      return null;
    case "unknown":
      return "unknown_status_evidence";
    case "insufficient_evidence":
      return "insufficient_status_evidence";
    case "ambiguous_evidence":
      return "ambiguous_lifecycle_state";
    case "conflicting_evidence":
      return "conflicting_status_evidence";
  }
}

function relationshipReferences(
  relationship: RelationshipAssertion,
): readonly { instrumentId: string; sourceIdentity: { sourceId: string } }[] {
  return "subject" in relationship
    ? [relationship.subject, relationship.affected]
    : [relationship.affected];
}

function protectedProjection(record: PolicyRecord): JsonValue {
  const clone = structuredClone(record) as unknown as Record<string, unknown>;
  delete clone.actionHistory;
  delete clone.statusHistory;
  clone.fieldProvenance = (
    clone.fieldProvenance as PolicyRecord["fieldProvenance"]
  ).filter(({ field }) => !isMutableLifecyclePointer(field));
  const status = clone.status as Record<string, unknown>;
  delete status.normalized;
  delete status.sourceLabel;
  delete status.asOf;
  const dates = clone.dates as Record<string, unknown>;
  delete dates.introduced;
  delete dates.published;
  delete dates.effective;
  delete dates.lastAction;
  return clone as unknown as JsonValue;
}

function isMutableLifecyclePointer(pointer: string): boolean {
  return [
    "/status/normalized",
    "/status/sourceLabel",
    "/status/asOf",
    "/dates/introduced",
    "/dates/published",
    "/dates/effective",
    "/dates/lastAction",
    "/actionHistory",
    "/statusHistory",
  ].some((root) => pointer === root || pointer.startsWith(`${root}/`));
}

function getPointerValue(record: PolicyRecord, pointer: string): unknown {
  const segments = pointer
    .split("/")
    .slice(1)
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
  let value: unknown = record;
  for (const segment of segments) {
    if (value === null || typeof value !== "object") {
      return undefined;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}

function provenanceAtPointer(
  record: PolicyRecord,
  pointer: string,
): PolicyRecord["fieldProvenance"] {
  return record.fieldProvenance
    .filter(({ field }) => field === pointer || field.startsWith(`${pointer}/`))
    .sort((left, right) => {
      const leftValue = canonicalizeJson(left);
      const rightValue = canonicalizeJson(right);
      return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
    });
}

function recordReceipt(
  state: MutableProjectionState,
  baseRecord: PolicyRecord,
  pointer: string,
  assertionReferences: readonly ProjectionAssertionReference[],
  inputFactIds: readonly string[],
  provenanceFactIds: readonly string[],
  ruleId = PROJECTION_RULE_ID,
  ruleVersion = PROJECTION_RULE_VERSION,
): void {
  if (state.receipts.some((receipt) => receipt.pointer === pointer)) {
    state.provenanceFailed = true;
    return;
  }
  const sortedInputFactIds = sortedUnique(inputFactIds);
  const sortedProvenanceFactIds = sortedUnique(provenanceFactIds);
  if (
    sortedInputFactIds.some((factId) => !state.facts.has(factId)) ||
    sortedProvenanceFactIds.some(
      (factId) => !sortedInputFactIds.includes(factId),
    )
  ) {
    state.provenanceFailed = true;
    return;
  }
  for (const factId of sortedInputFactIds) {
    state.accountedFactIds.add(factId);
  }
  const sortedReferences = sortedAssertionReferences(assertionReferences);
  for (const reference of sortedReferences) {
    state.accountedAssertionFacets.add(assertionFacetKey(reference));
  }
  state.receipts.push({
    pointer,
    baseValueDigest: safeDigest(getPointerValue(baseRecord, pointer)),
    outputValueDigest: safeDigest(getPointerValue(state.record, pointer)),
    baseProvenanceDigest: safeDigest(provenanceAtPointer(baseRecord, pointer)),
    outputProvenanceDigest: safeDigest(
      provenanceAtPointer(state.record, pointer),
    ),
    assertionReferences: sortedReferences,
    inputFactIds: sortedInputFactIds,
    provenanceFactIds: sortedProvenanceFactIds,
    ruleId,
    ruleVersion,
  });
}

function removeProvenanceAt(record: PolicyRecord, pointer: string): void {
  record.fieldProvenance = record.fieldProvenance.filter(
    ({ field }) => field !== pointer && !field.startsWith(`${pointer}/`),
  );
}

function addProvenance(
  state: MutableProjectionState,
  pointer: string,
  factIds: readonly string[],
  transformation: "copied" | "deterministic_mapping" | "combined",
  transformRuleId: string | null,
): string | null {
  const facts = sortedUnique(factIds)
    .map((factId) => state.facts.get(factId))
    .filter((fact): fact is SourceFact => fact !== undefined);
  const fact = facts[0];
  if (fact === undefined) {
    state.provenanceFailed = true;
    return null;
  }
  if (
    facts.some(
      (candidate) =>
        candidate.sourceIdentity.sourceId !== fact.sourceIdentity.sourceId ||
        candidate.sourceIdentity.sourceRecordId !==
          fact.sourceIdentity.sourceRecordId,
    )
  ) {
    state.provenanceFailed = true;
    return null;
  }
  state.record.fieldProvenance.push({
    field: pointer,
    sourcePath: fact.provenance.sourcePath,
    sourceId: fact.sourceIdentity.sourceId,
    sourceRecordId: fact.sourceIdentity.sourceRecordId,
    sourceUrl: fact.provenance.sourceUrl,
    retrievedAt: fact.provenance.retrievedAt,
    sourceUpdatedAt: fact.provenance.sourceUpdatedAt,
    adapterId: fact.provenance.adapterId,
    transformation,
    transformRuleId,
    validationState: "validated",
  });
  return fact.factId;
}

function replaceScalar(
  state: MutableProjectionState,
  baseRecord: PolicyRecord,
  pointer: string,
  value: string | null,
  factIds: readonly string[],
  transformation: "copied" | "deterministic_mapping" | "combined" = "copied",
  ruleId = PROJECTION_RULE_ID,
  ruleVersion = PROJECTION_RULE_VERSION,
  receiptFactIds: readonly string[] = factIds,
  assertionReferences: readonly ProjectionAssertionReference[] = [],
): void {
  const segments = pointer.split("/").slice(1);
  const parent = segments
    .slice(0, -1)
    .reduce<Record<string, unknown>>(
      (object, segment) => object[segment] as Record<string, unknown>,
      state.record as unknown as Record<string, unknown>,
    );
  parent[segments.at(-1)!] = value;
  removeProvenanceAt(state.record, pointer);
  const provenanceFactIds: string[] = [];
  if (factIds.length > 0) {
    const provenanceFactId = addProvenance(
      state,
      pointer,
      factIds,
      transformation,
      transformation === "copied" ? null : ruleId,
    );
    if (provenanceFactId !== null) {
      provenanceFactIds.push(provenanceFactId);
    }
  } else if (value !== null) {
    state.provenanceFailed = true;
  }
  recordReceipt(
    state,
    baseRecord,
    pointer,
    assertionReferences,
    receiptFactIds,
    provenanceFactIds,
    ruleId,
    ruleVersion,
  );
}

function addLoss(
  state: MutableProjectionState,
  assertionId: string,
  sourcePointer: string,
  targetPointer: string | null,
  lossCode: ProjectionLossCode,
): void {
  state.losses.push({ assertionId, sourcePointer, targetPointer, lossCode });
  state.accountedAssertionFacets.add(
    assertionFacetKey({ assertionId, sourcePointer }),
  );
}

function isSupportedTemporalAssertion(
  assertion: TemporalAssertion,
): assertion is SupportedTemporalAssertion {
  return assertion.evidence.state === "supported" && "value" in assertion;
}

function temporalPointValue(assertion: TemporalAssertion): string | null {
  if (!isSupportedTemporalAssertion(assertion)) {
    return null;
  }
  return assertion.value.kind === "date" || assertion.value.kind === "date_time"
    ? assertion.value.value
    : null;
}

function dateOnlyValue(assertion: TemporalAssertion): string | null {
  return isSupportedTemporalAssertion(assertion) &&
    assertion.value.kind === "date"
    ? assertion.value.value
    : null;
}

function projectionHistoryEvent(
  event: LifecycleEvent,
  facts: ReadonlyMap<string, SourceFact>,
): PolicyRecord["actionHistory"][number] | null {
  const labelFact = factText(facts, event.eventLabelFactId, "event_label");
  if (labelFact === null) {
    return null;
  }
  return {
    date: temporalPointValue(event.validTime),
    sourceLabel: labelFact.value.value,
    sourceUrl: labelFact.provenance.sourceUrl,
  };
}

function eventsAreProjectionEquivalent(
  left: LifecycleEvent,
  right: LifecycleEvent,
  facts: ReadonlyMap<string, SourceFact>,
): boolean {
  const leftProjection = projectionHistoryEvent(left, facts);
  const rightProjection = projectionHistoryEvent(right, facts);
  const assertedSemantics = (event: LifecycleEvent) => ({
    contractVersion: event.contractVersion,
    sourceIdentity: event.sourceIdentity,
    instrumentId: event.instrumentId,
    versionId: event.versionId ?? null,
    eventLabelFactId: event.eventLabelFactId,
    eventType: event.eventType,
    actor: event.actor ?? null,
    observedTime: event.observedTime,
    publishedTime: event.publishedTime,
    effectiveTime: event.effectiveTime,
    validTime: event.validTime,
    sourceStatus: event.sourceStatus ?? null,
    evidence: event.evidence,
  });
  return (
    leftProjection !== null &&
    rightProjection !== null &&
    canonicalizeJson(leftProjection) === canonicalizeJson(rightProjection) &&
    canonicalizeJson(assertedSemantics(left)) ===
      canonicalizeJson(assertedSemantics(right))
  );
}

function orderEvents(
  events: readonly LifecycleEvent[],
  facts: ReadonlyMap<string, SourceFact>,
): { state: "ordered"; events: LifecycleEvent[] } | { state: "indeterminate" } {
  if (
    events.some(
      (event) =>
        !isSupportedTemporalAssertion(event.validTime) ||
        projectionHistoryEvent(event, facts) === null,
    )
  ) {
    return { state: "indeterminate" };
  }

  for (let left = 0; left < events.length; left += 1) {
    for (let right = left + 1; right < events.length; right += 1) {
      const leftEvent = events[left]!;
      const rightEvent = events[right]!;
      const comparison = compareTemporalValues(
        (leftEvent.validTime as SupportedTemporalAssertion).value,
        (rightEvent.validTime as SupportedTemporalAssertion).value,
      );
      if (
        comparison !== "before" &&
        comparison !== "after" &&
        !eventsAreProjectionEquivalent(leftEvent, rightEvent, facts)
      ) {
        return { state: "indeterminate" };
      }
    }
  }

  return {
    state: "ordered",
    events: [...events].sort((left, right) => {
      const comparison = compareTemporalValues(
        (left.validTime as SupportedTemporalAssertion).value,
        (right.validTime as SupportedTemporalAssertion).value,
      );
      if (comparison === "before") {
        return -1;
      }
      if (comparison === "after") {
        return 1;
      }
      return left.eventId < right.eventId ? -1 : 1;
    }),
  };
}

function replaceActionHistory(
  state: MutableProjectionState,
  baseRecord: PolicyRecord,
  events: readonly LifecycleEvent[],
): LifecycleEvent | null {
  removeProvenanceAt(state.record, "/actionHistory");
  const ordering = orderEvents(events, state.facts);
  if (ordering.state === "indeterminate") {
    state.record.actionHistory = [];
    for (const event of events) {
      addLoss(
        state,
        event.eventId,
        "/validTime",
        "/actionHistory",
        "history_order_not_projected",
      );
    }
    recordReceipt(
      state,
      baseRecord,
      "/actionHistory",
      events.flatMap((event) => [
        { assertionId: event.eventId, sourcePointer: "/eventLabelFactId" },
        { assertionId: event.eventId, sourcePointer: "/validTime" },
      ]),
      events.flatMap((event) => [
        event.eventLabelFactId,
        ...relevantDateFacts(state, event, event.validTime, "valid_time"),
      ]),
      [],
    );
    return null;
  }

  state.record.actionHistory = ordering.events.map((event) =>
    projectionHistoryEvent(event, state.facts),
  ) as PolicyRecord["actionHistory"];
  ordering.events.forEach((event, index) => {
    const labelFactIds = [event.eventLabelFactId];
    const timeFactIds = exactDateFacts(
      state,
      event,
      event.validTime,
      "valid_time",
    );
    const mappedDate =
      !isSupportedTemporalAssertion(event.validTime) ||
      event.validTime.value.kind === "interval" ||
      timeFactIds.length === 0;
    if (!mappedDate) {
      addProvenance(
        state,
        `/actionHistory/${index}/date`,
        timeFactIds,
        "copied",
        null,
      );
    }
    addProvenance(
      state,
      `/actionHistory/${index}/sourceLabel`,
      labelFactIds,
      "copied",
      null,
    );
    addProvenance(
      state,
      `/actionHistory/${index}/sourceUrl`,
      labelFactIds,
      "copied",
      null,
    );
    if (
      isSupportedTemporalAssertion(event.validTime) &&
      event.validTime.value.kind === "interval"
    ) {
      addLoss(
        state,
        event.eventId,
        "/validTime",
        `/actionHistory/${index}/date`,
        "temporal_interval_not_projected",
      );
    }
  });
  recordReceipt(
    state,
    baseRecord,
    "/actionHistory",
    ordering.events.flatMap((event) => [
      { assertionId: event.eventId, sourcePointer: "/eventLabelFactId" },
      { assertionId: event.eventId, sourcePointer: "/validTime" },
    ]),
    ordering.events.flatMap((event) => [
      event.eventLabelFactId,
      ...relevantDateFacts(state, event, event.validTime, "valid_time"),
    ]),
    ordering.events.flatMap((event) => [
      event.eventLabelFactId,
      ...(temporalPointValue(event.validTime) === null
        ? []
        : exactDateFacts(state, event, event.validTime, "valid_time")),
    ]),
  );
  return ordering.events.at(-1) ?? null;
}

function replaceStatusHistory(
  state: MutableProjectionState,
  baseRecord: PolicyRecord,
  candidates: readonly StatusCandidate[],
): void {
  removeProvenanceAt(state.record, "/statusHistory");
  const ordered = [...candidates].sort((left, right) => {
    const comparison = compareTemporalValues(left.asOf.value, right.asOf.value);
    return comparison === "before" ? -1 : comparison === "after" ? 1 : 0;
  });
  state.record.statusHistory = ordered.map((candidate) => ({
    date: temporalPointValue(candidate.asOf),
    sourceLabel: candidate.label,
    sourceUrl: candidate.labelFact.provenance.sourceUrl,
  }));
  ordered.forEach((candidate, index) => {
    addProvenance(
      state,
      `/statusHistory/${index}/date`,
      [candidate.asOfFact.factId],
      "copied",
      null,
    );
    addProvenance(
      state,
      `/statusHistory/${index}/sourceLabel`,
      [candidate.labelFact.factId],
      "copied",
      null,
    );
    addProvenance(
      state,
      `/statusHistory/${index}/sourceUrl`,
      [candidate.labelFact.factId],
      "copied",
      null,
    );
  });
  recordReceipt(
    state,
    baseRecord,
    "/statusHistory",
    ordered.flatMap((candidate) => [
      {
        assertionId: candidate.event.eventId,
        sourcePointer: "/sourceStatus/statusLabelFactId",
      },
      {
        assertionId: candidate.event.eventId,
        sourcePointer: "/sourceStatus/statusAsOf",
      },
    ]),
    ordered.flatMap((candidate) => [
      candidate.labelFact.factId,
      candidate.asOfFact.factId,
    ]),
    ordered.flatMap((candidate) => [
      candidate.labelFact.factId,
      candidate.asOfFact.factId,
    ]),
  );
}

function relevantDateFacts(
  state: MutableProjectionState,
  event: LifecycleEvent,
  assertion: TemporalAssertion,
  predicate: TemporalFactPredicate,
): string[] {
  return temporalEvidenceFacts(
    assertion,
    state.facts,
    predicate,
    event.sourceIdentity,
  ).map(({ factId }) => factId);
}

function exactDateFacts(
  state: MutableProjectionState,
  event: LifecycleEvent,
  assertion: TemporalAssertion,
  predicate: TemporalFactPredicate,
): string[] {
  return isSupportedTemporalAssertion(assertion)
    ? exactTemporalFacts(
        assertion,
        state.facts,
        predicate,
        event.sourceIdentity,
      ).map(({ factId }) => factId)
    : [];
}

function replaceTypedDate(
  state: MutableProjectionState,
  baseRecord: PolicyRecord,
  events: readonly LifecycleEvent[],
  pointer: string,
  predicate: TemporalFactPredicate,
  assertion: (event: LifecycleEvent) => TemporalAssertion,
): void {
  const sourcePointer =
    predicate === "published_time"
      ? "/publishedTime"
      : predicate === "effective_time"
        ? "/effectiveTime"
        : "/validTime";
  const temporals = events.map((event) => ({
    event,
    assertion: assertion(event),
  }));
  const values = temporals.map(({ assertion: temporal }) =>
    dateOnlyValue(temporal),
  );
  const projected =
    events.length > 0 &&
    values.every((value) => value !== null && value === values[0])
      ? values[0]!
      : null;
  const receiptFactIds = temporals.flatMap(({ event, assertion: temporal }) =>
    relevantDateFacts(state, event, temporal, predicate),
  );
  const exactFactIds = temporals.flatMap(({ event, assertion: temporal }) =>
    exactDateFacts(state, event, temporal, predicate),
  );
  const provenanceFactIds = projected === null ? [] : exactFactIds;
  replaceScalar(
    state,
    baseRecord,
    pointer,
    projected,
    provenanceFactIds,
    projected === null
      ? provenanceFactIds.length > 1
        ? "combined"
        : "deterministic_mapping"
      : events.length > 1
        ? "combined"
        : "copied",
    PROJECTION_RULE_ID,
    PROJECTION_RULE_VERSION,
    receiptFactIds,
    events.map((event) => ({ assertionId: event.eventId, sourcePointer })),
  );

  events.forEach((event) => {
    const temporal = assertion(event);
    if (!isSupportedTemporalAssertion(temporal)) {
      addLoss(
        state,
        event.eventId,
        sourcePointer,
        pointer,
        "temporal_assertion_not_projected",
      );
    } else if (temporal.value.kind === "date_time") {
      addLoss(
        state,
        event.eventId,
        sourcePointer,
        pointer,
        "temporal_precision_not_projected",
      );
    } else if (temporal.value.kind === "interval") {
      addLoss(
        state,
        event.eventId,
        sourcePointer,
        pointer,
        "temporal_interval_not_projected",
      );
    } else if (projected === null) {
      addLoss(
        state,
        event.eventId,
        sourcePointer,
        pointer,
        "history_order_not_projected",
      );
    }
  });
}

function replaceLastActionDate(
  state: MutableProjectionState,
  baseRecord: PolicyRecord,
  events: readonly LifecycleEvent[],
  latestEvent: LifecycleEvent | null,
): void {
  if (events.length === 0) {
    replaceScalar(
      state,
      baseRecord,
      "/dates/lastAction",
      null,
      [],
      "deterministic_mapping",
      PROJECTION_RULE_ID,
      PROJECTION_RULE_VERSION,
      [],
      [],
    );
    return;
  }
  if (latestEvent === null) {
    replaceScalar(
      state,
      baseRecord,
      "/dates/lastAction",
      null,
      [],
      "combined",
      PROJECTION_RULE_ID,
      PROJECTION_RULE_VERSION,
      events.flatMap((event) =>
        relevantDateFacts(state, event, event.validTime, "valid_time"),
      ),
      events.map((event) => ({
        assertionId: event.eventId,
        sourcePointer: "/validTime",
      })),
    );
    for (const event of events) {
      addLoss(
        state,
        event.eventId,
        "/validTime",
        "/dates/lastAction",
        "history_order_not_projected",
      );
    }
    return;
  }
  const value = dateOnlyValue(latestEvent.validTime);
  const receiptFactIds = relevantDateFacts(
    state,
    latestEvent,
    latestEvent.validTime,
    "valid_time",
  );
  const exactFactIds = exactDateFacts(
    state,
    latestEvent,
    latestEvent.validTime,
    "valid_time",
  );
  replaceScalar(
    state,
    baseRecord,
    "/dates/lastAction",
    value,
    value === null ? [] : exactFactIds,
    value === null ? "deterministic_mapping" : "copied",
    PROJECTION_RULE_ID,
    PROJECTION_RULE_VERSION,
    receiptFactIds,
    [
      {
        assertionId: latestEvent.eventId,
        sourcePointer: "/validTime",
      },
    ],
  );
  if (!isSupportedTemporalAssertion(latestEvent.validTime)) {
    addLoss(
      state,
      latestEvent.eventId,
      "/validTime",
      "/dates/lastAction",
      "temporal_assertion_not_projected",
    );
  } else if (latestEvent.validTime.value.kind === "date_time") {
    addLoss(
      state,
      latestEvent.eventId,
      "/validTime",
      "/dates/lastAction",
      "temporal_precision_not_projected",
    );
  } else if (latestEvent.validTime.value.kind === "interval") {
    addLoss(
      state,
      latestEvent.eventId,
      "/validTime",
      "/dates/lastAction",
      "temporal_interval_not_projected",
    );
  }
}

function lossSort(left: ProjectionLoss, right: ProjectionLoss): number {
  const leftKey = `${left.assertionId}\u0000${left.sourcePointer}\u0000${left.targetPointer ?? ""}\u0000${left.lossCode}`;
  const rightKey = `${right.assertionId}\u0000${right.sourcePointer}\u0000${right.targetPointer ?? ""}\u0000${right.lossCode}`;
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function receiptSort(
  left: ReplacementReceipt,
  right: ReplacementReceipt,
): number {
  return left.pointer < right.pointer
    ? -1
    : left.pointer > right.pointer
      ? 1
      : 0;
}

function addExhaustiveLosses(
  state: MutableProjectionState,
  bundle: LifecycleBundle,
): void {
  for (const fact of bundle.sourceFacts) {
    if (!state.accountedFactIds.has(fact.factId)) {
      addLoss(state, fact.factId, "", null, "source_fact_not_projected");
    }
  }
  for (const instrument of bundle.instruments) {
    addLoss(
      state,
      instrument.instrumentId,
      "",
      null,
      "instrument_metadata_not_projected",
    );
  }
  for (const version of bundle.versions) {
    addLoss(state, version.versionId, "", null, "version_not_projected");
  }
  for (const equivalence of bundle.equivalenceAssertions) {
    addLoss(
      state,
      equivalence.assertionId,
      "",
      null,
      "equivalence_not_projected",
    );
  }
  for (const event of bundle.events) {
    if (event.actor !== undefined) {
      addLoss(state, event.eventId, "/actor", null, "actor_not_projected");
    }
    if (event.sourceStatus === undefined) {
      addLoss(
        state,
        event.eventId,
        "/eventType",
        "/status/normalized",
        "non_status_event_not_projected_to_status",
      );
    } else if (
      !state.accountedAssertionFacets.has(
        assertionFacetKey({
          assertionId: event.eventId,
          sourcePointer: "/sourceStatus/statusLabelFactId",
        }),
      ) ||
      !state.accountedAssertionFacets.has(
        assertionFacetKey({
          assertionId: event.eventId,
          sourcePointer: "/sourceStatus/statusAsOf",
        }),
      )
    ) {
      addLoss(
        state,
        event.eventId,
        "/sourceStatus",
        "/status/normalized",
        "source_status_not_projected",
      );
    }
    for (const sourcePointer of [
      "/observedTime",
      "/publishedTime",
      "/effectiveTime",
      "/validTime",
    ] as const) {
      if (
        !state.accountedAssertionFacets.has(
          assertionFacetKey({ assertionId: event.eventId, sourcePointer }),
        )
      ) {
        addLoss(
          state,
          event.eventId,
          sourcePointer,
          null,
          "temporal_assertion_not_projected",
        );
      }
    }
  }

  const unique = new Map<string, ProjectionLoss>();
  for (const loss of state.losses) {
    unique.set(
      `${loss.assertionId}\u0000${loss.sourcePointer}\u0000${loss.targetPointer ?? ""}\u0000${loss.lossCode}`,
      loss,
    );
  }
  state.losses = [...unique.values()].sort(lossSort);
}

function latestStatusCandidate(
  candidates: readonly StatusCandidate[],
): StatusCandidate | null {
  const latest = candidates.filter((candidate, candidateIndex) =>
    candidates.every(
      (other, otherIndex) =>
        candidateIndex === otherIndex ||
        compareTemporalValues(candidate.asOf.value, other.asOf.value) ===
          "after",
    ),
  );
  return latest.length === 1 ? latest[0]! : null;
}

function statusCandidatesHaveTotalOrder(
  candidates: readonly StatusCandidate[],
): boolean {
  for (let left = 0; left < candidates.length; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      const comparison = compareTemporalValues(
        candidates[left]!.asOf.value,
        candidates[right]!.asOf.value,
      );
      if (comparison !== "before" && comparison !== "after") {
        return false;
      }
    }
  }
  return true;
}

function sourceIdentityMismatch(
  instrument: PolicyInstrument,
  record: unknown,
): boolean {
  if (!isPlainObject(record) || !isPlainObject(record.source)) {
    return false;
  }
  const sourceId = record.source.id;
  const sourceRecordId = record.source.recordId;
  if (typeof sourceId !== "string" || typeof sourceRecordId !== "string") {
    return false;
  }
  return (
    instrument.sourceIdentity.sourceId !== sourceId ||
    instrument.sourceIdentity.sourceRecordId !== sourceRecordId
  );
}

export function projectLifecycleToPolicyRecord14(
  input: PolicyRecord14ProjectionInput,
): PolicyRecord14ProjectionResult {
  const initialReceipt = identityReceipt(
    input.bundle,
    input.instrumentId,
    input.baseRecord,
    input.policy,
    input.validationContext,
  );
  const earlyCodes = new Set<ProjectionRefusalCode>();
  const earlyBlockingIds = new Set<string>();
  const projectionPolicyShapeValid = validProjectionPolicy(input.policy);
  const projectionPolicyContextBound =
    projectionPolicyShapeValid &&
    input.policy.validationContextDigest ===
      initialReceipt.validationContextDigest;
  if (!projectionPolicyShapeValid || !projectionPolicyContextBound) {
    earlyCodes.add("projection_policy_mismatch");
  }
  const baseRecordHasTargetVersion =
    isPlainObject(input.baseRecord) &&
    input.baseRecord.schemaVersion === POLICY_RECORD_14_TARGET_VERSION;
  if (!baseRecordHasTargetVersion) {
    earlyCodes.add("base_record_schema_version_mismatch");
  }
  let baseRecordSchemaValid = true;
  try {
    assertPolicyRecord14Schema(input.baseRecord);
  } catch {
    baseRecordSchemaValid = false;
    earlyCodes.add("target_record_1_4_validation_failed");
  }
  if (baseRecordSchemaValid) {
    try {
      validatePolicyRecord14Compatibility(
        input.baseRecord,
        input.validationContext,
        initialReceipt.validationContextDigest,
      );
    } catch {
      earlyCodes.add("target_record_1_4_validation_failed");
    }
  }
  let bundle: LifecycleBundle;
  try {
    if (
      !isPlainObject(input.bundle) ||
      typeof input.bundle.bundleDigest !== "string"
    ) {
      throw new TypeError("bundle digest is absent");
    }
    const suppliedDigest = input.bundle.bundleDigest;
    const withoutDigest = structuredClone(input.bundle) as unknown as Record<
      string,
      unknown
    >;
    delete withoutDigest.bundleDigest;
    bundle = normalizeLifecycleBundle(
      withoutDigest as unknown as LifecycleBundleWithoutDigest,
    ) as LifecycleBundle;
    if (suppliedDigest !== bundle.bundleDigest) {
      earlyCodes.add("input_digest_mismatch");
    }
  } catch (error) {
    earlyCodes.add(
      isIntegrityReplayError(error)
        ? "input_digest_mismatch"
        : "invalid_lifecycle_bundle",
    );
    return refused(initialReceipt, earlyCodes, earlyBlockingIds);
  }

  const receipt = initialReceipt;
  const codes = new Set<ProjectionRefusalCode>(earlyCodes);
  const blockingIds = new Set<string>();
  const instrument = bundle.instruments.find(
    ({ instrumentId }) => instrumentId === input.instrumentId,
  );
  if (instrument === undefined) {
    codes.add("invalid_lifecycle_bundle");
    return refused(receipt, codes, blockingIds);
  }

  const projectionPolicyValid =
    projectionPolicyShapeValid &&
    projectionPolicyContextBound &&
    validProjectionPolicy(input.policy, instrument.sourceIdentity.sourceId);
  if (!projectionPolicyValid) {
    codes.add("projection_policy_mismatch");
  }
  if (sourceIdentityMismatch(instrument, input.baseRecord)) {
    codes.add("base_identity_mismatch");
    blockingIds.add(instrument.instrumentId);
  }
  const baseObject = isPlainObject(input.baseRecord) ? input.baseRecord : null;
  if (
    baseObject !== null &&
    ((Object.hasOwn(baseObject, "accordContext") &&
      baseObject.accordContext !== null) ||
      (Object.hasOwn(baseObject, "judicialContext") &&
        baseObject.judicialContext !== null) ||
      (typeof baseObject.documentType === "string" &&
        [
          "intergovernmental_accord",
          "court_decision",
          "administrative_decision",
        ].includes(baseObject.documentType)))
  ) {
    codes.add("base_specialization_unsupported");
  }
  if (
    baseObject !== null &&
    Array.isArray(baseObject.sourceDocumentRelationships) &&
    baseObject.sourceDocumentRelationships.length > 0
  ) {
    codes.add("base_relationship_graph_requires_batch_projection");
  }

  const selectedVersions = bundle.versions.filter(
    ({ instrumentId }) => instrumentId === instrument.instrumentId,
  );
  if (selectedVersions.length > 1) {
    codes.add("version_cardinality_unrepresentable");
    selectedVersions.forEach(({ versionId }) => blockingIds.add(versionId));
  }

  for (const relationship of bundle.relationshipAssertions) {
    codes.add("relationship_unrepresentable_in_one_record");
    blockingIds.add(relationship.assertionId);
    if (relationship.evidence.state !== "supported") {
      codes.add("uncertain_relationship_unrepresentable");
    }
    if (
      new Set(
        relationshipReferences(relationship).map(
          ({ sourceIdentity }) => sourceIdentity.sourceId,
        ),
      ).size > 1
    ) {
      codes.add("cross_source_relationship_unrepresentable");
    }
  }

  const facts = factIndex(bundle);
  const selectedEvents = bundle.events.filter(
    ({ instrumentId }) => instrumentId === instrument.instrumentId,
  );
  const statusEvents = selectedEvents.filter(
    (event) => event.sourceStatus !== undefined,
  );
  if (statusEvents.length === 0) {
    codes.add("missing_status_observation");
  }

  const mapping = new Map(
    projectionPolicyValid
      ? input.policy.statusMappings.map((entry) => [
          entry.sourceLabel,
          entry.normalizedStatus,
        ])
      : [],
  );
  const statusCandidates: StatusCandidate[] = [];
  for (const event of statusEvents) {
    const sourceStatus = event.sourceStatus!;
    const evidenceCode = evidenceRefusalCode(sourceStatus.evidence);
    if (evidenceCode !== null) {
      codes.add(evidenceCode);
      blockingIds.add(event.eventId);
      continue;
    }
    const labelFact = factText(
      facts,
      sourceStatus.statusLabelFactId,
      "source_status_label",
    );
    if (labelFact === null) {
      codes.add("invalid_lifecycle_bundle");
      blockingIds.add(event.eventId);
      continue;
    }
    if (
      sourceStatus.statusAsOf.evidence.state !== "supported" ||
      !("value" in sourceStatus.statusAsOf)
    ) {
      codes.add("missing_status_as_of");
      blockingIds.add(event.eventId);
      continue;
    }
    const asOfFact = exactTemporalFact(
      sourceStatus.statusAsOf,
      facts,
      "status_as_of",
      event.sourceIdentity,
    );
    if (asOfFact === null) {
      codes.add("missing_status_as_of");
      blockingIds.add(event.eventId);
      continue;
    }
    if (!projectionPolicyValid) {
      continue;
    }
    const normalizedStatus = mapping.get(labelFact.value.value);
    if (normalizedStatus === undefined) {
      codes.add("missing_status_mapping");
      blockingIds.add(event.eventId);
      continue;
    }
    statusCandidates.push({
      event,
      labelFact,
      asOfFact,
      label: labelFact.value.value,
      asOf: sourceStatus.statusAsOf,
      normalizedStatus,
    });
  }

  const latest = latestStatusCandidate(statusCandidates);
  if (
    statusCandidates.length > 0 &&
    (latest === null || !statusCandidatesHaveTotalOrder(statusCandidates))
  ) {
    codes.add("concurrent_unrepresentable_state");
    statusCandidates.forEach(({ event }) => blockingIds.add(event.eventId));
  }

  if (codes.size > 0 || latest === null) {
    return refused(receipt, codes, blockingIds);
  }

  const record = structuredClone(input.baseRecord);
  const state: MutableProjectionState = {
    record,
    facts,
    accountedFactIds: new Set<string>(),
    accountedAssertionFacets: new Set<string>(),
    losses: [],
    receipts: [],
    provenanceFailed: false,
  };

  replaceScalar(
    state,
    input.baseRecord,
    "/status/normalized",
    latest.normalizedStatus,
    [latest.labelFact.factId],
    "deterministic_mapping",
    input.policy.ruleId,
    input.policy.ruleVersion,
    [latest.labelFact.factId],
    [
      {
        assertionId: latest.event.eventId,
        sourcePointer: "/sourceStatus/statusLabelFactId",
      },
    ],
  );
  replaceScalar(
    state,
    input.baseRecord,
    "/status/sourceLabel",
    latest.label,
    [latest.labelFact.factId],
    "copied",
    PROJECTION_RULE_ID,
    PROJECTION_RULE_VERSION,
    [latest.labelFact.factId],
    [
      {
        assertionId: latest.event.eventId,
        sourcePointer: "/sourceStatus/statusLabelFactId",
      },
    ],
  );
  replaceScalar(
    state,
    input.baseRecord,
    "/status/asOf",
    temporalPointValue(latest.asOf),
    [latest.asOfFact.factId],
    "copied",
    PROJECTION_RULE_ID,
    PROJECTION_RULE_VERSION,
    [latest.asOfFact.factId],
    [
      {
        assertionId: latest.event.eventId,
        sourcePointer: "/sourceStatus/statusAsOf",
      },
    ],
  );
  replaceStatusHistory(state, input.baseRecord, statusCandidates);

  const supportedEvents = selectedEvents.filter(
    ({ evidence }) => evidence.state === "supported",
  );
  const latestActionEvent = replaceActionHistory(
    state,
    input.baseRecord,
    supportedEvents,
  );
  replaceTypedDate(
    state,
    input.baseRecord,
    supportedEvents.filter(({ eventType }) => eventType === "introduction"),
    "/dates/introduced",
    "valid_time",
    (event) => event.validTime,
  );
  replaceTypedDate(
    state,
    input.baseRecord,
    supportedEvents.filter(({ eventType }) => eventType === "publication"),
    "/dates/published",
    "published_time",
    (event) => event.publishedTime,
  );
  replaceTypedDate(
    state,
    input.baseRecord,
    supportedEvents.filter(({ eventType }) => eventType === "effective_date"),
    "/dates/effective",
    "effective_time",
    (event) => event.effectiveTime,
  );
  replaceLastActionDate(
    state,
    input.baseRecord,
    supportedEvents,
    latestActionEvent,
  );

  addExhaustiveLosses(state, bundle);

  if (state.provenanceFailed) {
    codes.add("provenance_replacement_failed");
  }
  if (
    canonicalizeJson(protectedProjection(input.baseRecord)) !==
    canonicalizeJson(protectedProjection(state.record))
  ) {
    codes.add("protected_field_mutation_detected");
  }
  try {
    validatePolicyRecord14Compatibility(
      state.record,
      input.validationContext,
      input.policy.validationContextDigest,
    );
  } catch {
    codes.add("target_record_1_4_validation_failed");
  }
  if (
    canonicalizeJson(protectedProjection(input.baseRecord)) !==
    canonicalizeJson(protectedProjection(state.record))
  ) {
    codes.add("protected_field_mutation_detected");
  }
  if (codes.size > 0) {
    return refused(receipt, codes, blockingIds);
  }

  return immutableCanonicalClone({
    outcome: "projected",
    ...receipt,
    lossy: true,
    outputRecordDigest: canonicalJsonDigest(state.record),
    losses: state.losses,
    replacementReceipts: state.receipts.sort(receiptSort),
    record: state.record,
  } as unknown as JsonValue) as unknown as ProjectedPolicyRecord14;
}
