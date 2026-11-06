// @vitest-environment node
// Related-record expansion on press (T1.3): one keyed call per press, cached
// in the Worker, each relation in the source's own words, allowlisted before
// the cache write. Synthetic fixtures and stubbed fetch only.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as congressRelated from "../../worker/src/sources/congress-related";
import * as govinfoRelated from "../../worker/src/sources/govinfo-related";
import {
  DemoError,
  configureAllowedHosts,
} from "../../worker/src/sources/shared";
import type { Env } from "../../worker/src/sources/shared";
import BILLS from "./fixtures/courts/congress-relatedbills.json";
import RELATED from "./fixtures/courts/govinfo-related.json";

let calls: string[] = [];
let cacheEntries: Map<string, string>;
const limit = vi.fn(async () => ({ success: true }));
const env: Env = { DATA_GOV_API_KEY: "test-key", KEY_RATE: { limit } };

function serve(body: unknown, status = 200) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string) => {
      calls.push(String(input));
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    }),
  );
}

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
  configureAllowedHosts(
    new Set([...govinfoRelated.HOSTS, ...congressRelated.HOSTS]),
  );
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

describe("GovInfo related", () => {
  it("lists each relation in GovInfo's own words, one call, then cache", async () => {
    serve(RELATED);
    const first = await govinfoRelated.related(env, "BILLS-199hr1001ih");
    const second = await govinfoRelated.related(env, "BILLS-199hr1001ih");
    expect(calls).toEqual([
      "https://api.govinfo.gov/related/BILLS-199hr1001ih",
    ]);
    expect(limit).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      ok: true,
      source: "govinfo",
      basis: "source_field",
      accessId: "BILLS-199hr1001ih",
      relations: [
        { relation: "Bill Versions", collection: "BILLS" },
        { relation: "Public and Private Laws", collection: "PLAW" },
      ],
    });
    const cached = [...cacheEntries.values()].join("");
    expect(cached).not.toMatch(/Example Party|relationshipLink/);
  });

  it("states no related records when GovInfo has none", async () => {
    serve({ message: "not found" }, 404);
    const out = await govinfoRelated.related(env, "USCOURTS-ca9-99-12345");
    expect(out.relations).toEqual([]);
  });

  it("refuses a bad id without a call", async () => {
    serve(RELATED);
    expect(
      (await refusal(() => govinfoRelated.related(env, "../x"))).code,
    ).toBe("bad_query");
    expect(calls).toHaveLength(0);
  });

  it("fails closed on a relation without a name", async () => {
    serve({ relationships: [{ collection: "BILLS" }] });
    expect(
      (await refusal(() => govinfoRelated.related(env, "BILLS-199hr1001ih")))
        .code,
    ).toBe("bad_upstream");
  });
});

describe("Congress.gov related bills", () => {
  it("lists each relation as Congress.gov states it, one call, then cache", async () => {
    serve(BILLS);
    const first = await congressRelated.relatedBills(env, "hr 1001 199");
    await congressRelated.relatedBills(env, "HR 1001 199");
    expect(calls).toEqual([
      "https://api.congress.gov/v3/bill/199/hr/1001/relatedbills?format=json&limit=20",
    ]);
    expect(first).toMatchObject({
      ok: true,
      source: "congress",
      basis: "source_field",
      bill: "HR 1001, 199th Congress",
      total: 2,
      records: [
        {
          relation: "Identical bill",
          identifiedBy: "CRS",
          identifier: "S 2002, 199th Congress",
          title: "Example Watershed Act",
          officialUrl:
            "https://www.congress.gov/bill/199th-congress/senate-bill/2002",
        },
        {
          relation: "Related bill",
          identifiedBy: "House",
          identifier: "S 2002, 199th Congress",
        },
        {
          relation: "Procedurally-related",
          identifiedBy: "House",
          identifier: "HR 3003, 199th Congress",
          officialUrl:
            "https://www.congress.gov/bill/199th-congress/house-bill/3003",
        },
      ],
    });
    const cached = [...cacheEntries.values()].join("");
    expect(cached).not.toMatch(
      /Example Party|sponsors|latestAction|Read twice/,
    );
  });

  it("refuses a reference that is not one bill, without a call", async () => {
    serve(BILLS);
    expect(
      (await refusal(() => congressRelated.relatedBills(env, "example words")))
        .code,
    ).toBe("bad_query");
    expect(calls).toHaveLength(0);
  });

  it("withholds a private bill's title and one the guard flags (R2-5)", async () => {
    serve({
      relatedBills: [
        {
          congress: 199,
          number: 4004,
          type: "HR",
          title: "For the relief of Jane Sampleperson.",
          relationshipDetails: [
            { identifiedBy: "House", type: "Related bill" },
          ],
        },
        {
          congress: 199,
          number: 5005,
          type: "S",
          title: "Example Act; contact Mr. Sampleperson",
          relationshipDetails: [
            { identifiedBy: "House", type: "Related bill" },
          ],
        },
      ],
    });
    const out = await congressRelated.relatedBills(env, "hr 1001 199");
    expect(out.records.map((r) => r.title)).toEqual([null, null]);
    const cached = [...cacheEntries.values()].join("");
    expect(cached).not.toContain("Sampleperson");
  });

  it("fails closed on an unknown bill type", async () => {
    serve({
      relatedBills: [
        {
          congress: 199,
          number: 1,
          type: "ZZ",
          title: "Example",
          relationshipDetails: [
            { identifiedBy: "House", type: "Related bill" },
          ],
        },
      ],
    });
    expect(
      (await refusal(() => congressRelated.relatedBills(env, "hr 1001 199")))
        .code,
    ).toBe("bad_upstream");
  });
});
