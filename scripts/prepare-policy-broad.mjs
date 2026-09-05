import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Buffer } from "node:buffer";
import {
  openPolicyRun,
  verifyPolicyRun,
  admitPolicyTargets,
  writePolicyDerived,
  digest,
} from "../src/pipeline/policy-custody.mjs";
import { extractPolicyText } from "../src/pipeline/policy-text.mjs";
import {
  selectWashingtonChapterCandidates,
  selectWashingtonSessionLaw,
} from "../src/pipeline/policy-broad-discovery.mjs";
const args = process.argv.slice(2);
if (
  args.length !== 4 ||
  args[0] !== "--root" ||
  args[2] !== "--phase" ||
  !["inventories", "bodies"].includes(args[3])
)
  throw new Error("EXPLICIT_ROOT_AND_PHASE_REQUIRED");
const root = args[1];
await verifyPolicyRun(root);
const run = await openPolicyRun(root);
if (run.owner.trustDomain !== "real_source_local")
  throw new Error("REAL_LOCAL_RUN_REQUIRED");
async function extract(operationId) {
  const receipt = run.ledger.operations[operationId];
  if (
    !receipt ||
    receipt.state !== "complete" ||
    receipt.profileId !== "washington-legislative-text"
  )
    throw new Error("COMPLETE_WASHINGTON_CAPTURE_REQUIRED");
  const bytes = await readFile(join(root, receipt.objectPath));
  if (digest(bytes) !== receipt.objectDigest)
    throw new Error("OBJECT_DIGEST_MISMATCH");
  return {
    receipt,
    extraction: extractPolicyText({
      bytes,
      mediaType: receipt.mediaType,
      sourceKind: "washington_index",
      url: receipt.url,
      expectedIdentity: receipt.expectedIdentity,
    }),
  };
}
const index = await extract("wa-index-2025-001");
if (
  index.receipt.objectDigest !==
  "ba144e2cdcaf3f9039325ec6f2c54448da04bef46fc3edcefa8140d3892adbbd"
)
  throw new Error("REVIEWED_INDEX_DIGEST_REQUIRED");
const candidates = selectWashingtonChapterCandidates(index.extraction);
const records = [];
const gaps = [];
if (args[3] === "inventories") records.push(...candidates.selected);
else
  for (const candidate of candidates.selected) {
    try {
      const inventory = await extract(candidate.inventoryOperationId);
      records.push({
        ...selectWashingtonSessionLaw(candidate, inventory.extraction),
        inventoryObjectDigest: inventory.receipt.objectDigest,
        inventoryParser: inventory.extraction.parser,
      });
    } catch (error) {
      gaps.push({
        bill: candidate.bill,
        chapter: candidate.chapter,
        operationId: candidate.inventoryOperationId,
        reason: String(error.message).slice(0, 200),
      });
    }
  }
const additions = records
  .map((record) => ({
    profileId: "washington-legislative-text",
    url: args[3] === "inventories" ? record.inventoryUrl : record.bodyUrl,
    expectedIdentity:
      args[3] === "inventories"
        ? `Washington bill inventory ${record.bill} ${record.biennium}`
        : `Washington ${record.bill} ${record.biennium}`,
    mediaTypes: ["text/html"],
  }))
  .filter(
    (target) =>
      !run.manifest.targets.some((existing) => existing.url === target.url),
  );
const review = {
  version: "1.0.0",
  phase: args[3],
  reviewedAt: new Date().toISOString(),
  reviewer:
    "Policy Sentinel lead integrating independent bounded-chapter source review",
  indexOperationId: index.receipt.operationId,
  indexObjectDigest: index.receipt.objectDigest,
  selection:
    "2025 regular-session chapters1-200; exact numeric bill route only",
  records,
  exclusions: candidates.exclusions,
  gaps,
  limitations: [
    "Candidate admission is not body acceptance.",
    "Chapter/bill/stage and allowed content require retained body review.",
    "Inventory timestamps never establish publication or legal effectiveness.",
    "Systematic chapter-order sample, not topical or statewide completeness.",
  ],
};
const record = await writePolicyDerived(
  root,
  `review/broad-${args[3]}.json`,
  Buffer.from(`${JSON.stringify(review, null, 2)}\n`),
);
const admission = additions.length
  ? await admitPolicyTargets(root, {
      ...run.manifest,
      targets: [...run.manifest.targets, ...additions],
    })
  : { unchanged: true };
process.stdout.write(
  `${JSON.stringify({ record, admission, candidates: records.length, gaps, excludedChapters: candidates.exclusions.map((item) => item.chapter) })}\n`,
);
