import {
  FEDERAL_REGISTER_TIER1_DOCUMENT_NUMBER,
  FEDERAL_REGISTER_TIER1_FIELDS,
  FederalRegisterTier1ContractError,
  parseFederalRegisterTier1DocumentJson,
  serializeFederalRegisterTier1Document,
} from "./tier1-contract.mjs";

const FIELD_QUERY = FEDERAL_REGISTER_TIER1_FIELDS.map(
  (field) => `fields%5B%5D=${encodeURIComponent(field)}`,
).join("&");

export const FEDERAL_REGISTER_TIER1_REQUEST_URL = `https://www.federalregister.gov/api/v1/documents/${FEDERAL_REGISTER_TIER1_DOCUMENT_NUMBER}.json?${FIELD_QUERY}`;

export const FEDERAL_REGISTER_TIER1_REQUEST_POLICY = Object.freeze({
  requestId: "FR-A1",
  method: "GET",
  host: "www.federalregister.gov",
  path: `/api/v1/documents/${FEDERAL_REGISTER_TIER1_DOCUMENT_NUMBER}.json`,
  maximumBytes: 65_536,
  maximumChunks: 64,
  maximumAttempts: 1,
  maximumPages: 1,
  maximumItems: 1,
  timeoutMilliseconds: 30_000,
  redirect: "manual",
  credentials: "omit",
  referrerPolicy: "no-referrer",
  accept: "application/json",
  acceptEncoding: "identity",
  userAgent: "Policy-Sentinel-LocalPrerelease/1.0",
});

export class FederalRegisterTier1TransportError extends Error {
  constructor(code, category, status = null) {
    super(`Federal Register FR-A1 transport failed: ${category}`);
    this.name = "FederalRegisterTier1TransportError";
    this.code = code;
    this.category = category;
    this.status = status;
  }
}

function fail(code, category, status = null) {
  throw new FederalRegisterTier1TransportError(code, category, status);
}

function timeoutError() {
  return new FederalRegisterTier1TransportError("timeout", "deadline_exceeded");
}

function cancelBody(body) {
  try {
    const cancel = body?.cancel;
    if (typeof cancel !== "function") {
      return;
    }
    void Promise.resolve(cancel.call(body)).catch(() => undefined);
  } catch {
    // Cleanup is best-effort and never exposes provider state.
  }
}

function header(headers, name) {
  if (headers === null || typeof headers !== "object") {
    fail("invalid_response", "invalid_response_metadata");
  }
  let value;
  try {
    const get = headers.get;
    if (typeof get !== "function") {
      fail("invalid_response", "invalid_response_metadata");
    }
    value = get.call(headers, name);
  } catch {
    fail("invalid_response", "invalid_response_metadata");
  }
  if (value !== null && typeof value !== "string") {
    fail("invalid_response", "invalid_response_metadata");
  }
  return value;
}

function mediaType(value) {
  return (value ?? "").split(";", 1)[0].trim().toLowerCase();
}

function assertJsonUtf8ContentType(value, status) {
  if (typeof value !== "string") {
    fail("content_type", "json_media_required", status);
  }
  const segments = value.split(";").map((segment) => segment.trim());
  if (segments.shift()?.toLowerCase() !== "application/json") {
    fail("content_type", "json_media_required", status);
  }
  if (segments.length > 1) {
    fail("content_type", "json_media_required", status);
  }
  if (segments.length === 1) {
    const match = /^charset\s*=\s*(?:"utf-8"|utf-8)$/i.exec(segments[0] ?? "");
    if (match === null) {
      fail("content_type", "utf8_json_media_required", status);
    }
  }
}

function assertIdentityEncoding(value, status) {
  if (value !== null && value.trim().toLowerCase() !== "identity") {
    fail("content_encoding", "identity_encoding_required", status);
  }
}

function parseContentLength(value, status) {
  if (value === null) {
    return null;
  }
  if (!/^(?:0|[1-9]\d*)$/.test(value)) {
    fail("content_length", "invalid_content_length", status);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    fail("content_length", "invalid_content_length", status);
  }
  if (parsed > FEDERAL_REGISTER_TIER1_REQUEST_POLICY.maximumBytes) {
    fail("response_too_large", "byte_ceiling_exceeded", status);
  }
  return parsed;
}

function classifyStatus(body, type, status) {
  cancelBody(body);
  if (status >= 300 && status < 400) {
    fail("redirect", "redirect_denied", status);
  }
  if (status === 400 && type === "application/json") {
    fail("bad_request", "json_400", status);
  }
  if (
    status === 404 &&
    (type === "text/html" || type === "application/xhtml+xml")
  ) {
    fail("not_found", "html_404", status);
  }
  if (status === 429) {
    fail("rate_limited", "rate_limited_stop", status);
  }
  fail("http_status", "non_success_status", status);
}

async function readBoundedBody(body, declaredLength, status, signal) {
  if (body === null || typeof body !== "object") {
    fail("invalid_response", "missing_response_body", status);
  }
  if (signal.aborted) {
    cancelBody(body);
    throw timeoutError();
  }

  let reader;
  try {
    const getReader = body.getReader;
    if (typeof getReader !== "function") {
      fail("invalid_response", "missing_response_body", status);
    }
    reader = getReader.call(body);
  } catch {
    fail("invalid_response", "missing_response_body", status);
  }
  const allocation = new Uint8Array(
    FEDERAL_REGISTER_TIER1_REQUEST_POLICY.maximumBytes,
  );
  let byteCount = 0;
  let chunkCount = 0;
  let failed = true;
  const cancelReader = () => {
    try {
      void reader.cancel(signal.reason).catch(() => undefined);
    } catch {
      // Cleanup is best-effort and never exposes provider state.
    }
  };
  signal.addEventListener("abort", cancelReader, { once: true });
  try {
    while (true) {
      const result = await reader.read();
      if (signal.aborted) {
        if (result.value instanceof Uint8Array) {
          result.value.fill(0);
        }
        throw timeoutError();
      }
      if (result.done) {
        break;
      }
      chunkCount += 1;
      if (chunkCount > FEDERAL_REGISTER_TIER1_REQUEST_POLICY.maximumChunks) {
        if (result.value instanceof Uint8Array) {
          result.value.fill(0);
        }
        fail("chunk_limit", "chunk_ceiling_exceeded", status);
      }
      if (!(result.value instanceof Uint8Array)) {
        fail("invalid_response", "invalid_response_chunk", status);
      }
      const nextByteCount = byteCount + result.value.byteLength;
      if (
        !Number.isSafeInteger(nextByteCount) ||
        nextByteCount > FEDERAL_REGISTER_TIER1_REQUEST_POLICY.maximumBytes
      ) {
        result.value.fill(0);
        fail("response_too_large", "byte_ceiling_exceeded", status);
      }
      allocation.set(result.value, byteCount);
      byteCount = nextByteCount;
      result.value.fill(0);
    }
    if (declaredLength !== null && declaredLength !== byteCount) {
      fail("content_length", "content_length_mismatch", status);
    }
    const bytes = allocation.slice(0, byteCount);
    failed = false;
    return { bytes, byteCount, chunkCount };
  } finally {
    signal.removeEventListener("abort", cancelReader);
    if (failed) {
      cancelReader();
    }
    allocation.fill(0);
    try {
      reader.releaseLock();
    } catch {
      // Cleanup is best-effort and never exposes provider state.
    }
  }
}

function decodeUtf8(bytes) {
  if (
    bytes.byteLength >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    fail("invalid_utf8", "utf8_bom_forbidden", 200);
  }
  try {
    return new globalThis.TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("invalid_utf8", "invalid_utf8", 200);
  }
}

async function sha256(bytes) {
  if (
    globalThis.crypto === undefined ||
    globalThis.crypto.subtle === undefined
  ) {
    fail("invalid_response", "sha256_unavailable", 200);
  }
  let digest;
  try {
    digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  } catch {
    fail("invalid_response", "sha256_failed", 200);
  }
  const digestBytes = new Uint8Array(digest);
  if (digestBytes.byteLength !== 32) {
    fail("invalid_response", "sha256_failed", 200);
  }
  return [...digestBytes]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function parseProjection(bytes) {
  const text = decodeUtf8(bytes);
  try {
    return parseFederalRegisterTier1DocumentJson(text);
  } catch (error) {
    if (
      error instanceof FederalRegisterTier1ContractError &&
      error.code === "invalid_json"
    ) {
      fail("invalid_json", "invalid_or_duplicate_json", 200);
    }
    if (error instanceof FederalRegisterTier1ContractError) {
      fail("contract_rejected", "tier1_contract_rejected", 200);
    }
    fail("invalid_json", "invalid_or_duplicate_json", 200);
  }
}

function freezeReceipt(receipt) {
  return Object.freeze(receipt);
}

async function performAcquisition(fetchImpl, signal) {
  const init = Object.freeze({
    method: FEDERAL_REGISTER_TIER1_REQUEST_POLICY.method,
    headers: Object.freeze({
      Accept: FEDERAL_REGISTER_TIER1_REQUEST_POLICY.accept,
      "Accept-Encoding": FEDERAL_REGISTER_TIER1_REQUEST_POLICY.acceptEncoding,
      "User-Agent": FEDERAL_REGISTER_TIER1_REQUEST_POLICY.userAgent,
    }),
    credentials: FEDERAL_REGISTER_TIER1_REQUEST_POLICY.credentials,
    redirect: FEDERAL_REGISTER_TIER1_REQUEST_POLICY.redirect,
    referrer: "",
    referrerPolicy: FEDERAL_REGISTER_TIER1_REQUEST_POLICY.referrerPolicy,
    signal,
  });
  const response = await fetchImpl(FEDERAL_REGISTER_TIER1_REQUEST_URL, init);
  if (response === null || typeof response !== "object") {
    fail("invalid_response", "invalid_response_metadata");
  }
  let status;
  let redirected;
  let responseUrl;
  let headers;
  let body;
  try {
    status = response.status;
    redirected = response.redirected;
    responseUrl = response.url;
    headers = response.headers;
    body = response.body;
  } catch {
    fail("invalid_response", "invalid_response_metadata");
  }
  if (signal.aborted) {
    cancelBody(body);
    throw timeoutError();
  }
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    cancelBody(body);
    fail("invalid_response", "invalid_response_metadata");
  }
  if (typeof redirected !== "boolean" || typeof responseUrl !== "string") {
    cancelBody(body);
    fail("invalid_response", "invalid_response_metadata", status);
  }
  if (redirected || responseUrl !== FEDERAL_REGISTER_TIER1_REQUEST_URL) {
    cancelBody(body);
    fail("redirect", "redirect_denied", status);
  }
  const responseContentType = header(headers, "content-type");
  if (status !== 200) {
    classifyStatus(body, mediaType(responseContentType), status);
  }

  try {
    assertJsonUtf8ContentType(responseContentType, status);
    assertIdentityEncoding(header(headers, "content-encoding"), status);
  } catch (error) {
    cancelBody(body);
    throw error;
  }
  let declaredLength;
  try {
    declaredLength = parseContentLength(
      header(headers, "content-length"),
      status,
    );
  } catch (error) {
    cancelBody(body);
    throw error;
  }
  const bounded = await readBoundedBody(body, declaredLength, status, signal);
  const zeroBoundedBytes = () => {
    bounded.bytes.fill(0);
  };
  signal.addEventListener("abort", zeroBoundedBytes, { once: true });
  try {
    const digest = await sha256(bounded.bytes);
    if (signal.aborted) {
      throw timeoutError();
    }
    const primary = parseProjection(bounded.bytes);
    const replay = parseProjection(bounded.bytes);
    const primarySerialization = serializeFederalRegisterTier1Document(primary);
    const replaySerialization = serializeFederalRegisterTier1Document(replay);
    if (primarySerialization !== replaySerialization) {
      fail("replay_mismatch", "non_deterministic_projection", status);
    }
    return Object.freeze({
      primary,
      replay,
      receipt: freezeReceipt({
        requestId: FEDERAL_REGISTER_TIER1_REQUEST_POLICY.requestId,
        methodClass: "GET",
        hostClass: "federal_register_api",
        statusCategory: "2xx",
        mediaCategory: "application_json_utf8_identity",
        attemptCount: 1,
        retryCount: 0,
        redirectCount: 0,
        byteCount: bounded.byteCount,
        chunkCount: bounded.chunkCount,
        pageCount: 1,
        itemCount: 1,
        sha256: digest,
      }),
    });
  } finally {
    signal.removeEventListener("abort", zeroBoundedBytes);
    zeroBoundedBytes();
  }
}

function classifyThrown(error, signal) {
  if (error instanceof FederalRegisterTier1TransportError) {
    return error;
  }
  if (signal.aborted) {
    return timeoutError();
  }
  return new FederalRegisterTier1TransportError("network", "network_failure");
}

export async function fetchFederalRegisterTier1Document(dependencies = {}) {
  let fetchDependency;
  let validDependencies = false;
  try {
    if (
      dependencies !== null &&
      typeof dependencies === "object" &&
      !Array.isArray(dependencies) &&
      Object.getPrototypeOf(dependencies) === Object.prototype
    ) {
      const keys = Reflect.ownKeys(dependencies);
      const descriptor = Object.getOwnPropertyDescriptor(
        dependencies,
        "fetchImpl",
      );
      validDependencies =
        keys.every((key) => key === "fetchImpl") &&
        (descriptor === undefined ||
          ("value" in descriptor && descriptor.enumerable === true));
      fetchDependency = descriptor?.value;
    }
  } catch {
    validDependencies = false;
  }
  if (!validDependencies) {
    fail("invalid_dependency", "invalid_transport_dependency");
  }
  const fetchImpl =
    fetchDependency === undefined ? globalThis.fetch : fetchDependency;
  if (typeof fetchImpl !== "function") {
    fail("invalid_dependency", "missing_fetch_implementation");
  }

  const controller = new globalThis.AbortController();
  const deadlineError = timeoutError();
  let timeout;
  const deadline = new Promise((_, reject) => {
    timeout = globalThis.setTimeout(() => {
      controller.abort(deadlineError);
      reject(deadlineError);
    }, FEDERAL_REGISTER_TIER1_REQUEST_POLICY.timeoutMilliseconds);
  });
  try {
    return await Promise.race([
      performAcquisition(fetchImpl, controller.signal),
      deadline,
    ]);
  } catch (error) {
    throw classifyThrown(error, controller.signal);
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
