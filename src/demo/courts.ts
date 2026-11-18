/**
 * Court cases on existing hosts (T1.5), pure. The court table, docket forms
 * with a court code, the U.S. Reports volume rule, the case-name rule and the
 * text of a case row. A case name carries no jurisdiction unless its court is
 * named, and nothing here names or relates a Nation. Link-outs are the IBIA
 * page and the NILL directory only; there is no per-Nation URL list.
 *
 * Value imports carry the .ts extension so Node scripts can load this file.
 */
import { courts as COURTS } from "./copy/courts.ts";
import { parseCitation } from "./cite-patterns.ts";
import { NILL_TRIBAL_LAW_URL } from "./ncai-2026.ts";
import { hasPersonalPattern } from "./personal-guard.ts";
import type { DemoCitation } from "./types";

/** GovInfo USCOURTS court codes this demo searches, and no others. */
export const COURT_CODES = [
  "ca9",
  "cafc",
  "cofc",
  "wawd",
  "waed",
  "ord",
  "idd",
] as const;
export type CourtCode = (typeof COURT_CODES)[number];

export const COURT_LABELS: Readonly<Record<CourtCode, string>> = {
  ca9: "U.S. Court of Appeals for the Ninth Circuit",
  cafc: "U.S. Court of Appeals for the Federal Circuit",
  cofc: "U.S. Court of Federal Claims",
  wawd: "U.S. District Court for the Western District of Washington",
  waed: "U.S. District Court for the Eastern District of Washington",
  ord: "U.S. District Court for the District of Oregon",
  idd: "U.S. District Court for the District of Idaho",
};
export const SUPREME_COURT_LABEL = "Supreme Court of the United States";

/** Appellate dockets ("99-12345", "2099-1001"); trial courts write "2:99-cv-00123". */
const APPELLATE = new Set<CourtCode>(["ca9", "cafc"]);
const APPELLATE_DOCKET = /^(?:\d{2}|\d{4})-\d{1,5}$/;
const TRIAL_DOCKET = /^(\d):(\d{2}-[a-z]{1,4}-\d{1,5})$/i;
// GovInfo writes a trial docket's colon as an underscore in its package id.
const TRIAL_PACKAGE = /^(\d)_(\d{2}-[a-z]{1,4}-\d{1,5})$/i;

export function isCourtCode(value: unknown): value is CourtCode {
  return (
    typeof value === "string" &&
    (COURT_CODES as readonly string[]).includes(value)
  );
}

/** The GovInfo package id for a docket in one court, or null for a form that court does not use. */
export function packageIdFor(court: CourtCode, docket: string): string | null {
  if (APPELLATE.has(court))
    return APPELLATE_DOCKET.test(docket) ? `USCOURTS-${court}-${docket}` : null;
  const m = TRIAL_DOCKET.exec(docket);
  return m ? `USCOURTS-${court}-${m[1]}_${m[2].toLowerCase()}` : null;
}

/** The court and docket a USCOURTS package id states; null outside the seven courts. */
export function docketFromPackageId(
  packageId: string,
): { court: CourtCode; docketNumber: string } | null {
  const m = /^USCOURTS-([a-z0-9]+)-(.+)$/.exec(packageId);
  if (!m || !isCourtCode(m[1])) return null;
  const court = m[1];
  if (APPELLATE.has(court))
    return APPELLATE_DOCKET.test(m[2]) ? { court, docketNumber: m[2] } : null;
  const t = TRIAL_PACKAGE.exec(m[2]);
  return t ? { court, docketNumber: `${t[1]}:${t[2]}` } : null;
}

/** "ca9 99-12345": a docket number with its court code. A docket alone is never guessed. */
export function courtDocketReading(
  text: string,
): { court: CourtCode; docketNumber: string; packageId: string } | null {
  const m = /^([A-Za-z0-9]{2,5})\s+(\S+)$/.exec(text.trim());
  const court = m?.[1].toLowerCase();
  if (!m || !isCourtCode(court)) return null;
  const packageId = packageIdFor(court, m[2]);
  return packageId ? { court, docketNumber: m[2], packageId } : null;
}

/** GovInfo's U.S. Reports collection ends at volume 586 (2018). */
export const US_REPORTS_LAST_VOLUME = 586;

export type UsReportsReading =
  | { kind: "lookup"; volume: number; page: number; citation: string }
  | { kind: "not_resolvable"; citation: string; message: string };

/** A full U.S. Reports citation: looked up through volume 586, otherwise answered with no call. */
export function usReportsReading(text: string): UsReportsReading | null {
  const c = parseCitation(text.trim());
  if (!c || c.kind !== "us_reports" || c.volume < 1 || c.page < 1) return null;
  const citation = `${c.volume} U.S. ${c.page}`;
  return c.volume <= US_REPORTS_LAST_VOLUME
    ? { kind: "lookup", volume: c.volume, page: c.page, citation }
    : { kind: "not_resolvable", citation, message: COURTS.notResolvable };
}

/**
 * Whether a case name is shown. Every court's name is shown as GovInfo gives
 * it, people named in it included: an opinion is a public document and its name
 * is how the public knows it (owner ruling of 2026-11-18, D-160, widening D-129
 * from the Supreme Court to every court). The D-068 personal guard still holds
 * back a name that carries a contact detail or a personal title. The name is
 * quoted and never sets jurisdiction.
 */
export function caseNameShown(title: string): boolean {
  return !hasPersonalPattern(title);
}

const WITHHELD_PREFIX = "Case name not shown";

/** The title a row carries when the personal guard holds its name back: the court code and docket, nothing personal. */
export function withheldTitle(identifier: string): string {
  return `${WITHHELD_PREFIX} (${identifier})`;
}

export interface CaseRowText {
  readonly caseName: string;
  readonly captionWithheld: boolean;
  readonly court: string;
  /** "99-12345 (ca9)", or null when the row states no docket with a court code. */
  readonly docket: string | null;
  readonly dateIssued: string;
  /** The citation sentence: stated, or "citation not provided by this source". */
  readonly citation: string;
  readonly officialUrl: string;
}

export function caseRowText(c: DemoCitation): CaseRowText {
  const usReports = /^USREPORTS-(\d+)-(\d+)$/.exec(c.identifier);
  return {
    caseName: c.title,
    captionWithheld: c.title.startsWith(WITHHELD_PREFIX),
    court: isCourtCode(c.court)
      ? COURT_LABELS[c.court]
      : usReports
        ? SUPREME_COURT_LABEL
        : c.issuingBody,
    docket:
      c.court && c.docketNumber
        ? COURTS.docketLine(c.court, c.docketNumber)
        : null,
    dateIssued: c.date ?? COURTS.dateNotStated,
    citation:
      c.caseCitationProvided === true && usReports
        ? COURTS.citationStated(`${usReports[1]} U.S. ${usReports[2]}`)
        : COURTS.citationNotProvided,
    officialUrl: c.officialUrl,
  };
}

/** Link-outs only: the demo makes no request to either service. */
export const LINK_OUTS: readonly {
  readonly id: "ibia" | "nill";
  readonly label: string;
  readonly note: string;
  readonly url: string;
}[] = [
  {
    id: "ibia",
    ...COURTS.linkOuts.ibia,
    url: "https://www.doi.gov/oha/organization/ibia/findingIBIA",
  },
  { id: "nill", ...COURTS.linkOuts.nill, url: NILL_TRIBAL_LAW_URL },
];
