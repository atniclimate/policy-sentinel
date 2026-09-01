import { describe, expect, it, vi } from "vitest";

import {
  GOIA_ACCORD_HTML_POLICY,
  GOIA_ACCORD_URL,
  GOIA_ACCORD_USER_AGENT,
  fetchGoiaAccordPage,
  type GoiaAccordFetchLike,
} from "../../../src/adapters/washington-centennial-accord";
import {
  goiaAccordFixture,
  htmlResponse,
  responseWithUrl,
} from "./test-helpers";

const publicResolver = async (): Promise<readonly string[]> => [
  "93.184.216.34",
];

describe("GOIA Centennial Accord bounded HTML transport", () => {
  it("makes one exact privacy-minimized GET and returns no provider body", async () => {
    let capturedInput: string | URL | undefined;
    let capturedInit: RequestInit | undefined;
    const fetchMock: GoiaAccordFetchLike = vi.fn(async (input, init) => {
      capturedInput = input;
      capturedInit = init;
      return htmlResponse();
    });
    const resolver = vi.fn(async () => ["93.184.216.34"] as const);
    const page = await fetchGoiaAccordPage({
      fetch: fetchMock,
      resolveHostname: resolver,
    });
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(resolver).toHaveBeenCalledWith("goia.wa.gov");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(capturedInput)).toBe(GOIA_ACCORD_URL);
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
    expect(headers.get("User-Agent")).toBe(GOIA_ACCORD_USER_AGENT);
    expect(capturedInit?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.stringify(page)).not.toContain("3785");
    expect(JSON.stringify(page)).not.toContain("provider prose");
  });

  it.each([
    [[]],
    [Array.from({ length: 17 }, () => "93.184.216.34")],
    [["127.0.0.1"]],
    [["10.0.0.4"]],
    [["169.254.169.254"]],
    [["192.0.2.1"]],
    [["::1"]],
    [["fc00::1"]],
    [["2001:db8::1"]],
    [["::ffff:127.0.0.1"]],
    [["93.184.216.34", "127.0.0.1"]],
  ])("rejects an empty or nonpublic DNS projection: %j", async (addresses) => {
    const fetchMock = vi.fn<GoiaAccordFetchLike>(async () => htmlResponse());
    await expect(
      fetchGoiaAccordPage({
        fetch: fetchMock,
        resolveHostname: async () => addresses,
      }),
    ).rejects.toMatchObject({ code: "nonpublic_host" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts bounded public IPv4 and IPv6 resolution and sanitizes resolver failure", async () => {
    await expect(
      fetchGoiaAccordPage({
        fetch: async () => htmlResponse(),
        resolveHostname: async () => ["93.184.216.34", "2606:4700::6810:1"],
      }),
    ).resolves.toMatchObject({ pageUrl: GOIA_ACCORD_URL });
    await expect(
      fetchGoiaAccordPage({
        fetch: async () => htmlResponse(),
        resolveHostname: async () => {
          throw new Error("fictional resolver detail");
        },
      }),
    ).rejects.toMatchObject({
      code: "network",
      message: "GOIA Centennial Accord page retrieval failed.",
    });
  });

  it.each([403, 429, 500, 503])("does not retry HTTP %s", async (status) => {
    const fetchMock = vi.fn<GoiaAccordFetchLike>(async () =>
      htmlResponse(goiaAccordFixture, { status }),
    );
    await expect(
      fetchGoiaAccordPage({
        fetch: fetchMock,
        resolveHostname: publicResolver,
      }),
    ).rejects.toMatchObject({ code: "http_status" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects redirects and exact final-URL drift", async () => {
    await expect(
      fetchGoiaAccordPage({
        fetch: async () => htmlResponse(goiaAccordFixture, { status: 302 }),
        resolveHostname: publicResolver,
      }),
    ).rejects.toMatchObject({ code: "redirect" });
    await expect(
      fetchGoiaAccordPage({
        fetch: async () =>
          htmlResponse(goiaAccordFixture, {
            url: `${GOIA_ACCORD_URL}?drift=1`,
          }),
        resolveHostname: publicResolver,
      }),
    ).rejects.toMatchObject({ code: "invalid_url" });
  });

  it.each([
    ["application/xhtml+xml", "content_type"],
    ["text/html; charset=iso-8859-1", "content_type"],
    ["text/html; charset=utf-8; profile=fictional", "content_type"],
  ])("rejects media-type drift %s", async (contentType, code) => {
    await expect(
      fetchGoiaAccordPage({
        fetch: async () =>
          htmlResponse(goiaAccordFixture, {
            headers: { "Content-Type": contentType },
          }),
        resolveHostname: publicResolver,
      }),
    ).rejects.toMatchObject({ code });
  });

  it("accepts UTF-8 HTML with absent charset and rejects content transformation", async () => {
    await expect(
      fetchGoiaAccordPage({
        fetch: async () =>
          htmlResponse(goiaAccordFixture, {
            headers: {
              "Content-Type": "text/html",
              "Content-Encoding": "identity",
            },
          }),
        resolveHostname: publicResolver,
      }),
    ).resolves.toMatchObject({ pageUrl: GOIA_ACCORD_URL });
    await expect(
      fetchGoiaAccordPage({
        fetch: async () =>
          htmlResponse(goiaAccordFixture, {
            headers: { "Content-Encoding": "gzip" },
          }),
        resolveHostname: publicResolver,
      }),
    ).rejects.toMatchObject({ code: "content_encoding" });
  });

  it("enforces declared and received byte limits", async () => {
    const length = new TextEncoder().encode(goiaAccordFixture).byteLength;
    await expect(
      fetchGoiaAccordPage({
        fetch: async () =>
          htmlResponse(goiaAccordFixture, {
            headers: { "Content-Length": String(length) },
          }),
        resolveHostname: publicResolver,
      }),
    ).resolves.toMatchObject({ pageUrl: GOIA_ACCORD_URL });
    for (const declared of [
      "01",
      String(length + 1),
      String(GOIA_ACCORD_HTML_POLICY.maximumResponseBytes + 1),
    ]) {
      await expect(
        fetchGoiaAccordPage({
          fetch: async () =>
            htmlResponse(goiaAccordFixture, {
              headers: { "Content-Length": declared },
            }),
          resolveHostname: publicResolver,
        }),
      ).rejects.toMatchObject({
        code:
          Number(declared) > GOIA_ACCORD_HTML_POLICY.maximumResponseBytes
            ? "response_too_large"
            : "content_length",
      });
    }
    await expect(
      fetchGoiaAccordPage({
        fetch: async () =>
          htmlResponse(
            goiaAccordFixture +
              " ".repeat(GOIA_ACCORD_HTML_POLICY.maximumResponseBytes),
          ),
        resolveHostname: publicResolver,
      }),
    ).rejects.toMatchObject({ code: "response_too_large" });
  });

  it("bounds fragmentation and rejects invalid UTF-8", async () => {
    const encoded = new TextEncoder().encode(goiaAccordFixture);
    await expect(
      fetchGoiaAccordPage({
        fetch: async () =>
          responseWithUrl(
            new ReadableStream<Uint8Array>({
              start(controller) {
                for (
                  let index = 0;
                  index <= GOIA_ACCORD_HTML_POLICY.maximumChunks;
                  index += 1
                ) {
                  controller.enqueue(encoded.slice(index, index + 1));
                }
                controller.enqueue(
                  encoded.slice(GOIA_ACCORD_HTML_POLICY.maximumChunks + 1),
                );
                controller.close();
              },
            }),
          ),
        resolveHostname: publicResolver,
      }),
    ).rejects.toMatchObject({ code: "response_fragmentation" });

    await expect(
      fetchGoiaAccordPage({
        fetch: async () => responseWithUrl(new Uint8Array([0xc3, 0x28])),
        resolveHostname: publicResolver,
      }),
    ).rejects.toMatchObject({ code: "invalid_utf8" });
  });

  it("rejects absent, empty, or empty-fragment bodies", async () => {
    for (const body of [null, ""]) {
      await expect(
        fetchGoiaAccordPage({
          fetch: async () => responseWithUrl(body),
          resolveHostname: publicResolver,
        }),
      ).rejects.toMatchObject({ code: "missing_body" });
    }
    await expect(
      fetchGoiaAccordPage({
        fetch: async () =>
          responseWithUrl(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(new Uint8Array(0));
                controller.close();
              },
            }),
          ),
        resolveHostname: publicResolver,
      }),
    ).rejects.toMatchObject({ code: "response_fragmentation" });
  });

  it("zeroes every retained response-byte chunk after reading", async () => {
    const chunk = new TextEncoder().encode(goiaAccordFixture);
    await expect(
      fetchGoiaAccordPage({
        fetch: async () =>
          responseWithUrl(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(chunk);
                controller.close();
              },
            }),
          ),
        resolveHostname: publicResolver,
      }),
    ).resolves.toMatchObject({ pageUrl: GOIA_ACCORD_URL });
    expect(chunk.every((value) => value === 0)).toBe(true);
  });

  it("enforces the monotonic 30-second deadline before issuing a provider GET", async () => {
    const fetchMock = vi.fn<GoiaAccordFetchLike>(async () => htmlResponse());
    const samples = [0, GOIA_ACCORD_HTML_POLICY.timeoutMilliseconds + 1];
    await expect(
      fetchGoiaAccordPage({
        fetch: fetchMock,
        resolveHostname: publicResolver,
        monotonicNow: () => samples.shift() as number,
      }),
    ).rejects.toMatchObject({ code: "timeout" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("collapses parser drift and never exposes provider or parser detail", async () => {
    try {
      await fetchGoiaAccordPage({
        fetch: async () => htmlResponse("<html>fictional secret detail</html>"),
        resolveHostname: publicResolver,
      });
    } catch (error) {
      expect(error).toMatchObject({
        code: "invalid_html",
        message: "GOIA Centennial Accord page retrieval failed.",
      });
      expect(String(error)).not.toContain("fictional secret detail");
      return;
    }
    throw new Error("expected invalid HTML rejection");
  });
});
