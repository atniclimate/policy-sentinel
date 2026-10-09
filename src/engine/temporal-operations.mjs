// Pure browser-compatible operations over an already validated v2 corpus.
// No operation makes a determination of current law or legal applicability.
const METHOD_VERSION = "2.0.0";
const COMPARE_LIMIT = 20000;
const DATE_PRECISIONS = ["unknown", "year", "month", "day"];
const DATE_PATTERNS = {
  year: /^\d{4}$/u,
  month: /^\d{4}-\d{2}$/u,
  day: /^\d{4}-\d{2}-\d{2}$/u,
};
const DATE_SUFFIXES = { year: "-01-01", month: "-01", day: "" };

function fail(code) {
  throw new TypeError(`Temporal operation rejected input: ${code}`);
}
function ensure(condition, code) {
  if (!condition) fail(code);
}
function freeze(value) {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function detached(value) {
  return JSON.parse(JSON.stringify(value));
}
function corpus(value) {
  ensure(
    value &&
      ["2.0.0", "2.1.0"].includes(value.schemaVersion) &&
      value.kind === "analyzed_corpus" &&
      /^[a-f0-9]{64}$/u.test(value.contentDigest),
    "VALIDATED_V2_CORPUS_REQUIRED",
  );
  for (const key of [
    "works",
    "versions",
    "renditions",
    "segments",
    "events",
    "relationships",
    "analyses",
  ])
    ensure(Array.isArray(value[key]), "VALIDATED_V2_CORPUS_REQUIRED");
  return value;
}
function timestamp(value) {
  ensure(
    typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value),
    "INVALID_TIMESTAMP",
  );
  const result = new Date(value);
  ensure(
    !Number.isNaN(result.getTime()) &&
      result.toISOString().replace(".000Z", "Z") ===
        value.replace(".000Z", "Z"),
    "INVALID_TIMESTAMP",
  );
  return result.getTime();
}
function cutoff(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value))
    return timestamp(`${value}T23:59:59.999Z`);
  return timestamp(value);
}
function bound(value, intervals) {
  ensure(value && DATE_PRECISIONS.includes(value.precision), "INVALID_DATE");
  if (value.precision === "unknown") {
    ensure(value.value === null, "INVALID_DATE");
    return null;
  }
  ensure(
    typeof value.value === "string" &&
      DATE_PATTERNS[value.precision].test(value.value),
    "INVALID_DATE",
  );
  // Only validated scalar shapes form keys. A value enters this call-local
  // map after calendar validation, and precision is part of its identity.
  const key = `${value.precision}:${value.value}`;
  if (intervals?.has(key)) return intervals.get(key);
  const lowerDate = value.value + DATE_SUFFIXES[value.precision];
  const lower = timestamp(`${lowerDate}T00:00:00Z`);
  const next = new Date(lower);
  if (value.precision === "year")
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  else if (value.precision === "month")
    next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCDate(next.getUTCDate() + 1);
  const result = { lower, upper: next.getTime() - 1 };
  intervals?.set(key, result);
  return result;
}
export function policyDateBounds(value) {
  const interval = bound(value);
  return interval === null
    ? null
    : freeze({
        earliest: new Date(interval.lower).toISOString(),
        latest: new Date(interval.upper).toISOString(),
        precision: value.precision,
      });
}
function atOrBefore(value, limit, intervals) {
  const interval = bound(value, intervals);
  return interval !== null && interval.upper <= limit;
}
function sourceInterval(version, intervals, dates) {
  if (intervals?.has(version)) return intervals.get(version);
  const publication = bound(version.dates.publication, dates);
  const sourceVersion = bound(version.dates.sourceVersion, dates);
  const result =
    publication === null
      ? sourceVersion
      : sourceVersion === null
        ? publication
        : {
            lower: Math.max(publication.lower, sourceVersion.lower),
            upper: Math.max(publication.upper, sourceVersion.upper),
          };
  intervals?.set(version, result);
  return result;
}
function refVersion(value, id, references) {
  const result = references
    ? references.versions.get(id)
    : value.versions.find((version) => version.id === id);
  ensure(result !== undefined, "UNKNOWN_VERSION");
  return result;
}
function refWork(value, id) {
  const result = value.works.find((work) => work.id === id);
  ensure(result !== undefined, "UNKNOWN_WORK");
  return result;
}
function rendition(value, version) {
  const selected = [...version.renditionIds].sort()[0];
  const result = value.renditions.find((entry) => entry.id === selected);
  ensure(
    result !== undefined && result.versionId === version.id,
    "RENDITION_REFERENCE_MISMATCH",
  );
  return result;
}
function evidenceKnownAt(value, segmentIds, asOf, basis, references) {
  return segmentIds.every((segmentId) => {
    if (references?.knownSegments.has(segmentId))
      return references.knownSegments.get(segmentId);
    const segment = references
      ? references.segments.get(segmentId)
      : value.segments.find((entry) => entry.id === segmentId);
    ensure(segment !== undefined, "UNKNOWN_SEGMENT");
    const evidenceRendition = references
      ? references.renditions.get(segment.renditionId)
      : value.renditions.find((entry) => entry.id === segment.renditionId);
    ensure(evidenceRendition !== undefined, "UNKNOWN_RENDITION");
    const version = refVersion(value, evidenceRendition.versionId, references);
    let known;
    if (basis === "corpus_observed") {
      const capture = references
        ? references.captures.get(evidenceRendition.captureId)
        : value.captures.find(
            (entry) => entry.id === evidenceRendition.captureId,
          );
      ensure(capture !== undefined, "UNKNOWN_CAPTURE");
      known = timestamp(capture.retrievedAt) <= asOf;
    } else {
      const interval = sourceInterval(
        version,
        references?.sourceIntervals,
        references?.dates,
      );
      known = interval !== null && interval.upper <= asOf;
    }
    references?.knownSegments.set(segmentId, known);
    return known;
  });
}
function knownEvents(value, versionId, asOf, basis, references) {
  return (references.eventsByVersion.get(versionId) ?? []).filter(
    (event) =>
      atOrBefore(event.date, asOf, references.dates) &&
      atOrBefore(event.sourceStatedAt, asOf, references.dates) &&
      evidenceKnownAt(value, event.segmentIds, asOf, basis, references),
  );
}
function indexById(rows) {
  const result = new Map();
  for (const row of rows) if (!result.has(row.id)) result.set(row.id, row);
  return result;
}

export function selectTemporalVersions(input, { asOf, basis }) {
  const value = corpus(input);
  const limit = cutoff(asOf);
  ensure(
    ["source_available", "corpus_observed", "source_effective"].includes(basis),
    "EXPLICIT_TEMPORAL_BASIS_REQUIRED",
  );
  // These indexes and date/evidence results belong to this call only. A later
  // call rechecks its input and cutoff rather than trusting a frozen envelope.
  const references = {
    versions: indexById(value.versions),
    renditions: indexById(value.renditions),
    segments: indexById(value.segments),
    captures: basis === "corpus_observed" ? indexById(value.captures) : null,
    eventsByVersion: new Map(),
    sourceIntervals: new Map(),
    dates: new Map(),
    knownSegments: new Map(),
  };
  for (const event of value.events) {
    if (!references.eventsByVersion.has(event.versionId))
      references.eventsByVersion.set(event.versionId, []);
    references.eventsByVersion.get(event.versionId).push(event);
  }
  const includedByWork = new Map();
  const excluded = [];
  for (const version of value.versions) {
    let interval;
    let reason = null;
    const events = knownEvents(value, version.id, limit, basis, references);
    if (basis === "corpus_observed") {
      const observed = timestamp(version.observedAt);
      interval = { lower: observed, upper: observed };
      if (observed > limit) reason = "not_yet_observed_in_corpus";
    } else {
      interval = sourceInterval(
        version,
        references.sourceIntervals,
        references.dates,
      );
      if (interval === null) reason = "unknown_source_availability";
      else if (interval.lower > limit) reason = "future_source_version";
      else if (interval.upper > limit) reason = "partial_date_crosses_cutoff";
    }
    if (reason === null && basis === "source_effective") {
      const effective = events.filter((event) => event.type === "effective");
      if (effective.length === 0)
        reason = "no_source_effective_event_by_cutoff";
      else {
        const latest = Math.max(
          ...effective.map(
            (event) => bound(event.date, references.dates).upper,
          ),
        );
        if (
          events.some(
            (event) =>
              ["repealed", "withdrawn"].includes(event.type) &&
              bound(event.date, references.dates).lower >= latest,
          )
        )
          reason = "later_source_repeal_or_withdrawal_event";
        else interval = { lower: latest, upper: latest };
      }
    }
    if (reason !== null)
      excluded.push({ versionId: version.id, workId: version.workId, reason });
    else {
      if (!includedByWork.has(version.workId))
        includedByWork.set(version.workId, []);
      includedByWork.get(version.workId).push({
        versionId: version.id,
        workId: version.workId,
        interval,
        eventIds: events.map((event) => event.id).sort(),
        evidenceSegmentIds: [
          ...new Set(events.flatMap((event) => event.segmentIds)),
        ].sort(),
      });
    }
  }
  const selections = [];
  for (const work of value.works) {
    const candidates = includedByWork.get(work.id) ?? [];
    candidates.sort(
      (left, right) =>
        right.interval.upper - left.interval.upper ||
        left.versionId.localeCompare(right.versionId, "en"),
    );
    if (candidates.length === 0)
      selections.push({
        workId: work.id,
        state: "unknown",
        versionIds: [],
        eventIds: [],
        reason: "no_supported_version_by_cutoff",
      });
    else {
      const latest = candidates[0];
      const tied = candidates.filter(
        (entry) => entry.interval.upper >= latest.interval.lower,
      );
      const renditionIds = tied
        .flatMap(
          (entry) =>
            refVersion(value, entry.versionId, references).renditionIds,
        )
        .filter((renditionId) => {
          if (basis !== "corpus_observed") return true;
          const selected = references.renditions.get(renditionId);
          const capture = references.captures.get(selected.captureId);
          return timestamp(capture.retrievedAt) <= limit;
        })
        .sort();
      selections.push({
        workId: work.id,
        state: tied.length === 1 ? "supported_source_snapshot" : "ambiguous",
        versionIds: tied.map((entry) => entry.versionId).sort(),
        renditionIds,
        eventIds: [...new Set(tied.flatMap((entry) => entry.eventIds))].sort(),
        reason:
          basis === "source_effective"
            ? "source_stated_effectiveness_only"
            : basis === "corpus_observed"
              ? "text_observed_in_corpus_by_cutoff"
              : "source_dated_text_availability_claim",
      });
    }
  }
  return freeze({
    kind: "temporal_selection",
    method: {
      id: "source-neutral-temporal-selection",
      version: METHOD_VERSION,
    },
    corpusDigest: value.contentDigest,
    asOf,
    basis,
    selections: selections.sort((left, right) =>
      left.workId < right.workId ? -1 : 1,
    ),
    excluded,
    limitations: [
      "Source dates and corpus observation are separate evidence axes.",
      "A latest available version is not a determination of current law.",
      "Unknown predecessors and dates are not filled with the earliest retained text.",
      ...(basis === "source_effective"
        ? [
            "This selects effective-event evidence by cutoff; repeal, supersession and other relationship effects are not applied. It is not an in-force filter.",
          ]
        : []),
    ],
  });
}

function normalizeFormatting(text) {
  return text.replace(/\s+/gu, " ").trim();
}
function textUnits(value, selectedRendition) {
  const encoder = new globalThis.TextEncoder();
  const decoder = new globalThis.TextDecoder("utf-8", { fatal: true });
  const bytes = encoder.encode(selectedRendition.text);
  const segments = value.segments
    .filter((entry) => entry.renditionId === selectedRendition.id)
    .sort(
      (left, right) =>
        left.startByte - right.startByte || left.endByte - right.endByte,
    );
  ensure(segments.length <= COMPARE_LIMIT, "COMPARISON_RESOURCE_LIMIT");
  return segments.map((segment) => ({
    segmentId: segment.id,
    locator: `${segment.locator.type}:${segment.locator.value}`,
    text: decoder.decode(bytes.subarray(segment.startByte, segment.endByte)),
    textDigest: segment.textDigest,
  }));
}
export function compareDocumentVersions(
  input,
  { beforeVersionId, afterVersionId },
) {
  const value = corpus(input);
  const before = refVersion(value, beforeVersionId);
  const after = refVersion(value, afterVersionId);
  ensure(
    before.id !== after.id && before.workId === after.workId,
    "SAME_WORK_DISTINCT_VERSIONS_REQUIRED",
  );
  return compareVersionTexts(value, before, after);
}
function compareVersionTexts(value, before, after) {
  const leftInterval = sourceInterval(before);
  const rightInterval = sourceInterval(after);
  if (leftInterval !== null && rightInterval !== null)
    ensure(leftInterval.lower <= rightInterval.upper, "REVERSED_VERSION_ORDER");
  const left = rendition(value, before);
  const right = rendition(value, after);
  const leftUnits = textUnits(value, left);
  const rightUnits = textUnits(value, right);
  const changes = [];
  const usedLeft = new Set();
  const usedRight = new Set();
  const groups = (units, normalize) => {
    const map = new Map();
    for (const unit of units) {
      const key = normalize(unit.text);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(unit);
    }
    return map;
  };
  const append = (prior, next, kind, alignment) => {
    changes.push({
      locator:
        prior && next && prior.locator !== next.locator
          ? `${prior.locator} → ${next.locator}`
          : (prior ?? next).locator,
      kind,
      alignment,
      beforeSegmentIds: prior ? [prior.segmentId] : [],
      afterSegmentIds: next ? [next.segmentId] : [],
    });
  };
  // Locators identify occurrences inside one rendition. An equal ordinal path
  // is never evidence that two versions contain the same provision there.
  for (const [normalize, kind, alignment] of [
    [(text) => text, "unchanged", "unique_exact_text"],
    [
      normalizeFormatting,
      "formatting_only",
      "unique_whitespace_normalized_text",
    ],
  ]) {
    const leftGroups = groups(leftUnits, normalize);
    const rightGroups = groups(rightUnits, normalize);
    for (const prior of leftUnits) {
      if (usedLeft.has(prior.segmentId)) continue;
      const key = normalize(prior.text);
      const candidates = rightGroups.get(key) ?? [];
      if (leftGroups.get(key).length !== 1 || candidates.length !== 1) continue;
      const next = candidates[0];
      if (usedRight.has(next.segmentId)) continue;
      usedLeft.add(prior.segmentId);
      usedRight.add(next.segmentId);
      append(prior, next, kind, alignment);
    }
  }
  const leftText = groups(leftUnits, normalizeFormatting);
  const rightText = groups(rightUnits, normalizeFormatting);
  for (const prior of leftUnits.filter((unit) => !usedLeft.has(unit.segmentId)))
    append(
      prior,
      null,
      rightText.has(normalizeFormatting(prior.text))
        ? "ambiguous_text"
        : "unaligned_before",
      "no_reviewed_provision_correspondence",
    );
  for (const next of rightUnits.filter(
    (unit) => !usedRight.has(unit.segmentId),
  ))
    append(
      null,
      next,
      leftText.has(normalizeFormatting(next.text))
        ? "ambiguous_text"
        : "unaligned_after",
      "no_reviewed_provision_correspondence",
    );
  return freeze({
    kind: "version_comparison",
    method: {
      id: "unique-text-occurrence-comparison",
      version: METHOD_VERSION,
    },
    corpusDigest: value.contentDigest,
    workId: before.workId,
    beforeVersionId: before.id,
    afterVersionId: after.id,
    beforeRenditionId: left.id,
    afterRenditionId: right.id,
    changeType:
      left.text === right.text
        ? "identical"
        : normalizeFormatting(left.text) === normalizeFormatting(right.text)
          ? "formatting_only"
          : "text_changed",
    temporalOrder:
      leftInterval !== null &&
      rightInterval !== null &&
      leftInterval.upper < rightInterval.lower
        ? "source_dates_ordered"
        : "unknown_or_overlapping",
    changes,
    limitations: [
      "Text differences are not legal-effect determinations.",
      "Formatting comparison collapses whitespace only; spelling and punctuation remain changes.",
      "Unique exact or whitespace-normalized text can match across different locators. This proves textual presence, not provision identity or continuity.",
      "Unaligned or repeated text is not classified as an added, removed or changed provision. Ordinal positions never establish cross-version correspondence.",
    ],
  });
}

export function compareRelatedProvisions(
  input,
  { beforeVersionId, afterVersionId, relationshipId },
) {
  const value = corpus(input);
  const before = refVersion(value, beforeVersionId);
  const after = refVersion(value, afterVersionId);
  ensure(before.workId !== after.workId, "DISTINCT_INSTRUMENTS_REQUIRED");
  const relationship = value.relationships.find(
    (entry) => entry.id === relationshipId,
  );
  ensure(
    relationship !== undefined &&
      ["amends", "supersedes", "corrects"].includes(relationship.type) &&
      relationship.fromVersionId === after.id &&
      relationship.target.state === "resolved" &&
      relationship.target.versionId === before.id &&
      relationship.target.workId === before.workId &&
      relationship.segmentIds.length > 0,
    "EXPLICIT_CHANGE_RELATIONSHIP_REQUIRED",
  );
  const comparison = detached(compareVersionTexts(value, before, after));
  delete comparison.workId;
  return freeze({
    ...comparison,
    kind: "related_provision_comparison",
    method: {
      id: "explicit-edge-linked-whole-instrument-text-comparison",
      version: METHOD_VERSION,
    },
    beforeWorkId: before.workId,
    afterWorkId: after.workId,
    relationshipId: relationship.id,
    relationshipType: relationship.type,
    relationshipSourceLabel: relationship.sourceLabel,
    relationshipSegmentIds: [...relationship.segmentIds],
    comparisonScope: "whole_instrument_text",
    limitations: [
      ...comparison.limitations,
      "These are distinct policy instruments linked by explicit source evidence, not versions of one work.",
      "The recorded change relationship preserves source language and does not independently determine legal effect.",
      "This compares whole retained instruments. The edge does not supply a reviewed alignment of the amended provisions.",
    ],
  });
}

export function compareInstitutionalProcedures(input, { analysisIds }) {
  const value = corpus(input);
  ensure(
    Array.isArray(analysisIds) &&
      analysisIds.length >= 2 &&
      analysisIds.length <= 1000 &&
      new Set(analysisIds).size === analysisIds.length,
    "DISTINCT_ANALYSES_REQUIRED",
  );
  const analyses = analysisIds.map((id) => {
    const analysis = value.analyses.find((entry) => entry.id === id);
    ensure(analysis !== undefined, "UNKNOWN_ANALYSIS");
    return analysis;
  });
  const dimensions = [
    "actor",
    "action",
    "object",
    "modality",
    "trigger",
    "condition",
    "exception",
    "procedure",
    "review_requirement",
    "time_constraint",
  ];
  const rows = dimensions.map((dimension) => ({
    dimension,
    observations: analyses.map((analysis) => ({
      analysisId: analysis.id,
      versionId: analysis.versionId,
      state: analysis.codes.some((code) => code.dimension === dimension)
        ? "coded"
        : "not_coded_unknown",
      values: analysis.codes
        .filter((code) => code.dimension === dimension)
        .map((code) => ({
          value: code.value,
          segmentIds: [...code.segmentIds],
        })),
      method: detached(analysis.method),
      reviewer: detached(analysis.reviewer),
      uncertainty: analysis.uncertainty,
    })),
  }));
  const references = analyses.map((analysis) => ({
    analysisId: analysis.id,
    versionId: analysis.versionId,
    governmentContext: refWork(
      value,
      refVersion(value, analysis.versionId).workId,
    ).governmentContext,
    links: value.relationships
      .filter(
        (relationship) => relationship.fromVersionId === analysis.versionId,
      )
      .map((relationship) => ({
        relationshipId: relationship.id,
        type: relationship.type,
        state: relationship.target.state,
        targetIdentifier: relationship.target.sourceIdentifier,
        segmentIds: [...relationship.segmentIds],
      })),
  }));
  return freeze({
    kind: "institutional_procedure_comparison",
    method: {
      id: "source-linked-institutional-code-comparison",
      version: METHOD_VERSION,
    },
    corpusDigest: value.contentDigest,
    analysisIds: [...analysisIds],
    populationVersionIds: [
      ...new Set(analyses.map((analysis) => analysis.versionId)),
    ].sort(),
    rows,
    references,
    uncertainty: "provisional_comparison_of_declared_coding",
    limitations: [
      "Codes are attributed analytical assertions, not official-source fields.",
      "An uncoded dimension is unknown, not evidence that a procedure is absent.",
      "A citation does not establish adoption, endorsement, causation, authority or applicability.",
    ],
  });
}

export function resolveCorpusRelationships(
  input,
  { versionId, asOf, basis = "source_available" },
) {
  const value = corpus(input);
  ensure(
    ["source_available", "corpus_observed", "source_effective"].includes(basis),
    "INVALID_TEMPORAL_BASIS",
  );
  refVersion(value, versionId);
  const limit = cutoff(asOf);
  const visible = [];
  const excluded = [];
  for (const relationship of value.relationships.filter(
    (entry) => entry.fromVersionId === versionId,
  )) {
    if (
      (basis !== "corpus_observed" &&
        !atOrBefore(relationship.sourceStatedAt, limit)) ||
      !evidenceKnownAt(value, relationship.segmentIds, limit, basis)
    ) {
      excluded.push({
        relationshipId: relationship.id,
        reason: "future_or_unknown_source_evidence",
      });
      continue;
    }
    const result = {
      relationshipId: relationship.id,
      type: relationship.type,
      state: relationship.target.state,
      target: detached(relationship.target),
      sourceLabel: relationship.sourceLabel,
      segmentIds: [...relationship.segmentIds],
    };
    const targetKnown = (versionId) => {
      const target = refVersion(value, versionId);
      const interval = sourceInterval(target);
      return basis === "corpus_observed"
        ? timestamp(target.observedAt) <= limit
        : interval !== null && interval.upper <= limit;
    };
    if (relationship.target.state === "resolved") {
      if (!targetKnown(relationship.target.versionId)) {
        result.state = "target_not_available_by_cutoff";
        result.target = {
          state: "unresolved",
          workId: null,
          versionId: null,
          sourceIdentifier: relationship.target.sourceIdentifier,
          candidateVersionIds: [],
        };
      }
    } else if (relationship.target.state === "ambiguous") {
      // Removing unavailable candidates cannot establish a source's intended target.
      result.target.candidateVersionIds =
        result.target.candidateVersionIds.filter(targetKnown);
    }
    visible.push(result);
  }
  return freeze({
    kind: "relationship_resolution",
    method: {
      id: "explicit-citation-target-resolution",
      version: METHOD_VERSION,
    },
    corpusDigest: value.contentDigest,
    versionId,
    asOf,
    basis,
    relationships: visible,
    excluded,
    limitation:
      "Explicit references preserve unresolved targets and do not establish legal effect. Unavailable ambiguous candidates are filtered without promoting the remaining candidates to resolved.",
  });
}
