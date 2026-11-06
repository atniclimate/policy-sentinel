// @vitest-environment node
// Design rule 4 and safeguard 3 as a failing check: the page keeps in browser
// storage only the follow list, the cited list with its notes, and the display
// theme. No key stores search words or a search history.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FOLLOW_KEY, serializeFollows } from "../../src/demo/follow";
import {
  emptyReport,
  serializeReport,
  STORAGE_KEY,
} from "../../src/demo/report-state";
import type { ReportState } from "../../src/demo/report-state";
import { citation } from "./frontend-fixtures";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const page = ["demo", "src/demo"]
  .flatMap(files)
  .filter((path) => /\.(?:ts|tsx)$/.test(path))
  .map((path) => ({ path, text: readFileSync(path, "utf8") }));

/** Each storage write the page may make: the key and the only value it may write. */
const WRITES = [
  "sessionStorage.setItem(STORAGE_KEY, serializeReport(report))",
  "localStorage.setItem(FOLLOW_KEY, serializeFollows(follows))",
  "sessionStorage.setItem(THEME_KEY, next)",
].sort();

describe("storage guard", () => {
  it("writes only the cited list, the follow list and the theme", () => {
    const writes = page.flatMap(({ text }) =>
      [...text.matchAll(/\b(?:local|session)Storage\.setItem\([^;]*\)/g)].map(
        (m) => m[0].replace(/\s+/g, " "),
      ),
    );
    expect(writes.sort()).toEqual(WRITES);
  });

  it("uses no other browser store and no direct storage assignment", () => {
    const hits = page.filter(({ text }) =>
      /\bindexedDB\b|document\.cookie|\bcaches\.open\b|Storage\s*\[|Storage\.(?!getItem|setItem|removeItem)[A-Za-z_$]+\s*=/.test(
        text,
      ),
    );
    expect(hits.map((h) => h.path)).toEqual([]);
  });

  it("keeps the three keys fixed and the theme value a theme", () => {
    expect(STORAGE_KEY).toBe("ps-demo-citations-v1");
    expect(FOLLOW_KEY).toBe("ps-demo-following-v1");
    const main = readFileSync("demo/main.tsx", "utf8");
    expect(main).toContain('const THEME_KEY = "ps-demo-theme";');
    expect(main).toMatch(
      /const next = theme === "dark" \? "light" : "dark";\s+setTheme\(next\);\s+try \{\s+window\.sessionStorage\.setItem\(THEME_KEY, next\);/,
    );
  });

  it("never saves the search words that found a cited policy", () => {
    const words = "otterbank sedgeway";
    const report: ReportState = {
      ...emptyReport(),
      cited: {
        one: {
          citation: citation(),
          policy: null,
          note: "My own note",
          alternates: [],
          foundBy: [
            {
              sourceId: "federal-register",
              terms: words,
              seed: { kind: "typed" },
            },
          ],
        },
      },
    };
    const saved = serializeReport(report);
    expect(saved).toContain("My own note");
    expect(saved).not.toContain("otterbank");
    expect(saved).not.toContain("foundBy");
  });

  it("saves a followed record, not a search", () => {
    const saved = serializeFollows([
      {
        id: "federal-register:document:2099-00001",
        sourceId: "federal-register",
        kind: "document",
        value: "2099-00001",
        record: citation(),
        followedAt: "2099-01-07T12:00:00.000Z",
        lastChecked: null,
      },
    ]);
    const keys = Object.keys(JSON.parse(saved).followed[0]).sort();
    expect(keys).toEqual(
      [
        "followedAt",
        "id",
        "kind",
        "lastChecked",
        "record",
        "sourceId",
        "value",
      ].sort(),
    );
    expect(saved).not.toMatch(/"(?:q|query|terms|history)"/);
  });
});
