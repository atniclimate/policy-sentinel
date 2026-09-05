import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import * as search from "../src/engine/policy-search.mjs";
import * as core from "../src/pipeline/analyzed-corpus-v2.mjs";
import * as parser from "../src/pipeline/policy-text.mjs";
import * as custody from "../src/pipeline/policy-custody.mjs";

// Source-derived questions and expected passages remain in the owned external
// evaluation namespace. This CLI imports production APIs and does not score
// or tune search itself.
const usage =
  "Usage: npm run policy:evaluate -- --root <owned-root> --label <unique-label> [--name gold|research|discovery]";
if (process.argv.length === 3 && process.argv[2] === "--help") {
  process.stdout.write(usage + "\n");
  process.exit(0);
}
const options = {};
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  const value = args[i + 1];
  if (
    !["--root", "--label", "--name"].includes(key) ||
    Object.hasOwn(options, key) ||
    typeof value !== "string" ||
    !value ||
    value.startsWith("--")
  )
    throw Error(usage);
  options[key] = value;
}
const rootArg = options["--root"];
const runLabel = options["--label"];
const corpusName = options["--name"] ?? "gold";
if (
  !rootArg ||
  !/^[a-z][a-z0-9-]{0,40}$/.test(runLabel ?? "") ||
  !["gold", "research", "discovery"].includes(corpusName)
)
  throw Error(usage);
const corpusFile = "work/" + corpusName + "-corpus.json";
const root = path.resolve(rootArg);
// This validates owner identity, retained manifests, namespace/reparse safety
// and ledger integrity before any direct reads from the supplied root.
const ownedRun = await custody.openPolicyRun(root);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readBytes = (p) => {
  const target = path.join(root, p);
  const metadata = fs.statSync(target);
  assert.ok(
    metadata.isFile() && metadata.size <= 128 * 1024 ** 2,
    "bounded regular input required",
  );
  return fs.readFileSync(target);
};
const read = (p) => JSON.parse(readBytes(p));
const freezeBytes = readBytes("review/evaluation/freeze-v1.json");
assert.equal(
  sha(freezeBytes),
  "d81ebd287a02a1bfb355cdc85b46540433ca28bba9a8f8dfba8531c3bbec967c",
);
const freeze = JSON.parse(freezeBytes);
const firstPassBytes = readBytes("review/evaluation/first-pass-v1.json");
assert.equal(
  sha(firstPassBytes),
  "3f67d7c4e0a52902b6c1b7c5ed418b0acc61389a6b3797df4739a1f92405fb1a",
  "immutable first pass changed",
);
const sharedBytes = readBytes(freeze.shared.path),
  reservedBytes = readBytes(freeze.reserved.path);
assert.equal(sha(sharedBytes), freeze.shared.digest);
assert.equal(sha(reservedBytes), freeze.reserved.digest);
const shared = JSON.parse(sharedBytes),
  reserved = JSON.parse(reservedBytes);
const repairPlanPath = "review/evaluation/metadata-repair-plan-v1.json";
const repairAddendumPath = "review/evaluation/metadata-repair-addendum-v1.json";
let metadataRepair = null;
let originalGoldPath = "work/gold-corpus.json";
if (fs.existsSync(path.join(root, repairAddendumPath))) {
  const planBytes = readBytes(repairPlanPath);
  assert.equal(
    sha(planBytes),
    "58cd0113e196118b187e5327c66f3581539d22b06ab6521f009b7265de0dcf09",
    "independently frozen omission repair plan changed",
  );
  const plan = JSON.parse(planBytes);
  const addendumBytes = readBytes(repairAddendumPath);
  assert.equal(
    sha(addendumBytes),
    "c8eb49eac22449188376d2da6beefc5213bb4cc604faf68c0596aab7ca15e171",
    "independent metadata repair validation changed",
  );
  const addendum = JSON.parse(addendumBytes);
  assert.equal(addendum.kind, "independent_metadata_only_repair_validation");
  assert.equal(addendum.status, "accepted_metadata_only");
  assert.equal(addendum.plan.path, repairPlanPath);
  assert.equal(addendum.plan.sha256, sha(planBytes));
  assert.equal(addendum.originalFreezeSha256, sha(freezeBytes));
  assert.deepEqual(addendum.correctedGold, plan.expectedGold);
  assert.deepEqual(addendum.correctedResearch, plan.expectedResearch);
  for (const original of plan.originals) {
    assert.equal(sha(readBytes(original.preservedPath)), original.sha256);
  }
  const priorGold = plan.originals.find(
    (entry) => entry.originalPath === "work/gold-corpus.json",
  );
  originalGoldPath = priorGold.preservedPath;
  metadataRepair = {
    plan,
    planSha256: sha(planBytes),
    addendumPath: repairAddendumPath,
    addendumSha256: sha(addendumBytes),
  };
}
const originalGoldBytes = readBytes(originalGoldPath);
const originalGold = core.parseAnalyzedCorpusV2(JSON.parse(originalGoldBytes));
assert.equal(sha(originalGoldBytes), freeze.corpusFileSha256);
assert.equal(originalGold.contentDigest, freeze.corpusDigest);
const goldBytes = readBytes("work/gold-corpus.json");
const gold = core.parseAnalyzedCorpusV2(JSON.parse(goldBytes));
if (metadataRepair) {
  const { plan } = metadataRepair;
  assert.equal(sha(goldBytes), plan.expectedGold.fileSha256);
  assert.equal(gold.contentDigest, plan.expectedGold.corpusDigest);
  const stripOmissionMetadata = (value) => {
    const copy = JSON.parse(JSON.stringify(value));
    delete copy.contentDigest;
    for (const rendition of copy.renditions) {
      delete rendition.contentDigest;
      delete rendition.omittedSourceLocators;
    }
    return copy;
  };
  assert.deepEqual(
    stripOmissionMetadata(gold),
    stripOmissionMetadata(originalGold),
    "repair changed evidence beyond omission metadata",
  );
  assert.equal(gold.renditions.length, plan.expectedRenditions.length);
  for (const expected of plan.expectedRenditions) {
    const before = originalGold.renditions.find(
      (entry) => entry.id === expected.renditionId,
    );
    const after = gold.renditions.find(
      (entry) => entry.id === expected.renditionId,
    );
    assert.deepEqual([...before.omittedSourceLocators], expected.priorLocators);
    assert.deepEqual(
      [...after.omittedSourceLocators],
      expected.expectedLocators,
    );
  }
  for (const originalPath of [
    "review/gold-input.json",
    "review/gold-evidence-index.json",
  ]) {
    const expected = plan.originals.find(
      (entry) => entry.originalPath === originalPath,
    );
    assert.equal(sha(readBytes(originalPath)), expected.sha256);
  }
} else {
  assert.equal(sha(goldBytes), freeze.corpusFileSha256);
  assert.equal(gold.contentDigest, freeze.corpusDigest);
}
const corpusBytes = readBytes(corpusFile),
  corpus = core.parseAnalyzedCorpusV2(JSON.parse(corpusBytes));
if (metadataRepair && corpusName === "research") {
  assert.equal(
    sha(corpusBytes),
    metadataRepair.plan.expectedResearch.fileSha256,
  );
  assert.equal(
    corpus.contentDigest,
    metadataRepair.plan.expectedResearch.corpusDigest,
  );
}
assert.equal(freeze.runId, ownedRun.owner.runId);
assert.equal(corpus.runId, ownedRun.owner.runId);
assert.equal(corpus.trustDomain, ownedRun.owner.trustDomain);
// An enriched/discovery run is a separately labeled evaluation population.
// Every frozen source entity must be byte-for-byte semantically unchanged.
for (const collection of [
  "works",
  "versions",
  "renditions",
  "segments",
  "captures",
]) {
  const actual = new Map(corpus[collection].map((v) => [v.id, v]));
  for (const entity of gold[collection])
    assert.equal(
      actual.get(entity.id)?.contentDigest,
      entity.contentDigest,
      "changed frozen entity " + entity.id,
    );
}
const resultPath = "review/evaluation/" + runLabel + ".json";
assert.equal(
  fs.existsSync(path.join(root, resultPath)),
  false,
  "immutable result already exists",
);
const currentCodePins = Object.fromEntries(
  Object.keys(freeze.codePins).map((p) => [
    p,
    sha(fs.readFileSync(new URL("../" + p, import.meta.url))),
  ]),
);
const changedCode = Object.keys(currentCodePins).filter(
  (p) => currentCodePins[p] !== freeze.codePins[p],
);
const startedAt = new Date().toISOString();
const index = search.createPolicySearchIndex(corpus);
const questions = [...shared.questions, ...reserved.questions].sort((a, b) =>
  a.id.localeCompare(b.id),
);
const questionResults = questions.map((q) => {
  const result = search.searchPolicyCorpus(index, q.request);
  const pool = result.hits
    .flatMap((h, di) =>
      h.passages.map((p, pi) => ({
        ...p,
        documentRank: di + 1,
        localRank: pi + 1,
        versionId: h.versionId,
      })),
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.documentRank - b.documentRank ||
        a.localRank - b.localRank,
    );
  const top20 = pool.slice(0, 20);
  const requiredPassages = q.requiredSupport.map((e) => ({
    segmentId: e.segmentId,
    versionId: e.versionId,
    rank: pool.findIndex((p) => p.segmentId === e.segmentId) + 1 || null,
    foundTop20: top20.some((p) => p.segmentId === e.segmentId),
  }));
  const versionResults = q.requiredVersionIds.map((versionId) => ({
    versionId,
    rank: result.hits.findIndex((h) => h.versionId === versionId) + 1 || null,
  }));
  return {
    id: q.id,
    reserved: q.reserved,
    disposition: q.disposition,
    request: q.request,
    tags: q.tags,
    completeSupportingVersions:
      q.disposition === "answerable"
        ? versionResults.every((v) => v.rank !== null && v.rank <= 10)
        : null,
    versionResults,
    requiredPassages,
    completeSupportingPassages:
      q.disposition === "answerable"
        ? requiredPassages.every((p) => p.foundTop20)
        : null,
    forbiddenHits: result.hits
      .filter((h) => (q.tags.forbiddenVersionIds ?? []).includes(h.versionId))
      .map((h) => h.versionId),
    futureEventIds: q.tags.temporalCase
      ? result.hits
          .flatMap((h) => h.eventIds)
          .filter((id) => {
            const e = corpus.events.find((e) => e.id === id);
            return (
              e?.sourceStatedAt.value && e.sourceStatedAt.value > q.request.asOf
            );
          })
      : [],
    requiredUnknownWorkIdsPreserved: (q.tags.unknownWorkIds ?? []).every((id) =>
      result.temporal?.unknownWorkIds.includes(id),
    ),
    hasAnswerOutput:
      Object.hasOwn(result, "answer") || Object.hasOwn(result, "conclusion"),
    result,
    globalTop20: top20,
  };
});
const identifierResults = shared.identifierChecks.map((check) => {
  const result = search.searchPolicyCorpus(index, {
    query: check.query,
    limit: 1,
    passageLimit: 1,
  });
  const top = result.hits[0];
  return {
    ...check,
    actualWorkId: top?.workId ?? null,
    actualVersionId: top?.versionId ?? null,
    exactIdentifierMatch: top?.exactIdentifierMatch ?? false,
    pass:
      top?.workId === check.expectedWorkId &&
      (!check.expectedVersionId || top?.versionId === check.expectedVersionId),
  };
});
const input = read("review/gold-input.json"),
  ledger = read("ledger.json");
const manifest = read("manifests/" + ledger.manifestDigest + ".json");
const evidence = [
  ...new Map(
    questions
      .flatMap((q) => [...q.requiredSupport, ...q.contraryEvidence])
      .map((e) => [e.segmentId, e]),
  ).values(),
];
const parserCache = new Map(),
  replayResults = [];
for (const e of evidence) {
  try {
    const rendition = corpus.renditions.find((r) => r.id === e.renditionId);
    const capture = corpus.captures.find((c) => c.id === e.captureId);
    const descriptor = input.items
      .find((i) => i.version.id === e.versionId)
      .captures.find((x) => x.operationId === capture.operationId);
    const target = manifest.targets.find((t) => t.url === capture.requestedUrl);
    const replay = core.replayCorpusCitation({
      corpus,
      segmentId: e.segmentId,
      objectBytes: readBytes(capture.objectPath),
      renditionBytes: Buffer.from(rendition.text),
      reextract: (bytes, recipe, mediaType) => {
        if (!parserCache.has(rendition.id)) {
          const extracted = parser.extractPolicyText({
            bytes,
            mediaType,
            sourceKind: descriptor.sourceKind,
            url: capture.finalUrl,
            expectedIdentity: target.expectedIdentity,
            excludedBlockLocators: descriptor.excludedBlockLocators,
          });
          // Validated objects intentionally have null prototypes. Compare the
          // declared scalar values; do not weaken the byte or digest checks.
          for (const field of ["id", "version", "configDigest"])
            assert.equal(extracted.parser[field], recipe[field], field);
          parserCache.set(rendition.id, Buffer.from(extracted.text));
        }
        return parserCache.get(rendition.id);
      },
    });
    for (const field of [
      "versionId",
      "objectDigest",
      "renditionDigest",
      "textDigest",
      "contextDigest",
      "quote",
    ])
      assert.equal(replay[field], e[field], field);
    assert.deepEqual(JSON.parse(JSON.stringify(replay.locator)), e.locator);
    const reader = search.policySearchPassage(index, e.segmentId, {
      maxCharacters: 100000,
    });
    assert.equal(reader.text, e.quote);
    assert.equal(reader.truncated, false);
    replayResults.push({
      segmentId: e.segmentId,
      versionId: e.versionId,
      pass: true,
      parserReplay: replay.parserReplay,
    });
  } catch (error) {
    replayResults.push({
      segmentId: e.segmentId,
      versionId: e.versionId,
      pass: false,
      error: error.code ?? error.message,
      message: error.message,
    });
  }
}
const summarize = (rows) => {
  const answerable = rows.filter((r) => r.disposition === "answerable");
  const multi = answerable.filter((r) => r.tags.multiDocument);
  const spans = answerable.flatMap((r) => r.requiredPassages),
    versions = answerable.flatMap((r) => r.versionResults);
  return {
    questions: rows.length,
    answerable: answerable.length,
    unsupported: rows.length - answerable.length,
    completeSupportingVersionQuestions: answerable.filter(
      (r) => r.completeSupportingVersions,
    ).length,
    requiredSupportingVersionInstances: versions.length,
    recoveredSupportingVersionInstances: versions.filter(
      (v) => v.rank !== null && v.rank <= 10,
    ).length,
    multiDocument: multi.length,
    completeMultiDocument: multi.filter((r) => r.completeSupportingVersions)
      .length,
    requiredSupportingPassageInstances: spans.length,
    recoveredSupportingPassageInstances: spans.filter((p) => p.foundTop20)
      .length,
    completePassageQuestions: answerable.filter(
      (r) => r.completeSupportingPassages,
    ).length,
    forbiddenHits: rows.reduce((n, r) => n + r.forbiddenHits.length, 0),
    futureEventLeakage: rows.reduce((n, r) => n + r.futureEventIds.length, 0),
    requiredUnknownsPreserved: rows.every(
      (r) => r.requiredUnknownWorkIdsPreserved,
    ),
    answerOutputs: rows.filter((r) => r.hasAnswerOutput).length,
  };
};
const summary = {
  overall: summarize(questionResults),
  shared: summarize(questionResults.filter((r) => !r.reserved)),
  reserved: summarize(questionResults.filter((r) => r.reserved)),
  identifiers: {
    total: identifierResults.length,
    passed: identifierResults.filter((r) => r.pass).length,
  },
  citationReplay: {
    uniqueSegments: replayResults.length,
    passed: replayResults.filter((r) => r.pass).length,
    parserRenditions: parserCache.size,
  },
};
const o = summary.overall;
const acceptance = {
  exactIdentifiers: summary.identifiers.passed === summary.identifiers.total,
  supportingVersionQuestions:
    o.completeSupportingVersionQuestions >= Math.ceil(o.answerable * 0.9),
  multiDocument: o.completeMultiDocument >= Math.ceil(o.multiDocument * 0.9),
  supportingPassages:
    o.recoveredSupportingPassageInstances >=
    Math.ceil(o.requiredSupportingPassageInstances * 0.9),
  citationReplay:
    summary.citationReplay.passed === summary.citationReplay.uniqueSegments,
  temporal:
    o.forbiddenHits === 0 &&
    o.futureEventLeakage === 0 &&
    o.requiredUnknownsPreserved,
  noAutomaticAnswer: o.answerOutputs === 0,
};
const record = {
  version: "1.0.0",
  kind: "independent_frozen_gold_regression",
  runLabel,
  startedAt,
  completedAt: new Date().toISOString(),
  freezeDigest: sha(freezeBytes),
  immutableFirstPassDigest: sha(firstPassBytes),
  evaluatorFileSha256: sha(fs.readFileSync(new URL(import.meta.url))),
  corpusFile,
  corpusDigest: corpus.contentDigest,
  corpusFileSha256: sha(corpusBytes),
  frozenGoldCorpusDigest: freeze.corpusDigest,
  activeGoldCorpusDigest: gold.contentDigest,
  metadataRepair: metadataRepair
    ? {
        planSha256: metadataRepair.planSha256,
        addendumPath: metadataRepair.addendumPath,
        addendumSha256: metadataRepair.addendumSha256,
        originalGoldPath,
        originalGoldFileSha256: sha(originalGoldBytes),
        correctedGoldFileSha256: sha(goldBytes),
      }
    : null,
  corpusPopulationChanged: ["works", "versions"].some(
    (name) =>
      core.canonicalV2Digest(corpus[name].map((entry) => entry.id)) !==
      core.canonicalV2Digest(gold[name].map((entry) => entry.id)),
  ),
  corpusGraphChangedFromGold: corpus.contentDigest !== gold.contentDigest,
  currentCodePins,
  changedCode,
  summary,
  acceptance,
  questionResults,
  identifierResults,
  replayResults,
  qualifications: [
    "The original first pass remains immutable; formerly reserved questions are revealed regressions.",
    "Requests, support expectations, ranking rule and thresholds are unchanged from the source-authored freeze.",
    "Search emits ranked sources, not automatic answers; generated-answer abstention accuracy is not measured.",
    "This does not substitute for source-status display, analytical claim, broad coverage or browser acceptance.",
  ],
};
const written = await custody.writePolicyDerived(
  root,
  resultPath,
  Buffer.from(JSON.stringify(record, null, 2) + "\n"),
  { replace: false },
);
console.log(
  JSON.stringify(
    {
      written,
      summary,
      acceptance,
      misses: questionResults
        .filter(
          (r) =>
            r.disposition === "answerable" &&
            (!r.completeSupportingVersions || !r.completeSupportingPassages),
        )
        .map((r) => ({
          id: r.id,
          missingVersions: r.versionResults.filter((v) => v.rank === null),
          missingPassages: r.requiredPassages.filter((p) => !p.foundTop20),
        })),
      failedIdentifiers: identifierResults.filter((r) => !r.pass),
      failedReplays: replayResults.filter((r) => !r.pass),
    },
    null,
    2,
  ),
);
if (Object.values(acceptance).some((v) => !v)) process.exitCode = 2;
