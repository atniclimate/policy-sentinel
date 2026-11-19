// Readings chosen in the search box, on the page (D-177, D-178): a law name
// searches its official name and links the U.S. Code section; an executive
// order runs its one lookup on the Federal Register. Uses the reviewed tables.
import { cleanup, render, waitFor, within } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSources, search } from "../../demo/api";
import { App } from "../../demo/main";
import { searchResult, sources } from "./frontend-fixtures";

vi.hoisted(() => {
  vi.stubGlobal("__APP_VERSION__", "test-version");
});
vi.mock("../../demo/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../demo/api")>()),
  loadSources: vi.fn(),
  readPolicy: vi.fn(),
  search: vi.fn(),
}));
vi.mock("../../demo/pdf-fonts", () => ({
  loadPdfFonts: vi.fn(),
  loadPdfSeal: vi.fn(),
}));
vi.mock("../../src/demo/pdf", () => ({ buildPdf: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  window.sessionStorage.clear();
  vi.mocked(loadSources).mockResolvedValue(sources);
  vi.mocked(search).mockResolvedValue(searchResult());
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function chooseFirst(typed: string) {
  const user = userEvent.setup();
  const { container } = render(<App />);
  const ui = within(container.querySelector(".screen-only") as HTMLElement);
  // The page also holds select lists, which share the combobox role.
  const box = await waitFor(() => {
    const el = container.querySelector<HTMLInputElement>("#q");
    if (!el) throw new Error("the search box is not rendered yet");
    return el;
  });
  await waitFor(() => expect(loadSources).toHaveBeenCalled());
  await user.type(box, typed);
  const [first] = await ui.findAllByRole("option");
  await user.keyboard("{ArrowDown}{Enter}");
  return { container, ui, first: first.textContent ?? "" };
}

describe("a law name chosen in the search box", () => {
  it("searches the official name on the federal sources and links the U.S. Code section", async () => {
    const { container, ui, first } = await chooseFirst("clean water");
    expect(first).toContain("Clean Water Act, 33 U.S.C. 1251 et seq.");
    await waitFor(() => expect(search).toHaveBeenCalled());
    const calls = vi.mocked(search).mock.calls;
    // The official name as words, never the typed fragment; no identifier match.
    expect(new Set(calls.map(([, query]) => query))).toEqual(
      new Set(["Clean Water Act"]),
    );
    for (const [source, , , , options] of calls) {
      expect(["federal-register", "govinfo", "regulations"]).toContain(source);
      expect(options?.match ?? "text").toBe("text");
    }
    expect(
      container.querySelector(".submitted-search") as HTMLElement,
    ).toHaveTextContent("Clean Water Act, 33 U.S.C. 1251 et seq.");
    const link = await ui.findByRole("link", {
      name: "Open at the Office of the Law Revision Counsel",
    });
    expect(link.getAttribute("href")).toMatch(
      /^https:\/\/uscode\.house\.gov\//,
    );
  });
});

describe("an executive order chosen in the search box", () => {
  it("runs one lookup on the Federal Register by the order's number", async () => {
    const { first } = await chooseFirst("eo 14096");
    expect(first).toContain("Executive Order 14096");
    await waitFor(() => expect(search).toHaveBeenCalled());
    const calls = vi.mocked(search).mock.calls;
    expect(calls).toHaveLength(1);
    const [source, query, page, , options] = calls[0];
    expect([source, query, page]).toEqual([
      "federal-register",
      "E.O. 14096",
      1,
    ]);
    expect(options).toMatchObject({
      version: 3,
      match: "executive_order",
      dateFrom: null,
      dateTo: null,
      documentType: null,
    });
  });

  it("says an order from before 1994 is not covered, and sends nothing", async () => {
    const { container, first } = await chooseFirst("Executive Order 12866");
    expect(first).toContain("Executive Order 12866");
    await waitFor(() =>
      expect(container).toHaveTextContent(
        "Executive Order 12866: Not covered in this release.",
      ),
    );
    expect(search).not.toHaveBeenCalled();
  });
});
