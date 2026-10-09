import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { request } from "node:http";
import test from "node:test";
import {
  createLoopbackOutputServer,
  simulateLocalSourceFailure,
  validateLocalOutputFiles,
} from "../../src/pipeline/policy-local-output.mjs";
import {
  canonicalV2Digest,
  createSupportedAnalyzedCorpus,
  serializeSupportedAnalyzedCorpus,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";
import { digest } from "../../src/pipeline/policy-custody.mjs";
import { syntheticCorpusV2Input } from "./analyzed-corpus-v2.test.mjs";
import * as legacyLocalOutput from "../../src/pipeline/policy-local-output.mjs";
import { replayReviewedCorpus as intakeReplay } from "../../src/modules/intake/replay.mjs";
import {
  localCorpusBytes as outputBytes,
  validateLocalOutputFiles as outputValidation,
} from "../../src/modules/output/local-workbench/write.mjs";
import {
  writeLocalOutput as composedWrite,
  readLocalOutput as composedRead,
} from "../../scripts/policy-local-output.mjs";
import { simulateLocalSourceFailure as outputFailure } from "../../src/modules/output/local-workbench/failure-simulation.mjs";
import { createLoopbackOutputServer as outputServer } from "../../src/modules/output/local-workbench/loopback-server.mjs";

test("legacy local output preserves exactly seven direct bindings", () => {
  const direct = {
    replayReviewedCorpus: intakeReplay,
    localCorpusBytes: outputBytes,
    writeLocalOutput: composedWrite,
    readLocalOutput: composedRead,
    validateLocalOutputFiles: outputValidation,
    simulateLocalSourceFailure: outputFailure,
    createLoopbackOutputServer: outputServer,
  };
  assert.deepEqual(
    Object.keys(legacyLocalOutput).sort(),
    Object.keys(direct).sort(),
  );
  for (const [name, binding] of Object.entries(direct))
    assert.strictEqual(legacyLocalOutput[name], binding);
});

function semanticFixture(change = () => {}, schemaVersion = "2.0.0") {
  const input = JSON.parse(
    JSON.stringify(syntheticCorpusV2Input()).replaceAll(".invalid", ".example"),
  );
  input.trustDomain = "real_source_local";
  change(input);
  for (const capture of input.captures)
    capture.sourceProfileDigest = canonicalV2Digest(
      input.sourceProfiles.find(
        (profile) => profile.id === capture.sourceProfileId,
      ),
    );
  const corpus = createSupportedAnalyzedCorpus(input, schemaVersion);
  const bytes = Buffer.from(serializeSupportedAnalyzedCorpus(corpus));
  const profile = {
    kind: "policy_local_profile",
    schemaVersion: "1.0.0",
    trustDomain: "real_source_local",
    corpusDigest: corpus.contentDigest,
    corpusFile: "corpus.json",
    corpusFileDigest: digest(bytes),
    corpusBytes: bytes.length,
    publication: "closed",
  };
  const run = {
    owner: { runId: corpus.runId },
    manifest: {
      profiles: corpus.sourceProfiles.map((source) =>
        Object.fromEntries(
          ["id", "hosts", "pathPrefixes", "review", "uses"].map((key) => [
            key,
            source[key],
          ]),
        ),
      ),
    },
    ledger: {
      operations: Object.fromEntries(
        corpus.captures.map((capture) => [
          capture.operationId,
          {
            state: "complete",
            profileId: capture.sourceProfileId,
            objectDigest: capture.objectDigest,
            url: capture.requestedUrl,
            finalUrl: capture.finalUrl,
            completedAt: capture.retrievedAt,
            mediaType: capture.mediaType,
            decodedBytes: capture.decodedBytes,
            encodedBytes: capture.encodedBytes,
          },
        ]),
      ),
    },
  };
  return {
    files: new Map([
      ["corpus.json", bytes],
      ["local-profile.json", Buffer.from(JSON.stringify(profile))],
    ]),
    manifest: { corpusDigest: corpus.contentDigest },
    run,
    profile,
  };
}
test("serve admission validates semantics and custody reuse permissions beyond matching file hashes", () => {
  const valid = semanticFixture();
  assert.equal(
    validateLocalOutputFiles(valid.files, valid.manifest, valid.run).valid,
    true,
  );
  const mismatch = semanticFixture();
  mismatch.manifest.corpusDigest = "0".repeat(64);
  assert.throws(
    () =>
      validateLocalOutputFiles(mismatch.files, mismatch.manifest, mismatch.run),
    /OUTPUT_CORPUS_BINDING_MISMATCH/,
  );
  const wrongProfile = semanticFixture();
  wrongProfile.profile.corpusFileDigest = "0".repeat(64);
  wrongProfile.files.set(
    "local-profile.json",
    Buffer.from(JSON.stringify(wrongProfile.profile)),
  );
  assert.throws(
    () =>
      validateLocalOutputFiles(
        wrongProfile.files,
        wrongProfile.manifest,
        wrongProfile.run,
      ),
    /OUTPUT_PROFILE_BINDING_MISMATCH/,
  );
  const restricted = semanticFixture((input) => {
    input.sourceProfiles[0].uses.localExport = "prohibited";
  });
  assert.throws(
    () =>
      validateLocalOutputFiles(
        restricted.files,
        restricted.manifest,
        restricted.run,
      ),
    /FULL_LOCAL_DISPLAY_EXPORT_POLICY_REQUIRED/,
  );
  const policyDrift = semanticFixture();
  policyDrift.run.manifest.profiles = JSON.parse(
    JSON.stringify(policyDrift.run.manifest.profiles),
  );
  policyDrift.run.manifest.profiles[0].uses.localDisplay = "metadata_link";
  assert.throws(
    () =>
      validateLocalOutputFiles(
        policyDrift.files,
        policyDrift.manifest,
        policyDrift.run,
      ),
    /SOURCE_POLICY_ADMISSION_MISMATCH/,
  );
  const fakeCapture = semanticFixture();
  fakeCapture.run.ledger.operations = {};
  assert.throws(
    () =>
      validateLocalOutputFiles(
        fakeCapture.files,
        fakeCapture.manifest,
        fakeCapture.run,
      ),
    /OUTPUT_CAPTURE_ADMISSION_MISMATCH/,
  );
});

function get(server, path = "/", headers = {}, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: "127.0.0.1",
        port: server.address().port,
        path,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function approvedSnapshot(fixture) {
  const files = new Map(fixture.files);
  files.set(
    "index.html",
    Buffer.from("<main>Authored approved synthetic baseline</main>"),
  );
  const manifest = {
    version: "1.0.0",
    runId: fixture.run.owner.runId,
    buildId: "build-" + "a".repeat(32),
    corpusDigest: fixture.manifest.corpusDigest,
    publication: "closed",
    files: [...files].map(([path, bytes]) => ({
      path,
      bytes: bytes.length,
      digest: digest(bytes),
    })),
  };
  return {
    files,
    manifest,
    manifestDigest: digest(
      Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
    ),
  };
}

test("controlled source failure exercises actual local output validation and serving with explicit prior proof or unavailability", async (t) => {
  const fixture = semanticFixture();
  const output = approvedSnapshot(fixture);
  const originalBytes = Buffer.from(output.files.get("corpus.json"));
  const request = {
    output,
    run: fixture.run,
    sourceProfileId: "profile-a",
    generatedAt: "2026-09-04T00:00:00Z",
  };
  const degraded = simulateLocalSourceFailure({
    ...request,
    priorOutput: output,
  });
  const before = JSON.parse(originalBytes.toString("utf8"));
  const stale = degraded.corpus.coverage.find(
    (entry) => entry.sourceProfileId === "profile-a",
  );
  assert.equal(stale.status, "degraded");
  assert.equal(stale.lastKnownGoodDigest, before.contentDigest);
  assert.equal(stale.dataAsOf, before.coverage[0].dataAsOf);
  assert.equal(stale.lastSuccessfulAt, before.coverage[0].lastSuccessfulAt);
  assert.equal(
    canonicalV2Digest(degraded.corpus.captures),
    canonicalV2Digest(before.captures),
  );
  assert.equal(
    canonicalV2Digest(degraded.corpus.segments),
    canonicalV2Digest(before.segments),
  );
  assert.equal(
    degraded.corpus.coverage.find(
      (entry) => entry.sourceProfileId === "profile-b",
    ).status,
    "healthy",
  );
  assert.throws(
    () =>
      validateLocalOutputFiles(degraded.files, degraded.manifest, fixture.run),
    /VERIFIED_PRIOR_CORPUS_REQUIRED/u,
  );
  assert.equal(
    validateLocalOutputFiles(
      degraded.files,
      degraded.manifest,
      fixture.run,
      degraded.replayOptions,
    ).valid,
    true,
  );
  const unavailable = simulateLocalSourceFailure(request);
  assert.equal(unavailable.status, "unavailable");
  assert.deepEqual(
    unavailable.corpus.works.map((entry) => entry.id),
    ["work-b"],
  );
  assert.equal(unavailable.corpus.coverage[0].dataAsOf, null);
  assert.equal(unavailable.corpus.coverage[0].lastKnownGoodDigest, null);
  assert.equal(unavailable.corpus.relationships[0].target.state, "unresolved");
  assert.equal(unavailable.corpus.relationships[0].target.versionId, null);
  assert.equal(unavailable.corpus.findings.length, 0);
  assert.equal(unavailable.automaticRefresh, false);
  assert.equal(unavailable.normalOutputChanged, false);
  assert.ok(output.files.get("corpus.json").equals(originalBytes));
  for (const scenario of [degraded, unavailable]) {
    const server = await createLoopbackOutputServer(scenario.files, 0);
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const response = await get(server, "/corpus.json");
    assert.equal(response.status, 200);
    const served = JSON.parse(response.body);
    assert.equal(served.contentDigest, scenario.corpus.contentDigest);
    assert.equal(served.coverage[0].status, scenario.status);
    assert.equal((await get(server, "/review/gold-seal.json")).status, 404);
  }
});

test("2.1 local failure retains exact same-work associations with prior proof and omits failed-source works without prior proof", () => {
  const fixture = semanticFixture((input) => {
    for (const work of input.works) {
      const version = input.versions.find((row) => row.workId === work.id);
      const rendition = input.renditions.find(
        (row) => row.versionId === version.id,
      );
      const segment = input.segments.find(
        (row) => row.renditionId === rendition.id,
      );
      const capture = input.captures.find(
        (row) => row.id === rendition.captureId,
      );
      const ref = "body:synthetic-" + work.id;
      work.jurisdictionRefs = [
        {
          jurisdictionRef: ref,
          basis: "source_stated_scope",
          evidence: {
            url: capture.finalUrl,
            locator: segment.locator.value,
            exactSubject: { recordRef: work.id, ref, text: work.title },
          },
          reviewState: "reviewed",
          versionId: version.id,
          segmentIds: [segment.id],
          reviewer: {
            name: "Synthetic reviewer",
            kind: "human",
            reviewedAt: "2026-09-02T01:00:00Z",
          },
        },
      ];
    }
  }, "2.1.0");
  const output = approvedSnapshot(fixture);
  const before = JSON.parse(output.files.get("corpus.json").toString("utf8"));
  const request = {
    output,
    run: fixture.run,
    sourceProfileId: "profile-a",
    generatedAt: "2026-09-04T00:00:00Z",
  };
  const degraded = simulateLocalSourceFailure({
    ...request,
    priorOutput: output,
  });
  assert.equal(degraded.corpus.schemaVersion, "2.1.0");
  assert.equal(
    canonicalV2Digest(degraded.corpus.works),
    canonicalV2Digest(before.works),
  );
  assert.equal(
    validateLocalOutputFiles(
      degraded.files,
      degraded.manifest,
      fixture.run,
      degraded.replayOptions,
    ).valid,
    true,
  );
  assert.equal(
    degraded.corpus.coverage[0].dataAsOf,
    before.coverage[0].dataAsOf,
  );
  assert.throws(
    () =>
      validateLocalOutputFiles(degraded.files, degraded.manifest, fixture.run),
    /VERIFIED_PRIOR_CORPUS_REQUIRED/u,
  );
  const unavailable = simulateLocalSourceFailure(request);
  assert.equal(unavailable.corpus.schemaVersion, "2.1.0");
  assert.equal(
    canonicalV2Digest(unavailable.corpus.works),
    canonicalV2Digest(before.works.filter((row) => row.id === "work-b")),
  );
  assert.equal(unavailable.corpus.coverage[0].status, "unavailable");
  assert.equal(unavailable.corpus.coverage[0].dataAsOf, null);
  assert.equal(
    validateLocalOutputFiles(
      unavailable.files,
      unavailable.manifest,
      fixture.run,
    ).valid,
    true,
  );
  assert.deepEqual(
    JSON.parse(output.files.get("corpus.json").toString("utf8")),
    before,
  );
});

test("controlled failure rejects wrong prior checksums, source policies and unsupported prior baselines", () => {
  const fixture = semanticFixture();
  const output = approvedSnapshot(fixture);
  const request = {
    output,
    run: fixture.run,
    sourceProfileId: "profile-a",
    generatedAt: "2026-09-04T00:00:00Z",
  };
  const corrupted = { ...output, files: new Map(output.files) };
  corrupted.files.set("corpus.json", Buffer.from("{}"));
  assert.throws(
    () => simulateLocalSourceFailure({ ...request, priorOutput: corrupted }),
    /SIMULATION_OUTPUT_FILE_CHECKSUM_MISMATCH/u,
  );
  assert.throws(
    () =>
      simulateLocalSourceFailure({
        ...request,
        priorOutput: { ...output, manifestDigest: "0".repeat(64) },
      }),
    /SIMULATION_APPROVED_OUTPUT_CHECKSUM_REQUIRED/u,
  );
  const differentPolicy = approvedSnapshot(
    semanticFixture((input) => {
      input.sourceProfiles[0].review.reviewer =
        "Different synthetic source review";
    }),
  );
  assert.throws(
    () =>
      simulateLocalSourceFailure({ ...request, priorOutput: differentPolicy }),
    /SOURCE_POLICY_ADMISSION_MISMATCH/u,
  );
  const differentBaseline = approvedSnapshot(
    semanticFixture((input) => {
      input.generatedAt = "2026-09-03T01:00:00Z";
    }),
  );
  assert.throws(
    () =>
      simulateLocalSourceFailure({
        ...request,
        priorOutput: differentBaseline,
      }),
    /SIMULATION_EXACT_APPROVED_BASELINE_REQUIRED/u,
  );
  assert.throws(
    () =>
      simulateLocalSourceFailure({
        ...request,
        sourceProfileId: "missing-profile",
      }),
    /SIMULATION_HEALTHY_SOURCE_REQUIRED/u,
  );
  assert.throws(
    () =>
      simulateLocalSourceFailure({
        ...request,
        generatedAt: "2026-09-01T00:00:00Z",
      }),
    /SIMULATION_LATER_TIME_REQUIRED/u,
  );
});
test("loopback server serves only verified in-memory output entries with local origin controls", async (t) => {
  const server = await createLoopbackOutputServer(
    new Map([
      ["index.html", Buffer.from("<main>Authored synthetic output</main>")],
      ["corpus.json", Buffer.from('{"authored":true}')],
    ]),
    0,
  );
  t.after(() => new Promise((resolve) => server.close(resolve)));
  assert.equal(server.address().address, "127.0.0.1");
  const allowed = await get(server);
  assert.equal(allowed.status, 200);
  assert.match(allowed.body, /Authored synthetic/);
  assert.match(
    allowed.headers["content-security-policy"],
    /connect-src 'self'/,
  );
  assert.equal(allowed.headers["referrer-policy"], "no-referrer");
  assert.equal((await get(server, "/corpus.json")).status, 200);
  assert.equal((await get(server, "/", {}, "HEAD")).body, "");
  for (const path of [
    "/../owner.json",
    "/%2e%2e/owner.json",
    "/objects/raw.bin",
    "/review/gold-input.json",
    "/corpus.json?raw=1",
    "/C:/private",
    "/assets/",
    "/corpus.json:secret",
  ])
    assert.equal((await get(server, path)).status, 404, path);
  assert.equal(
    (await get(server, "/", { host: "attacker.example" })).status,
    403,
  );
  assert.equal(
    (await get(server, "/", { origin: "https://attacker.example" })).status,
    403,
  );
  assert.equal(
    (await get(server, "/", { "sec-fetch-site": "cross-site" })).status,
    403,
  );
  assert.equal((await get(server, "/", {}, "POST")).status, 403);
});
