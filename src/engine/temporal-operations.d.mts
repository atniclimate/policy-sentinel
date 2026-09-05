import type {
  AnalyzedCorpusV2,
  InstitutionalDimension,
  PolicyDate,
  PolicyMethod,
  PolicyReviewer,
  PolicyRelationship,
} from "../pipeline/analyzed-corpus-v2.mjs";
export type TemporalBasis =
  "source_available" | "corpus_observed" | "source_effective";
export function policyDateBounds(value: PolicyDate): {
  readonly earliest: string;
  readonly latest: string;
  readonly precision: PolicyDate["precision"];
} | null;
export interface TemporalSelection {
  readonly kind: "temporal_selection";
  readonly method: PolicyMethod;
  readonly corpusDigest: string;
  readonly asOf: string;
  readonly basis: TemporalBasis;
  readonly selections: readonly {
    readonly workId: string;
    readonly state: "unknown" | "supported_source_snapshot" | "ambiguous";
    readonly versionIds: readonly string[];
    readonly renditionIds?: readonly string[];
    readonly eventIds: readonly string[];
    readonly reason: string;
  }[];
  readonly excluded: readonly {
    readonly versionId: string;
    readonly workId: string;
    readonly reason: string;
  }[];
  readonly limitations: readonly string[];
}
export function selectTemporalVersions(
  corpus: AnalyzedCorpusV2,
  request: { asOf: string; basis: TemporalBasis },
): TemporalSelection;
export interface VersionComparison {
  readonly kind: "version_comparison";
  readonly method: PolicyMethod;
  readonly corpusDigest: string;
  readonly workId: string;
  readonly beforeVersionId: string;
  readonly afterVersionId: string;
  readonly beforeRenditionId: string;
  readonly afterRenditionId: string;
  readonly changeType: "identical" | "formatting_only" | "text_changed";
  readonly temporalOrder: "source_dates_ordered" | "unknown_or_overlapping";
  readonly changes: readonly {
    readonly locator: string;
    readonly kind:
      | "added"
      | "removed"
      | "ambiguous_locator"
      | "unchanged"
      | "formatting_only"
      | "text_changed";
    readonly beforeSegmentIds: readonly string[];
    readonly afterSegmentIds: readonly string[];
  }[];
  readonly limitations: readonly string[];
}
export function compareDocumentVersions(
  corpus: AnalyzedCorpusV2,
  request: { beforeVersionId: string; afterVersionId: string },
): VersionComparison;
export interface RelatedProvisionComparison extends Omit<
  VersionComparison,
  "kind" | "workId"
> {
  readonly kind: "related_provision_comparison";
  readonly beforeWorkId: string;
  readonly afterWorkId: string;
  readonly relationshipId: string;
  readonly relationshipType: "amends" | "supersedes" | "corrects";
  readonly relationshipSourceLabel: string;
  readonly relationshipSegmentIds: readonly string[];
}
export function compareRelatedProvisions(
  corpus: AnalyzedCorpusV2,
  request: {
    beforeVersionId: string;
    afterVersionId: string;
    relationshipId: string;
  },
): RelatedProvisionComparison;
export interface InstitutionalComparison {
  readonly kind: "institutional_procedure_comparison";
  readonly method: PolicyMethod;
  readonly corpusDigest: string;
  readonly analysisIds: readonly string[];
  readonly populationVersionIds: readonly string[];
  readonly rows: readonly {
    readonly dimension: InstitutionalDimension;
    readonly observations: readonly {
      readonly analysisId: string;
      readonly versionId: string;
      readonly state: "coded" | "not_coded_unknown";
      readonly values: readonly {
        readonly value: string;
        readonly segmentIds: readonly string[];
      }[];
      readonly method: PolicyMethod;
      readonly reviewer: PolicyReviewer;
      readonly uncertainty: "provisional" | "reviewed";
    }[];
  }[];
  readonly references: readonly {
    readonly analysisId: string;
    readonly versionId: string;
    readonly governmentContext: string;
    readonly links: readonly {
      readonly relationshipId: string;
      readonly type: PolicyRelationship["type"];
      readonly state: PolicyRelationship["target"]["state"];
      readonly targetIdentifier: string;
      readonly segmentIds: readonly string[];
    }[];
  }[];
  readonly uncertainty: "provisional_comparison_of_declared_coding";
  readonly limitations: readonly string[];
}
export function compareInstitutionalProcedures(
  corpus: AnalyzedCorpusV2,
  request: { analysisIds: readonly string[] },
): InstitutionalComparison;
export interface RelationshipResolution {
  readonly kind: "relationship_resolution";
  readonly method: PolicyMethod;
  readonly corpusDigest: string;
  readonly versionId: string;
  readonly asOf: string;
  readonly basis: "source_available";
  readonly relationships: readonly {
    readonly relationshipId: string;
    readonly type: PolicyRelationship["type"];
    readonly state:
      PolicyRelationship["target"]["state"] | "target_not_available_by_cutoff";
    readonly target: PolicyRelationship["target"];
    readonly sourceLabel: string;
    readonly segmentIds: readonly string[];
  }[];
  readonly excluded: readonly {
    readonly relationshipId: string;
    readonly reason: string;
  }[];
  readonly limitation: string;
}
export function resolveCorpusRelationships(
  corpus: AnalyzedCorpusV2,
  request: { versionId: string; asOf: string },
): RelationshipResolution;
