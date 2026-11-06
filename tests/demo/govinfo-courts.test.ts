// @vitest-environment node
// GovInfo courts adapter (T1.5): USCOURTS search restricted by court code, a
// docket lookup by package id, the U.S. Reports citation lookup through volume
// 586, and the positive allowlist applied before any cache write. Synthetic
// fixtures and stubbed fetch only; no live call.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { courts as COURTS } from "../../src/demo/copy/courts";
import { COURT_LABELS, withheldTitle } from "../../src/demo/courts";
import type {
  DemoSearchCriteriaV3,
  DemoSearchMatchV3,
} from "../../src/demo/types";
import * as govinfoCourts from "../../worker/src/sources/govinfo-courts";
import {
  DemoError,
  configureAllowedHosts,
} from "../../worker/src/sources/shared";
import type { Env } from "../../worker/src/sources/shared";
import SEARCH from "./fixtures/courts/uscourts-search.json";
import SUMMARY from "./fixtures/courts/uscourts-summary.json";
import GRANULE from "./fixtures/courts/usreports-granule.json";

let calls: { url: string; init?: RequestInit }[] = [];
let cacheEntries: Map<string, string>;
const limit = vi.fn(async () => ({ success: true }));
const env: Env = { DATA_GOV_API_KEY: "test-key", KEY_RATE: { limit } };

function serve(body: unknown, status = 200) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    }),
  );
}

const criteria = (
  query: string,
  match: DemoSearchMatchV3 = "text",
): DemoSearchCriteriaV3 => ({
  version: 3,
  source: "govinfo-courts",
  query,
  dateFrom: null,
  dateTo: null,
  page: 1,
  pageSize: 10,
  sort: "provider-default",
  resultLevel: "default",
  historical: false,
  cursor: null,
  match,
  documentType: null,
});

async function refusal(run: () => Promise<unknown>): Promise<DemoError> {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(DemoError);
    return error as DemoError;
  }
  throw new Error("expected a refusal");
}

beforeEach(() => {
  configureAllowedHosts(new Set(govinfoCourts.HOSTS));
  cacheEntries = new Map();
  limit.mockClear();
  vi.stubGlobal("caches", {
    default: {
      match: vi.fn(async (req: Request) => {
        const body = cacheEntries.get(req.url);
        return body === undefined ? undefined : new Response(body);
      }),
      put: vi.fn(async (req: Request, res: Response) => {
        cacheEntries.set(req.url, await res.text());
      }),
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("USCOURTS search by court code", () => {
  it("asks GovInfo for the seven courts only and keeps allowlisted fields", async () => {
    serve(SEARCH);
    const out = await govinfoCourts.search(env, criteria("example words"));
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.govinfo.gov/search");
    const body = JSON.parse(String(calls[0].init?.body)) as { query: string };
    expect(body.query).toBe(
      "collection:(USCOURTS) AND courtcode:(ca9 OR cafc OR cofc OR wawd OR waed OR ord OR idd) AND (example words)",
    );
    expect(
      (calls[0].init?.headers as Record<string, string>)["X-Api-Key"],
    ).toBe("test-key");
    expect(limit).toHaveBeenCalledTimes(1);
    // The two granules of one package are one case; the ca1 package is dropped.
    expect(out.results.map((r) => r.identifier)).toEqual([
      "USCOURTS-ca9-99-12345",
      "USCOURTS-wawd-2_99-cv-00123",
    ]);
    expect(out.results[0]).toEqual({
      sourceId: "govinfo-courts",
      identifier: "USCOURTS-ca9-99-12345",
      title: "EXAMPLE COUNTY V. UNITED STATES",
      issuingBody: COURT_LABELS.ca9,
      kind: "USCOURTS",
      date: "2099-03-04",
      officialUrl: "https://www.govinfo.gov/app/details/USCOURTS-ca9-99-12345",
      textUrl: null,
      retrievedAt: out.retrievedAt,
      summary: null,
      textAvailable: false,
      matchKey: null,
      court: "ca9",
      docketNumber: "99-12345",
      packageId: "USCOURTS-ca9-99-12345",
      lastModified: "2099-03-05T01:02:03Z",
      caseCitationProvided: false,
    });
    // A caption that may name a person is withheld.
    expect(out.results[1].title).toBe(withheldTitle("wawd 2:99-cv-00123"));
    expect(JSON.stringify(out)).not.toMatch(
      /Example Party|SAMPLEPERSON|pdfLink/,
    );
    expect(out.total).toBe(4);
  });

  it("restricts to one court when the router names it", async () => {
    serve({ count: 0, results: [] });
    await govinfoCourts.search(env, criteria("example words"), "ord");
    const body = JSON.parse(String(calls[0].init?.body)) as { query: string };
    expect(body.query).toContain("courtcode:(ord) AND");
  });

  it("refuses criteria before version 3 without a call", async () => {
    serve(SEARCH);
    const error = await refusal(() =>
      govinfoCourts.search(env, {
        ...criteria("example words"),
        version: 2,
      } as never),
    );
    expect(error.code).toBe("unsupported_criteria");
    expect(calls).toHaveLength(0);
  });

  it("fails closed on a row it cannot validate", async () => {
    serve({ count: 1, results: [{ packageId: "bad id!", title: "X" }] });
    const error = await refusal(() =>
      govinfoCourts.search(env, criteria("example words")),
    );
    expect(error.code).toBe("bad_upstream");
  });
});

describe("docket lookup with a court code", () => {
  it("reads the package summary once and serves the second press from cache", async () => {
    serve(SUMMARY);
    const first = await govinfoCourts.search(
      env,
      criteria("ca9 99-12345", "court_docket"),
    );
    const second = await govinfoCourts.search(
      env,
      criteria("ca9 99-12345", "court_docket"),
    );
    expect(calls.map((c) => c.url)).toEqual([
      "https://api.govinfo.gov/packages/USCOURTS-ca9-99-12345/summary",
    ]);
    expect(first.results).toEqual(second.results);
    expect(first.results[0]).toMatchObject({
      court: "ca9",
      docketNumber: "99-12345",
      lastModified: "2099-03-05T01:02:03Z",
      caseCitationProvided: false,
    });
    // Only allowlisted fields reach the cache.
    const cached = [...cacheEntries.values()].join("");
    expect(cached).not.toMatch(/Example Party|parties|zipLink|collectionName/);
    expect(first.continuation).toEqual({
      kind: "stopped",
      reason: "not_applicable",
    });
  });

  it("says GovInfo has no package for an unknown docket", async () => {
    serve({ message: "No package found" }, 404);
    const error = await refusal(() =>
      govinfoCourts.search(env, criteria("ca9 99-12345", "court_docket")),
    );
    expect(error.code).toBe("not_found");
    expect(error.message).toBe(COURTS.docketNotFound);
  });

  it("refuses a summary for a different package", async () => {
    serve({ ...SUMMARY, packageId: "USCOURTS-ca9-99-99999" });
    const error = await refusal(() =>
      govinfoCourts.search(env, criteria("ca9 99-12345", "court_docket")),
    );
    expect(error.code).toBe("bad_upstream");
  });

  it("refuses a docket with no court code without a call", async () => {
    serve(SUMMARY);
    const error = await refusal(() =>
      govinfoCourts.search(env, criteria("99-12345", "court_docket")),
    );
    expect(error.code).toBe("bad_query");
    expect(calls).toHaveLength(0);
  });
});

describe("U.S. Reports citation lookup", () => {
  it("reads the granule for a volume through 586", async () => {
    serve(GRANULE);
    const out = await govinfoCourts.search(
      env,
      criteria("199 U.S. 42", "us_reports"),
    );
    expect(calls.map((c) => c.url)).toEqual([
      "https://api.govinfo.gov/packages/USREPORTS-199/granules/USREPORTS-199-42/summary",
    ]);
    expect(out.results[0]).toMatchObject({
      identifier: "USREPORTS-199-42",
      kind: "USREPORTS",
      packageId: "USREPORTS-199",
      caseCitationProvided: true,
      officialUrl:
        "https://www.govinfo.gov/app/details/USREPORTS-199/USREPORTS-199-42",
    });
    expect(JSON.stringify(out)).not.toContain("otherIdentifier");
  });

  it("answers above volume 586 with no call and no key spent", async () => {
    serve(GRANULE);
    const error = await refusal(() =>
      govinfoCourts.search(env, criteria("587 U.S. 1", "us_reports")),
    );
    expect(error.code).toBe("not_resolvable");
    expect(error.message).toBe(
      "Not resolvable from an official source; search the case name.",
    );
    expect(calls).toHaveLength(0);
    expect(limit).not.toHaveBeenCalled();
  });

  it("needs the key", async () => {
    serve(GRANULE);
    const error = await refusal(() =>
      govinfoCourts.search({}, criteria("199 U.S. 42", "us_reports")),
    );
    expect(error.code).toBe("key_pending");
    expect(calls).toHaveLength(0);
  });
});
