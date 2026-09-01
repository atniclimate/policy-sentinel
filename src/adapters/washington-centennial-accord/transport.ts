import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import {
  GOIA_ACCORD_HTML_POLICY,
  GOIA_ACCORD_URL,
  GOIA_ACCORD_USER_AGENT,
} from "./constants";
import { GoiaAccordContractError, GoiaAccordTransportError } from "./errors";
import { assertGoiaAccordUrl } from "./query-contract";
import { parseGoiaAccordPage, type GoiaAccordPage } from "./response-contract";

export type GoiaAccordFetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface GoiaAccordTransportDependencies {
  fetch?: GoiaAccordFetchLike;
  monotonicNow?: () => number;
  resolveHostname?: (hostname: string) => Promise<readonly string[]>;
}

function ipv4Number(address: string): number | null {
  if (isIP(address) !== 4) {
    return null;
  }
  return address
    .split(".")
    .map(Number)
    .reduce((value, octet) => value * 256 + octet, 0);
}

function inIpv4Range(value: number, base: number, prefix: number): boolean {
  const divisor = 2 ** (32 - prefix);
  return Math.floor(value / divisor) === Math.floor(base / divisor);
}

function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const value = ipv4Number(address) as number;
    const blocked: readonly [string, number][] = [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.0.2.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["198.51.100.0", 24],
      ["203.0.113.0", 24],
      ["224.0.0.0", 4],
    ];
    return !blocked.some(([base, prefix]) =>
      inIpv4Range(value, ipv4Number(base) as number, prefix),
    );
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith("::ffff:")) {
      return isPublicAddress(normalized.slice("::ffff:".length));
    }
    const first = Number.parseInt(normalized.split(":", 1)[0] ?? "", 16);
    return (
      Number.isInteger(first) &&
      first >= 0x2000 &&
      first <= 0x3fff &&
      !normalized.startsWith("2001:db8:")
    );
  }
  return false;
}

async function defaultResolveHostname(hostname: string): Promise<string[]> {
  return (await lookup(hostname, { all: true, verbatim: true })).map(
    ({ address }) => address,
  );
}

async function assertPublicHost(
  hostname: string,
  resolver: (hostname: string) => Promise<readonly string[]>,
): Promise<void> {
  let addresses: readonly string[];
  try {
    addresses = await resolver(hostname);
  } catch {
    throw new GoiaAccordTransportError("network");
  }
  if (
    addresses.length < 1 ||
    addresses.length > 16 ||
    addresses.some((address) => !isPublicAddress(address))
  ) {
    throw new GoiaAccordTransportError("nonpublic_host");
  }
}

function assertContentType(response: Response): void {
  const value = response.headers.get("content-type");
  if (value === null) {
    throw new GoiaAccordTransportError("content_type");
  }
  const parts = value.split(";").map((part) => part.trim());
  if (
    parts[0]?.toLowerCase() !== "text/html" ||
    parts.length > 2 ||
    (parts.length === 2 &&
      !/^charset\s*=\s*(?:"utf-8"|utf-8)$/iu.test(parts[1] as string))
  ) {
    throw new GoiaAccordTransportError("content_type");
  }
}

function assertContentEncoding(response: Response): void {
  const value = response.headers.get("content-encoding");
  if (value !== null && value.trim().toLowerCase() !== "identity") {
    throw new GoiaAccordTransportError("content_encoding");
  }
}

function declaredContentLength(response: Response): number | null {
  const value = response.headers.get("content-length");
  if (value === null) {
    return null;
  }
  if (!/^(?:0|[1-9]\d*)$/u.test(value)) {
    throw new GoiaAccordTransportError("content_length");
  }
  const length = Number(value);
  if (!Number.isSafeInteger(length)) {
    throw new GoiaAccordTransportError("content_length");
  }
  if (length > GOIA_ACCORD_HTML_POLICY.maximumResponseBytes) {
    throw new GoiaAccordTransportError("response_too_large");
  }
  return length;
}

function assertStatus(response: Response): void {
  if (response.status >= 300 && response.status < 400) {
    throw new GoiaAccordTransportError("redirect");
  }
  if (response.status !== 200) {
    throw new GoiaAccordTransportError("http_status");
  }
}

export async function fetchGoiaAccordPage(
  dependencies: GoiaAccordTransportDependencies = {},
): Promise<Readonly<GoiaAccordPage>> {
  const url = assertGoiaAccordUrl(GOIA_ACCORD_URL);
  const fetchImpl = dependencies.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new GoiaAccordTransportError("network");
  }
  const monotonicNow =
    dependencies.monotonicNow ?? (() => globalThis.performance.now());
  let startedAt: number;
  try {
    startedAt = monotonicNow();
  } catch {
    throw new GoiaAccordTransportError("timeout");
  }
  if (!Number.isFinite(startedAt)) {
    throw new GoiaAccordTransportError("timeout");
  }

  const controller = new AbortController();
  let timedOut = false;
  let rejectDeadline: ((error: GoiaAccordTransportError) => void) | null = null;
  const deadline = new Promise<never>((_resolve, reject) => {
    rejectDeadline = reject;
  });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
    rejectDeadline?.(new GoiaAccordTransportError("timeout"));
  }, GOIA_ACCORD_HTML_POLICY.timeoutMilliseconds);
  const beforeDeadline = (): void => {
    let elapsed: number;
    try {
      elapsed = monotonicNow() - startedAt;
    } catch {
      timedOut = true;
      controller.abort();
      throw new GoiaAccordTransportError("timeout");
    }
    if (
      !Number.isFinite(elapsed) ||
      elapsed < 0 ||
      elapsed > GOIA_ACCORD_HTML_POLICY.timeoutMilliseconds
    ) {
      timedOut = true;
      controller.abort();
      throw new GoiaAccordTransportError("timeout");
    }
  };
  const raceDeadline = async <T>(operation: Promise<T>): Promise<T> =>
    Promise.race([operation, deadline]);

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let bodyComplete = false;
  let result: Readonly<GoiaAccordPage> | null = null;
  let operationError: GoiaAccordTransportError | null = null;
  let cleanupTimedOut = false;
  const bytes = new Uint8Array(GOIA_ACCORD_HTML_POLICY.maximumResponseBytes);
  try {
    await raceDeadline(
      assertPublicHost(
        url.hostname,
        dependencies.resolveHostname ?? defaultResolveHostname,
      ),
    );
    beforeDeadline();
    let response: Response;
    try {
      response = await raceDeadline(
        fetchImpl(url, {
          method: "GET",
          headers: {
            Accept: "text/html",
            "Accept-Encoding": "identity",
            "User-Agent": GOIA_ACCORD_USER_AGENT,
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
      if (error instanceof GoiaAccordTransportError) {
        throw error;
      }
      throw new GoiaAccordTransportError(timedOut ? "timeout" : "network");
    }
    beforeDeadline();
    if (response.body !== null) {
      reader = response.body.getReader();
    }
    if (response.url !== url.href) {
      throw new GoiaAccordTransportError("invalid_url");
    }
    assertStatus(response);
    assertContentType(response);
    assertContentEncoding(response);
    const declaredLength = declaredContentLength(response);
    if (reader === null) {
      throw new GoiaAccordTransportError("missing_body");
    }

    let byteLength = 0;
    let chunkCount = 0;
    while (true) {
      let read: ReadableStreamReadResult<Uint8Array>;
      try {
        read = await raceDeadline(reader.read());
      } catch (error) {
        if (error instanceof GoiaAccordTransportError) {
          throw error;
        }
        throw new GoiaAccordTransportError(timedOut ? "timeout" : "network");
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
        throw new GoiaAccordTransportError("response_fragmentation");
      }
      chunkCount += 1;
      if (chunkCount > GOIA_ACCORD_HTML_POLICY.maximumChunks) {
        chunk.fill(0);
        throw new GoiaAccordTransportError("response_fragmentation");
      }
      if (
        byteLength + chunk.byteLength >
        GOIA_ACCORD_HTML_POLICY.maximumResponseBytes
      ) {
        chunk.fill(0);
        throw new GoiaAccordTransportError("response_too_large");
      }
      bytes.set(chunk, byteLength);
      byteLength += chunk.byteLength;
      chunk.fill(0);
    }
    if (byteLength === 0) {
      throw new GoiaAccordTransportError("missing_body");
    }
    if (declaredLength !== null && declaredLength !== byteLength) {
      throw new GoiaAccordTransportError("content_length");
    }
    let html: string | null;
    try {
      html = new TextDecoder("utf-8", { fatal: true }).decode(
        bytes.subarray(0, byteLength),
      );
    } catch {
      throw new GoiaAccordTransportError("invalid_utf8");
    }
    bytes.fill(0);
    beforeDeadline();
    try {
      result = parseGoiaAccordPage(html);
      html = null;
      beforeDeadline();
    } catch (error) {
      html = null;
      if (error instanceof GoiaAccordTransportError) {
        throw error;
      }
      if (error instanceof GoiaAccordContractError) {
        throw new GoiaAccordTransportError("invalid_html");
      }
      throw new GoiaAccordTransportError("invalid_html");
    }
  } catch (error) {
    operationError =
      error instanceof GoiaAccordTransportError
        ? error
        : new GoiaAccordTransportError(timedOut ? "timeout" : "network");
  } finally {
    bytes.fill(0);
    if (reader !== null) {
      if (!bodyComplete) {
        try {
          await raceDeadline(reader.cancel());
        } catch (error) {
          cleanupTimedOut =
            timedOut ||
            (error instanceof GoiaAccordTransportError &&
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
    throw new GoiaAccordTransportError("timeout");
  }
  if (operationError !== null) {
    throw operationError;
  }
  if (result === null) {
    throw new GoiaAccordTransportError("network");
  }
  return result;
}
