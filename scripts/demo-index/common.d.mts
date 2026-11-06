import type { Buffer } from "node:buffer";
import type { IndexFile, IndexManifest } from "../../src/demo/index-types.ts";

export const ACQUIRE_VERSION: string;
export const APPROVAL_REF: string;
export const SCHEMA_REF: string;
export const REPO_ROOT: string;
export const SCHEMA_PATH: string;
export const DEFAULT_PROBE_FIXTURE: string;
export const OFFICIAL_HOSTS: readonly string[];
export const FORBIDDEN_OUTPUT: readonly RegExp[];
export const CREDENTIAL_PATTERNS: readonly RegExp[];
export const PLANNED_FILES: readonly string[];
export const VOCAB_KIND_OF_PATH: Readonly<Record<string, string>>;

export function kindOfPath(path: string): IndexFile["kind"];
export function sourceIdOfPath(path: string): string;
export function unavailableEntry(
  path: string,
  patternSetVersion: string,
): IndexFile;
export function initialManifest(options: {
  generatedAt: string;
  patternSetVersion: string;
  verbatimFields: readonly string[];
}): IndexManifest;
export function shardBytes(value: unknown): Buffer;
export function manifestBytes(value: unknown): Buffer;
export function comparePart(left: string, right: string): number;
/** Nation-name probes: plain names, and the hashed list when loaded (decision 10). */
export interface NationProbe {
  source: string;
  names: string[];
  entryCount?: number;
  /** SHA-256 hex of each normalized name form. */
  hashes?: ReadonlySet<string>;
  /** The longest normalized name form, in words. */
  maxWords?: number;
}
export interface NationProbeHashFile {
  artifactType: "nation-name-probe-hashes";
  normalization: string;
  entryCount: number;
  maxWords: number;
  hashes: string[];
}
export function loadProbeNames(path?: string): NationProbe & {
  entryCount: number;
};
export const FULL_PROBE_ENTRIES: number;
export function isFullProbe(probe: NationProbe): boolean;
export const PROBE_HASH_PATH: string;
export const PROBE_NORMALIZATION: string;
export function probeHashFile(
  names: readonly string[],
  entryCount: number,
): NationProbeHashFile;
export function hashedProbe(file: unknown, source: string): NationProbe;
export function loadNationProbe(options?: {
  namesPath?: string;
  hashPath?: string;
}): NationProbe;
export function probeHashHit(text: string, probe: NationProbe): boolean;
export function probeHit(text: string, probe: NationProbe): boolean;
export function hasProtectedSpan(
  text: string,
  names: readonly string[],
): boolean;
export type WordingProblem =
  "nation_name_probe" | "url" | "personal_pattern" | "markup";
export function wordingProblem(
  text: string,
  names: readonly string[],
): WordingProblem | null;
export function sanitizeMessage(message: unknown): string;
export class StageError extends Error {
  constructor(
    stage: "fetch" | "normalize" | "validation" | "packaging",
    message: string,
  );
  stage: "fetch" | "normalize" | "validation" | "packaging";
}
