import sourceRegistry from "../config/sources.v1.json";
import taxonomyConfig from "../config/taxonomy.v1.json";
import { createProjectionRuntime } from "../src/core/projection";
import { createGeographyRightsRuntime } from "../src/modules/context/geography-rights";
import { createTaxonomyRuntime } from "../src/modules/context/taxonomy";
import type { TaxonomyConfig } from "../src/shared/contracts";

const projectionConfiguration = { sourceRegistry, taxonomy: taxonomyConfig };
export const { parseProjectionProfileBundle, createEngineProjection } =
  createProjectionRuntime(projectionConfiguration);
export const { createGeographyRightsProjection } = createGeographyRightsRuntime(
  projectionConfiguration,
);
export const { parseTaxonomyBundle, createTaxonomyProjection } =
  createTaxonomyRuntime({
    taxonomyConfig: taxonomyConfig as TaxonomyConfig,
    projectionConfiguration,
  });
export { parseGeographyRightsBundle } from "../src/modules/context/geography-rights";
