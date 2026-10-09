import canonicalSources from "../config/sources.v1.json" with { type: "json" };
import canonicalTaxonomy from "../config/taxonomy.v1.json" with { type: "json" };
import federalFixture from "../fixtures/records/general-jurisdiction.valid.json" with { type: "json" };
import countyFixture from "../fixtures/records/county-explicit.valid.json" with { type: "json" };
import accordFixture from "../fixtures/records/intergovernmental-accord.valid.json" with { type: "json" };
import { createAnalyzedCorpusRuntime } from "../src/core/analyzed-corpus.mjs";
import { mapOfficialSubjects } from "../src/modules/context/official-subject-mapping.mjs";
import { completeSyntheticProvenance } from "../src/pipeline/policy-validation.mjs";

const mappedFixtures = [federalFixture, countyFixture, accordFixture].map(
  (record) => {
    const source = canonicalSources.sources.find(
      ({ id }) => id === record.source.id,
    );
    const { taxonomyMemberships, isUnclassified, mappingEvidence } =
      mapOfficialSubjects(canonicalTaxonomy, source, record.officialSubjects);
    return completeSyntheticProvenance(
      { ...record, taxonomyMemberships, isUnclassified },
      mappingEvidence,
    );
  },
);

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
  federalFixture: mappedFixtures[0],
  countyFixture: mappedFixtures[1],
  accordFixture: mappedFixtures[2],
});
