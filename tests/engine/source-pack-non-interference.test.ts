import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

import validGeographyRightsBundle from "../../fixtures/engine/geography-rights.synthetic.valid.json";
import validProfileBundle from "../../fixtures/engine/projection-profiles.synthetic.valid.json";
import validSourcePackBundle from "../../fixtures/engine/source-pack.synthetic.valid.json";
import validTaxonomyBundle from "../../fixtures/engine/taxonomy.synthetic.valid.json";
import federalRecord from "../../fixtures/records/general-jurisdiction.valid.json";
import geographyRightsSchema from "../../schemas/geography-rights.schema.v1.json";
import projectionProfileSchema from "../../schemas/projection-profile.schema.v1.json";
import taxonomyBundleSchema from "../../schemas/taxonomy-bundle.schema.v1.json";
import {
  createEngineProjection,
  createGeographyRightsProjection,
  createSourcePackAdmissionPlan,
  parseGeographyRightsBundle,
  parseProjectionProfileBundle,
  parseTaxonomyBundle,
  serializeEngineProjection,
  serializeGeographyRightsProjection,
  serializeSourcePackAdmissionPlan,
} from "../../src/engine";
import type { SourcePackAdmissionRequest } from "../../src/engine";
import type { PolicyRecord } from "../../src/shared/contracts";

const projectRoot = resolve(import.meta.dirname, "../..");
const sourcePackEnginePaths = [
  "src/engine/source-pack-contracts.ts",
  "src/engine/source-pack.ts",
  "scripts/source-pack.ts",
  "scripts/configured-engine.ts",
  "src/core/projection.ts",
  "src/modules/context/geography-rights.ts",
  "src/modules/context/taxonomy.ts",
] as const;

const ordinal = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
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
    ].sort(ordinal);
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

const publicRequest: SourcePackAdmissionRequest = {
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

function publicPlan(bundle: unknown = validSourcePackBundle): string {
  return serializeSourcePackAdmissionPlan(
    createSourcePackAdmissionPlan(
      sourcePackProfile(),
      bundle,
      publicRequest,
      predecessorBundles(),
    ),
  );
}

function forbiddenModuleEdges(source: string): string[] {
  const sourceFile = ts.createSourceFile(
    "source-pack.ts",
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

function collectForbiddenKeys(value: unknown, path = "$sourcePack"): string[] {
  const forbidden = new Set([
    "apiKey",
    "authorizationHeader",
    "body",
    "cache",
    "callback",
    "contact",
    "credentials",
    "cursor",
    "email",
    "endpoint",
    "headers",
    "land",
    "lastKnownGood",
    "legalEffect",
    "name",
    "organization",
    "parcel",
    "payload",
    "person",
    "privateData",
    "provider",
    "rawResponse",
    "records",
    "refresh",
    "retry",
    "secret",
    "telemetry",
    "termsUrl",
    "token",
    "url",
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

function artifactInventory(directory: string): string[] {
  const files: string[] = [];
  const visit = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else {
        const bytes = readFileSync(absolute);
        files.push(
          `${relative(directory, absolute).replaceAll("\\", "/")}:${bytes.length}:${createHash("sha256").update(bytes).digest("hex")}`,
        );
      }
    }
  };
  visit(directory);
  return files.sort(ordinal);
}

describe("source-pack non-interference and disclosure boundaries", () => {
  it("keeps accepted PNW-01, PNW-03, and PNW-04 fixtures and schemas byte-pinned", () => {
    expect(digest(validProfileBundle)).toBe(
      "c3680bd1c427ac43c743efd4e2acb9cac2bbd948330f1e0b391c350dbd2fb814",
    );
    expect(digest(validGeographyRightsBundle)).toBe(
      "5a3c514e4736ce05031ed4dadc95b8f9626869dc1081ccd9c8cd8f08fb6bc328",
    );
    expect(digest(validTaxonomyBundle)).toBe(
      "adf060ae9ccd1614369e609c9829983471ec5917ee1d9a7461f7c6ed11a0be20",
    );
    expect(digest(projectionProfileSchema)).toBe(
      "0f56b6c739cf4018f79e632e4330f47c13853b0547eaf18d02d5063a0954bee6",
    );
    expect(digest(geographyRightsSchema)).toBe(
      "59507ee6eded08ba347493d31f1f7e76bd4f65228ab4f2b7db2c55e206d10ca0",
    );
    expect(digest(taxonomyBundleSchema)).toBe(
      "500bb1533369a46972f5c2467f509e61cc35a51dcbf3a4ffeb6d7ed70c6f9c90",
    );
  });

  it("preserves predecessor behavior and input bytes before and after planning", () => {
    const record = structuredClone(federalRecord) as PolicyRecord;
    const engineBefore = serializeEngineProjection(
      createEngineProjection([record], validProfileBundle),
    );
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
    const geographyBefore = serializeGeographyRightsProjection(
      createGeographyRightsProjection(
        validProfileBundle,
        validGeographyRightsBundle,
        geographyRequest,
      ),
    );
    const taxonomyBefore = JSON.stringify(
      parseTaxonomyBundle(validTaxonomyBundle),
    );
    const fixtureBytes = [
      JSON.stringify(validProfileBundle),
      JSON.stringify(validGeographyRightsBundle),
      JSON.stringify(validTaxonomyBundle),
    ];

    publicPlan();

    expect(
      serializeEngineProjection(
        createEngineProjection([record], validProfileBundle),
      ),
    ).toBe(engineBefore);
    expect(
      serializeGeographyRightsProjection(
        createGeographyRightsProjection(
          validProfileBundle,
          validGeographyRightsBundle,
          geographyRequest,
        ),
      ),
    ).toBe(geographyBefore);
    expect(JSON.stringify(parseTaxonomyBundle(validTaxonomyBundle))).toBe(
      taxonomyBefore,
    );
    expect([
      JSON.stringify(validProfileBundle),
      JSON.stringify(validGeographyRightsBundle),
      JSON.stringify(validTaxonomyBundle),
    ]).toEqual(fixtureBytes);
  });

  it("has no network, timer, implicit-clock, pipeline, adapter, or platform dependency edge", () => {
    const prohibitedTokens = [
      "fetch(",
      "XMLHttpRequest",
      "WebSocket",
      "EventSource",
      "sendBeacon",
      "process.env",
      "console.log",
      "setTimeout",
      "setInterval",
      "Date.now",
      "new Date()",
      "localeCompare",
    ];
    for (const path of sourcePackEnginePaths) {
      const source = readFileSync(resolve(projectRoot, path), "utf8");
      expect(forbiddenModuleEdges(source), path).toEqual([]);
      expect(
        prohibitedTokens.filter((token) => source.includes(token)),
        path,
      ).toEqual([]);
    }

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    try {
      publicPlan();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps every unauthorized byte stable across hidden add, remove, change, and reorder", () => {
    const baseline = publicPlan();
    expect(baseline).not.toContain("synthetic-state-accord");
    expect(baseline).not.toContain("synthetic-binding-state-regional");
    expect(baseline).not.toContain("synthetic-admission-state-regional");

    const removed = structuredClone(validSourcePackBundle);
    removed.sourceBindings = removed.sourceBindings.filter(
      ({ id }) => id !== "synthetic-binding-state-regional",
    );
    removed.deploymentBindings[0]!.sourceBindingRefs =
      removed.deploymentBindings[0]!.sourceBindingRefs.filter(
        ({ id }) => id !== "synthetic-binding-state-regional",
      );
    removed.admissionReceipts = removed.admissionReceipts.filter(
      ({ id }) => id !== "synthetic-admission-state-regional",
    );
    removed.coverageDeclarations = removed.coverageDeclarations.filter(
      ({ id }) => id !== "synthetic-coverage-state-regional",
    );
    removed.authorityBindings = removed.authorityBindings.filter(
      ({ id }) => id !== "synthetic-authority-state-regional",
    );
    removed.evidenceReceipts = removed.evidenceReceipts.filter(
      ({ id }) =>
        id !== "synthetic-evidence-state-regional-coverage" &&
        id !== "synthetic-evidence-state-regional-authority",
    );
    removed.configurationAuthorityBindingRefs =
      removed.configurationAuthorityBindingRefs.filter(
        ({ id }) => id !== "synthetic-authority-state-regional",
      );
    removed.reviewAttestations = removed.reviewAttestations.filter(
      ({ id }) => !id.startsWith("synthetic-review-state-regional-"),
    );
    removed.availabilityObservations = removed.availabilityObservations.filter(
      ({ id }) => !id.startsWith("synthetic-availability-state-regional-"),
    );
    removed.healthObservations = removed.healthObservations.filter(
      ({ id }) => !id.startsWith("synthetic-health-state-regional-"),
    );

    const changed = structuredClone(validSourcePackBundle);
    changed.version = "2.0.0";
    changed.admissionReceipts.find(
      ({ id }) => id === "synthetic-admission-state-regional",
    )!.state = "not_admitted";

    const added = structuredClone(validSourcePackBundle);
    const hidden = structuredClone(
      added.sourceBindings.find(
        ({ id }) => id === "synthetic-binding-state-regional",
      )!,
    );
    hidden.id = "synthetic-binding-state-regional-copy";
    added.sourceBindings.push(hidden);
    added.deploymentBindings[0]!.sourceBindingRefs.push({
      kind: "source_binding",
      id: hidden.id,
      version: hidden.version,
    });

    const reordered = structuredClone(validSourcePackBundle);
    reordered.sourceBindings.reverse();
    reordered.deploymentBindings[0]!.sourceBindingRefs.reverse();

    for (const candidate of [removed, changed, added, reordered]) {
      expect(publicPlan(candidate)).toBe(baseline);
    }
    expect(JSON.parse(baseline)).not.toHaveProperty("sourcePackBundleRef");
  });

  it("emits only constant opaque gaps when every binding is above disclosure", () => {
    const hiddenOnly = structuredClone(validSourcePackBundle);
    for (const binding of hiddenOnly.sourceBindings) {
      if (
        [
          "synthetic-binding-federal-cloud",
          "synthetic-binding-county-cloud",
          "synthetic-binding-state-regional",
        ].includes(binding.id)
      ) {
        binding.visibility = "restricted";
      }
    }
    const baseline = JSON.parse(publicPlan(hiddenOnly)) as {
      eligibleBindings: unknown[];
      exclusions: unknown[];
      gaps: Array<{ state: string }>;
    };
    expect(baseline.eligibleBindings).toEqual([]);
    expect(baseline.exclusions).toEqual([]);
    expect(baseline.gaps).toHaveLength(3);
    expect(
      baseline.gaps.every(({ state }) => state === "opaque_coverage_gap"),
    ).toBe(true);

    const changedHidden = structuredClone(hiddenOnly);
    changedHidden.admissionReceipts.find(
      ({ id }) => id === "synthetic-admission-federal-cloud",
    )!.state = "revoked";
    expect(publicPlan(changedHidden)).toBe(JSON.stringify(baseline));
  });

  it("keeps the fixture neutral, closed, and free of source access or copied source truth", () => {
    const fixtureText = JSON.stringify(validSourcePackBundle);
    expect(collectForbiddenKeys(validSourcePackBundle)).toEqual([]);
    expect(
      new Set(
        validSourcePackBundle.sourceBindings.map(
          ({ source }) => source.sourceId,
        ),
      ),
    ).toEqual(
      new Set([
        "synthetic-federal",
        "synthetic-county",
        "synthetic-state-accord",
      ]),
    );
    expect(fixtureText).not.toMatch(
      /\b(?:atni|ncai|washington|oregon|idaho|alaska|montana|tribe|nation|treaty|reservation|parcel|person|email)\b/i,
    );
    expect(fixtureText).not.toMatch(
      /(?:https?:\/\/(?!policy-sentinel\.invalid)|authorization|bearer|api[_-]?key)/i,
    );
    expect(
      validSourcePackBundle.evidenceReceipts.every(
        ({ evidenceClass }) =>
          evidenceClass === "repository_authored_synthetic_test",
      ),
    ).toBe(true);
  });

  it("produces identical fixed-time artifact inventories without source-pack markers", () => {
    const ignoredArtifactRoot = resolve(projectRoot, "dist");
    mkdirSync(ignoredArtifactRoot, { recursive: true });
    const temporaryRoot = mkdtempSync(
      join(ignoredArtifactRoot, "pnw05-artifact-"),
    );
    const first = join(temporaryRoot, "first");
    const second = join(temporaryRoot, "second");
    const script = resolve(projectRoot, "scripts/build-synthetic-artifact.mjs");
    const run = (output: string) =>
      execFileSync(
        process.execPath,
        [script, "--out", output, "--generated-at", "2026-09-02T00:00:00Z"],
        { cwd: projectRoot, encoding: "utf8" },
      );
    try {
      run(first);
      run(second);
      expect(artifactInventory(first)).toEqual(artifactInventory(second));
      const combined = artifactInventory(first)
        .map((entry) => entry.split(":", 1)[0]!)
        .map((path) => readFileSync(resolve(first, path), "utf8"))
        .join("\n");
      for (const marker of [
        "synthetic-governed-source-pack",
        "sourcePackBundleRef",
        "synthetic-binding-",
        "synthetic-admission-",
        "synthetic-slot-",
        '"gaps"',
        "opaque_coverage_gap",
      ]) {
        expect(combined).not.toContain(marker);
      }
    } finally {
      const resolvedTemporaryRoot = resolve(temporaryRoot);
      expect(resolvedTemporaryRoot.startsWith(`${ignoredArtifactRoot}\\`)).toBe(
        true,
      );
      rmSync(resolvedTemporaryRoot, { recursive: true, force: true });
    }
  });
});
