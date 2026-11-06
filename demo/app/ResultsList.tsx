import type { ComponentChildren } from "preact";
import { COPY } from "../../src/demo/copy";
import { groupDiscovery } from "../../src/demo/discovery";
import type {
  DiscoveryRow,
  Lane,
  LaneGroup,
  LaneSearch,
  Plan,
} from "../../src/demo/discovery";
import type { DemoCitation, LinkFamily } from "../../src/demo/types";

/**
 * The submitted plan stays attached to results while the form is edited. One
 * shape serves typed searches, examples, committee areas and NCAI drafts.
 */
export interface Found {
  plan: Plan;
  searches: readonly LaneSearch[];
  rows: readonly DiscoveryRow[];
}

/** One document; under a section heading its title is one level lower. */
export type RowRenderer = (
  row: DiscoveryRow,
  nested: boolean,
) => ComponentChildren;

/** Results sections in reading order, whatever order the plan met them in. */
const GROUP_ORDER: readonly LaneGroup[] = [
  "policy",
  "legislation",
  "bill",
  "case",
  "related",
];

const STATE_SOURCES = new Set(["washington", "oregon", "idaho"]);
/** GovInfo collection codes, as its rows state them in `kind`. */
const GOVINFO_CASES = new Set(["USCOURTS", "USREPORTS"]);
const GOVINFO_LAWS = new Set([
  "BILLS",
  "PLAW",
  "STATUTE",
  "USCODE",
  "CRPT",
  "CPRT",
  "CHRG",
  "CDOC",
  "CREC",
]);

/**
 * The results family a row's own source and collection place it in. It picks
 * the row's renderer only; sections and their titles stay the lane groups.
 */
export function familyOf(citation: DemoCitation): LinkFamily {
  const { sourceId, kind } = citation;
  if (sourceId === "grants") return "grants";
  if (STATE_SOURCES.has(sourceId)) return "state";
  if (sourceId === "congress") return "laws_and_bills";
  if (sourceId === "govinfo") {
    if (GOVINFO_CASES.has(kind)) return "cases";
    if (GOVINFO_LAWS.has(kind)) return "laws_and_bills";
  }
  return "rules_and_notices";
}

/**
 * Lane outcomes and result rows. A draft's or record's plan is shown in
 * sections; a typed, example or area search keeps one list. Each row goes to
 * its family's renderer, or to `row` when its family has none.
 */
export function ResultsList({
  found,
  sequence,
  outcome,
  row,
  families = {},
}: {
  found: Found | null;
  /** The search's sequence number: a new search starts the lists afresh. */
  sequence: number;
  outcome: (plan: Plan, lane: Lane, search: LaneSearch) => ComponentChildren;
  row: RowRenderer;
  families?: Partial<Record<LinkFamily, RowRenderer>>;
}) {
  const kind = found?.plan.seed.kind;
  const sectioned = kind === "draft" || kind === "record";
  const views = found
    ? groupDiscovery(found.plan, found.searches, found.rows).sort(
        (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group),
      )
    : [];
  const merged =
    found?.rows.reduce((sum, each) => sum + each.alternates.length, 0) ?? 0;
  const render = (each: DiscoveryRow, nested: boolean) =>
    (families[familyOf(each.citation)] ?? row)(each, nested);
  return (
    <>
      {found && !sectioned && (
        <ul class="source-outcomes">
          {views.flatMap((view) =>
            view.lanes.map(({ lane, search }) =>
              outcome(found.plan, lane, search),
            ),
          )}
        </ul>
      )}
      {merged > 0 && <p class="help">{COPY.mergeNote(merged)}</p>}
      {found && sectioned ? (
        views.map((view) => (
          <div class="discovery-group" key={view.group}>
            <h3>{COPY.groupTitles[view.group]}</h3>
            <ul class="source-outcomes">
              {view.lanes.map(({ lane, search }) =>
                outcome(found.plan, lane, search),
              )}
            </ul>
            <ul class="results" key={`${sequence}-${view.group}`}>
              {view.rows.map((each) => render(each, true))}
            </ul>
          </div>
        ))
      ) : (
        <ul class="results" key={sequence}>
          {(found?.rows ?? []).map((each) => render(each, false))}
        </ul>
      )}
    </>
  );
}
