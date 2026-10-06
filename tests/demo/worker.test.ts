// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzePolicy } from "../../src/demo/analyze";
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
  const store = new Map<string, Response>();
  vi.stubGlobal("caches", {
    default: {
      match: async (req: Request) => store.get(req.url)?.clone(),
      put: async (req: Request, res: Response) =>
        void store.set(req.url, res.clone()),
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

const call = (
  path: string,
  env: Env = {},
  headers: Record<string, string> = { Origin: ORIGIN },
  method = "GET",
) =>
  worker.fetch(
    new Request(`https://demo.example${path}`, { method, headers }),
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

  it("rate limits with the in-memory guard when no binding answers", async () => {
    installFetch({ "documents.json": () => reply(FR_SEARCH_JSON) });
    const headers = { Origin: ORIGIN, "cf-connecting-ip": "203.0.113.77" };
    let limited = 0;
    for (let i = 0; i < 60; i++) {
      const res = await call(
        `/api/search?source=federal-register&q=term${i}`,
        {},
        headers,
      );
      if (res.status === 429) limited += 1;
    }
    expect(limited).toBeGreaterThan(0);
  });

  it("asks the rate-limit binding first when it exists", async () => {
    const limit = vi.fn(async () => ({ success: false }));
    const res = await call("/api/search?source=federal-register&q=abc", {
      RATE: { limit },
    });
    expect(res.status).toBe(429);
    expect(limit).toHaveBeenCalled();
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

  it("caches a successful read", async () => {
    installFetch({ "documents.json": () => reply(FR_SEARCH_JSON) });
    await call("/api/search?source=federal-register&q=cachedterm");
    await call("/api/search?source=federal-register&q=cachedterm");
    expect(calls).toHaveLength(1);
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
