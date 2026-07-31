import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  ARTIFACT_MANIFEST_LIMITS_V1,
  STATIC_ARTIFACT_BUDGET_V1,
  createArtifactDocuments,
  generateSyntheticNations,
  toCompactIndexRecord,
  writeArtifactDocuments,
} from "../../src/pipeline/artifact.mjs";
import { deriveBuildId, hashJson } from "../../src/pipeline/hashing.mjs";
import { toUrlSafeId } from "../../src/pipeline/identity.mjs";
import {
  loadLastKnownGoodSource,
  mergeSourceRefresh,
  verifyLastKnownGoodArtifact,
} from "../../src/pipeline/last-known-good.mjs";
import { completeSyntheticProvenance } from "../../src/pipeline/policy-validation.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const testParent = path.join(
  projectRoot,
  "dist",
  "pipeline-lkg-hardening-tests",
);
const generatedAt = "2026-07-31T18:00:00.000Z";

async function json(relativePath) {
  return JSON.parse(
    await readFile(path.resolve(projectRoot, relativePath), "utf8"),
  );
}

const [taxonomy, sourceRegistry, federalFixture, countyFixture] =
  await Promise.all([
    json("config/taxonomy.v1.json"),
    json("config/sources.v1.json"),
    json("fixtures/records/general-jurisdiction.valid.json"),
    json("fixtures/records/county-explicit.valid.json"),
  ]);
const records = [
  completeSyntheticProvenance(federalFixture),
  completeSyntheticProvenance(countyFixture),
];
const nations = generateSyntheticNations();

async function createFixture() {
  await mkdir(testParent, { recursive: true });
  const root = await mkdtemp(path.join(testParent, "artifact-"));
  const documents = createArtifactDocuments({
    records,
    nations,
    taxonomy,
    sourceRegistry,
    generatedAt,
    synthetic: true,
  });
  await writeArtifactDocuments({
    documents,
    outputDirectory: root,
    projectRoot,
  });
  return {
    root,
    cleanup: async () => {
      const resolvedRoot = path.resolve(root);
      const allowedParent = `${path.resolve(testParent)}${path.sep}`;
      assert.ok(resolvedRoot.startsWith(allowedParent));
      await rm(resolvedRoot, { recursive: true, force: true });
    },
  };
}

async function readArtifactJson(root, relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function writeManifest(root, manifest) {
  await writeFile(path.join(root, "manifest.json"), hashJson(manifest).content);
}

async function rewriteManifest(root, mutate, recomputeBuildId = true) {
  const manifest = await readArtifactJson(root, "manifest.json");
  mutate(manifest);
  if (recomputeBuildId) {
    manifest.buildId = deriveBuildId(manifest.assets);
  }
  await writeManifest(root, manifest);
}

async function rewriteAsset(root, relativePath, mutateDocument, mutateAsset) {
  const document = await readArtifactJson(root, relativePath);
  mutateDocument(document);
  const rewritten = hashJson(document);
  await writeFile(path.join(root, relativePath), rewritten.content);

  await rewriteManifest(root, (manifest) => {
    const asset = manifest.assets.find(
      ({ path: assetPath }) => assetPath === relativePath,
    );
    assert.ok(asset, `missing manifest asset ${relativePath}`);
    asset.sha256 = rewritten.sha256;
    asset.sizeBytes = rewritten.sizeBytes;
    mutateAsset?.(asset);
  });
}

async function withFixture(run) {
  const fixture = await createFixture();
  try {
    await run(fixture.root);
  } finally {
    await fixture.cleanup();
  }
}

test("last-known-good reuse rejects incomplete or inconsistent artifact packages", async (t) => {
  try {
    await t.test("loads a fully generated current artifact", async () => {
      await withFixture(async (root) => {
        const verified = await verifyLastKnownGoodArtifact(root);
        assert.equal(verified.manifest.artifactVersion, "1.1.0");
        assert.equal(verified.manifest.recordSchemaVersion, "1.1.0");
        assert.equal(verified.records.length, 2);

        const loaded = await loadLastKnownGoodSource(
          root,
          federalFixture.source.id,
        );
        assert.deepEqual(
          loaded.records.map(({ internalId }) => internalId),
          [federalFixture.internalId],
        );
        assert.equal(loaded.health?.recordCount, 1);
      });
    });

    for (const artifactVersion of [undefined, "1.0.0", "2.0.0"]) {
      await t.test(
        `rejects package version ${String(artifactVersion)}`,
        async () => {
          await withFixture(async (root) => {
            await rewriteManifest(root, (manifest) => {
              if (artifactVersion === undefined) {
                delete manifest.artifactVersion;
              } else {
                manifest.artifactVersion = artifactVersion;
              }
            });
            await assert.rejects(
              verifyLastKnownGoodArtifact(root),
              /artifact package version is unsupported/,
            );
          });
        },
      );
    }

    await t.test("rejects a legacy record schema version early", async () => {
      await withFixture(async (root) => {
        await rewriteManifest(root, (manifest) => {
          manifest.recordSchemaVersion = "1.0.0";
        });
        await assert.rejects(
          verifyLastKnownGoodArtifact(root),
          /record schema version is unsupported/,
        );
      });
    });

    await t.test(
      "binds source-registry and taxonomy artifacts to current config",
      async () => {
        await withFixture(async (root) => {
          await rewriteManifest(root, (manifest) => {
            manifest.sourceRegistryVersion = "1.1.0";
          });
          await assert.rejects(
            verifyLastKnownGoodArtifact(root),
            /source-registry version differs from configured registry/,
          );
        });
        await withFixture(async (root) => {
          await rewriteAsset(root, "taxonomy.json", (taxonomyDocument) => {
            taxonomyDocument.title = "Attacker-controlled taxonomy title";
          });
          await assert.rejects(
            verifyLastKnownGoodArtifact(root),
            /taxonomy differs from the configured taxonomy/,
          );
        });
      },
    );

    await t.test("recomputes and binds the build ID", async () => {
      await withFixture(async (root) => {
        await rewriteManifest(
          root,
          (manifest) => {
            manifest.buildId = `synthetic-${"f".repeat(20)}`;
          },
          false,
        );
        await assert.rejects(
          verifyLastKnownGoodArtifact(root),
          /build ID does not match assets/,
        );
      });
    });

    await t.test("requires every root asset and count field", async () => {
      await withFixture(async (root) => {
        await rewriteManifest(root, (manifest) => {
          manifest.assets = manifest.assets.filter(
            ({ path: assetPath }) => assetPath !== "coverage.json",
          );
        });
        await assert.rejects(
          verifyLastKnownGoodArtifact(root),
          /lacks required asset: coverage\.json/,
        );
      });
      await withFixture(async (root) => {
        await rewriteManifest(root, (manifest) => {
          manifest.recordCount += 1;
        });
        await assert.rejects(
          verifyLastKnownGoodArtifact(root),
          /record count does not match detail assets/,
        );
      });
    });

    await t.test("rejects unmanifested JSON and non-JSON files", async () => {
      await withFixture(async (root) => {
        await writeFile(path.join(root, "notes.txt"), "not an artifact asset");
        await assert.rejects(
          verifyLastKnownGoodArtifact(root),
          /contains a non-JSON file: notes\.txt/,
        );
      });
      await withFixture(async (root) => {
        await writeFile(path.join(root, "extra.json"), "{}\n");
        await assert.rejects(
          verifyLastKnownGoodArtifact(root),
          /contains an unmanifested file: extra\.json/,
        );
      });
    });

    await t.test("rejects symbolic links during inventory", async (subtest) => {
      await withFixture(async (root) => {
        let linkName = "linked.json";
        try {
          await symlink(
            path.join(root, "manifest.json"),
            path.join(root, linkName),
            "file",
          );
        } catch (error) {
          if (["EPERM", "EACCES", "ENOSYS"].includes(error.code)) {
            linkName = "linked-details";
            try {
              await symlink(
                path.join(root, "details"),
                path.join(root, linkName),
                "junction",
              );
            } catch (junctionError) {
              if (["EPERM", "EACCES", "ENOSYS"].includes(junctionError.code)) {
                subtest.skip(
                  `symbolic links unavailable: ${junctionError.code}`,
                );
                return;
              }
              throw junctionError;
            }
          } else {
            throw error;
          }
        }
        await assert.rejects(
          verifyLastKnownGoodArtifact(root),
          new RegExp(`contains a symbolic link: ${linkName}`),
        );
      });
    });

    await t.test(
      "preflights declared and actual budgets before parsing assets",
      async () => {
        await withFixture(async (root) => {
          await writeFile(
            path.join(root, "manifest.json"),
            " ".repeat(ARTIFACT_MANIFEST_LIMITS_V1.maxManifestBytes + 1),
          );
          await assert.rejects(
            verifyLastKnownGoodArtifact(root),
            /manifest exceeds static artifact budget/,
          );
        });
        await withFixture(async (root) => {
          await rewriteManifest(root, (manifest) => {
            manifest.assets.find(
              ({ path: assetPath }) => assetPath === "index/records.json",
            ).sizeBytes = STATIC_ARTIFACT_BUDGET_V1.maxIndexBytes + 1;
          });
          await assert.rejects(
            verifyLastKnownGoodArtifact(root),
            /compact index exceeds static artifact budget/,
          );
        });
        await withFixture(async (root) => {
          await writeFile(
            path.join(root, "index", "records.json"),
            "x".repeat(STATIC_ARTIFACT_BUDGET_V1.maxIndexBytes + 1),
          );
          await assert.rejects(
            verifyLastKnownGoodArtifact(root),
            /compact index exceeds static artifact budget/,
          );
        });
      },
    );

    await t.test(
      "does not return a partial shard when another detail is missing",
      async () => {
        await withFixture(async (root) => {
          const manifest = await readArtifactJson(root, "manifest.json");
          const countyDetail = manifest.assets.find(
            ({ path: assetPath, sourceIds }) =>
              assetPath.startsWith("details/") &&
              sourceIds.includes(countyFixture.source.id),
          );
          assert.ok(countyDetail);
          await unlink(path.join(root, countyDetail.path));
          await assert.rejects(
            loadLastKnownGoodSource(root, federalFixture.source.id),
            /missing a manifested file/,
          );
        });
      },
    );

    await t.test("binds each detail to its canonical filename", async () => {
      await withFixture(async (root) => {
        const manifest = await readArtifactJson(root, "manifest.json");
        const detail = manifest.assets.find(({ path: assetPath }) =>
          assetPath.startsWith("details/"),
        );
        assert.ok(detail);
        const renamedPath = "details/not-the-canonical-id.json";
        await rename(
          path.join(root, detail.path),
          path.join(root, renamedPath),
        );
        await rewriteManifest(root, (rewrittenManifest) => {
          rewrittenManifest.assets.find(
            ({ path: assetPath }) => assetPath === detail.path,
          ).path = renamedPath;
        });
        await assert.rejects(
          verifyLastKnownGoodArtifact(root),
          /detail path is not canonical/,
        );
      });
    });

    await t.test("binds manifest source tags to detail content", async () => {
      await withFixture(async (root) => {
        const manifest = await readArtifactJson(root, "manifest.json");
        const detail = manifest.assets.find(
          ({ path: assetPath, sourceIds }) =>
            assetPath.startsWith("details/") &&
            sourceIds.includes(federalFixture.source.id),
        );
        assert.ok(detail);
        await rewriteManifest(root, (rewrittenManifest) => {
          rewrittenManifest.assets.find(
            ({ path: assetPath }) => assetPath === detail.path,
          ).sourceIds = [countyFixture.source.id];
        });
        await assert.rejects(
          verifyLastKnownGoodArtifact(root),
          /manifest source tags do not match details\//,
        );
      });
    });

    await t.test(
      "binds each detail internal ID to its actual source",
      async () => {
        await withFixture(async (root) => {
          const manifest = await readArtifactJson(root, "manifest.json");
          const countyDetail = manifest.assets.find(
            ({ path: assetPath, sourceIds }) =>
              assetPath.startsWith("details/") &&
              sourceIds.includes(countyFixture.source.id),
          );
          assert.ok(countyDetail);
          await rewriteAsset(
            root,
            countyDetail.path,
            (detailDocument) => {
              detailDocument.record.source.id = federalFixture.source.id;
              detailDocument.record.source.recordId =
                federalFixture.source.recordId;
            },
            (asset) => {
              asset.sourceIds = [federalFixture.source.id];
            },
          );
          await assert.rejects(
            loadLastKnownGoodSource(root, federalFixture.source.id),
            /detail record identity is invalid/,
          );
        });
      },
    );

    await t.test(
      "parses every detail and rejects duplicate source identities",
      async () => {
        await withFixture(async (root) => {
          const manifest = await readArtifactJson(root, "manifest.json");
          const federalDetail = manifest.assets.find(
            ({ path: assetPath, sourceIds }) =>
              assetPath.startsWith("details/") &&
              sourceIds.includes(federalFixture.source.id),
          );
          assert.ok(federalDetail);
          const detailDocument = await readArtifactJson(
            root,
            federalDetail.path,
          );
          detailDocument.record.internalId =
            "psr:synthetic-county:duplicate-record";
          detailDocument.record.source.id = countyFixture.source.id;
          detailDocument.record.source.name = countyFixture.source.name;
          detailDocument.record.source.provider = countyFixture.source.provider;
          detailDocument.record.source.recordId = countyFixture.source.recordId;
          detailDocument.record.source.adapterId =
            countyFixture.source.adapterId;
          detailDocument.record.source.adapterVersion =
            countyFixture.source.adapterVersion;
          detailDocument.record.source.attribution =
            countyFixture.source.attribution;
          const rewritten = hashJson(detailDocument);
          const renamedPath = `details/${toUrlSafeId(detailDocument.record.internalId)}.json`;
          await writeFile(path.join(root, renamedPath), rewritten.content);
          await unlink(path.join(root, federalDetail.path));
          await rewriteManifest(root, (rewrittenManifest) => {
            const asset = rewrittenManifest.assets.find(
              ({ path: assetPath }) => assetPath === federalDetail.path,
            );
            asset.path = renamedPath;
            asset.sha256 = rewritten.sha256;
            asset.sizeBytes = rewritten.sizeBytes;
            asset.sourceIds = [countyFixture.source.id];
          });
          await assert.rejects(
            loadLastKnownGoodSource(root, federalFixture.source.id),
            /repeats source record identity/,
          );
        });
      },
    );

    await t.test(
      "validates every detail against the current record schema",
      async () => {
        await withFixture(async (root) => {
          const manifest = await readArtifactJson(root, "manifest.json");
          const detail = manifest.assets.find(({ path: assetPath }) =>
            assetPath.startsWith("details/"),
          );
          assert.ok(detail);
          await rewriteAsset(root, detail.path, (detailDocument) => {
            delete detailDocument.record.fieldProvenance;
          });
          await assert.rejects(
            verifyLastKnownGoodArtifact(root),
            /failed schema validation:[\s\S]*fieldProvenance/,
          );
        });
      },
    );

    await t.test(
      "rejects coherently retagged source metadata against current config",
      async () => {
        await withFixture(async (root) => {
          const manifest = await readArtifactJson(root, "manifest.json");
          const federalDetail = manifest.assets.find(
            ({ path: assetPath, sourceIds }) =>
              assetPath.startsWith("details/") &&
              sourceIds.includes(federalFixture.source.id),
          );
          assert.ok(federalDetail);
          let retaggedRecord;
          await rewriteAsset(root, federalDetail.path, (detailDocument) => {
            detailDocument.record.source.name = "Coherently Retagged Source";
            detailDocument.record.source.provider = "Retagged Provider";
            detailDocument.record.source.adapterId =
              countyFixture.source.adapterId;
            detailDocument.record.source.adapterVersion =
              countyFixture.source.adapterVersion;
            detailDocument.record.source.attribution = "Retagged Provider";
            for (const provenance of detailDocument.record.fieldProvenance) {
              provenance.adapterId = countyFixture.source.adapterId;
            }
            retaggedRecord = globalThis.structuredClone(detailDocument.record);
          });
          await rewriteAsset(root, "index/records.json", (indexDocument) => {
            const index = indexDocument.records.findIndex(
              ({ id }) => id === retaggedRecord.internalId,
            );
            assert.notEqual(index, -1);
            indexDocument.records[index] = toCompactIndexRecord(retaggedRecord);
          });
          await rewriteAsset(root, "coverage.json", (coverageDocument) => {
            const entry = coverageDocument.entries.find(
              ({ sourceId }) => sourceId === federalFixture.source.id,
            );
            entry.sourceName = retaggedRecord.source.name;
            entry.provider = retaggedRecord.source.provider;
          });
          await rewriteAsset(root, "source-health.json", (healthDocument) => {
            healthDocument.sources.find(
              ({ sourceId }) => sourceId === federalFixture.source.id,
            ).sourceName = retaggedRecord.source.name;
          });
          await assert.rejects(
            verifyLastKnownGoodArtifact(root),
            /record source\/adapter identity does not match source registry/,
          );
        });
      },
    );

    await t.test("requires exact index/detail consistency", async () => {
      await withFixture(async (root) => {
        await rewriteAsset(root, "index/records.json", (indexDocument) => {
          indexDocument.records[0].officialTitle = "Tampered title";
        });
        await assert.rejects(
          verifyLastKnownGoodArtifact(root),
          /index\/detail mismatch/,
        );
      });
    });

    await t.test(
      "requires source-health counts and membership to match",
      async () => {
        await withFixture(async (root) => {
          const manifest = await readArtifactJson(root, "manifest.json");
          const federalDetail = manifest.assets.find(
            ({ path: assetPath, sourceIds }) =>
              assetPath.startsWith("details/") &&
              sourceIds.includes(federalFixture.source.id),
          );
          assert.ok(federalDetail);
          await rewriteAsset(root, federalDetail.path, (detailDocument) => {
            detailDocument.record.sourceHealth.checkedAt =
              "2026-07-31T18:01:00.000Z";
          });
          await assert.rejects(
            verifyLastKnownGoodArtifact(root),
            /receipt differs from record health/,
          );
        });
        await withFixture(async (root) => {
          await rewriteAsset(root, "source-health.json", (healthDocument) => {
            healthDocument.sources.find(
              ({ sourceId }) => sourceId === federalFixture.source.id,
            ).recordCount += 1;
          });
          await assert.rejects(
            verifyLastKnownGoodArtifact(root),
            /source record count mismatch/,
          );
        });
        await withFixture(async (root) => {
          await rewriteAsset(
            root,
            "source-health.json",
            (healthDocument) => {
              healthDocument.sources = healthDocument.sources.filter(
                ({ sourceId }) => sourceId !== countyFixture.source.id,
              );
            },
            (asset) => {
              asset.sourceIds = [federalFixture.source.id];
            },
          );
          await assert.rejects(
            loadLastKnownGoodSource(root, federalFixture.source.id),
            /coverage and source-health memberships disagree/,
          );
        });
      },
    );
  } finally {
    const resolvedParent = path.resolve(testParent);
    const distRoot = path.resolve(projectRoot, "dist");
    assert.ok(resolvedParent.startsWith(`${distRoot}${path.sep}`));
    await rm(resolvedParent, { recursive: true, force: true });
  }
});

test("source refresh merging cannot cross source identities", async (t) => {
  const [federalRecord, countyRecord] = records;
  const healthFor = (record) => ({
    sourceId: record.source.id,
    status: "healthy",
    checkedAt: record.sourceHealth.checkedAt,
    dataAsOf: record.sourceHealth.dataAsOf,
    lastSuccessfulRetrievalAt: record.sourceHealth.lastSuccessfulRetrievalAt,
    usingLastKnownGood: false,
    stale: false,
    recordCount: 1,
    failureStage: null,
    message: null,
  });
  const failureFor = (sourceId) => ({
    ok: false,
    sourceId,
    checkedAt: "2026-08-01T18:00:00.000Z",
    failureStage: "fetch",
    publicMessage: "Synthetic source refresh failed.",
  });
  const federalHealth = healthFor(federalRecord);
  const countyHealth = healthFor(countyRecord);
  const federalFailure = failureFor(federalRecord.source.id);

  await t.test("preserves valid same-source fallback behavior", () => {
    const merged = mergeSourceRefresh({
      sourceId: federalRecord.source.id,
      refresh: federalFailure,
      previousRecords: [federalRecord],
      previousHealth: federalHealth,
    });

    assert.equal(merged.records.length, 1);
    assert.equal(merged.records[0].source.id, federalRecord.source.id);
    assert.equal(merged.records[0].sourceHealth.status, "degraded");
    assert.equal(merged.records[0].sourceHealth.usingLastKnownGood, true);
    assert.equal(merged.health.sourceId, federalRecord.source.id);
    assert.equal(merged.health.status, "degraded");
    assert.equal(merged.health.usingLastKnownGood, true);
    assert.equal(merged.health.dataAsOf, federalHealth.dataAsOf);
    assert.equal(federalRecord.sourceHealth.status, "healthy");
  });

  await t.test(
    "clones a valid same-source success without mutating inputs",
    () => {
      const refresh = {
        ok: true,
        records: [globalThis.structuredClone(federalRecord)],
        health: globalThis.structuredClone(federalHealth),
      };
      const previousRecords = [globalThis.structuredClone(federalRecord)];
      const previousHealth = globalThis.structuredClone(federalHealth);
      const refreshBefore = globalThis.structuredClone(refresh);
      const previousRecordsBefore = globalThis.structuredClone(previousRecords);
      const previousHealthBefore = globalThis.structuredClone(previousHealth);

      const merged = mergeSourceRefresh({
        sourceId: federalRecord.source.id,
        refresh,
        previousRecords,
        previousHealth,
      });

      assert.deepEqual(refresh, refreshBefore);
      assert.deepEqual(previousRecords, previousRecordsBefore);
      assert.deepEqual(previousHealth, previousHealthBefore);
      assert.notStrictEqual(merged.records, refresh.records);
      assert.notStrictEqual(merged.records[0], refresh.records[0]);
      assert.notStrictEqual(merged.health, refresh.health);
      assert.equal(merged.health.sourceId, federalRecord.source.id);
      assert.equal(merged.health.status, "healthy");
      assert.equal(merged.health.usingLastKnownGood, false);
      assert.equal(merged.health.stale, false);
      assert.equal(merged.health.recordCount, 1);
      assert.equal(merged.health.failureStage, null);
    },
  );

  await t.test("rejects a failure receipt for another source", () => {
    assert.throws(
      () =>
        mergeSourceRefresh({
          sourceId: federalRecord.source.id,
          refresh: failureFor(countyRecord.source.id),
        }),
      /source refresh failure does not match requested source/,
    );
  });

  await t.test("rejects foreign previous records", () => {
    assert.throws(
      () =>
        mergeSourceRefresh({
          sourceId: federalRecord.source.id,
          refresh: federalFailure,
          previousRecords: [countyRecord],
          previousHealth: federalHealth,
        }),
      /previous records do not match requested source/,
    );
  });

  await t.test("rejects foreign previous health", () => {
    assert.throws(
      () =>
        mergeSourceRefresh({
          sourceId: federalRecord.source.id,
          refresh: federalFailure,
          previousRecords: [federalRecord],
          previousHealth: countyHealth,
        }),
      /previous health does not match requested source/,
    );
  });

  await t.test("rejects successful health for another source", () => {
    assert.throws(
      () =>
        mergeSourceRefresh({
          sourceId: federalRecord.source.id,
          refresh: {
            ok: true,
            records: [federalRecord],
            health: countyHealth,
          },
        }),
      /source refresh health does not match requested source/,
    );
  });

  await t.test("rejects successful records for another source", () => {
    assert.throws(
      () =>
        mergeSourceRefresh({
          sourceId: federalRecord.source.id,
          refresh: {
            ok: true,
            records: [countyRecord],
            health: federalHealth,
          },
        }),
      /source refresh records do not match requested source/,
    );
  });
});
