// @vitest-environment node
// Search box word suggestions (search recommendation steps 1 and 2, owner
// decisions 7 and 9 of 2026-11-06): word-start ranking, the bounded typo pass
// with uFuzzy as its filter only, and plain-phrase lookup. Synthetic labels.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { LawAliasFile } from "../../src/demo/index-types";
import { routeQuery, type QueryRoute } from "../../src/demo/query-route";
import {
  editBudget,
  MAX_POSSIBLE_MATCHES,
  phraseRows,
  possibleMatches,
  rankLabels,
  type Labeled,
  type PlainPhrase,
  type PlainPhraseFile,
} from "../../src/demo/suggest";
import { nationNameProbeCases } from "../support/nation-name-probes";

const items = (...labels: string[]): Labeled[] =>
  labels.map((label) => ({ label }));
const labels = (list: readonly Labeled[]) => list.map((i) => i.label);
const plain = (input: string) => ({ input, maskedSpans: [] });

describe("rankLabels", () => {
  const list = items(
    "Sample Reconsultation Notices",
    "Tribal Consultation Sample Policy",
    "Consultation",
    "Consumer Sample Office",
  );

  it('finds "consul" at a word start only, fewer extra words first', () => {
    expect(labels(rankLabels("consul", list))).toEqual([
      "Consultation",
      "Tribal Consultation Sample Policy",
    ]);
  });

  it("gives the same options for either word order", () => {
    expect(labels(rankLabels("tribal consultation", list))).toEqual([
      "Tribal Consultation Sample Policy",
    ]);
    expect(rankLabels("consultation tribal", list)).toEqual(
      rankLabels("tribal consultation", list),
    );
  });

  it("lets only the last token be a prefix", () => {
    const office = items("Sample Water Office");
    expect(labels(rankLabels("water off", office))).toEqual([
      "Sample Water Office",
    ]);
    expect(rankLabels("wat office", office)).toEqual([]);
  });

  it("puts an exact short label first and matches agency short names", () => {
    const agencies: Labeled[] = [
      { label: "Sapo Sample Planning Office", shortLabel: null },
      { label: "Sample Planning Office", shortLabel: "SPO" },
    ];
    expect(labels(rankLabels("spo", agencies))).toEqual([
      "Sample Planning Office",
    ]);
    const prefixFirst: Labeled[] = [
      { label: "Spokes Sample Office", shortLabel: null },
      ...agencies,
    ];
    expect(labels(rankLabels("SPO", prefixFirst))).toEqual([
      "Sample Planning Office",
      "Spokes Sample Office",
    ]);
  });

  it("shows every agency that shares a short label, in list order", () => {
    const shared: Labeled[] = [
      { label: "Sample Water Board", shortLabel: "SWB" },
      { label: "Example Office", shortLabel: null },
      { label: "Sample Wildlife Bureau", shortLabel: "SWB" },
    ];
    expect(labels(rankLabels("SWB", shared))).toEqual([
      "Sample Water Board",
      "Sample Wildlife Bureau",
    ]);
  });

  it("puts an exact label before a longer one, then keeps list order", () => {
    const list2 = items(
      "Sample Habitat Program Office",
      "Example Habitat Program",
      "Habitat Program",
      "Sample Habitat Program",
    );
    expect(labels(rankLabels("habitat program", list2))).toEqual([
      "Habitat Program",
      "Example Habitat Program",
      "Sample Habitat Program",
      "Sample Habitat Program Office",
    ]);
  });
});

describe("possibleMatches", () => {
  const LAWS = items(
    "Sample Environmental Policy Act",
    "Sample Indian Child Welfare Act",
    "Sample Endangered Species Act",
    "Sample Clean Water Act",
    "Sample Clean Air Act",
    "Sample Indian Civil Rights Act",
    "Sampleson-Exampleby Fishery Conservation Act",
    "Sample Tribal Self-Governance Act",
    "Sample Graves Protection and Repatriation Act",
    "Sample HB 1100 Program",
    "Sample 25 CFR 900 Part",
    "Sample 25 CFR 9000 Part",
    "Sample ICWB Office",
  );

  it.each([
    ["enviromental policy", "Sample Environmental Policy Act"],
    ["indain child welfare", "Sample Indian Child Welfare Act"],
    ["endagered species", "Sample Endangered Species Act"],
    ["clen water act", "Sample Clean Water Act"],
    ["indian civl rights", "Sample Indian Civil Rights Act"],
    ["clean wter", "Sample Clean Water Act"],
    ["samplesen exampleby", "Sampleson-Exampleby Fishery Conservation Act"],
    ["self governence", "Sample Tribal Self-Governance Act"],
  ])("offers the intended name for %j", (typed, expected) => {
    const got = possibleMatches(plain(typed), LAWS);
    expect(labels(got)[0]).toBe(expected);
  });

  it.each([
    "NEPA",
    // The first letter must match: "repa" in Repatriation is one edit away.
    "nepa",
    "HB 1101",
    "25 CFR 901",
    "25 CFR 9001",
    "ICWA",
    // Two edits in a word of 4 to 7 letters, and any edit under 4 letters.
    "child wlfre",
    "clean aor",
  ])("offers nothing for %j", (typed) => {
    expect(possibleMatches(plain(typed), LAWS)).toEqual([]);
  });

  it("allows one edit to a lower-case acronym, which shows the all-caps rule is what blocks ICWA", () => {
    expect(labels(possibleMatches(plain("icwa"), LAWS))).toEqual([
      "Sample ICWB Office",
    ]);
  });

  it("allows two edits in a word of 8 letters or more", () => {
    expect(labels(possibleMatches(plain("enviromntal policy"), LAWS))).toEqual([
      "Sample Environmental Policy Act",
    ]);
  });

  it("sets the edit budget by length, digits and capitals", () => {
    expect(
      ["abc", "abcd", "abcdefg", "abcdefgh", "ab1cd", "NEPA", "ISDEAA"].map(
        editBudget,
      ),
    ).toEqual([0, 1, 1, 2, 0, 0, 0]);
    expect(editBudget("ABCDEFG")).toBe(1);
  });

  it("orders by fewer edits, then fewer extra words, then list order, and stops at 5", () => {
    const list = items(
      "Sample Habitat Planning Office",
      "Sample Habitat Office",
      "Sample Habitat Ofice Unit",
    );
    expect(labels(possibleMatches(plain("habitat ofice"), list))).toEqual([
      "Sample Habitat Ofice Unit",
      "Sample Habitat Office",
      "Sample Habitat Planning Office",
    ]);
    const many = items(
      ...Array.from({ length: 8 }, (_, i) => `Sample Habitat Office ${i}`),
    );
    expect(possibleMatches(plain("habitat ofice"), many)).toHaveLength(
      MAX_POSSIBLE_MATCHES,
    );
  });

  it("never offers a label with a protected span", () => {
    const list = items("Example Sample Tribe", "Example Sample Office");
    expect(labels(possibleMatches(plain("exampel sampel"), list))).toEqual([
      "Example Sample Office",
    ]);
  });

  it("reads the typed text with the router's masked spans blanked", () => {
    const list = items(
      "Example Tribq Office",
      "Sample Environmental Policy Act",
    );
    const typed = "Exampel Tribe";
    expect(labels(possibleMatches(plain(typed), list))).toEqual([
      "Example Tribq Office",
    ]);
    expect(possibleMatches(routeQuery(typed), list)).toEqual([]);
    expect(
      labels(
        possibleMatches(routeQuery("Example Tribe enviromental policy"), list),
      ),
    ).toEqual(["Sample Environmental Policy Act"]);
  });
});

describe("possibleMatches against the uFuzzy filter", () => {
  // An independent optimal string alignment, as in the research probe.
  function osaRow(a: string, b: string): number[] {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0]![j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i]![j] = Math.min(
          d[i - 1]![j]! + 1,
          d[i]![j - 1]! + 1,
          d[i - 1]![j - 1]! + c,
        );
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
          d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
      }
    return d[a.length]!;
  }

  it("keeps every one-edit word the rules accept and drops two-edit words", () => {
    let seed = 7;
    const next = (n: number) => (
      (seed = (seed * 1103515245 + 12345) % 2147483648),
      seed % n
    );
    const AB = "abcdefghijklmnopqrstuvwxyz";
    let accepted = 0;
    let rejected = 0;
    for (let n = 0; n < 150; n += 1) {
      const w = Array.from({ length: 4 + next(4) }, () => AB[next(26)]).join(
        "",
      );
      const list = items(w);
      const variants = new Set<string>();
      for (let i = 1; i <= w.length; i += 1) {
        for (const ch of i === 1 ? AB : AB[next(26)]! + w[0]) {
          variants.add(w.slice(0, i) + ch + w.slice(i));
          if (i < w.length) variants.add(w.slice(0, i) + ch + w.slice(i + 1));
        }
        if (i < w.length) variants.add(w.slice(0, i) + w.slice(i + 1));
        if (i + 1 < w.length)
          variants.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
        variants.add(w.slice(0, i));
        if (i + 2 < w.length)
          variants.add(w.slice(0, i) + "zq" + w.slice(i + 2));
      }
      for (const t of variants) {
        if (t.length < 4 || t.length > 7) continue;
        const ok = t[0] === w[0] && Math.min(...osaRow(t, w)) <= 1;
        const got = possibleMatches(plain(t), list);
        expect(got, `${t} for ${w}`).toEqual(ok ? list : []);
        if (ok) accepted += 1;
        else rejected += 1;
      }
    }
    expect(accepted).toBeGreaterThan(1000);
    expect(rejected).toBeGreaterThan(100);
  });
});

describe("possibleMatches on the blind set and the Nation-name probes", () => {
  const dir = resolve(process.cwd(), "tests/demo/fixtures");
  const rows = (
    JSON.parse(
      readFileSync(resolve(dir, "router-blind-set.v1.json"), "utf8"),
    ) as { rows: { query: string; expect: object }[] }
  ).rows;
  const aliases = JSON.parse(
    readFileSync(resolve(dir, "router-blind-aliases.v1.json"), "utf8"),
  ) as LawAliasFile;
  const LIST = items(...aliases.entries.map((a) => a.popularName));

  it("adds no reading on the ambiguous and plain rows", () => {
    const picked = rows.filter(
      (r) => "ambiguous" in r.expect || "plainWords" in r.expect,
    );
    expect(picked.length).toBeGreaterThan(20);
    for (const row of picked) {
      const route = routeQuery(row.query, { aliases });
      const before = JSON.stringify(route);
      const got = possibleMatches(route, LIST);
      expect(JSON.stringify(route), row.query).toBe(before);
      expect(JSON.stringify(routeQuery(row.query, { aliases }))).toBe(before);
      expect(
        got.every((g) => LIST.includes(g)),
        row.query,
      ).toBe(true);
    }
  });

  function unmasked(route: QueryRoute): string {
    const chars = route.input.split("");
    for (const s of route.maskedSpans)
      for (let i = s.start; i < s.end && i < chars.length; i += 1)
        chars[i] = " ";
    return chars.join("");
  }
  /** One substitution at the end of each word of 4 or more letters. */
  const misspell = (name: string) =>
    name.replace(/[\p{L}\p{N}]+/gu, (w) =>
      w.length >= 4 && /^\p{L}+$/u.test(w)
        ? w.slice(0, -1) + (w.at(-1)?.toLowerCase() === "q" ? "z" : "q")
        : w,
    );

  it("offers nothing from a masked span", () => {
    let wouldMatch = 0;
    for (const c of nationNameProbeCases()) {
      const decoy = items(misspell(c.name));
      const route = routeQuery(c.text);
      const got = possibleMatches(route, decoy);
      expect(got, c.text).toEqual(
        possibleMatches(plain(unmasked(route)), decoy),
      );
      if (c.variant === "exact") {
        expect(got, c.text).toEqual([]);
        if (possibleMatches(plain(c.text), decoy).length) wouldMatch += 1;
      }
    }
    // Without the mask the misspelled decoy would be offered.
    expect(wouldMatch).toBeGreaterThan(0);
  });
});

describe("timing", () => {
  it("ranks and runs the typo pass in under 5 ms per call over 4000 labels", () => {
    let seed = 11;
    const next = (n: number) => (
      (seed = (seed * 1103515245 + 12345) % 2147483648),
      seed % n
    );
    const SYL = ["ba", "ce", "di", "fo", "gu", "ka", "le", "mi", "no", "pu"];
    const word = () =>
      Array.from({ length: 2 + next(3) }, () => SYL[next(SYL.length)]).join("");
    const list: Labeled[] = Array.from({ length: 4000 }, (_, i) => ({
      label: Array.from({ length: 2 + next(5) }, word).join(" "),
      shortLabel: i % 10 === 0 ? `S${i}` : null,
    }));
    list[1234] = { label: "Sample Endangered Species Office" };
    const queries = [
      "bace",
      "kadi fole",
      "endagered specis",
      "enviromentl",
      "sample office",
      "bacedifo gukalemi",
    ];
    rankLabels("warm", list);
    possibleMatches(plain("warm"), list);
    expect(labels(possibleMatches(plain("endagered specis"), list))).toEqual([
      "Sample Endangered Species Office",
    ]);
    const runs = 10;
    const start = performance.now();
    for (let r = 0; r < runs; r += 1)
      for (const q of queries) {
        rankLabels(q, list);
        possibleMatches(plain(q), list);
      }
    const perCall = (performance.now() - start) / (runs * queries.length);
    expect(perCall).toBeLessThan(5);
  });
});

describe("phraseRows", () => {
  const row = (over: Partial<PlainPhrase> = {}): PlainPhrase => ({
    phrase: "fish runs",
    termFamily: "federal_register_topic",
    term: "Sample Fisheries Topic",
    termSourceUrl: "https://www.federalregister.gov/topics/sample-fisheries",
    reviewedOn: "2099-01-01",
    reviewerRole: "owner",
    basis: "curated",
    ...over,
  });
  const table: PlainPhraseFile = {
    $schema: "../schemas/plain-phrases.schema.v1.json",
    schemaVersion: "1.0.0",
    artifactType: "plain-phrases",
    entries: [
      row(),
      row({ term: "Sample Salmon Topic" }),
      row({ phrase: "x" }),
    ],
  };

  it("matches the whole phrase, ignoring case and spacing", () => {
    expect(phraseRows("  Fish   RUNS ", table).map((r) => r.term)).toEqual([
      "Sample Fisheries Topic",
      "Sample Salmon Topic",
    ]);
  });

  it("matches nothing for part of a phrase or more words", () => {
    expect(phraseRows("fish", table)).toEqual([]);
    expect(phraseRows("fish runs today", table)).toEqual([]);
  });
});
