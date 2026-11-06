// OLRC USLM title XML to a source-credit shard: per section the status
// attribute, the sourceCredit wording and refs, and for a transferred section
// the codification note's wording and its /us/usc targets.
import { compareCodeUnits } from "../../src/core/canonical-json.mjs";
import { parseUslmHref } from "../../src/demo/cite-patterns.ts";
import { SCHEMA_REF, StageError, wordingProblem } from "./common.mjs";
import {
  collapse,
  collectSubtrees,
  descendants,
  elements,
  isElement,
  textOf,
} from "./xml.mjs";

const STATUSES = new Set(["transferred", "repealed", "omitted", "reserved"]);
const SECTION_ID = /^\/us\/usc\/t\d{1,2}[a-z]?\/s[^/]+$/;
// A section quoted inside a note or another element is not a Code section.
const NOT_CODE = new Set(["quotedContent", "note", "notes", "sourceCredit"]);
const RANGES = {
  pl: (c) =>
    c.congress >= 1 && c.congress <= 200 && c.number >= 1 && c.number <= 9999,
  stat: (c) =>
    c.volume >= 1 && c.volume <= 200 && c.page >= 1 && c.page <= 99999,
  act: () => true,
};

/** Credits from sourceCredit refs (basis source_field), document order. */
function readCredits(node) {
  const credits = [];
  let unmapped = 0;
  let last = null;
  for (const el of descendants(node)) {
    if (el.name === "date") {
      // A date printed after a public law is that law's date.
      if (
        last?.kind === "pl" &&
        !last.date &&
        /^\d{4}-\d{2}-\d{2}$/.test(el.attrs.date ?? "")
      )
        last.date = el.attrs.date;
      last = null;
      continue;
    }
    if (el.name !== "ref") continue;
    const href = el.attrs.href ?? "";
    const parsed = parseUslmHref(href);
    if (!parsed || !RANGES[parsed.kind]?.(parsed)) {
      unmapped += 1;
      last = null;
      continue;
    }
    // The printed ref text replaces the href; offsets stay out of the shard.
    const credit = {
      ...parsed,
      text: collapse(textOf(el)) || href,
      basis: "source_field",
    };
    delete credit.start;
    delete credit.end;
    credits.push(credit);
    last = credit;
  }
  return { credits, unmapped };
}

function readSection(node, names, report) {
  const identifier = node.attrs.identifier;
  const status = node.attrs.status ?? null;
  if (status !== null && !STATUSES.has(status))
    throw new StageError(
      "normalize",
      `section status ${status} is not in the closed list`,
    );
  const credit = elements(node, "sourceCredit")[0];
  const creditText = credit ? collapse(textOf(credit)) || null : null;
  if (creditText && wordingProblem(creditText, names))
    // No omission flag exists for credit wording, so the file fails closed.
    throw new StageError(
      "validation",
      `source credit of ${identifier} cannot be carried (${wordingProblem(creditText, names)})`,
    );
  const { credits, unmapped } = credit
    ? readCredits(credit)
    : { credits: [], unmapped: 0 };
  let reclassifiedAs = null;
  if (status === "transferred") {
    const note = elements(node, "notes")
      .flatMap((n) => elements(n, "note"))
      .find((n) => n.attrs.topic === "codification");
    const targets = [];
    if (note)
      for (const el of descendants(note)) {
        const href = el.attrs.href ?? "";
        if (
          el.name === "ref" &&
          SECTION_ID.test(href) &&
          !targets.includes(href)
        )
          targets.push(href);
      }
    if (!note || targets.length === 0)
      throw new StageError(
        "normalize",
        `transferred section ${identifier} names no target`,
      );
    const text =
      collapse(
        note.children
          .filter((c) => !isElement(c) || c.name !== "heading")
          .map(textOf)
          .join(" "),
      ) || null;
    const problem = text && wordingProblem(text, names);
    if (problem)
      report.omitted.push({ identifier, field: "noteText", reason: problem });
    reclassifiedAs = {
      targets,
      noteText: problem ? null : text,
      noteTextOmitted: Boolean(problem),
    };
  }
  report.statusCounts[status ?? "none"] =
    (report.statusCounts[status ?? "none"] ?? 0) + 1;
  return {
    entry: { identifier, status, creditText, credits, reclassifiedAs },
    unmapped,
  };
}

/** Build the shard for one whole title. Throws StageError on a problem. */
export function buildUslmShard(xml, { title, releasePoint, names }) {
  const report = { omitted: [], statusCounts: {}, unmappedRefCount: 0 };
  const entries = new Map();
  let publicationName = null;
  let currentThroughText = null;
  let unmappedRefCount = 0;
  const root = collectSubtrees(
    xml,
    (name, attrs, ancestors) =>
      (name === "docPublicationName" && ancestors.at(-1) === "meta") ||
      (name === "note" && ancestors.at(-1) === "title") ||
      (name === "section" &&
        SECTION_ID.test(attrs.identifier ?? "") &&
        !ancestors.some((a) => NOT_CODE.has(a))),
    (node) => {
      if (node.name === "docPublicationName")
        publicationName = collapse(textOf(node));
      else if (node.name === "note") {
        const text = collapse(textOf(node));
        if (!currentThroughText && /^Current through /.test(text))
          currentThroughText = text;
      } else {
        const { entry, unmapped } = readSection(node, names, report);
        if (entries.has(entry.identifier))
          throw new StageError(
            "normalize",
            `section ${entry.identifier} appears twice`,
          );
        entries.set(entry.identifier, entry);
        unmappedRefCount += unmapped;
      }
    },
  );
  if (root?.name !== "uscDoc" || root.attrs.identifier !== `/us/usc/t${title}`)
    throw new StageError(
      "fetch",
      "the download is not the requested USLM title",
    );
  if (
    publicationName !== `Online@${releasePoint}` ||
    currentThroughText !== `Current through ${releasePoint}`
  )
    throw new StageError(
      "normalize",
      "the title does not state the requested release point",
    );
  report.unmappedRefCount = unmappedRefCount;
  const shard = {
    $schema: SCHEMA_REF,
    schemaVersion: "1.0.0",
    artifactType: "usc-source-credit-shard",
    title,
    chapters: null,
    releasePoint,
    publicationName,
    currentThroughText,
    unmappedRefCount,
    entries: [...entries.values()].sort((a, b) =>
      compareCodeUnits(a.identifier, b.identifier),
    ),
  };
  return { shard, report };
}
