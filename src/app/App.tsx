/** @jsxImportSource preact */

import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { loadArtifacts, loadRecordDetail } from "./data";
import { selectedRecordsCsv } from "./csv";
import {
  criteriaFromParams,
  DEFAULT_RESULT_WINDOW,
  navigate,
  paramsFromCriteria,
  parseRoute,
  recordFocusId,
  resultWindowFromParams,
  routeHash,
  routeStateHash,
  selectedIdsFromParams,
  type Route,
} from "./routing";
import {
  filterRecords,
  recordAvailableForNation,
  relevanceLabel,
  uniqueValues,
  whyShownFor,
} from "./policy";
import {
  criteriaPolicySummary,
  exactCriteriaSummary,
  formatDate,
  healthTone,
  humanize,
  updatedDate,
} from "./present";
import type {
  ArtifactBundle,
  CoverageEntry,
  Nation,
  PublicRecord,
  RelevanceBasis,
  SearchCriteria,
} from "./types";
import { NationPicker } from "./components/NationPicker";
import { PolicySelector } from "./components/PolicySelector";
import { RecordCard } from "./components/RecordCard";

const DISCLAIMER =
  "Policy Sentinel is a source-reference and discovery tool. It is not legal advice, a comprehensive legal database, a rights-impact engine, or a substitute for official sources.";

const DETAIL_HYDRATION_CONCURRENCY = 8;
const ROUTE_LABELS: Record<string, string> = {
  "/": "Home",
  "/search": "Guided Nation search",
  "/policy": "Browse policy areas",
  "/timeline": "Landmark timeline",
  "/unclassified": "Unclassified records",
  "/coverage": "Source coverage",
  "/methodology": "Methodology",
  "/about": "About",
};

const coverageRangeText = (
  from: string | null,
  through: string | null,
  openEnded = false,
): string =>
  `${from ? formatDate(from) : "Not provided"} through ${
    through
      ? formatDate(through)
      : openEnded
        ? "present or not stated"
        : "Not provided"
  }`;

const actualCoverageText = (entry: CoverageEntry): string =>
  entry.recordCount === 0
    ? "No validated records in this artifact"
    : `${entry.recordCount} validated record${
        entry.recordCount === 1 ? "" : "s"
      }; ${coverageRangeText(entry.recordFrom, entry.recordThrough)}`;

const coverageIsLimited = (entry: CoverageEntry): boolean =>
  ["limited", "range-limited"].includes(entry.status.toLocaleLowerCase());

interface DossierState {
  records: PublicRecord[];
  nation: Nation;
  criteria: SearchCriteria;
  generatedAt: Date;
}

export function App() {
  const [bundle, setBundle] = useState<ArtifactBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [route, setRoute] = useState<Route>(() => parseRoute());
  const selectedIdsRef = useRef<Set<string>>(
    new Set(selectedIdsFromParams(route.params)),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(selectedIdsRef.current),
  );
  const [outputStatus, setOutputStatus] = useState("");
  const [dossier, setDossier] = useState<DossierState | null>(null);
  const previousRecordId = useRef<string | null>(route.recordId);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    loadArtifacts()
      .then((loaded) => {
        if (active) setBundle(loaded);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "The public data artifact could not be loaded.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [retry]);

  useEffect(() => {
    const updateRoute = () => {
      const nextRoute = parseRoute();
      const nextSelectedIds = new Set(selectedIdsFromParams(nextRoute.params));
      setRoute(nextRoute);
      selectedIdsRef.current = nextSelectedIds;
      setSelectedIds(nextSelectedIds);
    };
    window.addEventListener("hashchange", updateRoute);
    return () => window.removeEventListener("hashchange", updateRoute);
  }, []);

  useEffect(() => {
    if (!bundle) return;
    const currentRoute = parseRoute();
    const knownRecordIds = new Set(
      bundle.records.map((record) => record.internalId),
    );
    const validSelectedIds = selectedIdsFromParams(currentRoute.params).filter(
      (id) => knownRecordIds.has(id),
    );
    const normalizedHash = routeStateHash(currentRoute, {
      selectedIds: validSelectedIds,
    });
    if (window.location.hash !== normalizedHash) {
      window.history.replaceState(window.history.state, "", normalizedHash);
      setRoute(parseRoute(normalizedHash));
    } else if (
      currentRoute.path !== route.path ||
      currentRoute.params.toString() !== route.params.toString()
    ) {
      setRoute(currentRoute);
    }
    const nextSelectedIds = new Set(validSelectedIds);
    selectedIdsRef.current = nextSelectedIds;
    setSelectedIds(nextSelectedIds);
  }, [bundle, route.path, route.recordId, route.params.toString()]);

  useEffect(() => {
    document.title = route.recordId
      ? "Record details | Policy Sentinel"
      : `${ROUTE_LABELS[route.path] ?? "Page not found"} | Policy Sentinel`;
  }, [route.path, route.recordId]);

  useEffect(() => {
    const priorRecordId = previousRecordId.current;
    previousRecordId.current = route.recordId;
    if (route.recordId) return;
    const focusRecordId = route.params.get("focus") ?? priorRecordId;
    if (!focusRecordId) return;
    window.requestAnimationFrame(() => {
      document.getElementById(recordFocusId(focusRecordId))?.focus();
    });
  }, [route.path, route.recordId, route.params.get("focus")]);

  useEffect(() => {
    const afterPrint = () => setDossier(null);
    window.addEventListener("afterprint", afterPrint);
    return () => window.removeEventListener("afterprint", afterPrint);
  }, []);

  const setSelected = (recordId: string, selected: boolean) => {
    const currentRoute = parseRoute();
    const next = new Set(selectedIdsRef.current);
    if (selected) next.add(recordId);
    else next.delete(recordId);
    selectedIdsRef.current = next;
    setSelectedIds(next);
    navigate(routeStateHash(currentRoute, { selectedIds: next }));
  };

  const clearSelection = () => {
    const empty = new Set<string>();
    selectedIdsRef.current = empty;
    setSelectedIds(empty);
    navigate(routeStateHash(parseRoute(), { selectedIds: empty }));
    setOutputStatus("Selection cleared.");
  };

  const hydrate = async (records: PublicRecord[]): Promise<PublicRecord[]> => {
    const hydrated: PublicRecord[] = [];
    for (
      let offset = 0;
      offset < records.length;
      offset += DETAIL_HYDRATION_CONCURRENCY
    ) {
      const batch = records.slice(
        offset,
        offset + DETAIL_HYDRATION_CONCURRENCY,
      );
      const settled = await Promise.allSettled(
        batch.map((record) => loadRecordDetail(record)),
      );
      const failures = settled.filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      if (failures.length > 0) {
        const firstReason = failures[0].reason;
        const detail =
          firstReason instanceof Error ? ` ${firstReason.message}` : "";
        throw new Error(
          `${failures.length} of ${records.length} selected detail asset${
            records.length === 1 ? "" : "s"
          } could not be validated.${detail}`,
        );
      }
      hydrated.push(
        ...settled.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        ),
      );
    }
    return hydrated;
  };

  const selectedForNation = (
    nation: Nation,
    records: PublicRecord[],
  ): PublicRecord[] =>
    records.filter(
      (record) =>
        selectedIds.has(record.internalId) &&
        recordAvailableForNation(record, nation),
    );

  const exportCsv = async (
    nation: Nation,
    criteria: SearchCriteria,
    records: PublicRecord[],
  ) => {
    const selected = selectedForNation(nation, records);
    if (selected.length === 0) {
      setOutputStatus(
        "Select at least one record available in this Nation context before downloading CSV.",
      );
      return;
    }
    setOutputStatus("Preparing selected source records for CSV.");
    let hydrated: PublicRecord[];
    try {
      hydrated = await hydrate(selected);
    } catch (error: unknown) {
      setOutputStatus(
        `CSV export canceled: ${
          error instanceof Error
            ? error.message
            : "Selected detail assets could not be validated."
        } No CSV was created.`,
      );
      return;
    }
    const csv = selectedRecordsCsv(hydrated, nation, (record) =>
      whyShownFor(record, nation.id),
    );
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "policy-sentinel-selected-records.csv";
    link.click();
    URL.revokeObjectURL(url);
    setOutputStatus(
      `CSV prepared with ${hydrated.length} selected record${
        hydrated.length === 1 ? "" : "s"
      }.`,
    );
  };

  const printDossier = async (
    nation: Nation,
    criteria: SearchCriteria,
    records: PublicRecord[],
  ) => {
    const selected = selectedForNation(nation, records);
    if (selected.length === 0) {
      setOutputStatus(
        "Select at least one record available in this Nation context before printing a dossier.",
      );
      return;
    }
    setOutputStatus("Preparing selected source records for printing.");
    setDossier(null);
    let hydrated: PublicRecord[];
    try {
      hydrated = await hydrate(selected);
    } catch (error: unknown) {
      setOutputStatus(
        `Dossier preparation canceled: ${
          error instanceof Error
            ? error.message
            : "Selected detail assets could not be validated."
        } No dossier was created or printed.`,
      );
      return;
    }
    setDossier({
      records: hydrated,
      nation,
      criteria,
      generatedAt: new Date(),
    });
    setOutputStatus("Print-ready dossier prepared.");
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => window.print()),
    );
  };

  if (!bundle && !loadError) {
    return (
      <main id="main-content" class="status-page" aria-busy="true">
        <p class="eyebrow">Policy Sentinel</p>
        <h1>Loading the public source index</h1>
        <p>This application loads only same-origin static data files.</p>
      </main>
    );
  }

  if (loadError || !bundle) {
    return (
      <main id="main-content" class="status-page">
        <p class="eyebrow">Policy Sentinel</p>
        <h1>The public source index is unavailable</h1>
        <p role="alert">{loadError}</p>
        <p>
          No policy conclusion can be drawn from an unavailable or incomplete
          artifact.
        </p>
        <button
          class="button"
          type="button"
          onClick={() => setRetry((value) => value + 1)}
        >
          Retry loading public data
        </button>
      </main>
    );
  }

  const selectedRecords = bundle.records.filter((record) =>
    selectedIds.has(record.internalId),
  );
  const routeAnnouncement = route.recordId
    ? `Record details: ${
        bundle.records.find((record) => record.internalId === route.recordId)
          ?.officialTitle ?? "Record not found"
      }`
    : (ROUTE_LABELS[route.path] ?? "Page not found");

  return (
    <div class="site-shell">
      <Header bundle={bundle} route={route} selectedIds={selectedIds} />
      <p
        id="route-announcement"
        class="visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Route changed: {routeAnnouncement}
      </p>
      {bundle.warnings.length > 0 && (
        <aside
          class="artifact-warning"
          aria-labelledby="artifact-warning-title"
        >
          <div class="content-width">
            <h2 id="artifact-warning-title">Artifact loading limitations</h2>
            <ul>
              {bundle.warnings.map((warning) => (
                <li>{warning}</li>
              ))}
            </ul>
          </div>
        </aside>
      )}

      <main id="main-content" tabindex={-1}>
        {route.recordId ? (
          <DetailPage
            bundle={bundle}
            route={route}
            selectedIds={selectedIds}
            onSelectionChange={setSelected}
            onExport={exportCsv}
            onPrint={printDossier}
            outputStatus={outputStatus}
          />
        ) : (
          <RoutePage
            bundle={bundle}
            route={route}
            selectedIds={selectedIds}
            selectedRecords={selectedRecords}
            onSelectionChange={setSelected}
            onClearSelection={clearSelection}
            onExport={exportCsv}
            onPrint={printDossier}
            outputStatus={outputStatus}
          />
        )}
      </main>

      <Footer selectedIds={selectedIds} />
      {dossier && <PrintDossier bundle={bundle} dossier={dossier} />}
    </div>
  );
}

function Header({
  bundle,
  route,
  selectedIds,
}: {
  bundle: ArtifactBundle;
  route: Route;
  selectedIds: Set<string>;
}) {
  const unclassifiedCount = bundle.records.filter(
    ({ isUnclassified }) => isUnclassified,
  ).length;
  const links = [
    ["/", "Home"],
    ["/search", "Search"],
    ["/policy", "Policy areas"],
    ["/timeline", "Landmark timeline"],
    ["/unclassified", `Unclassified (${unclassifiedCount})`],
    ["/coverage", "Source coverage"],
    ["/methodology", "Methodology"],
    ["/about", "About"],
  ];

  return (
    <header class="site-header">
      <div class="content-width site-header__top">
        <a class="brand" href={routeHash("/", undefined, { selectedIds })}>
          <span class="brand__mark" aria-hidden="true">
            PS
          </span>
          <span>
            <strong>Policy Sentinel</strong>
            <small>Official-source policy discovery</small>
          </span>
        </a>
        <div class="header-status">
          {bundle.manifest.synthetic && (
            <span class="badge badge--warning">Synthetic test data</span>
          )}
          <span>Data as of {formatDate(bundle.manifest.dataAsOf)}</span>
        </div>
      </div>
      <nav class="primary-nav" aria-label="Primary">
        <div class="content-width primary-nav__scroll">
          {links.map(([path, label]) => (
            <a
              href={routeHash(path, undefined, { selectedIds })}
              aria-current={
                route.path === path ||
                (path === "/search" && route.recordId !== null)
                  ? "page"
                  : undefined
              }
            >
              {label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}

interface RoutePageProps {
  bundle: ArtifactBundle;
  route: Route;
  selectedIds: Set<string>;
  selectedRecords: PublicRecord[];
  onSelectionChange: (recordId: string, selected: boolean) => void;
  onClearSelection: () => void;
  onExport: (
    nation: Nation,
    criteria: SearchCriteria,
    records: PublicRecord[],
  ) => Promise<void>;
  onPrint: (
    nation: Nation,
    criteria: SearchCriteria,
    records: PublicRecord[],
  ) => Promise<void>;
  outputStatus: string;
}

function RoutePage(props: RoutePageProps) {
  switch (props.route.path) {
    case "/":
      return <HomePage bundle={props.bundle} selectedIds={props.selectedIds} />;
    case "/search":
    case "/policy":
    case "/timeline":
    case "/unclassified":
      return <SearchWorkspace {...props} />;
    case "/coverage":
      return <CoveragePage bundle={props.bundle} />;
    case "/methodology":
      return <MethodologyPage />;
    case "/about":
      return <AboutPage />;
    default:
      return <NotFoundPage selectedIds={props.selectedIds} />;
  }
}

function HomePage({
  bundle,
  selectedIds,
}: {
  bundle: ArtifactBundle;
  selectedIds: Set<string>;
}) {
  return (
    <>
      <section class="hero">
        <div class="content-width hero__grid">
          <div>
            <p class="eyebrow">Sovereignty-centered source discovery</p>
            <h1>Find public policy records from official sources</h1>
            <p class="hero__lead">
              Select a federally recognized Nation, browse policy areas, or
              explore verified landmarks. Every result explains why it is shown
              and links back to official evidence.
            </p>
            <p class="boundary-note">
              The public beta includes no maps, parcels, land ownership data,
              private agreements, or inferred Nation relationships.
            </p>
          </div>
          <aside class="hero__status" aria-labelledby="home-status-title">
            <h2 id="home-status-title">Current public artifact</h2>
            <dl>
              <div>
                <dt>Data as of</dt>
                <dd>{formatDate(bundle.manifest.dataAsOf)}</dd>
              </div>
              <div>
                <dt>Records</dt>
                <dd>{bundle.manifest.recordCount ?? bundle.records.length}</dd>
              </div>
              <div>
                <dt>Nation entries</dt>
                <dd>{bundle.nations.length}</dd>
              </div>
              <div>
                <dt>Taxonomy version</dt>
                <dd>{bundle.taxonomy.version}</dd>
              </div>
            </dl>
            <a href={routeHash("/coverage", undefined, { selectedIds })}>
              Review source coverage and health
            </a>
          </aside>
        </div>
      </section>

      <section
        class="content-width entry-section"
        aria-labelledby="begin-title"
      >
        <p class="eyebrow">Three ways to begin</p>
        <h2 id="begin-title">Choose your starting point</h2>
        <div class="entry-grid">
          <article class="entry-card">
            <span class="entry-card__number" aria-hidden="true">
              01
            </span>
            <h3>Guided Nation search</h3>
            <p>
              Select one Nation, choose policy areas, review coverage, and apply
              the search.
            </p>
            <a
              class="button"
              href={routeHash("/search", undefined, { selectedIds })}
            >
              Start guided search
            </a>
          </article>
          <article class="entry-card">
            <span class="entry-card__number" aria-hidden="true">
              02
            </span>
            <h3>Browse policy areas</h3>
            <p>
              Explore the editable taxonomy, choose categories, then select a
              Nation context.
            </p>
            <a
              class="button"
              href={routeHash("/policy", undefined, { selectedIds })}
            >
              Browse policy areas
            </a>
          </article>
          <article class="entry-card">
            <span class="entry-card__number" aria-hidden="true">
              03
            </span>
            <h3>Landmark timeline</h3>
            <p>
              Browse source-verified landmarks with visible historical ranges
              and gaps.
            </p>
            <a
              class="button"
              href={routeHash("/timeline", undefined, { selectedIds })}
            >
              Open landmark timeline
            </a>
          </article>
        </div>
      </section>

      <section class="content-width comparison-callout">
        <div>
          <p class="eyebrow">Later milestone</p>
          <h2>Advanced: compare Nations</h2>
          <p>
            Comparison remains unavailable until the complete single-Nation flow
            passes its accessibility, evidence, and performance tests.
          </p>
        </div>
        <button type="button" class="button button--secondary" disabled>
          Advanced comparison unavailable
        </button>
      </section>
    </>
  );
}

function SearchWorkspace({
  bundle,
  route,
  selectedIds,
  selectedRecords,
  onSelectionChange,
  onClearSelection,
  onExport,
  onPrint,
  outputStatus,
}: RoutePageProps) {
  const appliedCriteria = useMemo(
    () => criteriaFromParams(route.params),
    [route.path, route.params.toString()],
  );
  const criteriaKey = paramsFromCriteria(appliedCriteria).toString();
  const isTimeline = route.path === "/timeline";
  const isUnclassified = route.path === "/unclassified";
  const isPolicyEntry = route.path === "/policy";
  const initialDraft = useMemo(() => {
    const criteria = criteriaFromParams(new URLSearchParams(criteriaKey));
    if (isTimeline || isUnclassified) criteria.allPolicyAreas = true;
    return criteria;
  }, [route.path, criteriaKey]);
  const [draft, setDraft] = useState<SearchCriteria>(initialDraft);
  const [nationError, setNationError] = useState("");
  const [policyError, setPolicyError] = useState("");
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  const nation = bundle.nations.find(
    (candidate) => candidate.id === appliedCriteria.nationId,
  );
  const draftNation = bundle.nations.find(
    (candidate) => candidate.id === draft.nationId,
  );
  const hasAppliedSearch =
    Boolean(nation) &&
    (isTimeline ||
      isUnclassified ||
      appliedCriteria.allPolicyAreas ||
      appliedCriteria.categoryIds.length > 0);

  const baseCriteria: SearchCriteria = {
    ...appliedCriteria,
    query: "",
    jurisdictions: [],
    documentTypes: [],
    statuses: [],
    sources: [],
    relevanceBases: [],
    dateFrom: "",
    dateThrough: "",
  };

  const baseRecords =
    nation && hasAppliedSearch
      ? filterRecords(
          bundle.records,
          nation,
          baseCriteria,
          isUnclassified,
          isTimeline,
        )
      : [];
  const results =
    nation && hasAppliedSearch
      ? filterRecords(
          bundle.records,
          nation,
          appliedCriteria,
          isUnclassified,
          isTimeline,
        )
      : [];
  const visibleCount = resultWindowFromParams(route.params);
  const visibleResults = results.slice(0, visibleCount);
  const remainingResults = Math.max(0, results.length - visibleResults.length);

  const apply = (event?: Event) => {
    event?.preventDefault();
    let valid = true;
    if (!draft.nationId) {
      setNationError("Select one Nation before applying the search.");
      valid = false;
    } else {
      setNationError("");
    }
    if (
      !isTimeline &&
      !isUnclassified &&
      !draft.allPolicyAreas &&
      draft.categoryIds.length === 0
    ) {
      setPolicyError(
        "Choose All policy areas or at least one policy category.",
      );
      valid = false;
    } else {
      setPolicyError("");
    }
    if (
      draft.dateFrom &&
      draft.dateThrough &&
      draft.dateFrom > draft.dateThrough
    ) {
      setDateError("The start date must be on or before the end date.");
      valid = false;
    } else {
      setDateError("");
    }
    if (!valid) return;

    const next = {
      ...draft,
      allPolicyAreas:
        isTimeline || isUnclassified ? true : draft.allPolicyAreas,
    };
    const targetPath = isPolicyEntry ? "/search" : route.path;
    navigate(routeHash(targetPath, next, { selectedIds }));
  };

  const resetFacets = () => {
    const next: SearchCriteria = {
      ...appliedCriteria,
      query: "",
      jurisdictions: [],
      documentTypes: [],
      statuses: [],
      sources: [],
      relevanceBases: [],
      dateFrom: "",
      dateThrough: "",
      sort: "updated-desc",
    };
    setDraft(next);
    navigate(routeHash(route.path, next, { selectedIds }));
  };

  const removeFacet = (
    key:
      | "query"
      | "jurisdictions"
      | "documentTypes"
      | "statuses"
      | "sources"
      | "relevanceBases"
      | "dates",
    value?: string,
  ) => {
    const next = { ...appliedCriteria };
    if (key === "query") next.query = "";
    else if (key === "dates") {
      next.dateFrom = "";
      next.dateThrough = "";
    } else {
      (next[key] as string[]) = (next[key] as string[]).filter(
        (item) => item !== value,
      );
    }
    setDraft(next);
    navigate(routeHash(route.path, next, { selectedIds }));
  };

  const heading = isTimeline
    ? "Landmark timeline"
    : isUnclassified
      ? "Unclassified and other records"
      : isPolicyEntry
        ? "Browse by policy area"
        : "Guided Nation search";

  const intro = isTimeline
    ? "Verified landmarks are shown with their official inclusion basis. The timeline does not imply uninterrupted historical coverage."
    : isUnclassified
      ? "These records remain discoverable because their official source subjects did not map cleanly to the Policy Sentinel taxonomy."
      : isPolicyEntry
        ? "Choose policy areas from the versioned taxonomy, then apply one Nation context."
        : "Select one Nation, choose policy scope, review coverage, then apply the search.";

  return (
    <div class="content-width workspace">
      <header class="page-heading">
        <p class="eyebrow">
          {isTimeline
            ? "Historical source discovery"
            : isUnclassified
              ? "Classification transparency"
              : "Single-Nation workflow"}
        </p>
        <h1>{heading}</h1>
        <p>{intro}</p>
      </header>

      <form class="search-builder" onSubmit={apply} noValidate>
        {isPolicyEntry && (
          <PolicySelector
            taxonomy={bundle.taxonomy}
            value={draft}
            onChange={setDraft}
            error={policyError}
          />
        )}

        <section class="builder-step" aria-labelledby="nation-step-title">
          <div class="step-number" aria-hidden="true">
            {isPolicyEntry ? "02" : "01"}
          </div>
          <div>
            <h2 id="nation-step-title">Select one Nation</h2>
            <NationPicker
              nations={bundle.nations}
              value={draft.nationId}
              onChange={(nationId) => setDraft({ ...draft, nationId })}
              error={nationError}
            />
            <button
              type="button"
              class="text-button"
              disabled
              aria-describedby="comparison-disabled-note"
            >
              Advanced: compare Nations
            </button>
            <p id="comparison-disabled-note" class="field-hint">
              Comparison is disabled until the single-Nation acceptance suite
              passes.
            </p>
          </div>
        </section>

        {!isPolicyEntry && !isTimeline && !isUnclassified && (
          <section class="builder-step" aria-labelledby="policy-step-title">
            <div class="step-number" aria-hidden="true">
              02
            </div>
            <div>
              <h2 id="policy-step-title">Choose policy scope</h2>
              <PolicySelector
                taxonomy={bundle.taxonomy}
                value={draft}
                onChange={setDraft}
                error={policyError}
              />
            </div>
          </section>
        )}

        <section class="builder-step" aria-labelledby="coverage-step-title">
          <div class="step-number" aria-hidden="true">
            {isPolicyEntry ? "03" : isTimeline || isUnclassified ? "02" : "03"}
          </div>
          <div>
            <h2 id="coverage-step-title">Review coverage</h2>
            {draftNation ? (
              <CoverageNotice nation={draftNation} bundle={bundle} />
            ) : (
              <p class="muted-panel">
                Select a Nation to see the covered jurisdictions and current
                source-health limitations.
              </p>
            )}
          </div>
        </section>

        <div class="builder-actions">
          <button class="button" type="submit">
            {hasAppliedSearch ? "Apply search and filters" : "Apply search"}
          </button>
          <p>
            Choosing options does not submit automatically. Results update only
            when you use this button.
          </p>
        </div>
      </form>

      {hasAppliedSearch && nation && (
        <section class="results-section" aria-labelledby="results-title">
          <header class="results-header">
            <div>
              <p class="eyebrow">Applied Nation context</p>
              <h2 id="results-title">{nation.officialName}</h2>
              <p>
                {isUnclassified
                  ? "Unclassified and other records"
                  : isTimeline
                    ? "Verified landmark records"
                    : criteriaPolicySummary(appliedCriteria, bundle.taxonomy)}
              </p>
            </div>
            <a href={routeHash("/coverage", undefined, { selectedIds })}>
              Review coverage matrix
            </a>
          </header>

          <CoverageNotice nation={nation} bundle={bundle} compact />

          {!isTimeline && (
            <FacetPanel
              draft={draft}
              setDraft={setDraft}
              baseRecords={baseRecords}
              dateError={dateError}
              onApply={apply}
              onReset={resetFacets}
            />
          )}

          <ActiveCriteria criteria={appliedCriteria} onRemove={removeFacet} />

          <SelectionToolbar
            selectedCount={selectedIds.size}
            availableSelectedCount={
              selectedRecords.filter((record) =>
                recordAvailableForNation(record, nation),
              ).length
            }
            onClear={onClearSelection}
            onCsv={() => onExport(nation, appliedCriteria, bundle.records)}
            onPrint={() => onPrint(nation, appliedCriteria, bundle.records)}
            outputStatus={outputStatus}
          />

          <div class="result-count" role="status" aria-live="polite">
            <strong>
              {results.length} matching record{results.length === 1 ? "" : "s"}
            </strong>
            <span>
              A zero count means no match was found in currently available
              sources. It does not mean no relevant policy exists.
            </span>
          </div>

          {results.length === 0 ? (
            <div class="empty-state">
              <h3>No records match the applied criteria</h3>
              <p>
                Try clearing a facet or review Unclassified records. Source
                availability and historical ranges remain limited.
              </p>
              {!isUnclassified && (
                <a
                  href={routeHash("/unclassified", appliedCriteria, {
                    selectedIds,
                  })}
                >
                  Review Unclassified and other records
                </a>
              )}
            </div>
          ) : isTimeline ? (
            <TimelineResults
              results={visibleResults}
              criteria={appliedCriteria}
              selectedIds={selectedIds}
              onSelectionChange={onSelectionChange}
              nation={nation}
              resultWindow={visibleCount}
            />
          ) : (
            <div class="result-list" id="result-records">
              {visibleResults.map((record) => (
                <RecordCard
                  record={record}
                  criteria={appliedCriteria}
                  fromPath={route.path}
                  whyShown={whyShownFor(record, nation.id)}
                  selected={selectedIds.has(record.internalId)}
                  selectedIds={selectedIds}
                  resultWindow={visibleCount}
                  onSelectionChange={onSelectionChange}
                />
              ))}
            </div>
          )}

          {results.length > DEFAULT_RESULT_WINDOW && (
            <div class="result-window" aria-live="polite">
              <p>
                Showing {visibleResults.length} of {results.length} matching
                records.
              </p>
              <button
                class="button button--secondary"
                type="button"
                aria-controls="result-records"
                disabled={remainingResults === 0}
                onClick={() =>
                  navigate(
                    routeHash(route.path, appliedCriteria, {
                      selectedIds,
                      resultWindow: Math.min(
                        results.length,
                        visibleCount + DEFAULT_RESULT_WINDOW,
                      ),
                    }),
                  )
                }
              >
                {remainingResults === 0
                  ? "All matching records loaded"
                  : `Load ${Math.min(
                      DEFAULT_RESULT_WINDOW,
                      remainingResults,
                    )} more records`}
              </button>
            </div>
          )}

          {!isUnclassified && (
            <aside class="unclassified-callout">
              <h3>Category selection does not cover every record</h3>
              <p>
                Records without a clean deterministic mapping from official
                source subjects remain searchable as Unclassified.
              </p>
              <a
                href={routeHash("/unclassified", appliedCriteria, {
                  selectedIds,
                })}
              >
                Browse Unclassified and other records
              </a>
            </aside>
          )}
        </section>
      )}
    </div>
  );
}

function CoverageNotice({
  nation,
  bundle,
  compact = false,
}: {
  nation: Nation;
  bundle: ArtifactBundle;
  compact?: boolean;
}) {
  const federalOnly = nation.coveredStateCodes.length === 0;
  const unhealthy = bundle.sourceHealth.filter(
    (source) => !["healthy", "current", "available"].includes(source.status),
  );
  const limitedCoverage = bundle.coverage.filter(coverageIsLimited);
  return (
    <div class={compact ? "coverage-notice is-compact" : "coverage-notice"}>
      <p>
        <strong>Jurisdictions in this Nation context:</strong> Federal
        {nation.coveredStateCodes.length > 0
          ? ` plus ${nation.coveredStateCodes.join(", ")}`
          : " only"}
      </p>
      {federalOnly && (
        <p class="coverage-warning">
          State and county source coverage in this beta is limited to
          Washington, Oregon, and Idaho. Results for this Nation currently show
          federal sources only.
        </p>
      )}
      <p>
        A general-jurisdiction record is not Nation-specific. County records
        appear only with validated official-source evidence that explicitly
        names this Nation.
      </p>
      {limitedCoverage.length > 0 && (
        <ul class="health-summary" aria-label="Bounded source coverage">
          {limitedCoverage.map((entry) => (
            <li>
              <strong>{entry.sourceName}:</strong> selected artifact window{" "}
              {coverageRangeText(entry.from, entry.through)}; documented source
              range{" "}
              {coverageRangeText(
                entry.documentedFrom,
                entry.documentedThrough,
                true,
              )}
              ; actual artifact coverage {actualCoverageText(entry)}.{" "}
              {entry.limitation}
            </li>
          ))}
        </ul>
      )}
      {unhealthy.length > 0 && (
        <ul class="health-summary" aria-label="Source health limitations">
          {unhealthy.map((source) => (
            <li>
              <span
                class={`status-dot status-dot--${healthTone(source.status)}`}
                aria-hidden="true"
              />
              <strong>{source.sourceName}:</strong> {humanize(source.status)}
              {source.usingLastKnownGood
                ? `; last successful retrieval ${formatDate(
                    source.lastSuccessfulRetrievalAt,
                  )}`
                : ""}
              {source.message ? `; ${source.message}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckboxFacet({
  legend,
  values,
  selected,
  labels,
  onChange,
}: {
  legend: string;
  values: string[];
  selected: string[];
  labels?: Record<string, string>;
  onChange: (values: string[]) => void;
}) {
  if (values.length === 0) return null;
  return (
    <fieldset class="facet-group">
      <legend>{legend}</legend>
      {values.map((value) => (
        <label>
          <input
            type="checkbox"
            checked={selected.includes(value)}
            onChange={(event) =>
              onChange(
                event.currentTarget.checked
                  ? [...new Set([...selected, value])]
                  : selected.filter((item) => item !== value),
              )
            }
          />
          {labels?.[value] ?? humanize(value)}
        </label>
      ))}
    </fieldset>
  );
}

function FacetPanel({
  draft,
  setDraft,
  baseRecords,
  dateError,
  onApply,
  onReset,
}: {
  draft: SearchCriteria;
  setDraft: (criteria: SearchCriteria) => void;
  baseRecords: PublicRecord[];
  dateError: string;
  onApply: (event?: Event) => void;
  onReset: () => void;
}) {
  const sourceLabels = Object.fromEntries(
    baseRecords.map((record) => [record.source.id, record.source.name]),
  );
  const relevanceValues: RelevanceBasis[] = [
    "explicit_nation_reference",
    "general_jurisdiction",
    "landmark",
    "source_defined",
  ];

  return (
    <details class="facet-panel" open>
      <summary>Search and filter these records</summary>
      <div class="facet-panel__body">
        <div class="search-field">
          <label for="global-search">Search official source fields</label>
          <p id="global-search-help" class="field-hint">
            Searches official titles, source names, and permitted official text
            in this static artifact. Search terms do not create relevance.
          </p>
          <input
            id="global-search"
            type="search"
            value={draft.query}
            aria-describedby="global-search-help"
            onInput={(event) =>
              setDraft({ ...draft, query: event.currentTarget.value })
            }
          />
        </div>
        <div class="facet-grid">
          <CheckboxFacet
            legend="Jurisdiction"
            values={uniqueValues(
              baseRecords,
              (record) => record.jurisdiction.name,
            )}
            selected={draft.jurisdictions}
            onChange={(jurisdictions) => setDraft({ ...draft, jurisdictions })}
          />
          <CheckboxFacet
            legend="Document type"
            values={uniqueValues(baseRecords, (record) => record.documentType)}
            selected={draft.documentTypes}
            onChange={(documentTypes) => setDraft({ ...draft, documentTypes })}
          />
          <CheckboxFacet
            legend="Normalized status"
            values={uniqueValues(
              baseRecords,
              (record) => record.status.normalized,
            )}
            selected={draft.statuses}
            onChange={(statuses) => setDraft({ ...draft, statuses })}
          />
          <CheckboxFacet
            legend="Official source"
            values={uniqueValues(baseRecords, (record) => record.source.id)}
            labels={sourceLabels}
            selected={draft.sources}
            onChange={(sources) => setDraft({ ...draft, sources })}
          />
          <CheckboxFacet
            legend="Relevance basis"
            values={relevanceValues.filter((basis) =>
              baseRecords.some(
                (record) =>
                  record.relevance.some((entry) => entry.basis === basis) ||
                  record.landmark.isLandmark ||
                  basis === "general_jurisdiction",
              ),
            )}
            labels={Object.fromEntries(
              relevanceValues.map((basis) => [basis, relevanceLabel(basis)]),
            )}
            selected={draft.relevanceBases}
            onChange={(relevanceBases) =>
              setDraft({
                ...draft,
                relevanceBases: relevanceBases as RelevanceBasis[],
              })
            }
          />
        </div>
        <fieldset
          class="date-facet"
          aria-describedby={`date-help${dateError ? " date-error" : ""}`}
        >
          <legend>Date range</legend>
          <p id="date-help" class="field-hint">
            Inclusive. Uses source updated, published, last action,
            introduction, or effective date in that order.
          </p>
          <label>
            From
            <input
              type="date"
              value={draft.dateFrom}
              aria-invalid={Boolean(dateError)}
              onInput={(event) =>
                setDraft({ ...draft, dateFrom: event.currentTarget.value })
              }
            />
          </label>
          <label>
            Through
            <input
              type="date"
              value={draft.dateThrough}
              aria-invalid={Boolean(dateError)}
              onInput={(event) =>
                setDraft({ ...draft, dateThrough: event.currentTarget.value })
              }
            />
          </label>
          {dateError && (
            <p class="field-error" id="date-error">
              {dateError}
            </p>
          )}
        </fieldset>
        <label class="sort-field">
          Sort results
          <select
            value={draft.sort}
            onChange={(event) =>
              setDraft({
                ...draft,
                sort: event.currentTarget.value as SearchCriteria["sort"],
              })
            }
          >
            <option value="updated-desc">Newest source event first</option>
            <option value="event-asc">Oldest source event first</option>
            <option value="title">Official title</option>
          </select>
        </label>
        <div class="facet-actions">
          <button class="button" type="button" onClick={() => onApply()}>
            Apply filters
          </button>
          <button
            class="button button--secondary"
            type="button"
            onClick={onReset}
          >
            Reset filters
          </button>
        </div>
      </div>
    </details>
  );
}

function ActiveCriteria({
  criteria,
  onRemove,
}: {
  criteria: SearchCriteria;
  onRemove: (
    key:
      | "query"
      | "jurisdictions"
      | "documentTypes"
      | "statuses"
      | "sources"
      | "relevanceBases"
      | "dates",
    value?: string,
  ) => void;
}) {
  const chips: Array<{
    key:
      | "query"
      | "jurisdictions"
      | "documentTypes"
      | "statuses"
      | "sources"
      | "relevanceBases"
      | "dates";
    value?: string;
    label: string;
  }> = [];
  if (criteria.query)
    chips.push({ key: "query", label: `Search: ${criteria.query}` });
  for (const value of criteria.jurisdictions)
    chips.push({ key: "jurisdictions", value, label: value });
  for (const value of criteria.documentTypes)
    chips.push({ key: "documentTypes", value, label: humanize(value) });
  for (const value of criteria.statuses)
    chips.push({ key: "statuses", value, label: humanize(value) });
  for (const value of criteria.sources)
    chips.push({ key: "sources", value, label: `Source: ${value}` });
  for (const value of criteria.relevanceBases)
    chips.push({ key: "relevanceBases", value, label: relevanceLabel(value) });
  if (criteria.dateFrom || criteria.dateThrough)
    chips.push({
      key: "dates",
      label: `${criteria.dateFrom || "Any date"} to ${
        criteria.dateThrough || "Any date"
      }`,
    });

  if (chips.length === 0) return null;
  return (
    <div class="active-criteria" aria-label="Active filters">
      <strong>Active filters</strong>
      <div>
        {chips.map((chip) => (
          <button
            type="button"
            onClick={() => onRemove(chip.key, chip.value)}
            aria-label={`Remove ${chip.label} filter`}
          >
            {chip.label} <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectionToolbar({
  selectedCount,
  availableSelectedCount,
  onClear,
  onCsv,
  onPrint,
  outputStatus,
}: {
  selectedCount: number;
  availableSelectedCount: number;
  onClear: () => void;
  onCsv: () => void;
  onPrint: () => void;
  outputStatus: string;
}) {
  return (
    <aside class="selection-toolbar" aria-labelledby="selection-title">
      <div>
        <h3 id="selection-title">{selectedCount} selected in this URL view</h3>
        <p>
          {availableSelectedCount} selected record
          {availableSelectedCount === 1 ? " is" : "s are"} available in this
          Nation context. The URL preserves selections when filters change and
          through browser Back and Forward.
        </p>
      </div>
      <div class="selection-actions">
        <button
          class="button button--small"
          type="button"
          onClick={onPrint}
          disabled={availableSelectedCount === 0}
        >
          Print source dossier
        </button>
        <button
          class="button button--small button--secondary"
          type="button"
          onClick={onCsv}
          disabled={availableSelectedCount === 0}
        >
          Download selected CSV
        </button>
        <button
          class="text-button"
          type="button"
          onClick={onClear}
          disabled={selectedCount === 0}
        >
          Clear selection
        </button>
      </div>
      <p class="output-status" role="status" aria-live="polite">
        {outputStatus}
      </p>
    </aside>
  );
}

function TimelineResults({
  results,
  criteria,
  selectedIds,
  onSelectionChange,
  nation,
  resultWindow,
}: {
  results: PublicRecord[];
  criteria: SearchCriteria;
  selectedIds: Set<string>;
  onSelectionChange: (recordId: string, selected: boolean) => void;
  nation: Nation;
  resultWindow: number;
}) {
  return (
    <ol class="timeline-list" id="result-records">
      {results.map((record) => {
        const date = updatedDate(record);
        return (
          <li>
            <div class="timeline-date">
              <span>{formatDate(date.value)}</span>
              <small>{date.label}</small>
            </div>
            <RecordCard
              record={record}
              criteria={criteria}
              fromPath="/timeline"
              whyShown={whyShownFor(record, nation.id)}
              selected={selectedIds.has(record.internalId)}
              selectedIds={selectedIds}
              resultWindow={resultWindow}
              onSelectionChange={onSelectionChange}
            />
          </li>
        );
      })}
    </ol>
  );
}

interface DetailPageProps {
  bundle: ArtifactBundle;
  route: Route;
  selectedIds: Set<string>;
  onSelectionChange: (recordId: string, selected: boolean) => void;
  onExport: (
    nation: Nation,
    criteria: SearchCriteria,
    records: PublicRecord[],
  ) => Promise<void>;
  onPrint: (
    nation: Nation,
    criteria: SearchCriteria,
    records: PublicRecord[],
  ) => Promise<void>;
  outputStatus: string;
}

function DetailPage({
  bundle,
  route,
  selectedIds,
  onSelectionChange,
  onExport,
  onPrint,
  outputStatus,
}: DetailPageProps) {
  const indexRecord = bundle.records.find(
    (record) => record.internalId === route.recordId,
  );
  const criteria = criteriaFromParams(route.params);
  const nation = bundle.nations.find(
    (candidate) => candidate.id === criteria.nationId,
  );
  const [record, setRecord] = useState<PublicRecord | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setRecord(null);
    setError("");
    if (!indexRecord) return;
    let active = true;
    loadRecordDetail(indexRecord)
      .then((detail) => {
        if (active) {
          setRecord(detail);
          window.requestAnimationFrame(() =>
            document.getElementById("record-detail-title")?.focus(),
          );
        }
      })
      .catch((loadFailure: unknown) => {
        if (active) {
          setError(
            loadFailure instanceof Error
              ? loadFailure.message
              : "The record detail could not be loaded.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [indexRecord?.internalId, attempt]);

  const returnPath = ["/search", "/timeline", "/unclassified"].includes(
    route.params.get("return") ?? "",
  )
    ? (route.params.get("return") as string)
    : "/search";
  const returnHash = routeHash(returnPath, criteria, {
    selectedIds,
    resultWindow: resultWindowFromParams(route.params),
    focusRecordId: indexRecord?.internalId ?? route.params.get("focus"),
  });

  if (!indexRecord) {
    return (
      <div class="content-width status-page">
        <h1>Record not found</h1>
        <p>
          The requested stable ID is not present in this public artifact. No
          conclusion can be drawn from the missing record.
        </p>
        <a href={returnHash}>Return to results</a>
      </div>
    );
  }

  if (!record && !error) {
    return (
      <div class="content-width status-page" aria-busy="true">
        <h1>Loading record details</h1>
        <p>
          Retrieving the separate same-origin detail asset for{" "}
          {indexRecord.officialTitle}.
        </p>
        <a href={returnHash}>Return to the result card</a>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div class="content-width status-page">
        <h1>Record detail is unavailable</h1>
        <p role="alert">{error}</p>
        <p>
          The compact result remains available. Policy Sentinel does not
          fabricate missing source language or metadata.
        </p>
        <div class="button-row">
          <button
            type="button"
            class="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry detail asset
          </button>
          <a class="button button--secondary" href={returnHash}>
            Return to result card
          </a>
          {indexRecord.urls.officialSource && (
            <a
              href={indexRecord.urls.officialSource}
              target="_blank"
              rel="noreferrer"
            >
              Open official source
            </a>
          )}
        </div>
      </div>
    );
  }

  const why = nation
    ? whyShownFor(record, nation.id)
    : {
        basis: "source_defined" as const,
        label: "Open direct-link record",
      };
  const relevantAssociation = nation
    ? record.nationAssociations.find(
        (association) => association.nationId === nation.id,
      )
    : undefined;
  const sourceCoverage = bundle.coverage.find(
    (entry) => entry.sourceId === record.source.id,
  );
  const aggregateHealth = bundle.sourceHealth.find(
    (entry) => entry.sourceId === record.source.id,
  );

  return (
    <article class="content-width record-detail">
      <a class="back-link" href={returnHash}>
        ← Return to result card
      </a>
      <header>
        <div class="badge-row">
          <span class="badge">{humanize(record.documentType)}</span>
          <span
            class={`badge badge--${healthTone(record.sourceHealth.status)}`}
          >
            Source {humanize(record.sourceHealth.status)}
          </span>
          {record.change.urgentAlert && (
            <span class="badge badge--urgent">
              {record.change.urgentAlert.label}:{" "}
              {formatDate(record.change.urgentAlert.date)}
            </span>
          )}
        </div>
        <h1 id="record-detail-title" tabindex={-1}>
          {record.officialTitle}
        </h1>
        <p class={`why-shown why-shown--${why.basis}`}>
          <strong>Why shown:</strong> {why.label}
        </p>
      </header>

      <div class="detail-layout">
        <div class="detail-main">
          <section aria-labelledby="official-metadata-title">
            <h2 id="official-metadata-title">Official source metadata</h2>
            <dl class="detail-metadata">
              {record.accordContext?.instrumentIdentity.kind ===
              "project_fallback" ? (
                <div>
                  <dt>Reviewed fallback instrument identity</dt>
                  <dd>
                    {record.sourceDocumentIdentifier} (rule:{" "}
                    {record.accordContext.instrumentIdentity.fallbackRuleId})
                  </dd>
                </div>
              ) : (
                <div>
                  <dt>
                    {record.accordContext
                      ? "Official source identifier"
                      : "Source identifier"}
                  </dt>
                  <dd>
                    {record.accordContext?.instrumentIdentity
                      .sourceIdentifier ?? record.sourceDocumentIdentifier}
                  </dd>
                </div>
              )}
              <div>
                <dt>Official source</dt>
                <dd>{record.source.name}</dd>
              </div>
              {record.source.provider && (
                <div>
                  <dt>Source provider</dt>
                  <dd>{record.source.provider}</dd>
                </div>
              )}
              {record.source.attribution && (
                <div>
                  <dt>Required attribution</dt>
                  <dd>{record.source.attribution}</dd>
                </div>
              )}
              <div>
                <dt>Selected artifact window</dt>
                <dd>
                  {coverageRangeText(
                    record.source.coverageFrom ?? null,
                    record.source.coverageThrough ?? null,
                    true,
                  )}
                </dd>
              </div>
              <div>
                <dt>Jurisdiction</dt>
                <dd>
                  {record.jurisdiction.name} ({record.jurisdiction.level})
                </dd>
              </div>
              {!record.accordContext && (
                <div>
                  <dt>Issuing body</dt>
                  <dd>
                    {record.issuingBodies.join("; ") ||
                      "Not provided by source"}
                  </dd>
                </div>
              )}
              {record.accordContext ? (
                <div>
                  <dt>Current status</dt>
                  <dd>Not stated by source</dd>
                </div>
              ) : (
                <>
                  <div>
                    <dt>Source-reported status</dt>
                    <dd>
                      {record.status.sourceLabel ?? "Not provided by source"}{" "}
                      {record.status.asOf
                        ? `(as of ${formatDate(record.status.asOf)})`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Normalized status</dt>
                    <dd>{humanize(record.status.normalized)}</dd>
                  </div>
                </>
              )}
              <div>
                <dt>Published</dt>
                <dd>{formatDate(record.dates.published)}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatDate(record.dates.updated)}</dd>
              </div>
              <div>
                <dt>Retrieved</dt>
                <dd>{formatDate(record.dates.retrieved)}</dd>
              </div>
            </dl>
            {record.source.coverageNotes && (
              <p class="boundary-note">
                <strong>Source coverage limitation:</strong>{" "}
                {record.source.coverageNotes}
              </p>
            )}
            {record.texts.detailReproductionBasis && (
              <p class="boundary-note">
                <strong>Official-text boundary:</strong>{" "}
                {record.texts.detailReproductionBasis}
              </p>
            )}
            <div class="button-row">
              {record.urls.officialSource && (
                <a
                  class="button"
                  href={record.urls.officialSource}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open official source{" "}
                  <span class="visually-hidden">(opens a new tab)</span>
                </a>
              )}
              {record.urls.officialFullText && (
                <a
                  class="button button--secondary"
                  href={record.urls.officialFullText}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open official full text{" "}
                  <span class="visually-hidden">(opens a new tab)</span>
                </a>
              )}
            </div>
          </section>

          {record.accordContext && (
            <section aria-labelledby="accord-context-title">
              <h2 id="accord-context-title">Accord metadata</h2>
              <dl class="detail-metadata">
                <div>
                  <dt>Parties and source roles</dt>
                  <dd>
                    <ul>
                      {record.accordContext.parties.map((party) => (
                        <li
                          key={[party.partyKind, party.officialName].join(":")}
                        >
                          <strong>{party.officialName}</strong> ({" "}
                          {humanize(party.partyKind).toLocaleLowerCase()}):{" "}
                          {party.roles.map((role, index) => (
                            <span
                              key={[
                                role.normalized,
                                role.sourceLabel,
                                role.sourceUrl,
                              ].join(":")}
                            >
                              {index > 0 ? "; " : ""}
                              <a
                                href={role.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {role.sourceLabel}
                                <span class="visually-hidden">
                                  {" "}
                                  (opens a new tab)
                                </span>
                              </a>{" "}
                              ({humanize(role.normalized).toLocaleLowerCase()})
                            </span>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
                <div>
                  <dt>{humanize(record.accordContext.executionEvent.role)}</dt>
                  <dd>
                    {formatDate(record.accordContext.executionEvent.date)} ·{" "}
                    <a
                      href={record.accordContext.executionEvent.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {record.accordContext.executionEvent.sourceLabel}
                      <span class="visually-hidden"> (opens a new tab)</span>
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Narrative execution evidence</dt>
                  <dd>
                    <a
                      href={record.accordContext.statusReview.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {record.accordContext.statusReview.sourceLabel}
                      <span class="visually-hidden"> (opens a new tab)</span>
                    </a>{" "}
                    (reviewed{" "}
                    {formatDate(record.accordContext.statusReview.reviewedOn)})
                  </dd>
                </div>
                <div>
                  <dt>Supersession review</dt>
                  <dd>
                    {humanize(record.accordContext.supersessionReview.state)} ·{" "}
                    {humanize(
                      record.accordContext.supersessionReview.scope,
                    ).toLocaleLowerCase()}{" "}
                    · reviewed{" "}
                    {formatDate(
                      record.accordContext.supersessionReview.reviewedOn,
                    )}
                    <ul>
                      {record.accordContext.supersessionReview.sourceUrls.map(
                        (sourceUrl) => (
                          <li key={sourceUrl}>
                            <a
                              href={sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Reviewed official source
                              <span class="visually-hidden">
                                {" "}
                                (opens a new tab)
                              </span>
                            </a>
                          </li>
                        ),
                      )}
                    </ul>
                  </dd>
                </div>
                <div>
                  <dt>Instrument identity basis</dt>
                  <dd>
                    {record.accordContext.instrumentIdentity.kind ===
                    "project_fallback" ? (
                      <>
                        Reviewed project fallback ({" "}
                        {record.accordContext.instrumentIdentity.fallbackRuleId}
                        )
                      </>
                    ) : (
                      <>
                        Source-provided identifier:{" "}
                        {
                          record.accordContext.instrumentIdentity
                            .sourceIdentifier
                        }
                      </>
                    )}
                  </dd>
                </div>
              </dl>
              <p class="boundary-note">
                <strong>Current-status boundary:</strong> Narrative execution
                language documents a historical event. It does not establish the
                instrument&apos;s current legal status or legal effect.
              </p>
              <p class="boundary-note">
                <strong>Relationship boundary:</strong> The supersession review
                covers only the listed reviewed official sources. It is not a
                complete amendment or supersession history.
              </p>
              <p class="boundary-note">
                <strong>Nation-association boundary:</strong> Collective party
                language does not create a Nation-specific relationship. Any
                Nation association requires separate exact official signatory
                evidence.
              </p>
            </section>
          )}

          {record.judicialContext && (
            <section aria-labelledby="judicial-context-title">
              <h2 id="judicial-context-title">Court and decision metadata</h2>
              <dl class="detail-metadata">
                <div>
                  <dt>
                    {record.judicialContext.adjudicatingBody.kind === "court"
                      ? "Court"
                      : "Adjudicating body"}
                  </dt>
                  <dd>
                    {record.judicialContext.adjudicatingBody.officialName}
                  </dd>
                </div>
                <div>
                  <dt>Docket</dt>
                  <dd>{record.judicialContext.docketNumbers.join("; ")}</dd>
                </div>
                <div>
                  <dt>Citation</dt>
                  <dd>
                    {record.judicialContext.citations.map(
                      ({ kind, value, sourceUrl }, index) => (
                        <span key={`${kind}:${value}:${sourceUrl}`}>
                          {index > 0 ? "; " : ""}
                          <a href={sourceUrl} target="_blank" rel="noreferrer">
                            {value}
                            <span class="visually-hidden">
                              {" "}
                              (opens a new tab)
                            </span>
                          </a>{" "}
                          ({humanize(kind)})
                        </span>
                      ),
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Decision date</dt>
                  <dd>{formatDate(record.judicialContext.decisionDate)}</dd>
                </div>
                <div>
                  <dt>Document form</dt>
                  <dd>
                    {record.judicialContext.documentForm.sourceLabel} (
                    {humanize(
                      record.judicialContext.documentForm.normalized,
                    ).toLocaleLowerCase()}
                    )
                  </dd>
                </div>
                <div>
                  <dt>Publication status</dt>
                  <dd>
                    {record.judicialContext.publicationStatus.sourceLabel} (as
                    of{" "}
                    {formatDate(record.judicialContext.publicationStatus.asOf)})
                  </dd>
                </div>
                <div>
                  <dt>Revision review</dt>
                  <dd>
                    {humanize(record.judicialContext.revisionReview.state)} (
                    reviewed{" "}
                    {formatDate(
                      record.judicialContext.revisionReview.reviewedOn,
                    )}
                    )
                  </dd>
                </div>
              </dl>
              <p class="boundary-note">
                <strong>Decision-history boundary:</strong> The revision review
                reports only what the selected official index exposes. It is not
                a complete subsequent-history, precedential-force, or
                legal-effect determination.
              </p>
            </section>
          )}

          {record.landmark.isLandmark && (
            <section aria-labelledby="landmark-evidence-title">
              <h2 id="landmark-evidence-title">Landmark inclusion evidence</h2>
              <dl class="detail-metadata">
                <div>
                  <dt>Written inclusion criterion</dt>
                  <dd>
                    {record.landmark.criterionCodes.map(humanize).join("; ")}
                  </dd>
                </div>
                <div>
                  <dt>Project editorial review</dt>
                  <dd>{humanize(record.landmark.reviewState ?? "unknown")}</dd>
                </div>
              </dl>
              <p class="boundary-note">
                <strong>Selection boundary:</strong> Landmark status is a
                reviewed editorial inclusion decision for this discovery tool.
                It is not a legal-effect, rights, or Nation-relationship
                determination.
              </p>
              <ul class="provenance-list">
                {record.landmark.officialEvidence.map((evidence) => (
                  <li
                    key={`${evidence.sourceUrl}:${evidence.sourceDate ?? ""}`}
                  >
                    {evidence.text ? (
                      <blockquote>{evidence.text}</blockquote>
                    ) : (
                      <p>{evidence.sourceLabel}</p>
                    )}
                    <p>
                      Evidence date: {formatDate(evidence.sourceDate)} ·{" "}
                      <a
                        href={evidence.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Verify official evidence
                        <span class="visually-hidden"> (opens a new tab)</span>
                      </a>
                    </p>
                    <p>
                      <strong>Reproduction boundary:</strong>{" "}
                      {evidence.reproductionBasis}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(record.texts.officialSummary ||
            record.texts.sourceExcerpt ||
            record.texts.officialLanguage) && (
            <section aria-labelledby="source-language-title">
              <h2 id="source-language-title">Official source language</h2>
              {record.texts.officialSummary && (
                <SourceLanguage
                  title="Official source summary"
                  source={record.texts.officialSummary}
                />
              )}
              {record.texts.sourceExcerpt && (
                <SourceLanguage
                  title="Source-provided excerpt"
                  source={record.texts.sourceExcerpt}
                />
              )}
              {record.texts.officialLanguage && (
                <details class="source-language">
                  <summary>
                    Full official language included by source terms
                  </summary>
                  <SourceLanguage
                    title="Official language"
                    source={record.texts.officialLanguage}
                  />
                </details>
              )}
            </section>
          )}

          {relevantAssociation && (
            <section aria-labelledby="nation-evidence-title">
              <h2 id="nation-evidence-title">
                Exact Nation-reference evidence
              </h2>
              <blockquote>{relevantAssociation.evidenceText}</blockquote>
              <p>
                Location:{" "}
                {relevantAssociation.evidenceLocation ?? "Not specified"}
              </p>
              <a
                href={relevantAssociation.evidenceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Verify in official source{" "}
                <span class="visually-hidden">(opens a new tab)</span>
              </a>
            </section>
          )}

          {(record.actionHistory.length > 0 ||
            record.statusHistory.length > 0) && (
            <section aria-labelledby="history-title">
              <h2 id="history-title">Source history</h2>
              <ol class="history-list">
                {[...record.actionHistory, ...record.statusHistory].map(
                  (event) => (
                    <li>
                      <time>{formatDate(event.date)}</time>
                      <span>{event.sourceLabel}</span>
                      {event.sourceUrl && (
                        <a
                          href={event.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Official event source
                        </a>
                      )}
                    </li>
                  ),
                )}
              </ol>
            </section>
          )}

          {record.sourceDocumentRelationships.length > 0 && (
            <section aria-labelledby="source-relationships-title">
              <h2 id="source-relationships-title">
                Source document relationships
              </h2>
              <p>
                These labels and links come from the official source and are not
                a legal-effect determination.
              </p>
              <ul class="relationship-list">
                {record.sourceDocumentRelationships.map((relationship) => (
                  <li>
                    <strong>{relationship.sourceLabel}</strong>
                    <span>
                      {humanize(relationship.relationshipType)}:{" "}
                      <a
                        href={relationship.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {relationship.targetSourceRecordId}
                        <span class="visually-hidden"> (opens a new tab)</span>
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {record.aiSummary.exists &&
            record.aiSummary.validationState === "approved" && (
              <section class="ai-summary" aria-labelledby="ai-summary-title">
                <h2 id="ai-summary-title">AI-generated source summary</h2>
                <p>{record.aiSummary.text}</p>
                <dl>
                  <div>
                    <dt>Build</dt>
                    <dd>{record.aiSummary.buildId ?? "Not provided"}</dd>
                  </div>
                  <div>
                    <dt>Generated</dt>
                    <dd>{formatDate(record.aiSummary.generatedAt)}</dd>
                  </div>
                </dl>
                <ul>
                  {record.aiSummary.citedInputs.map((citation) => (
                    <li>
                      {citation.field ?? "Official input"}{" "}
                      {citation.sourceDate
                        ? `(${formatDate(citation.sourceDate)})`
                        : ""}
                      {citation.sourceUrl && (
                        <>
                          {" "}
                          <a
                            href={citation.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Official source
                          </a>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
        </div>

        <aside class="detail-sidebar" aria-labelledby="record-controls-title">
          <h2 id="record-controls-title">Use this source record</h2>
          <label class="selection-checkbox">
            <input
              type="checkbox"
              checked={selectedIds.has(record.internalId)}
              onChange={(event) =>
                onSelectionChange(
                  record.internalId,
                  event.currentTarget.checked,
                )
              }
            />
            Select for dossier and CSV
          </label>
          {nation ? (
            <div class="sidebar-actions">
              <button
                class="button button--small"
                type="button"
                onClick={() => onPrint(nation, criteria, bundle.records)}
              >
                Print selected dossier
              </button>
              <button
                class="button button--small button--secondary"
                type="button"
                onClick={() => onExport(nation, criteria, bundle.records)}
              >
                Download selected CSV
              </button>
            </div>
          ) : (
            <p>Open this record from a Nation search to create outputs.</p>
          )}
          <p class="output-status" role="status" aria-live="polite">
            {outputStatus}
          </p>

          <h3>Subjects and categories</h3>
          {record.officialSubjects.length > 0 ? (
            <ul>
              {record.officialSubjects.map((subject) => (
                <li>{subject}</li>
              ))}
            </ul>
          ) : (
            <p>No official source subject was provided.</p>
          )}
          {record.isUnclassified ? (
            <p class="badge badge--warning">Unclassified</p>
          ) : (
            <ul>
              {record.taxonomyMemberships.map((membership) => (
                <li>
                  {membership.categoryId}
                  {membership.subcategoryId
                    ? ` / ${membership.subcategoryId}`
                    : ""}
                </li>
              ))}
            </ul>
          )}

          <h3>Validation and provenance</h3>
          <p>
            Data quality: <strong>{humanize(record.dataQuality.state)}</strong>
          </p>
          <p>
            Source health:{" "}
            <strong>
              {humanize(aggregateHealth?.status ?? record.sourceHealth.status)}
            </strong>
          </p>
          <p>
            Data as of:{" "}
            {formatDate(
              aggregateHealth?.dataAsOf ?? record.sourceHealth.dataAsOf,
            )}
          </p>
          <p>
            Last successful retrieval:{" "}
            {formatDate(
              aggregateHealth?.lastSuccessfulRetrievalAt ??
                record.sourceHealth.lastSuccessfulRetrievalAt,
            )}
          </p>
          {(aggregateHealth?.usingLastKnownGood ??
            record.sourceHealth.usingLastKnownGood) && (
            <p class="coverage-warning">Using last-known-good source data.</p>
          )}
          {(aggregateHealth?.message ?? record.sourceHealth.message) && (
            <p>{aggregateHealth?.message ?? record.sourceHealth.message}</p>
          )}
          {sourceCoverage && (
            <>
              <h3>Artifact coverage</h3>
              <p>
                Selected window:{" "}
                {coverageRangeText(sourceCoverage.from, sourceCoverage.through)}
              </p>
              <p>
                Documented source range:{" "}
                {coverageRangeText(
                  sourceCoverage.documentedFrom,
                  sourceCoverage.documentedThrough,
                  true,
                )}
              </p>
              <p>Actual coverage: {actualCoverageText(sourceCoverage)}</p>
              <p>{sourceCoverage.limitation}</p>
            </>
          )}
          <details>
            <summary>
              Field provenance ({record.fieldProvenance.length})
            </summary>
            <ul class="provenance-list">
              {record.fieldProvenance.map((entry) => (
                <li>
                  <code>{entry.field}</code>
                  <span>{humanize(entry.validationState ?? "unknown")}</span>
                  {entry.sourceUrl && (
                    <a href={entry.sourceUrl} target="_blank" rel="noreferrer">
                      Evidence
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </details>
        </aside>
      </div>
    </article>
  );
}

function SourceLanguage({
  title,
  source,
}: {
  title: string;
  source: { text: string; sourceDate?: string | null; sourceUrl?: string };
}) {
  return (
    <div class="source-language">
      <h3>{title}</h3>
      <p>{source.text}</p>
      <p class="source-citation">
        Source date: {formatDate(source.sourceDate)}
        {source.sourceUrl && (
          <>
            {" · "}
            <a href={source.sourceUrl} target="_blank" rel="noreferrer">
              Official citation
            </a>
          </>
        )}
      </p>
    </div>
  );
}

function CoveragePage({ bundle }: { bundle: ArtifactBundle }) {
  return (
    <div class="content-width prose-page">
      <header class="page-heading">
        <p class="eyebrow">Transparent limits</p>
        <h1>Source coverage and health</h1>
        <p>
          Every source has its own historical range and freshness state.
          Availability does not establish relevance, and a gap does not mean no
          policy exists.
        </p>
      </header>
      <p class="data-as-of">
        Overall artifact data as of{" "}
        <strong>{formatDate(bundle.manifest.dataAsOf)}</strong>
      </p>
      <div class="table-wrap">
        <table>
          <caption>Public beta source coverage</caption>
          <thead>
            <tr>
              <th scope="col">Source</th>
              <th scope="col">Jurisdictions</th>
              <th scope="col">Selected artifact window</th>
              <th scope="col">Documented source range</th>
              <th scope="col">Actual validated records</th>
              <th scope="col">Coverage state</th>
              <th scope="col">Limitations</th>
            </tr>
          </thead>
          <tbody>
            {bundle.coverage.map((entry) => (
              <tr>
                <th scope="row">
                  {entry.sourceName}
                  <small>{entry.provider}</small>
                </th>
                <td>{entry.jurisdictions.join(", ") || "Source-specific"}</td>
                <td>{coverageRangeText(entry.from, entry.through)}</td>
                <td>
                  {coverageRangeText(
                    entry.documentedFrom,
                    entry.documentedThrough,
                    true,
                  )}
                </td>
                <td>{actualCoverageText(entry)}</td>
                <td>
                  <span
                    class={`status-label status-label--${healthTone(entry.status)}`}
                  >
                    {humanize(entry.status)}
                  </span>
                </td>
                <td>
                  <p>
                    {entry.limitation || "See source-specific documentation."}
                  </p>
                  <small>Cadence: {entry.cadence}</small>
                  {entry.recordTypes.length > 0 && (
                    <small>
                      Record types: {entry.recordTypes.map(humanize).join(", ")}
                    </small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Source health</h2>
      <div class="health-grid">
        {bundle.sourceHealth.map((source) => (
          <article
            class={`health-card health-card--${healthTone(source.status)}`}
          >
            <h3>{source.sourceName}</h3>
            <p>
              <strong>{humanize(source.status)}</strong>
            </p>
            <dl>
              <div>
                <dt>Data as of</dt>
                <dd>{formatDate(source.dataAsOf)}</dd>
              </div>
              <div>
                <dt>Last successful retrieval</dt>
                <dd>{formatDate(source.lastSuccessfulRetrievalAt)}</dd>
              </div>
              <div>
                <dt>Using last-known-good data</dt>
                <dd>{source.usingLastKnownGood ? "Yes" : "No"}</dd>
              </div>
            </dl>
            {source.message && <p>{source.message}</p>}
          </article>
        ))}
      </div>
      <aside class="boundary-note">
        <h2>Geographic boundary</h2>
        <p>
          The initial state source scope is Washington, Oregon, and Idaho. A
          Nation outside those validated designations receives federal records
          only. County records require an explicit Nation name in an official
          record. The interface never infers coverage or relevance from
          addresses, location, territory, maps, or land data.
        </p>
      </aside>
    </div>
  );
}

function MethodologyPage() {
  return (
    <div class="content-width prose-page">
      <header class="page-heading">
        <p class="eyebrow">Evidence before inference</p>
        <h1>Methodology</h1>
      </header>
      <h2>Official sources and provenance</h2>
      <p>
        Policy Sentinel retains exact source identifiers, dates, official links,
        validation state, and field-level provenance. Source-specific historical
        ranges and refresh failures remain visible.
      </p>
      <h2>Nation relationships</h2>
      <p>
        A public Nation-to-record relationship requires exact evidence in an
        official source. AI, keywords, geography, land data, eligibility, and
        sponsor identity cannot create that relationship. State and federal
        records without exact evidence are labeled general jurisdiction and not
        Nation-specific.
      </p>
      <h2>Policy categories</h2>
      <p>
        Categories come from a versioned taxonomy. Only deterministic mappings
        from exact official source subjects or topic labels may populate them.
        Records without a clean mapping stay Unclassified and searchable.
      </p>
      <h2>Historical and landmark records</h2>
      <p>
        Before 1980, non-landmark records are generally citation-and-link
        entries. Detailed landmark treatment is limited to documented court
        decisions, treaties, statutes, public state or federal accords, or
        records an official source identifies as foundational.
      </p>
      <h2>AI boundary</h2>
      <p>
        Searching, record details, CSV, and dossiers require no AI. The browser
        makes no LLM calls. Any separately approved build-time summary may
        appear only inside details with its official cited inputs and build
        provenance.
      </p>
    </div>
  );
}

function AboutPage() {
  return (
    <div class="content-width prose-page">
      <header class="page-heading">
        <p class="eyebrow">About the project</p>
        <h1>Policy Sentinel</h1>
        <p>
          A sovereignty-centered public policy discovery, monitoring, and
          source-reference tool designed for Tribal government leadership and
          staff, policy staff, grants staff, and program staff.
        </p>
      </header>
      <h2>Public and private boundary</h2>
      <p>
        The public application contains only reviewed public-source metadata and
        permitted source language. It contains no private Tribal material,
        private agreements, credentials, personal data, maps, parcels, ownership
        records, or sensitive land context.
      </p>
      <h2>Historical attribution</h2>
      <p>
        This independent project draws lessons from an earlier public Policy
        Sentinel effort associated with the Affiliated Tribes of Northwest
        Indians Climate Resilience Program. It does not copy or inherit that
        project's software architecture.
      </p>
      <h2>Privacy</h2>
      <p>
        The public beta has no telemetry, analytics, search logging, tracking
        pixels, or automatic outbound data transmission. Search runs locally
        against static public assets.
      </p>
      <aside class="disclaimer">
        <h2>Important limitation</h2>
        <p>{DISCLAIMER}</p>
      </aside>
    </div>
  );
}

function NotFoundPage({ selectedIds }: { selectedIds: Set<string> }) {
  return (
    <div class="content-width status-page">
      <h1>Page not found</h1>
      <p>The requested route is not part of this static application.</p>
      <a href={routeHash("/", undefined, { selectedIds })}>
        Return to Policy Sentinel
      </a>
    </div>
  );
}

function Footer({ selectedIds }: { selectedIds: Set<string> }) {
  return (
    <footer class="site-footer">
      <div class="content-width footer-grid">
        <div>
          <strong>Policy Sentinel</strong>
          <p>Official-source public policy discovery for Tribal Nations.</p>
        </div>
        <nav aria-label="Footer">
          <a href={routeHash("/coverage", undefined, { selectedIds })}>
            Source coverage
          </a>
          <a href={routeHash("/methodology", undefined, { selectedIds })}>
            Methodology
          </a>
          <a href={routeHash("/about", undefined, { selectedIds })}>
            About and attribution
          </a>
        </nav>
      </div>
      <p class="content-width footer-disclaimer">{DISCLAIMER}</p>
    </footer>
  );
}

function PrintDossier({
  bundle,
  dossier,
}: {
  bundle: ArtifactBundle;
  dossier: DossierState;
}) {
  const sourceIds = new Set(dossier.records.map((record) => record.source.id));
  const health = bundle.sourceHealth.filter((source) =>
    sourceIds.has(source.sourceId),
  );
  const coverage = bundle.coverage.filter((entry) =>
    sourceIds.has(entry.sourceId),
  );
  const sourceAttributions = [
    ...new Map(
      dossier.records.map((record) => [
        record.source.id,
        {
          sourceName: record.source.name,
          attribution: record.source.attribution ?? "Not provided",
        },
      ]),
    ).values(),
  ];
  return (
    <article id="print-dossier" aria-hidden="true">
      <header>
        <p class="eyebrow">Print-ready source dossier</p>
        <h1>Policy Sentinel source dossier</h1>
        <dl>
          <div>
            <dt>Selected Nation</dt>
            <dd>{dossier.nation.officialName}</dd>
          </div>
          <div>
            <dt>Current view criteria</dt>
            <dd>{exactCriteriaSummary(dossier.criteria, bundle.taxonomy)}</dd>
          </div>
          <div>
            <dt>Selection basis</dt>
            <dd>
              {dossier.records.length} explicitly selected record
              {dossier.records.length === 1 ? "" : "s"} available in this Nation
              context. Selections persist across filters, so a selected record
              may not match the current view criteria shown above.
            </dd>
          </div>
          <div>
            <dt>Generated</dt>
            <dd>{formatDate(dossier.generatedAt.toISOString())}</dd>
          </div>
          <div>
            <dt>Artifact data as of</dt>
            <dd>{formatDate(bundle.manifest.dataAsOf)}</dd>
          </div>
        </dl>
      </header>

      <section>
        <h2>Coverage and source health</h2>
        <p>
          Initial state source scope is limited to Washington, Oregon, and
          Idaho. Records reflect only the available source-specific date ranges
          and should not be read as a complete account of policy affecting this
          Nation. General-jurisdiction records are not Nation-specific.
        </p>
        <h3>Selected-source coverage</h3>
        <ul>
          {coverage.map((entry) => (
            <li>
              <strong>{entry.sourceName}:</strong> selected artifact window{" "}
              {coverageRangeText(entry.from, entry.through)}; documented source
              range{" "}
              {coverageRangeText(
                entry.documentedFrom,
                entry.documentedThrough,
                true,
              )}
              ; actual artifact coverage {actualCoverageText(entry)}; coverage
              state {humanize(entry.status)}. {entry.limitation}
            </li>
          ))}
        </ul>
        <h3>Source attribution</h3>
        <ul>
          {sourceAttributions.map((source) => (
            <li>
              <strong>{source.sourceName}:</strong> {source.attribution}
            </li>
          ))}
        </ul>
        <h3>Source health</h3>
        <ul>
          {health.map((source) => (
            <li>
              <strong>{source.sourceName}:</strong> {humanize(source.status)},
              data as of {formatDate(source.dataAsOf)}
              {source.usingLastKnownGood
                ? `, using last-known-good data from ${formatDate(
                    source.lastSuccessfulRetrievalAt,
                  )}`
                : ""}
              {source.message ? `; ${source.message}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Selected official-source records</h2>
        {dossier.records.map((record, index) => {
          const why = whyShownFor(record, dossier.nation.id);
          const date = updatedDate(record);
          return (
            <article class="dossier-record">
              <p class="dossier-record__number">Record {index + 1}</p>
              <h3>{record.officialTitle}</h3>
              <dl>
                {record.accordContext?.instrumentIdentity.kind ===
                "project_fallback" ? (
                  <div>
                    <dt>Reviewed fallback instrument identity</dt>
                    <dd>
                      {record.sourceDocumentIdentifier} (rule:{" "}
                      {record.accordContext.instrumentIdentity.fallbackRuleId})
                    </dd>
                  </div>
                ) : (
                  <div>
                    <dt>Official identifier</dt>
                    <dd>
                      {record.accordContext?.instrumentIdentity
                        .sourceIdentifier ?? record.sourceDocumentIdentifier}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Document type</dt>
                  <dd>{humanize(record.documentType)}</dd>
                </div>
                <div>
                  <dt>Jurisdiction</dt>
                  <dd>{record.jurisdiction.name}</dd>
                </div>
                {!record.accordContext && (
                  <div>
                    <dt>Issuing body</dt>
                    <dd>
                      {record.issuingBodies.join("; ") ||
                        "Not provided by source"}
                    </dd>
                  </div>
                )}
                {record.judicialContext && (
                  <>
                    <div>
                      <dt>
                        {record.judicialContext.adjudicatingBody.kind ===
                        "court"
                          ? "Court"
                          : "Adjudicating body"}
                      </dt>
                      <dd>
                        {record.judicialContext.adjudicatingBody.officialName}
                      </dd>
                    </div>
                    <div>
                      <dt>Docket</dt>
                      <dd>{record.judicialContext.docketNumbers.join("; ")}</dd>
                    </div>
                    <div>
                      <dt>Citation</dt>
                      <dd>
                        {record.judicialContext.citations.map(
                          ({ kind, value, sourceUrl }, citationIndex) => (
                            <span key={`${kind}:${value}:${sourceUrl}`}>
                              {citationIndex > 0 ? "; " : ""}
                              <a href={sourceUrl}>{value}</a> ({sourceUrl})
                            </span>
                          ),
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Decision date</dt>
                      <dd>{formatDate(record.judicialContext.decisionDate)}</dd>
                    </div>
                    <div>
                      <dt>Document form</dt>
                      <dd>{record.judicialContext.documentForm.sourceLabel}</dd>
                    </div>
                    <div>
                      <dt>Publication status</dt>
                      <dd>
                        {record.judicialContext.publicationStatus.sourceLabel}
                      </dd>
                    </div>
                    <div>
                      <dt>Revision review</dt>
                      <dd>
                        {humanize(record.judicialContext.revisionReview.state)}
                      </dd>
                    </div>
                  </>
                )}
                {record.accordContext && (
                  <>
                    <div>
                      <dt>Accord parties</dt>
                      <dd>
                        {record.accordContext.parties
                          .map(({ officialName }) => officialName)
                          .join("; ")}
                      </dd>
                    </div>
                    <div>
                      <dt>Party roles and evidence</dt>
                      <dd>
                        {record.accordContext.parties.map(
                          (party, partyIndex) => (
                            <span
                              key={[
                                party.sourceId ?? "collective",
                                party.officialName,
                              ].join(":")}
                            >
                              {partyIndex > 0 ? "; " : ""}
                              {party.officialName}:{" "}
                              {party.roles.map((role, roleIndex) => (
                                <span
                                  key={[role.normalized, role.sourceUrl].join(
                                    ":",
                                  )}
                                >
                                  {roleIndex > 0 ? ", " : ""}
                                  {role.sourceLabel} ({role.sourceUrl})
                                </span>
                              ))}
                            </span>
                          ),
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {humanize(record.accordContext.executionEvent.role)}
                      </dt>
                      <dd>
                        {formatDate(record.accordContext.executionEvent.date)} ·{" "}
                        {record.accordContext.executionEvent.sourceLabel} ({" "}
                        {record.accordContext.executionEvent.sourceUrl})
                      </dd>
                    </div>
                    <div>
                      <dt>Narrative execution evidence</dt>
                      <dd>
                        {record.accordContext.statusReview.sourceLabel} ({" "}
                        {record.accordContext.statusReview.sourceUrl}); reviewed{" "}
                        {formatDate(
                          record.accordContext.statusReview.reviewedOn,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Supersession review</dt>
                      <dd>
                        {humanize(
                          record.accordContext.supersessionReview.state,
                        )}
                        ;{" "}
                        {humanize(
                          record.accordContext.supersessionReview.scope,
                        ).toLocaleLowerCase()}
                        ; reviewed{" "}
                        {formatDate(
                          record.accordContext.supersessionReview.reviewedOn,
                        )}
                        ; reviewed sources:{" "}
                        {record.accordContext.supersessionReview.sourceUrls.join(
                          "; ",
                        )}
                      </dd>
                    </div>
                  </>
                )}
                {record.accordContext ? (
                  <div>
                    <dt>Current status</dt>
                    <dd>Not stated by source</dd>
                  </div>
                ) : (
                  <div>
                    <dt>Source status</dt>
                    <dd>
                      {record.status.sourceLabel ?? "Not provided by source"}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>{date.label}</dt>
                  <dd>{formatDate(date.value)}</dd>
                </div>
                <div>
                  <dt>Why shown</dt>
                  <dd>{why.label}</dd>
                </div>
                {record.landmark.isLandmark && (
                  <>
                    <div>
                      <dt>Landmark inclusion criterion</dt>
                      <dd>
                        {record.landmark.criterionCodes
                          .map(humanize)
                          .join("; ")}
                      </dd>
                    </div>
                    <div>
                      <dt>Project editorial review</dt>
                      <dd>
                        {humanize(record.landmark.reviewState ?? "unknown")}
                      </dd>
                    </div>
                  </>
                )}
                <div>
                  <dt>Official source</dt>
                  <dd>{record.urls.officialSource}</dd>
                </div>
                {record.urls.officialFullText && (
                  <div>
                    <dt>Official full text</dt>
                    <dd>{record.urls.officialFullText}</dd>
                  </div>
                )}
                {record.source.attribution && (
                  <div>
                    <dt>Source attribution</dt>
                    <dd>{record.source.attribution}</dd>
                  </div>
                )}
              </dl>
              {record.judicialContext && (
                <p>
                  Decision-history boundary: the revision review reports only
                  what the selected official index exposes; it is not a complete
                  subsequent-history, precedential-force, or legal-effect
                  determination.
                </p>
              )}
              {record.accordContext && (
                <>
                  <p>
                    Current-status boundary: narrative execution language
                    documents a historical event. It does not establish the
                    instrument&apos;s current legal status or legal effect.
                  </p>
                  <p>
                    Relationship boundary: the supersession review covers only
                    the listed reviewed official sources. It is not a complete
                    amendment or supersession history.
                  </p>
                  <p>
                    Nation-association boundary: collective party language does
                    not create a Nation-specific relationship. Any Nation
                    association requires separate exact official signatory
                    evidence.
                  </p>
                </>
              )}
              {record.texts.detailReproductionBasis && (
                <p>
                  Official-text boundary: {record.texts.detailReproductionBasis}
                </p>
              )}
              {why.evidence && why.basis === "explicit_nation_reference" && (
                <>
                  <h4>Exact Nation-reference evidence</h4>
                  <blockquote>{why.evidence}</blockquote>
                  <p>{why.evidenceUrl}</p>
                </>
              )}
              {record.landmark.isLandmark && (
                <>
                  <h4>Landmark inclusion evidence</h4>
                  <p>
                    This is a project editorial selection, not a legal-effect,
                    rights, or Nation-relationship determination.
                  </p>
                  <ul>
                    {record.landmark.officialEvidence.map((evidence) => (
                      <li
                        key={`${evidence.sourceUrl}:${evidence.sourceDate ?? ""}`}
                      >
                        {evidence.text ?? evidence.sourceLabel} (evidence date:{" "}
                        {formatDate(evidence.sourceDate)}; official evidence:{" "}
                        {evidence.sourceUrl}). Reproduction boundary:{" "}
                        {evidence.reproductionBasis}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {(record.texts.officialSummary || record.texts.sourceExcerpt) && (
                <>
                  <h4>Official source language</h4>
                  <p>
                    {record.texts.officialSummary?.text ??
                      record.texts.sourceExcerpt?.text}
                  </p>
                </>
              )}
              {record.change.urgentAlert && (
                <p>
                  <strong>Source alert:</strong>{" "}
                  {record.change.urgentAlert.label},{" "}
                  {formatDate(record.change.urgentAlert.date)}
                </p>
              )}
            </article>
          );
        })}
      </section>

      <footer>
        <h2>Limitations and disclaimer</h2>
        <p>{DISCLAIMER}</p>
        <p>
          This dossier contains source metadata and permitted official source
          language only. It excludes AI summaries, private material, and land
          context.
        </p>
      </footer>
    </article>
  );
}
