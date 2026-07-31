import {
  FEDERAL_REGISTER_DISCOVERY_FIELDS,
  FEDERAL_REGISTER_ORIGIN,
  FEDERAL_REGISTER_PATHS,
  FEDERAL_REGISTER_QUERY_POLICY,
  FEDERAL_REGISTER_RESPONSE_POLICY,
} from "./constants";

export type FederalRegisterResponseKind =
  keyof typeof FEDERAL_REGISTER_RESPONSE_POLICY;

export type FederalRegisterFetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface FederalRegisterTransportDependencies {
  fetchImpl?: FederalRegisterFetchLike;
  now?: () => Date;
  random?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
}

export type FederalRegisterTransportErrorCode =
  | "invalid_url"
  | "redirect"
  | "http_status"
  | "rate_limited"
  | "timeout"
  | "network"
  | "content_type"
  | "content_length"
  | "response_too_large"
  | "invalid_utf8"
  | "invalid_json";

export class FederalRegisterTransportError extends Error {
  readonly code: FederalRegisterTransportErrorCode;
  readonly status: number | null;

  constructor(
    code: FederalRegisterTransportErrorCode,
    message: string,
    status: number | null = null,
  ) {
    super(message);
    this.name = "FederalRegisterTransportError";
    this.code = code;
    this.status = status;
  }
}

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MILLISECONDS = 30_000;
const MAX_RETRY_WAIT_MILLISECONDS = 60_000;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const JSON_SUFFIX = ".json";
const DOCUMENT_IDENTIFIER_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/;
const ISSUE_PATH_PATTERN = /^\/api\/v1\/issues\/(\d{4})-(\d{2})-(\d{2})\.json$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

type FederalRegisterResponsePolicy =
  (typeof FEDERAL_REGISTER_RESPONSE_POLICY)[FederalRegisterResponseKind];

type AttemptResult =
  | {
      kind: "success";
      value: unknown;
    }
  | {
      kind: "retry";
      retryAfter: string | null;
      status: number;
    };

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function documentIdentifiersForPath(pathname: string): string[] | null {
  if (
    !pathname.startsWith(FEDERAL_REGISTER_PATHS.detail) ||
    !pathname.endsWith(JSON_SUFFIX)
  ) {
    return null;
  }

  const encodedIdentifiers = pathname.slice(
    FEDERAL_REGISTER_PATHS.detail.length,
    -JSON_SUFFIX.length,
  );
  if (
    encodedIdentifiers === "" ||
    encodedIdentifiers.includes("/") ||
    encodedIdentifiers.includes("%")
  ) {
    return null;
  }

  const identifiers = encodedIdentifiers.split(",");
  if (
    new Set(identifiers).size !== identifiers.length ||
    identifiers.some(
      (identifier) => !DOCUMENT_IDENTIFIER_PATTERN.test(identifier),
    )
  ) {
    return null;
  }
  return identifiers;
}

function isReviewedIssuePath(pathname: string): boolean {
  const match = ISSUE_PATH_PATTERN.exec(pathname);
  if (match === null) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const epoch = Date.UTC(year, month - 1, day);
  const reconstructed = new Date(epoch);
  return (
    reconstructed.getUTCFullYear() === year &&
    reconstructed.getUTCMonth() + 1 === month &&
    reconstructed.getUTCDate() === day
  );
}

function isReviewedDate(value: string | null): value is string {
  if (value === null) {
    return false;
  }
  const match = DATE_PATTERN.exec(value);
  if (match === null) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const reconstructed = new Date(0);
  reconstructed.setUTCFullYear(year, month - 1, day);
  reconstructed.setUTCHours(0, 0, 0, 0);
  return (
    reconstructed.getUTCFullYear() === year &&
    reconstructed.getUTCMonth() + 1 === month &&
    reconstructed.getUTCDate() === day &&
    value >= FEDERAL_REGISTER_QUERY_POLICY.earliestPublicationDate
  );
}

function hasExactDiscoveryFields(parameters: URLSearchParams): boolean {
  const fields = parameters.getAll("fields[]");
  return (
    fields.length === FEDERAL_REGISTER_DISCOVERY_FIELDS.length &&
    new Set(fields).size === fields.length &&
    FEDERAL_REGISTER_DISCOVERY_FIELDS.every((field) => fields.includes(field))
  );
}

function hasOnlyParameters(
  parameters: URLSearchParams,
  allowed: ReadonlySet<string>,
): boolean {
  return [...parameters.keys()].every((key) => allowed.has(key));
}

function hasOneParameter(
  parameters: URLSearchParams,
  name: string,
  expected?: string,
): boolean {
  const values = parameters.getAll(name);
  return (
    values.length === 1 && (expected === undefined || values[0] === expected)
  );
}

function validOpaqueCursor(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= FEDERAL_REGISTER_QUERY_POLICY.maximumCursorLength &&
    value.trim() === value &&
    ![...value].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 0x1f || codePoint === 0x7f;
    })
  );
}

function validNextPage(value: string): boolean {
  if (!/^[1-9]\d*$/.test(value)) {
    return false;
  }
  const page = Number(value);
  return (
    Number.isSafeInteger(page) &&
    page >= 2 &&
    page <= FEDERAL_REGISTER_QUERY_POLICY.maximumPageNumber
  );
}

function isReviewedSearchQuery(parameters: URLSearchParams): boolean {
  const allowed = new Set([
    "fields[]",
    "conditions[publication_date][gte]",
    "conditions[publication_date][lte]",
    "per_page",
    "order",
    "page",
    "search_after_cursor",
  ]);
  const start = parameters.get("conditions[publication_date][gte]");
  const end = parameters.get("conditions[publication_date][lte]");
  const cursors = parameters.getAll("search_after_cursor");
  const pages = parameters.getAll("page");
  return (
    hasOnlyParameters(parameters, allowed) &&
    hasExactDiscoveryFields(parameters) &&
    hasOneParameter(parameters, "conditions[publication_date][gte]") &&
    hasOneParameter(parameters, "conditions[publication_date][lte]") &&
    isReviewedDate(start) &&
    isReviewedDate(end) &&
    start <= end &&
    hasOneParameter(
      parameters,
      "per_page",
      String(FEDERAL_REGISTER_QUERY_POLICY.pageSize),
    ) &&
    hasOneParameter(parameters, "order", FEDERAL_REGISTER_QUERY_POLICY.order) &&
    ((cursors.length === 0 && pages.length === 0) ||
      (cursors.length === 1 &&
        validOpaqueCursor(cursors[0] ?? "") &&
        pages.length === 1 &&
        validNextPage(pages[0] ?? "")))
  );
}

function isReviewedExactDocumentQuery(parameters: URLSearchParams): boolean {
  return (
    hasOnlyParameters(parameters, new Set(["fields[]"])) &&
    hasExactDiscoveryFields(parameters)
  );
}

function isReviewedFacetQuery(parameters: URLSearchParams): boolean {
  const allowed = new Set([
    "conditions[publication_date][gte]",
    "conditions[publication_date][lte]",
  ]);
  const start = parameters.get("conditions[publication_date][gte]");
  const end = parameters.get("conditions[publication_date][lte]");
  return (
    hasOnlyParameters(parameters, allowed) &&
    hasOneParameter(parameters, "conditions[publication_date][gte]") &&
    hasOneParameter(parameters, "conditions[publication_date][lte]") &&
    isReviewedDate(start) &&
    isReviewedDate(end) &&
    start <= end
  );
}

function requestPathMatchesKind(
  value: URL,
  responseKind: FederalRegisterResponseKind,
): boolean {
  switch (responseKind) {
    case "search":
      return (
        value.pathname === FEDERAL_REGISTER_PATHS.search &&
        isReviewedSearchQuery(value.searchParams)
      );
    case "document": {
      const identifiers = documentIdentifiersForPath(value.pathname);
      return (
        identifiers?.length === 1 &&
        isReviewedExactDocumentQuery(value.searchParams)
      );
    }
    case "documentBatch": {
      const identifiers = documentIdentifiersForPath(value.pathname);
      return (
        identifiers !== null &&
        identifiers.length >= 2 &&
        identifiers.length <=
          FEDERAL_REGISTER_QUERY_POLICY.maximumDocumentBatchSize &&
        isReviewedExactDocumentQuery(value.searchParams)
      );
    }
    case "facet": {
      return (
        value.pathname === `${FEDERAL_REGISTER_PATHS.facet}daily.json` &&
        isReviewedFacetQuery(value.searchParams)
      );
    }
    case "issue":
      return isReviewedIssuePath(value.pathname) && value.search === "";
    case "openApi":
      return (
        value.pathname === FEDERAL_REGISTER_PATHS.openApi && value.search === ""
      );
  }
}

function assertRequestUrl(
  value: URL,
  responseKind: FederalRegisterResponseKind,
): void {
  if (
    value.origin !== FEDERAL_REGISTER_ORIGIN ||
    value.username !== "" ||
    value.password !== "" ||
    value.port !== "" ||
    value.hash !== "" ||
    value.href.length > FEDERAL_REGISTER_QUERY_POLICY.maximumUrlLength ||
    !requestPathMatchesKind(value, responseKind)
  ) {
    throw new FederalRegisterTransportError(
      "invalid_url",
      "Federal Register request URL is outside the reviewed HTTPS route for its response kind.",
    );
  }
}

function contentTypeMediaType(value: string | null): string {
  return (value ?? "").split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function parseContentLength(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  if (!/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new FederalRegisterTransportError(
      "content_length",
      "Federal Register response declared an invalid Content-Length.",
    );
  }
  const length = Number(value);
  if (!Number.isSafeInteger(length)) {
    throw new FederalRegisterTransportError(
      "content_length",
      "Federal Register response declared an unsafe Content-Length.",
    );
  }
  return length;
}

function parseRetryAfter(
  value: string | null,
  now: Date,
  status: number | null,
): number | null {
  if (value === null) {
    return null;
  }

  let milliseconds: number;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    milliseconds = Number(trimmed) * 1_000;
  } else {
    const timestamp = Date.parse(trimmed);
    if (Number.isNaN(timestamp)) {
      return null;
    }
    milliseconds = Math.max(0, timestamp - now.getTime());
  }

  if (
    !Number.isSafeInteger(milliseconds) ||
    milliseconds > MAX_RETRY_WAIT_MILLISECONDS
  ) {
    throw new FederalRegisterTransportError(
      status === 429 ? "rate_limited" : "http_status",
      "Federal Register requested a retry delay beyond the bounded policy.",
      status,
    );
  }
  return milliseconds;
}

function retryDelay(
  attempt: number,
  retryAfter: string | null,
  now: Date,
  random: () => number,
  status: number | null,
): number {
  const providerDelay = parseRetryAfter(retryAfter, now, status);
  if (providerDelay !== null) {
    return providerDelay;
  }

  const randomValue = random();
  if (
    typeof randomValue !== "number" ||
    !Number.isFinite(randomValue) ||
    randomValue < 0 ||
    randomValue >= 1
  ) {
    throw new FederalRegisterTransportError(
      "network",
      "Federal Register retry jitter dependency returned an invalid value.",
    );
  }
  const base = Math.min(4_000, 250 * 2 ** (attempt - 1));
  return Math.floor(base * (0.75 + randomValue * 0.5));
}

function timeoutError(): FederalRegisterTransportError {
  return new FederalRegisterTransportError(
    "timeout",
    "Federal Register request exceeded the bounded timeout.",
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

async function readBoundedBody(
  response: Response,
  maximumBytes: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  let declaredLength: number | null;
  try {
    declaredLength = parseContentLength(response.headers.get("content-length"));
  } catch (error) {
    cancelBody(response.body);
    throw error;
  }
  if (declaredLength !== null && declaredLength > maximumBytes) {
    cancelBody(response.body);
    throw new FederalRegisterTransportError(
      "response_too_large",
      "Federal Register response exceeds the reviewed byte limit.",
      response.status,
    );
  }

  if (response.body === null) {
    return new Uint8Array();
  }
  if (signal.aborted) {
    cancelBody(response.body);
    throw timeoutError();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
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
    while (true) {
      const result = await reader.read();
      if (signal.aborted) {
        throw timeoutError();
      }
      if (result.done) {
        break;
      }
      length += result.value.byteLength;
      if (length > maximumBytes) {
        throw new FederalRegisterTransportError(
          "response_too_large",
          "Federal Register response exceeded the reviewed byte limit.",
          response.status,
        );
      }
      chunks.push(result.value);
    }
  } catch (error) {
    requestCancellation(error);
    throw error;
  } finally {
    signal.removeEventListener("abort", abortHandler);
    reader.releaseLock();
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function decodeJson(body: Uint8Array): unknown {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw new FederalRegisterTransportError(
      "invalid_utf8",
      "Federal Register response was not valid UTF-8.",
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new FederalRegisterTransportError(
      "invalid_json",
      "Federal Register response was not valid JSON.",
    );
  }
}

function classifyThrownRequestError(
  error: unknown,
  signal: AbortSignal,
): FederalRegisterTransportError {
  if (error instanceof FederalRegisterTransportError) {
    return error;
  }
  if (signal.aborted) {
    return timeoutError();
  }
  return new FederalRegisterTransportError(
    "network",
    "Federal Register request failed before a validated response was received.",
  );
}

function isRetryableError(error: FederalRegisterTransportError): boolean {
  return error.code === "network" || error.code === "timeout";
}

function httpStatusError(status: number): FederalRegisterTransportError {
  return new FederalRegisterTransportError(
    status === 429 ? "rate_limited" : "http_status",
    "Federal Register request returned a non-success status.",
    status,
  );
}

function assertUnredirectedResponse(
  response: Response,
  requestHref: string,
): void {
  if (
    response.redirected ||
    (response.url !== "" && response.url !== requestHref)
  ) {
    cancelBody(response.body);
    throw new FederalRegisterTransportError(
      "redirect",
      "Federal Register request followed an unreviewed redirect.",
      response.status,
    );
  }
}

async function performAttempt(
  requestHref: string,
  policy: FederalRegisterResponsePolicy,
  fetchImpl: FederalRegisterFetchLike,
  signal: AbortSignal,
): Promise<AttemptResult> {
  const response = await fetchImpl(requestHref, {
    method: "GET",
    headers: {
      Accept: policy.mediaTypes.join(", "),
      "User-Agent": "Policy-Sentinel/0.2 build-time source adapter",
    },
    credentials: "omit",
    redirect: "manual",
    referrerPolicy: "no-referrer",
    signal,
  });

  if (signal.aborted) {
    cancelBody(response.body);
    throw timeoutError();
  }
  assertUnredirectedResponse(response, requestHref);

  if (response.status >= 300 && response.status < 400) {
    cancelBody(response.body);
    throw new FederalRegisterTransportError(
      "redirect",
      "Federal Register request returned an unreviewed redirect.",
      response.status,
    );
  }

  if (response.status !== 200) {
    cancelBody(response.body);
    if (RETRYABLE_STATUSES.has(response.status)) {
      return {
        kind: "retry",
        retryAfter: response.headers.get("retry-after"),
        status: response.status,
      };
    }
    throw httpStatusError(response.status);
  }

  const mediaType = contentTypeMediaType(response.headers.get("content-type"));
  if (!policy.mediaTypes.some((allowed) => allowed === mediaType)) {
    cancelBody(response.body);
    throw new FederalRegisterTransportError(
      "content_type",
      "Federal Register response did not use a reviewed JSON media type.",
      response.status,
    );
  }

  const body = await readBoundedBody(response, policy.maxBytes, signal);
  return {
    kind: "success",
    value: decodeJson(body),
  };
}

async function performAttemptWithDeadline(
  requestHref: string,
  policy: FederalRegisterResponsePolicy,
  fetchImpl: FederalRegisterFetchLike,
): Promise<AttemptResult> {
  const controller = new AbortController();
  const deadlineFailure = timeoutError();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort(deadlineFailure);
      reject(deadlineFailure);
    }, REQUEST_TIMEOUT_MILLISECONDS);
  });

  try {
    return await Promise.race([
      performAttempt(requestHref, policy, fetchImpl, controller.signal),
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

export async function fetchFederalRegisterJson(
  requestUrl: URL,
  responseKind: FederalRegisterResponseKind,
  dependencies: FederalRegisterTransportDependencies = {},
): Promise<unknown> {
  const immutableRequestUrl = new URL(requestUrl.href);
  assertRequestUrl(immutableRequestUrl, responseKind);
  const requestHref = immutableRequestUrl.href;
  const policy = FEDERAL_REGISTER_RESPONSE_POLICY[responseKind];
  const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch;
  const now = dependencies.now ?? (() => new Date());
  const random = dependencies.random ?? Math.random;
  const sleep = dependencies.sleep ?? defaultSleep;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let result: AttemptResult;
    try {
      result = await performAttemptWithDeadline(requestHref, policy, fetchImpl);
    } catch (error) {
      const classified =
        error instanceof FederalRegisterTransportError
          ? error
          : new FederalRegisterTransportError(
              "network",
              "Federal Register request failed before a validated response was received.",
            );
      if (isRetryableError(classified) && attempt < MAX_ATTEMPTS) {
        const wait = retryDelay(attempt, null, now(), random, null);
        await sleep(wait);
        continue;
      }
      throw classified;
    }

    if (result.kind === "success") {
      return result.value;
    }
    if (attempt >= MAX_ATTEMPTS) {
      throw httpStatusError(result.status);
    }

    const wait = retryDelay(
      attempt,
      result.retryAfter,
      now(),
      random,
      result.status,
    );
    await sleep(wait);
  }

  throw new FederalRegisterTransportError(
    "network",
    "Federal Register request exhausted its bounded attempts.",
  );
}
