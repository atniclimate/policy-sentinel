import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import registry from "../../config/sources.v1.json";
import taxonomy from "../../config/taxonomy.v1.json";
import fixture from "../../fixtures/engine/identity-authority-scenarios.synthetic.valid.json";
import profile from "../../fixtures/engine/projection-profiles.synthetic.valid.json";
import record from "../../fixtures/records/general-jurisdiction.valid.json";
import {
  createEngineProjection,
  serializeEngineProjection,
} from "../../src/engine";
import { IDENTITY_AUTHORITY_SCENARIOS_NONCLAIMS } from "../../src/engine/identity-authority-scenarios-contracts";
import {
  evaluateIdentityAuthorityScenarios,
  parseIdentityAuthorityScenariosBundle,
  serializeIdentityAuthorityScenariosBundle,
} from "../../src/engine/identity-authority-scenarios";
import {
  createArtifactDocuments,
  generateSyntheticNations,
} from "../../src/pipeline/artifact.mjs";
import type {
  PolicyRecord,
  SourceRegistry,
  TaxonomyConfig,
} from "../../src/shared/contracts";

const root = resolve(import.meta.dirname, "../..");
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const ref = (item: {
  kind: "scenario";
  namespaceId: string;
  id: string;
  version: string;
}) => ({
  kind: item.kind,
  namespaceId: item.namespaceId,
  id: item.id,
  version: item.version,
});
const enginePaths = [
  "src/engine/identity-authority-scenarios.ts",
  "src/engine/identity-authority-scenarios-contracts.ts",
] as const;

describe("identity authority scenario non-interference", () => {
  it("leaves equal-generation canonical corpus and retained artifact documents byte-identical", async () => {
    // The retained .mjs test seam has no TypeScript declaration. Use its public
    // exports through a bounded local module URL; no corpus-root operation runs.
    const localModuleUrl = pathToFileURL(
      resolve(root, "src/pipeline/synthetic-corpus-path.mjs"),
    ).href;
    const corpus = (await import(localModuleUrl)) as {
      syntheticCorpusFixtures(): PolicyRecord[];
      createSyntheticApplicationCorpus(input: {
        records: PolicyRecord[];
        registry: unknown;
        configuredTaxonomy: unknown;
        generatedAt: string;
      }): unknown;
      syntheticApplicationRecords(input: unknown): PolicyRecord[];
    };
    const records = corpus.syntheticCorpusFixtures();
    const hashingModuleUrl = pathToFileURL(
      resolve(root, "src/pipeline/hashing.mjs"),
    ).href;
    const { serializeJson } = (await import(hashingModuleUrl)) as {
      serializeJson(value: unknown): string;
    };
    const settings = {
      registry,
      configuredTaxonomy: taxonomy,
      generatedAt: "2026-09-04T18:00:00Z",
    };
    // File write order may differ after corpus sorting. Compare paths in a
    // fixed order while preserving every document's exact serialized content.
    const artifact = (recordsForBuild: PolicyRecord[]) =>
      [
        ...createArtifactDocuments({
          records: recordsForBuild,
          nations: generateSyntheticNations(),
          taxonomy: taxonomy as unknown as TaxonomyConfig,
          sourceRegistry: registry as unknown as SourceRegistry,
          generatedAt: settings.generatedAt,
          synthetic: true,
        }).entries(),
      ].sort(([left], [right]) => left.localeCompare(right));
    const artifactBytes = (documents: [string, unknown][]) =>
      documents.map(([path, document]) => [path, serializeJson(document)]);
    const beforeInputs = digest({ records, registry, taxonomy, profile });
    const corpusBefore = corpus.createSyntheticApplicationCorpus({
      ...settings,
      records,
    });
    const artifactBefore = artifact(
      corpus.syntheticApplicationRecords(corpusBefore),
    );
    const retainedBefore = serializeEngineProjection(
      createEngineProjection(
        [structuredClone(record) as unknown as PolicyRecord],
        profile,
      ),
    );
    const parsed = parseIdentityAuthorityScenariosBundle(fixture);
    for (const scenario of parsed.scenarios) {
      const evaluation = evaluateIdentityAuthorityScenarios(parsed, {
        scenarioRef: ref(scenario),
        asOf: "3785-06-30T00:00:00Z",
        citations: [],
      });
      expect(evaluation).not.toHaveProperty("records");
      expect(evaluation).not.toHaveProperty("sourceHealth");
      expect(evaluation).not.toHaveProperty("taxonomy");
      expect(evaluation).not.toHaveProperty("whyShown");
      expect(evaluation).not.toHaveProperty("lifecycle");
    }
    const corpusAfter = corpus.createSyntheticApplicationCorpus({
      ...settings,
      records,
    });
    expect(JSON.stringify(corpusAfter)).toBe(JSON.stringify(corpusBefore));
    expect(
      artifactBytes(artifact(corpus.syntheticApplicationRecords(corpusAfter))),
    ).toEqual(artifactBytes(artifactBefore));
    expect(artifactBytes(artifact(records))).toEqual(
      artifactBytes(artifactBefore),
    );
    expect(digest({ records, registry, taxonomy, profile })).toBe(beforeInputs);
    expect(
      serializeEngineProjection(
        createEngineProjection(
          [structuredClone(record) as unknown as PolicyRecord],
          profile,
        ),
      ),
    ).toBe(retainedBefore);
    expect(
      artifactBefore.find(([path]) => path === "manifest.json")?.[1],
    ).toMatchObject({ recordCount: 3, synthetic: true });
    expect(generateSyntheticNations()).toHaveLength(575);
  });

  it("has no protected-family import, dynamic code, I/O, timers, telemetry or source call", () => {
    const forbidden = [
      "/app/",
      "/adapters/",
      "/pipeline/",
      "/kernel/",
      "/experimental/",
      "node:",
      "k0",
      "s0",
      "o0",
    ];
    const found: string[] = [];
    for (const path of enginePaths) {
      const text = readFileSync(resolve(root, path), "utf8");
      const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
      const inspect = (node: ts.Node) => {
        if (
          (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
          node.moduleSpecifier !== undefined &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const specifier = node.moduleSpecifier.text
            .replaceAll("\\", "/")
            .toLowerCase();
          if (forbidden.some((part) => specifier.includes(part)))
            found.push(specifier);
        }
        if (ts.isCallExpression(node)) {
          if (node.expression.kind === ts.SyntaxKind.ImportKeyword)
            found.push("dynamic import");
          if (
            ts.isIdentifier(node.expression) &&
            ["fetch", "eval", "require", "setTimeout", "setInterval"].includes(
              node.expression.text,
            )
          )
            found.push(node.expression.text);
        }
        ts.forEachChild(node, inspect);
      };
      inspect(ast);
      expect(text).not.toMatch(
        /\b(?:XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b|process\.env|console\./,
      );
    }
    expect(found).toEqual([]);
    for (const path of [
      "scripts/build-synthetic-artifact.mjs",
      "src/pipeline/synthetic-corpus-path.mjs",
    ]) {
      const builder = readFileSync(resolve(root, path), "utf8");
      expect(builder).not.toContain("identity-authority-scenarios");
    }
  });

  it("keeps declared synthetic evidence out of product and protected source vocabularies", () => {
    const parsed = parseIdentityAuthorityScenariosBundle(fixture);
    const bytes = serializeIdentityAuthorityScenariosBundle(parsed);
    expect(bytes).not.toMatch(
      /\b(?:Crow|Fort Peck|Fort Belknap|Duwamish|Klamath|Montana|Alaska|ATNI|NCAI)\b/i,
    );
    expect(
      parsed.documents.every((item) =>
        /^https:\/\/synthetic-[a-z0-9-]+\.invalid\//.test(item.officialUrl),
      ),
    ).toBe(true);
    const keys = (value: unknown): string[] =>
      value !== null && typeof value === "object"
        ? Object.entries(value).flatMap(([name, child]) => [
            name,
            ...keys(child),
          ])
        : [];
    const allKeys = new Set(keys(parsed));
    for (const key of [
      "rawResponse",
      "providerPayload",
      "contact",
      "email",
      "phone",
      "geometry",
      "coordinates",
      "parcel",
      "landOwnership",
      "privateData",
      "apiKey",
      "token",
      "telemetry",
      "aiSummary",
      "legalEffect",
      "rightsImpact",
    ]) {
      expect(allKeys.has(key), key).toBe(false);
    }
    expect(
      parsed.assertions.every(
        (item) => item.allowedUse === "local_synthetic_test_reference",
      ),
    ).toBe(true);
    expect(Object.isFrozen(IDENTITY_AUTHORITY_SCENARIOS_NONCLAIMS)).toBe(true);
    const before = [...IDENTITY_AUTHORITY_SCENARIOS_NONCLAIMS];
    expect(() =>
      (IDENTITY_AUTHORITY_SCENARIOS_NONCLAIMS as unknown as string[]).push(
        "forged",
      ),
    ).toThrow();
    expect(IDENTITY_AUTHORITY_SCENARIOS_NONCLAIMS).toEqual(before);
  });
});
