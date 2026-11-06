/**
 * Grants.gov authority citations stated by the opportunity (design section 3
 * T1.4; section 1 rules 1, 2 and 7). Pure and network-free, shared by the
 * Worker read (worker/src/sources/grants-detail.ts) and the page.
 *
 * - Assistance Listings come from structured Grants.gov fields (basis
 *   source_field): search2 `cfdaList` and fetchOpportunity `data.cfdas[]`.
 * - An authority passage exists only when the synopsis text itself has an
 *   "Authority" or "AUTHORITIES" heading (basis source_text_parsed). It is
 *   bounded and refused when the D-068 personal-pattern guard finds anything.
 * - Full U.S.C. and Pub. L. citations in the passage become forward links. A
 *   U.S.C. link targets the section in the U.S.C. index; step 6 resolves the
 *   hop to its source credit.
 *
 * Nothing here states what a citation means for any record or Nation.
 */
import { findCitations } from "./cite-patterns.ts";
import type { PlCite, UscCite } from "./cite-patterns.ts";
import {
  baseSection,
  GOVINFO_PLAW_FIRST_CONGRESS,
  uscSectionUrl,
} from "./links.ts";
import { hasPersonalPattern } from "./personal-guard.ts";
import { citationValue } from "./validation.ts";
import type { DemoCitation, LinkedRecord } from "./types.ts";

/** Longest passage quoted, in characters; a longer one ends with " [...]". */
export const PASSAGE_MAX = 1200;
const LISTINGS_MAX = 50;

/** Assistance Listing numbers: two digits, a dot, three characters ("11.431"). */
const ALN = /^\d{2}\.[0-9A-Z]{3}$/;

export interface AssistanceListing {
  readonly number: string;
  readonly title: string;
}

export interface AuthorityPassage {
  readonly text: string;
  readonly heading: string;
  readonly locator: string;
}

/** found: quoted; none: no heading in the record; withheld: heading present, passage refused by the guard. */
export type AuthorityState = "found" | "none" | "withheld";

export type AuthorityOutcome =
  | { readonly state: "found"; readonly passage: AuthorityPassage }
  | { readonly state: "none" | "withheld" };

/** The answer of the Grants.gov opportunity read: an allowlisted citation plus the passage state. */
export interface GrantsDetailResponse {
  readonly ok: true;
  readonly source: "grants";
  readonly citation: DemoCitation;
  readonly authority: AuthorityState;
}

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  sect: "§",
};

/** HTML entities as text; unknown ones stay as written. */
export function decodeEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi,
    (all, name: string) => {
      if (name[0] !== "#") return NAMED[name.toLowerCase()] ?? all;
      const hex = name[1] === "x" || name[1] === "X";
      const code = Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
      return code > 31 && code <= 0x10ffff ? String.fromCodePoint(code) : all;
    },
  );
}

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

/** Synopsis HTML as lines of plain text; block ends become line breaks. */
export function synopsisLines(html: string): string[] {
  const text = html
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6]|tr|table|ul|ol)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ");
  return decodeEntities(text).split(/\r?\n/).map(oneLine);
}

const HEADING =
  /^(Authority|AUTHORITY|Authorities|AUTHORITIES)(?:\s*:\s*(.*)|\s*)$/;

/**
 * The passage up to the end of the sentence that holds its last citation; a
 * trailing sentence with no citation (a contact line, say) is dropped and the
 * cut marked. With no citation, the first sentence only.
 */
function toLastCitation(text: string): string {
  // From the citation's last character, which may itself end the sentence ("et seq.").
  const from = Math.max(0, (findCitations(text).at(-1)?.end ?? 0) - 1);
  const end = /[.!?](?=\s+[A-Z"'“‘])/.exec(text.slice(from));
  return end ? `${text.slice(0, from + end.index + 1)} [...]` : text;
}

function bounded(text: string): string {
  if (text.length <= PASSAGE_MAX) return text;
  const cut = text.slice(0, PASSAGE_MAX - 6);
  const space = cut.lastIndexOf(" ");
  return `${space > 0 ? cut.slice(0, space) : cut} [...]`;
}

/**
 * The passage at the synopsis's own Authority heading: the rest of the heading
 * line after its colon, or the next non-empty line when the heading stands
 * alone. No heading, no passage.
 */
export function authorityPassage(synopsisHtml: unknown): AuthorityOutcome {
  if (typeof synopsisHtml !== "string") return { state: "none" };
  const lines = synopsisLines(synopsisHtml);
  for (let i = 0; i < lines.length; i += 1) {
    const m = HEADING.exec(lines[i]);
    if (!m) continue;
    const text = m[2] || (lines.slice(i + 1).find((line) => line !== "") ?? "");
    if (text === "") continue;
    if (hasPersonalPattern(text)) return { state: "withheld" };
    const heading = m[1];
    return {
      state: "found",
      passage: {
        text: bounded(toLastCitation(text)),
        heading,
        locator: `Grants.gov synopsis description, heading "${heading}"`,
      },
    };
  }
  return { state: "none" };
}

const plainTitle = (value: unknown) =>
  typeof value === "string" ? oneLine(decodeEntities(value)).slice(0, 400) : "";

/** fetchOpportunity `data.cfdas[]`: number and title as stated; malformed items dropped. */
export function assistanceListings(cfdas: unknown): AssistanceListing[] {
  if (!Array.isArray(cfdas)) return [];
  const seen = new Set<string>();
  const out: AssistanceListing[] = [];
  for (const item of cfdas.slice(0, LISTINGS_MAX)) {
    if (!item || typeof item !== "object") continue;
    const { cfdaNumber, programTitle } = item as Record<string, unknown>;
    const title = plainTitle(programTitle);
    if (typeof cfdaNumber !== "string" || !ALN.test(cfdaNumber) || !title)
      continue;
    if (seen.has(cfdaNumber)) continue;
    seen.add(cfdaNumber);
    out.push({ number: cfdaNumber, title });
  }
  return out;
}

/** search2 hit `cfdaList`: Assistance Listing numbers only; search2 states no titles. */
export function listingNumbers(cfdaList: unknown): string[] {
  if (!Array.isArray(cfdaList)) return [];
  return [
    ...new Set(
      cfdaList
        .slice(0, LISTINGS_MAX)
        .filter((n): n is string => typeof n === "string" && ALN.test(n)),
    ),
  ];
}

function target(c: UscCite | PlCite): LinkedRecord["target"] {
  if (c.kind === "usc") {
    const section = baseSection(c.section);
    return {
      sourceId: "usc-index",
      identifier: `/us/usc/t${c.title}/s${section}`,
      officialUrl: uscSectionUrl(c.title, section),
    };
  }
  // GovInfo holds public laws from the 104th Congress on; older ones get no link.
  return {
    sourceId: "govinfo",
    identifier: `PLAW-${c.congress}publ${c.number}`,
    ...(c.congress >= GOVINFO_PLAW_FIRST_CONGRESS && {
      officialUrl: `https://www.govinfo.gov/link/plaw/${c.congress}/public/${c.number}`,
    }),
  };
}

/** Label ids for these rows. The panel words them itself; they are not in LINK_LABELS. */
export const AUTHORITY_LABEL_IDS = {
  usc: "grants-authority-usc",
  pl: "grants-authority-pl",
} as const;

/** Forward links for each full U.S.C. and Pub. L. citation in the quoted passage, first wording kept. */
export function authorityLinks(citation: DemoCitation): LinkedRecord[] {
  const passage = citation.authorityPassage;
  if (!passage) return [];
  const seen = new Set<string>();
  const out: LinkedRecord[] = [];
  for (const c of findCitations(passage.text)) {
    if (c.kind !== "usc" && c.kind !== "pl") continue;
    const to = target(c);
    if (seen.has(to.identifier)) continue;
    seen.add(to.identifier);
    out.push({
      basis: "source_text_parsed",
      labelId: AUTHORITY_LABEL_IDS[c.kind],
      direction: "forward",
      target: to,
      sourceWording: c.text,
      locator: passage.locator,
      sourceName: "Grants.gov",
      asOfText: citation.versionDate
        ? `Grants.gov record version date ${citation.versionDate}`
        : "Grants.gov record, version date not stated",
      retrievedAt: citation.retrievedAt,
      family: "laws_and_bills",
    });
  }
  return out;
}

/**
 * The page-side check of a Grants.gov opportunity read. The citation goes
 * through the version 3 citation check; a passage the guard flags is dropped
 * and stated as withheld, so the page never shows it.
 */
export function grantsDetailValue(value: unknown): GrantsDetailResponse {
  const v =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  if (v.ok !== true || v.source !== "grants")
    throw new Error("Invalid Grants.gov opportunity response");
  const citation = citationValue(v.citation, 3);
  if (citation.sourceId !== "grants")
    throw new Error("Invalid Grants.gov opportunity response");
  const authority = v.authority;
  if (authority !== "found" && authority !== "none" && authority !== "withheld")
    throw new Error("Invalid authority state");
  const { authorityPassage: passage, ...rest } = citation;
  if ((authority === "found") !== Boolean(passage))
    throw new Error("Authority state and passage do not match");
  if (passage && hasPersonalPattern(passage.text))
    return {
      ok: true,
      source: "grants",
      citation: rest,
      authority: "withheld",
    };
  return { ok: true, source: "grants", citation, authority };
}
