import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { EventEmitter } from "node:events";
import { createReadStream } from "node:fs";
import * as fs from "node:fs/promises";
import https from "node:https";
import { isIP } from "node:net";
import { tmpdir } from "node:os";
import * as path from "node:path";
import process from "node:process";
import { clearTimeout, setTimeout } from "node:timers";
import { setTimeout as delay } from "node:timers/promises";
import { URL } from "node:url";
import { types } from "node:util";
import { Script } from "node:vm";
import test from "node:test";
import { withPreservedCleanup } from "../../src/pipeline/policy-assurance.mjs";

const moduleUrl = new URL(
  "../../src/pipeline/policy-custody.mjs",
  import.meta.url,
);
const source = await fs.readFile(moduleUrl, "utf8");
// The complete actual module body runs with its real imports. Only spawn,
// process and timers vary for synthetic child cases. The returned private
// function exists only in this test's isolated context, never as a production
// export, flag, transport, or custody bypass.
const body = source
  .replace(/^import[\s\S]*?;\r?\n/gm, "")
  .replace(/^export /gm, "")
  .replaceAll("import.meta.dirname", "moduleDir");
const moduleScript = new Script(
  `(() => {\n${body}\nreturn windowsProbe;\n})()`,
  { filename: moduleUrl.pathname },
);
const actualProbe = (overrides = {}) =>
  moduleScript.runInNewContext({
    createHash,
    randomUUID,
    Buffer,
    spawn,
    lookup,
    createReadStream,
    ...fs,
    https,
    isIP,
    ...path,
    process,
    clearTimeout,
    setTimeout,
    URL,
    types,
    delay,
    withPreservedCleanup,
    moduleDir: path.dirname(moduleUrl.pathname.replace(/^\/(?=[A-Za-z]:)/, "")),
    ...overrides,
  });

function syntheticChild(onInput) {
  const child = new EventEmitter();
  child.stdin = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  const calls = { spawn: [], kill: [], timers: [], cleared: [], inputs: [] };
  child.kill = (...args) => {
    calls.kill.push(args);
    return true;
  };
  child.stdin.end = (payload, callback) => {
    calls.inputs.push(payload);
    globalThis.queueMicrotask(() =>
      onInput({ child, payload, callback, calls }),
    );
  };
  const probe = actualProbe({
    spawn: (...args) => {
      calls.spawn.push(args);
      return child;
    },
    process: { platform: "win32", env: { SystemRoot: "C:\\Windows" } },
    setTimeout: (callback, milliseconds) => {
      const timer = { callback, milliseconds };
      calls.timers.push(timer);
      return timer;
    },
    clearTimeout: (timer) => calls.cleared.push(timer),
  });
  return { probe, child, calls };
}

test("actual module rejects lost stdin followed by nominal empty success", async () => {
  const { probe, calls } = syntheticChild(({ child }) => {
    child.stdin.emit("error", new Error("SYNTHETIC_PRIVATE_INPUT_LOSS"));
    child.emit("close", 0, null);
  });
  await assert.rejects(probe("C:\\synthetic-owned"), /WINDOWS_PROBE_INPUT/);
  assert.equal(calls.kill.length, 1);
});

const acknowledgement = (payload, overrides = {}) =>
  JSON.stringify({
    version: "1.0",
    nonce: JSON.parse(payload).nonce,
    complete: true,
    entries: 0,
    ...overrides,
  });
const output = (child, value) => child.stdout.emit("data", Buffer.from(value));
const errorCode = (code) => (error) => {
  assert.equal(error.message, code);
  assert.doesNotMatch(error.stack, /SYNTHETIC_PRIVATE|C:\\synthetic-owned/);
  return true;
};

test("actual module requires delivered stdin and the nonce-bound completed inventory", async () => {
  const { probe, calls } = syntheticChild(({ child, payload, callback }) => {
    assert.equal(typeof callback, "function");
    callback();
    const response = acknowledgement(payload, { entries: 30000 });
    output(child, response.slice(0, 31));
    output(child, response.slice(31));
    child.emit("close", 0, null);
  });
  await probe("C:\\synthetic-owned");
  const request = JSON.parse(calls.inputs[0]);
  assert.deepEqual(Object.keys(request).sort(), ["nonce", "root", "version"]);
  assert.equal(request.root, "C:\\synthetic-owned");
  assert.equal(request.version, "1.0");
  assert.match(request.nonce, /^[a-f0-9-]{36}$/);
  assert.equal(
    calls.spawn[0][0],
    path.join(
      "C:\\Windows",
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe",
    ),
  );
  assert.equal(calls.spawn[0][2].windowsHide, true);
  assert.deepEqual(Array.from(calls.spawn[0][2].stdio), [
    "pipe",
    "pipe",
    "pipe",
  ]);
  assert.deepEqual(Array.from(calls.spawn[0][1].slice(0, 4)), [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-Command",
  ]);
  assert.ok(!calls.spawn[0][1].join(" ").includes(request.root));
  assert.equal(calls.timers.length, 1);
  assert.equal(calls.timers[0].milliseconds, 5000);
  assert.deepEqual(calls.cleared, calls.timers);
  assert.equal(calls.kill.length, 0);
});

for (const [name, response] of [
  ["missing", () => ""],
  ["empty", () => " \n"],
  ["truncated", (payload) => acknowledgement(payload).slice(0, -1)],
  ["malformed", () => "SYNTHETIC_PRIVATE_NOT_JSON"],
  ["null", () => "null"],
  ["array", () => "[]"],
  [
    "missing nonce",
    (payload) => {
      const value = JSON.parse(acknowledgement(payload));
      delete value.nonce;
      return JSON.stringify(value);
    },
  ],
  [
    "wrong nonce",
    (payload) =>
      acknowledgement(payload, {
        nonce: "00000000-0000-0000-0000-000000000000",
      }),
  ],
  ["wrong version", (payload) => acknowledgement(payload, { version: "2.0" })],
  ["numeric version", (payload) => acknowledgement(payload, { version: 1 })],
  ["incomplete", (payload) => acknowledgement(payload, { complete: false })],
  [
    "string complete",
    (payload) => acknowledgement(payload, { complete: "true" }),
  ],
  ["negative entries", (payload) => acknowledgement(payload, { entries: -1 })],
  [
    "fractional entries",
    (payload) => acknowledgement(payload, { entries: 0.5 }),
  ],
  ["excess entries", (payload) => acknowledgement(payload, { entries: 30001 })],
  [
    "extra fields",
    (payload) => acknowledgement(payload, { root: "SYNTHETIC_PRIVATE_PATH" }),
  ],
  ["trailing content", (payload) => `${acknowledgement(payload)}{}`],
]) {
  test(`actual module rejects ${name} acknowledgement`, async () => {
    const { probe } = syntheticChild(({ child, payload, callback }) => {
      callback();
      output(child, response(payload));
      child.emit("close", 0, null);
    });
    await assert.rejects(
      probe("C:\\synthetic-owned"),
      errorCode("WINDOWS_PROBE_OUTPUT"),
    );
  });
}

for (const [name, act, expected] of [
  [
    "stdin callback error",
    ({ child, payload, callback }) => {
      callback(new Error("SYNTHETIC_PRIVATE_INPUT"));
      output(child, acknowledgement(payload));
      child.emit("close", 0);
    },
    "WINDOWS_PROBE_INPUT",
  ],
  [
    "spawn error event",
    ({ child }) => {
      child.emit("error", new Error("SYNTHETIC_PRIVATE_SPAWN"));
      child.emit("close", -1);
    },
    "WINDOWS_PROBE_SPAWN",
  ],
  [
    "signal with nominal code",
    ({ child, payload, callback }) => {
      callback();
      output(child, acknowledgement(payload));
      child.emit("close", 0, "SIGTERM");
    },
    "WINDOWS_PROBE_SIGNAL",
  ],
  [
    "signal without code",
    ({ child, callback }) => {
      callback();
      child.emit("close", null, "SIGTERM");
    },
    "WINDOWS_PROBE_SIGNAL",
  ],
  [
    "reparse exit",
    ({ child, callback }) => {
      callback();
      child.emit("close", 42, null);
    },
    "WINDOWS_REPARSE_OR_INVENTORY_REJECTED",
  ],
  [
    "inventory limit exit",
    ({ child, callback }) => {
      callback();
      child.emit("close", 43, null);
    },
    "WINDOWS_REPARSE_OR_INVENTORY_REJECTED",
  ],
  [
    "native failure exit",
    ({ child, callback }) => {
      callback();
      child.emit("close", 44, null);
    },
    "WINDOWS_REPARSE_OR_INVENTORY_REJECTED",
  ],
  [
    "native input rejection",
    ({ child, callback }) => {
      callback();
      child.emit("close", 45, null);
    },
    "WINDOWS_PROBE_INPUT",
  ],
  [
    "stderr with valid acknowledgement",
    ({ child, payload, callback }) => {
      callback();
      child.stderr.emit("data", Buffer.from("SYNTHETIC_PRIVATE_STDERR"));
      output(child, acknowledgement(payload));
      child.emit("close", 0, null);
    },
    "WINDOWS_PROBE_OUTPUT",
  ],
]) {
  test(`actual module redacts ${name}`, async () => {
    const { probe } = syntheticChild(act);
    await assert.rejects(probe("C:\\synthetic-owned"), errorCode(expected));
  });
}

test("actual module redacts synchronous spawn and stdin failures", async () => {
  const { probe, child } = syntheticChild(() => {});
  child.stdin.end = () => {
    throw new Error("SYNTHETIC_PRIVATE_STDIN");
  };
  await assert.rejects(
    probe("C:\\synthetic-owned"),
    errorCode("WINDOWS_PROBE_INPUT"),
  );
  const failSpawn = actualProbe({
    process: { platform: "win32", env: { SystemRoot: "C:\\Windows" } },
    spawn: () => {
      throw new Error("SYNTHETIC_PRIVATE_SPAWN_PATH");
    },
  });
  await assert.rejects(
    failSpawn("C:\\synthetic-owned"),
    errorCode("WINDOWS_PROBE_SPAWN"),
  );
});

for (const stream of ["stdout", "stderr"]) {
  test(`actual module observes and redacts ${stream} read errors`, async () => {
    const { probe, calls } = syntheticChild(({ child, callback }) => {
      callback();
      child[stream].emit("error", new Error("SYNTHETIC_PRIVATE_READ"));
      child[stream].emit("error", new Error("SYNTHETIC_PRIVATE_LATE_READ"));
      child.emit("close", 0, null);
    });
    await assert.rejects(
      probe("C:\\synthetic-owned"),
      errorCode("WINDOWS_PROBE_OUTPUT"),
    );
    assert.equal(calls.kill.length, 1);
  });
}

for (const stream of ["stdout", "stderr", "combined"]) {
  test(`actual module bounds ${stream} bytes even if kill never closes`, async () => {
    const { probe, calls } = syntheticChild(({ child, callback }) => {
      callback();
      if (stream === "combined") {
        child.stdout.emit("data", Buffer.alloc(700, 32));
        child.stderr.emit("data", Buffer.alloc(325, 32));
      } else child[stream].emit("data", Buffer.alloc(1025, 32));
    });
    await assert.rejects(
      probe("C:\\synthetic-owned"),
      errorCode("WINDOWS_PROBE_OUTPUT_LIMIT"),
    );
    assert.equal(calls.kill.length, 1);
    assert.deepEqual(calls.cleared, calls.timers);
  });
}

test("exactly one KiB is accepted only with a valid acknowledgement", async () => {
  const { probe } = syntheticChild(({ child, payload, callback }) => {
    callback();
    output(child, acknowledgement(payload).padEnd(1024, " "));
    child.emit("close", 0, null);
  });
  await probe("C:\\synthetic-owned");
});

for (const name of ["no close", "no delivery", "kill throws"]) {
  test(`actual module settles after the fixed deadline with ${name}`, async () => {
    const { probe, calls } = syntheticChild(
      ({ child, payload, callback, calls }) => {
        if (name !== "no delivery") callback();
        output(child, acknowledgement(payload));
        if (name === "no delivery") child.emit("close", 0, null);
        if (name === "kill throws")
          child.kill = () => {
            calls.kill.push([]);
            throw new Error("SYNTHETIC_PRIVATE_KILL");
          };
        calls.timers[0].callback();
        child.stdin.emit("error", new Error("SYNTHETIC_PRIVATE_LATE_STDIN"));
        child.emit("error", new Error("SYNTHETIC_PRIVATE_LATE_CHILD"));
        child.emit("close", 0, null);
      },
    );
    await assert.rejects(
      probe("C:\\synthetic-owned"),
      errorCode("WINDOWS_PROBE_TIMEOUT"),
    );
    assert.equal(calls.timers[0].milliseconds, 5000);
    assert.equal(calls.kill.length, 1);
  });
}

test("a validated close still waits for the successful delivery callback", async () => {
  const { probe } = syntheticChild(({ child, payload, callback }) => {
    output(child, acknowledgement(payload));
    child.emit("close", 0, null);
    callback();
  });
  await probe("C:\\synthetic-owned");
});

test("the fixed command is independent of each JSON-only path and nonce", async () => {
  const commands = [];
  const nonces = [];
  for (const root of [
    "C:\\synthetic-owned",
    "C:\\synthetic;literal $value and `characters'",
  ]) {
    const { probe, calls } = syntheticChild(({ child, payload, callback }) => {
      callback();
      output(child, acknowledgement(payload));
      child.emit("close", 0, null);
    });
    await probe(root);
    commands.push(calls.spawn[0][1].at(-1));
    nonces.push(JSON.parse(calls.inputs[0]).nonce);
    assert.ok(!commands.at(-1).includes(root));
  }
  assert.equal(commands[0], commands[1]);
  assert.notEqual(nonces[0], nonces[1]);
  assert.match(commands[0], /while\(\$p\).*GetDirectoryName/);
  assert.match(commands[0], /EnumerateFileSystemEntries/);
  assert.match(commands[0], /\$n-gt 30000/);
  assert.equal((commands[0].match(/ReparsePoint/g) ?? []).length, 2);
});

test("missing or unsafe Windows configuration is rejected without spawn", async () => {
  for (const SystemRoot of [
    undefined,
    "Windows",
    "\\\\server\\Windows",
    "C:\\bad|Windows",
  ]) {
    let spawns = 0;
    const probe = actualProbe({
      process: { platform: "win32", env: { SystemRoot } },
      spawn: () => {
        spawns++;
        throw new Error("must not spawn");
      },
    });
    await assert.rejects(
      probe("C:\\synthetic-owned"),
      /WINDOWS_PROBE_CONFIGURATION/,
    );
    assert.equal(spawns, 0);
  }
});

test("non-Windows execution does not start the Windows child", async () => {
  const probe = actualProbe({
    process: { platform: "linux" },
    spawn: () => {
      throw new Error("must not spawn");
    },
  });
  await probe("/synthetic-owned");
});

test(
  "bounded native Windows request and reparse contracts use only an owned temporary root",
  { skip: process.platform !== "win32" },
  async (context) => {
    const temporaryParent = await fs.realpath(tmpdir());
    const root = await fs.mkdtemp(
      path.join(temporaryParent, "policy-sentinel-windows-probe-"),
    );
    const identity = await fs.lstat(root);
    assert.equal(await fs.realpath(root), root);
    const links = [];
    context.after(async () => {
      assert.equal(path.dirname(root), temporaryParent);
      assert.match(
        path.basename(root),
        /^policy-sentinel-windows-probe-[A-Za-z0-9]+$/,
      );
      const current = await fs.lstat(root);
      assert.equal(current.dev, identity.dev);
      assert.equal(current.ino, identity.ino);
      assert.equal(current.isSymbolicLink(), false);
      assert.equal(await fs.realpath(root), root);
      for (const link of links) {
        assert.equal(path.relative(root, link).startsWith(".."), false);
        const info = await fs.lstat(link).catch((error) => {
          if (error.code === "ENOENT") return null;
          throw error;
        });
        if (info) {
          assert.equal(info.isSymbolicLink(), true);
          await fs.unlink(link);
        }
      }
      const inspect = async (directory) => {
        for (const entry of await fs.readdir(directory)) {
          const target = path.join(directory, entry);
          const info = await fs.lstat(target);
          assert.equal(info.isSymbolicLink(), false);
          if (info.isDirectory()) await inspect(target);
          else {
            assert.equal(info.isFile(), true);
            assert.equal(info.nlink, 1);
          }
        }
      };
      await inspect(root);
      await fs.rm(root, { recursive: true, force: false });
    });
    const plain = path.join(root, "plain-\u00e9");
    await fs.mkdir(path.join(plain, "nested"), { recursive: true });
    await fs.writeFile(
      path.join(plain, "nested", "synthetic.txt"),
      "SYNTHETIC ONLY\n",
      { flag: "wx" },
    );
    await actualProbe()(plain);
    await actualProbe()(path.join(root, "missing-root"));
    for (const [name, transform, expected] of [
      ["missing", () => "", /WINDOWS_PROBE_INPUT/],
      ["empty", () => " \n", /WINDOWS_PROBE_INPUT/],
      [
        "truncated",
        (payload) => payload.slice(0, -1),
        /WINDOWS_REPARSE_OR_INVENTORY_REJECTED/,
      ],
      ["malformed", () => "not-json", /WINDOWS_REPARSE_OR_INVENTORY_REJECTED/],
      ["null", () => "null", /WINDOWS_PROBE_INPUT/],
      [
        "missing root",
        (payload) => {
          const value = JSON.parse(payload);
          delete value.root;
          return JSON.stringify(value);
        },
        /WINDOWS_PROBE_INPUT/,
      ],
      [
        "empty root",
        (payload) => JSON.stringify({ ...JSON.parse(payload), root: "" }),
        /WINDOWS_PROBE_INPUT/,
      ],
      [
        "relative root",
        (payload) =>
          JSON.stringify({ ...JSON.parse(payload), root: "synthetic" }),
        /WINDOWS_PROBE_INPUT/,
      ],
      [
        "numeric version",
        (payload) => JSON.stringify({ ...JSON.parse(payload), version: 1 }),
        /WINDOWS_PROBE_INPUT/,
      ],
      [
        "invalid nonce",
        (payload) =>
          JSON.stringify({ ...JSON.parse(payload), nonce: "invalid" }),
        /WINDOWS_PROBE_INPUT/,
      ],
      [
        "extra field",
        (payload) => JSON.stringify({ ...JSON.parse(payload), extra: false }),
        /WINDOWS_PROBE_INPUT/,
      ],
    ]) {
      await context.test(`native rejects ${name} request`, async () => {
        const probe = actualProbe({
          spawn: (...args) => {
            const child = spawn(...args);
            const end = child.stdin.end.bind(child.stdin);
            child.stdin.end = (payload, callback) =>
              end(transform(payload), callback);
            return child;
          },
        });
        await assert.rejects(probe(plain), expected);
      });
    }
    const junction = path.join(root, "root-alias");
    links.push(junction);
    await fs.symlink(plain, junction, "junction");
    await assert.rejects(
      actualProbe()(junction),
      /WINDOWS_REPARSE_OR_INVENTORY_REJECTED/,
    );
    await assert.rejects(
      actualProbe()(path.join(junction, "nested")),
      /WINDOWS_REPARSE_OR_INVENTORY_REJECTED/,
    );
    await fs.unlink(junction);
    const descendant = path.join(plain, "nested", "descendant-alias");
    const target = path.join(root, "target");
    await fs.mkdir(target);
    links.push(descendant);
    await fs.symlink(target, descendant, "junction");
    await assert.rejects(
      actualProbe()(plain),
      /WINDOWS_REPARSE_OR_INVENTORY_REJECTED/,
    );
  },
);
