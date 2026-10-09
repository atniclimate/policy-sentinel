import { describe, expect, it, vi } from "vitest";

import {
  LEGACY_FACADE_BINDINGS,
  isForbiddenFromPublicEntry,
} from "./module-manifest.mjs";
import {
  analyzeModuleBoundaries,
  collectModuleLoads,
  resolveRepositoryTargets,
  validateLegacyFacade,
  walkRepositoryReachable,
} from "./module-graph";

function files(entries: Record<string, string>): ReadonlyMap<string, string> {
  return new Map(Object.entries(entries));
}

const facadePath = "src/engine/source-pack.ts";
const sourcePackFacade =
  "export { " +
  LEGACY_FACADE_BINDINGS[facadePath]!.map(
    ({ exportedName }) => exportedName,
  ).join(", ") +
  " } from '../../scripts/source-pack';";

describe("Repository module resolution", () => {
  it("includes simultaneous runtime, source and declaration candidates", () => {
    const inventory = files({
      "src/core/item.js": "",
      "src/core/item.ts": "",
      "src/core/item.tsx": "",
      "src/core/item.d.ts": "",
      "src/core/value.mjs": "",
      "src/core/value.mts": "",
      "src/core/value.d.mts": "",
      "src/core/other.cjs": "",
      "src/core/other.cts": "",
      "src/core/other.d.cts": "",
      "src/core/dir/index.ts": "",
      "src/core/dir/index.d.ts": "",
    });
    expect(
      resolveRepositoryTargets(
        inventory,
        "src/core/main.ts",
        "./item.js?version=1",
      ),
    ).toEqual([
      "src/core/item.d.ts",
      "src/core/item.js",
      "src/core/item.ts",
      "src/core/item.tsx",
    ]);
    expect(
      resolveRepositoryTargets(inventory, "src/core/main.ts", "./value.mjs"),
    ).toEqual([
      "src/core/value.d.mts",
      "src/core/value.mjs",
      "src/core/value.mts",
    ]);
    expect(
      resolveRepositoryTargets(inventory, "src/core/main.ts", "./other.cjs"),
    ).toEqual([
      "src/core/other.cjs",
      "src/core/other.cts",
      "src/core/other.d.cts",
    ]);
    expect(
      resolveRepositoryTargets(inventory, "src/core/main.ts", "./dir"),
    ).toEqual(["src/core/dir/index.d.ts", "src/core/dir/index.ts"]);
    expect(
      resolveRepositoryTargets(inventory, "src/core/main.ts", "node:fs"),
    ).toEqual([]);
  });

  it("walks declarations, import types, named exports and unclassified relays", () => {
    const inventory = files({
      "src/main.tsx": "import './core/public.js';",
      "src/core/public.ts": "export type { Value } from '../relay/value.mjs';",
      "src/relay/value.mjs": "export const value = 1;",
      "src/relay/value.d.mts":
        "export type Value = import('../engine/index').Private;",
      "src/engine/index.ts":
        "export type { Private } from '../modules/private/data';",
      "src/modules/private/data.ts": "export interface Private {}",
    });
    const result = walkRepositoryReachable(inventory, ["src/main.tsx"]);
    expect(result.paths.filter(isForbiddenFromPublicEntry)).toEqual([
      "src/engine/index.ts",
      "src/modules/private/data.ts",
    ]);
    expect(result.diagnostics).toEqual([]);
    expect(analyzeModuleBoundaries(inventory).violations).toContainEqual({
      from: "src/core/public.ts",
      to: "src/modules/private/data.ts",
      fromModule: "core",
      toModule: "private",
      reason: "module_edge",
    });
  });
});

describe("Static loader analysis", () => {
  it("keeps all ordinary import forms and computed dynamic-import refusals in one-pass files", () => {
    const result = collectModuleLoads(
      "src/core/example.ts",
      [
        "import { value } from './value'; export { value } from './other';",
        "type Value = import('./types').Value; import('./dynamic'); import(computed);",
      ].join("\n"),
    );
    expect(result.loads.map(({ specifier }) => specifier)).toEqual([
      "./value",
      "./other",
      "./types",
      "./dynamic",
    ]);
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      "computed_loader",
    ]);
  });

  it("detects escaped loader names and escaped module namespaces from parsed syntax", () => {
    const requireResult = collectModuleLoads(
      "src/core/example.ts",
      "const load = req\\u0075ire; load('./hidden');",
    );
    expect(requireResult.loads.map(({ specifier }) => specifier)).toEqual([
      "./hidden",
    ]);
    expect(requireResult.diagnostics).toEqual([]);
    const namespaceResult = collectModuleLoads(
      "src/core/example.ts",
      "import('node:\\x6dodule').then(consume);",
    );
    expect(
      namespaceResult.diagnostics.some(({ code }) => code === "loader_escape"),
    ).toBe(true);
  });

  it("follows literal direct, aliased, chained, assignment and createRequire loaders", () => {
    const result = collectModuleLoads(
      "src/core/entry.ts",
      [
        "import { createRequire as make } from 'node:module';",
        "const makeAgain = make; const load = makeAgain(import.meta.url);",
        "const next = load; let last; last = next;",
        "require('./one'); next('./two'); last('./three');",
        "import('./four'); type Five = import('./five').Five;",
        "export { Six } from './six';",
      ].join("\n"),
    );
    expect(result.loads.map(({ specifier }) => specifier)).toEqual([
      "node:module",
      "./one",
      "./two",
      "./three",
      "./four",
      "./five",
      "./six",
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it("recognizes namespace and destructured createRequire aliases", () => {
    const result = collectModuleLoads(
      "scripts/example.mjs",
      [
        "import * as nodeModule from 'node:module';",
        "const { createRequire: make } = nodeModule; const load = make(import.meta.url);",
        "const next = nodeModule.createRequire(import.meta.url);",
        "load('./one'); next('./two'); module.require('./three');",
      ].join("\n"),
    );
    expect(result.loads.map(({ specifier }) => specifier)).toEqual([
      "node:module",
      "./one",
      "./two",
      "./three",
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it("recognizes CommonJS module-member and dynamic namespace loaders", () => {
    const result = collectModuleLoads(
      "scripts/example.mjs",
      [
        "const make = require('node:module').createRequire; const load = make(import.meta.url);",
        "const ns = await import('node:module'); const next = ns.createRequire(import.meta.url);",
        "load('./one'); next('./two');",
      ].join("\n"),
    );
    expect(result.loads.map(({ specifier }) => specifier)).toEqual([
      "node:module",
      "node:module",
      "./one",
      "./two",
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it("tracks Module and default member aliases", () => {
    const result = collectModuleLoads(
      "scripts/example.mjs",
      [
        "import * as ns from 'node:module'; const ModuleAlias = ns.Module; const defaultAlias = ns.default;",
        "const first = ModuleAlias.createRequire(import.meta.url); const second = defaultAlias.createRequire(import.meta.url);",
        "first('./one'); second('./two');",
      ].join("\n"),
    );
    expect(result.loads.map(({ specifier }) => specifier)).toEqual([
      "node:module",
      "./one",
      "./two",
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it("tracks default named imports, destructuring and parenthesized awaited namespaces", () => {
    const result = collectModuleLoads(
      "scripts/example.mjs",
      [
        "import { default as first } from 'node:module';",
        "const { default: second } = require('node:module');",
        "const third = await (import('node:module'));",
        "first.createRequire(import.meta.url)('./one');",
        "second.createRequire(import.meta.url)('./two');",
        "third.createRequire(import.meta.url)('./three');",
      ].join("\n"),
    );
    expect(result.loads.map(({ specifier }) => specifier)).toEqual([
      "node:module",
      "node:module",
      "node:module",
      "./one",
      "./two",
      "./three",
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it("recognizes quoted and literal computed destructuring plus import-equals", () => {
    const result = collectModuleLoads(
      "scripts/example.ts",
      [
        "import m = require('node:module');",
        "const { ['createRequire']: first, 'createRequire': second } = m;",
        "const one = first(import.meta.url); const two = second(import.meta.url);",
        "one('./one'); two('./two');",
      ].join("\n"),
    );
    expect(result.loads.map(({ specifier }) => specifier)).toEqual([
      "node:module",
      "./one",
      "./two",
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it.each([
    "import('./' + name);",
    "require(path);",
    "const load = require; load(`./${name}`);",
    "import { createRequire } from 'node:module'; const load = createRequire(import.meta.url); load(path);",
    "import * as ns from 'node:module'; const make = ns[key]; const load = make(import.meta.url); load('./hidden');",
  ])("rejects computed repository loading: %s", (source) => {
    expect(
      collectModuleLoads("src/core/entry.ts", source).diagnostics.some(
        ({ code }) => code === "computed_loader",
      ),
    ).toBe(true);
  });

  it.each([
    "consume(require);",
    "export { require };",
    "const object = { load: require };",
    "const load = require.bind(null); load('./hidden');",
    "import { createRequire } from 'node:module'; consume(createRequire);",
    "consume(module.require);",
    "import * as ns from 'node:module'; consume(ns);",
    "consume(require('node:module'));",
    "consume(module);",
    "import * as ns from 'node:module'; consume(ns.Module);",
    "import('node:module').then(({createRequire}) => createRequire(import.meta.url)('./hidden'));",
    "const pending = import('node:module'); consume(pending);",
    "import { createRequire } from 'node:module'; consume(createRequire(import.meta.url));",
    "const { call: invoke } = require; invoke(null, './hidden');",
    "import * as ns from 'node:module'; const { [key]: make } = ns; const load = make(import.meta.url); load('./hidden');",
  ])("rejects loader escapes: %s", (source) => {
    expect(
      collectModuleLoads("src/core/entry.ts", source).diagnostics.some(
        ({ code }) => code === "loader_escape",
      ),
    ).toBe(true);
  });

  it("allows literal Node and package imports, including the browser harness", () => {
    const result = collectModuleLoads(
      "scripts/browser.mjs",
      [
        "import { createRequire } from 'node:module';",
        "const require = createRequire(join(runtimeRoot, 'index.js'));",
        "assert.equal(require.resolve('playwright-core'), join(runtimeRoot, 'index.js'));",
        "const { chromium } = require('playwright-core');",
        "const { readFileSync } = require('node:fs');",
        "await import('node:http');",
      ].join("\n"),
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.loads.map(({ specifier }) => specifier)).toEqual([
      "node:module",
      "playwright-core",
      "node:fs",
      "node:http",
    ]);
    expect(
      collectModuleLoads(
        "scripts/measure.mjs",
        "const module = (await loadModule()).default; patch(module);",
      ).diagnostics,
    ).toEqual([]);
  });
});

describe("Exact compatibility facades", () => {
  it("accepts only the frozen named binding surface", () => {
    const inventory = files({
      [facadePath]: sourcePackFacade,
      "scripts/source-pack.ts": "",
    });
    expect(validateLegacyFacade(inventory, facadePath)).toEqual([]);
    expect(analyzeModuleBoundaries(inventory)).toEqual({
      checkedEdges: 0,
      violations: [],
      diagnostics: [],
    });
  });

  it.each([
    sourcePackFacade + " export const extra = 1;",
    sourcePackFacade + " initialize();",
    sourcePackFacade + " import '../core/other';",
    sourcePackFacade + " export { extra } from '../../scripts/source-pack';",
    sourcePackFacade.replace(
      "../../scripts/source-pack",
      "../../scripts/unreviewed",
    ),
    sourcePackFacade.replace("export {", "export type {"),
    "export * from '../../scripts/source-pack';",
  ])(
    "rejects extra statements, exports, targets and changed type status",
    (source) => {
      const inventory = files({
        [facadePath]: source,
        "scripts/source-pack.ts": "",
        "scripts/unreviewed.ts": "",
      });
      expect(
        validateLegacyFacade(inventory, facadePath).length,
      ).toBeGreaterThan(0);
    },
  );

  it("rejects an extra runtime target alongside a reviewed TypeScript target", () => {
    const inventory = files({
      [facadePath]: sourcePackFacade.replace(
        "../../scripts/source-pack",
        "../../scripts/source-pack.js",
      ),
      "scripts/source-pack.ts": "",
      "scripts/source-pack.js": "import '../src/modules/private/hidden';",
      "src/modules/private/hidden.ts": "",
    });
    expect(validateLegacyFacade(inventory, facadePath).length).toBeGreaterThan(
      0,
    );
  });

  it("never exempts incoming implementation edges or intermediary relays", () => {
    const inventory = files({
      [facadePath]: sourcePackFacade,
      "scripts/source-pack.ts": "",
      "src/modules/intake/first.ts": "import '../../engine/source-pack';",
      "src/modules/intake/second.ts": "import '../../relay';",
      "src/relay.ts":
        "export { createSourcePackAdmissionPlan } from './engine/source-pack';",
      "src/core/third.ts": "import '../../scripts/configured-engine';",
      "scripts/configured-engine.ts": "",
      "src/core/fourth.ts":
        "import '../../scripts/configured-analyzed-corpus.mjs';",
      "scripts/configured-analyzed-corpus.mjs": "",
      "scripts/configured-analyzed-corpus.d.mts": "",
    });
    const result = analyzeModuleBoundaries(inventory);
    expect(result.violations).toHaveLength(5);
    expect(
      result.violations.every(
        ({ reason }) => reason === "composition_dependency",
      ),
    ).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it("public traversal crosses facades and composition to find private files", () => {
    const inventory = files({
      "src/main.tsx": "import './engine/source-pack';",
      [facadePath]: sourcePackFacade,
      "scripts/source-pack.ts": "import '../src/engine/index';",
      "src/engine/index.ts": "export * from '../modules/private/data';",
      "src/modules/private/data.ts": "",
    });
    const result = walkRepositoryReachable(inventory, ["src/main.tsx"]);
    expect(result.paths.filter(isForbiddenFromPublicEntry)).toEqual([
      "src/engine/index.ts",
      "src/modules/private/data.ts",
    ]);
  });
});

describe("Module-origin traversal", () => {
  it("reads only files reached from the requested public entry", () => {
    const inventory = new Map(
      Object.entries({
        "src/main.tsx": "import './core/value';",
        "src/core/value.ts": "export const value = 1;",
        "scripts/unrelated.mjs": "require(computed);",
      }),
    );
    const iterator = vi
      .spyOn(inventory, Symbol.iterator)
      .mockImplementation(() => {
        throw new Error(
          "Public traversal must not scan unrelated repository files.",
        );
      });
    try {
      expect(walkRepositoryReachable(inventory, ["src/main.tsx"])).toEqual({
        paths: ["src/core/value.ts", "src/main.tsx"],
        diagnostics: [],
      });
    } finally {
      iterator.mockRestore();
    }
  });

  it("terminates cycles and applies each classified target's own rule", () => {
    const inventory = files({
      "src/modules/output/view.ts": "import '../../modules/context/context';",
      "src/modules/context/context.ts": "import '../../core/value';",
      "src/core/value.ts": "import '../relay/a';",
      "src/relay/a.ts": "import './b';",
      "src/relay/b.ts":
        "import './a'; export { value } from '../modules/intake/input';",
      "src/modules/intake/input.ts": "export const value = 1;",
    });
    const result = analyzeModuleBoundaries(inventory);
    expect(result.diagnostics).toEqual([]);
    expect(result.violations).toEqual([
      {
        from: "src/core/value.ts",
        to: "src/modules/intake/input.ts",
        fromModule: "core",
        toModule: "intake",
        reason: "module_edge",
      },
    ]);
    expect(
      walkRepositoryReachable(inventory, ["src/modules/output/view.ts"]).paths,
    ).toHaveLength(6);
  });
});
