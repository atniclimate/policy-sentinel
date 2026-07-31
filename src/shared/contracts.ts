export const RECORD_SCHEMA_VERSION = "1.1.0" as const;
export const ARTIFACT_SCHEMA_VERSION = "1.0.0" as const;
export const SOURCE_SCHEMA_VERSION = "1.1.0" as const;
export const SOURCE_REGISTRY_VERSION = "1.3.0" as const;

export type IsoDate = string;
export type IsoDateTime = string;
export type JurisdictionLevel =
  "federal" | "state" | "county" | "tribal" | "other";
export type SourceHealthStatus =
  "healthy" | "degraded" | "failed" | "unavailable" | "unknown";
export type ValidationState =
  "pending" | "validated" | "incomplete" | "rejected";

export interface Nation {
  id: string;
  officialName: string;
  authorizedAliases: string[];
  recognitionBaselineVersion: string;
  stateCoverage: {
    states: Array<"WA" | "OR" | "ID">;
    federalOnly: boolean;
    basis: "synthetic_fixture" | "reviewed_official_crosswalk";
  };
}

export interface NationCollection {
  artifactType: "nation-collection";
  schemaVersion: typeof ARTIFACT_SCHEMA_VERSION;
  generatedAt: IsoDateTime;
  baseline: {
    count: 575;
    version: string;
    authorityName: string;
    authorityUrl: string;
    synthetic: boolean;
  };
  nations: Nation[];
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

export interface TaxonomyConfig {
  $schema: string;
  taxonomyVersion: "1.0.0";
  title: string;
  mappingPolicy: {
    method: "deterministic-official-subject-only";
    manyToMany: true;
    unmappedBehavior: "unclassified";
    sourceMappings: DeterministicMappingRule[];
  };
  categories: TaxonomyCategory[];
}

export interface DeterministicMappingRule {
  id: string;
  sourceId: string;
  officialSubjectScheme: string;
  officialSubjectValue: string;
  targets: Array<{
    categoryId: string;
    subcategoryId?: string;
  }>;
  provenance: {
    sourceUrl: string;
    retrievedAt: IsoDateTime;
    validationState: "pending" | "validated" | "rejected";
  };
}

export interface SourceRegistry {
  $schema: string;
  schemaVersion: typeof SOURCE_SCHEMA_VERSION;
  registryVersion: typeof SOURCE_REGISTRY_VERSION;
  generatedDataPolicy: "artifact-only";
  sources: SourceConfig[];
}

export interface SourceConfig {
  id: string;
  name: string;
  provider: string;
  synthetic: boolean;
  enabled: boolean;
  adapter: {
    id: string;
    version: string;
    module: string;
    identityRule: string;
  } | null;
  jurisdiction: {
    level: JurisdictionLevel;
    name: string;
    stateCode: "WA" | "OR" | "ID" | null;
  };
  access: {
    method: "fixture" | "api" | "feed" | "official_export";
    officialDocumentationUrl: string;
    accessedOn?: IsoDate;
    allowedHosts: string[];
    authentication: "none" | "build_secret";
    rateLimit: string;
    browserRuntimeAllowed: false;
  };
  coverage: {
    from: IsoDate | null;
    through: IsoDate | null;
    cadence: string;
    limitations: string;
  };
  publication: {
    attribution: string;
    termsUrl: string;
    reproduction:
      "metadata_and_links" | "reviewed_excerpt" | "reviewed_full_text";
    failureMode: "last_known_good";
    requiredProvenancePointers: string[];
  };
  officialSubjectMappings: string[];
}

export interface SourceHealth {
  sourceId: string;
  status: SourceHealthStatus;
  checkedAt: IsoDateTime;
  dataAsOf: IsoDateTime | null;
  lastSuccessfulRetrievalAt: IsoDateTime | null;
  usingLastKnownGood: boolean;
  stale: boolean;
  recordCount: number;
  failureStage:
    | "contract"
    | "discovery"
    | "fetch"
    | "normalize"
    | "validation"
    | "packaging"
    | null;
  message: string | null;
}

export interface RecordSource {
  id: string;
  name: string;
  provider: string;
  recordId: string;
  adapterId: string;
  adapterVersion: string;
  coverage: {
    from: IsoDate | null;
    through: IsoDate | null;
    notes: string;
  };
  attribution: string;
}

export interface PolicyRecord {
  schemaVersion: typeof RECORD_SCHEMA_VERSION;
  internalId: string;
  source: RecordSource;
  officialTitle: string;
  sourceDocumentIdentifier: string;
  documentType: string;
  jurisdiction: {
    level: JurisdictionLevel;
    name: string;
    stateCode: "WA" | "OR" | "ID" | null;
    generalJurisdictionOnly: boolean;
  };
  issuingBodies: Array<{ sourceId: string | null; officialName: string }>;
  legislativeContext: {
    congress: number | null;
    session: string | null;
    chamber: string | null;
  } | null;
  status: {
    normalized: string;
    sourceLabel: string;
    asOf: IsoDate | IsoDateTime;
  };
  dates: {
    introduced: IsoDate | null;
    published: IsoDate | null;
    updated: IsoDate | IsoDateTime | null;
    lastAction: IsoDate | null;
    deadline: IsoDate | IsoDateTime | null;
    effective: IsoDate | null;
    retrieved: IsoDateTime;
  };
  urls: {
    officialSource: string;
    officialFullText: string | null;
  };
  texts: {
    officialSummary: SourceText | null;
    sourceExcerpt: SourceText | null;
    detailAsset: {
      availability: "none" | "official_link_only" | "permitted_static_asset";
      path: string | null;
      reproductionBasis: string | null;
    };
  };
  sponsors: NamedEntity[];
  committees: NamedEntity[];
  actionHistory: HistoryEvent[];
  statusHistory: HistoryEvent[];
  sourceDocumentRelationships: SourceDocumentRelationship[];
  officialSubjects: OfficialSubject[];
  taxonomyMemberships: TaxonomyMembership[];
  isUnclassified: boolean;
  relevance: RelevanceBasis[];
  nationAssociations: NationAssociation[];
  landmark:
    | {
        isLandmark: false;
      }
    | {
        isLandmark: true;
        criterionCodes: Array<
          | "documented-court-decision"
          | "treaty"
          | "statute"
          | "public-state-federal-accord"
          | "officially-identified-foundational"
        >;
        officialEvidence: SourceText[];
      };
  historical: {
    isHistorical: boolean;
    pre1980Treatment: "not_applicable" | "list_and_link" | "landmark_detail";
  };
  dataQuality: {
    state: ValidationState;
    validatedAt: IsoDateTime | null;
    validator: string | null;
    issues: string[];
  };
  sourceHealth: {
    status: "healthy" | "degraded" | "failed" | "unknown";
    checkedAt: IsoDateTime;
    dataAsOf: IsoDateTime;
    lastSuccessfulRetrievalAt: IsoDateTime | null;
    usingLastKnownGood: boolean;
    message: string | null;
  };
  change: {
    firstSeenAt: IsoDateTime;
    lastSeenAt: IsoDateTime;
    kind: "new" | "changed" | "unchanged";
    urgentAlert: {
      basis: "source_deadline" | "source_status";
      label: string;
      date: IsoDate | IsoDateTime | null;
    } | null;
  };
  aiSummary:
    | { exists: false; label: "AI-generated source summary" }
    | {
        exists: true;
        label: "AI-generated source summary";
        text: string;
        generatedAt: IsoDateTime;
        model: string;
        provider: string;
        buildId: string;
        policyVersion: string;
        citedInputs: Array<{
          field: string;
          sourceUrl: string;
          sourceDate: IsoDate | null;
        }>;
        validationState: "approved" | "rejected" | "pending";
      };
  fieldProvenance: FieldProvenance[];
}

export interface SourceText {
  text: string;
  sourceUrl: string;
  sourceDate: IsoDate | null;
  reproductionBasis: string;
}

export interface NamedEntity {
  sourceId: string | null;
  officialName: string;
}

export interface HistoryEvent {
  date: IsoDate | IsoDateTime | null;
  sourceLabel: string;
  sourceUrl: string;
}

export type SourceDocumentRelationshipType =
  "corrects" | "corrected_by" | "related_document";

export interface SourceDocumentRelationship {
  relationshipType: SourceDocumentRelationshipType;
  targetSourceRecordId: string;
  targetUrl: string;
  sourceLabel: string;
}

export interface OfficialSubject {
  scheme: string;
  label: string;
  sourceUrl: string;
}

export interface TaxonomyMembership {
  categoryId: string;
  subcategoryId: string | null;
  mappingRuleId: string;
  taxonomyVersion: "1.0.0";
  officialSubjectLabels: string[];
}

export interface RelevanceBasis {
  basis:
    | "explicit_nation_reference"
    | "general_jurisdiction"
    | "landmark"
    | "source_defined";
  label: string;
  sourceUrl: string;
  evidence: string;
}

export interface NationAssociation {
  nationId: string;
  officialNationName: string;
  basis: "explicit_mention" | "issuing_government";
  evidenceText: string;
  evidenceUrl: string;
  evidenceLocation: string;
  validationState: "validated" | "pending" | "rejected";
}

export interface FieldProvenance {
  field: string;
  sourcePath: string;
  sourceId: string;
  sourceRecordId: string;
  sourceUrl: string;
  retrievedAt: IsoDateTime;
  sourceUpdatedAt: IsoDateTime | null;
  adapterId: string;
  transformation:
    "copied" | "normalized" | "deterministic_mapping" | "combined";
  transformRuleId: string | null;
  validationState: "validated" | "pending" | "rejected";
}

export interface RecordIndexEntry {
  id: string;
  detailPath: string;
  sourceDocumentIdentifier: string;
  officialTitle: string;
  documentType: string;
  jurisdiction: PolicyRecord["jurisdiction"];
  issuingBodies: string[];
  status: PolicyRecord["status"];
  source: Pick<RecordSource, "id" | "name" | "provider">;
  dates: Pick<
    PolicyRecord["dates"],
    "published" | "updated" | "lastAction" | "deadline"
  >;
  urls: Pick<PolicyRecord["urls"], "officialSource">;
  taxonomyMemberships: Array<
    Pick<TaxonomyMembership, "categoryId" | "subcategoryId">
  >;
  isUnclassified: boolean;
  nationIds: string[];
  relevance: RelevanceBasis[];
  landmark: Pick<PolicyRecord["landmark"], "isLandmark">;
  change: PolicyRecord["change"];
}

export interface ArtifactAsset {
  path: string;
  sha256: string;
  sizeBytes: number;
  mediaType: "application/json";
  sourceIds: string[];
}

export interface ArtifactManifest {
  artifactType: "manifest";
  schemaVersion: typeof ARTIFACT_SCHEMA_VERSION;
  artifactVersion: "1.0.0" | "1.1.0";
  buildId: string;
  generatedAt: IsoDateTime;
  dataAsOf: IsoDateTime;
  synthetic: boolean;
  recordSchemaVersion: typeof RECORD_SCHEMA_VERSION;
  taxonomyVersion: "1.0.0";
  sourceRegistryVersion: typeof SOURCE_REGISTRY_VERSION;
  recordCount: number;
  nationCount: 575;
  assets: ArtifactAsset[];
}

export interface ArtifactCoverageEntry {
  sourceId: string;
  sourceName: string;
  provider: string;
  jurisdiction: SourceConfig["jurisdiction"];
  from: IsoDate | null;
  through: IsoDate | null;
  documentedFrom: IsoDate | null;
  documentedThrough: IsoDate | null;
  recordFrom: IsoDate | null;
  recordThrough: IsoDate | null;
  recordCount: number;
  cadence: string;
  recordTypes: string[];
  status: "synthetic" | "available" | "limited" | "unavailable";
  limitation: string;
}

export interface ArtifactCoverage {
  artifactType: "coverage";
  schemaVersion: typeof ARTIFACT_SCHEMA_VERSION;
  generatedAt: IsoDateTime;
  notices: string[];
  entries: ArtifactCoverageEntry[];
}

export interface SourceHealthCollection {
  artifactType: "source-health";
  schemaVersion: typeof ARTIFACT_SCHEMA_VERSION;
  generatedAt: IsoDateTime;
  sources: SourceHealth[];
}

export interface RecordIndex {
  artifactType: "record-index";
  schemaVersion: typeof ARTIFACT_SCHEMA_VERSION;
  generatedAt: IsoDateTime;
  records: RecordIndexEntry[];
}

export interface RecordDetail {
  artifactType: "record-detail";
  schemaVersion: typeof ARTIFACT_SCHEMA_VERSION;
  generatedAt: IsoDateTime;
  record: PolicyRecord;
}
