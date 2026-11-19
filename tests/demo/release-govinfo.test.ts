// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchValue } from "../../src/demo/validation";
import worker from "../../worker/src/index";

// Shape recorded live on 2026-11-19 from the deployed Worker, values synthetic.
const keyed = { DATA_GOV_API_KEY: "synthetic-key" };
const row = (n: number) => ({
  packageId: `EXAMPLE-2099-${n}`,
  title: `Example Act number ${n}`,
  governmentAuthor: ["Example Chamber"],
  collectionCode: "EXAMPLE",
  dateIssued: "2099-01-01",
});
let visitor = 0;

function search(upstream: object, extra: Record<string, string> = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(upstream), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    ),
  );
  const params = new URLSearchParams({
    source: "govinfo",
    q: "example topic",
    searchVersion: "2",
    ...extra,
  });
  return worker.fetch(
    new Request(`https://demo.example/api/search?${params}`, {
      headers: {
        Origin: "http://localhost:5211",
        "cf-connecting-ip": `2001:db8::${(++visitor + 0x4000).toString(16)}`,
      },
    }),
    keyed,
  );
}

beforeEach(() => {
  const entries = new Map<string, Response>();
  vi.stubGlobal("caches", {
    default: {
      match: async (req: Request) => entries.get(req.url)?.clone(),
      put: async (req: Request, res: Response) => {
        entries.set(req.url, res.clone());
      },
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GovInfo search continuation reads the count", () => {
  it("stops as complete when the one page holds every counted hit, even with a next token", async () => {
    const res = await search({
      count: 1,
      offsetMark: "opaque-next",
      results: [row(1)],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      total: 1,
      continuation: { kind: "stopped", reason: "complete" },
    });
    // The page takes the answer: it no longer refuses "complete" from GovInfo.
    expect(
      searchValue(body, "govinfo", "example topic", 1, {
        dateFrom: null,
        dateTo: null,
        continuation: null,
        version: 2,
      }).continuation,
    ).toEqual({ kind: "stopped", reason: "complete" });
  });

  it("offers the next page when the count is larger than the page", async () => {
    const res = await search({
      count: 14493,
      offsetMark: "opaque-next",
      results: Array.from({ length: 10 }, (_, i) => row(i)),
    });
    expect(await res.json()).toMatchObject({
      total: 14493,
      continuation: { kind: "more", next: { page: 2, cursor: "opaque-next" } },
    });
  });

  it("offers the next page when the count is not given", async () => {
    const res = await search({ offsetMark: "opaque-next", results: [row(1)] });
    expect(await res.json()).toMatchObject({
      total: null,
      continuation: { kind: "more" },
    });
  });

  it("does not call an empty page complete", async () => {
    const res = await search({
      count: 0,
      offsetMark: "opaque-next",
      results: [],
    });
    expect(await res.json()).toMatchObject({
      continuation: { kind: "more" },
    });
  });
});
