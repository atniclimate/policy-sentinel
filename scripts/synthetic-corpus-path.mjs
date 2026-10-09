import { Buffer } from "node:buffer";
import sourceRegistry from "../config/sources.v1.json" with { type: "json" };
import taxonomy from "../config/taxonomy.v1.json" with { type: "json" };
import federal from "../fixtures/records/general-jurisdiction.valid.json" with { type: "json" };
import county from "../fixtures/records/county-explicit.valid.json" with { type: "json" };
import accord from "../fixtures/records/intergovernmental-accord.valid.json" with { type: "json" };
import { completeSyntheticProvenance } from "../src/pipeline/policy-validation.mjs";
import { mapOfficialSubjects } from "../src/modules/context/official-subject-mapping.mjs";
import {
  canonicalCorpusDigest,
  REQUIRED_ANALYZED_CORPUS_NON_CLAIMS,
  SYNTHETIC_APPLICATION_PROFILE,
} from "../src/core/analyzed-corpus.mjs";
import {
  createAnalyzedCorpus,
  parseAnalyzedCorpus,
  syntheticApplicationPins,
} from "./configured-analyzed-corpus.mjs";

const visibility = "non_public_ignored_prerelease";
const ref = (kind, id, value = id) => ({
  kind,
  id,
  version: "1.0.0",
  digest: canonicalCorpusDigest(value),
});

export function syntheticCorpusFixtures() {
  return [federal, county, accord].map((record) => {
    const source = sourceRegistry.sources.find(
      ({ id }) => id === record.source.id,
    );
    const { taxonomyMemberships, isUnclassified, mappingEvidence } =
      mapOfficialSubjects(taxonomy, source, record.officialSubjects);
    return completeSyntheticProvenance(
      { ...record, taxonomyMemberships, isUnclassified },
      mappingEvidence,
    );
  });
}

export function createSyntheticApplicationCorpus({
  records,
  registry,
  configuredTaxonomy,
  generatedAt,
}) {
  const pins = syntheticApplicationPins();
  if (
    canonicalCorpusDigest(registry) !== pins.sourceRegistryDigest ||
    canonicalCorpusDigest(configuredTaxonomy) !== pins.taxonomyDigest
  ) {
    throw new Error("SYNTHETIC_CONFIGURATION_PIN_MISMATCH");
  }
  const at = generatedAt.replace(/\.[0-9]{3}Z$/u, "Z");
  const configurationAuthorityRef = ref(
    "configuration_authority",
    "synthetic-canonical-registry",
    registry,
  );
  const limitationRefs = [
    ref(
      "limitation",
      "synthetic-only-nonclaims",
      REQUIRED_ANALYZED_CORPUS_NON_CLAIMS,
    ),
  ];
  const reviewExpiresAt = "9999-12-31T23:59:59Z";
  const bindings = records.map((record) => {
    const id = `${record.source.id}-fixture-binding`;
    const evidence = { record, profile: SYNTHETIC_APPLICATION_PROFILE };
    return {
      kind: "source_evidence_binding",
      id,
      version: "1.0.0",
      synthetic: true,
      trustDomain: "synthetic_test_only",
      sourceId: record.source.id,
      visibility,
      syntheticEvidenceRef: ref(
        "synthetic_corpus_evidence",
        `${id}-evidence`,
        evidence,
      ),
      fieldPolicyRef: ref(
        "synthetic_field_policy",
        `${id}-fields`,
        record.fieldProvenance,
      ),
      revisionRef: ref(
        "synthetic_normalized_revision",
        `${id}-revision`,
        record,
      ),
      lifecycleEvaluationRef: ref(
        "synthetic_lifecycle_evaluation",
        `${id}-evaluation`,
        { synthetic: true, publication: "closed" },
      ),
      lifecycleScopeRef: ref("synthetic_lifecycle_scope", `${id}-scope`, {
        sourceId: record.source.id,
        fixtureOnly: true,
      }),
      artifactEligibilityRef: ref(
        "synthetic_artifact_eligibility",
        `${id}-eligibility`,
        { visibility, fixtureOnly: true },
      ),
      coverageRef: ref(
        "synthetic_bounded_coverage",
        `${id}-coverage`,
        record.source.coverage,
      ),
      healthRefs: [
        "source_contract",
        "acquisition_operation",
        "selected_range",
      ].map((scope) => ({
        scope,
        evidenceRef: ref(
          "synthetic_health_evidence",
          `${id}-${scope.replaceAll("_", "-")}`,
          record.sourceHealth,
        ),
      })),
      reviewRef: ref("synthetic_review_evidence", `${id}-review`, {
        fixtureDigests: pins.fixtureDigests,
        reviewExpiresAt,
      }),
      reviewExpiresAt,
      lkgRef: null,
    };
  });
  return createAnalyzedCorpus({
    id: "synthetic-application-corpus",
    version: "1.0.0",
    recordProfile: SYNTHETIC_APPLICATION_PROFILE,
    synthetic: true,
    trustDomain: "synthetic_test_only",
    generatedAt: at,
    dataAsOf: records
      .map((record) => record.sourceHealth.dataAsOf)
      .sort()
      .at(-1),
    projectionInputs: {
      regionPackRef: ref("region_pack", "synthetic-application-region", {
        fixtureOnly: true,
      }),
      deploymentProfileRef: ref(
        "deployment_profile",
        "synthetic-application-profile",
        SYNTHETIC_APPLICATION_PROFILE,
      ),
      taxonomyRef: ref(
        "taxonomy",
        "synthetic-canonical-taxonomy",
        configuredTaxonomy,
      ),
      configurationAuthorityRef,
      visibilityPolicyRef: ref(
        "visibility_policy",
        "synthetic-local-only",
        visibility,
      ),
      limitationRefs,
    },
    sourceEvidenceBindings: bindings,
    recordEntries: records.map((record, i) => ({
      record,
      sourceEvidenceBindingRef: { id: bindings[i].id, version: "1.0.0" },
      visibility,
      whyShown: {
        basis: "synthetic_compatibility",
        evidenceField: "/source/id",
        configurationAuthorityRef,
        ruleRef: ref(
          "why_shown_rule",
          "exact-reviewed-synthetic-fixtures",
          pins,
        ),
        validFrom: record.dates.retrieved,
        validThrough: reviewExpiresAt,
        reviewEvidenceRef: bindings[i].reviewRef,
        nonClaims: [...REQUIRED_ANALYZED_CORPUS_NON_CLAIMS],
      },
    })),
    views: [
      {
        id: "synthetic-application-view",
        version: "1.0.0",
        visibility,
        recordIds: records.map((record) => record.internalId).sort(),
        limitationRefs,
      },
    ],
  });
}

export function applicationCorpusForVerification(
  generatedAt = "2026-09-04T18:00:00Z",
) {
  return createSyntheticApplicationCorpus({
    records: syntheticCorpusFixtures(),
    registry: sourceRegistry,
    configuredTaxonomy: taxonomy,
    generatedAt,
  });
}

// This is a compatibility projection, not permission to publish the corpus.
export function syntheticApplicationRecords(corpus) {
  const parsed = parseAnalyzedCorpus(corpus);
  if (
    parsed.schemaVersion !== "1.1.0" ||
    parsed.recordProfile !== SYNTHETIC_APPLICATION_PROFILE
  )
    throw new Error("SYNTHETIC_APPLICATION_PROFILE_REQUIRED");
  return parsed.recordEntries.map((entry) => entry.record);
}

export function fixtureTextForCitation(record) {
  const summary = record.texts.officialSummary;
  return Buffer.from(
    `${record.officialTitle}\n${summary !== null ? `${summary.text}\n` : ""}`,
    "utf8",
  );
}
