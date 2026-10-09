import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  lstat,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { parse, parseDocument, stringify } from "yaml";
import { PRESERVED_OWNER_DIRECTION_INPUT_SHA256 } from "../../scripts/owner-input-custody.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const validatorPath = path.resolve(projectRoot, "scripts/validate-roadmap.mjs");
const validatorSource = await readFile(validatorPath, "utf8");
// Run the actual CLI body with real YAML/filesystem/crypto imports and an
// isolated synthetic argv/console. Only import bindings and import.meta are
// supplied by this harness; no validator branch, guard, or constant is replaced.
// Representative cases below still execute the actual CLI in child processes.
const validatorBody = validatorSource
  .replace(/^import .+;\r?\n/gm, "")
  .replaceAll("import.meta.dirname", "moduleDir");
const validatorScript = new Script(`(async () => {\n${validatorBody}\n})()`, {
  filename: validatorPath,
});
const validateActualModule = async (fixturePath, extraArguments = []) => {
  const output = [];
  try {
    await validatorScript.runInNewContext({
      createHash,
      access,
      lstat,
      readFile,
      realpath,
      tmpdir,
      basename: path.basename,
      dirname: path.dirname,
      isAbsolute: path.isAbsolute,
      relative: path.relative,
      resolve: path.resolve,
      parseDocument,
      PRESERVED_OWNER_DIRECTION_INPUT_SHA256,
      Buffer,
      moduleDir: path.dirname(validatorPath),
      process: {
        argv: [process.execPath, validatorPath, fixturePath, ...extraArguments],
        cwd: () => projectRoot,
      },
      console: { log: (value) => output.push(value) },
    });
    return { status: 0, stdout: output.join("\n"), stderr: "" };
  } catch (error) {
    return { status: 1, stdout: output.join("\n"), stderr: error.stack };
  }
};
// JSON is a YAML subset. Use it only when serialization preserves every value;
// actual parsing and filesystem checks still run for each freshly written case.
const serializeModuleFixture = (candidate, useYaml = false) => {
  if (useYaml) return stringify(candidate);
  const pending = [candidate];
  const seen = new WeakSet();
  while (pending.length) {
    const value = pending.pop();
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "boolean"
    )
      continue;
    if (typeof value === "number") {
      if (!Number.isFinite(value) || Object.is(value, -0))
        return stringify(candidate);
      continue;
    }
    if (typeof value !== "object") return stringify(candidate);
    if (seen.has(value)) return stringify(candidate);
    seen.add(value);
    const isArray = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (
      isArray
        ? prototype !== Array.prototype
        : prototype !== Object.prototype && prototype !== null
    )
      return stringify(candidate);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (isArray && keys.length !== value.length + 1)
      return stringify(candidate);
    for (const key of keys) {
      if (isArray && key === "length") continue;
      const descriptor = descriptors[key];
      if (
        typeof key !== "string" ||
        !descriptor.enumerable ||
        !("value" in descriptor) ||
        key === "toJSON" ||
        (isArray &&
          (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))
      )
        return stringify(candidate);
      pending.push(descriptor.value);
    }
  }
  return JSON.stringify(candidate);
};

test("module fixture serialization preserves YAML-only values and ordinary candidates", () => {
  const ordinary = {
    text: "yes: quoted",
    values: [null, true, 1, { nested: "é" }],
  };
  assert.deepEqual(parse(serializeModuleFixture(ordinary)), ordinary);
  for (const value of [
    NaN,
    Infinity,
    -0,
    undefined,
    new Date("2026-10-07T00:00:00Z"),
    Array(2),
    { toJSON: () => "changed" },
  ]) {
    const candidate = { value };
    assert.equal(serializeModuleFixture(candidate), stringify(candidate));
  }
  assert.equal(serializeModuleFixture(ordinary, true), stringify(ordinary));
  const compensatedHole = Array(2);
  compensatedHole[0] = 1;
  compensatedHole["4294967295"] = 2;
  assert.equal(
    serializeModuleFixture(compensatedHole),
    stringify(compensatedHole),
  );
});

test("actual module and CLI reject malformed YAML bytes before ledger validation", async (context) => {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "policy-sentinel-malformed-roadmap-"),
  );
  context.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  for (const [name, bytes] of [
    ["syntax", "schema_version: [unterminated\n"],
    ["duplicate", "schema_version: '1.11'\nschema_version: '1.10'\n"],
  ]) {
    const fixturePath = path.join(fixtureRoot, `${name}.yaml`);
    await writeFile(fixturePath, bytes, "utf8");
    for (const result of [
      await validateActualModule(fixturePath),
      spawnSync(process.execPath, [validatorPath, fixturePath], {
        cwd: projectRoot,
        encoding: "utf8",
      }),
    ]) {
      assert.notEqual(result.status, 0);
      assert.match(
        `${result.stdout}\n${result.stderr}`,
        /ROADMAP.yaml could not be parsed:/,
      );
    }
  }
});
const liveRoadmap = parse(
  await readFile(path.resolve(projectRoot, "ROADMAP.yaml"), "utf8"),
);
const liveWorkItem = (id) =>
  liveRoadmap.work_items.find((item) => item.id === id);
const protectedReleaseRoots = [
  "B2-REVIEW",
  "B4-FR-UX",
  "B5-WA-LWS-ADAPTER",
  "B5-WA-RULES",
];
const protectedPnwRoots = ["PNW-01-ENGINE-SEAMS", "PNW-02-REGIONAL-REGISTRY"];
const additiveStages = [
  "contract_design",
  "contract_freeze",
  "contract_review",
  "implementation",
  "implementation_review",
  "completion",
];
const localRealSourcePrereleaseOutcomes = [
  "PNW-05-REAL-SOURCE-LIFECYCLE-CONTRACT",
  "PNW-05-SRC-FEDERAL-REGISTER-TIER1-BOUNDED-ADMISSION",
  "PNW-06-FEDERAL-REGISTER-BOUNDED-REFRESH-LKG",
  "PNW-07-GENERAL-JURISDICTION-ANALYZED-CORPUS-PROJECTION",
  "PNW-08-LOCAL-REAL-SOURCE-APPLICATION-PRERELEASE",
  "PNW-05-SOURCE-AUTHORITY-PORTFOLIO-DISCOVERY",
];

test("live roadmap preserves the archived local real-source prerelease child lane", () => {
  assert.deepEqual(
    liveRoadmap.completion_scope.local_real_source_prerelease.required_outcomes,
    localRealSourcePrereleaseOutcomes,
  );
  assert.equal(
    liveRoadmap.gates.find(({ id }) => id === "G-PNW-05-REAL-SOURCE-PRERELEASE")
      ?.state,
    "approved",
  );
  assert.equal(
    liveRoadmap.gates.find(({ id }) => id === "G-PNW-SOURCE-ACTIVATION")?.state,
    "closed",
  );
  assert.equal(liveWorkItem("PNW-05-SOURCE-PACK")?.status, "ready");
  for (const id of [
    "PNW-06-LIFECYCLE-REFRESH",
    "PNW-07-ANALYZED-CORPUS",
    "PNW-08-OUTPUT-ADAPTERS",
    "PNW-09-ACCEPTANCE-SCENARIOS",
    "PNW-10-REGIONAL-RC",
  ]) {
    assert.equal(liveWorkItem(id)?.status, "not_started");
  }
  assert.equal(
    liveRoadmap.finish_states.local_release_candidate.current_state,
    "blocked",
  );
  assert.equal(
    liveRoadmap.finish_states.pnw_regional_engine.current_state,
    "in_progress",
  );
  assert.equal(liveRoadmap.finish_states.public_beta.current_state, "blocked");

  const federalRegister = liveRoadmap.source_register.find(
    ({ id }) => id === "SRC-FEDERAL-REGISTER",
  );
  assert.equal(federalRegister?.admission, "not_admitted");
  assert.equal(federalRegister?.activation, "inactive");
  assert.equal(federalRegister?.binding, "unbound");
  assert.equal(federalRegister?.publication, "not_authorized");
});

const ps09OutcomeIds = [
  "PS09-01-REPOSITORY-CONVERGENCE",
  "PS09-02-IDENTITY-AUTHORITY-SCENARIOS",
  "PS09-03-FEDERAL-REAL-SOURCE-SPINE",
  "PS09-04-PNW-REAL-CORPUS",
  "PS09-05-SEARCH-OUTPUTS",
  "PS09-06-LOCAL-RC",
  "PS09-07-FOCUSED-REPAIR",
  "PS09-08-STAKEHOLDER-HARDENING",
];
const knowledgeAssuranceId = "H-KNOWLEDGE-ASSURANCE-01";
const knowledgeAssuranceGateId = "G-H-KNOWLEDGE-ASSURANCE-01";
const engineeringReviewId = "H-ENGINEERING-REVIEW-02";
const engineeringReviewGateId = "G-H-ENGINEERING-REVIEW-02";
const makahDemoGroundworkId = "MAKAH-DEMO-01-GROUNDWORK-DISCOVERY-SCOUTS";
const makahDemoAcquisitionId = "MAKAH-DEMO-02-FEDERAL-CANDIDATE-ACQUISITION";
const makahDemoIds = [makahDemoGroundworkId, makahDemoAcquisitionId];
const makahDemoGroundworkGateId = "G-MAKAH-DEMO-01";
const makahDemoAcquisitionGateId = "G-MAKAH-DEMO-02";
const makahDemoGateIds = [
  makahDemoGroundworkGateId,
  makahDemoAcquisitionGateId,
];
// Schema 1.10 admits milestone "General development" by rule (D-071). Older
// schema fixtures strip that graph so every 1.7 to 1.9 assertion still runs
// unchanged on a ledger shaped like its own schema.
const generalDevelopmentMilestone = "General development";
const generalDevelopmentGateIds = [
  "G-GENERAL-DEV-01",
  "G-GD-NATIONWIDE-CONTRACT",
  "G-GD-INTEROP",
  "G-GD-PRIVATE-CONTEXT",
];
const successorGateIds = [
  "G-GD-SUCCESSOR-IMPLEMENTATION",
  "G-GD-PUBLIC-ACQUISITION",
  "G-GD-ATNI-LOCAL-ASSESSMENT",
  "G-GD-LOCAL-RELEASE-ACCEPTANCE",
];
const isGeneralDevelopmentItem = ({ milestone }) =>
  milestone === generalDevelopmentMilestone;
const withoutGeneralDevelopment = (candidate) => {
  const ids = new Set(
    candidate.work_items.filter(isGeneralDevelopmentItem).map(({ id }) => id),
  );
  candidate.work_items = candidate.work_items.filter(({ id }) => !ids.has(id));
  candidate.gates = candidate.gates.filter(
    ({ id }) =>
      ![...generalDevelopmentGateIds, ...successorGateIds].includes(id),
  );
  delete candidate.completion_scope.general_development;
  delete candidate.finish_states.general_development;
  if (ids.has(candidate.current_focus.work_item)) {
    Object.assign(candidate.current_focus, {
      work_item: null,
      terminal_reason: "Synthetic terminal reason.",
    });
  }
  candidate.current_focus.resumable_roots =
    candidate.current_focus.resumable_roots.filter((id) => !ids.has(id));
  candidate.next_actions = candidate.next_actions
    .filter((action) => !ids.has(action.work_item))
    .map((action, index) => ({ ...action, order: index + 1 }));
  return candidate;
};
const asSchema110 = (candidate) => {
  candidate.schema_version = "1.10";
  candidate.gates = candidate.gates.filter(
    ({ id }) => !successorGateIds.includes(id),
  );
  for (const entry of candidate.work_items.filter(isGeneralDevelopmentItem)) {
    if (successorGateIds.includes(entry.authorization_gate)) {
      entry.authorization_gate = "G-GENERAL-DEV-01";
      if (entry.blocked_by)
        entry.blocked_by = entry.blocked_by.map((id) =>
          successorGateIds.includes(id) ? "G-GENERAL-DEV-01" : id,
        );
    }
  }
  candidate.completion_scope.general_development = {
    accounting: "non_release_local_development",
    admission_rule: "Synthetic schema 1.10 admission fixture.",
    decision_ref: "D-071",
  };
  delete candidate.finish_states.general_development;
  const byId = new Map(candidate.work_items.map((entry) => [entry.id, entry]));
  const roots = new Set();
  const collect = (id) => {
    const entry = byId.get(id);
    // Deferred mandatory work remains incomplete in the historical graph too.
    if (entry.status === "complete") return;
    const incomplete = entry.dependencies.filter(
      (dependency) => byId.get(dependency).status !== "complete",
    );
    if (entry.status === "blocked" || incomplete.length === 0) roots.add(id);
    else incomplete.forEach(collect);
  };
  [
    ...ps09OutcomeIds.slice(0, 6),
    ...candidate.work_items
      .filter(isGeneralDevelopmentItem)
      .map(({ id }) => id),
  ].forEach(collect);
  const ordered = [...roots].sort(
    (left, right) => byId.get(left).priority - byId.get(right).priority,
  );
  candidate.next_actions = ordered.map((id, index) => ({
    order: index + 1,
    work_item: id,
    action: "Synthetic next action.",
  }));
  candidate.current_focus.resumable_roots = candidate.current_focus.work_item
    ? [candidate.current_focus.work_item, ps09OutcomeIds[1]]
    : ordered;
  return candidate;
};
const withoutMakahDemo = (candidate) => {
  withoutGeneralDevelopment(candidate);
  candidate.work_items = candidate.work_items.filter(
    ({ id }) => !makahDemoIds.includes(id),
  );
  candidate.gates = candidate.gates.filter(
    ({ id }) => !makahDemoGateIds.includes(id),
  );
  delete candidate.completion_scope.makah_demo;
  delete candidate.finish_states.makah_demo;
  Object.assign(candidate.current_focus, {
    work_item: null,
    terminal_reason: "Synthetic terminal reason.",
    resumable_roots: [ps09OutcomeIds[1]],
  });
  candidate.next_actions = candidate.next_actions
    .filter((action) => !makahDemoIds.includes(action.work_item))
    .map((action, index) => ({ ...action, order: index + 1 }));
  return candidate;
};
const withoutEngineeringReview = (candidate) => {
  withoutMakahDemo(candidate);
  candidate.work_items = candidate.work_items.filter(
    ({ id }) => id !== engineeringReviewId,
  );
  candidate.gates = candidate.gates.filter(
    ({ id }) => id !== engineeringReviewGateId,
  );
  delete candidate.completion_scope.engineering_review;
  delete candidate.finish_states.engineering_review;
  return candidate;
};
const withoutKnowledgeAssurance = (candidate) => {
  withoutEngineeringReview(candidate);
  candidate.work_items = candidate.work_items.filter(
    ({ id }) => id !== knowledgeAssuranceId,
  );
  candidate.gates = candidate.gates.filter(
    ({ id }) => id !== knowledgeAssuranceGateId,
  );
  delete candidate.completion_scope.knowledge_assurance;
  delete candidate.finish_states.knowledge_assurance;
  return candidate;
};

test("schema 1.7 confines maintenance to its approved non-release scope", async (context) => {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "policy-sentinel-ps09-roadmap-"),
  );
  context.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const item = (candidate, id = knowledgeAssuranceId) =>
    candidate.work_items.find((entry) => entry.id === id);
  const gate = (candidate, id = knowledgeAssuranceGateId) =>
    candidate.gates.find((entry) => entry.id === id);
  const candidateFor = (status) => {
    const candidate = withoutEngineeringReview(clone(liveRoadmap));
    candidate.schema_version = "1.7";
    const maintenance = item(candidate);
    maintenance.status = status;
    maintenance.evidence = ["Synthetic bounded maintenance evidence."];
    delete maintenance.blocked_by;
    delete maintenance.safe_fallback;
    delete maintenance.unblocks_only_when;
    if (status === "blocked") {
      Object.assign(maintenance, {
        blocked_by: [knowledgeAssuranceGateId],
        safe_fallback:
          "Preserve local evidence and keep source/release gates closed.",
        unblocks_only_when:
          "The named synthetic validation blocker is resolved.",
      });
    }
    Object.assign(candidate.finish_states.knowledge_assurance, {
      current_state: status,
      blocked_by: status === "blocked" ? [knowledgeAssuranceId] : [],
    });
    const roots =
      status === "complete"
        ? [ps09OutcomeIds[1]]
        : [knowledgeAssuranceId, ps09OutcomeIds[1]];
    Object.assign(candidate.current_focus, {
      work_item: status === "in_progress" ? knowledgeAssuranceId : null,
      terminal_reason:
        status === "in_progress"
          ? null
          : "Synthetic bounded maintenance checkpoint.",
      resumable_roots:
        status === "in_progress" ? [knowledgeAssuranceId] : roots,
    });
    candidate.next_actions = roots.map((id, index) => ({
      order: index + 1,
      work_item: id,
      action: `Resolve ${id} within its separate authority.`,
    }));
    return candidate;
  };
  const validate = async (name, candidate, extraArguments = []) => {
    const fixturePath = path.join(fixtureRoot, `${name}.yaml`);
    const cli = [
      "in_progress",
      "complete",
      "blocked",
      "historical-v16-terminal",
      "unknown-version",
    ].includes(name);
    await writeFile(
      fixturePath,
      serializeModuleFixture(candidate, cli),
      "utf8",
    );
    if (
      ![
        "in_progress",
        "complete",
        "blocked",
        "historical-v16-terminal",
        "unknown-version",
      ].includes(name)
    ) {
      return validateActualModule(fixturePath, extraArguments);
    }
    return spawnSync(
      process.execPath,
      [validatorPath, fixturePath, ...extraArguments],
      {
        cwd: projectRoot,
        encoding: "utf8",
      },
    );
  };
  for (const status of ["in_progress", "complete", "blocked"]) {
    await context.test(
      `valid ${status} maintenance preserves PS09-02`,
      async () => {
        const result = await validate(status, candidateFor(status));
        assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    );
  }
  await context.test(
    "historical 1.6 terminal accounting remains replayable",
    async () => {
      const candidate = withoutKnowledgeAssurance(candidateFor("complete"));
      candidate.schema_version = "1.6";
      const result = await validate("historical-v16-terminal", candidate);
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    },
  );
  await context.test(
    "completed maintenance cannot resume PS09 using spent historical approval",
    async () => {
      const candidate = candidateFor("complete");
      item(candidate, ps09OutcomeIds[1]).status = "in_progress";
      candidate.finish_states.ps09.current_state = "in_progress";
      candidate.finish_states.ps09.blocked_by = [];
      Object.assign(candidate.current_focus, {
        work_item: ps09OutcomeIds[1],
        terminal_reason: null,
        resumable_roots: [ps09OutcomeIds[1]],
      });
      const result = await validate(
        "completed-maintenance-future-ps09",
        candidate,
      );
      assert.notEqual(result.status, 0);
      assert.match(
        `${result.stdout}\n${result.stderr}`,
        /maintenance PS09-02 status/,
      );
    },
  );
  // Frozen from c65949f; never derive this protection from the candidate.
  const originallyClosed = [
    "G-PS09-RUN-06",
    "G-PS09-RUN-07",
    "G-PS09-RUN-08",
    "G-PS09-RC",
    "G-K0-S0-CONVERGENCE",
    "G-O0-CONVERGENCE",
    "G-B",
    "G-B-GRANTS",
    "G-B-CONGRESS",
    "G-B-GOVINFO",
    "G-B-REGULATIONS",
    "G-B-OR-OJD",
    "G-B-OR-OARD",
    "G-B-OR-GOVERNOR",
    "G-C",
    "G-E",
    "G-E-LICENSE",
    "G-E-REMOTE-PUSH",
    "G-E-PAGES",
    "G-E-PUBLISH",
    "G-F",
    "G-G",
    "G-H",
    "G-I",
    "G-PNW-COMMUNITY-AUTHORITY",
    "G-PNW-SOURCE-ACTIVATION",
  ];
  for (const status of ["in_progress", "complete", "blocked"]) {
    for (const id of originallyClosed) {
      await context.test(`${status} cannot reopen ${id}`, async () => {
        const candidate = candidateFor(status);
        Object.assign(gate(candidate, id), {
          state: "approved",
          evidence: ["Synthetic fabricated authority; no approval exists."],
          approved_scope: ["Synthetic unauthorized operation."],
        });
        const result = await validate(`${status}-${id}`, candidate);
        assert.notEqual(result.status, 0);
        assert.match(
          `${result.stdout}\n${result.stderr}`,
          ["G-B", "G-E"].includes(id)
            ? /is a category gate and must remain closed/
            : new RegExp(`maintenance preserved ${id}`),
        );
      });
    }
  }
  const rejections = [
    [
      "wrong-maintenance-work-class",
      (r) => {
        item(r).work_class = "source_implementation";
      },
      /H-KNOWLEDGE-ASSURANCE-01 work class must remain/,
    ],
    [
      "unknown-version",
      (r) => {
        r.schema_version = "2.0";
      },
      /unsupported production schema_version/,
    ],
    [
      "legacy-production-fallback",
      (r) => {
        r.schema_version = "test";
      },
      /synthetic legacy fixture contract/,
    ],
    [
      "downgraded-version",
      (r) => {
        r.schema_version = "1.6";
      },
      /requires schema 1.7/,
    ],
    [
      "unknown-maintenance-id",
      (r) => {
        item(r).id = "H-KNOWLEDGE-ASSURANCE-02";
      },
      /canonical maintenance work item missing/,
    ],
    [
      "unrelated-extra-item",
      (r) => {
        const extra = clone(item(r));
        extra.id = "H-OTHER-MAINTENANCE";
        extra.priority = 298;
        extra.status = "complete";
        r.work_items.push(extra);
        r.work_items.sort((a, b) => a.priority - b.priority);
      },
      /preserved historical component identities/,
    ],
    [
      "unknown-gate",
      (r) => {
        r.gates.push({
          id: "G-UNAPPROVED",
          name: "Unapproved gate",
          state: "closed",
        });
      },
      /unknown gate G-UNAPPROVED/,
    ],
    [
      "wrong-maintenance-gate",
      (r) => {
        item(r).authorization_gate = "G-A";
      },
      /authorization gate must remain/,
    ],
    [
      "closed-maintenance-gate",
      (r) => {
        gate(r).state = "closed";
      },
      /cannot be in_progress|gate state must remain/,
    ],
    [
      "missing-owner-instruction",
      (r) => {
        gate(r).owner_instruction = "Unrelated approval.";
      },
      /owner instruction must remain/,
    ],
    [
      "missing-approval-evidence",
      (r) => {
        gate(r).evidence = [];
      },
      /evidence must be a non-empty array/,
    ],
    [
      "unapproved-scope-kind",
      (r) => {
        gate(r).scope.kind = "unlimited_local_implementation";
      },
      /scope kind must remain/,
    ],
    [
      "additional-scope",
      (r) => {
        gate(r).scope.policy_research = true;
      },
      /approved scope must contain exactly/,
    ],
    [
      "source-activation",
      (r) => {
        gate(r).scope.policy_source_activation = true;
      },
      /scope policy_source_activation must remain false/,
    ],
    [
      "release-authority",
      (r) => {
        gate(r).scope.release_authority = true;
      },
      /scope release_authority must remain false/,
    ],
    [
      "string-boolean",
      (r) => {
        gate(r).scope.synthetic_local_validation = "true";
      },
      /scope synthetic_local_validation must remain true/,
    ],
    [
      "non-release-root-replaced",
      (r) => {
        r.completion_scope.knowledge_assurance.required_outcomes = [
          ps09OutcomeIds[5],
        ];
      },
      /knowledge assurance required outcomes/,
    ],
    [
      "maintenance-release-root",
      (r) => {
        r.completion_scope.knowledge_assurance.release_root =
          knowledgeAssuranceId;
      },
      /completion scope must contain exactly/,
    ],
    [
      "maintenance-dependency",
      (r) => {
        item(r, ps09OutcomeIds[5]).dependencies.push(knowledgeAssuranceId);
      },
      /cannot depend on non-release knowledge assurance/,
    ],
    [
      "maintenance-depends-on-history",
      (r) => {
        item(r).dependencies.push("B3-PIPELINE");
      },
      /H-KNOWLEDGE-ASSURANCE-01 dependencies/,
    ],
    [
      "changed-ps09-root",
      (r) => {
        r.completion_scope.ps09.release_root = knowledgeAssuranceId;
      },
      /PS09 release root/,
    ],
    [
      "removed-identity-dependency",
      (r) => {
        // Keep one unfinished dependency so the graph guard, rather than the
        // generic readiness check, proves identity cannot be substituted.
        item(r, ps09OutcomeIds[5]).dependencies = [
          ps09OutcomeIds[4],
          ps09OutcomeIds[6],
        ];
      },
      /dependencies must preserve exactly/,
      "complete",
    ],
    [
      "identity-accepted-during-maintenance",
      (r) => {
        item(r, ps09OutcomeIds[1]).status = "complete";
        Object.assign(item(r, ps09OutcomeIds[5]), {
          status: "blocked",
          blocked_by: ["G-PS09-RUN-06"],
          safe_fallback: "Keep RC closed.",
          unblocks_only_when: "Exact separate acceptance.",
          evidence: ["Synthetic identity mutation."],
        });
      },
      /maintenance PS09-02 status/,
    ],
    [
      "release-gate-opened",
      (r) => {
        gate(r, "G-PS09-RUN-06").state = "approved";
        gate(r, "G-PS09-RUN-06").evidence = [
          "Fabricated maintenance authority.",
        ];
      },
      /maintenance preserved G-PS09-RUN-06/,
    ],
    [
      "rc-gate-satisfied",
      (r) => {
        gate(r, "G-PS09-RC").state = "satisfied";
        gate(r, "G-PS09-RC").evidence = ["Fabricated maintenance acceptance."];
      },
      /maintenance preserved G-PS09-RC/,
    ],
    [
      "publication-gate-opened",
      (r) => {
        gate(r, "G-E-PUBLISH").state = "approved";
        gate(r, "G-E-PUBLISH").evidence = [
          "Fabricated maintenance publication.",
        ];
        gate(r, "G-E-PUBLISH").approved_scope = [
          "Fabricated publication scope.",
        ];
      },
      /maintenance preserved G-E-PUBLISH/,
    ],
    [
      "premature-rc",
      (r) => {
        item(r, ps09OutcomeIds[5]).status = "complete";
        item(r, ps09OutcomeIds[5]).evidence = ["Fabricated RC acceptance."];
      },
      /dependencies are not|cannot be complete|maintenance PS09-06/,
    ],
    [
      "premature-publication",
      (r) => {
        item(r, "RELEASE-PUBLISH").status = "complete";
      },
      /cannot be complete|dependencies are not/,
    ],
    [
      "ps09-finish-complete",
      (r) => {
        r.finish_states.ps09.current_state = "complete";
      },
      /maintenance PS09 finish/,
    ],
    [
      "two-active-items",
      (r) => {
        item(r, "PNW-05-SOURCE-AUTHORITY-PORTFOLIO-DISCOVERY").status =
          "in_progress";
      },
      /at most one in_progress/,
    ],
    [
      "historical-reactivation",
      (r) => {
        item(r).status = "complete";
        r.finish_states.knowledge_assurance.current_state = "complete";
        item(r, "PNW-05-SOURCE-AUTHORITY-PORTFOLIO-DISCOVERY").status =
          "in_progress";
        r.current_focus.work_item =
          "PNW-05-SOURCE-AUTHORITY-PORTFOLIO-DISCOVERY";
        r.current_focus.resumable_roots = [
          "PNW-05-SOURCE-AUTHORITY-PORTFOLIO-DISCOVERY",
        ];
      },
      /cannot activate an archived historical lane/,
    ],
    [
      "backbone-reactivation",
      (r) => {
        item(r).status = "complete";
        r.finish_states.knowledge_assurance.current_state = "complete";
        item(r, "H-REPOSITORY-BACKBONE").status = "in_progress";
        r.finish_states.repository_backbone.current_state = "in_progress";
        r.current_focus.work_item = "H-REPOSITORY-BACKBONE";
        r.current_focus.resumable_roots = ["H-REPOSITORY-BACKBONE"];
      },
      /cannot activate an archived historical lane/,
    ],
    [
      "wrong-active-focus",
      (r) => {
        r.current_focus.work_item = ps09OutcomeIds[1];
      },
      /does not match in_progress/,
    ],
    [
      "active-terminal-reason",
      (r) => {
        r.current_focus.terminal_reason = "Done";
      },
      /active PS09 terminal reason/,
    ],
    [
      "active-resumable-root",
      (r) => {
        r.current_focus.resumable_roots = [ps09OutcomeIds[1]];
      },
      /active PS09 resumable roots/,
    ],
    [
      "active-hides-ps09-action",
      (r) => {
        r.next_actions.pop();
      },
      /terminal next actions/,
    ],
    [
      "blocked-hides-maintenance-root",
      (r) => {
        r.current_focus.resumable_roots = [ps09OutcomeIds[1]];
      },
      /terminal PS09 resumable roots/,
      "blocked",
    ],
    [
      "blocked-hides-ps09-root",
      (r) => {
        r.current_focus.resumable_roots = [knowledgeAssuranceId];
      },
      /terminal PS09 resumable roots/,
      "blocked",
    ],
    [
      "blocked-hides-finish-blocker",
      (r) => {
        r.finish_states.knowledge_assurance.blocked_by = [];
      },
      /knowledge assurance finish blockers/,
      "blocked",
    ],
    [
      "blocked-action-order",
      (r) => {
        r.next_actions.reverse();
        r.next_actions.forEach((a, i) => {
          a.order = i + 1;
        });
      },
      /terminal next actions/,
      "blocked",
    ],
    [
      "completion-without-evidence",
      (r) => {
        item(r).evidence = [];
      },
      /complete without evidence/,
      "complete",
    ],
    [
      "completion-keeps-maintenance-root",
      (r) => {
        r.current_focus.resumable_roots.unshift(knowledgeAssuranceId);
      },
      /terminal PS09 resumable roots/,
      "complete",
    ],
    [
      "completion-finish-mismatch",
      (r) => {
        r.finish_states.knowledge_assurance.current_state = "in_progress";
      },
      /knowledge assurance finish state/,
      "complete",
    ],
  ];
  for (const dimension of ["sources", "domains", "requests", "bytes"]) {
    rejections.push([
      `nonzero-${dimension}`,
      (r) => {
        gate(r).scope.policy_acquisition_budget[dimension] = 1;
      },
      /knowledge assurance acquisition .* must remain 0/,
    ]);
  }
  rejections.push([
    "string-zero",
    (r) => {
      gate(r).scope.policy_acquisition_budget.bytes = "0";
    },
    /acquisition bytes must remain 0/,
  ]);
  for (const [name, mutate, expected, status = "in_progress"] of rejections) {
    await context.test(`reject ${name}`, async () => {
      const candidate = candidateFor(status);
      mutate(candidate);
      const result = await validate(name, candidate);
      assert.notEqual(result.status, 0, `${name} was accepted`);
      assert.match(`${result.stdout}\n${result.stderr}`, expected);
    });
  }
  await context.test(
    "production cannot opt into synthetic legacy interpretation",
    async () => {
      const result = await validate(
        "production-with-synthetic-flag",
        candidateFor("in_progress"),
        ["--synthetic-legacy-fixture"],
      );
      assert.notEqual(result.status, 0);
      assert.match(
        `${result.stdout}\n${result.stderr}`,
        /synthetic legacy fixture contract/,
      );
    },
  );
  await context.test(
    "maintenance cannot become historical convergence evidence",
    async () => {
      const registry = JSON.parse(
        await readFile(
          path.join(projectRoot, "docs/development/ps09-convergence.v1.json"),
          "utf8",
        ),
      );
      registry.components.push({
        id: knowledgeAssuranceId,
        disposition: "compatibility_fixture",
        evidence: ["README.md"],
        implementationEffect:
          "Invalid synthetic historical maintenance component.",
      });
      const registryPath = path.join(fixtureRoot, "maintenance-registry.json");
      await writeFile(registryPath, JSON.stringify(registry), "utf8");
      const result = await validate(
        "maintenance-in-history",
        candidateFor("in_progress"),
        [registryPath],
      );
      assert.notEqual(result.status, 0);
      assert.match(
        `${result.stdout}\n${result.stderr}`,
        /PS09 convergence component coverage/,
      );
    },
  );
});

test("schema 1.8 freezes spent authority and bounds the exact engineering review", async (context) => {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "policy-sentinel-ps09-roadmap-"),
  );
  context.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const item = (candidate, id = engineeringReviewId) =>
    candidate.work_items.find((entry) => entry.id === id);
  const gate = (candidate, id = engineeringReviewGateId) =>
    candidate.gates.find((entry) => entry.id === id);
  const candidateFor = (status) => {
    const candidate = withoutMakahDemo(clone(liveRoadmap));
    candidate.schema_version = "1.8";
    const maintenance = item(candidate);
    maintenance.status = status;
    maintenance.evidence = ["Synthetic bounded engineering review evidence."];
    delete maintenance.blocked_by;
    delete maintenance.safe_fallback;
    delete maintenance.unblocks_only_when;
    if (status === "blocked") {
      Object.assign(maintenance, {
        blocked_by: [engineeringReviewGateId],
        safe_fallback:
          "Preserve terminal evidence and the named synthetic blocker.",
        unblocks_only_when:
          "The named synthetic validation blocker is resolved.",
      });
    }
    Object.assign(candidate.finish_states.engineering_review, {
      current_state: status,
      blocked_by: status === "blocked" ? [engineeringReviewId] : [],
    });
    const roots =
      status === "complete"
        ? [ps09OutcomeIds[1]]
        : [engineeringReviewId, ps09OutcomeIds[1]];
    Object.assign(candidate.current_focus, {
      work_item: status === "in_progress" ? engineeringReviewId : null,
      terminal_reason:
        status === "in_progress"
          ? null
          : "Synthetic engineering review checkpoint.",
      resumable_roots: roots,
    });
    candidate.next_actions = roots.map((id, index) => ({
      order: index + 1,
      work_item: id,
      action: `Resolve ${id} within its separate authority.`,
    }));
    return candidate;
  };
  const validate = async (
    name,
    candidate,
    { cli = false, extraArguments = [] } = {},
  ) => {
    const fixturePath = path.join(fixtureRoot, `${name}.yaml`);
    await writeFile(
      fixturePath,
      serializeModuleFixture(candidate, cli),
      "utf8",
    );
    return cli
      ? spawnSync(
          process.execPath,
          [validatorPath, fixturePath, ...extraArguments],
          { cwd: projectRoot, encoding: "utf8" },
        )
      : validateActualModule(fixturePath, extraArguments);
  };
  const expectRejected = async (name, candidate, expected, options) => {
    const result = await validate(name, candidate, options);
    assert.notEqual(result.status, 0, `${name} was accepted`);
    assert.match(`${result.stdout}\n${result.stderr}`, expected);
  };
  const states = ["in_progress", "blocked", "complete"];
  const closedGateIds = [
    "G-PS09-RUN-06",
    "G-PS09-RUN-07",
    "G-PS09-RUN-08",
    "G-PS09-RC",
    "G-K0-S0-CONVERGENCE",
    "G-O0-CONVERGENCE",
    "G-B",
    "G-B-GRANTS",
    "G-B-CONGRESS",
    "G-B-GOVINFO",
    "G-B-REGULATIONS",
    "G-B-OR-OJD",
    "G-B-OR-OARD",
    "G-B-OR-GOVERNOR",
    "G-C",
    "G-E",
    "G-E-LICENSE",
    "G-E-REMOTE-PUSH",
    "G-E-PAGES",
    "G-E-PUBLISH",
    "G-F",
    "G-G",
    "G-H",
    "G-I",
    "G-PNW-COMMUNITY-AUTHORITY",
    "G-PNW-SOURCE-ACTIVATION",
  ];
  assert.equal(closedGateIds.length, 26);
  assert.equal(new Set(closedGateIds).size, 26);
  // The four general-development gates are admitted by rule at schema 1.10
  // and asserted exactly in that schema's own test; every other closed gate
  // must still be exactly these 26.
  assert.deepEqual(
    liveRoadmap.gates
      .filter(
        ({ id, state }) =>
          state === "closed" &&
          ![...generalDevelopmentGateIds, ...successorGateIds].includes(id),
      )
      .map(({ id }) => id),
    closedGateIds,
  );
  for (const status of states) {
    await context.test(
      `actual CLI and actual module accept ${status}`,
      async () => {
        for (const cli of [true, false]) {
          const result = await validate(
            `${status}-${cli ? "cli" : "module"}`,
            candidateFor(status),
            { cli },
          );
          assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
          assert.match(result.stdout, /Roadmap validation passed/);
        }
      },
    );
    for (const id of closedGateIds) {
      for (const mutation of ["state", "non-state"]) {
        await context.test(`${status} freezes ${id} ${mutation}`, async () => {
          const candidate = candidateFor(status);
          if (mutation === "state") {
            Object.assign(gate(candidate, id), {
              state: "approved",
              evidence: ["Synthetic invalid reopening."],
              approved_scope: ["Synthetic invalid scope."],
            });
          } else {
            gate(candidate, id).name += " synthetic unauthorized change";
          }
          await expectRejected(
            `${status}-${id}-${mutation}`,
            candidate,
            mutation === "state" && ["G-B", "G-E"].includes(id)
              ? /category gate and must remain closed/
              : /engineering review must preserve frozen (PS09 gates|26 closed gate objects)/,
          );
        });
      }
    }
    for (const [name, mutate, expected] of [
      [
        "spent-h01-reactivation",
        (r) => {
          item(r, knowledgeAssuranceId).status = "in_progress";
        },
        /frozen spent H01 item/,
      ],
      [
        "spent-h01-evidence",
        (r) => {
          item(r, knowledgeAssuranceId).evidence.push(
            "Synthetic fabricated evidence.",
          );
        },
        /frozen spent H01 item/,
      ],
      [
        "spent-h01-gate",
        (r) => {
          gate(
            r,
            knowledgeAssuranceGateId,
          ).scope.policy_acquisition_budget.bytes = 1;
        },
        /frozen spent H01 gate/,
      ],
      [
        "spent-run2-gate",
        (r) => {
          gate(r, "G-PS09-RUN-02").approval_scope = "Synthetic reused grant.";
        },
        /frozen PS09 gates/,
      ],
      [
        "spent-run2-reactivation",
        (r) => {
          item(r, ps09OutcomeIds[1]).status = "in_progress";
        },
        /frozen PS09 items/,
      ],
      [
        "spent-discovery-gate",
        (r) => {
          gate(r, "G-PS09-RUN-03").approval_scope = "Synthetic reused grant.";
        },
        /frozen PS09 gates/,
      ],
      [
        "spent-discovery-reactivation",
        (r) => {
          item(r, ps09OutcomeIds[4]).status = "in_progress";
        },
        /frozen PS09 items/,
      ],
      [
        "ps09-prerequisite",
        (r) => {
          item(r, ps09OutcomeIds[5]).dependencies = [ps09OutcomeIds[1]];
        },
        /frozen PS09 items/,
      ],
      [
        "ps09-acceptance",
        (r) => {
          item(r, ps09OutcomeIds[1]).acceptance[0] =
            "Synthetic weakened acceptance.";
        },
        /frozen PS09 items/,
      ],
      [
        "ps09-finish",
        (r) => {
          r.finish_states.ps09.satisfied_when.push(
            "Synthetic altered acceptance.",
          );
        },
        /frozen finish_states/,
      ],
      [
        "historical-completion-root",
        (r) => {
          r.completion_scope.local_release_candidate.required_outcomes.pop();
        },
        /frozen completion_scope/,
      ],
      [
        "h01-finish",
        (r) => {
          r.finish_states.knowledge_assurance.does_not_mean.pop();
        },
        /frozen finish_states/,
      ],
      [
        "h01-completion",
        (r) => {
          r.completion_scope.knowledge_assurance.accounting =
            "release_authority";
        },
        /frozen completion_scope/,
      ],
    ]) {
      await context.test(`${status} rejects ${name}`, async () => {
        const candidate = candidateFor(status);
        mutate(candidate);
        await expectRejected(`${status}-${name}`, candidate, expected);
      });
    }
  }
  await context.test(
    "actual CLI rejects fixed baseline tampering",
    async () => {
      const candidate = candidateFor("complete");
      gate(candidate, "G-E-PUBLISH").name += " synthetic altered authority";
      await expectRejected(
        "cli-fixed-pin",
        candidate,
        /frozen 26 closed gate objects/,
        { cli: true },
      );
    },
  );
  const rejections = [
    [
      "unknown-version",
      (r) => {
        r.schema_version = "2.0";
      },
      /unsupported production schema_version/,
    ],
    [
      "unknown-h-id",
      (r) => {
        item(r).id = "H-ENGINEERING-REVIEW-03";
      },
      /frozen work-item identities/,
    ],
    [
      "unknown-h-gate",
      (r) => {
        gate(r).id = "G-H-ENGINEERING-REVIEW-03";
      },
      /references unknown gate/,
    ],
    [
      "unknown-extra-h-gate",
      (r) => {
        r.gates.push({
          id: "G-H-OTHER",
          name: "Synthetic invented grant",
          state: "closed",
        });
      },
      /references unknown gate/,
    ],
    [
      "unknown-extra-h-item",
      (r) => {
        r.work_items.unshift({
          ...clone(item(r)),
          id: "H-OTHER",
          priority: 0,
          status: "complete",
        });
      },
      /frozen work-item identities/,
    ],
    [
      "missing-h02",
      (r) => {
        r.work_items = r.work_items.filter(
          ({ id }) => id !== engineeringReviewId,
        );
      },
      /engineering review item must be an object/,
    ],
    [
      "wrong-priority",
      (r) => {
        item(r).priority = 297;
      },
      /engineering review priority must remain 298/,
    ],
    [
      "wrong-class",
      (r) => {
        item(r).work_class = "source_implementation";
      },
      /engineering review work_class must remain/,
    ],
    [
      "wrong-dependencies",
      (r) => {
        item(r).dependencies = [ps09OutcomeIds[0]];
      },
      /engineering review dependencies must preserve exactly/,
    ],
    [
      "wrong-authorization",
      (r) => {
        item(r).authorization_gate = knowledgeAssuranceGateId;
      },
      /engineering review authorization_gate must remain/,
    ],
    [
      "wrong-instruction",
      (r) => {
        gate(r).owner_instruction += ".other";
      },
      /engineering review owner instruction must remain/,
    ],
    [
      "unknown-scope-field",
      (r) => {
        gate(r).scope.new_source_work = false;
      },
      /exact adopted prompt and zero policy budgets/,
    ],
    [
      "changed-prompt-digest",
      (r) => {
        gate(r).scope.prompt_sha256 = "0".repeat(64);
      },
      /exact adopted prompt and zero policy budgets/,
    ],
    [
      "extra-repair",
      (r) => {
        gate(r).scope.repairs.push("ER-05");
      },
      /exact adopted prompt and zero policy budgets/,
    ],
    [
      "reordered-repairs",
      (r) => {
        gate(r).scope.repairs.reverse();
      },
      /exact adopted prompt and zero policy budgets/,
    ],
    [
      "hides-active-ps09-root",
      (r) => {
        r.current_focus.resumable_roots = [engineeringReviewId];
      },
      /active PS09 resumable roots/,
    ],
    [
      "hides-active-ps09-action",
      (r) => {
        r.next_actions.pop();
      },
      /terminal next actions must list/,
    ],
    [
      "wrong-active-focus",
      (r) => {
        r.current_focus.work_item = knowledgeAssuranceId;
      },
      /does not match in_progress item/,
    ],
    [
      "max-one-active",
      (r) => {
        item(r, "PNW-05-SOURCE-AUTHORITY-PORTFOLIO-DISCOVERY").status =
          "in_progress";
      },
      /global current focus permits at most one/,
    ],
    [
      "missing-finish",
      (r) => {
        delete r.finish_states.engineering_review;
      },
      /engineering review finish scope must be an object/,
    ],
    [
      "wrong-finish-state",
      (r) => {
        r.finish_states.engineering_review.current_state = "complete";
      },
      /engineering review finish state must remain/,
    ],
    [
      "release-accounting",
      (r) => {
        r.completion_scope.engineering_review.accounting = "release";
      },
      /engineering review accounting must remain/,
    ],
    [
      "extra-finish-scope",
      (r) => {
        r.finish_states.another_maintenance = {};
      },
      /frozen finish_states/,
    ],
  ];
  for (const field of Object.keys(gate(candidateFor("in_progress")).scope)) {
    rejections.push([
      `missing-scope-${field}`,
      (r) => {
        delete gate(r).scope[field];
      },
      /exact adopted prompt and zero policy budgets/,
    ]);
  }
  for (const field of [
    "optimization_implementation",
    "policy_source_activation",
    "sealed_corpus_replay",
    "real_policy_build",
    "real_policy_browser",
    "release_authority",
  ]) {
    rejections.push([
      `forbidden-${field}`,
      (r) => {
        gate(r).scope[field] = true;
      },
      /exact adopted prompt and zero policy budgets/,
    ]);
  }
  for (const dimension of ["sources", "domains", "requests", "bytes"]) {
    rejections.push([
      `nonzero-${dimension}`,
      (r) => {
        gate(r).scope.policy_acquisition_budget[dimension] = 1;
      },
      /exact adopted prompt and zero policy budgets/,
    ]);
  }
  rejections.push([
    "string-zero",
    (r) => {
      gate(r).scope.policy_acquisition_budget.bytes = "0";
    },
    /exact adopted prompt and zero policy budgets/,
  ]);
  for (const [name, mutate, expected] of rejections) {
    await context.test(`reject ${name}`, async () => {
      const candidate = candidateFor("in_progress");
      mutate(candidate);
      await expectRejected(name, candidate, expected, {
        cli: name === "unknown-version",
      });
    });
  }
  for (const status of ["blocked", "complete"]) {
    for (const [name, mutate, expected] of rejections.filter(([name]) =>
      /^(?:nonzero-|forbidden-|string-zero$)/.test(name),
    )) {
      await context.test(`${status} rejects ${name}`, async () => {
        const candidate = candidateFor(status);
        mutate(candidate);
        await expectRejected(`${status}-${name}`, candidate, expected);
      });
    }
    await context.test(
      `${status} cannot activate a single archived lane`,
      async () => {
        const candidate = candidateFor(status);
        const archivedId = "PNW-05-SOURCE-AUTHORITY-PORTFOLIO-DISCOVERY";
        item(candidate, archivedId).status = "in_progress";
        Object.assign(candidate.current_focus, {
          work_item: archivedId,
          terminal_reason: null,
          resumable_roots: [archivedId],
        });
        candidate.next_actions = [
          {
            order: 1,
            work_item: archivedId,
            action: "Synthetic invalid historical continuation.",
          },
        ];
        await expectRejected(
          `${status}-single-archived-lane`,
          candidate,
          /PS09 execution cannot activate an archived historical lane/,
        );
      },
    );
  }
  await context.test(
    "object key order is harmless while all state pins still apply",
    async () => {
      const reverseKeys = (value) =>
        Array.isArray(value)
          ? value.map(reverseKeys)
          : value && typeof value === "object"
            ? Object.fromEntries(
                Object.entries(value)
                  .reverse()
                  .map(([key, entry]) => [key, reverseKeys(entry)]),
              )
            : value;
      const result = await validate(
        "reordered-object-keys",
        reverseKeys(candidateFor("complete")),
      );
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    },
  );
  await context.test(
    "exact historical fixture filters preserve the frozen 65 identities",
    async () => {
      const schema17 = withoutEngineeringReview(candidateFor("complete"));
      schema17.schema_version = "1.7";
      assert.equal(
        schema17.work_items.some(({ id }) => id === engineeringReviewId),
        false,
      );
      assert.equal(
        schema17.gates.some(({ id }) => id === engineeringReviewGateId),
        false,
      );
      assert.equal(
        schema17.work_items.some(({ id }) => id === knowledgeAssuranceId),
        true,
      );
      const result = await validate("schema17-exact-filter", schema17, {
        cli: true,
      });
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
      const historical = withoutKnowledgeAssurance(clone(schema17));
      for (const id of [engineeringReviewId, knowledgeAssuranceId]) {
        assert.equal(
          historical.work_items.some((entry) => entry.id === id),
          false,
        );
        assert.equal(
          historical.gates.some((entry) => entry.id === `G-${id}`),
          false,
        );
      }
      const historicalIds = historical.work_items
        .filter(
          ({ id }) =>
            !ps09OutcomeIds.includes(id) && !id.startsWith("RELEASE-"),
        )
        .map(({ id }) => id);
      const registry = JSON.parse(
        await readFile(
          path.join(projectRoot, "docs/development/ps09-convergence.v1.json"),
          "utf8",
        ),
      );
      assert.equal(historicalIds.length, 65);
      assert.deepEqual(
        new Set(historicalIds),
        new Set(registry.components.map(({ id }) => id)),
      );
      for (const id of [knowledgeAssuranceId, engineeringReviewId]) {
        const mutated = clone(registry);
        mutated.components.push({
          id,
          disposition: "compatibility_fixture",
          evidence: ["README.md"],
          implementationEffect: "Synthetic invalid maintenance registry entry.",
        });
        const registryPath = path.join(fixtureRoot, `${id}-registry.json`);
        await writeFile(registryPath, JSON.stringify(mutated), "utf8");
        await expectRejected(
          `registry-${id}`,
          candidateFor("in_progress"),
          /PS09 convergence component coverage/,
          { extraArguments: [registryPath] },
        );
      }
    },
  );
  for (const status of ["blocked", "complete"]) {
    await context.test(
      `${status} cannot hide or invent maintenance recovery roots`,
      async () => {
        const candidate = candidateFor(status);
        candidate.current_focus.resumable_roots =
          status === "blocked"
            ? [ps09OutcomeIds[1]]
            : [engineeringReviewId, ps09OutcomeIds[1]];
        await expectRejected(
          `${status}-roots`,
          candidate,
          /terminal PS09 resumable roots/,
        );
      },
    );
  }
});

test("schema 1.9 represents the Makah demo track without touching PS09", async (context) => {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "policy-sentinel-ps09-roadmap-"),
  );
  context.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const item = (candidate, id = makahDemoAcquisitionId) =>
    candidate.work_items.find((entry) => entry.id === id);
  const gate = (candidate, id = makahDemoAcquisitionGateId) =>
    candidate.gates.find((entry) => entry.id === id);
  const candidateFor = (status) => {
    const candidate = withoutGeneralDevelopment(clone(liveRoadmap));
    candidate.schema_version = "1.9";
    const acquisition = item(candidate);
    acquisition.status = status;
    acquisition.evidence = [
      "Synthetic bounded federal candidate acquisition evidence.",
    ];
    delete acquisition.blocked_by;
    delete acquisition.safe_fallback;
    delete acquisition.unblocks_only_when;
    if (status === "blocked") {
      Object.assign(acquisition, {
        blocked_by: [makahDemoAcquisitionGateId],
        safe_fallback:
          "Preserve acquired objects and keep PS09 and release gates closed.",
        unblocks_only_when:
          "The named synthetic validation blocker is resolved.",
      });
    }
    Object.assign(candidate.finish_states.makah_demo, {
      current_state: status,
      blocked_by: status === "blocked" ? [makahDemoAcquisitionId] : [],
    });
    const roots =
      status === "complete"
        ? [ps09OutcomeIds[1]]
        : [makahDemoAcquisitionId, ps09OutcomeIds[1]];
    Object.assign(candidate.current_focus, {
      work_item: status === "in_progress" ? makahDemoAcquisitionId : null,
      terminal_reason:
        status === "in_progress"
          ? null
          : "Synthetic bounded acquisition checkpoint.",
      resumable_roots: roots,
    });
    candidate.next_actions = roots.map((id, index) => ({
      order: index + 1,
      work_item: id,
      action: `Resolve ${id} within its separate authority.`,
    }));
    return candidate;
  };
  const validate = async (
    name,
    candidate,
    { cli = false, extraArguments = [] } = {},
  ) => {
    const fixturePath = path.join(fixtureRoot, `${name}.yaml`);
    await writeFile(
      fixturePath,
      serializeModuleFixture(candidate, cli),
      "utf8",
    );
    return cli
      ? spawnSync(
          process.execPath,
          [validatorPath, fixturePath, ...extraArguments],
          { cwd: projectRoot, encoding: "utf8" },
        )
      : validateActualModule(fixturePath, extraArguments);
  };
  const expectRejected = async (name, candidate, expected, options) => {
    const result = await validate(name, candidate, options);
    assert.notEqual(result.status, 0, `${name} was accepted`);
    assert.match(`${result.stdout}\n${result.stderr}`, expected);
  };
  const closedGateIds = [
    "G-PS09-RUN-06",
    "G-PS09-RUN-07",
    "G-PS09-RUN-08",
    "G-PS09-RC",
    "G-K0-S0-CONVERGENCE",
    "G-O0-CONVERGENCE",
    "G-B",
    "G-B-GRANTS",
    "G-B-CONGRESS",
    "G-B-GOVINFO",
    "G-B-REGULATIONS",
    "G-B-OR-OJD",
    "G-B-OR-OARD",
    "G-B-OR-GOVERNOR",
    "G-C",
    "G-E",
    "G-E-LICENSE",
    "G-E-REMOTE-PUSH",
    "G-E-PAGES",
    "G-E-PUBLISH",
    "G-F",
    "G-G",
    "G-H",
    "G-I",
    "G-PNW-COMMUNITY-AUTHORITY",
    "G-PNW-SOURCE-ACTIVATION",
  ];
  // See the schema 1.8 test: general-development gates are asserted exactly
  // in the schema 1.10 test.
  assert.deepEqual(
    liveRoadmap.gates
      .filter(
        ({ id, state }) =>
          state === "closed" &&
          ![...generalDevelopmentGateIds, ...successorGateIds].includes(id),
      )
      .map(({ id }) => id),
    closedGateIds,
  );
  for (const status of ["in_progress", "blocked", "complete"]) {
    await context.test(
      `actual CLI and actual module accept ${status}`,
      async () => {
        for (const cli of [true, false]) {
          const result = await validate(
            `${status}-${cli ? "cli" : "module"}`,
            candidateFor(status),
            { cli },
          );
          assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
          assert.match(result.stdout, /Roadmap validation passed/);
        }
      },
    );
  }
  const rejections = [
    [
      "third-makah-item",
      (r) => {
        const extra = clone(item(r, makahDemoGroundworkId));
        extra.id = "MAKAH-DEMO-03-OTHER";
        extra.priority = 295;
        r.work_items.push(extra);
        r.work_items.sort((a, b) => a.priority - b.priority);
      },
      /frozen work-item identities|preserved historical component identities/,
    ],
    [
      "renamed-makah-gate",
      (r) => {
        gate(r).id = "G-MAKAH-DEMO-99";
      },
      /references unknown gate/,
    ],
    [
      "ps09-item-frozen",
      (r) => {
        item(r, "PS09-06-LOCAL-RC").dependencies.push("B9-LONGTAIL");
      },
      /frozen PS09 items/,
    ],
    [
      "ps09-gate-frozen",
      (r) => {
        gate(r, "G-PS09-RUN-03").approval_scope = "Synthetic reused grant.";
      },
      /frozen PS09 gates/,
    ],
    [
      "wrong-priority",
      (r) => {
        item(r).priority = 295;
        r.work_items.sort((a, b) => a.priority - b.priority);
      },
      /makah demo acquisition priority must remain 297/,
    ],
    [
      "wrong-work-class",
      (r) => {
        item(r).work_class = "source_implementation";
      },
      /makah demo acquisition work_class must remain/,
    ],
    [
      "wrong-dependencies",
      (r) => {
        item(r).dependencies = ["PS09-01-REPOSITORY-CONVERGENCE"];
      },
      /makah demo acquisition dependencies must preserve exactly/,
    ],
    [
      "wrong-authorization-gate",
      (r) => {
        item(r).authorization_gate = knowledgeAssuranceGateId;
      },
      /makah demo acquisition authorization_gate must remain/,
    ],
    [
      "historical-item-cannot-depend-on-makah",
      (r) => {
        item(r, "B9-LONGTAIL").dependencies.push(makahDemoAcquisitionId);
      },
      /cannot depend on non-release makah demo work/,
    ],
    [
      "gate01-nonzero-budget",
      (r) => {
        gate(
          r,
          makahDemoGroundworkGateId,
        ).scope.policy_acquisition_budget.sources = 1;
      },
      /exact zero-budget local scope/,
    ],
    [
      "missing-makah-finish",
      (r) => {
        delete r.finish_states.makah_demo;
      },
      /makah demo finish scope must be an object/,
    ],
    [
      "makah-finish-mismatch",
      (r) => {
        r.finish_states.makah_demo.current_state = "blocked";
      },
      /makah demo finish state must match/,
    ],
    [
      "makah-completion-accounting",
      (r) => {
        r.completion_scope.makah_demo.accounting = "release";
      },
      /makah demo accounting must remain/,
    ],
    [
      "groundwork-status-drift",
      (r) => {
        item(r, makahDemoGroundworkId).status = "in_progress";
      },
      /makah demo groundwork status must remain "complete"/,
      "blocked",
    ],
    [
      "groundwork-evidence-missing-commit",
      (r) => {
        item(r, makahDemoGroundworkId).evidence = [
          "Synthetic evidence missing the required references.",
        ];
      },
      /cite the outcome handoff and commit 554e105/,
    ],
    [
      "hides-active-makah-root",
      (r) => {
        r.current_focus.resumable_roots = [ps09OutcomeIds[1]];
      },
      /active PS09 resumable roots/,
    ],
  ];
  for (const dimension of ["requests", "retries", "documents"]) {
    const value = { requests: 11, retries: 1, documents: 9 }[dimension];
    rejections.push([
      `gate02-${dimension}-drift`,
      (r) => {
        if (dimension === "requests") {
          gate(r).scope.policy_acquisition_budget.requests = value;
        } else {
          gate(r).scope[dimension] = value;
        }
      },
      /exact D-069 ceilings/,
    ]);
  }
  for (const field of [
    "publication",
    "source_admission",
    "nation_association",
  ]) {
    rejections.push([
      `gate02-${field}-true`,
      (r) => {
        gate(r).scope[field] = true;
      },
      /exact D-069 ceilings/,
    ]);
  }
  rejections.push([
    "gate02-extra-host",
    (r) => {
      gate(r).scope.hosts.push("extra.example.gov");
    },
    /exact D-069 ceilings/,
  ]);
  rejections.push([
    "gate02-removed-host",
    (r) => {
      gate(r).scope.hosts.pop();
    },
    /exact D-069 ceilings/,
  ]);
  for (const [name, mutate, expected, status = "in_progress"] of rejections) {
    await context.test(`reject ${name}`, async () => {
      const candidate = candidateFor(status);
      mutate(candidate);
      await expectRejected(name, candidate, expected);
    });
  }
  await context.test(
    "a 1.8 ledger carrying makah identities is rejected",
    async () => {
      const candidate = clone(liveRoadmap);
      candidate.schema_version = "1.8";
      await expectRejected(
        "makah-in-1.8-ledger",
        candidate,
        /frozen work-item identities|references unknown gate|makah demo gate requires schema 1\.9/,
        { cli: true },
      );
    },
  );
});

test("schema 1.10 admits the general-development graph by rule and keeps every other identity frozen", async (context) => {
  const liveRoadmap = asSchema110(
    clone(
      parse(await readFile(path.resolve(projectRoot, "ROADMAP.yaml"), "utf8")),
    ),
  );
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "policy-sentinel-ps09-roadmap-"),
  );
  context.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const item = (candidate, id) =>
    candidate.work_items.find((entry) => entry.id === id);
  const gate = (candidate, id) =>
    candidate.gates.find((entry) => entry.id === id);
  const generalDevelopmentItems = (candidate) =>
    candidate.work_items.filter(isGeneralDevelopmentItem);
  const realignment = "GD-00-REALIGNMENT-AUDIT-DESIGN";
  const designationRegistry = "GD-20-DESIGNATION-REGISTRY-CONTRACT";
  const userSuppliedSourceClass = "GD-23-USER-SUPPLIED-SOURCE-CLASS";
  const interopAdapter = "GD-16-INTEROP-PURE-ADAPTER";
  const validate = async (name, candidate, { cli = false } = {}) => {
    const fixturePath = path.join(fixtureRoot, `${name}.yaml`);
    await writeFile(
      fixturePath,
      serializeModuleFixture(candidate, cli),
      "utf8",
    );
    return cli
      ? spawnSync(process.execPath, [validatorPath, fixturePath], {
          cwd: projectRoot,
          encoding: "utf8",
        })
      : validateActualModule(fixturePath);
  };
  const expectAccepted = async (name, candidate, options) => {
    const result = await validate(name, candidate, options);
    assert.equal(
      result.status,
      0,
      `${name}: ${result.stdout}\n${result.stderr}`,
    );
    assert.match(result.stdout, /Roadmap validation passed/);
  };
  const expectRejected = async (name, candidate, expected, options) => {
    const result = await validate(name, candidate, options);
    assert.notEqual(result.status, 0, `${name} was accepted`);
    assert.match(`${result.stdout}\n${result.stderr}`, expected);
  };
  // An active checkpoint: the lowest-priority-number ready general-development
  // item is in_progress, whatever the live ledger's own checkpoint is.
  const active = () => {
    const candidate = clone(liveRoadmap);
    let current = generalDevelopmentItems(candidate).find(
      ({ status }) => status === "in_progress",
    );
    if (!current) {
      current = generalDevelopmentItems(candidate)
        .filter(({ status }) => status === "ready")
        .sort((left, right) => left.priority - right.priority)[0];
      current.status = "in_progress";
    }
    Object.assign(candidate.current_focus, {
      work_item: current.id,
      terminal_reason: null,
      resumable_roots: [current.id, ps09OutcomeIds[1]],
    });
    return candidate;
  };

  assert.equal(liveRoadmap.schema_version, "1.10");
  assert.deepEqual(
    liveRoadmap.gates
      .filter(({ id }) => generalDevelopmentGateIds.includes(id))
      .map(({ id, state }) => [id, state]),
    [
      ["G-GENERAL-DEV-01", "approved"],
      ["G-GD-NATIONWIDE-CONTRACT", "closed"],
      ["G-GD-INTEROP", "closed"],
      ["G-GD-PRIVATE-CONTEXT", "approved"],
    ],
  );
  for (const entry of generalDevelopmentItems(liveRoadmap)) {
    assert.equal(entry.work_class, "general_development_local", entry.id);
    assert.match(entry.decision_ref, /^D-\d{3}$/, entry.id);
    assert.ok(
      generalDevelopmentGateIds.includes(entry.authorization_gate),
      entry.id,
    );
  }

  await context.test(
    "actual CLI and module accept the live ledger",
    async () => {
      await expectAccepted("live-cli", clone(liveRoadmap), { cli: true });
      await expectAccepted("live-module", clone(liveRoadmap));
    },
  );
  await context.test(
    "an active general-development item is admitted",
    async () => {
      await expectAccepted("active", active());
    },
  );
  await context.test(
    "a planning act admits a new item with no validator change",
    async () => {
      const candidate = clone(liveRoadmap);
      candidate.work_items.push({
        id: "GD-99-SYNTHETIC-PLANNING-ACT",
        priority:
          Math.max(...candidate.work_items.map(({ priority }) => priority)) + 1,
        milestone: generalDevelopmentMilestone,
        title: "Synthetic item added by a register entry and a ledger edit",
        status: "not_started",
        work_class: "general_development_local",
        decision_ref: "D-071",
        authorization_gate: "G-GENERAL-DEV-01",
        dependencies: [interopAdapter],
        acceptance: ["Synthetic acceptance line."],
        evidence: [],
      });
      await expectAccepted("planning-act", candidate);
    },
  );

  await context.test(
    "deferred general-development work remains in historical recovery actions",
    async () => {
      const candidate = clone(liveRoadmap);
      const id = "GD-99-SYNTHETIC-DEFERRED-ROOT";
      candidate.work_items.push({
        id,
        priority:
          Math.max(...candidate.work_items.map((entry) => entry.priority)) + 1,
        milestone: generalDevelopmentMilestone,
        title: "Synthetic deliberately postponed incomplete work",
        status: "deferred",
        reason: "Synthetic scheduling decision; acceptance is not waived.",
        work_class: "general_development_local",
        decision_ref: "D-071",
        authorization_gate: "G-GENERAL-DEV-01",
        dependencies: [],
        acceptance: ["Synthetic acceptance line."],
        evidence: [],
      });
      asSchema110(candidate);
      assert.ok(
        candidate.next_actions.some((action) => action.work_item === id),
      );
      await expectAccepted("deferred-root-retained", candidate);
      candidate.next_actions = candidate.next_actions.filter(
        (action) => action.work_item !== id,
      );
      await expectRejected(
        "deferred-root-omitted",
        candidate,
        /terminal next actions.*missing: GD-99-SYNTHETIC-DEFERRED-ROOT/u,
      );
    },
  );

  const rejections = [
    [
      "missing-decision-ref",
      (r) => {
        delete item(r, designationRegistry).decision_ref;
      },
      /decision_ref must be a non-empty string/,
    ],
    [
      "unresolvable-decision-ref",
      (r) => {
        item(r, designationRegistry).decision_ref = "D-999";
      },
      /decision_ref D-999 does not resolve to a decision-register entry/,
    ],
    [
      "ruling-id-is-not-a-decision",
      (r) => {
        item(r, designationRegistry).decision_ref = "RL-08";
      },
      /decision_ref RL-08 does not resolve to a decision-register entry/,
    ],
    [
      "wrong-gate",
      (r) => {
        item(r, designationRegistry).authorization_gate = "G-A";
      },
      /authorization_gate must name a general-development gate/,
    ],
    [
      "missing-gate",
      (r) => {
        delete item(r, designationRegistry).authorization_gate;
      },
      /authorization_gate must name a general-development gate/,
    ],
    [
      "wrong-work-class",
      (r) => {
        item(r, designationRegistry).work_class = "repository_governance";
      },
      /work_class must be general_development_local/,
    ],
    [
      "work-class-outside-milestone",
      (r) => {
        item(r, "B9-LONGTAIL").work_class = "general_development_local";
      },
      /general_development_local is reserved for milestone General development/,
    ],
    [
      "identity-outside-pattern",
      (r) => {
        const invalidId = "GENDEV-23-USER-SUPPLIED";
        item(r, userSuppliedSourceClass).id = invalidId;
        // Keep references valid so this case reaches the identity guard.
        for (const entry of r.work_items) {
          entry.dependencies = entry.dependencies.map((id) =>
            id === userSuppliedSourceClass ? invalidId : id,
          );
        }
      },
      /general-development identity must match GD-nn-NAME/,
    ],
    [
      "depends-on-frozen-item",
      (r) => {
        item(r, designationRegistry).dependencies.push(ps09OutcomeIds[4]);
      },
      /may depend only on general-development items/,
    ],
    [
      "frozen-item-depends-on-general-development",
      (r) => {
        item(r, "B9-LONGTAIL").dependencies.push(realignment);
      },
      /cannot depend on non-release general-development work/,
    ],
    [
      "frozen-item-relabelled-into-milestone",
      (r) => {
        Object.assign(item(r, "B9-LONGTAIL"), {
          milestone: generalDevelopmentMilestone,
          work_class: "general_development_local",
          decision_ref: "D-071",
          authorization_gate: "G-GENERAL-DEV-01",
        });
      },
      /general-development identity must match|may depend only on general-development items|frozen work-item identities/,
    ],
    [
      "gd-prefixed-item-under-frozen-milestone",
      (r) => {
        r.work_items.push({
          id: "GD-98-OUTSIDE-THE-MILESTONE",
          priority:
            Math.max(...r.work_items.map(({ priority }) => priority)) + 1,
          milestone: "PS09 Run 9",
          title: "Synthetic item that borrows the prefix only",
          status: "ready",
          dependencies: [],
          acceptance: ["Synthetic acceptance line."],
          evidence: [],
        });
      },
      /frozen work-item identities/,
    ],
    [
      "new-item-under-frozen-milestone",
      (r) => {
        r.work_items.push({
          id: "PS09-09-EXTRA-RELEASE-ROOT",
          priority:
            Math.max(...r.work_items.map(({ priority }) => priority)) + 1,
          milestone: "PS09 Run 9",
          title: "Synthetic second release root",
          status: "blocked",
          dependencies: [],
          authorization_gate: "G-PS09-RUN-06",
          blocked_by: ["G-PS09-RUN-06"],
          safe_fallback: "Synthetic fallback.",
          unblocks_only_when: "Synthetic condition.",
          acceptance: ["Synthetic acceptance line."],
          evidence: ["Synthetic evidence."],
        });
      },
      /frozen work-item identities/,
    ],
    [
      "general-development-gate-authorizes-frozen-item",
      (r) => {
        item(r, "B9-LONGTAIL").authorization_gate = "G-GENERAL-DEV-01";
      },
      /general-development gate G-GENERAL-DEV-01 authorizes only milestone General development/,
    ],
    [
      "fifth-general-development-gate",
      (r) => {
        r.gates.push({
          ...clone(gate(r, "G-GD-INTEROP")),
          id: "G-GD-ANOTHER",
        });
      },
      /references unknown gate G-GD-ANOTHER/,
    ],
    [
      "refactor-gate-nonzero-budget",
      (r) => {
        gate(r, "G-GENERAL-DEV-01").scope.policy_acquisition_budget.requests =
          1;
      },
      /G-GENERAL-DEV-01 must preserve its exact synthetic local scope/,
    ],
    [
      "private-context-gate-real-data",
      (r) => {
        gate(r, "G-GD-PRIVATE-CONTEXT").scope.real_private_data = true;
      },
      /G-GD-PRIVATE-CONTEXT must preserve its exact synthetic local scope/,
    ],
    [
      "interop-gate-approved-with-budget",
      (r) => {
        Object.assign(gate(r, "G-GD-INTEROP"), {
          state: "approved",
          evidence: ["Synthetic approval."],
          scope: {
            kind: "approved_interop_pure_adapter",
            policy_acquisition_budget: {
              sources: 0,
              domains: 0,
              requests: 1,
              bytes: 0,
            },
            policy_source_activation: false,
            real_private_data: false,
            publication: false,
            release_authority: false,
          },
        });
      },
      /approved general-development gate G-GD-INTEROP must keep zero acquisition budget/,
    ],
    [
      "closed-gate-without-unblock-condition",
      (r) => {
        delete gate(r, "G-GD-NATIONWIDE-CONTRACT").unblocks_only_when;
      },
      /G-GD-NATIONWIDE-CONTRACT requires unblocks_only_when/,
    ],
    [
      "gate-decision-ref-unresolvable",
      (r) => {
        gate(r, "G-GD-INTEROP").decision_ref = "D-998";
      },
      /decision_ref D-998 does not resolve to a decision-register entry/,
    ],
    [
      "refactor-gate-closed-under-active-work",
      (r) => {
        gate(r, "G-GENERAL-DEV-01").state = "closed";
        for (const entry of generalDevelopmentItems(r)) {
          if (
            entry.status === "blocked" &&
            entry.authorization_gate === "G-GENERAL-DEV-01"
          ) {
            entry.blocked_by.push("G-GENERAL-DEV-01");
          }
        }
      },
      /cannot be \w+ while authorization gate G-GENERAL-DEV-01 is closed/,
    ],
    [
      "complete-without-completion-commit",
      (r) => {
        delete item(r, realignment).completion_commit;
      },
      /completion_commit must be a full commit id/,
    ],
    [
      "complete-with-undated-completion",
      (r) => {
        item(r, realignment).completed_on = "2026-09-22";
      },
      /completed_on must be an ISO 8601 commit timestamp/,
    ],
    [
      "missing-completion-scope",
      (r) => {
        delete r.completion_scope.general_development;
      },
      /general development completion scope/,
    ],
    [
      "release-accounting",
      (r) => {
        r.completion_scope.general_development.accounting = "release";
      },
      /general development accounting must remain "non_release_local_development"/,
    ],
    [
      "hides-active-general-development-root",
      (r) => {
        r.current_focus.resumable_roots = [ps09OutcomeIds[1]];
      },
      /active PS09 resumable roots/,
    ],
    [
      "skips-lower-priority-ready-item",
      (r) => {
        const current = item(r, r.current_focus.work_item);
        const later = generalDevelopmentItems(r)
          .filter(
            ({ status, priority }) =>
              status === "ready" && priority > current.priority,
          )
          .at(-1);
        assert.ok(later, "the fixture needs a later ready item");
        current.status = "ready";
        later.status = "in_progress";
        r.current_focus.work_item = later.id;
        r.current_focus.resumable_roots = [later.id, ps09OutcomeIds[1]];
      },
      /must select the lowest-priority-number ready general-development item/,
    ],
  ];
  for (const [name, mutate, expected] of rejections) {
    await context.test(`reject ${name}`, async () => {
      const candidate = active();
      mutate(candidate);
      await expectRejected(name, candidate, expected);
    });
  }
  await context.test(
    "a 1.9 ledger carrying general-development identities is rejected",
    async () => {
      const candidate = clone(liveRoadmap);
      candidate.schema_version = "1.9";
      await expectRejected(
        "general-development-in-1.9-ledger",
        candidate,
        /general development gate requires schema 1\.10|references unknown gate/,
        { cli: true },
      );
    },
  );
});

test("schema 1.11 makes general development the current local release without changing historical authority", async (context) => {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "policy-sentinel-gd-roadmap-"),
  );
  context.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const validate = async (name, candidate) => {
    const fixturePath = path.join(fixtureRoot, `${name}.yaml`);
    await writeFile(fixturePath, serializeModuleFixture(candidate), "utf8");
    return validateActualModule(fixturePath);
  };
  assert.equal(liveRoadmap.schema_version, "1.11");
  const valid = await validate("live", liveRoadmap);
  assert.equal(valid.status, 0, `${valid.stdout}\n${valid.stderr}`);
  const scope = (r) => r.completion_scope.general_development;
  const gate = (r, id) => r.gates.find((entry) => entry.id === id);
  const item = (r, id) => r.work_items.find((entry) => entry.id === id);
  await context.test("bounded checkpoint may retain ready work", async () => {
    const candidate = clone(liveRoadmap);
    const active = candidate.work_items.find(
      ({ status }) => status === "in_progress",
    );
    if (active) active.status = "ready";
    Object.assign(candidate.current_focus, {
      work_item: null,
      terminal_reason: "Synthetic validated bounded checkpoint.",
      resumable_roots: candidate.next_actions.map(({ work_item }) => work_item),
    });
    const result = await validate("bounded-checkpoint", candidate);
    assert.equal(result.status, 0, result.stderr);
  });
  await context.test(
    "complete synthetic acceptance requires the entire current graph",
    async () => {
      const candidate = clone(liveRoadmap);
      for (const id of scope(candidate).required_outcomes) {
        Object.assign(item(candidate, id), {
          status: "complete",
          evidence: [
            "Synthetic validator fixture only; no actual demonstration or source acceptance.",
          ],
          completion_commit: "0".repeat(40),
          completed_on: "2026-10-07T00:00:00Z",
        });
      }
      Object.assign(gate(candidate, scope(candidate).acceptance_gate), {
        state: "satisfied",
        evidence: ["Synthetic validator fixture only."],
      });
      candidate.finish_states.general_development.current_state = "complete";
      candidate.finish_states.general_development.blocked_by = [];
      Object.assign(candidate.current_focus, {
        work_item: null,
        terminal_reason: "Synthetic complete graph fixture.",
        resumable_roots: [],
      });
      candidate.next_actions = [];
      const result = await validate("synthetic-complete", candidate);
      assert.equal(result.status, 0, result.stderr);
    },
  );
  const cases = [
    [
      "successor-authority-in-old-schema",
      (r) => {
        r.schema_version = "1.10";
      },
      /references unknown gate G-GD-SUCCESSOR-IMPLEMENTATION/,
    ],
    [
      "omit-required-capability",
      (r) => {
        scope(r).required_outcomes.pop();
      },
      /general engine required outcomes/,
    ],
    [
      "omit-demonstration",
      (r) => {
        scope(r).demonstration_outcomes.pop();
      },
      /general engine demonstrations/,
    ],
    [
      "replace-current-root",
      (r) => {
        scope(r).release_root = ps09OutcomeIds[5];
      },
      /general engine release root/,
    ],
    [
      "replace-historical-root",
      (r) => {
        scope(r).historical_release_root = "B10-RC";
      },
      /general engine historical root/,
    ],
    [
      "wrong-crosswalk",
      (r) => {
        scope(r).acceptance_crosswalk = "README.md";
      },
      /general engine acceptance crosswalk/,
    ],
    [
      "missing-release-dependency",
      (r) => {
        item(r, scope(r).release_root).dependencies = [];
      },
      /general engine release dependency closure/,
    ],
    [
      "false-release-completion",
      (r) => {
        r.finish_states.general_development.current_state = "complete";
      },
      /active general engine finish|release completion/,
    ],
    [
      "false-acceptance",
      (r) => {
        gate(r, scope(r).acceptance_gate).state = "satisfied";
        gate(r, scope(r).acceptance_gate).evidence = [
          "Synthetic false acceptance.",
        ];
      },
      /release completion/,
    ],
    [
      "unreviewed-dispatch",
      (r) => {
        gate(
          r,
          "G-GD-PUBLIC-ACQUISITION",
        ).scope.policy_acquisition_budget.dispatch_requires_reviewed_manifest =
          false;
      },
      /successor gate .* scope/,
    ],
    [
      "larger-managed-cap",
      (r) => {
        gate(r, "G-GD-PUBLIC-ACQUISITION").scope.policy_acquisition_budget
          .total_managed_bytes++;
      },
      /successor gate .* scope/,
    ],
    [
      "publication-through-acquisition",
      (r) => {
        gate(r, "G-GD-PUBLIC-ACQUISITION").scope.publication = true;
      },
      /successor gate .* scope/,
    ],
    [
      "private-data-through-assessment",
      (r) => {
        gate(r, "G-GD-ATNI-LOCAL-ASSESSMENT").scope.real_private_data = true;
      },
      /successor gate .* scope/,
    ],
    [
      "acquisition-through-implementation",
      (r) => {
        gate(
          r,
          "G-GD-SUCCESSOR-IMPLEMENTATION",
        ).scope.policy_acquisition_budget.requests = 1;
      },
      /successor gate .* scope/,
    ],
    [
      "historical-gate-reopened",
      (r) => {
        gate(r, "G-PS09-RC").state = "approved";
        gate(r, "G-PS09-RC").evidence = ["Synthetic incorrect approval."];
      },
      /frozen PS09 gates/,
    ],
    [
      "historical-finish-rewritten",
      (r) => {
        r.finish_states.ps09.current_state = "complete";
      },
      /frozen finish_states/,
    ],
  ];
  for (const [name, mutate, expected] of cases) {
    await context.test(name, async () => {
      const candidate = clone(liveRoadmap);
      mutate(candidate);
      const result = await validate(name, candidate);
      assert.notEqual(result.status, 0, name);
      assert.match(result.stderr, expected);
    });
  }
});

test("PS09 release accounting converges without reopening archived lanes", async (context) => {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "policy-sentinel-ps09-roadmap-"),
  );
  context.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const item = (candidate, id) =>
    candidate.work_items.find((entry) => entry.id === id);
  const gate = (candidate, id) =>
    candidate.gates.find((entry) => entry.id === id);
  const registry = {
    schemaVersion: "1.0.0",
    canonicalReleaseRoot: ps09OutcomeIds[5],
    requiredOutcomes: ps09OutcomeIds.slice(0, 6),
    conditionalOutcomes: ps09OutcomeIds.slice(6),
    components: liveRoadmap.work_items
      .filter(
        ({ id }) =>
          !ps09OutcomeIds.includes(id) &&
          !id.startsWith("RELEASE-") &&
          id !== knowledgeAssuranceId &&
          id !== engineeringReviewId &&
          !makahDemoIds.includes(id) &&
          !id.startsWith("GD-"),
      )
      .map(({ id }) => ({
        id,
        disposition: "compatibility_fixture",
        evidence: ["README.md"],
        implementationEffect:
          "Synthetic registry-validation fixture; no component adoption.",
      })),
  };
  const actions = (candidate, ids) => {
    candidate.next_actions = ids.map((id, index) => ({
      order: index + 1,
      work_item: id,
      action: `Resolve ${id}.`,
    }));
  };
  const active = (schemaVersion = "1.5") => {
    const candidate = withoutKnowledgeAssurance(clone(liveRoadmap));
    candidate.schema_version = schemaVersion;
    const dependencies =
      schemaVersion === "1.6"
        ? [[], [0], [0], [2], [2, 3], [1, 4], [4], [5]]
        : [[], [0], [0, 1], [1, 2], [2, 3], [4], [4], [5]];
    for (const [index, id] of ps09OutcomeIds.entries()) {
      const entry = item(candidate, id);
      entry.dependencies = dependencies[index].map(
        (dependency) => ps09OutcomeIds[dependency],
      );
      entry.status =
        index === 0
          ? "in_progress"
          : index === 1
            ? "blocked"
            : index < 6
              ? "not_started"
              : "deferred";
      if (index !== 1) delete entry.blocked_by;
      gate(candidate, entry.authorization_gate).state =
        index === 0 ? "approved" : "closed";
    }
    gate(candidate, "G-PS09-RC").state = "closed";
    candidate.finish_states.ps09 = {
      current_state: "in_progress",
      release_root: ps09OutcomeIds[5],
      satisfied_when: ["Synthetic exact acceptance."],
    };
    candidate.current_focus.work_item = ps09OutcomeIds[0];
    candidate.current_focus.terminal_reason = null;
    candidate.current_focus.resumable_roots = [ps09OutcomeIds[0]];
    actions(candidate, ps09OutcomeIds.slice(0, 2));
    return candidate;
  };
  const terminalRunOne = () => {
    const candidate = active();
    item(candidate, ps09OutcomeIds[0]).status = "complete";
    candidate.finish_states.ps09.current_state = "blocked";
    candidate.finish_states.ps09.blocked_by = [ps09OutcomeIds[1]];
    candidate.current_focus.work_item = null;
    candidate.current_focus.terminal_reason =
      "Run 1 accepted; exact Run 2 authority remains closed.";
    candidate.current_focus.resumable_roots = [ps09OutcomeIds[1]];
    actions(candidate, [ps09OutcomeIds[1]]);
    return candidate;
  };
  const complete = () => {
    const candidate = active();
    for (const id of ps09OutcomeIds.slice(0, 6)) {
      const entry = item(candidate, id);
      entry.status = "complete";
      entry.evidence = ["Synthetic objective completion evidence."];
      delete entry.blocked_by;
      const authorization = gate(candidate, entry.authorization_gate);
      authorization.state = "approved";
      authorization.evidence = ["Synthetic exact tranche authorization."];
    }
    Object.assign(gate(candidate, "G-PS09-RC"), {
      state: "satisfied",
      evidence: ["Synthetic canonical release acceptance."],
    });
    candidate.finish_states.ps09.current_state = "complete";
    candidate.current_focus.work_item = null;
    candidate.current_focus.terminal_reason =
      "Canonical local acceptance complete; publication remains closed.";
    candidate.current_focus.resumable_roots = [];
    actions(candidate, []);
    return candidate;
  };
  const validate = async (name, candidate, candidateRegistry = registry) => {
    const fixturePath = path.join(fixtureRoot, `${name}.yaml`);
    const registryPath = path.join(fixtureRoot, `${name}.json`);
    const cli = [
      "adopted-general-jurisdiction-run",
      "active",
      "active-v2",
      "terminal-run-one",
      "canonical-rc",
      "v2-missing-identity-release-gate",
    ].includes(name);
    await writeFile(
      fixturePath,
      serializeModuleFixture(candidate, cli),
      "utf8",
    );
    await writeFile(registryPath, JSON.stringify(candidateRegistry), "utf8");
    if (
      ![
        "adopted-general-jurisdiction-run",
        "active",
        "active-v2",
        "terminal-run-one",
        "canonical-rc",
        "v2-missing-identity-release-gate",
      ].includes(name)
    ) {
      return validateActualModule(fixturePath, [registryPath]);
    }
    return spawnSync(
      process.execPath,
      [validatorPath, fixturePath, registryPath],
      { cwd: projectRoot, encoding: "utf8" },
    );
  };
  for (const [name, candidate] of [
    ["adopted-general-jurisdiction-run", liveRoadmap],
    ["active", active()],
    ["active-v2", active("1.6")],
    ["terminal-run-one", terminalRunOne()],
    ["canonical-rc", complete()],
  ]) {
    const result = await validate(name, candidate);
    assert.equal(
      result.status,
      0,
      `${name}: ${result.stdout}\n${result.stderr}`,
    );
  }
  assert.equal(liveRoadmap.schema_version, "1.11");
  assert.equal(liveWorkItem(ps09OutcomeIds[1])?.status, "blocked");
  assert.deepEqual(liveWorkItem(ps09OutcomeIds[2]).dependencies, [
    ps09OutcomeIds[0],
  ]);
  assert.deepEqual(liveWorkItem(ps09OutcomeIds[5]).dependencies, [
    ps09OutcomeIds[1],
    ps09OutcomeIds[4],
  ]);
  // Isolate the graph rejection from readiness changes as live work completes.
  const missingIdentityGate = active("1.6");
  item(missingIdentityGate, ps09OutcomeIds[5]).dependencies = [
    ps09OutcomeIds[4],
  ];
  const missingGateResult = await validate(
    "v2-missing-identity-release-gate",
    missingIdentityGate,
  );
  assert.notEqual(missingGateResult.status, 0);
  assert.match(
    `${missingGateResult.stdout}\n${missingGateResult.stderr}`,
    /dependencies must preserve exactly/,
  );
  const rejects = [
    [
      "hidden-second-root",
      (r) => {
        r.completion_scope.hidden_second_rc = { required_outcomes: ["B10-RC"] };
      },
      /canonical completion scopes/,
    ],
    [
      "hidden-second-finish",
      (r) => {
        r.finish_states.hidden_second_rc = { current_state: "complete" };
      },
      /canonical finish states/,
    ],
    [
      "wrong-release-root",
      (r) => {
        r.completion_scope.ps09.release_root = "B10-RC";
      },
      /PS09 release root/,
    ],
    [
      "missing-required-outcome",
      (r) => {
        r.completion_scope.ps09.required_outcomes.pop();
      },
      /PS09 required outcomes/,
    ],
    [
      "mandatory-conditional",
      (r) => {
        r.completion_scope.ps09.required_outcomes.push(ps09OutcomeIds[6]);
      },
      /PS09 required outcomes/,
    ],
    [
      "wrong-conditional",
      (r) => {
        r.completion_scope.ps09.conditional_outcomes.reverse();
      },
      /PS09 conditional outcomes/,
    ],
    [
      "missing-rc-gate",
      (r) => {
        r.gates = r.gates.filter(({ id }) => id !== "G-PS09-RC");
      },
      /G-PS09-RC acceptance gate is missing/,
    ],
    [
      "wrong-run-gate",
      (r) => {
        item(r, ps09OutcomeIds[0]).authorization_gate = "G-PNW-IMPLEMENTATION";
      },
      /authorization gate/,
    ],
    [
      "old-dependency",
      (r) => {
        item(r, ps09OutcomeIds[0]).dependencies = ["B3-PIPELINE"];
      },
      /dependencies/,
    ],
    [
      "k0-dependency",
      (r) => {
        item(r, ps09OutcomeIds[0]).dependencies = ["K0-LIFECYCLE"];
      },
      /dependencies/,
    ],
    [
      "publication-bypass",
      (r) => {
        item(r, "RELEASE-LICENSE").dependencies = ["B3-PIPELINE"];
      },
      /single public-beta prerequisite/,
    ],
    [
      "publication-gate-bypass",
      (r) => {
        item(r, "RELEASE-PUBLISH").authorization_gate = "G-PS09-RUN-01";
      },
      /exact publication gate/,
    ],
    [
      "active-claimed-not-started",
      (r) => {
        r.finish_states.ps09.current_state = "not_started";
      },
      /active required PS09 item/,
    ],
    [
      "active-claimed-blocked",
      (r) => {
        r.finish_states.ps09.current_state = "blocked";
        r.finish_states.ps09.blocked_by = ["BOGUS"];
      },
      /active required PS09 item/,
    ],
    [
      "active-without-focus",
      (r) => {
        item(r, ps09OutcomeIds[0]).status = "ready";
        r.current_focus.work_item = null;
      },
      /active PS09 finish requires exactly one/,
    ],
    [
      "conditional-closed-start",
      (r) => {
        item(r, ps09OutcomeIds[6]).status = "in_progress";
      },
      /authorization gate/,
    ],
    [
      "mandatory-deferred",
      (r) => {
        item(r, ps09OutcomeIds[2]).status = "deferred";
        item(r, ps09OutcomeIds[2]).reason = "Synthetic evasion.";
      },
      /mandatory and cannot be deferred/,
    ],
    [
      "hidden-next-action",
      (r) => {
        r.next_actions.pop();
      },
      /terminal next actions/,
    ],
    [
      "historical-next-action",
      (r) => {
        r.next_actions[0].work_item = "B2-REVIEW";
      },
      /terminal next actions/,
    ],
    [
      "premature-public-completion",
      (r) => {
        r.finish_states.public_beta.current_state = "complete";
      },
      /public beta is complete/,
    ],
    [
      "premature-rc-acceptance",
      (r) => {
        Object.assign(gate(r, "G-PS09-RC"), {
          state: "satisfied",
          evidence: ["Synthetic false acceptance."],
        });
      },
      /cannot be satisfied before canonical RC completion/,
    ],
    [
      "prefix-authorization-bypass",
      (r) => {
        r.work_items.push({
          ...clone(item(r, ps09OutcomeIds[6])),
          id: "PS09-99-UNAUTHORIZED",
          priority: 308,
        });
      },
      /authorization gate/,
    ],
  ];
  for (const [name, mutate, message] of rejects) {
    const candidate = active();
    mutate(candidate);
    const result = await validate(name, candidate);
    assert.notEqual(result.status, 0, `${name} was accepted`);
    assert.match(`${result.stdout}\n${result.stderr}`, message);
  }
  const terminal = terminalRunOne();
  terminal.finish_states.ps09.blocked_by = ["BOGUS"];
  let result = await validate("wrong-terminal-blockers", terminal);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /PS09 finish blockers/);
  const falseComplete = complete();
  gate(falseComplete, "G-PS09-RC").state = "closed";
  result = await validate("closed-rc-acceptance", falseComplete);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /exact release acceptance/);
  for (const [name, mutate, message] of [
    [
      "registry-missing-component",
      (r) => {
        r.components.pop();
      },
      /component coverage/,
    ],
    [
      "registry-duplicate-component",
      (r) => {
        r.components[1] = clone(r.components[0]);
      },
      /component coverage/,
    ],
    [
      "registry-wrong-root",
      (r) => {
        r.canonicalReleaseRoot = "B10-RC";
      },
      /registry release root/,
    ],
    [
      "registry-bogus-disposition",
      (r) => {
        r.components[0].disposition = "complete";
      },
      /invalid disposition/,
    ],
    [
      "registry-missing-evidence",
      (r) => {
        r.components[0].evidence = ["docs/no-such-convergence-evidence.md"];
      },
      /evidence path does not exist/,
    ],
    [
      "registry-external-evidence",
      (r) => {
        r.components[0].evidence = ["../README.md"];
      },
      /portable repository path/,
    ],
    [
      "registry-directory-evidence",
      (r) => {
        r.components[0].evidence = ["docs/adr"];
      },
      /regular file inside the repository/,
    ],
    [
      "registry-owner-input",
      (r) => {
        r.components[0].evidence = ["docs/00-READ-FIRST.md"];
      },
      /untracked owner input/,
    ],
    [
      "registry-owner-dot-alias",
      (r) => {
        r.components[0].evidence = [
          "docs/./Policy-Sentinel-0.9-Program-Plan-2026-09-05.md",
        ];
      },
      /portable repository path/,
    ],
    [
      "registry-owner-separator-alias",
      (r) => {
        r.components[0].evidence = ["docs//00-READ-FIRST.md"];
      },
      /portable repository path/,
    ],
    [
      "registry-k0-adoption",
      (r) => {
        r.components.find(({ id }) => id === "K0-LIFECYCLE").disposition =
          "adopt";
      },
      /closed convergence gates/,
    ],
    [
      "registry-o0-migration",
      (r) => {
        r.components.find(({ id }) => id === "O0-ORCHESTRATION").disposition =
          "migrate";
      },
      /closed convergence gates/,
    ],
  ]) {
    const candidateRegistry = clone(registry);
    mutate(candidateRegistry);
    const invalid = await validate(name, active(), candidateRegistry);
    assert.notEqual(invalid.status, 0, `${name} was accepted`);
    assert.match(invalid.stderr, message);
  }
});

const sha256Hex = (bytes) => createHash("sha256").update(bytes).digest("hex");
const clone = (value) => JSON.parse(JSON.stringify(value));
const normalizeRepositoryBytes = (bytes) =>
  Buffer.from(bytes.toString("utf8").replaceAll("\r\n", "\n"), "utf8");
const o0ContractPath = "docs/vision/o0-orchestration-contract.md";
const o0ContractBytes = normalizeRepositoryBytes(
  await readFile(path.resolve(projectRoot, o0ContractPath)),
);
const o0ContractSha256 = sha256Hex(o0ContractBytes);
const o0ContractGitBlobId = createHash("sha1")
  .update(Buffer.from(`blob ${o0ContractBytes.length}\0`, "utf8"))
  .update(o0ContractBytes)
  .digest("hex");
const o0CandidatePreimage = Buffer.concat([
  Buffer.from("policy-sentinel:o0-contract-candidate:v1\n", "utf8"),
  Buffer.from("proposed-version:1.0.0\n", "utf8"),
  Buffer.from(`byte-length:${o0ContractBytes.length}\n`, "utf8"),
  o0ContractBytes,
]);
const o0ContractCandidateId =
  "o0-contract-candidate:1.0.0:sha256:" + sha256Hex(o0CandidatePreimage);
const o0IdDerivation =
  'SHA-256 of UTF8("policy-sentinel:o0-contract-candidate:v1\\n") + ' +
  'UTF8("proposed-version:1.0.0\\n") + ' +
  `UTF8("byte-length:${o0ContractBytes.length}\\n") + the exact ` +
  `${o0ContractBytes.length} LF/no-BOM contract bytes.`;

const k0DurableLineage = {
  evidence_prefix: {
    count: 8,
    sha256: "967e759aa3616479a24b60694fe3c9d9996ab35dd8cad13c4becf692e23374ca",
  },
  contract: {
    path: "docs/vision/k0-lifecycle-contract.md",
    version: "1.0.0",
    sha256: "30e98fc8093b00ebd31cbbd545ca671a54eec68e3f6bdae065a7d2173fb7797d",
    freeze_commit: "21bb68fbb9bbd45f470b84de02b037a624efadb4",
  },
  contract_review: {
    path: "docs/vision/reviews/k0-contract-review-2026-09-01.md",
    sha256: "cd72507ad36e11ff2a665174307f8be246839ce9a62b6b8f75133677ed5d7d28",
    disposition: "PASS",
  },
  implementation: {
    report_path: "docs/vision/reports/k0-implementation-2026-09-01.md",
    report_sha256:
      "4793c6ea7bf41f0207ad534140f275a4a8c1c33a45d693c147beb509891a6b98",
    audit_path: "docs/vision/reviews/k0-implementation-audit-2026-09-01.md",
    audit_sha256:
      "ceb7f5d4d1d53646f237caf5cef75a8d7eb508d24de9afbc02a8dcc897329cda",
    implementation_commit: "ba6c4b6483f052dd372babb58a1280e6804e0617",
    validated_ledger_commit: "e8e5ce3827fe7f2790bdabd74d85045229d69e84",
  },
  convergence: {
    gate: "G-K0-S0-CONVERGENCE",
    required_state: "closed",
  },
};

const s0DurableLineage = {
  evidence_prefix: {
    count: 22,
    sha256: "997f3d6f1c781f06fb24d7b2ab812404a04771a5da0a19b75ea94017e3c119e1",
  },
  contract: {
    path: "docs/vision/s0-spatial-contract.md",
    version: "1.0.0",
    sha256: "ae213150ca9f5dfbf5c77d3f05c70aa3aad2b3921987fc091ec1e88b92f78888",
    freeze_commit: "383cc13a7e8e30db031f590a1c2d128a35a81b27",
  },
  contract_review: {
    path: "docs/vision/reviews/s0-contract-review-2026-09-01.md",
    sha256: "19ac4f2d90185571aaed9d2643755ea294d7b1074b85104b66036b990edc915d",
    disposition: "PASS",
  },
  implementation: {
    report_path: "docs/vision/reports/s0-implementation-2026-09-01.md",
    report_sha256:
      "2b74233e61c55f0a955f18dfebdf43a2b673a2af99beb14dbcac38769ff5f634",
    audit_path: "docs/vision/reviews/s0-implementation-audit-2026-09-01.md",
    audit_sha256:
      "d05901ea5c9c4f651ba53521202413694c875d11179edc8cebaf69d111c1e59e",
    implementation_commit: "a7e4c142975304b45c87848c9dc07e991b5fd078",
    terminal_ledger_commit: "6f04b23a35a3aad7929b93702aaa3d0c31545df8",
  },
  convergence: {
    gate: "G-K0-S0-CONVERGENCE",
    required_state: "closed",
  },
};

const o0DurableLineage = {
  reviewed_predecessor: {
    path: o0ContractPath,
    proposed_version: "1.0.0",
    contractCandidateId:
      "o0-contract-candidate:1.0.0:sha256:9cfc4006432e9489a273f449fc02bbe383723c7924856ce4434b85047a46dbb6",
    byte_length: 59366,
    sha256: "3ea10d753571f08f3e97d5c729d289c3d71e374d5fd91e68bd64c5e3c949f5d6",
    git_blob_id: "28f127fb62b112001fbb49a7a1e57f53fe9d0d2a",
    freeze_commit: "789ece12eb51164abfd3e11b7093644143e3c702",
    disposition: "rejected_material_findings",
  },
  independent_review: {
    path: "docs/vision/reviews/o0-contract-review-2026-09-01.md",
    byte_length: 24228,
    sha256: "d42f850c1193a05f4608660bee1247acffb7cb99e664375b5fdcb01c0995e375",
    git_blob_id: "a6dbbc48dc89b48d0a384aae4792123a30243adc",
    review_commit: "24633b993535f64e5b8da73265588753f5a95778",
    disposition: "O0_CONTRACT_REVIEW_FINDINGS_REPAIR_AUTHORIZATION_REQUIRED",
  },
  repair_authorization: {
    accepted_disposition_only:
      "O0_CONTRACT_REVIEW_FINDINGS_REPAIR_AUTHORIZATION_REQUIRED",
    authorized_findings: "O0-R01..O0-R15,O0-G01..O0-G03",
    contract_accepted: false,
    implementation_authorized: false,
    convergence_authorized: false,
  },
  supersession: {
    predecessor_contractCandidateId:
      "o0-contract-candidate:1.0.0:sha256:9cfc4006432e9489a273f449fc02bbe383723c7924856ce4434b85047a46dbb6",
    successor_contractCandidateId: o0ContractCandidateId,
    relationship: "supersedes_rejected_candidate_for_independent_review",
  },
};

const o0ContractCandidate = {
  path: o0ContractPath,
  proposed_version: "1.0.0",
  contractCandidateId: o0ContractCandidateId,
  byte_length: o0ContractBytes.length,
  sha256: o0ContractSha256,
  git_blob_id: o0ContractGitBlobId,
  id_derivation: o0IdDerivation,
  predecessor_contractCandidateId:
    "o0-contract-candidate:1.0.0:sha256:9cfc4006432e9489a273f449fc02bbe383723c7924856ce4434b85047a46dbb6",
  state: "byte_sealed_independent_review_required",
};

const o0ContractReview = {
  state: "awaiting_independent_review",
  reviewed_predecessor_candidate_id:
    "o0-contract-candidate:1.0.0:sha256:9cfc4006432e9489a273f449fc02bbe383723c7924856ce4434b85047a46dbb6",
  predecessor_review_artifact:
    "docs/vision/reviews/o0-contract-review-2026-09-01.md",
  predecessor_review_artifact_sha256:
    "d42f850c1193a05f4608660bee1247acffb7cb99e664375b5fdcb01c0995e375",
  predecessor_disposition:
    "O0_CONTRACT_REVIEW_FINDINGS_REPAIR_AUTHORIZATION_REQUIRED",
  active_candidate_id: o0ContractCandidateId,
  active_review_artifact: null,
  active_review_disposition: null,
};

const blockedWorkItem = (id, priority) => ({
  id,
  priority,
  milestone: "TEST",
  title: id,
  status: "blocked",
  dependencies: [],
  blocked_by: ["X-CLOSED"],
  safe_fallback: "Remain unavailable.",
  unblocks_only_when: "Synthetic evidence is supplied.",
  acceptance: ["The synthetic blocked state remains explicit."],
  evidence: ["Synthetic roadmap-validator fixture."],
});

const makePnwWorkItems = () => {
  const item = (id, priority, dependencies, status = "not_started") => ({
    id,
    priority,
    milestone: "PNW-TEST",
    title: id,
    status,
    dependencies,
    acceptance: ["The synthetic PNW roadmap contract remains explicit."],
    evidence:
      status === "complete" ? ["Synthetic PNW completion evidence."] : [],
  });
  const pnw00 = item("PNW-00-RECONCILE", 130, [], "complete");
  const pnw01 = {
    ...item("PNW-01-ENGINE-SEAMS", 131, ["PNW-00-RECONCILE"], "blocked"),
    blocked_by: ["G-PNW-IMPLEMENTATION"],
    authorization_gate: "G-PNW-IMPLEMENTATION",
    safe_fallback: "Keep the synthetic seam unimplemented.",
    unblocks_only_when: "The exact synthetic tranche is authorized.",
    evidence: ["Synthetic PNW implementation boundary."],
  };
  const pnw02 = {
    ...item(
      "PNW-02-REGIONAL-REGISTRY",
      132,
      ["PNW-01-ENGINE-SEAMS"],
      "blocked",
    ),
    blocked_by: ["G-PNW-ATNI-59-ROSTER"],
    authorization_gate: "G-PNW-ATNI-59-ROSTER",
    safe_fallback: "Emit no regional registry.",
    unblocks_only_when: "Originating synthetic roster evidence exists.",
    evidence: ["Synthetic PNW roster evidence boundary."],
  };
  return [
    pnw00,
    pnw01,
    pnw02,
    item("PNW-03-GEOGRAPHY-RIGHTS", 133, ["PNW-01-ENGINE-SEAMS"]),
    item("PNW-04-TAXONOMY", 134, ["PNW-01-ENGINE-SEAMS"]),
    item("PNW-05-SOURCE-PACK", 135, ["PNW-01-ENGINE-SEAMS"]),
    item("PNW-06-LIFECYCLE-REFRESH", 136, ["PNW-05-SOURCE-PACK"]),
    item("PNW-07-ANALYZED-CORPUS", 137, [
      "PNW-01-ENGINE-SEAMS",
      "PNW-04-TAXONOMY",
      "PNW-05-SOURCE-PACK",
    ]),
    item("PNW-08-OUTPUT-ADAPTERS", 138, ["PNW-07-ANALYZED-CORPUS"]),
    item("PNW-09-ACCEPTANCE-SCENARIOS", 139, [
      "PNW-02-REGIONAL-REGISTRY",
      "PNW-03-GEOGRAPHY-RIGHTS",
      "PNW-06-LIFECYCLE-REFRESH",
      "PNW-08-OUTPUT-ADAPTERS",
    ]),
    item("PNW-10-REGIONAL-RC", 140, ["PNW-09-ACCEPTANCE-SCENARIOS"]),
  ];
};

const makeRoadmap = ({
  status = "blocked",
  stage = "contract_design",
  authorizedThrough = "contract_freeze",
  releaseState = "blocked",
  authorizationState = "approved",
} = {}) => {
  const releaseRoots =
    releaseState === "blocked" ? [...protectedReleaseRoots] : [];
  const nextActionIds =
    releaseState === "blocked"
      ? [...protectedReleaseRoots, ...protectedPnwRoots]
      : [...protectedPnwRoots];
  const o0 = {
    id: "O0-ORCHESTRATION",
    priority: 122,
    milestone: "O0",
    title: "Synthetic additive orchestration fixture",
    status,
    additive_phase_stage: stage,
    dependencies: ["K0-LIFECYCLE"],
    authorization_gate: "G-O0-SYNTHETIC",
    convergence_gate: "G-O0-CONVERGENCE",
    durable_lineage: clone(o0DurableLineage),
    contract_candidate: clone(o0ContractCandidate),
    contract_review: clone(o0ContractReview),
    accepted_contract: null,
    implementation_authorization: null,
    acceptance: [
      "The additive phase remains isolated from release accounting.",
    ],
    evidence: ["Synthetic roadmap-validator fixture."],
  };
  if (status === "blocked") {
    Object.assign(o0, {
      blocked_by: ["G-O0-SYNTHETIC"],
      safe_fallback: "Keep the additive phase isolated.",
      unblocks_only_when: "The exact next stage is authorized.",
    });
  }

  const o0AuthorizationGate = {
    id: "G-O0-SYNTHETIC",
    name: "Synthetic O0 authorization",
    state: authorizationState,
    authorized_through: authorizedThrough,
  };
  if (authorizationState === "approved") {
    o0AuthorizationGate.approved_scope = ["Synthetic contract work only."];
    o0AuthorizationGate.evidence = ["Synthetic owner authorization."];
  }

  const requiredWorkItems = protectedReleaseRoots.map((id, index) =>
    blockedWorkItem(id, (index + 1) * 10),
  );
  if (releaseState === "complete") {
    for (const item of requiredWorkItems) {
      item.status = "complete";
      delete item.blocked_by;
      delete item.safe_fallback;
      delete item.unblocks_only_when;
    }
  }
  const releaseGate = (id, name) =>
    releaseState === "complete"
      ? {
          id,
          name,
          state: "satisfied",
          evidence: ["Synthetic release completion evidence."],
        }
      : { id, name, state: "closed" };

  return {
    schema_version: "test",
    roadmap_id: "policy-sentinel-test",
    project: { name: "Policy Sentinel validator fixture" },
    canonical_ledger: {
      allowed_work_item_statuses: [
        "complete",
        "in_progress",
        "ready",
        "blocked",
        "deferred",
        "not_started",
      ],
      allowed_gate_states: [
        "approved",
        "closed",
        "pending_evidence",
        "satisfied",
      ],
      allowed_finish_states: [
        "not_started",
        "in_progress",
        "complete",
        "blocked",
      ],
      allowed_additive_phase_stages: additiveStages,
      status_semantics: Object.fromEntries(
        [
          "complete",
          "in_progress",
          "ready",
          "blocked",
          "deferred",
          "not_started",
        ].map((value) => [value, `Synthetic meaning for ${value}.`]),
      ),
      capability_maturity_semantics: Object.fromEntries(
        [
          "proposed",
          "contracted",
          "implemented",
          "integrated",
          "validated",
          "source_activated",
          "release_ready",
          "published",
        ].map((value) => [value, `Synthetic meaning for ${value}.`]),
      ),
    },
    authority: {
      external_boundaries: [
        {
          id: "X-CLOSED",
          state: "closed",
          prohibits: "External activity.",
          unblocks_only_when: "The owner supplies exact authority.",
        },
      ],
    },
    baseline: {},
    current_focus: {
      work_item: status === "in_progress" ? "O0-ORCHESTRATION" : null,
      terminal_reason:
        status === "in_progress"
          ? null
          : "The local release remains evidence-blocked.",
      resumable_roots: [...releaseRoots],
    },
    gates: [
      releaseGate("G-RC", "Release candidate"),
      releaseGate("G-J", "Owner go/no-go"),
      {
        id: "G-K0-LIFECYCLE",
        name: "Synthetic K0 authorization",
        state: "approved",
        authorized_through: "completion",
        approved_scope: ["Synthetic K0 fixture."],
        evidence: ["Synthetic prior authorization."],
      },
      {
        id: "G-K0-S0-CONVERGENCE",
        name: "Synthetic K0 convergence",
        state: "closed",
      },
      {
        id: "G-S0-SYNTHETIC",
        name: "Synthetic S0 authorization",
        state: "approved",
        authorized_through: "completion",
        approved_scope: ["Synthetic S0 fixture."],
        evidence: ["Synthetic prior authorization."],
      },
      o0AuthorizationGate,
      {
        id: "G-O0-CONVERGENCE",
        name: "Synthetic O0 convergence",
        state: "closed",
      },
      {
        id: "G-PNW-IMPLEMENTATION",
        name: "Synthetic PNW implementation authorization",
        state: "closed",
      },
      {
        id: "G-PNW-ATNI-59-ROSTER",
        name: "Synthetic PNW roster evidence",
        state: "pending_evidence",
      },
      {
        id: "G-PNW-COMMUNITY-AUTHORITY",
        name: "Synthetic PNW community authority",
        state: "closed",
      },
      {
        id: "G-PNW-SPATIAL-EVIDENCE",
        name: "Synthetic PNW spatial evidence",
        state: "pending_evidence",
      },
      {
        id: "G-PNW-SOURCE-ACTIVATION",
        name: "Synthetic PNW source activation",
        state: "closed",
      },
      {
        id: "G-PNW-OUTPUT-REVIEW",
        name: "Synthetic PNW output review",
        state: "pending_evidence",
      },
    ],
    binding_documents: [
      { path: "AGENTS.md", role: "Existing local fixture path." },
      {
        path: "docs/handoffs/pnw-engine-seams-implementation-launch-2026-09-02.md",
        role: "Synthetic PNW launch contract.",
      },
    ],
    work_items: [
      {
        id: "H-HANDOFF",
        priority: 1,
        milestone: "TEST",
        title: "Synthetic durable handoff",
        status: "complete",
        dependencies: [],
        acceptance: ["The synthetic handoff is complete."],
        evidence: ["Synthetic handoff evidence."],
      },
      {
        id: "H-HOOKS",
        priority: 2,
        milestone: "TEST",
        title: "Synthetic hook guardrails",
        status: "complete",
        dependencies: ["H-HANDOFF"],
        acceptance: ["The synthetic hooks are complete."],
        evidence: ["Synthetic hook evidence."],
      },
      {
        id: "B3-PIPELINE",
        priority: 3,
        milestone: "TEST",
        title: "Synthetic existing pipeline",
        status: "complete",
        dependencies: [],
        acceptance: ["The synthetic pipeline is complete."],
        evidence: ["Synthetic pipeline evidence."],
      },
      ...requiredWorkItems,
      blockedWorkItem("SOURCE-GAP", 50),
      blockedWorkItem("APPLICATION-CONSUMER", 60),
      blockedWorkItem("PIPELINE-CONSUMER", 65),
      blockedWorkItem("ARTIFACT-CONSUMER", 70),
      blockedWorkItem("B9-LONGTAIL", 75),
      blockedWorkItem("B10-RC", 80),
      blockedWorkItem("PUBLICATION-CONSUMER", 85),
      {
        ...blockedWorkItem("RELEASE-PUBLISH", 100),
        milestone: "RELEASE",
      },
      {
        id: "K0-LIFECYCLE",
        priority: 120,
        milestone: "K0",
        title: "Synthetic completed additive prerequisite",
        status: "complete",
        additive_phase_stage: "completion",
        dependencies: ["H-HANDOFF", "B3-PIPELINE"],
        authorization_gate: "G-K0-LIFECYCLE",
        convergence_gate: "G-K0-S0-CONVERGENCE",
        durable_lineage: clone(k0DurableLineage),
        acceptance: ["The synthetic prerequisite is complete."],
        evidence: clone(liveWorkItem("K0-LIFECYCLE").evidence),
      },
      {
        id: "S0-SPATIAL",
        priority: 121,
        milestone: "S0",
        title: "Synthetic completed spatial additive phase",
        status: "complete",
        additive_phase_stage: "completion",
        dependencies: ["K0-LIFECYCLE"],
        authorization_gate: "G-S0-SYNTHETIC",
        convergence_gate: "G-K0-S0-CONVERGENCE",
        durable_lineage: clone(s0DurableLineage),
        acceptance: ["The synthetic S0 phase is complete."],
        evidence: clone(liveWorkItem("S0-SPATIAL").evidence),
      },
      o0,
      ...makePnwWorkItems(),
      {
        id: "H-REPOSITORY-BACKBONE",
        priority: 141,
        milestone: "Repository governance",
        title: "Synthetic repository backbone",
        status: "complete",
        work_class: "repository_governance",
        dependencies: ["H-HOOKS", "PNW-00-RECONCILE"],
        acceptance: ["The synthetic repository backbone is aligned."],
        evidence: ["Synthetic repository-backbone completion evidence."],
      },
    ],
    completion_scope: {
      repository_backbone: {
        required_outcomes: ["H-REPOSITORY-BACKBONE"],
        does_not_change: ["Synthetic product roots."],
      },
      local_release_candidate: {
        required_outcomes: [
          "H-HANDOFF",
          "H-HOOKS",
          "B3-PIPELINE",
          ...protectedReleaseRoots,
        ],
        accepted_source_blocks: ["SOURCE-GAP"],
        publication_only: [
          "APPLICATION-CONSUMER",
          "PIPELINE-CONSUMER",
          "ARTIFACT-CONSUMER",
          "B9-LONGTAIL",
          "B10-RC",
          "PUBLICATION-CONSUMER",
          "RELEASE-PUBLISH",
        ],
        additive_vision_phases: [
          "K0-LIFECYCLE",
          "S0-SPATIAL",
          "O0-ORCHESTRATION",
        ],
      },
      pnw_regional_engine: {
        required_outcomes: [
          "PNW-00-RECONCILE",
          "PNW-01-ENGINE-SEAMS",
          "PNW-02-REGIONAL-REGISTRY",
          "PNW-03-GEOGRAPHY-RIGHTS",
          "PNW-04-TAXONOMY",
          "PNW-05-SOURCE-PACK",
          "PNW-06-LIFECYCLE-REFRESH",
          "PNW-07-ANALYZED-CORPUS",
          "PNW-08-OUTPUT-ADAPTERS",
          "PNW-09-ACCEPTANCE-SCENARIOS",
          "PNW-10-REGIONAL-RC",
        ],
        mapping_document: "AGENTS.md",
        launch_document:
          "docs/handoffs/pnw-engine-seams-implementation-launch-2026-09-02.md",
        first_implementation_tranche: "PNW-01-ENGINE-SEAMS",
        implementation_gate: "G-PNW-IMPLEMENTATION",
      },
    },
    finish_states: {
      repository_backbone: {
        current_state: "complete",
        satisfied_when: ["Synthetic backbone completion."],
        does_not_mean: ["Synthetic product completion."],
      },
      local_release_candidate: {
        current_state: releaseState,
        blocked_by: [...releaseRoots],
      },
      pnw_regional_engine: {
        current_state: "blocked",
        blocked_by: ["PNW-01-ENGINE-SEAMS", "PNW-02-REGIONAL-REGISTRY"],
      },
      public_beta: { current_state: "blocked" },
    },
    source_register: [
      {
        id: "SYNTHETIC-SOURCE",
        source: "Synthetic source",
        implementation_state: "unavailable",
        public_claim: "None.",
        work_items: ["SOURCE-GAP"],
      },
    ],
    next_actions: nextActionIds.map((workItem, index) => ({
      order: index + 1,
      work_item: workItem,
      action: `Resolve ${workItem}.`,
    })),
  };
};

test("additive stage governance cannot affect protected release accounting", async (context) => {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "policy-sentinel-roadmap-"),
  );
  context.after(() => rm(fixtureRoot, { recursive: true, force: true }));

  const validateCandidate = async (name, candidate) => {
    const fixturePath = path.join(fixtureRoot, `${name}.yaml`);
    await writeFile(fixturePath, serializeModuleFixture(candidate), "utf8");
    return validateActualModule(fixturePath, ["--synthetic-legacy-fixture"]);
  };
  const legacyCliPath = path.join(fixtureRoot, "legacy-positive-cli.yaml");
  await writeFile(legacyCliPath, stringify(makeRoadmap()), "utf8");
  const legacyCli = spawnSync(
    process.execPath,
    [validatorPath, legacyCliPath, "--synthetic-legacy-fixture"],
    { cwd: projectRoot, encoding: "utf8" },
  );
  assert.equal(legacyCli.status, 0, `${legacyCli.stdout}\n${legacyCli.stderr}`);
  for (const [name, mutate, withFlag] of [
    ["legacy-no-explicit-flag", () => {}, false],
    [
      "legacy-production-id",
      (r) => {
        r.roadmap_id = "policy-sentinel-through-finish";
      },
      true,
    ],
    [
      "legacy-unknown-version",
      (r) => {
        r.schema_version = "0.0";
      },
      true,
    ],
  ]) {
    const candidate = makeRoadmap();
    mutate(candidate);
    const fixturePath = path.join(fixtureRoot, `${name}.yaml`);
    await writeFile(fixturePath, stringify(candidate), "utf8");
    const result = spawnSync(
      process.execPath,
      [
        validatorPath,
        fixturePath,
        ...(withFlag ? ["--synthetic-legacy-fixture"] : []),
      ],
      { cwd: projectRoot, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0, `${name} was accepted`);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /synthetic legacy fixture contract/,
    );
  }
  const nonFixtureRoot = await mkdtemp(
    path.join(tmpdir(), "policy-sentinel-not-legacy-"),
  );
  context.after(() => rm(nonFixtureRoot, { recursive: true, force: true }));
  const nonFixturePath = path.join(nonFixtureRoot, "wrong-root.yaml");
  await writeFile(nonFixturePath, stringify(makeRoadmap()), "utf8");
  const wrongRoot = spawnSync(
    process.execPath,
    [validatorPath, nonFixturePath, "--synthetic-legacy-fixture"],
    { cwd: projectRoot, encoding: "utf8" },
  );
  assert.notEqual(wrongRoot.status, 0);
  assert.match(
    `${wrongRoot.stdout}\n${wrongRoot.stderr}`,
    /synthetic legacy fixture contract/,
  );
  const expectValid = async (
    name,
    candidate,
    expectedReleaseState = "blocked",
    expectedNextActionIds = null,
  ) => {
    const result = await validateCandidate(name, candidate);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(
      candidate.finish_states.local_release_candidate.current_state,
      expectedReleaseState,
    );
    assert.deepEqual(
      candidate.finish_states.local_release_candidate.blocked_by,
      expectedReleaseState === "blocked" ? protectedReleaseRoots : [],
    );
    assert.deepEqual(
      candidate.current_focus.resumable_roots,
      expectedReleaseState === "blocked" ? protectedReleaseRoots : [],
    );
    assert.deepEqual(
      candidate.next_actions.map((action) => action.work_item),
      expectedNextActionIds ?? [
        ...(expectedReleaseState === "blocked" ? protectedReleaseRoots : []),
        ...(candidate.finish_states.pnw_regional_engine.current_state ===
        "blocked"
          ? protectedPnwRoots
          : []),
      ],
    );
  };
  const expectInvalid = async (name, candidate, expectedMessage) => {
    const result = await validateCandidate(name, candidate);
    assert.notEqual(result.status, 0, `${name} was accepted`);
    assert.match(`${result.stdout}\n${result.stderr}`, expectedMessage);
  };
  const addPendingAdditivePhase = (candidate) => {
    candidate.gates.push(
      {
        id: "G-X0-SYNTHETIC",
        name: "Synthetic X0 authorization",
        state: "approved",
        authorized_through: "contract_freeze",
        approved_scope: ["Synthetic X0 fixture."],
        evidence: ["Synthetic X0 authorization."],
      },
      {
        id: "G-X0-CONVERGENCE",
        name: "Synthetic X0 convergence",
        state: "pending_evidence",
      },
    );
    candidate.work_items.push({
      id: "X0-EXPERIMENT",
      priority: 142,
      milestone: "X0",
      title: "Synthetic pending-convergence additive phase",
      status: "ready",
      additive_phase_stage: "contract_design",
      dependencies: ["K0-LIFECYCLE"],
      authorization_gate: "G-X0-SYNTHETIC",
      convergence_gate: "G-X0-CONVERGENCE",
      acceptance: ["The synthetic additive phase remains isolated."],
      evidence: ["Synthetic pending-convergence evidence."],
    });
    candidate.completion_scope.local_release_candidate.additive_vision_phases.push(
      "X0-EXPERIMENT",
    );
  };

  const states = [
    ["blocked", makeRoadmap()],
    ["ready", makeRoadmap({ status: "ready" })],
    ["in-progress", makeRoadmap({ status: "in_progress" })],
    [
      "review-blocked",
      makeRoadmap({ status: "blocked", stage: "contract_review" }),
    ],
    [
      "implementation-blocked",
      makeRoadmap({ status: "blocked", stage: "implementation" }),
    ],
    [
      "complete",
      makeRoadmap({
        status: "complete",
        stage: "completion",
        authorizedThrough: "completion",
      }),
    ],
  ];
  for (const [name, candidate] of states) {
    await expectValid(name, candidate);
  }

  for (const [name, candidate] of states) {
    const o0 = candidate.work_items.find(
      (item) => item.id === "O0-ORCHESTRATION",
    );
    const completeReleaseCandidate = makeRoadmap({
      status: o0.status,
      stage: o0.additive_phase_stage,
      authorizedThrough:
        o0.status === "complete" ? "completion" : "contract_freeze",
      releaseState: "complete",
      authorizationState: candidate.gates.find(
        (gate) => gate.id === "G-O0-SYNTHETIC",
      ).state,
    });
    await expectValid(
      `complete-release-${name}`,
      completeReleaseCandidate,
      "complete",
    );
  }

  const wrongStageVocabulary = makeRoadmap();
  wrongStageVocabulary.canonical_ledger.allowed_additive_phase_stages = [
    ...additiveStages,
  ].reverse();
  await expectInvalid(
    "wrong-stage-vocabulary",
    wrongStageVocabulary,
    /ordered durable stage contract/,
  );

  const missingAuthorizationCeiling = makeRoadmap({ status: "ready" });
  delete missingAuthorizationCeiling.gates.find(
    (gate) => gate.id === "G-O0-SYNTHETIC",
  ).authorized_through;
  await expectInvalid(
    "missing-authorization-ceiling",
    missingAuthorizationCeiling,
    /G-O0-SYNTHETIC\.authorized_through must be a non-empty string/,
  );

  const approvedAuthorizationIsNotABlocker = makeRoadmap();
  approvedAuthorizationIsNotABlocker.work_items.find(
    (item) => item.id === "O0-ORCHESTRATION",
  ).blocked_by = ["X-CLOSED"];
  await expectValid(
    "approved-authorization-is-not-a-blocker",
    approvedAuthorizationIsNotABlocker,
  );

  const unrecordedAuthorizationBlock = makeRoadmap({
    authorizationState: "closed",
  });
  unrecordedAuthorizationBlock.work_items.find(
    (item) => item.id === "O0-ORCHESTRATION",
  ).blocked_by = ["X-CLOSED"];
  await expectInvalid(
    "unrecorded-authorization-block",
    unrecordedAuthorizationBlock,
    /authorization_gate is absent from blocked_by/,
  );

  await expectInvalid(
    "ready-beyond-authorization",
    makeRoadmap({ status: "ready", stage: "contract_review" }),
    /authorizes only through contract_freeze/,
  );

  const wrongCompletionStage = makeRoadmap({
    status: "complete",
    stage: "implementation_review",
    authorizedThrough: "completion",
  });
  await expectInvalid(
    "wrong-completion-stage",
    wrongCompletionStage,
    /complete before additive phase stage completion/,
  );

  const sameGate = makeRoadmap({ status: "ready" });
  sameGate.work_items.find(
    (item) => item.id === "O0-ORCHESTRATION",
  ).convergence_gate = "G-O0-SYNTHETIC";
  await expectInvalid(
    "same-authorization-and-convergence-gate",
    sameGate,
    /convergence gate distinct from its authorization gate/,
  );

  const missingConvergenceGate = makeRoadmap({ status: "ready" });
  delete missingConvergenceGate.work_items.find(
    (item) => item.id === "O0-ORCHESTRATION",
  ).convergence_gate;
  await expectInvalid(
    "missing-convergence-gate",
    missingConvergenceGate,
    /convergence_gate must be a non-empty string/,
  );

  const removedAdditive = makeRoadmap({ status: "ready" });
  removedAdditive.completion_scope.local_release_candidate.additive_vision_phases =
    ["S0-SPATIAL", "O0-ORCHESTRATION"];
  removedAdditive.completion_scope.local_release_candidate.publication_only.push(
    "K0-LIFECYCLE",
  );
  const removedK0 = removedAdditive.work_items.find(
    (item) => item.id === "K0-LIFECYCLE",
  );
  delete removedK0.additive_phase_stage;
  delete removedK0.convergence_gate;
  await expectInvalid(
    "removed-additive-accounting",
    removedAdditive,
    /K0-LIFECYCLE must remain classified only in additive_vision_phases/,
  );

  const deletedO0Wholesale = makeRoadmap({ status: "ready" });
  deletedO0Wholesale.work_items = deletedO0Wholesale.work_items.filter(
    (item) => item.id !== "O0-ORCHESTRATION",
  );
  deletedO0Wholesale.completion_scope.local_release_candidate.additive_vision_phases =
    deletedO0Wholesale.completion_scope.local_release_candidate.additive_vision_phases.filter(
      (id) => id !== "O0-ORCHESTRATION",
    );
  deletedO0Wholesale.gates = deletedO0Wholesale.gates.filter(
    (gate) => !["G-O0-SYNTHETIC", "G-O0-CONVERGENCE"].includes(gate.id),
  );
  await expectInvalid(
    "o0-g01-wholesale-deletion",
    deletedO0Wholesale,
    /durable additive work item is missing: O0-ORCHESTRATION/,
  );

  const deletedS0Wholesale = makeRoadmap({ status: "ready" });
  deletedS0Wholesale.work_items = deletedS0Wholesale.work_items.filter(
    (item) => item.id !== "S0-SPATIAL",
  );
  deletedS0Wholesale.completion_scope.local_release_candidate.additive_vision_phases =
    deletedS0Wholesale.completion_scope.local_release_candidate.additive_vision_phases.filter(
      (id) => id !== "S0-SPATIAL",
    );
  deletedS0Wholesale.gates = deletedS0Wholesale.gates.filter(
    (gate) => gate.id !== "G-S0-SYNTHETIC",
  );
  await expectInvalid(
    "s0-g01-wholesale-deletion",
    deletedS0Wholesale,
    /durable additive work item is missing: S0-SPATIAL/,
  );

  const deletedO0Gate = makeRoadmap({ status: "ready" });
  deletedO0Gate.gates = deletedO0Gate.gates.filter(
    (gate) => gate.id !== "G-O0-CONVERGENCE",
  );
  await expectInvalid(
    "o0-g01-required-gate-deletion",
    deletedO0Gate,
    /references unknown gate G-O0-CONVERGENCE|durable additive gate is missing/,
  );

  const downgradedK0 = makeRoadmap({ status: "ready" });
  const downgradedK0Item = downgradedK0.work_items.find(
    (item) => item.id === "K0-LIFECYCLE",
  );
  downgradedK0Item.status = "blocked";
  downgradedK0Item.additive_phase_stage = "implementation_review";
  downgradedK0Item.blocked_by = ["G-K0-LIFECYCLE"];
  downgradedK0Item.safe_fallback = "Do not reinterpret K0 completion.";
  downgradedK0Item.unblocks_only_when = "Never in this fixture.";
  await expectInvalid(
    "k0-g03-terminal-downgrade",
    downgradedK0,
    /S0-SPATIAL is complete but dependencies are not: K0-LIFECYCLE|K0-LIFECYCLE\.status must remain "complete"/,
  );

  const reopenedS0 = makeRoadmap({ status: "ready" });
  const reopenedS0Item = reopenedS0.work_items.find(
    (item) => item.id === "S0-SPATIAL",
  );
  reopenedS0Item.status = "ready";
  reopenedS0Item.additive_phase_stage = "contract_design";
  await expectInvalid(
    "s0-g03-terminal-reopening",
    reopenedS0,
    /O0-ORCHESTRATION is ready but dependencies are not: S0-SPATIAL|S0-SPATIAL\.status must remain "complete"/,
  );

  const removedK0Evidence = makeRoadmap({ status: "ready" });
  removedK0Evidence.work_items
    .find((item) => item.id === "K0-LIFECYCLE")
    .evidence.shift();
  await expectInvalid(
    "k0-g03-evidence-removal",
    removedK0Evidence,
    /K0-LIFECYCLE\.evidence removed durable terminal evidence|changed durable terminal evidence/,
  );

  const removedS0ReviewEvidence = makeRoadmap({ status: "ready" });
  delete removedS0ReviewEvidence.work_items.find(
    (item) => item.id === "S0-SPATIAL",
  ).durable_lineage.contract_review;
  await expectInvalid(
    "s0-g03-review-evidence-removal",
    removedS0ReviewEvidence,
    /S0-SPATIAL\.durable_lineage must contain exactly/,
  );

  const removedK0ImplementationEvidence = makeRoadmap({ status: "ready" });
  delete removedK0ImplementationEvidence.work_items.find(
    (item) => item.id === "K0-LIFECYCLE",
  ).durable_lineage.implementation.audit_sha256;
  await expectInvalid(
    "k0-g03-implementation-evidence-removal",
    removedK0ImplementationEvidence,
    /K0-LIFECYCLE\.durable_lineage\.implementation must contain exactly/,
  );

  const changedS0FrozenHash = makeRoadmap({ status: "ready" });
  changedS0FrozenHash.work_items.find(
    (item) => item.id === "S0-SPATIAL",
  ).durable_lineage.contract.sha256 = "0".repeat(64);
  await expectInvalid(
    "s0-g03-frozen-hash-change",
    changedS0FrozenHash,
    /S0-SPATIAL\.durable_lineage\.contract\.sha256 must remain/,
  );

  const changedS0ConvergenceBinding = makeRoadmap({ status: "ready" });
  changedS0ConvergenceBinding.work_items.find(
    (item) => item.id === "S0-SPATIAL",
  ).convergence_gate = "G-O0-CONVERGENCE";
  await expectInvalid(
    "s0-g03-convergence-binding-change",
    changedS0ConvergenceBinding,
    /S0-SPATIAL\.convergence_gate must remain "G-K0-S0-CONVERGENCE"/,
  );

  const pendingDurableConvergence = makeRoadmap({ status: "ready" });
  pendingDurableConvergence.gates.find(
    (gate) => gate.id === "G-K0-S0-CONVERGENCE",
  ).state = "pending_evidence";
  await expectInvalid(
    "g02-durable-convergence-cannot-reopen-pending",
    pendingDurableConvergence,
    /G-K0-S0-CONVERGENCE\.state must remain "closed"/,
  );

  for (const state of ["pending_evidence", "approved"]) {
    const changedO0Convergence = makeRoadmap({ status: "ready" });
    const gate = changedO0Convergence.gates.find(
      (entry) => entry.id === "G-O0-CONVERGENCE",
    );
    gate.state = state;
    if (state === "approved") {
      gate.approved_scope = ["Synthetic unauthorized convergence."];
      gate.evidence = ["Synthetic unauthorized convergence evidence."];
    }
    await expectInvalid(
      `o0-g02-convergence-reopen-${state}`,
      changedO0Convergence,
      /G-O0-CONVERGENCE\.state must remain "closed"/,
    );
  }

  const removedO0ReviewEvidence = makeRoadmap({ status: "ready" });
  delete removedO0ReviewEvidence.work_items.find(
    (item) => item.id === "O0-ORCHESTRATION",
  ).durable_lineage.independent_review;
  await expectInvalid(
    "o0-g01-review-evidence-removal",
    removedO0ReviewEvidence,
    /O0-ORCHESTRATION\.durable_lineage must contain exactly/,
  );

  const duplicateCompletionGroup = makeRoadmap({ status: "ready" });
  duplicateCompletionGroup.completion_scope.local_release_candidate.publication_only.push(
    "O0-ORCHESTRATION",
  );
  await expectInvalid(
    "duplicate-completion-group",
    duplicateCompletionGroup,
    /appears in both completion scope/,
  );

  const directConvergence = makeRoadmap({ status: "ready" });
  directConvergence.work_items.find(
    (item) => item.id === "RELEASE-PUBLISH",
  ).dependencies = ["O0-ORCHESTRATION"];
  await expectInvalid(
    "direct-closed-convergence-dependency",
    directConvergence,
    /RELEASE-PUBLISH has a direct dependency.*RELEASE-PUBLISH -> O0-ORCHESTRATION/,
  );

  const transitiveConvergence = makeRoadmap({ status: "ready" });
  transitiveConvergence.work_items.find(
    (item) => item.id === "RELEASE-PUBLISH",
  ).dependencies = ["NONADDITIVE-BRIDGE"];
  transitiveConvergence.work_items.push({
    ...blockedWorkItem("NONADDITIVE-BRIDGE", 150),
    dependencies: ["O0-ORCHESTRATION"],
  });
  transitiveConvergence.completion_scope.local_release_candidate.publication_only.push(
    "NONADDITIVE-BRIDGE",
  );
  await expectInvalid(
    "transitive-closed-convergence-dependency",
    transitiveConvergence,
    /RELEASE-PUBLISH has a transitive dependency.*RELEASE-PUBLISH -> NONADDITIVE-BRIDGE -> O0-ORCHESTRATION/,
  );

  const protectedConsumers = [
    "APPLICATION-CONSUMER",
    "PIPELINE-CONSUMER",
    "ARTIFACT-CONSUMER",
    "B9-LONGTAIL",
    "B10-RC",
    "PUBLICATION-CONSUMER",
    "RELEASE-PUBLISH",
  ];
  for (const consumerId of protectedConsumers) {
    const pendingDirect = makeRoadmap({ status: "ready" });
    addPendingAdditivePhase(pendingDirect);
    pendingDirect.work_items.find(
      (item) => item.id === consumerId,
    ).dependencies = ["X0-EXPERIMENT"];
    await expectInvalid(
      `g02-pending-direct-${consumerId.toLowerCase()}`,
      pendingDirect,
      new RegExp(
        `${consumerId} has a direct dependency.*${consumerId} -> X0-EXPERIMENT`,
      ),
    );
  }

  const pendingTransitive = makeRoadmap({ status: "ready" });
  addPendingAdditivePhase(pendingTransitive);
  pendingTransitive.work_items.find(
    (item) => item.id === "ARTIFACT-CONSUMER",
  ).dependencies = ["NONADDITIVE-BRIDGE"];
  pendingTransitive.work_items.push({
    ...blockedWorkItem("NONADDITIVE-BRIDGE", 150),
    dependencies: ["X0-EXPERIMENT"],
  });
  pendingTransitive.completion_scope.local_release_candidate.publication_only.push(
    "NONADDITIVE-BRIDGE",
  );
  await expectInvalid(
    "g02-pending-transitive-artifact",
    pendingTransitive,
    /ARTIFACT-CONSUMER has a transitive dependency.*ARTIFACT-CONSUMER -> NONADDITIVE-BRIDGE -> X0-EXPERIMENT/,
  );

  const changedReleaseRoot = makeRoadmap({ status: "ready" });
  changedReleaseRoot.finish_states.local_release_candidate.blocked_by.pop();
  await expectInvalid(
    "changed-protected-release-roots",
    changedReleaseRoot,
    /exact protected roots in order/,
  );

  const activePnwTranche = makeRoadmap();
  const activePnwGate = activePnwTranche.gates.find(
    (gate) => gate.id === "G-PNW-IMPLEMENTATION",
  );
  activePnwGate.state = "approved";
  activePnwGate.evidence = ["Synthetic exact PNW tranche authorization."];
  const activePnwItem = activePnwTranche.work_items.find(
    (item) => item.id === "PNW-01-ENGINE-SEAMS",
  );
  activePnwItem.status = "in_progress";
  delete activePnwItem.blocked_by;
  delete activePnwItem.safe_fallback;
  delete activePnwItem.unblocks_only_when;
  activePnwTranche.current_focus.work_item = "PNW-01-ENGINE-SEAMS";
  activePnwTranche.current_focus.terminal_reason = null;
  activePnwTranche.finish_states.pnw_regional_engine = {
    current_state: "in_progress",
  };
  activePnwTranche.next_actions = protectedReleaseRoots.map(
    (workItem, index) => ({
      order: index + 1,
      work_item: workItem,
      action: `Resolve ${workItem}.`,
    }),
  );
  await expectValid("active-pnw-with-blocked-legacy-release", activePnwTranche);

  const completedPnwTranche = makeRoadmap();
  const completedPnwGate = completedPnwTranche.gates.find(
    (gate) => gate.id === "G-PNW-IMPLEMENTATION",
  );
  completedPnwGate.state = "approved";
  completedPnwGate.evidence = ["Synthetic exact PNW tranche authorization."];
  const completedPnwItem = completedPnwTranche.work_items.find(
    (item) => item.id === "PNW-01-ENGINE-SEAMS",
  );
  completedPnwItem.status = "complete";
  completedPnwItem.evidence = ["Synthetic completed PNW tranche evidence."];
  delete completedPnwItem.blocked_by;
  delete completedPnwItem.safe_fallback;
  delete completedPnwItem.unblocks_only_when;
  for (const id of [
    "PNW-03-GEOGRAPHY-RIGHTS",
    "PNW-04-TAXONOMY",
    "PNW-05-SOURCE-PACK",
  ]) {
    completedPnwTranche.work_items.find((item) => item.id === id).status =
      "ready";
  }
  completedPnwTranche.current_focus.work_item = null;
  completedPnwTranche.current_focus.terminal_reason =
    "The completed PNW tranche stopped before separately authorized successor work.";
  completedPnwTranche.finish_states.pnw_regional_engine = {
    current_state: "in_progress",
  };
  completedPnwTranche.next_actions = [
    ...protectedReleaseRoots,
    "PNW-02-REGIONAL-REGISTRY",
    "PNW-03-GEOGRAPHY-RIGHTS",
    "PNW-04-TAXONOMY",
    "PNW-05-SOURCE-PACK",
  ].map((workItem, index) => ({
    order: index + 1,
    work_item: workItem,
    action: `Resolve or authorize ${workItem}.`,
  }));
  await expectValid(
    "completed-pnw-tranche-stops-before-ready-successors",
    completedPnwTranche,
    "blocked",
    [
      ...protectedReleaseRoots,
      "PNW-02-REGIONAL-REGISTRY",
      "PNW-03-GEOGRAPHY-RIGHTS",
      "PNW-04-TAXONOMY",
      "PNW-05-SOURCE-PACK",
    ],
  );

  const activeBackboneWithReadyPnw = clone(completedPnwTranche);
  const activeBackbone = activeBackboneWithReadyPnw.work_items.find(
    (item) => item.id === "H-REPOSITORY-BACKBONE",
  );
  activeBackbone.status = "in_progress";
  activeBackboneWithReadyPnw.current_focus.work_item = "H-REPOSITORY-BACKBONE";
  activeBackboneWithReadyPnw.current_focus.terminal_reason = null;
  activeBackboneWithReadyPnw.finish_states.repository_backbone.current_state =
    "in_progress";
  await expectValid(
    "active-repository-maintenance-does-not-block-ready-pnw-roots",
    activeBackboneWithReadyPnw,
    "blocked",
    [
      ...protectedReleaseRoots,
      "PNW-02-REGIONAL-REGISTRY",
      "PNW-03-GEOGRAPHY-RIGHTS",
      "PNW-04-TAXONOMY",
      "PNW-05-SOURCE-PACK",
    ],
  );

  const missingPnwOutcome = makeRoadmap();
  missingPnwOutcome.completion_scope.pnw_regional_engine.required_outcomes.pop();
  await expectInvalid(
    "missing-pnw-outcome",
    missingPnwOutcome,
    /preserve PNW-00 through PNW-10 in order/,
  );

  const changedPnwTranche = makeRoadmap();
  changedPnwTranche.completion_scope.pnw_regional_engine.first_implementation_tranche =
    "PNW-02-REGIONAL-REGISTRY";
  await expectInvalid(
    "changed-pnw-first-tranche",
    changedPnwTranche,
    /PNW-01-ENGINE-SEAMS must remain the exact first implementation tranche/,
  );

  const unboundPnwMapping = makeRoadmap();
  unboundPnwMapping.completion_scope.pnw_regional_engine.mapping_document =
    "docs/not-binding.md";
  await expectInvalid(
    "unbound-pnw-mapping",
    unboundPnwMapping,
    /PNW regional mapping document must be a binding document/,
  );

  const changedPnwLaunch = makeRoadmap();
  changedPnwLaunch.completion_scope.pnw_regional_engine.launch_document =
    "AGENTS.md";
  await expectInvalid(
    "changed-pnw-launch-document",
    changedPnwLaunch,
    /PNW-01 launch document must remain/,
  );

  const removedPnwGate = makeRoadmap();
  removedPnwGate.gates = removedPnwGate.gates.filter(
    (gate) => gate.id !== "G-PNW-OUTPUT-REVIEW",
  );
  await expectInvalid(
    "removed-pnw-gate",
    removedPnwGate,
    /durable PNW gate is missing: G-PNW-OUTPUT-REVIEW/,
  );

  const changedPnwDependency = makeRoadmap();
  changedPnwDependency.work_items.find(
    (item) => item.id === "PNW-05-SOURCE-PACK",
  ).dependencies = ["PNW-02-REGIONAL-REGISTRY"];
  await expectInvalid(
    "changed-pnw-dependency",
    changedPnwDependency,
    /PNW-05-SOURCE-PACK dependencies do not match the durable PNW execution graph/,
  );

  const reorderedPnwRoots = makeRoadmap();
  reorderedPnwRoots.finish_states.pnw_regional_engine.blocked_by.reverse();
  await expectInvalid(
    "reordered-pnw-roots",
    reorderedPnwRoots,
    /PNW regional finish blockers must exactly match incomplete PNW roots/,
  );

  const hiddenPnwReadyRoot = makeRoadmap();
  const hiddenPnwRoot = hiddenPnwReadyRoot.work_items.find(
    (item) => item.id === "PNW-00-RECONCILE",
  );
  hiddenPnwRoot.status = "deferred";
  hiddenPnwRoot.reason = "Synthetic hidden-root regression.";
  hiddenPnwRoot.evidence = [];
  const dependentBackbone = hiddenPnwReadyRoot.work_items.find(
    (item) => item.id === "H-REPOSITORY-BACKBONE",
  );
  dependentBackbone.status = "not_started";
  dependentBackbone.evidence = [];
  hiddenPnwReadyRoot.finish_states.repository_backbone.current_state =
    "not_started";
  await expectInvalid(
    "hidden-pnw-nonblocked-root",
    hiddenPnwReadyRoot,
    /blocked PNW regional finish state has non-blocked incomplete roots: PNW-00-RECONCILE/,
  );

  const falsePnwCompletion = makeRoadmap();
  falsePnwCompletion.finish_states.pnw_regional_engine.current_state =
    "complete";
  delete falsePnwCompletion.finish_states.pnw_regional_engine.blocked_by;
  await expectInvalid(
    "false-pnw-completion",
    falsePnwCompletion,
    /PNW regional engine is complete with incomplete required outcomes/,
  );

  const readyPnwBehindClosedGate = makeRoadmap();
  const readyPnwItem = readyPnwBehindClosedGate.work_items.find(
    (item) => item.id === "PNW-01-ENGINE-SEAMS",
  );
  readyPnwItem.status = "ready";
  delete readyPnwItem.blocked_by;
  delete readyPnwItem.safe_fallback;
  delete readyPnwItem.unblocks_only_when;
  await expectInvalid(
    "ready-pnw-behind-closed-gate",
    readyPnwBehindClosedGate,
    /cannot be ready while authorization gate G-PNW-IMPLEMENTATION is closed/,
  );

  const nonAdditiveProgress = makeRoadmap({ status: "ready" });
  nonAdditiveProgress.work_items.find(
    (item) => item.id === "SOURCE-GAP",
  ).status = "in_progress";
  nonAdditiveProgress.current_focus.work_item = "SOURCE-GAP";
  nonAdditiveProgress.current_focus.terminal_reason = null;
  await expectInvalid(
    "terminal-nonadditive-progress",
    nonAdditiveProgress,
    /permits only optional additive in_progress work/,
  );

  const activeReleaseWithAdditiveFocus = makeRoadmap({ status: "in_progress" });
  activeReleaseWithAdditiveFocus.finish_states.local_release_candidate.current_state =
    "in_progress";
  await expectInvalid(
    "active-release-additive-focus",
    activeReleaseWithAdditiveFocus,
    /requires its in_progress item to be non-additive/,
  );
});
