import { lstat, open, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { Buffer } from "node:buffer";
import { withPreservedCleanup } from "../../pipeline/policy-assurance.mjs";
import {
  digest,
  openPolicyRun,
  verifyPolicyRun,
} from "../../pipeline/policy-custody.mjs";
import { extractPolicyText } from "../../pipeline/policy-text.mjs";
import { createPolicyCorpus } from "../../pipeline/policy-corpus-builder.mjs";
import {
  parseAnalyzedCorpusV2,
  serializeAnalyzedCorpusV2,
} from "../../pipeline/analyzed-corpus-v2.mjs";

import {
  safeFile,
  assertProfileBindings,
  assertCaptureBindings,
} from "../../core/local-output-bindings.mjs";

const fail = (code) => {
  throw new Error(code);
};
async function readOwnedFile(root, relativePath, limit = 128 * 1024 ** 2) {
  if (!safeFile(relativePath)) fail("INVALID_OWNED_FILE_PATH");
  const base = await realpath(root);
  const path = join(base, relativePath);
  let cursor = base;
  for (const part of relativePath.split("/")) {
    cursor = join(cursor, part);
    const info = await lstat(cursor);
    if (
      info.isSymbolicLink() ||
      (!info.isDirectory() && !info.isFile()) ||
      (info.isFile() && info.nlink !== 1)
    )
      fail("LINKED_OUTPUT_REJECTED");
  }
  const resolved = await realpath(path);
  const rel = relative(base, resolved);
  if (
    isAbsolute(rel) ||
    rel === ".." ||
    rel.startsWith(`..${sep}`) ||
    resolve(resolved).toLowerCase() !== resolve(path).toLowerCase()
  )
    fail("OUTPUT_PATH_ESCAPE");
  const before = await lstat(path);
  const handle = await open(path, "r");
  return withPreservedCleanup(
    async () => {
      const stat = await handle.stat();
      if (
        !stat.isFile() ||
        stat.nlink !== 1 ||
        stat.size > limit ||
        stat.ino !== before.ino ||
        stat.dev !== before.dev
      )
        fail("UNSAFE_OR_OVERSIZED_OUTPUT_FILE");
      const bytes = await handle.readFile();
      if (bytes.length !== stat.size) fail("OUTPUT_FILE_CHANGED_DURING_READ");
      return bytes;
    },
    () => handle.close(),
  );
}
export async function replayReviewedCorpus(root, { name = "gold" } = {}) {
  if (!["gold", "discovery"].includes(name)) fail("INVALID_CORPUS_SELECTION");
  const custody = await verifyPolicyRun(root);
  const run = await openPolicyRun(root);
  const inputBytes = await readFile(join(root, `review/${name}-input.json`));
  const corpusBytes = await readFile(join(root, `work/${name}-corpus.json`));
  const seal = JSON.parse(
    await readFile(join(root, `review/${name}-seal.json`), "utf8"),
  );
  if (
    seal.inputDigest !== digest(inputBytes) ||
    seal.outputDigest !== digest(corpusBytes)
  )
    fail("REVIEW_SEAL_MISMATCH");
  const portable = JSON.parse(inputBytes.toString("utf8"));
  assertProfileBindings(portable, run);
  if (
    portable.runId !== run.owner.runId ||
    portable.trustDomain !== run.owner.trustDomain
  )
    fail("RUN_IDENTITY_MISMATCH");
  const objects = new Map();
  const items = [];
  for (const item of portable.items) {
    const captures = [];
    for (const recipe of item.captures) {
      const receipt = run.ledger.operations[recipe.operationId];
      if (
        !receipt ||
        receipt.state !== "complete" ||
        receipt.objectDigest !== recipe.objectDigest
      )
        fail("CAPTURE_REPLAY_MISMATCH");
      let sourceBytes = objects.get(receipt.objectDigest);
      if (!sourceBytes) {
        sourceBytes = await readFile(join(root, receipt.objectPath));
        if (digest(sourceBytes) !== receipt.objectDigest)
          fail("OBJECT_DIGEST_MISMATCH");
        objects.set(receipt.objectDigest, sourceBytes);
      }
      const parsed = extractPolicyText({
        bytes: sourceBytes,
        mediaType: receipt.mediaType,
        sourceKind: recipe.sourceKind,
        url: receipt.url,
        expectedIdentity: receipt.expectedIdentity,
        excludedBlockLocators: recipe.excludedBlockLocators,
      });
      const renditionDigest = digest(Buffer.from(parsed.text));
      if (
        renditionDigest !== recipe.renditionDigest ||
        JSON.stringify(parsed.parser) !== JSON.stringify(recipe.parser)
      )
        fail("PARSER_REPLAY_MISMATCH");
      captures.push({
        receipt,
        sourceBytes,
        extraction: {
          version: "1.0.0",
          state: "extracted_pending_review",
          captureOperationId: receipt.operationId,
          objectDigest: receipt.objectDigest,
          renditionDigest,
          sourceKind: recipe.sourceKind,
          ...parsed,
        },
      });
    }
    items.push({ ...item, captures });
  }
  const corpus = createPolicyCorpus({ ...portable, items });
  const expected = parseAnalyzedCorpusV2(
    JSON.parse(corpusBytes.toString("utf8")),
  );
  if (
    corpus.contentDigest !== seal.corpusDigest ||
    corpus.contentDigest !== expected.contentDigest ||
    serializeAnalyzedCorpusV2(corpus) !== corpusBytes.toString("utf8")
  )
    fail("CORPUS_REPLAY_MISMATCH");
  return {
    corpus,
    custody,
    seal,
    input: portable,
    reviewedInput: { ...portable, items },
  };
}

export {
  safeFile,
  readOwnedFile,
  assertProfileBindings,
  assertCaptureBindings,
};
