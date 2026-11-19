import type { LawAlias } from "../../src/demo/index-types.ts";
import type { NationProbe } from "./common.mjs";

/** The official table's address; a row's olrcUrl is this plus "#" and the entry id. */
export const TABLE_URL: string;

export interface PopularNameLine {
  type: "cite" | "short-title-ref" | "also-known-as" | "see" | "renamed";
  /** Official wording: tags removed, entities decoded, whitespace collapsed. */
  text: string;
  /** The usckey attribute as given; the table's keys are not always clean. */
  uscKey: string | null;
  /** Title and section of each U.S.C. link in the line, in order. */
  usc: { title: number; section: string }[];
}
export interface PopularNameEntry {
  id: string;
  item: number;
  name: string;
  lines: PopularNameLine[];
}

export function parsePopularNames(html: string): PopularNameEntry[];
export function releasePoints(html: string): string[];

export interface AliasReviewLine {
  wanted: string;
  outcome: "approved" | "named_in" | "flagged" | "no_row";
  /** The flags (comma-separated) or why there is no row; null when approved. */
  reason: string | null;
  /** Official wording or a hop that explains the outcome, when there is one. */
  detail: string | null;
  officialName: string | null;
  /** As the table prints them; the whole printed region when it cannot be parsed. */
  citations: string[];
  olrcUrl: string | null;
  /** Up to five official names for the reviewer. */
  nearest: string[];
}

export function buildAliasRows(
  entries: readonly PopularNameEntry[],
  wanted: readonly string[],
  options: {
    probe: NationProbe | readonly string[];
    reviewedOn: string;
    /** Exact official names the owner named in despite a flag (D-142). */
    namedIn?: readonly string[];
  },
): { rows: LawAlias[]; review: AliasReviewLine[] };

export function outcomeCounts(review: readonly AliasReviewLine[]): {
  approved: number;
  namedIn: Record<string, number>;
  flagged: Record<string, number>;
  noRow: Record<string, number>;
};
export function reviewMarkdown(
  review: readonly AliasReviewLine[],
  source?: string,
): string;
