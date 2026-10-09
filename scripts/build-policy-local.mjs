import { Buffer } from "node:buffer";
import { build } from "vite";
import {
  replayReviewedCorpus,
  writeLocalOutput,
} from "../src/pipeline/policy-local-output.mjs";
import { buildPolicyResearchOutput } from "../src/pipeline/policy-research-output.mjs";
import { createSearchProjection } from "../src/modules/output/local-workbench/search-projection.mjs";
const args = process.argv.slice(2);
const options = new Map();
for (let index = 0; index < args.length; index += 2) {
  const flag = args[index];
  const value = args[index + 1];
  if (
    !["--corpus-root", "--name", "--sources", "--from", "--through"].includes(
      flag,
    ) ||
    options.has(flag) ||
    !value ||
    value.startsWith("--")
  )
    throw new Error("INVALID_LOCAL_BUILD_ARGUMENTS");
  options.set(flag, value);
}
if (!options.has("--corpus-root"))
  throw new Error("EXPLICIT_CORPUS_ROOT_REQUIRED");
const root = options.get("--corpus-root");
const name = options.get("--name") ?? "gold";
const { corpus } = await replayReviewedCorpus(root, {
  name,
});
const selection = ["--sources", "--from", "--through"].some((flag) =>
  options.has(flag),
)
  ? {
      sourceProfileIds: options.has("--sources")
        ? options.get("--sources").split(",")
        : corpus.sourceProfiles.map((profile) => profile.id),
      from: options.get("--from") ?? null,
      through: options.get("--through") ?? null,
    }
  : undefined;
const outputCorpus = selection
  ? createSearchProjection(corpus, selection).corpus
  : corpus;
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
for (const [name, text] of buildPolicyResearchOutput(outputCorpus)) {
  if (files.has(name)) throw new Error("RESEARCH_ASSET_CONFLICT");
  files.set(name, Buffer.from(text));
}
const result = await writeLocalOutput(root, corpus, files, {
  name,
  ...(selection ? { selection } : {}),
});
process.stdout.write(
  `${JSON.stringify({ localBuild: "complete", ...result })}\n`,
);
