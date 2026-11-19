// @vitest-environment node
// Release check of the Grants.gov source (2026-11-18). One live probe of the
// deployed Worker found the opportunity read naming a person (name and job title)
// as the issuing body, because synopsis.agencyName is free text. These tests keep
// the trimmed live shape with synthetic values. No live call: fetch is stubbed.
import { afterEach, describe, expect, it, vi } from "vitest";
import { grantsDetailValue } from "../../src/demo/grants-authority";
import { searchCriteria } from "../../src/demo/search-contract";
import { searchValue } from "../../src/demo/validation";
import "../../worker/src/index"; // registers the allowed official hosts
import * as grantsDetail from "../../worker/src/sources/grants-detail";
import * as grants from "../../worker/src/sources/grants";

// The live fetchOpportunity shape (trimmed): the synopsis agencyName held a
// person's name and title; the agency table entry named the agency.
const LIVE_DETAIL = {
  errorcode: 0,
  msg: "Webservice Succeeds",
  data: {
    id: 990002,
    opportunityNumber: "SYN-OPP-2099-0002",
    opportunityTitle: "Synthetic Climate Program FY 2099",
    owningAgencyCode: "SYN-AG-ERA",
    docType: "synopsis",
    synopsis: {
      agencyCode: "SYN-AG-ERA",
      agencyName: "Synthetic Person Grants Management Specialist",
      synopsisDesc: "<p>Awards are made at the agency's discretion.</p>",
      responseDateStr: "2099-02-09-00-00-00",
      postingDateStr: "2098-10-27-00-00-00",
      lastUpdatedDate: "Nov 04, 2098 10:11:12 AM EST",
    },
    agencyDetails: {
      agencyName: "SYN Agency - ERA Production",
      agencyCode: "SYN-AG-ERA",
    },
    cfdas: [{ cfdaNumber: "99.431", programTitle: "Synthetic Research" }],
  },
};

// The live search2 shape (trimmed): a posted hit, an old hit with no closing
// date, and a forecast.
const LIVE_SEARCH = {
  errorcode: 0,
  data: {
    hitCount: 3,
    oppHits: [
      {
        id: "990002",
        number: "SYN-OPP-2099-0002",
        title: "Synthetic Climate Program FY 2099",
        agencyCode: "SYN-AG-ERA",
        agency: "SYN Agency - ERA Production",
        openDate: "10/27/2098",
        closeDate: "02/09/2099",
        oppStatus: "posted",
        docType: "synopsis",
        cfdaList: ["99.431"],
      },
      {
        id: "990003",
        number: "SYN-OPP-2090-0003",
        title: "Synthetic Old Program",
        agencyCode: "SYN-AG",
        agency: "Synthetic Department",
        openDate: "07/06/2090",
        closeDate: "",
        oppStatus: "posted",
        docType: "synopsis",
        cfdaList: [],
      },
      {
        id: "990004",
        number: "SYN-FC-2099-0004",
        title: "Synthetic Forecast",
        agencyCode: "SYN-AG",
        agency: "Synthetic Service",
        openDate: "09/10/2098",
        closeDate: "",
        oppStatus: "forecasted",
        docType: "forecast",
        cfdaList: [],
      },
    ],
  },
};

function answer(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Grants.gov release check", () => {
  it("names the agency, never the free-text synopsis agencyName", async () => {
    answer(LIVE_DETAIL);
    const out = await grantsDetail.read("990002");
    expect(out.citation.issuingBody).toBe("SYN Agency - ERA Production");
    expect(JSON.stringify(out)).not.toContain("Synthetic Person");
    expect(grantsDetailValue(JSON.parse(JSON.stringify(out)))).toEqual(out);
  });

  it("falls back to the owning agency code, then to Not stated, without the synopsis text", async () => {
    answer({
      ...LIVE_DETAIL,
      data: { ...LIVE_DETAIL.data, agencyDetails: {} },
    });
    let out = await grantsDetail.read("990002");
    expect(out.citation.issuingBody).toBe("SYN-AG-ERA");
    answer({
      ...LIVE_DETAIL,
      data: {
        ...LIVE_DETAIL.data,
        agencyDetails: undefined,
        owningAgencyCode: undefined,
      },
    });
    out = await grantsDetail.read("990002");
    expect(out.citation.issuingBody).toBe("Not stated");
  });

  it("reads the live detail dates and listing as stated, with no passage when none is headed", async () => {
    answer(LIVE_DETAIL);
    const out = await grantsDetail.read("990002");
    expect(out.authority).toBe("none");
    expect(out.citation).toMatchObject({
      date: "2098-10-27",
      applicationsCloseOn: "2099-02-09",
      versionDate: "2098-11-04",
      assistanceListings: [{ number: "99.431", title: "Synthetic Research" }],
    });
  });

  it("gives the search row and the opened record the same agency, dates and address", async () => {
    answer(LIVE_SEARCH);
    const criteria = searchCriteria("grants", "climate", 1, {
      dateFrom: null,
      dateTo: null,
      continuation: null,
      version: 2,
    });
    const found = await grants.search({}, criteria);
    expect(
      searchValue(JSON.parse(JSON.stringify(found)), "grants", "climate", 1, {
        dateFrom: null,
        dateTo: null,
        continuation: null,
        version: 2,
      }),
    ).toEqual(found);
    // An empty closing date stays absent; a forecast shows no closing date.
    expect(found.results.map((r) => r.applicationsCloseOn)).toEqual([
      "2099-02-09",
      undefined,
      undefined,
    ]);
    expect(found.results.map((r) => r.kind)).toEqual([
      "Funding opportunity",
      "Funding opportunity",
      "Forecast",
    ]);
    answer(LIVE_DETAIL);
    const opened = await grantsDetail.read("990002");
    const row = found.results[0];
    for (const key of [
      "identifier",
      "title",
      "issuingBody",
      "kind",
      "date",
      "officialUrl",
      "applicationsCloseOn",
    ] as const)
      expect(opened.citation[key]).toEqual(row[key]);
  });
});
