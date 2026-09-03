import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const DEFAULT_REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");
const IGNORED_DIRECTORY_NAMES = new Set([
  ".cache",
  ".git",
  "coverage",
  "dist",
  "node_modules",
]);
const PRESERVED_OWNER_DIRECTION_MARKDOWN = new Map([
  [
    "docs/00-READ-FIRST.md",
    "88f6967bf9655c02e2b598011f437e9c0ed7415b3c722fe537ffa7171095f6fa",
  ],
  [
    "docs/01-NORTH-STAR-AND-PRODUCT-CONTRACT.md",
    "22738dfd2d2362cffd5071d2553aea907ded5b0f734c917dcf6b4b1a80da9b52",
  ],
  [
    "docs/02-PNW-REGIONAL-SCOPE-AND-AUTHORITY.md",
    "b0f9dfd54b126cd94f6236976edd20c66f697a665236a5a17eafc863090f3556",
  ],
  [
    "docs/03-ENGINE-ARCHITECTURE-AND-DATA-MODEL.md",
    "67abb72b8f3c816af0c9582a34ced6da0f74cbd986f6339c7e9e01171e0bfe9b",
  ],
  [
    "docs/04-DEFINITION-OF-DONE-AND-ACCEPTANCE.md",
    "0ca69a5f78e5e0f6fc21e4786f77228b033afab2f54755d1b30ee63492645a41",
  ],
  [
    "docs/06-REPRESENTATIVE-USE-CASES.md",
    "ba7bd9911f6a8f5b5a7eaba17de366f03d1f298e7648d463fe5a456781d55965",
  ],
  [
    "docs/07-DECISIONS-GATES-AND-NON-GOALS.md",
    "9677dfe181f64db80009bd3bf469b3aef756e9cc3829536bc2461c0d8c9e012a",
  ],
  [
    "docs/08-CODEX-LONG-RUN-DIRECTIVE.md",
    "afdefa2dc2bfdea37edd345ceef07dd11b97a910e45e2b5c51d052035533b29f",
  ],
  [
    "docs/10-CODEX-PRODUCT-SPACE-REBASE-CONTINUATION.md",
    "0110be885473a7b5287eaa7cc8ff864b10a21409b2f62b5d8bb667a8ae2b68b3",
  ],
  [
    "docs/11-CODEX-REPOSITORY-CONGRUENCE-AND-LONG-RUN-HANDOFF.md",
    "9a49eecddbc626190e7d5a9f445c0e14348d2aa63fb4c0edc6f757572c6cadc3",
  ],
  [
    "docs/12-CODEX-PNW-03-GEOGRAPHY-RIGHTS-IMPLEMENTATION-LONG-RUN.md",
    "84fcb0bf60021c75c7e87b2b61d1e8b066b3c9b63a7ecf4a7dfd1e49315d9959",
  ],
  [
    "docs/13-CODEX-PNW-04-TAXONOMY-IMPLEMENTATION-LONG-RUN.md",
    "e82c88fddd781e2fffccb8871c1dc30502ebf7838d0efb167d4a50a6e6e0555a",
  ],
  [
    "docs/14-CODEX-PNW-05-SOURCE-PACK-CORE-LONG-RUN.md",
    "6146b2e478caf484e702e48f4412d2cbeb8f461212f53cf63862e61d573c12f6",
  ],
  [
    "docs/14A-CODEX-PNW-05-SOURCE-PACK-CORE-CLOSEOUT.md",
    "b8ddbb2e2f34d7e4221ebda7065105cc1a3563be6618ba7660459ea1c4134bd2",
  ],
  [
    "docs/15-CODEX-PNW-05-FEDERAL-REGISTER-DOC-REVIEW-MAX-LONG-RUN.md",
    "508c6b8ec3f69e57eceb81b44a4510ae59e514b48c9dee9ef93e6319c24b08c2",
  ],
  [
    "docs/15A-PNW-05-SOURCE-CANDIDATE-QUALIFICATION-AND-AUTHORIZATION.md",
    "eda4148c38480081e29b119ecf4c6df7c051cbb235632af93a3e2d740b807b89",
  ],
  [
    "docs/15B-CASE-EXAMPLE-01-LUMMI-POINT-ROBERTS-BROADBAND.md",
    "e6e255ae5956c9f685fd840b26b6f3e827553e02f750edd0da043a9955597743",
  ],
  [
    "docs/15C-CASE-EXAMPLE-02-ROADLESS-RULE-RESCISSION.md",
    "45c716302379c30eef79307f843d7d982350e2da6debb5a5becf7fb3ddcd7c9e",
  ],
  [
    "docs/15D-PNW-05-CASE-EVIDENCE-CROSSWALK.md",
    "61010682c331836619a01c8afaa172c9e82e0b6860de6c3907406aedfce14eda",
  ],
  [
    "docs/15E-PNW-05-TRIBAL-POLICY-CONTEXT-SOURCE-LANDSCAPE.md",
    "bde02ceccf87554964d09b30d134b510d69777a377af9564ea46f27f82df069c",
  ],
  [
    "docs/POLICY-SENTINEL-REAL-SOURCE-PRERELEASE-MAX-LONG-RUN.md",
    "7cac531c3346fc85c2eb37701ecfcb64838aa44553417c6b9c7506567978d266",
  ],
]);
const JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";
const execFileAsync = promisify(execFile);

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const repositoryPath = (repositoryRoot, filePath) =>
  path.relative(repositoryRoot, filePath).split(path.sep).join("/");

const sha256 = (contents) =>
  createHash("sha256").update(contents).digest("hex");

const listUntrackedRepositoryPaths = async (repositoryRoot) => {
  try {
    const { stdout } = await execFileAsync(
      "git",
      [
        "-C",
        repositoryRoot,
        "ls-files",
        "--others",
        "--exclude-standard",
        "-z",
      ],
      {
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
      },
    );
    return new Set(
      stdout
        .split("\0")
        .filter(Boolean)
        .map((filePath) => filePath.replaceAll("\\", "/")),
    );
  } catch {
    // Without positive Git custody evidence no Markdown file is exempt.
    return new Set();
  }
};

const listTrackedRepositoryPaths = async (repositoryRoot) => {
  const { stdout } = await execFileAsync(
    "git",
    ["-C", repositoryRoot, "ls-files", "-z"],
    {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    },
  );
  return new Set(
    stdout
      .split("\0")
      .filter(Boolean)
      .map((filePath) => filePath.replaceAll("\\", "/")),
  );
};

const listHeadRepositoryPaths = async (repositoryRoot) => {
  const { stdout } = await execFileAsync(
    "git",
    ["-C", repositoryRoot, "ls-tree", "-r", "--name-only", "-z", "HEAD"],
    {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    },
  );
  return new Set(
    stdout
      .split("\0")
      .filter(Boolean)
      .map((filePath) => filePath.replaceAll("\\", "/")),
  );
};

export const matchesOwnerInputCustody = ({
  expectedSha256,
  fileContents,
  repositoryRelativePath,
  untrackedPaths,
}) =>
  typeof expectedSha256 === "string" &&
  expectedSha256.length === 64 &&
  untrackedPaths instanceof Set &&
  untrackedPaths.has(repositoryRelativePath) &&
  sha256(fileContents) === expectedSha256;

export const isExcludedOwnerInputDependency = ({
  excludedOwnerInputPaths,
  repositoryRelativeTarget,
}) =>
  excludedOwnerInputPaths instanceof Set &&
  [...excludedOwnerInputPaths].some(
    (ownerInputPath) =>
      ownerInputPath.toLowerCase() === repositoryRelativeTarget.toLowerCase(),
  );

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
  { rejectSymbolicLinks = false } = {},
) => {
  const files = [];
  const visit = async (current) => {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const entryPath = path.resolve(current, entry.name);
      if (entry.isSymbolicLink()) {
        if (rejectSymbolicLinks && !ignoredDirectoryNames.has(entry.name)) {
          throw new Error(
            `symbolic link is not allowed in the authored Markdown tree: ${entryPath}`,
          );
        }
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

const RAW_HTML_TAG_NAMES = new Set([
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "menu",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "script",
  "search",
  "section",
  "select",
  "slot",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
]);

export const extractRawHtmlTags = (markdown) => {
  const source = stripMarkdownCode(markdown).replace(/<!--[\s\S]*?-->/gu, "");
  return [...source.matchAll(/<([A-Za-z][A-Za-z0-9-]*)(?:\s[^<>]*)?\/?>/gu)]
    .filter(
      ([tag, tagName]) =>
        RAW_HTML_TAG_NAMES.has(tagName.toLowerCase()) ||
        tagName.includes("-") ||
        /\s[A-Za-z_:][A-Za-z0-9:._-]*\s*=/u.test(tag),
    )
    .map(([tag]) => tag);
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

const findSymbolicLinkSegment = async (root, target) => {
  let current = root;
  for (const segment of path.relative(root, target).split(path.sep)) {
    if (segment === "") {
      continue;
    }
    current = path.resolve(current, segment);
    try {
      if ((await lstat(current)).isSymbolicLink()) {
        return repositoryPath(root, current);
      }
    } catch {
      return null;
    }
  }
  return null;
};

export const validateMarkdownLinksWithOwnerManifest = async (
  repositoryRoot,
  ownerDirectionManifest,
) => {
  if (!(ownerDirectionManifest instanceof Map)) {
    throw new TypeError("owner direction manifest must be a Map");
  }
  const root = path.resolve(repositoryRoot);
  let markdownFiles;
  let canonicalMarkdownPathKeys;
  const excludedOwnerInputPaths = new Set();
  try {
    const discoveredMarkdownFiles = await walkFiles(
      root,
      (filePath) => filePath.toLowerCase().endsWith(".md"),
      IGNORED_DIRECTORY_NAMES,
      { rejectSymbolicLinks: true },
    );
    const discoveredMarkdownPathKeys = new Set(
      discoveredMarkdownFiles.map((filePath) =>
        repositoryPath(root, filePath).toLowerCase(),
      ),
    );
    const trackedPaths = await listTrackedRepositoryPaths(root);
    const headPaths = await listHeadRepositoryPaths(root);
    for (const trackedPath of trackedPaths) {
      if (
        trackedPath.toLowerCase().endsWith(".md") &&
        !discoveredMarkdownPathKeys.has(trackedPath.toLowerCase())
      ) {
        throw new Error(
          `tracked Markdown is outside the authored inventory: ${trackedPath}`,
        );
      }
    }
    for (const headPath of headPaths) {
      if (
        !headPath.toLowerCase().endsWith(".md") ||
        discoveredMarkdownPathKeys.has(headPath.toLowerCase())
      ) {
        continue;
      }
      try {
        await lstat(path.resolve(root, headPath));
      } catch {
        continue;
      }
      throw new Error(
        `HEAD-tracked Markdown present outside the authored inventory: ${headPath}`,
      );
    }
    const headPathKeys = new Set(
      [...headPaths].map((headPath) => headPath.toLowerCase()),
    );
    const untrackedPaths = new Set(
      [...(await listUntrackedRepositoryPaths(root))].filter(
        (untrackedPath) => !headPathKeys.has(untrackedPath.toLowerCase()),
      ),
    );
    const includedMarkdownFiles = [];
    for (const filePath of discoveredMarkdownFiles) {
      const repositoryRelativePath = repositoryPath(root, filePath);
      const expectedSha256 = ownerDirectionManifest.get(repositoryRelativePath);
      if (
        expectedSha256 &&
        matchesOwnerInputCustody({
          expectedSha256,
          fileContents: await readFile(filePath),
          repositoryRelativePath,
          untrackedPaths,
        })
      ) {
        excludedOwnerInputPaths.add(repositoryRelativePath);
        continue;
      }
      includedMarkdownFiles.push(filePath);
    }
    markdownFiles = includedMarkdownFiles;
    canonicalMarkdownPathKeys = new Set(
      markdownFiles.map((filePath) =>
        repositoryPath(root, filePath).toLowerCase(),
      ),
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
    const rawHtmlTagCount = extractRawHtmlTags(markdown).length;
    if (rawHtmlTagCount > 0) {
      issues.push(
        `${relativeFile} uses ${rawHtmlTagCount} raw HTML tag(s); use Markdown syntax`,
      );
    }
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
      const symbolicLinkSegment = await findSymbolicLinkSegment(root, target);
      if (symbolicLinkSegment !== null) {
        issues.push(
          `${relativeFile} link traverses a symbolic link: ${destination} (${symbolicLinkSegment})`,
        );
        continue;
      }
      try {
        await lstat(target);
      } catch {
        issues.push(`${relativeFile} has a missing local link: ${destination}`);
        continue;
      }
      if (
        isExcludedOwnerInputDependency({
          excludedOwnerInputPaths,
          repositoryRelativeTarget: repositoryPath(root, target),
        })
      ) {
        issues.push(
          `${relativeFile} links to a noncanonical preserved owner input: ${destination}`,
        );
        continue;
      }
      const repositoryRelativeTarget = repositoryPath(root, target);
      if (
        repositoryRelativeTarget.toLowerCase().endsWith(".md") &&
        !canonicalMarkdownPathKeys.has(repositoryRelativeTarget.toLowerCase())
      ) {
        issues.push(
          `${relativeFile} links to Markdown outside the canonical inventory: ${destination}`,
        );
      }
    }
  }

  if (issues.length > 0) {
    throw new BackboneValidationError("Markdown link", issues);
  }

  return Object.freeze({ markdownFiles: markdownFiles.length, localLinks });
};

export const validateMarkdownLinks = async (repositoryRoot) =>
  validateMarkdownLinksWithOwnerManifest(
    repositoryRoot,
    PRESERVED_OWNER_DIRECTION_MARKDOWN,
  );

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
