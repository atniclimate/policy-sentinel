/** Washington State Legislature: one bill, read from its original bill file. */
import { analyzePolicy, washingtonCaption } from "../../../src/demo/analyze";
import type {
  DemoCitation,
  DemoSearchCriteria,
  DemoSearchResponse,
} from "../../../src/demo/types";
import {
  DemoError,
  analyzeSafely,
  badUpstream,
  isoDate,
  officialFetch,
} from "./shared";
import type { Env } from "./shared";

export const HOSTS: readonly string[] = ["lawfilesext.leg.wa.gov"];

/** The session in progress: Washington bienniums start in odd years. */
export function currentBiennium(now: Date): string {
  const year = now.getUTCFullYear();
  const start = year % 2 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export function parseWashingtonQuery(
  query: string,
  now = new Date(),
): {
  chamber: "House Bills" | "Senate Bills";
  prefix: "HB" | "SB";
  number: string;
  biennium: string;
} | null {
  const match =
    /^\s*(HB|SB|House\s+Bill|Senate\s+Bill)\s*(\d{3,4})(?:\s+(\d{4}-\d{2}))?\s*$/i.exec(
      query,
    );
  if (!match) return null;
  const house = /^h/i.test(match[1]);
  const biennium = match[3] ?? currentBiennium(now);
  const start = Number(biennium.slice(0, 4));
  if (start % 2 !== 1 || Number(biennium.slice(5)) !== (start + 1) % 100)
    return null;
  return {
    chamber: house ? "House Bills" : "Senate Bills",
    prefix: house ? "HB" : "SB",
    number: String(Number(match[2])),
    biennium,
  };
}

function washingtonDate(bytes: Uint8Array, biennium: string): string | null {
  const text = new TextDecoder().decode(bytes).replace(/<[^>]+>/g, " ");
  const m = /Read\s+first\s+time\s+(\d{2})\/(\d{2})\/(\d{2})/i.exec(text);
  if (!m) return null;
  const start = Number(biennium.slice(0, 4));
  const year = [start, start + 1].find((value) => value % 100 === Number(m[3]));
  if (year === undefined) throw badUpstream();
  return isoDate(`${String(year).padStart(4, "0")}-${m[1]}-${m[2]}`);
}

/** This demo requests original bill files; its broader parser also supports later variants. */
function requireOriginalWashingtonBill(
  bytes: Uint8Array,
  expected: { prefix: "HB" | "SB"; number: string },
): void {
  const preamble = new TextDecoder()
    .decode(bytes)
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ")
    .split(/\bAN\s+ACT\b/i, 1)[0];
  const headers = [
    ...preamble.matchAll(
      /(?:^|\n)\s*(?:_{3,}\s*)?((?:E2?S|2?S|E)?(?:HB|SB)|(?:ENGROSSED\s+|SECOND\s+|SUBSTITUTE\s+)*(?:HOUSE|SENATE)\s+BILL)\s*(?:No\.?\s*)?(\d{4})(?!\d)/gi,
    ),
  ];
  const plain =
    expected.prefix === "HB"
      ? /^(?:HB|HOUSE\s+BILL)$/i
      : /^(?:SB|SENATE\s+BILL)$/i;
  if (
    !headers.length ||
    /CERTIFICATION\s+OF\s+ENROLLMENT/i.test(preamble) ||
    headers.some(
      (header) => !plain.test(header[1]) || header[2] !== expected.number,
    )
  )
    throw badUpstream();
}

async function readWashington(query: string) {
  const parsed = parseWashingtonQuery(query);
  if (!parsed) {
    throw new DemoError(
      "bad_query",
      "Enter a Washington bill number, such as HB 1100 or SB 5100. Add a biennium, such as 2025-26, to look at an earlier session.",
      400,
    );
  }
  const textUrl = `https://lawfilesext.leg.wa.gov/biennium/${parsed.biennium}/Htm/Bills/${encodeURIComponent(parsed.chamber)}/${parsed.number}.htm`;
  const { response, bytes } = await officialFetch(textUrl, {
    headers: { Accept: "text/html" },
  });
  if (response.status === 404) {
    throw new DemoError(
      "not_found",
      `The Legislature has no ${parsed.prefix} ${parsed.number} file for ${parsed.biennium}.`,
      404,
    );
  }
  if (!response.ok) {
    throw new DemoError(
      "upstream_error",
      `The Legislature answered with status ${response.status}.`,
    );
  }
  const retrievedAt = new Date().toISOString();
  requireOriginalWashingtonBill(bytes, parsed);
  const caption = washingtonCaption(bytes);
  const citation: DemoCitation = {
    sourceId: "washington",
    identifier: `${parsed.prefix} ${parsed.number}, ${parsed.biennium} biennium, as introduced`,
    title: caption ?? `${parsed.prefix} ${parsed.number}`,
    issuingBody: "Washington State Legislature",
    kind: "Bill",
    date: washingtonDate(bytes, parsed.biennium),
    officialUrl: textUrl,
    textUrl,
    retrievedAt,
    summary: null,
    textAvailable: true,
    matchKey: null,
  };
  return analyzeSafely(() =>
    analyzePolicy({
      bytes,
      mediaType: response.headers.get("content-type") ?? "text/html",
      sourceKind: "washington_bill",
      textUrl,
      expectedIdentity: `${parsed.prefix} ${parsed.number} ${parsed.biennium}`,
      citation,
      retrievedAt,
    }),
  );
}

export async function search(
  _env: Env,
  criteria: DemoSearchCriteria,
): Promise<DemoSearchResponse> {
  const policy = await readWashington(criteria.query);
  return {
    ok: true,
    source: "washington",
    query: criteria.query,
    total: 1,
    page: 1,
    results: [policy.citation],
    retrievedAt: policy.receipt.retrievedAt,
    criteria,
    continuation: { kind: "stopped", reason: "not_applicable" },
  } satisfies DemoSearchResponse;
}

export async function read(query: string) {
  return readWashington(query);
}
