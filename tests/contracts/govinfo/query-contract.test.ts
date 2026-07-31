import { describe, expect, it } from "vitest";

import {
  assertGovInfoRelativeRequest,
  buildGovInfoRelativeRequest,
  parseGovInfoResourcePath,
} from "../../../src/contracts/govinfo/query-contract";

describe("GovInfo keyless query contract", () => {
  it("builds keyless collection inventory and modified-range descriptors", () => {
    const inventory = buildGovInfoRelativeRequest("/collections");
    expect(inventory).toMatchObject({
      canonicalPathAndQuery: "/collections",
      resource: { kind: "collections", paginated: false },
    });
    expect(assertGovInfoRelativeRequest("/collections")).toEqual(inventory);

    const request = buildGovInfoRelativeRequest(
      "/collections/BILLS/3785-01-01T00:00:00Z/3785-12-31T23:59:59Z",
      { offsetMark: "*", pageSize: 1000 },
    );
    expect(request.canonicalPathAndQuery).toBe(
      "/collections/BILLS/3785-01-01T00:00:00Z/3785-12-31T23:59:59Z?offsetMark=*&pageSize=1000",
    );
    expect(assertGovInfoRelativeRequest(request.canonicalPathAndQuery)).toEqual(
      request,
    );
  });

  it("preserves an opaque continuation cursor without interpreting it", () => {
    const cursor = "AoJw+/opaque==:cursor";
    const request = buildGovInfoRelativeRequest(
      "/collections/USCOURTS/3785-03-01T07:08:09Z",
      { offsetMark: cursor, pageSize: 25 },
    );

    expect(request.options.offsetMark).toBe(cursor);
    expect(request.canonicalPathAndQuery).toContain(
      "offsetMark=AoJw%2B%2Fopaque%3D%3D%3Acursor",
    );
    expect(
      assertGovInfoRelativeRequest(request.canonicalPathAndQuery).options
        .offsetMark,
    ).toBe(cursor);
  });

  it("builds a canonical published-date request with current collections", () => {
    const request = buildGovInfoRelativeRequest(
      "/published/3785-01-01/3785-12-31",
      {
        offsetMark: "*",
        pageSize: 100,
        collections: ["USCOURTS", "BILLS", "PLAW"],
      },
    );

    expect(request.options.collections).toEqual(["BILLS", "PLAW", "USCOURTS"]);
    expect(request.canonicalPathAndQuery).toBe(
      "/published/3785-01-01/3785-12-31?offsetMark=*&pageSize=100&collection=BILLS%2CPLAW%2CUSCOURTS",
    );
    expect(assertGovInfoRelativeRequest(request.canonicalPathAndQuery)).toEqual(
      request,
    );
  });

  it("binds package and granule identities as opaque safe segments", () => {
    const packageSummary = buildGovInfoRelativeRequest(
      "/packages/BILLS-999hr1001ih/summary",
    );
    expect(packageSummary.resource).toMatchObject({
      kind: "package-summary",
      packageId: "BILLS-999hr1001ih",
    });
    expect(
      assertGovInfoRelativeRequest(packageSummary.canonicalPathAndQuery),
    ).toEqual(packageSummary);

    const granuleSummary = buildGovInfoRelativeRequest(
      "/packages/CREC-3785-01-02/granules/CREC-3785-01-02-pt1-PgS1/summary",
    );
    expect(granuleSummary.resource).toMatchObject({
      kind: "granule-summary",
      packageId: "CREC-3785-01-02",
      granuleId: "CREC-3785-01-02-pt1-PgS1",
    });
    expect(
      assertGovInfoRelativeRequest(granuleSummary.canonicalPathAndQuery),
    ).toEqual(granuleSummary);

    const granuleList = buildGovInfoRelativeRequest(
      "/packages/CREC-3785-01-02/granules",
      { offsetMark: "*", pageSize: 100 },
    );
    expect(granuleList.resource).toMatchObject({
      kind: "granule-list",
      paginated: true,
    });
    expect(
      assertGovInfoRelativeRequest(granuleList.canonicalPathAndQuery),
    ).toEqual(granuleList);

    for (const path of [
      "/packages/../summary",
      "/packages/pkg%2Fescape/summary",
      "/packages/pkg/granules/granule/../summary",
      "/packages/pkg/granules/granule%2Fescape/summary",
    ]) {
      expect(() => parseGovInfoResourcePath(path)).toThrowError(/path|segment/);
    }
  });

  it("requires bounded cursor pagination on every paginated route", () => {
    expect(() =>
      buildGovInfoRelativeRequest("/collections/BILLS/3785-01-01T00:00:00Z", {
        pageSize: 100,
      }),
    ).toThrowError(/require offsetMark and pageSize/);
    expect(() =>
      buildGovInfoRelativeRequest("/packages/BILLS-999hr1ih/granules", {
        offsetMark: "*",
        pageSize: 0,
      }),
    ).toThrowError(/1 through 1000/);
    expect(() =>
      buildGovInfoRelativeRequest("/packages/BILLS-999hr1ih/granules", {
        offsetMark: "*",
        pageSize: 1001,
      }),
    ).toThrowError(/1 through 1000/);
    expect(() =>
      buildGovInfoRelativeRequest("/packages/BILLS-999hr1ih/granules", {
        offsetMark: "opaque cursor",
        pageSize: 100,
      }),
    ).toThrowError(/opaque cursor/);
    expect(() =>
      buildGovInfoRelativeRequest("/packages/BILLS-999hr1ih/granules", {
        offsetMark: "x".repeat(4096),
        pageSize: 100,
      }),
    ).toThrowError(/URL limit/);
  });

  it("validates real UTC timestamps, dates, clock values, and range order", () => {
    for (const path of [
      "/collections/BILLS/3785-02-29T00:00:00Z",
      "/collections/BILLS/3784-02-29T24:00:00Z",
      "/collections/BILLS/3785-08-01T00:00:00Z/3785-07-31T23:59:59Z",
      "/published/3785-02-29",
      "/published/3785-12-31/3785-01-01",
    ]) {
      expect(() => parseGovInfoResourcePath(path)).toThrowError(
        /calendar|clock|reversed/,
      );
    }
    expect(parseGovInfoResourcePath("/published/3784-02-29").startDate).toBe(
      "3784-02-29",
    );
  });

  it("rejects hosts, credentials, deprecated offset, duplicates, and unknown queries", () => {
    for (const request of [
      "https://api.govinfo.gov/collections",
      "//api.govinfo.gov/collections",
      "/collections?api_key=synthetic",
      "/collections?key=synthetic",
      "/collections/BILLS/3785-01-01T00:00:00Z?offset=0&offsetMark=*&pageSize=100",
      "/collections/BILLS/3785-01-01T00:00:00Z?offsetMark=*&offsetMark=opaque&pageSize=100",
      "/collections/BILLS/3785-01-01T00:00:00Z?offsetMark=*&pageSize=100&unknown=value",
    ]) {
      expect(() => assertGovInfoRelativeRequest(request)).toThrowError(
        /relative|unknown|duplicate|query options/,
      );
    }
  });

  it("rejects unsupported routes and route-specific query drift", () => {
    expect(() => parseGovInfoResourcePath("/search")).toThrowError(/outside/);
    expect(() => parseGovInfoResourcePath("/related/pkg")).toThrowError(
      /outside/,
    );
    expect(() =>
      buildGovInfoRelativeRequest("/packages/BILLS-999hr1ih/summary", {
        offsetMark: "*",
        pageSize: 100,
      }),
    ).toThrowError(/no query options/);
    expect(() =>
      buildGovInfoRelativeRequest("/collections/BILLS/3785-01-01T00:00:00Z", {
        offsetMark: "*",
        pageSize: 100,
        collections: ["BILLS"],
      }),
    ).toThrowError(/only to published/);
  });

  it("rejects changed collection and option shapes instead of forwarding them", () => {
    expect(() =>
      buildGovInfoRelativeRequest("/published/3785-01-01", {
        offsetMark: "*",
        pageSize: 100,
        collections: ["BILLS", "BILLS"],
      }),
    ).toThrowError(/duplicate collection/);
    expect(() =>
      buildGovInfoRelativeRequest("/published/3785-01-01", {
        offsetMark: "*",
        pageSize: 100,
        collections: ["NOT_A_COLLECTION"],
      } as never),
    ).toThrowError(/current documented collection/);
    expect(() =>
      buildGovInfoRelativeRequest("/published/3785-01-01", {
        offsetMark: "*",
        pageSize: 100,
        collections: ["BILLS"],
        docClass: "hr",
      } as never),
    ).toThrowError(/not allowed/);
  });
});
