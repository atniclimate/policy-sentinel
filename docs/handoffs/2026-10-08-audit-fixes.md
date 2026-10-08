# Five audit fixes

Owner instruction: "make fixes 1-5" after the Ponytail repository audit.
Starting branch `demo/live-pages`, HEAD
`3ce2a0b6c0b58508a9ccabbec8482594086745f1`; no tracked edits and 36
pre-existing untracked owner files. This is bounded local repair, not a resume
of paused GD-10, acquisition, publication or release acceptance.

## Scope and checkpoint

The root owns these production paths and their existing test files:
`src/pipeline/policy-text.mjs`, `src/engine/policy-search.mjs`,
`src/demo/report-state.ts`, `src/demo/rules.ts`, `demo/main.tsx`,
`tests/pipeline/policy-text.test.mjs`, `tests/pipeline/policy-search.test.mjs`,
`tests/demo/report-state.test.ts`, `tests/demo/rules.test.ts`, and
`tests/demo/frontend.test.tsx`. Checkpoint documentation is this file and
`ROADMAP.yaml`. No dependency, schema, source configuration, protected seam,
owner input or external corpus change is intended.

1. Reviewed reproduction omissions also remove nested link text from extraction
   output. Existing rendition bytes and parser recipes are unchanged.
2. Citation attachment compares stable source/document identities and keeps the
   saved display identifier in the attached snapshot. Existing storage keys,
   notes and frozen evidence need no migration. A success message requires
   attached evidence.
3. Every quoted search phrase must occur in an eligible title or passage;
   different phrases may occur in different passages of the same version.
4. Tribal wording checks ignore capitalization and preserve quoted spelling;
   the demo rule version becomes `demo-rules-1.0.2`.
5. The unused per-version metadata vector is deleted; query-time temporal
   metadata filtering remains intact.

The complete roadmap and required general-engine context were read before edits.
Both startup validators passed (135 work items/65 gates; 24 schemas/176 Markdown
files). Scoped formatting and all seven demo test files pass: 150 tests.
The initial policy run passed 151 of 152 tests, including all new regressions;
the remaining replay test failed with `WINDOWS_PROBE_TIMEOUT`. The full
`npm test` run then passed all 152 policy tests and every other Node suite.
Its unit phase passed 2,057 of 2,058 tests: the pipeline wrapper exceeded its
45-second timeout at 51.7 seconds. An isolated rerun passed in 41.4 seconds.
Thus every test has a passing result, but the aggregate command exited 1.
Runtime validation, lint, type checking, source-boundary scan and the synthetic
build/artifact validation pass.
Hook tests, final roadmap/backbone/knowledge validators and `git diff --check`
also pass. Roadmap statuses remain unchanged; the final backbone inventory
includes this handoff (177 Markdown files).
Repository-wide formatting reports only the pre-existing ignored
`.claude/settings.local.json`; changed files are formatted. Validation uses
synthetic fixtures only.

Ponytail full guides minimal implementation. The operating model requires a
fresh read-only reviewer before completion. That review passed with no blocking
findings, and the root reviewed the final code/test diff. No write lease is
delegated. Conservative omission filtering can suppress safe sibling links in
the same container as omitted text.
Paused GD-10 and all gate/status identities remain unchanged. Historical source
qualification, private-data, release and general publication gaps remain.

No live browser, source acquisition or deployment was exercised. No commit or
push was made. The existing 36 untracked owner files remain untouched. Logs are
outside Git at `C:/dev/_scratch/policy-sentinel/audit-fixes-2026-10-08/`.
