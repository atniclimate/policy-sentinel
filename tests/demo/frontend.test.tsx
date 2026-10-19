import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiFailure, loadSources, readPolicy, search } from "../../demo/api";
import { App } from "../../demo/main";
import { loadPdfFonts, loadPdfSeal } from "../../demo/pdf-fonts";
import { buildPdf } from "../../src/demo/pdf";
import { emptyActors, STORAGE_KEY } from "../../src/demo/report-state";
import { keyOf } from "../../src/demo/validation";
import { NcaiVaultError, openNcaiDrafts } from "../../src/demo/ncai-vault";
import type { NcaiDraft } from "../../src/demo/ncai-2026";
import {
  nextSearchCursor,
  searchCriteria,
} from "../../src/demo/search-contract";
import {
  citation,
  deferred,
  listing,
  policy,
  searchResult,
  sources,
} from "./frontend-fixtures";
import type {
  DemoPolicyResponse,
  DemoSearchResponse,
  DemoSource,
} from "../../src/demo/types";

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

const ACTORS = {
  Name: "A. Example",
  Role: "Policy analyst",
  "Organization or Nation": "Example Organization",
  "Sharing with": "Example working group",
  Purpose: "Synthetic briefing.",
};
/** Stands in for the seal file the page fetches for the PDF. */
const SEAL_BYTES = new Uint8Array([137, 80, 78, 71]);
const NCAI_DRAFTS: readonly NcaiDraft[] = [
  {
    id: "PSC-26-001",
    title: "Example draft on water",
    sponsor: "Example Tribe",
    status: "Withdrawn",
    committee: "Example Committee",
    topics: ["water quality"],
    bills: ["hr 1234"],
  },
  {
    id: "PSC-26-002",
    title: "Example draft on forests",
    sponsor: "Example Council",
    status: "Out of Order",
  },
  {
    id: "PSC-26-003",
    title: "Example deferred draft",
    sponsor: "Example Council",
    status: "Deferred to next meeting",
  },
];
/** The same document from three sources: the Federal Register record and two other listings. */
const merged = { ...citation(), matchKey: "fr:2099-00001" };

beforeEach(() => {
  vi.resetAllMocks();
  window.sessionStorage.clear();
  vi.mocked(loadSources).mockResolvedValue(sources);
  vi.mocked(search).mockResolvedValue(searchResult());
  vi.mocked(readPolicy).mockResolvedValue(policy());
  vi.mocked(loadPdfFonts).mockResolvedValue(undefined);
  vi.mocked(loadPdfSeal).mockResolvedValue(SEAL_BYTES);
  vi.mocked(buildPdf).mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
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
    // Search stays focusable when it is off and says so with aria-disabled.
    expect(ui.getByRole("button", { name: "Search" })).toHaveAttribute(
      "aria-disabled",
      "false",
    ),
  );
  return { ...rendered, ui, shell: screenRoot };
}

async function showResult(ui: ReturnType<typeof within>, query = "water") {
  fireEvent.input(ui.getByRole("searchbox"), { target: { value: query } });
  fireEvent.click(ui.getByRole("button", { name: "Search" }));
  await ui.findAllByRole("button", { name: /Add to my citations/ });
}

/** Answer each source with its own listing of the same document. */
function answerBySource() {
  vi.mocked(search).mockImplementation(async (source, query) =>
    searchResult(
      [source === "federal-register" ? merged : listing(source as "govinfo")],
      query,
      source,
    ),
  );
}

function fillActors(ui: ReturnType<typeof within>) {
  for (const [label, value] of Object.entries(ACTORS))
    fireEvent.input(ui.getByLabelText(label), { target: { value } });
}

describe("demo browser state and report ownership", () => {
  it("lets only the latest search populate results", async () => {
    const first = deferred<DemoSearchResponse>();
    const second = deferred<DemoSearchResponse>();
    vi.mocked(search)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { ui } = await start();
    fireEvent.click(ui.getByRole("button", { name: "Executive Order 13175" }));
    fireEvent.click(
      ui.getByRole("button", { name: "Government-to-government consultation" }),
    );
    await act(async () => {
      second.resolve(
        searchResult(
          [citation("2099-00002", "Latest result")],
          "government-to-government consultation",
        ),
      );
    });
    await ui.findByRole("heading", { name: "Latest result" });
    await act(async () => {
      first.resolve(
        searchResult(
          [citation("2099-00001", "Stale result")],
          "Executive Order 13175",
        ),
      );
    });
    await waitFor(() =>
      expect(
        ui.queryByRole("heading", { name: "Stale result" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      ui.getByRole("heading", { name: "Latest result" }),
    ).toBeInTheDocument();
  });

  it("clears a pending search when the source changes", async () => {
    const request = deferred<DemoSearchResponse>();
    vi.mocked(search).mockReturnValue(request.promise);
    const { ui } = await start();
    fireEvent.click(ui.getByRole("button", { name: "Executive Order 13175" }));
    fireEvent.click(ui.getByRole("button", { name: "State legislature" }));
    await act(async () => {
      request.resolve(searchResult());
    });
    await waitFor(() =>
      expect(ui.getByRole("button", { name: "Search" })).toHaveAttribute(
        "aria-disabled",
        "false",
      ),
    );
    expect(
      ui.queryByRole("heading", { name: "Example Water Policy" }),
    ).not.toBeInTheDocument();
  });

  it("clears a pending search when a federal source is checked", async () => {
    const request = deferred<DemoSearchResponse>();
    vi.mocked(search).mockReturnValue(request.promise);
    const { ui } = await start();
    fireEvent.click(ui.getByRole("button", { name: "Executive Order 13175" }));
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    await act(async () => {
      request.resolve(searchResult());
    });
    await waitFor(() =>
      expect(ui.getByRole("button", { name: "Search" })).toHaveAttribute(
        "aria-disabled",
        "false",
      ),
    );
    expect(
      ui.queryByRole("heading", { name: "Example Water Policy" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the current detail when earlier policy reads settle late", async () => {
    const first = deferred<DemoPolicyResponse>();
    const second = deferred<DemoPolicyResponse>();
    const next = citation("2099-00002", "Second Policy");
    vi.mocked(search).mockResolvedValue(searchResult([citation(), next]));
    vi.mocked(readPolicy)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { ui, container } = await start();
    await showResult(ui);
    fireEvent.click(
      ui.getByRole("button", { name: "Show issues for Example Water Policy" }),
    );
    fireEvent.click(
      ui.getByRole("button", { name: "Show issues for Second Policy" }),
    );
    await act(async () => {
      second.resolve(policy("b", next));
    });
    await waitFor(() =>
      expect(container.querySelector(".policy-title")).toHaveTextContent(
        "Second Policy",
      ),
    );
    await act(async () => {
      first.resolve(policy());
    });
    await waitFor(() =>
      expect(container.querySelector(".receipt")).toHaveTextContent(
        "b".repeat(64),
      ),
    );
    expect(container.querySelector(".policy-title")).toHaveTextContent(
      "Second Policy",
    );
  });

  it("deduplicates reading, preserves notes despite citation-format drift, and reuses the cited snapshot for selections and print", async () => {
    const request = deferred<DemoPolicyResponse>();
    vi.mocked(readPolicy)
      .mockReturnValueOnce(request.promise)
      .mockResolvedValue(policy("b"));
    const { ui, container } = await start();
    await showResult(ui);
    fireEvent.click(
      ui.getByRole("button", { name: "Show issues for Example Water Policy" }),
    );
    fireEvent.click(ui.getByRole("button", { name: /Add to my citations/ }));
    const policyNote = await ui.findByLabelText("Note on this policy");
    fireEvent.input(policyNote, {
      target: { value: "Typed during retrieval." },
    });
    expect(readPolicy).toHaveBeenCalledTimes(1);
    await act(async () => {
      request.resolve(
        policy("a", { ...citation(), identifier: "FR Doc. 2099-00001" }),
      );
    });
    await ui.findByRole("checkbox", { name: "Include in PDF" });
    expect(policyNote).toHaveValue("Typed during retrieval.");
    fireEvent.click(ui.getByRole("checkbox", { name: "Include in PDF" }));
    fireEvent.input(ui.getByLabelText("Note on this passage"), {
      target: { value: "Bound to snapshot a." },
    });
    fireEvent.click(
      ui.getByRole("button", { name: "Show issues for Example Water Policy" }),
    );
    expect(readPolicy).toHaveBeenCalledTimes(1);
    const print = container.querySelector(".print-only") as HTMLElement;
    expect(print).toHaveTextContent("a".repeat(64));
    expect(print).toHaveTextContent("consultation in snapshot a.");
    expect(print).toHaveTextContent("Bound to snapshot a.");
    expect(print).toHaveTextContent("demo-rules-1.0.0");
    expect(print).toHaveTextContent("c".repeat(64));
    expect(print).not.toHaveTextContent("consultation in snapshot b.");
    expect(print).toHaveTextContent(citation().identifier);
    expect(ui.getByText(/Citation and text saved/)).toBeInTheDocument();
  });

  it("does not resurrect a removed citation when its read settles", async () => {
    const request = deferred<DemoPolicyResponse>();
    vi.mocked(readPolicy).mockReturnValue(request.promise);
    const { ui, container } = await start();
    await showResult(ui);
    fireEvent.click(ui.getByRole("button", { name: /Add to my citations/ }));
    fireEvent.click(
      await ui.findByRole("button", { name: "Remove: Example Water Policy" }),
    );
    await act(async () => {
      request.resolve(policy());
    });
    await waitFor(() =>
      expect(
        ui.queryByLabelText("Note on this policy"),
      ).not.toBeInTheDocument(),
    );
    expect(container.querySelector(".print-only")).not.toHaveTextContent(
      "Example Water Policy",
    );
  });

  it("clears passage marks and notes before a citation is added again", async () => {
    const { ui, container } = await start();
    await showResult(ui);
    fireEvent.click(ui.getByRole("button", { name: /Add to my citations/ }));
    await waitFor(() =>
      expect(ui.getByText(/Citation and text saved/)).toBeInTheDocument(),
    );
    fireEvent.click(
      ui.getByRole("button", { name: "Show issues for Example Water Policy" }),
    );
    fireEvent.click(
      await ui.findByRole("checkbox", { name: "Include in PDF" }),
    );
    fireEvent.input(ui.getByLabelText("Note on this passage"), {
      target: { value: "Old evidence note." },
    });
    fireEvent.click(
      ui.getByRole("button", { name: "Remove: Example Water Policy" }),
    );
    vi.mocked(readPolicy).mockResolvedValue(policy("b"));
    fireEvent.click(ui.getByRole("button", { name: /Add to my citations/ }));
    await waitFor(() => expect(readPolicy).toHaveBeenCalledTimes(2));
    fireEvent.click(
      ui.getByRole("button", { name: "Show issues for Example Water Policy" }),
    );
    expect(
      await ui.findByRole("checkbox", { name: "Include in PDF" }),
    ).not.toBeChecked();
    expect(container.querySelector(".print-only")).not.toHaveTextContent(
      "Old evidence note.",
    );
  });

  it("recovers malformed stored data and gives associated search validation", async () => {
    window.sessionStorage.setItem(STORAGE_KEY, "null");
    const { ui } = await start();
    // The notice is under the header, so it is seen whichever pane is in front.
    expect(
      ui
        .getByText(/saved citation list could not be restored/)
        .closest(".pane"),
    ).toBeNull();
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    expect(ui.getByRole("searchbox")).toHaveAttribute("aria-invalid", "true");
    expect(ui.getByRole("searchbox")).toHaveAttribute(
      "aria-describedby",
      "q-help q-error",
    );
    expect(ui.getByRole("alert")).toHaveTextContent(
      "between 2 and 200 characters",
    );
    expect(search).not.toHaveBeenCalled();
  });

  it("prints the current report when session storage fails and restores print focus", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    const { ui, container } = await start();
    await showResult(ui);
    fireEvent.click(ui.getByRole("button", { name: /Add to my citations/ }));
    const note = await ui.findByLabelText("Note on this policy");
    fireEvent.input(note, { target: { value: "Only in memory 中." } });
    expect(container.querySelector(".print-only")).toHaveTextContent(
      "Only in memory 中.",
    );
    expect(
      ui.getByText(/could not be saved in browser storage/),
    ).toBeInTheDocument();
    const print = ui.getByRole("button", { name: "Print view" });
    print.focus();
    window.dispatchEvent(new Event("beforeprint"));
    (note as HTMLElement).focus();
    window.dispatchEvent(new Event("afterprint"));
    expect(print).toHaveFocus();
    expect(container.querySelector(".print-only")).toHaveTextContent(
      "Only in memory 中.",
    );
  });

  it("reports catalog failure without a false Live badge and supports retry", async () => {
    vi.mocked(loadSources)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(sources);
    const { container } = render(<App />);
    const ui = within(container.querySelector(".screen-only") as HTMLElement);
    const retry = await ui.findByRole("button", {
      name: "Retry source availability",
    });
    expect(ui.queryByText("Live", { exact: true })).not.toBeInTheDocument();
    expect(ui.getByRole("button", { name: "Search" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    fireEvent.click(retry);
    await waitFor(() =>
      expect(ui.getByRole("button", { name: "Search" })).toHaveAttribute(
        "aria-disabled",
        "false",
      ),
    );
  });
});

describe("demo search scope and sources", () => {
  it("switches scope and searches the state chosen in the select", async () => {
    const { ui } = await start();
    expect(
      ui.getByRole("checkbox", { name: /Federal Register/ }),
    ).toBeChecked();
    fireEvent.click(ui.getByRole("button", { name: "State legislature" }));
    expect(
      ui.getByRole("button", { name: "State legislature" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(ui.queryByRole("checkbox")).not.toBeInTheDocument();
    const state = ui.getByLabelText("State") as HTMLSelectElement;
    expect([...state.options].map((option) => option.text)).toEqual([
      "Washington State Legislature",
      "Oregon Legislature",
    ]);

    // A state that is not available stays selectable and says why search is off.
    fireEvent.change(state, { target: { value: "oregon" } });
    const search_ = ui.getByRole("button", { name: "Search" });
    expect(search_).toHaveAttribute("aria-disabled", "true");
    expect(search_).toHaveAccessibleDescription(/Synthetic gap: not enabled\./);
    expect(ui.getByText("Not available")).toBeInTheDocument();

    fireEvent.change(state, { target: { value: "washington" } });
    vi.mocked(search).mockResolvedValue(
      searchResult([], "HB 1100", "washington"),
    );
    fireEvent.input(ui.getByRole("searchbox"), {
      target: { value: "HB 1100" },
    });
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    await ui.findByText(/Nothing matched/);
    expect(search).toHaveBeenCalledTimes(1);
    expect(vi.mocked(search).mock.calls[0].slice(0, 3)).toEqual([
      "washington",
      "HB 1100",
      1,
    ]);
  });

  it("runs a Washington example in the state scope", async () => {
    const { ui } = await start();
    vi.mocked(search).mockResolvedValue(
      searchResult([], "HB 1100", "washington"),
    );
    fireEvent.click(ui.getByRole("button", { name: "Washington HB 1100" }));
    await ui.findByText(/Nothing matched/);
    expect(vi.mocked(search).mock.calls[0][0]).toBe("washington");
    expect(ui.getByLabelText("State")).toHaveValue("washington");
  });

  it("searches every checked source and names the one that fails", async () => {
    vi.mocked(search).mockImplementation(async (source, query) => {
      if (source === "govinfo")
        throw new ApiFailure("Synthetic outage.", "source");
      return searchResult(
        [
          source === "federal-register"
            ? citation()
            : { ...listing("regulations", "2099-00009"), title: "Docket Copy" },
        ],
        query,
        source,
      );
    });
    const { ui } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    fireEvent.click(ui.getByRole("checkbox", { name: /Regulations\.gov/ }));
    await showResult(ui);
    expect(
      vi
        .mocked(search)
        .mock.calls.map((call) => call[0])
        .sort(),
    ).toEqual(["federal-register", "govinfo", "regulations"]);
    for (const call of vi.mocked(search).mock.calls)
      expect(call.slice(1, 3)).toEqual(["water", 1]);
    // The failure is reported by name and does not hide the other sources.
    expect(
      ui.getByRole("heading", { name: "Example Water Policy" }),
    ).toBeInTheDocument();
    expect(
      ui.getByRole("heading", { name: "Docket Copy" }),
    ).toBeInTheDocument();
    const announcement = ui.getByText("2 policies listed.").closest(".live");
    expect(announcement).toHaveAttribute("role", "status");
    const status = announcement?.closest(".pane-results");
    expect(status).toHaveTextContent("GovInfoUnavailable");
    expect(status).toHaveTextContent("Synthetic outage.");
    expect(status).not.toHaveTextContent("Nothing returned");
    expect(status).toHaveTextContent(
      "Federal Register1 listings loaded; 1 reported by source",
    );
  });

  it("distinguishes a valid zero response from an upstream error", async () => {
    vi.mocked(search).mockImplementation(async (source, query) => {
      if (source === "govinfo")
        throw new ApiFailure(
          "Synthetic upstream outage.",
          "source",
          "upstream_error",
          502,
          "error",
        );
      return searchResult(
        source === "regulations" ? [] : [citation()],
        query,
        source,
      );
    });
    const { ui, shell } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    fireEvent.click(ui.getByRole("checkbox", { name: /Regulations\.gov/ }));
    await showResult(ui);
    const outcomes = shell.querySelector(".source-outcomes");
    expect(outcomes).toHaveTextContent("GovInfoUnavailable");
    expect(outcomes).toHaveTextContent("Regulations.govNo matches");
    expect(outcomes).toHaveTextContent("Synthetic upstream outage.");
  });

  it("shows unavailable when every upstream source fails, not no matches", async () => {
    vi.mocked(search).mockImplementation(async (source) => {
      throw new ApiFailure("Synthetic outage from " + source + ".", "source");
    });
    const { ui } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    fireEvent.input(ui.getByRole("searchbox"), { target: { value: "water" } });
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    await ui.findByText(
      "The selected sources were unavailable. No empty result is established.",
    );
    expect(ui.getAllByText("Unavailable")).toHaveLength(2);
    expect(ui.queryByText("No matches")).not.toBeInTheDocument();
  });

  it("treats only a typed exact-reference not_found as no matches", async () => {
    vi.mocked(search).mockRejectedValue(
      new ApiFailure("No such bill.", "source", "not_found", 404, "live"),
    );
    const { ui } = await start();
    fireEvent.click(ui.getByRole("button", { name: "State legislature" }));
    fireEvent.input(ui.getByRole("searchbox"), {
      target: { value: "HB 1100" },
    });
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    await ui.findByText("No matches");
    expect(ui.queryByText("Unavailable")).not.toBeInTheDocument();
  });

  it("leaves the results alone when the scope already chosen is pressed again", async () => {
    const { ui } = await start();
    await showResult(ui);
    fireEvent.click(ui.getByRole("button", { name: "Federal sources" }));
    expect(
      ui.getByRole("heading", { name: "Example Water Policy" }),
    ).toBeInTheDocument();
  });

  it("clears the state search when a federal example cannot run", async () => {
    const bill = {
      ...citation(),
      sourceId: "washington",
      identifier: "HB 1100, 2025-26 biennium, as introduced",
      title: "Example State Bill",
    };
    vi.mocked(search).mockResolvedValue(
      searchResult([bill], "HB 1100", "washington"),
    );
    const { ui } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /Congress\.gov/ }));
    fireEvent.click(ui.getByRole("checkbox", { name: /Federal Register/ }));
    fireEvent.click(ui.getByRole("button", { name: "State legislature" }));
    await showResult(ui, "HB 1100");
    expect(
      ui.getByRole("heading", { name: "Example State Bill" }),
    ).toBeInTheDocument();
    // Only Congress.gov is checked, and these terms are not a bill reference.
    fireEvent.click(ui.getByRole("button", { name: "Executive Order 13175" }));
    expect(ui.getByRole("alert")).toHaveTextContent(
      "Congress.gov takes one bill reference",
    );
    expect(ui.getByRole("button", { name: "Federal sources" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      ui.queryByRole("heading", { name: "Example State Bill" }),
    ).not.toBeInTheDocument();
  });

  it("says the issuing body is not stated instead of a bare Not stated", async () => {
    vi.mocked(search).mockResolvedValue(
      searchResult([
        { ...citation(), issuingBody: "Not stated", textAvailable: false },
      ]),
    );
    const { ui, shell } = await start();
    await showResult(ui);
    const row = shell.querySelector(".result") as HTMLElement;
    expect(row).toHaveTextContent("Issuing body not stated");
    expect(within(row).queryByText("Not stated")).not.toBeInTheDocument();
    fireEvent.click(
      ui.getByRole("button", { name: "Show issues for Example Water Policy" }),
    );
    expect(shell.querySelector(".detail .row")).toHaveTextContent(
      "Issuing body not stated",
    );
  });

  it("names the Washington source the same way before the catalog answers", async () => {
    vi.mocked(loadSources).mockRejectedValue(new Error("offline"));
    const { container } = render(<App />);
    const ui = within(container.querySelector(".screen-only") as HTMLElement);
    await ui.findByRole("button", { name: "Retry source availability" });
    fireEvent.click(ui.getByRole("button", { name: "State legislature" }));
    const state = ui.getByLabelText("State") as HTMLSelectElement;
    expect(state.options[0].text).toBe("Washington State Legislature");
  });

  it("reports the reason once when every source fails", async () => {
    vi.mocked(search).mockRejectedValue(new ApiFailure("service", "service"));
    const { ui } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    fireEvent.input(ui.getByRole("searchbox"), { target: { value: "water" } });
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    expect(
      await ui.findAllByText(/The demo service did not answer/),
    ).toHaveLength(1);
    expect(ui.getAllByText("Unavailable")).toHaveLength(2);
  });

  it("keeps one row when one source lists the document twice, and names each listing", async () => {
    // Regulations.gov lists a joint rule once per agency docket.
    const dockets = ["EXA-2099-0001-0001", "EXB-2099-0002-0003"].map(
      (identifier) => ({ ...listing("regulations"), identifier }),
    );
    vi.mocked(search).mockImplementation(async (source, query) =>
      searchResult(
        source === "federal-register" ? [merged] : dockets,
        query,
        source,
      ),
    );
    const { ui, shell } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /Regulations\.gov/ }));
    await showResult(ui);
    expect(shell.querySelectorAll(".result")).toHaveLength(1);
    for (const docket of dockets)
      expect(
        ui.getByRole("link", {
          name: `Regulations.gov ${docket.identifier} listing of Example Water Policy`,
        }),
      ).toHaveTextContent(`Regulations.gov ${docket.identifier}`);
  });

  it("shows one row for a document several sources list, from the highest-precedence source", async () => {
    answerBySource();
    const { ui, shell } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /Regulations\.gov/ }));
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    await showResult(ui);
    expect(shell.querySelectorAll(".result")).toHaveLength(1);
    const row = ui
      .getByRole("heading", { name: "Example Water Policy" })
      .closest("li") as HTMLElement;
    // The Federal Register record is the row; the others stay linked, in precedence order.
    expect(row).toHaveTextContent(merged.identifier);
    expect(
      within(row).getByRole("link", { name: /^Open the official source/ }),
    ).toHaveAttribute("href", merged.officialUrl);
    expect(row).toHaveTextContent("Also listed byGovInfoRegulations.gov");
    expect(
      within(row).getByRole("link", {
        name: "GovInfo listing of Example Water Policy",
      }),
    ).toHaveAttribute("href", listing("govinfo").officialUrl);
    expect(
      within(row).getByRole("link", {
        name: "Regulations.gov listing of Example Water Policy",
      }),
    ).toHaveAttribute("href", listing("regulations").officialUrl);
    // One short sentence; the reason for the record shown is in the dialog.
    expect(
      ui.getByText(
        "2 duplicate listings were merged. Each document is one row; the other listings stay linked.",
      ),
    ).toBeInTheDocument();
    expect(ui.getByText("1 policy listed.")).toBeInTheDocument();
  });

  it("skips Congress.gov for terms that are not a bill reference, with a note", async () => {
    vi.mocked(search).mockImplementation(async (source, query) =>
      searchResult(source === "congress" ? [] : [citation()], query, source),
    );
    const { ui } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /Congress\.gov/ }));
    await showResult(ui);
    expect(vi.mocked(search).mock.calls.map((call) => call[0])).toEqual([
      "federal-register",
    ]);
    expect(ui.getByText(/^Congress\.gov was skipped\./)).toBeInTheDocument();
    expect(ui.getByText("Not searched")).toBeInTheDocument();

    // A bill reference is sent to Congress.gov as well.
    await showResult(ui, "hr 1234 119");
    expect(
      vi
        .mocked(search)
        .mock.calls.slice(1)
        .map((call) => call[0]),
    ).toEqual(["federal-register", "congress"]);
    expect(ui.queryByText("Not searched")).not.toBeInTheDocument();
  });

  it("shows the query error when Congress.gov is the only source and the terms are not a bill reference", async () => {
    const { ui } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /Congress\.gov/ }));
    fireEvent.click(ui.getByRole("checkbox", { name: /Federal Register/ }));
    fireEvent.input(ui.getByRole("searchbox"), { target: { value: "water" } });
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    expect(ui.getByRole("alert")).toHaveTextContent(
      "Congress.gov takes one bill reference",
    );
    expect(ui.getByRole("searchbox")).toHaveFocus();
    expect(search).not.toHaveBeenCalled();

    // With nothing checked the reason is stated and Search is off.
    fireEvent.click(ui.getByRole("checkbox", { name: /Congress\.gov/ }));
    expect(ui.getByRole("button", { name: "Search" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(
      ui.getByRole("button", { name: "Search" }),
    ).toHaveAccessibleDescription(/Check at least one live federal source/);
  });
});

describe("demo report, data actors and export", () => {
  it("keeps a merged result's other listings in the report", async () => {
    answerBySource();
    const { ui, container } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    fireEvent.click(ui.getByRole("checkbox", { name: /Regulations\.gov/ }));
    await showResult(ui);
    fireEvent.click(ui.getByRole("button", { name: /Add to my citations/ }));
    await ui.findByText(/Citation and text saved/);
    const entry = ui
      .getByLabelText("Note on this policy")
      .closest("li") as HTMLElement;
    expect(
      within(entry).getByRole("link", {
        name: "GovInfo listing of Example Water Policy",
      }),
    ).toBeInTheDocument();
    const stored = JSON.parse(
      window.sessionStorage.getItem(STORAGE_KEY) as string,
    );
    expect(stored.version).toBe(3);
    const [saved] = Object.values(stored.cited) as {
      citation: { matchKey: string };
      alternates: { sourceId: string }[];
    }[];
    expect(saved.citation.matchKey).toBe("fr:2099-00001");
    expect(saved.alternates.map((alternate) => alternate.sourceId)).toEqual([
      "govinfo",
      "regulations",
    ]);
    const print = container.querySelector(".print-only");
    expect(print).toHaveTextContent(
      `Also listed by GovInfo: ${listing("govinfo").officialUrl}`,
    );
    expect(print).toHaveTextContent(
      `Also listed by Regulations.gov: ${listing("regulations").officialUrl}`,
    );
  });

  it("holds export and print until the data actor entries are complete", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    // jsdom has no object URLs and does not follow a download link.
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:synthetic"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { ui, container } = await start();
    const exportButton = ui.getByRole("button", { name: "Export PDF" });
    const printButton = ui.getByRole("button", { name: "Print view" });

    // Nothing cited yet: the action names that first.
    fireEvent.click(exportButton);
    expect(
      ui.getByText("Add at least one policy to My Citations first."),
    ).toBeInTheDocument();

    await showResult(ui);
    fireEvent.click(ui.getByRole("button", { name: /Add to my citations/ }));
    await ui.findByText(/Citation and text saved/);

    fireEvent.click(exportButton);
    expect(
      ui.getByText(
        /Still missing: Name, Role, Organization or Nation, Sharing with, Purpose\./,
      ),
    ).toBeInTheDocument();
    expect(ui.getByLabelText("Name")).toHaveFocus();
    expect(ui.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(buildPdf).not.toHaveBeenCalled();
    // The browser's own print command cannot be held, so the gap is printed as a gap.
    expect(container.querySelector(".print-only")).toHaveTextContent(
      "Prepared by Not recorded",
    );

    fireEvent.input(ui.getByLabelText("Name"), {
      target: { value: ACTORS.Name },
    });
    expect(ui.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
    fireEvent.click(printButton);
    expect(
      ui.getByText(
        /Still missing: Role, Organization or Nation, Sharing with, Purpose\./,
      ),
    ).toBeInTheDocument();
    expect(ui.getByLabelText("Role")).toHaveFocus();
    expect(print).not.toHaveBeenCalled();

    // Spaces alone do not count as an entry.
    fillActors(ui);
    fireEvent.input(ui.getByLabelText("Purpose"), { target: { value: "  " } });
    fireEvent.click(printButton);
    expect(ui.getByLabelText("Purpose")).toHaveFocus();
    expect(print).not.toHaveBeenCalled();

    fillActors(ui);
    expect(ui.getByText("5 of 5")).toBeInTheDocument();
    fireEvent.click(printButton);
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    fireEvent.click(exportButton);
    await ui.findByText(
      "The PDF was built and sent to the browser's downloads.",
    );
    expect(buildPdf).toHaveBeenCalledTimes(1);
    const input = vi.mocked(buildPdf).mock.calls[0][0];
    expect(input.version).toBe("test-version");
    expect(input.actors).toEqual({
      name: ACTORS.Name,
      role: ACTORS.Role,
      organization: ACTORS["Organization or Nation"],
      sharingWith: ACTORS["Sharing with"],
      purpose: ACTORS.Purpose,
    });
    expect(input.entries).toHaveLength(1);
    expect(input.fonts).toBeUndefined();
    expect(loadPdfFonts).toHaveBeenCalledTimes(1);
    expect(input.seal).toBe(SEAL_BYTES);
    expect(container.querySelector(".print-only")).toHaveTextContent(
      "Prepared by A. Example, Policy analyst",
    );

    // A refused character is named with its code point so it can be found.
    vi.mocked(buildPdf).mockRejectedValueOnce(
      Object.assign(new Error("refused"), {
        name: "PdfEncodingError",
        character: "ʔ",
      }),
    );
    fireEvent.click(exportButton);
    await ui.findByText(/cannot display the character ʔ \(U\+0294\)/);
  });

  it("restores data actor entries from browser storage and saves edits", async () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 3,
        cited: {},
        marks: {},
        actors: {
          name: ACTORS.Name,
          role: ACTORS.Role,
          organization: ACTORS["Organization or Nation"],
          sharingWith: "",
          purpose: "",
        },
      }),
    );
    const { ui } = await start();
    expect(ui.getByLabelText("Name")).toHaveValue(ACTORS.Name);
    expect(ui.getByLabelText("Organization or Nation")).toHaveValue(
      "Example Organization",
    );
    expect(ui.getByLabelText("Sharing with")).toHaveValue("");
    expect(ui.getByText("3 of 5")).toBeInTheDocument();
    expect(ui.getByLabelText("Name")).toHaveAccessibleDescription("Entered");
    expect(ui.getByLabelText("Purpose")).toHaveAccessibleDescription(
      "Required",
    );
    fireEvent.input(ui.getByLabelText("Purpose"), {
      target: { value: ACTORS.Purpose },
    });
    await waitFor(() =>
      expect(
        JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) as string).actors
          .purpose,
      ).toBe(ACTORS.Purpose),
    );
  });
});

describe("demo keyboard focus and status messages", () => {
  it("keeps a button focusable while its own action runs", async () => {
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:synthetic"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const catalog = deferred<DemoSource[]>();
    vi.mocked(loadSources)
      .mockRejectedValueOnce(new Error("offline"))
      .mockReturnValueOnce(catalog.promise);
    const { container } = render(<App />);
    const ui = within(container.querySelector(".screen-only") as HTMLElement);
    // A button that sets the disabled attribute on itself drops keyboard focus.
    const busy = (button: HTMLElement) => {
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).not.toBeDisabled();
    };

    const retry = await ui.findByRole("button", {
      name: "Retry source availability",
    });
    fireEvent.click(retry);
    busy(retry);
    fireEvent.click(retry);
    expect(loadSources).toHaveBeenCalledTimes(2);
    await act(async () => {
      catalog.resolve(sources);
    });

    const searching = deferred<DemoSearchResponse>();
    vi.mocked(search).mockReturnValueOnce(searching.promise);
    const searchButton = ui.getByRole("button", { name: "Search" });
    fireEvent.input(ui.getByRole("searchbox"), { target: { value: "water" } });
    fireEvent.click(searchButton);
    busy(searchButton);
    fireEvent.click(searchButton);
    expect(search).toHaveBeenCalledTimes(1);
    await act(async () => {
      searching.resolve(searchResult());
    });
    const add = await ui.findByRole("button", { name: /^Add to my citations/ });
    expect(searchButton).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(add);
    await waitFor(() =>
      expect(add).toHaveAccessibleName("In my citations: Example Water Policy"),
    );
    busy(add);
    fireEvent.click(add);
    expect(ui.getAllByLabelText("Note on this policy")).toHaveLength(1);

    fillActors(ui);
    const building = deferred<Uint8Array>();
    vi.mocked(buildPdf).mockReturnValueOnce(building.promise);
    const exportButton = ui.getByRole("button", { name: "Export PDF" });
    exportButton.focus();
    fireEvent.click(exportButton);
    await waitFor(() => expect(buildPdf).toHaveBeenCalledTimes(1));
    busy(exportButton);
    fireEvent.click(exportButton);
    await act(async () => {
      building.resolve(new Uint8Array([37, 80, 68, 70]));
    });
    await ui.findByText(
      "The PDF was built and sent to the browser's downloads.",
    );
    expect(buildPdf).toHaveBeenCalledTimes(1);
    expect(exportButton).toHaveFocus();
    expect(exportButton).not.toHaveAttribute("aria-disabled", "true");
  });

  it("says why search is off when it is asked for", async () => {
    const { ui } = await start();
    const terms = () => ui.getByRole("searchbox");
    fireEvent.click(ui.getByRole("button", { name: "State legislature" }));
    fireEvent.change(ui.getByLabelText("State"), {
      target: { value: "oregon" },
    });
    // The reason is read with the field before anything is submitted.
    expect(terms()).toHaveAccessibleDescription(/Synthetic gap: not enabled\./);
    fireEvent.input(terms(), { target: { value: "HB 2001" } });
    fireEvent.submit(terms().closest("form") as HTMLFormElement);
    expect(ui.getByRole("alert")).toHaveTextContent(
      "Synthetic gap: not enabled.",
    );
    expect(terms()).toHaveFocus();
    expect(terms()).toHaveAttribute("aria-invalid", "true");
    expect(search).not.toHaveBeenCalled();
    // Choosing an available state retires the alert.
    fireEvent.change(ui.getByLabelText("State"), {
      target: { value: "washington" },
    });
    expect(ui.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.click(ui.getByRole("button", { name: "Federal sources" }));
    fireEvent.click(ui.getByRole("checkbox", { name: /Federal Register/ }));
    expect(terms()).toHaveAccessibleDescription(
      /Check at least one live federal source to search\./,
    );
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    expect(ui.getByRole("alert")).toHaveTextContent(
      "Check at least one live federal source to search.",
    );
    // The reason is on the page once, not as a note and an alert together.
    expect(
      ui.getAllByText("Check at least one live federal source to search."),
    ).toHaveLength(1);
    expect(terms()).toHaveFocus();
    expect(search).not.toHaveBeenCalled();
  });

  it("names the removed citation and moves focus to the list heading", async () => {
    vi.mocked(search).mockResolvedValue(
      searchResult([
        { ...citation(), textAvailable: false },
        { ...citation("2099-00002", "Second Policy"), textAvailable: false },
      ]),
    );
    const { ui } = await start();
    await showResult(ui);
    for (const add of ui.getAllByRole("button", {
      name: /^Add to my citations/,
    }))
      fireEvent.click(add);
    expect(ui.getAllByLabelText("Note on this policy")).toHaveLength(2);
    const heading = ui.getByRole("heading", { name: "My Citations" });
    fireEvent.click(
      ui.getByRole("button", { name: "Remove: Example Water Policy" }),
    );
    expect(
      ui.getByText(
        "Removed Example Water Policy, its selected passages, and its notes.",
      ),
    ).toBeInTheDocument();
    expect(heading).toHaveFocus();
    // A second removal changes the message, so it is announced as well.
    (
      ui.getByRole("button", { name: "Remove: Second Policy" }) as HTMLElement
    ).focus();
    fireEvent.click(ui.getByRole("button", { name: "Remove: Second Policy" }));
    expect(
      ui.getByText(
        "Removed Second Policy, its selected passages, and its notes.",
      ),
    ).toBeInTheDocument();
    expect(heading).toHaveFocus();
  });

  it("shows and announces citation messages outside every pane", async () => {
    const { ui } = await start();
    await showResult(ui);
    fireEvent.click(ui.getByRole("button", { name: /Add to my citations/ }));
    const saved = await ui.findByText(/Citation and text saved/);
    expect(saved.closest(".pane")).toBeNull();
    const region = saved.closest('[role="status"]') as HTMLElement;
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region.closest("main")).not.toBeNull();
  });

  it("says why a citation was not added once the list is full, outside every pane", async () => {
    const cited = Object.fromEntries(
      Array.from({ length: 50 }, (_, index) => {
        const entry = {
          ...citation(`2098-${String(index).padStart(5, "0")}`, "Saved"),
          textAvailable: false,
        };
        return [
          keyOf(entry),
          { citation: entry, policy: null, note: "", alternates: [] },
        ];
      }),
    );
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 3, cited, marks: {}, actors: emptyActors() }),
    );
    const { ui } = await start();
    await showResult(ui);
    fireEvent.click(ui.getByRole("button", { name: /^Add to my citations/ }));
    const refusal = ui.getByText(/My Citations holds up to 50 citations/);
    expect(refusal.closest(".pane")).toBeNull();
    expect(refusal.closest('[role="status"]')).not.toBeNull();
    expect(
      ui.getByRole("button", { name: "Report pane, 50" }),
    ).toBeInTheDocument();
  });

  it("prints once when Print view is pressed twice while the document faces load", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const faces = deferred<unknown>();
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { load: () => faces.promise },
    });
    try {
      const { ui } = await start();
      await showResult(ui);
      fireEvent.click(ui.getByRole("button", { name: /Add to my citations/ }));
      await ui.findByText(/Citation and text saved/);
      fillActors(ui);
      const printButton = ui.getByRole("button", { name: "Print view" });
      fireEvent.click(printButton);
      fireEvent.click(printButton);
      expect(ui.getByText("Preparing the print view.")).toBeInTheDocument();
      expect(print).not.toHaveBeenCalled();
      await act(async () => {
        faces.resolve(undefined);
      });
      await waitFor(() => expect(print).toHaveBeenCalled());
      expect(print).toHaveBeenCalledTimes(1);
      expect(
        ui.queryByText("Preparing the print view."),
      ).not.toBeInTheDocument();
      // The guard is released: a later press prints again.
      fireEvent.click(printButton);
      await waitFor(() => expect(print).toHaveBeenCalledTimes(2));
    } finally {
      delete (document as { fonts?: unknown }).fonts;
    }
  });

  it("ties each passage control and each policy note to what it belongs to", async () => {
    const { ui } = await start();
    await showResult(ui);
    fireEvent.click(ui.getByRole("button", { name: /Add to my citations/ }));
    await ui.findByText(/Citation and text saved/);
    fireEvent.click(
      ui.getByRole("button", { name: "Show issues for Example Water Policy" }),
    );
    const quote = "The Department invites consultation in snapshot a.";
    const include = await ui.findByRole("checkbox", { name: "Include in PDF" });
    expect(include).toHaveAccessibleDescription(quote);
    fireEvent.click(include);
    expect(
      ui.getByLabelText("Note on this passage"),
    ).toHaveAccessibleDescription(quote);
    expect(
      ui.getByLabelText("Note on this policy"),
    ).toHaveAccessibleDescription("Example Water Policy");
  });

  it("marks a failed text read as a problem and a source without text as a plain status", async () => {
    vi.mocked(readPolicy).mockRejectedValue(
      new ApiFailure("service", "service"),
    );
    vi.mocked(search).mockResolvedValue(
      searchResult([
        citation(),
        { ...citation("2099-00002", "Metadata Only"), textAvailable: false },
      ]),
    );
    const { ui, shell } = await start();
    await showResult(ui);
    const status = shell.querySelector(".pane-issues > .live") as HTMLElement;
    fireEvent.click(
      ui.getByRole("button", { name: "Show issues for Example Water Policy" }),
    );
    await waitFor(() =>
      expect(status).toHaveTextContent("The demo service did not answer."),
    );
    expect(status).toHaveClass("notice");
    fireEvent.click(
      ui.getByRole("button", { name: "Show issues for Metadata Only" }),
    );
    expect(status).toHaveTextContent(
      "The demo does not read the text of this source",
    );
    expect(status).not.toHaveClass("notice");
  });

  it("breaks each receipt digest at its midpoint and keeps its text whole", async () => {
    const { ui, container } = await start();
    await showResult(ui);
    fireEvent.click(
      ui.getByRole("button", { name: "Show issues for Example Water Policy" }),
    );
    await waitFor(() =>
      expect(container.querySelector(".receipt")).toBeInTheDocument(),
    );
    const digests = [...container.querySelectorAll(".receipt code")];
    expect(digests.map((code) => code.textContent)).toEqual([
      "a".repeat(64),
      "c".repeat(64),
    ]);
    for (const code of digests) {
      const breakAt = code.querySelector("wbr");
      expect(breakAt?.previousSibling?.textContent).toHaveLength(32);
      expect(breakAt?.nextSibling?.textContent).toHaveLength(32);
    }
  });

  it("keeps the Export block out of the Report pane's scroll area", async () => {
    const { ui } = await start();
    const exportBlock = ui.getByRole("region", { name: "Export" });
    expect(exportBlock.parentElement).toHaveClass("pane-report");
    expect(exportBlock.closest(".pane-scroll")).toBeNull();
    for (const label of ["Name", "Purpose"])
      expect(ui.getByLabelText(label).closest(".pane-scroll")).not.toBeNull();
    expect(
      ui.getByRole("heading", { name: "My Citations" }).closest(".pane-scroll"),
    ).not.toBeNull();
  });

  it("sets a typed note apart from the placeholder in the print view", async () => {
    const { ui, container } = await start();
    await showResult(ui);
    fireEvent.click(ui.getByRole("button", { name: /Add to my citations/ }));
    const note = await ui.findByLabelText("Note on this policy");
    const printed = () =>
      container.querySelector(".print-only .doc-note") as HTMLElement;
    expect(printed()).toHaveTextContent("No note added.");
    expect(printed()).toHaveClass("is-empty");
    fireEvent.input(note, { target: { value: "Compare with last year." } });
    expect(printed()).toHaveTextContent("Compare with last year.");
    expect(printed()).not.toHaveClass("is-empty");
  });

  it("keeps the pane that holds focus in front when the window narrows", async () => {
    type Listener = (event: { matches: boolean }) => void;
    const queries = new Map<
      string,
      { matches: boolean; listeners: Set<Listener> }
    >();
    const holder = window as { matchMedia?: unknown };
    holder.matchMedia = (query: string) => {
      const entry = queries.get(query) ?? {
        matches: true,
        listeners: new Set(),
      };
      queries.set(query, entry);
      return {
        get matches() {
          return entry.matches;
        },
        addEventListener: (_type: string, listener: Listener) =>
          entry.listeners.add(listener),
        removeEventListener: (_type: string, listener: Listener) =>
          entry.listeners.delete(listener),
      };
    };
    const watched = (query: string) => {
      const entry = queries.get(query);
      if (!entry) throw new Error(`The page does not watch ${query}`);
      return entry;
    };
    const report = (query: string) =>
      act(() => {
        for (const listener of watched(query).listeners)
          listener({ matches: false });
      });
    try {
      const { ui, shell } = await start();
      // All four panes show; the third column would hold Issues once narrowed.
      expect(shell).toHaveAttribute("data-pane", "issues");
      const name = ui.getByLabelText("Name");
      name.focus();
      // The media change is reported while focus is still in the pane.
      watched("(min-width: 100rem)").matches = false;
      report("(min-width: 100rem)");
      expect(shell).toHaveAttribute("data-pane", "report");
      expect(name).toHaveFocus();

      // Chrome's order: the narrower layout takes focus first, then reports the change.
      const terms = ui.getByRole("searchbox");
      terms.focus();
      watched("(min-width: 64rem)").matches = false;
      act(() => terms.blur());
      expect(shell).toHaveAttribute("data-pane", "search");
      expect(terms).toHaveFocus();
      report("(min-width: 64rem)");
      expect(shell).toHaveAttribute("data-pane", "search");
      expect(terms).toHaveFocus();

      // Leaving a field with no change of layout moves nothing.
      act(() => terms.blur());
      expect(terms).not.toHaveFocus();
      expect(shell).toHaveAttribute("data-pane", "search");
    } finally {
      delete holder.matchMedia;
    }
  });
});

describe("demo frame: panes, dialog and theme", () => {
  it("shows the seal beside the title and opens the print view cover with it", async () => {
    const { ui, container } = await start();
    const name = "Affiliated Tribes of Northwest Indians";
    const seal = ui.getByRole("img", { name });
    expect(seal.closest("header")).not.toBeNull();
    expect(seal.getAttribute("src")).toMatch(/atni-seal-on-dark\.png$/);
    // A stated size keeps the header from moving as the image loads.
    expect(seal).toHaveAttribute("width", "32");
    expect(seal).toHaveAttribute("height", "32");
    // The seal is beside the heading, not part of its name.
    expect(ui.getByRole("heading", { level: 1 })).toHaveTextContent(
      /^Policy Sentinel/,
    );
    const cover = container.querySelector(".print-only")?.firstElementChild;
    expect(cover).toHaveAttribute("src", seal.getAttribute("src"));
    expect(cover).toHaveAttribute("alt", name);
  });

  it("brings the pane in use to the front and counts results and citations", async () => {
    const { ui, shell } = await start();
    expect(shell).toHaveAttribute("data-pane", "search");
    expect(ui.getByRole("button", { name: "Search pane" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      ui.getByRole("button", { name: "Report pane, 0" }),
    ).toBeInTheDocument();
    await showResult(ui);
    expect(shell).toHaveAttribute("data-pane", "results");
    // The Search pane is now hidden, so focus follows to the pane in front.
    expect(shell.querySelector(".pane-results")).toHaveFocus();
    expect(ui.getByRole("button", { name: "Results pane, 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(ui.getByRole("button", { name: /Add to my citations/ }));
    expect(
      ui.getByRole("button", { name: "Report pane, 1" }),
    ).toBeInTheDocument();
    fireEvent.click(
      ui.getByRole("button", { name: "Show issues for Example Water Policy" }),
    );
    expect(shell).toHaveAttribute("data-pane", "issues");
    expect(shell.querySelector(".pane-issues")).toHaveFocus();
    fireEvent.click(ui.getByRole("button", { name: "Report pane, 1" }));
    expect(shell).toHaveAttribute("data-pane", "report");
  });

  it("shows every NCAI draft's verbatim status in its menu entry", async () => {
    vi.mocked(openNcaiDrafts).mockResolvedValue(NCAI_DRAFTS);
    const { ui, container } = await start();
    fireEvent.click(ui.getByRole("button", { name: "NCAI" }));
    const gate = within(container.querySelector(".gate") as HTMLElement);
    fireEvent.input(gate.getByLabelText("Access password"), {
      target: { value: "synthetic" },
    });
    fireEvent.click(gate.getByRole("button", { name: "Open" }));
    await waitFor(() => {
      for (const draft of NCAI_DRAFTS) {
        const item = ui.getByRole("button", {
          name: new RegExp(`${draft.id}.*${draft.status}`),
        });
        expect(item.querySelector(".help")?.textContent).toBe(
          ` (${draft.status})`,
        );
      }
    });
  });

  it("offers reader-selected state research without searching or inferring a state", async () => {
    vi.mocked(openNcaiDrafts).mockResolvedValue(NCAI_DRAFTS);
    const { ui, container } = await start();
    fireEvent.click(ui.getByRole("button", { name: "NCAI" }));
    const gate = within(container.querySelector(".gate") as HTMLElement);
    fireEvent.input(gate.getByLabelText("Access password"), {
      target: { value: "synthetic" },
    });
    fireEvent.click(gate.getByRole("button", { name: "Open" }));
    fireEvent.click(await ui.findByRole("button", { name: /PSC-26-001/ }));
    const state = ui.getByRole("combobox", { name: "State to research" });
    expect(state).toHaveValue("");
    expect(ui.getByLabelText("Policy context terms to copy")).toHaveValue(
      "water quality",
    );
    fireEvent.change(state, { target: { value: "WA" } });
    const link = ui.getByRole("link", {
      name: "Washington: Appellate opinion search",
    });
    expect(link).toHaveAttribute("href", "https://www.courts.wa.gov/opinions/");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
    expect(search).not.toHaveBeenCalled();
    fireEvent.change(state, { target: { value: "OR" } });
    expect(
      within(container.querySelector(".ncai") as HTMLElement).getByRole(
        "status",
      ),
    ).toHaveTextContent("source access terms remain unresolved");
    expect(
      ui.queryByRole("link", { name: "Washington: Appellate opinion search" }),
    ).toBeNull();
    expect(search).not.toHaveBeenCalled();
    fireEvent.click(
      ui.getByRole("button", { name: "Federal public laws: water quality" }),
    );
    await waitFor(() =>
      expect(search).toHaveBeenCalledWith(
        "govinfo",
        "collection:PLAW AND lawtype:public AND (water quality)",
        1,
        expect.any(AbortSignal),
        expect.any(Object),
      ),
    );
  });

  it.each(["", "   "])(
    "prompts for a blank NCAI password (%j) without decrypting",
    async (password) => {
      const { ui, container } = await start();
      fireEvent.click(ui.getByRole("button", { name: "NCAI" }));
      const gate = within(container.querySelector(".gate") as HTMLElement);
      const input = gate.getByLabelText("Access password");
      fireEvent.input(input, { target: { value: password } });
      fireEvent.click(gate.getByRole("button", { name: "Open" }));
      expect(gate.getByRole("alert")).toHaveTextContent(
        "Enter the access password",
      );
      expect(input).toHaveFocus();
      expect(openNcaiDrafts).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["success", false],
    ["failure", false],
    ["success", true],
    ["failure", true],
  ] as const)(
    "ignores a cancelled NCAI unlock's late %s (reopened: %s)",
    async (outcome, reopen) => {
      const pending = deferred<readonly NcaiDraft[]>();
      vi.mocked(openNcaiDrafts).mockReturnValueOnce(pending.promise);
      const { ui, container } = await start();
      const opener = ui.getByRole("button", { name: "NCAI" });
      fireEvent.click(opener);
      const dialog = container.querySelector(".gate") as HTMLDialogElement;
      const gate = within(dialog);
      fireEvent.input(gate.getByLabelText("Access password"), {
        target: { value: "synthetic" },
      });
      fireEvent.click(gate.getByRole("button", { name: "Open" }));
      expect(openNcaiDrafts).toHaveBeenCalledOnce();
      // jsdom does not perform Escape's native dialog close; reproduce its events.
      fireEvent(dialog, new Event("cancel", { cancelable: true }));
      dialog.removeAttribute("open");
      fireEvent(dialog, new Event("close"));
      if (reopen) fireEvent.click(opener);
      const focusTarget = reopen
        ? gate.getByRole("button", { name: "Close" })
        : opener;
      focusTarget.focus();
      await act(async () => {
        if (outcome === "success") pending.resolve(NCAI_DRAFTS);
        else pending.reject(new NcaiVaultError("wrong_password"));
        await pending.promise.catch(() => {});
      });
      expect(dialog.open).toBe(reopen);
      expect(container.querySelector(".ncai-menu")).toBeNull();
      expect(gate.queryByRole("alert")).toBeNull();
      expect(focusTarget).toHaveFocus();
    },
  );

  it("keeps unavailable example, area and NCAI panel chips focusable with an explained, guarded action", async () => {
    vi.mocked(loadSources).mockResolvedValue(
      sources.map((source) =>
        source.id === "federal-register"
          ? source
          : { ...source, status: "not_available" },
      ),
    );
    vi.mocked(openNcaiDrafts).mockResolvedValue(NCAI_DRAFTS);
    const { ui, container } = await start();
    fireEvent.click(ui.getByRole("button", { name: "NCAI" }));
    const gate = within(container.querySelector(".gate") as HTMLElement);
    fireEvent.input(gate.getByLabelText("Access password"), {
      target: { value: "synthetic" },
    });
    fireEvent.click(gate.getByRole("button", { name: "Open" }));
    fireEvent.click(await ui.findByRole("button", { name: /PSC-26-001/ }));
    fireEvent.click(ui.getByRole("checkbox", { name: /Federal Register/ }));
    fireEvent.change(ui.getByLabelText("Policy area (NCAI committee)"), {
      target: { value: "0" },
    });
    for (const selector of [
      "#examples-off",
      "#ncai-area-off",
      "#ncai-search-off",
    ]) {
      const reason = container.querySelector(selector) as HTMLElement;
      expect(reason).toBeInTheDocument();
      const chips = container.querySelectorAll<HTMLButtonElement>(
        `button[aria-describedby="${reason.id}"]`,
      );
      expect(chips.length).toBeGreaterThan(0);
      for (const chip of chips) {
        expect(chip).not.toBeDisabled();
        expect(chip).toHaveAttribute("aria-disabled", "true");
        expect(chip).toHaveAccessibleDescription(
          "Off: the source is not available or not checked.",
        );
        chip.focus();
        expect(chip).toHaveFocus();
        fireEvent.click(chip);
      }
    }
    expect(search).not.toHaveBeenCalled();
    expect(ui.getByRole("searchbox")).toHaveValue("");
  });

  it("closes the NCAI menu when focus or a click lands outside, and refocuses a re-picked draft", async () => {
    vi.mocked(openNcaiDrafts).mockResolvedValue([
      {
        id: "PSC-26-001",
        title: "Example draft on water",
        sponsor: "Example Tribe",
        status: "In order",
        committee: "Land Committee",
        topics: ["water quality"],
      },
    ]);
    const { ui, container } = await start();
    fireEvent.click(ui.getByRole("button", { name: "NCAI" }));
    const gate = within(container.querySelector(".gate") as HTMLElement);
    fireEvent.input(gate.getByLabelText("Access password"), {
      target: { value: "synthetic" },
    });
    fireEvent.click(gate.getByRole("button", { name: "Open" }));
    const menu = await waitFor(() => {
      const found = container.querySelector<HTMLDetailsElement>(".ncai-menu");
      expect(found?.open).toBe(true);
      return found as HTMLDetailsElement;
    });
    const item = within(menu).getByRole("button", { name: /PSC-26-001/ });
    const heading = () => container.querySelector("#ncai-h");
    fireEvent.click(item);
    await waitFor(() => expect(heading()).toHaveFocus());
    expect(menu.open).toBe(false);
    // Picking the same draft again still moves focus out of the closed menu.
    menu.open = true;
    item.focus();
    fireEvent.click(item);
    expect(heading()).toHaveFocus();
    expect(menu.open).toBe(false);
    // Focus or a click outside closes the open menu.
    menu.open = true;
    ui.getByRole("searchbox").focus();
    expect(menu.open).toBe(false);
    menu.open = true;
    fireEvent.pointerDown(document.body);
    expect(menu.open).toBe(false);
    menu.open = true;
    fireEvent.pointerDown(item);
    expect(menu.open).toBe(true);
  });

  it("opens About and Limits, closes it and returns focus to the button", async () => {
    const { ui, container } = await start();
    const opener = ui.getByRole("button", { name: "About and Limits" });
    const dialog = container.querySelector("dialog") as HTMLDialogElement;
    expect(dialog).not.toHaveAttribute("open");
    opener.focus();
    fireEvent.click(opener);
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleName("About and Limits");
    const about = within(dialog);
    // Limits, sources, privacy and the framework notice are all in the dialog.
    expect(about.getByText(/This is not legal advice/)).toBeInTheDocument();
    expect(
      about.getByText(/no tracking, analytics, or cookies/),
    ).toBeInTheDocument();
    expect(about.getByText("Oregon Legislature")).toBeInTheDocument();
    expect(about.getByText("Synthetic gap: not enabled.")).toBeInTheDocument();
    // Which record a merged row shows, and why, is stated here once.
    expect(
      about.getAllByText(
        /because the demo can read and check its official text/,
      ),
    ).toHaveLength(1);
    expect(
      about.getByText(
        /Otherwise it is the GovInfo record, then the Regulations\.gov record\./,
      ),
    ).toBeInTheDocument();
    // Tier 0 is explained where the framework is named.
    expect(
      about.getByText(/Tier 0 is the framework's open tier/),
    ).toBeInTheDocument();
    const framework = about.getByRole("link", {
      name: "Tiered Sovereign Data Framework 0.9.8",
    });
    expect(framework).toHaveAttribute(
      "href",
      "https://atniclimate.github.io/TieredSovereignDataFramework/#overview",
    );
    expect(framework).toHaveAttribute("target", "_blank");
    expect(framework).toHaveAttribute("rel", "noopener noreferrer");
    about.getByRole("button", { name: "Close" }).focus();
    fireEvent.click(about.getByRole("button", { name: "Close" }));
    expect(dialog).not.toHaveAttribute("open");
    expect(opener).toHaveFocus();

    fireEvent.click(opener);
    expect(dialog).toHaveAttribute("open");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(dialog).not.toHaveAttribute("open");
    expect(opener).toHaveFocus();
  });

  it("switches the theme, remembers it for the tab and honors the address", async () => {
    const first = await start();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    fireEvent.click(first.ui.getByRole("button", { name: "Light theme" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(
      first.ui.getByRole("button", { name: "Dark theme" }),
    ).toBeInTheDocument();
    cleanup();

    const second = await start();
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    fireEvent.click(second.ui.getByRole("button", { name: "Dark theme" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    cleanup();

    window.history.replaceState(null, "", "?theme=light");
    try {
      await start();
      expect(document.documentElement).toHaveAttribute("data-theme", "light");
    } finally {
      window.history.replaceState(null, "", window.location.pathname);
    }
  });

  it("keeps working when the theme cannot be remembered", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    const { ui } = await start();
    fireEvent.click(ui.getByRole("button", { name: "Light theme" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });
});

describe("demo dates and explicit continuation", () => {
  function page(
    source: string,
    query: string,
    number: number,
    results: ReturnType<typeof citation>[],
    more: boolean,
    options = {
      dateFrom: null as string | null,
      dateTo: null as string | null,
      continuation: null as
        import("../../src/demo/types").DemoSearchCursor | null,
    },
  ): DemoSearchResponse {
    const criteria = searchCriteria(source, query, number, options);
    return {
      ...searchResult(results, query, source),
      page: number,
      criteria,
      total: 80,
      continuation: more
        ? {
            kind: "more",
            next: nextSearchCursor(
              criteria,
              source === "govinfo" ? "cursor-" + number : null,
            ),
          }
        : { kind: "stopped", reason: "complete" },
    };
  }

  function dates(ui: ReturnType<typeof within>, from: string, to: string) {
    fireEvent.input(ui.getByLabelText("From date"), {
      target: { value: from },
    });
    fireEvent.input(ui.getByLabelText("Through date"), {
      target: { value: to },
    });
  }

  it("validates paired dates before calling sources and retains submitted criteria during edits", async () => {
    const { ui } = await start();
    fireEvent.input(ui.getByRole("searchbox"), { target: { value: "water" } });
    dates(ui, "2025-01-01", "");
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    expect(search).not.toHaveBeenCalled();
    expect(ui.getByRole("alert")).toHaveTextContent("Enter both dates");
    dates(ui, "2025-12-31", "2025-01-01");
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    expect(search).not.toHaveBeenCalled();
    dates(ui, "2025-01-01", "2025-12-31");
    await showResult(ui);
    expect(vi.mocked(search).mock.calls[0][4]).toEqual({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      continuation: null,
    });
    fireEvent.input(ui.getByRole("searchbox"), {
      target: { value: "draft terms" },
    });
    dates(ui, "2024-01-01", "2024-12-31");
    expect(
      ui.getByText("Dates: 2025-01-01 through 2025-12-31, inclusive."),
    ).toBeInTheDocument();
    expect(ui.queryByText(/Dates: 2024/)).not.toBeInTheDocument();
  });

  it("skips Congress and ambiguous dated GovInfo while sending supported sources, and hides state dates", async () => {
    const { ui } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /Congress\.gov/ }));
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    dates(ui, "2025-01-01", "2025-12-31");
    await showResult(ui, "water OR fish");
    expect(vi.mocked(search).mock.calls.map((call) => call[0])).toEqual([
      "federal-register",
    ]);
    expect(ui.getAllByText("Not searched")).toHaveLength(2);
    expect(
      ui.getByText(/GovInfo was not searched with this date range/),
    ).toBeInTheDocument();
    fireEvent.click(ui.getByRole("button", { name: "State legislature" }));
    expect(ui.queryByLabelText("From date")).not.toBeInTheDocument();
    expect(
      ui.getByRole("link", { name: /Search topics on the Washington/ }),
    ).toHaveAttribute("href", "https://app.leg.wa.gov/bi/Tld/");
  });

  it("keeps rows, continuation and focus on a failed page, prevents double clicks, then retries explicitly", async () => {
    const pendingPage = deferred<DemoSearchResponse>();
    vi.mocked(search)
      .mockResolvedValueOnce(
        page("federal-register", "water", 1, [citation()], true),
      )
      .mockReturnValueOnce(pendingPage.promise)
      .mockResolvedValueOnce(
        page(
          "federal-register",
          "water",
          2,
          [citation(), citation("2099-00002", "Next policy")],
          false,
        ),
      );
    const { ui, shell } = await start();
    await showResult(ui);
    const more = ui.getByRole("button", { name: "Load more Federal Register" });
    more.focus();
    fireEvent.click(more);
    fireEvent.click(more);
    expect(search).toHaveBeenCalledTimes(2);
    expect(more).toHaveAttribute("aria-disabled", "true");
    expect(more.closest('[role="status"]')).toBeNull();
    await act(async () =>
      pendingPage.reject(
        new ApiFailure("Synthetic next-page outage.", "source"),
      ),
    );
    await ui.findByText(/the next page failed/);
    expect(shell.querySelectorAll(".result")).toHaveLength(1);
    expect(more).toHaveFocus();
    expect(more).toHaveAttribute("aria-disabled", "false");
    const originalRow = shell.querySelector(".result");
    fireEvent.click(more);
    await ui.findByRole("heading", { name: "Next policy" });
    expect(vi.mocked(search).mock.calls[2][4]?.continuation).toEqual(
      vi.mocked(search).mock.calls[1][4]?.continuation,
    );
    expect(shell.querySelectorAll(".result")).toHaveLength(2);
    expect(shell.querySelector(".result")).toBe(originalRow);
    expect(more).toHaveFocus();
    expect(more).toHaveAttribute("aria-disabled", "true");
    expect(ui.getByText(/2 listings loaded; 80 reported/)).toBeInTheDocument();
  });

  it("allows a new dated submission during initial loading and ignores its late predecessor", async () => {
    const old = deferred<DemoSearchResponse>();
    vi.mocked(search)
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(
        searchResult([citation("2099-00002", "New dated result")], "new water"),
      );
    const { ui } = await start();
    fireEvent.input(ui.getByRole("searchbox"), {
      target: { value: "old water" },
    });
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    const oldSignal = vi.mocked(search).mock.calls[0][3];
    dates(ui, "2025-01-01", "2025-12-31");
    fireEvent.input(ui.getByRole("searchbox"), {
      target: { value: "new water" },
    });
    expect(ui.getByRole("button", { name: "Search" })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    await ui.findByRole("heading", { name: "New dated result" });
    expect(oldSignal?.aborted).toBe(true);
    await act(async () =>
      old.resolve(
        searchResult([citation("2099-00003", "Old result")], "old water"),
      ),
    );
    expect(
      ui.queryByRole("heading", { name: "Old result" }),
    ).not.toBeInTheDocument();
  });

  it("ignores a late page after a replacement search or source change", async () => {
    const late = deferred<DemoSearchResponse>();
    vi.mocked(search)
      .mockResolvedValueOnce(
        page("federal-register", "water", 1, [citation()], true),
      )
      .mockReturnValueOnce(late.promise)
      .mockResolvedValueOnce(
        searchResult([citation("2099-00002", "Replacement result")], "fish"),
      );
    const { ui } = await start();
    await showResult(ui);
    fireEvent.click(
      ui.getByRole("button", { name: "Load more Federal Register" }),
    );
    await showResult(ui, "fish");
    await act(async () =>
      late.resolve(
        page(
          "federal-register",
          "water",
          2,
          [citation("2099-00003", "Late append")],
          false,
        ),
      ),
    );
    expect(
      ui.getByRole("heading", { name: "Replacement result" }),
    ).toBeInTheDocument();
    expect(
      ui.queryByRole("heading", { name: "Late append" }),
    ).not.toBeInTheDocument();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    expect(
      ui.queryByRole("heading", { name: "Replacement result" }),
    ).not.toBeInTheDocument();
  });

  it("promotes a saved GovInfo row in place without a duplicate citation or lost notes", async () => {
    const gov = { ...listing("govinfo"), title: "GovInfo snapshot" };
    const fr = { ...merged, title: "Federal Register listing" };
    vi.mocked(search).mockImplementation(
      async (source, query, number, _signal, options) =>
        page(
          source,
          query,
          number,
          source === "govinfo"
            ? [gov]
            : number === 1
              ? [citation("2099-00002", "Other record")]
              : [fr],
          source === "federal-register" && number === 1,
          options,
        ),
    );
    const { ui, shell, container } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    await showResult(ui);
    fireEvent.click(
      ui.getByRole("button", { name: "Add to my citations: GovInfo snapshot" }),
    );
    const note = ui.getByRole("textbox", { name: "Note on this policy" });
    fireEvent.input(note, { target: { value: "Keep the original evidence." } });
    const row = ui
      .getByRole("heading", { name: "GovInfo snapshot", level: 3 })
      .closest(".result");
    const detailButton = within(row as HTMLElement).getByRole("button", {
      name: /^Show issues/,
    });
    detailButton.focus();
    fireEvent.click(
      ui.getByRole("button", { name: "Load more Federal Register" }),
    );
    await ui.findByRole("heading", { name: "Federal Register listing" });
    const promoted = ui
      .getByRole("heading", { name: "Federal Register listing" })
      .closest(".result");
    expect(promoted).toBe(row);
    expect(detailButton).toBeInTheDocument();
    expect(shell.querySelectorAll(".result")).toHaveLength(2);
    const cited = ui.getByRole("button", {
      name: "In my citations: Federal Register listing",
    });
    fireEvent.click(cited);
    expect(
      ui.getAllByRole("textbox", { name: "Note on this policy" }),
    ).toHaveLength(1);
    expect(note).toHaveValue("Keep the original evidence.");
    expect(container.querySelector(".print-only")).toHaveTextContent(
      "GovInfo snapshot",
    );
    fireEvent.click(detailButton);
    expect(shell.querySelector(".policy-title")).toHaveTextContent(
      "GovInfo snapshot",
    );
    expect(
      ui.getByText(/Showing the saved metadata-only citation/),
    ).toBeInTheDocument();
    expect(
      ui.queryByText("Add the policy to My Citations first."),
    ).not.toBeInTheDocument();
    expect(note).toHaveValue("Keep the original evidence.");
    expect(readPolicy).not.toHaveBeenCalled();
  });

  it("opens the saved metadata snapshot through an exact alternate when its legacy match key is absent", async () => {
    const saved = {
      ...listing("govinfo"),
      title: "Legacy GovInfo snapshot",
      matchKey: null,
    };
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 3,
        cited: {
          [keyOf(saved)]: {
            citation: saved,
            policy: null,
            note: "Keep the legacy evidence.",
            alternates: [],
          },
        },
        marks: {},
        actors: emptyActors(),
      }),
    );
    answerBySource();
    const { ui, shell } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    fireEvent.input(ui.getByRole("searchbox"), { target: { value: "water" } });
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    await ui.findByRole("button", { name: /^In my citations:/ });
    const row = shell.querySelector(".result") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: /^Show issues/ }));
    expect(shell.querySelector(".policy-title")).toHaveTextContent(saved.title);
    expect(
      ui.getByText(/Showing the saved metadata-only citation/),
    ).toBeInTheDocument();
    expect(
      ui.getByRole("textbox", { name: "Note on this policy" }),
    ).toHaveValue("Keep the legacy evidence.");
    expect(readPolicy).not.toHaveBeenCalled();
    expect(
      JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)!).cited[
        keyOf(saved)
      ].citation,
    ).toEqual(saved);
  });

  it("does not claim nothing matched when an empty response accompanies an unavailable source", async () => {
    vi.mocked(search).mockImplementation(async (source, query) => {
      if (source === "govinfo")
        throw new ApiFailure("Synthetic upstream failure.", "source");
      return searchResult([], query, source);
    });
    const { ui } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    fireEvent.input(ui.getByRole("searchbox"), { target: { value: "water" } });
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    await ui.findByText(
      "No results loaded. At least one selected source was unavailable.",
    );
    expect(ui.queryByText(/^Nothing matched/)).not.toBeInTheDocument();
    expect(ui.getByText("Unavailable")).toBeInTheDocument();
    expect(ui.getByText("No matches")).toBeInTheDocument();
  });

  it("keeps an empty first page with a valid GovInfo cursor explicitly incomplete", async () => {
    vi.mocked(search).mockResolvedValue(page("govinfo", "water", 1, [], true));
    const { ui } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    fireEvent.click(ui.getByRole("checkbox", { name: /Federal Register/ }));
    fireEvent.input(ui.getByRole("searchbox"), { target: { value: "water" } });
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    await ui.findByText("No listings loaded on this page");
    expect(ui.queryByText("No matches")).not.toBeInTheDocument();
    expect(ui.queryByText(/^Nothing matched/)).not.toBeInTheDocument();
    expect(
      ui.getByRole("button", { name: "Load more GovInfo" }),
    ).toHaveAttribute("aria-disabled", "false");
  });

  it("keeps source accumulators when pages finish in reverse order and stops a cursor cycle", async () => {
    const firstFr = page("federal-register", "water", 1, [citation()], true);
    const firstGov = page(
      "govinfo",
      "water",
      1,
      [listing("govinfo", "2099-00008")],
      true,
    );
    const frPage = deferred<DemoSearchResponse>();
    const govPage = deferred<DemoSearchResponse>();
    vi.mocked(search).mockImplementation((source, _query, number) =>
      number === 1
        ? Promise.resolve(source === "govinfo" ? firstGov : firstFr)
        : source === "govinfo"
          ? govPage.promise
          : frPage.promise,
    );
    const { ui, shell } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    await showResult(ui);
    fireEvent.click(
      ui.getByRole("button", { name: "Load more Federal Register" }),
    );
    fireEvent.click(ui.getByRole("button", { name: "Load more GovInfo" }));
    const govOptions = vi
      .mocked(search)
      .mock.calls.find((call) => call[0] === "govinfo" && call[2] === 2)![4]!;
    const cycling = page("govinfo", "water", 2, [], true, govOptions);
    await act(async () =>
      govPage.resolve({
        ...cycling,
        continuation: {
          kind: "more",
          next: { ...cycling.criteria, page: 3, cursor: "cursor-1" },
        },
      }),
    );
    await act(async () =>
      frPage.resolve(
        page(
          "federal-register",
          "water",
          2,
          [citation("2099-00009", "Appended FR")],
          false,
        ),
      ),
    );
    expect(shell.querySelectorAll(".result")).toHaveLength(3);
    expect(
      ui.getByRole("heading", { name: "Appended FR" }),
    ).toBeInTheDocument();
    expect(
      ui.getByText(/Further pages could not be established/),
    ).toBeInTheDocument();
    expect(
      ui.getByRole("button", { name: "Load more GovInfo" }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});
