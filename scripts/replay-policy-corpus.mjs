import { replayReviewedCorpus } from "../src/pipeline/policy-local-output.mjs";
const args = process.argv.slice(2);
if (
  ![2, 4].includes(args.length) ||
  args[0] !== "--corpus-root" ||
  (args.length === 4 && args[2] !== "--name")
)
  throw new Error("EXPLICIT_CORPUS_ROOT_REQUIRED");
const result = await replayReviewedCorpus(args[1], { name: args[3] ?? "gold" });
process.stdout.write(
  `${JSON.stringify({ replay: "verified", corpusDigest: result.corpus.contentDigest, works: result.corpus.works.length, versions: result.corpus.versions.length, segments: result.corpus.segments.length, custody: result.custody })}\n`,
);
