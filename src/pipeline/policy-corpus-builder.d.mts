import type {
  AnalyzedCorpusV2,
  PolicySourceProfile,
  PolicyWork,
  PolicyDocumentVersion,
  PolicySourceEvent,
  PolicyRelationship,
  PolicyAnalysis,
  PolicyFinding,
  PolicyCoverage,
  PolicyDate,
} from "./analyzed-corpus-v2.mjs";
import type { ExtractedPolicyText, PolicyTextInput } from "./policy-text.mjs";

export interface PolicyItemEvidence {
  readonly operationId: string;
  readonly mode: "source_attested" | "deterministic";
  readonly ruleId: string | null;
  /** Exactly one selector is required. Locator values are from extracted blocks. */
  readonly blockLocators?: readonly string[];
  /** Metadata must occur literally in an existing retained block. No new rendition is invented. */
  readonly metadata?: {
    readonly field: string;
    readonly sourceLocator: string;
  };
  readonly sourceLocator?: string;
  /** Required for deterministic mappings; must occur literally in selected source evidence. */
  readonly sourceValue?: string;
  /** Only the reviewed Washington chapter rule; the selected blocks must attest this chapter year. */
  readonly dateYearContext?: string;
}
export interface RetainedPolicyExtraction extends ExtractedPolicyText {
  readonly version: "1.0.0";
  readonly state: "extracted_pending_review";
  readonly captureOperationId: string;
  readonly objectDigest: string;
  readonly renditionDigest: string;
  readonly sourceKind: PolicyTextInput["sourceKind"];
}
export interface ReviewedCaptureReceipt {
  readonly operationId: string;
  readonly profileId: string;
  readonly url: string;
  readonly finalUrl: string;
  readonly state: "complete";
  readonly status: 200;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly mediaType: string;
  readonly encodedBytes: number;
  readonly decodedBytes: number;
  readonly objectDigest: string;
  readonly objectPath: string;
  readonly expectedIdentity: string;
  readonly errorCode: null;
  readonly [otherReceiptField: string]: unknown;
}
export interface ReviewedPolicyCorpusItem {
  /**
   * Repeat identical work values for multiple explicitly reviewed versions.
   * Evidence resolves across captures explicitly retained for this same work.
   * The lexically first version's work evidence descriptor is canonical; repeat
   * one shared descriptor to avoid order dependence. Title is a work label;
   * each actual version title remains in that version's source rendition.
   */
  readonly work: Omit<
    PolicyWork,
    "contentDigest" | "relevance" | "taxonomy" | "fieldProvenance"
  > & {
    readonly fieldEvidence: Readonly<Record<string, PolicyItemEvidence>>;
  };
  readonly version: Omit<
    PolicyDocumentVersion,
    | "contentDigest"
    | "workId"
    | "observedAt"
    | "renditionIds"
    | "fieldProvenance"
  > & {
    /** Version evidence resolves only against this item's captures. */
    readonly fieldEvidence: Readonly<Record<string, PolicyItemEvidence>>;
  };
  readonly captures: readonly {
    readonly receipt: ReviewedCaptureReceipt;
    readonly extraction: RetainedPolicyExtraction;
    /** Caller reads/checks custody; builder verifies this digest and replays extraction without I/O. */
    readonly sourceBytes: Uint8Array;
  }[];
  readonly review: { readonly reviewer: string; readonly reviewedAt: string };
  readonly events?: readonly (Omit<
    PolicySourceEvent,
    "contentDigest" | "workId" | "versionId" | "segmentIds" | "fieldProvenance"
  > & {
    readonly fieldEvidence: Readonly<Record<string, PolicyItemEvidence>>;
    readonly evidence: readonly PolicyItemEvidence[];
  })[];
}
export interface PolicyCorpusBuilderInput {
  readonly id: string;
  readonly runId: string;
  readonly trustDomain: "real_source_local" | "synthetic_test_only";
  readonly generatedAt: string;
  readonly sourceProfiles: readonly (Omit<
    PolicySourceProfile,
    "contentDigest"
  > & { readonly contentDigest?: string })[];
  readonly items: readonly ReviewedPolicyCorpusItem[];
  /** Full reviewed v2 coverage override; otherwise exact local counts and unknown date bounds. */
  readonly coverage?: readonly Omit<PolicyCoverage, "contentDigest">[];
  readonly relationships?: readonly Omit<PolicyRelationship, "contentDigest">[];
  readonly analyses?: readonly Omit<PolicyAnalysis, "contentDigest">[];
  readonly findings?: readonly Omit<PolicyFinding, "contentDigest">[];
}
export function createPolicyCorpus(
  input: PolicyCorpusBuilderInput,
): AnalyzedCorpusV2;
export function policyCaptureId(
  sourceProfileId: string,
  operationId: string,
): string;
export function policyRenditionId(
  versionId: string,
  captureId: string,
  extraction: Pick<
    RetainedPolicyExtraction,
    "sourceKind" | "parser" | "renditionDigest"
  >,
): string;
export function normalizePolicyDateSource(
  sourceValue: string,
  options?: { readonly yearContext?: string },
): PolicyDate;
export function policyCorpusEvidenceIndex(
  corpus: AnalyzedCorpusV2,
): readonly Readonly<{
  versionId: string;
  operationId: string;
  captureId: string;
  renditionId: string;
  segmentId: string;
  sourceLocator: string;
  startByte: number;
  endByte: number;
}>[];
