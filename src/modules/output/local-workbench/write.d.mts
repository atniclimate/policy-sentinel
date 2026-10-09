import type { Buffer } from "node:buffer";
import type { CorpusReplayOptions } from "../../../pipeline/analyzed-corpus-v2.mjs";
import type { SearchProjectionDescriptor } from "./search-projection.mjs";

export interface LocalOutputFileEntry {
  readonly path: string;
  readonly digest: string;
  readonly bytes: number;
}

/** Fields checked when a supplied in-memory output snapshot is reused. */
export interface LocalOutputSnapshotManifest {
  readonly version?: unknown;
  readonly runId: string;
  readonly corpusDigest: string;
  readonly publication: "closed";
  readonly files: readonly LocalOutputFileEntry[];
  readonly searchProjection?: SearchProjectionDescriptor;
}

/** Additional fields checked by readLocalOutput against custody and its seal. */
export interface LocalOutputManifest extends LocalOutputSnapshotManifest {
  readonly buildId: string;
  readonly corpusSelection: "gold" | "discovery";
  readonly corpusSealDigest: string;
}

export interface LocalOutputSnapshot {
  readonly manifest: LocalOutputSnapshotManifest;
  readonly files: Map<string, Buffer>;
  readonly manifestDigest: string;
}

export interface ReadLocalOutputResult extends LocalOutputSnapshot {
  readonly manifest: LocalOutputManifest;
}

export interface LocalOutputWriteReceipt {
  readonly version: "1.0.0";
  readonly buildId: string;
  readonly manifestDigest: string;
  readonly corpusDigest: string;
  readonly files: number;
  readonly bytes: number;
}

export function localCorpusBytes(
  corpus: unknown,
  replayOptions?: CorpusReplayOptions,
): Buffer;

/** Reads owner/profile/receipt metadata from run; performs no root access. */
export function validateLocalOutputFiles(
  files: ReadonlyMap<string, Buffer>,
  manifest: {
    readonly corpusDigest: string;
    readonly searchProjection?: SearchProjectionDescriptor;
  },
  run: unknown,
  replayOptions?: CorpusReplayOptions,
): { readonly corpusDigest: string; readonly valid: true };
