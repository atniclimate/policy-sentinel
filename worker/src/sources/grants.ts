/** Grants.gov: search only; opportunity text is not read in the demo. */
import { decodeEntities } from "../../../src/demo/grants-authority";
import { plainSourceText } from "../../../src/demo/search-contract";
import type {
  DemoCitation,
  DemoEligibility,
  DemoSearchCriteria,
  DemoSearchResponse,
} from "../../../src/demo/types";
import {
  DemoError,
  badUpstream,
  cleanText,
  isoDate,
  numericContinuation,
  officialFetch,
  parseJson,
  record,
  requiredText,
  resultCount,
  resultRows,
} from "./shared";
import type { Env } from "./shared";

export const HOSTS: readonly string[] = ["api.grants.gov"];

/** Grants.gov writes dates as MM/DD/YYYY; an empty value states no date. */
function grantsDate(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const m =
    typeof value === "string"
      ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
      : null;
  if (!m) throw badUpstream();
  return isoDate(`${m[3]}-${m[1]}-${m[2]}`);
}

/**
 * One search2 hit as a citation. Only these fields are read; search2 hits carry
 * no agency contacts, and fetchOpportunity (which does) is never called.
 */
function grantsCitation(
  value: unknown,
  retrievedAt: string,
  eligibility: DemoEligibility | null,
): DemoCitation {
  const hit = record(value);
  if (typeof hit.id !== "string" || !/^\d{1,12}$/.test(hit.id))
    throw badUpstream();
  if (!plainSourceText(hit.number, 100)) throw badUpstream();
  const closes = grantsDate(hit.closeDate);
  return {
    sourceId: "grants",
    identifier: hit.number,
    // Grants.gov titles carry HTML entities as text (seen live: "&ndash;").
    title: requiredText(
      typeof hit.title === "string" ? decodeEntities(hit.title) : hit.title,
      400,
    ),
    issuingBody:
      cleanText(hit.agency, 160) ||
      cleanText(hit.agencyCode, 40) ||
      "Not stated",
    kind: hit.docType === "forecast" ? "Forecast" : "Funding opportunity",
    date: grantsDate(hit.openDate),
    officialUrl: `https://www.grants.gov/search-results-detail/${hit.id}`,
    textUrl: null,
    retrievedAt,
    summary: null,
    textAvailable: false,
    matchKey: null,
    // An empty closeDate stays absent: never read as no deadline. A forecast's
    // date is an estimate, so it is never shown as the date applications close.
    ...(closes !== null &&
      hit.docType !== "forecast" && { applicationsCloseOn: closes }),
    ...(eligibility && { listedEligibility: eligibility }),
  };
}

async function searchGrants(
  criteria: DemoSearchCriteria,
): Promise<DemoSearchResponse> {
  const { query, page } = criteria;
  const eligibility =
    criteria.version === 2 ? (criteria.eligibility ?? null) : null;
  const { response, bytes } = await officialFetch(
    "https://api.grants.gov/v1/api/search2",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: 10,
        keyword: query,
        oppStatuses: "forecasted|posted",
        startRecordNum: (page - 1) * 10,
        // 07 and 11: Tribal governments and Tribal organizations, in Grants.gov's codes.
        ...(eligibility === "tribal" && { eligibilities: "07|11" }),
      }),
    },
  );
  if (!response.ok)
    throw new DemoError(
      "upstream_error",
      `Grants.gov answered with status ${response.status}.`,
    );
  const body = record(parseJson(bytes));
  if (body.errorcode !== 0)
    throw new DemoError(
      "upstream_error",
      "Grants.gov answered with an error for this search.",
    );
  const data = record(body.data);
  const retrievedAt = new Date().toISOString();
  const results = resultRows(data.oppHits).map((hit) =>
    grantsCitation(hit, retrievedAt, eligibility),
  );
  const total = resultCount(data.hitCount);
  return {
    ok: true,
    source: "grants",
    query,
    total,
    page,
    results,
    retrievedAt,
    criteria,
    continuation: numericContinuation(criteria, total, results.length),
  };
}

export async function search(
  _env: Env,
  criteria: DemoSearchCriteria,
): Promise<DemoSearchResponse> {
  return searchGrants(criteria);
}
