import type {
  ArtifactBundle,
  ArtifactManifest,
  CoverageEntry,
  HistoryEvent,
  Nation,
  NationAssociation,
  PublicRecord,
  Relevance,
  SourceDocumentRelationship,
  SourceHealthEntry,
  SourceText,
  Taxonomy,
  TaxonomyMembership,
} from "./types";

type JsonObject = Record<string, unknown>;

const objectValue = (value: unknown): JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const stringValue = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const nullableString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const booleanValue = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const stringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((item) => {
          if (typeof item === "string") return item;
          const object = objectValue(item);
          return stringValue(
            object.officialName ??
              object.name ??
              object.label ??
              object.value ??
              object.sourceLabel,
          );
        })
        .filter(Boolean)
    : [];

const arrayPayload = (payload: unknown, keys: string[]): unknown[] => {
  if (Array.isArray(payload)) return payload;
  const object = objectValue(payload);
  for (const key of keys) {
    if (Array.isArray(object[key])) return object[key] as unknown[];
  }
  return [];
};

const assetUrl = (path: string): string =>
  new URL(path, document.baseURI).toString();

const fetchJson = async (path: string): Promise<unknown> => {
  const response = await fetch(assetUrl(path), {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return response.json() as Promise<unknown>;
};

const normalizeNation = (value: unknown): Nation | null => {
  const item = objectValue(value);
  const coverage = objectValue(item.coverage);
  const stateCoverage = objectValue(item.stateCoverage);
  const id = stringValue(item.id ?? item.internalId ?? item.nationId);
  const officialName = stringValue(
    item.officialName ?? item.official_name ?? item.name ?? item.label,
  );
  if (!id || !officialName) return null;

  const aliases = stringArray(
    item.authorizedAliases ?? item.authorized_aliases ?? item.aliases,
  );
  const coveredStateCodes = [
    ...stringArray(
      item.coveredStateCodes ??
        item.stateCodes ??
        item.states ??
        coverage.coveredStateCodes ??
        coverage.stateCodes ??
        coverage.states ??
        stateCoverage.states,
    ),
  ]
    .map((state) => state.toUpperCase())
    .filter((state) => ["WA", "OR", "ID"].includes(state));

  return {
    id,
    officialName,
    aliases: [...new Set(aliases.filter((alias) => alias !== officialName))],
    coveredStateCodes: [...new Set(coveredStateCodes)],
  };
};

const normalizeSourceText = (value: unknown): SourceText | null => {
  if (typeof value === "string" && value.length > 0) return { text: value };
  const item = objectValue(value);
  const text = stringValue(item.text ?? item.value);
  if (!text) return null;
  return {
    text,
    sourceUrl: nullableString(item.sourceUrl ?? item.url) ?? undefined,
    sourceDate: nullableString(item.sourceDate ?? item.date),
    reproductionBasis:
      nullableString(item.reproductionBasis ?? item.reuseBasis) ?? undefined,
  };
};

const normalizeHistory = (value: unknown): HistoryEvent[] => {
  const events: HistoryEvent[] = [];
  if (!Array.isArray(value)) return events;
  for (const event of value) {
    const item = objectValue(event);
    const sourceLabel = stringValue(
      item.sourceLabel ?? item.label ?? item.action,
    );
    if (!sourceLabel) continue;
    events.push({
      date: nullableString(item.date),
      sourceLabel,
      sourceUrl: nullableString(item.sourceUrl ?? item.url) ?? undefined,
    });
  }
  return events;
};

const normalizeSourceDocumentRelationships = (
  value: unknown,
): SourceDocumentRelationship[] => {
  const relationships: SourceDocumentRelationship[] = [];
  if (!Array.isArray(value)) return relationships;

  for (const relationship of value) {
    const item = objectValue(relationship);
    const relationshipType = stringValue(item.relationshipType);
    if (
      relationshipType !== "corrects" &&
      relationshipType !== "corrected_by" &&
      relationshipType !== "related_document"
    ) {
      continue;
    }
    const targetSourceRecordId = stringValue(item.targetSourceRecordId);
    const targetUrl = stringValue(item.targetUrl);
    const sourceLabel = stringValue(item.sourceLabel);
    if (!targetSourceRecordId || !targetUrl || !sourceLabel) continue;

    relationships.push({
      relationshipType,
      targetSourceRecordId,
      targetUrl,
      sourceLabel,
    });
  }
  return relationships;
};

const normalizeMemberships = (value: unknown): TaxonomyMembership[] =>
  Array.isArray(value)
    ? value
        .map((membership) => {
          const item = objectValue(membership);
          const categoryId = stringValue(item.categoryId ?? item.category);
          if (!categoryId) return null;
          return {
            categoryId,
            subcategoryId: nullableString(
              item.subcategoryId ?? item.subcategory,
            ),
            officialSubjectLabels: stringArray(item.officialSubjectLabels),
          };
        })
        .filter(
          (membership): membership is TaxonomyMembership => membership !== null,
        )
    : [];

const normalizeRelevance = (value: unknown): Relevance[] => {
  const entries: Relevance[] = [];
  if (!Array.isArray(value)) return entries;
  for (const entry of value) {
    const item = objectValue(entry);
    const basis = stringValue(item.basis);
    if (
      ![
        "explicit_nation_reference",
        "general_jurisdiction",
        "landmark",
        "source_defined",
      ].includes(basis)
    ) {
      continue;
    }
    entries.push({
      basis: basis as Relevance["basis"],
      label: stringValue(item.label, basis.replaceAll("_", " ")),
      sourceUrl: nullableString(item.sourceUrl) ?? undefined,
      evidence: nullableString(item.evidence) ?? undefined,
    });
  }
  return entries;
};

const normalizeAssociations = (value: unknown): NationAssociation[] => {
  const associations: NationAssociation[] = [];
  if (!Array.isArray(value)) return associations;
  for (const entry of value) {
    const item = objectValue(entry);
    const nationId = stringValue(item.nationId);
    const officialNationName = stringValue(item.officialNationName);
    const evidenceText = stringValue(item.evidenceText);
    const evidenceUrl = stringValue(item.evidenceUrl);
    if (!nationId || !officialNationName || !evidenceText || !evidenceUrl) {
      continue;
    }
    associations.push({
      nationId,
      officialNationName,
      basis: stringValue(item.basis),
      evidenceText,
      evidenceUrl,
      evidenceLocation: nullableString(item.evidenceLocation) ?? undefined,
      validationState: nullableString(item.validationState) ?? undefined,
    });
  }
  return associations;
};

export const normalizeRecord = (value: unknown): PublicRecord | null => {
  const item = objectValue(value);
  const source = objectValue(item.source);
  const sourceCoverage = objectValue(source.coverage);
  const jurisdiction = objectValue(item.jurisdiction);
  const status = objectValue(item.status);
  const dates = objectValue(item.dates);
  const urls = objectValue(item.urls);
  const texts = objectValue(item.texts);
  const detailAsset = objectValue(texts.detailAsset);
  const landmark = objectValue(item.landmark);
  const historical = objectValue(item.historical);
  const dataQuality = objectValue(item.dataQuality);
  const sourceHealth = objectValue(item.sourceHealth);
  const change = objectValue(item.change);
  const urgent = objectValue(change.urgentAlert);
  const ai = objectValue(item.aiSummary);
  const taxonomyMemberships = normalizeMemberships(item.taxonomyMemberships);

  const internalId = stringValue(item.internalId ?? item.stableId ?? item.id);
  const officialTitle = stringValue(
    item.officialTitle ?? item.title ?? item.official_title,
  );
  if (!internalId || !officialTitle) return null;

  const officialSummary = normalizeSourceText(
    texts.officialSummary ?? item.officialSummary,
  );
  const sourceExcerpt = normalizeSourceText(
    texts.sourceExcerpt ?? item.sourceExcerpt,
  );
  const officialLanguage = normalizeSourceText(
    texts.officialLanguage ?? item.officialLanguage,
  );

  const record: PublicRecord = {
    internalId,
    officialTitle,
    sourceDocumentIdentifier: stringValue(
      item.sourceDocumentIdentifier ??
        item.sourceId ??
        source.recordId ??
        internalId,
    ),
    documentType: stringValue(
      item.documentType ?? item.type,
      "other_official_record",
    ),
    source: {
      id: stringValue(source.id ?? item.sourceKey, "unknown-source"),
      name: stringValue(
        source.name ?? item.sourceName,
        "Official source not named",
      ),
      provider:
        nullableString(source.provider ?? item.sourceProvider) ?? undefined,
      attribution: nullableString(source.attribution) ?? undefined,
      coverageFrom: nullableString(sourceCoverage.from),
      coverageThrough: nullableString(sourceCoverage.through),
      coverageNotes: nullableString(sourceCoverage.notes) ?? undefined,
    },
    jurisdiction: {
      level: stringValue(
        jurisdiction.level ?? item.jurisdictionLevel,
        "unknown",
      ),
      name: stringValue(
        jurisdiction.name ?? item.jurisdictionName,
        "Jurisdiction not named",
      ),
      stateCode:
        nullableString(
          jurisdiction.stateCode ?? item.stateCode,
        )?.toUpperCase() ?? null,
    },
    issuingBodies: stringArray(item.issuingBodies),
    status: {
      normalized: stringValue(
        status.normalized ?? item.normalizedStatus,
        "unknown",
      ),
      sourceLabel: stringValue(
        status.sourceLabel ?? item.sourceStatus,
        "Not provided",
      ),
      asOf: nullableString(status.asOf ?? item.statusAsOf),
    },
    dates: {
      introduced: nullableString(dates.introduced ?? item.introducedDate),
      published: nullableString(dates.published ?? item.publishedDate),
      updated: nullableString(dates.updated ?? item.updatedDate),
      lastAction: nullableString(dates.lastAction ?? item.lastActionDate),
      deadline: nullableString(dates.deadline ?? item.deadlineDate),
      effective: nullableString(dates.effective ?? item.effectiveDate),
      retrieved: nullableString(dates.retrieved ?? item.retrievedAt),
    },
    urls: {
      officialSource: stringValue(
        urls.officialSource ?? item.officialSourceUrl,
      ),
      officialFullText: nullableString(
        urls.officialFullText ?? item.officialFullTextUrl,
      ),
    },
    texts: {
      officialSummary,
      sourceExcerpt,
      officialLanguage,
      detailPath: (() => {
        const path = nullableString(
          detailAsset.path ?? item.detailPath ?? item.detailAssetPath,
        );
        if (!path) return null;
        return path.startsWith("data/") ? path : `data/${path}`;
      })(),
    },
    sponsors: stringArray(item.sponsors),
    committees: stringArray(item.committees),
    actionHistory: normalizeHistory(item.actionHistory),
    statusHistory: normalizeHistory(item.statusHistory),
    sourceDocumentRelationships: normalizeSourceDocumentRelationships(
      item.sourceDocumentRelationships,
    ),
    officialSubjects: stringArray(item.officialSubjects),
    taxonomyMemberships,
    isUnclassified:
      taxonomyMemberships.length === 0
        ? true
        : booleanValue(item.isUnclassified, false),
    relevance: normalizeRelevance(item.relevance),
    nationIds: [
      ...new Set([
        ...stringArray(item.nationIds),
        ...normalizeAssociations(item.nationAssociations).map(
          (association) => association.nationId,
        ),
      ]),
    ],
    nationAssociations: normalizeAssociations(item.nationAssociations),
    landmark: {
      isLandmark: booleanValue(landmark.isLandmark ?? item.isLandmark, false),
      criterionCodes: stringArray(landmark.criterionCodes),
      officialEvidence: Array.isArray(landmark.officialEvidence)
        ? landmark.officialEvidence
            .map(normalizeSourceText)
            .filter((text): text is SourceText => text !== null)
        : [],
    },
    historical: {
      isHistorical: booleanValue(
        historical.isHistorical ?? item.isHistorical,
        false,
      ),
      pre1980Treatment:
        nullableString(historical.pre1980Treatment) ?? undefined,
    },
    dataQuality: {
      state: stringValue(dataQuality.state, "unknown"),
      validatedAt: nullableString(dataQuality.validatedAt) ?? undefined,
      issues: stringArray(dataQuality.issues),
    },
    sourceHealth: {
      status: stringValue(sourceHealth.status, "unknown"),
      dataAsOf: nullableString(sourceHealth.dataAsOf),
      lastSuccessfulRetrievalAt: nullableString(
        sourceHealth.lastSuccessfulRetrievalAt,
      ),
      usingLastKnownGood: booleanValue(sourceHealth.usingLastKnownGood, false),
      message: nullableString(sourceHealth.message),
    },
    change: {
      kind: stringValue(change.kind, "unchanged"),
      firstSeenAt: nullableString(change.firstSeenAt) ?? undefined,
      urgentAlert:
        Object.keys(urgent).length > 0
          ? {
              basis: stringValue(urgent.basis, "source_status"),
              label: stringValue(urgent.label, "Source alert"),
              date: nullableString(urgent.date),
            }
          : null,
    },
    aiSummary: booleanValue(ai.exists, false)
      ? {
          exists: true,
          label: stringValue(ai.label, "AI-generated source summary"),
          text: stringValue(ai.text),
          generatedAt: nullableString(ai.generatedAt) ?? undefined,
          model: nullableString(ai.model) ?? undefined,
          buildId: nullableString(ai.buildId) ?? undefined,
          validationState: nullableString(ai.validationState) ?? undefined,
          citedInputs: Array.isArray(ai.citedInputs)
            ? ai.citedInputs.map((input) => {
                const citation = objectValue(input);
                return {
                  field: nullableString(citation.field) ?? undefined,
                  sourceUrl: nullableString(citation.sourceUrl) ?? undefined,
                  sourceDate: nullableString(citation.sourceDate),
                };
              })
            : [],
        }
      : {
          exists: false,
          label: stringValue(ai.label, "AI-generated source summary"),
        },
    fieldProvenance: Array.isArray(item.fieldProvenance)
      ? item.fieldProvenance.map((entry) => {
          const provenance = objectValue(entry);
          return {
            field: stringValue(provenance.field),
            sourceUrl: nullableString(provenance.sourceUrl) ?? undefined,
            retrievedAt: nullableString(provenance.retrievedAt) ?? undefined,
            sourceUpdatedAt: nullableString(provenance.sourceUpdatedAt),
            validationState:
              nullableString(provenance.validationState) ?? undefined,
          };
        })
      : [],
    searchText: "",
  };

  record.searchText = [
    stringValue(item.searchText ?? item.officialSearchText),
    record.officialTitle,
    record.source.name,
    record.source.provider,
    record.texts.officialSummary?.text,
    record.texts.sourceExcerpt?.text,
    record.texts.officialLanguage?.text,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();

  return record;
};

const normalizeManifest = (payload: unknown): ArtifactManifest => {
  const item = objectValue(payload);
  const statistics = objectValue(item.statistics);
  return {
    buildId: stringValue(item.buildId ?? item.version, "unknown-build"),
    generatedAt: nullableString(item.generatedAt ?? item.builtAt),
    dataAsOf: nullableString(item.dataAsOf ?? item.data_as_of),
    recordCount:
      typeof item.recordCount === "number"
        ? item.recordCount
        : typeof statistics.recordCount === "number"
          ? statistics.recordCount
          : null,
    synthetic: booleanValue(
      item.synthetic ?? item.syntheticData ?? item.fixtureOnly,
      false,
    ),
  };
};

const normalizeTaxonomy = (payload: unknown): Taxonomy => {
  const item = objectValue(payload);
  return {
    version: stringValue(item.taxonomyVersion ?? item.version, "unknown"),
    categories: arrayPayload(payload, ["categories"])
      .map((category) => {
        const entry = objectValue(category);
        const id = stringValue(entry.id);
        const label = stringValue(entry.label ?? entry.name);
        if (!id || !label) return null;
        return {
          id,
          label,
          subcategories: arrayPayload(entry.subcategories, ["items"])
            .map((subcategory) => {
              const child = objectValue(subcategory);
              const childId = stringValue(child.id);
              const childLabel = stringValue(child.label ?? child.name);
              if (!childId || !childLabel) return null;
              return {
                id: childId,
                label: childLabel,
                description: stringValue(child.description),
              };
            })
            .filter(
              (
                child,
              ): child is {
                id: string;
                label: string;
                description: string;
              } => child !== null,
            ),
        };
      })
      .filter(
        (
          category,
        ): category is {
          id: string;
          label: string;
          subcategories: Array<{
            id: string;
            label: string;
            description: string;
          }>;
        } => category !== null,
      ),
  };
};

const normalizeCoverage = (payload: unknown): CoverageEntry[] =>
  arrayPayload(payload, ["entries", "sources", "coverage", "items"]).map(
    (entry) => {
      const item = objectValue(entry);
      const dateRange = objectValue(item.dateRange ?? item.historicalRange);
      const jurisdiction = objectValue(item.jurisdiction);
      return {
        sourceId: stringValue(item.sourceId ?? item.id, "unknown-source"),
        sourceName: stringValue(
          item.sourceName ?? item.name,
          humanizeSourceId(
            stringValue(item.sourceId ?? item.id, "unknown-source"),
          ),
        ),
        jurisdictions: stringArray(
          item.jurisdictions ?? item.coveredJurisdictions,
        ).concat(
          stringValue(jurisdiction.name)
            ? [stringValue(jurisdiction.name)]
            : [],
        ),
        dateFrom: nullableString(item.dateFrom ?? item.from ?? dateRange.from),
        dateThrough: nullableString(
          item.dateThrough ?? item.through ?? dateRange.through,
        ),
        status: stringValue(item.status, "range-limited"),
        notes: stringValue(item.notes ?? item.limitations ?? item.limitation),
      };
    },
  );

const humanizeSourceId = (value: string): string =>
  value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const normalizeHealth = (payload: unknown): SourceHealthEntry[] =>
  arrayPayload(payload, ["sources", "health", "items"]).map((entry) => {
    const item = objectValue(entry);
    return {
      sourceId: stringValue(item.sourceId ?? item.id, "unknown-source"),
      sourceName: stringValue(
        item.sourceName ?? item.name,
        humanizeSourceId(
          stringValue(item.sourceId ?? item.id, "unknown-source"),
        ),
      ),
      status: stringValue(item.status, "unknown"),
      dataAsOf: nullableString(item.dataAsOf),
      lastSuccessfulRetrievalAt: nullableString(
        item.lastSuccessfulRetrievalAt ?? item.lastSuccess,
      ),
      usingLastKnownGood: booleanValue(item.usingLastKnownGood, false),
      message: nullableString(item.message),
    };
  });

const fallbackCoverage = (records: PublicRecord[]): CoverageEntry[] => {
  const bySource = new Map<string, CoverageEntry>();
  for (const record of records) {
    if (!bySource.has(record.source.id)) {
      bySource.set(record.source.id, {
        sourceId: record.source.id,
        sourceName: record.source.name,
        jurisdictions: [record.jurisdiction.name],
        dateFrom: record.source.coverageFrom ?? null,
        dateThrough: record.source.coverageThrough ?? null,
        status: "range-limited",
        notes:
          record.source.coverageNotes ??
          "Coverage is limited to the records in this artifact.",
      });
    } else {
      const current = bySource.get(record.source.id);
      if (
        current &&
        !current.jurisdictions.includes(record.jurisdiction.name)
      ) {
        current.jurisdictions.push(record.jurisdiction.name);
      }
    }
  }
  return [...bySource.values()];
};

const fallbackHealth = (records: PublicRecord[]): SourceHealthEntry[] => {
  const bySource = new Map<string, SourceHealthEntry>();
  for (const record of records) {
    if (!bySource.has(record.source.id)) {
      bySource.set(record.source.id, {
        sourceId: record.source.id,
        sourceName: record.source.name,
        ...record.sourceHealth,
      });
    }
  }
  return [...bySource.values()];
};

export const loadArtifacts = async (): Promise<ArtifactBundle> => {
  const paths = [
    "data/manifest.json",
    "data/coverage.json",
    "data/source-health.json",
    "data/nations.json",
    "data/taxonomy.json",
    "data/index/records.json",
  ] as const;

  const results = await Promise.allSettled(paths.map(fetchJson));
  const values = new Map<string, unknown>();
  const warnings: string[] = [];

  results.forEach((result, index) => {
    const path = paths[index];
    if (result.status === "fulfilled") {
      values.set(path, result.value);
    } else {
      warnings.push(
        `Could not load ${path}: ${
          result.reason instanceof Error
            ? result.reason.message
            : "unknown error"
        }`,
      );
    }
  });

  for (const required of [
    "data/nations.json",
    "data/taxonomy.json",
    "data/index/records.json",
  ]) {
    if (!values.has(required)) {
      throw new Error(
        `The required same-origin artifact ${required} is unavailable.`,
      );
    }
  }

  const nations = arrayPayload(values.get("data/nations.json"), [
    "nations",
    "items",
  ])
    .map(normalizeNation)
    .filter((nation): nation is Nation => nation !== null)
    .sort((a, b) => a.officialName.localeCompare(b.officialName));
  const taxonomy = normalizeTaxonomy(values.get("data/taxonomy.json"));
  const records = arrayPayload(values.get("data/index/records.json"), [
    "records",
    "items",
  ])
    .map(normalizeRecord)
    .filter((record): record is PublicRecord => record !== null);

  for (const record of records) {
    record.taxonomyMemberships = record.taxonomyMemberships.filter(
      (membership) => {
        if (membership.subcategoryId === null) return true;
        const category = taxonomy.categories.find(
          (candidate) => candidate.id === membership.categoryId,
        );
        return Boolean(
          category?.subcategories.some(
            (subcategory) => subcategory.id === membership.subcategoryId,
          ),
        );
      },
    );
  }

  if (nations.length === 0) {
    throw new Error("The Nation artifact contains no usable entries.");
  }
  if (taxonomy.categories.length === 0) {
    throw new Error("The taxonomy artifact contains no usable categories.");
  }

  const coverage = normalizeCoverage(values.get("data/coverage.json"));
  const sourceHealth = normalizeHealth(values.get("data/source-health.json"));

  return {
    manifest: normalizeManifest(values.get("data/manifest.json")),
    nations,
    taxonomy,
    records,
    coverage: coverage.length > 0 ? coverage : fallbackCoverage(records),
    sourceHealth:
      sourceHealth.length > 0 ? sourceHealth : fallbackHealth(records),
    warnings,
  };
};

export const loadRecordDetail = async (
  record: PublicRecord,
): Promise<PublicRecord> => {
  if (!record.texts.detailPath) {
    throw new Error("The compact index does not provide a detail asset path.");
  }
  const payload = await fetchJson(record.texts.detailPath);
  const root = objectValue(payload);
  const normalized = normalizeRecord(root.record ?? payload);
  if (!normalized) {
    throw new Error("The detail asset did not contain a usable record.");
  }
  if (normalized.internalId !== record.internalId) {
    throw new Error("The detail asset ID does not match the requested record.");
  }
  return normalized;
};
