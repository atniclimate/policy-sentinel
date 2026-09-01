import type {
  DerivedAssertion,
  EvidenceState,
  SourceFact,
  SourceQualifiedIdentity,
  SupportedEvidence,
  TemporalAssertion,
  TemporalPoint,
} from "../assertions";

export const LIFECYCLE_CONTRACT_VERSION = "1.0.0" as const;
export type LifecycleContractVersion = typeof LIFECYCLE_CONTRACT_VERSION;

export interface RuleReference {
  ruleId: string;
  ruleVersion: string;
}

export interface PolicyInstrument {
  contractVersion: LifecycleContractVersion;
  instrumentId: string;
  sourceIdentity: SourceQualifiedIdentity;
  sourceIdentifierFactId: string;
  titleFactId?: string;
  identityRule: RuleReference;
  automaticCrossSourceMerge: false;
  evidence: SupportedEvidence;
}

export type ReproductionBasis =
  "metadata_and_links" | "reviewed_excerpt" | "reviewed_full_text";

export interface InstrumentVersion {
  contractVersion: LifecycleContractVersion;
  versionId: string;
  instrumentId: string;
  sourceIdentity: SourceQualifiedIdentity;
  renditionIdentifierFactId: string;
  renditionDigestFactId: string;
  reproductionBasis: ReproductionBasis;
  observedTime: TemporalAssertion;
  publishedTime: TemporalAssertion;
  effectiveTime: TemporalAssertion;
  validTime: TemporalAssertion;
  evidence: SupportedEvidence;
}

export const LIFECYCLE_EVENT_TYPES = [
  "introduction",
  "hearing",
  "committee_referral",
  "amendment",
  "adoption",
  "signature",
  "publication",
  "enactment",
  "effective_date",
  "correction",
  "withdrawal",
  "stay",
  "substitution",
  "supersession",
  "decision",
  "status_observation",
  "other",
] as const;

export type LifecycleEventType = (typeof LIFECYCLE_EVENT_TYPES)[number];

export interface LifecycleActor {
  actorLabelFactId: string;
  evidence: SupportedEvidence;
}

export interface SourceStatusObservation {
  statusLabelFactId: string;
  statusAsOf: SupportedPointTemporalAssertion;
  evidence: EvidenceState;
}

export interface SupportedPointTemporalAssertion {
  evidence: SupportedEvidence;
  value: TemporalPoint;
}

export interface LifecycleEvent {
  contractVersion: LifecycleContractVersion;
  eventId: string;
  sourceIdentity: SourceQualifiedIdentity;
  instrumentId: string;
  versionId?: string;
  eventIdentifierFactId: string;
  eventLabelFactId: string;
  eventType: LifecycleEventType;
  evidence: EvidenceState;
  observedTime: TemporalAssertion;
  publishedTime: TemporalAssertion;
  effectiveTime: TemporalAssertion;
  validTime: TemporalAssertion;
  actor?: LifecycleActor;
  sourceStatus?: SourceStatusObservation;
}

export interface InstrumentReference {
  entityType: "instrument";
  sourceIdentity: SourceQualifiedIdentity;
  instrumentId: string;
}

export interface InstrumentVersionReference {
  entityType: "instrument_version";
  sourceIdentity: SourceQualifiedIdentity;
  instrumentId: string;
  versionId: string;
}

export type LifecycleReference =
  InstrumentReference | InstrumentVersionReference;

export const EQUIVALENCE_RESOLUTIONS = [
  "reviewed_equivalent",
  "reviewed_not_equivalent",
  "possible_equivalent",
  "unknown",
] as const;

export type EquivalenceResolution = (typeof EQUIVALENCE_RESOLUTIONS)[number];

export interface EquivalenceAssertion extends DerivedAssertion {
  assertionClass: "equivalence_assertion";
  left: InstrumentReference;
  right: InstrumentReference;
  equivalenceLabelFactId: string;
  resolution: EquivalenceResolution;
  automaticCrossSourceMerge: false;
}

export const RELATIONSHIP_TYPES = [
  "correction",
  "amendment",
  "withdrawal",
  "stay",
  "substitution",
  "supersession",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

interface RelationshipAssertionBase extends DerivedAssertion {
  assertionClass: "relationship_assertion";
  relationshipLabelFactId: string;
}

export type BinaryRelationshipAssertion = RelationshipAssertionBase & {
  relationshipType:
    "correction" | "amendment" | "substitution" | "supersession";
  subject: LifecycleReference;
  affected: LifecycleReference;
};

export type UnaryRelationshipAssertion = RelationshipAssertionBase & {
  relationshipType: "withdrawal" | "stay";
  affected: LifecycleReference;
};

export type RelationshipAssertion =
  BinaryRelationshipAssertion | UnaryRelationshipAssertion;

export interface LifecycleBundle {
  contractVersion: LifecycleContractVersion;
  assertionContractVersion: "1.0.0";
  canonicalizationVersion: "ps-c14n-json-1";
  sourceFacts: readonly SourceFact[];
  instruments: readonly PolicyInstrument[];
  versions: readonly InstrumentVersion[];
  events: readonly LifecycleEvent[];
  equivalenceAssertions: readonly EquivalenceAssertion[];
  relationshipAssertions: readonly RelationshipAssertion[];
  bundleDigest: string;
}

export type LifecycleBundleWithoutDigest = Omit<
  LifecycleBundle,
  "bundleDigest"
>;
