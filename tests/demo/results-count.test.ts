import { describe, expect, it } from "vitest";
import { results } from "../../src/demo/copy/results";
import { totalIsFloor } from "../../src/demo/discovery";
import type { LaneSearch } from "../../src/demo/discovery";
import type { DemoSearchResponse } from "../../src/demo/types";

const search = (sourceId: string, total: number | null): LaneSearch => ({
  laneId: "lane",
  sourceId,
  state: "results",
  listings: [],
  response: { total } as DemoSearchResponse,
  cursors: [],
});

describe("a source total that is a floor (safeguard 8)", () => {
  // Regression: the Federal Register stops counting at 10,000 and the page printed it as exact.
  it("reads a Federal Register total of 10,000 as 10,000 or more", () => {
    const item = search("federal-register", 10_000);
    expect(totalIsFloor(item)).toBe(true);
    expect(results.resultsCount(10, 10_000, totalIsFloor(item))).toBe(
      "10 listings loaded; 10,000 or more reported by source",
    );
  });

  it("keeps every other total exact", () => {
    expect(totalIsFloor(search("federal-register", 9_999))).toBe(false);
    expect(totalIsFloor(search("govinfo", 10_000))).toBe(false);
    expect(totalIsFloor(search("federal-register", null))).toBe(false);
    expect(
      totalIsFloor({ ...search("federal-register", 1), response: undefined }),
    ).toBe(false);
    expect(results.resultsCount(1, 9_999)).toBe(
      "1 listing loaded; 9,999 reported by source",
    );
    expect(results.resultsCount(1, null)).toBe("1 listing loaded");
  });
});
