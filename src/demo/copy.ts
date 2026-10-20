/**
 * Public prose for the live demo page and its PDF, in one place so the page,
 * the print view and the PDF say the same thing. House voice: plain, direct,
 * no hype, institutional third person (no "we", "I" or "you"; instructions
 * are imperatives), Oxford comma, no em dashes, Title Case headings and
 * sentence case for everything else. The list is called My Citations by name.
 */
export const COPY = {
  // Frame: header, pane chips, footer strip and the About and Limits dialog.
  appName: "Policy Sentinel",
  appMode: "live demo",
  /** Alternative text of the seal in the header and on the document cover. */
  sealAlt: "Affiliated Tribes of Northwest Indians",
  skipLink: "Skip to the search",
  aboutButton: "About and Limits",
  aboutClose: "Close",
  themeLight: "Light theme",
  themeDark: "Dark theme",
  panesLabel: "Panes",
  paneLabels: {
    search: "Search",
    results: "Results",
    issues: "Issues",
    report: "Report",
  },
  /** Spoken name of a pane chip; the count is results listed or policies cited. */
  paneChip: (label: string, count: number | null) =>
    count === null ? `${label} pane` : `${label} pane, ${count}`,
  /** One line at 1366 px beside the framework line: keep each item short. */
  footerItems: [
    "Working demo, in development",
    "Sources incomplete",
    "Not legal advice; follow each citation to its official source",
    "No tracking and no saved searches",
  ],
  tsdfLink: "Tiered Sovereign Data Framework 0.9.8",
  aboutWhatTitle: "What This Demo Is",
  aboutSourcesTitle: "Sources",
  aboutSourcesNote:
    "The demo reads the official text of Federal Register documents, from GovInfo, and the original text of Washington State bills, from the Legislature. For the other sources it returns metadata and an official link, and does not read the text. Each citation links to its official source.",
  mergeRule:
    "When the same Federal Register document is listed more than once, by one source or by several, one row is shown. It is the Federal Register record when that source lists the document, because the demo can read and check its official text. Otherwise it is the GovInfo record, then the Regulations.gov record. The other listings stay linked.",
  aboutPrivacyTitle: "What Leaves the Browser",
  aboutPrivacy: [
    "This page has no tracking, analytics, or cookies.",
    "Search terms go to the demo service and to the official sources selected. Showing issues for a policy, or adding it to My Citations, sends that policy's public identifier to the demo service, which reads the text from the official source and may keep what it read, by identifier, for up to a day. The demo service does not log or save searches. To limit requests, the service and its hosting provider count requests by network address for a short time. Hosting and source providers have their own policies.",
    "Citations, notes, and data actor entries stay in this browser tab unless the person using it exports or prints them.",
  ],
  aboutTsdfTitle: "Tiered Sovereign Data Framework",
  aboutVersionTitle: "Version and Repository",
  aboutBuilt:
    "The demo runs the Policy Sentinel text extractor. The demo service reads only from the official government sites on its list.",
  repoLink: "github.com/atniclimate/policy-sentinel",
  statusLine: (version: string) =>
    `Policy Sentinel ${version} is in development. This page is a working demo: it shows part of the tool running on real public policy. It is not the finished tool.`,
  introOne:
    "Policy Sentinel is a sovereignty-centered policy monitoring tool. It reads official policy text and keeps track of where each passage came from, so a reader can check the source rather than trust a summary. It does not decide what a policy means for any Nation. This demo searches real public policy and, where it reads the official text, flags passages that may deserve a closer look.",
  flagQuestion:
    "The question to ask of every flag is the one Policy Sentinel is built around: what would show this is wrong?",
  limitsTitle: "Limits",
  limits: (version: string) =>
    `Policy Sentinel ${version} is in development. This is not legal advice. Coverage is limited to the sources this demo searches; those sources are incomplete and may be delayed. The demo rules are automated and can miss passages or misread them. Verify everything against the official source before relying on it.`,
  limitsShort: (version: string) =>
    `Policy Sentinel ${version}, in development. Not legal advice. Verify against the official source.`,
  // Search pane: scope, sources, terms and examples.
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
  /** What the demo does with each federal source, shown under its name. One line in the search rail: keep each short. */
  capability: {
    "federal-register": "Topic search, official text, and passage checks",
    govinfo:
      "Topic search, metadata, and official links; current results, with historical versions excluded",
    regulations: "Topic search, metadata, and official links",
    congress: "Looks up one bill by reference",
  } as Readonly<Record<string, string>>,
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
        "Lists documents that contain the name as typed. Matches are unreviewed and do not show that a policy applies to, or concerns, that Tribe or organization.",
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
      "The password opens an encrypted copy of the list in this tab. The password and the list are not stored or sent. Choosing a draft runs its first suggested search, which goes to the official sources like any other search. A shared password is a light barrier, not strong security.",
    loadedFor: "Suggested search for NCAI draft",
    loadedWhy:
      "Choosing a draft runs its first suggested search, chosen by hand by Policy Sentinel, not by NCAI. A result is a text match: it does not show that a policy governs this resolution's issue or concerns its sponsor. More searches for the draft are in the Search pane.",
    autoNone:
      "This draft has no suggested search. Its panel in the Search pane links to other research sources.",
    autoOff:
      "This draft's suggested search was not run: its source is not available or not checked. Check a federal source, then use the draft's searches in the Search pane.",
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
  } as Readonly<Record<string, string>>,
  continueOfficial: "Continue on the official site.",
  loadMore: (source: string) => "Load more " + source,
  loadingMore: (source: string) => "Loading more from " + source + ".",
  pageLoaded: (source: string, added: number) =>
    source + ": " + added + " additional listings loaded.",
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

  // Results pane.
  resultsTitle: "Results",
  resultsCount: (shown: number, total: number | null) =>
    total === null
      ? `${shown} listings loaded`
      : `${shown} listings loaded; ${total.toLocaleString("en-US")} reported by source`,
  resultsListed: (rows: number) =>
    `${rows} ${rows === 1 ? "policy" : "policies"} listed.`,
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

  // Issues pane.
  noTextForSource:
    "The demo does not read the text of this source, so it identifies no issues here. The policy can still be cited.",
  readingText: "Reading the official text.",
  issuesTitle: "Issues the Demo Rules Identified",
  issuesNote:
    "Flags come from automated demo rules. They are not Policy Sentinel's reviewed findings. A passage flag quotes the extracted text; an absence check is labeled a rule assessment. Each flag names its rule and says what it cannot show.",
  issuesReady: (title: string, flags: number) =>
    `Issues ready for ${title}. ${flags} ${flags === 1 ? "flag" : "flags"}.`,
  savedTextNote: (retrievedAt: string) =>
    `Showing the text saved with this citation, retrieved ${retrievedAt}. Remove the citation and add it again to read a new version; removing also clears its notes and selections.`,
  noIssues: "The demo rules found nothing to flag in this text.",
  includeAll: "Include all in PDF",
  addFirst: "Add the policy to My Citations first.",
  assessmentLead: "Rule assessment:",
  whyFlagged: "Why this was flagged",
  ruleLabel: "Rule",
  limitLabel: "What this cannot show",
  checkLabel: "What to check next",
  locatorLabel: "Where in the text",
  includeInPdf: "Include in PDF",
  issueNote: "Note on this passage",
  readLabel: "Text read from",
  receiptLabel: "Receipt",
  receiptNote: (bytes: number) =>
    `Fingerprint of the ${bytes.toLocaleString("en-US")} bytes retrieved, so the same text can be checked again.`,
  retrieved: (retrievedAt: string) => `Retrieved ${retrievedAt}.`,
  engineLabel: "Read by",
  engineText: (parser: string, version: string, rules: string) =>
    `Policy Sentinel text extractor (${parser} ${version}) and ${rules}`,
  configLabel: "Parser configuration SHA-256:",

  // Report pane: citations, data actors and export.
  reportTitle: "Report",
  citationsTitle: "My Citations",
  citationsEmpty:
    "Nothing cited yet. Add a policy from the results to build a short, annotated list.",
  citationLimit: (limit: number) =>
    `My Citations holds up to ${limit} citations. Remove one to add another; export the list first to keep a copy.`,
  citationAdded: (title: string, reading: boolean) =>
    `Added ${title}.${reading ? " Reading the official text." : ""}`,
  citationSaved: (title: string) => `Citation and text saved for ${title}.`,
  citationTextFailed: (title: string) =>
    `Citation added for ${title}, but its text could not be read. Use Show issues to retry.`,
  citationRemoved: (title: string) =>
    `Removed ${title}, its selected passages, and its notes.`,
  /** Label of the count of passages a citation carries into the document. */
  passagesSelected: "Passages selected",
  readingForCitation: "Reading the official text for this citation.",
  textNotReadYet:
    "The text has not been read. Export PDF and Print view include this citation without passages.",
  citationNote: "Note on this policy",
  remove: "Remove",
  storageUnavailable:
    "Browser storage is unavailable. The citation list works in this tab but will not be restored after a reload. Export it before reloading or closing the tab.",
  storageSaveFailed:
    "The citation list could not be saved in browser storage. Keep this page open or export the list; Export PDF and Print view use the list as it stands.",
  /** Restore notices raised by src/demo/report-state.ts when saved state is damaged. */
  restorePartial:
    "Part of the saved citation list could not be restored. Valid citations and notes were kept; check the list and the data actor entries before exporting.",
  restoreFailed:
    "The saved citation list could not be restored. This tab starts with an empty list and blank data actor entries.",
  actorsTitle: "Data Actors",
  actorsIntro:
    "Who prepared this list, who it is shared with, and why. All five entries are required before Export PDF or Print view. They stay in this browser tab and leave it only inside the PDF or the printed pages. The demo does not verify them. The document also prints the name as the responsible person for this use of the tool.",
  actorsCount: (entered: number, total: number) => `${entered} of ${total}`,
  actorEntered: "Entered",
  actorRequired: "Required",
  /** `missing` is the list of entry labels still blank, already joined. */
  actorsMissing: (missing: string) =>
    `Export PDF and Print view need every data actor entry. Still missing: ${missing}.`,
  exportTitle: "Export",
  exportPdf: "Export PDF",
  exportingPdf: "Building the PDF.",
  printView: "Print view",
  printPreparing: "Preparing the print view.",
  exportEmpty: "Add at least one policy to My Citations first.",
  exportDone: "The PDF was built and sent to the browser's downloads.",
  exportFailed:
    "The PDF could not be built. The print view still works: use Print view, then save as PDF.",
  /** `character` names the first refused character, such as "x (U+0078)"; empty when unknown. */
  exportUnsupported: (character: string) =>
    `The PDF fonts cannot display ${character ? `the character ${character}` : "a character"} in this list. Letters used in some Indigenous-language names are among those affected. Use Print view to save the list as a PDF with the browser's fonts, and check the saved pages before sharing them.`,
  aboutPdfTagging: "The exported PDF is not tagged for screen readers.",
  serviceDown:
    "The demo service did not answer. Try again in a moment. If it keeps happening, the service may be down.",
  rateLimited:
    "That is a lot of requests in a short time. Wait a minute and try again.",
  keyPendingTitle: "Key pending",
  notAvailableTitle: "Not available",
  liveTitle: "Live",
  notCheckedTitle: "Not checked",
  notCheckedNote: "Availability has not been checked.",
  pdfIntro:
    "A short list of public policies with citations, selected passages or rule assessments, and notes written by the person who prepared this list.",
  pdfNotesLabel: "Note",
  pdfNoNote: "No note added.",
  pdfNoPassages: "No passages selected for this policy.",
  pdfTextNotRead:
    "The text was not read: the demo does not read this source's text, or the read did not finish. No passages are listed.",

  // Document model (src/demo/document.ts): wording shared by the PDF and the
  // print view, the data actor entries and the duplicate-listing label.
  // Headings are Title Case, labels and body are sentence case.
  /** Printed for a missing data actor entry or an unread text receipt. A fixed literal: do not reword. */
  notRecorded: "Not recorded",
  actorLabels: {
    name: "Name",
    role: "Role",
    organization: "Organization or Nation",
    sharingWith: "Sharing with",
    purpose: "Purpose",
  },
  docEyebrow: (version: string) => `Policy Sentinel ${version}, working demo`,
  docTitle: "Cited Policies",
  docContentsTitle: "Policies in This List",
  /** A document sentence, not the page's instruction to add a policy. */
  docEmpty: "No policies are cited in this list.",
  docProvenanceTitle: "Provenance",
  docActorsTitle: "Data Actors and Sharing",
  /** Printed on the cover and again over the data actor section, so it names no position on the page. */
  docActorsIntro:
    "The data actor entries in this document were typed by the person who prepared this list. The demo does not verify them.",
  docSoftwareTitle: "Software",
  docTool: (version: string) =>
    `Policy Sentinel demo ${version}, in development`,
  docReferencesTitle: "References",
  docSovereigntyTitle: "Data Provenance and Sovereignty Notes",
  docSovereignty: [
    "The material this demo searches and cites is public policy published by government sources. The Tiered Sovereign Data Framework (TSDF) 0.9.8, a pre-release standard published by the Affiliated Tribes of Northwest Indians, treats documented public federal and state sources as Tier 0 (T0), subject to each source's conditions. Tier 0 is the framework's open tier: material formally released for public access by an authorized source. The demo has no Tribal code source and no Tribal government source. It searches federal and state government sources only. A federal source can itself publish a Tribal government document, such as an ordinance printed in a Federal Register notice, and the demo does not detect or exclude one.",
    "Notes and data actor entries were written by the person who prepared this list. The demo does not classify them or say who they belong to, and it claims no certification under the framework and no conformance with it.",
    "Results are keyword matches and general-jurisdiction records. They establish no relationship to any Nation.",
    "Verify every citation at its official source.",
  ],
  /** A source that gives no date is stated as a gap, never left out. */
  docDateNotStated: "Not stated",
  docAssessment: (assessment: string) => `Rule assessment: ${assessment}`,
  docPassageNote: (note: string) => `Note: ${note}`,
  docFingerprint: (sha256: string, bytes: number) =>
    `SHA-256 ${sha256} (${bytes.toLocaleString("en-US")} bytes)`,
  docLabels: {
    preparedBy: "Prepared by",
    generated: "Generated",
    identifier: "Identifier",
    source: "Source",
    issuingBody: "Issuing body",
    type: "Type",
    date: "Date",
    officialUrl: "Official URL",
    where: "Where",
    limit: "Limit",
    rule: "Rule",
    check: "Check",
    reference: "Reference",
    metadataRetrieved: "Metadata retrieved",
    textReadFrom: "Text read from",
    textRetrieved: "Text retrieved",
    fingerprint: "Fingerprint",
    extractor: "Extractor",
    parserConfig: "Parser configuration SHA-256",
    demoRules: "Demo rules",
    alsoListedBy: "Also listed by",
    tool: "Tool",
    responsible: "Responsible person for this use",
    sourcesRead: "Sources cited",
  },
} as const;

export const EXAMPLES: readonly {
  readonly source: string;
  readonly query: string;
  readonly label: string;
}[] = [
  {
    source: "federal-register",
    query: "Executive Order 13175",
    label: "Executive Order 13175",
  },
  {
    source: "federal-register",
    query: "government-to-government consultation",
    label: "Government-to-government consultation",
  },
  {
    source: "federal-register",
    query: "water quality standards",
    label: "Water quality standards",
  },
  {
    source: "federal-register",
    query: "wildfire hazardous fuels",
    label: "Wildfire and hazardous fuels",
  },
  { source: "washington", query: "HB 1100", label: "Washington HB 1100" },
  { source: "washington", query: "SB 5100", label: "Washington SB 5100" },
];
