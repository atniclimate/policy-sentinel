import { describe, expect, it } from "vitest";

import {
  REGULATIONS_GOV_CONTRACT_VERSION,
  REGULATIONS_GOV_SOURCE_ID,
  REGULATIONS_GOV_SYNTHETIC_NOTICE,
  REGULATIONS_GOV_SYNTHETIC_PAGINATION_KIND,
} from "../../../src/contracts/regulations-gov/constants";
import { RegulationsGovContractError } from "../../../src/contracts/regulations-gov/errors";
import { assertRegulationsGovSyntheticPaginationTraversal } from "../../../src/contracts/regulations-gov/pagination-contract";
import { buildRegulationsGovRelativeRequest } from "../../../src/contracts/regulations-gov/query-contract";

interface MutableMetadata {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  numberOfElements: number;
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  firstPage: boolean;
  lastPage: boolean;
  [key: string]: unknown;
}

interface MutablePage {
  request: string;
  itemIds: string[];
  meta: MutableMetadata;
  [key: string]: unknown;
}

interface MutableProjection {
  contractVersion: string;
  fixtureNotice: string;
  kind: string;
  sourceId: string;
  pages: MutablePage[];
  [key: string]: unknown;
}

const listWindow = {
  lastModifiedDateGe: "3785-01-01 00:00:00",
  lastModifiedDateLe: "3785-01-31 23:59:59",
} as const;

function documentRequest(
  pageNumber: number,
  agencyId = "EPA",
  pageSize = 5,
): string {
  return buildRegulationsGovRelativeRequest("/v4/documents", {
    ...listWindow,
    pageNumber,
    pageSize,
    agencyId,
    documentType: "Rule",
  }).canonicalPathAndQuery;
}

function docketRequest(pageNumber: number, pageSize = 5): string {
  return buildRegulationsGovRelativeRequest("/v4/dockets", {
    ...listWindow,
    pageNumber,
    pageSize,
    agencyId: "GSA",
    docketType: "Rulemaking",
  }).canonicalPathAndQuery;
}

function metadata(
  pageNumber: number,
  totalElements: number,
  totalPages: number,
  pageSize = 5,
): MutableMetadata {
  const numberOfElements =
    totalElements === 0
      ? 0
      : pageNumber < totalPages
        ? pageSize
        : totalElements - pageSize * (totalPages - 1);
  return {
    hasNextPage: totalElements > 0 && pageNumber < totalPages,
    hasPreviousPage: pageNumber > 1,
    numberOfElements,
    pageNumber,
    pageSize,
    totalElements,
    totalPages,
    firstPage: pageNumber === 1,
    lastPage: totalElements === 0 || pageNumber === totalPages,
  };
}

function twoPageProjection(): MutableProjection {
  return {
    contractVersion: REGULATIONS_GOV_CONTRACT_VERSION,
    fixtureNotice: REGULATIONS_GOV_SYNTHETIC_NOTICE,
    kind: REGULATIONS_GOV_SYNTHETIC_PAGINATION_KIND,
    sourceId: REGULATIONS_GOV_SOURCE_ID,
    pages: [
      {
        request: documentRequest(1),
        itemIds: [
          "EPA-SYNTHETIC-DOCUMENT-0001",
          "EPA-SYNTHETIC-DOCUMENT-0002",
          "EPA-SYNTHETIC-DOCUMENT-0003",
          "EPA-SYNTHETIC-DOCUMENT-0004",
          "EPA-SYNTHETIC-DOCUMENT-0005",
        ],
        meta: metadata(1, 7, 2),
      },
      {
        request: documentRequest(2),
        itemIds: ["EPA-SYNTHETIC-DOCUMENT-0006", "EPA-SYNTHETIC-DOCUMENT-0007"],
        meta: metadata(2, 7, 2),
      },
    ],
  };
}

function clone(value: MutableProjection): MutableProjection {
  return structuredClone(value);
}

describe("Regulations.gov repository-owned synthetic pagination contract", () => {
  it("validates a complete stable document traversal", () => {
    const parsed =
      assertRegulationsGovSyntheticPaginationTraversal(twoPageProjection());

    expect(parsed.itemIds).toEqual([
      "EPA-SYNTHETIC-DOCUMENT-0001",
      "EPA-SYNTHETIC-DOCUMENT-0002",
      "EPA-SYNTHETIC-DOCUMENT-0003",
      "EPA-SYNTHETIC-DOCUMENT-0004",
      "EPA-SYNTHETIC-DOCUMENT-0005",
      "EPA-SYNTHETIC-DOCUMENT-0006",
      "EPA-SYNTHETIC-DOCUMENT-0007",
    ]);
    expect(parsed.pages.map(({ meta }) => meta.pageNumber)).toEqual([1, 2]);
    expect(parsed.pages.at(-1)?.meta).toMatchObject({
      hasNextPage: false,
      lastPage: true,
      numberOfElements: 2,
      totalElements: 7,
      totalPages: 2,
    });
  });

  it("validates a complete one-page docket traversal", () => {
    const parsed = assertRegulationsGovSyntheticPaginationTraversal({
      contractVersion: REGULATIONS_GOV_CONTRACT_VERSION,
      fixtureNotice: REGULATIONS_GOV_SYNTHETIC_NOTICE,
      kind: REGULATIONS_GOV_SYNTHETIC_PAGINATION_KIND,
      sourceId: REGULATIONS_GOV_SOURCE_ID,
      pages: [
        {
          request: docketRequest(1),
          itemIds: ["GSA-SYNTHETIC-DOCKET-0001", "GSA-SYNTHETIC-DOCKET-0002"],
          meta: metadata(1, 2, 1),
        },
      ],
    });

    expect(parsed.itemIds).toEqual([
      "GSA-SYNTHETIC-DOCKET-0001",
      "GSA-SYNTHETIC-DOCKET-0002",
    ]);
  });

  it("uses one explicit terminal page for a zero-result window", () => {
    const parsed = assertRegulationsGovSyntheticPaginationTraversal({
      contractVersion: REGULATIONS_GOV_CONTRACT_VERSION,
      fixtureNotice: REGULATIONS_GOV_SYNTHETIC_NOTICE,
      kind: REGULATIONS_GOV_SYNTHETIC_PAGINATION_KIND,
      sourceId: REGULATIONS_GOV_SOURCE_ID,
      pages: [
        {
          request: documentRequest(1),
          itemIds: [],
          meta: metadata(1, 0, 0),
        },
      ],
    });

    expect(parsed.itemIds).toEqual([]);
    expect(parsed.pages[0]?.meta).toEqual({
      hasNextPage: false,
      hasPreviousPage: false,
      numberOfElements: 0,
      pageNumber: 1,
      pageSize: 5,
      totalElements: 0,
      totalPages: 0,
      firstPage: true,
      lastPage: true,
    });
  });

  it("requires exact synthetic provenance and rejects provider-envelope fields", () => {
    for (const [key, value] of [
      ["contractVersion", "changed"],
      ["fixtureNotice", "Regulations.gov response"],
      ["kind", "provider_page"],
      ["sourceId", "changed"],
    ] as const) {
      const changed = clone(twoPageProjection());
      changed[key] = value;
      expect(
        () => assertRegulationsGovSyntheticPaginationTraversal(changed),
        key,
      ).toThrowError(/exact|repository-owned/);
    }

    const providerTopLevel = clone(twoPageProjection());
    providerTopLevel.data = [];
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(providerTopLevel),
    ).toThrowError(/provider-envelope fields/);

    const providerPage = clone(twoPageProjection());
    providerPage.pages[0]!.next = "/v4/documents?page[number]=2";
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(providerPage),
    ).toThrowError(/provider-envelope fields/);

    const providerMetadata = clone(twoPageProjection());
    providerMetadata.pages[0]!.meta.rateLimit = 1000;
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(providerMetadata),
    ).toThrowError(/provider-envelope fields/);
  });

  it("rejects non-synthetic, malformed, within-page, and cross-page duplicate IDs", () => {
    const cases = [
      ["EPA-DOCUMENT-0001", /synthetic item ID/],
      ["EPA-SYNTHETIC-DOCUMENT/0001", /synthetic item ID/],
    ] as const;
    for (const [itemId, expected] of cases) {
      const changed = clone(twoPageProjection());
      changed.pages[0]!.itemIds[0] = itemId;
      expect(() =>
        assertRegulationsGovSyntheticPaginationTraversal(changed),
      ).toThrowError(expected);
    }

    const within = clone(twoPageProjection());
    within.pages[0]!.itemIds[1] = within.pages[0]!.itemIds[0]!;
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(within),
    ).toThrowError(/duplicate item ID within page/);

    const across = clone(twoPageProjection());
    across.pages[1]!.itemIds[0] = across.pages[0]!.itemIds[0]!;
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(across),
    ).toThrowError(/repeated across pages/);
  });

  it("rejects credential, relevance, duplicate, and noncanonical page requests", () => {
    for (const suffix of [
      "&api_key=synthetic",
      "&filter%5BsearchTerm%5D=Nation",
      "&page%5Bnumber%5D=2",
    ]) {
      const changed = clone(twoPageProjection());
      changed.pages[1]!.request += suffix;
      expect(
        () => assertRegulationsGovSyntheticPaginationTraversal(changed),
        suffix,
      ).toThrowError(/canonical keyless list request/);
    }
  });

  it("rejects route, date, agency, type, and page-size query drift", () => {
    const driftedRequests = [
      documentRequest(2, "GSA"),
      buildRegulationsGovRelativeRequest("/v4/documents", {
        ...listWindow,
        lastModifiedDateLe: "3785-02-01 00:00:00",
        pageNumber: 2,
        pageSize: 5,
        agencyId: "EPA",
        documentType: "Rule",
      }).canonicalPathAndQuery,
      buildRegulationsGovRelativeRequest("/v4/documents", {
        ...listWindow,
        pageNumber: 2,
        pageSize: 5,
        agencyId: "EPA",
        documentType: "Notice",
      }).canonicalPathAndQuery,
      documentRequest(2, "EPA", 6),
      buildRegulationsGovRelativeRequest("/v4/dockets", {
        ...listWindow,
        pageNumber: 2,
        pageSize: 5,
        agencyId: "EPA",
        docketType: "Rulemaking",
      }).canonicalPathAndQuery,
    ];

    for (const request of driftedRequests) {
      const changed = clone(twoPageProjection());
      changed.pages[1]!.request = request;
      expect(() =>
        assertRegulationsGovSyntheticPaginationTraversal(changed),
      ).toThrowError(/fingerprint drifted/);
    }
  });

  it("requires exact page-number increments from page one", () => {
    const startsLate = clone(twoPageProjection());
    startsLate.pages[0]!.request = documentRequest(2);
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(startsLate),
    ).toThrowError(/begin with page 1/);

    const skips = clone(twoPageProjection());
    skips.pages[1]!.request = documentRequest(3);
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(skips),
    ).toThrowError(/increment by exactly one/);

    const detail = clone(twoPageProjection());
    detail.pages[0]!.request = "/v4/documents/EPA-SYNTHETIC-DOCUMENT-0001";
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(detail),
    ).toThrowError(/document or docket lists only/);
  });

  it("rejects truncated and extra page chains", () => {
    const truncated = clone(twoPageProjection());
    truncated.pages.pop();
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(truncated),
    ).toThrowError(/truncated or contains extra pages/);

    const extra = clone(twoPageProjection());
    extra.pages.push({
      request: documentRequest(3),
      itemIds: [],
      meta: metadata(3, 7, 2),
    });
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(extra),
    ).toThrowError(/truncated or contains extra pages/);
  });

  it("rejects page counts and totals outside the provider window", () => {
    const tooManyElements = clone(twoPageProjection());
    tooManyElements.pages[0]!.meta.totalElements = 5001;
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(tooManyElements),
    ).toThrowError(/0 through 5000/);

    const tooManyPages = clone(twoPageProjection());
    tooManyPages.pages[0]!.meta.totalPages = 21;
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(tooManyPages),
    ).toThrowError(/0 through 20/);

    const inconsistentTotal = clone(twoPageProjection());
    inconsistentTotal.pages[0]!.meta.totalPages = 3;
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(inconsistentTotal),
    ).toThrowError(/complete bounded result count/);
  });

  it("rejects metadata, count, and flag contradictions", () => {
    const mutations: Array<(value: MutableProjection) => void> = [
      (value) => (value.pages[0]!.meta.pageSize = 6),
      (value) => (value.pages[1]!.meta.totalElements = 8),
      (value) => (value.pages[1]!.meta.totalPages = 3),
      (value) => (value.pages[0]!.meta.hasPreviousPage = true),
      (value) => (value.pages[1]!.meta.hasNextPage = true),
      (value) => (value.pages[1]!.meta.lastPage = false),
      (value) => (value.pages[1]!.meta.numberOfElements = 1),
      (value) => value.pages[1]!.itemIds.pop(),
    ];

    for (const mutate of mutations) {
      const changed = clone(twoPageProjection());
      mutate(changed);
      expect(() =>
        assertRegulationsGovSyntheticPaginationTraversal(changed),
      ).toThrowError(/drifted|disagrees|inconsistent|complete result set/);
    }
  });

  it("rejects every malformed zero-result representation", () => {
    const base: MutableProjection = {
      contractVersion: REGULATIONS_GOV_CONTRACT_VERSION,
      fixtureNotice: REGULATIONS_GOV_SYNTHETIC_NOTICE,
      kind: REGULATIONS_GOV_SYNTHETIC_PAGINATION_KIND,
      sourceId: REGULATIONS_GOV_SOURCE_ID,
      pages: [
        {
          request: documentRequest(1),
          itemIds: [],
          meta: metadata(1, 0, 0),
        },
      ],
    };

    const noPage = clone(base);
    noPage.pages = [];
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(noPage),
    ).toThrowError(/at least one explicit synthetic page/);

    const wrongTotalPages = clone(base);
    wrongTotalPages.pages[0]!.meta.totalPages = 1;
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(wrongTotalPages),
    ).toThrowError(/reports totalPages 0/);

    const containsItem = clone(base);
    containsItem.pages[0]!.itemIds = ["EPA-SYNTHETIC-DOCUMENT-0001"];
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(containsItem),
    ).toThrowError(/contain no item IDs/);

    const nonterminal = clone(base);
    nonterminal.pages[0]!.meta.hasNextPage = true;
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(nonterminal),
    ).toThrowError(/zero-result page flags/);

    const extraPage = clone(base);
    extraPage.pages.push({
      request: documentRequest(2),
      itemIds: [],
      meta: metadata(2, 0, 0),
    });
    expect(() =>
      assertRegulationsGovSyntheticPaginationTraversal(extraPage),
    ).toThrowError(/exactly one explicit terminal page/);
  });

  it("exposes typed failures with stable field paths", () => {
    const changed = clone(twoPageProjection());
    changed.pages[0]!.itemIds[0] = "NOT-SYNTHETIC?";

    try {
      assertRegulationsGovSyntheticPaginationTraversal(changed);
      throw new Error("expected parsing to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(RegulationsGovContractError);
      expect(error).toMatchObject({
        code: "invalid_value",
        path: "$.pages[0].itemIds[0]",
      });
    }
  });
});
