import type { VocabularyFile } from "../../src/demo/index-types.ts";

export interface VocabularyReport {
  dropped: { id: string; reason: string }[];
}

export function mapFrAgencies(
  json: unknown,
  names: readonly string[],
): { file: VocabularyFile; report: VocabularyReport };
export function mapFrTopics(
  json: unknown,
  names: readonly string[],
): { file: VocabularyFile; report: VocabularyReport };
