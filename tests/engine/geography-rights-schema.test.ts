import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import malformedFixtureFamily from "../../fixtures/engine/geography-rights-malformed.invalid.json";
import validGeographyRightsBundle from "../../fixtures/engine/geography-rights.synthetic.valid.json";
import validProfileBundle from "../../fixtures/engine/projection-profiles.synthetic.valid.json";
import geographyRightsSchema from "../../schemas/geography-rights.schema.v1.json";
import {
  GEOGRAPHY_RIGHTS_SCHEMA_ID,
  GEOGRAPHY_RIGHTS_SCHEMA_VERSION,
  GeographyRightsValidationError,
  createGeographyRightsProjection,
  parseGeographyRightsBundle,
} from "../../src/engine";

type Mutation = {
  operation: "add" | "remove" | "replace";
  path: string;
  value?: unknown;
};

type MalformedCase = {
  id: string;
  expectedLayer: "schema" | "semantic" | "projection";
  expectedCode: string;
  expectedPath?: string;
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

function captureValidationError(
  run: () => unknown,
): GeographyRightsValidationError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(GeographyRightsValidationError);
    return error as GeographyRightsValidationError;
  }
  throw new Error("invalid candidate was accepted");
}

const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
addFormats(ajv);
const validateBundle = ajv.compile(geographyRightsSchema);
const malformedCases = malformedFixtureFamily.cases as MalformedCase[];

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
  requestedUse: "monitoring_context",
} as const;

describe("governed geography and rights schema closure", () => {
  it("pins a strict standalone schema and accepts the synthetic fixture", () => {
    expect(ajv.validateSchema(geographyRightsSchema)).toBe(true);
    expect(geographyRightsSchema.$id).toBe(GEOGRAPHY_RIGHTS_SCHEMA_ID);
    expect(geographyRightsSchema.additionalProperties).toBe(false);
    expect(geographyRightsSchema.properties.schemaVersion.const).toBe(
      GEOGRAPHY_RIGHTS_SCHEMA_VERSION,
    );
    expect(
      validateBundle(validGeographyRightsBundle),
      ajv.errorsText(validateBundle.errors),
    ).toBe(true);
    expect(() =>
      parseGeographyRightsBundle(validGeographyRightsBundle),
    ).not.toThrow();
  });

  it("proves materially different optional, temporal, and restricted fixture strata", () => {
    expect(validGeographyRightsBundle.deploymentBindings).toHaveLength(2);
    expect(
      new Set(
        validGeographyRightsBundle.geographicRelations.map(
          ({ relationKind }) => relationKind,
        ),
      ),
    ).toEqual(
      new Set([
        "service_area",
        "watershed",
        "co_management_area",
        "intergovernmental_service_or_agreement_area",
      ]),
    );
    expect(
      validGeographyRightsBundle.deploymentBindings.find(({ id }) =>
        id.includes("glass-desert"),
      )?.rightsFrameRefs,
    ).toEqual([]);
    expect(
      validGeographyRightsBundle.geographicRelations.some(
        ({ geometryRef }) => geometryRef === null,
      ),
    ).toBe(true);
    expect(
      validGeographyRightsBundle.geographicRelations.some(
        ({ geometryRef }) => geometryRef !== null,
      ),
    ).toBe(true);
    const temporalStates = new Set(
      validGeographyRightsBundle.geographicRelations.flatMap((relation) => [
        relation.observedTemporalScope.from.state,
        relation.observedTemporalScope.through.state,
        relation.effectiveTemporalScope.from.state,
        relation.effectiveTemporalScope.through.state,
      ]),
    );
    expect(temporalStates).toEqual(new Set(["known", "open", "unknown"]));
    expect(
      validGeographyRightsBundle.geographicRelations
        .filter(({ id }) => id === "synthetic-cloud-harbor-service-relation")
        .map(({ version }) => version),
    ).toEqual(["1.0.0", "2.0.0"]);
    expect(
      validGeographyRightsBundle.geometryReferences.every(
        ({ representation, opaqueReference }) =>
          representation === "opaque_reference" &&
          opaqueReference.startsWith(
            "urn:policy-sentinel:synthetic-geography:",
          ),
      ),
    ).toBe(true);
  });

  it("keeps authority identity, profile scope, class, and role closure explicit", () => {
    const identities = new Map<
      string,
      { classes: Set<string>; roles: Set<string>; scopes: Set<string> }
    >();
    for (const binding of validGeographyRightsBundle.authorityBindings) {
      expect(binding.authorityIdentityRef.id).toMatch(/^synthetic-/);
      expect(binding.profileAuthorityScopeRef.id).toMatch(/^synthetic-/);
      expect(binding.authorityIdentityRef).not.toEqual(
        binding.profileAuthorityScopeRef,
      );
      const identity = identities.get(binding.authorityIdentityRef.id) ?? {
        classes: new Set<string>(),
        roles: new Set<string>(),
        scopes: new Set<string>(),
      };
      identity.classes.add(binding.authorityClass);
      identity.roles.add(binding.role);
      identity.scopes.add(binding.profileAuthorityScopeRef.id);
      identities.set(binding.authorityIdentityRef.id, identity);
    }

    expect(
      [...identities.values()].every(
        ({ classes, scopes }) => classes.size === 1 && scopes.size === 1,
      ),
    ).toBe(true);
    expect(
      [...identities.entries()]
        .filter(([id]) => id.startsWith("synthetic-cloud-harbor-"))
        .map(([id, identity]) => ({
          id,
          classes: [...identity.classes].sort(),
          roles: [...identity.roles].sort(),
          scopes: [...identity.scopes].sort(),
        }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    ).toEqual([
      {
        id: "synthetic-cloud-harbor-analyst-authority-identity",
        classes: ["synthetic_analyst"],
        roles: ["analyst_review", "geometry_review"],
        scopes: ["synthetic-cloud-harbor-authority"],
      },
      {
        id: "synthetic-cloud-harbor-community-authority-identity",
        classes: ["synthetic_community"],
        roles: [
          "community_configuration_review",
          "frame_configuration",
          "relation_asserting",
        ],
        scopes: ["synthetic-cloud-harbor-authority"],
      },
      {
        id: "synthetic-cloud-harbor-counsel-authority-identity",
        classes: ["synthetic_counsel"],
        roles: ["counsel_review"],
        scopes: ["synthetic-cloud-harbor-authority"],
      },
      {
        id: "synthetic-cloud-harbor-custody-authority-identity",
        classes: ["synthetic_custodian"],
        roles: ["geometry_custody"],
        scopes: ["synthetic-cloud-harbor-authority"],
      },
      {
        id: "synthetic-cloud-harbor-derivation-authority-identity",
        classes: ["synthetic_deriver"],
        roles: ["geometry_derivation"],
        scopes: ["synthetic-cloud-harbor-authority"],
      },
      {
        id: "synthetic-cloud-harbor-source-authority-identity",
        classes: ["synthetic_source"],
        roles: [
          "evidence_source",
          "frame_source",
          "source_verification_review",
        ],
        scopes: ["synthetic-cloud-harbor-authority"],
      },
    ]);
  });

  it("validates, parses, and projects a rights-frame-only bundle without dummy geography", () => {
    const rightsOnly = structuredClone(validGeographyRightsBundle);
    const deploymentId = "synthetic-cloud-harbor-deployment";
    const retainedAuthorityRoles = new Set([
      "frame_source",
      "frame_configuration",
      "evidence_source",
      "community_configuration_review",
      "source_verification_review",
    ]);
    rightsOnly.authorityBindings = rightsOnly.authorityBindings.filter(
      ({ deploymentProfileRef, role }) =>
        deploymentProfileRef.id === deploymentId &&
        retainedAuthorityRoles.has(role),
    );
    rightsOnly.scopeReferences = [];
    rightsOnly.evidenceReferences = rightsOnly.evidenceReferences.filter(
      ({ id }) =>
        id === "synthetic-cloud-harbor-public-evidence" ||
        id === "synthetic-cloud-harbor-rights-evidence",
    );
    rightsOnly.reviewAttestations = rightsOnly.reviewAttestations.filter(
      ({ id }) =>
        id === "synthetic-cloud-harbor-rights-community-review" ||
        id === "synthetic-cloud-harbor-source-review",
    );
    rightsOnly.geometryReferences = [];
    rightsOnly.geographicRelations = [];
    rightsOnly.rightsFrames = rightsOnly.rightsFrames.filter(
      ({ id }) => id === "synthetic-cloud-harbor-monitoring-frame",
    );
    rightsOnly.deploymentBindings = rightsOnly.deploymentBindings.filter(
      ({ deploymentProfileRef }) => deploymentProfileRef.id === deploymentId,
    );
    const binding = rightsOnly.deploymentBindings[0]!;
    binding.geographicRelationRefs = [];
    binding.rightsFrameRefs = [
      {
        id: "synthetic-cloud-harbor-monitoring-frame",
        version: "1.0.0",
      },
    ];
    binding.personaGrants[0]!.geographicRelationRefs = [];
    binding.personaGrants[0]!.rightsFrameRefs = [
      {
        id: "synthetic-cloud-harbor-monitoring-frame",
        version: "1.0.0",
      },
    ];

    expect(
      validateBundle(rightsOnly),
      ajv.errorsText(validateBundle.errors),
    ).toBe(true);
    const parsed = parseGeographyRightsBundle(rightsOnly);
    expect(parsed.scopeReferences).toEqual([]);
    expect(parsed.geometryReferences).toEqual([]);
    expect(parsed.geographicRelations).toEqual([]);
    expect(parsed.rightsFrames).toHaveLength(1);

    const projection = createGeographyRightsProjection(
      validProfileBundle,
      rightsOnly,
      publicRequest,
    );
    expect(projection.context.geographicRelationRefs).toEqual([]);
    expect(projection.context.rightsFrameRefs).toEqual([
      {
        id: "synthetic-cloud-harbor-monitoring-frame",
        version: "1.0.0",
      },
    ]);
  });

  it("pins the complete malformed fixture inventory", () => {
    expect(malformedFixtureFamily.fixtureFamilyVersion).toBe("1.0.0");
    expect(malformedFixtureFamily.baseFixture).toBe(
      "geography-rights.synthetic.valid.json",
    );
    expect(malformedCases).toHaveLength(64);
    expect(new Set(malformedCases.map(({ id }) => id)).size).toBe(
      malformedCases.length,
    );
  });

  it("rejects bundle/member identity collisions atomically before projection", () => {
    const collisionCases = malformedCases.filter(({ id }) =>
      id.startsWith("bundle-identity-collides-with-"),
    );
    const profileBefore = JSON.stringify(validProfileBundle);
    const bundleBefore = JSON.stringify(validGeographyRightsBundle);

    expect(collisionCases.map(({ id }) => id).sort()).toEqual([
      "bundle-identity-collides-with-projected-relation",
      "bundle-identity-collides-with-rights-frame",
    ]);
    for (const fixtureCase of collisionCases) {
      const candidate = applyMutations(
        validGeographyRightsBundle,
        fixtureCase.mutations,
      ) as typeof validGeographyRightsBundle;
      const candidateBefore = JSON.stringify(candidate);
      const noProjection = Symbol("no partial projection");
      let result: unknown = noProjection;

      if (fixtureCase.id.endsWith("projected-relation")) {
        expect(
          candidate.deploymentBindings[0]!.personaGrants[0]!
            .geographicRelationRefs,
        ).toContainEqual({
          id: candidate.id,
          version: candidate.version,
        });
      }

      const error = captureValidationError(() => {
        result = createGeographyRightsProjection(
          validProfileBundle,
          candidate,
          publicRequest,
        );
      });
      expect(error.code).toBe("DUPLICATE_IDENTITY");
      expect(error.path).toBe("$bundle");
      expect(result).toBe(noProjection);
      expect(JSON.stringify(candidate)).toBe(candidateBefore);
      expect(error.message).not.toContain(
        "synthetic-cloud-harbor-watershed-relation",
      );
    }

    expect(JSON.stringify(validProfileBundle)).toBe(profileBefore);
    expect(JSON.stringify(validGeographyRightsBundle)).toBe(bundleBefore);
  });

  it.each(malformedCases)(
    "fails closed for malformed case $id",
    (fixtureCase) => {
      const candidate = applyMutations(
        validGeographyRightsBundle,
        fixtureCase.mutations,
      );
      const schemaAccepted = validateBundle(candidate);

      if (fixtureCase.expectedLayer === "schema") {
        expect(schemaAccepted, fixtureCase.id).toBe(false);
      } else {
        expect(
          schemaAccepted,
          `${fixtureCase.id}: ${ajv.errorsText(validateBundle.errors)}`,
        ).toBe(true);
      }

      if (fixtureCase.expectedLayer === "projection") {
        expect(() => parseGeographyRightsBundle(candidate)).not.toThrow();
        const error = captureValidationError(() =>
          createGeographyRightsProjection(
            validProfileBundle,
            candidate,
            publicRequest,
          ),
        );
        expect(error.code).toBe(fixtureCase.expectedCode);
        if (fixtureCase.expectedPath !== undefined) {
          expect(error.path).toBe(fixtureCase.expectedPath);
        }
        return;
      }

      const error = captureValidationError(() =>
        parseGeographyRightsBundle(candidate),
      );
      expect(error.code).toBe(fixtureCase.expectedCode);
      if (fixtureCase.expectedPath !== undefined) {
        expect(error.path).toBe(fixtureCase.expectedPath);
      }
    },
  );

  it("rejects prototypes, accessors, symbols, cycles, and sparse arrays before graph validation", () => {
    const polluted = Object.create({ inherited: true }) as Record<
      string,
      unknown
    >;
    Object.assign(polluted, structuredClone(validGeographyRightsBundle));

    const accessor = structuredClone(validGeographyRightsBundle) as Record<
      string,
      unknown
    >;
    Object.defineProperty(accessor, "id", {
      enumerable: true,
      get: () => "synthetic-accessor",
    });

    const symbolValue = structuredClone(validGeographyRightsBundle) as Record<
      PropertyKey,
      unknown
    >;
    symbolValue[Symbol("hidden")] = "forbidden";

    const cyclic = structuredClone(validGeographyRightsBundle) as Record<
      string,
      unknown
    >;
    cyclic.cycle = cyclic;

    const sparse = structuredClone(validGeographyRightsBundle);
    delete sparse.geographicRelations[0];

    for (const candidate of [polluted, accessor, symbolValue, cyclic, sparse]) {
      const error = captureValidationError(() =>
        parseGeographyRightsBundle(candidate),
      );
      expect(error.code).toBe("INVALID_JSON");
    }
  });
});
