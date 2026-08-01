import { Buffer } from "node:buffer";

import { sourceDerivedLeafPointers } from "../../pipeline/policy-validation.mjs";
import type {
  FieldProvenance,
  PolicyRecord,
  SourceConfig,
} from "../../shared/contracts";
import {
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_ID,
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_VERSION,
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_IDENTITY_RULE,
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_SOURCE_ID,
  WASHINGTON_GOVERNOR_FILTER_LABEL,
  WASHINGTON_GOVERNOR_HTML_POLICY,
  WASHINGTON_GOVERNOR_SELECTED_FROM,
  WASHINGTON_GOVERNOR_SELECTED_STATUS,
} from "./constants";
import type { WashingtonGovernorExecutiveOrder } from "./response-contract";
import {
  assertWashingtonGovernorExecutiveOrderProjection,
  washingtonGovernorSourceRecordId,
} from "./response-contract";

const ISSUED_DATE_RULE = "washington-governor-issued-date-to-record-date-v1";
const PDF_URL_RULE = "washington-governor-relative-pdf-href-to-absolute-url-v1";
const DOCUMENT_TYPE_RULE = "washington-governor-executive-action-type-v1";
const STATUS_RULE = "washington-governor-source-status-preservation-v1";
const GENERAL_JURISDICTION_RULE = "washington-governor-general-jurisdiction-v1";
const RECORD_POLICY_RULE =
  "washington-governor-executive-order-record-policy-v1";
const REPRODUCTION_BASIS =
  "Metadata from the selected Governor index and an exact official PDF link only; no page or order body is reproduced.";
const SELECTED_COVERAGE_NOTES =
  "Selected Bob Ferguson filter value 220 using the provider all-status filter; contract 1.0 accepts only exact Active rows on one validated page with a 25-row cap and metadata-and-links-only records from 2025-01-15. This does not claim historical or all-active-order completeness.";

const REVIEWED_SOURCE = {
  id: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_SOURCE_ID,
  name: "Washington Governor Executive Orders",
  provider: "Office of the Governor, State of Washington",
  synthetic: false,
  enabled: true,
  adapter: {
    id: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_ID,
    version: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_VERSION,
    module: "src/adapters/washington-governor-executive-orders/index.ts",
    identityRule: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_IDENTITY_RULE,
  },
  jurisdiction: {
    level: "state",
    name: "Washington",
    stateCode: "WA",
  },
  access: {
    method: "official_index",
    officialDocumentationUrl:
      "https://governor.wa.gov/office-governor/office/official-actions/executive-orders",
    accessedOn: "2026-07-31",
    allowedHosts: ["governor.wa.gov"],
    authentication: "none",
    rateLimit:
      "No numeric request limit, quota, pagination contract, response-size bound, retry rule, SLA, checksum, or change-notification contract was published. A first build-time adapter must use the exact Bob Ferguson filter value 220 under repository-owned byte, row, and time ceilings and must fail closed if it unexpectedly paginates or its structure drifts.",
    browserRuntimeAllowed: false,
  },
  coverage: {
    from: "1918-11-27",
    through: null,
    cadence:
      "No publisher cadence or publication schedule was documented; Policy Sentinel would check weekly and build-time only.",
    limitations:
      "The coverage start is the earliest row observed in the explicit All-governors/All-statuses view, not a completeness guarantee. That view exposed 534 rows over 22 pages from 1918-11-27 through 2026-06-25 but has no stable HTML, filter-ID, pagination, status-history, correction, or supersession contract. The first selected adapter scope is the exact Bob Ferguson filter value 220 only, beginning with order 25-01 on 2025-01-15, and cannot claim historical or all-active-order completeness.",
  },
  publication: {
    attribution: "Office of the Governor, State of Washington",
    termsUrl: "https://governor.wa.gov/privacy-notice",
    reproduction: "metadata_and_links",
    failureMode: "last_known_good",
    requiredProvenancePointers: [
      "/officialTitle",
      "/sourceDocumentIdentifier",
      "/documentType",
      "/jurisdiction/name",
      "/status/sourceLabel",
      "/urls/officialSource",
    ],
  },
  officialSubjectMappings: [],
} as const;

type ProvenanceSpec = Pick<
  FieldProvenance,
  "sourcePath" | "transformation" | "transformRuleId"
>;

export interface WashingtonGovernorNormalizationInput {
  source: SourceConfig;
  retrievedAt: string;
  coverageThrough: string;
  rowIndex: number;
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableJson(value: unknown): string {
  const result = JSON.stringify(value, (_key, nested) => {
    if (
      nested === null ||
      typeof nested !== "object" ||
      Array.isArray(nested)
    ) {
      return nested;
    }
    return Object.fromEntries(
      Object.entries(nested as Record<string, unknown>).sort(
        ([left], [right]) => compareCodeUnits(left, right),
      ),
    );
  });
  if (result === undefined) {
    throw new Error(
      "Washington Governor executive-order value is not JSON-serializable.",
    );
  }
  return result;
}

function assertIsoDate(value: string, label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new Error(
      `Washington Governor executive-order ${label} is not an ISO date.`,
    );
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(
      `Washington Governor executive-order ${label} is not a real date.`,
    );
  }
  return value;
}

function assertIsoDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(
      "Washington Governor executive-order retrieval time must be a normalized UTC timestamp.",
    );
  }
  return value;
}

export function assertWashingtonGovernorExecutiveOrdersSourceConfig(
  source: SourceConfig,
): NonNullable<SourceConfig["adapter"]> {
  if (stableJson(source) !== stableJson(REVIEWED_SOURCE)) {
    throw new Error(
      "Washington Governor executive-order source configuration differs from the reviewed enabled runtime contract.",
    );
  }
  return source.adapter as NonNullable<SourceConfig["adapter"]>;
}

export function washingtonGovernorExecutiveOrderStableRecordId(
  row: Pick<WashingtonGovernorExecutiveOrder, "number" | "issuedDate">,
): string {
  const sourceRecordId = washingtonGovernorSourceRecordId(row);
  return `psr:${WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_SOURCE_ID}:${Buffer.from(
    sourceRecordId,
    "utf8",
  ).toString("base64url")}`;
}

function rowSpecs(rowIndex: number): Map<string, ProvenanceSpec> {
  const rowPath = `$.rows[${rowIndex}]`;
  return new Map<string, ProvenanceSpec>([
    [
      "/officialTitle",
      {
        sourcePath: `${rowPath}.title`,
        transformation: "copied",
        transformRuleId: null,
      },
    ],
    [
      "/sourceDocumentIdentifier",
      {
        sourcePath: `${rowPath}.number`,
        transformation: "copied",
        transformRuleId: null,
      },
    ],
    [
      "/documentType",
      {
        sourcePath: "$adapterPolicy.documentType",
        transformation: "deterministic_mapping",
        transformRuleId: DOCUMENT_TYPE_RULE,
      },
    ],
    [
      "/jurisdiction/level",
      {
        sourcePath:
          "$sourceRegistry.sources[washington-governor-executive-orders].jurisdiction.level",
        transformation: "copied",
        transformRuleId: null,
      },
    ],
    [
      "/jurisdiction/name",
      {
        sourcePath:
          "$sourceRegistry.sources[washington-governor-executive-orders].jurisdiction.name",
        transformation: "copied",
        transformRuleId: null,
      },
    ],
    [
      "/jurisdiction/stateCode",
      {
        sourcePath:
          "$sourceRegistry.sources[washington-governor-executive-orders].jurisdiction.stateCode",
        transformation: "copied",
        transformRuleId: null,
      },
    ],
    [
      "/jurisdiction/generalJurisdictionOnly",
      {
        sourcePath: "$adapterPolicy.generalJurisdictionOnly",
        transformation: "deterministic_mapping",
        transformRuleId: GENERAL_JURISDICTION_RULE,
      },
    ],
    [
      "/issuingBodies/0/officialName",
      {
        sourcePath:
          "$sourceRegistry.sources[washington-governor-executive-orders].provider",
        transformation: "copied",
        transformRuleId: null,
      },
    ],
    [
      "/status/normalized",
      {
        sourcePath: `${rowPath}.sourceStatus`,
        transformation: "deterministic_mapping",
        transformRuleId: STATUS_RULE,
      },
    ],
    [
      "/status/sourceLabel",
      {
        sourcePath: `${rowPath}.sourceStatus`,
        transformation: "copied",
        transformRuleId: null,
      },
    ],
    [
      "/status/asOf",
      {
        sourcePath: "$retrieval.retrievedAt",
        transformation: "combined",
        transformRuleId: STATUS_RULE,
      },
    ],
    [
      "/dates/published",
      {
        sourcePath: `${rowPath}.issuedDateSourceText`,
        transformation: "normalized",
        transformRuleId: ISSUED_DATE_RULE,
      },
    ],
    [
      "/urls/officialSource",
      {
        sourcePath: "$request.url",
        transformation: "copied",
        transformRuleId: null,
      },
    ],
    [
      "/urls/officialFullText",
      {
        sourcePath: `$view.table.rows[${rowIndex}].cells[2].a[0].@href`,
        transformation: "normalized",
        transformRuleId: PDF_URL_RULE,
      },
    ],
    [
      "/actionHistory/0/date",
      {
        sourcePath: `${rowPath}.issuedDateSourceText`,
        transformation: "normalized",
        transformRuleId: ISSUED_DATE_RULE,
      },
    ],
    [
      "/actionHistory/0/sourceLabel",
      {
        sourcePath: "$view.table.headers[1]",
        transformation: "copied",
        transformRuleId: null,
      },
    ],
    [
      "/actionHistory/0/sourceUrl",
      {
        sourcePath: "$request.url",
        transformation: "copied",
        transformRuleId: null,
      },
    ],
    [
      "/isUnclassified",
      {
        sourcePath: "$adapterPolicy.isUnclassified",
        transformation: "deterministic_mapping",
        transformRuleId: RECORD_POLICY_RULE,
      },
    ],
    [
      "/relevance/0/basis",
      {
        sourcePath: "$adapterPolicy.relevance.basis",
        transformation: "deterministic_mapping",
        transformRuleId: GENERAL_JURISDICTION_RULE,
      },
    ],
    [
      "/relevance/0/label",
      {
        sourcePath: "$adapterPolicy.relevance.label",
        transformation: "deterministic_mapping",
        transformRuleId: GENERAL_JURISDICTION_RULE,
      },
    ],
    [
      "/relevance/0/sourceUrl",
      {
        sourcePath: "$request.url",
        transformation: "copied",
        transformRuleId: null,
      },
    ],
    [
      "/relevance/0/evidence",
      {
        sourcePath: "$adapterPolicy.relevance.evidence",
        transformation: "deterministic_mapping",
        transformRuleId: GENERAL_JURISDICTION_RULE,
      },
    ],
    [
      "/landmark/isLandmark",
      {
        sourcePath: "$adapterPolicy.landmark",
        transformation: "deterministic_mapping",
        transformRuleId: RECORD_POLICY_RULE,
      },
    ],
    [
      "/historical/isHistorical",
      {
        sourcePath: "$adapterPolicy.historical",
        transformation: "deterministic_mapping",
        transformRuleId: RECORD_POLICY_RULE,
      },
    ],
    [
      "/historical/pre1980Treatment",
      {
        sourcePath: "$adapterPolicy.historical",
        transformation: "deterministic_mapping",
        transformRuleId: RECORD_POLICY_RULE,
      },
    ],
  ]);
}

function provenanceEntries(
  record: PolicyRecord,
  rowIndex: number,
  retrievedAt: string,
): FieldProvenance[] {
  const specs = rowSpecs(rowIndex);
  const pointers = sourceDerivedLeafPointers(record);
  if (
    pointers.length !== specs.size ||
    pointers.some((pointer) => !specs.has(pointer))
  ) {
    throw new Error(
      "Washington Governor executive-order provenance projection is incomplete.",
    );
  }
  return pointers
    .map((field) => {
      const spec = specs.get(field);
      if (spec === undefined) {
        throw new Error(
          "Washington Governor executive-order provenance specification is missing.",
        );
      }
      return {
        field,
        ...spec,
        sourceId: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_SOURCE_ID,
        sourceRecordId: record.source.recordId,
        sourceUrl: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
        retrievedAt,
        sourceUpdatedAt: null,
        adapterId: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_ID,
        validationState: "validated",
      } satisfies FieldProvenance;
    })
    .sort((left, right) => compareCodeUnits(left.field, right.field));
}

export function normalizeWashingtonGovernorExecutiveOrder(
  row: Readonly<WashingtonGovernorExecutiveOrder>,
  input: WashingtonGovernorNormalizationInput,
): PolicyRecord {
  const adapter = assertWashingtonGovernorExecutiveOrdersSourceConfig(
    input.source,
  );
  const retrievedAt = assertIsoDateTime(input.retrievedAt);
  const coverageThrough = assertIsoDate(input.coverageThrough, "coverage end");
  const validatedRow = assertWashingtonGovernorExecutiveOrderProjection(
    row,
    coverageThrough,
  );
  if (
    coverageThrough < WASHINGTON_GOVERNOR_SELECTED_FROM ||
    coverageThrough > retrievedAt.slice(0, 10) ||
    validatedRow.sourceStatus !== WASHINGTON_GOVERNOR_SELECTED_STATUS ||
    validatedRow.governor !== WASHINGTON_GOVERNOR_FILTER_LABEL ||
    !Number.isSafeInteger(input.rowIndex) ||
    input.rowIndex < 0 ||
    input.rowIndex >= WASHINGTON_GOVERNOR_HTML_POLICY.maximumRows
  ) {
    throw new Error(
      "Washington Governor executive-order row differs from the reviewed normalization scope.",
    );
  }

  const sourceRecordId = washingtonGovernorSourceRecordId(validatedRow);
  const record: PolicyRecord = {
    schemaVersion: "1.3.0",
    internalId: washingtonGovernorExecutiveOrderStableRecordId(validatedRow),
    source: {
      id: input.source.id,
      name: input.source.name,
      provider: input.source.provider,
      recordId: sourceRecordId,
      adapterId: adapter.id,
      adapterVersion: adapter.version,
      coverage: {
        from: WASHINGTON_GOVERNOR_SELECTED_FROM,
        through: coverageThrough,
        notes: SELECTED_COVERAGE_NOTES,
      },
      attribution: input.source.publication.attribution,
    },
    officialTitle: validatedRow.title,
    sourceDocumentIdentifier: validatedRow.number,
    documentType: "executive_action",
    jurisdiction: {
      ...input.source.jurisdiction,
      generalJurisdictionOnly: true,
    },
    issuingBodies: [
      {
        sourceId: null,
        officialName: "Office of the Governor, State of Washington",
      },
    ],
    legislativeContext: null,
    judicialContext: null,
    status: {
      normalized: "unknown",
      sourceLabel: validatedRow.sourceStatus,
      asOf: retrievedAt,
    },
    dates: {
      introduced: null,
      published: validatedRow.issuedDate,
      updated: null,
      lastAction: null,
      deadline: null,
      effective: null,
      retrieved: retrievedAt,
    },
    urls: {
      officialSource: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
      officialFullText: validatedRow.officialPdfUrl,
    },
    texts: {
      officialSummary: null,
      sourceExcerpt: null,
      detailAsset: {
        availability: "official_link_only",
        path: null,
        reproductionBasis: REPRODUCTION_BASIS,
      },
    },
    sponsors: [],
    committees: [],
    actionHistory: [
      {
        date: validatedRow.issuedDate,
        sourceLabel: "Issued Date",
        sourceUrl: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
      },
    ],
    statusHistory: [],
    sourceDocumentRelationships: [],
    officialSubjects: [],
    taxonomyMemberships: [],
    isUnclassified: true,
    relevance: [
      {
        basis: "general_jurisdiction",
        label: "General Washington jurisdiction — not Nation-specific",
        sourceUrl: WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
        evidence:
          "No separately validated exact named-Nation relationship evidence was established for this record; no association was inferred from title text.",
      },
    ],
    nationAssociations: [],
    landmark: { isLandmark: false },
    historical: {
      isHistorical: false,
      pre1980Treatment: "not_applicable",
    },
    dataQuality: {
      state: "validated",
      validatedAt: retrievedAt,
      validator: `${WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_ID}@${WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_VERSION}`,
      issues: [],
    },
    sourceHealth: {
      status: "healthy",
      checkedAt: retrievedAt,
      dataAsOf: retrievedAt,
      lastSuccessfulRetrievalAt: retrievedAt,
      usingLastKnownGood: false,
      message: null,
    },
    change: {
      firstSeenAt: retrievedAt,
      lastSeenAt: retrievedAt,
      kind: "new",
      urgentAlert: null,
    },
    aiSummary: {
      exists: false,
      label: "AI-generated source summary",
    },
    fieldProvenance: [],
  };
  record.fieldProvenance = provenanceEntries(
    record,
    input.rowIndex,
    retrievedAt,
  );
  return record;
}

export const WASHINGTON_GOVERNOR_NORMALIZATION_RULES = Object.freeze({
  issuedDate: ISSUED_DATE_RULE,
  pdfUrl: PDF_URL_RULE,
  documentType: DOCUMENT_TYPE_RULE,
  status: STATUS_RULE,
  generalJurisdiction: GENERAL_JURISDICTION_RULE,
  recordPolicy: RECORD_POLICY_RULE,
} as const);
