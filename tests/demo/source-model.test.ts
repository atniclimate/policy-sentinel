// @vitest-environment node
// The Sources panel model (design T1.6, safeguard 8): nothing is called live,
// verification is stated only from the release record, a failed search says
// so, and a missing or stale index file is never shown as current or empty.
import { describe, expect, it } from "vitest";
import { COPY } from "../../src/demo/copy";
import { sourceModel as S } from "../../src/demo/copy/sources";
import type { LaneSearch } from "../../src/demo/discovery";
import type { IndexFile, IndexManifest } from "../../src/demo/index-types";
import { VERBATIM_FIELDS } from "../../src/demo/index-types";
import {
  LINK_OUT_URLS,
  RELEASE_VERIFICATION,
  searchOutcomes,
  sourceRows,
} from "../../src/demo/source-model";
import { sources } from "./frontend-fixtures";

const NOW = new Date("2099-03-01T12:00:00Z");

function cfrFile(overrides: Partial<IndexFile> = {}): IndexFile {
  return {
    path: "cfr/title-99.json",
    kind: "cfr-authority-shard",
    status: "current",
    sha256: "a".repeat(64),
    sizeBytes: 100,
    entryCount: 2,
    source: {
      id: "govinfo-cfr-annual",
      name: "Example annual edition",
      urlTemplate: "https://www.govinfo.gov/example/{title}",
      linkTemplate: "https://www.ecfr.gov/current/title-{title}/part-{part}",
      requestCount: 1,
      retrievedAt: "2099-02-20T10:00:00-08:00",
      rights: {
        statementText: "none stated",
        url: "https://www.govinfo.gov/example",
        readOn: "2099-01-01",
        readByRole: "owner",
      },
      editionYear: 2098,
      revisedAsOfText: "Revised as of July 1, 2098",
      volumes: null,
    },
    patternSetVersion: "1.0.0",
    lastRefreshAttemptAt: null,
    failureStage: null,
    message: null,
    withdrawnOn: null,
    staleAcknowledgedOn: null,
    currentReference: null,
    ...overrides,
  };
}

function manifest(files: IndexFile[]): IndexManifest {
  return {
    $schema: "./manifest.schema.json",
    schemaVersion: "1.0.0",
    artifactType: "demo-index-manifest",
    generatedAt: "2099-02-20T10:00:00-08:00",
    generatedBy: { script: "scripts/acquire-demo-index.mjs", version: "1.0.0" },
    approvalRef: "D-000",
    verbatimFields: [...VERBATIM_FIELDS],
    files,
  };
}

const row = (rows: ReturnType<typeof sourceRows>, id: string) => {
  const found = rows.find((each) => each.id === id);
  if (!found) throw new Error(`No row ${id}`);
  return found;
};

describe("release verification record", () => {
  it("starts with every source unverified, for the main session to fill at release", () => {
    expect(Object.keys(RELEASE_VERIFICATION).length).toBeGreaterThan(8);
    for (const value of Object.values(RELEASE_VERIFICATION))
      expect(value).toBeNull();
  });
});

describe("source rows", () => {
  it("never calls an enabled source live and says it is not yet verified", () => {
    const rows = sourceRows({ sources, manifest: null, now: NOW });
    const fr = row(rows, "federal-register");
    expect(fr.state).toBe("enabled");
    expect(fr.model.enabled).toBe(true);
    expect(fr.model.verifiedAt).toBeNull();
    expect(fr.stateText).toBe(S.enabledUnverified);
    expect(fr.stateText).toMatch(/not yet verified for this release/);
    for (const each of rows) expect(each.stateText).not.toMatch(/\blive\b/i);
  });

  it("states the release date only from the verification record", () => {
    const rows = sourceRows({
      sources,
      manifest: null,
      now: NOW,
      verification: { "federal-register": "2099-02-28" },
    });
    expect(row(rows, "federal-register").stateText).toBe(
      S.enabledVerified("2099-02-28"),
    );
    expect(row(rows, "federal-register").model.verifiedAt).toBe("2099-02-28");
    expect(row(rows, "govinfo").model.verifiedAt).toBeNull();
  });

  it("keeps a source the Worker cannot ask apart from an enabled one, with its note as the limit", () => {
    const rows = sourceRows({ sources, manifest: null, now: NOW });
    const oregon = row(rows, "oregon");
    expect(oregon.state).toBe("not_available");
    expect(oregon.model.enabled).toBe(false);
    expect(oregon.stateText).toBe(S.notAvailable);
    expect(oregon.model.coverageLimit).toBe("Synthetic gap: not enabled.");
    const unknown = sourceRows({
      sources: [{ ...sources[0], status: "unknown" }],
      manifest: null,
      now: NOW,
    });
    expect(row(unknown, "federal-register").stateText).toBe(S.notChecked);
  });

  it("states this search's outcome on an enabled source", () => {
    const rows = sourceRows({
      sources,
      manifest: null,
      now: NOW,
      outcomes: { "federal-register": "rate_limited", govinfo: "unavailable" },
    });
    expect(row(rows, "federal-register").model.queryOutcome).toBe(
      "rate_limited",
    );
    expect(row(rows, "federal-register").outcomeText).toBe(
      S.outcome.rate_limited,
    );
    expect(row(rows, "govinfo").outcomeText).toBe(S.outcome.unavailable);
    expect(row(rows, "congress").model.queryOutcome).toBe("not_run");
    expect(row(rows, "congress").outcomeText).toBeNull();
  });

  it("lists link-out and not-covered sources with their limits and never as enabled", () => {
    const rows = sourceRows({ sources, manifest: null, now: NOW });
    for (const id of ["ecfr", "ibia", "nill"]) {
      const each = row(rows, id);
      expect(each.state).toBe("link_out");
      expect(each.model.linkOutOnly).toBe(true);
      expect(each.model.enabled).toBe(false);
      expect(each.stateText).toBe(S.linkOutOnly);
      expect(each.url).toBe(LINK_OUT_URLS[id] ?? null);
    }
    const cases = row(rows, "cases-citing-law");
    expect(cases.state).toBe("not_covered");
    expect(cases.model.notCovered).toBe(true);
    expect(cases.model.coverageLimit).toBe(
      "Not available from an official source.",
    );
  });

  it("marks an index unavailable, never empty, when the manifest or its files are missing", () => {
    const none = row(
      sourceRows({ sources, manifest: null, now: NOW }),
      "cfr-index",
    );
    expect(none.state).toBe("not_available");
    expect(none.model.coverageLimit).toBe(S.indexMissing);
    const failed = row(
      sourceRows({
        sources,
        manifest: manifest([
          cfrFile({
            status: "unavailable",
            sha256: null,
            sizeBytes: null,
            source: null,
          }),
        ]),
        now: NOW,
      }),
      "cfr-index",
    );
    expect(failed.state).toBe("not_available");
  });

  it("gives a current index its retrieval day and the source's own as-of wording", () => {
    const cfr = row(
      sourceRows({ sources, manifest: manifest([cfrFile()]), now: NOW }),
      "cfr-index",
    );
    expect(cfr.state).toBe("enabled");
    expect(cfr.model.coverageLimit).toBe(S.indexCoverage(1));
    expect(cfr.model.freshnessPolicy).toBe(
      S.indexFreshness("2099-02-20", "Revised as of July 1, 2098"),
    );
    expect(cfr.model.freshnessPolicy).not.toMatch(/Stale/);
  });

  it("labels a retained file stale with its original as-of, and an old snapshot as old", () => {
    const retained = row(
      sourceRows({
        sources,
        manifest: manifest([
          cfrFile({
            status: "retained_after_failed_refresh",
            lastRefreshAttemptAt: "2099-02-28T10:00:00Z",
            failureStage: "fetch",
          }),
        ]),
        now: NOW,
      }),
      "cfr-index",
    );
    expect(retained.state).toBe("enabled");
    expect(retained.model.freshnessPolicy).toContain(S.indexStale);
    expect(retained.model.freshnessPolicy).toContain(
      "Revised as of July 1, 2098",
    );
    const old = row(
      sourceRows({
        sources,
        manifest: manifest([cfrFile()]),
        now: new Date("2099-09-30T12:00:00Z"),
      }),
      "cfr-index",
    );
    expect(old.model.freshnessPolicy).toContain(S.indexOld);
  });

  it("counts a withdrawn file as no coverage", () => {
    const rows = sourceRows({
      sources,
      manifest: manifest([
        cfrFile({ status: "withdrawn", withdrawnOn: "2099-02-25" }),
        cfrFile({ path: "cfr/title-98.json" }),
      ]),
      now: NOW,
    });
    expect(row(rows, "cfr-index").model.coverageLimit).toBe(S.indexCoverage(1));
    expect(row(rows, "usc-index").state).toBe("not_available");
  });
});

describe("search outcomes", () => {
  const lane = (
    sourceId: string,
    state: LaneSearch["state"],
    reason?: string,
  ): LaneSearch => ({
    laneId: `${sourceId}-${state}`,
    sourceId,
    state,
    listings: [],
    cursors: [],
    ...(reason && { reason }),
  });

  it("keeps the worst outcome per source and ignores lanes still loading or not searched", () => {
    expect(
      searchOutcomes([
        lane("federal-register", "results"),
        lane("federal-register", "unavailable", "Offline."),
        lane("govinfo", "empty"),
        lane("regulations", "unavailable", COPY.rateLimited),
        lane("regulations", "unavailable", "Offline."),
        lane("congress", "loading"),
        lane("grants", "not_searched"),
      ]),
    ).toEqual({
      "federal-register": "unavailable",
      govinfo: "ok",
      regulations: "rate_limited",
    });
  });
});
