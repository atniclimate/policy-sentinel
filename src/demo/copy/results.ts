import { namesItsKind, ordinal } from "./shared.ts";

/** Results pane. */
export const results = {
  resultsTitle: "Results",
  resultsCount: (shown: number, total: number | null) =>
    `${shown} ${shown === 1 ? "listing" : "listings"} loaded${total === null ? "" : `; ${total.toLocaleString("en-US")} reported by source`}`,
  /** Grants.gov rows are funding opportunities, not policies, and are counted apart. */
  resultsListed: (rows: number, opportunities = 0) => {
    const policies = rows - opportunities;
    const parts = [
      policies && `${policies} ${policies === 1 ? "policy" : "policies"}`,
      opportunities &&
        `${opportunities} funding ${opportunities === 1 ? "opportunity" : "opportunities"}`,
    ].filter(Boolean);
    return `${parts.join(" and ")} listed.`;
  },
  noResults:
    "Nothing matched. Try fewer words, a different phrase, or another source.",
  emptyStart: "Choose a source and search. Results appear here.",
  /** Row status for a source the demo service could not reach; the reason follows by name. */
  sourceFailed: "Unavailable",
  sourceFailure: (label: string, reason: string) =>
    `${label} could not be searched. ${reason}`,
  /** Row status for a source that answered with a reason and no results; the reason follows by name. */
  sourceNothing: "No matches",
  sourceAnswer: (label: string, reason: string) => `${label}: ${reason}`,
  allFailed:
    "The selected sources were unavailable. No empty result is established.",
  skipped: "Not searched",
  congressSkipped:
    "Congress.gov was skipped. It takes one bill reference, such as hr 1234 119.",
  laneSourceOff: "Not searched: the source is not available.",
  /** A draft's federal search when no federal source is both checked and live. */
  laneNoneChecked:
    "Not searched: no federal source is checked and live. Check a live federal source in the Search pane, then choose the draft again.",
  /** A draft's panel search that already ran: it is not sent again. */
  alreadyInResults: (names: string) => "Already in Results: " + names + ".",
  stillSearching: (names: string) =>
    "Still searching: " + names + ". Its outcome appears in Results.",
  laneBudget: (limit: number) =>
    `Not searched yet: choosing a draft sends at most ${limit} searches at once, to stay within the demo service's request limit. Use Search this too to send this one.`,
  searchThisToo: "Search this too",
  /** Said for searches added to the open results, so the status names them alone. */
  laneSearching: (names: string) => "Searching " + names + ".",
  /** A source, then the collection searched within it, if any. */
  laneWhere: (source: string, collection?: string) =>
    collection ? `${source}, ${collection}` : source,
  laneTerms: (terms: string) => `Search: ${terms}`,
  laneNameTerms: (terms: string) =>
    `Name search: ${terms}. A name match does not show that a document concerns that Tribe or organization.`,
  /** Results sections for an NCAI draft's searches, in reading order. */
  groupTitles: {
    policy: "Policies and Rules",
    legislation: "Legislation",
    bill: "Bills Named in the Title",
    case: "Court Opinions",
    related: "Related by Identifier",
  },
  /** Find related: exact identifiers a record's own source stated, looked up in that source only. */
  findRelated: "Find related",
  related: {
    loadedFor: "Related by identifier to",
    caveat:
      "Each search looks up one identifier exactly as the record's source states it, in that source only. A shared docket, RIN, or CFR part does not show that one document amends, governs, or applies to another.",
    searching: "Looking up each identifier in the source that stated it.",
    noResults:
      "None of the identifier searches listed a document on the sources named below.",
    /** The seed row: its own identifiers list it, which shows no relationship. */
    startingRecord:
      "This is the starting record, listed again under its own identifiers.",
  },
  /** Row labels for identifiers shown verbatim, and the same kinds mid-sentence. */
  identifierLabels: { docket: "Docket", rin: "RIN", cfr: "CFR part" },
  identifierKinds: { docket: "docket", rin: "RIN", cfr: "CFR part" },
  /** One identifier line: the source's text alone when it already names its kind, so "Docket No." is never labeled "Docket". */
  identifierLine: (label: string, id: string) =>
    namesItsKind(label, id) ? id : `${label}: ${id}`,
  /** The closing date as the source states it; not a deadline the demo computes or applies. */
  commentsClose: (date: string, source: string) =>
    `Comments close ${date}, as stated by ${source}.`,
  /** A closing time the source states but the demo leaves out; never shown as no comment period. */
  commentsCloseWithheld: (source: string) =>
    `${source} states a comment closing time that this demo does not show. See the official source.`,
  /** A source whose comment dates this demo does not read yet; never shown as no comment period. */
  commentsCloseNotRead: (source: string) =>
    `This demo does not show ${source} comment dates yet. See the official source.`,
  /** Grants.gov's stated closing date; absent when it states none, never "no deadline". */
  applicationsClose: (date: string, source: string) =>
    `Applications close ${date}, as stated by ${source}.`,
  /** A plain link to the reginfo.gov list of Unified Agenda editions holding this RIN. */
  unifiedAgenda: (rin: string) => `Unified Agenda entries for RIN ${rin}`,
  sourceTopics: (source: string, topics: string) =>
    `${source} topics: ${topics}`,
  whyShownLabel: "Why shown:",
  /** An exact identifier lookup; `kind` is one of identifierKinds. */
  whyIdentifier: (kind: string, id: string, where: string) =>
    `listed under the same ${kind}, ${id}, in ${where}`,
  /** The record the identifiers came from, by its source and identifier. */
  whyRecord: (source: string, identifier: string, searches: number) =>
    `${searches === 1 ? "identifier" : "identifiers"} stated by ${source} record ${identifier}`,
  /** The search as sent, unquoted: quotation marks would claim the phrase is in the document. */
  whyMatched: (terms: string, where: string) =>
    `matched the search ${terms} in ${where}`,
  whyName: (terms: string, where: string) =>
    `name search for ${terms} in ${where}`,
  /** Congress.gov takes one bill reference: an exact lookup, not a text match. */
  whyLookedUp: (bill: string, congress: number, where: string) =>
    `looked up ${bill} in the ${congress}${ordinal(congress)} Congress on ${where}`,
  /** The searches were suggested for the draft, not the document. */
  whyDraft: (id: string, searches: number) =>
    `${searches === 1 ? "search" : "searches"} suggested for NCAI draft ${id}`,
  /** `reasons` is already joined; a name search adds its caution (safeguard 1). */
  whyShown: (reasons: string, named: boolean) =>
    `${reasons}.${named ? " A name match does not show that this document concerns that Tribe or organization." : ""}`,
  /** One short sentence on a phone; the reason for the record shown is in mergeRule. */
  mergeNote: (merged: number) =>
    `${merged} duplicate ${merged === 1 ? "listing was" : "listings were"} merged. Each document is one row; the other listings stay linked.`,
  dateNotStated: "Date not stated",
  /** Shown in place of the service's "Not stated" so the row does not read as a missing identifier. */
  issuingBodyNotStated: "Issuing body not stated",
  alternateLink: (source: string, title: string) =>
    `${source} listing of ${title}`,
  showIssues: "Show issues",
  showIssuesFor: (title: string) => `Show issues for ${title}`,
  showIssuesForCited: (title: string) => `Show issues for cited ${title}`,
  addCitation: "Add to my citations",
  inCitations: "In my citations",
  readingCited: "Reading the cited text",
  openOfficial: "Open the official source",
  openOfficialFor: (title: string) => `Open the official source for ${title}`,
  /** Spoken name of a row action: the action, then the policy it acts on. */
  named: (action: string, title: string) => `${action}: ${title}`,
} as const;
