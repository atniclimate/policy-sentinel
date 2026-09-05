import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { openPolicyRun } from "../src/pipeline/policy-custody.mjs";
const args = process.argv.slice(2);
if (
  args.length !== 6 ||
  args[0] !== "--root" ||
  args[2] !== "--phase" ||
  !["inventories", "bodies"].includes(args[3]) ||
  args[4] !== "--count" ||
  !/^\d{1,3}$/.test(args[5]) ||
  Number(args[5]) < 1 ||
  Number(args[5]) > 50
)
  throw new Error("EXPLICIT_BOUNDED_BATCH_REQUIRED");
const root = args[1];
const run = await openPolicyRun(root);
const review = JSON.parse(
  await readFile(join(root, `review/broad-${args[3]}.json`), "utf8"),
);
const pending = review.records
  .map((record) => ({
    operationId:
      args[3] === "inventories"
        ? record.inventoryOperationId
        : record.bodyOperationId,
    url: args[3] === "inventories" ? record.inventoryUrl : record.bodyUrl,
  }))
  .filter((record) => !Object.hasOwn(run.ledger.operations, record.operationId))
  .slice(0, Number(args[5]));
let complete = 0;
let failed = 0;
for (const record of pending) {
  // Every attempt is a distinct bounded, noninteractive runner invocation.
  // Previously reserved/failed/complete IDs are skipped; there is no retry path.
  const child = spawnSync(
    process.execPath,
    [
      join(import.meta.dirname, "bounded-operation-runner.mjs"),
      "acquire",
      "--root",
      root,
      "--operation",
      record.operationId,
      "--url",
      record.url,
    ],
    { windowsHide: true, encoding: "utf8", timeout: 65000, maxBuffer: 16000 },
  );
  if (child.status === 0) complete++;
  else {
    failed++;
    process.stdout.write(
      `${JSON.stringify({ operationId: record.operationId, exit: child.status, error: String(child.stderr ?? child.error?.message ?? "unknown").slice(0, 240) })}\n`,
    );
    // An unsettled operation must be recovered and inspected by the lead.
    if (child.status !== 2)
      throw new Error("BATCH_STOPPED_FOR_UNSETTLED_OR_LOCAL_FAILURE");
  }
  process.stdout.write(
    `${JSON.stringify({ operationId: record.operationId, complete, failed, selected: pending.length })}\n`,
  );
}
process.stdout.write(
  `${JSON.stringify({ phase: args[3], attempted: pending.length, complete, failed, retryAttempts: 0 })}\n`,
);
