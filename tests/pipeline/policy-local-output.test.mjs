import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { request } from "node:http";
import test from "node:test";
import {
  createLoopbackOutputServer,
  validateLocalOutputFiles,
} from "../../src/pipeline/policy-local-output.mjs";
import {
  canonicalV2Digest,
  createAnalyzedCorpusV2,
  serializeAnalyzedCorpusV2,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";
import { digest } from "../../src/pipeline/policy-custody.mjs";
import { syntheticCorpusV2Input } from "./analyzed-corpus-v2.test.mjs";

function semanticFixture(change = () => {}) {
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
  const corpus = createAnalyzedCorpusV2(input);
  const bytes = Buffer.from(serializeAnalyzedCorpusV2(corpus));
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
