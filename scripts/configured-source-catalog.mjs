import { sourceCatalog } from "../config/source-catalog.v1.mjs";
import { directCanaryTargets } from "../config/policy-sources.v2.mjs";
import {
  describeSourceCoverage,
  manifestFromSourceCatalog,
} from "../src/modules/intake/source-catalog.mjs";

export { sourceCatalog };

export function describeConfiguredSourceCoverage(options = {}) {
  return describeSourceCoverage(sourceCatalog, options);
}

/** Historical selection remains byte-equivalent; no old profile is renewed. */
export function initialDirectManifestFromCatalog(
  runId = "real-policy-discovery-01",
  { purpose = "dispatch", asOf } = {},
) {
  return manifestFromSourceCatalog(sourceCatalog, {
    runId,
    sourceIds: ["govinfo-direct", "washington-legislative-text"],
    targets: directCanaryTargets,
    purpose,
    asOf,
  });
}
