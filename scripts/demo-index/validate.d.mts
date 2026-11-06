import type { NationProbe } from "./common.mjs";

export const CAPS: Readonly<{
  manifestBytes: number;
  vocabFileBytes: number;
  vocabTotalBytes: number;
  vocabTotalGzipBytes: number;
  shardBytes: number;
  shardGzipBytes: number;
  totalWarnBytes: number;
  totalBytes: number;
  totalGzipBytes: number;
}>;
export const STALE_DAYS: number;
export const STALE_ENFORCED_FROM: string;

export interface DemoIndexResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Paths whose retrievedAt is older than STALE_DAYS. */
  stale: string[];
  fileCount: number;
  currentCount: number;
  totalBytes: number;
  probe: { source: string; nameCount: number; hashCount: number };
}

export function validateDemoIndex(
  dir: string,
  options?: {
    probe?: NationProbe;
    names?: readonly string[];
    probeSource?: string;
    now?: Date;
  },
): DemoIndexResult;
export function schemaErrors(
  name:
    | "manifest"
    | "cfr-authority-shard"
    | "usc-source-credit-shard"
    | "vocabulary"
    | "sourceRights",
  value: unknown,
): string[];
export function schemaVerbatimFields(
  node?: unknown,
  out?: Set<string>,
): Set<string>;
