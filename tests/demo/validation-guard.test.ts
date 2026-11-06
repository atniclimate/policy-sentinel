// @vitest-environment node
// The page re-runs the D-068 personal-pattern guard on Worker answers, so an
// answer cached before a guard change is still checked (R2-5, R2-7).
// Synthetic values only.
import { describe, expect, it } from "vitest";
import { chain as CH } from "../../src/demo/copy/chain";
import { citationsInText, recordLinks } from "../../src/demo/links";
import type { DemoCitation } from "../../src/demo/types";
import { policyValueV3, relatedValue } from "../../src/demo/validation";
import { blocks, frRecord as chainRecord, SOURCES } from "./fixtures/chain";
import { policy } from "./frontend-fixtures";

const frRecord: DemoCitation = {
  ...chainRecord,
  cfrRefs: [{ title: 25, part: "900" }],
};
const expected = { source: "federal-register", id: "2099-00001" };

describe("policyValueV3 guard re-run (R2-7)", () => {
  it("withholds a chain row and an authority line the guard flags, and says so", () => {
    const opened = policy("a", {
      ...frRecord,
      authorityLine: "25 U.S.C. 5301; CONTACT: JANE SAMPLEPERSON",
      authorityLinePresent: true,
    });
    const rows = citationsInText(blocks, opened.citation);
    expect(rows.length).toBeGreaterThan(0);
    const [first, ...others] = rows;
    const flagged = { ...first, sourceWording: "MR. SAMPLEPERSON" };
    const read = policyValueV3(
      JSON.parse(
        JSON.stringify({ ...opened, version: 3, chain: [flagged, ...others] }),
      ),
      expected,
    );
    // Safeguard 8: the withheld row is counted in a stated row, never silent.
    expect(read.chain?.slice(0, -1)).toEqual(others);
    expect(read.chain?.at(-1)).toMatchObject({
      kind: "note",
      section: "inText",
      label: CH.rowsWithheld(1),
    });
    expect(read.citation.authorityLine).toBeUndefined();
    expect(read.citation.authorityLinePresent).toBe(true);
    expect(recordLinks(read.citation, SOURCES).map((r) => r.label)).toContain(
      CH.authorityWithheld,
    );
    expect(JSON.stringify(read)).not.toContain("SAMPLEPERSON");
  });

  it("adds the rows the Worker withheld to the stated count", () => {
    const opened = policy("a", frRecord);
    const rows = citationsInText(blocks, opened.citation);
    const read = policyValueV3(
      JSON.parse(
        JSON.stringify({
          ...opened,
          version: 3,
          chain: rows,
          chainWithheld: 2,
        }),
      ),
      expected,
    );
    expect(read.chain?.at(-1)?.label).toBe(CH.rowsWithheld(2));
    expect(() =>
      policyValueV3(
        JSON.parse(
          JSON.stringify({
            ...opened,
            version: 3,
            chain: rows,
            chainWithheld: -1,
          }),
        ),
        expected,
      ),
    ).toThrow("Invalid chain withheld count");
  });

  it("states the rows the Worker cut at its cap in their own row", () => {
    const opened = policy("a", frRecord);
    const rows = citationsInText(blocks, opened.citation);
    const read = (extra: object) =>
      policyValueV3(
        JSON.parse(
          JSON.stringify({ ...opened, version: 3, chain: rows, ...extra }),
        ),
        expected,
      );
    const cut = read({ chainWithheld: 2, chainCut: 50 }).chain!;
    expect(cut.slice(-2).map((r) => [r.kind, r.section, r.label])).toEqual([
      ["note", "inText", CH.rowsWithheld(2)],
      ["note", "inText", CH.rowsCut(50)],
    ]);
    expect(read({}).chain).toHaveLength(rows.length);
    expect(() => read({ chainCut: -1 })).toThrow("Invalid count");
    expect(() => read({ chainCut: 1.5 })).toThrow("Invalid count");
  });

  it("keeps an authority line with no personal pattern", () => {
    const opened = policy("a", {
      ...frRecord,
      authorityLine: "25 U.S.C. 5301 et seq.",
      authorityLinePresent: true,
    });
    expect(policyValueV3(opened, expected).citation.authorityLine).toBe(
      "25 U.S.C. 5301 et seq.",
    );
  });
});

describe("related bill titles (R2-5)", () => {
  const answer = (title: string | null) => ({
    ok: true,
    source: "congress",
    basis: "source_field",
    bill: "HR 1001, 199th Congress",
    records: [
      {
        relation: "Related bill",
        identifiedBy: "House",
        identifier: "HR 3003, 199th Congress",
        title,
        officialUrl:
          "https://www.congress.gov/bill/199th-congress/house-bill/3003",
      },
    ],
    total: 1,
    retrievedAt: "2099-03-05T00:00:00.000Z",
  });
  const title = (t: string | null) => {
    const v = relatedValue(answer(t), {
      source: "congress",
      bill: "hr 1001 199",
    });
    if (v.source !== "congress") throw new Error("expected Congress.gov");
    return v.records[0]?.title;
  };

  it("keeps a stated title and accepts a withheld one", () => {
    expect(title("Example Fisheries Act")).toBe("Example Fisheries Act");
    expect(title(null)).toBeNull();
  });

  it.each([
    "For the relief of Jane Sampleperson",
    "Example Act; contact Mr. Sampleperson",
  ])("withholds %s", (t) => {
    expect(title(t)).toBeNull();
  });
});
