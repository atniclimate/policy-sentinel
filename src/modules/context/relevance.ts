import type {
  Nation,
  PublicRecord,
  WhyShown,
} from "../../core/public-app-types";

export const recordEventDate = (record: PublicRecord): string | null =>
  record.judicialContext?.decisionDate ??
  record.accordContext?.executionEvent.date ??
  record.dates.updated ??
  record.dates.published ??
  record.dates.lastAction ??
  record.dates.introduced ??
  record.dates.effective;

export const whyShownFor = (
  record: PublicRecord,
  nationId: string,
): WhyShown => {
  const association = record.nationAssociations.find(
    (item) => item.nationId === nationId && item.validationState !== "rejected",
  );
  if (association) {
    return {
      basis: "explicit_nation_reference",
      label: "Explicit Nation reference",
      evidence: association.evidenceText,
      evidenceUrl: association.evidenceUrl,
    };
  }
  if (record.nationIds.includes(nationId)) {
    const explicit = record.relevance.find(
      (entry) => entry.basis === "explicit_nation_reference",
    );
    return {
      basis: "explicit_nation_reference",
      label: "Explicit Nation reference",
      evidence: explicit?.evidence,
      evidenceUrl: explicit?.sourceUrl,
    };
  }
  if (record.landmark.isLandmark) {
    const officialEvidence = record.landmark.officialEvidence[0];
    return {
      basis: "landmark",
      label: "Verified landmark; not Nation-specific",
      evidence: officialEvidence?.text ?? officialEvidence?.sourceLabel,
      evidenceUrl: officialEvidence?.sourceUrl,
    };
  }
  return {
    basis: "general_jurisdiction",
    label: "General jurisdiction; not Nation-specific",
  };
};

export const recordAvailableForNation = (
  record: PublicRecord,
  nation: Nation,
): boolean => {
  const level = record.jurisdiction.level.toLocaleLowerCase();
  const hasExplicitAssociation =
    record.nationIds.includes(nation.id) ||
    record.nationAssociations.some(
      (association) =>
        association.nationId === nation.id &&
        association.validationState !== "rejected",
    );

  if (level === "county" || level === "tribal") {
    return hasExplicitAssociation;
  }
  if (level === "federal") {
    return true;
  }
  if (level === "state") {
    return (
      record.jurisdiction.stateCode !== null &&
      nation.coveredStateCodes.includes(record.jurisdiction.stateCode)
    );
  }
  return hasExplicitAssociation;
};
