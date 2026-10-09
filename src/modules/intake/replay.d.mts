import type { Buffer } from "node:buffer";
import type { AnalyzedCorpus } from "../../pipeline/analyzed-corpus-v2.mjs";

export {
  safeFile,
  assertProfileBindings,
  assertCaptureBindings,
} from "../../core/local-output-bindings.mjs";

export function readOwnedFile(
  root: string,
  relativePath: string,
  limit?: number,
): Promise<Buffer>;
export function replayReviewedCorpus(
  root: string,
  options?: { readonly name?: "gold" | "discovery" },
): Promise<{
  readonly corpus: AnalyzedCorpus;
  readonly custody: unknown;
  readonly seal: unknown;
  readonly input: unknown;
  readonly reviewedInput: unknown;
}>;
