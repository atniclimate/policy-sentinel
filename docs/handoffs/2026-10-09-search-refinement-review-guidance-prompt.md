# GPT-6.1-sol prompt for search refinement and evidence review

Prepared 2026-10-09 at local checkpoint `426981e` for the owner's requested
next session. This is a launch prompt, not an implementation receipt. The
preparation session changes documentation only. Select `gpt-6.1-sol` in the
client; writing a model name in a prompt does not change the running model.

The prompt uses explicit outcomes, relevant context, compatibility constraints
and observable completion criteria, following
[OpenAI's Codex prompting guidance](https://learn.chatgpt.com/guides/best-practices#strong-first-use-context-and-prompts).
There is no measured claim that this wording is uniquely optimal for the model.

## Copy from here into the next implementation session

$ponytail:ponytail

Implement two connected improvements in `I:\policy-sentinel`: explicit search
refinement and actionable evidence-review guidance. Complete their shared
contracts, persistence, UI integration, regression coverage and required
validation. Continue through both capabilities; do not stop after a plan, one
helper, or a partial UI. Resolve ordinary implementation choices yourself.

### Recover the accepted checkpoint

Follow `AGENTS.md`, the Windows execution route and the full general-engine
startup context in `docs/continuation-prompt.md`. Run the existing roadmap and
backbone validators before edits. Reuse completed decisions; investigate only
what supports this implementation. At prompt preparation, HEAD was `426981e`,
GD25/GD35/GD54 were complete and there were zero active ledger items. Check the
actual checkout for later changes. Preserve unrelated work, the 38 previously
untracked owner files and ignored `.claude/settings.local.json`.

Adoption of this prompt selects this bounded local follow-up ahead of unrelated
ready work. Represent it in the canonical ledger using its established rules,
with one active item and references to accepted GD25/GD35/GD54 evidence. Preserve
their historical acceptance; do not reopen the completed pilot or claim GD27
release completion. Local implementation, tests, documentation and task-only
local commits are in scope. No remote push or deployment is requested.

Read these task-specific records after the required startup context:

- `docs/development/2026-10-08-roadless-real-source-pilot.md`.
- `docs/development/2026-10-09-study-follow-up-register.md`.
- Existing search, study and product contracts and their callers listed below.

The pilot retained three works, 210 segments and 18 selected passages. It fixed
historical FR identifier parsing, date normalization, mapping provenance,
analyst registration, acquisition spacing, contrast and mobile wrapping. Preserve
those fixes. Its six model-authored assertions and procedural links remain
unreviewed; no human acceptance was recorded. The original and extended
deadlines are historical source statements, not an established current deadline.

Unquoted `roadless`, `roadless Cascades`, and `roadless Alaska` each returned
three ranked records because the existing search uses any-term matching. The
context builder also excludes versions already present as direct results and
requires reviewed study evidence. Therefore zero additional context records
does not by itself distinguish an already-visible parent, pending review or a
missing relationship. The new behavior must make these distinctions inspectable.

### 1. Implement explicit search refinement

Keep broad any-term search as the legacy default. Add one plainly labeled
all-terms refinement choice to the existing local search form and request
contract. Avoid a new query language, geographic inference, dependency or search
service. A location word is a text term; the existing reviewed jurisdiction
filter has a separate meaning.

Define all-terms matching against eligible source fields and passages within one
document version. Use existing normalization and token rules; do not combine
terms across versions or documents. Require every effective query term, with
existing quoted phrases still required. An exact identifier match must not
override an unmatched additional term. Ranking/context boosts and source-field
evidence must not manufacture a lexical match.

Expose the selected mode and explain matches using existing provenance and
matched-term data. Where terms occur in different passages of one version, make
that clear; never construct a joined quotation or imply one passage contains
every term. Preserve documented empty-query, stop-word-only, phrase, identifier,
date-cutoff and source-display behavior. Unknown modes fail validation.

Retrieve supported parent proceedings separately after determining direct
matches. A parent may lack the regional query term. Keep it labeled contextual,
with its supporting relationship, citations and docket/RIN when evidenced.
Deduplicate versions, keep direct and contextual counts distinct, retain result
limits/truncation disclosures and temporal eligibility. Never widen direct
matches just to retain a parent or present a reviewed analyst link as a legal
effect determination.

Persist the chosen mode with discovery search scope. Saving, reopening and
rerunning the discovery must reproduce its mode and filters. Old study files
without the field retain legacy semantics; update strict schemas, declarations,
validation and export provenance where necessary without rewriting historical
revisions or digests. A private annotation remains private even when it informs
an explicitly authored discovery query.

### 2. Make review requirements actionable

Extend the existing context result and study workspace to explain why a relevant
saved proceeding or authority relationship is withheld. Derive diagnostics from
actual study references and the same eligibility rules used for retrieval; do
not infer new candidate relationships from keywords or proximity.

Distinguish at least: already shown as a direct result; eligible context;
unreviewed passage/proceeding/relationship; challenged or rejected evidence;
stale or mismatched corpus binding; missing supporting evidence; and temporal
exclusion when applicable. Some are repair or research tasks, not items that
can become valid merely by clicking Accept. Do not show unrelated study items
as blockers for the current search.

For actionable items, show the exact item, reason and required evidence, with
keyboard-accessible navigation to its source passage or preselected existing
review form. Use the current analyst registration and attributed review flow.
No automatic acceptance, fabricated analyst identity, bulk acceptance or change
to immutable source text. Keep model authorship distinct from analyst decisions.

Reviewing evidence must immediately recompute the current context and queue.
If evidence is later challenged/rejected, or its corpus binding changes, the
display must stop treating dependent context as eligible. Preserve historical
review decisions and handle dependent records through the existing invariants;
do not silently erase history or leave unsupported accepted relationships.
Cycles, repeated references and multiple missing dependencies must remain
bounded and deduplicated. Keep private note text and restricted source content
out of unauthorized diagnostics and exports.

### Implementation surfaces and scope

Trace every caller before changing shared functions. Expected surfaces include:

- `src/engine/policy-search.mjs` and `.d.mts`.
- `src/app/PolicyWorkbench.tsx`, `src/app/StudyWorkspace.tsx` and relevant CSS.
- `src/modules/output/study-products.mjs` and `.d.mts`, especially
  `studySearchContext`.
- `src/core/research-study.mjs`, `.d.mts`,
  `schemas/research-study.schema.v1.json`, and discovery save/reopen/export paths.
- `tests/pipeline/policy-search.test.mjs`,
  `tests/modules/output/study-products.test.ts`,
  `tests/core/research-study.test.ts`, and existing workbench/workspace tests.

Reuse existing modules and test fixtures. Share eligibility logic where needed
to keep explanations consistent, without introducing a general workflow engine.
Inspect the browser/projection path for request propagation; do not assume every
caller is the main form. Fix defects directly exposed by these changes. Record
unrelated findings in the follow-up register instead of expanding the session
into a redesign, source-integration program or broad refactor.

### Required proof

Use a small synthetic corpus where a regional child contains `roadless` and
`Cascades`, its governing parent lacks `Cascades`, and an unrelated document
contains only `roadless`. With valid supporting relationships, prove:

1. Legacy broad search retains its behavior. All-terms `roadless Cascades`
   narrows direct matches; the parent remains separately available as context.
2. An unknown added term produces zero direct matches, with mode, collection
   coverage and date scope visible. It does not imply non-occurrence.
3. Phrases, exact identifiers, cross-passage terms, cross-version separation,
   cutoff dates, restricted text, result caps and malformed modes behave as
   specified. A result limit does not falsely imply complete context coverage.
4. An unreviewed fixture reports the correct missing prerequisites. Explicit
   synthetic analyst reviews make eligible context available. Subsequent
   challenge/rejection or stale binding removes eligibility while retaining
   review history. A parent already in direct hits is not reported as absent.
5. Save/reopen preserves mode, filters, original authorship, review decisions,
   evidence identities and private-note separation. A legacy study imports
   successfully. Public products remain filtered and bind the exported revision.

Run targeted tests during implementation, then all repository-required checks
appropriate to the final change, including `npm test`, typecheck, lint, source
scan, roadmap/backbone validation and build/artifact validation. Use committed
package scripts. Run actual browser checks for the changed controls, focus,
contrast and mobile layout. Reuse existing browser infrastructure; the larger
reusable journey from step 3 remains explicitly tracked below. Report a browser
limitation honestly if the necessary runtime is unavailable.

The last pilot passed all Node suites and 2,209 Vitest tests. Those are baseline
receipts, not evidence for new code. Preserve the unrelated ignored-settings
formatting exception; format only task-owned files and do not hide a failing
aggregate command. Do not relax assertions, timeouts or frozen measurement
protocols to obtain a pass. Check that eligibility work remains bounded on the
existing synthetic search workload; rerun its established measurement when the
search/index or traversal change warrants it. Do not claim 50 GB performance.

Optionally replay the sealed local pilot read-only after synthetic proof. Its
external root is `C:/dev/_scratch/policy-sentinel/roadless-real-pilot-20261008`;
exact corpus/study/product paths and hashes are in the pilot journal. Keep source
objects and original study revisions unchanged. Derivatives and receipts belong
in a distinct approved external output namespace. Do not record synthetic human
reviews in the real study. Missing local artifacts do not block synthetic work.

### Preserve the next research and testing work

Update `docs/development/2026-10-09-study-follow-up-register.md` at closeout.
Keep step 3, the full reusable browser journey, visible with its remaining
acceptance. Identify which portions this session actually covered.

Retain all nine real-study gaps. The new UI can help a human resolve review gaps;
writing the UI does not resolve them. Review and refine the ranked source-search
recommendations and their roadmap owners from existing evidence. Prepare a
concrete next research packet: question, gap, source family, query/identifier,
date scope, required evidence fields, expected product and qualification or
access condition. Do not execute a new source run in this code session.

The pilot's three exact acquisition operations are spent. Existing D-086/D-087
direction remains adopted, so do not request its blanket authorization again.
Fresh dispatch still needs its applicable source-specific qualification and
finite operation conditions. No credentials, terms acceptance, private data,
outbound contact, external model calls, general-engine publication or expanded
Regulations.gov comment collection are supplied by this prompt. Respect the
50 GB total managed ceiling and existing official-source/privacy rules.

Finish with a task-only local checkpoint and a concise account of implemented
behavior, test outcomes, remaining research/browser work and material limits.
Update the canonical ledger and continuation pointer so another session can
resume from files. End after both capabilities and their required validation
are complete, or describe the exact unresolved blocker with completed work
preserved. Do not represent the whole platform as complete.
