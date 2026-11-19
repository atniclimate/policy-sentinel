/**
 * The reviewed issue table (D-163 to D-165): issues, the bills and rules that
 * carry them (measures), and the sections that file a measure under an issue
 * (provisions). The table lives in config/issues.v1.json and is validated by
 * schemas/issues.schema.v1.json and tests/demo/issues-table.test.ts.
 *
 * An issue names a subject, never a position or an effect (safeguard 2). Every
 * identifier carries the official page read for it and the day it was read
 * (design rule 8). A name either is stated on an official page or is a name
 * people use on the owner's review (D-162), and the page says which. A
 * provision either cites an identifier the issue rests on, in the section's
 * own text, or is listed on the owner's review alone (D-165), and the page
 * says which. Nothing here names a Nation or links a record to one.
 *
 * Erasable TypeScript, type-only imports, so Node can load it.
 */
import type { PlanSearch } from "./discovery.ts";

export type IdentifierKind =
  | "usc"
  | "cfr"
  | "public_law"
  | "executive_order"
  | "fr_document"
  | "docket"
  | "rin"
  | "bill";

export interface IssueIdentifier {
  readonly kind: IdentifierKind;
  /**
   * As the sources and the router spell it: "54 U.S.C. 306108", "36 CFR 800",
   * "Pub. L. 93-638", "E.O. 13175", "2026-16965", "FS-2025-0001",
   * "0596-AD66", or a bill as Congress.gov lookups take it, "s 5653 119".
   */
  readonly id: string;
  /** What the reader sees: "S. 5653 (119th Congress)". */
  readonly label: string;
  /** The official page read for it. */
  readonly url: string;
  /** The heading or title that page states, verbatim. */
  readonly stated: string;
  /** YYYY-MM-DD */
  readonly readOn: string;
}

export interface IssueName {
  /** Matched as a whole phrase; a name in capitals and digits only is matched case-sensitive. */
  readonly name: string;
  /** "official": `statedAt` states it. "people_use": the owner's review alone (D-162). */
  readonly basis: "official" | "people_use";
  readonly statedAt?: string;
  /** The official wording that states the name, verbatim and short. */
  readonly wording?: string;
  /** YYYY-MM-DD */
  readonly reviewedOn: string;
}

export interface Provision {
  /** The id of the issue this section is filed under. */
  readonly issue: string;
  /** One of the measure's bill identifier ids. */
  readonly bill: string;
  /** The version as GovInfo names it: "Introduced in Senate". */
  readonly version: string;
  /** The section number as the bill prints it: "2301". */
  readonly section: string;
  /** The section heading, verbatim. */
  readonly heading: string;
  /** The bill text read. */
  readonly url: string;
  /** YYYY-MM-DD */
  readonly readOn: string;
  /**
   * "cites": the section's text states a citation to each id in `cites`, all
   * identifiers the issue rests on. "listed": the owner's review alone (D-165).
   */
  readonly basis: "cites" | "listed";
  readonly cites?: readonly string[];
  /** YYYY-MM-DD */
  readonly reviewedOn: string;
}

interface EntryBase {
  /** Stable, lower case and hyphens: "section-106". */
  readonly id: string;
  /** Unique across the table; the search box puts it in the box when chosen. */
  readonly label: string;
  readonly names: readonly IssueName[];
  /** Every search automatic; with provision bill lookups, within AUTO_REQUEST_BUDGET. */
  readonly searches: readonly PlanSearch[];
  /** A page that describes the subject: context, never a source or a result. */
  readonly context?: { readonly url: string; readonly label: string };
  readonly reviewedOn: string;
  readonly reviewerRole: "owner";
}

export interface IssueEntry extends EntryBase {
  readonly kind: "issue";
  /** May be empty only when a provision lists the issue. */
  readonly restsOn: readonly IssueIdentifier[];
}

export interface MeasureEntry extends EntryBase {
  readonly kind: "measure";
  /** Each chamber's bill, or a rule's docket. */
  readonly identifiers: readonly IssueIdentifier[];
  readonly provisions: readonly Provision[];
}

export type TableEntry = IssueEntry | MeasureEntry;

export interface IssueFile {
  readonly $schema: string;
  readonly schemaVersion: "1.0.0";
  readonly artifactType: "issues";
  /** Issues first, then measures; each group sorted by label. */
  readonly entries: readonly TableEntry[];
}

export const entryByLabel = (
  table: IssueFile,
  label: string,
): TableEntry | undefined => table.entries.find((e) => e.label === label);

export const entryById = (
  table: IssueFile,
  id: string,
): TableEntry | undefined => table.entries.find((e) => e.id === id);

/** Every provision filed under an issue, with the measure that holds it, in table order. */
export function provisionsFor(
  table: IssueFile,
  issueId: string,
): readonly {
  readonly measure: MeasureEntry;
  readonly provision: Provision;
}[] {
  return table.entries.flatMap((entry) =>
    entry.kind === "measure"
      ? entry.provisions
          .filter((p) => p.issue === issueId)
          .map((provision) => ({ measure: entry, provision }))
      : [],
  );
}

/** A measure's issues in the order its provisions name them, each once. */
export function issuesIn(
  table: IssueFile,
  measure: MeasureEntry,
): readonly IssueEntry[] {
  const ids = [...new Set(measure.provisions.map((p) => p.issue))];
  return ids
    .map((id) => entryById(table, id))
    .filter((e): e is IssueEntry => e?.kind === "issue");
}

const billLookup = (bill: IssueIdentifier): PlanSearch => ({
  group: "legislation",
  source: "congress",
  query: bill.id,
  label: bill.label,
  auto: true,
});

/**
 * The searches one entry runs. An issue adds the Congress.gov lookup of each
 * bill a provision files under it, after its own searches; a measure runs its
 * own. buildPlan drops a repeated lane, so a bill named twice is asked once.
 */
export function entrySearches(
  table: IssueFile,
  entry: TableEntry,
): readonly PlanSearch[] {
  if (entry.kind === "measure") return entry.searches;
  const bills = provisionsFor(table, entry.id).flatMap(
    ({ measure, provision }) =>
      measure.identifiers.filter(
        (id) => id.kind === "bill" && id.id === provision.bill,
      ),
  );
  return [...entry.searches, ...bills.map(billLookup)];
}
