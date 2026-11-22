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
  badUpstream,
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

export async function search(
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
    const collection = cleanText(row.collectionCode, 40).toUpperCase();
    const prefix = /^([A-Z]+)-/i.exec(packageId)?.[1].toUpperCase();
    // A court row's caption gets the same guard as the court cases source.
    const isCase = [collection, prefix].some(
      (code) => code === "USCOURTS" || code === "USREPORTS",
    );
    if (isCase && collection && prefix && prefix !== collection)
      throw badUpstream();
    const kind = collection || (isCase && prefix) || "Document";
    const issued = isoDate(row.dateIssued);
    return {
      sourceId: "govinfo",
      identifier: id,
      title: isCase && !caseNameShown(title) ? withheldTitle(id) : title,
      issuingBody:
        authors.filter(Boolean).join("; ").slice(0, 160) || "Not stated",
      kind,
      date: kind === "USREPORTS" && id !== packageId ? null : issued,
      officialUrl: `https://www.govinfo.gov/app/details/${id}`,
      textUrl: null,
      retrievedAt,
      summary: null,
      textAvailable: false,
      // A Federal Register granule is named by its document number.
      matchKey: row.collectionCode === "FR" ? frMatchKey(row.granuleId) : null,
    };
  });
  const total = resultCount(data.count);
  return {
    ok: true,
    source: "govinfo",
    query,
    total,
    page,
    results,
    retrievedAt,
    criteria,
    continuation:
      // Live 2026-11-19: a one-hit search still carried a next token, so the
      // count is read first, as the courts lane does. An empty page proves
      // nothing. shortcut: this page's rows are compared with the count, so a
      // short last page after page 1 still offers one empty next page; upgrade
      // when the count's meaning on page 2 is checked live.
      total !== null && results.length > 0 && results.length >= total
        ? { kind: "stopped", reason: "complete" }
        : page === searchPageLimit("govinfo")
          ? { kind: "stopped", reason: "cap" }
          : validCursorToken(data.offsetMark) &&
              data.offsetMark !== "*" &&
              data.offsetMark !== criteria.cursor
            ? {
                kind: "more",
                next: nextSearchCursor(criteria, data.offsetMark),
              }
            : { kind: "stopped", reason: "unknown" },
  };
}
