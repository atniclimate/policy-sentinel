// @vitest-environment node
// Release check 2026-11-18, Federal Register lane. Synthetic values only; the
// shapes follow the live Worker answers recorded that day.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { statesIdentifier } from "../../src/demo/discovery";
import worker from "../../worker/src/index";

let visitor = 0;
let upstreamUrls: string[] = [];

function route(results: unknown[], count = results.length) {
  upstreamUrls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string) => {
      upstreamUrls.push(String(input));
      return new Response(JSON.stringify({ count, results }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
}

const call = (
  path: string,
  origin: string,
  init: { method?: string; body?: object } = {},
) =>
  worker.fetch(
    new Request(`https://demo.example${path}`, {
      method: init.method ?? "GET",
      headers: {
        Origin: origin,
        "cf-connecting-ip": `2001:db8::${(++visitor).toString(16)}`,
        ...(init.body && { "Content-Type": "application/json" }),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    }),
    {},
  );

const row = (cfr_references: unknown) => ({
  document_number: "2099-00401",
  title: "Example Indian Child Welfare Procedures",
  type: "Rule",
  agencies: [{ name: "Example Department" }],
  publication_date: "2099-03-04",
  citation: "99 FR 4010",
  comments_close_on: null,
  docket_ids: [],
  regulation_id_numbers: [],
  cfr_references,
  topics: [],
});

const lookup = (q: string) =>
  call("/api/search", "http://localhost:5211", {
    method: "POST",
    body: {
      source: "federal-register",
      q,
      page: "1",
      searchVersion: "2",
      match: "cfr",
    },
  });

beforeEach(() => {
  vi.stubGlobal("caches", {
    default: { match: async () => undefined, put: async () => undefined },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Federal Register CFR lookup (release check)", () => {
  it("asks the Federal Register for the title and part pair its documentation names", async () => {
    route([
      row([{ chapter: null, citation_url: null, part: "23", title: 25 }]),
    ]);
    const res = await lookup("25 CFR 23");
    expect(res.status).toBe(200);
    const params = new URL(upstreamUrls[0]).searchParams;
    expect(params.get("conditions[cfr][title]")).toBe("25");
    expect(params.get("conditions[cfr][part]")).toBe("23");
    expect(params.has("conditions[term]")).toBe(false);
  });

  it("keeps a listing whose source states the part as a number, as older documents do", async () => {
    // Live 2026-11-18: all 6 documents for 25 CFR 23 came back with cfrRefs [] because the
    // part was a number and only strings were accepted, so the page kept none of them.
    route([row([{ chapter: null, citation_url: null, part: 23, title: 25 }])]);
    const body = await (await lookup("25 CFR 23")).json();
    expect(body.results[0].cfrRefs).toEqual([{ title: 25, part: "23" }]);
    expect(statesIdentifier(body.results[0], "cfr", "25 CFR 23")).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/citation_url|chapter/);
  });

  it("still drops a part that is not a positive whole number or a valid range", async () => {
    route([
      row([
        { title: 25, part: 0 },
        { title: 25, part: -4 },
        { title: 25, part: 23.5 },
        { title: 25, part: null },
        { title: 25, part: "" },
        { title: 25, part: "20-10" },
        { title: "25", part: 23 },
        { title: 25, part: 23 },
      ]),
    ]);
    const body = await (await lookup("25 CFR 23")).json();
    expect(body.results[0].cfrRefs).toEqual([{ title: 25, part: "23" }]);
  });

  it("keeps string parts and ranges unchanged", async () => {
    route([
      row([
        { title: 50, part: "660" },
        { title: 50, part: "1-50" },
      ]),
    ]);
    const body = await (await lookup("50 CFR 660")).json();
    expect(body.results[0].cfrRefs).toEqual([
      { title: 50, part: "660" },
      { title: 50, part: "1-50" },
    ]);
  });

  it("does not keep a listing that states a different part", async () => {
    route([row([{ title: 25, part: 24 }])]);
    const body = await (await lookup("25 CFR 23")).json();
    expect(statesIdentifier(body.results[0], "cfr", "25 CFR 23")).toBe(false);
  });
});

describe("Federal Register search contract version 1 as ATNI-ResIST sends it (release check)", () => {
  const resist = "https://atniclimate.github.io";

  it.each(["tribal consultation", "91 FR 57841"])(
    "answers a GET with no version for %s: 200, version 1 shape, no later fields",
    async (q) => {
      route([row([{ title: 25, part: 23 }])]);
      const res = await call(
        `/api/search?${new URLSearchParams({ source: "federal-register", q, page: "1" })}`,
        resist,
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("access-control-allow-origin")).toBe(resist);
      const body = await res.json();
      expect(
        new URL(upstreamUrls[0]).searchParams.get("conditions[term]"),
      ).toBe(q);
      expect(Object.keys(body).sort()).toEqual(
        [
          "criteria",
          "continuation",
          "ok",
          "page",
          "query",
          "results",
          "retrievedAt",
          "source",
          "total",
        ].sort(),
      );
      expect(Object.keys(body.results[0]).sort()).toEqual(
        [
          "date",
          "identifier",
          "issuingBody",
          "kind",
          "matchKey",
          "officialUrl",
          "retrievedAt",
          "sourceId",
          "summary",
          "textAvailable",
          "textUrl",
          "title",
        ].sort(),
      );
      expect(Object.keys(body.criteria)).not.toContain("match");
    },
  );
});
