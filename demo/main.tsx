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
import {
  attachPolicy,
  emptyReport,
  MAX_CITATIONS,
  MAX_NOTE,
  removeFromReport,
  reportEntries,
  restoreReport,
  serializeReport,
  STORAGE_KEY,
} from "../src/demo/report-state";
import type {
  Mark,
  ReportState,
  RestoredReport,
} from "../src/demo/report-state";
import { keyOf } from "../src/demo/validation";

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
].map((source): DemoSource => ({
  ...source,
  level: source.level as DemoSource["level"],
  status: "unknown",
  note: "Availability has not been checked.",
}));
interface Selected {
  citation: DemoCitation;
  state: "loading" | "ready" | "error";
  policy?: DemoPolicyResponse;
  message?: string;
}

function loadSaved(): RestoredReport {
  try {
    return restoreReport(window.sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return {
      report: emptyReport(),
      notice:
        "Browser storage is unavailable. Your citations work here, but will not be restored after a reload.",
    };
  }
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
  if (status === "unknown") return "Not checked";
  return COPY.notAvailableTitle;
}

export function App() {
  const saved = useMemo(loadSaved, []);
  const [sources, setSources] = useState<DemoSource[]>(FALLBACK_SOURCES);
  const [sourceId, setSourceId] = useState("federal-register");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DemoCitation[] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [report, setReport] = useState<ReportState>(saved.report);
  const reportRef = useRef(report);
  const { cited, marks } = report;
  const [storageMessage, setStorageMessage] = useState("");
  const [citationMessage, setCitationMessage] = useState("");
  const [sourceMessage, setSourceMessage] = useState(
    "Checking source availability.",
  );
  const [sourceBusy, setSourceBusy] = useState(true);
  const [queryError, setQueryError] = useState("");
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [exportBusy, setExportBusy] = useState(false);
  const exporting = useRef(false);
  const [exportMessage, setExportMessage] = useState("");
  const detailRef = useRef<HTMLElement>(null);
  const searchRequest = useRef<{
    sequence: number;
    controller?: AbortController;
  }>({ sequence: 0 });
  const detailSequence = useRef(0);
  const selectedKey = useRef<string | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const revisions = useRef(new Map<string, number>());
  const policyRequests = useRef(
    new Map<
      string,
      { controller: AbortController; promise: Promise<DemoPolicyResponse> }
    >(),
  );
  const sourceRequest = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  function updateReport(update: (current: ReportState) => ReportState) {
    const next = update(reportRef.current);
    reportRef.current = next;
    setReport(next);
  }

  async function refreshSources(moveFocus = false) {
    sourceRequest.current?.abort();
    const controller = new AbortController();
    sourceRequest.current = controller;
    setSourceBusy(true);
    setSourceMessage("Checking source availability.");
    try {
      const catalog = await loadSources(controller.signal);
      if (sourceRequest.current !== controller || !mounted.current) return;
      setSources(catalog);
      const selectedSource =
        catalog.find((item) => item.id === sourceId) ??
        catalog.find((item) => item.status === "live") ??
        catalog[0];
      setSourceId(selectedSource.id);
      setSourceMessage("Source availability checked.");
      if (moveFocus)
        requestAnimationFrame(() => {
          if (mounted.current) document.getElementById("q")?.focus();
        });
    } catch {
      if (sourceRequest.current !== controller || !mounted.current) return;
      setSources(FALLBACK_SOURCES);
      setSourceMessage(
        "Source availability could not be checked. Retry to search; your citations remain available.",
      );
    } finally {
      if (sourceRequest.current === controller && mounted.current)
        setSourceBusy(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    document.documentElement.classList.toggle("embed", EMBED);
    void refreshSources();
    let focused: HTMLElement | null = null;
    const beforePrint = () => {
      focused =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    };
    const afterPrint = () => {
      if (focused?.isConnected) focused.focus();
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      mounted.current = false;
      sourceRequest.current?.abort();
      searchRequest.current.controller?.abort();
      for (const request of policyRequests.current.values())
        request.controller.abort();
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, serializeReport(report));
      setStorageMessage("");
    } catch {
      setStorageMessage(
        "This citation list could not be saved in browser storage. Keep this page open or export it; printing uses the current list.",
      );
    }
  }, [report]);

  const source = sources.find((s) => s.id === sourceId);
  const usable = source?.status === "live";

  function clearSelection() {
    detailSequence.current += 1;
    selectedKey.current = null;
    setSelected(null);
  }

  function changeSource(sid: string) {
    searchRequest.current.controller?.abort();
    searchRequest.current.sequence += 1;
    setSourceId(sid);
    setBusy(false);
    setResults(null);
    setMessage("");
    setQueryError("");
    clearSelection();
  }

  async function runSearch(sid: string, q: string) {
    searchRequest.current.controller?.abort();
    const sequence = searchRequest.current.sequence + 1;
    const controller = new AbortController();
    searchRequest.current = { sequence, controller };
    const ownsView = () =>
      mounted.current && sequence === searchRequest.current.sequence;
    setBusy(true);
    setQueryError("");
    setMessage(COPY.searching);
    setResults(null);
    clearSelection();
    try {
      const data = await search(sid, q, 1, controller.signal);
      if (!ownsView()) return;
      setResults([...data.results]);
      setMessage(
        data.results.length
          ? COPY.resultsCount(data.results.length, data.total)
          : COPY.noResults,
      );
    } catch (error) {
      if (!ownsView()) return;
      setResults([]);
      setMessage(failureText(error));
    } finally {
      if (ownsView()) setBusy(false);
    }
  }

  function onSubmit(event: Event) {
    event.preventDefault();
    if (!usable) return;
    if (query.trim().length < 2 || query.trim().length > 200) {
      setQueryError("Enter between 2 and 200 characters to search.");
      document.getElementById("q")?.focus();
      return;
    }
    void runSearch(sourceId, query.trim());
  }

  function tryExample(sid: string, q: string) {
    if (!sources.some((item) => item.id === sid && item.status === "live"))
      return;
    setSourceId(sid);
    setQuery(q);
    void runSearch(sid, q);
  }

  function requestPolicy(citation: DemoCitation): Promise<DemoPolicyResponse> {
    const key = keyOf(citation);
    const existing = policyRequests.current.get(key);
    if (existing) return existing.promise;
    const controller = new AbortController();
    const promise = readPolicy(
      citation.sourceId,
      policyId(citation),
      controller.signal,
    ).finally(() => {
      if (policyRequests.current.get(key)?.promise === promise)
        policyRequests.current.delete(key);
    });
    policyRequests.current.set(key, { controller, promise });
    return promise;
  }

  async function showIssues(citation: DemoCitation) {
    const key = keyOf(citation);
    const sequence = ++detailSequence.current;
    const revision = revisions.current.get(key) ?? 0;
    selectedKey.current = key;
    const snapshot = reportRef.current.cited[key]?.policy;
    setSelected({ citation, state: "loading" });
    requestAnimationFrame(() => {
      if (mounted.current && sequence === detailSequence.current)
        detailRef.current?.focus();
    });
    if (snapshot) {
      setSelected({
        citation: snapshot.citation,
        state: "ready",
        policy: snapshot,
      });
      return;
    }
    if (!citation.textAvailable) {
      setSelected({ citation, state: "error", message: COPY.noTextForSource });
      return;
    }
    try {
      const policy = await requestPolicy(citation);
      if (!mounted.current) return;
      if ((revisions.current.get(key) ?? 0) === revision)
        updateReport((current) => attachPolicy(current, key, policy));
      if (sequence !== detailSequence.current) return;
      const authoritative = reportRef.current.cited[key]?.policy ?? policy;
      setSelected({
        citation: authoritative.citation,
        state: "ready",
        policy: authoritative,
      });
    } catch (error) {
      if (!mounted.current || sequence !== detailSequence.current) return;
      setSelected({ citation, state: "error", message: failureText(error) });
    }
  }

  async function addCitation(citation: DemoCitation) {
    const k = keyOf(citation);
    if (reportRef.current.cited[k]) return;
    if (Object.keys(reportRef.current.cited).length >= MAX_CITATIONS) {
      setCitationMessage(
        `This list holds up to ${MAX_CITATIONS} citations. Export it or remove a citation before adding another.`,
      );
      return;
    }
    const view = selectedRef.current;
    const policy =
      view?.policy && keyOf(view.citation) === k ? view.policy : null;
    const revision = revisions.current.get(k) ?? 0;
    updateReport((current) => ({
      ...current,
      cited: {
        ...current.cited,
        [k]: { citation: policy?.citation ?? citation, policy, note: "" },
      },
    }));
    setCitationMessage(
      `Added ${citation.title}.${!policy && citation.textAvailable ? " Reading the official text." : ""}`,
    );
    if (policy || !citation.textAvailable) return;
    setPending((current) => ({ ...current, [k]: true }));
    try {
      const fetched = await requestPolicy(citation);
      if (!mounted.current || (revisions.current.get(k) ?? 0) !== revision)
        return;
      updateReport((current) => attachPolicy(current, k, fetched));
      const latestReport: ReportState = reportRef.current;
      const authoritative = latestReport.cited[k]?.policy;
      if (!authoritative) throw new Error("Citation evidence was not attached");
      if (selectedKey.current === k)
        setSelected({
          citation: authoritative.citation,
          policy: authoritative,
          state: "ready",
        });
      setCitationMessage(`Citation and text saved for ${citation.title}.`);
    } catch {
      if (mounted.current && (revisions.current.get(k) ?? 0) === revision)
        setCitationMessage(
          `Citation added for ${citation.title}, but its text could not be read. Use Show issues to retry.`,
        );
    } finally {
      if (mounted.current && (revisions.current.get(k) ?? 0) === revision)
        setPending((current) => {
          const next = { ...current };
          delete next[k];
          return next;
        });
    }
  }

  function removeCitation(k: string) {
    revisions.current.set(k, (revisions.current.get(k) ?? 0) + 1);
    policyRequests.current.get(k)?.controller.abort();
    policyRequests.current.delete(k);
    setPending((current) => {
      const next = { ...current };
      delete next[k];
      return next;
    });
    updateReport((current) => removeFromReport(current, k));
    if (selectedKey.current === k) clearSelection();
    setCitationMessage("Citation, selected passages and notes removed.");
  }

  function setMark(k: string, issue: DemoIssue, patch: Partial<Mark>) {
    updateReport((currentReport) => {
      if (
        !currentReport.cited[k]?.policy?.issues.some(
          (candidate) =>
            candidate.id === issue.id && candidate.quote === issue.quote,
        )
      )
        return currentReport;
      const m = currentReport.marks;
      const current = m[k]?.[issue.id] ?? { on: false, note: "" };
      return {
        ...currentReport,
        marks: { ...m, [k]: { ...m[k], [issue.id]: { ...current, ...patch } } },
      };
    });
  }

  function includeAll(k: string, issues: readonly DemoIssue[]) {
    updateReport((currentReport) => {
      const policy = currentReport.cited[k]?.policy;
      if (!policy || policy.issues !== issues) return currentReport;
      const m = currentReport.marks;
      const next = { ...m[k] };
      for (const issue of issues)
        next[issue.id] = { on: true, note: next[issue.id]?.note ?? "" };
      return { ...currentReport, marks: { ...m, [k]: next } };
    });
  }

  async function exportPdf() {
    if (exporting.current) return;
    const entries = reportEntries(reportRef.current);
    if (entries.length === 0) {
      setExportMessage(COPY.exportEmpty);
      return;
    }
    setExportMessage(COPY.exportingPdf);
    exporting.current = true;
    setExportBusy(true);
    try {
      const { buildPdf } = await import("../src/demo/pdf");
      const bytes = await buildPdf({
        version: VERSION,
        generatedAt: new Date(),
        entries,
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
    } catch (error) {
      setExportMessage(
        error instanceof Error && error.name === "PdfEncodingError"
          ? COPY.exportUnsupported
          : COPY.exportFailed,
      );
    } finally {
      exporting.current = false;
      setExportBusy(false);
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
    <>
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
                <p class="live" role="status">
                  {sourceMessage}
                </p>
                {sources.every((item) => item.status === "unknown") && (
                  <button
                    type="button"
                    disabled={sourceBusy}
                    onClick={() => void refreshSources(true)}
                  >
                    {sourceBusy
                      ? "Checking sources…"
                      : "Retry source availability"}
                  </button>
                )}
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
                                onChange={() => changeSource(s.id)}
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
                      maxLength={200}
                      aria-describedby={
                        queryError ? "q-help q-error" : "q-help"
                      }
                      aria-invalid={queryError ? "true" : undefined}
                      onInput={(e) => {
                        setQuery((e.target as HTMLInputElement).value);
                        setQueryError("");
                      }}
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
                  {queryError && (
                    <p id="q-error" class="notice" role="alert">
                      {queryError}
                    </p>
                  )}
                </form>
                <div class="examples">
                  <p class="group-name">{COPY.examplesLabel}</p>
                  <ul class="chips">
                    {EXAMPLES.map((ex) => (
                      <li key={ex.label}>
                        <button
                          type="button"
                          class="chip"
                          disabled={
                            !sources.some(
                              (item) =>
                                item.id === ex.source && item.status === "live",
                            )
                          }
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
                            aria-label={`${COPY.showIssues} for ${c.title}`}
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
                            {pending[k]
                              ? "Reading cited text…"
                              : isCited
                                ? COPY.inCitations
                                : COPY.addCitation}
                            <span class="sr">: {c.title}</span>
                          </button>
                          <a
                            href={c.officialUrl}
                            aria-label={`${COPY.openOfficial} for ${c.title}`}
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
                <p class="live" role="status" aria-live="polite">
                  {selected?.state === "loading"
                    ? COPY.readingText
                    : selected?.state === "ready"
                      ? `Issues ready for ${selected.citation.title}. ${selected.policy?.issues.length ?? 0} flags.`
                      : selected?.state === "error"
                        ? selected.message
                        : ""}
                </p>
                {!selected && <p class="help">{COPY.issuesNote}</p>}
                {selected && (
                  <div>
                    <h3 class="policy-title">{selected.citation.title}</h3>
                    <p class="cite">
                      {selected.citation.identifier}.{" "}
                      {selected.citation.issuingBody}.
                    </p>
                    {selected.state === "ready" && selected.policy && (
                      <div>
                        <p class="help">{COPY.issuesNote}</p>
                        {cited[keyOf(selected.citation)]?.policy && (
                          <p class="help">
                            Showing the text saved with this citation, retrieved{" "}
                            {selected.policy.receipt.retrievedAt}. Remove and
                            add the citation to read a new version; removing
                            also clears its notes and selections.
                          </p>
                        )}
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
                            {COPY.receiptNote(
                              selected.policy.receipt.bytes,
                            )}{" "}
                            Retrieved {selected.policy.receipt.retrievedAt}.
                          </dd>
                          <dt>{COPY.engineLabel}</dt>
                          <dd>
                            {COPY.engineText(
                              selected.policy.engine.parser,
                              selected.policy.engine.parserVersion,
                              selected.policy.engine.rulesVersion,
                            )}
                            <br />
                            Configuration SHA-256:{" "}
                            <code>
                              {selected.policy.engine.parserConfigDigest}
                            </code>
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
                                    {issue.type === "consultation_absent" ? (
                                      <p class="notice">
                                        <strong>Demo assessment: </strong>
                                        {issue.quote}
                                      </p>
                                    ) : (
                                      <blockquote>{issue.quote}</blockquote>
                                    )}
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
                                          maxLength={MAX_NOTE}
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
                {saved.notice && (
                  <p class="notice" role="status">
                    {saved.notice}
                  </p>
                )}
                {storageMessage && (
                  <p class="notice" role="status">
                    {storageMessage}
                  </p>
                )}
                <p class="live" role="status" aria-live="polite">
                  {citationMessage}
                </p>
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
                        {pending[k] && (
                          <p class="help">
                            Reading the official text for this citation.
                          </p>
                        )}
                        {!pending[k] && !entry.policy && (
                          <p class="help">
                            The text has not been read. You can export this
                            citation without passages.
                          </p>
                        )}
                        <label class="field small">
                          {COPY.citationNote}
                          <textarea
                            rows={3}
                            maxLength={MAX_NOTE}
                            value={entry.note}
                            onInput={(e) => {
                              const note = (e.target as HTMLTextAreaElement)
                                .value;
                              updateReport((current) =>
                                current.cited[k]
                                  ? {
                                      ...current,
                                      cited: {
                                        ...current.cited,
                                        [k]: { ...current.cited[k], note },
                                      },
                                    }
                                  : current,
                              );
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          aria-label={`${COPY.showIssues} for cited ${entry.citation.title}`}
                          onClick={() => void showIssues(entry.citation)}
                        >
                          {COPY.showIssues}
                          <span class="sr">
                            {" "}
                            for cited {entry.citation.title}
                          </span>
                        </button>{" "}
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
                    disabled={exportBusy}
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
      <PrintView report={report} />
    </>
  );
}

export function PrintView({ report }: { report: ReportState }) {
  const entries = reportEntries(report);
  return (
    <div class="print-only">
      <h1>{COPY.pdfTitle}</h1>
      <p>
        <strong>
          Prepared with Policy Sentinel {VERSION}, in development.
        </strong>
      </p>
      <p>{COPY.limits(VERSION)}</p>
      {entries.length === 0 && <p>{COPY.exportEmpty}</p>}
      {entries.map((entry) => (
        <section key={keyOf(entry.citation)}>
          <h2>{entry.citation.title}</h2>
          <p>
            {entry.citation.identifier}. {entry.citation.issuingBody}.{" "}
            {entry.citation.kind}, {entry.citation.date ?? "date not stated"}.
          </p>
          <p>Source: {entry.citation.sourceId}</p>
          <p>
            Official URL: {entry.citation.officialUrl}. Retrieved{" "}
            {entry.citation.retrievedAt}.
          </p>
          {entry.receipt && (
            <div class="print-receipt">
              <p>Text URL: {entry.receipt.textUrl}</p>
              <p>
                Text retrieved: {entry.receipt.retrievedAt}. Bytes:{" "}
                {entry.receipt.bytes}. SHA-256: {entry.receipt.sha256}
              </p>
              {entry.engine && (
                <p>
                  {COPY.engineText(
                    entry.engine.parser,
                    entry.engine.parserVersion,
                    entry.engine.rulesVersion,
                  )}
                  . Configuration SHA-256: {entry.engine.parserConfigDigest}
                </p>
              )}
            </div>
          )}
          {entry.note && <p>Note: {entry.note}</p>}
          {!entry.receipt ? (
            <p>{COPY.pdfTextNotRead}</p>
          ) : entry.issues.length === 0 ? (
            <p>{COPY.pdfNoPassages}</p>
          ) : null}
          {entry.issues.map(({ issue, note }) => (
            <div class="print-issue" key={issue.id}>
              <h3>{issue.label}</h3>
              {issue.type === "consultation_absent" ? (
                <p>
                  <strong>Demo assessment: </strong>
                  {issue.quote}
                </p>
              ) : (
                <blockquote>{issue.quote}</blockquote>
              )}
              <p>Location: {issue.locator}</p>
              <p>Rule: {issue.rule}</p>
              <p>Limit: {issue.limits}</p>
              <p>Check: {issue.check}</p>
              {note && <p>Note: {note}</p>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

const root = document.getElementById("app");
if (root) render(<App />, root);
