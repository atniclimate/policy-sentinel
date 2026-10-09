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
import { installSkipLink } from "../../src/app/skip-link";
import {
  createAnalyzedCorpusV2,
  createAnalyzedCorpusV21,
  canonicalV2Digest,
  createEvidenceSegment,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import type { AnalyzedCorpusV2 } from "../../src/pipeline/analyzed-corpus-v2.mjs";
// @ts-expect-error The authored Node fixture has no declaration file; its sealed result is the shared v2 contract.
import * as authored from "../pipeline/analyzed-corpus-v2.test.mjs";

const { syntheticCorpusV2, syntheticCorpusV2Input } = authored;

const fixture = (): AnalyzedCorpusV2 => syntheticCorpusV2();
function jurisdictionFixture(metadataOnly = false) {
  const input = syntheticCorpusV2Input();
  const base = fixture();
  const version = base.versions.find((row) => row.id === "version-a-old")!;
  const rendition = base.renditions.find(
    (row) => row.versionId === version.id,
  )!;
  const segment = base.segments.find(
    (row) => row.renditionId === rendition.id,
  )!;
  const capture = base.captures.find((row) => row.id === rendition.captureId)!;
  for (const work of input.works) work.jurisdictionRefs = [];
  input.works.find(
    (work: { id: string }) => work.id === "work-a",
  ).jurisdictionRefs = [
    {
      jurisdictionRef: "body:synthetic-council",
      basis: "issuing_authority",
      evidence: {
        url: capture.finalUrl,
        locator: segment.locator.value,
        exactSubject: {
          recordRef: "work-a",
          ref: "body:synthetic-council",
          text: "The council must review proposals.",
        },
      },
      reviewState: "reviewed",
      versionId: version.id,
      segmentIds: [segment.id],
      reviewer: {
        name: "Synthetic reviewer",
        kind: "human",
        reviewedAt: "2026-09-02T01:00:00Z",
      },
    },
  ];
  if (metadataOnly) {
    const profile = input.sourceProfiles.find(
      (row: { id: string }) => row.id === "profile-a",
    );
    profile.uses.localDisplay = "metadata_link";
    for (const row of input.captures)
      if (row.sourceProfileId === profile.id)
        row.sourceProfileDigest = canonicalV2Digest(profile);
  }
  return createAnalyzedCorpusV21(input);
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("local policy workbench", () => {
  it("filters reviewed identifiers by evidenced version and preserves explicit proof without inferring current scope", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PolicyWorkbench corpus={jurisdictionFixture()} />,
    );
    const filter = screen.getByRole("combobox", {
      name: "Reviewed jurisdiction identifier",
    });
    filter.focus();
    expect(filter).toHaveFocus();
    await user.selectOptions(filter, "body:synthetic-council");
    await user.click(screen.getByRole("button", { name: "Search corpus" }));
    expect(screen.getByRole("status")).toHaveTextContent("1 matching versions");
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
    fireEvent.click(
      screen.getByText("Work provenance, events, and references"),
    );
    const associations = screen.getByRole("region", {
      name: "Source-backed jurisdiction associations",
    });
    expect(associations).toHaveTextContent("body:synthetic-council");
    expect(associations).toHaveTextContent(
      "The council must review proposals.",
    );
    expect(associations).toHaveTextContent("version-a-old");
    fireEvent.click(
      within(associations).getByRole("button", {
        name: "Read jurisdiction association evidence 1",
      }),
    );
    expect(
      screen.getByRole("region", { name: "Source evidence" }),
    ).toHaveTextContent("The council must review proposals.");
    fireEvent.click(screen.getByRole("button", { name: "Close evidence" }));
    await user.selectOptions(filter, "");
    await user.type(screen.getByRole("searchbox"), "within 30 days");
    await user.click(screen.getByRole("button", { name: "Search corpus" }));
    fireEvent.click(
      screen.getByText("Work provenance, events, and references"),
    );
    expect(
      screen.getByRole("region", {
        name: "Source-backed jurisdiction associations",
      }),
    ).toHaveTextContent(
      "another retained version, not evidence for this search hit",
    );
    expect((await axe.run(container)).violations).toEqual([]);
  });

  it("keeps association wording behind source display permission while preserving evidence navigation", async () => {
    const user = userEvent.setup();
    render(<PolicyWorkbench corpus={jurisdictionFixture(true)} />);
    await user.selectOptions(
      screen.getByRole("combobox", {
        name: "Reviewed jurisdiction identifier",
      }),
      "body:synthetic-council",
    );
    await user.click(screen.getByRole("button", { name: "Search corpus" }));
    fireEvent.click(
      screen.getByText("Work provenance, events, and references"),
    );
    const associations = screen.getByRole("region", {
      name: "Source-backed jurisdiction associations",
    });
    expect(associations).toHaveTextContent(
      "Source wording is withheld by its display policy.",
    );
    expect(associations.querySelector("blockquote")).toBeNull();
    fireEvent.click(
      within(associations).getByRole("button", {
        name: "Read jurisdiction association evidence 1",
      }),
    );
    const evidence = screen.getByRole("region", { name: "Source evidence" });
    expect(evidence).toHaveTextContent(
      "Source terms permit metadata and links here. Text is not displayed.",
    );
    expect(evidence.querySelector("blockquote")).toBeNull();
  });

  it("keeps the static skip link working after the loading main is replaced", async () => {
    const user = userEvent.setup();
    const skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#main-content";
    skip.textContent = "Skip to main content";
    document.body.prepend(skip);
    const removeListener = installSkipLink();
    try {
      const view = render(
        <main id="main-content" tabIndex={-1}>
          Verifying the local corpus…
        </main>,
      );
      await user.tab();
      expect(skip).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(screen.getByRole("main")).toHaveFocus();

      view.rerender(<PolicyWorkbench corpus={fixture()} />);
      skip.focus();
      await user.keyboard("{Enter}");
      const main = screen.getByRole("main");
      expect(main).toHaveFocus();
      for (const name of ["Skip to policy search", "Search"]) {
        expect(screen.getByRole("link", { name, exact: true })).toHaveAttribute(
          "href",
          `#${main.id}`,
        );
      }
    } finally {
      removeListener();
      skip.remove();
    }
  });

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
