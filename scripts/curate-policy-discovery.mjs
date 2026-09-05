import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Buffer } from "node:buffer";
import {
  openPolicyRun,
  writePolicyDerived,
  digest,
} from "../src/pipeline/policy-custody.mjs";
import { replayReviewedCorpus } from "../src/pipeline/policy-local-output.mjs";
import { extractPolicyText } from "../src/pipeline/policy-text.mjs";
import { assertWashingtonBillHeader } from "../src/pipeline/policy-broad-discovery.mjs";
import { resolvePolicyResearchReview } from "../src/pipeline/policy-research-output.mjs";
import {
  createPolicyCorpus,
  normalizePolicyDateSource,
} from "../src/pipeline/policy-corpus-builder.mjs";
import { serializeAnalyzedCorpusV2 } from "../src/pipeline/analyzed-corpus-v2.mjs";
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--root")
  throw new Error("EXPLICIT_ROOT_REQUIRED");
const root = args[1];
const gold = await replayReviewedCorpus(root);
const researchBytes = await readFile(join(root, "review/research-input.json"));
const researchSeal = JSON.parse(
  await readFile(join(root, "review/research-seal.json"), "utf8"),
);
if (
  researchSeal.baseCorpusDigest !== gold.corpus.contentDigest ||
  researchSeal.baseInputDigest !== gold.seal.inputDigest ||
  researchSeal.baseOutputDigest !== gold.seal.outputDigest ||
  researchSeal.inputDigest !== digest(researchBytes)
)
  throw new Error("RESEARCH_BASE_SEAL_MISMATCH");
const research = resolvePolicyResearchReview({
  corpus: gold.corpus,
  review: JSON.parse(researchBytes.toString("utf8")),
});
if (
  research.corpus.contentDigest !== researchSeal.corpusDigest ||
  digest(Buffer.from(serializeAnalyzedCorpusV2(research.corpus))) !==
    researchSeal.outputDigest
)
  throw new Error("RESEARCH_REPLAY_MISMATCH");
const run = await openPolicyRun(root);
const targets = JSON.parse(
  await readFile(join(root, "review/broad-bodies.json"), "utf8"),
);
const generatedAt = new Date().toISOString();
const unknown = () => ({ value: null, precision: "unknown" });
const items = [...gold.reviewedInput.items];
const reviews = [];
const gaps = [...targets.gaps];
// Independently reviewed retained renditions. These are source/extraction
// limitations, not subject exclusions; a changed capture needs a fresh review.
const deferredBodies = new Map([
  ["broad-wa-5128-session-001", "SOURCE_AMENDMENT_MARKUP_AMBIGUOUS"],
  [
    "broad-wa-1389-session-001",
    "SOURCE_CONTACT_SECTION_FALSE_POSITIVE_TRUNCATION",
  ],
]);
for (const candidate of targets.records) {
  try {
    const receipt = run.ledger.operations[candidate.bodyOperationId];
    if (
      !receipt ||
      receipt.state !== "complete" ||
      receipt.profileId !== "washington-legislative-text" ||
      receipt.url !== candidate.bodyUrl
    )
      throw new Error("REVIEWED_BODY_CAPTURE_REQUIRED");
    if (deferredBodies.has(candidate.bodyOperationId))
      throw new Error(deferredBodies.get(candidate.bodyOperationId));
    const sourceBytes = await readFile(join(root, receipt.objectPath));
    if (digest(sourceBytes) !== receipt.objectDigest)
      throw new Error("OBJECT_DIGEST_MISMATCH");
    const parsed = extractPolicyText({
      bytes: sourceBytes,
      mediaType: receipt.mediaType,
      sourceKind: "washington_bill",
      url: receipt.url,
      expectedIdentity: receipt.expectedIdentity,
    });
    const extraction = {
      version: "1.0.0",
      state: "extracted_pending_review",
      captureOperationId: receipt.operationId,
      objectDigest: receipt.objectDigest,
      renditionDigest: digest(Buffer.from(parsed.text)),
      sourceKind: "washington_bill",
      ...parsed,
    };
    const headers = extraction.blocks.slice(0, 11);
    const one = (pattern, blocks = headers) => {
      const found = blocks.find((block) => pattern.test(block.text));
      if (!found) throw new Error("REVIEWED_HEADER_MISSING");
      return found;
    };
    const identity = one(
      new RegExp(
        `(?:${candidate.chamber === "house" ? "HOUSE" : "SENATE"}) BILL ${candidate.bill}\\b`,
      ),
    );
    const chapter = one(
      new RegExp(
        `^Chapter ${candidate.chapter}, Laws of ${candidate.year}$`,
        "i",
      ),
    );
    assertWashingtonBillHeader(candidate, identity.text);
    const session = one(/\b2025 REGULAR SESSION\b/i);
    const issuer = one(
      /LEGISLATURE OF THE STATE OF WASHINGTON|State of Washington/,
    );
    const enactingIndex = extraction.blocks.findIndex((block) =>
      /^BE IT ENACTED\b/.test(block.text),
    );
    const frontmatter = extraction.blocks.slice(
      0,
      enactingIndex < 0 ? 80 : enactingIndex,
    );
    const title =
      headers.find(
        (block) =>
          /^[A-Z][A-Z ,—–()/-]{15,}$/.test(block.text) &&
          !/^(?:CERTIFICATION|.*LEGISLATURE.*|.*REGULAR SESSION.*|.*(?:HOUSE|SENATE) BILL.*|EFFECTIVE DATE.*)$/.test(
            block.text,
          ),
      ) ?? one(/^AN ACT\b/, frontmatter);
    const partialVeto = headers.find((block) =>
      /^\(partial veto\)$/i.test(block.text),
    );
    const status = partialVeto ?? chapter;
    const stem = `wa-${candidate.biennium}-${candidate.chamber === "house" ? "hb" : "sb"}${candidate.bill}`;
    const ev = (block, sourceValue) => ({
      operationId: receipt.operationId,
      blockLocators: [block.locator.value],
      mode: sourceValue === undefined ? "source_attested" : "deterministic",
      ruleId:
        sourceValue === undefined
          ? null
          : "reviewed-official-header-mapping-v1",
      ...(sourceValue === undefined ? {} : { sourceValue }),
    });
    const work = {
      id: `work-${stem}`,
      sourceProfileId: receipt.profileId,
      sourceIdentifier: `${candidate.chamber === "house" ? "HB" : "SB"} ${candidate.bill} ${candidate.biennium}`,
      title: title.text,
      instrumentClass: "bill",
      governmentContext: "Washington",
      issuerRoles: [{ role: "issuer", label: "Washington State Legislature" }],
      fieldEvidence: {
        "/sourceIdentifier": {
          ...ev(identity, identity.text),
          blockLocators: [identity.locator.value, session.locator.value],
          ruleId: "washington-bill-session-to-biennium-v1",
        },
        "/title": ev(title),
        "/instrumentClass": ev(identity, identity.text),
        "/governmentContext": ev(issuer, issuer.text),
        "/issuerRoles/0/role": ev(issuer, issuer.text),
        "/issuerRoles/0/label": ev(issuer, issuer.text),
      },
    };
    const version = {
      id: `version-${stem}-session`,
      sourceVersionIdentifier: chapter.text,
      sourceStatusLabel: status.text,
      dates: { publication: unknown(), sourceVersion: unknown() },
      fieldEvidence: {
        "/sourceVersionIdentifier": ev(chapter),
        "/sourceStatusLabel": ev(status),
      },
    };
    const events = [];
    const effective = headers.find((block) =>
      /^EFFECTIVE DATE:/i.test(block.text),
    );
    const datePattern =
      /^EFFECTIVE DATE: ((?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2},? \d{4})$/;
    const exactDate = effective?.text.match(datePattern)?.[1];
    if (exactDate)
      events.push({
        id: `event-${stem}-effective`,
        type: "effective",
        date: normalizePolicyDateSource(exactDate),
        sourceStatedAt: unknown(),
        sourceLabel: effective.text,
        evidence: [ev(effective)],
        fieldEvidence: {
          "/sourceLabel": ev(effective),
          "/date/value": {
            ...ev(effective, exactDate),
            ruleId: "exact-source-calendar-normalization-v1",
          },
        },
      });
    const review = {
      reviewer:
        "Policy Sentinel source-qualified chapter/header admission rule v1, integrated by implementation lead",
      reviewedAt: generatedAt,
    };
    items.push({
      work,
      version,
      captures: [{ receipt, sourceBytes, extraction }],
      review,
      events,
    });
    reviews.push({
      workId: work.id,
      versionId: version.id,
      chapter: candidate.chapter,
      title: work.title,
      status: status.text,
      partialVeto: Boolean(partialVeto),
      effectiveHeader: effective?.text ?? null,
      effectiveEvent: Boolean(exactDate),
      indexObjectDigest: targets.indexObjectDigest,
      indexLocator: candidate.indexLocator,
      inventoryObjectDigest: candidate.inventoryObjectDigest,
      inventoryLocator: candidate.inventoryLocator,
      bodyObjectDigest: receipt.objectDigest,
      headerLocators: [
        identity.locator.value,
        chapter.locator.value,
        session.locator.value,
      ],
      parser: extraction.parser,
      exclusions: extraction.exclusions,
      warnings: extraction.warnings,
      blocks: extraction.blocks.length,
      textBytes: Buffer.byteLength(extraction.text),
      acceptance: "official_session_law_header_and_content_filter_passed",
      limitations: [
        "Systematic chapter-order discovery sample; no subject or Nation inference.",
        "Publication/source-version date unknown; no determination of current law.",
        ...(partialVeto
          ? [
              "Partial-veto material retained with notices; no operative institutional coding admitted for this broad record.",
            ]
          : []),
        ...(!exactDate
          ? [
              "Whole-document effective date unknown; read the source's section-specific or qualified dates.",
            ]
          : []),
        ...(extraction.exclusions.some((entry) =>
          [
            "personal_contact_section",
            "personal_contact_block",
            "prohibited_location_block",
          ].includes(entry.reason),
        )
          ? [
              "Partial rendition: conservative content filters also omit some statutory citations, blank form fields or generic documentation language; exact omission locators are retained. No absence inference is valid for omitted text.",
            ]
          : []),
      ],
    });
  } catch (error) {
    gaps.push({
      chapter: candidate.chapter,
      bill: candidate.bill,
      operationId: candidate.bodyOperationId,
      reason: String(error.message).slice(0, 200),
    });
  }
}
const input = {
  ...gold.reviewedInput,
  id: "real-policy-discovery-01",
  generatedAt,
  items,
  relationships: research.relationships,
  analyses: research.analyses,
  findings: research.findings,
};
const baseCoverage = createPolicyCorpus(input).coverage;
input.coverage = baseCoverage.map((entry) => {
  const result = { ...entry };
  delete result.contentDigest;
  const broad = entry.sourceProfileId === "washington-legislative-text";
  result.limitations = [
    ...entry.limitations,
    ...(broad
      ? [
          `Broader sample: 2025 regular-session chapters 1–200, 198 eligible numeric bills; ${reviews.length} accepted new works and ${gaps.length} source/admission gaps.`,
          "Gold includes selected 2012, 2021–2023 and 2025 bill versions; broad sample adds one session-law version per accepted 2025 bill.",
          "Publication and source-version dates are unknown. Exact unqualified whole-document effective headers are recorded separately; partial vetoes and qualified dates require source inspection.",
        ]
      : [
          "Seven purposively selected Federal Register instruments published 2000–2026; no complete CFR history or current-law consolidation.",
        ]),
    "All works are general-jurisdiction and Unclassified; research findings use only their declared gold populations.",
  ];
  result.exclusions = broad
    ? [
        "2025 chapter 1 initiative and chapter 2 salary schedule fall outside the selected numeric-bill interface.",
        "2025 chapters after 200 and other sessions are outside the broader sample.",
        `${gaps.length} candidate gaps are recorded in the owned broad-body review; no gap is silently replaced.`,
        "Source blocks matching prohibited contact/location content are omitted with rendition omission locators.",
        "Seven broad renditions contain bounded false-positive omissions of statutory citations, blank forms or generic documentation language; inspect omission locators before drawing an absence conclusion.",
        "SB5128 chapter 12 is deferred for ambiguous amendment markup; HB1389 chapter 155 is deferred for contact-filter truncation of a blank statutory form.",
      ]
    : [
        "Two reproduced private-comment paragraphs in the 2004 rule are omitted with exact rendition locators.",
        "The referenced 2001 rule is absent and remains an unresolved relationship target.",
      ];
  return result;
});
const corpus = createPolicyCorpus(input);
const portable = {
  ...input,
  items: items.map((item) => ({
    ...item,
    captures: item.captures.map(({ receipt, extraction }) => ({
      operationId: receipt.operationId,
      objectDigest: receipt.objectDigest,
      renditionDigest: extraction.renditionDigest,
      parser: extraction.parser,
      sourceKind: extraction.sourceKind,
      excludedBlockLocators: extraction.excludedBlockLocators,
    })),
  })),
};
const descriptors = await writePolicyDerived(
  root,
  "review/discovery-input.json",
  Buffer.from(`${JSON.stringify(portable, null, 2)}\n`),
);
const output = await writePolicyDerived(
  root,
  "work/discovery-corpus.json",
  Buffer.from(serializeAnalyzedCorpusV2(corpus)),
);
await writePolicyDerived(
  root,
  "review/discovery-seal.json",
  Buffer.from(
    `${JSON.stringify({ version: "1.0.0", inputDigest: descriptors.digest, outputDigest: output.digest, corpusDigest: corpus.contentDigest }, null, 2)}\n`,
  ),
);
const review = await writePolicyDerived(
  root,
  "review/broad-body-reviews.json",
  Buffer.from(
    `${JSON.stringify({ version: "1.0.0", generatedAt, goldCorpusDigest: gold.corpus.contentDigest, researchCorpusDigest: research.corpus.contentDigest, researchInputDigest: researchSeal.inputDigest, corpusDigest: corpus.contentDigest, reviews, gaps, indexExclusions: targets.exclusions }, null, 2)}\n`,
  ),
);
process.stdout.write(
  `${JSON.stringify({ descriptors, output, review, corpusDigest: corpus.contentDigest, goldWorks: gold.corpus.works.length, broadAccepted: reviews.length, works: corpus.works.length, versions: corpus.versions.length, events: corpus.events.length, segments: corpus.segments.length, gapCount: gaps.length, gapReasons: [...new Set(gaps.map((gap) => gap.reason))] })}\n`,
);
