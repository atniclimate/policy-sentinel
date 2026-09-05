import {
  initializePolicyRun,
  openPolicyRun,
  admitPolicyTargets,
} from "../src/pipeline/policy-custody.mjs";
import { initialDirectManifest } from "../config/policy-sources.v2.mjs";
const args = process.argv.slice(2);
const append = args[0] === "--admit";
if (append) args.shift();
if (args.length !== 2 || args[0] !== "--root")
  throw new Error("EXPECTED_EXPLICIT_EXTERNAL_ROOT");
let result;
if (append) {
  const run = await openPolicyRun(args[1]);
  const targets = initialDirectManifest(run.owner.runId).targets.filter(
    (target) => !run.manifest.targets.some((prior) => prior.url === target.url),
  );
  result = targets.length
    ? await admitPolicyTargets(args[1], {
        ...run.manifest,
        targets: [...run.manifest.targets, ...targets],
      })
    : { unchanged: true };
} else result = await initializePolicyRun(args[1], initialDirectManifest());
process.stdout.write(`${JSON.stringify(result)}\n`);
