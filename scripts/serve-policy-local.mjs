import {
  createLoopbackOutputServer,
  readLocalOutput,
} from "../src/pipeline/policy-local-output.mjs";
const args = process.argv.slice(2);
if (
  ![2, 4].includes(args.length) ||
  args[0] !== "--corpus-root" ||
  (args.length === 4 && (args[2] !== "--port" || !/^\d{1,5}$/.test(args[3])))
)
  throw new Error("EXPLICIT_CORPUS_ROOT_REQUIRED");
const output = await readLocalOutput(args[1]);
const server = await createLoopbackOutputServer(
  output.files,
  args[3] === undefined ? 4179 : Number(args[3]),
);
process.stdout.write(
  `${JSON.stringify({ url: `http://127.0.0.1:${server.address().port}/`, buildId: output.manifest.buildId, corpusDigest: output.manifest.corpusDigest, files: output.files.size, boundary: "reviewed-output-only" })}\n`,
);
process.on("SIGINT", () => server.close());
process.on("SIGTERM", () => server.close());
