import taxonomy from "../config/taxonomy.v1.json";
import type {
  BuildContext,
  PublicSourceAdapter,
} from "../src/pipeline/source-adapter";
import type { SourceRefreshResult } from "../src/core/source-refresh";
import type { TaxonomyConfig } from "../src/shared/contracts";
import {
  refreshFederalRegisterSourceWithTaxonomy,
  type FederalRegisterRefreshValidator,
} from "../src/adapters/federal-register/adapter";
import {
  refreshSupremeCourtCuratedOpinionsSourceWithTaxonomy,
  type SupremeCourtRefreshValidator,
} from "../src/adapters/supreme-court-opinions-curated/adapter";
import {
  refreshWashingtonCentennialAccordSourceWithTaxonomy,
  type GoiaAccordRefreshValidator,
} from "../src/adapters/washington-centennial-accord/adapter";
import {
  refreshWashingtonGovernorExecutiveOrdersSourceWithTaxonomy,
  type WashingtonGovernorRefreshValidator,
} from "../src/adapters/washington-governor-executive-orders/adapter";

// Canonical configuration is bound only at this build-time composition root.

export function refreshFederalRegisterSource(
  adapter: PublicSourceAdapter,
  context: BuildContext,
  validator: FederalRegisterRefreshValidator,
): Promise<SourceRefreshResult> {
  return refreshFederalRegisterSourceWithTaxonomy(
    adapter,
    context,
    validator,
    taxonomy as unknown as TaxonomyConfig,
  );
}

export function refreshSupremeCourtCuratedOpinionsSource(
  adapter: PublicSourceAdapter,
  context: BuildContext,
  validator: SupremeCourtRefreshValidator,
): Promise<SourceRefreshResult> {
  return refreshSupremeCourtCuratedOpinionsSourceWithTaxonomy(
    adapter,
    context,
    validator,
    taxonomy as unknown as TaxonomyConfig,
  );
}

export function refreshWashingtonCentennialAccordSource(
  adapter: PublicSourceAdapter,
  context: BuildContext,
  validator: GoiaAccordRefreshValidator,
): Promise<SourceRefreshResult> {
  return refreshWashingtonCentennialAccordSourceWithTaxonomy(
    adapter,
    context,
    validator,
    taxonomy as unknown as TaxonomyConfig,
  );
}

export function refreshWashingtonGovernorExecutiveOrdersSource(
  adapter: PublicSourceAdapter,
  context: BuildContext,
  validator: WashingtonGovernorRefreshValidator,
): Promise<SourceRefreshResult> {
  return refreshWashingtonGovernorExecutiveOrdersSourceWithTaxonomy(
    adapter,
    context,
    validator,
    taxonomy as unknown as TaxonomyConfig,
  );
}
