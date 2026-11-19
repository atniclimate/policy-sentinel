import type { NationProbe } from "./common.d.mts";
import type { VocabularyFile } from "../../src/demo/index-types.ts";

export interface VocabularyReport {
  dropped: { id: string; reason: string }[];
  namedIn: { id: string; label: string }[];
}

/** SHA-256 of each vocabulary entry id held out of the suggestion lists (G3), by kind. */
export const HELD_OUT_SHA256: Readonly<Record<string, readonly string[]>>;
/** True when this vocabulary entry id is held out; `list` is for tests. */
export function heldOut(
  kind: string,
  id: unknown,
  list?: Readonly<Record<string, readonly string[]>>,
): boolean;

/** The 18 ids named in by kind, despite the STRUCTURAL mask (D-191). */
export const NAMED_IN: Readonly<Record<string, readonly string[]>>;
/** True when this vocabulary entry id is named in for this kind (D-191). */
export function namedIn(kind: string, id: unknown): boolean;

export function mapFrAgencies(
  json: unknown,
  names: readonly string[] | NationProbe,
  list?: Readonly<Record<string, readonly string[]>>,
): { file: VocabularyFile; report: VocabularyReport };
export function mapFrTopics(
  json: unknown,
  names: readonly string[] | NationProbe,
): { file: VocabularyFile; report: VocabularyReport };
