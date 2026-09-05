import path from "node:path";
import { validateKnowledge } from "../src/knowledge/validate.mjs";
import { buildNavigation } from "../src/knowledge/navigation.mjs";
import { publishKnowledge } from "../src/knowledge/publish.mjs";

const args = process.argv.slice(2);
const options = new Map();
for (let index = 0; index < args.length; index += 2) {
  if (
    !["--root", "--out"].includes(args[index]) ||
    !args[index + 1] ||
    options.has(args[index])
  )
    throw new Error(
      "Usage: generate-knowledge --out <external-directory> [--root <repository>]",
    );
  options.set(args[index], args[index + 1]);
}
if (!options.has("--out"))
  throw new Error("An explicitly owned external --out directory is required.");
try {
  const model = await validateKnowledge(
    path.resolve(options.get("--root") ?? path.join(import.meta.dirname, "..")),
  );
  const navigation = buildNavigation(model);
  console.log(
    JSON.stringify(
      await publishKnowledge(model, navigation.files, options.get("--out")),
    ),
  );
} catch (error) {
  console.error(`Knowledge generation failed: ${error.message}`);
  process.exitCode = 1;
}
