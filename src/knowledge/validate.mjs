import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";
import { TextDecoder } from "node:util";
import { URL } from "node:url";
import { spawnSync } from "node:child_process";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { parseDocument } from "yaml";
import { assertSchema } from "./schema.mjs";

export const LIMITS = Object.freeze({
  metadataBytes: 524288,
  sourceBytes: 2097152,
  totalSourceBytes: 8388608,
  outputFiles: 2048,
  outputBytes: 8388608,
});
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const fail = (message) => {
  throw new Error(`knowledge: ${message}`);
};
export function within(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}
export function assertNoWindowsReparsePoints(targets) {
  if (process.platform !== "win32") return;
  const paths = new Set();
  for (const target of targets) {
    let current = path.resolve(target);
    while (current !== path.dirname(current)) {
      paths.add(current);
      current = path.dirname(current);
    }
  }
  // Native attributes cover reparse tags beyond Node's symlink/junction test.
  // Paths are JSON stdin data; the PowerShell program is fixed, never interpolated.
  const command =
    "$ErrorActionPreference='Stop'; $paths = [Console]::In.ReadToEnd() | ConvertFrom-Json; foreach ($entry in $paths) { $item = Get-Item -Force -LiteralPath $entry; if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { exit 3 } }; exit 0";
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", command],
    {
      input: JSON.stringify([...paths]),
      encoding: "utf8",
      timeout: 10000,
      maxBuffer: 16384,
      windowsHide: true,
    },
  );
  if (result.error || result.signal || result.status !== 0)
    fail("native Windows reparse attribute check refused or unavailable");
}
export async function assertPlainPath(target, { missingLeaf = false } = {}) {
  const absolute = path.resolve(target);
  const volume = path.parse(absolute).root;
  let current = volume;
  const segments = absolute
    .slice(volume.length)
    .split(path.sep)
    .filter(Boolean);
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    let info;
    try {
      info = await lstat(current);
    } catch (error) {
      if (
        missingLeaf &&
        index === segments.length - 1 &&
        error.code === "ENOENT"
      )
        return null;
      throw error;
    }
    if (info.isSymbolicLink() || (info.isFile() && info.nlink !== 1))
      fail("symlink/reparse or hard-linked path refused");
    if (index < segments.length - 1 && !info.isDirectory())
      fail("non-directory path ancestor");
    const resolved = await realpath(current);
    if (resolved.toLowerCase() !== current.toLowerCase())
      fail("resolved path differs from declared path");
    if (index === segments.length - 1) return info;
  }
  return lstat(absolute);
}
export async function boundedRead(file, maximum = LIMITS.sourceBytes) {
  const info = await assertPlainPath(file);
  if (!info.isFile() || info.size > maximum)
    fail("input is not a bounded plain file");
  const bytes = await readFile(file);
  if (bytes.length > maximum) fail("input grew beyond its byte limit");
  return bytes;
}
export function parseYaml(bytes, label = "metadata") {
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes);
  if (bytes.length > LIMITS.metadataBytes)
    fail(`${label} exceeds metadata byte limit`);
  const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const document = parseDocument(source, {
    strict: true,
    uniqueKeys: true,
    prettyErrors: false,
  });
  if (document.errors.length || document.warnings.length)
    fail(
      `${label} YAML errors or warnings (${document.errors.length}/${document.warnings.length})`,
    );
  try {
    return document.toJS({ maxAliasCount: 0 });
  } catch {
    fail(`${label} YAML alias expansion or conversion refused`);
  }
}
export function sourcePath(relative) {
  if (
    typeof relative !== "string" ||
    !/^(?:AGENTS\.md|README\.md|ROADMAP\.yaml|docs\/[A-Za-z0-9_./-]+\.(?:md|json|yaml))$/.test(
      relative,
    ) ||
    relative.split("/").some((part) => ["", ".", ".."].includes(part))
  )
    fail("source path is outside the repository documentation allowlist");
  return relative;
}
function git(root, args) {
  const result = spawnSync("git", ["-C", root, ...args], {
    encoding: null,
    timeout: 10000,
    maxBuffer: LIMITS.sourceBytes + 1024,
    windowsHide: true,
  });
  if (result.error || result.signal || result.status !== 0)
    fail("bounded Git source lookup failed");
  return result.stdout;
}
const normalizedContent = (text) =>
  Buffer.from(text.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n"));
const heading = (line) =>
  line
    .replace(/^#{1,6}\s+/, "")
    .replace(/\s+#+\s*$/, "")
    .trim();
function https(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("reference URL is malformed");
  }
  if (url.protocol !== "https:" || url.username || url.password)
    fail("reference URL must be credential-free HTTPS");
}

export async function validateKnowledge(root) {
  root = path.resolve(root);
  const info = await assertPlainPath(root);
  if (!info.isDirectory()) fail("repository root is not a directory");
  const bundles = {};
  const metadataHashes = {};
  for (const name of ["profile", "catalog", "entries", "references"]) {
    const bytes = await boundedRead(
      path.join(root, "knowledge", `${name}.yaml`),
      LIMITS.metadataBytes,
    );
    bundles[name] = parseYaml(bytes, name);
    assertSchema(name, bundles[name]);
    metadataHashes[name] = sha256(bytes);
  }
  const { profile, catalog, entries, references } = bundles;
  if (
    root.toLowerCase() ===
      path.resolve(import.meta.dirname, "../..").toLowerCase() &&
    profile.project !== "policy-sentinel"
  )
    fail("implementation repository namespace cannot change");
  assertNoWindowsReparsePoints([
    root,
    ...["profile", "catalog", "entries", "references"].map((name) =>
      path.join(root, "knowledge", `${name}.yaml`),
    ),
    ...catalog.documents.map((record) =>
      path.join(root, sourcePath(record.path)),
    ),
  ]);
  if (
    [catalog, entries, references].some(
      (value) => value.project !== profile.project,
    )
  )
    fail("cross-project namespace mismatch");
  if (
    catalog.source_root_alias !== profile.source_root_alias ||
    JSON.stringify(catalog.authority_owners) !==
      JSON.stringify(profile.authority_owners)
  )
    fail("authority owners or root alias disagree");
  if (
    [entries, references].some(
      (value) => value.source_revision !== catalog.source_revision,
    )
  )
    fail("bundle source revisions disagree");
  const all = [
    ...catalog.documents,
    ...entries.entries,
    ...references.references,
  ];
  const ids = new Map();
  for (const record of all) {
    if (!record.id.startsWith(`${profile.project}:`))
      fail("record belongs to another project namespace");
    const folded = record.id.toLowerCase();
    if (ids.has(folded)) fail("duplicate or Windows case-folded ID collision");
    ids.set(folded, record);
  }
  const documents = new Map(
    catalog.documents.map((record) => [record.id, record]),
  );
  const knowledgeIds = new Set(entries.entries.map((record) => record.id));
  if (profile.project === "policy-sentinel") {
    const canonicalOwners = {
      navigation: ["backbone", "docs/PROJECT-BACKBONE.md"],
      work_status: ["roadmap", "ROADMAP.yaml"],
      decisions: ["decisions", "docs/decision-register.md"],
      product: ["brief", "docs/project-brief.md"],
      scope_acceptance: ["pnw", "docs/pnw-scope-and-acceptance.md"],
      data_governance: ["governance", "docs/data-governance.md"],
      component_dispositions: [
        "convergence",
        "docs/development/ps09-convergence.v1.json",
      ],
      protected_inputs: [
        "custody",
        "docs/development/ps09-run-01-custody.json",
      ],
    };
    for (const [role, [name, canonicalPath]] of Object.entries(
      canonicalOwners,
    )) {
      const canonicalId = `policy-sentinel:document:${name}`;
      if (
        profile.authority_owners[role] !== canonicalId ||
        documents.get(canonicalId)?.path !== canonicalPath
      )
        fail(`Policy Sentinel canonical authority owner changed: ${role}`);
    }
  }
  for (const owner of Object.values(profile.authority_owners))
    if (!documents.has(owner))
      fail("authority owner is not a catalog document");
  const prohibited = new Set();
  if (
    profile.project === "policy-sentinel" &&
    profile.protected_inputs_registry !==
      "docs/development/ps09-run-01-custody.json"
  )
    fail(
      "Policy Sentinel protected-input registry cannot be removed or replaced",
    );
  if (profile.protected_inputs_registry !== null) {
    sourcePath(profile.protected_inputs_registry);
    assertNoWindowsReparsePoints([
      path.join(root, profile.protected_inputs_registry),
    ]);
    // Both historical custody and current additions constrain admission. A
    // working-file edit cannot silently remove a preserved owner identity.
    const custodyInputs = [
      await boundedRead(path.join(root, profile.protected_inputs_registry)),
      git(root, [
        "cat-file",
        "blob",
        `${catalog.source_revision}:${profile.protected_inputs_registry}`,
      ]),
    ];
    for (const input of custodyInputs) {
      const custody = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(input),
      );
      if (!Array.isArray(custody.ownerInputs))
        fail("protected custody registry is malformed");
      for (const item of custody.ownerInputs) {
        if (typeof item.path !== "string") fail("custody path is malformed");
        prohibited.add(item.path.toLowerCase());
      }
    }
  }
  const allowed = new Set(profile.allowed_source_paths);
  if (
    allowed.size !== catalog.documents.length ||
    catalog.documents.some((record) => !allowed.has(record.path))
  )
    fail("profile source allowlist must exactly account for catalog documents");
  for (const value of allowed) sourcePath(value);
  const paths = new Set();
  const observations = [];
  const sources = new Map();
  let totalBytes = 0;
  for (const record of catalog.documents) {
    const relative = sourcePath(record.path);
    if (
      !record.id.startsWith(`${profile.project}:document:`) ||
      prohibited.has(relative.toLowerCase())
    )
      fail("protected or misidentified document input");
    if (paths.has(relative.toLowerCase()))
      fail("duplicate or case-folded document path");
    paths.add(relative.toLowerCase());
    if (record.source_revision !== catalog.source_revision)
      fail("document revision differs from its historical catalog");
    const absolute = path.join(root, relative);
    if (!within(root, absolute)) fail("document escapes repository root");
    if (git(root, ["ls-files", "--error-unmatch", "--", relative]).length === 0)
      fail("source is not tracked");
    const current = await boundedRead(absolute);
    const blob = git(root, [
      "cat-file",
      "blob",
      `${record.source_revision}:${relative}`,
    ]);
    const oid = git(root, [
      "rev-parse",
      `${record.source_revision}:${relative}`,
    ])
      .toString("utf8")
      .trim();
    const currentText = new TextDecoder("utf-8", { fatal: true }).decode(
      current,
    );
    const historicalText = new TextDecoder("utf-8", { fatal: true }).decode(
      blob,
    );
    totalBytes += current.length + blob.length;
    if (totalBytes > LIMITS.totalSourceBytes)
      fail("total source byte limit exceeded");
    if (oid !== record.git_pin.oid || sha256(blob) !== record.git_pin.sha256)
      fail("historical Git citation pin mismatch");
    observations.push({
      id: record.id,
      path: relative,
      historical_pin: "verified_git_blob",
      raw_observation:
        sha256(current) === record.working_file_sha256
          ? "unchanged_raw_bytes"
          : "stale_raw_observation",
      content_observation:
        sha256(normalizedContent(currentText)) ===
        sha256(normalizedContent(historicalText))
          ? "matches_historical_content"
          : "stale_content_observation",
      current_raw_sha256: sha256(current),
      historical_git_sha256: record.git_pin.sha256,
    });
    sources.set(record.id, {
      current: currentText,
      historical: historicalText,
    });
  }
  const verifyLocator = (locator) => {
    if (!documents.has(locator.document))
      fail("source locator has unresolved document ID");
    const lines = sources.get(locator.document).historical.split(/\r?\n/);
    const line = lines[locator.observed_line - 1];
    if (
      line === undefined ||
      !/^#{1,6}\s/.test(line) ||
      heading(line) !== locator.section
    )
      fail(
        `historical section locator mismatch: ${locator.document}:${locator.observed_line}`,
      );
  };
  let locators = 0;
  for (const record of entries.entries) {
    if (!record.id.startsWith(`${profile.project}:knowledge:`))
      fail("knowledge record ID kind mismatch");
    for (const locator of record.sources) {
      verifyLocator(locator);
      locators += 1;
    }
  }
  for (const record of references.references) {
    if (!record.id.startsWith(`${profile.project}:reference:`))
      fail("reference ID kind mismatch");
    https(record.url);
    for (const url of record.evidence ?? []) https(url);
    for (const entryId of record.related_entries ?? [])
      if (!knowledgeIds.has(entryId))
        fail("reference has unresolved related entry");
    if (record.inherited_from) {
      if (
        !documents.has(record.inherited_from) ||
        !record.inherited_section ||
        !sources
          .get(record.inherited_from)
          .historical.split(/\r?\n/)
          .some(
            (line) =>
              /^#{1,6}\s/.test(line) &&
              heading(line) === record.inherited_section,
          )
      )
        fail("inherited reference source cannot be resolved");
      if (
        record.verification !==
        "inherited_repository_bibliography_not_revalidated_in_this_audit"
      )
        fail("inherited bibliography cannot imply fresh primary review");
    }
  }
  for (const relation of profile.relations) {
    if (
      !all.some((record) => record.id === relation.from) ||
      !all.some((record) => record.id === relation.to)
    )
      fail("curated relation has unresolved exact endpoint");
    verifyLocator(relation.evidence);
  }
  for (const registry of profile.registry_links)
    if (!documents.has(registry.document))
      fail("reviewed registry link source is unresolved");
  const report = {
    schema_version: "1.0.0",
    project: profile.project,
    counts: {
      documents: documents.size,
      entries: entries.entries.length,
      references: references.references.length,
      source_locators: locators,
    },
    metadata_hash_domain: "raw_file_bytes",
    metadata_hashes: metadataHashes,
    stale_documents: observations.filter((entry) =>
      entry.raw_observation.startsWith("stale"),
    ).length,
    observations,
    limitations: [
      "Historical pins remain valid when current files are visibly stale.",
      "This sidecar does not authorize work, source activation, export or publication.",
      "Raw working-file observations, Git blobs and canonical LF content are separate hash domains.",
    ],
  };
  return { root, ...bundles, sources, report };
}
