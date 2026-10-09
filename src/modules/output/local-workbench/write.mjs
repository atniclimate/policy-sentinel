import { Buffer } from "node:buffer";
import {
  parseAnalyzedCorpusV2,
  serializeAnalyzedCorpusV2,
} from "../../../pipeline/analyzed-corpus-v2.mjs";
import { sha256Bytes as digest } from "../../../pipeline/hashing.mjs";
import {
  assertProfileBindings,
  assertCaptureBindings,
} from "../../../core/local-output-bindings.mjs";
import {
  MAX_SEARCH_PROJECTION_MANIFEST_BYTES,
  validateSearchProjectionEnvelope,
} from "./search-projection.mjs";

const fail = (code) => {
  throw new Error(code);
};

export function localCorpusBytes(corpus, replayOptions) {
  const valid = parseAnalyzedCorpusV2(corpus, replayOptions);
  if (valid.trustDomain !== "real_source_local")
    fail("REAL_LOCAL_CORPUS_REQUIRED");
  // This full-text projection is deliberately narrower than the general schema.
  // A source with restricted display/export requires a separately tested projection.
  if (
    valid.sourceProfiles.some(
      (source) =>
        source.uses.localDisplay !== "full_text" ||
        source.uses.localExport !== "full_text" ||
        !source.uses.excerpts ||
        source.uses.publicRedistribution !== "prohibited",
    )
  )
    fail("FULL_LOCAL_DISPLAY_EXPORT_POLICY_REQUIRED");
  return Buffer.from(serializeAnalyzedCorpusV2(valid, replayOptions));
}

export function validateLocalOutputFiles(files, manifest, run, replayOptions) {
  const corpus = parseAnalyzedCorpusV2(
    JSON.parse(files.get("corpus.json").toString("utf8")),
    replayOptions,
  );
  const bytes = localCorpusBytes(corpus, replayOptions);
  assertProfileBindings(corpus, run);
  assertCaptureBindings(corpus, run);
  if (
    corpus.runId !== run.owner.runId ||
    corpus.contentDigest !== manifest.corpusDigest ||
    !bytes.equals(files.get("corpus.json"))
  )
    fail("OUTPUT_CORPUS_BINDING_MISMATCH");
  const profile = JSON.parse(files.get("local-profile.json").toString("utf8"));
  const expectedProfile = {
    kind: "policy_local_profile",
    schemaVersion: "1.0.0",
    trustDomain: "real_source_local",
    corpusDigest: corpus.contentDigest,
    corpusFile: "corpus.json",
    corpusFileDigest: digest(bytes),
    corpusBytes: bytes.length,
    publication: "closed",
  };
  if (manifest.searchProjection !== undefined) {
    const descriptor = manifest.searchProjection;
    const projectionBytes = files.get("search-projection.json");
    if (
      !descriptor ||
      descriptor.file !== "search-projection.json" ||
      !Number.isSafeInteger(descriptor.bytes) ||
      descriptor.bytes < 1 ||
      descriptor.bytes > MAX_SEARCH_PROJECTION_MANIFEST_BYTES ||
      !/^[a-f0-9]{64}$/.test(descriptor.parentCorpusDigest) ||
      !projectionBytes ||
      projectionBytes.length !== descriptor.bytes ||
      digest(projectionBytes) !== descriptor.fileDigest
    )
      fail("OUTPUT_PROJECTION_BINDING_MISMATCH");
    const projection = JSON.parse(projectionBytes.toString("utf8"));
    if (projection.parentCorpusDigest !== descriptor.parentCorpusDigest)
      fail("OUTPUT_PROJECTION_BINDING_MISMATCH");
    validateSearchProjectionEnvelope(projection, corpus, bytes);
    expectedProfile.searchProjection = {
      file: "search-projection.json",
      fileDigest: digest(projectionBytes),
      bytes: projectionBytes.length,
      parentCorpusDigest: projection.parentCorpusDigest,
    };
    if (
      JSON.stringify(descriptor) !==
      JSON.stringify(expectedProfile.searchProjection)
    )
      fail("OUTPUT_PROJECTION_BINDING_MISMATCH");
  } else if (
    files.has("search-projection.json") ||
    profile.searchProjection !== undefined
  ) {
    fail("OUTPUT_PROJECTION_BINDING_MISMATCH");
  }
  if (JSON.stringify(profile) !== JSON.stringify(expectedProfile))
    fail("OUTPUT_PROFILE_BINDING_MISMATCH");
  return { corpusDigest: corpus.contentDigest, valid: true };
}
