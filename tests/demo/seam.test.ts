// @vitest-environment node
// The seam between the Worker and the page: what the Worker answers has to pass
// the page's own validation, and merge the way the page merges it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ieeeReference, SOURCE_LABELS } from "../../src/demo/citations";
import { mergeResults } from "../../src/demo/merge";
import {
  policyId,
  policyValue,
  searchValue,
  sourcesValue,
} from "../../src/demo/validation";
import worker from "../../worker/src/index";
import { FR_DOC_NUMBER, FR_HTML, FR_SEARCH_JSON, WA_HTML } from "./fixtures";

const ORIGIN = "https://atniclimate.github.io";
const keyed = { DATA_GOV_API_KEY: "synthetic-key" };
let visitor = 0;

const reply = (body: string | object, type = "application/json") =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status: 200,
    headers: { "content-type": type },
  });

/** One request to the Worker as the page makes it; the page validates the JSON it gets back. */
const call = async (path: string, params: Record<string, string> = {}) => {
  const res = await worker.fetch(
    new Request(`https://demo.example${path}?${new URLSearchParams(params)}`, {
      headers: {
        Origin: ORIGIN,
        "cf-connecting-ip": `2001:db8:5ea::${(++visitor).toString(16)}`,
      },
    }),
    keyed,
  );
  expect(res.status, path).toBe(200);
  return (await res.json()) as unknown;
};

// One synthetic Federal Register document as three federal sources list it,
// each beside a record of its own, and one synthetic Washington bill.
beforeEach(() => {
  const entries = new Map<string, Response>();
  vi.stubGlobal("caches", {
    default: {
      match: async (req: Request) => entries.get(req.url)?.clone(),
      put: async (req: Request, res: Response) => {
        entries.set(req.url, res.clone());
      },
    },
  });
  const routes: Record<string, () => Response> = {
    "documents.json": () => reply(FR_SEARCH_JSON),
    [`/documents/${FR_DOC_NUMBER}.json`]: () =>
      reply(FR_SEARCH_JSON.results[0]),
    [`/html/${FR_DOC_NUMBER}.htm`]: () => reply(FR_HTML, "text/html"),
    "api.govinfo.gov": () =>
      reply({
        count: 2,
        results: [
          {
            title: "The same document, as GovInfo lists it",
            packageId: "FR-2099-01-05",
            granuleId: FR_DOC_NUMBER,
            collectionCode: "FR",
            dateIssued: "2099-01-05",
          },
          {
            title: "A committee report",
            packageId: "CRPT-999hrpt1",
            collectionCode: "CRPT",
          },
        ],
      }),
    "api.regulations.gov": () =>
      reply({
        data: [
          {
            id: "EX-2099-0001-0001",
            attributes: {
              title: "The same document, as the docket lists it",
              frDocNum: FR_DOC_NUMBER,
              documentType: "Proposed Rule",
              postedDate: "2099-01-05T05:00:00Z",
              agencyId: "EX",
            },
          },
          {
            id: "EX-2099-0001-0002",
            attributes: { title: "Supporting material", frDocNum: null },
          },
        ],
        meta: { totalElements: 2 },
      }),
    "lawfilesext.leg.wa.gov": () => reply(WA_HTML, "text/html"),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string) => {
      const url = String(input);
      for (const [needle, make] of Object.entries(routes))
        if (url.includes(needle)) return make();
      return new Response("not routed", { status: 404 });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("Worker answers pass the page's validation and merge", () => {
  it("lists every source under the one name the documents use for it", async () => {
    const sources = sourcesValue(await call("/api/sources"));
    expect(Object.fromEntries(sources.map((s) => [s.id, s.label]))).toEqual(
      SOURCE_LABELS,
    );
  });

  it("merges one Federal Register document found by three sources into one row, the Federal Register record first", async () => {
    const batches = [];
    // The page asks each checked source on its own and merges what passes validation.
    for (const source of ["regulations", "govinfo", "federal-register"]) {
      const answer = searchValue(
        await call("/api/search", { source, q: "water" }),
        source,
        "water",
        1,
      );
      batches.push({ sourceId: source, results: answer.results });
    }
    const { results, merged } = mergeResults(batches);
    expect(results[0].citation).toMatchObject({
      sourceId: "federal-register",
      matchKey: `fr:${FR_DOC_NUMBER}`,
    });
    expect(results[0].alternates.map((a) => a.sourceId)).toEqual([
      "govinfo",
      "regulations",
    ]);
    expect(merged).toBe(2);
    // The records each source lists on its own stay rows of their own.
    expect(results.slice(1).map((row) => row.citation.identifier)).toEqual([
      "CRPT-999hrpt1",
      "EX-2099-0001-0002",
    ]);
    for (const row of results)
      expect(ieeeReference(row.citation)).toContain(row.citation.officialUrl);
  });

  it.each([
    ["federal-register", "water", `fr:${FR_DOC_NUMBER}`],
    ["washington", "HB 1100", null],
  ])(
    "reads the %s policy a search returned, by the id the page derives from it",
    async (source, q, matchKey) => {
      const found = searchValue(
        await call("/api/search", { source, q }),
        source,
        q,
        1,
      ).results[0];
      const id = policyId(found);
      const policy = policyValue(await call("/api/policy", { source, id }), {
        source,
        id,
      });
      expect(policy.citation).toMatchObject({
        identifier: found.identifier,
        matchKey,
      });
      expect(policy.issues.length).toBeGreaterThan(0);
    },
  );
});
