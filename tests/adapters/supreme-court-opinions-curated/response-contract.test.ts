import { describe, expect, it } from "vitest";

import {
  SUPREME_COURT_HTML_POLICY,
  SUPREME_COURT_SELECTED_OPINION,
  SupremeCourtContractError,
  assertSupremeCourtOpinionProjection,
  parseSupremeCourtTermIndex,
  supremeCourtSourceRecordId,
} from "../../../src/adapters/supreme-court-opinions-curated";
import { replaceExactly, supremeCourtFixture } from "./test-helpers";

const targetRow =
  '      <tr><td>22</td><td>3/19/19</td><td>16-1498</td><td><a href="/opinions/boundvolumes/586BV.pdf#page=546" target="_blank" title="IGNORED_SCOTUS_TITLE_SENTINEL">Washington State Dept. of Licensing v. Cougar Den, Inc.</a></td><td>B</td><td style="text-align: center;"><span style="white-space:nowrap;">586 U.S. 347</span></td></tr>';
const header =
  "    <tr><th>R-</th><th>Date</th><th>Docket</th><th>Name</th><th>J.</th><th>Citation</th></tr>";

describe("Supreme Court curated-opinion HTML contract", () => {
  it("projects only the exact allowlisted row from the 10/63 table inventory", () => {
    const index = parseSupremeCourtTermIndex(supremeCourtFixture);
    expect(index).toMatchObject({
      termHeading: "Opinions of the Court - 2018",
      dataRowCount: 73,
      rows: [
        {
          tableIndex: 1,
          dataRowIndex: 41,
          revisionElementExposed: false,
          decisionDateSourceText: "3/19/19",
          decisionDate: "2019-03-19",
          docketNumber: "16-1498",
          caseName: "Washington State Dept. of Licensing v. Cougar Den, Inc.",
          reporterCitation: "586 U.S. 347",
          boundVolumeUrl:
            "https://www.supremecourt.gov/opinions/boundvolumes/586BV.pdf#page=546",
        },
      ],
    });
    expect(JSON.stringify(index)).not.toMatch(
      /OUTER_SCOTUS|SYN-[TU]?\d|IGNORED_SCOTUS_TITLE_SENTINEL/,
    );
    expect(index.rows[0]).not.toHaveProperty("principalOpinionCode");
    expect(index.rows[0]).not.toHaveProperty("sequence");
    expect(Object.isFrozen(index)).toBe(true);
    expect(Object.isFrozen(index.rows)).toBe(true);
    expect(Object.isFrozen(index.rows[0])).toBe(true);
    expect(Object.isFrozen(SUPREME_COURT_HTML_POLICY)).toBe(true);
  });

  it("binds identity to the exact docket and reporter citation pair", () => {
    expect(
      supremeCourtSourceRecordId(
        parseSupremeCourtTermIndex(supremeCourtFixture).rows[0],
      ),
    ).toBe("16-1498@586 U.S. 347");
  });

  it("binds header DOM order independently from target td order", () => {
    const headerDrift = replaceExactly(
      supremeCourtFixture,
      header,
      "    <tr><th>Citation</th><th>J.</th><th>Name</th><th>Docket</th><th>Date</th><th>R-</th></tr>",
    );
    expect(() => parseSupremeCourtTermIndex(headerDrift)).toThrow(
      expect.objectContaining({ code: "missing_field" }),
    );

    const targetOrderDrift = replaceExactly(
      supremeCourtFixture,
      targetRow,
      targetRow.replace(
        "<td>22</td><td>3/19/19</td>",
        "<td>3/19/19</td><td>22</td>",
      ),
    );
    expect(() => parseSupremeCourtTermIndex(targetOrderDrift)).toThrow(
      expect.objectContaining({ code: "inconsistent_value" }),
    );
  });

  it.each([
    [
      "term heading",
      "<h3>Opinions of the Court - 2018</h3>",
      "<h3>Opinions of the Court - 2019</h3>",
      "missing_field",
    ],
    [
      "opinion table class",
      '<table class="table table-bordered">',
      '<table class="table table-bordered drift">',
      "missing_field",
    ],
    [
      "opinion table id",
      '<table class="table table-bordered">',
      '<table id="opinions" class="table table-bordered">',
      "missing_field",
    ],
    [
      "sequence/revision cell",
      "<tr><td>22</td><td>3/19/19</td>",
      '<tr><td><a href="/revised">R</a></td><td>3/19/19</td>',
      "unexpected_structure",
    ],
    [
      "decision date",
      "<td>3/19/19</td>",
      "<td>3/20/19</td>",
      "inconsistent_value",
    ],
    ["docket", "<td>16-1498</td>", "<td>16-1499</td>", "missing_field"],
    [
      "case name",
      "Washington State Dept. of Licensing v. Cougar Den, Inc.",
      "Washington State Dept. of Licensing v. Synthetic Party",
      "inconsistent_value",
    ],
    [
      "principal-opinion guard",
      "<td>B</td>",
      "<td>A</td>",
      "inconsistent_value",
    ],
    [
      "reporter citation",
      '<span style="white-space:nowrap;">586 U.S. 347</span>',
      '<span style="white-space:nowrap;">609/2</span>',
      "inconsistent_value",
    ],
    [
      "reporter citation wrapper",
      '<td style="text-align: center;"><span style="white-space:nowrap;">586 U.S. 347</span></td>',
      '<td style="text-align: center;">586 U.S. 347</td>',
      "unexpected_structure",
    ],
    [
      "reporter citation cell style",
      '<td style="text-align: center;"><span style="white-space:nowrap;">586 U.S. 347</span></td>',
      '<td style="text-align: left;"><span style="white-space:nowrap;">586 U.S. 347</span></td>',
      "unexpected_structure",
    ],
    [
      "reporter citation span style",
      '<span style="white-space:nowrap;">586 U.S. 347</span>',
      '<span style="white-space: normal;">586 U.S. 347</span>',
      "unexpected_structure",
    ],
    [
      "reporter citation nested markup",
      '<span style="white-space:nowrap;">586 U.S. 347</span>',
      '<span style="white-space:nowrap;"><strong>586 U.S. 347</strong></span>',
      "unexpected_structure",
    ],
    [
      "bound-volume fragment",
      "586BV.pdf#page=546",
      "586BV.pdf#page=547",
      "invalid_value",
    ],
    [
      "bound-volume path",
      "/opinions/boundvolumes/586BV.pdf#page=546",
      "/opinions/slipopinion/18-1498.pdf#page=546",
      "invalid_value",
    ],
    [
      "anchor class",
      '<a href="/opinions/boundvolumes/586BV.pdf#page=546" target="_blank" title="IGNORED_SCOTUS_TITLE_SENTINEL">',
      '<a class="unreviewed" href="/opinions/boundvolumes/586BV.pdf#page=546" target="_blank" title="IGNORED_SCOTUS_TITLE_SENTINEL">',
      "unexpected_structure",
    ],
    [
      "anchor target",
      'target="_blank" title="IGNORED_SCOTUS_TITLE_SENTINEL"',
      'target="_self" title="IGNORED_SCOTUS_TITLE_SENTINEL"',
      "unexpected_structure",
    ],
    [
      "missing ignored anchor title",
      ' target="_blank" title="IGNORED_SCOTUS_TITLE_SENTINEL"',
      ' target="_blank"',
      "unexpected_structure",
    ],
    [
      "target cell class",
      "<tr><td>22</td><td>3/19/19</td>",
      '<tr><td class="unreviewed">22</td><td>3/19/19</td>',
      "unexpected_structure",
    ],
    [
      "target colspan",
      "<tr><td>22</td><td>3/19/19</td>",
      '<tr><td colspan="1">22</td><td>3/19/19</td>',
      "unexpected_structure",
    ],
  ])("fails closed for %s drift", (_label, search, replacement, code) => {
    expect(() =>
      parseSupremeCourtTermIndex(
        replaceExactly(supremeCourtFixture, search, replacement),
      ),
    ).toThrow(expect.objectContaining({ code }));
  });

  it("requires exactly 10 and 63 data rows rather than only a total ceiling", () => {
    const missingFirst = replaceExactly(
      supremeCourtFixture,
      "      <tr><td>S01</td><td>1/1/18</td><td>SYN-01</td><td>Impossible synthetic non-target 1</td><td>X</td><td>999 U.S. 1</td></tr>\n",
      "",
    );
    expect(() => parseSupremeCourtTermIndex(missingFirst)).toThrow(
      expect.objectContaining({ code: "inconsistent_value" }),
    );

    const missingSecond = replaceExactly(
      supremeCourtFixture,
      "      <tr><td>U10</td><td>1/3/18</td><td>SYN-U10</td><td>Impossible synthetic second-table row 10</td><td>Z</td><td>997 U.S. 10</td></tr>\n",
      "",
    );
    expect(() => parseSupremeCourtTermIndex(missingSecond)).toThrow(
      expect.objectContaining({ code: "inconsistent_value" }),
    );
  });

  it("rejects duplicate target identity and extra tables", () => {
    const duplicate = replaceExactly(
      supremeCourtFixture,
      "<td>SYN-01</td>",
      "<td>16-1498</td>",
    );
    expect(() => parseSupremeCourtTermIndex(duplicate)).toThrow(
      expect.objectContaining({ code: "duplicate_value" }),
    );

    const extraTable = replaceExactly(
      supremeCourtFixture,
      "<footer>",
      "<table><tr><td>extra</td></tr></table><footer>",
    );
    expect(() => parseSupremeCourtTermIndex(extraTable)).toThrow(
      expect.objectContaining({ code: "limit_exceeded" }),
    );
  });

  it("ignores inert template targets and permits only the reviewed parse error outside protected content", () => {
    const firstTable = supremeCourtFixture.indexOf(
      '<table class="table table-bordered">',
    );
    const secondTable = supremeCourtFixture.indexOf(
      '<table class="table table-bordered">',
      firstTable + 1,
    );
    expect(firstTable).toBeGreaterThan(-1);
    expect(secondTable).toBeGreaterThan(firstTable);
    const firstTableEnd = supremeCourtFixture.indexOf("</table>", firstTable);
    const inert =
      supremeCourtFixture.slice(0, firstTable) +
      "<template>" +
      supremeCourtFixture.slice(firstTable, firstTableEnd + 8) +
      "</template>" +
      supremeCourtFixture.slice(firstTableEnd + 8);
    expect(() => parseSupremeCourtTermIndex(inert)).toThrow(
      expect.objectContaining({ code: "missing_field" }),
    );

    const shellError = replaceExactly(
      supremeCourtFixture,
      "<body>",
      '<body><p bad"attr="synthetic">known shell error</p>',
    );
    expect(() => parseSupremeCourtTermIndex(shellError)).not.toThrow();

    const protectedError = replaceExactly(
      supremeCourtFixture,
      targetRow,
      targetRow.replace("<tr>", '<tr bad"attr="synthetic">'),
    );
    expect(() => parseSupremeCourtTermIndex(protectedError)).toThrow(
      expect.objectContaining({ code: "unexpected_structure" }),
    );
  });

  it("enforces aggregate parser limits and sanitizes rejected content", () => {
    const oversizedText = replaceExactly(
      supremeCourtFixture,
      "<footer>",
      `<footer>${"x".repeat(SUPREME_COURT_HTML_POLICY.maximumTextCodeUnits)}`,
    );
    expect(() => parseSupremeCourtTermIndex(oversizedText)).toThrow(
      expect.objectContaining({ code: "limit_exceeded" }),
    );

    try {
      parseSupremeCourtTermIndex(
        replaceExactly(
          supremeCourtFixture,
          SUPREME_COURT_SELECTED_OPINION.caseName,
          "REJECTED_SCOTUS_SENTINEL",
        ),
      );
      throw new Error("expected rejected fixture");
    } catch (error) {
      expect(error).toBeInstanceOf(SupremeCourtContractError);
      expect(String(error)).not.toContain("REJECTED_SCOTUS_SENTINEL");
    }
  });

  it("revalidates the exact projected object before normalization", () => {
    const row = parseSupremeCourtTermIndex(supremeCourtFixture).rows[0];
    expect(assertSupremeCourtOpinionProjection(row)).toEqual(row);
    expect(() =>
      assertSupremeCourtOpinionProjection({
        ...row,
        boundVolumeUrl:
          "https://www.supremecourt.gov/opinions/boundvolumes/586BV.pdf#page=547",
      }),
    ).toThrow(expect.objectContaining({ code: "inconsistent_value" }));
    expect(() =>
      assertSupremeCourtOpinionProjection({
        ...row,
        revisionElementExposed: true,
      }),
    ).toThrow(expect.objectContaining({ code: "inconsistent_value" }));
    expect(SUPREME_COURT_SELECTED_OPINION.principalOpinionCode).toBe("B");
  });
});
