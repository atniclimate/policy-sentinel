/** Regulations.gov: search only; it is not read for policy text in the demo. */
import {
  MAX_DOCKET_LENGTH,
  REGULATIONS_V2_CONFIRMED,
  documentTypeFilter,
  plainSourceText,
} from "../../../src/demo/search-contract";
import { citationFields } from "../../../src/demo/validation";
import type {
  DemoCitation,
  DemoSearchCriteria,
  DemoSearchResponse,
} from "../../../src/demo/types";
import {
  DemoError,
  frMatchKey,
  cleanText,
  isoDate,
  metadataId,
  numericContinuation,
  officialFetch,
  parseJson,
  record,
  requiredText,
  resultCount,
  resultRows,
  spendKey,
} from "./shared";
import type { Env } from "./shared";

export const HOSTS: readonly string[] = ["api.regulations.gov"];

/**
 * commentEndDate is a nullable date-time (v4 OpenAPI). A timestamp's date part
 * is a calendar date only in the zone it is written in, so a bare date or a
 * value with its own local offset states that date. A UTC instant such as
 * 2099-03-03T04:59:59Z can close on the previous Eastern day, and the demo never
 * converts or assumes a zone, so that value is left out rather than shown late;
 * the row is marked commentsCloseWithheld so it never reads as no comment period.
 * Live calls on 2026-10-24 found every stated value is such a UTC instant
 * (23:59:59 Eastern, as 04:59:59Z or 03:59:59Z), so all are withheld today.
 * shortcut: UTC values show no date; showing the Eastern day needs the owner's ruling on naming that zone.
 */
function regulationsCloseDate(value: unknown): unknown {
  if (value === undefined || value === null) return value;
  const stated =
    typeof value === "string"
      ? /^(\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?([+-]\d{2}:\d{2}))?$/.exec(
          value,
        )
      : null;
  return stated && stated[2] !== "+00:00" && stated[2] !== "-00:00"
    ? stated[1]
    : undefined;
}

async function searchRegulations(
  env: Env,
  criteria: DemoSearchCriteria,
): Promise<DemoSearchResponse> {
  const { query, page, dateFrom, dateTo } = criteria;
  const v2 = criteria.version === 2;
  const key = await spendKey(env);
  const url = new URL("https://api.regulations.gov/v4/documents");
  url.searchParams.set(
    v2 && criteria.match === "docket"
      ? "filter[docketId]"
      : "filter[searchTerm]",
    query,
  );
  url.searchParams.set("page[size]", "10");
  url.searchParams.set("page[number]", String(page));
  url.searchParams.set("sort", "-postedDate");
  if (dateFrom !== null && dateTo !== null) {
    url.searchParams.set("filter[postedDate][ge]", dateFrom);
    url.searchParams.set("filter[postedDate][le]", dateTo);
  }
  const type =
    v2 && criteria.documentType !== null
      ? documentTypeFilter("regulations", criteria.documentType)
      : null;
  if (type !== null) url.searchParams.set("filter[documentType]", type);
  const { response, bytes } = await officialFetch(url.href, {
    headers: { "X-Api-Key": key },
  });
  if (!response.ok)
    throw new DemoError(
      "upstream_error",
      `Regulations.gov answered with status ${response.status}.`,
    );
  const data = record(parseJson(bytes));
  const meta = data.meta === undefined ? {} : record(data.meta);
  const retrievedAt = new Date().toISOString();
  const results: DemoCitation[] = resultRows(data.data).map((value) => {
    const row = record(value);
    const id = metadataId(row.id);
    const a = record(row.attributes);
    const citation: DemoCitation = {
      sourceId: "regulations",
      identifier: id,
      title: requiredText(a.title, 400),
      issuingBody: cleanText(a.agencyId, 40) || "Not stated",
      kind: cleanText(a.documentType, 40) || "Document",
      date: isoDate(a.postedDate),
      officialUrl: `https://www.regulations.gov/document/${id}`,
      textUrl: null,
      retrievedAt,
      summary: null,
      textAvailable: false,
      matchKey: frMatchKey(a.frDocNum),
    };
    if (!v2 || !REGULATIONS_V2_CONFIRMED) return citation;
    const fields = citationFields({
      commentsCloseOn: regulationsCloseDate(a.commentEndDate),
      docketIds: plainSourceText(a.docketId, MAX_DOCKET_LENGTH)
        ? [a.docketId]
        : undefined,
    });
    // A stated time left out is never shown as no comment period (safeguard 8).
    return a.commentEndDate != null && fields.commentsCloseOn === undefined
      ? { ...citation, ...fields, commentsCloseWithheld: true }
      : { ...citation, ...fields };
  });
  const total = resultCount(meta.totalElements);
  return {
    ok: true,
    source: "regulations",
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
  env: Env,
  criteria: DemoSearchCriteria,
): Promise<DemoSearchResponse> {
  return searchRegulations(env, criteria);
}
