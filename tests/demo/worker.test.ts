// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzePolicy, ENGINE_INFO } from "../../src/demo/analyze";
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
  FR_SEARCH_JSON,
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
    for (let i = 0; i < 60; i++) {
      const res = await call(
        `/api/search?source=federal-register&q=term${i}`,
        {},
        headers,
      );
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 40)).toEqual(Array(40).fill(200));
    expect(statuses.slice(40)).toEqual(Array(20).fill(429));
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

describe("Washington Legislature", () => {
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
