import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FEDERAL_REGISTER_DISCOVERY_FIELDS,
  FEDERAL_REGISTER_QUERY_POLICY,
  FEDERAL_REGISTER_RESPONSE_POLICY,
} from "../../../src/adapters/federal-register/constants";
import {
  fetchFederalRegisterJson,
  type FederalRegisterFetchLike,
  type FederalRegisterResponseKind,
} from "../../../src/adapters/federal-register/transport";

function withDiscoveryFields(url: URL): URL {
  for (const field of FEDERAL_REGISTER_DISCOVERY_FIELDS) {
    url.searchParams.append("fields[]", field);
  }
  return url;
}

function reviewedSearchUrl(): URL {
  const url = withDiscoveryFields(
    new URL("https://www.federalregister.gov/api/v1/documents.json"),
  );
  url.searchParams.set("conditions[publication_date][gte]", "2026-07-30");
  url.searchParams.set("conditions[publication_date][lte]", "2026-07-31");
  url.searchParams.set(
    "per_page",
    String(FEDERAL_REGISTER_QUERY_POLICY.pageSize),
  );
  url.searchParams.set("order", FEDERAL_REGISTER_QUERY_POLICY.order);
  return url;
}

function reviewedFacetUrl(): URL {
  const url = new URL(
    "https://www.federalregister.gov/api/v1/documents/facets/daily.json",
  );
  url.searchParams.set("conditions[publication_date][gte]", "2026-07-30");
  url.searchParams.set("conditions[publication_date][lte]", "2026-07-31");
  return url;
}

const requestUrls = {
  search: reviewedSearchUrl(),
  document: withDiscoveryFields(
    new URL("https://www.federalregister.gov/api/v1/documents/2026-00001.json"),
  ),
  documentBatch: withDiscoveryFields(
    new URL(
      "https://www.federalregister.gov/api/v1/documents/2026-00001,C1-2026-00001.json",
    ),
  ),
  facet: reviewedFacetUrl(),
  issue: new URL(
    "https://www.federalregister.gov/api/v1/issues/2026-07-31.json",
  ),
  openApi: new URL("https://www.federalregister.gov/api/v1/documentation.json"),
} satisfies Record<FederalRegisterResponseKind, URL>;

function jsonResponse(
  value: unknown,
  {
    status = 200,
    contentType = "application/json",
    headers = {},
  }: {
    status?: number;
    contentType?: string;
    headers?: Record<string, string>;
  } = {},
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": contentType,
      ...headers,
    },
  });
}

function queuedFetch(
  responses: Array<() => Response | Promise<Response>>,
): FederalRegisterFetchLike {
  return async () => {
    const next = responses.shift();
    if (!next) {
      throw new Error("Unexpected test request");
    }
    return next();
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Federal Register bounded JSON transport", () => {
  it.each(
    Object.entries(requestUrls) as Array<[FederalRegisterResponseKind, URL]>,
  )("accepts the reviewed %s route", async (responseKind, requestUrl) => {
    await expect(
      fetchFederalRegisterJson(requestUrl, responseKind, {
        fetchImpl: queuedFetch([
          () =>
            jsonResponse(
              { synthetic: true },
              { contentType: "Application/JSON; charset=utf-8" },
            ),
        ]),
      }),
    ).resolves.toEqual({ synthetic: true });
  });

  it("sends a build-time GET with the reviewed request policy", async () => {
    let capturedInput: RequestInfo | URL | undefined;
    let capturedInit: RequestInit | undefined;
    const fetchImpl: FederalRegisterFetchLike = async (input, init) => {
      capturedInput = input;
      capturedInit = init;
      return jsonResponse({ synthetic: true });
    };

    await fetchFederalRegisterJson(requestUrls.search, "search", {
      fetchImpl,
    });

    expect(capturedInput).toBe(requestUrls.search.href);
    expect(capturedInit).toMatchObject({
      credentials: "omit",
      method: "GET",
      redirect: "manual",
      referrerPolicy: "no-referrer",
    });
    const headers = new Headers(capturedInit?.headers);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("User-Agent")).toBe(
      "Policy-Sentinel/0.2 build-time source adapter",
    );
    expect(capturedInit?.signal).toBeInstanceOf(AbortSignal);
  });

  it("allows only a bounded page paired with an opaque search cursor", async () => {
    const requestUrl = new URL(requestUrls.search);
    requestUrl.searchParams.set("page", "2");
    requestUrl.searchParams.set("search_after_cursor", "opaque-cursor");
    const fetchImpl = vi.fn(async () => jsonResponse({ synthetic: true }));

    await expect(
      fetchFederalRegisterJson(requestUrl, "search", { fetchImpl }),
    ).resolves.toEqual({ synthetic: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([408, 429, 500, 502, 503, 504])(
    "retries reviewed transient HTTP %s with bounded jitter",
    async (status) => {
      const waits: number[] = [];
      const fetchImpl = queuedFetch([
        () => jsonResponse({ error: "synthetic" }, { status }),
        () => jsonResponse({ synthetic: true }),
      ]);

      await expect(
        fetchFederalRegisterJson(requestUrls.search, "search", {
          fetchImpl,
          random: () => 0,
          sleep: async (milliseconds) => {
            waits.push(milliseconds);
          },
        }),
      ).resolves.toEqual({ synthetic: true });
      expect(waits).toEqual([187]);
    },
  );

  it("uses an immutable URL snapshot across retries", async () => {
    const suppliedUrl = new URL(requestUrls.search);
    const inputs: string[] = [];
    const waits: number[] = [];
    let calls = 0;
    const fetchImpl: FederalRegisterFetchLike = async (input) => {
      inputs.push(String(input));
      calls += 1;
      return calls === 1
        ? jsonResponse({ error: "synthetic" }, { status: 503 })
        : jsonResponse({ synthetic: true });
    };

    await expect(
      fetchFederalRegisterJson(suppliedUrl, "search", {
        fetchImpl,
        random: () => 0,
        sleep: async (milliseconds) => {
          waits.push(milliseconds);
          suppliedUrl.hostname = "example.com";
        },
      }),
    ).resolves.toEqual({ synthetic: true });
    expect(inputs).toEqual([requestUrls.search.href, requestUrls.search.href]);
    expect(waits).toEqual([187]);
  });

  it("honors bounded numeric and HTTP-date Retry-After values", async () => {
    const waits: number[] = [];
    const numeric = queuedFetch([
      () =>
        jsonResponse(
          { error: "synthetic" },
          { status: 429, headers: { "Retry-After": "2" } },
        ),
      () => jsonResponse({ synthetic: true }),
    ]);
    await fetchFederalRegisterJson(requestUrls.search, "search", {
      fetchImpl: numeric,
      sleep: async (milliseconds) => {
        waits.push(milliseconds);
      },
    });

    const currentTime = new Date("2026-07-31T12:00:00.000Z");
    const httpDate = queuedFetch([
      () =>
        jsonResponse(
          { error: "synthetic" },
          {
            status: 503,
            headers: {
              "Retry-After": new Date(
                currentTime.getTime() + 3_000,
              ).toUTCString(),
            },
          },
        ),
      () => jsonResponse({ synthetic: true }),
    ]);
    await fetchFederalRegisterJson(requestUrls.search, "search", {
      fetchImpl: httpDate,
      now: () => currentTime,
      sleep: async (milliseconds) => {
        waits.push(milliseconds);
      },
    });
    expect(waits).toEqual([2_000, 3_000]);
  });

  it.each([
    [429, "rate_limited"],
    [503, "http_status"],
  ] as const)(
    "preserves HTTP %s when Retry-After exceeds the bounded policy",
    async (status, code) => {
      const fetchImpl = queuedFetch([
        () =>
          jsonResponse(
            { error: "synthetic" },
            { status, headers: { "Retry-After": "61" } },
          ),
      ]);
      await expect(
        fetchFederalRegisterJson(requestUrls.search, "search", {
          fetchImpl,
          sleep: async () => undefined,
        }),
      ).rejects.toMatchObject({ code, status });
    },
  );

  it.each([
    [503, "http_status"],
    [429, "rate_limited"],
  ] as const)(
    "fails persistent HTTP %s after the bounded attempt count",
    async (status, code) => {
      let calls = 0;
      const fetchImpl: FederalRegisterFetchLike = async () => {
        calls += 1;
        return jsonResponse({ error: "synthetic" }, { status });
      };
      await expect(
        fetchFederalRegisterJson(requestUrls.search, "search", {
          fetchImpl,
          random: () => 0,
          sleep: async () => undefined,
        }),
      ).rejects.toMatchObject({ code, status });
      expect(calls).toBe(3);
    },
  );

  it.each([
    [302, "redirect"],
    [400, "http_status"],
    [401, "http_status"],
    [403, "http_status"],
    [404, "http_status"],
    [501, "http_status"],
  ] as const)("does not retry HTTP %s", async (status, code) => {
    let calls = 0;
    const fetchImpl: FederalRegisterFetchLike = async () => {
      calls += 1;
      return jsonResponse({ error: "synthetic" }, { status });
    };
    await expect(
      fetchFederalRegisterJson(requestUrls.search, "search", {
        fetchImpl,
        sleep: async () => undefined,
      }),
    ).rejects.toMatchObject({ code, status });
    expect(calls).toBe(1);
  });

  it.each(["redirected", "changed-url"] as const)(
    "rejects a response with a %s redirect signal",
    async (condition) => {
      const response = jsonResponse({ synthetic: true });
      if (condition === "redirected") {
        Object.defineProperty(response, "redirected", { value: true });
      } else {
        Object.defineProperty(response, "url", {
          value: "https://www.federalregister.gov/api/v1/documentation.json",
        });
      }
      await expect(
        fetchFederalRegisterJson(requestUrls.search, "search", {
          fetchImpl: queuedFetch([() => response]),
        }),
      ).rejects.toMatchObject({ code: "redirect", status: 200 });
    },
  );

  it("rejects unexpected media types before parsing", async () => {
    const fetchImpl = queuedFetch([
      () => jsonResponse({ synthetic: true }, { contentType: "text/html" }),
    ]);
    await expect(
      fetchFederalRegisterJson(requestUrls.search, "search", {
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "content_type" });
  });

  it("enforces declared and streamed response-size limits", async () => {
    const maximumBytes = FEDERAL_REGISTER_RESPONSE_POLICY.openApi.maxBytes;
    const declared = queuedFetch([
      () =>
        jsonResponse(
          { synthetic: true },
          {
            headers: {
              "Content-Length": String(maximumBytes + 1),
            },
          },
        ),
    ]);
    await expect(
      fetchFederalRegisterJson(requestUrls.openApi, "openApi", {
        fetchImpl: declared,
      }),
    ).rejects.toMatchObject({ code: "response_too_large" });

    const oversized = new Uint8Array(maximumBytes + 1);
    oversized.fill(0x20);
    const streamed = queuedFetch([
      () =>
        new Response(oversized, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ]);
    await expect(
      fetchFederalRegisterJson(requestUrls.openApi, "openApi", {
        fetchImpl: streamed,
      }),
    ).rejects.toMatchObject({ code: "response_too_large" });
  });

  it("cancels a body with an invalid Content-Length", async () => {
    let cancellations = 0;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("{}"));
      },
      cancel() {
        cancellations += 1;
      },
    });
    const fetchImpl = queuedFetch([
      () =>
        new Response(body, {
          status: 200,
          headers: {
            "Content-Length": "9007199254740992",
            "Content-Type": "application/json",
          },
        }),
    ]);

    await expect(
      fetchFederalRegisterJson(requestUrls.document, "document", {
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "content_length" });
    await Promise.resolve();
    expect(cancellations).toBe(1);
  });

  it("cancels reader failures before exhausting network retries", async () => {
    const cancellationSpies: Array<ReturnType<typeof vi.fn>> = [];
    const releaseSpies: Array<ReturnType<typeof vi.fn>> = [];
    let calls = 0;
    const fetchImpl: FederalRegisterFetchLike = async () => {
      calls += 1;
      const cancel = vi.fn(async () => undefined);
      const releaseLock = vi.fn();
      cancellationSpies.push(cancel);
      releaseSpies.push(releaseLock);
      const reader = {
        cancel,
        read: vi.fn(async () => {
          throw new Error("Synthetic body failure");
        }),
        releaseLock,
      };
      const body = {
        cancel: vi.fn(async () => undefined),
        getReader: () => reader,
      };
      return {
        body,
        headers: new Headers({ "Content-Type": "application/json" }),
        redirected: false,
        status: 200,
        url: "",
      } as unknown as Response;
    };

    await expect(
      fetchFederalRegisterJson(requestUrls.document, "document", {
        fetchImpl,
        random: () => 0,
        sleep: async () => undefined,
      }),
    ).rejects.toMatchObject({ code: "network" });
    expect(calls).toBe(3);
    for (const cancel of cancellationSpies) {
      expect(cancel).toHaveBeenCalledTimes(1);
    }
    for (const releaseLock of releaseSpies) {
      expect(releaseLock).toHaveBeenCalledTimes(1);
    }
  });

  it("rejects invalid UTF-8 and malformed JSON without retry", async () => {
    const invalidUtf8 = queuedFetch([
      () =>
        new Response(new Uint8Array([0xc3, 0x28]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ]);
    await expect(
      fetchFederalRegisterJson(requestUrls.document, "document", {
        fetchImpl: invalidUtf8,
      }),
    ).rejects.toMatchObject({ code: "invalid_utf8" });

    const malformed = queuedFetch([
      () =>
        new Response("{", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ]);
    await expect(
      fetchFederalRegisterJson(requestUrls.document, "document", {
        fetchImpl: malformed,
      }),
    ).rejects.toMatchObject({ code: "invalid_json" });
  });

  it("enforces a hard deadline when fetch ignores abort", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(() => new Promise<Response>(() => undefined));
    const fetchImpl: FederalRegisterFetchLike = fetchMock;
    const pending = fetchFederalRegisterJson(requestUrls.document, "document", {
      fetchImpl,
      random: () => 0,
      sleep: async () => undefined,
    });
    const rejection = expect(pending).rejects.toMatchObject({
      code: "timeout",
      status: null,
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await vi.advanceTimersByTimeAsync(30_000);
    }
    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("enforces the deadline and cancels a stalled response body", async () => {
    vi.useFakeTimers();
    const cancellationSpies: Array<ReturnType<typeof vi.fn>> = [];
    const fetchImpl: FederalRegisterFetchLike = async () => {
      const cancel = vi.fn(async () => undefined);
      cancellationSpies.push(cancel);
      const reader = {
        cancel,
        read: vi.fn(
          () =>
            new Promise<ReadableStreamReadResult<Uint8Array>>(() => undefined),
        ),
        releaseLock: vi.fn(),
      };
      const body = {
        cancel: vi.fn(async () => undefined),
        getReader: () => reader,
      };
      return {
        body,
        headers: new Headers({ "Content-Type": "application/json" }),
        redirected: false,
        status: 200,
        url: "",
      } as unknown as Response;
    };
    const pending = fetchFederalRegisterJson(requestUrls.document, "document", {
      fetchImpl,
      random: () => 0,
      sleep: async () => undefined,
    });
    const rejection = expect(pending).rejects.toMatchObject({
      code: "timeout",
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await vi.advanceTimersByTimeAsync(30_000);
    }
    await rejection;
    expect(cancellationSpies).toHaveLength(3);
    for (const cancel of cancellationSpies) {
      expect(cancel).toHaveBeenCalledTimes(1);
    }
  });

  const oversizedRequestUrl = new URL(requestUrls.search);
  oversizedRequestUrl.searchParams.set(
    "search_after_cursor",
    "x".repeat(FEDERAL_REGISTER_QUERY_POLICY.maximumUrlLength),
  );
  const oversizedBatchUrl = withDiscoveryFields(
    new URL(
      `https://www.federalregister.gov/api/v1/documents/${Array.from(
        { length: FEDERAL_REGISTER_QUERY_POLICY.maximumDocumentBatchSize + 1 },
        (_value, index) => `2026-${String(index).padStart(5, "0")}`,
      ).join(",")}.json`,
    ),
  );
  const searchWithUnexpectedParameter = new URL(requestUrls.search);
  searchWithUnexpectedParameter.searchParams.set("unexpected", "true");
  const searchWithInvalidDate = new URL(requestUrls.search);
  searchWithInvalidDate.searchParams.set(
    "conditions[publication_date][gte]",
    "2026-02-30",
  );
  const searchWithPageOnly = new URL(requestUrls.search);
  searchWithPageOnly.searchParams.set("page", "2");
  const searchWithCursorOnly = new URL(requestUrls.search);
  searchWithCursorOnly.searchParams.set("search_after_cursor", "opaque-cursor");
  const searchWithWrongPage = new URL(requestUrls.search);
  searchWithWrongPage.searchParams.set("page", "51");
  searchWithWrongPage.searchParams.set("search_after_cursor", "opaque-cursor");
  const searchWithDuplicatePage = new URL(requestUrls.search);
  searchWithDuplicatePage.searchParams.append("page", "2");
  searchWithDuplicatePage.searchParams.append("page", "2");
  searchWithDuplicatePage.searchParams.set(
    "search_after_cursor",
    "opaque-cursor",
  );
  const wrongFacetUrl = reviewedFacetUrl();
  wrongFacetUrl.pathname = "/api/v1/documents/facets/publication_date.json";
  const batchWithUnexpectedParameter = new URL(requestUrls.documentBatch);
  batchWithUnexpectedParameter.searchParams.set("unexpected", "true");
  const detailWithDuplicateField = new URL(requestUrls.document);
  detailWithDuplicateField.searchParams.append("fields[]", "title");
  const duplicateBatchIdentifiers = withDiscoveryFields(
    new URL(
      "https://www.federalregister.gov/api/v1/documents/2026-00001,2026-00001.json",
    ),
  );

  it.each([
    [
      "an unapproved host",
      new URL("https://www.federalregister.gov.example/api/v1/documents.json"),
      "search",
    ],
    [
      "an unreviewed same-origin path",
      new URL("https://www.federalregister.gov/reader-aids"),
      "search",
    ],
    ["a route/kind mismatch", requestUrls.search, "openApi"],
    [
      "an empty search query",
      new URL("https://www.federalregister.gov/api/v1/documents.json"),
      "search",
    ],
    ["an unexpected search parameter", searchWithUnexpectedParameter, "search"],
    ["an invalid search date", searchWithInvalidDate, "search"],
    ["a search page without a cursor", searchWithPageOnly, "search"],
    ["a search cursor without a page", searchWithCursorOnly, "search"],
    ["an out-of-range search page", searchWithWrongPage, "search"],
    ["a duplicate search page", searchWithDuplicatePage, "search"],
    ["an oversized document batch", oversizedBatchUrl, "documentBatch"],
    ["a non-daily facet", wrongFacetUrl, "facet"],
    [
      "an unexpected batch parameter",
      batchWithUnexpectedParameter,
      "documentBatch",
    ],
    ["a duplicate projected field", detailWithDuplicateField, "document"],
    [
      "duplicate document identifiers",
      duplicateBatchIdentifiers,
      "documentBatch",
    ],
    ["an oversized URL", oversizedRequestUrl, "search"],
    [
      "query parameters on an exact issue route",
      new URL(`${requestUrls.issue.href}?unexpected=true`),
      "issue",
    ],
    [
      "an invalid calendar date in an issue route",
      new URL("https://www.federalregister.gov/api/v1/issues/2026-02-30.json"),
      "issue",
    ],
  ] as const)(
    "rejects %s before fetching",
    async (_label, requestUrl, responseKind) => {
      const fetchMock = vi.fn(async () => jsonResponse({ synthetic: true }));
      const fetchImpl: FederalRegisterFetchLike = fetchMock;
      await expect(
        fetchFederalRegisterJson(requestUrl, responseKind, { fetchImpl }),
      ).rejects.toMatchObject({ code: "invalid_url" });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid URL state before fetching", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ synthetic: true }));
    const fetchImpl: FederalRegisterFetchLike = fetchMock;
    const requestUrl = new URL(requestUrls.search);
    requestUrl.hash = "unexpected";
    await expect(
      fetchFederalRegisterJson(requestUrl, "search", { fetchImpl }),
    ).rejects.toMatchObject({ code: "invalid_url" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
