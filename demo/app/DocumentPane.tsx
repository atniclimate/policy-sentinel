import { Fragment } from "preact";
import type { ComponentChildren, RefObject } from "preact";
import { useMemo } from "preact/hooks";
import { COPY } from "../../src/demo/copy";
import { localDay } from "../../src/demo/local-day";
import { MAX_NOTE } from "../../src/demo/report-state";
import type { Mark, ReportState } from "../../src/demo/report-state";
import type {
  DemoCitation,
  DemoIssue,
  DemoPolicyResponse,
} from "../../src/demo/types";
import { keyOf } from "../../src/demo/validation";
import { bodyOf, Leader } from "./parts";

/** The opened document, as the pane shows it. */
export interface Selected {
  citation: DemoCitation;
  /** "unread" is a source whose text the demo does not read: a limit, not a failure. */
  state: "loading" | "ready" | "error" | "unread";
  policy?: DemoPolicyResponse;
  message?: string;
}

/**
 * One side panel of the opened document. Panels render in list order under
 * the document, whatever its state, and only while a document is open.
 */
export interface DocumentPanel {
  /** Unique in the list. */
  readonly id: string;
  readonly render: (selected: Selected) => ComponentChildren;
}

/** A 64 character digest that may break only at its midpoint, so it wraps into even lines. */
function Digest({ value }: { value: string }) {
  const half = value.length / 2;
  return (
    <code>
      {value.slice(0, half)}
      <wbr />
      {value.slice(half)}
    </code>
  );
}

/** The opened document: its receipt, its flagged passages and the marks on them. */
export function DocumentPane({
  selected,
  cited,
  marks,
  paneTab,
  paneRef,
  onIncludeAll,
  onMark,
  panels = [],
}: {
  selected: Selected | null;
  cited: ReportState["cited"];
  marks: ReportState["marks"];
  paneTab: number;
  paneRef: RefObject<HTMLElement>;
  onIncludeAll: (k: string, issues: readonly DemoIssue[]) => void;
  onMark: (k: string, issue: DemoIssue, patch: Partial<Mark>) => void;
  panels?: readonly DocumentPanel[];
}) {
  const grouped = useMemo(() => {
    const out = new Map<string, { label: string; issues: DemoIssue[] }>();
    for (const issue of selected?.policy?.issues ?? []) {
      const entry = out.get(issue.type) ?? { label: issue.label, issues: [] };
      entry.issues.push(issue);
      out.set(issue.type, entry);
    }
    return [...out.values()];
  }, [selected]);
  return (
    <section
      class="pane pane-issues"
      aria-labelledby="detail-h"
      ref={paneRef}
      tabIndex={paneTab}
    >
      <h2 id="detail-h">{COPY.issuesTitle}</h2>
      <p
        class={selected?.state === "error" ? "live notice" : "live"}
        role="status"
        aria-live="polite"
      >
        {selected?.state === "loading"
          ? COPY.readingText
          : selected?.state === "ready"
            ? COPY.issuesReady(
                selected.citation.title,
                selected.policy?.issues.length ?? 0,
              )
            : (selected?.message ?? "")}
      </p>
      {!selected && <p class="help">{COPY.issuesNote}</p>}
      {selected && (
        <div class="detail">
          <h3 class="policy-title">{selected.citation.title}</h3>
          <p class="row">
            <span class="row-k">{bodyOf(selected.citation)}</span>
            <Leader />
            <span class="row-v mono">{selected.citation.identifier}</span>
          </p>
          {selected.state === "ready" && selected.policy && (
            <>
              <p class="help">{COPY.issuesNote}</p>
              {cited[keyOf(selected.citation)]?.policy && (
                <p class="help">
                  {COPY.savedTextNote(
                    localDay(selected.policy.receipt.retrievedAt),
                  )}
                </p>
              )}
              <dl class="receipt">
                <dt>{COPY.readLabel}</dt>
                <dd>
                  <a
                    class="mono"
                    href={selected.policy.receipt.textUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {selected.policy.receipt.textUrl}
                  </a>
                </dd>
                <dt>{COPY.receiptLabel}</dt>
                <dd>
                  <Digest value={selected.policy.receipt.sha256} />
                  <span>
                    {COPY.receiptNote(selected.policy.receipt.bytes)}{" "}
                    {COPY.retrieved(
                      localDay(selected.policy.receipt.retrievedAt),
                    )}
                  </span>
                </dd>
                <dt>{COPY.engineLabel}</dt>
                <dd>
                  <span>
                    {COPY.engineText(
                      selected.policy.engine.parser,
                      selected.policy.engine.parserVersion,
                      selected.policy.engine.rulesVersion,
                    )}
                  </span>
                  <span>{COPY.configLabel}</span>
                  <Digest value={selected.policy.engine.parserConfigDigest} />
                </dd>
              </dl>
              {selected.policy.issues.length === 0 && <p>{COPY.noIssues}</p>}
              {selected.policy.issues.length > 0 && (
                <p class="actions">
                  <button
                    type="button"
                    class="btn"
                    disabled={!cited[keyOf(selected.citation)]}
                    onClick={() =>
                      onIncludeAll(
                        keyOf(selected.citation),
                        selected.policy!.issues,
                      )
                    }
                  >
                    {COPY.includeAll}
                  </button>
                  {!cited[keyOf(selected.citation)] && (
                    <span class="help">{COPY.addFirst}</span>
                  )}
                </p>
              )}
              {grouped.map((group) => (
                <section class="group" key={group.label}>
                  <div class="row">
                    <h4>{group.label}</h4>
                    <Leader />
                    <span class="row-v mono">{group.issues.length}</span>
                  </div>
                  <ul class="issues">
                    {group.issues.map((issue) => {
                      const k = keyOf(selected.citation);
                      const mark = marks[k]?.[issue.id] ?? {
                        on: false,
                        note: "",
                      };
                      const canMark = Boolean(cited[k]);
                      // Names the passage its controls belong to. Rule ids are a type and a number.
                      const passage = `passage-${issue.id}`;
                      return (
                        <li class="issue" key={issue.id}>
                          {issue.type === "consultation_absent" ? (
                            <p class="assessment" id={passage}>
                              <strong>{COPY.assessmentLead} </strong>
                              {issue.quote}
                            </p>
                          ) : (
                            <blockquote id={passage}>{issue.quote}</blockquote>
                          )}
                          <details>
                            <summary>{COPY.whyFlagged}</summary>
                            <dl>
                              <dt>{COPY.ruleLabel}</dt>
                              <dd>{issue.rule}</dd>
                              <dt>{COPY.limitLabel}</dt>
                              <dd>{issue.limits}</dd>
                              <dt>{COPY.checkLabel}</dt>
                              <dd>{issue.check}</dd>
                              <dt>{COPY.locatorLabel}</dt>
                              <dd class="mono">{issue.locator}</dd>
                            </dl>
                          </details>
                          <label class="check">
                            <input
                              type="checkbox"
                              checked={mark.on}
                              disabled={!canMark}
                              aria-describedby={passage}
                              onChange={(e) =>
                                onMark(k, issue, {
                                  on: (e.target as HTMLInputElement).checked,
                                })
                              }
                            />
                            {COPY.includeInPdf}
                          </label>
                          {mark.on && (
                            <label class="field">
                              {COPY.issueNote}
                              <textarea
                                rows={2}
                                maxLength={MAX_NOTE}
                                value={mark.note}
                                aria-describedby={passage}
                                onInput={(e) =>
                                  onMark(k, issue, {
                                    note: (e.target as HTMLTextAreaElement)
                                      .value,
                                  })
                                }
                              />
                            </label>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </>
          )}
          {panels.map((panel) => (
            <Fragment key={panel.id}>{panel.render(selected)}</Fragment>
          ))}
        </div>
      )}
    </section>
  );
}
