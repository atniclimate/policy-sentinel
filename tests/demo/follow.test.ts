import { describe, expect, it } from "vitest";
import {
  addFollow,
  checkBatch,
  checkDates,
  followId,
  followItem,
  followLookups,
  importFollows,
  localDay,
  MAX_FOLLOWED,
  removeFollow,
  restoreFollows,
  serializeFollows,
  settleCheck,
} from "../../src/demo/follow";
import type { FollowAnswer, Followed } from "../../src/demo/follow";
import type { DemoCitation } from "../../src/demo/types";
import { citation, searchResult, statedCitation } from "./frontend-fixtures";

const FOLLOWED = new Date("2099-01-08T12:00:00.000Z");
const NOW = new Date("2099-01-20T09:30:00.000Z");
const DOCKET = "Docket No. 990101-0001";

function docket(): Followed {
  return followItem(statedCitation(), "docket", DOCKET, FOLLOWED)!;
}
const answered = (results: DemoCitation[]): FollowAnswer => ({
  ok: true,
  response: searchResult(results),
});
/** A later document that states the same docket. */
const later = (id: string, date: string | null): DemoCitation => ({
  ...citation(id, `Later ${id}`),
  date,
  docketIds: [DOCKET],
});

describe("following a docket, a RIN or a document", () => {
  it("follows each identifier once, by source, kind and value, and removes by id", () => {
    const item = docket();
    expect(item.id).toBe(followId("federal-register", "docket", DOCKET));
    expect(item.lastChecked).toBeNull();
    expect(item.record.summary).toBeNull();
    const list = addFollow([], item);
    expect(addFollow(list, docket())).toBe(list);
    const rin = followItem(statedCitation(), "rin", "0648-AA00", FOLLOWED)!;
    const both = addFollow(list, rin);
    expect(both.map((each) => each.kind)).toEqual(["docket", "rin"]);
    expect(removeFollow(both, item.id)).toEqual([rin]);
  });

  it("looks up a docket or RIN alone, and a document by every identifier its source stated", () => {
    expect(
      followLookups(docket()).map((lane) => [lane.match, lane.query]),
    ).toEqual([["docket", DOCKET]]);
    const document = followItem(
      statedCitation(),
      "document",
      statedCitation().identifier,
      FOLLOWED,
    )!;
    expect(followLookups(document).map((lane) => lane.match)).toEqual([
      "docket",
      "rin",
      "cfr",
    ]);
    // Nothing to look up: not followable.
    expect(
      followItem(citation(), "document", citation().identifier, FOLLOWED),
    ).toBeNull();
    expect(
      followItem(statedCitation(), "docket", "Other", FOLLOWED),
    ).toBeNull();
  });

  it("stops adding at the limit", () => {
    let list: readonly Followed[] = [];
    for (let n = 0; n < MAX_FOLLOWED + 2; n++) {
      const record = {
        ...statedCitation(),
        rins: [`0648-A${String(n).padStart(3, "0")}`],
      };
      list = addFollow(
        list,
        followItem(record, "rin", record.rins[0], FOLLOWED)!,
      );
    }
    expect(list).toHaveLength(MAX_FOLLOWED);
  });

  it("dates each lookup from the last check where the source takes dates", () => {
    expect(checkDates(docket(), NOW)).toEqual({
      dateFrom: "2099-01-08",
      dateTo: "2099-01-20",
      documentType: null,
    });
    const checked = { ...docket(), lastChecked: "2099-01-15T12:00:00.000Z" };
    expect(checkDates(checked, NOW).dateFrom).toBe("2099-01-15");
    // A clock set back never asks for a range that ends before it starts.
    expect(checkDates(checked, new Date("2099-01-01T12:00:00.000Z"))).toEqual({
      dateFrom: "2099-01-01",
      dateTo: "2099-01-01",
      documentType: null,
    });
  });

  it("counts from the reader's calendar day, not the UTC day", () => {
    const zone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      // 6 PM Pacific on January 14 is already January 15 in UTC.
      const evening = "2099-01-15T02:00:00.000Z";
      expect(localDay(evening)).toBe("2099-01-14");
      const checked = { ...docket(), lastChecked: evening };
      expect(checkDates(checked, NOW).dateFrom).toBe("2099-01-14");
    } finally {
      if (zone === undefined) delete process.env.TZ;
      else process.env.TZ = zone;
    }
  });

  it("shows only listings that state the identifier, dated on or after the day counted from, as new", () => {
    const { check, item } = settleCheck(
      docket(),
      [
        answered([
          later("2099-00020", "2099-01-12"),
          later("2099-00021", "2099-01-02"),
          later("2099-00022", null),
          // Returned by the lookup, but it states no docket.
          { ...citation("2099-00023"), date: "2099-01-15" },
          // The record it was followed from is never new.
          { ...statedCitation(), date: "2099-01-19" },
        ]),
      ],
      NOW,
    );
    expect(check.state).toBe("checked");
    if (check.state !== "checked") return;
    expect(check.since).toBe("2099-01-08");
    expect(check.fresh.map((listing) => listing.title)).toEqual([
      "Later 2099-00020",
    ]);
    expect(check.undated).toBe(1);
    expect(check.more).toBe(false);
    expect(item.lastChecked).toBe(NOW.toISOString());
  });

  it("leaves lastChecked alone when the source holds more listings than were loaded", () => {
    const response = searchResult([later("2099-00020", "2099-01-12")]);
    const { check, item } = settleCheck(
      docket(),
      [
        {
          ok: true,
          response: {
            ...response,
            continuation: { kind: "more", next: { page: 2 } },
          } as typeof response,
        },
      ],
      NOW,
    );
    expect(check.state === "checked" && check.more).toBe(true);
    expect(item.lastChecked).toBeNull();
  });

  it("keeps a failed lookup unavailable, never nothing new, and leaves lastChecked alone", () => {
    const document = followItem(
      statedCitation(),
      "document",
      statedCitation().identifier,
      FOLLOWED,
    )!;
    const { check, item } = settleCheck(
      document,
      [
        answered([]),
        { ok: false, reason: "The demo service did not answer." },
        answered([]),
      ],
      NOW,
    );
    expect(check).toEqual({
      state: "unavailable",
      reason: "The demo service did not answer.",
    });
    expect(item).toBe(document);
  });

  it("checks the oldest first, within the request budget, and holds the rest", () => {
    const document = {
      ...followItem(
        statedCitation(),
        "document",
        statedCitation().identifier,
        FOLLOWED,
      )!,
      lastChecked: "2099-01-10T00:00:00.000Z",
    };
    const rin = {
      ...followItem(statedCitation(), "rin", "0648-AA00", FOLLOWED)!,
      lastChecked: "2099-01-01T00:00:00.000Z",
    };
    const fresh = docket();
    const { now, later: waiting } = checkBatch([document, rin, fresh], 2);
    expect(now.map((item) => item.kind)).toEqual(["docket", "rin"]);
    expect(waiting).toEqual([document]);
  });

  it("restores valid items from storage and states partial damage", () => {
    const item = docket();
    const raw = serializeFollows([item]);
    expect(restoreFollows(raw)).toEqual({ list: [item], restored: "ok" });
    expect(restoreFollows(null)).toEqual({ list: [], restored: "ok" });
    const damaged = JSON.stringify({
      version: 1,
      followed: [item, { ...item, id: "forged" }],
    });
    expect(restoreFollows(damaged)).toEqual({
      list: [item],
      restored: "partial",
    });
    expect(restoreFollows("{")).toEqual({ list: [], restored: "failed" });
  });

  it("imports a valid file whole, keeps items already followed, and rejects unknown shapes", () => {
    const item = docket();
    const rin = followItem(statedCitation(), "rin", "0648-AA00", FOLLOWED)!;
    const file = serializeFollows([item, rin]);
    const kept = { ...item, lastChecked: "2099-01-15T00:00:00.000Z" };
    expect(importFollows([kept], file)).toEqual({
      list: [kept, rin],
      added: 1,
      already: 1,
      dropped: 0,
    });
    const reject = (value: unknown) =>
      expect(importFollows([], JSON.stringify(value))).toBeNull();
    reject({ version: 2, followed: [] });
    reject({ version: 1, followed: [], extra: true });
    reject({ version: 1 });
    reject([item]);
    // One bad item rejects the file: an import is taken whole or not at all.
    reject({ version: 1, followed: [item, { ...rin, note: "unknown field" }] });
    reject({ version: 1, followed: [{ ...rin, value: "0648-ZZ99" }] });
    reject({ version: 1, followed: [{ ...rin, followedAt: "yesterday" }] });
    reject({
      version: 1,
      followed: [
        {
          ...rin,
          record: { ...rin.record, officialUrl: "https://example.com/x" },
        },
      ],
    });
    expect(importFollows([], "not json")).toBeNull();
  });
});
