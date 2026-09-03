export const FEDERAL_REGISTER_TIER1_DOCUMENT_NUMBER: "2026-16965";

export const FEDERAL_REGISTER_TIER1_FIELDS: readonly [
  "document_number",
  "title",
  "type",
  "subtype",
  "publication_date",
  "effective_on",
  "comments_close_on",
  "signing_date",
  "citation",
  "volume",
  "start_page",
  "end_page",
  "agencies",
  "docket_ids",
  "regulation_id_numbers",
  "cfr_references",
  "topics",
  "cfr_topics",
  "html_url",
  "pdf_url",
  "json_url",
  "full_text_xml_url",
  "raw_text_url",
];

export type FederalRegisterTier1DocumentType =
  | "Rule"
  | "Proposed Rule"
  | "Notice"
  | "Presidential Document"
  | "Uncategorized Document";

export interface FederalRegisterTier1Agency {
  readonly raw_name: string;
  readonly name?: string;
  readonly id?: number;
  readonly slug?: string;
  readonly parent_id?: number | null;
}

export interface FederalRegisterTier1CfrReference {
  readonly chapter: string | number | null;
  readonly citation_url: string | null;
  readonly part: string | number | null;
  readonly title: number;
}

export interface FederalRegisterTier1CfrTopic {
  readonly cfr_part: string;
  readonly topics: readonly string[];
  readonly cfr_title: number;
  readonly cfr_chapter?: string | null;
}

export interface FederalRegisterTier1Document {
  readonly document_number: "2026-16965";
  readonly title: string;
  readonly type: FederalRegisterTier1DocumentType;
  readonly subtype: string | null;
  readonly publication_date: string;
  readonly effective_on: string | null;
  readonly comments_close_on: string | null;
  readonly signing_date: string | null;
  readonly citation: string | null;
  readonly volume: number | null;
  readonly start_page: number | null;
  readonly end_page: number | null;
  readonly agencies: readonly FederalRegisterTier1Agency[];
  readonly docket_ids: readonly [];
  readonly regulation_id_numbers: readonly string[];
  readonly cfr_references: readonly FederalRegisterTier1CfrReference[] | null;
  readonly topics: readonly string[];
  readonly cfr_topics: readonly FederalRegisterTier1CfrTopic[] | null;
  readonly html_url: string;
  readonly pdf_url: string | null;
  readonly json_url: string;
  readonly full_text_xml_url: string | null;
  readonly raw_text_url: string | null;
}

export type FederalRegisterTier1ContractErrorCode =
  | "invalid_json"
  | "invalid_type"
  | "missing_field"
  | "unexpected_field"
  | "invalid_value"
  | "duplicate_value"
  | "invalid_url"
  | "limit_exceeded"
  | "identity_mismatch"
  | "inconsistent_field";

export class FederalRegisterTier1ContractError extends TypeError {
  readonly code: FederalRegisterTier1ContractErrorCode;
  readonly path: string;
  constructor(
    code: FederalRegisterTier1ContractErrorCode,
    path: string,
    detail: string,
  );
}

export function parseFederalRegisterTier1Document(
  value: unknown,
): FederalRegisterTier1Document;

export function parseFederalRegisterTier1DocumentJson(
  value: string,
): FederalRegisterTier1Document;

export function serializeFederalRegisterTier1Document(value: unknown): string;
