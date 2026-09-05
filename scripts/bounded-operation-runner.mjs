import { readFile } from "node:fs/promises";
import {
  acquirePolicyObject,
  admitPolicyTargets,
  initializePolicyRun,
  openPolicyRun,
  readPolicyReceipt,
  recoverPolicyRun,
  verifyPolicyRun,
} from "../src/pipeline/policy-custody.mjs";

const args = process.argv.slice(2);
const command = args.shift();
const options = {};
while (args.length) {
  const key = args.shift();
  if (
    ![
      "--root",
      "--manifest",
      "--operation",
      "--url",
      "--retry-of",
      "--offset",
      "--length",
      "--synthetic",
      "--crash-after-reservation",
      "--crash-stage",
    ].includes(key) ||
    Object.hasOwn(options, key)
  )
    throw new Error("INVALID_ARGUMENT");
  options[key] = ["--synthetic", "--crash-after-reservation"].includes(key)
    ? true
    : args.shift();
}
const watchdog = setTimeout(() => {
  process.stderr.write("OPERATION_DEADLINE\n");
  process.exit(124);
}, 60000);
try {
  const root = options["--root"];
  if (!root) throw new Error("ROOT_REQUIRED");
  let result;
  if (command === "init" || command === "admit") {
    const manifest = JSON.parse(await readFile(options["--manifest"], "utf8"));
    result =
      command === "init"
        ? await initializePolicyRun(root, manifest)
        : await admitPolicyTargets(root, manifest);
  } else if (command === "acquire") {
    result = await acquirePolicyObject(root, {
      operationId: options["--operation"],
      url: options["--url"],
      retryOf: options["--retry-of"] ?? null,
      crashAfterReservation: options["--crash-after-reservation"] ?? false,
      crashStage: options["--crash-stage"] ?? null,
      syntheticTransport: options["--synthetic"]
        ? async ({ onHeaders, onChunk }) => {
            const bytes = Buffer.from(
              "Synthetic official instrument. Section 1. An agency shall publish a review.\n".repeat(
                600,
              ),
            );
            onHeaders({
              status: 200,
              mediaType: "text/plain",
              encoding: "identity",
              contentLength: bytes.length,
            });
            for (let offset = 0; offset < bytes.length; offset += 7)
              onChunk(bytes.subarray(offset, offset + 7));
          }
        : null,
    });
    if (result.state !== "complete") process.exitCode = 2;
  } else if (command === "read")
    result = await readPolicyReceipt(root, options["--operation"], {
      offset: Number(options["--offset"] ?? 0),
      length: Number(options["--length"] ?? 12000),
    });
  else if (command === "recover") result = await recoverPolicyRun(root);
  else if (command === "verify") result = await verifyPolicyRun(root);
  else if (command === "status") {
    const run = await openPolicyRun(root);
    result = {
      runId: run.owner.runId,
      attempts: run.ledger.attempts,
      encodedBytes: run.ledger.encodedBytes,
      decodedBytes: run.ledger.decodedBytes,
      targets: run.manifest.targets.length,
    };
  } else throw new Error("UNKNOWN_COMMAND");
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`${String(error.message).slice(0, 240)}\n`);
  process.exitCode = 1;
} finally {
  clearTimeout(watchdog);
}
