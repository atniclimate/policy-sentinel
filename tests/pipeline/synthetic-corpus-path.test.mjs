import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import sourceRegistry from "../../config/sources.v1.json" with { type: "json" };
import taxonomy from "../../config/taxonomy.v1.json" with { type: "json" };
import recordSchema from "../../schemas/record.schema.v1.json" with { type: "json" };
import corpusSchema from "../../schemas/analyzed-corpus.schema.v1.json" with { type: "json" };
import packSchema from "../../schemas/curated-document-pack.schema.v1.json" with { type: "json" };
import {
  applicationCorpusForVerification,
  createSyntheticApplicationCorpus,
  syntheticApplicationRecords,
  syntheticCorpusFixtures,
  fixtureTextForCitation,
} from "../../src/pipeline/synthetic-corpus-path.mjs";
import {
  canonicalCorpusDigest,
  parseAnalyzedCorpus,
  serializeAnalyzedCorpus,
} from "../../src/pipeline/analyzed-corpus.mjs";
import {
  createCuratedDocumentPack,
  replayCuratedDocumentPack,
} from "../../src/pipeline/curated-document-pack.mjs";
import {
  createArtifactDocuments,
  generateSyntheticNations,
} from "../../src/pipeline/artifact.mjs";

const clone = globalThis.structuredClone;
function reseal(value) {
  const body = { ...value };
  delete body.contentDigest;
  value.contentDigest = canonicalCorpusDigest(body);
  return value;
}
const build = (
  records,
  registry = sourceRegistry,
  configuredTaxonomy = taxonomy,
) =>
  createSyntheticApplicationCorpus({
    records,
    registry,
    configuredTaxonomy,
    generatedAt: "2026-09-04T18:00:00Z",
  });

test("one existing corpus supplies all three unchanged ordinary artifact records", () => {
  const corpus = applicationCorpusForVerification();
  assert.equal(corpus.schemaVersion, "1.1.0");
  assert.equal(corpus.recordEntries.length, 3);
  const ajv = new Ajv2020({ strict: true });
  addFormats(ajv);
  ajv.addSchema(recordSchema);
  const validate = ajv.compile(corpusSchema);
  assert.equal(validate(corpus), true, JSON.stringify(validate.errors));
  const settings = {
    nations: generateSyntheticNations(),
    taxonomy,
    sourceRegistry,
    generatedAt: "2026-09-04T18:00:00Z",
    synthetic: true,
  };
  assert.deepEqual(
    createArtifactDocuments({
      ...settings,
      records: syntheticApplicationRecords(corpus),
    }),
    createArtifactDocuments({
      ...settings,
      records: syntheticCorpusFixtures(),
    }),
  );
  assert.equal(
    serializeAnalyzedCorpus(corpus),
    serializeAnalyzedCorpus(build(syntheticCorpusFixtures().reverse())),
  );
  assert.equal(corpus.publication.state, "closed");
});

test("compatibility does not authorize modified, missing, extra, real or unpinned records", () => {
  const fixtures = syntheticCorpusFixtures();
  for (const records of [
    fixtures.slice(1),
    [...fixtures, fixtures[0]],
    [fixtures[0], fixtures[0], fixtures[2]],
  ])
    assert.throws(() => build(records));
  const changed = clone(fixtures);
  changed[0].officialTitle += " altered";
  assert.throws(() => build(changed));
  const registry = clone(sourceRegistry);
  registry.sources[0].enabled = false;
  assert.throws(() => build(fixtures, registry));
  for (const change of [
    (c) => {
      c.synthetic = false;
    },
    (c) => {
      delete c.recordProfile;
    },
    (c) => {
      c.recordProfile = "arbitrary";
    },
    (c) => {
      c.schemaVersion = "1.0.0";
    },
    (c) => {
      c.projectionInputs.taxonomyRef.digest = "0".repeat(64);
    },
    (c) => {
      c.recordEntries[0].record.officialTitle = "Forged";
      c.recordEntries[0].recordDigest = canonicalCorpusDigest(
        c.recordEntries[0].record,
      );
    },
  ]) {
    const corpus = clone(applicationCorpusForVerification());
    change(corpus);
    assert.throws(() => parseAnalyzedCorpus(reseal(corpus)));
  }
});

test("all ordinary fixture titles and summaries replay through canonical pack references", () => {
  const ajv = new Ajv2020({ strict: true });
  addFormats(ajv);
  const validate = ajv.compile(packSchema);
  const corpus = applicationCorpusForVerification();
  for (const entry of corpus.recordEntries) {
    const bytes = fixtureTextForCitation(entry.record);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    // A synthetic receipt fixture, not evidence of a filesystem write.
    const objectReceipt = {
      schemaVersion: "1.0.0",
      kind: "synthetic_object_receipt",
      status: "stored",
      synthetic: true,
      sourceId: entry.record.source.id,
      operationId: "fixture-only",
      sha256,
      byteLength: bytes.length,
      objectPath: `objects/sha256/${sha256.slice(0, 2)}/${sha256.slice(2, 4)}/${sha256}`,
    };
    const { manifest, renditionBytes } = createCuratedDocumentPack({
      corpus,
      sourceRegistry,
      recordId: entry.recordId,
      objectReceipt,
      bytes,
      packId: "synthetic-pack",
      documentId: "synthetic-document",
      documentVersionId: "synthetic-version",
      generatedAt: corpus.generatedAt,
    });
    assert.equal(validate(manifest), true, JSON.stringify(validate.errors));
    assert.ok(
      replayCuratedDocumentPack({
        manifest,
        corpus,
        sourceRegistry,
        objectBytes: bytes,
        renditionBytes,
      }),
    );
    assert.ok(Buffer.isBuffer(renditionBytes));
    assert.equal(manifest.recordRef.recordDigest, entry.recordDigest);
    assert.equal(manifest.publication.state, "closed");
  }
});
