// @vitest-environment node
/**
 * W1: the version trap (Part 1). `criteria.version === 2` treated only an
 * exact version 2 criteria object as "version 2 behavior", so a version 3
 * search silently dropped the filter its own echoed criteria named. Each
 * adapter now keeps the filter for version 2 OR LATER. These three tests
 * call the adapter function directly with a hand-built version 3 criteria
 * object: the public route refuses a version 3 identifier match or
 * eligibility filter on these sources (D-186 opens version 3 to a narrowed
 * Federal Register text search only), so a route-level test cannot reach
 * this code path.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DemoSearchCriteriaV3 } from "../../src/demo/types";
// Imported for its module-load side effect only: it configures the Worker's
// allowed-host set that officialFetch checks.
import "../../worker/src/index";
import * as federalRegister from "../../worker/src/sources/federal-register";
import * as grants from "../../worker/src/sources/grants";
import * as regulations from "../../worker/src/sources/regulations";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function reply(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

describe("version 2 OR LATER keeps the filter (W1 Part 1)", () => {
  it("Federal Register: a version 3 docket match is not silently read as a text search", async () => {
    const criteria: DemoSearchCriteriaV3 = {
      version: 3,
      source: "federal-register",
      query: "Docket No. 260916-0002",
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
      sort: "newest",
      resultLevel: null,
      historical: null,
      cursor: null,
      match: "docket",
      documentType: null,
    };
    const fetch = vi.fn().mockResolvedValue(reply({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetch);
    await federalRegister.search({}, criteria);
    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.searchParams.get("conditions[docket_id]")).toBe(
      "Docket No. 260916-0002",
    );
    expect(url.searchParams.has("conditions[term]")).toBe(false);
  });

  it("Grants.gov: a version 3 search keeps the Tribal eligibility filter", async () => {
    const criteria: DemoSearchCriteriaV3 = {
      version: 3,
      source: "grants",
      query: "climate",
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
      sort: "provider-default",
      resultLevel: null,
      historical: null,
      cursor: null,
      match: "text",
      documentType: null,
      eligibility: "tribal",
    };
    const fetch = vi
      .fn()
      .mockResolvedValue(
        reply({ errorcode: 0, data: { hitCount: 0, oppHits: [] } }),
      );
    vi.stubGlobal("fetch", fetch);
    await grants.search({}, criteria);
    const body = JSON.parse(String(fetch.mock.calls[0][1]?.body));
    expect(body.eligibilities).toBe("07|11");
  });

  it("Regulations.gov: a version 3 search keeps the docket match instead of a plain term search", async () => {
    const criteria: DemoSearchCriteriaV3 = {
      version: 3,
      source: "regulations",
      query: "EPA-HQ-OAR-2021-0317",
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
      sort: "-postedDate",
      resultLevel: null,
      historical: null,
      cursor: null,
      match: "docket",
      documentType: null,
    };
    const fetch = vi
      .fn()
      .mockResolvedValue(reply({ data: [], meta: { totalElements: 0 } }));
    vi.stubGlobal("fetch", fetch);
    await regulations.search({ DATA_GOV_API_KEY: "test-key" }, criteria);
    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.searchParams.get("filter[docketId]")).toBe(
      "EPA-HQ-OAR-2021-0317",
    );
    expect(url.searchParams.has("filter[searchTerm]")).toBe(false);
  });
});
