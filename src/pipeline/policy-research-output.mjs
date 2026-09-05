import { Buffer } from "node:buffer";
import {
  canonicalV2Digest,
  createAnalyzedCorpusV2,
  parseAnalyzedCorpusV2,
} from "./analyzed-corpus-v2.mjs";

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
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const date = (value) =>
  value.value === null
    ? "Unknown"
    : `${value.value} (${value.precision} precision)`;
const list = (values) =>
  `<ul>${values.map((value) => `<li>${value}</li>`).join("")}</ul>`;
const literalList = (values) => list(values.map(escape));

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

const stylesheet = `:root{font:17px/1.6 system-ui,sans-serif;color:#17372d;background:#f4f5ee}*{box-sizing:border-box}body{overflow-wrap:anywhere;max-width:76rem;margin:auto;padding:1.5rem}a{color:#075685}a:focus-visible,summary:focus-visible{outline:3px solid #1672b6;outline-offset:4px}header,section,article{margin-bottom:1.5rem}header{border-bottom:3px solid #245f49}nav{display:flex;gap:1rem;flex-wrap:wrap}h1,h2,h3{line-height:1.25}section,article{background:#fffef8;padding:1.25rem;border:1px solid #becdc4;border-radius:.3rem}article section{padding:.8rem}blockquote{white-space:pre-wrap;overflow-wrap:anywhere;font:1.05rem/1.6 Georgia,serif;margin:1rem 0;padding:1rem;border-left:4px solid #6e8a78;background:#ecf1e8}.notice{border-left:4px solid #9b690e;padding:.8rem;background:#fff1d4}code{overflow-wrap:anywhere}dl{display:grid;grid-template-columns:minmax(8rem,13rem) minmax(0,1fr);gap:.4rem 1rem}dt{font-weight:700}dd{margin:0;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%}td,th{padding:.6rem;border:1px solid #bdccc2;text-align:left;vertical-align:top}caption{text-align:left;font-weight:bold}summary{cursor:pointer;padding:.5rem}small{color:#496256}@media(max-width:650px){body{padding:.7rem}dl{display:block}dd{margin-bottom:.6rem}section,article{padding:.8rem}}`;
function page(title, content) {
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escape(title)}</title><link rel="stylesheet" href="dossier.css"></head><body><header><h1>${escape(title)}</h1><nav aria-label="Local research"><a href="index.html">Workbench</a><a href="dossier.html">Dossier</a><a href="research.json">Research JSON</a><a href="corpus.json">Canonical corpus JSON</a></nav></header><main>${content}</main></body></html>\n`;
}

/** Same-corpus local research artifacts, all text escaped and no inline executable/style content. */
export function buildPolicyResearchOutput(input) {
  const corpus = parseAnalyzedCorpusV2(input);
  ensure(
    corpus.sourceProfiles.every(
      (source) =>
        source.uses.localDisplay === "full_text" &&
        source.uses.localExport === "full_text" &&
        source.uses.excerpts &&
        source.uses.publicRedistribution === "prohibited",
    ),
    "FULL_LOCAL_RESEARCH_OUTPUT_POLICY_REQUIRED",
  );
  const versions = new Map(corpus.versions.map((value) => [value.id, value]));
  const works = new Map(corpus.works.map((value) => [value.id, value]));
  const renditions = new Map(
    corpus.renditions.map((value) => [value.id, value]),
  );
  const captures = new Map(corpus.captures.map((value) => [value.id, value]));
  const cited = [
    ...new Set([
      ...corpus.relationships.flatMap((value) => value.segmentIds),
      ...corpus.analyses.flatMap((value) =>
        value.codes.flatMap((code) => code.segmentIds),
      ),
      ...corpus.findings.flatMap((value) => [
        ...value.supportingSegmentIds,
        ...value.contrarySegmentIds,
      ]),
    ]),
  ].sort();
  const evidenceById = new Map(
    corpus.segments
      .filter((value) => cited.includes(value.id))
      .map((segment) => {
        const rendition = renditions.get(segment.renditionId);
        const capture = captures.get(rendition.captureId);
        const version = versions.get(rendition.versionId);
        const work = works.get(version.workId);
        const quote = Buffer.from(rendition.text)
          .subarray(segment.startByte, segment.endByte)
          .toString("utf8");
        return [
          segment.id,
          {
            segmentId: segment.id,
            versionId: version.id,
            workId: work.id,
            sourceIdentifier: work.sourceIdentifier,
            sourceVersionIdentifier: version.sourceVersionIdentifier,
            sourceStatusLabel: version.sourceStatusLabel,
            sourceDates: version.dates,
            firstCorpusObservation: version.observedAt,
            sourceUrl: capture.finalUrl,
            locator: segment.locator,
            startByte: segment.startByte,
            endByte: segment.endByte,
            captureId: capture.id,
            capturedAt: capture.retrievedAt,
            objectDigest: capture.objectDigest,
            renditionDigest: rendition.outputDigest,
            textDigest: segment.textDigest,
            parser: rendition.parser,
            authorityLabel: rendition.authorityLabel,
            omittedSourceLocators: rendition.omittedSourceLocators,
            warnings: rendition.warnings,
            quote,
          },
        ];
      }),
  );
  const links = (ids) =>
    ids.length
      ? list(
          ids.map(
            (id, index) =>
              `<a href="evidence.html#${escape(id)}">Evidence ${index + 1}: ${escape(evidenceById.get(id).sourceIdentifier)} · ${escape(evidenceById.get(id).locator.value)}</a>`,
          ),
        )
      : "<p>No retained evidence.</p>";
  const versionName = (id) => {
    const version = versions.get(id);
    return `${works.get(version.workId).sourceIdentifier} · ${version.sourceVersionIdentifier}`;
  };
  const method = (record) =>
    `<p><strong>Method:</strong> ${escape(record.method.id)} ${escape(record.method.version)}. <strong>Reviewer:</strong> ${escape(record.reviewer.name)} (${escape(record.reviewer.kind)}), ${escape(record.reviewer.reviewedAt)}.</p>`;
  const facts = `<section id="source-facts"><h2>Retained source facts and reference graph</h2><p>Source labels and links below are attested to existing passages. An amendment or repeal edge concerns the cited provision or rule identified by the source; it is not an assertion that an entire instrument was replaced.</p>${corpus.relationships.map((relationship) => `<article><h3>${escape(versionName(relationship.fromVersionId))}</h3><p><strong>${escape(relationship.type)}</strong> → ${escape(relationship.target.sourceIdentifier)} (${escape(relationship.target.state)})</p><p>Exact source label: <q>${escape(relationship.sourceLabel)}</q></p><p>Source statement date: ${escape(date(relationship.sourceStatedAt))}</p>${links(relationship.segmentIds)}</article>`).join("")}</section>`;
  const analyses = `<section id="procedure-coding"><h2>Institutional procedure coding</h2><p>These are declared analyst codes with source evidence. Proposed, vetoed and limiting language must retain its context; codes do not establish a right, legal effect or current applicability.</p>${corpus.analyses.map((analysis) => `<article><h3>${escape(versionName(analysis.versionId))}</h3><p><strong>Uncertainty:</strong> ${escape(analysis.uncertainty)}</p>${method(analysis)}<table><caption>Declared procedure dimensions</caption><thead><tr><th scope="col">Dimension</th><th scope="col">Analyst value and source evidence</th></tr></thead><tbody>${analysis.codes.map((code) => `<tr><th scope="row">${escape(code.dimension)}</th><td>${escape(code.value)}${links(code.segmentIds)}</td></tr>`).join("")}</tbody></table></article>`).join("")}</section>`;
  const findings = `<section id="findings"><h2>Falsifiable findings</h2><p>Claims below are provisional, null or rejected findings about a bounded retained population. They remain separate from source facts and require counterevidence review.</p>${corpus.findings.map((finding) => `<article id="${escape(finding.id)}"><h3>${escape(finding.question)}</h3><p><strong>Disposition:</strong> ${escape(finding.disposition)}</p><p>${escape(finding.claim)}</p>${method(finding)}<h4>Population</h4>${literalList(finding.populationVersionIds.map(versionName))}<h4>Supporting evidence</h4>${links(finding.supportingSegmentIds)}<h4>Contrary or qualifying evidence</h4>${links(finding.contrarySegmentIds)}<h4>Missing evidence</h4>${literalList(finding.missingEvidence)}<h4>Rival explanations</h4>${literalList(finding.rivalExplanations)}<p><strong>Next disconfirming test:</strong> ${escape(finding.nextDisconfirmingTest)}</p></article>`).join("")}</section>`;
  const evidence = cited
    .map((id) => {
      const entry = evidenceById.get(id);
      return `<article id="${escape(id)}"><h2>${escape(entry.sourceIdentifier)} · ${escape(entry.sourceVersionIdentifier)}</h2><p>${escape(entry.authorityLabel)}</p><p>Source status: ${escape(entry.sourceStatusLabel)}</p><p><a href="${escape(entry.sourceUrl)}" rel="noreferrer">Originating source</a></p>${entry.omittedSourceLocators.length ? `<div class="notice"><strong>Reviewed omissions exist in this rendition.</strong><p>Source blocks before and after these locations are not joined. This quotation is one retained block; omissions do not certify its surrounding context as complete.</p>${literalList(entry.omittedSourceLocators)}</div>` : ""}<blockquote>${escape(entry.quote)}</blockquote><dl><dt>Source locator</dt><dd>${escape(entry.locator.value)}</dd><dt>Headings</dt><dd>${escape(entry.locator.headingPath.join(" › ") || "Not stated")}</dd><dt>Printed page</dt><dd>${escape(entry.locator.printedPageLabel ?? "Not stated")}</dd><dt>Version ID</dt><dd><code>${escape(entry.versionId)}</code></dd><dt>Segment ID</dt><dd><code>${escape(id)}</code></dd><dt>Source publication</dt><dd>${escape(date(entry.sourceDates.publication))}</dd><dt>Source version date</dt><dd>${escape(date(entry.sourceDates.sourceVersion))}</dd><dt>First corpus observation</dt><dd>${escape(entry.firstCorpusObservation)}</dd><dt>Capture observed</dt><dd>${escape(entry.capturedAt)}</dd><dt>UTF-8 byte range</dt><dd>[${entry.startByte}, ${entry.endByte}) in canonical rendition</dd><dt>Raw object SHA-256</dt><dd><code>${escape(entry.objectDigest)}</code></dd><dt>Rendition SHA-256</dt><dd><code>${escape(entry.renditionDigest)}</code></dd><dt>Segment SHA-256</dt><dd><code>${escape(entry.textDigest)}</code></dd><dt>Parser</dt><dd>${escape(entry.parser.id)} ${escape(entry.parser.version)} · <code>${escape(entry.parser.configDigest)}</code></dd></dl><details><summary>Rendition limitations</summary>${literalList(entry.warnings)}</details></article>`;
    })
    .join("");
  const projection = {
    kind: "policy_research_projection",
    schemaVersion: "1.0.0",
    corpusId: corpus.id,
    corpusDigest: corpus.contentDigest,
    generatedAt: corpus.generatedAt,
    publication: "closed",
    relationships: corpus.relationships,
    analyses: corpus.analyses,
    findings: corpus.findings,
    evidence: cited.map((id) => {
      const { quote, ...reference } = evidenceById.get(id);
      void quote;
      return reference;
    }),
  };
  const preamble = `<p class="notice">Local research output. No current-law, rights, jurisdiction or legal-effect determination is made. Source-stated dates, capture observations and analyst review dates are separate.</p><p>Corpus <code>${escape(corpus.id)}</code>, generated ${escape(corpus.generatedAt)}. Content SHA-256 <code>${escape(corpus.contentDigest)}</code>.</p><nav aria-label="Dossier sections"><a href="#source-facts">Source facts</a><a href="#procedure-coding">Procedure coding</a><a href="#findings">Findings</a><a href="evidence.html">Cited evidence</a></nav>`;
  return new Map([
    [
      "dossier.html",
      page(
        "Policy Sentinel research dossier",
        preamble + facts + analyses + findings,
      ),
    ],
    [
      "evidence.html",
      page(
        "Source evidence for the research dossier",
        `<p>Only passages cited by the retained research graph appear here. Each quotation is a single exact canonical segment. Text is not assembled across omitted blocks.</p>${evidence}`,
      ),
    ],
    ["research.json", `${JSON.stringify(projection, null, 2)}\n`],
    ["dossier.css", `${stylesheet}\n`],
  ]);
}
