/**
 * NCAI 2026 draft resolutions: their shape and the searches built from each.
 * The drafts ship only inside the encrypted `ncai-2026.vault.json`, opened in
 * the browser with a shared password (D-105); the plaintext is kept out of the
 * repository. Titles, sponsor affiliations, recommendations, committees and
 * notes are copied verbatim from the NCAI 2026 Annual Resolutions Tracker;
 * individual sponsor names are left out. Committee labels describe the
 * resolution only and are never applied to search results.
 *
 * The searches are Policy Sentinel's hand-picked terms for each draft's
 * subject, not always words from the title. `names` are search forms of the listed sponsor, used only in a
 * text search for documents that contain the name.
 *
 * No runtime imports, so scripts/ncai-vault.mjs can load this file directly.
 */

export const NCAI_TRACKER_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQjca-odamdI2VdMhaARZ8KEehvENUKav5RBVa2bgRMDpKiXSoFba1x-ZmwJOTgC3uIuQ7t0LdmdlVu/pubhtml?gid=1062135734&single=true";
export const NILL_TRIBAL_LAW_URL = "https://narf.org/nill/triballaw/index.html";
export const NILL_BULLETINS_URL = "https://www.narf.org/nill/bulletins/";

/** Reader-opened directories; no source requests or context-based jurisdiction inference. */
export const FEDERAL_COURT_LINKS = [
  {
    label: "Supreme Court opinions",
    url: "https://www.supremecourt.gov/opinions/slipopinion/26",
  },
  {
    label: "Supreme Court orders",
    url: "https://www.supremecourt.gov/orders/ordersofthecourt/26",
  },
  {
    label: "Supreme Court docket search",
    url: "https://www.supremecourt.gov/docket/docket.aspx",
  },
  {
    label: "Supreme Court argument calendars and hearing lists",
    url: "https://www.supremecourt.gov/oral_arguments/calendarsandlists.aspx",
  },
  {
    label: "Ninth Circuit: decisions, cases and hearings",
    url: "https://www.ca9.uscourts.gov/",
  },
  {
    label: "Western District of Washington hearing calendar",
    url: "https://www.wawd.uscourts.gov/calendar/today",
  },
  {
    label: "District of Columbia court calendars",
    url: "https://www.dcd.uscourts.gov/court-calendars",
  },
  {
    label: "Other federal courts: official website directory",
    url: "https://www.uscourts.gov/about-federal-courts/court-role-and-structure/court-website-links",
  },
] as const;

/** The owner's seven-state research scope, not a Nation or membership crosswalk. */
export const STATE_RESEARCH_SOURCES = [
  {
    code: "WA",
    label: "Washington",
    note: "Bill topics, current statutes and rules, and appellate opinions are separate searches. Slip opinions may change. A found bill can be opened here with the Washington bill-number and biennium lookup.",
    links: [
      {
        label: "Bills by topic",
        url: "https://app.leg.wa.gov/bi/topicalindex",
      },
      {
        label: "Legislative document search",
        url: "https://leg.wa.gov/search",
      },
      { label: "Statutes (RCW)", url: "https://apps.leg.wa.gov/rcw/" },
      {
        label: "Administrative rules (WAC)",
        url: "https://apps.leg.wa.gov/wac/",
      },
      {
        label: "Appellate opinion search",
        url: "https://www.courts.wa.gov/opinions/",
      },
      {
        label: "Supreme Court calendar",
        url: "https://www.courts.wa.gov/appellate_trial_courts/supreme/calendar/",
      },
    ],
  },
  {
    code: "OR",
    label: "Oregon",
    note: "Reference links only; these destinations have not been rechecked because source access terms remain unresolved. Oregon results are not integrated. Review the destination's terms before using it.",
    links: [
      {
        label: "Legislature data and research information",
        url: "https://www.oregonlegislature.gov/citizen_engagement/Pages/data.aspx",
      },
      {
        label: "Supreme Court opinions",
        url: "https://www.courts.oregon.gov/publications/sc/Pages/default.aspx",
      },
      {
        label: "Court of Appeals opinions",
        url: "https://www.courts.oregon.gov/publications/coa/Pages/default.aspx",
      },
      {
        label: "Administrative rules",
        url: "https://sos.oregon.gov/archives/administrative-rules/pages/default.aspx",
      },
    ],
  },
  {
    code: "ID",
    label: "Idaho",
    note: "The legislative destination could not be checked. The rules site reports a document-search issue. Court staff summaries are separate from opinions; follow the court's links for its calendar.",
    links: [
      {
        label: "2026 legislation (unverified destination)",
        url: "https://legislature.idaho.gov/sessioninfo/2026/legislation/",
      },
      {
        label: "Supreme Court opinion search",
        url: "https://isc.idaho.gov/cases-opinions/isc-opinions",
      },
      {
        label: "Court of Appeals opinions",
        url: "https://isc.idaho.gov/cases-opinions/ica-opinions",
      },
      {
        label: "Administrative rules and bulletins",
        url: "https://adminrules.idaho.gov/",
      },
      {
        label: "Court directory and calendar navigation",
        url: "https://isc.idaho.gov/sitemap",
      },
    ],
  },
  {
    code: "AK",
    label: "Alaska",
    note: "The court calendar was checked; several legislative and case-law destinations could not be loaded. The law library also links to a separately operated search service. Use these as research starting points.",
    links: [
      {
        label: "Bills and laws (unverified destination)",
        url: "https://www.akleg.gov/basis/Home/BillsandLaws",
      },
      {
        label: "Regulations and proposed notices",
        url: "https://ltgov.alaska.gov/information/regulations/",
      },
      {
        label: "Appellate courts and opinions",
        url: "https://courts.alaska.gov/appellate/",
      },
      {
        label: "Law library case-law resources",
        url: "https://courts.alaska.gov/library/aklegal.htm",
      },
      {
        label: "Court calendars",
        url: "https://courts.alaska.gov/trialcourts/calendars.htm",
      },
    ],
  },
  {
    code: "CA",
    label: "California",
    note: "Destination availability is unverified. Court access terms restrict automated collection; these are manual research links only. Published and unpublished opinions are separate collections.",
    links: [
      {
        label: "Bill search",
        url: "https://leginfo.legislature.ca.gov/faces/billSearchClient.xhtml",
      },
      {
        label: "California codes",
        url: "https://leginfo.legislature.ca.gov/faces/codes.xhtml",
      },
      {
        label: "Published appellate opinions",
        url: "https://courts.ca.gov/opinions/publishedcitable-opinions",
      },
      {
        label: "Supreme Court argument calendar",
        url: "https://supreme.courts.ca.gov/case-information/oral-arguments/oral-arguments-calendar",
      },
    ],
  },
  {
    code: "MT",
    label: "Montana",
    note: "Bill Explorer requires its interactive page. The code index is labeled 2025. Court orders, opinions and docket entries remain distinct; no complete case history is supplied here.",
    links: [
      { label: "Bill Explorer", url: "https://bills.legmt.gov/" },
      {
        label: "Montana Code Annotated",
        url: "https://mca.legmt.gov/bills/mca/index.html",
      },
      {
        label: "Supreme Court docket and opinion resources",
        url: "https://courts.mt.gov/clerk/",
      },
      {
        label: "Daily orders and opinions",
        url: "https://courts.mt.gov/external/orders/dailyorders",
      },
    ],
  },
  {
    code: "NV",
    label: "Nevada",
    note: "Use session-specific legislative searches; the general website search uses Google. The court site links to its separate opinion/case system. Calendar events do not establish outcomes.",
    links: [
      {
        label: "Legislative search",
        url: "https://www.leg.state.nv.us/Site/Search/search.html",
      },
      { label: "Revised Statutes", url: "https://www.leg.state.nv.us/nrs/" },
      {
        label: "Appellate opinions and case search",
        url: "https://nvcourts.gov/supreme",
      },
      { label: "Court calendar", url: "https://nvcourts.gov/calendar" },
    ],
  },
] as const;
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

export type NcaiSearchGroup =
  "policy" | "legislation" | "bill" | "case" | "sponsor";

export interface NcaiSearch {
  readonly group: NcaiSearchGroup;
  /** "federal" runs on the checked federal sources; the others on one source. */
  readonly source: "federal" | "congress" | "govinfo";
  readonly query: string;
  readonly label?: string;
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
    ...(draft.topics ?? []).flatMap((words) => [
      {
        group: "legislation" as const,
        source: "govinfo" as const,
        query: `collection:BILLS AND (${words})`,
        label: `Federal bills and resolutions: ${words}`,
      },
      {
        group: "legislation" as const,
        source: "govinfo" as const,
        query: `collection:PLAW AND lawtype:public AND (${words})`,
        label: `Federal public laws: ${words}`,
      },
    ]),
    ...(draft.bills ?? []).map((bill) => ({
      group: "bill" as const,
      source: "congress" as const,
      query: `${bill} ${CONGRESS}`,
    })),
    ...caseWords(draft).flatMap((words) => [
      ...COURT_COLLECTIONS.map((collection) => ({
        group: "case" as const,
        source: "govinfo" as const,
        query: `collection:${collection} AND (${words})`,
      })),
      {
        group: "case" as const,
        source: "govinfo" as const,
        query: `collection:USCOURTS AND circuit:9 AND (${words})`,
        label: `Federal opinions in the Ninth Circuit: ${words}`,
      },
    ]),
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
