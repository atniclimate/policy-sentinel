// D-186, D-188: the owner ruling of 2026-11-19 approving part (a) of the
// narrowing design. An agency or topic suggestion offers a second option,
// "Narrow to this agency/topic", which clears the box and does not submit.
import { cleanup, render, screen } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { useState } from "preact/hooks";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBox } from "../../demo/app/SearchBox";
import { SearchCombobox } from "../../demo/app/SearchCombobox";
import { router as copy } from "../../src/demo/copy/router";
import type { LawAliasFile, VocabularyFile } from "../../src/demo/index-types";
import type { IssueFile } from "../../src/demo/issues";
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
  {
    $schema: "../../schemas/demo-index.schema.v1.json",
    schemaVersion: "1.0.0",
    artifactType: "vocabulary",
    kind: "fr_topic",
    entries: [
      {
        id: "sample-fisheries-topic",
        label: "Sample Fisheries Topic",
        shortLabel: null,
        parentId: null,
      },
    ],
  },
  {
    $schema: "../../schemas/demo-index.schema.v1.json",
    schemaVersion: "1.0.0",
    artifactType: "vocabulary",
    kind: "cfr_title",
    entries: [
      {
        id: "50",
        label: "50 CFR, Wildlife Refuges",
        shortLabel: null,
        parentId: null,
      },
    ],
  },
];

type NarrowChoice = { field: "agency" | "topic"; id: string; label: string };

// Suppresses the bundled real law aliases, issues and plain phrases, so only
// the synthetic vocabulary above offers options for the typed queries below.
const aliases: LawAliasFile = {
  $schema: "../schemas/law-aliases.schema.v1.json",
  schemaVersion: "1.0.0",
  artifactType: "law-aliases",
  basis: "curated",
  sourceUrl: "https://uscode.house.gov/popularnames/popularnames.html",
  entries: [],
};
const issues: IssueFile = {
  $schema: "../schemas/issues.schema.v1.json",
  schemaVersion: "1.0.0",
  artifactType: "issues",
  entries: [],
};
const phrases: PlainPhraseFile = {
  $schema: "../schemas/plain-phrases.schema.v1.json",
  schemaVersion: "1.0.0",
  artifactType: "plain-phrases",
  entries: [],
};

function Harness({ onNarrow }: { onNarrow: (narrow: NarrowChoice) => void }) {
  const [value, setValue] = useState("");
  return (
    <main>
      <SearchBox
        value={value}
        onInput={setValue}
        onSubmit={(event) => event.preventDefault()}
        help="Words, a title, or a citation."
        error=""
        blockedNote={false}
        off={false}
        input={(field) => (
          <SearchCombobox
            {...field}
            aliases={aliases}
            issues={issues}
            phrases={phrases}
            vocabulary={vocabulary}
            onNarrow={onNarrow}
          />
        )}
      />
    </main>
  );
}

const setup = () => {
  const onNarrow = vi.fn();
  const user = userEvent.setup();
  render(<Harness onNarrow={onNarrow} />);
  const box = screen.getByRole("combobox");
  return { user, box, onNarrow };
};

let fetchSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => {
  cleanup();
  expect(fetchSpy).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("narrow-to-agency/topic options in the search combobox (D-186, D-188)", () => {
  it("offers the narrow-to-agency option right after the agency label, and chooses it by keyboard", async () => {
    const { user, box, onNarrow } = setup();
    await user.type(box, "water off");
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      `Sample Water Office (${copy.agencyNote})`,
      `${copy.narrowToAgency("Sample Water Office")} (${copy.narrowFieldNote})`,
    ]);
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onNarrow).toHaveBeenCalledTimes(1);
    expect(onNarrow).toHaveBeenCalledWith({
      field: "agency",
      id: "sample-water-office",
      label: "Sample Water Office",
    });
    expect(box).toHaveValue("");
    expect(box).toHaveAttribute("aria-expanded", "false");
  });

  it("offers the narrow-to-topic option right after the topic label, and chooses it by keyboard", async () => {
    const { user, box, onNarrow } = setup();
    await user.type(box, "fish");
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      `Sample Fisheries Topic (${copy.topicNote})`,
      `${copy.narrowToTopic("Sample Fisheries Topic")} (${copy.narrowFieldNote})`,
    ]);
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onNarrow).toHaveBeenCalledWith({
      field: "topic",
      id: "sample-fisheries-topic",
      label: "Sample Fisheries Topic",
    });
    expect(box).toHaveValue("");
  });

  it("gets no narrow option for a cfr_title label", async () => {
    const { user, box, onNarrow } = setup();
    await user.type(box, "wildlife");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent(
      `50 CFR, Wildlife Refuges (${copy.cfrTitleNote})`,
    );
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onNarrow).not.toHaveBeenCalled();
    // The plain label option keeps today's behavior exactly: it fills the box.
    expect(box).toHaveValue("50 CFR, Wildlife Refuges");
  });

  it("the existing label option still only fills the box, with no new text", async () => {
    const { user, box, onNarrow } = setup();
    await user.type(box, "water off");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(box).toHaveValue("Sample Water Office");
    expect(onNarrow).not.toHaveBeenCalled();
  });

  it("follows a possible-match (typo) agency label too", async () => {
    const { user, box, onNarrow } = setup();
    await user.type(box, "water ofice");
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      `Sample Water Office (${copy.agencyNote})`,
      `${copy.narrowToAgency("Sample Water Office")} (${copy.narrowFieldNote})`,
    ]);
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onNarrow).toHaveBeenCalledWith({
      field: "agency",
      id: "sample-water-office",
      label: "Sample Water Office",
    });
  });

  it("has no automated axe violations with the list open", async () => {
    const { user, box } = setup();
    await user.type(box, "water off");
    await user.keyboard("{ArrowDown}");
    const results = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations.map(({ id, help }) => ({ id, help }))).toEqual(
      [],
    );
  });
});
