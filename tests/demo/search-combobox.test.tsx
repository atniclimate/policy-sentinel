// The search box combobox (design section 2, T1.2): WAI-ARIA 1.2 list
// autocomplete with focus kept on the input, suggestions from the router and
// static vocabularies only, and the box's one submit path.
import { cleanup, render, screen } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { useState } from "preact/hooks";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBox } from "../../demo/app/SearchBox";
import { SearchCombobox } from "../../demo/app/SearchCombobox";
import { router as copy } from "../../src/demo/copy/router";
import type { VocabularyFile } from "../../src/demo/index-types";
import type { RouteReading } from "../../src/demo/query-route";

const vocabulary: VocabularyFile[] = [
  {
    $schema: "../../schemas/demo-index.schema.v1.json",
    schemaVersion: "1.0.0",
    artifactType: "vocabulary",
    kind: "fr_agency",
    entries: [
      {
        id: "sample-water-office",
        label: "Sample Water Office",
        shortLabel: null,
        parentId: null,
      },
    ],
  },
];

function Harness({
  onSubmit,
  onChoose,
}: {
  onSubmit: (value: string) => void;
  onChoose?: (reading: RouteReading) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <main>
      <SearchBox
        value={value}
        onInput={setValue}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(value);
        }}
        help="Words, a title, or a citation."
        error=""
        blockedNote={false}
        off={false}
        input={(field) => (
          <SearchCombobox
            {...field}
            vocabulary={vocabulary}
            onChoose={onChoose}
          />
        )}
      />
    </main>
  );
}

const setup = () => {
  const onSubmit = vi.fn();
  const onChoose = vi.fn();
  const user = userEvent.setup();
  render(<Harness onSubmit={onSubmit} onChoose={onChoose} />);
  const box = screen.getByRole("combobox");
  return { user, box, onSubmit, onChoose };
};
const optionIds = () =>
  screen.queryAllByRole("option").map((o) => o.getAttribute("id"));

let fetchSpy: ReturnType<typeof vi.fn>;
let storageSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  storageSpy = vi.spyOn(Storage.prototype, "setItem");
});
afterEach(() => {
  cleanup();
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(storageSpy).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("search combobox", () => {
  it("keeps the box's id and label and starts collapsed", () => {
    const { box } = setup();
    expect(box).toHaveAttribute("id", "q");
    expect(screen.getByLabelText("Search terms")).toBe(box);
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(box).toHaveAttribute("aria-autocomplete", "list");
    expect(box).toHaveAttribute("aria-controls", "q-listbox");
    expect(box).not.toHaveAttribute("aria-activedescendant");
  });

  it("lists every reading of a bare bill number and says so in the status", async () => {
    const { user, box } = setup();
    await user.type(box, "HB 2100");
    expect(box).toHaveAttribute("aria-expanded", "true");
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Washington HB 2100",
      `Oregon HB 2100 (${copy.linkOutNote})`,
    ]);
    expect(screen.getByRole("status")).toHaveTextContent(
      `${copy.chooseReading} Washington HB 2100; Oregon HB 2100`,
    );
  });

  it("asks the person to choose a bare number's one plausible reading, never calling it several", async () => {
    const { user, box } = setup();
    await user.type(box, "HB 1100");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Washington HB 1100",
    ]);
    expect(screen.getByRole("status")).toHaveTextContent(
      `${copy.confirmReading} Washington HB 1100`,
    );
    expect(screen.getByRole("status")).not.toHaveTextContent(
      copy.chooseReading,
    );
  });

  it("says Searched as words for plain words and offers nothing", async () => {
    const { user, box } = setup();
    await user.type(box, "salmon habitat");
    expect(screen.getByRole("status")).toHaveTextContent(copy.searchedAsWords);
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(optionIds()).toEqual([]);
  });

  it("moves the active option with Down, Up, Home and End while focus stays on the box", async () => {
    const { user, box } = setup();
    await user.type(box, "HB 2100");
    await user.keyboard("{ArrowDown}");
    expect(box).toHaveAttribute("aria-activedescendant", "q-option-0");
    expect(screen.getAllByRole("option")[0]).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.keyboard("{ArrowDown}");
    expect(box).toHaveAttribute("aria-activedescendant", "q-option-1");
    await user.keyboard("{ArrowDown}");
    expect(box).toHaveAttribute("aria-activedescendant", "q-option-0");
    await user.keyboard("{ArrowUp}");
    expect(box).toHaveAttribute("aria-activedescendant", "q-option-1");
    await user.keyboard("{Home}");
    expect(box).not.toHaveAttribute("aria-activedescendant");
    await user.keyboard("{ArrowUp}{End}");
    expect(box).not.toHaveAttribute("aria-activedescendant");
    expect(box).toHaveFocus();
  });

  it("opens on Up at the last option", async () => {
    const { user, box } = setup();
    await user.type(box, "HB 2100");
    await user.keyboard("{Escape}{ArrowUp}");
    expect(box).toHaveAttribute("aria-expanded", "true");
    expect(box).toHaveAttribute("aria-activedescendant", "q-option-1");
  });

  it("runs the chosen reading through the form's submit path with its identifier", async () => {
    const { user, box, onSubmit, onChoose } = setup();
    await user.type(box, "25 cfr part 900");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(box).toHaveValue("25 CFR 900");
    expect(onChoose).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "cfr", identifier: "25 CFR 900" }),
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("25 CFR 900");
    expect(box).toHaveAttribute("aria-expanded", "false");
  });

  it("submits the typed words on Enter when no option is active", async () => {
    const { user, box, onSubmit, onChoose } = setup();
    await user.type(box, "HB 2100{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("HB 2100");
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("chooses an option by pointer without moving focus", async () => {
    const { user, box, onSubmit } = setup();
    await user.type(box, "HB 2100");
    await user.click(screen.getAllByRole("option")[1] as HTMLElement);
    expect(onSubmit).toHaveBeenCalledWith("HB 2100");
    expect(box).toHaveFocus();
  });

  it("closes on Escape, then clears the box on a second Escape", async () => {
    const { user, box, onSubmit } = setup();
    await user.type(box, "HB 2100");
    await user.keyboard("{ArrowDown}{Escape}");
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(box).not.toHaveAttribute("aria-activedescendant");
    expect(box).toHaveValue("HB 2100");
    await user.keyboard("{Escape}");
    expect(box).toHaveValue("");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("inserts an official vocabulary label as search words without searching", async () => {
    const { user, box, onSubmit } = setup();
    await user.type(box, "water off");
    const option = screen.getByRole("option");
    expect(option).toHaveTextContent(
      `Sample Water Office (${copy.agencyNote})`,
    );
    await user.keyboard("{ArrowDown}{Enter}");
    expect(box).toHaveValue("Sample Water Office");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("has no automated axe violations with the list open", async () => {
    const { user, box } = setup();
    await user.type(box, "HB 2100");
    await user.keyboard("{ArrowDown}");
    const results = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations.map(({ id, help }) => ({ id, help }))).toEqual(
      [],
    );
  });
});
