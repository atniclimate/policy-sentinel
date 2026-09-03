import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { constants as fsConstants, lstatSync, realpathSync } from "node:fs";
import { link, lstat, mkdir, open, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CANDIDATE_PATH = resolve(
  REPOSITORY_ROOT,
  "fixtures",
  "engine",
  "real-source-lifecycle.candidate.valid.json",
);
const GATE_EXPIRY = "2026-12-01T00:00:00Z";
const REVIEWED_NODE_VERSION = "v24.14.1";
const REQUEST_TIMEOUT_MILLISECONDS = 30_000;
const MAXIMUM_JSON_FILE_BYTES = 1_048_576;
const MAXIMUM_MANIFEST_FILE_BYTES = 2_097_152;
const MAXIMUM_CAPTURE_NODES = 50_000;
const MAXIMUM_TEXT_BYTES = 1_048_576;
const MAXIMUM_KEY_BYTES = 262_144;
const MAXIMUM_ARRAY_ITEMS = 25_000;
const MAXIMUM_DEPTH = 64;
const DIGEST = /^[a-f0-9]{64}$/;
const TIMESTAMP =
  /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])Z$/;
const COVERED_PATHS = Object.freeze(
  [
    "config/sources.v1.json",
    "fixtures/sources/federal-register/tier1-document-malformed.invalid.json",
    "fixtures/sources/federal-register/tier1-document.synthetic.valid.json",
    "package.json",
    "scripts/refresh-federal-register-prerelease.mjs",
    "src/adapters/federal-register/index.ts",
    "src/adapters/federal-register/tier1-contract.d.mts",
    "src/adapters/federal-register/tier1-contract.mjs",
    "src/adapters/federal-register/tier1-refresh.d.mts",
    "src/adapters/federal-register/tier1-refresh.mjs",
    "src/adapters/federal-register/tier1-transport.d.mts",
    "src/adapters/federal-register/tier1-transport.mjs",
    "src/engine/real-source-lifecycle-contracts.ts",
    "src/engine/real-source-lifecycle.ts",
    "tests/adapters/federal-register/tier1-contract.test.mjs",
    "tests/adapters/federal-register/tier1-refresh.test.mjs",
    "tests/adapters/federal-register/tier1-transport.test.mjs",
  ].sort(),
);
const ACQUISITION_ENVIRONMENT_DENYLIST = Object.freeze([
  "ALL_PROXY",
  "GLOBAL_AGENT_HTTP_PROXY",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NODE_EXTRA_CA_CERTS",
  "NODE_DEBUG",
  "NODE_DEBUG_NATIVE",
  "NODE_COMPILE_CACHE",
  "NODE_COMPILE_CACHE_PORTABLE",
  "NODE_DISABLE_COMPILE_CACHE",
  "NODE_OPENSSL_CONF_NAME",
  "NODE_OPTIONS",
  "NODE_PATH",
  "NODE_TLS_REJECT_UNAUTHORIZED",
  "NODE_USE_ENV_PROXY",
  "NODE_USE_BUNDLED_CA",
  "NODE_USE_SYSTEM_CA",
  "OPENSSL_CONF",
  "OPENSSL_CONF_INCLUDE",
  "OPENSSL_ENGINES",
  "OPENSSL_MODULES",
  "SSL_CERT_DIR",
  "SSL_CERT_FILE",
  "SSLKEYLOGFILE",
  "VITEST",
  "all_proxy",
  "http_proxy",
  "https_proxy",
]);

class FederalRegisterPrereleaseCliError extends Error {
  constructor(code, detail) {
    super(`Federal Register prerelease CLI rejected: ${detail}`);
    this.name = "FederalRegisterPrereleaseCliError";
    this.code = code;
  }
}

function fail(code, detail) {
  throw new FederalRegisterPrereleaseCliError(code, detail);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sameIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs
  );
}

function isEscape(displacement) {
  return (
    displacement === ".." ||
    displacement.startsWith(`..${sep}`) ||
    isAbsolute(displacement)
  );
}

function assertRegularNoLinkSync(path, maximumBytes, label) {
  let stats;
  try {
    stats = lstatSync(path, { bigint: false });
  } catch {
    fail("input_unavailable", `${label} is unavailable`);
  }
  if (stats.isSymbolicLink() || !stats.isFile()) {
    fail("custody_boundary", `${label} must be a regular non-link file`);
  }
  if (stats.size <= 0 || stats.size > maximumBytes) {
    fail("input_size", `${label} violates its byte ceiling`);
  }
  let canonical;
  try {
    canonical = realpathSync(path);
  } catch {
    fail("input_unavailable", `${label} cannot be canonicalized`);
  }
  return { stats, canonical };
}

function decodeUtf8(bytes, label) {
  if (
    bytes.byteLength >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    fail("invalid_utf8", `${label} must not contain a UTF-8 BOM`);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("invalid_utf8", `${label} is not strict UTF-8`);
  }
}

function parseStrictJson(textValue, label) {
  let index = 0;
  const budget = { nodes: 0, textBytes: 0, keyBytes: 0, arrayItems: 0 };
  const syntax = () =>
    fail("invalid_json", `${label} is invalid or ambiguous JSON`);
  const whitespace = () => {
    while (
      textValue[index] === " " ||
      textValue[index] === "\n" ||
      textValue[index] === "\r" ||
      textValue[index] === "\t"
    ) {
      index += 1;
    }
  };
  const stringToken = (key = false) => {
    if (textValue[index] !== '"') syntax();
    const start = index;
    index += 1;
    while (index < textValue.length) {
      if (textValue[index] === '"') {
        index += 1;
        let parsed;
        try {
          parsed = JSON.parse(textValue.slice(start, index));
        } catch {
          syntax();
        }
        const bytes = Buffer.byteLength(parsed, "utf8");
        if (key) {
          budget.keyBytes += bytes;
          if (budget.keyBytes > MAXIMUM_KEY_BYTES) syntax();
        } else {
          budget.textBytes += bytes;
          if (budget.textBytes > MAXIMUM_TEXT_BYTES) syntax();
        }
        return parsed;
      }
      index += textValue[index] === "\\" ? 2 : 1;
    }
    syntax();
  };
  const value = (depth) => {
    budget.nodes += 1;
    if (budget.nodes > MAXIMUM_CAPTURE_NODES || depth > MAXIMUM_DEPTH) syntax();
    whitespace();
    const character = textValue[index];
    if (character === '"') return stringToken();
    if (character === "{") {
      index += 1;
      whitespace();
      const result = Object.create(null);
      const keys = new Set();
      if (textValue[index] === "}") {
        index += 1;
        return result;
      }
      while (index < textValue.length) {
        whitespace();
        const key = stringToken(true);
        if (keys.has(key)) syntax();
        keys.add(key);
        whitespace();
        if (textValue[index] !== ":") syntax();
        index += 1;
        result[key] = value(depth + 1);
        whitespace();
        if (textValue[index] === "}") {
          index += 1;
          return result;
        }
        if (textValue[index] !== ",") syntax();
        index += 1;
      }
      syntax();
    }
    if (character === "[") {
      index += 1;
      whitespace();
      const result = [];
      if (textValue[index] === "]") {
        index += 1;
        return result;
      }
      while (index < textValue.length) {
        budget.arrayItems += 1;
        if (budget.arrayItems > MAXIMUM_ARRAY_ITEMS) syntax();
        result.push(value(depth + 1));
        whitespace();
        if (textValue[index] === "]") {
          index += 1;
          return result;
        }
        if (textValue[index] !== ",") syntax();
        index += 1;
      }
      syntax();
    }
    for (const [literal, parsed] of [
      ["true", true],
      ["false", false],
      ["null", null],
    ]) {
      if (textValue.startsWith(literal, index)) {
        index += literal.length;
        return parsed;
      }
    }
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(
      textValue.slice(index),
    );
    if (match === null) syntax();
    index += match[0].length;
    const parsed = Number(match[0]);
    if (!Number.isSafeInteger(parsed) || Object.is(parsed, -0)) syntax();
    return parsed;
  };
  const parsed = value(0);
  whitespace();
  if (index !== textValue.length) syntax();
  return parsed;
}

async function assertPathComponents(root, target, finalKind) {
  const displacement = relative(root, target);
  if (displacement === "" || isEscape(displacement)) {
    fail("custody_boundary", "path escapes the fixed custody root");
  }
  let current = root;
  const parts = displacement.split(sep);
  for (const [index, part] of parts.entries()) {
    current = resolve(current, part);
    let stats;
    try {
      stats = await lstat(current);
    } catch {
      fail("input_unavailable", "custody path component is unavailable");
    }
    if (stats.isSymbolicLink()) {
      fail("custody_boundary", "custody links and junctions are forbidden");
    }
    const final = index === parts.length - 1;
    if ((!final || finalKind === "directory") && !stats.isDirectory()) {
      fail("custody_boundary", "custody ancestor must be a directory");
    }
    if (final && finalKind === "file" && !stats.isFile()) {
      fail("custody_boundary", "custody input must be a regular file");
    }
    const canonical = await realpath(current);
    if (isEscape(relative(root, canonical))) {
      fail("custody_boundary", "canonical custody path escapes its root");
    }
  }
}

async function ensureCustodyRoot() {
  const canonicalRepositoryRoot = await realpath(REPOSITORY_ROOT);
  let current = canonicalRepositoryRoot;
  for (const part of ["generated-data", "real-source-prerelease"]) {
    current = resolve(current, part);
    try {
      await mkdir(current);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
    const stats = await lstat(current);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      fail("custody_boundary", "custody root contains a link or non-directory");
    }
    const canonical = await realpath(current);
    if (isEscape(relative(canonicalRepositoryRoot, canonical))) {
      fail("custody_boundary", "custody root escapes the repository");
    }
    current = canonical;
  }
  return current;
}

function sameDirectoryObject(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

async function captureCustodyRootIdentity(root) {
  const [stats, canonical, canonicalRepositoryRoot] = await Promise.all([
    lstat(root),
    realpath(root),
    realpath(REPOSITORY_ROOT),
  ]);
  if (
    stats.isSymbolicLink() ||
    !stats.isDirectory() ||
    relative(root, canonical) !== "" ||
    isEscape(relative(canonicalRepositoryRoot, canonical))
  ) {
    fail("custody_boundary", "fixed custody root identity is invalid");
  }
  return stats;
}

async function assertCustodyRootIdentity(root, expected) {
  const current = await captureCustodyRootIdentity(root);
  if (!sameDirectoryObject(expected, current)) {
    fail("custody_boundary", "fixed custody root identity changed");
  }
}

function fixedAcquisitionPaths(root) {
  return Object.freeze({
    attempt: resolve(root, "FR-A1.attempt"),
    part: resolve(root, "federal-register-tier1-acquisition.part.json"),
    result: resolve(root, "federal-register-tier1-acquisition.json"),
  });
}

async function ensureSafeParent(root, target) {
  const parent = dirname(target);
  const displacement = relative(root, parent);
  if (isEscape(displacement))
    fail("custody_boundary", "output parent escapes custody");
  let current = root;
  if (displacement !== "") {
    for (const part of displacement.split(sep)) {
      current = resolve(current, part);
      try {
        await mkdir(current);
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
      }
      const stats = await lstat(current);
      if (stats.isSymbolicLink() || !stats.isDirectory()) {
        fail("custody_boundary", "output ancestor is a link or non-directory");
      }
      const canonical = await realpath(current);
      if (isEscape(relative(root, canonical))) {
        fail("custody_boundary", "output ancestor escapes custody");
      }
      current = canonical;
    }
  }
}

async function custodyInputPath(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail("invalid_argument", `${label} path is required`);
  }
  const root = await ensureCustodyRoot();
  const target = isAbsolute(value)
    ? resolve(value)
    : resolve(REPOSITORY_ROOT, value);
  await assertPathComponents(root, target, "file");
  return target;
}

async function custodyOutputPath(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail("invalid_argument", `${label} path is required`);
  }
  const root = await ensureCustodyRoot();
  const target = isAbsolute(value)
    ? resolve(value)
    : resolve(REPOSITORY_ROOT, value);
  const displacement = relative(root, target);
  if (displacement === "" || isEscape(displacement)) {
    fail("custody_boundary", `${label} must be below the fixed custody root`);
  }
  await ensureSafeParent(root, target);
  try {
    await lstat(target);
    fail("output_exists", `${label} already exists`);
  } catch (error) {
    if (error instanceof FederalRegisterPrereleaseCliError) throw error;
    if (error?.code !== "ENOENT") throw error;
  }
  return target;
}

async function readBoundedFile(path, maximumBytes, label) {
  const before = await lstat(path);
  if (before.isSymbolicLink() || !before.isFile() || before.nlink !== 1) {
    fail("custody_boundary", `${label} must be a regular non-link file`);
  }
  if (before.size <= 0 || before.size > maximumBytes) {
    fail("input_size", `${label} violates its byte ceiling`);
  }
  const flags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
  let handle;
  let content;
  let returned = false;
  try {
    handle = await open(path, flags);
    const opened = await handle.stat();
    const openedPath = await lstat(path);
    if (
      !opened.isFile() ||
      opened.nlink !== 1 ||
      openedPath.isSymbolicLink() ||
      !openedPath.isFile() ||
      openedPath.nlink !== 1 ||
      !sameIdentity(before, opened) ||
      !sameIdentity(before, openedPath)
    ) {
      fail("custody_boundary", `${label} changed before it was opened`);
    }
    content = Buffer.alloc(maximumBytes + 1);
    let offset = 0;
    while (offset < content.byteLength) {
      const { bytesRead } = await handle.read(
        content,
        offset,
        content.byteLength - offset,
        offset,
      );
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset > maximumBytes) {
      fail("input_size", `${label} violates its byte ceiling`);
    }
    const after = await handle.stat();
    const afterPath = await lstat(path);
    if (
      offset !== opened.size ||
      !sameIdentity(opened, after) ||
      afterPath.isSymbolicLink() ||
      !afterPath.isFile() ||
      afterPath.nlink !== 1 ||
      !sameIdentity(opened, afterPath)
    ) {
      fail("input_changed", `${label} changed while it was read`);
    }
    returned = true;
    return content.subarray(0, offset);
  } finally {
    if (!returned) content?.fill(0);
    await handle?.close().catch(() => undefined);
  }
}

async function readCustodyJson(value, label) {
  const path = await custodyInputPath(value, label);
  const bytes = await readBoundedFile(path, MAXIMUM_JSON_FILE_BYTES, label);
  try {
    return parseStrictJson(decodeUtf8(bytes, label), label);
  } finally {
    bytes.fill(0);
  }
}

async function readCandidate() {
  const { canonical } = assertRegularNoLinkSync(
    CANDIDATE_PATH,
    MAXIMUM_JSON_FILE_BYTES,
    "canonical lifecycle candidate",
  );
  if (isEscape(relative(await realpath(REPOSITORY_ROOT), canonical))) {
    fail(
      "custody_boundary",
      "canonical lifecycle candidate escapes repository",
    );
  }
  const bytes = await readBoundedFile(
    CANDIDATE_PATH,
    MAXIMUM_JSON_FILE_BYTES,
    "canonical lifecycle candidate",
  );
  try {
    return parseStrictJson(
      decodeUtf8(bytes, "canonical lifecycle candidate"),
      "canonical lifecycle candidate",
    );
  } finally {
    bytes.fill(0);
  }
}

async function writeNoClobber(path, value) {
  const bytes = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  let handle;
  try {
    handle = await open(path, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    bytes.fill(0);
    await handle?.close().catch(() => undefined);
  }
}

async function readCoveredFile(relativePath) {
  const target = resolve(REPOSITORY_ROOT, ...relativePath.split("/"));
  const canonicalRoot = await realpath(REPOSITORY_ROOT);
  if (isEscape(relative(canonicalRoot, target))) {
    fail("manifest_mismatch", "covered path escapes repository");
  }
  let current = canonicalRoot;
  for (const part of relativePath.split("/")) {
    current = resolve(current, part);
    let stats;
    try {
      stats = await lstat(current);
    } catch {
      fail("manifest_mismatch", "a covered path is missing");
    }
    if (stats.isSymbolicLink()) {
      fail("manifest_mismatch", "covered links and junctions are forbidden");
    }
  }
  const canonical = await realpath(target);
  if (isEscape(relative(canonicalRoot, canonical))) {
    fail("manifest_mismatch", "covered path escapes repository");
  }
  return readBoundedFile(target, MAXIMUM_MANIFEST_FILE_BYTES, relativePath);
}

export async function computeFederalRegisterTier1ExecutableManifest() {
  const rows = [];
  for (const path of COVERED_PATHS) {
    const bytes = await readCoveredFile(path);
    try {
      rows.push(`${path}\t${bytes.byteLength}\t${sha256(bytes)}`);
    } finally {
      bytes.fill(0);
    }
  }
  const manifestBytes = Buffer.from(`${rows.join("\n")}\n`, "utf8");
  try {
    return Object.freeze({
      id: "federal-register-tier1-companion-manifest",
      version: "1.0.0",
      pathCount: COVERED_PATHS.length,
      byteLength: manifestBytes.byteLength,
      sha256: sha256(manifestBytes),
      rows: Object.freeze([...rows]),
    });
  } finally {
    manifestBytes.fill(0);
  }
}

function manifestClaim(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("manifest_mismatch", `${path} manifest claim is missing`);
  }
  if (
    value.id !== "federal-register-tier1-companion-manifest" ||
    value.version !== "1.0.0" ||
    !Number.isSafeInteger(value.byteLength) ||
    value.byteLength <= 0 ||
    typeof value.sha256 !== "string" ||
    !DIGEST.test(value.sha256)
  ) {
    fail("manifest_mismatch", `${path} manifest claim is invalid`);
  }
  return value;
}

function assertManifestEquals(actual, claimed, path) {
  const claim = manifestClaim(claimed, path);
  if (
    claim.byteLength !== actual.byteLength ||
    claim.sha256 !== actual.sha256
  ) {
    fail(
      "manifest_mismatch",
      `${path} does not match current executable bytes`,
    );
  }
}

async function assertGateManifestBeforeImport(gate, expectation) {
  const actual = await computeFederalRegisterTier1ExecutableManifest();
  assertManifestEquals(actual, gate?.companionManifest, "gate");
  const external = {
    id: "federal-register-tier1-companion-manifest",
    version: "1.0.0",
    byteLength: expectation?.companionManifestByteLength,
    sha256: expectation?.companionManifestDigest,
  };
  assertManifestEquals(actual, external, "expectation");
  return actual;
}

function parseArguments(args) {
  if (args.length === 0) return { mode: "proposal", options: new Map() };
  const mode = args[0];
  const allowedByMode = {
    "--prepare-authority": new Set(["--input", "--out"]),
    "--prepare-graph": new Set(["--input", "--out"]),
    "--prepare-gate": new Set(["--graph", "--companion", "--out"]),
    "--acquire": new Set(["--gate", "--expectation"]),
  };
  if (!Object.hasOwn(allowedByMode, mode))
    fail("invalid_argument", "unknown mode");
  if ((args.length - 1) % 2 !== 0) {
    fail("invalid_argument", "options must be exact --name value pairs");
  }
  const options = new Map();
  for (let index = 1; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (
      !allowedByMode[mode].has(name) ||
      typeof value !== "string" ||
      value === ""
    ) {
      fail("invalid_argument", "option is not valid for this mode");
    }
    if (options.has(name)) fail("invalid_argument", "duplicate option");
    options.set(name, value);
  }
  if ([...allowedByMode[mode]].some((name) => !options.has(name))) {
    fail("invalid_argument", "mode is missing a required exact path option");
  }
  return { mode, options };
}

async function loadRefreshRuntime() {
  return import("../src/adapters/federal-register/tier1-refresh.mjs");
}

async function prepareAuthority(options) {
  const [supplied, outputPath, runtime, candidateBundle] = await Promise.all([
    readCustodyJson(options.get("--input"), "authority input"),
    custodyOutputPath(options.get("--out"), "authority output"),
    loadRefreshRuntime(),
    readCandidate(),
  ]);
  const graph = runtime.buildFederalRegisterTier1ProspectiveAuthorityGraph({
    ...supplied,
    candidateBundle,
  });
  await writeNoClobber(outputPath, graph);
  return {
    mode: "prospective_authority_prepared",
    acquisitionAuthorized: false,
    outputPath,
    lifecycleBundleContentDigest: graph.lifecycleBundle.contentDigest,
    lifecycleScopeContentDigest: graph.lifecycleBundle.scope.contentDigest,
    authoritySetDigest: graph.lifecycleBundle.scope.authoritySetDigest,
  };
}

async function prepareGraph(options) {
  const [supplied, outputPath, runtime, candidateBundle] = await Promise.all([
    readCustodyJson(options.get("--input"), "graph input"),
    custodyOutputPath(options.get("--out"), "graph output"),
    loadRefreshRuntime(),
    readCandidate(),
  ]);
  const graph = runtime.buildFederalRegisterTier1PreAcquisitionGraph({
    ...supplied,
    candidateBundle,
  });
  await writeNoClobber(outputPath, graph);
  return {
    mode: "pre_acquisition_graph_prepared",
    acquisitionAuthorized: false,
    outputPath,
    lifecycleBundleContentDigest: graph.lifecycleBundle.contentDigest,
    lifecycleScopeContentDigest: graph.lifecycleBundle.scope.contentDigest,
  };
}

async function prepareGate(options) {
  const [graph, companion, outputPath] = await Promise.all([
    readCustodyJson(options.get("--graph"), "graph input"),
    readCustodyJson(options.get("--companion"), "companion approval input"),
    custodyOutputPath(options.get("--out"), "gate output"),
  ]);
  const actual = await computeFederalRegisterTier1ExecutableManifest();
  assertManifestEquals(actual, companion?.manifest, "companion");
  const runtime = await loadRefreshRuntime();
  const gate = runtime.assembleFederalRegisterTier1PreAcquisitionGate(
    graph,
    companion,
  );
  await writeNoClobber(
    outputPath,
    JSON.parse(runtime.serializeFederalRegisterTier1PreAcquisitionGate(gate)),
  );
  return {
    mode: "pre_acquisition_gate_prepared",
    acquisitionAuthorized: false,
    outputPath,
    gateContentDigest: gate.contentDigest,
    lifecycleBundleContentDigest: gate.lifecycleBundle.contentDigest,
    lifecycleScopeContentDigest: gate.lifecycleBundle.scope.contentDigest,
  };
}

async function runParsedNonAcquisition(parsed) {
  switch (parsed.mode) {
    case "proposal": {
      const runtime = await loadRefreshRuntime();
      return runtime.createFederalRegisterTier1GateProposal();
    }
    case "--prepare-authority":
      return prepareAuthority(parsed.options);
    case "--prepare-graph":
      return prepareGraph(parsed.options);
    case "--prepare-gate":
      return prepareGate(parsed.options);
    case "--acquire":
      return fail(
        "direct_entry_required",
        "acquisition requires a fresh direct process",
      );
    default:
      fail("invalid_argument", "unknown mode");
  }
}

export async function runFederalRegisterPrereleaseCli(args = []) {
  return runParsedNonAcquisition(parseArguments(args));
}

function assertAcquisitionProcessBoundary() {
  if (process.version !== REVIEWED_NODE_VERSION) {
    fail(
      "process_boundary",
      "Node runtime differs from the reviewed executable",
    );
  }
  if (process.execArgv.length !== 0) {
    fail(
      "process_boundary",
      "Node preload, loader, and runtime flags are forbidden",
    );
  }
  for (const name of ACQUISITION_ENVIRONMENT_DENYLIST) {
    if (process.env[name] !== undefined) {
      fail(
        "process_boundary",
        "request-affecting environment overrides are forbidden",
      );
    }
  }
}

function parseCanonicalTimestamp(value, label) {
  if (typeof value !== "string" || !TIMESTAMP.test(value)) {
    fail("time_boundary", `${label} must be canonical second-precision UTC`);
  }
  const parsed = Date.parse(value);
  if (
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString().replace(".000Z", "Z") !== value
  ) {
    fail("time_boundary", `${label} is not a real canonical instant`);
  }
  return parsed;
}

function assertActualTimeWindow(expectation, now = Date.now()) {
  const asOf = parseCanonicalTimestamp(expectation?.asOf, "expectation asOf");
  const expiry = Date.parse(GATE_EXPIRY);
  if (
    !Number.isFinite(now) ||
    now < asOf ||
    now + REQUEST_TIMEOUT_MILLISECONDS >= expiry
  ) {
    fail(
      "time_boundary",
      "actual wall clock is outside the acquisition window",
    );
  }
  return new Date(now).toISOString();
}

async function assertFixedPathAbsent(path, label) {
  try {
    await lstat(path);
    fail("attempt_consumed", `${label} already exists`);
  } catch (error) {
    if (error instanceof FederalRegisterPrereleaseCliError) throw error;
    if (error?.code !== "ENOENT") throw error;
  }
}

async function syncCustodyDirectory(root) {
  let handle;
  try {
    handle = await open(root, fsConstants.O_RDONLY);
    try {
      await handle.sync();
      return "parent_directory_synced";
    } catch (error) {
      if (process.platform === "win32" && error?.code === "EPERM") {
        return "platform_unsupported_windows_file_fsync_used";
      }
      throw error;
    }
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function replaceOpenFile(handle, value) {
  const bytes = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  try {
    await handle.truncate(0);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const { bytesWritten } = await handle.write(
        bytes,
        offset,
        bytes.byteLength - offset,
        offset,
      );
      if (bytesWritten <= 0)
        fail("output_failure", "output write made no progress");
      offset += bytesWritten;
    }
    await handle.truncate(bytes.byteLength);
    await handle.sync();
  } finally {
    bytes.fill(0);
  }
}

async function reserveAttempt(root, rootIdentity, gate, manifest, reservedAt) {
  const paths = fixedAcquisitionPaths(root);
  await assertCustodyRootIdentity(root, rootIdentity);
  await Promise.all([
    assertFixedPathAbsent(paths.attempt, "FR-A1 attempt latch"),
    assertFixedPathAbsent(paths.part, "FR-A1 result part"),
    assertFixedPathAbsent(paths.result, "FR-A1 result"),
  ]);
  await assertCustodyRootIdentity(root, rootIdentity);
  let marker;
  try {
    marker = await open(paths.attempt, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") {
      fail("attempt_consumed", "FR-A1 attempt latch already exists");
    }
    throw error;
  }
  let markerIdentity;
  let directorySyncState;
  try {
    await assertCustodyRootIdentity(root, rootIdentity);
    const markerRecord = {
      schemaVersion: "1.0.0",
      requestId: "FR-A1",
      state: "reserved_consumed",
      reservedAt,
      gateContentDigest: gate.contentDigest,
      lifecycleBundleContentDigest: gate.lifecycleBundle.contentDigest,
      companionManifestDigest: manifest.sha256,
      requestUrl: gate.request.url,
      retryAuthorized: false,
      publication: "closed",
    };
    await replaceOpenFile(marker, {
      ...markerRecord,
      directorySyncState: "pending_parent_directory_sync",
    });
    await assertCustodyRootIdentity(root, rootIdentity);
    directorySyncState = await syncCustodyDirectory(root);
    await assertCustodyRootIdentity(root, rootIdentity);
    await replaceOpenFile(marker, { ...markerRecord, directorySyncState });
    await assertCustodyRootIdentity(root, rootIdentity);
    markerIdentity = await marker.stat();
  } finally {
    await marker.close().catch(() => undefined);
  }
  const flags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
  await assertCustodyRootIdentity(root, rootIdentity);
  const reopened = await open(paths.attempt, flags);
  try {
    const reopenedIdentity = await reopened.stat();
    const reopenedPathIdentity = await lstat(paths.attempt);
    if (
      !reopenedIdentity.isFile() ||
      reopenedPathIdentity.isSymbolicLink() ||
      !reopenedPathIdentity.isFile() ||
      !sameIdentity(markerIdentity, reopenedIdentity) ||
      !sameIdentity(markerIdentity, reopenedPathIdentity)
    ) {
      fail("attempt_integrity", "FR-A1 attempt latch identity changed");
    }
    await assertCustodyRootIdentity(root, rootIdentity);
  } finally {
    await reopened.close().catch(() => undefined);
  }
  let part;
  try {
    await assertCustodyRootIdentity(root, rootIdentity);
    part = await open(paths.part, "wx", 0o600);
    await assertCustodyRootIdentity(root, rootIdentity);
    await replaceOpenFile(part, {
      schemaVersion: "1.0.0",
      requestId: "FR-A1",
      state: "reserved_no_response",
      gateContentDigest: gate.contentDigest,
      companionManifestDigest: manifest.sha256,
      retryAuthorized: false,
      publication: "closed",
    });
    const partIdentity = await part.stat();
    const partPathIdentity = await lstat(paths.part);
    if (
      !partIdentity.isFile() ||
      partPathIdentity.isSymbolicLink() ||
      !partPathIdentity.isFile() ||
      !sameIdentity(partIdentity, partPathIdentity)
    ) {
      fail("attempt_integrity", "FR-A1 result part identity changed");
    }
    await assertCustodyRootIdentity(root, rootIdentity);
    return { part, paths, directorySyncState };
  } catch (error) {
    await part?.close().catch(() => undefined);
    throw error;
  }
}

function sameJson(left, right) {
  const canonical = (value) => {
    if (value === null || typeof value !== "object")
      return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  };
  return canonical(left) === canonical(right);
}

async function acquireDirect(options) {
  assertAcquisitionProcessBoundary();
  const root = await ensureCustodyRoot();
  const rootIdentity = await captureCustodyRootIdentity(root);
  const [gateValue, expectation] = await Promise.all([
    readCustodyJson(options.get("--gate"), "gate input"),
    readCustodyJson(options.get("--expectation"), "trusted expectation input"),
  ]);
  const initialManifest = await assertGateManifestBeforeImport(
    gateValue,
    expectation,
  );
  const runtime = await loadRefreshRuntime();
  const gate = runtime.assertFederalRegisterTier1AcquisitionGate(
    gateValue,
    expectation,
  );
  const reservedAt = assertActualTimeWindow(expectation);
  const { part, paths, directorySyncState } = await reserveAttempt(
    root,
    rootIdentity,
    gate,
    initialManifest,
    reservedAt,
  );
  let acquisitionWritten = false;
  try {
    const secondManifest = await assertGateManifestBeforeImport(
      gateValue,
      expectation,
    );
    assertActualTimeWindow(expectation);
    const transport =
      await import("../src/adapters/federal-register/tier1-transport.mjs");
    if (
      transport.FEDERAL_REGISTER_TIER1_REQUEST_URL !== gate.request.url ||
      !sameJson(
        transport.FEDERAL_REGISTER_TIER1_REQUEST_POLICY,
        gate.request.policy,
      )
    ) {
      fail(
        "transport_mismatch",
        "transport exports differ from the reviewed gate",
      );
    }
    const thirdManifest = await assertGateManifestBeforeImport(
      gateValue,
      expectation,
    );
    if (thirdManifest.sha256 !== secondManifest.sha256) {
      fail(
        "manifest_mismatch",
        "executable bytes changed during acquisition setup",
      );
    }
    const requestStartedAt = assertActualTimeWindow(expectation);
    const acquisition = await transport.fetchFederalRegisterTier1Document();
    const ignoredLocalResult = {
      schemaVersion: "1.0.0",
      requestId: "FR-A1",
      state: "acquired_ignored_local_only",
      requestStartedAt,
      gateContentDigest: gate.contentDigest,
      lifecycleBundleContentDigest: gate.lifecycleBundle.contentDigest,
      companionManifestDigest: thirdManifest.sha256,
      primary: acquisition.primary,
      replay: acquisition.replay,
      receipt: acquisition.receipt,
      retryAuthorized: false,
      directorySyncState,
      publication: "closed",
    };
    await replaceOpenFile(part, ignoredLocalResult);
    acquisitionWritten = true;
    await assertCustodyRootIdentity(root, rootIdentity);
    const partIdentity = await part.stat();
    const partPathIdentity = await lstat(paths.part);
    if (
      partPathIdentity.isSymbolicLink() ||
      !partPathIdentity.isFile() ||
      !sameIdentity(partIdentity, partPathIdentity)
    ) {
      fail(
        "attempt_integrity",
        "FR-A1 result part identity changed before publish",
      );
    }
    await assertFixedPathAbsent(paths.result, "FR-A1 result");
    await assertCustodyRootIdentity(root, rootIdentity);
    await link(paths.part, paths.result);
    await assertCustodyRootIdentity(root, rootIdentity);
    const [linkedPartIdentity, resultIdentity] = await Promise.all([
      lstat(paths.part),
      lstat(paths.result),
    ]);
    if (
      linkedPartIdentity.isSymbolicLink() ||
      resultIdentity.isSymbolicLink() ||
      !linkedPartIdentity.isFile() ||
      !resultIdentity.isFile() ||
      linkedPartIdentity.nlink !== 2 ||
      resultIdentity.nlink !== 2 ||
      !sameIdentity(linkedPartIdentity, resultIdentity)
    ) {
      fail("attempt_integrity", "FR-A1 result hard link identity is invalid");
    }
    await syncCustodyDirectory(root);
    await assertCustodyRootIdentity(root, rootIdentity);
    return {
      mode: "acquired_ignored_local_only",
      outputPath: paths.result,
      attemptPath: paths.attempt,
      receipt: acquisition.receipt,
      directorySyncState: ignoredLocalResult.directorySyncState,
      publication: "closed",
    };
  } catch (error) {
    if (!acquisitionWritten) {
      await replaceOpenFile(part, {
        schemaVersion: "1.0.0",
        requestId: "FR-A1",
        state: "consumed_failed_or_indeterminate",
        code:
          error !== null && typeof error === "object" && "code" in error
            ? String(error.code)
            : "unexpected_failure",
        retryAuthorized: false,
        publication: "closed",
      }).catch(() => undefined);
    }
    throw error;
  } finally {
    await part.close().catch(() => undefined);
  }
}

const directEntry = import.meta.main === true;

if (directEntry) {
  try {
    const parsed = parseArguments(process.argv.slice(2));
    const result =
      parsed.mode === "--acquire"
        ? await acquireDirect(parsed.options)
        : await runParsedNonAcquisition(parsed);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const code =
      error !== null && typeof error === "object" && "code" in error
        ? String(error.code)
        : "unexpected_failure";
    process.stderr.write(
      `${JSON.stringify({ state: "rejected", code, publication: "closed" })}\n`,
    );
    process.exitCode = 1;
  }
}
