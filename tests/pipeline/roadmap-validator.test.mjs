import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const validatorPath = path.resolve(projectRoot, "scripts/validate-roadmap.mjs");
const roadmapPath = path.resolve(projectRoot, "ROADMAP.yaml");

test("terminal-blocked state accounts exactly for every incomplete required-outcome root", async (context) => {
  const roadmap = parse(await readFile(roadmapPath, "utf8"));
  assert.deepEqual(
    roadmap.completion_scope.local_release_candidate.additive_vision_phases,
    ["K0-LIFECYCLE", "S0-SPATIAL"],
  );
  assert.equal(
    roadmap.work_items.find((item) => item.id === "K0-LIFECYCLE").status,
    "complete",
  );
  assert.equal(
    roadmap.work_items.find((item) => item.id === "S0-SPATIAL").status,
    "in_progress",
  );
  assert.equal(roadmap.current_focus.work_item, "S0-SPATIAL");
  assert.equal(
    roadmap.finish_states.local_release_candidate.current_state,
    "in_progress",
  );
  const expectedRoots = [
    "B2-REVIEW",
    "B4-FR-UX",
    "B5-WA-LWS-ADAPTER",
    "B5-WA-RULES",
  ];
  const terminalRoadmap = parse(stringify(roadmap));
  terminalRoadmap.work_items.find((item) => item.id === "S0-SPATIAL").status =
    "ready";
  terminalRoadmap.current_focus.work_item = null;
  terminalRoadmap.current_focus.terminal_reason =
    "Synthetic terminal-state regression fixture.";
  terminalRoadmap.finish_states.local_release_candidate.current_state =
    "blocked";

  assert.deepEqual(
    terminalRoadmap.finish_states.local_release_candidate.blocked_by,
    expectedRoots,
  );
  assert.deepEqual(
    terminalRoadmap.current_focus.resumable_roots,
    expectedRoots,
  );
  assert.deepEqual(
    terminalRoadmap.next_actions.map((action) => action.work_item),
    expectedRoots,
  );

  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "policy-sentinel-roadmap-"),
  );
  context.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const validateCandidate = async (name, candidate) => {
    const fixturePath = path.join(fixtureRoot, `${name}.yaml`);
    await writeFile(fixturePath, stringify(candidate), "utf8");
    return spawnSync(process.execPath, [validatorPath, fixturePath], {
      cwd: projectRoot,
      encoding: "utf8",
    });
  };
  const additiveReadyResult = await validateCandidate(
    "additive-ready-terminal-state",
    terminalRoadmap,
  );
  assert.equal(
    additiveReadyResult.status,
    0,
    `${additiveReadyResult.stdout}\n${additiveReadyResult.stderr}`,
  );
  const validateMutation = async (name, mutate, expectedMessage) => {
    const candidate = parse(stringify(terminalRoadmap));
    mutate(candidate);
    const result = await validateCandidate(name, candidate);
    assert.notEqual(result.status, 0, `${name} was accepted`);
    assert.match(`${result.stdout}\n${result.stderr}`, expectedMessage);
  };

  await validateMutation(
    "unscoped-additive-phase",
    (candidate) => {
      candidate.completion_scope.local_release_candidate.additive_vision_phases =
        ["K0-LIFECYCLE"];
    },
    /work items missing from completion scope: S0-SPATIAL/,
  );
  await validateMutation(
    "ready-phase-outside-additive-scope",
    (candidate) => {
      candidate.completion_scope.local_release_candidate.additive_vision_phases =
        ["K0-LIFECYCLE"];
      candidate.completion_scope.local_release_candidate.publication_only.push(
        "S0-SPATIAL",
      );
    },
    /non-additive ready work remains: S0-SPATIAL/,
  );

  for (const rootId of expectedRoots) {
    await validateMutation(
      `missing-finish-${rootId}`,
      (candidate) => {
        candidate.finish_states.local_release_candidate.blocked_by =
          candidate.finish_states.local_release_candidate.blocked_by.filter(
            (id) => id !== rootId,
          );
      },
      new RegExp(`terminal-blocked finish blockers.*${rootId}`),
    );
  }
  await validateMutation(
    "unexpected-finish-root",
    (candidate) => {
      candidate.finish_states.local_release_candidate.blocked_by.push(
        "NOT-A-WORK-ITEM",
      );
    },
    /terminal-blocked finish blockers.*NOT-A-WORK-ITEM/,
  );
  await validateMutation(
    "complete-finish-root",
    (candidate) => {
      candidate.finish_states.local_release_candidate.blocked_by.push("B1-APP");
    },
    /terminal-blocked finish blockers.*B1-APP/,
  );
  await validateMutation(
    "missing-focus-root",
    (candidate) => {
      candidate.current_focus.resumable_roots =
        candidate.current_focus.resumable_roots.filter(
          (id) => id !== "B5-WA-LWS-ADAPTER",
        );
    },
    /terminal-blocked current focus.*B5-WA-LWS-ADAPTER/,
  );
  await validateMutation(
    "missing-next-action-root",
    (candidate) => {
      candidate.next_actions = candidate.next_actions.filter(
        (action) => action.work_item !== "B5-WA-LWS-ADAPTER",
      );
    },
    /terminal-blocked next actions.*B5-WA-LWS-ADAPTER/,
  );
  await validateMutation(
    "misordered-next-action-roots",
    (candidate) => {
      const thirdWorkItem = candidate.next_actions[2].work_item;
      candidate.next_actions[2].work_item = candidate.next_actions[3].work_item;
      candidate.next_actions[3].work_item = thirdWorkItem;
    },
    /terminal-blocked next actions.*expected order/,
  );
});
