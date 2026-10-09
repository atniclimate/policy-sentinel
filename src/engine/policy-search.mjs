import {
  policyDateBounds,
  selectTemporalVersions,
} from "./temporal-operations.mjs";
import {
  isJurisdictionRef,
  US_STATE_CODES,
} from "../core/jurisdiction-reference.mjs";

const METHOD = Object.freeze({ id: "source-passage-bm25", version: "2.0.0" });
const indexes = new WeakMap();
const encoder = new globalThis.TextEncoder();
const decoder = new globalThis.TextDecoder("utf-8", { fatal: true });
const stop = new Set(
  "a an and are as at be by did do does for from how in into is it of on or that the their this to was were what when where which who with".split(
    " ",
  ),
);
const order = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const normalize = (value) => value.normalize("NFKC").toLowerCase();
const tokens = (value) => normalize(value).match(/[\p{L}\p{N}]+/gu) ?? [];
// Bounded lexical suffix folding only. This changes matching, never source text,
// exact identifiers, quoted phrases, taxonomy or an asserted policy meaning.
function termKey(word) {
  if (!/^[a-z]{5,}$/u.test(word)) return word;
  let value = word.replace(/ies$/u, "y");
  if (value === word && /(?:ches|shes|sses|xes|zes)$/u.test(value))
    value = value.slice(0, -2);
  else if (value === word && /[^sui]s$/u.test(value))
    value = value.slice(0, -1);
  const replace = (pattern, replacement = "") => {
    const next = value.replace(pattern, replacement);
    if (next.length >= 4) value = next;
  };
  replace(/(?:ation|ating|ated|ate)$/u);
  replace(/(?:ing|ed)$/u);
  replace(/([bcdfgkmnprt])\1$/u, "$1");
  replace(/(?<=[st])ion$/u);
  replace(/(?:ly|al)$/u);
  replace(/e$/u);
  return value;
}
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
function vector(text, termKeys) {
  const words = tokens(text);
  const counts = new Map();
  for (const word of words) {
    let key = termKeys.get(word);
    if (key === undefined) {
      key = termKey(word);
      termKeys.set(word, key);
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
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
  const knownEventIds = new Set(
    snapshot.selections.flatMap((selection) => selection.eventIds),
  );
  const result = { snapshot, selected, knownRenditions, knownEventIds };
  if (data.temporal.size >= 8)
    data.temporal.delete(data.temporal.keys().next().value);
  data.temporal.set(key, result);
  return result;
}

/** Input is an already validated, immutable canonical corpus. No network or graph validation is performed. */
export function createPolicySearchIndex(corpus) {
  ensure(
    ["2.0.0", "2.1.0"].includes(corpus?.schemaVersion) &&
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
  const eventsByVersion = new Map();
  for (const event of corpus.events) {
    if (!eventsByVersion.has(event.versionId))
      eventsByVersion.set(event.versionId, []);
    eventsByVersion.get(event.versionId).push(event);
  }
  const bytes = new Map();
  const segments = new Map();
  const passagesByVersion = new Map();
  const frequency = new Map();
  // Rebuild from this corpus on every index construction; repeated source
  // words need their deterministic suffix rules evaluated only once here.
  const termKeys = new Map();
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
    const heading =
      /^(?:new section\.?\s*)?(?:sec\.\s*\d+(?:\.\d+)*[.\s]|section\s+\d+\.\s|§\s*\d)/iu.test(
        text.replace(/\[\[\/?(?:INSERTION|DELETION)\]\]/gu, "").trim(),
      );
    const passage = {
      segment,
      rendition,
      searchable,
      vector: vector(text, termKeys),
      heading,
      context: [],
    };
    segments.set(segment.id, passage);
    if (!searchable) continue;
    totalLength += passage.vector.length;
    for (const word of passage.vector.counts.keys())
      frequency.set(word, (frequency.get(word) ?? 0) + 1);
    if (!passagesByVersion.has(rendition.versionId))
      passagesByVersion.set(rendition.versionId, []);
    passagesByVersion.get(rendition.versionId).push(passage);
  }
  // Context references stay within one rendition. Returned quotations remain
  // individual exact segments; the contributing context IDs are explicit.
  for (const entries of passagesByVersion.values()) {
    entries.sort(
      (a, b) =>
        order(a.rendition.id, b.rendition.id) ||
        a.segment.startByte - b.segment.startByte,
    );
    let heading = null;
    for (let i = 0; i < entries.length; i += 1) {
      const passage = entries[i];
      if (heading?.rendition.id !== passage.rendition.id) heading = null;
      if (passage.heading) heading = passage;
      passage.context = [
        ...new Set([heading, entries[i - 1], entries[i + 1]]),
      ].filter(
        (other) =>
          other &&
          other !== passage &&
          other.rendition.id === passage.rendition.id,
      );
    }
  }
  const entries = [...corpus.versions]
    .sort((a, b) => order(a.id, b.id))
    .map((version) => {
      const work = works.get(version.workId);
      const events = eventsByVersion.get(version.id) ?? [];
      return {
        version,
        work,
        events,
        title: vector(work.title, termKeys),
        metadata: new Map(),
        identifiers: [
          work.id,
          version.id,
          work.sourceIdentifier,
          version.sourceVersionIdentifier,
        ].map(identifier),
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
    termKeys,
    passageCount,
    averageLength: totalLength / Math.max(1, passageCount),
    temporal: new Map(),
  });
  return index;
}
function bm25(vector, weights, data) {
  let score = 0;
  for (const [key, idf] of weights) {
    const count = vector.counts.get(key) ?? 0;
    if (!count) continue;
    score +=
      (idf * count * 2.2) /
      (count +
        1.2 *
          (0.25 + (0.75 * vector.length) / Math.max(1, data.averageLength)));
  }
  return score;
}
function evidenceIntent(keys) {
  const intent = new Set(keys);
  return {
    status: ["status", "action", "stage"].some((word) =>
      intent.has(termKey(word)),
    ),
    dateRequested: [
      "date",
      "publication",
      "published",
      "effective",
      "enacted",
    ].some((word) => intent.has(termKey(word))),
    effective: intent.has(termKey("effective")),
  };
}
function evidenceFields(entry, request, intent, state, data) {
  const fields = new Map();
  const add = (provenance, label) => {
    for (const id of provenance.segmentIds) {
      const passage = data.segments.get(id);
      if (
        !passage.searchable ||
        passage.rendition.versionId !== entry.version.id ||
        (state && !state.knownRenditions.has(passage.rendition.id))
      )
        continue;
      if (!fields.has(id)) fields.set(id, []);
      if (!fields.get(id).includes(label)) fields.get(id).push(label);
    }
  };
  const { status, dateRequested } = intent;
  for (const provenance of entry.version.fieldProvenance) {
    if (
      (status && provenance.field === "/sourceStatusLabel") ||
      ((dateRequested || request.asOf) &&
        provenance.field.startsWith("/dates/"))
    )
      add(provenance, `version${provenance.field}`);
  }
  if (dateRequested || request.basis === "source_effective") {
    for (const event of entry.events) {
      if (state && !state.knownEventIds.has(event.id)) continue;
      if (intent.effective && event.type !== "effective") continue;
      for (const provenance of event.fieldProvenance)
        if (provenance.field === "/date/value")
          add(provenance, `event:${event.type}/date/value`);
    }
  }
  return fields;
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
  ensure(
    request.matchMode === undefined ||
      ["any_terms", "all_terms"].includes(request.matchMode),
    "INVALID_MATCH_MODE",
  );
  const matchMode = request.matchMode ?? "any_terms";
  for (const key of [
    "sourceProfileId",
    "governmentContext",
    "jurisdictionRef",
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
    request.jurisdictionRef === undefined ||
      isJurisdictionRef(request.jurisdictionRef),
    "INVALID_JURISDICTION_REF",
  );
  ensure(
    !request.jurisdictionRef?.startsWith("us-state:") ||
      US_STATE_CODES.includes(request.jurisdictionRef.slice(9)),
    "UNKNOWN_JURISDICTION_STATE",
  );
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
  const queryTermKeys = queryTerms.map((term) => [term, termKey(term)]);
  const queryKeys = [...new Set(queryTermKeys.map(([, key]) => key))];
  const weights = queryKeys.map((key) => {
    const df = data.frequency.get(key) ?? 0;
    return [key, Math.log(1 + (data.passageCount - df + 0.5) / (df + 0.5))];
  });
  const intent = evidenceIntent(queryKeys);
  const phrases = [...query.matchAll(/"([^"\n]+)"/gu)]
    .map((match) => tokens(match[1]).join(" "))
    .filter(Boolean);
  const exactQuery = identifier(query);
  const state = temporalState(data, request.asOf, request.basis);
  const jurisdictionMatch = (work, versionId = null) =>
    !request.jurisdictionRef ||
    (work.jurisdictionRefs ?? []).some(
      (association) =>
        association.jurisdictionRef === request.jurisdictionRef &&
        association.reviewState === "reviewed" &&
        (versionId === null || association.versionId === versionId) &&
        (!state ||
          association.segmentIds.every((segmentId) =>
            state.knownRenditions.has(
              data.segments.get(segmentId)?.segment.renditionId,
            ),
          )),
    );
  const scopedWorks = new Set(
    data.corpus.works
      .filter(
        (work) =>
          (!request.sourceProfileId ||
            request.sourceProfileId === work.sourceProfileId) &&
          (!request.governmentContext ||
            request.governmentContext === work.governmentContext) &&
          (!request.instrumentClass ||
            request.instrumentClass === work.instrumentClass) &&
          jurisdictionMatch(work),
      )
      .map((work) => work.id),
  );
  const matches = [];
  for (const entry of data.entries) {
    const { work, version } = entry;
    if (
      !scopedWorks.has(work.id) ||
      !jurisdictionMatch(work, version.id) ||
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
    const titleScore = known.title ? bm25(entry.title, weights, data) : 0;
    // At most eight source-metadata variants; the key records which fields
    // have evidence at this cutoff. No query text or result is retained.
    const metadataKey =
      Number(known.identifier) |
      (Number(known.versionIdentifier) << 1) |
      (Number(known.status) << 2);
    let metadata = entry.metadata.get(metadataKey);
    if (!metadata) {
      metadata = vector(
        `${known.identifier ? work.sourceIdentifier : ""} ${known.versionIdentifier ? version.sourceVersionIdentifier : ""} ${known.status ? version.sourceStatusLabel : ""}`,
        data.termKeys,
      );
      entry.metadata.set(metadataKey, metadata);
    }
    const metadataScore = bm25(metadata, weights, data);
    const proofFields = evidenceFields(entry, request, intent, state, data);
    const eligiblePassages = entry.passages.filter(
      (passage) => !state || state.knownRenditions.has(passage.rendition.id),
    );
    const lexicalKeys = new Set([
      ...(known.title ? entry.title.counts.keys() : []),
      ...metadata.counts.keys(),
      ...eligiblePassages.flatMap((passage) => [
        ...passage.vector.counts.keys(),
      ]),
    ]);
    const matchedTerms = exactFields.length
      ? queryTerms
      : queryTermKeys
          .filter(([, key]) => lexicalKeys.has(key))
          .map(([term]) => term);
    if (
      matchMode === "all_terms" &&
      matchedTerms.length !== queryTermKeys.length
    )
      continue;
    const passages = eligiblePassages
      .map((passage) => {
        const matched = queryTermKeys.filter(([, key]) =>
          passage.vector.counts.has(key),
        );
        const matchedTerms = matched.map(([term]) => term);
        const matchedPhrases = phrases.filter((phrase) =>
          ` ${passage.vector.normalized} `.includes(` ${phrase} `),
        );
        const lexicalScore =
          bm25(passage.vector, weights, data) +
          new Set(matched.map(([, key]) => key)).size * 1.25 +
          matchedPhrases.length * 4;
        const context = passage.context
          .map((other) => ({
            id: other.segment.id,
            score:
              bm25(other.vector, weights, data) * (other.heading ? 0.35 : 0.15),
          }))
          .filter((other) => other.score > 0);
        const contextScore = Math.max(
          0,
          ...context.map((other) => other.score),
        );
        const fields = proofFields.get(passage.segment.id) ?? [];
        return {
          segmentId: passage.segment.id,
          renditionId: passage.rendition.id,
          captureId: passage.rendition.captureId,
          score: lexicalScore + contextScore,
          lexicalScore,
          contextScore,
          contextSegmentIds: context.map((other) => other.id),
          evidenceFields: fields,
          matchedTerms,
          matchedPhrases,
          whyShown: fields.length
            ? "source_field_provenance"
            : matchedTerms.length
              ? "source_passage_match"
              : context.length
                ? "source_context_match"
                : "identifier_or_browse_evidence",
        };
      })
      .filter(
        (passage) =>
          !query ||
          passage.score > 0 ||
          exactFields.length > 0 ||
          passage.evidenceFields.length,
      )
      .sort((a, b) => b.score - a.score || order(a.segmentId, b.segmentId));
    const titlePhrase =
      known.title &&
      phrases.some((phrase) =>
        ` ${entry.title.normalized} `.includes(` ${phrase} `),
      );
    // Explicitly quoted phrases must occur in at least one eligible field/passage.
    if (
      phrases.some(
        (phrase) =>
          !(
            known.title && ` ${entry.title.normalized} `.includes(` ${phrase} `)
          ) &&
          !passages.some((passage) => passage.matchedPhrases.includes(phrase)),
      )
    )
      continue;
    const score =
      titleScore * 0.75 +
      metadataScore +
      (passages[0]?.score ?? 0) +
      passages
        .slice(0, 3)
        .reduce((sum, passage) => sum + passage.lexicalScore, 0) *
        0.25 +
      (titlePhrase ? 4 : 0);
    if (query && score === 0 && exactFields.length === 0) continue;
    const bestPassage = passages[0]?.score ?? 0;
    for (const passage of passages)
      if (passage.evidenceFields.length)
        passage.score = Math.max(passage.score, bestPassage * 0.95);
    passages.sort(
      (a, b) => b.score - a.score || order(a.segmentId, b.segmentId),
    );
    // Document context carries identifier/title matches into evidence ranking;
    // diminishing repeated hits prevents one long instrument filling the pool.
    passages.forEach((passage, rank) => {
      passage.score = (passage.score + score * 0.3) / (1 + rank * 0.18);
    });
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
      matchedTerms,
      allTermsInOnePassage: eligiblePassages.some((passage) =>
        queryTermKeys.every(([, key]) => passage.vector.counts.has(key)),
      ),
      whyShown,
      metadataKnown: known,
      passages: passages.slice(0, passageLimit),
      matchingPassageCount: passages.length,
      eventIds: entry.events
        .filter((event) => !state || state.knownEventIds.has(event.id))
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
    matchMode,
    queryTerms,
    total: matches.length,
    hits: matches.slice(0, limit),
    temporal: state
      ? {
          asOf: request.asOf,
          basis: request.basis,
          unknownWorkIds: state.snapshot.selections
            .filter(
              (entry) =>
                entry.state === "unknown" && scopedWorks.has(entry.workId),
            )
            .map((entry) => entry.workId),
          excluded: state.snapshot.excluded.filter((entry) =>
            scopedWorks.has(entry.workId),
          ),
          limitations: state.snapshot.limitations,
        }
      : null,
    limitations: [
      "Lexical matches require review of the cited source passages; no answer or legal conclusion is generated.",
      "Separate instruments can supply separate parts of a question. Retained versions are ranked independently.",
      "Scoring folds English suffixes and uses declared neighboring/section context, document relevance, and requested field provenance; exact phrases and identifiers stay literal. Quotes are never concatenated.",
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
