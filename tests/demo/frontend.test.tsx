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
import { loadPdfFonts } from "../../demo/pdf-fonts";
import { buildPdf } from "../../src/demo/pdf";
import { emptyActors, STORAGE_KEY } from "../../src/demo/report-state";
import { keyOf } from "../../src/demo/validation";
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
vi.mock("../../demo/pdf-fonts", () => ({ loadPdfFonts: vi.fn() }));
vi.mock("../../src/demo/pdf", () => ({ buildPdf: vi.fn() }));

const ACTORS = {
  Name: "A. Example",
  Role: "Policy analyst",
  "Organization or Nation": "Example Organization",
  "Sharing with": "Example working group",
  Purpose: "Synthetic briefing.",
};
/** The same document from three sources: the Federal Register record and two other listings. */
const merged = { ...citation(), matchKey: "fr:2099-00001" };

beforeEach(() => {
  vi.resetAllMocks();
  window.sessionStorage.clear();
  vi.mocked(loadSources).mockResolvedValue(sources);
  vi.mocked(search).mockResolvedValue(searchResult());
  vi.mocked(readPolicy).mockResolvedValue(policy());
  vi.mocked(loadPdfFonts).mockResolvedValue(undefined);
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
    const status = ui.getByText("2 policies listed.").closest(".live");
    expect(status).toHaveAttribute("role", "status");
    // The source answered with a reason, so the row does not say it gave no answer.
    expect(status).toHaveTextContent("GovInfoNothing returned");
    expect(status).toHaveTextContent("GovInfo: Synthetic outage.");
    expect(status).not.toHaveTextContent("could not be searched");
    expect(status).toHaveTextContent("Federal Register1 shown of 1 found");
  });

  it("says No answer only for a source the demo service could not reach", async () => {
    vi.mocked(search).mockImplementation(async (source, query) => {
      if (source === "govinfo") throw new ApiFailure("service", "service");
      if (source === "regulations")
        throw new ApiFailure(
          "Regulations.gov has no document with that reference.",
          "source",
        );
      return searchResult([citation()], query, source);
    });
    const { ui } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    fireEvent.click(ui.getByRole("checkbox", { name: /Regulations\.gov/ }));
    await showResult(ui);
    const status = ui.getByText("1 policy listed.").closest(".live");
    expect(status).toHaveTextContent("GovInfoNo answer");
    expect(status).toHaveTextContent(
      "GovInfo could not be searched. The demo service did not answer.",
    );
    expect(status).toHaveTextContent("Regulations.govNothing returned");
    // A reason that already names its source is not given the name twice.
    expect(
      ui.getByText("Regulations.gov has no document with that reference."),
    ).toBeInTheDocument();
    expect(status).not.toHaveTextContent(
      "Regulations.gov could not be searched",
    );
  });

  it("does not say sources could not be searched when each answered with a reason", async () => {
    vi.mocked(search).mockImplementation(async (source) => {
      throw new ApiFailure(`Synthetic answer from ${source}.`, "source");
    });
    const { ui } = await start();
    fireEvent.click(ui.getByRole("checkbox", { name: /GovInfo/ }));
    fireEvent.input(ui.getByRole("searchbox"), { target: { value: "water" } });
    fireEvent.click(ui.getByRole("button", { name: "Search" }));
    expect(
      await ui.findByText("None of the selected sources returned results."),
    ).toBeInTheDocument();
    expect(ui.getAllByText("Nothing returned")).toHaveLength(2);
    expect(
      ui.getByText("GovInfo: Synthetic answer from govinfo."),
    ).toBeInTheDocument();
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
    expect(ui.getAllByText("No answer")).toHaveLength(2);
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
    expect(ui.getByText("Skipped")).toBeInTheDocument();

    // A bill reference is sent to Congress.gov as well.
    await showResult(ui, "hr 1234 119");
    expect(
      vi
        .mocked(search)
        .mock.calls.slice(1)
        .map((call) => call[0]),
    ).toEqual(["federal-register", "congress"]);
    expect(ui.queryByText("Skipped")).not.toBeInTheDocument();
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
