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
  realpathSync,
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
  evaluateShellCommand,
  extractPatchOperations,
  extractPatchPaths,
  handleHookEvent,
  isObserverAddOperation,
  normalizeRepositoryPath,
  observerCustodyContract,
  observerExecutionCustodyIsValid,
  observerExecutionEvidenceIsValid,
  observerParentDirectoriesAreCanonical,
  observerPostAddCustodyIsValid,
  observerPreAddCustodyIsValid,
  observerRoadmapAuthority,
  observerTerminalCustodyIsValid,
  observerTrustInputsMatchHead,
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
  'cmd.exe /d /s /c "for /f "delims=" %R in (\'git rev-parse --show-toplevel\') do @node "%R\\scripts\\codex-hooks.mjs""';
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

const initializeShellFixture = (t, { git = false } = {}) => {
  const root = realpathSync.native(
    mkdtempSync(path.join(tmpdir(), "policy-sentinel-shell-hook-")),
  );
  t.after(() => rmSync(root, { force: true, recursive: true }));
  for (const [repositoryPath, contents] of Object.entries({
    "ROADMAP.yaml": JSON.stringify(closedRoadmap),
    "README.md": "Synthetic hook test repository.\n",
    ".codex/hooks.json": "{}\n",
    "docs/00-READ-FIRST.md": "Synthetic protected owner-input path.\n",
    "docs/vision/k0-lifecycle-contract.md": "Synthetic frozen evidence.\n",
    "generated-data/real-source-prerelease/PF-01.receipt.json":
      '{"synthetic":true}\n',
  })) {
    const absolutePath = path.join(root, ...repositoryPath.split("/"));
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents, "utf8");
  }
  const nestedPackage = path.join(root, "node_modules", "synthetic-package");
  mkdirSync(nestedPackage, { recursive: true });
  if (git) {
    runGit(root, ["init", "--quiet"]);
  }
  return { root, nestedPackage };
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

const calculateFixturePostRunCustody = (root) => {
  const directory = path.join(root, observerDirectory);
  const names = Array.from(
    new Set(
      historicalNames.filter((name) => existsSync(path.join(directory, name))),
    ),
  ).sort();
  let totalBytes = 0;
  const manifest = Buffer.from(
    names
      .map((name) => {
        const contents = readFileSync(path.join(directory, name));
        totalBytes += contents.byteLength;
        return `${observerDirectory}/${name}\t${contents.byteLength}\t${createHash("sha256").update(contents).digest("hex")}\n`;
      })
      .join(""),
    "utf8",
  );
  return {
    fileCount: names.length,
    totalBytes,
    manifestBytes: manifest.byteLength,
    manifestSha256: createHash("sha256").update(manifest).digest("hex"),
  };
};

test("hooks.json installs only recovery and narrow pre-tool guardrails", () => {
  assert.deepEqual(Object.keys(hookConfig.hooks).sort(), [
    "PreToolUse",
    "SessionStart",
  ]);
  assert.equal(
    hookConfig.hooks.PreToolUse[0].matcher,
    "^(Bash|exec_command|apply_patch)$",
  );
  assert.equal(
    hookConfig.hooks.SessionStart[0].matcher,
    "^(startup|resume|clear|compact)$",
  );
  assert.equal(
    hookConfig.hooks.SessionStart[0].hooks[0].additionalContextLimit,
    1400,
  );

  for (const groups of Object.values(hookConfig.hooks)) {
    assert.equal(groups.length, 1);
    assert.equal(groups[0].hooks.length, 1);
    const handler = groups[0].hooks[0];
    assert.equal(handler.type, "command");
    assert.equal(handler.async, undefined);
    assert.equal(handler.command, posixHookCommand);
    assert.equal(handler.commandWindows, windowsHookCommand);
    assert.doesNotMatch(handler.commandWindows, /\\"/u);
    assert.doesNotMatch(
      `${handler.command} ${handler.commandWindows}`,
      /(?:curl|invoke-webrequest|npm|powershell|transcript|notify|webhook)/iu,
    );
  }
  assert.doesNotMatch(
    readFileSync(hookRunner, "utf8"),
    /--self-test-no-network/u,
    "live hooks must not execute unapproved ignored observer code",
  );
});

test(
  "parsed Windows hook launcher reaches Node from a nested session cwd",
  { skip: process.platform !== "win32" },
  () => {
    const handler = hookConfig.hooks.PreToolUse[0].hooks[0];
    const nestedCwd = path.join(projectRoot, "docs");
    for (const denied of [false, true]) {
      const result = spawnSync(handler.commandWindows, {
        cwd: nestedCwd,
        encoding: "utf8",
        input: JSON.stringify({
          hook_event_name: "PreToolUse",
          cwd: nestedCwd,
          tool_name: "exec_command",
          tool_input: {
            cmd: `C:\\Progra~1\\PowerShell\\7\\pwsh.exe -NoLogo -NoProfile -EncodedCommand ${Buffer.from(denied ? "curl --version" : "git status --short", "utf16le").toString("base64")}`,
            workdir: projectRoot,
          },
        }),
        shell: true,
        timeout: 30_000,
        windowsHide: true,
      });

      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.signal, null);
      assert.equal(result.stderr, "");
      if (denied) {
        const output = JSON.parse(result.stdout).hookSpecificOutput;
        assert.equal(output.hookEventName, "PreToolUse");
        assert.equal(output.permissionDecision, "deny");
        assert.match(output.permissionDecisionReason, /network/iu);
      } else {
        assert.equal(result.stdout, "");
      }
    }
  },
);

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

test("every committed Bash deny form has a finite production-matcher regression", async (t) => {
  const settings = JSON.parse(
    readFileSync(path.join(projectRoot, ".claude", "settings.json"), "utf8"),
  );
  const committedRules = settings.permissions.deny.filter((rule) =>
    rule.startsWith("Bash("),
  );
  // These are command strings sent only to the production matcher, never a shell.
  // Keep the keys explicit so a new or changed committed deny rule fails coverage.
  const matrix = {
    "Bash(git remote *)": [
      "git remote -v",
      "git remote add origin https://example.invalid/repository.git",
    ],
    "Bash(git tag *)": ["git tag --list", "git tag checkpoint"],
    "Bash(git push --fo*)": [
      "git push --force main",
      "git push --force-i origin main",
    ],
    "Bash(git push * --fo*)": [
      "git push origin --force main",
      "git push origin --force-with-lease main",
    ],
    "Bash(git push -f*)": ["git push -f origin main"],
    "Bash(git push * -f*)": ["git push origin -f main"],
    "Bash(git push -d*)": ["git push -d origin feature"],
    "Bash(git push * -d*)": ["git push origin -d feature"],
    "Bash(git push --del*)": [
      "git push --delete feature",
      "git push --del old-branch",
    ],
    "Bash(git push * --del*)": ["git push origin --delete feature"],
    "Bash(git push --al*)": ["git push --all origin"],
    "Bash(git push * --al*)": ["git push origin --all"],
    "Bash(git push --br*)": ["git push --branches origin"],
    "Bash(git push * --br*)": ["git push origin --branches"],
    "Bash(git push --mir*)": [
      "git push --mirror origin",
      "git push --mir origin",
    ],
    "Bash(git push * --mir*)": ["git push origin --mirror"],
    "Bash(git push --tag*)": ["git push --tags origin"],
    "Bash(git push * --tag*)": ["git push origin --tags"],
    "Bash(git push --fol*)": ["git push --follow-tags origin main"],
    "Bash(git push * --fol*)": ["git push origin --follow-tags main"],
    "Bash(git push --pru*)": [
      "git push --prune origin",
      "git push --pru origin",
    ],
    "Bash(git push * --pru*)": ["git push origin --prune"],
    "Bash(git push --no-veri*)": [
      "git push --no-verify origin main",
      "git push --no-veri origin main",
    ],
    "Bash(git push * --no-veri*)": ["git push origin --no-verify main"],
    "Bash(git push *+*)": ["git push origin +main:main"],
    "Bash(git push * :*)": ["git push origin :feature"],
    "Bash(git push *refs/tags/*)": ["git push origin refs/tags/v1.0.0"],
    "Bash(git branch -d *)": ["git branch -d feature"],
    "Bash(git branch -D *)": ["git branch -D feature"],
    "Bash(git branch --delete *)": ["git branch --delete feature"],
    "Bash(git rebase *)": ["git rebase --continue"],
    "Bash(git merge --abort*)": ["git merge --abort"],
    "Bash(git merge --quit*)": ["git merge --quit"],
    "Bash(git commit --no-verify*)": ["git commit --no-verify -m update"],
    "Bash(git commit --amend*)": [
      "git commit --amend",
      "git commit --amend --no-edit",
      "git commit --amend=no-edit",
    ],
    "Bash(git reset --hard*)": [
      "git reset --hard",
      "git reset --hard HEAD~1",
      "git reset --hard=HEAD",
    ],
    "Bash(git clean *)": ["git clean -ndx"],
    "Bash(git filter-branch *)": ["git filter-branch --all"],
    "Bash(gh repo create *)": ["gh repo create synthetic-repository"],
    "Bash(gh repo delete *)": ["gh repo delete example/synthetic-repository"],
    "Bash(gh pr comment *)": ["gh pr comment 1 --body update"],
    "Bash(gh pr close *)": ["gh pr close 1"],
    "Bash(gh pr edit *)": ["gh pr edit 1 --title update"],
    "Bash(gh pr ready *)": ["gh pr ready 1"],
    "Bash(gh pr reopen *)": ["gh pr reopen 1"],
    "Bash(gh pr review *)": ["gh pr review 1 --approve"],
    "Bash(gh pr lock *)": ["gh pr lock 1"],
    "Bash(gh pr unlock *)": ["gh pr unlock 1"],
    "Bash(gh pr update-branch *)": ["gh pr update-branch 1"],
    "Bash(gh pr merge *--admin*)": ["gh pr merge 1 --admin"],
    "Bash(gh pr merge *--delete-branch*)": ["gh pr merge 1 --delete-branch"],
    "Bash(gh release delete *)": ["gh release delete v1.0.0"],
    "Bash(gh release delete-asset *)": [
      "gh release delete-asset v1.0.0 asset.zip",
    ],
    "Bash(gh release upload *)": ["gh release upload v1.0.0 asset.zip"],
    "Bash(gh secret *)": ["gh secret list"],
    "Bash(gh api -X *)": [
      "gh api -X GET repos/atniclimate/policy-sentinel",
      "gh api -X POST repos/example/synthetic-repository",
    ],
    "Bash(gh api --method *)": [
      "gh api --method GET repos/atniclimate/policy-sentinel",
      "gh api --method PATCH repos/example/synthetic-repository",
    ],
    "Bash(curl *)": ["curl --version", "curl https://example.invalid/policy"],
    "Bash(wget *)": ["wget --version", "wget https://example.invalid/policy"],
    "Bash(Invoke-WebRequest *)": [
      "Invoke-WebRequest -Uri https://example.invalid/policy",
    ],
    "Bash(iwr *)": ["iwr https://example.invalid/policy"],
    "Bash(Invoke-RestMethod *)": [
      "Invoke-RestMethod -Uri https://example.invalid/policy",
    ],
    "Bash(irm *)": ["irm https://example.invalid/policy"],
    "Bash(rm -rf *)": ["rm -rf ./tmp/synthetic-output"],
    "Bash(Remove-Item * -Recurse*)": [
      "Remove-Item ./tmp/synthetic-output -Recurse",
      "Remove-Item ./tmp/synthetic-output -Recurse -Force",
      "Remove-Item ./tmp/synthetic-output -Recurse:$true",
    ],
  };
  assert.equal(committedRules.length, 65);
  assert.deepEqual(Object.keys(matrix).sort(), [...committedRules].sort());
  const { root } = initializeShellFixture(t);
  const context = { root, workdir: root };
  for (const [rule, commands] of Object.entries(matrix)) {
    await t.test(rule, () => {
      const pattern = new RegExp(
        `^${rule
          .slice(5, -1)
          .split("*")
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
          .join(".*")}$`,
        "u",
      );
      assert.ok(commands.length > 0, `${rule} requires a positive case`);
      for (const command of commands) {
        assert.match(command, pattern, `${command} must exercise ${rule}`);
        assert.equal(
          evaluateShellCommand(command, closedRoadmap, context).blocked,
          true,
          `${rule}: ${command}`,
        );
        assert.equal(
          evaluateShellCommand(
            `C:\\Progra~1\\PowerShell\\7\\pwsh.exe -NoLogo -NoProfile -EncodedCommand ${Buffer.from(command, "utf16le").toString("base64")}`,
            closedRoadmap,
            context,
          ).blocked,
          true,
          `encoded ${rule}: ${command}`,
        );
      }
      const literalControl = `Write-Output '${commands[0]}'`;
      assert.doesNotMatch(literalControl, pattern);
      assert.equal(
        evaluateShellCommand(literalControl, closedRoadmap, context).blocked,
        false,
        `quoted example must remain data: ${literalControl}`,
      );
    });
  }
  const ordinaryPushWithOptionValues = [
    "git push origin -ofoo main",
    "git push origin --push-option=--mir main",
    "git push --push-option=--del origin main",
    "git push origin --push-option=--pru main",
  ];
  for (const rule of committedRules.filter((candidate) =>
    candidate.includes("git push"),
  )) {
    const pattern = new RegExp(
      "^" +
        rule.slice(5, -1).replaceAll("+", "\\+").replaceAll("*", ".*") +
        "$",
      "u",
    );
    for (const command of ordinaryPushWithOptionValues) {
      assert.doesNotMatch(command, pattern, rule);
    }
  }
  for (const command of [
    "git status --short",
    "git push origin main",
    "git merge --no-ff feature",
    "gh pr create --title change --body text",
    "gh pr merge 123",
    "gh release create v1.0.0",
    "gh release edit v1.0.0 --title release",
    "gh workflow run release.yml",
    "gh run rerun 123",
    "npm publish --access public",
    'git commit -m "record --amend example"',
    'git commit -m "--amend documentation"',
    'git commit --message "--amend documentation"',
    'git commit --message="--amend documentation"',
    'git reset -- "--hard.txt"',
    "git push --dry-run origin main",
    "git push -ofoo origin main",
    "git push -voformat=diff origin main",
    "git push -o --delete origin main",
    "git push --push-option=--delete origin main",
    "git push --push-option --delete origin main",
    "git push --push-option=refs/tags/deploy-note origin main",
    "git push --push-option refs/tags/deploy-note origin main",
    "git push -orefs/tags/deploy-note origin main",
    "git push -o refs/tags/deploy-note origin main",
    "git push --push-o --force origin main",
    "git push --repo --mirror origin main",
    "git push --exec --mirror origin main",
    "git push --receive-pack --mirror origin main",
    "git push --recurse-submodules --mirror origin main",
    "git push --server-option --mirror origin main",
    'git log --grep="--hard"',
    "gh api repos/atniclimate/policy-sentinel",
    "npm run check",
    "Remove-Item -LiteralPath ./tmp/synthetic-output.txt",
    "rg --no-config -n 'git push' README.md",
  ]) {
    assert.equal(
      evaluateShellCommand(command, closedRoadmap, context).blocked,
      false,
      `permitted neighboring control: ${command}`,
    );
  }
});

test("direct Python writes preserve owner inputs while reads remain available", (t) => {
  const { root } = initializeShellFixture(t);
  const context = { root, workdir: root };
  for (const operation of [
    "open('docs/00-READ-FIRST.md', 'w').write('x')",
    "open('docs/00-READ-FIRST.md', mode='a').write('x')",
    "open('docs/00-READ-FIRST.md', 'r+').write('x')",
    "open('docs/00-READ-FIRST.md', 'xb').write(b'x')",
    "Path('docs/00-READ-FIRST.md').write_text('x')",
    "Path('docs/00-READ-FIRST.md').write_bytes(b'x')",
  ]) {
    assert.equal(
      evaluateShellCommand(`python -c "${operation}"`, closedRoadmap, context)
        .blocked,
      true,
      operation,
    );
  }
  for (const operation of [
    "open('docs/00-READ-FIRST.md', 'r').read()",
    "open('docs/00-READ-FIRST.md').read()",
    "Path('docs/00-READ-FIRST.md').read_text()",
    "open('scratch.txt', 'w').write('x')",
  ]) {
    assert.equal(
      evaluateShellCommand(`python -c "${operation}"`, closedRoadmap, context)
        .blocked,
      false,
      operation,
    );
  }
});

test("PreToolUse defers routine release actions and keeps other closed gates", (t) => {
  const { root: projectRoot } = initializeShellFixture(t);
  const shellContext = { root: projectRoot, workdir: projectRoot };
  const shellSyntaxCorpus = [
    'git commit "--amend"',
    'git commit -m "ordinary message" --amend',
    'git commit --message="ordinary message" --amend',
    'git reset "--hard"',
    "git push origin main",
    "git.exe push origin main",
    "git -C . push origin main",
    "/usr/bin/git push origin main",
    "GIT_OPTIONAL_LOCKS= git push origin main",
    "GIT_CONFIG_COUNT='1 2' git push origin main",
    'GIT_CONFIG_COUNT="1 2" /usr/bin/git reset --hard HEAD',
    "g`it push origin main",
    "g^it push origin main",
    'g""it push origin main',
    "g''it push origin main",
    "git status --short; git.exe push origin main",
    "git reset --hard HEAD~1",
    "git reset -- ROADMAP.yaml",
    "git restore --staged ROADMAP.yaml",
    "git rm --cached ROADMAP.yaml",
    "git stash push --all",
    "git checkout -- ROADMAP.yaml",
    "git checkout HEAD -- ROADMAP.yaml",
    "git add --force -- generated-data/real-source-prerelease/PF-01.receipt.json",
    "git add -f .",
    "git add --all",
    "git add ./",
    "git add -- :/",
    "git add *",
    "git add -u",
    "git add --update",
    "git add -N ROADMAP.yaml",
    "git add --intent-to-add ROADMAP.yaml",
    "git add --renormalize ROADMAP.yaml",
    "git add --pathspec-from-file=paths.txt",
    "git add -- docs",
    "git add -- docs/00-READ-FIRST.md",
    "git -C . add -- docs/00-READ-FIRST.md",
    "git -c core.autocrlf=false add -- docs/00-READ-FIRST.md",
    "git --no-pager add -- docs/00-READ-FIRST.md",
    "git --literal-pathspecs add -- docs/00-READ-FIRST.md",
    "git --exec-path=. add -- docs/00-READ-FIRST.md",
    "git stage -- docs/00-READ-FIRST.md",
    "command git add -- docs/00-READ-FIRST.md",
    '& "git" add -- docs/00-READ-FIRST.md',
    "& 'git.exe' stage -- docs/00-READ-FIRST.md",
    '& "C:\\Program Files\\Git\\cmd\\git.exe" add -- docs',
    "& (Get-Command git) add -- docs",
    "command env GIT_OPTIONAL_LOCKS=0 git add -- docs/00-READ-FIRST.md",
    "GIT_OPTIONAL_LOCKS=0 git add -- docs/00-READ-FIRST.md",
    "git add -- ROADMAP.yaml roadmap.yaml",
    "git update-index --assume-unchanged ROADMAP.yaml",
    "/usr/bin/git update-index --assume-unchanged ROADMAP.yaml",
    '"C:\\Program Files\\Git\\cmd\\git.exe" update-index --assume-unchanged ROADMAP.yaml',
    "git --exec-path=/usr/lib/git-core update-index --skip-worktree ROADMAP.yaml",
    "/usr/bin/git commit --amend",
    "git -C .. status --short",
    "git -C I:/outside-repository commit -m local",
    "git --git-dir I:/outside/gitmeta --work-tree I:/outside/work commit -m local",
    "git apply evidence.patch",
    "nice git add -- docs/00-READ-FIRST.md",
    'X="a b" git apply evidence.patch',
    "patch -p1 < evidence.patch",
    "/usr/bin/patch -p1 < evidence.patch",
    "C:\\tools\\patch.exe -p1 < evidence.patch",
    "busybox patch -p1 < evidence.patch",
    "apply_patch < evidence.patch",
    "apply_patch.bat < evidence.patch",
    "git remote add origin https://example.invalid/repo.git",
    "git config remote.origin.url https://example.invalid/repo.git",
    "gh auth login",
    "gh repo create example",
    "/usr/bin/gh repo create example",
    "GH_DEBUG=1 gh repo create example",
    "gh.exe repo create example",
    "gh api repos/example/example -X POST -f name=value",
    "gh secret list",
    "gh variable list",
    "gh auth token",
    "npm publish",
    "/usr/bin/npm publish",
    "npm.cmd publish",
    "npm token list",
    "npm run source:wa-lws:canary -- --execute --scenario yearly",
    "npm run --silent source:wa-lws:canary -- --help",
    "Send-MailMessage -To owner@example.invalid",
    "Remove-Item -LiteralPath generated-data/real-source-prerelease/PF-01.receipt.json",
    "Set-Content -LiteralPath generated-data/real-source-prerelease/observe-source-authority-portfolio.mjs -Value x",
    "Move-Item -LiteralPath generated-data/real-source-prerelease/PF-01.attempt -Destination generated-data/real-source-prerelease/x",
    "rm -- ./generated-data/real-source-prerelease/PF-02.receipt.json",
    String.raw`cmd.exe /d /c del generated-data\real-source-prerelease\PF-02.attempt`,
    String.raw`Remove-Item -LiteralPath I:\policy-sentinel\generated-data\real-source-prerelease\PF-03.receipt.json`,
    "Remove-Item -LiteralPath GENERAT~1/real-source-prerelease/PF-03.attempt",
    "Remove-Item -LiteralPath generated-data./real-source-prerelease/PF-03.attempt",
    "Remove-Item -Path generated-dat?/real-source-prerelease/PF-03.attempt",
    "Remove-Item -Path generated-*/real-source-prerelease/PF-03.attempt",
    "rm generat*-data/real-source-prerelease/PF-03.attempt",
    "tee g*/real-source-prerelease/PF-01.receipt.json",
    "sed -i s/x/y/ [g]enerated-data/real-source-prerelease/PF-01.receipt.json",
    `node -e "require('node:fs').writeFileSync('generated-data/real-source-prerelease/PF-04.receipt.json','x')"`,
    `node -e "require('node:fs').createWriteStream(require('glob').globSync('g*/real-source-prerelease/PF-01.receipt.json')[0])"`,
    "[System.IO.File]::WriteAllText('generated-data/real-source-prerelease/PF-05.receipt.json','x')",
    "[System.IO.File]::Delete('generated-data/real-source-prerelease/PF-05.receipt.json')",
    "[IO.File]::Delete(('gene'+'rated-data/real-source-prerelease/PF-01.receipt.json'))",
    "[IO.File]::WriteAllText(('gene'+'rated-data/real-source-prerelease/PF-01.receipt.json'),'x')",
    String.raw`cmd.exe /d /c copy /y source generated-data\real-source-prerelease\PF-06.receipt.json`,
    String.raw`cmd.exe /d /c xcopy /y source generated-data\real-source-prerelease\PF-06.receipt.json`,
    String.raw`cmd.exe /d /c md generated-data\real-source-prerelease\new`,
    "tee generated-data/real-source-prerelease/PF-07.receipt.json",
    "dd if=source of=generated-data/real-source-prerelease/PF-07.receipt.json",
    "sed -i s/x/y/ generated-data/real-source-prerelease/PF-08.receipt.json",
    `python -c "open('generated-data/real-source-prerelease/PF-08.receipt.json','w').write('x')"`,
    `python -c "__import__('os').remove('gene'+'rated-data/real-source-prerelease/PF-01.receipt.json')"`,
    `command env python -c "__import__('os').remove('gene'+'rated-data/real-source-prerelease/PF-01.receipt.json')"`,
    `/usr/bin/python -c "__import__('os').remove('gene'+'rated-data/real-source-prerelease/PF-01.receipt.json')"`,
    `node -e "require('node:fs').createWriteStream('generated-data/real-source-prerelease/PF-09.receipt.json')"`,
    "Set-Item -LiteralPath generated-data/real-source-prerelease/PF-09.receipt.json -Value x",
    "Set-Item -LiteralPath docs/00-READ-FIRST.md -Value x",
    "'x' | Export-Csv -Path docs/owner.csv",
    "Tee-Object -FilePath generated-data/real-source-prerelease/PF-10.receipt.json",
    "git diff --output=generated-data/real-source-prerelease/PF-01.receipt.json HEAD",
    `rg --pre "python -c __import__('os').remove('generated-data/real-source-prerelease/PF-02.receipt.json')" x generated-data/real-source-prerelease/PF-01.receipt.json`,
    "Get-Content generated-data/real-source-prerelease/PF-01.receipt.json\nRemove-Item generated-data/real-source-prerelease/PF-01.receipt.json",
    "git status -- generated-data/real-source-prerelease\ngit add -- generated-data/real-source-prerelease/PF-01.receipt.json",
    "git -c core.fsmonitor=evil status -- generated-data/real-source-prerelease",
    "Get-Content generated-data/real-source-prerelease/PF-01.receipt.json\r\n[IO.File]::Delete('generated-data/real-source-prerelease/PF-01.receipt.json')",
    `Get-Content "$(Remove-Item generated-data/real-source-prerelease/PF-01.receipt.json)"`,
    "Get-Content (Remove-Item generated-data/real-source-prerelease/PF-01.receipt.json)",
    "Get-Content `Remove-Item generated-data/real-source-prerelease/PF-01.receipt.json`",
    "Get-Content .env",
    "head secrets/token.txt",
    "Get-Content private/owner-input.json",
    "Get-Content raw-data/provider.json",
    "Get-Content Env:OPENAI_API_KEY",
    "gc Env:OPENAI_API_KEY",
    "env",
    "/usr/bin/printenv",
    "type I:/outside/credential.txt",
    "[IO.File]::ReadAllText('I:/outside/credential.txt')",
    "Get-Content generated-data/real-source-prerelease-evil/private.json",
    "Get-Content generated-data/not-real-source-prerelease/private.json",
    "Get-Content -LiteralPath generated-data/real-source-prerelease/PF-01.receipt.json I:/outside/credential.txt",
    "Write-Output ok; Get-Content -LiteralPath I:/outside/credential.txt",
    "Write-Output ok && gc I:/outside/credential.txt",
    `[Environment]::GetEnvironmentVariable('OPENAI_API_KEY')`,
    `Select-String -Pattern . -Path ('.e'+'nv')`,
    `Select-String -Pattern . -Path ('pri'+'vate/secret.txt')`,
    "awk 1 /etc/passwd",
    `([System.IO.FileInfo]('C:\\Windows\\win.ini')).OpenText().ReadToEnd()`,
    "/usr/bin/cat I:/outside/credential.txt",
    "/usr/bin/head ../outside/private.txt",
    "node --check I:/outside/private.js",
    "node --check ../outside/private.js",
    "rg -n secret I:/outside/credential.txt",
    "rg -n secret docs/../../outside/credential.txt",
    "git ls-remote https://example.invalid/repo.git",
    "git submodule update --init --recursive",
    "git send-email --to owner@example.invalid patch",
    "git grep --open-files-in-pager=evil pattern",
    "git grep --untracked --no-exclude-standard secret",
    "git config --get-regexp .*",
    "git config --get http.https://example.invalid/.extraheader",
    'git commit -m "$TOKEN"',
    'git commit -m "%TOKEN:~0,1%"',
    'git commit -m "!TOKEN!"',
    "git ls-files --others --ignored --exclude-standard",
    "git ls-files --others",
    "git ls-files --others --error-unmatch",
    "gh api -X GET user",
    "gh api --method GET notifications",
    "gh repo view example/private-repository",
    "gh auth status --hostname enterprise.internal",
    "gh api -X GET repos/atniclimate/policy-sentinel/collaborators",
    "gh api -X GET repos/atniclimate/policy-sentinel/invitations",
    "gh api -X GET repos/atniclimate/policy-sentinel/actions/variables",
    "gh api -X GET repos/atniclimate/policy-sentinel/../../../user",
    "git status \\; gh repo create example",
    "git status \\; Set-Item -LiteralPath docs/00-READ-FIRST.md -Value x",
    "git status (gh repo create example)",
    "rg -n x (gh repo create example)",
    "rg -n secret $HOME",
    "rg -n secret ~",
    "rg -n secret %USERPROFILE%",
    "rg -n . [g]enerated-data/real-source-prerelease/PF-01.receipt.json",
    "rg --glob=g*/** .",
    "rg --glob g*/** .",
    "rg --iglob=g*/** .",
    "rg -gg*/** .",
    "rg . g*/**",
    "rg -fprivate/x .",
    "rg -fsecrets/x .",
    "rg -fraw-data/x .",
    `Write-Output ok && & "C:\\Program Files\\nodejs\\node.exe" -e "require('node:fs')['un'+'linkSync']('gene'+'rated-data/real-source-prerelease/PF-01.receipt.json')"`,
    `if ($true) { & "C:\\Program Files\\nodejs\\node.exe" -e "require('node:fs').unlinkSync('gene'+'rated-data/real-source-prerelease/PF-01.receipt.json')" }`,
    `([System.IO.FileInfo]('gener'+'ated-data/real-source-prerelease/PF-01.receipt.json')).Delete()`,
  ];
  for (const command of shellSyntaxCorpus) {
    assert.equal(
      typeof evaluateShellCommand(command, closedRoadmap, shellContext).blocked,
      "boolean",
      command,
    );
  }

  const requiredBlockedCommands = [
    "git send-pack origin main",
    "git push --force origin main",
    "git push --force-with-lease origin main",
    "git push -f origin main",
    "git push --delete origin stale-branch",
    "git push origin +main:main",
    "git push origin :stale-branch",
    "git push --follow-tags origin main",
    "git push origin refs/tags/v1.0.0",
    "git push --mir origin",
    "git push --del origin old-branch",
    "git push --pru origin",
    "git push --all origin",
    "git push --br origin",
    "git push --tag origin",
    "git push --no-veri origin main",
    "git push -qf origin main",
    "git push -df origin main",
    "git push -qd origin stale-branch",
    "git branch -d stale-branch",
    "git branch -D stale-branch",
    "git branch --delete stale-branch",
    "git merge --abort",
    "git merge --quit",
    "git commit --no-verify -m message",
    "git tag -d v0.9.0",
    "git reset --hard HEAD~1",
    "git clean -fdx",
    "git commit --amend",
    "git update-index --assume-unchanged ROADMAP.yaml",
    "git add --all",
    "git add -- docs/00-READ-FIRST.md",
    "git remote add origin https://example.invalid/repo.git",
    "git fetch origin",
    "gh repo create example",
    "gh repo deploy-key add key.pub",
    "gh repo set-default other/repo",
    "gh pr comment 1 --body changed",
    "gh pr merge 123 --delete-branch",
    "gh pr merge 123 --admin",
    "gh release delete v1.0.0",
    "gh issue comment 1 --body changed",
    "gh gist create ROADMAP.yaml",
    "gh ssh-key add key.pub",
    "gh alias set surprise 'api repos/example/example -X DELETE'",
    "gh extension install example/extension",
    "gh api repos/example/example -X POST -f name=value",
    "gh api repos/example/example -XPOST",
    "gh secret list",
    "gh auth token",
    "npm deprecate example-package",
    "npm unpublish example-package@1.0.0",
    "npm token list",
    "npm login",
    "npm adduser",
    "npm logout",
    "npm access set mfa=publish",
    "npm access grant read-write org:team package",
    "npm access revoke org:team package",
    "npm owner add example package",
    "npm owner rm example package",
    "npm profile set fullname example",
    "npm dist-tag add package@1.0.0 latest",
    "npm dist-tag rm package latest",
    "npm config set //registry.npmjs.org/:_authToken secret",
    "npm config delete //registry.npmjs.org/:_authToken",
    "npm config set _auth secret",
    "npm config get //registry.npmjs.org/:_authToken",
    "npm config list",
    "npm run source:wa-lws:canary -- --execute --scenario yearly",
    "Send-MailMessage -To owner@example.invalid",
    "Get-Content Env:OPENAI_API_KEY",
    "Get-ChildItem Env:*TOKEN*",
    "Get-ChildItem Env:OPENAI_*",
    "Get-ChildItem Env:GH_*",
    "Get-ChildItem Env:*KEY*",
    "dir Env:OPENAI_*",
    "cmd.exe /c set",
    "cmd.exe /c set OPENAI",
    'bash -c "env"',
    "wsl printenv",
    "set | findstr TOKEN",
    "git commit -m $TOKEN",
    "git config url.https://evil.invalid/.insteadOf https://github.com/",
    "git config --global core.sshCommand evil",
    "git config credential.helper store",
    "git credential fill",
    "git credential approve",
    "git credential reject",
    "git credential-store get",
    "git config --get http.https://github.com/.extraheader",
    "git config --get credential.helper",
    "env",
    "Get-Content -LiteralPath C:/Users/example/.codex/config.toml",
    "Remove-Item -LiteralPath generated-data/real-source-prerelease/PF-01.receipt.json",
    "Set-Item -LiteralPath docs/00-READ-FIRST.md -Value x",
    "Remove-Item -Recurse docs",
    "Remove-Item docs/vision -Recurse",
    "Remove-Item docs/00*",
    "Move-Item docs docs-old",
    "robocopy docs docs-old /MOVE /E",
    "xcopy docs docs-old /E",
    "copy docs docs-old",
    "rni docs docs-old",
  ];
  for (const command of requiredBlockedCommands) {
    assert.equal(
      evaluateShellCommand(command, closedRoadmap, shellContext).blocked,
      true,
      command,
    );
  }

  const allowedCommands = [
    "git status --short",
    "git log -1 --oneline",
    "git add -- ROADMAP.yaml",
    "gh auth status",
    "gh repo view atniclimate/policy-sentinel",
    "gh api repos/atniclimate/policy-sentinel",
    "git config --get remote.origin.url",
    'git commit -m "local hook checkpoint"',
    "npm run check",
    'Write-Output "Never run git push"',
    'rg --no-config -n "git push" AGENTS.md',
    'rg --no-config -n "gh repo create" AGENTS.md',
    "rg --no-config --files",
    "Get-Content -LiteralPath ROADMAP.yaml",
    "cat ROADMAP.yaml",
    "Get-Content -LiteralPath generated-data/real-source-prerelease/PF-01.receipt.json",
    "Get-FileHash -LiteralPath generated-data/real-source-prerelease/PF-01.receipt.json",
    "Get-ChildItem -LiteralPath generated-data/real-source-prerelease",
    "git status --short -- generated-data/real-source-prerelease",
    "git ls-files --others --ignored --exclude-standard -- generated-data/real-source-prerelease",
    "node --version",
    'node -e "console.log(process.version)"',
    "npm ci",
    "npm run dev",
    "npm config get cache",
    "npm config get registry",
    "npm config set fund false",
    "npx prettier --check README.md",
    "pwsh -NoProfile -Command Get-Location",
    "wsl --status",
    "Get-Command node, npm, git, gh, codex, claude",
    "[Environment]::GetEnvironmentVariable('Path', 'Machine')",
    "Get-ChildItem Env:PATH",
    "cmd.exe /c set PATH",
    "rg -n -C 2 hook README.md",
    "git status --short; node --version",
    "git restore --staged ROADMAP.yaml",
    "git checkout -- ROADMAP.yaml",
    "git restore ROADMAP.yaml",
    "git stash push --all",
    "git log --all --grep add",
    "git diff -- docs/add-source.md",
    "git status --short -- docs/stage-plan.md",
    "git grep -n stage -- README.md",
    "git config --global core.longpaths true",
    "git config --get core.longpaths",
    "Copy-Item -LiteralPath C:/dev/example.txt -Destination ./example.txt",
    "Remove-Item -LiteralPath ./tmp/test-output.txt",
    "Remove-Item *.tmp",
    "Move-Item tmp tmp-old",
    "Get-Content -LiteralPath C:/dev/example/README.md",
    `Get-Content -LiteralPath ${projectRoot.replaceAll("\\", "/")}/.codex/hooks.json`,
  ];
  for (const command of allowedCommands) {
    assert.equal(
      evaluateShellCommand(command, closedRoadmap, shellContext).blocked,
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
      evaluateShellCommand(command, missingBoundaryRoadmap, shellContext)
        .blocked,
      true,
      `missing boundary must fail closed: ${command}`,
    );
  }
});

test("encoded PowerShell enforces policy through literal wrappers and fails closed", (t) => {
  const { root } = initializeShellFixture(t);
  const context = { root, workdir: root };
  const encode = (value) => Buffer.from(value, "utf16le").toString("base64");
  const encoded = (value) => `pwsh -NoProfile -EncodedCommand ${encode(value)}`;
  const deniedBodies = [
    "Remove-Item ./tmp/synthetic-output -Recurse",
    "Get-Content -LiteralPath .env",
    "Set-Content -LiteralPath docs/vision/k0-lifecycle-contract.md changed",
    "git add -- ROADMAP.yaml",
    "Get-Location; curl --version",
    encoded("curl --version"),
  ];
  const wrappers = [
    (payload) => `pwsh -e ${payload}`,
    (payload) => `powershell.exe -EC '${payload}'`,
    (payload) =>
      `"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -enc "${payload}"`,
    (payload) =>
      `& 'C:\\Program Files\\PowerShell\\7\\pwsh.exe' -EncodedCommand ${payload}`,
    (payload) => `cmd.exe /d /s /c "pwsh -EncodedCommand ${payload}"`,
    (payload) => `pwsh -Command "pwsh -EncodedCommand ${payload}"`,
  ];
  for (const body of deniedBodies) {
    for (const wrap of wrappers) {
      assert.equal(
        evaluateShellCommand(wrap(encode(body)), closedRoadmap, context)
          .blocked,
        true,
        wrap(body),
      );
    }
  }
  for (const body of [
    "Get-Location",
    'Write-Output "Unicode: café 🌧"',
    "git status --short",
    "Get-Content -LiteralPath generated-data/real-source-prerelease/PF-01.receipt.json",
    "Write-Output 'pwsh -EncodedCommand invalid'",
    encoded("Get-Location"),
  ]) {
    for (const wrap of wrappers) {
      assert.equal(
        evaluateShellCommand(wrap(encode(body)), closedRoadmap, context)
          .blocked,
        false,
        wrap(body),
      );
    }
  }
  let tooDeep = "Get-Location";
  for (let depth = 0; depth < 7; depth += 1) {
    tooDeep = encoded(tooDeep);
  }
  for (const command of [
    "pwsh -EncodedCommand",
    "pwsh -EncodedCommand $payload",
    "pwsh -EncodedCommand !!!!",
    "pwsh -EncodedCommand YQ==",
    `pwsh -EncodedCommand ${encode("\uD800")}`,
    encoded("\0"),
    encoded(" ".repeat(65_537)),
    `${encoded("Get-Location")} extra`,
    `Set-Alias p pwsh; p -EncodedCommand ${encode("curl --version")}`,
    `New-Alias p pwsh; p -enc ${encode("curl --version")}`,
    `$p='pwsh'; & $p -ec ${encode("curl --version")}`,
    tooDeep,
  ]) {
    const result = evaluateShellCommand(command, closedRoadmap, context);
    assert.equal(result.blocked, true);
    assert.match(result.reason, /cannot be inspected/u);
  }
  assert.equal(
    evaluateShellCommand(
      "Write-Output 'pwsh -EncodedCommand invalid'",
      closedRoadmap,
      context,
    ).blocked,
    false,
  );
});

test("shell workdirs protect sensitive custody without blocking external reads", (t) => {
  const { root: projectRoot, nestedPackage } = initializeShellFixture(t);
  const sensitiveWorkdir = path.join(
    projectRoot,
    "generated-data",
    "real-source-prerelease",
  );
  const relativeWriter = `python -c "open('PF-01.receipt.json','w').write('x')"`;
  const workdirs = [
    "generated-data/real-source-prerelease",
    sensitiveWorkdir,
    sensitiveWorkdir.toUpperCase(),
    `${projectRoot}/generated-data/../generated-data/real-source-prerelease`,
    path.join(projectRoot, "missing-workdir"),
  ];
  for (const workdir of workdirs) {
    assert.equal(
      evaluateShellCommand(relativeWriter, closedRoadmap, {
        root: projectRoot,
        workdir,
      }).blocked,
      true,
      workdir,
    );
  }
  assert.equal(
    evaluateShellCommand(
      "Get-Content -LiteralPath PF-01.receipt.json",
      closedRoadmap,
      { root: projectRoot, workdir: sensitiveWorkdir },
    ).blocked,
    false,
  );
  assert.equal(
    evaluateShellCommand(
      "Get-Content I:/outside/credential.txt",
      closedRoadmap,
      { root: projectRoot, workdir: sensitiveWorkdir },
    ).blocked,
    true,
  );
  assert.equal(
    evaluateShellCommand(
      "Get-Content -LiteralPath ROADMAP.yaml",
      closedRoadmap,
      {
        root: projectRoot,
        workdir: path.dirname(projectRoot),
      },
    ).blocked,
    false,
  );
  assert.equal(
    evaluateShellCommand(relativeWriter, closedRoadmap, {
      root: projectRoot,
      workdir: path.dirname(projectRoot),
    }).blocked,
    false,
    "the repository hook leaves external write scope to the Codex permission profile",
  );
  assert.equal(
    evaluateShellCommand(
      "Get-Content -LiteralPath config.toml",
      closedRoadmap,
      {
        root: projectRoot,
        workdir: path.join(path.dirname(projectRoot), ".codex"),
      },
    ).blocked,
    true,
    "relative access from an external credential directory remains blocked",
  );
  const absoluteRoot = projectRoot.replaceAll("\\", "/");
  for (const command of [
    `Remove-Item -Recurse ${absoluteRoot}/docs`,
    `Move-Item ${absoluteRoot}/docs C:/dev/docs-old`,
    `Copy-Item ${absoluteRoot}/docs C:/dev/docs-copy -Recurse`,
    `Remove-Item ${absoluteRoot}/docs/00*`,
  ]) {
    assert.equal(
      evaluateShellCommand(command, closedRoadmap, {
        root: projectRoot,
        workdir: path.dirname(projectRoot),
      }).blocked,
      true,
      `absolute protected repository target must remain blocked from an external workdir: ${command}`,
    );
  }
  assert.equal(
    evaluateShellCommand("git add -- ROADMAP.yaml", closedRoadmap, {
      root: projectRoot,
      workdir: path.join(projectRoot, "docs"),
    }).blocked,
    true,
  );
  assert.equal(
    evaluateShellCommand("npm test", closedRoadmap, {
      root: projectRoot,
      workdir: nestedPackage,
    }).blocked,
    false,
  );

  const root = mkdtempSync(path.join(tmpdir(), "policy-sentinel-workdir-"));
  const sensitiveTarget = path.join(root, "generated-data", "evidence");
  const alias = path.join(root, "alias");
  try {
    mkdirSync(sensitiveTarget, { recursive: true });
    try {
      symlinkSync(sensitiveTarget, alias, "junction");
      assert.equal(
        evaluateShellCommand(relativeWriter, closedRoadmap, {
          root,
          workdir: alias,
        }).blocked,
        true,
      );
    } catch (error) {
      if (!["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
        throw error;
      }
      t.diagnostic("workdir junction regression unavailable on this host");
    }
  } finally {
    rmSync(root, { force: true, recursive: true });
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
  for (const ownerInputPath of [
    "docs/00-READ-FIRST.md",
    "docs/POLICY-SENTINEL-REAL-SOURCE-PRERELEASE-MAX-LONG-RUN.md",
  ]) {
    assert.equal(
      evaluatePatchPaths([ownerInputPath], closedRoadmap).blocked,
      true,
      ownerInputPath,
    );
    assert.equal(
      evaluatePatchOperations(
        [
          {
            action: "Update",
            headerPath: ` ${ownerInputPath}`,
            rawPath: ownerInputPath,
            repositoryPath: ownerInputPath,
          },
        ],
        closedRoadmap,
        projectRoot,
      ).blocked,
      true,
      ownerInputPath,
    );
  }

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

test("portfolio observer policy binds the terminal evidence checkpoint", () => {
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
  assert.equal(observerCustodyContract.phase, "terminal_evidence_frozen");
  assert.equal(observerCustodyContract.observerPath, observerPath);
  assert.deepEqual(observerCustodyContract.observer, {
    bytes: 99_998,
    sha256: "2cab3b38b33413ce296656662ba94053cc3512b00d85f3c9c5fb48e65c1ec21d",
    planSha256:
      "b676acebcec53076742c5e4e831bd1729e8cbb970a1f276a099543358b274e33",
  });
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
  assert.deepEqual(observerCustodyContract.neverIssuedPaths, [
    `${observerDirectory}/FR-A1.attempt`,
    `${observerDirectory}/FR-A1.receipt.json`,
  ]);
  assert.deepEqual(observerCustodyContract.postRun, {
    fileCount: 43,
    totalBytes: 49_730,
    manifestBytes: 5_357,
    manifestSha256:
      "73401fdc8c060d443cab0e521c0fc9ae9ec067bcf0f1e75131f0411d2e460546",
  });
  assert.deepEqual(observerCustodyContract.report, {
    path: "docs/source-reviews/source-authority-portfolio-discovery-2026-09-03.md",
    bytes: 34_744,
    sha256: "5d496c6cbc5a49f4941f6167bed87fe3f931865c1e0e88150e95bfde563e7ab2",
  });
  assert.deepEqual(observerCustodyContract.trustPaths, [
    ".codex/hooks.json",
    ".gitignore",
    "ROADMAP.yaml",
    "docs/development/PNW-05-REAL-SOURCE-PRERELEASE-COORDINATION-2026-09-03.md",
    "docs/source-reviews/source-authority-portfolio-discovery-2026-09-03.md",
    "scripts/codex-hooks.mjs",
    "tests/hooks/codex-hooks.test.mjs",
  ]);
});

test("observer execution requires the sole active item and exact gate", () => {
  const authorized = observerRoadmap();
  assert.equal(observerRoadmapAuthority(authorized), true);
  assert.equal(
    observerExecutionEvidenceIsValid({
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
      observerExecutionEvidenceIsValid({
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

test("observer execution custody binds exact bytes, ignore, and Git absence", () => {
  const { historicalCustody, root } = initializeObserverFixture();
  const absoluteObserverPath = path.join(root, ...observerPath.split("/"));
  const observerBytes = Buffer.from("export {};\n", "utf8");
  const observerCustody = {
    bytes: observerBytes.byteLength,
    sha256: createHash("sha256").update(observerBytes).digest("hex"),
  };
  try {
    writeFileSync(absoluteObserverPath, observerBytes);
    assert.equal(
      observerPreAddCustodyIsValid(root, { historicalCustody }),
      false,
    );
    assert.equal(
      observerExecutionCustodyIsValid(root, {
        historicalCustody,
        observerCustody,
      }),
      true,
    );

    writeFileSync(absoluteObserverPath, Buffer.from("export default {};\n"));
    assert.equal(
      observerExecutionCustodyIsValid(root, {
        historicalCustody,
        observerCustody,
      }),
      false,
      "changed observer bytes must invalidate execution custody",
    );
    writeFileSync(absoluteObserverPath, observerBytes);

    runGit(root, ["add", "--force", observerPath]);
    assert.equal(
      observerExecutionCustodyIsValid(root, {
        historicalCustody,
        observerCustody,
      }),
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

test("terminal observer custody preserves the exact 43-file evidence manifest", () => {
  const { root } = initializeObserverFixture();
  const absoluteObserverPath = path.join(root, ...observerPath.split("/"));
  const postRunCustody = calculateFixturePostRunCustody(root);
  try {
    assert.equal(
      observerTerminalCustodyIsValid(root, { postRunCustody }),
      true,
    );

    writeFileSync(absoluteObserverPath, "export {};\n", "utf8");
    assert.equal(
      observerTerminalCustodyIsValid(root, { postRunCustody }),
      false,
    );
    rmSync(absoluteObserverPath);

    const dataPath = path.join(root, observerDirectory, historicalNames[0]);
    const originalData = readFileSync(dataPath);
    writeFileSync(dataPath, Buffer.concat([originalData, Buffer.from("x")]));
    assert.equal(
      observerTerminalCustodyIsValid(root, { postRunCustody }),
      false,
    );
    writeFileSync(dataPath, originalData);

    const extraPath = path.join(root, observerDirectory, "unexpected.json");
    writeFileSync(extraPath, "unexpected\n", "utf8");
    assert.equal(
      observerTerminalCustodyIsValid(root, { postRunCustody }),
      false,
    );
    rmSync(extraPath);

    writeFileSync(
      path.join(root, observerDirectory, "FR-A1.attempt"),
      "forbidden\n",
      "utf8",
    );
    assert.equal(
      observerTerminalCustodyIsValid(root, { postRunCustody }),
      false,
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

test("terminal observer policy rejects every apply_patch mutation", () => {
  const operation = (header) =>
    extractPatchOperations(`*** Begin Patch\n${header}\n*** End Patch`);
  const exactAdd = operation(`*** Add File: ${observerPath}`);
  assert.equal(isObserverAddOperation(exactAdd), true);
  assert.equal(
    evaluatePatchOperations(exactAdd, observerRoadmap(), projectRoot).blocked,
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
      evaluatePatchOperations(variantOperations, observerRoadmap(), projectRoot)
        .blocked,
      true,
      header,
    );
  }

  const mixed = extractPatchOperations(
    `*** Begin Patch\n*** Add File: ${observerPath}\n*** Update File: README.md\n*** End Patch`,
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
      evaluatePatchOperations(exactAdd, observerRoadmap(), missingParentsRoot)
        .blocked,
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
  assert.match(context, /historical focus: H-HOOKS/u);
  assert.match(
    context,
    /retained ROADMAP\.yaml context \(historical work record/u,
  );
  assert.match(
    context,
    /Current task comes from the user's request.*AGENTS\.md, docs\/STATUS\.md, and docs\/PLAN\.md/u,
  );
  assert.match(context, /HEAD: abc123/u);
  assert.doesNotMatch(context, /last_assistant_message|transcript_path/u);
  assert.ok(
    context.includes(
      "Current task comes from the user's request. For current scope and resume state, follow AGENTS.md, docs/STATUS.md, and docs/PLAN.md.",
    ),
  );
});

test("uninstalled lifecycle events are ignored", async () => {
  for (const hook_event_name of ["PreCompact", "PostToolUse", "Stop"]) {
    assert.equal(
      await handleHookEvent({
        cwd: path.join(projectRoot, "missing-nonrepository-cwd"),
        hook_event_name,
      }),
      null,
      `${hook_event_name} must not inspect or block on repository state`,
    );
  }
});

test("recovery summaries report focus without granting task authority", () => {
  for (const [title, itemStatus] of [
    ["Narrow demo CSS", "in_progress"],
    ["Shared extractor used by demo", "in_progress"],
    ["Ledger graph change", "in_progress"],
    ["General-engine work", "in_progress"],
    ["Ambiguous mixed demo and engine work", "in_progress"],
    ["Completed demo record", "complete"],
    ["Unselected demo record", "ready"],
  ]) {
    const context = buildSessionContext({
      roadmap: {
        ...closedRoadmap,
        current_focus: {
          work_item: itemStatus === "in_progress" ? "DEMO-LABEL" : null,
        },
        work_items: [
          {
            id: "DEMO-LABEL",
            title,
            status: itemStatus,
            dependencies: ["SIXTH"],
          },
        ],
        next_actions: [
          "FIRST",
          "SECOND",
          "THIRD",
          "FOURTH",
          "FIFTH",
          "SIXTH",
        ].map((work_item, index) => ({ order: index + 1, work_item })),
      },
      validation: { ok: true, detail: "" },
      head: "abc123",
      status: "",
    });
    assert.doesNotMatch(
      context,
      /require the full context|completed or unselected demo record|continuation prompt|scope-specific context rule/u,
      title,
    );
    assert.match(
      context,
      /historical next actions: 1:FIRST, 2:SECOND, 3:THIRD, 4:FOURTH, 5:FIFTH/u,
      title,
    );
    assert.match(context, /hook gate checks remain active/u, title);
    assert.ok(
      context.includes(
        "For current scope and resume state, follow AGENTS.md, docs/STATUS.md, and docs/PLAN.md.",
      ),
      title,
    );
    assert.match(
      context,
      /closed external boundaries \(still enforced\): EXT-GITHUB, EXT-CREDENTIALS, EXT-NOTIFY/u,
    );
    assert.doesNotMatch(
      context,
      /SIXTH/u,
      "the bounded summary still omits later actions",
    );
    assert.match(
      context,
      itemStatus === "in_progress"
        ? /historical focus: DEMO-LABEL/u
        : /historical focus: none/u,
    );
  }
});

test("the command hook emits valid deny JSON and stays silent when allowing", (t) => {
  const { root: projectRoot, nestedPackage } = initializeShellFixture(t, {
    git: true,
  });
  const invoke = (
    command,
    toolName = "Bash",
    workdir = undefined,
    eventCwd = projectRoot,
  ) =>
    spawnSync(process.execPath, [hookRunner], {
      cwd: projectRoot,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: "PreToolUse",
        cwd: eventCwd,
        tool_name: toolName,
        tool_input:
          toolName === "exec_command"
            ? { cmd: command, ...(workdir ? { workdir } : {}) }
            : { command, ...(workdir ? { workdir } : {}) },
      }),
      timeout: 30_000,
      windowsHide: true,
    });

  const routineReleaseAction = invoke("git push origin main");
  assert.equal(routineReleaseAction.status, 0, routineReleaseAction.stderr);
  assert.equal(routineReleaseAction.stdout, "");

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

  const sensitiveWorkdir = path.join(
    projectRoot,
    "generated-data",
    "real-source-prerelease",
  );
  const workdirDenied = invoke(
    `python -c "open('PF-01.receipt.json','w').write('x')"`,
    "exec_command",
    sensitiveWorkdir,
  );
  assert.equal(workdirDenied.status, 0, workdirDenied.stderr);
  assert.equal(
    JSON.parse(workdirDenied.stdout).hookSpecificOutput.permissionDecision,
    "deny",
  );

  const eventCwdDenied = invoke(
    `python -c "open('PF-01.receipt.json','w').write('x')"`,
    "exec_command",
    undefined,
    sensitiveWorkdir,
  );
  assert.equal(eventCwdDenied.status, 0, eventCwdDenied.stderr);
  assert.equal(
    JSON.parse(eventCwdDenied.stdout).hookSpecificOutput.permissionDecision,
    "deny",
  );

  for (const command of [
    "git add -- docs/00-READ-FIRST.md",
    "git update-index --assume-unchanged ROADMAP.yaml",
    "git fetch origin",
    "Get-Content Env:OPENAI_API_KEY",
    `[Environment]::GetEnvironmentVariable('OPENAI_API_KEY')`,
    "Remove-Item generated-data/real-source-prerelease/PF-01.receipt.json",
    "gh repo create example",
  ]) {
    const result = invoke(command, "exec_command");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      JSON.parse(result.stdout).hookSpecificOutput.permissionDecision,
      "deny",
      command,
    );
  }

  const ownerPatchDenied = invoke(
    "*** Begin Patch\n*** Delete File: docs/00-READ-FIRST.md\n*** End Patch",
    "apply_patch",
  );
  assert.equal(ownerPatchDenied.status, 0, ownerPatchDenied.stderr);
  assert.equal(
    JSON.parse(ownerPatchDenied.stdout).hookSpecificOutput.permissionDecision,
    "deny",
  );

  const workdirRead = invoke(
    "Get-Content -LiteralPath PF-01.receipt.json",
    "exec_command",
    sensitiveWorkdir,
  );
  assert.equal(workdirRead.status, 0, workdirRead.stderr);
  assert.equal(workdirRead.stdout, "");

  const nestedNpmAllowed = invoke("npm test", "exec_command", nestedPackage);
  assert.equal(nestedNpmAllowed.status, 0, nestedNpmAllowed.stderr);
  assert.equal(nestedNpmAllowed.stdout, "");

  const packagePublishAllowed = invoke(
    "npm publish --access public",
    "exec_command",
  );
  assert.equal(packagePublishAllowed.status, 0, packagePublishAllowed.stderr);
  assert.equal(packagePublishAllowed.stdout, "");

  const ordinaryToolingAllowed = invoke(
    "node --version; wsl --status",
    "exec_command",
  );
  assert.equal(ordinaryToolingAllowed.status, 0, ordinaryToolingAllowed.stderr);
  assert.equal(ordinaryToolingAllowed.stdout, "");
});
