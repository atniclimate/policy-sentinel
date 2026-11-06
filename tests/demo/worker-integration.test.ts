// @vitest-environment node
// The 0.9.1 Worker contract (step 11, lane W), driven through the default
// fetch handler with stubbed upstream answers: the version 2 catalog, version
// 3 court searches, version 3 policy reads with chain rows and the authority
// line, the Grants.gov detail read and the /api/related routes. Synthetic
// fixtures only; no live call.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { grantsDetailValue } from "../../src/demo/grants-authority";
import type { ChainRow } from "../../src/demo/links";
import type { DemoCitation } from "../../src/demo/types";
import worker, {
  ALLOWED_HOSTS,
  SOURCE_REGISTRY,
  sourceList,
  sourceListV2,
} from "../../worker/src/index";
import type { Env } from "../../worker/src/index";
import * as congressRelated from "../../worker/src/sources/congress-related";
import * as govinfoRelated from "../../worker/src/sources/govinfo-related";
import * as grantsDetail from "../../worker/src/sources/grants-detail";
import { CHAIN_MAX, policyV3 } from "../../worker/src/sources/shared";
import CONGRESS_RELATED from "./fixtures/courts/congress-relatedbills.json";
import RELATED_BILLS from "./fixtures/courts/govinfo-related-bills.json";
import RELATED from "./fixtures/courts/govinfo-related.json";
import SEARCH from "./fixtures/courts/uscourts-search.json";
import { FR_DOC_NUMBER, FR_HTML, FR_SEARCH_JSON, WA_HTML } from "./fixtures";

const ORIGIN = "https://atniclimate.github.io";
const KEYED: Env = { DATA_GOV_API_KEY: "synthetic-key" };
const GRANTS_BODY = readFileSync(
  new URL(
    "./fixtures/grants/fetch-opportunity.synthetic.json",
    import.meta.url,
  ),
  "utf8",
);
const V3_FIELDS = [
  "court",
  "docketNumber",
  "packageId",
  "lastModified",
  "caseCitationProvided",
  "assistanceListings",
  "authorityPassage",
  "versionDate",
  "correctionOf",
  "corrections",
  "authorityLine",
  "authorityLinePresent",
];

/** FR_HTML with a printed Authority line, as an amendatory rule prints one. */
const FR_HTML_AUTH = FR_HTML.replace(
  "[FR Doc. ",
  "PART 999--EXAMPLE WATER PROVISIONS\n\nAuthority: 25 U.S.C. 9; 42 U.S.C. 7401.\n\n[FR Doc. ",
);
/** WA_HTML with one full citation in the bill text. */
const WA_HTML_CITE = WA_HTML.replace(
  "This act takes effect July 1, 2025.",
  "This act takes effect July 1, 2025, as provided in 42 U.S.C. 7401.",
);

let calls: { url: string; init?: RequestInit }[] = [];
let cacheEntries: Map<string, Response>;
let visitor = 0;

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
      calls.push({ url, init });
      for (const [needle, make] of Object.entries(routes))
        if (url.includes(needle)) return make();
      return reply("not routed", 404, "text/plain");
    }),
  );
}

const get = (path: string, env: Env = {}) =>
  worker.fetch(
    new Request(`https://demo.example${path}`, {
      headers: {
        Origin: ORIGIN,
        "cf-connecting-ip": `2001:db8::7${(++visitor).toString(16)}`,
      },
    }),
    env,
  );

const post = (body: Record<string, string>, env: Env = KEYED) =>
  worker.fetch(
    new Request("https://demo.example/api/search", {
      method: "POST",
      headers: {
        Origin: ORIGIN,
        "Content-Type": "application/json",
        "cf-connecting-ip": `2001:db8::7${(++visitor).toString(16)}`,
      },
      body: JSON.stringify(body),
    }),
    env,
  );

const courtSearch = (extra: Record<string, string> = {}) =>
  post({
    source: "govinfo-courts",
    q: "water rights",
    page: "1",
    searchVersion: "3",
    match: "text",
    ...extra,
  });

function frRoutes(html: string, meta: object = FR_SEARCH_JSON.results[0]) {
  installFetch({
    [`/documents/${FR_DOC_NUMBER}.json`]: () => reply(meta),
    [`/html/${FR_DOC_NUMBER}.htm`]: () => reply(html, 200, "text/html"),
  });
}

const noV3Fields = (citation: Record<string, unknown>) =>
  V3_FIELDS.filter((key) => key in citation);

beforeEach(() => {
  cacheEntries = new Map();
  vi.stubGlobal("caches", {
    default: {
      match: vi.fn(async (req: Request) => cacheEntries.get(req.url)?.clone()),
      put: vi.fn(async (req: Request, res: Response) => {
        cacheEntries.set(req.url, res.clone());
      }),
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("source catalogs", () => {
  it("answers the version 2 catalog with a keyed govinfo-courts entry after GovInfo", async () => {
    for (const [env, status] of [
      [{}, "key_pending"],
      [KEYED, "live"],
    ] as const) {
      const res = await get("/api/sources?version=2", env);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        ok: true,
        version: 2,
        sources: sourceListV2(env),
      });
      const ids = body.sources.map((s: { id: string }) => s.id);
      expect(ids.indexOf("govinfo-courts")).toBe(ids.indexOf("govinfo") + 1);
      expect(ids.filter((id: string) => id !== "govinfo-courts")).toEqual(
        sourceList(env).map((s) => s.id),
      );
      const courts = body.sources[ids.indexOf("govinfo-courts")];
      expect(courts).toMatchObject({
        status,
        level: "federal",
        secret: "DATA_GOV_API_KEY",
      });
    }
  });

  it("keeps /api/sources without a version, other versions and /health on the version 1 list", async () => {
    for (const path of ["/api/sources", "/api/sources?version=1"]) {
      const body = await (await get(path, KEYED)).json();
      expect(body).toEqual({ ok: true, sources: sourceList(KEYED) });
    }
    const health = await (await get("/health", KEYED)).json();
    expect(health.sources).toEqual(sourceList(KEYED));
    expect(JSON.stringify(health)).not.toContain("govinfo-courts");
  });

  it("registers govinfo-courts without adding a host, and the related and detail modules' hosts are allowlisted", () => {
    expect(SOURCE_REGISTRY["govinfo-courts"].HOSTS).toEqual([
      "api.govinfo.gov",
    ]);
    for (const host of [
      ...govinfoRelated.HOSTS,
      ...congressRelated.HOSTS,
      ...grantsDetail.HOSTS,
    ])
      expect(ALLOWED_HOSTS.has(host), host).toBe(true);
  });
});

describe("version 3 court searches", () => {
  const serveSearch = () =>
    installFetch({ "api.govinfo.gov/search": () => reply(SEARCH) });
  const sentQuery = (i = 0) =>
    JSON.parse(String(calls[i].init?.body)).query as string;

  it("searches the seven courts without a court, and one court with it, in one upstream call", async () => {
    serveSearch();
    const res = await courtSearch();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const text = await res.text();
    const body = JSON.parse(text);
    expect(calls).toHaveLength(1);
    expect(sentQuery()).toContain(
      "courtcode:(ca9 OR cafc OR cofc OR wawd OR waed OR ord OR idd)",
    );
    expect(body.criteria).toMatchObject({
      version: 3,
      source: "govinfo-courts",
      match: "text",
      sort: "provider-default",
      resultLevel: "default",
      historical: false,
    });
    expect(body.results.length).toBeGreaterThan(0);
    for (const row of body.results as DemoCitation[])
      expect(row.sourceId).toBe("govinfo-courts");
    // The fixture's party and download fields never reach the answer.
    expect(text).not.toContain("Example Party");
    expect(text).not.toContain("pdfLink");

    serveSearch();
    expect((await courtSearch({ court: "ord" })).status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(sentQuery()).toContain("courtcode:(ord)");
  });

  it("answers not_resolvable for a U.S. Reports volume above 586 with no upstream call", async () => {
    installFetch({});
    const res = await courtSearch({ q: "600 U.S. 1", match: "us_reports" });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({
      ok: false,
      error: "not_resolvable",
    });
    expect(calls).toHaveLength(0);
  });

  it.each<[string, Record<string, string>, string]>([
    ["an unknown court", { court: "ca1" }, "bad_query"],
    [
      "a court on another source",
      { source: "federal-register", court: "ord", searchVersion: "2" },
      "bad_query",
    ],
    ["version 2", { searchVersion: "2" }, "unsupported_criteria"],
    ["version 1 with a match", { searchVersion: "1" }, "bad_query"],
    [
      "a docket with no court code",
      { q: "99-12345", match: "court_docket" },
      "bad_query",
    ],
    ["a match other sources use", { match: "docket" }, "unsupported_criteria"],
  ])("refuses %s before any upstream call", async (_name, extra, error) => {
    installFetch({});
    const res = await courtSearch(extra);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, error });
    expect(calls).toHaveLength(0);
  });

  it("answers key_pending without the key and makes no call", async () => {
    installFetch({});
    const res = await post(
      {
        source: "govinfo-courts",
        q: "water rights",
        searchVersion: "3",
      },
      {},
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "key_pending" });
    expect(calls).toHaveLength(0);
  });
});

describe("version 3 policy reads", () => {
  it("adds chain rows, the authority line and the correction fields for the Federal Register", async () => {
    frRoutes(FR_HTML_AUTH, {
      ...FR_SEARCH_JSON.results[0],
      correction_of:
        "https://www.federalregister.gov/api/v1/documents/2099-00009",
      corrections: [
        "https://www.federalregister.gov/api/v1/documents/2099-00010",
        "not a document address!",
      ],
    });
    const res = await get(
      `/api/policy?source=federal-register&id=${FR_DOC_NUMBER}&version=3`,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.version).toBe(3);
    const meta = new URL(calls[0].url).searchParams.getAll("fields[]");
    expect(meta).toEqual(
      expect.arrayContaining(["correction_of", "corrections"]),
    );
    expect(body.citation).toMatchObject({
      correctionOf: "2099-00009",
      corrections: ["2099-00010"],
      authorityLine: "25 U.S.C. 9; 42 U.S.C. 7401.",
      authorityLinePresent: true,
    });
    const rows = body.chain as ChainRow[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(CHAIN_MAX);
    const links = rows.filter((r) => r.kind === "link");
    expect(links.length).toBeGreaterThan(0);
    for (const row of links) {
      expect(row.basis).toBe("citation_in_text");
      expect(row.section).toBe("inText");
    }
    expect(rows.map((r) => r.sourceWording)).toContain("42 U.S.C. 7401");
    // The contact line the extractor drops never reaches a chain row.
    expect(JSON.stringify(rows)).not.toMatch(/555-123-4567|pat@example/);
  });

  it("says authorityLinePresent false when the text prints no Authority line", async () => {
    frRoutes(FR_HTML);
    const body = await (
      await get(
        `/api/policy?source=federal-register&id=${FR_DOC_NUMBER}&version=3`,
      )
    ).json();
    expect(body.citation.authorityLinePresent).toBe(false);
    expect("authorityLine" in body.citation).toBe(false);
    expect("correctionOf" in body.citation).toBe(false);
    expect("corrections" in body.citation).toBe(false);
  });

  it("leaves a read without version=3 unchanged, under its own cache entry", async () => {
    frRoutes(FR_HTML_AUTH);
    const v1 = await (
      await get(`/api/policy?source=federal-register&id=${FR_DOC_NUMBER}`)
    ).json();
    expect(new URL(calls[0].url).searchParams.getAll("fields[]")).not.toContain(
      "correction_of",
    );
    expect("version" in v1).toBe(false);
    expect("chain" in v1).toBe(false);
    expect(noV3Fields(v1.citation)).toEqual([]);
    expect(calls).toHaveLength(2);
    // A version 3 read does not reuse the version 1 cache entry, and the
    // version 1 entry still answers a version 1 read.
    const v3 = await (
      await get(
        `/api/policy?source=federal-register&id=${FR_DOC_NUMBER}&version=3`,
      )
    ).json();
    expect(v3.version).toBe(3);
    expect(calls).toHaveLength(4);
    const again = await (
      await get(`/api/policy?source=federal-register&id=${FR_DOC_NUMBER}`)
    ).json();
    expect(again).toEqual(v1);
    expect(calls).toHaveLength(4);
    expect(cacheEntries.size).toBe(2);
  });

  it("adds chain rows for a Washington bill and no Federal Register fields", async () => {
    installFetch({
      "lawfilesext.leg.wa.gov": () => reply(WA_HTML_CITE, 200, "text/html"),
    });
    const res = await get(
      "/api/policy?source=washington&id=HB%201100%202025-26&version=3",
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.version).toBe(3);
    expect(Array.isArray(body.chain)).toBe(true);
    expect((body.chain as ChainRow[]).map((r) => r.sourceWording)).toContain(
      "42 U.S.C. 7401",
    );
    expect(noV3Fields(body.citation)).toEqual([]);
    expect(calls).toHaveLength(1);

    installFetch({
      "lawfilesext.leg.wa.gov": () => reply(WA_HTML_CITE, 200, "text/html"),
    });
    const v1 = await (
      await get("/api/policy?source=washington&id=HB%201100%202025-26")
    ).json();
    expect("chain" in v1).toBe(false);
    expect("version" in v1).toBe(false);
  });

  it("drops a chain row whose wording trips the personal-pattern guard, and caps the rows", () => {
    const policy = {
      citation: {
        sourceId: "federal-register",
        identifier: "FR Doc. 2099-00001",
        title: "Example",
        issuingBody: "Example Department",
        kind: "Rule",
        date: "2099-01-05",
        officialUrl: "https://www.federalregister.gov/d/2099-00001",
        textUrl: null,
        retrievedAt: "2099-01-07T00:00:00.000Z",
        summary: null,
        textAvailable: true,
        matchKey: null,
      },
    } as unknown as Parameters<typeof policyV3>[0]["policy"];
    const out = policyV3({
      policy,
      blocks: [
        { text: "See 42 U.S.C. 7401.", locator: "Section 1" },
        { text: "See 25 U.S.C. 9.", locator: "Write to someone@example.org" },
      ],
    });
    expect(out.chain!.map((r) => r.sourceWording)).toEqual(["42 U.S.C. 7401"]);
    // The withheld row is counted for the page to state (safeguard 8).
    expect(out.chainWithheld).toBe(1);
    const many = policyV3({
      policy,
      blocks: [
        {
          text: Array.from({ length: 250 }, (_, i) => `${i + 1} U.S.C. 9`).join(
            "; ",
          ),
          locator: "Section 2",
        },
      ],
    });
    expect(many.chain).toHaveLength(CHAIN_MAX);
    expect(many.chainWithheld).toBeUndefined();
  });
});

describe("Grants.gov detail read", () => {
  it("reads one opportunity by id, caches it by that id, and refuses any other id", async () => {
    installFetch({
      "api.grants.gov/v1/api/fetchOpportunity": () => reply(GRANTS_BODY),
    });
    const res = await get("/api/policy?source=grants&id=990001");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = grantsDetailValue(await res.json());
    expect(body.source).toBe("grants");
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      opportunityId: 990001,
    });
    await get("/api/policy?source=grants&id=990001");
    expect(calls).toHaveLength(1);
    expect([...cacheEntries.keys()].join()).toContain("/grants/990001");

    installFetch({});
    const bad = await get("/api/policy?source=grants&id=0123");
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: "bad_query" });
    expect(calls).toHaveLength(0);
  });
});

describe("/api/related", () => {
  const ACCESS_ID = "BILLS-199hr1001ih";

  it.each<[string, string, string, object]>([
    [
      "GovInfo relations",
      `/api/related?source=govinfo&id=${ACCESS_ID}`,
      `api.govinfo.gov/related/${ACCESS_ID}`,
      RELATED,
    ],
    [
      "GovInfo related records in one collection",
      `/api/related?source=govinfo&id=${ACCESS_ID}&collection=BILLS`,
      `api.govinfo.gov/related/${ACCESS_ID}/BILLS`,
      RELATED_BILLS,
    ],
    [
      "Congress.gov related bills",
      `/api/related?source=congress&bill=${encodeURIComponent("hr 1001 199")}`,
      "api.congress.gov/v3/bill/199/hr/1001/relatedbills",
      CONGRESS_RELATED,
    ],
  ])(
    "answers %s with exactly one upstream call",
    async (_name, path, upstream, fixture) => {
      installFetch({ [upstream]: () => reply(fixture) });
      const res = await get(path, KEYED);
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const body = await res.json();
      expect(body).toMatchObject({ ok: true, basis: "source_field" });
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toContain(upstream);
      expect(JSON.stringify(body)).not.toContain("Example Party");
    },
  );

  it("shapes each answer as its contract type", async () => {
    installFetch({ [`related/${ACCESS_ID}`]: () => reply(RELATED) });
    const relations = await (
      await get(`/api/related?source=govinfo&id=${ACCESS_ID}`, KEYED)
    ).json();
    expect(relations).toMatchObject({ source: "govinfo", accessId: ACCESS_ID });
    expect(Array.isArray(relations.relations)).toBe(true);

    installFetch({ relatedbills: () => reply(CONGRESS_RELATED) });
    const bills = await (
      await get("/api/related?source=congress&bill=hr%201001%20199", KEYED)
    ).json();
    expect(bills).toMatchObject({ source: "congress" });
    expect(Array.isArray(bills.records)).toBe(true);
  });

  it.each<[string, string, Env, number, string]>([
    [
      "no key",
      `/api/related?source=govinfo&id=${ACCESS_ID}`,
      {},
      503,
      "key_pending",
    ],
    [
      "another source",
      "/api/related?source=grants&id=990001",
      KEYED,
      400,
      "bad_query",
    ],
    [
      "a bad access id",
      "/api/related?source=govinfo&id=a%2Fb",
      KEYED,
      400,
      "bad_query",
    ],
    [
      "a bad collection",
      `/api/related?source=govinfo&id=${ACCESS_ID}&collection=bills`,
      KEYED,
      400,
      "bad_query",
    ],
    [
      "a bad bill",
      "/api/related?source=congress&bill=water",
      KEYED,
      400,
      "bad_query",
    ],
  ])(
    "refuses %s with no upstream call",
    async (_name, path, env, status, error) => {
      installFetch({});
      const res = await get(path, env);
      expect(res.status).toBe(status);
      expect(await res.json()).toMatchObject({ ok: false, error });
      expect(calls).toHaveLength(0);
    },
  );

  it("is a known route behind the origin check", async () => {
    installFetch({});
    const res = await worker.fetch(
      new Request(
        `https://demo.example/api/related?source=govinfo&id=${ACCESS_ID}`,
        {
          headers: { Origin: "https://elsewhere.example" },
        },
      ),
      KEYED,
    );
    expect(res.status).toBe(403);
    expect(calls).toHaveLength(0);
    expect((await get("/api/relatedx", KEYED)).status).toBe(404);
  });
});

describe("version 1 and 2 answers", () => {
  it("never carry a version 3 field", async () => {
    installFetch({
      "federalregister.gov/api/v1/documents.json": () => reply(FR_SEARCH_JSON),
    });
    for (const searchVersion of ["1", "2"]) {
      const body = await (
        await post({ source: "federal-register", q: "water", searchVersion })
      ).json();
      expect(body.criteria.version).toBe(Number(searchVersion));
      for (const row of body.results) expect(noV3Fields(row)).toEqual([]);
    }
    // Version 3 stays closed to every source but the court cases.
    const v3 = await post({
      source: "federal-register",
      q: "water",
      searchVersion: "3",
    });
    expect(v3.status).toBe(400);
  });
});
