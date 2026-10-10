import { render } from "preact";
import type { RefObject } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { SOURCE_LABELS } from "../src/demo/citations";
import { COPY, EXAMPLES } from "../src/demo/copy";
import { buildDocument } from "../src/demo/document";
import type { DocBlock } from "../src/demo/document";
import { isCongressReference, mergeResults } from "../src/demo/merge";
import type { MergedResult, SourceResults } from "../src/demo/merge";
import type {
  DemoCitation,
  DemoIssue,
  DemoPolicyResponse,
  DemoSource,
} from "../src/demo/types";
import { ApiFailure, loadSources, policyId, readPolicy, search } from "./api";
import { loadPdfFonts } from "./pdf-fonts";
import {
  ACTOR_FIELDS,
  attachPolicy,
  emptyReport,
  MAX_ACTOR_TEXT,
  MAX_CITATIONS,
  MAX_NOTE,
  missingActorFields,
  removeFromReport,
  reportEntries,
  restoreReport,
  serializeReport,
  STORAGE_KEY,
} from "../src/demo/report-state";
import type {
  DataActors,
  Mark,
  ReportState,
  RestoredReport,
} from "../src/demo/report-state";
import { keyOf } from "../src/demo/validation";

const VERSION = __APP_VERSION__;
const TSDF_URL =
  "https://atniclimate.github.io/TieredSovereignDataFramework/#overview";
const REPO_URL = "https://github.com/atniclimate/policy-sentinel";
const THEME_KEY = "ps-demo-theme";
/** From this width the search and results panes are always in view. */
const WIDE = "(min-width: 64rem)";
/** From this width all four panes are in view. */
const FULL = "(min-width: 100rem)";
const PANES = ["search", "results", "issues", "report"] as const;
type Pane = (typeof PANES)[number];
type Scope = "federal" | "state";
type Theme = "dark" | "light";

function param(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}
const EMBED = param("embed") === "1";

const isTheme = (value: unknown): value is Theme =>
  value === "dark" || value === "light";

/** Dark unless the address or this tab's earlier choice says otherwise. */
function startTheme(): Theme {
  const asked = param("theme");
  if (isTheme(asked)) return asked;
  try {
    const kept = window.sessionStorage.getItem(THEME_KEY);
    if (isTheme(kept)) return kept;
  } catch {
    /* use the default */
  }
  return "dark";
}

// Shown until the catalog answers: every source listed, none claimed available.
const FALLBACK_SOURCES: DemoSource[] = (
  [
    ["federal-register", "federal"],
    ["govinfo", "federal"],
    ["congress", "federal"],
    ["regulations", "federal"],
    ["washington", "state"],
    ["oregon", "state"],
    ["idaho", "state"],
  ] as const
).map(([id, level]) => ({
  id,
  label: SOURCE_LABELS[id],
  level,
  status: "unknown",
  note: COPY.notCheckedNote,
}));

interface Selected {
  citation: DemoCitation;
  /** "unread" is a source whose text the demo does not read: a limit, not a failure. */
  state: "loading" | "ready" | "error" | "unread";
  policy?: DemoPolicyResponse;
  message?: string;
}

/** One search across the chosen sources, after duplicates are merged. */
interface Found {
  rows: readonly MergedResult[];
  /** One line per source asked: its count, or why it has none. */
  outcomes: readonly { sourceId: string; text: string }[];
  notes: readonly string[];
}

function loadSaved(): RestoredReport {
  try {
    return restoreReport(window.sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return { report: emptyReport(), notice: COPY.storageUnavailable };
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

const Leader = () => <span class="leader" aria-hidden="true" />;

/** The service writes "Not stated" for a record with no issuing body. */
const bodyOf = (citation: DemoCitation) =>
  citation.issuingBody === "Not stated"
    ? COPY.issuingBodyNotStated
    : citation.issuingBody;

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

function SourceStatus({ status }: { status: DemoSource["status"] }) {
  return (
    <span class="row-v status">
      <span class={markClass(status)} aria-hidden="true" />
      {statusText(status)}
    </span>
  );
}

export function App() {
  const saved = useMemo(loadSaved, []);
  const [sources, setSources] = useState<DemoSource[]>(FALLBACK_SOURCES);
  const [scope, setScope] = useState<Scope>("federal");
  const [checked, setChecked] = useState<readonly string[]>([
    "federal-register",
  ]);
  const [stateId, setStateId] = useState("washington");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [report, setReport] = useState<ReportState>(saved.report);
  const reportRef = useRef(report);
  const { cited, marks, actors } = report;
  const [storageMessage, setStorageMessage] = useState("");
  const [citationMessage, setCitationMessage] = useState("");
  const [sourceMessage, setSourceMessage] = useState<string>(
    COPY.checkingSources,
  );
  const [sourceBusy, setSourceBusy] = useState(true);
  const [queryError, setQueryError] = useState("");
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [exportBusy, setExportBusy] = useState(false);
  const exporting = useRef(false);
  const [exportMessage, setExportMessage] = useState("");
  /** True once an export or print was refused for missing data actor entries. */
  const [actorsAsked, setActorsAsked] = useState(false);
  const [pane, setPane] = useState<Pane>("search");
  const [wide, setWide] = useState(
    () => window.matchMedia?.(WIDE).matches ?? false,
  );
  const [theme, setTheme] = useState<Theme>(startTheme);
  const aboutRef = useRef<HTMLDialogElement>(null);
  const aboutOpener = useRef<HTMLButtonElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
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
    setSourceMessage(COPY.checkingSources);
    try {
      const catalog = await loadSources(controller.signal);
      if (sourceRequest.current !== controller || !mounted.current) return;
      setSources(catalog);
      const listed = catalog.filter((item) => item.level === "state");
      setStateId((current) =>
        listed.some((item) => item.id === current)
          ? current
          : (listed[0]?.id ?? current),
      );
      setSourceMessage(COPY.sourcesChecked);
      if (moveFocus)
        requestAnimationFrame(() => {
          if (mounted.current) document.getElementById("q")?.focus();
        });
    } catch {
      if (sourceRequest.current !== controller || !mounted.current) return;
      setSources(FALLBACK_SOURCES);
      setSourceMessage(COPY.sourcesFailed);
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
    const media = window.matchMedia?.(WIDE);
    const full = window.matchMedia?.(FULL);
    // A narrower layout hides panes. The one being typed in stays in front, and
    // focus is put back if the change of layout dropped it.
    const layoutNow = () => `${media?.matches} ${full?.matches}`;
    let layout = layoutNow();
    const keepPane = (at: EventTarget | null) => {
      if (!(at instanceof HTMLElement)) return;
      const holder = PANES.find((id) => at.closest(`.pane-${id}`));
      // Search and Results stay in view down to the single-pane layout.
      const stays = holder === "search" || holder === "results";
      if (!holder || (media?.matches && stays)) return;
      setWide(Boolean(media?.matches));
      setPane(holder);
      requestAnimationFrame(() => {
        if (at.isConnected && document.activeElement === document.body)
          at.focus();
      });
    };
    const onMedia = (event: { matches: boolean }) => {
      layout = layoutNow();
      setWide(Boolean(media?.matches));
      if (!event.matches) keepPane(document.activeElement);
    };
    // Chrome takes focus from a pane the new layout hides before it reports the
    // media change, so the pane is also caught as focus leaves it.
    const onFocusOut = (event: FocusEvent) => {
      if (!event.relatedTarget && layout !== layoutNow())
        keepPane(event.target);
    };
    media?.addEventListener("change", onMedia);
    full?.addEventListener("change", onMedia);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      mounted.current = false;
      sourceRequest.current?.abort();
      searchRequest.current.controller?.abort();
      for (const request of policyRequests.current.values())
        request.controller.abort();
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
      media?.removeEventListener("change", onMedia);
      full?.removeEventListener("change", onMedia);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, serializeReport(report));
      setStorageMessage("");
    } catch {
      setStorageMessage(COPY.storageSaveFailed);
    }
  }, [report]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const labelOf = (id: string) =>
    sources.find((item) => item.id === id)?.label ?? SOURCE_LABELS[id] ?? id;
  const federal = sources.filter((item) => item.level === "federal");
  const states = sources.filter((item) => item.level === "state");
  const chosenState = states.find((item) => item.id === stateId);
  const federalTargets = federal
    .filter((item) => item.status === "live" && checked.includes(item.id))
    .map((item) => item.id);
  const targets =
    scope === "federal"
      ? federalTargets
      : chosenState?.status === "live"
        ? [chosenState.id]
        : [];
  const usable = targets.length > 0;
  const unchecked = sources.every((item) => item.status === "unknown");
  // Why the Search button is off: no federal source is checked, or the chosen
  // state is not available and its catalog note under the select says why.
  const noneChecked =
    scope === "federal" && !usable && !sourceBusy && !unchecked;
  // Asking for a search anyway says the reason as an alert. The alert then
  // stands in for the plain note, so the reason is on the page once.
  const blockedNote = noneChecked && queryError !== COPY.noSourceChecked;
  const blockedBy = usable
    ? undefined
    : scope === "state"
      ? "state-note"
      : blockedNote
        ? "q-blocked"
        : noneChecked
          ? "q-error"
          : undefined;
  const blockedReason =
    (scope === "state"
      ? chosenState?.note
      : noneChecked
        ? COPY.noSourceChecked
        : sourceBusy || unchecked
          ? sourceMessage
          : "") || COPY.searchOff;
  const help =
    scope === "state"
      ? stateId === "washington"
        ? COPY.searchHelpWashington
        : COPY.searchHelpState
      : federalTargets.length === 1 && federalTargets[0] === "congress"
        ? COPY.searchHelpCongress
        : federalTargets.includes("congress")
          ? `${COPY.searchHelpFederal} ${COPY.searchHelpCongressToo}`
          : COPY.searchHelpFederal;
  // At this width the third column holds Issues unless Report was asked for.
  const front: Pane =
    wide && (pane === "search" || pane === "results") ? "issues" : pane;
  const paneTab = wide ? 0 : -1;

  function clearSelection() {
    detailSequence.current += 1;
    selectedKey.current = null;
    setSelected(null);
  }

  /** A change of scope or sources drops the pending search and its results. */
  function resetSearch() {
    searchRequest.current.controller?.abort();
    searchRequest.current.sequence += 1;
    setBusy(false);
    setFound(null);
    setMessage("");
    setQueryError("");
    clearSelection();
  }

  function changeScope(next: Scope) {
    if (next === scope) return;
    resetSearch();
    setScope(next);
  }

  function toggleSource(id: string, on: boolean) {
    resetSearch();
    setChecked((current) =>
      on ? [...current, id] : current.filter((item) => item !== id),
    );
  }

  async function runSearch(ids: readonly string[], q: string) {
    const reference = isCongressReference(q);
    if (!reference && ids.length === 1 && ids[0] === "congress") {
      setQueryError(COPY.congressQueryError);
      document.getElementById("q")?.focus();
      return;
    }
    // Congress.gov answers one bill reference only; other terms skip it.
    const skipped = !reference && ids.includes("congress");
    const asked = skipped ? ids.filter((id) => id !== "congress") : ids;
    searchRequest.current.controller?.abort();
    const sequence = searchRequest.current.sequence + 1;
    const controller = new AbortController();
    searchRequest.current = { sequence, controller };
    const ownsView = () =>
      mounted.current && sequence === searchRequest.current.sequence;
    setBusy(true);
    setQueryError("");
    setMessage(COPY.searching);
    setFound(null);
    clearSelection();
    setPane((current) => (current === "search" ? "results" : current));
    // The single-pane layout hides the Search pane now; focus follows to Results.
    if (!wide)
      requestAnimationFrame(() => {
        if (ownsView()) resultsRef.current?.focus();
      });
    // One request per source; a source that fails does not hide the others.
    const settled = await Promise.allSettled(
      asked.map((id) => search(id, q, 1, controller.signal)),
    );
    if (!ownsView()) return;
    const batches: SourceResults[] = [];
    const outcomes: { sourceId: string; text: string }[] = [];
    const failures: { sourceId: string; text: string; answered: boolean }[] =
      [];
    settled.forEach((result, index) => {
      const sourceId = asked[index];
      if (result.status === "fulfilled") {
        const { results, total } = result.value;
        batches.push({ sourceId, results });
        outcomes.push({
          sourceId,
          text: COPY.resultsCount(results.length, total),
        });
      } else {
        // A "source" failure carries the source's own reason, such as no such
        // bill; only a service or rate-limit failure means nothing was asked.
        const answered =
          result.reason instanceof ApiFailure &&
          result.reason.kind === "source";
        outcomes.push({
          sourceId,
          text: answered ? COPY.sourceNothing : COPY.sourceFailed,
        });
        failures.push({
          sourceId,
          text: failureText(result.reason),
          answered,
        });
      }
    });
    if (skipped) outcomes.push({ sourceId: "congress", text: COPY.skipped });
    const { results: rows, merged } = mergeResults(batches);
    // When every source failed the same way, the reason is the headline.
    const oneReason =
      failures.length === asked.length &&
      failures.every((failure) => failure.text === failures[0].text);
    setFound({
      rows,
      outcomes,
      notes: [
        ...(oneReason
          ? []
          : failures.map(({ sourceId, text, answered }) => {
              const label = labelOf(sourceId);
              if (!answered) return COPY.sourceFailure(label, text);
              // A reason that opens with the source's name is not given it twice.
              return text.startsWith(label)
                ? text
                : COPY.sourceAnswer(label, text);
            })),
        ...(skipped ? [COPY.congressSkipped] : []),
        ...(merged ? [COPY.mergeNote(merged)] : []),
      ],
    });
    setMessage(
      rows.length
        ? COPY.resultsListed(rows.length)
        : oneReason
          ? failures[0].text
          : failures.length === asked.length
            ? COPY.allFailed
            : COPY.noResults,
    );
    setBusy(false);
  }

  function onSubmit(event: Event) {
    event.preventDefault();
    if (busy) return;
    if (!usable) {
      setQueryError(blockedReason);
      document.getElementById("q")?.focus();
      return;
    }
    if (query.trim().length < 2 || query.trim().length > 200) {
      setQueryError(COPY.queryLength);
      document.getElementById("q")?.focus();
      return;
    }
    void runSearch(targets, query.trim());
  }

  /** A state example switches to that state; a federal one runs on the checked sources. */
  function exampleTargets(sid: string): readonly string[] {
    const state = states.find((item) => item.id === sid);
    if (!state) return federalTargets;
    return state.status === "live" ? [sid] : [];
  }

  function tryExample(sid: string, q: string) {
    const ids = exampleTargets(sid);
    if (ids.length === 0) return;
    // The scope may change even when the search below is refused.
    resetSearch();
    const state = states.some((item) => item.id === sid);
    setScope(state ? "state" : "federal");
    if (state) setStateId(sid);
    setQuery(q);
    void runSearch(ids, q);
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
    setPane("issues");
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
      setSelected({ citation, state: "unread", message: COPY.noTextForSource });
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

  /** On a scrolled page, brings the status line under the header into view. */
  function showNotes() {
    requestAnimationFrame(() => {
      const notes = notesRef.current;
      if (typeof notes?.scrollIntoView === "function")
        notes.scrollIntoView({ block: "nearest" });
    });
  }

  async function addCitation(
    citation: DemoCitation,
    alternates: readonly DemoCitation[],
  ) {
    const k = keyOf(citation);
    if (reportRef.current.cited[k]) return;
    if (Object.keys(reportRef.current.cited).length >= MAX_CITATIONS) {
      setCitationMessage(COPY.citationLimit(MAX_CITATIONS));
      // Nothing else on the page changes, so the reason must be in sight.
      showNotes();
      return;
    }
    const view = selectedRef.current;
    const viewed =
      view?.policy && keyOf(view.citation) === k ? view.policy : null;
    // The row's match key stays: its alternates were matched on it.
    const policy = viewed && {
      ...viewed,
      citation: { ...viewed.citation, matchKey: citation.matchKey },
    };
    const revision = revisions.current.get(k) ?? 0;
    updateReport((current) => ({
      ...current,
      cited: {
        ...current.cited,
        [k]: {
          citation: policy?.citation ?? citation,
          policy,
          note: "",
          alternates,
        },
      },
    }));
    setCitationMessage(
      COPY.citationAdded(citation.title, !policy && citation.textAvailable),
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
      setCitationMessage(COPY.citationSaved(citation.title));
    } catch {
      if (mounted.current && (revisions.current.get(k) ?? 0) === revision)
        setCitationMessage(COPY.citationTextFailed(citation.title));
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
    const title = reportRef.current.cited[k]?.citation.title ?? "";
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
    setCitationMessage(COPY.citationRemoved(title));
    // The pressed button leaves with its row. Focus goes to the list heading, not
    // to the next row's Remove, where a second Enter would remove another citation.
    document.getElementById("cited-h")?.focus();
    showNotes();
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

  function setActor(field: keyof DataActors, value: string) {
    // The refusal named the missing entries as they stood; an edit retires it.
    if (actorsAsked) setExportMessage("");
    updateReport((current) => ({
      ...current,
      actors: { ...current.actors, [field]: value },
    }));
  }

  /** Export and print wait for a citation and all five data actor entries. */
  function readyToExport(): boolean {
    if (reportEntries(reportRef.current).length === 0) {
      setExportMessage(COPY.exportEmpty);
      return false;
    }
    const missing = missingActorFields(reportRef.current.actors);
    if (missing.length === 0) return true;
    setActorsAsked(true);
    setExportMessage(
      COPY.actorsMissing(
        missing.map((field) => COPY.actorLabels[field]).join(", "),
      ),
    );
    document.getElementById(`actor-${missing[0]}`)?.focus();
    return false;
  }

  async function exportPdf() {
    if (exporting.current || !readyToExport()) return;
    const entries = reportEntries(reportRef.current);
    const exportActors = reportRef.current.actors;
    setExportMessage(COPY.exportingPdf);
    exporting.current = true;
    setExportBusy(true);
    try {
      const [{ buildPdf }, fonts] = await Promise.all([
        import("../src/demo/pdf"),
        loadPdfFonts(),
      ]);
      const bytes = await buildPdf({
        version: VERSION,
        generatedAt: new Date(),
        entries,
        actors: exportActors,
        fonts,
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
      // Name the refused character with its code point, so a combining mark is findable too.
      const refused =
        error instanceof Error && error.name === "PdfEncodingError"
          ? ((error as { character?: string }).character ?? "")
          : null;
      const code = refused?.codePointAt(0);
      setExportMessage(
        refused === null
          ? COPY.exportFailed
          : COPY.exportUnsupported(
              code === undefined
                ? ""
                : `${refused} (U+${code.toString(16).toUpperCase().padStart(4, "0")})`,
            ),
      );
    } finally {
      exporting.current = false;
      setExportBusy(false);
    }
  }

  async function printView() {
    if (exporting.current || !readyToExport()) return;
    exporting.current = true;
    setExportMessage(COPY.printPreparing);
    try {
      // The document faces load on first use; fetch them before the print dialog opens.
      await Promise.all(
        ["400", "600"].map((weight) =>
          document.fonts?.load(`${weight} 1em "Lexend Deca"`),
        ),
      ).catch(() => undefined);
      window.print();
    } finally {
      exporting.current = false;
      setExportMessage("");
    }
  }

  function switchTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      window.sessionStorage.setItem(THEME_KEY, next);
    } catch {
      /* the switch still holds for this page view */
    }
  }

  // showModal is missing in some embedded and test environments.
  function openAbout() {
    const dialog = aboutRef.current;
    if (!dialog || dialog.hasAttribute("open")) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeAbout() {
    const dialog = aboutRef.current;
    if (!dialog?.hasAttribute("open")) return;
    if (typeof dialog.close === "function") dialog.close();
    else {
      dialog.removeAttribute("open");
      aboutOpener.current?.focus();
    }
  }

  const citedEntries = Object.entries(cited);
  const actorsDone = ACTOR_FIELDS.filter((field) => actors[field].trim());
  const grouped = useMemo(() => {
    const out = new Map<string, { label: string; issues: DemoIssue[] }>();
    for (const issue of selected?.policy?.issues ?? []) {
      const entry = out.get(issue.type) ?? { label: issue.label, issues: [] };
      entry.issues.push(issue);
      out.set(issue.type, entry);
    }
    return [...out.values()];
  }, [selected]);
  const paneCount: Record<Pane, number | null> = {
    search: null,
    results: found ? found.rows.length : null,
    issues: null,
    report: citedEntries.length,
  };

  const alsoListed = (title: string, alternates: readonly DemoCitation[]) =>
    alternates.length > 0 && (
      <div class="also">
        <span>{COPY.docLabels.alsoListedBy}</span>
        <ul class="meta">
          {alternates.map((alternate) => (
            <li key={alternate.sourceId}>
              <a
                href={alternate.officialUrl}
                aria-label={COPY.alternateLink(
                  labelOf(alternate.sourceId),
                  title,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                {labelOf(alternate.sourceId)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <>
      <div class="shell screen-only" data-pane={front}>
        <a class="skip" href="#main">
          {COPY.skipLink}
        </a>
        <header class="head">
          <h1>
            {COPY.appName}
            <span class="quiet">
              {COPY.appMode} <span class="mono">{VERSION}</span>
            </span>
          </h1>
          <nav class="panes" aria-label={COPY.panesLabel}>
            {PANES.map((id) => (
              <button
                type="button"
                class={`chip chip-${id}`}
                key={id}
                aria-label={COPY.paneChip(COPY.paneLabels[id], paneCount[id])}
                aria-pressed={front === id}
                onClick={() => setPane(id)}
              >
                {COPY.paneLabels[id]}
                {paneCount[id] !== null && (
                  <span class="n">{paneCount[id]}</span>
                )}
              </button>
            ))}
          </nav>
          <div class="head-actions">
            <button
              type="button"
              class="btn"
              ref={aboutOpener}
              onClick={openAbout}
            >
              {COPY.aboutButton}
            </button>
            <button type="button" class="btn" onClick={switchTheme}>
              {theme === "dark" ? COPY.themeLight : COPY.themeDark}
            </button>
          </div>
        </header>

        <main id="main" tabIndex={-1}>
          {/* Outside the panes, so these are seen and announced whichever pane is in front. */}
          <div class="notes" role="status" aria-live="polite" ref={notesRef}>
            {saved.notice && <p class="notice">{saved.notice}</p>}
            {storageMessage && <p class="notice">{storageMessage}</p>}
            {citationMessage && <p class="live">{citationMessage}</p>}
          </div>
          <section
            class="pane pane-search"
            aria-labelledby="search-h"
            tabIndex={paneTab}
          >
            <h2 id="search-h">{COPY.searchLabel}</h2>
            <p class="live" role="status">
              {sourceMessage}
            </p>
            {unchecked && (
              // aria-disabled, here and on the other buttons that act: the
              // disabled attribute would drop keyboard focus to the page body.
              <button
                type="button"
                class="btn"
                aria-disabled={sourceBusy}
                onClick={() => {
                  if (!sourceBusy) void refreshSources(true);
                }}
              >
                {sourceBusy ? COPY.checkingSourcesButton : COPY.retrySources}
              </button>
            )}
            <form onSubmit={onSubmit}>
              <div class="chips" role="group" aria-label={COPY.scopeLabel}>
                {(["federal", "state"] as const).map((id) => (
                  <button
                    type="button"
                    class="chip"
                    key={id}
                    aria-pressed={scope === id}
                    onClick={() => changeScope(id)}
                  >
                    {id === "federal" ? COPY.scopeFederal : COPY.scopeState}
                  </button>
                ))}
              </div>
              {scope === "federal" ? (
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
                          toggleSource(
                            s.id,
                            (e.target as HTMLInputElement).checked,
                          )
                        }
                      />
                      <span class="row">
                        <span class="row-k">{s.label}</span>
                        <Leader />
                        <SourceStatus status={s.status} />
                      </span>
                      <span class="source-note">
                        {COPY.capability[s.id] ?? s.note}
                      </span>
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
                    onChange={(e) => {
                      resetSearch();
                      setStateId((e.target as HTMLSelectElement).value);
                    }}
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
              )}
              <div class="zone">
                <label class="field" for="q">
                  {COPY.queryLabel}
                </label>
                <input
                  id="q"
                  type="search"
                  value={query}
                  autoComplete="off"
                  maxLength={200}
                  aria-describedby={
                    queryError
                      ? "q-help q-error"
                      : blockedBy
                        ? `q-help ${blockedBy}`
                        : "q-help"
                  }
                  aria-invalid={queryError ? "true" : undefined}
                  onInput={(e) => {
                    setQuery((e.target as HTMLInputElement).value);
                    setQueryError("");
                  }}
                />
                <p id="q-help" class="help">
                  {help}
                </p>
                {queryError && (
                  <p id="q-error" class="notice" role="alert">
                    {queryError}
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
                  aria-disabled={!usable || busy}
                  aria-describedby={blockedBy}
                >
                  {COPY.searchButton}
                </button>
              </div>
            </form>
            <div class="zone">
              <h3 class="eyebrow">{COPY.examplesLabel}</h3>
              <ul class="chips">
                {EXAMPLES.map((ex) => (
                  <li key={ex.label}>
                    <button
                      type="button"
                      class="chip"
                      disabled={exampleTargets(ex.source).length === 0}
                      onClick={() => tryExample(ex.source, ex.query)}
                    >
                      {ex.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section
            class="pane pane-results"
            aria-labelledby="results-h"
            ref={resultsRef}
            tabIndex={paneTab}
          >
            <h2 id="results-h">{COPY.resultsTitle}</h2>
            <div class="live" role="status" aria-live="polite">
              <p>
                {found === null && !busy && !message
                  ? COPY.emptyStart
                  : message}
                {busy && <span class="cursor" aria-hidden="true" />}
              </p>
              {found && (
                <ul class="rows">
                  {found.outcomes.map((outcome) => (
                    <li class="row" key={outcome.sourceId}>
                      <span class="row-k">{labelOf(outcome.sourceId)}</span>
                      <Leader />
                      <span class="row-v">{outcome.text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {found?.notes.map((note) => (
                <p class="help" key={note}>
                  {note}
                </p>
              ))}
            </div>
            <ul class="results" key={searchRequest.current.sequence}>
              {(found?.rows ?? []).map(({ citation: c, alternates }) => {
                const k = keyOf(c);
                const isCited = Boolean(cited[k]);
                const addLabel = pending[k]
                  ? COPY.readingCited
                  : isCited
                    ? COPY.inCitations
                    : COPY.addCitation;
                return (
                  <li
                    class={`result${selectedKey.current === k ? " is-here" : ""}`}
                    key={k}
                  >
                    <h3>{c.title}</h3>
                    <p class="row">
                      <span class="row-k">{labelOf(c.sourceId)}</span>
                      <Leader />
                      <span class="row-v mono">{c.identifier}</span>
                    </p>
                    <ul class="meta">
                      <li>{bodyOf(c)}</li>
                      <li>{c.kind}</li>
                      <li>{c.date ?? COPY.dateNotStated}</li>
                    </ul>
                    {c.summary && <p class="summary">{c.summary}</p>}
                    {alsoListed(c.title, alternates)}
                    <p class="actions">
                      <button
                        type="button"
                        class="btn"
                        aria-label={COPY.showIssuesFor(c.title)}
                        onClick={() => void showIssues(c)}
                      >
                        {COPY.showIssues}
                      </button>
                      <button
                        type="button"
                        class="btn"
                        aria-disabled={isCited}
                        aria-label={COPY.named(addLabel, c.title)}
                        onClick={() => void addCitation(c, alternates)}
                      >
                        {addLabel}
                      </button>
                      <a
                        href={c.officialUrl}
                        aria-label={COPY.openOfficialFor(c.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {COPY.openOfficial}
                      </a>
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          <section
            class="pane pane-issues"
            aria-labelledby="detail-h"
            ref={detailRef}
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
                          selected.policy.receipt.retrievedAt,
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
                          {COPY.retrieved(selected.policy.receipt.retrievedAt)}
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
                        <Digest
                          value={selected.policy.engine.parserConfigDigest}
                        />
                      </dd>
                    </dl>
                    {selected.policy.issues.length === 0 && (
                      <p>{COPY.noIssues}</p>
                    )}
                    {selected.policy.issues.length > 0 && (
                      <p class="actions">
                        <button
                          type="button"
                          class="btn"
                          disabled={!cited[keyOf(selected.citation)]}
                          onClick={() =>
                            includeAll(
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
                                  <blockquote id={passage}>
                                    {issue.quote}
                                  </blockquote>
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
                                      setMark(k, issue, {
                                        on: (e.target as HTMLInputElement)
                                          .checked,
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
                  </>
                )}
              </div>
            )}
          </section>

          {/* The list scrolls in its own area and Export is a row under it, so no field can sit under Export. */}
          <section class="pane pane-report" aria-labelledby="report-h">
            <div
              class="pane-scroll"
              role="group"
              aria-labelledby="report-h"
              tabIndex={paneTab}
            >
              <h2 id="report-h">{COPY.reportTitle}</h2>
              <section class="zone" aria-labelledby="cited-h">
                <div class="row">
                  <h3 id="cited-h" class="eyebrow" tabIndex={-1}>
                    {COPY.citationsTitle}
                  </h3>
                  <Leader />
                  <span class="row-v mono">{citedEntries.length}</span>
                </div>
                {citedEntries.length === 0 && (
                  <p class="help">{COPY.citationsEmpty}</p>
                )}
                <ul class="cited">
                  {citedEntries.map(([k, entry], index) => {
                    const count = Object.values(marks[k] ?? {}).filter(
                      (m) => m.on,
                    ).length;
                    return (
                      <li key={k}>
                        <h4 id={`cited-${index}`}>{entry.citation.title}</h4>
                        <p class="cited-id mono">{entry.citation.identifier}</p>
                        <p class="row">
                          <span class="row-k">{COPY.passagesSelected}</span>
                          <Leader />
                          <span class="row-v mono">{count}</span>
                        </p>
                        {alsoListed(entry.citation.title, entry.alternates)}
                        {pending[k] && (
                          <p class="help">{COPY.readingForCitation}</p>
                        )}
                        {!pending[k] && !entry.policy && (
                          <p class="help">{COPY.textNotReadYet}</p>
                        )}
                        <label class="field">
                          {COPY.citationNote}
                          <textarea
                            rows={2}
                            maxLength={MAX_NOTE}
                            value={entry.note}
                            aria-describedby={`cited-${index}`}
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
                        <p class="actions">
                          <button
                            type="button"
                            class="btn"
                            aria-label={COPY.showIssuesForCited(
                              entry.citation.title,
                            )}
                            onClick={() => void showIssues(entry.citation)}
                          >
                            {COPY.showIssues}
                          </button>
                          <button
                            type="button"
                            class="btn"
                            aria-label={COPY.named(
                              COPY.remove,
                              entry.citation.title,
                            )}
                            onClick={() => removeCitation(k)}
                          >
                            {COPY.remove}
                          </button>
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
              <section class="zone" aria-labelledby="actors-h">
                <div class="row">
                  <h3 id="actors-h" class="eyebrow">
                    {COPY.actorsTitle}
                  </h3>
                  <Leader />
                  <span class="row-v mono">
                    {COPY.actorsCount(actorsDone.length, ACTOR_FIELDS.length)}
                  </span>
                </div>
                <p class="help">{COPY.actorsIntro}</p>
                {ACTOR_FIELDS.map((field) => {
                  const done = actorsDone.includes(field);
                  const input = {
                    id: `actor-${field}`,
                    value: actors[field],
                    maxLength: MAX_ACTOR_TEXT,
                    "aria-required": true,
                    "aria-invalid": actorsAsked && !done ? true : undefined,
                    "aria-describedby": `actor-${field}-state`,
                    onInput: (e: Event) =>
                      setActor(
                        field,
                        (e.target as HTMLInputElement | HTMLTextAreaElement)
                          .value,
                      ),
                  };
                  return (
                    <div class="actor" key={field}>
                      <p class="row">
                        <label class="field" for={input.id}>
                          {COPY.actorLabels[field]}
                        </label>
                        <Leader />
                        <span
                          id={input["aria-describedby"]}
                          class="row-v status"
                        >
                          <span
                            class={done ? "mark is-full" : "mark"}
                            aria-hidden="true"
                          />
                          {done ? COPY.actorEntered : COPY.actorRequired}
                        </span>
                      </p>
                      {field === "purpose" ? (
                        <textarea rows={2} {...input} />
                      ) : (
                        <input
                          type="text"
                          autoComplete={ACTOR_AUTOCOMPLETE[field]}
                          {...input}
                        />
                      )}
                    </div>
                  );
                })}
              </section>
            </div>
            <section class="export" aria-label={COPY.exportTitle}>
              <p class="actions">
                <button
                  type="button"
                  class="btn primary"
                  aria-disabled={exportBusy}
                  onClick={() => void exportPdf()}
                >
                  {COPY.exportPdf}
                </button>
                <button
                  type="button"
                  class="btn"
                  onClick={() => void printView()}
                >
                  {COPY.printView}
                </button>
              </p>
              <p class="live" role="status" aria-live="polite">
                {exportMessage}
              </p>
            </section>
          </section>
        </main>

        {!EMBED && (
          <footer class="foot">
            <ul class="meta">
              {COPY.footerItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <TsdfLine />
          </footer>
        )}
      </div>
      <About
        dialog={aboutRef}
        sources={sources}
        onClose={closeAbout}
        onClosed={() => aboutOpener.current?.focus()}
      />
      <PrintView report={report} />
    </>
  );
}

/** Browser autofill hints for the entries that describe the person. */
const ACTOR_AUTOCOMPLETE: Partial<Record<keyof DataActors, string>> = {
  name: "name",
  role: "organization-title",
  organization: "organization",
};

function TsdfLine() {
  return (
    <p class="tsdf">
      <span class="mark is-land" aria-hidden="true" />
      <a href={TSDF_URL} target="_blank" rel="noopener noreferrer">
        {COPY.tsdfLink}
      </a>
    </p>
  );
}

function About({
  dialog,
  sources,
  onClose,
  onClosed,
}: {
  dialog: RefObject<HTMLDialogElement>;
  sources: readonly DemoSource[];
  onClose: () => void;
  onClosed: () => void;
}) {
  // The document's closing "verify" line is left out: the dialog's limits text already says it.
  const [material, claims, matches] = COPY.docSovereignty;
  return (
    <dialog
      class="about screen-only"
      ref={dialog}
      aria-labelledby="about-h"
      onClose={onClosed}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div class="about-head">
        <h2 id="about-h">{COPY.aboutButton}</h2>
        <button type="button" class="btn" onClick={onClose}>
          {COPY.aboutClose}
        </button>
      </div>
      <div class="about-body">
        <section>
          <h3>{COPY.aboutWhatTitle}</h3>
          <p>{COPY.statusLine(VERSION)}</p>
          <p>{COPY.introOne}</p>
        </section>
        <section>
          <h3>{COPY.limitsTitle}</h3>
          <p>{COPY.limits(VERSION)}</p>
          <p>{COPY.issuesNote}</p>
          <p>{COPY.flagQuestion}</p>
          <p>{matches}</p>
          <p>{COPY.aboutPdfTagging}</p>
        </section>
        <section>
          <h3>{COPY.aboutSourcesTitle}</h3>
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
          <p>{COPY.aboutSourcesNote}</p>
          <p>{COPY.mergeRule}</p>
        </section>
        <section>
          <h3>{COPY.aboutPrivacyTitle}</h3>
          {COPY.aboutPrivacy.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </section>
        <section>
          <h3>{COPY.aboutTsdfTitle}</h3>
          <p>{material}</p>
          <p>{claims}</p>
          <TsdfLine />
        </section>
        <section>
          <h3>{COPY.aboutVersionTitle}</h3>
          <p>{COPY.docTool(VERSION)}</p>
          <p>{COPY.aboutBuilt}</p>
          <p>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              {COPY.repoLink}
            </a>
          </p>
        </section>
      </div>
    </dialog>
  );
}

/** The one mapping from document blocks to elements; all wording comes from the model. */
function docBlock(block: DocBlock, index: number) {
  switch (block.kind) {
    case "title":
      return <h1 key={index}>{block.text}</h1>;
    case "h2":
      return <h2 key={index}>{block.text}</h2>;
    case "h3":
      return <h3 key={index}>{block.text}</h3>;
    case "quote":
      return <blockquote key={index}>{block.text}</blockquote>;
    case "field":
      return (
        <p class="doc-field" key={index}>
          <b>{block.label}</b>{" "}
          <span class={block.mono ? "mono" : undefined}>{block.value}</span>
        </p>
      );
    case "ref":
      return (
        <p class="doc-ref" key={index}>
          <b>[{block.number}]</b> <span>{block.text}</span>
        </p>
      );
    case "rule":
      return <hr key={index} />;
    case "break":
      return <div class="doc-break" key={index} />;
    default:
      return (
        // As in the PDF, only the placeholder for a missing note is set quieter.
        <p
          class={`doc-${block.kind}${block.text === COPY.pdfNoNote ? " is-empty" : ""}`}
          key={index}
        >
          {block.text}
        </p>
      );
  }
}

export function PrintView({ report }: { report: ReportState }) {
  const model = buildDocument({
    version: VERSION,
    generatedAt: new Date(),
    entries: reportEntries(report),
    actors: report.actors,
  });
  return (
    <div class="print-only">
      {model.blocks.map(docBlock)}
      {/* shortcut: the footer prints once at the end, not on every page; the PDF carries the running header and footer. */}
      <p class="doc-small doc-foot">{model.footer}</p>
    </div>
  );
}

const root = document.getElementById("app");
if (root) render(<App />, root);
