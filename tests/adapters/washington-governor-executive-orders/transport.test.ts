import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
  WASHINGTON_GOVERNOR_HTML_POLICY,
  WASHINGTON_GOVERNOR_USER_AGENT,
  fetchWashingtonGovernorExecutiveOrdersIndex,
  type WashingtonGovernorFetchLike,
} from "../../../src/adapters/washington-governor-executive-orders";

const fixture = readFileSync(
  path.resolve(
    process.cwd(),
    "fixtures/sources/washington-governor-executive-orders/current-term.valid.html",
  ),
  "utf8",
);

function responseWithUrl(
  body: BodyInit | null,
  {
    status = 200,
    url = WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
    headers = {},
  }: {
    status?: number;
    url?: string;
    headers?: Record<string, string>;
  } = {},
): Response {
  const response = new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      ...headers,
    },
  });
  Object.defineProperty(response, "url", {
    configurable: true,
    value: url,
  });
  return response;
}

function htmlResponse(
  html = fixture,
  options: Parameters<typeof responseWithUrl>[1] = {},
): Response {
  return responseWithUrl(html, options);
}

describe("Washington Governor executive-order bounded HTML transport", () => {
  it("makes one exact build-time request and returns only the typed projection", async () => {
    let capturedInput: string | URL | undefined;
    let capturedInit: RequestInit | undefined;
    const fetchMock: WashingtonGovernorFetchLike = vi.fn(
      async (input, init) => {
        capturedInput = input;
        capturedInit = init;
        return htmlResponse();
      },
    );

    const index = await fetchWashingtonGovernorExecutiveOrdersIndex(
      "2099-12-31",
      { fetch: fetchMock },
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(capturedInput)).toBe(
      WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
    );
    expect(capturedInit).toMatchObject({
      method: "GET",
      body: null,
      cache: "no-store",
      credentials: "omit",
      redirect: "manual",
      referrer: "",
      referrerPolicy: "no-referrer",
    });
    const headers = new Headers(capturedInit?.headers);
    expect(headers.get("Accept")).toBe("text/html");
    expect(headers.get("Accept-Encoding")).toBe("identity");
    expect(headers.get("User-Agent")).toBe(WASHINGTON_GOVERNOR_USER_AGENT);
    expect(capturedInit?.signal).toBeInstanceOf(AbortSignal);
    expect(index.rows).toHaveLength(2);
    expect(JSON.stringify(index)).not.toMatch(/OUTER_.*_SENTINEL/);
  });

  it.each([403, 429, 500, 503])("does not retry HTTP %s", async (status) => {
    const fetchMock = vi.fn(async () => htmlResponse(fixture, { status }));
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: fetchMock,
      }),
    ).rejects.toMatchObject({ code: "http_status" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects redirects and final-URL drift without reading a substitute", async () => {
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () => htmlResponse(fixture, { status: 302 }),
      }),
    ).rejects.toMatchObject({ code: "redirect" });
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () =>
          htmlResponse(fixture, {
            url: `${WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL}&page=0`,
          }),
      }),
    ).rejects.toMatchObject({ code: "invalid_url" });
  });

  it.each([
    ["application/xhtml+xml", "content_type"],
    ["text/html; charset=iso-8859-1", "content_type"],
    ["text/html; charset=utf-8; profile=synthetic", "content_type"],
  ])("rejects media-type drift %s", async (contentType, code) => {
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () =>
          htmlResponse(fixture, {
            headers: { "Content-Type": contentType },
          }),
      }),
    ).rejects.toMatchObject({ code });
  });

  it("accepts absent charset and rejects transformed content encoding", async () => {
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () =>
          htmlResponse(fixture, { headers: { "Content-Type": "text/html" } }),
      }),
    ).resolves.toMatchObject({ displayedTotal: 2 });
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () =>
          htmlResponse(fixture, {
            headers: { "Content-Encoding": "gzip" },
          }),
      }),
    ).rejects.toMatchObject({ code: "content_encoding" });
  });

  it("enforces declared length syntax, ceiling, and exact reconciliation", async () => {
    const byteLength = new TextEncoder().encode(fixture).byteLength;
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () =>
          htmlResponse(fixture, {
            headers: { "Content-Length": String(byteLength) },
          }),
      }),
    ).resolves.toMatchObject({ displayedTotal: 2 });

    for (const contentLength of [
      "01",
      String(byteLength + 1),
      String(WASHINGTON_GOVERNOR_HTML_POLICY.maximumResponseBytes + 1),
    ]) {
      await expect(
        fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
          fetch: async () =>
            htmlResponse(fixture, {
              headers: { "Content-Length": contentLength },
            }),
        }),
      ).rejects.toMatchObject({
        code:
          Number(contentLength) >
          WASHINGTON_GOVERNOR_HTML_POLICY.maximumResponseBytes
            ? "response_too_large"
            : "content_length",
      });
    }
  });

  it("accepts the exact streamed byte ceiling", async () => {
    const fixtureBytes = new TextEncoder().encode(fixture).byteLength;
    const commentOverhead = "<!---->".length;
    const fillerLength =
      WASHINGTON_GOVERNOR_HTML_POLICY.maximumResponseBytes -
      fixtureBytes -
      commentOverhead;
    expect(fillerLength).toBeGreaterThan(0);
    const boundary = `${fixture}<!--${"x".repeat(fillerLength)}-->`;
    expect(new TextEncoder().encode(boundary)).toHaveLength(
      WASHINGTON_GOVERNOR_HTML_POLICY.maximumResponseBytes,
    );
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () => htmlResponse(boundary),
      }),
    ).resolves.toMatchObject({ displayedTotal: 2 });
  });

  it("accepts the exact nonempty chunk ceiling", async () => {
    const encoded = new TextEncoder().encode(fixture);
    expect(encoded.byteLength).toBeGreaterThan(
      WASHINGTON_GOVERNOR_HTML_POLICY.maximumChunks,
    );
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () =>
          responseWithUrl(
            new ReadableStream<Uint8Array>({
              start(controller) {
                for (
                  let index = 0;
                  index < WASHINGTON_GOVERNOR_HTML_POLICY.maximumChunks - 1;
                  index += 1
                ) {
                  controller.enqueue(encoded.slice(index, index + 1));
                }
                controller.enqueue(
                  encoded.slice(
                    WASHINGTON_GOVERNOR_HTML_POLICY.maximumChunks - 1,
                  ),
                );
                controller.close();
              },
            }),
          ),
      }),
    ).resolves.toMatchObject({ displayedTotal: 2 });
  });

  it("rejects missing, invalid UTF-8, fragmented, and oversized bodies", async () => {
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () => responseWithUrl(null),
      }),
    ).rejects.toMatchObject({ code: "missing_body" });

    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () =>
          responseWithUrl(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(new Uint8Array([0xc3]));
                controller.close();
              },
            }),
          ),
      }),
    ).rejects.toMatchObject({ code: "invalid_utf8" });

    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () =>
          responseWithUrl(
            new ReadableStream<Uint8Array>({
              start(controller) {
                for (
                  let index = 0;
                  index <= WASHINGTON_GOVERNOR_HTML_POLICY.maximumChunks;
                  index += 1
                ) {
                  controller.enqueue(new Uint8Array([0x20]));
                }
                controller.close();
              },
            }),
          ),
      }),
    ).rejects.toMatchObject({ code: "response_fragmentation" });

    const oversized = new Uint8Array(
      WASHINGTON_GOVERNOR_HTML_POLICY.maximumResponseBytes + 1,
    );
    oversized.fill(0x20);
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () => responseWithUrl(oversized),
      }),
    ).rejects.toMatchObject({ code: "response_too_large" });
  });

  it("rejects empty chunks and zeroes consumed byte chunks", async () => {
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () =>
          responseWithUrl(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(new Uint8Array(0));
                controller.close();
              },
            }),
          ),
      }),
    ).rejects.toMatchObject({ code: "response_fragmentation" });

    const chunk = new TextEncoder().encode(fixture);
    await fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
      fetch: async () =>
        responseWithUrl(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(chunk);
              controller.close();
            },
          }),
        ),
    });
    expect(chunk.every((value) => value === 0)).toBe(true);
  });

  it("enforces the whole-operation monotonic deadline", async () => {
    const monotonicNow = vi
      .fn<() => number>()
      .mockReturnValueOnce(0)
      .mockReturnValue(30_001);
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () => htmlResponse(),
        monotonicNow,
      }),
    ).rejects.toMatchObject({ code: "timeout" });
  });

  it("sanitizes a failing monotonic clock before any request", async () => {
    const fetchMock = vi.fn(async () => htmlResponse());
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: fetchMock,
        monotonicNow() {
          throw new Error("REJECTED_CLOCK_SENTINEL");
        },
      }),
    ).rejects.toMatchObject({
      code: "timeout",
      message: "Washington Governor executive-order index retrieval failed.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps incomplete-body cancellation inside the whole-operation deadline", async () => {
    vi.useFakeTimers();
    try {
      let cancelCalls = 0;
      const body = new ReadableStream<Uint8Array>({
        cancel() {
          cancelCalls += 1;
          return new Promise<void>(() => {});
        },
      });
      const pending = fetchWashingtonGovernorExecutiveOrdersIndex(
        "2099-12-31",
        {
          fetch: async () => responseWithUrl(body, { status: 302 }),
        },
      );
      const rejection = expect(pending).rejects.toMatchObject({
        code: "timeout",
      });
      await vi.advanceTimersByTimeAsync(
        WASHINGTON_GOVERNOR_HTML_POLICY.timeoutMilliseconds + 1,
      );
      await rejection;
      expect(cancelCalls).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("maps network and HTML details to fixed sanitized categories", async () => {
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () => {
          throw new Error(
            "provider body https://sensitive.example.invalid/detail",
          );
        },
      }),
    ).rejects.toMatchObject({
      code: "network",
      message: "Washington Governor executive-order index retrieval failed.",
    });

    const rejected = fixture.replace(">Number<", ">REJECTED_SENTINEL<");
    await expect(
      fetchWashingtonGovernorExecutiveOrdersIndex("2099-12-31", {
        fetch: async () => htmlResponse(rejected),
      }),
    ).rejects.toMatchObject({
      code: "invalid_html",
      message: "Washington Governor executive-order index retrieval failed.",
    });
  });
});
