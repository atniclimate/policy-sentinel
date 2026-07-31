import {
  link,
  lstat,
  mkdir,
  realpath,
  unlink,
  writeFile,
} from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";

const BIA_STAGING_PREFIX = ".cache/source-validation/bia/";
const LEGACY_BIA_OUTPUT = "dist/source-validation/bia/nations.json";

function isMissingPath(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function isExistingPath(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "EEXIST"
  );
}

function assertContainedRealPath(
  rootRealPath: string,
  currentRealPath: string,
): void {
  if (
    currentRealPath !== rootRealPath &&
    !currentRealPath.startsWith(`${rootRealPath}${sep}`)
  ) {
    throw new Error(
      `BIA registry staging path resolves outside the repository: ${currentRealPath}.`,
    );
  }
}

async function validateExistingComponent(
  rootRealPath: string,
  current: string,
  requireDirectory: boolean,
) {
  const stats = await lstat(current);
  if (stats.isSymbolicLink()) {
    throw new Error(
      `BIA registry staging refuses a linked path component: ${current}.`,
    );
  }
  if (requireDirectory && !stats.isDirectory()) {
    throw new Error(
      `BIA registry staging path component is not a directory: ${current}.`,
    );
  }
  const currentRealPath = await realpath(current);
  assertContainedRealPath(rootRealPath, currentRealPath);
  return { currentRealPath, stats };
}

export function resolveBiaStagingOutput(
  repositoryRoot: string,
  outputArgument: string,
): string {
  const root = resolve(repositoryRoot);
  const output = isAbsolute(outputArgument)
    ? resolve(outputArgument)
    : resolve(root, outputArgument);
  const relativePath = relative(root, output);
  if (
    relativePath === "" ||
    relativePath.startsWith("..") ||
    isAbsolute(relativePath)
  ) {
    throw new Error("BIA registry output must remain inside the repository.");
  }

  const normalized = relativePath.replaceAll("\\", "/");
  if (
    !normalized.startsWith(BIA_STAGING_PREFIX) ||
    !normalized.endsWith(".json")
  ) {
    throw new Error(
      `BIA registry output must be a JSON file under ${BIA_STAGING_PREFIX}: ${relativePath}.`,
    );
  }
  return output;
}

async function assertNoLinkedPathComponents(
  repositoryRoot: string,
  target: string,
): Promise<void> {
  const root = resolve(repositoryRoot);
  const rootRealPath = await realpath(root);
  const components = relative(root, target).split(sep).filter(Boolean);
  let current = root;

  for (const [index, component] of components.entries()) {
    current = resolve(current, component);
    try {
      await validateExistingComponent(
        rootRealPath,
        current,
        index < components.length - 1,
      );
    } catch (error) {
      if (isMissingPath(error)) {
        return;
      }
      throw error;
    }
  }
}

async function ensureSafeDirectoryPath(
  repositoryRoot: string,
  targetDirectory: string,
): Promise<void> {
  const root = resolve(repositoryRoot);
  const rootRealPath = await realpath(root);
  const components = relative(root, targetDirectory).split(sep).filter(Boolean);
  let current = root;
  let currentRealPath = rootRealPath;

  for (const component of components) {
    current = resolve(current, component);
    const candidateFromRealParent = resolve(currentRealPath, component);
    try {
      const validated = await validateExistingComponent(
        rootRealPath,
        current,
        true,
      );
      currentRealPath = validated.currentRealPath;
      continue;
    } catch (error) {
      if (!isMissingPath(error)) {
        throw error;
      }
    }

    try {
      await mkdir(candidateFromRealParent);
    } catch (error) {
      if (!isExistingPath(error)) {
        throw error;
      }
    }
    const validated = await validateExistingComponent(
      rootRealPath,
      current,
      true,
    );
    currentRealPath = validated.currentRealPath;
  }
}

async function removeRegularFileIfPresent(
  repositoryRoot: string,
  target: string,
  label: string,
): Promise<void> {
  await assertNoLinkedPathComponents(repositoryRoot, target);
  try {
    const stats = await lstat(target);
    if (!stats.isFile()) {
      throw new Error(`${label} is not a regular file: ${target}.`);
    }
    await unlink(target);
  } catch (error) {
    if (!isMissingPath(error)) {
      throw error;
    }
  }
}

export async function prepareBiaStagingOutput(
  repositoryRoot: string,
  outputArgument: string,
): Promise<string> {
  const output = resolveBiaStagingOutput(repositoryRoot, outputArgument);
  await removeRegularFileIfPresent(
    repositoryRoot,
    resolve(repositoryRoot, LEGACY_BIA_OUTPUT),
    "Legacy BIA deploy-tree output",
  );
  await removeRegularFileIfPresent(
    repositoryRoot,
    output,
    "BIA registry staging target",
  );
  return output;
}

export async function writeBiaStagingJson(
  repositoryRoot: string,
  outputArgument: string,
  content: string,
): Promise<string> {
  const output = resolveBiaStagingOutput(repositoryRoot, outputArgument);
  const outputDirectory = dirname(output);
  await ensureSafeDirectoryPath(repositoryRoot, outputDirectory);
  await assertNoLinkedPathComponents(repositoryRoot, output);

  const temporaryOutput = resolve(
    outputDirectory,
    `.${basename(output)}.${process.pid}.${Date.now()}.tmp`,
  );
  try {
    await writeFile(temporaryOutput, content, {
      encoding: "utf8",
      flag: "wx",
    });
    await assertNoLinkedPathComponents(repositoryRoot, temporaryOutput);
    try {
      await link(temporaryOutput, output);
    } catch (error) {
      if (isExistingPath(error)) {
        throw new Error(
          `BIA registry staging target appeared during validation: ${output}.`,
          { cause: error },
        );
      }
      throw error;
    }
    await unlink(temporaryOutput);
  } catch (error) {
    try {
      await unlink(temporaryOutput);
    } catch (cleanupError) {
      if (!isMissingPath(cleanupError)) {
        throw cleanupError;
      }
    }
    throw error;
  }
  return output;
}
