// @vitest-environment node

import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const temporaryParent = path.join(
  projectRoot,
  "dist",
  "phase-7-artifact-tests",
);
const fixedGeneratedAt = "3785-01-01T00:00:00.000Z";

const exactInjectedArtifactPaths = [
  {
    contractPath: "dist/data/spatial.json",
    relativePath: "spatial.json",
  },
  {
    contractPath: "dist/data/experimental/spatial.json",
    relativePath: "experimental/spatial.json",
  },
] as const;

const forbiddenPathSegments = ["experimental", "spatial"] as const;
const forbiddenBuildMarkers = [
  "s0-impossible:",
  "impossible_synthetic_geometry",
  "s0-axis-aligned-box-topology",
] as const;
const sourceMapReference = "sourceMappingURL=";
const sourceMapJsonKeys = ['"version":3', '"sources":', '"mappings":'];

interface PublicFileInventoryEntry {
  readonly relativePath: string;
  readonly content: Buffer;
  readonly sha256: string;
}

interface ManifestAsset {
  readonly path: string;
  readonly sha256: string;
}

interface ArtifactManifest {
  readonly generatedAt: string;
  readonly assets: readonly ManifestAsset[];
}

interface RollupInspection {
  readonly chunkCount: number;
  readonly moduleIds: readonly string[];
  readonly dynamicImports: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/");
}

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertSafeTemporaryRoot(candidate: string): string {
  const root = path.resolve(candidate);
  const parent = path.resolve(temporaryParent);
  if (root === parent || !root.startsWith(`${parent}${path.sep}`)) {
    throw new Error(`unsafe temporary artifact root: ${root}`);
  }
  return root;
}

async function createTemporaryRoot(prefix: string): Promise<string> {
  await mkdir(temporaryParent, { recursive: true });
  return assertSafeTemporaryRoot(
    await mkdtemp(path.join(temporaryParent, prefix)),
  );
}

async function removeTemporaryRoot(candidate: string): Promise<void> {
  await rm(assertSafeTemporaryRoot(candidate), {
    recursive: true,
    force: true,
  });
}

function commandOutput(result: SpawnSyncReturns<string>): string {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
}

function runNodeScript(
  arguments_: readonly string[],
): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [...arguments_], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024,
  });
}

function assertCommandSucceeded(
  result: SpawnSyncReturns<string>,
  label: string,
): void {
  if (result.status !== 0) {
    throw new Error(
      `${label} failed with status ${String(result.status)}:\n${commandOutput(result)}`,
    );
  }
}

function buildSyntheticArtifact(outputDirectory: string): void {
  const result = runNodeScript([
    "scripts/build-synthetic-artifact.mjs",
    "--out",
    outputDirectory,
    "--generated-at",
    fixedGeneratedAt,
  ]);
  assertCommandSucceeded(result, "fixed-time synthetic artifact build");
}

function runArtifactValidator(
  artifactDirectory: string,
): SpawnSyncReturns<string> {
  return runNodeScript([
    "scripts/validate-artifact.mjs",
    "--dir",
    artifactDirectory,
  ]);
}

function assertSafePublicPath(relativePath: string): void {
  const normalized = normalizePath(relativePath);
  const segments = normalized.split("/");
  if (
    normalized.length === 0 ||
    path.posix.isAbsolute(normalized) ||
    path.win32.isAbsolute(relativePath) ||
    segments.some(
      (segment) => segment === "" || segment === "." || segment === "..",
    )
  ) {
    throw new Error(`invalid public relative path: ${relativePath}`);
  }

  const forbiddenSegment = segments.find((segment) => {
    const normalizedSegment = segment.toLowerCase();
    const normalizedStem = path.posix.parse(normalizedSegment).name;
    return [normalizedSegment, normalizedStem].some((candidate) =>
      forbiddenPathSegments.includes(
        candidate as (typeof forbiddenPathSegments)[number],
      ),
    );
  });
  if (forbiddenSegment !== undefined) {
    throw new Error(
      `public path contains forbidden segment ${forbiddenSegment}: ${relativePath}`,
    );
  }
  if (normalized.toLowerCase().endsWith(".map")) {
    throw new Error(`public path emits a source map: ${relativePath}`);
  }
}

function assertSafePublicBytes(
  relativePath: string,
  content: string | Uint8Array,
): void {
  const bytes =
    typeof content === "string"
      ? Buffer.from(content, "utf8")
      : Buffer.from(content);
  for (const marker of forbiddenBuildMarkers) {
    if (bytes.includes(Buffer.from(marker, "utf8"))) {
      throw new Error(
        `public file contains forbidden S0 marker ${marker}: ${relativePath}`,
      );
    }
  }
  if (bytes.includes(Buffer.from(sourceMapReference, "utf8"))) {
    throw new Error(
      `public file contains a source-map reference: ${relativePath}`,
    );
  }

  const text = bytes.toString("utf8");
  if (sourceMapJsonKeys.every((key) => text.includes(key))) {
    throw new Error(`public file contains source-map content: ${relativePath}`);
  }
  if (/(?:^|[\\/"'`])(?:experimental|spatial)(?=$|[\\/"'`.?#:])/iu.test(text)) {
    throw new Error(
      `public file contains a forbidden route or import reference: ${relativePath}`,
    );
  }
}

function assertSafeRollupModuleId(moduleId: string): void {
  const normalized = normalizePath(moduleId).replaceAll("\0", "");
  const s0SourceRoot = normalizePath(
    path.resolve(projectRoot, "src/experimental/spatial"),
  );
  const withoutQuery = normalized.split("?", 1)[0];
  if (
    withoutQuery === s0SourceRoot ||
    withoutQuery.startsWith(`${s0SourceRoot}/`) ||
    withoutQuery.includes("/src/experimental/spatial/")
  ) {
    throw new Error(`Rollup graph contains an S0 module: ${moduleId}`);
  }
}

function optionalStringArray(value: unknown, label: string): readonly string[] {
  if (value === undefined) {
    return [];
  }
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`${label} must be an array of strings`);
  }
  return value;
}

function inspectRollupResult(result: unknown): RollupInspection {
  const outputGroups = Array.isArray(result) ? result : [result];
  const moduleIds: string[] = [];
  const dynamicImports: string[] = [];
  let chunkCount = 0;

  for (const [groupIndex, outputGroup] of outputGroups.entries()) {
    if (!isRecord(outputGroup) || !Array.isArray(outputGroup.output)) {
      throw new Error(`Vite output group ${groupIndex} lacks Rollup output`);
    }
    for (const outputItem of outputGroup.output) {
      if (!isRecord(outputItem) || typeof outputItem.fileName !== "string") {
        throw new Error("Rollup output item is malformed");
      }
      assertSafePublicPath(outputItem.fileName);

      if (outputItem.type === "asset") {
        if (
          typeof outputItem.source !== "string" &&
          !(outputItem.source instanceof Uint8Array)
        ) {
          throw new Error(
            `Rollup asset lacks byte content: ${outputItem.fileName}`,
          );
        }
        assertSafePublicBytes(outputItem.fileName, outputItem.source);
        continue;
      }
      if (outputItem.type !== "chunk") {
        throw new Error(
          `unknown Rollup output type: ${String(outputItem.type)}`,
        );
      }

      chunkCount += 1;
      if (outputItem.map !== null && outputItem.map !== undefined) {
        throw new Error(
          `Rollup emitted an in-memory source map: ${outputItem.fileName}`,
        );
      }
      if (typeof outputItem.code !== "string") {
        throw new Error(`Rollup chunk lacks code: ${outputItem.fileName}`);
      }
      assertSafePublicBytes(outputItem.fileName, outputItem.code);
      if (!isRecord(outputItem.modules)) {
        throw new Error(
          `Rollup chunk lacks its module graph: ${outputItem.fileName}`,
        );
      }
      for (const moduleId of Object.keys(outputItem.modules)) {
        assertSafeRollupModuleId(moduleId);
        moduleIds.push(moduleId);
      }

      for (const field of [
        "imports",
        "dynamicImports",
        "implicitlyLoadedBefore",
        "referencedFiles",
      ] as const) {
        const references = optionalStringArray(
          outputItem[field],
          `Rollup ${field} for ${outputItem.fileName}`,
        );
        for (const reference of references) {
          assertSafePublicPath(reference);
        }
        if (field === "dynamicImports") {
          dynamicImports.push(...references);
        }
      }
    }
  }

  if (chunkCount === 0 || moduleIds.length === 0) {
    throw new Error("Rollup graph inspection was vacuous");
  }
  return {
    chunkCount,
    moduleIds: moduleIds.sort(compareCodePoints),
    dynamicImports: dynamicImports.sort(compareCodePoints),
  };
}

async function inventoryPublicFiles(
  publicRoot: string,
): Promise<readonly PublicFileInventoryEntry[]> {
  const inventory: PublicFileInventoryEntry[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => compareCodePoints(left.name, right.name));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = normalizePath(
        path.relative(publicRoot, absolutePath),
      );
      if (entry.isSymbolicLink()) {
        throw new Error(`public build contains a symlink: ${relativePath}`);
      }
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        throw new Error(
          `public build contains a non-file entry: ${relativePath}`,
        );
      }
      const content = await readFile(absolutePath);
      inventory.push({
        relativePath,
        content,
        sha256: createHash("sha256").update(content).digest("hex"),
      });
    }
  }

  await visit(publicRoot);
  return inventory.sort((left, right) =>
    compareCodePoints(left.relativePath, right.relativePath),
  );
}

function parseManifest(content: Buffer): ArtifactManifest {
  const value: unknown = JSON.parse(content.toString("utf8"));
  if (
    !isRecord(value) ||
    typeof value.generatedAt !== "string" ||
    !Array.isArray(value.assets)
  ) {
    throw new Error("artifact manifest is malformed");
  }
  const assets = value.assets.map((asset, index) => {
    if (
      !isRecord(asset) ||
      typeof asset.path !== "string" ||
      typeof asset.sha256 !== "string"
    ) {
      throw new Error(`artifact manifest asset ${index} is malformed`);
    }
    return { path: asset.path, sha256: asset.sha256 };
  });
  return { generatedAt: value.generatedAt, assets };
}

describe("S0 public-artifact non-interference", () => {
  it.each(exactInjectedArtifactPaths)(
    "rejects the exact injected path $contractPath as unmanifested",
    async ({ contractPath, relativePath }) => {
      const artifactRoot = await createTemporaryRoot("injected-");
      try {
        buildSyntheticArtifact(artifactRoot);
        assertCommandSucceeded(
          runArtifactValidator(artifactRoot),
          "clean artifact validation before injection",
        );
        expect(contractPath).toBe(`dist/data/${relativePath}`);
        const injectionPath = path.resolve(artifactRoot, relativePath);
        expect(injectionPath.startsWith(`${artifactRoot}${path.sep}`)).toBe(
          true,
        );
        await mkdir(path.dirname(injectionPath), { recursive: true });
        await writeFile(injectionPath, '{"planted":"unmanifested"}\n', "utf8");

        const result = runArtifactValidator(artifactRoot);
        expect(result.status).toBe(1);
        expect(commandOutput(result)).toMatch(
          /artifact contains missing or unmanifested JSON files/,
        );
      } finally {
        await removeTemporaryRoot(artifactRoot);
      }
    },
    30_000,
  );

  it("keeps a fixed-time production build free of S0 paths, bytes, maps, manifest entries, and Rollup modules", async () => {
    const publicRoot = await createTemporaryRoot("production-");
    try {
      const viteResult = await build({
        root: projectRoot,
        configFile: path.join(projectRoot, "vite.config.ts"),
        logLevel: "silent",
        build: {
          outDir: publicRoot,
          emptyOutDir: true,
          sourcemap: false,
          write: true,
        },
      });
      const rollupInspection = inspectRollupResult(viteResult);
      expect(rollupInspection.chunkCount).toBeGreaterThan(0);
      expect(
        rollupInspection.moduleIds.some((moduleId) =>
          normalizePath(moduleId).endsWith("/src/main.tsx"),
        ),
      ).toBe(true);
      for (const dynamicImport of rollupInspection.dynamicImports) {
        assertSafePublicPath(dynamicImport);
      }

      const artifactRoot = path.join(publicRoot, "data");
      buildSyntheticArtifact(artifactRoot);
      assertCommandSucceeded(
        runArtifactValidator(artifactRoot),
        "fixed-time artifact validation",
      );

      const inventory = await inventoryPublicFiles(publicRoot);
      expect(inventory.length).toBeGreaterThan(0);
      expect(
        new Set(inventory.map(({ relativePath }) => relativePath)).size,
      ).toBe(inventory.length);
      expect(
        inventory.some(({ relativePath }) => relativePath === "index.html"),
      ).toBe(true);
      expect(
        inventory.some(
          ({ relativePath }) => relativePath === "data/manifest.json",
        ),
      ).toBe(true);

      for (const entry of inventory) {
        assertSafePublicPath(entry.relativePath);
        assertSafePublicBytes(entry.relativePath, entry.content);
        expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/u);
      }

      const inventoryByPath = new Map(
        inventory.map((entry) => [entry.relativePath, entry] as const),
      );
      const manifestEntry = inventoryByPath.get("data/manifest.json");
      if (manifestEntry === undefined) {
        throw new Error("fixed-time production build lacks data/manifest.json");
      }
      const manifest = parseManifest(manifestEntry.content);
      expect(manifest.generatedAt).toBe(fixedGeneratedAt);
      expect(manifest.assets.length).toBeGreaterThan(0);
      for (const asset of manifest.assets) {
        assertSafePublicPath(asset.path);
        const publicAsset = inventoryByPath.get(`data/${asset.path}`);
        expect(
          publicAsset,
          `missing manifest asset ${asset.path}`,
        ).toBeDefined();
        expect(publicAsset?.sha256).toBe(asset.sha256);
      }

      for (const entry of inventory.filter(
        ({ relativePath }) =>
          relativePath.startsWith("data/") && relativePath.endsWith(".json"),
      )) {
        const document: unknown = JSON.parse(entry.content.toString("utf8"));
        if (isRecord(document) && "generatedAt" in document) {
          expect(document.generatedAt).toBe(fixedGeneratedAt);
        }
      }
    } finally {
      await removeTemporaryRoot(publicRoot);
    }
  }, 60_000);

  it("rejects planted leaks so the production inspection cannot pass vacuously", () => {
    expect(exactInjectedArtifactPaths).toEqual([
      {
        contractPath: "dist/data/spatial.json",
        relativePath: "spatial.json",
      },
      {
        contractPath: "dist/data/experimental/spatial.json",
        relativePath: "experimental/spatial.json",
      },
    ]);
    expect(forbiddenBuildMarkers).toEqual([
      "s0-impossible:",
      "impossible_synthetic_geometry",
      "s0-axis-aligned-box-topology",
    ]);

    for (const plantedPath of [
      "spatial.json",
      "assets/experimental/chunk.js",
      "assets/app.js.map",
    ]) {
      expect(() => assertSafePublicPath(plantedPath)).toThrow();
    }
    expect(() =>
      assertSafePublicPath("assets/geospatial-index.js"),
    ).not.toThrow();

    for (const marker of forbiddenBuildMarkers) {
      expect(() =>
        assertSafePublicBytes(
          "assets/app.js",
          `const leak = ${JSON.stringify(marker)};`,
        ),
      ).toThrow(
        new RegExp(marker.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"),
      );
    }
    expect(() =>
      assertSafePublicBytes(
        "assets/app.js",
        'import("./experimental/chunk.js");',
      ),
    ).toThrow(/forbidden route or import reference/u);
    expect(() =>
      assertSafePublicBytes("index.html", '<a href="/spatial">leak</a>'),
    ).toThrow(/forbidden route or import reference/u);
    expect(() =>
      assertSafePublicBytes("assets/app.js", "//# sourceMappingURL=app.js.map"),
    ).toThrow(/source-map reference/u);
    expect(() =>
      assertSafePublicBytes(
        "assets/disguised.json",
        '{"version":3,"sources":["app.ts"],"names":[],"mappings":"AAAA"}',
      ),
    ).toThrow(/source-map content/u);
    expect(() =>
      assertSafePublicBytes(
        "assets/app.js",
        'const safeDescription = "geospatial analysis is not a path segment";',
      ),
    ).not.toThrow();

    const plantedS0Module = path.join(
      projectRoot,
      "src",
      "experimental",
      "spatial",
      "observation.ts",
    );
    expect(() => assertSafeRollupModuleId(plantedS0Module)).toThrow(
      /Rollup graph contains an S0 module/u,
    );
    expect(() =>
      inspectRollupResult({
        output: [
          {
            type: "chunk",
            fileName: "assets/app.js",
            code: "export {};",
            map: null,
            modules: { [path.join(projectRoot, "src", "main.tsx")]: {} },
            imports: [],
            dynamicImports: ["assets/spatial/chunk.js"],
            implicitlyLoadedBefore: [],
            referencedFiles: [],
          },
        ],
      }),
    ).toThrow(/forbidden segment/u);
    expect(() =>
      inspectRollupResult({
        output: [
          {
            type: "chunk",
            fileName: "assets/app.js",
            code: "export {};",
            map: {},
            modules: { [path.join(projectRoot, "src", "main.tsx")]: {} },
            imports: [],
            dynamicImports: [],
            implicitlyLoadedBefore: [],
            referencedFiles: [],
          },
        ],
      }),
    ).toThrow(/in-memory source map/u);
  });
});
