// The OLRC Popular Names table (one saved HTML page) to law alias rows and the
// owner's review table (D-142). A row carries only what the table prints: the
// official name and its U.S.C. citations. Pure: no network, no writes.
import { compareCodeUnits } from "../../src/core/canonical-json.mjs";
import { findCitations, parseCitation } from "../../src/demo/cite-patterns.ts";
import { StageError, wordingProblem } from "./common.mjs";
import { collapse } from "./xml.mjs";

export const TABLE_URL =
  "https://uscode.house.gov/popularnames/popularnames.html";

const ENTRY =
  /<div id='([^']*)' class='popular-name-table-entry' release-point='([^']*)' item='(\d+)'>([\s\S]*?)<\/div>/g;
const NAME = /<p class='popular-name'>([\s\S]*?)<\/p>/;
const LINE =
  /<p class='popular-name-information' content-type='([^']*)'([^>]*)>([\s\S]*?)<\/p>/g;
const LINE_TYPES = [
  "cite",
  "short-title-ref",
  "also-known-as",
  "see",
  "renamed",
];
const USC_HREF = /href="\/us\/usc\/t(\d+)\/s([^/"]+)\/"/g;
const ENTITIES = { amp: "&", apos: "'", quot: '"', lt: "<", gt: ">" };

/** Official wording: tags removed, entities decoded, whitespace collapsed. */
function wording(html) {
  return collapse(
    html.replace(/<[^>]*>/g, "").replace(/&(#?\w+);/g, (whole, code) => {
      if (/^#\d+$/.test(code))
        return String.fromCodePoint(Number(code.slice(1)));
      if (Object.hasOwn(ENTITIES, code)) return ENTITIES[code];
      throw new StageError(
        "normalize",
        `the table uses an entity this parser does not know: ${whole}`,
      );
    }),
  );
}

/**
 * Every entry of the table as { id, item, name, lines }. A line is
 * { type, text, uscKey, usc }: its content-type, its wording, its usckey
 * attribute as given (or null) and the title and section of each U.S.C. link
 * in it. Throws StageError("normalize") on anything it cannot read, so a
 * changed table stops the build instead of losing rows.
 */
export function parsePopularNames(html) {
  const entries = [];
  for (const [, id, , item, body] of html.matchAll(ENTRY)) {
    const name = wording(NAME.exec(body)?.[1] ?? "");
    if (!name)
      throw new StageError("normalize", `table entry ${item} has no name`);
    const lines = [...body.matchAll(LINE)].map(([, type, attrs, inner]) => {
      if (!LINE_TYPES.includes(type))
        throw new StageError(
          "normalize",
          `table entry ${item} has a line of an unknown kind`,
        );
      return {
        type,
        text: wording(inner),
        uscKey: /\busckey='([^']*)'/.exec(attrs)?.[1] ?? null,
        usc: [...inner.matchAll(USC_HREF)].map(([, title, section]) => ({
          title: Number(title),
          section,
        })),
      };
    });
    if (body.split("<p ").length - 2 !== lines.length)
      throw new StageError(
        "normalize",
        `table entry ${item} has a paragraph this parser cannot read`,
      );
    entries.push({ id, item: Number(item), name, lines });
  }
  if (html.split("popular-name-table-entry").length - 1 !== entries.length)
    throw new StageError(
      "normalize",
      "the table holds an entry this parser cannot read",
    );
  return entries;
}

/** The distinct release points the entries state, sorted. */
export function releasePoints(html) {
  return [...new Set([...html.matchAll(ENTRY)].map((m) => m[2]))].sort(
    compareCodeUnits,
  );
}

const NO_ENTRY = "no official entry by this name";
const SEVERAL = "several official entries match";
const SHARED_ADDRESS = "the row address is shared by another official row";
const SEE_UNRESOLVED = "the cross-reference names no single official row";
const SEE_CHAIN = "the row it names is itself a cross-reference";
const NO_USC = "no U.S.C. citation";
const UNPARSED = "a citation the pattern cannot parse";
const TOO_MANY = "more than 8 citations";

/**
 * The contents of each top-level parenthetical that names the Code. One the
 * table leaves open runs to the end of the line.
 */
function codeParentheticals(text) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "(") {
      if (depth === 0) start = i + 1;
      depth += 1;
    } else if (text[i] === ")" && depth > 0) {
      depth -= 1;
      if (depth === 0) out.push(text.slice(start, i));
    }
  }
  if (depth > 0) out.push(text.slice(start));
  return out.filter((region) => /U\.\s?S\.\s?C/.test(region));
}

/**
 * The citations of one printed region, or null unless the region is nothing
 * but U.S.C. citations that each parse alone and fit the alias schema. So
 * "16 U.S.C. 1431 et seq., 1447 et seq." and "42 U.S.C. 201 notes" are null.
 */
function regionCitations(region) {
  const citations = [];
  let rest = "";
  let at = 0;
  for (const c of findCitations(region)) {
    if (
      c.kind !== "usc" ||
      parseCitation(c.text)?.kind !== "usc" ||
      c.title < 1 ||
      c.title > 54 ||
      c.section.length > 24
    )
      return null;
    rest += region.slice(at, c.start);
    at = c.end;
    citations.push({
      kind: "usc",
      text: c.text,
      basis: "curated",
      pattern: c.pattern,
      title: c.title,
      section: c.section,
      etSeq: c.etSeq,
      ...(c.note ? { note: true } : {}),
    });
  }
  rest += region.slice(at);
  return citations.length && /^[\s,;]*$/.test(rest) ? citations : null;
}

/**
 * An entry's citations: the parentheticals of its cite lines, else its
 * short-title lines. `printed` is what the table prints, for the review table.
 */
function ownCitations(entry) {
  const lines = (type) => entry.lines.filter((l) => l.type === type);
  let printed = lines("cite").flatMap((l) => codeParentheticals(l.text));
  if (!printed.length)
    printed = lines("short-title-ref").map((l) =>
      l.text.replace(/^Short title, (?:see )?/i, ""),
    );
  if (!printed.length)
    return { printed, reason: NO_USC, detail: lines("renamed")[0]?.text };
  const citations = new Map();
  for (const region of printed) {
    const found = regionCitations(region);
    if (!found) return { printed, reason: UNPARSED };
    for (const c of found) citations.set(c.text, c);
  }
  printed = [...citations.keys()];
  if (citations.size > 8) return { printed, reason: TOO_MANY };
  return { printed, citations: [...citations.values()] };
}

/** A see-only entry takes the citations of the one entry it names; one hop. */
function citationsFor(entry, byName) {
  const [only] = entry.lines;
  if (entry.lines.length !== 1 || only.type !== "see")
    return ownCitations(entry);
  const named = byName.get(only.text.replace(/^See /, "")) ?? [];
  if (named.length !== 1)
    return { printed: [], reason: SEE_UNRESOLVED, detail: only.text };
  if (named[0].lines.some((l) => l.type === "see"))
    return { printed: [], reason: SEE_CHAIN, detail: only.text };
  return {
    ...ownCitations(named[0]),
    detail: `citations from the row it names, ${named[0].name}`,
  };
}

const fold = (text) => text.toLowerCase();
const withoutYear = (text) => text.replace(/ of \d{4}$/, "");
const words = (text) => fold(text).match(/[a-z0-9]+/g) ?? [];

function group(entries, key) {
  const map = new Map();
  for (const e of entries) map.set(key(e), [...(map.get(key(e)) ?? []), e]);
  return map;
}

/**
 * One review line for each wanted name, and the approved rows sorted by
 * popularName in code-unit order. A wanted name selects the one official
 * entry of the same name without case; when there is none, the one entry
 * whose name is the same after a trailing " of YYYY" is removed from either.
 * `probe` is the Nation-name probe (or a plain name list) for wordingProblem.
 * `namedIn` holds exact official names the owner named in despite a flag.
 */
export function buildAliasRows(
  entries,
  wanted,
  { probe, reviewedOn, namedIn = [] },
) {
  const byName = group(entries, (e) => e.name);
  const byFold = group(entries, (e) => fold(e.name));
  const byYearless = group(entries, (e) => withoutYear(fold(e.name)));
  const byId = group(entries, (e) => e.id);
  const holding = (name) => {
    const need = words(name);
    return entries
      .filter((e) => {
        const have = new Set(words(e.name));
        return need.length && need.every((w) => have.has(w));
      })
      .map((e) => e.name)
      .sort((a, b) => a.length - b.length || compareCodeUnits(a, b));
  };
  const rows = new Map();
  const review = wanted.map((name) => {
    const w = fold(name);
    const exact = byFold.get(w) ?? [];
    const acrossYear = [
      ...(byYearless.get(w) ?? []),
      ...(withoutYear(w) === w ? [] : (byFold.get(withoutYear(w)) ?? [])),
    ].filter((e) => !exact.includes(e));
    const matches = exact.length ? exact : acrossYear;
    const line = {
      wanted: name,
      outcome: "no_row",
      reason: null,
      detail: null,
      officialName: null,
      citations: [],
      olrcUrl: null,
      nearest: [],
    };
    if (matches.length !== 1) {
      line.reason = matches.length ? SEVERAL : NO_ENTRY;
      line.nearest = [
        ...new Set([...matches.map((e) => e.name), ...holding(name)]),
      ].slice(0, 5);
      return line;
    }
    const [entry] = matches;
    line.officialName = entry.name;
    line.olrcUrl = `${TABLE_URL}#${entry.id}`;
    // An exact name wins over another year's entry; the reviewer still sees it.
    if (exact.length) line.nearest = acrossYear.map((e) => e.name).slice(0, 5);
    if (byId.get(entry.id).length > 1) {
      line.reason = SHARED_ADDRESS;
      return line;
    }
    const got = citationsFor(entry, byName);
    line.citations = got.printed;
    line.detail = got.detail ?? null;
    if (got.reason) {
      line.reason = got.reason;
      return line;
    }
    const flags = [
      wordingProblem(entry.name, probe),
      /\btreat(?:y|ies)\b/i.test(entry.name) ? "treaty_word" : null,
    ].filter(Boolean);
    // A flagged name enters only when the owner named that exact official
    // name in (D-142), and the review table says so with its flag; the table
    // checks (aliasProblems) still run on the whole candidate.
    if (flags.length) {
      line.reason = flags.join(", ");
      line.outcome = namedIn.includes(entry.name) ? "named_in" : "flagged";
      if (line.outcome === "flagged") return line;
    } else line.outcome = "approved";
    rows.set(entry.name, {
      popularName: entry.name,
      citations: got.citations,
      olrcUrl: line.olrcUrl,
      reviewedOn,
      reviewerRole: "owner",
    });
    return line;
  });
  return {
    rows: [...rows.values()].sort((a, b) =>
      compareCodeUnits(a.popularName, b.popularName),
    ),
    review,
  };
}

/** Wanted names by outcome; named in, flagged and noRow are counted by reason. */
export function outcomeCounts(review) {
  const counts = { approved: 0, namedIn: {}, flagged: {}, noRow: {} };
  for (const r of review) {
    if (r.outcome === "approved") counts.approved += 1;
    else {
      const by =
        r.outcome === "named_in"
          ? counts.namedIn
          : r.outcome === "flagged"
            ? counts.flagged
            : counts.noRow;
      by[r.reason] = (by[r.reason] ?? 0) + 1;
    }
  }
  return counts;
}

/** The owner's review table: one line for each wanted name. */
export function reviewMarkdown(review, source = "") {
  const outcome = (r) =>
    (r.outcome === "approved"
      ? `approved by rule${r.detail ? `; ${r.detail}` : ""}`
      : `${{ named_in: "named in by the owner despite the flag", flagged: "flagged" }[r.outcome] ?? "no row"}: ${r.reason}${r.detail ? ` (${r.detail})` : ""}`) +
    (r.nearest.length
      ? `; nearest official names: ${r.nearest.join("; ")}`
      : "");
  const cell = (text) => text.replaceAll("|", "\\|");
  return [
    "# Law alias rows from the OLRC Popular Names table: review",
    "",
    ...(source ? [source, ""] : []),
    "| # | Wanted name | Official name | Citations as printed | Official row address | Outcome |",
    "| - | - | - | - | - | - |",
    ...review.map(
      (r, i) =>
        `| ${i + 1} | ${[r.wanted, r.officialName ?? "", r.citations.join("; "), r.olrcUrl ?? "", outcome(r)].map(cell).join(" | ")} |`,
    ),
    "",
  ].join("\n");
}
