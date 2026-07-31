export type RegulationsGovContractErrorCode =
  | "duplicate_value"
  | "inconsistent_value"
  | "invalid_type"
  | "invalid_url"
  | "invalid_value"
  | "limit_exceeded"
  | "missing_field"
  | "unexpected_field";

export class RegulationsGovContractError extends Error {
  readonly code: RegulationsGovContractErrorCode;
  readonly path: string;

  constructor(
    code: RegulationsGovContractErrorCode,
    path: string,
    message: string,
  ) {
    super(`Regulations.gov contract ${code} at ${path}: ${message}`);
    this.name = "RegulationsGovContractError";
    this.code = code;
    this.path = path;
  }
}

export function failRegulationsGovContract(
  code: RegulationsGovContractErrorCode,
  path: string,
  message: string,
): never {
  throw new RegulationsGovContractError(code, path, message);
}
