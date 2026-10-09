import type { JurisdictionAssociation } from "../core/jurisdiction-reference.mjs";
export const ANALYZED_CORPUS_V2_SCHEMA_ID: "https://policy-sentinel.invalid/schemas/analyzed-corpus.schema.v2.json";
export const ANALYZED_CORPUS_V2_SCHEMA_VERSION: "2.0.0";
export const ANALYZED_CORPUS_V21_SCHEMA_ID: "https://policy-sentinel.invalid/schemas/analyzed-corpus.schema.v2.1.json";
export const ANALYZED_CORPUS_V21_SCHEMA_VERSION: "2.1.0";
export interface PolicyDate {
  readonly value: string | null;
  readonly precision: "year" | "month" | "day" | "unknown";
}
export interface DigestedMember {
  readonly id: string;
  readonly contentDigest: string;
}
export interface PolicyMethod {
  readonly id: string;
  readonly version: string;
}
export interface PolicyReviewer {
  readonly name: string;
  readonly kind: "agent" | "human" | "rule";
  readonly reviewedAt: string;
}
export interface FieldEvidence {
  readonly field: string;
  readonly mode: "source_attested" | "deterministic";
  readonly captureId: string;
  readonly sourceLocator: string;
  readonly segmentIds: readonly string[];
  readonly ruleId: string | null;
}
export interface PolicySourceProfile extends DigestedMember {
  readonly sourceId: string;
  readonly interfaceId: string;
  readonly operator: string;
  readonly publisher: string;
  readonly authorityLabel: string;
  readonly hosts: readonly string[];
  readonly pathPrefixes: readonly string[];
  readonly review: {
    readonly reviewer: string;
    readonly reviewedAt: string;
    readonly expiresAt: string;
    readonly evidenceUrls: readonly string[];
  };
  readonly uses: {
    readonly capture: true;
    readonly analysis: true;
    readonly localDisplay: "full_text" | "excerpt" | "metadata_link";
    readonly localExport:
      "full_text" | "excerpt" | "metadata_link" | "prohibited";
    readonly excerpts: boolean;
    readonly publicRedistribution: "prohibited";
  };
}
export interface PolicyCapture extends DigestedMember {
  readonly sourceProfileId: string;
  readonly sourceProfileDigest: string;
  readonly operationId: string;
  readonly requestedUrl: string;
  readonly finalUrl: string;
  readonly retrievedAt: string;
  readonly mediaType:
    | "text/plain"
    | "text/html"
    | "application/xhtml+xml"
    | "application/xml"
    | "text/xml"
    | "application/pdf"
    | "application/json";
  readonly encodedBytes: number;
  readonly decodedBytes: number;
  readonly objectDigest: string;
  /** Exactly objects/<digest>.bin or objects/sha256/<first2>/<next2>/<digest>. */
  readonly objectPath: string;
}
export type PolicyInstrumentClass =
  | "regulation"
  | "proposed_rule"
  | "final_rule"
  | "statute"
  | "bill"
  | "executive_order"
  | "judicial_opinion"
  | "intergovernmental_agreement"
  | "agency_policy"
  | "notice";
export interface PolicyWork extends DigestedMember {
  readonly sourceProfileId: string;
  readonly sourceIdentifier: string;
  readonly title: string;
  readonly instrumentClass: PolicyInstrumentClass;
  readonly governmentContext: string;
  readonly issuerRoles: readonly {
    readonly role:
      "issuer" | "speaker" | "party" | "regulator" | "legislative_sponsor";
    readonly label: string;
  }[];
  readonly relevance: "general_jurisdiction";
  readonly taxonomy: "Unclassified";
  readonly fieldProvenance: readonly FieldEvidence[];
}
export interface PolicyDocumentVersion extends DigestedMember {
  readonly workId: string;
  readonly sourceVersionIdentifier: string;
  readonly sourceStatusLabel: string;
  readonly dates: {
    readonly publication: PolicyDate;
    readonly sourceVersion: PolicyDate;
  };
  /** First capture time among this version's retained renditions. */
  readonly observedAt: string;
  readonly renditionIds: readonly string[];
  readonly fieldProvenance: readonly FieldEvidence[];
}
export interface PolicyRendition extends DigestedMember {
  readonly versionId: string;
  readonly captureId: string;
  readonly parser: {
    readonly id: string;
    readonly version: string;
    readonly configDigest: string;
  };
  readonly mediaType: "text/plain";
  readonly outputDigest: string;
  readonly byteLength: number;
  readonly text: string;
  readonly authorityLabel: string;
  readonly warnings: readonly string[];
  /** Reviewed source blocks absent from canonical text; excerpts cannot bridge these gaps. */
  readonly omittedSourceLocators: readonly string[];
}
export interface PolicyLocator {
  readonly type: "structural_path" | "paragraph" | "line" | "page";
  readonly value: string;
  readonly headingPath: readonly string[];
  readonly printedPageLabel: string | null;
  readonly physicalPageIndex: number | null;
}
export interface PolicyEvidenceSegment extends DigestedMember {
  readonly renditionId: string;
  readonly startByte: number;
  readonly endByte: number;
  readonly textDigest: string;
  readonly contextDigest: string;
  readonly locator: PolicyLocator;
}
export interface PolicySourceEvent extends DigestedMember {
  readonly workId: string;
  readonly versionId: string;
  readonly type:
    | "published"
    | "enacted"
    | "effective"
    | "amended"
    | "repealed"
    | "corrected"
    | "withdrawn";
  readonly date: PolicyDate;
  readonly sourceStatedAt: PolicyDate;
  readonly sourceLabel: string;
  readonly segmentIds: readonly string[];
  readonly fieldProvenance: readonly FieldEvidence[];
}
export interface PolicyRelationship extends DigestedMember {
  readonly fromVersionId: string;
  readonly type: "cites" | "amends" | "corrects" | "repeals" | "supersedes";
  readonly target: {
    readonly state: "resolved" | "unresolved" | "ambiguous";
    readonly workId: string | null;
    readonly versionId: string | null;
    readonly sourceIdentifier: string;
    readonly candidateVersionIds: readonly string[];
  };
  readonly sourceLabel: string;
  readonly sourceStatedAt: PolicyDate;
  readonly segmentIds: readonly string[];
}
export type InstitutionalDimension =
  | "actor"
  | "action"
  | "object"
  | "modality"
  | "trigger"
  | "condition"
  | "exception"
  | "procedure"
  | "review_requirement"
  | "time_constraint";
export interface PolicyAnalysis extends DigestedMember {
  readonly versionId: string;
  readonly kind: "institutional_procedure";
  readonly method: PolicyMethod;
  readonly reviewer: PolicyReviewer;
  readonly uncertainty: "provisional" | "reviewed";
  readonly codes: readonly {
    readonly dimension: InstitutionalDimension;
    readonly value: string;
    readonly segmentIds: readonly string[];
  }[];
}
export interface PolicyFinding extends DigestedMember {
  readonly question: string;
  readonly populationVersionIds: readonly string[];
  readonly method: PolicyMethod;
  readonly reviewer: PolicyReviewer;
  readonly disposition: "provisional" | "null" | "rejected";
  readonly claim: string;
  readonly supportingSegmentIds: readonly string[];
  readonly contrarySegmentIds: readonly string[];
  readonly missingEvidence: readonly string[];
  readonly rivalExplanations: readonly string[];
  readonly nextDisconfirmingTest: string;
  readonly analysisIds: readonly string[];
}
export interface PolicyCoverage extends DigestedMember {
  readonly sourceProfileId: string;
  readonly status: "healthy" | "degraded" | "unavailable";
  readonly documentCount: number;
  readonly versionCount: number;
  readonly from: PolicyDate;
  readonly through: PolicyDate;
  readonly dataAsOf: string | null;
  readonly lastSuccessfulAt: string | null;
  readonly failureStage: string | null;
  readonly lastKnownGoodDigest: string | null;
  readonly limitations: readonly string[];
  readonly exclusions: readonly string[];
}
export interface AnalyzedCorpusV2 extends DigestedMember {
  readonly $schema: typeof ANALYZED_CORPUS_V2_SCHEMA_ID;
  readonly schemaVersion: "2.0.0";
  readonly kind: "analyzed_corpus";
  readonly runId: string;
  readonly trustDomain: "real_source_local" | "synthetic_test_only";
  readonly generatedAt: string;
  readonly sourceProfiles: readonly PolicySourceProfile[];
  readonly captures: readonly PolicyCapture[];
  readonly works: readonly PolicyWork[];
  readonly versions: readonly PolicyDocumentVersion[];
  readonly renditions: readonly PolicyRendition[];
  readonly segments: readonly PolicyEvidenceSegment[];
  readonly events: readonly PolicySourceEvent[];
  readonly relationships: readonly PolicyRelationship[];
  readonly analyses: readonly PolicyAnalysis[];
  readonly findings: readonly PolicyFinding[];
  readonly coverage: readonly PolicyCoverage[];
}
export class AnalyzedCorpusV2Error extends TypeError {
  readonly code: string;
}
export interface PolicyJurisdictionAssociation extends JurisdictionAssociation {
  readonly versionId: string;
  readonly segmentIds: readonly string[];
  readonly reviewer: PolicyReviewer | null;
}
export interface PolicyWorkV21 extends PolicyWork {
  readonly jurisdictionRefs: readonly PolicyJurisdictionAssociation[];
}
export interface AnalyzedCorpusV21 extends Omit<
  AnalyzedCorpusV2,
  "$schema" | "schemaVersion" | "works"
> {
  readonly $schema: typeof ANALYZED_CORPUS_V21_SCHEMA_ID;
  readonly schemaVersion: "2.1.0";
  readonly works: readonly PolicyWorkV21[];
}
export type AnalyzedCorpus = AnalyzedCorpusV2 | AnalyzedCorpusV21;
export interface SupportedCorpusReplayOptions {
  readonly lastKnownGoodCorpora: readonly AnalyzedCorpus[];
}
export interface CorpusReplayOptions {
  readonly lastKnownGoodCorpora: readonly AnalyzedCorpusV2[];
}
export function canonicalV2Digest(value: unknown): string;
export function createAnalyzedCorpusV2(
  input: unknown,
  options?: CorpusReplayOptions,
): AnalyzedCorpusV2;
export function parseAnalyzedCorpusV2(
  value: unknown,
  options?: CorpusReplayOptions,
): AnalyzedCorpusV2;
export function serializeAnalyzedCorpusV2(
  value: unknown,
  options?: CorpusReplayOptions,
): string;
export function createAnalyzedCorpusV21(
  input: unknown,
  options?: SupportedCorpusReplayOptions,
): AnalyzedCorpusV21;
export function parseAnalyzedCorpusV21(
  value: unknown,
  options?: SupportedCorpusReplayOptions,
): AnalyzedCorpusV21;
export function serializeAnalyzedCorpusV21(
  value: unknown,
  options?: SupportedCorpusReplayOptions,
): string;
export function createSupportedAnalyzedCorpus(
  input: unknown,
  schemaVersion?: "2.0.0" | "2.1.0",
  options?: SupportedCorpusReplayOptions,
): AnalyzedCorpus;
export function parseSupportedAnalyzedCorpus(
  value: unknown,
  options?: SupportedCorpusReplayOptions,
): AnalyzedCorpus;
export function serializeSupportedAnalyzedCorpus(
  value: unknown,
  options?: SupportedCorpusReplayOptions,
): string;
export function evidenceSegmentId(
  renditionId: string,
  renditionDigest: string,
  startByte: number,
  endByte: number,
  textDigest: string,
): string;
export function createEvidenceSegment(input: {
  renditionId: string;
  renditionDigest: string;
  renditionBytes: Uint8Array;
  startByte: number;
  endByte: number;
  locator: PolicyLocator;
}): PolicyEvidenceSegment;
export interface CitationReplay {
  readonly kind: "corpus_citation_replay";
  readonly corpusDigest: string;
  readonly segmentId: string;
  readonly versionId: string;
  readonly captureId: string;
  readonly sourceUrl: string;
  readonly objectDigest: string;
  readonly renditionDigest: string;
  readonly textDigest: string;
  readonly contextDigest: string;
  readonly locator: PolicyLocator;
  readonly quote: string;
  readonly parserReplay: "not_performed" | "verified";
}
export function replayCorpusCitation(input: {
  corpus: unknown;
  segmentId: string;
  objectBytes: Uint8Array;
  renditionBytes: Uint8Array;
  reextract?: (
    bytes: Uint8Array,
    parser: PolicyRendition["parser"],
    mediaType: string,
  ) => Uint8Array;
  lastKnownGoodCorpora?: readonly AnalyzedCorpusV2[];
}): CitationReplay;
export interface LocalCorpusRecord {
  readonly workId: string;
  readonly versionId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly sourceIdentifier: string;
  readonly sourceVersionIdentifier: string;
  readonly sourceStatusLabel: string;
  readonly issuerRoles: PolicyWork["issuerRoles"];
  readonly authorityLabel: string;
  readonly governmentContext: string;
  readonly instrumentClass: PolicyInstrumentClass;
  readonly relevance: "general_jurisdiction";
  readonly taxonomy: "Unclassified";
  readonly dates: PolicyDocumentVersion["dates"];
  readonly observedAt: string;
  readonly displayPolicy: PolicySourceProfile["uses"]["localDisplay"];
  readonly renditions: readonly {
    readonly id: string;
    readonly outputDigest: string;
    readonly text: string | null;
  }[];
}
export function replaySupportedCorpusCitation(
  input: Omit<
    Parameters<typeof replayCorpusCitation>[0],
    "lastKnownGoodCorpora"
  > & {
    readonly lastKnownGoodCorpora?: readonly AnalyzedCorpus[];
  },
): CitationReplay;
export function projectLocalCorpusV2(
  value: unknown,
  options?: CorpusReplayOptions,
): {
  readonly kind: "local_corpus_projection";
  readonly schemaVersion: "2.0.0";
  readonly corpusId: string;
  readonly corpusDigest: string;
  readonly publication: "closed";
  readonly records: readonly LocalCorpusRecord[];
  readonly coverage: readonly PolicyCoverage[];
};
