import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import nodeTest from "node:test";
import process from "node:process";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "../../schemas/analyzed-corpus.schema.v2.json" with { type: "json" };
import {
  canonicalV2Digest,
  createAnalyzedCorpusV2,
  createEvidenceSegment,
  parseAnalyzedCorpusV2,
  projectLocalCorpusV2,
  replayCorpusCitation,
  serializeAnalyzedCorpusV2,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const clone = (value) => JSON.parse(JSON.stringify(value));
const day = (value) => ({ value, precision: "day" });
const unknown = () => ({ value: null, precision: "unknown" });
const reviewTime = "2026-09-01T00:00:00Z";
const capturedAt = "2026-09-02T00:00:00Z";
const test =
  resolve(process.argv[1] ?? "") === import.meta.filename ? nodeTest : () => {};

export function syntheticCorpusV2Input() {
  const profiles = ["a", "b"].map((key) => ({
    id: `profile-${key}`,
    sourceId: `source-${key}`,
    interfaceId: `interface-${key}`,
    operator: `Synthetic operator ${key}`,
    publisher: `Synthetic publisher ${key}`,
    authorityLabel:
      key === "a"
        ? "Synthetic editorial rendition; not an official legal edition"
        : "Synthetic official publication",
    hosts: [`source-${key}.invalid`],
    pathPrefixes: ["/policy/"],
    review: {
      reviewer: "Synthetic review",
      reviewedAt: reviewTime,
      expiresAt: "2026-12-01T00:00:00Z",
      evidenceUrls: [`https://source-${key}.invalid/policy/terms`],
    },
    uses: {
      capture: true,
      analysis: true,
      localDisplay: "full_text",
      localExport: "full_text",
      excerpts: true,
      publicRedistribution: "prohibited",
    },
  }));
  const input = {
    id: "synthetic-policy-corpus-v2",
    runId: "synthetic-discovery-run",
    trustDomain: "synthetic_test_only",
    generatedAt: "2026-09-03T00:00:00Z",
    sourceProfiles: profiles,
    captures: [],
    works: [],
    versions: [],
    renditions: [],
    segments: [],
    events: [],
    relationships: [],
    analyses: [],
    findings: [],
    coverage: [],
  };
  const specifications = [
    {
      key: "a-old",
      source: "a",
      year: "2020",
      text: "Synthetic Policy Alpha\nInstrument A; Edition 2020; Final.\nThe council must review proposals. Effective 2020-01-01.\n",
    },
    {
      key: "a-new",
      source: "a",
      year: "2022",
      text: "Synthetic Policy Alpha\nInstrument A; Edition 2022; Final.\nThe council must review proposals within 30 days. Effective 2022-01-01.\n",
    },
    {
      key: "b",
      source: "b",
      year: "2021",
      text: "Synthetic Policy Beta\nInstrument B; Edition 2021; Enacted.\nThe commission may review proposals. Effective 2021-01-01. Cites Instrument A. Amends Instrument A.\n",
    },
  ];
  const provenance = (fields, spec, segmentId) =>
    fields.map((field) => ({
      field,
      mode: [
        "/instrumentClass",
        "/governmentContext",
        "/issuerRoles/0/role",
        "/issuerRoles/0/label",
      ].includes(field)
        ? "deterministic"
        : "source_attested",
      captureId: `capture-${spec.key}`,
      sourceLocator: "document/paragraphs",
      segmentIds: [segmentId],
      ruleId: [
        "/instrumentClass",
        "/governmentContext",
        "/issuerRoles/0/role",
        "/issuerRoles/0/label",
      ].includes(field)
        ? "synthetic-source-profile-mapping-v1"
        : null,
    }));
  for (const spec of specifications) {
    const profile = profiles.find(
      (entry) => entry.id === `profile-${spec.source}`,
    );
    const bytes = Buffer.from(spec.text);
    const objectDigest = hash(bytes);
    const versionId = `version-${spec.key}`;
    const renditionId = `rendition-${spec.key}`;
    const segment = createEvidenceSegment({
      renditionId,
      renditionDigest: objectDigest,
      renditionBytes: bytes,
      startByte: 0,
      endByte: bytes.length,
      locator: {
        type: "structural_path",
        value: "/policy/section-1",
        headingPath: ["Synthetic policy"],
        printedPageLabel: null,
        physicalPageIndex: null,
      },
    });
    input.captures.push({
      id: `capture-${spec.key}`,
      sourceProfileId: profile.id,
      sourceProfileDigest: canonicalV2Digest(profile),
      operationId: `operation-${spec.key}`,
      requestedUrl: `https://source-${spec.source}.invalid/policy/${spec.key}`,
      finalUrl: `https://source-${spec.source}.invalid/policy/${spec.key}`,
      retrievedAt: capturedAt,
      mediaType: "text/plain",
      encodedBytes: bytes.length,
      decodedBytes: bytes.length,
      objectDigest,
      objectPath: `objects/sha256/${objectDigest.slice(0, 2)}/${objectDigest.slice(2, 4)}/${objectDigest}`,
    });
    input.renditions.push({
      id: renditionId,
      versionId,
      captureId: `capture-${spec.key}`,
      parser: {
        id: "synthetic-utf8-lf",
        version: "1.0.0",
        configDigest: canonicalV2Digest({
          encoding: "utf8",
          lineEndings: "LF",
        }),
      },
      mediaType: "text/plain",
      outputDigest: objectDigest,
      byteLength: bytes.length,
      text: spec.text,
      authorityLabel: profile.authorityLabel,
      warnings: [],
      omittedSourceLocators: [],
    });
    input.segments.push(segment);
    input.versions.push({
      id: versionId,
      workId: `work-${spec.source}`,
      sourceVersionIdentifier: `Edition ${spec.year}`,
      sourceStatusLabel: spec.source === "a" ? "Final" : "Enacted",
      dates: {
        publication: day(`${spec.year}-01-01`),
        sourceVersion: day(`${spec.year}-01-01`),
      },
      observedAt: capturedAt,
      renditionIds: [renditionId],
      fieldProvenance: provenance(
        [
          "/sourceVersionIdentifier",
          "/sourceStatusLabel",
          "/dates/publication/value",
          "/dates/sourceVersion/value",
        ],
        spec,
        segment.id,
      ),
    });
    if (!input.works.some((entry) => entry.id === `work-${spec.source}`))
      input.works.push({
        id: `work-${spec.source}`,
        sourceProfileId: profile.id,
        sourceIdentifier: `Instrument ${spec.source.toUpperCase()}`,
        title: `Synthetic Policy ${spec.source === "a" ? "Alpha" : "Beta"}`,
        instrumentClass: spec.source === "a" ? "regulation" : "statute",
        governmentContext:
          spec.source === "a"
            ? "Synthetic federal context"
            : "Synthetic Washington context",
        issuerRoles: [
          {
            role: "issuer",
            label: `Synthetic institutional issuer ${spec.source}`,
          },
        ],
        relevance: "general_jurisdiction",
        taxonomy: "Unclassified",
        fieldProvenance: provenance(
          [
            "/sourceIdentifier",
            "/title",
            "/instrumentClass",
            "/governmentContext",
            "/issuerRoles/0/role",
            "/issuerRoles/0/label",
          ],
          spec,
          segment.id,
        ),
      });
    input.events.push({
      id: `event-${spec.key}`,
      workId: `work-${spec.source}`,
      versionId,
      type: "effective",
      date: day(`${spec.year}-01-01`),
      sourceStatedAt: day(`${spec.year}-01-01`),
      sourceLabel: "Effective",
      segmentIds: [segment.id],
      fieldProvenance: provenance(
        ["/sourceLabel", "/date/value", "/sourceStatedAt/value"],
        spec,
        segment.id,
      ),
    });
    input.analyses.push({
      id: `analysis-${spec.key}`,
      versionId,
      kind: "institutional_procedure",
      method: { id: "synthetic-analyst-coding", version: "1.0.0" },
      reviewer: {
        name: "Synthetic analyst",
        kind: "agent",
        reviewedAt: "2026-09-02T12:00:00Z",
      },
      uncertainty: "provisional",
      codes: [
        {
          dimension: "procedure",
          value: "Review proposals",
          segmentIds: [segment.id],
        },
        {
          dimension: "modality",
          value: spec.source === "a" ? "obligation" : "permission",
          segmentIds: [segment.id],
        },
      ],
    });
  }
  input.relationships.push({
    id: "relationship-b-a",
    fromVersionId: "version-b",
    type: "cites",
    target: {
      state: "resolved",
      workId: "work-a",
      versionId: "version-a-old",
      sourceIdentifier: "Instrument A",
      candidateVersionIds: [],
    },
    sourceLabel: "Cites Instrument A",
    sourceStatedAt: day("2021-01-01"),
    segmentIds: [input.segments[2].id],
  });
  input.findings.push({
    id: "finding-synthetic-review",
    question: "Do the synthetic procedures differ?",
    populationVersionIds: ["version-a-old", "version-b"],
    method: { id: "synthetic-institutional-comparison", version: "1.0.0" },
    reviewer: {
      name: "Synthetic analyst",
      kind: "agent",
      reviewedAt: "2026-09-02T12:00:00Z",
    },
    disposition: "provisional",
    claim: "The authored examples use different modal words.",
    supportingSegmentIds: [input.segments[0].id, input.segments[2].id],
    contrarySegmentIds: [],
    missingEvidence: ["No real source evidence is represented."],
    rivalExplanations: ["The examples were authored to differ."],
    nextDisconfirmingTest: "Compare a further independent source passage.",
    analysisIds: ["analysis-a-old", "analysis-b"],
  });
  input.coverage = profiles.map((profile) => ({
    id: `coverage-${profile.sourceId}`,
    sourceProfileId: profile.id,
    status: "healthy",
    documentCount: 1,
    versionCount: profile.sourceId === "source-a" ? 2 : 1,
    from: day(profile.sourceId === "source-a" ? "2020-01-01" : "2021-01-01"),
    through: day(profile.sourceId === "source-a" ? "2022-01-01" : "2021-01-01"),
    dataAsOf: capturedAt,
    lastSuccessfulAt: capturedAt,
    failureStage: null,
    lastKnownGoodDigest: null,
    limitations: ["Authored synthetic test population only."],
    exclusions: [],
  }));
  return input;
}

export function syntheticCorpusV2() {
  return createAnalyzedCorpusV2(syntheticCorpusV2Input());
}

test("v2 closed schema compiles strictly and agrees with representative runtime output", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.equal(
    validate(syntheticCorpusV2()),
    true,
    JSON.stringify(validate.errors),
  );
  const invalid = clone(syntheticCorpusV2());
  invalid.works[0].nationAssociation = "inferred";
  assert.equal(validate(invalid), false);
});

test("v2 source-neutral producer, validator and projection retain exact independent identities", () => {
  const input = syntheticCorpusV2Input();
  const corpus = createAnalyzedCorpusV2(input);
  assert.equal(corpus.works.length, 2);
  assert.equal(corpus.versions.length, 3);
  assert.equal(corpus.sourceProfiles[0].publisher, "Synthetic publisher a");
  assert.ok(Object.isFrozen(corpus.renditions[0]));
  assert.equal(Object.isFrozen(input), false);
  assert.equal(
    serializeAnalyzedCorpusV2(parseAnalyzedCorpusV2(corpus)),
    serializeAnalyzedCorpusV2(corpus),
  );
  input.renditions[0].text = "mutated";
  assert.notEqual(corpus.renditions[0].text, "mutated");
  const view = projectLocalCorpusV2(corpus);
  assert.equal(view.records.length, 3);
  assert.equal(view.publication, "closed");
  assert.match(
    view.records[0].authorityLabel,
    /not an official legal edition/u,
  );
});

test("capture paths accept both exact digest layouts while rejecting arbitrary or mismatched storage names", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const input = syntheticCorpusV2Input();
  const capture = input.captures[0];
  const originalPath = capture.objectPath;
  capture.objectPath = `objects/${capture.objectDigest}.bin`;
  const corpus = createAnalyzedCorpusV2(input);
  assert.equal(validate(corpus), true, JSON.stringify(validate.errors));
  assert.equal(
    parseAnalyzedCorpusV2(corpus).captures.find(
      (item) => item.id === capture.id,
    ).objectPath,
    capture.objectPath,
  );
  for (const path of [
    `objects/${"0".repeat(64)}.bin`,
    originalPath.replace("/sha256/", "/sha256/ff/"),
    `objects/../${capture.objectDigest}.bin`,
    `objects/${capture.objectDigest}.json`,
    `objects\\${capture.objectDigest}.bin`,
    `${capture.objectDigest}.bin`,
    originalPath.replace(capture.objectDigest.slice(0, 2), "zz"),
  ]) {
    capture.objectPath = path;
    assert.throws(() => createAnalyzedCorpusV2(input), {
      code: "OBJECT_PATH_MISMATCH",
    });
  }
  const invalid = clone(corpus);
  invalid.captures[0].objectPath = "objects/arbitrary.bin";
  assert.equal(validate(invalid), false);
});

test("reordering catalogs and object keys preserves deterministic producer serialization", () => {
  const input = syntheticCorpusV2Input();
  const expected = serializeAnalyzedCorpusV2(createAnalyzedCorpusV2(input));
  for (const key of ["works", "versions", "captures", "segments"])
    input[key].reverse();
  assert.equal(
    serializeAnalyzedCorpusV2(createAnalyzedCorpusV2(input)),
    expected,
  );
});

test("citation replay binds original bytes, parser rendition, UTF-8 offsets and exact version", () => {
  const corpus = syntheticCorpusV2();
  const segment = corpus.segments[0];
  const rendition = corpus.renditions.find(
    (entry) => entry.id === segment.renditionId,
  );
  const bytes = Buffer.from(rendition.text);
  const args = {
    corpus,
    segmentId: segment.id,
    objectBytes: bytes,
    renditionBytes: bytes,
  };
  assert.equal(replayCorpusCitation(args).parserReplay, "not_performed");
  const replay = replayCorpusCitation({
    ...args,
    reextract: (source) => source,
  });
  assert.equal(replay.parserReplay, "verified");
  assert.equal(replay.quote, rendition.text);
  assert.throws(
    () =>
      replayCorpusCitation({ ...args, objectBytes: Buffer.from("corrupt") }),
    /OBJECT_INTEGRITY/u,
  );
  assert.throws(
    () =>
      replayCorpusCitation({ ...args, reextract: () => Buffer.from("wrong") }),
    /PARSER_REPLAY_MISMATCH/u,
  );
});

test("source profile review, URL policy, public-use, coverage and provenance fail closed after resealing", () => {
  for (const [mutate, code] of [
    [
      (input) => {
        input.sourceProfiles[0].uses.publicRedistribution = "allowed";
      },
      "PUBLIC_DISTRIBUTION_CLOSED",
    ],
    [
      (input) => {
        input.sourceProfiles[0].review.expiresAt = reviewTime;
      },
      "SOURCE_REVIEW_NOT_CURRENT",
    ],
    [
      (input) => {
        input.captures[0].finalUrl = "https://other.invalid/policy/a";
      },
      "URL_OUTSIDE_PROFILE",
    ],
    [
      (input) => {
        input.captures[0].finalUrl += "?token=private";
      },
      "UNSAFE_URL",
    ],
    [
      (input) => {
        input.coverage[0].documentCount = 22;
      },
      "COVERAGE_COUNT_MISMATCH",
    ],
    [
      (input) => {
        input.works[0].title = "Invented title";
      },
      "SOURCE_ATTESTED_VALUE_NOT_IN_EVIDENCE",
    ],
    [
      (input) => {
        input.versions[0].observedAt = "2020-01-01T00:00:00Z";
      },
      "VERSION_OBSERVATION_MISMATCH",
    ],
    [
      (input) => {
        input.works[0].fieldProvenance = [];
      },
      "ARRAY_LIMIT",
    ],
  ]) {
    const input = syntheticCorpusV2Input();
    mutate(input);
    assert.throws(() => createAnalyzedCorpusV2(input), new RegExp(code, "u"));
  }
});

test("capture-property provenance cannot attest arbitrary source values", () => {
  const input = syntheticCorpusV2Input();
  input.works[0].fieldProvenance.find(
    (entry) => entry.field === "/title",
  ).segmentIds = [];
  input.works[0].fieldProvenance.find(
    (entry) => entry.field === "/title",
  ).sourceLocator = "$capture.requestedUrl";
  assert.throws(
    () => createAnalyzedCorpusV2(input),
    /CAPTURE_PROPERTY_PROVENANCE_MISMATCH/u,
  );
});

test("same text in distinct renditions retains distinct occurrence segment identities", () => {
  const bytes = Buffer.from("Identical synthetic policy é\n");
  const renditionDigest = hash(bytes);
  const common = {
    renditionDigest,
    renditionBytes: bytes,
    startByte: 0,
    endByte: bytes.length,
    locator: {
      type: "line",
      value: "1",
      headingPath: [],
      printedPageLabel: null,
      physicalPageIndex: null,
    },
  };
  assert.notEqual(
    createEvidenceSegment({ ...common, renditionId: "rendition-one" }).id,
    createEvidenceSegment({ ...common, renditionId: "rendition-two" }).id,
  );
});

test("closed graph rejects byte corruption, unknown references, inferred relations and authoritative analysis fields", () => {
  for (const mutate of [
    (input) => {
      input.renditions[0].text += "changed";
    },
    (input) => {
      input.versions[0].renditionIds = ["missing-rendition"];
    },
    (input) => {
      input.relationships[0].type = "analytical_similarity";
    },
    (input) => {
      input.analyses[0].nationAssociation = "inferred";
    },
    (input) => {
      input.events[0].workId = "work-b";
    },
    (input) => {
      input.relationships[0].target.versionId = "version-b";
    },
    (input) => {
      input.findings[0].populationVersionIds = ["version-a-new"];
    },
  ]) {
    const input = syntheticCorpusV2Input();
    mutate(input);
    assert.throws(() => createAnalyzedCorpusV2(input));
  }
});

test("unknown dates and unresolved citations survive without invented predecessors", () => {
  const input = syntheticCorpusV2Input();
  input.versions[0].dates.sourceVersion = unknown();
  input.versions[0].fieldProvenance = input.versions[0].fieldProvenance.filter(
    (entry) => entry.field !== "/dates/sourceVersion/value",
  );
  input.relationships[0].target = {
    state: "unresolved",
    workId: null,
    versionId: null,
    sourceIdentifier: "Missing Instrument Z",
    candidateVersionIds: [],
  };
  const corpus = createAnalyzedCorpusV2(input);
  assert.equal(
    corpus.versions.find((entry) => entry.id === "version-a-old").dates
      .sourceVersion.value,
    null,
  );
  assert.equal(corpus.relationships[0].target.state, "unresolved");
});

test("plain JSON capture rejects accessors, cycles, prototypes and secret metadata without invoking getters", () => {
  let calls = 0;
  const input = syntheticCorpusV2Input();
  Object.defineProperty(input, "generatedAt", {
    enumerable: true,
    get() {
      calls++;
      return capturedAt;
    },
  });
  assert.throws(() => createAnalyzedCorpusV2(input), /PLAIN_JSON_REQUIRED/u);
  assert.equal(calls, 0);
  const cyclic = syntheticCorpusV2Input();
  cyclic.extra = cyclic;
  assert.throws(() => createAnalyzedCorpusV2(cyclic), /PLAIN_JSON_REQUIRED/u);
  assert.throws(
    () => createAnalyzedCorpusV2(new Proxy(syntheticCorpusV2Input(), {})),
    /PLAIN_JSON_REQUIRED/u,
  );
  const secret = syntheticCorpusV2Input();
  secret.captures[0].headers = { Authorization: "secret" };
  assert.throws(() => createAnalyzedCorpusV2(secret), /CLOSED_SHAPE_REQUIRED/u);
});

test("replay does not accept a mutated resealed source profile or existing v1 corpus", () => {
  const input = syntheticCorpusV2Input();
  input.sourceProfiles[0].publisher = "Other publisher";
  assert.throws(
    () => createAnalyzedCorpusV2(input),
    /SOURCE_PROFILE_DIGEST_MISMATCH/u,
  );
  const corpus = clone(syntheticCorpusV2());
  corpus.schemaVersion = "1.1.0";
  assert.throws(() => parseAnalyzedCorpusV2(corpus));
});

test("degraded output requires exact checksum-bound same-source prior corpus and original time", () => {
  const prior = syntheticCorpusV2();
  const input = syntheticCorpusV2Input();
  input.generatedAt = "2026-09-04T00:00:00Z";
  input.coverage[0].status = "degraded";
  input.coverage[0].failureStage = "controlled_transport_failure";
  input.coverage[0].lastKnownGoodDigest = prior.contentDigest;
  assert.throws(
    () => createAnalyzedCorpusV2(input),
    /VERIFIED_PRIOR_CORPUS_REQUIRED/u,
  );
  const options = { lastKnownGoodCorpora: [prior] };
  const degraded = createAnalyzedCorpusV2(input, options);
  assert.equal(
    parseAnalyzedCorpusV2(degraded, options).coverage[0].dataAsOf,
    prior.coverage[0].dataAsOf,
  );
  assert.equal(projectLocalCorpusV2(degraded, options).records.length, 3);
  input.coverage[0].dataAsOf = "2026-09-01T23:00:00Z";
  assert.throws(
    () => createAnalyzedCorpusV2(input, options),
    /LKG_ORIGINAL_TIME_REQUIRED/u,
  );
  input.coverage[0].dataAsOf = prior.coverage[0].dataAsOf;
  input.sourceProfiles[0].publisher = "Different profile publisher";
  for (const capture of input.captures.filter(
    (entry) => entry.sourceProfileId === input.sourceProfiles[0].id,
  ))
    capture.sourceProfileDigest = canonicalV2Digest(input.sourceProfiles[0]);
  assert.throws(
    () => createAnalyzedCorpusV2(input, options),
    /LKG_SOURCE_SNAPSHOT_MISMATCH/u,
  );
});

test("an unavailable source contributes no records while an independent healthy source survives", () => {
  const input = syntheticCorpusV2Input();
  input.works = input.works.filter((entry) => entry.id !== "work-b");
  input.versions = input.versions.filter((entry) => entry.workId !== "work-b");
  input.renditions = input.renditions.filter(
    (entry) => entry.versionId !== "version-b",
  );
  input.segments = input.segments.filter(
    (entry) => entry.renditionId !== "rendition-b",
  );
  input.captures = input.captures.filter((entry) => entry.id !== "capture-b");
  input.events = input.events.filter((entry) => entry.workId !== "work-b");
  input.analyses = input.analyses.filter(
    (entry) => entry.versionId !== "version-b",
  );
  input.relationships = [];
  input.findings = [];
  Object.assign(input.coverage[1], {
    status: "unavailable",
    documentCount: 0,
    versionCount: 0,
    dataAsOf: null,
    lastSuccessfulAt: null,
    failureStage: "controlled_transport_failure",
    from: unknown(),
    through: unknown(),
  });
  const corpus = createAnalyzedCorpusV2(input);
  assert.equal(corpus.works.length, 1);
  assert.equal(
    corpus.coverage.find((entry) => entry.sourceProfileId === "profile-b")
      .status,
    "unavailable",
  );
});

test("a fully unavailable corpus remains inspectable with no invented records", () => {
  const input = syntheticCorpusV2Input();
  for (const key of [
    "captures",
    "works",
    "versions",
    "renditions",
    "segments",
    "events",
    "relationships",
    "analyses",
    "findings",
  ])
    input[key] = [];
  for (const coverage of input.coverage)
    Object.assign(coverage, {
      status: "unavailable",
      documentCount: 0,
      versionCount: 0,
      dataAsOf: null,
      lastSuccessfulAt: null,
      failureStage: "controlled_transport_failure",
      from: unknown(),
      through: unknown(),
    });
  const corpus = createAnalyzedCorpusV2(input);
  assert.equal(projectLocalCorpusV2(corpus).records.length, 0);
  assert.ok(corpus.coverage.every((entry) => entry.status === "unavailable"));
  const ajv = new Ajv2020({ strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.equal(validate(corpus), true, JSON.stringify(validate.errors));
});
