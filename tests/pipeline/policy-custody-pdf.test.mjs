import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import {
  acquirePolicyObject,
  admitPolicyTargets,
  DEFAULT_ACCEPT,
  digest,
  initializePolicyRun,
  POLICY_LIMITS,
  verifyPolicyRun,
} from "../../src/pipeline/policy-custody.mjs";

const pdfSyntheticManifest = () => ({
  version: "1.0.0",
  runId: "policy-custody-pdf-synthetic",
  trustDomain: "synthetic_test_only",
  profiles: [
    {
      id: "official-pdf-synthetic",
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
      profileId: "official-pdf-synthetic",
      url: "https://official.example/instruments/pdf-one",
      expectedIdentity: "SYNTHETIC-PDF-ONE",
      mediaTypes: ["application/pdf"],
    },
    {
      profileId: "official-pdf-synthetic",
      url: "https://official.example/instruments/pdf-two",
      expectedIdentity: "SYNTHETIC-PDF-TWO",
      mediaTypes: ["application/pdf"],
    },
    {
      profileId: "official-pdf-synthetic",
      url: "https://official.example/instruments/html-one",
      expectedIdentity: "SYNTHETIC-HTML-ONE",
      mediaTypes: ["text/html"],
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
  const manifest = pdfSyntheticManifest();
  await initializePolicyRun(root, manifest);
  return { root, base, manifest };
}

// A small opaque object: an ASCII PDF header followed by bytes that include
// values above 0x7f, to exercise binary-ish content through the byte-exact
// storage path (no parsing, no text extraction).
function pdfBytes(size = 4096) {
  const header = Buffer.from("%PDF-1.7\n");
  const body = Buffer.alloc(size);
  for (let i = 0; i < body.length; i += 1) body[i] = (i * 37 + 0x80) % 256;
  return Buffer.concat([header, body]);
}

test("manifest acceptance: application/pdf targets initialize while other unsupported media still reject", async (t) => {
  const { root, manifest } = await fixture(t);
  // initializePolicyRun already accepted the application/pdf targets in the
  // fixture; verifyPolicyRun proves the manifest persisted validly.
  assert.equal((await verifyPolicyRun(root)).valid, true);
  const zipManifest = globalThis.structuredClone(manifest);
  zipManifest.targets[0].mediaTypes = ["application/zip"];
  await assert.rejects(
    admitPolicyTargets(root, zipManifest),
    /UNSUPPORTED_MEDIA/,
  );
});

test("accept header includes application/pdf only for pdf-declaring targets", async (t) => {
  const { root } = await fixture(t);
  let pdfAccept;
  let htmlAccept;
  await acquirePolicyObject(root, {
    operationId: "pdf-accept",
    url: "https://official.example/instruments/pdf-one",
    syntheticTransport: async ({ accept, onHeaders, onChunk }) => {
      pdfAccept = accept;
      onHeaders({
        status: 200,
        mediaType: "application/pdf",
        encoding: "identity",
        contentLength: 4,
      });
      onChunk(Buffer.from("%PDF"));
    },
  });
  await acquirePolicyObject(root, {
    operationId: "html-accept",
    url: "https://official.example/instruments/html-one",
    syntheticTransport: async ({ accept, onHeaders, onChunk }) => {
      htmlAccept = accept;
      onHeaders({
        status: 200,
        mediaType: "text/html",
        encoding: "identity",
        contentLength: 4,
      });
      onChunk(Buffer.from("<htm"));
    },
  });
  assert.equal(pdfAccept, `${DEFAULT_ACCEPT},application/pdf`);
  assert.equal(htmlAccept, DEFAULT_ACCEPT);
});

test("complete PDF acquisition stores exact opaque bytes with no parsing", async (t) => {
  const { root } = await fixture(t);
  const bytes = pdfBytes();
  const chunkSize = 613;
  const receipt = await acquirePolicyObject(root, {
    operationId: "pdf-complete",
    url: "https://official.example/instruments/pdf-one",
    syntheticTransport: async ({ onHeaders, onChunk }) => {
      onHeaders({
        status: 200,
        mediaType: "application/pdf",
        encoding: "identity",
        contentLength: bytes.length,
      });
      for (let offset = 0; offset < bytes.length; offset += chunkSize)
        onChunk(bytes.subarray(offset, offset + chunkSize));
    },
  });
  assert.equal(receipt.state, "complete");
  assert.equal(receipt.mediaType, "application/pdf");
  assert.equal(receipt.decodedBytes, bytes.length);
  assert.equal(receipt.objectPath, `objects/${digest(bytes)}.bin`);
  const stored = await readFile(join(root, receipt.objectPath));
  assert.deepEqual(stored, bytes);
  const verified = await verifyPolicyRun(root);
  assert.equal(verified.objects, 1);
  assert.equal(verified.encodedBytes, bytes.length);
  assert.equal(verified.decodedBytes, bytes.length);
  assert.equal(verified.attempts, 1);
});

test("content-type mismatch rejects in both directions between pdf and html targets", async (t) => {
  const { root } = await fixture(t);
  const pdfTargetGotHtml = await acquirePolicyObject(root, {
    operationId: "pdf-mismatch",
    url: "https://official.example/instruments/pdf-one",
    syntheticTransport: async ({ onHeaders }) =>
      onHeaders({ status: 200, mediaType: "text/html", encoding: "identity" }),
  });
  assert.equal(pdfTargetGotHtml.state, "failed");
  assert.equal(pdfTargetGotHtml.errorCode, "RESPONSE_CONTRACT_REJECTED");
  assert.equal(pdfTargetGotHtml.objectPath, null);
  assert.equal(pdfTargetGotHtml.conservativeByteCharge, true);
  assert.equal(pdfTargetGotHtml.encodedBytes, POLICY_LIMITS.responseBytes);

  const htmlTargetGotPdf = await acquirePolicyObject(root, {
    operationId: "html-mismatch",
    url: "https://official.example/instruments/html-one",
    syntheticTransport: async ({ onHeaders }) =>
      onHeaders({
        status: 200,
        mediaType: "application/pdf",
        encoding: "identity",
      }),
  });
  assert.equal(htmlTargetGotPdf.state, "failed");
  assert.equal(htmlTargetGotPdf.errorCode, "RESPONSE_CONTRACT_REJECTED");
  assert.equal(htmlTargetGotPdf.objectPath, null);
  assert.equal(htmlTargetGotPdf.conservativeByteCharge, true);
  assert.equal(htmlTargetGotPdf.encodedBytes, POLICY_LIMITS.responseBytes);
});

test("size ceilings reject an oversized declared length and an unbounded stream", async (t) => {
  const { root } = await fixture(t);
  const oversizedHeader = await acquirePolicyObject(root, {
    operationId: "pdf-oversized-header",
    url: "https://official.example/instruments/pdf-one",
    syntheticTransport: async ({ onHeaders }) =>
      onHeaders({
        status: 200,
        mediaType: "application/pdf",
        encoding: "identity",
        contentLength: POLICY_LIMITS.bodyBytes + 1,
      }),
  });
  assert.equal(oversizedHeader.state, "failed");
  assert.equal(oversizedHeader.errorCode, "RESPONSE_CONTRACT_REJECTED");
  assert.equal(oversizedHeader.conservativeByteCharge, true);
  assert.equal(oversizedHeader.objectPath, null);

  const streamed = await acquirePolicyObject(root, {
    operationId: "pdf-stream-overflow",
    url: "https://official.example/instruments/pdf-two",
    syntheticTransport: async ({ onHeaders, onChunk }) => {
      onHeaders({
        status: 200,
        mediaType: "application/pdf",
        encoding: "identity",
      });
      const chunk = Buffer.alloc(65536, 0x80);
      for (
        let offset = 0;
        offset < POLICY_LIMITS.bodyBytes;
        offset += chunk.length
      )
        onChunk(chunk);
      onChunk(Buffer.from([0x81]));
    },
  });
  assert.equal(streamed.state, "failed");
  assert.equal(streamed.errorCode, "RESPONSE_BYTE_LIMIT");
  assert.equal(streamed.encodedBytes, POLICY_LIMITS.bodyBytes + 1);
  assert.ok(streamed.encodedBytes <= streamed.reservedBytes);
  assert.equal(streamed.objectPath, null);
});

test("ledger accounting stays consistent across a mixed sequence and blocks implicit replay", async (t) => {
  const { root } = await fixture(t);
  await acquirePolicyObject(root, {
    operationId: "a1",
    url: "https://official.example/instruments/pdf-one",
    syntheticTransport: async ({ onHeaders, onChunk }) => {
      onHeaders({
        status: 200,
        mediaType: "application/pdf",
        encoding: "identity",
        contentLength: 4,
      });
      onChunk(Buffer.from("%PDF"));
    },
  });
  await acquirePolicyObject(root, {
    operationId: "a2",
    url: "https://official.example/instruments/html-one",
    syntheticTransport: async ({ onHeaders, onChunk }) => {
      onHeaders({
        status: 200,
        mediaType: "text/html",
        encoding: "identity",
        contentLength: 4,
      });
      onChunk(Buffer.from("<htm"));
    },
  });
  const verified = await verifyPolicyRun(root);
  assert.equal(verified.valid, true);
  assert.equal(verified.attempts, 2);
  await assert.rejects(
    acquirePolicyObject(root, {
      operationId: "a3",
      url: "https://official.example/instruments/pdf-one",
      syntheticTransport: async () => {},
    }),
    /EXPLICIT_RETRY_REQUIRED/,
  );
});

test("non-regression: a non-pdf target still completes under the unmodified default accept", async (t) => {
  const { root } = await fixture(t);
  let recordedAccept;
  const receipt = await acquirePolicyObject(root, {
    operationId: "html-baseline",
    url: "https://official.example/instruments/html-one",
    syntheticTransport: async ({ accept, onHeaders, onChunk }) => {
      recordedAccept = accept;
      const bytes = Buffer.from("Synthetic html passage");
      onHeaders({
        status: 200,
        mediaType: "text/html; charset=utf-8",
        encoding: "identity",
        contentLength: bytes.length,
      });
      for (const byte of bytes) onChunk(Buffer.from([byte]));
    },
  });
  assert.equal(receipt.state, "complete");
  assert.equal(recordedAccept, DEFAULT_ACCEPT);
  assert.equal((await verifyPolicyRun(root)).attempts, 1);
});
