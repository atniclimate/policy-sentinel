import {
  ASSERTION_CONTRACT_VERSION,
  CANONICALIZATION_VERSION,
  canonicalJsonDigest,
  canonicalizeJson,
  createEventId,
  createInstrumentId,
  createVersionId,
  immutableCanonicalClone,
  IntegrityReplayError,
  validateDerivedAssertion,
  validateEvidenceReferences,
  validateEvidenceState,
  validateSourceFact,
  validateSourceQualifiedIdentity,
  validateTemporalAssertion,
  type DerivedAssertion,
  type EvidenceState,
  type JsonValue,
  type SourceFact,
  type SourceFactPredicate,
  type SourceQualifiedIdentity,
  type SupportedEvidence,
  type TemporalAssertion,
} from "../assertions";
import {
  createEquivalenceAssertionId,
  createRelationshipAssertionId,
} from "./ids";
import {
  EQUIVALENCE_RESOLUTIONS,
  LIFECYCLE_CONTRACT_VERSION,
  LIFECYCLE_EVENT_TYPES,
  RELATIONSHIP_TYPES,
  type EquivalenceAssertion,
  type InstrumentReference,
  type InstrumentVersion,
  type LifecycleActor,
  type LifecycleBundle,
  type LifecycleBundleWithoutDigest,
  type LifecycleEvent,
  type LifecycleReference,
  type PolicyInstrument,
  type RelationshipAssertion,
  type RelationshipType,
  type ReproductionBasis,
  type RuleReference,
  type SourceStatusObservation,
  type SupportedPointTemporalAssertion,
} from "./types";

type JsonObject = Record<string, unknown>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMANTIC_VERSION_PATTERN =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const REPRODUCTION_BASES: readonly ReproductionBasis[] = [
  "metadata_and_links",
  "reviewed_excerpt",
  "reviewed_full_text",
];

function fail(path: string, detail: string): never {
  throw new TypeError(`${path}: ${detail}`);
}

function objectValue(value: unknown, path: string): JsonObject {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail(path, "expected a plain object");
  }
  return value as JsonObject;
}

function exactKeys(
  object: JsonObject,
  path: string,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) {
      fail(`${path}.${key}`, "unexpected field");
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(object, key)) {
      fail(`${path}.${key}`, "required field is absent");
    }
  }
}

function arrayValue(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    fail(path, "expected an array");
  }
  return value;
}

function exactText(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim() ||
    [...value].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 32 || codePoint === 127;
    })
  ) {
    fail(
      path,
      "expected exact non-empty trimmed text without control characters",
    );
  }
  return value;
}

function slug(value: unknown, path: string): string {
  const result = exactText(value, path);
  if (!SLUG_PATTERN.test(result)) {
    fail(path, "expected a lowercase slug");
  }
  return result;
}

function semanticVersion(value: unknown, path: string): string {
  const result = exactText(value, path);
  if (!SEMANTIC_VERSION_PATTERN.test(result)) {
    fail(path, "expected a semantic version");
  }
  return result;
}

function sameIdentity(
  left: SourceQualifiedIdentity,
  right: SourceQualifiedIdentity,
): boolean {
  return (
    left.sourceId === right.sourceId &&
    left.sourceRecordId === right.sourceRecordId
  );
}

function cloneIdentity(value: unknown, path: string): SourceQualifiedIdentity {
  return validateSourceQualifiedIdentity(
    value,
    path,
  ) as SourceQualifiedIdentity;
}

function cloneEvidence(
  value: unknown,
  facts: readonly SourceFact[],
  path: string,
): EvidenceState {
  const evidence = validateEvidenceState(value, path) as EvidenceState;
  validateEvidenceReferences(evidence, facts);
  return evidence;
}

function cloneSupportedEvidence(
  value: unknown,
  facts: readonly SourceFact[],
  path: string,
): SupportedEvidence {
  const evidence = cloneEvidence(value, facts, path);
  if (evidence.state !== "supported") {
    fail(`${path}.state`, "expected supported evidence");
  }
  return evidence;
}

function cloneTemporal(
  value: unknown,
  facts: readonly SourceFact[],
  path: string,
): TemporalAssertion {
  const temporal = validateTemporalAssertion(value, path) as TemporalAssertion;
  validateEvidenceReferences(temporal.evidence, facts);
  return temporal;
}

function identityRule(value: unknown, path: string): RuleReference {
  const object = objectValue(value, path);
  exactKeys(object, path, ["ruleId", "ruleVersion"]);
  return {
    ruleId: slug(object.ruleId, `${path}.ruleId`),
    ruleVersion: semanticVersion(object.ruleVersion, `${path}.ruleVersion`),
  };
}

function factIndex(
  sourceFacts: readonly SourceFact[],
): Map<string, SourceFact> {
  const index = new Map<string, SourceFact>();
  for (const fact of sourceFacts) {
    if (index.has(fact.factId)) {
      fail("$.sourceFacts", `duplicate fact ID ${fact.factId}`);
    }
    index.set(fact.factId, fact);
  }
  return index;
}

function requireFact(
  facts: ReadonlyMap<string, SourceFact>,
  factId: unknown,
  predicate: SourceFactPredicate,
  sourceIdentity: SourceQualifiedIdentity,
  path: string,
): SourceFact {
  const id = exactText(factId, path);
  const fact = facts.get(id);
  if (fact === undefined) {
    fail(path, `unknown fact ID ${id}`);
  }
  if (fact.predicate !== predicate) {
    fail(path, `expected ${predicate} fact`);
  }
  if (!sameIdentity(fact.sourceIdentity, sourceIdentity)) {
    fail(path, "fact source identity does not match its lifecycle assertion");
  }
  return fact;
}

function requireFactForAnyIdentity(
  facts: ReadonlyMap<string, SourceFact>,
  factId: unknown,
  predicate: SourceFactPredicate,
  sourceIdentities: readonly SourceQualifiedIdentity[],
  path: string,
): SourceFact {
  const id = exactText(factId, path);
  const fact = facts.get(id);
  if (fact === undefined) {
    fail(path, `unknown fact ID ${id}`);
  }
  if (fact.predicate !== predicate) {
    fail(path, `expected ${predicate} fact`);
  }
  if (
    !sourceIdentities.some((identity) =>
      sameIdentity(fact.sourceIdentity, identity),
    )
  ) {
    fail(path, "fact source identity does not match a relationship endpoint");
  }
  return fact;
}

function evidenceIncludes(evidence: EvidenceState, fact: SourceFact): boolean {
  return evidence.factReferences.some(
    (reference) =>
      reference.factId === fact.factId &&
      reference.factDigest === fact.factDigest,
  );
}

function requireEvidenceFact(
  evidence: EvidenceState,
  fact: SourceFact,
  path: string,
): void {
  if (!evidenceIncludes(evidence, fact)) {
    fail(path, `evidence does not cite ${fact.factId}`);
  }
}

function validateTemporalDimension(
  temporal: TemporalAssertion,
  predicate: Extract<
    SourceFactPredicate,
    | "observed_time"
    | "published_time"
    | "effective_time"
    | "valid_time"
    | "status_as_of"
  >,
  sourceIdentity: SourceQualifiedIdentity,
  facts: ReadonlyMap<string, SourceFact>,
  path: string,
): void {
  if (temporal.evidence.state === "unknown") {
    return;
  }
  const matchingFacts = temporal.evidence.factReferences
    .map((reference) => facts.get(reference.factId))
    .filter(
      (fact): fact is SourceFact =>
        fact !== undefined &&
        fact.predicate === predicate &&
        sameIdentity(fact.sourceIdentity, sourceIdentity),
    );
  if (matchingFacts.length === 0) {
    fail(path, `evidence must cite a same-identity ${predicate} fact`);
  }
  if (
    temporal.evidence.state === "supported" &&
    "value" in temporal &&
    !matchingFacts.some(
      (fact) =>
        canonicalizeJson(fact.value) === canonicalizeJson(temporal.value),
    )
  ) {
    fail(`${path}.value`, `does not replay a cited ${predicate} fact`);
  }
}

function policyInstrument(
  value: unknown,
  facts: readonly SourceFact[],
  factsById: ReadonlyMap<string, SourceFact>,
  path: string,
): PolicyInstrument {
  const object = objectValue(value, path);
  exactKeys(
    object,
    path,
    [
      "contractVersion",
      "instrumentId",
      "sourceIdentity",
      "sourceIdentifierFactId",
      "identityRule",
      "evidence",
      "automaticCrossSourceMerge",
    ],
    ["titleFactId"],
  );
  if (object.contractVersion !== LIFECYCLE_CONTRACT_VERSION) {
    fail(`${path}.contractVersion`, `expected ${LIFECYCLE_CONTRACT_VERSION}`);
  }
  if (object.automaticCrossSourceMerge !== false) {
    fail(`${path}.automaticCrossSourceMerge`, "expected false");
  }
  const sourceIdentity = cloneIdentity(
    object.sourceIdentity,
    `${path}.sourceIdentity`,
  );
  const instrumentId = exactText(object.instrumentId, `${path}.instrumentId`);
  if (instrumentId !== createInstrumentId(sourceIdentity)) {
    fail(`${path}.instrumentId`, "does not replay from the source identity");
  }
  const evidence = cloneSupportedEvidence(
    object.evidence,
    facts,
    `${path}.evidence`,
  );
  const identifierFact = requireFact(
    factsById,
    object.sourceIdentifierFactId,
    "instrument_identifier",
    sourceIdentity,
    `${path}.sourceIdentifierFactId`,
  );
  requireEvidenceFact(evidence, identifierFact, `${path}.evidence`);
  const titleFactId = Object.hasOwn(object, "titleFactId")
    ? exactText(object.titleFactId, `${path}.titleFactId`)
    : undefined;
  if (titleFactId !== undefined) {
    const titleFact = requireFact(
      factsById,
      titleFactId,
      "instrument_title",
      sourceIdentity,
      `${path}.titleFactId`,
    );
    requireEvidenceFact(evidence, titleFact, `${path}.evidence`);
  }
  return {
    contractVersion: LIFECYCLE_CONTRACT_VERSION,
    instrumentId,
    sourceIdentity,
    sourceIdentifierFactId: identifierFact.factId,
    ...(titleFactId === undefined ? {} : { titleFactId }),
    identityRule: identityRule(object.identityRule, `${path}.identityRule`),
    evidence,
    automaticCrossSourceMerge: false,
  };
}

function instrumentVersion(
  value: unknown,
  facts: readonly SourceFact[],
  factsById: ReadonlyMap<string, SourceFact>,
  instruments: ReadonlyMap<string, PolicyInstrument>,
  path: string,
): InstrumentVersion {
  const object = objectValue(value, path);
  exactKeys(object, path, [
    "contractVersion",
    "versionId",
    "instrumentId",
    "sourceIdentity",
    "renditionIdentifierFactId",
    "renditionDigestFactId",
    "reproductionBasis",
    "observedTime",
    "publishedTime",
    "effectiveTime",
    "validTime",
    "evidence",
  ]);
  if (object.contractVersion !== LIFECYCLE_CONTRACT_VERSION) {
    fail(`${path}.contractVersion`, `expected ${LIFECYCLE_CONTRACT_VERSION}`);
  }
  const sourceIdentity = cloneIdentity(
    object.sourceIdentity,
    `${path}.sourceIdentity`,
  );
  const instrumentId = exactText(object.instrumentId, `${path}.instrumentId`);
  const parent = instruments.get(instrumentId);
  if (
    parent === undefined ||
    !sameIdentity(parent.sourceIdentity, sourceIdentity)
  ) {
    fail(`${path}.instrumentId`, "must reference a same-identity instrument");
  }
  const evidence = cloneSupportedEvidence(
    object.evidence,
    facts,
    `${path}.evidence`,
  );
  const identifierFact = requireFact(
    factsById,
    object.renditionIdentifierFactId,
    "rendition_identifier",
    sourceIdentity,
    `${path}.renditionIdentifierFactId`,
  );
  const digestFact = requireFact(
    factsById,
    object.renditionDigestFactId,
    "rendition_digest",
    sourceIdentity,
    `${path}.renditionDigestFactId`,
  );
  requireEvidenceFact(evidence, identifierFact, `${path}.evidence`);
  requireEvidenceFact(evidence, digestFact, `${path}.evidence`);
  if (identifierFact.value.kind !== "identifier") {
    fail(`${path}.renditionIdentifierFactId`, "expected identifier value");
  }
  if (digestFact.value.kind !== "sha256_digest") {
    fail(`${path}.renditionDigestFactId`, "expected SHA-256 digest value");
  }
  const versionId = exactText(object.versionId, `${path}.versionId`);
  if (
    versionId !==
    createVersionId(
      sourceIdentity,
      identifierFact.value.value,
      digestFact.value.value,
    )
  ) {
    fail(`${path}.versionId`, "does not replay from rendition facts");
  }
  if (
    typeof object.reproductionBasis !== "string" ||
    !REPRODUCTION_BASES.includes(object.reproductionBasis as ReproductionBasis)
  ) {
    fail(
      `${path}.reproductionBasis`,
      "expected an allowlisted reproduction basis",
    );
  }
  const observedTime = cloneTemporal(
    object.observedTime,
    facts,
    `${path}.observedTime`,
  );
  const publishedTime = cloneTemporal(
    object.publishedTime,
    facts,
    `${path}.publishedTime`,
  );
  const effectiveTime = cloneTemporal(
    object.effectiveTime,
    facts,
    `${path}.effectiveTime`,
  );
  const validTime = cloneTemporal(object.validTime, facts, `${path}.validTime`);
  validateTemporalDimension(
    observedTime,
    "observed_time",
    sourceIdentity,
    factsById,
    `${path}.observedTime`,
  );
  validateTemporalDimension(
    publishedTime,
    "published_time",
    sourceIdentity,
    factsById,
    `${path}.publishedTime`,
  );
  validateTemporalDimension(
    effectiveTime,
    "effective_time",
    sourceIdentity,
    factsById,
    `${path}.effectiveTime`,
  );
  validateTemporalDimension(
    validTime,
    "valid_time",
    sourceIdentity,
    factsById,
    `${path}.validTime`,
  );
  return {
    contractVersion: LIFECYCLE_CONTRACT_VERSION,
    versionId,
    instrumentId,
    sourceIdentity,
    renditionIdentifierFactId: identifierFact.factId,
    renditionDigestFactId: digestFact.factId,
    reproductionBasis: object.reproductionBasis as ReproductionBasis,
    observedTime,
    publishedTime,
    effectiveTime,
    validTime,
    evidence,
  };
}

function actor(
  value: unknown,
  sourceIdentity: SourceQualifiedIdentity,
  facts: readonly SourceFact[],
  factsById: ReadonlyMap<string, SourceFact>,
  path: string,
): LifecycleActor {
  const object = objectValue(value, path);
  exactKeys(object, path, ["actorLabelFactId", "evidence"]);
  const evidence = cloneSupportedEvidence(
    object.evidence,
    facts,
    `${path}.evidence`,
  );
  const actorFact = requireFact(
    factsById,
    object.actorLabelFactId,
    "actor_label",
    sourceIdentity,
    `${path}.actorLabelFactId`,
  );
  requireEvidenceFact(evidence, actorFact, `${path}.evidence`);
  return { actorLabelFactId: actorFact.factId, evidence };
}

function sourceStatus(
  value: unknown,
  sourceIdentity: SourceQualifiedIdentity,
  facts: readonly SourceFact[],
  factsById: ReadonlyMap<string, SourceFact>,
  path: string,
): SourceStatusObservation {
  const object = objectValue(value, path);
  exactKeys(object, path, ["statusLabelFactId", "statusAsOf", "evidence"]);
  const statusLabelFact = requireFact(
    factsById,
    object.statusLabelFactId,
    "source_status_label",
    sourceIdentity,
    `${path}.statusLabelFactId`,
  );
  const statusAsOf = cloneTemporal(
    object.statusAsOf,
    facts,
    `${path}.statusAsOf`,
  );
  if (
    statusAsOf.evidence.state !== "supported" ||
    !("value" in statusAsOf) ||
    statusAsOf.value.kind === "interval"
  ) {
    fail(`${path}.statusAsOf`, "expected supported date or date-time evidence");
  }
  validateTemporalDimension(
    statusAsOf,
    "status_as_of",
    sourceIdentity,
    factsById,
    `${path}.statusAsOf`,
  );
  const evidence = cloneEvidence(object.evidence, facts, `${path}.evidence`);
  if (evidence.state === "supported") {
    requireEvidenceFact(evidence, statusLabelFact, `${path}.evidence`);
    for (const reference of statusAsOf.evidence.factReferences) {
      const temporalFact = factsById.get(reference.factId);
      if (temporalFact !== undefined) {
        requireEvidenceFact(evidence, temporalFact, `${path}.evidence`);
      }
    }
  }
  return {
    statusLabelFactId: statusLabelFact.factId,
    statusAsOf: statusAsOf as SupportedPointTemporalAssertion,
    evidence,
  };
}

function lifecycleEvent(
  value: unknown,
  facts: readonly SourceFact[],
  factsById: ReadonlyMap<string, SourceFact>,
  instruments: ReadonlyMap<string, PolicyInstrument>,
  versions: ReadonlyMap<string, InstrumentVersion>,
  path: string,
): LifecycleEvent {
  const object = objectValue(value, path);
  exactKeys(
    object,
    path,
    [
      "contractVersion",
      "eventId",
      "instrumentId",
      "sourceIdentity",
      "eventIdentifierFactId",
      "eventType",
      "eventLabelFactId",
      "evidence",
      "observedTime",
      "publishedTime",
      "effectiveTime",
      "validTime",
    ],
    ["versionId", "actor", "sourceStatus"],
  );
  if (object.contractVersion !== LIFECYCLE_CONTRACT_VERSION) {
    fail(`${path}.contractVersion`, `expected ${LIFECYCLE_CONTRACT_VERSION}`);
  }
  const sourceIdentity = cloneIdentity(
    object.sourceIdentity,
    `${path}.sourceIdentity`,
  );
  const instrumentId = exactText(object.instrumentId, `${path}.instrumentId`);
  const instrument = instruments.get(instrumentId);
  if (
    instrument === undefined ||
    !sameIdentity(instrument.sourceIdentity, sourceIdentity)
  ) {
    fail(`${path}.instrumentId`, "must reference a same-identity instrument");
  }
  const versionId = Object.hasOwn(object, "versionId")
    ? exactText(object.versionId, `${path}.versionId`)
    : undefined;
  if (versionId !== undefined) {
    const version = versions.get(versionId);
    if (
      version === undefined ||
      version.instrumentId !== instrumentId ||
      !sameIdentity(version.sourceIdentity, sourceIdentity)
    ) {
      fail(`${path}.versionId`, "must reference a same-instrument version");
    }
  }
  if (
    typeof object.eventType !== "string" ||
    !(LIFECYCLE_EVENT_TYPES as readonly string[]).includes(object.eventType)
  ) {
    fail(`${path}.eventType`, "expected an allowlisted lifecycle event type");
  }
  const eventIdentifierFact = requireFact(
    factsById,
    object.eventIdentifierFactId,
    "event_identifier",
    sourceIdentity,
    `${path}.eventIdentifierFactId`,
  );
  if (eventIdentifierFact.value.kind !== "identifier") {
    fail(`${path}.eventIdentifierFactId`, "expected identifier value");
  }
  const eventLabelFact = requireFact(
    factsById,
    object.eventLabelFactId,
    "event_label",
    sourceIdentity,
    `${path}.eventLabelFactId`,
  );
  const eventId = exactText(object.eventId, `${path}.eventId`);
  if (
    eventId !== createEventId(sourceIdentity, eventIdentifierFact.value.value)
  ) {
    fail(`${path}.eventId`, "does not replay from the event-identifier fact");
  }
  const evidence = cloneEvidence(object.evidence, facts, `${path}.evidence`);
  if (evidence.state === "supported") {
    requireEvidenceFact(evidence, eventIdentifierFact, `${path}.evidence`);
    requireEvidenceFact(evidence, eventLabelFact, `${path}.evidence`);
  }
  const observedTime = cloneTemporal(
    object.observedTime,
    facts,
    `${path}.observedTime`,
  );
  const publishedTime = cloneTemporal(
    object.publishedTime,
    facts,
    `${path}.publishedTime`,
  );
  const effectiveTime = cloneTemporal(
    object.effectiveTime,
    facts,
    `${path}.effectiveTime`,
  );
  const validTime = cloneTemporal(object.validTime, facts, `${path}.validTime`);
  validateTemporalDimension(
    observedTime,
    "observed_time",
    sourceIdentity,
    factsById,
    `${path}.observedTime`,
  );
  validateTemporalDimension(
    publishedTime,
    "published_time",
    sourceIdentity,
    factsById,
    `${path}.publishedTime`,
  );
  validateTemporalDimension(
    effectiveTime,
    "effective_time",
    sourceIdentity,
    factsById,
    `${path}.effectiveTime`,
  );
  validateTemporalDimension(
    validTime,
    "valid_time",
    sourceIdentity,
    factsById,
    `${path}.validTime`,
  );
  return {
    contractVersion: LIFECYCLE_CONTRACT_VERSION,
    eventId,
    instrumentId,
    ...(versionId === undefined ? {} : { versionId }),
    sourceIdentity,
    eventIdentifierFactId: eventIdentifierFact.factId,
    eventType: object.eventType as LifecycleEvent["eventType"],
    eventLabelFactId: eventLabelFact.factId,
    evidence,
    observedTime,
    publishedTime,
    effectiveTime,
    validTime,
    ...(Object.hasOwn(object, "actor")
      ? {
          actor: actor(
            object.actor,
            sourceIdentity,
            facts,
            factsById,
            `${path}.actor`,
          ),
        }
      : {}),
    ...(Object.hasOwn(object, "sourceStatus")
      ? {
          sourceStatus: sourceStatus(
            object.sourceStatus,
            sourceIdentity,
            facts,
            factsById,
            `${path}.sourceStatus`,
          ),
        }
      : {}),
  };
}

function entityReference(value: unknown, path: string): LifecycleReference {
  const object = objectValue(value, path);
  if (object.entityType === "instrument") {
    exactKeys(object, path, ["entityType", "instrumentId", "sourceIdentity"]);
    const sourceIdentity = cloneIdentity(
      object.sourceIdentity,
      `${path}.sourceIdentity`,
    );
    const instrumentId = exactText(object.instrumentId, `${path}.instrumentId`);
    if (instrumentId !== createInstrumentId(sourceIdentity)) {
      fail(`${path}.instrumentId`, "does not replay from the source identity");
    }
    return { entityType: "instrument", instrumentId, sourceIdentity };
  }
  if (object.entityType === "instrument_version") {
    exactKeys(object, path, [
      "entityType",
      "instrumentId",
      "versionId",
      "sourceIdentity",
    ]);
    const sourceIdentity = cloneIdentity(
      object.sourceIdentity,
      `${path}.sourceIdentity`,
    );
    const instrumentId = exactText(object.instrumentId, `${path}.instrumentId`);
    if (instrumentId !== createInstrumentId(sourceIdentity)) {
      fail(`${path}.instrumentId`, "does not replay from the source identity");
    }
    return {
      entityType: "instrument_version",
      instrumentId,
      versionId: exactText(object.versionId, `${path}.versionId`),
      sourceIdentity,
    };
  }
  fail(`${path}.entityType`, "expected instrument or instrument_version");
}

function derivedBase(object: JsonObject, path: string): DerivedAssertion {
  const base = validateDerivedAssertion(
    {
      contractVersion: object.contractVersion,
      assertionId: object.assertionId,
      assertionClass: object.assertionClass,
      inputFactIds: object.inputFactIds,
      inputFactDigests: object.inputFactDigests,
      ruleId: object.ruleId,
      ruleVersion: object.ruleVersion,
      canonicalizationVersion: object.canonicalizationVersion,
      resultDigest: object.resultDigest,
      evidence: object.evidence,
      validationState: object.validationState,
    },
    path,
  ) as DerivedAssertion;
  slug(base.ruleId, `${path}.ruleId`);
  semanticVersion(base.ruleVersion, `${path}.ruleVersion`);
  return base;
}

function validateDerivedFactBinding(
  assertion: DerivedAssertion,
  facts: readonly SourceFact[],
  factsById: ReadonlyMap<string, SourceFact>,
  path: string,
): void {
  validateEvidenceReferences(assertion.evidence, facts);
  for (let index = 0; index < assertion.inputFactIds.length; index += 1) {
    const factId = assertion.inputFactIds[index]!;
    const fact = factsById.get(factId);
    if (fact === undefined) {
      fail(`${path}.inputFactIds[${index}]`, `unknown fact ID ${factId}`);
    }
    if (fact.factDigest !== assertion.inputFactDigests[index]) {
      fail(
        `${path}.inputFactDigests[${index}]`,
        `digest does not match ${factId}`,
      );
    }
  }
  for (const reference of assertion.evidence.factReferences) {
    if (!assertion.inputFactIds.includes(reference.factId)) {
      fail(
        `${path}.evidence`,
        `evidence fact ${reference.factId} is not an input fact`,
      );
    }
  }
}

function requireDerivedInputFact(
  assertion: DerivedAssertion,
  fact: SourceFact,
  path: string,
): void {
  const index = assertion.inputFactIds.indexOf(fact.factId);
  if (index < 0 || assertion.inputFactDigests[index] !== fact.factDigest) {
    fail(path, `derived inputs do not cite ${fact.factId}`);
  }
}

export function computeLifecycleAssertionResultDigest(
  assertion: DerivedAssertion | EquivalenceAssertion | RelationshipAssertion,
): string {
  const clone = JSON.parse(canonicalizeJson(assertion)) as JsonObject;
  delete clone.resultDigest;
  return canonicalJsonDigest(clone);
}

function requireResultDigest(
  assertion: EquivalenceAssertion | RelationshipAssertion,
  path: string,
): void {
  if (
    assertion.resultDigest !== computeLifecycleAssertionResultDigest(assertion)
  ) {
    fail(`${path}.resultDigest`, "does not replay from the derived assertion");
  }
}

function resolveReference(
  reference: LifecycleReference,
  instruments: ReadonlyMap<string, PolicyInstrument>,
  versions: ReadonlyMap<string, InstrumentVersion>,
  path: string,
): void {
  const instrument = instruments.get(reference.instrumentId);
  if (
    instrument === undefined ||
    !sameIdentity(instrument.sourceIdentity, reference.sourceIdentity)
  ) {
    fail(path, "reference does not resolve to a same-identity instrument");
  }
  if (reference.entityType === "instrument_version") {
    const version = versions.get(reference.versionId);
    if (
      version === undefined ||
      version.instrumentId !== reference.instrumentId ||
      !sameIdentity(version.sourceIdentity, reference.sourceIdentity)
    ) {
      fail(path, "reference does not resolve to a same-instrument version");
    }
  }
}

function equivalenceAssertion(
  value: unknown,
  facts: readonly SourceFact[],
  factsById: ReadonlyMap<string, SourceFact>,
  instruments: ReadonlyMap<string, PolicyInstrument>,
  path: string,
): EquivalenceAssertion {
  const object = objectValue(value, path);
  exactKeys(object, path, [
    "contractVersion",
    "assertionId",
    "assertionClass",
    "inputFactIds",
    "inputFactDigests",
    "ruleId",
    "ruleVersion",
    "canonicalizationVersion",
    "resultDigest",
    "evidence",
    "validationState",
    "left",
    "right",
    "equivalenceLabelFactId",
    "resolution",
    "automaticCrossSourceMerge",
  ]);
  const base = derivedBase(object, path);
  if (base.assertionClass !== "equivalence_assertion") {
    fail(`${path}.assertionClass`, "expected equivalence_assertion");
  }
  if (object.automaticCrossSourceMerge !== false) {
    fail(`${path}.automaticCrossSourceMerge`, "expected false");
  }
  if (
    typeof object.resolution !== "string" ||
    !(EQUIVALENCE_RESOLUTIONS as readonly string[]).includes(object.resolution)
  ) {
    fail(
      `${path}.resolution`,
      "expected an allowlisted equivalence resolution",
    );
  }
  const left = entityReference(object.left, `${path}.left`);
  const right = entityReference(object.right, `${path}.right`);
  if (left.entityType !== "instrument" || right.entityType !== "instrument") {
    fail(path, "equivalence endpoints must be instrument references");
  }
  if (canonicalizeJson(left) === canonicalizeJson(right)) {
    fail(path, "equivalence endpoints must differ");
  }
  resolveReference(left, instruments, new Map(), `${path}.left`);
  resolveReference(right, instruments, new Map(), `${path}.right`);
  const labelFact = requireFactForAnyIdentity(
    factsById,
    object.equivalenceLabelFactId,
    "equivalence_label",
    [left.sourceIdentity, right.sourceIdentity],
    `${path}.equivalenceLabelFactId`,
  );
  if (
    ((object.resolution === "reviewed_equivalent" ||
      object.resolution === "reviewed_not_equivalent") &&
      base.evidence.state !== "supported") ||
    (object.resolution === "possible_equivalent" &&
      base.evidence.state !== "ambiguous_evidence") ||
    (object.resolution === "unknown" && base.evidence.state !== "unknown")
  ) {
    fail(`${path}.evidence.state`, "does not match the equivalence resolution");
  }
  validateDerivedFactBinding(base, facts, factsById, path);
  requireDerivedInputFact(base, labelFact, `${path}.inputFactIds`);
  if (base.evidence.state !== "unknown") {
    requireEvidenceFact(base.evidence, labelFact, `${path}.evidence`);
  }
  const assertion: EquivalenceAssertion = {
    ...base,
    assertionClass: "equivalence_assertion",
    left: left as InstrumentReference,
    right: right as InstrumentReference,
    equivalenceLabelFactId: labelFact.factId,
    resolution: object.resolution as EquivalenceAssertion["resolution"],
    automaticCrossSourceMerge: false,
  };
  const evidenceIds = base.evidence.factReferences.map(
    (reference) => reference.factId,
  );
  if (
    assertion.assertionId !==
    createEquivalenceAssertionId(assertion.left, assertion.right, evidenceIds)
  ) {
    fail(
      `${path}.assertionId`,
      "does not replay from equivalence identity inputs",
    );
  }
  requireResultDigest(assertion, path);
  return assertion;
}

function relationshipAssertion(
  value: unknown,
  facts: readonly SourceFact[],
  factsById: ReadonlyMap<string, SourceFact>,
  instruments: ReadonlyMap<string, PolicyInstrument>,
  versions: ReadonlyMap<string, InstrumentVersion>,
  path: string,
): RelationshipAssertion {
  const object = objectValue(value, path);
  if (
    typeof object.relationshipType !== "string" ||
    !(RELATIONSHIP_TYPES as readonly string[]).includes(object.relationshipType)
  ) {
    fail(
      `${path}.relationshipType`,
      "expected an allowlisted relationship type",
    );
  }
  const relationshipType = object.relationshipType as RelationshipType;
  const binary =
    relationshipType === "correction" ||
    relationshipType === "amendment" ||
    relationshipType === "substitution" ||
    relationshipType === "supersession";
  exactKeys(object, path, [
    "contractVersion",
    "assertionId",
    "assertionClass",
    "inputFactIds",
    "inputFactDigests",
    "ruleId",
    "ruleVersion",
    "canonicalizationVersion",
    "resultDigest",
    "evidence",
    "validationState",
    "relationshipType",
    ...(binary ? ["subject"] : []),
    "affected",
    "relationshipLabelFactId",
  ]);
  const base = derivedBase(object, path);
  if (base.assertionClass !== "relationship_assertion") {
    fail(`${path}.assertionClass`, "expected relationship_assertion");
  }
  const affected = entityReference(object.affected, `${path}.affected`);
  resolveReference(affected, instruments, versions, `${path}.affected`);
  const subject = binary
    ? entityReference(object.subject, `${path}.subject`)
    : undefined;
  if (subject !== undefined) {
    resolveReference(subject, instruments, versions, `${path}.subject`);
    if (canonicalizeJson(subject) === canonicalizeJson(affected)) {
      fail(path, "binary relationship endpoints must differ");
    }
  }
  const labelFact = requireFactForAnyIdentity(
    factsById,
    object.relationshipLabelFactId,
    "relationship_label",
    subject === undefined
      ? [affected.sourceIdentity]
      : [subject.sourceIdentity, affected.sourceIdentity],
    `${path}.relationshipLabelFactId`,
  );
  validateDerivedFactBinding(base, facts, factsById, path);
  requireDerivedInputFact(base, labelFact, `${path}.inputFactIds`);
  if (base.evidence.state !== "unknown") {
    requireEvidenceFact(base.evidence, labelFact, `${path}.evidence`);
  }
  const assertion = {
    ...base,
    assertionClass: "relationship_assertion" as const,
    relationshipType,
    ...(subject === undefined ? {} : { subject }),
    affected,
    relationshipLabelFactId: labelFact.factId,
  } as RelationshipAssertion;
  const evidenceIds = base.evidence.factReferences.map(
    (reference) => reference.factId,
  );
  if (
    assertion.assertionId !==
    createRelationshipAssertionId(
      relationshipType,
      subject === undefined ? { affected } : { subject, affected },
      evidenceIds,
    )
  ) {
    fail(
      `${path}.assertionId`,
      "does not replay from relationship identity inputs",
    );
  }
  requireResultDigest(assertion, path);
  return assertion;
}

function sortedUnique<T>(
  items: readonly T[],
  stableId: (item: T) => string,
  path: string,
): readonly T[] {
  const sorted = [...items].sort((left, right) => {
    const leftId = stableId(left);
    const rightId = stableId(right);
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
  });
  for (let index = 1; index < sorted.length; index += 1) {
    if (stableId(sorted[index - 1]!) === stableId(sorted[index]!)) {
      fail(path, `duplicate ID ${stableId(sorted[index]!)}`);
    }
  }
  return sorted;
}

function bundleWithoutDigest(value: unknown): LifecycleBundleWithoutDigest {
  canonicalizeJson(value);
  const object = objectValue(value, "$");
  exactKeys(object, "$", [
    "contractVersion",
    "assertionContractVersion",
    "canonicalizationVersion",
    "sourceFacts",
    "instruments",
    "versions",
    "events",
    "equivalenceAssertions",
    "relationshipAssertions",
  ]);
  if (object.contractVersion !== LIFECYCLE_CONTRACT_VERSION) {
    fail("$.contractVersion", `expected ${LIFECYCLE_CONTRACT_VERSION}`);
  }
  if (object.assertionContractVersion !== ASSERTION_CONTRACT_VERSION) {
    fail(
      "$.assertionContractVersion",
      `expected ${ASSERTION_CONTRACT_VERSION}`,
    );
  }
  if (object.canonicalizationVersion !== CANONICALIZATION_VERSION) {
    fail("$.canonicalizationVersion", `expected ${CANONICALIZATION_VERSION}`);
  }
  const sourceFacts = sortedUnique(
    arrayValue(object.sourceFacts, "$.sourceFacts").map(
      (fact, index) =>
        validateSourceFact(fact, `$.sourceFacts[${index}]`) as SourceFact,
    ),
    (fact) => fact.factId,
    "$.sourceFacts",
  );
  const factsById = factIndex(sourceFacts);
  const instruments = sortedUnique(
    arrayValue(object.instruments, "$.instruments").map((instrument, index) =>
      policyInstrument(
        instrument,
        sourceFacts,
        factsById,
        `$.instruments[${index}]`,
      ),
    ),
    (instrument) => instrument.instrumentId,
    "$.instruments",
  );
  const instrumentsById = new Map(
    instruments.map((instrument) => [instrument.instrumentId, instrument]),
  );
  const versions = sortedUnique(
    arrayValue(object.versions, "$.versions").map((version, index) =>
      instrumentVersion(
        version,
        sourceFacts,
        factsById,
        instrumentsById,
        `$.versions[${index}]`,
      ),
    ),
    (version) => version.versionId,
    "$.versions",
  );
  const versionsById = new Map(
    versions.map((version) => [version.versionId, version]),
  );
  const events = sortedUnique(
    arrayValue(object.events, "$.events").map((event, index) =>
      lifecycleEvent(
        event,
        sourceFacts,
        factsById,
        instrumentsById,
        versionsById,
        `$.events[${index}]`,
      ),
    ),
    (event) => event.eventId,
    "$.events",
  );
  const equivalenceAssertions = sortedUnique(
    arrayValue(object.equivalenceAssertions, "$.equivalenceAssertions").map(
      (assertion, index) =>
        equivalenceAssertion(
          assertion,
          sourceFacts,
          factsById,
          instrumentsById,
          `$.equivalenceAssertions[${index}]`,
        ),
    ),
    (assertion) => assertion.assertionId,
    "$.equivalenceAssertions",
  );
  const relationshipAssertions = sortedUnique(
    arrayValue(object.relationshipAssertions, "$.relationshipAssertions").map(
      (assertion, index) =>
        relationshipAssertion(
          assertion,
          sourceFacts,
          factsById,
          instrumentsById,
          versionsById,
          `$.relationshipAssertions[${index}]`,
        ),
    ),
    (assertion) => assertion.assertionId,
    "$.relationshipAssertions",
  );
  return {
    contractVersion: LIFECYCLE_CONTRACT_VERSION,
    assertionContractVersion: ASSERTION_CONTRACT_VERSION,
    canonicalizationVersion: CANONICALIZATION_VERSION,
    sourceFacts,
    instruments,
    versions,
    events,
    equivalenceAssertions,
    relationshipAssertions,
  };
}

export function normalizeLifecycleBundle(
  input: LifecycleBundleWithoutDigest,
): Readonly<LifecycleBundle> {
  const normalized = bundleWithoutDigest(input);
  return immutableCanonicalClone({
    ...normalized,
    bundleDigest: canonicalJsonDigest(normalized as unknown as JsonValue),
  } as unknown as JsonValue) as unknown as Readonly<LifecycleBundle>;
}

export function validateLifecycleBundleSemantics(
  input: LifecycleBundleWithoutDigest,
): Readonly<LifecycleBundle> {
  return normalizeLifecycleBundle(input);
}

export function computeLifecycleBundleDigest(
  input: LifecycleBundle | LifecycleBundleWithoutDigest,
): string {
  const clone = JSON.parse(canonicalizeJson(input)) as JsonObject;
  delete clone.bundleDigest;
  return normalizeLifecycleBundle(
    clone as unknown as LifecycleBundleWithoutDigest,
  ).bundleDigest;
}

export function validateLifecycleBundle(
  input: unknown,
): Readonly<LifecycleBundle> {
  canonicalizeJson(input);
  const object = objectValue(input, "$");
  exactKeys(object, "$", [
    "contractVersion",
    "assertionContractVersion",
    "canonicalizationVersion",
    "sourceFacts",
    "instruments",
    "versions",
    "events",
    "equivalenceAssertions",
    "relationshipAssertions",
    "bundleDigest",
  ]);
  const suppliedDigest = exactText(object.bundleDigest, "$.bundleDigest");
  const withoutDigest = { ...object };
  delete withoutDigest.bundleDigest;
  const normalized = normalizeLifecycleBundle(
    withoutDigest as unknown as LifecycleBundleWithoutDigest,
  );
  if (suppliedDigest !== normalized.bundleDigest) {
    throw new IntegrityReplayError(
      "bundle_digest_mismatch",
      "$.bundleDigest",
      "does not replay from the normalized lifecycle bundle",
    );
  }
  return normalized;
}

export function verifyLifecycleBundleDigest(input: unknown): boolean {
  try {
    validateLifecycleBundle(input);
    return true;
  } catch {
    return false;
  }
}
