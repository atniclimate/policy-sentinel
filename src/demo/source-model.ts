/**
 * The Sources panel model (design T1.6, safeguard 8). One row per source the
 * page names: the Worker's /api/sources answer, the static index manifest,
 * the link-out sources and the named gaps. Nothing is called live; a source
 * is "verified" only when RELEASE_VERIFICATION records its release check.
 */
import { COPY } from "./copy.ts";
import { sourceModel as S } from "./copy/sources.ts";
import { LINK_OUTS } from "./courts.ts";
import type { LaneSearch } from "./discovery.ts";
import type { IndexFile, IndexFileKind, IndexManifest } from "./index-types.ts";
import type {
  DemoSource,
  DemoSourceId,
  DemoSourceModel,
  PlannedSourceId,
} from "./types.ts";

export type QueryOutcome = DemoSourceModel["queryOutcome"];

/**
 * The release verification receipt date per source (YYYY-MM-DD), or null.
 * The main session fills this at release preparation, from the receipts.
 */
export const RELEASE_VERIFICATION: Readonly<
  Record<DemoSourceId | PlannedSourceId, string | null>
> = Object.freeze({
  "federal-register": null,
  govinfo: null,
  congress: null,
  regulations: null,
  grants: null,
  washington: null,
  oregon: null,
  idaho: null,
  "govinfo-courts": null,
  "cfr-index": null,
  "usc-index": null,
  ecfr: null,
  ibia: null,
  nill: null,
  "supreme-court": null,
  "loc-statutes": null,
  "committee-libraries": null,
});

const courtLinkOut = (id: "ibia" | "nill") =>
  LINK_OUTS.find((item) => item.id === id)?.url ?? null;

/** Link-out targets; IBIA and NILL as the courts step recorded them (src/demo/courts.ts). */
export const LINK_OUT_URLS: Readonly<Record<string, string | null>> =
  Object.freeze({
    ecfr: "https://www.ecfr.gov/",
    ibia: courtLinkOut("ibia"),
    nill: courtLinkOut("nill"),
  });

const INDEX_KINDS: Readonly<Record<string, IndexFileKind>> = {
  "cfr-index": "cfr-authority-shard",
  "usc-index": "usc-source-credit-shard",
};

/** Condition C3: a file retrieved more than this many days ago reads as old. */
const OLD_AFTER_DAYS = 180;

export interface SourceRow {
  readonly id: string;
  readonly label: string;
  readonly state: "enabled" | "not_available" | "link_out" | "not_covered";
  readonly model: DemoSourceModel;
  /** The source's state in one line; never "live". */
  readonly stateText: string;
  /** This search's outcome, worded; null before the source is asked. */
  readonly outcomeText: string | null;
  /** The official page a link-out row opens, when known. */
  readonly url: string | null;
}

export interface SourceModelInput {
  /** The Worker's /api/sources answer (or the page's fallback catalog). */
  readonly sources: readonly DemoSource[];
  /** docs/demo-data/manifest.json, or null when it is not loaded. */
  readonly manifest: IndexManifest | null;
  readonly now: Date;
  /** Defaults to RELEASE_VERIFICATION. */
  readonly verification?: Readonly<Record<string, string | null>>;
  /** This search's outcome per source id, from searchOutcomes. */
  readonly outcomes?: Readonly<Record<string, QueryOutcome>>;
}

const model = (patch: Partial<DemoSourceModel>): DemoSourceModel => ({
  enabled: false,
  verifiedAt: null,
  queryOutcome: "not_run",
  coverageLimit: "",
  freshnessPolicy: "",
  linkOutOnly: false,
  notCovered: false,
  ...patch,
});

function enabledText(verifiedAt: string | null): string {
  return verifiedAt ? S.enabledVerified(verifiedAt) : S.enabledUnverified;
}

function outcomeText(outcome: QueryOutcome): string | null {
  return outcome === "not_run" ? null : S.outcome[outcome];
}

function workerRow(
  source: DemoSource,
  input: SourceModelInput,
  verification: Readonly<Record<string, string | null>>,
): SourceRow {
  const enabled = source.status === "live";
  const verifiedAt = verification[source.id] ?? null;
  const queryOutcome = enabled
    ? (input.outcomes?.[source.id] ?? "not_run")
    : "not_run";
  return {
    id: source.id,
    label: source.label,
    state: enabled ? "enabled" : "not_available",
    model: model({
      enabled,
      verifiedAt,
      queryOutcome,
      coverageLimit: source.note,
      freshnessPolicy: S.workerFreshness,
    }),
    stateText: enabled
      ? enabledText(verifiedAt)
      : source.status === "key_pending"
        ? S.keyPending
        : source.status === "unknown"
          ? S.notChecked
          : S.notAvailable,
    outcomeText: outcomeText(queryOutcome),
    url: null,
  };
}

function asOfText(file: IndexFile): string | null {
  const source = file.source;
  if (!source) return null;
  if (source.id === "govinfo-cfr-annual") return source.revisedAsOfText;
  if (source.id === "olrc-uslm") return source.currentThroughText;
  return null;
}

function indexRow(
  id: string,
  input: SourceModelInput,
  verification: Readonly<Record<string, string | null>>,
): SourceRow {
  // Only a current or retained file has content; withdrawn and unavailable cover nothing.
  const files = (input.manifest?.files ?? []).filter(
    (file) =>
      file.kind === INDEX_KINDS[id] &&
      file.source &&
      (file.status === "current" ||
        file.status === "retained_after_failed_refresh"),
  );
  const label = S.index[id];
  if (files.length === 0)
    return {
      id,
      label,
      state: "not_available",
      model: model({
        coverageLimit: S.indexMissing,
        freshnessPolicy: S.indexMissing,
      }),
      stateText: S.notAvailable,
      outcomeText: null,
      url: null,
    };
  const retrieved = files
    .map((file) => file.source!.retrievedAt)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
  const asOf = [
    ...new Set(files.map(asOfText).filter((text) => text !== null)),
  ].join("; ");
  const old =
    input.now.getTime() - Date.parse(retrieved) >
    OLD_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const freshness = [
    // The day as the retrieval timestamp states it, in its own offset.
    S.indexFreshness(retrieved.slice(0, 10), asOf || S.indexAsOfNotStated),
    files.some((file) => file.status === "retained_after_failed_refresh") &&
      S.indexStale,
    old && S.indexOld,
  ]
    .filter(Boolean)
    .join(" ");
  const verifiedAt = verification[id] ?? null;
  return {
    id,
    label,
    state: "enabled",
    model: model({
      enabled: true,
      verifiedAt,
      coverageLimit: S.indexCoverage(files.length),
      freshnessPolicy: freshness,
    }),
    stateText: enabledText(verifiedAt),
    outcomeText: null,
    url: null,
  };
}

/** Every source the page names, in panel order: Worker sources, indexes, link-outs, gaps. */
export function sourceRows(input: SourceModelInput): SourceRow[] {
  const verification = input.verification ?? RELEASE_VERIFICATION;
  return [
    ...input.sources.map((source) => workerRow(source, input, verification)),
    ...Object.keys(INDEX_KINDS).map((id) => indexRow(id, input, verification)),
    ...Object.entries(S.linkOut).map(([id, { label, limit }]): SourceRow => ({
      id,
      label,
      state: "link_out",
      model: model({
        linkOutOnly: true,
        coverageLimit: limit,
        freshnessPolicy: S.linkOutFreshness,
      }),
      stateText: S.linkOutOnly,
      outcomeText: null,
      url: LINK_OUT_URLS[id] ?? null,
    })),
    ...S.notCoveredList.map(({ id, label, limit }): SourceRow => ({
      id,
      label,
      state: "not_covered",
      model: model({
        notCovered: true,
        coverageLimit: limit,
        freshnessPolicy: S.notCoveredFreshness,
      }),
      stateText: S.notCovered,
      outcomeText: null,
      url: null,
    })),
  ];
}

const RANK: Readonly<Record<QueryOutcome, number>> = {
  not_run: 0,
  ok: 1,
  unavailable: 2,
  rate_limited: 3,
};

/**
 * This search's outcome per source, the worst of its lanes. Lanes still
 * loading or not searched say nothing yet.
 * shortcut: a rate limit is read from the page's own failure words (COPY.rateLimited); carry ApiFailure.kind on LaneSearch if that wording ever varies.
 */
export function searchOutcomes(
  searches: readonly LaneSearch[],
): Record<string, QueryOutcome> {
  const outcomes: Record<string, QueryOutcome> = {};
  for (const search of searches) {
    const outcome: QueryOutcome =
      search.state === "results" || search.state === "empty"
        ? "ok"
        : search.state === "unavailable"
          ? search.reason === COPY.rateLimited
            ? "rate_limited"
            : "unavailable"
          : "not_run";
    if (outcome === "not_run") continue;
    const current = outcomes[search.sourceId] ?? "not_run";
    if (RANK[outcome] > RANK[current]) outcomes[search.sourceId] = outcome;
  }
  return outcomes;
}
