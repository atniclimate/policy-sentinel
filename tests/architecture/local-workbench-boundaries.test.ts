import { existsSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, posix, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { moduleOf } from "./module-manifest.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const ENTRIES = ["write", "failure-simulation", "loopback-server"].flatMap(
  (name) => [
    `src/modules/output/local-workbench/${name}.mjs`,
    `src/modules/output/local-workbench/${name}.d.mts`,
  ],
);
const TERMINALS = new Set([
  "src/pipeline/analyzed-corpus-v2.mjs",
  "src/pipeline/analyzed-corpus-v2.d.mts",
  "src/pipeline/hashing.mjs",
  "src/pipeline/hashing.d.mts",
]);
const BUILTINS = new Set(
  builtinModules.flatMap((name) => [name, `node:${name}`]),
);
const EXTENSIONS = [
  "",
  ".ts",
  ".tsx",
  ".mjs",
  ".d.mts",
  ".js",
  ".json",
  "/index.ts",
  "/index.mjs",
];
type ReadSource = (path: string) => string | undefined;

function edges(
  path: string,
  text: string,
): { literals: string[]; computed: boolean } {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const literals: string[] = [];
  let computed = false;
  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier
    ) {
      if (ts.isStringLiteralLike(node.moduleSpecifier))
        literals.push(node.moduleSpecifier.text);
      else computed = true;
    } else if (ts.isImportTypeNode(node)) {
      const argument = node.argument;
      if (
        ts.isLiteralTypeNode(argument) &&
        ts.isStringLiteralLike(argument.literal)
      )
        literals.push(argument.literal.text);
      else computed = true;
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    ) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteralLike(argument))
        literals.push(argument.text);
      else computed = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { literals, computed };
}

function violations(entries: readonly string[], read: ReadSource): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const pending = [...entries];
  while (pending.length) {
    const path = pending.pop()!;
    if (seen.has(path)) continue;
    seen.add(path);
    if (
      moduleOf(path) === "intake" ||
      path.startsWith("scripts/") ||
      /^src\/pipeline\/policy-local-output\.(mjs|d\.mts)$/.test(path)
    ) {
      found.push(`FORBIDDEN_TARGET:${path}`);
      continue;
    }
    if (TERMINALS.has(path) || path.endsWith(".json")) continue;
    const text = read(path);
    if (text === undefined) {
      found.push(`MISSING_SOURCE:${path}`);
      continue;
    }
    const parsed = edges(path, text);
    if (parsed.computed) found.push(`COMPUTED_IMPORT:${path}`);
    for (const specifier of parsed.literals) {
      if (specifier === "module" || specifier === "node:module") {
        found.push(`FORBIDDEN_LOADER_IMPORT:${path}:${specifier}`);
        continue;
      }
      if (BUILTINS.has(specifier)) continue;
      if (!specifier.startsWith(".")) {
        // The new closure uses no package dependencies; unknown loaders fail closed.
        found.push(`UNREVIEWED_IMPORT:${path}:${specifier}`);
        continue;
      }
      const target = posix.normalize(
        posix.join(dirname(path).replaceAll("\\", "/"), specifier),
      );
      if (target.startsWith("../") || target.startsWith("/")) {
        found.push(`PATH_ESCAPE:${path}:${specifier}`);
        continue;
      }
      const resolved = EXTENSIONS.map((extension) => target + extension).find(
        (candidate) =>
          TERMINALS.has(candidate) || read(candidate) !== undefined,
      );
      if (!resolved) found.push(`UNRESOLVED_IMPORT:${path}:${specifier}`);
      else pending.push(resolved);
    }
  }
  return found.sort();
}

const fixture = (sources: Record<string, string>) => (path: string) =>
  sources[path];

describe("GD-06 local workbench import boundary", () => {
  it("checks all three actual output entries and declarations transitively", () => {
    const read: ReadSource = (path) => {
      const absolute = resolve(ROOT, path);
      return existsSync(absolute) ? readFileSync(absolute, "utf8") : undefined;
    };
    expect(violations(ENTRIES, read)).toEqual([]);
  });
  it("rejects direct intake and custody imports", () => {
    const sources = fixture({
      "src/modules/output/local-workbench/write.mjs":
        'export * from "../../intake/replay.mjs"; import "../../../pipeline/policy-custody.mjs";',
      "src/modules/intake/replay.mjs": "",
      "src/pipeline/policy-custody.mjs": "",
    });
    expect(violations([ENTRIES[0]!], sources)).toEqual([
      "FORBIDDEN_TARGET:src/modules/intake/replay.mjs",
      "FORBIDDEN_TARGET:src/pipeline/policy-custody.mjs",
    ]);
  });
  it("follows unclassified and core wrappers rather than trusting a prefix", () => {
    for (const wrapper of ["src/utility.mjs", "src/core/wrapper.mjs"]) {
      const sources = fixture({
        "src/modules/output/local-workbench/write.mjs": `import "../../../${wrapper.slice(4)}";`,
        [wrapper]: 'export * from "./pipeline/policy-custody.mjs";'.replace(
          "./pipeline",
          wrapper.startsWith("src/core/") ? "../pipeline" : "./pipeline",
        ),
        "src/pipeline/policy-custody.mjs": "",
      });
      expect(violations([ENTRIES[0]!], sources)).toContain(
        "FORBIDDEN_TARGET:src/pipeline/policy-custody.mjs",
      );
    }
  });
  it("rejects composition and compatibility-shim bypasses", () => {
    const sources = fixture({
      "src/modules/output/local-workbench/write.mjs":
        'import "../../../../scripts/policy-local-output.mjs"; export * from "../../../pipeline/policy-local-output.mjs";',
      "scripts/policy-local-output.mjs": "",
      "src/pipeline/policy-local-output.mjs": "",
    });
    expect(violations([ENTRIES[0]!], sources)).toEqual([
      "FORBIDDEN_TARGET:scripts/policy-local-output.mjs",
      "FORBIDDEN_TARGET:src/pipeline/policy-local-output.mjs",
    ]);
  });
  it("accepts reviewed core terminals and terminates cycles", () => {
    const sources = fixture({
      "src/modules/output/local-workbench/write.mjs":
        'import "../../../core/a.mjs"; import "../../../pipeline/hashing.mjs";',
      "src/core/a.mjs": 'export * from "./b.mjs";',
      "src/core/b.mjs":
        'export * from "./a.mjs"; import "../pipeline/analyzed-corpus-v2.mjs";',
    });
    expect(violations([ENTRIES[0]!], sources)).toEqual([]);
  });
  it("rejects loader builtins that can conceal aliased custody loading", () => {
    for (const specifier of ["module", "node:module"]) {
      const sources = fixture({
        "src/modules/output/local-workbench/write.mjs":
          'import "../../../core/wrapper.mjs";',
        "src/core/wrapper.mjs": `import { createRequire } from "${specifier}"; const load = createRequire(import.meta.url); load("../modules/intake/replay.mjs");`,
      });
      expect(violations([ENTRIES[0]!], sources)).toEqual([
        `FORBIDDEN_LOADER_IMPORT:src/core/wrapper.mjs:${specifier}`,
      ]);
    }
  });
  it("rejects computed loading and unresolved or unreviewed imports", () => {
    for (const text of [
      "import(target);",
      "require(target);",
      'import "./missing.mjs";',
      'import "unreviewed-package";',
    ]) {
      expect(
        violations([ENTRIES[0]!], fixture({ [ENTRIES[0]!]: text })),
      ).not.toEqual([]);
    }
  });
});
