import path from "node:path";
import { validateKnowledge } from "../src/knowledge/validate.mjs";

const args = process.argv.slice(2);
if (args.length !== 0 && (args.length !== 2 || args[0] !== "--root")) {
  throw new Error("Usage: validate-knowledge [--root <repository>]");
}
try {
  const result = await validateKnowledge(
    path.resolve(args[1] ?? path.join(import.meta.dirname, "..")),
  );
  console.log(JSON.stringify(result.report));
} catch (error) {
  console.error(`Knowledge validation failed: ${error.message}`);
  process.exitCode = 1;
}
