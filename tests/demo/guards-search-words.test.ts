// @vitest-environment node
// Design rule 5 and safeguard 3: search words stay out of URLs and referrers.
// The page sends searches by POST with the words in a JSON body; the Worker
// answers that POST exactly as it answers the GET it keeps for ATNI-ResIST.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readPolicy, search } from "../../demo/api";
import { searchCriteria } from "../../src/demo/search-contract";
import type { DemoSearchOptions } from "../../src/demo/types";
import worker from "../../worker/src/index";
import { FR_SEARCH_JSON } from "./fixtures";
import { searchResult } from "./frontend-fixtures";

const ORIGIN = "https://atniclimate.github.io";
const WORDS = "zebrafinch heron";
let visitor = 0;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function upstream() {
  const sent: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string) => {
      sent.push(String(input));
      return new Response(JSON.stringify(FR_SEARCH_JSON), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
  return sent;
}

const request = (
  path: string,
  init: RequestInit = {},
  origin: string | null = ORIGIN,
) =>
  worker.fetch(
    new Request(`https://demo.example${path}`, {
      ...init,
      headers: {
        "cf-connecting-ip": `2001:db8::7${(++visitor).toString(16)}`,
        ...(origin && { Origin: origin }),
        ...(init.headers as Record<string, string> | undefined),
      },
    }),
    {},
  );

const post = (body: unknown, origin: string | null = ORIGIN) =>
  request(
    "/api/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    },
    origin,
  );

describe("Worker: POST /api/search", () => {
  const params = {
    source: "federal-register",
    q: WORDS,
    page: "1",
    searchVersion: "1",
    dateFrom: "2024-01-01",
    dateTo: "2024-12-31",
  };

  it("answers a JSON body exactly as it answers the same GET query", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2099-01-07T12:00:00Z"));
    const getSent = upstream();
    const viaGet = await request(`/api/search?${new URLSearchParams(params)}`);
    const postSent = upstream();
    const viaPost = await post(params);
    expect(viaPost.status).toBe(200);
    expect(viaGet.status).toBe(200);
    expect(postSent).toEqual(getSent);
    expect(await viaPost.json()).toEqual(await viaGet.json());
    expect(viaPost.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(viaPost.headers.get("cache-control")).toBe("no-store");
  });

  it("reads the criteria from the body only, never from the address", async () => {
    upstream();
    const res = await request(
      `/api/search?${new URLSearchParams({ q: "address words" })}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      },
    );
    expect((await res.json()).query).toBe(WORDS);
  });

  it("applies the GET validation and limits to the body", async () => {
    upstream();
    expect((await post({ ...params, q: "x" })).status).toBe(400);
    expect((await post({ ...params, q: "w".repeat(201) })).status).toBe(400);
    expect((await post({ ...params, page: "51" })).status).toBe(400);
    expect((await post({ ...params, source: "nowhere" })).status).toBe(400);
    expect(
      (await post({ ...params, searchVersion: "1", match: "docket" })).status,
    ).toBe(400);
    expect(
      (await post({ ...params, continuation: "x".repeat(12_001) })).status,
    ).toBe(400);
  });

  it.each([
    ["not JSON", "{"],
    ["an array", "[]"],
    ["null", "null"],
    ["a number value", JSON.stringify({ source: "federal-register", q: 7 })],
    ["a nested value", JSON.stringify({ q: { words: WORDS } })],
    [
      "an oversized body",
      JSON.stringify({ q: WORDS, pad: "p".repeat(20_000) }),
    ],
  ])("refuses %s with a 400 and no upstream call", async (_label, body) => {
    const sent = upstream();
    const res = await post(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("bad_query");
    expect(sent).toEqual([]);
  });

  it("keeps POST to the search address with a JSON body only", async () => {
    upstream();
    const plain = await request("/api/search", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(params),
    });
    expect(plain.status).toBe(405);
    const policy = await request("/api/policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "federal-register", id: "2099-00001" }),
    });
    expect(policy.status).toBe(405);
    const other = await post(params, "https://evil.example");
    expect(other.status).toBe(403);
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("allows POST in the preflight for the allowed origins only", async () => {
    const ok = await request("/api/search", { method: "OPTIONS" });
    expect(ok.status).toBe(204);
    expect(ok.headers.get("access-control-allow-methods")).toContain("POST");
    expect(ok.headers.get("access-control-allow-headers")).toContain(
      "Content-Type",
    );
    const other = await request(
      "/api/search",
      { method: "OPTIONS" },
      "https://evil.example",
    );
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
    expect(other.headers.get("access-control-allow-methods")).toBeNull();
  });
});

describe("page: search words travel only in POST bodies", () => {
  const options: DemoSearchOptions = {
    dateFrom: "2024-01-01",
    dateTo: "2024-12-31",
    continuation: null,
    version: 2,
    match: "text",
  };

  it("sends a search by POST, with no search words in the address", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...searchResult([], WORDS),
          criteria: searchCriteria("federal-register", WORDS, 1, options),
          continuation: { kind: "stopped", reason: "complete" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetch);
    await search("federal-register", WORDS, 1, undefined, options);
    expect(fetch).toHaveBeenCalledOnce();
    const [address, init] = fetch.mock.calls[0] as [string, RequestInit];
    const url = new URL(address);
    expect(url.pathname).toBe("/api/search");
    expect(url.search).toBe("");
    for (const word of WORDS.split(" ")) expect(address).not.toContain(word);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(JSON.parse(String(init.body))).toEqual({
      source: "federal-register",
      q: WORDS,
      page: "1",
      searchVersion: "2",
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
    });
  });

  it("reads a policy by its public identifier, not by search words", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetch);
    await readPolicy("federal-register", "2099-00001").catch(() => undefined);
    const [address, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(new URL(address).searchParams.get("id")).toBe("2099-00001");
    expect(new URL(address).searchParams.has("q")).toBe(false);
    expect(init.method ?? "GET").toBe("GET");
  });
});

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("page: no referrer, no inbound query link", () => {
  it("sets a no-referrer policy in the page head", () => {
    const html = readFileSync("demo/index.html", "utf8");
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).toMatch(
      /<meta\s+name="referrer"\s+content="no-referrer"\s*\/?>/,
    );
  });

  it("reads no search words from the address (owner ruling N3)", () => {
    const code = files("demo").filter((f) => /\.(ts|tsx)$/.test(f));
    const offenders = code.filter((f) =>
      /(?:param|get)\(\s*["']q["']\s*\)|#q=|location\.hash/.test(
        readFileSync(f, "utf8"),
      ),
    );
    expect(offenders).toEqual([]);
  });
});
