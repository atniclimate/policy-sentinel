import {
  canonicalV2Digest,
  createAnalyzedCorpusV2,
  parseAnalyzedCorpusV2,
} from "../../pipeline/analyzed-corpus-v2.mjs";

const catalogs = [
  "sourceProfiles",
  "captures",
  "works",
  "versions",
  "renditions",
  "segments",
  "events",
  "relationships",
  "analyses",
  "findings",
  "coverage",
];
const unchangedCatalogs = catalogs.filter(
  (key) => !["relationships", "analyses", "findings"].includes(key),
);
const fail = (code) => {
  throw new TypeError(`Policy research rejected: ${code}`);
};
const ensure = (condition, code) => {
  if (!condition) fail(code);
};
function closed(value, required, optional = []) {
  ensure(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      required.every((key) => Object.hasOwn(value, key)) &&
      Object.keys(value).every((key) =>
        [...required, ...optional].includes(key),
      ),
    "CLOSED_RESEARCH_REVIEW_REQUIRED",
  );
}
const plain = (value) => {
  canonicalV2Digest(value);
  return JSON.parse(JSON.stringify(value));
};
/** Resolve reviewed exact locators against a pinned corpus; no retrieval, extraction or inference. */
export function resolvePolicyResearchReview({ corpus, review }) {
  corpus = parseAnalyzedCorpusV2(corpus);
  review = plain(review);
  closed(review, [
    "version",
    "baseCorpusDigest",
    "generatedAt",
    "reviewer",
    "relationships",
    "analyses",
    "findings",
  ]);
  ensure(
    review.version === "1.0.0" &&
      review.baseCorpusDigest === corpus.contentDigest,
    "PINNED_BASE_CORPUS_REQUIRED",
  );
  ensure(
    Date.parse(review.generatedAt) >= Date.parse(corpus.generatedAt) &&
      Date.parse(review.reviewer.reviewedAt) <= Date.parse(review.generatedAt),
    "RESEARCH_TIME_ORDER",
  );
  for (const key of ["relationships", "analyses", "findings"])
    ensure(
      Array.isArray(review[key]) && review[key].length <= 1000,
      "RESEARCH_REVIEW_LIMIT",
    );
  const versions = new Map(corpus.versions.map((value) => [value.id, value]));
  const renditions = new Map(
    corpus.renditions.map((value) => [value.id, value]),
  );
  const captures = new Map(corpus.captures.map((value) => [value.id, value]));
  const resolve = (selectors, versionId) => {
    ensure(
      Array.isArray(selectors) &&
        selectors.length > 0 &&
        selectors.length <= 1000,
      "RESEARCH_EVIDENCE_REQUIRED",
    );
    const ids = selectors.map((selector) => {
      closed(
        selector,
        ["versionId", "sourceLocator"],
        ["renditionId", "expectedTextDigest"],
      );
      ensure(
        versions.has(selector.versionId) &&
          (!versionId || versionId === selector.versionId),
        "RESEARCH_VERSION_SCOPE",
      );
      const candidates = corpus.segments.filter(
        (segment) =>
          renditions.get(segment.renditionId).versionId ===
            selector.versionId &&
          segment.locator.value === selector.sourceLocator &&
          (!selector.renditionId ||
            selector.renditionId === segment.renditionId),
      );
      ensure(
        candidates.length === 1,
        "EXACT_UNAMBIGUOUS_RESEARCH_LOCATOR_REQUIRED",
      );
      const segment = candidates[0];
      ensure(
        !selector.expectedTextDigest ||
          selector.expectedTextDigest === segment.textDigest,
        "RESEARCH_TEXT_DIGEST_MISMATCH",
      );
      ensure(
        Date.parse(
          captures.get(renditions.get(segment.renditionId).captureId)
            .retrievedAt,
        ) <= Date.parse(review.reviewer.reviewedAt),
        "RESEARCH_REVIEW_PRECEDES_CAPTURE",
      );
      return segment.id;
    });
    ensure(new Set(ids).size === ids.length, "DUPLICATE_RESEARCH_EVIDENCE");
    return ids.sort();
  };
  const relationships = review.relationships.map((item) => {
    closed(item, [
      "id",
      "fromVersionId",
      "type",
      "target",
      "sourceLabel",
      "sourceStatedAt",
      "evidence",
    ]);
    const version = versions.get(item.fromVersionId);
    ensure(version, "RESEARCH_VERSION_SCOPE");
    // A known statement date must already be an attested date of this exact source version.
    ensure(
      item.sourceStatedAt.precision === "unknown" ||
        Object.values(version.dates).some(
          (value) =>
            canonicalV2Digest(value) === canonicalV2Digest(item.sourceStatedAt),
        ),
      "RELATIONSHIP_DATE_NOT_ATTESTED_BY_VERSION",
    );
    const { evidence, ...record } = item;
    return { ...record, segmentIds: resolve(evidence, item.fromVersionId) };
  });
  const analyses = review.analyses.map((item) => {
    closed(item, ["id", "versionId", "method", "uncertainty", "codes"]);
    return {
      ...item,
      kind: "institutional_procedure",
      reviewer: review.reviewer,
      codes: item.codes.map((code) => {
        closed(code, ["dimension", "value", "evidence"]);
        return {
          dimension: code.dimension,
          value: code.value,
          segmentIds: resolve(code.evidence, item.versionId),
        };
      }),
    };
  });
  const findings = review.findings.map((item) => {
    closed(item, [
      "id",
      "question",
      "populationVersionIds",
      "method",
      "disposition",
      "claim",
      "supportingEvidence",
      "contraryEvidence",
      "missingEvidence",
      "rivalExplanations",
      "nextDisconfirmingTest",
      "analysisIds",
    ]);
    ensure(
      item.missingEvidence.length > 0 &&
        item.rivalExplanations.length > 0 &&
        item.nextDisconfirmingTest.trim().length > 0,
      "FALSIFIABLE_FINDING_REQUIRED",
    );
    const { supportingEvidence, contraryEvidence, ...record } = item;
    return {
      ...record,
      reviewer: review.reviewer,
      supportingSegmentIds: resolve(supportingEvidence),
      contrarySegmentIds: resolve(contraryEvidence),
    };
  });
  // Semantic validation is shared with every other producer, including population
  // scope, exact source labels, dates, reviewer times and distinct evidence roles.
  const input = {
    id: corpus.id,
    runId: corpus.runId,
    trustDomain: corpus.trustDomain,
    generatedAt: review.generatedAt,
    ...Object.fromEntries(catalogs.map((key) => [key, corpus[key]])),
    relationships: [...corpus.relationships, ...relationships],
    analyses: [...corpus.analyses, ...analyses],
    findings: [...corpus.findings, ...findings],
  };
  const enriched = createAnalyzedCorpusV2(input);
  for (const key of unchangedCatalogs)
    ensure(
      canonicalV2Digest(enriched[key]) === canonicalV2Digest(corpus[key]),
      "SOURCE_CATALOG_CHANGED_BY_RESEARCH",
    );
  return {
    relationships,
    analyses,
    findings,
    generatedAt: review.generatedAt,
    corpus: enriched,
  };
}

/** Separate content digest, same exact retained source graph; the base corpus is never mutated. */
export function enrichPolicyCorpus(input) {
  return resolvePolicyResearchReview(input).corpus;
}
