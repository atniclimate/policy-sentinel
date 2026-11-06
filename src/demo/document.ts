import { atniReferences, ieeeReference, SOURCE_LABELS } from "./citations";
import { COPY } from "./copy";
import { briefing as B } from "./copy/briefing";
import { chain as CH } from "./copy/chain.ts";
import { grantsAuthority as GA } from "./copy/grants-authority.ts";
import type { GrantsDetailResponse } from "./grants-authority.ts";
import { LINK_NOTICES } from "./link-labels.ts";
import type { ChainRow, ChainSection } from "./links.ts";
import { localDay } from "./follow";
import type { FollowCheck, Followed } from "./follow";
import type { ExportTemplate } from "./mode";
import type { DataActors, reportEntries } from "./report-state";
import { cfrQuery } from "./search-contract";
import type { DemoCitation } from "./types";
import { keyOf } from "./validation";

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

/** One cited entry as an export carries it. */
export type DocEntry = ReturnType<typeof reportEntries>[number] & {
  /** The record's chain rows the page holds; absent leaves the section out. */
  readonly chain?: readonly ChainRow[];
  /** A Grants.gov opportunity record read this session. */
  readonly grants?: GrantsDetailResponse;
};

export interface DocInput {
  readonly version: string;
  readonly generatedAt: Date;
  readonly entries: readonly DocEntry[];
  readonly actors: DataActors;
  /** Cited Policies unless "briefing" (src/demo/mode.ts). */
  readonly template?: ExportTemplate;
  /** Followed items for the Briefing's changes section; ignored by Cited Policies. */
  readonly checks?: readonly BriefingCheck[];
}

/** One followed item as the Briefing reports it. */
export interface BriefingCheck {
  readonly item: Followed;
  /** This session's Check for new result; absent when it was not checked. */
  readonly check?: FollowCheck;
  /** False when the followed record no longer appears in its source's answer. */
  readonly listed?: false;
  /** The source's own data-as-of wording, when it states one. */
  readonly dataAsOf?: string | null;
}

export type TrackingState =
  "new" | "unchanged" | "not_checked" | "unavailable" | "no_longer_listed";

/** The five tracking states (design T1.6), kept apart: a failure is never "nothing new". */
export function trackingState(entry: BriefingCheck): TrackingState {
  const { check } = entry;
  if (check?.state === "unavailable") return "unavailable";
  if (check?.state !== "checked") return "not_checked";
  if (entry.listed === false) return "no_longer_listed";
  return check.fresh.length ? "new" : "unchanged";
}

const CHAIN_SECTIONS: readonly ChainSection[] = [
  "stated",
  "identifiers",
  "inText",
];

/** The record's chain as its panel shows it: each row with basis, source, as-of, retrieval and live link. */
function chainBlocks(rows: readonly ChainRow[]): DocBlock[] {
  const F = CH.facts;
  const out: DocBlock[] = [{ kind: "h3", text: CH.title }];
  if (!rows.length) out.push({ kind: "small", text: CH.noneStated });
  for (const section of CHAIN_SECTIONS) {
    const own = rows.filter((row) => row.section === section);
    if (!own.length) continue;
    out.push({ kind: "p", text: CH.sections[section] });
    own.forEach((row, i) => {
      // A line shared by several rows is quoted once, above the first.
      if (row.quote && own[i - 1]?.quote?.text !== row.quote.text)
        out.push({
          kind: "quote",
          text: `${row.quote.heading} ${row.quote.text ?? LINK_NOTICES.omitted}`,
        });
      out.push({
        kind: "p",
        text:
          row.kind === "link" ? `${row.label} ${row.targetText}` : row.label,
      });
      const facts = [
        row.kind === "link" && `${F.basis}: ${CH.basis[row.basis]}`,
        `${F.source}: ${row.sourceName}`,
        row.sourceWording && `${F.wording}: "${row.sourceWording}"`,
        `${F[row.asOfLabel]}: ${row.asOfText}`,
        `${F.retrieved}: ${row.retrievedAt.slice(0, 10)}`,
        row.notice && `${F.notice}: ${row.notice}`,
        row.stale && CH.stale,
      ];
      out.push({ kind: "small", text: facts.filter(Boolean).join("; ") });
      const url =
        (row.kind === "link" && row.target.officialUrl) || row.liveUrl;
      if (url) out.push({ kind: "small", text: url });
    });
  }
  return out;
}

/** What a Grants.gov opportunity record states, when the page read it, and what that does not cover. */
function grantsBlocks(detail: GrantsDetailResponse | undefined): DocBlock[] {
  const out: DocBlock[] = [{ kind: "h3", text: GA.title }];
  if (detail) {
    const c = detail.citation;
    const passage = c.authorityPassage;
    const listings = c.assistanceListings ?? [];
    out.push({ kind: "p", text: GA.listingsTitle });
    if (!listings.length) out.push({ kind: "small", text: GA.listingsNone });
    for (const l of listings)
      out.push({ kind: "small", text: `${l.number} ${l.title}` });
    out.push({ kind: "p", text: GA.passageTitle });
    if (passage)
      out.push(
        { kind: "small", text: GA.passageFrom(passage.heading) },
        { kind: "quote", text: passage.text },
      );
    else
      out.push({
        kind: "p",
        text:
          detail.authority === "withheld" ? GA.withheld : `${GA.noPassage}.`,
      });
    out.push(
      {
        kind: "small",
        text: c.versionDate
          ? GA.versionDate(c.versionDate)
          : GA.versionDateNone,
      },
      { kind: "small", text: `${GA.openOpportunity}: ${c.officialUrl}` },
    );
  }
  out.push({ kind: "p", text: GA.coverage });
  return out;
}

export function buildDocument(input: DocInput): DocModel {
  if (input.template === "briefing") return buildBriefing(input);
  const { version, entries } = input;
  // The reader's calendar day, as in the file name.
  const generated = localDay(input.generatedAt);
  const L = COPY.docLabels;
  const A = COPY.actorLabels;
  const F = COPY.docFoundBy;
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
    // The row's stated fields, worded as the page words them (memory only, so a restored entry has none).
    if (c.commentsCloseOn)
      blocks.push({
        kind: "p",
        text: COPY.commentsClose(c.commentsCloseOn, source(c.sourceId)),
      });
    else if (c.commentsCloseWithheld)
      blocks.push({
        kind: "p",
        text: COPY.commentsCloseWithheld(source(c.sourceId)),
      });
    if (c.applicationsCloseOn)
      blocks.push({
        kind: "p",
        text: COPY.applicationsClose(c.applicationsCloseOn, source(c.sourceId)),
      });
    if (c.listedEligibility)
      blocks.push({
        kind: "p",
        text: `${COPY.grants.listedUnder} ${COPY.grants.limit}`,
      });
    if (c.topics?.length)
      blocks.push({
        kind: "p",
        text: COPY.sourceTopics(source(c.sourceId), c.topics.join("; ")),
      });
    const I = COPY.identifierLabels;
    for (const text of [
      ...(c.docketIds ?? []).map((id) => COPY.identifierLine(I.docket, id)),
      ...(c.rins ?? []).map((rin) => COPY.identifierLine(I.rin, rin)),
      ...(c.cfrRefs ?? []).map((ref) =>
        COPY.identifierLine(I.cfr, cfrQuery(ref)),
      ),
    ])
      blocks.push({ kind: "p", text });
    if (c.sourceId === "grants") blocks.push(...grantsBlocks(entry.grants));
    if (entry.chain) blocks.push(...chainBlocks(entry.chain));
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
    // Kept only while the page is open, so a restored entry states the gap.
    if (!entry.foundBy?.length) field(L.foundBy, COPY.notRecorded);
    for (const found of entry.foundBy ?? []) {
      const { seed } = found;
      const where = [source(found.sourceId), found.collection]
        .filter(Boolean)
        .join(", ");
      const from =
        seed.kind === "draft"
          ? F.draft(seed.id, seed.title)
          : seed.kind === "area"
            ? F.area
            : seed.kind === "record"
              ? F.record(source(seed.sourceId), seed.identifier)
              : F.typed;
      // An identifier lookup names the kind matched, as Why shown does.
      const terms = found.match
        ? `${COPY.identifierKinds[found.match]} ${found.terms}`
        : found.terms;
      // A name search never prints its terms, whatever it grew from (safeguard 1).
      field(
        L.foundBy,
        !found.name
          ? F.search(from, terms, where)
          : seed.kind === "draft"
            ? F.nameSearch(seed.id, where)
            : F.nameSearchFrom(from, where),
      );
      if (found.name) blocks.push({ kind: "small", text: F.nameCaution });
    }
    // The export travels without the page, so it keeps the Find related caveat (safeguard 2).
    if (entry.foundBy?.some((found) => found.match))
      blocks.push({ kind: "small", text: COPY.related.caveat });
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
  // Required by the Grants.gov API terms in any export that includes its rows.
  if (
    entries.some((entry) =>
      [entry.citation, ...entry.alternates].some(
        (c) => c.sourceId === "grants",
      ),
    )
  )
    blocks.push({ kind: "p", text: COPY.grants.attribution });

  return {
    title: `${COPY.docTitle}, ${generated}`,
    runningHead: COPY.docTitle,
    footer: COPY.limitsShort(version),
    blocks,
  };
}

/**
 * The Briefing: decision dates, source-stated changes since the last check,
 * open evidence gaps and questions for staff or counsel, from the same entries.
 * Every line carries its reference number; nothing recommends or concludes.
 */
function buildBriefing(input: DocInput): DocModel {
  const { version, entries } = input;
  const checks = input.checks ?? [];
  const generated = localDay(input.generatedAt);
  const L = COPY.docLabels;
  const A = COPY.actorLabels;
  const T = COPY.follow;
  const blocks: DocBlock[] = [];
  const source = (sourceId: string) => SOURCE_LABELS[sourceId] ?? sourceId;
  const actor = (name: keyof DataActors) =>
    input.actors[name].trim() || COPY.notRecorded;
  const p = (text: string) => blocks.push({ kind: "p", text });
  // References: the entries in list order, then followed records and new listings not already cited.
  const cited: DemoCitation[] = entries.map((entry) => entry.citation);
  const refOf = (c: DemoCitation) => {
    const at = cited.findIndex((each) => keyOf(each) === keyOf(c));
    return at < 0 ? cited.push(c) : at + 1;
  };
  const what = ({ item }: BriefingCheck) =>
    B.followed(
      T.kinds[item.kind as keyof typeof T.kinds] ?? item.kind,
      item.value,
      source(item.sourceId),
    );

  // 1. Cover
  blocks.push(
    { kind: "eyebrow", text: COPY.docEyebrow(version) },
    { kind: "title", text: B.title },
    { kind: "lede", text: B.lede },
  );
  const role = input.actors.role.trim();
  for (const [label, value] of [
    [L.preparedBy, role ? `${actor("name")}, ${role}` : actor("name")],
    [A.organization, actor("organization")],
    [A.sharingWith, actor("sharingWith")],
    [A.purpose, actor("purpose")],
    [L.generated, generated],
  ])
    blocks.push({ kind: "field", label, value });
  blocks.push(
    { kind: "small", text: COPY.docActorsIntro },
    { kind: "h3", text: COPY.limitsTitle },
    { kind: "p", text: COPY.limits(version) },
  );

  // 2. Decision dates as each source states them, in date order
  const dates: { date: string; text: string }[] = [];
  const gaps: string[] = [];
  const questions: string[] = [];
  entries.forEach((entry, index) => {
    const n = index + 1;
    const c = entry.citation;
    const from = source(c.sourceId);
    if (c.commentsCloseOn)
      dates.push({
        date: c.commentsCloseOn,
        text: `${COPY.commentsClose(c.commentsCloseOn, from)} [${n}]`,
      });
    if (c.applicationsCloseOn)
      dates.push({
        date: c.applicationsCloseOn,
        text: `${COPY.applicationsClose(c.applicationsCloseOn, from)} [${n}]`,
      });
    for (const date of [c.commentsCloseOn, c.applicationsCloseOn])
      if (date) questions.push(B.questions.closeDate(date, n));
    for (const { issue } of entry.issues)
      questions.push(
        issue.type === "consultation_absent"
          ? B.questions.consultationAbsent(n)
          : B.questions.passage(issue.label, issue.locator, n),
      );
    if (!entry.receipt) gaps.push(B.gaps.textNotRead(n));
    if (c.date === null) gaps.push(B.gaps.dateNotStated(n));
    if (c.commentsCloseWithheld) gaps.push(B.gaps.closeWithheld(n, from));
    if (!entry.foundBy?.length) gaps.push(B.gaps.foundByNotRecorded(n));
  });
  blocks.push({ kind: "h2", text: B.datesTitle });
  if (dates.length === 0) p(B.datesNone);
  dates
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(({ text }) => p(text));

  // 3. Changes since the last check: each followed item with its state
  blocks.push({ kind: "h2", text: B.changesTitle });
  if (checks.length === 0) p(B.changesNone);
  for (const entry of checks) {
    const n = refOf(entry.item.record);
    const state = trackingState(entry);
    const { check, item } = entry;
    blocks.push(
      { kind: "h3", text: `${what(entry)} [${n}]` },
      { kind: "p", text: `${T.states[state]}. ${T.stateHelp[state]}` },
      {
        kind: "small",
        text: T.lastCheckedLine(
          item.lastChecked ? localDay(item.lastChecked) : null,
        ),
      },
      { kind: "small", text: T.dataAsOfLine(entry.dataAsOf ?? null) },
    );
    if (check?.state === "checked") {
      for (const listing of check.fresh)
        p(
          B.newListing(
            listing.title,
            listing.date ?? COPY.docDateNotStated,
            source(listing.sourceId),
            refOf(listing),
          ),
        );
      if (check.undated) p(T.undated(check.undated));
      if (check.more) p(T.more);
    }
    if (state === "unavailable")
      gaps.push(B.gaps.trackingUnavailable(what(entry), n));
    if (state === "not_checked")
      gaps.push(B.gaps.trackingNotChecked(what(entry), n));
    if (state === "no_longer_listed")
      questions.push(B.questions.noLongerListed(what(entry), n));
  }

  // 4. Open evidence gaps, then 5. questions
  blocks.push({ kind: "h2", text: B.gapsTitle });
  if (gaps.length === 0) p(B.gapsNone);
  gaps.forEach((text) => p(text));
  blocks.push({ kind: "h2", text: B.questionsTitle });
  if (questions.length === 0) p(B.questionsNone);
  questions.forEach((text) => p(text));

  // 6. References, then the provenance notes
  blocks.push({ kind: "h2", text: COPY.docReferencesTitle });
  [...cited.map(ieeeReference), ...atniReferences(version)].forEach(
    (text, index) => blocks.push({ kind: "ref", number: index + 1, text }),
  );
  blocks.push({ kind: "h2", text: COPY.docSovereigntyTitle });
  for (const text of COPY.docSovereignty) p(text);
  // Required by the Grants.gov API terms in any export that includes its rows.
  if (
    [...cited, ...entries.flatMap((entry) => entry.alternates)].some(
      (c) => c.sourceId === "grants",
    )
  )
    p(COPY.grants.attribution);

  return {
    title: `${B.title}, ${generated}`,
    runningHead: B.title,
    footer: COPY.limitsShort(version),
    blocks,
  };
}
