import { Buffer } from "node:buffer";
import { build } from "vite";
import {
  replayReviewedCorpus,
  writeLocalOutput,
} from "../src/pipeline/policy-local-output.mjs";
import { buildPolicyResearchOutput } from "../src/pipeline/policy-research-output.mjs";
const args = process.argv.slice(2);
if (
  ![2, 4].includes(args.length) ||
  args[0] !== "--corpus-root" ||
  (args.length === 4 && args[2] !== "--name")
)
  throw new Error("EXPLICIT_CORPUS_ROOT_REQUIRED");
const { corpus } = await replayReviewedCorpus(args[1], {
  name: args[3] ?? "gold",
});
const bundles = await build({
  define: { "import.meta.env.VITE_POLICY_LOCAL": JSON.stringify("1") },
  build: { write: false, emptyOutDir: false },
  logLevel: "warn",
});
const files = new Map();
for (const bundle of Array.isArray(bundles) ? bundles : [bundles])
  for (const output of bundle.output) {
    if (files.has(output.fileName)) throw new Error("DUPLICATE_BUILD_FILE");
    files.set(
      output.fileName,
      Buffer.from(output.type === "chunk" ? output.code : output.source),
    );
  }
for (const [name, text] of buildPolicyResearchOutput(corpus)) {
  if (files.has(name)) throw new Error("RESEARCH_ASSET_CONFLICT");
  files.set(name, Buffer.from(text));
}
const result = await writeLocalOutput(args[1], corpus, files, {
  name: args[3] ?? "gold",
});
process.stdout.write(
  `${JSON.stringify({ localBuild: "complete", ...result })}\n`,
);
