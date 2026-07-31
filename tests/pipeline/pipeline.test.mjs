import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  STATIC_ARTIFACT_BUDGET_V1,
  assertStaticArtifactBudget,
  createArtifactDocuments,
  generateSyntheticNations,
  writeArtifactDocuments,
} from "../../src/pipeline/artifact.mjs";
import {
  assertUrlSafeId,
  makeStableRecordId,
  toUrlSafeId,
} from "../../src/pipeline/identity.mjs";
import { deriveBuildId, hashJson } from "../../src/pipeline/hashing.mjs";
import {
  loadLastKnownGoodSource,
  mergeSourceRefresh,
  verifyLastKnownGoodArtifact,
} from "../../src/pipeline/last-known-good.mjs";
import {
  completeSyntheticProvenance,
  PolicyValidationError,
  sourceDerivedLeafPointers,
  validateRecordPolicy,
  validateRecordSetPolicy,
} from "../../src/pipeline/policy-validation.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

async function json(relativePath) {
  return JSON.parse(
    await readFile(path.resolve(projectRoot, relativePath), "utf8"),
  );
}

const [
  taxonomy,
  sourceRegistry,
  federalFixture,
  countyFixture,
  failureFixture,
  recordSchema,
] = await Promise.all([
  json("config/taxonomy.v1.json"),
  json("config/sources.v1.json"),
  json("fixtures/records/general-jurisdiction.valid.json"),
  json("fixtures/records/county-explicit.valid.json"),
  json("fixtures/sources/synthetic-refresh-failure.valid.json"),
  json("schemas/record.schema.v1.json"),
]);
const sourceConfigs = new Map(
  sourceRegistry.sources.map((source) => [source.id, source]),
);
const nations = generateSyntheticNations();
const preparedFederal = completeSyntheticProvenance(federalFixture);
const preparedCounty = completeSyntheticProvenance(countyFixture);
const defaultGeneratedAt = "2026-07-30T15:00:00.000Z";

function sourceHealthReceiptsFor(registry, records, receiptOverrides = []) {
  const overridesBySource = new Map(
    receiptOverrides.map((receipt) => [receipt.sourceId, receipt]),
  );
  return registry.sources
    .filter(({ enabled }) => enabled)
    .map((source) => {
      const override = overridesBySource.get(source.id);
      if (override !== undefined) {
        return globalThis.structuredClone(override);
      }
      const sourceRecords = records.filter(
        (record) => record.source.id === source.id,
      );
      const latest = sourceRecords
        .map((record) => record.sourceHealth)
        .sort((left, right) => left.checkedAt.localeCompare(right.checkedAt))
        .at(-1);
      const dataAsOf = sourceRecords
        .map((record) => record.sourceHealth.dataAsOf)
        .sort()
        .at(-1);
      const lastSuccessfulRetrievalAt = sourceRecords
        .map((record) => record.sourceHealth.lastSuccessfulRetrievalAt)
        .filter((value) => value !== null)
        .sort()
        .at(-1);
      return {
        sourceId: source.id,
        status: latest?.status ?? "unavailable",
        checkedAt: latest?.checkedAt ?? defaultGeneratedAt,
        dataAsOf: dataAsOf ?? null,
        lastSuccessfulRetrievalAt: lastSuccessfulRetrievalAt ?? null,
        usingLastKnownGood: latest?.usingLastKnownGood ?? false,
        stale:
          latest === undefined ||
          latest.usingLastKnownGood ||
          latest.status !== "healthy",
        recordCount: sourceRecords.length,
        failureStage: null,
        message:
          latest === undefined
            ? "No validated records are available."
            : latest.message,
      };
    });
}

const recordAjv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
addFormats(recordAjv);
const validateRecordSchema = recordAjv.compile(recordSchema);

function relationshipRecord(recordId, sourceDocumentRelationships) {
  const record = globalThis.structuredClone(federalFixture);
  const officialSource = `https://official.example.invalid/records/${recordId}`;
  record.internalId = makeStableRecordId(record.source.id, recordId);
  record.source.recordId = recordId;
  record.officialTitle = `Synthetic relationship record ${recordId}`;
  record.sourceDocumentIdentifier = recordId;
  record.urls.officialSource = officialSource;
  record.urls.officialFullText = `${officialSource}.pdf`;
  if (record.texts.officialSummary !== null) {
    record.texts.officialSummary.sourceUrl = officialSource;
  }
  record.statusHistory = record.statusHistory.map((event) => ({
    ...event,
    sourceUrl: officialSource,
  }));
  record.relevance = record.relevance.map((entry) => ({
    ...entry,
    sourceUrl: officialSource,
  }));
  record.sourceDocumentRelationships = sourceDocumentRelationships;
  record.fieldProvenance = [];
  return completeSyntheticProvenance(record);
}

function correctionRelationshipPair() {
  const originalId = "SYN-ORIGINAL";
  const correctionId = "SYN-CORRECTION";
  const originalUrl = `https://official.example.invalid/records/${originalId}`;
  const correctionUrl = `https://official.example.invalid/records/${correctionId}`;
  return [
    relationshipRecord(originalId, [
      {
        relationshipType: "corrected_by",
        targetSourceRecordId: correctionId,
        targetUrl: correctionUrl,
        sourceLabel: "corrections",
      },
    ]),
    relationshipRecord(correctionId, [
      {
        relationshipType: "corrects",
        targetSourceRecordId: originalId,
        targetUrl: originalUrl,
        sourceLabel: "correction_of",
      },
    ]),
  ];
}

async function createLastKnownGoodFixture({
  includeHealthAsset = true,
  duplicateHealthAsset = false,
  unsafeAssetPath = null,
} = {}) {
  const parent = path.join(projectRoot, "dist", "pipeline-lkg-tests");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "artifact-"));
  const documents = createArtifactDocuments({
    records: [preparedFederal],
    nations,
    taxonomy,
    sourceRegistry,
    generatedAt: "2026-07-30T15:00:00Z",
    synthetic: true,
  });
  const healthDocument = documents.get("source-health.json");
  await writeArtifactDocuments({
    documents,
    outputDirectory: root,
    projectRoot,
  });

  const manifest = JSON.parse(
    await readFile(path.join(root, "manifest.json"), "utf8"),
  );
  if (!includeHealthAsset) {
    manifest.assets = manifest.assets.filter(
      ({ path: assetPath }) => assetPath !== "source-health.json",
    );
  }
  if (duplicateHealthAsset) {
    manifest.assets.push(
      globalThis.structuredClone(
        manifest.assets.find(
          ({ path: assetPath }) => assetPath === "source-health.json",
        ),
      ),
    );
  }
  if (unsafeAssetPath !== null) {
    manifest.assets.push({
      path: unsafeAssetPath,
      sha256: "0".repeat(64),
      sizeBytes: 1,
      mediaType: "application/json",
      sourceIds: [],
    });
  }
  if (!includeHealthAsset || duplicateHealthAsset || unsafeAssetPath !== null) {
    manifest.buildId = deriveBuildId(manifest.assets);
    await writeFile(
      path.join(root, "manifest.json"),
      hashJson(manifest).content,
    );
  }

  return {
    root,
    healthDocument,
    cleanup: async () => {
      const resolved = path.resolve(root);
      const allowedParent = `${path.resolve(parent)}${path.sep}`;
      assert.ok(resolved.startsWith(allowedParent));
      await rm(resolved, { recursive: true, force: true });
    },
  };
}

async function createArtifactValidatorFixture({
  records = [preparedFederal, preparedCounty],
  sourceHealth,
  generatedAt = "2026-07-30T15:00:00Z",
} = {}) {
  const parent = path.join(
    projectRoot,
    "dist",
    "pipeline-artifact-validator-tests",
  );
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "artifact-"));
  const documents = createArtifactDocuments({
    records,
    nations,
    taxonomy,
    sourceRegistry,
    generatedAt,
    synthetic: true,
    sourceHealth,
  });
  await writeArtifactDocuments({
    documents,
    outputDirectory: root,
    projectRoot,
  });
  return {
    root,
    cleanup: async () => {
      const resolved = path.resolve(root);
      const allowedParent = `${path.resolve(parent)}${path.sep}`;
      assert.ok(resolved.startsWith(allowedParent));
      await rm(resolved, { recursive: true, force: true });
    },
  };
}

async function rewriteArtifactAsset(root, relativePath, mutate) {
  const assetPath = path.join(root, relativePath);
  const value = JSON.parse(await readFile(assetPath, "utf8"));
  mutate(value);
  const rewritten = hashJson(value);
  await writeFile(assetPath, rewritten.content);

  const manifestPath = path.join(root, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const asset = manifest.assets.find(
    ({ path: entry }) => entry === relativePath,
  );
  asset.sha256 = rewritten.sha256;
  asset.sizeBytes = rewritten.sizeBytes;
  manifest.buildId = deriveBuildId(manifest.assets);
  await writeFile(manifestPath, hashJson(manifest).content);
}

async function rewriteArtifactManifest(root, mutate) {
  const manifestPath = path.join(root, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  mutate(manifest);
  manifest.buildId = deriveBuildId(manifest.assets);
  await writeFile(manifestPath, hashJson(manifest).content);
}

function runArtifactValidator(root) {
  return spawnSync(
    process.execPath,
    ["scripts/validate-artifact.mjs", "--dir", root],
    {
      cwd: projectRoot,
      encoding: "utf8",
    },
  );
}

test("stable and URL-safe IDs are deterministic", () => {
  const id = makeStableRecordId("synthetic-federal", "SYN 001/α");
  assert.equal(id, makeStableRecordId("synthetic-federal", "SYN 001/α"));
  const urlSafeId = toUrlSafeId(id);
  assert.equal(assertUrlSafeId(urlSafeId), urlSafeId);
  assert.doesNotMatch(urlSafeId, /[:/]/);
});

test("synthetic provenance covers every declared source-derived leaf", () => {
  const covered = new Set(
    preparedFederal.fieldProvenance.map(({ field }) => field),
  );
  const derivedPointers = sourceDerivedLeafPointers(preparedFederal);
  for (const pointer of derivedPointers) {
    assert.ok(covered.has(pointer), `missing ${pointer}`);
  }
  for (const requiredPointer of [
    "/jurisdiction/level",
    "/jurisdiction/generalJurisdictionOnly",
    "/status/normalized",
    "/isUnclassified",
    "/landmark/isLandmark",
    "/historical/isHistorical",
  ]) {
    assert.ok(
      derivedPointers.includes(requiredPointer),
      `semantic provenance walk omitted ${requiredPointer}`,
    );
  }
});

test("record schema 1.1 constrains source-document relationship shape", () => {
  const [original] = correctionRelationshipPair();
  assert.equal(
    validateRecordSchema(original),
    true,
    JSON.stringify(validateRecordSchema.errors),
  );

  const unsupportedType = globalThis.structuredClone(original);
  unsupportedType.sourceDocumentRelationships[0].relationshipType =
    "supersedes";
  assert.equal(validateRecordSchema(unsupportedType), false);

  const missingLabel = globalThis.structuredClone(original);
  delete missingLabel.sourceDocumentRelationships[0].sourceLabel;
  assert.equal(validateRecordSchema(missingLabel), false);

  const nonHttpsTarget = globalThis.structuredClone(original);
  nonHttpsTarget.sourceDocumentRelationships[0].targetUrl =
    "http://official.example.invalid/records/SYN-CORRECTION";
  assert.equal(validateRecordSchema(nonHttpsTarget), false);
});

test("correction relationships are reciprocal while related documents may be one-way", () => {
  const [original, correction] = correctionRelationshipPair();
  const related = relationshipRecord("SYN-RELATED", [
    {
      relationshipType: "related_document",
      targetSourceRecordId: "SYN-EXTERNAL-RELATED",
      targetUrl:
        "https://official.example.invalid/records/SYN-EXTERNAL-RELATED",
      sourceLabel: "related_documents",
    },
  ]);

  assert.doesNotThrow(() =>
    validateRecordSetPolicy([original, correction, related], {
      sourceRegistry,
      taxonomy,
      nations,
    }),
  );
});

test("relationship validation rejects self and duplicate edges", () => {
  const selfRelationship = relationshipRecord("SYN-SELF", [
    {
      relationshipType: "related_document",
      targetSourceRecordId: "SYN-SELF",
      targetUrl: "https://official.example.invalid/records/SYN-SELF",
      sourceLabel: "related_documents",
    },
  ]);
  assert.throws(
    () =>
      validateRecordPolicy(selfRelationship, {
        sourceConfig: sourceConfigs.get(selfRelationship.source.id),
        taxonomy,
      }),
    (error) =>
      error instanceof PolicyValidationError &&
      error.issues.some((issue) =>
        issue.includes("targets its own source record"),
      ),
  );

  const duplicateRelationship = {
    relationshipType: "related_document",
    targetSourceRecordId: "SYN-TARGET",
    targetUrl: "https://official.example.invalid/records/SYN-TARGET",
    sourceLabel: "related_documents",
  };
  const duplicate = relationshipRecord("SYN-DUPLICATE", [
    duplicateRelationship,
    {
      ...duplicateRelationship,
      targetUrl: "https://official.example.invalid/records/SYN-TARGET?copy=2",
      sourceLabel: "duplicate_source_label",
    },
  ]);
  assert.throws(
    () =>
      validateRecordPolicy(duplicate, {
        sourceConfig: sourceConfigs.get(duplicate.source.id),
        taxonomy,
      }),
    (error) =>
      error instanceof PolicyValidationError &&
      error.issues.some((issue) =>
        issue.includes("duplicates the related_document relationship"),
      ),
  );
});

test("correction graph rejects missing targets and missing reciprocal edges", () => {
  const [original, correction] = correctionRelationshipPair();
  assert.throws(
    () =>
      validateRecordSetPolicy([original], {
        sourceRegistry,
        taxonomy,
        nations,
      }),
    (error) =>
      error instanceof PolicyValidationError &&
      error.issues.some((issue) =>
        issue.includes("targets missing same-source record"),
      ),
  );

  correction.sourceDocumentRelationships = [];
  assert.throws(
    () =>
      validateRecordSetPolicy([original, correction], {
        sourceRegistry,
        taxonomy,
        nations,
      }),
    (error) =>
      error instanceof PolicyValidationError &&
      error.issues.some((issue) =>
        issue.includes("lacks reciprocal corrects relationship"),
      ),
  );
});

test("relationship leaves require exact provenance", () => {
  const related = relationshipRecord("SYN-PROVENANCE", [
    {
      relationshipType: "related_document",
      targetSourceRecordId: "SYN-TARGET",
      targetUrl: "https://official.example.invalid/records/SYN-TARGET",
      sourceLabel: "related_documents",
    },
  ]);
  related.fieldProvenance = related.fieldProvenance.filter(
    ({ field }) =>
      field !== "/sourceDocumentRelationships/0/targetSourceRecordId",
  );

  assert.throws(
    () =>
      validateRecordPolicy(related, {
        sourceConfig: sourceConfigs.get(related.source.id),
        taxonomy,
      }),
    (error) =>
      error instanceof PolicyValidationError &&
      error.issues.some((issue) =>
        issue.includes(
          "/sourceDocumentRelationships/0/targetSourceRecordId lacks exact provenance",
        ),
      ),
  );
});

test("valid synthetic records pass policy and uniqueness validation", () => {
  assert.doesNotThrow(() =>
    validateRecordSetPolicy([preparedFederal, preparedCounty], {
      sourceRegistry,
      taxonomy,
      nations,
    }),
  );
});

test("records from disabled registry sources fail closed", () => {
  const invalid = globalThis.structuredClone(preparedFederal);
  invalid.source.id = "federal-register";
  for (const entry of invalid.fieldProvenance) {
    entry.sourceId = "federal-register";
  }
  assert.throws(
    () =>
      validateRecordPolicy(invalid, {
        sourceConfig: sourceConfigs.get("federal-register"),
        taxonomy,
        knownNationIds: new Set(nations.map(({ id }) => id)),
      }),
    (error) =>
      error instanceof PolicyValidationError &&
      error.issues.includes("record source is disabled in the source registry"),
  );
});

test("artifact packaging rejects disabled-source records", () => {
  const invalid = globalThis.structuredClone(preparedFederal);
  invalid.source.id = "federal-register";
  assert.throws(
    () =>
      createArtifactDocuments({
        records: [invalid],
        nations,
        taxonomy,
        sourceRegistry,
        generatedAt: "2026-07-30T15:00:00Z",
        synthetic: true,
      }),
    /disabled or unregistered source: federal-register/,
  );
});

test("artifact packaging rejects records outside the emitted record contract", () => {
  const invalid = globalThis.structuredClone(preparedFederal);
  invalid.schemaVersion = "1.0.0";
  assert.throws(
    () =>
      createArtifactDocuments({
        records: [invalid],
        nations,
        taxonomy,
        sourceRegistry,
        generatedAt: "2026-07-30T15:00:00Z",
        synthetic: true,
      }),
    /record schema version mismatch/,
  );
});

test("county records fail closed without exact Nation evidence", () => {
  const invalid = globalThis.structuredClone(preparedCounty);
  invalid.nationAssociations = [];
  assert.throws(
    () =>
      validateRecordPolicy(invalid, {
        sourceConfig: sourceConfigs.get(invalid.source.id),
        taxonomy,
        knownNationIds: new Set(nations.map(({ id }) => id)),
      }),
    (error) =>
      error instanceof PolicyValidationError &&
      error.issues.some((issue) =>
        issue.includes("county record has no explicit Nation association"),
      ),
  );
});

test("issuing-government associations are restricted to tribal jurisdictions", () => {
  const invalid = globalThis.structuredClone(preparedCounty);
  invalid.nationAssociations[0].basis = "issuing_government";
  assert.throws(
    () =>
      validateRecordPolicy(invalid, {
        sourceConfig: sourceConfigs.get(invalid.source.id),
        taxonomy,
        knownNationIds: new Set(nations.map(({ id }) => id)),
      }),
    (error) =>
      error instanceof PolicyValidationError &&
      error.issues.some((issue) =>
        issue.includes("issuing_government outside a tribal jurisdiction"),
      ),
  );
});

test("federal records fail closed when general-jurisdiction labeling is removed", () => {
  const invalid = globalThis.structuredClone(preparedFederal);
  invalid.jurisdiction.generalJurisdictionOnly = false;
  assert.throws(
    () =>
      validateRecordPolicy(invalid, {
        sourceConfig: sourceConfigs.get(invalid.source.id),
        taxonomy,
      }),
    (error) =>
      error instanceof PolicyValidationError &&
      error.issues.some((issue) =>
        issue.includes("must be general jurisdiction"),
      ),
  );
});

test("unmapped categories and missing exact provenance fail closed", () => {
  const invalid = globalThis.structuredClone(preparedFederal);
  invalid.taxonomyMemberships = [
    {
      categoryId: taxonomy.categories[0].id,
      subcategoryId: taxonomy.categories[0].subcategories[0].id,
      mappingRuleId: "unregistered-rule",
      taxonomyVersion: "1.0.0",
      officialSubjectLabels: ["Synthetic subject"],
    },
  ];
  invalid.isUnclassified = false;
  assert.throws(
    () =>
      validateRecordPolicy(invalid, {
        sourceConfig: sourceConfigs.get(invalid.source.id),
        taxonomy,
      }),
    (error) =>
      error instanceof PolicyValidationError &&
      error.issues.some((issue) =>
        issue.includes("registered source-specific mapping rule"),
      ),
  );

  const missingProvenance = globalThis.structuredClone(preparedFederal);
  missingProvenance.fieldProvenance = missingProvenance.fieldProvenance.filter(
    ({ field }) => field !== "/dates/published",
  );
  assert.throws(
    () =>
      validateRecordPolicy(missingProvenance, {
        sourceConfig: sourceConfigs.get(missingProvenance.source.id),
        taxonomy,
      }),
    (error) =>
      error instanceof PolicyValidationError &&
      error.issues.some((issue) =>
        issue.includes("/dates/published lacks exact provenance"),
      ),
  );
});

test("forbidden legal, inference, and sensitive land fields fail closed", () => {
  for (const forbiddenField of [
    "legalConclusion",
    "inferredNationRelationship",
    "parcelGeometry",
  ]) {
    const invalid = globalThis.structuredClone(preparedFederal);
    invalid[forbiddenField] = "synthetic prohibited value";
    assert.throws(
      () =>
        validateRecordPolicy(invalid, {
          sourceConfig: sourceConfigs.get(invalid.source.id),
          taxonomy,
        }),
      (error) =>
        error instanceof PolicyValidationError &&
        error.issues.some((issue) => issue.includes("forbidden public field")),
    );
  }
});

test("source URLs require exact registered HTTPS hostnames", () => {
  const allowed = globalThis.structuredClone(preparedFederal);
  allowed.urls.officialSource =
    "https://OFFICIAL.EXAMPLE.INVALID/records/SYN-001";
  assert.doesNotThrow(() =>
    validateRecordPolicy(allowed, {
      sourceConfig: sourceConfigs.get(allowed.source.id),
      taxonomy,
    }),
  );

  const cases = [
    {
      mutate(record) {
        record.urls.officialSource =
          "https://official.example.invalid.attacker.test/record";
      },
      field: "/urls/officialSource",
    },
    {
      mutate(record) {
        record.texts.officialSummary.sourceUrl =
          "https://attacker.test/summary";
      },
      field: "/texts/officialSummary/sourceUrl",
    },
    {
      mutate(record) {
        record.relevance[0].sourceUrl = "https://attacker.test/relevance";
      },
      field: "/relevance/0/sourceUrl",
    },
    {
      mutate(record) {
        record.sourceDocumentRelationships = [
          {
            relationshipType: "related_document",
            targetSourceRecordId: "SYN-TARGET",
            targetUrl: "https://attacker.test/related",
            sourceLabel: "related_documents",
          },
        ];
      },
      field: "/sourceDocumentRelationships/0/targetUrl",
    },
    {
      mutate(record) {
        record.fieldProvenance[0].sourceUrl =
          "https://attacker.test/provenance";
      },
      field: "/fieldProvenance/0/sourceUrl",
    },
  ];
  for (const { mutate, field } of cases) {
    const invalid = globalThis.structuredClone(preparedFederal);
    mutate(invalid);
    assert.throws(
      () =>
        validateRecordPolicy(invalid, {
          sourceConfig: sourceConfigs.get(invalid.source.id),
          taxonomy,
        }),
      (error) =>
        error instanceof PolicyValidationError &&
        error.issues.some(
          (issue) =>
            issue.includes(field) &&
            issue.includes("is not registered for source"),
        ),
    );
  }

  const invalidEvidence = globalThis.structuredClone(preparedCounty);
  invalidEvidence.nationAssociations[0].evidenceUrl =
    "https://attacker.test/evidence";
  assert.throws(
    () =>
      validateRecordPolicy(invalidEvidence, {
        sourceConfig: sourceConfigs.get(invalidEvidence.source.id),
        taxonomy,
      }),
    (error) =>
      error instanceof PolicyValidationError &&
      error.issues.some((issue) =>
        issue.includes("/nationAssociations/0/evidenceUrl"),
      ),
  );
});

test("last-known-good fallback preserves authoritative health through validation", async () => {
  const previousHealth = {
    sourceId: preparedFederal.source.id,
    status: "healthy",
    checkedAt: preparedFederal.sourceHealth.checkedAt,
    dataAsOf: preparedFederal.sourceHealth.dataAsOf,
    lastSuccessfulRetrievalAt:
      preparedFederal.sourceHealth.lastSuccessfulRetrievalAt,
    usingLastKnownGood: false,
    stale: false,
    recordCount: 1,
    failureStage: null,
    message: null,
  };
  const result = mergeSourceRefresh({
    sourceId: preparedFederal.source.id,
    refresh: failureFixture,
    previousRecords: [preparedFederal],
    previousHealth,
  });
  assert.equal(result.records.length, 1);
  assert.equal(result.health.status, "degraded");
  assert.equal(result.health.usingLastKnownGood, true);
  assert.equal(result.health.stale, true);
  assert.equal(result.health.dataAsOf, previousHealth.dataAsOf);
  assert.equal(
    result.records[0].sourceHealth.dataAsOf,
    preparedFederal.sourceHealth.dataAsOf,
  );
  assert.equal(result.records[0].sourceHealth.usingLastKnownGood, true);
  assert.equal(result.health.failureStage, failureFixture.failureStage);

  const records = [result.records[0], preparedCounty];
  const sourceHealth = sourceHealthReceiptsFor(sourceRegistry, records, [
    result.health,
  ]);
  const documents = createArtifactDocuments({
    records,
    nations,
    taxonomy,
    sourceRegistry,
    generatedAt: failureFixture.checkedAt,
    synthetic: true,
    sourceHealth,
  });
  assert.deepEqual(
    documents
      .get("source-health.json")
      .sources.find(({ sourceId }) => sourceId === result.health.sourceId),
    {
      ...result.health,
      sourceName: sourceConfigs.get(result.health.sourceId).name,
    },
  );

  const fixture = await createArtifactValidatorFixture({
    records,
    sourceHealth,
    generatedAt: failureFixture.checkedAt,
  });
  try {
    const validation = runArtifactValidator(fixture.root);
    assert.equal(
      validation.status,
      0,
      `${validation.stdout}${validation.stderr}`,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("failed first refresh packages and validates authoritative unavailable health", async () => {
  const result = mergeSourceRefresh({
    sourceId: preparedFederal.source.id,
    refresh: failureFixture,
  });
  assert.deepEqual(result.records, []);
  assert.equal(result.health.status, "unavailable");
  assert.equal(result.health.dataAsOf, null);
  assert.equal(result.health.usingLastKnownGood, false);
  assert.equal(result.health.failureStage, failureFixture.failureStage);

  const records = [preparedCounty];
  const sourceHealth = sourceHealthReceiptsFor(sourceRegistry, records, [
    result.health,
  ]);
  const documents = createArtifactDocuments({
    records,
    nations,
    taxonomy,
    sourceRegistry,
    generatedAt: failureFixture.checkedAt,
    synthetic: true,
    sourceHealth,
  });
  assert.deepEqual(
    documents
      .get("source-health.json")
      .sources.find(({ sourceId }) => sourceId === result.health.sourceId),
    {
      ...result.health,
      sourceName: sourceConfigs.get(result.health.sourceId).name,
    },
  );

  const fixture = await createArtifactValidatorFixture({
    records,
    sourceHealth,
    generatedAt: failureFixture.checkedAt,
  });
  try {
    const validation = runArtifactValidator(fixture.root);
    assert.equal(
      validation.status,
      0,
      `${validation.stdout}${validation.stderr}`,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("last-known-good loader uses hash-verified health and detail bytes", async () => {
  const fixture = await createLastKnownGoodFixture();
  try {
    const loaded = await loadLastKnownGoodSource(
      fixture.root,
      preparedFederal.source.id,
    );
    assert.equal(loaded.records.length, 1);
    assert.deepEqual(
      loaded.health,
      fixture.healthDocument.sources.find(
        ({ sourceId }) => sourceId === preparedFederal.source.id,
      ),
    );
  } finally {
    await fixture.cleanup();
  }
});

test("last-known-good loader rejects tampered or unmanifested health", async () => {
  const tampered = await createLastKnownGoodFixture();
  try {
    await writeFile(
      path.join(tampered.root, "source-health.json"),
      JSON.stringify({
        ...tampered.healthDocument,
        sources: tampered.healthDocument.sources.map((health) => ({
          ...health,
          dataAsOf: "2099-01-01T00:00:00Z",
        })),
      }),
    );
    await assert.rejects(
      loadLastKnownGoodSource(tampered.root, preparedFederal.source.id),
      /(?:size|hash) mismatch: source-health\.json/,
    );
  } finally {
    await tampered.cleanup();
  }

  const unmanifested = await createLastKnownGoodFixture({
    includeHealthAsset: false,
  });
  try {
    await assert.rejects(
      loadLastKnownGoodSource(unmanifested.root, preparedFederal.source.id),
      /lacks required asset: source-health\.json/,
    );
  } finally {
    await unmanifested.cleanup();
  }
});

test("last-known-good verifier rejects duplicate and unsafe manifest entries", async () => {
  const duplicate = await createLastKnownGoodFixture({
    duplicateHealthAsset: true,
  });
  try {
    await assert.rejects(
      verifyLastKnownGoodArtifact(duplicate.root),
      /repeats asset path: source-health\.json/,
    );
  } finally {
    await duplicate.cleanup();
  }

  const unsafe = await createLastKnownGoodFixture({
    unsafeAssetPath: "../outside.json",
  });
  try {
    await assert.rejects(
      verifyLastKnownGoodArtifact(unsafe.root),
      /unsafe artifact path/,
    );
  } finally {
    await unsafe.cleanup();
  }
});

test("artifact packaging is deterministic, compact, and detail-sharded", () => {
  const input = {
    records: [preparedFederal, preparedCounty],
    nations,
    taxonomy,
    sourceRegistry,
    generatedAt: "2026-07-30T15:00:00Z",
    synthetic: true,
  };
  const first = createArtifactDocuments(input);
  const second = createArtifactDocuments(input);
  assert.deepEqual(first.get("manifest.json"), second.get("manifest.json"));
  assert.equal(first.get("manifest.json").artifactVersion, "1.1.0");
  assert.equal(first.get("manifest.json").recordSchemaVersion, "1.1.0");
  assert.equal(first.get("manifest.json").nationCount, 575);
  assert.equal(first.get("manifest.json").recordCount, 2);
  assert.equal(first.get("index/records.json").records.length, 2);
  assert.deepEqual(
    first
      .get("source-health.json")
      .sources.map(({ sourceId, sourceName }) => ({ sourceId, sourceName })),
    sourceRegistry.sources
      .filter(({ enabled }) => enabled)
      .map(({ id, name }) => ({
        sourceId: id,
        sourceName: name,
      })),
  );
  assert.deepEqual(
    first.get("coverage.json").entries.map(({ sourceId }) => sourceId),
    sourceRegistry.sources.filter(({ enabled }) => enabled).map(({ id }) => id),
  );
  assert.deepEqual(
    first
      .get("coverage.json")
      .entries.find(({ sourceId }) => sourceId === "synthetic-federal"),
    {
      sourceId: "synthetic-federal",
      sourceName: "Synthetic Federal Source",
      provider: "Synthetic Public Agency",
      jurisdiction: {
        level: "federal",
        name: "United States",
        stateCode: null,
      },
      from: "2020-01-01",
      through: null,
      documentedFrom: "2020-01-01",
      documentedThrough: null,
      recordFrom: "2026-07-29",
      recordThrough: "2026-07-29",
      recordCount: 1,
      cadence: "Synthetic build only.",
      recordTypes: ["notice"],
      status: "synthetic",
      limitation: `${sourceConfigs.get("synthetic-federal").coverage.limitations} ${preparedFederal.source.coverage.notes}`,
    },
  );
  assert.ok(
    first
      .get("source-health.json")
      .sources.every(
        ({ message, recordCount }) => recordCount === 1 && message === null,
      ),
  );
  assert.equal(
    [...first.keys()].filter((key) => key.startsWith("details/")).length,
    2,
  );
  for (const entry of first.get("index/records.json").records) {
    assert.equal("aiSummary" in entry, false);
    assert.equal("sourceDocumentRelationships" in entry, false);
    assert.equal("categoryIds" in entry, false);
    assert.equal("subcategoryIds" in entry, false);
    assert.deepEqual(entry.taxonomyMemberships, []);
    assert.deepEqual(entry.landmark, { isLandmark: false });
    assert.match(entry.detailPath, /^details\/[A-Za-z0-9_-]+\.json$/);
    const sourceRecord = [preparedFederal, preparedCounty].find(
      ({ internalId }) => internalId === entry.id,
    );
    assert.ok(sourceRecord);
    assert.equal(
      entry.sourceDocumentIdentifier,
      sourceRecord.sourceDocumentIdentifier,
    );
    assert.deepEqual(
      entry.issuingBodies,
      sourceRecord.issuingBodies.map(({ officialName }) => officialName),
    );
    assert.deepEqual(entry.urls, {
      officialSource: sourceRecord.urls.officialSource,
    });
  }
  for (const detail of [...first.entries()]
    .filter(([assetPath]) => assetPath.startsWith("details/"))
    .map(([, document]) => document)) {
    assert.ok(Array.isArray(detail.record.sourceDocumentRelationships));
  }
});

test("coverage distinguishes selected, documented, and actual record ranges", () => {
  const configured = globalThis.structuredClone(sourceRegistry);
  const federalRegister = configured.sources.find(
    ({ id }) => id === "federal-register",
  );
  federalRegister.enabled = true;

  const record = globalThis.structuredClone(preparedFederal);
  const selectedCoverageNote =
    "The selected rolling window excludes correction components that cross its boundary.";
  record.internalId = "psr:federal-register:coverage-record";
  record.source = {
    ...record.source,
    id: federalRegister.id,
    name: federalRegister.name,
    provider: federalRegister.provider,
    recordId: "TST-COVERAGE-1",
    coverage: {
      from: "2026-07-01",
      through: "2026-07-30",
      notes: selectedCoverageNote,
    },
  };
  record.sourceDocumentIdentifier = "TST-COVERAGE-1";
  const artifactRecords = [preparedFederal, preparedCounty, record];
  const sourceHealth = sourceHealthReceiptsFor(configured, artifactRecords);

  const documents = createArtifactDocuments({
    records: artifactRecords,
    nations,
    taxonomy,
    sourceRegistry: configured,
    generatedAt: "2026-07-30T15:00:00Z",
    synthetic: true,
    sourceHealth,
  });
  assert.deepEqual(
    documents
      .get("coverage.json")
      .entries.find(({ sourceId }) => sourceId === "federal-register"),
    {
      sourceId: "federal-register",
      sourceName: "Federal Register",
      provider: "Office of the Federal Register",
      jurisdiction: federalRegister.jurisdiction,
      from: "2026-07-01",
      through: "2026-07-30",
      documentedFrom: "1994-01-03",
      documentedThrough: null,
      recordFrom: "2026-07-29",
      recordThrough: "2026-07-29",
      recordCount: 1,
      cadence: federalRegister.coverage.cadence,
      recordTypes: ["notice"],
      status: "limited",
      limitation: `${federalRegister.coverage.limitations} ${selectedCoverageNote}`,
    },
  );

  record.source.coverage = {
    from: federalRegister.coverage.from,
    through: federalRegister.coverage.through,
    notes: selectedCoverageNote,
  };
  const documentedSelection = createArtifactDocuments({
    records: artifactRecords,
    nations,
    taxonomy,
    sourceRegistry: configured,
    generatedAt: "2026-07-30T15:00:00Z",
    synthetic: true,
    sourceHealth,
  });
  assert.equal(
    documentedSelection
      .get("coverage.json")
      .entries.find(({ sourceId }) => sourceId === "federal-register").status,
    "limited",
  );
});

test("coverage dates prefer publication and fall back to status as-of", () => {
  const record = globalThis.structuredClone(preparedFederal);
  record.dates.published = null;
  const expectedDate = record.status.asOf.slice(0, 10);
  const documents = createArtifactDocuments({
    records: [record, preparedCounty],
    nations,
    taxonomy,
    sourceRegistry,
    generatedAt: "2026-07-30T15:00:00Z",
    synthetic: true,
  });
  const coverage = documents
    .get("coverage.json")
    .entries.find(({ sourceId }) => sourceId === "synthetic-federal");
  assert.equal(coverage.recordFrom, expectedDate);
  assert.equal(coverage.recordThrough, expectedDate);
});

test("coverage preserves and validates selected-range notes", async () => {
  const record = globalThis.structuredClone(preparedFederal);
  const selectedNote =
    "The selected range excludes relationship components crossing its boundary.";
  record.source.coverage.notes = selectedNote;
  const records = [record, preparedCounty];
  const documents = createArtifactDocuments({
    records,
    nations,
    taxonomy,
    sourceRegistry,
    generatedAt: "2026-07-30T15:00:00Z",
    synthetic: true,
  });
  assert.equal(
    documents
      .get("coverage.json")
      .entries.find(({ sourceId }) => sourceId === record.source.id).limitation,
    `${sourceConfigs.get(record.source.id).coverage.limitations} ${selectedNote}`,
  );

  const fixture = await createArtifactValidatorFixture({ records });
  try {
    let validation = runArtifactValidator(fixture.root);
    assert.equal(
      validation.status,
      0,
      `${validation.stdout}${validation.stderr}`,
    );
    await rewriteArtifactAsset(fixture.root, "coverage.json", (coverage) => {
      coverage.entries.find(
        ({ sourceId }) => sourceId === record.source.id,
      ).limitation = sourceConfigs.get(record.source.id).coverage.limitations;
    });
    validation = runArtifactValidator(fixture.root);
    assert.equal(validation.status, 1);
    assert.match(
      `${validation.stdout}${validation.stderr}`,
      /coverage limitation mismatch/,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("coverage packaging rejects inconsistent and out-of-bounds selections", () => {
  const duplicate = globalThis.structuredClone(preparedFederal);
  duplicate.internalId = "psr:synthetic-federal:coverage-duplicate";
  duplicate.source.recordId = "SYN-COVERAGE-DUPLICATE";
  duplicate.source.coverage.from = "2021-01-01";
  assert.throws(
    () =>
      createArtifactDocuments({
        records: [preparedFederal, duplicate, preparedCounty],
        nations,
        taxonomy,
        sourceRegistry,
        generatedAt: "2026-07-30T15:00:00Z",
        synthetic: true,
      }),
    /disagree on selected coverage/,
  );

  const outsideDocumented = globalThis.structuredClone(preparedFederal);
  outsideDocumented.source.coverage.from = "2019-12-31";
  assert.throws(
    () =>
      createArtifactDocuments({
        records: [outsideDocumented, preparedCounty],
        nations,
        taxonomy,
        sourceRegistry,
        generatedAt: "2026-07-30T15:00:00Z",
        synthetic: true,
      }),
    /begins outside documented range/,
  );

  const outsideSelection = globalThis.structuredClone(preparedFederal);
  outsideSelection.source.coverage.from = "2026-07-30";
  outsideSelection.source.coverage.through = "2026-07-31";
  assert.throws(
    () =>
      createArtifactDocuments({
        records: [outsideSelection, preparedCounty],
        nations,
        taxonomy,
        sourceRegistry,
        generatedAt: "2026-07-30T15:00:00Z",
        synthetic: true,
      }),
    /record date falls outside selected coverage/,
  );
});

test("static artifact budgets pass at exact boundaries and fail one byte over", () => {
  assert.deepEqual(STATIC_ARTIFACT_BUDGET_V1, {
    version: "1.0.0",
    maxIndexBytes: 6 * 1024 * 1024,
    maxInitialNonDetailBytes: 8 * 1024 * 1024,
    maxIndividualDetailBytes: 256 * 1024,
    maxAllDetailsBytes: 128 * 1024 * 1024,
    maxTotalAssetsBytes: 136 * 1024 * 1024,
  });
  const input = {
    records: [preparedFederal, preparedCounty],
    nations,
    taxonomy,
    sourceRegistry,
    generatedAt: "2026-07-30T15:00:00Z",
    synthetic: true,
  };
  const baseline = createArtifactDocuments(input);
  const metrics = assertStaticArtifactBudget(
    baseline.get("manifest.json").assets,
  );
  const boundaries = [
    ["maxIndexBytes", metrics.indexBytes, /compact index exceeds/],
    [
      "maxInitialNonDetailBytes",
      metrics.initialNonDetailBytes,
      /initial non-detail assets exceed/,
    ],
    [
      "maxIndividualDetailBytes",
      metrics.maximumIndividualDetailBytes,
      /detail asset exceeds/,
    ],
    [
      "maxAllDetailsBytes",
      metrics.allDetailsBytes,
      /aggregate detail assets exceed/,
    ],
    ["maxTotalAssetsBytes", metrics.totalAssetsBytes, /total assets exceed/],
  ];

  for (const [key, boundary, message] of boundaries) {
    assert.doesNotThrow(() =>
      createArtifactDocuments({
        ...input,
        artifactBudget: {
          ...STATIC_ARTIFACT_BUDGET_V1,
          [key]: boundary,
        },
      }),
    );
    assert.throws(
      () =>
        createArtifactDocuments({
          ...input,
          artifactBudget: {
            ...STATIC_ARTIFACT_BUDGET_V1,
            [key]: boundary - 1,
          },
        }),
      message,
    );
  }
});

test("artifact validation enforces declared and actual budgets before asset reads", async () => {
  const declaredFixture = await createArtifactValidatorFixture();
  try {
    await rewriteArtifactManifest(declaredFixture.root, (manifest) => {
      manifest.assets.find(
        ({ path: assetPath }) => assetPath === "index/records.json",
      ).sizeBytes = STATIC_ARTIFACT_BUDGET_V1.maxIndexBytes + 1;
    });
    const validation = runArtifactValidator(declaredFixture.root);
    assert.equal(validation.status, 1);
    assert.match(
      `${validation.stdout}${validation.stderr}`,
      /compact index exceeds static artifact budget/,
    );
  } finally {
    await declaredFixture.cleanup();
  }

  const actualFixture = await createArtifactValidatorFixture();
  try {
    const manifest = JSON.parse(
      await readFile(path.join(actualFixture.root, "manifest.json"), "utf8"),
    );
    const detailPath = manifest.assets.find(({ path: assetPath }) =>
      assetPath.startsWith("details/"),
    ).path;
    await writeFile(
      path.join(actualFixture.root, detailPath),
      " ".repeat(STATIC_ARTIFACT_BUDGET_V1.maxIndividualDetailBytes + 1),
    );
    const validation = runArtifactValidator(actualFixture.root);
    assert.equal(validation.status, 1);
    assert.match(
      `${validation.stdout}${validation.stderr}`,
      /detail asset exceeds static artifact budget/,
    );
  } finally {
    await actualFixture.cleanup();
  }
});

test("artifact validation rejects disabled source IDs at every metadata boundary", async () => {
  const manifestFixture = await createArtifactValidatorFixture();
  try {
    await rewriteArtifactManifest(manifestFixture.root, (manifest) => {
      manifest.assets
        .find(({ path: assetPath }) => assetPath === "coverage.json")
        .sourceIds.push("federal-register");
    });
    const result = runArtifactValidator(manifestFixture.root);
    assert.equal(result.status, 1);
    assert.match(
      `${result.stdout}${result.stderr}`,
      /manifest asset references disabled or unregistered source/,
    );
  } finally {
    await manifestFixture.cleanup();
  }

  const coverageFixture = await createArtifactValidatorFixture();
  try {
    await rewriteArtifactAsset(
      coverageFixture.root,
      "coverage.json",
      (coverage) => {
        const source = sourceConfigs.get("federal-register");
        coverage.entries.push({
          sourceId: source.id,
          sourceName: source.name,
          provider: source.provider,
          jurisdiction: source.jurisdiction,
          from: null,
          through: null,
          documentedFrom: source.coverage.from,
          documentedThrough: source.coverage.through,
          recordFrom: null,
          recordThrough: null,
          recordCount: 0,
          cadence: source.coverage.cadence,
          recordTypes: [],
          status: "unavailable",
          limitation: source.coverage.limitations,
        });
      },
    );
    const result = runArtifactValidator(coverageFixture.root);
    assert.equal(result.status, 1);
    assert.match(
      `${result.stdout}${result.stderr}`,
      /coverage entries do not match enabled registry sources/,
    );
  } finally {
    await coverageFixture.cleanup();
  }

  const healthFixture = await createArtifactValidatorFixture();
  try {
    await rewriteArtifactAsset(
      healthFixture.root,
      "source-health.json",
      (health) => {
        health.sources.push({
          sourceId: "federal-register",
          sourceName: "Federal Register",
          status: "unavailable",
          checkedAt: health.generatedAt,
          dataAsOf: null,
          lastSuccessfulRetrievalAt: null,
          usingLastKnownGood: false,
          stale: true,
          recordCount: 0,
          failureStage: null,
          message: "No validated records are available.",
        });
      },
    );
    const result = runArtifactValidator(healthFixture.root);
    assert.equal(result.status, 1);
    assert.match(
      `${result.stdout}${result.stderr}`,
      /source-health entries do not match enabled registry sources/,
    );
  } finally {
    await healthFixture.cleanup();
  }
});

test("artifact validation rejects contradictory or unbound source health", async () => {
  const cases = [
    {
      mutate(health) {
        health.sources[0].stale = true;
      },
      expected: /healthy receipt is inconsistent/,
    },
    {
      mutate(health) {
        health.sources[0].checkedAt = "2026-07-31T20:01:00.000Z";
      },
      expected: /receipt differs from record health/,
    },
  ];

  for (const { mutate, expected } of cases) {
    const fixture = await createArtifactValidatorFixture();
    try {
      await rewriteArtifactAsset(fixture.root, "source-health.json", mutate);
      const result = runArtifactValidator(fixture.root);
      assert.equal(result.status, 1);
      assert.match(`${result.stdout}${result.stderr}`, expected);
    } finally {
      await fixture.cleanup();
    }
  }
});

test("artifact validation recomputes coverage counts and actual ranges", async () => {
  const countFixture = await createArtifactValidatorFixture();
  try {
    await rewriteArtifactAsset(
      countFixture.root,
      "coverage.json",
      (coverage) => {
        coverage.entries[0].recordCount += 1;
      },
    );
    const result = runArtifactValidator(countFixture.root);
    assert.equal(result.status, 1);
    assert.match(
      `${result.stdout}${result.stderr}`,
      /coverage record inventory mismatch/,
    );
  } finally {
    await countFixture.cleanup();
  }

  const rangeFixture = await createArtifactValidatorFixture();
  try {
    await rewriteArtifactAsset(
      rangeFixture.root,
      "coverage.json",
      (coverage) => {
        coverage.entries[0].recordFrom = "2026-07-28";
      },
    );
    const result = runArtifactValidator(rangeFixture.root);
    assert.equal(result.status, 1);
    assert.match(
      `${result.stdout}${result.stderr}`,
      /coverage actual record range mismatch/,
    );
  } finally {
    await rangeFixture.cleanup();
  }
});

test("artifact packaging rejects incomplete or inconsistent health receipts", () => {
  const configured = globalThis.structuredClone(sourceRegistry);
  const federalRegister = configured.sources.find(
    ({ id }) => id === "federal-register",
  );
  federalRegister.enabled = true;
  const records = [preparedFederal, preparedCounty];
  const firstRun = mergeSourceRefresh({
    sourceId: federalRegister.id,
    refresh: failureFixture,
  });
  const receipts = sourceHealthReceiptsFor(configured, records, [
    firstRun.health,
  ]);
  const input = {
    records,
    nations,
    taxonomy,
    sourceRegistry: configured,
    generatedAt: failureFixture.checkedAt,
    synthetic: true,
  };

  assert.throws(
    () =>
      createArtifactDocuments({
        ...input,
        sourceHealth: receipts.slice(1),
      }),
    /receipts do not match enabled registry sources/,
  );
  assert.throws(
    () =>
      createArtifactDocuments({
        ...input,
        sourceHealth: [...receipts, globalThis.structuredClone(receipts[0])],
      }),
    /receipts contain duplicate source/,
  );

  const wrongCount = globalThis.structuredClone(receipts);
  wrongCount[0].recordCount += 1;
  assert.throws(
    () => createArtifactDocuments({ ...input, sourceHealth: wrongCount }),
    /source-health record count mismatch/,
  );

  const wrongUnavailableState = globalThis.structuredClone(receipts);
  wrongUnavailableState.find(
    ({ sourceId }) => sourceId === federalRegister.id,
  ).status = "failed";
  assert.throws(
    () =>
      createArtifactDocuments({
        ...input,
        sourceHealth: wrongUnavailableState,
      }),
    /source-health unavailable state mismatch/,
  );

  const recordMismatch = globalThis.structuredClone(receipts);
  recordMismatch[0].status = "degraded";
  assert.throws(
    () => createArtifactDocuments({ ...input, sourceHealth: recordMismatch }),
    /source-health receipt differs from record health/,
  );
});

test("first-run unavailable health is authoritative for enabled sources without records", () => {
  const configured = globalThis.structuredClone(sourceRegistry);
  const federalRegister = configured.sources.find(
    ({ id }) => id === "federal-register",
  );
  federalRegister.enabled = true;
  federalRegister.adapter = {
    id: "federal-register-adapter",
    version: "1.0.0",
    module: "src/adapters/federal-register/index.ts",
    identityRule: "federal-register-document-number-v1",
  };
  const artifactRecords = [preparedFederal, preparedCounty];
  const firstRun = mergeSourceRefresh({
    sourceId: federalRegister.id,
    refresh: failureFixture,
  });
  assert.throws(
    () =>
      createArtifactDocuments({
        records: artifactRecords,
        nations,
        taxonomy,
        sourceRegistry: configured,
        generatedAt: "2026-07-30T15:00:00Z",
        synthetic: true,
      }),
    /source-health receipts are required for non-synthetic enabled sources/,
  );
  const documents = createArtifactDocuments({
    records: artifactRecords,
    nations,
    taxonomy,
    sourceRegistry: configured,
    generatedAt: "2026-07-30T15:00:00Z",
    synthetic: true,
    sourceHealth: sourceHealthReceiptsFor(configured, artifactRecords, [
      firstRun.health,
    ]),
  });
  assert.deepEqual(
    documents
      .get("coverage.json")
      .entries.find(({ sourceId }) => sourceId === "federal-register"),
    {
      sourceId: "federal-register",
      sourceName: federalRegister.name,
      provider: federalRegister.provider,
      jurisdiction: federalRegister.jurisdiction,
      from: null,
      through: null,
      documentedFrom: federalRegister.coverage.from,
      documentedThrough: federalRegister.coverage.through,
      recordFrom: null,
      recordThrough: null,
      recordCount: 0,
      cadence: federalRegister.coverage.cadence,
      recordTypes: [],
      status: "unavailable",
      limitation: federalRegister.coverage.limitations,
    },
  );
  assert.deepEqual(
    documents
      .get("source-health.json")
      .sources.find(({ sourceId }) => sourceId === "federal-register"),
    {
      sourceId: "federal-register",
      sourceName: "Federal Register",
      status: "unavailable",
      checkedAt: failureFixture.checkedAt,
      dataAsOf: null,
      lastSuccessfulRetrievalAt: null,
      usingLastKnownGood: false,
      stale: true,
      recordCount: 0,
      failureStage: failureFixture.failureStage,
      message: failureFixture.publicMessage,
    },
  );
});

test("compact records preserve exact taxonomy pairs and landmark state", () => {
  const record = globalThis.structuredClone(preparedFederal);
  record.taxonomyMemberships = [
    {
      categoryId: "category-b",
      subcategoryId: "subcategory-b",
    },
    {
      categoryId: "category-a",
      subcategoryId: "subcategory-a",
    },
    {
      categoryId: "category-a",
      subcategoryId: "subcategory-a",
    },
  ];
  record.landmark = {
    isLandmark: true,
    criterionCodes: ["statute"],
    officialEvidence: [],
  };
  const compact = createArtifactDocuments({
    records: [record],
    nations,
    taxonomy,
    sourceRegistry,
    generatedAt: "2026-07-30T15:00:00Z",
    synthetic: true,
  }).get("index/records.json").records[0];

  assert.deepEqual(compact.taxonomyMemberships, [
    {
      categoryId: "category-a",
      subcategoryId: "subcategory-a",
    },
    {
      categoryId: "category-b",
      subcategoryId: "subcategory-b",
    },
  ]);
  assert.deepEqual(compact.landmark, { isLandmark: true });
});

test("artifact writer refuses recursive output outside dist", async () => {
  await assert.rejects(
    writeArtifactDocuments({
      documents: new Map([["manifest.json", { synthetic: true }]]),
      outputDirectory: path.join(projectRoot, "src", "unsafe-artifact"),
      projectRoot,
    }),
    /isolated directory under dist/,
  );
});
