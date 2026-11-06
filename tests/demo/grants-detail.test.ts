// @vitest-environment node
// The Grants.gov opportunity read in the Worker: one keyless fetchOpportunity
// call, and a positive allowlist so no contact data reaches the answer
// (design section 3 T1.4; section 1 rule 7). No live call: fetch is stubbed.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { grantsDetailValue } from "../../src/demo/grants-authority";
import { ALLOWED_HOSTS } from "../../worker/src/index";
import * as grantsDetail from "../../worker/src/sources/grants-detail";

const RAW = readFileSync(
  new URL(
    "./fixtures/grants/fetch-opportunity.synthetic.json",
    import.meta.url,
  ),
  "utf8",
);
const BODY = JSON.parse(RAW) as { data: Record<string, unknown> };
let sent: { url: string; init?: RequestInit }[] = [];

function answer(body: unknown, status = 200) {
  sent = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string, init?: RequestInit) => {
      sent.push({ url: String(input), init });
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Grants.gov opportunity read", () => {
  it("uses only the already allowlisted host", () => {
    expect(grantsDetail.HOSTS).toEqual(["api.grants.gov"]);
    expect(ALLOWED_HOSTS.has("api.grants.gov")).toBe(true);
  });

  it("sends one fetchOpportunity POST with the numeric id", async () => {
    answer(BODY);
    await grantsDetail.read("990001");
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe("https://api.grants.gov/v1/api/fetchOpportunity");
    expect(sent[0].init?.method).toBe("POST");
    expect(JSON.parse(String(sent[0].init?.body))).toEqual({
      opportunityId: 990001,
    });
  });

  it("refuses an id that is not a Grants.gov opportunity id, without a call", async () => {
    answer(BODY);
    for (const id of ["", "0", "12a", "1".repeat(13), "../x"])
      await expect(grantsDetail.read(id)).rejects.toMatchObject({
        httpStatus: 400,
      });
    expect(sent).toHaveLength(0);
  });

  it("keeps only allowlisted fields: a response full of contact data yields none of it", async () => {
    answer(BODY);
    const out = await grantsDetail.read("990001");
    const text = JSON.stringify(out);
    for (const leaked of [
      "Alex Sample",
      "example.org",
      "555",
      "Example Way",
      "Sampletown",
      "synthetic-publisher",
      "synthetic-token",
      "Changed by",
      "Edited by",
      "eligibility text",
      "Synthetic notice",
      "Dropped",
    ])
      expect(text).not.toContain(leaked);
    expect(out).toEqual({
      ok: true,
      source: "grants",
      authority: "found",
      citation: {
        sourceId: "grants",
        identifier: "SYN-OPP-2099-0001",
        title: "Synthetic Resilience Planning – Example Program",
        issuingBody: "Synthetic Agency for Examples",
        kind: "Funding opportunity",
        date: "2099-01-10",
        officialUrl: "https://www.grants.gov/search-results-detail/990001",
        textUrl: null,
        retrievedAt: expect.any(String),
        summary: null,
        textAvailable: false,
        matchKey: null,
        applicationsCloseOn: "2099-03-15",
        assistanceListings: [
          { number: "99.001", title: "Synthetic Example Program" },
        ],
        authorityPassage: {
          text: "Awards are made through Pub. L. 93–638, P. L. 117-58, 25 U.S.C. 5304(l), 25 U.S.C. 5301 et. seq., and section 4 of the Act.",
          heading: "AUTHORITIES",
          locator: 'Grants.gov synopsis description, heading "AUTHORITIES"',
        },
        versionDate: "2099-02-02",
      },
    });
    // The page's own check accepts the Worker's answer unchanged.
    expect(grantsDetailValue(JSON.parse(text))).toEqual(JSON.parse(text));
  });

  it("states no passage when the synopsis has no Authority heading", async () => {
    const data = BODY.data;
    answer({
      ...BODY,
      data: {
        ...data,
        synopsis: {
          ...(data.synopsis as object),
          synopsisDesc: "<p>Funds are made through 25 U.S.C. 13.</p>",
        },
      },
    });
    const out = await grantsDetail.read("990001");
    expect(out.authority).toBe("none");
    expect(out.citation.authorityPassage).toBeUndefined();
  });

  it("withholds a passage the personal-pattern guard flags", async () => {
    const data = BODY.data;
    answer({
      ...BODY,
      data: {
        ...data,
        synopsis: {
          ...(data.synopsis as object),
          synopsisDesc:
            "<p>Authority: 25 U.S.C. 13, see Dr. Alex Sample at someone@example.org</p>",
        },
      },
    });
    const out = await grantsDetail.read("990001");
    expect(out.authority).toBe("withheld");
    expect(JSON.stringify(out)).not.toContain("example.org");
  });

  it("gives a forecast no application closing date", async () => {
    answer({ ...BODY, data: { ...BODY.data, docType: "forecast" } });
    const out = await grantsDetail.read("990001");
    expect(out.citation.kind).toBe("Forecast");
    expect(out.citation.applicationsCloseOn).toBeUndefined();
    expect(out.citation.date).toBeNull();
  });

  it("treats a Grants.gov error answer and a non-200 status as upstream failures", async () => {
    answer({ errorcode: 1, msg: "error" });
    await expect(grantsDetail.read("990001")).rejects.toMatchObject({
      code: "bad_upstream",
    });
    answer({}, 500);
    await expect(grantsDetail.read("990001")).rejects.toMatchObject({
      code: "upstream_error",
    });
  });
});
