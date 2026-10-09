import type { Buffer } from "node:buffer";
import type {
  AnalyzedCorpus,
  SupportedCorpusReplayOptions,
} from "../../../pipeline/analyzed-corpus-v2.mjs";
import type { LocalOutputFileEntry, LocalOutputSnapshot } from "./write.mjs";

export interface LocalSourceFailureRequest {
  readonly output: LocalOutputSnapshot;
  /** Existing inert custody metadata; no callbacks or root access are used. */
  readonly run: unknown;
  readonly sourceProfileId: string;
  readonly generatedAt: string;
  readonly priorOutput?: LocalOutputSnapshot | null;
}

export interface LocalSourceFailureManifest {
  readonly version: "1.0.0";
  readonly kind: "controlled_source_failure_output";
  readonly runId: string;
  readonly corpusDigest: string;
  readonly baselineCorpusDigest: string;
  readonly priorManifestDigest: string | null;
  readonly publication: "closed";
  readonly files: readonly LocalOutputFileEntry[];
}

export interface LocalSourceFailureResult {
  readonly corpus: AnalyzedCorpus;
  readonly files: Map<string, Buffer>;
  readonly manifest: LocalSourceFailureManifest;
  readonly replayOptions: SupportedCorpusReplayOptions;
  readonly sourceProfileId: string;
  readonly status: "degraded" | "unavailable";
  readonly automaticRefresh: false;
  readonly normalOutputChanged: false;
}

export function simulateLocalSourceFailure(
  request: LocalSourceFailureRequest,
): LocalSourceFailureResult;
