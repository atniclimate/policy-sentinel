/** Search pane: scope, sources, terms and examples. */
export const search = {
  searchLabel: "Search Policy",
  checkingSources: "Checking source availability.",
  sourcesChecked: "Source availability checked.",
  sourcesFailed:
    "Source availability could not be checked, so search is off. Retry source availability to search. The citation list is not affected.",
  checkingSourcesButton: "Checking sources",
  retrySources: "Retry source availability",
  scopeLabel: "Search scope",
  scopeFederal: "Federal sources",
  scopeState: "State legislature",
  sourcesLegend: "Sources to search",
  stateLabel: "State",
  availabilityLabel: "Availability",
  queryLabel: "Search terms",
  searchHelpFederal:
    "Words, a title, or a citation. Each source interprets the terms and orders matches differently.",
  searchHelpWashington:
    "A bill number, such as HB 1100 or SB 5100, returns the bill as introduced. Add a biennium, such as 2025-26, for an earlier session.",
  searchHelpState: "A bill number.",
  searchHelpCongress:
    "One bill reference: type, number, and Congress. Example: hr 1234 119.",
  searchHelpCongressToo:
    "Congress.gov is searched only when the terms are one bill reference, such as hr 1234 119.",
  queryLength: "Enter between 2 and 200 characters to search.",
  congressQueryError:
    "Congress.gov takes one bill reference: type, number, and Congress. Example: hr 1234 119. To search by words, check another federal source.",
  noSourceChecked: "Check at least one live federal source to search.",
  /** Said when a search is asked for and nothing else on the page says why it is off. */
  searchOff: "Search is off until a source is available.",
  searchButton: "Search",
  searching: "Searching the selected official sources.",
  examplesLabel: "Example Searches",
  ncai: {
    menu: "NCAI",
    menuTitle: "NCAI 2026 Draft Resolutions in Progress",
    menuHelp: (date: string) =>
      "As listed on the NCAI 2026 Annual Resolutions Tracker, read " +
      date +
      ". NCAI updates the tracker during the convention, so this list may be out of date. Grouped by the tracker's committee and subcommittee. A draft is not an adopted NCAI resolution or NCAI policy.",
    elsewhere: "Other Resolution Sources",
    links: [
      {
        url: "https://www.ncai.org/news/2026-annual-policy-resolutions-in-progress",
        label: "NCAI 2026 resolutions in progress",
      },
      {
        url: "https://www.ncai.org/resolutions",
        label: "NCAI resolutions and adopted resolution archive",
      },
      {
        url: "https://atnitribes.org/resolution-table/",
        label: "ATNI adopted resolutions",
      },
    ],
    eyebrow: (id: string) => "NCAI 2026 draft resolution " + id,
    status: "Resolutions Committee recommendation",
    committee: "Committee",
    subcommittee: "Subcommittee",
    sponsor: "Sponsor affiliation, as listed",
    note: "Tracker note",
    tracker: "Open the NCAI 2026 Annual Resolutions Tracker",
    noText:
      "The tracker lists no public draft text. Read the draft from NCAI or the sponsor.",
    caveat:
      "These are suggested text searches that Policy Sentinel chose by hand for each draft's subject; they are not always words from the title, and NCAI did not choose them. A result is a text match: it does not show that a policy or case governs this resolution's issue. The committee label describes only the resolution.",
    groups: {
      policy: "Suggested Federal Searches",
      legislation: "Federal Legislation by Topic (GovInfo)",
      bill: "Bills Named in the Title (Congress.gov)",
      case: "Court Opinions and Litigation (Reference)",
      sponsor: "Name Search: Sponsor (with the First Topic, if Any)",
    },
    groupHelp: {
      policy: "Runs on the checked federal sources.",
      legislation:
        "Search published bill and resolution versions from 1993 onward, or federal public slip laws from 1995 onward. A bill is not an enacted law; a slip law is not the current amended code. Results remain metadata and official links.",
      bill: "Looks up the bill in the 119th Congress.",
      case: "GovInfo searches. USCOURTS holds selected federal court opinions from about 2004, including opinions in cases still open. The Ninth Circuit search uses the source's circuit field, including participating district and bankruptcy courts. USREPORTS holds Supreme Court opinions in the United States Reports, 1790 through 2018. Coverage is incomplete; neither collection supplies state or Tribal courts, hearing schedules or a later-history check. A match does not establish relevance, controlling authority, current legal status or a relationship to a Tribe.",
      sponsor:
        "Runs only when chosen here, never on choosing the draft. Lists documents that contain the name as typed. Matches are unreviewed and do not show that a policy applies to, or concerns, that Tribe or organization.",
    },
    courtLinksHelp:
      "Other courts, recent Supreme Court opinions, and pending litigation on CourtListener, a Free Law Project archive, not an official court source. Opens in a new tab; the search words go to CourtListener only when a link is opened. Its docket archive is incomplete: it holds court-feed listings and filings shared from PACER, the official federal docket system.",
    courtLink: {
      opinions: (words: string) => "Opinions from all courts: " + words,
      dockets: (words: string) => "Dockets, including pending cases: " + words,
    },
    federalCourts: "Official Federal Rulings and Schedules",
    federalCourtsHelp:
      "Open an official court site to check opinions, orders, dockets or hearing dates. Supreme Court opinion and order links cover the 2026 term. Schedules can change and do not show that a hearing occurred or a ruling was issued. These sites are not searched here; no context terms are sent automatically.",
    stateResearch: "State Policies and Cases",
    stateLabel: "State to research",
    stateChoose: "Choose a state",
    stateHelp:
      "Choose a state yourself, then copy any useful context terms into its official search. These are external research links, not results or a finding that a state policy applies to this draft or its sponsor. No state is inferred from the sponsor. Links open in a new tab without sending these terms; destination sites may log searches you submit there.",
    policyTerms: "Policy context terms to copy",
    courtTerms: "Court context terms to copy",
    bulletins: "Federal and state Indian-law case bulletins at NILL",
    bulletinsHelp:
      "NILL is a selective research library, not the issuing court. Verify a discovered case and its later history with the official court; the bulletin directory is not complete coverage.",
    gateTitle: "NCAI 2026 Draft Resolutions",
    gateIntro:
      "The draft resolutions list is for NCAI and ATNI convention participants. Enter the access password shared with participants.",
    gatePassword: "Access password",
    gateHelp:
      "The password opens an encrypted copy of the list in this tab. The password and the list are not stored or sent. Choosing a draft runs its suggested policy, legislation, and court searches. Policy searches go to the checked federal sources. Legislation and court searches go to GovInfo, and a bill named in the draft's title to Congress.gov, even when those sources are not checked. A shared password is a light barrier, not strong security.",
    loadedFor: "Suggested searches for NCAI draft",
    /** Kept in view above the first section; the rest is under aboutSearches. */
    loadedCaveat:
      "Policy Sentinel chose these searches; NCAI did not. A result is a text match, not a finding: it does not show that a policy, bill, or case governs this resolution's issue or concerns its sponsor.",
    aboutSearches: "About these searches",
    loadedWhy:
      "Choosing a draft runs its suggested policy, legislation, and court searches. Policy searches use the checked federal sources. Legislation and court searches use GovInfo, and a bill named in the draft's title uses Congress.gov, even when those sources are not checked. Name searches never run on their own. More searches for the draft are in the Search pane.",
    /** Results status for a draft's searches, which also go to sources not checked. */
    searching:
      "Running the draft's suggested searches on each source named below, including sources not checked.",
    /** Bills and court opinions are listed too, so the count is of documents. */
    listed: (rows: number) =>
      `${rows} ${rows === 1 ? "document" : "documents"} listed.`,
    partialNoResults:
      "No results loaded. At least one source asked was unavailable.",
    someFailed:
      "At least one source asked was unavailable; its reason is shown with it.",
    allFailed:
      "The sources asked were unavailable. No empty result is established.",
    /** Every search sent answered with nothing; the reader chose no words to change. */
    noResults:
      "None of the draft's suggested searches listed a document on the sources named below. More searches for the draft are in the Search pane.",
    /** As noResults, when a source left open whether it holds more (GovInfo always does). */
    continuationNoResults:
      "None of the draft's suggested searches loaded a listing yet. More results may be available; see each source’s continuation status. More searches for the draft are in the Search pane.",
    /** A draft's topic search is spread over the checked sources; Congress.gov takes a bill only. */
    congressSkipped:
      "Congress.gov looks up one bill by reference, so it is not searched for a topic.",
    autoNone:
      "This draft has no suggested search. Its panel in the Search pane links to other research sources.",
    autoOff:
      "This draft's suggested searches were not run: their sources are not available or not checked. Check a federal source, then choose the draft again or use its searches in the Search pane.",
    gateEmpty: "Enter the access password to open the list.",
    gateWrong: "That password did not open the list. Check it and try again.",
    gateBroken: "The list could not be opened. Reload the page and try again.",
    gateChecking: "Checking the password.",
    gateOpen: "Open",
    sourceOff: "Off: the source is not available or not checked.",
    tribalLaw: "Tribal law materials at the National Indian Law Library",
    close: "Close resolution",
    areaLabel: "Policy area (NCAI committee)",
    areaNone: "Choose an area",
    areaHelp:
      "Searches drawn from the NCAI 2026 draft resolutions in that committee area. The area is not applied to results.",
  },
  dateRangeTitle: "Dates (Optional)",
  dateFrom: "From date",
  dateTo: "Through date",
  dateRangeHelp:
    "Leave both blank for any date. Both endpoints are included. For a whole year, use January 1 through December 31.",
  dateRangeError:
    "Enter both dates as valid calendar dates, with the From date on or before the Through date.",
  stateDateHelp:
    "Date filters do not apply to state reference lookup. Washington uses the bill biennium and introduced version.",
  submittedQuery: "Submitted search:",
  submittedDates: (from: string, to: string) =>
    "Dates: " + from + " through " + to + ", inclusive.",
  noDateRange: "Dates: no range applied.",
  docTypeLabel: "Document type",
  docTypeAny: "Any type",
  /** Federal Register type names; Regulations.gov has the first three. */
  docTypes: {
    RULE: "Rule",
    PRORULE: "Proposed Rule",
    NOTICE: "Notice",
    PRESDOCU: "Presidential Document",
  },
  docTypeHelp:
    "Applies where the demo can send it, such as the Federal Register, including NCAI draft searches and Find related. Other sources are searched without it, and Results says so for each.",
  submittedType: (label: string) => `Document type: ${label}.`,
  noTypeFilter: "Document type: no filter applied.",
  /** A lane the demo sends no type filter to (no matching type, or not yet confirmed); never sent filtered or skipped silently. */
  typeNotApplied:
    "Type filter not applied: the demo does not send it to this source, so it is searched without it.",
  identifierLeftOut: (count: number) =>
    `${count} ${count === 1 ? "listing" : "listings"} the source returned ${count === 1 ? "does" : "do"} not state this identifier, so ${count === 1 ? "it is" : "they are"} left out.`,
  loadedOrder:
    "Loaded rows only. Initial listings follow each source's order; more results append, with exact duplicate listings merged. Provider totals may change.",
  sourceDateMeaning: {
    "federal-register": "Filtered by publication date.",
    regulations: "Filtered by posted date.",
    govinfo:
      "Filtered by publication date (publishdate). A result's displayed date is its source-issued date (dateIssued), which may differ.",
  } as Readonly<Record<string, string>>,
  stateHandoffs: {
    washington: {
      url: "https://app.leg.wa.gov/bi/Tld/",
      label: "Search topics on the Washington Legislature site",
    },
    oregon: {
      url: "https://www.oregonlegislature.gov/advancedbills",
      label: "Search bills on the Oregon Legislature site",
    },
    idaho: {
      url: "https://legislature.idaho.gov/sessioninfo/",
      label: "Browse the Idaho Legislature session gateway",
    },
  } as Readonly<Record<string, { url: string; label: string }>>,
  stateHandoffHelp:
    "Opens an external official site. Search terms and notes are not sent by this link. External results are not integrated here.",
  officialSearch: {
    "federal-register": "https://www.federalregister.gov/documents/search",
    govinfo: "https://www.govinfo.gov/",
    regulations: "https://www.regulations.gov/",
    grants: "https://www.grants.gov/search-grants",
  } as Readonly<Record<string, string>>,
  continueOfficial: "Continue on the official site.",
  loadMore: (source: string) => "Load more " + source,
  loadingMore: (source: string) => "Loading more from " + source + ".",
  pageLoaded: (source: string, added: number) =>
    `${source}: ${added} additional ${added === 1 ? "listing" : "listings"} loaded.`,
  pageFailed: (source: string) =>
    source +
    ": the next page failed. Loaded results are kept; use Load more to retry.",
  pageFailureDetail: (reason: string) =>
    "The next page could not be loaded. " + reason,
  pageCap: (limit: number) =>
    "Demo limit reached: up to " +
    limit +
    " listings per source. This is not all matching policy.",
  continuationUnknown:
    "Further pages could not be established. The loaded results are not a complete search.",
  noMoreResults: "The source reported no further page for this request.",
  sourceLoading: "Searching",
  zeroLoaded: "No listings loaded on this page",
  partialNoResults:
    "No results loaded. At least one selected source was unavailable.",
  /** Follows the count when some sources answered and others did not. */
  someFailed:
    "At least one selected source was unavailable; its reason is shown with it.",
  continuationNoResults:
    "No listings loaded yet. More results may be available; see each source’s continuation status.",
  savedMetadataNote:
    "Showing the saved metadata-only citation. Its source text was not read by this demo. Existing notes remain with this snapshot.",
  noneSearched:
    "The selected sources cannot apply these criteria. Review the source reasons.",
  congressDatesSkipped:
    "Congress.gov was not searched: its exact bill lookup cannot apply this date range.",
  govinfoDatesSkipped:
    "GovInfo was not searched with this date range: dated searches accept plain letters, numbers, and spaces only, without AND, OR, or NOT. Remove the range to use provider search syntax.",
} as const;
