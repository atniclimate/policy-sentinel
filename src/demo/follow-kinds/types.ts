/**
 * What a follow kind needs (T1.6): how its id is formed, the baseline kept
 * with a followed item, what a candidate listing's version key is, and
 * whether that key is new against the baseline, plus its display label.
 * Registering a kind is adding one object here and one line to the registry
 * in `./index.ts`; step 8 adds "case" (a GovInfo package id with a court
 * code; new means a new package or a changed `lastModified`).
 */
import type { DemoCitation } from "../types";

export interface FollowKindDef<Baseline = string> {
  readonly label: string;
  /** How the follow id is formed from the source and the followed value. */
  readonly id: (sourceId: string, value: string) => string;
  /** The baseline taken from a followed item's last check (or its follow time, before the first). */
  readonly baseline: (
    lastChecked: string | null,
    followedAt: string,
  ) => Baseline;
  /** A candidate listing's version key under this kind; null when it states none (never new). */
  readonly versionKey: (listing: DemoCitation) => string | null;
  /** True when `key` (from `versionKey`) is new relative to `baseline`. */
  readonly isNew: (baseline: Baseline, key: string) => boolean;
}
