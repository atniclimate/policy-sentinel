/** Federal Register: search, and the official text read from GovInfo. */
import { analyzePolicyText } from "../../../src/demo/analyze";
import { authorityLine } from "../../../src/demo/authority-line";
import { parseCfrQuery } from "../../../src/demo/search-contract";
import { citationFields } from "../../../src/demo/validation";
import type {
  DemoCitation,
  DemoSearchCriteria,
  DemoSearchMatch,
  DemoSearchResponse,
} from "../../../src/demo/types";
import {
  DemoError,
  analyzeSafely,
  badUpstream,
  cleanText,
  frMatchKey,
  isoDate,
  numericContinuation,
  officialFetch,
  parseJson,
  policyV3,
  record,
  requiredText,
  resultCount,
  resultRows,
} from "./shared";
import type { Env, Loose } from "./shared";

/** Exact hosts this source calls: the search API and the GovInfo HTML text it reads. */
export const HOSTS: readonly string[] = [
  "www.federalregister.gov",
  "www.govinfo.gov",
];

/** A Federal Register document number the demo can read; one rule for search, read and cache. */
const FR_DOCUMENT_NUMBER = /^(?:\d{2}|\d{4})-\d{4,6}$/;

/** Whether the demo reads this id's text, for routing's cache-identity check. */
export function isDocumentNumber(id: string): boolean {
  return FR_DOCUMENT_NUMBER.test(id);
}

const FR_FIELDS = [
  "document_number",
  "title",
  "type",
  "agencies",
  "publication_date",
  "html_url",
  "abstract",
  "citation",
];
// Requested only on search contract v2; shapes recorded by the 2026-10-20 probe.
const FR_FIELDS_V2 = [
  ...FR_FIELDS,
  "comments_close_on",
  "docket_ids",
  "regulation_id_numbers",
  "cfr_references",
  "topics",
];

// Requested only on policy reads with version=3.
const FR_FIELDS_V3 = [...FR_FIELDS, "correction_of", "corrections"];
// The API states each as a document's API address (fixtures/sources/federal-register).
const FR_DOC_API =
  /^https:\/\/www\.federalregister\.gov\/api\/v1\/documents\/([A-Za-z0-9-]{4,24})(?:\.json)?$/;

/** The document number in a correction field; null for any other value. */
function frDocNumber(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = FR_DOC_API.exec(value)?.[1] ?? value;
  return /^[A-Za-z0-9-]{4,24}$/.test(id) ? id : null;
}

/** correctionOf and corrections as document numbers; a malformed value is dropped. */
function frCorrections(
  doc: Loose,
): Pick<DemoCitation, "correctionOf" | "corrections"> {
  const of = frDocNumber(doc.correction_of);
  const list = Array.isArray(doc.corrections)
    ? doc.corrections
        .slice(0, 50)
        .map(frDocNumber)
        .filter((id): id is string => id !== null)
    : [];
  return {
    ...(of !== null && { correctionOf: of }),
    ...(list.length > 0 && { corrections: list }),
  };
}

function frCitation(
  value: unknown,
  retrievedAt: string,
  v2 = false,
): DemoCitation {
  const doc = record(value);
  const id = doc.document_number;
  if (typeof id !== "string" || !/^[A-Za-z0-9-]{4,24}$/.test(id))
    throw badUpstream();
  if (doc.agencies !== undefined && !Array.isArray(doc.agencies))
    throw badUpstream();
  const agencies = ((doc.agencies ?? []) as unknown[])
    .map((value) => {
      const agency = record(value);
      return cleanText(agency.name ?? agency.raw_name, 120);
    })
    .filter(Boolean);
  const citation = cleanText(doc.citation, 60);
  const summary = cleanText(doc.abstract, 500);
  const officialUrl = `https://www.federalregister.gov/d/${id}`;
  const result: DemoCitation = {
    sourceId: "federal-register",
    identifier: citation ? `${citation} (FR Doc. ${id})` : `FR Doc. ${id}`,
    title: requiredText(doc.title, 400),
    issuingBody: agencies.join("; ") || "Not stated",
    kind: cleanText(doc.type, 60) || "Document",
    date: isoDate(doc.publication_date),
    officialUrl,
    textUrl: null,
    retrievedAt,
    summary: summary || null,
    textAvailable: FR_DOCUMENT_NUMBER.test(id),
    matchKey: frMatchKey(id),
  };
  return v2
    ? {
        ...result,
        ...citationFields({
          commentsCloseOn: doc.comments_close_on,
          docketIds: doc.docket_ids,
          rins: doc.regulation_id_numbers,
          cfrRefs: doc.cfr_references,
          topics: doc.topics,
        }),
      }
    : result;
}

/** The FR condition for an identifier search; never a location condition. */
function frMatchConditions(
  match: DemoSearchMatch,
  query: string,
): [string, string][] {
  if (match === "text") return [["conditions[term]", query]];
  if (match === "docket") return [["conditions[docket_id]", query]];
  if (match === "rin") return [["conditions[regulation_id_number]", query]];
  const ref = parseCfrQuery(query);
  if (!ref)
    throw new DemoError("bad_query", "The CFR reference is not valid.", 400);
  return [
    ["conditions[cfr][title]", String(ref.title)],
    ["conditions[cfr][part]", ref.part],
  ];
}

async function searchFederalRegister(
  criteria: DemoSearchCriteria,
): Promise<DemoSearchResponse> {
  const { query, page, dateFrom, dateTo } = criteria;
  const v2 = criteria.version === 2;
  const url = new URL("https://www.federalregister.gov/api/v1/documents.json");
  for (const [name, value] of frMatchConditions(
    v2 ? criteria.match : "text",
    query,
  ))
    url.searchParams.set(name, value);
  url.searchParams.set("per_page", "10");
  url.searchParams.set("page", String(page));
  url.searchParams.set(
    "order",
    criteria.sort === "newest" ? "newest" : "relevance",
  );
  if (dateFrom !== null && dateTo !== null) {
    url.searchParams.set("conditions[publication_date][gte]", dateFrom);
    url.searchParams.set("conditions[publication_date][lte]", dateTo);
  }
  if (v2 && criteria.documentType !== null)
    url.searchParams.set("conditions[type][]", criteria.documentType);
  for (const f of v2 ? FR_FIELDS_V2 : FR_FIELDS)
    url.searchParams.append("fields[]", f);
  const { response, bytes } = await officialFetch(url.href);
  if (!response.ok) {
    throw new DemoError(
      "upstream_error",
      `The Federal Register answered with status ${response.status}.`,
    );
  }
  const data = record(parseJson(bytes));
  const retrievedAt = new Date().toISOString();
  // The Federal Register omits `results` when nothing matches: {"count":0}.
  const rows =
    data.results === undefined && data.count === 0 ? [] : data.results;
  const results = resultRows(rows).map((doc) =>
    frCitation(doc, retrievedAt, v2),
  );
  const total = resultCount(data.count);
  return {
    ok: true,
    source: "federal-register",
    query,
    total,
    page,
    results,
    retrievedAt,
    criteria,
    continuation: numericContinuation(criteria, total, results.length),
  };
}

async function readFederalRegister(id: string, v3: boolean) {
  if (!FR_DOCUMENT_NUMBER.test(id)) {
    throw new DemoError(
      "text_unavailable",
      "The demo reads documents numbered like 2026-01899. Open this one at the official source.",
      422,
    );
  }
  const meta = new URL(
    `https://www.federalregister.gov/api/v1/documents/${id}.json`,
  );
  for (const f of v3 ? FR_FIELDS_V3 : FR_FIELDS)
    meta.searchParams.append("fields[]", f);
  const { response, bytes } = await officialFetch(meta.href);
  if (response.status === 404) {
    throw new DemoError(
      "not_found",
      "No Federal Register document has that number.",
      404,
    );
  }
  if (!response.ok) {
    throw new DemoError(
      "upstream_error",
      `The Federal Register answered with status ${response.status}.`,
    );
  }
  const doc = record(parseJson(bytes));
  if (doc.document_number !== id) throw badUpstream();
  const retrievedAt = new Date().toISOString();
  const citation = frCitation(doc, retrievedAt);
  if (!citation.date) {
    throw new DemoError(
      "bad_upstream",
      "The Federal Register record lacked a publication date.",
    );
  }
  const textUrl = `https://www.govinfo.gov/content/pkg/FR-${citation.date}/html/${id}.htm`;
  const text = await officialFetch(textUrl, {
    headers: { Accept: "text/html" },
  });
  if (text.response.status === 404) {
    throw new DemoError(
      "text_unavailable",
      "GovInfo has no HTML text for this document yet. Open it at the official source.",
      404,
    );
  }
  if (!text.response.ok) {
    throw new DemoError(
      "upstream_error",
      `GovInfo answered with status ${text.response.status}.`,
    );
  }
  const analysis = analyzeSafely(() =>
    analyzePolicyText({
      bytes: text.bytes,
      mediaType: text.response.headers.get("content-type") ?? "text/html",
      sourceKind: "govinfo_fr",
      textUrl,
      expectedIdentity: id,
      citation,
      retrievedAt,
    }),
  );
  return v3
    ? policyV3(analysis, {
        ...frCorrections(doc),
        ...authorityLine(analysis.blocks),
      })
    : analysis.policy;
}

export async function search(
  _env: Env,
  criteria: DemoSearchCriteria,
): Promise<DemoSearchResponse> {
  return searchFederalRegister(criteria);
}

/** `v3` adds the version 3 fields and chain rows; without it the answer is unchanged. */
export async function read(id: string, v3 = false) {
  return readFederalRegister(id, v3);
}
