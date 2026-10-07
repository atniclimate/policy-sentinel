# GD-31 successor contracts and release crosswalk

Date: 2026-10-07. Starting branch: `demo/live-pages`.
Starting HEAD: `3ea56470b809e262bebf16227d51ceac26f73c6d`.
Status: reviewed implementation checkpoint under the owner's `$pickup and go`
direction, D-086/D-087 and the GD-31 acceptance contract. Required full validation
is incomplete; GD-31 is not complete. This task dispatches no source operation.

## Startup and write leases

The full roadmap and ordered general-engine context were recovered by the root
and bounded read-only context reviewers. Startup roadmap and backbone validators
passed: 116 items, 61 gates, 22 schemas, 1,346 references, 160 Markdown files
and 986 links. No tracked edits or active Git operation existed. The 36
pre-existing untracked owner files remain protected.

The root owns integration, the Git index, ROADMAP.yaml, package.json, README.md,
AGENTS.md, current navigation/contract/continuation documents, foundation-check
integration, the operation-packet preparation record, release crosswalk and
handoff. Supporting task scripts and verification logs belong only in the
external scratch directory for this checkpoint.

The schema worker owns `schemas/development-authority.schema.v1.json`,
`src/core/development-authority.mjs` and optional declarations,
`tests/pipeline/development-authority.test.mjs`,
`fixtures/development/authority.synthetic.valid.json`, and
`docs/architecture/gd31-successor-contracts.md`.

The ledger worker owns only `scripts/validate-roadmap.mjs` and
`tests/pipeline/roadmap-validator.test.mjs`. The root supplies the exact
successor ledger fields, gates, work IDs and migration crosswalk. Reviewers
remain read-only and cannot authorize sources or release acceptance.

Protected: historical gates and PS09 item bodies, existing source profiles and
registry, retained record/artifact/source schemas, sealed external custody,
K0/S0/O0, demo/Worker, private material, sibling repositories and owner inputs.
No source is qualified or renewed by carrying the GD-17 survey forward.

## Implementation and independent review

Schema 1.11 represents four successor scopes without editing the historical
four GD gates or frozen PS09 objects. GD-27 is the current release root;
GD-48 is a package candidate, GD-49–52 own demonstrations and GD-53 carries
unresolved PS09 acceptance. Nineteen new rows make the source, API, search,
pilot, regional custody, mapping and demonstration obligations explicit.
The crosswalk accounts for PS09-01–06, all six identity claim classes, all
50 evidence families in nine scenarios, twelve PNW clauses and Part B/A1–A4.
Registry v1 is separate from the retained T0 v0 bundle.

The additive preparation schema and pure functions implement closed source,
synthetic exchange and independent restriction contracts. Every packet forbids
dispatch. The real planning packet carries ten blocked pilot/API rows with
finite ceilings, empty output allowlists and no bound custody namespace.
Source evidence is carried from GD-17 without renewal; the GD-18 capacity
refusal remains visible. No packet qualifies or activates a source.

Independent sovereignty/contract review found one material defect: the initial
synthetic exchange check compared two registry digest claims without recomputing
the registry contents. The author added a canonical versioned preimage and
SHA-256 verification, including injected-membership and re-pinned tamper cases.
The reviewer independently reproduced valid acceptance and injected-membership
refusal, then recommended PASS for the bounded preparation scope. Review also
checked ledger/crosswalk/operation authority and requested explicit wording for
future successor representation of frozen source-specific gates; that wording
is now in the crosswalk. Preparation cannot discharge ungranted credentials,
terms or access, or substitute synthetic identity evidence.

The first integration check also caught a planning packet/schema mismatch:
verbose blocker strings were outside the schema categories and jurisdiction
scope was omitted. The repair uses enum categories with exact gaps in the
companion document, explicit federal/state planning scopes and no invented
ATNI jurisdiction. Reviewed governmental preparation requires declared scope;
blocked preparation can retain unknown scope. Actual-packet tests and the
preserved capacity refusal pass; independent re-review recommends PASS.
The new test's missing explicit URL import was also repaired after lint.

Focused contract tests pass 37/37; roadmap tests pass 492/492, including
historical compatibility and false-completion refusal. Backbone validation and
type checking pass. The full-check outcomes below prevent a GD-31 completion
claim; local Git records an explicitly incomplete checkpoint. The existing
ignored local settings formatting failure remains outside this lease. The 36
protected owner files match their retained GD-26 SHA-256 inventory.

Full validation initially stopped at the repaired planning packet mismatch.
The next run stopped in an unchanged Windows corpus-store test with TIME_LIMIT;
a repeat encountered additional native-probe/operation timeouts. A read-only
host observation measured 92% aggregate CPU use. Process ancestry identified
the largest consumer as headless browser tests in another workspace, not this
task. Those processes and all production/test limits were left unchanged.
The failed logs remain in external scratch. The `test:spine` script now sets
`--test-concurrency=1` for its same three files, preserving process isolation,
assertions and timeout limits. This reduces competing native probes; it is not
a test skip or production limit change. The find-docs CLI resolved Node 24's
[official CLI documentation](https://nodejs.org/docs/latest-v24.x/api/cli.html#--test-concurrency)
for this scheduling option. Local Node 24.19.0 rejects it from NODE_OPTIONS,
so the option is explicit in the committed script. A passing full run remains
required before GD-31 is marked complete.

The serialized run also stopped on Windows custody timeouts. It is retained as
`test-serialized-spine.log`; no performance or concurrent-load claim follows.
The roadmap and handoff preserve validation-pending status. A fourth full run
after the previously identified competing process ended also timed out; ending
that one process did not establish a quiet host or resolve the failure. The
subsequent policy component check reported WINDOWS_PROBE_TIMEOUT as well.
The broader remaining-check script was interrupted after that failure, as it
was entering test:assurance; later component suites were not completed in this
checkpoint. No test or operation deadline was relaxed. On the owner's direction
to proceed where validation is unnecessary, the lead stopped repeated broad
attempts and preserved the explicit full-suite prerequisite for completion.

## Checkpoint results

Passing: 37/37 focused development-authority tests, 492/492 roadmap tests,
47/47 hooks, runtime validation, full lint after repair, type checking,
foundation, roadmap, backbone, knowledge and source-boundary validation, and
the synthetic build/artifact check. Knowledge retains 17 stale observations.
Backbone recognizes 23 schemas, 1,357 references, 165 Markdown files and 1,031
links; the staged source scan checks 676 tracked paths and 712 source files.
All counts describe this checkpoint, not product/source completion.

Not passing: full npm test, stopped at unchanged Windows custody/probe failures;
the separate policy suite also failed under the observed contention. Global
format:check reports only the pre-existing ignored local settings file. No
aggregate npm run check success is claimed. Failed and interrupted logs remain
under `C:/dev/_scratch/policy-sentinel/gd31-2026-10-07/`.
