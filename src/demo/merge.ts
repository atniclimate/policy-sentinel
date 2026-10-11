import type { DemoCitation } from "./types";

/**
 * Which record to show when several federal sources list the same document,
 * most checkable first: the demo reads the Federal Register entry's official
 * text, GovInfo is the publisher's repository and Regulations.gov is a docket
 * copy.
 */
export const FEDERAL_PRECEDENCE: readonly string[] = [
  "federal-register",
  "govinfo",
  "regulations",
  "congress",
];

/** One bill reference: type, number, Congress. The Worker reads the three groups. */
export const CONGRESS_REFERENCE =
  /^\s*(hr|s|hjres|sjres|hconres|sconres|hres|sres)\s*(\d{1,5})\s+(\d{2,3})\s*$/i;

export interface SourceResults {
  readonly sourceId: string;
  readonly results: readonly DemoCitation[];
}

export interface MergedResult {
  readonly citation: DemoCitation;
  /** The same document as listed by lower-precedence sources, in precedence order. */
  readonly alternates: readonly DemoCitation[];
}

function precedence(sourceId: string): number {
  const index = FEDERAL_PRECEDENCE.indexOf(sourceId);
  return index < 0 ? FEDERAL_PRECEDENCE.length : index;
}

/**
 * Interleave the sources by rank and collapse listings of the same document.
 * Only an exact shared matchKey merges; titles never do. One source can list
 * a document more than once (Regulations.gov lists a joint rule once per
 * agency docket), and those listings merge too.
 */
export function mergeResults(batches: readonly SourceResults[]): {
  readonly results: MergedResult[];
  readonly merged: number;
} {
  const ordered = [...batches].sort(
    (a, b) => precedence(a.sourceId) - precedence(b.sourceId),
  );
  const rows: DemoCitation[][] = [];
  const byKey = new Map<string, DemoCitation[]>();
  const depth = Math.max(0, ...ordered.map((batch) => batch.results.length));
  for (let rank = 0; rank < depth; rank += 1) {
    for (const batch of ordered) {
      if (rank >= batch.results.length) continue;
      const citation = batch.results[rank];
      const row =
        citation.matchKey === null ? undefined : byKey.get(citation.matchKey);
      if (row) {
        row.push(citation);
        continue;
      }
      const created = [citation];
      rows.push(created);
      if (citation.matchKey !== null) byKey.set(citation.matchKey, created);
    }
  }
  const results = rows.map((row): MergedResult => {
    const [citation, ...alternates] = [...row].sort(
      (a, b) => precedence(a.sourceId) - precedence(b.sourceId),
    );
    return { citation, alternates };
  });
  return {
    results,
    merged: results.reduce((sum, row) => sum + row.alternates.length, 0),
  };
}

/** True for one bill reference such as "hr 1234 119" (same grammar the Worker accepts). */
export function isCongressReference(query: string): boolean {
  return CONGRESS_REFERENCE.test(query);
}
