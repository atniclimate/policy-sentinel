import type { ComponentChildren } from "preact";
import { COPY } from "../../src/demo/copy";

/** What the box hands its input, whichever input fills the slot. */
export interface SearchField {
  /** The label, the page's focus calls and every error refer to this id. */
  readonly id: "q";
  readonly value: string;
  readonly describedBy: string;
  readonly invalid: boolean;
  readonly onInput: (value: string) => void;
}

const plainInput = (field: SearchField) => (
  <input
    id={field.id}
    type="search"
    value={field.value}
    autoComplete="off"
    maxLength={200}
    aria-describedby={field.describedBy}
    aria-invalid={field.invalid ? "true" : undefined}
    onInput={(e) => field.onInput((e.target as HTMLInputElement).value)}
  />
);

/**
 * The search form. Pressing Search, Enter in the box, or anything in the
 * `input` slot that submits the form all take the one `onSubmit` path.
 */
export function SearchBox({
  value,
  onInput,
  onSubmit,
  help,
  error,
  blockedBy,
  blockedNote,
  off,
  criteria,
  input = plainInput,
  children,
}: {
  value: string;
  onInput: (value: string) => void;
  onSubmit: (event: Event) => void;
  help: string;
  /** Why the last search was refused, as an alert; empty for none. */
  error: string;
  /** The id of the note that says why Search is off, when it is. */
  blockedBy?: string;
  /** Shows the plain note that no source is checked. */
  blockedNote: boolean;
  /** Search is off by aria-disabled, never disabled, so it keeps focus. */
  off: boolean;
  /** Fields between the box's help and Search: dates, type, eligibility. */
  criteria?: ComponentChildren;
  /** Replaces the plain input, with the same id and description. */
  input?: (field: SearchField) => ComponentChildren;
  /** Scope and sources, above the box. */
  children?: ComponentChildren;
}) {
  return (
    <form onSubmit={onSubmit}>
      {children}
      <div class="zone">
        <label class="field" for="q">
          {COPY.queryLabel}
        </label>
        {input({
          id: "q",
          value,
          describedBy: error
            ? "q-help q-error"
            : blockedBy
              ? `q-help ${blockedBy}`
              : "q-help",
          invalid: Boolean(error),
          onInput,
        })}
        <p id="q-help" class="help">
          {help}
        </p>
        {criteria}
        {error && (
          <p id="q-error" class="notice" role="alert">
            {error}
          </p>
        )}
        {blockedNote && (
          <p id="q-blocked" class="notice">
            {COPY.noSourceChecked}
          </p>
        )}
        <button
          type="submit"
          class="btn primary"
          aria-disabled={off}
          aria-describedby={blockedBy}
        >
          {COPY.searchButton}
        </button>
      </div>
    </form>
  );
}
