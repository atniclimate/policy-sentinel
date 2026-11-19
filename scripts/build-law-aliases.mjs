#!/usr/bin/env node
// Builds law alias candidates from a saved copy of the official OLRC Popular
// Names table (D-142). It makes no network call and writes nothing inside the
// repository: the main session promotes rows to config/law-aliases.v1.json
// after the owner's review. No build, check or test script runs this one.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { compareCodeUnits } from "../src/core/canonical-json.mjs";
import { serializeJson, sha256Bytes } from "../src/pipeline/hashing.mjs";
import {
  ANCHOR_WORD_TITLES,
  aliasProblems,
  insideRepo,
} from "./build-vocab.mjs";
import {
  FULL_PROBE_ENTRIES,
  StageError,
  isFullProbe,
  loadNationProbe,
  probeHashHit,
} from "./demo-index/common.mjs";
import {
  TABLE_URL,
  buildAliasRows,
  outcomeCounts,
  parsePopularNames,
  releasePoints,
  reviewMarkdown,
} from "./demo-index/popular-names.mjs";
import { collapse } from "./demo-index/xml.mjs";

export const USAGE =
  "usage: node scripts/build-law-aliases.mjs --table <raw html> --wanted <names.txt, one per line> --out <folder outside the repository> --reviewed-on YYYY-MM-DD [--named-in <names.txt>] [--acronyms <rows.json>]";

/** Run the build. `deps` (for tests): log, probe. */
export function runBuildLawAliases(argv, deps = {}) {
  const log = deps.log ?? console.log;
  let values = {};
  try {
    ({ values } = parseArgs({
      args: argv,
      strict: true,
      options: {
        table: { type: "string" },
        wanted: { type: "string" },
        out: { type: "string" },
        "reviewed-on": { type: "string" },
        "named-in": { type: "string" },
        acronyms: { type: "string" },
      },
    }));
  } catch {
    // An unknown option gets the usage line below.
  }
  const reviewedOn = values["reviewed-on"] ?? "";
  if (
    !values.table ||
    !values.wanted ||
    !values.out ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn)
  ) {
    log(USAGE);
    return { exitCode: 2 };
  }
  const out = resolve(values.out);
  if (insideRepo(out)) {
    log("--out must be outside the repository");
    return { exitCode: 2 };
  }
  // G3: no alias row is built unless names are probed with the full list.
  const probe = deps.probe ?? loadNationProbe();
  if (!isFullProbe(probe)) {
    log(
      `the Nation-name probes hold ${probe.entryCount ?? 0} entries, not the full list of ${FULL_PROBE_ENTRIES}; nothing written`,
    );
    return { exitCode: 2 };
  }
  const tableBytes = readFileSync(resolve(values.table));
  const html = tableBytes.toString("utf8");
  const wanted = [
    ...new Set(
      readFileSync(resolve(values.wanted), "utf8")
        .split(/\r?\n/)
        .map(collapse)
        .filter(Boolean),
    ),
  ].sort(compareCodeUnits);

  let entries;
  let points;
  try {
    entries = parsePopularNames(html);
    points = releasePoints(html);
    if (points.length !== 1)
      throw new StageError(
        "normalize",
        `the table states ${points.length} release points, not one`,
      );
  } catch (error) {
    if (!(error instanceof StageError)) throw error;
    log(`the table could not be read: ${error.message}; nothing written`);
    return { exitCode: 1 };
  }
  // Named in by the owner (D-142): the closed title list of 2026-11-05, and
  // any exact official name in the --named-in file (one per line).
  const namedIn = [
    ...ANCHOR_WORD_TITLES,
    ...(values["named-in"]
      ? readFileSync(resolve(values["named-in"]), "utf8")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      : []),
  ];
  const { rows, review } = buildAliasRows(entries, wanted, {
    probe,
    reviewedOn,
    namedIn,
  });
  // Acronyms with the official wording that states each (--acronyms: a list of
  // { popularName, acronym, sourceUrl, text }); one for a law with no row is
  // counted, not carried. aliasProblems checks each wording below.
  const acronymRows = values.acronyms
    ? JSON.parse(readFileSync(resolve(values.acronyms), "utf8"))
    : [];
  let acronymsWithoutRow = 0;
  for (const { popularName, acronym, sourceUrl, text } of acronymRows) {
    const row = rows.find((r) => r.popularName === popularName);
    if (!row) acronymsWithoutRow += 1;
    else (row.acronyms ??= []).push({ acronym, sourceUrl, text });
  }
  const candidate = serializeJson({
    $schema: "../schemas/law-aliases.schema.v1.json",
    schemaVersion: "1.0.0",
    artifactType: "law-aliases",
    basis: "curated",
    sourceUrl: TABLE_URL,
    entries: rows,
  });
  // The checks the committed table must pass: schema, sizes, order, citations
  // and the Nation-name and personal-pattern checks on every string.
  const problems = aliasProblems(candidate, { names: probe.names });
  JSON.parse(candidate, (key, value) => {
    if (typeof value === "string" && probeHashHit(value, probe))
      problems.push(`${key}: Nation-name probe hit (G3)`);
    return value;
  });
  if (problems.length) {
    for (const problem of problems) log(problem);
    log("the candidate does not pass the alias table checks; nothing written");
    return { exitCode: 1 };
  }

  const sha256 = sha256Bytes(tableBytes);
  const outcomes = outcomeCounts(review);
  const summary = {
    sourceUrl: TABLE_URL,
    table: {
      sha256,
      bytes: tableBytes.length,
      releasePoint: points[0],
      entryCount: entries.length,
    },
    reviewedOn,
    wanted: wanted.length,
    rows: rows.length,
    acronyms: {
      carried: acronymRows.length - acronymsWithoutRow,
      withoutRow: acronymsWithoutRow,
    },
    candidateBytes: Buffer.byteLength(candidate, "utf8"),
    outcomes,
  };
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "wanted.txt"), `${wanted.join("\n")}\n`);
  writeFileSync(join(out, "law-aliases.candidate.json"), candidate);
  writeFileSync(
    join(out, "ALIAS-REVIEW.md"),
    reviewMarkdown(
      review,
      `Source: ${TABLE_URL}, release point ${points[0]}, ${entries.length} entries, sha256 ${sha256}. Rows marked approved by rule or named in by the owner are in law-aliases.candidate.json with reviewedOn ${reviewedOn}; no other row is.`,
    ),
  );
  writeFileSync(join(out, "summary.json"), serializeJson(summary));
  const count = (by) => Object.values(by).reduce((a, b) => a + b, 0);
  log(
    `${rows.length} rows: ${outcomes.approved} wanted names approved by rule, ${count(outcomes.namedIn)} named in by the owner, ${count(outcomes.flagged)} flagged, ${count(outcomes.noRow)} with no row, of ${wanted.length}; written to ${out}`,
  );
  return { exitCode: 0, summary };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = runBuildLawAliases(process.argv.slice(2)).exitCode;
