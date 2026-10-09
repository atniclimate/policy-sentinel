import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  canonicalV2Digest,
  createAnalyzedCorpusV2,
  createAnalyzedCorpusV21,
  parseSupportedAnalyzedCorpus,
  serializeSupportedAnalyzedCorpus,
  createEvidenceSegment,
  replayCorpusCitation,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";
import {
  createSearchProjection,
  MAX_SEARCH_PROJECTION_BYTES,
  MAX_SEARCH_PROJECTION_MANIFEST_BYTES,
  serializeSearchProjectionManifest,
  validateSearchProjectionEnvelope,
  verifySearchProjection,
} from "../../src/modules/output/local-workbench/search-projection.mjs";
import { syntheticCorpusV2Input } from "./analyzed-corpus-v2.test.mjs";

const clone = (value) => JSON.parse(JSON.stringify(value));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const parentCorpus = () => createAnalyzedCorpusV2(syntheticCorpusV2Input());
const selectA = {
  sourceProfileIds: ["profile-a"],
  from: "2022-01-01",
  through: "2022-01-01",
};

test("an unchanged projection reuses the proven parent while preserving bytes, selection and admission limits", () => {
  for (const successor of [false, true]) {
    const input = syntheticCorpusV2Input();
    if (successor) for (const work of input.works) work.jurisdictionRefs = [];
    const parent = successor
      ? createAnalyzedCorpusV21(input)
      : createAnalyzedCorpusV2(input);
    const selection = {
      sourceProfileIds: parent.sourceProfiles.map((row) => row.id),
    };
    const result = createSearchProjection(parent, selection);
    assert.equal(result.corpus, parent);
    assert.equal(
      result.bytes.toString("utf8"),
      serializeSupportedAnalyzedCorpus(parent),
    );
    assert.equal(
      verifySearchProjection(parent, result.manifest, result.bytes).corpus,
      parent,
    );
    assert.deepEqual(result.manifest.excludedVersionIds, []);
    assert.throws(
      () =>
        createSearchProjection(parent, {
          ...selection,
          maxBytes: result.bytes.length - 1,
        }),
      /PROJECTION_BYTE_CEILING/,
    );
    const subset = createSearchProjection(parent, selectA);
    assert.notEqual(subset.corpus, parent);
    assert.equal(subset.corpus.works.length, 1);
    const forged = clone(parent);
    forged.works[0].title = "Forged parent title";
    assert.throws(
      () => createSearchProjection(Object.freeze(forged), selection),
      /CONTENT_DIGEST_MISMATCH/,
    );
  }
});

test("valid reordered parent catalogs retain the prior sorted projection bytes instead of being reused", () => {
  for (const successor of [false, true]) {
    const input = syntheticCorpusV2Input();
    if (successor) for (const work of input.works) work.jurisdictionRefs = [];
    const canonical = successor
      ? createAnalyzedCorpusV21(input)
      : createAnalyzedCorpusV2(input);
    const expectedBytes = serializeSupportedAnalyzedCorpus(canonical);
    for (const name of [
      "sourceProfiles",
      "captures",
      "works",
      "versions",
      "renditions",
      "segments",
      "events",
      "analyses",
      "coverage",
    ]) {
      const reordered = clone(canonical);
      reordered[name].reverse();
      const { contentDigest: previousDigest, ...body } = reordered;
      void previousDigest;
      reordered.contentDigest = canonicalV2Digest(body);
      const parent = parseSupportedAnalyzedCorpus(reordered);
      assert.notEqual(parent.contentDigest, canonical.contentDigest);
      const result = createSearchProjection(parent, {
        sourceProfileIds: parent.sourceProfiles.map((row) => row.id),
      });
      assert.notEqual(result.corpus, parent);
      assert.equal(result.corpus.contentDigest, canonical.contentDigest);
      assert.equal(result.bytes.toString("utf8"), expectedBytes);
      assert.equal(result.manifest.parentCorpusDigest, parent.contentDigest);
      assert.equal(result.manifest.corpusDigest, canonical.contentDigest);
    }
  }
});

test("2.1 projection preserves reviewed association proof on older retained versions without upgrading 2.0", () => {
  const input = syntheticCorpusV2Input();
  for (const work of input.works) work.jurisdictionRefs = [];
  const work = input.works.find((row) => row.id === "work-a");
  const version = input.versions.find((row) => row.id === "version-a-old");
  const segment = input.segments.find((row) =>
    version.renditionIds.includes(row.renditionId),
  );
  const rendition = input.renditions.find(
    (row) => row.id === segment.renditionId,
  );
  const capture = input.captures.find((row) => row.id === rendition.captureId);
  work.jurisdictionRefs = [
    {
      jurisdictionRef: "body:synthetic-council",
      basis: "issuing_authority",
      evidence: {
        url: capture.finalUrl,
        locator: segment.locator.value,
        exactSubject: {
          recordRef: work.id,
          ref: "body:synthetic-council",
          text: "The council must review proposals.",
        },
      },
      reviewState: "reviewed",
      versionId: version.id,
      segmentIds: [segment.id],
      reviewer: {
        name: "Synthetic reviewer",
        kind: "human",
        reviewedAt: "2026-09-02T01:00:00Z",
      },
    },
  ];
  const parent = createAnalyzedCorpusV21(input);
  const result = createSearchProjection(parent, selectA);
  assert.equal(result.corpus.schemaVersion, "2.1.0");
  assert.deepEqual(result.manifest.directlySelectedVersionIds, [
    "version-a-new",
  ]);
  assert.deepEqual(
    result.corpus.works[0].jurisdictionRefs,
    parent.works[0].jurisdictionRefs,
  );
  assert.deepEqual(
    result.corpus.segments.find((row) => row.id === segment.id),
    parent.segments.find((row) => row.id === segment.id),
  );
  assert.ok(result.corpus.versions.some((row) => row.id === version.id));
  const replayed = parseSupportedAnalyzedCorpus(
    JSON.parse(result.bytes.toString("utf8")),
  );
  assert.equal(replayed.contentDigest, result.corpus.contentDigest);
  assert.equal(
    serializeSupportedAnalyzedCorpus(replayed),
    result.bytes.toString("utf8"),
  );
  assert.deepEqual(
    verifySearchProjection(parent, result.manifest, result.bytes),
    result,
  );
  assert.equal(
    createSearchProjection(parentCorpus(), selectA).corpus.schemaVersion,
    "2.0.0",
  );
});

test("bounded search retains whole works, exact identities and history while declaring omitted crossings", () => {
  const parent = parentCorpus();
  const result = createSearchProjection(parent, selectA);
  assert.deepEqual(result.manifest.directlySelectedVersionIds, [
    "version-a-new",
  ]);
  assert.deepEqual(result.manifest.retainedVersionIds, [
    "version-a-new",
    "version-a-old",
  ]);
  assert.deepEqual(result.manifest.excludedVersionIds, ["version-b"]);
  assert.deepEqual(result.manifest.omittedRelationshipIds, [
    "relationship-b-a",
  ]);
  assert.deepEqual(result.manifest.omittedAnalysisIds, ["analysis-b"]);
  assert.deepEqual(result.manifest.omittedFindingIds, [
    "finding-synthetic-review",
  ]);
  assert.deepEqual(
    result.corpus.works,
    parent.works.filter((row) => row.id === "work-a"),
  );
  assert.deepEqual(
    result.corpus.versions,
    parent.versions.filter((row) => row.workId === "work-a"),
  );
  assert.deepEqual(
    result.corpus.segments,
    parent.segments.filter((row) => row.renditionId !== "rendition-b"),
  );
  assert.deepEqual(
    result.corpus.coverage,
    parent.coverage.filter((row) => row.sourceProfileId === "profile-a"),
  );
  assert.equal(
    result.manifest.coverage.find((row) => row.sourceProfileId === "profile-b")
      .searched,
    false,
  );
  assert.ok(
    result.bytes.length < Buffer.byteLength(JSON.stringify(parent, null, 2)),
  );
  assert.deepEqual(
    verifySearchProjection(parent, result.manifest, result.bytes),
    result,
  );
  assert.strictEqual(
    validateSearchProjectionEnvelope(
      result.manifest,
      result.corpus,
      result.bytes,
    ),
    result.manifest,
  );
});

test("field evidence closes over its owning work without treating a dependency source as searched", () => {
  const input = syntheticCorpusV2Input();
  const event = input.events.find((row) => row.versionId === "version-b");
  const evidence = event.fieldProvenance.find(
    (field) => field.field === "/sourceLabel",
  );
  evidence.captureId = input.captures[0].id;
  evidence.segmentIds = [input.segments[0].id];
  event.segmentIds.push(input.segments[0].id);
  const parent = createAnalyzedCorpusV2(input);
  const result = createSearchProjection(parent, {
    sourceProfileIds: ["profile-b"],
  });
  assert.deepEqual(result.manifest.directlySelectedVersionIds, ["version-b"]);
  assert.equal(result.corpus.works.length, 2);
  assert.equal(result.corpus.relationships.length, 1);
  const contextual = result.manifest.coverage.find(
    (row) => row.sourceProfileId === "profile-a",
  );
  assert.equal(contextual.selected, false);
  assert.equal(contextual.searched, false);
  assert.equal(contextual.retained, true);
  assert.deepEqual(contextual.directlyMatchedVersionIds, []);
});

test("a selected collection with zero date matches keeps its observed coverage in the manifest", () => {
  const result = createSearchProjection(parentCorpus(), {
    sourceProfileIds: ["profile-a", "profile-b"],
    from: "2022-01-01",
  });
  const empty = result.manifest.coverage.find(
    (row) => row.sourceProfileId === "profile-b",
  );
  assert.equal(empty.selected, true);
  assert.equal(empty.searched, true);
  assert.equal(empty.retained, false);
  assert.equal(empty.status, "healthy");
  assert.equal(empty.documentCount, 1);
  assert.equal(empty.dataAsOf, "2026-09-02T00:00:00Z");
  assert.deepEqual(empty.directlyMatchedVersionIds, []);
  assert.deepEqual(empty.retainedVersionIds, []);
});

test("capture-property evidence retains a source dependency even without passage IDs", () => {
  const input = syntheticCorpusV2Input();
  const event = input.events.find((row) => row.versionId === "version-b");
  const capture = input.captures[0];
  event.sourceLabel = capture.finalUrl;
  Object.assign(
    event.fieldProvenance.find((field) => field.field === "/sourceLabel"),
    {
      captureId: capture.id,
      sourceLocator: "$capture.finalUrl",
      segmentIds: [],
    },
  );
  const parent = createAnalyzedCorpusV2(input);
  const result = createSearchProjection(parent, {
    sourceProfileIds: ["profile-b"],
  });
  assert.equal(result.corpus.sourceProfiles.length, 2);
  assert.ok(result.corpus.captures.some((row) => row.id === capture.id));
  assert.equal(result.manifest.coverage[0].searched, false);
  assert.deepEqual(
    result.corpus.events.find((row) => row.id === event.id),
    parent.events.find((row) => row.id === event.id),
  );
});

test("capture-only closure expands an unrepresented source but preserves a represented source selection", () => {
  const input = syntheticCorpusV2Input();
  const newer = input.versions.find((row) => row.id === "version-a-new");
  const rendition = input.renditions.find(
    (row) => row.id === newer.renditionIds[0],
  );
  const segment = input.segments.find(
    (row) => row.renditionId === rendition.id,
  );
  const separateWork = clone(input.works.find((row) => row.id === "work-a"));
  separateWork.id = "work-a-newer";
  separateWork.sourceIdentifier = "Edition 2022";
  for (const field of separateWork.fieldProvenance) {
    field.captureId = rendition.captureId;
    field.segmentIds = [segment.id];
  }
  input.works.push(separateWork);
  newer.workId = separateWork.id;
  input.events.find((row) => row.versionId === newer.id).workId =
    separateWork.id;
  input.coverage[0].documentCount += 1;
  const event = input.events.find((row) => row.versionId === "version-b");
  const capture = input.captures.find((row) => row.id === "capture-a-old");
  event.sourceLabel = capture.finalUrl;
  Object.assign(
    event.fieldProvenance.find((field) => field.field === "/sourceLabel"),
    {
      captureId: capture.id,
      sourceLocator: "$capture.finalUrl",
      segmentIds: [],
    },
  );
  const parent = createAnalyzedCorpusV2(input);
  const expanded = createSearchProjection(parent, {
    sourceProfileIds: ["profile-b"],
  });
  assert.deepEqual(expanded.corpus.works, parent.works);
  const represented = createSearchProjection(parent, {
    sourceProfileIds: ["profile-a", "profile-b"],
    from: "2021-01-01",
  });
  assert.deepEqual(represented.manifest.retainedVersionIds, [
    "version-a-new",
    "version-b",
  ]);
  assert.deepEqual(represented.manifest.excludedVersionIds, ["version-a-old"]);
  assert.ok(represented.corpus.captures.some((row) => row.id === capture.id));
  assert.deepEqual(
    verifySearchProjection(parent, represented.manifest, represented.bytes),
    represented,
  );
});

test("selection dates, source population and exact byte ceiling are fail closed", () => {
  const parent = parentCorpus();
  for (const selection of [
    null,
    {},
    { sourceProfileIds: [] },
    { sourceProfileIds: ["unknown"] },
    { sourceProfileIds: ["profile-a", "profile-a"] },
    { ...selectA, from: "2022-02-30" },
    { ...selectA, from: "2023-01-01" },
    { ...selectA, maxBytes: MAX_SEARCH_PROJECTION_BYTES + 1 },
    { ...selectA, maxBytes: 0 },
    { ...selectA, extra: true },
  ])
    assert.throws(
      () => createSearchProjection(parent, selection),
      /Search projection rejected/,
    );
  const valid = createSearchProjection(parent, selectA);
  assert.equal(
    createSearchProjection(parent, { ...selectA, maxBytes: valid.bytes.length })
      .bytes.length,
    valid.bytes.length,
  );
  assert.throws(
    () =>
      createSearchProjection(parent, {
        ...selectA,
        maxBytes: valid.bytes.length - 1,
      }),
    /PROJECTION_BYTE_CEILING/,
  );
  assert.throws(
    () =>
      createSearchProjection(parent, {
        sourceProfileIds: ["profile-a"],
        from: "2030-01-01",
      }),
    /EMPTY_SELECTED_POPULATION/,
  );
  assert.throws(
    () =>
      serializeSearchProjectionManifest({
        text: "a".repeat(MAX_SEARCH_PROJECTION_MANIFEST_BYTES),
      }),
    /MANIFEST_BYTE_CEILING/,
  );
});

test("rehashed selection, coverage, omitted evidence or corpus bytes cannot replace parent replay", () => {
  const parent = parentCorpus();
  const result = createSearchProjection(parent, selectA);
  for (const mutate of [
    (manifest) => {
      manifest.selection.from = "2020-01-01";
    },
    (manifest) => {
      manifest.coverage[1].searched = true;
    },
    (manifest) => {
      manifest.omittedRelationshipIds = [];
    },
    (manifest) => {
      manifest.retainedSegmentIds = [];
    },
    (manifest) => {
      manifest.parentCorpusDigest = "0".repeat(64);
    },
  ]) {
    const forged = clone(result.manifest);
    mutate(forged);
    const { contentDigest: _digest, ...body } = forged;
    void _digest;
    forged.contentDigest = canonicalV2Digest(body);
    assert.throws(
      () => verifySearchProjection(parent, forged, result.bytes),
      /PARENT_OR_RULE_MISMATCH|PROJECTION_REPLAY_MISMATCH/,
    );
  }
  assert.throws(
    () =>
      verifySearchProjection(
        parent,
        result.manifest,
        Buffer.concat([result.bytes, Buffer.from(" ")]),
      ),
    /PROJECTION_REPLAY_MISMATCH/,
  );
  assert.throws(
    () =>
      validateSearchProjectionEnvelope(
        { ...result.manifest, bytes: 1 },
        result.corpus,
        result.bytes,
      ),
    /INVALID_PROJECTION_ENVELOPE/,
  );
});

test("multibyte source passages and byte citations replay unchanged after bounded selection", () => {
  const input = syntheticCorpusV2Input();
  const rendition = input.renditions[1];
  rendition.text += "Authored multilingual evidence: café — 水.\n";
  const bytes = Buffer.from(rendition.text);
  rendition.outputDigest = hash(bytes);
  rendition.byteLength = bytes.length;
  const capture = input.captures.find((row) => row.id === rendition.captureId);
  Object.assign(capture, {
    objectDigest: hash(bytes),
    encodedBytes: bytes.length,
    decodedBytes: bytes.length,
    objectPath: `objects/${hash(bytes)}.bin`,
  });
  const oldSegment = input.segments.find(
    (row) => row.renditionId === rendition.id,
  );
  const segment = createEvidenceSegment({
    renditionId: rendition.id,
    renditionDigest: rendition.outputDigest,
    renditionBytes: bytes,
    startByte: 0,
    endByte: bytes.length,
    locator: oldSegment.locator,
  });
  const remapped = JSON.parse(
    JSON.stringify(input).replaceAll(oldSegment.id, segment.id),
  );
  remapped.segments = remapped.segments.map((row) =>
    row.id === segment.id ? segment : row,
  );
  const parent = createAnalyzedCorpusV2(remapped);
  const projected = createSearchProjection(parent, selectA);
  const original = replayCorpusCitation({
    corpus: parent,
    segmentId: segment.id,
    objectBytes: bytes,
    renditionBytes: bytes,
  });
  const replay = replayCorpusCitation({
    corpus: projected.corpus,
    segmentId: segment.id,
    objectBytes: bytes,
    renditionBytes: bytes,
  });
  const { corpusDigest: _originalDigest, ...originalCitation } = original;
  const { corpusDigest: _projectedDigest, ...projectedCitation } = replay;
  void _originalDigest;
  void _projectedDigest;
  assert.deepEqual(projectedCitation, originalCitation);
  assert.match(replay.quote, /café — 水/);
  assert.equal(
    projected.corpus.segments.find((row) => row.id === segment.id).endByte,
    bytes.length,
  );
});

test("healthy and degraded procedural actions retain their parent work and exact citations", () => {
  for (const status of ["healthy", "degraded"]) {
    const input = syntheticCorpusV2Input();
    input.relationships[0].type = "amends";
    input.relationships[0].sourceLabel = "Amends Instrument A";
    const prior = createAnalyzedCorpusV2(input);
    const replayOptions = { lastKnownGoodCorpora: [prior] };
    if (status === "degraded") {
      input.generatedAt = "2026-09-04T00:00:00Z";
      Object.assign(input.coverage[1], {
        status,
        failureStage: "controlled_transport_failure",
        lastKnownGoodDigest: prior.contentDigest,
      });
    }
    const parent = createAnalyzedCorpusV2(input, replayOptions);
    const result = createSearchProjection(
      parent,
      {
        sourceProfileIds: ["profile-b"],
        from: "2021-01-01",
        through: "2021-01-01",
      },
      replayOptions,
    );
    assert.deepEqual(result.manifest.directlySelectedVersionIds, ["version-b"]);
    assert.deepEqual(result.corpus.works, parent.works);
    assert.deepEqual(result.corpus.versions, parent.versions);
    assert.deepEqual(result.corpus.relationships, parent.relationships);
    assert.deepEqual(result.manifest.omittedRelationshipIds, []);
    assert.equal(result.manifest.coverage[0].searched, false);
    const segment = parent.segments.find(
      (row) => row.renditionId === "rendition-a-old",
    );
    const rendition = parent.renditions.find(
      (row) => row.id === segment.renditionId,
    );
    const bytes = Buffer.from(rendition.text);
    const citation = (corpus) => {
      const { corpusDigest, ...identity } = replayCorpusCitation({
        corpus,
        segmentId: segment.id,
        objectBytes: bytes,
        renditionBytes: bytes,
        lastKnownGoodCorpora: [prior],
      });
      void corpusDigest;
      return identity;
    };
    assert.deepEqual(citation(result.corpus), citation(parent));
    assert.deepEqual(
      verifySearchProjection(
        parent,
        result.manifest,
        result.bytes,
        replayOptions,
      ),
      result,
    );
  }
});

test("procedural dependency closure follows multiple works without expanding unrelated citations", () => {
  const input = syntheticCorpusV2Input();
  input.relationships[0].type = "amends";
  input.relationships[0].sourceLabel = "Amends Instrument A";
  let third = JSON.parse(
    JSON.stringify(input)
      .replaceAll("profile-b", "profile-c")
      .replaceAll("source-b", "source-c")
      .replaceAll("work-b", "work-c")
      .replaceAll("version-b", "version-c")
      .replaceAll("rendition-b", "rendition-c")
      .replaceAll("capture-b", "capture-c")
      .replaceAll("operation-b", "operation-c")
      .replaceAll("Instrument B", "Instrument C")
      .replaceAll("Instrument A", "Instrument B")
      .replaceAll("2021", "2023"),
  );
  const profile = third.sourceProfiles.find((row) => row.id === "profile-c");
  const rendition = third.renditions.find((row) => row.id === "rendition-c");
  rendition.text = rendition.text.replace(
    "Amends Instrument B",
    "Supersedes Instrument B",
  );
  const bytes = Buffer.from(rendition.text);
  const digest = hash(bytes);
  Object.assign(rendition, { outputDigest: digest, byteLength: bytes.length });
  Object.assign(
    third.captures.find((row) => row.id === "capture-c"),
    {
      sourceProfileDigest: canonicalV2Digest(profile),
      objectDigest: digest,
      encodedBytes: bytes.length,
      decodedBytes: bytes.length,
      objectPath: `objects/sha256/${digest.slice(0, 2)}/${digest.slice(2, 4)}/${digest}`,
    },
  );
  const previousSegment = third.segments.find(
    (row) => row.renditionId === "rendition-c",
  );
  const segment = createEvidenceSegment({
    renditionId: rendition.id,
    renditionDigest: digest,
    renditionBytes: bytes,
    startByte: 0,
    endByte: bytes.length,
    locator: previousSegment.locator,
  });
  third = JSON.parse(
    JSON.stringify(third).replaceAll(previousSegment.id, segment.id),
  );
  input.sourceProfiles.push(profile);
  for (const collection of ["works", "versions", "renditions", "captures"])
    input[collection].push(
      third[collection].find((row) => row.id.endsWith("-c")),
    );
  input.segments.push(segment);
  input.coverage.push(
    third.coverage.find((row) => row.sourceProfileId === "profile-c"),
  );
  input.relationships.push({
    id: "relationship-c-b",
    fromVersionId: "version-c",
    type: "supersedes",
    target: {
      state: "resolved",
      workId: "work-b",
      versionId: "version-b",
      sourceIdentifier: "Instrument B",
      candidateVersionIds: [],
    },
    sourceLabel: "Supersedes Instrument B",
    sourceStatedAt: { value: "2023-01-01", precision: "day" },
    segmentIds: [segment.id],
  });
  const parent = createAnalyzedCorpusV2(input);
  const result = createSearchProjection(parent, {
    sourceProfileIds: ["profile-c"],
  });
  assert.deepEqual(result.manifest.directlySelectedVersionIds, ["version-c"]);
  assert.deepEqual(result.corpus.works, parent.works);
  assert.deepEqual(result.corpus.relationships, parent.relationships);
  assert.deepEqual(
    result.manifest.coverage.map((row) => row.searched),
    [false, false, true],
  );
  const citationOnly = createSearchProjection(parentCorpus(), {
    sourceProfileIds: ["profile-b"],
  });
  assert.deepEqual(citationOnly.manifest.retainedVersionIds, ["version-b"]);
  assert.deepEqual(citationOnly.manifest.omittedRelationshipIds, [
    "relationship-b-a",
  ]);
});

test("degraded selected sources preserve their verified snapshot, relationship targets and original timestamps", () => {
  const prior = parentCorpus();
  const input = syntheticCorpusV2Input();
  input.generatedAt = "2026-09-04T00:00:00Z";
  Object.assign(input.coverage[1], {
    status: "degraded",
    failureStage: "controlled_transport_failure",
    lastKnownGoodDigest: prior.contentDigest,
  });
  const replayOptions = { lastKnownGoodCorpora: [prior] };
  const parent = createAnalyzedCorpusV2(input, replayOptions);
  assert.throws(
    () => createSearchProjection(parent, { sourceProfileIds: ["profile-b"] }),
    /VERIFIED_PRIOR_CORPUS_REQUIRED/,
  );
  const result = createSearchProjection(
    parent,
    { sourceProfileIds: ["profile-b"] },
    replayOptions,
  );
  assert.equal(result.corpus, parent);
  assert.throws(
    () => createSearchProjection(parent, { sourceProfileIds: ["profile-b"] }),
    /VERIFIED_PRIOR_CORPUS_REQUIRED/,
  );
  assert.throws(
    () =>
      verifySearchProjection(parent, result.manifest, result.bytes, {
        lastKnownGoodCorpora: [],
      }),
    /VERIFIED_PRIOR_CORPUS_REQUIRED/,
  );
  assert.deepEqual(
    result.corpus.coverage.find((row) => row.sourceProfileId === "profile-b"),
    parent.coverage[1],
  );
  assert.deepEqual(result.corpus.relationships, parent.relationships);
  assert.equal(result.corpus.works.length, 2);
  assert.equal(result.manifest.coverage[0].searched, false);
  assert.equal(
    result.manifest.coverage[1].dataAsOf,
    prior.coverage[1].dataAsOf,
  );
  assert.deepEqual(
    verifySearchProjection(
      parent,
      result.manifest,
      result.bytes,
      replayOptions,
    ),
    result,
  );
});

test("unavailable-only selection is an explicit empty corpus with unavailable coverage", () => {
  const input = syntheticCorpusV2Input();
  for (const key of [
    "works",
    "versions",
    "renditions",
    "segments",
    "captures",
    "events",
    "analyses",
  ]) {
    input[key] = input[key].filter(
      (row) =>
        row.id !== "work-b" &&
        row.workId !== "work-b" &&
        row.id !== "version-b" &&
        row.versionId !== "version-b" &&
        row.id !== "rendition-b" &&
        row.renditionId !== "rendition-b" &&
        row.id !== "capture-b",
    );
  }
  input.relationships = [];
  input.findings = [];
  Object.assign(input.coverage[1], {
    status: "unavailable",
    documentCount: 0,
    versionCount: 0,
    dataAsOf: null,
    lastSuccessfulAt: null,
    failureStage: "controlled_transport_failure",
    from: { value: null, precision: "unknown" },
    through: { value: null, precision: "unknown" },
  });
  const parent = createAnalyzedCorpusV2(input);
  const result = createSearchProjection(parent, {
    sourceProfileIds: ["profile-b"],
  });
  assert.equal(result.corpus.works.length, 0);
  assert.deepEqual(result.corpus.coverage, [parent.coverage[1]]);
  const selected = result.manifest.coverage[1];
  assert.equal(selected.selected, true);
  assert.equal(selected.searched, false);
  assert.equal(selected.retained, true);
  assert.equal(selected.status, "unavailable");
});
