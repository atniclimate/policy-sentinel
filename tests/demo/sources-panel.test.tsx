// The Sources panel renders the source model (design T1.6, safeguard 8): no
// "Live" badge, each row with its state, coverage limit and freshness, this
// search's outcome where there is one, keyboard-reachable links, axe clean.
import { cleanup, render, within } from "@testing-library/preact";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SourceList, SourcesPanel } from "../../demo/app/SourcesPanel";
import { sourceModel as S } from "../../src/demo/copy/sources";
import { LINK_OUT_URLS, sourceRows } from "../../src/demo/source-model";
import { sources } from "./frontend-fixtures";

const NOW = new Date("2099-03-01T12:00:00Z");
const federal = sources.filter((s) => s.level === "federal");
const states = sources.filter((s) => s.level === "state");

describe("sources panel", () => {
  afterEach(cleanup);

  it("lists every named source with its state, limit and freshness, and never says Live", () => {
    const rows = sourceRows({
      sources,
      manifest: null,
      now: NOW,
      outcomes: { regulations: "rate_limited" },
    });
    const { container } = render(<SourceList sources={sources} rows={rows} />);
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(rows.length);
    const ui = within(container as HTMLElement);
    expect(ui.queryByText("Live", { exact: true })).not.toBeInTheDocument();
    expect(
      ui.getAllByText(S.enabledUnverified, { exact: false }).length,
    ).toBeGreaterThan(0);
    const regulations = within(items[3] as HTMLElement);
    expect(regulations.getByText("Regulations.gov")).toBeInTheDocument();
    expect(
      regulations.getByText(S.outcome.rate_limited, { exact: false }),
    ).toBeInTheDocument();
    expect(
      ui.getByText("Not available from an official source.", { exact: false }),
    ).toBeInTheDocument();
    expect(
      ui.getAllByText(S.indexMissing, { exact: false }).length,
    ).toBeGreaterThan(0);
  });

  it("opens link-out sources by keyboard-reachable links to their official pages", () => {
    const rows = sourceRows({ sources, manifest: null, now: NOW });
    const { container } = render(<SourceList sources={sources} rows={rows} />);
    const links = within(container as HTMLElement).getAllByRole("link");
    const known = Object.values(LINK_OUT_URLS).filter(Boolean);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(known);
    for (const link of links) expect(link.tabIndex).toBe(0);
  });

  it("shows the model's state in the search rail when rows are given", () => {
    const rows = sourceRows({ sources, manifest: null, now: NOW });
    const { container } = render(
      <SourcesPanel
        scope="federal"
        federal={federal}
        states={states}
        checked={["federal-register"]}
        stateId="washington"
        onToggle={vi.fn()}
        onState={vi.fn()}
        rows={rows}
      />,
    );
    const ui = within(container as HTMLElement);
    expect(ui.queryByText("Live", { exact: true })).not.toBeInTheDocument();
    expect(ui.getAllByText(S.enabledUnverified)).toHaveLength(federal.length);
    expect(ui.getAllByRole("checkbox")[0]).toBeChecked();
  });

  it("keeps the rail's existing badges when no rows are passed", () => {
    const { container } = render(
      <SourcesPanel
        scope="state"
        federal={federal}
        states={states}
        checked={[]}
        stateId="oregon"
        onToggle={vi.fn()}
        onState={vi.fn()}
      />,
    );
    expect(container.querySelector("#state-note")).toHaveTextContent(
      "Synthetic gap: not enabled.",
    );
  });

  it("has no automated axe violations", async () => {
    const rows = sourceRows({
      sources,
      manifest: null,
      now: NOW,
      outcomes: { govinfo: "unavailable" },
    });
    const { container } = render(
      <section aria-label="Sources">
        <SourcesPanel
          scope="federal"
          federal={federal}
          states={states}
          checked={["federal-register"]}
          stateId="washington"
          onToggle={vi.fn()}
          onState={vi.fn()}
          rows={rows}
        />
        <SourceList sources={sources} rows={rows} />
      </section>,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
