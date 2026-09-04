import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { assertSourceRegistrySemantics } from "../src/pipeline/source-registry.mjs";

const root = resolve(import.meta.dirname, "..");
const readJson = async (path) =>
  JSON.parse(await readFile(resolve(root, path), "utf8"));

const taxonomySchema = await readJson("schemas/taxonomy.schema.v1.json");
const taxonomyBundleSchema = await readJson(
  "schemas/taxonomy-bundle.schema.v1.json",
);
const recordSchema = await readJson("schemas/record.schema.v1.json");
const sourceSchema = await readJson("schemas/source.schema.v1.json");
const assertionSchema = await readJson("schemas/assertion.schema.v1.json");
const lifecycleSchema = await readJson("schemas/lifecycle.schema.v1.json");
const projectionProfileSchema = await readJson(
  "schemas/projection-profile.schema.v1.json",
);
const geographyRightsSchema = await readJson(
  "schemas/geography-rights.schema.v1.json",
);
const sourcePackBundleSchema = await readJson(
  "schemas/source-pack-bundle.schema.v1.json",
);
const realSourceLifecycleBundleSchema = await readJson(
  "schemas/real-source-lifecycle-bundle.schema.v1.json",
);
const analyzedCorpusSchema = await readJson(
  "schemas/analyzed-corpus.schema.v1.json",
);
const spatialObservationSchema = await readJson(
  "schemas/experimental/spatial-observation.schema.v1.json",
);
const spatialRelationSchema = await readJson(
  "schemas/experimental/spatial-relation.schema.v1.json",
);
const jurisdictionEvidenceSchema = await readJson(
  "schemas/experimental/jurisdiction-evidence.schema.v1.json",
);
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
  ["taxonomy bundle schema", taxonomyBundleSchema],
  ["record schema", recordSchema],
  ["source schema", sourceSchema],
  ["assertion schema", assertionSchema],
  ["lifecycle schema", lifecycleSchema],
  ["projection profile schema", projectionProfileSchema],
  ["geography and rights schema", geographyRightsSchema],
  ["source-pack bundle schema", sourcePackBundleSchema],
  ["real-source lifecycle bundle schema", realSourceLifecycleBundleSchema],
  ["analyzed corpus schema", analyzedCorpusSchema],
  ["S0 spatial-observation schema", spatialObservationSchema],
  ["S0 spatial-relation schema", spatialRelationSchema],
  ["S0 jurisdiction-evidence schema", jurisdictionEvidenceSchema],
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

ajv.addSchema(recordSchema);
const validateAnalyzedCorpus = ajv.compile(analyzedCorpusSchema);
if (typeof validateAnalyzedCorpus !== "function") {
  throw new Error("analyzed corpus schema did not compile");
}

const applyFixtureMutations = (base, mutations) => {
  const result = structuredClone(base);
  for (const mutation of mutations) {
    const parts = mutation.path
      .slice(1)
      .split("/")
      .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
    const final = parts.pop();
    if (!mutation.path.startsWith("/") || final === undefined) {
      throw new Error(`invalid projection fixture mutation: ${mutation.path}`);
    }
    let parent = result;
    for (const part of parts) {
      parent = Array.isArray(parent) ? parent[Number(part)] : parent[part];
    }
    if (mutation.operation === "remove") {
      if (Array.isArray(parent)) {
        parent.splice(Number(final), 1);
      } else {
        delete parent[final];
      }
    } else if (mutation.operation === "add" && Array.isArray(parent) && final === "-") {
      parent.push(structuredClone(mutation.value));
    } else if (mutation.operation === "add" || mutation.operation === "replace") {
      if (Array.isArray(parent)) {
        parent[Number(final)] = structuredClone(mutation.value);
      } else {
        parent[final] = structuredClone(mutation.value);
      }
    } else {
      throw new Error(`unknown projection fixture operation: ${mutation.operation}`);
    }
  }
  return result;
};

const validateProjectionProfile = ajv.compile(projectionProfileSchema);
const projectionProfileFixture = await readJson(
  "fixtures/engine/projection-profiles.synthetic.valid.json",
);
if (!validateProjectionProfile(projectionProfileFixture)) {
  throw new Error(
    `synthetic projection profile fixture is invalid:\n${ajv.errorsText(
      validateProjectionProfile.errors,
      { separator: "\n" },
    )}`,
  );
}
const malformedProjectionProfiles = await readJson(
  "fixtures/engine/projection-profiles-malformed.invalid.json",
);
if (
  malformedProjectionProfiles.fixtureFamilyVersion !== "1.0.0" ||
  malformedProjectionProfiles.baseFixture !==
    "projection-profiles.synthetic.valid.json" ||
  !Array.isArray(malformedProjectionProfiles.cases) ||
  malformedProjectionProfiles.cases.length === 0
) {
  throw new Error("malformed projection profile fixture family is invalid");
}
const malformedProjectionCaseIds = new Set();
let schemaInvalidProjectionChecks = 0;
let semanticProjectionChecks = 0;
for (const fixtureCase of malformedProjectionProfiles.cases) {
  if (
    typeof fixtureCase.id !== "string" ||
    malformedProjectionCaseIds.has(fixtureCase.id) ||
    !["schema", "semantic", "projection"].includes(fixtureCase.expectedLayer) ||
    !Array.isArray(fixtureCase.mutations) ||
    fixtureCase.mutations.length === 0
  ) {
    throw new Error("malformed projection profile case metadata is invalid");
  }
  malformedProjectionCaseIds.add(fixtureCase.id);
  const candidate = applyFixtureMutations(
    projectionProfileFixture,
    fixtureCase.mutations,
  );
  const accepted = validateProjectionProfile(candidate);
  if (fixtureCase.expectedLayer === "schema") {
    if (accepted) {
      throw new Error(
        `negative projection profile case ${fixtureCase.id} was accepted by the schema`,
      );
    }
    schemaInvalidProjectionChecks += 1;
  } else {
    if (!accepted) {
      throw new Error(
        `semantic projection profile case ${fixtureCase.id} did not reach runtime validation:\n${ajv.errorsText(
          validateProjectionProfile.errors,
          { separator: "\n" },
        )}`,
      );
    }
    semanticProjectionChecks += 1;
  }
}

const validateGeographyRights = ajv.compile(geographyRightsSchema);
const geographyRightsFixture = await readJson(
  "fixtures/engine/geography-rights.synthetic.valid.json",
);
if (!validateGeographyRights(geographyRightsFixture)) {
  throw new Error(
    `synthetic geography and rights fixture is invalid:\n${ajv.errorsText(
      validateGeographyRights.errors,
      { separator: "\n" },
    )}`,
  );
}
const malformedGeographyRights = await readJson(
  "fixtures/engine/geography-rights-malformed.invalid.json",
);
if (
  malformedGeographyRights.fixtureFamilyVersion !== "1.0.0" ||
  malformedGeographyRights.baseFixture !==
    "geography-rights.synthetic.valid.json" ||
  !Array.isArray(malformedGeographyRights.cases) ||
  malformedGeographyRights.cases.length === 0
) {
  throw new Error("malformed geography and rights fixture family is invalid");
}
const malformedGeographyRightsCaseIds = new Set();
let schemaInvalidGeographyRightsChecks = 0;
let runtimeBoundaryGeographyRightsChecks = 0;
for (const fixtureCase of malformedGeographyRights.cases) {
  if (
    typeof fixtureCase.id !== "string" ||
    malformedGeographyRightsCaseIds.has(fixtureCase.id) ||
    !["schema", "semantic", "projection"].includes(
      fixtureCase.expectedLayer,
    ) ||
    typeof fixtureCase.expectedCode !== "string" ||
    !Array.isArray(fixtureCase.mutations) ||
    fixtureCase.mutations.length === 0
  ) {
    throw new Error("malformed geography and rights case metadata is invalid");
  }
  malformedGeographyRightsCaseIds.add(fixtureCase.id);
  const candidate = applyFixtureMutations(
    geographyRightsFixture,
    fixtureCase.mutations,
  );
  const accepted = validateGeographyRights(candidate);
  if (fixtureCase.expectedLayer === "schema") {
    if (accepted) {
      throw new Error(
        `negative geography and rights case ${fixtureCase.id} was accepted by the schema`,
      );
    }
    schemaInvalidGeographyRightsChecks += 1;
  } else {
    if (!accepted) {
      throw new Error(
        `runtime-boundary geography and rights case ${fixtureCase.id} did not reach runtime validation:\n${ajv.errorsText(
          validateGeographyRights.errors,
          { separator: "\n" },
        )}`,
      );
    }
    runtimeBoundaryGeographyRightsChecks += 1;
  }
}

const validateTaxonomyBundle = ajv.compile(taxonomyBundleSchema);
const taxonomyBundleFixture = await readJson(
  "fixtures/engine/taxonomy.synthetic.valid.json",
);
if (!validateTaxonomyBundle(taxonomyBundleFixture)) {
  throw new Error(
    `synthetic taxonomy bundle fixture is invalid:\n${ajv.errorsText(
      validateTaxonomyBundle.errors,
      { separator: "\n" },
    )}`,
  );
}
const malformedTaxonomyBundle = await readJson(
  "fixtures/engine/taxonomy-malformed.invalid.json",
);
if (
  malformedTaxonomyBundle.fixtureFamilyVersion !== "1.0.0" ||
  malformedTaxonomyBundle.baseFixture !== "taxonomy.synthetic.valid.json" ||
  !Array.isArray(malformedTaxonomyBundle.cases) ||
  malformedTaxonomyBundle.cases.length === 0
) {
  throw new Error("malformed taxonomy bundle fixture family is invalid");
}
const malformedTaxonomyCaseIds = new Set();
let schemaInvalidTaxonomyChecks = 0;
let runtimeBoundaryTaxonomyChecks = 0;
for (const fixtureCase of malformedTaxonomyBundle.cases) {
  if (
    typeof fixtureCase.id !== "string" ||
    malformedTaxonomyCaseIds.has(fixtureCase.id) ||
    !["schema", "semantic", "projection"].includes(
      fixtureCase.expectedLayer,
    ) ||
    typeof fixtureCase.expectedCode !== "string" ||
    !Array.isArray(fixtureCase.mutations) ||
    fixtureCase.mutations.length === 0
  ) {
    throw new Error("malformed taxonomy bundle case metadata is invalid");
  }
  malformedTaxonomyCaseIds.add(fixtureCase.id);
  const candidate = applyFixtureMutations(
    taxonomyBundleFixture,
    fixtureCase.mutations,
  );
  const accepted = validateTaxonomyBundle(candidate);
  if (fixtureCase.expectedLayer === "schema") {
    if (accepted) {
      throw new Error(
        `negative taxonomy bundle case ${fixtureCase.id} was accepted by the schema`,
      );
    }
    schemaInvalidTaxonomyChecks += 1;
  } else {
    if (!accepted) {
      throw new Error(
        `runtime-boundary taxonomy bundle case ${fixtureCase.id} did not reach runtime validation:\n${ajv.errorsText(
          validateTaxonomyBundle.errors,
          { separator: "\n" },
        )}`,
      );
    }
    runtimeBoundaryTaxonomyChecks += 1;
  }
}

const validateSourcePackBundle = ajv.compile(sourcePackBundleSchema);
const sourcePackBundleFixture = await readJson(
  "fixtures/engine/source-pack.synthetic.valid.json",
);
if (!validateSourcePackBundle(sourcePackBundleFixture)) {
  throw new Error(
    `synthetic source-pack bundle fixture is invalid:\n${ajv.errorsText(
      validateSourcePackBundle.errors,
      { separator: "\n" },
    )}`,
  );
}
const malformedSourcePackBundle = await readJson(
  "fixtures/engine/source-pack-malformed.invalid.json",
);
if (
  malformedSourcePackBundle.fixtureFamilyVersion !== "1.0.0" ||
  malformedSourcePackBundle.baseFixture !==
    "source-pack.synthetic.valid.json" ||
  !Array.isArray(malformedSourcePackBundle.cases) ||
  malformedSourcePackBundle.cases.length === 0
) {
  throw new Error("malformed source-pack bundle fixture family is invalid");
}
const malformedSourcePackCaseIds = new Set();
let schemaInvalidSourcePackChecks = 0;
let runtimeBoundarySourcePackChecks = 0;
for (const fixtureCase of malformedSourcePackBundle.cases) {
  if (
    typeof fixtureCase.id !== "string" ||
    malformedSourcePackCaseIds.has(fixtureCase.id) ||
    !["schema", "semantic", "projection"].includes(
      fixtureCase.expectedLayer,
    ) ||
    typeof fixtureCase.expectedCode !== "string" ||
    !Array.isArray(fixtureCase.mutations) ||
    fixtureCase.mutations.length === 0
  ) {
    throw new Error("malformed source-pack bundle case metadata is invalid");
  }
  malformedSourcePackCaseIds.add(fixtureCase.id);
  const candidate = applyFixtureMutations(
    sourcePackBundleFixture,
    fixtureCase.mutations,
  );
  const accepted = validateSourcePackBundle(candidate);
  if (fixtureCase.expectedLayer === "schema") {
    if (accepted) {
      throw new Error(
        `negative source-pack bundle case ${fixtureCase.id} was accepted by the schema`,
      );
    }
    schemaInvalidSourcePackChecks += 1;
  } else {
    if (!accepted) {
      throw new Error(
        `runtime-boundary source-pack bundle case ${fixtureCase.id} did not reach runtime validation:\n${ajv.errorsText(
          validateSourcePackBundle.errors,
          { separator: "\n" },
        )}`,
      );
    }
    runtimeBoundarySourcePackChecks += 1;
  }
}

const validateRealSourceLifecycleBundle = ajv.compile(
  realSourceLifecycleBundleSchema,
);
const realSourceLifecycleBundleFixture = await readJson(
  "fixtures/engine/real-source-lifecycle.candidate.valid.json",
);
if (!validateRealSourceLifecycleBundle(realSourceLifecycleBundleFixture)) {
  throw new Error(
    `real-source lifecycle candidate fixture is invalid:\n${ajv.errorsText(
      validateRealSourceLifecycleBundle.errors,
      { separator: "\n" },
    )}`,
  );
}
const malformedRealSourceLifecycleBundle = await readJson(
  "fixtures/engine/real-source-lifecycle-malformed.invalid.json",
);
if (
  malformedRealSourceLifecycleBundle.fixtureFamilyVersion !== "1.0.0" ||
  malformedRealSourceLifecycleBundle.baseFixture !==
    "real-source-lifecycle.candidate.valid.json" ||
  !Array.isArray(malformedRealSourceLifecycleBundle.cases) ||
  malformedRealSourceLifecycleBundle.cases.length === 0
) {
  throw new Error("malformed real-source lifecycle fixture family is invalid");
}
const malformedRealSourceLifecycleCaseIds = new Set();
let schemaInvalidRealSourceLifecycleChecks = 0;
let runtimeBoundaryRealSourceLifecycleChecks = 0;
for (const fixtureCase of malformedRealSourceLifecycleBundle.cases) {
  if (
    typeof fixtureCase.id !== "string" ||
    malformedRealSourceLifecycleCaseIds.has(fixtureCase.id) ||
    !["schema", "semantic"].includes(fixtureCase.expectedLayer) ||
    typeof fixtureCase.expectedCode !== "string" ||
    !Array.isArray(fixtureCase.mutations) ||
    fixtureCase.mutations.length === 0
  ) {
    throw new Error(
      "malformed real-source lifecycle bundle case metadata is invalid",
    );
  }
  malformedRealSourceLifecycleCaseIds.add(fixtureCase.id);
  const candidate = applyFixtureMutations(
    realSourceLifecycleBundleFixture,
    fixtureCase.mutations,
  );
  const accepted = validateRealSourceLifecycleBundle(candidate);
  if (fixtureCase.expectedLayer === "schema") {
    if (accepted) {
      throw new Error(
        `negative real-source lifecycle case ${fixtureCase.id} was accepted by the schema`,
      );
    }
    schemaInvalidRealSourceLifecycleChecks += 1;
  } else {
    if (!accepted) {
      throw new Error(
        `runtime-boundary real-source lifecycle case ${fixtureCase.id} did not reach runtime validation:\n${ajv.errorsText(
          validateRealSourceLifecycleBundle.errors,
          { separator: "\n" },
        )}`,
      );
    }
    runtimeBoundaryRealSourceLifecycleChecks += 1;
  }
}

ajv.addSchema(assertionSchema);
for (const [name, schema] of [
  ["S0 spatial-observation schema", spatialObservationSchema],
  ["S0 spatial-relation schema", spatialRelationSchema],
  ["S0 jurisdiction-evidence schema", jurisdictionEvidenceSchema],
]) {
  ajv.addSchema(schema);
  if (ajv.getSchema(schema.$id) === undefined) {
    throw new Error(`${name} did not compile`);
  }
}

const s0FixtureCases = [
  ...[
    "observation-complete-certain.valid.json",
    "observation-missing-geometry.valid.json",
    "observation-partial-coverage.valid.json",
    "observation-swapped-axis-open-interval.valid.json",
    "observation-unknown-coverage.valid.json",
  ].map((name) => ({
    name,
    schema: spatialObservationSchema,
    expectedValid: true,
  })),
  {
    name: "observation-malformed.invalid.json",
    schema: spatialObservationSchema,
    expectedValid: false,
  },
  {
    name: "relation-partial-coverage.valid.json",
    schema: spatialRelationSchema,
    expectedValid: true,
  },
  {
    name: "relation-duplicate-input-digest.invalid.json",
    schema: spatialRelationSchema,
    expectedValid: false,
  },
  {
    name: "jurisdiction-evidence.valid.json",
    schema: jurisdictionEvidenceSchema,
    expectedValid: true,
  },
  {
    name: "jurisdiction-evidence-malformed.invalid.json",
    schema: jurisdictionEvidenceSchema,
    expectedValid: false,
  },
];
let s0ValidFixtureChecks = 0;
let s0InvalidFixtureChecks = 0;
for (const { name, schema, expectedValid } of s0FixtureCases) {
  const validate = ajv.getSchema(schema.$id);
  if (validate === undefined) {
    throw new Error(`S0 fixture ${name} has no compiled schema`);
  }
  const fixture = await readJson(`fixtures/experimental/spatial/${name}`);
  const accepted = validate(fixture);
  if (expectedValid && !accepted) {
    throw new Error(
      `${name} is invalid:\n${ajv.errorsText(validate.errors, {
        separator: "\n",
      })}`,
    );
  }
  if (!expectedValid && accepted) {
    throw new Error(`negative S0 fixture ${name} was accepted`);
  }
  if (expectedValid) {
    s0ValidFixtureChecks += 1;
  } else {
    s0InvalidFixtureChecks += 1;
  }
}
const validateLifecycleBundle = ajv.compile(lifecycleSchema);
const emptyLifecycleFixture = await readJson(
  "fixtures/lifecycle/empty.synthetic.valid.json",
);
if (!validateLifecycleBundle(emptyLifecycleFixture)) {
  throw new Error(
    `empty synthetic lifecycle fixture is invalid:\n${ajv.errorsText(
      validateLifecycleBundle.errors,
      { separator: "\n" },
    )}`,
  );
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

const validateRecord = ajv.getSchema(recordSchema.$id);
if (typeof validateRecord !== "function") {
  throw new Error("record schema did not compile");
}
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
  const statusEvidenceField =
    record.accordContext === null
      ? "/status/sourceLabel"
      : "/accordContext/statusReview/sourceLabel";
  if (!provenanceFields.includes(statusEvidenceField)) {
    throw new Error(
      `${name}: missing critical provenance for ${statusEvidenceField}`,
    );
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
    record.judicialContext?.decisionDate ??
    record.accordContext?.executionEvent.date ??
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
  `Foundation validation passed: 14 schemas, ${taxonomy.categories.length} categories, ` +
    `${taxonomy.categories.reduce((count, category) => count + category.subcategories.length, 0)} subcategories, ` +
    `${fixtureNames.length} valid fixtures, ${negativePolicyChecks} negative policy checks, ` +
    `${s0ValidFixtureChecks} valid plus ${s0InvalidFixtureChecks} invalid S0 fixture checks, ` +
    `1 valid plus ${schemaInvalidProjectionChecks} schema-invalid plus ${semanticProjectionChecks} runtime-boundary projection profile checks, ` +
    `1 valid plus ${schemaInvalidGeographyRightsChecks} schema-invalid plus ${runtimeBoundaryGeographyRightsChecks} runtime-boundary geography and rights checks, ` +
    `1 valid plus ${schemaInvalidTaxonomyChecks} schema-invalid plus ${runtimeBoundaryTaxonomyChecks} runtime-boundary taxonomy bundle checks, ` +
    `1 valid plus ${schemaInvalidSourcePackChecks} schema-invalid plus ${runtimeBoundarySourcePackChecks} runtime-boundary source-pack bundle checks, ` +
    `and 1 valid plus ${schemaInvalidRealSourceLifecycleChecks} schema-invalid plus ${runtimeBoundaryRealSourceLifecycleChecks} runtime-boundary real-source lifecycle checks.`,
);
