/**
 * Blind scorer for the query router (design section 3, T1.2 acceptance).
 * The query set was written without sight of the router. The alias table is a
 * TEST-ONLY, UNREVIEWED fixture (router-blind-aliases.v1.json); it is never
 * shipped and is not config/law-aliases.v1.json.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { LawAliasFile } from "../../src/demo/index-types";
import { routeQuery } from "../../src/demo/query-route";
import type { QueryRoute } from "../../src/demo/query-route";
import { nationNameProbeCases } from "../support/nation-name-probes";

type Jur = "federal" | "WA" | "OR" | "ID";
type KindExpect = {
  kind: string;
  identifier?: string;
  jurisdiction?: Jur | null;
};
type AmbiguousExpect = {
  ambiguous: true;
  alternatives: { kind: string; jurisdiction?: Jur | null }[];
};
type PlainExpect = { plainWords: true };
interface Row {
  query: string;
  expect: KindExpect | AmbiguousExpect | PlainExpect;
  task: string;
}

const dir = resolve(process.cwd(), "tests/demo/fixtures");
const rows = (
  JSON.parse(
    readFileSync(resolve(dir, "router-blind-set.v1.json"), "utf8"),
  ) as {
    rows: Row[];
  }
).rows;
const aliases = JSON.parse(
  readFileSync(resolve(dir, "router-blind-aliases.v1.json"), "utf8"),
) as LawAliasFile;

const KINDS = [
  "docket",
  "rin",
  "fr_document",
  "fr_citation",
  "cfr",
  "usc",
  "public_law",
  "statute",
  "us_reports",
  "federal_bill",
  "state_bill",
  "state_code",
  "court_docket",
  "law_name",
];

const digits = (s: string) => s.replace(/\D/g, "");
const isKind = (e: Row["expect"]): e is KindExpect => "kind" in e;
const isAmbiguous = (e: Row["expect"]): e is AmbiguousExpect =>
  "ambiguous" in e;
const isPlain = (e: Row["expect"]): e is PlainExpect => "plainWords" in e;

function kindPass(route: QueryRoute, e: KindExpect): boolean {
  return route.readings
    .slice(0, 3)
    .some(
      (r) =>
        r.kind === e.kind &&
        (e.identifier === undefined ||
          digits(r.identifier).includes(digits(e.identifier))) &&
        (e.jurisdiction === undefined || r.jurisdiction === e.jurisdiction),
    );
}

function ambiguousPass(route: QueryRoute, e: AmbiguousExpect): boolean {
  return (
    route.ambiguous &&
    e.alternatives.every((a) =>
      route.readings.some(
        (r) =>
          r.kind === a.kind &&
          (a.jurisdiction === undefined || r.jurisdiction === a.jurisdiction),
      ),
    )
  );
}

const STATE_JUR = ["WA", "OR", "ID"];

/** The query text with every masked span blanked out. */
function unmasked(route: QueryRoute): string {
  const chars = [...route.input];
  for (const s of route.maskedSpans)
    for (let i = s.start; i < s.end && i < chars.length; i += 1) chars[i] = " ";
  return chars.join("");
}

const EVIDENCE: Record<string, RegExp> = {
  WA: /\bwashington\b|\bWA\b|\b(?:RCW|WAC)\b/i,
  OR: /\boregon\b|\bOR\b|\b(?:ORS|OAR)\b/i,
  ID: /\bidaho\b|\bID\b|\bIDAPA\b/i,
};

/** Reading jurisdictions with no explicit evidence outside masked spans. */
function jurisdictionFromMask(route: QueryRoute): string[] {
  // A bare number lists every plausible state as a choice, with no evidence.
  if (route.ambiguous) return [];
  const rest = unmasked(route);
  return route.readings
    .map((r) => r.jurisdiction)
    .filter(
      (j): j is Jur =>
        j !== null && STATE_JUR.includes(j) && !EVIDENCE[j].test(rest),
    );
}

describe("query router, blind set", () => {
  it("the set is shaped as chartered", () => {
    expect(rows.length).toBeGreaterThanOrEqual(120);
    for (const k of KINDS)
      expect(
        rows.filter((r) => isKind(r.expect) && r.expect.kind === k).length,
        k,
      ).toBeGreaterThanOrEqual(4);
    expect(rows.filter((r) => isPlain(r.expect)).length).toBeGreaterThanOrEqual(
      15,
    );
    expect(rows.filter((r) => isAmbiguous(r.expect)).length).toBeGreaterThan(0);
    for (const r of rows) expect(r.task.length).toBeGreaterThan(0);
  });

  it("scores the router: 95% of kind rows, every ambiguous and plain row", () => {
    const opts = { aliases };
    const perKind = new Map<string, { pass: number; total: number }>();
    const failures: string[] = [];
    let kindPassCount = 0;
    let kindTotal = 0;
    for (const row of rows) {
      const route = routeQuery(row.query, opts);
      if (isKind(row.expect)) {
        const ok = kindPass(route, row.expect);
        const c = perKind.get(row.expect.kind) ?? { pass: 0, total: 0 };
        c.total += 1;
        if (ok) c.pass += 1;
        perKind.set(row.expect.kind, c);
        kindTotal += 1;
        if (ok) kindPassCount += 1;
        else failures.push(`kind: ${row.query}`);
      } else if (isAmbiguous(row.expect)) {
        if (!ambiguousPass(route, row.expect))
          failures.push(`ambiguous: ${row.query}`);
      } else if (!route.plainWords) failures.push(`plainWords: ${row.query}`);
    }
    for (const [k, c] of perKind) console.log(`${k}: ${c.pass}/${c.total}`);
    console.log(`kind rows: ${kindPassCount}/${kindTotal}`);
    const nonKind = failures.filter((f) => !f.startsWith("kind:"));
    expect(nonKind, nonKind.join("\n")).toEqual([]);
    expect(
      kindPassCount / kindTotal,
      failures.join("\n"),
    ).toBeGreaterThanOrEqual(0.95);
  });

  it("gives case captions and the words or, id and wa no jurisdiction", () => {
    const queries = rows
      .map((r) => r.query)
      .filter((q) =>
        /\bv\.\s|^(or|id|wa|or id wa|salmon or steelhead)$/.test(q),
      );
    expect(queries.length).toBeGreaterThan(4);
    for (const q of queries)
      for (const r of routeQuery(q, { aliases }).readings)
        expect(STATE_JUR, q).not.toContain(r.jurisdiction);
  });

  it("takes no jurisdiction from Nation-name shapes (generated probes)", () => {
    const bad: string[] = [];
    let sawWashington = 0;
    let withState = 0;
    for (const p of nationNameProbeCases()) {
      for (const q of [`${p.text} HB 2500`, `${p.text} Washington HB 2500`]) {
        const route = routeQuery(q, { aliases });
        const hits = jurisdictionFromMask(route);
        if (hits.length) bad.push(`${q} -> ${hits.join(",")}`);
      }
      // A state named outside the name (only where no other state is present).
      if (
        ["exact", "lower", "upper", "leading_the", "consultation"].includes(
          p.variant,
        )
      ) {
        withState += 1;
        const route = routeQuery(`${p.text} Washington HB 2500`, { aliases });
        if (
          route.readings
            .slice(0, 3)
            .some((r) => r.kind === "state_bill" && r.jurisdiction === "WA")
        )
          sawWashington += 1;
      }
    }
    expect(bad, bad.slice(0, 5).join("\n")).toEqual([]);
    expect(sawWashington).toBe(withState);
  });
});
