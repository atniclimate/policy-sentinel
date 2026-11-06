import { describe, expect, it } from "vitest";
import {
  LINK_LABELS,
  LINK_NOTICES,
  linkLabel,
} from "../../src/demo/link-labels";
import type { LabelId } from "../../src/demo/link-labels";
import { forbiddenHits } from "./fixtures/chain/forbidden-words";

const ids = Object.keys(LINK_LABELS) as LabelId[];

describe("closed label table", () => {
  it("words the design's examples with the source's own headings", () => {
    expect(linkLabel("cfr_authority", "forward", "25 CFR part 900")).toBe(
      "Named in the part-level 'Authority:' line of 25 CFR part 900",
    );
    expect(linkLabel("usc_source_credit", "forward")).toBe(
      "Source credit stated by the U.S. Code",
    );
    expect(linkLabel("shares_rin", "forward", "1076-AF81")).toBe(
      "Shares RIN 1076-AF81",
    );
    expect(linkLabel("citation_in_text", "forward", "page 12")).toBe(
      "Citation found at page 12",
    );
    expect(linkLabel("fr_cfr_refs", "forward")).toBe(
      "CFR parts this document names",
    );
    expect(linkLabel("usc_reclassified", "forward", "25 U.S.C. 5321")).toBe(
      "OLRC notes this section was editorially reclassified as 25 U.S.C. 5321",
    );
    expect(linkLabel("fr_no_authority_line", "forward")).toBe(
      "No authority line in this document",
    );
    expect(LINK_NOTICES).toMatchObject({
      notLive: "Not available from a live source",
      notOfficial: "Not available from an official source",
      shortForm: "short form, not resolved",
    });
  });

  it("gives every link kind a forward label and a reverse one except citations in text and notices", () => {
    const noReverse = ids.filter((id) => LINK_LABELS[id].reverse === null);
    expect(noReverse.sort()).toEqual(
      [
        "cases_citing",
        "cfr_no_authority_line",
        "citation_in_text",
        "fr_no_authority_line",
        "short_form",
      ].sort(),
    );
    expect(() => linkLabel("citation_in_text", "reverse", "page 1")).toThrow();
    for (const id of ids) expect(linkLabel(id, "forward", "X 1")).not.toBe("");
  });

  it("uses no design rule 2 word in any label or notice", () => {
    const all = ids.flatMap((id) => [
      linkLabel(id, "forward", "99 CFR part 100"),
      ...(LINK_LABELS[id].reverse
        ? [linkLabel(id, "reverse", "99 CFR part 100")]
        : []),
    ]);
    all.push(...Object.values(LINK_NOTICES));
    expect(all.flatMap(forbiddenHits)).toEqual([]);
    // Never "no authority" on its own: only the full sentence.
    expect(all.filter((s) => /no authority/i.test(s))).toEqual([
      "No authority line in this document",
    ]);
  });
});
