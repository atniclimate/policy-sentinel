// The Cases family row (T1.5): case name, court, docket number with court
// code, date issued, official link, the citation sentence, and a Follow
// control wired through props. It plugs into ResultsList's families seam.
import { cleanup, fireEvent, render } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CaseRow } from "../../demo/app/CaseRow";
import { ResultsList } from "../../demo/app/ResultsList";
import { courts as COURTS } from "../../src/demo/copy/courts";
import { COURT_LABELS, withheldTitle } from "../../src/demo/courts";
import { typedPlan } from "../../src/demo/discovery";
import type { DiscoveryRow } from "../../src/demo/discovery";
import type { DemoCitation } from "../../src/demo/types";

const caseCitation = (over: Partial<DemoCitation> = {}): DemoCitation => ({
  sourceId: "govinfo",
  identifier: "USCOURTS-ca9-99-12345",
  title: "EXAMPLE COUNTY V. UNITED STATES",
  issuingBody: COURT_LABELS.ca9,
  kind: "USCOURTS",
  date: "2099-03-04",
  officialUrl: "https://www.govinfo.gov/app/details/USCOURTS-ca9-99-12345",
  textUrl: null,
  retrievedAt: "2099-03-05T00:00:00.000Z",
  summary: null,
  textAvailable: false,
  matchKey: null,
  court: "ca9",
  docketNumber: "99-12345",
  packageId: "USCOURTS-ca9-99-12345",
  lastModified: "2099-03-05T01:02:03Z",
  caseCitationProvided: false,
  ...over,
});

const row = (c: DemoCitation): DiscoveryRow => ({
  citation: c,
  alternates: [],
  reasons: [],
  groups: [],
});

afterEach(cleanup);

describe("CaseRow", () => {
  it("shows the case fields, the citation sentence and the official link", () => {
    const view = render(
      <ul>
        <CaseRow row={row(caseCitation())} nested={false} following={false} />
      </ul>,
    );
    expect(view.getByRole("heading", { level: 3 }).textContent).toBe(
      "EXAMPLE COUNTY V. UNITED STATES",
    );
    const text = view.container.textContent ?? "";
    expect(text).toContain(COURT_LABELS.ca9);
    expect(text).toContain("99-12345 (ca9)");
    expect(text).toContain("2099-03-04");
    expect(text).toContain(COURTS.citationNotProvided);
    const link = view.getByRole("link", { name: /Open at GovInfo/ });
    expect(link.getAttribute("href")).toBe(
      "https://www.govinfo.gov/app/details/USCOURTS-ca9-99-12345",
    );
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    // No Follow control unless the page wires one.
    expect(view.queryByRole("button")).toBeNull();
  });

  it("follows by package id through props, and marks a followed case", () => {
    const onFollow = vi.fn();
    const c = caseCitation();
    const view = render(
      <ul>
        <CaseRow row={row(c)} nested following={false} onFollow={onFollow} />
      </ul>,
    );
    expect(view.getByRole("heading", { level: 4 })).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: /Follow case/ }));
    expect(onFollow).toHaveBeenCalledWith(c, "USCOURTS-ca9-99-12345");

    view.rerender(
      <ul>
        <CaseRow row={row(c)} nested following onFollow={onFollow} />
      </ul>,
    );
    const on = view.getByRole("button", { name: /Following case/ });
    expect(on.getAttribute("aria-disabled")).toBe("true");
  });

  it("offers no Follow for a row without a court code", () => {
    const view = render(
      <ul>
        <CaseRow
          row={row(
            caseCitation({
              identifier: "USREPORTS-199-42",
              kind: "USREPORTS",
              court: undefined,
              docketNumber: undefined,
              caseCitationProvided: true,
            }),
          )}
          nested={false}
          following={false}
          onFollow={vi.fn()}
        />
      </ul>,
    );
    expect(view.queryByRole("button")).toBeNull();
    expect(view.container.textContent).toContain(
      COURTS.citationStated("199 U.S. 42"),
    );
  });

  it("explains a withheld caption", () => {
    const view = render(
      <ul>
        <CaseRow
          row={row(caseCitation({ title: withheldTitle("ca9 99-12345") }))}
          nested={false}
          following={false}
        />
      </ul>,
    );
    expect(view.container.textContent).toContain(COURTS.captionWithheld);
  });

  it("renders through the ResultsList cases family", () => {
    const c = caseCitation();
    const fallback = vi.fn(() => null);
    const view = render(
      <ResultsList
        found={{
          plan: typedPlan("example", "federal", {
            federal: ["govinfo"],
            live: ["govinfo"],
          }),
          searches: [],
          rows: [row(c)],
        }}
        sequence={1}
        outcome={() => null}
        row={fallback}
        families={{
          cases: (r, nested) => (
            <CaseRow row={r} nested={nested} following={false} />
          ),
        }}
      />,
    );
    expect(fallback).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("99-12345 (ca9)");
  });
});
