import { Buffer } from "node:buffer";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertArtifactSourceHealthState } from "./artifact-health.mjs";
import { deriveBuildId, hashJson, serializeJson } from "./hashing.mjs";
import { toUrlSafeId } from "./identity.mjs";

const RECORD_SCHEMA_VERSION = "1.3.0";

export const STATIC_ARTIFACT_BUDGET_V1 = Object.freeze({
  version: "1.0.0",
  maxIndexBytes: 6 * 1024 * 1024,
  maxInitialNonDetailBytes: 8 * 1024 * 1024,
  maxIndividualDetailBytes: 512 * 1024,
  maxAllDetailsBytes: 128 * 1024 * 1024,
  maxTotalAssetsBytes: 136 * 1024 * 1024,
});

export const ARTIFACT_MANIFEST_LIMITS_V1 = Object.freeze({
  version: "1.0.0",
  maxManifestBytes: 4 * 1024 * 1024,
  maxHashedAssets: 20_000,
});

const ARTIFACT_BUDGET_KEYS = [
  "maxIndexBytes",
  "maxInitialNonDetailBytes",
  "maxIndividualDetailBytes",
  "maxAllDetailsBytes",
  "maxTotalAssetsBytes",
];

const ARTIFACT_MANIFEST_LIMIT_KEYS = ["maxManifestBytes", "maxHashedAssets"];

function assertArtifactBudgetDefinition(budget) {
  if (
    budget === null ||
    typeof budget !== "object" ||
    Array.isArray(budget) ||
    budget.version !== "1.0.0"
  ) {
    throw new TypeError("artifact budget must use static budget version 1.0.0");
  }
  for (const key of ARTIFACT_BUDGET_KEYS) {
    if (!Number.isSafeInteger(budget[key]) || budget[key] < 1) {
      throw new TypeError(`artifact budget ${key} must be a positive integer`);
    }
  }
}

function assertArtifactManifestLimitDefinition(limits) {
  if (
    limits === null ||
    typeof limits !== "object" ||
    Array.isArray(limits) ||
    limits.version !== "1.0.0"
  ) {
    throw new TypeError(
      "artifact manifest limits must use manifest limit version 1.0.0",
    );
  }
  for (const key of ARTIFACT_MANIFEST_LIMIT_KEYS) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] < 1) {
      throw new TypeError(
        `artifact manifest limit ${key} must be a positive integer`,
      );
    }
  }
}

export function assertArtifactManifestLimits(
  manifest,
  limits = ARTIFACT_MANIFEST_LIMITS_V1,
) {
  assertArtifactManifestLimitDefinition(limits);
  if (
    manifest === null ||
    typeof manifest !== "object" ||
    Array.isArray(manifest) ||
    !Array.isArray(manifest.assets)
  ) {
    throw new TypeError("artifact manifest must contain an asset array");
  }
  if (manifest.assets.length > limits.maxHashedAssets) {
    throw new Error("artifact manifest exceeds hashed asset count limit");
  }
  const manifestBytes = Buffer.byteLength(serializeJson(manifest), "utf8");
  if (manifestBytes > limits.maxManifestBytes) {
    throw new Error("artifact manifest exceeds byte limit");
  }
  return {
    manifestBytes,
    hashedAssetCount: manifest.assets.length,
  };
}

export function assertStaticArtifactBudget(
  assets,
  budget = STATIC_ARTIFACT_BUDGET_V1,
) {
  assertArtifactBudgetDefinition(budget);
  const indexAssets = assets.filter(
    ({ path: assetPath }) => assetPath === "index/records.json",
  );
  if (indexAssets.length !== 1) {
    throw new Error("artifact budget requires exactly one compact index asset");
  }
  const details = assets.filter(({ path: assetPath }) =>
    assetPath.startsWith("details/"),
  );
  const initialBytes = assets
    .filter(({ path: assetPath }) => !assetPath.startsWith("details/"))
    .reduce((total, { sizeBytes }) => total + sizeBytes, 0);
  const detailBytes = details.reduce(
    (total, { sizeBytes }) => total + sizeBytes,
    0,
  );
  const totalBytes = assets.reduce(
    (total, { sizeBytes }) => total + sizeBytes,
    0,
  );
  const oversizedDetail = details.find(
    ({ sizeBytes }) => sizeBytes > budget.maxIndividualDetailBytes,
  );

  if (indexAssets[0].sizeBytes > budget.maxIndexBytes) {
    throw new Error("compact index exceeds static artifact budget");
  }
  if (initialBytes > budget.maxInitialNonDetailBytes) {
    throw new Error("initial non-detail assets exceed static artifact budget");
  }
  if (oversizedDetail !== undefined) {
    throw new Error(
      `detail asset exceeds static artifact budget: ${oversizedDetail.path}`,
    );
  }
  if (detailBytes > budget.maxAllDetailsBytes) {
    throw new Error("aggregate detail assets exceed static artifact budget");
  }
  if (totalBytes > budget.maxTotalAssetsBytes) {
    throw new Error("total assets exceed static artifact budget");
  }

  return {
    indexBytes: indexAssets[0].sizeBytes,
    initialNonDetailBytes: initialBytes,
    maximumIndividualDetailBytes: details.reduce(
      (maximum, { sizeBytes }) => Math.max(maximum, sizeBytes),
      0,
    ),
    allDetailsBytes: detailBytes,
    totalAssetsBytes: totalBytes,
  };
}

export function normalizeGeneratedAt(value = new Date().toISOString()) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError(`invalid generated-at timestamp: ${value}`);
  }
  return parsed.toISOString();
}

export function generateSyntheticNations() {
  const nations = [
    {
      id: "nation:synthetic-a",
      officialName: "Synthetic Nation A",
      authorizedAliases: [],
      recognitionBaselineVersion: "synthetic-575-v1",
      stateCoverage: {
        states: ["WA"],
        federalOnly: false,
        basis: "synthetic_fixture",
      },
    },
  ];
  for (let index = 2; index <= 575; index += 1) {
    nations.push({
      id: `nation:synthetic-${String(index).padStart(3, "0")}`,
      officialName: `Synthetic Nation ${String(index).padStart(3, "0")}`,
      authorizedAliases: [],
      recognitionBaselineVersion: "synthetic-575-v1",
      stateCoverage: {
        states: [],
        federalOnly: true,
        basis: "synthetic_fixture",
      },
    });
  }
  return nations;
}

export function toCompactIndexRecord(record) {
  const detailId = toUrlSafeId(record.internalId);
  return {
    id: record.internalId,
    detailPath: `details/${detailId}.json`,
    sourceDocumentIdentifier: record.sourceDocumentIdentifier,
    officialTitle: record.officialTitle,
    documentType: record.documentType,
    jurisdiction: record.jurisdiction,
    issuingBodies: record.issuingBodies.map(({ officialName }) => officialName),
    judicialContext: record.judicialContext,
    status: record.status,
    source: {
      id: record.source.id,
      name: record.source.name,
      provider: record.source.provider,
    },
    dates: {
      published: record.dates.published,
      updated: record.dates.updated,
      lastAction: record.dates.lastAction,
      deadline: record.dates.deadline,
    },
    urls: {
      officialSource: record.urls.officialSource,
    },
    taxonomyMemberships: [
      ...new Map(
        record.taxonomyMemberships.map(({ categoryId, subcategoryId }) => [
          `${categoryId}\u0000${subcategoryId ?? ""}`,
          { categoryId, subcategoryId },
        ]),
      ).values(),
    ].sort(
      (left, right) =>
        left.categoryId.localeCompare(right.categoryId) ||
        (left.subcategoryId ?? "").localeCompare(right.subcategoryId ?? ""),
    ),
    isUnclassified: record.isUnclassified,
    nationIds: record.nationAssociations.map(({ nationId }) => nationId),
    relevance: record.relevance,
    landmark: {
      isLandmark: record.landmark.isLandmark,
    },
    change: record.change,
  };
}

function sourceIdsForPath(relativePath, documents) {
  if (relativePath.startsWith("details/")) {
    return [documents.get(relativePath).record.source.id];
  }
  if (relativePath === "index/records.json") {
    return [
      ...new Set(
        documents.get(relativePath).records.map(({ source }) => source.id),
      ),
    ].sort();
  }
  if (relativePath === "source-health.json") {
    return documents
      .get(relativePath)
      .sources.map(({ sourceId }) => sourceId)
      .sort();
  }
  if (relativePath === "coverage.json") {
    return documents
      .get(relativePath)
      .entries.map(({ sourceId }) => sourceId)
      .sort();
  }
  return [];
}

function maxDataAsOf(records, generatedAt) {
  if (records.length === 0) {
    return generatedAt;
  }
  return records
    .map((record) => record.sourceHealth.dataAsOf)
    .sort()
    .at(-1);
}

function recordCoverageDate(record) {
  const value =
    record.judicialContext?.decisionDate ??
    record.dates.published ??
    record.status.asOf;
  if (typeof value !== "string" || value.length < 10) {
    throw new Error(
      `artifact record lacks a decision, publication, or status date: ${record.internalId}`,
    );
  }
  return value.slice(0, 10);
}

function assertOrderedRange(from, through, label) {
  if (from !== null && through !== null && from > through) {
    throw new Error(`${label} has a reversed date range`);
  }
}

function assertSelectedCoverage(source, selected, sourceRecords) {
  assertOrderedRange(
    source.coverage.from,
    source.coverage.through,
    `documented coverage for ${source.id}`,
  );
  assertOrderedRange(
    selected.from,
    selected.through,
    `selected coverage for ${source.id}`,
  );
  if (
    source.coverage.from !== null &&
    (selected.from === null || selected.from < source.coverage.from)
  ) {
    throw new Error(
      `selected coverage begins outside documented range: ${source.id}`,
    );
  }
  if (
    source.coverage.through !== null &&
    (selected.through === null || selected.through > source.coverage.through)
  ) {
    throw new Error(
      `selected coverage ends outside documented range: ${source.id}`,
    );
  }
  for (const record of sourceRecords) {
    const date = recordCoverageDate(record);
    if (
      (selected.from !== null && date < selected.from) ||
      (selected.through !== null && date > selected.through)
    ) {
      throw new Error(
        `record date falls outside selected coverage: ${record.internalId}`,
      );
    }
  }
}

function coverageLimitation(source, selectedCoverage = null) {
  if (
    selectedCoverage === null ||
    selectedCoverage.notes === source.coverage.limitations
  ) {
    return source.coverage.limitations;
  }
  return `${source.coverage.limitations} ${selectedCoverage.notes}`;
}

function createCoverageEntry(source, records) {
  const sourceRecords = records.filter(
    (record) => record.source.id === source.id,
  );
  if (sourceRecords.length === 0) {
    return {
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
      limitation: coverageLimitation(source),
    };
  }

  const selectedCoverage = sourceRecords[0].source.coverage;
  const serializedCoverage = JSON.stringify([
    selectedCoverage.from,
    selectedCoverage.through,
    selectedCoverage.notes,
  ]);
  if (
    sourceRecords.some(
      (record) =>
        JSON.stringify([
          record.source.coverage.from,
          record.source.coverage.through,
          record.source.coverage.notes,
        ]) !== serializedCoverage,
    )
  ) {
    throw new Error(
      `source records disagree on selected coverage: ${source.id}`,
    );
  }
  assertSelectedCoverage(source, selectedCoverage, sourceRecords);

  const recordDates = sourceRecords.map(recordCoverageDate).sort();
  const recordFrom = recordDates[0];
  const recordThrough = recordDates.at(-1);
  const selectedMatchesDocumented =
    selectedCoverage.from === source.coverage.from &&
    selectedCoverage.through === source.coverage.through;
  const actualSpansSelection =
    recordFrom === selectedCoverage.from &&
    recordThrough === selectedCoverage.through;

  return {
    sourceId: source.id,
    sourceName: source.name,
    provider: source.provider,
    jurisdiction: source.jurisdiction,
    from: selectedCoverage.from,
    through: selectedCoverage.through,
    documentedFrom: source.coverage.from,
    documentedThrough: source.coverage.through,
    recordFrom,
    recordThrough,
    recordCount: sourceRecords.length,
    cadence: source.coverage.cadence,
    recordTypes: [
      ...new Set(sourceRecords.map(({ documentType }) => documentType)),
    ].sort(),
    status: source.synthetic
      ? "synthetic"
      : selectedMatchesDocumented && actualSpansSelection
        ? "available"
        : "limited",
    limitation: coverageLimitation(source, selectedCoverage),
  };
}

function deriveSyntheticSourceHealth(source, sourceRecords, generatedAt) {
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
    checkedAt: latest?.checkedAt ?? generatedAt,
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
}

function assertSourceHealthReceipt(receipt, source, sourceRecords) {
  assertArtifactSourceHealthState({
    health: receipt,
    sourceRecords,
  });
  const expectedDataAsOf = sourceRecords
    .map((record) => record.sourceHealth.dataAsOf)
    .sort()
    .at(-1);
  const expectedLastSuccessfulRetrievalAt = sourceRecords
    .map((record) => record.sourceHealth.lastSuccessfulRetrievalAt)
    .filter((value) => value !== null)
    .sort()
    .at(-1);
  if (
    sourceRecords.length > 0 &&
    (receipt.dataAsOf !== expectedDataAsOf ||
      receipt.lastSuccessfulRetrievalAt !==
        (expectedLastSuccessfulRetrievalAt ?? null))
  ) {
    throw new Error(
      `artifact source-health receipt differs from aggregate record freshness: ${source.id}`,
    );
  }
}

function createArtifactSourceHealth(
  enabledSources,
  records,
  generatedAt,
  suppliedReceipts,
) {
  let receipts = suppliedReceipts;
  if (receipts === undefined) {
    if (enabledSources.some(({ synthetic }) => !synthetic)) {
      throw new Error(
        "artifact source-health receipts are required for non-synthetic enabled sources",
      );
    }
    receipts = enabledSources.map((source) => {
      const sourceRecords = records.filter(
        (record) => record.source.id === source.id,
      );
      return deriveSyntheticSourceHealth(source, sourceRecords, generatedAt);
    });
  }
  if (!Array.isArray(receipts)) {
    throw new TypeError("artifact source-health receipts must be an array");
  }

  const receiptsBySource = new Map();
  for (const receipt of receipts) {
    if (
      receipt === null ||
      typeof receipt !== "object" ||
      typeof receipt.sourceId !== "string"
    ) {
      throw new TypeError("artifact source-health receipt is malformed");
    }
    if (receiptsBySource.has(receipt.sourceId)) {
      throw new Error(
        `artifact source-health receipts contain duplicate source: ${receipt.sourceId}`,
      );
    }
    receiptsBySource.set(receipt.sourceId, receipt);
  }
  const expectedSourceIds = enabledSources.map(({ id }) => id).sort();
  const actualSourceIds = [...receiptsBySource.keys()].sort();
  if (JSON.stringify(actualSourceIds) !== JSON.stringify(expectedSourceIds)) {
    throw new Error(
      "artifact source-health receipts do not match enabled registry sources",
    );
  }

  return enabledSources.map((source) => {
    const receipt = receiptsBySource.get(source.id);
    const sourceRecords = records.filter(
      (record) => record.source.id === source.id,
    );
    assertSourceHealthReceipt(receipt, source, sourceRecords);
    return {
      sourceId: receipt.sourceId,
      sourceName: source.name,
      status: receipt.status,
      checkedAt: receipt.checkedAt,
      dataAsOf: receipt.dataAsOf,
      lastSuccessfulRetrievalAt: receipt.lastSuccessfulRetrievalAt,
      usingLastKnownGood: receipt.usingLastKnownGood,
      stale: receipt.stale,
      recordCount: receipt.recordCount,
      failureStage: receipt.failureStage,
      message: receipt.message,
    };
  });
}

export function createArtifactDocuments({
  records,
  nations,
  taxonomy,
  sourceRegistry,
  generatedAt,
  synthetic = true,
  artifactBudget = STATIC_ARTIFACT_BUDGET_V1,
  manifestLimits = ARTIFACT_MANIFEST_LIMITS_V1,
  sourceHealth: suppliedSourceHealth,
}) {
  const normalizedGeneratedAt = normalizeGeneratedAt(generatedAt);
  const documents = new Map();
  const enabledSources = sourceRegistry.sources.filter(
    ({ enabled }) => enabled,
  );
  const enabledSourceIds = new Set(enabledSources.map(({ id }) => id));
  for (const record of records) {
    if (record.schemaVersion !== RECORD_SCHEMA_VERSION) {
      throw new Error(
        `artifact record schema version mismatch: ${record.internalId} uses ${record.schemaVersion}`,
      );
    }
    if (!enabledSourceIds.has(record.source.id)) {
      throw new Error(
        `artifact record references disabled or unregistered source: ${record.source.id}`,
      );
    }
  }

  documents.set("coverage.json", {
    artifactType: "coverage",
    schemaVersion: "1.0.0",
    generatedAt: normalizedGeneratedAt,
    notices: [
      "Synthetic artifact for development and testing only.",
      "Public coverage is source-specific and does not represent all of a Nation's interests.",
      "A Nation outside Washington, Oregon, or Idaho receives federal coverage only.",
    ],
    entries: enabledSources.map((source) =>
      createCoverageEntry(source, records),
    ),
  });

  const sourceHealth = createArtifactSourceHealth(
    enabledSources,
    records,
    normalizedGeneratedAt,
    suppliedSourceHealth,
  );
  documents.set("source-health.json", {
    artifactType: "source-health",
    schemaVersion: "1.0.0",
    generatedAt: normalizedGeneratedAt,
    sources: sourceHealth,
  });

  documents.set("nations.json", {
    artifactType: "nation-collection",
    schemaVersion: "1.0.0",
    generatedAt: normalizedGeneratedAt,
    baseline: {
      count: 575,
      version: "synthetic-575-v1",
      authorityName: "Synthetic recognition baseline",
      authorityUrl:
        "https://official.example.invalid/recognition/synthetic-575",
      synthetic: true,
    },
    nations,
  });

  documents.set("taxonomy.json", taxonomy);
  documents.set("index/records.json", {
    artifactType: "record-index",
    schemaVersion: "1.0.0",
    generatedAt: normalizedGeneratedAt,
    records: records
      .map(toCompactIndexRecord)
      .sort((a, b) => a.id.localeCompare(b.id)),
  });

  for (const record of records) {
    documents.set(`details/${toUrlSafeId(record.internalId)}.json`, {
      artifactType: "record-detail",
      schemaVersion: "1.0.0",
      generatedAt: normalizedGeneratedAt,
      record,
    });
  }

  const assets = [...documents.entries()]
    .map(([assetPath, value]) => {
      const { sha256, sizeBytes } = hashJson(value);
      return {
        path: assetPath,
        sha256,
        sizeBytes,
        mediaType: "application/json",
        sourceIds: sourceIdsForPath(assetPath, documents),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  assertStaticArtifactBudget(assets, artifactBudget);

  const manifest = {
    artifactType: "manifest",
    schemaVersion: "1.0.0",
    artifactVersion: "1.3.0",
    buildId: deriveBuildId(assets),
    generatedAt: normalizedGeneratedAt,
    dataAsOf: maxDataAsOf(records, normalizedGeneratedAt),
    synthetic,
    recordSchemaVersion: RECORD_SCHEMA_VERSION,
    taxonomyVersion: taxonomy.taxonomyVersion,
    sourceRegistryVersion: sourceRegistry.registryVersion,
    recordCount: records.length,
    nationCount: nations.length,
    assets,
  };
  assertArtifactManifestLimits(manifest, manifestLimits);
  documents.set("manifest.json", manifest);
  return documents;
}

function assertSafeArtifactOutput(outputDirectory, projectRoot) {
  const output = path.resolve(outputDirectory);
  const root = path.resolve(projectRoot);
  const filesystemRoot = path.parse(output).root;
  if (output === filesystemRoot || output === root) {
    throw new Error(`refusing unsafe artifact output: ${output}`);
  }
  if (!output.startsWith(`${root}${path.sep}`)) {
    throw new Error("artifact output must remain inside the project directory");
  }
  const relative = path.relative(root, output).replaceAll("\\", "/");
  if (!relative.startsWith("dist/")) {
    throw new Error(
      `artifact output must be an isolated directory under dist/: ${relative}`,
    );
  }
  return output;
}

export async function writeArtifactDocuments({
  documents,
  outputDirectory,
  projectRoot,
  manifestLimits = ARTIFACT_MANIFEST_LIMITS_V1,
}) {
  const output = assertSafeArtifactOutput(outputDirectory, projectRoot);
  const manifest = documents?.get?.("manifest.json");
  assertArtifactManifestLimits(manifest, manifestLimits);
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const [relativePath, value] of documents) {
    const destination = path.resolve(output, relativePath);
    if (!destination.startsWith(`${output}${path.sep}`)) {
      throw new Error(`artifact path escapes output: ${relativePath}`);
    }
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, serializeJson(value), "utf8");
  }
  return output;
}
