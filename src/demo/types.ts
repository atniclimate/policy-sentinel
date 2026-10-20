/**
 * Shared shapes for the live public demo. The Worker produces them, the page
 * and the PDF builder consume them. Everything here is public, Tier 0 material.
 */

export type SourceStatus = "live" | "key_pending" | "not_available" | "unknown";

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
}

export interface DemoCfrRef {
  readonly title: number;
  readonly part: string;
}

/** Federal Register document types; Regulations.gov has no Presidential Document. */
export type DemoDocumentType = "RULE" | "PRORULE" | "NOTICE" | "PRESDOCU";

/** What `query` holds: free text, or one exact identifier as the source spells it. */
export type DemoSearchMatch = "text" | "docket" | "rin" | "cfr";

/** Complete request binding. A cursor is data, never a URL or authorization. */
export type DemoSearchCriteria = DemoSearchCriteriaV1 | DemoSearchCriteriaV2;

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
}

export type DemoSearchCursor = DemoSearchCriteria;

export interface DemoSearchOptions {
  readonly dateFrom: string | null;
  readonly dateTo: string | null;
  readonly continuation: DemoSearchCursor | null;
  /** 2 opts in to identifier matching, the type filter and the v2 citation fields. */
  readonly version?: 1 | 2;
  /** Version 2 only. Default "text". */
  readonly match?: DemoSearchMatch;
  /** Version 2 only. Default null. */
  readonly documentType?: DemoDocumentType | null;
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
