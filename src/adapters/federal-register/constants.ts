export const FEDERAL_REGISTER_ORIGIN =
  "https://www.federalregister.gov" as const;

export const FEDERAL_REGISTER_PATHS = {
  search: "/api/v1/documents.json",
  detail: "/api/v1/documents/",
  facet: "/api/v1/documents/facets/",
  issue: "/api/v1/issues/",
  openApi: "/api/v1/documentation.json",
} as const;

export const FEDERAL_REGISTER_DISCOVERY_FIELDS = [
  "document_number",
  "title",
  "type",
  "subtype",
  "abstract",
  "action",
  "dates",
  "publication_date",
  "effective_on",
  "comments_close_on",
  "signing_date",
  "citation",
  "volume",
  "start_page",
  "end_page",
  "agencies",
  "agency_names",
  "docket_ids",
  "regulation_id_numbers",
  "topics",
  "cfr_topics",
  "cfr_references",
  "correction_of",
  "corrections",
  "related_documents",
  "disposition_notes",
  "html_url",
  "pdf_url",
  "json_url",
  "mods_url",
] as const;

export type FederalRegisterDiscoveryField =
  (typeof FEDERAL_REGISTER_DISCOVERY_FIELDS)[number];

export const FEDERAL_REGISTER_QUERY_POLICY = {
  earliestPublicationDate: "1994-01-01",
  order: "oldest",
  pageSize: 1_000,
  sliceThreshold: 2_000,
  maximumObservedWindow: 10_000,
  maximumPageNumber: 50,
  maximumCursorLength: 4_096,
  maximumUrlLength: 32 * 1_024,
  maximumDocumentBatchSize: 25,
} as const;

export const FEDERAL_REGISTER_RESPONSE_POLICY = {
  openApi: {
    mediaTypes: ["application/json"],
    maxBytes: 1 * 1_024 * 1_024,
  },
  search: {
    mediaTypes: ["application/json"],
    maxBytes: 16 * 1_024 * 1_024,
  },
  document: {
    mediaTypes: ["application/json"],
    maxBytes: 2 * 1_024 * 1_024,
  },
  documentBatch: {
    mediaTypes: ["application/json"],
    maxBytes: 8 * 1_024 * 1_024,
  },
  facet: {
    mediaTypes: ["application/json"],
    maxBytes: 2 * 1_024 * 1_024,
  },
  issue: {
    mediaTypes: ["application/json"],
    maxBytes: 8 * 1_024 * 1_024,
  },
} as const;
