import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import process from "node:process";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  realpath,
  writeFile,
  rm,
  link,
  symlink,
  rename,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { stringify } from "yaml";
import { assertSchema } from "../../src/knowledge/schema.mjs";
import {
  assertNoWindowsReparsePoints,
  validateKnowledge,
  parseYaml,
  LIMITS,
  sha256,
} from "../../src/knowledge/validate.mjs";
import { buildNavigation, filename } from "../../src/knowledge/navigation.mjs";
import {
  publishKnowledge,
  verifyOwnedOutput,
} from "../../src/knowledge/publish.mjs";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const clone = (value) => globalThis.structuredClone(value);
const git = (root, args) =>
  execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 10000,
  });
async function fixture(context, namespace = "synthetic-a") {
  const owned = await mkdtemp(
    path.join(await realpath(tmpdir()), "policy-sentinel-knowledge-"),
  );
  context.after(() => rm(owned, { recursive: true, force: true }));
  const root = path.join(owned, "repository");
  await mkdir(path.join(root, "docs"), { recursive: true });
  await mkdir(path.join(root, "knowledge"));
  const texts = {
    "README.md": "# Synthetic authority\n\n[Topic](docs/topic.md)\n",
    "docs/topic.md":
      "# Synthetic topic\n\nBounded synthetic evidence, no policy record.\n",
  };
  const policyOwnerFixtures = [
    ["navigation", "backbone", "docs/PROJECT-BACKBONE.md"],
    ["work_status", "roadmap", "ROADMAP.yaml"],
    ["decisions", "decisions", "docs/decision-register.md"],
    ["product", "brief", "docs/project-brief.md"],
    ["scope_acceptance", "pnw", "docs/pnw-scope-and-acceptance.md"],
    ["data_governance", "governance", "docs/data-governance.md"],
    [
      "component_dispositions",
      "convergence",
      "docs/development/ps09-convergence.v1.json",
    ],
    [
      "protected_inputs",
      "custody",
      "docs/development/ps09-run-01-custody.json",
    ],
  ];
  if (namespace === "policy-sentinel") {
    for (const [role, , name] of policyOwnerFixtures)
      texts[name] = name.endsWith(".json")
        ? JSON.stringify({ ownerInputs: [{ path: "docs/protected.md" }] })
        : `# Synthetic ${role} owner\n`;
  }
  for (const [name, text] of Object.entries(texts)) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), text);
  }
  await writeFile(
    path.join(root, "docs/protected.md"),
    "# Protected synthetic original\n",
  );
  const custodyPath =
    namespace === "policy-sentinel"
      ? "docs/development/ps09-run-01-custody.json"
      : "docs/custody.json";
  await mkdir(path.dirname(path.join(root, custodyPath)), { recursive: true });
  await writeFile(
    path.join(root, custodyPath),
    JSON.stringify({ ownerInputs: [{ path: "docs/protected.md" }] }),
  );
  git(root, ["init", "--quiet"]);
  git(root, [
    "-c",
    "core.autocrlf=false",
    "add",
    "README.md",
    "docs",
    ...(namespace === "policy-sentinel" ? ["ROADMAP.yaml"] : []),
  ]);
  git(root, [
    "-c",
    "user.name=Knowledge Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "Synthetic knowledge source pins",
  ]);
  const revision = git(root, ["rev-parse", "HEAD"]).trim();
  const ids = {
    readme: `${namespace}:document:readme`,
    topic: `${namespace}:document:topic`,
    entry: `${namespace}:knowledge:M01`,
    reference: `${namespace}:reference:example`,
  };
  const owners = Object.fromEntries(
    [
      "navigation",
      "work_status",
      "decisions",
      "product",
      "scope_acceptance",
      "data_governance",
      "component_dispositions",
      "protected_inputs",
    ].map((key) => [key, ids.readme]),
  );
  if (namespace === "policy-sentinel")
    for (const [role, id] of policyOwnerFixtures)
      owners[role] = `policy-sentinel:document:${id}`;
  const adoption = {
    source_artifact: "synthetic.seed.yaml",
    source_artifact_sha256: "a".repeat(64),
    source_hash_domain: "raw_file_bytes",
    metadata_authority: "sidecar_navigation_only",
    export_disposition: "local_only_metadata_projection",
  };
  const common = {
    schema_version: "1.0.0",
    project: namespace,
    source_revision: revision,
    authority: "Synthetic sidecar metadata only.",
    publication_status: "local_review_package_not_reviewed_for_export",
    adoption,
  };
  const documents = Object.entries(texts).map(([name, text], index) => ({
    id:
      index < 2
        ? index
          ? ids.topic
          : ids.readme
        : `policy-sentinel:document:${policyOwnerFixtures.find(([, , fixturePath]) => fixturePath === name)[1]}`,
    path: name,
    title: index ? "Synthetic topic" : "Synthetic authority",
    observed_role: "synthetic_evidence",
    document_lifecycle_observation: "synthetic_fixture",
    purpose: "Test repository navigation without acquiring sources.",
    source_revision: revision,
    working_file_sha256: sha256(Buffer.from(text)),
    metadata_review: "curated_proposal",
    publication_status: "not_reviewed_for_export",
    git_pin: {
      hash_domain: "git_blob_bytes",
      oid: git(root, ["rev-parse", `${revision}:${name}`]).trim(),
      sha256: sha256(Buffer.from(text)),
    },
  }));
  const bundle = {
    profile: {
      schema_version: "1.0.0",
      project: namespace,
      source_root_alias: `${namespace}-repository`,
      authority_owners: owners,
      allowed_source_paths: Object.keys(texts),
      protected_inputs_registry: custodyPath,
      registry_links: [],
      relations: [],
      output_protocol: "owned_detached_vault_v1",
      adaptation:
        "Synthetic second-project fixture; no actual project is selected.",
    },
    catalog: {
      ...common,
      observed_at: "2026-09-05",
      source_root_alias: `${namespace}-repository`,
      authority_owners: owners,
      editorial_policy: ["Source documents remain authoritative."],
      documents,
    },
    entries: {
      ...common,
      observed_at: "2026-09-05",
      source_resolution: "Exact historical source section and line.",
      entries: [
        {
          id: ids.entry,
          kind: "method",
          title: "A synthetic method",
          summary: "Use a pinned synthetic citation.",
          evidence_maturity: "synthetic_fixture",
          observed_scope: "One synthetic source.",
          limits: ["No real identity or product acceptance."],
          proposed_reuse: "Test namespace isolation.",
          tags: ["synthetic"],
          sources: [
            {
              document: ids.topic,
              section: "Synthetic topic",
              observed_line: 1,
            },
          ],
          extraction_review: "curated_seed_not_a_new_acceptance_decision",
          product_activation: "none",
          publication_status: "not_reviewed_for_export",
        },
      ],
    },
    references: {
      ...common,
      review_date: "2026-09-05",
      references: [
        {
          id: ids.reference,
          kind: "synthetic_reference",
          title: "Synthetic reference",
          url: "https://example.invalid/reference",
          verification: "synthetic_fixture",
          useful_for: "No request is made.",
          limits: ["Synthetic reference only."],
          related_entries: [ids.entry],
        },
      ],
    },
  };
  const save = async () => {
    for (const [name, value] of Object.entries(bundle))
      await writeFile(
        path.join(root, "knowledge", `${name}.yaml`),
        stringify(value),
      );
  };
  await save();
  return {
    owned,
    root,
    output: path.join(owned, "reading-vault"),
    bundle,
    ids,
    save,
  };
}

test("YAML input rejects ambiguous, excessive and alias-bearing documents", () => {
  for (const bytes of [
    "a: 1\na: 2\n",
    "a: 1\n---\nb: 2\n",
    "a: &anchor [1, 2]\nb: *anchor\n",
    "value: !unknown tagged\n",
  ])
    assert.throws(() => parseYaml(bytes), /YAML/);
  assert.throws(
    () => parseYaml(Buffer.alloc(LIMITS.metadataBytes + 1)),
    /byte limit/,
  );
  assert.throws(() => parseYaml(Buffer.from([0xff])), /encoded data/);
});

test("metadata validators reject false authority, unresolvable pins and root escapes", async (context) => {
  const f = await fixture(context);
  const original = clone(f.bundle);
  for (const [name, mutate, expected] of [
    [
      "unknown schema",
      (b) => {
        b.catalog.schema_version = "9.9";
      },
      /schema rejected/,
    ],
    [
      "editable work status",
      (b) => {
        b.entries.entries[0].status = "complete";
      },
      /schema rejected/,
    ],
    [
      "product activation",
      (b) => {
        b.entries.entries[0].product_activation = "approved";
      },
      /schema rejected/,
    ],
    [
      "invented acceptance maturity",
      (b) => {
        b.entries.entries[0].evidence_maturity = "release_accepted";
      },
      /schema rejected/,
    ],
    [
      "export claim",
      (b) => {
        b.catalog.adoption.export_disposition = "public";
      },
      /schema rejected/,
    ],
    [
      "cross-project ID",
      (b) => {
        b.entries.entries[0].id = "synthetic-b:knowledge:M01";
      },
      /another project namespace/,
    ],
    [
      "case-fold ID",
      (b) => {
        b.entries.entries.push({
          ...clone(b.entries.entries[0]),
          id: f.ids.entry.toLowerCase(),
        });
      },
      /case-folded ID collision/,
    ],
    [
      "relative escape",
      (b) => {
        b.catalog.documents[0].path = "../README.md";
        b.profile.allowed_source_paths[0] = "../README.md";
      },
      /documentation allowlist/,
    ],
    [
      "absolute path",
      (b) => {
        b.catalog.documents[0].path = "C:/private.md";
        b.profile.allowed_source_paths[0] = "C:/private.md";
      },
      /documentation allowlist/,
    ],
    [
      "protected owner input",
      (b) => {
        b.catalog.documents[1].path = "docs/protected.md";
        b.profile.allowed_source_paths[1] = "docs/protected.md";
      },
      /protected or misidentified/,
    ],
    [
      "source pin",
      (b) => {
        b.catalog.documents[0].git_pin.sha256 = "b".repeat(64);
      },
      /Git citation pin mismatch/,
    ],
    [
      "source revision",
      (b) => {
        b.catalog.documents[0].source_revision = "b".repeat(40);
      },
      /revision differs/,
    ],
    [
      "unknown locator",
      (b) => {
        b.entries.entries[0].sources[0].document =
          "synthetic-a:document:unknown";
      },
      /unresolved document/,
    ],
    [
      "wrong locator section",
      (b) => {
        b.entries.entries[0].sources[0].section = "Invented authority";
      },
      /section locator mismatch/,
    ],
    [
      "wrong locator line",
      (b) => {
        b.entries.entries[0].sources[0].observed_line = 3;
      },
      /section locator mismatch/,
    ],
    [
      "private reference URL",
      (b) => {
        b.references.references[0].url = "https://user:secret@example.invalid";
      },
      /credential-free HTTPS/,
    ],
    [
      "script reference URL",
      (b) => {
        b.references.references[0].url = "javascript:alert(1)";
      },
      /credential-free HTTPS/,
    ],
    [
      "unscoped strong relation",
      (b) => {
        b.profile.relations = [
          { from: f.ids.entry, to: f.ids.topic, type: "evidenced_by" },
        ];
      },
      /schema rejected/,
    ],
    [
      "case-variant relation endpoint",
      (b) => {
        b.profile.relations = [
          {
            from: f.ids.entry.toLowerCase(),
            to: f.ids.topic,
            type: "evidenced_by",
            evidence: clone(b.entries.entries[0].sources[0]),
            scope: "Synthetic scoped evidence only.",
          },
        ];
      },
      /unresolved exact endpoint/,
    ],
    [
      "invented inherited review",
      (b) => {
        Object.assign(b.references.references[0], {
          inherited_from: f.ids.topic,
          inherited_section: "Synthetic topic",
          verification: "primary_review_complete",
        });
      },
      /cannot imply fresh primary review/,
    ],
  ]) {
    await context.test(name, async () => {
      Object.assign(f.bundle, clone(original));
      mutate(f.bundle);
      await f.save();
      await assert.rejects(validateKnowledge(f.root), expected);
    });
  }
});

test("historical citations survive controlled changes with visible freshness and namespace isolation", async (context) => {
  const first = await fixture(context);
  const second = await fixture(context, "synthetic-b");
  const before = await validateKnowledge(first.root);
  assert.equal(before.report.stale_documents, 0);
  await writeFile(
    path.join(first.root, "docs/topic.md"),
    "# Revised synthetic source\n\nNew controlled local revision.\n",
  );
  const after = await validateKnowledge(first.root);
  assert.equal(after.report.stale_documents, 1);
  assert.equal(
    after.report.observations[1].historical_pin,
    "verified_git_blob",
  );
  assert.equal(
    after.report.observations[1].content_observation,
    "stale_content_observation",
  );
  assert.equal(after.entries.entries[0].sources[0].section, "Synthetic topic");
  const generated = buildNavigation(after);
  assert.match(
    generated.files.get(filename(first.ids.topic)),
    /stale_content_observation/,
  );
  assert.deepEqual([...generated.files], [...buildNavigation(after).files]);
  assert.ok(generated.graph.edges.every((edge) => edge.type === "links_to"));
  assert.ok(
    generated.graph.edges.some(
      (edge) => edge.from === first.ids.readme && edge.to === first.ids.topic,
    ),
  );
  const other = buildNavigation(await validateKnowledge(second.root));
  assert.ok(other.graph.nodes.every((id) => id.startsWith("synthetic-b:")));
  assert.equal(
    other.graph.nodes.some((id) => generated.graph.nodes.includes(id)),
    false,
  );
  const template = parseYaml(
    await readFile(path.join(projectRoot, "knowledge/template-profile.yaml")),
  );
  assertSchema("profile", template);
  assert.equal(template.project, "example-project");
});

test("Policy Sentinel custody identity cannot be removed, swapped or weakened by a current edit", async (context) => {
  const f = await fixture(context, "policy-sentinel");
  const registry = f.bundle.profile.protected_inputs_registry;
  await validateKnowledge(f.root);
  for (const replacement of [null, "docs/custody.json"]) {
    f.bundle.profile.protected_inputs_registry = replacement;
    await f.save();
    await assert.rejects(
      validateKnowledge(f.root),
      /registry cannot be removed or replaced/,
    );
  }
  f.bundle.profile.protected_inputs_registry = registry;
  await writeFile(
    path.join(f.root, registry),
    JSON.stringify({ ownerInputs: [] }),
  );
  f.bundle.catalog.documents[1].path = "docs/protected.md";
  f.bundle.profile.allowed_source_paths[1] = "docs/protected.md";
  await f.save();
  await assert.rejects(validateKnowledge(f.root), /protected or misidentified/);
});

test("Policy Sentinel canonical authority roles reject synchronized redirection and ID/path swaps", async (context) => {
  const f = await fixture(context, "policy-sentinel");
  const original = clone(f.bundle);
  for (const role of Object.keys(f.bundle.profile.authority_owners)) {
    Object.assign(f.bundle, clone(original));
    f.bundle.profile.authority_owners[role] = f.ids.readme;
    f.bundle.catalog.authority_owners[role] = f.ids.readme;
    await f.save();
    await assert.rejects(
      validateKnowledge(f.root),
      new RegExp(`canonical authority owner changed: ${role}`),
    );
  }
  Object.assign(f.bundle, clone(original));
  const roadmap = f.bundle.catalog.documents.find(
    (record) => record.id === "policy-sentinel:document:roadmap",
  );
  const topic = f.bundle.catalog.documents.find(
    (record) => record.id === f.ids.topic,
  );
  [roadmap.path, topic.path] = [topic.path, roadmap.path];
  await f.save();
  await assert.rejects(
    validateKnowledge(f.root),
    /canonical authority owner changed: work_status/,
  );
  Object.assign(f.bundle, clone(original));
  const roadmapId = f.bundle.catalog.documents.find(
    (record) => record.path === "ROADMAP.yaml",
  );
  const topicId = f.bundle.catalog.documents.find(
    (record) => record.path === "docs/topic.md",
  );
  [roadmapId.id, topicId.id] = [topicId.id, roadmapId.id];
  await f.save();
  await assert.rejects(
    validateKnowledge(f.root),
    /canonical authority owner changed: work_status/,
  );
});

test("navigation omits code, comments, escaped links and embeds while retaining scoped curated relations", async (context) => {
  const f = await fixture(context);
  await writeFile(
    path.join(f.root, "README.md"),
    [
      "# Synthetic authority",
      "",
      "    [Indented](docs/topic.md)",
      "\t[Tab](docs/topic.md)",
      "<!-- [Comment](docs/topic.md) -->",
      "\\[Escaped](docs/topic.md)",
      "![Image](docs/topic.md)",
      "`[Inline](docs/topic.md)`",
      "```md",
      "[Fenced](docs/topic.md)",
      "```",
      "<div>[HTML line](docs/topic.md)</div>",
    ].join("\n"),
  );
  const without = buildNavigation(await validateKnowledge(f.root));
  assert.equal(
    without.graph.edges.some((edge) => edge.origin === "explicit_markdown"),
    false,
  );
  f.bundle.profile.relations = [
    {
      from: f.ids.entry,
      to: f.ids.topic,
      type: "evidenced_by",
      evidence: clone(f.bundle.entries.entries[0].sources[0]),
      scope: "One synthetic fixture only; no product acceptance.",
    },
  ];
  await f.save();
  const withRelation = buildNavigation(await validateKnowledge(f.root));
  const stronger = withRelation.graph.edges.filter(
    (edge) => edge.type !== "links_to",
  );
  assert.equal(stronger.length, 1);
  assert.equal(stronger[0].scope, f.bundle.profile.relations[0].scope);
  assert.equal(stronger[0].origin, "explicit_scoped_relation");
});

test("literal text cannot create YAML structure, scripts, embeds or unintended links", async (context) => {
  const f = await fixture(context);
  const attack =
    "title: injection\n---\n![[private]] ![pixel](https://example.invalid/pixel) <script>alert(1)</script> [[authority]]";
  f.bundle.entries.entries[0].title = attack;
  f.bundle.entries.entries[0].summary = attack;
  await f.save();
  const output = buildNavigation(await validateKnowledge(f.root));
  const card = output.files.get(filename(f.ids.entry));
  assert.equal(card.includes("![[private]]"), false);
  assert.equal(card.includes("<script>"), false);
  assert.equal(card.includes("[[authority]]"), false);
  assert.equal(card.includes("![pixel]"), false);
  const metadata = parseYaml(card.split("---\n")[1]);
  assert.equal(metadata.knowledge_id, f.ids.entry);
  assert.equal(metadata.publish, false);
  assert.equal(Object.keys(metadata).includes("injection"), false);
  assert.equal(
    [...output.files.keys()].some((name) => name.includes("injection")),
    false,
  );
  for (const kind of ["document", "knowledge", "reference"]) {
    const base = parseYaml(output.files.get(`${kind}.base`));
    assert.equal(base.views[0].type, "table");
    assert.ok(base.filters.and.includes(`note.kind == "${kind}"`));
  }
});

test("current and historically pinned source bytes must be valid finite UTF-8", async (context) => {
  const f = await fixture(context);
  const target = path.join(f.root, "docs/topic.md");
  const original = await readFile(target);
  const malformed = Buffer.from([0x23, 0x20, 0xff, 0x0a]);
  await writeFile(target, malformed);
  await assert.rejects(validateKnowledge(f.root), /encoded data/);
  git(f.root, ["-c", "core.autocrlf=false", "add", "docs/topic.md"]);
  git(f.root, [
    "-c",
    "user.name=Knowledge Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "Synthetic malformed UTF-8 historical source",
  ]);
  const revision = git(f.root, ["rev-parse", "HEAD"]).trim();
  for (const name of ["catalog", "entries", "references"])
    f.bundle[name].source_revision = revision;
  for (const record of f.bundle.catalog.documents)
    record.source_revision = revision;
  const topic = f.bundle.catalog.documents.find(
    (record) => record.id === f.ids.topic,
  );
  topic.git_pin.oid = git(f.root, [
    "rev-parse",
    `${revision}:docs/topic.md`,
  ]).trim();
  topic.git_pin.sha256 = sha256(malformed);
  await f.save();
  await writeFile(target, original);
  await assert.rejects(validateKnowledge(f.root), /encoded data/);
  await writeFile(target, Buffer.alloc(LIMITS.sourceBytes + 1));
  await assert.rejects(validateKnowledge(f.root), /bounded plain file/);
});

test("owned publication refuses edited, unknown, hard-linked and cross-project output", async (context) => {
  const f = await fixture(context);
  const model = await validateKnowledge(f.root);
  const { files } = buildNavigation(model);
  const first = await publishKnowledge(model, files, f.output);
  const verified = await verifyOwnedOutput(f.output, model.profile.project);
  assert.equal(first.manifest_sha256, verified.hash);
  const repeated = await publishKnowledge(model, files, f.output);
  assert.equal(first.manifest_sha256, repeated.manifest_sha256);
  const target = path.join(f.output, filename(f.ids.topic));
  const original = await readFile(target);
  await writeFile(target, "Human edit must survive.\n");
  await assert.rejects(
    publishKnowledge(model, files, f.output),
    /edited generated file/,
  );
  assert.equal(await readFile(target, "utf8"), "Human edit must survive.\n");
  await writeFile(target, original);
  await writeFile(path.join(f.output, "unknown.md"), "Not owned.\n");
  await assert.rejects(
    publishKnowledge(model, files, f.output),
    /unknown file/,
  );
  await rm(path.join(f.output, "unknown.md"));
  await link(target, path.join(f.owned, "hardlink.md"));
  await assert.rejects(publishKnowledge(model, files, f.output), /hard-linked/);
  await rm(path.join(f.owned, "hardlink.md"));
  const other = await fixture(context, "synthetic-b");
  const otherModel = await validateKnowledge(other.root);
  await assert.rejects(
    publishKnowledge(otherModel, buildNavigation(otherModel).files, f.output),
    /ownership manifest rejected/,
  );
  const changedAlias = {
    ...model,
    profile: { ...model.profile, source_root_alias: "different-origin" },
  };
  await assert.rejects(
    publishKnowledge(changedAlias, files, f.output),
    /source root alias differs/,
  );
  await assert.rejects(
    publishKnowledge(model, files, path.join(f.root, "view")),
    /separate named external/,
  );
  const collision = new Map(files);
  collision.set(filename(f.ids.topic).toUpperCase(), "Collision");
  await assert.rejects(
    publishKnowledge(model, collision, path.join(f.owned, "collision")),
    /identity collision or unsafe path/,
  );
});

test("interrupted staging and publish failure preserve the prior complete view", async (context) => {
  const f = await fixture(context);
  const model = await validateKnowledge(f.root);
  const { files } = buildNavigation(model);
  const first = await publishKnowledge(model, files, f.output);
  for (const stage of ["staged_file", "staged", "before_publish"]) {
    await assert.rejects(
      publishKnowledge(model, files, f.output, {
        checkpoint: async (event) => {
          if (event === stage)
            throw new Error(`synthetic ${stage} interruption`);
        },
      }),
      /publication failed/,
    );
    assert.equal(
      (await verifyOwnedOutput(f.output, model.profile.project)).hash,
      first.manifest_sha256,
    );
    assert.deepEqual((await readdir(f.owned)).sort(), [
      "reading-vault",
      "repository",
    ]);
  }
  const reduced = new Map(files);
  reduced.delete(filename(f.ids.reference));
  await publishKnowledge(model, reduced, f.output);
  assert.equal(
    (await readdir(f.output)).includes(filename(f.ids.reference)),
    false,
  );
  await assert.rejects(
    publishKnowledge(model, reduced, f.output, {
      checkpoint: async (event) => {
        if (event === "staged")
          await writeFile(
            path.join(f.output, "concurrent.md"),
            "Concurrent owner content",
          );
      },
    }),
    /unknown file/,
  );
  assert.equal(
    await readFile(path.join(f.output, "concurrent.md"), "utf8"),
    "Concurrent owner content",
  );
});

test("junction or symlink output and source ancestors are refused", async (context) => {
  const f = await fixture(context);
  const model = await validateKnowledge(f.root);
  const { files } = buildNavigation(model);
  const destination = path.join(f.owned, "outside");
  await mkdir(destination);
  const shortcut = path.join(f.owned, "shortcut");
  await symlink(
    destination,
    shortcut,
    process.platform === "win32" ? "junction" : "dir",
  );
  if (process.platform === "win32")
    assert.throws(
      () => assertNoWindowsReparsePoints([shortcut]),
      /native Windows reparse attribute/,
    );
  await assert.rejects(
    publishKnowledge(model, files, path.join(shortcut, "view")),
    /symlink\/reparse/,
  );
  assert.deepEqual(await readdir(destination), []);
  const originalDocs = path.join(f.owned, "original-docs");
  await rename(path.join(f.root, "docs"), originalDocs);
  await symlink(
    originalDocs,
    path.join(f.root, "docs"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(
    validateKnowledge(f.root),
    /native Windows reparse attribute|symlink\/reparse/,
  );
});
