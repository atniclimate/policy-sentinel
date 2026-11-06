import axe from "axe-core";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LinkedRecordsPanel } from "../../demo/app/LinkedRecordsPanel";
import {
  cfrPartLinks,
  relatedRows,
  uscSectionLinks,
} from "../../src/demo/links";
import {
  cfrFile,
  cfrShard,
  frRecord,
  NOW,
  staleCfrFile,
  uscFile,
  uscShard,
} from "./fixtures/chain";
import { allRows, answered, idle, notices } from "./fixtures/chain/panel-props";

const terms = (li: HTMLElement) =>
  [...li.querySelectorAll("dt")].map((dt) => dt.textContent);

afterEach(cleanup);

describe("LinkedRecordsPanel", () => {
  it("puts its headings in order: the panel, then its three sections", () => {
    render(<LinkedRecordsPanel rows={allRows()} />);
    expect(
      screen.getAllByRole("heading").map((h) => [h.tagName, h.textContent]),
    ).toEqual([
      ["H3", "Cited and Linked Records"],
      ["H4", "Stated by the Source"],
      ["H4", "Shared Identifiers"],
      ["H4", "Citations Found in the Text"],
    ]);
  });

  it("shows a CFR hop in the C1 order with as-of and retrieval as two labeled facts", () => {
    const rows = cfrPartLinks(cfrShard, "100", cfrFile, NOW) ?? [];
    const { container } = render(<LinkedRecordsPanel rows={rows} />);
    const li = container.querySelector<HTMLElement>(".chain-row")!;
    expect(terms(li)).toEqual([
      "Basis",
      "Source",
      "Source wording",
      "As of",
      "Retrieved",
    ]);
    const text = li.textContent ?? "";
    const order = [
      "CFR annual edition (GovInfo)",
      "Revised as of April 1, 2099",
      "2099-02-01",
      "Open at CFR annual edition (GovInfo)",
    ].map((s) => text.indexOf(s));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(
      within(li).getByRole("link", {
        name: "Open at CFR annual edition (GovInfo)",
      }),
    ).toHaveAttribute(
      "href",
      "https://www.govinfo.gov/bulkdata/CFR/2099/title-99",
    );
    // The authority line is quoted once, above the first row that comes from it.
    expect(container.querySelectorAll("blockquote")).toHaveLength(2);
    expect(screen.queryByText(/snapshot older/i)).toBeNull();
  });

  it("shows a U.S.C. hop with its release point and the stale sentence for an old file", () => {
    const usc =
      uscSectionLinks(uscShard, "/us/usc/t99/s1001", uscFile, NOW) ?? [];
    const { container, unmount } = render(<LinkedRecordsPanel rows={usc} />);
    const li = container.querySelector<HTMLElement>(".chain-row")!;
    expect(terms(li)).toEqual([
      "Basis",
      "Source",
      "Release point",
      "Retrieved",
    ]);
    expect(li).toHaveTextContent("Current through 120-1");
    unmount();
    render(
      <LinkedRecordsPanel
        rows={cfrPartLinks(cfrShard, "100", staleCfrFile, NOW) ?? []}
      />,
    );
    expect(
      screen.getAllByText("Snapshot older than six months; check the source."),
    ).not.toHaveLength(0);
  });

  it("states an empty section rather than showing an empty list", () => {
    render(<LinkedRecordsPanel rows={[]} />);
    expect(screen.getAllByText("None stated in what was read.")).toHaveLength(
      3,
    );
  });

  it("asks a live source only when its button is pressed, once per press", () => {
    const onExpand = vi.fn();
    render(
      <LinkedRecordsPanel rows={[]} expansions={idle} onExpand={onExpand} />,
    );
    expect(onExpand).not.toHaveBeenCalled();
    const button = screen.getByRole("button", {
      name: "Show related records stated by GovInfo",
    });
    button.focus();
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);
    expect(onExpand).toHaveBeenCalledTimes(1);
    expect(onExpand).toHaveBeenCalledWith("govinfo_related");
  });

  it("shows an answered family's rows and a failed one's message", () => {
    render(<LinkedRecordsPanel rows={[]} expansions={answered()} />);
    expect(screen.getByText("Related Documents")).toHaveAttribute(
      "data-verbatim",
      "relation",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The source did not answer.",
    );
  });

  it("marks a listed relation name as relation and states a withheld one unmarked", () => {
    const rows = relatedRows(
      {
        ok: true,
        source: "govinfo",
        basis: "source_field",
        accessId: "BILLS-199hr1001ih",
        relations: [
          { relation: "Public and Private Laws", collection: "PLAW" },
          { relation: "Example Unlisted Relation", collection: "BILLS" },
        ],
        retrievedAt: "2099-01-07T11:59:00.000Z",
      },
      frRecord,
    );
    render(
      <LinkedRecordsPanel
        rows={[]}
        expansions={[{ id: "govinfo_related", state: "done", rows }]}
      />,
    );
    expect(screen.getByText("Public and Private Laws")).toHaveAttribute(
      "data-verbatim",
      "relation",
    );
    expect(
      screen.getByText("relation name not shown here"),
    ).not.toHaveAttribute("data-verbatim");
    expect(screen.queryByText("Example Unlisted Relation")).toBeNull();
  });

  it("offers a hop into the index for CFR and U.S.C. targets", () => {
    const onHop = vi.fn();
    render(
      <LinkedRecordsPanel
        rows={cfrPartLinks(cfrShard, "100", cfrFile, NOW) ?? []}
        onHop={onHop}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open 99 U.S.C. 1001 et seq. in this chain",
      }),
    );
    expect(onHop).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: "usc-index",
        identifier: "/us/usc/t99/s1001",
      }),
    );
  });

  it("has no automated axe violations with every row kind, notice and expansion", async () => {
    const { container } = render(
      <main>
        <h1>Synthetic chain fixture</h1>
        <h2>Document</h2>
        <LinkedRecordsPanel
          rows={allRows()}
          notices={notices}
          expansions={idle}
          onExpand={() => undefined}
          onHop={() => undefined}
        />
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
