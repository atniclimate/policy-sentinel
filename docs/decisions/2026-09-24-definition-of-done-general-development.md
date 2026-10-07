# Definition of done: Policy Sentinel general development (1.0 local)

Status: owner-confirmed definition, 2026-09-24, adopted as D-081;
implementation sequence and source acceptance refined by D-086 on 2026-10-06.
It defines what "done" means for the general-development
release. It is measured by demonstrations, not by gate closures; the ledger
items are the means. It authorizes no operation by itself; each acquisition,
gate and release step keeps its own decision.

The name "1.0 local" means a versioned, self-contained local deployment. It
is not a public release, a remote publication, or a hosted service; those
remain separate decisions.

## Part A. Demonstrations (acceptance evidence)

1.0 is done when all four have been performed and recorded with dates,
people (by role), observations and evidence paths.

| # | Demonstration | What it proves | Evidence to record |
| --- | --- | --- | --- |
| A1 | A Tribal staff member who is not the owner installs a deployment from the release package on a second machine, loads the T0 baseline bundle, supplies their own area file and their own policy documents, runs one area query and one topic query, receives a dossier with citations and why-shown, entirely offline, and can state what the output does and does not establish | The product is usable by its intended user without the developer present | Task script, wall time, errors, the user's statement of limits, no private data left the machine |
| A2 | An operator who is not the owner prepares a bounded source population from a state other than Washington through the source catalog and the bounded runner, with every code or recipe change written down | The engine is reusable; the boundary between shared core and per-source recipe is real | The change log, the run receipts, the catalog rows |
| A3 | A successor restores the evidence package (custody namespace, receipts, sealed corpus) in a second location without chat context and replays citations byte-identical | Operational continuity | The restore procedure as executed, replay digests |
| A4 | land-use-analyzer or plan-assessor sends a synthetic PolicyContext and receives `policy.citations/1` through the pure adapter, with the conformance suite green on both sides | The ecosystem contract works end to end | Both suites' results, the exchanged payloads |

## Part B. Capability checklist (the means)

Each line maps to a ledger item; a line is satisfied by that item's
`complete` status with its acceptance evidence.

| Capability | Ledger items | Notes |
| --- | --- | --- |
| Module boundaries enforced; sealed 2.0 corpus replays unchanged | GD-04, GD-05, GD-06, GD-07, GD-08, GD-10 | Waves 2 and 3 |
| Nationwide identifiers and contracts: `JurisdictionRef`, record and artifact successors, v2 jurisdiction association | GD-09, GD-11, GD-13 | GD-13 behind G-GD-NATIONWIDE-CONTRACT |
| Source catalog with reviewed rows for federal, all 50 states, DC and the territories | GD-12, GD-17, GD-33 | Initial finite matrix before pilot catalog; complete nationwide survey before release |
| Federal families fully wired: Federal Register, GovInfo, eCFR, Regulations.gov and Congress.gov must each exercise the required API route through bounded live retrieval, custody, offline search and citation export | GD-12 and implementation packets represented by GD-31 under D-086 | Credential references are never values; a placeholder or manual import does not complete a required API. Source-specific credential blocks remain explicit |
| Starting state custody: at least three states (Washington and two others), each under its own current review and bounded manifest; measured expansion follows the selected region including NV and whole-state APIs within 50 GB total managed data | GD-18 and implementation packets represented by GD-31 under D-086 | Existing custody establishes the baseline; acquired batches calibrate capacity. Nationwide forecasts remain distinct from measurements and do not delay the pilot |
| Deterministic official-label taxonomy mappings for the federal family and each activated state | GD-14 and a successor item per activated state | Keyword and AI classification stay forbidden |
| Area resolver on the five input formats, synthetic fixtures plus one owner-supplied real file in a private deployment | GD-19 | Public-entry reachability test enforcing |
| Designation registry v1 with the starting entries; PolicyContext v1; user-supplied source class | GD-20, GD-21, GD-23 | |
| Nation registry v1 released after G-BIA-IDENTITY and bound | GD-22 and the registry repository | |
| Analyst research loop in the workbench: draft a finding, attach evidence, review, revise, export | GD-25 (new) | Required for A1; today findings are consumed from prepared JSON only |
| Reproducible checks: hook tests independent of ignored historical receipts; Claude Code mechanical gates in `.claude/settings.json` | GD-26 (new) | Required for A3 |
| Local release package: versioned, install document, T0 baseline bundle v0 as a local file; PS09-06-LOCAL-RC consolidated into this root | GD-27 (new) | Required for A1 and A3; the consolidation D-071 recorded as intent |
| Storage capacity model measured and `storage:report` in place | GD-18 | |
| Architecture and backbone documents describe the built system, with a short current-execution front door | GD-15 | Deep review improvement 6 |
| Interop pure adapter with conformance suite | GD-16 | Behind G-GD-INTEROP; required for A4 |

The [2026-10-06 development revision](2026-10-06-development-plan-revision.md)
(D-086) refines the implementation order and acceptance evidence. It adds
successor authority/manifest and release-crosswalk preparation (GD-31), bounded
storage/search design (GD-32), and the complete nationwide survey (GD-33,
split from the finite initial GD-17 matrix). Required APIs must be exercised
through their actual API route into usable evidence. The earlier analyst pilot
does not complete Parts A or B. GD-27's dependency list must cover these tasks
and every existing Part B capability; release-root migration remains explicit.

## Part C. Not in 1.0

These stay outside 1.0 whatever else is finished, each behind its existing
gate or a later decision: a continuous monitoring or refresh service; outbound
notifications; public or Pages deployment; the data push service; AI
summaries; Canadian First Nations wiring; publication to a remote repository;
county-level nationwide custody; full-text custody of everything discovered.

## Part D. Rules for using this definition

- A ledger item's `complete` is bounded acceptance of that item. 1.0 done is
  Part A performed plus Part B complete plus Part C untouched.
- Demonstrations are performed by people other than the owner where the row
  says so, and recorded as dated handoffs under `docs/handoffs/`.
- Adding a Part B line is a planning act (a register entry and a ledger
  item), not a validator change.
