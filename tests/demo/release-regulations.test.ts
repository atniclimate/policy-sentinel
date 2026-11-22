// @vitest-environment node
// Release check for Regulations.gov (2026-11-18): the shapes and failures seen
// through the deployed demo Worker, replayed with synthetic values only.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REGULATIONS_V2_CONFIRMED } from "../../src/demo/search-contract";
import worker from "../../worker/src/index";
import { regulationsCloseDate } from "../../worker/src/sources/regulations";

it.each([
  "2099-03-02T99:59:59-05:00",
  "2099-03-02T23:99:59-05:00",
  "2099-03-02T23:59:99-05:00",
  "2099-03-02T23:59:59-99:00",
  "2099-03-02T23:59:59-05:99",
])("withholds malformed comment deadline %s", (value) => {
  expect(regulationsCloseDate(value)).toBeUndefined();
});

const ORIGIN = "http://localhost:5211";
const keyed = { DATA_GOV_API_KEY: "synthetic-key" };
let visitor = 0;
let upstreamUrls: string[] = [];

/** The page's search: a POST of the criteria as JSON (demo/api.ts). */
const search = (body: Record<string, string>) =>
  worker.fetch(
    new Request("https://demo.example/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: ORIGIN,
        "cf-connecting-ip": `2001:db8::${(++visitor).toString(16)}`,
      },
      body: JSON.stringify({
        source: "regulations",
        q: "synthetic words",
        page: "1",
        searchVersion: "2",
        ...body,
      }),
    }),
    keyed,
  );

const installFetch = (make: (url: string) => Response | Promise<Response>) => {
  upstreamUrls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string) => {
      upstreamUrls.push(String(input));
      return make(String(input));
    }),
  );
};

const reply = (body: object) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

/** The live row shape (2026-11-19): attributes the Worker reads, plus provider extras it must not pass on. */
const liveRow = {
  type: "documents",
  id: "EX-2099-0007-0001",
  attributes: {
    title: "Synthetic notice title",
    agencyId: "EX",
    documentType: "Notice",
    postedDate: "2099-01-05T05:00:00Z",
    frDocNum: "2099-00001",
    docketId: "EX-2099-0007",
    commentEndDate: "2099-03-03T04:59:59Z",
    openForComment: true,
    submitterName: "Synthetic Person",
    comment: "Synthetic comment text",
  },
};

beforeEach(() => {
  const entries = new Map<string, Response>();
  vi.stubGlobal("caches", {
    default: {
      match: vi.fn(async (req: Request) => entries.get(req.url)?.clone()),
      put: vi.fn(async (req: Request, res: Response) => {
        entries.set(req.url, res.clone());
      }),
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Regulations.gov release check", () => {
  it("answers a v2 words search with the citation fields only, and no docket or comment field while the lookup is held", async () => {
    installFetch(() =>
      reply({ data: [liveRow], meta: { totalElements: 86172 } }),
    );
    const res = await search({ q: "tribal consultation" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(
      [
        "continuation",
        "criteria",
        "ok",
        "page",
        "query",
        "results",
        "retrievedAt",
        "source",
        "total",
      ].sort(),
    );
    expect(body.total).toBe(86172);
    expect(body.continuation).toMatchObject({ kind: "more" });
    const [row] = body.results;
    expect(Object.keys(row).sort()).toEqual(
      [
        "date",
        "identifier",
        "issuingBody",
        "kind",
        "matchKey",
        "officialUrl",
        "retrievedAt",
        "sourceId",
        "summary",
        "textAvailable",
        "textUrl",
        "title",
        ...(REGULATIONS_V2_CONFIRMED
          ? ["commentsCloseWithheld", "docketIds"]
          : []),
      ].sort(),
    );
    expect(row).toMatchObject({
      sourceId: "regulations",
      identifier: "EX-2099-0007-0001",
      date: "2099-01-05",
      officialUrl: "https://www.regulations.gov/document/EX-2099-0007-0001",
      textUrl: null,
      summary: null,
      textAvailable: false,
      matchKey: "fr:2099-00001",
    });
    // No submitter, comment text or open-for-comment flag is kept (safeguard 5).
    expect(JSON.stringify(body)).not.toMatch(/Synthetic (Person|comment)/);
  });

  it("passes a quoted phrase to the provider as typed, in one call", async () => {
    installFetch(() => reply({ data: [], meta: { totalElements: 0 } }));
    const phrase = '"Synthetic Phrase of Words"';
    const res = await search({ q: phrase });
    expect(res.status).toBe(200);
    expect(upstreamUrls).toHaveLength(1);
    expect(
      new URL(upstreamUrls[0]).searchParams.get("filter[searchTerm]"),
    ).toBe(phrase);
  });

  it("answers an upstream timeout as an error that says the source did not finish, never as an empty result", async () => {
    installFetch(() => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    });
    const res = await search({ q: '"Synthetic Phrase of Words"' });
    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: false,
      error: "upstream_unreachable",
      status: "error",
      message:
        "The official source did not finish answering. Try again in a moment.",
    });
    expect(body).not.toHaveProperty("results");
    expect(body).not.toHaveProperty("total");
    // One call; the Worker never retries on its own.
    expect(upstreamUrls).toHaveLength(1);
  });

  it("answers a stopped body read the same way", async () => {
    installFetch(
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new DOMException("aborted", "AbortError"));
            },
          }),
        ),
    );
    const res = await search({ q: "synthetic words" });
    expect(res.status).toBe(504);
    expect(await res.json()).toMatchObject({
      ok: false,
      error: "upstream_unreachable",
    });
  });

  it("holds the docket lookup while the flag is off, with no provider call", async () => {
    if (REGULATIONS_V2_CONFIRMED) return;
    installFetch(() => reply({ data: [], meta: { totalElements: 0 } }));
    const res = await search({ q: "EX-2099-0001", match: "docket" });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      ok: false,
      error: "unsupported_criteria",
      message:
        "The demo does not look up that kind of identifier on this source.",
    });
    expect(upstreamUrls).toHaveLength(0);
  });
});
