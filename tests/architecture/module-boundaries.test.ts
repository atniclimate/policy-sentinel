// GD-02: module manifest and import-rule test, report mode.
//
// This test is the deliverable for step GD-02
// (docs/architecture/module-boundaries.md section 9.1, amended by
// docs/architecture/general-development-addendum-2026-09-22.md section 11).
// It has two independent checks:
//
// 1. Report mode: mechanically computes every import edge between files the
//    manifest classifies into a module, and compares the resulting
//    violations of the dependency rule (design section 2; addendum
//    section 2) against the explicit allowlist in module-manifest.mjs
//    (today's entanglements, audit section 2.6). A violation not on the
//    list fails the test; an allowlist entry that no longer occurs also
//    fails the test, so the list can only shrink (GD-10 reduces it).
//
// 2. The public-entry reachability rule (addendum section 2): enforcing
//    from the start, never allowlisted. It walks the import graph from
//    src/main.tsx and scripts/build-synthetic-artifact.mjs and fails if any
//    private-module file, the private barrel (src/engine/index.ts), or any
//    file under src/modules/private/ is reachable.
//
// Imports are parsed mechanically with the TypeScript compiler's AST,
// following the approach in
// tests/experimental/spatial/non-interference-imports.test.ts: static
// import, export-from, dynamic import with a literal, and require with a
// literal. Relative specifiers are resolved including .js/.mjs/.ts/.tsx and
// .d.mts extensions and index files.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, relative, resolve as resolvePath } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import {
  ALLOWLISTED_VIOLATIONS,
  PUBLIC_ENTRY_PATHS,
  isAllowedModuleEdge,
  isForbiddenFromPublicEntry,
  moduleOf,
} from "./module-manifest.mjs";

const REPO_ROOT = resolvePath(import.meta.dirname, "../..");
const SCAN_ROOTS = Object.freeze(["src", "config", "schemas", "scripts"]);

// Files this test parses for outgoing edges (JS/TS-family sources). JSON,
// CSS and other data files are edge targets only: they carry no outgoing
// edges of their own.
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

// Extensions and index-file forms tried when resolving a relative
// specifier that has no extension of its own.
const RESOLUTION_EXTENSIONS = Object.freeze([
  ".ts",
  ".tsx",
  ".mts",
  ".d.mts",
  ".cts",
  ".mjs",
  ".cjs",
  ".js",
  ".jsx",
  ".json",
]);

interface ModuleEdge {
  readonly specifier: string;
}

interface Violation {
  readonly from: string;
  readonly to: string;
  readonly fromModule: string;
  readonly toModule: string;
}

function repoPath(absolutePath: string): string {
  return relative(REPO_ROOT, absolutePath).replaceAll("\\", "/");
}

function canonicalKey(absolutePath: string): string {
  return absolutePath.replaceAll("\\", "/").toLowerCase();
}

function scriptKindFor(filePath: string): ts.ScriptKind {
  switch (extname(filePath).toLowerCase()) {
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".js":
    case ".cjs":
    case ".mjs":
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
}

function createSource(filePath: string): ts.SourceFile {
  const text = readFileSync(filePath, "utf8");
  return ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(filePath),
  );
}

function walkFiles(
  directoryPath: string,
  extensions: ReadonlySet<string>,
): string[] {
  if (!existsSync(directoryPath)) {
    return [];
  }
  const entries = readdirSync(directoryPath, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = resolvePath(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full, extensions));
    } else if (entry.isFile() && extensions.has(extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Static import, export-from, dynamic import with a literal, and require
 * with a literal, exactly the four forms the step's constraints name.
 */
function collectLiteralEdges(sourceFile: ts.SourceFile): ModuleEdge[] {
  const edges: ModuleEdge[] = [];

  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      edges.push({ specifier: node.moduleSpecifier.text });
    } else if (ts.isCallExpression(node)) {
      const firstArgument = node.arguments[0];
      const hasLiteralFirstArgument =
        firstArgument !== undefined && ts.isStringLiteralLike(firstArgument);
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        if (hasLiteralFirstArgument) {
          edges.push({
            specifier: (firstArgument as ts.StringLiteralLike).text,
          });
        }
      } else if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require" &&
        hasLiteralFirstArgument
      ) {
        edges.push({ specifier: (firstArgument as ts.StringLiteralLike).text });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return edges;
}

function resolveSpecifier(
  specifier: string,
  importerAbsolutePath: string,
): string | null {
  const withoutQuery = specifier.split(/[?#]/u)[0] ?? "";
  if (!withoutQuery.startsWith(".") && !withoutQuery.startsWith("/")) {
    return null; // bare or package specifier: not a repository file
  }

  const base = withoutQuery.startsWith("/")
    ? resolvePath(REPO_ROOT, withoutQuery.slice(1))
    : resolvePath(dirname(importerAbsolutePath), withoutQuery);

  const candidates = [
    base,
    ...RESOLUTION_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...RESOLUTION_EXTENSIONS.map((extension) =>
      resolvePath(base, `index${extension}`),
    ),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

const classifiedSourceFiles = SCAN_ROOTS.flatMap((root) =>
  walkFiles(resolvePath(REPO_ROOT, root), SOURCE_EXTENSIONS),
).filter((file) => moduleOf(repoPath(file)) !== null);

function computeModuleViolations(): {
  violations: Violation[];
  checkedEdges: number;
} {
  const violations: Violation[] = [];
  const seen = new Set<string>();
  let checkedEdges = 0;

  for (const file of classifiedSourceFiles) {
    const fromRepoPath = repoPath(file);
    const fromModule = moduleOf(fromRepoPath);
    if (fromModule === null) {
      continue;
    }
    const sourceFile = createSource(file);
    for (const edge of collectLiteralEdges(sourceFile)) {
      const target = resolveSpecifier(edge.specifier, file);
      if (target === null) {
        continue;
      }
      const toRepoPath = repoPath(target);
      const toModule = moduleOf(toRepoPath);
      if (toModule === null) {
        continue;
      }
      checkedEdges += 1;
      if (
        !isAllowedModuleEdge({ fromModule, fromPath: fromRepoPath, toModule })
      ) {
        const key = `${fromRepoPath} -> ${toRepoPath}`;
        if (!seen.has(key)) {
          seen.add(key);
          violations.push({
            from: fromRepoPath,
            to: toRepoPath,
            fromModule,
            toModule,
          });
        }
      }
    }
  }

  return { violations, checkedEdges };
}

function walkReachable(entryAbsolutePath: string): string[] {
  const visited = new Map<string, string>();
  const queue: string[] = [entryAbsolutePath];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }
    const key = canonicalKey(current);
    if (visited.has(key)) {
      continue;
    }
    visited.set(key, current);

    if (!SOURCE_EXTENSIONS.has(extname(current).toLowerCase())) {
      continue; // JSON, CSS and similar data files carry no outgoing edges
    }
    const sourceFile = createSource(current);
    for (const edge of collectLiteralEdges(sourceFile)) {
      const target = resolveSpecifier(edge.specifier, current);
      if (target !== null) {
        queue.push(target);
      }
    }
  }

  return [...visited.values()];
}

describe("Module boundary dependency rule (report mode, GD-02)", () => {
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

  it("computes every import edge between classified files and matches exactly the audit-2.6 allowlist", () => {
    expect(classifiedSourceFiles.length).toBeGreaterThan(0);

    const { violations, checkedEdges } = computeModuleViolations();
    const violationKeys = violations
      .map((violation) => `${violation.from} -> ${violation.to}`)
      .sort();
    const allowlistKeys = ALLOWLISTED_VIOLATIONS.map(
      (entry) => `${entry.from} -> ${entry.to}`,
    ).sort();

    const notAllowlisted = violationKeys.filter(
      (key) => !allowlistKeys.includes(key),
    );
    const staleAllowlistEntries = allowlistKeys.filter(
      (key) => !violationKeys.includes(key),
    );

    console.log(
      `module-boundaries (report mode): ${String(checkedEdges)} classified-to-classified edges checked; ` +
        `${String(violations.length)} dependency-rule violations found, all on the audit-2.6 allowlist ` +
        `(${String(ALLOWLISTED_VIOLATIONS.length)} entries).`,
    );

    expect(notAllowlisted, "violation not in the allowlist").toEqual([]);
    expect(
      staleAllowlistEntries,
      "allowlist entry that no longer occurs (the list can only shrink)",
    ).toEqual([]);
    expect(violationKeys).toEqual(allowlistKeys);
  });

  it("keeps every allowlist entry a real edge between two different classified modules", () => {
    for (const entry of ALLOWLISTED_VIOLATIONS) {
      const fromModule = moduleOf(entry.from);
      const toModule = moduleOf(entry.to);
      expect(fromModule, entry.from).not.toBeNull();
      expect(toModule, entry.to).not.toBeNull();
      expect(fromModule, `${entry.from} -> ${entry.to}`).not.toBe(toModule);
      expect(existsSync(resolvePath(REPO_ROOT, entry.from)), entry.from).toBe(
        true,
      );
      expect(existsSync(resolvePath(REPO_ROOT, entry.to)), entry.to).toBe(true);
    }
  });
});

describe("Public-entry reachability rule (enforcing from the start, addendum section 2)", () => {
  it("never reaches a private-module file, the private barrel, or src/modules/private/ from a public composition root", () => {
    expect(PUBLIC_ENTRY_PATHS.length).toBeGreaterThan(0);

    for (const entryRepoPath of PUBLIC_ENTRY_PATHS) {
      const entryAbsolutePath = resolvePath(REPO_ROOT, entryRepoPath);
      expect(existsSync(entryAbsolutePath), entryRepoPath).toBe(true);

      const visitedFiles = walkReachable(entryAbsolutePath);
      const forbidden = visitedFiles
        .map(repoPath)
        .filter((path) => isForbiddenFromPublicEntry(path));

      console.log(
        `module-boundaries (reachability): ${entryRepoPath} walked ${String(visitedFiles.length)} files, ` +
          `0 forbidden.`,
      );

      expect(forbidden, `reachable from ${entryRepoPath}`).toEqual([]);
    }
  });
});
