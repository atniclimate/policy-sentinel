export {
  GOIA_ACCORD_HTML_POLICY,
  GOIA_ACCORD_METADATA,
  GOIA_ACCORD_PATH,
  GOIA_ACCORD_REQUIRED_PROVENANCE_POINTERS,
  GOIA_ACCORD_URL,
  GOIA_ACCORD_USER_AGENT,
  WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_ID,
  WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_VERSION,
  WASHINGTON_CENTENNIAL_ACCORD_CONTRACT_VERSION,
  WASHINGTON_CENTENNIAL_ACCORD_IDENTITY_RULE,
  WASHINGTON_CENTENNIAL_ACCORD_SOURCE_ID,
} from "./constants";
export {
  GOIA_ACCORD_NORMALIZATION_RULES,
  assertGoiaAccordSourceConfig,
  goiaAccordStableRecordId,
  normalizeGoiaAccord,
} from "./normalize";
export { assertGoiaAccordUrl, buildGoiaAccordUrl } from "./query-contract";
export {
  assertGoiaAccordProjection,
  goiaAccordSourceRecordId,
  parseGoiaAccordPage,
} from "./response-contract";
export type { GoiaAccordPage, GoiaAccordProjection } from "./response-contract";
export {
  fetchGoiaAccordPage,
  type GoiaAccordFetchLike,
  type GoiaAccordTransportDependencies,
} from "./transport";
export { GoiaAccordContractError, GoiaAccordTransportError } from "./errors";
export type {
  GoiaAccordContractErrorCode,
  GoiaAccordTransportErrorCode,
} from "./errors";

export {
  WashingtonCentennialAccordAdapter,
  createWashingtonCentennialAccordAdapter,
} from "./adapter";
export type { GoiaAccordRefreshValidator } from "./adapter";
export { refreshWashingtonCentennialAccordSource } from "../../../scripts/configured-source-refresh";
