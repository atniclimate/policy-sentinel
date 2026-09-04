import { spawnSync } from "node:child_process";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  matchesOwnerInputCustody,
  PRESERVED_OWNER_DIRECTION_INPUT_SHA256,
} from "./owner-input-custody.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const fallbackPlanningDocuments = new Set([
  "AGENTS.md",
  "docs/architecture.md",
  "docs/continuation-prompt.md",
  "docs/data-contract.md",
  "docs/data-governance.md",
  "docs/decision-register.md",
  "docs/mvp-plan.md",
  "docs/project-brief.md",
  "docs/source-coverage.md",
  "docs/source-feasibility.md",
  "docs/ux-spec.md",
]);
const sensitivePatchRoots = [
  ".cache",
  ".git",
  "ai-summaries",
  "cached-responses",
  "generated-data",
  "private",
  "public-data",
  "raw-data",
  "secrets",
];
const observerAuthoringPolicy = Object.freeze({
  phase: "terminal_evidence_frozen",
  path: "generated-data/real-source-prerelease/observe-source-authority-portfolio.mjs",
  directory: "generated-data/real-source-prerelease",
  gateId: "G-PNW-05-REAL-SOURCE-PRERELEASE",
  workItemId: "PNW-05-SOURCE-AUTHORITY-PORTFOLIO-DISCOVERY",
  observerCustody: Object.freeze({
    bytes: 99_998,
    sha256: "2cab3b38b33413ce296656662ba94053cc3512b00d85f3c9c5fb48e65c1ec21d",
    planSha256:
      "b676acebcec53076742c5e4e831bd1729e8cbb970a1f276a099543358b274e33",
  }),
  trustPaths: Object.freeze([
    ".codex/hooks.json",
    ".gitignore",
    "ROADMAP.yaml",
    "docs/development/PNW-05-REAL-SOURCE-PRERELEASE-COORDINATION-2026-09-03.md",
    "docs/source-reviews/source-authority-portfolio-discovery-2026-09-03.md",
    "scripts/codex-hooks.mjs",
    "tests/hooks/codex-hooks.test.mjs",
  ]),
  reportCustody: Object.freeze({
    path: "docs/source-reviews/source-authority-portfolio-discovery-2026-09-03.md",
    bytes: 34_744,
    sha256: "5d496c6cbc5a49f4941f6167bed87fe3f931865c1e0e88150e95bfde563e7ab2",
  }),
  postRunCustody: Object.freeze({
    fileCount: 43,
    totalBytes: 49_730,
    manifestBytes: 5_357,
    manifestSha256:
      "73401fdc8c060d443cab0e521c0fc9ae9ec067bcf0f1e75131f0411d2e460546",
  }),
  historicalCustody: Object.freeze([
    Object.freeze({
      name: "authority-input-v2.json",
      bytes: 2_503,
      sha256:
        "f2ec15b838d9402478a64bd1d5b366001120af4b82f1b52aed463fbe717aa8a4",
    }),
    Object.freeze({
      name: "authority-graph-v2.json",
      bytes: 19_844,
      sha256:
        "15059000ff3817a6d5df5c8f8d5642aa1cd51042b15028aca26991cc3a6d6cad",
    }),
    Object.freeze({
      name: "FR-D3.attempt",
      bytes: 462,
      sha256:
        "5d75db276f07ce0811022778e3852a99512c2b8866bc93262c3519d730848068",
    }),
    Object.freeze({
      name: "FR-D3.receipt.json",
      bytes: 1_103,
      sha256:
        "f58ca7aa9d789c8d804e593e327ae1ca3ad1f44402ae127253ced01bc6e492f6",
    }),
    Object.freeze({
      name: "FR-R6.attempt",
      bytes: 462,
      sha256:
        "69b8db8228af680b43050ce1193f349eb70fc9d2a3454f46c0b4c997a57b400d",
    }),
    Object.freeze({
      name: "FR-R6.receipt.json",
      bytes: 1_093,
      sha256:
        "093ca14e300c59a1462ff0e71d65131463be15e4a57fadb672d56cdc3cbc770b",
    }),
    Object.freeze({
      name: "FR-R7.attempt",
      bytes: 462,
      sha256:
        "eac7bc42975de100326110fa2ae75317981e9fc687adec3bb480fba21931712e",
    }),
    Object.freeze({
      name: "FR-R7.receipt.json",
      bytes: 1_075,
      sha256:
        "e9db0fedaca0b558ca92797451c474dbe069c05b86359a7dfacffaac282435ad",
    }),
  ]),
  reservedCustodyPaths: Object.freeze([
    "generated-data/real-source-prerelease/PF-PORTFOLIO-RUN.attempt",
    ...Array.from({ length: 17 }, (_, index) =>
      String(index + 1).padStart(2, "0"),
    ).flatMap((suffix) => [
      `generated-data/real-source-prerelease/PF-${suffix}.attempt`,
      `generated-data/real-source-prerelease/PF-${suffix}.receipt.json`,
    ]),
    ...["FR-A1"].flatMap((requestId) => [
      `generated-data/real-source-prerelease/${requestId}.attempt`,
      `generated-data/real-source-prerelease/${requestId}.receipt.json`,
    ]),
  ]),
  neverIssuedCustodyPaths: Object.freeze([
    "generated-data/real-source-prerelease/FR-A1.attempt",
    "generated-data/real-source-prerelease/FR-A1.receipt.json",
  ]),
});
const maximumObserverTrustInputBytes = 1024 * 1024;
const staticFrozenPaths = [
  ["K0", "docs/vision/k0-lifecycle-contract.md"],
  ["K0", "docs/vision/reviews/k0-contract-review-2026-09-01.md"],
  ["K0", "docs/vision/reviews/k0-implementation-audit-2026-09-01.md"],
  ["K0", "docs/vision/reports/k0-implementation-2026-09-01.md"],
  ["O0", "docs/vision/o0-orchestration-contract.md"],
  ["O0", "docs/vision/reviews/o0-contract-repair-closure-2026-09-01.md"],
  ["O0", "docs/vision/reviews/o0-contract-review-2026-09-01.md"],
  ["S0", "docs/vision/reviews/s0-contract-review-2026-09-01.md"],
  ["S0", "docs/vision/reviews/s0-implementation-audit-2026-09-01.md"],
  ["S0", "docs/vision/reports/s0-implementation-2026-09-01.md"],
  ["S0", "docs/vision/s0-spatial-contract.md"],
];
const prettierExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

const trimOutput = (value, limit = 1_500) => {
  const normalized = String(value ?? "").trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, Math.floor(limit / 2))}\n…\n${normalized.slice(-Math.floor(limit / 2))}`;
};

const outputForResult = (result) =>
  trimOutput(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 4 * 1024 * 1024,
    shell: false,
    timeout: options.timeout ?? 30_000,
  });
  return {
    ok: result.status === 0 && result.error === undefined,
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
};

const runGit = (root, args, timeout = 10_000) =>
  run("git", args, { cwd: root, timeout });

const runGitBuffer = (root, args, maximumBytes, timeout = 10_000) => {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: null,
    env: process.env,
    maxBuffer: maximumBytes,
    shell: false,
    timeout,
    windowsHide: true,
  });
  return {
    ok: result.status === 0 && result.error === undefined,
    status: result.status,
    stdout: result.stdout ?? Buffer.alloc(0),
    stderr: result.stderr ?? Buffer.alloc(0),
    error: result.error,
  };
};

const runNodeScript = (root, relativePath, args = [], timeout = 30_000) =>
  run(process.execPath, [path.resolve(root, relativePath), ...args], {
    cwd: root,
    timeout,
  });

export const normalizeRepositoryPath = (value, root = "") => {
  let normalized = String(value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replaceAll("\\", "/");
  const normalizedRoot = String(root).replaceAll("\\", "/").replace(/\/$/, "");
  if (
    normalizedRoot &&
    normalized.toLowerCase().startsWith(`${normalizedRoot.toLowerCase()}/`)
  ) {
    normalized = normalized.slice(normalizedRoot.length + 1);
  }
  return normalized.replace(/^\.\//, "");
};

export const extractPatchOperations = (command, root = "") => {
  const operations = [];
  const pattern =
    /^\*\*\* (?:(Add|Delete|Update) File:(.*)|Move to(?: File)?:(.*))$/gmu;
  for (const match of String(command ?? "").matchAll(pattern)) {
    const action = match[1] ?? "Move";
    const headerPath = String(match[2] ?? match[3] ?? "").replace(/\r$/u, "");
    const rawPath = headerPath
      .trim()
      .replace(/^['"]|['"]$/g, "")
      .replaceAll("\\", "/");
    const repositoryPath = normalizeRepositoryPath(rawPath, root);
    if (
      repositoryPath &&
      repositoryPath !== "dev/null" &&
      repositoryPath !== "/dev/null"
    ) {
      operations.push(
        Object.freeze({ action, headerPath, rawPath, repositoryPath }),
      );
    }
  }
  return operations;
};

export const extractPatchPaths = (command, root = "") => [
  ...new Set(
    extractPatchOperations(command, root).map(
      (operation) => operation.repositoryPath,
    ),
  ),
];

const resolveRepositoryRoot = (cwd) => {
  const candidate = path.resolve(cwd || process.cwd());
  const result = runGit(candidate, ["rev-parse", "--show-toplevel"]);
  if (!result.ok) {
    throw new Error(`unable to resolve Git root: ${outputForResult(result)}`);
  }
  return path.resolve(result.stdout.trim());
};

const loadRoadmap = async (root) => {
  const { parse } = await import("yaml");
  return parse(readFileSync(path.resolve(root, "ROADMAP.yaml"), "utf8"));
};

const validateRoadmap = (root) =>
  runNodeScript(root, "scripts/validate-roadmap.mjs", [], 30_000);

const gitStatus = (root) =>
  runGit(root, ["status", "--short", "--untracked-files=all"]);

const terminalGitStatus = (root) =>
  runGit(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);

const repositoryPathIsWithin = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
};

const ownerInputPathIsVerified = (root, repositoryPath, expectedSha256) => {
  if (!expectedSha256) {
    return false;
  }
  const absolutePath = path.resolve(root, ...repositoryPath.split("/"));
  if (!repositoryPathIsWithin(root, absolutePath)) {
    return false;
  }
  try {
    const stat = lstatSync(absolutePath);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.nlink !== 1 ||
      patchPathHasAlias(root, repositoryPath) ||
      realpathSync.native(absolutePath).toLowerCase() !==
        path
          .resolve(realpathSync.native(root), ...repositoryPath.split("/"))
          .toLowerCase()
    ) {
      return false;
    }
    return matchesOwnerInputCustody({
      expectedSha256,
      fileContents: readFileSync(absolutePath),
      repositoryRelativePath: repositoryPath,
      untrackedPaths: new Set([repositoryPath]),
    });
  } catch {
    return false;
  }
};

export const repositoryStatusIsDirty = (
  root,
  status,
  ownerInputManifest = PRESERVED_OWNER_DIRECTION_INPUT_SHA256,
) => {
  const entries = String(status ?? "")
    .split("\0")
    .filter(Boolean);
  const verifiedOwnerPaths = new Set();
  for (const entry of entries) {
    if (!entry.startsWith("?? ")) {
      return true;
    }
    const repositoryPath = entry.slice(3);
    if (
      !ownerInputPathIsVerified(
        root,
        repositoryPath,
        ownerInputManifest[repositoryPath],
      )
    ) {
      return true;
    }
    verifiedOwnerPaths.add(repositoryPath);
  }

  for (const repositoryPath of Object.keys(ownerInputManifest)) {
    const absolutePath = path.resolve(root, ...repositoryPath.split("/"));
    if (existsSync(absolutePath) && !verifiedOwnerPaths.has(repositoryPath)) {
      return true;
    }
  }
  return false;
};

const roadmapIsDirty = (root) => {
  const result = runGit(root, [
    "status",
    "--short",
    "--untracked-files=all",
    "--",
    "ROADMAP.yaml",
  ]);
  return !result.ok || result.stdout.trim().length > 0;
};

const isClosedBoundary = (roadmap, boundaryId) => {
  const boundaries = roadmap?.authority?.external_boundaries;
  if (!Array.isArray(boundaries)) {
    return true;
  }
  const boundary = boundaries.find((candidate) => candidate.id === boundaryId);
  return boundary?.state !== "approved";
};

export const collectFrozenPaths = (roadmap) => {
  const activeMilestones = new Set(
    (roadmap?.work_items ?? [])
      .filter((item) => item.status === "in_progress")
      .map((item) => item.milestone),
  );
  const frozenPaths = new Set(
    staticFrozenPaths
      .filter(([milestone]) => !activeMilestones.has(milestone))
      .map(([, repositoryPath]) => repositoryPath),
  );
  const visit = (value, key = "") => {
    if (typeof value === "string") {
      if (
        /(?:path|artifact)$/u.test(key) &&
        value.replaceAll("\\", "/").startsWith("docs/vision/")
      ) {
        frozenPaths.add(normalizeRepositoryPath(value));
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const child of value) {
        visit(child, key);
      }
      return;
    }
    if (value && typeof value === "object") {
      for (const [childKey, childValue] of Object.entries(value)) {
        visit(childValue, childKey);
      }
    }
  };

  for (const item of roadmap?.work_items ?? []) {
    if (item.status === "in_progress" || activeMilestones.has(item.milestone)) {
      continue;
    }
    if (["K0", "S0", "O0"].includes(item.milestone)) {
      visit(item.durable_lineage);
      visit(item.contract_candidate);
      visit(item.contract_review);
    }
  }
  return frozenPaths;
};

const hasWriteIntent = (command) =>
  /\b(?:add-content|appendfile(?:sync)?|clear-content|copyfile(?:sync)?|copy-item|mkdir(?:sync)?|move-item|new-item|new-object|out-file|remove-item|rename-item|rename(?:sync)?|robocopy|rm(?:sync)?|set-content|set-item|truncate(?:sync)?|unlink(?:sync)?|writefile(?:sync)?|xcopy)\b|(?:^|[\s;|&])(?:ac|clc|copy|cp|cpi|del|erase|install|ln|mi|move|mv|ni|rd|ren|rename|ri|rm|rmdir|rni|sc|si|tee|touch|truncate|unlink)\b|\[(?:system\.)?io\.(?:directory|file)\]::(?:append|copy|create|delete|move|open|replace|set|write)\w*|\b(?:directory|file)\.(?:append|copy|create|delete|move|open|replace|set|write)\w*|\bfind\b[^\r\n]*(?:-delete|-exec|-ok)\b|\bsed\b[^\r\n]*\s-i(?:\s|$)|\bdd\b|>>?/iu.test(
    command,
  );

const sensitiveShellPathPattern = new RegExp(
  String.raw`(?:^|[\/\s"'` +
    String.raw`=,:;(])(?:\.\/)?(?:\.env(?:\.[^\/\s"'` +
    String.raw`=,:;)]*)?|${sensitivePatchRoots
      .map((root) => root.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
      .join("|")}|generat[^\/\s"'` +
    String.raw`=,:;()]*)(?:\/|(?=[\s"'` +
    String.raw`=,:;)]|$))`,
  "iu",
);

const commandMentionsSensitivePath = (command) =>
  sensitiveShellPathPattern.test(String(command ?? "").replaceAll("\\", "/"));

const splitShellInvocations = (command) => {
  const invocations = [];
  let current = "";
  let quote = null;
  let escaped = false;

  const flush = () => {
    const invocation = current.trim();
    if (invocation) {
      invocations.push(invocation);
    }
    current = "";
  };

  for (const character of String(command ?? "")) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      current += character;
      escaped = true;
      continue;
    }
    if (quote) {
      current += character;
      if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      current += character;
      continue;
    }
    if (
      character === ";" ||
      character === "|" ||
      character === "&" ||
      character === "\n" ||
      character === "\r"
    ) {
      flush();
      continue;
    }
    current += character;
  }
  flush();
  return invocations;
};

const matchesShellInvocation = (command, pattern) =>
  splitShellInvocations(command).some((invocation) => pattern.test(invocation));

const stripMatchingShellQuotes = (value) => {
  const text = String(value ?? "").trim();
  if (
    text.length >= 2 &&
    ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'")))
  ) {
    return text.slice(1, -1).trim();
  }
  return text;
};

const expandWrappedShellInvocation = (invocation) => {
  const expanded = [];
  let current = String(invocation ?? "").trim();
  for (let depth = 0; current && depth < 6; depth += 1) {
    expanded.push(current);
    const wrapperPatterns = [
      /^(?:(?:[^\s"']+[\\/])?cmd(?:\.exe)?)\b[^\r\n]*?\s+\/(?:c|k)\s+([\s\S]+)$/iu,
      /^(?:(?:[^\s"']+[\\/])?(?:pwsh|powershell)(?:\.exe)?)\b[^\r\n]*?\s+-(?:c|command)\s+([\s\S]+)$/iu,
      /^(?:(?:[^\s"']+[\\/])?wsl(?:\.exe)?)\b(?:\s+(?:(?:-d|--cd|--distribution|--shell-type|-u|--user)(?:=|\s+)\S+|--exec|-e|--))*\s+([\s\S]+)$/iu,
      /^(?:(?:[^\s"']+[\\/])?(?:bash|sh)(?:\.exe)?)\b[^\r\n]*?\s+-(?:c|lc)\s+([\s\S]+)$/iu,
      /^npm(?:\.cmd|\.exe)?\s+(?:exec|x)\b(?:\s+--)?\s+([\s\S]+)$/iu,
      /^npx(?:\.cmd|\.exe)?\b(?:\s+--no-install)?(?:\s+--)?\s+([\s\S]+)$/iu,
      /^command\s+([\s\S]+)$/iu,
      /^env(?:\s+[a-z_][a-z0-9_]*=\S+)*\s+([\s\S]+)$/iu,
    ];
    const match = wrapperPatterns
      .map((pattern) => current.match(pattern))
      .find(Boolean);
    if (!match) {
      break;
    }
    const inner = stripMatchingShellQuotes(match[1]);
    if (!inner || inner === current) {
      break;
    }
    current = inner;
  }
  return expanded;
};

const expandShellInvocations = (command) =>
  splitShellInvocations(command).flatMap(expandWrappedShellInvocation);

const ghPrefix = String.raw`(?:(?:"(?:[^"\r\n]*[\\/])?gh(?:\.exe)?"|'(?:[^'\r\n]*[\\/])?gh(?:\.exe)?')|(?:[^\s;&|<>"']+[\\/])*gh(?:\.exe)?)(?:\s+(?:-R|--repo)\s+\S+)*\s+`;
const npmPrefix = String.raw`(?:(?:"(?:[^"\r\n]*[\\/])?npm(?:\.cmd|\.exe)?"|'(?:[^'\r\n]*[\\/])?npm(?:\.cmd|\.exe)?')|(?:[^\s;&|<>"']+[\\/])*npm(?:\.cmd|\.exe)?)\s+`;
const invocationPattern = (prefix, operation) =>
  new RegExp(`^${prefix}${operation}`, "iu");

const gitExecutableAtInvocationStart = new RegExp(
  String.raw`^(?:[a-z_][a-z0-9_]*=(?:"[^"\r\n]*"|'[^'\r\n]*'|\S*)\s+)*(?:"(?:[^"\r\n]*[\\/])?git(?:\.exe)?"|'(?:[^'\r\n]*[\\/])?git(?:\.exe)?'|(?:[^\s;&|<>"']+[\\/])*git(?:\.exe)?)(?=\s)`,
  "iu",
);
const gitInvocationOperation = (invocation) => {
  const normalized = String(invocation ?? "").trim();
  const executable = normalized.match(gitExecutableAtInvocationStart);
  if (!executable) {
    return null;
  }
  let remainder = normalized.slice(executable[0].length).trim();
  for (let optionCount = 0; optionCount < 16; optionCount += 1) {
    const valuedOption = remainder.match(
      /^(?:-[cC]|--(?:config-env|git-dir|namespace|work-tree))(?:=|\s+)(?:"[^"\r\n]*"|'[^'\r\n]*'|\S+)\s*/iu,
    );
    if (valuedOption) {
      remainder = remainder.slice(valuedOption[0].length);
      continue;
    }
    const flagOption = remainder.match(
      /^--(?:bare|literal-pathspecs|no-optional-locks|no-pager|no-replace-objects)\s*/iu,
    );
    if (flagOption) {
      remainder = remainder.slice(flagOption[0].length);
      continue;
    }
    break;
  }
  const operation = remainder.match(/^([a-z][a-z0-9-]*)\b([\s\S]*)$/iu);
  if (!operation) {
    return null;
  }
  return {
    args: operation[2].trim(),
    command: operation[1].toLowerCase(),
    remainder,
  };
};

const approvedEvidenceDirectory =
  observerAuthoringPolicy.directory.toLowerCase();
const forbiddenSensitiveShellPathPattern = new RegExp(
  String.raw`(?:^|[\/\s"'` +
    String.raw`=,:;(])(?:\.\/?env(?:\.[^\/\s"'` +
    String.raw`=,:;)]*)?|\.git|${sensitivePatchRoots
      .filter((root) => root !== "generated-data")
      .map((root) => root.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
      .join("|")})(?:\/|(?=[\s"'` +
    String.raw`=,:;)]|$))`,
  "iu",
);

const commandHasUnsafePathSyntax = (command) =>
  /[*?[\]{}]|(?:^|[\\/])\.\.(?:[\\/]|$)|~\d|(?:^|[\\/])[^\s"']*[. ](?:[\\/]|$)/u.test(
    String(command ?? ""),
  );

const commandReferencesForbiddenSensitivePath = (command) =>
  forbiddenSensitiveShellPathPattern.test(
    String(command ?? "").replaceAll("\\", "/"),
  );

const credentialLabelPattern =
  /(?:api[_-]?key|auth(?:entication)?|credential|password|private[_-]?key|secret|token)/iu;
const credentialNamespacePattern =
  /^(?:anthropic|aws|azure|docker|gcp|gh|github|google|kube|npm|openai)(?:$|[_-])/iu;

const credentialDirectoryNames = new Set([
  ".aws",
  ".azure",
  ".claude",
  ".codex",
  ".docker",
  ".gnupg",
  ".kube",
  ".ssh",
  "private",
  "secrets",
]);
const credentialFileNames = new Set([
  ".git-credentials",
  ".netrc",
  ".npmrc",
  "hosts.yml",
]);

const filesystemPathHasCredentialComponent = (value) => {
  const segments = String(value ?? "")
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.toLowerCase());
  return (
    segments.some((segment) => credentialDirectoryNames.has(segment)) ||
    segments.some((segment) => credentialFileNames.has(segment))
  );
};

const commandReferencesExternalCredentialPath = (command, root) => {
  const normalized = String(command ?? "").replaceAll("\\", "/");
  const activeRoot = String(root ?? "")
    .replaceAll("\\", "/")
    .replace(/\/$/u, "")
    .toLowerCase();
  const absolutePathTokens = normalized.matchAll(
    /(?:^|[\s"'`=(:,])((?:[a-z]:\/|\/\/|\/|~\/|\$home\/|\$env:userprofile\/|%userprofile%\/)[^\s"'`;|&<>)]*)/giu,
  );
  for (const match of absolutePathTokens) {
    const candidate = match[1].replace(/[,.:]+$/u, "");
    if (!filesystemPathHasCredentialComponent(candidate)) {
      continue;
    }
    const normalizedCandidate = candidate.toLowerCase();
    if (
      activeRoot &&
      (normalizedCandidate === activeRoot ||
        normalizedCandidate.startsWith(`${activeRoot}/`))
    ) {
      continue;
    }
    return true;
  }
  return false;
};

const commandReferencesCredentialProvider = (command) => {
  const text = String(command ?? "").trim();
  const invocations = splitShellInvocations(text);
  if (
    invocations.some((invocation) => {
      if (/^(?:env|printenv)(?:\.exe)?\s*$/iu.test(invocation)) {
        return true;
      }
      const setQuery = invocation.match(
        /^set(?:\.exe)?(?:\s+([^\s=]+))?\s*$/iu,
      );
      return Boolean(
        setQuery &&
        (!setQuery[1] ||
          /[*?]/u.test(setQuery[1]) ||
          credentialLabelPattern.test(setQuery[1]) ||
          credentialNamespacePattern.test(setQuery[1])),
      );
    }) ||
    /\[(?:system\.)?environment\]::getenvironmentvariables\b/iu.test(text) ||
    /(?:^|[;|&\r\n])\s*(?:get-childitem|gci|dir|ls)\s+(?:-path\s+|-literalpath\s+)?env:(?:\s|$)/iu.test(
      text,
    )
  ) {
    return true;
  }
  const providerNames = [
    ...text.matchAll(/(?:\$?env:)([^\s"'`;|&<>)]*)/giu),
    ...text.matchAll(
      /\[(?:system\.)?environment\]::getenvironmentvariable\(\s*["']([^"']+)["']/giu,
    ),
    ...text.matchAll(/\$(?!env:)([a-z_][a-z0-9_-]*)/giu),
    ...text.matchAll(/%([a-z_][a-z0-9_-]*)%/giu),
  ].map((match) => match[1]);
  return providerNames.some(
    (name) =>
      /[*?]/u.test(name) ||
      credentialLabelPattern.test(name) ||
      credentialNamespacePattern.test(name),
  );
};

const extractStrictInspectionTarget = (command) => {
  const normalized = String(command ?? "").trim();
  const pathToken = String.raw`("[^"\r\n]+"|'[^'\r\n]+'|[^\s;&|<>]+)`;
  const patterns = [
    new RegExp(
      String.raw`^(?:get-childitem|get-content|get-item|resolve-path|test-path)\s+-literalpath\s+${pathToken}$`,
      "iu",
    ),
    new RegExp(
      String.raw`^get-filehash\s+-literalpath\s+${pathToken}(?:\s+-algorithm\s+sha256)?$`,
      "iu",
    ),
    new RegExp(
      String.raw`^get-filehash\s+-algorithm\s+sha256\s+-literalpath\s+${pathToken}$`,
      "iu",
    ),
    new RegExp(
      String.raw`^(?:cat|gc|head|ls|more|sha256sum|shasum|stat|tail|type|wc)(?:\s+--)?\s+${pathToken}$`,
      "iu",
    ),
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      return match[1].replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/u, "$1$2");
    }
  }
  return null;
};

const inspectionTargetContext = (root, workdirContext, target) => {
  if (
    !root ||
    !workdirContext.trusted ||
    !workdirContext.absolutePath ||
    !target ||
    target.includes("\0") ||
    commandHasUnsafePathSyntax(target) ||
    /^(?:alias|cert|env|function|hklm|hkcu|registry|variable|wsman):/iu.test(
      target,
    )
  ) {
    return null;
  }
  const absoluteTarget = path.isAbsolute(target)
    ? path.resolve(target)
    : path.resolve(workdirContext.absolutePath, target);
  if (!repositoryPathIsWithin(root, absoluteTarget)) {
    return null;
  }
  try {
    const rootRealPath = realpathSync.native(root);
    const stat = lstatSync(absoluteTarget);
    const targetRealPath = realpathSync.native(absoluteTarget);
    if (
      stat.isSymbolicLink() ||
      (!stat.isDirectory() && (!stat.isFile() || stat.nlink !== 1)) ||
      !repositoryPathIsWithin(rootRealPath, targetRealPath) ||
      !canonicalPathEquals(
        targetRealPath,
        path.resolve(rootRealPath, path.relative(root, absoluteTarget)),
      )
    ) {
      return null;
    }
    const repositoryPath = path
      .relative(rootRealPath, targetRealPath)
      .split(path.sep)
      .join("/");
    const normalizedRepositoryPath = repositoryPath.toLowerCase();
    return {
      approvedEvidence:
        normalizedRepositoryPath === approvedEvidenceDirectory ||
        normalizedRepositoryPath.startsWith(`${approvedEvidenceDirectory}/`),
      repositoryPath,
      sensitive: isSensitivePatchPath(repositoryPath),
    };
  } catch {
    return null;
  }
};

const sensitiveGitInspectionIsAllowed = (command) =>
  [
    /^git(?:\.exe)?\s+status\s+--short\s+--\s+generated-data[\\/]real-source-prerelease$/iu,
    /^git(?:\.exe)?\s+ls-files\s+--others\s+--ignored\s+--exclude-standard\s+--\s+generated-data[\\/]real-source-prerelease$/iu,
    /^git(?:\.exe)?\s+check-ignore(?:\s+-v)?\s+--\s+generated-data[\\/]real-source-prerelease(?:[\\/][a-z0-9._-]+)?$/iu,
  ].some((pattern) => pattern.test(String(command ?? "").trim()));

const sensitivePathInspectionIsAllowed = (command, workdirContext, root) => {
  const normalized = String(command ?? "").trim();
  if (
    !workdirContext.trusted ||
    /[\r\n`()]/u.test(normalized) ||
    normalized.includes("$(") ||
    commandHasUnsafePathSyntax(normalized) ||
    commandReferencesForbiddenSensitivePath(normalized)
  ) {
    return false;
  }
  if (sensitiveGitInspectionIsAllowed(normalized)) {
    return true;
  }
  const target = extractStrictInspectionTarget(normalized);
  return Boolean(
    inspectionTargetContext(root, workdirContext, target)?.approvedEvidence,
  );
};

const ownerInputPaths = new Set(
  Object.keys(PRESERVED_OWNER_DIRECTION_INPUT_SHA256).map((repositoryPath) =>
    repositoryPath.toLowerCase(),
  ),
);

const commandMentionsRepositoryPath = (command, repositoryPath) => {
  const normalizedCommand = String(command ?? "")
    .replaceAll("\\", "/")
    .toLowerCase();
  const normalizedPath = String(repositoryPath ?? "")
    .replaceAll("\\", "/")
    .toLowerCase();
  return normalizedPath !== "" && normalizedCommand.includes(normalizedPath);
};

const pathMutationArguments = (invocation) => {
  const gitOperation = gitInvocationOperation(invocation);
  if (gitOperation && ["mv", "rm"].includes(gitOperation.command)) {
    return gitOperation.args;
  }
  const mutation = String(invocation ?? "").match(
    /^(?:(?:[^\s"']+[\\/])?(?:clear-content|clc|copy-item|copy|cpi|cp|del|erase|mi|move-item|move|mv|rd|remove-item|rename-item|rename|ren|ri|rm|rmdir|rni|robocopy|xcopy)(?:\.exe)?)\b([\s\S]*)$/iu,
  );
  return mutation?.[1]?.trim() ?? null;
};

const normalizeMutationCandidate = (
  candidate,
  root,
  workdirRepositoryPath,
  workdirTrusted,
) => {
  let normalized = String(candidate ?? "")
    .replaceAll("\\", "/")
    .replace(/^[,:(]+|[,.:)]+$/gu, "")
    .trim();
  if (!normalized || normalized === "--") {
    return null;
  }
  if (normalized.startsWith("-") && normalized.includes("=")) {
    normalized = normalized.slice(normalized.indexOf("=") + 1);
  } else if (normalized.startsWith("-")) {
    return null;
  }
  const normalizedRoot = String(root ?? "")
    .replaceAll("\\", "/")
    .replace(/\/$/u, "");
  if (/^(?:[a-z]:\/|\/\/|\/)/iu.test(normalized)) {
    if (
      !normalizedRoot ||
      (normalized.toLowerCase() !== normalizedRoot.toLowerCase() &&
        !normalized
          .toLowerCase()
          .startsWith(`${normalizedRoot.toLowerCase()}/`))
    ) {
      return null;
    }
    normalized = normalized.slice(normalizedRoot.length).replace(/^\/+/, "");
  } else {
    if (!workdirTrusted) {
      return null;
    }
    const base = String(workdirRepositoryPath ?? "").replaceAll("\\", "/");
    normalized = path.posix.normalize(
      base ? `${base}/${normalized}` : normalized,
    );
  }
  return normalized.replace(/^\.\//u, "").replace(/\/+$/u, "").toLowerCase();
};

const mutationCandidateAffectsPath = (candidate, protectedPath) => {
  if (!candidate) {
    return false;
  }
  if (candidate === ".") {
    return true;
  }
  const wildcardIndex = candidate.search(/[*?[\]]/u);
  if (wildcardIndex >= 0) {
    if (candidate.includes("[") || candidate.includes("]")) {
      const literalPrefix = candidate.slice(0, wildcardIndex);
      return literalPrefix === "" || protectedPath.startsWith(literalPrefix);
    }
    let source = "^";
    for (let index = 0; index < candidate.length; index += 1) {
      const character = candidate[index];
      if (character === "*") {
        if (candidate[index + 1] === "*") {
          source += ".*";
          index += 1;
        } else {
          source += "[^/]*";
        }
      } else if (character === "?") {
        source += "[^/]";
      } else {
        source += character.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
      }
    }
    source += "$";
    const matcher = new RegExp(source, "iu");
    const segments = protectedPath.split("/");
    return segments.some((_, index) =>
      matcher.test(segments.slice(0, index + 1).join("/")),
    );
  }
  return (
    protectedPath === candidate || protectedPath.startsWith(`${candidate}/`)
  );
};

const protectedShellMutationPath = (command, roadmap, root, workdirContext) => {
  if (!hasWriteIntent(command)) {
    return null;
  }
  const protectedPaths = [
    ...ownerInputPaths,
    ...[...collectFrozenPaths(roadmap)].map((repositoryPath) =>
      repositoryPath.toLowerCase(),
    ),
  ];
  const directlyMentioned = protectedPaths.find((repositoryPath) =>
    commandMentionsRepositoryPath(command, repositoryPath),
  );
  if (directlyMentioned) {
    return directlyMentioned;
  }
  for (const invocation of expandShellInvocations(command)) {
    const argumentsText = pathMutationArguments(invocation);
    if (argumentsText === null) {
      continue;
    }
    const candidates = [
      ...argumentsText.matchAll(/"([^"\r\n]*)"|'([^'\r\n]*)'|([^\s]+)/gu),
    ].map((match) => match[1] ?? match[2] ?? match[3]);
    for (const candidate of candidates) {
      const normalizedCandidate = normalizeMutationCandidate(
        candidate,
        root,
        workdirContext.repositoryPath,
        workdirContext.trusted,
      );
      const affectedPath = protectedPaths.find((repositoryPath) =>
        mutationCandidateAffectsPath(normalizedCandidate, repositoryPath),
      );
      if (affectedPath) {
        return affectedPath;
      }
    }
  }
  return null;
};

const shellWorkdirContext = (root, workdir) => {
  if (!root) {
    return {
      absolutePath: "",
      approvedEvidence: false,
      repositoryPath: "",
      restricted: false,
      sensitive: false,
      trusted: true,
    };
  }
  const rawWorkdir = String(workdir ?? root).trim();
  if (!rawWorkdir || rawWorkdir.includes("\0")) {
    return { restricted: true, sensitive: false, trusted: false };
  }
  const normalizedRaw = rawWorkdir.replaceAll("\\", "/").replace(/\/$/u, "");
  const unrooted = normalizedRaw.replace(/^[a-z]:\//iu, "").replace(/^\/+/, "");
  const rawSegments = unrooted.split("/");
  if (
    rawSegments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        /[*?[\]]/u.test(segment) ||
        /~\d/u.test(segment) ||
        /[. ]$/u.test(segment),
    )
  ) {
    return { restricted: true, sensitive: false, trusted: false };
  }

  const absoluteWorkdir = path.isAbsolute(rawWorkdir)
    ? path.resolve(rawWorkdir)
    : path.resolve(root, rawWorkdir);
  if (!repositoryPathIsWithin(root, absoluteWorkdir)) {
    const credentialSensitive =
      filesystemPathHasCredentialComponent(absoluteWorkdir);
    return {
      absolutePath: absoluteWorkdir,
      external: true,
      repositoryPath: "",
      restricted: credentialSensitive,
      sensitive: credentialSensitive,
      trusted: false,
    };
  }
  let rootRealPath;
  let workdirRealPath;
  try {
    rootRealPath = realpathSync.native(root);
    const stat = lstatSync(absoluteWorkdir);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      return { restricted: true, sensitive: false, trusted: false };
    }
    workdirRealPath = realpathSync.native(absoluteWorkdir);
  } catch {
    return { restricted: true, sensitive: false, trusted: false };
  }
  if (
    !repositoryPathIsWithin(rootRealPath, workdirRealPath) ||
    !canonicalPathEquals(
      workdirRealPath,
      path.resolve(rootRealPath, path.relative(root, absoluteWorkdir)),
    )
  ) {
    return { restricted: true, sensitive: false, trusted: false };
  }
  const repositoryPath = path
    .relative(rootRealPath, workdirRealPath)
    .split(path.sep)
    .join("/");
  const normalizedRepositoryPath = repositoryPath.toLowerCase();
  return {
    absolutePath: workdirRealPath,
    approvedEvidence:
      normalizedRepositoryPath === approvedEvidenceDirectory ||
      normalizedRepositoryPath.startsWith(`${approvedEvidenceDirectory}/`),
    repositoryPath,
    restricted: isSensitivePatchPath(repositoryPath),
    sensitive: isSensitivePatchPath(repositoryPath),
    trusted: true,
  };
};

const explicitGitAddIsAllowed = (command, root) => {
  if (!root || /[\r\n;&|<>`"'()]/u.test(String(command ?? ""))) {
    return false;
  }
  const match = String(command ?? "")
    .trim()
    .match(
      /^git(?:\.exe)?\s+add\s+--\s+([a-z0-9._/-]+(?:\s+[a-z0-9._/-]+)*)$/iu,
    );
  if (!match) {
    return false;
  }
  const repositoryPaths = match[1].split(/\s+/u);
  const normalizedRepositoryPaths = repositoryPaths.map((repositoryPath) =>
    repositoryPath.toLowerCase(),
  );
  if (
    repositoryPaths.length === 0 ||
    new Set(normalizedRepositoryPaths).size !== repositoryPaths.length
  ) {
    return false;
  }
  return repositoryPaths.every((repositoryPath) => {
    if (
      patchPathIssue(repositoryPath) ||
      isSensitivePatchPath(repositoryPath) ||
      ownerInputPaths.has(repositoryPath.toLowerCase())
    ) {
      return false;
    }
    return canonicalSingleLinkFile(root, repositoryPath);
  });
};

export const evaluateShellCommand = (
  command,
  roadmap,
  { root = "", workdir = root } = {},
) => {
  const text = String(command ?? "");
  const policyText = text.replace(/([a-z])(?:`|\^)(?=[a-z])/giu, "$1");
  const workdirContext = shellWorkdirContext(root, workdir);
  const githubClosed = isClosedBoundary(roadmap, "EXT-GITHUB");
  const credentialsClosed = isClosedBoundary(roadmap, "EXT-CREDENTIALS");
  const notificationClosed = isClosedBoundary(roadmap, "EXT-NOTIFY");

  const invocations = splitShellInvocations(policyText);
  const expandedInvocations = expandShellInvocations(policyText);
  const expandedCommand = expandedInvocations.join("\n");
  const gitOperations = expandedInvocations
    .map((invocation) => ({
      invocation,
      operation: gitInvocationOperation(invocation),
    }))
    .filter(({ operation }) => operation);
  const gitAddInvocations = gitOperations.filter(({ operation }) =>
    ["add", "stage"].includes(operation.command),
  );
  if (
    gitAddInvocations.length > 0 &&
    (invocations.length !== 1 ||
      gitAddInvocations.length !== 1 ||
      gitAddInvocations[0].invocation !== invocations[0] ||
      workdirContext.repositoryPath !== "" ||
      !explicitGitAddIsAllowed(gitAddInvocations[0].invocation, root))
  ) {
    return {
      blocked: true,
      reason:
        "Git add is limited to explicit canonical non-owner, non-sensitive regular files; broad, forced, magic, directory, indirect, or update staging is forbidden.",
    };
  }

  if (
    gitOperations.some(({ operation }) =>
      ["push", "send-pack"].includes(operation.command),
    )
  ) {
    return {
      blocked: true,
      reason:
        "Direct Git push or send-pack is forbidden; Policy Sentinel requires an exact owner-approved remote operation.",
    };
  }
  if (
    gitOperations.some(({ operation }) => {
      const { args, command: gitCommand } = operation;
      return (
        (gitCommand === "reset" && /(?:^|\s)--hard(?:\s|$)/iu.test(args)) ||
        gitCommand === "rebase" ||
        (gitCommand === "commit" && /(?:^|\s)--amend(?:\s|$)/iu.test(args)) ||
        ["filter-branch", "filter-repo"].includes(gitCommand) ||
        (gitCommand === "clean" &&
          /(?:^|\s)(?:-[a-z]*f[a-z]*|--force)(?:\s|$)/iu.test(args)) ||
        gitCommand === "apply"
      );
    })
  ) {
    return {
      blocked: true,
      reason:
        "High-risk destructive or history-rewriting Git operation blocked by repository policy.",
    };
  }
  if (
    gitOperations.some(({ operation }) => operation.command === "update-index")
  ) {
    return {
      blocked: true,
      reason:
        "Direct index mutation is forbidden; stage only explicit reviewed paths.",
    };
  }

  if (
    credentialsClosed &&
    commandReferencesCredentialProvider(expandedCommand)
  ) {
    return {
      blocked: true,
      reason:
        "Broad environment enumeration or direct credential-variable access is blocked while EXT-CREDENTIALS is closed.",
    };
  }

  if (
    credentialsClosed &&
    gitOperations.some(({ operation }) =>
      operation.command.startsWith("credential"),
    )
  ) {
    return {
      blocked: true,
      reason:
        "Git credential-helper access or mutation is blocked while EXT-CREDENTIALS is closed.",
    };
  }

  if (
    credentialsClosed &&
    commandReferencesExternalCredentialPath(policyText, root)
  ) {
    return {
      blocked: true,
      reason:
        "Direct access to an external credential or private-data path is blocked while EXT-CREDENTIALS is closed.",
    };
  }

  if (
    (githubClosed || credentialsClosed) &&
    gitOperations.some(
      ({ operation }) =>
        operation.command === "config" &&
        /(?:^|\s)(?:core\.sshcommand|credential(?:\.[^\s=]+)?|http\.[^\s=]+\.extraheader|url\.[^\s=]+\.insteadof)(?:\s|=|$)/iu.test(
          operation.args,
        ),
    )
  ) {
    return {
      blocked: true,
      reason:
        "Git credential, authentication-header, SSH-command, or URL-rewrite configuration is blocked while external credential and GitHub gates are closed.",
    };
  }

  if (
    gitOperations.some(({ operation }) => {
      const { args, command: gitCommand } = operation;
      return (
        (gitCommand === "remote" &&
          /^(?:add|remove|rename|set-url|update)\b/iu.test(args)) ||
        (gitCommand === "config" &&
          !/(?:^|\s)--get(?:-all|-regexp)?\b/iu.test(args) &&
          /\b(?:branch\.[^\s=]+\.remote|remote\.[^\s=]+)\b/iu.test(args))
      );
    })
  ) {
    return {
      blocked: true,
      reason:
        "Remote configuration mutation is forbidden while the GitHub boundary is closed.",
    };
  }

  if (githubClosed) {
    const githubMutationPatterns = [
      invocationPattern(
        ghPrefix,
        String.raw`auth\s+(?:login|logout|refresh|setup-git)\b`,
      ),
      invocationPattern(
        ghPrefix,
        String.raw`repo\s+(?:archive|create|delete|edit|fork|rename|set-default|sync)\b`,
      ),
      invocationPattern(
        ghPrefix,
        String.raw`repo\s+(?:autolink|deploy-key)\s+(?:add|create|delete|remove|set)\b`,
      ),
      invocationPattern(
        ghPrefix,
        String.raw`pr\s+(?:close|comment|create|edit|lock|merge|ready|reopen|review|unlock)\b`,
      ),
      invocationPattern(
        ghPrefix,
        String.raw`issue\s+(?:close|comment|create|delete|develop|edit|lock|pin|reopen|transfer|unlock|unpin)\b`,
      ),
      invocationPattern(
        ghPrefix,
        String.raw`release\s+(?:create|delete|edit|upload)\b`,
      ),
      invocationPattern(ghPrefix, String.raw`gist\s+(?:create|delete|edit)\b`),
      invocationPattern(
        ghPrefix,
        String.raw`(?:gpg-key|ssh-key)\s+(?:add|delete)\b`,
      ),
      invocationPattern(ghPrefix, String.raw`alias\s+(?:delete|import|set)\b`),
      invocationPattern(
        ghPrefix,
        String.raw`extension\s+(?:install|remove|upgrade)\b`,
      ),
      invocationPattern(
        ghPrefix,
        String.raw`workflow\s+(?:disable|enable|run)\b`,
      ),
      invocationPattern(ghPrefix, String.raw`run\s+(?:cancel|delete|rerun)\b`),
      invocationPattern(
        ghPrefix,
        String.raw`(?:secret|variable)\s+(?:delete|remove|set)\b`,
      ),
      invocationPattern(
        ghPrefix,
        String.raw`api\b[^\r\n]*(?:(?:-X(?:=|\s*)|--method(?:=|\s+))(?:POST|PUT|PATCH|DELETE)|(?:^|\s)(?:-f|-F|--field|--raw-field|--input)(?:\s|=))`,
      ),
      invocationPattern(
        npmPrefix,
        String.raw`(?:publish|deprecate|unpublish)\b`,
      ),
      invocationPattern(
        npmPrefix,
        String.raw`(?:access\s+(?:grant|revoke|set)|dist-tag\s+(?:add|rm)|owner\s+(?:add|rm)|profile\s+set)\b`,
      ),
    ];
    if (
      githubMutationPatterns.some((pattern) =>
        matchesShellInvocation(expandedCommand, pattern),
      ) ||
      gitOperations.some(({ operation }) =>
        [
          "clone",
          "fetch",
          "ls-remote",
          "pull",
          "send-email",
          "submodule",
        ].includes(operation.command),
      )
    ) {
      return {
        blocked: true,
        reason:
          "Remote, publication, release, workflow, or GitHub mutation blocked while EXT-GITHUB is closed.",
      };
    }
  }

  if (
    credentialsClosed &&
    [
      invocationPattern(
        ghPrefix,
        String.raw`(?:secret|variable)\s+(?:delete|list|remove|set)\b`,
      ),
      invocationPattern(ghPrefix, String.raw`auth\s+token\b`),
      invocationPattern(
        npmPrefix,
        String.raw`token\s+(?:create|list|revoke)\b`,
      ),
      invocationPattern(npmPrefix, String.raw`(?:adduser|login|logout)\b`),
      invocationPattern(npmPrefix, String.raw`config\s+(?:list|ls)\b`),
      invocationPattern(npmPrefix, String.raw`config\s+get\s*$`),
      invocationPattern(
        npmPrefix,
        String.raw`config\s+(?:delete|del|get|rm|set)\b[^\r\n]*(?:_auth(?:token)?|auth(?:entication)?|credential|password|private[_-]?key|secret|token)\b`,
      ),
    ].some((pattern) => matchesShellInvocation(expandedCommand, pattern))
  ) {
    return {
      blocked: true,
      reason:
        "Credential, secret, or protected-variable access blocked while EXT-CREDENTIALS is closed.",
    };
  }

  if (
    matchesShellInvocation(
      expandedCommand,
      invocationPattern(
        npmPrefix,
        String.raw`run\s+(?:--silent\s+)?source:wa-lws:canary\b[^\r\n]*--execute\b`,
      ),
    )
  ) {
    return {
      blocked: true,
      reason:
        "The Washington yearly canary may not be executed again under G-WA-LWS-DISCOVERY.",
    };
  }

  if (
    notificationClosed &&
    [
      /^(?:send-mailmessage|mailx?|sendgrid|twilio)\b/iu,
      /^slack\s+(?:chat|send)\b/iu,
    ].some((pattern) => matchesShellInvocation(expandedCommand, pattern))
  ) {
    return {
      blocked: true,
      reason: "Outbound notification blocked while EXT-NOTIFY is closed.",
    };
  }

  const protectedMutation = protectedShellMutationPath(
    policyText,
    roadmap,
    root,
    workdirContext,
  );
  if (protectedMutation) {
    return {
      blocked: true,
      reason: `Shell mutation of preserved owner input or inactive frozen evidence is forbidden: ${protectedMutation}`,
    };
  }

  if (
    (commandMentionsSensitivePath(policyText) || workdirContext.restricted) &&
    !sensitivePathInspectionIsAllowed(policyText, workdirContext, root)
  ) {
    return {
      blocked: true,
      reason:
        "Private, credential, raw, cache, or non-approved generated custody is outside this hook's shell-access boundary.",
    };
  }

  return { blocked: false };
};

const isSensitivePatchPath = (repositoryPath) => {
  const normalized = repositoryPath.toLowerCase();
  if (normalized === ".env" || normalized.startsWith(".env.")) {
    return true;
  }
  return sensitivePatchRoots.some(
    (root) => normalized === root || normalized.startsWith(`${root}/`),
  );
};

const isOutsidePatchPath = (repositoryPath) =>
  repositoryPath.startsWith("../") ||
  path.posix.isAbsolute(repositoryPath) ||
  path.win32.isAbsolute(repositoryPath);

const patchPathIssue = (repositoryPath) => {
  if (!repositoryPath || isOutsidePatchPath(repositoryPath)) {
    return "outside this Git worktree";
  }
  const segments = repositoryPath.split("/");
  if (
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        segment.includes(":") ||
        /~\d/u.test(segment) ||
        /[. ]$/u.test(segment),
    )
  ) {
    return "noncanonical path segment";
  }
  return null;
};

const canonicalPathEquals = (left, right) =>
  process.platform === "win32"
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;

const patchPathHasAlias = (root, repositoryPath) => {
  let rootRealPath;
  try {
    rootRealPath = realpathSync.native(root);
  } catch {
    return true;
  }
  const segments = repositoryPath.split("/");
  let candidate = root;
  for (const [index, segment] of segments.entries()) {
    candidate = path.resolve(candidate, segment);
    if (!repositoryPathIsWithin(root, candidate)) {
      return true;
    }
    let stat;
    try {
      stat = lstatSync(candidate);
    } catch (error) {
      if (error?.code === "ENOENT") {
        continue;
      }
      return true;
    }
    if (stat.isSymbolicLink()) {
      return true;
    }
    if (index === segments.length - 1 && (!stat.isFile() || stat.nlink !== 1)) {
      return true;
    }
    let realCandidate;
    try {
      realCandidate = realpathSync.native(candidate);
    } catch {
      return true;
    }
    if (!repositoryPathIsWithin(rootRealPath, realCandidate)) {
      return true;
    }
    const expectedCandidate = path.resolve(
      rootRealPath,
      ...segments.slice(0, index + 1),
    );
    if (!canonicalPathEquals(realCandidate, expectedCandidate)) {
      return true;
    }
  }
  return false;
};

export const observerRoadmapAuthority = (roadmap) => {
  const gates = (roadmap?.gates ?? []).filter(
    (gate) => gate?.id === observerAuthoringPolicy.gateId,
  );
  const items = (roadmap?.work_items ?? []).filter(
    (item) => item?.id === observerAuthoringPolicy.workItemId,
  );
  const inProgressItems = (roadmap?.work_items ?? []).filter(
    (item) => item?.status === "in_progress",
  );
  if (
    gates.length !== 1 ||
    items.length !== 1 ||
    inProgressItems.length !== 1 ||
    inProgressItems[0]?.id !== observerAuthoringPolicy.workItemId
  ) {
    return false;
  }
  const [gate] = gates;
  const [item] = items;
  return (
    gate.state === "approved" &&
    Array.isArray(gate.approved_scope) &&
    gate.approved_scope.includes(observerAuthoringPolicy.workItemId) &&
    item.status === "in_progress" &&
    item.authorization_gate === observerAuthoringPolicy.gateId &&
    roadmap?.current_focus?.work_item === observerAuthoringPolicy.workItemId
  );
};

const fileSystemEntryExists = (absolutePath) => {
  try {
    lstatSync(absolutePath);
    return true;
  } catch (error) {
    return error?.code !== "ENOENT";
  }
};

const canonicalSingleLinkFile = (root, repositoryPath) => {
  const absolutePath = path.resolve(root, ...repositoryPath.split("/"));
  try {
    const stat = lstatSync(absolutePath);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.nlink !== 1 ||
      patchPathHasAlias(root, repositoryPath)
    ) {
      return false;
    }
    return canonicalPathEquals(
      realpathSync.native(absolutePath),
      path.resolve(realpathSync.native(root), ...repositoryPath.split("/")),
    );
  } catch {
    return false;
  }
};

export const observerParentDirectoriesAreCanonical = (root) => {
  let rootRealPath;
  try {
    rootRealPath = realpathSync.native(root);
  } catch {
    return false;
  }
  const parentSegments = observerAuthoringPolicy.path.split("/").slice(0, -1);
  let candidate = root;
  for (const [index, segment] of parentSegments.entries()) {
    candidate = path.resolve(candidate, segment);
    try {
      const stat = lstatSync(candidate);
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        return false;
      }
      const expected = path.resolve(
        rootRealPath,
        ...parentSegments.slice(0, index + 1),
      );
      if (!canonicalPathEquals(realpathSync.native(candidate), expected)) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
};

const outputLines = (value) =>
  String(value ?? "")
    .split(/\r?\n/u)
    .filter((line) => line.length > 0);

const containsEveryExactPathOnce = (actualPaths, expectedPaths) =>
  actualPaths.length === expectedPaths.length &&
  new Set(actualPaths).size === expectedPaths.length &&
  expectedPaths.every((repositoryPath) => actualPaths.includes(repositoryPath));

const gitIgnoreProvenanceIsRoot = (root, repositoryPaths) => {
  const ignored = runGit(root, [
    "check-ignore",
    "--verbose",
    "--no-index",
    "--",
    ...repositoryPaths,
  ]);
  if (!ignored.ok) {
    return false;
  }
  const ignoredEntries = outputLines(ignored.stdout).map((line) => {
    const [provenance, reportedPath, ...extraFields] = line.split("\t");
    return { extraFields, provenance, reportedPath };
  });
  if (
    !containsEveryExactPathOnce(
      ignoredEntries.map(({ reportedPath }) => reportedPath),
      repositoryPaths,
    ) ||
    ignoredEntries.some(
      ({ extraFields, provenance }) =>
        extraFields.length !== 0 || !/^\.gitignore:\d+:/u.test(provenance),
    )
  ) {
    return false;
  }
  return true;
};

const gitPathsAreIndexAndHeadAbsent = (root, repositoryPaths) => {
  const indexEntry = runGit(root, [
    "ls-files",
    "--stage",
    "--",
    ...repositoryPaths,
  ]);
  const headEntry = runGit(root, [
    "ls-tree",
    "-r",
    "--name-only",
    "HEAD",
    "--",
    ...repositoryPaths,
  ]);
  return (
    indexEntry.ok &&
    indexEntry.stdout.trim() === "" &&
    headEntry.ok &&
    headEntry.stdout.trim() === ""
  );
};

const gitPathsHaveIgnoredCustody = (root, repositoryPaths) => {
  if (
    !gitIgnoreProvenanceIsRoot(root, repositoryPaths) ||
    !gitPathsAreIndexAndHeadAbsent(root, repositoryPaths)
  ) {
    return false;
  }
  const untrackedIgnored = runGit(root, [
    "ls-files",
    "--others",
    "--ignored",
    "--exclude-standard",
    "--",
    ...repositoryPaths,
  ]);
  return (
    untrackedIgnored.ok &&
    containsEveryExactPathOnce(
      outputLines(untrackedIgnored.stdout),
      repositoryPaths,
    )
  );
};

export const observerTrustInputsMatchHead = (
  root,
  trustPaths = observerAuthoringPolicy.trustPaths,
) => {
  for (const repositoryPath of trustPaths) {
    if (!canonicalSingleLinkFile(root, repositoryPath)) {
      return false;
    }
    const indexEntry = runGit(root, [
      "ls-files",
      "--stage",
      "--",
      repositoryPath,
    ]);
    const trackedFlags = runGit(root, ["ls-files", "-v", "--", repositoryPath]);
    const headEntry = runGit(root, [
      "ls-tree",
      "-l",
      "HEAD",
      "--",
      repositoryPath,
    ]);
    if (!indexEntry.ok || !trackedFlags.ok || !headEntry.ok) {
      return false;
    }
    const indexMatch = outputLines(indexEntry.stdout)[0]?.match(
      /^(100(?:644|755)) ([0-9a-f]{40,64}) 0\t(.+)$/u,
    );
    const headMatch = outputLines(headEntry.stdout)[0]?.match(
      /^(100(?:644|755)) blob ([0-9a-f]{40,64})\s+(\d+)\t(.+)$/u,
    );
    const headBytes = Number(headMatch?.[3]);
    if (
      outputLines(indexEntry.stdout).length !== 1 ||
      outputLines(trackedFlags.stdout).length !== 1 ||
      outputLines(headEntry.stdout).length !== 1 ||
      trackedFlags.stdout.trim() !== `H ${repositoryPath}` ||
      indexMatch?.[3] !== repositoryPath ||
      headMatch?.[4] !== repositoryPath ||
      indexMatch?.[1] !== headMatch?.[1] ||
      indexMatch?.[2] !== headMatch?.[2] ||
      !Number.isSafeInteger(headBytes) ||
      headBytes <= 0 ||
      headBytes > maximumObserverTrustInputBytes
    ) {
      return false;
    }
    const headBlob = runGitBuffer(
      root,
      ["cat-file", "blob", headMatch[2]],
      maximumObserverTrustInputBytes + 1,
    );
    if (
      !headBlob.ok ||
      headBlob.stdout.byteLength !== headBytes ||
      hashExactCanonicalFile(root, repositoryPath, headBytes) !==
        createHash("sha256").update(headBlob.stdout).digest("hex")
    ) {
      return false;
    }
  }
  return true;
};

const observerDirectoryInventoryMatches = (root, expectedNames) => {
  const absoluteDirectory = path.resolve(
    root,
    ...observerAuthoringPolicy.directory.split("/"),
  );
  try {
    const actualNames = readdirSync(absoluteDirectory).sort();
    const canonicalNames = [...expectedNames].sort();
    return (
      actualNames.length === canonicalNames.length &&
      actualNames.every((name, index) => name === canonicalNames[index])
    );
  } catch {
    return false;
  }
};

const sameFileIdentity = (left, right) =>
  left.dev === right.dev &&
  left.ino === right.ino &&
  left.mode === right.mode &&
  left.size === right.size &&
  left.mtimeMs === right.mtimeMs &&
  left.ctimeMs === right.ctimeMs;

const hashExactCanonicalFile = (root, repositoryPath, expectedBytes) => {
  const absolutePath = path.resolve(root, ...repositoryPath.split("/"));
  let descriptor;
  let contents;
  try {
    const before = lstatSync(absolutePath);
    if (
      !Number.isSafeInteger(expectedBytes) ||
      expectedBytes <= 0 ||
      before.isSymbolicLink() ||
      !before.isFile() ||
      before.nlink !== 1 ||
      before.size !== expectedBytes ||
      !canonicalSingleLinkFile(root, repositoryPath)
    ) {
      return null;
    }
    descriptor = openSync(
      absolutePath,
      fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0),
    );
    const opened = fstatSync(descriptor);
    const openedPath = lstatSync(absolutePath);
    if (
      !opened.isFile() ||
      opened.nlink !== 1 ||
      opened.size !== expectedBytes ||
      openedPath.isSymbolicLink() ||
      !openedPath.isFile() ||
      openedPath.nlink !== 1 ||
      !sameFileIdentity(before, opened) ||
      !sameFileIdentity(before, openedPath) ||
      !canonicalSingleLinkFile(root, repositoryPath)
    ) {
      return null;
    }

    contents = Buffer.alloc(expectedBytes + 1);
    let offset = 0;
    while (offset < contents.byteLength) {
      const bytesRead = readSync(
        descriptor,
        contents,
        offset,
        contents.byteLength - offset,
        offset,
      );
      if (bytesRead === 0) {
        break;
      }
      offset += bytesRead;
    }

    const after = fstatSync(descriptor);
    const afterPath = lstatSync(absolutePath);
    if (
      offset !== expectedBytes ||
      !sameFileIdentity(opened, after) ||
      afterPath.isSymbolicLink() ||
      !afterPath.isFile() ||
      afterPath.nlink !== 1 ||
      !sameFileIdentity(opened, afterPath) ||
      !canonicalSingleLinkFile(root, repositoryPath)
    ) {
      return null;
    }
    return createHash("sha256")
      .update(contents.subarray(0, expectedBytes))
      .digest("hex");
  } catch {
    return null;
  } finally {
    contents?.fill(0);
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // A failed close makes no otherwise-invalid custody state valid.
      }
    }
  }
};

const historicalCustodyIsValid = (root, historicalCustody) => {
  const repositoryPaths = historicalCustody.map(
    ({ name }) => `${observerAuthoringPolicy.directory}/${name}`,
  );
  return (
    historicalCustody.every(({ name, bytes, sha256 }) => {
      const repositoryPath = `${observerAuthoringPolicy.directory}/${name}`;
      return hashExactCanonicalFile(root, repositoryPath, bytes) === sha256;
    }) && gitPathsHaveIgnoredCustody(root, repositoryPaths)
  );
};

const reservedCustodyIsAbsent = (root) =>
  observerAuthoringPolicy.reservedCustodyPaths.every(
    (repositoryPath) =>
      !fileSystemEntryExists(path.resolve(root, ...repositoryPath.split("/"))),
  );

const neverIssuedCustodyIsAbsent = (root) =>
  observerAuthoringPolicy.neverIssuedCustodyPaths.every(
    (repositoryPath) =>
      !fileSystemEntryExists(path.resolve(root, ...repositoryPath.split("/"))),
  );

const postRunDataCustodyIsValid = (
  root,
  {
    observerPresent,
    observerCustody = observerAuthoringPolicy.observerCustody,
    postRunCustody = observerAuthoringPolicy.postRunCustody,
  },
) => {
  const absoluteDirectory = path.resolve(
    root,
    ...observerAuthoringPolicy.directory.split("/"),
  );
  const observerName = path.posix.basename(observerAuthoringPolicy.path);
  let names;
  try {
    names = readdirSync(absoluteDirectory).sort();
  } catch {
    return false;
  }
  const hasObserver = names.includes(observerName);
  const dataNames = names.filter((name) => name !== observerName);
  if (
    hasObserver !== observerPresent ||
    names.length !== postRunCustody.fileCount + (observerPresent ? 1 : 0) ||
    dataNames.length !== postRunCustody.fileCount
  ) {
    return false;
  }

  const repositoryPaths = dataNames.map(
    (name) => `${observerAuthoringPolicy.directory}/${name}`,
  );
  const manifestLines = [];
  let totalBytes = 0;
  for (const repositoryPath of repositoryPaths) {
    let stat;
    try {
      stat = lstatSync(path.resolve(root, ...repositoryPath.split("/")));
    } catch {
      return false;
    }
    if (
      !Number.isSafeInteger(stat.size) ||
      stat.size <= 0 ||
      stat.size > maximumObserverTrustInputBytes ||
      !canonicalSingleLinkFile(root, repositoryPath)
    ) {
      return false;
    }
    const sha256 = hashExactCanonicalFile(root, repositoryPath, stat.size);
    if (sha256 === null) {
      return false;
    }
    totalBytes += stat.size;
    manifestLines.push(`${repositoryPath}\t${stat.size}\t${sha256}\n`);
  }
  const manifest = Buffer.from(manifestLines.join(""), "utf8");
  const manifestIsExact =
    totalBytes === postRunCustody.totalBytes &&
    manifest.byteLength === postRunCustody.manifestBytes &&
    createHash("sha256").update(manifest).digest("hex") ===
      postRunCustody.manifestSha256;
  manifest.fill(0);
  if (!manifestIsExact || !gitPathsHaveIgnoredCustody(root, repositoryPaths)) {
    return false;
  }

  if (!observerPresent) {
    return (
      !fileSystemEntryExists(
        path.resolve(root, ...observerAuthoringPolicy.path.split("/")),
      ) &&
      gitIgnoreProvenanceIsRoot(root, [observerAuthoringPolicy.path]) &&
      gitPathsAreIndexAndHeadAbsent(root, [observerAuthoringPolicy.path])
    );
  }
  return (
    canonicalSingleLinkFile(root, observerAuthoringPolicy.path) &&
    gitPathsHaveIgnoredCustody(root, [observerAuthoringPolicy.path]) &&
    hashExactCanonicalFile(
      root,
      observerAuthoringPolicy.path,
      observerCustody.bytes,
    ) === observerCustody.sha256
  );
};

export const observerPreAddCustodyIsValid = (
  root,
  { historicalCustody = observerAuthoringPolicy.historicalCustody } = {},
) => {
  const observerAbsolutePath = path.resolve(
    root,
    ...observerAuthoringPolicy.path.split("/"),
  );
  return (
    observerParentDirectoriesAreCanonical(root) &&
    !fileSystemEntryExists(observerAbsolutePath) &&
    gitIgnoreProvenanceIsRoot(root, [observerAuthoringPolicy.path]) &&
    gitPathsAreIndexAndHeadAbsent(root, [observerAuthoringPolicy.path]) &&
    reservedCustodyIsAbsent(root) &&
    observerDirectoryInventoryMatches(
      root,
      historicalCustody.map(({ name }) => name),
    ) &&
    historicalCustodyIsValid(root, historicalCustody)
  );
};

export const observerPostAddCustodyIsValid = (
  root,
  {
    historicalCustody = observerAuthoringPolicy.historicalCustody,
    observerCustody = observerAuthoringPolicy.observerCustody,
  } = {},
) =>
  observerParentDirectoriesAreCanonical(root) &&
  reservedCustodyIsAbsent(root) &&
  observerDirectoryInventoryMatches(root, [
    ...historicalCustody.map(({ name }) => name),
    path.posix.basename(observerAuthoringPolicy.path),
  ]) &&
  historicalCustodyIsValid(root, historicalCustody) &&
  canonicalSingleLinkFile(root, observerAuthoringPolicy.path) &&
  gitPathsHaveIgnoredCustody(root, [observerAuthoringPolicy.path]) &&
  hashExactCanonicalFile(
    root,
    observerAuthoringPolicy.path,
    observerCustody.bytes,
  ) === observerCustody.sha256;

export const observerExecutionCustodyIsValid = observerPostAddCustodyIsValid;

export const observerTerminalCustodyIsValid = (root, options = {}) =>
  observerParentDirectoriesAreCanonical(root) &&
  neverIssuedCustodyIsAbsent(root) &&
  postRunDataCustodyIsValid(root, {
    ...options,
    observerPresent: false,
  });

export const observerCustodyContract = Object.freeze({
  historical: observerAuthoringPolicy.historicalCustody,
  neverIssuedPaths: observerAuthoringPolicy.neverIssuedCustodyPaths,
  observer: observerAuthoringPolicy.observerCustody,
  observerPath: observerAuthoringPolicy.path,
  phase: observerAuthoringPolicy.phase,
  postRun: observerAuthoringPolicy.postRunCustody,
  report: observerAuthoringPolicy.reportCustody,
  reservedPaths: observerAuthoringPolicy.reservedCustodyPaths,
  trustPaths: observerAuthoringPolicy.trustPaths,
});

export const observerExecutionEvidenceIsValid = ({
  roadmap,
  roadmapValid,
  trustInputsMatchHead,
  custodyValid,
}) =>
  roadmapValid &&
  trustInputsMatchHead &&
  observerRoadmapAuthority(roadmap) &&
  custodyValid;

export const observerExecutionCheckpointIsValid = (root, roadmap) =>
  observerExecutionEvidenceIsValid({
    roadmap,
    roadmapValid: validateRoadmap(root).ok,
    trustInputsMatchHead: observerTrustInputsMatchHead(root),
    custodyValid: observerExecutionCustodyIsValid(root),
  });

export const evaluatePatchPaths = (
  paths,
  roadmap,
  { allowedSensitivePaths = new Set() } = {},
) => {
  const noncanonical = paths.find((repositoryPath) =>
    patchPathIssue(repositoryPath),
  );
  if (noncanonical) {
    return {
      blocked: true,
      reason: `Repository hooks require a canonical repository path: ${noncanonical}`,
    };
  }
  const outside = paths.find(isOutsidePatchPath);
  if (outside) {
    return {
      blocked: true,
      reason: `Repository hooks may not patch a path outside this Git worktree: ${outside}`,
    };
  }
  const sensitive = paths.find(
    (repositoryPath) =>
      isSensitivePatchPath(repositoryPath) &&
      !allowedSensitivePaths.has(repositoryPath),
  );
  if (sensitive) {
    return {
      blocked: true,
      reason: `Direct edits under the private/generated boundary are forbidden: ${sensitive}`,
    };
  }
  const ownerInput = paths.find((repositoryPath) =>
    ownerInputPaths.has(repositoryPath.toLowerCase()),
  );
  if (ownerInput) {
    return {
      blocked: true,
      reason: `Preserved owner-direction inputs are immutable repository custody: ${ownerInput}`,
    };
  }
  const frozenPaths = new Set(
    [...collectFrozenPaths(roadmap)].map((repositoryPath) =>
      repositoryPath.toLowerCase(),
    ),
  );
  const frozen = paths.find((repositoryPath) =>
    frozenPaths.has(repositoryPath.toLowerCase()),
  );
  if (frozen) {
    return {
      blocked: true,
      reason: `Frozen contract or review evidence cannot be edited while its roadmap phase is inactive: ${frozen}`,
    };
  }
  return { blocked: false };
};

export const evaluatePatchOperations = (operations, roadmap, root) => {
  if (!Array.isArray(operations) || operations.length === 0) {
    return {
      blocked: true,
      reason:
        "Repository hooks could not identify an apply_patch file operation.",
    };
  }
  for (const operation of operations) {
    const issue = patchPathIssue(operation.repositoryPath);
    if (
      issue ||
      operation.rawPath !== operation.repositoryPath ||
      patchPathHasAlias(root, operation.repositoryPath)
    ) {
      return {
        blocked: true,
        reason: `Repository hooks require a canonical, non-aliased patch path: ${operation.rawPath}`,
      };
    }
  }

  const observerOperation = operations.find(
    (operation) => operation.repositoryPath === observerAuthoringPolicy.path,
  );
  const observerPathAlias = operations.find(
    (operation) =>
      operation.repositoryPath !== observerAuthoringPolicy.path &&
      path.posix.basename(operation.repositoryPath).toLowerCase() ===
        path.posix.basename(observerAuthoringPolicy.path).toLowerCase(),
  );
  if (observerPathAlias) {
    return {
      blocked: true,
      reason: `The ignored portfolio observer requires its one exact canonical path: ${observerPathAlias.rawPath}`,
    };
  }
  if (observerOperation) {
    return {
      blocked: true,
      reason:
        "The spent portfolio observer has been removed and its terminal evidence custody is frozen; Add, Update, Delete, Move, and mixed patches are forbidden.",
    };
  }

  return evaluatePatchPaths(
    operations.map((operation) => operation.repositoryPath),
    roadmap,
  );
};

export const isObserverAddOperation = (operations) =>
  Array.isArray(operations) &&
  operations.length === 1 &&
  operations[0].action === "Add" &&
  operations[0].headerPath === ` ${observerAuthoringPolicy.path}` &&
  operations[0].repositoryPath === observerAuthoringPolicy.path;

export const planPostEditChecks = (paths, roadmap) => {
  const normalizedPaths = [...new Set(paths.map(normalizeRepositoryPath))];
  const formattedPaths = normalizedPaths.filter((repositoryPath) =>
    prettierExtensions.has(path.posix.extname(repositoryPath).toLowerCase()),
  );
  const roadmapChanged = normalizedPaths.includes("ROADMAP.yaml");
  const foundation = normalizedPaths.some(
    (repositoryPath) =>
      /^(?:config|fixtures|schemas)\//u.test(repositoryPath) ||
      repositoryPath === "scripts/validate-foundation.mjs" ||
      repositoryPath === "src/pipeline/source-registry.mjs",
  );
  const sourceBoundary = normalizedPaths.some((repositoryPath) =>
    /^(?:\.agents|\.codex|config|fixtures|schemas|scripts|src)\//u.test(
      repositoryPath,
    ),
  );
  const planningDocuments = new Set([
    ...fallbackPlanningDocuments,
    ...(roadmap?.binding_documents ?? []).map((entry) =>
      normalizeRepositoryPath(entry?.path),
    ),
  ]);
  const planning = normalizedPaths.some((repositoryPath) =>
    planningDocuments.has(repositoryPath),
  );
  return {
    paths: normalizedPaths,
    formattedPaths,
    roadmap: roadmapChanged,
    foundation,
    sourceBoundary,
    planning,
  };
};

const executePostEditChecks = (root, paths, roadmap) => {
  const plan = planPostEditChecks(paths, roadmap);
  const checks = [];
  const existingPaths = plan.formattedPaths.filter((repositoryPath) =>
    existsSync(path.resolve(root, repositoryPath)),
  );

  checks.push({
    name: "git diff --check",
    result: runGit(root, ["diff", "--check", "--", ...plan.paths]),
  });
  if (existingPaths.length > 0) {
    checks.push({
      name: "focused Prettier",
      result: runNodeScript(
        root,
        "node_modules/prettier/bin/prettier.cjs",
        ["--check", ...existingPaths],
        30_000,
      ),
    });
  }
  if (plan.roadmap) {
    checks.push({ name: "roadmap", result: validateRoadmap(root) });
  }
  if (plan.foundation) {
    checks.push({
      name: "foundation",
      result: runNodeScript(
        root,
        "scripts/validate-foundation.mjs",
        [],
        60_000,
      ),
    });
  }
  if (plan.sourceBoundary) {
    checks.push({
      name: "source boundary",
      result: runNodeScript(
        root,
        "scripts/scan-source-boundary.mjs",
        [],
        60_000,
      ),
    });
  }
  return { plan, checks };
};

export const buildSessionContext = ({ roadmap, validation, head, status }) => {
  const items = roadmap?.work_items ?? [];
  const statusCounts = Object.fromEntries(
    [
      "complete",
      "in_progress",
      "ready",
      "blocked",
      "deferred",
      "not_started",
    ].map((itemStatus) => [
      itemStatus,
      items.filter((item) => item.status === itemStatus).length,
    ]),
  );
  const focus = roadmap?.current_focus?.work_item ?? "none";
  const nextActions = (roadmap?.next_actions ?? [])
    .slice(0, 5)
    .map((action) => `${action.order}:${action.work_item}`)
    .join(", ");
  const closedBoundaries = (roadmap?.authority?.external_boundaries ?? [])
    .filter((boundary) => boundary.state === "closed")
    .map((boundary) => boundary.id)
    .join(", ");
  const dirty = trimOutput(status, 700) || "clean";
  return [
    "Policy Sentinel recovery brief (generated locally; no transcript was read):",
    `- roadmap validation: ${validation.ok ? "pass" : `FAIL — ${trimOutput(validation.detail, 500)}`}`,
    `- HEAD: ${head || "unknown"}`,
    `- worktree: ${dirty}`,
    `- current focus: ${focus}`,
    `- status counts: ${JSON.stringify(statusCounts)}`,
    `- next actions: ${nextActions || "none"}`,
    `- closed external boundaries: ${closedBoundaries || "none recorded"}`,
    "- before implementation, read AGENTS.md and ROADMAP.yaml completely; Git and the validated ledger outrank chat memory.",
  ].join("\n");
};

export const evaluatePreCompactState = ({ validationOk, dirty, focus }) => {
  if (!validationOk) {
    return {
      blocked: true,
      reason:
        "Roadmap validation failed. Reconcile the durable ledger before compacting.",
    };
  }
  if (dirty && !focus) {
    return {
      blocked: true,
      reason:
        "The worktree is dirty but ROADMAP.yaml has no active work item. Record the intentional work and next action before compacting.",
    };
  }
  return { blocked: false };
};

export const evaluateStopState = ({
  validationOk,
  dirty,
  focus,
  stopHookActive,
}) => {
  if (stopHookActive) {
    return { continue: true };
  }
  if (!validationOk) {
    return {
      continue: false,
      reason:
        "Roadmap validation is failing. Repair or truthfully record the blocker, then rerun proportional checks before stopping.",
    };
  }
  if (focus) {
    return {
      continue: false,
      reason: `Work item ${focus} is still in progress. Finish it or create a truthful validated checkpoint; do not advance unrelated work.`,
    };
  }
  if (dirty) {
    return {
      continue: false,
      reason:
        "The worktree is dirty with no active roadmap item. Inspect and reconcile it, preserving any identified owner changes, before stopping.",
    };
  }
  return { continue: true };
};

const preToolUseOutput = (reason) => ({
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: reason,
  },
});

const stopContinuationOutput = (reason) => ({
  decision: "block",
  reason,
});

const sessionStart = async (root) => {
  const validationResult = validateRoadmap(root);
  let roadmap;
  let loadError = "";
  try {
    roadmap = await loadRoadmap(root);
  } catch (error) {
    loadError = error instanceof Error ? error.message : String(error);
  }
  const headResult = runGit(root, ["rev-parse", "--short=12", "HEAD"]);
  const statusResult = gitStatus(root);
  const validation = {
    ok: validationResult.ok && Boolean(roadmap),
    detail: loadError || outputForResult(validationResult),
  };
  const output = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: buildSessionContext({
        roadmap,
        validation,
        head: headResult.ok ? headResult.stdout.trim() : "unknown",
        status: statusResult.ok
          ? statusResult.stdout
          : outputForResult(statusResult),
      }),
    },
  };
  if (!validation.ok) {
    output.systemMessage =
      "Policy Sentinel session recovery could not validate ROADMAP.yaml.";
  }
  return output;
};

const preCompact = async (root) => {
  const validationResult = validateRoadmap(root);
  let roadmap;
  try {
    roadmap = await loadRoadmap(root);
  } catch {
    roadmap = null;
  }
  const statusResult = terminalGitStatus(root);
  const evaluation = evaluatePreCompactState({
    validationOk: validationResult.ok && Boolean(roadmap) && statusResult.ok,
    dirty:
      !statusResult.ok || repositoryStatusIsDirty(root, statusResult.stdout),
    focus: roadmap?.current_focus?.work_item ?? null,
  });
  if (!evaluation.blocked) {
    return null;
  }
  return {
    continue: false,
    stopReason: evaluation.reason,
    systemMessage: evaluation.reason,
  };
};

const preToolUse = async (event, root) => {
  let roadmap;
  try {
    roadmap = await loadRoadmap(root);
  } catch {
    roadmap = null;
  }
  const command = event?.tool_input?.command ?? event?.tool_input?.cmd ?? "";
  const evaluation =
    event.tool_name === "apply_patch"
      ? evaluatePatchOperations(
          extractPatchOperations(command, root),
          roadmap,
          root,
        )
      : evaluateShellCommand(command, roadmap, {
          root,
          workdir:
            event?.tool_input?.workdir ??
            event?.tool_input?.cwd ??
            event?.cwd ??
            root,
        });
  return evaluation.blocked ? preToolUseOutput(evaluation.reason) : null;
};

const postToolUse = async (event, root) => {
  const command = event?.tool_input?.command ?? event?.tool_input?.cmd ?? "";
  const operations = extractPatchOperations(command, root);
  const paths = [
    ...new Set(operations.map(({ repositoryPath }) => repositoryPath)),
  ];
  if (paths.length === 0) {
    return null;
  }
  let roadmap;
  try {
    roadmap = await loadRoadmap(root);
  } catch {
    roadmap = null;
  }
  const { plan, checks } = executePostEditChecks(root, paths, roadmap);
  const failures = checks.filter((check) => !check.result.ok);
  const companionWarning =
    plan.planning && !plan.roadmap && !roadmapIsDirty(root)
      ? "A binding planning document changed while ROADMAP.yaml is unchanged. Decide whether status, evidence, next actions, or the decision register needs a companion update; typo-only edits need no ledger churn."
      : "";
  if (failures.length === 0 && !companionWarning) {
    return null;
  }
  const detail = [
    ...failures.map(
      ({ name, result }) => `${name} failed:\n${outputForResult(result)}`,
    ),
    companionWarning,
  ]
    .filter(Boolean)
    .join("\n\n");
  const output = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: trimOutput(detail, 2_000),
    },
  };
  if (failures.length > 0) {
    output.decision = "block";
    output.reason =
      "Focused post-edit validation failed; inspect hook feedback.";
  }
  return output;
};

const stop = async (event, root) => {
  const validationResult = validateRoadmap(root);
  let roadmap;
  try {
    roadmap = await loadRoadmap(root);
  } catch {
    roadmap = null;
  }
  const statusResult = terminalGitStatus(root);
  const evaluation = evaluateStopState({
    validationOk: validationResult.ok && Boolean(roadmap) && statusResult.ok,
    dirty:
      !statusResult.ok || repositoryStatusIsDirty(root, statusResult.stdout),
    focus: roadmap?.current_focus?.work_item ?? null,
    stopHookActive: event.stop_hook_active === true,
  });
  return evaluation.continue
    ? { continue: true }
    : stopContinuationOutput(evaluation.reason);
};

export const handleHookEvent = async (event) => {
  if (
    !event ||
    typeof event !== "object" ||
    typeof event.hook_event_name !== "string"
  ) {
    throw new Error("hook input must contain hook_event_name");
  }
  const root = resolveRepositoryRoot(event.cwd);
  switch (event.hook_event_name) {
    case "SessionStart":
      return sessionStart(root);
    case "PreCompact":
      return preCompact(root);
    case "PreToolUse":
      return preToolUse(event, root);
    case "PostToolUse":
      return postToolUse(event, root);
    case "Stop":
      return stop(event, root);
    default:
      throw new Error(`unsupported hook event: ${event.hook_event_name}`);
  }
};

const errorOutput = (eventName, error) => {
  const message = `Policy Sentinel hook failed safely: ${trimOutput(error instanceof Error ? error.message : error, 900)}`;
  if (eventName === "PreToolUse") {
    return preToolUseOutput(message);
  }
  if (eventName === "Stop") {
    return stopContinuationOutput(message);
  }
  if (eventName === "PreCompact") {
    return { continue: false, stopReason: message, systemMessage: message };
  }
  if (eventName === "PostToolUse") {
    return {
      decision: "block",
      reason: message,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: message,
      },
    };
  }
  return {
    systemMessage: message,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: message,
    },
  };
};

const main = async () => {
  let event = {};
  try {
    const input = readFileSync(0, "utf8");
    event = JSON.parse(input);
    const output = await handleHookEvent(event);
    if (output) {
      process.stdout.write(JSON.stringify(output));
    }
  } catch (error) {
    process.stdout.write(
      JSON.stringify(errorOutput(event.hook_event_name, error)),
    );
  }
};

if (path.resolve(process.argv[1] ?? "") === path.resolve(scriptPath)) {
  await main();
}
