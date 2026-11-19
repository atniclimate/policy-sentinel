import type { VocabularyFile } from "../../src/demo/index-types.ts";

export interface VocabularyReport {
  dropped: { id: string; reason: string }[];
}

/** SHA-256 of each vocabulary entry id held out of the suggestion lists (G3), by kind. */
export const HELD_OUT_SHA256: Readonly<Record<string, readonly string[]>>;
/** True when this vocabulary entry id is held out; `list` is for tests. */
export function heldOut(
  kind: string,
  id: unknown,
  list?: Readonly<Record<string, readonly string[]>>,
): boolean;

export function mapFrAgencies(
  json: unknown,
  names: readonly string[],
  list?: Readonly<Record<string, readonly string[]>>,
): { file: VocabularyFile; report: VocabularyReport };
export function mapFrTopics(
  json: unknown,
  names: readonly string[],
): { file: VocabularyFile; report: VocabularyReport };
