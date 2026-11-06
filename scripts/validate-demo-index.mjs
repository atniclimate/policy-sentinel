// Validate the static index (docs/demo-data). No network.
//   node scripts/validate-demo-index.mjs --dir docs/demo-data
//     [--nation-names <recognition notice HTML>] [--nation-hashes <hash file>]
// Any index file present needs the full Nation-name list (G3): the committed
// config/nation-name-probes.sha256.v1.json when it holds all entries
// (decision 10), or the plain list by --nation-names or DEMO_NATION_NAMES
// (npm run check passes no flags).
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  FULL_PROBE_ENTRIES,
  isFullProbe,
  loadNationProbe,
} from "./demo-index/common.mjs";
import { validateDemoIndex } from "./demo-index/validate.mjs";

const { values } = parseArgs({
  options: {
    dir: { type: "string" },
    "nation-names": { type: "string" },
    "nation-hashes": { type: "string" },
  },
});
if (!values.dir) {
  console.error(
    "usage: validate-demo-index.mjs --dir <docs/demo-data> [--nation-names <html>] [--nation-hashes <json>]",
  );
  process.exit(2);
}
const probe = loadNationProbe({
  namesPath:
    values["nation-names"] || process.env.DEMO_NATION_NAMES || undefined,
  hashPath: values["nation-hashes"] && resolve(values["nation-hashes"]),
});
const result = validateDemoIndex(resolve(values.dir), { probe });
if (result.fileCount > 0 && !isFullProbe(probe)) {
  result.ok = false;
  result.errors.push(
    `${result.fileCount} index files present, but the Nation-name probes hold ${probe.entryCount} entries, not the full list of ${FULL_PROBE_ENTRIES} (G3)`,
  );
}
for (const warning of result.warnings) console.warn(`warning: ${warning}`);
for (const error of result.errors) console.error(`error: ${error}`);
const line = `${result.fileCount} files present (${result.currentCount} current), ${result.totalBytes} bytes; Nation-name probes: ${result.probe.source}, ${probe.entryCount} entries, ${result.probe.nameCount} names, ${result.probe.hashCount} hashes`;
if (!result.ok) {
  console.error(`demo index invalid: ${result.errors.length} errors; ${line}`);
  process.exit(1);
}
console.log(`demo index valid: ${line}`);
