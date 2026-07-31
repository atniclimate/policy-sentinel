import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { WASHINGTON_LWS_XML_POLICY } from "../../../src/contracts/washington-lws/constants";
import type { WashingtonLwsRequestInput } from "../../../src/contracts/washington-lws/request-contract";
import {
  fetchWashingtonLwsSoapExchange,
  WASHINGTON_LWS_TRANSPORT_ERROR_CODES,
  WASHINGTON_LWS_TRANSPORT_POLICY,
  type WashingtonLwsFetchLike,
} from "../../../src/contracts/washington-lws/transport";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const LEGISLATION_REQUEST = {
  operation: "GetLegislation",
  biennium: "3785-86",
  billNumber: 999_991,
} as const satisfies WashingtonLwsRequestInput;

function fixture(name: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(
    readFileSync(
      path.resolve(projectRoot, "fixtures/sources/washington-lws", name),
    ),
  );
}

function soapResponse(
  body: BodyInit | null = fixture("get-legislation.valid.xml"),
  {
    status = 200,
    contentType = "text/xml; charset=utf-8",
    headers = {},
    responseUrl = "https://wslwebservices.leg.wa.gov/legislationservice.asmx",
  }: {
    status?: number;
    contentType?: string | null;
    headers?: Record<string, string>;
    responseUrl?: string;
  } = {},
): Response {
  const responseHeaders = new Headers(headers);
  if (contentType !== null) {
    responseHeaders.set("Content-Type", contentType);
  }
  const response = new Response(body, { status, headers: responseHeaders });
  Object.defineProperty(response, "url", {
    configurable: true,
    value: responseUrl,
  });
  return response;
}

function queuedFetch(
  responses: Array<() => Response | Promise<Response>>,
): WashingtonLwsFetchLike {
  return async () => {
    const next = responses.shift();
    if (next === undefined) {
      throw new Error("Unexpected synthetic request");
    }
    return next();
  };
}

function streamedSoapResponse(
  chunks: Uint8Array[],
  headers: Record<string, string> = {},
): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
  return {
    body,
    headers: new Headers({
      "Content-Type": "text/xml; charset=utf-8",
      ...headers,
    }),
    redirected: false,
    status: 200,
    url: "https://wslwebservices.leg.wa.gov/legislationservice.asmx",
  } as unknown as Response;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Washington LWS bounded SOAP transport", () => {
  it("runtime-freezes the transport policy and sanitized error-code allowlist", () => {
    expect(Object.isFrozen(WASHINGTON_LWS_TRANSPORT_POLICY)).toBe(true);
    expect(Object.isFrozen(WASHINGTON_LWS_TRANSPORT_ERROR_CODES)).toBe(true);

    const transportPolicy = WASHINGTON_LWS_TRANSPORT_POLICY as unknown as {
      requestTimeoutMilliseconds: number;
      maximumResponseChunks: number;
      responseMediaType: string;
    };
    expect(() =>
      Object.assign(transportPolicy, {
        requestTimeoutMilliseconds: Number.MAX_SAFE_INTEGER,
        maximumResponseChunks: Number.MAX_SAFE_INTEGER,
        responseMediaType: "*/*",
      }),
    ).toThrow(TypeError);
    expect(transportPolicy).toMatchObject({
      requestTimeoutMilliseconds: 30_000,
      maximumResponseChunks: 4_096,
      responseMediaType: "text/xml",
    });
  });

  it("sends the canonical keyless request and returns only a typed bounded receipt", async () => {
    const responseBytes = fixture("get-legislation.valid.xml");
    let capturedInput: RequestInfo | URL | undefined;
    let capturedInit: RequestInit | undefined;
    const fetchImpl: WashingtonLwsFetchLike = async (input, init) => {
      capturedInput = input;
      capturedInit = init;
      return soapResponse(responseBytes, {
        contentType: "Text/XML; charset=utf-8",
        headers: {
          "Content-Encoding": "identity",
          "Content-Length": String(responseBytes.byteLength),
        },
      });
    };

    const receipt = await fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
      fetchImpl,
    });

    expect(capturedInput).toBe(
      "https://wslwebservices.leg.wa.gov/legislationservice.asmx",
    );
    expect(capturedInit).toMatchObject({
      method: "POST",
      body: receipt.request.body,
      cache: "no-store",
      credentials: "omit",
      redirect: "manual",
      referrerPolicy: "no-referrer",
    });
    expect(capturedInit?.signal).toBeInstanceOf(AbortSignal);
    const headers = new Headers(capturedInit?.headers);
    expect(headers.get("Accept")).toBe("text/xml");
    expect(headers.get("Accept-Encoding")).toBe("identity");
    expect(headers.get("Content-Type")).toBe("text/xml; charset=utf-8");
    expect(headers.get("SOAPAction")).toBe(
      '"http://WSLWebServices.leg.wa.gov/GetLegislation"',
    );
    expect(headers.get("User-Agent")).toBe(
      "Policy-Sentinel/0.2 build-time source adapter",
    );
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.has("Cookie")).toBe(false);
    expect(receipt).toMatchObject({
      httpStatus: 200,
      mediaType: "text/xml",
      declaredBytes: responseBytes.byteLength,
      receivedBytes: responseBytes.byteLength,
      soap: {
        kind: "success",
        operation: "GetLegislation",
        resultState: "present",
      },
    });
    expect(receipt.soap.request).toEqual(receipt.request);
    if (receipt.soap.kind === "success") {
      expect(receipt.soap.result).toHaveLength(2);
    }
    expect(receipt).not.toHaveProperty("bytes");
    expect(JSON.stringify(receipt)).not.toContain("<LegislationResponse");
  });

  it("zeroes source stream chunks after copying them into the parser boundary", async () => {
    const sourceChunk = fixture("get-legislation.valid.xml");

    const receipt = await fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
      fetchImpl: queuedFetch([
        () =>
          streamedSoapResponse([sourceChunk], {
            "Content-Length": String(sourceChunk.byteLength),
          }),
      ]),
    });

    expect(receipt.soap.kind).toBe("success");
    expect(sourceChunk.every((byte) => byte === 0)).toBe(true);
  });

  it.each([
    {
      request: LEGISLATION_REQUEST,
      fixtureName: "get-legislation.valid.xml",
    },
    {
      request: {
        operation: "GetLegislativeStatusChangesByBillId",
        biennium: "3785-86",
        billId: "SYNTHETIC-HB-999991-SUB1-ENG2",
        beginDate: "3785-01-01T00:00:00.000Z",
        endDate: "3785-01-31T00:00:00.000Z",
      },
      fixtureName: "get-legislative-status-changes-by-bill-id.valid.xml",
    },
    {
      request: {
        operation: "GetSponsors",
        biennium: "3785-86",
        billId: "SYNTHETIC-HB-999991-SUB1-ENG2",
      },
      fixtureName: "get-sponsors.valid.xml",
    },
    {
      request: {
        operation: "GetCommitteeReferralsByBill",
        biennium: "3785-86",
        billNumber: 999_991,
      },
      fixtureName: "get-committee-referrals-by-bill.valid.xml",
    },
    {
      request: {
        operation: "GetDocuments",
        biennium: "3785-86",
        namedLike: "SYNTHETIC-HB-999991-SUB1-ENG2",
      },
      fixtureName: "get-documents.valid.xml",
    },
    {
      request: {
        operation: "GetSessionLawByBillId",
        biennium: "3785-86",
        billId: "SYNTHETIC-HB-999991-SUB1-ENG2",
      },
      fixtureName: "get-session-law-by-bill-id.valid.xml",
    },
  ] as const)(
    "integrates the canonical $request.operation request with its bounded response parser",
    async ({ request, fixtureName }) => {
      const receipt = await fetchWashingtonLwsSoapExchange(request, {
        fetchImpl: async (input) =>
          soapResponse(fixture(fixtureName), {
            responseUrl: String(input),
          }),
      });

      expect(receipt).toMatchObject({
        httpStatus: 200,
        soap: {
          kind: "success",
          operation: request.operation,
          resultState: "present",
        },
      });
    },
  );

  it.each([3_785, 2_025, 2_026])(
    "keeps yearly enumeration disabled before fetch for year %s",
    async (year) => {
      const fetchImpl = vi.fn<WashingtonLwsFetchLike>(async () =>
        soapResponse(fixture("get-legislation-by-year.valid.xml")),
      );

      await expect(
        fetchWashingtonLwsSoapExchange(
          {
            operation: "GetLegislationByYear",
            year,
          },
          { fetchImpl },
        ),
      ).rejects.toThrowError(
        /not enabled for Washington LWS network transport/,
      );
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("does not resolve network dependencies for disabled yearly enumeration", async () => {
    let fetchDependencyReads = 0;
    const dependencies: {
      fetchImpl?: WashingtonLwsFetchLike;
    } = {};
    Object.defineProperty(dependencies, "fetchImpl", {
      get() {
        fetchDependencyReads += 1;
        throw new Error("PROHIBITED-DISABLED-FETCH-DEPENDENCY");
      },
    });

    await expect(
      fetchWashingtonLwsSoapExchange(
        {
          operation: "GetLegislationByYear",
          year: 2_025,
        },
        dependencies,
      ),
    ).rejects.toThrowError(/not enabled for Washington LWS network transport/);
    expect(fetchDependencyReads).toBe(0);
  });

  it("takes an immutable validated request snapshot before awaiting fetch", async () => {
    const mutableRequest: WashingtonLwsRequestInput = {
      ...LEGISLATION_REQUEST,
    };
    const fetchImpl: WashingtonLwsFetchLike = async () => {
      if (mutableRequest.operation === "GetLegislation") {
        mutableRequest.billNumber = 1;
      }
      return soapResponse();
    };

    const receipt = await fetchWashingtonLwsSoapExchange(mutableRequest, {
      fetchImpl,
    });

    expect(receipt.soap.kind).toBe("success");
    expect(receipt.request.body).toContain("<billNumber>999991</billNumber>");
    expect(receipt.request.body).not.toContain("<billNumber>1</billNumber>");
  });

  it("rejects invalid request input before invoking fetch", async () => {
    const fetchImpl = vi.fn(async () => soapResponse());
    await expect(
      fetchWashingtonLwsSoapExchange(
        {
          ...LEGISLATION_REQUEST,
          apiKey: "must-not-exist",
        } as unknown as typeof LEGISLATION_REQUEST,
        { fetchImpl },
      ),
    ).rejects.toMatchObject({ name: "WashingtonLwsContractError" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    "redirected",
    "changed-url",
    "empty-url",
    "redirect-status",
  ] as const)(
    "rejects an unreviewed $condition response without parsing its body",
    async (condition) => {
      const response =
        condition === "redirect-status"
          ? soapResponse(null, { status: 302 })
          : soapResponse();
      if (condition === "redirected") {
        Object.defineProperty(response, "redirected", { value: true });
      }
      if (condition === "changed-url" || condition === "empty-url") {
        Object.defineProperty(response, "url", {
          value:
            condition === "empty-url"
              ? ""
              : "https://wslwebservices.leg.wa.gov/sessionlawservice.asmx",
        });
      }

      await expect(
        fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
          fetchImpl: queuedFetch([() => response]),
        }),
      ).rejects.toMatchObject({ code: "redirect" });
    },
  );

  it("returns a sanitized SOAP fault carried by the only accepted HTTP status", async () => {
    const receipt = await fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
      fetchImpl: queuedFetch([
        () => soapResponse(fixture("soap-fault.valid.xml")),
      ]),
    });

    expect(receipt).toMatchObject({
      httpStatus: 200,
      soap: {
        kind: "fault",
        fault: {
          category: "unclassified_provider_fault",
          codeLexicalDiscarded: true,
          providerTextDiscarded: true,
        },
      },
    });
    expect(JSON.stringify(receipt)).not.toContain("soap:Client");
    expect(JSON.stringify(receipt)).not.toContain("SYNTHETIC CLIENT FAULT");
  });

  it.each([
    ["SOAP fault", "soap-fault.valid.xml"],
    ["success envelope", "get-legislation.valid.xml"],
  ] as const)(
    "rejects an HTTP 500 $label body unread before live status behavior is approved",
    async (_label, fixtureName) => {
      let cancellations = 0;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(fixture(fixtureName));
        },
        cancel() {
          cancellations += 1;
        },
      });
      await expect(
        fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
          fetchImpl: queuedFetch([() => soapResponse(body, { status: 500 })]),
        }),
      ).rejects.toMatchObject({ code: "http_status", status: 500 });
      await Promise.resolve();
      expect(cancellations).toBe(1);
    },
  );

  it.each([201, 204, 299])(
    "rejects unreviewed non-200 success status %s",
    async (status) => {
      await expect(
        fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
          fetchImpl: queuedFetch([
            () => soapResponse(null, { status, contentType: null }),
          ]),
        }),
      ).rejects.toMatchObject({ code: "http_status", status });
    },
  );

  it("does not read or retry an unreviewed non-XML error response", async () => {
    let cancellations = 0;
    let calls = 0;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("synthetic error"));
      },
      cancel() {
        cancellations += 1;
      },
    });
    const fetchImpl: WashingtonLwsFetchLike = async () => {
      calls += 1;
      return soapResponse(body, {
        status: 503,
        contentType: "text/html",
      });
    };

    await expect(
      fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, { fetchImpl }),
    ).rejects.toMatchObject({ code: "http_status", status: 503 });
    await Promise.resolve();
    expect(calls).toBe(WASHINGTON_LWS_TRANSPORT_POLICY.attempts);
    expect(cancellations).toBe(1);
  });

  it.each([
    null,
    "application/soap+xml",
    "text/html",
    "text/xml; charset=utf-16",
    "text/xml; charset=utf-8; boundary=unsafe",
    "text/xml, text/xml",
  ])("rejects success Content-Type %s", async (contentType) => {
    await expect(
      fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
        fetchImpl: queuedFetch([
          () => soapResponse(undefined, { contentType }),
        ]),
      }),
    ).rejects.toMatchObject({ code: "content_type", status: 200 });
  });

  it.each(["gzip", "br", "identity, gzip"])(
    "rejects unreviewed Content-Encoding %s before reading",
    async (contentEncoding) => {
      await expect(
        fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
          fetchImpl: queuedFetch([
            () =>
              soapResponse(undefined, {
                headers: { "Content-Encoding": contentEncoding },
              }),
          ]),
        }),
      ).rejects.toMatchObject({ code: "content_encoding", status: 200 });
    },
  );

  it("rejects an empty byte chunk as unreviewed stream fragmentation", async () => {
    await expect(
      fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
        fetchImpl: queuedFetch([
          () =>
            streamedSoapResponse([
              new Uint8Array(0),
              fixture("get-legislation.valid.xml"),
            ]),
        ]),
      }),
    ).rejects.toMatchObject({
      code: "response_fragmentation",
      status: 200,
    });
  });

  it("bounds response stream chunk count independently of aggregate bytes", async () => {
    const chunks = Array.from(
      {
        length: WASHINGTON_LWS_TRANSPORT_POLICY.maximumResponseChunks + 1,
      },
      () => new Uint8Array([0x20]),
    );

    await expect(
      fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
        fetchImpl: queuedFetch([() => streamedSoapResponse(chunks)]),
      }),
    ).rejects.toMatchObject({
      code: "response_fragmentation",
      status: 200,
    });

    expect(chunks.every((chunk) => chunk[0] === 0)).toBe(true);
  });

  it.each(["-1", "01", "9007199254740992", "1, 2"])(
    "rejects invalid declared Content-Length %s and cancels the body",
    async (contentLength) => {
      let cancellations = 0;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(fixture("get-legislation.valid.xml"));
        },
        cancel() {
          cancellations += 1;
        },
      });
      await expect(
        fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
          fetchImpl: queuedFetch([
            () =>
              soapResponse(body, {
                headers: { "Content-Length": contentLength },
              }),
          ]),
        }),
      ).rejects.toMatchObject({ code: "content_length" });
      await Promise.resolve();
      expect(cancellations).toBe(1);
    },
  );

  it("enforces both declared and streamed response byte limits", async () => {
    await expect(
      fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
        fetchImpl: queuedFetch([
          () =>
            soapResponse(null, {
              headers: {
                "Content-Length": String(
                  WASHINGTON_LWS_XML_POLICY.maximumResponseBytes + 1,
                ),
              },
            }),
        ]),
      }),
    ).rejects.toMatchObject({ code: "response_too_large", status: 200 });

    const oversized = new Uint8Array(
      WASHINGTON_LWS_XML_POLICY.maximumResponseBytes + 1,
    );
    oversized.fill(0x20);
    await expect(
      fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
        fetchImpl: queuedFetch([() => soapResponse(oversized)]),
      }),
    ).rejects.toMatchObject({ code: "response_too_large", status: 200 });
  });

  it("zeroes every retained stream chunk when the streamed byte limit fails", async () => {
    const atLimit = new Uint8Array(
      WASHINGTON_LWS_XML_POLICY.maximumResponseBytes,
    );
    atLimit.fill(0x20);
    const overflow = new Uint8Array([0x20]);

    await expect(
      fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
        fetchImpl: queuedFetch([
          () => streamedSoapResponse([atLimit, overflow]),
        ]),
      }),
    ).rejects.toMatchObject({ code: "response_too_large", status: 200 });

    expect(atLimit.every((byte) => byte === 0)).toBe(true);
    expect(overflow.every((byte) => byte === 0)).toBe(true);
  });

  it("accepts transport bodies from one byte through the exact maximum before SOAP validation", async () => {
    await expect(
      fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
        fetchImpl: queuedFetch([() => soapResponse(new Uint8Array([0x20]))]),
      }),
    ).rejects.toMatchObject({ code: "invalid_soap", status: 200 });

    const atLimit = new Uint8Array(
      WASHINGTON_LWS_XML_POLICY.maximumResponseBytes,
    );
    atLimit.fill(0x20);
    await expect(
      fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
        fetchImpl: queuedFetch([() => soapResponse(atLimit)]),
      }),
    ).rejects.toMatchObject({ code: "invalid_soap", status: 200 });
  });

  it("rejects a declared/received byte mismatch under identity encoding", async () => {
    const responseBytes = fixture("get-legislation.valid.xml");
    await expect(
      fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
        fetchImpl: queuedFetch([
          () =>
            soapResponse(responseBytes, {
              headers: {
                "Content-Length": String(responseBytes.byteLength - 1),
              },
            }),
        ]),
      }),
    ).rejects.toMatchObject({ code: "content_length", status: 200 });
  });

  it("maps malformed or request-inconsistent HTTP 200 XML to a sanitized contract failure", async () => {
    const malformed = new TextEncoder().encode(
      '<?xml version="1.0" encoding="utf-8"?><not-soap />',
    );
    await expect(
      fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
        fetchImpl: queuedFetch([() => soapResponse(malformed)]),
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "invalid_soap",
        status: 200,
        message: expect.not.stringContaining("<not-soap"),
      }),
    );

    const mismatched = new TextEncoder().encode(
      new TextDecoder()
        .decode(fixture("get-legislation.valid.xml"))
        .replace(
          "<BillNumber>999991</BillNumber>",
          "<BillNumber>999990</BillNumber>",
        ),
    );
    await expect(
      fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
        fetchImpl: queuedFetch([() => soapResponse(mismatched)]),
      }),
    ).rejects.toMatchObject({ code: "invalid_soap", status: 200 });
  });

  it("rejects an empty HTTP 200 body before SOAP parsing", async () => {
    await expect(
      fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
        fetchImpl: queuedFetch([() => soapResponse(null)]),
      }),
    ).rejects.toMatchObject({ code: "missing_body", status: 200 });
  });

  it("uses one attempt and sanitizes a thrown network failure", async () => {
    let calls = 0;
    const fetchImpl: WashingtonLwsFetchLike = async () => {
      calls += 1;
      throw new Error("provider-specific synthetic network detail");
    };
    const error = await fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
      fetchImpl,
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "network", status: null });
    expect(String(error)).not.toContain("provider-specific");
    expect(calls).toBe(WASHINGTON_LWS_TRANSPORT_POLICY.attempts);
  });

  it("clears the hard deadline after a successful response", async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const receipt = await fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
      fetchImpl: async (_input, init) => {
        signals.push(init?.signal as AbortSignal);
        return soapResponse();
      },
    });
    expect(receipt.soap.kind).toBe("success");
    await vi.advanceTimersByTimeAsync(
      WASHINGTON_LWS_TRANSPORT_POLICY.requestTimeoutMilliseconds,
    );
    expect(signals).toHaveLength(1);
    expect(signals[0]?.aborted).toBe(false);
  });

  it("rejects a late parser result using monotonic elapsed time", async () => {
    const startedAt = 1_000;
    const now = vi
      .fn<() => number>()
      .mockReturnValueOnce(startedAt)
      .mockReturnValueOnce(
        startedAt +
          WASHINGTON_LWS_TRANSPORT_POLICY.requestTimeoutMilliseconds -
          1,
      )
      .mockReturnValueOnce(
        startedAt + WASHINGTON_LWS_TRANSPORT_POLICY.requestTimeoutMilliseconds,
      );

    await expect(
      fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
        fetchImpl: queuedFetch([() => soapResponse()]),
        now,
      }),
    ).rejects.toMatchObject({ code: "timeout", status: null });
    expect(now).toHaveBeenCalledTimes(3);
  });

  it("enforces one hard deadline when fetch ignores abort", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      () => new Promise<Response>(() => undefined),
    ) as WashingtonLwsFetchLike;
    const pending = fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
      fetchImpl,
    });
    const rejection = expect(pending).rejects.toMatchObject({
      code: "timeout",
      status: null,
    });

    await vi.advanceTimersByTimeAsync(
      WASHINGTON_LWS_TRANSPORT_POLICY.requestTimeoutMilliseconds,
    );
    await rejection;
    expect(fetchImpl).toHaveBeenCalledTimes(
      WASHINGTON_LWS_TRANSPORT_POLICY.attempts,
    );
  });

  it("enforces the deadline and cancels a stalled response reader", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn(async () => undefined);
    const releaseLock = vi.fn();
    const reader = {
      cancel,
      read: vi.fn(
        () =>
          new Promise<ReadableStreamReadResult<Uint8Array>>(() => undefined),
      ),
      releaseLock,
    };
    const response = {
      body: {
        cancel: vi.fn(async () => undefined),
        getReader: () => reader,
      },
      headers: new Headers({ "Content-Type": "text/xml" }),
      redirected: false,
      status: 200,
      url: "https://wslwebservices.leg.wa.gov/legislationservice.asmx",
    } as unknown as Response;
    const pending = fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
      fetchImpl: queuedFetch([() => response]),
    });
    const rejection = expect(pending).rejects.toMatchObject({
      code: "timeout",
      status: null,
    });

    await vi.advanceTimersByTimeAsync(
      WASHINGTON_LWS_TRANSPORT_POLICY.requestTimeoutMilliseconds,
    );
    await rejection;
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("cancels a failed response reader and returns a generic network error", async () => {
    const cancel = vi.fn(async () => undefined);
    const releaseLock = vi.fn();
    const reader = {
      cancel,
      read: vi.fn(async () => {
        throw new Error("provider-specific synthetic body failure");
      }),
      releaseLock,
    };
    const response = {
      body: {
        cancel: vi.fn(async () => undefined),
        getReader: () => reader,
      },
      headers: new Headers({ "Content-Type": "text/xml" }),
      redirected: false,
      status: 200,
      url: "https://wslwebservices.leg.wa.gov/legislationservice.asmx",
    } as unknown as Response;
    const error = await fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
      fetchImpl: queuedFetch([() => response]),
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "network", status: null });
    expect(String(error)).not.toContain("provider-specific");
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(releaseLock).toHaveBeenCalledTimes(1);
  });

  it("rejects a non-byte response chunk, cancels its reader, and releases the lock", async () => {
    const cancel = vi.fn(async () => undefined);
    const releaseLock = vi.fn();
    const reader = {
      cancel,
      read: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: "not-bytes" })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock,
    };
    const response = {
      body: {
        cancel: vi.fn(async () => undefined),
        getReader: () => reader,
      },
      headers: new Headers({ "Content-Type": "text/xml" }),
      redirected: false,
      status: 200,
      url: "https://wslwebservices.leg.wa.gov/legislationservice.asmx",
    } as unknown as Response;

    await expect(
      fetchWashingtonLwsSoapExchange(LEGISLATION_REQUEST, {
        fetchImpl: queuedFetch([() => response]),
      }),
    ).rejects.toMatchObject({ code: "network", status: 200 });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(releaseLock).toHaveBeenCalledTimes(1);
  });
});
