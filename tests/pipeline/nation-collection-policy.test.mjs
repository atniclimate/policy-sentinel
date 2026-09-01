import { readFileSync } from "node:fs";
import { URL } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  createArtifactDocuments,
  generateSyntheticNations,
} from "../../src/pipeline/artifact.mjs";
import {
  assertNationCollectionPolicy,
  validateNationCollectionPolicy,
} from "../../src/pipeline/nation-collection-policy.mjs";
import {
  completeSyntheticProvenance,
  validateRecordSetPolicy,
} from "../../src/pipeline/policy-validation.mjs";

const GENERATED_AT = "2026-08-03T00:00:00.000Z";
const RETRIEVED_AT = "2026-08-01T00:00:00.000Z";
const REVIEWED_AT = "2026-08-02T00:00:00.000Z";
const PUBLICATION_DATE = "2026-01-30";
const IDENTITY_RULE_ID = "reviewed-recognition-identity-v1";
const STRUCTURED_URL =
  "https://recognition.example.invalid/2026/structured.html";
const OFFICIAL_TEXT_URL =
  "https://recognition.example.invalid/2026/official.html";
const OFFICIAL_PDF_URL =
  "https://recognition.example.invalid/2026/official.pdf";

function readJson(relativePath) {
  return JSON.parse(
    readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8"),
  );
}

const artifactSchema = readJson("schemas/artifact.schema.v1.json");
const sourceRegistry = readJson("config/sources.v1.json");
const taxonomy = readJson("config/taxonomy.v1.json");
const countyFixture = readJson("fixtures/records/county-explicit.valid.json");
const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
});
addFormats(ajv);
const validateArtifactSchema = ajv.compile(artifactSchema);

function syntheticCollection() {
  return {
    artifactType: "nation-collection",
    schemaVersion: "1.0.0",
    generatedAt: GENERATED_AT,
    baseline: {
      count: 575,
      version: "synthetic-575-v1",
      authorityName: "Synthetic recognition baseline",
      authorityUrl:
        "https://official.example.invalid/recognition/synthetic-575",
      synthetic: true,
    },
    nations: generateSyntheticNations(),
  };
}

function provenance(field, overrides = {}) {
  return {
    field,
    sourceUrl: STRUCTURED_URL,
    sourceDate: PUBLICATION_DATE,
    retrievedAt: RETRIEVED_AT,
    transformation: field === "/id" ? "deterministic_mapping" : "copied",
    transformRuleId: field === "/id" ? IDENTITY_RULE_ID : null,
    validationState: "validated",
    ...overrides,
  };
}

function productionNation(index) {
  const sequence = String(index + 1).padStart(3, "0");
  const officialName = `Reviewed Nation ${sequence}`;
  const sourceIdentifier = `recognition-paragraph-${sequence}`;
  const sourceEvidence = [
    {
      exactText: officialName,
      paragraphId: sourceIdentifier,
      page: String(index + 1),
      section: "contiguous_48",
      sourceUrl: STRUCTURED_URL,
      officialTextUrl: OFFICIAL_TEXT_URL,
      officialPdfUrl: OFFICIAL_PDF_URL,
    },
  ];
  if (index < 2) {
    sourceEvidence.push({
      exactText: `Reviewed reconciliation row ${sequence}`,
      paragraphId: `reconciliation-paragraph-${sequence}`,
      page: String(index + 1),
      section: "contiguous_48",
      sourceUrl: STRUCTURED_URL,
      officialTextUrl: OFFICIAL_TEXT_URL,
      officialPdfUrl: OFFICIAL_PDF_URL,
    });
  }

  const authorizedAliases = index === 0 ? ["Reviewed Nation One Alias"] : [];
  const aliasUrl =
    "https://crosswalk.example.invalid/official-aliases/reviewed-nation-001";
  const fieldProvenance = [
    provenance("/id"),
    provenance("/officialName"),
    provenance("/recognitionBaselineVersion"),
    provenance("/sourceIdentifier"),
    provenance("/officialListEntry"),
    provenance("/section"),
    provenance(
      "/sourceEvidence",
      index < 2
        ? {
            transformation: "combined",
            transformRuleId: "reviewed-row-reconciliation-v1",
          }
        : {},
    ),
  ];
  if (authorizedAliases.length > 0) {
    fieldProvenance.push(
      provenance("/authorizedAliases", {
        sourceUrl: aliasUrl,
        transformation: "reconciled_official_cross_reference",
        transformRuleId: "reviewed-alias-cross-reference-v1",
      }),
    );
  }

  return {
    id: `nation:reviewed-${sequence}`,
    officialName,
    authorizedAliases,
    recognitionBaselineVersion: "reviewed-2026-v1",
    stateCoverage: {
      states: [],
      federalOnly: true,
      basis: "unresolved_no_reviewed_crosswalk",
    },
    aliasProvenance:
      authorizedAliases.length === 0
        ? []
        : [
            {
              alias: authorizedAliases[0],
              basis: "official_cross_reference",
              evidenceText: `${authorizedAliases[0]} is the exact official cross-reference.`,
              evidenceUrl: aliasUrl,
              retrievedAt: RETRIEVED_AT,
              validationState: "validated",
            },
          ],
    sourceIdentifier,
    officialListEntry: officialName,
    section: "contiguous_48",
    sourceEvidence,
    fieldProvenance,
  };
}

function productionCollection() {
  return {
    artifactType: "nation-collection",
    schemaVersion: "1.0.0",
    registryVersion: "1.0.0",
    generatedAt: GENERATED_AT,
    baseline: {
      count: 575,
      version: "reviewed-2026-v1",
      authorityName: "Synthetic reviewed recognition contract authority",
      authorityUrl:
        "https://recognition.example.invalid/2026/document-metadata",
      synthetic: false,
      documentNumber: "TEST-2026-001",
      publicationDate: PUBLICATION_DATE,
      officialTextUrl: OFFICIAL_TEXT_URL,
      officialPdfUrl: OFFICIAL_PDF_URL,
      structuredTranscriptionUrl: STRUCTURED_URL,
    },
    identityRule: {
      id: IDENTITY_RULE_ID,
      version: "1.0.0",
      description:
        "Synthetic contract fixture for a reviewed, versioned identity rule.",
    },
    publicationReview: {
      state: "completed",
      blocking: false,
      reasonCode: "independent-review-complete",
      note: "Synthetic contract fixture review only; not a live registry.",
      reviewedAt: REVIEWED_AT,
    },
    validation: {
      state: "validated",
      rawEntryCount: 577,
      reconciledNationCount: 575,
      uniqueIdCount: 575,
      uniqueOfficialNameCount: 575,
      transcriptCompared: true,
      reconciliationRuleIds: ["reviewed-row-reconciliation-v1"],
    },
    sourceHealth: {
      status: "healthy",
      checkedAt: REVIEWED_AT,
      dataAsOf: PUBLICATION_DATE,
      lastSuccessfulRetrievalAt: RETRIEVED_AT,
      usingLastKnownGood: false,
      message: null,
    },
    nations: Array.from({ length: 575 }, (_, index) => productionNation(index)),
  };
}

function assertPolicyRejects(collection, pattern, manifestSynthetic = false) {
  assert.throws(
    () =>
      assertNationCollectionPolicy(collection, {
        manifestSynthetic,
      }),
    pattern,
  );
}

test("keeps the explicit 575-entry synthetic collection valid and separate", () => {
  const collection = syntheticCollection();
  assert.equal(validateArtifactSchema(collection), true);
  assert.deepEqual(
    validateNationCollectionPolicy(collection, { manifestSynthetic: true }),
    [],
  );

  assertPolicyRejects(
    collection,
    /manifest and Nation baseline synthetic flags must match/,
    false,
  );
});

test("accepts a complete production contract with 575 identities and 577 assigned evidence rows", () => {
  const collection = productionCollection();
  assert.equal(
    validateArtifactSchema(collection),
    true,
    ajv.errorsText(validateArtifactSchema.errors),
  );
  assert.doesNotThrow(() =>
    assertNationCollectionPolicy(collection, { manifestSynthetic: false }),
  );
  assert.equal(
    collection.nations.reduce(
      (count, nation) => count + nation.sourceEvidence.length,
      0,
    ),
    577,
  );
});

test("validation is pure even when malformed aliases are rejected", () => {
  const collection = syntheticCollection();
  collection.nations[0].authorizedAliases = "not-an-array";
  const before = globalThis.structuredClone(collection);

  assert.match(
    validateNationCollectionPolicy(collection, {
      manifestSynthetic: true,
    }).join("\n"),
    /authorized aliases must be an array/,
  );
  assert.deepEqual(collection, before);
});

test("rejects missing, malformed, and temporally impossible production evidence", () => {
  const missing = productionCollection();
  missing.nations[0].fieldProvenance =
    missing.nations[0].fieldProvenance.filter(
      ({ field }) => field !== "/officialName",
    );
  assertPolicyRejects(missing, /\/officialName lacks provenance/);

  const malformed = productionCollection();
  malformed.nations[0].sourceEvidence[0].sourceUrl =
    "http://recognition.example.invalid/insecure";
  assertPolicyRejects(malformed, /source URL must be a safe HTTPS URL/);

  const future = productionCollection();
  future.nations[0].fieldProvenance[0].retrievedAt = "2026-08-04T00:00:00.000Z";
  assertPolicyRejects(future, /retrieval time is after collection generation/);

  const malformedRegistryVersion = productionCollection();
  malformedRegistryVersion.registryVersion = "reviewed-version";
  assert.equal(validateArtifactSchema(malformedRegistryVersion), false);
  assertPolicyRejects(malformedRegistryVersion, /must use semantic versioning/);

  const contradictoryHealth = productionCollection();
  contradictoryHealth.sourceHealth.lastSuccessfulRetrievalAt =
    "2026-08-02T12:00:00.000Z";
  assertPolicyRejects(
    contradictoryHealth,
    /retrieval is after its health check/,
  );

  const wrongDataAsOf = productionCollection();
  wrongDataAsOf.sourceHealth.dataAsOf = "2026-01-29";
  assertPolicyRejects(
    wrongDataAsOf,
    /data-as-of date does not match the baseline publication/,
  );
});

test("rejects duplicate IDs, names, aliases, and source identifiers", () => {
  const duplicateId = productionCollection();
  duplicateId.nations[1].id = duplicateId.nations[0].id;
  assertPolicyRejects(duplicateId, /duplicates Nation ID/);

  const duplicateName = productionCollection();
  duplicateName.nations[1].officialName = duplicateName.nations[0].officialName;
  assertPolicyRejects(duplicateName, /collides with identity/);

  const duplicateAlias = productionCollection();
  duplicateAlias.nations[1].authorizedAliases = [
    duplicateAlias.nations[0].officialName,
  ];
  assertPolicyRejects(duplicateAlias, /collides with identity/);

  const duplicateSource = productionCollection();
  duplicateSource.nations[1].sourceIdentifier =
    duplicateSource.nations[0].sourceIdentifier;
  assertPolicyRejects(duplicateSource, /duplicates source identifier/);
});

test("requires unresolved coverage to stay federal-only", () => {
  const collection = productionCollection();
  collection.nations[0].stateCoverage = {
    states: ["WA"],
    federalOnly: false,
    basis: "unresolved_no_reviewed_crosswalk",
  };

  assert.equal(validateArtifactSchema(collection), false);
  assertPolicyRejects(
    collection,
    /unresolved state coverage must remain federal-only/,
  );
});

test("requires one authoritative, provenance-bound evidence item per accepted state", () => {
  const collection = productionCollection();
  const nation = collection.nations[0];
  const stateEvidenceUrl =
    "https://state.example.invalid/official-roster/reviewed-nation-001";
  nation.stateCoverage = {
    states: ["WA"],
    federalOnly: false,
    basis: "reviewed_official_crosswalk",
    evidence: [
      {
        state: "WA",
        basis: "reviewed_official_crosswalk",
        sourceNationName: nation.officialName,
        evidenceText: `${nation.officialName} appears in the exact official state roster text.`,
        evidenceUrl: stateEvidenceUrl,
        sourceIdentifier: "official-state-roster-row-001",
        sourceDate: "2026-07-01",
        retrievedAt: RETRIEVED_AT,
        validationState: "validated",
      },
    ],
  };
  nation.fieldProvenance.push(
    provenance("/stateCoverage", {
      sourceUrl: stateEvidenceUrl,
      sourceDate: "2026-07-01",
      transformation: "reconciled_official_cross_reference",
      transformRuleId: "reviewed-state-crosswalk-v1",
    }),
  );

  assert.equal(
    validateArtifactSchema(collection),
    true,
    ajv.errorsText(validateArtifactSchema.errors),
  );
  assert.doesNotThrow(() =>
    assertNationCollectionPolicy(collection, { manifestSynthetic: false }),
  );

  nation.stateCoverage.evidence[0].state = "OR";
  assertPolicyRejects(collection, /does not uniquely match an accepted state/);
});

test("rejects unassigned evidence rows and prohibited contact, land, or private fields", () => {
  const countMismatch = productionCollection();
  countMismatch.nations[0].sourceEvidence.pop();
  assertPolicyRejects(
    countMismatch,
    /raw-entry count does not match unique source evidence/,
  );

  for (const prohibitedField of ["contact", "parcelGeometry", "privateData"]) {
    const collection = productionCollection();
    collection.nations[0][prohibitedField] = "forbidden synthetic test field";
    assert.equal(validateArtifactSchema(collection), false);
    assertPolicyRejects(collection, /contains prohibited field/);
  }
});

test("artifact creation fails closed when a synthetic Nation collection is labeled production", () => {
  const input = {
    records: [],
    nations: generateSyntheticNations(),
    taxonomy: {
      taxonomyVersion: "1.0.0",
    },
    sourceRegistry: {
      registryVersion: "1.19.0",
      sources: [],
    },
    generatedAt: GENERATED_AT,
  };

  assert.doesNotThrow(() =>
    createArtifactDocuments({ ...input, synthetic: true }),
  );
  assert.throws(
    () => createArtifactDocuments({ ...input, synthetic: false }),
    /manifest and Nation baseline synthetic flags must match/,
  );
});

test("record Nation associations must match exact collection identity and evidence", () => {
  const record = completeSyntheticProvenance(
    globalThis.structuredClone(countyFixture),
  );
  const nations = generateSyntheticNations();
  assert.doesNotThrow(() =>
    validateRecordSetPolicy([record], { sourceRegistry, taxonomy, nations }),
  );

  const wrongName = globalThis.structuredClone(record);
  wrongName.nationAssociations[0].officialNationName = "Synthetic Nation 002";
  assert.throws(
    () =>
      validateRecordSetPolicy([wrongName], {
        sourceRegistry,
        taxonomy,
        nations,
      }),
    /official Nation name does not match the validated collection/,
  );

  const wrongPair = globalThis.structuredClone(record);
  wrongPair.nationAssociations[0].nationId = "nation:synthetic-002";
  assert.throws(
    () =>
      validateRecordSetPolicy([wrongPair], {
        sourceRegistry,
        taxonomy,
        nations,
      }),
    /official Nation name does not match the validated collection/,
  );

  const weakEvidence = globalThis.structuredClone(record);
  weakEvidence.nationAssociations[0].evidenceText =
    "An unnamed government appears in the record.";
  assert.throws(
    () =>
      validateRecordSetPolicy([weakEvidence], {
        sourceRegistry,
        taxonomy,
        nations,
      }),
    /evidence does not contain an exact official name or authorized alias/,
  );

  const unboundUrl = globalThis.structuredClone(record);
  unboundUrl.nationAssociations[0].evidenceUrl =
    "https://county.example.invalid/ordinances/unbound.pdf";
  assert.throws(
    () =>
      validateRecordSetPolicy([unboundUrl], {
        sourceRegistry,
        taxonomy,
        nations,
      }),
    /evidence URL is not an official record URL/,
  );
});
