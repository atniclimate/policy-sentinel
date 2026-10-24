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
import { COPY } from "../../src/demo/copy";
import { localDay } from "../../src/demo/follow";
import { buildPdf } from "../../src/demo/pdf";
import { emptyActors, STORAGE_KEY } from "../../src/demo/report-state";
import { keyOf } from "../../src/demo/validation";
import { NcaiVaultError, openNcaiDrafts } from "../../src/demo/ncai-vault";
import type { NcaiDraft } from "../../src/demo/ncai-2026";
import {
  nextSearchCursor,
  REGULATIONS_V2_CONFIRMED,
  searchCriteria,
} from "../../src/demo/search-contract";
import {
  citation,
  deferred,
  listing,
  policy,
  regulationsRecord,
  searchResult,
  sources,
  statedCitation,
} from "./frontend-fixtures";
import type {
  DemoCitation,
  DemoPolicyResponse,
  DemoSearchOptions,
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
    // The unreadable list stays as it was until the person changes something.
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe("null");
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

  it.runIf(!REGULATIONS_V2_CONFIRMED)(
    "says a Regulations.gov row's comment dates are not shown, beside a stated Federal Register date",
    async () => {
      vi.mocked(search).mockImplementation(async (source, query) =>
        searchResult(
          [
            source === "federal-register"
              ? { ...citation(), commentsCloseOn: "2099-02-01" }
              : {
                  ...listing("regulations", "2099-00009"),
                  title: "Docket Copy",
                },
          ],
          query,
          source,
        ),
      );
      const { ui } = await start();
      fireEvent.click(ui.getByRole("checkbox", { name: /Regulations\.gov/ }));
      await showResult(ui);
      const row = (name: string) =>
        ui.getByRole("heading", { name }).closest("article, li") as HTMLElement;
      expect(row("Example Water Policy")).toHaveTextContent(
        "Comments close 2099-02-01, as stated by Federal Register.",
      );
      // Silence here could read as no comment period (safeguard 8).
      expect(row("Docket Copy")).toHaveTextContent(
        "This demo does not show Regulations.gov comment dates yet.",
      );
    },
  );

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
    // The count also says a source was unavailable, so it is not taken as complete.
    const announcement = ui
      .getByText(
        "2 policies listed. At least one selected source was unavailable; its reason is shown with it.",
      )
      .closest(".live");
    expect(announcement).toHaveAttribute("role", "status");
    const status = announcement?.closest(".pane-results");
    expect(status).toHaveTextContent("GovInfoUnavailable");
    expect(status).toHaveTextContent("Synthetic outage.");
    expect(status).not.toHaveTextContent("Nothing returned");
    // One listing is singular.
    expect(status).toHaveTextContent(
      "Federal Register1 listing loaded; 1 reported by source",
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

  it("lists a search's rows only once every source answered, interleaved by rank whatever order they came in", async () => {
    const answers = {
      "federal-register": deferred<DemoSearchResponse>(),
      govinfo: deferred<DemoSearchResponse>(),
      regulations: deferred<DemoSearchResponse>(),
    };
    vi.mocked(search).mockImplementation(
      (source) => answers[source as keyof typeof answers].promise,
    );
    const own = (sourceId: "govinfo" | "regulations", id: string) => ({
      ...citation(id, id.toUpperCase()),
      sourceId,
      identifier: `${sourceId}-${id}`,
    });
    const { ui, container } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    fireEvent.click(ui.getByRole("checkbox", { name: /Regulations\.gov/ }));
    fireEvent.input(ui.getByRole("searchbox"), { target: { value: "water" } });
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    const titles = () =>
      [...container.querySelectorAll(".pane-results .result h3")].map(
        (heading) => heading.textContent,
      );
    await act(async () =>
      answers.regulations.resolve(
        searchResult(
          [own("regulations", "r0"), own("regulations", "r1")],
          "water",
          "regulations",
        ),
      ),
    );
    await act(async () =>
      answers.govinfo.resolve(
        searchResult(
          ["g0", "g1", "g2"].map((id) => own("govinfo", id)),
          "water",
          "govinfo",
        ),
      ),
    );
    // Nothing is listed while a source still searches, and every source reads as searching.
    expect(titles()).toEqual([]);
    expect(container.querySelector(".pane-results")).toHaveTextContent(
      "GovInfoSearching",
    );
    await act(async () =>
      answers["federal-register"].resolve(
        searchResult([citation("f0", "F0")], "water"),
      ),
    );
    await waitFor(() =>
      expect(titles()).toEqual(["F0", "G0", "R0", "G1", "R1", "G2"]),
    );
  });

  it("never offers a lower-precedence listing to cite before the higher-precedence source answers", async () => {
    const register = deferred<DemoSearchResponse>();
    vi.mocked(search).mockImplementation(async (source, query) =>
      source === "federal-register"
        ? register.promise
        : searchResult([listing("govinfo")], query, source),
    );
    const { ui } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    fireEvent.input(ui.getByRole("searchbox"), { target: { value: "water" } });
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(search).toHaveBeenCalledTimes(2));
    await act(async () => {});
    // GovInfo answered, but its copy of the document is not offered alone.
    expect(
      ui.queryAllByRole("button", { name: /Add to my citations/ }),
    ).toHaveLength(0);
    await act(async () => register.resolve(searchResult([merged])));
    const row = (
      await ui.findByRole("button", { name: /^Add to my citations/ })
    ).closest("li") as HTMLElement;
    expect(row.querySelector(".row-k")).toHaveTextContent("Federal Register");
    expect(row).toHaveTextContent("Also listed byGovInfo");
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
    // Choosing the draft runs its automatic searches, the public-law one among them.
    await waitFor(() =>
      expect(search).toHaveBeenCalledWith(
        "federal-register",
        "water quality",
        1,
        expect.any(AbortSignal),
        expect.any(Object),
      ),
    );
    expect(search).toHaveBeenCalledWith(
      "govinfo",
      "collection:PLAW AND lawtype:public AND (water quality)",
      1,
      expect.any(AbortSignal),
      expect.any(Object),
    );
    await ui.findAllByRole("button", { name: /Add to my citations/ });
    vi.mocked(search).mockClear();
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
    // That search already answered inside the draft's plan, so its button sends nothing new.
    fireEvent.click(
      ui.getByRole("button", { name: "Federal public laws: water quality" }),
    );
    expect(search).not.toHaveBeenCalled();
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
    // The draft's own suggested search runs on choosing it; the off chips below must add none.
    await waitFor(() => expect(search).toHaveBeenCalledOnce());
    vi.mocked(search).mockClear();
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
    // A draft runs several searches; none is copied into the typed search box.
    expect(ui.getByRole("searchbox")).toHaveValue("");
  });

  it("loads a chosen draft's search into Results, labeled, and clears it for a draft with none", async () => {
    vi.mocked(openNcaiDrafts).mockResolvedValue(NCAI_DRAFTS);
    const { ui, container } = await start();
    fireEvent.click(ui.getByRole("button", { name: "NCAI" }));
    const gate = within(container.querySelector(".gate") as HTMLElement);
    fireEvent.input(gate.getByLabelText("Access password"), {
      target: { value: "synthetic" },
    });
    fireEvent.click(gate.getByRole("button", { name: "Open" }));
    fireEvent.click(await ui.findByRole("button", { name: /PSC-26-001/ }));
    const results = container.querySelector(".pane-results") as HTMLElement;
    await waitFor(() =>
      expect(results).toHaveTextContent(
        "Suggested searches for NCAI draft PSC-26-001 Example draft on water",
      ),
    );
    // Several searches ran, so no single one is named the submitted search.
    expect(results).not.toHaveTextContent("Submitted search");
    expect(results).toHaveTextContent("A result is a text match");
    // The caveat stays in view; the longer explanation is one press away.
    const about = within(results)
      .getByText("About these searches")
      .closest("details") as HTMLDetailsElement;
    expect(about.open).toBe(false);
    expect(about).toHaveTextContent("Name searches never run on their own.");
    expect(about).not.toHaveTextContent("A result is a text match");
    await within(results).findAllByRole("button", {
      name: /Add to my citations/,
    });
    // A draft with no suggested search must not keep the previous draft's results.
    vi.mocked(search).mockClear();
    (container.querySelector(".ncai-menu") as HTMLDetailsElement).open = true;
    fireEvent.click(ui.getByRole("button", { name: /PSC-26-002/ }));
    expect(search).not.toHaveBeenCalled();
    expect(results).not.toHaveTextContent("PSC-26-001");
    expect(
      within(results).queryByRole("button", { name: /Add to my citations/ }),
    ).toBeNull();
    expect(results).toHaveTextContent("This draft has no suggested search.");
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
    // The page sends every search as contract v2, so its answers are v2.
    options: DemoSearchOptions = {
      dateFrom: null,
      dateTo: null,
      continuation: null,
      version: 2,
      match: "text",
      documentType: null,
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
    // Every page search opts in to contract v2 (Release B).
    expect(vi.mocked(search).mock.calls[0][4]).toEqual({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      continuation: null,
      version: 2,
      match: "text",
      documentType: null,
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

describe("demo seeded discovery from NCAI drafts", () => {
  /** Unlocks the synthetic draft list and waits for its menu. */
  async function openNcai(
    ui: ReturnType<typeof within>,
    container: Element,
    drafts: readonly NcaiDraft[] = NCAI_DRAFTS,
  ) {
    vi.mocked(openNcaiDrafts).mockResolvedValue(drafts);
    fireEvent.click(ui.getByRole("button", { name: "NCAI" }));
    const gate = within(container.querySelector(".gate") as HTMLElement);
    fireEvent.input(gate.getByLabelText("Access password"), {
      target: { value: "synthetic" },
    });
    fireEvent.click(gate.getByRole("button", { name: "Open" }));
    await ui.findByRole("button", { name: new RegExp(drafts[0].id) });
  }

  function chooseDraft(
    ui: ReturnType<typeof within>,
    container: Element,
    id: string,
  ) {
    (container.querySelector(".ncai-menu") as HTMLDetailsElement).open = true;
    fireEvent.click(ui.getByRole("button", { name: new RegExp(id) }));
  }

  /** Source and query of every search sent, in order. */
  const sent = () =>
    vi.mocked(search).mock.calls.map(([source, query]) => [source, query]);

  it("sends exactly a draft's automatic searches and never its name search", async () => {
    const draft: NcaiDraft = {
      id: "PSC-26-010",
      title: "Example draft on salmon",
      sponsor: "Example Tribe",
      status: "In order",
      topics: ["salmon habitat", "fish passage"],
      bills: ["hr 1234"],
      cases: ["treaty fishing"],
      names: ["Example Tribe"],
    };
    const { ui, container } = await start();
    await openNcai(ui, container, [draft]);
    chooseDraft(ui, container, draft.id);
    await ui.findAllByRole("button", { name: /Add to my citations/ });
    // Only the Federal Register is checked; GovInfo and Congress.gov are asked as well.
    expect(sent()).toEqual([
      ["federal-register", "salmon habitat"],
      ["govinfo", "collection:BILLS AND (salmon habitat)"],
      ["govinfo", "collection:PLAW AND lawtype:public AND (salmon habitat)"],
      ["congress", "hr 1234 119"],
      ["govinfo", "collection:USCOURTS AND (treaty fishing)"],
      ["govinfo", "collection:USCOURTS AND circuit:9 AND (treaty fishing)"],
      ["govinfo", "collection:USREPORTS AND (treaty fishing)"],
    ]);
    expect(sent().flat().join(" ")).not.toContain("Example Tribe");
    // Results names every source asked.
    const results = container.querySelector(".pane-results") as HTMLElement;
    expect(results).toHaveTextContent(
      "GovInfo, Supreme Court opinions in the United States Reports",
    );
    expect(results).toHaveTextContent("Congress.gov");
    expect(results).toHaveTextContent("use GovInfo");
  });

  it("treats a search holding the sponsor's name as a name search", async () => {
    const draft: NcaiDraft = {
      id: "PSC-26-011",
      title: "Example draft on a case",
      sponsor: "Example Tribe",
      status: "In order",
      topics: ["salmon habitat"],
      cases: ["Example Tribe v. United States"],
      names: ["Example Tribe"],
    };
    const { ui, container } = await start();
    await openNcai(ui, container, [draft]);
    chooseDraft(ui, container, draft.id);
    await ui.findAllByRole("button", { name: /Add to my citations/ });
    // The case caption names the sponsor, so it waits for its button.
    expect(sent().flat().join(" ")).not.toContain("Example Tribe");
    vi.mocked(search).mockClear();
    fireEvent.click(
      ui.getByRole("button", {
        name: "Federal court opinions: Example Tribe v. United States",
      }),
    );
    const results = container.querySelector(".pane-results") as HTMLElement;
    await waitFor(() =>
      expect(results).toHaveTextContent(
        "name search for Example Tribe v. United States in GovInfo, Federal court opinions",
      ),
    );
    expect(sent()).toEqual([
      ["govinfo", "collection:USCOURTS AND (Example Tribe v. United States)"],
    ]);
    expect(results).toHaveTextContent(
      "Name search: Example Tribe v. United States. A name match does not show that a document concerns that Tribe or organization.",
    );
    fireEvent.click(ui.getByRole("button", { name: /^Add to my citations/ }));
    await ui.findByText(/Citation and text saved/);
    const print = container.querySelector(".print-only") as HTMLElement;
    // D-112: the draft title may be exported, on the draft's search lines; the
    // name-search line leaves it out, since a title may name the sponsor.
    expect(print).toHaveTextContent(
      "Found by Name search for the sponsor listed on NCAI draft PSC-26-011 (GovInfo, Federal court opinions)",
    );
    expect(print).toHaveTextContent(
      "Suggested search for NCAI draft PSC-26-011 (Example draft on a case)",
    );
    expect(print).not.toHaveTextContent("Example Tribe");
  });

  it("shows each source's rows as it answers, while slower sources still search", async () => {
    const slow = deferred<DemoSearchResponse>();
    vi.mocked(search).mockImplementation(async (source, query) =>
      source === "federal-register"
        ? searchResult([citation()], query, source)
        : slow.promise,
    );
    const { ui, container } = await start();
    await openNcai(ui, container);
    chooseDraft(ui, container, "PSC-26-001");
    const results = container.querySelector(".pane-results") as HTMLElement;
    await within(results).findByRole("heading", {
      name: "Example Water Policy",
    });
    const status = within(results).getByRole("status");
    expect(status).toHaveTextContent("Running the draft's suggested searches");
    expect(results).toHaveTextContent("Federal court opinionsSearching");
    await act(async () =>
      slow.resolve(searchResult([], "water quality", "govinfo")),
    );
    await waitFor(() => expect(status).toHaveTextContent("1 document listed."));
    expect(results).not.toHaveTextContent("Searching");
  });

  it("announces a search added to the open results by name, then its outcome", async () => {
    const fish = deferred<DemoSearchResponse>();
    const { ui, container } = await start();
    await openNcai(ui, container, [
      { ...NCAI_DRAFTS[0], topics: ["water quality", "fish passage"] },
    ]);
    chooseDraft(ui, container, "PSC-26-001");
    await ui.findAllByRole("button", { name: /Add to my citations/ });
    const status = within(
      container.querySelector(".pane-results") as HTMLElement,
    ).getByRole("status");
    vi.mocked(search).mockReturnValue(fish.promise);
    fireEvent.click(ui.getByRole("button", { name: "fish passage" }));
    await waitFor(() =>
      expect(status).toHaveTextContent(
        "Searching Federal Register: fish passage.",
      ),
    );
    await act(async () =>
      fish.reject(new ApiFailure("Synthetic outage.", "source")),
    );
    await waitFor(() =>
      expect(status).toHaveTextContent(
        "Federal Register: fish passage could not be searched. Synthetic outage. 1 document listed. At least one source asked was unavailable; its reason is shown with it.",
      ),
    );
  });

  it("scrolls to the Results heading when a draft is chosen on a narrow layout", async () => {
    // A pane already partly on screen is not scrolled by focus alone.
    const shown: string[] = [];
    Element.prototype.scrollIntoView = function (this: Element) {
      shown.push(this.id);
    };
    try {
      const { ui, container } = await start();
      await openNcai(ui, container);
      chooseDraft(ui, container, "PSC-26-001");
      await ui.findAllByRole("button", { name: /Add to my citations/ });
      expect(shown).toContain("results-h");
    } finally {
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    }
  });

  it("sends nothing new when the same draft is chosen again", async () => {
    const { ui, container } = await start();
    await openNcai(ui, container);
    chooseDraft(ui, container, "PSC-26-001");
    await ui.findAllByRole("button", { name: /Add to my citations/ });
    expect(search).toHaveBeenCalledTimes(7);
    vi.mocked(search).mockClear();
    chooseDraft(ui, container, "PSC-26-001");
    await ui.findAllByRole("button", { name: /Add to my citations/ });
    expect(search).not.toHaveBeenCalled();
    // Bills and opinions are listed too, so the count is of documents.
    expect(ui.getByText("1 document listed.")).toBeInTheDocument();
  });

  it("asks the source again when the same typed search is repeated", async () => {
    const { ui } = await start();
    await showResult(ui);
    await showResult(ui);
    // Only re-choosing a draft is spared requests; a repeated search may find newer notices.
    expect(sent()).toEqual([
      ["federal-register", "water"],
      ["federal-register", "water"],
    ]);
  });

  it("says a draft also asks sources not checked, and never blames the reader for Congress.gov", async () => {
    const water = deferred<DemoSearchResponse>();
    vi.mocked(search).mockReturnValue(water.promise);
    const { ui, container } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /Congress\.gov/ }));
    await openNcai(ui, container);
    chooseDraft(ui, container, "PSC-26-001");
    const results = container.querySelector(".pane-results") as HTMLElement;
    const status = within(results).getByRole("status");
    expect(status).toHaveTextContent(
      "Running the draft's suggested searches on each source named below, including sources not checked.",
    );
    expect(status).not.toHaveTextContent("selected");
    // The topic is not sent to Congress.gov, and the reason asks nothing of the reader.
    expect(sent()).not.toContainEqual(["congress", "water quality"]);
    expect(results).not.toHaveTextContent("Congress.gov was skipped");
    expect(results).toHaveTextContent(
      "Congress.gov looks up one bill by reference, so it is not searched for a topic.",
    );
    await act(async () => water.resolve(searchResult()));
    await waitFor(() => expect(status).toHaveTextContent("1 document listed."));
    // Read before the first draft is chosen: the gate and About say where terms go.
    expect(container.querySelector(".gate")).toHaveTextContent(
      "Legislation and court searches go to GovInfo, and a bill named in the draft's title to Congress.gov, even when those sources are not checked.",
    );
    expect(
      container.querySelector('[aria-labelledby="about-h"]'),
    ).toHaveTextContent(
      "Choosing an NCAI draft also sends its suggested legislation and court searches to GovInfo, and a bill named in its title to Congress.gov, whether or not those sources are selected.",
    );
  });

  it("never names the committee area on a result or in the export", async () => {
    const { ui, container } = await start();
    await openNcai(ui, container);
    fireEvent.change(ui.getByLabelText("Policy area (NCAI committee)"), {
      target: { value: "0" },
    });
    fireEvent.click(ui.getByRole("button", { name: "water quality" }));
    const add = await ui.findByRole("button", {
      name: /^Add to my citations/,
    });
    const results = container.querySelector(".pane-results") as HTMLElement;
    expect(results).toHaveTextContent(
      "Why shown: matched the search water quality in Federal Register.",
    );
    expect(results).not.toHaveTextContent("Example Committee");
    fireEvent.click(add);
    await ui.findByText(/Citation and text saved/);
    const print = container.querySelector(".print-only") as HTMLElement;
    expect(print).toHaveTextContent(
      "Found by Policy area menu search: water quality (Federal Register)",
    );
    expect(print).not.toHaveTextContent("Example Committee");
  });

  it("never shows a replaced draft's rows and drops its late answers", async () => {
    const water = deferred<DemoSearchResponse>();
    vi.mocked(search).mockImplementation(async (source, query) =>
      query.includes("water quality")
        ? water.promise
        : searchResult(
            [citation("2099-00002", "Forest result")],
            query,
            source,
          ),
    );
    const drafts = [
      { ...NCAI_DRAFTS[1], topics: ["forest health"] },
      NCAI_DRAFTS[0],
    ];
    const { ui, container } = await start();
    await openNcai(ui, container, drafts);
    chooseDraft(ui, container, "PSC-26-002");
    await ui.findByRole("heading", { name: "Forest result" });
    vi.mocked(search).mockClear();
    chooseDraft(ui, container, "PSC-26-001");
    // The earlier draft's rows leave as soon as another draft is chosen.
    expect(
      ui.queryByRole("heading", { name: "Forest result" }),
    ).not.toBeInTheDocument();
    const waterSignal = vi.mocked(search).mock.calls[0][3];
    // Back to the first draft while the second is still loading.
    chooseDraft(ui, container, "PSC-26-002");
    expect(waterSignal?.aborted).toBe(true);
    await ui.findByRole("heading", { name: "Forest result" });
    await act(async () =>
      water.resolve(
        searchResult(
          [citation("2099-00003", "Stale water result")],
          "water quality",
        ),
      ),
    );
    expect(
      ui.queryByRole("heading", { name: "Stale water result" }),
    ).not.toBeInTheDocument();
    expect(container.querySelector(".pane-results")).toHaveTextContent(
      "PSC-26-002",
    );
  });

  it("shows a search held back by the request budget and sends it alone on request", async () => {
    vi.mocked(loadSources).mockResolvedValue([
      ...sources,
      ...["A", "B"].map((letter) => ({
        id: `example-${letter.toLowerCase()}`,
        label: `Example Source ${letter}`,
        level: "federal" as const,
        status: "live" as const,
        note: "Synthetic test source.",
      })),
    ]);
    const { ui, container } = await start();
    for (const name of [
      /GovInfo/,
      /Regulations\.gov/,
      /Example Source A/,
      /Example Source B/,
    ])
      fireEvent.click(ui.getByRole("checkbox", { name }));
    await openNcai(ui, container);
    chooseDraft(ui, container, "PSC-26-001");
    await ui.findAllByRole("button", { name: /Add to my citations/ });
    // Five policy searches, two legislation, one bill and two court searches.
    expect(search).toHaveBeenCalledTimes(10);
    const held = "collection:USREPORTS AND (water quality)";
    expect(sent().map(([, query]) => query)).not.toContain(held);
    expect(container.querySelector(".pane-results")).toHaveTextContent(
      "choosing a draft sends at most 10 searches at once",
    );
    const button = ui.getByRole("button", {
      name: "Search this too: GovInfo, Supreme Court opinions in the United States Reports: water quality",
    });
    expect(
      ui.getAllByRole("button", { name: /^Search this too/ }),
    ).toHaveLength(1);
    vi.mocked(search).mockClear();
    const lane = button.closest("li") as HTMLElement;
    fireEvent.click(button);
    await waitFor(() =>
      expect(
        ui.queryByRole("button", { name: /^Search this too/ }),
      ).not.toBeInTheDocument(),
    );
    expect(sent()).toEqual([["govinfo", held]]);
    // Focus stays at the lane's place in the last section, not the top of Results.
    expect(lane).toHaveFocus();
    expect(lane).toHaveTextContent(
      "GovInfo, Supreme Court opinions in the United States Reports",
    );
  });

  it("groups a draft's results and gives every reason for a row two searches found", async () => {
    const opinion = {
      ...citation("2099-00005", "Example Opinion"),
      sourceId: "govinfo",
      identifier: "USCOURTS-example-0001",
      officialUrl: "https://www.govinfo.gov/app/details/USCOURTS-example-0001",
      textAvailable: false,
    };
    vi.mocked(search).mockImplementation(async (source, query) =>
      searchResult(
        source === "federal-register"
          ? [citation()]
          : query.startsWith("collection:USCOURTS")
            ? [opinion]
            : [],
        query,
        source,
      ),
    );
    const { ui, container } = await start();
    await openNcai(ui, container);
    chooseDraft(ui, container, "PSC-26-001");
    const results = within(
      container.querySelector(".pane-results") as HTMLElement,
    );
    await results.findByRole("heading", { name: "Example Opinion" });
    expect(
      results
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual([
      "Policies and Rules",
      "Legislation",
      "Bills Named in the Title",
      "Court Opinions",
    ]);
    const section = (title: string) =>
      results.getByRole("heading", { name: title, level: 3 })
        .parentElement as HTMLElement;
    // The opinion both court searches listed is one row, with both reasons.
    expect(container.querySelectorAll(".pane-results .result")).toHaveLength(2);
    const row = within(section("Court Opinions"))
      .getByRole("heading", { name: "Example Opinion", level: 4 })
      .closest("li") as HTMLElement;
    expect(row).toHaveTextContent(
      "Why shown: matched the search water quality in GovInfo, Federal court opinions; matched the search water quality in GovInfo, Federal opinions in the Ninth Circuit; searches suggested for NCAI draft PSC-26-001.",
    );
    expect(
      within(section("Policies and Rules"))
        .getByRole("heading", { name: "Example Water Policy", level: 4 })
        .closest("li"),
    ).toHaveTextContent(
      "Why shown: matched the search water quality in Federal Register; search suggested for NCAI draft PSC-26-001.",
    );
    expect(
      within(section("Policies and Rules")).getByRole("heading", {
        name: "Example Water Policy",
        level: 4,
      }),
    ).toBeInTheDocument();
    expect(section("Legislation")).toHaveTextContent(
      "GovInfo, Federal public laws",
    );
    expect(section("Bills Named in the Title")).not.toHaveTextContent(
      "Why shown",
    );
  });

  it("replays answered searches with no request when a draft is chosen again, and asks an unavailable one again", async () => {
    vi.mocked(search).mockImplementation(async (source, query) => {
      if (source === "congress")
        throw new ApiFailure("No such bill.", "source", "not_found", 404);
      if (source === "govinfo")
        throw new ApiFailure("Synthetic outage.", "source");
      return searchResult([citation()], query, source);
    });
    const { ui, container } = await start();
    await openNcai(ui, container);
    chooseDraft(ui, container, "PSC-26-001");
    await ui.findAllByRole("button", { name: /Add to my citations/ });
    const results = container.querySelector(".pane-results") as HTMLElement;
    expect(results).toHaveTextContent("Congress.govNo matches");
    expect(results).toHaveTextContent("Federal court opinionsUnavailable");
    vi.mocked(search).mockClear();
    chooseDraft(ui, container, "PSC-26-001");
    await ui.findAllByRole("button", { name: /Add to my citations/ });
    // The Federal Register answer and the missing bill are replayed from this
    // tab's memory with no request; every unavailable search is asked again.
    expect(sent()).not.toContainEqual(["federal-register", "water quality"]);
    expect(sent()).not.toContainEqual(["congress", "hr 1234 119"]);
    expect(sent()).toEqual([
      ["govinfo", "collection:BILLS AND (water quality)"],
      ["govinfo", "collection:PLAW AND lawtype:public AND (water quality)"],
      ["govinfo", "collection:USCOURTS AND (water quality)"],
      ["govinfo", "collection:USCOURTS AND circuit:9 AND (water quality)"],
      ["govinfo", "collection:USREPORTS AND (water quality)"],
    ]);
    expect(results).toHaveTextContent("Congress.govNo matches");
  });

  it("adds a further topic from the draft's panel as one search, after the rows already shown", async () => {
    vi.mocked(search).mockImplementation(async (source, query) =>
      searchResult(
        source !== "federal-register"
          ? []
          : [
              query === "fish passage"
                ? citation("2099-00004", "Fish passage notice")
                : citation(),
            ],
        query,
        source,
      ),
    );
    const { ui, container } = await start();
    await openNcai(ui, container, [
      { ...NCAI_DRAFTS[0], topics: ["water quality", "fish passage"] },
    ]);
    chooseDraft(ui, container, "PSC-26-001");
    await ui.findByRole("heading", { name: "Example Water Policy" });
    vi.mocked(search).mockClear();
    fireEvent.click(ui.getByRole("button", { name: "fish passage" }));
    await ui.findByRole("heading", { name: "Fish passage notice" });
    expect(sent()).toEqual([["federal-register", "fish passage"]]);
    expect(
      [...container.querySelectorAll(".pane-results .result h4")].map(
        (heading) => heading.textContent,
      ),
    ).toEqual(["Example Water Policy", "Fish passage notice"]);
  });

  it("records how a cited row was found, by draft ID, the title shown and terms", async () => {
    const { ui, container } = await start();
    await openNcai(ui, container);
    chooseDraft(ui, container, "PSC-26-001");
    fireEvent.click(
      await ui.findByRole("button", { name: /^Add to my citations/ }),
    );
    await ui.findByText(/Citation and text saved/);
    // The bill search is an exact lookup, so it is not called a text match.
    const results = container.querySelector(".pane-results") as HTMLElement;
    expect(results).toHaveTextContent(
      "looked up hr 1234 in the 119th Congress on Congress.gov",
    );
    expect(results).not.toHaveTextContent("matched the search hr 1234");
    expect(
      [101, 102, 103, 111, 112, 113, 122].map(
        (n) => COPY.whyLookedUp("hr 1", n, "Congress.gov").split(" ")[6],
      ),
    ).toEqual(["101st", "102nd", "103rd", "111th", "112th", "113th", "122nd"]);
    // D-112: the export names the draft by the title the page showed.
    const print = container.querySelector(".print-only") as HTMLElement;
    expect(print).toHaveTextContent(
      "Found by Suggested search for NCAI draft PSC-26-001 (Example draft on water): water quality (Federal Register)",
    );
    expect(print).toHaveTextContent(
      "Found by Suggested search for NCAI draft PSC-26-001 (Example draft on water): hr 1234 119 (Congress.gov)",
    );
    expect(print).not.toHaveTextContent("Example Tribe");
  });

  it("holds a section's rows until all its searches answer, while another section shows", async () => {
    const reports = deferred<DemoSearchResponse>();
    const opinion = {
      ...citation("2099-00005", "Example Opinion"),
      sourceId: "govinfo",
      identifier: "USCOURTS-example-0001",
      textAvailable: false,
    };
    vi.mocked(search).mockImplementation(async (source, query) =>
      query.startsWith("collection:USREPORTS")
        ? reports.promise
        : searchResult(
            source === "federal-register"
              ? [citation()]
              : query.startsWith("collection:USCOURTS")
                ? [opinion]
                : [],
            query,
            source,
          ),
    );
    const { ui, container } = await start();
    await openNcai(ui, container);
    chooseDraft(ui, container, "PSC-26-001");
    const results = within(
      container.querySelector(".pane-results") as HTMLElement,
    );
    await results.findByRole("heading", { name: "Example Water Policy" });
    await act(async () => {});
    const courts = results.getByRole("heading", {
      name: "Court Opinions",
      level: 3,
    }).parentElement as HTMLElement;
    // Both USCOURTS searches answered; USREPORTS has not, so none is listed yet.
    expect(
      results.queryByRole("heading", { name: "Example Opinion" }),
    ).toBeNull();
    expect(courts).toHaveTextContent(
      "GovInfo, Federal court opinionsSearching",
    );
    await act(async () =>
      reports.resolve(searchResult([], "water quality", "govinfo")),
    );
    await results.findByRole("heading", { name: "Example Opinion" });
    expect(courts).not.toHaveTextContent("Searching");
  });

  it.each([
    ["narrow", false],
    ["wide", true],
  ])(
    "brings a panel search that already ran into view on a %s layout, without sending it again",
    async (_layout, wide) => {
      const shown: string[] = [];
      Element.prototype.scrollIntoView = function (this: Element) {
        shown.push(this.id);
      };
      const holder = window as { matchMedia?: unknown };
      if (wide)
        holder.matchMedia = () => ({
          matches: true,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        });
      try {
        const register = deferred<DemoSearchResponse>();
        vi.mocked(search).mockImplementation(async (source, query) =>
          source === "federal-register"
            ? register.promise
            : searchResult([], query, source),
        );
        const { ui, container, shell } = await start();
        await openNcai(ui, container);
        chooseDraft(ui, container, "PSC-26-001");
        await waitFor(() => expect(search).toHaveBeenCalledTimes(7));
        // Every other section answers; the Federal Register still searches.
        await act(async () => {});
        const results = container.querySelector(".pane-results") as HTMLElement;
        const status = within(results).getByRole("status");
        const lane = results.querySelector("#lane-0") as HTMLElement;
        expect(lane).toHaveTextContent("Federal Register");
        vi.mocked(search).mockClear();
        const button = ui.getByRole("button", { name: "water quality" });
        fireEvent.click(button);
        expect(status).toHaveTextContent(
          "Still searching: Federal Register: water quality.",
        );
        await act(async () => register.resolve(searchResult()));
        await ui.findAllByRole("button", { name: /Add to my citations/ });
        button.focus();
        shown.length = 0;
        fireEvent.click(button);
        expect(search).not.toHaveBeenCalled();
        expect(status).toHaveTextContent(
          "Already in Results: Federal Register: water quality.",
        );
        expect(shown).toEqual(["lane-0"]);
        expect(lane).toHaveFocus();
        if (!wide) expect(shell).toHaveAttribute("data-pane", "results");
      } finally {
        delete (Element.prototype as Partial<Element>).scrollIntoView;
        delete holder.matchMedia;
      }
    },
  );

  describe("a panel search a checked source cannot take", () => {
    const fish = {
      ...NCAI_DRAFTS[0],
      topics: ["water quality", "fish passage"],
    };
    const resultsOf = (container: Element) =>
      within(container.querySelector(".pane-results") as HTMLElement);
    const statusOf = (container: Element) =>
      resultsOf(container).getByRole("status");
    const policiesOf = (container: Element) =>
      resultsOf(container).getByRole("heading", {
        name: "Policies and Rules",
        level: 3,
      }).parentElement as HTMLElement;
    const reasons = (container: Element) =>
      policiesOf(container).textContent!.split(COPY.ncai.congressSkipped)
        .length - 1;

    it("is added as not searched beside the source that is sent", async () => {
      vi.mocked(search).mockImplementation(async (source, query) =>
        searchResult(
          source === "federal-register" ? [citation()] : [],
          query,
          source,
        ),
      );
      const { ui, container } = await start();
      fireEvent.click(ui.getByRole("checkbox", { name: /Congress\.gov/ }));
      await openNcai(ui, container, [fish]);
      chooseDraft(ui, container, "PSC-26-001");
      await ui.findAllByRole("button", { name: /Add to my citations/ });
      const status = statusOf(container);
      expect(reasons(container)).toBe(1);
      const register = deferred<DemoSearchResponse>();
      vi.mocked(search).mockClear().mockReturnValue(register.promise);
      fireEvent.click(ui.getByRole("button", { name: "fish passage" }));
      // Only the source sent is named as searching.
      expect(status).toHaveTextContent(
        /^Searching Federal Register: fish passage\.$/,
      );
      await act(async () =>
        register.resolve(
          searchResult([citation()], "fish passage", "federal-register"),
        ),
      );
      await waitFor(() =>
        expect(status).toHaveTextContent(
          "Federal Register: fish passage: 1 listing loaded; 1 reported by source. Congress.gov: fish passage: Not searched. 1 document listed.",
        ),
      );
      expect(sent()).toEqual([["federal-register", "fish passage"]]);
      expect(reasons(container)).toBe(2);
    });

    it("says it was not searched when it is the only checked source", async () => {
      vi.mocked(search).mockImplementation(async (source, query) =>
        searchResult([], query, source),
      );
      const { ui, container } = await start();
      fireEvent.click(ui.getByRole("checkbox", { name: /Federal Register/ }));
      fireEvent.click(ui.getByRole("checkbox", { name: /Congress\.gov/ }));
      await openNcai(ui, container, [fish]);
      chooseDraft(ui, container, "PSC-26-001");
      const status = statusOf(container);
      await waitFor(() =>
        expect(status).toHaveTextContent(COPY.ncai.continuationNoResults),
      );
      vi.mocked(search).mockClear();
      fireEvent.click(ui.getByRole("button", { name: "fish passage" }));
      await waitFor(() =>
        expect(status).toHaveTextContent(
          "Congress.gov: fish passage: Not searched.",
        ),
      );
      expect(reasons(container)).toBe(2);
      // The automatic topic's Congress.gov lane never ran either.
      fireEvent.click(ui.getByRole("button", { name: "water quality" }));
      expect(status).toHaveTextContent(
        "Congress.gov: water quality: Not searched.",
      );
      expect(status).not.toHaveTextContent("Already in Results");
      expect(search).not.toHaveBeenCalled();
    });
  });

  it("switches to federal sources when a draft is chosen in the state scope, and runs its searches", async () => {
    const { ui, container } = await start();
    fireEvent.click(ui.getByRole("button", { name: "State legislature" }));
    await openNcai(ui, container);
    chooseDraft(ui, container, "PSC-26-001");
    await ui.findAllByRole("button", { name: /Add to my citations/ });
    expect(ui.getByRole("button", { name: "Federal sources" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(search).toHaveBeenCalledTimes(7);
  });

  it("words an area search holding a listed sponsor as a name search, and exports it without its terms", async () => {
    const draft: NcaiDraft = {
      id: "PSC-26-012",
      title: "Example draft on rights",
      sponsor: "Example Tribe",
      status: "In order",
      committee: "Example Committee",
      topics: ["Example Tribe water rights"],
    };
    const { ui, container } = await start();
    await openNcai(ui, container, [draft]);
    fireEvent.change(ui.getByLabelText("Policy area (NCAI committee)"), {
      target: { value: "0" },
    });
    fireEvent.click(
      ui.getByRole("button", { name: "Example Tribe water rights" }),
    );
    const add = await ui.findByRole("button", {
      name: /^Add to my citations/,
    });
    // Sent only because the reader pressed it.
    expect(sent()).toEqual([
      ["federal-register", "Example Tribe water rights"],
    ]);
    const results = container.querySelector(".pane-results") as HTMLElement;
    expect(results).toHaveTextContent(
      "Why shown: name search for Example Tribe water rights in Federal Register. A name match does not show that this document concerns that Tribe or organization.",
    );
    expect(results).toHaveTextContent(
      "Name search: Example Tribe water rights. A name match does not show that a document concerns that Tribe or organization.",
    );
    fireEvent.click(add);
    await ui.findByText(/Citation and text saved/);
    const print = container.querySelector(".print-only") as HTMLElement;
    expect(print).toHaveTextContent(
      "Found by Policy area menu search: name search for a sponsor listed on an NCAI draft (Federal Register)",
    );
    expect(print).not.toHaveTextContent("Example Tribe");
  });

  it("says a draft's federal search was not searched when no federal source is checked", async () => {
    const { ui, container } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /Federal Register/ }));
    await openNcai(ui, container);
    chooseDraft(ui, container, "PSC-26-001");
    await ui.findAllByRole("button", { name: /Add to my citations/ });
    const policies = within(
      container.querySelector(".pane-results") as HTMLElement,
    ).getByRole("heading", { name: "Policies and Rules", level: 3 })
      .parentElement as HTMLElement;
    // Unsearched is never shown as empty (safeguard 8).
    expect(policies).toHaveTextContent("Federal sourcesNot searched");
    expect(policies).toHaveTextContent(
      "Not searched: no federal source is checked and live.",
    );
    expect(policies).not.toHaveTextContent("No matches");
    expect(search).toHaveBeenCalledTimes(6);
    expect(sent().map(([source]) => source)).not.toContain("federal-register");
  });

  it("says a draft's searches listed nothing without asking for fewer words", async () => {
    // GovInfo's empty page leaves open whether more exist, as the Worker sends it.
    vi.mocked(search).mockImplementation(async (source, query) =>
      searchResult([], query, source),
    );
    const { ui, container } = await start();
    await openNcai(ui, container, [
      NCAI_DRAFTS[0],
      { ...NCAI_DRAFTS[0], id: "PSC-26-013", topics: [] },
    ]);
    chooseDraft(ui, container, "PSC-26-001");
    const status = () =>
      within(container.querySelector(".pane-results") as HTMLElement).getByRole(
        "status",
      );
    await waitFor(() =>
      expect(status()).toHaveTextContent(COPY.ncai.continuationNoResults),
    );
    expect(status()).not.toHaveTextContent("fewer words");
    // A bill-only draft whose bill is not found has only definite answers.
    vi.mocked(search).mockRejectedValue(
      new ApiFailure("No such bill.", "source", "not_found", 404),
    );
    chooseDraft(ui, container, "PSC-26-013");
    await waitFor(() =>
      expect(status()).toHaveTextContent(COPY.ncai.noResults),
    );
    expect(status()).not.toHaveTextContent("fewer words");
  });

  it("keeps draft IDs and search terms out of session storage", async () => {
    const { ui, container } = await start();
    await openNcai(ui, container, [
      { ...NCAI_DRAFTS[0], topics: ["water quality", "fish passage"] },
    ]);
    chooseDraft(ui, container, "PSC-26-001");
    fireEvent.click(
      await ui.findByRole("button", { name: /^Add to my citations/ }),
    );
    await ui.findByText(/Citation and text saved/);
    fireEvent.click(ui.getByRole("button", { name: "fish passage" }));
    fireEvent.input(ui.getByRole("searchbox"), {
      target: { value: "salmon habitat" },
    });
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    // The typed search lists the document already cited.
    await ui.findByRole("button", { name: /^In my citations/ });
    expect(vi.mocked(search).mock.lastCall?.slice(0, 2)).toEqual([
      "federal-register",
      "salmon habitat",
    ]);
    const keys = Array.from(
      { length: window.sessionStorage.length },
      (_, index) => window.sessionStorage.key(index),
    );
    expect(keys).toEqual([STORAGE_KEY]);
    const stored = window.sessionStorage.getItem(STORAGE_KEY) as string;
    expect(Object.keys(JSON.parse(stored).cited)).toHaveLength(1);
    for (const text of [
      "PSC-26-001",
      "water quality",
      "salmon habitat",
      "foundBy",
      "Example draft on water",
    ])
      expect(stored).not.toContain(text);
  });

  it("sends a draft's searches with the type filter where the source has the type", async () => {
    const { ui, container } = await start();
    fireEvent.change(ui.getByLabelText("Document type"), {
      target: { value: "NOTICE" },
    });
    await openNcai(ui, container);
    chooseDraft(ui, container, "PSC-26-001");
    await ui.findAllByRole("button", { name: /Add to my citations/ });
    const types = vi
      .mocked(search)
      .mock.calls.map(([source, , , , options]) => [
        source,
        options?.documentType,
      ]);
    expect(types).toContainEqual(["federal-register", "NOTICE"]);
    expect(
      types.filter(([source]) => source !== "federal-register"),
    ).toHaveLength(6);
    for (const [source, type] of types)
      if (source !== "federal-register") expect(type).toBeNull();
    const results = container.querySelector(".pane-results") as HTMLElement;
    expect(results).toHaveTextContent("Document type: Notice.");
    // Every GovInfo and Congress.gov lane says the filter was not applied.
    expect(results.textContent!.split(COPY.typeNotApplied)).toHaveLength(7);
  });
});

describe("demo record fields, Find related and the type filter", () => {
  /** Source, query and options of every search sent, in order. */
  const sentWith = () =>
    vi
      .mocked(search)
      .mock.calls.map(([source, query, , , options]) => [
        source,
        query,
        options,
      ]);
  const lookup = (match: string, documentType: string | null = null) => ({
    dateFrom: null,
    dateTo: null,
    continuation: null,
    version: 2,
    match,
    documentType,
  });
  const rowOf = (ui: ReturnType<typeof within>, title: string) =>
    ui.getByRole("heading", { name: title }).closest("li") as HTMLElement;
  /** Identifier lookups list `related`; word searches list `first`. */
  function answer(
    first: readonly DemoCitation[],
    related: readonly DemoCitation[] = [],
  ) {
    vi.mocked(search).mockImplementation(
      async (source, query, _page, _signal, options) =>
        searchResult(
          [
            ...(options?.match && options.match !== "text" ? related : first),
          ].filter((item) => item.sourceId === source),
          query,
          source,
        ),
    );
  }

  it("shows the closing date, topics and identifiers as the source states them, and offers Find related only with an identifier", async () => {
    answer([statedCitation(), citation()]);
    const { ui } = await start();
    await showResult(ui);
    const stated = rowOf(ui, "Example Groundfish Rule");
    expect(stated).toHaveTextContent(
      "Comments close 2099-02-01, as stated by Federal Register.",
    );
    expect(stated).toHaveTextContent(
      "Federal Register topics: Fisheries; Reporting and recordkeeping requirements",
    );
    for (const text of [
      "Docket No. 990101-0001",
      "RIN: 0648-AA00",
      "CFR part: 50 CFR 660",
    ])
      expect(stated).toHaveTextContent(text);
    // The source's own "Docket No." is shown once, never labeled "Docket" again.
    expect(stated).not.toHaveTextContent("Docket: Docket No.");
    expect(
      within(stated).getByRole("link", {
        name: "Unified Agenda entries for RIN 0648-AA00",
      }),
    ).toHaveAttribute(
      "href",
      "https://www.reginfo.gov/public/do/eAgendaViewRule?RIN=0648-AA00",
    );
    // A stated date is not called a deadline, and nothing is asked of the reader.
    expect(stated).not.toHaveTextContent(/deadline|must|open for comment/i);
    expect(
      within(stated).getByRole("button", {
        name: "Find related: Example Groundfish Rule",
      }),
    ).toBeInTheDocument();
    const plain = rowOf(ui, "Example Water Policy");
    expect(plain).not.toHaveTextContent("Comments close");
    expect(plain).not.toHaveTextContent("topics:");
    expect(
      within(plain).queryByRole("button", { name: /^Find related/ }),
    ).toBeNull();
    expect(
      within(plain).queryByRole("link", { name: /Unified Agenda/ }),
    ).toBeNull();
  });

  it("sends the eligibility filter to Grants.gov only and shows its rows with their close date, the filter's statement and the attribution", async () => {
    vi.mocked(loadSources).mockResolvedValue([
      ...sources,
      {
        id: "grants",
        label: "Grants.gov",
        level: "federal",
        status: "live",
        note: "Synthetic test source.",
      },
    ]);
    const grantsRow: DemoCitation = {
      ...citation("2099-00030", "Example Funding Opportunity"),
      sourceId: "grants",
      identifier: "EX-FOA-2099-01",
      kind: "Funding opportunity",
      officialUrl: "https://www.grants.gov/search-results-detail/1",
      textAvailable: false,
      matchKey: null,
      applicationsCloseOn: "2099-03-01",
      listedEligibility: "tribal",
    };
    vi.mocked(search).mockImplementation(
      async (source, query, _p, _s, options) => ({
        ...searchResult(
          source === "grants" ? [grantsRow] : [citation()],
          query,
          source,
        ),
        criteria: searchCriteria(source, query, 1, options),
      }),
    );
    const { ui, container } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /^Grants\.gov/ }));
    fireEvent.click(
      ui.getByRole("checkbox", { name: COPY.grants.filterLabel }),
    );
    await showResult(ui);
    await ui.findByRole("heading", { name: "Example Funding Opportunity" });
    const options = Object.fromEntries(
      vi
        .mocked(search)
        .mock.calls.map(([source, , , , sent]) => [source, sent]),
    );
    expect(options.grants?.eligibility).toBe("tribal");
    expect(options["federal-register"]).not.toHaveProperty("eligibility");
    const row = rowOf(ui, "Example Funding Opportunity");
    expect(row).toHaveTextContent(
      "Applications close 2099-03-01, as stated by Grants.gov.",
    );
    expect(row).toHaveTextContent(COPY.grants.listedUnder);
    expect(row).toHaveTextContent(COPY.grants.limit);
    const results = container.querySelector(".pane-results") as HTMLElement;
    expect(results).toHaveTextContent(COPY.grants.filterApplied);
    expect(results).toHaveTextContent(COPY.grants.attribution);
    expect(rowOf(ui, "Example Water Policy")).not.toHaveTextContent(
      "Applications close",
    );
    expect(results).toHaveTextContent(
      "1 policy and 1 funding opportunity listed.",
    );
  });

  it("sends exactly the record's identifier lookups to its own source, names the record, and replays them from memory", async () => {
    const { docketIds, rins, cfrRefs } = statedCitation();
    answer(
      [statedCitation(), citation()],
      [
        {
          ...citation("2099-00011", "Related notice"),
          docketIds,
          rins,
          cfrRefs,
        },
        // Returned by the lookups, but it states none of the identifiers.
        citation("2099-00012", "Unstated notice"),
      ],
    );
    const { ui, container } = await start();
    await showResult(ui);
    vi.mocked(search).mockClear();
    fireEvent.click(
      ui.getByRole("button", { name: "Find related: Example Groundfish Rule" }),
    );
    await ui.findByRole("heading", { name: "Related notice" });
    expect(sentWith()).toEqual([
      ["federal-register", "Docket No. 990101-0001", lookup("docket")],
      ["federal-register", "0648-AA00", lookup("rin")],
      ["federal-register", "50 CFR 660", lookup("cfr")],
    ]);
    const results = container.querySelector(".pane-results") as HTMLElement;
    expect(results).toHaveFocus();
    expect(results).toHaveTextContent(
      "Related by identifier to Federal Register 99 FR 100 (FR Doc. 2099-00010) Example Groundfish Rule",
    );
    expect(
      within(results).getByRole("heading", {
        name: "Related by Identifier",
        level: 3,
      }),
    ).toBeInTheDocument();
    expect(results).toHaveTextContent("Same RIN: 0648-AA00");
    expect(results).toHaveTextContent("Document type: no filter applied.");
    expect(rowOf(ui, "Related notice")).toHaveTextContent(
      "Why shown: listed under the same docket, Docket No. 990101-0001, in Federal Register; listed under the same RIN, 0648-AA00, in Federal Register; listed under the same CFR part, 50 CFR 660, in Federal Register; identifiers stated by Federal Register record 99 FR 100 (FR Doc. 2099-00010).",
    );
    // A listing that does not itself state the identifier is never called the same docket.
    expect(ui.queryByRole("heading", { name: "Unstated notice" })).toBeNull();
    // Asked again from the same row, the answers come from this tab's memory.
    await showResult(ui);
    vi.mocked(search).mockClear();
    fireEvent.click(
      ui.getByRole("button", { name: "Find related: Example Groundfish Rule" }),
    );
    await ui.findByRole("heading", { name: "Related notice" });
    expect(search).not.toHaveBeenCalled();
  });

  it("marks the starting record, and exports a Find related citation as an identifier lookup, not a typed search", async () => {
    const notice: DemoCitation = {
      ...citation("2099-00011", "Related notice"),
      cfrRefs: [{ title: 50, part: "660" }],
    };
    answer([statedCitation()], [statedCitation(), notice]);
    vi.mocked(readPolicy).mockResolvedValue(policy("a", notice));
    const { ui, container } = await start();
    await showResult(ui);
    fireEvent.click(
      ui.getByRole("button", { name: "Find related: Example Groundfish Rule" }),
    );
    await ui.findByRole("heading", { name: "Related notice" });
    expect(rowOf(ui, "Example Groundfish Rule")).toHaveTextContent(
      COPY.related.startingRecord,
    );
    const related = rowOf(ui, "Related notice");
    expect(related).not.toHaveTextContent(COPY.related.startingRecord);
    fireEvent.click(
      within(related).getByRole("button", { name: /^Add to my citations/ }),
    );
    await ui.findByText(/Citation and text saved/);
    const print = container.querySelector(".print-only") as HTMLElement;
    expect(print).toHaveTextContent(
      "Found by Identifier lookup from Federal Register record 99 FR 100 (FR Doc. 2099-00010): CFR part 50 CFR 660 (Federal Register)",
    );
    expect(print).toHaveTextContent(COPY.related.caveat);
    expect(print).not.toHaveTextContent("Typed search");
  });

  it("says a stated closing time was left out instead of showing nothing", async () => {
    answer([
      {
        ...regulationsRecord(),
        commentsCloseOn: undefined,
        commentsCloseWithheld: true,
      },
    ]);
    const { ui } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /Regulations\.gov/ }));
    await showResult(ui);
    const row = rowOf(ui, "Example Water Docket Document");
    expect(row).toHaveTextContent(
      "Regulations.gov states a comment closing time that this demo does not show. See the official source.",
    );
    expect(row).not.toHaveTextContent("Comments close");
  });

  it.runIf(!REGULATIONS_V2_CONFIRMED)(
    "offers no Find related on a Regulations.gov docket until its live check is recorded",
    async () => {
      answer([statedCitation(), regulationsRecord()]);
      const { ui } = await start();
      fireEvent.click(ui.getByRole("checkbox", { name: /Regulations\.gov/ }));
      await showResult(ui);
      expect(
        within(rowOf(ui, "Example Water Docket Document")).queryByRole(
          "button",
          { name: /^Find related/ },
        ),
      ).toBeNull();
      vi.mocked(search).mockClear();
      fireEvent.click(
        ui.getByRole("button", {
          name: "Find related: Example Groundfish Rule",
        }),
      );
      await waitFor(() =>
        expect(sentWith().map(([source]) => source)).toEqual([
          "federal-register",
          "federal-register",
          "federal-register",
        ]),
      );
    },
  );

  it.skipIf(!REGULATIONS_V2_CONFIRMED)(
    "never rewrites one source's identifier into another's",
    async () => {
      answer([statedCitation(), regulationsRecord()]);
      const { ui, container } = await start();
      fireEvent.click(ui.getByRole("checkbox", { name: /Regulations\.gov/ }));
      await showResult(ui);
      expect(rowOf(ui, "Example Water Docket Document")).toHaveTextContent(
        "Comments close 2099-03-15, as stated by Regulations.gov.",
      );
      vi.mocked(search).mockClear();
      fireEvent.click(
        ui.getByRole("button", {
          name: "Find related: Example Water Docket Document",
        }),
      );
      const results = container.querySelector(".pane-results") as HTMLElement;
      await waitFor(() =>
        expect(results).toHaveTextContent(COPY.related.noResults),
      );
      expect(sentWith()).toEqual([
        ["regulations", "EPA-HQ-OW-2099-0001", lookup("docket")],
      ]);
      expect(results).toHaveTextContent(
        "Same docket: EPA-HQ-OW-2099-0001 (Regulations.gov)",
      );
      await showResult(ui);
      vi.mocked(search).mockClear();
      fireEvent.click(
        ui.getByRole("button", {
          name: "Find related: Example Groundfish Rule",
        }),
      );
      await waitFor(() =>
        expect(results).toHaveTextContent(COPY.related.noResults),
      );
      expect(sentWith().map(([source]) => source)).toEqual([
        "federal-register",
        "federal-register",
        "federal-register",
      ]);
    },
  );

  it("applies the type filter where a source has the type and says where it was not applied", async () => {
    const { ui, shell } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    fireEvent.click(ui.getByRole("checkbox", { name: /Regulations\.gov/ }));
    fireEvent.click(ui.getByRole("checkbox", { name: /Congress\.gov/ }));
    const type = ui.getByLabelText("Document type");
    fireEvent.change(type, { target: { value: "PRORULE" } });
    await showResult(ui);
    const typeBy = () =>
      Object.fromEntries(
        vi
          .mocked(search)
          .mock.calls.map(([source, , , , options]) => [
            source,
            options?.documentType,
          ]),
      );
    // Regulations.gov takes the filter only once its live check is recorded.
    const regulationsType = REGULATIONS_V2_CONFIRMED ? "PRORULE" : null;
    expect(typeBy()).toEqual({
      "federal-register": "PRORULE",
      govinfo: null,
      regulations: regulationsType,
    });
    const lane = (name: string) =>
      [...shell.querySelectorAll(".source-outcomes > li")].find((item) =>
        item.textContent!.startsWith(name),
      ) as HTMLElement;
    expect(lane("GovInfo")).toHaveTextContent(COPY.typeNotApplied);
    expect(lane("Federal Register")).not.toHaveTextContent(COPY.typeNotApplied);
    if (regulationsType)
      expect(lane("Regulations.gov")).not.toHaveTextContent(
        COPY.typeNotApplied,
      );
    else expect(lane("Regulations.gov")).toHaveTextContent(COPY.typeNotApplied);
    // Not searched at all ("water" is no bill reference), so it never says how it was searched.
    expect(lane("Congress.gov")).toHaveTextContent(COPY.skipped);
    expect(lane("Congress.gov")).not.toHaveTextContent(COPY.typeNotApplied);
    expect(shell.querySelector(".submitted-search")).toHaveTextContent(
      "Document type: Proposed Rule.",
    );
    // Regulations.gov has no Presidential Document, so it runs unfiltered and says so.
    fireEvent.change(type, { target: { value: "PRESDOCU" } });
    vi.mocked(search).mockClear();
    await showResult(ui);
    expect(typeBy()).toEqual({
      "federal-register": "PRESDOCU",
      govinfo: null,
      regulations: null,
    });
    expect(lane("Regulations.gov")).toHaveTextContent(COPY.typeNotApplied);
  });
});

describe("demo export nits, comment dates and following", () => {
  const DOCKET = "Docket No. 990101-0001";
  const rowOf = (ui: ReturnType<typeof within>, title: string) =>
    ui.getByRole("heading", { name: title }).closest("li") as HTMLElement;
  /** Blobs handed to the browser's downloads, in order. */
  let downloads: Blob[];
  beforeEach(() => {
    window.localStorage.clear();
    downloads = [];
    Object.assign(URL, {
      createObjectURL: vi.fn((blob: Blob) => {
        downloads.push(blob);
        return "blob:synthetic";
      }),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });
  afterEach(() => window.localStorage.clear());
  /** Word searches list `first`; identifier lookups list `related`, or fail. */
  function answer(
    first: readonly DemoCitation[],
    related: readonly DemoCitation[] | Error = [],
  ) {
    vi.mocked(search).mockImplementation(
      async (source, query, _page, _signal, options) => {
        const lookup = options?.match && options.match !== "text";
        if (lookup && related instanceof Error) throw related;
        return searchResult(
          [...(lookup ? (related as DemoCitation[]) : first)],
          query,
          source,
        );
      },
    );
  }

  it("retires an old Added notice when a new search starts", async () => {
    answer([{ ...citation(), textAvailable: false }]);
    const { shell, ui } = await start();
    await showResult(ui);
    fireEvent.click(ui.getByRole("button", { name: /Add to my citations/ }));
    const notes = shell.querySelector(".notes") as HTMLElement;
    expect(notes).toHaveTextContent("Added Example Water Policy.");
    fireEvent.input(ui.getByRole("searchbox"), {
      target: { value: "forests" },
    });
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    await ui.findByRole("button", { name: /In my citations/ });
    expect(notes).not.toHaveTextContent("Added");
  });

  it("exports the listed closing dates as a calendar file, and says why the button is off when none is stated", async () => {
    answer([citation()]);
    const { ui } = await start();
    const button = ui.getByRole("button", { name: COPY.calendar.button });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription(COPY.calendar.none);
    fireEvent.click(button);
    expect(downloads).toHaveLength(0);

    answer([statedCitation(), citation()]);
    await showResult(ui);
    expect(button).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(button);
    expect(ui.getByText(COPY.calendar.done(1))).toBeInTheDocument();
    expect(downloads).toHaveLength(1);
    expect(downloads[0].type).toBe("text/calendar");
    const ics = await downloads[0].text();
    expect(ics).toContain("SUMMARY:Comments close: Example Groundfish Rule");
    expect(ics).toContain("DTSTART;VALUE=DATE:20990201");
    // No search terms in the file.
    expect(ics).not.toContain("water");
  });

  it("follows a docket, keeps it in this browser, and shows documents new since the last check", async () => {
    answer(
      [statedCitation()],
      [{ ...citation("2099-00030", "Later notice"), docketIds: [DOCKET] }],
    );
    const { shell, ui } = await start();
    await showResult(ui);
    vi.mocked(search).mockClear();
    const followDocket = within(rowOf(ui, "Example Groundfish Rule")).getByRole(
      "button",
      { name: `Follow docket: ${DOCKET}` },
    );
    fireEvent.click(followDocket);
    expect(shell.querySelector(".notes")).toHaveTextContent(
      `Following ${DOCKET}.`,
    );
    expect(
      within(rowOf(ui, "Example Groundfish Rule")).getByRole("button", {
        name: `Following docket: ${DOCKET}`,
      }),
    ).toHaveAttribute("aria-disabled", "true");
    const saved = JSON.parse(
      window.localStorage.getItem("ps-demo-following-v1")!,
    );
    expect(saved.followed.map((item: { value: string }) => item.value)).toEqual(
      [DOCKET],
    );
    // Following sends nothing; only Check for new does.
    expect(search).not.toHaveBeenCalled();
    const zone = ui
      .getByRole("heading", { name: COPY.follow.title })
      .closest("section") as HTMLElement;
    expect(within(zone).getByText(COPY.follow.notChecked)).toBeInTheDocument();
    fireEvent.click(
      within(zone).getByRole("button", { name: COPY.follow.check }),
    );
    await within(zone).findByRole("link", { name: "Later notice" });
    const day = localDay(new Date());
    expect(zone).toHaveTextContent(`New since ${day}: 1 document.`);
    const [[source, query, , , options]] = vi.mocked(search).mock.calls;
    expect([source, query, options?.match, options?.dateFrom]).toEqual([
      "federal-register",
      DOCKET,
      "docket",
      day,
    ]);
    expect(zone).toHaveTextContent(COPY.follow.checked(1, 0, 0));
    expect(
      JSON.parse(window.localStorage.getItem("ps-demo-following-v1")!)
        .followed[0].lastChecked,
    ).not.toBeNull();
  });

  it("shows a failed lookup as unavailable, never as nothing new, and checks nothing on page load", async () => {
    answer([statedCitation()], new ApiFailure("Synthetic outage.", "service"));
    const first = await start();
    await showResult(first.ui);
    fireEvent.click(
      first.ui.getByRole("button", { name: `Follow RIN: 0648-AA00` }),
    );
    cleanup();
    vi.mocked(search).mockClear();
    // A reload restores the list and sends no lookup on its own.
    const { ui } = await start();
    expect(search).not.toHaveBeenCalled();
    const zone = ui
      .getByRole("heading", { name: COPY.follow.title })
      .closest("section") as HTMLElement;
    expect(zone).toHaveTextContent("RIN: 0648-AA00");
    fireEvent.click(
      within(zone).getByRole("button", { name: COPY.follow.check }),
    );
    await waitFor(() => expect(zone).toHaveTextContent("Unavailable."));
    expect(zone).not.toHaveTextContent("No document listed");
    expect(zone).toHaveTextContent(COPY.follow.notChecked);
    fireEvent.click(
      within(zone).getByRole("button", {
        name: "Stop following: RIN: 0648-AA00",
      }),
    );
    expect(zone).toHaveTextContent(COPY.follow.empty);
    expect(ui.getByRole("heading", { name: COPY.follow.title })).toHaveFocus();
  });

  it("keeps working when browser storage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    answer([statedCitation()]);
    const { shell, ui } = await start();
    expect(shell.querySelector(".notes")).toHaveTextContent(
      COPY.follow.storageUnavailable,
    );
    await showResult(ui);
    fireEvent.click(
      ui.getByRole("button", { name: `Follow docket: ${DOCKET}` }),
    );
    expect(shell.querySelector(".notes")).toHaveTextContent(
      COPY.follow.storageSaveFailed,
    );
    expect(
      ui.getByRole("button", { name: `Following docket: ${DOCKET}` }),
    ).toBeInTheDocument();
  });

  it("exports the followed list and imports only a file that checks whole", async () => {
    answer([statedCitation()]);
    const { ui, container } = await start();
    await showResult(ui);
    fireEvent.click(
      ui.getByRole("button", { name: `Follow docket: ${DOCKET}` }),
    );
    const zone = ui
      .getByRole("heading", { name: COPY.follow.title })
      .closest("section") as HTMLElement;
    fireEvent.click(
      within(zone).getByRole("button", { name: COPY.follow.exportButton }),
    );
    expect(zone).toHaveTextContent(COPY.follow.exportDone);
    const exported = await downloads[0].text();
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const choose = async (text: string) => {
      Object.defineProperty(input, "files", {
        configurable: true,
        value: [new File([text], "following.json")],
      });
      fireEvent.change(input);
    };
    await choose('{"version":1,"followed":[{"note":"x"}]}');
    await waitFor(() =>
      expect(zone).toHaveTextContent(COPY.follow.importRejected),
    );
    await choose(exported);
    await waitFor(() =>
      expect(zone).toHaveTextContent(COPY.follow.importDone(0, 1, 0, 50)),
    );
  });
});
