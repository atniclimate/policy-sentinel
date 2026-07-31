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
    "source_id",
    "source_name",
    "source_attribution",
    "source_document_id",
    "official_title",
    "document_type",
    "jurisdiction",
    "issuing_body",
    "adjudicating_body",
    "docket_numbers",
    "citations",
    "citation_links",
    "decision_date",
    "judicial_document_form_normalized",
    "judicial_document_form_source_label",
    "judicial_publication_status_normalized",
    "judicial_publication_status_source_label",
    "judicial_publication_status_as_of",
    "judicial_revision_review_state",
    "judicial_revision_reviewed_on",
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
    "official_text_reproduction_basis",
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
    "source_health_data_as_of",
    "source_last_successful_retrieval_at",
    "using_last_known_good",
    "source_health_message",
    "urgent_source_label",
    "urgent_source_date",
  ];

  const rows = records.map((record) => {
    const why = whyShownForRecord(record);
    return [
      record.internalId,
      record.source.id,
      record.source.name,
      record.source.attribution ?? "",
      record.sourceDocumentIdentifier,
      record.officialTitle,
      record.documentType,
      `${record.jurisdiction.name} (${record.jurisdiction.level})`,
      record.issuingBodies,
      record.judicialContext?.adjudicatingBody.officialName ?? "",
      record.judicialContext?.docketNumbers ?? [],
      record.judicialContext?.citations.map(({ value }) => value) ?? [],
      record.judicialContext?.citations.map(({ sourceUrl }) => sourceUrl) ?? [],
      record.judicialContext?.decisionDate ?? "",
      record.judicialContext?.documentForm.normalized ?? "",
      record.judicialContext?.documentForm.sourceLabel ?? "",
      record.judicialContext?.publicationStatus.normalized ?? "",
      record.judicialContext?.publicationStatus.sourceLabel ?? "",
      record.judicialContext?.publicationStatus.asOf ?? "",
      record.judicialContext?.revisionReview.state ?? "",
      record.judicialContext?.revisionReview.reviewedOn ?? "",
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
      record.texts.detailReproductionBasis ?? "",
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
      record.sourceHealth.dataAsOf,
      record.sourceHealth.lastSuccessfulRetrievalAt,
      record.sourceHealth.usingLastKnownGood,
      record.sourceHealth.message ?? "",
      record.change.urgentAlert?.label ?? "",
      record.change.urgentAlert?.date ?? "",
    ];
  });

  return serializeCsv(columns, rows);
};
