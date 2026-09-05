import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";
import {
  compareDocumentVersions,
  compareInstitutionalProcedures,
  compareRelatedProvisions,
  policyDateBounds,
  resolveCorpusRelationships,
  selectTemporalVersions,
} from "../../src/engine/temporal-operations.mjs";
import {
  canonicalV2Digest,
  createAnalyzedCorpusV2,
  createEvidenceSegment,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";
import {
  syntheticCorpusV2,
  syntheticCorpusV2Input,
} from "./analyzed-corpus-v2.test.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const day = (value) => ({ value, precision: "day" });
const selected = (result, workId) =>
  result.selections.find((entry) => entry.workId === workId);

test("historical source availability rejects future versions and preserves missing predecessors", () => {
  const corpus = syntheticCorpusV2();
  const result = selectTemporalVersions(corpus, {
    asOf: "2021-06-01",
    basis: "source_available",
  });
  assert.deepEqual(selected(result, "work-a").versionIds, ["version-a-old"]);
  assert.equal(
    result.excluded.find((entry) => entry.versionId === "version-a-new").reason,
    "future_source_version",
  );
  const before = selectTemporalVersions(corpus, {
    asOf: "2019-12-31",
    basis: "source_available",
  });
  assert.equal(selected(before, "work-a").state, "unknown");
  assert.deepEqual(selected(before, "work-a").versionIds, []);
  assert.throws(
    () => selectTemporalVersions(corpus, { asOf: "2021-01-01" }),
    /EXPLICIT_TEMPORAL_BASIS/u,
  );
});

test("source availability and corpus observation are distinct query bases", () => {
  const corpus = syntheticCorpusV2();
  assert.equal(
    selected(
      selectTemporalVersions(corpus, {
        asOf: "2021-06-01",
        basis: "source_available",
      }),
      "work-a",
    ).state,
    "supported_source_snapshot",
  );
  assert.equal(
    selected(
      selectTemporalVersions(corpus, {
        asOf: "2021-06-01",
        basis: "corpus_observed",
      }),
      "work-a",
    ).state,
    "unknown",
  );
  const observed = selected(
    selectTemporalVersions(corpus, {
      asOf: "2026-09-02",
      basis: "corpus_observed",
    }),
    "work-a",
  );
  assert.equal(observed.state, "ambiguous");
  assert.equal(observed.versionIds.length, 2);
});

test("source-stated effectiveness neither conflates enactment nor uses a future source event", () => {
  const input = syntheticCorpusV2Input();
  input.events.find((event) => event.versionId === "version-a-old").type =
    "enacted";
  const corpus = createAnalyzedCorpusV2(input);
  const result = selectTemporalVersions(corpus, {
    asOf: "2021-06-01",
    basis: "source_effective",
  });
  assert.equal(selected(result, "work-a").state, "unknown");
  assert.equal(
    selected(result, "work-b").reason,
    "source_stated_effectiveness_only",
  );
  const future = syntheticCorpusV2Input();
  const event = future.events.find(
    (entry) => entry.versionId === "version-a-old",
  );
  event.sourceStatedAt = day("2022-01-01");
  const field = event.fieldProvenance.find(
    (entry) => entry.field === "/sourceStatedAt/value",
  );
  field.mode = "deterministic";
  field.ruleId = "synthetic-date-normalization";
  const rejected = selectTemporalVersions(createAnalyzedCorpusV2(future), {
    asOf: "2021-06-01",
    basis: "source_effective",
  });
  assert.equal(selected(rejected, "work-a").state, "unknown");
});

test("partial dates remain indeterminate across their interval, with calendar validation", () => {
  assert.deepEqual(policyDateBounds({ value: "2020-02", precision: "month" }), {
    earliest: "2020-02-01T00:00:00.000Z",
    latest: "2020-02-29T23:59:59.999Z",
    precision: "month",
  });
  assert.equal(policyDateBounds({ value: null, precision: "unknown" }), null);
  assert.throws(
    () => policyDateBounds(day("2020-02-30")),
    /INVALID_TIMESTAMP/u,
  );
  const input = syntheticCorpusV2Input();
  const version = input.versions[0];
  version.dates.sourceVersion = { value: "2020", precision: "year" };
  const result = selectTemporalVersions(createAnalyzedCorpusV2(input), {
    asOf: "2020-06-01",
    basis: "source_available",
  });
  assert.equal(selected(result, "work-a").state, "unknown");
  assert.equal(
    result.excluded.find((entry) => entry.versionId === version.id).reason,
    "partial_date_crosses_cutoff",
  );
});

test("actual version comparison reports text changes and evidence IDs without legal conclusions", () => {
  const corpus = syntheticCorpusV2();
  const result = compareDocumentVersions(corpus, {
    beforeVersionId: "version-a-old",
    afterVersionId: "version-a-new",
  });
  assert.equal(result.changeType, "text_changed");
  assert.equal(result.temporalOrder, "source_dates_ordered");
  assert.equal(result.changes[0].kind, "unaligned_before");
  assert.equal(result.changes[0].beforeSegmentIds.length, 1);
  assert.equal(result.changes[0].afterSegmentIds.length, 0);
  assert.equal(result.changes[1].kind, "unaligned_after");
  assert.equal(result.changes[1].afterSegmentIds.length, 1);
  assert.throws(
    () =>
      compareDocumentVersions(corpus, {
        beforeVersionId: "version-a-old",
        afterVersionId: "version-b",
      }),
    /SAME_WORK/u,
  );
  assert.throws(
    () =>
      compareDocumentVersions(corpus, {
        beforeVersionId: "version-a-new",
        afterVersionId: "version-a-old",
      }),
    /REVERSED_VERSION/u,
  );
});

test("related provisions require an explicit change edge and never merge distinct instrument identities", () => {
  const input = syntheticCorpusV2Input();
  input.relationships[0].type = "amends";
  input.relationships[0].sourceLabel = "Amends Instrument A";
  const corpus = createAnalyzedCorpusV2(input);
  const request = {
    beforeVersionId: "version-a-old",
    afterVersionId: "version-b",
    relationshipId: "relationship-b-a",
  };
  const result = compareRelatedProvisions(corpus, request);
  assert.equal(result.kind, "related_provision_comparison");
  assert.equal(result.beforeWorkId, "work-a");
  assert.equal(result.afterWorkId, "work-b");
  assert.equal(Object.hasOwn(result, "workId"), false);
  assert.equal(result.relationshipSegmentIds.length, 1);
  assert.equal(result.comparisonScope, "whole_instrument_text");
  assert.throws(
    () => compareRelatedProvisions(syntheticCorpusV2(), request),
    /EXPLICIT_CHANGE_RELATIONSHIP_REQUIRED/u,
  );
  assert.throws(
    () =>
      compareRelatedProvisions(corpus, {
        ...request,
        relationshipId: "missing-relationship",
      }),
    /EXPLICIT_CHANGE_RELATIONSHIP_REQUIRED/u,
  );
});

test("formatting-only changes and repeated locators are explicitly distinguished", () => {
  const input = syntheticCorpusV2Input();
  const left = input.renditions.find((entry) => entry.id === "rendition-a-old");
  const right = input.renditions.find(
    (entry) => entry.id === "rendition-a-new",
  );
  // Operate on a declared test projection to isolate the deterministic comparator.
  const corpus = syntheticCorpusV2();
  const projection = JSON.parse(JSON.stringify(corpus));
  projection.renditions.find((entry) => entry.id === right.id).text =
    left.text.replaceAll(" ", "  ");
  const bytes = Buffer.from(
    projection.renditions.find((entry) => entry.id === right.id).text,
  );
  projection.segments = projection.segments.filter(
    (entry) => entry.renditionId !== right.id,
  );
  projection.segments.push(
    createEvidenceSegment({
      renditionId: right.id,
      renditionDigest: hash(bytes),
      renditionBytes: bytes,
      startByte: 0,
      endByte: bytes.length,
      locator: {
        type: "structural_path",
        value: "/policy/section-1",
        headingPath: [],
        printedPageLabel: null,
        physicalPageIndex: null,
      },
    }),
  );
  const result = compareDocumentVersions(projection, {
    beforeVersionId: "version-a-old",
    afterVersionId: "version-a-new",
  });
  assert.equal(result.changeType, "formatting_only");
  assert.equal(result.changes[0].kind, "formatting_only");
});

test("inserted paragraphs cannot turn rendition positions into provision correspondence", () => {
  // A declared synthetic comparison projection isolates alignment from ingestion.
  const projection = JSON.parse(JSON.stringify(syntheticCorpusV2()));
  const install = (renditionId, paragraphs) => {
    const selected = projection.renditions.find(
      (entry) => entry.id === renditionId,
    );
    selected.text = paragraphs.join("\n");
    const bytes = Buffer.from(selected.text);
    selected.outputDigest = hash(bytes);
    projection.segments = projection.segments.filter(
      (entry) => entry.renditionId !== renditionId,
    );
    let start = 0;
    const ids = [];
    paragraphs.forEach((text, index) => {
      const end = start + Buffer.byteLength(text);
      const segment = createEvidenceSegment({
        renditionId,
        renditionDigest: hash(bytes),
        renditionBytes: bytes,
        startByte: start,
        endByte: end,
        locator: {
          type: "structural_path",
          value: `/document/p[${index + 1}]`,
          headingPath: [],
          printedPageLabel: null,
          physicalPageIndex: null,
        },
      });
      projection.segments.push(segment);
      ids.push(segment.id);
      start = end + 1;
    });
    return ids;
  };
  const before = install("rendition-a-old", [
    "Header",
    "Agency must report annually.",
    "Repeated notice",
    "Repeated notice",
  ]);
  const after = install("rendition-a-new", [
    "Inserted cover",
    "Header",
    "Agency must report annually.",
    "Repeated notice",
    "Repeated notice",
    "Agency may report monthly.",
  ]);
  const result = compareDocumentVersions(projection, {
    beforeVersionId: "version-a-old",
    afterVersionId: "version-a-new",
  });
  const annual = result.changes.find((entry) =>
    entry.beforeSegmentIds.includes(before[1]),
  );
  assert.equal(annual.kind, "unchanged");
  assert.equal(annual.alignment, "unique_exact_text");
  assert.deepEqual(annual.afterSegmentIds, [after[2]]);
  assert.equal(
    result.changes.filter((entry) => entry.kind === "ambiguous_text").length,
    4,
  );
  assert.ok(
    result.changes.some(
      (entry) =>
        entry.kind === "unaligned_after" &&
        entry.afterSegmentIds.includes(after[0]),
    ),
  );
  assert.ok(
    result.changes.every(
      (entry) => !["added", "removed", "text_changed"].includes(entry.kind),
    ),
  );
});

test("relationship target resolution distinguishes observation from source dates", () => {
  const projection = JSON.parse(JSON.stringify(syntheticCorpusV2()));
  const target = projection.versions.find(
    (entry) => entry.id === "version-a-old",
  );
  target.dates = {
    publication: { value: null, precision: "unknown" },
    sourceVersion: { value: null, precision: "unknown" },
  };
  const observed = resolveCorpusRelationships(projection, {
    versionId: "version-b",
    asOf: "2026-09-03",
    basis: "corpus_observed",
  });
  assert.equal(observed.basis, "corpus_observed");
  assert.equal(observed.relationships[0].state, "resolved");
  target.observedAt = "2026-09-04T00:00:00Z";
  const future = resolveCorpusRelationships(projection, {
    versionId: "version-b",
    asOf: "2026-09-03",
    basis: "corpus_observed",
  });
  assert.equal(future.relationships[0].state, "target_not_available_by_cutoff");
  const source = resolveCorpusRelationships(projection, {
    versionId: "version-b",
    asOf: "2026-09-03",
    basis: "source_available",
  });
  assert.equal(source.relationships[0].state, "target_not_available_by_cutoff");
  const effective = selectTemporalVersions(syntheticCorpusV2(), {
    asOf: "2026-09-03",
    basis: "source_effective",
  });
  assert.ok(
    effective.limitations.some((value) => /not an in-force filter/.test(value)),
  );
});

test("institutional comparison is reproducible, cross-context, source linked and attributed", () => {
  const corpus = syntheticCorpusV2();
  const args = { analysisIds: ["analysis-a-old", "analysis-b"] };
  const result = compareInstitutionalProcedures(corpus, args);
  assert.deepEqual(compareInstitutionalProcedures(corpus, args), result);
  assert.equal(
    new Set(result.references.map((entry) => entry.governmentContext)).size,
    2,
  );
  const modalities = result.rows.find(
    (row) => row.dimension === "modality",
  ).observations;
  assert.deepEqual(
    modalities.map((entry) => entry.values[0].value),
    ["obligation", "permission"],
  );
  assert.equal(modalities[0].reviewer.kind, "agent");
  assert.equal(modalities[0].uncertainty, "provisional");
  assert.ok(modalities.every((entry) => entry.values[0].segmentIds.length > 0));
  assert.ok(
    result.rows
      .find((row) => row.dimension === "exception")
      .observations.every((entry) => entry.state === "not_coded_unknown"),
  );
});

test("explicit citation resolution leaves unavailable targets and unknown references visible", () => {
  const corpus = syntheticCorpusV2();
  assert.equal(
    resolveCorpusRelationships(corpus, {
      versionId: "version-b",
      asOf: "2021-06-01",
    }).relationships[0].state,
    "resolved",
  );
  assert.equal(
    resolveCorpusRelationships(corpus, {
      versionId: "version-b",
      asOf: "2020-01-01",
    }).relationships.length,
    0,
  );
  const input = syntheticCorpusV2Input();
  input.relationships[0].target.versionId = "version-a-new";
  const result = resolveCorpusRelationships(createAnalyzedCorpusV2(input), {
    versionId: "version-b",
    asOf: "2021-06-01",
  });
  assert.equal(result.relationships[0].state, "target_not_available_by_cutoff");
  assert.equal(result.relationships[0].target.versionId, null);
});

test("ambiguous citation candidates cannot leak future versions or become resolved by filtering", () => {
  const input = syntheticCorpusV2Input();
  input.relationships[0].target = {
    state: "ambiguous",
    workId: null,
    versionId: null,
    sourceIdentifier: "Instrument A version unspecified",
    candidateVersionIds: ["version-a-old", "version-a-new"],
  };
  const value = createAnalyzedCorpusV2(input);
  const result = resolveCorpusRelationships(value, {
    versionId: "version-b",
    asOf: "2021-06-01",
  });
  assert.equal(result.relationships[0].state, "ambiguous");
  assert.deepEqual(result.relationships[0].target.candidateVersionIds, [
    "version-a-old",
  ]);
  assert.equal(result.relationships[0].target.versionId, null);
});

test("later rendition capture preserves first observation but cannot leak its evidence backwards", () => {
  const input = syntheticCorpusV2Input();
  const prior = input.renditions[0];
  const capture = {
    ...input.captures[0],
    id: "capture-a-later",
    operationId: "operation-a-later",
    retrievedAt: "2026-09-02T12:00:00Z",
  };
  const later = { ...prior, id: "rendition-a-later", captureId: capture.id };
  const segment = createEvidenceSegment({
    renditionId: later.id,
    renditionDigest: later.outputDigest,
    renditionBytes: Buffer.from(later.text),
    startByte: 0,
    endByte: later.byteLength,
    locator: {
      type: "line",
      value: "1",
      headingPath: [],
      printedPageLabel: null,
      physicalPageIndex: null,
    },
  });
  input.captures.push(capture);
  input.renditions.push(later);
  input.segments.push(segment);
  input.versions[0].renditionIds.push(later.id);
  const corpus = createAnalyzedCorpusV2(input);
  const result = selectTemporalVersions(corpus, {
    asOf: "2026-09-02T06:00:00Z",
    basis: "corpus_observed",
  });
  assert.ok(selected(result, "work-a").renditionIds.includes(prior.id));
  assert.ok(!selected(result, "work-a").renditionIds.includes(later.id));
  assert.equal(
    corpus.versions.find((entry) => entry.id === "version-a-old").observedAt,
    "2026-09-02T00:00:00Z",
  );
  assert.equal(
    canonicalV2Digest(input.sourceProfiles[0]),
    capture.sourceProfileDigest,
  );
});

test("temporal implementation has no Node, filesystem, network, storage or model dependency", async () => {
  const source = await readFile(
    new URL("../../src/engine/temporal-operations.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /\bimport\s|node:|\bfetch\s*\(|XMLHttpRequest|localStorage|indexedDB|process\.|Date\.now\s*\(/u,
  );
});
