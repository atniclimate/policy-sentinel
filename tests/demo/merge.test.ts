import { describe, expect, it } from "vitest";
import {
  CONGRESS_REFERENCE,
  FEDERAL_PRECEDENCE,
  isCongressReference,
  mergeResults,
} from "../../src/demo/merge";
import type { DemoCitation } from "../../src/demo/types";
import { listing } from "./fixtures";

const A = "fr:2099-00001";
const fr = (id: string, matchKey: string | null = null) =>
  listing("federal-register", id, matchKey);
const gi = (id: string, matchKey: string | null = null) =>
  listing("govinfo", id, matchKey);
const reg = (id: string, matchKey: string | null = null) =>
  listing("regulations", id, matchKey);
/** A listing from a source the precedence order does not name. */
const other = (
  sourceId: string,
  id: string,
  matchKey: string | null = null,
): DemoCitation => ({ ...gi(id, matchKey), sourceId });
const batch = (sourceId: string, ...results: DemoCitation[]) => ({
  sourceId,
  results,
});

describe("merging results from several federal sources", () => {
  it("ranks the sources by how far the demo can check their record", () => {
    expect(FEDERAL_PRECEDENCE).toEqual([
      "federal-register",
      "govinfo",
      "regulations",
      "congress",
    ]);
  });

  it("interleaves the sources by rank, in precedence order, whatever order they arrive in", () => {
    const [f0, g0, g1, g2, r0, r1] = [
      fr("f0"),
      gi("g0"),
      gi("g1"),
      gi("g2"),
      reg("r0"),
      reg("r1"),
    ];
    const merged = mergeResults([
      batch("regulations", r0, r1),
      batch("federal-register", f0),
      batch("govinfo", g0, g1, g2),
    ]);
    expect(merged.results.map((row) => row.citation)).toEqual([
      f0,
      g0,
      r0,
      g1,
      r1,
      g2,
    ]);
    expect(merged.results.every((row) => row.alternates.length === 0)).toBe(
      true,
    );
    expect(merged.merged).toBe(0);
  });

  it("shows one row for a shared document: the highest-precedence record, then the others in precedence order", () => {
    const [f, g, r] = [fr("f", A), gi("g", A), reg("r", A)];
    expect(
      mergeResults([
        batch("regulations", r),
        batch("govinfo", g),
        batch("federal-register", f),
      ]),
    ).toEqual({ results: [{ citation: f, alternates: [g, r] }], merged: 2 });
  });

  it("puts a higher-precedence duplicate that arrives at a later rank in the row's earliest position", () => {
    const [f0, f1, fA] = [fr("f0"), fr("f1"), fr("fA", A)];
    const [gA, g1, rA] = [gi("gA", A), gi("g1"), reg("rA", A)];
    expect(
      mergeResults([
        batch("govinfo", gA, g1),
        batch("federal-register", f0, f1, fA),
        batch("regulations", rA),
      ]),
    ).toEqual({
      results: [
        { citation: f0, alternates: [] },
        { citation: fA, alternates: [gA, rA] },
        { citation: f1, alternates: [] },
        { citation: g1, alternates: [] },
      ],
      merged: 2,
    });
  });

  it("never merges two results from the same source", () => {
    const [a, b, g] = [fr("a", A), fr("b", A), gi("g", A)];
    expect(mergeResults([batch("federal-register", a, b)])).toEqual({
      results: [
        { citation: a, alternates: [] },
        { citation: b, alternates: [] },
      ],
      merged: 0,
    });
    expect(
      mergeResults([batch("federal-register", a, b), batch("govinfo", g)]),
    ).toEqual({
      results: [
        { citation: a, alternates: [g] },
        { citation: b, alternates: [] },
      ],
      merged: 1,
    });
    const [g1, g2] = [gi("g1", A), gi("g2", A)];
    expect(
      mergeResults([batch("govinfo", g1, g2), batch("federal-register", a)]),
    ).toEqual({
      results: [
        { citation: a, alternates: [g1] },
        { citation: g2, alternates: [] },
      ],
      merged: 1,
    });
  });

  it("never merges results that carry no shared identifier, even with the same title", () => {
    const [f, g] = [fr("same"), gi("same")];
    expect(f.title).toBe(g.title);
    expect(
      mergeResults([batch("federal-register", f), batch("govinfo", g)]),
    ).toEqual({
      results: [
        { citation: f, alternates: [] },
        { citation: g, alternates: [] },
      ],
      merged: 0,
    });
  });

  it("places unknown sources after the known ones, in the order given", () => {
    const [z, a, c, f] = [
      other("zeta", "z", A),
      other("alpha", "a"),
      listing("congress", "c", null),
      fr("f", A),
    ];
    expect(
      mergeResults([
        batch("zeta", z),
        batch("alpha", a),
        batch("congress", c),
        batch("federal-register", f),
      ]),
    ).toEqual({
      results: [
        { citation: f, alternates: [z] },
        { citation: c, alternates: [] },
        { citation: a, alternates: [] },
      ],
      merged: 1,
    });
    const second = other("alpha", "a2", A);
    expect(mergeResults([batch("zeta", z), batch("alpha", second)])).toEqual({
      results: [{ citation: z, alternates: [second] }],
      merged: 1,
    });
  });

  it("is deterministic and leaves its input unchanged", () => {
    const batches = [
      batch("govinfo", gi("g", A), gi("g1")),
      batch("federal-register", fr("f", A)),
    ];
    const before = JSON.stringify(batches);
    const first = mergeResults(batches);
    expect(mergeResults(batches)).toEqual(first);
    expect(JSON.stringify(batches)).toBe(before);
    expect(mergeResults([])).toEqual({ results: [], merged: 0 });
    expect(mergeResults([batch("govinfo")])).toEqual({
      results: [],
      merged: 0,
    });
  });
});

describe("Congress.gov bill reference", () => {
  it.each([
    "hr 1234 119",
    "HR1234 119",
    "  s 5 99  ",
    "S 12345 119",
    "hjres 1 100",
    "sjres 12 118",
    "hconres 3 119",
    "sconres 7 119",
    "hres 2 119",
    "SRES 99 119",
  ])("accepts one bill reference: %s", (query) => {
    expect(isCongressReference(query)).toBe(true);
  });

  it.each([
    "",
    "hr",
    "hr 1234",
    "hr 1234119",
    "hr 123456 119",
    "hr 1234 1",
    "hr 1234 1190",
    "hr 1234 119 extra",
    "hr 1234 119; s 5 119",
    "h.r. 1234 119",
    "hr -12 119",
    "hb 1100",
    "water quality standards",
    "Executive Order 13175",
  ])("rejects anything else: %s", (query) => {
    expect(isCongressReference(query)).toBe(false);
  });

  it("exposes the type, number and Congress the Worker reads, with no match state", () => {
    expect(CONGRESS_REFERENCE.exec(" HR 1234 119 ")?.slice(1)).toEqual([
      "HR",
      "1234",
      "119",
    ]);
    expect(CONGRESS_REFERENCE.flags).toBe("i");
  });
});
