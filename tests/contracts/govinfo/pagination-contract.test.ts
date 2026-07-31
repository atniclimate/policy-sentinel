import { describe, expect, it } from "vitest";

import {
  assertGovInfoSyntheticPaginationTraversal,
  GOVINFO_SYNTHETIC_MAXIMUM_PAGE_COUNT,
  GOVINFO_SYNTHETIC_PAGINATION_KIND,
  type GovInfoSyntheticPaginationProjection,
} from "../../../src/contracts/govinfo/pagination-contract";
import {
  GOVINFO_CONTRACT_VERSION,
  GOVINFO_SOURCE_ID,
  GOVINFO_SYNTHETIC_NOTICE,
} from "../../../src/contracts/govinfo/constants";

const firstRequest =
  "/collections/BILLS/3785-01-01T00:00:00Z/3785-12-31T23:59:59Z?offsetMark=*&pageSize=2";
const secondRequest =
  "/collections/BILLS/3785-01-01T00:00:00Z/3785-12-31T23:59:59Z?offsetMark=SYNTHETIC-CURSOR-2&pageSize=2";

function twoPageProjection() {
  return {
    contractVersion: GOVINFO_CONTRACT_VERSION,
    fixtureNotice: GOVINFO_SYNTHETIC_NOTICE,
    kind: GOVINFO_SYNTHETIC_PAGINATION_KIND,
    sourceId: GOVINFO_SOURCE_ID,
    pages: [
      {
        request: firstRequest,
        itemCount: 2,
        itemIds: [
          "BILLS-999hrSYNTHETIC900001ih",
          "BILLS-999hrSYNTHETIC900002ih",
        ],
        nextRequest: secondRequest,
      },
      {
        request: secondRequest,
        itemCount: 1,
        itemIds: ["BILLS-999hrSYNTHETIC900003ih"],
        nextRequest: null,
      },
    ],
  } satisfies GovInfoSyntheticPaginationProjection;
}

describe("GovInfo repository-owned synthetic pagination contract", () => {
  it("validates an explicit collection traversal and exact item IDs", () => {
    const traversal =
      assertGovInfoSyntheticPaginationTraversal(twoPageProjection());

    expect(traversal.itemIds).toEqual([
      "BILLS-999hrSYNTHETIC900001ih",
      "BILLS-999hrSYNTHETIC900002ih",
      "BILLS-999hrSYNTHETIC900003ih",
    ]);
    expect(traversal.pages.at(-1)?.nextRequest).toBeNull();
  });

  it("supports a terminal synthetic granule-list page", () => {
    const traversal = assertGovInfoSyntheticPaginationTraversal({
      contractVersion: GOVINFO_CONTRACT_VERSION,
      fixtureNotice: GOVINFO_SYNTHETIC_NOTICE,
      kind: GOVINFO_SYNTHETIC_PAGINATION_KIND,
      sourceId: GOVINFO_SOURCE_ID,
      pages: [
        {
          request: "/packages/FR-3785-01-02/granules?offsetMark=*&pageSize=2",
          itemCount: 2,
          itemIds: ["SYNTHETIC-FR-3785-00001", "SYNTHETIC-FR-3785-00002"],
          nextRequest: null,
        },
      ],
    });

    expect(traversal.itemIds).toHaveLength(2);
  });

  it("requires a paginated route beginning at the star cursor", () => {
    expect(() =>
      assertGovInfoSyntheticPaginationTraversal({
        contractVersion: GOVINFO_CONTRACT_VERSION,
        fixtureNotice: GOVINFO_SYNTHETIC_NOTICE,
        kind: GOVINFO_SYNTHETIC_PAGINATION_KIND,
        sourceId: GOVINFO_SOURCE_ID,
        pages: [
          {
            request: "/packages/BILLS-999hr900001ih/summary",
            itemCount: 0,
            itemIds: [],
            nextRequest: null,
          },
        ],
      }),
    ).toThrowError(/paginated routes only/);

    const projection = twoPageProjection();
    projection.pages[0] = {
      ...projection.pages[0],
      request: secondRequest,
    };
    expect(() =>
      assertGovInfoSyntheticPaginationTraversal(projection),
    ).toThrowError(/first pagination cursor must be/);
  });

  it("rejects oversize pages, count drift, and duplicate item IDs", () => {
    for (const firstPage of [
      {
        ...twoPageProjection().pages[0],
        itemCount: 3,
        itemIds: ["SYNTHETIC-1", "SYNTHETIC-2", "SYNTHETIC-3"],
      },
      {
        ...twoPageProjection().pages[0],
        itemCount: 1,
      },
      {
        ...twoPageProjection().pages[0],
        itemIds: ["SYNTHETIC-DUPLICATE", "SYNTHETIC-DUPLICATE"],
      },
    ]) {
      const projection = twoPageProjection();
      projection.pages[0] = firstPage;
      expect(() =>
        assertGovInfoSyntheticPaginationTraversal(projection),
      ).toThrowError(/pageSize|array length|duplicate item/);
    }

    const crossPage = twoPageProjection();
    crossPage.pages[1] = {
      ...crossPage.pages[1],
      itemIds: [crossPage.pages[0].itemIds[0] ?? ""],
    };
    expect(() =>
      assertGovInfoSyntheticPaginationTraversal(crossPage),
    ).toThrowError(/repeated across pages/);

    const missingSyntheticMarker = twoPageProjection();
    missingSyntheticMarker.pages[0] = {
      ...missingSyntheticMarker.pages[0],
      itemIds: ["BILLS-999hr900001ih", "BILLS-999hrSYNTHETIC900002ih"],
    };
    expect(() =>
      assertGovInfoSyntheticPaginationTraversal(missingSyntheticMarker),
    ).toThrowError(/synthetic item ID/);
  });

  it("uses the keyless canonical assertion for every page link", () => {
    for (const unsafeNext of [
      "https://api.govinfo.gov/collections/BILLS/3785-01-01T00:00:00Z?offsetMark=NEXT&pageSize=2",
      "/collections/BILLS/3785-01-01T00:00:00Z?offsetMark=NEXT&pageSize=2&api_key=synthetic",
      "/collections/BILLS/3785-01-01T00:00:00Z?pageSize=2&offsetMark=NEXT",
    ]) {
      const projection = twoPageProjection();
      projection.pages[0] = {
        ...projection.pages[0],
        nextRequest: unsafeNext,
      };
      expect(() =>
        assertGovInfoSyntheticPaginationTraversal(projection),
      ).toThrowError(/canonical keyless request/);
    }
  });

  it("rejects date, collection-list, page-size, and route fingerprint drift", () => {
    for (const driftedNext of [
      "/collections/BILLS/3785-01-02T00:00:00Z/3785-12-31T23:59:59Z?offsetMark=SYNTHETIC-CURSOR-2&pageSize=2",
      "/collections/FR/3785-01-01T00:00:00Z/3785-12-31T23:59:59Z?offsetMark=SYNTHETIC-CURSOR-2&pageSize=2",
      "/collections/BILLS/3785-01-01T00:00:00Z/3785-12-31T23:59:59Z?offsetMark=SYNTHETIC-CURSOR-2&pageSize=1",
      "/published/3785-01-01/3785-12-31?offsetMark=SYNTHETIC-CURSOR-2&pageSize=2&collection=BILLS",
    ]) {
      const projection = twoPageProjection();
      projection.pages[0] = {
        ...projection.pages[0],
        nextRequest: driftedNext,
      };
      projection.pages[1] = {
        ...projection.pages[1],
        request: driftedNext,
      };
      expect(() =>
        assertGovInfoSyntheticPaginationTraversal(projection),
      ).toThrowError(/fingerprint drifted/);
    }
  });

  it("rejects repeated cursors", () => {
    const projection = twoPageProjection();
    projection.pages.push({
      request: firstRequest,
      itemCount: 0,
      itemIds: [],
      nextRequest: null,
    });
    projection.pages[1] = {
      ...projection.pages[1],
      nextRequest: firstRequest,
    };

    expect(() =>
      assertGovInfoSyntheticPaginationTraversal(projection),
    ).toThrowError(/cursor repeated/);
  });

  it("rejects missing, extra, and mismatched explicit pages", () => {
    const missing = twoPageProjection();
    missing.pages.pop();
    expect(() =>
      assertGovInfoSyntheticPaginationTraversal(missing),
    ).toThrowError(/missing its page/);

    const extra = twoPageProjection();
    extra.pages[0] = { ...extra.pages[0], nextRequest: null };
    expect(() => assertGovInfoSyntheticPaginationTraversal(extra)).toThrowError(
      /extra pages/,
    );

    const mismatched = twoPageProjection();
    mismatched.pages[1] = {
      ...mismatched.pages[1],
      request:
        "/collections/BILLS/3785-01-01T00:00:00Z/3785-12-31T23:59:59Z?offsetMark=SYNTHETIC-CURSOR-3&pageSize=2",
    };
    expect(() =>
      assertGovInfoSyntheticPaginationTraversal(mismatched),
    ).toThrowError(/does not match the following explicit page/);
  });

  it("rejects provider-envelope fields and requires explicit terminal null", () => {
    const providerLike = {
      ...twoPageProjection(),
      count: 3,
    };
    expect(() =>
      assertGovInfoSyntheticPaginationTraversal(providerLike),
    ).toThrowError(/provider-envelope fields/);

    const missingTerminal = twoPageProjection() as unknown as {
      kind: string;
      pages: Array<Record<string, unknown>>;
    };
    delete missingTerminal.pages[1]?.nextRequest;
    expect(() =>
      assertGovInfoSyntheticPaginationTraversal(missingTerminal),
    ).toThrowError(/projection keys changed/);
  });

  it("requires exact synthetic provenance markers", () => {
    for (const projection of [
      { ...twoPageProjection(), contractVersion: "changed" },
      { ...twoPageProjection(), fixtureNotice: "provider response" },
      { ...twoPageProjection(), sourceId: "changed" },
      { ...twoPageProjection(), kind: "provider_page" },
    ]) {
      expect(() =>
        assertGovInfoSyntheticPaginationTraversal(projection),
      ).toThrowError(/exact|repository-owned/);
    }

    const missingMarker = { ...twoPageProjection() } as Record<string, unknown>;
    delete missingMarker.fixtureNotice;
    expect(() =>
      assertGovInfoSyntheticPaginationTraversal(missingMarker),
    ).toThrowError(/projection keys changed/);
  });

  it("bounds repository-owned synthetic page sequences before traversal", () => {
    const projection = twoPageProjection();
    const oversized = {
      ...projection,
      pages: Array.from(
        { length: GOVINFO_SYNTHETIC_MAXIMUM_PAGE_COUNT + 1 },
        () => projection.pages[0],
      ),
    };

    expect(() =>
      assertGovInfoSyntheticPaginationTraversal(oversized),
    ).toThrowError(/at most 1000 repository-owned synthetic pages/);
  });
});
