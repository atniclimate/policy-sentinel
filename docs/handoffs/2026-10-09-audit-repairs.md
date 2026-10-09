# Audit repairs: export privacy, search URLs and study history

Owner instruction on 2026-10-09: "Make fixes 1 - 3" from the preceding
Ponytail audit. D-090 records this bounded local scope; GD-56 tracks execution.
Starting source checkpoint: `6a00ecc7e693495e52080b664ee836bcfb0c4fee`.

## Scope and safeguards

- Use the filtered study ID for public product filenames, preserving local IDs.
- Make the URL subcategory dictionary safe for inherited property names.
- Reuse unchanged canonical history strings within a single validation call.
  Keep the v1 saved-study format, exact bytes, every digest check and all
  shape, reference, immutable-evidence and revision checks.

Allowed code paths are `src/app/StudyWorkspace.tsx`, `src/app/routing.ts`,
`src/core/research-study.mjs` and their three existing test files. Durable
tracking uses this handoff, `ROADMAP.yaml`, the decision register and the
continuation prompt. No dependency, schema, source, custody, private-input,
remote or publication change is included. Existing untracked owner material
and protected kernel/experimental/vision paths remain untouched.

## Evidence and session ledger

- Baseline roadmap/backbone checks passed before edits. The preceding audit
  also passed the full test command, typecheck, lint, source scan and synthetic
  build/artifact validation.
- A deterministic synthetic one-question study was revised 100, 300 and 1,000
  times through the public study API, with a 1,000-character body per edit.
  Import timings were 88 ms (101 revisions, 171,431 bytes), 449 ms (301
  revisions, 512,831 bytes), and 4,351 ms (1,001 revisions, 1,707,734 bytes).
  Each import reproduced the serialized input exactly. These are local Node
  measurements, not browser or maximum-capacity guarantees.
- Required startup context was read in full across the root and two read-only
  reviewers. The ledger review accepted the bounded GD-56 representation.
- The new UI/routing tests failed before the source repair: all seven restricted
  public filenames exposed the study ID, and `__proto__`, `constructor` and
  `toString` category keys threw the same uncaught error. After the repair,
  all 64 tests across the three affected files passed. Public and local naming,
  URL round-trips, long-history exact serialization, historical digests and
  rejection of a tampered history with a recomputed outer digest are covered.
- Independent read-only candidate review passed all six source/test paths. It
  checked downstream routing consumers, every export button and the lifetime
  and immutability assumptions of the revision-string cache.
- Broad validation passed: runtime, typecheck, lint, hooks, roadmap, backbone,
  knowledge, source scan, every `npm test` stage (2,219 unit tests in 115
  files), build and artifact validation. Logs are under
  `C:/dev/_scratch/policy-sentinel/audit-repairs-20261009-0800/`.
  The ordinary build has 3 synthetic records, exactly 575 Nations and 8 verified
  assets (`synthetic-767eed6834e5b9a6f7b4`). One existing Windows file-symlink
  permission test is skipped; junction and hard-link checks pass. Formatting
  initially flagged the pre-existing ignored local settings and the newly typed
  test mock. After formatting the test, the complete rerun flags only
  `.claude/settings.local.json`, which this task leaves untouched. Task-owned
  checked files pass; repository-wide `format:check` remains nonzero for that
  recorded pre-existing exception.

## History measurement

The same deterministic input and public API sequence ran before and after the
change on Node 24.19.0. The elapsed interval covers `parseResearchStudy` only;
fixture creation and subsequent serialization are outside it. Each run imports
the saved text, then requires serialization to reproduce that text exactly.
The exact probe is retained at
`C:/dev/_scratch/policy-sentinel/audit-repairs-20261009-0800/history-benchmark.mjs`;
its imports name this checkout, and it performs no file or network writes.

| Revisions | Saved bytes | Before | After |
| --- | ---: | ---: | ---: |
| 101 | 171,431 | 88 ms | 36 ms |
| 301 | 512,831 | 449 ms | 222 ms |
| 1,001 | 1,707,734 | 4,351 ms | 1,897 ms |

The three saved-study digests were identical before and after:

- 101: `e2a9d30a974740146fe341199a31ba7473067797c2cd2bdce8e62f9ad7dc592d`
- 301: `6f057a6b2a0a4955f7f4d6d7b06796534997ab71bb17ba8ac23e44dcf87380bd`
- 1,001: `73d41c0fb376519bd5980fefba830ca3f04995872528e092bb99479ff483e8f7`

The largest measured case is about 2.3 times faster. Every historical SHA-256
check still runs; hashing complete prior states remains proportional to the
sum of their sizes. This repair removes repeated revision-object traversal and
serialization, not that saved-format cost. No claim is made for an 8 MiB
maximum-size study, browser latency, or simultaneous analysts.

## Recovery

The three repairs, regression tests, independent review and broad validation
are complete. Record the implementing local commit, then close GD-56 in a
terminal ledger follow-up. GD-27 general release
acceptance and every unrelated source or external gate stay unchanged.
