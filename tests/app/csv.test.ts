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

  it("exports bounded judicial metadata and its exact citation link", () => {
    const record = normalizeRecord(structuredClone(generalRecordFixture));
    if (!record) throw new Error("Synthetic record fixture did not normalize");
    record.documentType = "court_decision";
    record.texts.detailReproductionBasis =
      "The citation link opens the complete bound volume.";
    record.judicialContext = {
      adjudicatingBody: {
        kind: "court",
        sourceId: null,
        officialName: "Synthetic Supreme Court",
      },
      docketNumbers: ["SYN-DOCKET"],
      citations: [
        {
          kind: "reporter",
          value: "999 U.S. 1",
          sourceUrl: "https://official.example.invalid/opinions/999.pdf#page=1",
        },
      ],
      decisionDate: "2019-03-19",
      documentForm: {
        normalized: "opinion",
        sourceLabel: "Opinions of the Court",
      },
      publicationStatus: {
        normalized: "bound_volume",
        sourceLabel: "U.S. Reports, Volume 999",
        asOf: "2026-07-31",
      },
      revisionReview: {
        state: "no_separate_relationship_exposed",
        reviewedOn: "2026-07-31",
      },
    };

    const csv = selectedRecordsCsv([record], nation, () => ({
      basis: "general_jurisdiction",
      label: "General jurisdiction; not Nation-specific",
    }));
    const [header, row] = csv.split("\r\n");
    expect(header).toContain('"adjudicating_body"');
    expect(header).toContain('"docket_numbers"');
    expect(header).toContain('"citations"');
    expect(header).toContain('"citation_links"');
    expect(header).toContain('"decision_date"');
    expect(header).toContain('"judicial_document_form_normalized"');
    expect(header).toContain('"judicial_document_form_source_label"');
    expect(header).toContain('"judicial_publication_status_normalized"');
    expect(header).toContain('"judicial_publication_status_source_label"');
    expect(header).toContain('"judicial_publication_status_as_of"');
    expect(header).toContain('"judicial_revision_review_state"');
    expect(header).toContain('"judicial_revision_reviewed_on"');
    expect(header).toContain('"official_text_reproduction_basis"');
    expect(row).toContain('"Synthetic Supreme Court"');
    expect(row).toContain('"[""SYN-DOCKET""]"');
    expect(row).toContain('"[""999 U.S. 1""]"');
    expect(row).toContain(
      '"[""https://official.example.invalid/opinions/999.pdf#page=1""]"',
    );
    expect(row).toContain('"2019-03-19"');
    expect(row).toContain('"opinion"');
    expect(row).toContain('"bound_volume"');
    expect(row).toContain('"2026-07-31"');
    expect(row).toContain('"no_separate_relationship_exposed"');
    expect(row).toContain(
      '"The citation link opens the complete bound volume."',
    );
  });
});
