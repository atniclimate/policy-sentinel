/**
 * Cited and linked records for an opened record (design section 3 T1.3,
 * section 1 rules 1 to 3, index conditions C1 to C3). Pure: rows come from
 * the opened record's own fields, the static index shards, and text the page
 * already read. Nothing here makes a network call.
 *
 * Every row carries its basis (links only), a label from the closed table in
 * link-labels.ts, the source name, the source's as-of wording, the retrieval
 * time and the live link to where the evidence is stated, in that order
 * (C1). Notices are rows with no basis: they are not links.
 */
import { findCitations, parseUslmHref } from "./cite-patterns.ts";
import type { ParsedCitation } from "./cite-patterns.ts";
import { SOURCE_LABELS } from "./citations.ts";
import { chain } from "./copy/chain.ts";
import { recordPlan } from "./discovery.ts";
import type { PlanSources } from "./discovery.ts";
import type {
  CfrAuthorityShard,
  IndexFile,
  ShardCitation,
  UscSourceCreditShard,
  VerbatimField,
} from "./index-types.ts";
import { LINK_NOTICES, linkLabel } from "./link-labels.ts";
import type { LabelId } from "./link-labels.ts";
import type {
  DemoCitation,
  LinkFamily,
  LinkedRecord,
  TextBlock,
} from "./types.ts";

export type ChainSection = "stated" | "identifiers" | "inText";

/** The official line a row came from; text null when the file omits it (G3). */
export interface ChainQuote {
  readonly heading: string;
  readonly text: string | null;
  readonly field: VerbatimField;
}

interface RowBase {
  readonly section: ChainSection;
  readonly label: string;
  /** The label is the source's own wording (a GovInfo relation name). */
  readonly labelVerbatim?: true;
  readonly quote: ChainQuote | null;
  /** Exact span as the source printed it; null when nothing was parsed. */
  readonly sourceWording: string | null;
  readonly notice: string | null;
  readonly sourceName: string;
  readonly asOfLabel: keyof typeof chain.facts;
  readonly asOfText: string;
  /** The verbatim field asOfText is, or null when the page words it. */
  readonly asOfField: VerbatimField | null;
  readonly retrievedAt: string;
  /** C3: the file was retrieved more than 180 days before now. */
  readonly stale: boolean;
  /** The live page where this evidence is stated. */
  readonly liveUrl: string | null;
}
export interface ChainLink extends RowBase, LinkedRecord {
  readonly kind: "link";
  /** The target as the page prints it. */
  readonly targetText: string;
}
export interface ChainNote extends RowBase {
  readonly kind: "note";
}
export type ChainRow = ChainLink | ChainNote;

type Provenance = Pick<
  RowBase,
  | "sourceName"
  | "asOfLabel"
  | "asOfText"
  | "asOfField"
  | "retrievedAt"
  | "stale"
  | "liveUrl"
>;

export const STALE_DAYS = 180;
const DAY_MS = 86_400_000;

// Reader links to official pages; nothing here is fetched by the page.
export const cfrPartUrl = (title: number, part: string) =>
  `https://www.ecfr.gov/current/title-${title}/part-${part}`;
export const uscSectionUrl = (title: number, section: string) =>
  `https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title${title}-section${encodeURIComponent(section)}&num=0&edition=prelim`;
const frDocUrl = (id: string) =>
  `https://www.federalregister.gov/d/${encodeURIComponent(id)}`;
// First volume, Congress and Statutes volume each live service holds.
const FR_API_FIRST_VOLUME = 59; // 1994
const GOVINFO_PLAW_FIRST_CONGRESS = 104;
const GOVINFO_STATUTE_FIRST_VOLUME = 65;

const sectionFor = (basis: LinkedRecord["basis"]): ChainSection =>
  basis === "identifier_match"
    ? "identifiers"
    : basis === "citation_in_text"
      ? "inText"
      : "stated";

export function recordProvenance(citation: DemoCitation): Provenance {
  return {
    sourceName: SOURCE_LABELS[citation.sourceId] ?? citation.sourceId,
    asOfLabel: "published",
    asOfText: citation.date ?? chain.dateNotStated,
    asOfField: null,
    retrievedAt: citation.retrievedAt,
    stale: false,
    liveUrl: citation.officialUrl,
  };
}

/** Provenance of a shard hop; null when the manifest entry has no source. */
export function fileProvenance(
  file: IndexFile,
  liveUrl: string,
  now: Date,
): Provenance | null {
  const source = file.source;
  if (!source) return null;
  const stale =
    now.getTime() - Date.parse(source.retrievedAt) > STALE_DAYS * DAY_MS;
  const base = {
    sourceName: source.name,
    retrievedAt: source.retrievedAt,
    stale,
    liveUrl,
  };
  switch (source.id) {
    case "govinfo-cfr-annual":
      return {
        ...base,
        asOfLabel: "asOf",
        asOfText: source.revisedAsOfText,
        asOfField: "revisedAsOfText",
      };
    case "olrc-uslm":
      return {
        ...base,
        asOfLabel: "releasePoint",
        asOfText: source.currentThroughText,
        asOfField: "currentThroughText",
      };
    case "ecfr":
      return {
        ...base,
        asOfLabel: "asOf",
        asOfText: source.pointInTimeDate,
        asOfField: null,
      };
    case "federal-register-api":
      return {
        ...base,
        asOfLabel: "retrieved",
        asOfText: source.retrievedAt.slice(0, 10),
        asOfField: null,
      };
  }
}

interface Target {
  readonly target: LinkedRecord["target"];
  readonly text: string;
  readonly family: LinkFamily;
  readonly notice: string | null;
}

/** A full run-time parse or a shard citation (the same fields, with or without offsets). */
type Cite = Exclude<ParsedCitation, { kind: "short_form" }> | ShardCitation;

const reach = (
  sourceId: string,
  identifier: string,
  text: string,
  family: LinkFamily,
  officialUrl: string | null,
): Target => ({
  target: { sourceId, identifier, ...(officialUrl && { officialUrl }) },
  text,
  family,
  notice: officialUrl ? null : LINK_NOTICES.notLive,
});

/** Where a full citation leads, or a notice when no live source holds it. */
export function targetOf(c: Cite): Target {
  switch (c.kind) {
    case "usc": {
      const text = `${c.title} U.S.C. ${c.section}${c.etSeq ? " et seq." : ""}`;
      return reach(
        "usc-index",
        `/us/usc/t${c.title}/s${c.section}`,
        text,
        "laws_and_bills",
        uscSectionUrl(c.title, c.section),
      );
    }
    case "cfr": {
      const id = `${c.title} CFR part ${c.part}`;
      const text = c.section ? `${c.title} CFR ${c.section}` : id;
      return reach(
        "cfr-index",
        id,
        text,
        "rules_and_notices",
        cfrPartUrl(c.title, c.part),
      );
    }
    case "pl": {
      const id = `Pub. L. ${c.congress}-${c.number}`;
      return reach(
        "govinfo",
        id,
        id,
        "laws_and_bills",
        c.congress >= GOVINFO_PLAW_FIRST_CONGRESS
          ? `https://www.govinfo.gov/link/plaw/${c.congress}/public/${c.number}`
          : null,
      );
    }
    case "stat": {
      const id = `${c.volume} Stat. ${c.page}`;
      return reach(
        "govinfo",
        id,
        id,
        "laws_and_bills",
        c.volume >= GOVINFO_STATUTE_FIRST_VOLUME
          ? `https://www.govinfo.gov/link/statute/${c.volume}/${c.page}`
          : null,
      );
    }
    case "fr": {
      const id = `${c.volume} FR ${c.page}`;
      return reach(
        "federal-register",
        id,
        id,
        "rules_and_notices",
        c.volume >= FR_API_FIRST_VOLUME
          ? `https://www.federalregister.gov/citation/${c.volume}-FR-${c.page}`
          : null,
      );
    }
    case "rcw":
      return reach(
        "washington",
        `RCW ${c.section}`,
        `RCW ${c.section}`,
        "state",
        `https://app.leg.wa.gov/RCW/default.aspx?cite=${encodeURIComponent(c.section)}`,
      );
    case "ors":
      return reach(
        "oregon",
        `ORS ${c.section}`,
        `ORS ${c.section}`,
        "state",
        null,
      );
    case "idaho_code":
      return reach(
        "idaho",
        `Idaho Code ${c.section}`,
        `Idaho Code ${c.section}`,
        "state",
        null,
      );
    case "us_reports": {
      const id = `${c.volume} U.S. ${c.page}`;
      return reach("govinfo-courts", id, id, "cases", null);
    }
    case "act":
      return reach("usc-index", c.href, c.href, "laws_and_bills", null);
  }
}

function link(
  p: Provenance,
  labelId: LabelId,
  direction: "forward" | "reverse",
  subject: string,
  basis: LinkedRecord["basis"],
  to: Target,
  extra: {
    sourceWording?: string | null;
    locator?: string;
    quote?: ChainQuote | null;
  } = {},
): ChainLink {
  return {
    kind: "link",
    section: sectionFor(basis),
    basis,
    labelId,
    direction,
    label: linkLabel(labelId, direction, subject),
    target: to.target,
    targetText: to.text,
    family: to.family,
    sourceWording: extra.sourceWording ?? null,
    locator: extra.locator ?? "",
    quote: extra.quote ?? null,
    notice: to.notice,
    ...p,
  };
}

function note(
  p: Provenance,
  section: ChainSection,
  label: string,
  notice: string | null,
  quote: ChainQuote | null = null,
  sourceWording: string | null = null,
): ChainNote {
  return { kind: "note", section, label, notice, quote, sourceWording, ...p };
}

/** Rows for one official line: a link per full citation, short forms as text. */
function lineRows(
  p: Provenance,
  labelId: LabelId,
  subject: string,
  quote: ChainQuote,
  cites: readonly (Cite | ParsedCitation)[],
): ChainRow[] {
  const label = linkLabel(labelId, "forward", subject);
  if (!cites.length)
    return [note(p, "stated", label, LINK_NOTICES.noneParsed, quote)];
  return cites.map((c) =>
    c.kind === "short_form"
      ? note(p, "stated", label, LINK_NOTICES.shortForm, quote, c.text)
      : link(
          p,
          labelId,
          "forward",
          subject,
          "source_text_parsed",
          targetOf(c),
          {
            sourceWording: c.text,
            quote,
          },
        ),
  );
}

/**
 * (a) Rows from the opened record's own fields. RINs and dockets come from
 * the Find related plan, so they keep the spelling the source states.
 */
export function recordLinks(
  citation: DemoCitation,
  sources: PlanSources,
): ChainRow[] {
  const p = recordProvenance(citation);
  const rows: ChainRow[] = [];
  for (const ref of citation.cfrRefs ?? []) {
    const id = `${ref.title} CFR part ${ref.part}`;
    rows.push(
      link(p, "fr_cfr_refs", "forward", "", "source_field", {
        target: {
          sourceId: "cfr-index",
          identifier: id,
          officialUrl: cfrPartUrl(ref.title, ref.part),
        },
        text: id,
        family: "rules_and_notices",
        notice: null,
      }),
    );
  }
  for (const lane of recordPlan(citation, sources).lanes) {
    if (lane.match !== "rin" && lane.match !== "docket") continue;
    rows.push(
      link(
        p,
        lane.match === "rin" ? "shares_rin" : "shares_docket",
        "forward",
        lane.query,
        "identifier_match",
        {
          target: { sourceId: lane.sourceId, identifier: lane.query },
          text: lane.query,
          family: "rules_and_notices",
          notice: null,
        },
      ),
    );
  }
  const frDoc = (id: string): Target => ({
    target: {
      sourceId: "federal-register",
      identifier: id,
      officialUrl: frDocUrl(id),
    },
    text: `FR Doc. ${id}`,
    family: "rules_and_notices",
    notice: null,
  });
  if (citation.correctionOf) {
    const id = citation.correctionOf;
    rows.push(
      link(p, "correction_of", "forward", id, "source_field", frDoc(id)),
    );
  }
  for (const id of citation.corrections ?? []) {
    rows.push(
      link(p, "correction_of", "reverse", id, "source_field", frDoc(id)),
    );
  }
  if (citation.authorityLinePresent === false) {
    rows.push(
      note(p, "stated", linkLabel("fr_no_authority_line", "forward"), null),
    );
  } else if (citation.authorityLine) {
    const line = citation.authorityLine;
    // The FR AUTH element carries the same kind of wording as the CFR AUTH line.
    const quote = {
      heading: "Authority:",
      text: line,
      field: "authorityText",
    } as const;
    rows.push(
      ...lineRows(p, "fr_authority_line", "", quote, findCitations(line)),
    );
  }
  return rows;
}

/** (b) Rows for one CFR part from its title shard; null when the part is not in it. */
export function cfrPartLinks(
  shard: CfrAuthorityShard,
  part: string,
  file: IndexFile,
  now: Date,
): ChainRow[] | null {
  const entry = shard.entries.find((e) => e.part === part);
  const p = fileProvenance(file, cfrPartUrl(shard.title, part), now);
  if (!entry || !p) return null;
  const subject = `${shard.title} CFR part ${part}`;
  const rows: ChainRow[] = [];
  const authorityOmitted = entry.omitted.includes("authorityText");
  if (entry.authorityText === null && !authorityOmitted) {
    rows.push(
      note(p, "stated", linkLabel("cfr_no_authority_line", "forward"), null),
    );
  } else {
    rows.push(
      ...lineRows(
        p,
        "cfr_authority",
        subject,
        {
          heading: "Authority:",
          text: entry.authorityText,
          field: "authorityText",
        },
        entry.authorityCitations,
      ),
    );
  }
  if (entry.sourceText !== null || entry.omitted.includes("sourceText")) {
    rows.push(
      ...lineRows(
        p,
        "cfr_source",
        subject,
        { heading: "Source:", text: entry.sourceText, field: "sourceText" },
        entry.sourceCitations,
      ),
    );
  }
  return rows;
}

/** (b) Rows for one U.S.C. section from its title shard; null when it is not in it. */
export function uscSectionLinks(
  shard: UscSourceCreditShard,
  identifier: string,
  file: IndexFile,
  now: Date,
): ChainRow[] | null {
  const entry = shard.entries.find((e) => e.identifier === identifier);
  const section = identifier.split("/s").pop() ?? "";
  const p = fileProvenance(file, uscSectionUrl(shard.title, section), now);
  if (!entry || !p) return null;
  const rows: ChainRow[] = [];
  if (entry.creditText !== null || entry.credits.length) {
    const quote = {
      heading: "Source credit",
      text: entry.creditText,
      field: "creditText",
    } as const;
    if (!entry.credits.length) {
      rows.push(
        note(
          p,
          "stated",
          linkLabel("usc_source_credit", "forward"),
          LINK_NOTICES.noneParsed,
          quote,
        ),
      );
    }
    for (const credit of entry.credits) {
      rows.push(
        link(
          p,
          "usc_source_credit",
          "forward",
          "",
          "source_field",
          targetOf(credit),
          {
            quote,
          },
        ),
      );
    }
  }
  if (entry.reclassifiedAs) {
    const { targets, noteText } = entry.reclassifiedAs;
    const quote = {
      heading: "Codification note",
      text: noteText,
      field: "noteText",
    } as const;
    for (const href of targets) {
      const parsed = parseUslmHref(href);
      if (parsed?.kind !== "usc") continue;
      const to = targetOf(parsed);
      rows.push(
        link(p, "usc_reclassified", "forward", to.text, "source_field", to, {
          quote,
        }),
      );
    }
  }
  rows.push(
    note(
      p,
      "stated",
      linkLabel("cases_citing", "forward"),
      LINK_NOTICES.notOfficial,
    ),
  );
  return rows;
}

/**
 * (c) Full citations in text the page already read (Federal Register and
 * Washington bill HTML), each at its block's locator. Short forms are text
 * with "short form, not resolved" and never link to an earlier citation.
 */
export function citationsInText(
  blocks: readonly TextBlock[],
  record: DemoCitation,
): ChainRow[] {
  const p = recordProvenance(record);
  const rows: ChainRow[] = [];
  for (const block of blocks) {
    for (const c of findCitations(block.text)) {
      if (c.kind === "short_form") {
        rows.push(
          note(
            p,
            "inText",
            linkLabel("short_form", "forward", block.locator),
            LINK_NOTICES.shortForm,
            null,
            c.text,
          ),
        );
      } else {
        rows.push(
          link(
            p,
            "citation_in_text",
            "forward",
            block.locator,
            "citation_in_text",
            targetOf(c),
            { sourceWording: c.text, locator: block.locator },
          ),
        );
      }
    }
  }
  return rows;
}

/** A user action the chain answers, and what it may cost. */
export type ChainAction =
  | "open_record"
  | "open_cfr_part"
  | "open_usc_section"
  | "expand_govinfo_related"
  | "expand_congress_related_bills";

export interface BudgetRow {
  /** Worker calls that spend the api.data.gov key. */
  readonly keyedCalls: number;
  /** Worker calls with no key. */
  readonly keylessCalls: number;
  /** Same-origin static index files fetched (./demo-data/...). */
  readonly staticFetches: number;
  /** Largest response the action can bring to the page. */
  readonly worstCaseBytes: number;
  /** Runs without a press. Nothing keyed does. */
  readonly automatic: boolean;
  readonly cache: string;
  readonly truncation: string;
}

const MIB = 1024 * 1024;
// shortcut: the Worker caps every official response at 1,500,000 bytes
// (MAX_BYTES in worker/src/sources/shared.ts); revisit if that cap changes.
const WORKER_RESPONSE_CAP = 1_500_000;

/**
 * Call and byte budget per user action (design section 3 T1.3). The record's
 * own read is the existing policy call and is not counted again here.
 */
export const CALL_BUDGET: Readonly<Record<ChainAction, BudgetRow>> =
  Object.freeze({
    open_record: {
      keyedCalls: 0,
      keylessCalls: 0,
      staticFetches: 0,
      worstCaseBytes: 0,
      automatic: true,
      cache: "Rows come from the record already read; nothing is fetched.",
      truncation:
        "None; citations in text cover only the text the Worker read.",
    },
    open_cfr_part: {
      keyedCalls: 0,
      keylessCalls: 0,
      staticFetches: 1,
      worstCaseBytes: 1.5 * MIB,
      automatic: false,
      cache: "One title shard per page session, kept in memory by path.",
      truncation:
        "None; each shard is capped at 1.5 MiB when it is built (E4).",
    },
    open_usc_section: {
      keyedCalls: 0,
      keylessCalls: 0,
      staticFetches: 1,
      worstCaseBytes: 1.5 * MIB,
      automatic: false,
      cache:
        "One title or chapter shard per page session, kept in memory by path.",
      truncation:
        "None; each shard is capped at 1.5 MiB when it is built (E5).",
    },
    expand_govinfo_related: {
      keyedCalls: 1,
      keylessCalls: 0,
      staticFetches: 0,
      worstCaseBytes: WORKER_RESPONSE_CAP,
      automatic: false,
      cache: "Cached in the Worker; one call per press.",
      truncation: "The Worker refuses a response over its byte cap.",
    },
    expand_congress_related_bills: {
      keyedCalls: 1,
      keylessCalls: 0,
      staticFetches: 0,
      worstCaseBytes: WORKER_RESPONSE_CAP,
      automatic: false,
      cache: "Cached in the Worker; one call per press.",
      truncation: "The Worker refuses a response over its byte cap.",
    },
  });
