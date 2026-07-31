import { describe, expect, it } from "vitest";
import generalRecordFixture from "../../fixtures/records/general-jurisdiction.valid.json";
import {
  neutralizeSpreadsheetFormula,
  selectedRecordsCsv,
  serializeCsv,
} from "../../src/app/csv";
import { normalizeRecord } from "../../src/app/data";
import type { Nation } from "../../src/app/types";

const nation: Nation = {
  id: "nation:synthetic-a",
  officialName: "Synthetic Nation A",
  aliases: [],
  coveredStateCodes: ["WA"],
};

describe("CSV output", () => {
  it.each(["=1+1", "+cmd", "-2+3", "@SUM(A1)", " \t=hidden"])(
    "neutralizes spreadsheet formula prefix %s",
    (value) => {
      expect(neutralizeSpreadsheetFormula(value)).toBe(`'${value}`);
    },
  );

  it("preserves normal official-source text", () => {
    expect(neutralizeSpreadsheetFormula("Official title")).toBe(
      "Official title",
    );
  });

  it("uses RFC 4180 quoting and CRLF line endings", () => {
    expect(serializeCsv(["title"], [['A "quoted", title']])).toBe(
      '"title"\r\n"A ""quoted"", title"',
    );
  });

  it("exports exact source identity, attribution, URLs, and health without AI", () => {
    const record = normalizeRecord(structuredClone(generalRecordFixture));
    if (!record) throw new Error("Synthetic record fixture did not normalize");
    record.officialTitle = '=HYPERLINK("https://invalid.example")';
    record.aiSummary = {
      exists: true,
      label: "AI-generated source summary",
      text: "AI TEXT MUST NOT ENTER CSV",
      model: "forbidden-export-model",
      citedInputs: [],
    };

    const csv = selectedRecordsCsv([record], nation, () => ({
      basis: "general_jurisdiction",
      label: "General jurisdiction; not Nation-specific",
    }));
    const [header, row] = csv.split("\r\n");

    expect(header).toContain('"source_id"');
    expect(header).toContain('"source_name"');
    expect(header).toContain('"source_attribution"');
    expect(header).toContain('"source_document_id"');
    expect(header).toContain('"official_source"');
    expect(header).toContain('"source_health_data_as_of"');
    expect(header).toContain('"source_last_successful_retrieval_at"');
    expect(header).toContain('"using_last_known_good"');
    expect(header).toContain('"source_health_message"');
    expect(row).toContain(`"${record.source.id}"`);
    expect(row).toContain(`"${record.source.name}"`);
    expect(row).toContain(`"${record.source.attribution}"`);
    expect(row).toContain(`"${record.sourceDocumentIdentifier}"`);
    expect(row).toContain(`"${record.urls.officialSource}"`);
    expect(row).toContain(`"${record.sourceHealth.dataAsOf}"`);
    expect(row).toContain('"\'=HYPERLINK(""https://invalid.example"")"');
    expect(row).toContain('"[""Synthetic Public Agency""]"');
    expect(csv).not.toContain("AI TEXT MUST NOT ENTER CSV");
    expect(csv).not.toContain("forbidden-export-model");
  });
});
