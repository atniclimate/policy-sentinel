/** @jsxImportSource preact */
import { useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type {
  AnalyzedCorpusV2,
  PolicyDate,
  PolicyInstrumentClass,
} from "../pipeline/analyzed-corpus-v2.mjs";
import {
  createPolicySearchIndex,
  policySearchPassage,
  searchPolicyCorpus,
} from "../engine/policy-search.mjs";
import type {
  PolicySearchIndex,
  PolicySearchRequest,
} from "../engine/policy-search.mjs";
import {
  compareDocumentVersions,
  compareInstitutionalProcedures,
  compareRelatedProvisions,
  policyDateBounds,
  resolveCorpusRelationships,
} from "../engine/temporal-operations.mjs";
import type {
  InstitutionalComparison,
  RelatedProvisionComparison,
  TemporalBasis,
  VersionComparison,
} from "../engine/temporal-operations.mjs";
import "./policy-workbench.css";
import { StudyWorkspace } from "./StudyWorkspace";
import type {
  ConfiguredSourceCoverage,
  StudySearchProjection,
} from "./StudyWorkspace";

export interface PolicyWorkbenchProps {
  readonly corpus: AnalyzedCorpusV2;
  readonly dossierHref?: string;
  readonly jsonHref?: string;
  readonly sourceCoverage?: ConfiguredSourceCoverage;
  readonly projection?: StudySearchProjection;
}
const dateLabel = (date: PolicyDate) =>
  date.value === null
    ? "Unknown"
    : `${date.value} (${date.precision} precision)`;
const words = (value: string) => value.replaceAll("_", " ");
const sourceFieldLabel = (value: string) => {
  if (value === "version/sourceStatusLabel") return "source status label";
  if (value === "version/dates/publication/value") return "publication date";
  if (value === "version/dates/sourceVersion/value")
    return "source version date";
  const event = /^event:([^/]+)\/date\/value$/.exec(value);
  return event ? `source-stated ${words(event[1])} date` : value;
};
const basisLabels: Record<TemporalBasis, string> = {
  source_available: "Source-dated availability",
  corpus_observed: "Observed in this corpus",
  source_effective: "Source-stated effectiveness",
};
function fieldKnown(
  record: {
    readonly fieldProvenance: AnalyzedCorpusV2["works"][number]["fieldProvenance"];
  },
  field: string,
  knownSegments: ReadonlySet<string> | null,
) {
  if (knownSegments === null) return true;
  const proof = record.fieldProvenance.find((entry) => entry.field === field);
  return Boolean(
    proof?.segmentIds.length &&
    proof.segmentIds.every((id) => knownSegments.has(id)),
  );
}
function ownedLink(value: string | undefined) {
  return value &&
    /^(?:\.\/|\/)?[a-zA-Z0-9][a-zA-Z0-9_./-]*(?:#[a-zA-Z0-9_-]+)?$/.test(
      value,
    ) &&
    !value.split("/").includes("..")
    ? value
    : null;
}
function Snippet({
  index,
  segmentId,
}: {
  index: PolicySearchIndex;
  segmentId: string;
}) {
  const excerpt = useMemo(
    () => policySearchPassage(index, segmentId, { maxCharacters: 300 }),
    [index, segmentId],
  );
  return excerpt.text === null ? (
    <p>Source display is limited to metadata and links.</p>
  ) : (
    <p class="pw-snippet">
      {excerpt.text}
      {excerpt.truncated ? "…" : ""}
    </p>
  );
}
function EvidencePanel({
  corpus,
  index,
  segmentId,
  onClose,
  knownSegments,
  cutoff,
  outsideSnapshot,
}: {
  corpus: AnalyzedCorpusV2;
  index: PolicySearchIndex;
  segmentId: string;
  onClose: () => void;
  knownSegments: ReadonlySet<string> | null;
  cutoff: string | undefined;
  outsideSnapshot: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [expanded, setExpanded] = useState(false);
  useLayoutEffect(() => {
    setExpanded(false);
    heading.current?.focus();
  }, [segmentId]);
  const segment = corpus.segments.find((entry) => entry.id === segmentId)!;
  const rendition = corpus.renditions.find(
    (entry) => entry.id === segment.renditionId,
  )!;
  const capture = corpus.captures.find(
    (entry) => entry.id === rendition.captureId,
  )!;
  const version = corpus.versions.find(
    (entry) => entry.id === rendition.versionId,
  )!;
  const work = corpus.works.find((entry) => entry.id === version.workId)!;
  const profile = corpus.sourceProfiles.find(
    (entry) => entry.id === work.sourceProfileId,
  )!;
  const excerpt = policySearchPassage(index, segmentId, {
    maxCharacters:
      expanded && profile.uses.localDisplay === "full_text" ? 200000 : 1200,
  });
  return (
    <section class="pw-evidence" aria-labelledby="pw-evidence-heading">
      <div class="pw-section-heading">
        <h2 id="pw-evidence-heading" tabIndex={-1} ref={heading}>
          Source evidence
        </h2>
        <button type="button" onClick={onClose}>
          Close evidence
        </button>
      </div>
      {cutoff && (
        <p class="pw-notice">
          {outsideSnapshot
            ? "This evidence belongs to the full retained research population, outside the date-filtered search."
            : `Search evidence at cutoff ${cutoff}. Metadata without eligible supporting evidence is marked unknown.`}
        </p>
      )}
      <p>
        <strong>
          {fieldKnown(work, "/sourceIdentifier", knownSegments)
            ? work.sourceIdentifier
            : work.id}
        </strong>{" "}
        ·{" "}
        {fieldKnown(version, "/sourceVersionIdentifier", knownSegments)
          ? version.sourceVersionIdentifier
          : "Source version label unknown at cutoff"}
      </p>
      <p>{rendition.authorityLabel}</p>
      {excerpt.text === null ? (
        <p>
          Source terms permit metadata and links here. Text is not displayed.
        </p>
      ) : (
        <blockquote class="pw-quote">
          {excerpt.text}
          {excerpt.truncated ? "…" : ""}
        </blockquote>
      )}
      {excerpt.truncated &&
        !expanded &&
        profile.uses.localDisplay === "full_text" && (
          <button type="button" onClick={() => setExpanded(true)}>
            Read the complete source block
          </button>
        )}
      {excerpt.truncated && (
        <p>
          The displayed excerpt is truncated; the citation identifies the
          complete retained block.
        </p>
      )}
      <p>
        <a href={capture.finalUrl} target="_blank" rel="noreferrer">
          Open originating source (new tab)
        </a>
      </p>
      <dl class="pw-facts">
        <dt>Source status label</dt>
        <dd>
          {fieldKnown(version, "/sourceStatusLabel", knownSegments)
            ? version.sourceStatusLabel
            : "Unknown at cutoff"}
        </dd>
        <dt>Publication</dt>
        <dd>
          {fieldKnown(version, "/dates/publication/value", knownSegments)
            ? dateLabel(version.dates.publication)
            : "Unknown at cutoff"}
        </dd>
        <dt>Source version date</dt>
        <dd>
          {fieldKnown(version, "/dates/sourceVersion/value", knownSegments)
            ? dateLabel(version.dates.sourceVersion)
            : "Unknown at cutoff"}
        </dd>
        <dt>Capture observed</dt>
        <dd>{capture.retrievedAt}</dd>
        <dt>Source locator</dt>
        <dd>{segment.locator.value}</dd>
        <dt>Headings</dt>
        <dd>{segment.locator.headingPath.join(" › ") || "Not stated"}</dd>
        <dt>Printed page</dt>
        <dd>{segment.locator.printedPageLabel ?? "Not stated"}</dd>
        <dt>Segment ID</dt>
        <dd>
          <code>{segment.id}</code>
        </dd>
        <dt>Version ID</dt>
        <dd>
          <code>{version.id}</code>
        </dd>
      </dl>
      <details>
        <summary>Capture and replay evidence</summary>
        <dl class="pw-facts">
          <dt>Operation</dt>
          <dd>
            <code>{capture.operationId}</code>
          </dd>
          <dt>Capture ID</dt>
          <dd>
            <code>{capture.id}</code>
          </dd>
          <dt>Raw object SHA-256</dt>
          <dd>
            <code>{capture.objectDigest}</code>
          </dd>
          <dt>Rendition SHA-256</dt>
          <dd>
            <code>{rendition.outputDigest}</code>
          </dd>
          <dt>Segment SHA-256</dt>
          <dd>
            <code>{segment.textDigest}</code>
          </dd>
          <dt>UTF-8 byte range</dt>
          <dd>
            [{segment.startByte}, {segment.endByte}) in the canonical text
            rendition
          </dd>
          <dt>Parser</dt>
          <dd>
            {rendition.parser.id} {rendition.parser.version}
          </dd>
          <dt>Parser configuration SHA-256</dt>
          <dd>
            <code>{rendition.parser.configDigest}</code>
          </dd>
        </dl>
        <p>
          Source bytes and parser replay are verified by the local build. This
          browser shows the retained evidence chain and does not re-fetch the
          source.
        </p>
      </details>
      {rendition.warnings.length > 0 && (
        <details>
          <summary>Rendition limitations and omissions</summary>
          <ul>
            {rendition.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
      {rendition.omittedSourceLocators.length > 0 && (
        <div class="pw-notice">
          <p>
            <strong>
              Reviewed source blocks were omitted from this rendition.
            </strong>{" "}
            Text before and after these locations must not be read as one
            continuous quotation.
          </p>
          <ul>
            {rendition.omittedSourceLocators.map((locator) => (
              <li key={locator}>
                <code>{locator}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p class="pw-muted">
        Each quotation is one retained source block. Neighboring blocks and
        omitted material are not joined into a new passage.
      </p>
    </section>
  );
}

export function PolicyWorkbench({
  corpus,
  dossierHref,
  jsonHref,
  sourceCoverage,
  projection,
}: PolicyWorkbenchProps) {
  const index = useMemo(() => createPolicySearchIndex(corpus), [corpus]);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [context, setContext] = useState("");
  const [instrument, setInstrument] = useState("");
  const [asOf, setAsOf] = useState("");
  const [basis, setBasis] = useState<TemporalBasis>("source_available");
  const [request, setRequest] = useState<PolicySearchRequest>({ query: "" });
  const [windowSize, setWindowSize] = useState(20);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [evidenceScope, setEvidenceScope] = useState<"search" | "retained">(
    "retained",
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<
    VersionComparison | RelatedProvisionComparison | null
  >(null);
  const [procedures, setProcedures] = useState<InstitutionalComparison | null>(
    null,
  );
  const [operationError, setOperationError] = useState<string | null>(null);
  const lastEvidenceTrigger = useRef<HTMLElement | null>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const result = useMemo(() => {
    try {
      return {
        value: searchPolicyCorpus(index, {
          ...request,
          limit: windowSize,
          passageLimit: 3,
        }),
        error: null,
      };
    } catch {
      return {
        value: null,
        error:
          "The date or search options could not be used. Enter a valid date and choose its evidence basis.",
      };
    }
  }, [index, request, windowSize]);
  const workMap = useMemo(
    () => new Map(corpus.works.map((entry) => [entry.id, entry])),
    [corpus],
  );
  const versionMap = useMemo(
    () => new Map(corpus.versions.map((entry) => [entry.id, entry])),
    [corpus],
  );
  const profileMap = useMemo(
    () => new Map(corpus.sourceProfiles.map((entry) => [entry.id, entry])),
    [corpus],
  );
  const knownSegments = useMemo(() => {
    if (!request.asOf) return null;
    const cutoff = Date.parse(
      request.asOf.length === 10
        ? `${request.asOf}T23:59:59.999Z`
        : request.asOf,
    );
    const captures = new Map(corpus.captures.map((entry) => [entry.id, entry]));
    const knownRenditions = new Set(
      corpus.renditions
        .filter((entry) => {
          if (request.basis === "corpus_observed")
            return (
              Date.parse(captures.get(entry.captureId)!.retrievedAt) <= cutoff
            );
          const dates = Object.values(versionMap.get(entry.versionId)!.dates)
            .map(policyDateBounds)
            .filter((value) => value !== null);
          return (
            dates.length > 0 &&
            dates.every((value) => Date.parse(value.latest) <= cutoff)
          );
        })
        .map((entry) => entry.id),
    );
    return new Set(
      corpus.segments
        .filter((entry) => knownRenditions.has(entry.renditionId))
        .map((entry) => entry.id),
    );
  }, [corpus, request.asOf, request.basis, versionMap]);
  const visibleVersionLabel = (id: string) => {
    const version = versionMap.get(id)!;
    return fieldKnown(version, "/sourceVersionIdentifier", knownSegments)
      ? version.sourceVersionIdentifier
      : `Source version label unknown at cutoff (${id})`;
  };
  const references = useMemo(
    () =>
      new Map(
        result.value?.hits.map((hit) => [
          hit.versionId,
          request.asOf
            ? resolveCorpusRelationships(corpus, {
                versionId: hit.versionId,
                asOf: request.asOf,
                basis: request.basis,
              }).relationships
            : corpus.relationships
                .filter((entry) => entry.fromVersionId === hit.versionId)
                .map((entry) => ({
                  ...entry,
                  relationshipId: entry.id,
                  state: entry.target.state,
                })),
        ]) ?? [],
      ),
    [corpus, request.asOf, request.basis, result.value],
  );
  const contexts = useMemo(
    () =>
      [...new Set(corpus.works.map((entry) => entry.governmentContext))].sort(),
    [corpus],
  );
  const instruments = useMemo(
    () =>
      [...new Set(corpus.works.map((entry) => entry.instrumentClass))].sort(),
    [corpus],
  );
  const selectedVersions = selected.map((id) => versionMap.get(id)!);
  const sameWork =
    selectedVersions.length === 2 &&
    selectedVersions[0].workId === selectedVersions[1].workId;
  const selectedAnalyses = corpus.analyses.filter((entry) =>
    selected.includes(entry.versionId),
  );
  const changeEdge =
    selected.length === 2
      ? corpus.relationships.find(
          (entry) =>
            ["amends", "supersedes", "corrects"].includes(entry.type) &&
            entry.target.state === "resolved" &&
            entry.target.versionId &&
            selected.includes(entry.fromVersionId) &&
            selected.includes(entry.target.versionId),
        )
      : undefined;
  function openEvidence(id: string, scope: "search" | "retained" = "retained") {
    lastEvidenceTrigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setEvidenceId(id);
    setEvidenceScope(scope);
  }
  function closeEvidence() {
    setEvidenceId(null);
    lastEvidenceTrigger.current?.focus();
  }
  function evidenceButtons(
    ids: readonly string[],
    prefix = "Read evidence",
    scope: "search" | "retained" = "retained",
  ) {
    return ids.length ? (
      <span class="pw-evidence-links">
        {ids.map((id, number) => (
          <button
            type="button"
            class="pw-text-button"
            key={id}
            onClick={() => openEvidence(id, scope)}
          >
            {prefix} {number + 1}
          </button>
        ))}
      </span>
    ) : (
      <span> No retained evidence.</span>
    );
  }
  function toggleVersion(id: string, checked: boolean) {
    setSelected((previous) =>
      checked
        ? [...previous, id].slice(0, 2)
        : previous.filter((entry) => entry !== id),
    );
    setComparison(null);
    setProcedures(null);
    setOperationError(null);
  }
  function compare(kind: "versions" | "procedures" | "related") {
    setOperationError(null);
    try {
      if (kind === "procedures") {
        setProcedures(
          compareInstitutionalProcedures(corpus, {
            analysisIds: selectedAnalyses.map((entry) => entry.id),
          }),
        );
        setComparison(null);
      } else if (kind === "related" && changeEdge?.target.versionId) {
        setComparison(
          compareRelatedProvisions(corpus, {
            beforeVersionId: changeEdge.target.versionId,
            afterVersionId: changeEdge.fromVersionId,
            relationshipId: changeEdge.id,
          }),
        );
        setProcedures(null);
      } else {
        setComparison(
          compareDocumentVersions(corpus, {
            beforeVersionId: selected[0],
            afterVersionId: selected[1],
          }),
        );
        setProcedures(null);
      }
    } catch {
      setOperationError(
        "The retained evidence does not support this comparison. Review version identities and available coding.",
      );
    }
  }
  const dossier = ownedLink(dossierHref);
  const json = ownedLink(jsonHref);
  return (
    <div class="policy-workbench">
      <a class="pw-skip" href="#main-content">
        Skip to policy search
      </a>
      <header class="pw-masthead">
        <div>
          <p class="pw-eyebrow">Policy Sentinel / Local research</p>
          <h1>Policy evidence workbench</h1>
          <p>
            Search official source language, compare retained versions, and
            inspect the evidence behind provisional findings.
          </p>
        </div>
        <div class="pw-build">
          <span class="pw-badge">Local corpus</span>
          <p>
            {corpus.works.length} works · {corpus.versions.length} versions
          </p>
          <p>Built {corpus.generatedAt.slice(0, 10)}</p>
        </div>
      </header>
      <nav class="pw-navigation" aria-label="Workbench sections">
        <a href="#main-content">Search</a>
        <a href="#pw-comparison">Compare</a>
        <a href="#pw-findings">Findings</a>
        <a href="#pw-coverage">Coverage</a>
        <a href="#pw-study">Research study</a>
        {dossier && <a href={dossier}>Open local dossier</a>}
        {json && <a href={json}>Open corpus JSON</a>}
      </nav>
      <main id="main-content" tabIndex={-1}>
        <section class="pw-search" aria-labelledby="pw-search-heading">
          <h2 id="pw-search-heading">Find source passages</h2>
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setRequest({
                query,
                ...(source ? { sourceProfileId: source } : {}),
                ...(context ? { governmentContext: context } : {}),
                ...(instrument
                  ? { instrumentClass: instrument as PolicyInstrumentClass }
                  : {}),
                ...(asOf ? { asOf, basis } : {}),
              });
              setWindowSize(20);
              setEvidenceId(null);
              setSelected([]);
              setComparison(null);
              setProcedures(null);
              queueMicrotask(() => resultsHeading.current?.focus());
            }}
          >
            <label for="pw-query">Identifier, title, or question</label>
            <div class="pw-query-row">
              <input
                id="pw-query"
                type="search"
                value={query}
                maxLength={2000}
                onInput={(event) => setQuery(event.currentTarget.value)}
                placeholder='Try an identifier or "consultation procedures"'
                aria-describedby="pw-search-help"
              />
              <button type="submit" class="pw-primary">
                Search corpus
              </button>
            </div>
            <p id="pw-search-help" class="pw-muted">
              Quoted phrases match source wording. A question may require
              passages from several documents. Queries stay in this page.
            </p>
            <div class="pw-filter-grid">
              <label>
                Source
                <select
                  value={source}
                  onChange={(event) => setSource(event.currentTarget.value)}
                >
                  <option value="">All retained sources</option>
                  {corpus.sourceProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.publisher} · {profile.interfaceId}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Government context
                <select
                  value={context}
                  onChange={(event) => setContext(event.currentTarget.value)}
                >
                  <option value="">All contexts</option>
                  {contexts.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Instrument class
                <select
                  value={instrument}
                  onChange={(event) => setInstrument(event.currentTarget.value)}
                >
                  <option value="">All instrument classes</option>
                  {instruments.map((entry) => (
                    <option key={entry} value={entry}>
                      {words(entry)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                As of date
                <input
                  type="date"
                  value={asOf}
                  onInput={(event) => setAsOf(event.currentTarget.value)}
                />
              </label>
              <label>
                Date evidence basis
                <select
                  value={basis}
                  onChange={(event) =>
                    setBasis(event.currentTarget.value as TemporalBasis)
                  }
                >
                  {Object.entries(basisLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </form>
        </section>
        <section class="pw-results" aria-labelledby="pw-results-heading">
          <div class="pw-section-heading">
            <h2 id="pw-results-heading" tabIndex={-1} ref={resultsHeading}>
              Matching source versions
            </h2>
            <p role="status">
              {result.value
                ? `${result.value.total} matching versions`
                : "Search needs attention"}
            </p>
          </div>
          {result.error && <p role="alert">{result.error}</p>}
          {result.value?.temporal ? (
            <div class="pw-notice">
              <p>
                <strong>
                  {basisLabels[result.value.temporal.basis]} as of{" "}
                  {result.value.temporal.asOf}.
                </strong>{" "}
                Unknown dates and evidence after the cutoff do not establish a
                historical state.
              </p>
              {result.value.temporal.basis === "source_effective" && (
                <p>
                  This filter uses retained source-stated effective, repeal, and
                  withdrawal events. It does not apply cross-document repeal
                  relationships or determine what law is in force.
                </p>
              )}
              <details>
                <summary>
                  {result.value.temporal.unknownWorkIds.length} works have no
                  supported version; {result.value.temporal.excluded.length}{" "}
                  versions excluded by date evidence
                </summary>
                <ul>
                  {result.value.temporal.excluded.map((entry) => (
                    <li key={entry.versionId}>
                      {entry.versionId}: {words(entry.reason)}
                    </li>
                  ))}
                </ul>
                {result.value.temporal.limitations.map((entry) => (
                  <p key={entry}>{entry}</p>
                ))}
              </details>
            </div>
          ) : (
            <p class="pw-muted">
              All retained versions, including versions with unknown dates.
              Source labels do not establish current law or applicability.
            </p>
          )}
          {result.value?.total === 0 && (
            <p class="pw-empty">
              No source passage matches these criteria. Try fewer words, an
              exact identifier, or review the source coverage.
            </p>
          )}
          <ol class="pw-result-list">
            {result.value?.hits.map((hit) => {
              const work = workMap.get(hit.workId)!;
              const version = versionMap.get(hit.versionId)!;
              const profile = profileMap.get(hit.sourceProfileId)!;
              return (
                <li key={hit.versionId}>
                  <article class="pw-result-card">
                    <div class="pw-result-meta">
                      <span>{work.governmentContext}</span>
                      <span>{words(work.instrumentClass)}</span>
                      <span>General jurisdiction</span>
                    </div>
                    <h3>
                      {hit.metadataKnown.title
                        ? work.title
                        : "Work title not established at this cutoff"}
                    </h3>
                    <p class="pw-version">
                      <strong>
                        {hit.metadataKnown.identifier
                          ? work.sourceIdentifier
                          : work.id}
                      </strong>{" "}
                      ·{" "}
                      {hit.metadataKnown.versionIdentifier
                        ? version.sourceVersionIdentifier
                        : "Source version label unknown at cutoff"}
                    </p>
                    <p>{profile.authorityLabel}</p>
                    <dl class="pw-result-dates">
                      <dt>Source status</dt>
                      <dd>
                        {hit.metadataKnown.status
                          ? version.sourceStatusLabel
                          : "Unknown at cutoff"}
                      </dd>
                      <dt>Publication</dt>
                      <dd>
                        {fieldKnown(
                          version,
                          "/dates/publication/value",
                          knownSegments,
                        )
                          ? dateLabel(version.dates.publication)
                          : "Unknown at cutoff"}
                      </dd>
                      <dt>Source version date</dt>
                      <dd>
                        {fieldKnown(
                          version,
                          "/dates/sourceVersion/value",
                          knownSegments,
                        )
                          ? dateLabel(version.dates.sourceVersion)
                          : "Unknown at cutoff"}
                      </dd>
                      <dt>First retained capture</dt>
                      <dd>{version.observedAt}</dd>
                    </dl>
                    <p class="pw-muted">
                      Why shown: {hit.whyShown.map(words).join("; ")}.{" "}
                      {hit.temporalState === "ambiguous"
                        ? "More than one version has overlapping date evidence."
                        : ""}
                    </p>
                    <label class="pw-select-version">
                      <input
                        type="checkbox"
                        checked={selected.includes(hit.versionId)}
                        disabled={
                          selected.length >= 2 &&
                          !selected.includes(hit.versionId)
                        }
                        onChange={(event) =>
                          toggleVersion(
                            hit.versionId,
                            event.currentTarget.checked,
                          )
                        }
                      />{" "}
                      Select {visibleVersionLabel(version.id)} for comparison
                    </label>
                    {hit.passages.length ? (
                      <ul class="pw-passages">
                        {hit.passages.map((passage, number) => (
                          <li key={passage.segmentId}>
                            <Snippet
                              index={index}
                              segmentId={passage.segmentId}
                            />
                            <p class="pw-muted">
                              Passage basis: {words(passage.whyShown)}.
                              {passage.matchedTerms.length > 0 &&
                                ` Matching query terms: ${passage.matchedTerms.join(", ")}.`}
                              {passage.evidenceFields.length > 0 &&
                                ` Source field evidence: ${passage.evidenceFields.map(sourceFieldLabel).join(", ")}.`}
                              {passage.contextSegmentIds.length > 0 &&
                                " Neighboring or section evidence contributes to ranking; each quotation remains separate."}
                            </p>
                            {passage.contextSegmentIds.length > 0 &&
                              evidenceButtons(
                                passage.contextSegmentIds,
                                "Inspect ranking context",
                                "search",
                              )}
                            <button
                              type="button"
                              class="pw-text-button"
                              onClick={() =>
                                openEvidence(passage.segmentId, "search")
                              }
                            >
                              Inspect passage {number + 1} ·{" "}
                              {visibleVersionLabel(version.id)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        Matching metadata has no eligible text passage. Inspect
                        the originating source and its display terms.
                      </p>
                    )}
                    <details>
                      <summary>Work provenance, events, and references</summary>
                      <p>
                        Work title is a shared identity label. Each version’s
                        actual title remains in its own source text.
                        Classification is a reviewed mapping; this record
                        remains Unclassified in the policy taxonomy.
                      </p>
                      {evidenceButtons(
                        (hit.metadataKnown.title
                          ? work.fieldProvenance.find(
                              (entry) => entry.field === "/title",
                            )?.segmentIds
                          : []) ?? [],
                        "Inspect work-title evidence",
                        "search",
                      )}
                      <h4>Source-stated events</h4>
                      {corpus.events
                        .filter((entry) => hit.eventIds.includes(entry.id))
                        .map((entry) => (
                          <p key={entry.id}>
                            {entry.sourceLabel} · {dateLabel(entry.date)} ·
                            source statement dated{" "}
                            {dateLabel(entry.sourceStatedAt)}
                            {evidenceButtons(
                              entry.segmentIds,
                              "Read evidence",
                              "search",
                            )}
                          </p>
                        ))}
                      {!corpus.events.some((entry) =>
                        hit.eventIds.includes(entry.id),
                      ) && (
                        <p>
                          {request.asOf
                            ? "No reviewed event evidence is eligible at this cutoff."
                            : "No reviewed event evidence retained."}
                        </p>
                      )}
                      <h4>Explicit source references</h4>
                      {references.get(version.id)!.map((entry) => (
                        <p key={entry.relationshipId}>
                          {entry.sourceLabel} · {entry.type} · target{" "}
                          {words(entry.state)}: {entry.target.sourceIdentifier}
                          {evidenceButtons(
                            entry.segmentIds,
                            "Read evidence",
                            "search",
                          )}
                        </p>
                      ))}
                      {references.get(version.id)!.length === 0 && (
                        <p>
                          {request.asOf
                            ? "No reviewed reference evidence is eligible at this cutoff."
                            : "No reviewed reference relationships retained."}{" "}
                          This does not establish that none exist.
                        </p>
                      )}
                    </details>
                  </article>
                </li>
              );
            })}
          </ol>
          {result.value &&
            result.value.total > windowSize &&
            windowSize < 1000 && (
              <button
                type="button"
                onClick={() => setWindowSize(Math.min(1000, windowSize + 20))}
              >
                Show 20 more versions
              </button>
            )}
        </section>
        {evidenceId && (
          <EvidencePanel
            corpus={corpus}
            index={index}
            segmentId={evidenceId}
            onClose={closeEvidence}
            knownSegments={evidenceScope === "search" ? knownSegments : null}
            cutoff={request.asOf}
            outsideSnapshot={evidenceScope === "retained"}
          />
        )}
        <StudyWorkspace
          corpus={corpus}
          sourceCoverage={sourceCoverage}
          projection={projection}
          searchResults={result.value}
          searchRequest={request}
          selectedSegmentId={evidenceId}
          onOpenPassage={(segmentId) => openEvidence(segmentId, "retained")}
          onSearch={(next) => {
            setQuery(next.query);
            setSource(next.sourceProfileId ?? "");
            setContext(next.governmentContext ?? "");
            setInstrument(next.instrumentClass ?? "");
            setAsOf(next.asOf ?? "");
            setBasis(next.basis ?? "source_available");
            setRequest(next);
            setWindowSize(20);
            setEvidenceId(null);
            setSelected([]);
            setComparison(null);
            setProcedures(null);
            queueMicrotask(() => resultsHeading.current?.focus());
          }}
        />
        <section
          id="pw-comparison"
          class="pw-section"
          aria-labelledby="pw-comparison-heading"
        >
          <h2 id="pw-comparison-heading">Compare retained evidence</h2>
          <p>
            Select two source versions above, in the order to compare them.
            Version comparison requires one shared work; procedure comparison
            uses explicit analyst coding.
          </p>
          <ul>
            {selected.map((id) => (
              <li key={id}>
                {fieldKnown(
                  workMap.get(versionMap.get(id)!.workId)!,
                  "/sourceIdentifier",
                  knownSegments,
                )
                  ? workMap.get(versionMap.get(id)!.workId)!.sourceIdentifier
                  : versionMap.get(id)!.workId}{" "}
                · {visibleVersionLabel(id)}{" "}
                <button
                  type="button"
                  class="pw-text-button"
                  onClick={() => toggleVersion(id, false)}
                >
                  Remove {visibleVersionLabel(id)}
                </button>
              </li>
            ))}
          </ul>
          <div class="pw-actions">
            <button
              type="button"
              onClick={() => compare("versions")}
              disabled={!sameWork || Boolean(request.asOf)}
            >
              Compare text versions
            </button>
            <button
              type="button"
              onClick={() => compare("procedures")}
              disabled={
                selected.length !== 2 ||
                Boolean(request.asOf) ||
                selectedAnalyses.length < 2 ||
                selected.some(
                  (id) =>
                    !selectedAnalyses.some((entry) => entry.versionId === id),
                )
              }
            >
              Compare institutional procedures
            </button>
            {changeEdge && !request.asOf && (
              <button type="button" onClick={() => compare("related")}>
                Compare explicitly related instruments
              </button>
            )}
          </div>
          {request.asOf && (
            <p>
              Comparisons use complete retained versions and coding. Clear the
              date cutoff and search again to compare that evidence.
            </p>
          )}
          {operationError && <p role="alert">{operationError}</p>}
          {comparison && (
            <div
              class="pw-comparison-result"
              role="region"
              aria-label="Text comparison result"
            >
              <h3>{words(comparison.changeType)}</h3>
              <p>
                {comparison.beforeVersionId} → {comparison.afterVersionId}
              </p>
              <p>
                Method: {comparison.method.id} {comparison.method.version}.
                Order: {words(comparison.temporalOrder)}.
              </p>
              {comparison.kind === "related_provision_comparison" && (
                <p>
                  Distinct instruments connected by{" "}
                  {comparison.relationshipSourceLabel}. Comparison scope:{" "}
                  {words(comparison.comparisonScope)}.
                  {evidenceButtons(comparison.relationshipSegmentIds)}
                </p>
              )}
              <p>
                Source locations identify evidence within each rendition. Exact
                or whitespace-normalized text can establish a unique match
                across moved locations. Unaligned blocks do not establish
                corresponding provisions or additions and deletions.
              </p>
              <ul aria-label="Unaligned and formatting evidence">
                {comparison.changes
                  .filter((change) => change.kind !== "unchanged")
                  .map((change, number) => (
                    <li key={`${change.locator}-${number}`}>
                      <strong>{words(change.kind)}</strong> · {change.locator}
                      <p>Alignment: {words(change.alignment)}.</p>
                      {evidenceButtons(
                        change.beforeSegmentIds,
                        "Before evidence",
                      )}
                      {evidenceButtons(
                        change.afterSegmentIds,
                        "After evidence",
                      )}
                    </li>
                  ))}
              </ul>
              <details>
                <summary>
                  Unchanged exact text matches (
                  {
                    comparison.changes.filter(
                      (change) => change.kind === "unchanged",
                    ).length
                  }
                  )
                </summary>
                <ul>
                  {comparison.changes
                    .filter((change) => change.kind === "unchanged")
                    .map((change, number) => (
                      <li key={`${change.locator}-${number}`}>
                        <strong>{words(change.kind)}</strong> · {change.locator}
                        <p>Alignment: {words(change.alignment)}.</p>
                        {evidenceButtons(
                          change.beforeSegmentIds,
                          "Before evidence",
                        )}
                        {evidenceButtons(
                          change.afterSegmentIds,
                          "After evidence",
                        )}
                      </li>
                    ))}
                </ul>
              </details>
              {comparison.limitations.map((entry) => (
                <p key={entry}>{entry}</p>
              ))}
            </div>
          )}
          {procedures && (
            <div
              class="pw-comparison-result"
              role="region"
              aria-label="Institutional procedure comparison"
            >
              <h3>Declared institutional procedures</h3>
              <p>
                {words(procedures.uncertainty)} · {procedures.method.id}{" "}
                {procedures.method.version}
              </p>
              <div class="pw-table-scroll">
                <table>
                  <caption>
                    Source-linked coding by institutional dimension
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Dimension</th>
                      <th scope="col">Version and observation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {procedures.rows.map((row) => (
                      <tr key={row.dimension}>
                        <th scope="row">{words(row.dimension)}</th>
                        <td>
                          {row.observations.map((observation) => (
                            <div key={observation.analysisId}>
                              <strong>{observation.versionId}</strong>:{" "}
                              {words(observation.state)}
                              {observation.values.map((value, number) => (
                                <p key={number}>
                                  {value.value}
                                  {evidenceButtons(value.segmentIds)}
                                </p>
                              ))}
                              <p class="pw-muted">
                                {observation.method.id}{" "}
                                {observation.method.version} ·{" "}
                                {observation.reviewer.name} (
                                {observation.reviewer.kind}) ·{" "}
                                {observation.reviewer.reviewedAt} ·{" "}
                                {observation.uncertainty}
                              </p>
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h4>Reference structures</h4>
              {procedures.references.map((reference) => (
                <div key={reference.analysisId}>
                  <p>
                    {reference.governmentContext} · {reference.versionId}:{" "}
                    {reference.links.length === 0 &&
                      "No retained references; structure unknown."}
                  </p>
                  {reference.links.map((link) => (
                    <p key={link.relationshipId}>
                      {link.type}: {link.targetIdentifier} ({link.state})
                      {evidenceButtons(
                        link.segmentIds,
                        "Inspect reference evidence",
                      )}
                    </p>
                  ))}
                </div>
              ))}
              {procedures.limitations.map((entry) => (
                <p key={entry}>{entry}</p>
              ))}
            </div>
          )}
        </section>
        <section
          id="pw-findings"
          class="pw-section"
          aria-labelledby="pw-findings-heading"
        >
          <h2 id="pw-findings-heading">
            Provisional findings and counterevidence
          </h2>
          {request.asOf && (
            <p class="pw-notice">
              These findings describe the retained research population. They are
              outside the date-filtered search and are not historical snapshot
              findings.
            </p>
          )}
          <p>
            These are retained analyst claims, separate from source text. Search
            does not generate findings.
          </p>
          {corpus.findings.length === 0 && (
            <p>No reviewed findings are retained for this corpus.</p>
          )}
          {corpus.findings.map((finding) => (
            <article class="pw-finding" key={finding.id}>
              <h3>{finding.question}</h3>
              <p>
                <span class="pw-badge">{finding.disposition}</span>{" "}
                {finding.claim}
              </p>
              <p>
                Method {finding.method.id} {finding.method.version} ·{" "}
                {finding.reviewer.name} ({finding.reviewer.kind}) ·{" "}
                {finding.reviewer.reviewedAt}
              </p>
              <p>Population: {finding.populationVersionIds.join(", ")}</p>
              <h4>Supporting evidence</h4>
              {evidenceButtons(finding.supportingSegmentIds)}
              <h4>Contrary evidence</h4>
              {evidenceButtons(finding.contrarySegmentIds)}
              <h4>Missing evidence</h4>
              <ul>
                {finding.missingEvidence.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
              <h4>Rival explanations</h4>
              <ul>
                {finding.rivalExplanations.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
              <p>
                <strong>Next disconfirming test:</strong>{" "}
                {finding.nextDisconfirmingTest}
              </p>
            </article>
          ))}
        </section>
        <section
          id="pw-coverage"
          class="pw-section"
          aria-labelledby="pw-coverage-heading"
        >
          <h2 id="pw-coverage-heading">Coverage and source health</h2>
          <p>
            Counts describe this bounded local selection. They do not establish
            comprehensive coverage or jurisdiction.
          </p>
          <div class="pw-coverage-grid">
            {corpus.coverage.map((entry) => (
              <article class="pw-coverage-card" key={entry.id}>
                <h3>{profileMap.get(entry.sourceProfileId)!.publisher}</h3>
                <p>
                  <span class="pw-badge">{entry.status}</span>{" "}
                  {entry.documentCount} works · {entry.versionCount} versions
                </p>
                <p>
                  {dateLabel(entry.from)} through {dateLabel(entry.through)}
                </p>
                <p>
                  Data as of: {entry.dataAsOf ?? "Unknown"}
                  <br />
                  Last successful capture: {entry.lastSuccessfulAt ?? "None"}
                </p>
                {entry.failureStage && (
                  <p>Failure stage: {entry.failureStage}</p>
                )}
                <ul>
                  {[...entry.limitations, ...entry.exclusions].map(
                    (item, number) => (
                      <li key={number}>{item}</li>
                    ),
                  )}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer class="pw-footer">
        <p>
          Local source-reference research. Source language, observation time,
          source-stated effectiveness, and analyst coding remain separate
          evidence. No rights, jurisdiction, or legal-effect determination is
          made.
        </p>
        <p>
          Corpus <code>{corpus.id}</code> · <code>{corpus.contentDigest}</code>
        </p>
      </footer>
    </div>
  );
}
