import {
  policyDateBounds,
  selectTemporalVersions,
} from "./temporal-operations.mjs";

const METHOD = Object.freeze({ id: "source-passage-bm25", version: "1.0.0" });
const indexes = new WeakMap();
const encoder = new globalThis.TextEncoder();
const decoder = new globalThis.TextDecoder("utf-8", { fatal: true });
const stop = new Set(
  "a an and are as at be by for from how in into is it of on or that the their this to was were what when where which who with".split(
    " ",
  ),
);
const order = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const normalize = (value) => value.normalize("NFKC").toLowerCase();
const tokens = (value) => normalize(value).match(/[\p{L}\p{N}]+/gu) ?? [];
const identifier = (value) => tokens(value).join("");
const freeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
function ensure(value, code) {
  if (!value) throw new TypeError(`Policy search rejected input: ${code}`);
}
function vector(text) {
  const words = tokens(text);
  const counts = new Map();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  return { counts, length: words.length, normalized: words.join(" ") };
}
function limits(value, fallback, maximum) {
  const number = value ?? fallback;
  ensure(
    Number.isSafeInteger(number) && number >= 1 && number <= maximum,
    "INVALID_LIMIT",
  );
  return number;
}
function sourceKnown(version, limit) {
  const bounds = Object.values(version.dates)
    .map(policyDateBounds)
    .filter(Boolean);
  return (
    bounds.length > 0 &&
    bounds.every((bound) => Date.parse(bound.latest) <= limit)
  );
}
function temporalState(data, asOf, basis) {
  if (!asOf) return null;
  const key = `${basis}:${asOf}`;
  if (data.temporal.has(key)) return data.temporal.get(key);
  const snapshot = selectTemporalVersions(data.corpus, { asOf, basis });
  const selected = new Map(
    snapshot.selections.flatMap((selection) =>
      selection.versionIds.map((id) => [id, selection]),
    ),
  );
  const limit = Date.parse(asOf.length === 10 ? `${asOf}T23:59:59.999Z` : asOf);
  const knownRenditions = new Set(
    data.corpus.renditions
      .filter((rendition) =>
        basis === "corpus_observed"
          ? Date.parse(data.captures.get(rendition.captureId).retrievedAt) <=
            limit
          : sourceKnown(data.versions.get(rendition.versionId), limit),
      )
      .map((entry) => entry.id),
  );
  const result = { snapshot, selected, knownRenditions };
  if (data.temporal.size >= 8)
    data.temporal.delete(data.temporal.keys().next().value);
  data.temporal.set(key, result);
  return result;
}

/** Input is an already validated, immutable canonical corpus. No network or graph validation is performed. */
export function createPolicySearchIndex(corpus) {
  ensure(
    corpus?.schemaVersion === "2.0.0" &&
      corpus.kind === "analyzed_corpus" &&
      /^[a-f0-9]{64}$/u.test(corpus.contentDigest),
    "VALIDATED_V2_CORPUS_REQUIRED",
  );
  const works = new Map(corpus.works.map((entry) => [entry.id, entry]));
  const versions = new Map(corpus.versions.map((entry) => [entry.id, entry]));
  const captures = new Map(corpus.captures.map((entry) => [entry.id, entry]));
  const profiles = new Map(
    corpus.sourceProfiles.map((entry) => [entry.id, entry]),
  );
  const renditions = new Map(
    corpus.renditions.map((entry) => [entry.id, entry]),
  );
  const bytes = new Map();
  const segments = new Map();
  const passagesByVersion = new Map();
  const frequency = new Map();
  let totalLength = 0;
  for (const segment of [...corpus.segments].sort((a, b) =>
    order(a.id, b.id),
  )) {
    const rendition = renditions.get(segment.renditionId);
    const work = works.get(versions.get(rendition.versionId).workId);
    const profile = profiles.get(work.sourceProfileId);
    // Metadata-only display grants must not leak their hidden body through hit existence.
    const searchable =
      profile.uses.localDisplay !== "metadata_link" &&
      profile.uses.excerpts &&
      !rendition.warnings.includes(
        "auxiliary_index_metadata_not_policy_instrument_text",
      );
    if (
      !bytes.has(rendition.id) &&
      profile.uses.localDisplay !== "metadata_link" &&
      profile.uses.excerpts
    )
      bytes.set(rendition.id, encoder.encode(rendition.text));
    const text = searchable
      ? decoder.decode(
          bytes.get(rendition.id).subarray(segment.startByte, segment.endByte),
        )
      : "";
    const passage = { segment, rendition, searchable, vector: vector(text) };
    segments.set(segment.id, passage);
    if (!searchable) continue;
    totalLength += passage.vector.length;
    for (const word of passage.vector.counts.keys())
      frequency.set(word, (frequency.get(word) ?? 0) + 1);
    if (!passagesByVersion.has(rendition.versionId))
      passagesByVersion.set(rendition.versionId, []);
    passagesByVersion.get(rendition.versionId).push(passage);
  }
  const entries = [...corpus.versions]
    .sort((a, b) => order(a.id, b.id))
    .map((version) => {
      const work = works.get(version.workId);
      return {
        version,
        work,
        title: vector(work.title),
        identifiers: [
          work.id,
          version.id,
          work.sourceIdentifier,
          version.sourceVersionIdentifier,
        ].map(identifier),
        metadata: vector(
          `${work.sourceIdentifier} ${version.sourceVersionIdentifier} ${version.sourceStatusLabel}`,
        ),
        passages: passagesByVersion.get(version.id) ?? [],
      };
    });
  const passageCount = [...passagesByVersion.values()].reduce(
    (sum, entries) => sum + entries.length,
    0,
  );
  const index = freeze({
    kind: "policy_search_index",
    method: METHOD,
    corpusDigest: corpus.contentDigest,
    versionCount: entries.length,
    passageCount,
  });
  indexes.set(index, {
    corpus,
    works,
    versions,
    captures,
    profiles,
    renditions,
    bytes,
    segments,
    entries,
    frequency,
    passageCount,
    averageLength: totalLength / Math.max(1, passageCount),
    temporal: new Map(),
  });
  return index;
}
function bm25(vector, terms, data) {
  let score = 0;
  for (const term of terms) {
    const count = vector.counts.get(term) ?? 0;
    if (!count) continue;
    const df = data.frequency.get(term) ?? 0;
    const idf = Math.log(1 + (data.passageCount - df + 0.5) / (df + 0.5));
    score +=
      (idf * count * 2.2) /
      (count +
        1.2 *
          (0.25 + (0.75 * vector.length) / Math.max(1, data.averageLength)));
  }
  return score;
}
function knownField(record, field, state, data) {
  if (!state) return true;
  const evidence = record.fieldProvenance.find(
    (entry) => entry.field === field,
  );
  return Boolean(
    evidence &&
    evidence.segmentIds.length > 0 &&
    evidence.segmentIds.every((id) =>
      state.knownRenditions.has(data.segments.get(id).rendition.id),
    ),
  );
}

/** Stable lexical retrieval. Scores are matching measures, never truth, effect, or applicability scores. */
export function searchPolicyCorpus(index, request) {
  const data = indexes.get(index);
  ensure(data, "UNKNOWN_SEARCH_INDEX");
  ensure(
    request &&
      typeof request.query === "string" &&
      request.query.length <= 2000,
    "INVALID_QUERY",
  );
  const limit = limits(request.limit, 20, 1000);
  const passageLimit = limits(request.passageLimit, 5, 100);
  for (const key of [
    "sourceProfileId",
    "governmentContext",
    "instrumentClass",
    "asOf",
    "basis",
  ])
    ensure(
      request[key] === undefined || typeof request[key] === "string",
      "INVALID_FILTER",
    );
  ensure(!request.asOf || request.basis, "EXPLICIT_TEMPORAL_BASIS_REQUIRED");
  ensure(
    !request.basis ||
      ["source_available", "corpus_observed", "source_effective"].includes(
        request.basis,
      ),
    "INVALID_TEMPORAL_BASIS",
  );
  const query = request.query.trim();
  const queryTerms = [
    ...new Set(tokens(query).filter((term) => !stop.has(term))),
  ];
  const phrases = [...query.matchAll(/"([^"\n]+)"/gu)]
    .map((match) => tokens(match[1]).join(" "))
    .filter(Boolean);
  const exactQuery = identifier(query);
  const state = temporalState(data, request.asOf, request.basis);
  const matches = [];
  for (const entry of data.entries) {
    const { work, version } = entry;
    if (
      (request.sourceProfileId &&
        request.sourceProfileId !== work.sourceProfileId) ||
      (request.governmentContext &&
        request.governmentContext !== work.governmentContext) ||
      (request.instrumentClass &&
        request.instrumentClass !== work.instrumentClass) ||
      (state && !state.selected.has(version.id))
    )
      continue;
    const known = {
      title: knownField(work, "/title", state, data),
      identifier: knownField(work, "/sourceIdentifier", state, data),
      status: knownField(version, "/sourceStatusLabel", state, data),
      versionIdentifier: knownField(
        version,
        "/sourceVersionIdentifier",
        state,
        data,
      ),
    };
    const exactFields = [];
    if (exactQuery && exactQuery === entry.identifiers[0])
      exactFields.push("work_id");
    if (exactQuery && exactQuery === entry.identifiers[1])
      exactFields.push("version_id");
    if (known.identifier && exactQuery && exactQuery === entry.identifiers[2])
      exactFields.push("source_identifier");
    if (
      known.versionIdentifier &&
      exactQuery &&
      exactQuery === entry.identifiers[3]
    )
      exactFields.push("source_version_identifier");
    const titleScore = known.title ? bm25(entry.title, queryTerms, data) : 0;
    const metadata = vector(
      `${known.identifier ? work.sourceIdentifier : ""} ${known.versionIdentifier ? version.sourceVersionIdentifier : ""} ${known.status ? version.sourceStatusLabel : ""}`,
    );
    const metadataScore = bm25(metadata, queryTerms, data);
    const passages = entry.passages
      .filter(
        (passage) => !state || state.knownRenditions.has(passage.rendition.id),
      )
      .map((passage) => {
        const matchedTerms = queryTerms.filter((term) =>
          passage.vector.counts.has(term),
        );
        const matchedPhrases = phrases.filter((phrase) =>
          ` ${passage.vector.normalized} `.includes(` ${phrase} `),
        );
        const score =
          bm25(passage.vector, queryTerms, data) + matchedPhrases.length * 4;
        return {
          segmentId: passage.segment.id,
          renditionId: passage.rendition.id,
          captureId: passage.rendition.captureId,
          score,
          matchedTerms,
          matchedPhrases,
          whyShown: matchedTerms.length
            ? "source_passage_match"
            : "identifier_or_browse_evidence",
        };
      })
      .filter(
        (passage) => !query || passage.score > 0 || exactFields.length > 0,
      )
      .sort((a, b) => b.score - a.score || order(a.segmentId, b.segmentId));
    const titlePhrase =
      known.title &&
      phrases.some((phrase) =>
        ` ${entry.title.normalized} `.includes(` ${phrase} `),
      );
    // Explicitly quoted phrases must occur in at least one eligible field/passage.
    if (
      phrases.length &&
      !titlePhrase &&
      !passages.some((passage) => passage.matchedPhrases.length)
    )
      continue;
    const score =
      titleScore * 2 +
      metadataScore * 2 +
      (passages[0]?.score ?? 0) +
      (titlePhrase ? 4 : 0);
    if (query && score === 0 && exactFields.length === 0) continue;
    const whyShown = [
      ...exactFields.map((field) => `exact_${field}`),
      ...(titleScore > 0 ? ["title_terms"] : []),
      ...(metadataScore > 0 ? ["source_metadata_terms"] : []),
      ...(passages.some((passage) => passage.score > 0)
        ? ["source_passage_terms"]
        : []),
      ...(!query ? ["browse_retained_versions"] : []),
    ];
    matches.push({
      workId: work.id,
      versionId: version.id,
      sourceProfileId: work.sourceProfileId,
      score,
      exactIdentifierMatch: exactFields.length > 0,
      whyShown,
      metadataKnown: known,
      passages: passages.slice(0, passageLimit),
      matchingPassageCount: passages.length,
      eventIds: state
        ? state.selected
            .get(version.id)
            .eventIds.filter((id) =>
              data.corpus.events.some(
                (event) => event.id === id && event.versionId === version.id,
              ),
            )
        : data.corpus.events
            .filter((event) => event.versionId === version.id)
            .map((event) => event.id)
            .sort(),
      temporalState: state?.selected.get(version.id).state ?? "not_filtered",
      temporalReason:
        state?.selected.get(version.id).reason ?? "all_retained_versions",
    });
  }
  matches.sort(
    (a, b) =>
      Number(b.exactIdentifierMatch) - Number(a.exactIdentifierMatch) ||
      b.score - a.score ||
      order(a.workId, b.workId) ||
      order(a.versionId, b.versionId),
  );
  return freeze({
    kind: "policy_search_results",
    method: METHOD,
    corpusDigest: index.corpusDigest,
    query,
    queryTerms,
    total: matches.length,
    hits: matches.slice(0, limit),
    temporal: state
      ? {
          asOf: request.asOf,
          basis: request.basis,
          unknownWorkIds: state.snapshot.selections
            .filter((entry) => entry.state === "unknown")
            .map((entry) => entry.workId),
          excluded: state.snapshot.excluded,
          limitations: state.snapshot.limitations,
        }
      : null,
    limitations: [
      "Lexical matches require review of the cited source passages; no answer or legal conclusion is generated.",
      "Separate instruments can supply separate parts of a question. Retained versions are ranked independently.",
      "An unfiltered search includes unknown dates; a cutoff excludes unknown or indeterminate source states.",
    ],
  });
}

/** Decode only requested evidence. Offsets remain exact UTF8 byte offsets in the canonical rendition. */
export function policySearchPassage(
  index,
  segmentId,
  { maxCharacters = 1200 } = {},
) {
  const data = indexes.get(index);
  ensure(data, "UNKNOWN_SEARCH_INDEX");
  const passage = data.segments.get(segmentId);
  ensure(passage, "UNKNOWN_SEGMENT");
  limits(maxCharacters, 1200, 200000);
  const rendition = passage.rendition;
  const work = data.works.get(data.versions.get(rendition.versionId).workId);
  const profile = data.profiles.get(work.sourceProfileId);
  if (profile.uses.localDisplay === "metadata_link" || !profile.uses.excerpts)
    return freeze({
      segmentId,
      text: null,
      truncated: false,
      reason: "source_display_policy",
    });
  const complete = decoder.decode(
    data.bytes
      .get(rendition.id)
      .subarray(passage.segment.startByte, passage.segment.endByte),
  );
  const characters = [...complete];
  return freeze({
    segmentId,
    text: characters.slice(0, maxCharacters).join(""),
    truncated: characters.length > maxCharacters,
    reason: null,
  });
}
