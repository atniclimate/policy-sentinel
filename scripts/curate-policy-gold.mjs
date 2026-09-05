import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  openPolicyRun,
  readPolicyReceipt,
  writePolicyDerived,
  digest,
} from "../src/pipeline/policy-custody.mjs";
import { extractPolicyText } from "../src/pipeline/policy-text.mjs";
import { reviewedPolicyTextExclusions } from "../config/policy-text-selections.mjs";
import {
  goldFederalSelectors,
  goldWashingtonSelectors,
} from "../config/policy-gold.v1.mjs";
import {
  createPolicyCorpus,
  normalizePolicyDateSource,
  policyCorpusEvidenceIndex,
} from "../src/pipeline/policy-corpus-builder.mjs";
import { serializeAnalyzedCorpusV2 } from "../src/pipeline/analyzed-corpus-v2.mjs";

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--root")
  throw new Error("EXPLICIT_ROOT_REQUIRED");
const root = args[1];
const run = await openPolicyRun(root);
if (run.owner.trustDomain !== "real_source_local")
  throw new Error("REAL_LOCAL_RUN_REQUIRED");
const generatedAt = new Date().toISOString();
const review = {
  reviewer:
    "Policy Sentinel implementation lead integrating independent source-evidence review",
  reviewedAt: generatedAt,
};
const unknown = () => ({ value: null, precision: "unknown" });
const captures = new Map();
async function captured(operation, sourceKind) {
  if (captures.has(operation)) return captures.get(operation);
  const { receipt } = await readPolicyReceipt(root, operation, { length: 1 });
  if (receipt.state !== "complete")
    throw new Error("COMPLETE_CAPTURE_REQUIRED");
  const sourceBytes = await readFile(join(root, receipt.objectPath));
  if (digest(sourceBytes) !== receipt.objectDigest)
    throw new Error("OBJECT_DIGEST_MISMATCH");
  const parsed = extractPolicyText({
    bytes: sourceBytes,
    mediaType: receipt.mediaType,
    sourceKind,
    url: receipt.url,
    expectedIdentity: receipt.expectedIdentity,
    excludedBlockLocators: reviewedPolicyTextExclusions(receipt.url),
  });
  const extraction = {
    version: "1.0.0",
    state: "extracted_pending_review",
    captureOperationId: operation,
    objectDigest: receipt.objectDigest,
    renditionDigest: digest(Buffer.from(parsed.text)),
    sourceKind,
    ...parsed,
  };
  const value = { receipt, extraction, sourceBytes };
  captures.set(operation, value);
  return value;
}
function block(cap, locator) {
  const found = cap.extraction.blocks.filter(
    (item) => item.locator.value === locator,
  );
  if (found.length !== 1)
    throw new Error(
      `REVIEW_LOCATOR_MISSING:${cap.receipt.operationId}:${locator}`,
    );
  return found[0];
}
function first(cap, predicate) {
  const found = cap.extraction.blocks.find(predicate);
  if (!found)
    throw new Error(`REVIEW_FIELD_MISSING:${cap.receipt.operationId}`);
  return found;
}
function evidence(cap, selected, sourceValue) {
  return {
    operationId: cap.receipt.operationId,
    blockLocators: [selected.locator.value],
    mode: sourceValue === undefined ? "source_attested" : "deterministic",
    ruleId:
      sourceValue === undefined ? null : "reviewed-official-header-mapping-v1",
    ...(sourceValue === undefined ? {} : { sourceValue }),
  };
}
const datePattern =
  /(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2},? \d{4}/;
function dated(cap, selected, field) {
  const sourceValue = selected.text.match(datePattern)?.[0];
  if (!sourceValue)
    throw new Error(`REVIEW_DATE_MISSING:${cap.receipt.operationId}:${field}`);
  return {
    date: normalizePolicyDateSource(sourceValue),
    evidence: {
      ...evidence(cap, selected, sourceValue),
      ruleId: "exact-source-calendar-normalization-v1",
    },
  };
}
const items = [];
for (const selector of goldFederalSelectors) {
  const cap = await captured(
    `gov-fr-${selector.document}-html-001`,
    "govinfo_fr",
  );
  const paragraph = (number) =>
    block(cap, `/html[1]/body[1]/pre[1]/paragraph[${number}]`);
  const identity = paragraph(1);
  const titleBlock = paragraph(selector.titleParagraphs[0]);
  const title = selector.titleParagraphs
    .map((number) => paragraph(number).text)
    .join(" ");
  const titleEvidence =
    selector.titleParagraphs.length === 1
      ? evidence(cap, titleBlock)
      : {
          ...evidence(cap, titleBlock, titleBlock.text),
          blockLocators: selector.titleParagraphs.map(
            (number) => paragraph(number).locator.value,
          ),
          ruleId: "reviewed-contiguous-title-block-join-v1",
        };
  const source = selector.agencyParagraph
    ? paragraph(selector.agencyParagraph)
    : paragraph(selector.issuerParagraph);
  const statusBlock = paragraph(
    selector.actionParagraph ?? selector.orderParagraph,
  );
  const status = selector.actionParagraph
    ? cap.extraction.sourceMetadataCandidates.find(
        (m) =>
          m.field === "action" && m.sourceLocator === statusBlock.locator.value,
      )?.value
    : statusBlock.text;
  if (!status) throw new Error("EXACT_SOURCE_STATUS_REQUIRED");
  const issuer = selector.agencyParagraph
    ? cap.extraction.sourceMetadataCandidates.find(
        (m) => m.field === "agency" && m.sourceLocator === source.locator.value,
      )?.value
    : "President of the United States of America";
  if (!issuer) throw new Error("EXACT_ISSUER_REQUIRED");
  const publication = dated(cap, identity, "publication");
  const sourceVersion = selector.orderParagraph
    ? dated(cap, paragraph(selector.orderParagraph), "order")
    : publication;
  const versionId = `version-fr-${selector.document}-publication`;
  const work = {
    id: `work-fr-${selector.document}`,
    sourceProfileId: cap.receipt.profileId,
    sourceIdentifier: selector.document,
    title,
    instrumentClass: selector.instrumentClass,
    governmentContext: "United States federal",
    issuerRoles: [{ role: "issuer", label: issuer }],
    fieldEvidence: {
      "/sourceIdentifier": evidence(cap, identity),
      "/title": titleEvidence,
      "/instrumentClass": evidence(cap, statusBlock, status),
      "/governmentContext": evidence(cap, source, source.text),
      "/issuerRoles/0/role": evidence(cap, source, source.text),
      "/issuerRoles/0/label": evidence(cap, source, source.text),
    },
  };
  const version = {
    id: versionId,
    sourceVersionIdentifier: selector.document,
    sourceStatusLabel: status,
    dates: { publication: publication.date, sourceVersion: sourceVersion.date },
    fieldEvidence: {
      "/sourceVersionIdentifier": evidence(cap, identity),
      "/sourceStatusLabel": evidence(cap, statusBlock),
      "/dates/publication/value": publication.evidence,
      "/dates/sourceVersion/value": sourceVersion.evidence,
    },
  };
  const events = [];
  if (selector.effectiveParagraph) {
    const selected = paragraph(selector.effectiveParagraph);
    const effective = dated(cap, selected, "effective");
    events.push({
      id: `event-fr-${selector.document}-effective`,
      type: "effective",
      date: effective.date,
      sourceStatedAt: publication.date,
      sourceLabel: selected.text,
      evidence: [evidence(cap, selected)],
      fieldEvidence: {
        "/sourceLabel": evidence(cap, selected),
        "/date/value": effective.evidence,
        "/sourceStatedAt/value": publication.evidence,
      },
    });
  }
  items.push({ work, version, captures: [cap], review, events });
}
for (const selector of goldWashingtonSelectors) {
  const base = await captured(
    `wa-${selector.bill}-${selector.stages[0]}-001`,
    "washington_bill",
  );
  const identity = first(base, (entry) =>
    /(?:HOUSE|SENATE) BILL/.test(entry.text),
  );
  const titleBlock = first(
    base,
    (entry) =>
      /^AN ACT\b/.test(entry.text) ||
      (selector.stages[0] === "session" &&
        /^[A-Z][A-Z ,—–()/-]{15,}$/.test(entry.text) &&
        !/CERTIFICATION|LEGISLATURE|REGULAR SESSION|SUBSTITUTE|BILL/.test(
          entry.text,
        )),
  );
  const issuerBlock = first(base, (entry) =>
    /LEGISLATURE OF THE STATE OF WASHINGTON|State of Washington/.test(
      entry.text,
    ),
  );
  const stem = `wa-${selector.biennium}-${selector.chamber}${selector.bill}`;
  const sessionBlock = first(base, (entry) =>
    /\b\d{4} REGULAR SESSION\b/i.test(entry.text),
  );
  const sessionYear = Number(
    sessionBlock.text.match(/\b(\d{4}) REGULAR SESSION\b/i)[1],
  );
  const firstYear = sessionYear % 2 === 1 ? sessionYear : sessionYear - 1;
  if (`${firstYear}-${String(firstYear + 1).slice(-2)}` !== selector.biennium)
    throw new Error("BILL_SESSION_BIENNIUM_MISMATCH");
  const work = {
    id: `work-${stem}`,
    sourceProfileId: base.receipt.profileId,
    sourceIdentifier: `${selector.chamber.toUpperCase()} ${selector.bill} ${selector.biennium}`,
    title: titleBlock.text,
    instrumentClass: "bill",
    governmentContext: "Washington",
    issuerRoles: [{ role: "issuer", label: "Washington State Legislature" }],
    fieldEvidence: {
      "/sourceIdentifier": {
        ...evidence(base, identity, identity.text),
        blockLocators: [identity.locator.value, sessionBlock.locator.value],
        ruleId: "washington-bill-session-to-biennium-v1",
      },
      "/title": evidence(base, titleBlock),
      "/instrumentClass": evidence(base, identity, identity.text),
      "/governmentContext": evidence(base, issuerBlock, issuerBlock.text),
      "/issuerRoles/0/role": evidence(base, issuerBlock, issuerBlock.text),
      "/issuerRoles/0/label": evidence(base, issuerBlock, issuerBlock.text),
    },
  };
  for (const stage of selector.stages) {
    const cap = await captured(
      `wa-${selector.bill}-${stage}-001`,
      "washington_bill",
    );
    const chapter =
      stage === "session"
        ? first(cap, (entry) => /Chapter \d+, Laws of \d{4}/i.test(entry.text))
        : null;
    const partial = cap.extraction.blocks.find((entry) =>
      /^\(partial veto\)$/i.test(entry.text),
    );
    const statusBlock =
      partial ??
      chapter ??
      first(cap, (entry) =>
        stage === "passed"
          ? /^Passed Legislature(?:\s+-|$)/.test(entry.text)
          : /Read first time/.test(entry.text),
      );
    const versionId = `version-${stem}-${stage}`;
    const version = {
      id: versionId,
      sourceVersionIdentifier: (chapter ?? statusBlock).text,
      sourceStatusLabel: statusBlock.text,
      dates: { publication: unknown(), sourceVersion: unknown() },
      fieldEvidence: {
        "/sourceVersionIdentifier": evidence(cap, chapter ?? statusBlock),
        "/sourceStatusLabel": evidence(cap, statusBlock),
      },
    };
    const events = [];
    const effectiveBlock =
      stage === "session"
        ? cap.extraction.blocks.find(
            (entry) =>
              /(?:^|\s)EFFECTIVE DATE:/i.test(entry.text) &&
              (datePattern.test(entry.text) ||
                /EFFECTIVE DATE: \d{2}\/\d{2}\/\d{2}$/.test(entry.text)),
          )
        : null;
    if (
      effectiveBlock &&
      !/except|section|other|various|multiple/i.test(effectiveBlock.text)
    ) {
      const numeric = /EFFECTIVE DATE: (\d{2}\/\d{2}\/\d{2})$/.exec(
        effectiveBlock.text,
      );
      const year = chapter.text.match(/Laws of (\d{4})/i)?.[1];
      const effective = numeric
        ? {
            date: normalizePolicyDateSource(numeric[1], { yearContext: year }),
            evidence: {
              ...evidence(cap, effectiveBlock, numeric[1]),
              blockLocators: [
                effectiveBlock.locator.value,
                chapter.locator.value,
              ],
              ruleId: "washington-chapter-mmddyy-v1",
              dateYearContext: year,
            },
          }
        : dated(cap, effectiveBlock, "effective");
      events.push({
        id: `event-${stem}-effective`,
        type: "effective",
        date: effective.date,
        sourceStatedAt: unknown(),
        sourceLabel: effectiveBlock.text,
        evidence: [evidence(cap, effectiveBlock)],
        fieldEvidence: {
          "/sourceLabel": evidence(cap, effectiveBlock),
          "/date/value": effective.evidence,
        },
      });
    }
    items.push({ work, version, captures: [cap], review, events });
  }
}
const sourceProfiles = run.manifest.profiles.map((profile) => ({
  ...profile,
  sourceId: profile.id,
  interfaceId: `${profile.id}-html`,
  operator:
    profile.id === "govinfo-direct"
      ? "U.S. Government Publishing Office"
      : "Washington State Legislature",
  publisher:
    profile.id === "govinfo-direct"
      ? "Federal Register publication through GovInfo"
      : "Washington State Legislature",
  authorityLabel:
    profile.id === "govinfo-direct"
      ? "GovInfo HTML rendition of a historical Federal Register instrument. Agency statements and attributed comments retain their separate source context."
      : "Official Washington legislative text, including proposed, amended and partially vetoed material where identified. Read the exact version and source status.",
}));
const input = {
  id: "real-policy-gold-01",
  runId: run.owner.runId,
  trustDomain: run.owner.trustDomain,
  generatedAt,
  sourceProfiles,
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
  "review/gold-input.json",
  Buffer.from(`${JSON.stringify(portable, null, 2)}\n`),
);
const output = await writePolicyDerived(
  root,
  "work/gold-corpus.json",
  Buffer.from(serializeAnalyzedCorpusV2(corpus)),
);
const index = await writePolicyDerived(
  root,
  "review/gold-evidence-index.json",
  Buffer.from(
    `${JSON.stringify(policyCorpusEvidenceIndex(corpus), null, 2)}\n`,
  ),
);
await writePolicyDerived(
  root,
  "review/gold-seal.json",
  Buffer.from(
    `${JSON.stringify({ version: "1.0.0", inputDigest: descriptors.digest, outputDigest: output.digest, corpusDigest: corpus.contentDigest }, null, 2)}\n`,
  ),
);
process.stdout.write(
  `${JSON.stringify({ descriptors, output, index, corpusDigest: corpus.contentDigest, works: corpus.works.length, versions: corpus.versions.length, segments: corpus.segments.length, events: corpus.events.length, titles: corpus.works.map(({ id, title }) => ({ id, title })), statuses: corpus.versions.map(({ id, sourceStatusLabel }) => ({ id, sourceStatusLabel })) })}\n`,
);
