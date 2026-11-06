// @vitest-environment node
// T1.8 and D-125: the freshness check reports, changes nothing, makes at most
// one request per check, spaces them, never retries and stops on 403 or 429.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const SCRIPT = resolve("scripts/check-index-freshness.mjs");

type Status = "current" | "refresh" | "not_checked";
interface Check {
  id: string;
  label: string;
  url?: string;
  status?: Status;
  detail?: string;
}
interface Result {
  id: string;
  label: string;
  status: Status;
  detail: string;
  url?: string;
}
type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

// A computed specifier: the script is plain JavaScript with no declaration file.
const freshness = (await import(pathToFileURL(SCRIPT).href)) as {
  SPACING_MS: number;
  congressAt: (value: string | Date) => { congress: number; session: number };
  retrievedSince: (manifest: unknown) => string;
  planChecks: (
    manifest: unknown,
    options?: {
      now?: Date;
      olrcTermsRead?: boolean;
      cfrTitle?: (file: { path: string }) => number | null;
    },
  ) => Check[];
  runChecks: (
    checks: Check[],
    options?: { fetch?: Fetch; sleep?: (ms: number) => Promise<void> },
  ) => Promise<Result[]>;
  formatReport: (results: Result[]) => string;
  formatPlan: (checks: Check[]) => string;
};

const source = (id: string, extra: object) => ({
  id,
  name: "Synthetic",
  urlTemplate: "https://www.govinfo.gov/x",
  linkTemplate: "https://www.ecfr.gov/x",
  requestCount: 1,
  retrievedAt: "2026-11-05T20:00:00-08:00",
  rights: {
    statementText: "none stated",
    url: "https://www.govinfo.gov/about/policies",
    readOn: "2026-11-05",
    readByRole: "owner",
  },
  ...extra,
});
const file = (path: string, src: object) => ({
  path,
  kind: "cfr-authority-shard",
  status: "current",
  source: src,
});
const manifest = {
  generatedAt: "2026-11-06T04:30:00Z",
  files: [
    file(
      "cfr/title-25.json",
      source("govinfo-cfr-annual", { editionYear: 2025 }),
    ),
    file(
      "cfr/title-36.json",
      source("govinfo-cfr-annual", {
        editionYear: 2025,
        retrievedAt: "2026-11-04T10:00:00Z",
      }),
    ),
    file("usc/title-25.json", source("olrc-uslm", { releasePoint: "119-36" })),
    {
      path: "vocabulary/x.json",
      kind: "vocabulary",
      status: "unavailable",
      source: null,
    },
  ],
};
const titles: Record<string, number> = {
  "cfr/title-25.json": 25,
  "cfr/title-36.json": 36,
};
const cfrTitle = (f: { path: string }) => titles[f.path] ?? null;
const NOW = new Date("2026-11-06T12:00:00Z");

const reply = (body: string | object, status = 200) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
  });

function stub(routes: [string, () => Response][]) {
  const calls: string[] = [];
  const fetch = vi.fn(async (url: string) => {
    calls.push(url);
    for (const [needle, make] of routes)
      if (url.includes(needle)) return make();
    return reply("not routed", 500);
  });
  const sleep = vi.fn(async () => undefined);
  return { calls, fetch, sleep };
}

const made: string[] = [];
afterEach(() => {
  for (const dir of made.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("Congress and session from the date", () => {
  it.each([
    ["2025-01-03T12:00:00Z", 119, 1],
    ["2025-01-02T12:00:00Z", 118, 2],
    ["2026-11-06T12:00:00Z", 119, 2],
    ["2027-01-04T00:00:00Z", 120, 1],
  ])("%s is the %ith Congress, session %i", (date, congress, session) => {
    expect(freshness.congressAt(date)).toEqual({ congress, session });
  });

  it("reports a new Congress and a new session without a request", () => {
    const next = freshness.planChecks(manifest, {
      now: new Date("2027-02-01T00:00:00Z"),
      cfrTitle,
    });
    expect(next.find((c) => c.id === "congress")).toMatchObject({
      status: "refresh",
      detail: expect.stringContaining("a new Congress: the 120th Congress"),
    });
    const same = freshness.planChecks(manifest, { now: NOW, cfrTitle });
    const congress = same.find((c) => c.id === "congress");
    expect(congress).toMatchObject({ status: "current" });
    expect(congress?.url).toBeUndefined();
    const early = {
      ...manifest,
      files: [
        file(
          "cfr/title-25.json",
          source("govinfo-cfr-annual", {
            editionYear: 2025,
            retrievedAt: "2025-06-01T00:00:00Z",
          }),
        ),
      ],
    };
    expect(
      freshness
        .planChecks(early, { now: NOW, cfrTitle })
        .find((c) => c.id === "congress"),
    ).toMatchObject({
      status: "refresh",
      detail: expect.stringContaining("a new session"),
    });
  });
});

describe("planned requests", () => {
  it("plans one request per CFR title, the presidential documents since the earliest retrieval, and no U.S. Code request with terms unread", () => {
    const checks = freshness.planChecks(manifest, { now: NOW, cfrTitle });
    expect(freshness.retrievedSince(manifest)).toBe("2026-11-04");
    const urls = checks.flatMap((c) => (c.url ? [c.url] : []));
    expect(urls).toHaveLength(3);
    expect(urls[0]).toBe(
      "https://www.govinfo.gov/bulkdata/json/CFR/2026/title-25",
    );
    expect(urls[1]).toBe(
      "https://www.govinfo.gov/bulkdata/json/CFR/2026/title-36",
    );
    const fr = new URL(urls[2]);
    expect(fr.host).toBe("www.federalregister.gov");
    expect(fr.searchParams.get("conditions[type][]")).toBe("PRESDOCU");
    expect(fr.searchParams.get("conditions[publication_date][gte]")).toBe(
      "2026-11-04",
    );
    expect(checks.find((c) => c.id === "usc")).toMatchObject({
      status: "not_checked",
      detail: "not checked: terms unread",
    });
    for (const url of urls)
      expect([
        "www.govinfo.gov",
        "www.federalregister.gov",
        "uscode.house.gov",
      ]).toContain(new URL(url).host);
  });

  it("reports a shard whose title cannot be read, and plans the U.S. Code page only with the terms read", () => {
    const checks = freshness.planChecks(manifest, {
      now: NOW,
      olrcTermsRead: true,
      cfrTitle: () => null,
    });
    expect(
      checks.filter(
        (c) => c.id.startsWith("cfr:") && c.status === "not_checked",
      ),
    ).toHaveLength(2);
    expect(checks.find((c) => c.id === "usc")?.url).toBe(
      "https://uscode.house.gov/download/download.shtml",
    );
  });

  it("makes no request in a dry run", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ps-fresh-"));
    made.push(dir);
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest));
    // A fetch that throws proves the dry run never calls it.
    const preload = join(dir, "no-fetch.mjs");
    writeFileSync(
      preload,
      'globalThis.fetch = () => { throw new Error("fetch called"); };\n',
    );
    const before = readdirSync(dir).sort();
    const out = execFileSync(
      process.execPath,
      [
        "--import",
        pathToFileURL(preload).href,
        SCRIPT,
        "--dry-run",
        "--manifest",
        join(dir, "manifest.json"),
      ],
      { encoding: "utf8" },
    );
    expect(out).toContain("Dry run: no requests made.");
    expect(out).toContain(
      "GET https://www.federalregister.gov/api/v1/documents.json?",
    );
    expect(out).toContain("not checked: terms unread");
    expect(readdirSync(dir).sort()).toEqual(before);
  });

  it("says so when there is no manifest", () => {
    let code = 0;
    let out = "";
    try {
      execFileSync(
        process.execPath,
        [
          SCRIPT,
          "--dry-run",
          "--manifest",
          join(tmpdir(), "ps-none", "manifest.json"),
        ],
        { encoding: "utf8" },
      );
    } catch (error) {
      code = (error as { status: number }).status;
      out = (error as { stdout: string }).stdout;
    }
    expect(code).toBe(1);
    expect(out).toContain("the index has not been built");
  });
});

describe("running the checks", () => {
  it("recommends a refresh for a new edition, a new release point and new presidential documents, spacing requests 1.1 s apart", async () => {
    const { calls, fetch, sleep } = stub([
      [
        "/CFR/2026/title-25",
        () => reply({ files: [{ justFileName: "CFR-2026-title-25.zip" }] }),
      ],
      ["/CFR/2026/title-36", () => reply({ message: "not found" }, 404)],
      [
        "uscode.house.gov",
        () =>
          reply(
            '<a href="releasepoints/us/pl/119/60/xml_uscAll@119-60.zip">XML</a>',
          ),
      ],
      ["federalregister.gov", () => reply({ count: 3, results: [] })],
    ]);
    const checks = freshness.planChecks(manifest, {
      now: NOW,
      olrcTermsRead: true,
      cfrTitle,
    });
    const results = await freshness.runChecks(checks, { fetch, sleep });
    expect(calls).toHaveLength(4);
    expect(new Set(calls).size).toBe(4);
    expect(sleep).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(freshness.SPACING_MS);
    expect(freshness.SPACING_MS).toBe(1100);
    const by = Object.fromEntries(results.map((r) => [r.id, r]));
    expect(by["cfr:25"]).toMatchObject({ status: "refresh" });
    expect(by["cfr:36"]).toMatchObject({ status: "current" });
    expect(by.usc).toMatchObject({
      status: "refresh",
      detail: expect.stringContaining("119-60"),
    });
    expect(by.presidential).toMatchObject({
      status: "refresh",
      detail: "3 published in the Federal Register",
    });
    const report = freshness.formatReport(results);
    expect(report).toMatch(/Refresh recommended:\n {2}- CFR title 25/);
    expect(report).not.toMatch(/Refresh recommended:[\s\S]*CFR title 36/);
  });

  it("counts the not suffix as part of the release point", async () => {
    const at = (releasePoint: string) => ({
      ...manifest,
      files: [file("usc/title-25.json", source("olrc-uslm", { releasePoint }))],
    });
    const { fetch, sleep } = stub([
      [
        "uscode.house.gov",
        () =>
          reply(
            '<a href="releasepoints/us/pl/119/60not43/xml_uscAll@119-60not43.zip">XML</a>',
          ),
      ],
    ]);
    const usc = async (releasePoint: string) =>
      (
        await freshness.runChecks(
          freshness
            .planChecks(at(releasePoint), { now: NOW, olrcTermsRead: true })
            .filter((c) => c.id === "usc"),
          { fetch, sleep },
        )
      )[0];
    expect(await usc("119-60")).toMatchObject({
      status: "refresh",
      detail: expect.stringContaining("119-60not43"),
    });
    expect(await usc("119-60not43")).toMatchObject({ status: "current" });
  });

  it("stops every later request on a 429 and never retries", async () => {
    const { calls, fetch, sleep } = stub([
      ["/CFR/2026/title-25", () => reply("slow down", 429)],
    ]);
    const results = await freshness.runChecks(
      freshness.planChecks(manifest, { now: NOW, cfrTitle }),
      { fetch, sleep },
    );
    expect(calls).toHaveLength(1);
    const by = Object.fromEntries(results.map((r) => [r.id, r]));
    expect(by["cfr:25"]).toMatchObject({
      status: "not_checked",
      detail: expect.stringContaining("HTTP 429"),
    });
    expect(by["cfr:36"]).toMatchObject({
      status: "not_checked",
      detail: "stopped after HTTP 429 from www.govinfo.gov",
    });
    expect(by.presidential.status).toBe("not_checked");
    expect(by.congress.status).toBe("current");
    expect(freshness.formatReport(results)).toContain(
      "Refresh recommended: none",
    );
  });

  it("stops on a 403 too, and treats an error page answered with 200 as not checked", async () => {
    const forbidden = stub([["/CFR/2026/title-25", () => reply("no", 403)]]);
    await freshness.runChecks(
      freshness.planChecks(manifest, { now: NOW, cfrTitle }),
      forbidden,
    );
    expect(forbidden.calls).toHaveLength(1);

    const { fetch, sleep } = stub([
      [
        "/CFR/2026/",
        () =>
          reply("<html><title>Govinfo Bulkdata Service Error</title></html>"),
      ],
      ["federalregister.gov", () => reply({ count: 0, results: [] })],
    ]);
    const results = await freshness.runChecks(
      freshness.planChecks(manifest, { now: NOW, cfrTitle }),
      { fetch, sleep },
    );
    const by = Object.fromEntries(results.map((r) => [r.id, r]));
    expect(by["cfr:25"]).toMatchObject({
      status: "not_checked",
      detail: "the listing answer was not JSON",
    });
    expect(by.presidential).toMatchObject({
      status: "current",
      detail: "none published",
    });
  });

  it("does not retry a failed request", async () => {
    const fetch = vi.fn(async () => {
      throw new Error("offline");
    });
    const results = await freshness.runChecks(
      freshness.planChecks(manifest, { now: NOW, cfrTitle }),
      { fetch, sleep: async () => undefined },
    );
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(
      results.filter((r) => r.detail === "the request failed"),
    ).toHaveLength(3);
  });
});
