import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { URL } from "node:url";
import {
  canonicalV2Digest,
  createAnalyzedCorpusV2,
  createEvidenceSegment,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";
import {
  syntheticCorpusV2Input,
  syntheticCorpusV2,
} from "./analyzed-corpus-v2.test.mjs";
import {
  createPolicySearchIndex,
  searchPolicyCorpus,
  policySearchPassage,
} from "../../src/engine/policy-search.mjs";

function withBlocks(input, renditionId, blocks) {
  const rendition = input.renditions.find((value) => value.id === renditionId);
  const capture = input.captures.find(
    (value) => value.id === rendition.captureId,
  );
  const previous = input.segments.find(
    (value) => value.renditionId === renditionId,
  );
  const sourceBlocks = [rendition.text, ...blocks];
  const bytes = Buffer.from(sourceBlocks.join("\n\n"));
  const digest = createHash("sha256").update(bytes).digest("hex");
  rendition.text = bytes.toString("utf8");
  rendition.outputDigest = digest;
  rendition.byteLength = bytes.length;
  capture.encodedBytes = bytes.length;
  capture.decodedBytes = bytes.length;
  capture.objectDigest = digest;
  capture.objectPath = `objects/${digest}.bin`;
  let startByte = 0;
  const segments = sourceBlocks.map((block, index) => {
    const endByte = startByte + Buffer.byteLength(block);
    const segment = createEvidenceSegment({
      renditionId,
      renditionDigest: digest,
      renditionBytes: bytes,
      startByte,
      endByte,
      locator: {
        type: "structural_path",
        value: index ? `/policy/block[${index + 1}]` : previous.locator.value,
        headingPath: [],
        printedPageLabel: null,
        physicalPageIndex: null,
      },
    });
    startByte = endByte + 2;
    return segment;
  });
  input.segments = input.segments.filter((value) => value.id !== previous.id);
  input = JSON.parse(
    JSON.stringify(input).replaceAll(previous.id, segments[0].id),
  );
  input.segments.push(...segments);
  return input;
}

test("exact version and source identifiers precede incidental references, with stable passage occurrences", () => {
  const corpus = syntheticCorpusV2();
  const index = createPolicySearchIndex(corpus);
  const exact = searchPolicyCorpus(index, { query: "version-a-new" });
  assert.equal(exact.hits[0].versionId, "version-a-new");
  assert.ok(exact.hits[0].whyShown.includes("exact_version_id"));
  const reference = searchPolicyCorpus(index, { query: "Instrument A" });
  assert.equal(reference.hits[0].workId, "work-a");
  assert.equal(reference.hits[1].workId, "work-a");
  assert.ok(
    reference.hits.some(
      (hit) => hit.workId === "work-b" && !hit.exactIdentifierMatch,
    ),
  );
  const scoped = searchPolicyCorpus(index, {
    query: "review",
    sourceProfileId: "profile-a",
    asOf: "2020-12-31",
    basis: "source_available",
  });
  assert.deepEqual(scoped.temporal.unknownWorkIds, []);
  assert.ok(
    scoped.temporal.excluded.every((entry) => entry.workId === "work-a"),
  );
  const passage = reference.hits[0].passages[0];
  assert.equal(
    corpus.segments.find((segment) => segment.id === passage.segmentId)
      .renditionId,
    passage.renditionId,
  );
  const shuffled = {
    ...corpus,
    works: [...corpus.works].reverse(),
    versions: [...corpus.versions].reverse(),
    segments: [...corpus.segments].reverse(),
  };
  assert.deepEqual(
    searchPolicyCorpus(createPolicySearchIndex(shuffled), {
      query: "Instrument A",
    }),
    reference,
  );
});

test("quoted source phrases and distinct document matches are transparent; nonsense never generates an answer", () => {
  const index = createPolicySearchIndex(syntheticCorpusV2());
  const result = searchPolicyCorpus(index, { query: '"within 30 days"' });
  assert.deepEqual(
    result.hits.map((hit) => hit.versionId),
    ["version-a-new"],
  );
  assert.deepEqual(result.hits[0].passages[0].matchedPhrases, [
    "within 30 days",
  ]);
  assert.equal(
    searchPolicyCorpus(index, { query: "unfindablequantumword" }).total,
    0,
  );
  const multiple = searchPolicyCorpus(index, {
    query: "council commission review",
  });
  assert.deepEqual(
    [...new Set(multiple.hits.map((hit) => hit.workId))].sort(),
    ["work-a", "work-b"],
  );
  assert.equal(Object.hasOwn(multiple, "answer"), false);
  assert.throws(
    () => searchPolicyCorpus(index, { query: "review", limit: 1001 }),
    /INVALID_LIMIT/u,
  );
});

test("every quoted phrase must occur in the eligible title or passages", () => {
  const input = withBlocks(syntheticCorpusV2Input(), "rendition-a-new", [
    "A separate passage contains the second literal phrase.",
  ]);
  const index = createPolicySearchIndex(createAnalyzedCorpusV2(input));
  for (const query of [
    '"within 30 days" "missingphrasexyz"',
    '"Synthetic Policy Alpha" "missingphrasexyz"',
  ])
    assert.equal(searchPolicyCorpus(index, { query }).total, 0);
  for (const query of [
    '"within 30 days" "second literal phrase"',
    '"Synthetic Policy Alpha" "second literal phrase"',
  ])
    assert.deepEqual(
      searchPolicyCorpus(index, { query, passageLimit: 1 }).hits.map(
        (hit) => hit.versionId,
      ),
      ["version-a-new"],
    );
  assert.equal(
    searchPolicyCorpus(index, {
      query: '"Synthetic Policy Alpha" "second literal phrase"',
      asOf: "2020-12-31",
      basis: "source_available",
    }).total,
    0,
  );
});

test("source/context/instrument filters and source as-of selection preserve unknown dates and reject future evidence", () => {
  const input = syntheticCorpusV2Input();
  input.versions[2].dates = {
    publication: { value: null, precision: "unknown" },
    sourceVersion: { value: null, precision: "unknown" },
  };
  input.versions[2].fieldProvenance = input.versions[2].fieldProvenance.filter(
    (entry) => !entry.field.startsWith("/dates/"),
  );
  const index = createPolicySearchIndex(createAnalyzedCorpusV2(input));
  const filtered = searchPolicyCorpus(index, {
    query: "review",
    sourceProfileId: "profile-a",
    governmentContext: "Synthetic federal context",
    instrumentClass: "regulation",
  });
  assert.equal(filtered.hits.length, 2);
  const snapshot = searchPolicyCorpus(index, {
    query: "review",
    asOf: "2020-12-31",
    basis: "source_available",
  });
  assert.deepEqual(
    snapshot.hits.map((hit) => hit.versionId),
    ["version-a-old"],
  );
  assert.ok(snapshot.temporal.unknownWorkIds.includes("work-b"));
  assert.ok(
    snapshot.temporal.excluded.some(
      (entry) =>
        entry.versionId === "version-a-new" &&
        entry.reason === "future_source_version",
    ),
  );
  assert.equal(
    searchPolicyCorpus(index, {
      query: "review",
      asOf: "2025-01-01",
      basis: "corpus_observed",
    }).total,
    0,
  );
  assert.equal(searchPolicyCorpus(index, { query: "review" }).total, 3);
  assert.throws(
    () => searchPolicyCorpus(index, { query: "review", asOf: "2020-01-01" }),
    /EXPLICIT_TEMPORAL_BASIS_REQUIRED/u,
  );
  assert.throws(
    () =>
      searchPolicyCorpus(index, {
        query: "review",
        asOf: "2020-02-30",
        basis: "source_available",
      }),
    /INVALID_TIMESTAMP/u,
  );
});

test("metadata display grants cannot leak source body tokens or excerpts, and snippets decode only requested evidence", () => {
  const input = syntheticCorpusV2Input();
  input.sourceProfiles[0].uses.localDisplay = "metadata_link";
  // Preserve the existing contract's required profile digest explicitly.
  for (const capture of input.captures.filter(
    (entry) => entry.sourceProfileId === "profile-a",
  ))
    capture.sourceProfileDigest = canonicalV2Digest(input.sourceProfiles[0]);
  const corpus = createAnalyzedCorpusV2(input);
  const index = createPolicySearchIndex(corpus);
  assert.equal(searchPolicyCorpus(index, { query: "council" }).total, 0);
  assert.equal(
    searchPolicyCorpus(index, { query: "Instrument A" }).hits[0].workId,
    "work-a",
  );
  const segment = corpus.segments.find(
    (entry) => entry.renditionId === "rendition-a-new",
  );
  assert.equal(policySearchPassage(index, segment.id).text, null);
  const visible = corpus.segments.find(
    (entry) => entry.renditionId === "rendition-b",
  );
  const excerpt = policySearchPassage(index, visible.id, { maxCharacters: 12 });
  assert.equal(excerpt.text, "Synthetic Po");
  assert.equal(excerpt.truncated, true);
});

test("search runtime has no source calls, model calls, query persistence or Node imports", async () => {
  const source = await readFile(
    new URL("../../src/engine/policy-search.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /node:|\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|console\./u,
  );
});

test("generic inflections match while literal phrases and exact source identifiers retain their gates", () => {
  const input = withBlocks(syntheticCorpusV2Input(), "rendition-b", [
    "The registrar consulted affected agencies and the board objected.",
  ]);
  const index = createPolicySearchIndex(createAnalyzedCorpusV2(input));
  const result = searchPolicyCorpus(index, {
    query: "consultation objections",
  });
  assert.equal(result.hits[0].versionId, "version-b");
  assert.deepEqual(result.hits[0].passages[0].matchedTerms, [
    "consultation",
    "objections",
  ]);
  assert.equal(
    searchPolicyCorpus(index, { query: '"consultation objections"' }).total,
    0,
  );
  assert.equal(
    searchPolicyCorpus(index, { query: "Instrument A" }).hits[0].workId,
    "work-a",
  );
});

test("source metadata and cutoff proof are returned even when their exact words do not match the subject query", () => {
  const input = withBlocks(syntheticCorpusV2Input(), "rendition-a-old", [
    "Galacticnebula assessment records describe the retained research procedure.",
  ]);
  const corpus = createAnalyzedCorpusV2(input);
  const index = createPolicySearchIndex(corpus);
  const proofId = corpus.versions
    .find((value) => value.id === "version-a-old")
    .fieldProvenance.find((value) => value.field === "/sourceStatusLabel")
    .segmentIds[0];
  const status = searchPolicyCorpus(index, { query: "Galacticnebula status" });
  const passage = status.hits[0].passages.find(
    (value) => value.segmentId === proofId,
  );
  assert.equal(passage.lexicalScore, 0);
  assert.equal(passage.whyShown, "source_field_provenance");
  assert.ok(passage.evidenceFields.includes("version/sourceStatusLabel"));
  const snapshot = searchPolicyCorpus(index, {
    query: "Galacticnebula",
    asOf: "2021-01-01",
    basis: "source_available",
  });
  assert.deepEqual(
    snapshot.hits.map((value) => value.versionId),
    ["version-a-old"],
  );
  assert.ok(
    snapshot.hits[0].passages
      .find((value) => value.segmentId === proofId)
      .evidenceFields.includes("version/dates/publication/value"),
  );
});

test("section context is source-linked without joining quotations and repetitive passages leave room for another instrument", () => {
  let input = withBlocks(syntheticCorpusV2Input(), "rendition-a-old", [
    "Sec. 7. Harbor coordinated permitting.",
    "(1) The clerk receives applications.",
    "(2) Notices are retained.",
    "(3) The archive preserves submitted statements.",
    ...Array.from(
      { length: 20 },
      (_, index) => `Hearing objections are recorded in example ${index}.`,
    ),
  ]);
  input = withBlocks(input, "rendition-b", [
    "The commission records hearing objections.",
  ]);
  const corpus = createAnalyzedCorpusV2(input);
  const index = createPolicySearchIndex(corpus);
  const context = searchPolicyCorpus(index, {
    query: "coordinated permitting archive statements",
    passageLimit: 20,
  });
  const archive = context.hits[0].passages.find((value) =>
    policySearchPassage(index, value.segmentId).text.includes(
      "archive preserves",
    ),
  );
  assert.ok(archive.contextSegmentIds.length > 0);
  assert.ok(archive.contextScore > 0);
  assert.ok(
    archive.contextSegmentIds.some((id) =>
      policySearchPassage(index, id).text.startsWith("Sec. 7."),
    ),
  );
  assert.equal(
    policySearchPassage(index, archive.segmentId).text,
    "(3) The archive preserves submitted statements.",
  );
  const diversified = searchPolicyCorpus(index, {
    query: "hearing objections",
    passageLimit: 20,
  });
  const pooled = diversified.hits
    .flatMap((hit) =>
      hit.passages.map((passage) => ({ ...passage, workId: hit.workId })),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  assert.deepEqual([...new Set(pooled.map((value) => value.workId))].sort(), [
    "work-a",
    "work-b",
  ]);
});

test("a prose section reference does not become a persistent heading", () => {
  const input = withBlocks(syntheticCorpusV2Input(), "rendition-a-old", [
    "Section 77 of the earlier protocol describes luminescent applications.",
    "The clerk checks submissions.",
    "The council meets monthly.",
    "The archive preserves records.",
  ]);
  const index = createPolicySearchIndex(createAnalyzedCorpusV2(input));
  const result = searchPolicyCorpus(index, {
    query: "luminescent archive",
    passageLimit: 20,
  });
  const archive = result.hits
    .flatMap((hit) => hit.passages)
    .find((passage) =>
      policySearchPassage(index, passage.segmentId).text.includes(
        "archive preserves",
      ),
    );
  assert.equal(archive.contextScore, 0);
  assert.deepEqual(archive.contextSegmentIds, []);
  assert.deepEqual(archive.matchedTerms, ["archive"]);
});
