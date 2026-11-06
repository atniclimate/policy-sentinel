import type { ComponentChildren } from "preact";
import { useRef } from "preact/hooks";
import { modes as M } from "../../src/demo/copy/modes";
import type { Mode } from "../../src/demo/mode";

/**
 * The mode tabs, as the WAI-ARIA tabs pattern: one tab stop (roving tabindex),
 * arrow keys wrap, Home and End jump, and selection follows focus. Changing a
 * mode never re-runs a search; the caller only swaps panels and the export.
 */
export function ModeTabs({
  modes,
  current,
  onChange,
  children,
}: {
  modes: readonly Mode[];
  current: Mode;
  onChange: (mode: Mode) => void;
  children?: ComponentChildren;
}) {
  const list = useRef<HTMLDivElement>(null);
  const move = (event: KeyboardEvent) => {
    const at = modes.indexOf(current);
    const next =
      event.key === "ArrowRight"
        ? (at + 1) % modes.length
        : event.key === "ArrowLeft"
          ? (at - 1 + modes.length) % modes.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? modes.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    onChange(modes[next]);
    list.current
      ?.querySelector<HTMLElement>(`#mode-tab-${modes[next]}`)
      ?.focus();
  };
  return (
    <div class="mode-tabs">
      <div role="tablist" aria-label={M.label} ref={list} onKeyDown={move}>
        {modes.map((mode) => (
          <button
            type="button"
            role="tab"
            key={mode}
            id={`mode-tab-${mode}`}
            aria-selected={mode === current}
            aria-controls="mode-panel"
            tabIndex={mode === current ? 0 : -1}
            onClick={() => onChange(mode)}
          >
            {M.names[mode]}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="mode-panel"
        aria-labelledby={`mode-tab-${current}`}
        tabIndex={0}
      >
        <p class="help">{M.help}</p>
        {children}
      </div>
    </div>
  );
}
