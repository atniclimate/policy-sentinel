// Shapes the CFR annual edition prints outside title 25, each met in the real
// 2025 edition on 2026-11-19 (titles 36, 43 and 50) and refused by the builder
// until then. One regression test per shape, on the trimmed title 25 fixture.
// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCfrShard } from "../../scripts/demo-index/cfr.mjs";
import { loadProbeNames } from "../../scripts/demo-index/common.mjs";
import { schemaErrors } from "../../scripts/demo-index/validate.mjs";

const CFR_XML = readFileSync(
  "tests/demo/fixtures/demo-index/cfr-title25-trimmed.xml",
  "utf8",
);
const { names } = loadProbeNames();
const build = (...volumes: string[]) =>
  buildCfrShard(
    volumes.map((xml, i) => ({ volume: i + 1, xml })),
    { title: 25, editionYear: 2025, volumes: null, names },
  );
const base = build(CFR_XML);
const swap = (from: string, to: string) => {
  expect(CFR_XML).toContain(from);
  return CFR_XML.replaceAll(from, to);
};

describe("CFR annual edition shapes outside title 25", () => {
  it("reads a running head printed PT. 2, Pt.2 or Pt 2 as part 2 (36 CFR 1001, 43 CFR 3100 and 3140)", () => {
    for (const head of ["PT. 2", "Pt.2", "Pt 2"])
      expect(
        build(swap("<EAR>Pt. 2</EAR>", `<EAR>${head}</EAR>`)).shard.entries,
      ).toEqual(base.shard.entries);
  });

  it("carries a five-digit part number (43 CFR 10000)", () => {
    const xml = swap("<PT>900</PT>", "<PT>10000</PT>")
      .replace("<EAR>Pt. 900</EAR>", "<EAR>Pt. 10000</EAR>")
      .replace("PART 900—", "PART 10000—");
    const { shard } = build(xml);
    expect(shard.entries.map((e) => e.part)).toContain("10000");
    expect(schemaErrors("cfr-authority-shard", shard)).toEqual([]);
  });

  it("takes the number from the part's own heading when the running head is empty (43 CFR 3000)", () => {
    expect(build(swap("<EAR>Pt. 32</EAR>", "<EAR/>")).shard.entries).toEqual(
      base.shard.entries,
    );
    // A heading that states no number still fails closed.
    expect(() =>
      build(
        swap("<EAR>Pt. 32</EAR>", "<EAR/>").replace(
          "PART 32—SYNTHETIC HEADING",
          "SYNTHETIC HEADING",
        ),
      ),
    ).toThrow(/part number is not in the expected form/);
  });

  it("reads a subtitle's own contents list when it has no chapter (43 CFR subtitle A)", () => {
    const xml = swap("<CHAPTER>", "<SUBTITLE>").replaceAll(
      "</CHAPTER>",
      "</SUBTITLE>",
    );
    expect(build(xml).shard.entries).toEqual(base.shard.entries);
  });

  it("counts a part repeated in another volume with the same lines as continued, and refuses different lines (50 CFR 17)", () => {
    const again = build(CFR_XML, CFR_XML);
    expect(again.shard.entries).toEqual(base.shard.entries);
    expect(again.report.continuedParts).toEqual(
      base.shard.entries.map((e) => e.part),
    );
    expect(() =>
      build(
        CFR_XML,
        swap(
          "<P>43 U.S.C. 1457; 25 U.S.C. 9; 5 U.S.C. 301.</P>",
          "<P>43 U.S.C. 1457; 25 U.S.C. 9.</P>",
        ),
      ),
    ).toThrow(/part 2 appears twice with different lines/);
  });
});
