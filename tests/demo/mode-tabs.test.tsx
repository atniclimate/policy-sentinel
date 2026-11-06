// Mode tabs follow the WAI-ARIA tabs pattern and pass axe.
import { cleanup, fireEvent, render } from "@testing-library/preact";
import axe from "axe-core";
import { useState } from "preact/hooks";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModeTabs } from "../../demo/app/ModeTabs";
import { availableModes } from "../../src/demo/mode";
import type { Mode } from "../../src/demo/mode";

function Harness({ onChange }: { onChange: (mode: Mode) => void }) {
  const [mode, setMode] = useState<Mode>("research");
  return (
    <ModeTabs
      modes={availableModes(false)}
      current={mode}
      onChange={(next) => {
        onChange(next);
        setMode(next);
      }}
    >
      <p>Panel body</p>
    </ModeTabs>
  );
}

describe("mode tabs", () => {
  afterEach(cleanup);

  it("has one tab stop, a labelled panel, and no Committee libraries tab without a library", () => {
    const { getAllByRole, getByRole } = render(
      <Harness onChange={() => undefined} />,
    );
    const tabs = getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Research",
      "Grants",
      "Tracking",
    ]);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    const panel = getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", tabs[0].id);
    expect(tabs[0]).toHaveAttribute("aria-controls", panel.id);
  });

  it("moves with the arrow keys, wraps, and jumps with Home and End", () => {
    const onChange = vi.fn();
    const { getAllByRole, getByRole } = render(<Harness onChange={onChange} />);
    const tablist = getByRole("tablist");
    getAllByRole("tab")[0].focus();
    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("tracking");
    expect(getAllByRole("tab")[2]).toHaveFocus();
    expect(getAllByRole("tab")[2]).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("research");
    fireEvent.keyDown(tablist, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("tracking");
    fireEvent.keyDown(tablist, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("research");
    expect(getAllByRole("tab")[0]).toHaveFocus();
    fireEvent.keyDown(tablist, { key: "a" });
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it("has no automated axe violations", async () => {
    const { container } = render(<Harness onChange={() => undefined} />);
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
