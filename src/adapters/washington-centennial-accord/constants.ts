export const WASHINGTON_CENTENNIAL_ACCORD_SOURCE_ID =
  "washington-centennial-accord" as const;
export const WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_ID =
  "washington-centennial-accord-adapter" as const;
export const WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_VERSION = "1.0.0" as const;
export const WASHINGTON_CENTENNIAL_ACCORD_CONTRACT_VERSION = "1.0.0" as const;
export const WASHINGTON_CENTENNIAL_ACCORD_IDENTITY_RULE =
  "washington-centennial-accord-title-execution-url-v1" as const;

export const GOIA_ORIGIN = "https://goia.wa.gov" as const;
export const GOIA_ACCORD_PATH =
  "/state-tribal-relations-centennial-accord/centennial-accord" as const;
export const GOIA_ACCORD_URL =
  "https://goia.wa.gov/state-tribal-relations-centennial-accord/centennial-accord" as const;

export const GOIA_ACCORD_METADATA = Object.freeze({
  pageTitle: "Centennial Accord",
  instrumentTitle:
    "Centennial Accord between the Federally Recognized Indian Tribes in Washington State and the State of Washington",
  statePartyName: "State of Washington",
  stateExecutingLabel: "State of Washington, through its governor",
  stateSignatoryLabel: "the signatory tribes and the governor",
  tribalPartyName:
    "federally recognized Indian tribes of Washington signatory to this Accord",
  tribalSignatoryLabel: "the signatory tribes",
  executionSourceLabel:
    "Signatory parties have executed this Accord on the date of August 4, 1989",
  executionDate: "1989-08-04",
  fallbackIdentifier: "centennial-accord@1989-08-04",
} as const);

export const GOIA_ACCORD_HTML_POLICY = Object.freeze({
  maximumResponseBytes: 128 * 1_024,
  maximumChunks: 512,
  maximumDomNodes: 2_048,
  maximumDomAttributes: 1_536,
  maximumAttributesPerElement: 32,
  maximumDomDepth: 32,
  maximumTextCodeUnits: 49_152,
  maximumParseErrors: 8,
  requiredArticleBodyDirectElements: 26,
  maximumArticleTextCodeUnits: 12_288,
  maximumDirectElementTextCodeUnits: 4_096,
  timeoutMilliseconds: 30_000,
} as const);

export const GOIA_ACCORD_REQUIRED_PROVENANCE_POINTERS = Object.freeze([
  "/officialTitle",
  "/sourceDocumentIdentifier",
  "/documentType",
  "/jurisdiction/name",
  "/accordContext/parties/0/officialName",
  "/accordContext/parties/1/officialName",
  "/accordContext/executionEvent/date",
  "/accordContext/statusReview/sourceLabel",
  "/urls/officialSource",
] as const);

export const GOIA_ACCORD_USER_AGENT =
  "Policy-Sentinel/1.0 (+source-contract; build-time-only)" as const;
