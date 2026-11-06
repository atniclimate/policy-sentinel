/** Congress.gov: one bill lookup by reference; it is not read for policy text. */
import { CONGRESS_REFERENCE } from "../../../src/demo/merge";
import type {
  DemoCitation,
  DemoSearchCriteria,
  DemoSearchResponse,
} from "../../../src/demo/types";
import {
  DemoError,
  badUpstream,
  cleanText,
  isoDate,
  officialFetch,
  record,
  parseJson,
  requiredText,
  spendKey,
} from "./shared";
import type { Env } from "./shared";
import { billRef } from "./congress-related";

export const HOSTS: readonly string[] = ["api.congress.gov"];

async function searchCongress(
  env: Env,
  criteria: DemoSearchCriteria,
): Promise<DemoSearchResponse> {
  const { query, page } = criteria;
  const m = CONGRESS_REFERENCE.exec(query);
  if (!m) {
    throw new DemoError(
      "bad_query",
      "Congress.gov lookup takes one bill reference, such as hr 1234 119 (type, number, Congress).",
      400,
    );
  }
  const key = await spendKey(env);
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
  const data = record(parseJson(bytes));
  const bill = record(data.bill);
  const billNumber =
    typeof bill.number === "string" && /^\d{1,5}$/.test(bill.number)
      ? Number(bill.number)
      : bill.number;
  if (
    typeof bill.type !== "string" ||
    bill.type.toLowerCase() !== type ||
    typeof billNumber !== "number" ||
    !Number.isSafeInteger(billNumber) ||
    billNumber !== Number(m[2]) ||
    typeof bill.congress !== "number" ||
    !Number.isSafeInteger(bill.congress) ||
    bill.congress !== Number(m[3])
  )
    throw badUpstream();
  const retrievedAt = new Date().toISOString();
  const latest =
    bill.latestAction === undefined ? {} : record(bill.latestAction);
  const latestText = cleanText(latest.text, 300);
  const ref = billRef(type, Number(m[2]), Number(m[3]));
  const result: DemoCitation = {
    sourceId: "congress",
    identifier: ref.identifier,
    title: requiredText(bill.title, 400),
    issuingBody: cleanText(bill.originChamber, 40) || "U.S. Congress",
    kind: "Bill",
    date: isoDate(bill.introducedDate),
    officialUrl: ref.officialUrl,
    textUrl: null,
    retrievedAt,
    summary: latestText ? `Latest action: ${latestText}` : null,
    textAvailable: false,
    matchKey: null,
  };
  return {
    ok: true,
    source: "congress",
    query,
    total: 1,
    page,
    results: [result],
    retrievedAt,
    criteria,
    continuation: { kind: "stopped", reason: "not_applicable" },
  };
}

export async function search(
  env: Env,
  criteria: DemoSearchCriteria,
): Promise<DemoSearchResponse> {
  return searchCongress(env, criteria);
}
