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
const run = await openPolicyRun(root);
const targets = JSON.parse(
  await readFile(join(root, "review/broad-bodies.json"), "utf8"),
);
const generatedAt = new Date().toISOString();
const unknown = () => ({ value: null, precision: "unknown" });
const items = [...gold.reviewedInput.items];
const reviews = [];
const gaps = [...targets.gaps];
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
          !/CERTIFICATION|LEGISLATURE|REGULAR SESSION|SUBSTITUTE|BILL|EFFECTIVE DATE/.test(
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
};
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
    `${JSON.stringify({ version: "1.0.0", generatedAt, goldCorpusDigest: gold.corpus.contentDigest, corpusDigest: corpus.contentDigest, reviews, gaps, indexExclusions: targets.exclusions }, null, 2)}\n`,
  ),
);
process.stdout.write(
  `${JSON.stringify({ descriptors, output, review, corpusDigest: corpus.contentDigest, goldWorks: gold.corpus.works.length, broadAccepted: reviews.length, works: corpus.works.length, versions: corpus.versions.length, events: corpus.events.length, segments: corpus.segments.length, gaps })}\n`,
);
