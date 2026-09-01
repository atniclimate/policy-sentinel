/** @jsxImportSource preact */

import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Nation } from "../types";
import { nationMatchesInput } from "../policy";

interface NationPickerProps {
  nations: Nation[];
  value: string;
  onChange: (nationId: string) => void;
  error?: string;
  id?: string;
}

export function NationPicker({
  nations,
  value,
  onChange,
  error,
  id = "nation",
}: NationPickerProps) {
  const selectedNation = nations.find((nation) => nation.id === value);
  const [input, setInput] = useState(selectedNation?.officialName ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput(selectedNation?.officialName ?? "");
  }, [selectedNation?.officialName]);

  const matches = useMemo(
    () =>
      nations
        .filter((nation) => nationMatchesInput(nation, input))
        .slice(0, 12),
    [input, nations],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [input]);

  const choose = (nation: Nation) => {
    onChange(nation.id);
    setInput(nation.officialName);
    setOpen(false);
    inputRef.current?.focus();
  };

  const clear = () => {
    onChange("");
    setInput("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const activeId =
    open && matches[activeIndex] ? `${id}-option-${activeIndex}` : undefined;

  return (
    <div class="nation-picker">
      <label for={`${id}-input`}>
        Nation <span aria-hidden="true">*</span>
      </label>
      <p class="field-hint" id={`${id}-hint`}>
        Search official names and authorized aliases. The official name is used
        after selection.
      </p>
      <div class="combobox-wrap">
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-activedescendant={activeId}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          aria-invalid={Boolean(error)}
          autocomplete="off"
          value={input}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 100)}
          onInput={(event) => {
            setInput(event.currentTarget.value);
            onChange("");
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) =>
                Math.min(index + 1, Math.max(matches.length - 1, 0)),
              );
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Home" && open) {
              event.preventDefault();
              setActiveIndex(0);
            } else if (event.key === "End" && open) {
              event.preventDefault();
              setActiveIndex(Math.max(matches.length - 1, 0));
            } else if (event.key === "Enter" && open && matches[activeIndex]) {
              event.preventDefault();
              choose(matches[activeIndex]);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              setInput(selectedNation?.officialName ?? "");
            }
          }}
        />
        {open && (
          <div
            id={`${id}-listbox`}
            role="listbox"
            class="combobox-list"
            aria-label="Matching Nations"
          >
            {matches.length === 0 ? (
              <p class="combobox-empty">No official name or alias matches.</p>
            ) : (
              matches.map((nation, index) => {
                const matchingAlias = nation.aliases.find((alias) =>
                  nationMatchesInput(
                    { ...nation, officialName: "", aliases: [alias] },
                    input,
                  ),
                );
                return (
                  <div
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    class={
                      index === activeIndex
                        ? "combobox-option is-active"
                        : "combobox-option"
                    }
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(nation);
                    }}
                  >
                    <strong>{nation.officialName}</strong>
                    {matchingAlias &&
                      !nation.officialName
                        .toLocaleLowerCase()
                        .includes(input.toLocaleLowerCase()) && (
                        <small>Alias match: {matchingAlias}</small>
                      )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      {input && (
        <button type="button" class="text-button" onClick={clear}>
          Clear Nation search and selection
        </button>
      )}
      {error && (
        <p class="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}

      <details class="native-fallback">
        <summary>Use the native Nation selector</summary>
        <label for={`${id}-select`}>Select one Nation</label>
        <select
          id={`${id}-select`}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        >
          <option value="">Choose a Nation</option>
          {nations.map((nation) => (
            <option value={nation.id}>{nation.officialName}</option>
          ))}
        </select>
      </details>
    </div>
  );
}
