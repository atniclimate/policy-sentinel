export const WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_SOURCE_ID =
  "washington-governor-executive-orders" as const;
export const WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_ID =
  "washington-governor-executive-orders-adapter" as const;
export const WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_VERSION =
  "1.0.0" as const;
export const WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_CONTRACT_VERSION =
  "1.0.0" as const;
export const WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_IDENTITY_RULE =
  "washington-governor-executive-order-number-issued-date-v1" as const;

export const WASHINGTON_GOVERNOR_ORIGIN = "https://governor.wa.gov" as const;
export const WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_PATH =
  "/office-governor/office/official-actions/executive-orders" as const;
export const WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL =
  "https://governor.wa.gov/office-governor/office/official-actions/executive-orders?governor=220&field_executive_order_status_target_id=All" as const;
export const WASHINGTON_GOVERNOR_PDF_PATH_PREFIX =
  "/sites/default/files/exe_order/" as const;

export const WASHINGTON_GOVERNOR_FILTER_VALUE = "220" as const;
export const WASHINGTON_GOVERNOR_FILTER_LABEL = "Bob Ferguson" as const;
export const WASHINGTON_GOVERNOR_STATUS_FILTER_VALUE = "All" as const;
export const WASHINGTON_GOVERNOR_STATUS_FILTER_LABEL = "- Any -" as const;

export const WASHINGTON_GOVERNOR_SELECTED_FROM = "2025-01-15" as const;
export const WASHINGTON_GOVERNOR_REQUIRED_ANCHOR = Object.freeze({
  number: "25-01",
  issuedDate: WASHINGTON_GOVERNOR_SELECTED_FROM,
} as const);

export const WASHINGTON_GOVERNOR_HTML_POLICY = Object.freeze({
  maximumResponseBytes: 262_144,
  maximumChunks: 512,
  maximumDomNodes: 10_000,
  maximumDomAttributes: 10_000,
  maximumDomDepth: 64,
  maximumTextCodeUnits: 131_072,
  maximumParseErrors: 16,
  maximumRows: 25,
  maximumTitleCodePoints: 500,
  timeoutMilliseconds: 30_000,
} as const);

export const WASHINGTON_GOVERNOR_TABLE_HEADERS = Object.freeze([
  "Number",
  "Issued Date",
  "Title",
  "Status",
  "Governor",
  "",
] as const);

export const WASHINGTON_GOVERNOR_CELL_CLASSES = Object.freeze([
  "views-field-field-eo-number",
  "views-field-field-date",
  "views-field-field-executive-order-title",
  "views-field-field-eo-status",
  "views-field-field-governor",
  "views-field-edit-node",
] as const);

export const WASHINGTON_GOVERNOR_STATUS_OPTIONS = Object.freeze([
  Object.freeze({ value: "221", label: "Active" } as const),
  Object.freeze({ value: "222", label: "Expired" } as const),
  Object.freeze({ value: "223", label: "Superseded" } as const),
  Object.freeze({ value: "224", label: "Rescinded" } as const),
] as const);

export const WASHINGTON_GOVERNOR_SELECTED_STATUS = "Active" as const;

export const WASHINGTON_GOVERNOR_USER_AGENT =
  "Policy-Sentinel/1.0 (+source-contract; build-time-only)" as const;
