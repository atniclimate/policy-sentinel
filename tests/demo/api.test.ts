// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiFailure,
  loadSources,
  readPolicy,
  REQUEST_TIMEOUT_MS,
  search,
} from "../../demo/api";
import { citation, policy, searchResult, sources } from "./frontend-fixtures";
import {
  nextSearchCursor,
  searchCriteria,
} from "../../src/demo/search-contract";
import type { DemoSearchOptions } from "../../src/demo/types";

const answer = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("demo API response boundary", () => {
  const undated: DemoSearchOptions = {
    dateFrom: null,
    dateTo: null,
    continuation: null,
  };
  const dated: DemoSearchOptions = {
    ...undated,
    dateFrom: "2024-01-01",
    dateTo: "2024-12-31",
  };

  function searchAnswer(options = undated) {
    return {
      ...searchResult([], "water"),
      criteria: searchCriteria("federal-register", "water", 1, options),
      continuation: { kind: "stopped", reason: "complete" },
    };
  }

  it("sends validated dates and requires complete criteria echo", async () => {
    const fetch = vi.fn().mockResolvedValue(answer(searchAnswer(dated)));
    vi.stubGlobal("fetch", fetch);
    const result = await search(
      "federal-register",
      "water",
      1,
      undefined,
      dated,
    );
    expect(result.criteria).toEqual(
      searchCriteria("federal-register", "water", 1, dated),
    );
    const params = new URL(fetch.mock.calls[0][0]).searchParams;
    expect(params.get("searchVersion")).toBe("1");
    expect(params.get("dateFrom")).toBe("2024-01-01");
    expect(params.get("dateTo")).toBe("2024-12-31");
  });

  it.each([
    {},
    { dateFrom: null },
    { dateTo: null },
    { version: 2 },
    { pageSize: 100 },
    { sort: "date" },
    { historical: true },
    { resultLevel: "package" },
    { cursor: "x" },
  ])("rejects an old or mismatched criteria echo %j", async (patch) => {
    const response = searchAnswer(dated);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        answer({
          ...response,
          criteria: Object.keys(patch).length
            ? { ...response.criteria, ...patch }
            : undefined,
        }),
      ),
    );
    await expect(
      search("federal-register", "water", 1, undefined, dated),
    ).rejects.toMatchObject({ kind: "service" });
  });

  it("requires the new contract even for undated options, while a legacy initial call cannot claim continuation", async () => {
    const legacy = {
      ...searchAnswer(),
      criteria: undefined,
      continuation: undefined,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(answer(legacy))),
    );
    await expect(
      search("federal-register", "water", 1, undefined, undated),
    ).rejects.toMatchObject({ kind: "service" });
    await expect(search("federal-register", "water", 1)).resolves.toMatchObject(
      { continuation: { kind: "stopped", reason: "unknown" } },
    );
  });

  it("rejects invalid criteria before making a request", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      search("federal-register", "water", 1, undefined, {
        ...dated,
        dateFrom: "2024-02-30",
      }),
    ).rejects.toMatchObject({ code: "bad_query", httpStatus: 400 });
    await expect(
      search("congress", "hr 1234 119", 1, undefined, dated),
    ).rejects.toMatchObject({ code: "unsupported_criteria" });
    await expect(
      search("regulations", "water", 21, undefined, undated),
    ).rejects.toMatchObject({ code: "bad_query" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects mismatched next cursor context instead of fetching or claiming more", async () => {
    const response = searchAnswer(dated);
    const next = nextSearchCursor(response.criteria);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        answer({
          ...response,
          continuation: {
            kind: "more",
            next: { ...next, dateTo: "2025-12-31" },
          },
        }),
      ),
    );
    await expect(
      search("federal-register", "water", 1, undefined, dated),
    ).rejects.toMatchObject({ kind: "service" });
  });

  it("rejects eleven listings at the browser response boundary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        answer({
          ...searchAnswer(),
          results: Array.from({ length: 11 }, (_, index) =>
            citation(`2099-${String(index).padStart(5, "0")}`),
          ),
        }),
      ),
    );
    await expect(
      search("federal-register", "water", 1, undefined, undated),
    ).rejects.toMatchObject({ kind: "service" });
  });

  it("rejects a legacy later page that cannot echo the continuation context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        answer({
          ...searchAnswer(),
          page: 2,
          criteria: undefined,
          continuation: undefined,
        }),
      ),
    );
    await expect(search("federal-register", "water", 2)).rejects.toMatchObject({
      kind: "service",
    });
  });

  it.each(["current-token", "*", "has space", "X".repeat(4097)])(
    "rejects unusable returned GovInfo continuation %s",
    async (token) => {
      const current = nextSearchCursor(
        searchCriteria("govinfo", "water", 1),
        "current-token",
      );
      const options = { ...undated, continuation: current };
      const response = {
        ...searchResult([], "water", "govinfo"),
        page: 2,
        criteria: current,
        continuation: { kind: "more", next: nextSearchCursor(current, token) },
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer(response)));
      await expect(
        search("govinfo", "water", 2, undefined, options),
      ).rejects.toMatchObject({ kind: "service" });
    },
  );

  it("sends and validates the complete opaque GovInfo page envelope", async () => {
    const current = nextSearchCursor(
      searchCriteria("govinfo", "water", 1),
      "opaque+/=one",
    );
    const options = { ...undated, continuation: current };
    const response = {
      ...searchResult([], "water", "govinfo"),
      page: 2,
      criteria: current,
      continuation: {
        kind: "more",
        next: nextSearchCursor(current, "opaque+/=two"),
      },
    };
    const fetch = vi.fn().mockResolvedValue(answer(response));
    vi.stubGlobal("fetch", fetch);
    await expect(
      search("govinfo", "water", 2, undefined, options),
    ).resolves.toMatchObject(response);
    const params = new URL(fetch.mock.calls[0][0]).searchParams;
    expect(JSON.parse(params.get("continuation")!)).toEqual(current);
    expect(fetch).toHaveBeenCalledOnce();
  });

  describe("search contract v2", () => {
    const docket: DemoSearchOptions = {
      ...undated,
      version: 2,
      match: "docket",
      documentType: "PRORULE",
    };
    const q = "Docket No. 260916-0002";
    const v2Answer = (options: DemoSearchOptions, results: unknown[] = []) => ({
      ...searchResult([], q),
      results,
      criteria: searchCriteria("federal-register", q, 1, options),
      continuation: { kind: "stopped", reason: "complete" },
    });

    it("sends an identifier search with its type filter and requires the v2 echo", async () => {
      const fetch = vi.fn().mockResolvedValue(answer(v2Answer(docket)));
      vi.stubGlobal("fetch", fetch);
      const result = await search("federal-register", q, 1, undefined, docket);
      expect(result.criteria).toEqual(
        searchCriteria("federal-register", q, 1, docket),
      );
      const params = new URL(fetch.mock.calls[0][0]).searchParams;
      expect(Object.fromEntries(params)).toEqual({
        source: "federal-register",
        q,
        page: "1",
        searchVersion: "2",
        match: "docket",
        documentType: "PRORULE",
      });
    });

    it("sends a v2 text search without match or type parameters", async () => {
      const text: DemoSearchOptions = { ...undated, version: 2 };
      const fetch = vi.fn().mockResolvedValue(
        answer({
          ...v2Answer(text),
          query: "water",
          criteria: searchCriteria("federal-register", "water", 1, text),
        }),
      );
      vi.stubGlobal("fetch", fetch);
      await search("federal-register", "water", 1, undefined, text);
      const params = new URL(fetch.mock.calls[0][0]).searchParams;
      expect(params.get("searchVersion")).toBe("2");
      expect(params.has("match")).toBe(false);
      expect(params.has("documentType")).toBe(false);
    });

    it("rejects a v1 echo for a v2 request and a v2 echo for a v1 request", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockImplementationOnce(() =>
            Promise.resolve(
              answer({
                ...v2Answer(docket),
                criteria: searchCriteria("federal-register", q, 1),
              }),
            ),
          )
          .mockImplementationOnce(() =>
            Promise.resolve(answer(v2Answer(docket))),
          ),
      );
      await expect(
        search("federal-register", q, 1, undefined, docket),
      ).rejects.toMatchObject({ kind: "service" });
      await expect(
        search("federal-register", q, 1, undefined, undated),
      ).rejects.toMatchObject({ kind: "service" });
    });

    it.each<[string, string, DemoSearchOptions]>([
      [
        "regulations",
        "water",
        { ...undated, version: 2, documentType: "PRESDOCU" },
      ],
      ["govinfo", "water", { ...undated, version: 2, documentType: "RULE" }],
      [
        "govinfo",
        "EPA-HQ-OAR-2021-0317",
        { ...undated, version: 2, match: "docket" },
      ],
    ])(
      "refuses %s criteria it cannot apply before any request",
      async (source, query, options) => {
        const fetch = vi.fn();
        vi.stubGlobal("fetch", fetch);
        await expect(
          search(source, query, 1, undefined, options),
        ).rejects.toMatchObject({
          code: "unsupported_criteria",
          httpStatus: 400,
        });
        expect(fetch).not.toHaveBeenCalled();
      },
    );

    it("keeps valid v2 citation fields and drops malformed ones without failing the search", async () => {
      const good = {
        ...citation("2026-19346"),
        commentsCloseOn: "2026-10-22",
        docketIds: [q],
        rins: ["0648-BO46"],
        cfrRefs: [{ title: 50, part: "660" }],
        topics: ["Fisheries"],
      };
      const bad = {
        ...citation("2026-19347"),
        commentsCloseOn: "22 October 2026",
        commentsCloseWithheld: "yes",
        docketIds: "Docket No. 1",
        rins: ["bad", "0648-BO46"],
        cfrRefs: [
          { title: 99, part: "1" },
          { title: 50, part: "1", extra: "x" },
        ],
        topics: [7, "Fishing", "\u0007"],
      };
      const closed = { ...citation("2026-19348"), commentsCloseOn: null };
      const withheld = {
        ...citation("2026-19349"),
        commentsCloseWithheld: true,
      };
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            answer(v2Answer(docket, [good, bad, closed, citation(), withheld])),
          ),
      );
      const { results } = await search(
        "federal-register",
        q,
        1,
        undefined,
        docket,
      );
      expect(results[0]).toEqual(good);
      expect(results[1]).not.toHaveProperty("commentsCloseOn");
      expect(results[1]).not.toHaveProperty("commentsCloseWithheld");
      expect(results[1]).not.toHaveProperty("docketIds");
      expect(results[1]).toMatchObject({
        rins: ["0648-BO46"],
        cfrRefs: [{ title: 50, part: "1" }],
        topics: ["Fishing"],
      });
      expect(results[2].commentsCloseOn).toBeNull();
      expect(Object.keys(results[3])).toEqual(Object.keys(citation()));
      expect(results[4]).toEqual(withheld);
    });
  });

  it.each([
    ["not_found", 404, "error"],
    ["upstream_error", 502, "error"],
    ["key_pending", 503, "key_pending"],
    ["upstream_rate_limited", 503, "error"],
    ["rate_limited", 429, "error"],
  ])(
    "preserves typed Worker failure %s with HTTP and source status",
    async (code, httpStatus, status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          answer(
            {
              ok: false,
              error: code,
              message: "Synthetic source failure.",
              status,
            },
            Number(httpStatus),
          ),
        ),
      );
      await expect(
        search("federal-register", "water", 1, undefined, undated),
      ).rejects.toMatchObject({
        code,
        httpStatus,
        status,
        kind: httpStatus === 429 ? "limited" : "source",
      });
    },
  );

  it.each([
    {},
    { ok: true, sources: [] },
    { ok: true, sources: [null] },
    { ok: true, sources: [sources[0], sources[0]] },
  ])("rejects malformed source catalogs", async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer(body)));
    await expect(loadSources()).rejects.toMatchObject({ kind: "service" });
  });

  it("accepts and projects a valid source catalog", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(answer({ ok: true, sources })),
    );
    await expect(loadSources()).resolves.toEqual(sources);
  });

  it("recognizes an HTML rate-limit response before decoding JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<h1>Rate limited</h1>", { status: 429 }),
        ),
    );
    await expect(loadSources()).rejects.toMatchObject({ kind: "limited" });
  });

  it("rejects a search response belonging to a different query", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(answer(searchResult([], "other query"))),
    );
    await expect(search("federal-register", "water", 1)).rejects.toBeInstanceOf(
      ApiFailure,
    );
  });

  it("rejects a policy belonging to a different identifier and unsafe official links", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(answer(policy()))
      .mockResolvedValueOnce(
        answer({
          ...policy(),
          citation: {
            ...policy().citation,
            officialUrl: "https://attacker.example/policy",
          },
        }),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(
      readPolicy("federal-register", "2099-99999"),
    ).rejects.toMatchObject({ kind: "service" });
    await expect(
      readPolicy("federal-register", "2099-00001"),
    ).rejects.toMatchObject({ kind: "service" });
  });

  it("returns a validated matching policy with unchanged evidence", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer(policy())));
    await expect(readPolicy("federal-register", "2099-00001")).resolves.toEqual(
      policy(),
    );
  });

  it("preserves distinct metadata and text retrieval timestamps", async () => {
    const response = {
      ...policy(),
      receipt: { ...policy().receipt, retrievedAt: "2099-01-07T12:00:00.000Z" },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer(response)));
    await expect(readPolicy("federal-register", "2099-00001")).resolves.toEqual(
      response,
    );
  });

  it("cancels a declared oversized body before reading it", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(body, { headers: { "Content-Length": "2000001" } }),
        ),
    );
    await expect(loadSources()).rejects.toMatchObject({ kind: "service" });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("bounds undeclared response bytes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(" ".repeat(2_000_001))),
    );
    await expect(loadSources()).rejects.toMatchObject({ kind: "service" });
  });

  it("aborts a stalled response at the deadline", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            signal = init.signal as AbortSignal;
            signal.addEventListener(
              "abort",
              () => reject(new Error("Aborted")),
              { once: true },
            );
          }),
      ),
    );
    const result = loadSources();
    const rejected = expect(result).rejects.toMatchObject({ kind: "service" });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect(signal?.aborted).toBe(true);
    await rejected;
  });

  it("passes explicit cancellation through to fetch", async () => {
    const controller = new AbortController();
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            signal = init.signal as AbortSignal;
            signal.addEventListener(
              "abort",
              () => reject(new Error("Aborted")),
              { once: true },
            );
          }),
      ),
    );
    const result = loadSources(controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ kind: "service" });
    expect(signal?.aborted).toBe(true);
  });
});
