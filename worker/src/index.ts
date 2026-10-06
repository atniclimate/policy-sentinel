/**
 * Policy Sentinel live demo Worker.
 *
 * A narrow, read-only retrieval layer for the public demo page. It fetches only
 * from an allowlist of official government hosts, runs Sentinel's own text
 * extractor and the demo rules in this Worker, and returns small JSON. API keys
 * exist only as Worker secrets. Nothing about a visitor or a query is stored or
 * logged here beyond what Cloudflare keeps by default.
 */
import {
  ENGINE_INFO,
  analyzePolicy,
  washingtonCaption,
} from "../../src/demo/analyze";
import type {
  DemoCitation,
  DemoErrorResponse,
  DemoSearchResponse,
  DemoSource,
} from "../../src/demo/types";

export interface Env {
  /** api.data.gov key. Optional; enables GovInfo, Congress.gov, Regulations.gov. */
  DATA_GOV_API_KEY?: string;
  RATE?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

export const ALLOWED_ORIGINS: readonly string[] = [
  "https://atniclimate.github.io",
];
const LOCAL_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/;

/** Exact hosts only. No suffix matching. */
export const ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  "www.federalregister.gov",
  "www.govinfo.gov",
  "api.govinfo.gov",
  "api.congress.gov",
  "api.regulations.gov",
  "lawfilesext.leg.wa.gov",
]);

const USER_AGENT =
  "PolicySentinelDemo/0.2 (+https://atniclimate.github.io/policy-sentinel/)";
const MAX_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 12_000;
const SEARCH_TTL = 900;
const POLICY_TTL = 86_400;
const SOFT_LIMIT_PER_MINUTE = 40;

const softCounters = new Map<string, { n: number; reset: number }>();

class DemoError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus = 502,
    readonly status: DemoErrorResponse["status"] = "error",
  ) {
    super(message);
  }
}

export function sourceList(env: Env): DemoSource[] {
  const keyed = env.DATA_GOV_API_KEY ? "live" : "key_pending";
  const keyNote = env.DATA_GOV_API_KEY
    ? "Search is live. Policy text is not read for this source in the demo, so no issues are identified."
    : "The api.data.gov key has not been added yet, so this source is switched off.";
  return [
    {
      id: "federal-register",
      label: "Federal Register",
      level: "federal",
      status: "live",
      note: "Rules, proposed rules, notices and Presidential documents, with the official text read from GovInfo.",
    },
    {
      id: "govinfo",
      label: "GovInfo",
      level: "federal",
      status: keyed,
      note: keyNote,
      secret: "DATA_GOV_API_KEY",
    },
    {
      id: "congress",
      label: "Congress.gov",
      level: "federal",
      status: keyed,
      note: env.DATA_GOV_API_KEY
        ? "Look up one bill by reference, such as hr 1234 119. Policy text is not read in the demo."
        : keyNote,
      secret: "DATA_GOV_API_KEY",
    },
    {
      id: "regulations",
      label: "Regulations.gov",
      level: "federal",
      status: keyed,
      note: keyNote,
      secret: "DATA_GOV_API_KEY",
    },
    {
      id: "washington",
      label: "Washington Legislature",
      level: "state",
      status: "live",
      note: "Look up a bill by number, such as HB 1100 or SB 5100. Official bill text is read from the Legislature.",
    },
    {
      id: "oregon",
      label: "Oregon Legislature",
      level: "state",
      status: "not_available",
      note: "Oregon's data service needs an agreement and credentials that Policy Sentinel has not accepted, so it is off.",
    },
    {
      id: "idaho",
      label: "Idaho Legislature",
      level: "state",
      status: "not_available",
      note: "Idaho publishes no machine-readable legislative source that Policy Sentinel can use, so this is a recorded gap.",
    },
  ];
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && originAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

export function originAllowed(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) || LOCAL_ORIGIN.test(origin);
}

function json(
  body: unknown,
  status: number,
  origin: string | null,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...corsHeaders(origin),
      ...extra,
    },
  });
}

function errorBody(error: DemoError): DemoErrorResponse {
  return {
    ok: false,
    error: error.code,
    message: error.message,
    status: error.status,
  };
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
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new DemoError(
      "host_not_allowed",
      "This demo only reads from official government hosts on its list.",
      403,
    );
  }
  let response: Response;
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
  } catch {
    throw new DemoError(
      "upstream_unreachable",
      "The official source did not answer in time. Try again in a moment.",
      504,
    );
  }
  if (response.status >= 300 && response.status < 400) {
    throw new DemoError(
      "redirect_refused",
      "The official source sent the request somewhere else, and the demo does not follow redirects.",
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
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
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
}

function parseJson<T>(bytes: Uint8Array): T {
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    throw new DemoError(
      "bad_upstream",
      "The official source returned something the demo could not read.",
    );
  }
}

function cleanText(value: unknown, max = 400): string {
  const text = typeof value === "string" ? value : "";
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

function isoDate(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? value.slice(0, 10)
    : null;
}

// ---------------------------------------------------------------- Federal Register

interface FrDocument {
  document_number?: string;
  title?: string;
  type?: string;
  agencies?: { name?: string; raw_name?: string }[];
  publication_date?: string;
  html_url?: string;
  abstract?: string | null;
  citation?: string | null;
}

const FR_FIELDS = [
  "document_number",
  "title",
  "type",
  "agencies",
  "publication_date",
  "html_url",
  "abstract",
  "citation",
];

function frCitation(doc: FrDocument, retrievedAt: string): DemoCitation | null {
  const id = cleanText(doc.document_number, 32);
  if (!/^[A-Za-z0-9-]{4,24}$/.test(id)) return null;
  const agencies = (doc.agencies ?? [])
    .map((a) => cleanText(a.name ?? a.raw_name, 120))
    .filter(Boolean);
  const officialUrl = `https://www.federalregister.gov/d/${id}`;
  return {
    sourceId: "federal-register",
    identifier: doc.citation
      ? `${cleanText(doc.citation, 60)} (FR Doc. ${id})`
      : `FR Doc. ${id}`,
    title: cleanText(doc.title, 400) || "Untitled document",
    issuingBody: agencies.join("; ") || "Not stated",
    kind: cleanText(doc.type, 60) || "Document",
    date: isoDate(doc.publication_date),
    officialUrl,
    textUrl: null,
    retrievedAt,
    summary: doc.abstract ? cleanText(doc.abstract, 500) : null,
    textAvailable: /^\d{2,4}-\d{4,6}$/.test(id),
  };
}

async function searchFederalRegister(
  query: string,
  page: number,
): Promise<DemoSearchResponse> {
  const url = new URL("https://www.federalregister.gov/api/v1/documents.json");
  url.searchParams.set("conditions[term]", query);
  url.searchParams.set("per_page", "10");
  url.searchParams.set("page", String(page));
  url.searchParams.set("order", "relevance");
  for (const f of FR_FIELDS) url.searchParams.append("fields[]", f);
  const { response, bytes } = await officialFetch(url.href);
  if (!response.ok) {
    throw new DemoError(
      "upstream_error",
      `The Federal Register answered with status ${response.status}.`,
    );
  }
  const data = parseJson<{ count?: number; results?: FrDocument[] }>(bytes);
  const retrievedAt = new Date().toISOString();
  const results = (data.results ?? [])
    .map((doc) => frCitation(doc, retrievedAt))
    .filter((c): c is DemoCitation => c !== null);
  return {
    ok: true,
    source: "federal-register",
    query,
    total: typeof data.count === "number" ? data.count : null,
    page,
    results,
    retrievedAt,
  };
}

async function readFederalRegister(id: string) {
  if (!/^(?:\d{2}|\d{4})-\d{4,6}$/.test(id)) {
    throw new DemoError(
      "text_unavailable",
      "The demo reads documents numbered like 2026-01899. Open this one at the official source.",
      422,
    );
  }
  const meta = new URL(
    `https://www.federalregister.gov/api/v1/documents/${id}.json`,
  );
  for (const f of FR_FIELDS) meta.searchParams.append("fields[]", f);
  const { response, bytes } = await officialFetch(meta.href);
  if (response.status === 404) {
    throw new DemoError(
      "not_found",
      "No Federal Register document has that number.",
      404,
    );
  }
  if (!response.ok) {
    throw new DemoError(
      "upstream_error",
      `The Federal Register answered with status ${response.status}.`,
    );
  }
  const doc = parseJson<FrDocument>(bytes);
  const retrievedAt = new Date().toISOString();
  const citation = frCitation(doc, retrievedAt);
  if (!citation || !citation.date) {
    throw new DemoError(
      "bad_upstream",
      "The Federal Register record lacked a publication date.",
    );
  }
  const textUrl = `https://www.govinfo.gov/content/pkg/FR-${citation.date}/html/${id}.htm`;
  const text = await officialFetch(textUrl, {
    headers: { Accept: "text/html" },
  });
  if (text.response.status === 404) {
    throw new DemoError(
      "text_unavailable",
      "GovInfo has no HTML text for this document yet. Open it at the official source.",
      404,
    );
  }
  if (!text.response.ok) {
    throw new DemoError(
      "upstream_error",
      `GovInfo answered with status ${text.response.status}.`,
    );
  }
  return analyzeSafely(() =>
    analyzePolicy({
      bytes: text.bytes,
      mediaType: text.response.headers.get("content-type") ?? "text/html",
      sourceKind: "govinfo_fr",
      textUrl,
      expectedIdentity: id,
      citation,
      retrievedAt,
    }),
  );
}

function analyzeSafely<T>(run: () => T): T {
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

// ---------------------------------------------------------------- Washington

export function parseWashingtonQuery(query: string): {
  chamber: "House Bills" | "Senate Bills";
  prefix: "HB" | "SB";
  number: string;
  biennium: string;
} | null {
  const match =
    /^\s*(HB|SB|House\s+Bill|Senate\s+Bill)\s*(\d{3,4})(?:\s+(\d{4}-\d{2}))?\s*$/i.exec(
      query,
    );
  if (!match) return null;
  const house = /^h/i.test(match[1]);
  const biennium = match[3] ?? "2025-26";
  const start = Number(biennium.slice(0, 4));
  if (start % 2 !== 1 || Number(biennium.slice(5)) !== (start + 1) % 100)
    return null;
  return {
    chamber: house ? "House Bills" : "Senate Bills",
    prefix: house ? "HB" : "SB",
    number: String(Number(match[2])),
    biennium,
  };
}

function washingtonDate(bytes: Uint8Array): string | null {
  const text = new TextDecoder().decode(bytes).replace(/<[^>]+>/g, " ");
  const m = /Read\s+first\s+time\s+(\d{2})\/(\d{2})\/(\d{2})/i.exec(text);
  return m ? `20${m[3]}-${m[1]}-${m[2]}` : null;
}

async function readWashington(query: string) {
  const parsed = parseWashingtonQuery(query);
  if (!parsed) {
    throw new DemoError(
      "bad_query",
      "Enter a Washington bill number, such as HB 1100 or SB 5100. Add a biennium, such as 2025-26, to look at an earlier session.",
      400,
    );
  }
  const textUrl = `https://lawfilesext.leg.wa.gov/biennium/${parsed.biennium}/Htm/Bills/${encodeURIComponent(parsed.chamber)}/${parsed.number}.htm`;
  const { response, bytes } = await officialFetch(textUrl, {
    headers: { Accept: "text/html" },
  });
  if (response.status === 404) {
    throw new DemoError(
      "not_found",
      `The Legislature has no ${parsed.prefix} ${parsed.number} file for ${parsed.biennium}.`,
      404,
    );
  }
  if (!response.ok) {
    throw new DemoError(
      "upstream_error",
      `The Legislature answered with status ${response.status}.`,
    );
  }
  const retrievedAt = new Date().toISOString();
  const caption = washingtonCaption(bytes);
  const citation: DemoCitation = {
    sourceId: "washington",
    identifier: `${parsed.prefix} ${parsed.number}, ${parsed.biennium} biennium, as introduced`,
    title: caption ?? `${parsed.prefix} ${parsed.number}`,
    issuingBody: "Washington State Legislature",
    kind: "Bill",
    date: washingtonDate(bytes),
    officialUrl: textUrl,
    textUrl,
    retrievedAt,
    summary: null,
    textAvailable: true,
  };
  return analyzeSafely(() =>
    analyzePolicy({
      bytes,
      mediaType: response.headers.get("content-type") ?? "text/html",
      sourceKind: "washington_bill",
      textUrl,
      expectedIdentity: `${parsed.prefix} ${parsed.number} ${parsed.biennium}`,
      citation,
      retrievedAt,
    }),
  );
}

// ---------------------------------------------------------------- keyed sources

function requireKey(env: Env): string {
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

type Loose = Record<string, unknown>;

async function searchGovInfo(
  env: Env,
  query: string,
  page: number,
): Promise<DemoSearchResponse> {
  const key = requireKey(env);
  const { response, bytes } = await officialFetch(
    "https://api.govinfo.gov/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: JSON.stringify({
        query,
        pageSize: 10,
        offsetMark: "*",
        historical: false,
        resultLevel: "default",
      }),
    },
  );
  if (!response.ok)
    throw new DemoError(
      "upstream_error",
      `GovInfo answered with status ${response.status}.`,
    );
  const data = parseJson<{ count?: number; results?: Loose[] }>(bytes);
  const retrievedAt = new Date().toISOString();
  const results: DemoCitation[] = (data.results ?? []).flatMap((row) => {
    const packageId = cleanText(row.packageId, 80);
    if (!/^[A-Za-z0-9_.-]+$/.test(packageId)) return [];
    return [
      {
        sourceId: "govinfo",
        identifier: packageId,
        title: cleanText(row.title, 400) || packageId,
        issuingBody:
          cleanText(row.governmentAuthor1 ?? row.governmentAuthor, 160) ||
          "Not stated",
        kind: cleanText(row.collectionCode, 40) || "Document",
        date: isoDate(row.dateIssued),
        officialUrl: `https://www.govinfo.gov/app/details/${packageId}`,
        textUrl: null,
        retrievedAt,
        summary: null,
        textAvailable: false,
      },
    ];
  });
  return {
    ok: true,
    source: "govinfo",
    query,
    total: typeof data.count === "number" ? data.count : null,
    page,
    results,
    retrievedAt,
  };
}

async function searchRegulations(
  env: Env,
  query: string,
  page: number,
): Promise<DemoSearchResponse> {
  const key = requireKey(env);
  const url = new URL("https://api.regulations.gov/v4/documents");
  url.searchParams.set("filter[searchTerm]", query);
  url.searchParams.set("page[size]", "10");
  url.searchParams.set("page[number]", String(page));
  url.searchParams.set("sort", "-postedDate");
  const { response, bytes } = await officialFetch(url.href, {
    headers: { "X-Api-Key": key },
  });
  if (!response.ok)
    throw new DemoError(
      "upstream_error",
      `Regulations.gov answered with status ${response.status}.`,
    );
  const data = parseJson<{
    data?: { id?: string; attributes?: Loose }[];
    meta?: { totalElements?: number };
  }>(bytes);
  const retrievedAt = new Date().toISOString();
  const results: DemoCitation[] = (data.data ?? []).flatMap((row) => {
    const id = cleanText(row.id, 80);
    if (!/^[A-Za-z0-9_.-]+$/.test(id)) return [];
    const a = row.attributes ?? {};
    return [
      {
        sourceId: "regulations",
        identifier: id,
        title: cleanText(a.title, 400) || id,
        issuingBody: cleanText(a.agencyId, 40) || "Not stated",
        kind: cleanText(a.documentType, 40) || "Document",
        date: isoDate(a.postedDate),
        officialUrl: `https://www.regulations.gov/document/${id}`,
        textUrl: null,
        retrievedAt,
        summary: null,
        textAvailable: false,
      },
    ];
  });
  return {
    ok: true,
    source: "regulations",
    query,
    total: data.meta?.totalElements ?? null,
    page,
    results,
    retrievedAt,
  };
}

async function searchCongress(
  env: Env,
  query: string,
  page: number,
): Promise<DemoSearchResponse> {
  const key = requireKey(env);
  const m =
    /^\s*(hr|s|hjres|sjres|hconres|sconres|hres|sres)\s*(\d{1,5})\s+(\d{2,3})\s*$/i.exec(
      query,
    );
  if (!m) {
    throw new DemoError(
      "bad_query",
      "Congress.gov lookup takes one bill reference, such as hr 1234 119 (type, number, Congress).",
      400,
    );
  }
  const type = m[1].toLowerCase();
  const url = `https://api.congress.gov/v3/bill/${Number(m[3])}/${type}/${Number(m[2])}?format=json`;
  const { response, bytes } = await officialFetch(url, {
    headers: { "X-Api-Key": key },
  });
  if (response.status === 404)
    throw new DemoError(
      "not_found",
      "Congress.gov has no bill with that reference.",
      404,
    );
  if (!response.ok)
    throw new DemoError(
      "upstream_error",
      `Congress.gov answered with status ${response.status}.`,
    );
  const data = parseJson<{ bill?: Loose }>(bytes);
  const bill = data.bill ?? {};
  const retrievedAt = new Date().toISOString();
  const latest = (bill.latestAction ?? {}) as Loose;
  const webType = (
    {
      hr: "house-bill",
      s: "senate-bill",
      hjres: "house-joint-resolution",
      sjres: "senate-joint-resolution",
      hconres: "house-concurrent-resolution",
      sconres: "senate-concurrent-resolution",
      hres: "house-resolution",
      sres: "senate-resolution",
    } as Record<string, string>
  )[type];
  const ordinal = `${Number(m[3])}th-congress`;
  const result: DemoCitation = {
    sourceId: "congress",
    identifier: `${type.toUpperCase()} ${Number(m[2])}, ${Number(m[3])}th Congress`,
    title: cleanText(bill.title, 400) || "Untitled bill",
    issuingBody: cleanText(bill.originChamber, 40) || "U.S. Congress",
    kind: "Bill",
    date: isoDate(bill.introducedDate),
    officialUrl: `https://www.congress.gov/bill/${ordinal}/${webType}/${Number(m[2])}`,
    textUrl: null,
    retrievedAt,
    summary: latest.text
      ? `Latest action: ${cleanText(latest.text, 300)}`
      : null,
    textAvailable: false,
  };
  return {
    ok: true,
    source: "congress",
    query,
    total: 1,
    page,
    results: [result],
    retrievedAt,
  };
}

// ---------------------------------------------------------------- routing

async function cached(
  request: Request,
  ttl: number,
  produce: () => Promise<unknown>,
): Promise<{ body: string; hit: boolean }> {
  const store = (caches as unknown as { default: Cache }).default;
  const key = new Request(
    `https://cache.policy-sentinel-demo.invalid${new URL(request.url).pathname}${new URL(request.url).search}`,
  );
  const hit = await store.match(key);
  if (hit) return { body: await hit.text(), hit: true };
  const body = JSON.stringify(await produce());
  await store.put(
    key,
    new Response(body, {
      headers: {
        "Cache-Control": `public, max-age=${ttl}`,
        "Content-Type": "application/json",
      },
    }),
  );
  return { body, hit: false };
}

async function rateLimited(request: Request, env: Env): Promise<boolean> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (env.RATE) {
    try {
      const { success } = await env.RATE.limit({ key: ip });
      if (!success) return true;
    } catch {
      /* fall through to the in-memory guard */
    }
  }
  const now = Date.now();
  const slot = softCounters.get(ip);
  if (!slot || slot.reset < now) {
    if (softCounters.size > 2000) softCounters.clear();
    softCounters.set(ip, { n: 1, reset: now + 60_000 });
    return false;
  }
  slot.n += 1;
  return slot.n > SOFT_LIMIT_PER_MINUTE;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "GET") {
      return json(
        {
          ok: false,
          error: "method_not_allowed",
          message: "This service only answers GET requests.",
          status: "error",
        },
        405,
        origin,
      );
    }
    if (origin && !originAllowed(origin)) {
      return json(
        {
          ok: false,
          error: "origin_not_allowed",
          message: "This service answers the Policy Sentinel demo page only.",
          status: "error",
        },
        403,
        null,
      );
    }
    if (url.pathname === "/" || url.pathname === "/health") {
      return json(
        {
          ok: true,
          service: "policy-sentinel-demo",
          engine: ENGINE_INFO,
          sources: sourceList(env),
        },
        200,
        origin,
        { "Cache-Control": "public, max-age=60" },
      );
    }
    if (url.pathname === "/api/sources") {
      return json({ ok: true, sources: sourceList(env) }, 200, origin, {
        "Cache-Control": "public, max-age=60",
      });
    }
    if (url.pathname !== "/api/search" && url.pathname !== "/api/policy") {
      return json(
        {
          ok: false,
          error: "not_found",
          message: "No such address.",
          status: "error",
        },
        404,
        origin,
      );
    }
    if (await rateLimited(request, env)) {
      return json(
        {
          ok: false,
          error: "rate_limited",
          message:
            "That is a lot of requests in a short time. Wait a minute and try again.",
          status: "error",
        },
        429,
        origin,
        { "Retry-After": "60" },
      );
    }

    const source = url.searchParams.get("source") ?? "federal-register";
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 200);
    const id = (url.searchParams.get("id") ?? "").trim().slice(0, 40);
    const page = Math.min(
      Math.max(Number(url.searchParams.get("page") ?? 1) || 1, 1),
      50,
    );

    try {
      const entry = sourceList(env).find((s) => s.id === source);
      if (!entry)
        throw new DemoError(
          "unknown_source",
          "That source is not one this demo knows.",
          400,
        );
      if (entry.status === "not_available") {
        throw new DemoError("not_available", entry.note, 501, "not_available");
      }
      if (entry.status === "key_pending") requireKey(env);

      if (url.pathname === "/api/search") {
        if (q.length < 2)
          throw new DemoError(
            "bad_query",
            "Enter at least two characters to search.",
            400,
          );
        const run = async () => {
          switch (source) {
            case "federal-register":
              return searchFederalRegister(q, page);
            case "govinfo":
              return searchGovInfo(env, q, page);
            case "regulations":
              return searchRegulations(env, q, page);
            case "congress":
              return searchCongress(env, q, page);
            case "washington": {
              const policy = await readWashington(q);
              return {
                ok: true,
                source,
                query: q,
                total: 1,
                page: 1,
                results: [policy.citation],
                retrievedAt: policy.receipt.retrievedAt,
              } satisfies DemoSearchResponse;
            }
            default:
              throw new DemoError(
                "unknown_source",
                "That source is not one this demo knows.",
                400,
              );
          }
        };
        const out = await cached(request, SEARCH_TTL, run);
        return new Response(out.body, {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            ...corsHeaders(origin),
          },
        });
      }

      // /api/policy
      const run = async () => {
        if (source === "federal-register") {
          if (!id)
            throw new DemoError(
              "bad_query",
              "A document number is needed.",
              400,
            );
          return readFederalRegister(id);
        }
        if (source === "washington") return readWashington(id || q);
        throw new DemoError(
          "text_unavailable",
          "The demo does not read the text of this source, so it identifies no issues here. Open the official source.",
          422,
        );
      };
      const out = await cached(request, POLICY_TTL, run);
      return new Response(out.body, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          ...corsHeaders(origin),
        },
      });
    } catch (error) {
      if (error instanceof DemoError) {
        return json(errorBody(error), error.httpStatus, origin);
      }
      return json(
        {
          ok: false,
          error: "internal",
          message: "Something went wrong on this end. Try again in a moment.",
          status: "error",
        },
        500,
        origin,
      );
    }
  },
};
