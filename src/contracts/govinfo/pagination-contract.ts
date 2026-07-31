import {
  GOVINFO_CONTRACT_VERSION,
  GOVINFO_QUERY_POLICY,
  GOVINFO_SOURCE_ID,
  GOVINFO_SYNTHETIC_NOTICE,
} from "./constants";
import {
  assertGovInfoRelativeRequest,
  type GovInfoRelativeRequest,
} from "./query-contract";

export const GOVINFO_SYNTHETIC_PAGINATION_KIND =
  "repository_owned_synthetic_pagination" as const;
export const GOVINFO_SYNTHETIC_MAXIMUM_PAGE_COUNT = 1_000 as const;

export interface GovInfoSyntheticPageProjection {
  request: string;
  itemCount: number;
  itemIds: readonly string[];
  nextRequest: string | null;
}

export interface GovInfoSyntheticPaginationProjection {
  contractVersion: typeof GOVINFO_CONTRACT_VERSION;
  fixtureNotice: typeof GOVINFO_SYNTHETIC_NOTICE;
  kind: typeof GOVINFO_SYNTHETIC_PAGINATION_KIND;
  pages: readonly GovInfoSyntheticPageProjection[];
  sourceId: typeof GOVINFO_SOURCE_ID;
}

export interface GovInfoValidatedPaginationTraversal extends GovInfoSyntheticPaginationProjection {
  itemIds: readonly string[];
}

export class GovInfoPaginationContractError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "GovInfoPaginationContractError";
    this.path = path;
  }
}

const SAFE_ITEM_ID_PATTERN = /^[A-Za-z0-9._~-]+$/;
const PROJECTION_KEYS = [
  "contractVersion",
  "fixtureNotice",
  "kind",
  "pages",
  "sourceId",
] as const;
const PAGE_KEYS = ["itemCount", "itemIds", "nextRequest", "request"] as const;

function fail(path: string, message: string): never {
  throw new GovInfoPaginationContractError(path, message);
}

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
    fail(path, "expected a plain repository-owned projection object");
  }
  const keys = Object.keys(value).toSorted();
  const expected = [...expectedKeys].toSorted();
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index])
  ) {
    fail(path, "projection keys changed or include provider-envelope fields");
  }
  return value as Record<string, unknown>;
}

function itemId(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > GOVINFO_QUERY_POLICY.maximumIdentifierLength ||
    !SAFE_ITEM_ID_PATTERN.test(value) ||
    !value.includes("SYNTHETIC") ||
    value === "." ||
    value === ".."
  ) {
    fail(path, "expected a bounded opaque synthetic item ID");
  }
  return value;
}

function requestFingerprint(request: GovInfoRelativeRequest): string {
  return JSON.stringify({
    path: request.resource.path,
    kind: request.resource.kind,
    pageSize: request.options.pageSize,
    collections: request.options.collections ?? null,
  });
}

function paginatedRequest(
  value: unknown,
  path: string,
): GovInfoRelativeRequest {
  let request: GovInfoRelativeRequest;
  try {
    request = assertGovInfoRelativeRequest(value);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid request";
    fail(path, `expected a canonical keyless request: ${detail}`);
  }
  if (!request.resource.paginated) {
    fail(path, "pagination projections accept paginated routes only");
  }
  return request;
}

function pageProjection(
  value: unknown,
  index: number,
): {
  page: GovInfoSyntheticPageProjection;
  request: GovInfoRelativeRequest;
} {
  const path = `$.pages[${index}]`;
  const input = exactPlainObject(value, path, PAGE_KEYS);
  const request = paginatedRequest(input.request, `${path}.request`);
  const pageSize = request.options.pageSize;
  if (pageSize === undefined) {
    fail(`${path}.request`, "canonical paginated request omitted pageSize");
  }
  if (
    typeof input.itemCount !== "number" ||
    !Number.isSafeInteger(input.itemCount) ||
    input.itemCount < 0 ||
    input.itemCount > pageSize
  ) {
    fail(`${path}.itemCount`, "expected an integer no greater than pageSize");
  }
  if (!Array.isArray(input.itemIds)) {
    fail(`${path}.itemIds`, "expected an item-ID array");
  }
  const itemIds = input.itemIds.map((value, itemIndex) =>
    itemId(value, `${path}.itemIds[${itemIndex}]`),
  );
  if (itemIds.length !== input.itemCount) {
    fail(`${path}.itemCount`, "itemCount must equal the item-ID array length");
  }
  if (new Set(itemIds).size !== itemIds.length) {
    fail(`${path}.itemIds`, "duplicate item ID within page");
  }
  if (input.nextRequest !== null && typeof input.nextRequest !== "string") {
    fail(
      `${path}.nextRequest`,
      "expected an explicit canonical request or null",
    );
  }
  return {
    page: {
      request: request.canonicalPathAndQuery,
      itemCount: input.itemCount,
      itemIds,
      nextRequest: input.nextRequest,
    },
    request,
  };
}

export function assertGovInfoSyntheticPaginationTraversal(
  value: unknown,
): GovInfoValidatedPaginationTraversal {
  const input = exactPlainObject(value, "$", PROJECTION_KEYS);
  if (input.contractVersion !== GOVINFO_CONTRACT_VERSION) {
    fail("$.contractVersion", "expected the exact GovInfo contract version");
  }
  if (input.fixtureNotice !== GOVINFO_SYNTHETIC_NOTICE) {
    fail("$.fixtureNotice", "expected the exact synthetic fixture notice");
  }
  if (input.kind !== GOVINFO_SYNTHETIC_PAGINATION_KIND) {
    fail("$.kind", "expected the repository-owned synthetic pagination marker");
  }
  if (input.sourceId !== GOVINFO_SOURCE_ID) {
    fail("$.sourceId", "expected the exact GovInfo source ID");
  }
  if (!Array.isArray(input.pages) || input.pages.length === 0) {
    fail("$.pages", "expected at least one explicit synthetic page");
  }
  if (input.pages.length > GOVINFO_SYNTHETIC_MAXIMUM_PAGE_COUNT) {
    fail("$.pages", "expected at most 1000 repository-owned synthetic pages");
  }

  const parsedPages = input.pages.map((page, index) =>
    pageProjection(page, index),
  );
  const firstCursor = parsedPages[0]?.request.options.offsetMark;
  if (firstCursor !== "*") {
    fail("$.pages[0].request", "first pagination cursor must be *");
  }

  const fingerprint = requestFingerprint(parsedPages[0].request);
  const seenCursors = new Set<string>();
  const seenItemIds = new Set<string>();
  const itemIds: string[] = [];

  parsedPages.forEach(({ page, request }, index) => {
    const cursor = request.options.offsetMark;
    if (cursor === undefined) {
      fail(`$.pages[${index}].request`, "canonical request omitted offsetMark");
    }
    if (requestFingerprint(request) !== fingerprint) {
      fail(`$.pages[${index}].request`, "pagination query fingerprint drifted");
    }
    if (seenCursors.has(cursor)) {
      fail(`$.pages[${index}].request`, "pagination cursor repeated");
    }
    seenCursors.add(cursor);

    for (const id of page.itemIds) {
      if (seenItemIds.has(id)) {
        fail(`$.pages[${index}].itemIds`, "item ID repeated across pages");
      }
      seenItemIds.add(id);
      itemIds.push(id);
    }

    const following = parsedPages[index + 1];
    if (page.nextRequest === null) {
      if (following !== undefined) {
        fail(`$.pages[${index}].nextRequest`, "terminal page has extra pages");
      }
      return;
    }
    if (following === undefined) {
      fail(
        `$.pages[${index}].nextRequest`,
        "nonterminal page is missing its page",
      );
    }

    const nextRequest = paginatedRequest(
      page.nextRequest,
      `$.pages[${index}].nextRequest`,
    );
    if (requestFingerprint(nextRequest) !== fingerprint) {
      fail(
        `$.pages[${index}].nextRequest`,
        "pagination query fingerprint drifted",
      );
    }
    const nextCursor = nextRequest.options.offsetMark;
    if (nextCursor === undefined || nextCursor === cursor) {
      fail(`$.pages[${index}].nextRequest`, "next cursor must change");
    }
    if (seenCursors.has(nextCursor)) {
      fail(`$.pages[${index}].nextRequest`, "pagination cursor repeated");
    }
    if (page.nextRequest !== following.page.request) {
      fail(
        `$.pages[${index}].nextRequest`,
        "next request does not match the following explicit page",
      );
    }
  });

  return {
    contractVersion: GOVINFO_CONTRACT_VERSION,
    fixtureNotice: GOVINFO_SYNTHETIC_NOTICE,
    kind: GOVINFO_SYNTHETIC_PAGINATION_KIND,
    pages: parsedPages.map(({ page }) => page),
    sourceId: GOVINFO_SOURCE_ID,
    itemIds,
  };
}
