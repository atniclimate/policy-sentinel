import {
  readLocalOutput,
  simulateLocalSourceFailure,
} from "../src/pipeline/policy-local-output.mjs";
import { openPolicyRun } from "../src/pipeline/policy-custody.mjs";

const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== "--corpus-root" || args[2] !== "--source")
  throw new Error("EXPLICIT_CORPUS_ROOT_AND_SOURCE_REQUIRED");
// The normal reader verifies ownership, reviewed seal, every output checksum,
// capture receipts, source objects and deterministic parser/corpus replay first.
const output = await readLocalOutput(args[1]);
const run = await openPolicyRun(args[1]);
const generatedAt = new Date().toISOString();
const results = [output, null].map((priorOutput) => {
  const result = simulateLocalSourceFailure({
    output,
    run,
    sourceProfileId: args[3],
    generatedAt,
    priorOutput,
  });
  const health = result.corpus.coverage.find(
    (entry) => entry.sourceProfileId === args[3],
  );
  return {
    status: result.status,
    corpusDigest: result.corpus.contentDigest,
    priorCorpusDigest: health.lastKnownGoodDigest,
    originalDataAsOf: health.dataAsOf,
    lastSuccessfulAt: health.lastSuccessfulAt,
    retainedSourceWorks: health.documentCount,
    independentSourceWorks: result.corpus.works.length - health.documentCount,
    outputAdapterValidated: true,
  };
});
process.stdout.write(
  `${JSON.stringify({
    kind: "controlled_local_source_failure_simulation",
    sourceProfileId: args[3],
    baselineCorpusDigest: output.manifest.corpusDigest,
    baselineManifestDigest: output.manifestDigest,
    generatedAt,
    sourceRequests: 0,
    filesystemWrites: 0,
    automaticRefresh: false,
    normalOutputChanged: false,
    results,
  })}\n`,
);
