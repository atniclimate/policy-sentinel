import { describe, expect, it, vi } from "vitest";

import {
  SUPREME_COURT_HTML_POLICY,
  SUPREME_COURT_TERM_URL,
  SUPREME_COURT_USER_AGENT,
  fetchSupremeCourtTermIndex,
  type SupremeCourtFetchLike,
} from "../../../src/adapters/supreme-court-opinions-curated";
import {
  htmlResponse,
  responseWithUrl,
  supremeCourtFixture,
} from "./test-helpers";

describe("Supreme Court curated-opinion bounded HTML transport", () => {
  it("makes one exact privacy-minimized GET and returns only the typed projection", async () => {
    let capturedInput: string | URL | undefined;
    let capturedInit: RequestInit | undefined;
    const fetchMock: SupremeCourtFetchLike = vi.fn(async (input, init) => {
      capturedInput = input;
      capturedInit = init;
      return htmlResponse();
    });
    const index = await fetchSupremeCourtTermIndex({ fetch: fetchMock });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(capturedInput)).toBe(SUPREME_COURT_TERM_URL);
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
    expect(headers.get("User-Agent")).toBe(SUPREME_COURT_USER_AGENT);
    expect(capturedInit?.signal).toBeInstanceOf(AbortSignal);
    expect(index.rows).toHaveLength(1);
    expect(JSON.stringify(index)).not.toContain("OUTER_SCOTUS");
  });

  it.each([403, 429, 500, 503])("does not retry HTTP %s", async (status) => {
    const fetchMock = vi.fn(async () =>
      htmlResponse(supremeCourtFixture, { status }),
    );
    await expect(
      fetchSupremeCourtTermIndex({ fetch: fetchMock }),
    ).rejects.toMatchObject({ code: "http_status" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects redirects and final-URL drift", async () => {
    await expect(
      fetchSupremeCourtTermIndex({
        fetch: async () => htmlResponse(supremeCourtFixture, { status: 302 }),
      }),
    ).rejects.toMatchObject({ code: "redirect" });
    await expect(
      fetchSupremeCourtTermIndex({
        fetch: async () =>
          htmlResponse(supremeCourtFixture, {
            url: `${SUPREME_COURT_TERM_URL}?substitute=1`,
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
      fetchSupremeCourtTermIndex({
        fetch: async () =>
          htmlResponse(supremeCourtFixture, {
            headers: { "Content-Type": contentType },
          }),
      }),
    ).rejects.toMatchObject({ code });
  });

  it("accepts absent charset and identity encoding but rejects transformed bodies", async () => {
    await expect(
      fetchSupremeCourtTermIndex({
        fetch: async () =>
          htmlResponse(supremeCourtFixture, {
            headers: {
              "Content-Type": "text/html",
              "Content-Encoding": "identity",
            },
          }),
      }),
    ).resolves.toMatchObject({ dataRowCount: 73 });
    await expect(
      fetchSupremeCourtTermIndex({
        fetch: async () =>
          htmlResponse(supremeCourtFixture, {
            headers: { "Content-Encoding": "gzip" },
          }),
      }),
    ).rejects.toMatchObject({ code: "content_encoding" });
  });

  it("enforces declared length syntax, ceiling, and byte reconciliation", async () => {
    const byteLength = new TextEncoder().encode(supremeCourtFixture).byteLength;
    await expect(
      fetchSupremeCourtTermIndex({
        fetch: async () =>
          htmlResponse(supremeCourtFixture, {
            headers: { "Content-Length": String(byteLength) },
          }),
      }),
    ).resolves.toMatchObject({ dataRowCount: 73 });

    for (const contentLength of [
      "01",
      String(byteLength + 1),
      String(SUPREME_COURT_HTML_POLICY.maximumResponseBytes + 1),
    ]) {
      await expect(
        fetchSupremeCourtTermIndex({
          fetch: async () =>
            htmlResponse(supremeCourtFixture, {
              headers: { "Content-Length": contentLength },
            }),
        }),
      ).rejects.toMatchObject({
        code:
          Number(contentLength) > SUPREME_COURT_HTML_POLICY.maximumResponseBytes
            ? "response_too_large"
            : "content_length",
      });
    }
  });

  it("accepts the exact byte and nonempty-chunk ceilings", async () => {
    const fixtureBytes = new TextEncoder().encode(
      supremeCourtFixture,
    ).byteLength;
    const fillerLength =
      SUPREME_COURT_HTML_POLICY.maximumResponseBytes -
      fixtureBytes -
      "<!---->".length;
    const boundary = `${supremeCourtFixture}<!--${"x".repeat(fillerLength)}-->`;
    expect(new TextEncoder().encode(boundary)).toHaveLength(
      SUPREME_COURT_HTML_POLICY.maximumResponseBytes,
    );
    await expect(
      fetchSupremeCourtTermIndex({ fetch: async () => htmlResponse(boundary) }),
    ).resolves.toMatchObject({ dataRowCount: 73 });

    const encoded = new TextEncoder().encode(supremeCourtFixture);
    await expect(
      fetchSupremeCourtTermIndex({
        fetch: async () =>
          responseWithUrl(
            new ReadableStream<Uint8Array>({
              start(controller) {
                for (
                  let index = 0;
                  index < SUPREME_COURT_HTML_POLICY.maximumChunks - 1;
                  index += 1
                ) {
                  controller.enqueue(encoded.slice(index, index + 1));
                }
                controller.enqueue(
                  encoded.slice(SUPREME_COURT_HTML_POLICY.maximumChunks - 1),
                );
                controller.close();
              },
            }),
          ),
      }),
    ).resolves.toMatchObject({ dataRowCount: 73 });
  });

  it("rejects missing, empty-chunk, invalid UTF-8, fragmented, and oversized bodies", async () => {
    await expect(
      fetchSupremeCourtTermIndex({ fetch: async () => responseWithUrl(null) }),
    ).rejects.toMatchObject({ code: "missing_body" });

    await expect(
      fetchSupremeCourtTermIndex({
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

    await expect(
      fetchSupremeCourtTermIndex({
        fetch: async () => responseWithUrl(new Uint8Array([0xc3])),
      }),
    ).rejects.toMatchObject({ code: "invalid_utf8" });

    await expect(
      fetchSupremeCourtTermIndex({
        fetch: async () =>
          responseWithUrl(
            new ReadableStream<Uint8Array>({
              start(controller) {
                for (
                  let index = 0;
                  index <= SUPREME_COURT_HTML_POLICY.maximumChunks;
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

    await expect(
      fetchSupremeCourtTermIndex({
        fetch: async () =>
          responseWithUrl(
            new Uint8Array(SUPREME_COURT_HTML_POLICY.maximumResponseBytes + 1),
          ),
      }),
    ).rejects.toMatchObject({ code: "response_too_large" });
  });

  it("zeroes consumed chunks", async () => {
    const chunk = new TextEncoder().encode(supremeCourtFixture);
    await fetchSupremeCourtTermIndex({
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

  it("enforces one whole-operation monotonic deadline", async () => {
    const monotonicNow = vi
      .fn<() => number>()
      .mockReturnValueOnce(0)
      .mockReturnValue(30_001);
    await expect(
      fetchSupremeCourtTermIndex({
        fetch: async () => htmlResponse(),
        monotonicNow,
      }),
    ).rejects.toMatchObject({ code: "timeout" });

    const fetchMock = vi.fn(async () => htmlResponse());
    await expect(
      fetchSupremeCourtTermIndex({
        fetch: fetchMock,
        monotonicNow() {
          throw new Error("REJECTED_CLOCK_SENTINEL");
        },
      }),
    ).rejects.toMatchObject({ code: "timeout" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps network and HTML details to fixed sanitized categories", async () => {
    await expect(
      fetchSupremeCourtTermIndex({
        fetch: async () => {
          throw new Error("provider https://sensitive.example.invalid/body");
        },
      }),
    ).rejects.toMatchObject({
      code: "network",
      message: "Supreme Court curated-opinion index retrieval failed.",
    });
    await expect(
      fetchSupremeCourtTermIndex({
        fetch: async () =>
          htmlResponse(
            supremeCourtFixture.replace(
              "Opinions of the Court - 2018",
              "REJECTED_HTML_SENTINEL",
            ),
          ),
      }),
    ).rejects.toMatchObject({
      code: "invalid_html",
      message: "Supreme Court curated-opinion index retrieval failed.",
    });
  });
});
