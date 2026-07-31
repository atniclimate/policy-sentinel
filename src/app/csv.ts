import type { Nation, PublicRecord, WhyShown } from "./types";

export const neutralizeSpreadsheetFormula = (value: string): string =>
  /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;

const csvCell = (value: unknown): string => {
  const plain =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
  return `"${neutralizeSpreadsheetFormula(plain).replaceAll('"', '""')}"`;
};

export const serializeCsv = (columns: string[], rows: unknown[][]): string =>
  [
    columns.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");

export const selectedRecordsCsv = (
  records: PublicRecord[],
  nation: Nation,
  whyShownForRecord: (record: PublicRecord) => WhyShown,
): string => {
  const columns = [
    "stable_id",
    "source_document_id",
    "official_title",
    "document_type",
    "jurisdiction",
    "issuing_body",
    "normalized_status",
    "source_status",
    "introduced_date",
    "published_date",
    "updated_date",
    "last_action_date",
    "deadline",
    "effective_date",
    "official_source",
    "official_full_text",
    "official_summary_or_excerpt",
    "official_subjects",
    "mapped_categories",
    "relevance_basis",
    "why_shown",
    "selected_nation",
    "exact_nation_evidence",
    "evidence_url",
    "retrieved_at",
    "data_quality_state",
    "source_health",
    "urgent_source_label",
    "urgent_source_date",
  ];

  const rows = records.map((record) => {
    const why = whyShownForRecord(record);
    return [
      record.internalId,
      record.sourceDocumentIdentifier,
      record.officialTitle,
      record.documentType,
      `${record.jurisdiction.name} (${record.jurisdiction.level})`,
      record.issuingBodies,
      record.status.normalized,
      record.status.sourceLabel,
      record.dates.introduced,
      record.dates.published,
      record.dates.updated,
      record.dates.lastAction,
      record.dates.deadline,
      record.dates.effective,
      record.urls.officialSource,
      record.urls.officialFullText,
      record.texts.officialSummary?.text ??
        record.texts.sourceExcerpt?.text ??
        "",
      record.officialSubjects,
      record.taxonomyMemberships.map((membership) => ({
        category: membership.categoryId,
        subcategory: membership.subcategoryId,
      })),
      why.basis,
      why.label,
      nation.officialName,
      why.evidence ?? "",
      why.evidenceUrl ?? "",
      record.dates.retrieved,
      record.dataQuality.state,
      record.sourceHealth.status,
      record.change.urgentAlert?.label ?? "",
      record.change.urgentAlert?.date ?? "",
    ];
  });

  return serializeCsv(columns, rows);
};
