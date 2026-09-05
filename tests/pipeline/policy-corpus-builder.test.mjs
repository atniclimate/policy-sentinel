import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { test } from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "../../schemas/analyzed-corpus.schema.v2.json" with { type: "json" };
import { extractPolicyText } from "../../src/pipeline/policy-text.mjs";
import {
  createPolicyCorpus,
  normalizePolicyDateSource,
  policyCaptureId,
  policyRenditionId,
  policyCorpusEvidenceIndex,
} from "../../src/pipeline/policy-corpus-builder.mjs";
import {
  replayCorpusCitation,
  parseAnalyzedCorpusV2,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";
import {
  compareDocumentVersions,
  selectTemporalVersions,
} from "../../src/engine/temporal-operations.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const day = (value) => ({ value, precision: "day" });
const unknown = () => ({ value: null, precision: "unknown" });
test("two-digit source dates require an explicit matching chapter year", () => {
  assert.deepEqual(
    normalizePolicyDateSource("06/07/12", { yearContext: "2012" }),
    day("2012-06-07"),
  );
  assert.throws(
    () => normalizePolicyDateSource("06/07/12"),
    /UNSUPPORTED_SOURCE_DATE/,
  );
  assert.throws(
    () => normalizePolicyDateSource("06/07/12", { yearContext: "2013" }),
    /AMBIGUOUS_SOURCE_DATE_YEAR/,
  );
  assert.throws(
    () => normalizePolicyDateSource("02/30/12", { yearContext: "2012" }),
    /INVALID_SOURCE_DATE/,
  );
});
function profile(id, host, pathPrefix) {
  return {
    id,
    sourceId: `${id}-source`,
    interfaceId: `${id}-interface`,
    operator: "Authored synthetic official operator",
    publisher: "Authored synthetic publisher",
    authorityLabel: "Authored synthetic source rendition",
    hosts: [host],
    pathPrefixes: [pathPrefix],
    review: {
      reviewer: "Authored reviewer",
      reviewedAt: "2026-08-01T00:00:00Z",
      expiresAt: "2026-10-01T00:00:00Z",
      evidenceUrls: [`https://${host}${pathPrefix}terms`],
    },
    uses: {
      capture: true,
      analysis: true,
      excerpts: true,
      localDisplay: "full_text",
      localExport: "full_text",
      publicRedistribution: "prohibited",
    },
  };
}
function retained({
  operationId,
  profileId,
  sourceKind,
  expectedIdentity,
  url,
  body,
  completedAt = "2026-09-01T00:00:01Z",
}) {
  const sourceBytes = Buffer.from(
    `<!doctype html><html><head><title>Authored metadata-only title</title></head><body>${body}</body></html>`,
  );
  const objectDigest = hash(sourceBytes);
  const extracted = extractPolicyText({
    bytes: sourceBytes,
    mediaType: "text/html",
    sourceKind,
    expectedIdentity,
    url,
  });
  return {
    sourceBytes,
    receipt: {
      operationId,
      profileId,
      url,
      finalUrl: url,
      state: "complete",
      status: 200,
      startedAt: "2026-09-01T00:00:00Z",
      completedAt,
      mediaType: "text/html",
      encodedBytes: sourceBytes.length,
      decodedBytes: sourceBytes.length,
      objectDigest,
      objectPath: `objects/${objectDigest}.bin`,
      expectedIdentity,
      errorCode: null,
    },
    extraction: {
      version: "1.0.0",
      state: "extracted_pending_review",
      captureOperationId: operationId,
      objectDigest,
      renditionDigest: hash(Buffer.from(extracted.text)),
      sourceKind,
      ...extracted,
    },
  };
}
function evidence(
  capture,
  contains,
  { derived = false, sourceValue = contains } = {},
) {
  const block = capture.extraction.blocks.find((entry) =>
    entry.text.includes(contains),
  );
  assert.ok(block, `Missing authored evidence ${contains}`);
  return {
    operationId: capture.receipt.operationId,
    blockLocators: [block.locator.value],
    mode: derived ? "deterministic" : "source_attested",
    ruleId: derived ? "reviewed-exact-source-mapping-v1" : null,
    ...(derived ? { sourceValue } : {}),
  };
}
function reviseCapture(capture, transform, excludedBlockLocators = []) {
  const sourceBytes = Buffer.from(
    transform(capture.sourceBytes.toString("utf8")),
  );
  const extracted = extractPolicyText({
    bytes: sourceBytes,
    mediaType: capture.receipt.mediaType,
    sourceKind: capture.extraction.sourceKind,
    expectedIdentity: capture.receipt.expectedIdentity,
    url: capture.receipt.url,
    excludedBlockLocators,
  });
  const objectDigest = hash(sourceBytes);
  capture.sourceBytes = sourceBytes;
  Object.assign(capture.receipt, {
    objectDigest,
    objectPath: `objects/${objectDigest}.bin`,
    decodedBytes: sourceBytes.length,
    encodedBytes: sourceBytes.length,
  });
  Object.assign(capture.extraction, extracted, {
    objectDigest,
    renditionDigest: hash(Buffer.from(extracted.text)),
  });
}
function fixture() {
  const input = {
    id: "authored-built-policy-corpus",
    runId: "authored-run",
    trustDomain: "synthetic_test_only",
    generatedAt: "2026-09-03T00:00:00Z",
    sourceProfiles: [
      profile("wa-profile", "wa.invalid", "/biennium/"),
      profile("fr-profile", "federal.invalid", "/content/pkg/"),
    ],
    items: [],
  };
  for (const key of ["original", "passed", "federal"]) {
    const federal = key === "federal";
    const title = federal
      ? "Authored federal procedure"
      : "Authored review procedure";
    const identity = federal ? "2020-12345" : "HB 1234";
    const header = federal ? "FR Doc. 2020-12345" : "HOUSE BILL 1234";
    const status = federal
      ? "Final rule."
      : key === "original"
        ? "Original Bill"
        : "Bill as Passed Legislature";
    const date = key === "passed" ? "February 2, 2020" : "January 1, 2020";
    const issuer = federal
      ? "Authored Federal Agency"
      : "Authored Washington Legislature";
    const capture = retained({
      operationId: `operation-${key}`,
      profileId: federal ? "fr-profile" : "wa-profile",
      sourceKind: federal ? "govinfo_fr" : "washington_bill",
      expectedIdentity: identity,
      url: federal
        ? "https://federal.invalid/content/pkg/FR-2020-01-01/html/2020-12345.htm"
        : `https://wa.invalid/biennium/2019-20/Htm/Bills/House%20Bills/1234${key === "passed" ? ".PL" : ""}.htm`,
      body: `<h1>${title}</h1><h2>${header}</h2><h3>${issuer}</h3><p>ACTION: ${status}</p><p>Published ${date}.</p><p>Effective July 1, 2020.</p><p>The council shall review${key === "passed" ? " within 30 days" : ""}.</p>`,
    });
    const work = {
      id: federal ? "work-fr-2020-12345" : "work-wa-1234",
      sourceProfileId: capture.receipt.profileId,
      sourceIdentifier: federal ? identity : "1234",
      title,
      instrumentClass: federal ? "final_rule" : "bill",
      governmentContext: federal ? "Federal" : "Washington",
      issuerRoles: [{ role: "issuer", label: issuer }],
      fieldEvidence: {
        "/sourceIdentifier": evidence(capture, federal ? identity : "1234"),
        "/title": evidence(capture, title),
        "/instrumentClass": evidence(capture, header, { derived: true }),
        "/governmentContext": evidence(capture, issuer),
        "/issuerRoles/0/role": evidence(capture, issuer, { derived: true }),
        "/issuerRoles/0/label": evidence(capture, issuer),
      },
    };
    const sourceVersionIdentifier = federal ? identity : status;
    const item = {
      work,
      version: {
        id: `version-${key}`,
        sourceVersionIdentifier,
        sourceStatusLabel: status,
        dates: {
          publication: normalizePolicyDateSource(date),
          sourceVersion: unknown(),
        },
        fieldEvidence: {
          "/sourceVersionIdentifier": evidence(
            capture,
            sourceVersionIdentifier,
          ),
          "/sourceStatusLabel": evidence(capture, status),
          "/dates/publication/value": evidence(capture, date, {
            derived: true,
          }),
        },
      },
      captures: [capture],
      review: {
        reviewer: "Authored item reviewer",
        reviewedAt: "2026-09-02T00:00:00Z",
      },
      events: [
        {
          id: `effective-${key}`,
          type: "effective",
          date: day("2020-07-01"),
          sourceStatedAt: normalizePolicyDateSource(date),
          sourceLabel: "Effective July 1, 2020.",
          fieldEvidence: {
            "/sourceLabel": evidence(capture, "Effective July 1, 2020."),
            "/date/value": evidence(capture, "July 1, 2020", { derived: true }),
            "/sourceStatedAt/value": evidence(capture, date, { derived: true }),
          },
          evidence: [evidence(capture, "Effective July 1, 2020.")],
        },
      ],
    };
    input.items.push(item);
  }
  return input;
}

test("reviewed builder closes source-byte replay, exact evidence, explicit works and deterministic versions", () => {
  const input = fixture();
  const output = createPolicyCorpus(input);
  assert.equal(output.works.length, 2);
  assert.equal(output.versions.length, 3);
  assert.equal(output.events.length, 3);
  assert.equal(
    output.segments.length,
    input.items.reduce(
      (count, item) => count + item.captures[0].extraction.blocks.length,
      0,
    ),
  );
  assert.equal(output.captures[0].objectPath.endsWith(".bin"), true);
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.equal(validate(output), true, JSON.stringify(validate.errors));
  assert.deepEqual(
    JSON.parse(JSON.stringify(parseAnalyzedCorpusV2(output))),
    JSON.parse(JSON.stringify(output)),
  );
  input.items.reverse();
  assert.equal(createPolicyCorpus(input).contentDigest, output.contentDigest);
  assert.equal(
    compareDocumentVersions(output, {
      beforeVersionId: "version-original",
      afterVersionId: "version-passed",
    }).changeType,
    "text_changed",
  );
  assert.ok(
    output.versions.every(
      (version) => version.dates.sourceVersion.precision === "unknown",
    ),
  );
  assert.ok(
    output.coverage.every((coverage) => coverage.from.precision === "unknown"),
  );
});

test("builder IDs and lookup mappings bind retained operations, captures, renditions and exact source spans", () => {
  const input = fixture();
  const output = createPolicyCorpus(input);
  const captured = input.items[0].captures[0];
  const captureId = policyCaptureId(
    captured.receipt.profileId,
    captured.receipt.operationId,
  );
  const renditionId = policyRenditionId(
    input.items[0].version.id,
    captureId,
    captured.extraction,
  );
  const index = policyCorpusEvidenceIndex(output).find(
    (entry) => entry.renditionId === renditionId,
  );
  assert.equal(index.operationId, captured.receipt.operationId);
  const replayed = replayCorpusCitation({
    corpus: output,
    segmentId: index.segmentId,
    objectBytes: captured.sourceBytes,
    renditionBytes: Buffer.from(captured.extraction.text),
    reextract: (bytes) =>
      Buffer.from(
        extractPolicyText({
          bytes,
          sourceKind: captured.extraction.sourceKind,
          mediaType: captured.receipt.mediaType,
          url: captured.receipt.url,
          expectedIdentity: captured.receipt.expectedIdentity,
        }).text,
      ),
  });
  assert.equal(replayed.parserReplay, "verified");
  assert.equal(replayed.captureId, captureId);
  assert.equal(replayed.versionId, input.items[0].version.id);
});

test("corrupt bytes, forged retained extraction, incomplete receipt and missing review fail before assembly", () => {
  let input = fixture();
  input.items[0].captures[0].sourceBytes[0] ^= 1;
  assert.throws(() => createPolicyCorpus(input), {
    code: "SOURCE_OBJECT_DIGEST_MISMATCH",
  });
  input = fixture();
  input.items[0].captures[0].extraction.text += " forged";
  assert.throws(() => createPolicyCorpus(input), {
    code: "EXTRACTION_REPLAY_MISMATCH",
  });
  input = fixture();
  input.items[0].captures[0].receipt.state = "failed";
  assert.throws(() => createPolicyCorpus(input), {
    code: "REVIEWED_COMPLETE_CAPTURE_REQUIRED",
  });
  input = fixture();
  input.items[0].review.reviewedAt = "2026-08-31T00:00:00Z";
  assert.throws(() => createPolicyCorpus(input), {
    code: "REVIEW_PRECEDES_CAPTURE",
  });
  input = fixture();
  input.items[0].review.reviewer = "";
  assert.throws(() => createPolicyCorpus(input), {
    code: "ITEM_REVIEW_REQUIRED",
  });
});

test("reviewed dates preserve precision, reject fabricated values and leave source labels unmodified", () => {
  assert.deepEqual(normalizePolicyDateSource("February 2020"), {
    value: "2020-02",
    precision: "month",
  });
  assert.deepEqual(normalizePolicyDateSource("2020"), {
    value: "2020",
    precision: "year",
  });
  assert.throws(() => normalizePolicyDateSource("February 30, 2020"), {
    code: "INVALID_SOURCE_DATE",
  });
  assert.throws(() => normalizePolicyDateSource("2020-01-01T14:36:50.49"), {
    code: "UNSUPPORTED_SOURCE_DATE",
  });
  let input = fixture();
  input.items[0].version.dates.publication = day("2021-01-01");
  assert.throws(() => createPolicyCorpus(input), {
    code: "DATE_DERIVATION_MISMATCH",
  });
  input = fixture();
  input.items[0].version.fieldEvidence["/sourceStatusLabel"] = evidence(
    input.items[0].captures[0],
    "Original Bill",
    { derived: true },
  );
  assert.throws(() => createPolicyCorpus(input), {
    code: "SOURCE_LABEL_MUST_REMAIN_ATTESTED",
  });
  input = fixture();
  input.items[0].work.fieldEvidence["/instrumentClass"].sourceValue =
    "Imaginary source label";
  assert.throws(() => createPolicyCorpus(input), {
    code: "EXACT_DERIVATION_SOURCE_REQUIRED",
  });
  const output = createPolicyCorpus(fixture());
  const snapshot = selectTemporalVersions(output, {
    asOf: "2019-12-31",
    basis: "source_available",
  });
  assert.ok(
    snapshot.selections.every((selection) => selection.versionIds.length === 0),
  );
});

test("metadata evidence uses an existing source block and refuses unrepresented head metadata", () => {
  const input = fixture();
  const item = input.items[2];
  const action = item.captures[0].extraction.sourceMetadataCandidates.find(
    (entry) => entry.field === "action",
  );
  item.version.fieldEvidence["/sourceStatusLabel"] = {
    operationId: item.captures[0].receipt.operationId,
    mode: "source_attested",
    ruleId: null,
    metadata: { field: "action", sourceLocator: action.sourceLocator },
  };
  assert.equal(createPolicyCorpus(input).versions.length, 3);
  const title = item.captures[0].extraction.sourceMetadataCandidates.find(
    (entry) => entry.field === "title",
  );
  item.work.fieldEvidence["/title"] = {
    operationId: item.captures[0].receipt.operationId,
    mode: "source_attested",
    ruleId: null,
    metadata: { field: "title", sourceLocator: title.sourceLocator },
  };
  assert.throws(() => createPolicyCorpus(input), {
    code: "METADATA_NOT_IN_RENDITION",
  });
});

test("builder rejects descriptor side effects and inconsistent same-work claims without mutating inputs", () => {
  const input = fixture();
  let calls = 0;
  Object.defineProperty(input.items[0].review, "reviewer", {
    enumerable: true,
    get() {
      calls++;
      return "Forged";
    },
  });
  assert.throws(() => createPolicyCorpus(input), {
    code: "PLAIN_BUILDER_INPUT_REQUIRED",
  });
  assert.equal(calls, 0);
  const inconsistent = fixture();
  inconsistent.items[1].work.title = "Different work title";
  assert.throws(() => createPolicyCorpus(inconsistent), {
    code: "CONFLICTING_WORK_DESCRIPTORS",
  });
  const unchanged = fixture();
  const bytesBefore = Buffer.from(unchanged.items[0].captures[0].sourceBytes);
  createPolicyCorpus(unchanged);
  assert.deepEqual(unchanged.items[0].captures[0].sourceBytes, bytesBefore);
});

test("shared work evidence resolves across same-work captures without attaching an earlier body to a later version", () => {
  const input = fixture();
  const original = input.items[0];
  const passed = input.items[1];
  // Force the later version to sort first: its shared work descriptor must still
  // resolve the explicitly retained original capture in the second pass.
  passed.version.id = "version-a-passed";
  passed.work = globalThis.structuredClone(original.work);
  reviseCapture(passed.captures[0], (html) =>
    html.replace(
      "Authored review procedure",
      "Authored amended review procedure",
    ),
  );
  const output = createPolicyCorpus(input);
  const work = output.works.find((entry) => entry.id === original.work.id);
  const titleEvidence = work.fieldProvenance.find(
    (entry) => entry.field === "/title",
  );
  assert.equal(
    titleEvidence.captureId,
    policyCaptureId("wa-profile", "operation-original"),
  );
  const current = output.versions.find(
    (entry) => entry.id === passed.version.id,
  );
  assert.equal(current.renditionIds.length, 1);
  const currentRendition = output.renditions.find(
    (entry) => entry.id === current.renditionIds[0],
  );
  assert.equal(
    currentRendition.captureId,
    policyCaptureId("wa-profile", "operation-passed"),
  );
  assert.match(currentRendition.text, /Authored amended review procedure/u);
  assert.doesNotMatch(currentRendition.text, /Authored review procedure/u);
  input.items.reverse();
  assert.equal(createPolicyCorpus(input).contentDigest, output.contentDigest);

  passed.version.fieldEvidence["/sourceStatusLabel"] = evidence(
    original.captures[0],
    "Original Bill",
  );
  assert.throws(() => createPolicyCorpus(input), {
    code: "UNKNOWN_EVIDENCE_OPERATION",
  });
  const crossWork = fixture();
  crossWork.items[0].work.fieldEvidence["/title"] = evidence(
    crossWork.items[2].captures[0],
    "Authored federal procedure",
  );
  assert.throws(() => createPolicyCorpus(crossWork), {
    code: "UNKNOWN_EVIDENCE_OPERATION",
  });
  const prematureReview = fixture();
  prematureReview.items[0].work = globalThis.structuredClone(
    prematureReview.items[1].work,
  );
  prematureReview.items[0].review.reviewedAt = "2026-09-01T01:00:00Z";
  prematureReview.items[1].captures[0].receipt.completedAt =
    "2026-09-01T02:00:00Z";
  assert.throws(() => createPolicyCorpus(prematureReview), {
    code: "WORK_REVIEW_PRECEDES_EVIDENCE_CAPTURE",
  });
});

test("reviewed parser omissions replay their exact config and never expose an excluded block", () => {
  const input = fixture();
  const capture = input.items[2].captures[0];
  const excluded = capture.extraction.blocks.find(
    (block) => block.text === "The council shall review.",
  );
  const originalConfig = capture.extraction.parser.configDigest;
  reviseCapture(capture, (html) => html, [excluded.locator.value]);
  assert.notEqual(capture.extraction.parser.configDigest, originalConfig);
  const output = createPolicyCorpus(input);
  const rendition = output.renditions.find(
    (entry) => entry.versionId === "version-federal",
  );
  assert.doesNotMatch(rendition.text, /The council shall review/u);
  assert.deepEqual(rendition.omittedSourceLocators, [excluded.locator.value]);
  capture.extraction.excludedBlockLocators = [];
  assert.throws(() => createPolicyCorpus(input), {
    code: "EXTRACTION_REPLAY_MISMATCH",
  });
});

test("distinct Federal Register instruments cannot be silently merged as versions", () => {
  const input = fixture();
  const second = globalThis.structuredClone(input.items[2]);
  second.captures[0].sourceBytes = Buffer.from(second.captures[0].sourceBytes);
  second.version.id = "version-federal-second";
  second.captures[0].receipt.operationId = "operation-federal-second";
  second.captures[0].receipt.expectedIdentity = "2020-54321";
  second.captures[0].extraction.captureOperationId = "operation-federal-second";
  reviseCapture(second.captures[0], (html) =>
    html.replaceAll("2020-12345", "2020-54321"),
  );
  input.items.push(second);
  assert.throws(() => createPolicyCorpus(input), {
    code: "DISTINCT_FR_DOCUMENTS_REQUIRE_DISTINCT_WORKS",
  });
});

test("auxiliary inventory supplies source stage evidence without adding a policy work or claiming provider dates as publication", () => {
  const input = fixture();
  const original = input.items[0];
  const model = {
    billNumber: 1234,
    biennium: "2019-20",
    documents: [
      {
        id: 101,
        name: "1234",
        biennium: "2019-20",
        displayNum: "1234",
        path: "https://lawfilesext.leg.wa.gov/biennium/2019-20/Htm/Bills/House%20Bills/1234.htm",
        description: "Original Bill",
        shortFriendlyName: "HB 1234",
        longFriendlyName: "House Bill 1234",
        documentClass: "Bills",
        documentType: "Bills",
        extension: ".htm",
        effectiveDate: "2019-12-01T10:00:00.00",
        lastModifiedDate: null,
      },
    ],
  };
  const indexCapture = retained({
    operationId: "operation-wa-index",
    profileId: "wa-profile",
    sourceKind: "washington_index",
    expectedIdentity: "Washington bill inventory 1234 2019-20",
    url: "https://wa.invalid/biennium/documentsearchresults?biennium=2019-20&name=1234",
    body: `<script>var model = ${JSON.stringify(model)};</script>`,
  });
  reviseCapture(original.captures[0], (html) =>
    html.replace("Original Bill", "Introduced"),
  );
  original.captures.push(indexCapture);
  for (const field of ["/sourceVersionIdentifier", "/sourceStatusLabel"])
    original.version.fieldEvidence[field] = evidence(
      indexCapture,
      "Original Bill",
    );
  const output = createPolicyCorpus(input);
  assert.equal(output.works.length, 2);
  assert.equal(output.versions.length, 3);
  assert.equal(output.captures.length, 4);
  const version = output.versions.find(
    (entry) => entry.id === original.version.id,
  );
  assert.equal(version.renditionIds.length, 2);
  const body = output.renditions.find(
    (entry) => entry.id === [...version.renditionIds].sort()[0],
  );
  assert.match(body.text, /The council shall review/u);
  const inventory = output.renditions.find(
    (entry) =>
      entry.captureId === policyCaptureId("wa-profile", "operation-wa-index"),
  );
  assert.ok(
    inventory.warnings.includes(
      "auxiliary_index_metadata_not_policy_instrument_text",
    ),
  );
  assert.equal(
    version.fieldProvenance.find(
      (entry) => entry.field === "/sourceStatusLabel",
    ).captureId,
    inventory.captureId,
  );
  original.version.dates.publication = day("2019-12-01");
  original.version.fieldEvidence["/dates/publication/value"] = evidence(
    indexCapture,
    "2019-12-01",
  );
  assert.throws(() => createPolicyCorpus(input), {
    code: "INDEX_PROVIDER_DATE_NOT_AUTHORITY",
  });
  original.captures = [indexCapture];
  assert.throws(() => createPolicyCorpus(input), {
    code: "POLICY_BODY_REQUIRED",
  });
});
