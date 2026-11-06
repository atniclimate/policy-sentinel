import { COPY } from "../../src/demo/copy";
import { sourceModel as S } from "../../src/demo/copy/sources";
import type { SourceRow } from "../../src/demo/source-model";
import type { DemoSource } from "../../src/demo/types";
import { Leader } from "./parts";

function statusText(status: DemoSource["status"]): string {
  if (status === "live") return COPY.liveTitle;
  if (status === "key_pending") return COPY.keyPendingTitle;
  if (status === "unknown") return COPY.notCheckedTitle;
  return COPY.notAvailableTitle;
}

/** Filled is enabled, half is pending, outline is anything else. */
function markClass(status: DemoSource["status"]): string {
  if (status === "live") return "mark is-full";
  return status === "key_pending" ? "mark is-half" : "mark";
}

/**
 * A source's state: the source model's wording when the page passes rows
 * (safeguard 8: nothing called live), otherwise the catalog status.
 */
function SourceStatus({
  status,
  row,
}: {
  status: DemoSource["status"];
  row?: SourceRow;
}) {
  return (
    <span class="row-v status">
      <span
        class={
          row
            ? row.model.enabled
              ? "mark is-full"
              : "mark"
            : markClass(status)
        }
        aria-hidden="true"
      />
      {row ? row.stateText : statusText(status)}
    </span>
  );
}

const rowOf = (rows: readonly SourceRow[] | undefined, id: string) =>
  rows?.find((row) => row.id === id);

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
  rows,
}: {
  scope: "federal" | "state";
  federal: readonly DemoSource[];
  states: readonly DemoSource[];
  /** Federal source ids the reader checked. */
  checked: readonly string[];
  stateId: string;
  onToggle: (id: string, on: boolean) => void;
  onState: (id: string) => void;
  /** The source model (src/demo/source-model.ts); its wording replaces the catalog badge. */
  rows?: readonly SourceRow[];
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
            <SourceStatus status={s.status} row={rowOf(rows, s.id)} />
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
            <SourceStatus
              status={chosenState.status}
              row={rowOf(rows, chosenState.id)}
            />
          </span>
          <span class="source-note">{chosenState.note}</span>
        </div>
      )}
    </div>
  );
}

/** One source model row: state, this search's outcome, coverage limit and freshness. */
function ModelRow({ row }: { row: SourceRow }) {
  return (
    <li class="source">
      <span class="row">
        <span class="row-k">{row.label}</span>
        <Leader />
        <SourceStatus status="unknown" row={row} />
      </span>
      {row.outcomeText && (
        <span class="source-note">
          {S.outcomeLabel}: {row.outcomeText}
        </span>
      )}
      <span class="source-note">
        {S.coverageLabel}: <span>{row.model.coverageLimit}</span>
      </span>
      <span class="source-note">
        {S.freshnessLabel}: {row.model.freshnessPolicy}
      </span>
      {row.url && (
        <a href={row.url} target="_blank" rel="noopener noreferrer">
          {S.openSource}: {row.label}
        </a>
      )}
    </li>
  );
}

/**
 * Every source, as the About dialog lists them: with rows, the whole source
 * model (Worker sources, static indexes, link-outs and gaps); otherwise the
 * catalog status and note.
 */
export function SourceList({
  sources,
  rows,
}: {
  sources: readonly DemoSource[];
  rows?: readonly SourceRow[];
}) {
  if (rows)
    return (
      <ul class="rows">
        {rows.map((row) => (
          <ModelRow row={row} key={row.id} />
        ))}
      </ul>
    );
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
