#!/usr/bin/env node
// Decision 10 (2026-11-06): write the hashed Nation-name probes. Reads the
// owner's plain recognition list (the official notice HTML, kept outside the
// repository) and writes SHA-256 hashes of each normalized name, sorted, with
// the number of Tribes the notice states, the longest name in words and the
// normalization version. It never writes a name. No network.
//
// D-175 (2026-11-18): the count is the notice's stated number of federally
// recognized Tribes (FULL_PROBE_ENTRIES, 575 for the 2026 notice), not its
// paragraph count: the reviewed 2026 notice contains 577 entry paragraphs.
// Every listed name is hashed.
// A later notice with a new total gets its own recognition-registry entry, and
// this count follows it.
//
//   node scripts/make-nation-probe-hashes.mjs --nation-names <notice HTML> [--out <file>]
// DEMO_NATION_NAMES may name the list instead. The default output is
// config/nation-name-probes.sha256.v1.json.
import {
  mkdtempSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  FULL_PROBE_ENTRIES,
  INCOMPLETE_PROBE,
  PROBE_HASH_PATH,
  insideRepo,
  isFullProbe,
  loadProbeNames,
  manifestBytes,
  probeHashFile,
} from "./demo-index/common.mjs";

const { values } = parseArgs({
  options: {
    "nation-names": { type: "string" },
    out: { type: "string" },
  },
});
const list = values["nation-names"] || process.env.DEMO_NATION_NAMES;
if (!list) {
  console.error(
    "usage: make-nation-probe-hashes.mjs --nation-names <notice HTML outside the repository> [--out <file>]",
  );
  process.exit(2);
}
if (insideRepo(list)) {
  console.error("The plain recognition list stays outside the repository.");
  process.exit(2);
}
const out = resolve(values.out ?? PROBE_HASH_PATH);
let plain;
try {
  const input = statSync(list, { bigint: true });
  const target = statSync(out, { bigint: true, throwIfNoEntry: false });
  if (target && target.dev === input.dev && target.ino === input.ino) {
    console.error(
      "--out and --nation-names refer to the same file; nothing written.",
    );
    process.exit(2);
  }
  plain = loadProbeNames(resolve(list), { requireReviewedInventory: true });
} catch (error) {
  console.error(
    `Recognition inventory verification failed; nothing written. ${error.message}`,
  );
  process.exit(1);
}
const file = probeHashFile(plain.names, FULL_PROBE_ENTRIES);
if (!isFullProbe(plain)) {
  console.error(`${INCOMPLETE_PROBE}; nothing written.`);
  process.exit(1);
}
const temporary = mkdtempSync(join(dirname(out), ".nation-probe-"));
try {
  const replacement = join(temporary, "replacement");
  writeFileSync(replacement, manifestBytes(file), { flag: "wx", flush: true });
  renameSync(replacement, out);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
console.log(
  `wrote ${file.hashes.length} hashes for ${file.entryCount} entries (${plain.entryCount} listed paragraphs; ${file.normalization}, longest ${file.maxWords} words) to ${out}`,
);
