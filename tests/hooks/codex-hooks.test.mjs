import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
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
  isObserverAddOperation,
  normalizeRepositoryPath,
  observerAuthoringEvidenceIsValid,
  observerCustodyContract,
  observerParentDirectoriesAreCanonical,
  observerPostAddCustodyIsValid,
  observerPreAddCustodyIsValid,
  observerRoadmapAuthority,
  observerTrustInputsMatchHead,
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

const observerWorkItemId = "PNW-05-SOURCE-AUTHORITY-PORTFOLIO-DISCOVERY";
const observerGateId = "G-PNW-05-REAL-SOURCE-PRERELEASE";
const observerPath =
  "generated-data/real-source-prerelease/observe-source-authority-portfolio.mjs";
const observerDirectory = "generated-data/real-source-prerelease";
const historicalNames = [
  "authority-input-v2.json",
  "authority-graph-v2.json",
  "FR-D3.attempt",
  "FR-D3.receipt.json",
  "FR-R6.attempt",
  "FR-R6.receipt.json",
  "FR-R7.attempt",
  "FR-R7.receipt.json",
];
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

const initializeObserverFixture = () => {
  const root = mkdtempSync(
    path.join(tmpdir(), "policy-sentinel-portfolio-hook-"),
  );
  runGit(root, ["init", "--quiet"]);
  runGit(root, ["config", "core.autocrlf", "false"]);
  runGit(root, ["config", "user.name", "Policy Sentinel Test"]);
  runGit(root, [
    "config",
    "user.email",
    "policy-sentinel-test@example.invalid",
  ]);
  for (const repositoryPath of observerCustodyContract.trustPaths) {
    const absolutePath = path.join(root, ...repositoryPath.split("/"));
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(
      absolutePath,
      repositoryPath === ".gitignore"
        ? "generated-data/\n"
        : `trusted fixture for ${repositoryPath}\n`,
      "utf8",
    );
  }
  runGit(root, ["add", "--", ...observerCustodyContract.trustPaths]);
  runGit(root, ["commit", "--quiet", "--message", "fixture root"]);

  const historicalCustody = historicalNames.map((name, index) => {
    const contents = Buffer.from(`historical-${index}-${name}\n`, "utf8");
    const absolutePath = path.join(root, observerDirectory, name);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents);
    return Object.freeze({
      name,
      bytes: contents.byteLength,
      sha256: createHash("sha256").update(contents).digest("hex"),
    });
  });
  return { historicalCustody, root };
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
  assert.equal(
    extractPatchOperations(command, "I:\\policy-sentinel")[0].headerPath,
    String.raw` I:\policy-sentinel\ROADMAP.yaml`,
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

test("portfolio observer policy freezes the exact target and 37 reserved names", () => {
  const expectedReservedPaths = [
    `${observerDirectory}/PF-PORTFOLIO-RUN.attempt`,
    ...Array.from({ length: 17 }, (_, index) =>
      String(index + 1).padStart(2, "0"),
    ).flatMap((suffix) => [
      `${observerDirectory}/PF-${suffix}.attempt`,
      `${observerDirectory}/PF-${suffix}.receipt.json`,
    ]),
    `${observerDirectory}/FR-A1.attempt`,
    `${observerDirectory}/FR-A1.receipt.json`,
  ];
  assert.equal(observerCustodyContract.observerPath, observerPath);
  assert.deepEqual(observerCustodyContract.historical, [
    {
      name: "authority-input-v2.json",
      bytes: 2_503,
      sha256:
        "f2ec15b838d9402478a64bd1d5b366001120af4b82f1b52aed463fbe717aa8a4",
    },
    {
      name: "authority-graph-v2.json",
      bytes: 19_844,
      sha256:
        "15059000ff3817a6d5df5c8f8d5642aa1cd51042b15028aca26991cc3a6d6cad",
    },
    {
      name: "FR-D3.attempt",
      bytes: 462,
      sha256:
        "5d75db276f07ce0811022778e3852a99512c2b8866bc93262c3519d730848068",
    },
    {
      name: "FR-D3.receipt.json",
      bytes: 1_103,
      sha256:
        "f58ca7aa9d789c8d804e593e327ae1ca3ad1f44402ae127253ced01bc6e492f6",
    },
    {
      name: "FR-R6.attempt",
      bytes: 462,
      sha256:
        "69b8db8228af680b43050ce1193f349eb70fc9d2a3454f46c0b4c997a57b400d",
    },
    {
      name: "FR-R6.receipt.json",
      bytes: 1_093,
      sha256:
        "093ca14e300c59a1462ff0e71d65131463be15e4a57fadb672d56cdc3cbc770b",
    },
    {
      name: "FR-R7.attempt",
      bytes: 462,
      sha256:
        "eac7bc42975de100326110fa2ae75317981e9fc687adec3bb480fba21931712e",
    },
    {
      name: "FR-R7.receipt.json",
      bytes: 1_075,
      sha256:
        "e9db0fedaca0b558ca92797451c474dbe069c05b86359a7dfacffaac282435ad",
    },
  ]);
  assert.deepEqual(
    observerCustodyContract.reservedPaths,
    expectedReservedPaths,
  );
  assert.equal(observerCustodyContract.reservedPaths.length, 37);
  assert.deepEqual(observerCustodyContract.trustPaths, [
    ".codex/hooks.json",
    ".gitignore",
    "ROADMAP.yaml",
    "docs/development/PNW-05-REAL-SOURCE-PRERELEASE-COORDINATION-2026-09-03.md",
    "scripts/codex-hooks.mjs",
    "tests/hooks/codex-hooks.test.mjs",
  ]);
});

test("observer authoring requires the sole active item and exact gate", () => {
  const authorized = observerRoadmap();
  assert.equal(observerRoadmapAuthority(authorized), true);
  assert.equal(
    observerAuthoringEvidenceIsValid({
      roadmap: authorized,
      roadmapValid: true,
      trustInputsMatchHead: true,
      custodyValid: true,
    }),
    true,
  );
  for (const falseEvidence of [
    { roadmapValid: false },
    { trustInputsMatchHead: false },
    { custodyValid: false },
  ]) {
    assert.equal(
      observerAuthoringEvidenceIsValid({
        roadmap: authorized,
        roadmapValid: true,
        trustInputsMatchHead: true,
        custodyValid: true,
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
  const secondActiveItem = observerRoadmap();
  secondActiveItem.work_items.push({
    id: "OTHER",
    status: "in_progress",
  });
  invalidRoadmaps.push(secondActiveItem);

  for (const roadmap of invalidRoadmaps) {
    assert.equal(observerRoadmapAuthority(roadmap), false);
  }
});

test("observer trust inputs are canonical committed HEAD bytes", (t) => {
  const { root } = initializeObserverFixture();
  try {
    assert.equal(observerTrustInputsMatchHead(root), true);
    assert.equal(observerParentDirectoriesAreCanonical(root), true);
    for (const repositoryPath of observerCustodyContract.trustPaths) {
      const absolutePath = path.join(root, ...repositoryPath.split("/"));
      const original = readFileSync(absolutePath);
      writeFileSync(absolutePath, Buffer.concat([original, Buffer.from("x")]));
      assert.equal(observerTrustInputsMatchHead(root), false, repositoryPath);
      writeFileSync(absolutePath, original);
      assert.equal(observerTrustInputsMatchHead(root), true, repositoryPath);
    }

    const trustPath = path.join(root, "scripts", "codex-hooks.mjs");
    const hardLinkAlias = path.join(root, "trust-hardlink-alias");
    try {
      linkSync(trustPath, hardLinkAlias);
      assert.equal(observerTrustInputsMatchHead(root), false);
      rmSync(hardLinkAlias);
      assert.equal(observerTrustInputsMatchHead(root), true);
    } catch (error) {
      if (!["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
        throw error;
      }
      t.diagnostic("trust hard-link regression unavailable on this host");
    }

    const flaggedRepositoryPath = "scripts/codex-hooks.mjs";
    const flaggedAbsolutePath = path.join(
      root,
      ...flaggedRepositoryPath.split("/"),
    );
    const flaggedOriginal = readFileSync(flaggedAbsolutePath);
    runGit(root, ["update-index", "--assume-unchanged", flaggedRepositoryPath]);
    try {
      writeFileSync(
        flaggedAbsolutePath,
        Buffer.concat([flaggedOriginal, Buffer.from("assume-unchanged\n")]),
      );
      assert.equal(
        observerTrustInputsMatchHead(root),
        false,
        "assume-unchanged may not conceal changed trust bytes",
      );
    } finally {
      writeFileSync(flaggedAbsolutePath, flaggedOriginal);
      runGit(root, [
        "update-index",
        "--no-assume-unchanged",
        flaggedRepositoryPath,
      ]);
    }
    assert.equal(observerTrustInputsMatchHead(root), true);

    runGit(root, ["update-index", "--skip-worktree", flaggedRepositoryPath]);
    try {
      writeFileSync(
        flaggedAbsolutePath,
        Buffer.concat([flaggedOriginal, Buffer.from("skip-worktree\n")]),
      );
      assert.equal(
        observerTrustInputsMatchHead(root),
        false,
        "skip-worktree may not conceal changed trust bytes",
      );
    } finally {
      writeFileSync(flaggedAbsolutePath, flaggedOriginal);
      runGit(root, [
        "update-index",
        "--no-skip-worktree",
        flaggedRepositoryPath,
      ]);
    }
    assert.equal(observerTrustInputsMatchHead(root), true);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("observer pre-Add custody rejects every reserved name and changed history", (t) => {
  const { historicalCustody, root } = initializeObserverFixture();
  try {
    assert.equal(
      observerPreAddCustodyIsValid(root, { historicalCustody }),
      true,
    );
    assert.equal(
      observerPostAddCustodyIsValid(root, { historicalCustody }),
      false,
    );

    for (const repositoryPath of observerCustodyContract.reservedPaths) {
      const absolutePath = path.join(root, ...repositoryPath.split("/"));
      writeFileSync(absolutePath, "reserved\n", "utf8");
      assert.equal(
        observerPreAddCustodyIsValid(root, { historicalCustody }),
        false,
        repositoryPath,
      );
      rmSync(absolutePath);
    }

    for (const { name } of historicalCustody) {
      const absolutePath = path.join(root, observerDirectory, name);
      const original = readFileSync(absolutePath);
      const changed = Buffer.from(original);
      changed[0] = changed[0] === 0x78 ? 0x79 : 0x78;
      writeFileSync(absolutePath, changed);
      assert.equal(
        observerPreAddCustodyIsValid(root, { historicalCustody }),
        false,
        name,
      );
      writeFileSync(absolutePath, original);
    }

    const boundedHistoryPath = path.join(
      root,
      observerDirectory,
      historicalCustody[0].name,
    );
    const boundedHistoryOriginal = readFileSync(boundedHistoryPath);
    writeFileSync(boundedHistoryPath, Buffer.alloc(1024 * 1024, 0x78));
    assert.equal(
      observerPreAddCustodyIsValid(root, { historicalCustody }),
      false,
      "oversized historical custody must be rejected before reading",
    );
    writeFileSync(boundedHistoryPath, boundedHistoryOriginal);

    const symlinkTarget = path.join(root, "historical-symlink-target");
    writeFileSync(symlinkTarget, boundedHistoryOriginal);
    rmSync(boundedHistoryPath);
    try {
      symlinkSync(symlinkTarget, boundedHistoryPath, "file");
      assert.equal(
        observerPreAddCustodyIsValid(root, { historicalCustody }),
        false,
        "historical symlinks must be rejected without following their bytes",
      );
    } catch (error) {
      if (!["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
        throw error;
      }
      t.diagnostic("historical symlink regression unavailable on this host");
    } finally {
      rmSync(boundedHistoryPath, { force: true });
      writeFileSync(boundedHistoryPath, boundedHistoryOriginal);
      rmSync(symlinkTarget, { force: true });
    }

    const caseAliasReserved = path.join(
      root,
      observerDirectory,
      "pf-01.attempt",
    );
    writeFileSync(caseAliasReserved, "reserved case alias\n", "utf8");
    assert.equal(
      observerPreAddCustodyIsValid(root, { historicalCustody }),
      false,
      "case aliases of reserved custody must fail closed",
    );
    rmSync(caseAliasReserved);

    const extraPath = path.join(root, observerDirectory, "unexpected.json");
    writeFileSync(extraPath, "unexpected\n", "utf8");
    assert.equal(
      observerPreAddCustodyIsValid(root, { historicalCustody }),
      false,
    );
    rmSync(extraPath);

    const hardLinkedHistory = path.join(
      root,
      observerDirectory,
      historicalCustody[0].name,
    );
    const hardLinkAlias = path.join(root, "historical-hardlink-alias");
    try {
      linkSync(hardLinkedHistory, hardLinkAlias);
      assert.equal(
        observerPreAddCustodyIsValid(root, { historicalCustody }),
        false,
      );
      rmSync(hardLinkAlias);
    } catch (error) {
      if (!["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
        throw error;
      }
      t.diagnostic("historical hard-link regression unavailable on this host");
    }

    const reservedDirectory = path.join(
      root,
      ...observerCustodyContract.reservedPaths[0].split("/"),
    );
    mkdirSync(reservedDirectory);
    assert.equal(
      observerPreAddCustodyIsValid(root, { historicalCustody }),
      false,
    );
    rmSync(reservedDirectory, { recursive: true });

    const danglingReserved = path.join(
      root,
      ...observerCustodyContract.reservedPaths[1].split("/"),
    );
    try {
      symlinkSync("missing-reserved-entry", danglingReserved, "file");
      assert.equal(existsSync(danglingReserved), false);
      assert.equal(
        observerPreAddCustodyIsValid(root, { historicalCustody }),
        false,
      );
      rmSync(danglingReserved);
    } catch (error) {
      if (!["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
        throw error;
      }
      t.diagnostic("dangling-symlink regression unavailable on this host");
    }
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("observer post-Add custody is exact, root-ignored, and untracked", () => {
  const { historicalCustody, root } = initializeObserverFixture();
  const absoluteObserverPath = path.join(root, ...observerPath.split("/"));
  try {
    writeFileSync(absoluteObserverPath, "export {};\n", "utf8");
    assert.equal(
      observerPreAddCustodyIsValid(root, { historicalCustody }),
      false,
    );
    assert.equal(
      observerPostAddCustodyIsValid(root, { historicalCustody }),
      true,
    );

    runGit(root, ["add", "--force", observerPath]);
    assert.equal(
      observerPostAddCustodyIsValid(root, { historicalCustody }),
      false,
    );
    runGit(root, ["commit", "--quiet", "--message", "track observer"]);
    rmSync(absoluteObserverPath);
    assert.equal(
      observerPreAddCustodyIsValid(root, { historicalCustody }),
      false,
      "an absent working leaf still fails when index or HEAD tracks the path",
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("observer ignore provenance cannot come from the repository exclude", () => {
  const { historicalCustody, root } = initializeObserverFixture();
  try {
    writeFileSync(path.join(root, ".gitignore"), "", "utf8");
    writeFileSync(
      path.join(root, ".git", "info", "exclude"),
      "generated-data/\n",
      "utf8",
    );
    assert.equal(
      observerPreAddCustodyIsValid(root, { historicalCustody }),
      false,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("observer apply_patch exception is Add-only, exact, and fail-closed", () => {
  const operation = (header) =>
    extractPatchOperations(`*** Begin Patch\n${header}\n*** End Patch`);
  const exactAdd = operation(`*** Add File: ${observerPath}`);
  assert.equal(isObserverAddOperation(exactAdd), true);
  assert.equal(
    evaluatePatchOperations(exactAdd, observerRoadmap(), projectRoot, {
      authorizeObserverAdd: () => true,
    }).blocked,
    false,
  );
  assert.equal(
    evaluatePatchOperations(exactAdd, observerRoadmap(), projectRoot, {
      authorizeObserverAdd: () => false,
    }).blocked,
    true,
  );

  for (const header of [
    `*** Update File: ${observerPath}`,
    `*** Delete File: ${observerPath}`,
    `*** Move to: ${observerPath}`,
    "*** Update File: generated-data/real-source-prerelease/authority-graph-v2.json",
    "*** Add File: generated-data/real-source-prerelease/observe-source-authority-portfolio.js",
    "*** Add File: Generated-data/real-source-prerelease/observe-source-authority-portfolio.mjs",
    "*** Add File: docs/../generated-data/real-source-prerelease/observe-source-authority-portfolio.mjs",
    "*** Add File: ./generated-data/real-source-prerelease/observe-source-authority-portfolio.mjs",
    "*** Add File: generated-data//real-source-prerelease/observe-source-authority-portfolio.mjs",
    "*** Add File: generated-data/real-source-prerelease/observe-source-authority-portfolio.mjs:stream",
    "*** Add File: generated-data/real-source-prerelease/OBSERV~1.MJS",
    "*** Add File: GENERAT~1/real-source-prerelease/observe-source-authority-portfolio.mjs",
    "*** Add File: GENERAT~1/REAL-S~1/OBSERV~1.MJS",
    "*** Add File: private/observe-source-authority-portfolio.mjs",
    "*** Add File: generated-data/real-source-prerelease/observe-source-authority-portfolio-copy.mjs",
    String.raw`*** Add File: generated-data\real-source-prerelease\observe-source-authority-portfolio.mjs`,
    String.raw`*** Add File: I:\policy-sentinel\generated-data\real-source-prerelease\observe-source-authority-portfolio.mjs`,
    `*** Add File: "${observerPath}"`,
    `*** Add File:  ${observerPath}`,
    `*** Add File: ${observerPath} `,
  ]) {
    const variantOperations = operation(header);
    assert.equal(isObserverAddOperation(variantOperations), false, header);
    assert.equal(
      evaluatePatchOperations(
        variantOperations,
        observerRoadmap(),
        projectRoot,
        {
          authorizeObserverAdd: () => true,
        },
      ).blocked,
      true,
      header,
    );
  }

  const mixed = extractPatchOperations(
    `*** Begin Patch\n*** Add File: ${observerPath}\n*** Update File: README.md\n*** End Patch`,
  );
  assert.equal(
    evaluatePatchOperations(mixed, observerRoadmap(), projectRoot, {
      authorizeObserverAdd: () => true,
    }).blocked,
    true,
  );
  assert.equal(
    evaluatePatchOperations([], observerRoadmap(), projectRoot).blocked,
    true,
  );

  const inactive = observerRoadmap();
  inactive.work_items.at(-1).status = "ready";
  assert.equal(
    evaluatePatchOperations(exactAdd, inactive, projectRoot).blocked,
    true,
  );

  const missingParentsRoot = mkdtempSync(
    path.join(tmpdir(), "policy-sentinel-hook-missing-parent-"),
  );
  try {
    assert.equal(
      observerParentDirectoriesAreCanonical(missingParentsRoot),
      false,
    );
    assert.equal(
      evaluatePatchOperations(exactAdd, observerRoadmap(), missingParentsRoot, {
        authorizeObserverAdd: () => true,
      }).blocked,
      true,
    );

    const generatedParent = path.join(missingParentsRoot, "generated-data");
    const junctionTarget = path.join(missingParentsRoot, "junction-target");
    mkdirSync(generatedParent);
    mkdirSync(junctionTarget);
    try {
      symlinkSync(
        junctionTarget,
        path.join(generatedParent, "real-source-prerelease"),
        "junction",
      );
      assert.equal(
        observerParentDirectoriesAreCanonical(missingParentsRoot),
        false,
      );
    } catch (error) {
      if (!["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
        throw error;
      }
    }
  } finally {
    rmSync(missingParentsRoot, { force: true, recursive: true });
  }

  assert.equal(
    isObserverAddOperation(operation(`*** Update File: ${observerPath}`)),
    false,
  );
  assert.equal(isObserverAddOperation(mixed), false);
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
