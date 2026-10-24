import { describe, expect, it } from "vitest";
import {
  atniReferences,
  ieeeDate,
  ieeeReference,
  SOURCE_LABELS,
} from "../../src/demo/citations";
import { citation } from "./frontend-fixtures";

describe("source labels", () => {
  it("names every source the demo lists", () => {
    expect(SOURCE_LABELS).toEqual({
      "federal-register": "Federal Register",
      govinfo: "GovInfo",
      congress: "Congress.gov",
      regulations: "Regulations.gov",
      grants: "Grants.gov",
      washington: "Washington State Legislature",
      oregon: "Oregon Legislature",
      idaho: "Idaho Legislature",
    });
  });
});

describe("IEEE dates", () => {
  it.each([
    ["2026-01-05", "Jan. 5, 2026"],
    ["2026-02-28", "Feb. 28, 2026"],
    ["2026-03-23", "Mar. 23, 2026"],
    ["2026-04-01", "Apr. 1, 2026"],
    ["2026-05-09", "May 9, 2026"],
    ["2026-06-30", "Jun. 30, 2026"],
    ["2026-07-04", "Jul. 4, 2026"],
    ["2026-08-15", "Aug. 15, 2026"],
    ["2026-09-10", "Sep. 10, 2026"],
    ["2026-10-31", "Oct. 31, 2026"],
    ["2026-11-11", "Nov. 11, 2026"],
    ["2026-12-25", "Dec. 25, 2026"],
  ])("writes %s as %s", (iso, expected) => {
    expect(ieeeDate(iso)).toBe(expected);
  });

  it("reads the date of a retrieval timestamp as recorded, in UTC", () => {
    expect(ieeeDate("2099-01-07T23:59:59.000Z")).toBe("Jan. 7, 2099");
  });
});

describe("IEEE references", () => {
  it("cites the issuing body, title, identifier, type, date and official address", () => {
    expect(ieeeReference(citation())).toBe(
      'Example Department, "Example Water Policy," 99 FR 100 (FR Doc. 2099-00001), Proposed Rule, Jan. 5, 2099. [Online]. Available: https://www.federalregister.gov/d/2099-00001 (accessed Jan. 7, 2099).',
    );
  });

  it("starts at the title when no issuing body is stated and says when the date is not stated", () => {
    expect(
      ieeeReference({ ...citation(), issuingBody: "Not stated", date: null }),
    ).toBe(
      '"Example Water Policy," 99 FR 100 (FR Doc. 2099-00001), Proposed Rule, date not stated. [Online]. Available: https://www.federalregister.gov/d/2099-00001 (accessed Jan. 7, 2099).',
    );
  });

  it("passes source wording through unchanged", () => {
    const source = {
      ...citation(),
      title: '  EXAMPLE  act; relating to "fees" & filing,  ',
      identifier: "ex. Doc No: 2099-00001 ",
      issuingBody: "example DEPARTMENT; Office  of Examples",
      kind: "proposed RULE",
    };
    expect(ieeeReference(source)).toBe(
      `${source.issuingBody}, "${source.title}," ${source.identifier}, ${source.kind}, Jan. 5, 2099. [Online]. Available: ${source.officialUrl} (accessed Jan. 7, 2099).`,
    );
  });
});

describe("ATNI references", () => {
  it("returns the framework and the tool, in that order, with the running version", () => {
    expect(atniReferences("0.2.0")).toEqual([
      'P. A. Freeland, "Tiered Sovereign Data Framework: Indigenous Data Sovereignty Standard," ver. 0.9.8 (pre-release), Affiliated Tribes of Northwest Indians, 2025. [Online]. Available: https://atniclimate.github.io/TieredSovereignDataFramework/',
      'ATNI Climate, "Policy Sentinel," ver. 0.2.0 (in development), Affiliated Tribes of Northwest Indians, 2026. [Online]. Available: https://github.com/atniclimate/policy-sentinel',
    ]);
  });
});
