import { resolve } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
  ALLOWLISTED_VIOLATIONS,
  LEGACY_FACADE_BINDINGS,
  LOCAL_ENTRY_PATHS,
  PUBLIC_ENTRY_PATHS,
  isCompositionDeclaration,
  isCompositionRoot,
  isForbiddenFromPublicEntry,
  moduleOf,
} from "./module-manifest.mjs";
import {
  REPOSITORY_SCAN_ROOTS,
  analyzeModuleBoundaries,
  readRepositoryFiles,
  validateLegacyFacade,
  walkRepositoryReachable,
} from "./module-graph";

const REPO_ROOT = resolve(import.meta.dirname, "../..");

let files: ReadonlyMap<string, string>;
beforeAll(() => {
  files = readRepositoryFiles(REPO_ROOT);
});

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
    expect(moduleOf("src/local-main.tsx")).toBe("output");
    expect(moduleOf("src/modules/output/anything.mjs")).toBe("output");
    expect(moduleOf("demo/main.tsx")).toBe("output");
    expect(moduleOf("demo/app/anything.tsx")).toBe("output");
    expect(moduleOf("worker/src/index.ts")).toBe("intake");
    expect(moduleOf("worker/src/sources/anything.ts")).toBe("intake");
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
      "src/local-main.tsx",
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
    expect(
      Object.values(LEGACY_FACADE_BINDINGS).map((bindings) => bindings.length),
    ).toEqual([12, 34, 5, 7, 5, 5, 5, 6, 79, 40, 33, 36]);
    for (const path of Object.keys(LEGACY_FACADE_BINDINGS)) {
      expect(validateLegacyFacade(files, path), path).toEqual([]);
    }
  });

  // This integration test parses and walks the whole repository graph.
  it("enforces the actual graph without substantive import exceptions", () => {
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
  }, 15_000);
});

describe("Public-entry reachability (no facade or composition exemptions)", () => {
  it("scans and enters the public page, the demo page and the Worker", () => {
    expect(REPOSITORY_SCAN_ROOTS).toEqual(
      expect.arrayContaining(["src", "scripts", "demo", "worker"]),
    );
    expect(PUBLIC_ENTRY_PATHS).toEqual(
      expect.arrayContaining([
        "src/main.tsx",
        "scripts/build-synthetic-artifact.mjs",
        "demo/main.tsx",
        "worker/src/index.ts",
      ]),
    );
  });

  it("never reaches private implementations, their barrel or the local entry", () => {
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

describe("Local workbench entry (design section 1 rule 9)", () => {
  it("is local-only and unreachable from the public page, demo page and Worker", () => {
    expect(LOCAL_ENTRY_PATHS).toEqual(["src/local-main.tsx"]);
    for (const entry of LOCAL_ENTRY_PATHS) {
      expect(files.has(entry), entry).toBe(true);
      expect(PUBLIC_ENTRY_PATHS, entry).not.toContain(entry);
      expect(isForbiddenFromPublicEntry(entry), entry).toBe(true);
    }
    for (const entry of [
      "src/main.tsx",
      "demo/main.tsx",
      "worker/src/index.ts",
    ])
      expect(
        walkRepositoryReachable(files, [entry]).paths,
        entry,
      ).not.toContain("src/local-main.tsx");
  });

  it("carries the workbench and its local loader, which the public page does not", () => {
    const local = walkRepositoryReachable(files, ["src/local-main.tsx"]).paths;
    const publicPage = walkRepositoryReachable(files, ["src/main.tsx"]).paths;
    for (const path of [
      "src/app/PolicyWorkbench.tsx",
      "src/app/policy-local-loader.ts",
    ]) {
      expect(local, path).toContain(path);
      expect(publicPage, path).not.toContain(path);
    }
  });
});
