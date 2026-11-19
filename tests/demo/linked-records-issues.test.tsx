// S2: the "Cited and Linked Records" panel's in-text citation section also
// says which listed issues the opened document's own in-text citations name
// (D-164, issuesInText). Rendering only; matches come up from identifiers,
// never from words.
import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { LinkedRecordsPanel } from "../../demo/app/LinkedRecordsPanel";
import { chain } from "../../src/demo/copy/chain";
import type { EntryMatch } from "../../src/demo/issue-match";
import type { IssueIdentifier } from "../../src/demo/issues";

afterEach(cleanup);

function identifier(
  kind: IssueIdentifier["kind"],
  id: string,
): IssueIdentifier {
  return {
    kind,
    id,
    label: id,
    url: "https://example.gov/read",
    stated: id,
    readOn: "2026-11-18",
  };
}

const TWO_ENTRIES: readonly EntryMatch[] = [
  {
    entry: {
      kind: "issue",
      id: "section-106",
      label: "Section 106",
      names: [],
      restsOn: [identifier("usc", "54 U.S.C. 306108")],
      searches: [],
      reviewedOn: "2026-11-18",
      reviewerRole: "owner",
    },
    matches: [{ identifier: identifier("usc", "54 U.S.C. 306108"), count: 3 }],
  },
  {
    entry: {
      kind: "measure",
      id: "ndaa-fy2027",
      label: "NDAA FY2027",
      names: [],
      identifiers: [identifier("bill", "s 5653 119")],
      provisions: [],
      searches: [],
      reviewedOn: "2026-11-18",
      reviewerRole: "owner",
    },
    matches: [{ identifier: identifier("bill", "s 5653 119"), count: 1 }],
  },
];

describe("LinkedRecordsPanel issues block", () => {
  it("shows the heading, help sentence, entry labels and singular/plural place counts", () => {
    render(<LinkedRecordsPanel rows={[]} issues={TWO_ENTRIES} />);
    const heading = screen.getByRole("heading", {
      level: 5,
      name: chain.issues.title,
    });
    expect(heading).toBeTruthy();
    expect(screen.getByText(chain.issues.help)).toBeTruthy();
    expect(screen.getByText("Section 106")).toBeTruthy();
    expect(screen.getByText("NDAA FY2027")).toBeTruthy();
    expect(
      screen.getByText(chain.issues.row("54 U.S.C. 306108", 3)),
    ).toBeTruthy();
    expect(
      screen.getByText("54 U.S.C. 306108, cited at 3 places"),
    ).toBeTruthy();
    expect(screen.getByText(chain.issues.row("s 5653 119", 1))).toBeTruthy();
    expect(screen.getByText("s 5653 119, cited at 1 place")).toBeTruthy();
  });

  it("shows nothing for the block without the prop, or with an empty array", () => {
    const { unmount } = render(<LinkedRecordsPanel rows={[]} />);
    expect(screen.queryByRole("heading", { level: 5 })).toBeNull();
    expect(screen.queryByText(chain.issues.title)).toBeNull();
    expect(screen.queryByText(chain.issues.help)).toBeNull();
    unmount();
    render(<LinkedRecordsPanel rows={[]} issues={[]} />);
    expect(screen.queryByRole("heading", { level: 5 })).toBeNull();
    expect(screen.queryByText(chain.issues.title)).toBeNull();
    expect(screen.queryByText(chain.issues.help)).toBeNull();
  });

  it("keeps the panel's heading order intact and nests the H5 inside the in-text section", () => {
    render(<LinkedRecordsPanel rows={[]} issues={TWO_ENTRIES} />);
    expect(screen.getAllByRole("heading").map((h) => h.tagName)).toEqual([
      "H3",
      "H4",
      "H4",
      "H4",
      "H5",
    ]);
    const inTextSection = screen
      .getByRole("heading", { name: chain.sections.inText })
      .closest("section")!;
    const h5 = screen.getByRole("heading", {
      level: 5,
      name: chain.issues.title,
    });
    expect(inTextSection.contains(h5)).toBe(true);
  });

  it("has no automated axe violations with the issues block present", async () => {
    const { container } = render(
      <main>
        <h1>Synthetic chain fixture</h1>
        <h2>Document</h2>
        <LinkedRecordsPanel rows={[]} issues={TWO_ENTRIES} />
      </main>,
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations.map(({ id, help }) => ({ id, help }))).toEqual(
      [],
    );
  });
});
