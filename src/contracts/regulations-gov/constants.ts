export const REGULATIONS_GOV_CONTRACT_VERSION = "1.0.0" as const;
export const REGULATIONS_GOV_SOURCE_ID = "regulations-gov" as const;
export const REGULATIONS_GOV_SYNTHETIC_NOTICE =
  "Synthetic contract data; not a Regulations.gov response." as const;

export const REGULATIONS_GOV_API_ROOT = "/v4" as const;
export const REGULATIONS_GOV_SYNTHETIC_PAGINATION_KIND =
  "repository_owned_synthetic_pagination" as const;

export const REGULATIONS_GOV_DOCUMENT_TYPES = [
  "Notice",
  "Rule",
  "Proposed Rule",
  "Supporting & Related Material",
  "Other",
] as const;

export type RegulationsGovDocumentType =
  (typeof REGULATIONS_GOV_DOCUMENT_TYPES)[number];

export const REGULATIONS_GOV_DOCKET_TYPES = [
  "Rulemaking",
  "Nonrulemaking",
] as const;

export type RegulationsGovDocketType =
  (typeof REGULATIONS_GOV_DOCKET_TYPES)[number];

export const REGULATIONS_GOV_QUERY_POLICY = {
  firstPageNumber: 1,
  maximumPageNumber: 20,
  minimumPageSize: 5,
  maximumPageSize: 250,
  maximumTotalElements: 5_000,
  maximumIdentifierLength: 256,
  maximumAgencyIdLength: 64,
  maximumSubtypeLength: 256,
  maximumCanonicalRequestLength: 8_192,
} as const;

export const REGULATIONS_GOV_DOCUMENT_SORT =
  "lastModifiedDate,documentId" as const;
export const REGULATIONS_GOV_DOCKET_SORT = "lastModifiedDate,docketId" as const;
