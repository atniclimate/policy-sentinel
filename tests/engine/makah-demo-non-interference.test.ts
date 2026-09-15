import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import validBoundaryFixture from "../../fixtures/engine/land-boundary.synthetic.valid.json";
import validParcelFixture from "../../fixtures/engine/land-parcel.synthetic.valid.json";
import validExportFixture from "../../fixtures/engine/citation-export.synthetic.valid.json";
import federalRecord from "../../fixtures/records/general-jurisdiction.valid.json";
import recordSchema from "../../schemas/record.schema.v1.json";
import {
  parseLandParcel,
  type LandParcel,
} from "../../src/engine/land-parcel-contracts";
import { resolveParcelQuery } from "../../src/engine/parcel-query";
import type { PolicyRecord } from "../../src/shared/contracts";

const projectRoot = resolve(import.meta.dirname, "../..");
const enginePaths = [
  "src/engine/land-boundary-contracts.ts",
  "src/engine/land-parcel-contracts.ts",
  "src/engine/citation-export-contracts.ts",
  "src/engine/parcel-query.ts",
  "src/engine/authorized-private-context-adapter.ts",
] as const;

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

function findFilesRecursively(
  dir: string,
  extensions: readonly string[],
): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      return findFilesRecursively(full, extensions);
    }
    return extensions.some((ext) => entry.name.endsWith(ext)) ? [full] : [];
  });
}

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

const FICTION_REGEX_WITH_PARCEL =
  /\b(?:atni|ncai|washington|oregon|idaho|alaska|montana|makah|clallam|jefferson|treaty|tribe|parcel|latitude|longitude|geojson)\b/i;
const FICTION_REGEX_WITHOUT_PARCEL =
  /\b(?:atni|ncai|washington|oregon|idaho|alaska|montana|makah|clallam|jefferson|treaty|tribe|latitude|longitude|geojson)\b/i;

describe("Makah demo non-interference boundaries", () => {
  it("has no forbidden import edge or prohibited runtime token in the five engine modules", () => {
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
    }
  });

  it("keeps the private engine modules out of the public artifact builder", () => {
    const builder = readFileSync(
      resolve(projectRoot, "scripts/build-synthetic-artifact.mjs"),
      "utf8",
    );
    expect(builder).not.toContain("land-boundary");
    expect(builder).not.toContain("land-parcel");
    expect(builder).not.toContain("citation-export");
    expect(builder).not.toContain("parcel-query");
    expect(builder).not.toContain("private-context");
    expect(builder).not.toContain("fixtures/engine");
  });

  it("keeps src/app and src/pipeline free of any reference to the private engine modules", () => {
    const forbiddenStrings = [
      "land-boundary",
      "land-parcel",
      "citation-export",
      "parcel-query",
      "authorized-private-context",
    ];
    const files = [
      ...findFilesRecursively(resolve(projectRoot, "src/app"), [
        ".ts",
        ".tsx",
        ".mjs",
      ]),
      ...findFilesRecursively(resolve(projectRoot, "src/pipeline"), [
        ".ts",
        ".tsx",
        ".mjs",
      ]),
    ];
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const hits = forbiddenStrings.filter((token) => source.includes(token));
      expect(hits, file).toEqual([]);
    }
  });

  it("keeps the three new fixtures free of forbidden keys, stray numbers, and real-place words", () => {
    expect(collectForbiddenKeys(validBoundaryFixture)).toEqual([]);
    expect(collectForbiddenKeys(validParcelFixture)).toEqual([]);
    expect(collectForbiddenKeys(validExportFixture)).toEqual([]);

    expect(collectNumbers(validBoundaryFixture)).toEqual([]);
    expect(collectNumbers(validParcelFixture)).toEqual([]);
    const exportNumbers = collectNumbers(validExportFixture);
    const layerIndexes = validExportFixture.records
      .map((record) => record.whyAssociated?.layerIndex)
      .filter((value): value is number => typeof value === "number");
    expect(exportNumbers.sort()).toEqual(layerIndexes.sort());
    expect(exportNumbers.every((value) => Number.isInteger(value))).toBe(true);

    expect(JSON.stringify(validBoundaryFixture)).not.toMatch(
      FICTION_REGEX_WITH_PARCEL,
    );
    expect(JSON.stringify(validParcelFixture)).not.toMatch(
      FICTION_REGEX_WITHOUT_PARCEL,
    );
    expect(JSON.stringify(validExportFixture)).not.toMatch(
      FICTION_REGEX_WITHOUT_PARCEL,
    );
  });

  it("keeps the retained PolicyRecord 1.4 schema closed to the new private-context fields", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validateRecord = ajv.compile(recordSchema);
    expect(validateRecord(federalRecord)).toBe(true);

    for (const forbiddenRootField of [
      "parcelId",
      "jurisdictionLayers",
      "landStatusTypes",
      "whyAssociated",
      "publicPhone",
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

  it("keeps every PolicyRecord fact family byte-identical across resolveParcelQuery", () => {
    const parcel = parseLandParcel(
      structuredClone(validParcelFixture) as unknown as LandParcel,
    );
    const record = structuredClone(federalRecord) as PolicyRecord;
    const before = canonical(factClosure(record));
    const recordBefore = JSON.stringify(record);

    resolveParcelQuery(parcel, [record]);

    expect(canonical(factClosure(record))).toBe(before);
    expect(JSON.stringify(record)).toBe(recordBefore);
  });
});
