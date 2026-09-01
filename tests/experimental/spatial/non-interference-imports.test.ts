// @vitest-environment node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, relative, resolve } from "node:path";

import { parse as parseHtml, type DefaultTreeAdapterMap } from "parse5";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "../../..");
const S0_SOURCE_ROOT = resolve(REPOSITORY_ROOT, "src/experimental/spatial");
const S0_SCHEMA_REPOSITORY_PATHS = [
  "schemas/experimental/spatial-observation.schema.v1.json",
  "schemas/experimental/spatial-relation.schema.v1.json",
  "schemas/experimental/jurisdiction-evidence.schema.v1.json",
] as const;
const S0_SCHEMA_PATHS = S0_SCHEMA_REPOSITORY_PATHS.map((repositoryPath) =>
  resolve(REPOSITORY_ROOT, repositoryPath),
);
const FOUNDATION_VALIDATOR = resolve(
  REPOSITORY_ROOT,
  "scripts/validate-foundation.mjs",
);
const K0_ASSERTION_ROOT = resolve(REPOSITORY_ROOT, "src/kernel/assertions");
const K0_PUBLIC_SEAM = resolve(K0_ASSERTION_ROOT, "index.ts");
const K0_LIFECYCLE_ROOT = resolve(REPOSITORY_ROOT, "src/kernel/lifecycle");
const TEST_RENDERER = resolve(
  REPOSITORY_ROOT,
  "tests/experimental/spatial/evidence-table-renderer.tsx",
);

const MODULE_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);

const ROOT_CONFIG_PATTERN = /\.config\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/u;
const S0_PATH_PATTERN = /(?:^|\/)experimental\/spatial(?:\/|$)/u;

const COMPILER_OPTIONS: ts.CompilerOptions = {
  allowJs: true,
  jsx: ts.JsxEmit.ReactJSX,
  jsxImportSource: "preact",
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  resolveJsonModule: true,
  target: ts.ScriptTarget.ES2023,
};

type ModuleEdgeKind =
  | "dynamic import"
  | "export"
  | "import"
  | "import equals"
  | "import type"
  | "jsx import source"
  | "reference path"
  | "reference types"
  | "require"
  | "require.resolve"
  | "type-only export"
  | "type-only import";

interface ModuleEdge {
  readonly column: number;
  readonly kind: ModuleEdgeKind;
  readonly line: number;
  readonly specifier: string | null;
}

interface BoundaryViolation {
  readonly column: number;
  readonly filePath: string;
  readonly line: number;
  readonly reason: string;
}

interface S0SchemaStringReference {
  readonly column: number;
  readonly filePath: string;
  readonly line: number;
  readonly schemaPath: (typeof S0_SCHEMA_REPOSITORY_PATHS)[number];
  readonly value: string;
}

interface HtmlInspection {
  readonly moduleScriptSources: readonly string[];
  readonly violations: readonly BoundaryViolation[];
}

interface CommentPragma {
  readonly arguments?: Readonly<Record<string, string>>;
}

type CommentPragmaValue = CommentPragma | readonly CommentPragma[];
type HtmlNode = DefaultTreeAdapterMap["node"];
type HtmlElement = DefaultTreeAdapterMap["element"];

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  return left > right ? 1 : 0;
}

function canonicalPath(filePath: string): string {
  return resolve(filePath).replaceAll("\\", "/").toLowerCase();
}

function repositoryPath(filePath: string): string {
  return relative(REPOSITORY_ROOT, filePath).replaceAll("\\", "/");
}

function pathIsWithin(filePath: string, directoryPath: string): boolean {
  const file = canonicalPath(filePath);
  const directory = canonicalPath(directoryPath);
  return file === directory || file.startsWith(`${directory}/`);
}

function walkFiles(
  directoryPath: string,
  accepts: (filePath: string) => boolean,
): string[] {
  if (!existsSync(directoryPath)) {
    return [];
  }

  const files: string[] = [];
  const entries = readdirSync(directoryPath, { withFileTypes: true }).sort(
    (left, right) => compareText(left.name, right.name),
  );
  for (const entry of entries) {
    const entryPath = resolve(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath, accepts));
    } else if (entry.isFile() && accepts(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
}

function moduleFilesBelow(directoryPath: string): string[] {
  return walkFiles(directoryPath, (filePath) =>
    MODULE_EXTENSIONS.has(extname(filePath).toLowerCase()),
  );
}

function scriptKindFor(filePath: string): ts.ScriptKind {
  switch (extname(filePath).toLowerCase()) {
    case ".js":
    case ".cjs":
    case ".mjs":
      return ts.ScriptKind.JS;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".json":
      return ts.ScriptKind.JSON;
    default:
      return ts.ScriptKind.TS;
  }
}

function createSource(filePath: string, sourceText: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(filePath),
  );
}

function literalText(value: ts.Expression | undefined): string | null {
  return value !== undefined && ts.isStringLiteralLike(value)
    ? value.text
    : null;
}

function moduleEdge(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  kind: ModuleEdgeKind,
  specifier: string | null,
): ModuleEdge {
  const position = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
  return {
    column: position.character + 1,
    kind,
    line: position.line + 1,
    specifier,
  };
}

function pragmaEntries(
  value: CommentPragmaValue | undefined,
): readonly CommentPragma[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value as CommentPragma];
}

function collectModuleEdges(sourceFile: ts.SourceFile): ModuleEdge[] {
  const edges: ModuleEdge[] = [];

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      edges.push(
        moduleEdge(
          sourceFile,
          node,
          node.importClause?.isTypeOnly === true
            ? "type-only import"
            : "import",
          ts.isStringLiteralLike(node.moduleSpecifier)
            ? node.moduleSpecifier.text
            : null,
        ),
      );
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      edges.push(
        moduleEdge(
          sourceFile,
          node,
          node.isTypeOnly ? "type-only export" : "export",
          ts.isStringLiteralLike(node.moduleSpecifier)
            ? node.moduleSpecifier.text
            : null,
        ),
      );
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      edges.push(
        moduleEdge(
          sourceFile,
          node,
          "import equals",
          literalText(node.moduleReference.expression),
        ),
      );
    } else if (ts.isImportTypeNode(node)) {
      const argument = node.argument;
      edges.push(
        moduleEdge(
          sourceFile,
          node,
          "import type",
          ts.isLiteralTypeNode(argument) &&
            ts.isStringLiteralLike(argument.literal)
            ? argument.literal.text
            : null,
        ),
      );
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        edges.push(
          moduleEdge(
            sourceFile,
            node,
            "dynamic import",
            literalText(node.arguments[0]),
          ),
        );
      } else if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require"
      ) {
        edges.push(
          moduleEdge(
            sourceFile,
            node,
            "require",
            literalText(node.arguments[0]),
          ),
        );
      } else if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "require" &&
        node.expression.name.text === "resolve"
      ) {
        edges.push(
          moduleEdge(
            sourceFile,
            node,
            "require.resolve",
            literalText(node.arguments[0]),
          ),
        );
      } else if (
        ts.isElementAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "require" &&
        literalText(node.expression.argumentExpression) === "resolve"
      ) {
        edges.push(
          moduleEdge(
            sourceFile,
            node,
            "require.resolve",
            literalText(node.arguments[0]),
          ),
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  for (const reference of sourceFile.referencedFiles) {
    edges.push(
      moduleEdge(sourceFile, sourceFile, "reference path", reference.fileName),
    );
  }
  for (const reference of sourceFile.typeReferenceDirectives) {
    edges.push(
      moduleEdge(sourceFile, sourceFile, "reference types", reference.fileName),
    );
  }

  const pragmas = (
    sourceFile as ts.SourceFile & {
      readonly pragmas?: ReadonlyMap<string, CommentPragmaValue>;
    }
  ).pragmas;
  for (const pragma of pragmaEntries(pragmas?.get("jsximportsource"))) {
    edges.push({
      column: 1,
      kind: "jsx import source",
      line: 1,
      specifier: pragma.arguments?.factory ?? null,
    });
  }

  return edges;
}

function collectS0SchemaStringReferences(
  filePath: string,
  sourceText: string,
): S0SchemaStringReference[] {
  const sourceFile = createSource(filePath, sourceText);
  const references: S0SchemaStringReference[] = [];

  function visit(node: ts.Node): void {
    if (ts.isStringLiteralLike(node)) {
      const schemaPath = s0SchemaRepositoryPath(node.text);
      if (schemaPath !== null) {
        const position = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );
        references.push({
          column: position.character + 1,
          filePath,
          line: position.line + 1,
          schemaPath,
          value: node.text,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return references;
}

function containsJsx(sourceFile: ts.SourceFile): boolean {
  let found = false;
  function visit(node: ts.Node): void {
    if (
      ts.isJsxElement(node) ||
      ts.isJsxFragment(node) ||
      ts.isJsxSelfClosingElement(node)
    ) {
      found = true;
      return;
    }
    if (!found) {
      ts.forEachChild(node, visit);
    }
  }
  visit(sourceFile);
  return found;
}

function resolveModuleTarget(
  specifier: string,
  importerPath: string,
): string | null {
  const pathOnly = modulePathOnly(specifier);
  if (pathOnly.startsWith("/src/") || pathOnly.startsWith("/schemas/")) {
    return resolve(REPOSITORY_ROOT, pathOnly.slice(1));
  }

  return (
    ts.resolveModuleName(pathOnly, importerPath, COMPILER_OPTIONS, ts.sys)
      .resolvedModule?.resolvedFileName ?? null
  );
}

function isPreactSpecifier(specifier: string): boolean {
  return specifier === "preact" || specifier.startsWith("preact/");
}

function modulePathOnly(specifier: string): string {
  const pathOnly = specifier.replaceAll("\\", "/").split(/[?#]/u, 1)[0] ?? "";
  const usesCurrentDirectoryPrefix = pathOnly.startsWith("./");
  const segments: string[] = [];
  for (const segment of pathOnly.split("/")) {
    if (segment === "." || segment === "") {
      continue;
    }
    if (segment === ".." && segments.at(-1) !== "..") {
      if (segments.length > 0) {
        segments.pop();
      } else {
        segments.push(segment);
      }
      continue;
    }
    segments.push(segment);
  }
  const prefix = pathOnly.startsWith("/")
    ? "/"
    : usesCurrentDirectoryPrefix && segments[0] !== ".."
      ? "./"
      : "";
  return `${prefix}${segments.join("/")}`;
}

function s0SchemaRepositoryPath(
  specifier: string,
): (typeof S0_SCHEMA_REPOSITORY_PATHS)[number] | null {
  const pathOnly = modulePathOnly(specifier).toLowerCase();
  return (
    S0_SCHEMA_REPOSITORY_PATHS.find(
      (schemaPath) =>
        pathOnly === schemaPath || pathOnly.endsWith(`/${schemaPath}`),
    ) ?? null
  );
}

function isS0SchemaTarget(target: string): boolean {
  return S0_SCHEMA_PATHS.some(
    (schemaPath) => canonicalPath(target) === canonicalPath(schemaPath),
  );
}

function referencesS0SourcePath(specifier: string): boolean {
  return S0_PATH_PATTERN.test(modulePathOnly(specifier).toLowerCase());
}

function referencesS0BoundaryPath(specifier: string): boolean {
  return (
    referencesS0SourcePath(specifier) ||
    s0SchemaRepositoryPath(specifier) !== null
  );
}

function violation(
  filePath: string,
  edge: ModuleEdge,
  reason: string,
): BoundaryViolation {
  return {
    column: edge.column,
    filePath,
    line: edge.line,
    reason: `${edge.kind}: ${reason}`,
  };
}

function inspectS0Module(
  filePath: string,
  sourceText: string,
  allowTestRenderer = false,
): BoundaryViolation[] {
  const sourceFile = createSource(filePath, sourceText);
  const violations: BoundaryViolation[] = [];

  if (containsJsx(sourceFile) && !allowTestRenderer) {
    violations.push({
      column: 1,
      filePath,
      line: 1,
      reason: "JSX is confined to the test-only Preact renderer",
    });
  }

  for (const edge of collectModuleEdges(sourceFile)) {
    if (edge.specifier === null) {
      violations.push(
        violation(
          filePath,
          edge,
          "nonliteral module targets are not statically auditable",
        ),
      );
      continue;
    }

    if (isPreactSpecifier(edge.specifier)) {
      if (
        !allowTestRenderer ||
        canonicalPath(filePath) !== canonicalPath(TEST_RENDERER)
      ) {
        violations.push(
          violation(
            filePath,
            edge,
            "Preact is allowed only in the exact test renderer",
          ),
        );
      }
      continue;
    }

    const target = resolveModuleTarget(edge.specifier, filePath);
    if (target !== null && pathIsWithin(target, S0_SOURCE_ROOT)) {
      continue;
    }
    if (
      target !== null &&
      canonicalPath(target) === canonicalPath(K0_PUBLIC_SEAM)
    ) {
      continue;
    }

    if (target === null) {
      violations.push(
        violation(
          filePath,
          edge,
          `unresolved or external module ${JSON.stringify(edge.specifier)}`,
        ),
      );
    } else if (pathIsWithin(target, K0_LIFECYCLE_ROOT)) {
      violations.push(
        violation(filePath, edge, "K0 lifecycle imports are forbidden"),
      );
    } else if (pathIsWithin(target, K0_ASSERTION_ROOT)) {
      violations.push(
        violation(
          filePath,
          edge,
          "deep K0 imports bypass the public assertion index seam",
        ),
      );
    } else {
      violations.push(
        violation(
          filePath,
          edge,
          `product or out-of-scope module ${repositoryPath(target)}`,
        ),
      );
    }
  }

  return violations;
}

function inspectReverseModule(
  filePath: string,
  sourceText: string,
): BoundaryViolation[] {
  const sourceFile = createSource(filePath, sourceText);
  const violations: BoundaryViolation[] = [];
  const allowsS0Schemas =
    canonicalPath(filePath) === canonicalPath(FOUNDATION_VALIDATOR);

  for (const edge of collectModuleEdges(sourceFile)) {
    if (edge.specifier === null) {
      violations.push(
        violation(
          filePath,
          edge,
          "nonliteral module targets cannot prove the production graph excludes S0",
        ),
      );
      continue;
    }

    const target = resolveModuleTarget(edge.specifier, filePath);
    const referencesS0Source =
      referencesS0SourcePath(edge.specifier) ||
      (target !== null && pathIsWithin(target, S0_SOURCE_ROOT));
    if (referencesS0Source) {
      violations.push(
        violation(filePath, edge, "production-to-S0 module edge is forbidden"),
      );
      continue;
    }

    const referencesS0Schema =
      s0SchemaRepositoryPath(edge.specifier) !== null ||
      (target !== null && isS0SchemaTarget(target));
    if (referencesS0Schema && !allowsS0Schemas) {
      violations.push(
        violation(
          filePath,
          edge,
          "production-to-S0 schema edge is forbidden outside the exact foundation validator",
        ),
      );
    }
  }

  return violations;
}

function formatViolations(violations: readonly BoundaryViolation[]): string {
  return violations
    .map(
      ({ column, filePath, line, reason }) =>
        `${repositoryPath(filePath)}:${String(line)}:${String(column)} ${reason}`,
    )
    .join("\n");
}

function isHtmlElement(node: HtmlNode): node is HtmlElement {
  return "tagName" in node && "attrs" in node;
}

function inspectHtmlGraph(filePath: string, html: string): HtmlInspection {
  const document = parseHtml(html);
  const moduleScriptSources: string[] = [];
  const violations: BoundaryViolation[] = [];

  function visit(node: HtmlNode): void {
    if (isHtmlElement(node)) {
      const attributes = new Map(
        node.attrs.map(({ name, value }) => [name.toLowerCase(), value]),
      );
      const resourceAttributes = ["action", "href", "src"] as const;
      for (const attributeName of resourceAttributes) {
        const resource = attributes.get(attributeName);
        if (resource !== undefined && referencesS0BoundaryPath(resource)) {
          violations.push({
            column: 1,
            filePath,
            line: 1,
            reason: `HTML ${attributeName} resource points into S0: ${JSON.stringify(resource)}`,
          });
        }
      }

      if (
        node.tagName === "script" &&
        attributes.get("type")?.toLowerCase() === "module"
      ) {
        const source = attributes.get("src");
        if (source !== undefined) {
          moduleScriptSources.push(source);
        } else {
          const inlineSource = node.childNodes
            .filter((child) => "value" in child)
            .map((child) => ("value" in child ? child.value : ""))
            .join("");
          violations.push(
            ...inspectReverseModule(
              `${filePath}.inline-module.ts`,
              inlineSource,
            ),
          );
        }
      }
    }

    if ("childNodes" in node) {
      for (const child of node.childNodes) {
        visit(child);
      }
    }
    if ("content" in node) {
      visit(node.content);
    }
  }

  visit(document);
  return { moduleScriptSources, violations };
}

function collectConfigStringViolations(
  filePath: string,
  value: unknown,
  jsonPath = "$",
): BoundaryViolation[] {
  if (typeof value === "string") {
    return referencesS0BoundaryPath(value)
      ? [
          {
            column: 1,
            filePath,
            line: 1,
            reason: `configuration string ${jsonPath} points into S0: ${JSON.stringify(value)}`,
          },
        ]
      : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectConfigStringViolations(
        filePath,
        entry,
        `${jsonPath}[${String(index)}]`,
      ),
    );
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) =>
      collectConfigStringViolations(filePath, entry, `${jsonPath}.${key}`),
    );
  }
  return [];
}

function reverseGraphModuleFiles(): string[] {
  const sourceFiles = moduleFilesBelow(resolve(REPOSITORY_ROOT, "src")).filter(
    (filePath) => !pathIsWithin(filePath, S0_SOURCE_ROOT),
  );
  const scriptFiles = moduleFilesBelow(resolve(REPOSITORY_ROOT, "scripts"));
  const configDirectoryFiles = moduleFilesBelow(
    resolve(REPOSITORY_ROOT, "config"),
  );
  const rootConfigFiles = readdirSync(REPOSITORY_ROOT, {
    withFileTypes: true,
  })
    .filter((entry) => entry.isFile() && ROOT_CONFIG_PATTERN.test(entry.name))
    .map((entry) => resolve(REPOSITORY_ROOT, entry.name));

  return [
    ...sourceFiles,
    ...scriptFiles,
    ...configDirectoryFiles,
    ...rootConfigFiles,
  ]
    .filter(
      (filePath, index, files) =>
        files.findIndex(
          (candidate) => canonicalPath(candidate) === canonicalPath(filePath),
        ) === index,
    )
    .sort((left, right) =>
      compareText(repositoryPath(left), repositoryPath(right)),
    );
}

describe("S0 import and reverse-dependency non-interference", () => {
  it("allows every S0 source module to use only local S0 modules and the exact public K0 seam", () => {
    const sourceFiles = moduleFilesBelow(S0_SOURCE_ROOT);
    expect(sourceFiles.map(repositoryPath)).toEqual([
      "src/experimental/spatial/constants.ts",
      "src/experimental/spatial/evidence-view.ts",
      "src/experimental/spatial/jurisdiction-evidence.ts",
      "src/experimental/spatial/observation.ts",
      "src/experimental/spatial/relation.ts",
      "src/experimental/spatial/temporal.ts",
      "src/experimental/spatial/topology.ts",
      "src/experimental/spatial/types.ts",
      "src/experimental/spatial/validation.ts",
    ]);

    const allEdges = sourceFiles.flatMap((filePath) =>
      collectModuleEdges(
        createSource(filePath, readFileSync(filePath, "utf8")),
      ).map((edge) => ({ edge, filePath })),
    );
    expect(
      allEdges.some(({ edge, filePath }) => {
        const target =
          edge.specifier === null
            ? null
            : resolveModuleTarget(edge.specifier, filePath);
        return target !== null && pathIsWithin(target, S0_SOURCE_ROOT);
      }),
    ).toBe(true);
    expect(
      allEdges.some(({ edge, filePath }) => {
        const target =
          edge.specifier === null
            ? null
            : resolveModuleTarget(edge.specifier, filePath);
        return (
          target !== null &&
          canonicalPath(target) === canonicalPath(K0_PUBLIC_SEAM)
        );
      }),
    ).toBe(true);

    const violations = sourceFiles.flatMap((filePath) =>
      inspectS0Module(filePath, readFileSync(filePath, "utf8")),
    );
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it("confines JSX and Preact to the exact test-only renderer", () => {
    const rendererText = readFileSync(TEST_RENDERER, "utf8");
    const rendererSource = createSource(TEST_RENDERER, rendererText);
    const rendererEdges = collectModuleEdges(rendererSource);

    expect(pathIsWithin(TEST_RENDERER, S0_SOURCE_ROOT)).toBe(false);
    expect(containsJsx(rendererSource)).toBe(true);
    expect(
      rendererEdges.filter(
        ({ kind, specifier }) =>
          kind === "jsx import source" && specifier === "preact",
      ),
    ).toHaveLength(1);

    const violations = inspectS0Module(TEST_RENDERER, rendererText, true);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it("finds no reverse S0 edge in production source, scripts, or executable configuration", () => {
    const files = reverseGraphModuleFiles();
    const paths = files.map(repositoryPath);
    expect(paths).toEqual(
      expect.arrayContaining([
        "eslint.config.js",
        "scripts/build-synthetic-artifact.mjs",
        "src/adapters/bia/index.ts",
        "src/app/App.tsx",
        "src/app/policy.ts",
        "src/app/routing.ts",
        "src/kernel/lifecycle/index.ts",
        "src/main.tsx",
        "src/pipeline/artifact.mjs",
        "src/pipeline/nation-collection-policy.mjs",
        "src/pipeline/source-registry.mjs",
        "src/shared/contracts.ts",
        "vite.config.ts",
        "vitest.config.ts",
      ]),
    );

    const violations = files.flatMap((filePath) =>
      inspectReverseModule(filePath, readFileSync(filePath, "utf8")),
    );
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  it("keeps HTML entrypoints and JSON configuration outside the S0 graph", () => {
    const htmlPath = resolve(REPOSITORY_ROOT, "index.html");
    const htmlInspection = inspectHtmlGraph(
      htmlPath,
      readFileSync(htmlPath, "utf8"),
    );
    expect(htmlInspection.moduleScriptSources).toEqual(["/src/main.tsx"]);
    expect(
      htmlInspection.violations,
      formatViolations(htmlInspection.violations),
    ).toEqual([]);

    const configFiles = walkFiles(
      resolve(REPOSITORY_ROOT, "config"),
      (filePath) => extname(filePath).toLowerCase() === ".json",
    );
    expect(configFiles.map(repositoryPath)).toEqual([
      "config/sources.v1.json",
      "config/taxonomy.v1.json",
    ]);
    const configViolations = configFiles.flatMap((filePath) =>
      collectConfigStringViolations(
        filePath,
        JSON.parse(readFileSync(filePath, "utf8")) as unknown,
      ),
    );
    expect(configViolations, formatViolations(configViolations)).toEqual([]);
  });

  it("rejects planted lifecycle, deep-K0, product, and external S0 imports", () => {
    const importer = resolve(S0_SOURCE_ROOT, "observation.ts");
    const rejectedSources = [
      'import "../../kernel/lifecycle/index";',
      'import type { JsonValue } from "../../kernel/assertions/contracts";',
      'export * from "../../app/policy";',
      'import "../../shared/contracts";',
      'import "../../pipeline/artifact.mjs";',
      'import "../../adapters/bia/index";',
      'import "../../contracts/congress/index";',
      'import "node:fs";',
      'import "preact";',
    ] as const;

    for (const sourceText of rejectedSources) {
      const violations = inspectS0Module(importer, sourceText);
      expect(violations, sourceText).not.toEqual([]);
    }

    const allowed = [
      'import type { JsonValue } from "../../kernel/assertions/index";',
      'import { S0_SOURCE_ID } from "./constants";',
    ].join("\n");
    expect(inspectS0Module(importer, allowed)).toEqual([]);
  });

  it("detects every planted static, type, re-export, dynamic, and require reverse edge", () => {
    const importer = resolve(REPOSITORY_ROOT, "src/main.tsx");
    const s0Target = "./experimental/spatial/observation";
    const rejectedSources = [
      `import ${JSON.stringify(s0Target)};`,
      `import type { SpatialObservation } from ${JSON.stringify(s0Target)};`,
      `import { type SpatialObservation } from ${JSON.stringify(s0Target)};`,
      `export * from ${JSON.stringify(s0Target)};`,
      `export type { SpatialObservation } from ${JSON.stringify(s0Target)};`,
      `type Observation = import(${JSON.stringify(s0Target)}).SpatialObservation;`,
      `void import(${JSON.stringify(s0Target)});`,
      `require(${JSON.stringify(s0Target)});`,
      `require.resolve(${JSON.stringify(s0Target)});`,
      `require["resolve"](${JSON.stringify(s0Target)});`,
      `import observation = require(${JSON.stringify(s0Target)});`,
      "void import(moduleName);",
      "require(moduleName);",
    ] as const;

    for (const sourceText of rejectedSources) {
      const violations = inspectReverseModule(importer, sourceText);
      expect(violations, sourceText).not.toEqual([]);
    }

    expect(
      inspectReverseModule(importer, 'import { App } from "./app/App";'),
    ).toEqual([]);
  });

  it("rejects all three exact S0 schemas through every module-edge form and resolvable path spelling", () => {
    const importer = resolve(REPOSITORY_ROOT, "src/main.tsx");

    for (const [index, schemaPath] of S0_SCHEMA_REPOSITORY_PATHS.entries()) {
      const relativeSpecifier = `../${schemaPath}`;
      const edgeSources = [
        `import schema${String(index)} from ${JSON.stringify(relativeSpecifier)};`,
        `type Schema${String(index)} = import(${JSON.stringify(relativeSpecifier)}).default;`,
        `export { default as schema${String(index)} } from ${JSON.stringify(relativeSpecifier)};`,
        `void import(${JSON.stringify(relativeSpecifier)});`,
        `require(${JSON.stringify(relativeSpecifier)});`,
      ] as const;

      for (const sourceText of edgeSources) {
        const violations = inspectReverseModule(importer, sourceText);
        expect(violations, sourceText).toEqual([
          expect.objectContaining({
            reason: expect.stringContaining("production-to-S0 schema edge"),
          }),
        ]);
      }

      const pathSpellings = [
        relativeSpecifier,
        relativeSpecifier.replace("/experimental/", "/experimental/./"),
        relativeSpecifier.replaceAll("/", "\\"),
        `/${schemaPath}`,
        `${relativeSpecifier}?raw`,
        `${relativeSpecifier}#schema`,
      ] as const;
      for (const specifier of pathSpellings) {
        const target = resolveModuleTarget(specifier, importer);
        expect(target, specifier).not.toBeNull();
        if (target === null) {
          throw new Error(`planted S0 schema did not resolve: ${specifier}`);
        }
        expect(canonicalPath(target), specifier).toBe(
          canonicalPath(resolve(REPOSITORY_ROOT, schemaPath)),
        );
        const sourceText = `import ${JSON.stringify(specifier)};`;
        expect(inspectReverseModule(importer, sourceText), sourceText).toEqual([
          expect.objectContaining({
            reason: expect.stringContaining("production-to-S0 schema edge"),
          }),
        ]);
      }
    }
  });

  it("confines the exact three S0 schema registrations to the exact foundation validator", () => {
    const schemaReferences = reverseGraphModuleFiles().flatMap((filePath) =>
      collectS0SchemaStringReferences(filePath, readFileSync(filePath, "utf8")),
    );
    expect(schemaReferences).toHaveLength(3);
    expect(
      schemaReferences.map(({ filePath }) => repositoryPath(filePath)),
    ).toEqual(
      S0_SCHEMA_REPOSITORY_PATHS.map(() =>
        repositoryPath(FOUNDATION_VALIDATOR),
      ),
    );
    expect(schemaReferences.map(({ schemaPath }) => schemaPath)).toEqual(
      S0_SCHEMA_REPOSITORY_PATHS,
    );
    expect(schemaReferences.map(({ value }) => value)).toEqual(
      S0_SCHEMA_REPOSITORY_PATHS,
    );

    const exactSchemaImports = S0_SCHEMA_REPOSITORY_PATHS.map(
      (schemaPath, index) =>
        `import schema${String(index)} from ${JSON.stringify(`../${schemaPath}`)};`,
    ).join("\n");
    expect(
      inspectReverseModule(FOUNDATION_VALIDATOR, exactSchemaImports),
    ).toEqual([]);

    const lookalikeValidator = resolve(
      REPOSITORY_ROOT,
      "scripts/validate-foundation-copy.mjs",
    );
    expect(
      inspectReverseModule(lookalikeValidator, exactSchemaImports),
    ).toEqual(
      S0_SCHEMA_REPOSITORY_PATHS.map(() =>
        expect.objectContaining({
          reason: expect.stringContaining("production-to-S0 schema edge"),
        }),
      ),
    );

    const foundationWithSourceImport = `${exactSchemaImports}\nimport "../src/experimental/spatial/observation";`;
    expect(
      inspectReverseModule(FOUNDATION_VALIDATOR, foundationWithSourceImport),
    ).toEqual([
      expect.objectContaining({
        reason: expect.stringContaining("production-to-S0 module edge"),
      }),
    ]);
  });

  it("detects planted S0 HTML resources, inline imports, and configuration strings", () => {
    const htmlPath = resolve(REPOSITORY_ROOT, "index.html");
    const resourceAttack = inspectHtmlGraph(
      htmlPath,
      '<script type="module" src="/src/experimental/spatial/evidence-view.ts"></script>',
    );
    expect(resourceAttack.violations).not.toEqual([]);

    const inlineAttack = inspectHtmlGraph(
      htmlPath,
      '<script type="module">import "/src/experimental/spatial/evidence-view.ts";</script>',
    );
    expect(inlineAttack.violations).not.toEqual([]);

    const configAttack = collectConfigStringViolations(
      resolve(REPOSITORY_ROOT, "config/planted.json"),
      { entry: "src/experimental/spatial/evidence-view.ts" },
    );
    expect(configAttack).not.toEqual([]);

    for (const schemaPath of S0_SCHEMA_REPOSITORY_PATHS) {
      const schemaResourceAttack = inspectHtmlGraph(
        htmlPath,
        `<script type="module" src="/${schemaPath}?raw"></script>`,
      );
      expect(schemaResourceAttack.violations, schemaPath).not.toEqual([]);

      const schemaInlineAttack = inspectHtmlGraph(
        htmlPath,
        `<script type="module">import "/${schemaPath}#schema";</script>`,
      );
      expect(schemaInlineAttack.violations, schemaPath).not.toEqual([]);

      for (const configuredPath of [
        schemaPath,
        schemaPath.replaceAll("/", "\\"),
        `${schemaPath}?raw`,
      ]) {
        const schemaConfigAttack = collectConfigStringViolations(
          resolve(REPOSITORY_ROOT, "config/planted.json"),
          { schema: configuredPath },
        );
        expect(schemaConfigAttack, configuredPath).not.toEqual([]);
      }
    }
  });
});
