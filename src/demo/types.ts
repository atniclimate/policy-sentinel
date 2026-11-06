/**
 * Shared shapes for the live public demo. The Worker produces them, the page
 * and the PDF builder consume them. Everything here is public, Tier 0 material.
 */
import type { ChainRow } from "./links.ts";

export type SourceStatus = "live" | "key_pending" | "not_available" | "unknown";

/** Source ids this demo can enable today (T1.1 rule 1). */
export type DemoSourceId =
  | "federal-register"
  | "govinfo"
  | "congress"
  | "regulations"
  | "grants"
  | "washington"
  | "oregon"
  | "idaho";

/**
 * Closed list of source ids a later lane may wire in (T1.1 rule 1, design
 * section 3). Local documents get no public source id.
 */
export type PlannedSourceId =
  // GovInfo USCOURTS opinions by courtCode and USREPORTS citations (T1.5).
  | "govinfo-courts"
  // CFR part index, a static file shipped with the page (T1.3).
  | "cfr-index"
  // U.S.C. index, a static file shipped with the page (T1.3).
  | "usc-index"
  // Current reference and greater context; link out until its terms are read (N17).
  | "ecfr"
  // Link out only, to the official IBIA search (T1.5).
  | "ibia"
  // Link out only, to the NILL directory (T1.5).
  | "nill"
  // Tier 2: Supreme Court current-term slip-opinion RSS.
  | "supreme-court"
  // Tier 2: Statutes at Large volume link target.
  | "loc-statutes"
  // Tier 2: committee libraries pilot.
  | "committee-libraries";

export interface DemoSource {
  readonly id: string;
  readonly label: string;
  readonly level: "federal" | "state";
  readonly status: SourceStatus;
  readonly note: string;
  /** Worker secret name that enables this source, when one is needed. */
  readonly secret?: string;
}

export interface DemoCitation {
  readonly sourceId: string;
  readonly identifier: string;
  readonly title: string;
  readonly issuingBody: string;
  readonly kind: string;
  /** ISO date as stated by the source, or null when the extract does not state one. */
  readonly date: string | null;
  readonly officialUrl: string;
  /** Official rendition the text was read from, when text was retrieved. */
  readonly textUrl: string | null;
  readonly retrievedAt: string;
  readonly summary: string | null;
  /** True when this demo can read the policy text and identify issues. */
  readonly textAvailable: boolean;
  /** Cross-source identity of the same official document, such as "fr:2026-05577". Null when the source gives no shared identifier. */
  readonly matchKey: string | null;
  // Search contract v2 only; v1 answers never carry these. Each is source
  // wording as stated, never a computed deadline or classification.
  /** Comment closing date as the source states it (YYYY-MM-DD), or null when it states none. */
  readonly commentsCloseOn?: string | null;
  /** The source states a closing time the demo leaves out (a UTC instant names no Eastern day), so the row points to the source. */
  readonly commentsCloseWithheld?: true;
  /** Docket identifiers verbatim, in this source's own spelling. */
  readonly docketIds?: readonly string[];
  /** Regulation Identifier Numbers, such as "0648-BO46". */
  readonly rins?: readonly string[];
  /** CFR title and part (or part range) the document states it affects. */
  readonly cfrRefs?: readonly DemoCfrRef[];
  /** The source's own subject labels (Federal Register CFR indexing terms), verbatim. */
  readonly topics?: readonly string[];
  /** Grants.gov only: the application closing date as it states it (YYYY-MM-DD); absent when it states none. */
  readonly applicationsCloseOn?: string;
  /**
   * Grants.gov only: listed by a search with the Tribal eligibility filter
   * (codes 07 and 11). The row matches at least one; which one is not stated.
   */
  readonly listedEligibility?: DemoEligibility;
  // Search contract v3 only (T1.1 rule 3); each is source wording as stated,
  // never a computed conclusion. validation.ts accepts these only on v3
  // answers and rejects them on v1 and v2 answers.
  /** A court code such as "ca9" (GovInfo USCOURTS, T1.5). */
  readonly court?: string;
  readonly docketNumber?: string;
  /** A GovInfo package id, such as a case opinion package (T1.5, T1.6). */
  readonly packageId?: string;
  /** The source's own last-modified stamp, as stated. */
  readonly lastModified?: string;
  /** False means the row shows "citation not provided by this source" (T1.5). */
  readonly caseCitationProvided?: boolean;
  /** Grants.gov `cfdas[]`: Assistance Listing number and title, as stated. */
  readonly assistanceListings?: readonly { number: string; title: string }[];
  /** Quoted from a Grants.gov synopsis under its own Authority heading. */
  readonly authorityPassage?: {
    readonly text: string;
    readonly heading: string;
    readonly locator: string;
  };
  readonly versionDate?: string;
  /** A Federal Register document number this document corrects. */
  readonly correctionOf?: string;
  /** Federal Register document numbers that correct this document. */
  readonly corrections?: readonly string[];
  /** Federal Register full-text AUTH wording, verbatim. */
  readonly authorityLine?: string;
  readonly authorityLinePresent?: boolean;
}

/** The Grants.gov eligibility filter: codes 07 and 11, Tribal governments and organizations. */
export type DemoEligibility = "tribal";

export interface DemoCfrRef {
  readonly title: number;
  readonly part: string;
}

/** Federal Register document types; Regulations.gov has no Presidential Document. */
export type DemoDocumentType = "RULE" | "PRORULE" | "NOTICE" | "PRESDOCU";

/** What `query` holds under v1/v2: free text, or one exact identifier as the source spells it. */
export type DemoSearchMatch = "text" | "docket" | "rin" | "cfr";

/**
 * Match kinds that appear only under search criteria v3 (T1.2 router
 * readings, design section 3 rule 2): the v1/v2 kinds plus the new
 * identifier readings the router can hand to a lookup.
 */
export type DemoSearchMatchV3 =
  | DemoSearchMatch
  | "fr_document"
  | "fr_citation"
  | "usc"
  | "public_law"
  | "statute"
  | "us_reports"
  | "federal_bill"
  | "state_bill"
  | "state_code"
  | "court_docket";

/** Complete request binding. A cursor is data, never a URL or authorization. */
export type DemoSearchCriteria =
  DemoSearchCriteriaV1 | DemoSearchCriteriaV2 | DemoSearchCriteriaV3;

export interface DemoSearchCriteriaV1 {
  readonly version: 1;
  readonly source: string;
  readonly query: string;
  readonly dateFrom: string | null;
  readonly dateTo: string | null;
  readonly page: number;
  readonly pageSize: 10;
  readonly sort:
    "relevance" | "provider-default" | "-postedDate" | "reference" | "newest";
  readonly resultLevel: "default" | null;
  readonly historical: false | null;
  readonly cursor: string | null;
}

export interface DemoSearchCriteriaV2 extends Omit<
  DemoSearchCriteriaV1,
  "version"
> {
  readonly version: 2;
  readonly match: DemoSearchMatch;
  /** Null means no type filter. A source with no equivalent is refused, never searched unfiltered. */
  readonly documentType: DemoDocumentType | null;
  /** Present on Grants.gov criteria only; null means no eligibility filter. */
  readonly eligibility?: DemoEligibility | null;
}

/**
 * Version 3 widens `match` to the router's new identifier readings (T1.2);
 * everything else stays the v2 shape. Version 1 and 2 criteria, cursors and
 * answers stay byte-identical to today; ATNI-ResIST reads the older versions
 * and ignores this one.
 */
export interface DemoSearchCriteriaV3 extends Omit<
  DemoSearchCriteriaV2,
  "version" | "match"
> {
  readonly version: 3;
  readonly match: DemoSearchMatchV3;
}

export type DemoSearchCursor = DemoSearchCriteria;

export interface DemoSearchOptions {
  readonly dateFrom: string | null;
  readonly dateTo: string | null;
  readonly continuation: DemoSearchCursor | null;
  /** 2 opts in to identifier matching, the type filter and the v2 citation fields. 3 adds the new match kinds and the v3 citation fields. */
  readonly version?: 1 | 2 | 3;
  /** Version 2 default "text"; version 3 also accepts the new match kinds. */
  readonly match?: DemoSearchMatchV3;
  /** Version 2 and 3 only. Default null. */
  readonly documentType?: DemoDocumentType | null;
  /** Version 2 and 3, Grants.gov only. Default null. */
  readonly eligibility?: DemoEligibility | null;
}

export type DemoSearchContinuation =
  | { readonly kind: "more"; readonly next: DemoSearchCursor }
  | {
      readonly kind: "stopped";
      readonly reason: "complete" | "cap" | "unknown" | "not_applicable";
    };

export interface DemoSearchResponse {
  readonly ok: true;
  readonly source: string;
  readonly query: string;
  readonly total: number | null;
  readonly page: number;
  readonly results: readonly DemoCitation[];
  readonly retrievedAt: string;
  readonly criteria: DemoSearchCriteria;
  readonly continuation: DemoSearchContinuation;
}

export type IssueType =
  | "consultation_language"
  | "consultation_absent"
  | "tribal_reference"
  | "date_or_deadline"
  | "cross_reference"
  | "status_signal";

export interface DemoIssue {
  readonly id: string;
  readonly type: IssueType;
  readonly label: string;
  /** Source words with whitespace collapsed; consultation_absent is a rule assessment. */
  readonly quote: string;
  /** Structural locator of the block the words came from, or "whole text". */
  readonly locator: string;
  readonly rule: string;
  readonly limits: string;
  readonly check: string;
}

export interface DemoReceipt {
  readonly sha256: string;
  readonly bytes: number;
  readonly retrievedAt: string;
  readonly textUrl: string;
}

export interface DemoEngineInfo {
  readonly parser: string;
  readonly parserVersion: string;
  readonly parserConfigDigest: string;
  readonly rulesVersion: string;
}

export interface DemoPolicyResponse {
  readonly ok: true;
  readonly citation: DemoCitation;
  readonly receipt: DemoReceipt;
  readonly engine: DemoEngineInfo;
  readonly blockCount: number;
  readonly characterCount: number;
  readonly issues: readonly DemoIssue[];
  readonly exclusions: readonly {
    readonly reason: string;
    readonly count: number;
  }[];
  readonly warnings: readonly string[];
  /** Short opening passage, so a reader can see what was read. */
  readonly opening: string;
  // Version 3 only (requested with version=3 on /api/policy; answers to
  // version 1 and 2 readers, such as ATNI-ResIST, never carry these).
  /** Present and 3 exactly when the answer carries version 3 fields. */
  readonly version?: 3;
  /** Citations found in the text the Worker read (citation_in_text), as chain rows. */
  readonly chain?: readonly ChainRow[];
}

// Related records, expanded on a press (T1.3), version 3 contract. The
// Worker's govinfo-related.ts and congress-related.ts answer these shapes.

export interface GovInfoRelation {
  /** GovInfo's own relation name, such as "Bill Versions". */
  readonly relation: string;
  readonly collection: string;
}

export interface GovInfoRelations {
  readonly ok: true;
  readonly source: "govinfo";
  readonly basis: "source_field";
  readonly accessId: string;
  readonly relations: readonly GovInfoRelation[];
  readonly retrievedAt: string;
}

export interface RelatedRecord {
  readonly identifier: string;
  /** Null when the source gives no title, or one the personal-pattern guard stops. */
  readonly title: string | null;
  readonly date: string | null;
  readonly officialUrl: string;
}

export interface GovInfoRelatedRecords {
  readonly ok: true;
  readonly source: "govinfo";
  readonly basis: "source_field";
  readonly accessId: string;
  readonly collection: string;
  readonly records: readonly RelatedRecord[];
  /** How many GovInfo listed; more than `records.length` means the list was cut. */
  readonly total: number;
  readonly retrievedAt: string;
}

export interface RelatedBill {
  /** Congress.gov's own relation name, such as "Identical bill". */
  readonly relation: string;
  /** Who Congress.gov says identified the relation, such as "CRS". */
  readonly identifiedBy: string;
  readonly identifier: string;
  readonly title: string;
  readonly officialUrl: string;
}

export interface CongressRelatedBills {
  readonly ok: true;
  readonly source: "congress";
  readonly basis: "source_field";
  readonly bill: string;
  readonly records: readonly RelatedBill[];
  /** Related bills Congress.gov counts; more than shown means the list was cut. */
  readonly total: number | null;
  readonly retrievedAt: string;
}

export interface DemoErrorResponse {
  readonly ok: false;
  readonly error: string;
  readonly message: string;
  readonly status: SourceStatus | "error";
}

export interface TextBlock {
  readonly text: string;
  readonly locator: string;
}

export interface PolicyMeta {
  readonly kind: string;
  readonly title: string;
}

// --- T1.1 contract widening: the link chain (design section 1 rules 1-3, section 3 T1.3) ---

/**
 * Evidence basis on every link (design section 1 rule 1). Nothing else is
 * allowed: a link's basis is always one of these five.
 */
export type Basis =
  | "source_field"
  | "source_text_parsed"
  | "identifier_match"
  | "citation_in_text"
  | "curated";

/** The results family a link belongs to (design section 2). */
export type LinkFamily =
  | "rules_and_notices"
  | "laws_and_bills"
  | "cases"
  | "grants"
  | "state"
  | "intertribal";

/**
 * One link in the Cited and linked records chain. No field here may name or
 * imply a Nation, treaty, jurisdiction, eligibility, legal effect or land
 * (design section 1 rule 2); the label itself comes from the closed table in
 * `src/demo/link-labels.ts` (step 6), typed here as a plain string key.
 */
export interface LinkedRecord {
  readonly basis: Basis;
  /** A key into the closed label table (`src/demo/link-labels.ts`). */
  readonly labelId: string;
  readonly direction: "forward" | "reverse";
  readonly target: {
    readonly sourceId: string;
    readonly identifier: string;
    readonly officialUrl?: string;
  };
  /** Exact wording when parsed from source text; null when the basis is not a parse. */
  readonly sourceWording: string | null;
  readonly locator: string;
  readonly sourceName: string;
  readonly asOfText: string;
  readonly retrievedAt: string;
  readonly family: LinkFamily;
}

// --- T1.1 contract widening: the source status model (design section 3 T1.6) ---

/**
 * Types only; step 9 writes the logic in `src/demo/source-model.ts`. This
 * does not change the existing `SourceStatus` values or the current
 * `/api/sources` shape.
 */
export interface DemoSourceModel {
  readonly enabled: boolean;
  /** The release verification receipt date, or null before one is recorded. */
  readonly verifiedAt: string | null;
  /** This search's own outcome; "not_run" before the source is asked. */
  readonly queryOutcome: "ok" | "unavailable" | "rate_limited" | "not_run";
  readonly coverageLimit: string;
  readonly freshnessPolicy: string;
  readonly linkOutOnly: boolean;
  readonly notCovered: boolean;
}
