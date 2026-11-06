#!/usr/bin/env node
// Decision 10 (2026-11-06): write the hashed Nation-name probes. Reads the
// owner's plain recognition list (the official notice HTML, kept outside the
// repository) and writes SHA-256 hashes of each normalized name, sorted, with
// the entry count, the longest name in words and the normalization version.
// It never writes a name. No network.
//
//   node scripts/make-nation-probe-hashes.mjs --nation-names <notice HTML> [--out <file>]
// DEMO_NATION_NAMES may name the list instead. The default output is
// config/nation-name-probes.sha256.v1.json.
import { writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  FULL_PROBE_ENTRIES,
  PROBE_HASH_PATH,
  REPO_ROOT,
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
const rel = relative(REPO_ROOT, resolve(list));
if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
  console.error("The plain recognition list stays outside the repository.");
  process.exit(2);
}
const plain = loadProbeNames(resolve(list));
if (!isFullProbe(plain)) {
  console.error(
    `The list holds ${plain.entryCount} entries, not the full list of ${FULL_PROBE_ENTRIES}; nothing written.`,
  );
  process.exit(1);
}
const file = probeHashFile(plain.names, plain.entryCount);
const out = resolve(values.out ?? PROBE_HASH_PATH);
writeFileSync(out, manifestBytes(file));
console.log(
  `wrote ${file.hashes.length} hashes for ${file.entryCount} entries (${file.normalization}, longest ${file.maxWords} words) to ${out}`,
);
