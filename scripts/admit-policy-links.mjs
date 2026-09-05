import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  openPolicyRun,
  readPolicyReceipt,
  admitPolicyTargets,
  writePolicyDerived,
  digest,
} from "../src/pipeline/policy-custody.mjs";
import { extractPolicyText } from "../src/pipeline/policy-text.mjs";

const args = process.argv.slice(2);
const options = {};
while (args.length) {
  const key = args.shift();
  if (!["--root", "--operation"].includes(key) || Object.hasOwn(options, key))
    throw new Error("INVALID_ARGUMENT");
  options[key] = args.shift();
}
const root = options["--root"];
const operation = options["--operation"];
const run = await openPolicyRun(root);
const { receipt } = await readPolicyReceipt(root, operation, { length: 1 });
if (
  receipt.state !== "complete" ||
  receipt.profileId !== "washington-legislative-text"
)
  throw new Error("WRONG_SOURCE_OR_STATE");
const bytes = await readFile(join(root, receipt.objectPath));
if (digest(bytes) !== receipt.objectDigest)
  throw new Error("OBJECT_DIGEST_MISMATCH");
const extraction = extractPolicyText({
  bytes,
  mediaType: receipt.mediaType,
  sourceKind: "washington_index",
  url: receipt.url,
  expectedIdentity: receipt.expectedIdentity,
});
const links = extraction.links.filter((link) => {
  const url = new URL(link.url);
  return (
    url.hostname === "lawfilesext.leg.wa.gov" &&
    /^\/biennium\/\d{4}-\d{2}\/Htm\/Bills\//i.test(url.pathname) &&
    /\.htm$/i.test(url.pathname) &&
    !url.search &&
    !url.hash &&
    link.sourceMetadata?.documentClass === "Bills" &&
    ["Bills", "Session Laws"].includes(link.sourceMetadata?.documentType)
  );
});
if (!links.length) throw new Error("NO_REVIEWED_DOCUMENT_LINKS");
const additions = links
  .filter(
    (link) => !run.manifest.targets.some((target) => target.url === link.url),
  )
  .map((link) => {
    const match = /\/(\d{4})(?:-[SE]\d?)?(?:\.[A-Z]+)?\.htm$/i.exec(
      new URL(link.url).pathname,
    );
    if (!match) throw new Error("UNSUPPORTED_BILL_FILENAME");
    return {
      profileId: receipt.profileId,
      url: link.url,
      expectedIdentity: `Washington ${match[1]} ${link.sourceMetadata.biennium}`,
      mediaTypes: ["text/html"],
    };
  });
const review = {
  version: "1.0.0",
  disposition: "admitted_advertised_targets_pending_body_review",
  reviewer:
    "Policy Sentinel implementation lead under reviewed Washington bill-text profile",
  reviewedAt: new Date().toISOString(),
  evidenceOperationId: operation,
  evidenceObjectDigest: receipt.objectDigest,
  parser: extraction.parser,
  links,
  additions,
  limitations: [
    "Provider effectiveDate and lastModifiedDate are unqualified metadata; neither establishes legal effect or publication.",
    "Admission verifies the advertised source route; document identity, stage, allowed content, and facts still require retained body review.",
  ],
};
const record = await writePolicyDerived(
  root,
  `review/admissions/${operation}.json`,
  Buffer.from(`${JSON.stringify(review, null, 2)}\n`),
);
const result = additions.length
  ? await admitPolicyTargets(root, {
      ...run.manifest,
      targets: [...run.manifest.targets, ...additions],
    })
  : { unchanged: true };
process.stdout.write(`${JSON.stringify({ record, result, additions })}\n`);
