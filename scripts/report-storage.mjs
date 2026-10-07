import { Buffer } from "node:buffer";
import { lstat, open } from "node:fs/promises";
import process from "node:process";
import { createStorageReport } from "../src/pipeline/storage-report.mjs";

const HELP = `Usage: npm run storage:report -- --manifest <local.json> [--json]

Read-only metadata inventory of explicitly declared managed roots.
No document bodies, source hashes, file names, writes or network requests.
Report is planning evidence, never permission to acquire or delete material.

Manifest: version "1.0.0", roots, projections. See README for the contract.
Exit 0: complete inventory (and any supplied forecast within limits).
Exit 2: incomplete inventory, measured cap exceeded, or refused forecast.
Exit 1: invalid arguments/manifest or unexpected failure.
Without projections, future capacity is not evaluated.
`;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function argumentsFor(args) {
  if (args.length === 1 && args[0] === "--help") return { help: true };
  if (
    ![2, 3].includes(args.length) ||
    args[0] !== "--manifest" ||
    !args[1] ||
    args[1].startsWith("--") ||
    (args.length === 3 && args[2] !== "--json")
  ) {
    fail("INVALID_ARGUMENTS");
  }
  return { manifest: args[1], json: args.length === 3 };
}

async function readManifest(file) {
  const maximum = 1024 * 1024;
  const before = await lstat(file, { bigint: true });
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.nlink !== 1n ||
    before.size > BigInt(maximum)
  ) {
    fail("INVALID_MANIFEST_FILE");
  }
  const handle = await open(file, "r");
  try {
    const opened = await handle.stat({ bigint: true });
    if (opened.dev !== before.dev || opened.ino !== before.ino) {
      fail("MANIFEST_CHANGED");
    }
    const buffer = Buffer.alloc(maximum + 1);
    let count = 0;
    while (count < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        count,
        buffer.length - count,
        count,
      );
      if (bytesRead === 0) break;
      count += bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    if (
      count > maximum ||
      after.size !== before.size ||
      after.mtimeNs !== before.mtimeNs ||
      after.ctimeNs !== before.ctimeNs ||
      BigInt(count) !== before.size
    ) {
      fail("MANIFEST_CHANGED");
    }
    try {
      return JSON.parse(buffer.subarray(0, count).toString("utf8"));
    } catch {
      fail("INVALID_MANIFEST_JSON");
    }
  } finally {
    await handle.close();
  }
}

function display(report) {
  const bytes = (value) =>
    value === null ? "unknown" : `${value.toLocaleString("en-US")} bytes`;
  const lines = [
    "Read-only storage report (declared roots only)",
    `Observed: ${report.observedAt}`,
    `Inventory: ${report.status}`,
    `Measured logical bytes: ${bytes(report.totalBytes)}`,
    `Managed cap: ${bytes(report.limits.managedBytes)}`,
    "Incomplete totals are lower bounds, not available capacity.",
  ];
  for (const root of report.roots) {
    lines.push(`${root.id}: ${root.status}; ${bytes(root.totalBytes)}`);
    for (const [category, value] of Object.entries(root.categories)) {
      if (value.files > 0 || value.bytes === null) {
        lines.push(
          `  ${category}: ${bytes(value.bytes)}; ${value.files} files`,
        );
      }
    }
    for (const run of root.runs) {
      lines.push(`  run ${run.id} (${run.state}): ${bytes(run.bytes)}`);
    }
    if (root.reasons.length) lines.push(`  ${root.reasons.join(", ")}`);
  }
  lines.push(`Forecast: ${report.forecast.status}`);
  if (report.forecast.projectedManagedBytes !== null) {
    lines.push(
      `Projected simultaneous peak: ${bytes(report.forecast.projectedManagedBytes)}`,
    );
  }
  if (report.reasons.length) lines.push(report.reasons.join(", "));
  if (report.forecast.reasons.length) {
    lines.push(report.forecast.reasons.join(", "));
  }
  lines.push(
    "Planning evidence only. No acquisition or eviction is authorized.",
  );
  return lines.join("\n");
}

try {
  const args = argumentsFor(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
  } else {
    const report = {
      ...(await createStorageReport(await readManifest(args.manifest))),
      observedAt: new Date().toISOString(),
    };
    console.log(args.json ? JSON.stringify(report, null, 2) : display(report));
    if (
      report.status !== "complete" ||
      report.totalBytes === null ||
      report.totalBytes > report.limits.managedBytes ||
      report.forecast.status === "refused"
    ) {
      process.exitCode = 2;
    }
  }
} catch (error) {
  const allowed = new Set([
    "INVALID_ARGUMENTS",
    "INVALID_MANIFEST",
    "INVALID_MANIFEST_FILE",
    "INVALID_MANIFEST_JSON",
    "MANIFEST_CHANGED",
  ]);
  console.error(
    `STORAGE_REPORT_FAILED:${allowed.has(error.code) ? error.code : "IO_OR_VALIDATION_FAILURE"}`,
  );
  process.exitCode = 1;
}
