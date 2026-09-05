// Pure browser-compatible operations over an already validated v2 corpus.
// No operation makes a determination of current law or legal applicability.
const METHOD_VERSION = "1.0.0";
const COMPARE_LIMIT = 20000;
const DATE_PRECISIONS = ["unknown", "year", "month", "day"];

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
      value.schemaVersion === "2.0.0" &&
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
export function policyDateBounds(value) {
  ensure(value && DATE_PRECISIONS.includes(value.precision), "INVALID_DATE");
  if (value.precision === "unknown") {
    ensure(value.value === null, "INVALID_DATE");
    return null;
  }
  const pattern = {
    year: /^\d{4}$/u,
    month: /^\d{4}-\d{2}$/u,
    day: /^\d{4}-\d{2}-\d{2}$/u,
  }[value.precision];
  ensure(
    typeof value.value === "string" && pattern.test(value.value),
    "INVALID_DATE",
  );
  const lowerDate =
    value.value + { year: "-01-01", month: "-01", day: "" }[value.precision];
  const lower = timestamp(`${lowerDate}T00:00:00Z`);
  const next = new Date(lower);
  if (value.precision === "year")
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  else if (value.precision === "month")
    next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCDate(next.getUTCDate() + 1);
  return freeze({
    earliest: new Date(lower).toISOString(),
    latest: new Date(next.getTime() - 1).toISOString(),
    precision: value.precision,
  });
}
function bound(value) {
  const interval = policyDateBounds(value);
  return interval === null
    ? null
    : {
        lower: timestamp(interval.earliest),
        upper: timestamp(interval.latest),
      };
}
function atOrBefore(value, limit) {
  const interval = bound(value);
  return interval !== null && interval.upper <= limit;
}
function sourceInterval(version) {
  const publication = bound(version.dates.publication);
  const sourceVersion = bound(version.dates.sourceVersion);
  if (publication === null && sourceVersion === null) return null;
  if (publication === null) return sourceVersion;
  if (sourceVersion === null) return publication;
  return {
    lower: Math.max(publication.lower, sourceVersion.lower),
    upper: Math.max(publication.upper, sourceVersion.upper),
  };
}
function refVersion(value, id) {
  const result = value.versions.find((version) => version.id === id);
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
function evidenceKnownAt(value, segmentIds, asOf, basis) {
  return segmentIds.every((segmentId) => {
    const segment = value.segments.find((entry) => entry.id === segmentId);
    ensure(segment !== undefined, "UNKNOWN_SEGMENT");
    const evidenceRendition = value.renditions.find(
      (entry) => entry.id === segment.renditionId,
    );
    ensure(evidenceRendition !== undefined, "UNKNOWN_RENDITION");
    const version = refVersion(value, evidenceRendition.versionId);
    if (basis === "corpus_observed") {
      const capture = value.captures.find(
        (entry) => entry.id === evidenceRendition.captureId,
      );
      ensure(capture !== undefined, "UNKNOWN_CAPTURE");
      return timestamp(capture.retrievedAt) <= asOf;
    }
    const interval = sourceInterval(version);
    return interval !== null && interval.upper <= asOf;
  });
}
function knownEvents(value, versionId, asOf, basis) {
  return value.events.filter(
    (event) =>
      event.versionId === versionId &&
      atOrBefore(event.date, asOf) &&
      atOrBefore(event.sourceStatedAt, asOf) &&
      evidenceKnownAt(value, event.segmentIds, asOf, basis),
  );
}

export function selectTemporalVersions(input, { asOf, basis }) {
  const value = corpus(input);
  const limit = cutoff(asOf);
  ensure(
    ["source_available", "corpus_observed", "source_effective"].includes(basis),
    "EXPLICIT_TEMPORAL_BASIS_REQUIRED",
  );
  const included = [];
  const excluded = [];
  for (const version of value.versions) {
    let interval;
    let reason = null;
    const events = knownEvents(value, version.id, limit, basis);
    if (basis === "corpus_observed") {
      const observed = timestamp(version.observedAt);
      interval = { lower: observed, upper: observed };
      if (observed > limit) reason = "not_yet_observed_in_corpus";
    } else {
      interval = sourceInterval(version);
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
          ...effective.map((event) => bound(event.date).upper),
        );
        if (
          events.some(
            (event) =>
              ["repealed", "withdrawn"].includes(event.type) &&
              bound(event.date).lower >= latest,
          )
        )
          reason = "later_source_repeal_or_withdrawal_event";
        else interval = { lower: latest, upper: latest };
      }
    }
    if (reason !== null)
      excluded.push({ versionId: version.id, workId: version.workId, reason });
    else
      included.push({
        versionId: version.id,
        workId: version.workId,
        interval,
        eventIds: events.map((event) => event.id).sort(),
        evidenceSegmentIds: [
          ...new Set(events.flatMap((event) => event.segmentIds)),
        ].sort(),
      });
  }
  const selections = [];
  for (const work of value.works) {
    const candidates = included.filter((entry) => entry.workId === work.id);
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
        .flatMap((entry) => refVersion(value, entry.versionId).renditionIds)
        .filter((renditionId) => {
          if (basis !== "corpus_observed") return true;
          const selected = value.renditions.find(
            (entry) => entry.id === renditionId,
          );
          const capture = value.captures.find(
            (entry) => entry.id === selected.captureId,
          );
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
  const leftMap = new Map();
  const rightMap = new Map();
  for (const unit of leftUnits) {
    if (!leftMap.has(unit.locator)) leftMap.set(unit.locator, []);
    leftMap.get(unit.locator).push(unit);
  }
  for (const unit of rightUnits) {
    if (!rightMap.has(unit.locator)) rightMap.set(unit.locator, []);
    rightMap.get(unit.locator).push(unit);
  }
  const changes = [];
  for (const locator of [
    ...new Set([...leftMap.keys(), ...rightMap.keys()]),
  ].sort()) {
    const prior = leftMap.get(locator) ?? [];
    const next = rightMap.get(locator) ?? [];
    const kind =
      prior.length === 0
        ? "added"
        : next.length === 0
          ? "removed"
          : prior.length !== 1 || next.length !== 1
            ? "ambiguous_locator"
            : prior[0].text === next[0].text
              ? "unchanged"
              : normalizeFormatting(prior[0].text) ===
                  normalizeFormatting(next[0].text)
                ? "formatting_only"
                : "text_changed";
    changes.push({
      locator,
      kind,
      beforeSegmentIds: prior.map((unit) => unit.segmentId),
      afterSegmentIds: next.map((unit) => unit.segmentId),
    });
  }
  return freeze({
    kind: "version_comparison",
    method: { id: "exact-locator-text-comparison", version: METHOD_VERSION },
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
      "Locator matching does not infer correspondence when locators repeat or disappear.",
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
      id: "explicit-change-linked-provision-comparison",
      version: METHOD_VERSION,
    },
    beforeWorkId: before.workId,
    afterWorkId: after.workId,
    relationshipId: relationship.id,
    relationshipType: relationship.type,
    relationshipSourceLabel: relationship.sourceLabel,
    relationshipSegmentIds: [...relationship.segmentIds],
    limitations: [
      ...comparison.limitations,
      "These are distinct policy instruments linked by explicit source evidence, not versions of one work.",
      "The recorded change relationship preserves source language and does not independently determine legal effect.",
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

export function resolveCorpusRelationships(input, { versionId, asOf }) {
  const value = corpus(input);
  refVersion(value, versionId);
  const limit = cutoff(asOf);
  const visible = [];
  const excluded = [];
  for (const relationship of value.relationships.filter(
    (entry) => entry.fromVersionId === versionId,
  )) {
    if (
      !atOrBefore(relationship.sourceStatedAt, limit) ||
      !evidenceKnownAt(
        value,
        relationship.segmentIds,
        limit,
        "source_available",
      )
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
    if (relationship.target.state === "resolved") {
      const target = refVersion(value, relationship.target.versionId);
      const interval = sourceInterval(target);
      if (interval === null || interval.upper > limit) {
        result.state = "target_not_available_by_cutoff";
        result.target = {
          state: "unresolved",
          workId: null,
          versionId: null,
          sourceIdentifier: relationship.target.sourceIdentifier,
          candidateVersionIds: [],
        };
      }
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
    basis: "source_available",
    relationships: visible,
    excluded,
    limitation:
      "Explicit references preserve unresolved targets and do not establish legal effect.",
  });
}
