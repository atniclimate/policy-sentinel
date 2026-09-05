import type {
  AnalyzedCorpusV2,
  PolicyMethod,
  PolicyInstrumentClass,
} from "../pipeline/analyzed-corpus-v2.mjs";
import type {
  TemporalBasis,
  TemporalSelection,
} from "./temporal-operations.mjs";

export interface PolicySearchIndex {
  readonly kind: "policy_search_index";
  readonly method: PolicyMethod;
  readonly corpusDigest: string;
  readonly versionCount: number;
  readonly passageCount: number;
}
export interface PolicySearchRequest {
  readonly query: string;
  readonly sourceProfileId?: string;
  readonly governmentContext?: string;
  readonly instrumentClass?: PolicyInstrumentClass;
  readonly asOf?: string;
  /** Required with a cutoff; no date axis is silently selected. */
  readonly basis?: TemporalBasis;
  readonly limit?: number;
  readonly passageLimit?: number;
}
export interface PolicyPassageHit {
  readonly segmentId: string;
  readonly renditionId: string;
  readonly captureId: string;
  readonly score: number;
  readonly matchedTerms: readonly string[];
  readonly matchedPhrases: readonly string[];
  readonly whyShown: "source_passage_match" | "identifier_or_browse_evidence";
}
export interface PolicySearchHit {
  readonly workId: string;
  readonly versionId: string;
  readonly sourceProfileId: string;
  readonly score: number;
  readonly exactIdentifierMatch: boolean;
  readonly whyShown: readonly string[];
  readonly metadataKnown: {
    readonly title: boolean;
    readonly identifier: boolean;
    readonly status: boolean;
    readonly versionIdentifier: boolean;
  };
  readonly passages: readonly PolicyPassageHit[];
  readonly matchingPassageCount: number;
  readonly eventIds: readonly string[];
  readonly temporalState:
    "not_filtered" | "supported_source_snapshot" | "ambiguous";
  readonly temporalReason: string;
}
export interface PolicySearchResults {
  readonly kind: "policy_search_results";
  readonly method: PolicyMethod;
  readonly corpusDigest: string;
  readonly query: string;
  readonly queryTerms: readonly string[];
  readonly total: number;
  readonly hits: readonly PolicySearchHit[];
  readonly temporal: null | {
    readonly asOf: string;
    readonly basis: TemporalBasis;
    readonly unknownWorkIds: readonly string[];
    readonly excluded: TemporalSelection["excluded"];
    readonly limitations: readonly string[];
  };
  readonly limitations: readonly string[];
}
/** Caller supplies an already validated immutable v2 corpus. Build once per corpus. */
export function createPolicySearchIndex(
  corpus: AnalyzedCorpusV2,
): PolicySearchIndex;
export function searchPolicyCorpus(
  index: PolicySearchIndex,
  request: PolicySearchRequest,
): PolicySearchResults;
export function policySearchPassage(
  index: PolicySearchIndex,
  segmentId: string,
  options?: { readonly maxCharacters?: number },
): {
  readonly segmentId: string;
  readonly text: string | null;
  readonly truncated: boolean;
  readonly reason: "source_display_policy" | null;
};
