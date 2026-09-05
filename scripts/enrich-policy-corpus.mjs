import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { digest, writePolicyDerived } from "../src/pipeline/policy-custody.mjs";
import { replayReviewedCorpus } from "../src/pipeline/policy-local-output.mjs";
import { enrichPolicyCorpus } from "../src/pipeline/policy-research-output.mjs";
import { serializeAnalyzedCorpusV2 } from "../src/pipeline/analyzed-corpus-v2.mjs";

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--corpus-root")
  throw new Error("EXPLICIT_CORPUS_ROOT_REQUIRED");
const root = args[1];
const base = await replayReviewedCorpus(root, { name: "gold" });
const reviewBytes = await readFile(join(root, "review/research-input.json"));
if (reviewBytes.length > 8 * 1024 ** 2) throw new Error("RESEARCH_INPUT_LIMIT");
const review = JSON.parse(reviewBytes.toString("utf8"));
const corpus = enrichPolicyCorpus({ corpus: base.corpus, review });
const outputBytes = Buffer.from(serializeAnalyzedCorpusV2(corpus));
const output = await writePolicyDerived(
  root,
  "work/research-corpus.json",
  outputBytes,
);
const seal = {
  version: "1.0.0",
  baseCorpusDigest: base.corpus.contentDigest,
  baseInputDigest: base.seal.inputDigest,
  baseOutputDigest: base.seal.outputDigest,
  inputDigest: digest(reviewBytes),
  outputDigest: output.digest,
  corpusDigest: corpus.contentDigest,
  generatedAt: corpus.generatedAt,
};
await writePolicyDerived(
  root,
  "review/research-seal.json",
  Buffer.from(`${JSON.stringify(seal, null, 2)}\n`),
);
process.stdout.write(
  `${JSON.stringify({ researchEnrichment: "complete", baseCorpusDigest: base.corpus.contentDigest, corpusDigest: corpus.contentDigest, relationships: corpus.relationships.length, analyses: corpus.analyses.length, findings: corpus.findings.length })}\n`,
);
