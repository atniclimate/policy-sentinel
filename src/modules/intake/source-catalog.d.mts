import type {
  SourceCatalog,
  CustodySourceProfile,
  SourceCoverageOptions,
  SourceCoverageReport,
  AvailableSourceCapability,
} from "../../core/source-coverage.mjs";
export type * from "../../core/source-coverage.mjs";

export interface CatalogTarget {
  profileId: string;
  url: string;
  expectedIdentity: string;
  mediaTypes: string[];
}
export interface CatalogManifest {
  version: "1.0.0";
  runId: string;
  trustDomain: SourceCatalog["trustDomain"];
  profiles: CustodySourceProfile[];
  targets: CatalogTarget[];
}
export interface SourceManifestOptions {
  sourceIds: string[];
  targets: CatalogTarget[];
  runId: string;
  trustDomain?: SourceCatalog["trustDomain"];
  purpose?: "dispatch" | "replay";
  asOf?: string;
}
export const SOURCE_CATALOG_SCHEMA_ID: string;
export const SOURCE_CAPABILITY_MODES: readonly AvailableSourceCapability[];
export const MANAGED_STORAGE_CEILING_BYTES: 50000000000;
export function validateSourceCatalog(catalog: unknown): SourceCatalog;
export function describeSourceCoverage(
  catalog: SourceCatalog,
  options?: SourceCoverageOptions,
): SourceCoverageReport;
export function manifestFromSourceCatalog(
  catalog: SourceCatalog,
  options: SourceManifestOptions,
): CatalogManifest;
