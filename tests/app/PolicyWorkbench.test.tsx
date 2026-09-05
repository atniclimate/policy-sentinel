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
import {
  createAnalyzedCorpusV2,
  createEvidenceSegment,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import type { AnalyzedCorpusV2 } from "../../src/pipeline/analyzed-corpus-v2.mjs";
// @ts-expect-error The authored Node fixture has no declaration file; its sealed result is the shared v2 contract.
import * as authored from "../pipeline/analyzed-corpus-v2.test.mjs";

const { syntheticCorpusV2, syntheticCorpusV2Input } = authored;

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
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select Edition 2022 for comparison",
      }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select Edition 2021 for comparison",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Compare institutional procedures" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect reference evidence 1" }),
    );
    expect(
      screen.getByRole("region", { name: "Source evidence" }),
    ).toHaveTextContent("Cites Instrument A");
  });

  it("masks unavailable relationship targets and distinguishes cutoff eligibility from retained absence", async () => {
    const input = syntheticCorpusV2Input();
    input.relationships[0].target.versionId = "version-a-new";
    render(<PolicyWorkbench corpus={createAnalyzedCorpusV2(input)} />);
    fireEvent.input(screen.getByLabelText("As of date"), {
      target: { value: "2021-06-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search corpus" }));
    expect(
      screen.getByText(/target not available by cutoff/u),
    ).toHaveTextContent("Instrument A");
    expect(screen.queryByText(/target resolved/u)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /No reviewed reference evidence is eligible at this cutoff/u,
      ),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Date evidence basis"), {
      target: { value: "source_effective" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search corpus" }));
    expect(
      screen.getByText(/does not apply cross-document/u),
    ).toHaveTextContent("determine what law is in force");
  });

  it("exposes unchanged text across shifted source locations with both evidence links", () => {
    let input = syntheticCorpusV2Input();
    for (const id of ["rendition-a-old", "rendition-a-new"]) {
      const rendition = input.renditions.find(
        (entry: { id: string }) => entry.id === id,
      );
      const capture = input.captures.find(
        (entry: { id: string }) => entry.id === rendition.captureId,
      );
      const previous = input.segments.find(
        (entry: { renditionId: string }) => entry.renditionId === id,
      );
      const blocks = [
        rendition.text,
        ...(id === "rendition-a-new" ? ["Inserted cover note."] : []),
        "The archive preserves annual statements.",
      ];
      const bytes = Buffer.from(blocks.join("\n\n"));
      const digest = createHash("sha256").update(bytes).digest("hex");
      Object.assign(rendition, {
        text: bytes.toString("utf8"),
        outputDigest: digest,
        byteLength: bytes.length,
      });
      Object.assign(capture, {
        objectDigest: digest,
        objectPath: `objects/${digest}.bin`,
        encodedBytes: bytes.length,
        decodedBytes: bytes.length,
      });
      let startByte = 0;
      const segments = blocks.map((block: string, number: number) => {
        const endByte = startByte + Buffer.byteLength(block);
        const segment = createEvidenceSegment({
          renditionId: id,
          renditionDigest: digest,
          renditionBytes: bytes,
          startByte,
          endByte,
          locator: {
            ...previous.locator,
            value: number
              ? `/document/p[${number + 1}]`
              : previous.locator.value,
          },
        });
        startByte = endByte + 2;
        return segment;
      });
      input.segments = input.segments.filter(
        (entry: { id: string }) => entry.id !== previous.id,
      );
      input = JSON.parse(
        JSON.stringify(input).replaceAll(previous.id, segments[0].id),
      );
      input.segments.push(...segments);
    }
    render(<PolicyWorkbench corpus={createAnalyzedCorpusV2(input)} />);
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
    const result = screen.getByRole("region", {
      name: "Text comparison result",
    });
    const summary = within(result).getByText(
      "Unchanged exact text matches (1)",
    );
    fireEvent.click(summary);
    const unchanged = summary.closest("details")!;
    expect(unchanged).toHaveTextContent("unique exact text");
    expect(unchanged).toHaveTextContent(
      "structural_path:/document/p[2] → structural_path:/document/p[3]",
    );
    fireEvent.click(
      within(unchanged).getByRole("button", { name: "After evidence 1" }),
    );
    expect(
      screen.getByRole("region", { name: "Source evidence" }),
    ).toHaveTextContent("The archive preserves annual statements.");
  });

  it("keeps later metadata out of historical controls and evidence while labeling full-population finding evidence", async () => {
    const input = syntheticCorpusV2Input();
    const prior = input.renditions[0];
    const text = prior.text.replace("Edition 2020", "Later editorial label");
    const bytes = Buffer.from(text);
    const digest = createHash("sha256").update(bytes).digest("hex");
    const capture = {
      ...input.captures[0],
      id: "capture-a-later",
      operationId: "operation-a-later",
      retrievedAt: "2026-09-03T00:00:00Z",
      objectDigest: digest,
      objectPath: `objects/${digest}.bin`,
      encodedBytes: bytes.length,
      decodedBytes: bytes.length,
    };
    const rendition = {
      ...prior,
      id: "rendition-a-later",
      captureId: capture.id,
      text,
      outputDigest: digest,
      byteLength: bytes.length,
    };
    const segment = createEvidenceSegment({
      renditionId: rendition.id,
      renditionDigest: digest,
      renditionBytes: bytes,
      startByte: 0,
      endByte: bytes.length,
      locator: { ...input.segments[0].locator },
    });
    input.captures.push(capture);
    input.renditions.push(rendition);
    input.segments.push(segment);
    input.versions[0].renditionIds.push(rendition.id);
    input.versions[0].sourceVersionIdentifier = "Later editorial label";
    const provenance = input.versions[0].fieldProvenance.find(
      (entry: { field: string }) => entry.field === "/sourceVersionIdentifier",
    );
    provenance.captureId = capture.id;
    provenance.segmentIds = [segment.id];
    const corpus = createAnalyzedCorpusV2(input);
    render(<PolicyWorkbench corpus={corpus} />);
    fireEvent.input(screen.getByLabelText("As of date"), {
      target: { value: "2026-09-02" },
    });
    fireEvent.change(screen.getByLabelText("Date evidence basis"), {
      target: { value: "corpus_observed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search corpus" }));
    const masked = screen.getByRole("checkbox", {
      name: "Select Source version label unknown at cutoff (version-a-old) for comparison",
    });
    expect(
      screen.queryByRole("checkbox", { name: /Later editorial label/u }),
    ).not.toBeInTheDocument();
    fireEvent.click(masked);
    expect(
      screen.getByRole("button", {
        name: "Remove Source version label unknown at cutoff (version-a-old)",
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Inspect passage 1 · Source version label unknown at cutoff (version-a-old)",
      }),
    );
    let panel = screen.getByRole("region", { name: "Source evidence" });
    expect(panel).not.toHaveTextContent("Later editorial label");
    expect(panel).toHaveTextContent("Search evidence at cutoff");
    fireEvent.click(
      within(panel).getByRole("button", { name: "Close evidence" }),
    );
    const findings = screen.getByRole("region", {
      name: "Provisional findings and counterevidence",
    });
    fireEvent.click(
      within(findings).getByRole("button", { name: "Read evidence 1" }),
    );
    panel = screen.getByRole("region", { name: "Source evidence" });
    expect(panel).toHaveTextContent("outside the date-filtered search");
    expect(panel).toHaveTextContent("Later editorial label");
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
