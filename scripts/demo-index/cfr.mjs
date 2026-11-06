// CFR annual edition (GovInfo bulk XML) to a part authority shard. Only the
// part-level AUTH and SOURCE wording, the part number, the edition's revision
// wording and the chapter tables of contents (for the count identity D1).
import { findCitations } from "../../src/demo/cite-patterns.ts";
import {
  SCHEMA_REF,
  StageError,
  comparePart,
  wordingProblem,
} from "./common.mjs";
import {
  collapse,
  collectSubtrees,
  elements,
  descendants,
  textOf,
} from "./xml.mjs";

const RANGES = {
  usc: (c) => c.title >= 1 && c.title <= 54 && c.section.length <= 24,
  pl: (c) => c.congress <= 200 && c.number >= 1 && c.number <= 9999,
  stat: (c) => c.volume <= 200 && c.page >= 1 && c.page <= 99999,
  fr: (c) => c.volume <= 200 && c.page >= 1 && c.page <= 99999,
};
const FR_DATE = /^,\s*([A-Z][a-z]{2,8}\.?\s\d{1,2},\s\d{4})/;

/**
 * Citations of the kinds a shard carries, source order, basis
 * source_text_parsed. Returns the kept citations and how many were dropped
 * because a number lies outside the schema's range.
 */
export function shardCitations(text, kinds) {
  const kept = [];
  let dropped = 0;
  for (const c of findCitations(text)) {
    if (!kinds.includes(c.kind)) continue;
    if (!RANGES[c.kind](c)) {
      dropped += 1;
      continue;
    }
    // Offsets stay out of the shard (index-types: no start or end).
    const out = { ...c, basis: "source_text_parsed" };
    delete out.start;
    delete out.end;
    if (c.kind === "fr") {
      const date = FR_DATE.exec(text.slice(c.end));
      if (date) out.dateText = date[1];
    }
    kept.push(out);
  }
  return { kept, dropped };
}

/** The P wording of a part-level AUTH or SOURCE element, tags stripped. */
const wording = (node) =>
  collapse(elements(node, "P").map(textOf).join(" ")) || null;

function readVolume(xml) {
  const revised = [];
  const pts = [];
  const parts = [];
  let subpartAuthorityCount = 0;
  const root = collectSubtrees(
    xml,
    (name, _attrs, ancestors) =>
      name === "REVISED" ||
      name === "PART" ||
      (name === "TOC" && ancestors.at(-1) === "CHAPTER"),
    (node) => {
      if (node.name === "REVISED") revised.push(collapse(textOf(node)));
      else if (node.name === "TOC") {
        for (const list of descendants(node)) {
          if (list.name !== "CHAPTI") continue;
          const items = elements(list);
          items.forEach((item, i) => {
            if (item.name === "PT")
              pts.push({
                text: collapse(textOf(item)),
                reserved: items[i + 1]?.name === "RESERVED",
              });
          });
        }
      } else {
        const direct = elements(node);
        const ear = direct.find((c) => c.name === "EAR");
        const auth = direct.filter((c) => c.name === "AUTH");
        const source = direct.filter((c) => c.name === "SOURCE");
        const nested = [...descendants(node)].filter((c) => c.name === "AUTH");
        subpartAuthorityCount += nested.length - auth.length;
        if (!ear) {
          if (!direct.some((c) => c.name === "RESERVED"))
            throw new StageError(
              "normalize",
              "a part has neither a number nor a reserved mark",
            );
          return;
        }
        const number = /^Pt\.\s+(\d{1,4}[a-z]?)$/.exec(
          collapse(textOf(ear)),
        )?.[1];
        if (!number)
          throw new StageError(
            "normalize",
            "a part number is not in the expected form",
          );
        if (auth.length > 1 || source.length > 1)
          throw new StageError(
            "normalize",
            `part ${number} has more than one part-level line`,
          );
        parts.push({
          part: number,
          authorityText: auth[0] ? wording(auth[0]) : null,
          sourceText: source[0] ? wording(source[0]) : null,
        });
      }
    },
  );
  if (root?.name !== "CFRDOC")
    throw new StageError("fetch", "a volume is not CFR XML");
  return { revised: revised[0] ?? null, pts, parts, subpartAuthorityCount };
}

/**
 * Build the shard for one title from its volumes ([{ volume, xml }]).
 * `volumes` is null for the whole title. Throws StageError on a structure
 * problem (normalize) or a failed count identity (validation).
 */
export function buildCfrShard(
  volumeXml,
  { title, editionYear, volumes, names },
) {
  const read = volumeXml.map(({ xml }) => readVolume(xml));
  const revisions = new Set(read.map((v) => v.revised));
  if (revisions.size !== 1 || !read[0]?.revised)
    throw new StageError(
      "normalize",
      "the volumes do not state one revision date",
    );
  const revisedAsOfText = read[0].revised;
  if (!revisedAsOfText.includes(String(editionYear)))
    throw new StageError(
      "normalize",
      "the revision wording does not name the edition year",
    );

  const pts = new Map();
  for (const pt of read.flatMap((v) => v.pts)) {
    const prior = pts.get(pt.text);
    if (prior && prior.reserved !== pt.reserved)
      throw new StageError(
        "normalize",
        `table of contents disagrees on part ${pt.text}`,
      );
    pts.set(pt.text, pt);
  }
  const partsExpected = pts.size;
  const partsReserved = [...pts.values()].filter((p) => p.reserved).length;

  const report = { omitted: [], droppedCitations: 0, continuedParts: [] };
  const byPart = new Map();
  for (const p of read.flatMap((v) => v.parts)) {
    if (byPart.has(p.part)) {
      // A part continued into the next volume repeats its number without its lines.
      if (p.authorityText || p.sourceText)
        throw new StageError(
          "normalize",
          `part ${p.part} appears twice with its own lines`,
        );
      report.continuedParts.push(p.part);
      continue;
    }
    if (!pts.has(p.part) || pts.get(p.part).reserved)
      throw new StageError("validation", `part ${p.part} is not a listed part`);
    const omitted = [];
    const entry = { title, part: p.part, omitted };
    for (const field of ["authorityText", "sourceText"]) {
      const text = p[field];
      const problem = text && wordingProblem(text, names);
      entry[field] = problem ? null : text;
      if (problem) {
        omitted.push(field);
        report.omitted.push({ part: p.part, field, reason: problem });
      }
    }
    const auth = p.authorityText
      ? shardCitations(p.authorityText, ["usc", "pl", "stat", "fr"])
      : { kept: [], dropped: 0 };
    const src = p.sourceText
      ? shardCitations(p.sourceText, ["fr"])
      : { kept: [], dropped: 0 };
    entry.authorityCitations = auth.kept;
    entry.sourceCitations = src.kept;
    report.droppedCitations += auth.dropped + src.dropped;
    byPart.set(p.part, entry);
  }
  const entries = [...byPart.values()].sort((a, b) =>
    comparePart(a.part, b.part),
  );
  // D1: no shard unless every listed part was read.
  if (entries.length !== partsExpected - partsReserved)
    throw new StageError(
      "validation",
      `count identity fails: ${entries.length} parts read, ${partsExpected} listed, ${partsReserved} reserved`,
    );
  const shard = {
    $schema: SCHEMA_REF,
    schemaVersion: "1.0.0",
    artifactType: "cfr-authority-shard",
    title,
    editionYear,
    revisedAsOfText,
    volumes,
    partsExpected,
    partsReserved,
    subpartAuthorityCount: read.reduce(
      (n, v) => n + v.subpartAuthorityCount,
      0,
    ),
    entries,
  };
  return { shard, report };
}
