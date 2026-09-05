import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { URL } from "node:url";
import {
  canonicalV2Digest,
  createAnalyzedCorpusV2,
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
