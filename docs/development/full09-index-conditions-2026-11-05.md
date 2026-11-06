# Full 0.9 static index files: approved conditions and types

Owner approval: D-125 (2026-11-05), on the conditions below with these owner
adjustments, which override the text where they differ:

1. **CFR source.** The authority chain uses the official CFR annual edition from
   GovInfo (API with the current api.data.gov key at build time until the
   program-account move under D-123, or GovInfo bulk data where it serves the
   same edition). eCFR is current reference and greater context: one request
   per title when used, never per part, its "up to date as of" wording shown,
   and only after its terms are read (N17). Where this document says eCFR is the
   chain source, read the GovInfo annual edition.
2. **Staleness.** The build-failing staleness rule (condition C) takes effect on
   2027-01-01, after the first complete build. Until then a stale file is shown
   as stale, never as current, and does not fail the build.
3. **Refresh triggers.** `scripts/check-index-freshness.mjs` compares the
   manifest's pinned points with each source (U.S. Code release point, new
   public laws, executive orders and other presidential documents, new CFR
   annual editions and eCFR amendment dates, a new Congress or session) and
   prints a refresh-recommended list. It runs at the start of each working
   session and in release preparation, and changes nothing. A refresh is a
   branch, a pull request and the owner's merge (condition I).

Source: an independent review of the proposed conditions, 2026-11-05. Section
numbers below are the review's.

## 0. Facts the conditions rest on

Measured here (not estimated):

- eCFR part XML: `AUTH/HED` + `AUTH/PSPACE`, `SOURCE/HED` + `SOURCE/PSPACE` sit
  once at part level (`DIV5 TYPE="PART"`), free text, no href. Part 900 AUTH is
  `25 U.S.C. 450f et seq.` (the pre-2016 section number), SOURCE is
  `61 FR 32501, June 24, 1996, unless otherwise noted.` Raw part files are
  282 KB and 648 KB; the two lines together are under 200 bytes per part.
  The `hierarchy_metadata` attribute is double-encoded JSON and must not be
  relied on; `@N` and `@TYPE` carry the part identity.
- OLRC USLM title 25 (zip 1,486,947 B, XML 10,501,729 B): 2,399 sections with
  an identifier; 1,183 carry `<sourceCredit id="...">` (the element has an
  `id` attribute); 1,216 have none (stubs). Source-credit text without markup
  totals 146,446 B; 4,246 `<ref>` in source credits (`/us/stat` 1,973,
  `/us/pl` 1,887, `/us/act` 386); 1,601 `<date date="...">`. Section
  `@status` values: omitted 909, repealed 162, transferred 144, reserved 1.
  All 144 transferred sections carry a `note topic="codification"` with at
  least one `/us/usc/...` ref; 4 carry two targets (`s458bbb` to `s458ddd` and
  `s5421`); 6 point to another title (`s421` to `/us/usc/t43/s179`); 138 use
  the wording "editorially reclassified as" or "renumbered". `s450f` exists as
  a transferred stub, so the 25 CFR 900 chain (450f to 5321) can be walked.
  Identifiers can contain U+2013 (`/us/usc/t25/s458bbb` followed by an en dash and `1`). The `<meta>`
  carries `docPublicationName` = `Online@119-136`, `dcterms:created` =
  `2026-05-06T11:43:48` (the converter run, not the law date), and the title
  note `Current through 119-136`.
- Repo conventions: manifests use camelCase keys (`sha256`, `sizeBytes`,
  `dataAsOf`, `generatedAt`, `artifactType`, `schemaVersion`); schema `$id` is
  `https://policy-sentinel.invalid/schemas/<name>.schema.v<N>.json`, draft
  2020-12, `additionalProperties: false`, Ajv strict; `source-health` carries
  `status`, `dataAsOf`, `lastSuccessfulRetrievalAt`, `usingLastKnownGood`,
  `stale`, `failureStage`, `message` (sanitized, no URLs, 240 chars).
- Existing validators do not cover this output. `scripts/validate-artifact.mjs`
  validates `dist/data` (the synthetic engine artifact) and never looks at
  `docs/`. `scripts/finish-demo-build.mjs` `scanDemoOutput` visits only
  `docs/index.html` and `docs/demo-assets/` and throws
  `unexpected asset type` on any `.json` there (tested in
  `tests/demo/build.test.ts`). `npm run check` runs `build` (synthetic) and
  never runs `demo:build`.
- Pages serves `main:/docs`, so a commit to `main` is the deployment.

Estimated (state as estimates in the decision row): part counts per CFR title
(25 about 300, 36 about 300, 40 about 1,100, 43 about 400, 50 about 700);
title 42 USLM size (not downloaded; the largest title, expected several times
title 25).

## 1. Conditions (each testable; "Test:" means a script, "Review:" a person)

### A. Paths and build separation

1. Output lives only at `docs/demo-data/` (new) with `manifest.json`,
   `vocab/*.json`, `cfr/title-NN.json`, `usc/title-NN.json` and, when a title is
   chapter-sharded, `usc/title-NN-ch-<chapter>.json`. Nothing else under
   `docs/demo-data/`; no `.json` under `docs/demo-assets/` (keep the existing
   refusal). Test: `scanDemoOutput` inventories `docs/demo-data/` and fails on
   any file not listed in the manifest, any non-`.json`, any symlink, any
   nested directory other than `vocab/`, `cfr/`, `usc/`.
2. `config/law-aliases.v1.json` stays curated config in `config/`, imported
   into the bundle at `demo:build` (the `src/demo/ncai-2026.ts` precedent), not
   fetched. It is covered by conditions F, G, H and I but not by the manifest.
   Test: schema validation in a unit test; the Nation-name probe (G3).
3. One acquisition script, `scripts/acquire-demo-index.mjs` (subcommands
   `ecfr`, `uslm`, `vocab`), is the only code that fetches `ecfr.gov`,
   `uscode.house.gov` or `federalregister.gov` for this output. No npm script
   under `build`, `check`, `demo:build` or `test` invokes it. Test: a unit test
   reads `package.json` and asserts the script name is absent from those four
   commands; `scan:source` asserts no file under `demo/`, `src/demo/` or
   `worker/` imports it.
4. `demo:build` and `npm run build` read `docs/demo-data/manifest.json` at most
   and make no network call. Test: `finish-demo-build` scan runs on a fixture
   directory with no network (the existing test harness).
5. The acquisition script takes a pinned input and refuses "current": `ecfr`
   requires `--date YYYY-MM-DD` and requests
   `/api/versioner/v1/full/<date>/title-<N>.xml?part=<P>`; `uslm` requires
   `--release-point 119-136` and requests the exact zip URL. Test: unit test on
   argument parsing; the manifest records the pinned values (B2).
6. Downloaded bytes are hashed, parsed, then deleted. No raw XML, zip, HTML or
   JSON response is written inside the repository; working files go to
   the session scratch folder outside the repository. Test: `scan:source` fails on
   any tracked `.xml`, `.zip`, `.html` or `.txt` under `docs/demo-data/`
   (`raw-data/` and `cached-responses/` are already forbidden prefixes).

### B. Provenance per file (in the manifest, not in the shard)

1. Every manifest file entry carries `source.id` (closed: `ecfr`, `olrc-uslm`,
   `federal-register-api`), `source.name`, `source.urlTemplate` (exact URL or
   template with `{date}`, `{title}`, `{part}`), `source.requestCount`.
2. Data-as-of fields: `ecfr` entries carry `pointInTimeDate` (the requested
   date); `olrc-uslm` entries carry `releasePoint` (`119-136`) plus the
   source's own words verbatim, `publicationName` (`Online@119-136`) and
   `currentThroughText` (`Current through 119-136`); vocabulary entries carry
   `retrievedAt` only, because the FR API and eCFR titles list publish no
   as-of (if eCFR `titles.json` exposes `up_to_date_as_of`, carry it; this is
   unverified here and needs one bounded call).
3. `retrievedAt` is the completion time of the file's last request, ISO 8601
   with offset. It lives only in the manifest so shards stay reproducible (H3).
4. For single-file downloads (OLRC zip) the manifest records `upstreamSha256`
   and `upstreamBytes` of the raw download, so a later run against the same
   release point can show whether OLRC changed the file.
5. `source.rights` carries `statementText` verbatim from the page the owner
   read under N17, or the exact string `none stated`; `url` of that page;
   `readOn` (date); `readByRole` = `owner`. Never a person's name (design rule
   7). Test: schema requires the four fields; Review: the owner confirms the
   text matches what the page showed.
6. `patternSetVersion` names the version of the citation pattern table
   (`src/demo/citation-patterns.ts` per design rule 3) used for the file. Test:
   every `pattern.version` inside the shard equals it (K4).

### C. Data-as-of versus retrieval; what the page shows

1. The page never says "current". Every chain hop drawn from a shard shows, in
   this order: the source name, the source's own as-of wording (`eCFR as of
   2026-11-03`; `U.S. Code release point 119-136`, with `Current through
   119-136` quoted), the retrieval date, and a link to the live source. Test:
   frontend test on the rendered hop for a CFR and a U.S.C. fixture; the
   design rule 2 forbidden-word test applies to these labels.
2. Retrieval time and as-of are shown as two facts with two labels (`as of` /
   `release point` and `retrieved`), never merged. Test: same frontend test.
3. Stale threshold: `demo:build` fails when any manifest file has `retrievedAt`
   older than 180 days unless that entry carries `staleAcknowledgedOn`, set
   only on the owner's word for that build. The page adds "snapshot older than
   six months; check the source" to hops from such a file. Judgment call; the
   owner may change the number. Test: scan with a fixture manifest dated
   200 days back fails; with `staleAcknowledgedOn` passes and the label test
   sees the extra sentence.

### D. Failure and last-known-good

1. Acquisition is all-or-nothing per file. A shard is written only when every
   part or section in its named scope was fetched, parsed and validated; a
   CFR shard must satisfy `partsExpected == entries.length + partsReserved`
   where `partsExpected` comes from the source's own structure listing for the
   same date. Otherwise the previously committed shard stays byte-identical.
   Test: validator asserts the count identity; unit test on the script's
   write path with a failing part fixture leaves the old file untouched.
2. A failed refresh is recorded in the manifest only: `status` becomes
   `retained_after_failed_refresh`, `lastRefreshAttemptAt` is set,
   `failureStage` is one of `fetch`, `normalize`, `validation`, `packaging`
   (the existing `source-health` vocabulary), `message` is sanitized as
   `sanitizePublicMessage` does (no URLs, at most 240 characters). The file's
   `sha256`, `sizeBytes`, `source.retrievedAt` and as-of fields are unchanged.
   Test: schema; validator asserts the retained file's hash still matches.
3. When no prior file exists, no file is written and the entry has
   `status: unavailable` with `sha256`, `sizeBytes`, `source` null. The page
   shows "not yet available" for that hop with the live link. Never an empty
   list. Test: frontend fixture for each of `current`,
   `retained_after_failed_refresh`, `unavailable`, `withdrawn`.
4. At run time the page hashes each fetched shard with
   `src/engine/pure-sha256.mjs` against the manifest bundled at `demo:build`;
   a mismatch or a fetch failure shows "index unavailable" with the live link.
   Test: frontend test feeds a tampered shard.

### E. Size caps (raw bytes are the hard, deterministic cap; gzip is a check)

Raw bytes are what git stores and what the validator can test exactly. Gzip
sizes vary by a few bytes between zlib versions, so they are a second check
with the design's number, not the primary cap.

1. `manifest.json` at most 64 KiB.
2. Each `vocab/*.json` at most 512 KiB raw; all vocabulary files together at
   most 1 MiB raw and 400 KB gzipped (design line 165). Expected: FR agencies
   under 100 KB, topics under 300 KB, CFR title names under 10 KB.
3. `config/law-aliases.v1.json` at most 128 KiB and 400 entries (design: about
   150).
4. Each CFR authority shard at most 1.5 MiB raw and 400 KB gzipped. Estimate at
   about 700 bytes per part (two verbatim lines, three parsed citations,
   basis and pattern): titles 25, 36, 43, 50 between 200 and 500 KB each;
   title 40 about 0.8 MiB (part count estimated, not measured).
5. Each U.S.C. source-credit shard at most 1.5 MiB raw and 400 KB gzipped.
   Title 25 estimate from measured components: 146 KB credit text, 4,246 refs
   at about 100 bytes, 1,601 dates, 2,399 entries of header overhead, 144
   reclassification notes: about 0.8 to 1.0 MiB raw, roughly 200 KB gzipped.
   Title 42 is unmeasured and expected to exceed the cap: it enters only as
   named chapters the owner lists, one shard per chapter or chapter group,
   each under the same cap, with `chapters` recorded in the shard and the
   manifest and stated on the page ("Title 42: chapters 55, 85, 103 only").
6. `docs/demo-data/` in total at most 12 MiB raw and 2.5 MB gzipped (expected
   5 to 7 MiB with titles 25, 36, 40, 43, 50 and U.S.C. 16, 25, 33 and the
   chosen 42 chapters). Test: validator sums `sizeBytes`; warns above 8 MiB,
   fails above 12 MiB.
7. Field caps in the schema: `authorityText` 4,000, `sourceText` 600,
   `creditText` 8,000, `noteText` 2,000, `label` 200, `message` 240
   characters; `entries` arrays at most 4,000 (CFR) and 12,000 (U.S.C.).

### F. Field allowlists (closed; `additionalProperties: false` everywhere)

1. CFR entry: `title`, `part`, `authorityText`, `sourceText`,
   `authorityCitations`, `sourceCitations`, `omitted`. Official wording only
   from `AUTH/PSPACE` and `SOURCE/PSPACE`, tags stripped, whitespace collapsed
   to single spaces, trimmed. Not carried: part heading, `EDNOTE`, `CITA`,
   section text, subpart-level `AUTH`. Subpart-level authority lines are
   counted in the shard header (`subpartAuthorityCount`) so the omission is
   visible, and the page label reads "part-level Authority: line".
2. U.S.C. entry: `identifier`, `status`, `creditText`, `credits`,
   `reclassifiedAs`. Official wording only from `sourceCredit` (tags stripped)
   and, for `status="transferred"` sections only, the `note topic="codification"`
   paragraph text (`noteText`). `status` is the `section@status` attribute
   verbatim (`transferred`, `repealed`, `omitted`, `reserved`) or null when
   absent. Not carried: headings, section text, `referencesInText`,
   `amendments` and other notes, `<date>` text beyond the ISO attribute.
3. Parsed citations: `kind`, `text` (the exact span), structured fields per
   kind, `basis`, `pattern`. Refs whose href prefix is not `/us/pl`, `/us/stat`
   or `/us/act` are not emitted and are counted in `unmappedRefCount` on the
   shard header. `/us/act` refs are carried as `kind: act` with the href
   verbatim; there is no parser for them (basis `source_field`).
4. Vocabulary entry: `id`, `label`, `shortLabel`, `parentId`. From the FR
   agencies API: `slug`, `name`, `short_name`, parent slug; not `description`,
   `url`, `json_url`, numeric ids. CFR titles: number and name only.
5. Law alias: `popularName`, `citations`, `olrcUrl`, `reviewedOn`,
   `reviewerRole` (closed: `owner`, `staff`).
6. The manifest lists `verbatimFields` (`authorityText`, `sourceText`,
   `creditText`, `noteText`, `label`, `shortLabel`, `popularName`, `text`,
   `publicationName`, `currentThroughText`, `statementText`). The design
   rule 2 forbidden-word test skips exactly these fields and nothing else, so
   an official line containing "under" or "authorized" cannot fail the build
   while the page's own labels still can. Test: the forbidden-word test reads
   this list; a unit test asserts the list equals the schema's `$comment:
   verbatim` fields.

### G. Exclusions

1. No personal data: the allowlist admits none; the D-068 personal-pattern
   guard (contact names, emails, phones, postal blocks) runs over every string
   value in every file and the alias table. Test: validator; a fixture with an
   email fails.
2. No URL inside any shard entry (link targets come from `urlTemplate`s in the
   manifest). Manifest URLs must be `https://` on an allowlist of exactly
   `www.ecfr.gov`, `uscode.house.gov`, `www.federalregister.gov`. Test:
   validator regex on all string values of shards; host check on the manifest.
3. No Nation name: at test time, generate probes from the retained
   federal-recognition collection (575 names, as the design does for queries)
   and scan every string value in every file, the alias table and the
   manifest. A hit fails the validator. The acquisition applies the same probe
   and, on a hit in official wording, omits that text field (`omitted:
   ["authorityText"]` or `noteText: null` with `noteTextOmitted: true`), keeping
   the structured citations, and the page says "wording omitted; read it at the
   source". No fixture file holds a real Nation name. The alias table excludes
   any law whose popular name names a Nation (settlement acts and similar).
4. No field named or meaning Nation, treaty, jurisdiction, relationship,
   eligibility, land or parcel. Test: a unit test asserts the set of property
   names across the schema equals the allowlist in F.
5. No model output: `generatedBy.script` names `scripts/acquire-demo-index.mjs`
   and its version; no key or value in any file contains `jev`, `typesafe`,
   `parallel`, `model`, `probability`, `confidence`. Test: validator string
   scan (case-insensitive) on keys and values.
6. No raw XML or entities: every string value must match `^[^<>]*$` and
   contain no `&#` or `&lt;`. Test: schema pattern on verbatim fields and a
   validator pass over all strings.
7. No secrets or local paths: the existing `forbidden` list in
   `finish-demo-build.mjs` and `assertNoCredentialMaterial` patterns run over
   every file. Test: existing.

### H. Determinism and reproducibility

1. Shards and vocabulary files are written with `canonicalJson`
   (`src/core/canonical-json.mjs`), compact, plus one trailing newline; the
   manifest with `serializeJson` (pretty, two spaces) for review diffs. Test:
   the validator parses each file and asserts the re-serialized bytes equal
   the file bytes.
2. Stated sort orders: CFR entries by `part` with a numeric-aware comparator
   (`1`, `1a`, `2`, `10`); U.S.C. entries by `identifier` code-unit order
   (`compareCodeUnits`); vocabulary by `id`; aliases by `popularName`;
   manifest `files` by `path`. Citations inside an entry stay in source order
   (the order is part of the source's statement). Test: validator checks each
   array is sorted and has no duplicate key.
3. No timestamp, random id, host name or machine path inside any shard; the
   only time-varying values are in the manifest (`retrievedAt`,
   `lastRefreshAttemptAt`, `generatedAt`). Test: shard schema has no date-time
   field; the local-path regex from `finish-demo-build.mjs` runs on shards.
4. Reproducible from a pinned input: two runs with the same `--date` or
   `--release-point` and the same `patternSetVersion` produce byte-identical
   shards. Checked once per pattern-set version with a second run (needs
   network, so it is part of the refresh report, not of `check`); the hash
   equality is noted in the source note. Review.
5. Every parsed citation carries `pattern.id` and `pattern.version`; the
   validator asserts all versions in a file equal the manifest's
   `patternSetVersion`, so a half-migrated shard cannot ship.
6. Parser inputs are the raw fixtures trimmed to the elements used: the `AUTH`
   and `SOURCE` elements of parts 25/900 and 40/131, and the USLM sections
   `s5304`, `s450f`, `s442`, `s458bbb`, `s421` (two targets, cross-title,
   U+2013 identifier). These fixtures live under `tests/` and hold no Nation
   name.

### I. Review and approval per refresh

1. A refresh is a branch and a pull request, never a commit on `main`, because
   the merge is the publication. The owner's explicit in-session command to
   merge that pull request is the approval of that deployment (the D-084
   path). Review.
2. The pull request text (from an uncommitted refresh report the script writes
   to scratch) states: release point or date before and after; entries added,
   removed, changed per file; sizes before and after against the caps; the
   validator's pass line; the Nation-name and personal-pattern probe result;
   requests used against the budget stated beforehand; retrieval window;
   whether any text was omitted under G3 and for which parts or sections.
   Review: the owner reads this, not the shard diff.
3. Before the first snapshot and before any pattern-set version change, one
   review at the risk boundary (sovereignty reviewer) over the fixtures, the
   label strings and a sample of ten entries per shard. Later refreshes with
   the same pattern-set version need no new review. Review.
4. The first snapshot gets the N18 decision-register row. Later refreshes are
   recorded only by the merge commit message ("demo index refresh: eCFR
   2026-12-01, OLRC 119-140; owner approved in session 2026-12-02") and the
   release points in `docs/DEMO-STATUS.md`. No register row per refresh.
5. Call budget stated before each run, per source: OLRC one request per title
   zip; FR API one request per vocabulary; eCFR one `titles.json`, one
   structure listing per title, one request per part (about 2,800 for five
   titles at the estimated counts), spaced at least one second apart, no
   retry, stop on the first non-200 and record `failureStage: fetch`. Review:
   the number appears in the pull request text.

### J. Withdrawal when a source's terms forbid the use

1. Trigger: the owner reads terms (N17 or later) that forbid scripted access
   or republication of the lines carried. The owner says "withdraw" and names the source.
2. Same session: delete the files for that source from `docs/demo-data/`, set
   each manifest entry to `status: withdrawn`, `withdrawnOn` (date),
   `message` naming the reason in plain words without a URL, `sha256` and
   `sizeBytes` null; the alias table is unaffected (read by a person). Run
   `demo:build`; the page shows "withdrawn on" the date "while the source's terms
   are reviewed" for that hop with the live link. Pull request; the owner's
   merge command publishes it. Test: schema requires `withdrawnOn` when
   `withdrawn`; frontend fixture for the state.
3. Update the source note with the terms wording read and the date.
4. History: the shards remain in git history. Safeguard 7 forbids rewriting
   history, so a purge is not available to an agent; whether to request one
   from GitHub, or to re-create the repository, is an owner decision to list
   in `docs/STATUS.md` at the time. The decision row should say this now so a
   withdrawal does not surprise anyone.

### K. What the validators must check (wiring)

1. `scripts/finish-demo-build.mjs`: keep the `demo-assets/` rules unchanged;
   add a `demo-data/` visit that calls the new validator (K2) and applies the
   existing `forbidden` list to every file. `demo:build` therefore fails on a
   bad index without any network.
2. New `scripts/validate-demo-index.mjs` with its logic in an importable module
   (so `tests/demo/` can run it on fixtures), using Ajv 2020 strict with
   `schemas/demo-index.schema.v1.json`, performing: schema validation of
   manifest and each file; inventory equals manifest plus `manifest.json`;
   `sha256` and `sizeBytes` per file (reuse `sha256Bytes` from
   `src/pipeline/hashing.mjs`, the same bounded read as `validate-artifact`);
   canonical-byte equality (H1); sort and uniqueness (H2); caps (E); count
   identities (D1); as-of consistency between manifest and shard header (the
   shard repeats `pointInTimeDate` or `releasePoint`, and they must be equal);
   pattern versions (H5); status rules (a `current` or
   `retained_after_failed_refresh` entry has a file, `unavailable` and
   `withdrawn` entries have none); stale threshold (C3); exclusion scans (G).
3. `npm run check` gains `validate:demo-index` (`node
   scripts/validate-demo-index.mjs --dir docs/demo-data`), because `check`
   never runs `demo:build`.
4. `scripts/scan-source-boundary.mjs`: tracked files under `docs/demo-data/`
   must be `.json` and named in the manifest; no `.xml`, `.zip`, `.html`,
   `.txt` there; no import of `acquire-demo-index.mjs` from `demo/`,
   `src/demo/`, `worker/`.
5. `tests/demo/build.test.ts` keeps "rejects unexpected payload files" for
   `demo-assets/raw.json` and adds: manifested shard accepted; unmanifested
   shard refused; hash mismatch refused; raw XML string refused; oversize
   refused; Nation-name probe refused; stale manifest refused and acknowledged
   manifest accepted.
6. Frontend tests for the four file states and the hop label (C1, D3, D4).

## 2. Types

Keys are camelCase to match every manifest and schema in the repo; enum values
keep the design's snake_case. The design's `reclassified_as` is `reclassifiedAs`
here; rename if the owner prefers the design spelling, nothing else depends on
it.

### 2.1 TypeScript (proposed `src/demo/index-types.ts`)

```ts
// Closed vocabularies (design rule 1 and rule 3).
export type Basis =
  | "source_field"        // a structured official field (href, attribute)
  | "source_text_parsed"  // free text under an official heading, parsed by a versioned pattern
  | "identifier_match"
  | "citation_in_text"
  | "curated";
// Only the kinds these sources can yield. cfr, us_reports, rcw, ors and
// idaho_code are handled by the run-time citation_in_text module, not here.
export type CitationKind = "usc" | "pl" | "stat" | "fr" | "act";
export interface PatternRef { id: string; version: string } // e.g. { id: "usc-section", version: "1.0.0" }

interface CitationBase {
  kind: CitationKind;
  text: string;            // verbatim span as printed by the source
  basis: "source_field" | "source_text_parsed" | "curated";
  pattern: PatternRef;     // on every citation, including href-derived ones (the href grammar is a pattern)
}
export interface UscCitation extends CitationBase {
  kind: "usc"; title: number; section: string; etSeq: boolean; // "25 U.S.C. 450f et seq." -> section "450f", etSeq true; never expanded
}
export interface PublicLawCitation extends CitationBase {
  kind: "pl"; congress: number; number: number; section?: string; date?: string; // date ISO from USLM date@date, basis source_field
}
export interface StatuteCitation extends CitationBase {
  kind: "stat"; volume: number; page: number; pageEnd?: number;
}
export interface FederalRegisterCitation extends CitationBase {
  kind: "fr"; volume: number; page: number; dateText?: string; // "June 24, 1996" verbatim; not parsed
}
export interface ActCitation extends CitationBase {
  kind: "act"; href: string; // "/us/act/1926-05-17/ch309/s1" verbatim USLM href; basis source_field only
}
export type ShardCitation = UscCitation | PublicLawCitation | StatuteCitation | FederalRegisterCitation | ActCitation;

// CFR part authority shard (one per title).
export interface CfrPartAuthority {
  title: number;
  part: string;                         // "900", "1a"
  authorityText: string | null;         // verbatim AUTH/PSPACE; null when the part has no AUTH
  sourceText: string | null;            // verbatim SOURCE/PSPACE
  authorityCitations: ShardCitation[];  // source order; basis source_text_parsed
  sourceCitations: FederalRegisterCitation[];
  omitted: ("authorityText" | "sourceText")[]; // G3 omissions; [] normally
}
export interface CfrAuthorityShard {
  $schema: string; schemaVersion: "1.0.0"; artifactType: "cfr-authority-shard";
  title: number; pointInTimeDate: string;  // repeats the manifest value; validator asserts equality
  partsExpected: number; partsReserved: number; subpartAuthorityCount: number;
  entries: CfrPartAuthority[];             // sorted by part, numeric-aware
}

// U.S.C. source-credit shard (one per title, or per named chapter group).
export type UslmStatus = "transferred" | "repealed" | "omitted" | "reserved";
export interface UscSectionCredit {
  identifier: string;                 // "/us/usc/t25/s5304" verbatim; may contain U+2013
  status: UslmStatus | null;          // section@status verbatim; null = no attribute
  creditText: string | null;          // verbatim sourceCredit, tags stripped
  credits: (PublicLawCitation | StatuteCitation | ActCitation)[]; // from ref@href, basis source_field, document order
  reclassifiedAs: { targets: string[]; noteText: string | null; noteTextOmitted: boolean } | null;
  // targets: every /us/usc href in the codification note, document order (may be two, may be another title);
  // only present when status is "transferred". The page quotes noteText and links each target; it names no relation itself.
}
export interface UscSourceCreditShard {
  $schema: string; schemaVersion: "1.0.0"; artifactType: "usc-source-credit-shard";
  title: number; chapters: string[] | null;  // null = whole title; ["55", "85"] when chapter-sharded (title 42)
  releasePoint: string; publicationName: string; currentThroughText: string; // verbatim source as-of wording
  unmappedRefCount: number;
  entries: UscSectionCredit[];               // sorted by identifier, code-unit order
}

// Vocabulary (suggestions).
export type VocabularyKind = "fr_agency" | "fr_topic" | "cfr_title";
export interface VocabularyEntry { id: string; label: string; shortLabel: string | null; parentId: string | null }
export interface VocabularyFile {
  $schema: string; schemaVersion: "1.0.0"; artifactType: "vocabulary";
  kind: VocabularyKind; entries: VocabularyEntry[]; // sorted by id
}

// Law aliases (curated config, bundled).
export interface LawAlias {
  popularName: string;        // verbatim as printed on the OLRC Popular Names page
  citations: UscCitation[];   // basis "curated"; pattern still carried
  olrcUrl: string;            // https://uscode.house.gov/...
  reviewedOn: string;         // YYYY-MM-DD
  reviewerRole: "owner" | "staff";
}
export interface LawAliasFile {
  $schema: string; schemaVersion: "1.0.0"; artifactType: "law-aliases";
  basis: "curated"; sourceUrl: string; entries: LawAlias[]; // sorted by popularName
}

// Manifest.
export type IndexFileKind = "vocabulary" | "cfr-authority-shard" | "usc-source-credit-shard";
export type IndexFileStatus = "current" | "retained_after_failed_refresh" | "unavailable" | "withdrawn";
export type FailureStage = "fetch" | "normalize" | "validation" | "packaging";
export interface SourceRights { statementText: string; url: string; readOn: string; readByRole: "owner" }
export interface IndexSource {
  id: "ecfr" | "olrc-uslm" | "federal-register-api"; name: string;
  urlTemplate: string; requestCount: number;
  pointInTimeDate?: string; releasePoint?: string; publicationName?: string; currentThroughText?: string;
  upstreamSha256?: string; upstreamBytes?: number;
  retrievedAt: string; // ISO date-time, completion of the last request
  rights: SourceRights;
}
export interface IndexFile {
  path: string; kind: IndexFileKind; status: IndexFileStatus;
  sha256: string | null; sizeBytes: number | null; entryCount: number | null;
  source: IndexSource | null; patternSetVersion: string;
  lastRefreshAttemptAt: string | null; failureStage: FailureStage | null; message: string | null;
  withdrawnOn: string | null; staleAcknowledgedOn: string | null;
}
export interface IndexManifest {
  $schema: string; schemaVersion: "1.0.0"; artifactType: "demo-index-manifest";
  generatedAt: string; generatedBy: { script: "scripts/acquire-demo-index.mjs"; version: string };
  approvalRef: string;        // the register row that opened this output boundary (N18's D-number)
  verbatimFields: string[];   // F6
  files: IndexFile[];         // sorted by path
}
```

### 2.2 JSON Schema outline, `schemas/demo-index.schema.v1.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://policy-sentinel.invalid/schemas/demo-index.schema.v1.json",
  "title": "Policy Sentinel demo static index (N18 output boundary)",
  "oneOf": [
    { "$ref": "#/$defs/manifest" },
    { "$ref": "#/$defs/cfrAuthorityShard" },
    { "$ref": "#/$defs/uscSourceCreditShard" },
    { "$ref": "#/$defs/vocabularyFile" },
    { "$ref": "#/$defs/lawAliasFile" }
  ],
  "$defs": {
    "sha256":     { "type": "string", "pattern": "^[a-f0-9]{64}$" },
    "date":       { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
    "dateTime":   { "type": "string", "format": "date-time" },
    "semver":     { "type": "string", "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$" },
    "noMarkup":   { "type": "string", "pattern": "^[^<>]*$", "$comment": "verbatim: official wording, tags stripped, whitespace collapsed" },
    "officialHost": { "type": "string", "pattern": "^https://(www\\.ecfr\\.gov|uscode\\.house\\.gov|www\\.federalregister\\.gov)/" },
    "uscIdentifier": { "type": "string", "pattern": "^/us/usc/t[0-9]{1,2}[a-z]?/s[0-9A-Za-z.\\u2013-]{1,24}$", "maxLength": 48 },
    "releasePoint":  { "type": "string", "pattern": "^[0-9]{2,3}-[0-9A-Za-z,]{1,24}$", "$comment": "OLRC forms include 119-136 and 113-21not12" },
    "basis": { "enum": ["source_field", "source_text_parsed", "identifier_match", "citation_in_text", "curated"] },
    "citationKind": { "enum": ["usc", "pl", "stat", "fr", "act"] },
    "pattern": { "type": "object", "additionalProperties": false, "required": ["id", "version"],
      "properties": { "id": { "type": "string", "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$" }, "version": { "$ref": "#/$defs/semver" } } },
    "citationBase": { "type": "object", "required": ["kind", "text", "basis", "pattern"],
      "properties": { "text": { "$ref": "#/$defs/noMarkup", "maxLength": 400 },
                      "basis": { "enum": ["source_field", "source_text_parsed", "curated"] },
                      "pattern": { "$ref": "#/$defs/pattern" } } },
    "uscCitation":  { "allOf": [{ "$ref": "#/$defs/citationBase" }], "additionalProperties": false,
      "required": ["title", "section", "etSeq"],
      "properties": { "kind": { "const": "usc" }, "title": { "type": "integer", "minimum": 1, "maximum": 54 },
                      "section": { "type": "string", "maxLength": 24 }, "etSeq": { "type": "boolean" } } },
    "plCitation":   { "...": "congress 1..200, number 1..9999, section?, date? ($ref date)" },
    "statCitation": { "...": "volume 1..200, page 1..99999, pageEnd? >= page" },
    "frCitation":   { "...": "volume 1..200, page 1..99999, dateText? noMarkup maxLength 40" },
    "actCitation":  { "...": "href pattern ^/us/act/[0-9]{4}-[0-9]{2}-[0-9]{2}/ch[0-9]+(/.*)?$, basis const source_field" },
    "shardCitation": { "oneOf": ["#/$defs/uscCitation", "#/$defs/plCitation", "#/$defs/statCitation", "#/$defs/frCitation", "#/$defs/actCitation"] },

    "cfrPartAuthority": { "type": "object", "additionalProperties": false,
      "required": ["title", "part", "authorityText", "sourceText", "authorityCitations", "sourceCitations", "omitted"],
      "properties": {
        "title": { "type": "integer", "minimum": 1, "maximum": 50 },
        "part": { "type": "string", "pattern": "^[0-9]{1,4}[a-z]?$" },
        "authorityText": { "oneOf": [{ "$ref": "#/$defs/noMarkup", "maxLength": 4000 }, { "type": "null" }] },
        "sourceText":    { "oneOf": [{ "$ref": "#/$defs/noMarkup", "maxLength": 600 }, { "type": "null" }] },
        "authorityCitations": { "type": "array", "maxItems": 200, "items": { "$ref": "#/$defs/shardCitation" } },
        "sourceCitations":    { "type": "array", "maxItems": 20,  "items": { "$ref": "#/$defs/frCitation" } },
        "omitted": { "type": "array", "uniqueItems": true, "items": { "enum": ["authorityText", "sourceText"] } } } },
    "cfrAuthorityShard": { "type": "object", "additionalProperties": false,
      "required": ["$schema", "schemaVersion", "artifactType", "title", "pointInTimeDate", "partsExpected", "partsReserved", "subpartAuthorityCount", "entries"],
      "properties": {
        "$schema": { "const": "../../schemas/demo-index.schema.v1.json" },
        "schemaVersion": { "const": "1.0.0" }, "artifactType": { "const": "cfr-authority-shard" },
        "title": { "type": "integer" }, "pointInTimeDate": { "$ref": "#/$defs/date" },
        "partsExpected": { "type": "integer", "minimum": 0 }, "partsReserved": { "type": "integer", "minimum": 0 },
        "subpartAuthorityCount": { "type": "integer", "minimum": 0 },
        "entries": { "type": "array", "maxItems": 4000, "items": { "$ref": "#/$defs/cfrPartAuthority" } } } },

    "uscSectionCredit": { "type": "object", "additionalProperties": false,
      "required": ["identifier", "status", "creditText", "credits", "reclassifiedAs"],
      "properties": {
        "identifier": { "$ref": "#/$defs/uscIdentifier" },
        "status": { "oneOf": [{ "enum": ["transferred", "repealed", "omitted", "reserved"] }, { "type": "null" }] },
        "creditText": { "oneOf": [{ "$ref": "#/$defs/noMarkup", "maxLength": 8000 }, { "type": "null" }] },
        "credits": { "type": "array", "maxItems": 400, "items": { "oneOf": ["#/$defs/plCitation", "#/$defs/statCitation", "#/$defs/actCitation"] } },
        "reclassifiedAs": { "oneOf": [{ "type": "null" }, { "type": "object", "additionalProperties": false,
          "required": ["targets", "noteText", "noteTextOmitted"],
          "properties": { "targets": { "type": "array", "minItems": 1, "maxItems": 8, "items": { "$ref": "#/$defs/uscIdentifier" } },
                          "noteText": { "oneOf": [{ "$ref": "#/$defs/noMarkup", "maxLength": 2000 }, { "type": "null" }] },
                          "noteTextOmitted": { "type": "boolean" } } }] } },
      "if": { "properties": { "status": { "const": "transferred" } } },
      "then": { "properties": { "reclassifiedAs": { "type": "object" } } },
      "else": { "properties": { "reclassifiedAs": { "type": "null" } } } },
    "uscSourceCreditShard": { "type": "object", "additionalProperties": false,
      "required": ["$schema", "schemaVersion", "artifactType", "title", "chapters", "releasePoint", "publicationName", "currentThroughText", "unmappedRefCount", "entries"],
      "properties": {
        "artifactType": { "const": "usc-source-credit-shard" },
        "title": { "type": "integer", "minimum": 1, "maximum": 54 },
        "chapters": { "oneOf": [{ "type": "null" }, { "type": "array", "minItems": 1, "maxItems": 64, "items": { "type": "string", "pattern": "^[0-9]{1,3}[A-Z]?$" } }] },
        "releasePoint": { "$ref": "#/$defs/releasePoint" },
        "publicationName": { "$ref": "#/$defs/noMarkup", "maxLength": 40 },
        "currentThroughText": { "$ref": "#/$defs/noMarkup", "maxLength": 80 },
        "unmappedRefCount": { "type": "integer", "minimum": 0 },
        "entries": { "type": "array", "maxItems": 12000, "items": { "$ref": "#/$defs/uscSectionCredit" } } } },

    "vocabularyFile": { "...": "artifactType const vocabulary; kind enum fr_agency|fr_topic|cfr_title; entries maxItems 5000 of {id slug/number maxLength 120, label noMarkup maxLength 200, shortLabel noMarkup|null maxLength 80, parentId|null}" },

    "lawAliasFile": { "...": "artifactType const law-aliases; basis const curated; sourceUrl officialHost; entries maxItems 400 of {popularName noMarkup maxLength 200, citations minItems 1 maxItems 8 of uscCitation with basis const curated, olrcUrl officialHost, reviewedOn date, reviewerRole enum owner|staff}" },

    "sourceRights": { "type": "object", "additionalProperties": false, "required": ["statementText", "url", "readOn", "readByRole"],
      "properties": { "statementText": { "$ref": "#/$defs/noMarkup", "maxLength": 2000 }, "url": { "type": "string", "format": "uri", "pattern": "^https://" },
                      "readOn": { "$ref": "#/$defs/date" }, "readByRole": { "const": "owner" } } },
    "indexSource": { "type": "object", "additionalProperties": false,
      "required": ["id", "name", "urlTemplate", "requestCount", "retrievedAt", "rights"],
      "properties": { "id": { "enum": ["ecfr", "olrc-uslm", "federal-register-api"] }, "name": { "type": "string", "maxLength": 80 },
                      "urlTemplate": { "$ref": "#/$defs/officialHost" }, "requestCount": { "type": "integer", "minimum": 1, "maximum": 5000 },
                      "pointInTimeDate": { "$ref": "#/$defs/date" }, "releasePoint": { "$ref": "#/$defs/releasePoint" },
                      "publicationName": { "$ref": "#/$defs/noMarkup" }, "currentThroughText": { "$ref": "#/$defs/noMarkup" },
                      "upstreamSha256": { "$ref": "#/$defs/sha256" }, "upstreamBytes": { "type": "integer", "minimum": 1 },
                      "retrievedAt": { "$ref": "#/$defs/dateTime" }, "rights": { "$ref": "#/$defs/sourceRights" } },
      "allOf": [
        { "if": { "properties": { "id": { "const": "ecfr" } } }, "then": { "required": ["pointInTimeDate"] } },
        { "if": { "properties": { "id": { "const": "olrc-uslm" } } }, "then": { "required": ["releasePoint", "publicationName", "currentThroughText", "upstreamSha256", "upstreamBytes"] } } ] },
    "indexFile": { "type": "object", "additionalProperties": false,
      "required": ["path", "kind", "status", "sha256", "sizeBytes", "entryCount", "source", "patternSetVersion", "lastRefreshAttemptAt", "failureStage", "message", "withdrawnOn", "staleAcknowledgedOn"],
      "properties": {
        "path": { "type": "string", "pattern": "^(vocab/(fr-agencies|fr-topics|cfr-titles)|cfr/title-[0-9]{1,2}|usc/title-[0-9]{1,2}(-ch-[0-9A-Z]{1,4}(-[0-9A-Z]{1,4})?)?)\\.json$" },
        "kind": { "enum": ["vocabulary", "cfr-authority-shard", "usc-source-credit-shard"] },
        "status": { "enum": ["current", "retained_after_failed_refresh", "unavailable", "withdrawn"] },
        "sha256": { "oneOf": [{ "$ref": "#/$defs/sha256" }, { "type": "null" }] },
        "sizeBytes": { "oneOf": [{ "type": "integer", "minimum": 1, "maximum": 1572864 }, { "type": "null" }] },
        "entryCount": { "oneOf": [{ "type": "integer", "minimum": 0 }, { "type": "null" }] },
        "source": { "oneOf": [{ "$ref": "#/$defs/indexSource" }, { "type": "null" }] },
        "patternSetVersion": { "$ref": "#/$defs/semver" },
        "lastRefreshAttemptAt": { "oneOf": [{ "$ref": "#/$defs/dateTime" }, { "type": "null" }] },
        "failureStage": { "oneOf": [{ "enum": ["fetch", "normalize", "validation", "packaging"] }, { "type": "null" }] },
        "message": { "oneOf": [{ "type": "string", "maxLength": 240, "pattern": "^(?!.*https?://).*$" }, { "type": "null" }] },
        "withdrawnOn": { "oneOf": [{ "$ref": "#/$defs/date" }, { "type": "null" }] },
        "staleAcknowledgedOn": { "oneOf": [{ "$ref": "#/$defs/date" }, { "type": "null" }] } },
      "allOf": [
        { "if": { "properties": { "status": { "enum": ["current", "retained_after_failed_refresh"] } } },
          "then": { "properties": { "sha256": { "$ref": "#/$defs/sha256" }, "sizeBytes": { "type": "integer" }, "source": { "type": "object" } } } },
        { "if": { "properties": { "status": { "enum": ["unavailable", "withdrawn"] } } },
          "then": { "properties": { "sha256": { "type": "null" }, "sizeBytes": { "type": "null" } } } },
        { "if": { "properties": { "status": { "const": "withdrawn" } } }, "then": { "properties": { "withdrawnOn": { "$ref": "#/$defs/date" } } } },
        { "if": { "properties": { "status": { "const": "retained_after_failed_refresh" } } }, "then": { "properties": { "lastRefreshAttemptAt": { "$ref": "#/$defs/dateTime" }, "failureStage": { "type": "string" } } } } ] },
    "manifest": { "type": "object", "additionalProperties": false,
      "required": ["$schema", "schemaVersion", "artifactType", "generatedAt", "generatedBy", "approvalRef", "verbatimFields", "files"],
      "properties": {
        "$schema": { "const": "../../schemas/demo-index.schema.v1.json" }, "schemaVersion": { "const": "1.0.0" },
        "artifactType": { "const": "demo-index-manifest" }, "generatedAt": { "$ref": "#/$defs/dateTime" },
        "generatedBy": { "type": "object", "additionalProperties": false, "required": ["script", "version"],
                         "properties": { "script": { "const": "scripts/acquire-demo-index.mjs" }, "version": { "$ref": "#/$defs/semver" } } },
        "approvalRef": { "type": "string", "pattern": "^D-[0-9]{3}$" },
        "verbatimFields": { "type": "array", "uniqueItems": true, "items": { "type": "string" } },
        "files": { "type": "array", "minItems": 1, "maxItems": 64, "items": { "$ref": "#/$defs/indexFile" } } } }
  }
}
```

Non-schema checks (the validator, K2): sorted arrays, canonical bytes, hash and
size, caps across files, as-of equality between manifest and shard header,
pattern versions, Nation-name and personal-pattern probes, the model-word scan,
the stale threshold, and `entryCount == entries.length`.

### 2.3 Deliberately left out

Part and section headings; `CITA` per-section amendment citations; `EDNOTE`;
USLM notes other than the codification note of a transferred section;
section text; any URL inside a shard (templates live in the manifest);
`cfr`, `us_reports` and state-code citation kinds (not produced by these
sources; the run-time `citation_in_text` module owns them); ISO parsing of FR
and act dates (verbatim `dateText` only); gzip sizes in the manifest (the
validator computes them); a `buildId` (the git commit is the build id); per-entry
retrieval times; agency descriptions and numeric ids; a relation verb for
`reclassifiedAs` (the note is quoted, the page asserts nothing); any `nation`,
`treaty`, `jurisdiction`, `eligibility` or land field; AI summaries.
