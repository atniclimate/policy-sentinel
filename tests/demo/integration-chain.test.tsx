// The page's chain, Grants.gov detail, print and exports wired end to end
// (0.9.1 step 11, lane P2). fetch is stubbed; the page's own api.ts,
// validation.ts and index loader read every answer. The bundled manifest is
// replaced by a synthetic one holding a single current CFR file, so a hop
// can reach a file that fails its digest as well as one not yet available.
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/preact";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../demo/main";
import { loadPdfFonts, loadPdfSeal } from "../../demo/pdf-fonts";
import { COPY } from "../../src/demo/copy";
import { chain } from "../../src/demo/copy/chain";
import { grantsAuthority as GA } from "../../src/demo/copy/grants-authority";
import { localDay } from "../../src/demo/follow";
import { cfrPartLinks, citationsInText } from "../../src/demo/links";
import { buildPdf } from "../../src/demo/pdf";
import { serializeReport, STORAGE_KEY } from "../../src/demo/report-state";
import { searchCriteria } from "../../src/demo/search-contract";
import type { ReportState } from "../../src/demo/report-state";
import type { DemoCitation, DemoSource } from "../../src/demo/types";
import { keyOf, policyValueV3, relatedValue } from "../../src/demo/validation";
import { LinkedRecordsPanel } from "../../demo/app/LinkedRecordsPanel";
import type { IndexFile } from "../../src/demo/index-types";
import {
  blocks,
  cfrFile,
  cfrShard,
  frRecord as chainRecord,
  NOW,
} from "./fixtures/chain";
import { policy } from "./frontend-fixtures";

vi.hoisted(() => {
  vi.stubGlobal("__APP_VERSION__", "test-version");
});
vi.mock("../../docs/demo-data/manifest.json", async () => {
  const f = await import("./fixtures/chain");
  return { default: f.manifestOf([f.cfrFile]) };
});
vi.mock("../../demo/pdf-fonts", () => ({
  loadPdfFonts: vi.fn(),
  loadPdfSeal: vi.fn(),
}));
vi.mock("../../src/demo/pdf", () => ({ buildPdf: vi.fn() }));

const RETRIEVED = "2099-03-05T00:00:00.000Z";

const CATALOG: DemoSource[] = (
  [
    ["federal-register", "Federal Register"],
    ["govinfo", "GovInfo"],
    ["grants", "Grants.gov"],
  ] as const
).map(([id, label]) => ({
  id,
  label,
  level: "federal",
  status: "live",
  note: "Synthetic test source.",
}));

/** The chain fixture record, with a CFR title the citation check accepts (1 to 50). */
const frRecord: DemoCitation = {
  ...chainRecord,
  cfrRefs: [{ title: 25, part: "900" }],
};
const opened = policy("a", frRecord);
/** The version 3 read: the version 1 answer plus its citation_in_text rows. */
const v3 = {
  ...opened,
  version: 3,
  chain: citationsInText(blocks, opened.citation),
};

const billRecord: DemoCitation = {
  sourceId: "govinfo",
  identifier: "BILLS-119hr9999ih",
  title: "Example Watershed Bill",
  issuingBody: "Congress",
  kind: "BILLS",
  date: "2099-01-03",
  officialUrl: "https://www.govinfo.gov/app/details/BILLS-119hr9999ih",
  textUrl: null,
  retrievedAt: RETRIEVED,
  summary: null,
  textAvailable: false,
  matchKey: null,
};

const grantRow: DemoCitation = {
  sourceId: "grants",
  identifier: "EX-2099-001",
  title: "Example Water Program",
  issuingBody: "Example Agency",
  kind: "posted",
  date: "2099-01-05",
  officialUrl: "https://www.grants.gov/search-results-detail/990001",
  textUrl: null,
  retrievedAt: RETRIEVED,
  summary: null,
  textAvailable: false,
  matchKey: null,
};

const grantDetail = {
  ok: true,
  source: "grants",
  citation: {
    ...grantRow,
    assistanceListings: [{ number: "99.001", title: "Example Listing" }],
    versionDate: "2099-01-04",
  },
  authority: "none",
};

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });

let calls: URL[] = [];
async function worker(input: string): Promise<Response> {
  // The index loader asks for same-origin static files by relative path.
  if (input.startsWith("./demo-data/")) {
    calls.push(new URL(input, "https://page.invalid/"));
    // Not the bytes the manifest's digest names: a tampered or broken file.
    return new Response('{"artifactType":"cfr-authority-shard"}');
  }
  const url = new URL(input);
  calls.push(url);
  const q = url.searchParams;
  if (url.pathname === "/api/sources")
    return json({ ok: true, version: 2, sources: CATALOG });
  if (url.pathname === "/api/policy" && q.get("source") === "federal-register")
    return q.get("version") === "3" && q.get("id") === "2099-00001"
      ? json(v3)
      : json({ ok: false, error: "not_found", message: "Not found." }, 404);
  if (url.pathname === "/api/policy" && q.get("source") === "grants")
    return json(grantDetail);
  if (url.pathname === "/api/related" && q.get("source") === "govinfo")
    return json({
      ok: true,
      source: "govinfo",
      basis: "source_field",
      accessId: q.get("id"),
      relations: [{ relation: "Bill Versions", collection: "BILLS" }],
      retrievedAt: RETRIEVED,
    });
  return json({ ok: false, error: "not_found", message: "Not found." }, 404);
}
const fetchStub = vi.fn(worker);

const ACTORS = {
  name: "A. Example",
  role: "Policy analyst",
  organization: "Example Organization",
  sharingWith: "Example working group",
  purpose: "Synthetic briefing.",
};

/** A saved list holding the three records, so each opens from My Citations. */
function seed() {
  const cited: ReportState["cited"] = {};
  for (const citation of [frRecord, billRecord, grantRow])
    cited[keyOf(citation)] = {
      citation,
      policy: null,
      note: "",
      alternates: [],
    };
  window.sessionStorage.setItem(
    STORAGE_KEY,
    serializeReport({ cited, marks: {}, actors: ACTORS }),
  );
}

beforeEach(() => {
  calls = [];
  fetchStub.mockReset();
  fetchStub.mockImplementation(worker);
  vi.stubGlobal("__APP_VERSION__", "test-version");
  vi.stubGlobal("fetch", fetchStub);
  window.sessionStorage.clear();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.mocked(loadPdfFonts).mockResolvedValue(undefined);
  vi.mocked(loadPdfSeal).mockResolvedValue(new Uint8Array([137, 80, 78, 71]));
  vi.mocked(buildPdf).mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
  seed();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function start() {
  const rendered = render(<App />);
  const shell = rendered.container.querySelector(".screen-only") as HTMLElement;
  const ui = within(shell);
  await waitFor(() =>
    expect(ui.getByRole("button", { name: "Search" })).toHaveAttribute(
      "aria-disabled",
      "false",
    ),
  );
  const open = async (title: string) => {
    fireEvent.click(
      ui.getByRole("button", { name: COPY.showIssuesForCited(title) }),
    );
    await ui.findByRole("heading", { name: title, level: 3 });
  };
  const panel = () =>
    within(shell.querySelector(".chain-panel") as HTMLElement);
  const print = rendered.container.querySelector(".print-only") as HTMLElement;
  return { ...rendered, ui, shell, open, panel, print };
}

const path = (url: URL) => url.pathname;

describe("the chain on the page", () => {
  it("shows the three sections with record-level and in-text rows for a Federal Register record", async () => {
    const { open, panel, ui } = await start();
    await open(frRecord.title);
    await ui.findAllByText("Citation found at page 12");
    const sections = panel().getAllByRole("heading", { level: 4 });
    expect(sections.map((h) => h.textContent)).toEqual(
      Object.values(chain.sections),
    );
    expect(panel().getByText("CFR parts this document names")).toBeVisible();
    expect(panel().getByText("Shares docket EX-2099-0001")).toBeVisible();
    // The policy read asked for version 3.
    const read = calls.find((url) => path(url) === "/api/policy")!;
    expect(read.searchParams.get("version")).toBe("3");
  });

  it("keeps the listing's CFR parts and identifiers when the read itself states none", async () => {
    // A real text read carries no listing fields; the search row states them.
    const bare: Record<string, unknown> = { ...v3.citation };
    for (const field of ["cfrRefs", "docketIds", "rins", "topics"])
      delete bare[field];
    // A version 2 search row carries no version 3 field.
    const listed: Record<string, unknown> = { ...frRecord };
    for (const field of [
      "correctionOf",
      "corrections",
      "authorityLine",
      "authorityLinePresent",
    ])
      delete listed[field];
    fetchStub.mockImplementation(async (input: string, init?: RequestInit) => {
      const url = input.startsWith("./") ? null : new URL(input);
      if (url?.pathname === "/api/search" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as Record<string, string>;
        const criteria = searchCriteria(body.source, body.q, 1, {
          dateFrom: null,
          dateTo: null,
          continuation: null,
          version: Number(body.searchVersion) as 1 | 2,
          match: "text",
          documentType: null,
        });
        const results = body.source === "federal-register" ? [listed] : [];
        return json({
          ok: true,
          source: body.source,
          query: body.q,
          total: results.length,
          page: 1,
          results,
          retrievedAt: RETRIEVED,
          criteria,
          continuation: { kind: "stopped", reason: "complete" },
        });
      }
      if (url?.pathname === "/api/policy" && url.searchParams.get("id"))
        return (calls.push(url), json({ ...v3, citation: bare }));
      return worker(input);
    });
    window.sessionStorage.clear(); // open it from the results, not My Citations
    const { panel, ui } = await start();
    fireEvent.input(ui.getByRole("combobox", { name: "Search terms" }), {
      target: { value: "example watershed" },
    });
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    fireEvent.click(
      await ui.findByRole("button", {
        name: COPY.showIssuesFor(frRecord.title),
      }),
    );
    await ui.findAllByText("Citation found at page 12");
    expect(panel().getByText("CFR parts this document names")).toBeVisible();
    expect(panel().getByText("Shares docket EX-2099-0001")).toBeVisible();
  });

  it("says not yet available with the live link for a hop the index does not hold, and index unavailable for a tampered file", async () => {
    const { open, panel } = await start();
    await open(frRecord.title);
    fireEvent.click(
      panel().getByRole("button", { name: chain.openHop("99 U.S.C. 1001") }),
    );
    const missing = await panel().findByText(/^Not yet available\./);
    expect(
      within(missing).getByRole("link", {
        name: chain.liveLink(chain.indexSources["usc-index"]),
      }),
    ).toHaveAttribute("href", expect.stringContaining("uscode.house.gov"));
    // The file is not listed, so nothing was fetched for it.
    expect(calls.some((url) => url.pathname.includes("usc/"))).toBe(false);

    fireEvent.click(
      panel().getByRole("button", { name: chain.openHop("99 CFR 100.5") }),
    );
    const broken = await panel().findByText(/^Index unavailable\./);
    expect(
      within(broken).getByRole("link", { name: chain.liveLink("eCFR") }),
    ).toHaveAttribute("href", "https://www.ecfr.gov/current/title-99/part-100");
    expect(
      calls.filter((url) => url.pathname === "/demo-data/cfr/title-99.json"),
    ).toHaveLength(1);
    // Never an empty list in place of the file.
    expect(panel().queryByText(chain.noneStated)).toBeNull();
  });

  it("makes exactly one Worker call per expansion press", async () => {
    const { open, panel } = await start();
    await open(billRecord.title);
    const before = calls.filter((url) => path(url) === "/api/related").length;
    expect(before).toBe(0);
    fireEvent.click(
      panel().getByRole("button", { name: chain.expand.govinfo_related }),
    );
    await panel().findByText("Bill Versions");
    const related = calls.filter((url) => path(url) === "/api/related");
    expect(related).toHaveLength(1);
    expect(related[0].searchParams.get("id")).toBe("BILLS-119hr9999ih");
    expect(
      panel().queryByRole("button", { name: chain.expand.govinfo_related }),
    ).toBeNull();
  });

  it("shows a failed expansion as an error the reader can retry", async () => {
    fetchStub.mockImplementation(async (input: string) =>
      input.includes("/api/related")
        ? json({ ok: false, error: "not_available", message: "Down." }, 503)
        : worker(input),
    );
    const { open, panel } = await start();
    await open(billRecord.title);
    fireEvent.click(
      panel().getByRole("button", { name: chain.expand.govinfo_related }),
    );
    expect(await panel().findByRole("alert")).toHaveTextContent(
      chain.expandFailed,
    );
    expect(
      panel().getByRole("button", { name: chain.expand.govinfo_related }),
    ).toBeEnabled();
  });

  it("prints the stale sentence on every row from a file kept after a failed refresh (D2, D3)", () => {
    const retained: IndexFile = {
      ...cfrFile,
      status: "retained_after_failed_refresh",
      lastRefreshAttemptAt: "2099-02-28T10:00:00Z",
      failureStage: "fetch",
      message: "Source refresh failed.",
    };
    const rows = cfrPartLinks(cfrShard, "100", retained, NOW) ?? [];
    const { container } = render(<LinkedRecordsPanel rows={rows} />);
    const items = [...container.querySelectorAll(".chain-row")];
    expect(items).toHaveLength(rows.length);
    for (const li of items) expect(li.textContent).toContain(chain.retained);
    // Under six months old: not the six-month sentence.
    expect(container.textContent).not.toContain(chain.stale);
  });
});

describe("a Grants.gov record on the page", () => {
  it("reads the opportunity once and shows its Assistance Listing and the no-passage sentence", async () => {
    const { open, ui, shell } = await start();
    await open(grantRow.title);
    await ui.findByText("99.001 Example Listing");
    expect(ui.getByText(`${GA.noPassage}.`)).toBeVisible();
    expect(ui.getByText(GA.versionDate("2099-01-04"))).toBeVisible();
    expect(
      shell.querySelector(".authority-citations .limits"),
    ).toHaveTextContent(GA.coverage);
    const reads = calls.filter(
      (url) =>
        path(url) === "/api/policy" &&
        url.searchParams.get("source") === "grants",
    );
    expect(reads).toHaveLength(1);
    expect(reads[0].searchParams.get("id")).toBe("990001");
    // The eligibility filter stays off by default.
    expect(
      ui.getByRole("checkbox", { name: COPY.grants.filterLabel }),
    ).not.toBeChecked();
  });
});

describe("print and exports", () => {
  it("carry the chain, the Grants.gov passage state and the attribution in the print view", async () => {
    const { open, ui, print } = await start();
    await open(frRecord.title);
    await ui.findAllByText("Citation found at page 12");
    await open(grantRow.title);
    await ui.findByText("99.001 Example Listing");
    expect(print).toHaveTextContent(chain.title);
    expect(print).toHaveTextContent(
      "CFR parts this document names 25 CFR part 900",
    );
    expect(print).toHaveTextContent("Citation found at page 12");
    expect(print).toHaveTextContent(`${GA.noPassage}.`);
    expect(print).toHaveTextContent(GA.coverage);
    expect(print).toHaveTextContent(COPY.grants.attribution);
  });

  it("sends the chain to the PDF and builds the Briefing in a mode that offers it", async () => {
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:synthetic"),
      revokeObjectURL: vi.fn(),
    });
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      names.push(this.download);
    });
    const { ui, print } = await start();
    fireEvent.click(ui.getByRole("button", { name: COPY.exportPdf }));
    await waitFor(() => expect(buildPdf).toHaveBeenCalledTimes(1));
    const cited = vi.mocked(buildPdf).mock.calls[0][0];
    expect(cited.template).toBe("citations");
    expect(cited.entries.every((entry) => Array.isArray(entry.chain))).toBe(
      true,
    );
    await waitFor(() =>
      expect(names).toEqual([
        `policy-sentinel-citations-${localDay(new Date())}.pdf`,
      ]),
    );

    fireEvent.click(ui.getByRole("tab", { name: "Tracking" }));
    await act(async () => undefined);
    expect(print).toHaveTextContent("Briefing");
    fireEvent.click(ui.getByRole("button", { name: COPY.exportPdf }));
    await waitFor(() => expect(buildPdf).toHaveBeenCalledTimes(2));
    expect(vi.mocked(buildPdf).mock.calls[1][0].template).toBe("briefing");
    await waitFor(() =>
      expect(names.at(-1)).toBe(
        `policy-sentinel-briefing-${localDay(new Date())}.pdf`,
      ),
    );
  });

  it("has no automated axe violations with the chain and authority panels shown", async () => {
    const { open, ui, shell, panel } = await start();
    await open(frRecord.title);
    await ui.findAllByText("Citation found at page 12");
    fireEvent.click(
      panel().getByRole("button", { name: chain.openHop("99 U.S.C. 1001") }),
    );
    await panel().findByText(/^Not yet available\./);
    let results = await axe.run(shell, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
    await open(grantRow.title);
    await ui.findByText("99.001 Example Listing");
    results = await axe.run(shell, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});

describe("the page's version 3 and related-records checks", () => {
  it("accepts the Worker's chain rows and refuses a tampered one", () => {
    const expected = { source: "federal-register", id: "2099-00001" };
    const read = policyValueV3(JSON.parse(JSON.stringify(v3)), expected);
    expect(read.version).toBe(3);
    expect(read.chain).toEqual(v3.chain);
    // A Worker that predates version 3 reads as version 1.
    expect(policyValueV3(opened, expected)).toEqual(opened);
    const [first] = v3.chain;
    const tamper = (row: object) => ({ ...v3, chain: [{ ...first, ...row }] });
    for (const bad of [
      { section: "stated" },
      { basis: "source_field" },
      { labelId: "fr_cfr_refs" },
      { label: "Applies to this record" },
      { liveUrl: "https://attacker.example/" },
      {
        target: {
          sourceId: "usc-index",
          identifier: "/us/usc/t99/s1",
          officialUrl: "https://attacker.example/x",
        },
      },
      { sourceWording: "x".repeat(501) },
    ])
      expect(() => policyValueV3(tamper(bad), expected)).toThrow();
    expect(() => policyValueV3({ ...v3, version: 2 }, expected)).toThrow();
  });

  it("checks related records against the request", () => {
    const relations = {
      ok: true,
      source: "govinfo",
      basis: "source_field",
      accessId: "BILLS-119hr9999ih",
      relations: [{ relation: "Bill Versions", collection: "BILLS" }],
      retrievedAt: RETRIEVED,
    };
    const request = { source: "govinfo", id: "BILLS-119hr9999ih" } as const;
    expect(relatedValue(relations, request)).toEqual(relations);
    expect(() =>
      relatedValue({ ...relations, accessId: "OTHER" }, request),
    ).toThrow();
    expect(() =>
      relatedValue(
        { ...relations, relations: [{ relation: "x", collection: "bad" }] },
        request,
      ),
    ).toThrow();
    const bills = {
      ok: true,
      source: "congress",
      basis: "source_field",
      bill: "HR 9999, 119th Congress",
      records: [
        {
          relation: "Identical bill",
          identifiedBy: "CRS",
          identifier: "S 9999, 119th Congress",
          title: "Example Watershed Act",
          officialUrl:
            "https://www.congress.gov/bill/119th-congress/senate-bill/9999",
        },
      ],
      total: 1,
      retrievedAt: RETRIEVED,
    };
    const congress = { source: "congress", bill: "hr 9999 119" } as const;
    expect(relatedValue(bills, congress)).toEqual(bills);
    expect(() =>
      relatedValue(
        {
          ...bills,
          records: [
            { ...bills.records[0], officialUrl: "https://attacker.example/" },
          ],
        },
        congress,
      ),
    ).toThrow();
    expect(() => relatedValue({ ...bills, total: 0 }, congress)).toThrow();
    const records = {
      ...relations,
      collection: "BILLS",
      records: [
        {
          identifier: "BILLS-119hr9999rh",
          title: null,
          date: "2099-01-04",
          officialUrl: "https://www.govinfo.gov/app/details/BILLS-119hr9999rh",
        },
      ],
      total: 3,
    };
    delete (records as { relations?: unknown }).relations;
    expect(relatedValue(records, { ...request, collection: "BILLS" })).toEqual(
      records,
    );
  });
});
