import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256Bytes } from "./hashing.mjs";

const ASSET_PATH_PATTERN =
  /^(?:manifest|coverage|source-health|nations|taxonomy)\.json$|^index\/records\.json$|^details\/[A-Za-z0-9_-]+\.json$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SOURCE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function safeAssetPath(root, relativePath) {
  if (
    typeof relativePath !== "string" ||
    path.isAbsolute(relativePath) ||
    relativePath.includes("\\") ||
    relativePath
      .split("/")
      .some((segment) => ["", ".", ".."].includes(segment)) ||
    !ASSET_PATH_PATTERN.test(relativePath)
  ) {
    throw new Error(`unsafe artifact path: ${relativePath}`);
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`artifact path escapes root: ${relativePath}`);
  }
  return resolved;
}

function validateManifest(manifest, root) {
  if (
    manifest === null ||
    typeof manifest !== "object" ||
    Array.isArray(manifest) ||
    manifest.artifactType !== "manifest" ||
    manifest.schemaVersion !== "1.0.0" ||
    !Array.isArray(manifest.assets)
  ) {
    throw new Error("last-known-good manifest has an invalid structure");
  }

  const paths = new Set();
  for (const [index, asset] of manifest.assets.entries()) {
    if (
      asset === null ||
      typeof asset !== "object" ||
      Array.isArray(asset) ||
      typeof asset.path !== "string" ||
      !SHA256_PATTERN.test(asset.sha256) ||
      !Number.isSafeInteger(asset.sizeBytes) ||
      asset.sizeBytes < 1 ||
      asset.mediaType !== "application/json" ||
      !Array.isArray(asset.sourceIds) ||
      asset.sourceIds.some(
        (sourceId) =>
          typeof sourceId !== "string" || !SOURCE_ID_PATTERN.test(sourceId),
      ) ||
      new Set(asset.sourceIds).size !== asset.sourceIds.length
    ) {
      throw new Error(
        `last-known-good manifest asset ${index} has an invalid structure`,
      );
    }
    if (asset.path === "manifest.json") {
      throw new Error("last-known-good manifest cannot contain a self-hash");
    }
    safeAssetPath(root, asset.path);
    if (paths.has(asset.path)) {
      throw new Error(
        `last-known-good manifest repeats asset path: ${asset.path}`,
      );
    }
    paths.add(asset.path);
  }

  if (!paths.has("source-health.json")) {
    throw new Error(
      "last-known-good manifest does not hash source-health.json",
    );
  }
  return manifest.assets;
}

function parseVerifiedJson(verifiedAssets, assetPath) {
  const verified = verifiedAssets.get(assetPath);
  if (!verified) {
    throw new Error(`last-known-good asset was not verified: ${assetPath}`);
  }
  try {
    return JSON.parse(verified.content.toString("utf8"));
  } catch {
    throw new Error(`last-known-good asset is not valid JSON: ${assetPath}`);
  }
}

function validateHealthDocument(healthDocument) {
  if (
    healthDocument === null ||
    typeof healthDocument !== "object" ||
    Array.isArray(healthDocument) ||
    healthDocument.artifactType !== "source-health" ||
    healthDocument.schemaVersion !== "1.0.0" ||
    !Array.isArray(healthDocument.sources)
  ) {
    throw new Error("last-known-good source health has an invalid structure");
  }
  const sourceIds = new Set();
  const statuses = new Set([
    "healthy",
    "degraded",
    "failed",
    "unavailable",
    "unknown",
  ]);
  const failureStages = new Set([
    "contract",
    "discovery",
    "fetch",
    "normalize",
    "validation",
    "packaging",
  ]);
  const dateTimePattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  const isDateTimeOrNull = (value) =>
    value === null ||
    (typeof value === "string" &&
      dateTimePattern.test(value) &&
      !Number.isNaN(Date.parse(value)));
  for (const health of healthDocument.sources) {
    if (
      health === null ||
      typeof health !== "object" ||
      Array.isArray(health) ||
      typeof health.sourceId !== "string" ||
      !SOURCE_ID_PATTERN.test(health.sourceId) ||
      typeof health.sourceName !== "string" ||
      health.sourceName.trim() === "" ||
      !statuses.has(health.status) ||
      typeof health.checkedAt !== "string" ||
      !dateTimePattern.test(health.checkedAt) ||
      Number.isNaN(Date.parse(health.checkedAt)) ||
      !isDateTimeOrNull(health.dataAsOf) ||
      !isDateTimeOrNull(health.lastSuccessfulRetrievalAt) ||
      typeof health.usingLastKnownGood !== "boolean" ||
      typeof health.stale !== "boolean" ||
      !Number.isSafeInteger(health.recordCount) ||
      health.recordCount < 0 ||
      (health.failureStage !== null &&
        !failureStages.has(health.failureStage)) ||
      (health.message !== null && typeof health.message !== "string")
    ) {
      throw new Error(
        "last-known-good source health contains an invalid entry",
      );
    }
    if (sourceIds.has(health.sourceId)) {
      throw new Error(
        `last-known-good source health repeats source: ${health.sourceId}`,
      );
    }
    sourceIds.add(health.sourceId);
  }
  return healthDocument;
}

export async function verifyLastKnownGoodArtifact(root) {
  const manifestPath = safeAssetPath(root, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const assets = validateManifest(manifest, root);
  const verifiedAssets = new Map();

  for (const asset of assets) {
    const assetPath = safeAssetPath(root, asset.path);
    const content = await readFile(assetPath);
    if (content.byteLength !== asset.sizeBytes) {
      throw new Error(`last-known-good size mismatch: ${asset.path}`);
    }
    if (sha256Bytes(content) !== asset.sha256) {
      throw new Error(`last-known-good hash mismatch: ${asset.path}`);
    }
    verifiedAssets.set(asset.path, { asset, content });
  }

  return { manifest, verifiedAssets };
}

export async function loadLastKnownGoodSource(root, sourceId) {
  const { manifest, verifiedAssets } = await verifyLastKnownGoodArtifact(root);
  const records = [];

  for (const [assetPath, verified] of verifiedAssets) {
    const { asset } = verified;
    if (
      !assetPath.startsWith("details/") ||
      !asset.sourceIds.includes(sourceId)
    ) {
      continue;
    }
    const detail = parseVerifiedJson(verifiedAssets, assetPath);
    if (detail.record?.source?.id !== sourceId) {
      throw new Error(`last-known-good source mismatch in ${assetPath}`);
    }
    records.push(detail.record);
  }

  const healthDocument = validateHealthDocument(
    parseVerifiedJson(verifiedAssets, "source-health.json"),
  );
  const health = healthDocument.sources.find(
    (entry) => entry.sourceId === sourceId,
  );
  return { manifest, records, health: health ?? null };
}

function sanitizePublicMessage(message) {
  if (typeof message !== "string" || message.trim() === "") {
    return "Source refresh failed.";
  }
  return message.replaceAll(/https?:\/\/\S+/g, "[source]").slice(0, 240);
}

export function mergeSourceRefresh({
  sourceId,
  refresh,
  previousRecords = [],
  previousHealth = null,
}) {
  if (refresh.ok) {
    return {
      records: globalThis.structuredClone(refresh.records),
      health: {
        ...globalThis.structuredClone(refresh.health),
        sourceId,
        status: "healthy",
        usingLastKnownGood: false,
        stale: false,
        recordCount: refresh.records.length,
        failureStage: null,
      },
    };
  }

  const publicMessage = sanitizePublicMessage(refresh.publicMessage);
  if (previousRecords.length === 0 || previousHealth === null) {
    return {
      records: [],
      health: {
        sourceId,
        status: "unavailable",
        checkedAt: refresh.checkedAt,
        dataAsOf: null,
        lastSuccessfulRetrievalAt: null,
        usingLastKnownGood: false,
        stale: true,
        recordCount: 0,
        failureStage: refresh.failureStage,
        message: publicMessage,
      },
    };
  }

  const records = globalThis.structuredClone(previousRecords).map((record) => {
    record.sourceHealth = {
      ...record.sourceHealth,
      status: "degraded",
      checkedAt: refresh.checkedAt,
      usingLastKnownGood: true,
      message: publicMessage,
    };
    return record;
  });
  return {
    records,
    health: {
      ...globalThis.structuredClone(previousHealth),
      sourceId,
      status: "degraded",
      checkedAt: refresh.checkedAt,
      dataAsOf: previousHealth.dataAsOf,
      lastSuccessfulRetrievalAt: previousHealth.lastSuccessfulRetrievalAt,
      usingLastKnownGood: true,
      stale: true,
      recordCount: records.length,
      failureStage: refresh.failureStage,
      message: publicMessage,
    },
  };
}
