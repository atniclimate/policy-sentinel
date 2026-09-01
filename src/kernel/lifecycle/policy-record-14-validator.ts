import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import sourceRegistryJson from "../../../config/sources.v1.json";
import taxonomyJson from "../../../config/taxonomy.v1.json";
import recordSchema from "../../../schemas/record.schema.v1.json";
import sourceSchema from "../../../schemas/source.schema.v1.json";
import taxonomySchema from "../../../schemas/taxonomy.schema.v1.json";
import { assertNationCollectionPolicy } from "../../pipeline/nation-collection-policy.mjs";
import {
  validateRecordPolicy,
  validateRecordSetPolicy,
} from "../../pipeline/policy-validation.mjs";
import { assertSourceRegistrySemantics } from "../../pipeline/source-registry.mjs";
import type {
  NationCollection,
  PolicyRecord,
  SourceRegistry,
  TaxonomyConfig,
} from "../../shared/contracts";
import { canonicalJsonDigest, canonicalizeJson } from "../assertions";

export interface PolicyRecord14ValidationContext {
  sourceRegistry: SourceRegistry;
  taxonomy: TaxonomyConfig;
  nationCollection: NationCollection | null;
}

const authorizedContextDigests = new Set([
  canonicalJsonDigest({
    sourceRegistry: sourceRegistryJson,
    taxonomy: taxonomyJson,
    nationCollection: null,
  }),
]);

const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
addFormats(ajv);
const validateRecordSchema = ajv.compile(recordSchema);
const validateSourceRegistrySchema = ajv.compile(sourceSchema);
const validateTaxonomySchema = ajv.compile(taxonomySchema);

function assertSchemaValid(
  validate: typeof validateRecordSchema,
  value: unknown,
  label: string,
): void {
  if (!validate(value)) {
    throw new TypeError(`${label}: ${ajv.errorsText(validate.errors)}`);
  }
}

function assertTaxonomySemantics(taxonomy: TaxonomyConfig): void {
  const categoryIds = new Set<string>();
  const subcategoryIds = new Map<string, Set<string>>();
  for (const category of taxonomy.categories) {
    if (categoryIds.has(category.id)) {
      throw new TypeError(`duplicate taxonomy category ID ${category.id}`);
    }
    categoryIds.add(category.id);
    const ids = new Set<string>();
    for (const subcategory of category.subcategories) {
      if (ids.has(subcategory.id)) {
        throw new TypeError(
          `duplicate taxonomy subcategory ID ${subcategory.id} in ${category.id}`,
        );
      }
      ids.add(subcategory.id);
    }
    subcategoryIds.set(category.id, ids);
  }

  const mappingIds = new Set<string>();
  for (const mapping of taxonomy.mappingPolicy.sourceMappings) {
    if (mappingIds.has(mapping.id)) {
      throw new TypeError(`duplicate taxonomy mapping ID ${mapping.id}`);
    }
    mappingIds.add(mapping.id);
    for (const target of mapping.targets) {
      if (!categoryIds.has(target.categoryId)) {
        throw new TypeError(
          `taxonomy mapping ${mapping.id} targets unknown category ${target.categoryId}`,
        );
      }
      if (
        target.subcategoryId !== undefined &&
        !subcategoryIds.get(target.categoryId)?.has(target.subcategoryId)
      ) {
        throw new TypeError(
          `taxonomy mapping ${mapping.id} targets unknown subcategory ${target.subcategoryId}`,
        );
      }
    }
  }
}

function validateContext(
  value: PolicyRecord14ValidationContext,
): PolicyRecord14ValidationContext {
  canonicalizeJson(value as unknown);
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    canonicalizeJson(Object.keys(value).sort()) !==
      canonicalizeJson(
        ["nationCollection", "sourceRegistry", "taxonomy"].sort(),
      ) ||
    (value.nationCollection !== null &&
      (typeof value.nationCollection !== "object" ||
        Array.isArray(value.nationCollection))) ||
    !Array.isArray(value.sourceRegistry?.sources)
  ) {
    throw new TypeError("invalid PolicyRecord 1.4 validation context");
  }

  const candidate = structuredClone(value);
  assertSchemaValid(
    validateSourceRegistrySchema,
    candidate.sourceRegistry,
    "invalid source registry validation context",
  );
  assertSourceRegistrySemantics(candidate.sourceRegistry);
  assertSchemaValid(
    validateTaxonomySchema,
    candidate.taxonomy,
    "invalid taxonomy validation context",
  );
  assertTaxonomySemantics(candidate.taxonomy);
  if (candidate.nationCollection !== null) {
    const before = canonicalizeJson(candidate.nationCollection);
    assertNationCollectionPolicy(candidate.nationCollection, {
      manifestSynthetic: candidate.nationCollection.baseline.synthetic,
    });
    if (canonicalizeJson(candidate.nationCollection) !== before) {
      throw new TypeError("Nation collection validator mutated its input");
    }
  }

  return candidate;
}

function assertValidatorDidNotMutate(
  before: string,
  value: unknown,
  validator: string,
): void {
  if (canonicalizeJson(value) !== before) {
    throw new TypeError(`${validator} mutated its validation input`);
  }
}

export function assertPolicyRecord14Schema(
  record: unknown,
): asserts record is PolicyRecord {
  const canonicalRecord = canonicalizeJson(record);
  const schemaCandidate = structuredClone(record);
  if (!validateRecordSchema(schemaCandidate)) {
    throw new TypeError(ajv.errorsText(validateRecordSchema.errors));
  }
  assertValidatorDidNotMutate(
    canonicalRecord,
    schemaCandidate,
    "record JSON Schema validator",
  );
}

/**
 * Runs the unchanged PolicyRecord 1.4 schema and both repository semantic
 * validators. Callers supply data context, never executable validation logic,
 * and the frozen projection policy binds that context's canonical digest.
 */
export function validatePolicyRecord14Compatibility(
  record: PolicyRecord,
  context: PolicyRecord14ValidationContext,
  expectedContextDigest: string,
): void {
  const validatedContext = validateContext(context);
  const contextDigest = canonicalJsonDigest(validatedContext);
  if (
    contextDigest !== expectedContextDigest ||
    !authorizedContextDigests.has(contextDigest)
  ) {
    throw new TypeError(
      "PolicyRecord 1.4 validation context is not repository-authorized for the frozen policy",
    );
  }

  assertPolicyRecord14Schema(record);
  const canonicalRecord = canonicalizeJson(record);
  const canonicalContext = canonicalizeJson(validatedContext);

  const sourceConfig = validatedContext.sourceRegistry.sources.find(
    ({ id }) => id === record.source.id,
  );
  if (sourceConfig === undefined) {
    throw new TypeError("PolicyRecord 1.4 source is absent from the registry");
  }
  if (
    record.nationAssociations.length > 0 &&
    validatedContext.nationCollection === null
  ) {
    throw new TypeError(
      "PolicyRecord 1.4 Nation associations require a validated Nation collection",
    );
  }

  const nations = validatedContext.nationCollection?.nations ?? [];
  const knownNations = new Map(nations.map((nation) => [nation.id, nation]));

  const singleCandidate = structuredClone(record);
  validateRecordPolicy(singleCandidate, {
    sourceConfig,
    taxonomy: validatedContext.taxonomy,
    knownNations: knownNations.size === 0 ? null : knownNations,
  });
  assertValidatorDidNotMutate(
    canonicalRecord,
    singleCandidate,
    "validateRecordPolicy",
  );
  assertValidatorDidNotMutate(
    canonicalContext,
    validatedContext,
    "validateRecordPolicy context",
  );

  const setCandidates = [structuredClone(record)];
  const canonicalSetCandidates = canonicalizeJson(setCandidates);
  validateRecordSetPolicy(setCandidates, {
    sourceRegistry: validatedContext.sourceRegistry,
    taxonomy: validatedContext.taxonomy,
    nations,
  });
  assertValidatorDidNotMutate(
    canonicalSetCandidates,
    setCandidates,
    "validateRecordSetPolicy",
  );
  assertValidatorDidNotMutate(
    canonicalContext,
    validatedContext,
    "validateRecordSetPolicy context",
  );
}
