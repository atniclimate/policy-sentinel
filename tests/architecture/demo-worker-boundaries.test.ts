import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { isForbiddenFromPublicEntry } from "./module-manifest.mjs";
import {
  readRepositoryFiles,
  walkRepositoryReachable,
  type RepositoryFiles,
} from "./module-graph";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const SOURCE = /\.(?:[cm]?[jt]sx?)$/u;

// Private context and the local entry (rule 9), plus development-only scripts:
// demo index acquisition (D-125) and the Jev and Parallel tooling (D-114).
function isForbiddenDemoTarget(path: string): boolean {
  return (
    isForbiddenFromPublicEntry(path) ||
    path === "scripts/acquire-demo-index.mjs" ||
    path.startsWith("scripts/dev-ai/")
  );
}

/** Each forbidden file a demo/ or worker/ source file reaches, and each loader the walk cannot read. */
function demoWorkerViolations(files: RepositoryFiles): string[] {
  return [...files.keys()]
    .filter((path) => /^(?:demo|worker)\//u.test(path) && SOURCE.test(path))
    .flatMap((path) => {
      const { paths, diagnostics } = walkRepositoryReachable(files, [path]);
      return [
        ...paths
          .filter(isForbiddenDemoTarget)
          .map((target) => `${path} -> ${target}`),
        ...diagnostics.map(
          (diagnostic) => `${path} -> ${diagnostic.code} in ${diagnostic.path}`,
        ),
      ];
    })
    .sort();
}

const fixture = (sources: Record<string, string>): RepositoryFiles =>
  new Map(Object.entries(sources));

describe("Demo page and Worker import boundary (design T1.1, rule 9)", () => {
  it("reaches no private, local-only or development-only file from any demo or Worker file", () => {
    const files = readRepositoryFiles(REPO_ROOT);
    expect(files.has("demo/main.tsx")).toBe(true);
    expect(files.has("worker/src/index.ts")).toBe(true);
    expect(demoWorkerViolations(files)).toEqual([]);
  }, 15_000);

  it.each([
    [
      "a static private import",
      "demo/main.tsx",
      'import "../src/modules/private/notes";',
      "src/modules/private/notes.ts",
    ],
    [
      "a dynamic import of the private barrel",
      "demo/app/panel.tsx",
      'void import("../../src/engine/index");',
      "src/engine/index.ts",
    ],
    [
      "a type import of the local entry",
      "worker/src/sources/court.ts",
      'import type { Local } from "../../../src/local-main";',
      "src/local-main.tsx",
    ],
    [
      "a re-export of the index acquisition script",
      "worker/src/index.ts",
      'export * from "../../scripts/acquire-demo-index.mjs";',
      "scripts/acquire-demo-index.mjs",
    ],
    [
      "a required development AI script",
      "worker/src/dev.ts",
      'require("../../scripts/dev-ai/clients.mjs");',
      "scripts/dev-ai/clients.mjs",
    ],
    [
      "a relay through shared demo code",
      "demo/main.tsx",
      'import "../src/demo/relay";',
      "src/modules/private/notes.ts",
    ],
  ])("fails on %s", (_name, importer, source, target) => {
    const files = fixture({
      [importer]: source,
      "src/demo/relay.ts": 'export * from "../modules/private/notes";',
      "src/modules/private/notes.ts": "",
      "src/engine/index.ts": "",
      "src/local-main.tsx": "",
      "scripts/acquire-demo-index.mjs": "",
      "scripts/dev-ai/clients.mjs": "",
    });
    expect(demoWorkerViolations(files)).toContain(`${importer} -> ${target}`);
  });

  it("fails on a computed import that could hide a forbidden target", () => {
    expect(
      demoWorkerViolations(fixture({ "demo/main.tsx": "void import(name);" })),
    ).toEqual(["demo/main.tsx -> computed_loader in demo/main.tsx"]);
  });

  it("accepts packages and shared demo code", () => {
    expect(
      demoWorkerViolations(
        fixture({
          "demo/main.tsx":
            'import { render } from "preact"; import "../src/demo/copy";',
          "worker/src/index.ts": 'import "../../src/demo/copy";',
          "src/demo/copy.ts": "export const COPY = {};",
        }),
      ),
    ).toEqual([]);
  });
});
