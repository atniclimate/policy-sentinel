import { COPY } from "../../src/demo/copy";
import type { DemoSource } from "../../src/demo/types";
import { Leader } from "./parts";

function statusText(status: DemoSource["status"]): string {
  if (status === "live") return COPY.liveTitle;
  if (status === "key_pending") return COPY.keyPendingTitle;
  if (status === "unknown") return COPY.notCheckedTitle;
  return COPY.notAvailableTitle;
}

/** Filled is live, half is pending, outline is not available or not checked. */
function markClass(status: DemoSource["status"]): string {
  if (status === "live") return "mark is-full";
  return status === "key_pending" ? "mark is-half" : "mark";
}

function SourceStatus({ status }: { status: DemoSource["status"] }) {
  return (
    <span class="row-v status">
      <span class={markClass(status)} aria-hidden="true" />
      {statusText(status)}
    </span>
  );
}

/**
 * The sources a search can ask, inside the search form: the federal checklist,
 * or the state choice with that state's availability note.
 */
export function SourcesPanel({
  scope,
  federal,
  states,
  checked,
  stateId,
  onToggle,
  onState,
}: {
  scope: "federal" | "state";
  federal: readonly DemoSource[];
  states: readonly DemoSource[];
  /** Federal source ids the reader checked. */
  checked: readonly string[];
  stateId: string;
  onToggle: (id: string, on: boolean) => void;
  onState: (id: string) => void;
}) {
  const chosenState = states.find((item) => item.id === stateId);
  return scope === "federal" ? (
    <fieldset class="zone">
      <legend class="eyebrow">{COPY.sourcesLegend}</legend>
      {federal.map((s) => (
        <label
          class={`source${s.status === "live" ? "" : " is-off"}`}
          key={s.id}
        >
          <input
            type="checkbox"
            checked={s.status === "live" && checked.includes(s.id)}
            disabled={s.status !== "live"}
            onChange={(e) =>
              onToggle(s.id, (e.target as HTMLInputElement).checked)
            }
          />
          <span class="row">
            <span class="row-k">{s.label}</span>
            <Leader />
            <SourceStatus status={s.status} />
          </span>
          <span class="source-note">{COPY.capability[s.id] ?? s.note}</span>
        </label>
      ))}
    </fieldset>
  ) : (
    <div class="zone">
      <label class="field" for="state">
        {COPY.stateLabel}
      </label>
      <select
        id="state"
        value={stateId}
        aria-describedby="state-note"
        onChange={(e) => onState((e.target as HTMLSelectElement).value)}
      >
        {states.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {chosenState && (
        <div id="state-note" class="source">
          <span class="row">
            <span class="row-k">{COPY.availabilityLabel}</span>
            <Leader />
            <SourceStatus status={chosenState.status} />
          </span>
          <span class="source-note">{chosenState.note}</span>
        </div>
      )}
    </div>
  );
}

/** Every source with its status and catalog note, as the About dialog lists them. */
export function SourceList({ sources }: { sources: readonly DemoSource[] }) {
  return (
    <ul class="rows">
      {sources.map((s) => (
        <li class="source" key={s.id}>
          <span class="row">
            <span class="row-k">{s.label}</span>
            <Leader />
            <SourceStatus status={s.status} />
          </span>
          <span class="source-note">{s.note}</span>
        </li>
      ))}
    </ul>
  );
}
