// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import assertionSchema from "../../../schemas/assertion.schema.v1.json";
import jurisdictionEvidenceSchema from "../../../schemas/experimental/jurisdiction-evidence.schema.v1.json";
import spatialObservationSchema from "../../../schemas/experimental/spatial-observation.schema.v1.json";
import spatialRelationSchema from "../../../schemas/experimental/spatial-relation.schema.v1.json";
import recordSchema from "../../../schemas/record.schema.v1.json";
import {
  createSpatialEvidenceInput,
  createSpatialEvidenceViewModel,
  validateSpatialEvidenceInput,
} from "../../../src/experimental/spatial/evidence-view";
import {
  createJurisdictionEvidence,
  validateJurisdictionEvidence,
} from "../../../src/experimental/spatial/jurisdiction-evidence";
import {
  createSpatialObservation,
  createSpatialObservationCollection,
  validateSpatialObservation,
} from "../../../src/experimental/spatial/observation";
import {
  createSpatialRelation,
  validateSpatialRelation,
} from "../../../src/experimental/spatial/relation";
import type {
  ImmutableSpatialObservation,
  SpatialObservationInput,
} from "../../../src/experimental/spatial/types";
import { S0_PROTECTED_KEYS } from "../../../src/experimental/spatial/constants";
import { assertS0JsonValue } from "../../../src/experimental/spatial/validation";
import { canonicalJsonDigest } from "../../../src/kernel/assertions/index";
import {
  createArtifactDocuments,
  generateSyntheticNations,
} from "../../../src/pipeline/artifact.mjs";
import * as policyValidationRuntime from "../../../src/pipeline/policy-validation.mjs";
import type {
  PolicyRecord,
  SourceRegistry,
  TaxonomyConfig,
} from "../../../src/shared/contracts";

const projectRoot = resolve(import.meta.dirname, "..", "..", "..");

const EXPECTED_PROTECTED_KEYS = [
  "nationId",
  "nationIds",
  "officialName",
  "authorizedAliases",
  "recognitionBaselineVersion",
  "stateCoverage",
  "nationAssociations",
  "jurisdiction",
  "issuingBodies",
  "officialSubjects",
  "taxonomyMemberships",
  "relevance",
  "landmark",
  "legalEffect",
  "legalApplicability",
  "rights",
  "consent",
  "affiliation",
  "interest",
  "eligibility",
  "impact",
] as const satisfies readonly S0ProtectedKey[];

const NATION_POINTERS = [
  "/id",
  "/officialName",
  "/authorizedAliases",
  "/recognitionBaselineVersion",
  "/stateCoverage",
] as const;

const POLICY_RECORD_POINTERS = [
  "/internalId",
  "/source",
  "/documentType",
  "/jurisdiction",
  "/issuingBodies",
  "/officialSubjects",
  "/taxonomyMemberships",
  "/relevance",
  "/nationAssociations",
  "/landmark",
  "/status",
  "/dates",
  "/fieldProvenance",
  "/sourceDocumentRelationships",
] as const;

type JsonObject = Record<string, unknown>;
type S0ProtectedKey = (typeof S0_PROTECTED_KEYS)[number];

interface PolicyValidationRuntime {
  readonly completeSyntheticProvenance: (record: PolicyRecord) => PolicyRecord;
}

// The runtime export predates its declaration entry; keep that mismatch local
// to this test rather than changing the current product declaration boundary.
const { completeSyntheticProvenance } =
  policyValidationRuntime as unknown as PolicyValidationRuntime;

interface ProtectedSchemaShape {
  readonly $defs: {
    readonly noProtectedKeys: {
      readonly then: {
        readonly propertyNames: {
          readonly not: { readonly enum: readonly string[] };
        };
      };
    };
  };
}

interface PointerSnapshot {
  readonly root: string;
  readonly byId: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

interface InjectionSite {
  readonly name: "root" | "nested-s0" | "nested-k0" | "object-in-array";
  readonly select: (candidate: JsonObject) => JsonObject;
}

interface ProtectedObjectCase {
  readonly name:
    "SpatialObservation" | "SpatialRelation" | "JurisdictionEvidence";
  readonly value: unknown;
  readonly validateSchema: ValidateFunction;
  readonly validateRuntime: (candidate: unknown) => unknown;
  readonly sites: readonly InjectionSite[];
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(resolve(projectRoot, relativePath), "utf8"),
  ) as T;
}

function mutableClone<T>(value: T): T {
  return structuredClone(value);
}

function record(value: unknown, label: string): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} is not an object`);
  }
  return value as JsonObject;
}

function nestedRecord(value: JsonObject, key: string): JsonObject {
  return record(value[key], key);
}

function firstRecord(value: JsonObject, key: string): JsonObject {
  const array = value[key];
  if (!Array.isArray(array) || array.length === 0) {
    throw new TypeError(`${key} is not a non-empty array`);
  }
  return record(array[0], `${key}[0]`);
}

function observationInput(
  fixtureSlug: string,
  geometry: SpatialObservationInput["geometry"],
): SpatialObservationInput {
  return {
    fixtureSlug,
    layerVersion: "1.0.0",
    axisOrder: ["synthetic_x", "synthetic_y"],
    geometry,
    resolution: 1,
    observedTimeValue: {
      kind: "date_time",
      value: "3785-01-01T00:00:00Z",
    },
    validTimeValue: { kind: "date", value: "3785-01-03" },
    coverage: "complete_fixture_extent",
    uncertainty: { state: "certain" },
    retrievedAt: "3785-01-04T00:00:00Z",
  };
}

function observationsForWorkflow(): readonly [
  ImmutableSpatialObservation,
  ImmutableSpatialObservation,
] {
  return [
    createSpatialObservation(
      observationInput("fixture-0070", {
        minimum: [-8, -8],
        maximum: [8, 8],
      }),
    ),
    createSpatialObservation(
      observationInput("fixture-0071", {
        minimum: [-4, -4],
        maximum: [4, 4],
      }),
    ),
  ];
}

function compileS0Schemas(): {
  readonly observation: ValidateFunction;
  readonly relation: ValidateFunction;
  readonly jurisdiction: ValidateFunction;
  readonly safeValueBarriers: readonly ValidateFunction[];
} {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(assertionSchema);
  const schemas = [
    spatialObservationSchema,
    spatialRelationSchema,
    jurisdictionEvidenceSchema,
  ] as const;
  const validators = schemas.map((schema) => ajv.compile(schema));
  const safeValueBarriers = schemas.map((schema, index) =>
    ajv.compile({
      $id: `urn:policy-sentinel:s0-protected-value-control:${index}`,
      $defs: {
        noProtectedKeys: (schema as ProtectedSchemaShape).$defs.noProtectedKeys,
      },
      $ref: "#/$defs/noProtectedKeys",
    }),
  );
  return {
    observation: validators[0]!,
    relation: validators[1]!,
    jurisdiction: validators[2]!,
    safeValueBarriers,
  };
}

function protectedObjectCases(): readonly ProtectedObjectCase[] {
  const validators = compileS0Schemas();
  const [first, second] = observationsForWorkflow();
  const observations = createSpatialObservationCollection([first, second]);
  const observation = observations[0]!;
  const relation = createSpatialRelation(observations[0]!, observations[1]!, {
    tolerance: 0,
  });
  const jurisdictionEvidence = createJurisdictionEvidence({
    fixtureSlug: "fixture-0072",
    retrievedAt: "3785-02-03T04:05:06Z",
  });

  return [
    {
      name: "SpatialObservation",
      value: observation,
      validateSchema: validators.observation,
      validateRuntime: validateSpatialObservation,
      sites: [
        { name: "root", select: (candidate) => candidate },
        {
          name: "nested-s0",
          select: (candidate) => nestedRecord(candidate, "coordinateSpace"),
        },
        {
          name: "nested-k0",
          select: (candidate) =>
            nestedRecord(
              nestedRecord(
                nestedRecord(candidate, "factManifest"),
                "validTimeFact",
              ),
              "provenance",
            ),
        },
        {
          name: "object-in-array",
          select: (candidate) =>
            firstRecord(
              nestedRecord(nestedRecord(candidate, "validTime"), "evidence"),
              "factReferences",
            ),
        },
      ],
    },
    {
      name: "SpatialRelation",
      value: relation,
      validateSchema: validators.relation,
      validateRuntime: (candidate) =>
        validateSpatialRelation(candidate, observations),
      sites: [
        { name: "root", select: (candidate) => candidate },
        {
          name: "nested-s0",
          select: (candidate) => nestedRecord(candidate, "algorithm"),
        },
        {
          name: "nested-k0",
          select: (candidate) =>
            nestedRecord(
              nestedRecord(candidate, "derivedAssertion"),
              "evidence",
            ),
        },
        {
          name: "object-in-array",
          select: (candidate) =>
            firstRecord(
              nestedRecord(candidate, "sharedValidTime"),
              "factReferences",
            ),
        },
      ],
    },
    {
      name: "JurisdictionEvidence",
      value: jurisdictionEvidence,
      validateSchema: validators.jurisdiction,
      validateRuntime: validateJurisdictionEvidence,
      sites: [
        { name: "root", select: (candidate) => candidate },
        {
          name: "nested-s0",
          select: (candidate) => nestedRecord(candidate, "factManifest"),
        },
        {
          name: "nested-k0",
          select: (candidate) =>
            nestedRecord(
              nestedRecord(
                nestedRecord(candidate, "factManifest"),
                "titleFact",
              ),
              "provenance",
            ),
        },
        {
          name: "object-in-array",
          select: (candidate) =>
            firstRecord(nestedRecord(candidate, "evidence"), "factReferences"),
        },
      ],
    },
  ];
}

function resolveJsonPointer(value: unknown, pointer: string): unknown {
  if (!pointer.startsWith("/")) {
    throw new TypeError(`expected an absolute JSON pointer: ${pointer}`);
  }
  let current = value;
  for (const encodedSegment of pointer.slice(1).split("/")) {
    const segment = encodedSegment.replaceAll("~1", "/").replaceAll("~0", "~");
    const object = record(current, pointer);
    if (!Object.hasOwn(object, segment)) {
      throw new TypeError(`missing diagnostic pointer ${pointer}`);
    }
    current = object[segment];
  }
  return current;
}

function snapshotCollection(
  root: unknown,
  members: readonly unknown[],
  idKey: string,
  pointers: readonly string[],
): PointerSnapshot {
  const byId: Record<string, Record<string, string>> = {};
  for (const member of members) {
    const object = record(member, idKey);
    const id = object[idKey];
    if (typeof id !== "string" || id.length === 0 || Object.hasOwn(byId, id)) {
      throw new TypeError(`expected a unique non-empty ${idKey}`);
    }
    byId[id] = Object.fromEntries(
      pointers.map((pointer) => [
        pointer,
        canonicalJsonDigest(resolveJsonPointer(object, pointer)),
      ]),
    );
  }
  return { root: canonicalJsonDigest(root), byId };
}

function nationSnapshot(nationDocument: unknown): PointerSnapshot {
  const document = record(nationDocument, "nations.json");
  const nations = document.nations;
  if (!Array.isArray(nations)) {
    throw new TypeError("nations.json.nations is not an array");
  }
  return snapshotCollection(document, nations, "id", NATION_POINTERS);
}

function policyRecordSnapshot(
  records: readonly PolicyRecord[],
): PointerSnapshot {
  return snapshotCollection(
    records,
    records,
    "internalId",
    POLICY_RECORD_POINTERS,
  );
}

function runCompleteS0Workflow(): void {
  const [first, second] = observationsForWorkflow();
  const observations = createSpatialObservationCollection([second, first]);
  const relation = createSpatialRelation(observations[0]!, observations[1]!, {
    tolerance: 0,
  });
  const jurisdictionEvidence = createJurisdictionEvidence({
    fixtureSlug: "fixture-0072",
    retrievedAt: "3785-02-03T04:05:06Z",
  });
  const input = createSpatialEvidenceInput({
    observations,
    relations: [relation],
    jurisdictionEvidence: [jurisdictionEvidence],
  });

  expect(validateSpatialObservation(observations[0]!)).toEqual(observations[0]);
  expect(validateSpatialRelation(relation, observations)).toEqual(relation);
  expect(validateJurisdictionEvidence(jurisdictionEvidence)).toEqual(
    jurisdictionEvidence,
  );
  expect(validateSpatialEvidenceInput(input)).toEqual(input);
  const viewModel = createSpatialEvidenceViewModel(input);
  expect(viewModel.spatialTable.rows).toHaveLength(1);
  expect(viewModel.jurisdictionSection?.rows).toHaveLength(1);
}

describe("S0 recursive protected-data non-interference", () => {
  it("pins the exact ordered 21-key constant and all three recursive schema enums", () => {
    expect(S0_PROTECTED_KEYS).toEqual(EXPECTED_PROTECTED_KEYS);
    expect(S0_PROTECTED_KEYS).toHaveLength(21);

    for (const schema of [
      spatialObservationSchema,
      spatialRelationSchema,
      jurisdictionEvidenceSchema,
    ]) {
      expect(
        (schema as ProtectedSchemaShape).$defs.noProtectedKeys.then
          .propertyNames.not.enum,
      ).toEqual(EXPECTED_PROTECTED_KEYS);
    }
  });

  it("rejects exactly 21 x 4 x 3 = 252 recursive key mutations in schema and runtime", () => {
    let mutationCount = 0;
    const cases = protectedObjectCases();
    expect(cases).toHaveLength(3);

    for (const objectCase of cases) {
      expect(objectCase.validateSchema(objectCase.value)).toBe(true);
      expect(() => objectCase.validateRuntime(objectCase.value)).not.toThrow();
      expect(objectCase.sites.map(({ name }) => name)).toEqual([
        "root",
        "nested-s0",
        "nested-k0",
        "object-in-array",
      ]);

      for (const site of objectCase.sites) {
        for (const protectedKey of EXPECTED_PROTECTED_KEYS) {
          const candidate = record(
            mutableClone(objectCase.value),
            objectCase.name,
          );
          site.select(candidate)[protectedKey] = "forged-protected-value";
          mutationCount += 1;

          expect(
            objectCase.validateSchema(candidate),
            `${objectCase.name}/${site.name}/${protectedKey} passed its schema`,
          ).toBe(false);
          expect(
            () => objectCase.validateRuntime(candidate),
            `${objectCase.name}/${site.name}/${protectedKey} passed runtime`,
          ).toThrow(/protected semantic field is forbidden in S0/);
        }
      }
    }

    expect(mutationCount).toBe(21 * 4 * 3);
  });

  it("treats protected words in recursively nested string values as data, not keys", () => {
    const { safeValueBarriers } = compileS0Schemas();
    for (const protectedKey of EXPECTED_PROTECTED_KEYS) {
      const safeControl = {
        label: protectedKey,
        nested: { sentence: `not a property name: ${protectedKey}` },
        entries: [{ value: protectedKey }],
      };
      expect(() => assertS0JsonValue(safeControl)).not.toThrow();
      for (const validateBarrier of safeValueBarriers) {
        expect(validateBarrier(safeControl)).toBe(true);
      }
    }
  });
});

describe("S0 Nation and PolicyRecord digest barriers", () => {
  it("preserves complete roots and every required per-object diagnostic pointer", () => {
    const taxonomy = readJson<TaxonomyConfig>("config/taxonomy.v1.json");
    const sourceRegistry = readJson<SourceRegistry>("config/sources.v1.json");
    const records = [
      "fixtures/records/general-jurisdiction.valid.json",
      "fixtures/records/county-explicit.valid.json",
      "fixtures/records/intergovernmental-accord.valid.json",
    ].map((path) => completeSyntheticProvenance(readJson<PolicyRecord>(path)));
    const documents = createArtifactDocuments({
      records,
      nations: generateSyntheticNations(),
      taxonomy,
      sourceRegistry,
      generatedAt: "2026-07-30T15:00:00.000Z",
      synthetic: true,
    });
    const nationDocument = documents.get("nations.json");
    if (nationDocument === undefined) {
      throw new TypeError("artifact did not contain nations.json");
    }

    const nationBefore = nationSnapshot(nationDocument);
    const policyBefore = policyRecordSnapshot(records);
    expect(Object.keys(nationBefore.byId)).toHaveLength(575);
    expect(Object.keys(policyBefore.byId)).toHaveLength(3);
    expect(Object.values(nationBefore.byId)[0]).toHaveProperty(
      "/stateCoverage",
    );
    expect(Object.values(policyBefore.byId)[0]).toHaveProperty(
      "/sourceDocumentRelationships",
    );

    runCompleteS0Workflow();

    expect(nationSnapshot(nationDocument)).toEqual(nationBefore);
    expect(policyRecordSnapshot(records)).toEqual(policyBefore);
  });

  it("proves root and pointer snapshots are nonvacuous diagnostics", () => {
    const taxonomy = readJson<TaxonomyConfig>("config/taxonomy.v1.json");
    const sourceRegistry = readJson<SourceRegistry>("config/sources.v1.json");
    const records = [
      "fixtures/records/general-jurisdiction.valid.json",
      "fixtures/records/county-explicit.valid.json",
      "fixtures/records/intergovernmental-accord.valid.json",
    ].map((path) => completeSyntheticProvenance(readJson<PolicyRecord>(path)));
    const documents = createArtifactDocuments({
      records,
      nations: generateSyntheticNations(),
      taxonomy,
      sourceRegistry,
      generatedAt: "2026-07-30T15:00:00.000Z",
      synthetic: true,
    });
    const nationDocument = documents.get("nations.json");
    if (nationDocument === undefined) {
      throw new TypeError("artifact did not contain nations.json");
    }

    const nationBaseline = nationSnapshot(nationDocument);
    const changedBaseline = mutableClone(nationDocument);
    nestedRecord(
      record(changedBaseline, "nations.json"),
      "baseline",
    ).authorityName = "Changed synthetic recognition baseline";
    const nationChanged = nationSnapshot(changedBaseline);
    expect(nationChanged.root).not.toBe(nationBaseline.root);
    expect(nationChanged.byId).toEqual(nationBaseline.byId);

    const policyBaseline = policyRecordSnapshot(records);
    const changedTitle = mutableClone(records);
    changedTitle[0]!.officialTitle = `${changedTitle[0]!.officialTitle} changed`;
    const titleChanged = policyRecordSnapshot(changedTitle);
    expect(titleChanged.root).not.toBe(policyBaseline.root);
    expect(titleChanged.byId).toEqual(policyBaseline.byId);

    const changedJurisdiction = mutableClone(records);
    changedJurisdiction[0]!.jurisdiction.name = "Changed jurisdiction";
    const jurisdictionChanged = policyRecordSnapshot(changedJurisdiction);
    expect(jurisdictionChanged.root).not.toBe(policyBaseline.root);
    expect(
      jurisdictionChanged.byId[changedJurisdiction[0]!.internalId]?.[
        "/jurisdiction"
      ],
    ).not.toBe(
      policyBaseline.byId[changedJurisdiction[0]!.internalId]?.[
        "/jurisdiction"
      ],
    );
  });
});

describe("unchanged PolicyRecord 1.4.0 root boundary", () => {
  it("rejects the three attempted S0 root properties as additional properties", () => {
    expect(recordSchema.properties.schemaVersion.const).toBe("1.4.0");
    expect(recordSchema.additionalProperties).toBe(false);
    const schemaProperties = recordSchema.properties as Record<string, unknown>;
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validateRecord = ajv.compile(recordSchema);
    const baseline = completeSyntheticProvenance(
      readJson<PolicyRecord>(
        "fixtures/records/general-jurisdiction.valid.json",
      ),
    );
    const [first, second] = observationsForWorkflow();
    const observations = createSpatialObservationCollection([first, second]);
    const injections = {
      spatialObservation: observations[0]!,
      spatialRelation: createSpatialRelation(
        observations[0]!,
        observations[1]!,
        { tolerance: 0 },
      ),
      jurisdictionEvidence: createJurisdictionEvidence({
        fixtureSlug: "fixture-0072",
        retrievedAt: "3785-02-03T04:05:06Z",
      }),
    } as const;

    expect(validateRecord(baseline)).toBe(true);
    for (const [property, payload] of Object.entries(injections)) {
      expect(Object.hasOwn(schemaProperties, property)).toBe(false);
      expect(validateRecord({ ...baseline, [property]: payload })).toBe(false);
      expect(validateRecord.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: "",
            keyword: "additionalProperties",
            params: { additionalProperty: property },
          }),
        ]),
      );
    }
  });
});
