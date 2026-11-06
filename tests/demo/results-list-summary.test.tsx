// Decision 8: the source's own summary under a result, in a native collapsed
// details element, verbatim, attributed, and withheld when the guard trips.
import { cleanup, render } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { SourceSummary } from "../../demo/app/ResultsList";
import { COPY } from "../../src/demo/copy";
import { SUMMARY_LIMIT } from "../../src/demo/summaries";
import type { DemoCitation } from "../../src/demo/types";
import { citation } from "./frontend-fixtures";

const SUMMARY = "The Example Agency proposes to revise its sample water rule.";

const withSummary = (over: Partial<DemoCitation>): DemoCitation => ({
  ...citation(),
  summary: SUMMARY,
  ...over,
});

afterEach(cleanup);

describe("SourceSummary", () => {
  it("shows the summary verbatim in a collapsed, named disclosure", () => {
    const view = render(
      <SourceSummary citation={withSummary({})} source="Federal Register" />,
    );
    const details = view.container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);
    // The native summary is the first child, so it takes focus and toggles by keyboard.
    const label = details?.firstElementChild;
    expect(label?.tagName).toBe("SUMMARY");
    expect(label?.textContent).toBe(COPY.summaryFromSource);
    expect(label?.getAttribute("aria-label")).toBe(
      COPY.named(COPY.summaryFromSource, "Example Water Policy"),
    );
    expect(view.container.querySelector("p.summary")?.textContent).toBe(
      SUMMARY,
    );
    expect(view.container.textContent).toContain(
      COPY.summaryAsStated("Federal Register"),
    );
    expect(view.container.textContent).not.toContain(
      COPY.summaryMayBeCut(SUMMARY_LIMIT),
    );
  });

  it("says a summary at the Worker's limit may be cut", () => {
    const view = render(
      <SourceSummary
        citation={withSummary({ summary: "a".repeat(SUMMARY_LIMIT) })}
        source="Federal Register"
      />,
    );
    expect(view.container.textContent).toContain(
      COPY.summaryMayBeCut(SUMMARY_LIMIT),
    );
  });

  it("withholds and states a summary the personal-pattern guard flags", () => {
    const view = render(
      <SourceSummary
        citation={withSummary({
          summary: `${SUMMARY} Write to sample@example.gov.`,
        })}
        source="Federal Register"
      />,
    );
    const text = view.container.textContent ?? "";
    expect(text).toContain(COPY.summaryWithheld("Federal Register"));
    expect(text).not.toContain("sample@example.gov");
    expect(view.container.querySelector("p.summary")).toBeNull();
  });

  it("renders nothing with no summary or for a source that is off", () => {
    for (const c of [
      withSummary({ summary: null }),
      withSummary({ sourceId: "congress" }),
      withSummary({ sourceId: "regulations" }),
    ]) {
      const view = render(<SourceSummary citation={c} source="Example" />);
      expect(view.container.innerHTML).toBe("");
      cleanup();
    }
  });
});
