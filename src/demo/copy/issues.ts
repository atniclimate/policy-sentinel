/** Issues pane. */
export const issues = {
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
} as const;
