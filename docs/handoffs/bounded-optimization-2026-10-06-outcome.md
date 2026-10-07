# Bounded optimization outcome

Plan `policy-sentinel-optimize-20261006-223953`, revision 1; selected packages
O1 and O2. D-085 (bounded optimization) records the selection and launch.
GD-29 (deterministic tests and startup instructions) is the sole item for this
batch. This is local maintenance, with no publication or general-engine release.

## Changes and boundaries

O1 makes the two historical-profile success cases use an isolated test clock,
including an explicit preload in the child CLI. Each source profile is tested
before review, at review, just before expiry, exactly at expiry and after expiry.
The unmodified CLI also refuses the expired profiles at the actual execution
date; that observation is distinct from deterministic historical fixtures.

Two replay success cases use synthetic free-space observations. Additional tests
exercise ample space, exactly the post-write 20 GiB floor, one byte below it and
the independent 10 GiB run ceiling. The ceiling case injects the size observation
of one existing synthetic file; it does not allocate 10 GiB. Real output bytes,
checksums, ownership, exclusive writes and refusal before output creation remain
covered. Test mocks restore both default and named filesystem exports.

O2 reconciles AGENTS, Claude, continuation and operating-model startup guidance,
plus the hook's recovery messages and assertions. Narrow existing-demo tasks can
read their complete dependency, gate, decision, acceptance, evidence and blocker
closure from the full YAML. Shared extractor, general-engine, ledger graph and
uncertain or mixed work still require the complete context. Full-ledger validators
and all substantive gates remain. A completed demo record cannot start new work.
Git guidance follows exact owner authority and the existing demo exception;
recovery uses the explicitly selected plan and matching surface handoff. No deny
setting or hook enforcement predicate changed.

Production code, source profiles, permissions, dependencies, schemas, protected
K0/S0/O0 paths and all existing roadmap item contents remain unchanged. All 36
unrelated untracked files match the retained baseline hashes. GD-28 (completed
demo maintenance) stays complete; GD-26 (broader reproducible checks) stays ready.
No provider request, source renewal, private-data operation, push or deployment
was performed. The ordinary build remains synthetic.

## Verification

| Check | Result |
| --- | --- |
| Focused O1 tests | 54 passed, no failures or skips. |
| Hook tests | 19 passed; unchanged code/config evidence carried into the final checkpoint. |
| Full `npm run test` | Passed all children: foundation; corpus 13 passes; spine 30 passes/1 existing environment skip; policy 143 passes; assurance 100; backbone 26; Tier 1 129; knowledge 31; unit 1,763 passes/80 existing placeholders across 106 files. |
| Runtime, lint, type checking, roadmap, backbone and knowledge validation | Passed. |
| Ordinary synthetic build and artifact validation | Passed: build `synthetic-db24cbdc0f7701aef4e5`, 3 records, 575 fixture Nations, 8 verified assets. |
| `npm run check` | Failed at the unchanged ignored local-settings format issue after runtime passed. Remaining children ran separately; this is not a green aggregate check. |

Final source-scan and terminal ledger results are recorded with the checkpoint
in [ROADMAP.yaml](../../ROADMAP.yaml). The serialized final matrix ran once;
subsequent continuity-only edits use the affected source/document/ledger checks.
No successful unaffected suite was repeated for a commit.

The four historical policy failures are resolved in the current test run; their
failed baseline logs and the earlier demo outcome remain preserved. The separate
ignored local-settings formatting failure remains, so the aggregate repository
check is not green. The final review found no unresolved material defect.

The existing file-symlink test was unavailable because this Windows host does not
grant unprivileged file-symlink creation. Junction and hard-link checks passed;
two hook symlink diagnostics were likewise unavailable. Unit placeholders remain
skipped as recorded. No new skip, timeout increase or assertion weakening was used.
No browser, live-source, deployment or physical-storage stress acceptance is
claimed by this test/instruction change. Timing improvements were not measured.

## Continuity

The integrator owned shared instructions, hook assertions, ledger, evidence and
Git staging. A separate worker owned only three policy test files and the new
filesystem-observation helper. A read-only context reader completed the original
full roadmap and ordered contracts before admission; a separate independent
reviewer reviewed the final diff and evidence. All implementation leases are
returned. No live helper or server remains owned by this run.

Starting branch: `demo/live-pages`; HEAD
`8ae5b4ca59b39ca16946c77978ef010bc7256e6d`. The implementation is verified;
the local implementation commit and terminal ledger follow-up are pending.
Nothing from this optimization run has been pushed or deployed.

The ready plan and earlier receipts remain immutable; the private run state and
closeout identify completion. O3-O7 remain deferred. This batch selects no next
item and must not restart completed packages on a later optimize-go invocation.
A later optimization increment requires a new selected plan or revision. Existing
PS09 and general-development source, identity, private-context, interop and release
gates retain their exact state.
