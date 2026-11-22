// @vitest-environment node
// Release check of the GovInfo court source (2026-11-18). Synthetic values in
// the live shape; stubbed fetch only, no live call.
// Live finding: a U.S. Reports granule's dateIssued is the volume's date (443
// U.S. 658, decided 1979, stated 1981-01-01), which the page would have shown as
// "Date issued". The case row omits the volume date even in the same year.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { courtDocketReading } from "../../src/demo/courts";
import type {
  DemoSearchCriteriaV3,
  DemoSearchMatchV3,
} from "../../src/demo/types";
import * as govinfoCourts from "../../worker/src/sources/govinfo-courts";
import { configureAllowedHosts } from "../../worker/src/sources/shared";
import type { Env } from "../../worker/src/sources/shared";

const env: Env = {
  DATA_GOV_API_KEY: "test-key",
  KEY_RATE: { limit: vi.fn(async () => ({ success: true })) },
};

function serve(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    ),
  );
}

const criteria = (
  query: string,
  match: DemoSearchMatchV3,
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

const granule = (title: string, dateIssued: string) => ({
  granuleId: "USREPORTS-199-42",
  packageId: "USREPORTS-199",
  title,
  dateIssued,
  lastModified: "2099-06-02T00:00:00Z",
});

beforeEach(() => {
  configureAllowedHosts(new Set(govinfoCourts.HOSTS));
  const store = new Map<string, string>();
  vi.stubGlobal("caches", {
    default: {
      match: vi.fn(async (req: Request) => {
        const body = store.get(req.url);
        return body === undefined ? undefined : new Response(body);
      }),
      put: vi.fn(async (req: Request, res: Response) => {
        store.set(req.url, await res.text());
      }),
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("U.S. Reports date (volume date is not the decision date)", () => {
  const lookup = () =>
    govinfoCourts.search(env, criteria("199 U.S. 42", "us_reports"));

  it("drops a volume date that the title's year contradicts", async () => {
    serve(
      granule(
        "Example State v. Example Agency, 199 U.S. 42 (2097)",
        "2099-01-01",
      ),
    );
    expect((await lookup()).results[0].date).toBeNull();
  });

  it("drops the date when the title states no year to confirm it", async () => {
    serve(granule("EXAMPLE STATE V. UNITED STATES", "2099-01-01"));
    expect((await lookup()).results[0].date).toBeNull();
  });

  it("drops the volume date even when the title states the same year", async () => {
    serve(
      granule(
        "Example State v. Example Agency, 199 U.S. 42 (2099)",
        "2099-06-01",
      ),
    );
    expect((await lookup()).results[0].date).toBeNull();
  });

  it("still fails closed on a malformed date", async () => {
    serve(
      granule(
        "Example State v. Example Agency, 199 U.S. 42 (2099)",
        "not-a-date",
      ),
    );
    await expect(lookup()).rejects.toMatchObject({ code: "bad_upstream" });
  });
});

describe("trial-court docket round trip, as seen live", () => {
  it("a search row's docket form looks up the same package", async () => {
    serve({
      count: 1,
      results: [
        {
          title: "EXAMPLE COUNTY V. EXAMPLE AGENCY",
          packageId: "USCOURTS-waed-4_99-cv-00001",
          lastModified: "2099-02-01T00:00:00Z",
          dateIssued: "2099-01-31",
          collectionCode: "USCOURTS",
        },
      ],
    });
    const out = await govinfoCourts.search(
      env,
      criteria("example words", "text"),
    );
    const row = out.results[0];
    expect(row.docketNumber).toBe("4:99-cv-00001");
    // What the page sends for that row's docket lookup.
    const reading = courtDocketReading(`${row.court} ${row.docketNumber}`);
    expect(reading?.packageId).toBe(row.identifier);
  });
});
