import * as legacyCorpus from "../../src/pipeline/analyzed-corpus.mjs";
import * as pureCorpus from "../../src/core/analyzed-corpus.mjs";
import * as configuredCorpus from "../../scripts/configured-analyzed-corpus.mjs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  ANALYZED_CORPUS_SCHEMA_ID,
  ANALYZED_CORPUS_SCHEMA_VERSION,
  AnalyzedCorpusValidationError,
  REQUIRED_ANALYZED_CORPUS_NON_CLAIMS,
  assertAnalyzedCorpusCompatibility,
  createAnalyzedCorpus,
  parseAnalyzedCorpus,
  projectAnalyzedCorpus,
  serializeAnalyzedCorpus,
} from "../../src/pipeline/analyzed-corpus.mjs";
import { completeSyntheticProvenance } from "../../src/pipeline/policy-validation.mjs";

const root = new URL("../../", import.meta.url);
const visibility = "non_public_ignored_prerelease";
const generalJurisdictionLabel = "General jurisdiction only";
const generalJurisdictionEvidence =
  "Configured general-jurisdiction scope; no Nation association or legal, rights, membership, geographic, consultation, or community-position determination.";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonical(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
    .join(",")}}`;
}

function digest(value) {
  return createHash("sha256").update(canonical(value), "utf8").digest("hex");
}

function reseal(value) {
  value.contentDigest = digest(
    Object.fromEntries(
      Object.entries(value).filter(([key]) => key !== "contentDigest"),
    ),
  );
  return value;
}

function digestedRef(kind, id, seed = id) {
  return { kind, id, version: "1.0.0", digest: digest(seed) };
}

function corpusRef(corpus) {
  return {
    kind: "analyzed_corpus",
    id: corpus.id,
    version: corpus.version,
    contentDigest: corpus.contentDigest,
  };
}

function viewRef(view) {
  return {
    kind: "analyzed_corpus_view",
    id: view.id,
    version: view.version,
    contentDigest: view.contentDigest,
  };
}

async function syntheticRecord() {
  const value = JSON.parse(
    await readFile(
      new URL("fixtures/records/general-jurisdiction.valid.json", root),
      "utf8",
    ),
  );
  value.relevance[0].label = generalJurisdictionLabel;
  value.relevance[0].evidence = generalJurisdictionEvidence;
  const record = completeSyntheticProvenance(value);
  for (const entry of record.fieldProvenance) {
    if (["/relevance/0/label", "/relevance/0/evidence"].includes(entry.field)) {
      entry.sourcePath = "$analyzedCorpus.generalJurisdictionRule";
      entry.transformation = "deterministic_mapping";
      entry.transformRuleId =
        "analyzed-corpus-general-jurisdiction-relevance-v1";
    }
  }
  return record;
}

function inputFor(record) {
  const evidenceRef = digestedRef(
    "synthetic_corpus_evidence",
    "synthetic-corpus-evidence",
  );
  const configurationAuthorityRef = digestedRef(
    "configuration_authority",
    "synthetic-configuration-authority",
  );
  const limitationRefs = [
    digestedRef("limitation", "bounded-coverage-limitation", "limitation-a"),
    digestedRef("limitation", "source-reference-limitation", "limitation-b"),
  ].sort((left, right) =>
    `${left.kind}:${left.id}@${left.version}`.localeCompare(
      `${right.kind}:${right.id}@${right.version}`,
    ),
  );
  return {
    id: "synthetic-analyzed-corpus",
    version: "1.0.0",
    synthetic: true,
    trustDomain: "synthetic_test_only",
    generatedAt: "3785-02-02T00:00:02Z",
    dataAsOf: record.sourceHealth.dataAsOf,
    projectionInputs: {
      regionPackRef: digestedRef("region_pack", "synthetic-region-pack"),
      deploymentProfileRef: digestedRef(
        "deployment_profile",
        "synthetic-deployment-profile",
      ),
      taxonomyRef: digestedRef("taxonomy", "synthetic-taxonomy"),
      configurationAuthorityRef,
      visibilityPolicyRef: digestedRef(
        "visibility_policy",
        "synthetic-visibility-policy",
      ),
      limitationRefs,
    },
    sourceEvidenceBindings: [
      {
        kind: "source_evidence_binding",
        id: "synthetic-source-evidence-binding",
        version: "1.0.0",
        synthetic: true,
        trustDomain: "synthetic_test_only",
        sourceId: record.source.id,
        visibility,
        syntheticEvidenceRef: evidenceRef,
        fieldPolicyRef: digestedRef(
          "synthetic_field_policy",
          "synthetic-field-policy",
        ),
        revisionRef: digestedRef(
          "synthetic_normalized_revision",
          "synthetic-normalized-revision",
        ),
        lifecycleEvaluationRef: digestedRef(
          "synthetic_lifecycle_evaluation",
          "synthetic-lifecycle-evaluation",
        ),
        lifecycleScopeRef: digestedRef(
          "synthetic_lifecycle_scope",
          "synthetic-lifecycle-scope",
        ),
        artifactEligibilityRef: digestedRef(
          "synthetic_artifact_eligibility",
          "synthetic-artifact-eligibility",
        ),
        coverageRef: digestedRef(
          "synthetic_bounded_coverage",
          "synthetic-bounded-coverage",
        ),
        healthRefs: [
          "source_contract",
          "acquisition_operation",
          "selected_range",
        ].map((scope) => ({
          scope,
          evidenceRef: digestedRef(
            "synthetic_health_evidence",
            `synthetic-${scope.replaceAll("_", "-")}-health-evidence`,
          ),
        })),
        reviewRef: digestedRef(
          "synthetic_review_evidence",
          "synthetic-review-evidence",
        ),
        reviewExpiresAt: "3785-03-01T00:00:00Z",
        lkgRef: null,
      },
    ],
    recordEntries: [
      {
        record,
        sourceEvidenceBindingRef: {
          id: "synthetic-source-evidence-binding",
          version: "1.0.0",
        },
        whyShown: {
          basis: "general_jurisdiction",
          evidenceField: "/jurisdiction/generalJurisdictionOnly",
          configurationAuthorityRef,
          ruleRef: digestedRef(
            "why_shown_rule",
            "synthetic-general-jurisdiction-rule",
          ),
          validFrom: "3785-02-01T00:00:00Z",
          validThrough: "3785-03-01T00:00:00Z",
          reviewEvidenceRef: digestedRef(
            "synthetic_review_evidence",
            "synthetic-review-evidence",
          ),
          nonClaims: [...REQUIRED_ANALYZED_CORPUS_NON_CLAIMS],
        },
        visibility,
      },
    ],
    views: [
      {
        id: "synthetic-reference-view",
        version: "1.0.0",
        visibility,
        recordIds: [record.internalId],
        limitationRefs,
      },
      {
        id: "synthetic-secondary-view",
        version: "1.0.0",
        visibility,
        recordIds: [record.internalId],
        limitationRefs,
      },
    ],
  };
}

async function createSynthetic() {
  return createAnalyzedCorpus(inputFor(await syntheticRecord()));
}

function assertCode(code) {
  return (error) => {
    assert.ok(error instanceof AnalyzedCorpusValidationError);
    const accepted = Array.isArray(code) ? code : [code];
    assert.ok(
      accepted.includes(error.code),
      `expected ${accepted.join(" or ")}, received ${error.code}`,
    );
    return true;
  };
}

test("analyzed-corpus schema is strict and cross-references PolicyRecord 1.4", async () => {
  const [corpusSchema, recordSchema] = await Promise.all(
    [
      "schemas/analyzed-corpus.schema.v1.json",
      "schemas/record.schema.v1.json",
    ].map(async (path) =>
      JSON.parse(await readFile(new URL(path, root), "utf8")),
    ),
  );
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(recordSchema);
  const validate = ajv.compile(corpusSchema);
  const corpus = await createSynthetic();
  assert.equal(validate(corpus), true, JSON.stringify(validate.errors));
  assert.equal(corpus.$schema, ANALYZED_CORPUS_SCHEMA_ID);
  assert.equal(corpus.schemaVersion, ANALYZED_CORPUS_SCHEMA_VERSION);

  const malformed = clone(corpus);
  malformed.recordEntries[0].record.officialTitle = 42;
  reseal(malformed);
  assert.equal(validate(malformed), false);
});

test("creation is deterministic, detached, deeply frozen, and stores one record copy", async () => {
  const record = await syntheticRecord();
  const input = inputFor(record);
  const first = createAnalyzedCorpus(input);
  const secondInput = inputFor(clone(record));
  secondInput.views.reverse();
  secondInput.recordEntries[0].record.fieldProvenance.reverse();
  const second = createAnalyzedCorpus(secondInput);

  assert.equal(serializeAnalyzedCorpus(first), serializeAnalyzedCorpus(second));
  assert.equal(first.contentDigest, second.contentDigest);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(
    Object.isFrozen(first.recordEntries[0].record.fieldProvenance),
    true,
  );
  assert.equal(Object.isFrozen(first.views[0].recordRefs[0]), true);
  record.officialTitle = "mutated after capture";
  assert.notEqual(
    first.recordEntries[0].record.officialTitle,
    record.officialTitle,
  );

  const serialized = serializeAnalyzedCorpus(first);
  assert.equal(
    serialized.split(first.recordEntries[0].record.officialTitle).length - 1,
    1,
  );
  assert.deepEqual(Object.keys(first.views[0].recordRefs[0]), [
    "recordId",
    "recordDigest",
    "sourceEvidenceBindingRef",
  ]);

  const noncanonicalSnapshot = clone(first);
  noncanonicalSnapshot.recordEntries[0].record.fieldProvenance.reverse();
  reseal(noncanonicalSnapshot);
  assert.throws(
    () => parseAnalyzedCorpus(noncanonicalSnapshot),
    assertCode("NON_CANONICAL_ORDER"),
  );
});

test("parse, compatibility, and projection require exact caller pins", async () => {
  const corpus = await createSynthetic();
  const parsed = parseAnalyzedCorpus(
    JSON.parse(serializeAnalyzedCorpus(corpus)),
  );
  const expectation = {
    corpusRef: corpusRef(corpus),
    synthetic: true,
    trustDomain: "synthetic_test_only",
    recordSchemaRef: corpus.recordSchemaRef,
  };
  assert.equal(
    assertAnalyzedCorpusCompatibility(parsed, expectation).contentDigest,
    corpus.contentDigest,
  );

  const request = {
    expectedCorpusRef: corpusRef(corpus),
    contextRef: digestedRef(
      "projection_context",
      "synthetic-projection-context",
    ),
    expectedViewRef: viewRef(corpus.views[0]),
    expectedRecordRefs: corpus.views[0].recordRefs,
  };
  const first = projectAnalyzedCorpus(corpus, request);
  const second = projectAnalyzedCorpus(corpus, clone(request));
  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first.recordRefs), true);
  assert.deepEqual(Object.keys(first.recordRefs[0]), [
    "recordId",
    "recordDigest",
    "sourceEvidenceBindingRef",
  ]);

  const wrongCorpus = clone(expectation);
  wrongCorpus.corpusRef.contentDigest = "f".repeat(64);
  assert.throws(
    () => assertAnalyzedCorpusCompatibility(corpus, wrongCorpus),
    assertCode("CORPUS_PIN_MISMATCH"),
  );
  const wrongView = clone(request);
  wrongView.expectedViewRef.contentDigest = "e".repeat(64);
  assert.throws(
    () => projectAnalyzedCorpus(corpus, wrongView),
    assertCode("VIEW_PIN_MISMATCH"),
  );
});

test("references close exactly and views cannot omit or substitute limitations", async () => {
  const corpus = await createSynthetic();

  const bindingSubstitution = clone(corpus);
  bindingSubstitution.recordEntries[0].sourceEvidenceBindingRef.contentDigest =
    "a".repeat(64);
  reseal(bindingSubstitution);
  assert.throws(
    () => parseAnalyzedCorpus(bindingSubstitution),
    assertCode("UNRESOLVED_REFERENCE"),
  );

  const limitationSubstitution = clone(corpus);
  limitationSubstitution.views[0].limitationRefs[0].digest = "b".repeat(64);
  reseal(limitationSubstitution.views[0]);
  reseal(limitationSubstitution);
  assert.throws(
    () => parseAnalyzedCorpus(limitationSubstitution),
    assertCode("UNRESOLVED_REFERENCE"),
  );

  const limitationOmission = clone(corpus);
  limitationOmission.views[0].limitationRefs.pop();
  reseal(limitationOmission.views[0]);
  reseal(limitationOmission);
  assert.throws(
    () => parseAnalyzedCorpus(limitationOmission),
    assertCode("LIMITATION_OMISSION"),
  );
});

test("record and source compound identities are unique even across reference-only views", async () => {
  const record = await syntheticRecord();
  const input = inputFor(record);
  const secondRecord = clone(record);
  secondRecord.internalId = "psr:synthetic-federal:record-002";
  const secondBinding = clone(input.sourceEvidenceBindings[0]);
  secondBinding.id = "synthetic-second-source-evidence-binding";
  input.sourceEvidenceBindings.push(secondBinding);
  const secondEntry = clone(input.recordEntries[0]);
  secondEntry.record = secondRecord;
  secondEntry.sourceEvidenceBindingRef.id = secondBinding.id;
  input.recordEntries.push(secondEntry);
  input.views.forEach((view) => {
    view.recordIds.push(secondRecord.internalId);
    view.recordIds.sort();
  });

  assert.throws(
    () => createAnalyzedCorpus(input),
    assertCode("DUPLICATE_RECORD"),
  );
});

test("the source-neutral child enforces general jurisdiction, Unclassified, zero Nation, no AI, and complete provenance", async () => {
  const cases = [
    [
      "record identity namespace",
      (record) => {
        record.internalId = "psr:synthetic-other:record-001";
      },
      "RECORD_IDENTITY_MISMATCH",
    ],
    [
      "general jurisdiction",
      (record) => {
        record.jurisdiction.generalJurisdictionOnly = false;
      },
      ["INVALID_POLICY_RECORD", "INVALID_LITERAL"],
    ],
    [
      "Nation association",
      (record) => {
        record.nationAssociations.push({});
      },
      ["INVALID_POLICY_RECORD", "INVALID_BOUNDS"],
    ],
    [
      "classification",
      (record) => {
        record.isUnclassified = false;
      },
      ["INVALID_POLICY_RECORD", "INVALID_LITERAL"],
    ],
    [
      "AI",
      (record) => {
        record.aiSummary = {
          exists: true,
          label: "AI-generated source summary",
          text: "synthetic",
          generatedAt: "2026-07-30T12:00:00Z",
          model: "synthetic",
          provider: "synthetic",
          buildId: "synthetic",
          policyVersion: "1.0.0",
          citedInputs: [],
          validationState: "pending",
        };
      },
      ["INVALID_POLICY_RECORD", "INVALID_SHAPE"],
    ],
    [
      "rejected data quality",
      (record) => {
        record.dataQuality.state = "rejected";
        record.dataQuality.validatedAt = null;
        record.dataQuality.validator = null;
        record.dataQuality.issues = ["synthetic rejection"];
      },
      "INVALID_LITERAL",
    ],
    [
      "pending data quality",
      (record) => {
        record.dataQuality.state = "pending";
      },
      "INVALID_LITERAL",
    ],
    [
      "contradictory relevance label",
      (record) => {
        record.relevance[0].label = "Nation-specific legal applicability";
      },
      "INVALID_LITERAL",
    ],
    [
      "contradictory relevance evidence",
      (record) => {
        record.relevance[0].evidence =
          "Membership and geography establish a consultation obligation.";
      },
      "INVALID_LITERAL",
    ],
    [
      "laundered project-owned relevance provenance",
      (record) => {
        for (const entry of record.fieldProvenance) {
          if (
            entry.field === "/relevance/0/label" ||
            entry.field === "/relevance/0/evidence"
          ) {
            entry.sourcePath = "$.officialText";
            entry.transformation = "copied";
            entry.transformRuleId = null;
          }
        }
      },
      "INVALID_LITERAL",
    ],
    [
      "real full-text URL in synthetic record",
      (record) => {
        record.urls.officialFullText =
          "https://www.federalregister.gov/documents/example";
      },
      "SYNTHETIC_URL_BOUNDARY",
    ],
    [
      "non-HTTPS full-text URL",
      (record) => {
        record.urls.officialFullText =
          "http://official.example.invalid/records/SYN-001.pdf";
      },
      "SYNTHETIC_URL_BOUNDARY",
    ],
    [
      "credentialed synthetic URL",
      (record) => {
        const credentialed =
          "https://user:token@official.example.invalid/records/SYN-001";
        record.urls.officialSource = credentialed;
        record.relevance[0].sourceUrl = credentialed;
        record.fieldProvenance.forEach((entry) => {
          entry.sourceUrl = credentialed;
        });
      },
      "SYNTHETIC_URL_BOUNDARY",
    ],
    [
      "empty-credential synthetic URL",
      (record) => {
        record.urls.officialFullText =
          "https://@official.example.invalid/records/SYN-001.pdf";
      },
      "SYNTHETIC_URL_BOUNDARY",
    ],
    [
      "ported synthetic URL",
      (record) => {
        record.urls.officialFullText =
          "https://official.example.invalid:443/records/SYN-001.pdf";
      },
      "SYNTHETIC_URL_BOUNDARY",
    ],
    [
      "empty-port synthetic URL",
      (record) => {
        record.urls.officialFullText =
          "https://official.example.invalid:/records/SYN-001.pdf";
      },
      "SYNTHETIC_URL_BOUNDARY",
    ],
    [
      "provenance",
      (record) => {
        record.fieldProvenance.pop();
      },
      "INVALID_BOUNDS",
    ],
    [
      "provenance source URL",
      (record) => {
        record.fieldProvenance[0].sourceUrl =
          "https://different.example.invalid/record";
      },
      "INVALID_LITERAL",
    ],
    [
      "provenance retrieval time",
      (record) => {
        record.fieldProvenance[0].retrievedAt = "2026-07-30T12:00:01Z";
      },
      "INVALID_LITERAL",
    ],
    [
      "provenance source update time",
      (record) => {
        record.fieldProvenance[0].sourceUpdatedAt = null;
      },
      "INVALID_LITERAL",
    ],
    [
      "untouched PolicyRecord field",
      (record) => {
        record.officialTitle = 42;
      },
      "INVALID_POLICY_RECORD",
    ],
  ];
  for (const [label, mutate, code] of cases) {
    const record = await syntheticRecord();
    mutate(record);
    assert.throws(
      () => createAnalyzedCorpus(inputFor(record)),
      assertCode(code),
      label,
    );
  }
});

test("synthetic evidence is distinct from real lifecycle fields", async () => {
  const input = inputFor(await syntheticRecord());
  input.sourceEvidenceBindings[0].lifecycleBundleRef = {
    kind: "real_source_lifecycle_bundle",
    id: "forbidden-real-bundle",
    version: "1.0.0",
    contentDigest: "a".repeat(64),
  };
  assert.throws(() => createAnalyzedCorpus(input), assertCode("INVALID_SHAPE"));
});

test("emitted records reconcile source health with exclusive LKG evidence", async () => {
  const failedRecord = await syntheticRecord();
  failedRecord.sourceHealth.status = "failed";
  assert.throws(
    () => createAnalyzedCorpus(inputFor(failedRecord)),
    assertCode("UNUSABLE_SOURCE_HEALTH"),
  );

  const neverSuccessful = await syntheticRecord();
  neverSuccessful.sourceHealth.lastSuccessfulRetrievalAt = null;
  assert.throws(
    () => createAnalyzedCorpus(inputFor(neverSuccessful)),
    assertCode("MISSING_LAST_SUCCESSFUL_RETRIEVAL"),
  );

  const unknownRecord = await syntheticRecord();
  unknownRecord.sourceHealth.status = "unknown";
  assert.throws(
    () => createAnalyzedCorpus(inputFor(unknownRecord)),
    assertCode("UNUSABLE_SOURCE_HEALTH"),
  );

  const mismatchedRetrieval = await syntheticRecord();
  mismatchedRetrieval.sourceHealth.lastSuccessfulRetrievalAt =
    "2026-07-30T11:59:59Z";
  assert.throws(
    () => createAnalyzedCorpus(inputFor(mismatchedRetrieval)),
    assertCode("HEALTH_RETRIEVAL_MISMATCH"),
  );

  const healthyLkgRecord = await syntheticRecord();
  healthyLkgRecord.sourceHealth.usingLastKnownGood = true;
  const healthyLkg = inputFor(healthyLkgRecord);
  healthyLkg.sourceEvidenceBindings[0].lkgRef = digestedRef(
    "synthetic_lkg_evidence",
    "synthetic-lkg-evidence",
  );
  assert.throws(
    () => createAnalyzedCorpus(healthyLkg),
    assertCode("INVALID_LKG_STATE"),
  );

  const unboundLkgRecord = await syntheticRecord();
  unboundLkgRecord.sourceHealth.status = "degraded";
  unboundLkgRecord.sourceHealth.usingLastKnownGood = true;
  assert.throws(
    () => createAnalyzedCorpus(inputFor(unboundLkgRecord)),
    assertCode("LKG_REFERENCE_REQUIRED"),
  );

  const degradedFreshRecord = await syntheticRecord();
  degradedFreshRecord.sourceHealth.status = "degraded";
  assert.throws(
    () => createAnalyzedCorpus(inputFor(degradedFreshRecord)),
    assertCode("INVALID_LKG_STATE"),
  );

  const unusedLkg = inputFor(await syntheticRecord());
  unusedLkg.sourceEvidenceBindings[0].lkgRef = digestedRef(
    "synthetic_lkg_evidence",
    "synthetic-lkg-evidence",
  );
  assert.throws(
    () => createAnalyzedCorpus(unusedLkg),
    assertCode("UNEXPECTED_LKG_REFERENCE"),
  );

  const healthyMessageRecord = await syntheticRecord();
  healthyMessageRecord.sourceHealth.message = "Synthetic degradation.";
  assert.throws(
    () => createAnalyzedCorpus(inputFor(healthyMessageRecord)),
    assertCode("INVALID_HEALTH_MESSAGE"),
  );

  const blankDegradedMessageRecord = await syntheticRecord();
  blankDegradedMessageRecord.sourceHealth.status = "degraded";
  blankDegradedMessageRecord.sourceHealth.usingLastKnownGood = true;
  blankDegradedMessageRecord.sourceHealth.message = "   ";
  const blankDegradedMessage = inputFor(blankDegradedMessageRecord);
  blankDegradedMessage.sourceEvidenceBindings[0].lkgRef = digestedRef(
    "synthetic_lkg_evidence",
    "synthetic-lkg-evidence",
  );
  assert.throws(
    () => createAnalyzedCorpus(blankDegradedMessage),
    assertCode("INVALID_HEALTH_MESSAGE"),
  );

  const degradedLkgRecord = await syntheticRecord();
  degradedLkgRecord.sourceHealth.status = "degraded";
  degradedLkgRecord.sourceHealth.usingLastKnownGood = true;
  degradedLkgRecord.sourceHealth.message =
    "Synthetic source refresh failed; validated test-only fallback retained.";
  const degradedLkg = inputFor(degradedLkgRecord);
  degradedLkg.sourceEvidenceBindings[0].lkgRef = digestedRef(
    "synthetic_lkg_evidence",
    "synthetic-lkg-evidence",
  );
  const corpus = createAnalyzedCorpus(degradedLkg);
  assert.equal(
    corpus.recordEntries[0].record.sourceHealth.usingLastKnownGood,
    true,
  );
  assert.equal(
    corpus.sourceEvidenceBindings[0].lkgRef.kind,
    "synthetic_lkg_evidence",
  );
});

test("corpus dataAsOf is the deterministic maximum record health date and health time is causal", async () => {
  const record = await syntheticRecord();
  const multi = inputFor(record);
  const secondRecord = clone(record);
  secondRecord.internalId = "psr:synthetic-federal:record-002";
  secondRecord.source.recordId = "SYN-002";
  secondRecord.sourceHealth.dataAsOf = "2026-07-30T11:00:00Z";
  secondRecord.fieldProvenance.forEach((entry) => {
    entry.sourceRecordId = secondRecord.source.recordId;
  });
  const secondBinding = clone(multi.sourceEvidenceBindings[0]);
  secondBinding.id = "synthetic-second-source-evidence-binding";
  multi.sourceEvidenceBindings.push(secondBinding);
  const secondEntry = clone(multi.recordEntries[0]);
  secondEntry.record = secondRecord;
  secondEntry.sourceEvidenceBindingRef.id = secondBinding.id;
  multi.recordEntries.push(secondEntry);
  multi.views.forEach((view) => {
    view.recordIds.push(secondRecord.internalId);
    view.recordIds.sort();
  });
  multi.dataAsOf = secondRecord.sourceHealth.dataAsOf;
  assert.equal(createAnalyzedCorpus(multi).dataAsOf, multi.dataAsOf);

  const drifted = inputFor(record);
  drifted.dataAsOf = "3785-02-02T00:00:01Z";
  assert.throws(
    () => createAnalyzedCorpus(drifted),
    assertCode("INVALID_LITERAL"),
  );

  const futureRecord = await syntheticRecord();
  futureRecord.sourceHealth.checkedAt = "3785-02-03T00:00:00Z";
  const future = inputFor(futureRecord);
  assert.throws(
    () => createAnalyzedCorpus(future),
    assertCode("INVALID_HEALTH_TIME_ORDER"),
  );

  const validationAfterGeneration = inputFor(await syntheticRecord());
  validationAfterGeneration.generatedAt = "2026-07-30T12:00:30Z";
  assert.throws(
    () => createAnalyzedCorpus(validationAfterGeneration),
    assertCode("FUTURE_VALIDATION"),
  );
});

test("every synthetic provenance/lifecycle axis is digest-bound without claiming admission or currentness", async () => {
  const record = await syntheticRecord();
  const baselineInput = inputFor(record);
  const baseline = createAnalyzedCorpus(baselineInput);
  const mutations = [
    (binding) => {
      binding.syntheticEvidenceRef.digest = "1".repeat(64);
    },
    (binding) => {
      binding.fieldPolicyRef.digest = "2".repeat(64);
    },
    (binding) => {
      binding.revisionRef.digest = "3".repeat(64);
    },
    (binding) => {
      binding.lifecycleEvaluationRef.digest = "4".repeat(64);
    },
    (binding) => {
      binding.lifecycleScopeRef.digest = "5".repeat(64);
    },
    (binding) => {
      binding.artifactEligibilityRef.digest = "6".repeat(64);
    },
    (binding) => {
      binding.coverageRef.digest = "7".repeat(64);
    },
    (binding) => {
      binding.healthRefs[0].evidenceRef.digest = "8".repeat(64);
    },
    (binding) => {
      binding.healthRefs[1].evidenceRef.digest = "9".repeat(64);
    },
    (binding) => {
      binding.healthRefs[2].evidenceRef.digest = "a".repeat(64);
    },
    (binding, input) => {
      binding.reviewRef.digest = "b".repeat(64);
      input.recordEntries[0].whyShown.reviewEvidenceRef.digest = "b".repeat(64);
    },
  ];
  for (const mutate of mutations) {
    const input = clone(baselineInput);
    mutate(input.sourceEvidenceBindings[0], input);
    const changed = createAnalyzedCorpus(input);
    assert.notEqual(changed.contentDigest, baseline.contentDigest);
  }
  const lkgInput = clone(baselineInput);
  lkgInput.recordEntries[0].record.sourceHealth.status = "degraded";
  lkgInput.recordEntries[0].record.sourceHealth.usingLastKnownGood = true;
  lkgInput.recordEntries[0].record.sourceHealth.message =
    "Synthetic source refresh failed; validated test-only fallback retained.";
  lkgInput.sourceEvidenceBindings[0].lkgRef = digestedRef(
    "synthetic_lkg_evidence",
    "synthetic-lkg-evidence",
  );
  const lkgBaseline = createAnalyzedCorpus(lkgInput);
  const changedLkgInput = clone(lkgInput);
  changedLkgInput.sourceEvidenceBindings[0].lkgRef.digest = "c".repeat(64);
  const changedLkg = createAnalyzedCorpus(changedLkgInput);
  assert.notEqual(changedLkg.contentDigest, lkgBaseline.contentDigest);
  const binding = baseline.sourceEvidenceBindings[0];
  for (const forbidden of [
    "state",
    "qualified",
    "admitted",
    "active",
    "current",
  ])
    assert.equal(Object.hasOwn(binding, forbidden), false, forbidden);
});

test("all real-source creation fails closed, including the current evidence-blocked candidate", async () => {
  const candidate = JSON.parse(
    await readFile(
      new URL(
        "fixtures/engine/real-source-lifecycle.candidate.valid.json",
        root,
      ),
      "utf8",
    ),
  );
  assert.equal(candidate.lifecycleState, "evidence_blocked");

  const record = await syntheticRecord();
  record.internalId = "psr:federal-register:record-001";
  record.source.id = "federal-register";
  record.source.adapterId = "federal-register-tier1";
  record.fieldProvenance.forEach((entry) => {
    entry.sourceId = record.source.id;
    entry.adapterId = record.source.adapterId;
  });
  const input = inputFor(record);
  input.synthetic = false;
  input.trustDomain = "real_source_local_prerelease";
  const contentRef = (kind, id, contentDigest = "a".repeat(64)) => ({
    kind,
    id,
    version: "1.0.0",
    contentDigest,
  });
  input.sourceEvidenceBindings = [
    {
      kind: "source_evidence_binding",
      id: "federal-register-source-evidence-binding",
      version: "1.0.0",
      synthetic: false,
      trustDomain: "real_source_local_prerelease",
      sourceId: "federal-register",
      visibility,
      lifecycleAsOf: candidate.lifecycleAsOf,
      lifecycleEvaluationDigest: "b".repeat(64),
      lifecycleBundleRef: contentRef(
        "real_source_lifecycle_bundle",
        candidate.id,
        candidate.contentDigest,
      ),
      lifecycleScopeRef: contentRef(
        "lifecycle_scope",
        candidate.scope.id,
        candidate.scope.contentDigest,
      ),
      fieldPolicyRef: {
        kind: "field_policy",
        ...candidate.scope.fieldPolicyRef,
      },
      revisionRef: digestedRef(
        "normalized_revision",
        "unavailable-normalized-revision",
      ),
      artifactEligibilityRef: contentRef(
        "artifact_eligibility_receipt",
        "unavailable-artifact-eligibility",
      ),
      coverageRef: contentRef("coverage_receipt", "unavailable-coverage"),
      healthRefs: [
        "source_contract",
        "acquisition_operation",
        "selected_range",
      ].map((scope) => ({
        scope,
        receiptRef: contentRef(
          "health_receipt",
          `unavailable-${scope.replaceAll("_", "-")}-health`,
        ),
      })),
      reviewRef: contentRef("review_receipt", "unavailable-review"),
      reviewExpiresAt: "3785-03-01T00:00:00Z",
      lkgRef: null,
    },
  ];
  input.recordEntries[0].sourceEvidenceBindingRef.id =
    "federal-register-source-evidence-binding";
  input.recordEntries[0].whyShown.reviewEvidenceRef =
    input.sourceEvidenceBindings[0].reviewRef;

  assert.throws(
    () => createAnalyzedCorpus(input),
    assertCode("REAL_SOURCE_LIFECYCLE_INTEGRATION_REQUIRED"),
  );
});

test("plain-JSON capture rejects getters, custom prototypes, cycles, and unpaired surrogates", async () => {
  const base = inputFor(await syntheticRecord());
  let getterCalls = 0;
  const getterInput = clone(base);
  Object.defineProperty(getterInput, "id", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "synthetic-analyzed-corpus";
    },
  });
  assert.throws(
    () => createAnalyzedCorpus(getterInput),
    assertCode("INVALID_JSON"),
  );
  assert.equal(getterCalls, 0);

  const customPrototype = clone(base);
  Object.setPrototypeOf(customPrototype.projectionInputs, { inherited: true });
  assert.throws(
    () => createAnalyzedCorpus(customPrototype),
    assertCode("INVALID_JSON"),
  );

  const cycle = clone(base);
  cycle.views[0].cycle = cycle;
  assert.throws(() => createAnalyzedCorpus(cycle), assertCode("INVALID_JSON"));

  const surrogate = clone(base);
  surrogate.id = `synthetic-${String.fromCharCode(0xd800)}`;
  assert.throws(
    () => createAnalyzedCorpus(surrogate),
    assertCode("INVALID_JSON"),
  );

  const nonfinite = clone(base);
  nonfinite.untrustedNumber = Number.POSITIVE_INFINITY;
  assert.throws(
    () => createAnalyzedCorpus(nonfinite),
    assertCode("INVALID_JSON"),
  );

  const unsafe = clone(base);
  unsafe.untrustedNumber = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => createAnalyzedCorpus(unsafe), assertCode("INVALID_JSON"));

  const sparse = clone(base);
  sparse.views = [];
  sparse.views.length = 1;
  assert.throws(() => createAnalyzedCorpus(sparse), assertCode("INVALID_JSON"));
});

test("runtime contains no network, environment, clock, timer, random, filesystem, or logging capability", async () => {
  const source = (
    await Promise.all(
      [
        "src/pipeline/analyzed-corpus.mjs",
        "src/core/analyzed-corpus.mjs",
        "scripts/configured-analyzed-corpus.mjs",
      ].map((path) => readFile(new URL(path, root), "utf8")),
    )
  ).join("\n");
  for (const forbidden of [
    /node:(?:fs|http|https|net|tls|dns|child_process)/u,
    /\b(?:fetch|setTimeout|setInterval|XMLHttpRequest|WebSocket)\s*\(/u,
    /\bprocess(?:\.|\[)/u,
    /\bconsole\./u,
    /\b(?:Date\.now|performance\.now|Math\.random)\s*\(/u,
  ]) {
    assert.doesNotMatch(source, forbidden);
  }
});

test("corpus facade retains exact exports and shared singleton/configured identities", () => {
  const shared = [
    "ANALYZED_CORPUS_SCHEMA_ID",
    "ANALYZED_CORPUS_SCHEMA_VERSION",
    "AnalyzedCorpusValidationError",
    "REQUIRED_ANALYZED_CORPUS_NON_CLAIMS",
    "SYNTHETIC_APPLICATION_PROFILE",
    "canonicalCorpusDigest",
  ];
  const configured = [
    "syntheticApplicationPins",
    "createAnalyzedCorpus",
    "parseAnalyzedCorpus",
    "serializeAnalyzedCorpus",
    "assertAnalyzedCorpusCompatibility",
    "projectAnalyzedCorpus",
  ];
  assert.deepEqual(
    Object.keys(legacyCorpus).sort(),
    [...shared, ...configured].sort(),
  );
  for (const name of shared) assert.equal(legacyCorpus[name], pureCorpus[name]);
  for (const name of configured)
    assert.equal(legacyCorpus[name], configuredCorpus[name]);
});
