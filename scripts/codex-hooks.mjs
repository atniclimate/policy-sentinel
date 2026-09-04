import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
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
  path: "generated-data/real-source-prerelease/observe-authority-evidence-v3.mjs",
  gateId: "G-PNW-05-REAL-SOURCE-PRERELEASE",
  workItemId: "PNW-05-SRC-FEDERAL-REGISTER-TIER1-BOUNDED-ADMISSION",
  forbiddenCustodyPaths: Object.freeze(
    ["FR-D3", "FR-R6", "FR-R7", "FR-A1"].flatMap((requestId) => [
      `generated-data/real-source-prerelease/${requestId}.attempt`,
      `generated-data/real-source-prerelease/${requestId}.receipt.json`,
    ]),
  ),
});
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
    /^\*\*\* (?:(Add|Delete|Update) File:\s*(.+)|Move to(?: File)?:\s*(.+))$/gmu;
  for (const match of String(command ?? "").matchAll(pattern)) {
    const action = match[1] ?? "Move";
    const rawPath = String(match[2] ?? match[3] ?? "")
      .trim()
      .replace(/^['"]|['"]$/g, "")
      .replaceAll("\\", "/");
    const repositoryPath = normalizeRepositoryPath(rawPath, root);
    if (
      repositoryPath &&
      repositoryPath !== "dev/null" &&
      repositoryPath !== "/dev/null"
    ) {
      operations.push(Object.freeze({ action, rawPath, repositoryPath }));
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
  /\b(?:add-content|copy-item|move-item|out-file|remove-item|rename-item|set-content)\b|(?:^|[\s;])(?:cp|mv|rm)\s|>>?/iu.test(
    command,
  );

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

const gitPrefix = String.raw`git(?:\.exe)?(?:\s+(?:(?:-[cC]|--(?:git-dir|work-tree|namespace|config-env))\s+\S+|--(?:bare|no-pager|literal-pathspecs|no-optional-locks|no-replace-objects)))*\s+`;
const ghPrefix = String.raw`gh(?:\.exe)?(?:\s+(?:-R|--repo)\s+\S+)*\s+`;
const npmPrefix = String.raw`npm(?:\.cmd|\.exe)?\s+`;
const invocationPattern = (prefix, operation) =>
  new RegExp(`^${prefix}${operation}`, "iu");

export const evaluateShellCommand = (command, roadmap) => {
  const text = String(command ?? "");
  const normalized = text.replace(/\s+/gu, " ").trim();
  const githubClosed = isClosedBoundary(roadmap, "EXT-GITHUB");
  const credentialsClosed = isClosedBoundary(roadmap, "EXT-CREDENTIALS");
  const notificationClosed = isClosedBoundary(roadmap, "EXT-NOTIFY");

  const alwaysBlocked = [
    [
      invocationPattern(gitPrefix, String.raw`push\b`),
      "Direct git push is forbidden; Policy Sentinel requires an exact owner-approved gh operation.",
    ],
    [
      invocationPattern(
        gitPrefix,
        String.raw`(?:reset\s+--hard|rebase\b|commit\s+--amend|filter-(?:branch|repo)\b|clean\s+[^\r\n]*-f|checkout\s+--(?:\s|$)|restore\s+[^\r\n]*(?:--worktree|-W)(?:\s|$))`,
      ),
      "Destructive or history-rewriting Git operation blocked by repository policy.",
    ],
  ];
  for (const [pattern, reason] of alwaysBlocked) {
    if (matchesShellInvocation(text, pattern)) {
      return { blocked: true, reason };
    }
  }

  if (githubClosed) {
    const githubMutationPatterns = [
      invocationPattern(
        gitPrefix,
        String.raw`remote\s+(?:add|remove|rename|set-url|update)\b`,
      ),
      invocationPattern(
        gitPrefix,
        String.raw`config\b(?![^\r\n]*\s--get(?:-all|-regexp)?\b)[^\r\n]*\b(?:remote\.[^\s=]+|branch\.[^\s=]+\.remote)\b`,
      ),
      invocationPattern(
        ghPrefix,
        String.raw`auth\s+(?:login|logout|refresh|setup-git)\b`,
      ),
      invocationPattern(
        ghPrefix,
        String.raw`repo\s+(?:archive|create|delete|edit|fork|rename|sync)\b`,
      ),
      invocationPattern(
        ghPrefix,
        String.raw`pr\s+(?:close|create|edit|merge|ready|reopen|review)\b`,
      ),
      invocationPattern(
        ghPrefix,
        String.raw`issue\s+(?:close|create|delete|edit|reopen)\b`,
      ),
      invocationPattern(
        ghPrefix,
        String.raw`release\s+(?:create|delete|edit|upload)\b`,
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
        String.raw`api\b[^\r\n]*(?:(?:-X|--method)(?:=|\s+)(?:POST|PUT|PATCH|DELETE)|(?:^|\s)(?:-f|-F|--field|--raw-field|--input)(?:\s|=))`,
      ),
      invocationPattern(
        npmPrefix,
        String.raw`(?:publish|deprecate|unpublish)\b`,
      ),
    ];
    if (
      githubMutationPatterns.some((pattern) =>
        matchesShellInvocation(text, pattern),
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
    ].some((pattern) => matchesShellInvocation(text, pattern))
  ) {
    return {
      blocked: true,
      reason:
        "Credential, secret, or protected-variable access blocked while EXT-CREDENTIALS is closed.",
    };
  }

  if (
    matchesShellInvocation(
      text,
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
    ].some((pattern) => matchesShellInvocation(text, pattern))
  ) {
    return {
      blocked: true,
      reason: "Outbound notification blocked while EXT-NOTIFY is closed.",
    };
  }

  if (hasWriteIntent(normalized)) {
    const normalizedCommand = normalized.replaceAll("\\", "/").toLowerCase();
    for (const frozenPath of collectFrozenPaths(roadmap)) {
      if (normalizedCommand.includes(frozenPath.toLowerCase())) {
        return {
          blocked: true,
          reason: `Shell mutation of frozen evidence path ${frozenPath} is not authorized.`,
        };
      }
    }
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
        /[. ]$/u.test(segment),
    )
  ) {
    return "noncanonical path segment";
  }
  return null;
};

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
  if (gates.length !== 1 || items.length !== 1) {
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

export const observerCustodyIsEditable = (root) => {
  const repositoryPath = observerAuthoringPolicy.path;
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
    if (
      realpathSync.native(absolutePath).toLowerCase() !==
      path
        .resolve(realpathSync.native(root), ...repositoryPath.split("/"))
        .toLowerCase()
    ) {
      return false;
    }
  } catch {
    return false;
  }
  if (
    !runGit(root, ["check-ignore", "--quiet", "--", repositoryPath]).ok ||
    runGit(root, ["ls-files", "--error-unmatch", "--", repositoryPath]).ok ||
    runGit(root, ["cat-file", "-e", `HEAD:${repositoryPath}`]).ok
  ) {
    return false;
  }
  return observerAuthoringPolicy.forbiddenCustodyPaths.every(
    (forbiddenPath) =>
      !fileSystemEntryExists(path.resolve(root, ...forbiddenPath.split("/"))),
  );
};

export const observerAuthoringEvidenceIsValid = ({
  roadmap,
  roadmapValid,
  roadmapMatchesHead,
  custodyEditable,
}) =>
  roadmapValid &&
  roadmapMatchesHead &&
  observerRoadmapAuthority(roadmap) &&
  custodyEditable;

const observerAuthoringIsAuthorized = (root, roadmap) =>
  observerAuthoringEvidenceIsValid({
    roadmap,
    roadmapValid: validateRoadmap(root).ok,
    roadmapMatchesHead: runGit(root, [
      "diff",
      "--quiet",
      "HEAD",
      "--",
      "ROADMAP.yaml",
    ]).ok,
    custodyEditable: observerCustodyIsEditable(root),
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

export const evaluatePatchOperations = (
  operations,
  roadmap,
  root,
  { authorizeObserverUpdate = observerAuthoringIsAuthorized } = {},
) => {
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
  const allowedSensitivePaths = new Set();
  if (observerOperation) {
    if (
      operations.length !== 1 ||
      observerOperation.action !== "Update" ||
      !authorizeObserverUpdate(root, roadmap)
    ) {
      return {
        blocked: true,
        reason:
          "The ignored observer may only receive one exact Update File patch while its committed and working authorization and pre-attempt custody remain valid.",
      };
    }
    allowedSensitivePaths.add(observerAuthoringPolicy.path);
  }

  return evaluatePatchPaths(
    operations.map((operation) => operation.repositoryPath),
    roadmap,
    { allowedSensitivePaths },
  );
};

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

const observerPostEditChecks = (root, roadmap) => {
  const stateIsValid = observerAuthoringIsAuthorized(root, roadmap);
  return [
    {
      name: "observer authorization and custody",
      result: {
        ok: stateIsValid,
        status: stateIsValid ? 0 : 1,
        stdout: "",
        stderr: stateIsValid
          ? ""
          : "committed/working authority or pre-attempt observer custody changed",
      },
    },
    {
      name: "observer syntax",
      result: run(
        process.execPath,
        ["--check", path.resolve(root, observerAuthoringPolicy.path)],
        { cwd: root, timeout: 30_000 },
      ),
    },
    {
      name: "observer lint",
      result: runNodeScript(
        root,
        "node_modules/eslint/bin/eslint.js",
        ["--no-ignore", "--max-warnings=0", observerAuthoringPolicy.path],
        30_000,
      ),
    },
  ];
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
      : evaluateShellCommand(command, roadmap);
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
  const observerEdited =
    operations.length === 1 &&
    operations[0].action === "Update" &&
    operations[0].repositoryPath === observerAuthoringPolicy.path;
  if (observerEdited) {
    checks.push(...observerPostEditChecks(root, roadmap));
  }
  const failures = checks.filter((check) => !check.result.ok);
  const companionWarning =
    plan.planning && !plan.roadmap && !roadmapIsDirty(root)
      ? "A binding planning document changed while ROADMAP.yaml is unchanged. Decide whether status, evidence, next actions, or the decision register needs a companion update; typo-only edits need no ledger churn."
      : "";
  const observerWarning = observerEdited
    ? "The ignored observer bytes changed. Static hook checks do not execute unapproved code. Obtain fresh source, security, and sovereignty approval before any self-test or request execution."
    : "";
  if (failures.length === 0 && !companionWarning && !observerWarning) {
    return null;
  }
  const detail = [
    ...failures.map(
      ({ name, result }) => `${name} failed:\n${outputForResult(result)}`,
    ),
    companionWarning,
    observerWarning,
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
