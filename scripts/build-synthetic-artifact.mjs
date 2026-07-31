import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  createArtifactDocuments,
  generateSyntheticNations,
  normalizeGeneratedAt,
  writeArtifactDocuments,
} from "../src/pipeline/artifact.mjs";
import {
  completeSyntheticProvenance,
  validateRecordSetPolicy,
} from "../src/pipeline/policy-validation.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function parseArguments(argv) {
  const options = {
    out: path.join(projectRoot, "dist", "data"),
    generatedAt: new Date().toISOString(),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--out") {
      options.out = path.resolve(projectRoot, argv[++index] ?? "");
    } else if (argument === "--generated-at") {
      options.generatedAt = argv[++index] ?? "";
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  options.generatedAt = normalizeGeneratedAt(options.generatedAt);
  return options;
}

async function readJson(relativePath) {
  return JSON.parse(
    await readFile(path.resolve(projectRoot, relativePath), "utf8"),
  );
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

function assertUniqueRegistry(sourceRegistry) {
  const sourceIds = new Set();
  const adapterIds = new Set();
  for (const source of sourceRegistry.sources) {
    if (sourceIds.has(source.id)) {
      throw new Error(`duplicate source registry ID: ${source.id}`);
    }
    sourceIds.add(source.id);
    if (adapterIds.has(source.adapter.id)) {
      throw new Error(`duplicate adapter ID: ${source.adapter.id}`);
    }
    adapterIds.add(source.adapter.id);
    if (!source.synthetic || source.access.method !== "fixture") {
      throw new Error(
        `synthetic artifact cannot load non-fixture source ${source.id}`,
      );
    }
  }
}

function assertSafeFixturePath(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  if (
    path.isAbsolute(relativePath) ||
    !normalized.startsWith("fixtures/records/") ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`unsafe synthetic fixture path: ${relativePath}`);
  }
  return normalized;
}

const options = parseArguments(process.argv.slice(2));
const [
  taxonomy,
  sourceRegistry,
  refreshFixture,
  recordSchema,
  taxonomySchema,
  sourceSchema,
  artifactSchema,
] = await Promise.all([
  readJson("config/taxonomy.v1.json"),
  readJson("config/sources.v1.json"),
  readJson("fixtures/sources/synthetic-refresh.valid.json"),
  readJson("schemas/record.schema.v1.json"),
  readJson("schemas/taxonomy.schema.v1.json"),
  readJson("schemas/source.schema.v1.json"),
  readJson("schemas/artifact.schema.v1.json"),
]);

const [validateRecord, validateTaxonomy, validateSources, validateArtifact] =
  compileValidators([
    recordSchema,
    taxonomySchema,
    sourceSchema,
    artifactSchema,
  ]);
assertValid(validateTaxonomy, taxonomy, "taxonomy");
assertValid(validateSources, sourceRegistry, "source registry");
assertUniqueRegistry(sourceRegistry);

const configuredSources = new Map(
  sourceRegistry.sources.map((source) => [source.id, source]),
);
const inputSourceIds = new Set();
const records = [];
for (const input of refreshFixture.inputs) {
  if (input.outcome !== "success") {
    throw new Error(
      `synthetic build only accepts successful input: ${input.sourceId}`,
    );
  }
  if (inputSourceIds.has(input.sourceId)) {
    throw new Error(`duplicate synthetic refresh source: ${input.sourceId}`);
  }
  inputSourceIds.add(input.sourceId);

  const source = configuredSources.get(input.sourceId);
  if (!source || !source.enabled) {
    throw new Error(`unregistered or disabled source: ${input.sourceId}`);
  }
  const fixturePath = assertSafeFixturePath(input.recordFixture);
  if (source.adapter.module !== fixturePath) {
    throw new Error(
      `fixture path differs from registered adapter module: ${input.sourceId}`,
    );
  }
  const record = completeSyntheticProvenance(await readJson(fixturePath));
  if (record.source.id !== input.sourceId) {
    throw new Error(`fixture source mismatch: ${input.sourceId}`);
  }
  assertValid(validateRecord, record, `record ${record.internalId}`);
  records.push(record);
}

const enabledSources = sourceRegistry.sources
  .filter(({ enabled }) => enabled)
  .map(({ id }) => id)
  .sort();
if (
  JSON.stringify([...inputSourceIds].sort()) !== JSON.stringify(enabledSources)
) {
  throw new Error(
    "synthetic refresh fixture does not cover every enabled source",
  );
}

const nations = generateSyntheticNations();
validateRecordSetPolicy(records, {
  sourceRegistry,
  taxonomy,
  nations,
});

const documents = createArtifactDocuments({
  records,
  nations,
  taxonomy,
  sourceRegistry,
  generatedAt: options.generatedAt,
  synthetic: true,
});
for (const [relativePath, value] of documents) {
  if (relativePath === "taxonomy.json") {
    assertValid(validateTaxonomy, value, relativePath);
  } else {
    assertValid(validateArtifact, value, relativePath);
  }
}

const output = await writeArtifactDocuments({
  documents,
  outputDirectory: options.out,
  projectRoot,
});
const manifest = documents.get("manifest.json");
console.log(
  `Synthetic artifact built: ${manifest.recordCount} records, ` +
    `${manifest.nationCount} Nations, ${manifest.assets.length} hashed assets.`,
);
console.log(`Output: ${output}`);
console.log(`Build ID: ${manifest.buildId}`);
