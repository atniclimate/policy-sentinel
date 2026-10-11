import type { DemoCitation } from "./types";

export const SOURCE_LABELS: Readonly<Record<string, string>> = {
  "federal-register": "Federal Register",
  govinfo: "GovInfo",
  congress: "Congress.gov",
  regulations: "Regulations.gov",
  washington: "Washington State Legislature",
  oregon: "Oregon Legislature",
  idaho: "Idaho Legislature",
};

const MONTHS = [
  "Jan.",
  "Feb.",
  "Mar.",
  "Apr.",
  "May",
  "Jun.",
  "Jul.",
  "Aug.",
  "Sep.",
  "Oct.",
  "Nov.",
  "Dec.",
];

/** "2026-03-23" becomes "Mar. 23, 2026". Also takes an ISO timestamp and reads its date as written. */
export function ieeeDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

/** An IEEE-style reference from the fields the citation carries. Source wording is not rewritten; gaps are stated. */
export function ieeeReference(citation: DemoCitation): string {
  const body =
    citation.issuingBody === "Not stated" ? "" : `${citation.issuingBody}, `;
  const date = citation.date ? ieeeDate(citation.date) : "date not stated";
  return `${body}"${citation.title}," ${citation.identifier}, ${citation.kind}, ${date}. [Online]. Available: ${citation.officialUrl} (accessed ${ieeeDate(citation.retrievedAt)}).`;
}

/**
 * The framework and the tool, cited after the policies in every document.
 * The tool is cited to ATNI Climate, published by the Affiliated Tribes of
 * Northwest Indians, by the owner's ruling of 2026-10-10.
 */
export function atniReferences(version: string): readonly string[] {
  return [
    'P. A. Freeland, "Tiered Sovereign Data Framework: Indigenous Data Sovereignty Standard," ver. 0.9.8 (pre-release), Affiliated Tribes of Northwest Indians, 2025. [Online]. Available: https://atniclimate.github.io/TieredSovereignDataFramework/',
    `ATNI Climate, "Policy Sentinel," ver. ${version} (in development), Affiliated Tribes of Northwest Indians, 2026. [Online]. Available: https://github.com/atniclimate/policy-sentinel`,
  ];
}
