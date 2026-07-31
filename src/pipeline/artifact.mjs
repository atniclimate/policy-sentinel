import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { deriveBuildId, hashJson, serializeJson } from "./hashing.mjs";
import { toUrlSafeId } from "./identity.mjs";

const RECORD_SCHEMA_VERSION = "1.1.0";

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
    officialTitle: record.officialTitle,
    documentType: record.documentType,
    jurisdiction: record.jurisdiction,
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

export function createArtifactDocuments({
  records,
  nations,
  taxonomy,
  sourceRegistry,
  generatedAt,
  synthetic = true,
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
    entries: enabledSources.map((source) => ({
      sourceId: source.id,
      jurisdiction: source.jurisdiction,
      from: source.coverage.from,
      through: source.coverage.through,
      cadence: source.coverage.cadence,
      recordTypes: [
        ...new Set(
          records
            .filter((record) => record.source.id === source.id)
            .map(({ documentType }) => documentType),
        ),
      ].sort(),
      status: source.synthetic
        ? "synthetic"
        : records.some((record) => record.source.id === source.id)
          ? "available"
          : "unavailable",
      limitation: source.coverage.limitations,
    })),
  });

  const sourceHealth = enabledSources.map((source) => {
    const sourceRecords = records.filter(
      (record) => record.source.id === source.id,
    );
    const latest =
      sourceRecords
        .map((record) => record.sourceHealth)
        .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
        .at(-1) ?? null;
    return {
      sourceId: source.id,
      sourceName: source.name,
      status: latest?.status ?? "unavailable",
      checkedAt: latest?.checkedAt ?? normalizedGeneratedAt,
      dataAsOf: latest?.dataAsOf ?? null,
      lastSuccessfulRetrievalAt: latest?.lastSuccessfulRetrievalAt ?? null,
      usingLastKnownGood: latest?.usingLastKnownGood ?? false,
      stale:
        latest === null ||
        latest.usingLastKnownGood ||
        latest.status !== "healthy",
      recordCount: sourceRecords.length,
      failureStage: null,
      message:
        latest === null
          ? "No validated records are available."
          : latest.message,
    };
  });
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

  const manifest = {
    artifactType: "manifest",
    schemaVersion: "1.0.0",
    artifactVersion: "1.0.0",
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
}) {
  const output = assertSafeArtifactOutput(outputDirectory, projectRoot);
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
