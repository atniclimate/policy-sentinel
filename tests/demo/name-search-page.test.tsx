// D-186b, the owner ruling of 2026-11-19: a typed Tribe-shaped name shows the
// name-search line and the Why shown caution; an ordinary typed search shows
// neither. Modeled on the sponsor-name render check in frontend.test.tsx.
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSources, readPolicy, search } from "../../demo/api";
import { App } from "../../demo/main";
import { citation, policy, searchResult, sources } from "./frontend-fixtures";

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
vi.mock("../../src/demo/ncai-vault", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/demo/ncai-vault")>()),
  openNcaiDrafts: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  window.sessionStorage.clear();
  vi.mocked(loadSources).mockResolvedValue(sources);
  vi.mocked(search).mockResolvedValue(searchResult());
  vi.mocked(readPolicy).mockResolvedValue(policy());
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function start() {
  const rendered = render(<App />);
  const screenRoot = rendered.container.querySelector(
    ".screen-only",
  ) as HTMLElement;
  const ui = within(screenRoot);
  await waitFor(() =>
    expect(ui.getByRole("button", { name: "Search" })).toHaveAttribute(
      "aria-disabled",
      "false",
    ),
  );
  return { ...rendered, ui };
}

async function showResult(ui: ReturnType<typeof within>, query: string) {
  fireEvent.input(ui.getByRole("combobox", { name: "Search terms" }), {
    target: { value: query },
  });
  fireEvent.click(ui.getByRole("button", { name: "Search" }));
  await ui.findAllByRole("button", { name: /Add to my citations/ });
}

describe("a typed Tribe-shaped name on the page (D-186b)", () => {
  it("shows the name-search line and the Why shown caution", async () => {
    vi.mocked(search).mockImplementation(async (_source, query) =>
      searchResult([citation()], query),
    );
    const { ui, container } = await start();
    await showResult(ui, "Example River Nation");
    const results = container.querySelector(".pane-results") as HTMLElement;
    expect(results).toHaveTextContent(
      "Name search: Example River Nation. A name match does not show that a document concerns that Tribe or organization.",
    );
    expect(results).toHaveTextContent(
      "Why shown: name search for Example River Nation in Federal Register. A name match does not show that this document concerns that Tribe or organization.",
    );
  });

  it("shows neither for an ordinary typed search", async () => {
    vi.mocked(search).mockImplementation(async (_source, query) =>
      searchResult([citation()], query),
    );
    const { ui, container } = await start();
    await showResult(ui, "tribal consultation");
    const results = container.querySelector(".pane-results") as HTMLElement;
    expect(results).not.toHaveTextContent("Name search:");
    expect(results).not.toHaveTextContent(
      "does not show that this document concerns that Tribe or organization",
    );
  });
});
