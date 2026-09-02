import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import malformedFixtureFamily from "../../fixtures/engine/taxonomy-malformed.invalid.json";
import validTaxonomyBundle from "../../fixtures/engine/taxonomy.synthetic.valid.json";
import validProfileBundle from "../../fixtures/engine/projection-profiles.synthetic.valid.json";
import federalRecord from "../../fixtures/records/general-jurisdiction.valid.json";
import taxonomyBundleSchema from "../../schemas/taxonomy-bundle.schema.v1.json";
import { createEngineProjection } from "../../src/engine/projection";
import {
  TAXONOMY_BUNDLE_SCHEMA_ID,
  TAXONOMY_BUNDLE_SCHEMA_VERSION,
} from "../../src/engine/taxonomy-contracts";
import {
  TaxonomyValidationError,
  createTaxonomyProjection,
  parseTaxonomyBundle,
} from "../../src/engine/taxonomy";
import type { PolicyRecord } from "../../src/shared/contracts";

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

function captureValidationError(run: () => unknown): TaxonomyValidationError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(TaxonomyValidationError);
    return error as TaxonomyValidationError;
  }
  throw new Error("invalid taxonomy candidate was accepted");
}

function taxonomyProfile() {
  const profile = structuredClone(validProfileBundle);
  const cloudRegion = profile.regionPacks.find(
    ({ id }) => id === "synthetic-cloud-harbor-region",
  );
  const cloudRule = profile.watchRules.find(
    ({ id }) => id === "synthetic-cloud-harbor-source-rule",
  );
  const glassRule = profile.watchRules.find(
    ({ id }) => id === "synthetic-glass-desert-general-rule",
  );
  if (
    cloudRegion === undefined ||
    cloudRule === undefined ||
    glassRule === undefined
  ) {
    throw new Error("PNW-01 synthetic profile strata are missing");
  }
  cloudRegion.taxonomy.taxonomyIds = [
    "environmental-protection-pollution-governance",
    "climate-energy-policy",
    "infrastructure-transportation-broadband",
  ];
  cloudRule.recordIds = [
    "psr:synthetic-federal:record-001",
    "psr:synthetic-federal:record-002",
    "psr:synthetic-federal:record-003",
    "psr:synthetic-federal:record-004",
    "psr:synthetic-federal:record-007",
    "psr:synthetic-federal:record-008",
    "psr:synthetic-federal:record-009",
    "psr:synthetic-federal:record-010",
    "psr:synthetic-federal:record-011",
    "psr:synthetic-federal:record-012",
  ];
  glassRule.recordIds = [
    "psr:synthetic-federal:record-005",
    "psr:synthetic-federal:record-006",
  ];
  return profile;
}

function taxonomyRecords(): PolicyRecord[] {
  return Array.from({ length: 12 }, (_, index) => {
    const ordinal = String(index + 1).padStart(3, "0");
    const record = structuredClone(federalRecord) as PolicyRecord;
    record.internalId = `psr:synthetic-federal:record-${ordinal}`;
    record.source.recordId = `SYN-${ordinal}`;
    if (ordinal === "002") {
      record.officialSubjects = [
        {
          scheme: "synthetic-topic",
          label: "Synthetic Shared Monitor",
          sourceUrl: "https://synthetic-source-a.invalid/evidence",
        },
        {
          scheme: "synthetic-other-topic",
          label: "Synthetic Shared Monitor",
          sourceUrl: "https://synthetic-source-a.invalid/other-evidence",
        },
      ];
    } else if (ordinal === "012") {
      record.officialSubjects = [
        {
          scheme: "synthetic-topic",
          label: "Synthetic Expired Monitor",
          sourceUrl: "https://synthetic-source-a.invalid/evidence",
        },
      ];
    }
    return record;
  });
}

const publicRequest = {
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
  requestedVisibility: "public",
  asOf: "3785-06-30",
} as const;

const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
addFormats(ajv);
const validateBundle = ajv.compile(taxonomyBundleSchema);
const malformedCases = malformedFixtureFamily.cases as MalformedCase[];

describe("governed taxonomy schema closure", () => {
  it("pins a strict standalone schema and accepts the synthetic fixture", () => {
    expect(ajv.validateSchema(taxonomyBundleSchema)).toBe(true);
    expect(taxonomyBundleSchema.$id).toBe(TAXONOMY_BUNDLE_SCHEMA_ID);
    expect(taxonomyBundleSchema.additionalProperties).toBe(false);
    expect(taxonomyBundleSchema.properties.schemaVersion.const).toBe(
      TAXONOMY_BUNDLE_SCHEMA_VERSION,
    );
    expect(
      validateBundle(validTaxonomyBundle),
      ajv.errorsText(validateBundle.errors),
    ).toBe(true);
    expect(() => parseTaxonomyBundle(validTaxonomyBundle)).not.toThrow(
      TaxonomyValidationError,
    );
  });

  it("pins the complete malformed inventory", () => {
    expect(malformedFixtureFamily.fixtureFamilyVersion).toBe("1.0.0");
    expect(malformedFixtureFamily.baseFixture).toBe(
      "taxonomy.synthetic.valid.json",
    );
    expect(malformedCases).toHaveLength(82);
    expect(
      malformedCases.filter(({ expectedLayer }) => expectedLayer === "schema"),
    ).toHaveLength(22);
    expect(
      malformedCases.filter(
        ({ expectedLayer }) => expectedLayer === "semantic",
      ),
    ).toHaveLength(55);
    expect(
      malformedCases.filter(
        ({ expectedLayer }) => expectedLayer === "projection",
      ),
    ).toHaveLength(5);
    expect(new Set(malformedCases.map(({ id }) => id)).size).toBe(
      malformedCases.length,
    );
    expect(
      malformedCases.every(
        ({ expectedCode, expectedPath }) =>
          expectedCode.length > 0 && expectedPath.length > 0,
      ),
    ).toBe(true);
  });

  it.each(malformedCases)(
    "fails closed for malformed case $id",
    (fixtureCase) => {
      const candidate = applyMutations(
        validTaxonomyBundle,
        fixtureCase.mutations,
      );
      const schemaAccepted = validateBundle(candidate);

      if (fixtureCase.expectedLayer === "schema") {
        expect(schemaAccepted, fixtureCase.id).toBe(false);
        const error = captureValidationError(() =>
          parseTaxonomyBundle(candidate),
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
          parseTaxonomyBundle(candidate),
        );
        expect(error.code).toBe(fixtureCase.expectedCode);
        expect(error.path).toBe(fixtureCase.expectedPath);
        return;
      }

      expect(() => parseTaxonomyBundle(candidate)).not.toThrow();
      const profile = taxonomyProfile();
      const engineProjection = createEngineProjection(
        taxonomyRecords(),
        profile,
      );
      const error = captureValidationError(() =>
        createTaxonomyProjection(
          profile,
          engineProjection,
          candidate,
          publicRequest,
        ),
      );
      expect(error.code).toBe(fixtureCase.expectedCode);
      expect(error.path).toBe(fixtureCase.expectedPath);
    },
  );

  it("rejects prototypes, accessors, symbols, cycles, sparse arrays, and non-finite numbers", () => {
    const polluted = Object.create({ inherited: true }) as Record<
      string,
      unknown
    >;
    Object.assign(polluted, structuredClone(validTaxonomyBundle));

    const accessor = structuredClone(validTaxonomyBundle) as Record<
      string,
      unknown
    >;
    Object.defineProperty(accessor, "id", {
      enumerable: true,
      get: () => "synthetic-accessor",
    });

    const symbolValue = structuredClone(validTaxonomyBundle) as Record<
      PropertyKey,
      unknown
    >;
    symbolValue[Symbol("hidden")] = "synthetic-hidden";

    const cyclic = structuredClone(validTaxonomyBundle) as Record<
      string,
      unknown
    >;
    cyclic.cycle = cyclic;

    const sparse = structuredClone(validTaxonomyBundle);
    delete sparse.concepts[0];

    const nonFinite = structuredClone(validTaxonomyBundle) as Record<
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
        parseTaxonomyBundle(candidate),
      );
      expect(error.code).toBe("INVALID_JSON");
    }
  });
});
