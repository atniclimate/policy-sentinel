// @vitest-environment node
// An example issue runs whole when its sources are live: every search is one
// its source can take as written, and none waits behind the request budget.
import { describe, expect, it } from "vitest";
import {
  AUTO_REQUEST_BUDGET,
  buildPlan,
  isSuggested,
  lookupReady,
} from "../../src/demo/discovery";
import { ISSUE_EXAMPLES } from "../../src/demo/issue-examples";
import { foundByOf } from "../../src/demo/report-state";

const LIVE = ["federal-register", "govinfo", "congress"];
const NO_FILTER = { dateFrom: null, dateTo: null, documentType: null };

describe("example issues", () => {
  it.each(ISSUE_EXAMPLES)("$label sends every search", (example) => {
    const seed = { kind: "example", label: example.label } as const;
    // Nothing checked: each search names its own source.
    const plan = buildPlan(
      seed,
      example.searches,
      { federal: [], live: LIVE },
      NO_FILTER,
    );
    expect(isSuggested(seed)).toBe(true);
    expect(plan.lanes).toHaveLength(example.searches.length);
    expect(plan.lanes.length).toBeLessThanOrEqual(AUTO_REQUEST_BUDGET);
    for (const lane of plan.lanes) {
      expect(lane.auto, lane.id).toBe(true);
      expect(lane.skip, lane.id).toBeUndefined();
      expect(lookupReady(plan, lane), lane.id).toBe(true);
      // Safeguard 1: an example holds no name search.
      expect(lane.name, lane.id).toBeUndefined();
    }
  });

  it("is named in a cited document's provenance", () => {
    const [found] = foundByOf(
      [
        {
          laneId: "congress:s 5653 119",
          group: "legislation",
          sourceId: "congress",
          query: "s 5653 119",
          label: "s 5653 119",
          terms: "s 5653 119",
        },
      ],
      { kind: "example", label: "Section 106 and S. 5653" },
    );
    expect(found.seed).toEqual({
      kind: "example",
      label: "Section 106 and S. 5653",
    });
  });
});
