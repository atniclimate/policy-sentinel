import { posix } from "node:path";

import ts from "typescript";

import {
  LEGACY_FACADE_BINDINGS,
  isAllowedModuleEdge,
  isCompositionDeclaration,
  isCompositionRoot,
  moduleOf,
  type LegacyFacadeBinding,
  type ModuleName,
} from "./module-manifest.mjs";

export type RepositoryFiles = ReadonlyMap<string, string>;

export interface GraphDiagnostic {
  readonly path: string;
  readonly code: "computed_loader" | "loader_escape" | "invalid_facade";
  readonly detail: string;
}

export interface ModuleLoad {
  readonly specifier: string;
}

export interface ModuleLoads {
  readonly loads: readonly ModuleLoad[];
  readonly diagnostics: readonly GraphDiagnostic[];
}

export interface BoundaryViolation {
  readonly from: string;
  readonly to: string;
  readonly fromModule: ModuleName;
  readonly toModule: ModuleName | null;
  readonly reason: "module_edge" | "composition_dependency";
}

export interface BoundaryAnalysis {
  readonly checkedEdges: number;
  readonly violations: readonly BoundaryViolation[];
  readonly diagnostics: readonly GraphDiagnostic[];
}

export interface RepositoryReachability {
  readonly paths: readonly string[];
  readonly diagnostics: readonly GraphDiagnostic[];
}

const sourcePattern = /\.(?:[cm]?[jt]sx?)$/u;
const extensions = [
  ".ts",
  ".tsx",
  ".mts",
  ".d.mts",
  ".cts",
  ".d.cts",
  ".d.ts",
  ".mjs",
  ".cjs",
  ".js",
  ".jsx",
  ".json",
] as const;

function normalized(path: string): string {
  return posix.normalize(path.replaceAll("\\", "/")).replace(/^\.\//u, "");
}

function sourceFile(path: string, source: string): ts.SourceFile {
  return ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : path.endsWith(".jsx")
        ? ts.ScriptKind.JSX
        : /\.[cm]?js$/u.test(path)
          ? ts.ScriptKind.JS
          : ts.ScriptKind.TS,
  );
}

/** Collect loaders and their aliases without evaluating any repository code. */
export function collectModuleLoads(path: string, source: string): ModuleLoads {
  const tree = sourceFile(path, source);
  const loads: ModuleLoad[] = [];
  const diagnostics: GraphDiagnostic[] = [];
  const loaders = new Set(["require"]);
  const factories = new Set<string>();
  const moduleNamespaces = new Set<string>();
  const moduleShadowScopes = new Set<ts.Node>();
  const variables: ts.VariableDeclaration[] = [];
  const assignments: ts.BinaryExpression[] = [];
  const diagnosticKeys = new Set<string>();
  let hasLoaderCandidate = false;

  function diagnostic(node: ts.Node, code: GraphDiagnostic["code"]): void {
    const key = `${code}:${String(node.pos)}`;
    if (!diagnosticKeys.has(key)) {
      diagnosticKeys.add(key);
      diagnostics.push({ path, code, detail: node.getText(tree) });
    }
  }

  function unwrapped(expression: ts.Expression): ts.Expression {
    while (
      ts.isParenthesizedExpression(expression) ||
      ts.isAsExpression(expression) ||
      ts.isTypeAssertionExpression(expression) ||
      ts.isNonNullExpression(expression)
    ) {
      expression = expression.expression;
    }
    return expression;
  }

  function property(
    expression: ts.Expression,
  ): { object: ts.Expression; name: string } | null {
    expression = unwrapped(expression);
    if (ts.isPropertyAccessExpression(expression)) {
      return { object: expression.expression, name: expression.name.text };
    }
    if (
      ts.isElementAccessExpression(expression) &&
      expression.argumentExpression &&
      ts.isStringLiteralLike(expression.argumentExpression)
    ) {
      return {
        object: expression.expression,
        name: expression.argumentExpression.text,
      };
    }
    return null;
  }

  function namespace(expression: ts.Expression): boolean {
    expression = unwrapped(expression);
    if (ts.isAwaitExpression(expression))
      return namespace(expression.expression);
    if (ts.isIdentifier(expression)) {
      if (moduleNamespaces.has(expression.text)) return true;
      if (expression.text !== "module") return false;
      for (
        let parent: ts.Node | undefined = expression.parent;
        parent;
        parent = parent.parent
      ) {
        if (moduleShadowScopes.has(parent)) return false;
      }
      return true;
    }
    const member = property(expression);
    if (member && ["Module", "default"].includes(member.name)) {
      return namespace(member.object);
    }
    return (
      ts.isCallExpression(expression) &&
      (loader(expression.expression) ||
        expression.expression.kind === ts.SyntaxKind.ImportKeyword) &&
      expression.arguments[0] !== undefined &&
      ts.isStringLiteralLike(expression.arguments[0]) &&
      ["node:module", "module"].includes(expression.arguments[0].text)
    );
  }

  function factory(expression: ts.Expression): boolean {
    expression = unwrapped(expression);
    const member = property(expression);
    return (
      (ts.isIdentifier(expression) && factories.has(expression.text)) ||
      (member !== null &&
        member.name === "createRequire" &&
        namespace(member.object))
    );
  }

  function loader(expression: ts.Expression): boolean {
    expression = unwrapped(expression);
    const member = property(expression);
    return (
      (ts.isIdentifier(expression) && loaders.has(expression.text)) ||
      (member !== null &&
        member.name === "require" &&
        namespace(member.object)) ||
      (ts.isCallExpression(expression) && factory(expression.expression))
    );
  }

  function bindingKey(binding: ts.BindingElement): string | null {
    const name = binding.propertyName ?? binding.name;
    if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
    if (
      ts.isComputedPropertyName(name) &&
      ts.isStringLiteralLike(name.expression)
    )
      return name.expression.text;
    return null;
  }

  function initial(node: ts.Node): void {
    if (
      ts.isIdentifier(node) &&
      (node.text === "require" || node.text === "module")
    ) {
      hasLoaderCandidate = true;
    }
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      loads.push({ specifier: node.moduleSpecifier.text });
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      loads.push({ specifier: node.argument.literal.text });
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      addLoad(node.moduleReference.expression, node);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      addLoad(node.arguments[0], node);
      if (
        node.arguments[0] &&
        ts.isStringLiteralLike(node.arguments[0]) &&
        ["node:module", "module"].includes(node.arguments[0].text)
      )
        hasLoaderCandidate = true;
    }
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteralLike(node.moduleSpecifier) &&
      ["node:module", "module"].includes(node.moduleSpecifier.text)
    ) {
      const clause = node.importClause;
      if (clause?.name) moduleNamespaces.add(clause.name.text);
      if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        moduleNamespaces.add(clause.namedBindings.name.text);
      } else if (
        clause?.namedBindings &&
        ts.isNamedImports(clause.namedBindings)
      ) {
        for (const binding of clause.namedBindings.elements) {
          if (
            (binding.propertyName?.text ?? binding.name.text) ===
            "createRequire"
          ) {
            factories.add(binding.name.text);
          }
          if (
            ["Module", "default"].includes(
              binding.propertyName?.text ?? binding.name.text,
            )
          ) {
            moduleNamespaces.add(binding.name.text);
          }
        }
      }
    }
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression) &&
      ["node:module", "module"].includes(node.moduleReference.expression.text)
    ) {
      moduleNamespaces.add(node.name.text);
    }
    if (ts.isVariableDeclaration(node)) variables.push(node);
    if (
      (ts.isVariableDeclaration(node) || ts.isParameter(node)) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "module"
    ) {
      let scope: ts.Node | undefined = node.parent;
      const functionScoped =
        ts.isParameter(node) ||
        (ts.isVariableDeclaration(node) &&
          ts.isVariableDeclarationList(node.parent) &&
          !(node.parent.flags & ts.NodeFlags.BlockScoped));
      while (
        scope &&
        !ts.isSourceFile(scope) &&
        !(functionScoped ? ts.isFunctionLike(scope) : ts.isBlock(scope))
      ) {
        scope = scope.parent;
      }
      if (scope) moduleShadowScopes.add(scope);
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      assignments.push(node);
    }
    ts.forEachChild(node, initial);
  }
  initial(tree);
  if (
    !hasLoaderCandidate &&
    factories.size === 0 &&
    moduleNamespaces.size === 0
  ) {
    return { loads, diagnostics };
  }
  loads.length = 0;
  diagnostics.length = 0;
  diagnosticKeys.clear();

  // A fixed point covers chained aliases and assignment order without executing them.
  let changed = true;
  while (changed) {
    const before = loaders.size + factories.size + moduleNamespaces.size;
    for (const node of variables) {
      const value = node.initializer;
      if (!value) continue;
      if (ts.isIdentifier(node.name)) {
        if (loader(value)) loaders.add(node.name.text);
        if (factory(value)) factories.add(node.name.text);
        if (namespace(value)) moduleNamespaces.add(node.name.text);
      } else if (ts.isObjectBindingPattern(node.name)) {
        if (namespace(value)) {
          for (const binding of node.name.elements) {
            if (!ts.isIdentifier(binding.name)) continue;
            const name = bindingKey(binding);
            if (name === "createRequire") factories.add(binding.name.text);
            if (name === "require") loaders.add(binding.name.text);
            if (name === "Module" || name === "default")
              moduleNamespaces.add(binding.name.text);
          }
        }
      }
    }
    for (const node of assignments) {
      if (!ts.isIdentifier(node.left)) continue;
      if (loader(node.right)) loaders.add(node.left.text);
      if (factory(node.right)) factories.add(node.left.text);
      if (namespace(node.right)) moduleNamespaces.add(node.left.text);
    }
    changed = before !== loaders.size + factories.size + moduleNamespaces.size;
  }

  function addLoad(argument: ts.Node | undefined, node: ts.Node): void {
    if (argument && ts.isStringLiteralLike(argument))
      loads.push({ specifier: argument.text });
    else diagnostic(node, "computed_loader");
  }

  function allowedLoaderUse(node: ts.Node): boolean {
    const parent = node.parent;
    if (!parent) return false;
    if (ts.isCallExpression(parent) && parent.expression === node) return true;
    if (ts.isVariableDeclaration(parent)) {
      if (parent.name === node) return true;
      if (parent.initializer === node)
        return (
          ts.isIdentifier(parent.name) ||
          (ts.isObjectBindingPattern(parent.name) &&
            namespace(parent.initializer) &&
            parent.name.elements.every(
              (binding) =>
                !binding.dotDotDotToken &&
                ts.isIdentifier(binding.name) &&
                bindingKey(binding) !== null,
            ))
        );
    }
    if (
      ts.isBinaryExpression(parent) &&
      parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(parent.left) &&
      (parent.right === node || parent.left === node)
    )
      return true;
    if (
      ts.isImportSpecifier(parent) ||
      ts.isNamespaceImport(parent) ||
      ts.isImportClause(parent) ||
      ts.isImportEqualsDeclaration(parent) ||
      ts.isBindingElement(parent)
    )
      return true;
    if (ts.isPropertyAccessExpression(parent) && parent.name === node)
      return true;
    if (
      (ts.isPropertyAccessExpression(parent) ||
        ts.isElementAccessExpression(parent)) &&
      parent.expression === node &&
      property(parent)?.name === "resolve" &&
      ts.isCallExpression(parent.parent) &&
      parent.parent.expression === parent &&
      parent.parent.arguments[0] &&
      ts.isStringLiteralLike(parent.parent.arguments[0])
    )
      return true;
    if (
      (ts.isPropertyAssignment(parent) ||
        ts.isPropertySignature(parent) ||
        ts.isPropertyDeclaration(parent) ||
        ts.isMethodDeclaration(parent)) &&
      parent.name === node
    )
      return true;
    if (
      ts.isParenthesizedExpression(parent) ||
      ts.isAsExpression(parent) ||
      ts.isTypeAssertionExpression(parent) ||
      ts.isNonNullExpression(parent)
    )
      return allowedLoaderUse(parent);
    return false;
  }

  function directlyAwaited(node: ts.Node): boolean {
    let parent = node.parent;
    while (
      ts.isParenthesizedExpression(parent) ||
      ts.isAsExpression(parent) ||
      ts.isTypeAssertionExpression(parent) ||
      ts.isNonNullExpression(parent)
    ) {
      parent = parent.parent;
    }
    return ts.isAwaitExpression(parent);
  }

  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      loads.push({ specifier: node.moduleSpecifier.text });
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      loads.push({ specifier: node.argument.literal.text });
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      addLoad(node.moduleReference.expression, node);
    } else if (ts.isCallExpression(node)) {
      if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        loader(node.expression)
      ) {
        addLoad(node.arguments[0], node);
      }
    }
    if (
      ts.isIdentifier(node) &&
      (loaders.has(node.text) || factories.has(node.text)) &&
      !allowedLoaderUse(node)
    )
      diagnostic(node, "loader_escape");
    if (
      (ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)) &&
      (loader(node) || factory(node)) &&
      !allowedLoaderUse(node)
    )
      diagnostic(node, "loader_escape");
    if (
      ts.isCallExpression(node) &&
      factory(node.expression) &&
      !allowedLoaderUse(node)
    ) {
      diagnostic(node, "loader_escape");
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      namespace(node) &&
      !directlyAwaited(node)
    ) {
      diagnostic(node, "loader_escape");
    }
    if (
      (ts.isIdentifier(node) ||
        ts.isCallExpression(node) ||
        ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node) ||
        ts.isAwaitExpression(node)) &&
      namespace(node) &&
      !allowedLoaderUse(node)
    ) {
      const parent = node.parent;
      if (
        !(
          (ts.isPropertyAccessExpression(parent) ||
            ts.isElementAccessExpression(parent)) &&
          parent.expression === node
        ) &&
        !directlyAwaited(node)
      )
        diagnostic(node, "loader_escape");
    }
    if (
      ts.isElementAccessExpression(node) &&
      namespace(node.expression) &&
      !ts.isStringLiteralLike(node.argumentExpression)
    )
      diagnostic(node, "computed_loader");
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return { loads, diagnostics };
}

/** Resolve every compatible runtime and declaration file, never only the first. */
export function resolveRepositoryTargets(
  files: RepositoryFiles,
  importer: string,
  specifier: string,
): readonly string[] {
  const literal = specifier.split(/[?#]/u)[0] ?? "";
  if (!literal.startsWith(".") && !literal.startsWith("/")) return [];
  const base = normalized(
    literal.startsWith("/")
      ? literal.slice(1)
      : posix.join(posix.dirname(importer), literal),
  );
  if (base === ".." || base.startsWith("../")) return [];
  const candidates = new Set([base]);
  if (base.endsWith(".js") || base.endsWith(".jsx")) {
    const stem = base.replace(/\.jsx?$/u, "");
    for (const suffix of [".ts", ".tsx", ".d.ts", ".js", ".jsx"])
      candidates.add(stem + suffix);
  } else if (base.endsWith(".mjs")) {
    for (const suffix of [".mts", ".d.mts"])
      candidates.add(base.slice(0, -4) + suffix);
  } else if (base.endsWith(".cjs")) {
    for (const suffix of [".cts", ".d.cts"])
      candidates.add(base.slice(0, -4) + suffix);
  } else if (!posix.extname(base)) {
    for (const suffix of extensions) {
      candidates.add(base + suffix);
      candidates.add(`${base}/index${suffix}`);
    }
  }
  return [...candidates].filter((candidate) => files.has(candidate)).sort();
}

export function validateLegacyFacade(
  files: RepositoryFiles,
  path: string,
  expected: readonly LegacyFacadeBinding[] = LEGACY_FACADE_BINDINGS[path] ?? [],
): readonly GraphDiagnostic[] {
  const text = files.get(path);
  if (text === undefined)
    return [{ path, code: "invalid_facade", detail: "Facade is missing." }];
  const tree = sourceFile(path, text);
  const actual: LegacyFacadeBinding[] = [];
  const diagnostics: GraphDiagnostic[] = [];
  const reject = (detail: string): void => {
    diagnostics.push({ path, code: "invalid_facade", detail });
  };
  for (const node of tree.statements) {
    if (
      !ts.isExportDeclaration(node) ||
      !node.moduleSpecifier ||
      !ts.isStringLiteralLike(node.moduleSpecifier) ||
      !node.exportClause ||
      !ts.isNamedExports(node.exportClause) ||
      node.attributes
    ) {
      reject("Only source-bearing named exports are permitted.");
      continue;
    }
    const targets = resolveRepositoryTargets(
      files,
      path,
      node.moduleSpecifier.text,
    );
    for (const binding of node.exportClause.elements) {
      const importedName = binding.propertyName?.text ?? binding.name.text;
      const exportedName = binding.name.text;
      const typeOnly = node.isTypeOnly || binding.isTypeOnly;
      const match = expected.find(
        (entry) =>
          entry.importedName === importedName &&
          entry.exportedName === exportedName &&
          entry.typeOnly === typeOnly &&
          JSON.stringify(targets) === JSON.stringify(entry.resolvedTargets),
      );
      if (!match)
        reject(
          `Unexpected binding ${exportedName} from ${node.moduleSpecifier.text}.`,
        );
      else actual.push(match);
    }
  }
  const key = (binding: LegacyFacadeBinding): string => JSON.stringify(binding);
  if (
    JSON.stringify(actual.map(key).sort()) !==
    JSON.stringify(expected.map(key).sort())
  ) {
    reject("Named export surface differs from the pre-GD-10 contract.");
  }
  return diagnostics;
}

function graph(files: RepositoryFiles): ReadonlyMap<string, ModuleLoads> {
  return new Map(
    [...files].map(([path, source]) => [
      path,
      sourcePattern.test(path)
        ? collectModuleLoads(path, source)
        : { loads: [], diagnostics: [] },
    ]),
  );
}

export function analyzeModuleBoundaries(
  files: RepositoryFiles,
): BoundaryAnalysis {
  const parsed = graph(files);
  const violations: BoundaryViolation[] = [];
  const diagnostics = [...parsed.values()].flatMap(
    (entry) => entry.diagnostics,
  );
  const seenEdges = new Set<string>();
  const facades = new Set(Object.keys(LEGACY_FACADE_BINDINGS));
  const compositionFacades = new Set(
    Object.entries(LEGACY_FACADE_BINDINGS)
      .filter(([, bindings]) =>
        bindings.some(
          ({ target }) =>
            isCompositionRoot(target) || isCompositionDeclaration(target),
        ),
      )
      .map(([path]) => path),
  );
  for (const facade of facades) {
    if (files.has(facade))
      diagnostics.push(...validateLegacyFacade(files, facade));
  }
  let checkedEdges = 0;
  for (const [from, outgoing] of parsed) {
    const fromModule = moduleOf(from);
    if (
      fromModule === null ||
      isCompositionRoot(from) ||
      isCompositionDeclaration(from) ||
      facades.has(from)
    )
      continue;
    const visited = new Set<string>();
    const pending = outgoing.loads.flatMap(({ specifier }) =>
      resolveRepositoryTargets(files, from, specifier),
    );
    while (pending.length > 0) {
      const to = pending.pop();
      if (to === undefined || visited.has(to)) continue;
      visited.add(to);
      const toModule = moduleOf(to);
      const key = `${from} -> ${to}`;
      if (!seenEdges.has(key)) {
        seenEdges.add(key);
        if (toModule !== null) checkedEdges += 1;
        if (
          isCompositionRoot(to) ||
          isCompositionDeclaration(to) ||
          compositionFacades.has(to)
        ) {
          violations.push({
            from,
            to,
            fromModule,
            toModule,
            reason: "composition_dependency",
          });
        } else if (
          !isAllowedModuleEdge({ fromModule, fromPath: from, toModule })
        ) {
          violations.push({
            from,
            to,
            fromModule,
            toModule,
            reason: "module_edge",
          });
        }
      }
      if (
        toModule === null &&
        !isCompositionRoot(to) &&
        !isCompositionDeclaration(to)
      ) {
        for (const load of parsed.get(to)?.loads ?? []) {
          pending.push(...resolveRepositoryTargets(files, to, load.specifier));
        }
      }
    }
  }
  return { checkedEdges, violations, diagnostics };
}

/** Public traversal deliberately has no facade or composition exceptions. */
export function walkRepositoryReachable(
  files: RepositoryFiles,
  entries: readonly string[],
): RepositoryReachability {
  const visited = new Set<string>();
  const diagnostics: GraphDiagnostic[] = [];
  const pending = [...entries];
  while (pending.length > 0) {
    const path = pending.pop();
    if (path === undefined || visited.has(path)) continue;
    visited.add(path);
    const text = files.get(path);
    if (text === undefined || !sourcePattern.test(path)) continue;
    const source = collectModuleLoads(path, text);
    diagnostics.push(...source.diagnostics);
    for (const load of source.loads)
      pending.push(...resolveRepositoryTargets(files, path, load.specifier));
  }
  return { paths: [...visited].sort(), diagnostics };
}
