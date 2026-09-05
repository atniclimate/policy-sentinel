import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { types } from "node:util";
import {
  canonicalV2Digest,
  createAnalyzedCorpusV2,
  createEvidenceSegment,
  parseAnalyzedCorpusV2,
} from "./analyzed-corpus-v2.mjs";
import { extractPolicyText } from "./policy-text.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const unknownDate = () => ({ value: null, precision: "unknown" });
const assert = (condition, code) => {
  if (!condition) {
    const error = new TypeError(`Policy corpus builder rejected: ${code}`);
    error.code = code;
    throw error;
  }
};
function snapshotBuilderInput(input) {
  const active = new Set();
  let nodes = 0;
  const typedPrototype = Object.getPrototypeOf(Uint8Array.prototype);
  const byteLength = Object.getOwnPropertyDescriptor(
    typedPrototype,
    "byteLength",
  ).get;
  const buffer = Object.getOwnPropertyDescriptor(typedPrototype, "buffer").get;
  const copy = (value, depth = 0) => {
    assert(++nodes <= 500000 && depth <= 128, "BUILDER_INPUT_LIMIT");
    if (
      value === null ||
      ["string", "number", "boolean"].includes(typeof value)
    )
      return value;
    assert(
      value &&
        typeof value === "object" &&
        !types.isProxy(value) &&
        !active.has(value),
      "PLAIN_BUILDER_INPUT_REQUIRED",
    );
    if (types.isUint8Array(value)) {
      assert(
        !types.isSharedArrayBuffer(buffer.call(value)) &&
          byteLength.call(value) <= 64 * 1024 * 1024,
        "SOURCE_BYTES_REQUIRED",
      );
      const bytes = new Uint8Array(byteLength.call(value));
      typedPrototype.set.call(bytes, value);
      return bytes;
    }
    assert(
      Array.isArray(value) ||
        [Object.prototype, null].includes(Object.getPrototypeOf(value)),
      "PLAIN_BUILDER_INPUT_REQUIRED",
    );
    active.add(value);
    const result = Array.isArray(value) ? [] : {};
    for (const key of Reflect.ownKeys(value)) {
      if (Array.isArray(value) && key === "length") continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      assert(
        typeof key === "string" &&
          descriptor.enumerable &&
          Object.hasOwn(descriptor, "value") &&
          key !== "__proto__",
        "PLAIN_BUILDER_INPUT_REQUIRED",
      );
      result[key] = copy(descriptor.value, depth + 1);
    }
    active.delete(value);
    return result;
  };
  return copy(input);
}
function json(value) {
  // Use the v2 descriptor-aware JSON guard before detaching any untrusted descriptor.
  canonicalV2Digest(value);
  return JSON.parse(JSON.stringify(value));
}
function closed(value, required, optional = []) {
  assert(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      required.every((key) => Object.hasOwn(value, key)) &&
      Object.keys(value).every((key) =>
        [...required, ...optional].includes(key),
      ),
    "CLOSED_BUILDER_SHAPE",
  );
}
function utc(value) {
  assert(
    typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value),
    "INVALID_REVIEW_TIME",
  );
  const time = Date.parse(value);
  assert(
    Number.isFinite(time) &&
      new Date(time).toISOString().replace(".000Z", "Z") ===
        value.replace(".000Z", "Z"),
    "INVALID_REVIEW_TIME",
  );
  return time;
}
/** Stable IDs bind an operation occurrence to its approved source profile. */
export function policyCaptureId(sourceProfileId, operationId) {
  return `capture-${canonicalV2Digest({ sourceProfileId, operationId })}`;
}
/** Body sorts before index metadata for the retained deterministic comparison consumer. */
export function policyRenditionId(versionId, captureId, extraction) {
  return `rendition-${extraction.sourceKind === "washington_index" ? "index" : "body"}-${canonicalV2Digest({ versionId, captureId, parser: extraction.parser, outputDigest: extraction.renditionDigest })}`;
}
/** Calendar normalization only; this function makes no publication/effectiveness claim. */
export function normalizePolicyDateSource(sourceValue, { yearContext } = {}) {
  assert(typeof sourceValue === "string", "UNSUPPORTED_SOURCE_DATE");
  let value = sourceValue;
  if (yearContext !== undefined) {
    const numeric = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value);
    assert(
      numeric &&
        /^\d{4}$/.test(yearContext) &&
        yearContext.slice(-2) === numeric[3],
      "AMBIGUOUS_SOURCE_DATE_YEAR",
    );
    value = `${yearContext}-${numeric[1]}-${numeric[2]}`;
  }
  let precision;
  if (/^\d{4}(?:-\d{2}){0,2}$/.test(value))
    precision = ["year", "month", "day"][value.split("-").length - 1];
  else {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const match =
      /^(January|February|March|April|May|June|July|August|September|October|November|December) (?:(\d{1,2}),? )?(\d{4})$/.exec(
        value,
      );
    assert(match, "UNSUPPORTED_SOURCE_DATE");
    value = `${match[3]}-${String(months.indexOf(match[1]) + 1).padStart(2, "0")}${match[2] ? `-${match[2].padStart(2, "0")}` : ""}`;
    precision = match[2] ? "day" : "month";
  }
  const complete = `${value}${precision === "year" ? "-01-01" : precision === "month" ? "-01" : ""}T00:00:00Z`;
  assert(
    Number.isFinite(Date.parse(complete)) &&
      new Date(complete).toISOString().startsWith(complete.slice(0, 10)),
    "INVALID_SOURCE_DATE",
  );
  return Object.freeze({ value, precision });
}
function extractionFrom(captureInput) {
  const receipt = json(captureInput.receipt);
  const extraction = json(captureInput.extraction);
  assert(
    receipt.state === "complete" &&
      receipt.status === 200 &&
      receipt.errorCode === null,
    "REVIEWED_COMPLETE_CAPTURE_REQUIRED",
  );
  assert(
    extraction.state === "extracted_pending_review" &&
      extraction.version === "1.0.0",
    "RETAINED_EXTRACTION_REQUIRED",
  );
  assert(
    extraction.captureOperationId === receipt.operationId &&
      extraction.objectDigest === receipt.objectDigest,
    "EXTRACTION_CAPTURE_MISMATCH",
  );
  assert(
    captureInput.sourceBytes instanceof Uint8Array &&
      !types.isProxy(captureInput.sourceBytes) &&
      !types.isSharedArrayBuffer(captureInput.sourceBytes.buffer),
    "SOURCE_BYTES_REQUIRED",
  );
  const bytes = Buffer.from(captureInput.sourceBytes);
  assert(
    bytes.length === receipt.decodedBytes &&
      hash(bytes) === receipt.objectDigest,
    "SOURCE_OBJECT_DIGEST_MISMATCH",
  );
  const replayed = extractPolicyText({
    bytes,
    mediaType: receipt.mediaType,
    sourceKind: extraction.sourceKind,
    url: receipt.url,
    expectedIdentity: receipt.expectedIdentity,
    excludedBlockLocators: extraction.excludedBlockLocators ?? [],
  });
  const retained = Object.fromEntries(
    Object.keys(replayed).map((key) => [key, extraction[key]]),
  );
  assert(
    canonicalV2Digest(retained) === canonicalV2Digest(replayed) &&
      hash(Buffer.from(replayed.text)) === extraction.renditionDigest,
    "EXTRACTION_REPLAY_MISMATCH",
  );
  return { receipt, extraction };
}
function selection(evidence, captures) {
  closed(
    evidence,
    ["operationId", "mode", "ruleId"],
    [
      "blockLocators",
      "metadata",
      "sourceLocator",
      "sourceValue",
      "dateYearContext",
    ],
  );
  const captured = captures.get(evidence.operationId);
  assert(captured, "UNKNOWN_EVIDENCE_OPERATION");
  assert(
    (Array.isArray(evidence.blockLocators) && !evidence.metadata) ||
      (evidence.metadata && evidence.blockLocators === undefined),
    "EVIDENCE_SELECTOR_REQUIRED",
  );
  let blocks;
  if (evidence.metadata) {
    closed(evidence.metadata, ["field", "sourceLocator"]);
    const matches = captured.extraction.sourceMetadataCandidates.filter(
      (candidate) =>
        candidate.field === evidence.metadata.field &&
        candidate.sourceLocator === evidence.metadata.sourceLocator,
    );
    assert(matches.length === 1, "AMBIGUOUS_METADATA_EVIDENCE");
    blocks = captured.blockEvidence.filter((entry) =>
      entry.block.text.includes(matches[0].value),
    );
    assert(blocks.length > 0, "METADATA_NOT_IN_RENDITION");
  } else {
    assert(
      evidence.blockLocators.length > 0 &&
        new Set(evidence.blockLocators).size === evidence.blockLocators.length,
      "EVIDENCE_SELECTOR_REQUIRED",
    );
    blocks = evidence.blockLocators.map((locator) => {
      const matches = captured.blockEvidence.filter(
        (entry) => entry.block.locator.value === locator,
      );
      assert(matches.length === 1, "UNKNOWN_OR_AMBIGUOUS_BLOCK_LOCATOR");
      return matches[0];
    });
  }
  assert(
    ["source_attested", "deterministic"].includes(evidence.mode),
    "INVALID_EVIDENCE_MODE",
  );
  if (evidence.mode === "deterministic")
    assert(
      typeof evidence.ruleId === "string" &&
        typeof evidence.sourceValue === "string" &&
        evidence.sourceValue.length > 0 &&
        blocks.some((entry) => entry.block.text.includes(evidence.sourceValue)),
      "EXACT_DERIVATION_SOURCE_REQUIRED",
    );
  else assert(evidence.ruleId === null, "UNDECLARED_DERIVATION");
  return { captured, blocks };
}
function fieldEvidence(descriptor, captures, expectedFields, values) {
  assert(
    descriptor &&
      Object.keys(descriptor).length === expectedFields.length &&
      expectedFields.every((field) => Object.hasOwn(descriptor, field)),
    "FIELD_EVIDENCE_REQUIRED",
  );
  return expectedFields.map((field) => {
    const evidence = descriptor[field];
    if (field === "/sourceStatusLabel" || field === "/sourceLabel")
      assert(
        evidence.mode === "source_attested",
        "SOURCE_LABEL_MUST_REMAIN_ATTESTED",
      );
    const { captured, blocks } = selection(evidence, captures);
    if (field.endsWith("/value")) {
      assert(
        captured.extraction.sourceKind !== "washington_index",
        "INDEX_PROVIDER_DATE_NOT_AUTHORITY",
      );
      if (evidence.mode === "deterministic") {
        if (evidence.dateYearContext !== undefined) {
          assert(
            captured.extraction.sourceKind === "washington_bill" &&
              evidence.ruleId === "washington-chapter-mmddyy-v1" &&
              /^\d{4}$/.test(evidence.dateYearContext) &&
              blocks.some((entry) =>
                new RegExp(
                  `Chapter \\d+, Laws of ${evidence.dateYearContext}\\b`,
                  "i",
                ).test(entry.block.text),
              ),
            "SOURCE_DATE_YEAR_CONTEXT_REQUIRED",
          );
        }
        const normalized = normalizePolicyDateSource(evidence.sourceValue, {
          yearContext: evidence.dateYearContext,
        });
        assert(
          normalized.value === values[field].value &&
            normalized.precision === values[field].precision,
          "DATE_DERIVATION_MISMATCH",
        );
      }
    }
    return {
      field,
      mode: evidence.mode,
      captureId: captured.capture.id,
      sourceLocator:
        evidence.sourceLocator ??
        evidence.metadata?.sourceLocator ??
        evidence.blockLocators.join(";"),
      segmentIds: blocks.map((entry) => entry.segment.id).sort(),
      ruleId: evidence.ruleId,
    };
  });
}
function review(item, generatedAt) {
  closed(item.review, ["reviewer", "reviewedAt"]);
  assert(
    typeof item.review.reviewer === "string" &&
      item.review.reviewer.trim().length > 0 &&
      utc(item.review.reviewedAt) <= generatedAt,
    "ITEM_REVIEW_REQUIRED",
  );
}
function insertUnique(map, record, code) {
  const previous = map.get(record.id);
  assert(
    !previous || canonicalV2Digest(previous) === canonicalV2Digest(record),
    code,
  );
  map.set(record.id, record);
}

/** Pure, explicit reviewed-version assembly. Caller owns filesystem, receipt recovery and curation. */
export function createPolicyCorpus(input) {
  input = snapshotBuilderInput(input);
  // Bytes remain outside the JSON descriptor guard; all other input is detached first.
  closed(
    input,
    ["id", "runId", "trustDomain", "generatedAt", "sourceProfiles", "items"],
    ["coverage", "relationships", "analyses", "findings"],
  );
  assert(
    Array.isArray(input.items) &&
      input.items.length > 0 &&
      input.items.length <= 1000,
    "REVIEWED_ITEMS_REQUIRED",
  );
  const detached = json({
    ...input,
    items: input.items.map((item) => ({
      ...item,
      captures: item.captures.map((capture) => ({
        receipt: capture.receipt,
        extraction: capture.extraction,
      })),
    })),
  });
  const generatedAt = utc(detached.generatedAt);
  const profiles = new Map(
    detached.sourceProfiles.map((profile) => [profile.id, profile]),
  );
  assert(
    profiles.size === detached.sourceProfiles.length,
    "DUPLICATE_SOURCE_PROFILE",
  );
  const rawItems = new Map(input.items.map((item) => [item.version.id, item]));
  assert(rawItems.size === input.items.length, "DUPLICATE_VERSION_ID");
  const captures = new Map();
  const works = new Map();
  const workCaptures = new Map();
  const workDescriptors = new Map();
  const versions = [];
  const renditions = [];
  const segments = [];
  const events = [];
  const frWorks = new Map();
  for (const item of detached.items.sort((a, b) =>
    a.version.id < b.version.id ? -1 : a.version.id > b.version.id ? 1 : 0,
  )) {
    closed(item, ["work", "version", "captures", "review"], ["events"]);
    closed(item.work, [
      "id",
      "sourceProfileId",
      "sourceIdentifier",
      "title",
      "instrumentClass",
      "governmentContext",
      "issuerRoles",
      "fieldEvidence",
    ]);
    closed(item.version, [
      "id",
      "sourceVersionIdentifier",
      "sourceStatusLabel",
      "dates",
      "fieldEvidence",
    ]);
    review(item, generatedAt);
    const profile = profiles.get(item.work.sourceProfileId);
    assert(profile, "UNKNOWN_SOURCE_PROFILE");
    const itemCaptures = new Map();
    for (const raw of rawItems.get(item.version.id).captures) {
      closed(raw, ["receipt", "extraction", "sourceBytes"]);
      const { receipt, extraction } = extractionFrom(raw);
      assert(receipt.profileId === profile.id, "CAPTURE_PROFILE_MISMATCH");
      assert(
        utc(receipt.completedAt) <= utc(item.review.reviewedAt) &&
          utc(receipt.startedAt) <= utc(receipt.completedAt),
        "REVIEW_PRECEDES_CAPTURE",
      );
      assert(!itemCaptures.has(receipt.operationId), "DUPLICATE_ITEM_CAPTURE");
      const { contentDigest: profileDigest, ...profileBody } = profile;
      const capture = {
        id: policyCaptureId(profile.id, receipt.operationId),
        sourceProfileId: profile.id,
        sourceProfileDigest: profileDigest ?? canonicalV2Digest(profileBody),
        operationId: receipt.operationId,
        requestedUrl: receipt.url,
        finalUrl: receipt.finalUrl,
        retrievedAt: receipt.completedAt,
        mediaType: receipt.mediaType,
        encodedBytes: receipt.encodedBytes,
        decodedBytes: receipt.decodedBytes,
        objectDigest: receipt.objectDigest,
        objectPath: receipt.objectPath,
      };
      insertUnique(captures, capture, "CONFLICTING_CAPTURE_RECEIPTS");
      const renditionId = policyRenditionId(
        item.version.id,
        capture.id,
        extraction,
      );
      const rendition = {
        id: renditionId,
        versionId: item.version.id,
        captureId: capture.id,
        parser: extraction.parser,
        mediaType: "text/plain",
        outputDigest: extraction.renditionDigest,
        byteLength: Buffer.byteLength(extraction.text),
        text: extraction.text,
        authorityLabel: profile.authorityLabel,
        omittedSourceLocators: [
          ...new Set([
            ...extraction.excludedBlockLocators,
            ...extraction.exclusions
              .filter((entry) =>
                [
                  "personal_contact_section",
                  "personal_contact_block",
                  "prohibited_location_block",
                ].includes(entry.reason),
              )
              .map((entry) => entry.sourceLocator),
          ]),
        ].sort(),
        warnings: [
          ...new Set([
            ...extraction.warnings,
            ...(extraction.sourceKind === "washington_index"
              ? ["auxiliary_index_metadata_not_policy_instrument_text"]
              : []),
          ]),
        ].sort(),
      };
      renditions.push(rendition);
      const renditionBytes = Buffer.from(rendition.text);
      const blockEvidence = extraction.blocks.map((block) => {
        const segment = createEvidenceSegment({
          renditionId,
          renditionDigest: rendition.outputDigest,
          renditionBytes,
          startByte: block.startByte,
          endByte: block.endByte,
          locator: block.locator,
        });
        segments.push(segment);
        return { block, segment };
      });
      itemCaptures.set(receipt.operationId, {
        receipt,
        extraction,
        capture,
        rendition,
        blockEvidence,
      });
      if (!workCaptures.has(item.work.id))
        workCaptures.set(item.work.id, new Map());
      const sharedCaptures = workCaptures.get(item.work.id);
      // The first canonical version supplies the occurrence binding for shared
      // work evidence. Each version retains only its explicitly listed captures.
      if (!sharedCaptures.has(receipt.operationId))
        sharedCaptures.set(
          receipt.operationId,
          itemCaptures.get(receipt.operationId),
        );
      if (extraction.sourceKind === "govinfo_fr") {
        const previous = frWorks.get(item.work.id);
        assert(
          !previous || previous === receipt.expectedIdentity,
          "DISTINCT_FR_DOCUMENTS_REQUIRE_DISTINCT_WORKS",
        );
        frWorks.set(item.work.id, receipt.expectedIdentity);
      }
    }
    assert(
      [...itemCaptures.values()].some(
        (capture) => capture.extraction.sourceKind !== "washington_index",
      ),
      "POLICY_BODY_REQUIRED",
    );
    const workFields = [
      "/sourceIdentifier",
      "/title",
      "/instrumentClass",
      "/governmentContext",
      ...item.work.issuerRoles.flatMap((_, index) => [
        `/issuerRoles/${index}/role`,
        `/issuerRoles/${index}/label`,
      ]),
    ];
    const { fieldEvidence: workEvidence, ...workBody } = item.work;
    const work = {
      ...workBody,
      relevance: "general_jurisdiction",
      taxonomy: "Unclassified",
    };
    if (works.has(work.id)) {
      assert(
        canonicalV2Digest(works.get(work.id)) === canonicalV2Digest(work),
        "CONFLICTING_WORK_DESCRIPTORS",
      );
    } else {
      works.set(work.id, work);
      workDescriptors.set(work.id, {
        evidence: workEvidence,
        fields: workFields,
        reviewedAt: item.review.reviewedAt,
      });
    }
    const dateFields = Object.entries(item.version.dates)
      .filter(([, date]) => date.precision !== "unknown")
      .map(([field]) => `/dates/${field}/value`);
    const { fieldEvidence: versionEvidence, ...versionBody } = item.version;
    const observedAt = [...itemCaptures.values()]
      .map((capture) => capture.capture.retrievedAt)
      .sort((a, b) => utc(a) - utc(b))[0];
    versions.push({
      ...versionBody,
      workId: work.id,
      observedAt,
      renditionIds: [...itemCaptures.values()]
        .map((capture) => capture.rendition.id)
        .sort(),
      fieldProvenance: fieldEvidence(
        versionEvidence,
        itemCaptures,
        ["/sourceVersionIdentifier", "/sourceStatusLabel", ...dateFields],
        Object.fromEntries(
          Object.entries(item.version.dates).map(([field, value]) => [
            `/dates/${field}/value`,
            value,
          ]),
        ),
      ),
    });
    for (const event of item.events ?? []) {
      closed(event, [
        "id",
        "type",
        "date",
        "sourceStatedAt",
        "sourceLabel",
        "fieldEvidence",
        "evidence",
      ]);
      const fields = [
        "/sourceLabel",
        ...(event.date.precision === "unknown" ? [] : ["/date/value"]),
        ...(event.sourceStatedAt.precision === "unknown"
          ? []
          : ["/sourceStatedAt/value"]),
      ];
      const provenance = fieldEvidence(
        event.fieldEvidence,
        itemCaptures,
        fields,
        {
          "/date/value": event.date,
          "/sourceStatedAt/value": event.sourceStatedAt,
        },
      );
      const explicitSegments = event.evidence.flatMap((entry) =>
        selection(entry, itemCaptures).blocks.map((block) => block.segment.id),
      );
      events.push({
        id: event.id,
        workId: work.id,
        versionId: item.version.id,
        type: event.type,
        date: event.date,
        sourceStatedAt: event.sourceStatedAt,
        sourceLabel: event.sourceLabel,
        segmentIds: [
          ...new Set([
            ...explicitSegments,
            ...provenance.flatMap((entry) => entry.segmentIds),
          ]),
        ].sort(),
        fieldProvenance: provenance,
      });
    }
  }
  // Work identity may be supported by any explicitly retained capture of that
  // same work, even when its current version has a different title. Version and
  // event provenance above remains restricted to the item's own captures.
  const workRecords = [...works.values()].map((work) => {
    const descriptor = workDescriptors.get(work.id);
    const provenance = fieldEvidence(
      descriptor.evidence,
      workCaptures.get(work.id),
      descriptor.fields,
      {},
    );
    assert(
      provenance.every(
        (entry) =>
          utc(captures.get(entry.captureId).retrievedAt) <=
          utc(descriptor.reviewedAt),
      ),
      "WORK_REVIEW_PRECEDES_EVIDENCE_CAPTURE",
    );
    return {
      ...work,
      fieldProvenance: provenance,
    };
  });
  const coverage =
    detached.coverage ??
    [...profiles.values()].map((profile) => {
      const sourceWorks = [...works.values()].filter(
        (work) => work.sourceProfileId === profile.id,
      );
      const sourceCaptures = [...captures.values()]
        .filter((capture) => capture.sourceProfileId === profile.id)
        .sort((a, b) => utc(a.retrievedAt) - utc(b.retrievedAt));
      return {
        id: `coverage-${canonicalV2Digest(profile.id)}`,
        sourceProfileId: profile.id,
        status: sourceWorks.length ? "healthy" : "unavailable",
        documentCount: sourceWorks.length,
        versionCount: versions.filter((version) =>
          sourceWorks.some((work) => work.id === version.workId),
        ).length,
        from: unknownDate(),
        through: unknownDate(),
        dataAsOf: sourceCaptures[0]?.retrievedAt ?? null,
        lastSuccessfulAt: sourceCaptures.at(-1)?.retrievedAt ?? null,
        failureStage: sourceWorks.length ? null : "no_reviewed_items",
        lastKnownGoodDigest: null,
        limitations: [
          "Owner-reviewed bounded local selection; no completeness claim.",
          "Coverage date bounds remain unknown unless explicitly reviewed.",
        ],
        exclusions: [],
      };
    });
  return createAnalyzedCorpusV2({
    id: detached.id,
    runId: detached.runId,
    trustDomain: detached.trustDomain,
    generatedAt: detached.generatedAt,
    sourceProfiles: detached.sourceProfiles,
    captures: [...captures.values()],
    works: workRecords,
    versions,
    renditions,
    segments,
    events,
    relationships: detached.relationships ?? [],
    analyses: detached.analyses ?? [],
    findings: detached.findings ?? [],
    coverage,
  });
}

/** Lookup table for curators/evaluators; no IDs depend on search or extraction order. */
export function policyCorpusEvidenceIndex(corpus) {
  corpus = parseAnalyzedCorpusV2(corpus);
  return Object.freeze(
    corpus.segments.map((segment) => {
      const rendition = corpus.renditions.find(
        (entry) => entry.id === segment.renditionId,
      );
      const capture = corpus.captures.find(
        (entry) => entry.id === rendition.captureId,
      );
      return Object.freeze({
        versionId: rendition.versionId,
        operationId: capture.operationId,
        captureId: capture.id,
        renditionId: rendition.id,
        segmentId: segment.id,
        sourceLocator: segment.locator.value,
        startByte: segment.startByte,
        endByte: segment.endByte,
      });
    }),
  );
}
