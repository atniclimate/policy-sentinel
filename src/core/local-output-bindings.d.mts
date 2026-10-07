import type {
  AnalyzedCorpusV2,
  PolicySourceProfile,
} from "../pipeline/analyzed-corpus-v2.mjs";

export function safeFile(value: unknown): boolean;
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
