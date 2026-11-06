// The seams step 3 cut from demo/main.tsx for later lanes: a row reaches its
// family's renderer, document panels render in order, and an input in the
// search box slot keeps the box's id, description and submit path.
import { createRef } from "preact";
import { fireEvent, render } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { DocumentPane } from "../../demo/app/DocumentPane";
import { familyOf, ResultsList } from "../../demo/app/ResultsList";
import { SearchBox } from "../../demo/app/SearchBox";
import { COPY } from "../../src/demo/copy";
import { typedPlan } from "../../src/demo/discovery";
import type { DiscoveryRow } from "../../src/demo/discovery";
import type { DemoCitation } from "../../src/demo/types";
import { citation } from "./frontend-fixtures";

const row = (c: DemoCitation): DiscoveryRow => ({
  citation: c,
  alternates: [],
  reasons: [],
  groups: [],
});

describe("results families", () => {
  it.each([
    ["federal-register", "Proposed Rule", "rules_and_notices"],
    ["regulations", "Proposed Rule", "rules_and_notices"],
    ["govinfo", "FR", "rules_and_notices"],
    ["govinfo", "BILLS", "laws_and_bills"],
    ["govinfo", "PLAW", "laws_and_bills"],
    ["govinfo", "USCOURTS", "cases"],
    ["govinfo", "USREPORTS", "cases"],
    ["congress", "Bill", "laws_and_bills"],
    ["grants", "Posted", "grants"],
    ["washington", "Bill", "state"],
    ["oregon", "Bill", "state"],
    ["idaho", "Bill", "state"],
  ])("files a %s %s row under %s", (sourceId, kind, family) => {
    expect(familyOf({ ...citation(), sourceId, kind })).toBe(family);
  });

  it("sends a row to its family's renderer and every other row to the default one", () => {
    const opinion = row({
      ...citation("2099-00002", "Example Opinion"),
      sourceId: "govinfo",
      kind: "USCOURTS",
    });
    const sources = {
      federal: ["federal-register"],
      live: ["federal-register"],
    };
    const { container } = render(
      <ResultsList
        found={{
          plan: typedPlan("water", "federal", sources),
          searches: [],
          rows: [row(citation()), opinion],
        }}
        sequence={1}
        outcome={() => null}
        row={(each, nested) => (
          <li
            key={each.citation.title}
          >{`row ${nested} ${each.citation.title}`}</li>
        )}
        families={{
          cases: (each) => (
            <li key={each.citation.title}>{`case ${each.citation.title}`}</li>
          ),
        }}
      />,
    );
    expect(
      [...container.querySelectorAll("ul.results > li")].map(
        (item) => item.textContent,
      ),
    ).toEqual(["row false Example Water Policy", "case Example Opinion"]);
  });
});

describe("document pane side panels", () => {
  it("renders the panels in list order after the document, only while one is open", () => {
    const props = {
      cited: {},
      marks: {},
      paneTab: 0,
      paneRef: createRef<HTMLElement>(),
      onIncludeAll: vi.fn(),
      onMark: vi.fn(),
      panels: [
        {
          id: "first",
          render: (opened: { citation: DemoCitation }) => (
            <p class="side">{`first ${opened.citation.title}`}</p>
          ),
        },
        { id: "second", render: () => <p class="side">second</p> },
      ],
    };
    const { container, rerender } = render(
      <DocumentPane selected={null} {...props} />,
    );
    expect(container.querySelector(".side")).toBeNull();
    rerender(
      <DocumentPane
        selected={{ citation: citation(), state: "unread", message: "Unread" }}
        {...props}
      />,
    );
    const detail = container.querySelector(".detail")!;
    expect(
      [...detail.querySelectorAll(".side")].map((item) => item.textContent),
    ).toEqual(["first Example Water Policy", "second"]);
    expect(detail.firstElementChild).toHaveClass("policy-title");
    expect(detail.lastElementChild).toHaveTextContent("second");
  });
});

describe("search box input slot", () => {
  it("gives the slotted input the box's id and description, and Search submits through onSubmit", () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    const { getByRole, getByLabelText } = render(
      <SearchBox
        value="water"
        onInput={vi.fn()}
        onSubmit={onSubmit}
        help="Help words."
        error="Too short."
        blockedNote={false}
        off={false}
        input={(field) => (
          <input
            id={field.id}
            role="combobox"
            aria-expanded="false"
            value={field.value}
            aria-describedby={field.describedBy}
            aria-invalid={field.invalid ? "true" : undefined}
          />
        )}
      />,
    );
    const box = getByRole("combobox");
    expect(getByLabelText(COPY.queryLabel)).toBe(box);
    expect(box).toHaveValue("water");
    expect(box).toHaveAccessibleDescription("Help words. Too short.");
    expect(box).toHaveAttribute("aria-invalid", "true");
    fireEvent.click(getByRole("button", { name: COPY.searchButton }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
