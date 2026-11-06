/** GovInfo: search only; it is not read for policy text in the demo. */
import { caseNameShown, withheldTitle } from "../../../src/demo/courts";
import {
  nextSearchCursor,
  searchPageLimit,
  validCursorToken,
} from "../../../src/demo/search-contract";
import type {
  DemoCitation,
  DemoSearchCriteria,
  DemoSearchResponse,
} from "../../../src/demo/types";
import {
  DemoError,
  cleanText,
  frMatchKey,
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
import type { Env } from "./shared";

export const HOSTS: readonly string[] = ["api.govinfo.gov"];

async function searchGovInfo(
  env: Env,
  criteria: DemoSearchCriteria,
): Promise<DemoSearchResponse> {
  const { query, page, dateFrom, dateTo } = criteria;
  const key = await spendKey(env);
  const { response, bytes } = await officialFetch(
    "https://api.govinfo.gov/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: JSON.stringify({
        query:
          dateFrom !== null && dateTo !== null
            ? `(${query}) AND publishdate:range(${dateFrom},${dateTo})`
            : query,
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
  const results: DemoCitation[] = resultRows(data.results).map((value) => {
    const row = record(value);
    const packageId = metadataId(row.packageId);
    // A granule result is one document inside a package; its title and identity are the granule's.
    const id =
      row.granuleId === undefined || row.granuleId === null
        ? packageId
        : `${packageId}/${metadataId(row.granuleId)}`;
    // The live search service returns governmentAuthor as a list of names.
    const authors = Array.isArray(row.governmentAuthor)
      ? row.governmentAuthor.map((name) => cleanText(name, 160))
      : [cleanText(row.governmentAuthor, 160)];
    const title = requiredText(row.title, 400);
    const kind = cleanText(row.collectionCode, 40) || "Document";
    // A court row's caption gets the same guard as the court cases source.
    const isCase = kind === "USCOURTS" || kind === "USREPORTS";
    return {
      sourceId: "govinfo",
      identifier: id,
      title: isCase && !caseNameShown(kind, title) ? withheldTitle(id) : title,
      issuingBody:
        authors.filter(Boolean).join("; ").slice(0, 160) || "Not stated",
      kind,
      date: isoDate(row.dateIssued),
      officialUrl: `https://www.govinfo.gov/app/details/${id}`,
      textUrl: null,
      retrievedAt,
      summary: null,
      textAvailable: false,
      // A Federal Register granule is named by its document number.
      matchKey: row.collectionCode === "FR" ? frMatchKey(row.granuleId) : null,
    };
  });
  return {
    ok: true,
    source: "govinfo",
    query,
    total: resultCount(data.count),
    page,
    results,
    retrievedAt,
    criteria,
    continuation:
      page === searchPageLimit("govinfo")
        ? { kind: "stopped", reason: "cap" }
        : validCursorToken(data.offsetMark) &&
            data.offsetMark !== "*" &&
            data.offsetMark !== criteria.cursor
          ? { kind: "more", next: nextSearchCursor(criteria, data.offsetMark) }
          : { kind: "stopped", reason: "unknown" },
  };
}

export async function search(
  env: Env,
  criteria: DemoSearchCriteria,
): Promise<DemoSearchResponse> {
  return searchGovInfo(env, criteria);
}
