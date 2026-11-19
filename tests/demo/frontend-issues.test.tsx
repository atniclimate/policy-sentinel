// The issue table on the page (D-163 to D-165), with a synthetic table in
// place of config/issues.v1.json, which ships only the two rows D-171 allows
// until the Nation-name list is complete (D-168).
import { cleanup, render, waitFor, within } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSources, search } from "../../demo/api";
import { App } from "../../demo/main";
import type { IssueFile } from "../../src/demo/issues";
import { searchResult, sources } from "./frontend-fixtures";

const TABLE = vi.hoisted((): IssueFile => ({
  $schema: "../schemas/issues.schema.v1.json",
  schemaVersion: "1.0.0",
  artifactType: "issues",
  entries: [
    {
      kind: "issue",
      id: "sample-review",
      label: "Sample review consultation",
      names: [
        {
          name: "Sample review",
          basis: "people_use",
          reviewedOn: "2099-01-01",
        },
      ],
      restsOn: [
        {
          kind: "cfr",
          id: "36 CFR 800",
          label: "36 CFR Part 800",
          url: "https://www.govinfo.gov/link/cfr/36/800",
          stated: "PART 800",
          readOn: "2099-01-01",
        },
      ],
      searches: [
        {
          group: "policy",
          source: "federal-register",
          query: "36 CFR 800",
          match: "cfr",
          auto: true,
        },
      ],
      reviewedOn: "2099-01-01",
      reviewerRole: "owner",
    },
    {
      kind: "measure",
      id: "sample-act",
      label: "Sample Permitting Act",
      names: [{ name: "SPA", basis: "people_use", reviewedOn: "2099-01-01" }],
      identifiers: [
        {
          kind: "bill",
          id: "s 9999 119",
          label: "S. 9999 (119th Congress)",
          url: "https://www.govinfo.gov/app/details/BILLS-119s9999is",
          stated: "Sample Permitting Act",
          readOn: "2099-01-01",
        },
      ],
      provisions: [
        {
          issue: "sample-review",
          bill: "s 9999 119",
          version: "Introduced in Senate",
          section: "7",
          heading: "SEC. 7. SAMPLE REVIEW.",
          url: "https://www.govinfo.gov/content/pkg/BILLS-119s9999is/html/BILLS-119s9999is.htm",
          readOn: "2099-01-01",
          basis: "cites",
          cites: ["36 CFR 800"],
          reviewedOn: "2099-01-01",
        },
      ],
      searches: [
        {
          group: "legislation",
          source: "congress",
          query: "s 9999 119",
          auto: true,
        },
      ],
      reviewedOn: "2099-01-01",
      reviewerRole: "owner",
    },
  ],
}));

vi.hoisted(() => {
  vi.stubGlobal("__APP_VERSION__", "test-version");
});
vi.mock("../../config/issues.v1.json", () => ({ default: TABLE }));
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

describe("policy issues and bills on the page", () => {
  it("runs a bill's searches and lists its issue with the section and why", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const ui = within(container.querySelector(".screen-only") as HTMLElement);
    const chip = await ui.findByRole("button", {
      name: "Sample Permitting Act",
    });
    await waitFor(() => expect(chip).toHaveAttribute("aria-disabled", "false"));
    await user.click(chip);
    await waitFor(() => expect(search).toHaveBeenCalled());
    // The bill's own lookup, sent to Congress.gov whatever is checked.
    expect(
      vi.mocked(search).mock.calls.map(([source, query]) => [source, query]),
    ).toEqual([["congress", "s 9999 119"]]);
    const header = container.querySelector(".submitted-search") as HTMLElement;
    expect(header).toHaveTextContent("Bill searches: Sample Permitting Act");
    expect(header).toHaveTextContent("Issues listed with this bill");
    expect(header).toHaveTextContent(
      "S. 9999 (119th Congress), Introduced in Senate, section 7: SEC. 7. SAMPLE REVIEW.",
    );
    expect(header).toHaveTextContent(
      "The section's own text cites 36 CFR Part 800 (read 2099-01-01).",
    );
    expect(header).toHaveTextContent(
      "SPA (a name people use; no official page is recorded for it)",
    );
    expect(
      within(header).getByRole("button", {
        name: "Search this issue: Sample review consultation",
      }),
    ).toBeInTheDocument();
  });
});
