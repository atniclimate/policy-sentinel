import { lstat, open, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { assertArtifactSourceHealthState } from "../src/pipeline/artifact-health.mjs";
import { deriveBuildId, sha256Bytes } from "../src/pipeline/hashing.mjs";
import {
  ARTIFACT_MANIFEST_LIMITS_V1,
  assertArtifactManifestLimits,
  assertStaticArtifactBudget,
  toCompactIndexRecord,
} from "../src/pipeline/artifact.mjs";
import { toUrlSafeId } from "../src/pipeline/identity.mjs";
import { validateRecordSetPolicy } from "../src/pipeline/policy-validation.mjs";
import { assertSourceRegistrySemantics } from "../src/pipeline/source-registry.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function parseArguments(argv) {
  let directory = path.join(projectRoot, "dist", "data");
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--dir") {
      directory = path.resolve(projectRoot, argv[++index] ?? "");
    } else {
      throw new Error(`unknown argument: ${argv[index]}`);
    }
  }
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(directory);
  if (!resolved.startsWith(`${root}${path.sep}`) || resolved === root) {
    throw new Error("artifact directory must remain inside the project");
  }
  return resolved;
}

async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readProjectJson(relativePath) {
  return readJsonFile(path.resolve(projectRoot, relativePath));
}

async function inventoryArtifactEntries(root) {
  const rootStat = await lstat(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error("artifact root must be a regular directory, not a symlink");
  }

  const files = new Map();
  const directories = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path
        .relative(root, absolutePath)
        .replaceAll("\\", "/");
      const entryStat = await lstat(absolutePath);
      if (entryStat.isSymbolicLink()) {
        throw new Error(`artifact contains a symlink: ${relativePath}`);
      }
      if (entryStat.isDirectory()) {
        directories.push(relativePath);
        await visit(absolutePath);
      } else if (entryStat.isFile()) {
        if (!relativePath.endsWith(".json")) {
          throw new Error(
            `artifact contains an unmanifested non-JSON file: ${relativePath}`,
          );
        }
        files.set(relativePath, entryStat);
      } else {
        throw new Error(
          `artifact contains a non-regular filesystem entry: ${relativePath}`,
        );
      }
    }
  }

  await visit(root);
  return {
    directories: directories.sort(),
    files,
  };
}

async function readBoundedRegularFile(
  filePath,
  preflightStat,
  maxBytes,
  label,
) {
  if (preflightStat === undefined || !preflightStat.isFile()) {
    throw new Error(`${label} is not a regular file`);
  }
  if (preflightStat.size > maxBytes) {
    throw new Error(`${label} exceeds byte limit`);
  }

  const file = await open(filePath, "r");
  try {
    const openedStat = await file.stat();
    if (!openedStat.isFile()) {
      throw new Error(`${label} is not a regular file`);
    }
    if (openedStat.size !== preflightStat.size || openedStat.size > maxBytes) {
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
    if (offset !== openedStat.size) {
      throw new Error(`${label} changed while being read`);
    }
    return content.subarray(0, offset);
  } finally {
    await file.close();
  }
}

function expectedArtifactDirectories(filePaths) {
  const directories = new Set();
  for (const filePath of filePaths) {
    let directory = path.posix.dirname(filePath);
    while (directory !== ".") {
      directories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }
  return [...directories].sort();
}

function safeAssetPath(root, relativePath) {
  if (
    path.isAbsolute(relativePath) ||
    relativePath.includes("\\") ||
    relativePath.split("/").includes("..")
  ) {
    throw new Error(`unsafe manifest asset path: ${relativePath}`);
  }
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`)) {
    throw new Error(`manifest asset escapes artifact: ${relativePath}`);
  }
  return resolved;
}

function compileValidators(schemas) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    allowUnionTypes: true,
  });
  addFormats(ajv);
  return schemas.map((schema) => ajv.compile(schema));
}

function assertValid(validate, value, label) {
  if (validate(value)) {
    return;
  }
  throw new Error(
    `${label} failed schema validation:\n${validate.errors
      .map(({ instancePath, message }) => `- ${instancePath || "/"} ${message}`)
      .join("\n")}`,
  );
}

function assertUnique(values, label) {
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} contains duplicate values`);
  }
}

function assertNoCredentialMaterial(content, relativePath) {
  const secretPatterns = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
    /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
    /\bAIza[A-Za-z0-9_-]{35}\b/,
    /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
    /\bsk_live_[A-Za-z0-9]{20,}\b/,
    /\bnpm_[A-Za-z0-9]{30,}\b/,
  ];
  if (secretPatterns.some((pattern) => pattern.test(content))) {
    throw new Error(`credential-like material found in ${relativePath}`);
  }
}

function assertNationCollection(nationDocument) {
  const { nations, baseline } = nationDocument;
  if (nations.length !== 575 || baseline.count !== 575) {
    throw new Error("Nation artifact must contain exactly 575 entries");
  }
  assertUnique(
    nations.map(({ id }) => id),
    "Nation IDs",
  );
  assertUnique(
    nations.map(({ officialName }) => officialName.toLocaleLowerCase("en-US")),
    "official Nation names",
  );
  for (const nation of nations) {
    if (
      nation.stateCoverage.federalOnly !==
      (nation.stateCoverage.states.length === 0)
    ) {
      throw new Error(
        `inconsistent state coverage flag for Nation ${nation.id}`,
      );
    }
  }
}

function assertIndexMatchesDetails(indexDocument, detailEntries) {
  const entries = new Map(
    indexDocument.records.map((entry) => [entry.id, entry]),
  );
  if (entries.size !== detailEntries.length) {
    throw new Error("index/detail record count mismatch");
  }
  for (const [detailPath, detail] of detailEntries) {
    const { record } = detail;
    const expectedDetailPath = `details/${toUrlSafeId(record.internalId)}.json`;
    if (detailPath !== expectedDetailPath) {
      throw new Error(
        `detail document path does not match record identity: ${detailPath}`,
      );
    }
    const expected = toCompactIndexRecord(record);
    const actual = entries.get(record.internalId);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`index/detail mismatch for ${record.internalId}`);
    }
    if (actual.detailPath !== expectedDetailPath) {
      throw new Error(`unsafe detail path for ${record.internalId}`);
    }
    if ("aiSummary" in actual) {
      throw new Error(`AI summary leaked into index for ${record.internalId}`);
    }
  }
}

function assertHealth(sourceHealth, sourceRegistry, records) {
  const expectedSourceIds = sourceRegistry.sources
    .filter(({ enabled }) => enabled)
    .map(({ id }) => id)
    .sort();
  const actualSourceIds = sourceHealth.sources
    .map(({ sourceId }) => sourceId)
    .sort();
  if (JSON.stringify(expectedSourceIds) !== JSON.stringify(actualSourceIds)) {
    throw new Error(
      "source-health entries do not match enabled registry sources",
    );
  }
  for (const health of sourceHealth.sources) {
    const configuredSource = sourceRegistry.sources.find(
      (source) => source.id === health.sourceId,
    );
    if (health.sourceName !== configuredSource?.name) {
      throw new Error(`source-health name mismatch: ${health.sourceId}`);
    }
    const sourceRecords = records.filter(
      (record) => record.source.id === health.sourceId,
    );
    assertArtifactSourceHealthState({
      health,
      sourceRecords,
      label: "source-health",
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
        `source-health receipt differs from aggregate record freshness: ${health.sourceId}`,
      );
    }
  }
}

function recordCoverageDate(record) {
  const value = record.dates.published ?? record.status.asOf;
  if (typeof value !== "string" || value.length < 10) {
    throw new Error(
      `coverage record lacks a publication or status date: ${record.internalId}`,
    );
  }
  return value.slice(0, 10);
}

function assertRangeWithinDocumented(source, from, through) {
  if (from !== null && through !== null && from > through) {
    throw new Error(`coverage range is reversed: ${source.id}`);
  }
  if (
    source.coverage.from !== null &&
    (from === null || from < source.coverage.from)
  ) {
    throw new Error(`coverage begins outside documented range: ${source.id}`);
  }
  if (
    source.coverage.through !== null &&
    (through === null || through > source.coverage.through)
  ) {
    throw new Error(`coverage ends outside documented range: ${source.id}`);
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

function assertCoverage(coverage, sourceRegistry, records) {
  const expectedSourceIds = sourceRegistry.sources
    .filter(({ enabled }) => enabled)
    .map(({ id }) => id)
    .sort();
  const actualSourceIds = coverage.entries
    .map(({ sourceId }) => sourceId)
    .sort();
  if (JSON.stringify(expectedSourceIds) !== JSON.stringify(actualSourceIds)) {
    throw new Error("coverage entries do not match enabled registry sources");
  }

  for (const entry of coverage.entries) {
    const source = sourceRegistry.sources.find(
      ({ id }) => id === entry.sourceId,
    );
    if (source === undefined) {
      throw new Error(`coverage source is not registered: ${entry.sourceId}`);
    }
    if (
      entry.sourceName !== source.name ||
      entry.provider !== source.provider ||
      JSON.stringify(entry.jurisdiction) !==
        JSON.stringify(source.jurisdiction) ||
      entry.documentedFrom !== source.coverage.from ||
      entry.documentedThrough !== source.coverage.through ||
      entry.cadence !== source.coverage.cadence
    ) {
      throw new Error(`coverage metadata differs from registry: ${source.id}`);
    }

    const sourceRecords = records.filter(
      (record) => record.source.id === source.id,
    );
    const expectedRecordTypes = [
      ...new Set(sourceRecords.map(({ documentType }) => documentType)),
    ].sort();
    if (
      entry.recordCount !== sourceRecords.length ||
      JSON.stringify(entry.recordTypes) !== JSON.stringify(expectedRecordTypes)
    ) {
      throw new Error(`coverage record inventory mismatch: ${source.id}`);
    }

    if (sourceRecords.length === 0) {
      if (
        entry.from !== null ||
        entry.through !== null ||
        entry.recordFrom !== null ||
        entry.recordThrough !== null ||
        entry.status !== "unavailable" ||
        entry.limitation !== coverageLimitation(source)
      ) {
        throw new Error(
          `unavailable coverage exposes an emitted range: ${source.id}`,
        );
      }
      continue;
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
      ) ||
      entry.from !== selectedCoverage.from ||
      entry.through !== selectedCoverage.through
    ) {
      throw new Error(`coverage selected range mismatch: ${source.id}`);
    }
    if (entry.limitation !== coverageLimitation(source, selectedCoverage)) {
      throw new Error(`coverage limitation mismatch: ${source.id}`);
    }
    assertRangeWithinDocumented(source, entry.from, entry.through);

    const recordDates = sourceRecords.map(recordCoverageDate).sort();
    const recordFrom = recordDates[0];
    const recordThrough = recordDates.at(-1);
    if (
      recordDates.some(
        (date) =>
          (entry.from !== null && date < entry.from) ||
          (entry.through !== null && date > entry.through),
      )
    ) {
      throw new Error(`coverage record date is out of bounds: ${source.id}`);
    }
    if (
      entry.recordFrom !== recordFrom ||
      entry.recordThrough !== recordThrough
    ) {
      throw new Error(`coverage actual record range mismatch: ${source.id}`);
    }

    const selectedMatchesDocumented =
      entry.from === source.coverage.from &&
      entry.through === source.coverage.through;
    const actualSpansSelection =
      entry.recordFrom === entry.from && entry.recordThrough === entry.through;
    const expectedStatus = source.synthetic
      ? "synthetic"
      : selectedMatchesDocumented && actualSpansSelection
        ? "available"
        : "limited";
    if (entry.status !== expectedStatus) {
      throw new Error(`coverage status mismatch: ${source.id}`);
    }
  }
}

function assertManifestSourceIds(manifest, sourceRegistry) {
  const enabledSourceIds = new Set(
    sourceRegistry.sources.filter(({ enabled }) => enabled).map(({ id }) => id),
  );
  for (const asset of manifest.assets) {
    for (const sourceId of asset.sourceIds) {
      if (!enabledSourceIds.has(sourceId)) {
        throw new Error(
          `manifest asset references disabled or unregistered source: ${sourceId}`,
        );
      }
    }
  }
}

function assertActualArtifactBudget(assets, artifactFiles) {
  const actualAssets = assets.map((asset) => {
    const assetStat = artifactFiles.get(asset.path);
    if (assetStat === undefined || !assetStat.isFile()) {
      throw new Error(`artifact asset is not a regular file: ${asset.path}`);
    }
    return { ...asset, sizeBytes: assetStat.size };
  });
  assertStaticArtifactBudget(actualAssets);
  for (let index = 0; index < assets.length; index += 1) {
    if (actualAssets[index].sizeBytes !== assets[index].sizeBytes) {
      throw new Error(`asset size mismatch: ${assets[index].path}`);
    }
  }
}

const artifactDirectory = parseArguments(process.argv.slice(2));
const artifactInventory = await inventoryArtifactEntries(artifactDirectory);
const manifestStat = artifactInventory.files.get("manifest.json");
if (manifestStat === undefined) {
  throw new Error("artifact lacks a regular manifest.json file");
}
const manifestContent = await readBoundedRegularFile(
  path.join(artifactDirectory, "manifest.json"),
  manifestStat,
  ARTIFACT_MANIFEST_LIMITS_V1.maxManifestBytes,
  "artifact manifest",
);
const manifest = JSON.parse(manifestContent.toString("utf8"));

const [
  artifactSchema,
  recordSchema,
  taxonomySchema,
  sourceSchema,
  sourceRegistry,
  taxonomyConfig,
] = await Promise.all([
  readProjectJson("schemas/artifact.schema.v1.json"),
  readProjectJson("schemas/record.schema.v1.json"),
  readProjectJson("schemas/taxonomy.schema.v1.json"),
  readProjectJson("schemas/source.schema.v1.json"),
  readProjectJson("config/sources.v1.json"),
  readProjectJson("config/taxonomy.v1.json"),
]);
const [validateArtifact, validateRecord, validateTaxonomy, validateSources] =
  compileValidators([
    artifactSchema,
    recordSchema,
    taxonomySchema,
    sourceSchema,
  ]);
assertValid(validateSources, sourceRegistry, "source registry");
assertSourceRegistrySemantics(sourceRegistry);
assertValid(validateTaxonomy, taxonomyConfig, "configured taxonomy");

assertValid(validateArtifact, manifest, "manifest.json");
assertArtifactManifestLimits(manifest);
assertStaticArtifactBudget(manifest.assets);
if (manifest.sourceRegistryVersion !== sourceRegistry.registryVersion) {
  throw new Error(
    "manifest source-registry version differs from configured registry",
  );
}
assertManifestSourceIds(manifest, sourceRegistry);
assertUnique(
  manifest.assets.map(({ path: assetPath }) => assetPath),
  "manifest asset paths",
);
if (
  manifest.assets.some(({ path: assetPath }) => assetPath === "manifest.json")
) {
  throw new Error("manifest must not include a self-hash");
}

const requiredPaths = [
  "coverage.json",
  "source-health.json",
  "nations.json",
  "taxonomy.json",
  "index/records.json",
];
for (const requiredPath of requiredPaths) {
  if (
    !manifest.assets.some(({ path: assetPath }) => assetPath === requiredPath)
  ) {
    throw new Error(`manifest lacks required asset: ${requiredPath}`);
  }
}

const expectedFiles = [
  "manifest.json",
  ...manifest.assets.map(({ path: assetPath }) => assetPath),
].sort();
if (
  JSON.stringify([...artifactInventory.files.keys()].sort()) !==
  JSON.stringify(expectedFiles)
) {
  throw new Error("artifact contains missing or unmanifested JSON files");
}
if (
  JSON.stringify(artifactInventory.directories) !==
  JSON.stringify(expectedArtifactDirectories(expectedFiles))
) {
  throw new Error("artifact contains an unmanifested directory");
}
assertActualArtifactBudget(manifest.assets, artifactInventory.files);

const documents = new Map();
for (const asset of manifest.assets) {
  const absolutePath = safeAssetPath(artifactDirectory, asset.path);
  const content = await readBoundedRegularFile(
    absolutePath,
    artifactInventory.files.get(asset.path),
    asset.sizeBytes,
    `artifact asset ${asset.path}`,
  );
  if (content.byteLength !== asset.sizeBytes) {
    throw new Error(`asset size mismatch: ${asset.path}`);
  }
  if (sha256Bytes(content) !== asset.sha256) {
    throw new Error(`asset hash mismatch: ${asset.path}`);
  }
  const text = content.toString("utf8");
  assertNoCredentialMaterial(text, asset.path);
  const value = JSON.parse(text);
  documents.set(asset.path, value);
  if (asset.path === "taxonomy.json") {
    assertValid(validateTaxonomy, value, asset.path);
  } else {
    assertValid(validateArtifact, value, asset.path);
  }
}

assertStaticArtifactBudget(manifest.assets);

if (deriveBuildId(manifest.assets) !== manifest.buildId) {
  throw new Error("manifest build ID does not match asset hashes");
}

const taxonomy = documents.get("taxonomy.json");
if (JSON.stringify(taxonomy) !== JSON.stringify(taxonomyConfig)) {
  throw new Error("artifact taxonomy differs from configured taxonomy");
}

const nationDocument = documents.get("nations.json");
assertNationCollection(nationDocument);
const detailEntries = [...documents.entries()].filter(([assetPath]) =>
  assetPath.startsWith("details/"),
);
const records = detailEntries.map(([, { record }]) => record);
for (const [, detail] of detailEntries) {
  assertValid(validateRecord, detail.record, detail.record.internalId);
}
validateRecordSetPolicy(records, {
  sourceRegistry,
  taxonomy,
  nations: nationDocument.nations,
});

const indexDocument = documents.get("index/records.json");
assertIndexMatchesDetails(indexDocument, detailEntries);
assertCoverage(documents.get("coverage.json"), sourceRegistry, records);
assertHealth(documents.get("source-health.json"), sourceRegistry, records);

if (
  manifest.recordCount !== records.length ||
  manifest.nationCount !== nationDocument.nations.length
) {
  throw new Error("manifest counts do not match artifact contents");
}
const expectedDataAsOf =
  records.length === 0
    ? manifest.generatedAt
    : records
        .map((record) => record.sourceHealth.dataAsOf)
        .sort()
        .at(-1);
if (manifest.dataAsOf !== expectedDataAsOf) {
  throw new Error("manifest data-as-of does not match source records");
}

console.log(
  `Artifact validation passed: ${manifest.recordCount} records, ` +
    `${manifest.nationCount} Nations, ${manifest.assets.length} verified assets.`,
);
console.log(`Build ID: ${manifest.buildId}`);
