import { Buffer } from "node:buffer";
import process from "node:process";
import { resolve } from "node:path";
import config from "../config/local-corpus.v1.mjs";
import sourceRegistry from "../config/sources.v1.json" with { type: "json" };
import { openCorpusStore } from "../src/pipeline/corpus-store.mjs";
import {
  applicationCorpusForVerification,
  fixtureTextForCitation,
} from "../src/pipeline/synthetic-corpus-path.mjs";
import { serializeAnalyzedCorpus } from "../src/pipeline/analyzed-corpus.mjs";
import {
  createCuratedDocumentPack,
  replayCuratedDocumentPack,
  serializeCuratedDocumentPack,
} from "../src/pipeline/curated-document-pack.mjs";

const args = process.argv.slice(2);
if (args.length !== 0 && (args.length !== 2 || args[0] !== "--root"))
  throw new Error("INVALID_CORPUS_ARGUMENTS");
const root = args[1] ?? process.env[config.rootEnvironmentVariable];
if (!root) throw new Error("EXPLICIT_EXTERNAL_CORPUS_ROOT_REQUIRED");
const store = await openCorpusStore({
  root,
  repositoryRoot: resolve(import.meta.dirname, ".."),
  limits: config.limits,
});
try {
  const corpus = applicationCorpusForVerification();
  const corpusReceipt = await store.putSynthetic({
    sourceId: "synthetic-corpus",
    operationId: "application-corpus-v1",
    synthetic: true,
    bytes: Buffer.from(serializeAnalyzedCorpus(corpus)),
  });
  const packs = [];
  for (const entry of corpus.recordEntries) {
    const sourceId = entry.record.source.id;
    const bytes = fixtureTextForCitation(entry.record);
    const objectReceipt = await store.putSynthetic({
      sourceId,
      operationId: "curated-text-v1",
      synthetic: true,
      bytes,
    });
    const pack = createCuratedDocumentPack({
      corpus,
      sourceRegistry,
      recordId: entry.recordId,
      objectReceipt,
      bytes,
      packId: `${sourceId}-pack`,
      documentId: `${sourceId}-document`,
      documentVersionId: `${sourceId}-version-one`,
      generatedAt: corpus.generatedAt,
    });
    const renditionReceipt = await store.putSynthetic({
      sourceId,
      operationId: "curated-rendition-v1",
      synthetic: true,
      bytes: pack.renditionBytes,
    });
    const manifestReceipt = await store.putSynthetic({
      sourceId,
      operationId: "curated-manifest-v1",
      synthetic: true,
      bytes: Buffer.from(serializeCuratedDocumentPack(pack.manifest)),
    });
    const manifest = JSON.parse(
      (await store.readObject(manifestReceipt.sha256)).toString("utf8"),
    );
    const citations = replayCuratedDocumentPack({
      manifest,
      corpus,
      sourceRegistry,
      objectBytes: await store.readObject(objectReceipt.sha256),
      renditionBytes: await store.readObject(renditionReceipt.sha256),
    });
    packs.push({
      sourceId,
      manifestDigest: pack.manifest.contentDigest,
      manifestObject: manifestReceipt.sha256,
      objectDigest: objectReceipt.sha256,
      renditionDigest: renditionReceipt.sha256,
      citations,
    });
  }
  console.log(
    JSON.stringify(
      {
        kind: "synthetic_corpus_spine_verification",
        schemaVersion: "1.0.0",
        networkRequests: 0,
        realObjects: 0,
        publication: "closed",
        corpusDigest: corpus.contentDigest,
        corpusObject: corpusReceipt.sha256,
        packs,
        inventory: await store.inventory(),
      },
      null,
      2,
    ),
  );
} catch (error) {
  // Never expose local paths or arbitrary OS exception text through this CLI.
  console.error(
    `CORPUS_SPINE_VERIFICATION_FAILED:${/^[A-Z_]+$/u.test(error.code ?? "") ? error.code : "VALIDATION_FAILURE"}`,
  );
  process.exitCode = 1;
} finally {
  await store.close();
}
