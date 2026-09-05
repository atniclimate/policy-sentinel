import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import test from "node:test";
import {
  acquirePolicyObject,
  admitPolicyTargets,
  initializePolicyRun,
  isPublicAddress,
  openPolicyRun,
  POLICY_LIMITS,
  readPolicyReceipt,
  recoverPolicyRun,
  verifyPolicyRun,
  writePolicyDerived,
} from "../../src/pipeline/policy-custody.mjs";

export const runnerSyntheticManifest = () => ({
  version: "1.0.0",
  runId: "policy-runner-synthetic",
  trustDomain: "synthetic_test_only",
  profiles: [
    {
      id: "official-synthetic",
      hosts: ["official.example"],
      pathPrefixes: ["/instruments/"],
      review: {
        reviewer: "synthetic-test",
        reviewedAt: "2026-09-05T00:00:00Z",
        expiresAt: "2099-01-01T00:00:00Z",
        evidenceUrls: ["https://official.example/policy"],
      },
      uses: {
        capture: true,
        analysis: true,
        excerpts: true,
        localDisplay: "full_text",
        localExport: "full_text",
        publicRedistribution: "prohibited",
      },
    },
  ],
  targets: [
    {
      profileId: "official-synthetic",
      url: "https://official.example/instruments/one",
      expectedIdentity: "SYNTHETIC-ONE",
      mediaTypes: ["text/plain"],
    },
    {
      profileId: "official-synthetic",
      url: "https://official.example/instruments/two",
      expectedIdentity: "SYNTHETIC-TWO",
      mediaTypes: ["text/plain"],
    },
  ],
});

async function fixture(t) {
  const testParent = dirname(resolve(import.meta.dirname, "../.."));
  const base = await mkdtemp(join(testParent, "policy-custody-test-"));
  t.after(async () => {
    assert.ok(
      resolve(base).startsWith(join(testParent, "policy-custody-test-")),
    );
    await rm(base, { recursive: true, force: true });
  });
  const root = join(base, "run");
  const manifest = runnerSyntheticManifest();
  await initializePolicyRun(root, manifest);
  return { root, base, manifest };
}
const transport =
  (text = "Synthetic passage") =>
  async ({ onHeaders, onChunk }) => {
    const bytes = Buffer.from(text);
    onHeaders({
      status: 200,
      mediaType: "text/plain; charset=utf-8",
      encoding: "identity",
      contentLength: bytes.length,
    });
    for (const byte of bytes) onChunk(Buffer.from([byte]));
  };
const acquire = (root, extra = {}) =>
  acquirePolicyObject(root, {
    operationId: "one",
    url: "https://official.example/instruments/one",
    syntheticTransport: transport(),
    ...extra,
  });

test("derived output confines reviewed namespaces and leaves acquisition accounting unchanged", async (t) => {
  const { root } = await fixture(t);
  const before = await readFile(join(root, "ledger.json"));
  const bytes = Buffer.from("Authored synthetic reviewed output");
  const result = await writePolicyDerived(
    root,
    "local-output/build-test/index.html",
    bytes,
  );
  assert.equal(result.bytes, bytes.length);
  assert.deepEqual(await readFile(join(root, result.path)), bytes);
  await assert.rejects(
    writePolicyDerived(root, result.path, Buffer.from("Replacement"), {
      replace: false,
    }),
    /DERIVED_OUTPUT_ALREADY_EXISTS/,
  );
  assert.deepEqual(await readFile(join(root, result.path)), bytes);
  await writePolicyDerived(root, "review/immutable.json", Buffer.from("{}"), {
    replace: false,
  });
  for (const path of [
    "../escape.txt",
    "objects/injected.bin",
    "local-output/../escape.txt",
    "local-output/nul.txt",
    "local-output//empty.txt",
    "local-output/a:stream",
  ])
    await assert.rejects(
      writePolicyDerived(root, path, bytes),
      /INVALID_DERIVED_OUTPUT/,
    );
  await assert.rejects(
    writePolicyDerived(root, "work/plain.txt", "not bytes"),
    /INVALID_DERIVED_OUTPUT/,
  );
  assert.deepEqual(await readFile(join(root, "ledger.json")), before);
  assert.equal((await verifyPolicyRun(root)).attempts, 0);
});

test("fragmented transport uses byte limits and receipt review never dispatches", async (t) => {
  const { root } = await fixture(t);
  const text = "évidence Section 1\n".repeat(4000);
  const receipt = await acquire(root, { syntheticTransport: transport(text) });
  assert.equal(receipt.state, "complete");
  assert.equal(receipt.decodedBytes, Buffer.byteLength(text));
  const first = await readPolicyReceipt(root, "one", { length: 50 });
  const later = await readPolicyReceipt(root, "one", {
    offset: 50,
    length: 100,
  });
  assert.equal(first.review.nextOffset, 50);
  assert.equal(later.review.offset, 50);
  assert.equal((await verifyPolicyRun(root)).attempts, 1);
  await assert.rejects(acquire(root), /ALREADY_RESERVED/);
  await assert.rejects(
    acquire(root, { operationId: "duplicate" }),
    /EXPLICIT_RETRY/,
  );
});

test("manifest, trust, redirect, compression and archive boundaries fail closed", async (t) => {
  const { root } = await fixture(t);
  await assert.rejects(
    acquire(root, { url: "https://official.example/private" }),
    /FROZEN_MANIFEST/,
  );
  await assert.rejects(
    acquire(root, { syntheticTransport: null }),
    /TRUST_MISMATCH/,
  );
  const receipt = await acquire(root, {
    syntheticTransport: async ({ onHeaders }) =>
      onHeaders({ status: 302, mediaType: "text/plain", encoding: "identity" }),
  });
  assert.equal(receipt.state, "failed");
  assert.equal(receipt.encodedBytes, POLICY_LIMITS.responseBytes);
  assert.equal(receipt.objectPath, null);
  const manifest = runnerSyntheticManifest();
  manifest.targets[0].mediaTypes = ["application/zip"];
  await assert.rejects(admitPolicyTargets(root, manifest), /UNSUPPORTED_MEDIA/);
  assert.equal((await verifyPolicyRun(root)).attempts, 1);
});

test("partial responses, retry-after and corruption are explicit", async (t) => {
  const { root } = await fixture(t);
  const receipt = await acquire(root, {
    syntheticTransport: async ({ onHeaders, onChunk }) => {
      onHeaders({
        status: 200,
        mediaType: "text/plain",
        encoding: "identity",
        contentLength: 99,
      });
      onChunk(Buffer.from("partial"));
    },
  });
  assert.equal(receipt.errorCode, "TRUNCATED_RESPONSE");
  assert.equal(receipt.encodedBytes, 7);
  const retry = await acquire(root, {
    operationId: "one-retry",
    retryOf: "one",
  });
  assert.equal(retry.state, "complete");
  await writeFile(join(root, retry.objectPath), "corrupt");
  await assert.rejects(verifyPolicyRun(root), /OBJECT_DIGEST/);
  await assert.rejects(readPolicyReceipt(root, "one-retry"), /OBJECT_DIGEST/);
});

test("Retry-After prevents subsequent host dispatch and has no automatic retry", async (t) => {
  const { root } = await fixture(t);
  const receipt = await acquire(root, {
    syntheticTransport: async ({ onHeaders }) =>
      onHeaders({
        status: 429,
        mediaType: "text/plain",
        encoding: "identity",
        retryAfter: "120",
      }),
  });
  assert.equal(receipt.transient, true);
  await assert.rejects(
    acquire(root, { operationId: "retry", retryOf: "one" }),
    /RETRY_AFTER_ACTIVE/,
  );
  assert.equal((await verifyPolicyRun(root)).attempts, 1);
});

test("actual child crash leaves a charged reservation recovered without replay", async (t) => {
  const { root } = await fixture(t);
  const script = resolve("scripts/bounded-operation-runner.mjs");
  const crash = spawnSync(
    process.execPath,
    [
      script,
      "acquire",
      "--root",
      root,
      "--operation",
      "crash-one",
      "--url",
      "https://official.example/instruments/one",
      "--synthetic",
      "--crash-after-reservation",
    ],
    { encoding: "utf8", timeout: 10000, windowsHide: true },
  );
  assert.equal(crash.status, 86, crash.stderr);
  assert.equal((await openPolicyRun(root)).ledger.attempts, 1);
  await assert.rejects(acquire(root, { operationId: "blocked" }), /RUN_LOCKED/);
  const recovered = await recoverPolicyRun(root);
  assert.deepEqual(recovered.recovered, [
    { operationId: "crash-one", state: "ambiguous" },
  ]);
  assert.equal(
    (await verifyPolicyRun(root)).encodedBytes,
    POLICY_LIMITS.responseBytes,
  );
  await assert.rejects(
    acquire(root, { operationId: "replay", retryOf: "crash-one" }),
    /RETRY_NOT_AUTHORIZED/,
  );
  const fresh = spawnSync(
    process.execPath,
    [
      script,
      "acquire",
      "--root",
      root,
      "--operation",
      "fresh-two",
      "--url",
      "https://official.example/instruments/two",
      "--synthetic",
    ],
    { encoding: "utf8", timeout: 10000, windowsHide: true },
  );
  assert.equal(fresh.status, 0, fresh.stderr);
  assert.equal(JSON.parse(fresh.stdout).state, "complete");
  assert.equal((await verifyPolicyRun(root)).attempts, 2);
});

test("root ownership, frozen manifests and budget counters resist drift", async (t) => {
  const { root, manifest } = await fixture(t);
  await assert.rejects(initializePolicyRun(root, manifest), /ROOT_NOT_EMPTY/);
  const run = await openPolicyRun(root);
  const path = join(root, "manifests", `${run.ledger.manifestDigest}.json`);
  const bytes = await readFile(path);
  await writeFile(path, `${bytes.toString()} `);
  await assert.rejects(openPolicyRun(root), /MANIFEST_DIGEST/);
  await writeFile(path, bytes);
  run.ledger.attempts = POLICY_LIMITS.attempts;
  await writeFile(join(root, "ledger.json"), JSON.stringify(run.ledger));
  await assert.rejects(acquire(root), /COUNTER_MISMATCH/);
});

test("public address gate excludes local, metadata, multicast and mapped bypasses", () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.2.3",
    "169.254.169.254",
    "100.64.1.2",
    "192.168.1.2",
    "0.0.0.0",
    "224.1.2.3",
    "::1",
    "::ffff:127.0.0.1",
    "fe80::1",
    "fc00::1",
    "2001:db8::1",
    "2002:7f00:1::",
  ])
    assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress("8.8.8.8"), true);
  for (const ip of ["2606:4700:4700::1111", "2001::1", "2001:2::1"])
    assert.equal(isPublicAddress(ip), false);
});

test("post-response and object-promotion crashes cannot mint an accepted capture", async (t) => {
  for (const [stage, exitCode] of [
    ["response", 87],
    ["object", 88],
  ]) {
    const { root } = await fixture(t);
    const child = spawnSync(
      process.execPath,
      [
        resolve("scripts/bounded-operation-runner.mjs"),
        "acquire",
        "--root",
        root,
        "--operation",
        "interrupted",
        "--url",
        "https://official.example/instruments/one",
        "--synthetic",
        "--crash-stage",
        stage,
      ],
      { windowsHide: true, encoding: "utf8", timeout: 15000 },
    );
    assert.equal(child.status, exitCode, child.stderr);
    assert.equal(
      (await recoverPolicyRun(root)).recovered[0].state,
      "ambiguous",
    );
    const verified = await verifyPolicyRun(root);
    assert.equal(verified.objects, 0);
    assert.equal(verified.encodedBytes, POLICY_LIMITS.responseBytes);
    assert.equal((await readPolicyReceipt(root, "interrupted")).review, null);
  }
});

test("recovery retains Retry-After and oversized values never corrupt ledger clocks", async (t) => {
  const { root } = await fixture(t);
  const receipt = await acquire(root, {
    syntheticTransport: async ({ onHeaders }) =>
      onHeaders({
        status: 429,
        mediaType: "text/plain",
        encoding: "identity",
        retryAfter: "9999999999999999999999",
      }),
  });
  const run = await openPolicyRun(root);
  assert.ok(Number.isSafeInteger(run.ledger.cooldowns["official.example"]));
  const keys = [
    "operationId",
    "url",
    "retryOf",
    "state",
    "startedAt",
    "reservedBytes",
    "manifestDigest",
    "profileId",
  ];
  run.ledger.operations.one = Object.fromEntries(
    keys.map((key) => [key, key === "state" ? "reserved" : receipt[key]]),
  );
  run.ledger.cooldowns = {};
  await writeFile(join(root, "ledger.json"), JSON.stringify(run.ledger));
  await recoverPolicyRun(root);
  await assert.rejects(
    acquire(root, { operationId: "retry", retryOf: "one" }),
    /RETRY_AFTER_ACTIVE/,
  );
  assert.equal((await verifyPolicyRun(root)).attempts, 1);
});

test("historical target manifests remain mandatory after an append", async (t) => {
  const { root, manifest } = await fixture(t);
  const receipt = await acquire(root);
  const extended = globalThis.structuredClone(manifest);
  extended.targets.push({
    ...manifest.targets[0],
    url: "https://official.example/instruments/three",
    expectedIdentity: "SYNTHETIC-THREE",
  });
  await admitPolicyTargets(root, extended);
  await writeFile(
    join(root, "manifests", `${receipt.manifestDigest}.json`),
    "{}",
  );
  await assert.rejects(
    verifyPolicyRun(root),
    /HISTORICAL_MANIFEST_DIGEST_MISMATCH/,
  );
});

test("stream overflow stays within its reservation and leaves verifiable failure custody", async (t) => {
  const { root } = await fixture(t);
  const receipt = await acquire(root, {
    syntheticTransport: async ({ onHeaders, onChunk }) => {
      onHeaders({ status: 200, mediaType: "text/plain", encoding: "identity" });
      const chunk = Buffer.alloc(65536, 65);
      for (
        let offset = 0;
        offset < POLICY_LIMITS.bodyBytes;
        offset += chunk.length
      )
        onChunk(chunk);
      onChunk(Buffer.from("x"));
    },
  });
  assert.equal(receipt.state, "failed");
  assert.equal(receipt.errorCode, "RESPONSE_BYTE_LIMIT");
  assert.equal(receipt.encodedBytes, POLICY_LIMITS.bodyBytes + 1);
  assert.ok(receipt.encodedBytes <= receipt.reservedBytes);
  assert.equal(receipt.objectPath, null);
  assert.equal((await verifyPolicyRun(root)).valid, true);
});

test("expired source reviews stop dispatch while offline custody remains available", async (t) => {
  const { root } = await fixture(t);
  await acquire(root);
  t.mock.method(Date, "now", () => Date.parse("2100-01-01T00:00:00Z"));
  assert.equal(
    (await readPolicyReceipt(root, "one")).receipt.state,
    "complete",
  );
  assert.equal((await verifyPolicyRun(root)).valid, true);
  await assert.rejects(
    acquire(root, {
      operationId: "new",
      url: "https://official.example/instruments/two",
    }),
    /EXPIRED_PROFILE/,
  );
});

test("deadline bounds even a transport ignoring abort and preserves its charge", async (t) => {
  const { root } = await fixture(t);
  const started = Date.now();
  const receipt = await acquire(root, {
    syntheticDeadlineMs: 40,
    syntheticTransport: async () => new Promise(() => {}),
  });
  assert.equal(receipt.errorCode, "OPERATION_DEADLINE");
  assert.equal(receipt.encodedBytes, POLICY_LIMITS.responseBytes);
  assert.ok(Date.now() - started < 5000);
  assert.equal((await verifyPolicyRun(root)).attempts, 1);
});

test("PowerShell forwards exits; suppressed and interrupted output recover stored evidence", async (t) => {
  const { root, base } = await fixture(t);
  const wrapper = join(base, "invoke.ps1");
  await writeFile(
    wrapper,
    "$ErrorActionPreference = 'Stop'\n& $args[0] $args[1] acquire --root $args[2] --operation $args[3] --url $args[4] --synthetic --crash-stage $args[5]\n$operationExit = $LASTEXITCODE\nexit $operationExit\n",
  );
  const powershell = join(
    process.env.SystemRoot,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  const script = resolve("scripts/bounded-operation-runner.mjs");
  const result = spawnSync(
    powershell,
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-File",
      wrapper,
      process.execPath,
      script,
      root,
      "receipt-crash",
      "https://official.example/instruments/one",
      "receipt",
    ],
    { windowsHide: true, encoding: "utf8", timeout: 15000 },
  );
  assert.equal(result.status, 89, result.stderr);
  const recovered = await recoverPolicyRun(root);
  assert.equal(recovered.recovered[0].state, "complete");
  assert.equal(
    (
      await readPolicyReceipt(root, "receipt-crash", {
        offset: 24000,
        length: 24000,
      })
    ).review.offset,
    24000,
  );
  assert.equal((await verifyPolicyRun(root)).attempts, 1);
  const suppressed = spawnSync(
    process.execPath,
    [
      script,
      "acquire",
      "--root",
      root,
      "--operation",
      "suppressed",
      "--url",
      "https://official.example/instruments/two",
      "--synthetic",
    ],
    { windowsHide: true, stdio: "ignore", timeout: 15000 },
  );
  assert.equal(suppressed.status, 0);
  assert.equal(
    (await readPolicyReceipt(root, "suppressed", { length: 20 })).review.text,
    "Synthetic official i",
  );
  assert.equal((await verifyPolicyRun(root)).attempts, 2);
});

test("recovery rejects receipt corruption and traversal before promoting completion", async (t) => {
  const { root } = await fixture(t);
  const script = resolve("scripts/bounded-operation-runner.mjs");
  const child = spawnSync(
    process.execPath,
    [
      script,
      "acquire",
      "--root",
      root,
      "--operation",
      "receipt-crash",
      "--url",
      "https://official.example/instruments/one",
      "--synthetic",
      "--crash-stage",
      "receipt",
    ],
    { windowsHide: true, encoding: "utf8", timeout: 15000 },
  );
  assert.equal(child.status, 89, child.stderr);
  const receipt = JSON.parse(
    await readFile(join(root, "receipts", "receipt-crash.json"), "utf8"),
  );
  await writeFile(join(root, receipt.objectPath), "tampered");
  await assert.rejects(recoverPolicyRun(root), /OBJECT_DIGEST_MISMATCH/);
  const ledger = JSON.parse(await readFile(join(root, "ledger.json"), "utf8"));
  ledger.operations["../escape"] = ledger.operations["receipt-crash"];
  delete ledger.operations["receipt-crash"];
  await writeFile(join(root, "ledger.json"), JSON.stringify(ledger));
  await assert.rejects(recoverPolicyRun(root), /INVALID_OPERATION_ENTRY/);
});

test("closed profile and Windows namespace checks reject malformed or secret-bearing inputs", async (t) => {
  const { root, manifest } = await fixture(t);
  const changed = globalThis.structuredClone(manifest);
  delete changed.profiles[0].review.reviewedAt;
  await assert.rejects(admitPolicyTargets(root, changed), /UNREVIEWED_PROFILE/);
  const secret = globalThis.structuredClone(manifest);
  secret.targets.push({
    ...secret.targets[0],
    url: "https://official.example/instruments/one?api_key=prohibited",
  });
  await assert.rejects(
    admitPolicyTargets(root, secret),
    /TARGET_OUTSIDE_PROFILE/,
  );
  for (const path of [
    "I:\\nul",
    "I:\\temp \\run",
    "I:\\safe\\..\\run",
    "I:\\safe:stream",
    "\\\\server\\share\\run",
  ])
    await assert.rejects(openPolicyRun(path), /UNSAFE_WINDOWS_NAMESPACE/);
});
