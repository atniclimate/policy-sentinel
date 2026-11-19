// The query router's executive-order reading (D-177, 2026-11-18): "Executive
// Order", "Exec. Order", "E.O.", "E. O.", "EO" and "XO" forms, read on the
// masked text, scanned with the other identifiers, before acronyms and issue
// names.
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { routeQuery } from "../../src/demo/query-route";
import type { RouteReading } from "../../src/demo/query-route";

const only = (input: string): RouteReading => {
  const route = routeQuery(input);
  expect(route.readings, input).toHaveLength(1);
  expect(route.ambiguous, input).toBe(false);
  return route.readings[0] as RouteReading;
};

describe("query router, executive orders", () => {
  it.each([
    "Executive Order 13175",
    "Exec. Order 13175",
    "Exec Order 13175",
    "E.O. 13175",
    "E. O. 13175",
    "EO 13175",
    "XO 13175",
    "eo13175",
    "E.O.13175",
    "EO No. 13175",
    "EO Number 13175",
    "executive order 13175",
  ])("reads %j as E.O. 13175, live on the Federal Register", (input) => {
    const r = only(input);
    expect(r).toMatchObject({
      kind: "executive_order",
      identifier: "E.O. 13175",
      jurisdiction: "federal",
      action: "live_lookup",
      label: "Executive Order 13175",
    });
  });

  it("is not_covered below the Federal Register's first order, EO 12890", () => {
    expect(only("EO 12866")).toMatchObject({
      kind: "executive_order",
      identifier: "E.O. 12866",
      action: "not_covered",
    });
  });

  it.each(["EO 123", "EO", "geo 13175", "video 13175", "13175"])(
    "gives no executive-order reading for %j",
    (input) => {
      const route = routeQuery(input);
      expect(
        route.readings.map((r) => r.kind),
        input,
      ).not.toContain("executive_order");
    },
  );

  it("gives no executive-order reading for a form inside a masked span", () => {
    // "of Executive Order" extends the Nation-name mask forward from "Tribe"
    // through "Executive Order"; the trailing digits break the chain there,
    // so they stay outside the span but the phrase itself stays masked.
    const route = routeQuery("Example Tribe of Executive Order 13175");
    expect(route.maskedSpans.length).toBeGreaterThan(0);
    expect(route.readings).toEqual([]);
  });

  it("gives both readings when an executive order and a CFR part both appear", () => {
    const route = routeQuery("EO 13175 and 25 CFR 900");
    expect(route.readings.map((r) => r.kind).sort()).toEqual([
      "cfr",
      "executive_order",
    ]);
    expect(route.ambiguous).toBe(true);
  });

  it("leaves every other reading kind unchanged", () => {
    expect(only("25 CFR 900")).toMatchObject({ kind: "cfr" });
    expect(only("EPA-HQ-OW-2021-0602")).toMatchObject({ kind: "docket" });
  });
});
