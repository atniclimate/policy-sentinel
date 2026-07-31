import { describe, expect, it } from "vitest";

import {
  assertCongressGovRelativeRequest,
  buildCongressGovRelativeRequest,
  parseCongressGovResourcePath,
} from "../../../src/contracts/congress/query-contract";

describe("Congress.gov keyless query contract", () => {
  it("builds a canonical relative JSON collection request", () => {
    const request = buildCongressGovRelativeRequest("/v3/bill/999/hr", {
      offset: 0,
      limit: 250,
      fromDateTime: "3785-01-01T00:00:00Z",
      toDateTime: "3785-12-31T00:00:00Z",
    });

    expect(request.canonicalPathAndQuery).toBe(
      "/v3/bill/999/hr?format=json&offset=0&limit=250&fromDateTime=3785-01-01T00%3A00%3A00Z&toDateTime=3785-12-31T00%3A00%3A00Z",
    );
    expect(
      assertCongressGovRelativeRequest(request.canonicalPathAndQuery),
    ).toEqual(request);
  });

  it("keeps runtime host and credential selection outside the contract", () => {
    for (const request of [
      "https://api.congress.gov/v3/bill?format=json",
      "//api.congress.gov/v3/bill?format=json",
      "/v3/bill?format=json&api_key=synthetic",
      "/v3/bill?format=json&key=synthetic",
      "/v3/bill?format=json&format=json",
    ]) {
      expect(() => assertCongressGovRelativeRequest(request)).toThrowError(
        /relative|unknown|duplicate/,
      );
    }
  });

  it("enforces pagination bounds and documented UTC update windows", () => {
    expect(() =>
      buildCongressGovRelativeRequest("/v3/bill", { limit: 251 }),
    ).toThrowError(/bounded safe integer/);
    expect(() =>
      buildCongressGovRelativeRequest("/v3/bill", { offset: -1 }),
    ).toThrowError(/bounded safe integer/);
    expect(() =>
      buildCongressGovRelativeRequest("/v3/bill", {
        fromDateTime: "2026-02-29T00:00:00Z",
      }),
    ).toThrowError(/real UTC calendar date/);
    expect(() =>
      buildCongressGovRelativeRequest("/v3/bill", {
        fromDateTime: "2026-07-31T08:00:00Z",
      }),
    ).toThrowError(/YYYY-MM-DDT00:00:00Z/);
    expect(() =>
      buildCongressGovRelativeRequest("/v3/bill", {
        fromDateTime: "2026-08-01T00:00:00Z",
        toDateTime: "2026-07-31T00:00:00Z",
      }),
    ).toThrowError(/reversed/);
  });

  it("allows update-date sorting only where the official contract exposes it", () => {
    expect(
      buildCongressGovRelativeRequest("/v3/summaries/999/hr", {
        sort: "updateDate+asc",
      }).canonicalPathAndQuery,
    ).toBe("/v3/summaries/999/hr?format=json&sort=updateDate%2Basc");
    expect(
      buildCongressGovRelativeRequest("/v3/bill/999/hr/1001/cosponsors", {
        sort: "updateDate+desc",
      }).resource.sortable,
    ).toBe(true);
    expect(() =>
      buildCongressGovRelativeRequest("/v3/bill/999/hr", {
        sort: "updateDate+asc",
      }),
    ).toThrowError(/unsupported/);
    expect(() =>
      buildCongressGovRelativeRequest("/v3/bill/999/hr/1001/committees", {
        fromDateTime: "3785-01-01T00:00:00Z",
      }),
    ).toThrowError(/update-date filters are unsupported/);
    expect(
      buildCongressGovRelativeRequest("/v3/bill/999/hr/1001/actions", {
        fromDateTime: "3785-01-01T00:00:00Z",
      }).resource.updateWindow,
    ).toBe(true);
  });

  it("accepts only reviewed resource families and canonical identities", () => {
    expect(parseCongressGovResourcePath("/v3/congress/current")).toMatchObject({
      collection: false,
    });
    expect(
      parseCongressGovResourcePath("/v3/bill/999/sjres/7/text"),
    ).toMatchObject({
      congress: 999,
      billType: "sjres",
      billNumber: 7,
      subresource: "text",
    });
    expect(parseCongressGovResourcePath("/v3/law/999/pub/42")).toMatchObject({
      congress: 999,
      lawType: "pub",
      lawNumber: 42,
    });
    for (const path of [
      "/v2/bill",
      "/v3/member",
      "/v3/bill/999/HR/1",
      "/v3/bill/999/hr/01",
      "/v3/bill/1000/hr/1",
      "/v3/bill/999/hr/1/unknown",
    ]) {
      expect(() => parseCongressGovResourcePath(path)).toThrowError();
    }
  });

  it("rejects changed option shapes instead of forwarding them", () => {
    expect(() =>
      buildCongressGovRelativeRequest("/v3/bill", {
        page: 1,
      } as never),
    ).toThrowError(/not allowed/);
    expect(() =>
      buildCongressGovRelativeRequest("/v3/bill/999/hr/1", {
        limit: 20,
      }),
    ).toThrowError(/detail resources/);
  });
});
