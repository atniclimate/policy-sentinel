/**
 * GovInfo court cases (design T1.5), on the existing api.govinfo.gov host
 * with the shared api.data.gov key allowance. Three readings of a version 3
 * search: words in USCOURTS restricted by court code (the seven courts in
 * src/demo/courts.ts and no others), one docket with its court code, and one
 * U.S. Reports citation through volume 586. Above volume 586 the answer is
 * "Not resolvable from an official source" and no call is made.
 *
 * Every row passes a positive allowlist (package id, title, court code,
 * docket number, date issued, last modified, official link) before any cache
 * write; party names, MODS, download links and every other field are
 * dropped. A lower-court caption that may name a person is withheld; a
 * U.S. Reports case name is kept as GovInfo gives it unless the D-068
 * personal guard matches (caseNameShown). GovInfo states no reporter citation
 * for USCOURTS, so those rows say so.
 */
import { courts as COURTS } from "../../../src/demo/copy/courts";
import {
  COURT_CODES,
  COURT_LABELS,
  SUPREME_COURT_LABEL,
  caseNameShown,
  courtDocketReading,
  docketFromPackageId,
  isCourtCode,
  usReportsReading,
  withheldTitle,
} from "../../../src/demo/courts";
import type { CourtCode } from "../../../src/demo/courts";
import {
  nextSearchCursor,
  searchPageLimit,
  validCursorToken,
} from "../../../src/demo/search-contract";
import type {
  DemoCitation,
  DemoSearchContinuation,
  DemoSearchCriteria,
  DemoSearchResponse,
} from "../../../src/demo/types";
import { cachedJson } from "./govinfo-related";
import {
  DemoError,
  badUpstream,
  isoDate,
  metadataId,
  officialFetch,
  parseJson,
  record,
  requiredText,
  resultCount,
  resultRows,
  spendKey,
} from "./shared";
import type { Env, Loose } from "./shared";

export const HOSTS: readonly string[] = ["api.govinfo.gov"];

const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function lastModifiedOf(value: unknown): { lastModified?: string } {
  if (value === undefined || value === null) return {};
  if (typeof value !== "string" || !STAMP.test(value)) throw badUpstream();
  return { lastModified: value };
}

function caseRow(
  row: Loose,
  fields: Pick<
    DemoCitation,
    "identifier" | "issuingBody" | "kind" | "officialUrl"
  > & {
    readonly packageId: string;
    readonly withheldAs: string;
    readonly court?: CourtCode;
    readonly docketNumber?: string;
    readonly caseCitationProvided: boolean;
  },
  retrievedAt: string,
): DemoCitation {
  const title = requiredText(row.title, 400);
  return {
    sourceId: "govinfo-courts",
    identifier: fields.identifier,
    title: caseNameShown(fields.kind, title)
      ? title
      : withheldTitle(fields.withheldAs),
    issuingBody: fields.issuingBody,
    kind: fields.kind,
    date: isoDate(row.dateIssued),
    officialUrl: fields.officialUrl,
    textUrl: null,
    retrievedAt,
    summary: null,
    textAvailable: false,
    matchKey: null,
    ...(fields.court && { court: fields.court }),
    ...(fields.docketNumber && { docketNumber: fields.docketNumber }),
    packageId: fields.packageId,
    ...lastModifiedOf(row.lastModified),
    caseCitationProvided: fields.caseCitationProvided,
  };
}

/** A USCOURTS row; null when its package id is outside the seven courts. */
function uscourtsRow(row: Loose, retrievedAt: string): DemoCitation | null {
  const packageId = metadataId(row.packageId);
  const stated = docketFromPackageId(packageId);
  if (!stated || row.collectionCode !== "USCOURTS") return null;
  return caseRow(
    row,
    {
      identifier: packageId,
      issuingBody: COURT_LABELS[stated.court],
      kind: "USCOURTS",
      officialUrl: `https://www.govinfo.gov/app/details/${packageId}`,
      packageId,
      withheldAs: `${stated.court} ${stated.docketNumber}`,
      court: stated.court,
      docketNumber: stated.docketNumber,
      caseCitationProvided: false,
    },
    retrievedAt,
  );
}

function answer(
  criteria: DemoSearchCriteria,
  results: readonly DemoCitation[],
  total: number | null,
  continuation: DemoSearchContinuation,
): DemoSearchResponse {
  return {
    ok: true,
    source: "govinfo-courts",
    query: criteria.query,
    total,
    page: criteria.page,
    results,
    retrievedAt: results[0]?.retrievedAt ?? new Date().toISOString(),
    criteria,
    continuation,
  };
}

async function getSummary(
  env: Env,
  path: string,
  notFound: string,
): Promise<Loose> {
  const key = await spendKey(env);
  const { response, bytes } = await officialFetch(
    `https://api.govinfo.gov/packages/${path}/summary`,
    { headers: { "X-Api-Key": key } },
  );
  if (response.status === 404) throw new DemoError("not_found", notFound, 404);
  if (!response.ok)
    throw new DemoError(
      "upstream_error",
      `GovInfo answered with status ${response.status}.`,
    );
  return record(parseJson(bytes));
}

async function searchWords(
  env: Env,
  criteria: DemoSearchCriteria,
  court: CourtCode | null,
): Promise<DemoSearchResponse> {
  const { query, dateFrom, dateTo } = criteria;
  const codes = court ? [court] : COURT_CODES;
  const words =
    dateFrom !== null && dateTo !== null
      ? `(${query}) AND publishdate:range(${dateFrom},${dateTo})`
      : `(${query})`;
  const key = await spendKey(env);
  const { response, bytes } = await officialFetch(
    "https://api.govinfo.gov/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: JSON.stringify({
        query: `collection:(USCOURTS) AND courtcode:(${codes.join(" OR ")}) AND ${words}`,
        pageSize: 10,
        offsetMark: criteria.cursor ?? "*",
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
  const data = record(parseJson(bytes));
  const retrievedAt = new Date().toISOString();
  const results: DemoCitation[] = [];
  for (const value of resultRows(data.results)) {
    const row = uscourtsRow(record(value), retrievedAt);
    // Granules of one package are one case.
    if (row && !results.some((r) => r.identifier === row.identifier))
      results.push(row);
  }
  return answer(
    criteria,
    results,
    resultCount(data.count),
    criteria.page === searchPageLimit(criteria.source)
      ? { kind: "stopped", reason: "cap" }
      : validCursorToken(data.offsetMark) &&
          data.offsetMark !== "*" &&
          data.offsetMark !== criteria.cursor
        ? { kind: "more", next: nextSearchCursor(criteria, data.offsetMark) }
        : { kind: "stopped", reason: "unknown" },
  );
}

async function lookupDocket(
  env: Env,
  criteria: DemoSearchCriteria,
): Promise<DemoSearchResponse> {
  const reading = courtDocketReading(criteria.query);
  if (!reading)
    throw new DemoError(
      "bad_query",
      "A docket number needs its court code, such as ca9 99-12345.",
      400,
    );
  const row = await cachedJson("govinfo-case", reading.packageId, async () => {
    const data = await getSummary(
      env,
      reading.packageId,
      COURTS.docketNotFound,
    );
    if (metadataId(data.packageId) !== reading.packageId) throw badUpstream();
    const out = uscourtsRow(data, new Date().toISOString());
    if (!out) throw badUpstream();
    return out;
  });
  return answer(criteria, [row], 1, {
    kind: "stopped",
    reason: "not_applicable",
  });
}

async function lookupUsReports(
  env: Env,
  criteria: DemoSearchCriteria,
): Promise<DemoSearchResponse> {
  const reading = usReportsReading(criteria.query);
  if (!reading)
    throw new DemoError(
      "bad_query",
      "A U.S. Reports citation is written as volume, U.S., and page, such as 199 U.S. 42.",
      400,
    );
  // Above the last GovInfo volume there is no official source to ask.
  if (reading.kind === "not_resolvable")
    throw new DemoError("not_resolvable", reading.message, 422);
  const packageId = `USREPORTS-${reading.volume}`;
  const granuleId = `${packageId}-${reading.page}`;
  const row = await cachedJson("govinfo-usreports", granuleId, async () => {
    const data = await getSummary(
      env,
      `${packageId}/granules/${granuleId}`,
      COURTS.usReportsNotFound,
    );
    if (
      metadataId(data.granuleId) !== granuleId ||
      metadataId(data.packageId) !== packageId
    )
      throw badUpstream();
    return caseRow(
      data,
      {
        identifier: granuleId,
        issuingBody: SUPREME_COURT_LABEL,
        kind: "USREPORTS",
        officialUrl: `https://www.govinfo.gov/app/details/${packageId}/${granuleId}`,
        packageId,
        withheldAs: reading.citation,
        caseCitationProvided: true,
      },
      new Date().toISOString(),
    );
  });
  return answer(criteria, [row], 1, {
    kind: "stopped",
    reason: "not_applicable",
  });
}

/**
 * Registry-ready search. `court` restricts a words search to one of the seven
 * courts; the router passes it when the person names a court.
 */
export async function search(
  env: Env,
  criteria: DemoSearchCriteria,
  court: CourtCode | null = null,
): Promise<DemoSearchResponse> {
  if (criteria.version !== 3)
    throw new DemoError(
      "unsupported_criteria",
      "Court cases are searched with search contract version 3.",
      400,
    );
  if (court !== null && !isCourtCode(court))
    throw new DemoError("bad_query", COURTS.courtNotCovered, 400);
  if (criteria.match === "text") return searchWords(env, criteria, court);
  if (criteria.match === "court_docket") return lookupDocket(env, criteria);
  if (criteria.match === "us_reports") return lookupUsReports(env, criteria);
  throw new DemoError(
    "unsupported_criteria",
    "The demo does not look up that kind of identifier in court cases.",
    400,
  );
}
