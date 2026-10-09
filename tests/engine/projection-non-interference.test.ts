import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import validProfileBundle from "../../fixtures/engine/projection-profiles.synthetic.valid.json";
import federalRecord from "../../fixtures/records/general-jurisdiction.valid.json";
import recordSchema from "../../schemas/record.schema.v1.json";
import { createEngineProjection } from "../../src/engine";
import type { PolicyRecord } from "../../src/shared/contracts";

const projectRoot = resolve(import.meta.dirname, "../..");
const enginePaths = [
  "src/engine/contracts.ts",
  "src/engine/projection.ts",
  "src/core/projection.ts",
  "scripts/configured-engine.ts",
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

function prohibitedRuntimeTokens(source: string): string[] {
  const tokens = [
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
  return tokens.filter((token) => source.includes(token));
}

function collectForbiddenKeys(value: unknown, path = "$profile"): string[] {
  const forbidden = new Set([
    "apiKey",
    "contact",
    "email",
    "feeLand",
    "geometry",
    "landOwnership",
    "legalEffect",
    "parcel",
    "phone",
    "privateData",
    "providerPayload",
    "rawResponse",
    "rightsImpact",
    "secret",
    "telemetry",
    "token",
    "trustLand",
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

describe("engine seam non-interference", () => {
  it("keeps every protected PolicyRecord fact family byte-identical", () => {
    const input = structuredClone(federalRecord) as PolicyRecord;
    const beforeRecord = canonical(input);
    const beforeFacts = canonical(factClosure(input));
    const projection = createEngineProjection([input], validProfileBundle);
    const stored = projection.records[0] as PolicyRecord;

    expect(canonical(input)).toBe(beforeRecord);
    expect(canonical(factClosure(input))).toBe(beforeFacts);
    expect(canonical(stored)).toBe(beforeRecord);
    expect(canonical(factClosure(stored))).toBe(beforeFacts);

    const profileVariant = structuredClone(validProfileBundle);
    profileVariant.personaProjections[0]!.outputAdapterRefs = [
      structuredClone(profileVariant.outputAdapters[1]!),
    ];
    const variant = createEngineProjection([input], profileVariant);
    expect(canonical(variant.records[0])).toBe(beforeRecord);
    expect(canonical(factClosure(variant.records[0] as PolicyRecord))).toBe(
      beforeFacts,
    );
    expect(canonical(variant.views[0]!.recordReferences[0]!.reasons)).toBe(
      canonical(projection.views[0]!.recordReferences[0]!.reasons),
    );
  });

  it("keeps view and reference objects on exact reference-only allowlists", () => {
    const projection = createEngineProjection(
      [structuredClone(federalRecord) as PolicyRecord],
      validProfileBundle,
    );
    for (const view of projection.views) {
      expect(Object.keys(view).sort()).toEqual([
        "deploymentProfileRef",
        "id",
        "outputAdapterRefs",
        "personaProjectionRef",
        "recordReferences",
        "version",
      ]);
      for (const reference of view.recordReferences) {
        expect(Object.keys(reference).sort()).toEqual(["reasons", "recordId"]);
        for (const reason of reference.reasons) {
          expect(Object.keys(reason).sort()).toEqual([
            "basis",
            "configurationRef",
            "evidenceReference",
            "nonClaims",
            "reviewState",
            "ruleRef",
            "temporalScope",
          ]);
        }
      }
    }
  });

  it("does not extend or migrate the closed PolicyRecord 1.4 contract", () => {
    const ajv = new Ajv2020({
      allErrors: true,
      strict: true,
      allowUnionTypes: true,
    });
    addFormats(ajv);
    const validateRecord = ajv.compile(recordSchema);
    expect(recordSchema.properties.schemaVersion.const).toBe("1.4.0");
    expect(recordSchema.additionalProperties).toBe(false);
    expect(validateRecord(federalRecord)).toBe(true);

    for (const forbiddenRootField of [
      "regionPack",
      "deploymentView",
      "personaProjection",
      "whyShown",
    ]) {
      const injected = {
        ...structuredClone(federalRecord),
        [forbiddenRootField]: {},
      };
      expect(validateRecord(injected), forbiddenRootField).toBe(false);
    }
  });

  it("has no forbidden import, network, logging, timer, or concrete-adapter edge", () => {
    const sources = enginePaths.map((path) => ({
      path,
      source: readFileSync(resolve(projectRoot, path), "utf8"),
    }));
    for (const { path, source } of sources) {
      expect(forbiddenModuleEdges(source), path).toEqual([]);
      expect(prohibitedRuntimeTokens(source), path).toEqual([]);
      expect(source, path).not.toMatch(/\bclass\s+\w*OutputAdapter\b/);
      expect(source, path).not.toMatch(
        /\b(?:const|let|var)\s+\w*Adapter\s*=\s*\{/,
      );
    }

    expect(forbiddenModuleEdges('import value from "../app/view";')).toEqual([
      "../app/view",
    ]);
    expect(
      forbiddenModuleEdges('const value = require("../adapters/source");'),
    ).toEqual(["../adapters/source"]);
    expect(
      forbiddenModuleEdges('const value = import("../kernel/assertions");'),
    ).toEqual(["../kernel/assertions"]);
    expect(prohibitedRuntimeTokens('fetch("https://example.invalid")')).toEqual(
      ["fetch"],
    );
  });

  it("keeps private, provider, land, credential, telemetry, and legal claim keys absent", () => {
    const projection = createEngineProjection(
      [structuredClone(federalRecord) as PolicyRecord],
      validProfileBundle,
    );
    expect(collectForbiddenKeys(validProfileBundle)).toEqual([]);
    expect(
      collectForbiddenKeys({
        profileBundleRef: projection.profileBundleRef,
        views: projection.views,
      }),
    ).toEqual([]);
    expect(collectForbiddenKeys({ providerPayload: {} })).toEqual([
      "$profile/providerPayload",
    ]);
  });
});
