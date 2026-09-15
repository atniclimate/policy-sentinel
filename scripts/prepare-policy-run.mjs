import {
  initializePolicyRun,
  openPolicyRun,
  admitPolicyTargets,
} from "../src/pipeline/policy-custody.mjs";
import {
  initialDirectManifest,
  makahDemoFederalManifest,
} from "../config/policy-sources.v2.mjs";
const manifestFactories = {
  "real-policy-discovery-01": initialDirectManifest,
  "makah-demo-02": makahDemoFederalManifest,
};
function parseArgs(argv) {
  let admit = false;
  let root;
  let manifestName = "real-policy-discovery-01";
  let sawAdmit = false;
  let sawRoot = false;
  let sawManifest = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--admit") {
      if (sawAdmit) throw new Error("DUPLICATE_FLAG");
      sawAdmit = true;
      admit = true;
    } else if (arg === "--root") {
      if (sawRoot) throw new Error("DUPLICATE_FLAG");
      sawRoot = true;
      root = argv[i + 1];
      i += 1;
    } else if (arg === "--manifest") {
      if (sawManifest) throw new Error("DUPLICATE_FLAG");
      sawManifest = true;
      manifestName = argv[i + 1];
      i += 1;
    } else throw new Error("UNKNOWN_FLAG");
  }
  if (!sawRoot || root === undefined)
    throw new Error("EXPECTED_EXPLICIT_EXTERNAL_ROOT");
  if (!Object.hasOwn(manifestFactories, manifestName))
    throw new Error("UNKNOWN_MANIFEST");
  return { admit, root, manifestFactory: manifestFactories[manifestName] };
}
const { admit, root, manifestFactory } = parseArgs(process.argv.slice(2));
let result;
if (admit) {
  const run = await openPolicyRun(root);
  const targets = manifestFactory(run.owner.runId).targets.filter(
    (target) => !run.manifest.targets.some((prior) => prior.url === target.url),
  );
  result = targets.length
    ? await admitPolicyTargets(root, {
        ...run.manifest,
        targets: [...run.manifest.targets, ...targets],
      })
    : { unchanged: true };
} else result = await initializePolicyRun(root, manifestFactory());
process.stdout.write(`${JSON.stringify(result)}\n`);
