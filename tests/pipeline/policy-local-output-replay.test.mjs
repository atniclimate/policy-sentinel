// Characterization tests for replayReviewedCorpus, writeLocalOutput, readLocalOutput
// and localCorpusBytes (src/pipeline/policy-local-output.mjs). These four functions
// have no direct test before this file (audit finding F-17); this file pins their
// current observable behavior over a synthetic real_source_local run root built
// with initializePolicyRun and admitPolicyTargets, so a later move into
// src/modules/intake and src/modules/output can be proven behavior-preserving.
// No network access: every run root is built entirely from bytes constructed in
// this file, and no external custody namespace is read or written.
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  admitPolicyTargets,
  digest,
  initializePolicyRun,
  openPolicyRun,
  POLICY_LIMITS,
} from "../../src/pipeline/policy-custody.mjs";
import { extractPolicyText } from "../../src/pipeline/policy-text.mjs";
import {
  createPolicyCorpus,
  normalizePolicyDateSource,
} from "../../src/pipeline/policy-corpus-builder.mjs";
import {
  canonicalV2Digest,
  createAnalyzedCorpusV2,
  serializeAnalyzedCorpusV2,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";
import {
  localCorpusBytes,
  readLocalOutput,
  replayReviewedCorpus,
  writeLocalOutput,
} from "../../src/pipeline/policy-local-output.mjs";
import { replayReviewedCorpus as intakeReplayReviewedCorpus } from "../../src/modules/intake/replay.mjs";
import * as intakeBindings from "../../src/modules/intake/replay.mjs";
import * as coreBindings from "../../src/core/local-output-bindings.mjs";

test("intake preserves all three promoted core binding helpers", () => {
  assert.deepEqual(Object.keys(coreBindings).sort(), [
    "assertCaptureBindings",
    "assertProfileBindings",
    "safeFile",
  ]);
  for (const name of Object.keys(coreBindings))
    assert.strictEqual(intakeBindings[name], coreBindings[name]);
});
import { syntheticCorpusV2Input } from "./analyzed-corpus-v2.test.mjs";
import { mockPolicyFilesystem } from "../helpers/policy-filesystem-observations.mjs";

test("legacy replay import is the intake entry point", () => {
  assert.strictEqual(replayReviewedCorpus, intakeReplayReviewedCorpus);
});

function evidenceFor(
  capture,
  contains,
  { derived = false, sourceValue = contains } = {},
) {
  const block = capture.extraction.blocks.find((entry) =>
    entry.text.includes(contains),
  );
  assert.ok(block, `Authored fixture is missing evidence text: ${contains}`);
  return {
    operationId: capture.receipt.operationId,
    blockLocators: [block.locator.value],
    mode: derived ? "deterministic" : "source_attested",
    ruleId: derived ? "authored-synthetic-mapping-v1" : null,
    ...(derived ? { sourceValue } : {}),
  };
}

/** Directly authors a completed custody capture (receipt + object bytes + ledger
 * entry) without acquirePolicyObject, since that function requires either a real
 * network transport for a real_source_local run or a synthetic_test_only run.
 * The receipt shape matches the exact fields policy-custody.mjs validates. */
async function completeCapture(
  root,
  {
    operationId,
    profileId,
    url,
    expectedIdentity,
    sourceKind,
    body,
    manifestDigest,
  },
) {
  const sourceBytes = Buffer.from(
    `<!doctype html><html><head><title>Authored synthetic title</title></head><body>${body}</body></html>`,
  );
  const objectDigest = digest(sourceBytes);
  const receipt = {
    operationId,
    url,
    retryOf: null,
    state: "complete",
    startedAt: "2026-09-01T00:00:00Z",
    reservedBytes: POLICY_LIMITS.responseBytes,
    manifestDigest,
    profileId,
    completedAt: "2026-09-01T00:00:01Z",
    finalUrl: url,
    status: 200,
    mediaType: "text/html",
    encodedBytes: sourceBytes.length,
    decodedBytes: sourceBytes.length,
    conservativeByteCharge: false,
    objectDigest,
    objectPath: `objects/${objectDigest}.bin`,
    expectedIdentity,
    errorCode: null,
    transient: false,
    retryAfter: null,
  };
  await writeFile(join(root, receipt.objectPath), sourceBytes);
  await writeFile(
    join(root, "receipts", `${operationId}.json`),
    JSON.stringify(receipt),
  );
  const run = await openPolicyRun(root);
  run.ledger.attempts += 1;
  run.ledger.encodedBytes += receipt.encodedBytes;
  run.ledger.decodedBytes += receipt.decodedBytes;
  run.ledger.operations[operationId] = receipt;
  await writeFile(join(root, "ledger.json"), JSON.stringify(run.ledger));
  const extracted = extractPolicyText({
    bytes: sourceBytes,
    mediaType: receipt.mediaType,
    sourceKind,
    url,
    expectedIdentity,
  });
  const extraction = {
    version: "1.0.0",
    state: "extracted_pending_review",
    captureOperationId: operationId,
    objectDigest,
    renditionDigest: digest(Buffer.from(extracted.text)),
    sourceKind,
    ...extracted,
  };
  return { sourceBytes, receipt, extraction };
}

/** Builds a fresh external real_source_local run root (initializePolicyRun,
 * admitPolicyTargets, one authored completed capture) plus the reviewed
 * review/gold-input.json, work/gold-corpus.json and review/gold-seal.json files
 * that replayReviewedCorpus/writeLocalOutput/readLocalOutput consume. */
async function buildRunFixture(
  t,
  { transformPortable = (portable) => portable } = {},
) {
  const base = await mkdtemp(join(tmpdir(), "policy-local-output-replay-"));
  t.after(async () => {
    assert.ok(base.startsWith(join(tmpdir(), "policy-local-output-replay-")));
    await rm(base, { recursive: true, force: true });
  });
  const root = join(base, "run");
  const profileA = {
    id: "profile-a",
    hosts: ["official-a.example"],
    pathPrefixes: ["/docs/"],
    review: {
      reviewer: "Authored synthetic reviewer",
      reviewedAt: "2026-08-01T00:00:00Z",
      expiresAt: "2099-01-01T00:00:00Z",
      evidenceUrls: ["https://official-a.example/docs/terms"],
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
  const runId = "policy-local-output-replay-01";
  await initializePolicyRun(root, {
    version: "1.0.0",
    runId,
    trustDomain: "real_source_local",
    profiles: [profileA],
    targets: [],
  });
  const target = {
    profileId: "profile-a",
    url: "https://official-a.example/docs/hb1234",
    expectedIdentity: "HB 1234",
    mediaTypes: ["text/html"],
  };
  const admitted = await admitPolicyTargets(root, {
    version: "1.0.0",
    runId,
    trustDomain: "real_source_local",
    profiles: [profileA],
    targets: [target],
  });
  const capture = await completeCapture(root, {
    operationId: "op-hb1234",
    profileId: "profile-a",
    url: target.url,
    expectedIdentity: target.expectedIdentity,
    sourceKind: "washington_bill",
    manifestDigest: admitted.manifestDigest,
    body:
      "<h1>Authored bill title</h1><h2>HOUSE BILL 1234</h2>" +
      "<h3>Washington State Legislature</h3>" +
      "<p>ACTION: Passed Legislature</p>" +
      "<p>Published January 1, 2020.</p>",
  });
  const work = {
    id: "work-hb1234",
    sourceProfileId: "profile-a",
    sourceIdentifier: "1234",
    title: "Authored bill title",
    instrumentClass: "bill",
    governmentContext: "Washington",
    issuerRoles: [{ role: "issuer", label: "Washington State Legislature" }],
    fieldEvidence: {
      "/sourceIdentifier": evidenceFor(capture, "HOUSE BILL 1234"),
      "/title": evidenceFor(capture, "Authored bill title"),
      "/instrumentClass": evidenceFor(capture, "HOUSE BILL 1234", {
        derived: true,
      }),
      "/governmentContext": evidenceFor(
        capture,
        "Washington State Legislature",
      ),
      "/issuerRoles/0/role": evidenceFor(
        capture,
        "Washington State Legislature",
        {
          derived: true,
        },
      ),
      "/issuerRoles/0/label": evidenceFor(
        capture,
        "Washington State Legislature",
      ),
    },
  };
  const version = {
    id: "version-hb1234-original",
    sourceVersionIdentifier: "Passed Legislature",
    sourceStatusLabel: "Passed Legislature",
    dates: {
      publication: normalizePolicyDateSource("January 1, 2020"),
      sourceVersion: { value: null, precision: "unknown" },
    },
    fieldEvidence: {
      "/sourceVersionIdentifier": evidenceFor(capture, "Passed Legislature"),
      "/sourceStatusLabel": evidenceFor(capture, "Passed Legislature"),
      "/dates/publication/value": evidenceFor(capture, "January 1, 2020", {
        derived: true,
      }),
    },
  };
  const item = {
    work,
    version,
    captures: [
      {
        receipt: capture.receipt,
        extraction: capture.extraction,
        sourceBytes: capture.sourceBytes,
      },
    ],
    review: {
      reviewer: "Authored item reviewer",
      reviewedAt: "2026-09-02T00:00:00Z",
    },
  };
  const input = {
    id: "authored-local-output-gold",
    runId,
    trustDomain: "real_source_local",
    generatedAt: "2026-09-03T00:00:00Z",
    sourceProfiles: [
      {
        ...profileA,
        sourceId: "profile-a-source",
        interfaceId: "profile-a-interface",
        operator: "Authored synthetic operator",
        publisher: "Authored synthetic publisher",
        authorityLabel: "Authored synthetic official rendition",
      },
    ],
    items: [item],
  };
  const corpus = createPolicyCorpus(input);
  const portable = transformPortable({
    ...input,
    items: input.items.map((current) => ({
      ...current,
      captures: current.captures.map(({ receipt, extraction }) => ({
        operationId: receipt.operationId,
        objectDigest: receipt.objectDigest,
        renditionDigest: extraction.renditionDigest,
        parser: extraction.parser,
        sourceKind: extraction.sourceKind,
        excludedBlockLocators: extraction.excludedBlockLocators,
      })),
    })),
  });
  const inputBytes = Buffer.from(`${JSON.stringify(portable, null, 2)}\n`);
  const corpusBytes = Buffer.from(serializeAnalyzedCorpusV2(corpus));
  await writeFile(join(root, "review", "gold-input.json"), inputBytes);
  await writeFile(join(root, "work", "gold-corpus.json"), corpusBytes);
  const seal = {
    version: "1.0.0",
    inputDigest: digest(inputBytes),
    outputDigest: digest(corpusBytes),
    corpusDigest: corpus.contentDigest,
  };
  await writeFile(
    join(root, "review", "gold-seal.json"),
    `${JSON.stringify(seal, null, 2)}\n`,
  );
  return { root, runId, corpus, portable, target, profileA, capture };
}

async function buildSyntheticOnlyRoot(t) {
  const base = await mkdtemp(join(tmpdir(), "policy-local-output-replay-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const root = join(base, "run");
  await initializePolicyRun(root, {
    version: "1.0.0",
    runId: "policy-local-output-replay-synthetic",
    trustDomain: "synthetic_test_only",
    profiles: [],
    targets: [],
  });
  return root;
}

test("replayReviewedCorpus, writeLocalOutput, readLocalOutput and localCorpusBytes reproduce a reviewed run built with initializePolicyRun and admitPolicyTargets", async (t) => {
  mockPolicyFilesystem(t, {
    availableBytes: POLICY_LIMITS.freeBytes + POLICY_LIMITS.runBytes,
  });
  const fixture = await buildRunFixture(t);
  const replay = await replayReviewedCorpus(fixture.root, { name: "gold" });
  assert.equal(replay.custody.valid, true);
  assert.equal(replay.custody.objects, 1);
  assert.equal(replay.corpus.contentDigest, fixture.corpus.contentDigest);
  assert.equal(replay.seal.corpusDigest, replay.corpus.contentDigest);
  assert.equal(replay.input.runId, fixture.runId);
  assert.equal(replay.corpus.works.length, 1);
  assert.equal(replay.corpus.versions.length, 1);
  assert.equal(
    replay.reviewedInput.items[0].captures[0].extraction.text,
    fixture.capture.extraction.text,
  );

  const bytes = localCorpusBytes(replay.corpus);
  assert.deepEqual(
    bytes,
    Buffer.from(serializeAnalyzedCorpusV2(replay.corpus)),
  );

  const assets = new Map([
    [
      "index.html",
      Buffer.from(
        "<!doctype html><main>Authored synthetic local output</main>",
      ),
    ],
  ]);
  const written = await writeLocalOutput(fixture.root, replay.corpus, assets, {
    name: "gold",
  });
  assert.match(written.buildId, /^build-[a-f0-9]{32}$/);
  assert.equal(written.corpusDigest, replay.corpus.contentDigest);
  assert.equal(written.files, 3);

  const read = await readLocalOutput(fixture.root);
  assert.equal(read.manifest.buildId, written.buildId);
  assert.equal(read.manifest.corpusDigest, replay.corpus.contentDigest);
  assert.deepEqual(read.files.get("corpus.json"), bytes);
  assert.ok(read.files.has("index.html"));
  assert.match(read.manifestDigest, /^[a-f0-9]{64}$/);

  const otherRun = { ...replay.corpus, runId: "a-different-run" };
  await assert.rejects(
    writeLocalOutput(fixture.root, otherRun, assets, { name: "gold" }),
    /OUTPUT_RUN_MISMATCH/,
  );
  await assert.rejects(
    writeLocalOutput(fixture.root, replay.corpus, new Map(), { name: "gold" }),
    /OUTPUT_ASSET_CONFLICT/,
  );
  await assert.rejects(
    writeLocalOutput(
      fixture.root,
      replay.corpus,
      new Map([...assets, ["corpus.json", Buffer.from("{}")]]),
      { name: "gold" },
    ),
    /OUTPUT_ASSET_CONFLICT/,
  );
});

test("writeLocalOutput refuses low capacity before creating output or its pointer", async (t) => {
  const fixture = await buildRunFixture(t);
  const replay = await replayReviewedCorpus(fixture.root, { name: "gold" });
  mockPolicyFilesystem(t, { availableBytes: POLICY_LIMITS.freeBytes });
  await assert.rejects(
    writeLocalOutput(
      fixture.root,
      replay.corpus,
      new Map([["index.html", Buffer.from("<main>Synthetic output</main>")]]),
      { name: "gold" },
    ),
    /DISK_BUDGET_EXHAUSTED/,
  );
  await assert.rejects(lstat(join(fixture.root, "local-output")), {
    code: "ENOENT",
  });
  await assert.rejects(
    lstat(join(fixture.root, "review", "local-output-current.json")),
    { code: "ENOENT" },
  );
});

test("replayReviewedCorpus and writeLocalOutput reject an unsupported corpus selection before any root access", async () => {
  // Never created: the selection is rejected before the root is touched.
  const unreachableRoot = join(
    tmpdir(),
    "policy-sentinel-characterization-root-never-created",
  );
  await assert.rejects(
    replayReviewedCorpus(unreachableRoot, { name: "bogus" }),
    /INVALID_CORPUS_SELECTION/,
  );
  await assert.rejects(
    writeLocalOutput(unreachableRoot, {}, new Map(), { name: "bogus" }),
    /INVALID_CORPUS_SELECTION/,
  );
});

test("replayReviewedCorpus fails closed when the reviewed seal, run identity, source policy, capture or parser binding is tampered", async (t) => {
  const sealFixture = await buildRunFixture(t);
  const sealPath = join(sealFixture.root, "review", "gold-seal.json");
  const seal = JSON.parse(await readFile(sealPath, "utf8"));
  seal.outputDigest = "0".repeat(64);
  await writeFile(sealPath, JSON.stringify(seal));
  await assert.rejects(
    replayReviewedCorpus(sealFixture.root, { name: "gold" }),
    /REVIEW_SEAL_MISMATCH/,
  );

  const identityFixture = await buildRunFixture(t, {
    transformPortable: (portable) => ({
      ...portable,
      runId: "a-different-run",
    }),
  });
  await assert.rejects(
    replayReviewedCorpus(identityFixture.root, { name: "gold" }),
    /RUN_IDENTITY_MISMATCH/,
  );

  const policyFixture = await buildRunFixture(t, {
    transformPortable: (portable) => ({
      ...portable,
      sourceProfiles: portable.sourceProfiles.map((profile) => ({
        ...profile,
        hosts: ["different.example"],
      })),
    }),
  });
  await assert.rejects(
    replayReviewedCorpus(policyFixture.root, { name: "gold" }),
    /SOURCE_POLICY_ADMISSION_MISMATCH/,
  );

  const captureFixture = await buildRunFixture(t, {
    transformPortable: (portable) => ({
      ...portable,
      items: portable.items.map((item) => ({
        ...item,
        captures: item.captures.map((capture) => ({
          ...capture,
          objectDigest: "0".repeat(64),
        })),
      })),
    }),
  });
  await assert.rejects(
    replayReviewedCorpus(captureFixture.root, { name: "gold" }),
    /CAPTURE_REPLAY_MISMATCH/,
  );

  const parserFixture = await buildRunFixture(t, {
    transformPortable: (portable) => ({
      ...portable,
      items: portable.items.map((item) => ({
        ...item,
        captures: item.captures.map((capture) => ({
          ...capture,
          parser: { ...capture.parser, version: "9.9.9" },
        })),
      })),
    }),
  });
  await assert.rejects(
    replayReviewedCorpus(parserFixture.root, { name: "gold" }),
    /PARSER_REPLAY_MISMATCH/,
  );

  const corpusFixture = await buildRunFixture(t, {
    transformPortable: (portable) => ({
      ...portable,
      generatedAt: "2026-09-10T00:00:00Z",
    }),
  });
  await assert.rejects(
    replayReviewedCorpus(corpusFixture.root, { name: "gold" }),
    /CORPUS_REPLAY_MISMATCH/,
  );
});

test("writeLocalOutput fails closed on a tampered review seal", async (t) => {
  const fixture = await buildRunFixture(t);
  const replay = await replayReviewedCorpus(fixture.root, { name: "gold" });
  const sealPath = join(fixture.root, "review", "gold-seal.json");
  const seal = JSON.parse(await readFile(sealPath, "utf8"));
  seal.corpusDigest = "0".repeat(64);
  await writeFile(sealPath, JSON.stringify(seal));
  await assert.rejects(
    writeLocalOutput(
      fixture.root,
      replay.corpus,
      new Map([
        ["index.html", Buffer.from("<main>Authored synthetic output</main>")],
      ]),
      { name: "gold" },
    ),
    /OUTPUT_REVIEW_SEAL_MISMATCH/,
  );
});

test("readLocalOutput fails closed on a non-real-source-local run, a tampered pointer, manifest digest and served file bytes", async (t) => {
  mockPolicyFilesystem(t, {
    availableBytes: POLICY_LIMITS.freeBytes + POLICY_LIMITS.runBytes,
  });
  const synthetic = await buildSyntheticOnlyRoot(t);
  await assert.rejects(readLocalOutput(synthetic), /REAL_LOCAL_RUN_REQUIRED/);

  const pointerFixture = await buildRunFixture(t);
  const replayForPointer = await replayReviewedCorpus(pointerFixture.root, {
    name: "gold",
  });
  await writeLocalOutput(
    pointerFixture.root,
    replayForPointer.corpus,
    new Map([
      ["index.html", Buffer.from("<main>Authored synthetic output</main>")],
    ]),
    { name: "gold" },
  );
  await writeFile(
    join(pointerFixture.root, "review", "local-output-current.json"),
    JSON.stringify({
      version: "1.0.0",
      buildId: "not-a-build-id",
      manifestDigest: "0".repeat(64),
    }),
  );
  await assert.rejects(
    readLocalOutput(pointerFixture.root),
    /INVALID_OUTPUT_POINTER/,
  );

  const manifestFixture = await buildRunFixture(t);
  const replayForManifest = await replayReviewedCorpus(manifestFixture.root, {
    name: "gold",
  });
  const writtenForManifest = await writeLocalOutput(
    manifestFixture.root,
    replayForManifest.corpus,
    new Map([
      ["index.html", Buffer.from("<main>Authored synthetic output</main>")],
    ]),
    { name: "gold" },
  );
  const manifestPath = join(
    manifestFixture.root,
    "local-output",
    writtenForManifest.buildId,
    "output-manifest.json",
  );
  await writeFile(manifestPath, `${await readFile(manifestPath, "utf8")} `);
  await assert.rejects(
    readLocalOutput(manifestFixture.root),
    /OUTPUT_MANIFEST_DIGEST_MISMATCH/,
  );

  const fileFixture = await buildRunFixture(t);
  const replayForFile = await replayReviewedCorpus(fileFixture.root, {
    name: "gold",
  });
  const writtenForFile = await writeLocalOutput(
    fileFixture.root,
    replayForFile.corpus,
    new Map([
      ["index.html", Buffer.from("<main>Authored synthetic output</main>")],
    ]),
    { name: "gold" },
  );
  const indexPath = join(
    fileFixture.root,
    "local-output",
    writtenForFile.buildId,
    "index.html",
  );
  await writeFile(indexPath, "<main>Tampered synthetic output</main>");
  await assert.rejects(
    readLocalOutput(fileFixture.root),
    /OUTPUT_FILE_DIGEST_MISMATCH/,
  );
});

test("localCorpusBytes enforces the real_source_local trust domain and the full local display/export policy", () => {
  function localFixture(change = () => {}) {
    const input = JSON.parse(
      JSON.stringify(syntheticCorpusV2Input()).replaceAll(
        ".invalid",
        ".example",
      ),
    );
    input.trustDomain = "real_source_local";
    change(input);
    for (const capture of input.captures)
      capture.sourceProfileDigest = canonicalV2Digest(
        input.sourceProfiles.find(
          (profile) => profile.id === capture.sourceProfileId,
        ),
      );
    return createAnalyzedCorpusV2(input);
  }
  const valid = localFixture();
  assert.deepEqual(
    localCorpusBytes(valid),
    Buffer.from(serializeAnalyzedCorpusV2(valid)),
  );
  const syntheticInput = syntheticCorpusV2Input();
  for (const capture of syntheticInput.captures)
    capture.sourceProfileDigest = canonicalV2Digest(
      syntheticInput.sourceProfiles.find(
        (profile) => profile.id === capture.sourceProfileId,
      ),
    );
  const synthetic = createAnalyzedCorpusV2(syntheticInput);
  assert.equal(synthetic.trustDomain, "synthetic_test_only");
  assert.throws(
    () => localCorpusBytes(synthetic),
    /REAL_LOCAL_CORPUS_REQUIRED/,
  );
  const restricted = localFixture((input) => {
    input.sourceProfiles[0].uses.localExport = "prohibited";
  });
  assert.throws(
    () => localCorpusBytes(restricted),
    /FULL_LOCAL_DISPLAY_EXPORT_POLICY_REQUIRED/,
  );
});
