import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  createArtifactDocuments,
  generateSyntheticNations,
  writeArtifactDocuments,
} from "../../src/pipeline/artifact.mjs";
import {
  assertUrlSafeId,
  makeStableRecordId,
  toUrlSafeId,
} from "../../src/pipeline/identity.mjs";
import { hashJson } from "../../src/pipeline/hashing.mjs";
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
] = await Promise.all([
  json("config/taxonomy.v1.json"),
  json("config/sources.v1.json"),
  json("fixtures/records/general-jurisdiction.valid.json"),
  json("fixtures/records/county-explicit.valid.json"),
  json("fixtures/sources/synthetic-refresh-failure.valid.json"),
]);
const sourceConfigs = new Map(
  sourceRegistry.sources.map((source) => [source.id, source]),
);
const nations = generateSyntheticNations();
const preparedFederal = completeSyntheticProvenance(federalFixture);
const preparedCounty = completeSyntheticProvenance(countyFixture);

async function createLastKnownGoodFixture({
  includeHealthAsset = true,
  duplicateHealthAsset = false,
  unsafeAssetPath = null,
} = {}) {
  const parent = path.join(projectRoot, "dist", "pipeline-lkg-tests");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "artifact-"));
  const healthDocument = {
    artifactType: "source-health",
    schemaVersion: "1.0.0",
    generatedAt: "2026-07-30T15:00:00Z",
    sources: [
      {
        sourceId: preparedFederal.source.id,
        sourceName: preparedFederal.source.name,
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
      },
    ],
  };
  const detailDocument = {
    artifactType: "record-detail",
    schemaVersion: "1.0.0",
    generatedAt: "2026-07-30T15:00:00Z",
    record: preparedFederal,
  };
  const health = hashJson(healthDocument);
  const detail = hashJson(detailDocument);
  const detailPath = `details/${toUrlSafeId(preparedFederal.internalId)}.json`;
  const assets = [
    ...(includeHealthAsset
      ? [
          {
            path: "source-health.json",
            sha256: health.sha256,
            sizeBytes: health.sizeBytes,
            mediaType: "application/json",
            sourceIds: [preparedFederal.source.id],
          },
        ]
      : []),
    {
      path: detailPath,
      sha256: detail.sha256,
      sizeBytes: detail.sizeBytes,
      mediaType: "application/json",
      sourceIds: [preparedFederal.source.id],
    },
  ];
  if (duplicateHealthAsset) {
    assets.push(globalThis.structuredClone(assets[0]));
  }
  if (unsafeAssetPath !== null) {
    assets.push({
      path: unsafeAssetPath,
      sha256: "0".repeat(64),
      sizeBytes: 1,
      mediaType: "application/json",
      sourceIds: [],
    });
  }
  const manifest = {
    artifactType: "manifest",
    schemaVersion: "1.0.0",
    assets,
  };

  await mkdir(path.join(root, "details"), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "manifest.json"), JSON.stringify(manifest)),
    writeFile(path.join(root, "source-health.json"), health.content),
    writeFile(path.join(root, detailPath), detail.content),
  ]);

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

test("valid synthetic records pass policy and uniqueness validation", () => {
  assert.doesNotThrow(() =>
    validateRecordSetPolicy([preparedFederal, preparedCounty], {
      sourceRegistry,
      taxonomy,
      nations,
    }),
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

test("last-known-good fallback preserves freshness and marks data stale", () => {
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
});

test("failed first refresh omits records and reports unavailable", () => {
  const result = mergeSourceRefresh({
    sourceId: preparedFederal.source.id,
    refresh: failureFixture,
  });
  assert.deepEqual(result.records, []);
  assert.equal(result.health.status, "unavailable");
  assert.equal(result.health.dataAsOf, null);
  assert.equal(result.health.usingLastKnownGood, false);
});

test("last-known-good loader uses hash-verified health and detail bytes", async () => {
  const fixture = await createLastKnownGoodFixture();
  try {
    const loaded = await loadLastKnownGoodSource(
      fixture.root,
      preparedFederal.source.id,
    );
    assert.equal(loaded.records.length, 1);
    assert.deepEqual(loaded.health, fixture.healthDocument.sources[0]);
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
      /does not hash source-health\.json/,
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
  assert.equal(first.get("manifest.json").nationCount, 575);
  assert.equal(first.get("manifest.json").recordCount, 2);
  assert.equal(first.get("index/records.json").records.length, 2);
  assert.deepEqual(
    first
      .get("source-health.json")
      .sources.map(({ sourceId, sourceName }) => ({ sourceId, sourceName })),
    sourceRegistry.sources.map(({ id, name }) => ({
      sourceId: id,
      sourceName: name,
    })),
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
    assert.equal("categoryIds" in entry, false);
    assert.equal("subcategoryIds" in entry, false);
    assert.deepEqual(entry.taxonomyMemberships, []);
    assert.deepEqual(entry.landmark, { isLandmark: false });
    assert.match(entry.detailPath, /^details\/[A-Za-z0-9_-]+\.json$/);
  }
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
