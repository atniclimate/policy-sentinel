import { Buffer } from "node:buffer";
import {
  parseAnalyzedCorpusV2,
  createAnalyzedCorpusV2,
} from "../../../pipeline/analyzed-corpus-v2.mjs";
import { sha256Bytes as digest } from "../../../pipeline/hashing.mjs";
import { safeFile } from "../../../core/local-output-bindings.mjs";
import { localCorpusBytes, validateLocalOutputFiles } from "./write.mjs";

const fail = (code) => {
  throw new Error(code);
};

function checksumOutputSnapshot(output, run) {
  if (
    !output ||
    !(output.files instanceof Map) ||
    !output.manifest ||
    !/^[a-f0-9]{64}$/.test(output.manifestDigest) ||
    digest(Buffer.from(`${JSON.stringify(output.manifest, null, 2)}\n`)) !==
      output.manifestDigest ||
    !Array.isArray(output.manifest.files) ||
    output.manifest.files.length !== output.files.size ||
    output.manifest.files.length > 1000 ||
    output.manifest.runId !== run.owner.runId ||
    output.manifest.publication !== "closed"
  )
    fail("SIMULATION_APPROVED_OUTPUT_CHECKSUM_REQUIRED");
  const seen = new Set();
  for (const entry of output.manifest.files) {
    const bytes = output.files.get(entry.path);
    if (
      !safeFile(entry.path) ||
      seen.has(entry.path) ||
      !Buffer.isBuffer(bytes) ||
      bytes.length !== entry.bytes ||
      digest(bytes) !== entry.digest
    )
      fail("SIMULATION_OUTPUT_FILE_CHECKSUM_MISMATCH");
    seen.add(entry.path);
  }
  validateLocalOutputFiles(output.files, output.manifest, run);
  return parseAnalyzedCorpusV2(
    JSON.parse(output.files.get("corpus.json").toString("utf8")),
  );
}

/**
 * Controlled failure projection only, with no acquisition, retry, filesystem write
 * or normal output-pointer change. The caller supplies a reviewed snapshot from
 * readLocalOutput; its manifest checksum, files, source policies and capture
 * receipts are checked again here. A prior snapshot must be the exact accepted
 * baseline under test. This is not a general refresh/merge or automatic fallback.
 */
export function simulateLocalSourceFailure({
  output,
  run,
  sourceProfileId,
  generatedAt,
  priorOutput = null,
}) {
  const baseline = checksumOutputSnapshot(output, run);
  const health = baseline.coverage.find(
    (entry) => entry.sourceProfileId === sourceProfileId,
  );
  if (!health || health.status !== "healthy")
    fail("SIMULATION_HEALTHY_SOURCE_REQUIRED");
  if (
    !Number.isFinite(Date.parse(generatedAt)) ||
    Date.parse(generatedAt) <= Date.parse(baseline.generatedAt)
  )
    fail("SIMULATION_LATER_TIME_REQUIRED");
  let prior = null;
  if (priorOutput !== null) {
    prior = checksumOutputSnapshot(priorOutput, run);
    if (
      prior.contentDigest !== baseline.contentDigest ||
      priorOutput.manifestDigest !== output.manifestDigest
    )
      fail("SIMULATION_EXACT_APPROVED_BASELINE_REQUIRED");
  }
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
  const input = Object.fromEntries(
    ["id", "runId", "trustDomain", ...catalogs].map((key) => [
      key,
      JSON.parse(JSON.stringify(baseline[key])),
    ]),
  );
  input.generatedAt = generatedAt;
  const selectedHealth = input.coverage.find(
    (entry) => entry.sourceProfileId === sourceProfileId,
  );
  selectedHealth.failureStage = "controlled_refresh_failure_simulation";
  selectedHealth.limitations = [
    ...new Set([
      ...selectedHealth.limitations,
      "Controlled local failure simulation; no provider failure was induced and no automatic refresh is implemented.",
    ]),
  ];
  if (prior) {
    selectedHealth.status = "degraded";
    selectedHealth.lastKnownGoodDigest = prior.contentDigest;
  } else {
    const works = new Set(
      input.works
        .filter((entry) => entry.sourceProfileId === sourceProfileId)
        .map((entry) => entry.id),
    );
    const versions = new Set(
      input.versions
        .filter((entry) => works.has(entry.workId))
        .map((entry) => entry.id),
    );
    const renditions = new Set(
      input.renditions
        .filter((entry) => versions.has(entry.versionId))
        .map((entry) => entry.id),
    );
    const segments = new Set(
      input.segments
        .filter((entry) => renditions.has(entry.renditionId))
        .map((entry) => entry.id),
    );
    input.captures = input.captures.filter(
      (entry) => entry.sourceProfileId !== sourceProfileId,
    );
    input.works = input.works.filter((entry) => !works.has(entry.id));
    input.versions = input.versions.filter((entry) => !versions.has(entry.id));
    input.renditions = input.renditions.filter(
      (entry) => !renditions.has(entry.id),
    );
    input.segments = input.segments.filter((entry) => !segments.has(entry.id));
    input.events = input.events.filter(
      (entry) => !versions.has(entry.versionId),
    );
    input.relationships = input.relationships
      .filter((entry) => !versions.has(entry.fromVersionId))
      .map((entry) => {
        if (
          versions.has(entry.target.versionId) ||
          entry.target.candidateVersionIds.some((id) => versions.has(id))
        )
          return {
            ...entry,
            target: {
              state: "unresolved",
              workId: null,
              versionId: null,
              sourceIdentifier: entry.target.sourceIdentifier,
              candidateVersionIds: [],
            },
          };
        return entry;
      });
    input.analyses = input.analyses.filter(
      (entry) => !versions.has(entry.versionId),
    );
    input.findings = input.findings.filter(
      (entry) =>
        !entry.populationVersionIds.some((id) => versions.has(id)) &&
        ![...entry.supportingSegmentIds, ...entry.contrarySegmentIds].some(
          (id) => segments.has(id),
        ),
    );
    Object.assign(selectedHealth, {
      status: "unavailable",
      documentCount: 0,
      versionCount: 0,
      dataAsOf: null,
      lastSuccessfulAt: null,
      lastKnownGoodDigest: null,
      from: { value: null, precision: "unknown" },
      through: { value: null, precision: "unknown" },
    });
  }
  const replayOptions = { lastKnownGoodCorpora: prior ? [prior] : [] };
  for (const name of catalogs)
    for (const entry of input[name]) delete entry.contentDigest;
  const corpus = createAnalyzedCorpusV2(input, replayOptions);
  const corpusBytes = localCorpusBytes(corpus, replayOptions);
  const profile = {
    kind: "policy_local_profile",
    schemaVersion: "1.0.0",
    trustDomain: "real_source_local",
    corpusDigest: corpus.contentDigest,
    corpusFile: "corpus.json",
    corpusFileDigest: digest(corpusBytes),
    corpusBytes: corpusBytes.length,
    publication: "closed",
  };
  const files = new Map([
    [
      "index.html",
      Buffer.from(
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Controlled source-failure simulation</title></head><body><main><h1>Controlled source-failure simulation</h1><p>This separate in-memory projection tests source health and retained evidence. It does not implement automatic refresh or replace the reviewed workbench output.</p><p><a href="corpus.json">Inspect simulated corpus and coverage</a></p></main></body></html>\n',
      ),
    ],
    ["corpus.json", corpusBytes],
    [
      "local-profile.json",
      Buffer.from(`${JSON.stringify(profile, null, 2)}\n`),
    ],
  ]);
  const manifest = {
    version: "1.0.0",
    kind: "controlled_source_failure_output",
    runId: corpus.runId,
    corpusDigest: corpus.contentDigest,
    baselineCorpusDigest: baseline.contentDigest,
    priorManifestDigest: prior ? priorOutput.manifestDigest : null,
    publication: "closed",
    files: [...files].map(([path, bytes]) => ({
      path,
      digest: digest(bytes),
      bytes: bytes.length,
    })),
  };
  validateLocalOutputFiles(files, manifest, run, replayOptions);
  return {
    corpus,
    files,
    manifest,
    replayOptions,
    sourceProfileId,
    status: selectedHealth.status,
    automaticRefresh: false,
    normalOutputChanged: false,
  };
}
