/** Cited and linked records strings (design section 2, index conditions C and D). */
import type { Basis } from "../types.ts";

export const chain = {
  title: "Cited and Linked Records",
  sections: {
    stated: "Stated by the Source",
    identifiers: "Shared Identifiers",
    inText: "Citations Found in the Text",
  },
  /** Shown when a section has no rows, so an empty list never reads as checked and empty. */
  noneStated: "None stated in what was read.",
  basis: {
    source_field: "Stated in a source field",
    source_text_parsed: "Parsed from source text",
    identifier_match: "Same official identifier",
    citation_in_text: "Full citation in the text",
    curated: "Reviewed list",
  } satisfies Record<Basis, string>,
  facts: {
    basis: "Basis",
    source: "Source",
    wording: "Source wording",
    asOf: "As of",
    releasePoint: "Release point",
    published: "Published",
    retrieved: "Retrieved",
    notice: "Note",
  },
  dateNotStated: "Date not stated by the source",
  liveLink: (sourceName: string) => `Open at ${sourceName}`,
  openHop: (target: string) => `Open ${target} in this chain`,
  /** The link on a row whose label already names its target. */
  openRecord: "Open the record",
  /** An in-text citation named in several places, grouped into its first row. */
  places: (count: number) =>
    `Found at ${count} places in this text; the first is shown.`,
  expand: {
    govinfo_related: "Show related records stated by GovInfo",
    congress_related_bills: "Show related bills stated by Congress.gov",
  },
  expandHelp: "One request to the source on each press.",
  expandLoading: "Asking the source.",
  expandFailed: "The source did not answer. Try again later.",
  // Index file states (conditions C3, D2 to D4).
  indexUnavailable: "Index unavailable",
  notYetAvailable: "Not yet available",
  withdrawn: (date: string) =>
    `Withdrawn on ${date} while the source's terms are reviewed`,
  stale: "Snapshot older than six months; check the source.",
  /** Where an index hop's live link goes, by the hop target's source. */
  indexSources: {
    "cfr-index": "eCFR",
    "usc-index": "the Office of the Law Revision Counsel",
  },
  /** An index hop whose part or section the file does not hold. */
  notInIndex: "Not in the index file",
  /** An index hop opened from the search box; the rows show in an opened record's chain. */
  hopRows: (n: number) =>
    `${n} ${n === 1 ? "row" : "rows"} in the index file; open a record that cites it to see them`,
  /** The source listed more than the Worker brought back. */
  cut: (shown: number, total: number) =>
    `${shown} of ${total} listed by the source are shown here; open the source for the rest`,
} as const;
