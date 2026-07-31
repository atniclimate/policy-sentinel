export type SupremeCourtContractErrorCode =
  | "duplicate_value"
  | "inconsistent_value"
  | "invalid_type"
  | "invalid_value"
  | "limit_exceeded"
  | "missing_field"
  | "unexpected_field"
  | "unexpected_structure";

export class SupremeCourtContractError extends Error {
  readonly code: SupremeCourtContractErrorCode;
  readonly path: string;

  constructor(
    code: SupremeCourtContractErrorCode,
    path: string,
    message = "Supreme Court curated-opinion index contract failed.",
  ) {
    super(message);
    this.name = "SupremeCourtContractError";
    this.code = code;
    this.path = path;
  }
}

export type SupremeCourtTransportErrorCode =
  | "invalid_url"
  | "redirect"
  | "http_status"
  | "timeout"
  | "network"
  | "content_type"
  | "content_encoding"
  | "content_length"
  | "response_fragmentation"
  | "response_too_large"
  | "missing_body"
  | "invalid_utf8"
  | "invalid_html";

export class SupremeCourtTransportError extends Error {
  readonly code: SupremeCourtTransportErrorCode;

  constructor(code: SupremeCourtTransportErrorCode) {
    super("Supreme Court curated-opinion index retrieval failed.");
    this.name = "SupremeCourtTransportError";
    this.code = code;
  }
}
