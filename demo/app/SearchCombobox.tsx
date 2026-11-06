import { useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import bundledAliases from "../../config/law-aliases.v1.json";
import { router as copy } from "../../src/demo/copy/router";
import type {
  LawAliasFile,
  VocabularyFile,
  VocabularyKind,
} from "../../src/demo/index-types";
import { routeQuery, type RouteReading } from "../../src/demo/query-route";
import type { SearchField } from "./SearchBox";

const ALIASES = bundledAliases as unknown as LawAliasFile;
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

function optionsFor(
  value: string,
  aliases: LawAliasFile,
  vocabulary: readonly VocabularyFile[],
): { options: Option[]; status: string } {
  const typed = value.trim();
  if (typed.length < 2) return { options: [], status: "" };
  const route = routeQuery(typed, { aliases });
  const options: Option[] = route.readings.map((reading) => ({
    id: "",
    text: reading.label,
    note: ACTION_NOTE[reading.action],
    insert: reading.identifier,
    reading,
  }));
  const words = typed.toLowerCase();
  if (words.length >= 3) {
    const named = new Set(route.readings.map((r) => r.identifier));
    const laws = aliases.entries
      .filter(
        (a) =>
          !named.has(a.popularName) &&
          a.popularName.toLowerCase().includes(words),
      )
      .slice(0, MAX_WORD_OPTIONS);
    for (const a of laws) {
      const reading: RouteReading = {
        kind: "law_name",
        identifier: a.popularName,
        jurisdiction: "federal",
        action: "static_index",
        label: copy.lawName(
          a.popularName,
          a.citations.map((c) => c.text),
        ),
      };
      options.push({
        id: "",
        text: reading.label,
        note: copy.lawNote,
        insert: a.popularName,
        reading,
      });
    }
    let shown = 0;
    for (const file of vocabulary)
      for (const entry of file.entries) {
        if (shown >= MAX_WORD_OPTIONS) break;
        if (!entry.label.toLowerCase().includes(words)) continue;
        shown += 1;
        options.push({
          id: "",
          text: entry.label,
          note: KIND_NOTE[file.kind],
          insert: entry.label,
        });
      }
  }
  // One plausible reading with nothing named still waits for the person to choose it.
  const status = route.plainWords
    ? copy.searchedAsWords
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
 * Suggestions come from the router, the bundled alias table and any
 * vocabulary files passed in: no network call per keystroke and nothing
 * stored. Focus stays on the input; the active option is aria-activedescendant.
 * Choosing a reading fills the box with its identifier and submits the
 * enclosing form (the box's one submit path); choosing a vocabulary label only
 * fills the box with the official label as search words.
 */
export function SearchCombobox({
  id,
  value,
  describedBy,
  invalid,
  onInput,
  aliases = ALIASES,
  vocabulary = [],
  onChoose,
}: SearchField & {
  aliases?: LawAliasFile;
  vocabulary?: readonly VocabularyFile[];
  /** Told which reading was chosen, before the form submits. */
  onChoose?: (reading: RouteReading) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const pendingSubmit = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { options, status } = useMemo(
    () => optionsFor(value, aliases, vocabulary),
    [value, aliases, vocabulary],
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
