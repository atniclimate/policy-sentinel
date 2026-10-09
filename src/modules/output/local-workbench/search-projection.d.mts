import type { Buffer } from "node:buffer";
import type {
  AnalyzedCorpus,
  SupportedCorpusReplayOptions,
  PolicyCoverage,
} from "../../../pipeline/analyzed-corpus-v2.mjs";

export const MAX_SEARCH_PROJECTION_BYTES: number;
export const MAX_SEARCH_PROJECTION_MANIFEST_BYTES: number;
export interface SearchProjectionSelection {
  readonly sourceProfileIds: readonly string[];
  readonly from?: string | null;
  readonly through?: string | null;
  readonly maxBytes?: number;
}
export interface SearchProjectionCoverage extends PolicyCoverage {
  readonly selected: boolean;
  readonly searched: boolean;
  readonly retained: boolean;
  readonly directlyMatchedVersionIds: readonly string[];
  readonly retainedVersionIds: readonly string[];
}
export interface SearchProjectionDescriptor {
  readonly file: "search-projection.json";
  readonly fileDigest: string;
  readonly bytes: number;
  readonly parentCorpusDigest: string;
}
export interface SearchProjectionManifest {
  readonly kind: "bounded_search_projection";
  readonly schemaVersion: "1.0.0";
  readonly ruleVersion: "whole-work-evidence-closure/1";
  readonly parentCorpusDigest: string;
  readonly corpusDigest: string;
  readonly fileDigest: string;
  readonly bytes: number;
  readonly selection: {
    readonly sourceProfileIds: readonly string[];
    readonly from: string | null;
    readonly through: string | null;
    readonly maxBytes: number;
    readonly dateBasis: "publication_overlap";
  };
  readonly directlySelectedVersionIds: readonly string[];
  readonly retainedVersionIds: readonly string[];
  readonly retainedSegmentIds: readonly string[];
  readonly excludedVersionIds: readonly string[];
  readonly omittedRelationshipIds: readonly string[];
  readonly omittedAnalysisIds: readonly string[];
  readonly omittedFindingIds: readonly string[];
  readonly coverage: readonly SearchProjectionCoverage[];
  readonly limitations: readonly string[];
  readonly contentDigest: string;
}
export interface SearchProjectionResult {
  readonly corpus: AnalyzedCorpus;
  readonly bytes: Buffer;
  readonly manifest: SearchProjectionManifest;
}
export function createSearchProjection(
  input: unknown,
  selection: SearchProjectionSelection,
  replayOptions?: SupportedCorpusReplayOptions,
): SearchProjectionResult;
export function serializeSearchProjectionManifest(
  manifest: SearchProjectionManifest,
): Buffer;
export function validateSearchProjectionEnvelope(
  manifest: unknown,
  corpus: AnalyzedCorpus,
  bytes: Buffer,
): SearchProjectionManifest;
export function verifySearchProjection(
  parent: AnalyzedCorpus,
  manifest: unknown,
  bytes: Buffer,
  replayOptions?: SupportedCorpusReplayOptions,
): SearchProjectionResult;
