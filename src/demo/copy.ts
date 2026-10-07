/**
 * Public prose for the live demo page and its PDF, in one place so the page,
 * the print view and the PDF say the same thing. Written in Patrick Freeland's
 * public voice: plain, direct, no hype, no em dashes.
 */
export const COPY = {
  title: "Policy Sentinel, live demo",
  statusLine: (version: string) =>
    `Policy Sentinel ${version} is in development. This page shows part of it working on real public policy. It is not the finished tool.`,
  introOne:
    "Policy Sentinel reads official policy text and keeps track of where each passage came from, so a reader can check the source rather than trust a summary. This demo searches real public policy, reads the official text, and points to passages that may deserve a closer look.",
  introTwo:
    "Everything here is public material from government sources, which the Tiered Sovereign Data Framework calls Tier 0 (T0). No Tribal codes and no Tribal government documents are used. Search terms go to the demo service and the selected official source. The demo does not save or cache searches. Your citations and notes stay in this browser tab. The flagged passages come from automated demo rules, not from Policy Sentinel's reviewed findings. The question to ask of every flag is the one the tool asks of itself: what would show this is wrong?",
  limitsTitle: "Limits",
  limits: (version: string) =>
    `Policy Sentinel ${version} is in development. This is not legal advice. Coverage is limited to the sources listed here, and sources may be incomplete or delayed. Automated issue identification can miss passages or misread them. Verify everything against the official source before you rely on it.`,
  limitsShort: (version: string) =>
    `Policy Sentinel ${version}, in development. Not legal advice. Verify against the official source.`,
  sourceLabel: "Source",
  searchLabel: "Search policy",
  searchHelpFederal:
    "Words, a title, or a citation. Example: Executive Order 13175.",
  searchHelpWashington:
    "A bill number, such as HB 1100 or SB 5100. Add a biennium, such as 2025-26, for an earlier session.",
  searchHelpCongress:
    "One bill reference: type, number, Congress. Example: hr 1234 119.",
  searchButton: "Search",
  searching: "Searching the official source.",
  examplesLabel: "Try one of these",
  resultsTitle: "Results",
  resultsCount: (shown: number, total: number | null) =>
    total === null
      ? `${shown} shown`
      : `${shown} shown of ${total.toLocaleString("en-US")} found`,
  noResults:
    "Nothing matched. Try fewer words, a different phrase, or another source.",
  emptyStart: "Choose a source and search. Results appear here.",
  showIssues: "Show issues",
  addCitation: "Add to my citations",
  inCitations: "In my citations",
  openOfficial: "Open the official source",
  noTextForSource:
    "The demo does not read the text of this source, so it identifies no issues here. You can still cite it.",
  readingText: "Reading the official text.",
  issuesTitle: "Issues the demo rules identified",
  issuesNote:
    "These are automated checks, labelled as demo rules. Passage flags quote the extracted text. An absence check is labelled as a rule assessment. Each check names its rule and says what it cannot show. They are not Policy Sentinel's reviewed findings.",
  noIssues: "The demo rules found nothing to flag in this text.",
  ruleLabel: "Rule",
  limitLabel: "What this cannot show",
  checkLabel: "What to check next",
  locatorLabel: "Where in the text",
  includeInPdf: "Include in PDF",
  issueNote: "Your note on this passage",
  readLabel: "Read from the official text",
  receiptLabel: "Receipt",
  receiptNote: (bytes: number) =>
    `Fingerprint of the ${bytes.toLocaleString("en-US")} bytes retrieved, so the same text can be checked again.`,
  engineLabel: "Read by",
  engineText: (parser: string, version: string, rules: string) =>
    `Policy Sentinel text extractor (${parser} ${version}) and ${rules}`,
  citationsTitle: "My citations",
  citationsEmpty:
    "Nothing cited yet. Add a policy from the results to build a short, annotated list.",
  citationNote: "Your note on this policy",
  remove: "Remove",
  exportPdf: "Export PDF",
  exportingPdf: "Building the PDF.",
  printView: "Print view",
  exportEmpty: "Add at least one policy to your citations first.",
  exportDone: "The PDF was built and saved to your downloads.",
  exportFailed:
    "The PDF could not be built. The print view still works: use Print view, then save as PDF.",
  exportUnsupported:
    "This report contains characters the PDF font cannot display. Use Print view to save it as PDF with your browser's fonts. Check the saved pages before sharing them.",
  serviceDown:
    "The demo service did not answer. Try again in a moment. If it keeps happening, the service may be down.",
  rateLimited:
    "That is a lot of requests in a short time. Wait a minute and try again.",
  keyPendingTitle: "Key pending",
  notAvailableTitle: "Not available yet",
  liveTitle: "Live",
  footerSource:
    "Policy text comes from the Federal Register and GovInfo, and from the Washington State Legislature. Each citation links to its official source.",
  footerCode:
    "Built on the Policy Sentinel text extractor. The demo service reads official government hosts only. It does not log searches. It uses temporary in-memory address counters to limit requests; hosting and source providers have their own service policies.",
  pdfTitle: "Cited policies",
  pdfIntro:
    "A short list of public policies with citations, selected passages or rule assessments, and notes written by the person who prepared this list.",
  pdfNotesLabel: "Note",
  pdfNoNote: "No note added.",
  pdfNoPassages: "No passages selected for this policy.",
  pdfTextNotRead:
    "No text receipt was saved for this citation. Text retrieval was unavailable or did not complete, so no passages are listed.",
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
