import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  ARTIFACT_MANIFEST_LIMITS_V1,
  assertArtifactManifestLimits,
  createArtifactDocuments,
  generateSyntheticNations,
  writeArtifactDocuments,
} from "../../src/pipeline/artifact.mjs";
import {
  deriveBuildId,
  hashJson,
  sha256Bytes,
} from "../../src/pipeline/hashing.mjs";
import { completeSyntheticProvenance } from "../../src/pipeline/policy-validation.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const fixtureParent = path.join(
  projectRoot,
  "dist",
  "artifact-validator-hardening-tests",
);
const generatedAt = "2026-07-31T18:00:00.000Z";

async function json(relativePath) {
  return JSON.parse(
    await readFile(path.resolve(projectRoot, relativePath), "utf8"),
  );
}

const [
  taxonomy,
  sourceRegistry,
  federalFixture,
  countyFixture,
  accordFixture,
  artifactSchema,
] = await Promise.all([
  json("config/taxonomy.v1.json"),
  json("config/sources.v1.json"),
  json("fixtures/records/general-jurisdiction.valid.json"),
  json("fixtures/records/county-explicit.valid.json"),
  json("fixtures/records/intergovernmental-accord.valid.json"),
  json("schemas/artifact.schema.v1.json"),
]);
const records = [federalFixture, countyFixture, accordFixture].map((record) =>
  completeSyntheticProvenance(record),
);
const nations = generateSyntheticNations();

function createDocuments(options = {}) {
  return createArtifactDocuments({
    records,
    nations,
    taxonomy,
    sourceRegistry,
    generatedAt,
    synthetic: true,
    ...options,
  });
}

async function createValidatorFixture() {
  await mkdir(fixtureParent, { recursive: true });
  const root = await mkdtemp(path.join(fixtureParent, "artifact-"));
  await writeArtifactDocuments({
    documents: createDocuments(),
    outputDirectory: root,
    projectRoot,
  });
  return {
    root,
    cleanup: async () => {
      const resolved = path.resolve(root);
      assert.ok(
        resolved.startsWith(`${path.resolve(fixtureParent)}${path.sep}`),
      );
      await rm(resolved, { recursive: true, force: true });
    },
  };
}

function runValidator(root) {
  return spawnSync(
    process.execPath,
    ["scripts/validate-artifact.mjs", "--dir", root],
    {
      cwd: projectRoot,
      encoding: "utf8",
    },
  );
}

test("manifest limits are explicit, versioned, and schema-bound", () => {
  assert.deepEqual(ARTIFACT_MANIFEST_LIMITS_V1, {
    version: "1.0.0",
    maxManifestBytes: 4 * 1024 * 1024,
    maxHashedAssets: 20_000,
  });
  assert.equal(
    artifactSchema.$defs.manifest.properties.assets.maxItems,
    ARTIFACT_MANIFEST_LIMITS_V1.maxHashedAssets,
  );

  const manifest = { assets: [] };
  const metrics = assertArtifactManifestLimits(manifest);
  assert.deepEqual(metrics, {
    manifestBytes: Buffer.byteLength(hashJson(manifest).content, "utf8"),
    hashedAssetCount: 0,
  });
  assert.doesNotThrow(() =>
    assertArtifactManifestLimits(manifest, {
      ...ARTIFACT_MANIFEST_LIMITS_V1,
      maxManifestBytes: metrics.manifestBytes,
    }),
  );
  assert.throws(
    () =>
      assertArtifactManifestLimits(manifest, {
        ...ARTIFACT_MANIFEST_LIMITS_V1,
        maxManifestBytes: metrics.manifestBytes - 1,
      }),
    /manifest exceeds byte limit/,
  );
  assert.throws(
    () =>
      assertArtifactManifestLimits({
        assets: Array.from(
          { length: ARTIFACT_MANIFEST_LIMITS_V1.maxHashedAssets + 1 },
          () => null,
        ),
      }),
    /manifest exceeds hashed asset count limit/,
  );
});

test("artifact packaging rejects oversized manifests before writing", async () => {
  assert.throws(
    () =>
      createDocuments({
        manifestLimits: {
          ...ARTIFACT_MANIFEST_LIMITS_V1,
          maxHashedAssets: 6,
        },
      }),
    /manifest exceeds hashed asset count limit/,
  );
  assert.throws(
    () =>
      createDocuments({
        manifestLimits: {
          ...ARTIFACT_MANIFEST_LIMITS_V1,
          maxManifestBytes: 1,
        },
      }),
    /manifest exceeds byte limit/,
  );

  await mkdir(fixtureParent, { recursive: true });
  const output = await mkdtemp(path.join(fixtureParent, "writer-"));
  const sentinel = path.join(output, "sentinel.txt");
  await writeFile(sentinel, "preserve me", "utf8");
  try {
    await assert.rejects(
      writeArtifactDocuments({
        documents: createDocuments(),
        outputDirectory: output,
        projectRoot,
        manifestLimits: {
          ...ARTIFACT_MANIFEST_LIMITS_V1,
          maxManifestBytes: 1,
        },
      }),
      /manifest exceeds byte limit/,
    );
    await assert.doesNotReject(readFile(sentinel, "utf8"));
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("validator rejects non-JSON files before parsing the manifest", async () => {
  const fixture = await createValidatorFixture();
  try {
    await Promise.all([
      writeFile(path.join(fixture.root, "unmanifested.txt"), "unexpected"),
      writeFile(path.join(fixture.root, "manifest.json"), "{"),
    ]);
    const result = runValidator(fixture.root);
    assert.equal(result.status, 1);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /artifact contains an unmanifested non-JSON file: unmanifested\.txt/,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("validator rejects symlinks before parsing the manifest", async (t) => {
  const fixture = await createValidatorFixture();
  try {
    let linkName = "manifest-alias.json";
    try {
      await symlink("manifest.json", path.join(fixture.root, linkName), "file");
    } catch (error) {
      if (error?.code === "EPERM" || error?.code === "EACCES") {
        linkName = "details-alias";
        try {
          await symlink(
            path.join(fixture.root, "details"),
            path.join(fixture.root, linkName),
            "junction",
          );
        } catch (junctionError) {
          if (
            junctionError?.code === "EPERM" ||
            junctionError?.code === "EACCES"
          ) {
            t.skip(
              `filesystem does not permit symlink fixtures: ${junctionError.code}`,
            );
            return;
          }
          throw junctionError;
        }
      } else {
        throw error;
      }
    }
    await writeFile(path.join(fixture.root, "manifest.json"), "{");
    const result = runValidator(fixture.root);
    assert.equal(result.status, 1);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      new RegExp(`artifact contains a symlink: ${linkName}`),
    );
  } finally {
    await fixture.cleanup();
  }
});

test("validator caps a regular manifest before parsing it", async () => {
  const fixture = await createValidatorFixture();
  try {
    await writeFile(
      path.join(fixture.root, "manifest.json"),
      Buffer.alloc(ARTIFACT_MANIFEST_LIMITS_V1.maxManifestBytes + 1, 0x20),
    );
    const result = runValidator(fixture.root);
    assert.equal(result.status, 1);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /artifact manifest exceeds byte limit/,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("validator rejects unsupported manifest version pairs", async () => {
  const unsupportedPairs = [
    ["1.2.0", "1.3.0"],
    ["1.3.0", "1.2.0"],
    ["1.2.0", "1.2.0"],
  ];

  for (const [artifactVersion, recordSchemaVersion] of unsupportedPairs) {
    const fixture = await createValidatorFixture();
    try {
      const manifestPath = path.join(fixture.root, "manifest.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      manifest.artifactVersion = artifactVersion;
      manifest.recordSchemaVersion = recordSchemaVersion;
      await writeFile(manifestPath, hashJson(manifest).content, "utf8");

      const result = runValidator(fixture.root);
      assert.equal(result.status, 1);
      assert.match(
        `${result.stdout}\n${result.stderr}`,
        new RegExp(
          `manifest version pair is unsupported: expected 1\\.4\\.0/1\\.4\\.0, received ${artifactVersion.replaceAll(".", "\\.")}/${recordSchemaVersion.replaceAll(".", "\\.")}`,
        ),
      );
    } finally {
      await fixture.cleanup();
    }
  }
});

test("validator rejects unmanifested directories before asset reads", async () => {
  const fixture = await createValidatorFixture();
  try {
    await mkdir(path.join(fixture.root, "unexpected"));
    await writeFile(path.join(fixture.root, "coverage.json"), "{");
    const result = runValidator(fixture.root);
    assert.equal(result.status, 1);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /artifact contains an unmanifested directory/,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("validator binds each detail file path to its record identity", async () => {
  const fixture = await createValidatorFixture();
  try {
    const manifestPath = path.join(fixture.root, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const [firstPath, secondPath] = manifest.assets
      .map(({ path: assetPath }) => assetPath)
      .filter((assetPath) => assetPath.startsWith("details/"));
    const [firstContent, secondContent] = await Promise.all([
      readFile(path.join(fixture.root, firstPath)),
      readFile(path.join(fixture.root, secondPath)),
    ]);
    await Promise.all([
      writeFile(path.join(fixture.root, firstPath), secondContent),
      writeFile(path.join(fixture.root, secondPath), firstContent),
    ]);
    for (const [assetPath, content] of [
      [firstPath, secondContent],
      [secondPath, firstContent],
    ]) {
      const asset = manifest.assets.find(
        ({ path: value }) => value === assetPath,
      );
      asset.sha256 = sha256Bytes(content);
      asset.sizeBytes = content.byteLength;
    }
    manifest.buildId = deriveBuildId(manifest.assets);
    await writeFile(manifestPath, hashJson(manifest).content, "utf8");

    const result = runValidator(fixture.root);
    assert.equal(result.status, 1);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /detail document path does not match record identity/,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("validator binds the manifest synthetic discriminator to the Nation collection", async () => {
  const fixture = await createValidatorFixture();
  try {
    const manifestPath = path.join(fixture.root, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.synthetic = false;
    await writeFile(manifestPath, hashJson(manifest).content, "utf8");

    const result = runValidator(fixture.root);
    assert.equal(result.status, 1);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /manifest and Nation baseline synthetic flags must match/,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("validator rejects semantic Nation identity collisions after hash verification", async () => {
  const fixture = await createValidatorFixture();
  try {
    const manifestPath = path.join(fixture.root, "manifest.json");
    const nationsPath = path.join(fixture.root, "nations.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const nationDocument = JSON.parse(await readFile(nationsPath, "utf8"));
    nationDocument.nations[1].officialName =
      nationDocument.nations[0].officialName;

    const nationContent = hashJson(nationDocument).content;
    await writeFile(nationsPath, nationContent, "utf8");
    const nationAsset = manifest.assets.find(
      ({ path: assetPath }) => assetPath === "nations.json",
    );
    nationAsset.sha256 = sha256Bytes(Buffer.from(nationContent, "utf8"));
    nationAsset.sizeBytes = Buffer.byteLength(nationContent, "utf8");
    manifest.buildId = deriveBuildId(manifest.assets);
    await writeFile(manifestPath, hashJson(manifest).content, "utf8");

    const result = runValidator(fixture.root);
    assert.equal(result.status, 1);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /collides with identity/,
    );
  } finally {
    await fixture.cleanup();
  }
});
