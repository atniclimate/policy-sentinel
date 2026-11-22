// D-186, D-188: the owner ruling of 2026-11-19 approving part (a) of the
// narrowing design. The page end to end: choosing a narrow-to-agency or
// narrow-to-topic suggestion adds the Federal Register's own field to that
// search only, says so above the results and in each listed row's Why shown,
// and leaves every other source searched exactly as today. Real published
// vocabulary (docs/demo-data/vocab) is served through a stubbed fetch, so the
// combobox offers the same agency and topic this demo confirmed live
// (Indian Affairs Bureau, Indians-lands).
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/preact";
import axe from "axe-core";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSources, readPolicy, search } from "../../demo/api";
import { App } from "../../demo/main";
import { citation, policy, sources } from "./frontend-fixtures";
import type { DemoCitation, DemoSearchResponse } from "../../src/demo/types";

/**
 * Built directly, not through frontend-fixtures' searchResult: that helper's
 * own criteria echo always calls searchCriteria with no options, which throws
 * on the empty query a narrowed, no-words search sends. search() is fully
 * mocked here, so nothing re-validates this response's criteria field.
 */
function response(
  results: readonly DemoCitation[],
  query: string,
  source = "federal-register",
): DemoSearchResponse {
  return {
    ok: true,
    source,
    query,
    page: 1,
    total: results.length,
    results,
    retrievedAt: "2099-01-07T12:00:00.000Z",
    criteria: {
      version: 1,
      source,
      query,
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
      sort: "relevance",
      resultLevel: null,
      historical: null,
      cursor: null,
    },
    continuation: { kind: "stopped", reason: "complete" },
  };
}

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

const VOCAB_DIR = resolve(process.cwd(), "docs/demo-data/vocab");
const AGENCIES = readFileSync(resolve(VOCAB_DIR, "fr-agencies.json"));
const TOPICS = readFileSync(resolve(VOCAB_DIR, "fr-topics.json"));

const fetchStub = vi.fn(async (input: unknown) => {
  const url = String(input);
  if (url.endsWith("vocab/fr-agencies.json")) return new Response(AGENCIES);
  if (url.endsWith("vocab/fr-topics.json")) return new Response(TOPICS);
  throw new Error(`Unexpected fetch in narrow-page test: ${url}`);
});

beforeEach(() => {
  vi.resetAllMocks();
  fetchStub.mockClear();
  window.sessionStorage.clear();
  vi.mocked(loadSources).mockResolvedValue(sources);
  vi.mocked(readPolicy).mockResolvedValue(policy());
  vi.stubGlobal("fetch", fetchStub);
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
  const shell = rendered.container.querySelector(".screen-only") as HTMLElement;
  const ui = within(shell);
  await waitFor(() =>
    expect(ui.getByRole("button", { name: "Search" })).toHaveAttribute(
      "aria-disabled",
      "false",
    ),
  );
  return { ...rendered, ui, shell };
}

/** Types into the search box, finds the narrow option by its accessible name, and chooses it by keyboard. */
async function chooseNarrowByKeyboard(
  ui: ReturnType<typeof within>,
  typed: string,
  optionName: RegExp,
) {
  const box = ui.getByRole("combobox", { name: "Search terms" });
  fireEvent.input(box, { target: { value: typed } });
  const option = await ui.findByRole("option", { name: optionName });
  const options = ui.getAllByRole("option");
  const index = options.indexOf(option);
  for (let i = 0; i <= index; i += 1)
    fireEvent.keyDown(box, { key: "ArrowDown" });
  fireEvent.keyDown(box, { key: "Enter" });
}

async function runSearch(ui: ReturnType<typeof within>, query: string) {
  const box = ui.getByRole("combobox", { name: "Search terms" });
  fireEvent.input(box, { target: { value: query } });
  fireEvent.click(ui.getByRole("button", { name: "Search" }));
  await ui.findAllByRole("button", { name: /Add to my citations/ });
}

describe("narrowing a Federal Register search by agency or topic, end to end (D-186, D-188)", () => {
  it("(i) chooses Narrow to this agency by keyboard, types words, and searches: version 3 and the id, the narrowed line and Remove button, the agency clause in Why shown, and another checked source says it is not narrowed", async () => {
    vi.mocked(search).mockImplementation(async (source, query) => {
      if (source === "federal-register")
        return response(
          [
            {
              ...citation("2099-00030", "Example Consultation Notice"),
              issuingBody: "Interior Department; Indian Affairs Bureau",
            },
          ],
          query,
          source,
        );
      return response([], query, source);
    });
    const { ui, container } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    await chooseNarrowByKeyboard(
      ui,
      "indian affairs",
      /^Narrow to this agency: Indian Affairs Bureau/,
    );
    expect(ui.getByRole("combobox", { name: "Search terms" })).toHaveValue("");
    await runSearch(ui, "consultation");

    const calls = vi.mocked(search).mock.calls;
    const frCall = calls.find((c) => c[0] === "federal-register")!;
    expect(frCall[1]).toBe("consultation");
    expect(frCall[4]).toMatchObject({
      version: 3,
      match: "text",
      agency: "indian-affairs-bureau",
    });
    expect(frCall[4]).not.toHaveProperty("topic");
    expect(calls.some((c) => c[0] === "govinfo")).toBe(true);

    expect(ui.getByRole("button", { name: "Remove narrowing" })).toBeTruthy();
    const results = container.querySelector(".pane-results") as HTMLElement;
    expect(results).toHaveTextContent(
      "Narrowed to the agency Indian Affairs Bureau, a Federal Register field.",
    );
    expect(results).toHaveTextContent(
      "listed by the Federal Register under the agency Indian Affairs Bureau",
    );
    expect(results).toHaveTextContent(
      "Not narrowed: the demo sends the agency or topic to the Federal Register only, so this source is searched without it.",
    );
  });

  it("(ii) no words and a topic: the request carries an empty q and the topic id, and the other checked source reads the not-searched sentence", async () => {
    vi.mocked(search).mockImplementation(async (source, query) => {
      if (source === "federal-register")
        return response(
          [
            {
              ...citation("2099-00031", "Example Lands Notice"),
              topics: ["Indians-lands", "Water supply"],
            },
          ],
          query,
          source,
        );
      return response([], query, source);
    });
    const { ui, container } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    await chooseNarrowByKeyboard(
      ui,
      "indians lands",
      /^Narrow to this topic: Indians-lands/,
    );
    const box = ui.getByRole("combobox", { name: "Search terms" });
    expect(box).toHaveValue("");
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    await ui.findAllByRole("button", { name: /Add to my citations/ });

    const calls = vi.mocked(search).mock.calls;
    const frCall = calls.find((c) => c[0] === "federal-register")!;
    expect(frCall[1]).toBe("");
    expect(frCall[4]).toMatchObject({
      version: 3,
      match: "text",
      topic: "indians-lands",
    });
    expect(calls.some((c) => c[0] === "govinfo")).toBe(false);

    const results = container.querySelector(".pane-results") as HTMLElement;
    expect(results).toHaveTextContent(
      "Not searched: no words were typed, and the demo narrows by agency or topic on the Federal Register only.",
    );
  });

  it("(iii) a returned row that does not state the agency is not shown, and the left-out sentence is", async () => {
    vi.mocked(search).mockImplementation(async (source, query) => {
      if (source === "federal-register")
        return response(
          [
            {
              ...citation("2099-00032", "Example Consultation Notice"),
              issuingBody: "Interior Department; Indian Affairs Bureau",
            },
            {
              ...citation("2099-00033", "Example Unrelated Notice"),
              issuingBody: "Example Department",
            },
          ],
          query,
          source,
        );
      return response([], query, source);
    });
    const { ui, container } = await start();
    await chooseNarrowByKeyboard(
      ui,
      "indian affairs",
      /^Narrow to this agency: Indian Affairs Bureau/,
    );
    await runSearch(ui, "consultation");

    const results = container.querySelector(".pane-results") as HTMLElement;
    expect(results).toHaveTextContent("Example Consultation Notice");
    expect(results).not.toHaveTextContent("Example Unrelated Notice");
    expect(results).toHaveTextContent(
      "1 listing the Federal Register returned does not state this agency in its own fields and is not shown.",
    );
  });

  it("(iv) Remove clears the line, and the next search sends no narrowing", async () => {
    vi.mocked(search).mockImplementation(async (source, query) =>
      response(
        source === "federal-register" ? [citation()] : [],
        query,
        source,
      ),
    );
    const { ui, container } = await start();
    await chooseNarrowByKeyboard(
      ui,
      "indian affairs",
      /^Narrow to this agency: Indian Affairs Bureau/,
    );
    const searchPane = container.querySelector(".pane-search") as HTMLElement;
    // The line states the setting and what it does not reach (review finding).
    const announcement = within(searchPane).getByText(
      /^Words searched on the Federal Register are narrowed/,
    );
    expect(announcement).toHaveAttribute("role", "status");
    expect(searchPane).toHaveTextContent(
      "Words searched on the Federal Register are narrowed to the agency Indian Affairs Bureau, a Federal Register field. Lookups, examples and issue searches are not narrowed.",
    );
    // Under the state scope it is one true sentence, never "narrowed to".
    fireEvent.click(ui.getByRole("button", { name: "State legislature" }));
    expect(searchPane).toHaveTextContent(
      "Narrowing to the agency Indian Affairs Bureau, a Federal Register field, is not applied to a state search; nothing is sent.",
    );
    expect(searchPane).not.toHaveTextContent("are narrowed to the agency");
    fireEvent.click(ui.getByRole("button", { name: "Federal sources" }));
    fireEvent.click(ui.getByRole("button", { name: "Remove narrowing" }));
    expect(ui.getByRole("combobox", { name: "Search terms" })).toHaveFocus();
    expect(announcement).toBeEmptyDOMElement();
    expect(searchPane).not.toHaveTextContent("Indian Affairs Bureau");

    await runSearch(ui, "consultation");
    const calls = vi.mocked(search).mock.calls;
    const frCall = calls.find((c) => c[0] === "federal-register")!;
    expect(frCall[4]).not.toHaveProperty("agency");
    expect(frCall[4]).not.toHaveProperty("topic");
    expect(frCall[4]).toMatchObject({ version: 2 });
  });

  it("(v) has no automated axe violations with the narrowing line showing", async () => {
    vi.mocked(search).mockImplementation(async (source, query) =>
      response([], query, source),
    );
    const { ui, shell } = await start();
    await chooseNarrowByKeyboard(
      ui,
      "indian affairs",
      /^Narrow to this agency: Indian Affairs Bureau/,
    );
    const results = await axe.run(shell, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations.map(({ id, help }) => ({ id, help }))).toEqual(
      [],
    );
  });
});
