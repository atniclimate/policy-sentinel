import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { fetchOfficialBiaRegistry } from "../src/adapters/bia/recognition-registry.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function printHelp() {
  process.stdout.write(
    [
      "Build the validated 2026 BIA recognition registry.",
      "",
      "Usage:",
      "  node scripts/build-bia-registry.mjs [--out <path>]",
      "",
      "Default output: dist/source-validation/bia/nations.json",
      "No fetched response or generated registry is written anywhere else.",
      "",
    ].join("\n"),
  );
}

function parseArguments(arguments_) {
  let output = "dist/source-validation/bia/nations.json";
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--help" || argument === "-h") {
      printHelp();
      process.exit(0);
    }
    if (argument === "--out") {
      const value = arguments_[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--out requires a file path.");
      }
      output = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return output;
}

function resolveOutput(outputArgument) {
  const output = isAbsolute(outputArgument)
    ? resolve(outputArgument)
    : resolve(repositoryRoot, outputArgument);
  const relativePath = relative(repositoryRoot, output);
  if (
    relativePath === "" ||
    relativePath.startsWith("..") ||
    isAbsolute(relativePath)
  ) {
    throw new Error("BIA registry output must remain inside the repository.");
  }

  const normalized = relativePath.replaceAll("\\", "/");
  if (!normalized.startsWith("dist/") || !normalized.endsWith(".json")) {
    throw new Error(
      `BIA registry output must be a JSON file under dist/: ${relativePath}.`,
    );
  }
  return output;
}

async function validateArtifactContract(registry) {
  const schema = JSON.parse(
    await readFile(
      resolve(repositoryRoot, "schemas/artifact.schema.v1.json"),
      "utf8",
    ),
  );
  const ajv = new Ajv2020({
    allErrors: true,
    allowUnionTypes: true,
    strict: true,
  });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(registry)) {
    throw new Error(
      `BIA registry failed artifact validation:\n${validate.errors
        .map(
          ({ instancePath, message }) => `- ${instancePath || "/"} ${message}`,
        )
        .join("\n")}`,
    );
  }
}

try {
  const output = resolveOutput(parseArguments(process.argv.slice(2)));
  const registry = await fetchOfficialBiaRegistry();
  await validateArtifactContract(registry);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(registry, null, 2)}\n`, {
    encoding: "utf8",
    flag: "w",
  });
  process.stdout.write(
    `Validated ${registry.nations.length} Nations from ${registry.baseline.documentNumber}; wrote ${relative(repositoryRoot, output)}.\n`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`BIA registry build failed: ${message}\n`);
  process.exitCode = 1;
}
