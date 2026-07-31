import {
  WASHINGTON_LWS_XML_POLICY,
  type WashingtonLwsOperation,
} from "./constants";
import {
  buildWashingtonLwsSoapRequest,
  type WashingtonLwsRequestInput,
  type WashingtonLwsSoapRequest,
} from "./request-contract";
import {
  parseWashingtonLwsSoapExchange,
  type WashingtonLwsSoapResponse,
} from "./soap-contract";

export type WashingtonLwsFetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface WashingtonLwsTransportDependencies {
  fetchImpl?: WashingtonLwsFetchLike;
  now?: () => number;
}

export type WashingtonLwsTransportErrorCode =
  | "redirect"
  | "http_status"
  | "timeout"
  | "network"
  | "content_type"
  | "content_encoding"
  | "content_length"
  | "response_fragmentation"
  | "response_too_large"
  | "missing_body"
  | "invalid_soap";

export class WashingtonLwsTransportError extends Error {
  readonly code: WashingtonLwsTransportErrorCode;
  readonly status: number | null;

  constructor(
    code: WashingtonLwsTransportErrorCode,
    message: string,
    status: number | null = null,
  ) {
    super(message);
    this.name = "WashingtonLwsTransportError";
    this.code = code;
    this.status = status;
  }
}

export interface WashingtonLwsTransportReceipt<
  O extends WashingtonLwsOperation = WashingtonLwsOperation,
> {
  request: WashingtonLwsSoapRequest;
  httpStatus: number;
  mediaType: "text/xml";
  declaredBytes: number | null;
  receivedBytes: number;
  soap: WashingtonLwsSoapResponse<O>;
}

export const WASHINGTON_LWS_TRANSPORT_POLICY = {
  requestTimeoutMilliseconds: 30_000,
  responseMediaType: "text/xml",
  userAgent: "Policy-Sentinel/0.2 build-time source adapter",
  attempts: 1,
  maximumResponseChunks: 4_096,
} as const;

interface BoundedBody {
  bytes: Uint8Array;
  declaredBytes: number | null;
}

function timeoutError(): WashingtonLwsTransportError {
  return new WashingtonLwsTransportError(
    "timeout",
    "Washington LWS request exceeded the bounded timeout.",
  );
}

function httpStatusError(status: number): WashingtonLwsTransportError {
  return new WashingtonLwsTransportError(
    "http_status",
    "Washington LWS returned a status outside the reviewed transport contract.",
    status,
  );
}

function cancelBody(body: ReadableStream<Uint8Array> | null): void {
  if (body === null) {
    return;
  }
  try {
    void body.cancel().catch(() => undefined);
  } catch {
    // Best-effort cleanup must never mask the primary transport failure.
  }
}

function cancelReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  reason: unknown,
): void {
  try {
    void reader.cancel(reason).catch(() => undefined);
  } catch {
    // Best-effort cleanup must never mask the primary transport failure.
  }
}

function isReviewedContentType(value: string | null): boolean {
  if (value === null || value.includes(",")) {
    return false;
  }
  const [mediaType, ...parameters] = value
    .split(";")
    .map((part) => part.trim().toLowerCase());
  if (mediaType !== WASHINGTON_LWS_TRANSPORT_POLICY.responseMediaType) {
    return false;
  }
  if (parameters.length === 0) {
    return true;
  }
  return (
    parameters.length === 1 &&
    /^charset=(?:utf-8|"utf-8")$/.test(parameters[0] ?? "")
  );
}

function isReviewedContentEncoding(value: string | null): boolean {
  return value === null || value.trim().toLowerCase() === "identity";
}

function parseContentLength(
  value: string | null,
  status: number,
): number | null {
  if (value === null) {
    return null;
  }
  if (!/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new WashingtonLwsTransportError(
      "content_length",
      "Washington LWS declared an invalid Content-Length.",
      status,
    );
  }
  const length = Number(value);
  if (!Number.isSafeInteger(length)) {
    throw new WashingtonLwsTransportError(
      "content_length",
      "Washington LWS declared an unsafe Content-Length.",
      status,
    );
  }
  return length;
}

function assertUnredirectedResponse(
  response: Response,
  requestHref: string,
): void {
  if (response.redirected || response.url !== requestHref) {
    cancelBody(response.body);
    throw new WashingtonLwsTransportError(
      "redirect",
      "Washington LWS request followed an unreviewed redirect.",
      response.status,
    );
  }
  if (response.status >= 300 && response.status < 400) {
    cancelBody(response.body);
    throw new WashingtonLwsTransportError(
      "redirect",
      "Washington LWS returned an unreviewed redirect.",
      response.status,
    );
  }
}

function byteChunk(value: unknown): value is Uint8Array {
  return (
    ArrayBuffer.isView(value) &&
    Object.prototype.toString.call(value) === "[object Uint8Array]"
  );
}

async function readBoundedBody(
  response: Response,
  signal: AbortSignal,
): Promise<BoundedBody> {
  let declaredBytes: number | null;
  try {
    declaredBytes = parseContentLength(
      response.headers.get("content-length"),
      response.status,
    );
  } catch (error) {
    cancelBody(response.body);
    throw error;
  }
  if (
    declaredBytes !== null &&
    declaredBytes > WASHINGTON_LWS_XML_POLICY.maximumResponseBytes
  ) {
    cancelBody(response.body);
    throw new WashingtonLwsTransportError(
      "response_too_large",
      "Washington LWS response exceeds the reviewed byte limit.",
      response.status,
    );
  }
  if (response.body === null) {
    throw new WashingtonLwsTransportError(
      "missing_body",
      "Washington LWS response has no readable body.",
      response.status,
    );
  }
  if (signal.aborted) {
    cancelBody(response.body);
    throw timeoutError();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  let assembledBytes: Uint8Array | null = null;
  let returnedBytes = false;
  let cancellationRequested = false;
  const requestCancellation = (reason: unknown): void => {
    if (cancellationRequested) {
      return;
    }
    cancellationRequested = true;
    cancelReader(reader, reason);
  };
  const abortHandler = (): void => {
    requestCancellation(signal.reason);
  };
  signal.addEventListener("abort", abortHandler, { once: true });
  try {
    try {
      while (true) {
        const result = await reader.read();
        if (signal.aborted) {
          throw timeoutError();
        }
        if (result.done) {
          break;
        }
        if (!byteChunk(result.value)) {
          throw new WashingtonLwsTransportError(
            "network",
            "Washington LWS response stream returned a non-byte chunk.",
            response.status,
          );
        }
        if (result.value.byteLength === 0) {
          throw new WashingtonLwsTransportError(
            "response_fragmentation",
            "Washington LWS response stream returned an empty byte chunk.",
            response.status,
          );
        }
        chunks.push(result.value);
        if (
          chunks.length > WASHINGTON_LWS_TRANSPORT_POLICY.maximumResponseChunks
        ) {
          throw new WashingtonLwsTransportError(
            "response_fragmentation",
            "Washington LWS response exceeded the reviewed stream chunk limit.",
            response.status,
          );
        }
        receivedBytes += result.value.byteLength;
        if (receivedBytes > WASHINGTON_LWS_XML_POLICY.maximumResponseBytes) {
          throw new WashingtonLwsTransportError(
            "response_too_large",
            "Washington LWS response exceeded the reviewed byte limit.",
            response.status,
          );
        }
      }
    } catch (error) {
      requestCancellation(error);
      throw error;
    } finally {
      signal.removeEventListener("abort", abortHandler);
      reader.releaseLock();
    }

    if (receivedBytes === 0) {
      throw new WashingtonLwsTransportError(
        "missing_body",
        "Washington LWS response body is empty.",
        response.status,
      );
    }
    if (declaredBytes !== null && declaredBytes !== receivedBytes) {
      throw new WashingtonLwsTransportError(
        "content_length",
        "Washington LWS response length differs from its declaration.",
        response.status,
      );
    }

    assembledBytes = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      assembledBytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    returnedBytes = true;
    return { bytes: assembledBytes, declaredBytes };
  } finally {
    for (const chunk of chunks) {
      chunk.fill(0);
    }
    if (!returnedBytes) {
      assembledBytes?.fill(0);
    }
  }
}

function parseSoap<O extends WashingtonLwsOperation>(
  requestInput: Extract<WashingtonLwsRequestInput, { operation: O }>,
  bytes: Uint8Array,
  status: number,
): WashingtonLwsSoapResponse<O> {
  try {
    return parseWashingtonLwsSoapExchange(requestInput, bytes);
  } catch {
    throw new WashingtonLwsTransportError(
      "invalid_soap",
      "Washington LWS returned a response outside the reviewed SOAP contract.",
      status,
    );
  }
}

function assertWithinDeadline(
  startedAtMilliseconds: number,
  now: () => number,
): void {
  if (
    now() - startedAtMilliseconds >=
    WASHINGTON_LWS_TRANSPORT_POLICY.requestTimeoutMilliseconds
  ) {
    throw timeoutError();
  }
}

async function performRequest<O extends WashingtonLwsOperation>(
  requestInput: Extract<WashingtonLwsRequestInput, { operation: O }>,
  request: WashingtonLwsSoapRequest,
  fetchImpl: WashingtonLwsFetchLike,
  signal: AbortSignal,
  startedAtMilliseconds: number,
  now: () => number,
): Promise<WashingtonLwsTransportReceipt<O>> {
  const response = await fetchImpl(request.url, {
    method: request.method,
    headers: {
      Accept: request.headers.accept,
      "Accept-Encoding": "identity",
      "Content-Type": request.headers["content-type"],
      SOAPAction: request.headers.soapaction,
      "User-Agent": WASHINGTON_LWS_TRANSPORT_POLICY.userAgent,
    },
    body: request.body,
    cache: "no-store",
    credentials: "omit",
    redirect: "manual",
    referrerPolicy: "no-referrer",
    signal,
  });

  if (signal.aborted) {
    cancelBody(response.body);
    throw timeoutError();
  }
  assertUnredirectedResponse(response, request.url);
  if (response.status !== 200) {
    cancelBody(response.body);
    throw httpStatusError(response.status);
  }

  if (!isReviewedContentType(response.headers.get("content-type"))) {
    cancelBody(response.body);
    throw new WashingtonLwsTransportError(
      "content_type",
      "Washington LWS response did not use the reviewed SOAP 1.1 media type.",
      response.status,
    );
  }
  if (!isReviewedContentEncoding(response.headers.get("content-encoding"))) {
    cancelBody(response.body);
    throw new WashingtonLwsTransportError(
      "content_encoding",
      "Washington LWS response used an unreviewed content encoding.",
      response.status,
    );
  }

  const body = await readBoundedBody(response, signal);
  const receivedBytes = body.bytes.byteLength;
  try {
    assertWithinDeadline(startedAtMilliseconds, now);
    let soap: WashingtonLwsSoapResponse<O>;
    try {
      soap = parseSoap(requestInput, body.bytes, response.status);
    } catch (error) {
      assertWithinDeadline(startedAtMilliseconds, now);
      throw error;
    }
    assertWithinDeadline(startedAtMilliseconds, now);
    return {
      request,
      httpStatus: response.status,
      mediaType: WASHINGTON_LWS_TRANSPORT_POLICY.responseMediaType,
      declaredBytes: body.declaredBytes,
      receivedBytes,
      soap,
    };
  } finally {
    body.bytes.fill(0);
  }
}

function classifyThrownRequestError(
  error: unknown,
  signal: AbortSignal,
): WashingtonLwsTransportError {
  if (error instanceof WashingtonLwsTransportError) {
    return error;
  }
  if (signal.aborted) {
    return timeoutError();
  }
  return new WashingtonLwsTransportError(
    "network",
    "Washington LWS request failed before a validated SOAP response was received.",
  );
}

export async function fetchWashingtonLwsSoapExchange<
  O extends WashingtonLwsOperation,
>(
  requestInput: Extract<WashingtonLwsRequestInput, { operation: O }>,
  dependencies: WashingtonLwsTransportDependencies = {},
): Promise<WashingtonLwsTransportReceipt<O>> {
  buildWashingtonLwsSoapRequest(requestInput);
  const immutableRequestInput = structuredClone(requestInput) as Extract<
    WashingtonLwsRequestInput,
    { operation: O }
  >;
  const request = buildWashingtonLwsSoapRequest(immutableRequestInput);
  const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch;
  const now = dependencies.now ?? (() => globalThis.performance.now());
  const startedAtMilliseconds = now();
  const controller = new AbortController();
  const deadlineFailure = timeoutError();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort(deadlineFailure);
      reject(deadlineFailure);
    }, WASHINGTON_LWS_TRANSPORT_POLICY.requestTimeoutMilliseconds);
  });

  try {
    return await Promise.race([
      performRequest(
        immutableRequestInput,
        request,
        fetchImpl,
        controller.signal,
        startedAtMilliseconds,
        now,
      ),
      deadline,
    ]);
  } catch (error) {
    throw classifyThrownRequestError(error, controller.signal);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}
