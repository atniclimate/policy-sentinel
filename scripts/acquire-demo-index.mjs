// The only fetcher for docs/demo-data (index conditions A3, D-125). Never run
// by build, check, demo:build or test. Start with --dry-run to see the plan.
import { USAGE, runAcquire } from "./demo-index/acquire.mjs";

if (process.argv.length <= 2) {
  console.log(USAGE);
  process.exit(2);
}
const { exitCode } = await runAcquire(process.argv.slice(2));
process.exit(exitCode);
