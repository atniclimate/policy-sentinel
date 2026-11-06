// The Grants.gov authority citations panel (design section 3 T1.4): listings,
// the quoted passage or the no-passage sentence, parsed citations as links,
// the coverage statement, design rule 2 words absent, and axe clean.
import { render } from "@testing-library/preact";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { AuthorityCitations } from "../../demo/app/AuthorityCitations";
import type { GrantsDetailState } from "../../demo/app/AuthorityCitations";
import { grantsAuthority as T } from "../../src/demo/copy/grants-authority";
import type { DemoCitation } from "../../src/demo/types";

const base: DemoCitation = {
  sourceId: "grants",
  identifier: "SYN-OPP-2099-0001",
  title: "Synthetic opportunity",
  issuingBody: "Synthetic Agency for Examples",
  kind: "Funding opportunity",
  date: null,
  officialUrl: "https://www.grants.gov/search-results-detail/990001",
  textUrl: null,
  retrievedAt: "2099-02-03T00:00:00.000Z",
  summary: null,
  textAvailable: false,
  matchKey: null,
};

const found: DemoCitation = {
  ...base,
  assistanceListings: [
    { number: "99.001", title: "Synthetic Example Program" },
  ],
  authorityPassage: {
    text: "Awards are made through P. L. 117-58 and 25 U.S.C. 5304(l), and section 4 of the Act.",
    heading: "AUTHORITIES",
    locator: 'Grants.gov synopsis description, heading "AUTHORITIES"',
  },
  versionDate: "2099-02-02",
};

const ready = (
  citation: DemoCitation,
  authority: "found" | "none" | "withheld",
): GrantsDetailState => ({
  state: "ready",
  detail: { ok: true, source: "grants", citation, authority },
});

const FORBIDDEN =
  /\b(governs|applies|applicable|implements|authorizes|authorized by|under|eligible|eligibility|valid|binding|jurisdiction|good law|overrule|enacted by|supporting legislation|the law behind)\b/i;

describe("AuthorityCitations", () => {
  it("shows the listing, the quoted passage, its version date, link and parsed citations", async () => {
    const { container, getByRole } = render(
      <AuthorityCitations citation={base} detail={ready(found, "found")} />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("99.001 Synthetic Example Program");
    expect(container.querySelector("blockquote")?.textContent).toBe(
      found.authorityPassage?.text,
    );
    expect(text).toContain(T.passageFrom("AUTHORITIES"));
    expect(text).toContain(T.versionDate("2099-02-02"));
    expect(
      getByRole("link", { name: T.openOpportunity }).getAttribute("href"),
    ).toBe(base.officialUrl);
    const cites = Array.from(container.querySelectorAll("li a")).map((a) => [
      a.textContent,
      a.getAttribute("href"),
    ]);
    expect(cites).toEqual([
      ["P. L. 117-58", "https://www.govinfo.gov/link/plaw/117/public/58"],
      [
        "25 U.S.C. 5304(l)",
        "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title25-section5304&num=0&edition=prelim",
      ],
    ]);
    expect(text).toContain(T.coverage);
    expect(text).not.toMatch(FORBIDDEN);
    expect((await axe.run(container)).violations).toEqual([]);
  });

  it("says there is no passage when the record has no Authority heading", async () => {
    const { container } = render(
      <AuthorityCitations citation={base} detail={ready(base, "none")} />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain(`${T.noPassage}.`);
    expect(text).toContain(T.listingsNone);
    expect(text).toContain(T.versionDateNone);
    expect(container.querySelector("blockquote")).toBeNull();
    expect(text).not.toContain(T.citationsTitle);
    expect(text).not.toMatch(FORBIDDEN);
    expect((await axe.run(container)).violations).toEqual([]);
  });

  it("says a passage was withheld, never that there is none", () => {
    const { container } = render(
      <AuthorityCitations citation={base} detail={ready(base, "withheld")} />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain(T.withheld);
    expect(text).not.toContain(T.noPassage);
    expect(text).not.toMatch(FORBIDDEN);
  });

  it("never shows the no-passage sentence while loading or after a failed read", async () => {
    for (const detail of [{ state: "loading" }, { state: "error" }] as const) {
      const { container, unmount } = render(
        <AuthorityCitations citation={base} detail={detail} />,
      );
      const text = container.textContent ?? "";
      expect(text).not.toContain(T.noPassage);
      expect(text).toContain(detail.state === "loading" ? T.loading : T.failed);
      expect(text).toContain(T.coverage);
      expect((await axe.run(container)).violations).toEqual([]);
      unmount();
    }
  });

  it("keeps every panel string free of design rule 2 words", () => {
    const strings = Object.values(T).map((v) =>
      typeof v === "function" ? v("Authority") : v,
    );
    for (const s of strings) expect(s).not.toMatch(FORBIDDEN);
  });
});
