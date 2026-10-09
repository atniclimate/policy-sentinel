import canonicalSources from "../config/sources.v1.json" with { type: "json" };
import canonicalTaxonomy from "../config/taxonomy.v1.json" with { type: "json" };
import federalFixture from "../fixtures/records/general-jurisdiction.valid.json" with { type: "json" };
import countyFixture from "../fixtures/records/county-explicit.valid.json" with { type: "json" };
import accordFixture from "../fixtures/records/intergovernmental-accord.valid.json" with { type: "json" };
import { createAnalyzedCorpusRuntime } from "../src/core/analyzed-corpus.mjs";

export const {
  syntheticApplicationPins,
  createAnalyzedCorpus,
  parseAnalyzedCorpus,
  serializeAnalyzedCorpus,
  assertAnalyzedCorpusCompatibility,
  projectAnalyzedCorpus,
} = createAnalyzedCorpusRuntime({
  canonicalSources,
  canonicalTaxonomy,
  federalFixture,
  countyFixture,
  accordFixture,
});
