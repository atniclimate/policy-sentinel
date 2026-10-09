export type SourceCapabilityMode =
  "topical" | "full_text" | "metadata" | "identifier_only" | "cached";
export type AvailableSourceCapability = SourceCapabilityMode | "unavailable";
export type EvidenceState =
  "unknown" | "documented" | "verified" | "unsupported";
export type SourceAuthorityClass =
  | "federal"
  | "state"
  | "tribal_government"
  | "county"
  | "municipal"
  | "intergovernmental"
  | "user_supplied";
export interface CatalogReview {
  reviewer: string;
  reviewedAt: string;
  expiresAt: string | null;
  evidenceUrls: string[];
}
export interface SourceCapability {
  mode: SourceCapabilityMode;
  state: EvidenceState;
  evidenceUrls: string[];
}
export interface SourceEvidenceFeature {
  name:
    | "parent_proceeding"
    | "docket_id"
    | "rin"
    | "consultation_event"
    | "statutory_dependency"
    | "environmental_alternative"
    | "geographic_applicability";
  state: EvidenceState;
  evidenceUrls: string[];
}
export interface SourceDateRange {
  from: string | null;
  through: string | null;
}
export interface CatalogBlocker {
  code: string;
  detail: string;
  gateRef: string | null;
}
export interface PublishingJurisdiction {
  ref: string;
  basis: "publishing_authority";
  evidence: { url: string; locator: string };
}
export interface CatalogCoverage {
  documented: SourceDateRange & {
    completeness: "unknown" | "partial" | "declared";
    note: string;
  };
  selected: SourceDateRange | null;
  emitted: (SourceDateRange & { recordCount: number }) | null;
}
export interface CustodySourceProfile {
  id: string;
  hosts: string[];
  pathPrefixes: string[];
  review: CatalogReview;
  uses: {
    capture: true;
    analysis: true;
    excerpts: boolean;
    localDisplay: "full_text" | "excerpt" | "metadata_link";
    localExport: "full_text" | "excerpt" | "metadata_link" | "prohibited";
    publicRedistribution: "prohibited";
  };
}
export interface SourceDescriptor {
  id: string;
  label: string;
  publisher: string;
  authorityClass: SourceAuthorityClass;
  attributionScope: "publisher_only";
  publishingJurisdiction: PublishingJurisdiction | null;
  discoveryRegions: string[];
  recordKinds: (
    | "legislation"
    | "statutes"
    | "rules"
    | "opinions"
    | "local_instruments"
    | "organizational_resolutions"
    | "regulatory_proceedings"
    | "user_documents"
  )[];
  interfaceKind: "api" | "html" | "pdf" | "xml" | "local";
  lifecycle: "discovery" | "qualified" | "active";
  review: CatalogReview;
  evidenceRecord: string;
  terms: "cleared" | "unresolved" | "blocked";
  credentials:
    | { kind: "none" }
    | { kind: "unknown" }
    | { kind: "environment_variable"; environmentVariable: string };
  implementedCapabilities: SourceCapabilityMode[];
  capabilities: SourceCapability[];
  evidenceFeatures: SourceEvidenceFeature[];
  coverage: CatalogCoverage;
  cadence: string;
  blockers: CatalogBlocker[];
  profile: CustodySourceProfile | null;
  activation: {
    operationId: string;
    activatedAt: string;
    evidenceUrls: string[];
  } | null;
}
export interface SourceCatalog {
  $schema: string;
  schemaVersion: "1.0.0";
  catalogId: string;
  trustDomain: "real_source_local" | "synthetic_test_only";
  managedStorageCeilingBytes: 50000000000;
  sources: SourceDescriptor[];
  regionalInterfaces?: RegionalInterfaceRegister;
}
export interface RegionalInterfaceEvidence {
  url: string;
  record: string;
  observedOn: string;
  observation:
    "direct_documentation" | "official_index" | "retained_documentation";
}
export interface RegionalInterfaceEntry {
  state: "WA" | "OR" | "ID" | "AK" | "CA" | "MT" | "NV";
  sourceId: string;
  requirement: "required_api" | "interface_disposition";
  disposition: "api_candidate" | "interface_gap" | "documented_non_api";
  evidence: RegionalInterfaceEvidence[];
  note: string;
}
export interface RegionalInterfaceRegister {
  version: "1.0.0";
  registerId: "gd47-seven-state-interfaces";
  assessedOn: string;
  entries: RegionalInterfaceEntry[];
}
export interface RegionalInterfaceCoverage extends RegionalInterfaceEntry {
  registerId: RegionalInterfaceRegister["registerId"];
  version: RegionalInterfaceRegister["version"];
  assessedOn: string;
  blockers: CatalogBlocker[];
}
export interface SourceCoverageOptions {
  asOf?: string;
  sourceIds?: string[];
  regionCodes?: string[];
}
export type SourceCoverageEntry = Pick<
  SourceDescriptor,
  | "id"
  | "label"
  | "publisher"
  | "authorityClass"
  | "attributionScope"
  | "publishingJurisdiction"
  | "discoveryRegions"
  | "recordKinds"
  | "interfaceKind"
  | "lifecycle"
  | "review"
  | "evidenceRecord"
  | "evidenceFeatures"
  | "coverage"
  | "blockers"
> & {
  reviewStatus: "future" | "unqualified" | "expired" | "current";
  declaredCapabilities: SourceCapability[];
  availableCapabilities: AvailableSourceCapability[];
  regionalInterface?: RegionalInterfaceCoverage;
};
export interface SourceCoverageReport {
  catalogId: string;
  trustDomain: SourceCatalog["trustDomain"];
  asOf: string;
  managedStorageCeilingBytes: 50000000000;
  geographyBasis: "discovery_relevance_only";
  scope: { sourceIds: string[] | null; regionCodes: string[] | null };
  sources: SourceCoverageEntry[];
  limitations: string[];
}

export const SOURCE_CAPABILITY_MODES: readonly AvailableSourceCapability[];
export const MANAGED_STORAGE_CEILING_BYTES: 50000000000;
/** Accepts catalog data validated at an intake/build boundary. Options are checked without code generation. */
export function projectSourceCoverage(
  catalog: SourceCatalog,
  options?: SourceCoverageOptions,
): SourceCoverageReport;
export function selectSourceDescriptors(
  catalog: SourceCatalog,
  sourceIds?: string[],
  regionCodes?: string[],
): SourceDescriptor[];
export function sourceReviewStatus(
  source: SourceDescriptor,
  asOf: number,
): SourceCoverageEntry["reviewStatus"];
