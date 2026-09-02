import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");
const IGNORED_DIRECTORY_NAMES = new Set([
  ".cache",
  ".git",
  "coverage",
  "dist",
  "node_modules",
]);
const PRESERVED_OWNER_DIRECTION_MARKDOWN = new Set([
  "docs/00-READ-FIRST.md",
  "docs/01-NORTH-STAR-AND-PRODUCT-CONTRACT.md",
  "docs/02-PNW-REGIONAL-SCOPE-AND-AUTHORITY.md",
  "docs/03-ENGINE-ARCHITECTURE-AND-DATA-MODEL.md",
  "docs/04-DEFINITION-OF-DONE-AND-ACCEPTANCE.md",
  "docs/06-REPRESENTATIVE-USE-CASES.md",
  "docs/07-DECISIONS-GATES-AND-NON-GOALS.md",
  "docs/08-CODEX-LONG-RUN-DIRECTIVE.md",
  "docs/10-CODEX-PRODUCT-SPACE-REBASE-CONTINUATION.md",
  "docs/11-CODEX-REPOSITORY-CONGRUENCE-AND-LONG-RUN-HANDOFF.md",
  "docs/12-CODEX-PNW-03-GEOGRAPHY-RIGHTS-IMPLEMENTATION-LONG-RUN.md",
]);
const JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const repositoryPath = (repositoryRoot, filePath) =>
  path.relative(repositoryRoot, filePath).split(path.sep).join("/");

const isWithin = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
};

const walkFiles = async (
  directory,
  accept,
  ignoredDirectoryNames = new Set(),
) => {
  const files = [];
  const visit = async (current) => {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const entryPath = path.resolve(current, entry.name);
      if (entry.isSymbolicLink()) {
        continue;
      }
      if (entry.isDirectory()) {
        if (!ignoredDirectoryNames.has(entry.name)) {
          await visit(entryPath);
        }
        continue;
      }
      if (entry.isFile() && accept(entryPath)) {
        files.push(entryPath);
      }
    }
  };
  await visit(directory);
  return files;
};

export class BackboneValidationError extends Error {
  constructor(kind, issues) {
    super(`${kind} validation failed:\n- ${issues.join("\n- ")}`);
    this.name = "BackboneValidationError";
    this.kind = kind;
    this.issues = Object.freeze([...issues]);
  }
}

const withoutFragment = (url) => {
  const normalized = new URL(url.href);
  normalized.hash = "";
  return normalized.href;
};

const resolveSchemaId = (value, base, label, issues) => {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(`${label} must be a non-empty string`);
    return null;
  }
  try {
    const resolved = new URL(value, base);
    if (resolved.hash && resolved.hash !== "#") {
      issues.push(`${label} must not contain a non-empty fragment: ${value}`);
      return null;
    }
    resolved.hash = "";
    return resolved.href;
  } catch {
    issues.push(`${label} is not a resolvable URI: ${value}`);
    return null;
  }
};

const decodePointerSegment = (segment, label, issues) => {
  if (/~(?:[^01]|$)/u.test(segment)) {
    issues.push(`${label} contains an invalid JSON Pointer escape`);
    return null;
  }
  return segment.replaceAll("~1", "/").replaceAll("~0", "~");
};

const resolveJsonPointer = (root, fragment, label, issues) => {
  let pointer;
  try {
    pointer = decodeURIComponent(fragment);
  } catch {
    issues.push(`${label} contains an invalid percent-encoded fragment`);
    return;
  }
  if (pointer === "") {
    return;
  }
  if (!pointer.startsWith("/")) {
    issues.push(`${label} uses an unresolved schema anchor #${fragment}`);
    return;
  }

  let value = root;
  for (const rawSegment of pointer.slice(1).split("/")) {
    const segment = decodePointerSegment(rawSegment, label, issues);
    if (segment === null) {
      return;
    }
    if (Array.isArray(value)) {
      if (!/^(?:0|[1-9][0-9]*)$/u.test(segment)) {
        issues.push(`${label} does not resolve at array segment ${segment}`);
        return;
      }
      const index = Number(segment);
      if (index >= value.length) {
        issues.push(`${label} does not resolve at array index ${segment}`);
        return;
      }
      value = value[index];
      continue;
    }
    if (!isObject(value) || !Object.hasOwn(value, segment)) {
      issues.push(`${label} does not resolve at segment ${segment}`);
      return;
    }
    value = value[segment];
  }
};

const schemaNodeEntries = (node) => {
  if (Array.isArray(node)) {
    return node.map((value, index) => [String(index), value]);
  }
  if (isObject(node)) {
    return Object.entries(node);
  }
  return [];
};

export const validateSchemaGraph = async (repositoryRoot) => {
  const root = path.resolve(repositoryRoot);
  const schemaDirectory = path.resolve(root, "schemas");
  let schemaFiles;
  try {
    schemaFiles = await walkFiles(schemaDirectory, (filePath) =>
      filePath.endsWith(".json"),
    );
  } catch (error) {
    throw new BackboneValidationError("JSON Schema graph", [
      `cannot read schemas directory ${repositoryPath(root, schemaDirectory) || "schemas"}: ${error.message}`,
    ]);
  }
  if (schemaFiles.length === 0) {
    throw new BackboneValidationError("JSON Schema graph", [
      "no JSON Schema files were found under schemas/",
    ]);
  }

  const issues = [];
  const resources = new Map();
  const anchors = new Map();
  const references = [];

  for (const schemaFile of schemaFiles) {
    const relativeFile = repositoryPath(root, schemaFile);
    let schema;
    try {
      schema = JSON.parse(await readFile(schemaFile, "utf8"));
    } catch (error) {
      issues.push(`${relativeFile} is not valid JSON: ${error.message}`);
      continue;
    }
    if (!isObject(schema)) {
      issues.push(`${relativeFile} must contain a JSON object schema`);
      continue;
    }
    if (schema.$schema !== JSON_SCHEMA_DIALECT) {
      issues.push(
        `${relativeFile} must declare ${JSON_SCHEMA_DIALECT} in $schema`,
      );
    }
    if (typeof schema.$id !== "string" || schema.$id.length === 0) {
      issues.push(`${relativeFile} must declare a non-empty top-level $id`);
      continue;
    }
    try {
      new URL(schema.$id);
    } catch {
      issues.push(
        `${relativeFile} top-level $id must be absolute: ${schema.$id}`,
      );
      continue;
    }

    const initialBase = pathToFileURL(schemaFile).href;
    const visit = (node, inheritedBase, pointer, resourceRoot) => {
      if (!isObject(node) && !Array.isArray(node)) {
        return;
      }

      let activeBase = inheritedBase;
      let activeResourceRoot = resourceRoot;
      if (isObject(node) && Object.hasOwn(node, "$id")) {
        const resolvedId = resolveSchemaId(
          node.$id,
          inheritedBase,
          `${relativeFile}${pointer}/$id`,
          issues,
        );
        if (resolvedId) {
          const existing = resources.get(resolvedId);
          if (existing) {
            issues.push(
              `duplicate JSON Schema $id ${resolvedId} in ${existing.file}${existing.pointer} and ${relativeFile}${pointer}`,
            );
          } else {
            resources.set(resolvedId, {
              file: relativeFile,
              node,
              pointer,
            });
          }
          activeBase = resolvedId;
          activeResourceRoot = node;
        }
      }

      if (isObject(node) && Object.hasOwn(node, "$anchor")) {
        if (
          typeof node.$anchor !== "string" ||
          !/^[A-Za-z_][A-Za-z0-9._-]*$/u.test(node.$anchor)
        ) {
          issues.push(`${relativeFile}${pointer}/$anchor is invalid`);
        } else {
          const anchorUrl = `${withoutFragment(new URL(activeBase))}#${node.$anchor}`;
          const existing = anchors.get(anchorUrl);
          if (existing) {
            issues.push(
              `duplicate JSON Schema $anchor ${anchorUrl} in ${existing} and ${relativeFile}${pointer}`,
            );
          } else {
            anchors.set(anchorUrl, `${relativeFile}${pointer}`);
          }
        }
      }

      if (isObject(node) && Object.hasOwn(node, "$ref")) {
        if (typeof node.$ref !== "string" || node.$ref.length === 0) {
          issues.push(
            `${relativeFile}${pointer}/$ref must be a non-empty string`,
          );
        } else {
          references.push({
            base: activeBase,
            file: relativeFile,
            pointer: `${pointer}/$ref`,
            ref: node.$ref,
            resourceRoot: activeResourceRoot,
          });
        }
      }

      for (const [key, value] of schemaNodeEntries(node)) {
        if (key === "$id" || key === "$anchor" || key === "$ref") {
          continue;
        }
        const escapedKey = key.replaceAll("~", "~0").replaceAll("/", "~1");
        visit(
          value,
          activeBase,
          `${pointer}/${escapedKey}`,
          activeResourceRoot,
        );
      }
    };

    visit(schema, initialBase, "#", schema);
  }

  for (const reference of references) {
    const label = `${reference.file}${reference.pointer} (${reference.ref})`;
    let target;
    try {
      target = new URL(reference.ref, reference.base);
    } catch {
      issues.push(`${label} is not a resolvable URI-reference`);
      continue;
    }
    const resourceId = withoutFragment(target);
    const resource = resources.get(resourceId);
    if (!resource) {
      issues.push(`${label} references unknown schema resource ${resourceId}`);
      continue;
    }
    const fragment = target.hash.slice(1);
    if (fragment !== "" && !fragment.startsWith("/")) {
      if (!anchors.has(target.href)) {
        issues.push(`${label} uses an unresolved schema anchor #${fragment}`);
      }
      continue;
    }
    resolveJsonPointer(resource.node, fragment, label, issues);
  }

  if (issues.length > 0) {
    throw new BackboneValidationError("JSON Schema graph", issues);
  }

  return Object.freeze({
    schemaFiles: schemaFiles.length,
    schemaIds: resources.size,
    references: references.length,
  });
};

const stripMarkdownCode = (markdown) => {
  const output = [];
  let fence = null;
  for (const line of markdown.split(/\r?\n/u)) {
    const marker = /^\s*(`{3,}|~{3,})/u.exec(line)?.[1] ?? null;
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) {
        fence = null;
      }
      output.push("");
      continue;
    }
    if (marker) {
      fence = marker;
      output.push("");
      continue;
    }
    output.push(line.replace(/(`+)(.*?)\1/gu, ""));
  }
  return output.join("\n");
};

const parseInlineDestination = (markdown, openingIndex) => {
  let index = openingIndex;
  while (/\s/u.test(markdown[index] ?? "")) {
    index += 1;
  }
  if (markdown[index] === "<") {
    const end = markdown.indexOf(">", index + 1);
    return end === -1
      ? null
      : { destination: markdown.slice(index + 1, end), end };
  }

  let destination = "";
  let nestedParentheses = 0;
  for (; index < markdown.length; index += 1) {
    const character = markdown[index];
    if (character === "\\" && index + 1 < markdown.length) {
      destination += markdown[index + 1];
      index += 1;
      continue;
    }
    if (character === "(") {
      nestedParentheses += 1;
      destination += character;
      continue;
    }
    if (character === ")") {
      if (nestedParentheses === 0) {
        return { destination, end: index };
      }
      nestedParentheses -= 1;
      destination += character;
      continue;
    }
    if (/\s/u.test(character) && nestedParentheses === 0) {
      return { destination, end: index };
    }
    destination += character;
  }
  return null;
};

export const extractMarkdownDestinations = (markdown) => {
  const source = stripMarkdownCode(markdown);
  const destinations = [];
  const definitions = /^\s{0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gmu;
  for (const match of source.matchAll(definitions)) {
    destinations.push(match[1] ?? match[2]);
  }

  let cursor = 0;
  while (cursor < source.length) {
    const closeLabel = source.indexOf("](", cursor);
    if (closeLabel === -1) {
      break;
    }
    const openLabel = source.lastIndexOf("[", closeLabel);
    if (openLabel !== -1) {
      const parsed = parseInlineDestination(source, closeLabel + 2);
      if (parsed?.destination) {
        destinations.push(parsed.destination);
      }
      cursor = parsed ? parsed.end + 1 : closeLabel + 2;
    } else {
      cursor = closeLabel + 2;
    }
  }
  return destinations;
};

const localMarkdownPath = (destination) => {
  const trimmed = destination.trim();
  if (
    trimmed === "" ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(trimmed)
  ) {
    return null;
  }
  const pathPart = trimmed.split(/[?#]/u, 1)[0];
  if (pathPart === "") {
    return null;
  }
  try {
    return decodeURIComponent(pathPart);
  } catch {
    return pathPart;
  }
};

export const validateMarkdownLinks = async (repositoryRoot) => {
  const root = path.resolve(repositoryRoot);
  let markdownFiles;
  try {
    const discoveredMarkdownFiles = await walkFiles(
      root,
      (filePath) => filePath.toLowerCase().endsWith(".md"),
      IGNORED_DIRECTORY_NAMES,
    );
    markdownFiles = discoveredMarkdownFiles.filter(
      (filePath) =>
        !PRESERVED_OWNER_DIRECTION_MARKDOWN.has(repositoryPath(root, filePath)),
    );
  } catch (error) {
    throw new BackboneValidationError("Markdown link", [
      `cannot inventory repository Markdown: ${error.message}`,
    ]);
  }

  const issues = [];
  let localLinks = 0;
  for (const markdownFile of markdownFiles) {
    const relativeFile = repositoryPath(root, markdownFile);
    const markdown = await readFile(markdownFile, "utf8");
    for (const destination of extractMarkdownDestinations(markdown)) {
      const localPath = localMarkdownPath(destination);
      if (localPath === null) {
        continue;
      }
      localLinks += 1;
      const target = path.resolve(path.dirname(markdownFile), localPath);
      if (!isWithin(root, target)) {
        issues.push(
          `${relativeFile} link escapes the repository: ${destination}`,
        );
        continue;
      }
      try {
        await stat(target);
      } catch {
        issues.push(`${relativeFile} has a missing local link: ${destination}`);
      }
    }
  }

  if (issues.length > 0) {
    throw new BackboneValidationError("Markdown link", issues);
  }

  return Object.freeze({ markdownFiles: markdownFiles.length, localLinks });
};

export const validateBackbone = async (repositoryRoot) => {
  const root = path.resolve(repositoryRoot);
  const schema = await validateSchemaGraph(root);
  const markdown = await validateMarkdownLinks(root);
  return Object.freeze({ root, schema, markdown });
};

export const parseArguments = (arguments_) => {
  let root = DEFAULT_REPOSITORY_ROOT;
  let help = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }
    if (argument === "--root") {
      const value = arguments_[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("--root requires a path");
      }
      root = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument.startsWith("--root=")) {
      const value = argument.slice("--root=".length);
      if (!value) {
        throw new Error("--root requires a path");
      }
      root = path.resolve(value);
      continue;
    }
    throw new Error(`unknown argument: ${argument}`);
  }
  return Object.freeze({ help, root });
};

export const main = async (arguments_ = process.argv.slice(2)) => {
  const options = parseArguments(arguments_);
  if (options.help) {
    console.log("Usage: node scripts/validate-backbone.mjs [--root PATH]");
    return null;
  }
  const result = await validateBackbone(options.root);
  console.log(
    `Backbone validation passed: ${result.schema.schemaFiles} JSON Schemas, ` +
      `${result.schema.schemaIds} schema IDs, ${result.schema.references} $refs, ` +
      `${result.markdown.markdownFiles} Markdown files, and ` +
      `${result.markdown.localLinks} local links.`,
  );
  return result;
};

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
