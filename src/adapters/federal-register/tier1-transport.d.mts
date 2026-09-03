import type { FederalRegisterTier1Document } from "./tier1-contract.mjs";

export const FEDERAL_REGISTER_TIER1_REQUEST_URL: string;

export const FEDERAL_REGISTER_TIER1_REQUEST_POLICY: Readonly<{
  requestId: "FR-A1";
  method: "GET";
  host: "www.federalregister.gov";
  path: "/api/v1/documents/2026-16965.json";
  maximumBytes: 65_536;
  maximumChunks: 64;
  maximumAttempts: 1;
  maximumPages: 1;
  maximumItems: 1;
  timeoutMilliseconds: 30_000;
  redirect: "manual";
  credentials: "omit";
  referrerPolicy: "no-referrer";
  accept: "application/json";
  acceptEncoding: "identity";
  userAgent: "Policy-Sentinel-LocalPrerelease/1.0";
}>;

export type FederalRegisterTier1TransportErrorCode =
  | "invalid_dependency"
  | "network"
  | "timeout"
  | "redirect"
  | "bad_request"
  | "not_found"
  | "rate_limited"
  | "http_status"
  | "content_type"
  | "content_encoding"
  | "content_length"
  | "response_too_large"
  | "chunk_limit"
  | "invalid_utf8"
  | "invalid_json"
  | "contract_rejected"
  | "replay_mismatch"
  | "invalid_response";

export type FederalRegisterTier1TransportFailureCategory =
  | "invalid_transport_dependency"
  | "missing_fetch_implementation"
  | "network_failure"
  | "deadline_exceeded"
  | "redirect_denied"
  | "json_400"
  | "html_404"
  | "rate_limited_stop"
  | "non_success_status"
  | "json_media_required"
  | "utf8_json_media_required"
  | "identity_encoding_required"
  | "invalid_content_length"
  | "content_length_mismatch"
  | "byte_ceiling_exceeded"
  | "chunk_ceiling_exceeded"
  | "invalid_utf8"
  | "utf8_bom_forbidden"
  | "invalid_or_duplicate_json"
  | "tier1_contract_rejected"
  | "non_deterministic_projection"
  | "invalid_response_metadata"
  | "missing_response_body"
  | "invalid_response_chunk"
  | "sha256_unavailable"
  | "sha256_failed";

export class FederalRegisterTier1TransportError extends Error {
  readonly code: FederalRegisterTier1TransportErrorCode;
  readonly category: FederalRegisterTier1TransportFailureCategory;
  readonly status: number | null;
  constructor(
    code: FederalRegisterTier1TransportErrorCode,
    category: FederalRegisterTier1TransportFailureCategory,
    status?: number | null,
  );
}

export type FederalRegisterTier1FetchLike = (
  input: string,
  init: Readonly<RequestInit>,
) => Promise<Response>;

export interface FederalRegisterTier1TransportDependencies {
  readonly fetchImpl?: FederalRegisterTier1FetchLike;
}

export interface FederalRegisterTier1TransportReceipt {
  readonly requestId: "FR-A1";
  readonly methodClass: "GET";
  readonly hostClass: "federal_register_api";
  readonly statusCategory: "2xx";
  readonly mediaCategory: "application_json_utf8_identity";
  readonly attemptCount: 1;
  readonly retryCount: 0;
  readonly redirectCount: 0;
  readonly byteCount: number;
  readonly chunkCount: number;
  readonly pageCount: 1;
  readonly itemCount: 1;
  readonly sha256: string;
}

export interface FederalRegisterTier1TransportResult {
  readonly primary: FederalRegisterTier1Document;
  readonly replay: FederalRegisterTier1Document;
  readonly receipt: FederalRegisterTier1TransportReceipt;
}

export function fetchFederalRegisterTier1Document(
  dependencies?: FederalRegisterTier1TransportDependencies,
): Promise<FederalRegisterTier1TransportResult>;
