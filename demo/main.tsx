import { render } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { COPY, EXAMPLES } from "../src/demo/copy";
import type {
  DemoCitation,
  DemoIssue,
  DemoPolicyResponse,
  DemoSource,
} from "../src/demo/types";
import { ApiFailure, loadSources, policyId, readPolicy, search } from "./api";

const VERSION = __APP_VERSION__;
const EMBED = (() => {
  try {
    return new URLSearchParams(window.location.search).get("embed") === "1";
  } catch {
    return false;
  }
})();

const FALLBACK_SOURCES: DemoSource[] = [
  {
    id: "federal-register",
    label: "Federal Register",
    level: "federal",
    status: "live",
    note: "Rules, proposed rules, notices and Presidential documents.",
  },
  {
    id: "govinfo",
    label: "GovInfo",
    level: "federal",
    status: "key_pending",
    note: "Needs an api.data.gov key that has not been added yet.",
  },
  {
    id: "congress",
    label: "Congress.gov",
    level: "federal",
    status: "key_pending",
    note: "Needs an api.data.gov key that has not been added yet.",
  },
  {
    id: "regulations",
    label: "Regulations.gov",
    level: "federal",
    status: "key_pending",
    note: "Needs an api.data.gov key that has not been added yet.",
  },
  {
    id: "washington",
    label: "Washington Legislature",
    level: "state",
    status: "live",
    note: "Look up a bill by number.",
  },
  {
    id: "oregon",
    label: "Oregon Legislature",
    level: "state",
    status: "not_available",
    note: "Off until an agreement and credentials are in place.",
  },
  {
    id: "idaho",
    label: "Idaho Legislature",
    level: "state",
    status: "not_available",
    note: "No usable machine-readable source; a recorded gap.",
  },
];

interface Mark {
  on: boolean;
  note: string;
}
interface Cited {
  citation: DemoCitation;
  policy: DemoPolicyResponse | null;
  note: string;
}
interface Selected {
  citation: DemoCitation;
  state: "loading" | "ready" | "error";
  policy?: DemoPolicyResponse;
  message?: string;
}

const KEY = "ps-demo-citations-v1";
const keyOf = (c: DemoCitation) => `${c.sourceId}:${c.identifier}`;

function loadSaved(): {
  cited: Record<string, Cited>;
  marks: Record<string, Record<string, Mark>>;
} {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* browser storage may be unavailable */
  }
  return { cited: {}, marks: {} };
}

function failureText(error: unknown): string {
  if (error instanceof ApiFailure) {
    if (error.kind === "service") return COPY.serviceDown;
    if (error.kind === "limited") return COPY.rateLimited;
    return error.message;
  }
  return COPY.serviceDown;
}

function helpFor(sourceId: string): string {
  if (sourceId === "washington") return COPY.searchHelpWashington;
  if (sourceId === "congress") return COPY.searchHelpCongress;
  return COPY.searchHelpFederal;
}

function statusText(status: DemoSource["status"]): string {
  if (status === "live") return COPY.liveTitle;
  if (status === "key_pending") return COPY.keyPendingTitle;
  return COPY.notAvailableTitle;
}

function App() {
  const saved = useMemo(loadSaved, []);
  const [sources, setSources] = useState<DemoSource[]>(FALLBACK_SOURCES);
  const [sourceId, setSourceId] = useState("federal-register");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DemoCitation[] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [cited, setCited] = useState<Record<string, Cited>>(saved.cited);
  const [marks, setMarks] = useState<Record<string, Record<string, Mark>>>(
    saved.marks,
  );
  const [exportMessage, setExportMessage] = useState("");
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("embed", EMBED);
    loadSources()
      .then(setSources)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify({ cited, marks }));
    } catch {
      /* optional convenience only */
    }
  }, [cited, marks]);

  const source = sources.find((s) => s.id === sourceId) ?? sources[0];
  const usable = source.status === "live";

  async function runSearch(sid: string, q: string) {
    setBusy(true);
    setMessage(COPY.searching);
    setResults(null);
    setSelected(null);
    try {
      const data = await search(sid, q, 1);
      setResults([...data.results]);
      setMessage(
        data.results.length
          ? COPY.resultsCount(data.results.length, data.total)
          : COPY.noResults,
      );
    } catch (error) {
      setResults([]);
      setMessage(failureText(error));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: Event) {
    event.preventDefault();
    if (!usable || query.trim().length < 2) return;
    void runSearch(sourceId, query.trim());
  }

  function tryExample(sid: string, q: string) {
    setSourceId(sid);
    setQuery(q);
    void runSearch(sid, q);
  }

  async function showIssues(citation: DemoCitation) {
    setSelected({ citation, state: "loading" });
    requestAnimationFrame(() => detailRef.current?.focus());
    if (!citation.textAvailable) {
      setSelected({ citation, state: "error", message: COPY.noTextForSource });
      return;
    }
    try {
      const policy = await readPolicy(citation.sourceId, policyId(citation));
      setSelected({ citation: policy.citation, state: "ready", policy });
      const k = keyOf(citation);
      if (cited[k] && !cited[k].policy) {
        setCited((c) => ({ ...c, [k]: { ...c[k], policy } }));
      }
    } catch (error) {
      setSelected({ citation, state: "error", message: failureText(error) });
    }
  }

  async function addCitation(citation: DemoCitation) {
    const k = keyOf(citation);
    if (cited[k]) return;
    let policy: DemoPolicyResponse | null = null;
    if (selected?.policy && keyOf(selected.citation) === k)
      policy = selected.policy;
    else if (citation.textAvailable) {
      try {
        policy = await readPolicy(citation.sourceId, policyId(citation));
      } catch {
        policy = null;
      }
    }
    setCited((c) => ({
      ...c,
      [k]: { citation: policy?.citation ?? citation, policy, note: "" },
    }));
  }

  function removeCitation(k: string) {
    setCited((c) => {
      const next = { ...c };
      delete next[k];
      return next;
    });
  }

  function setMark(k: string, issue: DemoIssue, patch: Partial<Mark>) {
    setMarks((m) => {
      const current = m[k]?.[issue.id] ?? { on: false, note: "" };
      return { ...m, [k]: { ...m[k], [issue.id]: { ...current, ...patch } } };
    });
  }

  function includeAll(k: string, issues: readonly DemoIssue[]) {
    setMarks((m) => {
      const next = { ...m[k] };
      for (const issue of issues)
        next[issue.id] = { on: true, note: next[issue.id]?.note ?? "" };
      return { ...m, [k]: next };
    });
  }

  async function exportPdf() {
    const entries = Object.entries(cited);
    if (entries.length === 0) {
      setExportMessage(COPY.exportEmpty);
      return;
    }
    setExportMessage(COPY.exportingPdf);
    try {
      const { buildPdf } = await import("../src/demo/pdf");
      const bytes = await buildPdf({
        version: VERSION,
        generatedAt: new Date(),
        entries: entries.map(([k, entry]) => ({
          citation: entry.citation,
          receipt: entry.policy?.receipt ?? null,
          note: entry.note,
          issues: (entry.policy?.issues ?? [])
            .filter((issue) => marks[k]?.[issue.id]?.on)
            .map((issue) => ({
              issue,
              note: marks[k]?.[issue.id]?.note ?? "",
            })),
        })),
      });
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `policy-sentinel-citations-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setExportMessage(COPY.exportDone);
    } catch {
      setExportMessage(COPY.exportFailed);
    }
  }

  const citedEntries = Object.entries(cited);
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
    <div class="shell screen-only">
      <a class="skip" href="#main">
        Skip to the search
      </a>
      <header class="head">
        <h1>{COPY.title}</h1>
        <p class="status" role="note">
          {COPY.statusLine(VERSION)}
        </p>
      </header>

      <main id="main" tabIndex={-1}>
        {!EMBED && (
          <section class="intro" aria-label="About this demo">
            <p>{COPY.introOne}</p>
            <p>{COPY.introTwo}</p>
            <p class="limits">
              <strong>{COPY.limitsTitle}. </strong>
              {COPY.limits(VERSION)}
            </p>
          </section>
        )}
        {EMBED && (
          <p class="limits">
            <strong>{COPY.limitsTitle}. </strong>
            {COPY.limits(VERSION)}
          </p>
        )}

        <div class="grid">
          <div class="col">
            <section aria-labelledby="search-h" class="card">
              <h2 id="search-h">{COPY.searchLabel}</h2>
              <form onSubmit={onSubmit}>
                <fieldset class="sources">
                  <legend>{COPY.sourceLabel}</legend>
                  {(["federal", "state"] as const).map((level) => (
                    <div class="source-group" key={level}>
                      <p class="group-name">
                        {level === "federal" ? "Federal" : "State"}
                      </p>
                      {sources
                        .filter((s) => s.level === level)
                        .map((s) => (
                          <label class={`source ${s.status}`} key={s.id}>
                            <input
                              type="radio"
                              name="source"
                              value={s.id}
                              checked={sourceId === s.id}
                              disabled={s.status !== "live"}
                              onChange={() => setSourceId(s.id)}
                            />
                            <span class="source-name">{s.label}</span>
                            <span class={`badge ${s.status}`}>
                              {statusText(s.status)}
                            </span>
                            <span class="source-note">{s.note}</span>
                          </label>
                        ))}
                    </div>
                  ))}
                </fieldset>
                <label class="field" for="q">
                  {COPY.searchLabel}
                </label>
                <div class="row">
                  <input
                    id="q"
                    type="search"
                    value={query}
                    autoComplete="off"
                    aria-describedby="q-help"
                    onInput={(e) =>
                      setQuery((e.target as HTMLInputElement).value)
                    }
                  />
                  <button
                    type="submit"
                    class="primary"
                    disabled={!usable || busy}
                  >
                    {COPY.searchButton}
                  </button>
                </div>
                <p id="q-help" class="help">
                  {helpFor(sourceId)}
                </p>
              </form>
              <div class="examples">
                <p class="group-name">{COPY.examplesLabel}</p>
                <ul class="chips">
                  {EXAMPLES.map((ex) => (
                    <li key={ex.label}>
                      <button
                        type="button"
                        class="chip"
                        onClick={() => tryExample(ex.source, ex.query)}
                      >
                        {ex.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section aria-labelledby="results-h" class="card">
              <h2 id="results-h">{COPY.resultsTitle}</h2>
              <p class="live" role="status" aria-live="polite">
                {results === null && !busy && !message
                  ? COPY.emptyStart
                  : message}
              </p>
              <ul class="results">
                {(results ?? []).map((c) => {
                  const k = keyOf(c);
                  const isCited = Boolean(cited[k]);
                  return (
                    <li class="result" key={k}>
                      <h3>{c.title}</h3>
                      <p class="cite">
                        {c.identifier}. {c.issuingBody}. {c.kind},{" "}
                        {c.date ?? "date not stated"}. Retrieved{" "}
                        {c.retrievedAt.slice(0, 10)}.
                      </p>
                      {c.summary && <p class="summary">{c.summary}</p>}
                      <p class="actions">
                        <button
                          type="button"
                          onClick={() => void showIssues(c)}
                        >
                          {COPY.showIssues}
                          <span class="sr"> for {c.title}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isCited}
                          onClick={() => void addCitation(c)}
                        >
                          {isCited ? COPY.inCitations : COPY.addCitation}
                          <span class="sr">: {c.title}</span>
                        </button>
                        <a
                          href={c.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {COPY.openOfficial}
                          <span class="sr"> for {c.title}</span>
                        </a>
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <div class="col">
            <section
              aria-labelledby="detail-h"
              class="card"
              ref={detailRef}
              tabIndex={-1}
            >
              <h2 id="detail-h">{COPY.issuesTitle}</h2>
              {!selected && <p class="help">{COPY.issuesNote}</p>}
              {selected && (
                <div>
                  <h3 class="policy-title">{selected.citation.title}</h3>
                  <p class="cite">
                    {selected.citation.identifier}.{" "}
                    {selected.citation.issuingBody}.
                  </p>
                  {selected.state === "loading" && (
                    <p class="live" role="status">
                      {COPY.readingText}
                    </p>
                  )}
                  {selected.state === "error" && (
                    <p class="notice" role="status">
                      {selected.message}
                    </p>
                  )}
                  {selected.state === "ready" && selected.policy && (
                    <div>
                      <p class="help">{COPY.issuesNote}</p>
                      <dl class="receipt">
                        <dt>{COPY.readLabel}</dt>
                        <dd>
                          <a
                            href={selected.policy.receipt.textUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {selected.policy.receipt.textUrl}
                          </a>
                        </dd>
                        <dt>{COPY.receiptLabel}</dt>
                        <dd>
                          <code>{selected.policy.receipt.sha256}</code>
                          <br />
                          {COPY.receiptNote(selected.policy.receipt.bytes)}{" "}
                          Retrieved {selected.policy.receipt.retrievedAt}.
                        </dd>
                        <dt>{COPY.engineLabel}</dt>
                        <dd>
                          {COPY.engineText(
                            selected.policy.engine.parser,
                            selected.policy.engine.parserVersion,
                            selected.policy.engine.rulesVersion,
                          )}
                        </dd>
                      </dl>
                      {selected.policy.issues.length === 0 && (
                        <p>{COPY.noIssues}</p>
                      )}
                      {selected.policy.issues.length > 0 && (
                        <p>
                          <button
                            type="button"
                            disabled={!cited[keyOf(selected.citation)]}
                            onClick={() =>
                              includeAll(
                                keyOf(selected.citation),
                                selected.policy!.issues,
                              )
                            }
                          >
                            Include all in PDF
                          </button>
                          {!cited[keyOf(selected.citation)] && (
                            <span class="help">
                              {" "}
                              Add the policy to your citations first.
                            </span>
                          )}
                        </p>
                      )}
                      {grouped.map((group) => (
                        <section class="group" key={group.label}>
                          <h4>
                            {group.label}{" "}
                            <span class="count">({group.issues.length})</span>
                          </h4>
                          <ul class="issues">
                            {group.issues.map((issue) => {
                              const k = keyOf(selected.citation);
                              const mark = marks[k]?.[issue.id] ?? {
                                on: false,
                                note: "",
                              };
                              const canMark = Boolean(cited[k]);
                              return (
                                <li class="issue" key={issue.id}>
                                  <blockquote>{issue.quote}</blockquote>
                                  <details>
                                    <summary>Why this was flagged</summary>
                                    <dl>
                                      <dt>{COPY.ruleLabel}</dt>
                                      <dd>{issue.rule}</dd>
                                      <dt>{COPY.limitLabel}</dt>
                                      <dd>{issue.limits}</dd>
                                      <dt>{COPY.checkLabel}</dt>
                                      <dd>{issue.check}</dd>
                                      <dt>{COPY.locatorLabel}</dt>
                                      <dd>{issue.locator}</dd>
                                    </dl>
                                  </details>
                                  <label class="check">
                                    <input
                                      type="checkbox"
                                      checked={mark.on}
                                      disabled={!canMark}
                                      onChange={(e) =>
                                        setMark(k, issue, {
                                          on: (e.target as HTMLInputElement)
                                            .checked,
                                        })
                                      }
                                    />
                                    {COPY.includeInPdf}
                                  </label>
                                  {mark.on && (
                                    <label class="field small">
                                      {COPY.issueNote}
                                      <textarea
                                        rows={2}
                                        value={mark.note}
                                        onInput={(e) =>
                                          setMark(k, issue, {
                                            note: (
                                              e.target as HTMLTextAreaElement
                                            ).value,
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
                    </div>
                  )}
                </div>
              )}
            </section>

            <section aria-labelledby="cited-h" class="card">
              <h2 id="cited-h">{COPY.citationsTitle}</h2>
              {citedEntries.length === 0 && (
                <p class="help">{COPY.citationsEmpty}</p>
              )}
              <ul class="cited">
                {citedEntries.map(([k, entry]) => {
                  const count = Object.values(marks[k] ?? {}).filter(
                    (m) => m.on,
                  ).length;
                  return (
                    <li key={k}>
                      <h3>{entry.citation.title}</h3>
                      <p class="cite">
                        {entry.citation.identifier}. {count} passage
                        {count === 1 ? "" : "s"} selected.
                      </p>
                      <label class="field small">
                        {COPY.citationNote}
                        <textarea
                          rows={3}
                          value={entry.note}
                          onInput={(e) => {
                            const note = (e.target as HTMLTextAreaElement)
                              .value;
                            setCited((c) => ({ ...c, [k]: { ...c[k], note } }));
                          }}
                        />
                      </label>
                      <button type="button" onClick={() => removeCitation(k)}>
                        {COPY.remove}
                        <span class="sr">: {entry.citation.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p class="actions">
                <button
                  type="button"
                  class="primary"
                  onClick={() => void exportPdf()}
                >
                  {COPY.exportPdf}
                </button>
                <button type="button" onClick={() => window.print()}>
                  {COPY.printView}
                </button>
              </p>
              <p class="live" role="status" aria-live="polite">
                {exportMessage}
              </p>
            </section>
          </div>
        </div>
      </main>

      {!EMBED && (
        <footer class="foot">
          <p>{COPY.footerSource}</p>
          <p>{COPY.footerCode}</p>
        </footer>
      )}
    </div>
  );
}

function PrintView() {
  const saved = loadSaved();
  const entries = Object.entries(saved.cited);
  return (
    <div class="print-only" aria-hidden="true">
      <h1>{COPY.pdfTitle}</h1>
      <p>
        <strong>
          Prepared with Policy Sentinel {VERSION}, in development.
        </strong>
      </p>
      <p>{COPY.limits(VERSION)}</p>
      {entries.map(([k, entry]) => (
        <section key={k}>
          <h2>{entry.citation.title}</h2>
          <p>
            {entry.citation.identifier}. {entry.citation.issuingBody}.{" "}
            {entry.citation.kind}, {entry.citation.date ?? "date not stated"}.
          </p>
          <p>
            Official URL: {entry.citation.officialUrl}. Retrieved{" "}
            {entry.citation.retrievedAt}.
          </p>
          {entry.note && <p>Note: {entry.note}</p>}
          {(entry.policy?.issues ?? [])
            .filter((i) => saved.marks[k]?.[i.id]?.on)
            .map((i) => (
              <blockquote key={i.id}>
                <strong>{i.label}.</strong> {i.quote}
                {saved.marks[k]?.[i.id]?.note ? (
                  <em> Note: {saved.marks[k][i.id].note}</em>
                ) : null}
              </blockquote>
            ))}
        </section>
      ))}
    </div>
  );
}

function Root() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const before = () => setTick((n) => n + 1);
    window.addEventListener("beforeprint", before);
    return () => window.removeEventListener("beforeprint", before);
  }, []);
  return (
    <>
      <App />
      <PrintView key={tick} />
    </>
  );
}

render(<Root />, document.getElementById("app")!);
