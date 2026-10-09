import type {
  AnalyzedCorpus,
  PolicyDate,
  PolicyInstrumentClass,
  PolicyLocator,
  PolicySourceProfile,
} from "../pipeline/analyzed-corpus-v2.mjs";

export const RESEARCH_STUDY_SCHEMA_ID: "https://policy-sentinel.invalid/schemas/research-study.schema.v1.json";
export const RESEARCH_STUDY_SCHEMA_VERSION: "1.0.0";
export const MAX_RESEARCH_STUDY_BYTES: number;
export type StudySensitivity = "public" | "restricted";
export type StudyReviewState =
  "unreviewed" | "accepted" | "challenged" | "rejected";
export type StudyProvenance =
  | "source_content"
  | "extracted_evidence"
  | "model_interpretation"
  | "analyst_authored";
export interface StudyActor {
  readonly id: string;
  readonly label: string;
  readonly kind:
    "analyst" | "model" | "organization" | "agency" | "tribal_nation" | "rule";
  readonly sensitivity: StudySensitivity;
}
export interface StudyRecord {
  readonly id: string;
  readonly actorId: string;
  readonly createdAt: string;
  readonly provenance: StudyProvenance;
  readonly reviewState: StudyReviewState;
  readonly sensitivity: StudySensitivity;
}
export interface StudyQuestion extends StudyRecord {
  readonly parentQuestionId: string | null;
  readonly text: string;
  readonly theme: string;
  readonly status: "open" | "answered" | "archived";
  /** Discovery labels carry no legal or jurisdictional assertion. */
  readonly discoveryGeographies: readonly string[];
}
export interface StudySearchScope {
  /** Missing on older saved scopes; null explicitly records no identifier filter. */
  readonly jurisdictionRef?: string | null;
  readonly temporal: null | {
    readonly asOf: string;
    readonly basis: "source_available" | "corpus_observed" | "source_effective";
  };
  readonly governmentContext: string | null;
  readonly instrumentClass: PolicyInstrumentClass | null;
}
export interface StudyDiscovery extends StudyRecord {
  readonly questionId: string;
  readonly query: string;
  readonly sourceIds: readonly string[];
  /** Absent on older studies means scope was not recorded, not unbounded. */
  readonly searchScope?: StudySearchScope;
  readonly followUpGapId: string | null;
  readonly status: "planned" | "completed";
}
export interface StudyCandidate extends StudyRecord {
  readonly discoveryId: string;
  readonly url: string;
  readonly title: string;
  readonly sourceId: string;
  readonly versionId: string | null;
  readonly disposition: "unreviewed" | "retained" | "excluded";
  readonly reason: string;
}
export interface StudyCitation {
  readonly corpusId: string;
  readonly corpusDigest: string;
  readonly workId: string;
  readonly workDigest: string;
  readonly versionId: string;
  readonly versionDigest: string;
  readonly renditionId: string;
  readonly renditionDigest: string;
  readonly renditionOutputDigest: string;
  readonly segmentId: string;
  readonly segmentDigest: string;
  readonly textDigest: string;
  readonly contextDigest: string;
  readonly startByte: number;
  readonly endByte: number;
  readonly captureId: string;
  readonly captureDigest: string;
  readonly objectDigest: string;
  readonly sourceProfileId: string;
  readonly sourceProfileDigest: string;
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly sourceTitle: string;
  readonly sourceIdentifier: string;
  readonly sourceVersionIdentifier: string;
  readonly sourceOrigin: {
    readonly publisher: string;
    readonly operator: string;
    readonly authorityLabel: string;
  };
  readonly retrievedAt: string;
  readonly observedAt: string;
  readonly sourceDates: AnalyzedCorpus["versions"][number]["dates"];
  readonly sourceUpdatedAt: PolicyDate;
  readonly locator: PolicyLocator;
  readonly uses: PolicySourceProfile["uses"];
}
export interface StudyPassage extends StudyRecord {
  readonly provenance: "source_content";
  readonly citation: StudyCitation;
  readonly bindingStatus: "verified" | "review_required";
  readonly bindingIssue: string | null;
}
export interface StudyAssertion extends StudyRecord {
  readonly questionId: string;
  readonly text: string;
  readonly supportingPassageIds: readonly string[];
  readonly challengingPassageIds: readonly string[];
  readonly supersedesAssertionId: string | null;
}
export interface StudyReview extends Omit<StudyRecord, "reviewState"> {
  readonly targetId: string;
  readonly decision: Exclude<StudyReviewState, "unreviewed">;
  readonly notes: string;
}
export interface StudyGap extends StudyRecord {
  readonly questionId: string;
  readonly text: string;
  readonly status: "open" | "resolved" | "dismissed";
  readonly followUpDiscoveryId: string | null;
}
export interface StudyAnnotation extends StudyRecord {
  readonly targetId: string;
  readonly text: string;
}
export interface StudyProceeding extends StudyRecord {
  readonly title: string;
  readonly parentProceedingId: string | null;
  readonly docketIds: readonly string[];
  readonly rins: readonly string[];
  readonly versionIds: readonly string[];
  readonly sourceStatement: string;
  readonly passageIds: readonly string[];
}
export type StudyActionType =
  | "proposed_rule"
  | "rescission"
  | "amendment"
  | "comment_deadline_extension"
  | "final_rule"
  | "withdrawal"
  | "subsequent_action";
export interface StudyAction extends StudyRecord {
  readonly proceedingId: string;
  readonly versionId: string;
  readonly type: StudyActionType;
  readonly date: PolicyDate;
  readonly sourceDateText: string | null;
  readonly sourceStatement: string;
  readonly previousActionId: string | null;
  readonly passageIds: readonly string[];
}
export interface StudyDeadline extends StudyRecord {
  readonly actionId: string;
  readonly type: "comment" | "consultation" | "other";
  readonly date: PolicyDate;
  readonly sourceDateText: string | null;
  readonly timeZone: string | null;
  readonly qualifications: string;
  readonly replacesDeadlineId: string | null;
  readonly sourceStatement: string;
  readonly passageIds: readonly string[];
}
export type StudyConsultationType =
  | "notice"
  | "invitation"
  | "meeting_held"
  | "submission"
  | "response"
  | "outcome";
export interface StudyConsultationParticipant {
  readonly actorId: string;
  readonly role:
    | "agency"
    | "notice_recipient"
    | "invited"
    | "attended"
    | "submitter"
    | "respondent"
    | "outcome_subject";
  readonly scope: "agency" | "intertribal" | "aggregate" | "tribal_nation";
  readonly sourceName: string;
  readonly sourceStatement: string;
  readonly passageIds: readonly string[];
}
export interface StudyConsultation extends StudyRecord {
  readonly proceedingId: string | null;
  readonly type: StudyConsultationType;
  readonly date: PolicyDate;
  readonly sourceDateText: string | null;
  readonly sourceStatement: string;
  readonly relatedEventIds: readonly string[];
  readonly respondsToEventId: string | null;
  readonly participants: readonly StudyConsultationParticipant[];
  readonly passageIds: readonly string[];
}
export interface StudyEnvironmentalEvidence extends StudyRecord {
  readonly versionId: string;
  readonly alternativeId: string;
  readonly baselineYear: number | null;
  readonly metric: string;
  /** Preserve source decimals, ranges and qualifications without numeric conversion. */
  readonly value: string;
  readonly unit: string | null;
  readonly spatialScale: string | null;
  readonly uncertainty: string | null;
  readonly qualifications: readonly string[];
  readonly sourceStatement: string;
  readonly passageIds: readonly string[];
}
export interface StudySubjectReference {
  readonly kind: "actor" | "version" | "proceeding";
  readonly id: string;
}
export interface StudyAuthorityRelationship extends StudyRecord {
  readonly subject: StudySubjectReference;
  readonly object: StudySubjectReference;
  readonly subjectLabel: string;
  readonly objectLabel: string;
  readonly type:
    | "statutory_dependency"
    | "procedural_dependency"
    | "geographic_applicability"
    | "jurisdictional_relationship"
    | "homeland";
  readonly sourceStatement: string;
  readonly passageIds: readonly string[];
}
export interface StudyOriginGroup extends StudyRecord {
  readonly versionIds: readonly string[];
  readonly originVersionId: string | null;
  readonly basis:
    "same_document" | "documented_republication" | "common_origin";
  readonly sourceStatement: string;
  readonly passageIds: readonly string[];
}
export interface StudyCatalogs {
  readonly actors: readonly StudyActor[];
  readonly questions: readonly StudyQuestion[];
  readonly discoveries: readonly StudyDiscovery[];
  readonly candidates: readonly StudyCandidate[];
  readonly passages: readonly StudyPassage[];
  readonly assertions: readonly StudyAssertion[];
  readonly reviews: readonly StudyReview[];
  readonly gaps: readonly StudyGap[];
  readonly annotations: readonly StudyAnnotation[];
  readonly proceedings: readonly StudyProceeding[];
  readonly actions: readonly StudyAction[];
  readonly deadlines: readonly StudyDeadline[];
  readonly consultations: readonly StudyConsultation[];
  readonly environmentalEvidence: readonly StudyEnvironmentalEvidence[];
  readonly authorityRelationships: readonly StudyAuthorityRelationship[];
  readonly originGroups: readonly StudyOriginGroup[];
}
export type StudyCollection = keyof StudyCatalogs;
export type StudyChange = {
  [K in StudyCollection]: {
    readonly collection: K;
    readonly record: StudyCatalogs[K][number];
  };
}[StudyCollection];
export interface StudyBeforeImage {
  readonly collection: StudyCollection;
  readonly id: string;
  readonly record: StudyCatalogs[StudyCollection][number] | null;
}
export interface StudyRevision {
  readonly revision: number;
  readonly updatedAt: string;
  readonly updatedBy: string;
  readonly corpusId: string;
  readonly corpusDigest: string;
  readonly previousDigest: string | null;
  readonly contentDigest: string;
  readonly changes: readonly StudyBeforeImage[];
}
export interface ResearchStudy extends StudyCatalogs {
  readonly $schema: typeof RESEARCH_STUDY_SCHEMA_ID;
  readonly schemaVersion: "1.0.0";
  readonly kind: "research_study";
  readonly id: string;
  readonly title: string;
  /** Classification of authored study metadata, including its title. */
  readonly sensitivity: StudySensitivity;
  readonly trustDomain: AnalyzedCorpus["trustDomain"];
  readonly corpusId: string;
  readonly corpusDigest: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly updatedBy: string;
  readonly revision: number;
  readonly previousDigest: string | null;
  readonly revisions: readonly StudyRevision[];
  readonly contentDigest: string;
}
export interface StudyGraphReference {
  readonly kind:
    | "Study"
    | "Question"
    | "SourceDocument"
    | "Assertion"
    | "ConsultationEvent"
    | "Gap";
  readonly id: string;
}
export interface StudyGraphNode {
  readonly ref: StudyGraphReference;
  readonly label: string;
  readonly actorId: string | null;
  readonly createdAt: string;
  readonly provenance: StudyProvenance;
  readonly reviewState: StudyReviewState;
  readonly sensitivity: StudySensitivity;
  readonly citations: readonly StudyCitation[];
}
export interface StudyGraphEdge {
  readonly id: string;
  readonly type: "supportedBy" | "challengedBy" | "respondsTo" | "supersededBy";
  readonly from: StudyGraphReference;
  readonly to: StudyGraphReference;
  readonly actorId: string;
  readonly createdAt: string;
  readonly reviewState: StudyReviewState;
  readonly provenance: StudyProvenance;
  readonly sensitivity: StudySensitivity;
  readonly citations: readonly StudyCitation[];
}
export class ResearchStudyError extends TypeError {
  readonly code: string;
}
export function createResearchStudy(
  input: {
    readonly id: string;
    readonly title: string;
    readonly createdAt: string;
    readonly actor: StudyActor;
    readonly sensitivity?: StudySensitivity;
  },
  corpus: AnalyzedCorpus,
): Promise<ResearchStudy>;
export function captureStudyPassage(
  input: {
    readonly id: string;
    readonly segmentId: string;
    readonly actorId: string;
    readonly createdAt: string;
    readonly sensitivity?: StudySensitivity;
  },
  corpus: AnalyzedCorpus,
): Promise<StudyPassage>;
export function reviseResearchStudy(
  study: ResearchStudy,
  change: {
    readonly updatedAt: string;
    readonly actorId: string;
    readonly records: readonly StudyChange[];
  },
  corpus: AnalyzedCorpus,
): Promise<ResearchStudy>;
/** Untrusted imports are bounded JSON text. A different corpus requires explicit rebind. */
export function parseResearchStudy(
  text: string,
  corpus: AnalyzedCorpus,
): Promise<ResearchStudy>;
export function serializeResearchStudy(
  study: ResearchStudy,
  corpus: AnalyzedCorpus,
): Promise<string>;
export function rebindResearchStudy(
  study: ResearchStudy,
  corpus: AnalyzedCorpus,
  change: { readonly updatedAt: string; readonly actorId: string },
): Promise<ResearchStudy>;
/** Restores a historical snapshot; does not replace the current study. */
export function readResearchStudyRevision(
  study: ResearchStudy,
  revision: number,
): Promise<ResearchStudy>;
export function studyReadPassage(
  passage: StudyPassage,
  corpus: AnalyzedCorpus,
  options?: { readonly purpose?: "display" | "export" },
): Promise<{
  readonly text: string | null;
  readonly reason:
    | "review_required"
    | "source_display_policy"
    | "source_export_policy"
    | "excerpt_selection_required"
    | null;
}>;
export function studyActiveDeadlines(
  study: ResearchStudy,
  proceedingId: string,
): readonly {
  readonly type: StudyDeadline["type"];
  readonly state: "active" | "ambiguous" | "review_required";
  readonly candidates: readonly StudyDeadline[];
}[];
/** Throws unless the immutable study and this corpus object completed core validation. */
export function assertValidatedResearchStudy(
  study: unknown,
  corpus: AnalyzedCorpus,
): asserts study is ResearchStudy;
/** References used for privacy closure; source version IDs are intentionally separate. */
export function studyRecordReferences(
  collection: StudyCollection,
  record: StudyCatalogs[StudyCollection][number],
): readonly string[];
