import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  digest,
  readPolicyReceipt,
  writePolicyDerived,
} from "../src/pipeline/policy-custody.mjs";
import { extractPolicyText } from "../src/pipeline/policy-text.mjs";
import { reviewedPolicyTextExclusions } from "../config/policy-text-selections.mjs";
const args = process.argv.slice(2);
const options = {};
while (args.length) {
  const key = args.shift();
  if (
    !["--root", "--operation", "--kind", "--show"].includes(key) ||
    Object.hasOwn(options, key)
  )
    throw new Error("INVALID_ARGUMENT");
  options[key] = args.shift();
}
const { receipt } = await readPolicyReceipt(
  options["--root"],
  options["--operation"],
  { length: 1 },
);
if (receipt.state !== "complete") throw new Error("CAPTURE_NOT_COMPLETE");
const bytes = await readFile(join(options["--root"], receipt.objectPath));
if (digest(bytes) !== receipt.objectDigest)
  throw new Error("OBJECT_DIGEST_MISMATCH");
const extracted = extractPolicyText({
  bytes,
  mediaType: receipt.mediaType,
  sourceKind: options["--kind"],
  url: receipt.url,
  expectedIdentity: receipt.expectedIdentity,
  excludedBlockLocators: reviewedPolicyTextExclusions(receipt.url),
});
const result = {
  version: "1.0.0",
  state: "extracted_pending_review",
  captureOperationId: receipt.operationId,
  objectDigest: receipt.objectDigest,
  renditionDigest: digest(Buffer.from(extracted.text)),
  sourceKind: options["--kind"],
  ...extracted,
};
const output = await writePolicyDerived(
  options["--root"],
  `work/renditions/${receipt.operationId}.json`,
  Buffer.from(`${JSON.stringify(result, null, 2)}\n`),
);
process.stdout.write(
  `${JSON.stringify({ output, identity: result.identity, parser: result.parser, renditionDigest: result.renditionDigest, textBytes: Buffer.byteLength(result.text), blocks: result.blocks.length, links: result.links.length, exclusions: result.exclusions, warnings: result.warnings, metadata: result.sourceMetadataCandidates, ...(options["--show"] ? { reviewBlocks: result.blocks.slice(0, Math.min(20, Number(options["--show"]))) } : {}) })}\n`,
);
