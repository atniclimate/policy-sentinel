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
  const expectedRoots = [
    "B2-REVIEW",
    "B4-FR-UX",
    "B5-WA-LWS-ADAPTER",
    "B5-WA-RULES",
  ];
  assert.deepEqual(
    roadmap.finish_states.local_release_candidate.blocked_by,
    expectedRoots,
  );
  assert.deepEqual(roadmap.current_focus.resumable_roots, expectedRoots);
  assert.deepEqual(
    roadmap.next_actions.map((action) => action.work_item),
    expectedRoots,
  );

  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "policy-sentinel-roadmap-"),
  );
  context.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const validateMutation = async (name, mutate, expectedMessage) => {
    const candidate = parse(stringify(roadmap));
    mutate(candidate);
    const fixturePath = path.join(fixtureRoot, `${name}.yaml`);
    await writeFile(fixturePath, stringify(candidate), "utf8");
    const result = spawnSync(process.execPath, [validatorPath, fixturePath], {
      cwd: projectRoot,
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0, `${name} was accepted`);
    assert.match(`${result.stdout}\n${result.stderr}`, expectedMessage);
  };

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
