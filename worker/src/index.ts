/**
 * Policy Sentinel live demo Worker.
 *
 * A narrow, read-only retrieval layer for the public demo page. It fetches only
 * from an allowlist of official government hosts, runs Sentinel's own text
 * extractor and the demo rules in this Worker, and returns small JSON. API keys
 * exist only as Worker secrets. Search requests bypass application caching and
 * logging. Successful policy reads may be cached by document identity; temporary
 * address counters enforce rate limits. Hosting providers have their own policies.
 *
 * This file is routing only: CORS, the origin check, rate limiting, and the
 * dispatch for /, /health, /api/sources, /api/search, /api/policy and
 * /api/related. Each
 * source's own search and read code lives in worker/src/sources/<source>.ts;
 * the SOURCE_REGISTRY below composes the allowed-host set and the search
 * dispatch from those modules, so adding a source there needs only the new
 * module plus one registry line here.
 */
import { ENGINE_INFO } from "../../src/demo/analyze";
import { isCourtCode } from "../../src/demo/courts";
import {
  MAX_CONTINUATION_LENGTH,
  SearchCriteriaError,
  searchCriteria,
} from "../../src/demo/search-contract";
import type {
  DemoDocumentType,
  DemoEligibility,
  DemoErrorResponse,
  DemoSearchCriteria,
  DemoSearchCursor,
  DemoSearchMatchV3,
  DemoSource,
} from "../../src/demo/types";
import * as congress from "./sources/congress";
import * as congressRelated from "./sources/congress-related";
import * as federalRegister from "./sources/federal-register";
import * as govinfo from "./sources/govinfo";
import * as govinfoCourts from "./sources/govinfo-courts";
import * as govinfoRelated from "./sources/govinfo-related";
import * as grants from "./sources/grants";
import * as grantsDetail from "./sources/grants-detail";
import * as regulations from "./sources/regulations";
import {
  DemoError,
  configureAllowedHosts,
  officialFetch,
  requireKey,
} from "./sources/shared";
import type { Env } from "./sources/shared";
import * as washington from "./sources/washington";

export type { Env };
export { officialFetch };
export { currentBiennium, parseWashingtonQuery } from "./sources/washington";

/** Every live, searchable source, plus the exact hosts and search code each one owns. */
export const SOURCE_REGISTRY = {
  "federal-register": federalRegister,
  govinfo,
  regulations,
  congress,
  grants,
  washington,
  "govinfo-courts": govinfoCourts,
} as const;
// govinfo-related, congress-related and grants-detail have no search; their
// hosts are already in this set (tests/demo/worker-integration.test.ts checks).

export const ALLOWED_ORIGINS: readonly string[] = [
  "https://atniclimate.github.io",
];
const LOCAL_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/;

/** Exact hosts only, composed from the source registry. No suffix matching. */
export const ALLOWED_HOSTS: ReadonlySet<string> = new Set(
  Object.values(SOURCE_REGISTRY).flatMap((adapter) => adapter.HOSTS),
);
configureAllowedHosts(ALLOWED_HOSTS);

const POLICY_TTL = 86_400;
const POLICY_CACHE_VERSION = `demo-policy-2:${ENGINE_INFO.parser}:${ENGINE_INFO.parserVersion}:${ENGINE_INFO.parserConfigDigest}:${ENGINE_INFO.rulesVersion}`;
const SOFT_LIMIT_PER_MINUTE = 80;

const softCounters = new Map<string, { n: number; reset: number }>();

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
      id: "grants",
      label: "Grants.gov",
      level: "federal",
      status: "live",
      note: "Funding opportunities, from Grants.gov: forecasted and posted listings. Opportunity text is not read in the demo.",
    },
    {
      id: "washington",
      label: "Washington State Legislature",
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
      note: "No Idaho source is enabled in this demo; this remains a recorded gap.",
    },
  ];
}

/**
 * The version 2 catalog (GET /api/sources?version=2): the version 1 list plus
 * the sources a version 1 reader such as ATNI-ResIST does not know. The
 * router looks sources up here; /health and /api/sources keep sourceList.
 */
export function sourceListV2(env: Env): DemoSource[] {
  const list = sourceList(env);
  const courts: DemoSource = {
    id: "govinfo-courts",
    label: "GovInfo court opinions",
    level: "federal",
    status: env.DATA_GOV_API_KEY ? "live" : "key_pending",
    note: env.DATA_GOV_API_KEY
      ? "Court opinions on GovInfo from seven federal courts (the Ninth Circuit, the Federal Circuit, the Court of Federal Claims, and the district courts of Washington, Oregon and Idaho), and U.S. Reports through volume 586. Opinion text is not read in the demo."
      : "The api.data.gov key has not been added yet, so this source is switched off.",
    secret: "DATA_GOV_API_KEY",
  };
  const at = list.findIndex((s) => s.id === "govinfo") + 1;
  return [...list.slice(0, at), courts, ...list.slice(at)];
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && originAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
    headers["Access-Control-Expose-Headers"] = "Retry-After";
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

// ---------------------------------------------------------------- routing

const MAX_SEARCH_BODY = MAX_CONTINUATION_LENGTH + 2_000;

/**
 * POST /api/search carries the same criteria as the GET query, as a JSON object
 * of string values, so search words stay out of addresses (design rule 5). The
 * address's own query string is ignored.
 */
async function searchBody(request: Request): Promise<URLSearchParams> {
  const bad = () =>
    new DemoError("bad_query", "The search request is not valid.", 400);
  if (Number(request.headers.get("Content-Length")) > MAX_SEARCH_BODY)
    throw bad();
  const text = await request.text();
  if (text.length > MAX_SEARCH_BODY) throw bad();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw bad();
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw bad();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== "string") throw bad();
    params.set(key, value);
  }
  return params;
}

async function cachedPolicy(
  source: string,
  identity: string | null,
  produce: () => Promise<unknown>,
): Promise<{ body: string; hit: boolean }> {
  // Only validated public document identities enter this optional cache. Search
  // text, request query strings and unrelated parameters never become cache keys.
  const key = identity
    ? new Request(
        `https://cache.policy-sentinel-demo.invalid/policy/${encodeURIComponent(POLICY_CACHE_VERSION)}/${source}/${encodeURIComponent(identity)}`,
      )
    : null;
  let store: Cache | undefined;
  try {
    store =
      typeof caches === "undefined"
        ? undefined
        : (caches as unknown as { default?: Cache }).default;
    const hit = key ? await store?.match(key) : undefined;
    if (hit) return { body: await hit.text(), hit: true };
  } catch {
    // Retrieval remains available if cache access or reading an entry fails.
  }
  const body = JSON.stringify(await produce());
  try {
    if (key && store)
      await store.put(
        key,
        new Response(body, {
          headers: {
            "Cache-Control": `public, max-age=${POLICY_TTL}`,
            "Content-Type": "application/json",
          },
        }),
      );
  } catch {
    // A completed official-source read is useful even when caching fails.
  }
  return { body, hit: false };
}

async function rateLimited(request: Request, env: Env): Promise<boolean> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (env.RATE) {
    try {
      const { success } = await env.RATE.limit({ key: ip });
      if (!success) return true;
    } catch {
      return true;
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
    const searchPost =
      request.method === "POST" &&
      url.pathname === "/api/search" &&
      /^application\/json\s*(?:;|$)/i.test(
        request.headers.get("Content-Type") ?? "",
      );
    if (request.method !== "GET" && !searchPost) {
      return json(
        {
          ok: false,
          error: "method_not_allowed",
          message:
            "This service answers GET requests, and searches sent by POST as JSON.",
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
      const body =
        url.searchParams.get("version") === "2"
          ? { ok: true, version: 2, sources: sourceListV2(env) }
          : { ok: true, sources: sourceList(env) };
      return json(body, 200, origin, {
        "Cache-Control": "public, max-age=60",
      });
    }
    if (
      url.pathname !== "/api/search" &&
      url.pathname !== "/api/policy" &&
      url.pathname !== "/api/related"
    ) {
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

    try {
      const params = searchPost ? await searchBody(request) : url.searchParams;
      const source = params.get("source") ?? "federal-register";
      const q = (params.get("q") ?? "").trim();
      const id = (params.get("id") ?? "").trim();
      const pageText = params.get("page") ?? "1";
      const page = Number(pageText);
      const bill = (params.get("bill") ?? "").trim();
      if (
        q.length > 200 ||
        // GovInfo access ids run to 80 characters (govinfo-related.ts).
        id.length > (url.pathname === "/api/related" ? 80 : 40) ||
        bill.length > 40 ||
        !/^[1-9]\d*$/.test(pageText) ||
        !Number.isSafeInteger(page) ||
        page > 50
      ) {
        throw new DemoError(
          "bad_query",
          "The search or page number is not valid.",
          400,
        );
      }
      const entry = sourceListV2(env).find((s) => s.id === source);
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
        let criteria: DemoSearchCriteria;
        const court = params.get("court");
        try {
          const version = params.get("searchVersion");
          const envelope = params.get("continuation");
          const match = params.get("match");
          const documentType = params.get("documentType");
          const eligibility = params.get("eligibility");
          // Version 3 is open to the court-case source only, so every other
          // source's version 1 and 2 behavior stays exactly as it was.
          const widened =
            version === "2" || (version === "3" && source === "govinfo-courts");
          if (
            (version !== null && version !== "1" && !widened) ||
            (!widened &&
              (match !== null ||
                documentType !== null ||
                eligibility !== null)) ||
            (envelope !== null && envelope.length > MAX_CONTINUATION_LENGTH)
          )
            throw new SearchCriteriaError(
              "The search contract is not supported.",
            );
          // The court filter is a court-case search parameter only.
          if (
            court !== null &&
            (source !== "govinfo-courts" || !isCourtCode(court))
          )
            throw new SearchCriteriaError(
              "The court filter takes one of the seven listed courts, on a court case search only.",
            );
          // searchCriteria checks match and documentType against their allowlists.
          criteria = searchCriteria(source, q, page, {
            dateFrom: params.get("dateFrom"),
            dateTo: params.get("dateTo"),
            continuation:
              envelope === null
                ? null
                : (JSON.parse(envelope) as DemoSearchCursor),
            ...(widened && {
              version: version === "3" ? 3 : 2,
              match: (match ?? "text") as DemoSearchMatchV3,
              documentType: documentType as DemoDocumentType | null,
              eligibility: eligibility as DemoEligibility | null,
            }),
          });
        } catch (error) {
          throw new DemoError(
            error instanceof SearchCriteriaError ? error.code : "bad_query",
            error instanceof SearchCriteriaError
              ? error.message
              : "The continuation is not valid.",
            400,
          );
        }
        const run = async () => {
          const adapter =
            SOURCE_REGISTRY[source as keyof typeof SOURCE_REGISTRY];
          if (!adapter)
            throw new DemoError(
              "unknown_source",
              "That source is not one this demo knows.",
              400,
            );
          if (adapter === govinfoCourts)
            return govinfoCourts.search(
              env,
              criteria,
              court !== null && isCourtCode(court) ? court : null,
            );
          return adapter.search(env, criteria);
        };
        const body = JSON.stringify(await run());
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            ...corsHeaders(origin),
          },
        });
      }

      if (url.pathname === "/api/related") {
        // One keyed call per request at most; each module caches its answer.
        const collection = params.get("collection");
        let related: unknown;
        if (source === "govinfo")
          related =
            collection === null
              ? await govinfoRelated.related(env, id)
              : await govinfoRelated.relatedIn(env, id, collection);
        else if (source === "congress")
          related = await congressRelated.relatedBills(env, bill);
        else
          throw new DemoError(
            "bad_query",
            "Related records are listed for GovInfo and Congress.gov only.",
            400,
          );
        return json(related, 200, origin);
      }

      // /api/policy
      const v3 = params.get("version") === "3";
      const run = async () => {
        if (source === "federal-register") {
          if (!id)
            throw new DemoError(
              "bad_query",
              "A document number is needed.",
              400,
            );
          return federalRegister.read(id, v3);
        }
        if (source === "washington") return washington.read(id || q, v3);
        if (source === "grants") return grantsDetail.read(id);
        throw new DemoError(
          "text_unavailable",
          "The demo does not read the text of this source, so it identifies no issues here. Open the official source.",
          422,
        );
      };
      let identity: string | null = null;
      if (source === "federal-register" && federalRegister.isDocumentNumber(id))
        identity = id;
      if (source === "washington") {
        const parsed = washington.parseWashingtonQuery(id || q);
        if (parsed)
          identity = `${parsed.prefix} ${parsed.number} ${parsed.biennium}`;
      }
      // A version 3 answer is a different body, so it has its own cache entry.
      if (v3 && identity !== null) identity = `v3:${identity}`;
      if (source === "grants" && grantsDetail.isOpportunityId(id))
        identity = id;
      const out = await cachedPolicy(source, identity, run);
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
        return json(
          errorBody(error),
          error.httpStatus,
          origin,
          error.retryAfter ? { "Retry-After": error.retryAfter } : {},
        );
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
