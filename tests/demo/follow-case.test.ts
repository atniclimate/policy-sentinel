// @vitest-environment node
// The case follow kind (T1.6): identity is a GovInfo package id with its court
// code; a listing is new when its lastModified is after the last check (a new
// package or a changed lastModified).
import { describe, expect, it } from "vitest";
import { laneOptions } from "../../src/demo/discovery";
import {
  followItem,
  followLookups,
  restoreFollows,
  serializeFollows,
  settleCheck,
} from "../../src/demo/follow";
import type { FollowAnswer } from "../../src/demo/follow";
import { FOLLOW_KINDS } from "../../src/demo/follow-kinds";
import { caseKind } from "../../src/demo/follow-kinds/case";
import { COPY } from "../../src/demo/copy";
import { searchCriteria } from "../../src/demo/search-contract";
import type { DemoCitation, DemoSearchResponse } from "../../src/demo/types";

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

describe("following a case on the page (0.9.1 step 11)", () => {
  const PACKAGE = "USCOURTS-ca9-99-12345";
  const record = listing("2099-03-04T12:00:00Z");
  const followed = followItem(
    record,
    "case",
    PACKAGE,
    new Date("2099-03-05T10:00:00.000Z"),
  )!;
  const answer = (...results: DemoCitation[]): FollowAnswer => {
    const [lane] = followLookups(followed);
    const criteria = searchCriteria(
      lane.sourceId,
      lane.query,
      1,
      laneOptions({ dateFrom: null, dateTo: null }, lane),
    );
    const response: DemoSearchResponse = {
      ok: true,
      source: lane.sourceId,
      query: lane.query,
      total: results.length,
      page: 1,
      results,
      retrievedAt: "2099-03-06T00:00:00.000Z",
      criteria,
      continuation: { kind: "stopped", reason: "complete" },
    };
    return { ok: true, response };
  };

  it("is registered with its kind label", () => {
    expect(FOLLOW_KINDS.case).toBe(caseKind);
    expect(COPY.follow.kinds.case).toBe("case");
  });

  it("looks a case up once, by its court and docket, with contract v3", () => {
    expect(followed.id).toBe(`govinfo-courts#case:${PACKAGE}`);
    const lanes = followLookups(followed);
    expect(lanes).toHaveLength(1);
    expect(lanes[0]).toMatchObject({
      sourceId: "govinfo-courts",
      query: "ca9 99-12345",
      lookup: "court_docket",
    });
    expect(
      laneOptions({ dateFrom: null, dateTo: null }, lanes[0]),
    ).toMatchObject({ version: 3, match: "court_docket" });
    // A package id the record does not state is never followed.
    expect(
      followItem(record, "case", "USCOURTS-ca9-99-99999", new Date()),
    ).toBeNull();
  });

  it("survives a reload and refuses a stored case whose record names another package", () => {
    const stored = serializeFollows([followed]);
    expect(restoreFollows(stored)).toEqual({
      list: [followed],
      restored: "ok",
    });
    const tampered = stored.replace(
      `"packageId": "${PACKAGE}"`,
      `"packageId": "USCOURTS-ca9-99-99999"`,
    );
    expect(restoreFollows(tampered).restored).toBe("partial");
  });

  it("calls a changed lastModified new, and the same one unchanged", () => {
    const now = new Date("2099-03-07T00:00:00.000Z");
    const changed = settleCheck(
      followed,
      [answer(listing("2099-03-06T08:00:00Z"))],
      now,
    );
    expect(changed.check).toMatchObject({ state: "checked", undated: 0 });
    expect(
      changed.check.state === "checked" && changed.check.fresh,
    ).toHaveLength(1);
    const same = settleCheck(
      followed,
      [answer(listing("2099-03-04T12:00:00Z"))],
      now,
    );
    expect(same.check.state === "checked" && same.check.fresh).toEqual([]);
    const unstated = settleCheck(followed, [answer(listing())], now);
    expect(unstated.check).toMatchObject({ undated: 1, fresh: [] });
    // Another package listed by the lookup is not this case.
    const other = settleCheck(
      followed,
      [
        answer({
          ...listing("2099-03-06T08:00:00Z"),
          identifier: "USCOURTS-ca9-99-99999",
          packageId: "USCOURTS-ca9-99-99999",
        }),
      ],
      now,
    );
    expect(other.check).toMatchObject({ fresh: [], undated: 0 });
  });
});
