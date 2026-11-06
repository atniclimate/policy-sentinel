/** Source capability strings: what the demo does with each federal source. */

/** What the demo does with each federal source, shown under its name. One line in the search rail: keep each short. */
export const capability = {
  "federal-register": "Topic search, official text, and passage checks",
  govinfo:
    "Topic search, metadata, and official links; current results, with historical versions excluded",
  regulations: "Topic search, metadata, and official links",
  congress: "Looks up one bill by reference",
} as Readonly<Record<string, string>>;

/**
 * The Sources panel (src/demo/source-model.ts, safeguard 8). Nothing is called
 * live: a source is enabled, and verified only on a recorded release check.
 */
export const sourceModel = {
  title: "Sources",
  intro:
    "Each source this page names, with what it covers and how current it is. A source is called verified only when its release check is recorded.",
  enabledVerified: (date: string) => `Enabled, verified at release ${date}`,
  enabledUnverified: "Enabled, not yet verified for this release",
  linkOutOnly: "Link out only",
  notCovered: "Not covered",
  notAvailable: "Not available",
  keyPending: "Key pending",
  notChecked: "Not checked",
  outcomeLabel: "This search",
  outcome: {
    ok: "Answered.",
    unavailable: "Unavailable. Nothing is established about this source.",
    rate_limited:
      "Rate limited. The source was not asked; nothing is established about it.",
  },
  coverageLabel: "Coverage",
  freshnessLabel: "Freshness",
  openSource: "Open the official source",
  workerFreshness:
    "Asked only when Search is pressed. Each result shows when it was retrieved.",
  index: {
    "cfr-index": "CFR part index (static file)",
    "usc-index": "U.S. Code index (static file)",
  } as Readonly<Record<string, string>>,
  indexCoverage: (files: number) =>
    `Built from ${files} ${files === 1 ? "file" : "files"} of the official source. Titles and parts outside ${files === 1 ? "it" : "them"} are not covered.`,
  indexMissing:
    "The index file is not available, so no index entry is shown. Use the official source.",
  indexFreshness: (retrieved: string, asOf: string) =>
    `Retrieved ${retrieved}. The source states: ${asOf}.`,
  indexAsOfNotStated: "no as-of date stated",
  indexStale:
    "Stale: the last refresh failed, so this is the earlier file with its original as-of date.",
  indexOld: "Snapshot older than six months; check the source.",
  linkOut: {
    ecfr: {
      label: "eCFR",
      limit:
        "Current reference only. The page links to it and does not search it.",
    },
    ibia: {
      label: "Interior Board of Indian Appeals decisions",
      limit: "The page links to the official search and does not search it.",
    },
    nill: {
      label: "National Indian Law Library directory",
      limit: "The page links to the directory and does not search it.",
    },
  } as Readonly<Record<string, { label: string; limit: string }>>,
  linkOutFreshness:
    "Not searched by this page. The source states its own dates.",
  notCoveredFreshness: "Not searched.",
  notCoveredList: [
    {
      id: "tribal-publications",
      label: "Tribal government and intertribal publications",
      limit:
        "This page searches no Tribal government or intertribal source yet.",
    },
    {
      id: "cases-citing-law",
      label: "Court opinions that cite a law",
      limit: "Not available from an official source.",
    },
    {
      id: "state-agency-rules",
      label: "State agency rules",
      limit: "Not searched. Only the state legislatures listed here are.",
    },
    {
      id: "local-government",
      label: "County and city records",
      limit: "Not searched.",
    },
  ] as const,
} as const;
