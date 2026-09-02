# PNW product scope and acceptance contract

Status: binding owner direction under the 2026-09-02 planning/governance
rebase. This contract defines the intended product and the present development
definition of done; `ROADMAP.yaml` records the rebase's current and terminal
state. Repository code, tests, artifacts, and Git history remain authoritative
for what is actually implemented, validated, enabled, accepted, or published.

## Product north star

Policy Sentinel is a configurable, sovereignty-centered policy monitoring
engine. It watches a bounded policy landscape, explains why a record was
surfaced, preserves source-supported lifecycle change, and produces usable
outputs without independently deciding what a policy legally means for a
rights-holding community.

Its three product verbs are:

- **Watch:** acquire only bounded, reviewed sources and preserve identity,
  provenance, coverage, health, lifecycle, and last-known-good evidence.
- **Explain:** distinguish source facts, deterministic derivations, community
  configuration, reviewed judgment, generated drafts, unknowns, unavailable
  evidence, and material outside declared coverage.
- **Produce:** project one accepted analyzed corpus through document,
  web-module, application, and structured-output adapters without factual
  mutation.

Policy Sentinel is a reusable engine plus a region pack, a separately governed
community deployment profile, persona projections, and output adapters. The
current static application, print dossier, CSV export, and artifact pipeline
are valuable implementation evidence, but they do not yet constitute that
complete architecture.

## Present and future scope

The present development definition of done is a general engine that can
truthfully support the PNW/ATNI region. The intended target is the 59 current
ATNI Member Tribes across Washington, Oregon, Idaho, western Montana, northern
California, and southeast Alaska. That count and set must not be claimed until
an authoritative current ATNI source supports them.

The public ATNI membership page at
<https://atnitribes.org/membership/atni-members/> is owner-supplied discovery
evidence, not an accepted current roster. It describes a different count and
includes Duwamish. Owner direction excludes Duwamish from the intended current
59-member target, but neither subtraction nor geographic inference may be used
to manufacture the other identities.

Nationwide United States coverage remains the longer-term direction. The
existing 575-entity federal-recognition work is retained as national-scale
identity and validation evidence; it is not ATNI-membership evidence or PNW
completion. Possible Canadian expansion would require a separate identity,
authority, privacy, and source model. United States federal recognition must
not become a universal engine primitive.

## Authority and identity distinctions

The regional model must keep these evidence-bearing relations separate:

- a stable project `SovereignEntity` identity;
- time-versioned `RecognitionAssertion` records, namespaced by authority
  system and jurisdiction; and
- time-versioned `OrganizationMembershipAssertion` records for ATNI or another
  organization.

Federal recognition does not prove ATNI membership. Organization membership
does not prove a source-record association, Nation position, consent,
jurisdiction, eligibility, legal applicability, or rights impact. Names,
aliases, geography, keywords, sponsors, institutional affiliation, and model
output do not create any of those relations.

Community law, plans, resolutions, official statements, and authorized
community configuration have their own source authority. ATNI committees and
resolutions may supply source-bound regional routing and vocabulary; the
owner-supplied committee discovery page is <https://atnitribes.org/committees/>.
NCAI portfolios and resolutions may supply a separately sourced national
crosswalk; the owner-supplied discovery page is
<https://www.ncai.org/section/policy>. Neither layer overrides a Nation or
silently converts organization priorities into a member position.

## Geography, relevance, and rights frames

Reservation boundaries, trust or fee land, allotted land, ceded territory,
usual and accustomed areas, ancestral territory, service areas,
co-management areas, adjudicated or reserved-rights geography, watersheds,
species ranges, project footprints, and agreement areas are distinct relation
kinds, not one landbase field.

Any future `GeographicRelation` must carry its subject and object, asserting
authority, exact evidence, temporal validity, custody and derivation lineage,
visibility and sensitivity, review state, and explicit allowed and forbidden
inferences. A reviewed intersection may support one typed explanation for why
a record was shown. It cannot establish identity, ownership, jurisdiction,
legal applicability, treaty impact, affiliation, consent, or community
position. Public output excludes sensitive or invertible cultural,
subsistence, private, parcel, and land geometry.

Every surfaced record must eventually carry an evidence-bearing `whyShown`
assertion. Planned bases include `community_watchlist`, `source_explicit`,
`general_jurisdiction`, `geographic_intersection_reviewed`,
`rights_frame_rule_reviewed`, `regional_priority_source_explicit`, and
`analyst_reviewed`. Each basis must identify its evidence or configuration,
rule or authoring authority, review state, temporal scope, and non-claims.
Proximity, a name match, a keyword, model output, or organization membership
alone is forbidden.

## Layered architecture contract

The intended flow is:

```text
authoritative sources
  -> bounded source adapters
  -> immutable source facts and source-supported events
  -> evidence-bearing relations and classifications
  -> one canonical analyzed corpus
  -> community and persona projections
  -> document, web-module, application, and structured-output adapters
```

- The **engine core** owns generic identity, serialization, evidence lineage,
  deterministic derivation, lifecycle, coverage, health, review/visibility,
  replay, and projection interfaces.
- A **region pack** references bounded source IDs, jurisdiction vocabularies,
  taxonomy/crosswalk versions, organization and sovereign-entity evidence,
  acceptance scenarios, and explicit gaps.
- A **community deployment profile** contains only authorized identity,
  watch-scope, rights-frame, geographic, terminology, priority, persona, and
  visibility configuration. A candidate or demonstration profile must say so.
- A **persona projection** selects and orders permitted views; it is never an
  alternate fact store.
- An **output adapter** consumes the same accepted corpus and preserves record
  IDs, citations, evidence, timestamps, coverage, review state, visibility, and
  limitations.

`PolicyRecord 1.4`, artifact package `1.4`, source registry `1.19`, and the
current application remain compatible legacy/public-output contracts. They are
not renamed as the analyzed corpus. Successor contracts are required for
region packs, deployment profiles, persona projections, sovereign identity,
recognition, organization membership, evidence-bearing relevance, authority
crosswalks, the analyzed corpus, and output receipts.

K0 is a candidate source of lifecycle/assertion primitives only after its
closed convergence gate is separately opened. S0 remains a removable,
impossible-fixture spatial experiment behind its closed convergence gate. O0
remains a repaired, byte-sealed, unaccepted and unimplemented candidate. None
is a current PNW dependency.

## PNW definition of done

PNW regional completion requires all of the following, with objective
repository evidence rather than planning text:

1. Generic engine seams contain no Nation-, ATNI-member-, state-, committee-,
   persona-, or use-case branch that belongs in configuration.
2. Two materially different synthetic deployment profiles prove isolation;
   one record can serve both without factual duplication or drift.
3. An authoritative current ATNI source supports the exact intended 59-member
   roster, independently reconciled to sovereign identities and federal
   recognition evidence.
4. Typed, temporal, custody-bearing geographic relations preserve sensitivity
   and cannot mutate identity or legal meaning.
5. Federal and each PNW state/regional source family has an independent
   accepted contract, coverage, provenance, lifecycle, health, bounds, and
   last-known-good behavior, or a visible source-specific gap.
6. Source-supported events preserve corrections, amendments, challenges,
   withdrawals, deadlines, and supersession without synthesizing currentness
   or legal effect.
7. ATNI, NCAI, Nation, and originating-source taxonomy authorities remain
   separate, versioned, many-to-many, and deterministically reviewable;
   `Unclassified` remains visible.
8. One versioned analyzed corpus contains records, events, evidence,
   explanations, coverage, health, review state, projection inputs, and
   output-safe visibility with deterministic replay where claimed.
9. Document, web-module, application, and structured-output contracts consume
   that corpus without factual mutation, and at least one required reference
   output from each class passes its applicable citation, accessibility,
   privacy, encoding, and offline tests.
10. Persona views preserve the same facts and enforce public, internal,
    restricted, and privileged boundaries; generated legal, advocacy, grant,
    technical, executive, or public prose remains a draft until designated
    review.
11. Representative PNW scenarios pass without scenario-specific engine
    shortcuts.
12. Integrated source, artifact, browser, accessibility, privacy, security,
    adversarial, and clean-replay evidence passes. Local completion remains
    distinct from publication.

Unknown, unavailable, outside coverage, not observed, not assessed, disputed,
and rejected are distinct states. Partial declared coverage may be useful, but
it is never relabeled as comprehensive.

## Representative acceptance scenarios

The Nez Perce habitat and endangered-species case is the golden scenario. It is
a candidate real-world use case until exact sources, identities, authority,
coverage, and reuse conditions are verified. It must exercise federal
rulemaking, planning/permitting, litigation, Idaho legislation, authorized
Tribal sources, grants, rights-frame context, lifecycle, deadlines, health,
and gaps without producing an automatic treaty-impact, preemption, violation,
remedy, eligibility, or outcome claim.

The suite must also include materially different strata:

- coastal treaty fisheries and habitat;
- Columbia Basin or inland transboundary resources;
- an Oregon source/terms context;
- a Montana policy context;
- a northern California policy context;
- a southeast Alaska context that does not assume a lower-48 reservation or
  Stevens Treaty model; and
- a different or non-treaty authority structure.

Removing the Nez Perce fixture must not break an engine schema. Replacing one
deployment must not require source-adapter code changes. Treaty, U&A,
reservation, Alaska, state, and local relations remain optional typed evidence.
Persona and output selection cannot change classification, source association,
lifecycle, `whyShown`, or legal non-claims.

## Binding non-claims and release boundary

Policy Sentinel is not legal advice, a comprehensive legal database, a
rights-impact or applicability engine, an official-source substitute, an
authority on identity or affiliation, or a replacement for consultation,
counsel, technical review, or community decision-making. It performs no
browser-side provider/model calls, telemetry, analytics, tracking, or outbound
notification in ordinary public use.

Planning, schemas, synthetic fixtures, contracts, passing tests, or an isolated
adapter do not establish PNW completion. Local PNW completion would not
authorize a remote, push, Pages configuration, release, or publication.
