export type WashingtonGovernorContractErrorCode =
  | "duplicate_value"
  | "inconsistent_value"
  | "invalid_type"
  | "invalid_value"
  | "limit_exceeded"
  | "missing_field"
  | "prohibited_html"
  | "unexpected_field"
  | "unexpected_structure";

export class WashingtonGovernorContractError extends Error {
  readonly code: WashingtonGovernorContractErrorCode;
  readonly path: string;

  constructor(
    code: WashingtonGovernorContractErrorCode,
    path: string,
    message = "Washington Governor executive-order index contract failed.",
  ) {
    super(message);
    this.name = "WashingtonGovernorContractError";
    this.code = code;
    this.path = path;
  }
}

export type WashingtonGovernorTransportErrorCode =
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

export class WashingtonGovernorTransportError extends Error {
  readonly code: WashingtonGovernorTransportErrorCode;

  constructor(code: WashingtonGovernorTransportErrorCode) {
    super("Washington Governor executive-order index retrieval failed.");
    this.name = "WashingtonGovernorTransportError";
    this.code = code;
  }
}
