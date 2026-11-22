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

function readVolume(xml, requestedTitle) {
  const revised = new Set();
  const titles = new Set();
  const pts = [];
  const parts = [];
  let subpartAuthorityCount = 0;
  const root = collectSubtrees(
    xml,
    (name, _attrs, ancestors) =>
      ((name === "TITLENUM" || name === "REVISED") &&
        ancestors.length === 3 &&
        ancestors[0] === "CFRDOC" &&
        ancestors[1] === "FMTR" &&
        ancestors[2] === "TITLEPG") ||
      name === "PART" ||
      // A subtitle with no chapters lists its parts in its own contents (43 CFR subtitle A).
      (name === "TOC" && ["CHAPTER", "SUBTITLE"].includes(ancestors.at(-1))),
    (node) => {
      if (node.name === "TITLENUM") {
        const number = /^(?:Title\s+)?([1-9]\d?)$/i.exec(
          collapse(textOf(node)),
        );
        titles.add(number?.[1]);
      } else if (node.name === "REVISED") revised.add(collapse(textOf(node)));
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
        // The annual edition also prints "PT. 1001", "Pt.3100", "Pt 3140" and five-digit parts (43 CFR 10000).
        const head = collapse(textOf(ear));
        // An empty running head (43 CFR 3000): the part's own heading states the number, "PART 3000—...".
        const heading = direct.find((c) => c.name === "HD");
        const number = head
          ? /^Pt\.?\s*(\d{1,5}[a-z]?)$/i.exec(head)?.[1]
          : /^PART\s+(\d{1,5}[a-z]?)(?![\w.])/.exec(
              heading ? collapse(textOf(heading)) : "",
            )?.[1];
        if (!number)
          throw new StageError(
            "normalize",
            `a part number is not in the expected form: ${head.slice(0, 40) || "(empty running head)"}`,
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
  if (titles.size !== 1 || !titles.has(String(requestedTitle)))
    throw new StageError(
      "normalize",
      "the volume title page does not identify the requested CFR title",
    );
  if (revised.size !== 1)
    throw new StageError(
      "normalize",
      "the volume title page does not state one revision date",
    );
  return { revised: [...revised][0], pts, parts, subpartAuthorityCount };
}

/**
 * Build the shard for one title from its volumes ([{ volume, xml }]).
 * Record only the volumes read. The archive alone cannot establish whole-title coverage.
 */
export function buildCfrShard(volumeXml, { title, editionYear, names }) {
  const read = [];
  const volumes = [];
  let revisedAsOfText;
  for (const { volume, xml } of volumeXml) {
    const parsed = readVolume(xml, title);
    if (!parsed.revised.includes(String(editionYear)))
      throw new StageError(
        "normalize",
        `volume ${volume} does not state the requested edition year ${editionYear}`,
      );
    if (revisedAsOfText !== undefined && parsed.revised !== revisedAsOfText)
      throw new StageError(
        "normalize",
        `volume ${volume} states a different revision date`,
      );
    revisedAsOfText = parsed.revised;
    read.push(parsed);
    volumes.push(volume);
  }
  volumes.sort((a, b) => a - b);
  if (new Set(volumes).size !== volumes.length)
    throw new StageError(
      "validation",
      "the title archive repeats a volume number",
    );
  if (!revisedAsOfText)
    throw new StageError(
      "normalize",
      "the volumes do not state one revision date",
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
  const firstLines = new Map();
  for (const p of read.flatMap((v) => v.parts)) {
    if (byPart.has(p.part)) {
      // A part continued into another volume repeats its number, without its
      // lines or with the same lines again (50 CFR 17). Different wording fails.
      const first = firstLines.get(p.part);
      if (
        (p.authorityText && p.authorityText !== first.authorityText) ||
        (p.sourceText && p.sourceText !== first.sourceText)
      )
        throw new StageError(
          "normalize",
          `part ${p.part} appears twice with different lines`,
        );
      report.continuedParts.push(p.part);
      continue;
    }
    firstLines.set(p.part, p);
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
