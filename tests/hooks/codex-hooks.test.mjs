import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildSessionContext,
  collectFrozenPaths,
  evaluatePatchPaths,
  evaluatePatchOperations,
  evaluatePreCompactState,
  evaluateShellCommand,
  evaluateStopState,
  extractPatchOperations,
  extractPatchPaths,
  normalizeRepositoryPath,
  observerAuthoringEvidenceIsValid,
  observerCustodyIsEditable,
  observerRoadmapAuthority,
  planPostEditChecks,
  repositoryStatusIsDirty,
} from "../../scripts/codex-hooks.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const hookRunner = path.resolve(projectRoot, "scripts/codex-hooks.mjs");
const hookConfig = JSON.parse(
  readFileSync(path.resolve(projectRoot, ".codex/hooks.json"), "utf8"),
);
const posixHookCommand =
  'node "$(git rev-parse --show-toplevel)/scripts/codex-hooks.mjs"';
const windowsHookCommand =
  'cmd.exe /d /s /c "for /f \\"delims=\\" %R in (\'git rev-parse --show-toplevel\') do @node \\"%R\\scripts\\codex-hooks.mjs\\""';
const clone = (value) => JSON.parse(JSON.stringify(value));
const closedRoadmap = {
  authority: {
    external_boundaries: [
      { id: "EXT-GITHUB", state: "closed" },
      { id: "EXT-CREDENTIALS", state: "closed" },
      { id: "EXT-NOTIFY", state: "closed" },
    ],
  },
  work_items: [
    {
      id: "K0-LIFECYCLE",
      milestone: "K0",
      status: "complete",
      durable_lineage: {
        contract: { path: "docs/vision/k0-lifecycle-contract.md" },
      },
    },
  ],
};

const observerWorkItemId =
  "PNW-05-SRC-FEDERAL-REGISTER-TIER1-BOUNDED-ADMISSION";
const observerGateId = "G-PNW-05-REAL-SOURCE-PRERELEASE";
const observerPath =
  "generated-data/real-source-prerelease/observe-authority-evidence-v3.mjs";
const observerRoadmap = () => ({
  ...clone(closedRoadmap),
  current_focus: { work_item: observerWorkItemId },
  gates: [
    {
      id: observerGateId,
      state: "approved",
      approved_scope: [observerWorkItemId],
    },
  ],
  work_items: [
    ...clone(closedRoadmap.work_items),
    {
      id: observerWorkItemId,
      status: "in_progress",
      authorization_gate: observerGateId,
    },
  ],
});

const runGit = (root, args) => {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
};

test("hooks.json installs the five requested synchronous lifecycle hooks", () => {
  assert.deepEqual(Object.keys(hookConfig.hooks).sort(), [
    "PostToolUse",
    "PreCompact",
    "PreToolUse",
    "SessionStart",
    "Stop",
  ]);
  assert.equal(
    hookConfig.hooks.PreToolUse[0].matcher,
    "^(Bash|exec_command|apply_patch)$",
  );
  assert.equal(hookConfig.hooks.PostToolUse[0].matcher, "^apply_patch$");
  assert.equal(hookConfig.hooks.Stop[0].matcher, undefined);

  for (const groups of Object.values(hookConfig.hooks)) {
    assert.equal(groups.length, 1);
    assert.equal(groups[0].hooks.length, 1);
    const handler = groups[0].hooks[0];
    assert.equal(handler.type, "command");
    assert.equal(handler.async, undefined);
    assert.equal(handler.command, posixHookCommand);
    assert.equal(handler.commandWindows, windowsHookCommand);
    assert.doesNotMatch(
      `${handler.command} ${handler.commandWindows}`,
      /(?:curl|invoke-webrequest|npm|powershell|transcript|notify|webhook)/iu,
    );
  }
  assert.doesNotMatch(
    readFileSync(hookRunner, "utf8"),
    /--self-test-no-network/u,
    "PostToolUse must not execute unapproved ignored observer code",
  );
});

test("patch paths normalize across Windows and repository-relative input", () => {
  assert.equal(
    normalizeRepositoryPath(
      "I:\\policy-sentinel\\ROADMAP.yaml",
      "I:\\policy-sentinel",
    ),
    "ROADMAP.yaml",
  );
  const command = String.raw`*** Begin Patch
*** Update File: I:\policy-sentinel\ROADMAP.yaml
*** Add File: scripts/check-example.mjs
*** Move to File: docs/example.md
*** End Patch`;
  assert.deepEqual(extractPatchPaths(command, "I:\\policy-sentinel"), [
    "ROADMAP.yaml",
    "scripts/check-example.mjs",
    "docs/example.md",
  ]);
  assert.deepEqual(
    extractPatchOperations(command, "I:\\policy-sentinel").map(
      ({ action, repositoryPath }) => ({ action, repositoryPath }),
    ),
    [
      { action: "Update", repositoryPath: "ROADMAP.yaml" },
      { action: "Add", repositoryPath: "scripts/check-example.mjs" },
      { action: "Move", repositoryPath: "docs/example.md" },
    ],
  );
});

test("terminal status exempts only exact untracked owner-input custody", () => {
  const root = mkdtempSync(path.join(tmpdir(), "policy-sentinel-hook-status-"));
  const repositoryPath = "docs/owner-direction.md";
  const absolutePath = path.join(root, "docs", "owner-direction.md");
  const original = "preserved owner direction\n";
  const manifest = Object.freeze({
    [repositoryPath]: createHash("sha256").update(original).digest("hex"),
  });
  try {
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, original, "utf8");
    assert.equal(
      repositoryStatusIsDirty(root, `?? ${repositoryPath}\0`, manifest),
      false,
    );
    assert.equal(
      repositoryStatusIsDirty(
        root,
        `?? ${repositoryPath}\0?? scratch.txt\0`,
        manifest,
      ),
      true,
    );
    assert.equal(
      repositoryStatusIsDirty(root, " M ROADMAP.yaml\0", manifest),
      true,
    );

    writeFileSync(absolutePath, "changed owner direction\n", "utf8");
    assert.equal(
      repositoryStatusIsDirty(root, `?? ${repositoryPath}\0`, manifest),
      true,
    );

    writeFileSync(absolutePath, original, "utf8");
    assert.equal(repositoryStatusIsDirty(root, "", manifest), true);
    rmSync(absolutePath);
    assert.equal(
      repositoryStatusIsDirty(root, "", manifest),
      false,
      "an owner packet absent from a later clone is not worktree dirtiness",
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("PreToolUse blocks closed gates and destructive Git but permits inspection", () => {
  const blockedCommands = [
    "git push origin main",
    "git.exe push origin main",
    "git -C . push origin main",
    "git status --short; git.exe push origin main",
    "git reset --hard HEAD~1",
    "git checkout -- ROADMAP.yaml",
    "git remote add origin https://example.invalid/repo.git",
    "git config remote.origin.url https://example.invalid/repo.git",
    "gh auth login",
    "gh repo create example",
    "gh.exe repo create example",
    "gh api repos/example/example -X POST -f name=value",
    "gh secret list",
    "gh variable list",
    "gh auth token",
    "npm publish",
    "npm.cmd publish",
    "npm token list",
    "npm run source:wa-lws:canary -- --execute --scenario yearly",
    "Send-MailMessage -To owner@example.invalid",
  ];
  for (const command of blockedCommands) {
    assert.equal(
      evaluateShellCommand(command, closedRoadmap).blocked,
      true,
      command,
    );
  }

  const allowedCommands = [
    "git status --short",
    "git log -1 --oneline",
    "gh auth status",
    "gh repo view atniclimate/policy-sentinel",
    "gh api --method GET repos/atniclimate/policy-sentinel",
    "git config --get remote.origin.url",
    "npm run check",
    "npm run --silent source:wa-lws:canary -- --help",
    'Write-Output "Never run git push"',
    'rg -n "git push" AGENTS.md',
    'rg -n "gh repo create" AGENTS.md',
  ];
  for (const command of allowedCommands) {
    assert.equal(
      evaluateShellCommand(command, closedRoadmap).blocked,
      false,
      command,
    );
  }

  const missingBoundaryRoadmap = {
    authority: { external_boundaries: [] },
    work_items: [],
  };
  for (const command of [
    "gh repo create example",
    "gh secret list",
    "Send-MailMessage -To owner@example.invalid",
  ]) {
    assert.equal(
      evaluateShellCommand(command, missingBoundaryRoadmap).blocked,
      true,
      `missing boundary must fail closed: ${command}`,
    );
  }
});

test("PreToolUse protects private paths and inactive frozen evidence", () => {
  for (const repositoryPath of [
    ".env",
    ".env.local",
    ".git/config",
    "../outside.txt",
    "C:/outside.txt",
    "/tmp/outside.txt",
    "docs/../generated-data/real-source-prerelease/authority-graph-v2.json",
    "private/input.json",
    "raw-data/provider.json",
    "generated-data/public.json",
    "secrets/token.txt",
  ]) {
    assert.equal(
      evaluatePatchPaths([repositoryPath], closedRoadmap).blocked,
      true,
      repositoryPath,
    );
  }

  assert.equal(
    evaluatePatchPaths(["docs/vision/k0-lifecycle-contract.md"], closedRoadmap)
      .blocked,
    true,
  );
  assert.equal(
    evaluatePatchPaths(["ROADMAP.yaml"], closedRoadmap).blocked,
    false,
  );
  assert.equal(
    evaluatePatchPaths(["scripts/codex-hooks.mjs"], closedRoadmap).blocked,
    false,
  );

  const activeK0 = JSON.parse(JSON.stringify(closedRoadmap));
  activeK0.work_items[0].status = "in_progress";
  assert.equal(
    collectFrozenPaths(activeK0).has("docs/vision/k0-lifecycle-contract.md"),
    false,
  );
});

test("PreToolUse rejects hard-linked patch targets", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "policy-sentinel-hook-links-"));
  const sourcePath = path.join(root, "source.txt");
  const aliasPath = path.join(root, "alias.txt");
  try {
    writeFileSync(sourcePath, "shared bytes\n", "utf8");
    try {
      linkSync(sourcePath, aliasPath);
    } catch (error) {
      if (["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
        t.diagnostic("hard-link regression unavailable on this host");
        return;
      }
      throw error;
    }
    const operations = extractPatchOperations(
      "*** Begin Patch\n*** Update File: alias.txt\n*** End Patch",
    );
    assert.equal(
      evaluatePatchOperations(operations, closedRoadmap, root).blocked,
      true,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("observer authoring requires the exact active gate and custody state", () => {
  const authorized = observerRoadmap();
  assert.equal(observerRoadmapAuthority(authorized), true);
  assert.equal(
    observerAuthoringEvidenceIsValid({
      roadmap: authorized,
      roadmapValid: true,
      roadmapMatchesHead: true,
      custodyEditable: true,
    }),
    true,
  );
  for (const falseEvidence of [
    { roadmapValid: false },
    { roadmapMatchesHead: false },
    { custodyEditable: false },
  ]) {
    assert.equal(
      observerAuthoringEvidenceIsValid({
        roadmap: authorized,
        roadmapValid: true,
        roadmapMatchesHead: true,
        custodyEditable: true,
        ...falseEvidence,
      }),
      false,
    );
  }

  const invalidRoadmaps = [];
  const closedGate = observerRoadmap();
  closedGate.gates[0].state = "closed";
  invalidRoadmaps.push(closedGate);
  const missingGate = observerRoadmap();
  missingGate.gates = [];
  invalidRoadmaps.push(missingGate);
  const duplicateGate = observerRoadmap();
  duplicateGate.gates.push(clone(duplicateGate.gates[0]));
  invalidRoadmaps.push(duplicateGate);
  const omittedScope = observerRoadmap();
  omittedScope.gates[0].approved_scope = [];
  invalidRoadmaps.push(omittedScope);
  const missingItem = observerRoadmap();
  missingItem.work_items = missingItem.work_items.filter(
    ({ id }) => id !== observerWorkItemId,
  );
  invalidRoadmaps.push(missingItem);
  const duplicateItem = observerRoadmap();
  duplicateItem.work_items.push(clone(duplicateItem.work_items.at(-1)));
  invalidRoadmaps.push(duplicateItem);
  const inactiveItem = observerRoadmap();
  inactiveItem.work_items.at(-1).status = "ready";
  invalidRoadmaps.push(inactiveItem);
  const wrongGate = observerRoadmap();
  wrongGate.work_items.at(-1).authorization_gate = "G-OTHER";
  invalidRoadmaps.push(wrongGate);
  const wrongFocus = observerRoadmap();
  wrongFocus.current_focus.work_item = "OTHER";
  invalidRoadmaps.push(wrongFocus);

  for (const roadmap of invalidRoadmaps) {
    assert.equal(observerRoadmapAuthority(roadmap), false);
  }
});

test("observer custody rejects latches and tracked or aliased state", (t) => {
  const root = mkdtempSync(
    path.join(tmpdir(), "policy-sentinel-hook-custody-"),
  );
  const absoluteObserverPath = path.join(root, ...observerPath.split("/"));
  const attemptPath = path.join(
    root,
    "generated-data",
    "real-source-prerelease",
    "FR-D3.attempt",
  );
  try {
    runGit(root, ["init", "--quiet"]);
    runGit(root, ["config", "user.name", "Policy Sentinel Test"]);
    runGit(root, [
      "config",
      "user.email",
      "policy-sentinel-test@example.invalid",
    ]);
    writeFileSync(path.join(root, ".gitignore"), "generated-data/\n", "utf8");
    runGit(root, ["add", ".gitignore"]);
    runGit(root, ["commit", "--quiet", "--message", "fixture root"]);
    mkdirSync(path.dirname(absoluteObserverPath), { recursive: true });
    writeFileSync(absoluteObserverPath, "export {};\n", "utf8");
    assert.equal(observerCustodyIsEditable(root), true);

    writeFileSync(attemptPath, "reserved\n", "utf8");
    assert.equal(observerCustodyIsEditable(root), false);
    rmSync(attemptPath);

    const acquisitionReceiptPath = path.join(
      root,
      "generated-data",
      "real-source-prerelease",
      "FR-A1.receipt.json",
    );
    writeFileSync(acquisitionReceiptPath, "{}\n", "utf8");
    assert.equal(observerCustodyIsEditable(root), false);
    rmSync(acquisitionReceiptPath);

    const danglingReceiptPath = path.join(
      root,
      "generated-data",
      "real-source-prerelease",
      "FR-R7.receipt.json",
    );
    try {
      symlinkSync("missing-receipt.json", danglingReceiptPath, "file");
      assert.equal(existsSync(danglingReceiptPath), false);
      assert.equal(observerCustodyIsEditable(root), false);
      rmSync(danglingReceiptPath);
    } catch (error) {
      if (!["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
        throw error;
      }
      t.diagnostic("dangling-symlink regression unavailable on this host");
    }

    runGit(root, ["add", "--force", observerPath]);
    assert.equal(observerCustodyIsEditable(root), false);
    runGit(root, ["commit", "--quiet", "--message", "track observer"]);
    runGit(root, ["rm", "--cached", "--quiet", observerPath]);
    assert.equal(
      observerCustodyIsEditable(root),
      false,
      "a HEAD-tracked observer staged for deletion is not ignored custody",
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("observer apply_patch exception is update-only, exact, and fail-closed", () => {
  const operation = (header) =>
    extractPatchOperations(`*** Begin Patch\n${header}\n*** End Patch`);
  const exactUpdate = operation(`*** Update File: ${observerPath}`);
  assert.equal(
    evaluatePatchOperations(exactUpdate, observerRoadmap(), projectRoot, {
      authorizeObserverUpdate: () => true,
    }).blocked,
    false,
  );
  assert.equal(
    evaluatePatchOperations(exactUpdate, observerRoadmap(), projectRoot, {
      authorizeObserverUpdate: () => false,
    }).blocked,
    true,
  );

  for (const header of [
    `*** Add File: ${observerPath}`,
    `*** Delete File: ${observerPath}`,
    `*** Move to: ${observerPath}`,
    "*** Update File: generated-data/real-source-prerelease/authority-graph-v2.json",
    "*** Update File: generated-data/real-source-prerelease/observe-authority-evidence-v3.js",
    "*** Update File: Generated-data/real-source-prerelease/observe-authority-evidence-v3.mjs",
    "*** Update File: docs/../generated-data/real-source-prerelease/observe-authority-evidence-v3.mjs",
    "*** Update File: ./generated-data/real-source-prerelease/observe-authority-evidence-v3.mjs",
    "*** Update File: generated-data//real-source-prerelease/observe-authority-evidence-v3.mjs",
    "*** Update File: generated-data/real-source-prerelease/observe-authority-evidence-v3.mjs:stream",
    "*** Update File: private/observe-authority-evidence-v3.mjs",
  ]) {
    assert.equal(
      evaluatePatchOperations(operation(header), observerRoadmap(), projectRoot)
        .blocked,
      true,
      header,
    );
  }

  const mixed = extractPatchOperations(
    `*** Begin Patch\n*** Update File: ${observerPath}\n*** Update File: README.md\n*** End Patch`,
  );
  assert.equal(
    evaluatePatchOperations(mixed, observerRoadmap(), projectRoot).blocked,
    true,
  );
  assert.equal(
    evaluatePatchOperations([], observerRoadmap(), projectRoot).blocked,
    true,
  );

  const inactive = observerRoadmap();
  inactive.work_items.at(-1).status = "ready";
  assert.equal(
    evaluatePatchOperations(exactUpdate, inactive, projectRoot).blocked,
    true,
  );
});

test("PostToolUse selects proportional checks from changed paths", () => {
  assert.deepEqual(planPostEditChecks(["ROADMAP.yaml"]), {
    paths: ["ROADMAP.yaml"],
    formattedPaths: ["ROADMAP.yaml"],
    roadmap: true,
    foundation: false,
    sourceBoundary: false,
    planning: false,
  });
  assert.deepEqual(
    planPostEditChecks(["schemas/policy-record.schema.json", "README.md"]),
    {
      paths: ["schemas/policy-record.schema.json", "README.md"],
      formattedPaths: ["schemas/policy-record.schema.json", "README.md"],
      roadmap: false,
      foundation: true,
      sourceBoundary: true,
      planning: false,
    },
  );
  const planning = planPostEditChecks(["docs/project-brief.md"]);
  assert.equal(planning.planning, true);
  assert.equal(planning.formattedPaths.length, 1);

  const dynamicPlanning = planPostEditChecks(["docs/new-binding-document.md"], {
    binding_documents: [{ path: "docs/new-binding-document.md" }],
  });
  assert.equal(dynamicPlanning.planning, true);

  const skillPlan = planPostEditChecks([
    ".agents/skills/policy-sentinel-source-review/SKILL.md",
  ]);
  assert.equal(skillPlan.sourceBoundary, true);
});

test("SessionStart context is bounded recovery state, not transcript content", () => {
  const context = buildSessionContext({
    roadmap: {
      ...closedRoadmap,
      current_focus: { work_item: "H-HOOKS" },
      next_actions: [{ order: 1, work_item: "H-HOOKS" }],
    },
    validation: { ok: true, detail: "" },
    head: "abc123",
    status: " M ROADMAP.yaml\n",
  });
  assert.match(context, /generated locally; no transcript was read/u);
  assert.match(context, /current focus: H-HOOKS/u);
  assert.match(context, /HEAD: abc123/u);
  assert.doesNotMatch(context, /last_assistant_message|transcript_path/u);
});

test("PreCompact requires a valid ledger and an active item for dirty work", () => {
  assert.equal(
    evaluatePreCompactState({ validationOk: false, dirty: false, focus: null })
      .blocked,
    true,
  );
  assert.equal(
    evaluatePreCompactState({ validationOk: true, dirty: true, focus: null })
      .blocked,
    true,
  );
  assert.equal(
    evaluatePreCompactState({
      validationOk: true,
      dirty: true,
      focus: "H-HOOKS",
    }).blocked,
    false,
  );
});

test("Stop requests at most one continuation for unfinished durable state", () => {
  assert.equal(
    evaluateStopState({
      validationOk: true,
      dirty: false,
      focus: "H-HOOKS",
      stopHookActive: false,
    }).continue,
    false,
  );
  assert.deepEqual(
    evaluateStopState({
      validationOk: false,
      dirty: true,
      focus: "H-HOOKS",
      stopHookActive: true,
    }),
    { continue: true },
  );
  assert.deepEqual(
    evaluateStopState({
      validationOk: true,
      dirty: false,
      focus: null,
      stopHookActive: false,
    }),
    { continue: true },
  );
});

test("the command hook emits valid deny JSON and stays silent when allowing", () => {
  const invoke = (command, toolName = "Bash") =>
    spawnSync(process.execPath, [hookRunner], {
      cwd: projectRoot,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: "PreToolUse",
        cwd: projectRoot,
        tool_name: toolName,
        tool_input:
          toolName === "exec_command" ? { cmd: command } : { command },
      }),
      timeout: 30_000,
    });

  const denied = invoke("git push origin main");
  assert.equal(denied.status, 0, denied.stderr);
  assert.equal(
    JSON.parse(denied.stdout).hookSpecificOutput.permissionDecision,
    "deny",
  );

  const allowed = invoke("git status --short");
  assert.equal(allowed.status, 0, allowed.stderr);
  assert.equal(allowed.stdout, "");

  const unifiedDenied = invoke(
    "git remote add origin example.invalid",
    "exec_command",
  );
  assert.equal(unifiedDenied.status, 0, unifiedDenied.stderr);
  assert.equal(
    JSON.parse(unifiedDenied.stdout).hookSpecificOutput.permissionDecision,
    "deny",
  );
});
