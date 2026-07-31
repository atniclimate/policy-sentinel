import {
  SUPREME_COURT_HTML_POLICY,
  SUPREME_COURT_TERM_URL,
  SUPREME_COURT_USER_AGENT,
} from "./constants";
import {
  SupremeCourtContractError,
  SupremeCourtTransportError,
} from "./errors";
import { assertSupremeCourtTermIndexUrl } from "./query-contract";
import {
  parseSupremeCourtTermIndex,
  type SupremeCourtTermIndex,
} from "./response-contract";

export type SupremeCourtFetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface SupremeCourtTransportDependencies {
  fetch?: SupremeCourtFetchLike;
  monotonicNow?: () => number;
}

function assertContentType(response: Response): void {
  const value = response.headers.get("content-type");
  if (value === null) {
    throw new SupremeCourtTransportError("content_type");
  }
  const parts = value.split(";").map((part) => part.trim());
  if (
    parts[0]?.toLowerCase() !== "text/html" ||
    parts.length > 2 ||
    (parts.length === 2 &&
      !/^charset\s*=\s*(?:"utf-8"|utf-8)$/iu.test(parts[1] as string))
  ) {
    throw new SupremeCourtTransportError("content_type");
  }
}

function assertContentEncoding(response: Response): void {
  const value = response.headers.get("content-encoding");
  if (value !== null && value.trim().toLowerCase() !== "identity") {
    throw new SupremeCourtTransportError("content_encoding");
  }
}

function declaredContentLength(response: Response): number | null {
  const value = response.headers.get("content-length");
  if (value === null) {
    return null;
  }
  if (!/^(?:0|[1-9]\d*)$/u.test(value)) {
    throw new SupremeCourtTransportError("content_length");
  }
  const length = Number(value);
  if (!Number.isSafeInteger(length)) {
    throw new SupremeCourtTransportError("content_length");
  }
  if (length > SUPREME_COURT_HTML_POLICY.maximumResponseBytes) {
    throw new SupremeCourtTransportError("response_too_large");
  }
  return length;
}

function assertStatus(response: Response): void {
  if (response.status >= 300 && response.status < 400) {
    throw new SupremeCourtTransportError("redirect");
  }
  if (response.status !== 200) {
    throw new SupremeCourtTransportError("http_status");
  }
}

export async function fetchSupremeCourtTermIndex(
  dependencies: SupremeCourtTransportDependencies = {},
): Promise<Readonly<SupremeCourtTermIndex>> {
  const url = assertSupremeCourtTermIndexUrl(SUPREME_COURT_TERM_URL);
  const fetchImpl = dependencies.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new SupremeCourtTransportError("network");
  }
  const monotonicNow =
    dependencies.monotonicNow ?? (() => globalThis.performance.now());
  let startedAt: number;
  try {
    startedAt = monotonicNow();
  } catch {
    throw new SupremeCourtTransportError("timeout");
  }
  if (!Number.isFinite(startedAt)) {
    throw new SupremeCourtTransportError("timeout");
  }

  const controller = new AbortController();
  let timedOut = false;
  let rejectDeadline: ((error: SupremeCourtTransportError) => void) | null =
    null;
  const deadline = new Promise<never>((_resolve, reject) => {
    rejectDeadline = reject;
  });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
    rejectDeadline?.(new SupremeCourtTransportError("timeout"));
  }, SUPREME_COURT_HTML_POLICY.timeoutMilliseconds);
  const beforeDeadline = (): void => {
    let elapsed: number;
    try {
      elapsed = monotonicNow() - startedAt;
    } catch {
      timedOut = true;
      controller.abort();
      throw new SupremeCourtTransportError("timeout");
    }
    if (
      !Number.isFinite(elapsed) ||
      elapsed < 0 ||
      elapsed > SUPREME_COURT_HTML_POLICY.timeoutMilliseconds
    ) {
      timedOut = true;
      controller.abort();
      throw new SupremeCourtTransportError("timeout");
    }
  };
  const raceDeadline = async <T>(operation: Promise<T>): Promise<T> =>
    Promise.race([operation, deadline]);

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let bodyComplete = false;
  let result: Readonly<SupremeCourtTermIndex> | null = null;
  let operationError: SupremeCourtTransportError | null = null;
  let cleanupTimedOut = false;
  const bytes = new Uint8Array(SUPREME_COURT_HTML_POLICY.maximumResponseBytes);
  try {
    let response: Response;
    try {
      response = await raceDeadline(
        fetchImpl(url, {
          method: "GET",
          headers: {
            Accept: "text/html",
            "Accept-Encoding": "identity",
            "User-Agent": SUPREME_COURT_USER_AGENT,
          },
          body: null,
          cache: "no-store",
          credentials: "omit",
          redirect: "manual",
          referrer: "",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
        }),
      );
    } catch (error) {
      if (error instanceof SupremeCourtTransportError) {
        throw error;
      }
      throw new SupremeCourtTransportError(timedOut ? "timeout" : "network");
    }
    beforeDeadline();

    if (response.body !== null) {
      reader = response.body.getReader();
    }
    if (response.url !== url.href) {
      throw new SupremeCourtTransportError("invalid_url");
    }
    assertStatus(response);
    assertContentType(response);
    assertContentEncoding(response);
    const declaredLength = declaredContentLength(response);
    if (reader === null) {
      throw new SupremeCourtTransportError("missing_body");
    }

    let byteLength = 0;
    let chunkCount = 0;
    while (true) {
      let read: ReadableStreamReadResult<Uint8Array>;
      try {
        read = await raceDeadline(reader.read());
      } catch (error) {
        if (error instanceof SupremeCourtTransportError) {
          throw error;
        }
        throw new SupremeCourtTransportError(timedOut ? "timeout" : "network");
      }
      beforeDeadline();
      if (read.done) {
        bodyComplete = true;
        break;
      }
      const chunk = read.value;
      if (
        Object.prototype.toString.call(chunk) !== "[object Uint8Array]" ||
        chunk.byteLength === 0
      ) {
        throw new SupremeCourtTransportError("response_fragmentation");
      }
      chunkCount += 1;
      if (chunkCount > SUPREME_COURT_HTML_POLICY.maximumChunks) {
        chunk.fill(0);
        throw new SupremeCourtTransportError("response_fragmentation");
      }
      if (
        byteLength + chunk.byteLength >
        SUPREME_COURT_HTML_POLICY.maximumResponseBytes
      ) {
        chunk.fill(0);
        throw new SupremeCourtTransportError("response_too_large");
      }
      bytes.set(chunk, byteLength);
      byteLength += chunk.byteLength;
      chunk.fill(0);
    }
    if (byteLength === 0) {
      throw new SupremeCourtTransportError("missing_body");
    }
    if (declaredLength !== null && declaredLength !== byteLength) {
      throw new SupremeCourtTransportError("content_length");
    }

    let html: string;
    try {
      html = new TextDecoder("utf-8", { fatal: true }).decode(
        bytes.subarray(0, byteLength),
      );
    } catch {
      throw new SupremeCourtTransportError("invalid_utf8");
    }
    bytes.fill(0);
    beforeDeadline();
    try {
      result = parseSupremeCourtTermIndex(html);
      beforeDeadline();
    } catch (error) {
      if (error instanceof SupremeCourtTransportError) {
        throw error;
      }
      if (error instanceof SupremeCourtContractError) {
        throw new SupremeCourtTransportError("invalid_html");
      }
      throw new SupremeCourtTransportError("invalid_html");
    }
  } catch (error) {
    operationError =
      error instanceof SupremeCourtTransportError
        ? error
        : new SupremeCourtTransportError(timedOut ? "timeout" : "network");
  } finally {
    bytes.fill(0);
    if (reader !== null) {
      if (!bodyComplete) {
        try {
          await raceDeadline(reader.cancel());
        } catch (error) {
          cleanupTimedOut =
            timedOut ||
            (error instanceof SupremeCourtTransportError &&
              error.code === "timeout");
        }
      }
      try {
        reader.releaseLock();
      } catch {
        // Keep the fixed transport category as the only externally visible error.
      }
    }
    clearTimeout(timer);
  }
  if (cleanupTimedOut) {
    throw new SupremeCourtTransportError("timeout");
  }
  if (operationError !== null) {
    throw operationError;
  }
  if (result === null) {
    throw new SupremeCourtTransportError("network");
  }
  return result;
}
