import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import sourceRegistry from "../../config/sources.v1.json";
import validGeographyRightsBundle from "../../fixtures/engine/geography-rights.synthetic.valid.json";
import malformedFixtureFamily from "../../fixtures/engine/source-pack-malformed.invalid.json";
import validSourcePackBundle from "../../fixtures/engine/source-pack.synthetic.valid.json";
import validProfileBundle from "../../fixtures/engine/projection-profiles.synthetic.valid.json";
import validTaxonomyBundle from "../../fixtures/engine/taxonomy.synthetic.valid.json";
import sourcePackSchema from "../../schemas/source-pack-bundle.schema.v1.json";
import {
  SOURCE_PACK_BUNDLE_SCHEMA_ID,
  SOURCE_PACK_BUNDLE_SCHEMA_VERSION,
  SourcePackValidationError,
  createSourcePackAdmissionPlan,
  parseGeographyRightsBundle,
  parseProjectionProfileBundle,
  parseSourcePackBundle,
  parseTaxonomyBundle,
} from "../../src/engine";
import type { SourcePackAdmissionRequest } from "../../src/engine";

type Mutation = {
  operation: "add" | "remove" | "replace";
  path: string;
  value?: unknown;
};

type MalformedCase = {
  id: string;
  expectedLayer: "schema" | "semantic" | "projection";
  expectedCode: string;
  expectedPath: string;
  mutations: Mutation[];
};

function pointerParts(pointer: string): string[] {
  if (!pointer.startsWith("/")) {
    throw new TypeError(`invalid fixture mutation pointer ${pointer}`);
  }
  return pointer
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
}

function applyMutations(
  base: unknown,
  mutations: readonly Mutation[],
): unknown {
  const result = structuredClone(base) as Record<string, unknown>;
  for (const mutation of mutations) {
    const parts = pointerParts(mutation.path);
    const final = parts.pop();
    if (final === undefined) {
      throw new TypeError("fixture mutation cannot target the document root");
    }
    let parent: unknown = result;
    for (const part of parts) {
      parent = Array.isArray(parent)
        ? parent[Number(part)]
        : (parent as Record<string, unknown>)[part];
    }
    if (mutation.operation === "remove") {
      if (Array.isArray(parent)) {
        parent.splice(Number(final), 1);
      } else {
        delete (parent as Record<string, unknown>)[final];
      }
    } else if (Array.isArray(parent)) {
      if (mutation.operation === "add" && final === "-") {
        parent.push(structuredClone(mutation.value));
      } else {
        parent[Number(final)] = structuredClone(mutation.value);
      }
    } else {
      (parent as Record<string, unknown>)[final] = structuredClone(
        mutation.value,
      );
    }
  }
  return result;
}

function sourcePackProfile() {
  const acceptedBytes = JSON.stringify(validProfileBundle);
  const profile = structuredClone(validProfileBundle);
  profile.id = "synthetic-source-pack-profiles";
  for (const region of profile.regionPacks) {
    region.sourceIds = [
      ...new Set([
        ...region.sourceIds,
        "synthetic-county",
        "synthetic-state-accord",
      ]),
    ].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  }
  const parsed = parseProjectionProfileBundle(profile);
  expect(JSON.stringify(validProfileBundle)).toBe(acceptedBytes);
  return parsed;
}

function predecessorBundles() {
  const geography = structuredClone(validGeographyRightsBundle);
  geography.id = "synthetic-source-pack-geography";
  geography.profileBundleRef = {
    id: "synthetic-source-pack-profiles",
    version: "1.0.0",
  };
  const taxonomy = structuredClone(validTaxonomyBundle);
  taxonomy.id = "synthetic-source-pack-taxonomy";
  taxonomy.profileBundleRef = {
    id: "synthetic-source-pack-profiles",
    version: "1.0.0",
  };
  return {
    geographyRightsBundle: parseGeographyRightsBundle(geography),
    taxonomyBundle: parseTaxonomyBundle(taxonomy),
  };
}

const request: SourcePackAdmissionRequest = {
  profileBundleRef: {
    id: "synthetic-source-pack-profiles",
    version: "1.0.0",
  },
  regionPackRef: {
    id: "synthetic-cloud-harbor-region",
    version: "1.0.0",
  },
  deploymentProfileRef: {
    id: "synthetic-cloud-harbor-deployment",
    version: "1.0.0",
  },
  personaProjectionRef: {
    id: "synthetic-cloud-harbor-researcher",
    version: "1.0.0",
  },
  outputAdapterRef: {
    id: "synthetic-document-reference-output",
    version: "1.0.0",
  },
  accessContextRef: {
    kind: "access_context",
    id: "synthetic-access-cloud-public",
    version: "1.0.0",
  },
  disclosureCeiling: "public",
  requestedOperation: "internal_analysis",
  asOf: "3785-06-30T00:00:00Z",
  requestedCoverageSlotRefs: [
    "synthetic-slot-alpha",
    "synthetic-slot-beta",
    "synthetic-slot-gamma",
  ],
};

function captureValidationError(run: () => unknown): SourcePackValidationError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(SourcePackValidationError);
    return error as SourcePackValidationError;
  }
  throw new Error("invalid source-pack candidate was accepted");
}

const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
addFormats(ajv);
const validateBundle = ajv.compile(sourcePackSchema);
const malformedCases = malformedFixtureFamily.cases as MalformedCase[];

describe("source-pack schema and graph closure", () => {
  it("pins the strict closed schema and accepts the neutral synthetic fixture", () => {
    expect(ajv.validateSchema(sourcePackSchema)).toBe(true);
    expect(sourcePackSchema.$id).toBe(SOURCE_PACK_BUNDLE_SCHEMA_ID);
    expect(sourcePackSchema.additionalProperties).toBe(false);
    expect(sourcePackSchema.properties.schemaVersion.const).toBe(
      SOURCE_PACK_BUNDLE_SCHEMA_VERSION,
    );
    expect(
      validateBundle(validSourcePackBundle),
      ajv.errorsText(validateBundle.errors),
    ).toBe(true);
    expect(() => parseSourcePackBundle(validSourcePackBundle)).not.toThrow();
  });

  it("pins the complete malformed inventory", () => {
    expect(malformedFixtureFamily.fixtureFamilyVersion).toBe("1.0.0");
    expect(malformedFixtureFamily.baseFixture).toBe(
      "source-pack.synthetic.valid.json",
    );
    expect(malformedCases).toHaveLength(53);
    expect(
      malformedCases.filter(({ expectedLayer }) => expectedLayer === "schema"),
    ).toHaveLength(18);
    expect(
      malformedCases.filter(
        ({ expectedLayer }) => expectedLayer === "semantic",
      ),
    ).toHaveLength(31);
    expect(
      malformedCases.filter(
        ({ expectedLayer }) => expectedLayer === "projection",
      ),
    ).toHaveLength(4);
    expect(new Set(malformedCases.map(({ id }) => id)).size).toBe(
      malformedCases.length,
    );
    expect(
      malformedCases.every(
        ({ expectedCode, expectedPath, mutations }) =>
          expectedCode.length > 0 &&
          expectedPath.length > 0 &&
          mutations.length > 0 &&
          mutations.every(({ path }) => path.startsWith("/")),
      ),
    ).toBe(true);
  });

  it("rejects split duplicate deployment scopes independent of member and access ordering", () => {
    const fixtureCase = malformedCases.find(
      ({ id }) => id === "split-duplicate-deployment-scope",
    );
    expect(fixtureCase).toBeDefined();
    const candidate = applyMutations(
      validSourcePackBundle,
      fixtureCase!.mutations,
    ) as typeof validSourcePackBundle;
    const reversedCatalog = structuredClone(candidate);
    reversedCatalog.deploymentBindings.reverse();
    const reversedMembers = structuredClone(candidate);
    for (const binding of reversedMembers.deploymentBindings) {
      binding.sourceBindingRefs.reverse();
      binding.accessContextRefs.reverse();
    }
    const reversedBoth = structuredClone(reversedMembers);
    reversedBoth.deploymentBindings.reverse();

    for (const permutation of [
      candidate,
      reversedCatalog,
      reversedMembers,
      reversedBoth,
    ]) {
      expect(
        validateBundle(permutation),
        ajv.errorsText(validateBundle.errors),
      ).toBe(true);
      const error = captureValidationError(() =>
        parseSourcePackBundle(permutation),
      );
      expect(error.code).toBe("DUPLICATE_SCOPE");
      expect(error.path).toBe("/deploymentBindings");
    }
  });

  it.each(malformedCases)(
    "fails closed for malformed case $id",
    (fixtureCase) => {
      const candidate = applyMutations(
        validSourcePackBundle,
        fixtureCase.mutations,
      );
      const schemaAccepted = validateBundle(candidate);

      if (fixtureCase.expectedLayer === "schema") {
        expect(schemaAccepted, fixtureCase.id).toBe(false);
        const error = captureValidationError(() =>
          parseSourcePackBundle(candidate),
        );
        expect(error.code).toBe(fixtureCase.expectedCode);
        expect(error.path).toBe(fixtureCase.expectedPath);
        return;
      }

      expect(
        schemaAccepted,
        `${fixtureCase.id}: ${ajv.errorsText(validateBundle.errors)}`,
      ).toBe(true);
      if (fixtureCase.expectedLayer === "semantic") {
        const error = captureValidationError(() =>
          parseSourcePackBundle(candidate),
        );
        expect(error.code).toBe(fixtureCase.expectedCode);
        expect(error.path).toBe(fixtureCase.expectedPath);
        return;
      }

      expect(() => parseSourcePackBundle(candidate)).not.toThrow();
      const error = captureValidationError(() =>
        createSourcePackAdmissionPlan(
          sourcePackProfile(),
          candidate,
          request,
          predecessorBundles(),
        ),
      );
      expect(error.code).toBe(fixtureCase.expectedCode);
      expect(error.path).toBe(fixtureCase.expectedPath);
    },
  );

  it("rejects a late real source identity even when no binding references it", () => {
    const realSource = sourceRegistry.sources.find(
      ({ synthetic }) => !synthetic,
    );
    expect(realSource).toBeDefined();
    const candidate = structuredClone(validSourcePackBundle);
    candidate.evidenceReceipts.push({
      ...structuredClone(candidate.evidenceReceipts[0]!),
      id: "synthetic-late-mixed-trust-evidence",
      source: {
        sourceId: realSource!.id,
        sourceRegistryVersion: sourceRegistry.registryVersion,
      },
    });
    const error = captureValidationError(() =>
      parseSourcePackBundle(candidate),
    );
    expect(error.code).toBe("INVALID_SYNTHETIC_TRUST");
    expect(error.message).not.toContain(realSource!.id);
  });

  it("rejects prototypes, accessors, symbols, cycles, sparse arrays, and non-finite numbers", () => {
    const polluted = Object.create({ inherited: true }) as Record<
      string,
      unknown
    >;
    Object.assign(polluted, structuredClone(validSourcePackBundle));

    const accessor = structuredClone(validSourcePackBundle) as Record<
      string,
      unknown
    >;
    Object.defineProperty(accessor, "id", {
      enumerable: true,
      get: () => "synthetic-accessor",
    });

    const symbolValue = structuredClone(validSourcePackBundle) as Record<
      PropertyKey,
      unknown
    >;
    symbolValue[Symbol("hidden")] = "synthetic-hidden";

    const cyclic = structuredClone(validSourcePackBundle) as Record<
      string,
      unknown
    >;
    cyclic.cycle = cyclic;

    const sparse = structuredClone(validSourcePackBundle);
    delete sparse.sourceBindings[0];

    const nonFinite = structuredClone(validSourcePackBundle) as Record<
      string,
      unknown
    >;
    nonFinite.hiddenNumber = Number.POSITIVE_INFINITY;

    for (const candidate of [
      polluted,
      accessor,
      symbolValue,
      cyclic,
      sparse,
      nonFinite,
    ]) {
      const error = captureValidationError(() =>
        parseSourcePackBundle(candidate),
      );
      expect(error.code).toBe("INVALID_JSON");
    }
  });
});
