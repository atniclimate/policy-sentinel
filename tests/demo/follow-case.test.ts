// @vitest-environment node
// The case follow kind (T1.6): identity is a GovInfo package id with its court
// code; a listing is new when its lastModified is after the last check (a new
// package or a changed lastModified).
import { describe, expect, it } from "vitest";
import { caseKind } from "../../src/demo/follow-kinds/case";
import type { DemoCitation } from "../../src/demo/types";

const listing = (lastModified?: string): DemoCitation => ({
  sourceId: "govinfo-courts",
  identifier: "USCOURTS-ca9-99-12345",
  title: "EXAMPLE COUNTY V. UNITED STATES",
  issuingBody: "Example Court",
  kind: "USCOURTS",
  date: "2099-03-04",
  officialUrl: "https://www.govinfo.gov/app/details/USCOURTS-ca9-99-12345",
  textUrl: null,
  retrievedAt: "2099-03-05T00:00:00.000Z",
  summary: null,
  textAvailable: false,
  matchKey: null,
  court: "ca9",
  packageId: "USCOURTS-ca9-99-12345",
  ...(lastModified !== undefined && { lastModified }),
});

describe("case follow kind", () => {
  it("forms its id from the source and the package id with court code", () => {
    expect(caseKind.label).toBe("Case");
    expect(caseKind.id("govinfo-courts", "USCOURTS-ca9-99-12345")).toBe(
      "govinfo-courts#case:USCOURTS-ca9-99-12345",
    );
  });

  it("keeps the full last-check instant as its baseline", () => {
    expect(caseKind.baseline(null, "2099-03-05T10:00:00.000Z")).toBe(
      "2099-03-05T10:00:00.000Z",
    );
    expect(
      caseKind.baseline("2099-03-06T10:00:00.000Z", "2099-03-05T10:00:00.000Z"),
    ).toBe("2099-03-06T10:00:00.000Z");
  });

  it("uses lastModified as the version key, and none when the source states none", () => {
    expect(caseKind.versionKey(listing("2099-03-05T01:02:03Z"))).toBe(
      "2099-03-05T01:02:03Z",
    );
    expect(caseKind.versionKey(listing())).toBeNull();
    expect(caseKind.versionKey(listing("not a date"))).toBeNull();
  });

  it("is new only when lastModified is after the baseline instant", () => {
    const base = "2099-03-05T10:00:00.000Z";
    expect(caseKind.isNew(base, "2099-03-05T10:00:01Z")).toBe(true);
    expect(caseKind.isNew(base, "2099-03-05T10:00:00Z")).toBe(false);
    expect(caseKind.isNew(base, "2099-03-05T09:59:59Z")).toBe(false);
    expect(caseKind.isNew(base, "garbled")).toBe(false);
  });
});
