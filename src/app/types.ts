export interface Nation {
  id: string;
  officialName: string;
  aliases: string[];
  coveredStateCodes: string[];
}

export interface TaxonomySubcategory {
  id: string;
  label: string;
  description: string;
}

export interface TaxonomyCategory {
  id: string;
  label: string;
  subcategories: TaxonomySubcategory[];
}

export interface Taxonomy {
  version: string;
  categories: TaxonomyCategory[];
}

export interface SourceText {
  text: string;
  sourceUrl?: string;
  sourceDate?: string | null;
  reproductionBasis?: string;
}

export interface TaxonomyMembership {
  categoryId: string;
  subcategoryId: string | null;
  officialSubjectLabels: string[];
}

export type RelevanceBasis =
  | "explicit_nation_reference"
  | "general_jurisdiction"
  | "landmark"
  | "source_defined";

export interface Relevance {
  basis: RelevanceBasis;
  label: string;
  sourceUrl?: string;
  evidence?: string;
}

export interface NationAssociation {
  nationId: string;
  officialNationName: string;
  basis: "explicit_mention" | "issuing_government" | string;
  evidenceText: string;
  evidenceUrl: string;
  evidenceLocation?: string;
  validationState?: string;
}

export interface HistoryEvent {
  date: string | null;
  sourceLabel: string;
  sourceUrl?: string;
}

export interface SourceDocumentRelationship {
  relationshipType: "corrects" | "corrected_by" | "related_document";
  targetSourceRecordId: string;
  targetUrl: string;
  sourceLabel: string;
}

export interface PublicRecord {
  internalId: string;
  officialTitle: string;
  sourceDocumentIdentifier: string;
  documentType: string;
  source: {
    id: string;
    name: string;
    provider?: string;
    attribution?: string;
    coverageFrom?: string | null;
    coverageThrough?: string | null;
    coverageNotes?: string;
  };
  jurisdiction: {
    level: string;
    name: string;
    stateCode: string | null;
  };
  issuingBodies: string[];
  status: {
    normalized: string;
    sourceLabel: string;
    asOf: string | null;
  };
  dates: {
    introduced: string | null;
    published: string | null;
    updated: string | null;
    lastAction: string | null;
    deadline: string | null;
    effective: string | null;
    retrieved: string | null;
  };
  urls: {
    officialSource: string;
    officialFullText: string | null;
  };
  texts: {
    officialSummary: SourceText | null;
    sourceExcerpt: SourceText | null;
    officialLanguage: SourceText | null;
    detailPath: string | null;
  };
  sponsors: string[];
  committees: string[];
  actionHistory: HistoryEvent[];
  statusHistory: HistoryEvent[];
  sourceDocumentRelationships: SourceDocumentRelationship[];
  officialSubjects: string[];
  taxonomyMemberships: TaxonomyMembership[];
  isUnclassified: boolean;
  relevance: Relevance[];
  nationIds: string[];
  nationAssociations: NationAssociation[];
  landmark: {
    isLandmark: boolean;
    criterionCodes: string[];
    officialEvidence: SourceText[];
  };
  historical: {
    isHistorical: boolean;
    pre1980Treatment?: string;
  };
  dataQuality: {
    state: string;
    validatedAt?: string;
    issues: string[];
  };
  sourceHealth: {
    status: string;
    dataAsOf: string | null;
    lastSuccessfulRetrievalAt: string | null;
    usingLastKnownGood: boolean;
    message: string | null;
  };
  change: {
    kind: string;
    firstSeenAt?: string;
    urgentAlert: {
      basis: string;
      label: string;
      date: string | null;
    } | null;
  };
  aiSummary:
    | {
        exists: false;
        label: string;
      }
    | {
        exists: true;
        label: string;
        text: string;
        generatedAt?: string;
        model?: string;
        buildId?: string;
        validationState?: string;
        citedInputs: Array<{
          field?: string;
          sourceUrl?: string;
          sourceDate?: string | null;
        }>;
      };
  fieldProvenance: Array<{
    field: string;
    sourceUrl?: string;
    retrievedAt?: string;
    sourceUpdatedAt?: string | null;
    validationState?: string;
  }>;
  searchText: string;
}

export interface ArtifactManifest {
  buildId: string;
  generatedAt: string | null;
  dataAsOf: string | null;
  recordCount: number | null;
  synthetic: boolean;
}

export interface CoverageEntry {
  sourceId: string;
  sourceName: string;
  provider: string;
  jurisdictions: string[];
  from: string | null;
  through: string | null;
  documentedFrom: string | null;
  documentedThrough: string | null;
  recordFrom: string | null;
  recordThrough: string | null;
  recordCount: number;
  cadence: string;
  recordTypes: string[];
  status: string;
  limitation: string;
}

export interface SourceHealthEntry {
  sourceId: string;
  sourceName: string;
  status: string;
  dataAsOf: string | null;
  lastSuccessfulRetrievalAt: string | null;
  usingLastKnownGood: boolean;
  message: string | null;
}

export interface ArtifactBundle {
  manifest: ArtifactManifest;
  nations: Nation[];
  taxonomy: Taxonomy;
  records: PublicRecord[];
  coverage: CoverageEntry[];
  sourceHealth: SourceHealthEntry[];
  warnings: string[];
}

export interface SearchCriteria {
  nationId: string;
  allPolicyAreas: boolean;
  categoryIds: string[];
  subcategoryIds: Record<string, string[]>;
  query: string;
  jurisdictions: string[];
  documentTypes: string[];
  statuses: string[];
  sources: string[];
  relevanceBases: RelevanceBasis[];
  dateFrom: string;
  dateThrough: string;
  sort: "updated-desc" | "event-asc" | "title";
}

export interface WhyShown {
  basis: RelevanceBasis;
  label: string;
  evidence?: string;
  evidenceUrl?: string;
}
