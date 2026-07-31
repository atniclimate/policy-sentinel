import {
  FEDERAL_REGISTER_DISCOVERY_FIELDS,
  FEDERAL_REGISTER_ORIGIN,
  FEDERAL_REGISTER_PATHS,
  FEDERAL_REGISTER_QUERY_POLICY,
} from "../../../src/adapters/federal-register/constants";
import { describe, expect, it } from "vitest";

import {
  assertFederalRegisterDateRange,
  buildFederalRegisterSearchUrl,
  shouldSplitFederalRegisterDateRange,
  splitFederalRegisterDateRange,
  validateFederalRegisterNextPageUrl,
} from "../../../src/adapters/federal-register/query-contract";

const range = { start: "2026-07-30", end: "2026-07-31" };

function nextUrl(cursor = "opaque+/=cursor"): URL {
  const first = buildFederalRegisterSearchUrl(range);
  const reversed = [...first.searchParams.entries()].reverse();
  const next = new URL(first.origin + first.pathname);
  for (const [key, value] of reversed) {
    next.searchParams.append(key, value);
  }
  next.searchParams.append("search_after_cursor", cursor);
  return next;
}

describe("Federal Register query contract", () => {
  it("builds the exact fixed discovery query without page or a cursor", () => {
    const url = buildFederalRegisterSearchUrl(range);

    expect(url.origin).toBe(FEDERAL_REGISTER_ORIGIN);
    expect(url.pathname).toBe(FEDERAL_REGISTER_PATHS.search);
    expect(url.searchParams.getAll("fields[]")).toEqual(
      FEDERAL_REGISTER_DISCOVERY_FIELDS,
    );
    expect(url.searchParams.get("conditions[publication_date][gte]")).toBe(
      range.start,
    );
    expect(url.searchParams.get("conditions[publication_date][lte]")).toBe(
      range.end,
    );
    expect(url.searchParams.get("per_page")).toBe(
      String(FEDERAL_REGISTER_QUERY_POLICY.pageSize),
    );
    expect(url.searchParams.get("order")).toBe("oldest");
    expect(url.searchParams.has("page")).toBe(false);
    expect(url.searchParams.has("search_after_cursor")).toBe(false);
  });

  it("rejects invalid, pre-coverage, reversed, and changed-shape ranges", () => {
    expect(() =>
      assertFederalRegisterDateRange({
        start: "2026-02-29",
        end: "2026-03-01",
      }),
    ).toThrowError(/real ISO calendar date/);
    expect(() =>
      assertFederalRegisterDateRange({
        start: "1993-12-31",
        end: "1994-01-03",
      }),
    ).toThrowError(/precedes reviewed API coverage/);
    expect(() =>
      assertFederalRegisterDateRange({
        start: "2026-08-01",
        end: "2026-07-31",
      }),
    ).toThrowError(/reversed/);
    expect(() =>
      assertFederalRegisterDateRange({
        start: "2026-07-30",
        end: "2026-07-31",
        extra: "not permitted",
      } as never),
    ).toThrowError(/only start and end/);
  });

  it("splits inclusive ranges at a calendar midpoint with no overlap", () => {
    expect(
      splitFederalRegisterDateRange({
        start: "2026-07-01",
        end: "2026-07-04",
      }),
    ).toEqual([
      { start: "2026-07-01", end: "2026-07-02" },
      { start: "2026-07-03", end: "2026-07-04" },
    ]);
    expect(() =>
      splitFederalRegisterDateRange({
        start: "2026-07-31",
        end: "2026-07-31",
      }),
    ).toThrowError(/single-day/);
  });

  it("uses 2,000 only as the conservative client split threshold", () => {
    expect(shouldSplitFederalRegisterDateRange(1_999)).toBe(false);
    expect(shouldSplitFederalRegisterDateRange(2_000)).toBe(true);
    expect(shouldSplitFederalRegisterDateRange(10_000)).toBe(true);
    expect(() => shouldSplitFederalRegisterDateRange(10_001)).toThrowError(
      /observed search window/,
    );
  });

  it("accepts an order-independent immutable query plus one opaque cursor", () => {
    const candidate = nextUrl();
    const validated = validateFederalRegisterNextPageUrl(candidate.href, {
      range,
    });

    expect(validated.url.href).toBe(candidate.href);
    expect(validated.cursor).toBe("opaque+/=cursor");
    expect(validated.canonicalUrl).toContain("search_after_cursor=");
  });

  it.each([
    {
      label: "page",
      mutate(url: URL) {
        url.searchParams.set("page", "2");
      },
    },
    {
      label: "unknown key",
      mutate(url: URL) {
        url.searchParams.set("conditions[topic]", "Synthetic");
      },
    },
    {
      label: "changed date",
      mutate(url: URL) {
        url.searchParams.set("conditions[publication_date][gte]", "2026-07-29");
      },
    },
    {
      label: "duplicate singular value",
      mutate(url: URL) {
        url.searchParams.append("per_page", "1000");
      },
    },
    {
      label: "duplicate selected field",
      mutate(url: URL) {
        url.searchParams.append("fields[]", "title");
      },
    },
    {
      label: "duplicate cursor",
      mutate(url: URL) {
        url.searchParams.append("search_after_cursor", "second");
      },
    },
  ])("rejects a $label in the provider next URL", ({ mutate }) => {
    const candidate = nextUrl();
    mutate(candidate);
    expect(() =>
      validateFederalRegisterNextPageUrl(candidate.href, { range }),
    ).toThrowError();
  });

  it("rejects unsafe origins, credentials, paths, fragments, and cursors", () => {
    const wrongOrigin = nextUrl();
    wrongOrigin.hostname = "example.invalid";
    expect(() =>
      validateFederalRegisterNextPageUrl(wrongOrigin.href, { range }),
    ).toThrowError(/exact Federal Register search boundary/);

    const wrongPath = nextUrl();
    wrongPath.pathname = "/api/v1/documents";
    expect(() =>
      validateFederalRegisterNextPageUrl(wrongPath.href, { range }),
    ).toThrowError(/exact Federal Register search boundary/);

    const fragment = nextUrl();
    fragment.hash = "fragment";
    expect(() =>
      validateFederalRegisterNextPageUrl(fragment.href, { range }),
    ).toThrowError(/exact Federal Register search boundary/);

    const emptyCursor = nextUrl();
    emptyCursor.searchParams.set("search_after_cursor", " ");
    expect(() =>
      validateFederalRegisterNextPageUrl(emptyCursor.href, { range }),
    ).toThrowError(/cursor is empty/);
  });

  it("rejects repeated cursor and canonical URL cycles", () => {
    const candidate = nextUrl();
    const first = validateFederalRegisterNextPageUrl(candidate.href, { range });

    expect(() =>
      validateFederalRegisterNextPageUrl(candidate.href, {
        range,
        seenCursors: new Set([first.cursor]),
      }),
    ).toThrowError(/repeats/);
    expect(() =>
      validateFederalRegisterNextPageUrl(candidate.href, {
        range,
        seenUrls: new Set([first.canonicalUrl]),
      }),
    ).toThrowError(/repeats/);
  });
});
