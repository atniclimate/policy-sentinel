import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSources, readPolicy, search } from "../../demo/api";
import { App } from "../../demo/main";
import { STORAGE_KEY } from "../../src/demo/report-state";
import {
  citation,
  deferred,
  policy,
  searchResult,
  sources,
} from "./frontend-fixtures";
import type {
  DemoPolicyResponse,
  DemoSearchResponse,
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
    expect(ui.getByRole("button", { name: "Search" })).toBeEnabled(),
  );
  return { ...rendered, ui };
}

async function showResult(ui: ReturnType<typeof within>) {
  fireEvent.input(ui.getByRole("searchbox"), { target: { value: "water" } });
  fireEvent.click(ui.getByRole("button", { name: "Search" }));
  await ui.findAllByRole("button", { name: /Add to my citations/ });
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
    fireEvent.click(ui.getByRole("radio", { name: /Washington Legislature/ }));
    await act(async () => {
      request.resolve(searchResult());
    });
    await waitFor(() =>
      expect(ui.getByRole("button", { name: "Search" })).toBeEnabled(),
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
    const policyNote = await ui.findByLabelText("Your note on this policy");
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
    fireEvent.input(ui.getByLabelText("Your note on this passage"), {
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
        ui.queryByLabelText("Your note on this policy"),
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
    fireEvent.input(ui.getByLabelText("Your note on this passage"), {
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
    expect(
      ui.getByText(/saved citation list could not be restored/),
    ).toBeInTheDocument();
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
    const note = await ui.findByLabelText("Your note on this policy");
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
    expect(ui.getByRole("button", { name: "Search" })).toBeDisabled();
    fireEvent.click(retry);
    await waitFor(() =>
      expect(ui.getByRole("button", { name: "Search" })).toBeEnabled(),
    );
  });
});
