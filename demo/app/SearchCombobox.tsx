import { useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import bundledAliases from "../../config/law-aliases.v1.json";
import bundledIssues from "../../config/issues.v1.json";
import bundledPhrases from "../../config/plain-phrases.v1.json";
import { router as copy } from "../../src/demo/copy/router";
import { search } from "../../src/demo/copy/search";
import type {
  LawAlias,
  LawAliasFile,
  VocabularyFile,
  VocabularyKind,
} from "../../src/demo/index-types";
import {
  entrySearches,
  issuesIn,
  provisionsFor,
  type IssueEntry,
  type IssueFile,
  type MeasureEntry,
  type TableEntry,
} from "../../src/demo/issues";
import {
  issueReading,
  lawNameReading,
  routeQuery,
  type RouteReading,
} from "../../src/demo/query-route";
import {
  phraseRows,
  possibleMatches,
  prepareLabels,
  rankLabels,
  type PlainPhraseFamily,
  type PlainPhraseFile,
} from "../../src/demo/suggest";
import type { SearchField } from "./SearchBox";

const ALIASES = bundledAliases as unknown as LawAliasFile;
const ISSUES = bundledIssues as unknown as IssueFile;
const PHRASES = bundledPhrases as unknown as PlainPhraseFile;
const NO_VOCABULARY: readonly VocabularyFile[] = [];
const LIST_ID = "q-listbox";
const STATUS_ID = "q-route";
const MAX_WORD_OPTIONS = 5;

interface Option {
  id: string;
  text: string;
  note?: string;
  /** Put in the box when chosen. */
  insert: string;
  /** Readings run their lookup; vocabulary labels only fill the box. */
  reading?: RouteReading;
}

const KIND_NOTE: Record<VocabularyKind, string> = {
  fr_agency: copy.agencyNote,
  fr_topic: copy.topicNote,
  cfr_title: copy.cfrTitleNote,
};
const ACTION_NOTE: Partial<Record<RouteReading["action"], string>> = {
  link_out: copy.linkOutNote,
  not_covered: copy.notCoveredNote,
};
const FAMILY_NOTE: Record<PlainPhraseFamily, string> = {
  federal_register_topic: copy.topicNote,
  congress_subject_term: search.suggest.congressSubjectNote,
  cfr_title_name: copy.cfrTitleNote,
  agency: copy.agencyNote,
};

interface Candidate {
  label: string;
  shortLabel: string | null;
  note: string;
}

/** One row per name and one for the label (D-161 to D-167), so a typed prefix of any finds the entry. */
interface IssueCandidate {
  label: string;
  shortLabel: string | null;
  entry: TableEntry;
}

function issueCandidateRows(table: IssueFile): IssueCandidate[] {
  const rows: IssueCandidate[] = [];
  for (const entry of table.entries) {
    rows.push({ label: entry.label, shortLabel: null, entry });
    for (const { name } of entry.names)
      rows.push({ label: name, shortLabel: null, entry });
  }
  return rows;
}

/** Built once per alias table, issue table and vocabulary, so suggest.ts prepares each list once. */
function candidates(
  aliases: LawAliasFile,
  vocabulary: readonly VocabularyFile[],
  issues: IssueFile,
) {
  const laws = aliases.entries.map((alias) => ({
    label: alias.popularName,
    shortLabel: null,
    note: copy.lawNote,
    alias,
  }));
  const vocab: Candidate[] = vocabulary.flatMap((file) =>
    file.entries.map((entry) => ({
      label: entry.label,
      shortLabel: entry.shortLabel,
      note: KIND_NOTE[file.kind],
    })),
  );
  const issueRows = issueCandidateRows(issues);
  const lists = {
    laws,
    vocab,
    issues: issueRows,
    all: [...laws, ...vocab] as Candidate[],
  };
  for (const list of Object.values(lists)) prepareLabels(list);
  return lists;
}

function lawOption(alias: LawAlias): Option {
  const reading = lawNameReading(alias);
  return {
    id: "",
    text: reading.label,
    note: copy.lawNote,
    insert: alias.popularName,
    reading,
  };
}

/** A label option only fills the box with the label as search words. */
const labelOption = (c: Candidate): Option => ({
  id: "",
  text: c.label,
  note: c.note,
  insert: c.label,
});

/** An issue or measure entry's word-prefix option (D-161 to D-167). */
function issueOption(table: IssueFile, entry: TableEntry): Option {
  const reading = issueReading(table, entry);
  const note =
    entry.kind === "issue"
      ? copy.issueSearchNote(entrySearches(table, entry).length)
      : copy.measureIssueNote(issuesIn(table, entry).length);
  return { id: "", text: reading.label, note, insert: entry.label, reading };
}

/** The official bill form without its Congress, e.g. "H.R. 8800" from "H.R. 8800 (119th Congress)". */
const billShortLabel = (label: string) =>
  label.replace(/\s*\([^()]*Congress\)\s*$/, "");

/**
 * One of a measure's issues, offered beside the measure's own option, with the
 * sections that file the measure with it. Its reading is the issue's own.
 */
function measureIssueOption(
  table: IssueFile,
  measure: MeasureEntry,
  issueEntry: IssueEntry,
): Option {
  const sections = provisionsFor(table, issueEntry.id)
    .filter(({ measure: m }) => m === measure)
    .map(({ provision }) => {
      const bill = measure.identifiers.find(
        (id) => id.kind === "bill" && id.id === provision.bill,
      );
      const billLabel = bill ? billShortLabel(bill.label) : provision.bill;
      return `${billLabel} sec. ${provision.section}`;
    })
    .join("; ");
  const reading = issueReading(table, issueEntry);
  return {
    id: "",
    text: copy.measureIssueOption(measure.label, sections, issueEntry.label),
    insert: issueEntry.label,
    reading,
  };
}

function optionsFor(
  value: string,
  aliases: LawAliasFile,
  issues: IssueFile,
  lists: ReturnType<typeof candidates>,
  phrases: PlainPhraseFile,
): { options: Option[]; status: string } {
  const typed = value.trim();
  if (typed.length < 2) return { options: [], status: "" };
  const route = routeQuery(typed, { aliases, issues });
  const options: Option[] = route.readings.map((reading) => ({
    id: "",
    text: reading.label,
    note: ACTION_NOTE[reading.action],
    insert: reading.identifier,
    reading,
  }));
  let possible = false;
  if (typed.length >= 3) {
    const named = new Set(route.readings.map((r) => r.identifier));
    const words: Option[] = phraseRows(typed, phrases).map((row) => ({
      id: "",
      text: search.suggest.alsoSearchFor(row.term),
      note: FAMILY_NOTE[row.termFamily],
      insert: row.term,
    }));
    for (const c of rankLabels(typed, lists.laws)
      .filter((c) => !named.has(c.label))
      .slice(0, MAX_WORD_OPTIONS))
      words.push(lawOption(c.alias));
    for (const c of rankLabels(typed, lists.vocab).slice(0, MAX_WORD_OPTIONS))
      words.push(labelOption(c));
    const issueEntries: TableEntry[] = [];
    const seenIssueEntries = new Set<TableEntry>();
    // A bill the router already offered still lists its issues beside it.
    for (const reading of route.readings)
      if (reading.kind === "issue") {
        const entry = issues.entries.find(
          (e) => e.label === reading.identifier,
        );
        if (entry?.kind === "measure")
          for (const issueEntry of issuesIn(issues, entry))
            words.push(measureIssueOption(issues, entry, issueEntry));
      }
    for (const c of rankLabels(typed, lists.issues)) {
      if (named.has(c.entry.label) || seenIssueEntries.has(c.entry)) continue;
      seenIssueEntries.add(c.entry);
      issueEntries.push(c.entry);
      if (issueEntries.length >= MAX_WORD_OPTIONS) break;
    }
    for (const entry of issueEntries) {
      words.push(issueOption(issues, entry));
      if (entry.kind === "measure")
        for (const issueEntry of issuesIn(issues, entry))
          words.push(measureIssueOption(issues, entry, issueEntry));
    }
    if (!words.length) {
      // Typo matches only fill the box: never chosen for the person, never read by the router.
      words.push(...possibleMatches(route, lists.all).map(labelOption));
      possible = words.length > 0;
    }
    options.push(...words);
  }
  // One plausible reading with nothing named still waits for the person to choose it.
  const status = route.plainWords
    ? possible
      ? search.suggest.possibleMatch
      : copy.searchedAsWords
    : route.ambiguous
      ? route.readings.length === 1
        ? `${copy.confirmReading} ${route.readings[0].label}`
        : `${copy.chooseReading} ${route.readings.map((r) => r.label).join("; ")}`
      : `${copy.suggestion} ${route.readings[0]?.label ?? ""}`;
  return {
    options: options.map((o, i) => ({ ...o, id: `q-option-${i}` })),
    status,
  };
}

/**
 * The search box input as a WAI-ARIA 1.2 combobox with list autocomplete.
 * Suggestions come from the router, the bundled alias and plain-phrase tables
 * and any vocabulary files passed in: no network call per keystroke and
 * nothing stored. Focus stays on the input; the active option is
 * aria-activedescendant. Choosing a reading fills the box with its identifier
 * and submits the enclosing form (the box's one submit path); choosing a
 * vocabulary label, a possible match or an "Also search for" term only fills
 * the box with that official wording as search words.
 */
export function SearchCombobox({
  id,
  value,
  describedBy,
  invalid,
  onInput,
  aliases = ALIASES,
  issues = ISSUES,
  vocabulary = NO_VOCABULARY,
  phrases = PHRASES,
  onChoose,
}: SearchField & {
  aliases?: LawAliasFile;
  issues?: IssueFile;
  vocabulary?: readonly VocabularyFile[];
  phrases?: PlainPhraseFile;
  /** Told which reading was chosen, before the form submits. */
  onChoose?: (reading: RouteReading) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const pendingSubmit = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const lists = useMemo(
    () => candidates(aliases, vocabulary, issues),
    [aliases, vocabulary, issues],
  );
  const { options, status } = useMemo(
    () => optionsFor(value, aliases, issues, lists, phrases),
    [value, aliases, issues, lists, phrases],
  );
  const expanded = open && options.length > 0;
  const current = expanded && active >= 0 ? options[active] : undefined;

  // Submit once the parent has the chosen value, so its handler reads it.
  useLayoutEffect(() => {
    if (pendingSubmit.current !== null && pendingSubmit.current === value) {
      pendingSubmit.current = null;
      input.current?.form?.requestSubmit();
    }
  }, [value]);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };
  const choose = (option: Option) => {
    close();
    if (option.reading) {
      onChoose?.(option.reading);
      pendingSubmit.current = option.insert;
    }
    if (option.insert !== value) onInput(option.insert);
    else if (option.reading) {
      pendingSubmit.current = null;
      input.current?.form?.requestSubmit();
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const n = options.length;
    switch (event.key) {
      case "ArrowDown":
        if (!n) return;
        event.preventDefault();
        setOpen(true);
        setActive(expanded ? (active + 1) % n : 0);
        return;
      case "ArrowUp":
        if (!n) return;
        event.preventDefault();
        setOpen(true);
        setActive(expanded && active > 0 ? active - 1 : n - 1);
        return;
      case "Enter":
        if (current) {
          event.preventDefault();
          choose(current);
        }
        return;
      case "Escape":
        if (expanded) {
          event.preventDefault();
          close();
        } else if (value) {
          event.preventDefault();
          onInput("");
        }
        return;
      case "Home":
      case "End":
        // The caret moves in the box; visual focus leaves the list.
        setActive(-1);
        return;
      default:
        return;
    }
  };

  return (
    <>
      <input
        ref={input}
        id={id}
        type="text"
        role="combobox"
        enterKeyHint="search"
        value={value}
        autoComplete="off"
        spellcheck={false}
        maxLength={200}
        aria-autocomplete="list"
        aria-expanded={expanded ? "true" : "false"}
        aria-controls={LIST_ID}
        aria-activedescendant={current?.id}
        aria-describedby={describedBy}
        aria-invalid={invalid ? "true" : undefined}
        onInput={(e) => {
          onInput((e.target as HTMLInputElement).value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        onBlur={close}
      />
      <ul
        id={LIST_ID}
        role="listbox"
        class="suggestions"
        aria-label={copy.listLabel}
        hidden={!expanded}
      >
        {expanded &&
          options.map((option, i) => (
            <li
              key={option.id}
              id={option.id}
              role="option"
              aria-selected={i === active ? "true" : "false"}
              class={i === active ? "suggestion active" : "suggestion"}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(option)}
            >
              {option.text}
              {option.note && <span class="help"> ({option.note})</span>}
            </li>
          ))}
      </ul>
      <p id={STATUS_ID} class="help" role="status">
        {status}
      </p>
    </>
  );
}
