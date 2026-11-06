/**
 * Helpers shared by every source adapter under worker/src/sources/: the
 * official-host fetcher, the Worker's error type, and the small validators
 * every provider response passes through before it becomes a citation.
 * Nothing here is source-specific; a source's own parsing lives in its own
 * module.
 */
import { citationsInText } from "../../../src/demo/links";
import type { ChainRow } from "../../../src/demo/links";
import { hasPersonalPattern } from "../../../src/demo/personal-guard";
import {
  nextSearchCursor,
  searchPageLimit,
} from "../../../src/demo/search-contract";
import type {
  DemoCitation,
  DemoErrorResponse,
  DemoPolicyResponse,
  DemoSearchContinuation,
  DemoSearchCriteria,
  TextBlock,
} from "../../../src/demo/types";

export interface Env {
  /** api.data.gov key. Optional; enables GovInfo, Congress.gov, Regulations.gov. */
  DATA_GOV_API_KEY?: string;
  RATE?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  /** One allowance shared by every visitor for calls made with the api.data.gov key. */
  KEY_RATE?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  /** The version_metadata binding in wrangler.toml; tests and local runs have none. */
  CF_VERSION_METADATA?: { id: string };
}

export class DemoError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus = 502,
    readonly status: DemoErrorResponse["status"] = "error",
    readonly retryAfter?: string,
  ) {
    super(message);
  }
}

const USER_AGENT =
  "PolicySentinelDemo/0.6 (+https://atniclimate.github.io/policy-sentinel/)";
const MAX_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 12_000;

let allowedHosts: ReadonlySet<string> = new Set();

/**
 * Set once, by worker/src/index.ts's source registry, before any request is
 * handled. officialFetch lives below the registry (every source adapter
 * calls it), so the allowed set is configured rather than imported, which
 * would otherwise require a circular import between index.ts and the source
 * modules it composes.
 */
export function configureAllowedHosts(hosts: ReadonlySet<string>): void {
  allowedHosts = hosts;
}

/** Fetch from an allowlisted official host, never following redirects. */
export async function officialFetch(
  rawUrl: string,
  init: RequestInit = {},
): Promise<{ response: Response; bytes: Uint8Array }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new DemoError("bad_url", "That address is not valid.", 400);
  }
  if (
    url.protocol !== "https:" ||
    !allowedHosts.has(url.hostname) ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new DemoError(
      "host_not_allowed",
      "This demo only reads from official government hosts on its list.",
      403,
    );
  }
  let response: Response | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    response = await fetch(url, {
      ...init,
      method: init.method ?? "GET",
      redirect: "manual",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json, text/html;q=0.9",
        ...(init.headers as Record<string, string> | undefined),
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (response.status >= 300 && response.status < 400) {
      throw new DemoError(
        "redirect_refused",
        "The official source sent the request somewhere else, and the demo does not follow redirects.",
      );
    }
    if (response.status === 429) {
      throw new DemoError(
        "upstream_rate_limited",
        "The official source asked the demo to wait before trying again.",
        // 503, not 429: the visitor did not exceed their own limit.
        503,
        "error",
        retryAfter(response.headers.get("retry-after")),
      );
    }
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) {
      throw new DemoError(
        "too_large",
        "This document is longer than the demo reads. Open it at the official source.",
        413,
      );
    }
    reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BYTES) {
          throw new DemoError(
            "too_large",
            "This document is longer than the demo reads. Open it at the official source.",
            413,
          );
        }
        chunks.push(value);
      }
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { response, bytes };
  } catch (error) {
    // Cleanup must not replace the original error or delay the response.
    if (reader) void reader.cancel().catch(() => undefined);
    else if (response?.body) void response.body.cancel().catch(() => undefined);
    if (error instanceof DemoError) throw error;
    throw new DemoError(
      "upstream_unreachable",
      "The official source did not finish answering. Try again in a moment.",
      504,
    );
  } finally {
    reader?.releaseLock();
  }
}

function retryAfter(value: string | null): string {
  if (!value) return "60";
  const seconds = /^\d+$/.test(value)
    ? Number(value)
    : Math.ceil((Date.parse(value) - Date.now()) / 1000);
  return Number.isFinite(seconds)
    ? String(Math.min(86_400, Math.max(1, seconds)))
    : "60";
}

export function badUpstream(): DemoError {
  return new DemoError(
    "bad_upstream",
    "The official source returned a record the demo could not validate.",
  );
}

export function parseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new DemoError(
      "bad_upstream",
      "The official source returned something the demo could not read.",
    );
  }
}

export function cleanText(value: unknown, max = 400): string {
  if (value !== undefined && value !== null && typeof value !== "string")
    throw badUpstream();
  const text = typeof value === "string" ? value : "";
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

export function isoDate(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value))
    throw badUpstream();
  const date = value.slice(0, 10);
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    !Number.isFinite(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    throw badUpstream();
  return date;
}

export type Loose = Record<string, unknown>;

export function record(value: unknown): Loose {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw badUpstream();
  return value as Loose;
}

export function resultRows(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > 10) throw badUpstream();
  return value;
}

export function resultCount(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw badUpstream();
  return value;
}

export function requiredText(value: unknown, max = 400): string {
  const text = cleanText(value, max);
  if (!text) throw badUpstream();
  return text;
}

/** Identifiers are opaque source values: never trim or truncate them into a different identity. */
export function metadataId(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 80 ||
    !/^[A-Za-z0-9_.-]+$/.test(value)
  )
    throw badUpstream();
  return value;
}

/**
 * Optional cross-source key: "fr:" and a Federal Register document number.
 * Each source's own documentation, read 2026-10-10, shows where it carries
 * that number. The Regulations.gov v4 OpenAPI specification
 * (https://open.gsa.gov/api/regulationsgov/v4/openapi.yaml) defines frDocNum
 * as a string, "The federal register document number of the document.", in
 * the Document schema of the GET /documents list response. GovInfo names a
 * Federal Register granule by its document number, for example package
 * FR-2024-06-18, granule 2024-12669. A value that is not a plain document
 * number gives null and never fails the row.
 */
export function frMatchKey(value: unknown): string | null {
  const number = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9][A-Za-z0-9-]{0,39}$/.test(number) ? `fr:${number}` : null;
}

export function analyzeSafely<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (typeof code === "string" && /^[A-Z_]+$/.test(code)) {
      throw new DemoError(
        "extraction_refused",
        `Policy Sentinel's text extractor declined this document (${code}). It checks identity and structure before it reads anything, and it did not pass. Open the document at the official source.`,
        422,
      );
    }
    throw error;
  }
}

/** Chain rows one version 3 policy answer carries at most. */
export const CHAIN_MAX = 200;

function rowWording(row: ChainRow): string {
  return [
    row.label,
    row.sourceWording,
    row.quote?.text,
    row.notice,
    row.kind === "link" ? row.targetText : null,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * A version 3 policy answer: the version 1 answer, the extra citation fields
 * and the citation_in_text rows over the blocks the read already has. A row
 * whose wording trips the personal-pattern guard is dropped.
 */
export function policyV3(
  analysis: { policy: DemoPolicyResponse; blocks: readonly TextBlock[] },
  fields: Partial<DemoCitation> = {},
): DemoPolicyResponse {
  const citation = { ...analysis.policy.citation, ...fields };
  const found = citationsInText(analysis.blocks, citation);
  const kept = found.filter((row) => !hasPersonalPattern(rowWording(row)));
  const chain = kept.slice(0, CHAIN_MAX);
  // Withheld rows are counted so the page can say so (safeguard 8).
  const chainWithheld = found.length - kept.length;
  // Rows past the cap are counted too, so the list never reads as complete.
  const chainCut = kept.length - chain.length;
  return {
    ...analysis.policy,
    citation,
    version: 3,
    chain,
    ...(chainWithheld ? { chainWithheld } : {}),
    ...(chainCut ? { chainCut } : {}),
  };
}

export function requireKey(env: Env): string {
  if (!env.DATA_GOV_API_KEY) {
    throw new DemoError(
      "key_pending",
      "This source needs an api.data.gov key, and the key has not been added yet.",
      503,
      "key_pending",
    );
  }
  return env.DATA_GOV_API_KEY;
}

/** The key for one keyed call, within the allowance all visitors share; fails closed. */
export async function spendKey(env: Env): Promise<string> {
  const key = requireKey(env);
  if (env.KEY_RATE) {
    let success = false;
    try {
      ({ success } = await env.KEY_RATE.limit({ key: "data-gov" }));
    } catch {
      // A binding failure is treated as no allowance left.
    }
    if (!success)
      throw new DemoError(
        "upstream_rate_limited",
        "The demo has used its shared allowance for this source. Try again in a minute.",
        503,
        "error",
        "60",
      );
  }
  return key;
}

/** The continuation envelope shared by sources whose provider pages numerically. */
export function numericContinuation(
  criteria: DemoSearchCriteria,
  total: number | null,
  count: number,
): DemoSearchContinuation {
  if (total !== null && criteria.page * 10 >= total)
    return { kind: "stopped", reason: "complete" };
  if (criteria.page === searchPageLimit(criteria.source))
    return { kind: "stopped", reason: "cap" };
  if (total === null && count < 10)
    return { kind: "stopped", reason: "unknown" };
  return { kind: "more", next: nextSearchCursor(criteria) };
}
