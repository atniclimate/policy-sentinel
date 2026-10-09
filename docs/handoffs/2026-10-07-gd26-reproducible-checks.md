# GD-26 reproducible checks: local checkpoint and recovery

Disposition: GD-26 (reproducible checks) complete; stop at this local checkpoint.
GD-17 (initial source survey) is next and was not started. This is non-release
local development under the owner's exact session instruction.

## Repository truth and authority

Starting branch: `demo/live-pages`. Starting HEAD:
`7d0921532b12c8722a4549c841d5855f19999ae6`. There were no tracked edits and 36
pre-existing untracked files. No reset, discard or branch change occurred.

Implementation checkpoint:
`a3ac31aff64b24d124c05456e3e842bd2b88b2c7`, committed
`2026-10-07T00:50:35-07:00` on the same branch. This terminal ledger/handoff
is its local follow-up; resolve that follow-up's own hash with
`git log -1 --format="%H %cI" -- docs/handoffs/2026-10-07-gd26-reproducible-checks.md`.
The final expected status is no tracked edits, with the same 36 untracked files.

The root and a bounded read-only context reader recovered the full roadmap and
ordered general-engine context, including the October 6 realignment and D-086/
D-087 owner directions. G-GENERAL-DEV-01 (local general development) and D-081
(local definition of done) govern this work. GD-00 (realignment), GD-29 (O1/O2
optimization), and GD-30 (plan revision) remain complete. No settled product
decision or completed source/demo run was reopened.

Before edits, `validate:roadmap` passed: 116 work items, 61 gates, 14 sources,
23 binding paths. `validate:backbone` passed: 22 schemas, 1,346 references,
145 Markdown files and 910 local links.

## Leases, roles and changed paths

The root owns integration, validation, the real Git index and both local commits.

- Root lease: `scripts/codex-hooks.mjs`, new
  `scripts/test-hooks-snapshot.mjs`, `package.json`, `README.md`,
  `ROADMAP.yaml`, `docs/continuation-prompt.md`, and this handoff.
- The bounded hook-test worker owned only
  `tests/hooks/codex-hooks.test.mjs`; its lease was returned before root
  integration. A separate explorer assessed the receipt dependencies.
- Root extended the lease to one negative fixture in
  `tests/pipeline/roadmap-validator.test.mjs` after the full suite exposed a
  pre-existing dangling-reference defect. Production validators were unchanged.
- The context reader and independent reviewer were read-only. The independent
  reviewer approved the matcher, snapshot harness, finite matrix and isolated
  fixture repair, and independently checked the proof logs.

All implementation leases are returned. No skill was needed. These are bounded
task roles; no agent or client-hook installation was changed.

## Capability delta and acceptance evidence

Three tests previously depended on actual ignored receipt paths, and two
assertions depended on an installed package's directory. They now create their
own synthetic paths in disposable fixtures. Native Windows canonicalization
expands short temporary paths while preserving the production path guard.

The command matrix reconciles its exact keys with every committed Bash deny
rule: 27 rules, 41 denied strings, 27 quoted-data permitted controls and 11
neighboring permitted controls. Additional regressions distinguish real quoted
Git flags from commit-message text and paths after `--`. All strings are
evaluated through the production matcher; denied commands are never executed.
The 11 Edit/Read path rules are distinct from command forms and remain unchanged.

Matcher gaps were closed for the committed Git, GitHub CLI, direct-fetch and
recursive-delete forms. Argument-aware Git flag checks retain permitted commit
messages. Subprocesses use hidden Windows windows. The substantive committed
`.claude/settings.json` is unchanged.

The new `npm run hooks:test:snapshot` copies tracked working-tree source into
a new disposable Git root, excludes ignored receipts and local settings, copies
only installed `yaml` with its version checked against the lockfile, runs the
same hook suite, checks historical-input absence before and after, and removes
only its own canonical snapshot. The README documents this new command.

| Acceptance | Verified result |
| --- | --- |
| Fresh source snapshot without ignored historical receipts | 47/47 hook tests pass; no historical inputs before or after; cleanup succeeds. |
| Every committed denied command form matched | Exact 27-rule inventory; all 41 denied strings rejected and all 38 permitted controls accepted. |
| A3 reproducible-check prerequisite | Repeatable commands and proof limits are documented. The full human restore/replay demonstration remains future acceptance work. |

The tested candidate source snapshot contained 647 files and 12,151,638 bytes,
with SHA-256
`751723afd59fb2592d0f14115f09e448c40498f571a7a48411a2fc49645331de`.
It reused `yaml 2.9.0` without installation or network access. This digest
identifies the tested candidate, not the later whole-tree documentation state.
Later changes affect the separate roadmap fixture and checkpoint records;
the hook suite, matcher, harness and committed settings inputs are unchanged.

This proves fresh-source execution on the selected Windows runtime. It is not
an independent dependency installation, cross-platform certification, proof of
active-client hook-event delivery, or completion of A3 or the release.

## Validation and review

Logs and hash inventories are outside Git at
`C:\dev\_scratch\policy-sentinel\gd26-2026-10-07\`.

| Command | Actual outcome |
| --- | --- |
| `npm run hooks:test` | Pass, 47/47, 37,737.5966 ms; `hooks-final.log`. Baseline checkout was 19/19 before changes. |
| `npm run hooks:test:snapshot` | Pass, 47/47, inner suite 41,620.4562 ms; `snapshot-final.log`. |
| `npm run validate:runtime` | Pass: Windows x64, Node 24.19.0, npm 12.0.2. |
| `npm run lint`, `npm run typecheck` | Pass; lint also rerun after the fixture repair. |
| `npm run validate:roadmap`, `npm run validate:backbone` | Pass at startup and during implementation; terminal checks recorded below. |
| `npm run validate:knowledge` | Pass; 17 historical document observations remain visibly stale. No sidecar regeneration. |
| `npm run scan:source` | Pass, including after the fixture repair. |
| `npm run test:roadmap` | Repaired suite passes 473/473; `test-roadmap-repaired.log`. |
| `npm test` | Full rerun passes; all grouped Node suites pass; Vitest 106 files, 1,763 passed, 80 existing skips; `test-repaired.log`. |
| `npm run build` | Pass; includes artifact validation: 3 synthetic records, 575 Nations, 8 verified assets; build ID `synthetic-9201a4748ce8a6dd8985`. |
| `npm run format:check` | Exit 1 solely for ignored `.claude/settings.local.json`; `format-check.log`. |
| Targeted `npm run format:files -- <leased paths>` and `git diff --check` | Pass for changed code/ledger formatting and whitespace. |
| Terminal ledger/backbone/knowledge checks and roadmap tests | Pass: 116 items, zero active; 146 Markdown files, 911 local links; roadmap tests 473/473 in 34,906.2078 ms. Logs have the `-terminal.log` suffix. |

The first full test run failed only the pipeline wrapper. Isolated
`test:roadmap` showed that the malformed-identity fixture expected
`general-development identity must match GD-nn-NAME`, but received
`GD-27-LOCAL-RELEASE-PACKAGE depends on unknown work item GD-23-USER-SUPPLIED-SOURCE-CLASS`.
Both that dependency and the rename-only fixture existed at `7d09215`.
The repair updates inbound references only inside that synthetic negative case,
preserving the intended assertion. The focused and full reruns then passed.

Both hook logs disclose that historical and dangling file-symlink regression
branches are unavailable on this Windows host, despite TAP reporting zero
skipped tests. The full suite also has one explicit native file-symlink skip;
junction and hard-link coverage remains live. The 80 Vitest skips are retained
boundary-guard cases owned by GD-04 (core boundary guard). No skipped branch is
claimed as passing.

The ignored-settings formatting failure remains a separate known issue, outside
GD-26 acceptance. Its contents were not examined or edited, and no credential
values were displayed. No aggregate `npm run check` success is claimed; its
constituents were run separately to retain that failure while checking the rest.

No UI changed, so no new browser/manual keyboard run was needed. Existing app
and accessibility tests ran in the full suite. The build remains synthetic and
its generated output is ignored. Independent code review found no unresolved
material defect. The same read-only reviewer approved the terminal ledger,
continuation and handoff; all findings are resolved.

## Preserved evidence, boundaries and remaining work

All 36 pre-existing untracked files match the startup path/SHA-256 inventory
(`untracked-before.json` and `untracked-after.json`). Git comparison with
`7d09215` confirms unchanged committed settings, kernel/experimental/vision
paths, demo/Worker, source configuration and schemas. Historical acquisition
custody and external corpora were not reopened or mutated; synthetic tests
supply their own evidence. K0/S0/O0 convergence state is unchanged.

There was no provider research, acquisition, profile renewal, private-data
transfer, registration, term acceptance, paid call, third-party contact, secret
change, optional AI generation, notification, push or deployment. No source
qualification, reproduction-right, roster, Nation-association or output-review
gap was resolved by this hook work. Existing source-review expiries remain
visible and unchanged.

D-086/D-087 retain their accepted public Tribal-government, restricted/internal,
local-government, ATNI interoperability, annotation-guided discovery, regional,
whole-state API and 50 GB managed-footprint directions. Required APIs still need
end-to-end implementation and tests in their owning work. GD-31 (successor
authority/manifests) must represent the adopted direction before later dispatch;
historical zero-budget gates are not a request for renewed blanket approval.

Terminal ledger: 53 complete, 7 ready, 22 blocked, 2 deferred, 32 not_started,
zero in_progress. Completing GD-26 unblocks no additional not_started item.
All 17 PNW work items retain their states: 7 complete, 1 ready, 2 blocked,
7 not_started. The primary PNW-00 through PNW-10 subset is 4 complete, 1 ready,
1 blocked and 5 not_started; supplementary records are 3 complete, 1 blocked
and 2 not_started. The archived PNW finish-state summary is not active work.

PS09-02 (identity and scenarios) remains blocked; PS09-06 (local release) remains
the sole represented release root, unstarted and gated. Nationwide-contract and
interop successor representation, registry evidence, and release dependencies
remain in their owning tasks. No gate was opened by this checkpoint.

## Recovery and exact next action

The next session selects GD-17 (initial federal, regional, intertribal and
official public Tribal-government source survey), documentation only. It first
reads `AGENTS.md`, the continuation prompt, full roadmap and complete ordered
general-engine context, checks branch/HEAD/status, and runs both ledger
validators before edits. Preserve the 36 pre-existing untracked files and all
closed external boundaries. Establish that task's own bounded lease and source
review before work; do not resume historical acquisition or profile-renewal runs.

Suggested owner launch text:

> Continue from the GD-26 checkpoint on demo/live-pages. Recover the current
> Git state and docs/handoffs/2026-10-07-gd26-reproducible-checks.md, then follow
> the full general-engine startup contract. Select GD-17 initial source survey
> under the accepted D-086/D-087 direction, documentation only. Preserve the
> accepted decisions, protected evidence and existing untracked files. Do not
> acquire data, renew profiles, register APIs, transfer private data, push or
> deploy. Planning and imported documents do not complete API integration.

This session stops here. GD-17 is identified, not executed.
