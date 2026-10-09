import sourceRegistry from "../../config/sources.v1.json";
import * as legacyTaxonomy from "../../src/engine/taxonomy";
import * as pureTaxonomy from "../../src/modules/context/taxonomy";
import * as configuredEngine from "../../scripts/configured-engine";
import type { TaxonomyConfig } from "../../src/shared/contracts";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import taxonomyConfig from "../../config/taxonomy.v1.json";
import validGeographyRightsBundle from "../../fixtures/engine/geography-rights.synthetic.valid.json";
import validProfileBundle from "../../fixtures/engine/projection-profiles.synthetic.valid.json";
import validTaxonomyBundle from "../../fixtures/engine/taxonomy.synthetic.valid.json";
import federalRecord from "../../fixtures/records/general-jurisdiction.valid.json";
import geographyRightsSchema from "../../schemas/geography-rights.schema.v1.json";
import projectionProfileSchema from "../../schemas/projection-profile.schema.v1.json";
import recordSchema from "../../schemas/record.schema.v1.json";
import retainedTaxonomySchema from "../../schemas/taxonomy.schema.v1.json";
import {
  createEngineProjection,
  createGeographyRightsProjection,
  createTaxonomyProjection,
  serializeEngineProjection,
  serializeGeographyRightsProjection,
  serializeTaxonomyProjection,
} from "../../src/engine";
import type { PolicyRecord } from "../../src/shared/contracts";

const projectRoot = resolve(import.meta.dirname, "../..");
const enginePaths = [
  "src/engine/contracts.ts",
  "src/engine/projection.ts",
  "src/core/projection.ts",
  "scripts/configured-engine.ts",
  "src/engine/geography-rights-contracts.ts",
  "src/engine/geography-rights.ts",
  "src/modules/context/geography-rights.ts",
  "src/engine/taxonomy-contracts.ts",
  "src/engine/taxonomy.ts",
  "src/modules/context/taxonomy.ts",
  "src/engine/index.ts",
] as const;

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
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
    if (ordinal === "002" || ordinal === "012") {
      record.officialSubjects = [
        {
          scheme: "synthetic-topic",
          label:
            ordinal === "002"
              ? "Synthetic Shared Monitor"
              : "Synthetic Expired Monitor",
          sourceUrl: "https://synthetic-source-a.invalid/evidence",
        },
      ];
    }
    return record;
  });
}

function forbiddenModuleEdges(source: string): string[] {
  const sourceFile = ts.createSourceFile(
    "engine.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const edges: string[] = [];
  const forbidden = [
    "/app/",
    "/adapters/",
    "/contracts/",
    "/pipeline/",
    "/kernel/",
    "/experimental/",
    "k0",
    "s0",
    "o0",
    "preact",
    "node:",
  ];
  const inspect = (specifier: string) => {
    const normalized = specifier.toLowerCase().replaceAll("\\", "/");
    if (forbidden.some((part) => normalized.includes(part))) {
      edges.push(specifier);
    }
  };
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      inspect(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0]!) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    ) {
      inspect(node.arguments[0]!.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return edges;
}

function collectForbiddenKeys(value: unknown, path = "$taxonomy"): string[] {
  const forbidden = new Set([
    "apiKey",
    "contact",
    "coordinates",
    "email",
    "geography",
    "geometry",
    "landOwnership",
    "legalApplicability",
    "legalEffect",
    "nationAssociation",
    "organizationMembership",
    "parcel",
    "phone",
    "privateData",
    "providerPayload",
    "rawResponse",
    "recommendation",
    "rightsFrame",
    "rightsImpact",
    "secret",
    "telemetry",
    "token",
    "urgency",
    "whyShown",
  ]);
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectForbiddenKeys(entry, `${path}/${index}`),
    );
  }
  if (value === null || typeof value !== "object") {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) => [
    ...(forbidden.has(key) ? [`${path}/${key}`] : []),
    ...collectForbiddenKeys(child, `${path}/${key}`),
  ]);
}

function factClosure(record: PolicyRecord): Record<string, unknown> {
  return {
    source: record.source,
    officialSubjects: record.officialSubjects,
    taxonomyMemberships: record.taxonomyMemberships,
    isUnclassified: record.isUnclassified,
    relevance: record.relevance,
    nationAssociations: record.nationAssociations,
    legislativeContext: record.legislativeContext,
    judicialContext: record.judicialContext,
    accordContext: record.accordContext,
    actionHistory: record.actionHistory,
    statusHistory: record.statusHistory,
    sourceDocumentRelationships: record.sourceDocumentRelationships,
    status: record.status,
    dates: record.dates,
    sourceHealth: record.sourceHealth,
    change: record.change,
    fieldProvenance: record.fieldProvenance,
  };
}

describe("taxonomy non-interference boundaries", () => {
  it("pins GD14 taxonomy and retained PNW-01/PNW-03 contracts byte-for-byte", () => {
    expect(digest(taxonomyConfig)).toBe(
      "ff94fb38cc221f568ed91a565be51a03ab7812f0086cc8bca89dca366171c40f",
    );
    expect(digest(retainedTaxonomySchema)).toBe(
      "8c3d5e65dbf03b87898f0c0f56288b80e0f7e14a284f04227867df8850c2568a",
    );
    expect(digest(validProfileBundle)).toBe(
      "c3680bd1c427ac43c743efd4e2acb9cac2bbd948330f1e0b391c350dbd2fb814",
    );
    expect(digest(projectionProfileSchema)).toBe(
      "0f56b6c739cf4018f79e632e4330f47c13853b0547eaf18d02d5063a0954bee6",
    );
    expect(digest(validGeographyRightsBundle)).toBe(
      "5a3c514e4736ce05031ed4dadc95b8f9626869dc1081ccd9c8cd8f08fb6bc328",
    );
    expect(digest(geographyRightsSchema)).toBe(
      "59507ee6eded08ba347493d31f1f7e76bd4f65228ab4f2b7db2c55e206d10ca0",
    );
  });

  it("does not extend retained v1, PolicyRecord 1.4, PNW-01, or PNW-03 shapes", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validateRetained = ajv.compile(retainedTaxonomySchema);
    const validateRecord = ajv.compile(recordSchema);
    const validateProfile = ajv.compile(projectionProfileSchema);
    const validateGeography = ajv.compile(geographyRightsSchema);

    expect(validateRetained(taxonomyConfig)).toBe(true);
    expect(validateRecord(federalRecord)).toBe(true);
    expect(validateProfile(validProfileBundle)).toBe(true);
    expect(validateGeography(validGeographyRightsBundle)).toBe(true);
    expect(
      validateRetained({ ...structuredClone(taxonomyConfig), namespaces: [] }),
    ).toBe(false);
    expect(
      validateRecord({
        ...structuredClone(federalRecord),
        taxonomyBundleRef: {},
      }),
    ).toBe(false);
    expect(
      validateProfile({
        ...structuredClone(validProfileBundle),
        crosswalks: [],
      }),
    ).toBe(false);
    expect(
      validateGeography({
        ...structuredClone(validGeographyRightsBundle),
        taxonomyAssignments: [],
      }),
    ).toBe(false);
  });

  it("keeps PNW-01 records/views and PNW-03 behavior byte-identical", () => {
    const profile = taxonomyProfile();
    const records = taxonomyRecords();
    const beforeFacts = records.map((record) => digest(factClosure(record)));
    const engineBefore = createEngineProjection(records, profile);
    const engineBytes = serializeEngineProjection(engineBefore);
    const geographyRequest = {
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
    const geographyBytes = serializeGeographyRightsProjection(
      createGeographyRightsProjection(
        validProfileBundle,
        validGeographyRightsBundle,
        geographyRequest,
      ),
    );

    const taxonomyProjection = createTaxonomyProjection(
      profile,
      engineBefore,
      validTaxonomyBundle,
      {
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
      },
    );

    expect(
      serializeEngineProjection(createEngineProjection(records, profile)),
    ).toBe(engineBytes);
    expect(records.map((record) => digest(factClosure(record)))).toEqual(
      beforeFacts,
    );
    expect(
      serializeGeographyRightsProjection(
        createGeographyRightsProjection(
          validProfileBundle,
          validGeographyRightsBundle,
          geographyRequest,
        ),
      ),
    ).toBe(geographyBytes);
    expect(taxonomyProjection).not.toHaveProperty("records");
    expect(taxonomyProjection).not.toHaveProperty("views");
    expect(serializeTaxonomyProjection(taxonomyProjection)).not.toContain(
      "whyShown",
    );
  });

  it("has no forbidden import, runtime I/O, logging, timer, or adapter edge", () => {
    const prohibitedTokens = [
      "fetch",
      "XMLHttpRequest",
      "WebSocket",
      "EventSource",
      "sendBeacon",
      "process.env",
      "console.log",
      "setTimeout",
      "setInterval",
      "localeCompare",
    ];
    for (const path of enginePaths) {
      const source = readFileSync(resolve(projectRoot, path), "utf8");
      expect(forbiddenModuleEdges(source), path).toEqual([]);
      expect(
        prohibitedTokens.filter((token) => source.includes(token)),
        path,
      ).toEqual([]);
      expect(source, path).not.toMatch(/\bclass\s+\w*OutputAdapter\b/);
      expect(source, path).not.toMatch(
        /\b(?:const|let|var)\s+\w*Adapter\s*=\s*\{/,
      );
    }
  });

  it("keeps fixture and output fictional, public, and free of forbidden fields", () => {
    const profile = taxonomyProfile();
    const projection = createTaxonomyProjection(
      profile,
      createEngineProjection(taxonomyRecords(), profile),
      validTaxonomyBundle,
      {
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
      },
    );
    const fixtureText = JSON.stringify(validTaxonomyBundle);

    expect(collectForbiddenKeys(validTaxonomyBundle)).toEqual([]);
    expect(collectForbiddenKeys(projection)).toEqual([]);
    expect(fixtureText).not.toMatch(
      /\b(?:atni|ncai|washington|oregon|idaho|alaska|montana|tribe|treaty|reservation|parcel|geojson)\b/i,
    );
    expect(
      validTaxonomyBundle.evidenceReferences.every(
        ({ citation, visibility }) =>
          citation.url.startsWith("https://") &&
          citation.url.includes(".invalid/") &&
          visibility === "public",
      ),
    ).toBe(true);
    expect(
      validTaxonomyBundle.crosswalks.every(
        ({ visibility }) => visibility === "public",
      ),
    ).toBe(true);
    expect(
      validTaxonomyBundle.assignments.every(
        ({ visibility }) => visibility === "public",
      ),
    ).toBe(true);
  });

  it("keeps taxonomy fixtures outside the static artifact builder", () => {
    const builder = readFileSync(
      resolve(projectRoot, "scripts/build-synthetic-artifact.mjs"),
      "utf8",
    );
    expect(builder).not.toContain("taxonomy.synthetic");
    expect(builder).not.toContain("taxonomy-bundle");
    expect(builder).not.toContain("fixtures/engine");
    expect(builder).toContain('normalized.startsWith("fixtures/records/")');
  });
});

it("preserves taxonomy facade identities and explicitly configured projection", () => {
  const shared = [
    "REQUIRED_TAXONOMY_NONCLAIMS",
    "TaxonomyValidationError",
    "serializeTaxonomyProjection",
  ] as const;
  const configured = [
    "parseTaxonomyBundle",
    "createTaxonomyProjection",
  ] as const;
  expect(Object.keys(legacyTaxonomy).sort()).toEqual(
    [...shared, ...configured].sort(),
  );
  for (const name of shared)
    expect(legacyTaxonomy[name]).toBe(pureTaxonomy[name]);
  for (const name of configured)
    expect(legacyTaxonomy[name]).toBe(configuredEngine[name]);
  const configuration = {
    taxonomyConfig: taxonomyConfig as TaxonomyConfig,
    projectionConfiguration: { sourceRegistry, taxonomy: taxonomyConfig },
  };
  const direct = pureTaxonomy.createTaxonomyRuntime(configuration);
  expect(direct.parseTaxonomyBundle(validTaxonomyBundle)).toEqual(
    legacyTaxonomy.parseTaxonomyBundle(validTaxonomyBundle),
  );
  const profile = taxonomyProfile();
  const engine = createEngineProjection(taxonomyRecords(), profile);
  const request = {
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
  };
  expect(
    serializeTaxonomyProjection(
      direct.createTaxonomyProjection(
        profile,
        engine,
        validTaxonomyBundle,
        request,
      ),
    ),
  ).toBe(
    serializeTaxonomyProjection(
      createTaxonomyProjection(profile, engine, validTaxonomyBundle, request),
    ),
  );
  const wrongTaxonomy = pureTaxonomy.createTaxonomyRuntime({
    ...configuration,
    taxonomyConfig: { ...configuration.taxonomyConfig, categories: [] },
  });
  expect(() => wrongTaxonomy.parseTaxonomyBundle(validTaxonomyBundle)).toThrow(
    pureTaxonomy.TaxonomyValidationError,
  );
});
