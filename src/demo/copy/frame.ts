/** Frame: header, pane chips, footer strip and the About and Limits dialog. */
export const frame = {
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
    "No tracking; follows stay in this browser",
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
    "Search terms go to the demo service and to the official sources selected. Choosing an NCAI draft also sends its suggested legislation and court searches to GovInfo, and a bill named in its title to Congress.gov, whether or not those sources are selected. Showing issues for a policy, or adding it to My Citations, sends that policy's public identifier to the demo service, which reads the text from the official source and may keep what it read, by identifier, for up to a day. The demo service does not log or save searches. To limit requests, the service and its hosting provider count requests by network address for a short time. Hosting and source providers have their own policies.",
    "Citations, notes, and data actor entries stay in this browser tab unless the person using it exports or prints them.",
    "A followed list is kept in this browser between visits, until each item is removed. It leaves the browser only in a file the person exports, and as the identifier lookups that Check for new sends, when pressed, to the demo service and the official source.",
  ],
  aboutTsdfTitle: "Tiered Sovereign Data Framework",
  aboutVersionTitle: "Version and Repository",
  aboutBuilt:
    "The demo runs the Policy Sentinel text extractor. The demo service reads only from the official government sites on its list.",
  repoLink: "github.com/atniclimate/policy-sentinel",
  /** 0.10.0 and 0.10.1 were earlier demo builds, under the TERRA phase scheme adopted for 0.9.1 (D-120). */
  statusLine: (version: string) =>
    `Policy Sentinel ${version} is in development. This page is a working demo: it shows part of the tool running on real public policy. It is not the finished tool. 0.10.0 and 0.10.1 were earlier demo builds.`,
  introOne:
    "Policy Sentinel is a sovereignty-centered policy monitoring tool. It reads official policy text and keeps track of where each passage came from, so a reader can check the source rather than trust a summary. It does not decide what a policy means for any Nation. This demo searches real public policy and, where it reads the official text, flags passages that may deserve a closer look.",
  flagQuestion:
    "The question to ask of every flag is the one Policy Sentinel is built around: what would show this is wrong?",
  limitsTitle: "Limits",
  limits: (version: string) =>
    `Policy Sentinel ${version} is in development. This is not legal advice. Coverage is limited to the sources this demo searches; those sources are incomplete and may be delayed. The demo rules are automated and can miss passages or misread them. Verify everything against the official source before relying on it.`,
  limitsShort: (version: string) =>
    `Policy Sentinel ${version}, in development. Not legal advice. Verify against the official source.`,
} as const;
