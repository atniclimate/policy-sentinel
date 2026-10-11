import { atniReferences, ieeeReference, SOURCE_LABELS } from "./citations";
import { COPY } from "./copy";
import type { DataActors, reportEntries } from "./report-state";

/**
 * One document model for the PDF and the print view, so both say the same
 * thing in the same order. All wording comes from COPY; titles, quotes and
 * identifiers pass through as the source wrote them.
 */
export type DocBlock =
  | {
      readonly kind:
        | "eyebrow"
        | "title"
        | "lede"
        | "h2"
        | "h3"
        | "p"
        | "small"
        | "quote"
        | "assessment"
        | "note";
      readonly text: string;
    }
  | {
      readonly kind: "field";
      readonly label: string;
      readonly value: string;
      readonly mono?: boolean;
    }
  | { readonly kind: "ref"; readonly number: number; readonly text: string }
  | { readonly kind: "rule" }
  | { readonly kind: "break" }; // start a new page

export interface DocModel {
  /** Document metadata title: the title and the generated date. */
  readonly title: string;
  readonly runningHead: string;
  readonly footer: string;
  readonly blocks: readonly DocBlock[];
}

export interface DocInput {
  readonly version: string;
  readonly generatedAt: Date;
  readonly entries: ReturnType<typeof reportEntries>;
  readonly actors: DataActors;
}

export function buildDocument(input: DocInput): DocModel {
  const { version, entries } = input;
  const generated = input.generatedAt.toISOString().slice(0, 10);
  const L = COPY.docLabels;
  const A = COPY.actorLabels;
  const blocks: DocBlock[] = [];
  // A field with no value is left out; callers pass COPY.notRecorded to state a gap.
  const field = (label: string, value: string | null, mono = false) => {
    if (value)
      blocks.push({ kind: "field", label, value, ...(mono && { mono }) });
  };
  const actor = (name: keyof DataActors) =>
    input.actors[name].trim() || COPY.notRecorded;
  const source = (sourceId: string) => SOURCE_LABELS[sourceId] ?? sourceId;

  // 1. Cover
  blocks.push(
    { kind: "eyebrow", text: COPY.docEyebrow(version) },
    { kind: "title", text: COPY.docTitle },
    { kind: "lede", text: COPY.pdfIntro },
  );
  // A blank name is stated, so a role alone never reads as the preparer.
  const role = input.actors.role.trim();
  field(L.preparedBy, role ? `${actor("name")}, ${role}` : actor("name"));
  field(A.organization, actor("organization"));
  field(A.sharingWith, actor("sharingWith"));
  field(A.purpose, actor("purpose"));
  field(L.generated, generated);
  blocks.push(
    // A reader of the cover alone is told the entries above are typed, not verified.
    { kind: "small", text: COPY.docActorsIntro },
    { kind: "h3", text: COPY.limitsTitle },
    { kind: "p", text: COPY.limits(version) },
    { kind: "h3", text: COPY.docContentsTitle },
  );
  if (entries.length === 0) blocks.push({ kind: "p", text: COPY.docEmpty });
  entries.forEach((entry, index) => {
    const n = index + 1;
    blocks.push({ kind: "p", text: `${n}. ${entry.citation.title} [${n}]` });
  });

  // 2. One section per policy
  entries.forEach((entry, index) => {
    const n = index + 1;
    const c = entry.citation;
    blocks.push({ kind: "break" }, { kind: "h2", text: `${n}. ${c.title}` });
    field(L.identifier, c.identifier, true);
    field(L.source, source(c.sourceId));
    field(L.issuingBody, c.issuingBody);
    field(L.type, c.kind);
    field(L.date, c.date ?? COPY.docDateNotStated);
    field(L.officialUrl, c.officialUrl, true);
    blocks.push(
      { kind: "h3", text: COPY.pdfNotesLabel },
      { kind: "note", text: entry.note.trim() || COPY.pdfNoNote },
    );
    for (const { issue, note } of entry.issues) {
      blocks.push(
        { kind: "h3", text: issue.label },
        issue.type === "consultation_absent"
          ? { kind: "assessment", text: COPY.docAssessment(issue.quote) }
          : { kind: "quote", text: issue.quote },
        { kind: "small", text: `${L.where}: ${issue.locator}` },
        { kind: "small", text: `${L.limit}: ${issue.limits}` },
        { kind: "small", text: `${L.rule}: ${issue.rule}` },
        { kind: "small", text: `${L.check}: ${issue.check}` },
      );
      if (note.trim())
        blocks.push({ kind: "note", text: COPY.docPassageNote(note.trim()) });
    }
    if (entry.issues.length === 0)
      blocks.push({
        kind: "small",
        text: entry.receipt ? COPY.pdfNoPassages : COPY.pdfTextNotRead,
      });
    const { receipt, engine } = entry;
    blocks.push({ kind: "h3", text: COPY.docProvenanceTitle });
    field(L.reference, `[${n}]`);
    field(L.metadataRetrieved, c.retrievedAt);
    field(L.textReadFrom, receipt?.textUrl ?? COPY.notRecorded);
    field(L.textRetrieved, receipt?.retrievedAt ?? COPY.notRecorded);
    field(
      L.fingerprint,
      receipt
        ? COPY.docFingerprint(receipt.sha256, receipt.bytes)
        : COPY.notRecorded,
      Boolean(receipt),
    );
    if (engine) {
      field(L.extractor, `${engine.parser} ${engine.parserVersion}`);
      field(L.parserConfig, engine.parserConfigDigest, true);
      field(L.demoRules, engine.rulesVersion);
    }
    for (const alternate of entry.alternates)
      field(
        L.alsoListedBy,
        `${source(alternate.sourceId)}: ${alternate.officialUrl}`,
      );
  });

  // 3. Data actors and the software actor
  blocks.push(
    { kind: "break" },
    { kind: "h2", text: COPY.docActorsTitle },
    { kind: "p", text: COPY.docActorsIntro },
  );
  field(L.preparedBy, actor("name"));
  field(A.role, actor("role"));
  field(A.organization, actor("organization"));
  field(A.sharingWith, actor("sharingWith"));
  field(A.purpose, actor("purpose"));
  blocks.push({ kind: "h3", text: COPY.docSoftwareTitle });
  field(L.tool, COPY.docTool(version));
  field(L.responsible, actor("name"));
  field(
    L.sourcesRead,
    [...new Set(entries.map((entry) => source(entry.citation.sourceId)))].join(
      ", ",
    ),
  );

  // 4. References: the policies in list order, then the ATNI references
  blocks.push({ kind: "h2", text: COPY.docReferencesTitle });
  [
    ...entries.map((entry) => ieeeReference(entry.citation)),
    ...atniReferences(version),
  ].forEach((text, index) =>
    blocks.push({ kind: "ref", number: index + 1, text }),
  );

  // 5. Provenance and sovereignty notes
  blocks.push({ kind: "h2", text: COPY.docSovereigntyTitle });
  for (const text of COPY.docSovereignty) blocks.push({ kind: "p", text });

  return {
    title: `${COPY.docTitle}, ${generated}`,
    runningHead: COPY.docTitle,
    footer: COPY.limitsShort(version),
    blocks,
  };
}
