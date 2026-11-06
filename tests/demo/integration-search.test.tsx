// The page's search side wired end to end (0.9.1 step 11, lane P1): the
// combobox reading drives the lookup, plain words search as today, a court
// docket runs the GovInfo court lookup, the mode tab changes only the
// fragment, and the Sources panel shows its states. fetch is stubbed; the
// page's own api.ts and validation.ts read every answer.
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../demo/main";
import { courts as COURTS } from "../../src/demo/copy/courts";
import { privacy } from "../../src/demo/copy/privacy";
import { router } from "../../src/demo/copy/router";
import { sourceModel } from "../../src/demo/copy/sources";
import { readingCourt, readingSearch } from "../../src/demo/discovery";
import { routeQuery } from "../../src/demo/query-route";
import { searchCriteria } from "../../src/demo/search-contract";
import type { DemoCitation, DemoSource } from "../../src/demo/types";
import { sourcesValueV2 } from "../../src/demo/validation";

vi.hoisted(() => {
  vi.stubGlobal("__APP_VERSION__", "test-version");
});

const RETRIEVED = "2099-03-05T00:00:00.000Z";

const CATALOG: DemoSource[] = (
  [
    ["federal-register", "Federal Register", "federal", "live"],
    ["govinfo", "GovInfo", "federal", "live"],
    ["congress", "Congress.gov", "federal", "live"],
    ["washington", "Washington State Legislature", "state", "live"],
    ["oregon", "Oregon Legislature", "state", "not_available"],
    ["govinfo-courts", "GovInfo court opinions", "federal", "live"],
  ] as const
).map(([id, label, level, status]) => ({
  id,
  label,
  level,
  status,
  note: status === "live" ? "Synthetic test source." : "Synthetic gap.",
}));

const register = (docket?: string): DemoCitation => ({
  sourceId: "federal-register",
  identifier: "99 FR 100 (FR Doc. 2099-00001)",
  title: "Example Water Notice",
  issuingBody: "Example Department",
  kind: "Notice",
  date: "2099-01-05",
  officialUrl: "https://www.federalregister.gov/d/2099-00001",
  textUrl: null,
  retrievedAt: RETRIEVED,
  summary: null,
  textAvailable: false,
  matchKey: null,
  ...(docket && { docketIds: [docket] }),
});

const opinion: DemoCitation = {
  sourceId: "govinfo-courts",
  identifier: "USCOURTS-ca9-23-12345",
  title: "EXAMPLE COUNTY V. UNITED STATES",
  issuingBody: "Example Court",
  kind: "USCOURTS",
  date: "2099-03-04",
  officialUrl: "https://www.govinfo.gov/app/details/USCOURTS-ca9-23-12345",
  textUrl: null,
  retrievedAt: RETRIEVED,
  summary: null,
  textAvailable: false,
  matchKey: null,
  court: "ca9",
  docketNumber: "23-12345",
  packageId: "USCOURTS-ca9-23-12345",
  lastModified: "2099-03-04T12:00:00Z",
  caseCitationProvided: false,
};

type Body = Record<string, string>;
let posted: Body[] = [];

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** A Worker answer to one POST /api/search, echoing the criteria the page sent. */
function answer(body: Body): Response {
  const options = {
    dateFrom: body.dateFrom ?? null,
    dateTo: body.dateTo ?? null,
    continuation: null,
    version: Number(body.searchVersion) as 1 | 2 | 3,
    match: (body.match ?? "text") as "text",
    documentType: null,
  };
  const criteria = searchCriteria(body.source, body.q, 1, options);
  const results =
    body.source === "govinfo-courts"
      ? [opinion]
      : body.source === "federal-register"
        ? [register(body.match === "docket" ? body.q : undefined)]
        : [];
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

async function worker(input: string, init?: RequestInit) {
  const url = new URL(input);
  if (url.pathname === "/api/sources")
    return json({ ok: true, version: 2, sources: CATALOG });
  if (url.pathname === "/api/search" && init?.method === "POST") {
    const body = JSON.parse(String(init.body)) as Body;
    posted.push(body);
    return answer(body);
  }
  return json({ ok: false, error: "not_found", message: "Not found." }, 404);
}
const fetchStub = vi.fn(worker);

beforeEach(() => {
  posted = [];
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
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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
  const box = ui.getByRole("combobox", { name: "Search terms" });
  return { ...rendered, ui, shell, box, user: userEvent.setup() };
}

/** Types the text, then picks the option with this label by keyboard alone. */
async function choose(
  user: ReturnType<typeof userEvent.setup>,
  box: HTMLElement,
  text: string,
  label: string,
) {
  await user.click(box);
  await user.keyboard(text);
  const options = within(document.getElementById("q-listbox")!).getAllByRole(
    "option",
  );
  const at = options.findIndex((option) => option.textContent?.includes(label));
  expect(at).toBeGreaterThanOrEqual(0);
  for (let step = 0; step <= at; step++) await user.keyboard("{ArrowDown}");
  expect(box).toHaveAttribute("aria-activedescendant", options[at].id);
  await user.keyboard("{Enter}");
}

describe("search box readings on the page", () => {
  it("runs the lookup of a reading chosen in the suggestions", async () => {
    const { ui, box, user } = await start();
    await choose(
      user,
      box,
      "EPA-HQ-OW-2099-0001",
      "Docket EPA-HQ-OW-2099-0001",
    );
    await ui.findByRole("heading", { name: "Example Water Notice" });
    expect(posted).toEqual([
      expect.objectContaining({
        source: "federal-register",
        q: "EPA-HQ-OW-2099-0001",
        match: "docket",
        searchVersion: "2",
      }),
    ]);
    // Search words stay out of the address.
    expect(window.location.href).not.toContain("EPA-HQ");
    expect(
      ui.getByText("Docket EPA-HQ-OW-2099-0001", {
        selector: ".submitted-search p",
      }),
    ).toBeInTheDocument();
  });

  it("shows a bare bill number's choices and follows the jurisdiction chosen", async () => {
    const { ui, box, user } = await start();
    await user.click(box);
    await user.keyboard("HB 2100");
    const options = within(document.getElementById("q-listbox")!).getAllByRole(
      "option",
    );
    expect(options.map((option) => option.textContent)).toEqual([
      "Washington HB 2100",
      expect.stringContaining("Oregon HB 2100"),
    ]);
    expect(document.getElementById("q-route")).toHaveTextContent(
      router.chooseReading,
    );
    // Oregon is a link out: no request, the official site to open.
    for (let step = 0; step < 2; step++) await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");
    await ui.findByRole("link", {
      name: "Search bills on the Oregon Legislature site",
    });
    expect(
      ui.getByText(`Oregon HB 2100: ${router.linkOutNote}.`),
    ).toBeInTheDocument();
    expect(posted).toEqual([]);
    // Washington runs the Washington lookup, even with the federal scope chosen.
    await user.clear(box);
    await choose(user, box, "HB 2100", "Washington HB 2100");
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ source: "washington", q: "HB 2100" });
  });

  it("searches plain words as today and says so", async () => {
    const { ui, box, user } = await start();
    await user.click(box);
    await user.keyboard("salmon habitat");
    expect(document.getElementById("q-route")).toHaveTextContent(
      router.searchedAsWords,
    );
    await user.click(ui.getByRole("button", { name: "Search" }));
    await ui.findByRole("heading", { name: "Example Water Notice" });
    expect(posted).toEqual([
      expect.objectContaining({
        source: "federal-register",
        q: "salmon habitat",
        searchVersion: "2",
      }),
    ]);
    expect(posted[0].match).toBeUndefined();
    expect(
      ui.getByText(router.searchedAsWords, { selector: ".submitted-search p" }),
    ).toBeInTheDocument();
  });

  it("runs the court lookup for a court docket and offers Follow case", async () => {
    const { ui, box, user } = await start();
    await choose(user, box, "ca9 23-12345", "Ninth Circuit docket 23-12345");
    await ui.findByRole("heading", { name: "EXAMPLE COUNTY V. UNITED STATES" });
    expect(posted).toEqual([
      {
        source: "govinfo-courts",
        q: "ca9 23-12345",
        page: "1",
        searchVersion: "3",
        match: "court_docket",
        court: "ca9",
      },
    ]);
    const follow = ui.getByRole("button", {
      name: `${COURTS.follow}: EXAMPLE COUNTY V. UNITED STATES`,
    });
    follow.focus();
    await user.keyboard("{Enter}");
    const zone = ui
      .getByRole("heading", { name: "Following" })
      .closest("section")!;
    await waitFor(() =>
      expect(zone).toHaveTextContent("EXAMPLE COUNTY V. UNITED STATES"),
    );
    // Its tracking state is worded, and nothing is called new before a check.
    expect(zone).toHaveTextContent("Not checked.");
  });

  it("says when a chosen reading has no lookup, and sends nothing", async () => {
    const { ui, box, user } = await start();
    await choose(user, box, "Pub. L. 93-638", "Pub. L. 93-638");
    await ui.findByText(/Not covered in this release\./);
    await user.clear(box);
    await choose(user, box, "25 U.S.C. 5304", "25 U.S.C. 5304");
    await ui.findByText(new RegExp(sourceModel.indexMissing.slice(0, 30)));
    expect(posted).toEqual([]);
  });
});

describe("modes, sources and privacy on the page", () => {
  it("changes the fragment on a mode tab and nothing else", async () => {
    const { ui, box, user } = await start();
    await user.click(box);
    await user.keyboard("salmon habitat");
    await user.click(ui.getByRole("button", { name: "Search" }));
    await ui.findByRole("heading", { name: "Example Water Notice" });
    const calls = fetchStub.mock.calls.length;
    const tab = ui.getByRole("tab", { name: "Research" });
    expect(tab).toHaveAttribute("aria-selected", "true");
    tab.focus();
    await user.keyboard("{ArrowRight}");
    expect(ui.getByRole("tab", { name: "Grants" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(window.location.hash).toBe("#mode=grants");
    expect(window.location.search).toBe("");
    expect(fetchStub.mock.calls.length).toBe(calls);
    expect(
      ui.getByRole("heading", { name: "Example Water Notice" }),
    ).toBeInTheDocument();
    expect(ui.queryByRole("tab", { name: "Committee libraries" })).toBeNull();
  });

  it("starts in the mode the fragment names", async () => {
    window.history.replaceState(null, "", "/#mode=tracking");
    const { ui } = await start();
    expect(ui.getByRole("tab", { name: "Tracking" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("loads the version 2 catalog and shows each source state", async () => {
    const { ui, container } = await start();
    expect(fetchStub.mock.calls[0][0]).toMatch(/\/api\/sources\?version=2$/);
    expect(
      ui.getByRole("checkbox", { name: /GovInfo court opinions/ }),
    ).not.toBeChecked();
    expect(
      ui.getAllByText(sourceModel.enabledUnverified).length,
    ).toBeGreaterThan(0);
    expect(ui.queryByText("Live", { exact: true })).toBeNull();
    // Where search words go, once, naming the enabled services.
    expect(ui.getByText(/Search words are sent in the body/)).toHaveTextContent(
      "GovInfo court opinions",
    );
    const about = within(
      container.querySelector("dialog.about") as HTMLElement,
    );
    expect(about.getAllByText(sourceModel.linkOutOnly)).toHaveLength(3);
    expect(
      about.getByRole("link", {
        name: /Interior Board of Indian Appeals/,
        hidden: true,
      }),
    ).toHaveAttribute(
      "href",
      "https://www.doi.gov/oha/organization/ibia/findingIBIA",
    );
    expect(about.getAllByText(sourceModel.notAvailable).length).toBeGreaterThan(
      1,
    );
    expect(
      container.querySelector(`a[href="${privacy.noticesHref}"]`),
    ).toHaveTextContent(privacy.noticesLink);
    expect(container.textContent).not.toContain(
      "Search terms go to the demo service",
    );
  });

  it("has no automated axe violations with suggestions and results shown", async () => {
    const { ui, box, user, shell } = await start();
    await choose(user, box, "ca9 23-12345", "Ninth Circuit docket 23-12345");
    await ui.findByRole("heading", { name: "EXAMPLE COUNTY V. UNITED STATES" });
    await user.click(box);
    await user.keyboard("{End} x");
    await act(async () => undefined);
    expect(box).toHaveAttribute("aria-expanded", "true");
    // The screen page; the print-only document keeps its own heading levels.
    const results = await axe.run(shell, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});

describe("reading plans and the version 2 catalog", () => {
  const reading = (text: string) => routeQuery(text).readings[0];

  it("names the court from the reading and never guesses one", () => {
    expect(readingCourt(reading("ca9 23-12345"))).toBe("ca9");
    expect(readingCourt(reading("23-12345"))).toBeNull();
    expect(readingSearch(reading("23-12345"))).toBeNull();
    expect(readingSearch(reading("600 U.S. 1"))).toMatchObject({
      source: "govinfo-courts",
      lookup: "us_reports",
      query: "600 U.S. 1",
    });
  });

  it("accepts the version 2 catalog and the plain one, and refuses another version", () => {
    const body = { ok: true, sources: CATALOG };
    expect(sourcesValueV2({ ...body, version: 2 })).toHaveLength(6);
    expect(sourcesValueV2(body)).toHaveLength(6);
    expect(() => sourcesValueV2({ ...body, version: 3 })).toThrow();
  });
});

// The court lookup answers a definite "not found" as nothing listed, not an outage.
describe("court lookup answers", () => {
  it("shows a missing docket as an answer", async () => {
    fetchStub.mockImplementation(async (input: string, init?: RequestInit) => {
      const url = new URL(input);
      if (url.pathname === "/api/sources")
        return json({ ok: true, version: 2, sources: CATALOG });
      posted.push(JSON.parse(String(init?.body)) as Body);
      return json(
        { ok: false, error: "not_found", message: COURTS.docketNotFound },
        404,
      );
    });
    const { ui, box, user } = await start();
    await choose(user, box, "ca9 23-12345", "Ninth Circuit docket 23-12345");
    await waitFor(() =>
      expect(ui.getAllByText(COURTS.docketNotFound).length).toBeGreaterThan(0),
    );
    expect(ui.queryByText(/could not be reached|did not answer/)).toBeNull();
    fireEvent.blur(box);
  });
});
