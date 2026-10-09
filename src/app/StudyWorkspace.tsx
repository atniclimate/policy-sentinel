/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import {
  MAX_RESEARCH_STUDY_BYTES,
  captureStudyPassage,
  createResearchStudy,
  parseResearchStudy,
  readResearchStudyRevision,
  rebindResearchStudy,
  reviseResearchStudy,
  serializeResearchStudy,
  studyActiveDeadlines,
  studyReadPassage,
} from "../core/research-study.mjs";
import type {
  ResearchStudy,
  StudyActor,
  StudyActionType,
  StudyAuthorityRelationship,
  StudyCatalogs,
  StudyChange,
  StudyConsultationParticipant,
  StudyConsultationType,
  StudyPassage,
  StudyRecord,
  StudyReviewState,
  StudySearchScope,
  StudySensitivity,
} from "../core/research-study.mjs";
import type {
  AnalyzedCorpus,
  PolicyDate,
} from "../pipeline/analyzed-corpus-v2.mjs";
import type {
  PolicySearchRequest,
  PolicySearchResults,
} from "../engine/policy-search.mjs";
import {
  buildStudyProducts,
  studySearchContext,
} from "../modules/output/study-products.mjs";
import type { StudyProducts } from "../modules/output/study-products.mjs";
import "./study-workspace.css";

export interface StudyWorkspaceProps {
  readonly corpus: AnalyzedCorpus;
  readonly searchResults: PolicySearchResults | null;
  readonly searchRequest: PolicySearchRequest;
  readonly selectedSegmentId: string | null;
  readonly onOpenPassage: (segmentId: string) => void;
  readonly onSearch: (request: PolicySearchRequest) => void;
  readonly sourceCoverage?: ConfiguredSourceCoverage;
  readonly projection?: StudySearchProjection;
}

export interface StudySearchProjection {
  readonly parentCorpusDigest: string;
  readonly corpusDigest: string;
  readonly selection: {
    readonly sourceProfileIds: readonly string[];
    readonly from: string | null;
    readonly through: string | null;
  };
  readonly directlySelectedVersionIds: readonly string[];
  readonly retainedVersionIds: readonly string[];
  readonly excludedVersionIds: readonly string[];
  readonly coverage: readonly {
    readonly sourceProfileId: string;
    readonly selected: boolean;
    readonly searched: boolean;
    readonly retained: boolean;
    readonly status: string;
    readonly dataAsOf: string | null;
  }[];
  readonly limitations: readonly string[];
}

/** Browser-facing source qualification projection, independent of intake modules. */
export interface ConfiguredSourceCoverage {
  readonly catalogId: string;
  readonly asOf: string;
  readonly managedStorageCeilingBytes: number;
  readonly sources: readonly {
    readonly id: string;
    readonly label: string;
    readonly publisher: string;
    readonly lifecycle: string;
    readonly reviewStatus: string;
    readonly discoveryRegions: readonly string[];
    readonly declaredCapabilities: readonly {
      readonly mode: string;
      readonly state: string;
    }[];
    readonly availableCapabilities: readonly string[];
    readonly regionalInterface?: {
      readonly state: string;
      readonly assessedOn: string;
      readonly requirement: string;
      readonly disposition: string;
      readonly note: string;
      readonly evidence: readonly {
        readonly observedOn: string;
        readonly url: string;
      }[];
    };
    readonly coverage: {
      readonly documented: {
        readonly from: string | null;
        readonly through: string | null;
        readonly completeness: string;
        readonly note: string;
      };
    };
    readonly blockers: readonly {
      readonly code: string;
      readonly detail: string;
    }[];
  }[];
  readonly limitations: readonly string[];
}

const words = (value: string) => value.replaceAll("_", " ");
const value = (data: FormData, name: string) =>
  String(data.get(name) ?? "").trim();
const optional = (data: FormData, name: string) => value(data, name) || null;
const values = (data: FormData, name: string) =>
  data.getAll(name).map(String).filter(Boolean);
const lines = (data: FormData, name: string) =>
  value(data, name)
    .split(/[\n,]/u)
    .map((item) => item.trim())
    .filter(Boolean);
const identifier = (kind: string) => `${kind}-${crypto.randomUUID()}`;
function captureSearchScope(request: PolicySearchRequest): StudySearchScope {
  if (request.asOf && !request.basis)
    throw new Error("A dated discovery needs its explicit date basis.");
  return {
    temporal:
      request.asOf && request.basis
        ? { asOf: request.asOf, basis: request.basis }
        : null,
    governmentContext: request.governmentContext || null,
    jurisdictionRef: request.jurisdictionRef || null,
    instrumentClass: (request.instrumentClass ||
      null) as StudySearchScope["instrumentClass"],
  };
}
function searchScopeLabel(scope: StudySearchScope | undefined): string {
  if (scope === undefined)
    return "Search scope was not recorded. Running uses only the saved query and collections.";
  return [
    scope.temporal
      ? `As of ${scope.temporal.asOf} · ${words(scope.temporal.basis)}`
      : "All retained dates",
    scope.governmentContext ?? "All government contexts",
    scope.jurisdictionRef === undefined
      ? "Jurisdiction filter not recorded"
      : (scope.jurisdictionRef ?? "No jurisdiction identifier filter"),
    scope.instrumentClass
      ? words(scope.instrumentClass)
      : "All instrument classes",
  ].join(" · ");
}
function failureMessage(failure: unknown) {
  if (!(failure instanceof Error))
    return "The study operation could not be completed. Your previous study is unchanged.";
  if (!("code" in failure)) return failure.message;
  const code = String(failure.code);
  if (code.startsWith("SHAPE:")) {
    const field = code.split("/").at(-1);
    if (field === "sensitivity")
      return "Choose a visibility classification before saving.";
    if (field === "title" || field === "text" || field === "label")
      return "Enter the required title, text, or local analyst label before saving.";
    return "Complete the required fields and choose the referenced study items before saving. Your previous study is unchanged.";
  }
  const explanations: Record<string, string> = {
    SOURCE_STATEMENT_REPLAY:
      "The supporting statement must occur exactly in a saved passage whose source permits display.",
    ENVIRONMENTAL_VALUE_REPLAY:
      "Every alternative, value, unit, baseline, spatial scale, and qualification must occur in the supporting source statement.",
    SOURCE_DATE_NORMALIZATION:
      "The date must match the original date wording in the supporting source statement.",
    SOURCE_DATE_REPLAY:
      "The original date wording must occur exactly in the supporting source statement.",
    PROCEEDING_IDENTIFIER_REPLAY:
      "Each docket identifier and RIN must occur in the supporting source statement.",
    PARTICIPANT_NAME:
      "Use the exact participant name from the supporting source statement.",
    PARTICIPATION_EVENT:
      "The participant role must match the recorded event type, such as invited for an invitation or attended for a meeting.",
    ASSERTION_SUPPORT:
      "An accepted assertion needs at least one supporting passage.",
    CONTRADICTORY_EVIDENCE_ROLE:
      "The same passage cannot both support and challenge one assertion.",
    AUTHORITY_LABEL_REPLAY:
      "Both connection labels must occur in the supporting source statement.",
    AUTHORITY_SUBJECT:
      "Connection labels must match the selected actor, proceeding, or document identifiers.",
    AUTHORITY_EVIDENCE_REVIEW:
      "Review and accept the supporting passages before accepting an authority connection.",
    NATION_EVIDENCE_REVIEW:
      "Review and accept the specific participation evidence before accepting an individual Nation attribution.",
    STALE_EVIDENCE_REVIEW:
      "Renew the source binding before accepting evidence-dependent material.",
  };
  return (
    explanations[code] ??
    "The study could not be validated. Check its source references and required fields. Your previous study is unchanged."
  );
}
const formatDate = (date: PolicyDate) => date.value ?? "Date not stated";
function sourceDate(data: FormData): PolicyDate {
  const date = value(data, "eventDate");
  return {
    value: date || null,
    precision:
      date.length === 4
        ? "year"
        : date.length === 7
          ? "month"
          : date
            ? "day"
            : "unknown",
  };
}
function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function Field({
  label,
  name,
  required = false,
  area = false,
  ...rest
}: {
  label: string;
  name: string;
  required?: boolean;
  area?: boolean;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  maxLength?: number;
}) {
  return (
    <label>
      {label}
      {area ? (
        <textarea
          name={name}
          required={required}
          rows={3}
          maxLength={rest.maxLength ?? 16000}
          defaultValue={rest.defaultValue}
          placeholder={rest.placeholder}
        />
      ) : (
        <input
          name={name}
          required={required}
          maxLength={rest.maxLength ?? 1000}
          {...rest}
        />
      )}
    </label>
  );
}
function Choice({
  label,
  name,
  options,
  optional: allowEmpty = false,
  multiple = false,
  defaultValue,
}: {
  label: string;
  name: string;
  options: readonly { id: string; label: string }[];
  optional?: boolean;
  multiple?: boolean;
  defaultValue?: string;
}) {
  const selectRef = useRef<HTMLSelectElement>(null);
  useLayoutEffect(() => {
    const element = selectRef.current;
    if (!element) return;
    // Native select has no defaultValue property. Preserve defaults for form.reset().
    for (const option of element.options)
      option.defaultSelected = option.value === (defaultValue ?? "");
    if (defaultValue !== undefined) element.value = defaultValue;
  }, [defaultValue]);
  return (
    <label>
      {label}
      <select
        ref={selectRef}
        name={name}
        required={!allowEmpty}
        multiple={multiple}
        size={multiple ? 3 : undefined}
      >
        {!multiple && (
          <option value="">{allowEmpty ? "None" : "Choose…"}</option>
        )}
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
const choices = (items: readonly string[]) =>
  items.map((id) => ({ id, label: words(id) }));
function Editor({
  title,
  submit,
  disabled,
  children,
  onSubmit,
}: {
  title: string;
  submit: string;
  disabled: boolean;
  children: ComponentChildren;
  onSubmit: (data: FormData, form: HTMLFormElement) => void;
}) {
  return (
    <details class="sw-editor">
      <summary>{title}</summary>
      <form
        aria-label={title}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget), event.currentTarget);
        }}
      >
        <fieldset disabled={disabled}>
          <legend>{title}</legend>
          {children}
          <button type="submit">{submit}</button>
        </fieldset>
      </form>
    </details>
  );
}
function DateFields() {
  return (
    <>
      <Field
        label="Source date (YYYY, YYYY-MM, or YYYY-MM-DD)"
        name="eventDate"
        placeholder="Leave blank if unknown"
      />
      <Field label="Original source date wording" name="sourceDateText" />
    </>
  );
}
function EvidenceFields({ passages }: { passages: readonly StudyPassage[] }) {
  return (
    <>
      <Field
        label="Exact supporting source statement"
        name="sourceStatement"
        required
        area
      />
      <Choice
        label="Supporting saved passages"
        name="passageIds"
        multiple
        options={passages.map((passage) => ({
          id: passage.id,
          label: `${passage.citation.locator.value} · ${passage.citation.sourceId}`,
        }))}
      />
      <p class="sw-muted">
        Use exact wording from the saved source blocks. Evidence keeps its
        original version and locator.
      </p>
    </>
  );
}
function PassageCard({
  passage,
  corpus,
}: {
  passage: StudyPassage;
  corpus: AnalyzedCorpus;
}) {
  const [display, setDisplay] = useState<{
    text: string | null;
    reason: string | null;
  }>({ text: null, reason: "Loading verified source text" });
  useEffect(() => {
    let active = true;
    setDisplay({ text: null, reason: "Loading verified source text" });
    void studyReadPassage(passage, corpus)
      .then((result) => {
        if (active) setDisplay(result);
      })
      .catch(() => {
        if (active)
          setDisplay({ text: null, reason: "Passage binding needs review" });
      });
    return () => {
      active = false;
    };
  }, [passage, corpus]);
  return (
    <article class="sw-card">
      <h4>
        {passage.citation.sourceId} · {passage.citation.locator.value}
      </h4>
      {display.text === null ? (
        <p>{words(display.reason ?? "Source text unavailable")}</p>
      ) : (
        <blockquote>{display.text}</blockquote>
      )}
      <p>
        {passage.citation.sourceOrigin.publisher} ·{" "}
        {passage.citation.sourceOrigin.authorityLabel}
      </p>
      <p>
        Version {passage.citation.versionId} · {passage.bindingStatus} ·{" "}
        {passage.reviewState}
      </p>
      <a href={passage.citation.sourceUrl} target="_blank" rel="noreferrer">
        Open cited source (new tab)
      </a>
      <details>
        <summary>Immutable evidence identity</summary>
        <dl>
          <dt>Passage</dt>
          <dd>{passage.id}</dd>
          <dt>Segment SHA-256</dt>
          <dd>{passage.citation.segmentDigest}</dd>
          <dt>Source object SHA-256</dt>
          <dd>{passage.citation.objectDigest}</dd>
          <dt>UTF-8 range</dt>
          <dd>
            [{passage.citation.startByte}, {passage.citation.endByte})
          </dd>
          <dt>Retrieved</dt>
          <dd>{passage.citation.retrievedAt}</dd>
        </dl>
      </details>
    </article>
  );
}

export function StudyWorkspace({
  corpus,
  searchResults,
  searchRequest,
  selectedSegmentId,
  onOpenPassage,
  onSearch,
  sourceCoverage,
  projection,
}: StudyWorkspaceProps) {
  const [study, setStudy] = useState<ResearchStudy | null>(null);
  const [actorId, setActorId] = useState("");
  const [sensitivity, setSensitivity] =
    useState<StudySensitivity>("restricted");
  const [perspective, setPerspective] = useState<"moon" | "bird" | "frog">(
    "moon",
  );
  const [questionId, setQuestionId] = useState("");
  const [discoveryId, setDiscoveryId] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [products, setProducts] = useState<StudyProducts | null>(null);
  const [audience, setAudience] = useState<"local" | "public">("local");
  const [historical, setHistorical] = useState<ResearchStudy | null>(null);
  const [readableEvidence, setReadableEvidence] = useState<
    ReadonlyMap<string, string>
  >(new Map());
  useEffect(() => {
    let active = true;
    setReadableEvidence(new Map());
    void Promise.all(
      (study?.passages ?? []).map(async (passage) => {
        try {
          return [
            passage.id,
            (await studyReadPassage(passage, corpus)).text,
          ] as const;
        } catch {
          return [passage.id, null] as const;
        }
      }),
    ).then((rows) => {
      if (active)
        setReadableEvidence(
          new Map(
            rows.filter(
              (row): row is readonly [string, string] => row[1] !== null,
            ),
          ),
        );
    });
    return () => {
      active = false;
    };
  }, [study?.passages, corpus]);
  const readable = (record: {
    sourceStatement: string;
    passageIds: readonly string[];
  }) =>
    record.passageIds.some((id) =>
      readableEvidence.get(id)?.includes(record.sourceStatement),
    );
  const sourceStatement = (record: {
    sourceStatement: string;
    passageIds: readonly string[];
  }) =>
    readable(record)
      ? record.sourceStatement
      : "Source text withheld by display policy or pending evidence review. Open its cited source for the original wording.";
  const bound = study?.corpusDigest === corpus.contentDigest;
  const activeQuestion = questionId || study?.questions[0]?.id || "";
  const activeDiscovery = discoveryId || study?.discoveries[0]?.id || "";
  const analysts =
    study?.actors.filter((item) => item.kind === "analyst") ?? [];
  const actor =
    analysts.find((item) => item.id === actorId)?.id ?? analysts[0]?.id ?? "";
  const registrationActor =
    study?.actors.find(
      (item) =>
        item.id === study.updatedBy && ["analyst", "rule"].includes(item.kind),
    ) ?? study?.actors.find((item) => ["analyst", "rule"].includes(item.kind));
  const context = useMemo(
    () =>
      searchResults
        ? studySearchContext(bound ? study : null, corpus, searchResults, {
            sourceProfileId: searchRequest.sourceProfileId,
          })
        : null,
    [study, bound, corpus, searchResults, searchRequest.sourceProfileId],
  );
  const versions = corpus.versions.map((version) => ({
    id: version.id,
    label: `${corpus.works.find((work) => work.id === version.workId)?.title ?? version.workId} · ${version.sourceVersionIdentifier}`,
  }));
  const sourceIds = corpus.sourceProfiles
    .filter(
      (profile) =>
        !searchRequest.sourceProfileId ||
        profile.id === searchRequest.sourceProfileId,
    )
    .map((profile) => profile.sourceId);
  const questionOptions =
    study?.questions.map((question) => ({
      id: question.id,
      label: question.text,
    })) ?? [];
  const proceedingOptions =
    study?.proceedings.map((proceeding) => ({
      id: proceeding.id,
      label: proceeding.title,
    })) ?? [];
  const actionOptions =
    study?.actions.map((action) => ({
      id: action.id,
      label: `${words(action.type)} · ${formatDate(action.date)}`,
    })) ?? [];
  const passageOptions =
    study?.passages.map((passage) => ({
      id: passage.id,
      label: `${passage.citation.locator.value} · ${passage.citation.sourceId}`,
    })) ?? [];
  const reviewCollections = [
    "questions",
    "discoveries",
    "candidates",
    "passages",
    "assertions",
    "gaps",
    "annotations",
    "proceedings",
    "actions",
    "deadlines",
    "consultations",
    "environmentalEvidence",
    "authorityRelationships",
    "originGroups",
  ] as const;
  const targets = study
    ? reviewCollections.flatMap((collection) =>
        study[collection].map((record) => ({ collection, record })),
      )
    : [];
  const targetOptions = targets.map(({ collection, record }) => ({
    id: record.id,
    label: `${words(collection)} · ${"text" in record ? record.text : "title" in record ? record.title : record.id}`,
  }));

  async function run(operation: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await operation();
    } catch (failure) {
      setError(failureMessage(failure));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  function timestamp() {
    return new Date(
      Math.max(Date.now(), Date.parse(study?.updatedAt ?? "1970-01-01") + 1),
    ).toISOString();
  }
  function metadata(
    kind: string,
    classification: StudySensitivity = sensitivity,
  ): StudyRecord {
    return {
      id: identifier(kind),
      actorId: actor,
      createdAt: timestamp(),
      provenance: "analyst_authored",
      reviewState: "unreviewed",
      sensitivity: classification,
    };
  }
  function extracted(kind: string): StudyRecord {
    return { ...metadata(kind), provenance: "extracted_evidence" };
  }
  async function update(records: readonly StudyChange[]) {
    if (!study || !bound)
      throw new Error("Resume or rebind a study before editing.");
    if (!actor)
      throw new Error("Join this study as a local analyst before editing.");
    const next = await reviseResearchStudy(
      study,
      { updatedAt: timestamp(), actorId: actor, records },
      corpus,
    );
    setStudy(next);
    setProducts(null);
    setHistorical(null);
    setMessage(
      `Saved in this session · revision ${next.revision}. Download study JSON to keep it across sessions.`,
    );
  }
  function evidence(data: FormData) {
    return {
      sourceStatement: value(data, "sourceStatement"),
      passageIds: values(data, "passageIds"),
    };
  }
  function evidenceVersion(data: FormData) {
    const passage = study?.passages.find((item) =>
      values(data, "passageIds").includes(item.id),
    );
    if (!passage) throw new Error("Choose supporting saved evidence first.");
    return passage.citation.versionId;
  }
  async function importStudy(file: File) {
    setPendingImport(null);
    if (file.size > MAX_RESEARCH_STUDY_BYTES)
      throw new Error("Study file exceeds the 8 MiB limit. It was not read.");
    const text = await file.text();
    try {
      const imported = await parseResearchStudy(text, corpus);
      setStudy(imported);
      setActorId(imported.updatedBy);
      setPendingImport(null);
      setProducts(null);
      setQuestionId("");
      setDiscoveryId("");
      setHistorical(null);
      setSensitivity("restricted");
      setMessage(
        "Study resumed. New authored material defaults to restricted.",
      );
    } catch (failure) {
      if (
        failure instanceof Error &&
        "code" in failure &&
        failure.code === "CORPUS_BINDING"
      ) {
        setPendingImport(text);
        throw new Error(
          "This saved study belongs to a different corpus. Your current study is unchanged. Use the explicit rebind action to review its evidence against this corpus.",
          { cause: failure },
        );
      }
      throw failure;
    }
  }
  const disabled = busy || !study || !bound || !actor;
  const edit =
    (handler: (data: FormData) => Promise<void>) =>
    (data: FormData, form: HTMLFormElement) => {
      void run(async () => {
        await handler(data);
        form.reset();
      });
    };

  return (
    <section id="pw-study" class="study-workspace" aria-labelledby="sw-heading">
      <h2 id="sw-heading">Persistent research study</h2>
      {projection && (
        <details open={searchResults?.total === 0}>
          <summary>
            Bounded collection selection and retained dependencies
          </summary>
          <p>
            Requested publication date range:{" "}
            {projection.selection.from ?? "No start boundary"} through{" "}
            {projection.selection.through ?? "No end boundary"}. Search date
            filters operate within this retained selection.
          </p>
          <p>
            {projection.selection.sourceProfileIds.length} selected source
            collections;{" "}
            {projection.coverage.filter((entry) => !entry.searched).length}{" "}
            unsearched collections.{" "}
            {projection.directlySelectedVersionIds.length} directly selected
            versions; {projection.retainedVersionIds.length} retained versions
            including whole-work procedural and evidence dependencies;{" "}
            {projection.excludedVersionIds.length} excluded versions.
          </p>
          <ul>
            {projection.coverage.map((entry) => (
              <li key={entry.sourceProfileId}>
                {entry.sourceProfileId}:{" "}
                {entry.selected ? "selected" : "not selected"},{" "}
                {entry.searched ? "searched" : "unsearched"},{" "}
                {entry.retained ? "retained" : "not retained"}; {entry.status};
                data as of {entry.dataAsOf ?? "unknown"}.
              </li>
            ))}
          </ul>
          {projection.limitations.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </details>
      )}
      {sourceCoverage && (
        <details class="sw-source-coverage">
          <summary>
            Configured source qualification and service capabilities (
            {sourceCoverage.sources.length})
          </summary>
          <p>
            Qualification as of {sourceCoverage.asOf}. Configured discovery
            sources are separate from collections already retained in this
            corpus. Geographic discovery relevance does not establish
            jurisdiction or homeland relationships.
          </p>
          <p>
            Managed storage ceiling:{" "}
            {(
              sourceCoverage.managedStorageCeilingBytes / 1_000_000_000
            ).toLocaleString()}{" "}
            GB across the managed footprint.
          </p>
          <ul>
            {sourceCoverage.sources.map((source) => (
              <li key={source.id}>
                <details>
                  <summary>
                    {source.label}: {source.lifecycle}, {source.reviewStatus}
                  </summary>
                  <p>
                    Publisher: {source.publisher}. Discovery regions:{" "}
                    {source.discoveryRegions.join(", ") || "Not specified"}.
                  </p>
                  <p>
                    Available capabilities:{" "}
                    {source.availableCapabilities.map(words).join(", ") ||
                      "Unavailable"}
                    .
                  </p>
                  {source.regionalInterface && (
                    <div>
                      <p>
                        Regional interface review:{" "}
                        {source.regionalInterface.state}
                        {" · "}
                        {source.regionalInterface.requirement === "required_api"
                          ? "Required API candidate"
                          : "Interface qualification"}
                        {" · "}
                        {words(source.regionalInterface.disposition)}. Assessed{" "}
                        {source.regionalInterface.assessedOn}.
                      </p>
                      <p>{source.regionalInterface.note}</p>
                      <ul>
                        {source.regionalInterface.evidence.map(
                          (evidence, index) => (
                            <li key={`${evidence.url}-${index}`}>
                              <a href={evidence.url}>Interface evidence</a>{" "}
                              observed {evidence.observedOn}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                  <ul>
                    {source.declaredCapabilities.map((capability) => (
                      <li key={capability.mode}>
                        {words(capability.mode)}: {words(capability.state)}
                      </li>
                    ))}
                  </ul>
                  <p>
                    Documented coverage:{" "}
                    {source.coverage.documented.from ?? "Unknown start"} through{" "}
                    {source.coverage.documented.through ?? "Unknown end"};{" "}
                    {source.coverage.documented.completeness}.{" "}
                    {source.coverage.documented.note}
                  </p>
                  <ul>
                    {source.blockers.map((blocker, index) => (
                      <li key={`${blocker.code}-${index}`}>{blocker.detail}</li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
          {sourceCoverage.limitations.map((limitation) => (
            <p key={limitation}>{limitation}</p>
          ))}
        </details>
      )}
      {context && (
        <div class="sw-search-context">
          {context.contextRecords.length > 0 && (
            <section aria-labelledby="sw-context-heading">
              <h3 id="sw-context-heading">Procedural source context</h3>
              <p>
                These related source records preserve procedural history. They
                are separate from directly matching search evidence.
              </p>
              {context.contextTruncated && (
                <p role="status">
                  Showing {context.contextRecords.length} of{" "}
                  {context.totalContextRecords} context records.{" "}
                  {context.totalContextRecords - context.contextRecords.length}{" "}
                  additional records exceed the context display limit. Refine
                  the search to explore additional retained context.
                </p>
              )}
              <ul>
                {context.contextRecords.map((record) => (
                  <li key={record.versionId}>
                    <strong>{record.title}</strong> · {record.versionId}
                    {record.reason === "governing_proceeding_context" && (
                      <p>
                        Reviewed study proceeding context; retained analyst
                        review, not a determination of legal effect at the
                        search cutoff.
                      </p>
                    )}
                    <p>
                      Dockets: {record.docketIds.join(", ") || "Not stated"} ·
                      RINs: {record.rins.join(", ") || "Not stated"}
                    </p>
                    {(() => {
                      const version = corpus.versions.find(
                        (item) => item.id === record.versionId,
                      );
                      const segment = corpus.segments.find((item) =>
                        version?.renditionIds.includes(item.renditionId),
                      );
                      return (
                        segment && (
                          <button
                            type="button"
                            onClick={() => onOpenPassage(segment.id)}
                          >
                            Read contextual source · {record.title}
                          </button>
                        )
                      );
                    })()}
                    {record.passageIds.map((id) => {
                      const passage = study?.passages.find(
                        (entry) => entry.id === id,
                      );
                      return (
                        passage && (
                          <button
                            type="button"
                            key={id}
                            onClick={() =>
                              onOpenPassage(passage.citation.segmentId)
                            }
                          >
                            Read parent evidence ·{" "}
                            {passage.citation.locator.value}
                          </button>
                        )
                      );
                    })}
                    {record.sourceRelationships?.map((relation) => (
                      <div key={relation.relationshipId}>
                        <p>
                          Source-stated relationship: {relation.type} ·{" "}
                          {relation.fromVersionId}
                          {" → "}
                          {relation.targetVersionId}
                          {" · Source-stated date: "}
                          {formatDate(relation.sourceStatedAt)}
                        </p>
                        {relation.sourceLabel !== null ? (
                          <blockquote>{relation.sourceLabel}</blockquote>
                        ) : (
                          <p>
                            Source wording is withheld by its display policy.
                          </p>
                        )}
                        {relation.sourceSegmentIds.map((segmentId) => {
                          const segment = corpus.segments.find(
                            (item) => item.id === segmentId,
                          );
                          return (
                            segment && (
                              <button
                                type="button"
                                key={segmentId}
                                onClick={() => onOpenPassage(segmentId)}
                              >
                                Read relationship evidence ·{" "}
                                {segment.locator.value}
                              </button>
                            )
                          );
                        })}
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <details open={searchResults?.total === 0}>
            <summary>Searched collections and date coverage</summary>
            {searchResults?.total === 0 && (
              <p>
                No matches in this search do not establish that an event or
                policy did not occur.
              </p>
            )}
            <p>
              Search date scope:{" "}
              {searchRequest.asOf
                ? `${searchRequest.asOf} · ${words(searchRequest.basis ?? "")}`
                : "All retained dates, including unknown dates"}
              .
            </p>
            <ul>
              {context.coverage.map((coverage) => (
                <li key={coverage.id}>
                  {corpus.sourceProfiles.find(
                    (profile) => profile.id === coverage.sourceProfileId,
                  )?.publisher ?? coverage.sourceProfileId}
                  : {coverage.searched ? "searched" : "not searched"};{" "}
                  {coverage.status}; {formatDate(coverage.from)} through{" "}
                  {formatDate(coverage.through)}; {coverage.documentCount}{" "}
                  works.
                </li>
              ))}
            </ul>
            {context.limitations.map((limitation) => (
              <p key={limitation}>{limitation}</p>
            ))}
          </details>
        </div>
      )}
      <p>
        A local study connects questions, discovery, source blocks, assertions,
        review, and follow-up gaps. Download and reopen its JSON file to resume
        across sessions.
      </p>
      <label class="sw-file">
        Resume study JSON
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void run(() => importStudy(file));
          }}
        />
      </label>
      {pendingImport && (
        <div class="sw-notice">
          <p>
            Rebinding preserves historical citations but requires renewed
            evidence review.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const pending = JSON.parse(pendingImport) as ResearchStudy;
                const rebound = await rebindResearchStudy(pending, corpus, {
                  updatedAt: new Date().toISOString(),
                  actorId: pending.updatedBy,
                });
                setStudy(rebound);
                setActorId(rebound.updatedBy);
                setQuestionId("");
                setDiscoveryId("");
                setProducts(null);
                setHistorical(null);
                setPendingImport(null);
                setMessage(
                  "Study rebound. Review source bindings before relying on saved evidence.",
                );
              })
            }
          >
            Rebind imported study to this corpus
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setPendingImport(null)}
          >
            Cancel import
          </button>
        </div>
      )}
      {error && (
        <p role="alert" class="sw-error">
          {error}
        </p>
      )}
      <p aria-live="polite">{busy ? "Validating local study…" : message}</p>
      {!study ? (
        <form
          aria-label="Create research study"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void run(async () => {
              const classification = value(
                data,
                "sensitivity",
              ) as StudySensitivity;
              const localActor: StudyActor = {
                id: identifier("analyst"),
                label: value(data, "actorLabel"),
                kind: "analyst",
                sensitivity: classification,
              };
              const created = await createResearchStudy(
                {
                  id: identifier("study"),
                  title: value(data, "title"),
                  createdAt: new Date().toISOString(),
                  actor: localActor,
                  sensitivity: classification,
                },
                corpus,
              );
              setStudy(created);
              setActorId(localActor.id);
              setSensitivity("restricted");
              setMessage("Study created. New material defaults to restricted.");
            });
          }}
        >
          <fieldset disabled={busy}>
            <legend>Start a study</legend>
            <Field label="Study title" name="title" required />
            <Field
              label="Nonpersonal local analyst label"
              name="actorLabel"
              required
              placeholder="For example: local analyst A"
            />
            <Choice
              label="Study title and analyst label visibility"
              name="sensitivity"
              options={choices(["restricted", "public"])}
              defaultValue="restricted"
            />
            <button type="submit">Create study</button>
          </fieldset>
        </form>
      ) : (
        <>
          <header class="sw-study-header">
            <h3>{study.title}</h3>
            <p>
              Revision {study.revision} · {study.sensitivity} study · Last
              changed {study.updatedAt}
            </p>
            <button
              type="button"
              disabled={busy || !bound}
              onClick={() =>
                void run(async () => {
                  download(
                    `${study.id}.json`,
                    await serializeResearchStudy(study, corpus),
                    "application/json",
                  );
                  setMessage(
                    "Local study backup downloaded, including private notes.",
                  );
                })
              }
            >
              Save study JSON
            </button>
            <p class="sw-muted">
              The local backup includes private notes. Keep it in your own local
              storage.
            </p>
          </header>
          {!bound && (
            <div class="sw-notice">
              <p>
                The active corpus differs from this study. Editing is paused
                until explicit rebind.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const rebound = await rebindResearchStudy(study, corpus, {
                      updatedAt: timestamp(),
                      actorId:
                        actor || registrationActor?.id || study.updatedBy,
                    });
                    setStudy(rebound);
                    setProducts(null);
                    setHistorical(null);
                  })
                }
              >
                Rebind current study
              </button>
            </div>
          )}
          {!actor && (
            <>
              <p>
                Join this study as a local analyst to edit or review it.
                Existing model and rule authorship stays attached to its
                original records.
              </p>
              {!registrationActor && (
                <p class="sw-notice">
                  This study has no saved analyst or rule actor authorized to
                  register an analyst. It remains available for reading and
                  export.
                </p>
              )}
              <Editor
                title="Join study as local analyst"
                submit="Join study"
                disabled={busy || !bound || !registrationActor}
                onSubmit={edit(async (data) => {
                  if (!registrationActor || !bound)
                    throw new Error(
                      "A bound study with a saved analyst or rule actor is required.",
                    );
                  const localActor: StudyActor = {
                    id: identifier("analyst"),
                    label: value(data, "actorLabel"),
                    kind: "analyst",
                    sensitivity: value(data, "sensitivity") as StudySensitivity,
                  };
                  const joined = await reviseResearchStudy(
                    study,
                    {
                      updatedAt: timestamp(),
                      actorId: registrationActor.id,
                      records: [{ collection: "actors", record: localActor }],
                    },
                    corpus,
                  );
                  setStudy(joined);
                  setActorId(localActor.id);
                  setSensitivity("restricted");
                  setProducts(null);
                  setHistorical(null);
                  setMessage(
                    "Local analyst registered. New authored material defaults to restricted; save study JSON to keep this change.",
                  );
                })}
              >
                <Field
                  label="Nonpersonal local analyst label"
                  name="actorLabel"
                  required
                  placeholder="For example: local analyst A"
                />
                <Choice
                  label="Local analyst label visibility"
                  name="sensitivity"
                  options={choices(["restricted", "public"])}
                  defaultValue="restricted"
                />
              </Editor>
            </>
          )}
          <div class="sw-settings">
            <label>
              Acting analyst
              <select
                value={actor}
                disabled={busy || !actor}
                onChange={(event) => setActorId(event.currentTarget.value)}
              >
                {!actor && <option value="">Join as a local analyst</option>}
                {analysts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              New authored material visibility
              <select
                value={sensitivity}
                disabled={busy}
                onChange={(event) =>
                  setSensitivity(event.currentTarget.value as StudySensitivity)
                }
              >
                <option value="restricted">Restricted</option>
                <option value="public">Public, explicitly selected</option>
              </select>
            </label>
            <label>
              Working question
              <select
                value={activeQuestion}
                onChange={(event) => setQuestionId(event.currentTarget.value)}
              >
                <option value="">Choose a question</option>
                {questionOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div
            class="sw-perspectives"
            role="group"
            aria-label="Analytical perspective"
          >
            {(
              [
                ["moon", "Moon’s-eye · Strategic"],
                ["bird", "Bird’s-eye · Procedural"],
                ["frog", "Frog’s-eye · Source evidence"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={perspective === key}
                onClick={() => setPerspective(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {perspective === "moon" && (
            <section aria-labelledby="sw-moon">
              <h3 id="sw-moon">Moon’s-eye: questions, themes, and gaps</h3>
              <Editor
                title="Add research question"
                submit="Save question"
                disabled={disabled}
                onSubmit={edit(async (data) => {
                  const record = {
                    ...metadata("question"),
                    text: value(data, "text"),
                    parentQuestionId: optional(data, "parentQuestionId"),
                    theme: value(data, "theme"),
                    status: "open" as const,
                    discoveryGeographies: lines(data, "geographies"),
                  };
                  await update([{ collection: "questions", record }]);
                  setQuestionId(record.id);
                })}
              >
                <Field label="Research question" name="text" required area />
                <Field label="Analytical theme" name="theme" required />
                <Choice
                  label="Parent question"
                  name="parentQuestionId"
                  optional
                  options={questionOptions}
                />
                <Field
                  label="Discovery geography labels (comma separated)"
                  name="geographies"
                />
                <p class="sw-muted">
                  Geography labels guide discovery; they establish no
                  applicability or homeland relationship.
                </p>
              </Editor>
              <ol>
                {study.questions.map((question) => (
                  <li key={question.id} class="sw-card">
                    <h4>{question.text}</h4>
                    <p>
                      Theme: {question.theme} · {question.status} ·{" "}
                      {question.reviewState}
                    </p>
                    {question.parentQuestionId && (
                      <p>
                        Parent:{" "}
                        {
                          study.questions.find(
                            (item) => item.id === question.parentQuestionId,
                          )?.text
                        }
                      </p>
                    )}
                    <p>
                      {
                        study.assertions.filter(
                          (item) => item.questionId === question.id,
                        ).length
                      }{" "}
                      assertions ·{" "}
                      {
                        study.gaps.filter(
                          (item) =>
                            item.questionId === question.id &&
                            item.status === "open",
                        ).length
                      }{" "}
                      open gaps
                    </p>
                    <button
                      type="button"
                      onClick={() => setQuestionId(question.id)}
                    >
                      Work on this question
                    </button>
                  </li>
                ))}
              </ol>
              <Editor
                title="Update question status"
                submit="Save question status"
                disabled={disabled || !study.questions.length}
                onSubmit={edit(async (data) => {
                  const question = study.questions.find(
                    (item) => item.id === value(data, "questionId"),
                  );
                  if (!question)
                    throw new Error("Choose an existing question.");
                  await update([
                    {
                      collection: "questions",
                      record: {
                        ...question,
                        status: value(
                          data,
                          "status",
                        ) as StudyCatalogs["questions"][number]["status"],
                        reviewState: "unreviewed",
                      },
                    },
                  ]);
                })}
              >
                <Choice
                  label="Question to update"
                  name="questionId"
                  options={questionOptions}
                  defaultValue={activeQuestion}
                />
                <Choice
                  label="Question status"
                  name="status"
                  options={choices(["open", "answered", "archived"])}
                />
              </Editor>
              <Editor
                title="Save discovery query"
                submit="Save discovery"
                disabled={disabled || !activeQuestion}
                onSubmit={edit(async (data) => {
                  const record = {
                    ...metadata("discovery"),
                    questionId: activeQuestion,
                    query: value(data, "query"),
                    sourceIds,
                    searchScope: captureSearchScope(searchRequest),
                    followUpGapId: null,
                    status: value(data, "status") as "planned" | "completed",
                  };
                  await update([{ collection: "discoveries", record }]);
                  setDiscoveryId(record.id);
                })}
              >
                <Field
                  key={searchRequest.query}
                  label="Discovery query"
                  name="query"
                  required
                  defaultValue={searchRequest.query}
                />
                <Choice
                  label="Discovery status"
                  name="status"
                  options={choices(["planned", "completed"])}
                  defaultValue="planned"
                />
                <p>Selected collections: {sourceIds.join(", ") || "None"}</p>
                <p>{searchScopeLabel(captureSearchScope(searchRequest))}</p>
              </Editor>
              <ul>
                {study.discoveries.map((discovery) => (
                  <li key={discovery.id}>
                    <strong>{discovery.query}</strong> · {discovery.status}{" "}
                    <p>{searchScopeLabel(discovery.searchScope)}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscoveryId(discovery.id);
                        setQuestionId(discovery.questionId);
                        onSearch({
                          query: discovery.query,
                          ...(discovery.searchScope?.temporal ?? {}),
                          ...(discovery.searchScope?.governmentContext
                            ? {
                                governmentContext:
                                  discovery.searchScope.governmentContext,
                              }
                            : {}),
                          ...(discovery.searchScope?.instrumentClass
                            ? {
                                instrumentClass:
                                  discovery.searchScope.instrumentClass,
                              }
                            : {}),
                          ...(discovery.searchScope?.jurisdictionRef
                            ? {
                                jurisdictionRef:
                                  discovery.searchScope.jurisdictionRef,
                              }
                            : {}),
                          ...(discovery.sourceIds.length === 1
                            ? {
                                sourceProfileId: corpus.sourceProfiles.find(
                                  (profile) =>
                                    profile.sourceId === discovery.sourceIds[0],
                                )?.id,
                              }
                            : {}),
                        });
                      }}
                    >
                      Run saved discovery
                    </button>
                  </li>
                ))}
              </ul>
              <Editor
                title="Record unresolved gap"
                submit="Save gap"
                disabled={disabled || !activeQuestion}
                onSubmit={edit(async (data) => {
                  await update([
                    {
                      collection: "gaps",
                      record: {
                        ...metadata("gap"),
                        questionId: activeQuestion,
                        text: value(data, "text"),
                        status: "open",
                        followUpDiscoveryId: null,
                      },
                    },
                  ]);
                })}
              >
                <Field
                  label="Unresolved evidence gap"
                  name="text"
                  area
                  required
                />
              </Editor>
              <ul>
                {study.gaps.map((gap) => (
                  <li key={gap.id}>
                    {gap.text} · {gap.status}
                    {gap.followUpDiscoveryId && " · Follow-up discovery saved"}
                  </li>
                ))}
              </ul>
              <Editor
                title="Update gap status"
                submit="Save gap status"
                disabled={disabled || !study.gaps.length}
                onSubmit={edit(async (data) => {
                  const gap = study.gaps.find(
                    (item) => item.id === value(data, "gapId"),
                  );
                  if (!gap) throw new Error("Choose an existing gap.");
                  await update([
                    {
                      collection: "gaps",
                      record: {
                        ...gap,
                        status: value(
                          data,
                          "status",
                        ) as StudyCatalogs["gaps"][number]["status"],
                        reviewState: "unreviewed",
                      },
                    },
                  ]);
                })}
              >
                <Choice
                  label="Gap to update"
                  name="gapId"
                  options={study.gaps.map((gap) => ({
                    id: gap.id,
                    label: gap.text,
                  }))}
                />
                <Choice
                  label="Gap status"
                  name="status"
                  options={choices(["open", "resolved", "dismissed"])}
                />
              </Editor>
              <Editor
                title="Follow up a gap"
                submit="Save follow-up discovery"
                disabled={disabled || study.gaps.length === 0}
                onSubmit={edit(async (data) => {
                  const gap = study.gaps.find(
                    (item) => item.id === value(data, "gapId"),
                  );
                  if (!gap) throw new Error("Choose an existing gap.");
                  const discovery = {
                    ...metadata("discovery"),
                    questionId: gap.questionId,
                    query: value(data, "query"),
                    sourceIds,
                    searchScope: captureSearchScope(searchRequest),
                    followUpGapId: gap.id,
                    status: "planned" as const,
                  };
                  await update([
                    { collection: "discoveries", record: discovery },
                    {
                      collection: "gaps",
                      record: { ...gap, followUpDiscoveryId: discovery.id },
                    },
                  ]);
                  setDiscoveryId(discovery.id);
                })}
              >
                <Choice
                  label="Gap to follow up"
                  name="gapId"
                  options={study.gaps.map((gap) => ({
                    id: gap.id,
                    label: gap.text,
                  }))}
                />
                <Field label="Follow-up query" name="query" required />
              </Editor>
            </section>
          )}
          {perspective === "frog" && (
            <section aria-labelledby="sw-frog">
              <h3 id="sw-frog">
                Frog’s-eye: source evidence and analyst interpretation
              </h3>
              <Editor
                title="Retain a discovered source"
                submit="Retain source candidate"
                disabled={disabled || !activeDiscovery}
                onSubmit={edit(async (data) => {
                  const version = corpus.versions.find(
                    (item) => item.id === value(data, "versionId"),
                  );
                  const work = corpus.works.find(
                    (item) => item.id === version?.workId,
                  );
                  const profile = corpus.sourceProfiles.find(
                    (item) => item.id === work?.sourceProfileId,
                  );
                  const rendition = corpus.renditions.find(
                    (item) => item.versionId === version?.id,
                  );
                  const capture = corpus.captures.find(
                    (item) => item.id === rendition?.captureId,
                  );
                  if (!version || !work || !profile || !capture)
                    throw new Error("Select a retained source version.");
                  await update([
                    {
                      collection: "candidates",
                      record: {
                        ...metadata("candidate"),
                        discoveryId: value(data, "discoveryId"),
                        url: capture.finalUrl,
                        title: work.title,
                        sourceId: profile.sourceId,
                        versionId: version.id,
                        disposition: "retained",
                        reason: value(data, "reason"),
                      },
                    },
                  ]);
                })}
              >
                <Choice
                  label="Source discovery"
                  name="discoveryId"
                  options={study.discoveries.map((item) => ({
                    id: item.id,
                    label: item.query,
                  }))}
                  defaultValue={activeDiscovery}
                />
                <Choice
                  label="Source version to retain"
                  name="versionId"
                  options={versions}
                  defaultValue={searchResults?.hits[0]?.versionId}
                />
                <Field
                  label="Reason for retaining source"
                  name="reason"
                  required
                />
              </Editor>
              <ul>
                {study.candidates.map((candidate) => (
                  <li key={candidate.id}>
                    {candidate.title} · {candidate.disposition} ·{" "}
                    {candidate.reason}
                  </li>
                ))}
              </ul>
              <Editor
                title="Capture an exact source block"
                submit="Capture passage"
                disabled={disabled}
                onSubmit={edit(async (data) => {
                  const passage = await captureStudyPassage(
                    {
                      id: identifier("passage"),
                      segmentId: value(data, "segmentId"),
                      actorId: actor,
                      createdAt: timestamp(),
                      sensitivity,
                    },
                    corpus,
                  );
                  await update([{ collection: "passages", record: passage }]);
                })}
              >
                <Choice
                  key={selectedSegmentId ?? "none"}
                  label="Source block to capture"
                  name="segmentId"
                  defaultValue={selectedSegmentId ?? undefined}
                  options={corpus.segments.map((segment) => ({
                    id: segment.id,
                    label: `${segment.locator.value} · ${segment.id}`,
                  }))}
                />
                <p>
                  The inspected workbench passage is preselected. Capturing
                  preserves its entire exact source block and original citation.
                </p>
              </Editor>
              {study.passages.map((passage) => (
                <PassageCard
                  key={passage.id}
                  passage={passage}
                  corpus={corpus}
                />
              ))}
              <Editor
                title="Write an evidence-based assertion"
                submit="Save assertion"
                disabled={disabled || !activeQuestion}
                onSubmit={edit(async (data) => {
                  await update([
                    {
                      collection: "assertions",
                      record: {
                        ...metadata("assertion"),
                        questionId: activeQuestion,
                        text: value(data, "text"),
                        supportingPassageIds: values(data, "support"),
                        challengingPassageIds: values(data, "challenge"),
                        supersedesAssertionId: optional(data, "supersedes"),
                      },
                    },
                  ]);
                })}
              >
                <Field label="Analyst assertion" name="text" area required />
                <Choice
                  label="Supporting passages"
                  name="support"
                  multiple
                  optional
                  options={passageOptions}
                />
                <Choice
                  label="Challenging passages"
                  name="challenge"
                  multiple
                  optional
                  options={passageOptions}
                />
                <Choice
                  label="Supersedes earlier assertion"
                  name="supersedes"
                  optional
                  options={study.assertions.map((item) => ({
                    id: item.id,
                    label: item.text,
                  }))}
                />
              </Editor>
              {study.assertions.map((assertion) => (
                <article class="sw-card" key={assertion.id}>
                  <h4>{assertion.text}</h4>
                  <p>
                    Analyst authored · {assertion.reviewState} ·{" "}
                    {assertion.supportingPassageIds.length} supporting passages
                    · {assertion.challengingPassageIds.length} challenging
                    passages
                  </p>
                </article>
              ))}
            </section>
          )}
          {perspective === "bird" && (
            <section aria-labelledby="sw-bird">
              <h3 id="sw-bird">
                Bird’s-eye: proceedings, consultation, and authority
              </h3>
              <p>
                Record explicit source statements. Aggregate agency reporting
                and intertribal positions do not establish participation or
                positions of individual Nations.
              </p>
              <Editor
                title="Add governing proceeding"
                submit="Save proceeding"
                disabled={disabled || !study.passages.length}
                onSubmit={edit(async (data) => {
                  await update([
                    {
                      collection: "proceedings",
                      record: {
                        ...extracted("proceeding"),
                        title: value(data, "title"),
                        parentProceedingId: optional(data, "parent"),
                        docketIds: lines(data, "dockets"),
                        rins: lines(data, "rins"),
                        versionIds: values(data, "versions"),
                        ...evidence(data),
                      },
                    },
                  ]);
                })}
              >
                <Field label="Proceeding title" name="title" required />
                <Choice
                  label="Parent proceeding"
                  name="parent"
                  optional
                  options={proceedingOptions}
                />
                <Field
                  label="Docket identifiers (comma separated)"
                  name="dockets"
                />
                <Field label="RINs (comma separated)" name="rins" />
                <Choice
                  label="Proceeding document versions"
                  name="versions"
                  multiple
                  options={versions}
                />
                <EvidenceFields passages={study.passages} />
              </Editor>
              {study.proceedings.map((proceeding) => (
                <article class="sw-card" key={proceeding.id}>
                  <h4>{proceeding.title}</h4>
                  <p>
                    Dockets: {proceeding.docketIds.join(", ") || "Not stated"} ·
                    RINs: {proceeding.rins.join(", ") || "Not stated"}
                  </p>
                  <blockquote>{sourceStatement(proceeding)}</blockquote>
                  {studyActiveDeadlines(study, proceeding.id).map(
                    (deadline) => (
                      <p key={deadline.type}>
                        {words(deadline.type)} deadline · {deadline.state}:{" "}
                        {deadline.candidates
                          .map((item) => formatDate(item.date))
                          .join(" / ")}
                      </p>
                    ),
                  )}
                </article>
              ))}
              <Editor
                title="Add regulatory action"
                submit="Save action"
                disabled={
                  disabled ||
                  !study.proceedings.length ||
                  !study.passages.length
                }
                onSubmit={edit(async (data) => {
                  await update([
                    {
                      collection: "actions",
                      record: {
                        ...extracted("action"),
                        proceedingId: value(data, "proceedingId"),
                        versionId: evidenceVersion(data),
                        type: value(data, "type") as StudyActionType,
                        date: sourceDate(data),
                        sourceDateText: optional(data, "sourceDateText"),
                        previousActionId: optional(data, "previous"),
                        ...evidence(data),
                      },
                    },
                  ]);
                })}
              >
                <Choice
                  label="Action proceeding"
                  name="proceedingId"
                  options={proceedingOptions}
                />
                <Choice
                  label="Regulatory action type"
                  name="type"
                  options={choices([
                    "proposed_rule",
                    "rescission",
                    "amendment",
                    "comment_deadline_extension",
                    "final_rule",
                    "withdrawal",
                    "subsequent_action",
                  ])}
                />
                <Choice
                  label="Previous regulatory action"
                  name="previous"
                  optional
                  options={actionOptions}
                />
                <DateFields />
                <EvidenceFields passages={study.passages} />
              </Editor>
              <Editor
                title="Add or extend response deadline"
                submit="Save deadline"
                disabled={disabled || !study.actions.length}
                onSubmit={edit(async (data) => {
                  await update([
                    {
                      collection: "deadlines",
                      record: {
                        ...extracted("deadline"),
                        actionId: value(data, "actionId"),
                        type: value(data, "type") as
                          "comment" | "consultation" | "other",
                        date: sourceDate(data),
                        sourceDateText: optional(data, "sourceDateText"),
                        timeZone: optional(data, "timeZone"),
                        qualifications: value(data, "qualifications"),
                        replacesDeadlineId: optional(data, "replaces"),
                        ...evidence(data),
                      },
                    },
                  ]);
                })}
              >
                <Choice
                  label="Deadline action"
                  name="actionId"
                  options={actionOptions}
                />
                <Choice
                  label="Deadline type"
                  name="type"
                  options={choices(["comment", "consultation", "other"])}
                />
                <Choice
                  label="Earlier deadline replaced"
                  name="replaces"
                  optional
                  options={study.deadlines.map((item) => ({
                    id: item.id,
                    label: `${words(item.type)} · ${formatDate(item.date)}`,
                  }))}
                />
                <DateFields />
                <Field label="Source-stated time zone" name="timeZone" />
                <Field
                  label="Deadline qualifications"
                  name="qualifications"
                  area
                />
                <EvidenceFields passages={study.passages} />
              </Editor>
              <Editor
                title="Add consultation event"
                submit="Save consultation event"
                disabled={disabled || !study.passages.length}
                onSubmit={edit(async (data) => {
                  const scope = value(
                    data,
                    "scope",
                  ) as StudyConsultationParticipant["scope"];
                  const participant: StudyActor = {
                    id: identifier("source-actor"),
                    label: value(data, "sourceName"),
                    kind:
                      scope === "tribal_nation"
                        ? "tribal_nation"
                        : scope === "intertribal"
                          ? "organization"
                          : "agency",
                    sensitivity,
                  };
                  const proof = evidence(data);
                  const participants: StudyConsultationParticipant[] = [
                    {
                      actorId: participant.id,
                      role: value(
                        data,
                        "role",
                      ) as StudyConsultationParticipant["role"],
                      scope,
                      sourceName: participant.label,
                      ...proof,
                    },
                  ];
                  const changes: StudyChange[] = [
                    { collection: "actors", record: participant },
                  ];
                  if (value(data, "agencyName")) {
                    const agency: StudyActor = {
                      id: identifier("source-actor"),
                      label: value(data, "agencyName"),
                      kind: "agency",
                      sensitivity,
                    };
                    changes.push({ collection: "actors", record: agency });
                    participants.push({
                      actorId: agency.id,
                      role: "agency",
                      scope: "agency",
                      sourceName: agency.label,
                      passageIds: proof.passageIds,
                      sourceStatement:
                        value(data, "agencyStatement") || proof.sourceStatement,
                    });
                  }
                  changes.push({
                    collection: "consultations",
                    record: {
                      ...extracted("consultation"),
                      proceedingId: optional(data, "proceedingId"),
                      type: value(data, "type") as StudyConsultationType,
                      date: sourceDate(data),
                      sourceDateText: optional(data, "sourceDateText"),
                      relatedEventIds: values(data, "related"),
                      respondsToEventId: optional(data, "respondsTo"),
                      participants,
                      ...proof,
                    },
                  });
                  await update(changes);
                })}
              >
                <Choice
                  label="Consultation proceeding"
                  name="proceedingId"
                  optional
                  options={proceedingOptions}
                />
                <Choice
                  label="Consultation event type"
                  name="type"
                  options={choices([
                    "notice",
                    "invitation",
                    "meeting_held",
                    "submission",
                    "response",
                    "outcome",
                  ])}
                />
                <Choice
                  label="Participation attribution scope"
                  name="scope"
                  options={choices([
                    "aggregate",
                    "agency",
                    "intertribal",
                    "tribal_nation",
                  ])}
                  defaultValue="aggregate"
                />
                <Field
                  label="Exact agency, organization, or Nation name in source"
                  name="sourceName"
                  required
                />
                <Choice
                  label="Source-documented role"
                  name="role"
                  options={choices([
                    "agency",
                    "notice_recipient",
                    "invited",
                    "attended",
                    "submitter",
                    "respondent",
                    "outcome_subject",
                  ])}
                />
                <Field
                  label="Additional participating agency (optional exact source name)"
                  name="agencyName"
                />
                <Field
                  label="Additional agency source statement (optional; otherwise uses event statement)"
                  name="agencyStatement"
                  area
                />
                <Choice
                  label="Related consultation events"
                  name="related"
                  multiple
                  optional
                  options={study.consultations.map((item) => ({
                    id: item.id,
                    label: `${words(item.type)} · ${formatDate(item.date)}`,
                  }))}
                />
                <Choice
                  label="Responds to consultation event"
                  name="respondsTo"
                  optional
                  options={study.consultations.map((item) => ({
                    id: item.id,
                    label: words(item.type),
                  }))}
                />
                <DateFields />
                <EvidenceFields passages={study.passages} />
              </Editor>
              <div class="sw-timeline">
                <h4>Procedural and consultation history</h4>
                <ul>
                  {[
                    ...study.actions.map((item) => ({
                      id: item.id,
                      date: item.date,
                      text: `${words(item.type)}: ${sourceStatement(item)}`,
                      review: item.reviewState,
                    })),
                    ...study.deadlines.map((item) => ({
                      id: item.id,
                      date: item.date,
                      text: `${words(item.type)} deadline: ${sourceStatement(item)}${item.replacesDeadlineId ? " · Replaces an earlier retained deadline" : ""}`,
                      review: item.reviewState,
                    })),
                    ...study.consultations.map((item) => ({
                      id: item.id,
                      date: item.date,
                      text: `${words(item.type)}: ${readable(item) ? item.participants.map((participant) => `${participant.sourceName} (${participant.scope}, ${participant.role})`).join("; ") : "Participation wording withheld"} · ${sourceStatement(item)}`,
                      review: item.reviewState,
                    })),
                  ]
                    .sort((left, right) =>
                      (left.date.value ?? "9999").localeCompare(
                        right.date.value ?? "9999",
                      ),
                    )
                    .map((item) => (
                      <li key={item.id}>
                        <strong>{formatDate(item.date)}</strong> · {item.text} ·{" "}
                        {item.review}
                      </li>
                    ))}
                </ul>
              </div>
              <Editor
                title="Add environmental impact evidence"
                submit="Save environmental evidence"
                disabled={disabled || !study.passages.length}
                onSubmit={edit(async (data) => {
                  await update([
                    {
                      collection: "environmentalEvidence",
                      record: {
                        ...extracted("environment"),
                        versionId: evidenceVersion(data),
                        alternativeId: value(data, "alternative"),
                        baselineYear: value(data, "baseline")
                          ? Number(value(data, "baseline"))
                          : null,
                        metric: value(data, "metric"),
                        value: value(data, "metricValue"),
                        unit: optional(data, "unit"),
                        spatialScale: optional(data, "spatialScale"),
                        uncertainty: optional(data, "uncertainty"),
                        qualifications: value(data, "qualifications")
                          .split(/\r?\n/u)
                          .map((item) => item.trim())
                          .filter(Boolean),
                        ...evidence(data),
                      },
                    },
                  ]);
                })}
              >
                <Field
                  label="Alternative identifier"
                  name="alternative"
                  required
                />
                <Field label="Baseline year" name="baseline" type="number" />
                <Field label="Resource metric" name="metric" required />
                <Field
                  label="Exact metric value or range"
                  name="metricValue"
                  required
                />
                <Field label="Measurement unit" name="unit" />
                <Field
                  label="Spatial scale stated in source"
                  name="spatialScale"
                />
                <Field label="Uncertainty statement" name="uncertainty" area />
                <Field
                  label="Qualifications (one per line)"
                  name="qualifications"
                  area
                />
                <EvidenceFields passages={study.passages} />
              </Editor>
              <div class="sw-table-wrap">
                <table>
                  <caption>
                    Environmental evidence by source alternative
                  </caption>
                  <thead>
                    <tr>
                      {[
                        "Alternative",
                        "Baseline",
                        "Metric",
                        "Value and unit",
                        "Spatial scale",
                        "Uncertainty and qualifications",
                        "Version",
                      ].map((label) => (
                        <th key={label} scope="col">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {study.environmentalEvidence.map((item) => (
                      <tr key={item.id}>
                        {readable(item) ? (
                          <>
                            <td>{item.alternativeId}</td>
                            <td>{item.baselineYear ?? "Not stated"}</td>
                            <td>{item.metric}</td>
                            <td>
                              {item.value} {item.unit ?? "(unit not stated)"}
                            </td>
                            <td>{item.spatialScale ?? "Not stated"}</td>
                            <td>
                              {item.uncertainty ?? "Not stated"};{" "}
                              {item.qualifications.join("; ")}
                            </td>
                          </>
                        ) : (
                          <td colSpan={6}>{sourceStatement(item)}</td>
                        )}
                        <td>{item.versionId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Editor
                title="Document an authority or jurisdictional connection"
                submit="Save documented connection"
                disabled={disabled || !study.passages.length}
                onSubmit={edit(async (data) => {
                  const ref = (name: string) => {
                    const [kind, id] = value(data, name).split("|");
                    return {
                      kind,
                      id,
                    } as StudyAuthorityRelationship["subject"];
                  };
                  await update([
                    {
                      collection: "authorityRelationships",
                      record: {
                        ...extracted("authority"),
                        subject: ref("subject"),
                        object: ref("object"),
                        subjectLabel: value(data, "subjectLabel"),
                        objectLabel: value(data, "objectLabel"),
                        type: value(
                          data,
                          "type",
                        ) as StudyAuthorityRelationship["type"],
                        ...evidence(data),
                      },
                    },
                  ]);
                })}
              >
                {(["subject", "object"] as const).map((name) => (
                  <Choice
                    key={name}
                    label={
                      name === "subject"
                        ? "Connection subject"
                        : "Connection object"
                    }
                    name={name}
                    options={[
                      ...versions.map((item) => ({
                        id: `version|${item.id}`,
                        label: item.label,
                      })),
                      ...proceedingOptions.map((item) => ({
                        id: `proceeding|${item.id}`,
                        label: item.label,
                      })),
                      ...study.actors
                        .filter((item) => item.kind !== "analyst")
                        .map((item) => ({
                          id: `actor|${item.id}`,
                          label: item.label,
                        })),
                    ]}
                  />
                ))}
                <Field
                  label="Exact source label for subject"
                  name="subjectLabel"
                  required
                />
                <Field
                  label="Exact source label for object"
                  name="objectLabel"
                  required
                />
                <Choice
                  label="Source-stated connection type"
                  name="type"
                  options={choices([
                    "statutory_dependency",
                    "procedural_dependency",
                    "geographic_applicability",
                    "jurisdictional_relationship",
                    "homeland",
                  ])}
                />
                <EvidenceFields passages={study.passages} />
                <p>
                  Document an explicit source-stated connection. Proximity and
                  thematic similarity are not evidence of legal applicability.
                </p>
              </Editor>
              <div class="sw-table-wrap">
                <table>
                  <caption>Authority and dependency matrix</caption>
                  <thead>
                    <tr>
                      <th scope="col">Subject</th>
                      <th scope="col">Connection</th>
                      <th scope="col">Object</th>
                      <th scope="col">Source statement / review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {study.authorityRelationships.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {readable(item)
                            ? item.subjectLabel
                            : "Source wording withheld"}
                        </td>
                        <td>{words(item.type)}</td>
                        <td>
                          {readable(item)
                            ? item.objectLabel
                            : "Source wording withheld"}
                        </td>
                        <td>
                          {sourceStatement(item)} · {item.reviewState}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Editor
                title="Group publications with a common origin"
                submit="Save origin group"
                disabled={disabled || !study.passages.length}
                onSubmit={edit(async (data) => {
                  await update([
                    {
                      collection: "originGroups",
                      record: {
                        ...extracted("origin"),
                        versionIds: values(data, "versions"),
                        originVersionId: optional(data, "originVersion"),
                        basis: value(
                          data,
                          "basis",
                        ) as StudyCatalogs["originGroups"][number]["basis"],
                        ...evidence(data),
                      },
                    },
                  ]);
                })}
              >
                <Choice
                  label="Publications sharing an origin"
                  name="versions"
                  multiple
                  options={versions}
                />
                <Choice
                  label="Originating document version"
                  name="originVersion"
                  optional
                  options={versions}
                />
                <Choice
                  label="Documented common-origin basis"
                  name="basis"
                  options={choices([
                    "same_document",
                    "documented_republication",
                    "common_origin",
                  ])}
                />
                <EvidenceFields passages={study.passages} />
              </Editor>
              <ul>
                {study.originGroups.map((group) => (
                  <li key={group.id}>
                    {group.versionIds.length} publications ·{" "}
                    {words(group.basis)} · {group.reviewState}. One documented
                    origin, not independent corroboration.
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="sw-review">
            <h3 id="sw-review">Review and private annotations</h3>
            <Editor
              title="Review a study item"
              submit="Record review"
              disabled={disabled || !targets.length}
              onSubmit={edit(async (data) => {
                const target = targets.find(
                  (item) => item.record.id === value(data, "targetId"),
                );
                if (!target) throw new Error("Choose a study item to review.");
                const decision = value(data, "decision") as Exclude<
                  StudyReviewState,
                  "unreviewed"
                >;
                await update([
                  {
                    collection: target.collection,
                    record: { ...target.record, reviewState: decision },
                  } as StudyChange,
                  {
                    collection: "reviews",
                    record: {
                      id: identifier("review"),
                      actorId: actor,
                      createdAt: timestamp(),
                      provenance: "analyst_authored",
                      sensitivity,
                      targetId: target.record.id,
                      decision,
                      notes: value(data, "notes"),
                    },
                  },
                ]);
              })}
            >
              <Choice
                label="Item to review"
                name="targetId"
                options={targetOptions}
              />
              <Choice
                label="Review decision"
                name="decision"
                options={choices(["accepted", "challenged", "rejected"])}
              />
              <Field label="Review rationale" name="notes" area required />
            </Editor>
            <Editor
              title="Add a private analyst note"
              submit="Save private note"
              disabled={disabled || !targets.length}
              onSubmit={edit(async (data) => {
                await update([
                  {
                    collection: "annotations",
                    record: {
                      ...metadata("annotation", "restricted"),
                      targetId: value(data, "targetId"),
                      text: value(data, "text"),
                    },
                  },
                ]);
              })}
            >
              <Choice
                label="Note target"
                name="targetId"
                options={targetOptions}
              />
              <Field label="Private analyst note" name="text" area required />
              <p>
                Always restricted. This note is separate from source evidence
                and excluded from public products.
              </p>
            </Editor>
            <ul>
              {study.annotations.map((note) => (
                <li key={note.id}>
                  <strong>Private note:</strong> {note.text}
                </li>
              ))}
            </ul>
            <details>
              <summary>Review history ({study.reviews.length})</summary>
              <ul>
                {study.reviews.map((review) => (
                  <li key={review.id}>
                    {review.createdAt} ·{" "}
                    {
                      study.actors.find((item) => item.id === review.actorId)
                        ?.label
                    }{" "}
                    · {review.decision}: {review.notes}
                  </li>
                ))}
              </ul>
            </details>
          </section>
          <section aria-labelledby="sw-products">
            <h3 id="sw-products">Attributed knowledge products</h3>
            <label>
              Export audience
              <select
                value={audience}
                disabled={busy}
                onChange={(event) => {
                  setAudience(event.currentTarget.value as "local" | "public");
                  setProducts(null);
                }}
              >
                <option value="local">Local analyst use</option>
                <option value="public">Public, privacy-filtered</option>
              </select>
            </label>
            <p>
              {audience === "local"
                ? "Local products may include private analyst material, within source export permissions."
                : "Public products exclude private notes, restricted material, and source content whose permissions prohibit redistribution. This only downloads files; it does not publish them."}
            </p>
            <button
              type="button"
              disabled={busy || !bound}
              onClick={() =>
                void run(async () => {
                  setProducts(
                    await buildStudyProducts(study, corpus, { audience }),
                  );
                  setMessage(
                    `${audience === "public" ? "Public-filtered" : "Local"} products prepared for explicit download.`,
                  );
                })
              }
            >
              Prepare knowledge products
            </button>
            {products && (
              <div class="sw-products">
                <p>
                  {products.evidence.length} evidence rows ·{" "}
                  {products.graph.nodes.length} attributed graph nodes ·{" "}
                  {products.gapRegister.length} gaps
                </p>
                {products.limitations.map((item) => (
                  <p key={item}>{item}</p>
                ))}
                {(
                  [
                    [
                      "Research dossier",
                      "dossier.html",
                      products.dossierHtml,
                      "text/html",
                    ],
                    [
                      "Evidence table",
                      "evidence.csv",
                      products.evidenceCsv,
                      "text/csv",
                    ],
                    [
                      "Procedural timeline",
                      "timeline.csv",
                      products.timelineCsv,
                      "text/csv",
                    ],
                    [
                      "Authority matrix",
                      "authority.csv",
                      products.authorityCsv,
                      "text/csv",
                    ],
                    [
                      "Unresolved gap register",
                      "gaps.csv",
                      products.gapsCsv,
                      "text/csv",
                    ],
                    [
                      "Attributed knowledge graph",
                      "graph.json",
                      JSON.stringify(products.graph, null, 2),
                      "application/json",
                    ],
                    [
                      "Machine-readable provenance",
                      "provenance.json",
                      JSON.stringify(products.provenance, null, 2),
                      "application/json",
                    ],
                  ] as const
                ).map(([label, filename, text, type]) => (
                  <button
                    type="button"
                    key={filename}
                    onClick={() =>
                      download(
                        `${study.id}-${audience}-${filename}`,
                        text,
                        type,
                      )
                    }
                  >
                    Download {label.toLowerCase()}
                  </button>
                ))}
              </div>
            )}
          </section>
          <details>
            <summary>Study revisions and corpus binding</summary>
            <p>
              Corpus {study.corpusId} · SHA-256 {study.corpusDigest}
            </p>
            <p>Study SHA-256 {study.contentDigest}</p>
            <ul>
              {study.revisions.map((revision) => (
                <li key={revision.revision}>
                  Revision {revision.revision} · {revision.updatedAt}{" "}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(async () =>
                        setHistorical(
                          await readResearchStudyRevision(
                            study,
                            revision.revision,
                          ),
                        ),
                      )
                    }
                  >
                    Inspect revision {revision.revision}
                  </button>
                </li>
              ))}
            </ul>
            {historical && (
              <p>
                Historical revision {historical.revision}:{" "}
                {historical.questions.length} questions,{" "}
                {historical.passages.length} passages,{" "}
                {historical.assertions.length} assertions. The current study
                remains revision {study.revision}.
              </p>
            )}
          </details>
        </>
      )}
    </section>
  );
}
