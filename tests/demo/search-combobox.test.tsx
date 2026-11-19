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
import { search } from "../../src/demo/copy/search";
import type { LawAliasFile, VocabularyFile } from "../../src/demo/index-types";
import type { IssueFile } from "../../src/demo/issues";
import type { RouteReading } from "../../src/demo/query-route";
import type { PlainPhraseFile } from "../../src/demo/suggest";

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
        shortLabel: "SWO",
        parentId: null,
      },
    ],
  },
];

const phrases: PlainPhraseFile = {
  $schema: "../schemas/plain-phrases.schema.v1.json",
  schemaVersion: "1.0.0",
  artifactType: "plain-phrases",
  entries: [
    {
      phrase: "fish runs",
      termFamily: "federal_register_topic",
      term: "Sample Fisheries Topic",
      termSourceUrl: "https://www.federalregister.gov/topics/sample-fisheries",
      reviewedOn: "2099-01-01",
      reviewerRole: "owner",
      basis: "curated",
    },
  ],
};

const aliases: LawAliasFile = {
  $schema: "../schemas/law-aliases.schema.v1.json",
  schemaVersion: "1.0.0",
  artifactType: "law-aliases",
  basis: "curated",
  sourceUrl: "https://uscode.house.gov/popularnames/popularnames.html",
  entries: [
    {
      popularName: "Sample Riparian Stewardship Act",
      citations: [
        {
          kind: "usc",
          text: "16 U.S.C. 9901 et seq.",
          basis: "curated",
          pattern: { id: "usc-section", version: "1.0.0" },
          title: 16,
          section: "9901",
          etSeq: true,
        },
      ],
      acronyms: [
        {
          acronym: "SRSA",
          sourceUrl: "https://www.federalregister.gov/documents/sample",
          text: "Sample Riparian Stewardship Act (SRSA)",
        },
      ],
      olrcUrl:
        "https://uscode.house.gov/popularnames/popularnames.html#SampleRiparianStewardshipAct",
      reviewedOn: "2099-01-01",
      reviewerRole: "owner",
    },
  ],
};

function Harness({
  onSubmit,
  onChoose,
  issues,
}: {
  onSubmit: (value: string) => void;
  onChoose?: (reading: RouteReading) => void;
  issues?: IssueFile;
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
            aliases={aliases}
            vocabulary={vocabulary}
            phrases={phrases}
            issues={issues}
            onChoose={onChoose}
          />
        )}
      />
    </main>
  );
}

const setup = (issues?: IssueFile) => {
  const onSubmit = vi.fn();
  const onChoose = vi.fn();
  const user = userEvent.setup();
  render(<Harness onSubmit={onSubmit} onChoose={onChoose} issues={issues} />);
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

  it("finds a label in either word order and by its short label", async () => {
    const { user, box } = setup();
    const label = `Sample Water Office (${copy.agencyNote})`;
    await user.type(box, "office water");
    expect(screen.getByRole("option")).toHaveTextContent(label);
    await user.clear(box);
    await user.type(box, "SWO");
    expect(screen.getByRole("option")).toHaveTextContent(label);
  });

  it("offers a law once by the start of its name, or by its acronym in any case, and runs it when chosen", async () => {
    const { user, box, onSubmit, onChoose } = setup();
    const law = /^Sample Riparian Stewardship Act, 16 U\.S\.C\. 9901 et seq\./;
    for (const typed of ["riparian stew", "srsa", "SRS"]) {
      await user.clear(box);
      await user.type(box, typed);
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent(law);
    }
    // The exact acronym in capitals is the router's own reading: still one option.
    await user.clear(box);
    await user.type(box, "SRSA");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await user.clear(box);
    await user.type(box, "srsa");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChoose).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "law_name",
        identifier: "Sample Riparian Stewardship Act",
      }),
    );
    expect(onSubmit).toHaveBeenCalledWith("Sample Riparian Stewardship Act");
  });

  it("offers a typo's possible match, says so, and never chooses it", async () => {
    const { user, box, onSubmit, onChoose } = setup();
    await user.type(box, "water ofice");
    expect(screen.getByRole("status")).toHaveTextContent(
      search.suggest.possibleMatch,
    );
    expect(screen.getByRole("option")).toHaveTextContent(
      `Sample Water Office (${copy.agencyNote})`,
    );
    expect(box).not.toHaveAttribute("aria-activedescendant");
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("water ofice");
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("fills the box with a possible match without searching", async () => {
    const { user, box, onSubmit } = setup();
    await user.type(box, "water ofice");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(box).toHaveValue("Sample Water Office");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("offers a reviewed plain phrase's term on an exact match, never adding it", async () => {
    const { user, box, onSubmit } = setup();
    await user.type(box, "Fish  Runs");
    const option = screen.getByRole("option");
    expect(option).toHaveTextContent(
      `${search.suggest.alsoSearchFor("Sample Fisheries Topic")} (${copy.topicNote})`,
    );
    expect(box).toHaveValue("Fish  Runs");
    expect(screen.getByRole("status")).toHaveTextContent(copy.searchedAsWords);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(box).toHaveValue("Sample Fisheries Topic");
    expect(onSubmit).not.toHaveBeenCalled();
    await user.clear(box);
    await user.type(box, "fish run");
    expect(optionIds()).toEqual([]);
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

// Issue and measure word-prefix options (D-161 to D-167), a thin check that
// the combobox wires the router's issue readings (tests/demo/query-route-issues.test.ts
// covers the router behavior itself).
describe("search combobox, issue and measure options", () => {
  const issuesFixture: IssueFile = {
    $schema: "../schemas/issues.schema.v1.json",
    schemaVersion: "1.0.0",
    artifactType: "issues",
    entries: [
      {
        kind: "issue",
        id: "section-106",
        label: "Section 106 consultation",
        names: [
          {
            name: "Section 106 consultation",
            basis: "official",
            reviewedOn: "2026-11-18",
          },
        ],
        restsOn: [],
        searches: [
          {
            group: "policy",
            source: "federal-register",
            query: "x",
            auto: true,
          },
        ],
        reviewedOn: "2026-11-18",
        reviewerRole: "owner",
      },
    ],
  };

  it("shows a word-prefix option for an issue entry", async () => {
    const { user, box } = setup(issuesFixture);
    await user.type(box, "Section 106");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toContain(
      `Issue: Section 106 consultation (${copy.issueSearchNote(1)})`,
    );
  });

  it("calls onChoose with the issue reading when the option is chosen", async () => {
    const { user, box, onChoose } = setup(issuesFixture);
    await user.type(box, "Section 106");
    const option = screen
      .getAllByRole("option")
      .find((o) => o.textContent?.startsWith("Issue: Section 106"));
    expect(option).toBeDefined();
    await user.click(option as HTMLElement);
    expect(onChoose).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "issue",
        identifier: "Section 106 consultation",
      }),
    );
    expect(box).toHaveValue("Section 106 consultation");
  });

  it("lists a bill's issues beside the bill when its exact name is typed", async () => {
    const withBill: IssueFile = {
      ...issuesFixture,
      entries: [
        ...issuesFixture.entries,
        {
          kind: "measure",
          id: "sample-bill",
          label: "Sample Permitting Act",
          names: [
            { name: "SPA", basis: "people_use", reviewedOn: "2026-11-18" },
          ],
          identifiers: [
            {
              kind: "bill",
              id: "s 9999 119",
              label: "S. 9999 (119th Congress)",
              url: "https://www.govinfo.gov/x",
              stated: "Sample Permitting Act",
              readOn: "2026-11-18",
            },
          ],
          provisions: [
            {
              issue: "section-106",
              bill: "s 9999 119",
              version: "Introduced in Senate",
              section: "7",
              heading: "SEC. 7. SAMPLE.",
              url: "https://www.govinfo.gov/x",
              readOn: "2026-11-18",
              basis: "listed",
              reviewedOn: "2026-11-18",
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
          reviewedOn: "2026-11-18",
          reviewerRole: "owner",
        },
      ],
    };
    const { user, box } = setup(withBill);
    await user.type(box, "SPA");
    const texts = screen.getAllByRole("option").map((o) => o.textContent ?? "");
    expect(texts[0]).toMatch(/^Bill: Sample Permitting Act/);
    expect(texts.some((t) => t.includes("Section 106 consultation"))).toBe(
      true,
    );
  });
});
