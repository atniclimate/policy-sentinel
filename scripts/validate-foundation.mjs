import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { assertSourceRegistrySemantics } from "../src/pipeline/source-registry.mjs";

const root = resolve(import.meta.dirname, "..");
const readJson = async (path) =>
  JSON.parse(await readFile(resolve(root, path), "utf8"));

const taxonomySchema = await readJson("schemas/taxonomy.schema.v1.json");
const recordSchema = await readJson("schemas/record.schema.v1.json");
const sourceSchema = await readJson("schemas/source.schema.v1.json");
const taxonomy = await readJson("config/taxonomy.v1.json");
const sourceRegistry = await readJson("config/sources.v1.json");

const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
addFormats(ajv);

for (const [name, schema] of [
  ["taxonomy schema", taxonomySchema],
  ["record schema", recordSchema],
  ["source schema", sourceSchema],
]) {
  if (!ajv.validateSchema(schema)) {
    throw new Error(
      `${name} is not a valid JSON Schema:\n${ajv.errorsText(
        ajv.errors,
        { separator: "\n" },
      )}`,
    );
  }
}

const validateTaxonomy = ajv.compile(taxonomySchema);
if (!validateTaxonomy(taxonomy)) {
  throw new Error(
    `taxonomy configuration is invalid:\n${ajv.errorsText(
      validateTaxonomy.errors,
      { separator: "\n" },
    )}`,
  );
}

const validateSources = ajv.compile(sourceSchema);
if (!validateSources(sourceRegistry)) {
  throw new Error(
    `source registry is invalid:\n${ajv.errorsText(validateSources.errors, {
      separator: "\n",
    })}`,
  );
}
assertSourceRegistrySemantics(sourceRegistry);

const categoryIds = new Set();
const subcategoryIds = new Map();
for (const category of taxonomy.categories) {
  if (categoryIds.has(category.id)) {
    throw new Error(`duplicate category id: ${category.id}`);
  }
  categoryIds.add(category.id);
  const ids = new Set();
  for (const subcategory of category.subcategories) {
    if (ids.has(subcategory.id)) {
      throw new Error(
        `duplicate subcategory id in ${category.id}: ${subcategory.id}`,
      );
    }
    ids.add(subcategory.id);
  }
  subcategoryIds.set(category.id, ids);
}

const mappingIds = new Set();
for (const mapping of taxonomy.mappingPolicy.sourceMappings) {
  if (mappingIds.has(mapping.id)) {
    throw new Error(`duplicate source mapping id: ${mapping.id}`);
  }
  mappingIds.add(mapping.id);
  for (const target of mapping.targets) {
    if (!categoryIds.has(target.categoryId)) {
      throw new Error(
        `mapping ${mapping.id} targets unknown category ${target.categoryId}`,
      );
    }
    if (
      target.subcategoryId &&
      !subcategoryIds.get(target.categoryId)?.has(target.subcategoryId)
    ) {
      throw new Error(
        `mapping ${mapping.id} targets unknown subcategory ${target.subcategoryId}`,
      );
    }
  }
}

const validateRecord = ajv.compile(recordSchema);
const fixtureDirectory = resolve(root, "fixtures", "records");
const fixtureNames = (await readdir(fixtureDirectory))
  .filter((name) => name.endsWith(".valid.json"))
  .sort();

if (fixtureNames.length === 0) {
  throw new Error("no valid record fixtures were found");
}

const criticalProvenanceFields = [
  "/officialTitle",
  "/sourceDocumentIdentifier",
  "/documentType",
  "/jurisdiction/name",
  "/status/sourceLabel",
  "/urls/officialSource",
];

const validateRecordPolicy = (record, name) => {
  const provenanceFields = record.fieldProvenance.map((entry) => entry.field);
  if (new Set(provenanceFields).size !== provenanceFields.length) {
    throw new Error(`${name}: fieldProvenance contains duplicate pointers`);
  }
  for (const field of criticalProvenanceFields) {
    if (!provenanceFields.includes(field)) {
      throw new Error(`${name}: missing critical provenance for ${field}`);
    }
  }

  const forbiddenKeys = new Set([
    "legalConclusion",
    "rightsImpact",
    "inferredRelevance",
    "parcelGeometry",
    "landOwnership",
    "trustLand",
    "feeLand",
  ]);
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (forbiddenKeys.has(key)) {
          throw new Error(`${name}: forbidden field ${key}`);
        }
        visit(child);
      }
    }
  };
  visit(record);

  const primaryDate =
    record.dates.published ??
    record.dates.introduced ??
    record.dates.effective ??
    record.dates.lastAction;
  if (primaryDate && Number(primaryDate.slice(0, 4)) < 1980) {
    const expected = record.landmark.isLandmark
      ? "landmark_detail"
      : "list_and_link";
    if (record.historical.pre1980Treatment !== expected) {
      throw new Error(
        `${name}: pre-1980 record must use ${expected} treatment`,
      );
    }
  }

  if (record.aiSummary.exists && record.aiSummary.text.includes("—")) {
    throw new Error(`${name}: AI summary contains an em dash`);
  }
};

const fixtures = [];
for (const name of fixtureNames) {
  const record = await readJson(`fixtures/records/${name}`);
  if (!validateRecord(record)) {
    throw new Error(
      `${name} is invalid:\n${ajv.errorsText(validateRecord.errors, {
        separator: "\n",
      })}`,
    );
  }
  validateRecordPolicy(record, name);
  fixtures.push(record);
}

let negativePolicyChecks = 0;

const generalFixture = structuredClone(
  fixtures.find((record) => record.jurisdiction.level === "federal"),
);
if (!generalFixture) {
  throw new Error("a federal general-jurisdiction fixture is required");
}
generalFixture.jurisdiction.level = "county";
generalFixture.jurisdiction.name = "Synthetic County";
generalFixture.jurisdiction.stateCode = "WA";
generalFixture.jurisdiction.generalJurisdictionOnly = false;
if (validateRecord(generalFixture)) {
  throw new Error(
    "negative policy test failed: county record without an explicit Nation association was accepted",
  );
}
negativePolicyChecks += 1;

const categorizedFixture = structuredClone(fixtures[0]);
categorizedFixture.taxonomyMemberships = [
  {
    categoryId: taxonomy.categories[0].id,
    subcategoryId: taxonomy.categories[0].subcategories[0].id,
    mappingRuleId: "synthetic-rule",
    taxonomyVersion: "1.0.0",
    officialSubjectLabels: ["Synthetic official subject"],
  },
];
categorizedFixture.isUnclassified = true;
if (validateRecord(categorizedFixture)) {
  throw new Error(
    "negative policy test failed: categorized record marked unclassified was accepted",
  );
}
negativePolicyChecks += 1;

const mislabeledGeneralFixture = structuredClone(
  fixtures.find((record) => record.jurisdiction.level === "federal"),
);
mislabeledGeneralFixture.jurisdiction.generalJurisdictionOnly = false;
if (validateRecord(mislabeledGeneralFixture)) {
  throw new Error(
    "negative policy test failed: a federal record without a Nation association was accepted as Nation-specific",
  );
}
negativePolicyChecks += 1;

const invalidAiFixture = structuredClone(
  fixtures.find((record) => record.jurisdiction.level === "federal"),
);
invalidAiFixture.aiSummary = {
  exists: true,
  label: "AI-generated source summary",
  text: "This synthetic summary contains an invalid em dash — and must fail.",
  generatedAt: "2026-07-30T14:00:00Z",
  model: "synthetic-model",
  provider: "synthetic-provider",
  buildId: "synthetic-build",
  policyVersion: "synthetic-policy-v1",
  citedInputs: [
    {
      field: "/officialTitle",
      sourceUrl: invalidAiFixture.urls.officialSource,
      sourceDate: invalidAiFixture.dates.published,
    },
  ],
  validationState: "approved",
};
if (validateRecord(invalidAiFixture)) {
  throw new Error(
    "negative policy test failed: an AI summary containing an em dash was accepted",
  );
}
negativePolicyChecks += 1;

const invalidHistoricalFixture = structuredClone(
  fixtures.find((record) => record.jurisdiction.level === "federal"),
);
invalidHistoricalFixture.dates.published = "1974-02-12";
let historicalPolicyRejected = false;
try {
  validateRecordPolicy(invalidHistoricalFixture, "synthetic pre-1980 negative");
} catch (error) {
  if (error.message.includes("pre-1980 record must use list_and_link")) {
    historicalPolicyRejected = true;
  } else {
    throw error;
  }
}
if (!historicalPolicyRejected) {
  throw new Error(
    "negative policy test failed: a non-landmark pre-1980 record received expanded treatment",
  );
}
negativePolicyChecks += 1;

console.log(
  `Foundation validation passed: 3 schemas, ${taxonomy.categories.length} categories, ` +
    `${taxonomy.categories.reduce((count, category) => count + category.subcategories.length, 0)} subcategories, ` +
    `${fixtureNames.length} valid fixtures, and ${negativePolicyChecks} negative policy checks.`,
);
