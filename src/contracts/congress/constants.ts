export const CONGRESS_GOV_CONTRACT_VERSION = "1.0.0" as const;
export const CONGRESS_GOV_SOURCE_ID = "congress-gov" as const;
export const CONGRESS_GOV_API_ROOT = "/v3" as const;

export const CONGRESS_GOV_BILL_TYPES = [
  "hr",
  "s",
  "hjres",
  "sjres",
  "hconres",
  "sconres",
  "hres",
  "sres",
] as const;

export type CongressGovBillType = (typeof CONGRESS_GOV_BILL_TYPES)[number];

export const CONGRESS_GOV_PUBLIC_BILL_TYPE_SLUGS = {
  hr: "house-bill",
  s: "senate-bill",
  hjres: "house-joint-resolution",
  sjres: "senate-joint-resolution",
  hconres: "house-concurrent-resolution",
  sconres: "senate-concurrent-resolution",
  hres: "house-resolution",
  sres: "senate-resolution",
} as const satisfies Record<CongressGovBillType, string>;

export const CONGRESS_GOV_LAW_TYPES = ["pub", "priv"] as const;
export type CongressGovLawType = (typeof CONGRESS_GOV_LAW_TYPES)[number];

export const CONGRESS_GOV_BILL_SUBRESOURCES = [
  "actions",
  "amendments",
  "committees",
  "cosponsors",
  "relatedbills",
  "subjects",
  "summaries",
  "text",
  "titles",
] as const;

export type CongressGovBillSubresource =
  (typeof CONGRESS_GOV_BILL_SUBRESOURCES)[number];

export const CONGRESS_GOV_REFERENCE_HOSTS = new Set([
  "api.congress.gov",
  "api.data.gov",
  "www.congress.gov",
  "www.govinfo.gov",
]);

export const CONGRESS_GOV_QUERY_POLICY = {
  format: "json",
  firstOffset: 0,
  maximumLimit: 250,
  maximumCongress: 999,
  maximumBillOrLawNumber: 999_999,
  maximumUrlLength: 4_096,
} as const;

export const CONGRESS_GOV_SYNTHETIC_NOTICE =
  "Synthetic contract data; not a Congress.gov response." as const;
