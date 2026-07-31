import {
  WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
  WASHINGTON_GOVERNOR_HTML_POLICY,
  WASHINGTON_GOVERNOR_USER_AGENT,
} from "./constants";
import {
  WashingtonGovernorContractError,
  WashingtonGovernorTransportError,
} from "./errors";
import { assertWashingtonGovernorExecutiveOrdersIndexUrl } from "./query-contract";
import {
  parseWashingtonGovernorExecutiveOrdersIndex,
  type WashingtonGovernorExecutiveOrderIndex,
} from "./response-contract";

export type WashingtonGovernorFetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface WashingtonGovernorTransportDependencies {
  fetch?: WashingtonGovernorFetchLike;
  monotonicNow?: () => number;
}

function assertContentType(response: Response): void {
  const value = response.headers.get("content-type");
  if (value === null) {
    throw new WashingtonGovernorTransportError("content_type");
  }
  const parts = value.split(";").map((part) => part.trim());
  if (
    parts[0]?.toLowerCase() !== "text/html" ||
    parts.length > 2 ||
    (parts.length === 2 &&
      !/^charset\s*=\s*(?:"utf-8"|utf-8)$/iu.test(parts[1] as string))
  ) {
    throw new WashingtonGovernorTransportError("content_type");
  }
}

function assertContentEncoding(response: Response): void {
  const value = response.headers.get("content-encoding");
  if (value !== null && value.trim().toLowerCase() !== "identity") {
    throw new WashingtonGovernorTransportError("content_encoding");
  }
}

function declaredContentLength(response: Response): number | null {
  const value = response.headers.get("content-length");
  if (value === null) {
    return null;
  }
  if (!/^(?:0|[1-9]\d*)$/u.test(value)) {
    throw new WashingtonGovernorTransportError("content_length");
  }
  const length = Number(value);
  if (!Number.isSafeInteger(length)) {
    throw new WashingtonGovernorTransportError("content_length");
  }
  if (length > WASHINGTON_GOVERNOR_HTML_POLICY.maximumResponseBytes) {
    throw new WashingtonGovernorTransportError("response_too_large");
  }
  return length;
}

function responseStatus(response: Response): void {
  if (response.status >= 300 && response.status < 400) {
    throw new WashingtonGovernorTransportError("redirect");
  }
  if (response.status !== 200) {
    throw new WashingtonGovernorTransportError("http_status");
  }
}

export async function fetchWashingtonGovernorExecutiveOrdersIndex(
  maximumIssuedDate: string,
  dependencies: WashingtonGovernorTransportDependencies = {},
): Promise<Readonly<WashingtonGovernorExecutiveOrderIndex>> {
  const url = assertWashingtonGovernorExecutiveOrdersIndexUrl(
    WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL,
  );
  const fetchImpl = dependencies.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new WashingtonGovernorTransportError("network");
  }
  const monotonicNow =
    dependencies.monotonicNow ?? (() => globalThis.performance.now());
  let startedAt: number;
  try {
    startedAt = monotonicNow();
  } catch {
    throw new WashingtonGovernorTransportError("timeout");
  }
  if (!Number.isFinite(startedAt)) {
    throw new WashingtonGovernorTransportError("timeout");
  }

  const controller = new AbortController();
  let timedOut = false;
  let rejectDeadline:
    ((error: WashingtonGovernorTransportError) => void) | null = null;
  const deadline = new Promise<never>((_resolve, reject) => {
    rejectDeadline = reject;
  });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
    rejectDeadline?.(new WashingtonGovernorTransportError("timeout"));
  }, WASHINGTON_GOVERNOR_HTML_POLICY.timeoutMilliseconds);
  const beforeDeadline = (): void => {
    let elapsed: number;
    try {
      elapsed = monotonicNow() - startedAt;
    } catch {
      timedOut = true;
      controller.abort();
      throw new WashingtonGovernorTransportError("timeout");
    }
    if (
      !Number.isFinite(elapsed) ||
      elapsed < 0 ||
      elapsed > WASHINGTON_GOVERNOR_HTML_POLICY.timeoutMilliseconds
    ) {
      timedOut = true;
      controller.abort();
      throw new WashingtonGovernorTransportError("timeout");
    }
  };
  const raceDeadline = async <T>(operation: Promise<T>): Promise<T> =>
    Promise.race([operation, deadline]);

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let bodyComplete = false;
  let result: Readonly<WashingtonGovernorExecutiveOrderIndex> | null = null;
  let operationError: WashingtonGovernorTransportError | null = null;
  let cleanupTimedOut = false;
  const bytes = new Uint8Array(
    WASHINGTON_GOVERNOR_HTML_POLICY.maximumResponseBytes,
  );
  try {
    let response: Response;
    try {
      response = await raceDeadline(
        fetchImpl(url, {
          method: "GET",
          headers: {
            Accept: "text/html",
            "Accept-Encoding": "identity",
            "User-Agent": WASHINGTON_GOVERNOR_USER_AGENT,
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
      if (error instanceof WashingtonGovernorTransportError) {
        throw error;
      }
      throw new WashingtonGovernorTransportError(
        timedOut ? "timeout" : "network",
      );
    }
    beforeDeadline();

    if (response.body !== null) {
      reader = response.body.getReader();
    }
    if (response.url !== url.href) {
      throw new WashingtonGovernorTransportError("invalid_url");
    }
    responseStatus(response);
    assertContentType(response);
    assertContentEncoding(response);
    const declaredLength = declaredContentLength(response);
    if (reader === null) {
      throw new WashingtonGovernorTransportError("missing_body");
    }

    let byteLength = 0;
    let chunkCount = 0;
    while (true) {
      let result: ReadableStreamReadResult<Uint8Array>;
      try {
        result = await raceDeadline(reader.read());
      } catch (error) {
        if (error instanceof WashingtonGovernorTransportError) {
          throw error;
        }
        throw new WashingtonGovernorTransportError(
          timedOut ? "timeout" : "network",
        );
      }
      beforeDeadline();
      if (result.done) {
        bodyComplete = true;
        break;
      }
      const chunk = result.value;
      if (
        Object.prototype.toString.call(chunk) !== "[object Uint8Array]" ||
        chunk.byteLength === 0
      ) {
        throw new WashingtonGovernorTransportError("response_fragmentation");
      }
      chunkCount += 1;
      if (chunkCount > WASHINGTON_GOVERNOR_HTML_POLICY.maximumChunks) {
        chunk.fill(0);
        throw new WashingtonGovernorTransportError("response_fragmentation");
      }
      if (
        byteLength + chunk.byteLength >
        WASHINGTON_GOVERNOR_HTML_POLICY.maximumResponseBytes
      ) {
        chunk.fill(0);
        throw new WashingtonGovernorTransportError("response_too_large");
      }
      bytes.set(chunk, byteLength);
      byteLength += chunk.byteLength;
      chunk.fill(0);
    }
    if (byteLength === 0) {
      throw new WashingtonGovernorTransportError("missing_body");
    }
    if (declaredLength !== null && declaredLength !== byteLength) {
      throw new WashingtonGovernorTransportError("content_length");
    }

    let html: string;
    try {
      html = new TextDecoder("utf-8", { fatal: true }).decode(
        bytes.subarray(0, byteLength),
      );
    } catch {
      throw new WashingtonGovernorTransportError("invalid_utf8");
    }
    bytes.fill(0);
    beforeDeadline();
    try {
      const parsed = parseWashingtonGovernorExecutiveOrdersIndex(html, {
        maximumIssuedDate,
      });
      beforeDeadline();
      result = parsed;
    } catch (error) {
      if (error instanceof WashingtonGovernorTransportError) {
        throw error;
      }
      if (error instanceof WashingtonGovernorContractError) {
        throw new WashingtonGovernorTransportError("invalid_html");
      }
      throw new WashingtonGovernorTransportError("invalid_html");
    }
  } catch (error) {
    operationError =
      error instanceof WashingtonGovernorTransportError
        ? error
        : new WashingtonGovernorTransportError(
            timedOut ? "timeout" : "network",
          );
  } finally {
    bytes.fill(0);
    if (reader !== null) {
      if (!bodyComplete) {
        try {
          await raceDeadline(reader.cancel());
        } catch (error) {
          cleanupTimedOut =
            timedOut ||
            (error instanceof WashingtonGovernorTransportError &&
              error.code === "timeout");
        }
      }
      try {
        reader.releaseLock();
      } catch {
        // The fixed transport error remains the only externally visible error.
      }
    }
    clearTimeout(timer);
  }
  if (cleanupTimedOut) {
    throw new WashingtonGovernorTransportError("timeout");
  }
  if (operationError !== null) {
    throw operationError;
  }
  if (result === null) {
    throw new WashingtonGovernorTransportError("network");
  }
  return result;
}
