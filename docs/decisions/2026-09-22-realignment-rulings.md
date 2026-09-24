# Realignment rulings (2026-09-22)

Status: owner rulings on the questions raised in
`docs/decisions/2026-09-22-realignment-open-decisions.md` (RD-01 to RD-07) and on
the additional directions the owner gave the same day. Each ruling below is
authoritative once the governance session transcribes it into
`docs/decision-register.md` with the next free D-number; until then this file is
the owner's instruction and the register entry is the record. Rulings are
numbered RL-nn so they never collide with RD-nn (questions raised) or D-nnn
(register entries).

Plain-language names are given with every ID.

## RL-01 Ledger representation and refactor gate (answers RD-01)

Approve schema 1.10 and gate G-GENERAL-DEV-01 (local, synthetic refactor; zero
acquisition budget; no source activation, private data, publication or release
authority). Design the 1.10 representation so that the validator admits the
general-development graph by rule rather than by an enumerated identity list:
an item is admissible when it sits under milestone "General development",
carries `work_class: general_development_local`, carries a `decision_ref` that
resolves to an entry in the decision register, and names one of the
general-development gates. The identity freeze remains in force for every other
milestone. If the validator cannot express this cleanly, fall back to the
enumerated pattern used for 1.7 to 1.9 and record why.

Record an intent, not yet a decision, to consolidate the remaining PS09 items
into the general-development graph in a later planning session, after waves 1
through 3 land. PS09 was the PNW program; with nationwide coverage as core, its
remaining items become done, absorbed, or archived evidence.

Amend the ledger rule sentence in `AGENTS.md` to: "Select only within an
authorized canonical graph: the PS09 graph, or the general-development graph
under G-GENERAL-DEV-01 once represented. An archived ready item is not an
execution grant."

## RL-02 The two pre-existing uncommitted modifications (answers RD-02)

The source change (cleanup preservation in `readOwnedFile`) and the eight test
cases are one piece of work. The governance session reads the diff, writes a
plain-language description of no more than five lines into the session ledger,
and commits both files as one commit labelled as adopted pre-existing work. If
the source change is anything beyond the cleanup preservation described in the
2026-09-19 handoff, stop and show the owner before committing.

## RL-03 The private handoff note (answers RD-03)

Move `.local/handoff/HANDOFF.md` to `I:\policy-sentinel-review\2026-09-19\HANDOFF.md`
next to the evidence it links to, and remove its line from `.git/info/exclude`.
No validator change. Its "next bounded action" (select one improvement from
review section 18) is superseded by this realignment.

## RL-04 Private context as a first-class, user-supplied module (answers RD-04 and goes beyond it)

Private land context is in scope for the engine, as user-supplied data. So are
additional policy pipelines for private policies (a Nation's own codes,
commercial or contractual policies), supplied by the user. Early releases are
"bring your own data". The public engine may therefore contain the code that
handles private context (Module 4 in the addendum), while:

- private data is never committed to this repository, never included in a
  public build or the Pages artifact, and never leaves the user's deployment;
- there is no telemetry and no search logging;
- the public synthetic application remains geometry-free.

Amend the data rule in `AGENTS.md` ("Do not add maps, parcel geometry,
ownership, trust-land, fee-land, Tribally owned parcel, or sensitive land
content. Public builds must reject private adapter inputs.") by adding one
sentence: "A locally run deployment may process such content only when the
user supplies it, under the private-context module rules in
`docs/architecture/general-development-addendum-2026-09-22.md`; a public build
never can." D-010's "documented but unimplemented" wording is superseded by
this ruling; D-068 keeps its recorded scope.

Also in scope: configuration placeholders for credentialed federal or other
sources (an environment-variable reference and never a value; using a
credential remains a per-deployment gate). Later directions, recorded as
directions only: a publicly accessible data push service for Tribes and staff,
and federation in which each deployment manages its own data.

## RL-05 Nationwide public contract (answers RD-05)

Supersede D-004's three-state coverage. Coverage is declared per source and per
jurisdiction through `JurisdictionRef`, with no fixed state list, delivered as
versioned successor contracts with migration fixtures behind
G-GD-NATIONWIDE-CONTRACT.

## RL-06 Area-based policy and the shapefile pipeline (answers RD-06, closes O-023 in modified form)

Adopt Design A generalized: a PolicyContext goes in, citations and a dossier
come out; geometry never enters the shared corpus, a public build, or the
interop wire. The area resolver (geometry in, PolicyContext out) is a core
component of the engine, implemented as part of the private-context module so
that a user can drop a file (zipped shapefile, GeoPackage, GeoJSON, KML, secure
ATNI-GeoPack) into their own deployment and receive the policies that apply to
that area with reasons. The same PolicyContext can also be sent by
land-use-analyzer, GeoBase, TCR-policy-scanner or plan-assessor. O-023 is
closed as adopted in modified form, not rejected. Detail in addendum sections
3 and 4.

## RL-07 Shared Nation reference (answers RD-07)

Adopt a standalone, versioned registry (working name `atni-nation-registry`)
with a public tier keyed `nation:<slug>` bound to the annual recognition
notice, digest-pinned by every consuming application. The internal ATNI tier
(offices, contacts, engagement) stays in the engagement database keyed by the
same slug and never ships in the registry package. G-BIA-IDENTITY is the
registry's first release gate. Interop version 1 exchanges no Nation criterion.
This registry is the first shared data service of the application ecosystem
and the intended vehicle for a future ATNI-published T0 baseline bundle.

## RL-08 Designations, including ceded territory and usual and accustomed areas

Ceded-territory and usual-and-accustomed boundaries are public designations
(T0) as published by their sources, and belong in the designation registry.
They are distinct from T3 culturally sensitive data. Each entry records its
publishing source, legal basis, status (regulatory, adjudicated, informational,
historical) and the publisher's own disclaimer; the engine never asserts a
boundary as a determination.

## RL-09 Storage budget and holding policy

Dedicate about 50 GB on the I: drive to the broad policy corpus (the drive has
roughly 450 GB free, shared with plan-assessor, ATNI-GeoBase and
TCR-policy-scanner). Holding policy is reference-first: metadata, locator and
content hash for everything discovered; full-text custody only for records
admitted by an approved bounded run; tiered caps as set in addendum section 8.
The capacity model (GD-18) validates the split with real numbers before any
larger venue is considered.

## RL-10 Tribal law sources in the nationwide survey

Tribal codes and ordinances enter Policy Sentinel only as user-supplied data
from the Nation itself (RL-04). The nationwide survey does not catalog Tribal
sources for acquisition. Discovery catalogs such as NILL may be named in
documentation as places a Nation can locate its own publications.

## RL-11 BC First Nations and transboundary readiness

Prepare for Canadian First Nations without wiring them: the Nation registry
carries a recognition-authority field from day one (`us_federal` populated;
`ca_first_nation` reserved with no entries), and `JurisdictionRef` reserves the
`ca` and `ca-province:<code>` forms. No Canadian source, boundary or record
work is scheduled.

## RL-12 Makah demo material

Stays exactly where it is (ruling of 2026-09-22, already applied).

## RL-13 Instruction files and agents

Create a repository-level `CLAUDE.md` that imports `AGENTS.md` and adds only
Claude Code operating notes. Trim the state and recovery narrative from the
top of `AGENTS.md` into `docs/continuation-prompt.md`, which is the single
current-state document for a fresh session. Add three project agents under
`.claude/agents/`: `gd-lane`, `gate-verifier`, `source-scout`.

## RL-14 Session plan

Session 1 (this launch): governance plus wave 1. Session R: nationwide source
survey (GD-17) and storage capacity model (GD-18), docs only, may run in
parallel. Session 2: waves 2 and 3. Session 3: wave 4 and the gated items once
their gates open and the survey is in.
