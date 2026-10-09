import schema from "../../schemas/research-study.schema.v1.json" with { type: "json" };
import {
  hasStateJurisdictionEvidence,
  isJurisdictionRef,
  parseJurisdictionAssociation,
  US_STATE_CODES,
} from "./jurisdiction-reference.mjs";

export const RESEARCH_STUDY_SCHEMA_ID = schema.$id;
export const RESEARCH_STUDY_SCHEMA_VERSION = "1.0.0";
export const MAX_RESEARCH_STUDY_BYTES = 8 * 1024 * 1024;
const CATALOGS = {
  actors: "actor",
  questions: "question",
  discoveries: "discovery",
  candidates: "candidate",
  passages: "passage",
  assertions: "assertion",
  reviews: "review",
  gaps: "gap",
  annotations: "annotation",
  proceedings: "proceeding",
  actions: "action",
  deadlines: "deadline",
  consultations: "consultation",
  environmentalEvidence: "environmentalEvidence",
  authorityRelationships: "authorityRelationship",
  originGroups: "originGroup",
};
const encoder = new globalThis.TextEncoder();
const decoder = new globalThis.TextDecoder("utf-8", { fatal: true });
const corpusCache = new WeakMap();
const validatedCorpusBindings = new WeakMap();
const knownStudies = new WeakSet();
const capturedPassages = new WeakSet();
const IMMUTABLE = new Set(["actors", "passages", "reviews", "deadlines"]);
const ROLES = {
  notice: ["agency", "notice_recipient"],
  invitation: ["agency", "invited"],
  meeting_held: ["agency", "attended"],
  submission: ["agency", "submitter"],
  response: ["agency", "respondent", "notice_recipient"],
  outcome: ["agency", "outcome_subject"],
};
export class ResearchStudyError extends TypeError {
  constructor(code) {
    super("Research study rejected input: " + code);
    this.name = "ResearchStudyError";
    this.code = code;
  }
}
function ensure(condition, code) {
  if (!condition) throw new ResearchStudyError(code);
}
function snapshot(value, limit = MAX_RESEARCH_STUDY_BYTES) {
  const ancestors = new Set();
  let nodes = 0;
  let characters = 0;
  function visit(item, depth) {
    ensure(++nodes <= 1000000 && depth <= 48, "INPUT_LIMIT");
    if (item === null || typeof item === "boolean") return item;
    if (typeof item === "number") {
      ensure(Number.isSafeInteger(item), "INTEGER_REQUIRED");
      return item;
    }
    if (typeof item === "string") {
      characters += item.length;
      ensure(characters <= limit && item.isWellFormed(), "INPUT_LIMIT");
      return item;
    }
    ensure(
      typeof item === "object" && !ancestors.has(item),
      "PLAIN_JSON_REQUIRED",
    );
    const array = Array.isArray(item);
    const prototype = Object.getPrototypeOf(item);
    ensure(
      prototype === (array ? Array.prototype : Object.prototype) ||
        (!array && prototype === null),
      "PLAIN_JSON_REQUIRED",
    );
    const descriptors = Object.getOwnPropertyDescriptors(item);
    ensure(
      Reflect.ownKeys(descriptors).every(
        (key) =>
          typeof key === "string" &&
          "value" in descriptors[key] &&
          ((array && key === "length") || descriptors[key].enumerable) &&
          !["__proto__", "constructor", "prototype"].includes(key),
      ),
      "PLAIN_JSON_REQUIRED",
    );
    ancestors.add(item);
    let result;
    if (array) {
      ensure(
        item.length <= 100000 &&
          Object.keys(descriptors).length === item.length + 1,
        "INPUT_LIMIT",
      );
      result = [];
      for (let index = 0; index < item.length; index++) {
        ensure(
          Object.hasOwn(descriptors, String(index)),
          "PLAIN_JSON_REQUIRED",
        );
        result.push(visit(descriptors[index].value, depth + 1));
      }
    } else {
      result = {};
      for (const [key, descriptor] of Object.entries(descriptors))
        result[key] = visit(descriptor.value, depth + 1);
    }
    ancestors.delete(item);
    return result;
  }
  return visit(value, 0);
}
function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}"
  );
}
async function hashBytes(bytes) {
  return [
    ...new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
async function digest(value) {
  return hashBytes(encoder.encode(canonical(value)));
}
async function bodyDigest(value) {
  const { contentDigest, ...body } = value;
  void contentDigest;
  return digest(body);
}
function shape(value, rule, path = "study") {
  if (rule.$ref) return shape(value, schema.$defs[rule.$ref.slice(8)], path);
  if (rule.anyOf) {
    ensure(
      rule.anyOf.some((choice) => {
        try {
          shape(value, choice, path);
          return true;
        } catch (error) {
          if (!(error instanceof ResearchStudyError)) throw error;
          return false;
        }
      }),
      "SHAPE:" + path,
    );
    return;
  }
  if (Object.hasOwn(rule, "const"))
    ensure(value === rule.const, "SHAPE:" + path);
  if (rule.enum) ensure(rule.enum.includes(value), "SHAPE:" + path);
  if (rule.type === "null") ensure(value === null, "SHAPE:" + path);
  if (rule.type === "boolean")
    ensure(typeof value === "boolean", "SHAPE:" + path);
  if (rule.type === "integer")
    ensure(
      Number.isSafeInteger(value) &&
        (rule.minimum === undefined || value >= rule.minimum) &&
        (rule.maximum === undefined || value <= rule.maximum),
      "SHAPE:" + path,
    );
  if (rule.type === "string") {
    ensure(
      typeof value === "string" &&
        (rule.minLength === undefined || value.length >= rule.minLength) &&
        (rule.maxLength === undefined || value.length <= rule.maxLength) &&
        (!rule.pattern || new RegExp(rule.pattern, "u").test(value)),
      "SHAPE:" + path,
    );
    if (rule.format === "date-time") ensure(validTime(value), "DATE_TIME");
    if (rule.format === "date")
      ensure(validTime(value + "T00:00:00Z"), "DATE_VALUE");
    if (rule.format === "uri") {
      let url;
      try {
        url = new globalThis.URL(value);
      } catch {
        throw new ResearchStudyError("URL");
      }
      ensure(
        ["http:", "https:"].includes(url.protocol) &&
          !url.username &&
          !url.password,
        "URL",
      );
    }
  }
  if (rule.type === "array") {
    ensure(
      Array.isArray(value) &&
        (rule.maxItems === undefined || value.length <= rule.maxItems),
      "SHAPE:" + path,
    );
    value.forEach((item, index) => shape(item, rule.items, path + "/" + index));
  }
  if (rule.type === "object") {
    ensure(
      value !== null && typeof value === "object" && !Array.isArray(value),
      "SHAPE:" + path,
    );
    ensure(
      rule.required.every((key) => Object.hasOwn(value, key)) &&
        Object.keys(value).every((key) => Object.hasOwn(rule.properties, key)),
      "SHAPE:" + path,
    );
    for (const [key, child] of Object.entries(value))
      shape(child, rule.properties[key], path + "/" + key);
  }
}
function validTime(value) {
  const milliseconds = Date.parse(value);
  return (
    Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() ===
      value.replace(/Z$/u, value.includes(".") ? "Z" : ".000Z")
  );
}
function date(value) {
  shape(value, schema.$defs.policyDate, "date");
  if (value.precision === "unknown")
    return ensure(value.value === null, "DATE_PRECISION");
  ensure(typeof value.value === "string", "DATE_PRECISION");
  const patterns = {
    year: /^\d{4}$/u,
    month: /^\d{4}-\d{2}$/u,
    day: /^\d{4}-\d{2}-\d{2}$/u,
  };
  ensure(patterns[value.precision].test(value.value), "DATE_PRECISION");
  const complete =
    value.value +
    (value.precision === "year"
      ? "-01-01"
      : value.precision === "month"
        ? "-01"
        : "");
  ensure(validTime(complete + "T00:00:00Z"), "DATE_VALUE");
}
/** Normalize one explicit English month fragment, never surrounding date prose. */
export function normalizeStudySourceDate(sourceDateText) {
  if (typeof sourceDateText !== "string") return null;
  const match =
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:(\d{1,2}),?\s+)?(\d{4})$/iu.exec(
      sourceDateText.trim(),
    );
  if (!match) return null;
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const month = String(months.indexOf(match[1].toLowerCase()) + 1).padStart(
    2,
    "0",
  );
  const day = match[2]?.padStart(2, "0");
  const value = `${match[3]}-${month}${day === undefined ? "" : "-" + day}`;
  if (!validTime(value + (day === undefined ? "-01" : "") + "T00:00:00Z"))
    return null;
  return Object.freeze({
    value,
    precision: day === undefined ? "month" : "day",
  });
}
function unique(values, code = "DUPLICATE_REFERENCE") {
  ensure(new Set(values).size === values.length, code);
}
function chronologicallyCompatible(previous, next) {
  if (previous.precision === "unknown" || next.precision === "unknown")
    return true;
  const start = (value) =>
    value.value +
    (value.precision === "year"
      ? "-01-01"
      : value.precision === "month"
        ? "-01"
        : "");
  const last =
    next.value +
    (next.precision === "year"
      ? "-12-31"
      : next.precision === "month"
        ? "-31"
        : "");
  return last >= start(previous);
}
function mapById(values) {
  const result = new Map();
  for (const value of values) {
    ensure(
      value && typeof value.id === "string" && !result.has(value.id),
      "CORPUS_ID",
    );
    result.set(value.id, value);
  }
  return result;
}
/** The caller supplies a validated corpus; the immutable snapshot and checksum prevent later substitution. */
async function corpusIndex(corpus) {
  ensure(corpus && typeof corpus === "object", "CORPUS_REQUIRED");
  if (corpusCache.has(corpus)) return corpusCache.get(corpus);
  const copy = snapshot(corpus, 128 * 1024 * 1024);
  const promise = (async () => {
    ensure(
      copy.kind === "analyzed_corpus" &&
        ["2.0.0", "2.1.0"].includes(copy.schemaVersion) &&
        ["real_source_local", "synthetic_test_only"].includes(copy.trustDomain),
      "CORPUS_CONTRACT",
    );
    ensure((await bodyDigest(copy)) === copy.contentDigest, "CORPUS_DIGEST");
    const result = { corpus: freeze(copy), citations: new Map() };
    for (const key of [
      "sourceProfiles",
      "captures",
      "works",
      "versions",
      "renditions",
      "segments",
    ]) {
      ensure(Array.isArray(copy[key]), "CORPUS_CONTRACT");
      result[key] = mapById(copy[key]);
    }
    if (copy.schemaVersion === "2.1.0") {
      for (const work of copy.works) {
        ensure(Array.isArray(work.jurisdictionRefs), "CORPUS_JURISDICTION");
        for (const association of work.jurisdictionRefs) {
          const { versionId, segmentIds, reviewer, ...shared } = association;
          parseJurisdictionAssociation(JSON.stringify(shared), work.id);
          ensure(
            !association.jurisdictionRef.startsWith("us-state:") ||
              US_STATE_CODES.includes(association.jurisdictionRef.slice(9)),
            "CORPUS_JURISDICTION_STATE",
          );
          ensure(
            !association.jurisdictionRef.startsWith("nation:") ||
              (copy.trustDomain === "synthetic_test_only" &&
                association.jurisdictionRef.startsWith("nation:synthetic-")),
            "CORPUS_JURISDICTION_NATION_REGISTRY",
          );
          ensure(
            association.evidence.exactSubject &&
              Array.isArray(segmentIds) &&
              segmentIds.length > 0,
            "CORPUS_JURISDICTION",
          );
          ensure(
            !association.jurisdictionRef.startsWith("us-state:") ||
              hasStateJurisdictionEvidence(
                association.jurisdictionRef,
                association.evidence.exactSubject.text,
              ),
            "CORPUS_JURISDICTION_STATE_IDENTITY",
          );
          ensure(
            !association.jurisdictionRef.startsWith("nation:") ||
              association.evidence.exactSubject.text
                .split(/[^a-z0-9:-]+/u)
                .includes(association.jurisdictionRef),
            "CORPUS_JURISDICTION_NATION_IDENTITY",
          );
          ensure(
            association.reviewState !== "reviewed" ||
              (reviewer && validTime(reviewer.reviewedAt)),
            "CORPUS_JURISDICTION_REVIEW",
          );
          let replayed = false;
          for (const segmentId of segmentIds) {
            const { citation, text } = await citationFor(result, segmentId);
            ensure(
              citation.workId === work.id &&
                citation.versionId === versionId &&
                citation.sourceUrl === association.evidence.url,
              "CORPUS_JURISDICTION_SOURCE",
            );
            if (reviewer)
              ensure(
                Date.parse(citation.retrievedAt) <=
                  Date.parse(reviewer.reviewedAt) &&
                  Date.parse(reviewer.reviewedAt) <=
                    Date.parse(copy.generatedAt),
                "CORPUS_JURISDICTION_REVIEW",
              );
            replayed ||=
              citation.locator.value === association.evidence.locator &&
              text.includes(association.evidence.exactSubject.text);
          }
          ensure(replayed, "CORPUS_JURISDICTION_REPLAY");
        }
      }
    }
    validatedCorpusBindings.set(corpus, {
      id: copy.id,
      contentDigest: copy.contentDigest,
    });
    return result;
  })();
  corpusCache.set(corpus, promise);
  return promise;
}
async function citationFor(index, segmentId) {
  if (index.citations.has(segmentId)) return index.citations.get(segmentId);
  const promise = (async () => {
    const segment = index.segments.get(segmentId);
    const rendition = index.renditions.get(segment?.renditionId);
    const version = index.versions.get(rendition?.versionId);
    const work = index.works.get(version?.workId);
    const capture = index.captures.get(rendition?.captureId);
    const profile = index.sourceProfiles.get(work?.sourceProfileId);
    ensure(
      segment && rendition && version && work && capture && profile,
      "CITATION_MISSING",
    );
    ensure(
      version.renditionIds.includes(rendition.id) &&
        capture.sourceProfileId === profile.id &&
        capture.sourceProfileDigest === profile.contentDigest,
      "CITATION_RELATION",
    );
    for (const member of [
      segment,
      rendition,
      version,
      work,
      capture,
      profile,
    ]) {
      ensure(
        (await bodyDigest(member)) === member.contentDigest,
        "CITATION_DIGEST",
      );
    }
    const bytes = encoder.encode(rendition.text);
    ensure(
      bytes.byteLength === rendition.byteLength &&
        (await hashBytes(bytes)) === rendition.outputDigest,
      "RENDITION_DIGEST",
    );
    ensure(
      Number.isSafeInteger(segment.startByte) &&
        Number.isSafeInteger(segment.endByte) &&
        segment.startByte >= 0 &&
        segment.startByte < segment.endByte &&
        segment.endByte <= bytes.length,
      "CITATION_RANGE",
    );
    const selected = bytes.subarray(segment.startByte, segment.endByte);
    ensure(
      (await hashBytes(selected)) === segment.textDigest &&
        (await hashBytes(
          bytes.subarray(
            Math.max(0, segment.startByte - 32),
            Math.min(bytes.length, segment.endByte + 32),
          ),
        )) === segment.contextDigest,
      "CITATION_TEXT_DIGEST",
    );
    let text;
    try {
      text = decoder.decode(selected);
    } catch {
      throw new ResearchStudyError("CITATION_UTF8");
    }
    const citation = {
      corpusId: index.corpus.id,
      corpusDigest: index.corpus.contentDigest,
      workId: work.id,
      workDigest: work.contentDigest,
      versionId: version.id,
      versionDigest: version.contentDigest,
      renditionId: rendition.id,
      renditionDigest: rendition.contentDigest,
      renditionOutputDigest: rendition.outputDigest,
      segmentId: segment.id,
      segmentDigest: segment.contentDigest,
      textDigest: segment.textDigest,
      contextDigest: segment.contextDigest,
      startByte: segment.startByte,
      endByte: segment.endByte,
      captureId: capture.id,
      captureDigest: capture.contentDigest,
      objectDigest: capture.objectDigest,
      sourceProfileId: profile.id,
      sourceProfileDigest: profile.contentDigest,
      sourceId: profile.sourceId,
      sourceUrl: capture.finalUrl,
      sourceTitle: work.title,
      sourceIdentifier: work.sourceIdentifier,
      sourceVersionIdentifier: version.sourceVersionIdentifier,
      sourceOrigin: {
        publisher: profile.publisher,
        operator: profile.operator,
        authorityLabel: profile.authorityLabel,
      },
      retrievedAt: capture.retrievedAt,
      observedAt: version.observedAt,
      sourceDates: version.dates,
      sourceUpdatedAt: version.dates.sourceVersion,
      locator: segment.locator,
      uses: profile.uses,
    };
    shape(citation, schema.$defs.citation, "citation");
    return { citation: freeze(citation), text };
  })();
  index.citations.set(segmentId, promise);
  return promise;
}
function citationMatches(left, right) {
  return canonical(left) === canonical(right);
}
async function passageText(passage, index) {
  if (passage.bindingStatus !== "verified") return null;
  const value = await citationFor(index, passage.citation.segmentId);
  ensure(citationMatches(passage.citation, value.citation), "CITATION_BINDING");
  return value.text;
}
function tokenOccurs(text, token) {
  if (!token) return true;
  let offset = text.indexOf(token);
  const word = /[\p{L}\p{N}]/u;
  while (offset !== -1) {
    const end = offset + token.length;
    if (
      (!word.test(token[0]) || offset === 0 || !word.test(text[offset - 1])) &&
      (!word.test(token.at(-1)) || end === text.length || !word.test(text[end]))
    )
      return true;
    offset = text.indexOf(token, offset + 1);
  }
  return false;
}
function rollback(study, entry) {
  const result = { ...study, revisions: study.revisions.slice(0, -1) };
  for (const [key] of Object.entries(CATALOGS)) result[key] = [...study[key]];
  for (const change of entry.changes) {
    const items = result[change.collection];
    const position = items.findIndex((record) => record.id === change.id);
    ensure(position !== -1, "HISTORY_REFERENCE");
    if (change.record === null) items.splice(position, 1);
    else items[position] = change.record;
  }
  for (const key of [
    "revision",
    "updatedAt",
    "updatedBy",
    "corpusId",
    "corpusDigest",
    "previousDigest",
    "contentDigest",
  ])
    result[key] = entry[key];
  return result;
}
async function checkEnvelope(input) {
  const study = snapshot(input);
  shape(study, schema);
  ensure(
    encoder.encode(canonical(study)).byteLength <= MAX_RESEARCH_STUDY_BYTES,
    "STUDY_BYTE_LIMIT",
  );
  ensure(
    study.revisions.length === study.revision - 1 &&
      Date.parse(study.updatedAt) >= Date.parse(study.createdAt),
    "REVISION_ORDER",
  );
  let cursor = study;
  for (;;) {
    ensure((await bodyDigest(cursor)) === cursor.contentDigest, "STUDY_DIGEST");
    if (cursor.revisions.length === 0) {
      ensure(
        cursor.revision === 1 && cursor.previousDigest === null,
        "REVISION_ORIGIN",
      );
      break;
    }
    const entry = cursor.revisions.at(-1);
    ensure(
      entry.revision === cursor.revision - 1 &&
        cursor.previousDigest === entry.contentDigest &&
        Date.parse(entry.updatedAt) <= Date.parse(cursor.updatedAt),
      "REVISION_ORDER",
    );
    unique(
      entry.changes.map((change) => change.collection + ":" + change.id),
      "HISTORY_DUPLICATE",
    );
    for (const change of entry.changes) {
      if (change.record !== null) {
        shape(
          change.record,
          schema.$defs[CATALOGS[change.collection]],
          "history",
        );
        ensure(change.record.id === change.id, "HISTORY_REFERENCE");
        const current = cursor[change.collection].find(
          (record) => record.id === change.id,
        );
        ensure(current, "HISTORY_REFERENCE");
        const reboundPassage =
          change.collection === "passages" &&
          (cursor.corpusId !== entry.corpusId ||
            cursor.corpusDigest !== entry.corpusDigest) &&
          current.bindingStatus === "review_required" &&
          current.reviewState === "unreviewed" &&
          metadataOnlyChange(
            {
              ...change.record,
              bindingStatus: current.bindingStatus,
              bindingIssue: current.bindingIssue,
            },
            current,
          );
        if (IMMUTABLE.has(change.collection))
          ensure(
            change.collection === "reviews"
              ? canonical(current) === canonical(change.record)
              : metadataOnlyChange(current, change.record) || reboundPassage,
            "HISTORY_IMMUTABLE_EVIDENCE",
          );
        if (change.collection !== "actors")
          ensure(
            current.createdAt === change.record.createdAt &&
              current.actorId === change.record.actorId &&
              current.provenance === change.record.provenance,
            "HISTORY_AUTHORSHIP_IMMUTABLE",
          );
      }
    }
    cursor = rollback(cursor, entry);
  }
  return study;
}
function cycles(records, property, code) {
  const items = new Map(records.map((record) => [record.id, record]));
  for (const record of records) {
    const seen = new Set();
    let current = record;
    while (current) {
      ensure(!seen.has(current.id), code);
      seen.add(current.id);
      current =
        current[property] === null ? null : items.get(current[property]);
    }
  }
}
export function studyRecordReferences(collection, record) {
  const refs = collection === "actors" ? [] : [record.actorId];
  const fields = {
    questions: ["parentQuestionId"],
    discoveries: ["questionId", "followUpGapId"],
    candidates: ["discoveryId"],
    assertions: ["questionId", "supersedesAssertionId"],
    reviews: ["targetId"],
    gaps: ["questionId", "followUpDiscoveryId"],
    annotations: ["targetId"],
    proceedings: ["parentProceedingId"],
    actions: ["proceedingId", "previousActionId"],
    deadlines: ["actionId", "replacesDeadlineId"],
    consultations: ["proceedingId", "respondsToEventId"],
  };
  for (const field of fields[collection] ?? [])
    if (record[field] !== null) refs.push(record[field]);
  for (const field of [
    "passageIds",
    "supportingPassageIds",
    "challengingPassageIds",
    "relatedEventIds",
  ]) {
    if (record[field]) refs.push(...record[field]);
  }
  if (collection === "consultations")
    for (const participant of record.participants)
      refs.push(participant.actorId, ...participant.passageIds);
  if (collection === "authorityRelationships") {
    for (const subject of [record.subject, record.object])
      if (subject.kind !== "version") refs.push(subject.id);
  }
  return [...new Set(refs)];
}
function recordChangedAt(study, id, createdAt) {
  for (let index = study.revisions.length - 1; index >= 0; index--) {
    if (study.revisions[index].changes.some((change) => change.id === id)) {
      return study.revisions[index + 1]?.updatedAt ?? study.updatedAt;
    }
  }
  return createdAt;
}
function recordChangeRevision(study, id) {
  return (
    (study.revisions.findLast((entry) =>
      entry.changes.some((change) => change.id === id),
    )?.revision ?? 0) + 1
  );
}
function recordCreationRevision(study, id) {
  return (
    (study.revisions.find((entry) =>
      entry.changes.some(
        (change) => change.id === id && change.record === null,
      ),
    )?.revision ?? 0) + 1
  );
}
async function semantics(study, index) {
  ensure(
    study.corpusId === index.corpus.id &&
      study.corpusDigest === index.corpus.contentDigest &&
      study.trustDomain === index.corpus.trustDomain,
    "CORPUS_BINDING",
  );
  const maps = Object.fromEntries(
    Object.keys(CATALOGS).map((key) => [key, mapById(study[key])]),
  );
  const all = new Map();
  for (const key of Object.keys(CATALOGS))
    for (const record of study[key]) {
      ensure(
        !all.has(record.id) && record.id !== study.id,
        "RECORD_ID_COLLISION",
      );
      all.set(record.id, { collection: key, record });
    }
  ensure(maps.actors.has(study.updatedBy), "ACTOR_REFERENCE");
  const reference = (collection, id, optional = false) => {
    if (optional && id === null) return null;
    const value = maps[collection].get(id);
    ensure(value, "REFERENCE:" + collection);
    return value;
  };
  const version = (id, record = null) => {
    const saved = study.passages.find(
      (passage) =>
        passage.bindingStatus === "review_required" &&
        passage.citation.versionId === id,
    )?.citation;
    const unresolved =
      record?.reviewState === "unreviewed" &&
      record.passageIds?.length > 0 &&
      record.passageIds.every(
        (passageId) =>
          maps.passages.get(passageId)?.bindingStatus === "review_required",
      );
    const value =
      index.versions.get(id) ??
      (saved
        ? {
            id,
            workId: saved.workId,
            sourceVersionIdentifier: saved.sourceVersionIdentifier,
            saved,
          }
        : unresolved
          ? {
              id,
              workId: null,
              sourceVersionIdentifier: null,
              unresolved: true,
            }
          : null);
    ensure(value, "VERSION_REFERENCE");
    return value;
  };
  for (const [collection, definition] of Object.entries(CATALOGS)) {
    for (const record of study[collection]) {
      shape(record, schema.$defs[definition], collection);
      if (collection === "actors") continue;
      const actor = reference("actors", record.actorId);
      ensure(["analyst", "model", "rule"].includes(actor.kind), "AUTHOR_ROLE");
      ensure(
        Date.parse(record.createdAt) >= Date.parse(study.createdAt) &&
          Date.parse(record.createdAt) <= Date.parse(study.updatedAt),
        "RECORD_TIME",
      );
      ensure(
        collection === "passages"
          ? record.provenance === "source_content"
          : record.provenance !== "source_content",
        "SOURCE_PROVENANCE",
      );
      if (actor.kind === "model" && collection !== "passages")
        ensure(
          record.provenance === "model_interpretation",
          "MODEL_PROVENANCE",
        );
      for (const id of studyRecordReferences(collection, record))
        ensure(all.has(id), "RECORD_REFERENCE");
      for (const key of [
        "passageIds",
        "supportingPassageIds",
        "challengingPassageIds",
        "relatedEventIds",
        "versionIds",
        "sourceIds",
      ]) {
        if (record[key]) unique(record[key]);
      }
      if (record.passageIds)
        record.passageIds.forEach((id) => reference("passages", id));
    }
  }
  const texts = new Map();
  for (const passage of study.passages) {
    ensure(
      Date.parse(passage.createdAt) >= Date.parse(passage.citation.retrievedAt),
      "CAPTURE_TIME",
    );
    date(passage.citation.sourceDates.publication);
    date(passage.citation.sourceDates.sourceVersion);
    date(passage.citation.sourceUpdatedAt);
    ensure(
      passage.citation.startByte < passage.citation.endByte,
      "CITATION_RANGE",
    );
    if (passage.bindingStatus === "verified") {
      ensure(passage.bindingIssue === null, "BINDING_STATE");
      texts.set(passage.id, await passageText(passage, index));
    } else {
      ensure(
        typeof passage.bindingIssue === "string" &&
          passage.reviewState !== "accepted",
        "BINDING_STATE",
      );
      texts.set(passage.id, null);
    }
  }
  function statement(
    record,
    text = record.sourceStatement,
    passageIds = record.passageIds,
  ) {
    ensure(passageIds.length > 0, "EVIDENCE_REQUIRED");
    const passages = passageIds.map((id) => reference("passages", id));
    if (passages.some((passage) => passage.bindingStatus !== "verified")) {
      ensure(record.reviewState !== "accepted", "STALE_EVIDENCE_REVIEW");
      return false;
    }
    ensure(
      passages.some(
        (passage) =>
          passage.citation.uses.localDisplay !== "metadata_link" &&
          passage.citation.uses.excerpts &&
          (passage.citation.uses.localDisplay !== "excerpt" ||
            text.length <= 1200) &&
          texts.get(passage.id).includes(text),
      ),
      "SOURCE_STATEMENT_REPLAY",
    );
    return true;
  }
  function sourceDate(record) {
    date(record.date);
    if (record.sourceDateText !== null)
      ensure(
        record.sourceStatement.includes(record.sourceDateText),
        "SOURCE_DATE_REPLAY",
      );
    if (record.date.precision !== "unknown") {
      const normalized = normalizeStudySourceDate(record.sourceDateText);
      ensure(
        record.sourceDateText !== null &&
          (normalized !== null
            ? normalized.value === record.date.value &&
              normalized.precision === record.date.precision
            : !/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/iu.test(
                record.sourceDateText,
              ) && tokenOccurs(record.sourceDateText, record.date.value)),
        "SOURCE_DATE_NORMALIZATION",
      );
    }
  }
  for (const question of study.questions)
    reference("questions", question.parentQuestionId, true);
  for (const discovery of study.discoveries) {
    const jurisdictionRef = discovery.searchScope?.jurisdictionRef;
    ensure(
      jurisdictionRef === undefined ||
        jurisdictionRef === null ||
        isJurisdictionRef(jurisdictionRef),
      "DISCOVERY_JURISDICTION_REF",
    );
    ensure(
      !jurisdictionRef?.startsWith("us-state:") ||
        US_STATE_CODES.includes(jurisdictionRef.slice(9)),
      "DISCOVERY_JURISDICTION_STATE",
    );
    reference("questions", discovery.questionId);
    const gap = reference("gaps", discovery.followUpGapId, true);
    if (gap)
      ensure(gap.questionId === discovery.questionId, "DISCOVERY_QUESTION");
  }
  for (const candidate of study.candidates) {
    reference("discoveries", candidate.discoveryId);
    if (candidate.versionId !== null) {
      const document = version(candidate.versionId);
      const work = index.works.get(document.workId);
      ensure(
        (document.saved?.sourceId ??
          index.sourceProfiles.get(work.sourceProfileId).sourceId) ===
          candidate.sourceId,
        "CANDIDATE_SOURCE",
      );
    }
  }
  for (const assertion of study.assertions) {
    reference("questions", assertion.questionId);
    reference("assertions", assertion.supersedesAssertionId, true);
    for (const id of [
      ...assertion.supportingPassageIds,
      ...assertion.challengingPassageIds,
    ])
      reference("passages", id);
    ensure(
      !assertion.supportingPassageIds.some((id) =>
        assertion.challengingPassageIds.includes(id),
      ),
      "CONTRADICTORY_EVIDENCE_ROLE",
    );
    if (assertion.reviewState === "accepted") {
      ensure(assertion.supportingPassageIds.length > 0, "ASSERTION_SUPPORT");
      ensure(
        [
          ...assertion.supportingPassageIds,
          ...assertion.challengingPassageIds,
        ].every(
          (id) =>
            maps.passages.get(id).bindingStatus === "verified" &&
            maps.passages.get(id).citation.uses.localDisplay !==
              "metadata_link",
        ),
        "STALE_EVIDENCE_REVIEW",
      );
    }
  }
  for (const review of study.reviews) {
    const target = all.get(review.targetId);
    ensure(
      target &&
        !["actors", "reviews"].includes(target.collection) &&
        reference("actors", review.actorId).kind === "analyst",
      "REVIEW_TARGET",
    );
    ensure(
      Date.parse(review.createdAt) >= Date.parse(target.record.createdAt),
      "REVIEW_TIME",
    );
    ensure(review.provenance === "analyst_authored", "REVIEW_PROVENANCE");
  }
  for (const { collection, record } of all.values()) {
    if (
      ["actors", "reviews"].includes(collection) ||
      record.reviewState === "unreviewed"
    )
      continue;
    const reviews = study.reviews
      .filter((review) => review.targetId === record.id)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    const latest = reviews.at(-1);
    ensure(
      latest &&
        latest.decision === record.reviewState &&
        Date.parse(latest.createdAt) >=
          Date.parse(recordChangedAt(study, record.id, record.createdAt)) &&
        recordCreationRevision(study, latest.id) >=
          recordChangeRevision(study, record.id),
      "REVIEW_REQUIRED",
    );
    ensure(
      !reviews.some(
        (review) =>
          Date.parse(review.createdAt) === Date.parse(latest.createdAt) &&
          review.decision !== latest.decision,
      ),
      "REVIEW_AMBIGUITY",
    );
  }
  for (const gap of study.gaps) {
    reference("questions", gap.questionId);
    const discovery = reference("discoveries", gap.followUpDiscoveryId, true);
    if (discovery)
      ensure(
        discovery.questionId === gap.questionId &&
          discovery.followUpGapId === gap.id,
        "FOLLOW_UP_LINK",
      );
  }
  for (const proceeding of study.proceedings) {
    reference("proceedings", proceeding.parentProceedingId, true);
    ensure(proceeding.versionIds.length > 0, "PROCEEDING_DOCUMENTS");
    proceeding.versionIds.forEach((id) => version(id, proceeding));
    unique(proceeding.docketIds);
    unique(proceeding.rins);
    statement(proceeding);
    for (const identifier of [...proceeding.docketIds, ...proceeding.rins])
      ensure(
        tokenOccurs(proceeding.sourceStatement, identifier),
        "PROCEEDING_IDENTIFIER_REPLAY",
      );
    ensure(
      proceeding.passageIds.every((id) =>
        proceeding.versionIds.includes(
          maps.passages.get(id).citation.versionId,
        ),
      ),
      "PROCEEDING_EVIDENCE",
    );
  }
  for (const action of study.actions) {
    const proceeding = reference("proceedings", action.proceedingId);
    version(action.versionId, action);
    ensure(proceeding.versionIds.includes(action.versionId), "ACTION_DOCUMENT");
    const previous = reference("actions", action.previousActionId, true);
    if (previous)
      ensure(
        previous.proceedingId === action.proceedingId,
        "ACTION_PROCEEDING",
      );
    statement(action);
    sourceDate(action);
    if (previous)
      ensure(
        chronologicallyCompatible(previous.date, action.date),
        "ACTION_CHRONOLOGY",
      );
    ensure(
      action.passageIds.every(
        (id) => maps.passages.get(id).citation.versionId === action.versionId,
      ),
      "ACTION_EVIDENCE",
    );
  }
  const replacements = new Set();
  for (const deadline of study.deadlines) {
    const action = reference("actions", deadline.actionId);
    const prior = reference("deadlines", deadline.replacesDeadlineId, true);
    if (prior) {
      ensure(
        prior.type === deadline.type &&
          reference("actions", prior.actionId).proceedingId ===
            action.proceedingId,
        "DEADLINE_CONTEXT",
      );
      ensure(!replacements.has(prior.id), "DEADLINE_BRANCH");
      replacements.add(prior.id);
    }
    statement(deadline);
    sourceDate(deadline);
    if (prior && action.type === "comment_deadline_extension")
      ensure(
        chronologicallyCompatible(prior.date, deadline.date),
        "DEADLINE_EXTENSION_CHRONOLOGY",
      );
    for (const value of [deadline.timeZone, deadline.qualifications])
      if (value)
        ensure(
          tokenOccurs(deadline.sourceStatement, value),
          "DEADLINE_QUALIFICATION_REPLAY",
        );
    ensure(
      deadline.passageIds.every(
        (id) => maps.passages.get(id).citation.versionId === action.versionId,
      ),
      "DEADLINE_EVIDENCE",
    );
  }
  for (const event of study.consultations) {
    reference("proceedings", event.proceedingId, true);
    event.relatedEventIds.forEach((id) => {
      reference("consultations", id);
      ensure(id !== event.id, "CONSULTATION_SELF_LINK");
    });
    reference("consultations", event.respondsToEventId, true);
    if (event.respondsToEventId !== null)
      ensure(
        ["response", "outcome"].includes(event.type),
        "CONSULTATION_RESPONSE",
      );
    statement(event);
    sourceDate(event);
    unique(
      event.participants.map(
        (participant) => participant.actorId + ":" + participant.role,
      ),
      "PARTICIPANT_DUPLICATE",
    );
    for (const participant of event.participants) {
      const actor = reference("actors", participant.actorId);
      ensure(
        ROLES[event.type].includes(participant.role),
        "PARTICIPATION_EVENT",
      );
      ensure(
        participant.sourceName === actor.label &&
          tokenOccurs(participant.sourceStatement, participant.sourceName),
        "PARTICIPANT_NAME",
      );
      ensure(
        participant.scope !== "tribal_nation" || actor.kind === "tribal_nation",
        "NATION_ATTRIBUTION",
      );
      ensure(
        participant.scope !== "intertribal" || actor.kind === "organization",
        "INTERTRIBAL_ATTRIBUTION",
      );
      ensure(
        participant.scope !== "agency" || actor.kind === "agency",
        "AGENCY_ATTRIBUTION",
      );
      ensure(
        participant.scope === "tribal_nation" || actor.kind !== "tribal_nation",
        "NATION_SCOPE",
      );
      unique(participant.passageIds);
      statement(event, participant.sourceStatement, participant.passageIds);
      if (
        event.reviewState === "accepted" &&
        participant.scope === "tribal_nation"
      ) {
        ensure(
          participant.passageIds.every(
            (id) => maps.passages.get(id).reviewState === "accepted",
          ),
          "NATION_EVIDENCE_REVIEW",
        );
      }
    }
  }
  for (const evidence of study.environmentalEvidence) {
    version(evidence.versionId, evidence);
    statement(evidence);
    ensure(
      evidence.passageIds.every(
        (id) => maps.passages.get(id).citation.versionId === evidence.versionId,
      ),
      "ENVIRONMENTAL_VERSION",
    );
    for (const value of [
      evidence.alternativeId,
      evidence.baselineYear === null ? null : String(evidence.baselineYear),
      evidence.metric,
      evidence.value,
      evidence.unit,
      evidence.spatialScale,
      evidence.uncertainty,
      ...evidence.qualifications,
    ]) {
      if (value !== null)
        ensure(
          tokenOccurs(evidence.sourceStatement, value),
          "ENVIRONMENTAL_VALUE_REPLAY",
        );
    }
  }
  function subjectLabels(subject, relation) {
    if (subject.kind === "actor")
      return [reference("actors", subject.id).label];
    if (subject.kind === "proceeding") {
      const proceeding = reference("proceedings", subject.id);
      return [proceeding.title, ...proceeding.docketIds, ...proceeding.rins];
    }
    const item = version(subject.id, relation);
    if (item.unresolved) return null;
    const work = index.works.get(item.workId);
    return [
      item.saved?.sourceTitle ?? work.title,
      item.saved?.sourceIdentifier ?? work.sourceIdentifier,
      item.sourceVersionIdentifier,
    ];
  }
  for (const relation of study.authorityRelationships) {
    const subject = subjectLabels(relation.subject, relation);
    const object = subjectLabels(relation.object, relation);
    ensure(
      (subject === null || subject.includes(relation.subjectLabel)) &&
        (object === null || object.includes(relation.objectLabel)),
      "AUTHORITY_SUBJECT",
    );
    ensure(
      tokenOccurs(relation.sourceStatement, relation.subjectLabel) &&
        tokenOccurs(relation.sourceStatement, relation.objectLabel),
      "AUTHORITY_LABEL_REPLAY",
    );
    statement(relation);
    if (relation.reviewState === "accepted")
      ensure(
        relation.passageIds.every(
          (id) => maps.passages.get(id).reviewState === "accepted",
        ),
        "AUTHORITY_EVIDENCE_REVIEW",
      );
    ensure(
      relation.provenance === "extracted_evidence",
      "AUTHORITY_PROVENANCE",
    );
  }
  for (const group of study.originGroups) {
    ensure(group.versionIds.length >= 2, "ORIGIN_GROUP_SIZE");
    const versions = group.versionIds.map((id) => version(id, group));
    ensure(
      group.originVersionId === null ||
        group.versionIds.includes(group.originVersionId),
      "ORIGIN_REFERENCE",
    );
    if (
      group.basis === "same_document" &&
      !versions.some((item) => item.unresolved)
    )
      ensure(
        new Set(versions.map((item) => item.workId)).size === 1,
        "ORIGIN_IDENTITY",
      );
    statement(group);
  }
  cycles(study.questions, "parentQuestionId", "QUESTION_CYCLE");
  cycles(study.proceedings, "parentProceedingId", "PROCEEDING_CYCLE");
  cycles(study.actions, "previousActionId", "ACTION_CYCLE");
  cycles(study.deadlines, "replacesDeadlineId", "DEADLINE_CYCLE");
  cycles(study.assertions, "supersedesAssertionId", "ASSERTION_CYCLE");
  cycles(study.consultations, "respondsToEventId", "CONSULTATION_CYCLE");
}
function remember(study) {
  freeze(study);
  knownStudies.add(study);
  return study;
}
async function acceptedStudy(study, corpus) {
  const index = await corpusIndex(corpus);
  const copy = knownStudies.has(study) ? study : await checkEnvelope(study);
  await semantics(copy, index);
  return { study: copy, index };
}
async function finish(study, index) {
  study.contentDigest = await bodyDigest(study);
  shape(study, schema);
  ensure(
    encoder.encode(canonical(study)).byteLength <= MAX_RESEARCH_STUDY_BYTES,
    "STUDY_BYTE_LIMIT",
  );
  await semantics(study, index);
  return remember(study);
}
export async function createResearchStudy(input, corpus) {
  const value = snapshot(input);
  ensure(
    Object.keys(value).every((key) =>
      ["id", "title", "createdAt", "actor", "sensitivity"].includes(key),
    ),
    "CREATE_FIELDS",
  );
  shape(value.actor, schema.$defs.actor, "actor");
  const index = await corpusIndex(corpus);
  const study = {
    $schema: RESEARCH_STUDY_SCHEMA_ID,
    schemaVersion: RESEARCH_STUDY_SCHEMA_VERSION,
    kind: "research_study",
    id: value.id,
    title: value.title,
    sensitivity: value.sensitivity ?? "restricted",
    trustDomain: index.corpus.trustDomain,
    corpusId: index.corpus.id,
    corpusDigest: index.corpus.contentDigest,
    createdAt: value.createdAt,
    updatedAt: value.createdAt,
    updatedBy: value.actor.id,
    revision: 1,
    previousDigest: null,
    revisions: [],
    ...Object.fromEntries(Object.keys(CATALOGS).map((key) => [key, []])),
  };
  study.actors.push(value.actor);
  return finish(study, index);
}
export async function captureStudyPassage(input, corpus) {
  const value = snapshot(input);
  ensure(
    Object.keys(value).every((key) =>
      ["id", "segmentId", "actorId", "createdAt", "sensitivity"].includes(key),
    ),
    "CAPTURE_FIELDS",
  );
  const index = await corpusIndex(corpus);
  const { citation } = await citationFor(index, value.segmentId);
  const result = freeze({
    id: value.id,
    actorId: value.actorId,
    createdAt: value.createdAt,
    provenance: "source_content",
    reviewState: "unreviewed",
    sensitivity: value.sensitivity ?? "restricted",
    citation,
    bindingStatus: "verified",
    bindingIssue: null,
  });
  shape(result, schema.$defs.passage, "passage");
  ensure(
    Date.parse(result.createdAt) >= Date.parse(citation.retrievedAt),
    "CAPTURE_TIME",
  );
  capturedPassages.add(result);
  return result;
}
function metadataOnlyChange(previous, next) {
  const strip = ({ reviewState, sensitivity, ...value }) => {
    void reviewState;
    void sensitivity;
    return value;
  };
  return canonical(strip(previous)) === canonical(strip(next));
}
async function revision(
  study,
  index,
  updatedAt,
  actorId,
  changes,
  binding = null,
) {
  ensure(
    validTime(updatedAt) &&
      Date.parse(updatedAt) >= Date.parse(study.updatedAt),
    "REVISION_TIME",
  );
  ensure(
    study.actors.some(
      (actor) =>
        actor.id === actorId && ["analyst", "rule"].includes(actor.kind),
    ),
    "REVISION_ACTOR",
  );
  const next = {
    ...study,
    updatedAt,
    updatedBy: actorId,
    revision: study.revision + 1,
    previousDigest: study.contentDigest,
  };
  for (const collection of Object.keys(CATALOGS))
    next[collection] = [...study[collection]];
  unique(
    changes.map((change) => change.collection + ":" + change.record.id),
    "CHANGE_DUPLICATE",
  );
  const before = [];
  for (const change of changes) {
    ensure(Object.hasOwn(CATALOGS, change.collection), "CHANGE_COLLECTION");
    shape(
      change.record,
      schema.$defs[CATALOGS[change.collection]],
      change.collection,
    );
    const items = next[change.collection];
    const position = items.findIndex((item) => item.id === change.record.id);
    const previous = position === -1 ? null : items[position];
    before.push({
      collection: change.collection,
      id: change.record.id,
      record: previous,
    });
    if (position === -1) items.push(change.record);
    else items[position] = change.record;
  }
  next.revisions = [
    ...study.revisions,
    {
      revision: study.revision,
      updatedAt: study.updatedAt,
      updatedBy: study.updatedBy,
      corpusId: study.corpusId,
      corpusDigest: study.corpusDigest,
      previousDigest: study.previousDigest,
      contentDigest: study.contentDigest,
      changes: before,
    },
  ];
  if (binding) Object.assign(next, binding);
  return finish(next, index);
}
export async function reviseResearchStudy(study, change, corpus) {
  const value = snapshot(change);
  ensure(
    Object.keys(value).every((key) =>
      ["updatedAt", "actorId", "records"].includes(key),
    ) &&
      Array.isArray(value.records) &&
      value.records.length > 0,
    "CHANGE_FIELDS",
  );
  const captureProof = new Set(
    change.records
      .filter(
        (item) =>
          item.collection === "passages" && capturedPassages.has(item.record),
      )
      .map((item) => item.record.id),
  );
  const accepted = await acceptedStudy(study, corpus);
  for (const item of value.records) {
    ensure(
      Object.keys(item).length === 2 &&
        Object.hasOwn(item, "collection") &&
        Object.hasOwn(item, "record") &&
        Object.hasOwn(CATALOGS, item.collection),
      "CHANGE_FIELDS",
    );
    const previous = accepted.study[item.collection].find(
      (record) => record.id === item.record.id,
    );
    if (item.collection === "passages" && !previous)
      ensure(captureProof.has(item.record.id), "CAPTURE_API_REQUIRED");
    if (previous && IMMUTABLE.has(item.collection)) {
      ensure(
        item.collection === "reviews"
          ? canonical(previous) === canonical(item.record)
          : metadataOnlyChange(previous, item.record),
        "IMMUTABLE_EVIDENCE",
      );
    }
    if (previous && item.collection !== "actors")
      ensure(
        item.record.createdAt === previous.createdAt &&
          item.record.actorId === previous.actorId &&
          item.record.provenance === previous.provenance,
        "AUTHORSHIP_IMMUTABLE",
      );
  }
  return revision(
    accepted.study,
    accepted.index,
    value.updatedAt,
    value.actorId,
    value.records,
  );
}
export async function parseResearchStudy(text, corpus) {
  ensure(
    typeof text === "string" &&
      encoder.encode(text).byteLength <= MAX_RESEARCH_STUDY_BYTES,
    "STUDY_BYTE_LIMIT",
  );
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ResearchStudyError("STUDY_JSON");
  }
  const { study } = await acceptedStudy(value, corpus);
  return remember(study);
}
export async function serializeResearchStudy(study, corpus) {
  const accepted = await acceptedStudy(study, corpus);
  return canonical(accepted.study) + "\n";
}
export async function rebindResearchStudy(study, corpus, change) {
  const old = knownStudies.has(study) ? study : await checkEnvelope(study);
  const value = snapshot(change);
  ensure(
    Object.keys(value).every((key) => ["updatedAt", "actorId"].includes(key)),
    "CHANGE_FIELDS",
  );
  const index = await corpusIndex(corpus);
  ensure(old.trustDomain === index.corpus.trustDomain, "TRUST_DOMAIN_REBIND");
  if (
    old.corpusId === index.corpus.id &&
    old.corpusDigest === index.corpus.contentDigest
  ) {
    await semantics(old, index);
    return remember(old);
  }
  const changes = [];
  for (const passage of old.passages)
    changes.push({
      collection: "passages",
      record: {
        ...passage,
        reviewState: "unreviewed",
        bindingStatus: "review_required",
        bindingIssue: index.segments.has(passage.citation.segmentId)
          ? "corpus_changed"
          : "source_segment_missing",
      },
    });
  for (const collection of Object.keys(CATALOGS)) {
    if (["actors", "passages", "reviews"].includes(collection)) continue;
    for (const record of old[collection]) {
      if (
        collection === "candidates" &&
        record.versionId !== null &&
        !index.versions.has(record.versionId)
      ) {
        const explanation =
          "Review required: saved version " +
          record.versionId +
          " is absent after corpus rebind. ";
        changes.push({
          collection,
          record: {
            ...record,
            versionId: null,
            reviewState: "unreviewed",
            reason:
              explanation + record.reason.slice(0, 65536 - explanation.length),
          },
        });
      } else if (record.reviewState !== "unreviewed")
        changes.push({
          collection,
          record: { ...record, reviewState: "unreviewed" },
        });
    }
  }
  return revision(old, index, value.updatedAt, value.actorId, changes, {
    corpusId: index.corpus.id,
    corpusDigest: index.corpus.contentDigest,
  });
}
export async function readResearchStudyRevision(study, revisionNumber) {
  let result = knownStudies.has(study) ? study : await checkEnvelope(study);
  ensure(
    Number.isSafeInteger(revisionNumber) &&
      revisionNumber >= 1 &&
      revisionNumber <= result.revision,
    "REVISION_NUMBER",
  );
  while (result.revision > revisionNumber)
    result = rollback(result, result.revisions.at(-1));
  ensure((await bodyDigest(result)) === result.contentDigest, "STUDY_DIGEST");
  // Historical envelopes can refer to a prior corpus. They become trusted current
  // studies only after parse/revise/serialize validates the corresponding corpus.
  return freeze(result);
}
export async function studyReadPassage(passage, corpus, options = {}) {
  const copy = snapshot(passage);
  shape(copy, schema.$defs.passage, "passage");
  const purpose = options.purpose ?? "display";
  ensure(["display", "export"].includes(purpose), "READ_PURPOSE");
  if (copy.bindingStatus !== "verified")
    return freeze({ text: null, reason: "review_required" });
  const index = await corpusIndex(corpus);
  if (
    copy.citation.corpusId !== index.corpus.id ||
    copy.citation.corpusDigest !== index.corpus.contentDigest
  ) {
    return freeze({ text: null, reason: "review_required" });
  }
  const text = await passageText(copy, index);
  const policy =
    purpose === "export"
      ? copy.citation.uses.localExport
      : copy.citation.uses.localDisplay;
  if (
    ["metadata_link", "prohibited"].includes(policy) ||
    (policy === "excerpt" && !copy.citation.uses.excerpts)
  ) {
    return freeze({
      text: null,
      reason:
        purpose === "export" ? "source_export_policy" : "source_display_policy",
    });
  }
  if (policy === "excerpt" && text.length > 1200)
    return freeze({ text: null, reason: "excerpt_selection_required" });
  return freeze({ text, reason: null });
}
/** Sync projections accept only a completed core validation and its exact corpus object. */
export function assertValidatedResearchStudy(study, corpus) {
  ensure(knownStudies.has(study), "VALIDATED_STUDY_REQUIRED");
  const binding = validatedCorpusBindings.get(corpus);
  ensure(binding, "VALIDATED_CORPUS_REQUIRED");
  const id = Object.getOwnPropertyDescriptor(corpus, "id");
  const contentDigest = Object.getOwnPropertyDescriptor(
    corpus,
    "contentDigest",
  );
  ensure(
    id &&
      "value" in id &&
      contentDigest &&
      "value" in contentDigest &&
      id.value === binding.id &&
      contentDigest.value === binding.contentDigest &&
      study.corpusId === binding.id &&
      study.corpusDigest === binding.contentDigest,
    "CORPUS_BINDING",
  );
}
export function studyActiveDeadlines(study, proceedingId) {
  ensure(knownStudies.has(study), "VALIDATED_STUDY_REQUIRED");
  const actions = new Map(
    study.actions
      .filter((action) => action.proceedingId === proceedingId)
      .map((action) => [action.id, action]),
  );
  const entries = study.deadlines.filter(
    (deadline) =>
      actions.has(deadline.actionId) && deadline.reviewState !== "rejected",
  );
  const accepted = (deadline) =>
    deadline.reviewState === "accepted" &&
    actions.get(deadline.actionId).reviewState === "accepted";
  const replaced = new Set(
    entries.filter(accepted).map((deadline) => deadline.replacesDeadlineId),
  );
  const active = entries.filter((deadline) => !replaced.has(deadline.id));
  return freeze(
    ["comment", "consultation", "other"].flatMap((type) => {
      const candidates = active.filter((deadline) => deadline.type === type);
      if (candidates.length === 0) return [];
      const pendingReplacement = candidates.some(
        (deadline) =>
          deadline.replacesDeadlineId !== null && !accepted(deadline),
      );
      const unreviewedAction = candidates.some(
        (deadline) => actions.get(deadline.actionId).reviewState !== "accepted",
      );
      return [
        {
          type,
          state:
            pendingReplacement || unreviewedAction
              ? "review_required"
              : candidates.length > 1
                ? "ambiguous"
                : accepted(candidates[0])
                  ? "active"
                  : "review_required",
          candidates,
        },
      ];
    }),
  );
}
