import type { PublicRecord, SearchCriteria, Taxonomy } from "./types";

export const humanize = (value: string): string =>
  value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const hasTime = value.includes("T");
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(hasTime
      ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" }
      : { timeZone: "UTC" }),
  }).format(date);
};

export const updatedDate = (
  record: PublicRecord,
): { label: string; value: string | null } => {
  if (record.judicialContext) {
    return {
      label: "Decided",
      value: record.judicialContext.decisionDate,
    };
  }
  if (record.accordContext) {
    return {
      label:
        record.accordContext.executionEvent.role === "executed"
          ? "Executed"
          : "Signed",
      value: record.accordContext.executionEvent.date,
    };
  }
  if (record.dates.updated) {
    return { label: "Source updated", value: record.dates.updated };
  }
  if (record.dates.lastAction) {
    return { label: "Last action", value: record.dates.lastAction };
  }
  if (record.dates.published) {
    return { label: "Published", value: record.dates.published };
  }
  return { label: "Retrieved", value: record.dates.retrieved };
};

export const criteriaPolicySummary = (
  criteria: SearchCriteria,
  taxonomy: Taxonomy,
): string => {
  if (criteria.allPolicyAreas) return "All policy areas";
  return criteria.categoryIds
    .map((categoryId) => {
      const category = taxonomy.categories.find(
        (candidate) => candidate.id === categoryId,
      );
      if (!category) return categoryId;
      const selectedSubcategories = criteria.subcategoryIds[categoryId] ?? [];
      if (selectedSubcategories.length === 0) return category.label;
      return `${category.label}: ${selectedSubcategories
        .map(
          (subcategoryId) =>
            category.subcategories.find(
              (subcategory) => subcategory.id === subcategoryId,
            )?.label ?? subcategoryId,
        )
        .join("; ")}`;
    })
    .join(" | ");
};

export const exactCriteriaSummary = (
  criteria: SearchCriteria,
  taxonomy: Taxonomy,
): string => {
  const parts = [criteriaPolicySummary(criteria, taxonomy)];
  if (criteria.query) parts.push(`Search: “${criteria.query}”`);
  if (criteria.jurisdictions.length)
    parts.push(`Jurisdictions: ${criteria.jurisdictions.join(", ")}`);
  if (criteria.documentTypes.length)
    parts.push(`Document types: ${criteria.documentTypes.join(", ")}`);
  if (criteria.statuses.length)
    parts.push(`Statuses: ${criteria.statuses.join(", ")}`);
  if (criteria.sources.length)
    parts.push(`Sources: ${criteria.sources.join(", ")}`);
  if (criteria.relevanceBases.length)
    parts.push(`Relevance: ${criteria.relevanceBases.join(", ")}`);
  if (criteria.dateFrom) parts.push(`Date from: ${criteria.dateFrom}`);
  if (criteria.dateThrough) parts.push(`Date through: ${criteria.dateThrough}`);
  return parts.join(" · ");
};

export const healthTone = (
  status: string,
): "good" | "warning" | "danger" | "neutral" => {
  const normalized = status.toLocaleLowerCase();
  if (["healthy", "current", "available"].includes(normalized)) return "good";
  if (
    ["degraded", "delayed", "limited", "range-limited", "stale"].includes(
      normalized,
    )
  )
    return "warning";
  if (["unavailable", "failed", "error"].includes(normalized)) return "danger";
  return "neutral";
};
