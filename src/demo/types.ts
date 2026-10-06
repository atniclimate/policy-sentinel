/**
 * Shared shapes for the live public demo. The Worker produces them, the page
 * and the PDF builder consume them. Everything here is public, Tier 0 material.
 */

export type SourceStatus = "live" | "key_pending" | "not_available";

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
}

export interface DemoSearchResponse {
  readonly ok: true;
  readonly source: string;
  readonly query: string;
  readonly total: number | null;
  readonly page: number;
  readonly results: readonly DemoCitation[];
  readonly retrievedAt: string;
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
  /** Exact words from the extracted policy text. */
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
