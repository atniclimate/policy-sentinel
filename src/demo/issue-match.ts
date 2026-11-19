/**
 * Issues that come up from identifiers (D-164): never from words. Pure
 * functions, no network, no storage.
 *
 * `issuesInResults` matches a search result's own stated identifiers
 * (cfrRefs, docketIds, rins, the Federal Register document number, and a
 * Congress.gov or GovInfo BILLS bill identity) against the table's
 * identifiers. `issuesInText` matches the opened document's in-text
 * citations (`src/demo/links.ts` ChainRow, basis `citation_in_text`)
 * against the same table.
 */
import { baseSection } from "./links.ts";
import type { ChainLink, ChainRow } from "./links.ts";
import { cfrQuery } from "./search-contract.ts";
import type { IssueFile, IssueIdentifier, TableEntry } from "./issues.ts";
import type { DemoCitation } from "./types.ts";

/** One identifier of an entry that a result or the in-text citations stated, and how many times. */
export interface IdentifierMatch {
  readonly identifier: IssueIdentifier;
  readonly count: number;
}

/** One table entry that came up, with each identifier matched, in table order. */
export interface EntryMatch {
  readonly entry: TableEntry;
  readonly matches: readonly IdentifierMatch[];
}

const identifiersOf = (entry: TableEntry): readonly IssueIdentifier[] =>
  entry.kind === "issue" ? entry.restsOn : entry.identifiers;

function matchEntries(
  table: IssueFile,
  countFor: (identifier: IssueIdentifier) => number,
): readonly EntryMatch[] {
  const out: EntryMatch[] = [];
  for (const entry of table.entries) {
    const matches: IdentifierMatch[] = [];
    for (const identifier of identifiersOf(entry)) {
      const count = countFor(identifier);
      if (count > 0) matches.push({ identifier, count });
    }
    if (matches.length > 0) out.push({ entry, matches });
  }
  return out;
}

// A Congress.gov bill identifier as congress.ts's billRef writes it:
// "S 5653, 119th Congress".
const CONGRESS_BILL =
  /^([A-Za-z]{1,7}) (\d{1,5}), (\d{1,3})(?:st|nd|rd|th) Congress$/;
// A GovInfo BILLS package id: "BILLS-119s5653is".
const BILLS_PACKAGE =
  /^BILLS-(\d{2,3})(hr|s|hjres|sjres|hconres|sconres|hres|sres)(\d{1,5})[a-z0-9]*$/i;

/** The bill identity a Congress.gov or GovInfo BILLS result states, as "s 5653 119"; null when neither. */
function billIdentifierOf(citation: DemoCitation): string | null {
  if (citation.sourceId === "congress") {
    const m = CONGRESS_BILL.exec(citation.identifier);
    return m ? `${m[1].toLowerCase()} ${m[2]} ${m[3]}` : null;
  }
  if (citation.sourceId === "govinfo") {
    const packageId = citation.identifier.split("/")[0] ?? "";
    const m = BILLS_PACKAGE.exec(packageId);
    return m ? `${m[2].toLowerCase()} ${m[3]} ${m[1]}` : null;
  }
  return null;
}

/** The Federal Register document number a result's own matchKey states; null when it states none. */
function frDocumentNumberOf(citation: DemoCitation): string | null {
  return citation.matchKey?.startsWith("fr:")
    ? citation.matchKey.slice(3)
    : null;
}

function statesIdentifier(
  citation: DemoCitation,
  identifier: IssueIdentifier,
): boolean {
  switch (identifier.kind) {
    case "cfr":
      return (citation.cfrRefs ?? []).some(
        (ref) => cfrQuery(ref) === identifier.id,
      );
    case "docket":
      return (citation.docketIds ?? []).includes(identifier.id);
    case "rin":
      return (citation.rins ?? []).includes(identifier.id);
    case "fr_document":
      return frDocumentNumberOf(citation) === identifier.id;
    case "bill":
      return billIdentifierOf(citation) === identifier.id;
    default:
      return false;
  }
}

/**
 * Entries whose identifiers a result's own source fields state, never its
 * title, summary or topics (D-164).
 */
export function issuesInResults(
  table: IssueFile,
  citations: readonly DemoCitation[],
): readonly EntryMatch[] {
  return matchEntries(
    table,
    (identifier) =>
      citations.filter((citation) => statesIdentifier(citation, identifier))
        .length,
  );
}

/** A listed row as the page holds it: a document, its other listings, why it was shown. */
export interface ListedRow {
  readonly citation: DemoCitation;
  readonly alternates: readonly DemoCitation[];
  readonly reasons: readonly { readonly name?: true }[];
}

/**
 * Entries that share an identifier with listed rows, counted per row (a
 * document two sources list is one result), leaving out the entry `except`.
 * Safeguard 1: a row that only a name search listed is not counted, and
 * `named` says a counted row was also listed by a name search.
 */
export function issuesSharedByRows(
  table: IssueFile,
  rows: readonly ListedRow[],
  except?: string,
): { readonly hits: readonly EntryMatch[]; readonly named: boolean } {
  const counted = rows.filter((row) => !row.reasons.every((r) => r.name));
  const perRow = counted.map((row) =>
    issuesInResults(table, [row.citation, ...row.alternates]),
  );
  const hits = matchEntries(
    { ...table, entries: table.entries.filter((e) => e.label !== except) },
    (identifier) =>
      perRow.filter((matches) =>
        matches.some((m) => m.matches.some((x) => x.identifier === identifier)),
      ).length,
  );
  return {
    hits,
    named: counted.some((row) => row.reasons.some((r) => r.name)),
  };
}

// The in-text target identifier shapes written by targetOf in links.ts.
const USC_TARGET = /^\/us\/usc\/t(\d+)\/s(.+)$/;
const CFR_TARGET = /^(\d+) CFR part (.+)$/;
// An issue's own usc identifier, spelled "54 U.S.C. 306108".
const USC_IDENTIFIER = /^(\d+)\s+U\.S\.C\.\s+(.+)$/;

function rowMatchesIdentifier(
  row: ChainLink,
  identifier: IssueIdentifier,
): boolean {
  switch (identifier.kind) {
    case "usc": {
      if (row.target.sourceId !== "usc-index") return false;
      const target = USC_TARGET.exec(row.target.identifier);
      const wanted = USC_IDENTIFIER.exec(identifier.id);
      if (!target || !wanted) return false;
      return (
        target[1] === wanted[1] &&
        baseSection(target[2]) === baseSection(wanted[2])
      );
    }
    case "cfr": {
      if (row.target.sourceId !== "cfr-index") return false;
      const target = CFR_TARGET.exec(row.target.identifier);
      if (!target) return false;
      return `${target[1]} CFR ${target[2]}` === identifier.id;
    }
    case "public_law":
      return (
        row.target.sourceId === "govinfo" &&
        row.target.identifier === identifier.id
      );
    case "fr_document":
      return (
        row.target.sourceId === "federal-register" &&
        row.target.identifier === identifier.id
      );
    default:
      return false;
  }
}

/**
 * Entries whose identifiers the opened document's in-text citations state
 * (basis `citation_in_text`). A U.S.C. citation matches on title and base
 * section (et seq. keeps only its starting section, never expanded, design
 * rule 3); a CFR citation matches on its part.
 */
export function issuesInText(
  table: IssueFile,
  rows: readonly ChainRow[],
): readonly EntryMatch[] {
  const inText = rows.filter(
    (row): row is ChainLink =>
      row.kind === "link" && row.basis === "citation_in_text",
  );
  return matchEntries(table, (identifier) =>
    inText
      .filter((row) => rowMatchesIdentifier(row, identifier))
      .reduce((sum, row) => sum + (row.places ?? 1), 0),
  );
}
