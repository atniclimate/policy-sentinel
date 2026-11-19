// @vitest-environment node
// Suggestion quality on the acquired official lists (D-178): exact, acronym,
// prefix and typo ranking on real Federal Register agency and topic names,
// and the per-keystroke cost on the full lists. Reads the committed index
// files; a list the manifest does not call current has nothing to rank.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { IndexManifest, VocabularyFile } from "../../src/demo/index-types";
import { routeQuery } from "../../src/demo/query-route";
import {
  possibleMatches,
  prepareLabels,
  rankLabels,
  type Labeled,
} from "../../src/demo/suggest";

const DIR = "docs/demo-data/";
const manifest: IndexManifest = JSON.parse(
  readFileSync(`${DIR}manifest.json`, "utf8"),
);
const current = (path: string) =>
  manifest.files.find((f) => f.path === path)?.status === "current";
const PATHS = ["vocab/fr-agencies.json", "vocab/fr-topics.json"];
const acquired = PATHS.every(current);

const vocab: Labeled[] = acquired
  ? PATHS.flatMap(
      (path) =>
        (JSON.parse(readFileSync(DIR + path, "utf8")) as VocabularyFile)
          .entries,
    )
  : [];
const top = (typed: string, n = 5) =>
  rankLabels(typed, vocab)
    .slice(0, n)
    .map((c) => c.label);

describe.skipIf(!acquired)("suggestions on the acquired vocabulary", () => {
  it("finds an agency by the start of its name", () => {
    expect(top("Federal Highway")).toEqual(["Federal Highway Administration"]);
    expect(top("indian aff")).toEqual(["Indian Affairs Bureau"]);
    expect(top("forest ser")).toEqual(["Forest Service"]);
  });

  it("finds an agency by its short name in any case", () => {
    for (const [typed, label] of [
      ["EPA", "Environmental Protection Agency"],
      ["epa", "Environmental Protection Agency"],
      ["bia", "Indian Affairs Bureau"],
      ["noaa", "National Oceanic and Atmospheric Administration"],
      ["FWS", "Fish and Wildlife Service"],
    ])
      expect(top(typed)[0]).toBe(label);
  });

  it("puts the exact topic first, then names holding the word, then longer words", () => {
    expect(top("fish")).toEqual([
      "Fish",
      "Fish and Wildlife Service",
      "Fisheries",
      "Fishing",
      "Fishing vessels",
    ]);
  });

  it("puts whole-word matches before longer words", () => {
    const water = top("water");
    expect(water).toHaveLength(5);
    for (const label of water) expect(label).toMatch(/\bwater\b/i);
    expect(top("indian")).toEqual(
      expect.arrayContaining([
        "Indian Affairs Bureau",
        "Indian Health Service",
      ]),
    );
  });

  it("offers the nearest official name for a misspelling, and nothing for unrelated text", () => {
    const possible = (typed: string) =>
      possibleMatches(routeQuery(typed), vocab).map((c) => c.label);
    expect(possible("forrest service")).toEqual(["Forest Service"]);
    expect(possible("enviromental protection")[0]).toBe(
      "Environmental protection",
    );
    expect(possible("zzzz qqqq")).toEqual([]);
  });

  it("ranks and runs the typo pass within 10 ms per keystroke on the full lists", () => {
    prepareLabels(vocab);
    const typed = "environmental protection agancy";
    let worst = 0;
    for (let n = 2; n <= typed.length; n += 1) {
      const text = typed.slice(0, n);
      const started = performance.now();
      const ranked = rankLabels(text, vocab);
      if (!ranked.length) possibleMatches(routeQuery(text), vocab);
      worst = Math.max(worst, performance.now() - started);
    }
    expect(vocab.length).toBeGreaterThan(1000);
    expect(worst).toBeLessThan(10);
  });
});
