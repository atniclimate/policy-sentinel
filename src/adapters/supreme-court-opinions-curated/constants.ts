export const SUPREME_COURT_OPINIONS_SOURCE_ID =
  "supreme-court-opinions-curated" as const;
export const SUPREME_COURT_OPINIONS_ADAPTER_ID =
  "supreme-court-opinions-curated-adapter" as const;
export const SUPREME_COURT_OPINIONS_ADAPTER_VERSION = "1.1.0" as const;
export const SUPREME_COURT_OPINIONS_CONTRACT_VERSION = "1.0.0" as const;
export const SUPREME_COURT_OPINIONS_IDENTITY_RULE =
  "supreme-court-docket-reporter-citation-v1" as const;

export const SUPREME_COURT_ORIGIN = "https://www.supremecourt.gov" as const;
export const SUPREME_COURT_TERM_PATH = "/opinions/slipopinion/18" as const;
export const SUPREME_COURT_TERM_URL =
  "https://www.supremecourt.gov/opinions/slipopinion/18" as const;
export const SUPREME_COURT_TERM_HEADING =
  "Opinions of the Court - 2018" as const;
export const SUPREME_COURT_DOCUMENT_FORM_LABEL =
  "Opinions of the Court" as const;
export const SUPREME_COURT_PUBLICATION_LABEL =
  "U.S. Reports, Volume 586" as const;

export const SUPREME_COURT_OPINION_TABLE_CLASS =
  "table table-bordered" as const;
export const SUPREME_COURT_HEADER_DOM_ORDER = Object.freeze([
  "R-",
  "Date",
  "Docket",
  "Name",
  "J.",
  "Citation",
] as const);
export const SUPREME_COURT_OPINION_TABLE_DATA_ROW_COUNTS = Object.freeze([
  10, 63,
] as const);

export const SUPREME_COURT_SELECTED_OPINION = Object.freeze({
  sequence: "22",
  decisionDateSourceText: "3/19/19",
  decisionDate: "2019-03-19",
  docketNumber: "16-1498",
  caseName: "Washington State Dept. of Licensing v. Cougar Den, Inc.",
  principalOpinionCode: "B",
  reporterCitation: "586 U.S. 347",
  rawBoundVolumeHref: "/opinions/boundvolumes/586BV.pdf#page=546",
  boundVolumeUrl:
    "https://www.supremecourt.gov/opinions/boundvolumes/586BV.pdf#page=546",
} as const);

export const SUPREME_COURT_HTML_POLICY = Object.freeze({
  maximumResponseBytes: 262_144,
  maximumChunks: 512,
  maximumDomNodes: 4_096,
  maximumDomAttributes: 2_048,
  maximumDomDepth: 32,
  maximumTextCodeUnits: 65_536,
  maximumParseErrors: 1,
  maximumTables: 3,
  requiredOpinionTables: 2,
  maximumRowsPerOpinionTable: 64,
  maximumDataRows: 73,
  maximumTextCodePoints: 500,
  timeoutMilliseconds: 30_000,
} as const);

export const SUPREME_COURT_REQUIRED_PROVENANCE_POINTERS = Object.freeze([
  "/officialTitle",
  "/sourceDocumentIdentifier",
  "/documentType",
  "/jurisdiction/name",
  "/judicialContext/adjudicatingBody/officialName",
  "/judicialContext/docketNumbers/0",
  "/judicialContext/citations/0/value",
  "/judicialContext/citations/0/sourceUrl",
  "/judicialContext/decisionDate",
  "/judicialContext/documentForm/sourceLabel",
  "/judicialContext/publicationStatus/sourceLabel",
  "/judicialContext/publicationStatus/asOf",
  "/judicialContext/revisionReview/state",
  "/judicialContext/revisionReview/reviewedOn",
  "/status/sourceLabel",
  "/status/asOf",
  "/urls/officialSource",
  "/landmark/isLandmark",
  "/landmark/criterionCodes/0",
  "/landmark/reviewState",
  "/landmark/officialEvidence/0/sourceLabel",
  "/landmark/officialEvidence/0/sourceUrl",
  "/landmark/officialEvidence/0/sourceDate",
  "/landmark/officialEvidence/0/reproductionBasis",
] as const);

export const SUPREME_COURT_USER_AGENT =
  "Policy-Sentinel/1.0 (+source-contract; build-time-only)" as const;
