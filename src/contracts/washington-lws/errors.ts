export type WashingtonLwsContractErrorCode =
  | "duplicate_value"
  | "inconsistent_value"
  | "invalid_type"
  | "invalid_value"
  | "limit_exceeded"
  | "missing_field"
  | "prohibited_xml"
  | "unexpected_field"
  | "unexpected_namespace"
  | "unsupported_operation";

export class WashingtonLwsContractError extends Error {
  readonly code: WashingtonLwsContractErrorCode;
  readonly path: string;

  constructor(
    code: WashingtonLwsContractErrorCode,
    path: string,
    message: string,
  ) {
    super(`Washington LWS contract ${code} at ${path}: ${message}`);
    this.name = "WashingtonLwsContractError";
    this.code = code;
    this.path = path;
  }
}

export function failWashingtonLwsContract(
  code: WashingtonLwsContractErrorCode,
  path: string,
  message: string,
): never {
  throw new WashingtonLwsContractError(code, path, message);
}
