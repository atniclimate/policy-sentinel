export const OREGON_ODATA_CONTRACT_VERSION = "1.0.0" as const;
export const OREGON_ODATA_SOURCE_ID = "oregon-legislature-odata" as const;

export const OREGON_ODATA_SYNTHETIC_NOTICE =
  "Repository-authored synthetic contract data; not an Oregon Legislature response." as const;

export const OREGON_ODATA_METADATA_KIND =
  "repository_owned_offline_metadata" as const;
export const OREGON_ODATA_BUNDLE_KIND =
  "repository_owned_offline_entity_bundle" as const;

export const OREGON_ODATA_ENTITY_KINDS = [
  "sessions",
  "measures",
  "sponsors",
  "committees",
  "actions",
  "votes",
  "versions",
  "statuses",
] as const;

export type OregonODataEntityKind = (typeof OREGON_ODATA_ENTITY_KINDS)[number];

export const OREGON_ODATA_OFFLINE_POLICY = {
  earliestSessionYear: 2007,
  latestSyntheticSessionYear: 3999,
  maximumPagesPerEntity: 16,
  maximumItemsPerPage: 250,
  maximumItemsPerEntity: 2_000,
  maximumIdentifierLength: 128,
  maximumLabelLength: 2_048,
} as const;

export const OREGON_ODATA_HISTORY_BOUNDARY_MEANING =
  "offline_contract_floor_from_earliest_observed_odata_session_not_a_completeness_claim" as const;

export const OREGON_ODATA_PAGINATION_KIND =
  "repository_owned_sequential_pages" as const;
