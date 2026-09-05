import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { verifyOwnedOutput } from "../src/knowledge/publish.mjs";

// Read-only retrieval measurements for the predeclared pilot. Semantic review
// belongs to the recorded answer key and reviewer, never this timing script.
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--view")
  throw new Error("Usage: knowledge:pilot -- --view <owned-reading-vault>");
const root = path.resolve(import.meta.dirname, "..");
const view = path.resolve(args[1]);
const ownership = await verifyOwnedOutput(
  view,
  "policy-sentinel",
  "policy-sentinel-repository",
);
const queries = [
  ["Q01", "roadmap", "ROADMAP.yaml", "current_focus"],
  [
    "Q02",
    "outcome",
    "docs/handoffs/ps09-real-policy-discovery-outcome.md",
    "PS09-02",
  ],
  [
    "Q03",
    "outcome",
    "docs/handoffs/ps09-real-policy-discovery-outcome.md",
    "needs_accessibility_review",
  ],
  ["Q04", "agents", "AGENTS.md", "Only its reviewed"],
  ["Q05", "pnw", "docs/pnw-scope-and-acceptance.md", "membership"],
  [
    "Q06",
    "roadmap",
    "ROADMAP.yaml",
    "f4f39c0b7ac2b5ce763d47785b82d0e162fc1217a41377490e8c926ed8cdd381",
  ],
  [
    "Q07",
    "adr",
    "docs/adr/ps09-canonical-corpus.md",
    "Minimal object, identity and citation spine",
  ],
  [
    "Q08",
    "evaluation",
    "docs/development/ps09-real-policy-evaluation.md",
    "25/27",
  ],
  [
    "Q09",
    "outcome",
    "docs/handoffs/ps09-real-policy-discovery-outcome.md",
    "provisional",
  ],
  [
    "Q10",
    "reference:institutional-grammar",
    "knowledge/references.yaml",
    "inherited_repository_bibliography_not_revalidated_in_this_audit",
  ],
];
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const rows = [];
for (const [id, shortId, source, needle] of queries) {
  const sourcePath = path.join(root, source);
  const baselineStart = performance.now();
  const backbone = await readFile(
    path.join(root, "docs/PROJECT-BACKBONE.md"),
    "utf8",
  );
  const search = spawnSync("rg", ["-n", "-F", needle, sourcePath], {
    cwd: root,
    encoding: "utf8",
    timeout: 10000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  if (search.error || search.signal || search.status !== 0)
    throw new Error(`PILOT_BASELINE_LOOKUP_FAILED:${id}`);
  const sourceBytes = await readFile(sourcePath);
  const baselineMs = performance.now() - baselineStart;
  const generatedStart = performance.now();
  const index = await readFile(path.join(view, "INDEX.md"), "utf8");
  const card = `policy-sentinel--${shortId.startsWith("reference:") ? shortId.replace(":", "--") : `document--${shortId}`}.md`;
  if (!index.includes(card)) throw new Error(`PILOT_INDEX_CARD_MISSING:${id}`);
  const cardText = await readFile(path.join(view, card), "utf8");
  if (id !== "Q10" && !cardText.includes(source))
    throw new Error(`PILOT_CARD_LOCATION_MISMATCH:${id}`);
  if (id === "Q10" && !cardText.includes(needle))
    throw new Error("PILOT_REFERENCE_REVIEW_STATE_MISSING");
  const generatedSource = await readFile(sourcePath);
  const generatedMs = performance.now() - generatedStart;
  if (
    !sourceBytes.equals(generatedSource) ||
    !sourceBytes.toString("utf8").includes(needle)
  )
    throw new Error(`PILOT_SOURCE_IDENTITY_MISMATCH:${id}`);
  rows.push({
    id,
    source,
    source_sha256: digest(sourceBytes),
    first_matching_line: Number(search.stdout.split(":")[0]),
    backbone_mentions_location: backbone.includes(
      source.replace(/^docs\//, ""),
    ),
    baseline_ms: baselineMs,
    generated_ms: generatedMs,
    lookup_evidence_matches: true,
  });
}
const validation = JSON.parse(
  await readFile(path.join(view, "validation.json"), "utf8"),
);
console.log(
  JSON.stringify(
    {
      method: "agent_machine_retrieval_proxy_excludes_reasoning_and_human_time",
      semantic_acceptance: "requires_separate_answer_key_review",
      view_manifest_sha256: ownership.hash,
      rows,
      stale_documents: validation.stale_documents,
      readme: validation.observations.find((row) => row.path === "README.md"),
      lookup_limit_passed: rows.every(
        (row) => row.baseline_ms <= 60000 && row.generated_ms <= 60000,
      ),
    },
    null,
    2,
  ),
);
