/**
 * Grants.gov opportunity read (design section 3 T1.4; section 1 rule 7): one
 * keyless fetchOpportunity call. A positive allowlist builds the answer, so
 * contacts, addresses, publisher ids and modification comments never reach
 * the cache or the page. The synopsis description goes only into the bounded
 * authority-passage extractor and its personal-pattern guard.
 */
import {
  assistanceListings,
  authorityPassage,
  decodeEntities,
} from "../../../src/demo/grants-authority";
import type { GrantsDetailResponse } from "../../../src/demo/grants-authority";
import type { DemoCitation } from "../../../src/demo/types";
import {
  DemoError,
  badUpstream,
  cleanText,
  isoDate,
  officialFetch,
  parseJson,
  record,
  requiredText,
} from "./shared";

export const HOSTS: readonly string[] = ["api.grants.gov"];

/** Grants.gov opportunity ids are plain integers. */
export function isOpportunityId(id: string): boolean {
  return /^[1-9]\d{0,11}$/.test(id);
}

/** "YYYY-MM-DD-HH-MM-SS" (postingDateStr, responseDateStr): the stated day. */
function stampDay(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}-/.test(value))
    throw badUpstream();
  return isoDate(value.slice(0, 10));
}

const MONTHS = "JanFebMarAprMayJunJulAugSepOctNovDec";

/** "Mon DD, YYYY HH:MM:SS AM EST" (lastUpdatedDate): the stated day, or null. */
function statedDay(value: unknown): string | null {
  const m =
    typeof value === "string"
      ? /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})\b/.exec(value)
      : null;
  const month = m ? MONTHS.indexOf(m[1]) / 3 + 1 : 0;
  if (!m || !Number.isInteger(month) || month < 1) return null;
  return isoDate(
    `${m[3]}-${String(month).padStart(2, "0")}-${m[2].padStart(2, "0")}`,
  );
}

/** The allowlist. Every field read from the upstream body is named here. */
export function opportunityDetail(
  body: unknown,
  retrievedAt: string,
): GrantsDetailResponse {
  const top = record(body);
  if (top.errorcode !== 0) throw badUpstream();
  const data = record(top.data);
  const id = typeof data.id === "number" ? String(data.id) : data.id;
  if (typeof id !== "string" || !isOpportunityId(id)) throw badUpstream();
  const synopsis =
    data.synopsis && typeof data.synopsis === "object"
      ? record(data.synopsis)
      : {};
  const forecast = data.docType === "forecast";
  // shortcut: a forecast's own date fields were not probed live, so a forecast states no date here; read data.forecast once a forecast record is probed.
  const opens = forecast ? null : stampDay(synopsis.postingDateStr);
  const closes = forecast ? null : stampDay(synopsis.responseDateStr);
  const versionDate = statedDay(synopsis.lastUpdatedDate);
  const listings = assistanceListings(data.cfdas);
  const outcome = authorityPassage(synopsis.synopsisDesc);
  const citation: DemoCitation = {
    sourceId: "grants",
    identifier: requiredText(data.opportunityNumber, 100),
    title: requiredText(
      typeof data.opportunityTitle === "string"
        ? decodeEntities(data.opportunityTitle)
        : data.opportunityTitle,
      400,
    ),
    issuingBody:
      cleanText(synopsis.agencyName, 160) ||
      cleanText(data.owningAgencyCode, 40) ||
      "Not stated",
    kind: forecast ? "Forecast" : "Funding opportunity",
    date: opens,
    officialUrl: `https://www.grants.gov/search-results-detail/${id}`,
    textUrl: null,
    retrievedAt,
    summary: null,
    textAvailable: false,
    matchKey: null,
    ...(closes !== null && { applicationsCloseOn: closes }),
    ...(listings.length > 0 && { assistanceListings: listings }),
    ...(outcome.state === "found" && { authorityPassage: outcome.passage }),
    ...(versionDate !== null && { versionDate }),
  };
  return { ok: true, source: "grants", citation, authority: outcome.state };
}

/** Reads one opportunity by its Grants.gov id. */
export async function read(id: string): Promise<GrantsDetailResponse> {
  if (!isOpportunityId(id))
    throw new DemoError(
      "bad_query",
      "A Grants.gov opportunity id is needed.",
      400,
    );
  const { response, bytes } = await officialFetch(
    "https://api.grants.gov/v1/api/fetchOpportunity",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId: Number(id) }),
    },
  );
  if (!response.ok)
    throw new DemoError(
      "upstream_error",
      `Grants.gov answered with status ${response.status}.`,
    );
  return opportunityDetail(parseJson(bytes), new Date().toISOString());
}
