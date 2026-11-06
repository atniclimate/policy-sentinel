// @vitest-environment node
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { IndexManifest } from "../../src/demo/index-types";
import {
  parseAcquireArgs,
  runAcquire,
} from "../../scripts/demo-index/acquire.mjs";
import { validateDemoIndex } from "../../scripts/demo-index/validate.mjs";
import {
  makeZip,
  probeFile,
  removeTemps,
  tempDir,
} from "./fixtures/demo-index/build-index";

afterEach(() => {
  vi.useRealTimers();
  removeTemps();
});

const CFR_XML = readFileSync(
  "tests/demo/fixtures/demo-index/cfr-title25-trimmed.xml",
);
const USLM_XML = readFileSync(
  "tests/demo/fixtures/demo-index/usc25-trimmed.xml",
);
const LISTING = "https://www.govinfo.gov/bulkdata/json/CFR/2025/title-25";
const ZIP =
  "https://www.govinfo.gov/bulkdata/CFR/2025/title-25/CFR-2025-title-25.zip";
const USLM_ZIP =
  "https://uscode.house.gov/download/releasepoints/us/pl/119/136/xml_usc25@119-136.zip";
// The real clock, so stage validation never finds these files stale (C3).
const START = Date.now();

interface Answer {
  status?: number;
  type: string;
  body: string | Buffer;
}

/** A data directory (a copy of the committed manifest unless given), stubbed fetch and a fake clock. */
function harness(
  answers: Record<string, Answer>,
  existing?: string,
  start = START,
) {
  const dataDir = existing ?? tempDir();
  if (!existing)
    copyFileSync(
      "docs/demo-data/manifest.json",
      join(dataDir, "manifest.json"),
    );
  const workDir = tempDir();
  const out = tempDir();
  const rightsFile = join(out, "rights.json");
  writeFileSync(
    rightsFile,
    JSON.stringify({
      statementText: "none stated",
      url: "https://www.govinfo.gov/about/policies",
      readOn: "2026-11-05",
      readByRole: "owner",
    }),
  );
  let clock = start;
  const calls: { url: string; at: number }[] = [];
  const lines: string[] = [];
  const deps = {
    dataDir,
    now: () => clock,
    sleep: async (ms: number) => {
      clock += ms;
    },
    log: (line: string) => lines.push(line),
    fetch: async (url: string) => {
      calls.push({ url, at: clock });
      clock += 100;
      const answer = answers[url];
      if (!answer)
        return new Response("missing", {
          status: 404,
          headers: { "content-type": "text/plain" },
        });
      const body =
        typeof answer.body === "string"
          ? answer.body
          : new Uint8Array(answer.body);
      return new Response(body, {
        status: answer.status ?? 200,
        headers: { "content-type": answer.type },
      });
    },
  };
  const common = [
    "--work-dir",
    workDir,
    "--report",
    join(out, "report.json"),
    "--rights-file",
    rightsFile,
    "--nation-names",
    probeFile(),
  ];
  const run = (argv: string[]) => runAcquire([...argv, ...common], deps);
  const manifest = (): IndexManifest =>
    JSON.parse(readFileSync(join(dataDir, "manifest.json"), "utf8"));
  const report = () =>
    JSON.parse(readFileSync(join(out, "report.json"), "utf8"));
  return { dataDir, workDir, calls, lines, run, manifest, report, deps };
}

const cfrAnswers = (xml: Buffer = CFR_XML): Record<string, Answer> => ({
  [LISTING]: {
    type: "application/json",
    body: JSON.stringify({
      files: [{ justFileName: "CFR-2025-title-25.zip", link: ZIP, size: 1 }],
    }),
  },
  [ZIP]: {
    type: "application/zip",
    body: makeZip([
      {
        name: "CFR-2025-title-25/CFR-2025-title25-vol1.xml",
        data: xml,
        deflate: true,
      },
    ]),
  },
});
const CFR = ["cfr", "--title", "25", "--edition", "2025"];

describe("acquisition boundary", () => {
  it("is never run by build, check, demo:build or test, and check runs the validator (A3, K3)", () => {
    const scripts: Record<string, string> = JSON.parse(
      readFileSync("package.json", "utf8"),
    ).scripts;
    const expand = (name: string, seen = new Set<string>()): string => {
      if (seen.has(name)) return "";
      seen.add(name);
      const command = scripts[name] ?? "";
      return [
        command,
        ...[...command.matchAll(/npm run ([\w:-]+)/g)].map((m) =>
          expand(m[1], seen),
        ),
      ].join("\n");
    };
    for (const name of ["build", "check", "demo:build", "test"]) {
      expect(scripts[name]).toBeTruthy();
      expect(expand(name)).not.toMatch(
        /acquire-demo-index|demo-index\/acquire/,
      );
    }
    expect(scripts.check).toMatch(
      /npm run scan:source && npm run validate:demo-index/,
    );
    expect(scripts["validate:demo-index"]).toBe(
      "node scripts/validate-demo-index.mjs --dir docs/demo-data",
    );
  });

  it("refuses unpinned or unread inputs", () => {
    const dry = ["--dry-run"];
    expect(() =>
      parseAcquireArgs([
        "cfr",
        "--title",
        "25",
        "--edition",
        "current",
        ...dry,
      ]),
    ).toThrow(/current/);
    expect(() => parseAcquireArgs(["ecfr", "--title", "25", ...dry])).toThrow(
      /terms-read/,
    );
    expect(() =>
      parseAcquireArgs([
        "uslm",
        "--title",
        "25",
        "--release-point",
        "119-136",
        ...dry,
      ]),
    ).toThrow(/terms-read/);
    expect(() =>
      parseAcquireArgs([
        "uslm",
        "--title",
        "25",
        "--release-point",
        "current",
        "--terms-read",
        "2026-11-05",
        ...dry,
      ]),
    ).toThrow(/current/);
    expect(() =>
      parseAcquireArgs([...CFR, "--work-dir", "x", "--report", "y"]),
    ).toThrow(/rights-file/);
    expect(() => parseAcquireArgs(["fetch-all"])).toThrow(/usage/);
  });

  it("prints the plan and makes no request on --dry-run", async () => {
    const lines: string[] = [];
    const fetch = async () => {
      throw new Error("no request on a dry run");
    };
    const result = await runAcquire([...CFR, "--dry-run"], {
      fetch,
      log: (l) => lines.push(l),
    });
    expect(result.exitCode).toBe(0);
    expect(result.plan!.map((r) => r.url)).toEqual([LISTING, ZIP]);
    expect(lines.at(-1)).toMatch(/^2 requests planned/);
  });

  it("accepts an OLRC release point of the 119-60not43 form", async () => {
    const fetch = async () => {
      throw new Error("no request on a dry run");
    };
    const result = await runAcquire(
      [
        "uslm",
        "--title",
        "25",
        "--release-point",
        "119-60not43",
        "--terms-read",
        "2099-01-01",
        "--dry-run",
      ],
      { fetch, log: () => {} },
    );
    expect(result.exitCode).toBe(0);
    expect(result.plan!.map((r) => r.url)).toEqual([
      "https://uscode.house.gov/download/releasepoints/us/pl/119/60not43/xml_usc25@119-60not43.zip",
    ]);
  });

  it("refuses a work directory inside the repository", async () => {
    const h = harness(cfrAnswers());
    const result = await runAcquire(
      [
        ...CFR,
        "--work-dir",
        "docs/demo-data",
        "--report",
        join(tempDir(), "r.json"),
        "--rights-file",
        "x.json",
        "--nation-names",
        probeFile(),
      ],
      h.deps,
    );
    expect(result.exitCode).toBe(2);
    expect(h.calls).toEqual([]);
    expect(h.lines).toEqual(["--work-dir must be outside the repository"]);
  });

  it("refuses a real run without the full Nation-name list, or eCFR without a rights record (G3, N17)", async () => {
    const out = ["--work-dir", "x", "--report", "y", "--rights-file", "r"];
    expect(() => parseAcquireArgs([...CFR, ...out])).toThrow(/nation-names/);
    expect(() =>
      parseAcquireArgs([
        "ecfr",
        "--title",
        "25",
        "--terms-read",
        "2026-11-05",
        "--work-dir",
        "x",
        "--report",
        "y",
      ]),
    ).toThrow(/rights-file/);
    // The committed fixture alone holds a handful of entries, not 575.
    const h = harness(cfrAnswers());
    const result = await runAcquire(
      [
        ...CFR,
        "--work-dir",
        h.workDir,
        "--report",
        join(tempDir(), "r.json"),
        "--rights-file",
        "x.json",
        "--nation-names",
        probeFile(0),
      ],
      h.deps,
    );
    expect(result.exitCode).toBe(2);
    expect(h.calls).toEqual([]);
    expect(h.lines[0]).toMatch(/not the full list of 575; nothing fetched/);
  });
});

describe("CFR acquisition", () => {
  it("writes the shard and the manifest, spaced requests, raw bytes removed", async () => {
    const h = harness(cfrAnswers());
    const result = await h.run(CFR);
    expect(result.exitCode).toBe(0);
    // The refresh report names the probe list and its size for the I2 pull request text.
    expect(h.report().probes.source).toMatch(/--nation-names/);
    expect(h.report().probes.entryCount).toBeGreaterThanOrEqual(575);
    expect(h.calls.map((c) => c.url)).toEqual([LISTING, ZIP]);
    expect(h.calls[1].at - h.calls[0].at).toBeGreaterThanOrEqual(1100);
    const entry = h
      .manifest()
      .files.find((f) => f.path === "cfr/title-25.json")!;
    const bytes = readFileSync(join(h.dataDir, "cfr", "title-25.json"));
    expect(entry).toMatchObject({
      status: "current",
      sizeBytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      entryCount: 3,
      failureStage: null,
    });
    expect(entry.source).toMatchObject({
      id: "govinfo-cfr-annual",
      requestCount: 2,
      editionYear: 2025,
      revisedAsOfText: "Revised as of April 1, 2025",
      volumes: null,
      rights: { readByRole: "owner" },
    });
    expect(validateDemoIndex(h.dataDir).errors).toEqual([]);
    expect(readdirSync(h.workDir)).toEqual([]);
    expect(h.report()).toMatchObject({
      outcome: "written",
      requests: { planned: 2, used: 2 },
      validator: "pass",
      files: [
        {
          path: "cfr/title-25.json",
          entries: { added: 3, removed: 0, changed: 0 },
        },
      ],
    });
  });

  it("leaves the old shard byte-identical after a failed refresh and records it in the manifest only (D1, D2)", async () => {
    const first = harness(cfrAnswers());
    expect((await first.run(CFR)).exitCode).toBe(0);
    const before = readFileSync(join(first.dataDir, "cfr", "title-25.json"));
    const broken = Buffer.from(
      CFR_XML.toString().replace(
        "<EAR>Pt. 2</EAR>",
        "<RESERVED>PART 2 [RESERVED]</RESERVED>",
      ),
    );
    // Same data directory, a second run whose volume lacks a listed part.
    const retry = harness(cfrAnswers(broken), first.dataDir);
    const result = await retry.run(CFR);
    expect(result.exitCode).toBe(1);
    expect(
      readFileSync(join(first.dataDir, "cfr", "title-25.json")).equals(before),
    ).toBe(true);
    const entry = retry
      .manifest()
      .files.find((f) => f.path === "cfr/title-25.json")!;
    expect(entry).toMatchObject({
      status: "retained_after_failed_refresh",
      failureStage: "validation",
    });
    expect(entry.message).toMatch(/count identity fails/);
    expect(entry.message).not.toMatch(/https?:/);
    expect(validateDemoIndex(first.dataDir).errors).toEqual([]);
  });

  it("stops on the first non-200 answer and marks a never-written file unavailable", async () => {
    const answers = cfrAnswers();
    answers[LISTING] = { status: 404, type: "application/json", body: "{}" };
    const h = harness(answers);
    expect((await h.run(CFR)).exitCode).toBe(1);
    expect(h.calls).toHaveLength(1);
    expect(existsSync(join(h.dataDir, "cfr", "title-25.json"))).toBe(false);
    expect(
      h.manifest().files.find((f) => f.path === "cfr/title-25.json"),
    ).toMatchObject({
      status: "unavailable",
      sha256: null,
      failureStage: "fetch",
    });
    expect(h.report()).toMatchObject({
      outcome: "failed",
      requests: { used: 1 },
      failure: { stage: "fetch" },
    });
  });

  it("refuses an answer with the wrong content type (the bulk service error page)", async () => {
    const answers = cfrAnswers();
    answers[ZIP] = {
      type: "text/html",
      body: "<html>Govinfo Bulkdata Service Error</html>",
    };
    const h = harness(answers);
    expect((await h.run(CFR)).exitCode).toBe(1);
    expect(h.report().failure).toMatchObject({
      stage: "fetch",
      message: expect.stringMatching(/text\/html/),
    });
  });

  it("refreshes a file that has gone stale since 2027-01-01 (C3 is the build's rule)", async () => {
    const first = harness(cfrAnswers());
    expect((await first.run(CFR)).exitCode).toBe(0);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(
      Math.max(START + 200 * 86_400_000, Date.parse("2027-01-02T00:00:00Z")),
    );
    expect(validateDemoIndex(first.dataDir).errors.join("\n")).toMatch(
      /older than 180 days \(C3\)/,
    );
    const retry = harness(cfrAnswers(), first.dataDir, Date.now());
    expect((await retry.run(CFR)).exitCode).toBe(0);
    expect(
      retry.manifest().files.find((f) => f.path === "cfr/title-25.json"),
    ).toMatchObject({ status: "current" });
    expect(validateDemoIndex(first.dataDir).errors).toEqual([]);
  });

  it("keeps raw bytes in the work directory only when asked", async () => {
    const h = harness(cfrAnswers());
    expect((await h.run([...CFR, "--keep-raw"])).exitCode).toBe(0);
    expect(readdirSync(h.workDir).sort()).toEqual([
      "raw-1-title-25",
      "raw-2-CFR-2025-title-25.zip",
    ]);
  });
});

describe("vocabulary, U.S. Code and eCFR acquisition", () => {
  it("maps the Federal Register agencies and topics to the F4 fields", async () => {
    const h = harness({
      "https://www.federalregister.gov/api/v1/agencies": {
        type: "application/json",
        body: JSON.stringify([
          {
            id: 1,
            slug: "alpha-department",
            name: "Alpha Department",
            short_name: "AD",
            parent_id: null,
            description: "not carried",
            url: "https://www.federalregister.gov/agencies/alpha-department",
          },
        ]),
      },
      "https://www.federalregister.gov/api/v1/documents/facets/topic": {
        type: "application/json; charset=utf-8",
        body: JSON.stringify({
          "beta-topic": { count: 4, name: "Beta topic" },
        }),
      },
    });
    expect((await h.run(["vocab"])).exitCode).toBe(0);
    const agencies = readFileSync(
      join(h.dataDir, "vocab", "fr-agencies.json"),
      "utf8",
    );
    expect(agencies).not.toMatch(/not carried|https?:|"count"/);
    expect(JSON.parse(agencies).entries).toEqual([
      {
        id: "alpha-department",
        label: "Alpha Department",
        shortLabel: "AD",
        parentId: null,
      },
    ]);
    expect(
      h.manifest().files.find((f) => f.path === "vocab/fr-topics.json"),
    ).toMatchObject({
      status: "current",
      entryCount: 1,
    });
    expect(validateDemoIndex(h.dataDir).errors).toEqual([]);
  });

  it("writes a U.S. Code shard with the release point and the upstream hash", async () => {
    const zip = makeZip([{ name: "usc25.xml", data: USLM_XML, deflate: true }]);
    const h = harness({ [USLM_ZIP]: { type: "application/zip", body: zip } });
    const result = await h.run([
      "uslm",
      "--title",
      "25",
      "--release-point",
      "119-136",
      "--terms-read",
      "2026-11-05",
    ]);
    expect(result.exitCode).toBe(0);
    expect(
      h.manifest().files.find((f) => f.path === "usc/title-25.json")!.source,
    ).toMatchObject({
      id: "olrc-uslm",
      releasePoint: "119-136",
      publicationName: "Online@119-136",
      currentThroughText: "Current through 119-136",
      upstreamSha256: createHash("sha256").update(zip).digest("hex"),
      upstreamBytes: zip.length,
    });
    expect(validateDemoIndex(h.dataDir).errors).toEqual([]);
    expect(h.report().files[0].details.omitted).toEqual([
      {
        identifier: "/us/usc/t25/s421",
        field: "noteText",
        reason: "nation_name_probe",
      },
    ]);
  });

  it("records the eCFR up to date as of wording as current reference only", async () => {
    const h = harness({
      "https://www.ecfr.gov/api/versioner/v1/titles.json": {
        type: "application/json",
        body: JSON.stringify({
          titles: [
            {
              number: 25,
              name: "Synthetic title name",
              up_to_date_as_of: "2026-11-03",
            },
          ],
        }),
      },
    });
    expect(
      (await h.run(["ecfr", "--title", "25", "--terms-read", "2026-11-05"]))
        .exitCode,
    ).toBe(0);
    const entry = h
      .manifest()
      .files.find((f) => f.path === "cfr/title-25.json")!;
    expect(entry.status).toBe("unavailable");
    expect(entry.currentReference).toMatchObject({
      sourceId: "ecfr",
      upToDateAsOfText: "2026-11-03",
    });
    expect(validateDemoIndex(h.dataDir).errors).toEqual([]);
  });
});
