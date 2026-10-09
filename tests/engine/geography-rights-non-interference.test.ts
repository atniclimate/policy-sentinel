import sourceRegistry from "../../config/sources.v1.json";
import taxonomy from "../../config/taxonomy.v1.json";
import * as legacyGeography from "../../src/engine/geography-rights";
import * as pureGeography from "../../src/modules/context/geography-rights";
import * as configuredEngine from "../../scripts/configured-engine";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import validGeographyRightsBundle from "../../fixtures/engine/geography-rights.synthetic.valid.json";
import validProfileBundle from "../../fixtures/engine/projection-profiles.synthetic.valid.json";
import federalRecord from "../../fixtures/records/general-jurisdiction.valid.json";
import projectionProfileSchema from "../../schemas/projection-profile.schema.v1.json";
import recordSchema from "../../schemas/record.schema.v1.json";
import {
  createEngineProjection,
  createGeographyRightsProjection,
  serializeEngineProjection,
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
  "src/engine/index.ts",
] as const;

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
    .join(",")}}`;
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

function collectForbiddenKeys(value: unknown, path = "$fixture"): string[] {
  const forbidden = new Set([
    "apiKey",
    "bbox",
    "bounds",
    "centroid",
    "contact",
    "coordinates",
    "digest",
    "email",
    "features",
    "geometry",
    "landOwnership",
    "latitude",
    "legalApplicability",
    "legalEffect",
    "longitude",
    "parcel",
    "phone",
    "privateData",
    "properties",
    "providerPayload",
    "rawResponse",
    "rightsImpact",
    "secret",
    "telemetry",
    "tile",
    "token",
    "whyShown",
    "wkt",
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

function collectNumbers(value: unknown): number[] {
  if (typeof value === "number") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectNumbers);
  }
  if (value === null || typeof value !== "object") {
    return [];
  }
  return Object.values(value).flatMap(collectNumbers);
}

function factClosure(record: PolicyRecord): Record<string, unknown> {
  return {
    source: record.source,
    officialSubjects: record.officialSubjects,
    taxonomyMemberships: record.taxonomyMemberships,
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

describe("geography and rights non-interference boundaries", () => {
  it("keeps the PNW-01 schema and representative fixture byte contract unchanged", () => {
    const ajv = new Ajv2020({
      allErrors: true,
      strict: true,
      allowUnionTypes: true,
    });
    addFormats(ajv);
    const validateProfile = ajv.compile(projectionProfileSchema);
    const profileDigest = createHash("sha256")
      .update(JSON.stringify(validProfileBundle))
      .digest("hex");

    expect(profileDigest).toBe(
      "c3680bd1c427ac43c743efd4e2acb9cac2bbd948330f1e0b391c350dbd2fb814",
    );
    expect(projectionProfileSchema.properties.schemaVersion.const).toBe(
      "1.0.0",
    );
    expect(projectionProfileSchema.additionalProperties).toBe(false);
    expect(validateProfile(validProfileBundle)).toBe(true);

    const injectedRoot = {
      ...structuredClone(validProfileBundle),
      geographicRelations: [],
    };
    const injectedDeployment = structuredClone(validProfileBundle);
    Object.assign(injectedDeployment.deploymentProfiles[0]!, {
      geographicRelationRefs: [],
      rightsFrameRefs: [],
    });
    expect(validateProfile(injectedRoot)).toBe(false);
    expect(validateProfile(injectedDeployment)).toBe(false);
  });

  it("keeps every protected PolicyRecord fact family and PNW-01 projection byte-identical", () => {
    const input = structuredClone(federalRecord) as PolicyRecord;
    const beforeRecord = canonical(input);
    const beforeFacts = canonical(factClosure(input));
    const pnw01Before = serializeEngineProjection(
      createEngineProjection([input], validProfileBundle),
    );

    createGeographyRightsProjection(
      validProfileBundle,
      validGeographyRightsBundle,
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
        requestedVisibility: "restricted",
        requestedUse: "monitoring_context",
      },
    );

    expect(canonical(input)).toBe(beforeRecord);
    expect(canonical(factClosure(input))).toBe(beforeFacts);
    expect(
      serializeEngineProjection(
        createEngineProjection([input], validProfileBundle),
      ),
    ).toBe(pnw01Before);
  });

  it("does not extend the closed PolicyRecord 1.4 contract", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validateRecord = ajv.compile(recordSchema);
    expect(recordSchema.properties.schemaVersion.const).toBe("1.4.0");
    expect(validateRecord(federalRecord)).toBe(true);

    for (const forbiddenRootField of [
      "geographicRelations",
      "rightsFrames",
      "geometryReferences",
      "rightsImpact",
      "whyShown",
    ]) {
      expect(
        validateRecord({
          ...structuredClone(federalRecord),
          [forbiddenRootField]: {},
        }),
        forbiddenRootField,
      ).toBe(false);
    }
  });

  it("has no forbidden import, runtime I/O, logging, timer, or concrete-adapter edge", () => {
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

  it("keeps fixtures mechanically fictional and free of spatial payloads or legal claims", () => {
    const fixtureText = JSON.stringify(validGeographyRightsBundle);
    expect(collectForbiddenKeys(validGeographyRightsBundle)).toEqual([]);
    expect(collectNumbers(validGeographyRightsBundle)).toEqual([]);
    expect(fixtureText).not.toMatch(
      /\b(?:atni|ncai|washington|oregon|idaho|alaska|montana|treaty|tribe|parcel|latitude|longitude|geojson)\b/i,
    );

    for (const collection of [
      validGeographyRightsBundle.authorityBindings,
      validGeographyRightsBundle.scopeReferences,
      validGeographyRightsBundle.evidenceReferences,
      validGeographyRightsBundle.reviewAttestations,
      validGeographyRightsBundle.geometryReferences,
      validGeographyRightsBundle.geographicRelations,
      validGeographyRightsBundle.rightsFrames,
      validGeographyRightsBundle.deploymentBindings,
    ]) {
      expect(collection.every(({ id }) => id.startsWith("synthetic-"))).toBe(
        true,
      );
    }
    expect(
      validGeographyRightsBundle.evidenceReferences.every(
        ({ citation }) =>
          citation.url.startsWith("https://") &&
          citation.url.includes(".invalid/"),
      ),
    ).toBe(true);
    expect(
      validGeographyRightsBundle.geometryReferences.every(
        ({ opaqueReference }) =>
          /^urn:policy-sentinel:synthetic-geography:[a-z0-9-]+$/.test(
            opaqueReference,
          ),
      ),
    ).toBe(true);
  });

  it("keeps geography and rights fixtures outside the public artifact builder", () => {
    const builder = readFileSync(
      resolve(projectRoot, "scripts/build-synthetic-artifact.mjs"),
      "utf8",
    );
    expect(builder).not.toContain("geography-rights");
    expect(builder).not.toContain("fixtures/engine");
    expect(builder).toContain('normalized.startsWith("fixtures/records/")');
  });
});

it("preserves geography facade identities and explicitly configured projection", () => {
  const shared = [
    "REQUIRED_GEOGRAPHY_RIGHTS_FORBIDDEN_INFERENCES",
    "GeographyRightsValidationError",
    "parseGeographyRightsBundle",
    "serializeGeographyRightsProjection",
  ] as const;
  expect(Object.keys(legacyGeography).sort()).toEqual(
    [...shared, "createGeographyRightsProjection"].sort(),
  );
  for (const name of shared)
    expect(legacyGeography[name]).toBe(pureGeography[name]);
  expect(legacyGeography.createGeographyRightsProjection).toBe(
    configuredEngine.createGeographyRightsProjection,
  );
  expect(legacyGeography.parseGeographyRightsBundle).toBe(
    configuredEngine.parseGeographyRightsBundle,
  );
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
    requestedVisibility: "restricted",
    requestedUse: "monitoring_context",
  };
  const direct = pureGeography.createGeographyRightsRuntime({
    sourceRegistry,
    taxonomy,
  });
  expect(
    pureGeography.serializeGeographyRightsProjection(
      direct.createGeographyRightsProjection(
        validProfileBundle,
        validGeographyRightsBundle,
        request,
      ),
    ),
  ).toBe(
    pureGeography.serializeGeographyRightsProjection(
      createGeographyRightsProjection(
        validProfileBundle,
        validGeographyRightsBundle,
        request,
      ),
    ),
  );
  const refused = pureGeography.createGeographyRightsRuntime({
    sourceRegistry: { sources: [] },
    taxonomy,
  });
  expect(() =>
    refused.createGeographyRightsProjection(
      validProfileBundle,
      validGeographyRightsBundle,
      request,
    ),
  ).toThrow();
});
