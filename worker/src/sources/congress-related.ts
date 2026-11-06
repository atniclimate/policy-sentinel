/**
 * Congress.gov related bills for one bill, expanded only when a person
 * presses for them (design T1.3): one keyed call per press, cached in the
 * Worker by the bill reference. Each row keeps Congress.gov's own relation
 * name and who identified it, for "Stated by the source" (basis
 * `source_field`). Sponsors, actions and every other field are dropped
 * before the cache write.
 */
import { CONGRESS_REFERENCE } from "../../../src/demo/merge";
import { hasPersonalPattern } from "../../../src/demo/personal-guard";
import {
  DemoError,
  badUpstream,
  officialFetch,
  parseJson,
  record,
  requiredText,
  resultCount,
  spendKey,
} from "./shared";
import type { Env } from "./shared";
import { cachedJson } from "../cache";
import { MAX_RELATED } from "./govinfo-related";
import type {
  CongressRelatedBills,
  RelatedBill,
} from "../../../src/demo/types";

// The answer shapes are the shared version 3 contract in src/demo/types.ts.
export type {
  CongressRelatedBills,
  RelatedBill,
} from "../../../src/demo/types";

export const HOSTS: readonly string[] = ["api.congress.gov"];

const WEB_TYPE: Readonly<Record<string, string>> = {
  hr: "house-bill",
  s: "senate-bill",
  hjres: "house-joint-resolution",
  sjres: "senate-joint-resolution",
  hconres: "house-concurrent-resolution",
  sconres: "senate-concurrent-resolution",
  hres: "house-resolution",
  sres: "senate-resolution",
};

function ordinal(congress: number): string {
  const lastTwo = congress % 100;
  const suffix =
    lastTwo >= 11 && lastTwo <= 13
      ? "th"
      : (["th", "st", "nd", "rd"][congress % 10] ?? "th");
  return `${congress}${suffix}`;
}

/** The identifier and official page of one bill, for search and related bills. */
export function billRef(type: string, number: number, congress: number) {
  const web = WEB_TYPE[type];
  if (!web || !Number.isSafeInteger(number) || !Number.isSafeInteger(congress))
    throw badUpstream();
  return {
    identifier: `${type.toUpperCase()} ${number}, ${ordinal(congress)} Congress`,
    officialUrl: `https://www.congress.gov/bill/${ordinal(congress)}-congress/${web}/${number}`,
  };
}

/** Related bills for one reference, such as "hr 1234 119". */
export async function relatedBills(
  env: Env,
  reference: string,
): Promise<CongressRelatedBills> {
  const m = CONGRESS_REFERENCE.exec(reference);
  if (!m)
    throw new DemoError(
      "bad_query",
      "Related bills take one bill reference, such as hr 1234 119 (type, number, Congress).",
      400,
    );
  const type = m[1].toLowerCase();
  const number = Number(m[2]);
  const congress = Number(m[3]);
  const subject = billRef(type, number, congress);
  return cachedJson(env, "congress-related", subject.identifier, async () => {
    const key = await spendKey(env);
    const { response, bytes } = await officialFetch(
      `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/relatedbills?format=json&limit=${MAX_RELATED}`,
      { headers: { "X-Api-Key": key } },
    );
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
    const rows = data.relatedBills;
    if (!Array.isArray(rows) || rows.length > MAX_RELATED) throw badUpstream();
    const records: RelatedBill[] = rows.flatMap((value) => {
      const row = record(value);
      const rowNumber =
        typeof row.number === "string" && /^\d{1,5}$/.test(row.number)
          ? Number(row.number)
          : row.number;
      if (
        typeof row.type !== "string" ||
        typeof rowNumber !== "number" ||
        typeof row.congress !== "number"
      )
        throw badUpstream();
      const ref = billRef(row.type.toLowerCase(), rowNumber, row.congress);
      const stated = requiredText(row.title, 400);
      // As govinfo-related: a title the guard flags, or a private bill's, is not passed on.
      const title =
        hasPersonalPattern(stated) || /\bfor the relief of\b/i.test(stated)
          ? null
          : stated;
      const details = row.relationshipDetails;
      if (
        !Array.isArray(details) ||
        details.length === 0 ||
        details.length > 10
      )
        throw badUpstream();
      return details.map((detail) => {
        const d = record(detail);
        return {
          relation: requiredText(d.type, 80),
          identifiedBy: requiredText(d.identifiedBy, 40),
          ...ref,
          title,
        };
      });
    });
    const pagination =
      data.pagination === undefined ? {} : record(data.pagination);
    return {
      ok: true,
      source: "congress",
      basis: "source_field",
      bill: subject.identifier,
      records,
      total: resultCount(pagination.count) ?? rows.length,
      retrievedAt: new Date().toISOString(),
    };
  });
}
