import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { deriveBuildId, sha256Bytes } from "../src/pipeline/hashing.mjs";
import { toCompactIndexRecord } from "../src/pipeline/artifact.mjs";
import { toUrlSafeId } from "../src/pipeline/identity.mjs";
import { validateRecordSetPolicy } from "../src/pipeline/policy-validation.mjs";

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

async function listJsonFiles(root, directory = root) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listJsonFiles(root, absolute)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      results.push(path.relative(root, absolute).replaceAll("\\", "/"));
    }
  }
  return results.sort();
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

function assertIndexMatchesDetails(indexDocument, details) {
  const entries = new Map(
    indexDocument.records.map((entry) => [entry.id, entry]),
  );
  if (entries.size !== details.length) {
    throw new Error("index/detail record count mismatch");
  }
  for (const record of details) {
    const expected = toCompactIndexRecord(record);
    const actual = entries.get(record.internalId);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`index/detail mismatch for ${record.internalId}`);
    }
    if (
      actual.detailPath !== `details/${toUrlSafeId(record.internalId)}.json`
    ) {
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
    if (health.recordCount !== sourceRecords.length) {
      throw new Error(
        `source-health record count mismatch: ${health.sourceId}`,
      );
    }
    if (
      health.usingLastKnownGood &&
      (!health.stale || health.status !== "degraded")
    ) {
      throw new Error(`invalid last-known-good health: ${health.sourceId}`);
    }
    if (
      health.status === "unavailable" &&
      (health.recordCount !== 0 || health.dataAsOf !== null)
    ) {
      throw new Error(`unavailable source exposes records: ${health.sourceId}`);
    }
  }
}

const artifactDirectory = parseArguments(process.argv.slice(2));
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
assertValid(validateTaxonomy, taxonomyConfig, "configured taxonomy");

const manifest = await readJsonFile(
  path.join(artifactDirectory, "manifest.json"),
);
assertValid(validateArtifact, manifest, "manifest.json");
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

const artifactFiles = await listJsonFiles(artifactDirectory);
const expectedFiles = [
  "manifest.json",
  ...manifest.assets.map(({ path: assetPath }) => assetPath),
].sort();
if (JSON.stringify(artifactFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error("artifact contains missing or unmanifested JSON files");
}

const documents = new Map();
for (const asset of manifest.assets) {
  const absolutePath = safeAssetPath(artifactDirectory, asset.path);
  const content = await readFile(absolutePath);
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

if (deriveBuildId(manifest.assets) !== manifest.buildId) {
  throw new Error("manifest build ID does not match asset hashes");
}

const taxonomy = documents.get("taxonomy.json");
if (JSON.stringify(taxonomy) !== JSON.stringify(taxonomyConfig)) {
  throw new Error("artifact taxonomy differs from configured taxonomy");
}

const nationDocument = documents.get("nations.json");
assertNationCollection(nationDocument);
const detailDocuments = [...documents.entries()]
  .filter(([assetPath]) => assetPath.startsWith("details/"))
  .map(([, detail]) => detail);
const records = detailDocuments.map(({ record }) => record);
for (const detail of detailDocuments) {
  assertValid(validateRecord, detail.record, detail.record.internalId);
}
validateRecordSetPolicy(records, {
  sourceRegistry,
  taxonomy,
  nations: nationDocument.nations,
});

const indexDocument = documents.get("index/records.json");
assertIndexMatchesDetails(indexDocument, records);
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
