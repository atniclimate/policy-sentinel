/** @jsxImportSource preact */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PolicyWorkbench } from "../../src/app/PolicyWorkbench";
import type { AnalyzedCorpusV2 } from "../../src/pipeline/analyzed-corpus-v2.mjs";
// @ts-expect-error The authored Node fixture has no declaration file; its sealed result is the shared v2 contract.
import { syntheticCorpusV2 } from "../pipeline/analyzed-corpus-v2.test.mjs";

const fixture = (): AnalyzedCorpusV2 => syntheticCorpusV2();
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("local policy workbench", () => {
  it("supports keyboard search, source evidence focus/return and exact replay locators without network calls", async () => {
    const network = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected network"));
    const user = userEvent.setup();
    const corpus = fixture();
    render(
      <PolicyWorkbench
        corpus={corpus}
        dossierHref="./dossier.html"
        jsonHref="./corpus.json"
      />,
    );
    const query = screen.getByRole("searchbox", {
      name: "Identifier, title, or question",
    });
    query.focus();
    await user.type(query, '"within 30 days"');
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "1 matching versions",
      ),
    );
    expect(
      screen.getByRole("heading", { name: "Matching source versions" }),
    ).toHaveFocus();
    const inspect = screen.getByRole("button", {
      name: "Inspect passage 1 · Edition 2022",
    });
    inspect.focus();
    await user.keyboard("{Enter}");
    const evidence = screen.getByRole("region", { name: "Source evidence" });
    expect(
      within(evidence).getByRole("heading", { name: "Source evidence" }),
    ).toHaveFocus();
    expect(evidence).toHaveTextContent("within 30 days");
    expect(evidence).toHaveTextContent("UTF-8 byte range");
    expect(
      within(evidence).getByRole("link", {
        name: "Open originating source (new tab)",
      }),
    ).toHaveAttribute("href", "https://source-a.invalid/policy/a-new");
    await user.click(
      within(evidence).getByRole("button", { name: "Close evidence" }),
    );
    expect(inspect).toHaveFocus();
    expect(
      screen.getByRole("link", { name: "Open local dossier" }),
    ).toHaveAttribute("href", "./dossier.html");
    expect(network).not.toHaveBeenCalled();
  });

  it("exposes deterministic text and institutional comparisons with analyst uncertainty and evidence", async () => {
    render(<PolicyWorkbench corpus={fixture()} />);
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select Edition 2020 for comparison",
      }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select Edition 2022 for comparison",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Compare text versions" }),
    );
    expect(
      screen.getByRole("region", { name: "Text comparison result" }),
    ).toHaveTextContent("text changed");
    expect(
      screen.getByRole("region", { name: "Text comparison result" }),
    ).toHaveTextContent("version-a-old → version-a-new");
    fireEvent.click(
      screen.getByRole("button", { name: "Compare institutional procedures" }),
    );
    const comparison = screen.getByRole("region", {
      name: "Institutional procedure comparison",
    });
    expect(comparison).toHaveTextContent(
      "provisional comparison of declared coding",
    );
    expect(comparison).toHaveTextContent("Synthetic analyst");
    expect(comparison).toHaveTextContent("not coded unknown");
    expect(
      within(comparison).getAllByRole("button", { name: /Read evidence/u })
        .length,
    ).toBeGreaterThan(0);
  });

  it("keeps unknown temporal states and coverage explicit and excludes future versions from results", async () => {
    render(<PolicyWorkbench corpus={fixture()} />);
    fireEvent.input(screen.getByLabelText("As of date"), {
      target: { value: "2020-12-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search corpus" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "1 matching versions",
      ),
    );
    expect(
      screen.getByRole("checkbox", {
        name: "Select Edition 2020 for comparison",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", {
        name: "Select Edition 2022 for comparison",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/works have no supported version/u),
    ).toHaveTextContent("1 works have no supported version");
    expect(
      screen.getByRole("button", { name: "Compare text versions" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("heading", { name: "Coverage and source health" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/outside the date-filtered search/u),
    ).toBeInTheDocument();
  });

  it("escapes source markup, rejects unowned output links, and shows reviewed omission boundaries", async () => {
    const base = fixture();
    // The UI receives producer-validated objects; this display-only variant tests
    // literal rendering and boundary notices without changing search source bytes.
    const corpus = {
      ...base,
      works: base.works.map((work) => ({
        ...work,
        title: `${work.title} <img src=x onerror=alert(1)>`,
      })),
      renditions: base.renditions.map((rendition) => ({
        ...rendition,
        omittedSourceLocators: ["/policy/omitted-paragraph"],
      })),
    };
    const { container } = render(
      <PolicyWorkbench
        corpus={corpus}
        dossierHref="https://unowned.invalid/dossier"
        jsonHref="javascript:alert(1)"
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Open local dossier" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Open corpus JSON" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect passage 1 · Edition 2020" }),
    );
    const evidence = screen.getByRole("region", { name: "Source evidence" });
    expect(evidence).toHaveTextContent("Reviewed source blocks were omitted");
    expect(evidence).toHaveTextContent("/policy/omitted-paragraph");
  });

  it("has no automated accessibility violations in search, evidence, findings and comparison controls", async () => {
    const { container } = render(<PolicyWorkbench corpus={fixture()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect passage 1 · Edition 2021" }),
    );
    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations.map(({ id, help }) => ({ id, help }))).toEqual([]);
  });
});
