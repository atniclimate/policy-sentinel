import { readFileSync, readdirSync } from "node:fs";
import { extname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ALLOWLISTED_VIOLATIONS,
  LEGACY_FACADE_BINDINGS,
  PUBLIC_ENTRY_PATHS,
  isCompositionDeclaration,
  isCompositionRoot,
  isForbiddenFromPublicEntry,
  moduleOf,
} from "./module-manifest.mjs";
import {
  analyzeModuleBoundaries,
  validateLegacyFacade,
  walkRepositoryReachable,
} from "./module-graph";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const SCAN_ROOTS = ["src", "config", "schemas", "scripts", "fixtures"] as const;
const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
  ".js",
  ".jsx",
]);

function repositoryFiles(): ReadonlyMap<string, string> {
  const files = new Map<string, string>();
  function walk(directory: string): void {
    for (const entry of readdirSync(resolve(REPO_ROOT, directory), {
      withFileTypes: true,
    })) {
      const path = directory + "/" + entry.name;
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile())
        files.set(
          path,
          SOURCE_EXTENSIONS.has(extname(path))
            ? readFileSync(resolve(REPO_ROOT, path), "utf8")
            : "",
        );
    }
  }
  for (const directory of SCAN_ROOTS) walk(directory);
  return files;
}

describe("Module boundary dependency rule (enforced, GD-10)", () => {
  it("classifies the declared module members and the four new prefixes correctly", () => {
    expect(moduleOf("src/shared/contracts.ts")).toBe("core");
    expect(moduleOf("schemas/record.schema.v1.json")).toBe("core");
    expect(moduleOf("src/core/anything.mjs")).toBe("core");
    expect(moduleOf("src/adapters/bia/index.ts")).toBe("intake");
    expect(moduleOf("src/contracts/congress/index.ts")).toBe("intake");
    expect(moduleOf("src/modules/intake/anything.mjs")).toBe("intake");
    expect(moduleOf("config/sources.v1.json")).toBe("intake");
    expect(moduleOf("src/engine/taxonomy.ts")).toBe("context");
    expect(moduleOf("src/modules/context/anything.ts")).toBe("context");
    expect(moduleOf("config/taxonomy.v1.json")).toBe("context");
    expect(moduleOf("src/app/App.tsx")).toBe("output");
    expect(moduleOf("src/main.tsx")).toBe("output");
    expect(moduleOf("src/modules/output/anything.mjs")).toBe("output");
    expect(moduleOf("src/engine/land-boundary-contracts.ts")).toBe("private");
    expect(moduleOf("src/engine/land-parcel-contracts.ts")).toBe("private");
    expect(moduleOf("src/engine/parcel-query.ts")).toBe("private");
    expect(moduleOf("src/engine/authorized-private-context-adapter.ts")).toBe(
      "private",
    );
    expect(moduleOf("src/engine/citation-export-contracts.ts")).toBe("private");
    expect(moduleOf("src/modules/private/anything.ts")).toBe("private");
    expect(moduleOf("src/kernel/lifecycle/index.ts")).toBeNull();
    expect(moduleOf("src/experimental/spatial/observation.ts")).toBeNull();
    expect(moduleOf("src/knowledge/schema.mjs")).toBeNull();
    expect(
      moduleOf("schemas/experimental/spatial-observation.schema.v1.json"),
    ).toBeNull();
    expect(moduleOf("src/engine/index.ts")).toBeNull();
    expect(moduleOf("src/pipeline/policy-local-output.mjs")).toBeNull();
    expect(moduleOf("src/pipeline/policy-research-output.mjs")).toBeNull();
  });

  it("recognizes only reviewed TypeScript roots and separate composition declarations", () => {
    for (const path of [
      "scripts/configured-engine.ts",
      "scripts/configured-source-refresh.ts",
      "scripts/source-pack.ts",
      "scripts/build-synthetic-artifact.mjs",
      "src/main.tsx",
    ])
      expect(isCompositionRoot(path), path).toBe(true);
    expect(isCompositionRoot("scripts/unreviewed.ts")).toBe(false);
    expect(isCompositionRoot("scripts/configured-analyzed-corpus.d.mts")).toBe(
      false,
    );
    expect(
      isCompositionDeclaration("scripts/configured-analyzed-corpus.d.mts"),
    ).toBe(true);
  });

  it("freezes legacy exports against the pre-refactor inventory", () => {
    const files = repositoryFiles();
    expect(
      Object.values(LEGACY_FACADE_BINDINGS).map((bindings) => bindings.length),
    ).toEqual([12, 34, 5, 7, 5, 5, 5, 6, 79, 40, 33, 36]);
    for (const path of Object.keys(LEGACY_FACADE_BINDINGS)) {
      expect(validateLegacyFacade(files, path), path).toEqual([]);
    }
  });

  it("enforces the actual graph without substantive import exceptions", () => {
    const files = repositoryFiles();
    const result = analyzeModuleBoundaries(files);
    expect(ALLOWLISTED_VIOLATIONS).toEqual([]);
    expect(result.checkedEdges).toBeGreaterThan(0);
    console.log(
      "module-boundaries (strict): " +
        String(result.checkedEdges) +
        " classified edges checked; " +
        String(result.violations.length) +
        " violations; " +
        String(result.diagnostics.length) +
        " diagnostics.",
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.violations).toEqual([]);
  });
});

describe("Public-entry reachability (no facade or composition exemptions)", () => {
  it("never reaches private implementations or their barrel", () => {
    const files = repositoryFiles();
    expect(PUBLIC_ENTRY_PATHS.length).toBeGreaterThan(0);
    for (const entry of PUBLIC_ENTRY_PATHS) {
      expect(files.has(entry), entry).toBe(true);
      const result = walkRepositoryReachable(files, [entry]);
      const forbidden = result.paths.filter(isForbiddenFromPublicEntry);
      console.log(
        "module-boundaries (reachability): " +
          entry +
          " walked " +
          String(result.paths.length) +
          " files; " +
          String(forbidden.length) +
          " forbidden.",
      );
      expect(result.diagnostics, entry).toEqual([]);
      expect(forbidden, entry).toEqual([]);
    }
  });
});
