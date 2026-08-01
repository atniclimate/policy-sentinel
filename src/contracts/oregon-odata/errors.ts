export type OregonODataContractErrorCode =
  | "duplicate_value"
  | "inconsistent_value"
  | "invalid_type"
  | "invalid_value"
  | "limit_exceeded"
  | "missing_field"
  | "unexpected_field";

export class OregonODataContractError extends Error {
  readonly code: OregonODataContractErrorCode;
  readonly path: string;

  constructor(
    code: OregonODataContractErrorCode,
    path: string,
    message: string,
  ) {
    super(`Oregon OData offline contract ${code} at ${path}: ${message}`);
    this.name = "OregonODataContractError";
    this.code = code;
    this.path = path;
  }
}

export function failOregonODataContract(
  code: OregonODataContractErrorCode,
  path: string,
  message: string,
): never {
  throw new OregonODataContractError(code, path, message);
}
