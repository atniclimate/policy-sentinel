import type {
  Nation,
  PublicRecord,
  RelevanceBasis,
  SearchCriteria,
  WhyShown,
} from "./types";

export const recordEventDate = (record: PublicRecord): string | null =>
  record.judicialContext?.decisionDate ??
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

export const recordMatchesPolicy = (
  record: PublicRecord,
  criteria: SearchCriteria,
): boolean => {
  if (criteria.allPolicyAreas) return true;
  if (criteria.categoryIds.length === 0) return false;

  return criteria.categoryIds.some((categoryId) => {
    const memberships = record.taxonomyMemberships.filter(
      (membership) => membership.categoryId === categoryId,
    );
    if (memberships.length === 0) return false;
    const selectedSubcategories = criteria.subcategoryIds[categoryId] ?? [];
    if (selectedSubcategories.length === 0) return true;
    return memberships.some(
      (membership) =>
        membership.subcategoryId !== null &&
        selectedSubcategories.includes(membership.subcategoryId),
    );
  });
};

const includesInsensitive = (value: string, query: string): boolean =>
  value.toLocaleLowerCase().includes(query.toLocaleLowerCase());

const matchesList = (value: string, selected: string[]): boolean =>
  selected.length === 0 || selected.includes(value);

export const filterRecords = (
  records: PublicRecord[],
  nation: Nation,
  criteria: SearchCriteria,
  unclassifiedOnly = false,
  landmarkOnly = false,
): PublicRecord[] => {
  const query = criteria.query.trim().toLocaleLowerCase();

  const matches = records.filter((record) => {
    if (!recordAvailableForNation(record, nation)) return false;
    if (unclassifiedOnly && !record.isUnclassified) return false;
    if (landmarkOnly && !record.landmark.isLandmark) return false;
    if (
      !unclassifiedOnly &&
      !landmarkOnly &&
      !recordMatchesPolicy(record, criteria)
    ) {
      return false;
    }
    if (query && !record.searchText.includes(query)) return false;

    const whyShown = whyShownFor(record, nation.id);
    const eventDate = recordEventDate(record);
    if (
      !matchesList(record.jurisdiction.name, criteria.jurisdictions) ||
      !matchesList(record.documentType, criteria.documentTypes) ||
      !matchesList(record.status.normalized, criteria.statuses) ||
      !matchesList(record.source.id, criteria.sources) ||
      !matchesList(whyShown.basis, criteria.relevanceBases)
    ) {
      return false;
    }
    if (criteria.dateFrom && (!eventDate || eventDate < criteria.dateFrom)) {
      return false;
    }
    if (
      criteria.dateThrough &&
      (!eventDate || eventDate.slice(0, 10) > criteria.dateThrough)
    ) {
      return false;
    }
    return true;
  });

  return matches.sort((a, b) => {
    if (criteria.sort === "title") {
      return a.officialTitle.localeCompare(b.officialTitle);
    }
    const aDate = recordEventDate(a) ?? "";
    const bDate = recordEventDate(b) ?? "";
    if (criteria.sort === "event-asc") {
      return (
        aDate.localeCompare(bDate) || a.internalId.localeCompare(b.internalId)
      );
    }
    return (
      bDate.localeCompare(aDate) || a.internalId.localeCompare(b.internalId)
    );
  });
};

export const uniqueValues = (
  records: PublicRecord[],
  selector: (record: PublicRecord) => string,
): string[] => [
  ...new Set(
    records
      .map(selector)
      .filter((value) => value.length > 0)
      .sort((a, b) => a.localeCompare(b)),
  ),
];

export const relevanceLabel = (basis: RelevanceBasis): string => {
  switch (basis) {
    case "explicit_nation_reference":
      return "Explicit Nation reference";
    case "general_jurisdiction":
      return "General jurisdiction";
    case "landmark":
      return "Landmark";
    case "source_defined":
      return "Other explicit source basis";
  }
};

export const nationMatchesInput = (nation: Nation, input: string): boolean => {
  const query = input.trim().toLocaleLowerCase();
  if (!query) return true;
  return [nation.officialName, ...nation.aliases].some((name) =>
    includesInsensitive(name, query),
  );
};
