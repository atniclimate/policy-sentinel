import {
  REGULATIONS_GOV_CONTRACT_VERSION,
  REGULATIONS_GOV_QUERY_POLICY,
  REGULATIONS_GOV_SOURCE_ID,
  REGULATIONS_GOV_SYNTHETIC_NOTICE,
  REGULATIONS_GOV_SYNTHETIC_PAGINATION_KIND,
} from "./constants";
import { failRegulationsGovContract } from "./errors";
import {
  assertRegulationsGovRelativeRequest,
  type RegulationsGovRelativeRequest,
} from "./query-contract";

export interface RegulationsGovSyntheticPageMetadata {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  numberOfElements: number;
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  firstPage: boolean;
  lastPage: boolean;
}

export interface RegulationsGovSyntheticPageProjection {
  request: string;
  itemIds: readonly string[];
  meta: RegulationsGovSyntheticPageMetadata;
}

export interface RegulationsGovSyntheticPaginationProjection {
  contractVersion: typeof REGULATIONS_GOV_CONTRACT_VERSION;
  fixtureNotice: typeof REGULATIONS_GOV_SYNTHETIC_NOTICE;
  kind: typeof REGULATIONS_GOV_SYNTHETIC_PAGINATION_KIND;
  pages: readonly RegulationsGovSyntheticPageProjection[];
  sourceId: typeof REGULATIONS_GOV_SOURCE_ID;
}

export interface RegulationsGovValidatedPaginationTraversal extends RegulationsGovSyntheticPaginationProjection {
  itemIds: readonly string[];
}

const SAFE_SYNTHETIC_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]*$/;
const PROJECTION_KEYS = [
  "contractVersion",
  "fixtureNotice",
  "kind",
  "pages",
  "sourceId",
] as const;
const PAGE_KEYS = ["request", "itemIds", "meta"] as const;
const META_KEYS = [
  "hasNextPage",
  "hasPreviousPage",
  "numberOfElements",
  "pageNumber",
  "pageSize",
  "totalElements",
  "totalPages",
  "firstPage",
  "lastPage",
] as const;

function exactPlainObject(
  value: unknown,
  path: string,
  expectedKeys: readonly string[],
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    failRegulationsGovContract(
      "invalid_type",
      path,
      "expected a plain repository-owned projection object",
    );
  }
  const keys = Object.keys(value).toSorted();
  const expected = [...expectedKeys].toSorted();
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index])
  ) {
    failRegulationsGovContract(
      "unexpected_field",
      path,
      "projection keys changed or include provider-envelope fields",
    );
  }
  return value as Record<string, unknown>;
}

function boundedInteger(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    failRegulationsGovContract(
      "invalid_value",
      path,
      `expected an integer from ${minimum} through ${maximum}`,
    );
  }
  return value;
}

function exactBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    failRegulationsGovContract("invalid_type", path, "expected a boolean");
  }
  return value;
}

function syntheticItemId(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > REGULATIONS_GOV_QUERY_POLICY.maximumIdentifierLength ||
    !SAFE_SYNTHETIC_ID_PATTERN.test(value) ||
    !value.includes("SYNTHETIC") ||
    value === "." ||
    value === ".."
  ) {
    failRegulationsGovContract(
      "invalid_value",
      path,
      "expected a bounded opaque synthetic item ID",
    );
  }
  return value;
}

function listRequest(
  value: unknown,
  path: string,
): RegulationsGovRelativeRequest {
  let request: RegulationsGovRelativeRequest;
  try {
    request = assertRegulationsGovRelativeRequest(value);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid request";
    failRegulationsGovContract(
      "invalid_url",
      path,
      `expected a canonical keyless list request: ${detail}`,
    );
  }
  if (!request.resource.paginated) {
    failRegulationsGovContract(
      "invalid_value",
      path,
      "pagination projections accept document or docket lists only",
    );
  }
  return request;
}

function parseMetadata(
  value: unknown,
  path: string,
): RegulationsGovSyntheticPageMetadata {
  const source = exactPlainObject(value, path, META_KEYS);
  return {
    hasNextPage: exactBoolean(source.hasNextPage, `${path}.hasNextPage`),
    hasPreviousPage: exactBoolean(
      source.hasPreviousPage,
      `${path}.hasPreviousPage`,
    ),
    numberOfElements: boundedInteger(
      source.numberOfElements,
      `${path}.numberOfElements`,
      0,
      REGULATIONS_GOV_QUERY_POLICY.maximumPageSize,
    ),
    pageNumber: boundedInteger(
      source.pageNumber,
      `${path}.pageNumber`,
      REGULATIONS_GOV_QUERY_POLICY.firstPageNumber,
      REGULATIONS_GOV_QUERY_POLICY.maximumPageNumber,
    ),
    pageSize: boundedInteger(
      source.pageSize,
      `${path}.pageSize`,
      REGULATIONS_GOV_QUERY_POLICY.minimumPageSize,
      REGULATIONS_GOV_QUERY_POLICY.maximumPageSize,
    ),
    totalElements: boundedInteger(
      source.totalElements,
      `${path}.totalElements`,
      0,
      REGULATIONS_GOV_QUERY_POLICY.maximumTotalElements,
    ),
    totalPages: boundedInteger(
      source.totalPages,
      `${path}.totalPages`,
      0,
      REGULATIONS_GOV_QUERY_POLICY.maximumPageNumber,
    ),
    firstPage: exactBoolean(source.firstPage, `${path}.firstPage`),
    lastPage: exactBoolean(source.lastPage, `${path}.lastPage`),
  };
}

function parsePage(
  value: unknown,
  index: number,
): {
  page: RegulationsGovSyntheticPageProjection;
  request: RegulationsGovRelativeRequest;
} {
  const path = `$.pages[${index}]`;
  const source = exactPlainObject(value, path, PAGE_KEYS);
  const request = listRequest(source.request, `${path}.request`);
  const pageSize = request.options.pageSize;
  if (pageSize === undefined) {
    failRegulationsGovContract(
      "missing_field",
      `${path}.request`,
      "canonical list request omitted pageSize",
    );
  }
  if (!Array.isArray(source.itemIds)) {
    failRegulationsGovContract(
      "invalid_type",
      `${path}.itemIds`,
      "expected an item-ID array",
    );
  }
  if (source.itemIds.length > pageSize) {
    failRegulationsGovContract(
      "limit_exceeded",
      `${path}.itemIds`,
      "page contains more item IDs than its requested page size",
    );
  }
  const itemIds = source.itemIds.map((item, itemIndex) =>
    syntheticItemId(item, `${path}.itemIds[${itemIndex}]`),
  );
  if (new Set(itemIds).size !== itemIds.length) {
    failRegulationsGovContract(
      "duplicate_value",
      `${path}.itemIds`,
      "duplicate item ID within page",
    );
  }
  return {
    page: {
      request: request.canonicalPathAndQuery,
      itemIds,
      meta: parseMetadata(source.meta, `${path}.meta`),
    },
    request,
  };
}

function requestFingerprint(request: RegulationsGovRelativeRequest): string {
  const options = request.options;
  return JSON.stringify({
    path: request.resource.path,
    kind: request.resource.kind,
    lastModifiedDateGe: options.lastModifiedDateGe,
    lastModifiedDateLe: options.lastModifiedDateLe,
    pageSize: options.pageSize,
    agencyId: options.agencyId ?? null,
    documentType: options.documentType ?? null,
    docketType: options.docketType ?? null,
    docketId: options.docketId ?? null,
    subtype: options.subtype ?? null,
  });
}

function assertExact(
  actual: unknown,
  expected: unknown,
  path: string,
  message: string,
): void {
  if (actual !== expected) {
    failRegulationsGovContract("inconsistent_value", path, message);
  }
}

function assertZeroResultPolicy(
  parsedPages: readonly {
    page: RegulationsGovSyntheticPageProjection;
    request: RegulationsGovRelativeRequest;
  }[],
): void {
  if (parsedPages.length !== 1) {
    failRegulationsGovContract(
      "inconsistent_value",
      "$.pages",
      "zero-result traversals require exactly one explicit terminal page",
    );
  }
  const entry = parsedPages[0]!;
  const metadata = entry.page.meta;
  assertExact(
    entry.request.options.pageNumber,
    1,
    "$.pages[0].request",
    "zero-result traversal must request page 1",
  );
  assertExact(
    entry.page.itemIds.length,
    0,
    "$.pages[0].itemIds",
    "zero-result traversal must contain no item IDs",
  );
  assertExact(
    metadata.totalPages,
    0,
    "$.pages[0].meta.totalPages",
    "zero-result traversal reports totalPages 0",
  );
  assertExact(
    metadata.pageNumber,
    1,
    "$.pages[0].meta.pageNumber",
    "zero-result metadata must identify requested page 1",
  );
  assertExact(
    metadata.numberOfElements,
    0,
    "$.pages[0].meta.numberOfElements",
    "zero-result page must contain zero elements",
  );
  for (const [key, expected] of [
    ["firstPage", true],
    ["lastPage", true],
    ["hasNextPage", false],
    ["hasPreviousPage", false],
  ] as const) {
    assertExact(
      metadata[key],
      expected,
      `$.pages[0].meta.${key}`,
      "zero-result page flags are inconsistent",
    );
  }
}

export function assertRegulationsGovSyntheticPaginationTraversal(
  value: unknown,
): RegulationsGovValidatedPaginationTraversal {
  const source = exactPlainObject(value, "$", PROJECTION_KEYS);
  assertExact(
    source.contractVersion,
    REGULATIONS_GOV_CONTRACT_VERSION,
    "$.contractVersion",
    "expected the exact Regulations.gov contract version",
  );
  assertExact(
    source.fixtureNotice,
    REGULATIONS_GOV_SYNTHETIC_NOTICE,
    "$.fixtureNotice",
    "expected the exact synthetic fixture notice",
  );
  assertExact(
    source.kind,
    REGULATIONS_GOV_SYNTHETIC_PAGINATION_KIND,
    "$.kind",
    "expected the repository-owned synthetic pagination marker",
  );
  assertExact(
    source.sourceId,
    REGULATIONS_GOV_SOURCE_ID,
    "$.sourceId",
    "expected the exact Regulations.gov source ID",
  );
  if (!Array.isArray(source.pages) || source.pages.length === 0) {
    failRegulationsGovContract(
      "missing_field",
      "$.pages",
      "expected at least one explicit synthetic page",
    );
  }
  if (source.pages.length > REGULATIONS_GOV_QUERY_POLICY.maximumPageNumber) {
    failRegulationsGovContract(
      "limit_exceeded",
      "$.pages",
      "synthetic traversal exceeds the 20-page provider window",
    );
  }

  const parsedPages = source.pages.map((page, index) => parsePage(page, index));
  const first = parsedPages[0]!;
  const firstPageSize = first.request.options.pageSize!;
  const totalElements = first.page.meta.totalElements;
  const totalPages = first.page.meta.totalPages;
  const fingerprint = requestFingerprint(first.request);

  assertExact(
    first.request.options.pageNumber,
    1,
    "$.pages[0].request",
    "synthetic traversal must begin with page 1",
  );

  if (totalElements === 0) {
    assertZeroResultPolicy(parsedPages);
  } else {
    const expectedTotalPages = Math.ceil(totalElements / firstPageSize);
    assertExact(
      totalPages,
      expectedTotalPages,
      "$.pages[0].meta.totalPages",
      "totalPages must equal the complete bounded result count",
    );
    assertExact(
      parsedPages.length,
      totalPages,
      "$.pages",
      "pagination chain is truncated or contains extra pages",
    );
  }

  const seenIds = new Set<string>();
  const itemIds: string[] = [];
  parsedPages.forEach(({ page, request }, index) => {
    const pageNumber = index + 1;
    const metadata = page.meta;
    if (requestFingerprint(request) !== fingerprint) {
      failRegulationsGovContract(
        "inconsistent_value",
        `$.pages[${index}].request`,
        "pagination query fingerprint drifted",
      );
    }
    assertExact(
      request.options.pageNumber,
      pageNumber,
      `$.pages[${index}].request`,
      "page requests must increment by exactly one",
    );
    assertExact(
      metadata.pageNumber,
      pageNumber,
      `$.pages[${index}].meta.pageNumber`,
      "metadata page number disagrees with its request",
    );
    assertExact(
      metadata.pageSize,
      firstPageSize,
      `$.pages[${index}].meta.pageSize`,
      "metadata page size drifted",
    );
    assertExact(
      metadata.totalElements,
      totalElements,
      `$.pages[${index}].meta.totalElements`,
      "totalElements drifted across pages",
    );
    assertExact(
      metadata.totalPages,
      totalPages,
      `$.pages[${index}].meta.totalPages`,
      "totalPages drifted across pages",
    );
    const expectedCount =
      totalElements === 0
        ? 0
        : pageNumber < totalPages
          ? firstPageSize
          : totalElements - firstPageSize * (totalPages - 1);
    assertExact(
      page.itemIds.length,
      expectedCount,
      `$.pages[${index}].itemIds`,
      "page item count is inconsistent with the complete result set",
    );
    assertExact(
      metadata.numberOfElements,
      expectedCount,
      `$.pages[${index}].meta.numberOfElements`,
      "numberOfElements disagrees with the retained item IDs",
    );
    for (const [key, expected] of [
      ["firstPage", pageNumber === 1],
      ["lastPage", totalElements === 0 || pageNumber === totalPages],
      ["hasPreviousPage", pageNumber > 1],
      ["hasNextPage", totalElements > 0 && pageNumber < totalPages],
    ] as const) {
      assertExact(
        metadata[key],
        expected,
        `$.pages[${index}].meta.${key}`,
        "pagination flags disagree with the complete page chain",
      );
    }
    for (const id of page.itemIds) {
      if (seenIds.has(id)) {
        failRegulationsGovContract(
          "duplicate_value",
          `$.pages[${index}].itemIds`,
          "item ID repeated across pages",
        );
      }
      seenIds.add(id);
      itemIds.push(id);
    }
  });

  assertExact(
    itemIds.length,
    totalElements,
    "$.pages",
    "complete page chain does not contain totalElements unique IDs",
  );

  return {
    contractVersion: REGULATIONS_GOV_CONTRACT_VERSION,
    fixtureNotice: REGULATIONS_GOV_SYNTHETIC_NOTICE,
    kind: REGULATIONS_GOV_SYNTHETIC_PAGINATION_KIND,
    pages: parsedPages.map(({ page }) => page),
    sourceId: REGULATIONS_GOV_SOURCE_ID,
    itemIds,
  };
}
