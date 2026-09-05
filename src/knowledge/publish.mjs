import {
  mkdir,
  readdir,
  readFile,
  rename,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import {
  assertNoWindowsReparsePoints,
  assertPlainPath,
  boundedRead,
  fail,
  LIMITS,
  sha256,
  within,
} from "./validate.mjs";

const manifestName = "MANIFEST.json";
const fileName = (name) =>
  typeof name === "string" &&
  /^(?:[a-z0-9][a-z0-9-]*--(?:document|knowledge|reference)--[A-Za-z0-9-]+\.md|INDEX\.md|(?:document|knowledge|reference)\.base|navigation\.json|validation\.json)$/.test(
    name,
  );
const exactKeys = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join("|") === [...keys].sort().join("|");

export async function verifyOwnedOutput(root, project, sourceRootAlias) {
  const info = await assertPlainPath(root);
  if (!info.isDirectory()) fail("output root is not a plain directory");
  const rawManifest = await boundedRead(
    path.join(root, manifestName),
    LIMITS.metadataBytes,
  );
  const manifest = JSON.parse(rawManifest.toString("utf8"));
  if (
    !exactKeys(manifest, [
      "schema_version",
      "generator",
      "project",
      "source_root_alias",
      "export_disposition",
      "files",
    ]) ||
    manifest.schema_version !== "1.0.0" ||
    manifest.generator !== "knowledge-detached-view-v1" ||
    manifest.project !== project ||
    typeof manifest.source_root_alias !== "string" ||
    manifest.export_disposition !== "local_only_metadata_projection" ||
    !Array.isArray(manifest.files) ||
    manifest.files.length === 0 ||
    manifest.files.length > LIMITS.outputFiles
  )
    fail("output ownership manifest rejected");
  if (
    sourceRootAlias !== undefined &&
    manifest.source_root_alias !== sourceRootAlias
  )
    fail("output source root alias differs from selected origin");
  const owned = new Set();
  let totalBytes = 0;
  for (const entry of manifest.files) {
    if (
      !exactKeys(entry, ["path", "bytes", "sha256"]) ||
      !fileName(entry.path) ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 0 ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      owned.has(entry.path.toLowerCase())
    )
      fail("output manifest file entry rejected");
    owned.add(entry.path.toLowerCase());
    totalBytes += entry.bytes;
    if (totalBytes > LIMITS.outputBytes)
      fail("output ownership exceeds byte limit");
    const bytes = await boundedRead(
      path.join(root, entry.path),
      LIMITS.outputBytes,
    );
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256)
      fail("edited generated file refused");
  }
  const actual = await readdir(root);
  assertNoWindowsReparsePoints([
    root,
    ...actual.map((name) => path.join(root, name)),
  ]);
  if (
    actual.length !== manifest.files.length + 1 ||
    actual.some(
      (name) => name !== manifestName && !owned.has(name.toLowerCase()),
    )
  )
    fail("unknown file in generated output refused");
  // Case-fold checks alone cannot authorize a differently cased replacement.
  const exact = new Set([
    ...manifest.files.map((entry) => entry.path),
    manifestName,
  ]);
  if (actual.some((name) => !exact.has(name)))
    fail("output filename identity changed");
  return { manifest, rawManifest, hash: sha256(rawManifest) };
}

async function removeOwned(root, project, expectedHash) {
  const verified = await verifyOwnedOutput(root, project);
  if (verified.hash !== expectedHash)
    fail("output ownership changed before cleanup");
  for (const entry of verified.manifest.files) {
    const target = path.resolve(root, entry.path);
    if (!within(root, target) || target === root)
      fail("cleanup target escapes owned output");
    const bytes = await boundedRead(target, LIMITS.outputBytes);
    if (sha256(bytes) !== entry.sha256)
      fail("generated file changed before cleanup");
    await unlink(target);
  }
  await assertPlainPath(path.join(root, manifestName));
  if (sha256(await readFile(path.join(root, manifestName))) !== expectedHash)
    fail("manifest changed before cleanup");
  await unlink(path.join(root, manifestName));
  await rmdir(root); // Refuses a late unknown file rather than deleting it.
}

export async function publishKnowledge(
  model,
  files,
  output,
  { checkpoint = async () => {} } = {},
) {
  output = path.resolve(output);
  const parent = path.dirname(output);
  if (
    within(model.root, output) ||
    within(output, model.root) ||
    output === path.parse(output).root ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(path.basename(output))
  )
    fail("output must be a separate named external directory");
  const parentInfo = await assertPlainPath(parent);
  assertNoWindowsReparsePoints([parent]);
  if (!parentInfo.isDirectory())
    fail("output parent must already be an owned plain directory");
  if (
    !(files instanceof Map) ||
    files.size === 0 ||
    files.size > LIMITS.outputFiles
  )
    fail("generated file count rejected");
  let totalBytes = 0;
  const folded = new Set();
  const entries = [...files]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([name, value]) => {
      if (
        !fileName(name) ||
        typeof value !== "string" ||
        folded.has(name.toLowerCase())
      )
        fail("generated file identity collision or unsafe path");
      folded.add(name.toLowerCase());
      const bytes = Buffer.from(value);
      totalBytes += bytes.length;
      if (totalBytes > LIMITS.outputBytes)
        fail("generated bytes exceed output ceiling");
      return { path: name, bytes: bytes.length, sha256: sha256(bytes) };
    });
  const manifest = {
    schema_version: "1.0.0",
    generator: "knowledge-detached-view-v1",
    project: model.profile.project,
    source_root_alias: model.profile.source_root_alias,
    export_disposition: "local_only_metadata_projection",
    files: entries,
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const manifestHash = sha256(manifestBytes);
  const priorInfo = await assertPlainPath(output, { missingLeaf: true });
  const prior = priorInfo
    ? await verifyOwnedOutput(output, model.profile.project)
    : null;
  if (
    prior &&
    prior.manifest.source_root_alias !== model.profile.source_root_alias
  )
    fail("output source root alias differs from selected origin");
  const operationId = randomUUID();
  const stage = path.join(
    parent,
    `.${path.basename(output)}.stage-${operationId}`,
  );
  const backup = path.join(
    parent,
    `.${path.basename(output)}.backup-${operationId}`,
  );
  await mkdir(stage); // A random exclusive directory supplies this call's write lease.
  const staged = [];
  let movedOld = false;
  let published = false;
  let stageSealed = false;
  let primary = null;
  const secondary = [];
  try {
    for (const entry of entries) {
      const target = path.join(stage, entry.path);
      await writeFile(target, files.get(entry.path), {
        encoding: "utf8",
        flag: "wx",
      });
      staged.push(entry);
      await checkpoint("staged_file", entry.path);
    }
    await writeFile(path.join(stage, manifestName), manifestBytes, {
      flag: "wx",
    });
    stageSealed = true;
    await verifyOwnedOutput(
      stage,
      model.profile.project,
      model.profile.source_root_alias,
    );
    await checkpoint("staged");
    await assertPlainPath(parent);
    if (prior) {
      const current = await verifyOwnedOutput(
        output,
        model.profile.project,
        model.profile.source_root_alias,
      );
      if (current.hash !== prior.hash) fail("output changed during generation");
      await rename(output, backup);
      movedOld = true;
    } else if (await assertPlainPath(output, { missingLeaf: true }))
      fail("unknown output appeared during generation");
    await checkpoint("before_publish");
    await rename(stage, output);
    published = true;
    await checkpoint("published");
    await verifyOwnedOutput(
      output,
      model.profile.project,
      model.profile.source_root_alias,
    );
  } catch (error) {
    primary = error;
  }
  if (primary && movedOld && !published) {
    try {
      if (await assertPlainPath(output, { missingLeaf: true }))
        fail("rollback destination was created concurrently");
      await verifyOwnedOutput(
        backup,
        model.profile.project,
        model.profile.source_root_alias,
      );
      await rename(backup, output);
      movedOld = false;
    } catch (error) {
      secondary.push(error);
    }
  }
  if (!published) {
    try {
      if (stageSealed)
        await removeOwned(stage, model.profile.project, manifestHash);
      else {
        await assertPlainPath(stage);
        const actual = await readdir(stage);
        if (
          actual.length !== staged.length ||
          actual.some((name) => !staged.some((entry) => entry.path === name))
        )
          fail("unknown staging content prevents cleanup");
        for (const entry of staged) {
          const target = path.join(stage, entry.path);
          const bytes = await boundedRead(target, LIMITS.outputBytes);
          if (sha256(bytes) !== entry.sha256)
            fail("edited staging content prevents cleanup");
          await unlink(target);
        }
        await rmdir(stage);
      }
    } catch (error) {
      secondary.push(error);
    }
  }
  if (!primary && movedOld) {
    try {
      await removeOwned(backup, model.profile.project, prior.hash);
    } catch (error) {
      secondary.push(error);
    }
  }
  if (primary || secondary.length)
    throw new AggregateError(
      [...(primary ? [primary] : []), ...secondary],
      `knowledge publication failed; primary=${primary?.message ?? "none"}; cleanup/rollback failures=${secondary.length}; published=${published}`,
    );
  return {
    output,
    manifest_sha256: manifestHash,
    hash_domain: "raw_file_bytes",
    files: entries.length + 1,
    bytes: totalBytes + manifestBytes.length,
  };
}
