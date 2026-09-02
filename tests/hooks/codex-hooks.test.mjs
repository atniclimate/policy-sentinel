import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildSessionContext,
  collectFrozenPaths,
  evaluatePatchPaths,
  evaluatePreCompactState,
  evaluateShellCommand,
  evaluateStopState,
  extractPatchPaths,
  normalizeRepositoryPath,
  planPostEditChecks,
} from "../../scripts/codex-hooks.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const hookRunner = path.resolve(projectRoot, "scripts/codex-hooks.mjs");
const hookConfig = JSON.parse(
  readFileSync(path.resolve(projectRoot, ".codex/hooks.json"), "utf8"),
);
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

test("hooks.json installs the five requested synchronous lifecycle hooks", () => {
  assert.deepEqual(Object.keys(hookConfig.hooks).sort(), [
    "PostToolUse",
    "PreCompact",
    "PreToolUse",
    "SessionStart",
    "Stop",
  ]);
  assert.equal(hookConfig.hooks.PreToolUse[0].matcher, "^(Bash|apply_patch)$");
  assert.equal(hookConfig.hooks.PostToolUse[0].matcher, "^apply_patch$");
  assert.equal(hookConfig.hooks.Stop[0].matcher, undefined);

  for (const groups of Object.values(hookConfig.hooks)) {
    assert.equal(groups.length, 1);
    assert.equal(groups[0].hooks.length, 1);
    const handler = groups[0].hooks[0];
    assert.equal(handler.type, "command");
    assert.equal(handler.async, undefined);
    assert.match(handler.command, /hooks:run/u);
    assert.match(handler.commandWindows, /hooks:run/u);
    assert.doesNotMatch(
      `${handler.command} ${handler.commandWindows}`,
      /(?:curl|invoke-webrequest|transcript|notify|webhook)/iu,
    );
  }
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
});

test("PreToolUse blocks closed gates and destructive Git but permits inspection", () => {
  const blockedCommands = [
    "git push origin main",
    "git reset --hard HEAD~1",
    "git checkout -- ROADMAP.yaml",
    "git remote add origin https://example.invalid/repo.git",
    "git config remote.origin.url https://example.invalid/repo.git",
    "gh auth login",
    "gh repo create example",
    "gh api repos/example/example -X POST -f name=value",
    "npm publish",
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
    "gh secret list",
    "git config --get remote.origin.url",
    "npm run check",
    "npm run --silent source:wa-lws:canary -- --help",
  ];
  for (const command of allowedCommands) {
    assert.equal(
      evaluateShellCommand(command, closedRoadmap).blocked,
      false,
      command,
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
  const invoke = (command) =>
    spawnSync(process.execPath, [hookRunner], {
      cwd: projectRoot,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: "PreToolUse",
        cwd: projectRoot,
        tool_name: "Bash",
        tool_input: { command },
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
});
