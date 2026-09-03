# PNW-05 Federal Register admission-review coordination

Date: 2026-09-02

Parent work item: `PNW-05-SOURCE-PACK`

Authorized slice: `PNW-05-SRC-FEDERAL-REGISTER-ADMISSION-REVIEW`

Target source: `SRC-FEDERAL-REGISTER`

Mode: metadata-only, no-fetch decision review

Status: review complete with recommendation `NO_GO` and disposition `evidence
blocked`; source not admitted

Owner acceptance: not asserted; review recommendations do not open a gate

Terminal disposition:
`PNW_05_FEDERAL_REGISTER_ADMISSION_REVIEW_COMPLETE_EVIDENCE_BLOCKED_SOURCE_NOT_ADMITTED`

## Authority and stop boundary

The owner authorized exactly this local review under the
[Federal Register documentation-review handoff](../handoffs/pnw-federal-register-doc-review-2026-09-02.md):
map the completed dossier into a go/no-go real-source admission decision,
perform the required canonical-Markdown owner-input exclusion audit, and carry
forward the accepted authority and non-inference rules.

The authorization expressly excludes adapter work, source admission or
activation, source or provider retrieval, credentials, accounts, terms action,
production content, publication, and every other tranche. It also excludes
changes to the source registry, source schemas, source-pack schema/runtime,
fixtures, application, artifact, dependencies, retained PNW-01/03/04 contracts,
K0, S0, O0, and owner inputs.

The decision may be no-go without admitting the source. A finding that a narrow
contract is technically plausible is not permission to implement, access,
bind, or activate it.

## Reconciled starting custody

The tranche began on branch `main` at
`10489fe9fce00e37dc2cb074f448f416c691db8d`, whose parent is the owner-accepted
Federal Register documentation-review checkpoint
`290b75e62bfccc4ccca9232803987ce3e439adff`.

Starting facts:

- one worktree at `I:/policy-sentinel`;
- no Git remote;
- no tracked or staged change;
- exactly 22 preserved owner inputs untracked and unstaged: twenty Markdown,
  one YAML, and one text file;
- current companions 15A through 15E matched their accepted byte sizes and
  SHA-256 values; and
- K0, S0, and O0 matched their protected LF/no-BOM identities.

Protected identities:

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| K0 | 28,667 | `30e98fc8093b00ebd31cbbd545ca671a54eec68e3f6bdae065a7d2173fb7797d` |
| S0 | 41,506 | `ae213150ca9f5dfbf5c77d3f05c70aa3aad2b3921987fc091ec1e88b92f78888` |
| O0 | 116,551 | `f4f39c0b7ac2b5ce763d47785b82d0e162fc1217a41377490e8c926ed8cdd381` |
| 15A | 15,548 | `eda4148c38480081e29b119ecf4c6df7c051cbb235632af93a3e2d740b807b89` |
| 15B | 10,359 | `e6e255ae5956c9f685fd840b26b6f3e827553e02f750edd0da043a9955597743` |
| 15C | 13,633 | `45c716302379c30eef79307f843d7d982350e2da6debb5a5becf7fb3ddcd7c9e` |
| 15D | 13,745 | `61010682c331836619a01c8afaa172c9e82e0b6860de6c3907406aedfce14eda` |
| 15E | 18,519 | `bde02ceccf87554964d09b30d134b510d69777a377af9564ea46f27f82df069c` |

The initial validators passed with 63 work items, 41 gates, 14 sources, 23
binding paths, 13 JSON Schemas, 13 IDs, 924 references, 67 canonical Markdown
files, and 273 local links. The roadmap was then changed to exactly one
`in_progress` item, `PNW-05-SOURCE-PACK`, for this bounded slice.

## Frozen path manifest

Only these paths may change:

1. `ROADMAP.yaml`
2. `scripts/validate-backbone.mjs`
3. `tests/pipeline/backbone-validator.test.mjs`
4. `docs/source-reviews/federal-register-admission-review-2026-09-02.md`
5. `docs/development/PNW-05-FEDERAL-REGISTER-ADMISSION-REVIEW-COORDINATION-2026-09-02.md`
6. `docs/handoffs/pnw-federal-register-admission-review-2026-09-02.md`
7. `docs/decision-register.md`
8. `docs/source-feasibility.md`
9. `docs/source-coverage.md`
10. `docs/PROJECT-BACKBONE.md`
11. `docs/continuation-prompt.md`

No one-for-one path substitution or expansion is authorized. The lead owns all
writes, staging, commits, and terminal judgment. Review agents are read-only.

## Agent assignments and reconciliation

- A source-evidence auditor mapped the dossier, registry state, and source-pack
  core to each conjunctive admission predicate. It returned no-go with the one
  disposition `evidence blocked`.
- A sovereignty/adversarial reviewer tested organization/Nation authority,
  recognition/membership separation, geography/topic promotion, docket and
  lifecycle laundering, consultation attribution, rendition/issuer custody,
  privacy, false completion, and the validator boundary.
- The lead read every binding startup document and owner input, maintained the
  ledger, implemented the validator repair, reconciled the decision against
  repository bytes, and owns the final evidence.

Agent findings are recommendations. The no-go follows from conjunctive local
contracts and the completed primary-evidence dossier, not a vote.

## No-fetch operation ledger

| Operation class | Authorized | Used | Result |
| --- | ---: | ---: | --- |
| External HTTP or browser request | 0 | 0 | None |
| Provider/API record request | 0 | 0 | None |
| Redirect follow | 0 | 0 | None |
| Credential, account, cookie, login, or form action | 0 | 0 | None |
| Terms/clickthrough action | 0 | 0 | None |
| Provider body, raw response, cache, or production record persisted | 0 | 0 | None |
| Adapter, registry, source-pack runtime, fixture, app, or artifact mutation | 0 | 0 | None |

All inspection and testing was local. Existing external links in the prior
dossier were used as citations only and were not opened in this tranche.

## Admission reconciliation

The [admission-review dossier](../source-reviews/federal-register-admission-review-2026-09-02.md)
contains the full predicate and adversarial matrices. The finite decision is:

- source identity and authority separation are adequate for future design;
- a narrow Tier-1 metadata/link profile is technically plausible;
- the current source-pack schema and runtime categorically accept only
  synthetic fixture sources and reject real `federal-register`;
- API-specific terms/privacy, stable paging, rates, retry/SLA/change behavior,
  and formal response/error schemas remain unresolved;
- no accepted real-source allowlist, selected range, operation grant,
  configuration authority, review/admission receipt, three-scope health, or
  checksum-bound last-known-good evidence exists; and
- retained registry/adapter bytes are dated historical evidence, not current
  admission proof.

Therefore the review returns `NO_GO` and `evidence blocked`. The runtime source
remains disabled, inactive, unbound, and non-production.

## Validator-exclusion audit and repair

### Defect

`scripts/validate-backbone.mjs` formerly exempted twenty reserved owner-input
Markdown paths by filename alone. It did not check content identity or Git
custody. A byte-replaced, staged, tracked, or committed file at one of those
paths could evade link validation. Canonical Markdown could also link to an
exempt file and silently depend on noncanonical input. Raw HTML `href`/`src`
attributes were not parsed, while symlinks/junctions were skipped and link
targets were checked lexically. A tracked Markdown file under a directory
ignored by basename could also escape inventory.

The previous direct test reinforced the defect: it created arbitrary content
at only a subset of reserved filenames in a non-Git temporary directory and
expected all such content to be excluded.

### Repair

The exemption is now an exact map of twenty accepted path/SHA-256 tuples. A
candidate is exempt only if all four conditions hold:

1. its case-exact repository-relative path is in the manifest;
2. its raw bytes match the manifest SHA-256; and
3. Git reports that exact path as untracked and non-ignored; and
4. its case-normalized path is absent from the current `HEAD` tree.

Failure to inventory Git-tracked paths fails the validator before a result can
be returned. Failure to obtain positive Git-untracked custody yields no owner-
input exemptions. Altered, case-renamed, new, ignored, staged, intent-to-add,
tracked, committed, or staged-deletion-and-recreated paths are validated.
Canonical inbound links to the
exempt set are rejected after normalized resolution, with case-insensitive
comparison to close Windows aliases. Standard/custom-element raw HTML opening
tags and unknown tags with assigned attributes are rejected while URI autolinks
and template placeholders remain valid Markdown, and the
validator rejects symbolic-link/junction entries in the authored Markdown tree
plus local links that traverse such an alias. Every Git-tracked Markdown path
must appear in the authored inventory, and local links cannot target existing
Markdown outside that inventory.

### Verification matrix

| Case | Expected result | Focused proof |
| --- | --- | --- |
| Exact bytes, exact path, Git-untracked, absent from `HEAD` | May remain noncanonical input | Custody helper accepts exact tuple |
| Byte or line-ending drift | Validate normally | Changed-byte case rejects exemption |
| Path absent from Git-untracked set | Validate normally | Empty-set case rejects exemption |
| Wrong or new path | Validate normally | Wrong-path case rejects exemption |
| Staged deletion plus recreated `HEAD` path | Validate normally | Current-`HEAD` custody case rejects exemption |
| Git tracked-path inventory unavailable | Fail the validator | Indexed hidden Markdown plus unavailable Git metadata case |
| Canonical relative link to exempt input | Reject dependency | Inbound dependency case returns true |
| Case-variant link to exempt input on Windows | Reject dependency | Case-variant inbound case returns true |
| Canonical standard/custom-element raw HTML opening tag or unknown tag with assigned attribute | Reject raw HTML | Direct parser covers `href`, `src`, `data`, `action`, nested elements, and style URL while preserving a URI autolink; end-to-end owner-path case uses `object[data]` |
| Symlink/junction Markdown alias | Reject authored-tree alias | Temporary junction inventory case |
| Local link traverses ignored-tree alias | Reject target traversal | Temporary ignored-directory junction case |
| Git-tracked Markdown below an ignored basename | Reject incomplete inventory | Forced-index temporary Git case |
| Local link to unscanned regular Markdown | Reject noncanonical target | Ignored-tree link case |

The direct suite passes 25/25 tests, including end-to-end temporary Git
repositories. The live repository backbone validation proves that all twenty
currently present exempt Markdown inputs still match exact custody and reports
13 schemas, 13 IDs, 924 references, 70 canonical Markdown files, and 295 local
links. No owner input changed.

## Terminal verification and Git evidence

- Independent source-evidence review returned the recommendation `NO_GO` and
  the single disposition `evidence blocked`.
- Independent sovereignty/adversarial review returned exact
  `APPROVE_PNW05_FR_ADMISSION_REVIEW_CANDIDATE` with no remaining material
  authority, non-inference, privacy, provenance, lifecycle, false-completion,
  custody, or scope defect. This is not owner acceptance.
- The focused backbone-validator suite passed 25/25 tests. Hooks passed 9/9;
  formatting, lint, typecheck, roadmap, backbone, and source-boundary checks
  passed.
- An uncontended serialized `npm test` passed 83/83 files and 1,335/1,335
  tests. The timing-sensitive pipeline child separately passed 105/105 tests;
  a task-specific temporary Node compile cache then kept that same child below
  its fixed wrapper timeout without changing repository bytes or test semantics.
- The terminal `npm run check`, with that temporary compile cache and one
  Vitest worker, passed formatting, lint, typecheck, roadmap, backbone, source-
  boundary, foundation, all 83 test files and 1,335 tests, build, and artifact
  validation. The final build contains 3 synthetic records, exactly 575
  synthetic Nations, and 8 hashed assets at build ID
  `synthetic-1da7380bf8aab802f04d`.
- The terminal roadmap has zero `in_progress`, one `ready`, 32 `complete`, 16
  `blocked`, and 14 `not_started` work items. Local implementation/evidence and
  ledger commit identities are recorded in a follow-up checkpoint on these same
  authorized paths.
- No browser check applies because no UI, interaction, source runtime, or
  artifact contract changed.
