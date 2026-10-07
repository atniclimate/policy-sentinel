import type { Buffer } from "node:buffer";
import type {
  AnalyzedCorpusV2,
  PolicySourceProfile,
} from "../../pipeline/analyzed-corpus-v2.mjs";

export function safeFile(value: unknown): boolean;
export function readOwnedFile(
  root: string,
  relativePath: string,
  limit?: number,
): Promise<Buffer>;
export function assertProfileBindings(
  corpusOrInput: {
    readonly sourceProfiles: readonly Pick<
      PolicySourceProfile,
      "id" | "hosts" | "pathPrefixes" | "review" | "uses"
    >[];
  },
  run: unknown,
): void;
export function assertCaptureBindings(
  corpus: Pick<AnalyzedCorpusV2, "captures">,
  run: unknown,
): void;
export function replayReviewedCorpus(
  root: string,
  options?: { readonly name?: "gold" | "discovery" },
): Promise<{
  readonly corpus: AnalyzedCorpusV2;
  readonly custody: unknown;
  readonly seal: unknown;
  readonly input: unknown;
  readonly reviewedInput: unknown;
}>;
