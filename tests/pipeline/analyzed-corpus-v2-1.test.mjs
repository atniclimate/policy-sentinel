import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { test } from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import legacySchema from "../../schemas/analyzed-corpus.schema.v2.json" with { type: "json" };
import schema from "../../schemas/analyzed-corpus.schema.v2.1.json" with { type: "json" };
import { createSyntheticStudyCorpus } from "../../fixtures/study/research-study.mjs";
import {
  createAnalyzedCorpusV2,
  createAnalyzedCorpusV21,
  createSupportedAnalyzedCorpus,
  parseAnalyzedCorpusV2,
  parseAnalyzedCorpusV21,
  parseSupportedAnalyzedCorpus,
  serializeAnalyzedCorpusV2,
  serializeAnalyzedCorpusV21,
  serializeSupportedAnalyzedCorpus,
  replayCorpusCitation,
  replaySupportedCorpusCitation,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";

const fixture = (options = {}) =>
  createSyntheticStudyCorpus({ ...options, schemaVersion: "2.1.0" });
function inputOf(corpus) {
  const input = JSON.parse(JSON.stringify(corpus));
  for (const key of ["$schema", "schemaVersion", "kind", "contentDigest"])
    delete input[key];
  for (const value of Object.values(input))
    if (Array.isArray(value))
      for (const member of value) delete member.contentDigest;
  return input;
}

test("2.1 closed schema compiles and explicit dispatch leaves 2.0 bytes untouched", () => {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);
  ajv.addSchema(legacySchema);
  const validate = ajv.compile(schema);
  const corpus = fixture();
  assert.equal(parseAnalyzedCorpusV21(corpus), corpus);
  assert.equal(parseSupportedAnalyzedCorpus(corpus), corpus);
  const external = Object.freeze(JSON.parse(JSON.stringify(corpus)));
  assert.notEqual(parseAnalyzedCorpusV21(external), external);
  const forged = JSON.parse(JSON.stringify(corpus));
  forged.works[0].title = "Forged successor title";
  assert.throws(
    () => parseAnalyzedCorpusV21(Object.freeze(forged)),
    /CONTENT_DIGEST_MISMATCH/,
  );
  assert.equal(validate(corpus), true, JSON.stringify(validate.errors));
  assert.equal(Object.isFrozen(corpus.works[0].jurisdictionRefs), true);
  assert.equal(
    serializeAnalyzedCorpusV21(parseAnalyzedCorpusV21(corpus)),
    serializeSupportedAnalyzedCorpus(corpus),
  );
  assert.equal(
    createSupportedAnalyzedCorpus(inputOf(corpus), "2.1.0").contentDigest,
    corpus.contentDigest,
  );
  const legacy = createSyntheticStudyCorpus();
  const bytes = serializeAnalyzedCorpusV2(legacy);
  assert.equal(
    serializeSupportedAnalyzedCorpus(parseSupportedAnalyzedCorpus(legacy)),
    bytes,
  );
  assert.equal(
    serializeAnalyzedCorpusV2(createSupportedAnalyzedCorpus(inputOf(legacy))),
    bytes,
  );
  assert.throws(
    () => parseAnalyzedCorpusV2(corpus),
    /UNSUPPORTED_CORPUS_VERSION/,
  );
  assert.throws(
    () => parseAnalyzedCorpusV21(legacy),
    /UNSUPPORTED_CORPUS_VERSION/,
  );
  assert.throws(
    () => createAnalyzedCorpusV2(inputOf(corpus)),
    /CLOSED_SHAPE_REQUIRED/,
  );
  assert.throws(
    () => createAnalyzedCorpusV21(inputOf(legacy)),
    /CLOSED_SHAPE_REQUIRED/,
  );
  assert.throws(
    () => createSupportedAnalyzedCorpus(inputOf(legacy), "9.0.0"),
    /UNSUPPORTED_CORPUS_VERSION/,
  );
  const refs = corpus.works.find(
    (work) => work.id === "work-regional",
  ).jurisdictionRefs;
  assert.deepEqual(
    refs.map((row) => row.jurisdictionRef),
    ["WA", "OR", "ID", "AK", "CA", "MT", "NV"].map(
      (code) => `us-state:${code}`,
    ),
  );
  assert.equal(
    corpus.works.every((work) => work.relevance === "general_jurisdiction"),
    true,
  );
});

test("2.1 associations replay source/version/locator/text and attributed review after resealing", () => {
  const corpus = fixture();
  const mutations = [
    (row) => {
      row.versionId = "version-parent";
    },
    (row) => {
      row.segmentIds = [];
    },
    (row) => {
      row.evidence.url = "https://synthetic-agency.invalid/policy/other";
    },
    (row) => {
      row.evidence.locator = "/invented";
    },
    (row) => {
      row.evidence.exactSubject.text = "Invented legal scope.";
    },
    (row) => {
      row.evidence.exactSubject.recordRef = "work-parent";
    },
    (row) => {
      row.evidence.exactSubject.ref = "us";
    },
    (row) => {
      delete row.evidence.exactSubject;
    },
    (row) => {
      row.reviewer = null;
    },
    (row) => {
      row.reviewer.reviewedAt = "2026-10-06T00:00:00Z";
    },
    (row) => {
      row.reviewer.reviewedAt = "2026-10-09T00:00:00Z";
    },
    (row) => {
      row.jurisdictionRef = row.evidence.exactSubject.ref = "us-state:ZZ";
    },
    (row) => {
      row.jurisdictionRef = row.evidence.exactSubject.ref = "nation:invented";
    },
    (row) => {
      row.jurisdictionRef = row.evidence.exactSubject.ref =
        "nation:synthetic-invented";
    },
    (row) => {
      row.inferredFromGeography = true;
    },
  ];
  for (const mutate of mutations) {
    const input = inputOf(corpus);
    mutate(
      input.works.find((work) => work.id === "work-regional")
        .jurisdictionRefs[0],
    );
    assert.throws(() => createAnalyzedCorpusV21(input));
  }
  const duplicate = inputOf(corpus);
  const regional = duplicate.works.find((work) => work.id === "work-regional");
  regional.jurisdictionRefs.push({ ...regional.jurisdictionRefs[0] });
  assert.throws(
    () => createAnalyzedCorpusV21(duplicate),
    /DUPLICATE_JURISDICTION_ASSOCIATION/,
  );
  const unknown = inputOf(corpus);
  unknown.works.find(
    (work) => work.id === "work-regional",
  ).jurisdictionRefs[0].reviewState = "unreviewed";
  unknown.works.find(
    (work) => work.id === "work-regional",
  ).jurisdictionRefs[0].reviewer = null;
  assert.equal(createAnalyzedCorpusV21(unknown).schemaVersion, "2.1.0");
});

test("supported citation replay preserves exact 2.1 evidence bytes and legacy rejection", () => {
  const corpus = fixture();
  const association = corpus.works.find((work) => work.id === "work-regional")
    .jurisdictionRefs[0];
  const segment = corpus.segments.find(
    (row) => row.id === association.segmentIds[0],
  );
  const rendition = corpus.renditions.find(
    (row) => row.id === segment.renditionId,
  );
  const bytes = Buffer.from(rendition.text);
  const input = {
    corpus,
    segmentId: segment.id,
    objectBytes: bytes,
    renditionBytes: bytes,
  };
  const replay = replaySupportedCorpusCitation(input);
  assert.equal(replay.corpusDigest, corpus.contentDigest);
  assert.equal(replay.versionId, association.versionId);
  assert.equal(replay.locator.value, association.evidence.locator);
  assert.equal(
    replay.quote.includes(association.evidence.exactSubject.text),
    true,
  );
  assert.throws(
    () => replayCorpusCitation(input),
    /UNSUPPORTED_CORPUS_VERSION/,
  );
});

test("2.1 state identity rejects wrong-state and ambiguous source statements already present in the cited passage", () => {
  const cases = [
    ["us-state:WA", "The synthetic scope includes California."],
    ["us-state:VA", "The synthetic scope includes West Virginia."],
    ["us-state:WA", "The synthetic meeting took place in Washington, D.C."],
    ["us-state:OR", "Choose one OR another synthetic alternative."],
    ["us-state:WA", "The synthetic source says us-state:WA-extra."],
  ];
  const corpus = fixture({
    extraText: cases.map(([, statement]) => statement).join("\n"),
  });
  const regional = corpus.works.find((work) => work.id === "work-regional");
  cases.push([
    "us-state:WA",
    regional.jurisdictionRefs.find(
      (row) => row.jurisdictionRef === "us-state:CA",
    ).evidence.exactSubject.text,
  ]);
  for (const [ref, statement] of cases) {
    const input = inputOf(corpus);
    const association = input.works.find((work) => work.id === "work-regional")
      .jurisdictionRefs[0];
    const segment = input.segments.find(
      (row) => row.id === association.segmentIds[0],
    );
    assert.ok(
      input.renditions
        .find((row) => row.id === segment.renditionId)
        .text.includes(statement),
    );
    association.jurisdictionRef = association.evidence.exactSubject.ref = ref;
    association.evidence.exactSubject.text = statement;
    assert.throws(
      () => createAnalyzedCorpusV21(input),
      /JURISDICTION_STATE_EXACT_IDENTITY/,
    );
  }
  const positive = inputOf(
    fixture({ extraText: "The synthetic scope includes Washington." }),
  );
  positive.works.find(
    (work) => work.id === "work-regional",
  ).jurisdictionRefs[0].evidence.exactSubject.text =
    "The synthetic scope includes Washington.";
  assert.equal(createAnalyzedCorpusV21(positive).schemaVersion, "2.1.0");
});

test("2.1 degraded replay retains exact associations and original evidence times", () => {
  const prior = fixture();
  const input = inputOf(prior);
  input.generatedAt = "2026-10-09T00:00:00Z";
  const coverage = input.coverage.find(
    (row) => row.sourceProfileId === "profile-agency",
  );
  coverage.status = "degraded";
  coverage.failureStage = "source_unavailable";
  coverage.lastKnownGoodDigest = prior.contentDigest;
  const options = { lastKnownGoodCorpora: [prior] };
  const current = createAnalyzedCorpusV21(input, options);
  assert.equal(parseAnalyzedCorpusV21(current, options), current);
  assert.throws(
    () => parseAnalyzedCorpusV2(current, options),
    /UNSUPPORTED_CORPUS_VERSION/,
  );
  const bytes = serializeAnalyzedCorpusV21(current, options);
  options.lastKnownGoodCorpora = [];
  assert.throws(
    () => parseAnalyzedCorpusV21(current, options),
    /VERIFIED_PRIOR_CORPUS_REQUIRED/,
  );
  assert.throws(
    () => serializeSupportedAnalyzedCorpus(current, options),
    /VERIFIED_PRIOR_CORPUS_REQUIRED/,
  );
  const alteredPrior = JSON.parse(JSON.stringify(prior));
  alteredPrior.id = "altered-prior";
  options.lastKnownGoodCorpora = [Object.freeze(alteredPrior)];
  assert.throws(
    () => parseSupportedAnalyzedCorpus(current, options),
    /CONTENT_DIGEST_MISMATCH/,
  );
  options.lastKnownGoodCorpora = [prior];
  assert.equal(serializeAnalyzedCorpusV21(current, options), bytes);
  assert.equal(
    parseSupportedAnalyzedCorpus(current, options).contentDigest,
    current.contentDigest,
  );
  assert.throws(
    () => parseSupportedAnalyzedCorpus(current),
    /VERIFIED_PRIOR_CORPUS_REQUIRED/,
  );
  input.works.find(
    (work) => work.id === "work-regional",
  ).jurisdictionRefs[0].reviewState = "rejected";
  assert.throws(
    () => createAnalyzedCorpusV21(input, options),
    /LKG_SOURCE_SNAPSHOT_MISMATCH/,
  );
});

test("2.1 object guards reject accessors before any source-derived field is read", () => {
  let calls = 0;
  const input = inputOf(fixture());
  Object.defineProperty(input.works[0], "jurisdictionRefs", {
    enumerable: true,
    get() {
      calls += 1;
      return [];
    },
  });
  assert.throws(() => createAnalyzedCorpusV21(input));
  assert.equal(calls, 0);
});
