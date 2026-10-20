// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzePolicy, ENGINE_INFO } from "../../src/demo/analyze";
import { isCongressReference } from "../../src/demo/merge";
import {
  MAX_CONTINUATION_LENGTH,
  nextSearchCursor,
  REGULATIONS_V2_CONFIRMED,
  searchCriteria,
} from "../../src/demo/search-contract";
import worker, {
  ALLOWED_HOSTS,
  officialFetch,
  parseWashingtonQuery,
  sourceList,
} from "../../worker/src/index";
import type { Env } from "../../worker/src/index";
import {
  FR_DOC_NUMBER,
  FR_HTML,
  FR_HTML_QUIET,
  FR_PROBE_ROWS,
  FR_SEARCH_JSON,
  REGULATIONS_V2_JSON,
  WA_HTML,
} from "./fixtures";

const ORIGIN = "https://atniclimate.github.io";
let calls: { url: string; headers: Record<string, string> }[] = [];
let visitor = 0;
let cacheEntries: Map<string, Response>;
let cache: {
  match: (request: Request) => Promise<Response | undefined>;
  put: (request: Request, response: Response) => Promise<void>;
};

function reply(body: string | object, status = 200, type = "application/json") {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Response(text, { status, headers: { "content-type": type } });
}

function installFetch(routes: Record<string, () => Response>) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string, init?: RequestInit) => {
      const url = String(input);
      calls.push({
        url,
        headers: (init?.headers ?? {}) as Record<string, string>,
      });
      for (const [needle, make] of Object.entries(routes)) {
        if (url.includes(needle)) return make();
      }
      return reply("not routed", 404, "text/plain");
    }),
  );
}

beforeEach(() => {
  cacheEntries = new Map<string, Response>();
  cache = {
    match: vi.fn(async (req: Request) => cacheEntries.get(req.url)?.clone()),
    put: vi.fn(async (req: Request, res: Response) => {
      cacheEntries.set(req.url, res.clone());
    }),
  };
  vi.stubGlobal("caches", {
    default: cache,
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const call = (
  path: string,
  env: Env = {},
  headers: Record<string, string> = { Origin: ORIGIN },
  method = "GET",
) =>
  worker.fetch(
    new Request(`https://demo.example${path}`, {
      method,
      // Keep ordinary visitors separate from explicit IPv4 rate-limit fixtures.
      headers: {
        "cf-connecting-ip": `2001:db8::${(++visitor).toString(16)}`,
        ...headers,
      },
    }),
    env,
  );

describe("worker access rules", () => {
  it("answers CORS for the Pages origin and localhost only", async () => {
    const ok = await call("/health");
    expect(ok.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    const local = await call(
      "/health",
      {},
      { Origin: "http://localhost:5173" },
    );
    expect(local.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173",
    );
    const other = await call("/health", {}, { Origin: "https://evil.example" });
    expect(other.status).toBe(403);
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("refuses anything but GET and OPTIONS", async () => {
    expect(
      (await call("/api/search", {}, { Origin: ORIGIN }, "POST")).status,
    ).toBe(405);
    expect(
      (await call("/api/search", {}, { Origin: ORIGIN }, "OPTIONS")).status,
    ).toBe(204);
  });

  it("fetches only exact allowlisted official hosts, over https", async () => {
    installFetch({});
    await expect(officialFetch("https://example.com/x")).rejects.toMatchObject({
      code: "host_not_allowed",
    });
    await expect(
      officialFetch("http://www.govinfo.gov/x"),
    ).rejects.toMatchObject({ code: "host_not_allowed" });
    await expect(
      officialFetch("https://www.govinfo.gov.evil.example/x"),
    ).rejects.toMatchObject({ code: "host_not_allowed" });
    await expect(
      officialFetch("https://user:password@www.govinfo.gov/x"),
    ).rejects.toMatchObject({ code: "host_not_allowed" });
    await expect(
      officialFetch("https://www.govinfo.gov:8443/x"),
    ).rejects.toMatchObject({ code: "host_not_allowed" });
    expect(calls).toHaveLength(0);
    expect([...ALLOWED_HOSTS].every((h) => /(?:\.gov)$/.test(h))).toBe(true);
  });

  it("does not follow redirects off the allowlist", async () => {
    installFetch({
      "www.govinfo.gov": () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://evil.example/" },
        }),
    });
    await expect(
      officialFetch("https://www.govinfo.gov/x"),
    ).rejects.toMatchObject({ code: "redirect_refused" });
  });

  it("rate limits with the in-memory guard when no binding exists", async () => {
    installFetch({ "documents.json": () => reply(FR_SEARCH_JSON) });
    const headers = { Origin: ORIGIN, "cf-connecting-ip": "203.0.113.77" };
    const statuses: number[] = [];
    for (let i = 0; i < 100; i++) {
      const res = await call(
        `/api/search?source=federal-register&q=term${i}`,
        {},
        headers,
      );
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 80)).toEqual(Array(80).fill(200));
    expect(statuses.slice(80)).toEqual(Array(20).fill(429));
  });

  it("asks the rate-limit binding first when it exists", async () => {
    const limit = vi.fn(async () => ({ success: false }));
    const res = await call("/api/search?source=federal-register&q=abc", {
      RATE: { limit },
    });
    expect(res.status).toBe(429);
    expect(limit).toHaveBeenCalled();
  });

  it("does not fetch an official source when the rate-limit binding fails", async () => {
    installFetch({ "documents.json": () => reply(FR_SEARCH_JSON) });
    const limit = vi.fn(async () => {
      throw new Error("rate-limit binding unavailable");
    });
    const res = await call("/api/search?source=federal-register&q=abc", {
      RATE: { limit },
    });
    expect(res.status).toBe(429);
    expect(limit).toHaveBeenCalledOnce();
    expect(calls).toHaveLength(0);
  });
});

describe("sources", () => {
  it("marks keyed sources pending without a key and live with one", () => {
    const pending = sourceList({});
    expect(pending.find((s) => s.id === "govinfo")?.status).toBe("key_pending");
    expect(pending.find((s) => s.id === "federal-register")?.status).toBe(
      "live",
    );
    expect(pending.find((s) => s.id === "washington")?.status).toBe("live");
    expect(pending.find((s) => s.id === "oregon")?.status).toBe(
      "not_available",
    );
    expect(pending.find((s) => s.id === "idaho")?.status).toBe("not_available");
    expect(
      sourceList({ DATA_GOV_API_KEY: "x" }).find((s) => s.id === "govinfo")
        ?.status,
    ).toBe("live");
  });

  it("returns an honest key-pending answer and never calls out", async () => {
    installFetch({});
    const res = await call("/api/search?source=govinfo&q=tribal");
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      error: "key_pending",
      status: "key_pending",
    });
    expect(calls).toHaveLength(0);
  });

  it("says plainly when a state source is off", async () => {
    const res = await call("/api/search?source=oregon&q=anything");
    expect(res.status).toBe(501);
    expect((await res.json()).status).toBe("not_available");
  });

  it("sends the key upstream as a header and never returns it", async () => {
    installFetch({
      "api.regulations.gov": () =>
        reply({
          data: [
            {
              id: "EPA-HQ-0001-0001",
              attributes: {
                title: "A document",
                agencyId: "EPA",
                documentType: "Rule",
                postedDate: "2099-01-02T00:00:00Z",
              },
            },
          ],
          meta: { totalElements: 1 },
        }),
    });
    const res = await call("/api/search?source=regulations&q=water", {
      DATA_GOV_API_KEY: "secret-key-value-1234",
    });
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).not.toContain("secret-key-value-1234");
    expect(calls[0].url).not.toContain("secret-key-value-1234");
    expect(calls[0].headers["X-Api-Key"]).toBe("secret-key-value-1234");
    expect(JSON.parse(text).results[0].textAvailable).toBe(false);
  });
});

describe("Federal Register", () => {
  it("normalizes search results into citations", async () => {
    installFetch({ "documents.json": () => reply(FR_SEARCH_JSON) });
    const res = await call("/api/search?source=federal-register&q=water");
    const body = await res.json();
    expect(body.results[0]).toMatchObject({
      identifier: `99 FR 100 (FR Doc. ${FR_DOC_NUMBER})`,
      issuingBody: "Example Department",
      kind: "Proposed Rule",
      date: "2099-01-05",
      officialUrl: `https://www.federalregister.gov/d/${FR_DOC_NUMBER}`,
      textAvailable: true,
    });
    expect(body.results[0].retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("reads the official text, identifies issues and returns a receipt", async () => {
    installFetch({
      [`/documents/${FR_DOC_NUMBER}.json`]: () =>
        reply(FR_SEARCH_JSON.results[0]),
      [`/html/${FR_DOC_NUMBER}.htm`]: () => reply(FR_HTML, 200, "text/html"),
    });
    const res = await call(
      `/api/policy?source=federal-register&id=${FR_DOC_NUMBER}`,
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.citation.textUrl).toBe(
      `https://www.govinfo.gov/content/pkg/FR-2099-01-05/html/${FR_DOC_NUMBER}.htm`,
    );
    expect(body.receipt.sha256).toBe(
      createHash("sha256").update(FR_HTML).digest("hex"),
    );
    expect(body.receipt.bytes).toBe(Buffer.byteLength(FR_HTML));
    const types = new Set(body.issues.map((i: { type: string }) => i.type));
    for (const t of [
      "consultation_language",
      "tribal_reference",
      "date_or_deadline",
      "cross_reference",
      "status_signal",
    ]) {
      expect(types.has(t)).toBe(true);
    }
    expect(body.engine.parser).toBe("policy-text");
  });

  it("keeps contact details out of every issue", async () => {
    installFetch({
      [`/documents/${FR_DOC_NUMBER}.json`]: () =>
        reply(FR_SEARCH_JSON.results[0]),
      [`/html/${FR_DOC_NUMBER}.htm`]: () => reply(FR_HTML, 200, "text/html"),
    });
    const body = await (
      await call(`/api/policy?source=federal-register&id=${FR_DOC_NUMBER}`)
    ).json();
    const all = JSON.stringify(body);
    expect(all).not.toContain("pat@example.gov");
    expect(all).not.toContain("555-123-4567");
  });

  it("refuses ids it should not look up", async () => {
    installFetch({});
    const res = await call(
      "/api/policy?source=federal-register&id=../../etc/passwd",
    );
    expect(res.status).toBe(422);
    expect(calls).toHaveLength(0);
  });

  it("says so when the extractor declines a document", async () => {
    installFetch({
      [`/documents/${FR_DOC_NUMBER}.json`]: () =>
        reply(FR_SEARCH_JSON.results[0]),
      [`/html/${FR_DOC_NUMBER}.htm`]: () =>
        reply(
          "<html><head><title>404</title></head><body><p>Not found</p></body></html>",
          200,
          "text/html",
        ),
    });
    const res = await call(
      `/api/policy?source=federal-register&id=${FR_DOC_NUMBER}`,
    );
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body.error).toBe("extraction_refused");
    expect(body.message).toMatch(/official source/);
  });

  it("does not store search queries or responses in the application cache", async () => {
    installFetch({ "documents.json": () => reply(FR_SEARCH_JSON) });
    await call("/api/search?source=federal-register&q=cachedterm");
    await call("/api/search?source=federal-register&q=cachedterm");
    expect(calls).toHaveLength(2);
    expect(cache.match).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
    expect(cacheEntries.size).toBe(0);
  });
});

describe("Washington State Legislature", () => {
  it("parses bill references and rejects the rest", () => {
    expect(parseWashingtonQuery("HB 1100")).toMatchObject({
      prefix: "HB",
      number: "1100",
      biennium: "2025-26",
      chamber: "House Bills",
    });
    expect(parseWashingtonQuery("senate bill 5100 2023-24")).toMatchObject({
      prefix: "SB",
      biennium: "2023-24",
    });
    expect(parseWashingtonQuery("HB 1100 2024-25")).toBeNull();
    expect(parseWashingtonQuery("water quality")).toBeNull();
  });

  it("reads an introduced bill from the Legislature's file host", async () => {
    installFetch({
      "lawfilesext.leg.wa.gov": () => reply(WA_HTML, 200, "text/html"),
    });
    const res = await call(
      "/api/policy?source=washington&id=HB%201100%202025-26",
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(calls[0].url).toBe(
      "https://lawfilesext.leg.wa.gov/biennium/2025-26/Htm/Bills/House%20Bills/1100.htm",
    );
    expect(body.citation).toMatchObject({
      title: "Relating to an example local tax",
      issuingBody: "Washington State Legislature",
      date: "2025-01-13",
    });
    expect(
      body.issues.some(
        (i: { type: string }) => i.type === "consultation_language",
      ),
    ).toBe(true);
  });

  it("reports a missing bill plainly", async () => {
    installFetch({
      "lawfilesext.leg.wa.gov": () => reply("missing", 404, "text/html"),
    });
    const res = await call("/api/search?source=washington&q=HB%209999");
    expect(res.status).toBe(404);
    expect((await res.json()).message).toMatch(/no HB 9999 file/);
  });
});

describe("analysis", () => {
  it("returns no consultation wording for a quiet final rule, with its limits", () => {
    const bytes = new TextEncoder().encode(FR_HTML_QUIET);
    const out = analyzePolicy({
      bytes,
      mediaType: "text/html",
      sourceKind: "govinfo_fr",
      textUrl:
        "https://www.govinfo.gov/content/pkg/FR-2099-01-06/html/2099-00002.htm",
      expectedIdentity: "2099-00002",
      citation: {
        sourceId: "federal-register",
        identifier: "FR Doc. 2099-00002",
        title: "Example Fee Schedule",
        issuingBody: "Example Department",
        kind: "Rule",
        date: "2099-01-06",
        officialUrl: "https://www.federalregister.gov/d/2099-00002",
        textUrl: null,
        retrievedAt: "2099-01-07T00:00:00.000Z",
        summary: null,
        textAvailable: true,
        matchKey: null,
      },
      retrievedAt: "2099-01-07T00:00:00.000Z",
    });
    expect(out.issues.map((i) => i.type)).toContain("consultation_absent");
  });
});

describe("upstream validation and identity", () => {
  it.each([
    ["null root", null],
    ["missing results", {}],
    ["non-array results", { results: {} }],
    ["null row", { results: [null] }],
    ["invalid count", { ...FR_SEARCH_JSON, count: -1 }],
    ["missing identifier", { results: [{ title: "Example" }] }],
    ["missing title", { results: [{ document_number: FR_DOC_NUMBER }] }],
    [
      "non-array agencies",
      { results: [{ ...FR_SEARCH_JSON.results[0], agencies: {} }] },
    ],
    [
      "null agency",
      { results: [{ ...FR_SEARCH_JSON.results[0], agencies: [null] }] },
    ],
    [
      "invalid date",
      {
        results: [
          { ...FR_SEARCH_JSON.results[0], publication_date: "2099-02-30" },
        ],
      },
    ],
  ])(
    "rejects malformed Federal Register search: %s",
    async (_label, payload) => {
      installFetch({ "documents.json": () => reply(JSON.stringify(payload)) });
      const res = await call("/api/search?source=federal-register&q=example");
      expect(res.status).toBe(502);
      expect(await res.json()).toMatchObject({
        ok: false,
        error: "bad_upstream",
      });
      expect(cacheEntries.size).toBe(0);
    },
  );

  it("preserves a validated empty Federal Register response", async () => {
    installFetch({ "documents.json": () => reply({ count: 0, results: [] }) });
    const res = await call("/api/search?source=federal-register&q=example");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, total: 0, results: [] });
  });

  it.each(["2099-00002", undefined])(
    "rejects mismatched or missing metadata identity %s before reading text",
    async (document_number) => {
      installFetch({
        [`/documents/${FR_DOC_NUMBER}.json`]: () =>
          reply({ ...FR_SEARCH_JSON.results[0], document_number }),
        [`/html/${FR_DOC_NUMBER}.htm`]: () => reply(FR_HTML, 200, "text/html"),
      });
      const res = await call(
        `/api/policy?source=federal-register&id=${FR_DOC_NUMBER}`,
      );
      expect(res.status).toBe(502);
      expect(await res.json()).toMatchObject({ error: "bad_upstream" });
      expect(calls).toHaveLength(1);
      expect(cacheEntries.size).toBe(0);
    },
  );

  it("normalizes a GovInfo granule result in the live response shape", async () => {
    // Shape recorded from api.govinfo.gov/search on 2026-10-10.
    installFetch({
      "api.govinfo.gov": () =>
        reply({
          count: 630043,
          results: [
            {
              title: "Farewell Address to the Nation",
              packageId: "WCPD-2009-01-19",
              granuleId: "WCPD-2009-01-19-Pg79-2",
              lastModified: "2025-10-27T14:46:35Z",
              governmentAuthor: [
                "National Archives and Records Administration",
                "Office of the Federal Register",
              ],
              dateIssued: "2009-01-15",
              collectionCode: "CPD",
              relatedLink: null,
            },
            {
              title: "A package",
              packageId: "PKG-1",
              dateIssued: "2009-01-15",
            },
          ],
        }),
    });
    const res = await call("/api/search?source=govinfo&q=water", {
      DATA_GOV_API_KEY: "synthetic-key",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(630043);
    expect(body.results[0]).toMatchObject({
      identifier: "WCPD-2009-01-19/WCPD-2009-01-19-Pg79-2",
      issuingBody:
        "National Archives and Records Administration; Office of the Federal Register",
      kind: "CPD",
      date: "2009-01-15",
      officialUrl:
        "https://www.govinfo.gov/app/details/WCPD-2009-01-19/WCPD-2009-01-19-Pg79-2",
      textAvailable: false,
    });
    expect(body.results[1]).toMatchObject({
      identifier: "PKG-1",
      issuingBody: "Not stated",
      officialUrl: "https://www.govinfo.gov/app/details/PKG-1",
    });
  });

  it.each([
    ["govinfo", "example", "api.govinfo.gov", {}],
    ["regulations", "example", "api.regulations.gov", { data: [null] }],
    ["congress", "hr 1234 119", "api.congress.gov", {}],
  ])(
    "rejects malformed %s metadata without inventing a citation",
    async (source, query, host, payload) => {
      installFetch({ [String(host)]: () => reply(JSON.stringify(payload)) });
      const res = await call(
        `/api/search?source=${source}&q=${encodeURIComponent(String(query))}`,
        {
          DATA_GOV_API_KEY: "synthetic-key",
        },
      );
      expect(res.status).toBe(502);
      expect(await res.json()).toMatchObject({ error: "bad_upstream" });
    },
  );

  it.each(["0", "1.5", "51", "NaN"])(
    "refuses invalid pagination %s before any upstream call",
    async (page) => {
      installFetch({});
      const res = await call(`/api/search?q=example&page=${page}`);
      expect(res.status).toBe(400);
      expect(calls).toHaveLength(0);
    },
  );
});

describe("date and continuation contracts", () => {
  const keyed = { DATA_GOV_API_KEY: "synthetic-key" };
  const dates = {
    dateFrom: "2024-01-01",
    dateTo: "2024-12-31",
    continuation: null,
  };
  const route = (source: string, extra: Record<string, string> = {}) =>
    `/api/search?${new URLSearchParams({ source, q: "water", searchVersion: "1", ...extra })}`;

  it.each([
    [
      "federal-register",
      "documents.json",
      "conditions[publication_date][gte]",
      "conditions[publication_date][lte]",
    ],
    [
      "regulations",
      "api.regulations.gov",
      "filter[postedDate][ge]",
      "filter[postedDate][le]",
    ],
  ])(
    "passes inclusive %s year bounds to the provider and echoes them",
    async (source, host, from, to) => {
      installFetch({
        [host]: () =>
          reply(
            source === "regulations"
              ? { data: [], meta: { totalElements: 0 } }
              : { results: [], count: 0 },
          ),
      });
      const response = await call(
        route(source, { dateFrom: dates.dateFrom, dateTo: dates.dateTo }),
        keyed,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        criteria: searchCriteria(source, "water", 1, dates),
        continuation: { kind: "stopped", reason: "complete" },
      });
      const url = new URL(calls[0].url);
      expect(url.searchParams.get(from)).toBe("2024-01-01");
      expect(url.searchParams.get(to)).toBe("2024-12-31");
      expect(calls).toHaveLength(1);
    },
  );

  it.each<Record<string, string>>([
    { dateFrom: "2024-02-30", dateTo: "2024-12-31" },
    { dateFrom: "2024-12-31", dateTo: "2024-01-01" },
    { dateFrom: "2024-01-01" },
    { dateTo: "2024-12-31" },
    { searchVersion: "3" },
    { continuation: "broken json" },
    { continuation: "X".repeat(MAX_CONTINUATION_LENGTH + 1) },
  ])("rejects malformed criteria before fetching: %j", async (extra) => {
    installFetch({});
    const response = await call(route("federal-register", extra));
    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it.each([
    ["regulations", "21"],
    ["govinfo", "51"],
    ["federal-register", "51"],
    ["congress", "2"],
    ["washington", "2"],
  ])("rejects %s page %s without upstream work", async (source, page) => {
    installFetch({});
    expect((await call(route(source, { page }), keyed)).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it.each(["congress", "washington"])(
    "does not silently ignore %s date criteria",
    async (source) => {
      installFetch({});
      const response = await call(
        route(source, { dateFrom: dates.dateFrom, dateTo: dates.dateTo }),
        keyed,
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: "unsupported_criteria",
      });
      expect(calls).toHaveLength(0);
    },
  );

  it("composes only safe GovInfo dated terms and preserves its opaque cursor exactly", async () => {
    const fetch = vi
      .fn()
      .mockImplementationOnce(() =>
        Promise.resolve(
          reply({ count: 100, results: [], offsetMark: "opaque+/=one" }),
        ),
      )
      .mockImplementationOnce(() =>
        Promise.resolve(
          reply({ count: 100, results: [], offsetMark: "opaque+/=two" }),
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const first = await (
      await call(
        route("govinfo", { dateFrom: dates.dateFrom, dateTo: dates.dateTo }),
        keyed,
      )
    ).json();
    const second = await call(
      route("govinfo", {
        dateFrom: dates.dateFrom,
        dateTo: dates.dateTo,
        page: "2",
        continuation: JSON.stringify(first.continuation.next),
      }),
      keyed,
    );
    expect(second.status).toBe(200);
    expect(first.continuation).toMatchObject({
      kind: "more",
      next: {
        page: 2,
        cursor: "opaque+/=one",
        historical: false,
        resultLevel: "default",
      },
    });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      query: "(water) AND publishdate:range(2024-01-01,2024-12-31)",
      pageSize: 10,
      offsetMark: "*",
      historical: false,
      resultLevel: "default",
    });
    expect(JSON.parse(fetch.mock.calls[1][1].body).offsetMark).toBe(
      "opaque+/=one",
    );
    expect((await second.json()).criteria.cursor).toBe("opaque+/=one");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    "water OR land",
    '"water quality"',
    "water) OR publishdate:range(1900-01-01,2099-01-01)",
    "collection:FR",
    "water\\quality",
  ])(
    "refuses unsafe dated GovInfo expression %s before fetching",
    async (q) => {
      installFetch({});
      const response = await call(
        route("govinfo", { q, dateFrom: dates.dateFrom, dateTo: dates.dateTo }),
        keyed,
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: "unsupported_criteria",
      });
      expect(calls).toHaveLength(0);
    },
  );

  it.each([
    undefined,
    null,
    "",
    "*",
    "X".repeat(4097),
    "bad token",
    { next: "x" },
    "opaque-current",
  ])(
    "stops unknown GovInfo continuation %j without treating it as exhaustion",
    async (offsetMark) => {
      installFetch({
        "api.govinfo.gov": () => reply({ count: 0, results: [], offsetMark }),
      });
      const cursor = nextSearchCursor(
        searchCriteria("govinfo", "water", 1),
        "opaque-current",
      );
      const response = await call(
        route("govinfo", { page: "2", continuation: JSON.stringify(cursor) }),
        keyed,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        results: [],
        continuation: { kind: "stopped", reason: "unknown" },
      });
      expect(calls).toHaveLength(1);
    },
  );

  it("does not infer GovInfo exhaustion from a zero total or empty page with a valid next token", async () => {
    installFetch({
      "api.govinfo.gov": () =>
        reply({ count: 0, results: [], offsetMark: "opaque-next" }),
    });
    expect(await (await call(route("govinfo"), keyed)).json()).toMatchObject({
      continuation: { kind: "more", next: { cursor: "opaque-next" } },
    });
  });

  it.each([
    { source: "regulations" },
    { query: "land" },
    { dateFrom: "2024-01-01", dateTo: "2024-12-31" },
    { page: 3 },
    { pageSize: 20 },
    { sort: "relevance" },
    { resultLevel: "package" },
    { historical: true },
    { cursor: "X".repeat(4097) },
  ])(
    "rejects mismatched GovInfo continuation %j before fetching",
    async (patch) => {
      installFetch({});
      const cursor = {
        ...nextSearchCursor(
          searchCriteria("govinfo", "water", 1),
          "opaque-next",
        ),
        ...patch,
      };
      expect(
        (
          await call(
            route("govinfo", {
              page: "2",
              continuation: JSON.stringify(cursor),
            }),
            keyed,
          )
        ).status,
      ).toBe(400);
      expect(calls).toHaveLength(0);
    },
  );

  it.each([
    ["federal-register", 50, "documents.json", 500, "complete"],
    ["regulations", 20, "api.regulations.gov", 200, "complete"],
    ["federal-register", 50, "documents.json", null, "cap"],
    ["regulations", 20, "api.regulations.gov", null, "cap"],
  ])(
    "reports %s page %s (%s) with total %s as %s",
    async (sourceValue, pageValue, hostValue, total, reason) => {
      const source = String(sourceValue),
        page = Number(pageValue);
      installFetch({
        [String(hostValue)]: () =>
          reply(
            source === "regulations"
              ? { data: [], meta: { totalElements: total } }
              : { results: [], count: total },
          ),
      });
      const cursor = nextSearchCursor({
        ...searchCriteria(source, "water", 1),
        page: page - 1,
      });
      const response = await call(
        route(source, {
          page: String(page),
          continuation: JSON.stringify(cursor),
        }),
        keyed,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        total,
        continuation: { kind: "stopped", reason },
      });
      expect(calls).toHaveLength(1);
    },
  );

  it.each([
    ["federal-register", 50, "documents.json"],
    ["regulations", 20, "api.regulations.gov"],
    ["govinfo", 50, "api.govinfo.gov"],
  ])(
    "marks the %s page %s demo cap explicitly",
    async (sourceValue, pageValue, hostValue) => {
      const source = String(sourceValue),
        page = Number(pageValue);
      installFetch({
        [hostValue]: () =>
          reply(
            source === "regulations"
              ? { data: [], meta: { totalElements: 10000 } }
              : { results: [], count: 10000, offsetMark: "opaque-next" },
          ),
      });
      const previous = {
        ...searchCriteria(source, "water", 1),
        page: page - 1,
      };
      const cursor = nextSearchCursor(
        previous,
        source === "govinfo" ? "opaque-current" : null,
      );
      const response = await call(
        route(source, {
          page: String(page),
          continuation: JSON.stringify(cursor),
        }),
        keyed,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        continuation: { kind: "stopped", reason: "cap" },
      });
    },
  );

  it("rejects more than ten upstream listings", async () => {
    installFetch({
      "documents.json": () =>
        reply({
          count: 100,
          results: Array(11).fill(FR_SEARCH_JSON.results[0]),
        }),
    });
    const response = await call(route("federal-register"));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: "bad_upstream" });
  });
});

describe("search contract v1 stays byte-identical", () => {
  // Pinned from the 0.8.0 Worker (14bf61e) before v2 existed. The published page
  // checks the criteria echo exactly, so a v1 answer must never change, even
  // when a provider returns the v2 fields anyway.
  const at = "2099-01-07T12:00:00.000Z";
  const v1Criteria = (source: string, query: string, sort: string) => ({
    version: 1,
    source,
    query,
    dateFrom: null,
    dateTo: null,
    page: 1,
    pageSize: 10,
    sort,
    resultLevel: null,
    historical: null,
    cursor: null,
  });
  const frRow = (id: string, title: string, date: string) => ({
    sourceId: "federal-register",
    identifier: `FR Doc. ${id}`,
    title,
    issuingBody: "Not stated",
    kind: "Proposed Rule",
    date,
    officialUrl: `https://www.federalregister.gov/d/${id}`,
    textUrl: null,
    retrievedAt: at,
    summary: null,
    textAvailable: true,
    matchKey: `fr:${id}`,
  });
  const regRow = (
    id: string,
    title: string,
    kind: string,
    date: string,
    matchKey: string | null,
  ) => ({
    sourceId: "regulations",
    identifier: id,
    title,
    issuingBody: "EX",
    kind,
    date,
    officialUrl: `https://www.regulations.gov/document/${id}`,
    textUrl: null,
    retrievedAt: at,
    summary: null,
    textAvailable: false,
    matchKey,
  });
  const frCriteria = v1Criteria(
    "federal-register",
    "salmon habitat",
    "relevance",
  );
  const FR_V1 = JSON.stringify({
    ok: true,
    source: "federal-register",
    query: "salmon habitat",
    total: 753,
    page: 1,
    results: [
      frRow("2026-19346", FR_PROBE_ROWS[0].title, "2026-09-22"),
      frRow(
        "2026-12955",
        "Process for Authorizing Seasonal Migratory Game Bird Hunting",
        "2026-06-26",
      ),
    ],
    retrievedAt: at,
    criteria: frCriteria,
    continuation: { kind: "more", next: { ...frCriteria, page: 2 } },
  });
  const REGULATIONS_V1 = JSON.stringify({
    ok: true,
    source: "regulations",
    query: "water",
    total: 2,
    page: 1,
    results: [
      regRow(
        "EX-2099-0001-0001",
        "Example proposed rule, as the docket lists it",
        "Proposed Rule",
        "2099-01-05",
        `fr:${FR_DOC_NUMBER}`,
      ),
      regRow(
        "EX-2099-0001-0002",
        "Example supporting material",
        "Supporting & Related Material",
        "2099-01-06",
        null,
      ),
    ],
    retrievedAt: at,
    criteria: v1Criteria("regulations", "water", "-postedDate"),
    continuation: { kind: "stopped", reason: "complete" },
  });
  const FR_V1_UPSTREAM =
    "https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=salmon+habitat&per_page=10&page=1&order=relevance&fields%5B%5D=document_number&fields%5B%5D=title&fields%5B%5D=type&fields%5B%5D=agencies&fields%5B%5D=publication_date&fields%5B%5D=html_url&fields%5B%5D=abstract&fields%5B%5D=citation";
  const REGULATIONS_V1_UPSTREAM =
    "https://api.regulations.gov/v4/documents?filter%5BsearchTerm%5D=water&page%5Bsize%5D=10&page%5Bnumber%5D=1&sort=-postedDate";

  it.each([
    ["no version", "/api/search?source=federal-register&q=salmon%20habitat"],
    [
      "searchVersion=1",
      "/api/search?source=federal-register&q=salmon%20habitat&searchVersion=1",
    ],
  ])(
    "answers a Federal Register request with %s in the 0.8.0 bytes",
    async (_label, path) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(at));
      installFetch({
        "documents.json": () => reply({ count: 753, results: FR_PROBE_ROWS }),
      });
      try {
        expect(await (await call(path)).text()).toBe(FR_V1);
        expect(calls.map((c) => c.url)).toEqual([FR_V1_UPSTREAM]);
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it.each([
    ["no version", "/api/search?source=regulations&q=water"],
    [
      "searchVersion=1",
      "/api/search?source=regulations&q=water&searchVersion=1",
    ],
  ])(
    "answers a Regulations.gov request with %s in the 0.8.0 bytes",
    async (_label, path) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(at));
      installFetch({ "api.regulations.gov": () => reply(REGULATIONS_V2_JSON) });
      try {
        expect(
          await (
            await call(path, { DATA_GOV_API_KEY: "synthetic-key" })
          ).text(),
        ).toBe(REGULATIONS_V1);
        expect(calls.map((c) => c.url)).toEqual([REGULATIONS_V1_UPSTREAM]);
      } finally {
        vi.useRealTimers();
      }
    },
  );
});

describe("search contract v2", () => {
  const keyed = { DATA_GOV_API_KEY: "synthetic-key" };
  const v2 = (source: string, extra: Record<string, string> = {}) =>
    `/api/search?${new URLSearchParams({ source, q: "salmon habitat", searchVersion: "2", ...extra })}`;
  const options = (extra: object = {}) => ({
    dateFrom: null,
    dateTo: null,
    continuation: null,
    version: 2 as const,
    ...extra,
  });
  const upstream = () => new URL(calls[0].url).searchParams;
  const frRoute = (
    results: unknown[] = FR_PROBE_ROWS,
    count = results.length,
  ) => installFetch({ "documents.json": () => reply({ count, results }) });
  const regulationsRoute = (data: unknown[] = REGULATIONS_V2_JSON.data) =>
    installFetch({
      "api.regulations.gov": () =>
        reply({ data, meta: { totalElements: data.length } }),
    });

  it("maps each Federal Register field verbatim and asks for them only on v2", async () => {
    frRoute();
    const res = await call(v2("federal-register"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.criteria).toEqual(
      searchCriteria("federal-register", "salmon habitat", 1, options()),
    );
    expect(body.criteria).toMatchObject({
      version: 2,
      match: "text",
      documentType: null,
    });
    expect(body.results[0]).toMatchObject({
      commentsCloseOn: "2026-10-22",
      docketIds: ["Docket No. 260916-0002"],
      rins: ["0648-BO46"],
      topics: [
        "Fisheries",
        "Fishing",
        "Reporting and recordkeeping requirements",
      ],
    });
    // Only title and part survive; chapter and citation_url are not whitelisted.
    expect(body.results[0].cfrRefs).toEqual([
      { title: 50, part: "300" },
      { title: 50, part: "660" },
    ]);
    expect(body.results[1].docketIds).toEqual([
      "Docket No. FWS-HQ-MB-2024-0206",
      "FF09M32000-267-FXMB1231099BPP0",
    ]);
    expect(upstream().getAll("fields[]")).toEqual([
      "document_number",
      "title",
      "type",
      "agencies",
      "publication_date",
      "html_url",
      "abstract",
      "citation",
      "comments_close_on",
      "docket_ids",
      "regulation_id_numbers",
      "cfr_references",
      "topics",
    ]);
    expect(upstream().get("conditions[term]")).toBe("salmon habitat");
    expect(upstream().get("order")).toBe("relevance");
    expect(JSON.stringify(body)).not.toMatch(/html_url|citation_url|chapter/);
  });

  it("drops malformed or oversized Federal Register fields without failing the row", async () => {
    frRoute([
      {
        ...FR_PROBE_ROWS[0],
        comments_close_on: "2026-02-30",
        docket_ids: "Docket No. 1",
        regulation_id_numbers: ["0648-BO46", "0648-bo46", 7, null, "x"],
        cfr_references: [
          { title: 51, part: "1" },
          { title: 50, part: "0" },
          null,
          "50 CFR 1",
          { title: "50", part: "1" },
          { title: 50, part: "20-10" },
          { title: 50.5, part: "1" },
          { title: 50, part: null, chapter: "VI" },
          { title: 50, part: "1-50", chapter: "I" },
        ],
        topics: [
          "Fisheries",
          "",
          " padded",
          3,
          "x".repeat(201),
          "line\nbreak",
          { name: "Fishing" },
        ],
      },
      {
        ...FR_PROBE_ROWS[1],
        comments_close_on: null,
        docket_ids: Array.from({ length: 25 }, (_, i) => `Docket No. ${i}`),
        regulation_id_numbers: null,
        cfr_references: {},
        topics: undefined,
      },
      {
        ...FR_PROBE_ROWS[1],
        document_number: "2026-12956",
        comments_close_on: 20261022,
        docket_ids: ["Docket\u0001No. 1", "X".repeat(121), " Docket No. 2"],
      },
    ]);
    const res = await call(v2("federal-register"));
    expect(res.status).toBe(200);
    const [first, second, third] = (await res.json()).results;
    expect(first).not.toHaveProperty("commentsCloseOn");
    expect(first).not.toHaveProperty("docketIds");
    expect(first.rins).toEqual(["0648-BO46"]);
    expect(first.cfrRefs).toEqual([{ title: 50, part: "1-50" }]);
    expect(first.topics).toEqual(["Fisheries"]);
    expect(second.commentsCloseOn).toBeNull();
    expect(second.docketIds).toHaveLength(20);
    expect(second).not.toHaveProperty("rins");
    expect(second).not.toHaveProperty("cfrRefs");
    expect(second).not.toHaveProperty("topics");
    expect(third).not.toHaveProperty("commentsCloseOn");
    expect(third.docketIds).toEqual([]);
  });

  it.each<[string, string, Record<string, string>]>([
    [
      "docket",
      "Docket No. 260916-0002",
      { "conditions[docket_id]": "Docket No. 260916-0002" },
    ],
    ["rin", "0648-BO46", { "conditions[regulation_id_number]": "0648-BO46" }],
    [
      "cfr",
      "50 CFR 660",
      { "conditions[cfr][title]": "50", "conditions[cfr][part]": "660" },
    ],
  ])(
    "looks up a Federal Register %s %s exactly, newest first, without a text term",
    async (match, q, conditions) => {
      frRoute(FR_PROBE_ROWS.slice(0, 1));
      const res = await call(v2("federal-register", { q, match }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ query: q, total: 1 });
      expect(body.criteria).toEqual(
        searchCriteria("federal-register", q, 1, options({ match })),
      );
      expect(body.criteria).toMatchObject({ match, sort: "newest" });
      const params = upstream();
      for (const [name, value] of Object.entries(conditions))
        expect(params.getAll(name)).toEqual([value]);
      expect(params.has("conditions[term]")).toBe(false);
      expect(params.get("order")).toBe("newest");
      expect([...params.keys()].some((key) => key.includes("near"))).toBe(
        false,
      );
    },
  );

  // Held until the terms page is read and each parameter has its bounded live call.
  it.runIf(!REGULATIONS_V2_CONFIRMED)(
    "sends Regulations.gov no docket lookup, type filter or comment date until confirmed",
    async () => {
      regulationsRoute();
      for (const extra of [
        { q: "EX-2099-0001", match: "docket" },
        { documentType: "RULE" },
      ] as Record<string, string>[]) {
        const res = await call(v2("regulations", extra), keyed);
        expect(res.status).toBe(400);
        expect(await res.json()).toMatchObject({
          error: "unsupported_criteria",
        });
      }
      expect(calls).toHaveLength(0);
      const body = await (
        await call(v2("regulations", { q: "water" }), keyed)
      ).json();
      expect(upstream().get("filter[searchTerm]")).toBe("water");
      expect(upstream().has("filter[documentType]")).toBe(false);
      expect(body.criteria).toEqual(
        searchCriteria("regulations", "water", 1, options()),
      );
      // The provider states a closing date and docket; neither is passed on yet.
      for (const field of [
        "commentsCloseOn",
        "commentsCloseWithheld",
        "docketIds",
      ])
        expect(body.results[0]).not.toHaveProperty(field);
    },
  );

  it.skipIf(!REGULATIONS_V2_CONFIRMED)(
    "looks up a Regulations.gov docket exactly and states its comment dates and docket",
    async () => {
      regulationsRoute();
      const res = await call(
        v2("regulations", { q: "EX-2099-0001", match: "docket" }),
        keyed,
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.criteria).toEqual(
        searchCriteria(
          "regulations",
          "EX-2099-0001",
          1,
          options({ match: "docket" }),
        ),
      );
      expect(upstream().get("filter[docketId]")).toBe("EX-2099-0001");
      expect(upstream().has("filter[searchTerm]")).toBe(false);
      expect(body.results[0]).toMatchObject({
        commentsCloseOn: "2099-03-02",
        docketIds: ["EX-2099-0001"],
      });
      expect(body.results[1]).toMatchObject({
        commentsCloseOn: null,
        docketIds: ["EX-2099-0001"],
      });
      for (const field of ["rins", "cfrRefs", "topics"])
        expect(body.results[0]).not.toHaveProperty(field);
    },
  );

  it
    .skipIf(!REGULATIONS_V2_CONFIRMED)
    .each<[unknown, string | null | undefined, boolean]>([
      ["2099-03-02T23:59:59-05:00", "2099-03-02", false],
      ["2099-03-02T23:59:59.000-05:00", "2099-03-02", false],
      ["2099-03-02", "2099-03-02", false],
      // A UTC instant names no Eastern day without assuming a zone; never shown
      // late, and marked so the row never reads as having no comment period.
      ["2099-03-03T04:59:59Z", undefined, true],
      ["2099-03-03T04:59:59+00:00", undefined, true],
      ["2099-03-02T23:59:59", undefined, true],
      ["2099-02-30T23:59:59-05:00", undefined, true],
      ["soon", undefined, true],
      [20990302, undefined, true],
      [null, null, false],
      [undefined, undefined, false],
    ])(
    "reads Regulations.gov commentEndDate %j as %j (left out and marked: %j) without failing the row",
    async (commentEndDate, expected, withheld) => {
      regulationsRoute([
        {
          id: "EX-2099-0001-0001",
          attributes: {
            title: "Example",
            commentEndDate,
            docketId: 42,
          },
        },
      ]);
      const res = await call(v2("regulations", { q: "water" }), keyed);
      expect(res.status).toBe(200);
      const [row] = (await res.json()).results;
      if (expected === undefined)
        expect(row).not.toHaveProperty("commentsCloseOn");
      else expect(row.commentsCloseOn).toBe(expected);
      if (withheld) expect(row.commentsCloseWithheld).toBe(true);
      else expect(row).not.toHaveProperty("commentsCloseWithheld");
      expect(row).not.toHaveProperty("docketIds");
    },
  );

  it.each([
    ["RULE", "RULE"],
    ["PRORULE", "PRORULE"],
    ["NOTICE", "NOTICE"],
    ["PRESDOCU", "PRESDOCU"],
  ])(
    "filters the Federal Register to type %s with conditions[type][]",
    async (documentType, value) => {
      frRoute([]);
      const res = await call(v2("federal-register", { documentType }), keyed);
      expect(res.status).toBe(200);
      expect((await res.json()).criteria).toMatchObject({ documentType });
      expect(upstream().getAll("conditions[type][]")).toEqual([value]);
    },
  );

  it.skipIf(!REGULATIONS_V2_CONFIRMED).each([
    ["RULE", "Rule"],
    ["PRORULE", "Proposed Rule"],
    ["NOTICE", "Notice"],
  ])(
    "filters Regulations.gov type %s as documentType %s",
    async (documentType, value) => {
      regulationsRoute([]);
      const res = await call(v2("regulations", { documentType }), keyed);
      expect(res.status).toBe(200);
      expect((await res.json()).criteria).toMatchObject({ documentType });
      expect(upstream().getAll("filter[documentType]")).toEqual([value]);
    },
  );

  it.each<[string, Record<string, string>, string]>([
    // A source without the identifier or type refuses instead of searching unfiltered.
    ["regulations", { documentType: "PRESDOCU" }, "unsupported_criteria"],
    ["govinfo", { documentType: "RULE" }, "unsupported_criteria"],
    [
      "congress",
      { q: "hr 1234 119", documentType: "NOTICE" },
      "unsupported_criteria",
    ],
    [
      "washington",
      { q: "HB 1100", documentType: "RULE" },
      "unsupported_criteria",
    ],
    ["govinfo", { q: "EX-2099-0001", match: "docket" }, "unsupported_criteria"],
    ["congress", { q: "0648-BO46", match: "rin" }, "unsupported_criteria"],
    ["washington", { q: "50 CFR 660", match: "cfr" }, "unsupported_criteria"],
    ["regulations", { q: "0648-BO46", match: "rin" }, "unsupported_criteria"],
    ["regulations", { q: "50 CFR 660", match: "cfr" }, "unsupported_criteria"],
    // Malformed identifiers, kinds and types.
    ["federal-register", { q: "0648-bo46", match: "rin" }, "bad_query"],
    ["federal-register", { q: "51 CFR 1", match: "cfr" }, "bad_query"],
    ["federal-register", { q: "50 CFR 0", match: "cfr" }, "bad_query"],
    ["federal-register", { q: "50 CFR 20-10", match: "cfr" }, "bad_query"],
    // A part range: how the Federal Register matches one is unconfirmed.
    ["federal-register", { q: "40 CFR 1-50", match: "cfr" }, "bad_query"],
    ["federal-register", { q: "050 CFR 1", match: "cfr" }, "bad_query"],
    ["federal-register", { q: "50 CFR 1 OR 2", match: "cfr" }, "bad_query"],
    [
      "federal-register",
      { q: "Docket\u0001No. 1", match: "docket" },
      "bad_query",
    ],
    ["federal-register", { q: "X".repeat(121), match: "docket" }, "bad_query"],
    ...["EX-1,EX-2", "EX 2099"].map(
      (q) =>
        [
          "regulations",
          { q, match: "docket" },
          REGULATIONS_V2_CONFIRMED ? "bad_query" : "unsupported_criteria",
        ] as [string, Record<string, string>, string],
    ),
    ["federal-register", { match: "keyword" }, "bad_query"],
    ["federal-register", { match: "" }, "bad_query"],
    ["federal-register", { documentType: "rule" }, "bad_query"],
    ["federal-register", { documentType: "" }, "bad_query"],
    // v2 parameters never ride on a v1 or versionless request.
    ["federal-register", { searchVersion: "1", match: "docket" }, "bad_query"],
    [
      "federal-register",
      { searchVersion: "1", documentType: "RULE" },
      "bad_query",
    ],
    ["federal-register", { searchVersion: "3" }, "bad_query"],
  ])(
    "refuses %s %j before any upstream call (%s)",
    async (source, extra, error) => {
      installFetch({});
      const res = await call(v2(source, extra), keyed);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ ok: false, error });
      expect(calls).toHaveLength(0);
    },
  );

  it("refuses v2 parameters on a request without searchVersion", async () => {
    installFetch({});
    for (const extra of ["match=docket", "documentType=RULE"]) {
      const res = await call(
        `/api/search?source=federal-register&q=Docket%20No.%201&${extra}`,
      );
      expect(res.status).toBe(400);
    }
    expect(calls).toHaveLength(0);
  });

  it("continues an identifier search only with its own complete v2 envelope", async () => {
    frRoute(FR_PROBE_ROWS, 25);
    const q = "Docket No. 260916-0002";
    const first = await (
      await call(v2("federal-register", { q, match: "docket" }))
    ).json();
    const next = first.continuation.next;
    expect(next).toEqual(
      nextSearchCursor(
        searchCriteria("federal-register", q, 1, options({ match: "docket" })),
      ),
    );
    const page = (continuation: object) =>
      call(
        v2("federal-register", {
          q,
          match: "docket",
          page: "2",
          continuation: JSON.stringify(continuation),
        }),
      );
    expect((await page(next)).status).toBe(200);
    expect(new URL(calls[1].url).searchParams.get("page")).toBe("2");
    const v1Next = nextSearchCursor(searchCriteria("federal-register", q, 1));
    for (const wrong of [
      v1Next,
      { ...next, match: "rin" },
      { ...next, documentType: "RULE" },
      { ...next, version: 1 },
      { ...next, sort: "relevance" },
    ])
      expect((await page(wrong)).status).toBe(400);
    expect(calls).toHaveLength(2);
  });

  it("echoes v2 text criteria for a source without v2 fields and adds none", async () => {
    installFetch({
      "api.govinfo.gov": () =>
        reply({
          count: 1,
          results: [{ packageId: "PKG-1", title: "A package" }],
        }),
    });
    const body = await (await call(v2("govinfo"), keyed)).json();
    expect(body.criteria).toEqual(
      searchCriteria("govinfo", "salmon habitat", 1, options()),
    );
    for (const field of [
      "commentsCloseOn",
      "commentsCloseWithheld",
      "docketIds",
      "rins",
      "cfrRefs",
      "topics",
    ])
      expect(body.results[0]).not.toHaveProperty(field);
  });
});

describe("bounded transport", () => {
  it("keeps the fetch timeout effective after response headers arrive", async () => {
    const timeout = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (_input: URL, init: RequestInit) =>
          new Response(
            new ReadableStream({
              start(controller) {
                init.signal?.addEventListener("abort", () => {
                  controller.error(
                    new DOMException("synthetic timeout", "AbortError"),
                  );
                });
              },
            }),
          ),
      ),
    );
    const pending = officialFetch("https://www.govinfo.gov/x");
    await Promise.resolve();
    timeout.abort();
    await expect(pending).rejects.toMatchObject({
      code: "upstream_unreachable",
      httpStatus: 504,
    });
    expect(AbortSignal.timeout).toHaveBeenCalledWith(12_000);
  });

  it("normalizes a response-body failure without exposing its text", async () => {
    installFetch({
      "documents.json": () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new Error("private-upstream-detail"));
            },
          }),
        ),
    });
    const res = await call("/api/search?q=example");
    expect(res.status).toBe(504);
    const body = await res.text();
    expect(body).toContain("upstream_unreachable");
    expect(body).not.toContain("private-upstream-detail");
  });

  it.each([
    ["45", "45"],
    ["999999999", "86400"],
    ["invalid", "60"],
  ])("preserves a bounded source Retry-After %s", async (header, expected) => {
    const cancel = vi.fn();
    installFetch({
      "documents.json": () =>
        new Response(new ReadableStream({ cancel }), {
          status: 429,
          headers: { "retry-after": header },
        }),
    });
    const res = await call("/api/search?q=example");
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe(expected);
    expect(res.headers.get("access-control-expose-headers")).toBe(
      "Retry-After",
    );
    expect(await res.json()).toMatchObject({ error: "upstream_rate_limited" });
    expect(cancel).toHaveBeenCalledOnce();
    expect(calls).toHaveLength(1);
  });

  it.each<[number, Record<string, string>, string]>([
    [302, { location: "https://example.com/" }, "redirect_refused"],
    [200, { "content-length": "1500001" }, "too_large"],
  ])(
    "cancels a refused response before reading its body (%s)",
    async (status, headers, code) => {
      const cancel = vi.fn();
      installFetch({
        "www.govinfo.gov": () =>
          new Response(new ReadableStream({ cancel }), {
            status,
            headers,
          }),
      });
      await expect(
        officialFetch("https://www.govinfo.gov/x"),
      ).rejects.toMatchObject({ code });
      expect(cancel).toHaveBeenCalledOnce();
    },
  );

  it("accepts the exact byte limit and cancels a stream that exceeds it", async () => {
    const cancel = vi.fn();
    installFetch({
      "www.govinfo.gov": () => reply("x".repeat(1_500_000), 200, "text/plain"),
    });
    expect(
      (await officialFetch("https://www.govinfo.gov/x")).bytes.byteLength,
    ).toBe(1_500_000);
    installFetch({
      "www.govinfo.gov": () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(1_500_001));
            },
            cancel,
          }),
        ),
    });
    await expect(
      officialFetch("https://www.govinfo.gov/x"),
    ).rejects.toMatchObject({ code: "too_large" });
    expect(cancel).toHaveBeenCalledOnce();
  });
});

describe("optional policy cache", () => {
  function policyRoutes() {
    installFetch({
      [`/documents/${FR_DOC_NUMBER}.json`]: () =>
        reply(FR_SEARCH_JSON.results[0]),
      [`/html/${FR_DOC_NUMBER}.htm`]: () => reply(FR_HTML, 200, "text/html"),
    });
  }
  const path = `/api/policy?source=federal-register&id=${FR_DOC_NUMBER}`;

  it("caches by document and engine identity without retaining unrelated query values", async () => {
    policyRoutes();
    cacheEntries.set(
      `https://cache.policy-sentinel-demo.invalid${path}`,
      reply({ old: true }),
    );
    const first = await call(`${path}&q=never-retain-this&extra=also-private`);
    const firstBody = await first.json();
    expect(first.status).toBe(200);
    const second = await call(path);
    expect(await second.json()).toEqual(firstBody);
    expect(calls).toHaveLength(2);
    const newKeys = [...cacheEntries.keys()].filter(
      (key) => !key.includes("/api/policy?"),
    );
    expect(newKeys).toHaveLength(1);
    expect(newKeys[0]).toContain("demo-policy-2");
    expect(newKeys[0]).toContain(
      encodeURIComponent(ENGINE_INFO.parserConfigDigest),
    );
    expect(newKeys[0]).toContain(encodeURIComponent(ENGINE_INFO.rulesVersion));
    expect(newKeys[0]).not.toMatch(/never-retain|also-private/);
    expect(await cacheEntries.get(newKeys[0])?.clone().text()).not.toMatch(
      /never-retain|also-private/,
    );
  });

  it.each(["missing", "match", "put"])(
    "keeps a completed policy read usable when cache is %s",
    async (failure) => {
      policyRoutes();
      if (failure === "missing") vi.stubGlobal("caches", undefined);
      if (failure === "match")
        cache.match = vi.fn(async () => {
          throw new Error("cache unavailable");
        });
      if (failure === "put")
        cache.put = vi.fn(async () => {
          throw new Error("cache unavailable");
        });
      const res = await call(path);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.receipt.sha256).toBe(
        createHash("sha256").update(FR_HTML).digest("hex"),
      );
      expect(calls).toHaveLength(2);
    },
  );
});

describe("Washington source dates", () => {
  it.each([
    ["1999-00", "01/13/99", "1999-01-13"],
    ["1999-00", "01/13/00", "2000-01-13"],
    ["2025-26", "01/13/26", "2026-01-13"],
  ])(
    "binds %s date %s to its stated century",
    async (biennium, date, expected) => {
      installFetch({
        "lawfilesext.leg.wa.gov": () =>
          reply(WA_HTML.replace("01/13/25", date), 200, "text/html"),
      });
      const res = await call(
        `/api/policy?source=washington&id=${encodeURIComponent(`HB 1100 ${biennium}`)}`,
      );
      expect(res.status).toBe(200);
      expect((await res.json()).citation.date).toBe(expected);
    },
  );

  it.each(["02/30/25", "01/13/99"])(
    "refuses invalid or conflicting source date %s",
    async (date) => {
      installFetch({
        "lawfilesext.leg.wa.gov": () =>
          reply(WA_HTML.replace("01/13/25", date), 200, "text/html"),
      });
      const res = await call(
        "/api/policy?source=washington&id=HB%201100%202025-26",
      );
      expect(res.status).toBe(502);
      expect(await res.json()).toMatchObject({ error: "bad_upstream" });
    },
  );
});

describe("exact keyed metadata identities", () => {
  const bill = {
    type: "HR",
    number: "1234",
    congress: 119,
    title: "Synthetic Bill Identity Test",
    introducedDate: "2025-01-05",
    originChamber: "House",
    latestAction: { text: "Referred to a committee." },
  };

  it("preserves metadata from the requested Congress bill", async () => {
    installFetch({ "api.congress.gov": () => reply({ bill }) });
    const res = await call("/api/search?source=congress&q=hr%201234%20119", {
      DATA_GOV_API_KEY: "synthetic-key",
    });
    expect(res.status).toBe(200);
    expect((await res.json()).results[0]).toMatchObject({
      identifier: "HR 1234, 119th Congress",
      title: bill.title,
      officialUrl:
        "https://www.congress.gov/bill/119th-congress/house-bill/1234",
      date: bill.introducedDate,
    });
  });

  it.each([
    [101, "101st"],
    [102, "102nd"],
    [103, "103rd"],
    [111, "111th"],
    [112, "112th"],
    [113, "113th"],
    [119, "119th"],
  ])(
    "uses the %s Congress ordinal in the citation and link",
    async (congress, ordinal) => {
      installFetch({
        "api.congress.gov": () => reply({ bill: { ...bill, congress } }),
      });
      const res = await call(
        `/api/search?source=congress&q=hr%201234%20${congress}`,
        { DATA_GOV_API_KEY: "synthetic-key" },
      );
      expect(res.status).toBe(200);
      expect((await res.json()).results[0]).toMatchObject({
        identifier: `HR 1234, ${ordinal} Congress`,
        officialUrl: `https://www.congress.gov/bill/${ordinal}-congress/house-bill/1234`,
      });
      expect(calls).toHaveLength(1);
    },
  );

  it.each<[string, Record<string, unknown>]>([
    ["type mismatch", { type: "S" }],
    ["number mismatch", { number: "1235" }],
    ["Congress mismatch", { congress: 118 }],
    ["missing type", { type: undefined }],
    ["missing number", { number: undefined }],
    ["missing Congress", { congress: undefined }],
    ["non-integer number", { number: 1234.5 }],
  ])(
    "rejects %s before constructing a Congress citation",
    async (_label, patch) => {
      installFetch({
        "api.congress.gov": () => reply({ bill: { ...bill, ...patch } }),
      });
      const res = await call("/api/search?source=congress&q=hr%201234%20119", {
        DATA_GOV_API_KEY: "synthetic-key",
      });
      expect(res.status).toBe(502);
      expect(await res.json()).toMatchObject({ error: "bad_upstream" });
    },
  );

  function metadataRoutes(source: string, ids: string[]) {
    installFetch(
      source === "govinfo"
        ? {
            "api.govinfo.gov": () =>
              reply({
                count: ids.length,
                results: ids.map((packageId) => ({
                  packageId,
                  title: "Synthetic package",
                })),
              }),
          }
        : {
            "api.regulations.gov": () =>
              reply({
                data: ids.map((id) => ({
                  id,
                  attributes: { title: "Synthetic docket document" },
                })),
                meta: { totalElements: ids.length },
              }),
          },
    );
  }

  it.each(["govinfo", "regulations"])(
    "preserves an exact valid %s identifier",
    async (source) => {
      const id = "X".repeat(80);
      metadataRoutes(source, [id]);
      const res = await call(`/api/search?source=${source}&q=example`, {
        DATA_GOV_API_KEY: "synthetic-key",
      });
      expect(res.status).toBe(200);
      expect((await res.json()).results[0].identifier).toBe(id);
    },
  );

  it.each<[string, string[]]>([
    ["govinfo", ["X".repeat(81)]],
    ["regulations", ["X".repeat(81)]],
    ["govinfo", ["  SAMPLE-1"]],
    ["regulations", ["SAMPLE-1  "]],
    ["govinfo", ["X".repeat(80) + "A", "X".repeat(80) + "B"]],
    ["regulations", ["X".repeat(80) + "A", "X".repeat(80) + "B"]],
  ])(
    "rejects a %s identity that would change during normalization: %j",
    async (source, ids) => {
      metadataRoutes(source, ids);
      const res = await call(`/api/search?source=${source}&q=example`, {
        DATA_GOV_API_KEY: "synthetic-key",
      });
      expect(res.status).toBe(502);
      expect(await res.json()).toMatchObject({ error: "bad_upstream" });
    },
  );
});

describe("cross-source match keys", () => {
  const keyed = { DATA_GOV_API_KEY: "synthetic-key" };
  const key = `fr:${FR_DOC_NUMBER}`;
  const matchKeys = async (res: Response) =>
    ((await res.json()) as { results: { matchKey: unknown }[] }).results.map(
      (row) => row.matchKey,
    );

  it("keys a Federal Register document by its number, the same in search and in the policy read", async () => {
    installFetch({
      "documents.json": () => reply(FR_SEARCH_JSON),
      [`/documents/${FR_DOC_NUMBER}.json`]: () =>
        reply(FR_SEARCH_JSON.results[0]),
      [`/html/${FR_DOC_NUMBER}.htm`]: () => reply(FR_HTML, 200, "text/html"),
    });
    const searched = (
      await (await call("/api/search?source=federal-register&q=water")).json()
    ).results[0];
    const read = (
      await (
        await call(`/api/policy?source=federal-register&id=${FR_DOC_NUMBER}`)
      ).json()
    ).citation;
    expect(searched.matchKey).toBe(key);
    expect(read).toMatchObject({
      matchKey: key,
      identifier: searched.identifier,
      officialUrl: searched.officialUrl,
    });
  });

  it("keeps a Federal Register row whose number cannot be a match key", async () => {
    installFetch({
      "documents.json": () =>
        reply({
          count: 1,
          results: [
            { ...FR_SEARCH_JSON.results[0], document_number: "-2099-0001" },
          ],
        }),
    });
    const res = await call("/api/search?source=federal-register&q=water");
    expect(res.status).toBe(200);
    expect(await matchKeys(res)).toEqual([null]);
  });

  // GovInfo names a Federal Register granule by its document number, for
  // example package FR-2024-06-18, granule 2024-12669 (read 2026-10-10).
  it("keys a GovInfo result only when it is a Federal Register granule", async () => {
    const issue = { packageId: "FR-2099-01-05", collectionCode: "FR" };
    installFetch({
      "api.govinfo.gov": () =>
        reply({
          count: 4,
          results: [
            { ...issue, title: "A notice", granuleId: FR_DOC_NUMBER },
            { ...issue, title: "A whole issue" },
            { ...issue, title: "An odd granule", granuleId: "2099_00001.x" },
            {
              title: "Another collection",
              packageId: "CFR-2099-title40-vol1",
              granuleId: FR_DOC_NUMBER,
              collectionCode: "CFR",
            },
          ],
        }),
    });
    const res = await call("/api/search?source=govinfo&q=water", keyed);
    expect(res.status).toBe(200);
    expect(await matchKeys(res)).toEqual([key, null, null, null]);
  });

  // The Regulations.gov v4 OpenAPI specification
  // (https://open.gsa.gov/api/regulationsgov/v4/openapi.yaml, read 2026-10-10)
  // defines frDocNum as a string, "The federal register document number of the
  // document.", in the Document schema of the GET /documents list response.
  // Every other shape below is outside that specification and must not fail the row.
  it("keys a Regulations.gov result by frDocNum and keeps the row whatever that field holds", async () => {
    const values: unknown[] = [
      FR_DOC_NUMBER,
      ` ${FR_DOC_NUMBER} `,
      undefined,
      null,
      "",
      209900001,
      [FR_DOC_NUMBER],
      `${FR_DOC_NUMBER}; 2099-00002`,
      "X".repeat(41),
    ];
    installFetch({
      "api.regulations.gov": () =>
        reply({
          data: values.map((frDocNum, index) => ({
            id: `EX-2099-0001-000${index}`,
            attributes: { title: "Synthetic docket document", frDocNum },
          })),
          meta: { totalElements: values.length },
        }),
    });
    const res = await call("/api/search?source=regulations&q=water", keyed);
    expect(res.status).toBe(200);
    expect(await matchKeys(res)).toEqual([
      key,
      key,
      ...Array<null>(7).fill(null),
    ]);
  });

  it("gives Congress.gov and Washington records no match key", async () => {
    installFetch({
      "api.congress.gov": () =>
        reply({
          bill: {
            type: "HR",
            number: "1234",
            congress: 119,
            title: "Synthetic Bill",
          },
        }),
      "lawfilesext.leg.wa.gov": () => reply(WA_HTML, 200, "text/html"),
    });
    const congress = await call(
      "/api/search?source=congress&q=hr%201234%20119",
      keyed,
    );
    const washington = await call("/api/search?source=washington&q=HB%201100");
    expect(await matchKeys(congress)).toEqual([null]);
    expect(await matchKeys(washington)).toEqual([null]);
  });

  it.each([
    ["hr 1234 119", true],
    ["SJRES12 99", true],
    ["hr 1234", false],
    ["water quality", false],
  ])(
    "accepts %s as a Congress.gov bill reference exactly when the shared grammar does: %s",
    async (query, accepted) => {
      installFetch({});
      const res = await call(
        `/api/search?source=congress&q=${encodeURIComponent(query)}`,
        keyed,
      );
      expect(isCongressReference(query)).toBe(accepted);
      // An accepted reference reaches the unrouted synthetic host and comes back as not found.
      expect(res.status).toBe(accepted ? 404 : 400);
      expect(calls).toHaveLength(accepted ? 1 : 0);
    },
  );
});

describe("Washington original bill rendition", () => {
  it.each([
    "SUBSTITUTE HOUSE BILL 1100",
    "ENGROSSED HOUSE BILL 1100",
    "SECOND SUBSTITUTE HOUSE BILL 1100",
    "SHB 1100",
    "EHB 1100",
    "CERTIFICATION OF ENROLLMENT HOUSE BILL 1100",
  ])("does not label %s as introduced", async (header) => {
    installFetch({
      "lawfilesext.leg.wa.gov": () =>
        reply(WA_HTML.replace("HOUSE BILL 1100", header), 200, "text/html"),
    });
    const res = await call(
      "/api/policy?source=washington&id=HB%201100%202025-26",
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: "bad_upstream" });
    expect(cacheEntries.size).toBe(0);
  });

  it("accepts an original source header split across inline markup", async () => {
    installFetch({
      "lawfilesext.leg.wa.gov": () =>
        reply(
          WA_HTML.replace("HOUSE BILL 1100", "HOUSE <span>BILL</span> 1100"),
          200,
          "text/html",
        ),
    });
    const res = await call(
      "/api/policy?source=washington&id=HB%201100%202025-26",
    );
    expect(res.status).toBe(200);
    expect((await res.json()).citation.identifier).toBe(
      "HB 1100, 2025-26 biennium, as introduced",
    );
  });
});
