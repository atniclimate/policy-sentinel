import { describe, expect, it } from "vitest";

import {
  criteriaFromParams,
  DEFAULT_RESULT_WINDOW,
  emptyCriteria,
  parseRoute,
  recordFocusId,
  recordHash,
  resultWindowFromParams,
  routeHash,
  routeStateHash,
  selectedIdsFromParams,
} from "../../src/app/routing";

describe("URL-backed application state", () => {
  it.each(["__proto__", "constructor", "toString"])(
    "round-trips the prototype-named category %s without inherited values",
    (category) => {
      const route = parseRoute(
        `#/search?sub=${category}:quality,water:supply,${category}:quantity`,
      );
      const criteria = criteriaFromParams(route.params);
      expect(Object.getPrototypeOf(criteria.subcategoryIds)).toBeNull();
      expect(criteria.subcategoryIds[category]).toEqual([
        "quality",
        "quantity",
      ]);
      expect(criteria.subcategoryIds.water).toEqual(["supply"]);
      expect(
        criteriaFromParams(parseRoute(routeHash("/search", criteria)).params),
      ).toEqual(criteria);
      expect(Object.prototype).not.toHaveProperty("quality");
    },
  );

  it("round-trips criteria, selection, result window, route, and focus origin", () => {
    const criteria = {
      ...emptyCriteria(),
      nationId: "nation:synthetic-a",
      categoryIds: ["water"],
      subcategoryIds: { water: ["quality"] },
      query: "official notice",
      jurisdictions: ["United States"],
      documentTypes: ["notice"],
      statuses: ["active"],
      sources: ["federal-register"],
      relevanceBases: ["general_jurisdiction" as const],
      dateFrom: "2026-01-01",
      dateThrough: "2026-07-31",
      sort: "event-asc" as const,
    };
    const hash = recordHash(
      "psr:federal-register:2026-001",
      criteria,
      "/search",
      {
        selectedIds: [
          "psr:federal-register:2026-002",
          "psr:federal-register:2026-001",
          "psr:federal-register:2026-002",
        ],
        resultWindow: 75,
      },
    );
    const route = parseRoute(hash);

    expect(route.path).toBe("/record/psr%3Afederal-register%3A2026-001");
    expect(route.recordId).toBe("psr:federal-register:2026-001");
    expect(criteriaFromParams(route.params)).toEqual(criteria);
    expect(selectedIdsFromParams(route.params)).toEqual([
      "psr:federal-register:2026-001",
      "psr:federal-register:2026-002",
    ]);
    expect(resultWindowFromParams(route.params)).toBe(75);
    expect(route.params.get("focus")).toBe("psr:federal-register:2026-001");
    expect(route.params.get("return")).toBe("/search");

    const updated = parseRoute(
      routeStateHash(route, {
        selectedIds: ["psr:federal-register:2026-002"],
        resultWindow: DEFAULT_RESULT_WINDOW,
        focusRecordId: null,
      }),
    );
    expect(criteriaFromParams(updated.params)).toEqual(criteria);
    expect(selectedIdsFromParams(updated.params)).toEqual([
      "psr:federal-register:2026-002",
    ]);
    expect(resultWindowFromParams(updated.params)).toBe(DEFAULT_RESULT_WINDOW);
    expect(updated.params.has("shown")).toBe(false);
    expect(updated.params.has("focus")).toBe(false);
    expect(updated.params.get("return")).toBe("/search");
  });

  it("deduplicates and rejects malformed selection state deterministically", () => {
    const params = new URLSearchParams();
    params.append(
      "selected",
      "psr:source:two,not-a-record,psr:source:one,psr:source:two",
    );
    params.append("selected", "psr:source:three,%0Apsr:source:four");

    expect(selectedIdsFromParams(params)).toEqual([
      "psr:source:one",
      "psr:source:three",
      "psr:source:two",
    ]);
    const normalized = parseRoute(
      routeHash("/search", undefined, {
        selectedIds: selectedIdsFromParams(params),
      }),
    );
    expect(normalized.params.getAll("selected")).toEqual([
      "psr:source:one,psr:source:three,psr:source:two",
    ]);
  });

  it("fails closed for missing, duplicate, fractional, and capped result windows", () => {
    expect(resultWindowFromParams(new URLSearchParams())).toBe(
      DEFAULT_RESULT_WINDOW,
    );
    expect(resultWindowFromParams(new URLSearchParams("shown=50"))).toBe(
      DEFAULT_RESULT_WINDOW,
    );
    expect(resultWindowFromParams(new URLSearchParams("shown=50.5"))).toBe(
      DEFAULT_RESULT_WINDOW,
    );
    expect(
      resultWindowFromParams(new URLSearchParams("shown=75&shown=100")),
    ).toBe(DEFAULT_RESULT_WINDOW);
    expect(resultWindowFromParams(new URLSearchParams("shown=999999"))).toBe(
      20_000,
    );
  });

  it("creates stable, collision-free focus targets from record IDs", () => {
    expect(recordFocusId("psr:source:record/with spaces")).toBe(
      "record-link-psr%3Asource%3Arecord%2Fwith%20spaces",
    );
    expect(recordFocusId("psr:source:record-one")).not.toBe(
      recordFocusId("psr:source:record:one"),
    );
  });
});
