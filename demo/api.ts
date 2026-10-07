import type {
  DemoPolicyResponse,
  DemoSearchResponse,
  DemoSource,
} from "../src/demo/types";
import {
  object,
  policyValue,
  searchValue,
  sourcesValue,
} from "../src/demo/validation";
export { policyId } from "../src/demo/validation";

const DEFAULT_API = "https://policy-sentinel-demo.atniclimate.workers.dev";
export const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 2_000_000;

/** The service address. A local address may be given with ?api= for testing. */
export function apiBase(): string {
  try {
    const override = new URLSearchParams(window.location.search).get("api");
    if (
      override &&
      /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/.test(override)
    )
      return override;
  } catch {
    /* use the default */
  }
  return DEFAULT_API;
}

export class ApiFailure extends Error {
  constructor(
    message: string,
    readonly kind: "service" | "limited" | "source",
  ) {
    super(message);
    this.name = "ApiFailure";
  }
}

async function readJson(response: Response): Promise<unknown> {
  const declared = Number(response.headers.get("Content-Length"));
  if (declared > MAX_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("Invalid response body");
  }
  if (!response.body) throw new Error("Invalid response body");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) throw new Error("Response is too large");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

async function get<T>(
  path: string,
  validate: (value: unknown) => T,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timeout = setTimeout(abort, REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (response.status === 429) {
      await response.body?.cancel().catch(() => undefined);
      throw new ApiFailure("limited", "limited");
    }
    const body = object(await readJson(response));
    if (!response.ok || body.ok === false) {
      throw new ApiFailure(
        typeof body.message === "string" && body.message.length <= 2000
          ? body.message
          : "The source did not answer.",
        "source",
      );
    }
    return validate(body);
  } catch (error) {
    if (error instanceof ApiFailure) throw error;
    throw new ApiFailure("service", "service");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export function loadSources(signal?: AbortSignal): Promise<DemoSource[]> {
  return get("/api/sources", sourcesValue, signal);
}

export function search(
  source: string,
  query: string,
  page: number,
  signal?: AbortSignal,
): Promise<DemoSearchResponse> {
  const params = new URLSearchParams({ source, q: query, page: String(page) });
  return get(
    `/api/search?${params.toString()}`,
    (value) => searchValue(value, source, query, page),
    signal,
  );
}

export function readPolicy(
  source: string,
  id: string,
  signal?: AbortSignal,
): Promise<DemoPolicyResponse> {
  const params = new URLSearchParams({ source, id });
  return get(
    `/api/policy?${params.toString()}`,
    (value) => policyValue(value, { source, id }),
    signal,
  );
}
