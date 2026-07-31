export const GOVINFO_CONTRACT_VERSION = "1.0.0" as const;
export const GOVINFO_SOURCE_ID = "govinfo" as const;

export const GOVINFO_SYNTHETIC_NOTICE =
  "Synthetic contract data; not a GovInfo response." as const;

export const GOVINFO_RESOURCE_PROJECTION_KIND =
  "repository_resource_projection" as const;
export const GOVINFO_RETRY_DIRECTIVE_KIND =
  "repository_retry_directive" as const;

export const GOVINFO_COLLECTIONS = [
  "BILLS",
  "BILLSTATUS",
  "BUDGET",
  "CCAL",
  "CDIR",
  "CDOC",
  "CFR",
  "CHRG",
  "CMR",
  "COMPS",
  "CPD",
  "CPRT",
  "CREC",
  "CRECB",
  "CRI",
  "CRPT",
  "CZIC",
  "ECFR",
  "ECONI",
  "ERIC",
  "ERP",
  "FR",
  "GAOREPORTS",
  "GOVMAN",
  "GOVPUB",
  "GPO",
  "HJOURNAL",
  "HMAN",
  "HOB",
  "LSA",
  "PAI",
  "PLAW",
  "PPP",
  "SERIALSET",
  "SJOURNAL",
  "SMAN",
  "STATUTE",
  "USCODE",
  "USCOURTS",
  "USREPORTS",
] as const;

export type GovInfoCollection = (typeof GOVINFO_COLLECTIONS)[number];

export const GOVINFO_QUERY_POLICY = {
  maximumPageSize: 1_000,
  maximumCursorLength: 4_096,
  maximumIdentifierLength: 256,
  maximumUrlLength: 4_096,
} as const;

export const GOVINFO_RETRY_POLICY = {
  maximumAttempts: 3,
  maximumElapsedSeconds: 120,
  maximumRetryAfterSeconds: 60,
} as const;

export const GOVINFO_RETRY_OPERATIONS = [
  "package-mods",
  "package-zip",
  "granule-mods",
  "granule-zip",
] as const;

export type GovInfoRetryOperation = (typeof GOVINFO_RETRY_OPERATIONS)[number];

export const GOVINFO_CONTRACT_COLLECTIONS = [
  "BILLS",
  "FR",
  "USCOURTS",
] as const satisfies readonly GovInfoCollection[];

export type GovInfoContractCollection =
  (typeof GOVINFO_CONTRACT_COLLECTIONS)[number];

export const GOVINFO_COLLECTION_COVERAGE = {
  BILLS: {
    scope: "Congressional Bill Text",
    range: "published versions from 103rd Congress onward",
    completeness: "collection_specific",
    granuleAvailability: "not_modeled",
  },
  FR: {
    scope: "Federal Register",
    range:
      "official editions 1936 to present; period-specific rendition and granule gaps",
    completeness: "collection_specific_gaps",
    granuleAvailability: "available",
  },
  USCOURTS: {
    scope: "United States Courts Opinions",
    range: "selected opinions generally 2004 to present; earlier gaps",
    completeness: "selected_incomplete",
    granuleAvailability: "collection_specific",
  },
} as const satisfies Record<
  GovInfoContractCollection,
  {
    scope: string;
    range: string;
    completeness: string;
    granuleAvailability: string;
  }
>;

export const GOVINFO_RENDITION_FORMATS = [
  "pdf",
  "text",
  "xml",
  "uslm",
] as const;

export type GovInfoRenditionFormat = (typeof GOVINFO_RENDITION_FORMATS)[number];

export const GOVINFO_RENDITION_SCOPES = ["package", "granule"] as const;

export type GovInfoRenditionScope = (typeof GOVINFO_RENDITION_SCOPES)[number];

export const GOVINFO_RENDITION_PATHS = {
  pdf: { directory: "pdf", extension: "pdf" },
  text: { directory: "html", extension: "htm" },
  xml: { directory: "xml", extension: "xml" },
  uslm: { directory: "uslm", extension: "xml" },
} as const satisfies Record<
  GovInfoRenditionFormat,
  { directory: string; extension: string }
>;

export const GOVINFO_FIXITY_ALGORITHMS = [
  "MD5",
  "SHA-1",
  "SHA-256",
  "SHA-512",
] as const;

export type GovInfoFixityAlgorithm = (typeof GOVINFO_FIXITY_ALGORITHMS)[number];

export const GOVINFO_COURT_TYPES = [
  "appellate",
  "bankruptcy",
  "district",
  "national",
] as const;

export type GovInfoCourtType = (typeof GOVINFO_COURT_TYPES)[number];

export const GOVINFO_COURT_BODY_TYPES = ["opinion"] as const;

export type GovInfoCourtBodyType = (typeof GOVINFO_COURT_BODY_TYPES)[number];
