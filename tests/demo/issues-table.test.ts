// @vitest-environment node
// The reviewed issue table (D-163 to D-165): a closed schema, every string
// clear of the D-068 personal-pattern guard and the structural Nation-name
// mask with no exemption for verbatim official fields, cross references that
// resolve, and a plan that sends automatically within AUTO_REQUEST_BUDGET.
// Another lane fills config/issues.v1.json, so these checks hold for an empty
// or a partial table too; synthetic rows exercise the schema on their own.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import {
  isFullProbe,
  loadNationProbe,
  probeHit,
} from "../../scripts/demo-index/common.mjs";
import {
  AUTO_REQUEST_BUDGET,
  buildPlan,
  lookupReady,
} from "../../src/demo/discovery";
import type { PlanSearch } from "../../src/demo/discovery";
import { entrySearches } from "../../src/demo/issues";
import type {
  IssueEntry,
  IssueFile,
  IssueIdentifier,
  IssueName,
  MeasureEntry,
  Provision,
} from "../../src/demo/issues";
import { maskProtectedSpans } from "../../src/demo/nation-mask";
import { personalPatternHits } from "../../src/demo/personal-guard";
import { nationNameBases } from "../support/nation-name-probes";

const ROOT = process.cwd();
const text = readFileSync(resolve(ROOT, "config/issues.v1.json"), "utf8");
const table = JSON.parse(text) as IssueFile;
const schema = JSON.parse(
  readFileSync(resolve(ROOT, "schemas/issues.schema.v1.json"), "utf8"),
) as Record<string, unknown>;
const validate = new Ajv2020({
  strict: true,
  allErrors: true,
  // Conditional `required` lists name properties declared by the parent object.
  strictRequired: false,
}).compile(schema);
const NAMES = nationNameBases();
/** Owner ruling D-171: rows that may ship before the full Nation-name list (G3). */
const G3_EXCEPTION: ReadonlySet<string> = new Set(["section-106", "baaja"]);
const LIVE_SOURCES = [
  "federal-register",
  "govinfo",
  "govinfo-courts",
  "congress",
  "regulations",
  "grants",
  "washington",
];

function* strings(value: unknown, path = ""): Generator<[string, string]> {
  if (typeof value === "string") yield [path, value];
  else if (Array.isArray(value))
    for (const [i, v] of value.entries()) yield* strings(v, `${path}[${i}]`);
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      yield [`${path}.${k}#key`, k];
      yield* strings(v, `${path}.${k}`);
    }
}

/**
 * Every key and value that hits the personal guard or any protected span.
 * No field is exempted: a verbatim official field (stated, heading, wording)
 * is checked and named like any other, so a hit still fails here for the
 * owner to decide.
 */
function contentProblems(file: unknown, names: readonly string[] = NAMES) {
  const problems: string[] = [];
  for (const [path, value] of strings(file)) {
    if (personalPatternHits(value).length)
      problems.push(`${path}: personal pattern`);
    if (maskProtectedSpans(value, { names }).spans.length)
      problems.push(`${path}: protected span`);
  }
  return problems;
}

const identifier = (over: Partial<IssueIdentifier> = {}): IssueIdentifier => ({
  kind: "usc",
  id: "33 U.S.C. 1251",
  label: "33 U.S.C. 1251",
  url: "https://www.govinfo.gov/x",
  stated: "Sample Act heading",
  readOn: "2026-11-10",
  ...over,
});

const name = (over: Partial<IssueName> = {}): IssueName => ({
  name: "Sample Issue",
  basis: "official",
  statedAt: "https://www.govinfo.gov/x",
  wording: "Sample Issue wording",
  reviewedOn: "2026-11-10",
  ...over,
});

const search = (over: Partial<PlanSearch> = {}): PlanSearch => ({
  group: "policy",
  source: "federal-register",
  query: "sample query",
  auto: true,
  ...over,
});

const issueEntry = (over: Partial<IssueEntry> = {}): IssueEntry => ({
  kind: "issue",
  id: "sample-issue",
  label: "Sample issue",
  names: [name()],
  searches: [search()],
  reviewedOn: "2026-11-10",
  reviewerRole: "owner",
  restsOn: [identifier()],
  ...over,
});

const provision = (over: Partial<Provision> = {}): Provision => ({
  issue: "sample-issue",
  bill: "sample-bill",
  version: "Introduced in Senate",
  section: "101",
  heading: "Sample heading",
  url: "https://www.govinfo.gov/x",
  readOn: "2026-11-10",
  basis: "cites",
  cites: ["33 U.S.C. 1251"],
  reviewedOn: "2026-11-10",
  ...over,
});

const measureEntry = (over: Partial<MeasureEntry> = {}): MeasureEntry => ({
  kind: "measure",
  id: "sample-measure",
  label: "Sample measure",
  names: [name({ name: "Sample Measure" })],
  searches: [search({ group: "legislation", source: "congress" })],
  reviewedOn: "2026-11-10",
  reviewerRole: "owner",
  identifiers: [
    identifier({
      kind: "bill",
      id: "sample-bill",
      label: "S. 1 (119th Congress)",
    }),
  ],
  provisions: [provision()],
  ...over,
});

const withEntries = (entries: unknown[]) => ({ ...table, entries });

describe("the committed issue table", () => {
  it("validates strictly against its schema", () => {
    expect(schema.$id).toBe(
      "https://policy-sentinel.invalid/schemas/issues.schema.v1.json",
    );
    expect(validate(table), JSON.stringify(validate.errors)).toBe(true);
  });

  it("has unique entry ids and labels", () => {
    const ids = table.entries.map((e) => e.id);
    const labels = table.entries.map((e) => e.label);
    expect(ids.length).toBe(new Set(ids).size);
    expect(labels.length).toBe(new Set(labels).size);
  });

  it("has unique names within each entry", () => {
    for (const entry of table.entries) {
      const names = entry.names.map((n) => n.name);
      expect(names.length, entry.id).toBe(new Set(names).size);
    }
  });

  it("files every provision under one of its measure's bill identifiers and an issue entry id", () => {
    const issueIds = new Set(
      table.entries.filter((e) => e.kind === "issue").map((e) => e.id),
    );
    for (const entry of table.entries) {
      if (entry.kind !== "measure") continue;
      const billIds = new Set(
        entry.identifiers.filter((i) => i.kind === "bill").map((i) => i.id),
      );
      for (const provision of entry.provisions) {
        expect(
          billIds.has(provision.bill),
          `${entry.id}:${provision.bill}`,
        ).toBe(true);
        expect(
          issueIds.has(provision.issue),
          `${entry.id}:${provision.issue}`,
        ).toBe(true);
      }
    }
  });

  it("cites only identifiers its issue rests on", () => {
    const issueById = new Map(
      table.entries
        .filter((e): e is IssueEntry => e.kind === "issue")
        .map((e) => [e.id, e]),
    );
    for (const entry of table.entries) {
      if (entry.kind !== "measure") continue;
      for (const provision of entry.provisions) {
        if (provision.basis !== "cites") continue;
        const restsOnIds = new Set(
          (issueById.get(provision.issue)?.restsOn ?? []).map((i) => i.id),
        );
        for (const id of provision.cites ?? [])
          expect(
            restsOnIds.has(id),
            `${entry.id}:${provision.issue}:${id}`,
          ).toBe(true);
      }
    }
  });

  it("gives an issue with empty restsOn at least one provision that lists it", () => {
    const listedIssueIds = new Set(
      table.entries.flatMap((e) =>
        e.kind === "measure"
          ? e.provisions.filter((p) => p.basis === "listed").map((p) => p.issue)
          : [],
      ),
    );
    for (const entry of table.entries)
      if (entry.kind === "issue" && entry.restsOn.length === 0)
        expect(listedIssueIds.has(entry.id), entry.id).toBe(true);
  });

  it("passes the personal guard and the Nation-name mask, probes included", () => {
    expect(contentProblems(table)).toEqual([]);
  });

  it("needs the full Nation-name list before any row, and no row hits it (G3)", () => {
    // D-171: the two rows of the example already public (D-158) stay while the
    // exact 575-name list is open (D-168); every other row waits for it.
    const waiting = table.entries.filter((e) => !G3_EXCEPTION.has(e.id));
    if (!waiting.length) return;
    const probe = loadNationProbe();
    expect(isFullProbe(probe)).toBe(true);
    for (const [path, value] of strings(table))
      expect(probeHit(value, probe), path).toBe(false);
  });

  it("gives every entry a plan that sends every lane automatically, within budget", () => {
    for (const entry of table.entries) {
      const plan = buildPlan(
        { kind: "example", label: entry.label },
        entrySearches(table, entry),
        { federal: [], live: LIVE_SOURCES },
      );
      expect(plan.lanes.length, entry.id).toBeLessThanOrEqual(
        AUTO_REQUEST_BUDGET,
      );
      for (const lane of plan.lanes) {
        expect(lane.auto, lane.id).toBe(true);
        expect(lane.skip, lane.id).toBeUndefined();
        expect(lookupReady(plan, lane), lane.id).toBe(true);
        expect(lane.name, lane.id).toBeUndefined();
      }
    }
  });
});

describe("the issue table checks", () => {
  it("accepts a well-formed synthetic issue and measure entry", () => {
    const file = withEntries([issueEntry(), measureEntry()]);
    expect(validate(file), JSON.stringify(validate.errors)).toBe(true);
    expect(contentProblems(file)).toEqual([]);
  });

  it.each([
    ["an extra field", { ...issueEntry(), law: "x" }],
    [
      "a reviewer other than the owner",
      issueEntry({ reviewerRole: "staff" as "owner" }),
    ],
    [
      "an unofficial host",
      issueEntry({ restsOn: [identifier({ url: "https://example.org/x" })] }),
    ],
    [
      "a sponsor group",
      issueEntry({ searches: [search({ group: "sponsor" })] }),
    ],
    [
      "a cites basis without cites",
      measureEntry({
        provisions: [
          {
            issue: "sample-issue",
            bill: "sample-bill",
            version: "Introduced in Senate",
            section: "101",
            heading: "Sample heading",
            url: "https://www.govinfo.gov/x",
            readOn: "2026-11-10",
            basis: "cites",
            reviewedOn: "2026-11-10",
          },
        ],
      }),
    ],
    [
      "a listed basis with cites",
      measureEntry({ provisions: [provision({ basis: "listed" as "cites" })] }),
    ],
    [
      "a people_use name with statedAt",
      issueEntry({ names: [name({ basis: "people_use" as "official" })] }),
    ],
  ])("rejects %s", (_description, bad) => {
    expect(validate(withEntries([bad]))).toBe(false);
  });
});
