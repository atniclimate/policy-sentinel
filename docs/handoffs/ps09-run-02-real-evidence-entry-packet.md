# PS09 Run 2 follow-up: bounded identity and scenario evidence review

Current disposition: historical packet. The owner later approved EV01; it ended
at local launch with zero source requests. Its directory is read-only and cannot
resume. Recover the [terminal record](ps09-ev-01-evidence-review.md). The decision
request and contract body below are preserved as dated preparation, not a live
approval request or execution grant.

Historical preparation status: proposed, awaiting exact owner approval. Preparation follows the owner's
"Continue to the next step" instruction after the [Run 2 terminal handoff](ps09-run-02-identity-authority-scenarios.md).
That instruction authorizes this local proposal and its roadmap checkpoint;
no source was accessed. The validated synthetic packet and all existing gates,
work-item statuses, dependencies and release roots remain unchanged.

## Decision requested

Approve `POLICY-SENTINEL-PS09-EV-01-IDENTITY-SCENARIO-EVIDENCE-REVIEW` for the
five conditional operations, bounded source-text review views in this session,
and local review scope below. This is a new,
single-use evidence-review grant under the unresolved PS09-02 work item. It
does not restart the completed synthetic packet, start Run 3 or 4, populate a
real identity registry, or qualify/admit/activate a production source.

The useful result is a dated, independently reviewed account of what one
recognition-notice rendition and one Washington codification page actually
support, with explicit gaps. This is the first bounded evidence checkpoint,
not the full real-evidence requirement for PS09-02. The [candidate manifests](../development/ps09-run-02-candidate-manifests.md)
remain `owner_plan_only`; this selection neither replaces the cohort nor
removes any required scenario.

Approval applies only to this exact packet and its named operations. No special
phrase is required. No terms acceptance, registration, credentials, paid call,
contact, private data, optional AI, notification, remote or publication action
is requested. A source requiring one of those actions is skipped at its gate.

## Starting checkpoint and preparation boundary

Preparation started on `main` at
`feef77b42463957cd889c53d483a9a98dd5659b4`, following implementation
`00c7203483e314edfa0c598848008853379bb7bd`. The tracked worktree and index were
clean, with 33 protected untracked inputs, one worktree and no remote.

The [custody manifest](../development/ps09-run-01-custody.json) is 21,724 bytes
at SHA-256 `c440a663dc0678cb5619541adb49599a77b69b2e31bda62ab8d27ae921db8221`.
All 33 owner inputs and 43 historical evidence files matched their recorded
lengths and hashes before drafting. Package-lock SHA-256 is
`9629185a1e801b5ddb1c3422fc819eb1552b97ab7663cfa5984dae114192646f`;
starting roadmap SHA-256 is
`988ba2b2d0529d209b29163d5f9b30108487e9be8ff9df847c6d5d5a22e5e0d0`.
Generated build entries in the custody manifest are historical observations,
not part of the 76 immutable files.

The preparation write boundary is exactly this packet and `ROADMAP.yaml`.
The lead owns both; all delegated readers/reviewers are read-only. Preserve
all protected inputs, historical source receipts, K0/S0/O0, runtime, schemas,
fixtures, dependencies and command surface. As in the [previous preparation](ps09-run-02-entry-packet.md),
PS09-02 stays `blocked`, with zero `in_progress` items; preparing approval
material does not reactivate an exhausted implementation grant.

## Selected claims and source gaps

These are questions to verify, not current source findings.

| Claim | Exact question and maximum positive result | Remaining boundary |
| --- | --- | --- |
| EV01-I1, Crow name at publication | Does the selected GovInfo HTML rendition of FR Doc. `2026-01899`, dated `2026-01-30` in the retained review, contain a distinct list entry for the owner-selected Crow government candidate? Record the complete source-exact name, list heading and locator only after verifying notice identity, issuer and entry context. | A reviewed observation of that dated rendition only. No present-day recognition, sovereign-identity adjudication, alias, ATNI membership, complete roster, currentness or legal-status claim. |
| EV01-S1, scenario B / slot B1 | Does the selected Washington Legislature page present section `80.50.060`, its exact heading and any explicit version/update information? Record those metadata with publisher, rendition role and access time. | Codification metadata only. No session-law chain, currently controlling law, project authority, consultation sufficiency, permit or outcome conclusion. No Nation association; any future eligible record requires `general_jurisdiction` and remains `Unclassified` without approved exact-label mapping. |
| EV01-G1, Crow agency distinction | Preserve the government, reservation concept and BIA agency as distinct unaccepted slots. | No BIA request in this packet. Exact applicable BIA access-policy evidence and any explicit government/agency relationship remain unresolved. No relation is inferred from the name or source hostname. |

The Crow context is already owner-selected in the protected scenario catalog,
section 10's Montana extension. The exact RCW URL is its section 4 seed.
The catalog's custody entry is
`Policy-Sentinel-PNW-Research-and-Test-Case-Catalog-2026-09-05.md`, SHA-256
`82c45788e51be6e127796fd6f2d0a2d48895b7f234e2ff3faf9ffc244979e152`.
Its filename date and source descriptions are planning direction, not observed
facts. No link to a protected owner input becomes a canonical dependency.

The existing [recognition review](../source-reviews/bia-2026-recognition-review.md)
records the separate 577-paragraph/575-entity reconciliation block. This packet
does not resolve or weaken it. Fort Peck and Fort Belknap retain separate
candidate identities; neither is merged, accepted or removed here. Exact ATNI
membership affects that claim only and does not block this selected
general-jurisdiction evidence review. All other deep graphs and sentinels retain
their existing evidence gaps.

## Exact prospective operation table

URLs below are copied from local evidence. None was opened during preparation.
All are HTTPS GETs for one HTML response; source families are GovInfo-hosted
BIA notice material and Washington Legislature codification, with policy
documents as prerequisites. The three exact hosts are `www.govinfo.gov`,
`leg.wa.gov` and `app.leg.wa.gov`. Host permission is not a wildcard URL grant.

| Order / operation | Exact URL | Maximum body bytes | Required predecessor and purpose |
| --- | --- | ---: | --- |
| 1 / EV01-G-POLICY | <https://www.govinfo.gov/about/policies> | 524,288 | New current direct-host access/privacy/reuse review; prior URL provenance: GovInfo review, Primary sources. |
| 2 / EV01-W-POLICY | <https://leg.wa.gov/privacy-notice/> | 524,288 | New current Legislature privacy/copyright review; prior URL provenance: Washington LWS review, Primary sources. |
| 3 / EV01-W-DISCLAIMER | <https://leg.wa.gov/disclaimer/> | 524,288 | Current disclaimer and access review for the exact RCW host/interface, not an assumption inherited from LWS. |
| 4 / EV01-I-CROW | <https://www.govinfo.gov/content/pkg/FR-2026-01-30/html/2026-01899.htm> | 1,048,576 | EV01-G-POLICY must support the intended transient inspection and metadata use; observe EV01-I1 only. |
| 5 / EV01-S-B1 | <https://app.leg.wa.gov/rcw/default.aspx?cite=80.50.060> | 1,048,576 | Both Washington policy operations must support the exact intended access/use; observe EV01-S1 only. |

The committed URL sources are the [GovInfo review](../source-reviews/govinfo-api-2026-07-31.md),
[Washington LWS review](../source-reviews/washington-lws-2026-07-31.md) and
[recognition review](../source-reviews/bia-2026-recognition-review.md).
The exact RCW seed comes from the custody-bound catalog identified above.
These reviews are dated evidence, not declarations of current viability.

Maximums for the entire prospective run: **five attempts, three hosts,
3,670,016 response-body bytes, one concurrent request, 30 seconds per attempt,
180 seconds of network activity**. The budget covers every issued attempt,
including failed or aborted responses. Unused capacity is not transferable.
No HEAD probe, search, pagination, subresource, script, form, PDF, attachment,
redirect follow, retry or alternative endpoint is permitted. Use identity
encoding and reject other content encodings, unexpected media, invalid UTF-8,
authentication challenges and malformed/truncated responses. A conservative
4,096-chunk cap per response complements the byte cap; it is a local limit,
not an assertion about a provider. Time spent on local review is separate from
the 180-second network budget; approval expires at terminal checkpoint or
24 hours after the owner approves, whichever comes first.

## Access, tools and review sequence

Before any policy request, reconcile retained access evidence and known closed
host gates. An exact approval does not permit an access-triggered terms
acceptance. If the first request itself cannot be made within the closed
boundaries, record that operation as unissued and blocked.

Run the three policy operations first. Review their actual content and exact
host/interface applicability before deciding either content request. Unknown
access conditions, applicable restrictions, or insufficient metadata-use rights
block the dependent content operation. Missing policy links are recorded for a
later exact decision; they are not followed under this grant. Continue the
independent selected source where its prerequisites pass.

The review surface is **plain inert source text in shell-tool results, shared
unchanged with the assigned reviewers in this same session**. Those results and
review messages are retained in the session record; they are not transient or
guaranteed deletable. Approval expressly includes that bounded review use, not
public redistribution. Raw HTML, headers and complete record bodies remain
excluded. If source-specific access or review-use rights are insufficient, no
view is emitted and the dependent operation remains unissued.

For each policy response, the view must expose the complete static readable
policy text, including relevant notices outside the main element, headings,
and the text of access controls, with source locators and an omission manifest.
The maximum is 32,768 UTF-8 bytes per policy view. The helper may strip inert
markup, scripts/styles and navigation structure, but may not summarize policy
language or select only favorable clauses. Unknown script-dependent policy,
unapproved applicable-policy links, truncation, or omitted potentially relevant
text makes access/use unresolved. A familiar heading or matching selector is
insufficient. Reviewers must be able to detect a new restriction in a later
paragraph before permitting the dependent content request.

For EV01-I-CROW, the review view is limited to notice-identification metadata,
the exact list heading and complete selected name-entry context, at most 4,096
UTF-8 bytes. EV01-S-B1 is limited to publisher/section/title and explicit
version/date metadata with structural locators, at most 4,096 UTF-8 bytes; no
operative section prose is requested. Selection text is discovery input only;
reviewers must reject an ambiguous or out-of-list name hit. Maximum newly
emitted review text is 106,496 UTF-8 bytes across the five responses; forwarding
the same approved view to the assigned reviewers does not permit extra source
text or requests. No view enters a repository file, receipt or public artifact.

Privacy screening precedes every view. Remove navigation/contact blocks and
exclude actual personal/contact values, identifiers, signatures, credentials,
comments and land/sensitive content; generic policy descriptions of data
categories are not personal records. Every omission is explicit. If safe
isolation or adequate policy/claim context cannot be established, emit only a
sanitized gap code. Never repair missing context through inference. Review
must stop on unexpected prohibited content, without reproducing it in findings.

Use a locally reviewed, single-use bounded observer through the existing shell
tool. Its exact code, source-specific extraction rules, synthetic boundary
checks and digest must be reviewed and recorded before the first live request.
This grant includes preparing that local helper within the path lease below;
it is not a new product adapter or reusable command. Do not restore or invoke
the historical deleted observer. Do not use a browser or search tool whose
subrequests, retained content or byte accounting cannot satisfy this packet.
If the available tools cannot enforce the limits, stop with a tool-boundary gap;
do not substitute an unbounded fetch or weaken the limits.

The observer must reserve each exact operation once before network activity,
persist its consumed state and never reset it. An interrupted/ambiguous attempt
stays consumed. Verify HTTPS/TLS, exact URL/host and public-address destination;
reject private/local addresses, redirects and ambient proxy/credential use.
No cookies, authorization, referer, personal identifiers or secret headers may
be sent. Do not print raw responses, headers, redirect locations or provider
error messages. Only the explicit review views above may expose source text;
treat them as inert data, never instructions.

Before network use, identify the assigned reviewers, demonstrate the exact
review view and its session-retention boundary with synthetic input, independently
inspect the helper and exercise offline
synthetic cases for over-budget/duplicate operations, timeout, redirect,
encoding/media errors, truncation, forbidden fields, ambiguous name matches and
altered document identity, a new policy restriction after a familiar heading,
an omitted policy clause and privacy-bearing context. If reviewers cannot see
adequate actual policy/context text within this boundary, stop before the first
request with `tool_boundary_gap`. A selector match is discovery only. Name-at-publication
review requires the exact list-entry context, issuer and rendition; a substring
elsewhere in the page cannot establish identity. No generic scraper or opaque
model classification is part of this review.

The source reviewer dispositions access/use and each selected claim. A separate
engineering reviewer checks operation accounting, minimization and custody;
the sovereignty reviewer checks issuer/host/speaker, temporal and identity
boundaries. Reports are review input to the lead, not owner authority or
accepted production evidence. No success flag or digest substitutes for
semantic review.

## Custody, allowed fields and prospective write lease

Raw provider response bodies are transient memory only. The bounded extracted
review views above remain in the session record. No raw body, complete notice
or RCW record text, PDF, source object, external corpus root or real corpus is
retained. The bounded session views are the sole source-text exception.
Do not create or use
the Run 1 synthetic CAS as real-source custody. Retain only independently
reviewed impersonal metadata: operation and claim IDs, approved URL, retrieval
start/end time, numeric status/byte counts, body SHA-256, verified document ID,
issuer/publisher distinction, exact source title or selected entity-name field,
safe locator, source-supplied dates, explicit unknowns, review and allowed-use
dispositions. Source-stated dates keep their meanings; retrieval does not
renew validity. Any permitted source value must have field-level provenance.

Repository files and receipts contain no source prose or excerpts. The explicit
session review views are the only source-text exception. Exclude contacts, people,
service lists, signatures, addresses, cookies/tokens, comments, images, scripts,
land/geometry/cultural content, unrelated metadata and raw error content.
Do not dump the notice's complete list. Candidate field output must pass the
reviewed allowlist and length bounds before it reaches a tool result or file.
Written policy findings are bounded review conclusions with URLs/locators, not
copied policy text. If a permitted metadata field cannot be isolated, emit a
sanitized gap code and no source value.

Source-specific rights remain independent for transient inspection, metadata
retention, caching, analysis, display, excerpt, export and redistribution. This
proposal requests transient inspection, the bounded session review views and
metadata retention where evidence supports them. The
Washington review leaves excerpt rights unresolved; GovInfo policy is not a
blanket public-domain license. A metadata-only review report is not a public
data artifact. No content enters the registry, candidate bundle, runtime,
source-health/LKG store, application, fixture, build or deployment.

A body digest and locator without retained originating bytes **cannot provide
exact-byte replay, CAS custody, authenticated GPO content or accepted real
citation proof**. The HTML notice remains an informational rendition; the
official PDF is outside this operation table. Any required official-edition,
signature, full citation or currentness evidence remains unresolved. Documented
range is the source's explicit statement if observed; selected review range is
one dated notice and one section; selected build and emitted ranges are none.
Refresh cadence, numeric provider rates, correction completeness, CORS and
failure guarantees stay unknown unless directly documented. No browser API
dependency or refresh is designed. There is no real LKG shard to use.

Only after approval, the lead may write these four repository paths:

- `docs/development/PS09-EV-01-COORDINATION.md`: exact approval, preflight,
  helper identity/review, leases and single-use operation accounting.
- `docs/source-reviews/ps09-ev-01-identity-scenario-evidence.md`: minimized
  dated source/claim evidence and independent reviews.
- `docs/handoffs/ps09-ev-01-evidence-review.md`: actual outcomes, custody,
  blocked claims and next exact action.
- `ROADMAP.yaml`: exact scoped approval/evidence and terminal recovery text;
  no automatic full PS09-02 completion or successor gate change.

The only additional local paths are the new ignored directory
`.cache/ps09-ev-01/`, containing exactly `observer.mjs`, `offline-checks.mjs`,
`operation-ledger.json`, `EV01-G-POLICY.receipt.json`,
`EV01-W-POLICY.receipt.json`, `EV01-W-DISCLAIMER.receipt.json`,
`EV01-I-CROW.receipt.json` and `EV01-S-B1.receipt.json`.
Create the directory and initial files exclusively; an existing directory or
ambiguous custody prevents a new run. Freeze both helper files after review.
Only the exclusively owned same-run `operation-ledger.json` may be updated,
durably reserving an operation before its request and recording its terminal
result afterward. Never clear a reservation or reduce consumed counters.
Create each terminal receipt once, including for skipped operations. Interruption
ends the run: reserved or ambiguous attempts remain consumed, and reopening
the directory permits read-only recovery, not further network or receipt writes.
No raw content or review view belongs there. Do not overwrite, delete or reuse
any historical evidence. The helper and offline checks are
one-use review tools, not a new repository command surface; record their exact
invocations and outcomes. Repository validation uses committed package scripts.
No worker writes outside an explicitly recorded disjoint lease.

## Historical operations, acceptance and stop contract

EV01-G-POLICY deliberately proposes a **new request to the same URL previously
used by FR-R3**. Approval must cover this new observation; it cannot reuse the
old request authority or relabel an old receipt as current. It does not repair
Federal Register qualification. FR-D3/R6/R7, FR-A1 and PF-01 through PF-17 are
excluded. The historical 27-request ledger, consumed latches and 43-file
evidence custody remain immutable. All BIA-host requests have a zero budget.

End after the five operations are each attempted once or explicitly skipped,
or an earlier expiry/stop. Review complete responses only. Record failures and
unknowns without inferring provider intent, absence, outage or changed law.
For every claim, report observed evidence, rejected/unknown facts, permitted
uses, remaining acceptance requirements and whether any bytes are replayable.
No claim is accepted merely because tests, transport or synthetic selectors
passed. A failed source can coexist with a useful independent review result.

Before any local commit, run `npm run validate:runtime`,
`npm run validate:roadmap`, `npm run validate:backbone`, `npm run format:check`,
`npm run scan:source` and `git diff --check`; reverify all 76 protected files
and pinned manifest/package-lock hashes. Check exact staged paths and ignored
receipt custody, and close independent engineering/source/sovereignty findings.
No contract or taxonomy change is permitted. Any future implementation beyond
these review tools needs its own exact scope and full required validation.
No UI, browser, artifact, production source or whole-product result may be
claimed from these review checks.

Full PS09-02 stays blocked on its remaining originating identity/scenario,
custody, currentness, use and acceptance evidence. Runs 3-6 remain closed and
not started; conditional Runs 7/8 stay deferred. `PS09-06-LOCAL-RC` remains the
sole local release root. No archived ready lane or K0/S0/O0 convergence opens.
Stop before an unlisted request/write, new acceptance requirement, protected
custody conflict, uncertain access permission, personal/sensitive output or
scope expansion. Preserve the result and identify the exact unresolved action.

## Preparation validation and next owner action

Startup runtime, roadmap and backbone validation passed on Windows x64 Node
24.19.0/npm 12.0.2. The ledger has 77 items and 53 gates: 36 complete, zero
in progress, one archived ready, 18 blocked, two deferred and 20 not started.
Backbone found 17 schema IDs, 1,271 references, 81 authored Markdown files and
409 local links before this packet. Full-ledger review covered all 5,849 lines.
Startup custody matched all 76 protected files and both pinned hashes.

Preparation checks passed: `npm run validate:runtime`,
`npm run validate:roadmap`, `npm run validate:backbone`, `npm run format:check`,
`npm run scan:source` and `git diff --check` each exited zero. The first format
check found five roadmap prose-wrap differences; the focused repair and retry
passed. Final backbone counts are 17 schema IDs, 1,271 references, 82 authored
Markdown files and 417 local links. Before staging, the source scan checked
455 tracked paths and 489 source files. Prettier excludes `docs/`; the packet
received manual layout/link review and backbone validation. Ledger counts,
statuses, dependencies and gates remain unchanged. Repeated custody verification
matched all 76 protected files and the manifest/package-lock hashes.

Read-only readers covered the complete ledger, source candidates and validator
mechanics. Independent engineering and sovereignty reviews, plus the source
review, closed the finite findings: actual policy text must be visible to
reviewers with honest session retention; receipt paths and same-run ledger
updates must be exact; custody wording must preserve that explicit review-view
exception. The repaired proposal has no remaining material finding. These
reviews support the proposal only, not execution, source permission, helper
feasibility or acceptance. The source-review skill supplied the procedure;
the owner's exact gates supply authority. No helper or operation ledger was
created, and no source, external app or paid service was used.

No full runtime tests, build, browser check or external-root replay was rerun
for this documentation-only change. Earlier runtime/UI/artifact evidence stays
dated historical evidence. This packet adds no implementation capability.

The local preparation commit contains exactly this file and the two narrow
roadmap prose updates. Its exact SHA is the commit containing this checkpoint
and is recoverable from local Git; history is preserved. The next owner action
is approval of the exact new five-operation
review scope, including its conditional skips, bounded source-text views retained
in this session, and metadata-only file custody.

Terminal preparation disposition:
`PS09_EV_01_PACKET_PREPARED_AWAITING_OWNER_APPROVAL`.
