import { Buffer } from "node:buffer";
import { constants } from "node:fs";
import { lstat, open, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  ARTIFACT_MANIFEST_LIMITS_V1,
  assertArtifactManifestLimits,
  assertStaticArtifactBudget,
  toCompactIndexRecord,
} from "./artifact.mjs";
import { assertArtifactSourceHealthState } from "./artifact-health.mjs";
import { deriveBuildId, sha256Bytes } from "./hashing.mjs";
import { recordIdentityKey, toUrlSafeId } from "./identity.mjs";
import { validateRecordSetPolicy } from "./policy-validation.mjs";
import { assertSourceRegistrySemantics } from "./source-registry.mjs";

const ASSET_PATH_PATTERN =
  /^(?:manifest|coverage|source-health|nations|taxonomy)\.json$|^index\/records\.json$|^details\/[A-Za-z0-9_-]+\.json$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SOURCE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMANTIC_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const SUPPORTED_ARTIFACT_VERSION = "1.3.0";
const SUPPORTED_RECORD_SCHEMA_VERSION = "1.3.0";
const ARTIFACT_DOCUMENT_SCHEMA_VERSION = "1.0.0";
const REQUIRED_ROOT_ASSETS = [
  "coverage.json",
  "source-health.json",
  "nations.json",
  "taxonomy.json",
  "index/records.json",
];
const MANIFEST_KEYS = [
  "artifactType",
  "schemaVersion",
  "artifactVersion",
  "buildId",
  "generatedAt",
  "dataAsOf",
  "synthetic",
  "recordSchemaVersion",
  "taxonomyVersion",
  "sourceRegistryVersion",
  "recordCount",
  "nationCount",
  "assets",
];
const MANIFEST_ASSET_KEYS = [
  "path",
  "sha256",
  "sizeBytes",
  "mediaType",
  "sourceIds",
];
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const READ_ONLY_NO_FOLLOW = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0);
let canonicalValidationContextPromise;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactlyKeys(value, expectedKeys) {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  );
}

function isDateTime(value) {
  return (
    typeof value === "string" &&
    DATE_TIME_PATTERN.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function sameStringSet(left, right) {
  return (
    JSON.stringify(sortedUnique(left)) === JSON.stringify(sortedUnique(right))
  );
}

function assertSchemaValid(validate, value, label) {
  if (validate(value)) {
    return;
  }
  throw new Error(
    `${label} failed schema validation:\n${validate.errors
      .map(({ instancePath, message }) => `- ${instancePath || "/"} ${message}`)
      .join("\n")}`,
  );
}

async function readProjectJson(relativePath) {
  return JSON.parse(
    await readFile(path.resolve(projectRoot, relativePath), "utf8"),
  );
}

async function createCanonicalValidationContext() {
  const [
    artifactSchema,
    recordSchema,
    taxonomySchema,
    sourceSchema,
    sourceRegistry,
    taxonomy,
  ] = await Promise.all([
    readProjectJson("schemas/artifact.schema.v1.json"),
    readProjectJson("schemas/record.schema.v1.json"),
    readProjectJson("schemas/taxonomy.schema.v1.json"),
    readProjectJson("schemas/source.schema.v1.json"),
    readProjectJson("config/sources.v1.json"),
    readProjectJson("config/taxonomy.v1.json"),
  ]);
  const ajv = new Ajv2020({
    allErrors: true,
    allowUnionTypes: true,
    strict: true,
  });
  addFormats(ajv);
  const validateArtifact = ajv.compile(artifactSchema);
  const validateRecord = ajv.compile(recordSchema);
  const validateTaxonomy = ajv.compile(taxonomySchema);
  const validateSources = ajv.compile(sourceSchema);
  assertSchemaValid(
    validateSources,
    sourceRegistry,
    "configured source registry",
  );
  assertSourceRegistrySemantics(sourceRegistry);
  assertSchemaValid(validateTaxonomy, taxonomy, "configured taxonomy");
  return {
    sourceRegistry,
    taxonomy,
    validateArtifact,
    validateRecord,
    validateTaxonomy,
  };
}

function canonicalValidationContext() {
  canonicalValidationContextPromise ??= createCanonicalValidationContext();
  return canonicalValidationContextPromise;
}

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
    !isObject(manifest) ||
    manifest.artifactType !== "manifest" ||
    manifest.schemaVersion !== ARTIFACT_DOCUMENT_SCHEMA_VERSION
  ) {
    throw new Error("last-known-good manifest has an invalid structure");
  }
  if (manifest.artifactVersion !== SUPPORTED_ARTIFACT_VERSION) {
    throw new Error(
      `last-known-good artifact package version is unsupported: ${String(manifest.artifactVersion)}`,
    );
  }
  if (manifest.recordSchemaVersion !== SUPPORTED_RECORD_SCHEMA_VERSION) {
    throw new Error(
      `last-known-good record schema version is unsupported: ${String(manifest.recordSchemaVersion)}`,
    );
  }
  assertArtifactManifestLimits(manifest);
  if (
    !hasExactlyKeys(manifest, MANIFEST_KEYS) ||
    !/^synthetic-[a-f0-9]{20}$/.test(manifest.buildId) ||
    !isDateTime(manifest.generatedAt) ||
    !isDateTime(manifest.dataAsOf) ||
    typeof manifest.synthetic !== "boolean" ||
    typeof manifest.taxonomyVersion !== "string" ||
    !SEMANTIC_VERSION_PATTERN.test(manifest.taxonomyVersion) ||
    typeof manifest.sourceRegistryVersion !== "string" ||
    !SEMANTIC_VERSION_PATTERN.test(manifest.sourceRegistryVersion) ||
    !Number.isSafeInteger(manifest.recordCount) ||
    manifest.recordCount < 0 ||
    manifest.nationCount !== 575 ||
    !Array.isArray(manifest.assets) ||
    manifest.assets.length < REQUIRED_ROOT_ASSETS.length
  ) {
    throw new Error("last-known-good manifest has an invalid structure");
  }

  const paths = new Set();
  for (const [index, asset] of manifest.assets.entries()) {
    if (
      !isObject(asset) ||
      !hasExactlyKeys(asset, MANIFEST_ASSET_KEYS) ||
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

  for (const requiredPath of REQUIRED_ROOT_ASSETS) {
    if (!paths.has(requiredPath)) {
      throw new Error(
        `last-known-good manifest lacks required asset: ${requiredPath}`,
      );
    }
  }
  const detailCount = manifest.assets.filter(({ path: assetPath }) =>
    assetPath.startsWith("details/"),
  ).length;
  if (detailCount !== manifest.recordCount) {
    throw new Error(
      "last-known-good manifest record count does not match detail assets",
    );
  }
  if (deriveBuildId(manifest.assets) !== manifest.buildId) {
    throw new Error("last-known-good manifest build ID does not match assets");
  }
  return manifest.assets;
}

function assertCanonicalManifestContext(manifest, context) {
  if (
    manifest.sourceRegistryVersion !== context.sourceRegistry.registryVersion
  ) {
    throw new Error(
      "last-known-good manifest source-registry version differs from configured registry",
    );
  }
  if (manifest.taxonomyVersion !== context.taxonomy.taxonomyVersion) {
    throw new Error(
      "last-known-good manifest taxonomy version differs from configured taxonomy",
    );
  }
  const enabledSourceIds = new Set(
    context.sourceRegistry.sources
      .filter(({ enabled }) => enabled)
      .map(({ id }) => id),
  );
  for (const asset of manifest.assets) {
    for (const sourceId of asset.sourceIds) {
      if (!enabledSourceIds.has(sourceId)) {
        throw new Error(
          `last-known-good manifest references a disabled or unregistered source: ${sourceId}`,
        );
      }
    }
  }
}

function assertCanonicalRecordSource(record, sourcesById) {
  const source = sourcesById.get(record.source.id);
  if (source === undefined || !source.enabled || source.adapter === null) {
    throw new Error(
      `last-known-good record source is not enabled and configured: ${record.internalId}`,
    );
  }
  if (
    record.source.name !== source.name ||
    record.source.provider !== source.provider ||
    record.source.adapterId !== source.adapter.id ||
    record.source.adapterVersion !== source.adapter.version ||
    record.source.attribution !== source.publication.attribution
  ) {
    throw new Error(
      `last-known-good record source metadata differs from configured registry: ${record.internalId}`,
    );
  }
}

async function inventoryArtifact(root) {
  const resolvedRoot = path.resolve(root);
  const rootStat = await lstat(resolvedRoot);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error("last-known-good artifact root is not a real directory");
  }

  const files = new Map();
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path
        .relative(resolvedRoot, absolutePath)
        .replaceAll("\\", "/");
      if (entry.isSymbolicLink()) {
        throw new Error(
          `last-known-good artifact contains a symbolic link: ${relativePath}`,
        );
      }
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        throw new Error(
          `last-known-good artifact contains an unsupported entry: ${relativePath}`,
        );
      }
      if (!relativePath.endsWith(".json")) {
        throw new Error(
          `last-known-good artifact contains a non-JSON file: ${relativePath}`,
        );
      }
      const fileStat = await lstat(absolutePath);
      if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
        throw new Error(
          `last-known-good artifact entry changed during inventory: ${relativePath}`,
        );
      }
      files.set(relativePath, {
        absolutePath,
        stat: fileStat,
        sizeBytes: fileStat.size,
      });
    }
  }
  await visit(resolvedRoot);
  return files;
}

function sameFileIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.birthtimeMs === right.birthtimeMs
  );
}

function sameFileSnapshot(left, right) {
  return (
    sameFileIdentity(left, right) &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  );
}

async function readBoundedRegularFile(
  filePath,
  preflightStat,
  maxBytes,
  label,
) {
  if (
    preflightStat === undefined ||
    preflightStat.isSymbolicLink() ||
    !preflightStat.isFile()
  ) {
    throw new Error(`${label} is not a regular file`);
  }
  if (preflightStat.size > maxBytes) {
    throw new Error(`${label} exceeds byte limit`);
  }

  let file;
  try {
    file = await open(filePath, READ_ONLY_NO_FOLLOW);
  } catch {
    throw new Error(`${label} could not be opened as a regular file`);
  }
  try {
    const openedStat = await file.stat();
    const openedPathStat = await lstat(filePath);
    if (
      !openedStat.isFile() ||
      openedPathStat.isSymbolicLink() ||
      !openedPathStat.isFile() ||
      !sameFileSnapshot(preflightStat, openedStat) ||
      !sameFileSnapshot(preflightStat, openedPathStat) ||
      openedStat.size > maxBytes
    ) {
      throw new Error(`${label} changed after filesystem preflight`);
    }

    const content = Buffer.allocUnsafe(maxBytes + 1);
    let offset = 0;
    while (offset < content.byteLength) {
      const { bytesRead } = await file.read(
        content,
        offset,
        content.byteLength - offset,
        offset,
      );
      if (bytesRead === 0) {
        break;
      }
      offset += bytesRead;
    }
    if (offset > maxBytes) {
      throw new Error(`${label} exceeds byte limit`);
    }
    const completedStat = await file.stat();
    const completedPathStat = await lstat(filePath);
    if (
      offset !== openedStat.size ||
      !sameFileSnapshot(openedStat, completedStat) ||
      completedPathStat.isSymbolicLink() ||
      !completedPathStat.isFile() ||
      !sameFileSnapshot(openedStat, completedPathStat)
    ) {
      throw new Error(`${label} changed while being read`);
    }
    return content.subarray(0, offset);
  } finally {
    await file.close();
  }
}

function assertCompleteInventory(manifest, inventory) {
  const expectedPaths = new Set([
    "manifest.json",
    ...manifest.assets.map(({ path: assetPath }) => assetPath),
  ]);
  for (const expectedPath of expectedPaths) {
    if (!inventory.has(expectedPath)) {
      throw new Error(
        `last-known-good artifact is missing a manifested file: ${expectedPath}`,
      );
    }
  }
  for (const actualPath of inventory.keys()) {
    if (!expectedPaths.has(actualPath)) {
      throw new Error(
        `last-known-good artifact contains an unmanifested file: ${actualPath}`,
      );
    }
  }
}

function assertPreflightSizes(assets, inventory) {
  assertStaticArtifactBudget(assets);
  const actualAssets = assets.map((asset) => ({
    ...asset,
    sizeBytes: inventory.get(asset.path).sizeBytes,
  }));
  assertStaticArtifactBudget(actualAssets);
  for (const asset of assets) {
    if (inventory.get(asset.path).sizeBytes !== asset.sizeBytes) {
      throw new Error(`last-known-good size mismatch: ${asset.path}`);
    }
  }
}

function parseVerifiedJson(verifiedAssets, assetPath) {
  const verified = verifiedAssets.get(assetPath);
  if (!verified) {
    throw new Error(`last-known-good asset was not verified: ${assetPath}`);
  }
  try {
    if (verified.parsed === undefined) {
      verified.parsed = JSON.parse(verified.content.toString("utf8"));
    }
    return verified.parsed;
  } catch {
    throw new Error(`last-known-good asset is not valid JSON: ${assetPath}`);
  }
}

function validateHealthDocument(healthDocument) {
  if (
    !isObject(healthDocument) ||
    healthDocument.artifactType !== "source-health" ||
    healthDocument.schemaVersion !== ARTIFACT_DOCUMENT_SCHEMA_VERSION ||
    !isDateTime(healthDocument.generatedAt) ||
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
  const isDateTimeOrNull = (value) => value === null || isDateTime(value);
  for (const health of healthDocument.sources) {
    if (
      !isObject(health) ||
      typeof health.sourceId !== "string" ||
      !SOURCE_ID_PATTERN.test(health.sourceId) ||
      typeof health.sourceName !== "string" ||
      health.sourceName.trim() === "" ||
      !statuses.has(health.status) ||
      !isDateTime(health.checkedAt) ||
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

function validateCoverageDocument(coverageDocument, generatedAt) {
  if (
    !isObject(coverageDocument) ||
    coverageDocument.artifactType !== "coverage" ||
    coverageDocument.schemaVersion !== ARTIFACT_DOCUMENT_SCHEMA_VERSION ||
    coverageDocument.generatedAt !== generatedAt ||
    !Array.isArray(coverageDocument.entries)
  ) {
    throw new Error("last-known-good coverage has an invalid structure");
  }
  const entries = new Map();
  for (const entry of coverageDocument.entries) {
    if (
      !isObject(entry) ||
      typeof entry.sourceId !== "string" ||
      !SOURCE_ID_PATTERN.test(entry.sourceId) ||
      typeof entry.sourceName !== "string" ||
      entry.sourceName.trim() === "" ||
      !Number.isSafeInteger(entry.recordCount) ||
      entry.recordCount < 0
    ) {
      throw new Error(
        "last-known-good coverage contains an invalid source entry",
      );
    }
    if (entries.has(entry.sourceId)) {
      throw new Error(
        `last-known-good coverage repeats source: ${entry.sourceId}`,
      );
    }
    entries.set(entry.sourceId, entry);
  }
  return entries;
}

function validateIndexDocument(indexDocument, generatedAt) {
  if (
    !isObject(indexDocument) ||
    indexDocument.artifactType !== "record-index" ||
    indexDocument.schemaVersion !== ARTIFACT_DOCUMENT_SCHEMA_VERSION ||
    indexDocument.generatedAt !== generatedAt ||
    !Array.isArray(indexDocument.records)
  ) {
    throw new Error("last-known-good record index has an invalid structure");
  }
  return indexDocument;
}

function validateDetailDocument(detailDocument, assetPath, generatedAt) {
  if (
    !isObject(detailDocument) ||
    detailDocument.artifactType !== "record-detail" ||
    detailDocument.schemaVersion !== ARTIFACT_DOCUMENT_SCHEMA_VERSION ||
    detailDocument.generatedAt !== generatedAt ||
    !isObject(detailDocument.record)
  ) {
    throw new Error(
      `last-known-good detail has an invalid structure: ${assetPath}`,
    );
  }
  const { record } = detailDocument;
  if (record.schemaVersion !== SUPPORTED_RECORD_SCHEMA_VERSION) {
    throw new Error(
      `last-known-good detail record schema version is unsupported: ${assetPath}`,
    );
  }
  if (
    typeof record.internalId !== "string" ||
    !isObject(record.source) ||
    typeof record.source.id !== "string" ||
    !SOURCE_ID_PATTERN.test(record.source.id) ||
    typeof record.source.recordId !== "string" ||
    record.source.recordId.length === 0 ||
    !record.internalId.startsWith(`psr:${record.source.id}:`) ||
    !isObject(record.sourceHealth)
  ) {
    throw new Error(
      `last-known-good detail record identity is invalid: ${assetPath}`,
    );
  }
  let expectedPath;
  try {
    expectedPath = `details/${toUrlSafeId(record.internalId)}.json`;
  } catch {
    throw new Error(
      `last-known-good detail record identity is invalid: ${assetPath}`,
    );
  }
  if (assetPath !== expectedPath) {
    throw new Error(
      `last-known-good detail path is not canonical: ${assetPath}`,
    );
  }
  return record;
}

function assertAssetSourceIds(asset, actualSourceIds) {
  if (
    asset.sourceIds.length !== sortedUnique(actualSourceIds).length ||
    !sameStringSet(asset.sourceIds, actualSourceIds)
  ) {
    throw new Error(
      `last-known-good manifest source tags do not match ${asset.path}`,
    );
  }
}

function validateArtifactContents(manifest, verifiedAssets, context) {
  for (const assetPath of verifiedAssets.keys()) {
    const document = parseVerifiedJson(verifiedAssets, assetPath);
    assertSchemaValid(
      assetPath === "taxonomy.json"
        ? context.validateTaxonomy
        : context.validateArtifact,
      document,
      `last-known-good asset ${assetPath}`,
    );
  }

  const coverageEntries = validateCoverageDocument(
    parseVerifiedJson(verifiedAssets, "coverage.json"),
    manifest.generatedAt,
  );
  const healthDocument = validateHealthDocument(
    parseVerifiedJson(verifiedAssets, "source-health.json"),
  );
  if (healthDocument.generatedAt !== manifest.generatedAt) {
    throw new Error(
      "last-known-good source health generation time does not match manifest",
    );
  }
  const indexDocument = validateIndexDocument(
    parseVerifiedJson(verifiedAssets, "index/records.json"),
    manifest.generatedAt,
  );
  const nationDocument = parseVerifiedJson(verifiedAssets, "nations.json");
  if (
    !isObject(nationDocument) ||
    nationDocument.artifactType !== "nation-collection" ||
    nationDocument.schemaVersion !== ARTIFACT_DOCUMENT_SCHEMA_VERSION ||
    nationDocument.generatedAt !== manifest.generatedAt ||
    !isObject(nationDocument.baseline) ||
    nationDocument.baseline.count !== manifest.nationCount ||
    !Array.isArray(nationDocument.nations) ||
    nationDocument.nations.length !== manifest.nationCount
  ) {
    throw new Error(
      "last-known-good Nation collection does not match manifest count",
    );
  }
  const taxonomyDocument = parseVerifiedJson(verifiedAssets, "taxonomy.json");
  if (
    !isObject(taxonomyDocument) ||
    taxonomyDocument.taxonomyVersion !== manifest.taxonomyVersion ||
    JSON.stringify(taxonomyDocument) !== JSON.stringify(context.taxonomy)
  ) {
    throw new Error(
      "last-known-good taxonomy differs from the configured taxonomy",
    );
  }

  const records = [];
  const recordsById = new Map();
  const recordIdentityKeys = new Set();
  const configuredSourcesById = new Map(
    context.sourceRegistry.sources.map((source) => [source.id, source]),
  );
  const detailEntries = [...verifiedAssets.entries()].filter(([assetPath]) =>
    assetPath.startsWith("details/"),
  );
  for (const [assetPath, verified] of detailEntries) {
    const record = validateDetailDocument(
      parseVerifiedJson(verifiedAssets, assetPath),
      assetPath,
      manifest.generatedAt,
    );
    assertSchemaValid(
      context.validateRecord,
      record,
      `last-known-good record ${record.internalId ?? assetPath}`,
    );
    if (recordsById.has(record.internalId)) {
      throw new Error(
        `last-known-good artifact repeats record ID: ${record.internalId}`,
      );
    }
    const identityKey = recordIdentityKey(record);
    if (recordIdentityKeys.has(identityKey)) {
      throw new Error(
        `last-known-good artifact repeats source record identity: ${record.source.id}/${record.source.recordId}`,
      );
    }
    assertAssetSourceIds(verified.asset, [record.source.id]);
    records.push(record);
    recordsById.set(record.internalId, record);
    recordIdentityKeys.add(identityKey);
  }

  validateRecordSetPolicy(records, {
    sourceRegistry: context.sourceRegistry,
    taxonomy: context.taxonomy,
    nations: nationDocument.nations,
  });
  for (const record of records) {
    assertCanonicalRecordSource(record, configuredSourcesById);
  }

  if (
    records.length !== manifest.recordCount ||
    indexDocument.records.length !== manifest.recordCount
  ) {
    throw new Error(
      "last-known-good manifest, index, and detail record counts disagree",
    );
  }
  const indexIds = new Set();
  const indexDetailPaths = new Set();
  for (const entry of indexDocument.records) {
    if (!isObject(entry) || typeof entry.id !== "string") {
      throw new Error("last-known-good record index contains an invalid entry");
    }
    if (indexIds.has(entry.id)) {
      throw new Error(
        `last-known-good record index repeats record ID: ${entry.id}`,
      );
    }
    if (
      typeof entry.detailPath !== "string" ||
      indexDetailPaths.has(entry.detailPath)
    ) {
      throw new Error(
        `last-known-good record index repeats or omits a detail path: ${entry.id}`,
      );
    }
    const record = recordsById.get(entry.id);
    const expected =
      record === undefined ? undefined : toCompactIndexRecord(record);
    if (
      expected === undefined ||
      JSON.stringify(entry) !== JSON.stringify(expected)
    ) {
      throw new Error(
        `last-known-good index/detail mismatch for record: ${entry.id}`,
      );
    }
    indexIds.add(entry.id);
    indexDetailPaths.add(entry.detailPath);
  }

  const actualRecordSourceIds = sortedUnique(
    records.map(({ source }) => source.id),
  );
  assertAssetSourceIds(
    verifiedAssets.get("index/records.json").asset,
    actualRecordSourceIds,
  );

  const healthBySource = new Map(
    healthDocument.sources.map((health) => [health.sourceId, health]),
  );
  const healthSourceIds = [...healthBySource.keys()].sort();
  const coverageSourceIds = [...coverageEntries.keys()].sort();
  if (JSON.stringify(healthSourceIds) !== JSON.stringify(coverageSourceIds)) {
    throw new Error(
      "last-known-good coverage and source-health memberships disagree",
    );
  }
  const configuredSourceIds = context.sourceRegistry.sources
    .filter(({ enabled }) => enabled)
    .map(({ id }) => id)
    .sort();
  if (JSON.stringify(healthSourceIds) !== JSON.stringify(configuredSourceIds)) {
    throw new Error(
      "last-known-good source membership differs from configured registry",
    );
  }
  assertAssetSourceIds(
    verifiedAssets.get("source-health.json").asset,
    healthSourceIds,
  );
  assertAssetSourceIds(
    verifiedAssets.get("coverage.json").asset,
    coverageSourceIds,
  );
  assertAssetSourceIds(verifiedAssets.get("nations.json").asset, []);
  assertAssetSourceIds(verifiedAssets.get("taxonomy.json").asset, []);

  for (const sourceId of actualRecordSourceIds) {
    if (!healthBySource.has(sourceId)) {
      throw new Error(
        `last-known-good source health omits record source: ${sourceId}`,
      );
    }
  }
  for (const health of healthDocument.sources) {
    const sourceRecords = records.filter(
      (record) => record.source.id === health.sourceId,
    );
    const coverage = coverageEntries.get(health.sourceId);
    const configuredSource = configuredSourcesById.get(health.sourceId);
    if (
      health.recordCount !== sourceRecords.length ||
      coverage.recordCount !== sourceRecords.length
    ) {
      throw new Error(
        `last-known-good source record count mismatch: ${health.sourceId}`,
      );
    }
    if (coverage.sourceName !== health.sourceName) {
      throw new Error(
        `last-known-good source name mismatch: ${health.sourceId}`,
      );
    }
    if (
      configuredSource === undefined ||
      health.sourceName !== configuredSource.name ||
      coverage.sourceName !== configuredSource.name ||
      coverage.provider !== configuredSource.provider
    ) {
      throw new Error(
        `last-known-good source metadata differs from configured registry: ${health.sourceId}`,
      );
    }
    if (
      sourceRecords.some((record) => record.source.name !== health.sourceName)
    ) {
      throw new Error(
        `last-known-good source name differs from records: ${health.sourceId}`,
      );
    }
    assertArtifactSourceHealthState({
      health,
      sourceRecords,
      label: "last-known-good source-health",
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
      (health.dataAsOf !== expectedDataAsOf ||
        health.lastSuccessfulRetrievalAt !==
          (expectedLastSuccessfulRetrievalAt ?? null))
    ) {
      throw new Error(
        `last-known-good source freshness mismatch: ${health.sourceId}`,
      );
    }
  }

  const expectedDataAsOf =
    records.length === 0
      ? manifest.generatedAt
      : records
          .map((record) => record.sourceHealth.dataAsOf)
          .sort()
          .at(-1);
  if (manifest.dataAsOf !== expectedDataAsOf) {
    throw new Error(
      "last-known-good manifest data-as-of does not match records",
    );
  }
  return { records, healthDocument };
}

export async function verifyLastKnownGoodArtifact(root) {
  const manifestPath = safeAssetPath(root, "manifest.json");
  const manifestStat = await lstat(manifestPath);
  if (manifestStat.isSymbolicLink() || !manifestStat.isFile()) {
    throw new Error("last-known-good manifest is not a real file");
  }
  if (manifestStat.size > ARTIFACT_MANIFEST_LIMITS_V1.maxManifestBytes) {
    throw new Error("last-known-good manifest exceeds static artifact budget");
  }
  const manifestContent = await readBoundedRegularFile(
    manifestPath,
    manifestStat,
    ARTIFACT_MANIFEST_LIMITS_V1.maxManifestBytes,
    "last-known-good manifest",
  );
  let manifest;
  try {
    manifest = JSON.parse(manifestContent.toString("utf8"));
  } catch {
    throw new Error("last-known-good manifest is not valid JSON");
  }
  const assets = validateManifest(manifest, root);
  const context = await canonicalValidationContext();
  assertSchemaValid(
    context.validateArtifact,
    manifest,
    "last-known-good manifest",
  );
  assertCanonicalManifestContext(manifest, context);
  const inventory = await inventoryArtifact(root);
  assertCompleteInventory(manifest, inventory);
  assertPreflightSizes(assets, inventory);
  const verifiedAssets = new Map();

  for (const asset of assets) {
    const assetPath = safeAssetPath(root, asset.path);
    const content = await readBoundedRegularFile(
      assetPath,
      inventory.get(asset.path).stat,
      asset.sizeBytes,
      `last-known-good asset ${asset.path}`,
    );
    if (content.byteLength !== asset.sizeBytes) {
      throw new Error(`last-known-good size mismatch: ${asset.path}`);
    }
    if (sha256Bytes(content) !== asset.sha256) {
      throw new Error(`last-known-good hash mismatch: ${asset.path}`);
    }
    verifiedAssets.set(asset.path, { asset, content });
  }

  const { records, healthDocument } = validateArtifactContents(
    manifest,
    verifiedAssets,
    context,
  );
  return { manifest, verifiedAssets, records, healthDocument };
}

export async function loadLastKnownGoodSource(root, sourceId) {
  if (typeof sourceId !== "string" || !SOURCE_ID_PATTERN.test(sourceId)) {
    throw new TypeError(`invalid last-known-good source ID: ${sourceId}`);
  }
  const {
    manifest,
    records: allRecords,
    healthDocument,
  } = await verifyLastKnownGoodArtifact(root);
  const records = allRecords.filter((record) => record.source.id === sourceId);
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
    if (refresh.health?.sourceId !== sourceId) {
      throw new Error("source refresh health does not match requested source");
    }
    if (
      !Array.isArray(refresh.records) ||
      refresh.records.some((record) => record?.source?.id !== sourceId)
    ) {
      throw new Error("source refresh records do not match requested source");
    }
  } else if (refresh.sourceId !== sourceId) {
    throw new Error("source refresh failure does not match requested source");
  }
  if (
    !Array.isArray(previousRecords) ||
    previousRecords.some((record) => record?.source?.id !== sourceId)
  ) {
    throw new Error("previous records do not match requested source");
  }
  if (previousHealth !== null && previousHealth?.sourceId !== sourceId) {
    throw new Error("previous health does not match requested source");
  }

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
