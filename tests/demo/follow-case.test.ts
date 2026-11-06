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

  it("has its kind label", () => {
    expect(COPY.follow.kinds.case).toBe("case");
  });

  it("is new only when lastModified is after the last check's exact instant", () => {
    // followed has no last check, so the baseline is its follow time, 10:00:00Z.
    const now = new Date("2099-03-07T00:00:00.000Z");
    const fresh = (stamp: string) => {
      const { check } = settleCheck(followed, [answer(listing(stamp))], now);
      return check.state === "checked" ? check.fresh.length : -1;
    };
    expect(fresh("2099-03-05T10:00:01Z")).toBe(1);
    expect(fresh("2099-03-05T10:00:00Z")).toBe(0);
    expect(fresh("2099-03-05T09:59:59Z")).toBe(0);
    // A garbled stamp counts as undated, never as new.
    expect(
      settleCheck(followed, [answer(listing("garbled"))], now).check,
    ).toMatchObject({ undated: 1, fresh: [] });
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
