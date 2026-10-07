import type {
  DemoCitation,
  DemoPolicyResponse,
  DemoSearchResponse,
  DemoSource,
  IssueType,
} from "./types";

const SOURCE_HOSTS: Record<string, readonly string[]> = {
  "federal-register": ["www.federalregister.gov", "www.govinfo.gov"],
  washington: ["lawfilesext.leg.wa.gov", "app.leg.wa.gov", "apps.leg.wa.gov"],
  govinfo: ["www.govinfo.gov"],
  congress: ["www.congress.gov"],
  regulations: ["www.regulations.gov"],
  oregon: ["www.oregonlegislature.gov"],
  idaho: ["legislature.idaho.gov"],
};
const ISSUE_TYPES: readonly IssueType[] = [
  "consultation_language",
  "consultation_absent",
  "tribal_reference",
  "date_or_deadline",
  "cross_reference",
  "status_signal",
];

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid object");
  return value as Record<string, unknown>;
}

export function text(value: unknown, max: number, allowEmpty = false): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!allowEmpty && !value.trim())
  )
    throw new Error("Invalid text");
  return value;
}

function integer(value: unknown, max: number, min = 0): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new Error("Invalid count");
  return value;
}

function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error("Invalid list");
  return value;
}

function timestamp(value: unknown): string {
  const result = text(value, 40);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(result) ||
    !Number.isFinite(Date.parse(result)) ||
    new Date(result).toISOString().slice(0, 10) !== result.slice(0, 10)
  )
    throw new Error("Invalid retrieval date");
  return result;
}

function digest(value: unknown): string {
  const result = text(value, 64);
  if (!/^[a-f0-9]{64}$/.test(result)) throw new Error("Invalid digest");
  return result;
}

function sourceId(value: unknown): string {
  const result = text(value, 40);
  if (!Object.hasOwn(SOURCE_HOSTS, result)) throw new Error("Unknown source");
  return result;
}

function officialUrl(value: unknown, source: string): string {
  const result = text(value, 4096);
  const url = new URL(result);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !SOURCE_HOSTS[source].includes(url.hostname)
  )
    throw new Error("Invalid official URL");
  return result;
}

export const keyOf = (citation: DemoCitation) =>
  `${citation.sourceId}:${citation.identifier}`;

/** The id accepted by the demo's policy endpoint. */
export function policyId(
  citation: Pick<DemoCitation, "sourceId" | "identifier">,
): string {
  if (citation.sourceId === "federal-register") {
    const match = /FR Doc\. ([A-Za-z0-9-]+)\)?$/.exec(citation.identifier);
    return match ? match[1] : citation.identifier;
  }
  if (citation.sourceId === "washington") {
    const match = /^(HB|SB) (\d+), (\d{4}-\d{2})/.exec(citation.identifier);
    return match ? `${match[1]} ${match[2]} ${match[3]}` : citation.identifier;
  }
  return citation.identifier;
}

export function citationValue(value: unknown): DemoCitation {
  const v = object(value);
  const source = sourceId(v.sourceId);
  const date = v.date === null ? null : text(v.date, 10);
  if (
    date !== null &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)
  )
    throw new Error("Invalid policy date");
  if (typeof v.textAvailable !== "boolean")
    throw new Error("Invalid text availability");
  return {
    sourceId: source,
    identifier: text(v.identifier, 300),
    title: text(v.title, 4000),
    issuingBody: text(v.issuingBody, 4000),
    kind: text(v.kind, 200),
    date,
    officialUrl: officialUrl(v.officialUrl, source),
    textUrl: v.textUrl === null ? null : officialUrl(v.textUrl, source),
    retrievedAt: timestamp(v.retrievedAt),
    summary: v.summary === null ? null : text(v.summary, 20000, true),
    textAvailable: v.textAvailable,
  };
}

export function sourcesValue(value: unknown): DemoSource[] {
  const v = object(value);
  if (v.ok !== true) throw new Error("Invalid source response");
  const ids = new Set<string>();
  const sources = list(v.sources, 7).map((item): DemoSource => {
    const s = object(item);
    const id = sourceId(s.id);
    if (ids.has(id)) throw new Error("Duplicate source");
    ids.add(id);
    if (s.level !== "federal" && s.level !== "state")
      throw new Error("Invalid source level");
    if (
      s.status !== "live" &&
      s.status !== "key_pending" &&
      s.status !== "not_available" &&
      s.status !== "unknown"
    )
      throw new Error("Invalid source status");
    return {
      id,
      label: text(s.label, 200),
      level: s.level,
      status: s.status,
      note: text(s.note, 2000, true),
    };
  });
  if (!sources.length) throw new Error("Empty source catalog");
  return sources;
}

export function searchValue(
  value: unknown,
  source: string,
  query: string,
  page: number,
): DemoSearchResponse {
  const v = object(value);
  if (
    v.ok !== true ||
    v.source !== source ||
    v.query !== query ||
    v.page !== page
  )
    throw new Error("Search response does not match request");
  const ids = new Set<string>();
  const results = list(v.results, 100).map((item) => {
    const citation = citationValue(item);
    if (citation.sourceId !== source || ids.has(keyOf(citation)))
      throw new Error("Invalid search result identity");
    ids.add(keyOf(citation));
    return citation;
  });
  return {
    ok: true,
    source,
    query,
    page,
    results,
    total: v.total === null ? null : integer(v.total, Number.MAX_SAFE_INTEGER),
    retrievedAt: timestamp(v.retrievedAt),
  };
}

export function policyValue(
  value: unknown,
  expected?: { source: string; id: string },
): DemoPolicyResponse {
  const v = object(value);
  if (v.ok !== true) throw new Error("Invalid policy response");
  const citation = citationValue(v.citation);
  if (
    expected &&
    (citation.sourceId !== expected.source ||
      policyId(citation) !== expected.id)
  )
    throw new Error("Policy response does not match request");
  const r = object(v.receipt);
  const receipt = {
    sha256: digest(r.sha256),
    bytes: integer(r.bytes, 1_500_000, 1),
    retrievedAt: timestamp(r.retrievedAt),
    textUrl: officialUrl(r.textUrl, citation.sourceId),
  };
  if (!citation.textAvailable || citation.textUrl !== receipt.textUrl)
    throw new Error("Citation and receipt do not match");
  const e = object(v.engine);
  const engine = {
    parser: text(e.parser, 200),
    parserVersion: text(e.parserVersion, 100),
    parserConfigDigest: digest(e.parserConfigDigest),
    rulesVersion: text(e.rulesVersion, 100),
  };
  const ids = new Set<string>();
  const issues = list(v.issues, 100).map((item) => {
    const i = object(item);
    const type = text(i.type, 40) as IssueType;
    const id = text(i.id, 100);
    if (!ISSUE_TYPES.includes(type) || ids.has(id) || !/^[a-z_]+-\d+$/.test(id))
      throw new Error("Invalid issue identity");
    ids.add(id);
    return {
      id,
      type,
      label: text(i.label, 300),
      quote: text(i.quote, 4000),
      locator: text(i.locator, 4000),
      rule: text(i.rule, 4000),
      limits: text(i.limits, 4000),
      check: text(i.check, 4000),
    };
  });
  return {
    ok: true,
    citation,
    receipt,
    engine,
    issues,
    blockCount: integer(v.blockCount, 1_500_000, 1),
    characterCount: integer(v.characterCount, 10_000_000, 1),
    exclusions: list(v.exclusions, 100).map((item) => {
      const x = object(item);
      return {
        reason: text(x.reason, 1000),
        count: integer(x.count, 1_500_000),
      };
    }),
    warnings: list(v.warnings, 100).map((warning) => text(warning, 2000)),
    opening: text(v.opening, 4000, true),
  };
}
