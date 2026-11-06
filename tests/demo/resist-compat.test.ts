// @vitest-environment node
/**
 * ATNI-ResIST compatibility (Full 0.9 step 2b, design section 3 T1.1).
 *
 * ATNI-ResIST's drafting page calls this Worker. Its response checks are
 * frozen below as they stand at ResIST commit 4b1ce6b (2026-10-20), copied
 * from pages/sentinel.js and pages/compose.js. The requests it makes:
 * - search (searchPolicies): GET /api/search?source=<id>&q=<words>&page=1,
 *   the words whitespace-squashed, 2 to 200 characters, Accept:
 *   application/json, no searchVersion, so search contract version 1;
 * - policy (readPolicy): GET /api/policy?source=<id>&id=<policyId(result)>,
 *   the Federal Register document number, no version;
 * - sources: sentinel.js never calls /api/sources. Its test reads a recording
 *   of GET /api/sources (no parameters) and checks that every source it
 *   offers is listed with status "live".
 * The page is served from https://atniclimate.github.io, the Worker's one
 * allowed origin, so each answer must also carry that CORS header.
 *
 * fixtures/resist/*.json are this Worker's answers to those requests, built
 * from fixtures/resist/upstream.ts and trimmed to the fields ResIST reads,
 * the shape of ResIST's own recordings. After a deliberate change, refresh
 * them with `npx vitest run tests/demo/resist-compat.test.ts -u` and tell the
 * ResIST lane: its saved notes keep rule, limits and rulesVersion.
 *
 * The enum rule: in these answers every source id, status value, issue type
 * and match value is one ResIST knows today. New ones appear only behind a
 * version field ResIST can ignore (search criteria version 3,
 * src/demo/types.ts). ResIST never sends version 3, so a version 1 or 2
 * request never returns a version 3 field or value.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../../worker/src/index";
import type { Env } from "../../worker/src/index";
import {
  RESIST_BILL_QUERY,
  RESIST_CONGRESS_BILL,
  RESIST_FR_DOC,
  RESIST_FR_HTML,
  RESIST_FR_SEARCH,
  RESIST_GOVINFO_SEARCH,
  RESIST_QUERY,
  RESIST_REGULATIONS_SEARCH,
} from "./fixtures/resist/upstream";

// ---- Frozen copy of ATNI-ResIST 4b1ce6b: pages/sentinel.js, compose.js ----
// SOURCES keeps only id and hosts; its labels are display text.

const API = "https://policy-sentinel-demo.atniclimate.workers.dev";
const MAX_BYTES = 2_000_000;
const SOURCES: readonly { id: string; hosts: readonly string[] }[] = [
  {
    id: "federal-register",
    hosts: ["www.federalregister.gov", "www.govinfo.gov"],
  },
  { id: "govinfo", hosts: ["www.govinfo.gov"] },
  { id: "regulations", hosts: ["www.regulations.gov"] },
  { id: "congress", hosts: ["www.congress.gov"] },
];
const ISSUE_TYPES = [
  "consultation_language",
  "consultation_absent",
  "tribal_reference",
  "date_or_deadline",
  "cross_reference",
  "status_signal",
];

type Obj = Record<string, unknown>;
const squash = (s: unknown) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
const safeUrl = (u: unknown) =>
  /^https:\/\/[^\s"'<>\\]+$/.test(String(u ?? "")) ? String(u) : "";
const bad = (what: string): never => {
  throw new Error(`Invalid ${what}`);
};
const obj = (v: unknown): Obj =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : bad("object");
const text = (v: unknown, max: number, empty = false): string =>
  typeof v === "string" && v.length <= max && (empty || v.trim())
    ? v
    : bad("text");
const count = (v: unknown, max: number, min = 0): number =>
  Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max
    ? (v as number)
    : bad("count");
const list = (v: unknown, max: number): unknown[] =>
  Array.isArray(v) && v.length <= max ? v : bad("list");
const isoDate = (v: unknown): string => {
  const s = text(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s
    ? s
    : bad("date");
};
const timestamp = (v: unknown): string => {
  const s = text(v, 40);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s.slice(0, 10)
    ? s
    : bad("timestamp");
};
const sha256 = (v: unknown): string =>
  /^[a-f0-9]{64}$/.test(text(v, 64)) ? (v as string) : bad("digest");

function officialUrl(v: unknown, sourceId: string): string {
  const s = text(v, 4096);
  const hosts: readonly string[] =
    SOURCES.find((x) => x.id === sourceId)?.hosts ?? [];
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return bad("URL");
  }
  const ok =
    u.protocol === "https:" &&
    !u.username &&
    !u.password &&
    !u.port &&
    !u.search &&
    !u.hash &&
    u.href === s &&
    hosts.includes(u.hostname) &&
    safeUrl(s);
  return ok ? s : bad("URL");
}

function citationValue(value: unknown, sourceId: string) {
  const v = obj(value),
    id = text(v.sourceId, 40);
  if (id !== sourceId || !SOURCES.some((s) => s.id === id)) bad("source");
  if (typeof v.textAvailable !== "boolean") bad("text availability");
  return {
    sourceId: id,
    identifier: text(v.identifier, 300),
    title: text(v.title, 4000),
    issuingBody: text(v.issuingBody, 4000),
    kind: text(v.kind, 200),
    date: v.date === null ? null : isoDate(v.date),
    officialUrl: officialUrl(v.officialUrl, id),
    textUrl: v.textUrl === null ? null : officialUrl(v.textUrl, id),
    retrievedAt: timestamp(v.retrievedAt),
    textAvailable: v.textAvailable as boolean,
  };
}

function searchValue(value: unknown, source: string, query: string) {
  const v = obj(value);
  if (v.ok !== true || v.source !== source || v.query !== query || v.page !== 1)
    bad("search response");
  const seen = new Set<string>();
  const results = list(v.results, 10).map((item) => {
    const c = citationValue(item, source);
    if (seen.has(c.identifier)) bad("result");
    seen.add(c.identifier);
    return c;
  });
  return {
    results,
    total:
      v.total === null || v.total === undefined
        ? null
        : count(v.total, Number.MAX_SAFE_INTEGER),
  };
}

// The id the policy endpoint accepts: the FR document number in the identifier.
function policyId(citation: { sourceId: string; identifier: string }) {
  if (citation.sourceId === "federal-register") {
    const m = /FR Doc\. ([A-Za-z0-9-]+)\)?$/.exec(citation.identifier);
    if (m) return m[1];
  }
  return citation.identifier;
}

function policyValue(value: unknown, expected: { source: string; id: string }) {
  const v = obj(value);
  if (v.ok !== true) bad("policy response");
  const citation = citationValue(v.citation, expected.source);
  if (policyId(citation) !== expected.id) bad("policy identity");
  const r = obj(v.receipt);
  const receipt = {
    sha256: sha256(r.sha256),
    bytes: count(r.bytes, 1_500_000, 1),
    retrievedAt: timestamp(r.retrievedAt),
    textUrl: officialUrl(r.textUrl, citation.sourceId),
  };
  if (!citation.textAvailable || citation.textUrl !== receipt.textUrl)
    bad("receipt");
  const ids = new Set<string>();
  const issues = list(v.issues, 100).map((item) => {
    const i = obj(item),
      id = text(i.id, 100),
      type = text(i.type, 40);
    if (!ISSUE_TYPES.includes(type) || ids.has(id) || !/^[a-z_]+-\d+$/.test(id))
      bad("issue");
    ids.add(id);
    return {
      id,
      type,
      label: text(i.label, 300),
      quote: text(i.quote, 4000),
      locator: text(i.locator, 4000),
      rule: text(i.rule, 4000),
      limits: text(i.limits, 4000),
    };
  });
  return {
    citation,
    receipt,
    engine: { rulesVersion: text(obj(v.engine).rulesVersion, 100) },
    issues,
  };
}

// The request paths searchPolicies and readPolicy build.
const searchPath = (source: string, q: string) =>
  `/api/search?${new URLSearchParams({ source, q: squash(q), page: "1" })}`;
const policyPath = (source: string, id: string) =>
  `/api/policy?${new URLSearchParams({ source, id })}`;

// ---- The enum rule ----

/**
 * The catalog ResIST recorded (tests/fixtures/sentinel/sources.json,
 * 2026-10-19), plus grants: listed by the deployed 0.10.1 Worker since
 * adad603 (2026-10-23), before this rule. ResIST maps the catalog by id and
 * never asks for grants (searchPolicies refuses ids outside SOURCES).
 */
const KNOWN_SOURCE_IDS = [
  "federal-register",
  "govinfo",
  "congress",
  "regulations",
  "washington",
  "oregon",
  "idaho",
  "grants",
];
/** The statuses in ResIST's recording, made with the api.data.gov key set. */
const RECORDED_STATUSES = ["live", "not_available"];
/** Match kinds of search versions 1 and 2, frozen at step 1a (1e5b67e); version 3 adds the router readings. */
const V2_MATCHES = ["text", "docket", "rin", "cfr"];
/**
 * Key names a version 1 search answer may carry at any depth: the response,
 * citation, criteria and continuation shapes in src/demo/types.ts at 68ff2be.
 */
const V1_KEYS = [
  ...["ok", "source", "query", "total", "page", "results", "retrievedAt"],
  ...["criteria", "continuation", "kind", "next", "reason"],
  ...["sourceId", "identifier", "title", "issuingBody", "date"],
  ...["officialUrl", "textUrl", "summary", "textAvailable", "matchKey"],
  ...["version", "dateFrom", "dateTo", "pageSize", "sort", "resultLevel"],
  ...["historical", "cursor"],
];
/** Version 2 adds its criteria and citation fields, and DemoCfrRef's part. */
const V2_KEYS = [
  ...V1_KEYS,
  ...["match", "documentType", "eligibility", "commentsCloseOn"],
  ...["commentsCloseWithheld", "docketIds", "rins", "cfrRefs", "topics"],
  ...["applicationsCloseOn", "listedEligibility", "part"],
];

const has = (values: readonly string[], v: unknown) =>
  typeof v === "string" && values.includes(v);

/** Every [key, value] pair in a JSON value, at any depth. */
function entries(value: unknown): [string, unknown][] {
  if (Array.isArray(value)) return value.flatMap(entries);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, v]): [string, unknown][] => [
    [key, v],
    ...entries(v),
  ]);
}

/** What a version 1 or 2 search answer carries beyond its version, or from another source. */
function searchProblems(
  answer: unknown,
  source: string,
  version: 1 | 2,
): string[] {
  const allowed = version === 1 ? V1_KEYS : V2_KEYS;
  const problems = new Set<string>();
  for (const [key, value] of entries(answer)) {
    if (!allowed.includes(key)) problems.add(`field ${key}`);
    else if ((key === "source" || key === "sourceId") && value !== source)
      problems.add(`${key} ${String(value)}`);
    else if (key === "version" && value !== version)
      problems.add(`version ${String(value)}`);
    else if (key === "match" && !has(V2_MATCHES, value))
      problems.add(`match ${String(value)}`);
  }
  return [...problems];
}

/** Source ids, statuses, match kinds and versions outside the known sets, at any depth. */
function enumProblems(answer: unknown, statuses: readonly string[]): string[] {
  return entries(answer).flatMap(([key, value]) =>
    ((key === "source" || key === "sourceId") &&
      !has(KNOWN_SOURCE_IDS, value)) ||
    (key === "status" && !has(statuses, value)) ||
    (key === "match" && !has(V2_MATCHES, value)) ||
    (key === "version" && value !== 1 && value !== 2)
      ? [`${key} ${String(value)}`]
      : [],
  );
}

/** The catalog names sources by `id`, so those are checked as well. */
function catalogProblems(
  answer: unknown,
  statuses: readonly string[],
): string[] {
  const ids = list(obj(answer).sources, 100).map((s) => obj(s).id);
  return [
    ...enumProblems(answer, statuses),
    ...ids
      .filter((id) => !has(KNOWN_SOURCE_IDS, id))
      .map((id) => `id ${String(id)}`),
  ];
}

// ---- Driving the Worker the way ResIST does ----

const ORIGIN = "https://atniclimate.github.io";
const AT = "2099-02-07T18:00:00.000Z";
/** The deployed Worker holds the api.data.gov key, as when ResIST recorded. */
const KEYED: Env = { DATA_GOV_API_KEY: "synthetic-key" };
let visitor = 0;

function reply(body: string | object, type = "application/json") {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  return new Response(payload, { headers: { "content-type": type } });
}

function installFetch(routes: Record<string, () => Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string) => {
      const url = String(input);
      for (const [needle, make] of Object.entries(routes)) {
        if (url.includes(needle)) return make();
      }
      return new Response("not routed", { status: 404 });
    }),
  );
}

/** One GET as ResIST's get() sends it and reads it. */
async function resistGet(path: string, env: Env = KEYED): Promise<Obj> {
  const res = await worker.fetch(
    new Request(API + path, {
      headers: {
        Accept: "application/json",
        Origin: ORIGIN,
        "cf-connecting-ip": `2001:db8::${(++visitor).toString(16)}`,
      },
    }),
    env,
  );
  const body = await res.text();
  expect(res.status, body).toBe(200);
  expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
  expect(new TextEncoder().encode(body).byteLength).toBeLessThanOrEqual(
    MAX_BYTES,
  );
  return obj(JSON.parse(body));
}

const FR_ROUTES = {
  "documents.json": () => reply(RESIST_FR_SEARCH),
  [`/documents/${RESIST_FR_DOC}.json`]: () =>
    reply(RESIST_FR_SEARCH.results[0]),
  [`/html/${RESIST_FR_DOC}.htm`]: () => reply(RESIST_FR_HTML, "text/html"),
};

/** A Federal Register search, then a read of its first result, as ResIST's Read this policy button does. */
async function frAnswers() {
  installFetch(FR_ROUTES);
  const query = squash(RESIST_QUERY);
  const search = await resistGet(searchPath("federal-register", RESIST_QUERY));
  const found = searchValue(search, "federal-register", query);
  const first = found.results[0];
  const id = policyId(first);
  const policy = await resistGet(policyPath(first.sourceId, id));
  return { query, search, found, id, policy };
}

/** A recorded answer, written the way ResIST's fixtures are. */
const recording = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(AT));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ATNI-ResIST compatibility (ResIST 4b1ce6b)", () => {
  it("lists every source ResIST offers as live, with only ids and statuses it knows", async () => {
    const body = await resistGet("/api/sources");
    const catalog = list(body.sources, 100).map(obj);
    // ResIST's test: the recorded catalog still offers every source its panel lists.
    const live = new Map(catalog.map((s) => [s.id, s]));
    for (const s of SOURCES) expect(live.get(s.id)?.status, s.id).toBe("live");
    expect(catalogProblems(body, RECORDED_STATUSES)).toEqual([]);
    const trimmed = catalog.map(({ id, label, level, status, note }) => ({
      id,
      label,
      level,
      status,
      note,
    }));
    await expect(recording({ ok: true, sources: trimmed })).toMatchFileSnapshot(
      "./fixtures/resist/sources.json",
    );
  });

  it("adds only the existing key_pending status when the deployment lacks the key", async () => {
    const body = await resistGet("/api/sources", {});
    expect(
      catalogProblems(body, [...RECORDED_STATUSES, "key_pending"]),
    ).toEqual([]);
  });

  it("answers a Federal Register search as searchValue reads it, in version 1", async () => {
    const { query, search, found } = await frAnswers();
    expect(found.results).toHaveLength(5);
    expect(found.total).toBe(10000);
    // The provider rows carry version 2 fields; a version 1 answer leaves them out.
    expect(searchProblems(search, "federal-register", 1)).toEqual([]);
    const trimmed = {
      ok: true,
      source: "federal-register",
      query,
      page: 1,
      total: found.total,
      results: found.results,
    };
    await expect(recording(trimmed)).toMatchFileSnapshot(
      "./fixtures/resist/search-federal-register.json",
    );
  });

  it.each<[string, string, Record<string, () => Response>, number]>([
    [
      "govinfo",
      RESIST_QUERY,
      { "api.govinfo.gov": () => reply(RESIST_GOVINFO_SEARCH) },
      2,
    ],
    [
      "regulations",
      RESIST_QUERY,
      { "api.regulations.gov": () => reply(RESIST_REGULATIONS_SEARCH) },
      1,
    ],
    [
      "congress",
      RESIST_BILL_QUERY,
      { "api.congress.gov": () => reply({ bill: RESIST_CONGRESS_BILL }) },
      1,
    ],
  ])(
    "answers a %s search as searchValue reads it, in version 1",
    async (source, q, routes, n) => {
      installFetch(routes);
      const body = await resistGet(searchPath(source, q));
      expect(searchValue(body, source, squash(q)).results).toHaveLength(n);
      expect(searchProblems(body, source, 1)).toEqual([]);
    },
  );

  it("reads a Federal Register result as readPolicy and policyValue read it", async () => {
    const { id, policy } = await frAnswers();
    expect(id).toBe(RESIST_FR_DOC);
    const p = policyValue(policy, { source: "federal-register", id });
    expect(new Set(p.issues.map((i) => i.type))).toEqual(
      new Set([
        "consultation_language",
        "tribal_reference",
        "date_or_deadline",
        "cross_reference",
        "status_signal",
      ]),
    );
    expect(enumProblems(policy, RECORDED_STATUSES)).toEqual([]);
    await expect(recording({ ok: true, ...p })).toMatchFileSnapshot(
      `./fixtures/resist/policy-${RESIST_FR_DOC}.json`,
    );
  });

  it("keeps version 3 fields and values out of a version 2 answer", async () => {
    installFetch(FR_ROUTES);
    const body = await resistGet(
      `${searchPath("federal-register", RESIST_QUERY)}&searchVersion=2`,
    );
    // The version 2 citation fields are present, so the check below sees them.
    expect(
      list(body.results, 10).filter((r) => obj(r).docketIds !== undefined),
    ).toHaveLength(2);
    expect(searchProblems(body, "federal-register", 2)).toEqual([]);
  });

  it("flags a new source id, status, issue type, match kind, version or field", async () => {
    const { query, search, id, policy } = await frAnswers();
    const v2 = await resistGet(
      `${searchPath("federal-register", RESIST_QUERY)}&searchVersion=2`,
    );
    const catalog = await resistGet("/api/sources");

    const newType = structuredClone(policy);
    obj(list(newType.issues, 100)[0]).type = "authority_line";
    expect(() =>
      policyValue(newType, { source: "federal-register", id }),
    ).toThrow(/Invalid/);

    const newSource = structuredClone(search);
    obj(list(newSource.results, 10)[0]).sourceId = "govinfo-courts";
    expect(() => searchValue(newSource, "federal-register", query)).toThrow(
      /Invalid/,
    );
    expect(searchProblems(newSource, "federal-register", 1)).toEqual([
      "sourceId govinfo-courts",
    ]);

    const v3Version = structuredClone(search);
    obj(v3Version.criteria).version = 3;
    expect(searchProblems(v3Version, "federal-register", 1)).toEqual([
      "version 3",
    ]);

    const v3Field = structuredClone(search);
    obj(list(v3Field.results, 10)[0]).court = "ca9";
    expect(searchProblems(v3Field, "federal-register", 1)).toEqual([
      "field court",
    ]);

    const v3Match = structuredClone(v2);
    obj(v3Match.criteria).match = "usc";
    expect(searchProblems(v3Match, "federal-register", 2)).toEqual([
      "match usc",
    ]);

    const linked = structuredClone(policy);
    linked.links = [{ target: { sourceId: "usc-index", identifier: "x" } }];
    expect(enumProblems(linked, RECORDED_STATUSES)).toEqual([
      "sourceId usc-index",
    ]);

    const newEntry = structuredClone(catalog);
    list(newEntry.sources, 100).push({ id: "ecfr", status: "link_out" });
    expect(catalogProblems(newEntry, RECORDED_STATUSES)).toEqual([
      "status link_out",
      "id ecfr",
    ]);
  });
});
