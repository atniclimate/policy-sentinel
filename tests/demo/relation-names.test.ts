// @vitest-environment node
// Owner decision 12: a closed list of relation names the sources return.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RELATION_FIELD, relationShown } from "../../src/demo/relation-names";
import { forbiddenHits } from "./fixtures/chain/forbidden-words";

describe("relation names a source returns", () => {
  it("shows each name on the closed list, whatever its case", () => {
    for (const name of [
      "Bill versions",
      "Bill Versions",
      "Bill History",
      "Congressional Reports",
      "Congressional Committee Prints",
      "Presidential Signing Statements and Remarks",
      "Public and Private Laws",
      "Statutes at Large",
      "U.S. Code",
      "Identical bill",
      "Related bill",
      "Procedurally-related",
    ])
      expect(relationShown(name)).toBe(true);
  });

  it("withholds every name not on the list", () => {
    for (const name of [
      "Public law contains the text",
      "Implements Example Rule",
      "Authorized by",
      "Related",
      "",
    ])
      expect(relationShown(name)).toBe(false);
  });

  it("ships no screening word and no forbidden label in the list file (G5, rule 2)", () => {
    const text = readFileSync("src/demo/relation-names.ts", "utf8");
    expect(text).not.toMatch(
      /jev|typesafe|parallel|model|probability|confidence/i,
    );
    expect(forbiddenHits(text)).toEqual([]);
    expect(RELATION_FIELD).toBe("relation");
  });
});
