// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { COPY } from "../../src/demo/copy";
import {
  buildPlan,
  laneOptions,
  laneSignature,
} from "../../src/demo/discovery";
import { buildDocument } from "../../src/demo/document";
import { emptyActors, reportEntries } from "../../src/demo/report-state";
import type { ReportState } from "../../src/demo/report-state";
import {
  searchCriteria,
  unifiedAgendaUrl,
} from "../../src/demo/search-contract";
import type { DemoCitation, DemoSearchOptions } from "../../src/demo/types";
import { keyOf, searchValue, sourcesValue } from "../../src/demo/validation";
import worker, { ALLOWED_HOSTS, sourceList } from "../../worker/src/index";
import { GRANTS_LIVE_ANY, GRANTS_LIVE_TRIBAL } from "./fixtures";

const ORIGIN = "https://atniclimate.github.io";
let sent: { url: string; init?: RequestInit }[] = [];
let visitor = 0;

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

const call = (params: Record<string, string>) =>
  worker.fetch(
    new Request(
      `https://demo.example/api/search?${new URLSearchParams({ source: "grants", q: "climate", ...params })}`,
      {
        headers: {
          Origin: ORIGIN,
          "cf-connecting-ip": `2001:db8::9${(++visitor).toString(16)}`,
        },
      },
    ),
    {},
  );

const v2 = (extra: Partial<DemoSearchOptions> = {}): DemoSearchOptions => ({
  dateFrom: null,
  dateTo: null,
  continuation: null,
  version: 2,
  ...extra,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Grants.gov in the Worker", () => {
  it("is an exact allowlisted host and a live federal source with no key", () => {
    expect(ALLOWED_HOSTS.has("api.grants.gov")).toBe(true);
    expect(ALLOWED_HOSTS.has("www.grants.gov")).toBe(false);
    const grants = sourceList({}).find((s) => s.id === "grants");
    expect(grants).toMatchObject({
      label: "Grants.gov",
      level: "federal",
      status: "live",
    });
    expect(grants?.secret).toBeUndefined();
    // The page accepts the longer catalog.
    expect(
      sourcesValue({ ok: true, sources: sourceList({}) }).map((s) => s.id),
    ).toContain("grants");
  });

  it("posts the eligibility codes only when the filter is on, and says so on each row", async () => {
    answer(GRANTS_LIVE_TRIBAL);
    const res = await call({ searchVersion: "2", eligibility: "tribal" });
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe("https://api.grants.gov/v1/api/search2");
    expect(sent[0].init?.method).toBe("POST");
    expect(JSON.parse(String(sent[0].init?.body))).toEqual({
      rows: 10,
      keyword: "climate",
      oppStatuses: "forecasted|posted",
      startRecordNum: 0,
      eligibilities: "07|11",
    });
    const body = await res.json();
    const options = v2({ eligibility: "tribal" });
    expect(body.criteria).toEqual(
      searchCriteria("grants", "climate", 1, options),
    );
    expect(body.total).toBe(9);
    const [open, closing] = body.results as DemoCitation[];
    expect(open).toEqual({
      sourceId: "grants",
      identifier: "EDA-DISASTER-2023",
      title: "FY 2023 Disaster Supplemental",
      issuingBody: "Economic Development Administration",
      kind: "Funding opportunity",
      date: "2023-04-24",
      officialUrl: "https://www.grants.gov/search-results-detail/347414",
      textUrl: null,
      retrievedAt: body.retrievedAt,
      summary: null,
      textAvailable: false,
      matchKey: null,
      listedEligibility: "tribal",
    });
    // An empty closeDate stays absent; a stated one converts exactly.
    expect("applicationsCloseOn" in open).toBe(false);
    expect(closing.applicationsCloseOn).toBe("2026-11-04");
    expect(closing.date).toBe("2026-08-27");
    // The page validates the answer against its own request.
    const page = searchValue(body, "grants", "climate", 1, options);
    expect(page.results.map((r) => r.listedEligibility)).toEqual([
      "tribal",
      "tribal",
    ]);
    expect(body.continuation.kind).toBe("stopped");
  });

  it("sends no eligibility without the filter, maps a forecast, and pages by record number", async () => {
    answer(GRANTS_LIVE_ANY);
    const first = await call({ searchVersion: "2" });
    const body = await first.json();
    expect(JSON.parse(String(sent[0].init?.body))).toEqual({
      rows: 10,
      keyword: "climate",
      oppStatuses: "forecasted|posted",
      startRecordNum: 0,
    });
    expect(body.criteria.eligibility).toBeNull();
    const [forecast, posted] = body.results as DemoCitation[];
    expect(forecast.kind).toBe("Forecast");
    expect(forecast.listedEligibility).toBeUndefined();
    expect(forecast.applicationsCloseOn).toBeUndefined();
    expect(posted.applicationsCloseOn).toBe("2030-10-14");
    // A forecast's stated date is an estimate, never "Applications close".
    const [dated] = GRANTS_LIVE_ANY.data.oppHits;
    answer({
      ...GRANTS_LIVE_ANY,
      data: { hitCount: 1, oppHits: [{ ...dated, closeDate: "11/04/2026" }] },
    });
    const estimated = await (await call({ searchVersion: "2" })).json();
    expect(estimated.results[0].kind).toBe("Forecast");
    expect(estimated.results[0].applicationsCloseOn).toBeUndefined();
    // Source wording is kept as Grants.gov wrote it.
    // Grants.gov sends entities as text; the row shows the character.
    expect(posted.title).toContain("Program– Scholarship");
    expect(body.continuation.kind).toBe("more");
    answer(GRANTS_LIVE_ANY);
    const next = await call({
      searchVersion: "2",
      page: "2",
      continuation: JSON.stringify(body.continuation.next),
    });
    expect(next.status).toBe(200);
    expect(JSON.parse(String(sent[0].init?.body)).startRecordNum).toBe(10);
  });

  it("never passes on fields it does not whitelist", async () => {
    const hit = {
      ...GRANTS_LIVE_ANY.data.oppHits[1],
      agencyContactName: "Pat Example",
      agencyContactEmail: "pat@example.gov",
      agencyContactPhone: "555-0100",
    };
    answer({
      ...GRANTS_LIVE_ANY,
      token: "t",
      data: { hitCount: 1, oppHits: [hit] },
    });
    const text = await (await call({ searchVersion: "2" })).text();
    expect(text).not.toMatch(
      /Pat Example|pat@example\.gov|555-0100|agencyContact/,
    );
  });

  it.each([
    ["an ISO open date", { openDate: "2026-10-01" }],
    ["an impossible close date", { closeDate: "02/30/2026" }],
    ["a non-numeric id", { id: "abc" }],
    ["a numeric id", { id: 347414 }],
    ["no title", { title: "" }],
    ["an untrimmed number", { number: " EDA-1" }],
  ])("refuses a row with %s", async (_label, change) => {
    answer({
      errorcode: 0,
      data: {
        hitCount: 1,
        oppHits: [{ ...GRANTS_LIVE_TRIBAL.data.oppHits[1], ...change }],
      },
    });
    const res = await call({ searchVersion: "2" });
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: "bad_upstream" });
  });

  it("reports a Grants.gov error answer as an outage, not as no results", async () => {
    answer({ errorcode: 1, msg: "fail", data: {} });
    const res = await call({ searchVersion: "2" });
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: "upstream_error" });
  });

  it.each([
    ["eligibility on v1", { eligibility: "tribal" }, "bad_query"],
    [
      "another eligibility value",
      { searchVersion: "2", eligibility: "07" },
      "bad_query",
    ],
    [
      "a date range",
      { searchVersion: "2", dateFrom: "2026-01-01", dateTo: "2026-02-01" },
      "unsupported_criteria",
    ],
    [
      "a type filter",
      { searchVersion: "2", documentType: "RULE" },
      "unsupported_criteria",
    ],
  ])("refuses %s before calling out", async (_label, params, code) => {
    answer(GRANTS_LIVE_ANY);
    const res = await call(params);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(code);
    expect(sent).toHaveLength(0);
  });

  it("refuses the eligibility filter on any other source", () => {
    expect(() =>
      searchCriteria(
        "federal-register",
        "climate",
        1,
        v2({ eligibility: "tribal" }),
      ),
    ).toThrow(/Grants.gov only/);
    // Other sources' v2 echo carries no eligibility key.
    expect(
      Object.keys(searchCriteria("federal-register", "climate", 1, v2())),
    ).not.toContain("eligibility");
  });
});

describe("Grants.gov on the page", () => {
  it("rejects a row that claims the filter when the filter was not sent", () => {
    const body = {
      ok: true,
      source: "grants",
      query: "climate",
      page: 1,
      total: 1,
      retrievedAt: "2099-01-07T11:59:00.000Z",
      criteria: searchCriteria("grants", "climate", 1, v2()),
      continuation: { kind: "stopped", reason: "complete" },
      results: [
        {
          sourceId: "grants",
          identifier: "EX-1",
          title: "Example",
          issuingBody: "Example",
          kind: "Funding opportunity",
          date: null,
          officialUrl: "https://www.grants.gov/search-results-detail/1",
          textUrl: null,
          retrievedAt: "2099-01-07T11:59:00.000Z",
          summary: null,
          textAvailable: false,
          matchKey: null,
          listedEligibility: "tribal",
        },
      ],
    };
    expect(() => searchValue(body, "grants", "climate", 1, v2())).toThrow(
      /eligibility/,
    );
  });

  it("sends the filter to Grants.gov lanes only, keeps it in the cache key, and skips a dated Grants.gov lane", () => {
    const sources = {
      federal: ["federal-register", "grants"],
      live: ["federal-register", "grants"],
    };
    const dates = {
      dateFrom: null,
      dateTo: null,
      documentType: null,
      eligibility: "tribal" as const,
    };
    const plan = buildPlan(
      { kind: "typed", query: "climate" },
      [{ group: "policy", source: "federal", query: "climate", auto: true }],
      sources,
      dates,
    );
    const [fr, grants] = plan.lanes;
    expect(laneOptions(plan, fr)).not.toHaveProperty("eligibility");
    expect(laneOptions(plan, grants).eligibility).toBe("tribal");
    expect(laneSignature(grants, plan)).not.toBe(
      laneSignature(grants, { ...dates, eligibility: null }),
    );
    const dated = buildPlan(
      { kind: "typed", query: "climate" },
      [{ group: "policy", source: "federal", query: "climate", auto: true }],
      sources,
      { ...dates, dateFrom: "2026-01-01", dateTo: "2026-02-01" },
    );
    expect(dated.lanes[1].skip).toBe("grants_dates");
  });

  it("words the eligibility filter as the filter's statement, with the exact Grants.gov labels", () => {
    const [tribes, organizations] = COPY.grants.labels;
    expect(tribes).toBe(
      "Native American tribal governments (Federally recognized)",
    );
    expect(organizations).toBe(
      "Native American tribal organizations (other than Federally recognized tribal governments)",
    );
    expect(COPY.grants.listedUnder).toContain(`${tribes}; ${organizations}`);
    expect(COPY.grants.listedUnder).toMatch(/at least one of/);
    expect(COPY.grants.listedUnder).toMatch(/does not show which/);
    expect(COPY.grants.limit).toMatch(/not a determination for any Nation/);
    expect(COPY.grants.limit).toMatch(/eligibility section at Grants\.gov/);
    expect(COPY.applicationsClose("2026-11-04", "Grants.gov")).toBe(
      "Applications close 2026-11-04, as stated by Grants.gov.",
    );
  });

  it("puts the required attribution in an export that includes a Grants.gov row, and only then", () => {
    const grantsRow: DemoCitation = {
      sourceId: "grants",
      identifier: "P27AS00032",
      title: "Example opportunity",
      issuingBody: "National Park Service",
      kind: "Funding opportunity",
      date: "2026-08-27",
      officialUrl: "https://www.grants.gov/search-results-detail/363728",
      textUrl: null,
      retrievedAt: "2099-01-07T11:59:00.000Z",
      summary: null,
      textAvailable: false,
      matchKey: null,
      applicationsCloseOn: "2026-11-04",
      listedEligibility: "tribal",
    };
    const report = (citation: DemoCitation): ReportState => ({
      cited: {
        [keyOf(citation)]: { citation, policy: null, note: "", alternates: [] },
      },
      marks: {},
      actors: emptyActors(),
    });
    const texts = (citation: DemoCitation) =>
      buildDocument({
        version: "0.2.0",
        generatedAt: new Date("2099-01-08T12:00:00Z"),
        entries: reportEntries(report(citation)),
        actors: emptyActors(),
      }).blocks.map((block) => ("text" in block ? block.text : ""));
    const withGrants = texts(grantsRow);
    expect(COPY.grants.attribution).toBe(
      "This product uses the Grants.gov API but is not endorsed or certified by the U.S. Department of Health and Human Services.",
    );
    expect(withGrants).toContain(COPY.grants.attribution);
    expect(withGrants).toContain(
      "Applications close 2026-11-04, as stated by Grants.gov.",
    );
    expect(withGrants).toContain(
      `${COPY.grants.listedUnder} ${COPY.grants.limit}`,
    );
    const without = texts({
      ...grantsRow,
      sourceId: "federal-register",
      officialUrl: "https://www.federalregister.gov/d/2099-00001",
      applicationsCloseOn: undefined,
      listedEligibility: undefined,
    });
    expect(without).not.toContain(COPY.grants.attribution);
  });
});

describe("Unified Agenda link", () => {
  it.each([
    [
      "1076-AF54",
      "https://www.reginfo.gov/public/do/eAgendaViewRule?RIN=1076-AF54",
    ],
    [
      "0648-BO46",
      "https://www.reginfo.gov/public/do/eAgendaViewRule?RIN=0648-BO46",
    ],
    [
      "2060-0A12",
      "https://www.reginfo.gov/public/do/eAgendaViewRule?RIN=2060-0A12",
    ],
  ])("links %s to its agenda editions", (rin, url) => {
    expect(unifiedAgendaUrl(rin)).toBe(url);
    expect(COPY.unifiedAgenda(rin)).toBe(
      `Unified Agenda entries for RIN ${rin}`,
    );
  });

  it.each([
    "1076-AF5",
    "1076-ABCD",
    "076-AF54",
    "1076-af54",
    "1076-AF54&x=1",
    " 1076-AF54",
  ])("builds no link for %s", (rin) => {
    expect(unifiedAgendaUrl(rin)).toBeNull();
  });
});
