import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  WASHINGTON_GOVERNOR_HTML_POLICY,
  WashingtonGovernorContractError,
  parseWashingtonGovernorExecutiveOrdersIndex,
  washingtonGovernorSourceRecordId,
} from "../../../src/adapters/washington-governor-executive-orders";

const fixture = readFileSync(
  path.resolve(
    process.cwd(),
    "fixtures/sources/washington-governor-executive-orders/current-term.valid.html",
  ),
  "utf8",
);

function replaceExactly(
  value: string,
  search: string,
  replacement: string,
): string {
  const firstIndex = value.indexOf(search);
  expect(firstIndex).toBeGreaterThanOrEqual(0);
  const result = value.replace(search, replacement);
  expect(result).not.toBe(value);
  expect(result.slice(firstIndex, firstIndex + replacement.length)).toBe(
    replacement,
  );
  return result;
}

function parse(html = fixture, maximumIssuedDate = "2099-12-31") {
  return parseWashingtonGovernorExecutiveOrdersIndex(html, {
    maximumIssuedDate,
  });
}

describe("Washington Governor executive-order HTML contract", () => {
  it("projects only the immutable allowlisted inventory and sorts it", () => {
    const index = parse();
    expect(index.displayedTotal).toBe(2);
    expect(index.rows.map(({ number }) => number)).toEqual(["99-01", "25-01"]);
    expect(index.rows[0]).toEqual({
      number: "99-01",
      issuedDateSourceText: "01/02/2099",
      issuedDate: "2099-01-02",
      title: "Synthetic Tribal Nations planning notice",
      sourceStatus: "Active",
      governor: "Bob Ferguson",
      officialPdfUrl:
        "https://governor.wa.gov/sites/default/files/exe_order/SYNTHETIC-EO-99-01.pdf",
    });
    expect(JSON.stringify(index)).not.toMatch(
      /OUTER_(?:PAGE|ATTRIBUTE|FOOTER)_SENTINEL/,
    );
    expect(Object.isFrozen(index)).toBe(true);
    expect(Object.isFrozen(index.rows)).toBe(true);
    expect(Object.isFrozen(index.rows[0])).toBe(true);
    expect(() => {
      (index.rows as unknown as Array<unknown>).push({});
    }).toThrow();
    expect(Object.isFrozen(WASHINGTON_GOVERNOR_HTML_POLICY)).toBe(true);
  });

  it("uses the compound number and issued-date identity", () => {
    expect(washingtonGovernorSourceRecordId(parse().rows[0]!)).toBe(
      "99-01@2099-01-02",
    );
  });

  it.each([
    [
      "missing target view",
      "view-executive-orders",
      "view-unreviewed-orders",
      "missing_field",
    ],
    ["header drift", ">Number<", ">Identifier<", "inconsistent_value"],
    [
      "cell class drift",
      "views-field-field-eo-number",
      "views-field-field-number-drift",
      "unexpected_structure",
    ],
    [
      "count mismatch",
      "Displaying 1 - 2 of 2",
      "Displaying 1 - 2 of 3",
      "inconsistent_value",
    ],
    [
      "second table in the target view",
      '<div class="view-content row">',
      '<table></table><div class="view-content row">',
      "duplicate_value",
    ],
    [
      "unexpected table section",
      "          </tbody>\n        </table>",
      "          </tbody>\n          <tfoot></tfoot>\n        </table>",
      "unexpected_structure",
    ],
    [
      "governor filter drift",
      '<option value="220" selected="selected">Bob Ferguson</option>',
      '<option value="221" selected="selected">Bob Ferguson</option>',
      "inconsistent_value",
    ],
    [
      "status filter drift",
      '<option value="223">Superseded</option>',
      '<option value="223">Retired</option>',
      "inconsistent_value",
    ],
    [
      "future status expansion",
      '<td class="views-field views-field-field-eo-status">Active</td>',
      '<td class="views-field views-field-field-eo-status">Expired</td>',
      "invalid_value",
    ],
    [
      "missing status cell",
      '<td class="views-field views-field-field-eo-status">Active</td>',
      "",
      "unexpected_structure",
    ],
    [
      "blank status",
      '<td class="views-field views-field-field-eo-status">Active</td>',
      '<td class="views-field views-field-field-eo-status"></td>',
      "missing_field",
    ],
    [
      "unknown status",
      '<td class="views-field views-field-field-eo-status">Active</td>',
      '<td class="views-field views-field-field-eo-status">Archived</td>',
      "invalid_value",
    ],
    [
      "free-form status",
      '<td class="views-field views-field-field-eo-status">Active</td>',
      '<td class="views-field views-field-field-eo-status">Active through a synthetic date</td>',
      "invalid_value",
    ],
    [
      "governor row drift",
      "                Bob Ferguson\n",
      "                Synthetic Governor\n",
      "inconsistent_value",
    ],
    ["invalid calendar date", "01/02/2099", "02/29/2099", "invalid_value"],
    [
      "number/date year drift",
      ">99-01</td>",
      ">98-01</td>",
      "inconsistent_value",
    ],
    ["pre-scope date", "01/15/2025", "01/14/2025", "invalid_value"],
    [
      "missing title anchor href",
      'href="/sites/default/files/exe_order/SYNTHETIC-EO-99-01.pdf"',
      'data-href="/sites/default/files/exe_order/SYNTHETIC-EO-99-01.pdf"',
      "missing_field",
    ],
    [
      "absolute Governor PDF URL",
      'href="/sites/default/files/exe_order/SYNTHETIC-EO-99-01.pdf"',
      'href="https://governor.wa.gov/sites/default/files/exe_order/SYNTHETIC-EO-99-01.pdf"',
      "invalid_value",
    ],
    [
      "plaintext PDF URL",
      'href="/sites/default/files/exe_order/SYNTHETIC-EO-99-01.pdf"',
      'href="http://governor.wa.gov/sites/default/files/exe_order/SYNTHETIC-EO-99-01.pdf"',
      "invalid_value",
    ],
    [
      "lookalike PDF host",
      'href="/sites/default/files/exe_order/SYNTHETIC-EO-99-01.pdf"',
      'href="https://governor.wa.gov.example.invalid/sites/default/files/exe_order/SYNTHETIC-EO-99-01.pdf"',
      "invalid_value",
    ],
    [
      "encoded slash in PDF path",
      "SYNTHETIC-EO-99-01.pdf",
      "SYNTHETIC%2FEO-99-01.pdf",
      "invalid_value",
    ],
    [
      "PDF query",
      "SYNTHETIC-EO-99-01.pdf",
      "SYNTHETIC-EO-99-01.pdf?download=1",
      "invalid_value",
    ],
    [
      "non-PDF path",
      "SYNTHETIC-EO-99-01.pdf",
      "SYNTHETIC-EO-99-01.txt",
      "invalid_value",
    ],
    [
      "unbound PDF filename",
      "SYNTHETIC-EO-99-01.pdf",
      "SYNTHETIC-EO-88-01.pdf",
      "inconsistent_value",
    ],
    [
      "nonblank discarded edit cell",
      '<td class="views-field views-field-edit-node"></td>',
      '<td class="views-field views-field-edit-node">discard me</td>',
      "unexpected_field",
    ],
  ])("fails closed for %s", (_label, search, replacement, expectedCode) => {
    expect(() => parse(replaceExactly(fixture, search, replacement))).toThrow(
      expect.objectContaining({
        name: "WashingtonGovernorContractError",
        code: expectedCode,
      }),
    );
  });

  it("rejects future-to-build rows", () => {
    expect(() => parse(fixture, "2098-12-31")).toThrow(
      expect.objectContaining({ code: "invalid_value" }),
    );
  });

  it("rejects a pager inside the target view but ignores unrelated shell paging", () => {
    const scoped = replaceExactly(
      fixture,
      '<div class="view-content row">',
      '<nav class="pager"><a href="?page=1">Next</a></nav><div class="view-content row">',
    );
    expect(() => parse(scoped)).toThrow(
      expect.objectContaining({ code: "prohibited_html" }),
    );

    const shellOnly = replaceExactly(
      fixture,
      "<footer>",
      '<nav class="pager"><a href="?page=9">Shell next</a></nav><footer>',
    );
    expect(() => parse(shellOnly)).not.toThrow();
  });

  it("does not discover a target view inside inert template content", () => {
    const viewStart = fixture.indexOf(
      '    <div\n      class="view view-executive-orders',
    );
    const footerStart = fixture.indexOf("    <footer>");
    expect(viewStart).toBeGreaterThan(-1);
    expect(footerStart).toBeGreaterThan(viewStart);
    const inert =
      fixture.slice(0, viewStart) +
      "    <template>\n" +
      fixture.slice(viewStart, footerStart) +
      "    </template>\n" +
      fixture.slice(footerStart);
    expect(() => parse(inert)).toThrow(
      expect.objectContaining({ code: "missing_field" }),
    );
  });

  it("rejects a duplicate compound identity but permits a reused PDF URL for distinct identities", () => {
    let reused = replaceExactly(fixture, ">99-01</td>", ">25-01</td>");
    reused = replaceExactly(reused, "01/02/2099", "01/16/2025");
    reused = replaceExactly(
      reused,
      "SYNTHETIC-EO-99-01.pdf",
      "SYNTHETIC-EO-25-01.pdf",
    );
    const parsed = parse(reused);
    expect(parsed.rows.map(washingtonGovernorSourceRecordId)).toEqual([
      "25-01@2025-01-16",
      "25-01@2025-01-15",
    ]);
    expect(
      new Set(parsed.rows.map(({ officialPdfUrl }) => officialPdfUrl)).size,
    ).toBe(1);

    const duplicate = replaceExactly(reused, "01/16/2025", "01/15/2025");
    expect(() => parse(duplicate)).toThrow(
      expect.objectContaining({ code: "duplicate_value" }),
    );
  });

  it("rejects the zero-row HTTP-200 shape and the 26th row before projection", () => {
    const bodyStart = fixture.indexOf("<tbody>");
    const bodyEnd = fixture.indexOf("</tbody>") + "</tbody>".length;
    expect(bodyStart).toBeGreaterThan(-1);
    expect(bodyEnd).toBeGreaterThan(bodyStart);
    const empty =
      fixture.slice(0, bodyStart) + "<tbody></tbody>" + fixture.slice(bodyEnd);
    expect(() =>
      parse(
        replaceExactly(empty, "Displaying 1 - 2 of 2", "Displaying 1 - 0 of 0"),
      ),
    ).toThrow(expect.objectContaining({ code: "inconsistent_value" }));

    const firstRowStart = fixture.indexOf("<tr>", fixture.indexOf("<tbody>"));
    const firstRowEnd = fixture.indexOf("</tr>", firstRowStart) + 5;
    const row = fixture.slice(firstRowStart, firstRowEnd);
    const overCap =
      fixture.slice(0, bodyStart) +
      `<tbody>${row.repeat(26)}</tbody>` +
      fixture.slice(bodyEnd);
    expect(() =>
      parse(
        replaceExactly(
          overCap,
          "Displaying 1 - 2 of 2",
          "Displaying 1 - 26 of 26",
        ),
      ),
    ).toThrow(expect.objectContaining({ code: "inconsistent_value" }));
  });

  it("accepts exactly the reviewed 25-row boundary", () => {
    const bodyStart = fixture.indexOf("<tbody>");
    const bodyEnd = fixture.indexOf("</tbody>") + "</tbody>".length;
    const firstRowStart = fixture.indexOf("<tr>", bodyStart);
    const firstRowEnd = fixture.indexOf("</tr>", firstRowStart) + 5;
    const secondRowStart = fixture.indexOf("<tr>", firstRowEnd);
    const secondRowEnd = fixture.indexOf("</tr>", secondRowStart) + 5;
    expect(bodyStart).toBeGreaterThan(-1);
    expect(bodyEnd).toBeGreaterThan(bodyStart);
    expect(firstRowStart).toBeGreaterThan(bodyStart);
    expect(secondRowStart).toBeGreaterThan(firstRowEnd);

    const anchorRow = fixture.slice(firstRowStart, firstRowEnd);
    const syntheticTemplate = fixture.slice(secondRowStart, secondRowEnd);
    const syntheticRows = Array.from({ length: 24 }, (_, index) => {
      const ordinal = String(index + 1).padStart(2, "0");
      return syntheticTemplate
        .replaceAll("99-01", `99-${ordinal}`)
        .replace("01/02/2099", `01/${ordinal}/2099`);
    });
    const boundary =
      fixture.slice(0, bodyStart) +
      `<tbody>${anchorRow}${syntheticRows.join("")}</tbody>` +
      fixture.slice(bodyEnd);
    const counted = replaceExactly(
      boundary,
      "Displaying 1 - 2 of 2",
      "Displaying 1 - 25 of 25",
    );
    expect(parse(counted)).toMatchObject({
      displayedTotal: 25,
      rows: expect.arrayContaining([
        expect.objectContaining({
          number: "25-01",
          issuedDate: "2025-01-15",
        }),
        expect.objectContaining({
          number: "99-24",
          issuedDate: "2099-01-24",
        }),
      ]),
    });
  });

  it("enforces parser resource limits and rejects ambiguity inside the target view", () => {
    const oversizedText = replaceExactly(
      fixture,
      "<footer>",
      `<footer>${"x".repeat(
        WASHINGTON_GOVERNOR_HTML_POLICY.maximumTextCodeUnits,
      )}`,
    );
    expect(() => parse(oversizedText)).toThrow(
      expect.objectContaining({ code: "limit_exceeded" }),
    );

    const duplicateHref = replaceExactly(
      fixture,
      'href="/sites/default/files/exe_order/SYNTHETIC-EO-99-01.pdf"',
      'href="/sites/default/files/exe_order/SYNTHETIC-EO-99-01.pdf" href="/sites/default/files/exe_order/SYNTHETIC-EO-99-01.pdf"',
    );
    expect(() => parse(duplicateHref)).toThrow(
      expect.objectContaining({ code: "unexpected_structure" }),
    );
  });

  it("uses stable contract errors without embedding rejected page content", () => {
    try {
      parse(replaceExactly(fixture, ">Number<", ">REJECTED_SENTINEL<"));
      throw new Error("expected the fixture mutation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(WashingtonGovernorContractError);
      expect(String(error)).not.toContain("REJECTED_SENTINEL");
    }
  });
});
