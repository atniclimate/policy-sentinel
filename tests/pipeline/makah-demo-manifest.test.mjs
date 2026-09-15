import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import test from "node:test";
import { URL } from "node:url";
import {
  initialDirectManifest,
  makahDemoFederalManifest,
} from "../../config/policy-sources.v2.mjs";
import { initializePolicyRun } from "../../src/pipeline/policy-custody.mjs";

const CURRENT_DISCOVERY_TARGET_COUNT = 20;

const MAKAH_TARGET_URLS = [
  "https://www.govinfo.gov/content/pkg/FR-2024-06-18/html/2024-12669.htm",
  "https://www.govinfo.gov/content/pkg/FR-2019-04-05/html/2019-06337.htm",
  "https://www.govinfo.gov/content/pkg/FR-2026-05-12/html/2026-09372.htm",
  "https://www.govinfo.gov/content/pkg/FR-2015-08-26/html/2015-20888.htm",
  "https://www.govinfo.gov/content/pkg/STATUTE-12/pdf/STATUTE-12-Pg939.pdf",
  "https://www.govinfo.gov/content/pkg/USCOURTS-ca9-15-35824/pdf/USCOURTS-ca9-15-35824-0.pdf",
  "https://cdn.ca9.uscourts.gov/datastore/opinions/2016/06/27/13-35474.pdf",
  "https://www.wawd.uscourts.gov/sites/wawd/files/Makah09-01FFCLandMemorandum.pdf",
  "https://www.govinfo.gov/metadata/pkg/STATUTE-12/mods.xml",
  "https://www.govinfo.gov/metadata/pkg/USCOURTS-ca9-15-35824/mods.xml",
];

const MAKAH_TARGET_MEDIA_TYPES = [
  ["text/html"],
  ["text/html"],
  ["text/html"],
  ["text/html"],
  ["application/pdf"],
  ["application/pdf"],
  ["application/pdf"],
  ["application/pdf"],
  ["text/xml", "application/xml"],
  ["text/xml", "application/xml"],
];

async function externalFixture(t) {
  const testParent = dirname(resolve(import.meta.dirname, "../.."));
  const base = await mkdtemp(join(testParent, "policy-custody-test-"));
  t.after(async () => {
    assert.ok(
      resolve(base).startsWith(join(testParent, "policy-custody-test-")),
    );
    await rm(base, { recursive: true, force: true });
  });
  return join(base, "run");
}

test("initialDirectManifest() is unchanged by the new source profile", () => {
  const manifest = initialDirectManifest();
  assert.deepEqual(
    manifest.profiles.map((profile) => profile.id),
    ["govinfo-direct", "washington-legislative-text"],
  );
  assert.equal(manifest.targets.length, CURRENT_DISCOVERY_TARGET_COUNT);
  for (const target of manifest.targets)
    assert.deepEqual(target.mediaTypes, ["text/html"]);
});

test("makahDemoFederalManifest() has the expected shape and profiles", () => {
  const manifest = makahDemoFederalManifest();
  assert.equal(manifest.version, "1.0.0");
  assert.equal(manifest.runId, "makah-demo-02");
  assert.equal(manifest.trustDomain, "real_source_local");
  assert.deepEqual(
    manifest.profiles.map((profile) => profile.id),
    ["govinfo-direct", "federal-court-opinions-direct"],
  );
});

test("makahDemoFederalManifest() has exactly the ten authorized targets in order", () => {
  const manifest = makahDemoFederalManifest();
  assert.equal(manifest.targets.length, 10);
  assert.deepEqual(
    manifest.targets.map((target) => target.url),
    MAKAH_TARGET_URLS,
  );
  assert.deepEqual(
    manifest.targets.map((target) => target.mediaTypes),
    MAKAH_TARGET_MEDIA_TYPES,
  );
});

test("makahDemoFederalManifest() targets resolve within their declared profile", () => {
  const manifest = makahDemoFederalManifest();
  for (const target of manifest.targets) {
    const profile = manifest.profiles.find((p) => p.id === target.profileId);
    assert.ok(profile, `profile for ${target.url} must exist`);
    const url = new URL(target.url);
    assert.ok(
      profile.hosts.includes(url.hostname),
      `${url.hostname} must be in profile ${profile.id} hosts`,
    );
    assert.ok(
      profile.pathPrefixes.some((prefix) => url.pathname.startsWith(prefix)),
      `${url.pathname} must match a path prefix of profile ${profile.id}`,
    );
  }
});

test("makahDemoFederalManifest() hosts, uses and review metadata are consistent", () => {
  const manifest = makahDemoFederalManifest();
  const hosts = manifest.profiles.flatMap((profile) => profile.hosts);
  assert.deepEqual(
    [...hosts].sort(),
    ["cdn.ca9.uscourts.gov", "www.govinfo.gov", "www.wawd.uscourts.gov"].sort(),
  );
  const govinfo = manifest.profiles.find((p) => p.id === "govinfo-direct");
  const court = manifest.profiles.find(
    (p) => p.id === "federal-court-opinions-direct",
  );
  assert.deepEqual(court.uses, govinfo.uses);
  assert.ok(
    Date.parse(court.review.expiresAt) > Date.parse(court.review.reviewedAt),
  );
  assert.ok(
    Date.parse(court.review.expiresAt) > Date.parse("2026-09-15T00:00:00Z"),
  );
  for (const profile of manifest.profiles)
    for (const evidenceUrl of profile.review.evidenceUrls)
      assert.ok(evidenceUrl.startsWith("https://"));
});

test("initializePolicyRun accepts the Makah demo manifest without network", async (t) => {
  const root = await externalFixture(t);
  const manifest = makahDemoFederalManifest();
  try {
    const result = await initializePolicyRun(root, manifest);
    assert.equal(result.runId, "makah-demo-02");
  } catch (error) {
    if (String(error.message).includes("UNSUPPORTED_MEDIA")) {
      throw new Error(
        "Blocked on dependency: policy-custody.mjs does not yet accept " +
          "application/pdf media types (owned by another worker). " +
          `Original error: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
});

test("prepare-policy-run.mjs rejects an unknown --manifest name", async (t) => {
  const root = await externalFixture(t);
  const script = resolve("scripts/prepare-policy-run.mjs");
  const result = spawnSync(
    process.execPath,
    [script, "--manifest", "bogus", "--root", root],
    { encoding: "utf8", windowsHide: true, timeout: 15000 },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /UNKNOWN_MANIFEST/);
});

test("prepare-policy-run.mjs initializes the Makah demo manifest via --manifest", async (t) => {
  const root = await externalFixture(t);
  const script = resolve("scripts/prepare-policy-run.mjs");
  const result = spawnSync(
    process.execPath,
    [script, "--manifest", "makah-demo-02", "--root", root],
    { encoding: "utf8", windowsHide: true, timeout: 15000 },
  );
  if (result.status !== 0 && /UNSUPPORTED_MEDIA/.test(result.stderr)) {
    throw new Error(
      "Blocked on dependency: policy-custody.mjs does not yet accept " +
        `application/pdf media types (owned by another worker). stderr: ${result.stderr}`,
    );
  }
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).runId, "makah-demo-02");
});

test("prepare-policy-run.mjs requires an explicit external root", () => {
  const script = resolve("scripts/prepare-policy-run.mjs");
  const result = spawnSync(
    process.execPath,
    [script, "--manifest", "makah-demo-02"],
    { encoding: "utf8", windowsHide: true, timeout: 15000 },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /EXPECTED_EXPLICIT_EXTERNAL_ROOT/);
});
