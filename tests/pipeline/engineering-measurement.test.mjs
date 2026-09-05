import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Buffer } from "node:buffer";
import cp from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  PROTOCOL,
  PRIOR_PREFLIGHT_MILLISECONDS,
  childPolicy,
  createBudget,
  inside,
  installIsolation,
  knowledgeFixture,
  nativePlain,
  searchCases,
  searchFixture,
  summarize,
  superviseChild,
  verifySearch,
  verifyKnowledgeNavigation,
} from "../../scripts/measure-engineering.mjs";
import {
  createAnalyzedCorpusV2,
  parseAnalyzedCorpusV2,
  serializeAnalyzedCorpusV2,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";
import {
  createPolicySearchIndex,
  searchPolicyCorpus,
  policySearchPassage,
} from "../../src/engine/policy-search.mjs";

test("measurement sizes, repetitions, ceilings and provisional targets are fixed", () => {
  assert.deepEqual(PROTOCOL.searchSizes, [100, 500, 2000]);
  assert.deepEqual(PROTOCOL.knowledgeSizes, [5, 10, 20]);
  assert.equal(PROTOCOL.warmups, 3);
  assert.equal(PROTOCOL.repetitions, 10);
  assert.equal(PROTOCOL.caseMilliseconds, 120000);
  assert.equal(PROTOCOL.totalMilliseconds, 1200000);
  assert.equal(PRIOR_PREFLIGHT_MILLISECONDS, 947.8855);
  assert.deepEqual(summarize([4, 2, 1, 3]), {
    observations: [4, 2, 1, 3],
    median: 2.5,
    minimum: 1,
    maximum: 4,
  });
});
test("write accounting rejects a breach before changing its balance", () => {
  const budget = createBudget();
  budget.charge(512, 4);
  assert.deepEqual(budget.state, { files: 4, bytes: 512 });
  assert.throws(
    () => budget.charge(PROTOCOL.generatedBytes),
    /GENERATED_BUDGET_EXCEEDED/u,
  );
  assert.throws(
    () => budget.charge(0, PROTOCOL.generatedFiles),
    /GENERATED_BUDGET_EXCEEDED/u,
  );
  assert.throws(() => budget.charge(-1), /INVALID_CHARGE/u);
  assert.deepEqual(budget.state, { files: 4, bytes: 512 });
});
test("native command policy rejects remote, arbitrary input and unrelated roots", () => {
  const owned = path.resolve("synthetic-owned");
  const repository = path.join(owned, "repository");
  assert.equal(
    childPolicy("git", ["-C", repository, "rev-parse", "HEAD"], {}, owned, 100),
    "git",
  );
  for (const [command, args, options] of [
    ["git", ["-C", repository, "fetch"], {}],
    ["git", ["-C", repository, "config", "--list"], {}],
    ["git", ["-C", path.dirname(owned), "rev-parse", "HEAD"], {}],
    ["git", ["-C", repository, "rev-parse", "HEAD"], { shell: true }],
    [process.execPath, ["arbitrary.mjs"], {}],
    ["powershell.exe", ["-Command", "Get-Content arbitrary"], {}],
  ])
    assert.throws(
      () => childPolicy(command, args, options, owned, 100),
      /REFUSED/u,
    );
  assert.throws(
    () =>
      childPolicy("git", ["-C", repository, "rev-parse", "HEAD"], {}, owned, 0),
    /REFUSED/u,
  );
  assert.equal(inside(owned, `${owned}-neighbor`), false);
  assert.equal(inside(owned, path.join(owned, "child")), true);
});
test("actual v2 fixture and search oracles retain fixed citations and time boundaries", async () => {
  await assert.rejects(searchFixture(1), /FIXED_SEARCH_SIZE_REQUIRED/u);
  const fixture = await searchFixture(100);
  const serialized = serializeAnalyzedCorpusV2(
    createAnalyzedCorpusV2(fixture.input),
  );
  const corpus = parseAnalyzedCorpusV2(JSON.parse(serialized));
  assert.equal(corpus.trustDomain, "synthetic_test_only");
  assert.equal(corpus.works.length, 100);
  assert.equal(corpus.segments.length, 400);
  assert.ok(
    [...fixture.exactSegments.values()].every(
      (entry) => Buffer.byteLength(entry.text) <= 512,
    ),
  );
  const index = createPolicySearchIndex(corpus);
  for (const spec of searchCases()) {
    const result = searchPolicyCorpus(index, spec.request);
    const digest = verifySearch(
      result,
      index,
      spec,
      fixture,
      policySearchPassage,
    );
    assert.match(digest, /^[a-f0-9]{64}$/u);
    assert.equal(
      verifySearch(
        searchPolicyCorpus(index, spec.request),
        index,
        spec,
        fixture,
        policySearchPassage,
      ),
      digest,
    );
  }
  const spec = searchCases().find((entry) => entry.id === "unfiltered-browse");
  const altered = globalThis.structuredClone(
    searchPolicyCorpus(index, spec.request),
  );
  altered.hits[0].passages[0].captureId = "wrong-capture";
  assert.throws(() =>
    verifySearch(altered, index, spec, fixture, policySearchPassage),
  );
  for (const spec of searchCases().filter((entry) => entry.kind !== "none")) {
    for (const mutate of [
      (passages) => passages.splice(0),
      (passages) => passages.pop(),
      (passages) => {
        passages[1] = globalThis.structuredClone(passages[0]);
      },
    ]) {
      const hollow = globalThis.structuredClone(
        searchPolicyCorpus(index, spec.request),
      );
      mutate(hollow.hits[0].passages);
      assert.throws(() =>
        verifySearch(hollow, index, spec, fixture, policySearchPassage),
      );
    }
  }
});
test("all declared search sizes fit the unchanged actual v2 validation contract", async () => {
  for (const size of [500, 2000]) {
    const fixture = await searchFixture(size);
    const corpus = createAnalyzedCorpusV2(fixture.input);
    assert.equal(corpus.works.length, size);
    assert.equal(corpus.segments.length, 4 * size);
  }
});
test("independent isolation blocks network, unrelated children and wrong write roots before dispatch", async () => {
  const owned = path.resolve("synthetic-isolation-never-created");
  const restore = await installIsolation({
    owned,
    budget: createBudget(),
    deadline: performance.now() + 1000,
    counters: [],
  });
  try {
    assert.throws(
      () => globalThis.fetch("https://example.invalid"),
      /NETWORK_OR_CHILD_REFUSED/u,
    );
    const http = (await import("node:http")).default;
    const net = (await import("node:net")).default;
    assert.throws(
      () => http.get("https://example.invalid"),
      /NETWORK_OR_CHILD_REFUSED/u,
    );
    assert.throws(() => net.connect(1), /NETWORK_OR_CHILD_REFUSED/u);
    assert.throws(
      () => cp.spawn(process.execPath, []),
      /NETWORK_OR_CHILD_REFUSED/u,
    );
    assert.throws(() => cp.spawnSync("git", ["fetch"], {}), /REFUSED/u);
    await assert.rejects(
      fsp.writeFile(path.join(path.dirname(owned), "outside"), "x"),
      /WRITE_ROOT_REFUSED/u,
    );
    await assert.rejects(
      fsp.writeFile(path.join(owned, "inside"), { unsafe: true }),
      /WRITE_TYPE_REFUSED/u,
    );
  } finally {
    restore();
  }
});
test("watchdog kills only its own handle and retains uncertain roots", async () => {
  const child = new EventEmitter();
  let kills = 0;
  child.kill = () => {
    kills += 1;
    globalThis.queueMicrotask(() => child.emit("close", null, "SIGTERM"));
    return true;
  };
  const result = await superviseChild(child, 5);
  assert.equal(kills, 1);
  assert.equal(result.status, "incomplete");
  assert.equal(result.cleanupAllowed, false);
  assert.equal(result.failure, "CASE_DEADLINE");
});
test(
  "owned native synthetic knowledge setup validates and publishes the expected graph",
  {
    timeout: 30000,
    skip:
      process.platform !== "win32"
        ? "Selected native Windows measurement contract"
        : false,
  },
  async () => {
    const temporary = await fsp.realpath(tmpdir());
    const owned = await fsp.mkdtemp(
      path.join(temporary, "policy-sentinel-engineering-measurement-test-"),
    );
    const counters = [];
    const restore = await installIsolation({
      owned,
      budget: createBudget(),
      deadline: performance.now() + 25000,
      counters,
    });
    let settled = false;
    try {
      const fixture = await knowledgeFixture(owned, 5);
      const { validateKnowledge } =
        await import("../../src/knowledge/validate.mjs");
      const { buildNavigation } =
        await import("../../src/knowledge/navigation.mjs");
      const { publishKnowledge } =
        await import("../../src/knowledge/publish.mjs");
      const model = await validateKnowledge(fixture.root);
      assert.equal(model.report.counts.documents, 5);
      const view = buildNavigation(model);
      verifyKnowledgeNavigation(view, fixture);
      for (const field of ["from", "to", "type", "origin", "scope"]) {
        const wrongGraph = globalThis.structuredClone(view.graph);
        wrongGraph.edges[0][field] = "incorrect";
        assert.throws(() =>
          verifyKnowledgeNavigation({ ...view, graph: wrongGraph }, fixture),
        );
      }
      const wrongEvidence = globalThis.structuredClone(view.graph);
      wrongEvidence.edges[0].evidence.observed_line = 2;
      assert.throws(() =>
        verifyKnowledgeNavigation({ ...view, graph: wrongEvidence }, fixture),
      );
      const card = "synthetic-measurement--document--item-0000.md";
      for (const [before, after] of [
        ["Git blob ", "Missing pin "],
        ["publish: false", "publish: true"],
        [
          "Local reading only; source qualification, work status and acceptance remain with their named owners.",
          "Authority is granted.",
        ],
      ]) {
        const wrongFiles = new Map(view.files);
        wrongFiles.set(card, wrongFiles.get(card).replace(before, after));
        assert.throws(() =>
          verifyKnowledgeNavigation({ ...view, files: wrongFiles }, fixture),
        );
      }
      const first = await publishKnowledge(
        model,
        view.files,
        path.join(owned, "reading-vault"),
      );
      const second = await publishKnowledge(
        model,
        view.files,
        path.join(owned, "reading-vault"),
      );
      assert.equal(first.manifest_sha256, second.manifest_sha256);
      assert.ok(counters.some((entry) => entry.kind === "git"));
      assert.ok(counters.some((entry) => entry.kind === "powershell"));
      assert.ok(counters.every((entry) => entry.success));
      settled = true;
    } finally {
      restore();
      // Only after all synchronous children returned; refusal retains this exact
      // test root. Native reparse inventory also covers non-junction tags.
      if (settled) {
        assert.equal(path.dirname(owned), temporary);
        assert.ok(
          path
            .basename(owned)
            .startsWith("policy-sentinel-engineering-measurement-test-"),
        );
        const targets = [owned];
        const visit = async (root) => {
          for (const entry of await fsp.readdir(root, {
            withFileTypes: true,
          })) {
            const target = path.join(root, entry.name);
            assert.ok(inside(owned, target));
            const info = await fsp.lstat(target);
            assert.equal(info.isSymbolicLink(), false);
            if (info.isFile()) assert.equal(info.nlink, 1);
            targets.push(target);
            if (info.isDirectory()) await visit(target);
          }
        };
        await visit(owned);
        const { assertNoWindowsReparsePoints } =
          await import("../../src/knowledge/validate.mjs");
        assertNoWindowsReparsePoints(targets);
        await fsp.rm(owned, { recursive: true });
      }
    }
  },
);
test("successful child must close and hand back accounting before completion", async () => {
  const child = new EventEmitter();
  child.kill = () => assert.fail("unexpected kill");
  const pending = superviseChild(child, 500);
  child.emit("message", { status: "complete", budget: { files: 1, bytes: 2 } });
  child.emit("close", 0, null);
  const result = await pending;
  assert.equal(result.status, "complete");
  assert.deepEqual(result.budget, { files: 1, bytes: 2 });
});
test("supervision rejects elapsed deadlines before delayed timer dispatch", async () => {
  const child = new EventEmitter();
  child.kill = () => assert.fail("no timer should have dispatched");
  let clock = 0;
  const pending = superviseChild(child, 100, { now: () => clock });
  clock = 101;
  child.emit("message", { status: "complete", budget: { files: 1, bytes: 2 } });
  child.emit("close", 0, null);
  assert.equal((await pending).status, "incomplete");
});
test("missing, malformed, excessive and regressive accounting cannot complete", async () => {
  for (const budget of [
    undefined,
    {},
    { files: 1, bytes: "2" },
    { files: 10001, bytes: 2 },
    { files: 1, bytes: 268435457 },
    { files: 0, bytes: 2 },
    { files: 1, bytes: 1 },
    { files: 1, bytes: 2, other: true },
  ]) {
    const child = new EventEmitter();
    child.kill = () => assert.fail("unexpected kill");
    const pending = superviseChild(child, 100, {
      minimumBudget: { files: 1, bytes: 2 },
    });
    child.emit("message", { status: "complete", budget });
    child.emit("close", 0, null);
    const result = await pending;
    assert.equal(result.status, "incomplete");
    assert.equal(result.cleanupAllowed, false);
    assert.equal(result.budget, undefined);
  }
});
test("no close and a throwing kill both settle as incomplete inside the reaping allowance", async () => {
  for (const throws of [false, true]) {
    const child = new EventEmitter();
    child.kill = () => {
      if (throws) throw new Error("Synthetic kill error");
      return true;
    };
    const result = await superviseChild(child, 10);
    assert.equal(result.status, "incomplete");
    assert.equal(result.cleanupAllowed, false);
    assert.equal(
      result.failure,
      throws ? "OWNED_CHILD_KILL_UNCONFIRMED" : "OWNED_CHILD_REAP_UNCONFIRMED",
    );
  }
});
test("unconfirmed owned child detaches parent references once and observes late events", async () => {
  for (const throwing of ["none", "disconnect", "unref", "channel"]) {
    const child = new EventEmitter();
    child.connected = true;
    const calls = { disconnect: 0, unref: 0, channel: 0 };
    child.disconnect = () => {
      calls.disconnect += 1;
      if (throwing === "disconnect" || throwing === "channel")
        throw new Error("Synthetic disconnect error");
      child.connected = false;
    };
    child.unref = () => {
      calls.unref += 1;
      if (throwing === "unref") throw new Error("Synthetic unref error");
    };
    child.channel = {
      unref: () => {
        calls.channel += 1;
        if (throwing === "channel") throw new Error("Synthetic channel error");
      },
    };
    child.kill = () => {
      throw new Error("Synthetic kill error");
    };
    const result = await superviseChild(child, 10);
    const snapshot = JSON.stringify(result);
    assert.equal(result.status, "incomplete");
    assert.equal(result.cleanupAllowed, false);
    assert.deepEqual(calls, {
      disconnect: 1,
      unref: 1,
      channel: ["disconnect", "channel"].includes(throwing) ? 1 : 0,
    });
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.parentReferences), true);
    child.emit("error", new Error("Synthetic late error one"));
    child.emit("error", new Error("Synthetic late error two"));
    child.emit("close", 0, null);
    child.emit("message", {
      status: "complete",
      budget: { files: 1, bytes: 1 },
    });
    assert.equal(JSON.stringify(result), snapshot);
    assert.deepEqual(calls, {
      disconnect: 1,
      unref: 1,
      channel: ["disconnect", "channel"].includes(throwing) ? 1 : 0,
    });
  }
});
test(
  "native entry verifies flat multi-path Unicode ancestry and refuses missing/reparse targets",
  {
    timeout: 20000,
    skip:
      process.platform !== "win32"
        ? "Selected native Windows entry contract"
        : false,
  },
  async () => {
    const temporary = await fsp.realpath(tmpdir());
    const owned = await fsp.mkdtemp(
      path.join(temporary, "policy-sentinel-engineering-entry-test-"),
    );
    const nested = path.join(owned, "Synthetic café 🧪 space");
    const leaf = path.join(nested, "fixture.txt");
    await fsp.mkdir(nested);
    await fsp.writeFile(leaf, "Authored synthetic native entry fixture.\n", {
      flag: "wx",
    });
    let complete = false;
    try {
      const plainRoot = await nativePlain([owned]);
      assert.ok(plainRoot.checkedPaths > 1);
      const result = await nativePlain([owned, nested, leaf]);
      const expectedCount = path
        .resolve(leaf)
        .slice(path.parse(leaf).root.length)
        .split(path.sep).length;
      assert.ok(expectedCount > 3);
      assert.deepEqual(result, { checkedPaths: expectedCount });
      for (const invalid of [[], [[nested]], [""], [null]])
        await assert.rejects(nativePlain(invalid), /NATIVE_TARGETS_REFUSED/u);
      await assert.rejects(
        nativePlain([path.join(owned, "missing")]),
        /NATIVE_INVENTORY_REFUSED/u,
      );
      const junction = path.join(owned, "owned-junction");
      await fsp.symlink(nested, junction, "junction");
      try {
        assert.equal((await fsp.lstat(junction)).isSymbolicLink(), true);
        await assert.rejects(
          nativePlain([junction]),
          /NATIVE_INVENTORY_REFUSED/u,
        );
      } finally {
        assert.equal(path.dirname(junction), owned);
        assert.equal((await fsp.lstat(junction)).isSymbolicLink(), true);
        await fsp.rmdir(junction); // Remove only this owned junction entry, never its target.
      }
      await nativePlain([owned, nested, leaf]);
      complete = true;
    } finally {
      if (complete) {
        assert.equal(path.dirname(owned), temporary);
        assert.ok(
          path
            .basename(owned)
            .startsWith("policy-sentinel-engineering-entry-test-"),
        );
        assert.equal(
          (await fsp.realpath(owned)).toLowerCase(),
          owned.toLowerCase(),
        );
        assert.deepEqual((await fsp.readdir(owned)).sort(), [
          path.basename(nested),
        ]);
        assert.deepEqual(await fsp.readdir(nested), [path.basename(leaf)]);
        assert.equal((await fsp.lstat(leaf)).nlink, 1);
        await fsp.rm(owned, { recursive: true });
      }
    }
  },
);
