/**
 * NCAI 2026 draft resolutions: their shape and the searches built from each.
 * The drafts ship only inside the encrypted `ncai-2026.vault.json`, opened in
 * the browser with a shared password (D-105); the plaintext is kept out of the
 * repository. Titles, sponsor affiliations, recommendations, committees and
 * notes are copied verbatim from the NCAI 2026 Annual Resolutions Tracker;
 * individual sponsor names are left out. Committee labels describe the
 * resolution only and are never applied to search results.
 *
 * The searches are hand-picked from instruments, programs and places named in
 * each title. `names` are search forms of the listed sponsor, used only in a
 * text search for documents that contain the name.
 *
 * No runtime imports, so scripts/ncai-vault.mjs can load this file directly.
 */

export const NCAI_TRACKER_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQjca-odamdI2VdMhaARZ8KEehvENUKav5RBVa2bgRMDpKiXSoFba1x-ZmwJOTgC3uIuQ7t0LdmdlVu/pubhtml?gid=1062135734&single=true";
export const NILL_TRIBAL_LAW_URL = "https://narf.org/nill/triballaw/index.html";
/** The day the drafts were read from the tracker. */
export const NCAI_RETRIEVED = "2026-10-19";
/** Congress.gov reference lookups need the Congress number. */
const CONGRESS = 119;

export interface NcaiDraft {
  readonly id: string;
  readonly title: string;
  /** "Sponsor Affiliation" on the tracker. */
  readonly sponsor: string;
  /** "Resolutions Committee Recommendation" on the tracker. */
  readonly status: string;
  readonly committee?: string;
  readonly subcommittee?: string;
  readonly note?: string;
  /** Topic searches on the checked federal sources. */
  readonly topics?: readonly string[];
  /** Bills named in the title, as Congress.gov references ("hr 8092"). */
  readonly bills?: readonly string[];
  /** Words for court searches; the first topic stands in when absent. */
  readonly cases?: readonly string[];
  readonly names?: readonly string[];
}

export type NcaiSearchGroup = "policy" | "bill" | "case" | "sponsor";

export interface NcaiSearch {
  readonly group: NcaiSearchGroup;
  /** "federal" runs on the checked federal sources; the others on one source. */
  readonly source: "federal" | "congress" | "govinfo";
  readonly query: string;
}

/**
 * GovInfo court collections, searched with GovInfo's own field syntax:
 * USCOURTS holds selected federal court opinions from about 2004, including
 * opinions in cases still open; USREPORTS holds Supreme Court opinions in the
 * United States Reports through volume 586 (2018).
 */
export const COURT_COLLECTIONS = ["USCOURTS", "USREPORTS"] as const;

export function caseWords(draft: NcaiDraft): readonly string[] {
  return draft.cases ?? draft.topics?.slice(0, 1) ?? [];
}

/** Every search offered for one draft, in the order the panel shows them. */
export function ncaiSearches(draft: NcaiDraft): readonly NcaiSearch[] {
  const topic = draft.topics?.[0] ?? "";
  return [
    ...(draft.topics ?? []).map((query) => ({
      group: "policy" as const,
      source: "federal" as const,
      query,
    })),
    ...(draft.bills ?? []).map((bill) => ({
      group: "bill" as const,
      source: "congress" as const,
      query: `${bill} ${CONGRESS}`,
    })),
    ...caseWords(draft).flatMap((words) =>
      COURT_COLLECTIONS.map((collection) => ({
        group: "case" as const,
        source: "govinfo" as const,
        query: `collection:${collection} AND ${words}`,
      })),
    ),
    ...(draft.names ?? []).map((name) => ({
      group: "sponsor" as const,
      source: "federal" as const,
      query: `"${name}" ${topic}`.trim(),
    })),
  ];
}

export interface CourtLink {
  readonly kind: "opinions" | "dockets";
  readonly words: string;
  readonly url: string;
}

/**
 * Outbound CourtListener searches, opened by the reader: opinions from all
 * courts and years, and the RECAP docket archive, which includes pending cases.
 * Policy Sentinel makes no request to CourtListener itself.
 */
export function courtLinks(draft: NcaiDraft): readonly CourtLink[] {
  return caseWords(draft).flatMap((words) =>
    (["opinions", "dockets"] as const).map((kind) => ({
      kind,
      words,
      url: `https://www.courtlistener.com/?${new URLSearchParams({
        q: words,
        type: kind === "opinions" ? "o" : "r",
      })}`,
    })),
  );
}

/** The tracker's committee, or the tracker's lack of one, for grouping the menu. */
export const NO_COMMITTEE = "No committee listed";

export interface NcaiArea {
  readonly committee: string;
  /** The subcommittee, or the committee itself when it lists none. */
  readonly label: string;
  readonly drafts: readonly NcaiDraft[];
}

/** Drafts by committee and subcommittee, in tracker order within each. */
export function ncaiAreas(drafts: readonly NcaiDraft[]): readonly NcaiArea[] {
  const areas = new Map<string, NcaiArea & { drafts: NcaiDraft[] }>();
  for (const draft of drafts) {
    const committee = draft.committee ?? NO_COMMITTEE;
    const label = draft.subcommittee ?? committee;
    const key = `${committee}\u0000${label}`;
    const area = areas.get(key) ?? { committee, label, drafts: [] };
    area.drafts.push(draft);
    areas.set(key, area);
  }
  return [...areas.values()].sort(
    (a, b) =>
      Number(a.committee === NO_COMMITTEE) -
        Number(b.committee === NO_COMMITTEE) ||
      a.committee.localeCompare(b.committee) ||
      a.label.localeCompare(b.label),
  );
}

/** One area's policy and bill searches without repeats, for the search pane. */
export function areaSearches(area: NcaiArea): readonly NcaiSearch[] {
  const seen = new Set<string>();
  return area.drafts
    .flatMap(ncaiSearches)
    .filter((search) => search.group === "policy" || search.group === "bill")
    .filter((search) => !seen.has(search.query) && seen.add(search.query));
}
