import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import cp from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";

// Fixed authored fixtures only. This is not a runner for caller-selected input.
export const PROTOCOL = Object.freeze({
  id: "engineering-review-02-synthetic-v1",
  searchSizes: [100, 500, 2000],
  knowledgeSizes: [5, 10, 20],
  warmups: 3,
  repetitions: 10,
  caseMilliseconds: 120000,
  totalMilliseconds: 1200000,
  generatedFiles: 10000,
  generatedBytes: 256 * 1024 * 1024,
  targets: {
    warmQueryMedianMs: 100,
    indexMedianMs: 1000,
    generationMedianMs: 10000,
  },
});
export const PRIOR_PREFLIGHT_MILLISECONDS = 947.8855;
const external =
  "I:/policy-sentinel-knowledge-assurance/2026-09-05/engineering-review-02";
const destination = path.resolve(external, "measurements-01");
const implementationRoot = path.resolve(import.meta.dirname, "..");
const powershell = path.join(
  process.env.SystemRoot ?? "C:/Windows",
  "System32/WindowsPowerShell/v1.0/powershell.exe",
);
const gitExecutable = "C:/Program Files/Git/bin/git.exe";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const fixedError = (code) => Object.assign(new Error(code), { code });
const ensure = (condition, code) => {
  if (!condition) throw fixedError(code);
};
export function inside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}
export function summarize(values) {
  ensure(
    values.length > 0 && values.every(Number.isFinite),
    "INVALID_OBSERVATIONS",
  );
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    observations: values,
    median:
      sorted.length % 2
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2,
    minimum: sorted[0],
    maximum: sorted.at(-1),
  };
}
export function createBudget(initial = { files: 0, bytes: 0 }) {
  ensure(
    Number.isSafeInteger(initial.files) &&
      initial.files >= 0 &&
      initial.files <= PROTOCOL.generatedFiles &&
      Number.isSafeInteger(initial.bytes) &&
      initial.bytes >= 0 &&
      initial.bytes <= PROTOCOL.generatedBytes,
    "INVALID_BUDGET",
  );
  const state = { ...initial };
  return {
    state,
    charge(bytes, files = 1) {
      ensure(
        Number.isSafeInteger(bytes) &&
          bytes >= 0 &&
          Number.isSafeInteger(files) &&
          files >= 0,
        "INVALID_CHARGE",
      );
      ensure(
        state.files + files <= PROTOCOL.generatedFiles &&
          state.bytes + bytes <= PROTOCOL.generatedBytes,
        "GENERATED_BUDGET_EXCEEDED",
      );
      state.files += files;
      state.bytes += bytes;
    },
  };
}
const day = (value) => ({ value, precision: "day" });
const unknown = () => ({ value: null, precision: "unknown" });

export async function searchFixture(size) {
  ensure(PROTOCOL.searchSizes.includes(size), "FIXED_SEARCH_SIZE_REQUIRED");
  const { createEvidenceSegment, canonicalV2Digest } =
    await import("../src/pipeline/analyzed-corpus-v2.mjs");
  const profile = {
    id: "synthetic-profile",
    sourceId: "synthetic-source",
    interfaceId: "synthetic-interface",
    operator: "Synthetic operator",
    publisher: "Synthetic publisher",
    authorityLabel: "Authored synthetic fixture only",
    hosts: ["synthetic.invalid"],
    pathPrefixes: ["/fixture/"],
    review: {
      reviewer: "Synthetic reviewer",
      reviewedAt: "2026-01-01T00:00:00Z",
      expiresAt: "2027-01-01T00:00:00Z",
      evidenceUrls: ["https://synthetic.invalid/fixture/terms"],
    },
    uses: {
      capture: true,
      analysis: true,
      localDisplay: "full_text",
      localExport: "full_text",
      excerpts: true,
      publicRedistribution: "prohibited",
    },
  };
  const input = {
    id: "synthetic-engineering-corpus",
    runId: "synthetic-engineering-run",
    trustDomain: "synthetic_test_only",
    generatedAt: "2026-09-03T00:00:00Z",
    sourceProfiles: [profile],
    captures: [],
    works: [],
    versions: [],
    renditions: [],
    segments: [],
    events: [],
    relationships: [],
    analyses: [],
    findings: [],
    coverage: [],
  };
  const exactSegments = new Map();
  for (let i = 0; i < size; i += 1) {
    const key = String(i).padStart(4, "0");
    const sourceDate = i === 2 ? "2026-08-01" : i === 3 ? "2026" : "2026-01-01";
    const captured = i === 4 ? "2026-08-02T00:00:00Z" : "2026-02-02T00:00:00Z";
    const lines = [
      `Synthetic item ${key}; SYNTH-${key}; Edition ${key}; Authored.\n`,
      `Synthetic source date ${sourceDate}. Effective ${sourceDate}.\n`,
      `Synthetic copper lantern phrase; item ${key}; exact café bytes.\n`,
      `Synthetic neutral segment ${key}; no real source evidence.\n`,
    ];
    const text = lines.join("");
    const bytes = Buffer.from(text);
    const digest = hash(bytes);
    const captureId = `capture-${key}`;
    const renditionId = `rendition-${key}`;
    const versionId = `version-${key}`;
    const workId = `work-${key}`;
    let startByte = 0;
    const segments = lines.map((line, index) => {
      const endByte = startByte + Buffer.byteLength(line);
      ensure(endByte - startByte <= 512, "SEGMENT_BYTE_CEILING");
      const segment = createEvidenceSegment({
        renditionId,
        renditionDigest: digest,
        renditionBytes: bytes,
        startByte,
        endByte,
        locator: {
          type: "line",
          value: String(index + 1),
          headingPath: [],
          printedPageLabel: null,
          physicalPageIndex: null,
        },
      });
      startByte = endByte;
      exactSegments.set(segment.id, {
        text: line,
        captureId,
        renditionId,
        versionId,
        workId,
      });
      return segment;
    });
    const provenance = (fields, segment = segments[0]) =>
      fields.map((field) => ({
        field,
        mode: [
          "/instrumentClass",
          "/governmentContext",
          "/issuerRoles/0/role",
          "/issuerRoles/0/label",
        ].includes(field)
          ? "deterministic"
          : "source_attested",
        captureId,
        sourceLocator: "synthetic/line",
        segmentIds: [segment.id],
        ruleId: [
          "/instrumentClass",
          "/governmentContext",
          "/issuerRoles/0/role",
          "/issuerRoles/0/label",
        ].includes(field)
          ? "synthetic-rule-v1"
          : null,
      }));
    input.captures.push({
      id: captureId,
      sourceProfileId: profile.id,
      sourceProfileDigest: canonicalV2Digest(profile),
      operationId: `operation-${key}`,
      requestedUrl: `https://synthetic.invalid/fixture/${key}`,
      finalUrl: `https://synthetic.invalid/fixture/${key}`,
      retrievedAt: captured,
      mediaType: "text/plain",
      encodedBytes: bytes.length,
      decodedBytes: bytes.length,
      objectDigest: digest,
      objectPath: `objects/${digest}.bin`,
    });
    input.renditions.push({
      id: renditionId,
      versionId,
      captureId,
      parser: {
        id: "synthetic-utf8-lf",
        version: "1.0.0",
        configDigest: canonicalV2Digest({ synthetic: true }),
      },
      mediaType: "text/plain",
      outputDigest: digest,
      byteLength: bytes.length,
      text,
      authorityLabel: profile.authorityLabel,
      warnings: [],
      omittedSourceLocators: [],
    });
    input.segments.push(...segments);
    input.works.push({
      id: workId,
      sourceProfileId: profile.id,
      sourceIdentifier: `SYNTH-${key}`,
      title: `Synthetic item ${key}`,
      instrumentClass: "regulation",
      governmentContext: "Synthetic context",
      issuerRoles: [{ role: "issuer", label: "Synthetic issuer" }],
      relevance: "general_jurisdiction",
      taxonomy: "Unclassified",
      fieldProvenance: provenance([
        "/sourceIdentifier",
        "/title",
        "/instrumentClass",
        "/governmentContext",
        "/issuerRoles/0/role",
        "/issuerRoles/0/label",
      ]),
    });
    const date =
      i === 1
        ? unknown()
        : i === 3
          ? { value: sourceDate, precision: "year" }
          : day(sourceDate);
    input.versions.push({
      id: versionId,
      workId,
      sourceVersionIdentifier: `Edition ${key}`,
      sourceStatusLabel: "Authored",
      dates: { publication: date, sourceVersion: date },
      observedAt: captured,
      renditionIds: [renditionId],
      fieldProvenance: [
        ...provenance(["/sourceVersionIdentifier", "/sourceStatusLabel"]),
        ...(i === 1
          ? []
          : provenance(
              ["/dates/publication/value", "/dates/sourceVersion/value"],
              segments[1],
            )),
      ],
    });
    if (i !== 1)
      input.events.push({
        id: `event-${key}`,
        workId,
        versionId,
        type: "effective",
        date,
        sourceStatedAt: date,
        sourceLabel: "Effective",
        segmentIds: [segments[1].id],
        fieldProvenance: provenance(
          ["/sourceLabel", "/date/value", "/sourceStatedAt/value"],
          segments[1],
        ),
      });
  }
  input.coverage.push({
    id: "synthetic-coverage",
    sourceProfileId: profile.id,
    status: "healthy",
    documentCount: size,
    versionCount: size,
    from: day("2026-01-01"),
    through: day("2026-08-01"),
    dataAsOf: "2026-08-02T00:00:00Z",
    lastSuccessfulAt: "2026-08-02T00:00:00Z",
    failureStage: null,
    lastKnownGoodDigest: null,
    limitations: ["Fixed authored synthetic population only."],
    exclusions: [],
  });
  return { input, exactSegments };
}

export function searchCases() {
  return [
    undefined,
    "source_available",
    "corpus_observed",
    "source_effective",
  ].flatMap((basis) =>
    [
      ["exact", "SYNTH-0000"],
      ["phrase", '"copper lantern phrase"'],
      ["none", "zzzznomatchzzzz"],
      ["browse", ""],
    ].map(([kind, query]) => ({
      id: `${basis ?? "unfiltered"}-${kind}`,
      kind,
      request: {
        query,
        limit: 20,
        passageLimit: 4,
        ...(basis ? { basis, asOf: "2026-06-01" } : {}),
      },
    })),
  );
}
export function verifySearch(result, index, spec, fixture, passage) {
  assert.equal(result.kind, "policy_search_results");
  assert.deepEqual(result.method, {
    id: "source-passage-bm25",
    version: "2.0.0",
  });
  assert.equal(result.corpusDigest, index.corpusDigest);
  assert.ok(
    result.limitations.includes(
      "Lexical matches require review of the cited source passages; no answer or legal conclusion is generated.",
    ),
  );
  const excluded =
    spec.request.basis === "corpus_observed"
      ? [4]
      : spec.request.basis
        ? [1, 2, 3]
        : [];
  const expected = fixture.input.works
    .filter((_, i) => !excluded.includes(i))
    .map((item) => item.id)
    .sort();
  if (spec.request.basis) {
    assert.equal(result.temporal.basis, spec.request.basis);
    assert.equal(result.temporal.asOf, "2026-06-01");
    assert.deepEqual(
      result.temporal.unknownWorkIds,
      excluded.map((i) => `work-${String(i).padStart(4, "0")}`),
    );
    const reasons =
      spec.request.basis === "corpus_observed"
        ? ["not_yet_observed_in_corpus"]
        : [
            "unknown_source_availability",
            "future_source_version",
            "partial_date_crosses_cutoff",
          ];
    assert.deepEqual(
      result.temporal.excluded,
      excluded.map((i, position) => ({
        versionId: `version-${String(i).padStart(4, "0")}`,
        workId: `work-${String(i).padStart(4, "0")}`,
        reason: reasons[position],
      })),
    );
  } else assert.equal(result.temporal, null);
  if (spec.kind === "none") {
    assert.equal(result.total, 0);
    assert.deepEqual(result.hits, []);
  } else if (spec.kind === "exact") {
    assert.equal(result.total, expected.length);
    assert.equal(result.hits[0]?.workId, "work-0000");
    assert.equal(result.hits[0].exactIdentifierMatch, true);
    assert.deepEqual(
      result.hits.map((item) => item.workId),
      expected.slice(0, 20),
    );
  } else {
    assert.equal(result.total, expected.length);
    assert.deepEqual(
      result.hits.map((item) => item.workId),
      expected.slice(0, 20),
    );
  }
  for (const hit of result.hits) {
    assert.ok(expected.includes(hit.workId));
    assert.equal(hit.versionId, hit.workId.replace("work-", "version-"));
    const authored = fixture.input.segments.filter(
      (segment) => fixture.exactSegments.get(segment.id).workId === hit.workId,
    );
    // Four fixture line roles: identifiers, dates, phrase, neutral context.
    // The request explicitly allows four passages. Required evidence cannot be
    // omitted and then established as a hollow checksum baseline.
    const expectedLines =
      spec.kind === "browse" ||
      (spec.kind === "exact" && hit.workId === "work-0000")
        ? [0, 1, 2, 3]
        : spec.kind === "phrase"
          ? [1, 2, 3]
          : [0, 1];
    const expectedPassages = expectedLines.map((line) => authored[line].id);
    assert.deepEqual(
      hit.passages.map((entry) => entry.segmentId).sort(),
      [...expectedPassages].sort(),
    );
    if (spec.kind === "phrase")
      assert.equal(hit.passages[0].segmentId, authored[2].id);
    if (spec.kind === "exact")
      assert.equal(hit.passages[0].segmentId, authored[0].id);
    if (spec.kind === "browse")
      assert.deepEqual(
        hit.passages.map((entry) => entry.segmentId),
        [...expectedPassages].sort(),
      );
    for (const entry of hit.passages) {
      const exact = fixture.exactSegments.get(entry.segmentId);
      assert.ok(exact);
      assert.equal(entry.captureId, exact.captureId);
      assert.equal(entry.renditionId, exact.renditionId);
      assert.equal(hit.versionId, exact.versionId);
      assert.equal(passage(index, entry.segmentId).text, exact.text);
    }
  }
  return hash(JSON.stringify(result));
}

// Only fixed read-only native commands used by actual knowledge validation, and
// fixed local fixture Git setup commands, are admitted. No shell strings.
export function childPolicy(command, args, options, owned, remaining) {
  ensure(
    Array.isArray(args) && options && !options.shell && remaining > 0,
    "CHILD_REFUSED",
  );
  if (command === "git") {
    ensure(
      args[0] === "-C" && args[1] === path.join(owned, "repository"),
      "CHILD_ROOT_REFUSED",
    );
    const rest = args.slice(2);
    const allowed =
      rest.join("\0") === "init\0--quiet" ||
      rest.join("\0") === "add\0--\0README.md\0docs" ||
      rest.join("\0") ===
        "commit\0--quiet\0-m\0Synthetic measurement fixture" ||
      rest.join("\0") === "rev-parse\0HEAD" ||
      (rest.length === 2 &&
        rest[0] === "rev-parse" &&
        /^[a-f0-9]{40}:(?:README\.md|docs\/(?:item-\d{4}\.md|custody\.json))$/u.test(
          rest[1],
        )) ||
      (rest.length === 3 &&
        rest[0] === "cat-file" &&
        rest[1] === "blob" &&
        /^[a-f0-9]{40}:(?:README\.md|docs\/(?:item-\d{4}\.md|custody\.json))$/u.test(
          rest[2],
        )) ||
      (rest.length === 4 &&
        rest[0] === "ls-files" &&
        rest[1] === "--error-unmatch" &&
        rest[2] === "--" &&
        /^(?:README\.md|docs\/item-\d{4}\.md)$/u.test(rest[3]));
    ensure(allowed, "CHILD_ARGUMENTS_REFUSED");
    return "git";
  }
  const fixed =
    "$ErrorActionPreference='Stop'; $paths = [Console]::In.ReadToEnd() | ConvertFrom-Json; foreach ($entry in $paths) { $item = Get-Item -Force -LiteralPath $entry; if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { exit 3 } }; exit 0";
  ensure(
    command === "powershell.exe" &&
      args.length === 4 &&
      args.slice(0, 3).join("|") === "-NoProfile|-NonInteractive|-Command" &&
      args[3] === fixed &&
      typeof options.input === "string",
    "CHILD_REFUSED",
  );
  const targets = JSON.parse(options.input);
  ensure(
    Array.isArray(targets) &&
      targets.length > 0 &&
      targets.length <= 2500 &&
      targets.every(
        (target) =>
          typeof target === "string" &&
          (target === owned || inside(owned, target) || inside(target, owned)),
      ),
    "CHILD_PATH_REFUSED",
  );
  return "powershell";
}

export async function installIsolation({ owned, budget, deadline, counters }) {
  const undo = [];
  const patch = (object, name, value) => {
    const previous = object[name];
    object[name] = value;
    undo.push(() => {
      object[name] = previous;
    });
  };
  const deny = () => {
    throw fixedError("NETWORK_OR_CHILD_REFUSED");
  };
  patch(globalThis, "fetch", deny);
  for (const name of ["WebSocket", "EventSource"])
    if (name in globalThis) patch(globalThis, name, deny);
  for (const [moduleName, loadModule, names] of [
    [
      "node:http",
      () => import("node:http"),
      ["request", "get", "createServer", "ClientRequest"],
    ],
    [
      "node:https",
      () => import("node:https"),
      ["request", "get", "createServer"],
    ],
    [
      "node:http2",
      () => import("node:http2"),
      ["connect", "createServer", "createSecureServer"],
    ],
    [
      "node:net",
      () => import("node:net"),
      ["connect", "createConnection", "createServer", "Socket", "Server"],
    ],
    [
      "node:tls",
      () => import("node:tls"),
      ["connect", "createServer", "TLSSocket"],
    ],
    ["node:dgram", () => import("node:dgram"), ["createSocket", "Socket"]],
    [
      "node:dns",
      () => import("node:dns"),
      ["lookup", "resolve", "resolve4", "resolve6", "Resolver"],
    ],
    [
      "node:dns/promises",
      () => import("node:dns/promises"),
      ["lookup", "resolve", "resolve4", "resolve6", "Resolver"],
    ],
    ["node:worker_threads", () => import("node:worker_threads"), ["Worker"]],
  ]) {
    const module = (await loadModule()).default;
    for (const name of new Set([
      ...names,
      ...(moduleName.startsWith("node:dns")
        ? Object.keys(module).filter(
            (key) => key.startsWith("resolve") || key === "lookupService",
          )
        : []),
    ]))
      patch(module, name, deny);
  }
  const originalSpawnSync = cp.spawnSync;
  for (const name of [
    "spawn",
    "exec",
    "execSync",
    "execFile",
    "execFileSync",
    "fork",
  ])
    patch(cp, name, deny);
  patch(cp, "spawnSync", (command, args, options) => {
    const start = performance.now();
    const kind = childPolicy(
      command,
      args,
      options,
      owned,
      deadline - performance.now(),
    );
    const policyCheckMs = performance.now() - start;
    const env = Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => !/^(?:GIT_|SSH_|NODE_OPTIONS|NODE_PATH)/iu.test(key),
      ),
    );
    Object.assign(env, {
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
      GIT_TERMINAL_PROMPT: "0",
      GIT_TEMPLATE_DIR: path.join(owned, "no-hooks"),
      GIT_ALLOW_PROTOCOL: "",
      GIT_AUTHOR_NAME: "Synthetic Fixture",
      GIT_AUTHOR_EMAIL: "fixture@example.invalid",
      GIT_COMMITTER_NAME: "Synthetic Fixture",
      GIT_COMMITTER_EMAIL: "fixture@example.invalid",
      GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z",
      GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z",
      GIT_CONFIG_COUNT: "7",
      GIT_CONFIG_KEY_0: "core.hooksPath",
      GIT_CONFIG_VALUE_0: path.join(owned, "no-hooks"),
      GIT_CONFIG_KEY_1: "commit.gpgSign",
      GIT_CONFIG_VALUE_1: "false",
      GIT_CONFIG_KEY_2: "core.autocrlf",
      GIT_CONFIG_VALUE_2: "false",
      GIT_CONFIG_KEY_3: "init.defaultBranch",
      GIT_CONFIG_VALUE_3: "synthetic",
      GIT_CONFIG_KEY_4: "protocol.allow",
      GIT_CONFIG_VALUE_4: "never",
      GIT_CONFIG_KEY_5: "core.fsmonitor",
      GIT_CONFIG_VALUE_5: "false",
      GIT_CONFIG_KEY_6: "core.untrackedCache",
      GIT_CONFIG_VALUE_6: "false",
    });
    // Reserve a deliberately conservative bound for each of the three mutating
    // fixture Git calls. Read-only Git calls cannot create fixture source/output.
    const gitMutation =
      kind === "git" && ["init", "add", "commit"].includes(args[2]);
    if (gitMutation) budget.charge(1024 * 1024, 512);
    const childOptions = {
      ...options,
      env,
      windowsHide: true,
      shell: false,
      timeout: Math.max(
        1,
        Math.min(10000, Math.floor(deadline - performance.now())),
      ),
      maxBuffer: Math.min(options.maxBuffer ?? 2098176, 2098176),
    };
    const nativeStart = performance.now();
    const result = originalSpawnSync(
      kind === "git" ? gitExecutable : powershell,
      args,
      childOptions,
    );
    const nativeEnd = performance.now();
    const success = !result.error && !result.signal && result.status === 0;
    const wrapperEnd = performance.now();
    counters.push({
      kind,
      durationMs: wrapperEnd - start,
      nativeMs: nativeEnd - nativeStart,
      wrapperMs: nativeStart - start + wrapperEnd - nativeEnd,
      policyCheckMs,
      success,
    });
    ensure(
      !result.error && !result.signal && result.status === 0,
      "BOUNDED_NATIVE_CHILD_FAILED",
    );
    return result;
  });
  const writable = (target) => {
    ensure(
      typeof target === "string" && (target === owned || inside(owned, target)),
      "WRITE_ROOT_REFUSED",
    );
    ensure(performance.now() < deadline, "CASE_DEADLINE");
  };
  for (const name of ["writeFile", "appendFile"]) {
    const original = fsp[name];
    patch(fsp, name, async (target, value, ...args) => {
      writable(target);
      ensure(
        typeof value === "string" ||
          Buffer.isBuffer(value) ||
          value instanceof Uint8Array,
        "WRITE_TYPE_REFUSED",
      );
      budget.charge(Buffer.byteLength(value));
      return original(target, value, ...args);
    });
  }
  for (const name of ["mkdir", "unlink", "rmdir", "rm", "chmod"]) {
    const original = fsp[name];
    patch(fsp, name, async (target, ...args) => {
      writable(target);
      return original(target, ...args);
    });
  }
  const rename = fsp.rename;
  patch(fsp, "rename", async (from, to, ...args) => {
    writable(from);
    writable(to);
    return rename(from, to, ...args);
  });
  for (const name of ["open", "copyFile", "cp", "link", "symlink", "truncate"])
    patch(fsp, name, deny);
  for (const name of ["open", "openSync"]) {
    const original = fs[name];
    patch(fs, name, (target, flags, ...args) => {
      ensure(
        flags === "r" || flags === "rs" || flags === 0,
        "WRITE_TYPE_REFUSED",
      );
      return original(target, flags, ...args);
    });
  }
  for (const name of [
    "writeFile",
    "appendFile",
    "write",
    "mkdir",
    "rm",
    "unlink",
    "rename",
    "copyFile",
    "cp",
    "link",
    "symlink",
    "truncate",
    "writeFileSync",
    "appendFileSync",
    "createWriteStream",
    "writeSync",
    "mkdirSync",
    "rmSync",
    "unlinkSync",
    "renameSync",
    "copyFileSync",
    "cpSync",
    "linkSync",
    "symlinkSync",
    "truncateSync",
  ])
    patch(fs, name, deny);
  syncBuiltinESMExports();
  return () => {
    undo.reverse().forEach((restore) => restore());
    syncBuiltinESMExports();
  };
}

async function plainTree(root) {
  const entries = [];
  const visit = async (current) => {
    const info = await fsp.lstat(current);
    ensure(
      !info.isSymbolicLink() && (!info.isFile() || info.nlink === 1),
      "OWNERSHIP_LINK_REFUSED",
    );
    ensure(
      (await fsp.realpath(current)).toLowerCase() ===
        path.resolve(current).toLowerCase(),
      "OWNERSHIP_ALIAS_REFUSED",
    );
    if (info.isDirectory())
      for (const name of await fsp.readdir(current))
        await visit(path.join(current, name));
    else {
      ensure(info.isFile(), "OWNERSHIP_TYPE_REFUSED");
      entries.push({
        path: path.relative(root, current).replaceAll("\\", "/"),
        bytes: info.size,
      });
    }
  };
  await visit(root);
  return entries;
}
async function ancestorsPlain(target) {
  let current = path.resolve(target);
  while (current !== path.dirname(current)) {
    const info = await fsp.lstat(current);
    ensure(
      info.isDirectory() &&
        !info.isSymbolicLink() &&
        (await fsp.realpath(current)).toLowerCase() === current.toLowerCase(),
      "OWNERSHIP_ANCESTOR_REFUSED",
    );
    current = path.dirname(current);
  }
}
export async function nativePlain(targets) {
  if (process.platform !== "win32") return;
  ensure(
    Array.isArray(targets) &&
      targets.length > 0 &&
      targets.length <= 10000 &&
      targets.every(
        (target) =>
          typeof target === "string" &&
          target.length > 0 &&
          target.length <= 32767,
      ),
    "NATIVE_TARGETS_REFUSED",
  );
  const inventory = new Set();
  for (const target of targets) {
    let current = path.resolve(target);
    while (current !== path.dirname(current)) {
      inventory.add(current);
      current = path.dirname(current);
    }
  }
  ensure(inventory.size <= 10000, "NATIVE_INVENTORY_CEILING");
  const program =
    "$ErrorActionPreference='Stop'; $paths=[Console]::In.ReadToEnd() | ConvertFrom-Json; if ($paths -isnot [array] -or $paths.Count -eq 0 -or $paths.Count -gt 10000) {exit 4}; foreach ($entry in $paths) { if ($entry -isnot [string] -or $entry.Length -eq 0 -or $entry.Length -gt 32767) {exit 4}; $item=Get-Item -Force -LiteralPath $entry; if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {exit 3} }; [Console]::Out.Write('checked:'+$paths.Count)";
  const result = cp.spawnSync(
    powershell,
    ["-NoProfile", "-NonInteractive", "-Command", program],
    {
      // ASCII JSON escapes preserve decoded UTF-16 paths independently of the
      // Windows console input code page, including both surrogate code units.
      input: JSON.stringify([...inventory]).replace(
        /[^\x20-\x7e]/g,
        (unit) => `\\u${unit.charCodeAt(0).toString(16).padStart(4, "0")}`,
      ),
      encoding: "utf8",
      timeout: 5000,
      maxBuffer: 1024,
      windowsHide: true,
    },
  );
  ensure(
    !result.error &&
      !result.signal &&
      result.status === 0 &&
      result.stdout === `checked:${inventory.size}`,
    "NATIVE_INVENTORY_REFUSED",
  );
  return { checkedPaths: inventory.size };
}
export async function knowledgeFixture(owned, size) {
  ensure(
    PROTOCOL.knowledgeSizes.includes(size),
    "FIXED_KNOWLEDGE_SIZE_REQUIRED",
  );
  const { stringify } = await import("yaml");
  const root = path.join(owned, "repository");
  await fsp.mkdir(root);
  await fsp.mkdir(path.join(owned, "no-hooks"));
  await fsp.mkdir(path.join(root, "docs"));
  await fsp.mkdir(path.join(root, "knowledge"));
  const texts = Object.fromEntries(
    Array.from({ length: size }, (_, i) => [
      i ? `docs/item-${String(i).padStart(4, "0")}.md` : "README.md",
      `# Synthetic item ${i}\n\nAuthored synthetic navigation evidence ${i}.\n`,
    ]),
  );
  for (const [name, text] of Object.entries(texts))
    await fsp.writeFile(path.join(root, name), text, { flag: "wx" });
  await fsp.writeFile(
    path.join(root, "docs/custody.json"),
    json({ ownerInputs: [] }),
    { flag: "wx" },
  );
  const git = (...args) =>
    cp
      .spawnSync("git", ["-C", root, ...args], {
        encoding: "utf8",
        windowsHide: true,
      })
      .stdout.trim();
  git("init", "--quiet");
  git("add", "--", "README.md", "docs");
  git("commit", "--quiet", "-m", "Synthetic measurement fixture");
  const revision = git("rev-parse", "HEAD");
  const project = "synthetic-measurement";
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
    ].map((role) => [role, `${project}:document:item-0000`]),
  );
  const common = {
    schema_version: "1.0.0",
    project,
    source_revision: revision,
    authority: "Synthetic sidecar metadata only.",
    publication_status: "local_review_package_not_reviewed_for_export",
    adoption: {
      source_artifact: "synthetic.seed.yaml",
      source_artifact_sha256: hash("synthetic"),
      source_hash_domain: "raw_file_bytes",
      metadata_authority: "sidecar_navigation_only",
      export_disposition: "local_only_metadata_projection",
    },
  };
  const documents = Object.entries(texts).map(([name, text], i) => ({
    id: `${project}:document:item-${String(i).padStart(4, "0")}`,
    path: name,
    title: `Synthetic item ${i}`,
    observed_role: "synthetic_evidence",
    document_lifecycle_observation: "synthetic_fixture",
    purpose: "Measure authored synthetic navigation.",
    source_revision: revision,
    working_file_sha256: hash(text),
    metadata_review: "curated_proposal",
    publication_status: "not_reviewed_for_export",
    git_pin: {
      hash_domain: "git_blob_bytes",
      oid: git("rev-parse", `${revision}:${name}`),
      sha256: hash(text),
    },
  }));
  const bundle = {
    profile: {
      schema_version: "1.0.0",
      project,
      source_root_alias: "synthetic-measurement-repository",
      authority_owners: owners,
      allowed_source_paths: Object.keys(texts),
      protected_inputs_registry: "docs/custody.json",
      registry_links: [],
      relations: [],
      output_protocol: "owned_detached_vault_v1",
      adaptation: "Fixed authored synthetic namespace only.",
    },
    catalog: {
      ...common,
      observed_at: "2026-09-05",
      source_root_alias: "synthetic-measurement-repository",
      authority_owners: owners,
      editorial_policy: ["Synthetic source remains authoritative."],
      documents,
    },
    entries: {
      ...common,
      observed_at: "2026-09-05",
      source_resolution: "Exact synthetic heading and line.",
      entries: [
        {
          id: `${project}:knowledge:method`,
          kind: "method",
          title: "Synthetic method",
          summary: "Synthetic pinned citation.",
          evidence_maturity: "synthetic_fixture",
          observed_scope: "Synthetic only.",
          limits: ["No real acceptance."],
          proposed_reuse: "Timing validation only.",
          tags: ["synthetic"],
          sources: [
            {
              document: documents[0].id,
              section: "Synthetic item 0",
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
          id: `${project}:reference:example`,
          kind: "synthetic_reference",
          title: "Synthetic reference",
          url: "https://example.invalid/reference",
          verification: "synthetic_fixture",
          useful_for: "No request is made.",
          limits: ["Synthetic only."],
          related_entries: [`${project}:knowledge:method`],
        },
      ],
    },
  };
  for (const [name, value] of Object.entries(bundle))
    await fsp.writeFile(
      path.join(root, "knowledge", `${name}.yaml`),
      stringify(value),
      { flag: "wx" },
    );
  return { root, bundle, texts, revision };
}

export function verifyKnowledgeNavigation(navigation, fixture) {
  const namespace = "synthetic-measurement";
  const method = `${namespace}:knowledge:method`;
  const reference = `${namespace}:reference:example`;
  const readme = `${namespace}:document:item-0000`;
  const scope = "Navigation only; no authority or acceptance implied.";
  const expectedEdges = [
    {
      from: method,
      to: readme,
      type: "links_to",
      origin: "curated_source_locator",
      evidence: {
        document: readme,
        section: "Synthetic item 0",
        observed_line: 1,
      },
      scope,
    },
    {
      from: reference,
      to: method,
      type: "links_to",
      origin: "curated_reference_relation",
      evidence: { reference },
      scope,
    },
  ];
  assert.deepEqual(navigation.graph, {
    schema_version: "1.0.0",
    project: namespace,
    scope:
      "Catalog records only; omitted uncataloged destinations are neither absent evidence nor deletion candidates.",
    omitted_uncataloged_targets: 0,
    nodes: [
      ...fixture.bundle.catalog.documents.map((entry) => entry.id),
      method,
      reference,
    ].sort(),
    edges: expectedEdges,
  });
  const cardName = (id) => `${id.replaceAll(":", "--")}.md`;
  assert.deepEqual(
    [...navigation.files.keys()].sort(),
    [
      ...fixture.bundle.catalog.documents.map((entry) => cardName(entry.id)),
      cardName(method),
      cardName(reference),
      "INDEX.md",
      "document.base",
      "knowledge.base",
      "reference.base",
      "navigation.json",
      "validation.json",
    ].sort(),
  );
  for (const document of fixture.bundle.catalog.documents) {
    const card = navigation.files.get(cardName(document.id));
    const bytes = Buffer.from(fixture.texts[document.path]);
    const expectedOid = createHash("sha1")
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest("hex");
    assert.equal(document.git_pin.oid, expectedOid);
    for (const text of [
      `knowledge_id: "${document.id}"`,
      `title: "${document.title}"`,
      "publish: false",
      'export_disposition: "local_only_metadata_projection"',
      `Repository location: ${document.path}.`,
      `Historical citation: ${fixture.revision}; Git blob ${expectedOid}.`,
      `Raw seed SHA-256: ${hash(bytes)}`,
      `Git blob SHA-256: ${hash(bytes)}`,
      "Current-file observation: **matches_historical_content**; unchanged_raw_bytes. Historical Git pin: verified.",
      "Local reading only; source qualification, work status and acceptance remain with their named owners.",
    ])
      assert.ok(card.includes(text));
    assert.equal(card.includes(fixture.texts[document.path].trim()), false);
  }
  const methodCard = navigation.files.get(cardName(method));
  assert.ok(methodCard.includes("Product activation: none."));
  assert.ok(
    methodCard.includes(
      `[Synthetic item 0](${cardName(readme)}) — Synthetic item 0, line 1, pinned revision ${fixture.revision}.`,
    ),
  );
  const referenceCard = navigation.files.get(cardName(reference));
  assert.ok(
    referenceCard.includes(
      "Reference URL (literal; no automatic request): https://example.invalid/reference",
    ),
  );
  assert.ok(referenceCard.includes(`[Synthetic method](${cardName(method)})`));
  assert.equal(
    hash(navigation.files.get("navigation.json")),
    hash(json(navigation.graph)),
  );
}

function sampleMemory() {
  return {
    rss: process.memoryUsage().rss,
    heapUsed: process.memoryUsage().heapUsed,
  };
}
function instrument() {
  const samples = Array.from({ length: 100 }, () => {
    const start = performance.now();
    return performance.now() - start;
  });
  return {
    emptyTimingEnvelopeMs: summarize(samples),
    wrapperMethod:
      "wrapperMs measures configuration/policy/options work before spawnSync and result checks after it; counter-array append, timing-read cost and outer orchestration are excluded. nativeMs measures the bounded spawnSync call; policyCheckMs is a subset of wrapperMs.",
    setupMethod:
      "setupMs covers dynamic production imports, authored fixtures, validation and oracle pinning before repetitions; process startup and isolation setup remain in case wall time.",
    memoryMethod:
      "RSS/heap sampled at phase boundaries; resourceUsage maxRSS is process high-water, not index retained memory",
    initialMemory: sampleMemory(),
  };
}
async function measureSearch(owned, size, context) {
  const setupStarted = performance.now();
  const api = await import("../src/pipeline/analyzed-corpus-v2.mjs");
  const search = await import("../src/engine/policy-search.mjs");
  const fixture = await searchFixture(size);
  const encoded = api.serializeAnalyzedCorpusV2(
    api.createAnalyzedCorpusV2(fixture.input),
  );
  const corpus = api.parseAnalyzedCorpusV2(JSON.parse(encoded));
  const specifications = searchCases();
  const index = search.createPolicySearchIndex(corpus);
  const oracle = Object.fromEntries(
    specifications.map((spec) => [
      spec.id,
      verifySearch(
        search.searchPolicyCorpus(index, spec.request),
        index,
        spec,
        fixture,
        search.policySearchPassage,
      ),
    ]),
  );
  const pin = {
    inputSha256: hash(encoded),
    inputBytes: Buffer.byteLength(encoded),
    works: size,
    versions: size,
    segments: size * 4,
    maxSegmentBytes: Math.max(
      ...[...fixture.exactSegments.values()].map((entry) =>
        Buffer.byteLength(entry.text),
      ),
    ),
    queryResultSha256: oracle,
    oracleRule:
      "Independent exact identity, eligibility, browse order and UTF-8 citation checks, then full result digest pinned before timing.",
  };
  await fsp.writeFile(path.join(owned, "input.json"), encoded, { flag: "wx" });
  await fsp.writeFile(
    path.join(owned, "oracle-before-timing.json"),
    json(pin),
    { flag: "wx" },
  );
  const setupMs = performance.now() - setupStarted;
  const observations = [];
  for (let repetition = 0; repetition < 13; repetition += 1) {
    context.check();
    const start = performance.now();
    const validated = api.parseAnalyzedCorpusV2(JSON.parse(encoded));
    const validationMs = performance.now() - start;
    const indexStart = performance.now();
    const warmedIndex = search.createPolicySearchIndex(validated);
    const indexMs = performance.now() - indexStart;
    const queries = [];
    for (const spec of specifications) {
      context.check();
      const coldIndex = search.createPolicySearchIndex(validated);
      const coldStart = performance.now();
      const cold = search.searchPolicyCorpus(coldIndex, spec.request);
      const coldMs = performance.now() - coldStart;
      search.searchPolicyCorpus(warmedIndex, spec.request);
      const warmStart = performance.now();
      const warm = search.searchPolicyCorpus(warmedIndex, spec.request);
      const warmMs = performance.now() - warmStart;
      assert.equal(
        verifySearch(
          cold,
          coldIndex,
          spec,
          fixture,
          search.policySearchPassage,
        ),
        oracle[spec.id],
      );
      assert.equal(
        verifySearch(
          warm,
          warmedIndex,
          spec,
          fixture,
          search.policySearchPassage,
        ),
        oracle[spec.id],
      );
      queries.push({ id: spec.id, coldMs, warmMs });
    }
    observations.push({
      repetition,
      warmup: repetition < 3,
      validationMs,
      indexMs,
      queries,
      memory: sampleMemory(),
    });
    await context.progress({ pin, observations });
  }
  const measured = observations.filter((entry) => !entry.warmup);
  return {
    pin,
    setupMs,
    observations,
    summaries: {
      validationMs: summarize(measured.map((entry) => entry.validationMs)),
      indexMs: summarize(measured.map((entry) => entry.indexMs)),
      queries: specifications.map((spec) => ({
        id: spec.id,
        coldMs: summarize(
          measured.map(
            (entry) =>
              entry.queries.find((query) => query.id === spec.id).coldMs,
          ),
        ),
        warmMs: summarize(
          measured.map(
            (entry) =>
              entry.queries.find((query) => query.id === spec.id).warmMs,
          ),
        ),
      })),
    },
    cacheState:
      "Fresh process per size; cold is fresh index, not cleared OS cache. Warm query follows a priming execution on its retained index within each repetition.",
  };
}
async function measureKnowledge(owned, size, context) {
  const setupStarted = performance.now();
  const { validateKnowledge } = await import("../src/knowledge/validate.mjs");
  const { buildNavigation } = await import("../src/knowledge/navigation.mjs");
  const { publishKnowledge, verifyOwnedOutput } =
    await import("../src/knowledge/publish.mjs");
  const fixture = await knowledgeFixture(owned, size);
  const generatedGit = (
    await plainTree(path.join(fixture.root, ".git"))
  ).reduce(
    (sum, entry) => ({ files: sum.files + 1, bytes: sum.bytes + entry.bytes }),
    { files: 0, bytes: 0 },
  );
  ensure(
    generatedGit.files <= 512 && generatedGit.bytes <= 1024 * 1024,
    "GIT_GENERATION_RESERVATION_EXCEEDED",
  );
  const model = await validateKnowledge(fixture.root);
  assert.deepEqual(model.report.counts, {
    documents: size,
    entries: 1,
    references: 1,
    source_locators: 1,
  });
  assert.equal(model.report.stale_documents, 0);
  assert.ok(
    model.report.observations.every(
      (entry) =>
        entry.historical_pin === "verified_git_blob" &&
        entry.raw_observation === "unchanged_raw_bytes",
    ),
  );
  const navigation = buildNavigation(model);
  verifyKnowledgeNavigation(navigation, fixture);
  const fileHashes = Object.fromEntries(
    [...navigation.files]
      .sort(([a], [b]) => a.localeCompare(b, "en"))
      .map(([name, value]) => [name, hash(value)]),
  );
  const output = path.join(owned, "reading-vault");
  const initial = await publishKnowledge(model, navigation.files, output);
  const pin = {
    inputSha256: hash(JSON.stringify(fixture.bundle)),
    inputBytes:
      Buffer.byteLength(JSON.stringify(fixture.bundle)) +
      Object.values(fixture.texts).reduce(
        (sum, text) => sum + Buffer.byteLength(text),
        0,
      ),
    revision: fixture.revision,
    documents: size,
    generatedGit,
    gitAccounting:
      "Three mutating Git commands each reserve 512 generated files and 1 MiB; retained Git inventory must fit one such reserve. Read-only invocation output is bounded separately.",
    fileHashes,
    manifestSha256: initial.manifest_sha256,
    reportSha256: hash(JSON.stringify(model.report)),
    graphSha256: hash(JSON.stringify(navigation.graph)),
    initialPublication:
      "Setup only; measured publication replaces an existing verified owned generation.",
  };
  await fsp.writeFile(
    path.join(owned, "oracle-before-timing.json"),
    json(pin),
    { flag: "wx" },
  );
  const setupMs = performance.now() - setupStarted;
  const observations = [];
  for (let repetition = 0; repetition < 13; repetition += 1) {
    context.check();
    const before = context.counters.length;
    const started = performance.now();
    const validated = await validateKnowledge(fixture.root);
    const validationMs = performance.now() - started;
    const navigationStart = performance.now();
    const generated = buildNavigation(validated);
    const navigationMs = performance.now() - navigationStart;
    const publicationStart = performance.now();
    const result = await publishKnowledge(validated, generated.files, output);
    const publicationMs = performance.now() - publicationStart;
    const generationMs = performance.now() - started;
    assert.equal(hash(JSON.stringify(validated.report)), pin.reportSha256);
    assert.equal(hash(JSON.stringify(generated.graph)), pin.graphSha256);
    assert.deepEqual(
      Object.fromEntries(
        [...generated.files]
          .sort(([a], [b]) => a.localeCompare(b, "en"))
          .map(([name, value]) => [name, hash(value)]),
      ),
      fileHashes,
    );
    assert.equal(result.manifest_sha256, pin.manifestSha256);
    const invocations = context.counters.slice(before);
    observations.push({
      repetition,
      warmup: repetition < 3,
      validationMs,
      navigationMs,
      publicationMs,
      generationMs,
      invocations,
      nativeMs: invocations.reduce((sum, entry) => sum + entry.nativeMs, 0),
      memory: sampleMemory(),
    });
    await context.progress({ pin, observations });
  }
  assert.equal(
    (await verifyOwnedOutput(output, model.profile.project)).hash,
    pin.manifestSha256,
  );
  const measured = observations.filter((entry) => !entry.warmup);
  return {
    pin,
    setupMs,
    observations,
    summaries: Object.fromEntries(
      [
        "validationMs",
        "navigationMs",
        "publicationMs",
        "generationMs",
        "nativeMs",
      ].map((field) => [
        field,
        summarize(measured.map((entry) => entry[field])),
      ]),
    ),
    attributionLimit:
      "Native time includes process startup plus command execution and wrapper overhead; does not isolate startup causally. Caught publication paths are not OS-crash or hostile-writer proof.",
  };
}

async function caseChild() {
  ensure(
    process.connected &&
      process.argv.length === 7 &&
      process.argv[2] === "--case",
    "INTERNAL_CASE_REFUSED",
  );
  const [family, sizeText, owned, token] = process.argv.slice(3);
  const size = Number(sizeText);
  ensure(
    ["search", "knowledge"].includes(family) &&
      PROTOCOL[`${family}Sizes`].includes(size) &&
      inside(destination, owned) &&
      path.dirname(owned) === destination &&
      /^[a-f0-9-]{36}$/u.test(token),
    "INTERNAL_CASE_REFUSED",
  );
  const owner = JSON.parse(
    await fsp.readFile(path.join(owned, "OWNER.json"), "utf8"),
  );
  ensure(
    owner.token === token &&
      owner.protocol === PROTOCOL.id &&
      owner.family === family &&
      owner.size === size,
    "CASE_OWNER_REFUSED",
  );
  const started = performance.now();
  const deadline = started + PROTOCOL.caseMilliseconds - 6000;
  const counters = [];
  const budget = createBudget(owner.budget);
  const restore = await installIsolation({ owned, budget, deadline, counters });
  const context = {
    counters,
    budget,
    check: () => ensure(performance.now() < deadline, "CASE_DEADLINE"),
    progress: async (partial) => {
      await fsp.writeFile(
        path.join(owned, "partial.json"),
        json({
          status: "incomplete",
          family,
          size,
          ...partial,
          budget: budget.state,
        }),
      );
    },
  };
  let result;
  try {
    const overhead = instrument();
    const detail =
      family === "search"
        ? await measureSearch(owned, size, context)
        : await measureKnowledge(owned, size, context);
    context.check();
    result = {
      status: "complete",
      family,
      size,
      ...detail,
      overhead,
      allInvocations: counters,
      budget: budget.state,
      wallMs: performance.now() - started,
      maxRssKiB: process.resourceUsage().maxRSS,
    };
  } catch (error) {
    result = {
      status: "incomplete",
      family,
      size,
      failure: /^[A-Z_]{3,60}$/u.test(error?.code ?? "")
        ? error.code
        : "SYNTHETIC_CASE_FAILED",
      budget: budget.state,
      wallMs: performance.now() - started,
      allInvocations: counters,
    };
  }
  restore();
  // Restored writes are only this exact owned result, after all synchronous native calls returned.
  const bytes = json(result);
  ensure(Buffer.byteLength(bytes) <= 1024 * 1024, "RESULT_BYTE_CEILING");
  budget.charge(Buffer.byteLength(bytes) + 1024);
  result.budget = { ...budget.state };
  await fsp.writeFile(path.join(owned, "result.json"), json(result), {
    flag: "wx",
  });
  process.send({ status: result.status, budget: result.budget });
  process.disconnect();
  process.exitCode = result.status === "complete" ? 0 : 1;
}

export async function superviseChild(
  child,
  milliseconds,
  {
    now = () => performance.now(),
    minimumBudget = { files: 0, bytes: 0 },
  } = {},
) {
  const deadline = now() + milliseconds;
  const validBudget = (value) =>
    value &&
    Object.keys(value).sort().join("|") === "bytes|files" &&
    Number.isSafeInteger(value.files) &&
    value.files >= minimumBudget.files &&
    value.files <= PROTOCOL.generatedFiles &&
    Number.isSafeInteger(value.bytes) &&
    value.bytes >= minimumBudget.bytes &&
    value.bytes <= PROTOCOL.generatedBytes;
  return new Promise((resolve) => {
    let timedOut = false;
    let message = null;
    let closed = false;
    const settle = (value) => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      clearTimeout(reapTimer);
      const detached = {
        disconnect: "not_needed",
        processUnref: "not_needed",
        channelUnref: "not_needed",
      };
      if (value.status === "incomplete" && !value.cleanupAllowed) {
        if (child.connected) {
          try {
            child.disconnect();
            detached.disconnect = "attempted";
          } catch {
            detached.disconnect = "unconfirmed";
          }
        }
        // These handles belong only to the exact child created by this runner.
        // Detaching parent references is not evidence of child termination.
        try {
          ensure(typeof child.unref === "function", "OWNED_HANDLE_UNAVAILABLE");
          child.unref();
          detached.processUnref = "attempted";
        } catch {
          detached.processUnref = "unconfirmed";
        }
        if (child.connected && child.channel) {
          try {
            child.channel.unref();
            detached.channelUnref = "attempted";
          } catch {
            detached.channelUnref = "unconfirmed";
          }
        }
      }
      resolve(
        Object.freeze({
          ...value,
          ...(value.budget
            ? { budget: Object.freeze({ ...value.budget }) }
            : {}),
          parentReferences: Object.freeze(detached),
        }),
      );
    };
    let reapTimer;
    const timer = setTimeout(
      () => {
        timedOut = true;
        try {
          child.kill();
        } catch {
          // Only the ChildProcess object just created by this runner.
          settle({
            status: "incomplete",
            failure: "OWNED_CHILD_KILL_UNCONFIRMED",
            cleanupAllowed: false,
          });
          return;
        }
        if (closed) return;
        reapTimer = setTimeout(
          () =>
            settle({
              status: "incomplete",
              failure: "OWNED_CHILD_REAP_UNCONFIRMED",
              cleanupAllowed: false,
            }),
          Math.max(0, deadline - now()),
        );
      },
      Math.max(0, milliseconds - 5000),
    );
    child.on("message", (value) => {
      if (!closed) message = value;
    });
    child.on("error", () =>
      settle({
        status: "incomplete",
        failure: "OWNED_CHILD_FAILED",
        cleanupAllowed: false,
      }),
    );
    child.once("close", (code, signal) =>
      settle(
        timedOut || now() >= deadline
          ? {
              status: "incomplete",
              failure: "CASE_DEADLINE",
              cleanupAllowed: false,
              descendantTermination: "unconfirmed; owned root retained",
            }
          : {
              status:
                code === 0 &&
                !signal &&
                message?.status === "complete" &&
                validBudget(message.budget)
                  ? "complete"
                  : "incomplete",
              failure: !validBudget(message?.budget)
                ? "ACCOUNTING_HANDOFF_REFUSED"
                : code === 0
                  ? null
                  : "OWNED_CASE_INCOMPLETE",
              cleanupAllowed: Boolean(message && validBudget(message.budget)),
              budget: validBudget(message?.budget) ? message.budget : undefined,
            },
      ),
    );
  });
}
async function main() {
  const started = performance.now() - PRIOR_PREFLIGHT_MILLISECONDS;
  ensure(
    process.argv.length === 3 && process.argv[2] === "--run",
    "USE_REGISTERED_FIXED_RUN",
  );
  ensure(process.platform === "win32", "SELECTED_WINDOWS_RUNTIME_REQUIRED");
  await ancestorsPlain(external);
  await nativePlain([external]);
  await fsp.mkdir(destination); // Exclusive run namespace; an old result is never overwritten.
  const token = randomUUID();
  await fsp.writeFile(
    path.join(destination, "OWNER.json"),
    json({ protocol: PROTOCOL.id, token }),
    { flag: "wx" },
  );
  const budget = createBudget();
  budget.charge(4096);
  const codePaths = [
    "scripts/measure-engineering.mjs",
    "src/pipeline/analyzed-corpus-v2.mjs",
    "src/engine/policy-search.mjs",
    "src/engine/temporal-operations.mjs",
    "src/knowledge/validate.mjs",
    "src/knowledge/navigation.mjs",
    "src/knowledge/publish.mjs",
    "src/knowledge/schema.mjs",
    "package-lock.json",
  ];
  const report = {
    protocol: PROTOCOL,
    priorPreflightMilliseconds: PRIOR_PREFLIGHT_MILLISECONDS,
    command: "npm run measure:engineering -- --run",
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      versions: process.versions,
    },
    hardware: {
      logicalCpus: os.cpus().length,
      cpuModel: os.cpus()[0]?.model,
      totalMemoryBytes: os.totalmem(),
      osRelease: os.release(),
    },
    codeHashes: Object.fromEntries(
      await Promise.all(
        codePaths.map(async (name) => [
          name,
          hash(await fsp.readFile(path.join(implementationRoot, name))),
        ]),
      ),
    ),
    cases: [],
    limitations: [
      "No network/source acquisition, real corpus, browser, source CLI, or product optimization.",
      "Ten observations supply median/range, not reliable tail percentiles.",
      "Native process time includes startup and work; memory high-water is process-wide.",
      "All synthetic case roots are retained for evidence; no recursive deletion or uncertain ownership cleanup.",
      "On watchdog timeout no browser or descendant termination is claimed; owned root is retained.",
    ],
  };
  cases: for (const family of ["search", "knowledge"])
    for (const size of PROTOCOL[`${family}Sizes`]) {
      if (performance.now() - started >= PROTOCOL.totalMilliseconds) {
        report.cases.push({
          family,
          size,
          status: "incomplete",
          failure: "TOTAL_DEADLINE",
        });
        continue;
      }
      const caseStart = performance.now();
      const owned = path.join(destination, `${family}-${size}`);
      await fsp.mkdir(owned);
      budget.charge(4096);
      const owner = json({
        protocol: PROTOCOL.id,
        token,
        family,
        size,
        budget: budget.state,
      });
      ensure(Buffer.byteLength(owner) <= 4096, "OWNER_SIZE_CEILING");
      await fsp.writeFile(path.join(owned, "OWNER.json"), owner, {
        flag: "wx",
      });
      const env = Object.fromEntries(
        Object.entries(process.env).filter(
          ([key]) => !/^(?:NODE_OPTIONS|NODE_PATH|GIT_)/iu.test(key),
        ),
      );
      const child = cp.fork(
        import.meta.filename,
        ["--case", family, String(size), owned, token],
        {
          execPath: process.execPath,
          execArgv: [],
          env,
          cwd: implementationRoot,
          windowsHide: true,
          stdio: ["ignore", "ignore", "ignore", "ipc"],
        },
      );
      const settled = await superviseChild(
        child,
        Math.max(
          1,
          Math.min(
            PROTOCOL.caseMilliseconds - (performance.now() - caseStart),
            PROTOCOL.totalMilliseconds - (performance.now() - started) - 10000,
          ),
        ),
        { minimumBudget: { ...budget.state } },
      );
      if (settled.budget) Object.assign(budget.state, settled.budget);
      report.cases.push({
        family,
        size,
        ...settled,
        wallMs: performance.now() - caseStart,
        evidence: `${family}-${size}/result.json`,
      });
      // A missing accounting handoff cannot authorize the remaining cumulative budget.
      if (!settled.budget) {
        report.stopReason = "ACCOUNTING_OR_REAP_UNCONFIRMED";
        break cases;
      }
    }
  report.generated = budget.state;
  report.accounting =
    "Cumulative attempted JS write events/bytes, plus 512 files and 1 MiB reserved per mutating Git command and conservative metadata reservations. This upper accounting differs from unique retained files.";
  if (report.stopReason)
    report.retained = {
      status: "unconfirmed; no post-timeout traversal or cleanup",
    };
  else {
    const inventory = await plainTree(destination);
    await nativePlain([
      destination,
      ...inventory.map((entry) => path.join(destination, entry.path)),
    ]);
    report.retained = {
      files: inventory.length,
      bytes: inventory.reduce((sum, entry) => sum + entry.bytes, 0),
    };
  }
  report.wallMs = performance.now() - started;
  report.status =
    !report.stopReason &&
    report.wallMs < PROTOCOL.totalMilliseconds &&
    report.cases.length === 6 &&
    report.cases.every((entry) => entry.status === "complete")
      ? "complete"
      : "incomplete";
  report.wallScope =
    "Prior failed preflight reservation plus this parent start through final inventory and native check, immediately before the awaited report write. Case watchdogs include a five-second reaping reserve inside 120 seconds. Never-settling parent report persistence is not a bounded or abandoned file operation.";
  budget.charge(Buffer.byteLength(json(report)) + 1024);
  await fsp.writeFile(path.join(destination, "report.json"), json(report), {
    flag: "wx",
  });
  process.stdout.write(
    `${JSON.stringify({ status: report.status, cases: report.cases.map(({ family, size, status, failure }) => ({ family, size, status, failure })), report: path.join(destination, "report.json") })}\n`,
  );
  process.exitCode = report.status === "complete" ? 0 : 1;
}
if (path.resolve(process.argv[1] ?? "") === import.meta.filename) {
  (process.argv[2] === "--case" ? caseChild() : main()).catch(() => {
    process.stderr.write("Synthetic measurement refused or incomplete.\n");
    if (process.connected) process.disconnect();
    process.exitCode = 1;
  });
}
