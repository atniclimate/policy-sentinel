import type {
  SourceCatalog,
  SourceCoverageOptions,
  SourceCoverageReport,
  CatalogManifest,
} from "../src/modules/intake/source-catalog.mjs";

export const sourceCatalog: SourceCatalog;
export function describeConfiguredSourceCoverage(
  options?: SourceCoverageOptions,
): SourceCoverageReport;
export function initialDirectManifestFromCatalog(
  runId?: string,
  options?: { purpose?: "dispatch" | "replay"; asOf?: string },
): CatalogManifest;
