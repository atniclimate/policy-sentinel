export type GoiaAccordContractErrorCode =
  | "duplicate_value"
  | "inconsistent_value"
  | "invalid_type"
  | "invalid_value"
  | "limit_exceeded"
  | "missing_field"
  | "unexpected_field"
  | "unexpected_structure";

export class GoiaAccordContractError extends Error {
  readonly code: GoiaAccordContractErrorCode;
  readonly path: string;

  constructor(code: GoiaAccordContractErrorCode, path: string) {
    super("GOIA Centennial Accord page contract failed.");
    this.name = "GoiaAccordContractError";
    this.code = code;
    this.path = path;
  }
}

export type GoiaAccordTransportErrorCode =
  | "invalid_url"
  | "nonpublic_host"
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

export class GoiaAccordTransportError extends Error {
  readonly code: GoiaAccordTransportErrorCode;

  constructor(code: GoiaAccordTransportErrorCode) {
    super("GOIA Centennial Accord page retrieval failed.");
    this.name = "GoiaAccordTransportError";
    this.code = code;
  }
}
