# Data governance

## Purpose and authority

Policy Sentinel is a general source-reference and policy-monitoring engine; its
current static application is one public discovery-output precursor. Neither
the engine nor an output is legal advice, a comprehensive legal database, a
rights-impact engine, or a substitute for an official source. The official
source controls whenever a source fact represented by this project differs.

Use current primary documentation to approve each source and adapter. Data.gov
may help locate a dataset, but the originating legislature, court, agency, or
government is the authority. An opaque scraper is not an acceptable primary
production source. Record source terms, attribution requirements, authentication,
rate limits, historical range, update behavior, and permitted reproduction
before enabling an adapter.

The retained United States federal-recognition collection contract intended for
the current application is based on the Bureau of Indian Affairs annual
recognition list, currently the notice stating 575 entities published January
30, 2026
([Federal Register notice](https://www.federalregister.gov/documents/2026/01/30/2026-01899/indian-entities-recognized-by-and-eligible-to-receive-services-from-the-united-states-bureau-of)).
The [Tribal Leaders Directory](https://www.bia.gov/service/tribal-leaders-directory)
may support official-name reconciliation and documented aliases, but it is not
the recognition authority. No production collection exists yet; the current
application artifact uses explicitly synthetic Nation rows. Do not publish TLD
contacts, addresses, or geometry.

The retained application artifact must distinguish synthetic Nation fixtures
from a production United States federal-recognition collection. Synthetic
manifest and baseline flags must agree, and synthetic rows cannot claim
reviewed identities, official crosswalks, source evidence, provenance, or
source health. That production recognition collection requires exactly 575
collision-free reviewed identities, an explicit identity rule, a completed
publication review, a validated source-paragraph reconciliation, current
source health, and complete baseline evidence and field provenance. The
contract can represent 577 source paragraphs reconciled to 575 identities, but
it supplies no grouping or exclusion rule; `G-BIA-IDENTITY` remains closed until
an authoritative rule is documented. These requirements do not turn United
States recognition or the number 575 into universal engine primitives.

The federal-recognition collection and an ATNI regional membership registry
are different products of different authorities. The intended PNW scope is 59
current ATNI Member Tribes, but the owner-supplied public ATNI directory is not
accepted evidence for that exact current set. Do not derive the set by
subtraction, geography, or intersection with the federal list. A successor
model must keep stable sovereign identity, time-versioned recognition, and
time-versioned organization membership as separate evidence-bearing relations.
Duwamish is excluded from the intended current target by owner direction; that
direction neither deletes historical evidence nor supplies the missing roster.

## Provenance and validation

Preserve exact source values separately from normalized display and filter
values. Every source-derived field must have field-level provenance that records:

- the exact field path and originating source identifier;
- the official source URL and, when different, the official full-text URL;
- retrieval time and source update time when supplied;
- the adapter, transform, taxonomy-map, and schema versions that affected it;
- validation state and any applicable source-content checksum.

Never fill an unavailable value by inference. Use an explicit unknown or absent
state. Preserve action and status histories when an official source supplies
them. A record is publishable only after schema validation, semantic validation,
URL and identifier checks, and source-specific fixture or contract checks.
Validation errors quarantine the candidate record; they must not mutate the
last-known-good public record.

The implemented local artifact package records a data-as-of time, per-source
retrieval and coverage dates, source health, validation outcomes, and content
hashes. No deployment manifest or scheduled/manual workflow currently exists.
A future approved weekly or manually dispatched refresh must preserve those
fields, may mark records new or changed, and may expose deterministic deadline
or status alerts. It must not send email, text, Slack, or other outbound
notifications.

If refresh fails, retain the last-known-good source data and label its actual
freshness and degraded health. If no prior valid data exists, omit that source's
records and show it as unavailable. Never represent stale or absent data as
current.

## Nation relationships

A public Nation-to-record association requires source-explicit evidence. Store
the Nation's stable internal identifier, the exact official name or authorized
alias present in the source, the exact evidence passage or structured source
field, the source document identifier, and the evidence URL. Validation must
confirm that the stable identifier and official name match the validated Nation
collection, the evidence contains that exact official name or reviewed alias,
and the evidence URL belongs to that official record.

State coverage is a separate reviewed crosswalk, not an inference. Every
accepted WA, OR, or ID code requires authoritative source text, identifier,
URL, source and retrieval dates, validation state, and matching field
provenance. Without that evidence the entry remains federal-only with no state
coverage claim.

Do not derive or publish a Nation association from:

- AI output;
- keywords or semantic similarity;
- geography, territory, maps, parcels, or land status;
- a general topic, population, program eligibility, or statewide effect;
- a sponsor, issuing body, or nearby place unless the official record itself
  states the relationship.

County records require an explicit Nation mention in the official final record.
An agenda, search result, location, map, or inferred territorial overlap is not
enough. A state or federal record without an explicit Nation association may
appear only as `general jurisdiction`, never as Nation-specific. The comparison
mode applies the same evidence standard independently to every selected Nation.

The relevance basis is descriptive evidence, not a legal conclusion. Supported
labels include `explicit Nation reference`, `general jurisdiction`, `landmark`,
and another documented source-defined basis. The result view must explain the
basis with a visible "why shown" label.

Future community, regional-priority, rights-frame, or reviewed geographic
explanations require a separate typed assertion with its exact authority,
evidence/configuration, deterministic rule or author, review state, temporal
scope, and non-claims. Organization membership, proximity, and geometry alone
remain insufficient. Geographic intersection must never mutate identity,
source association, jurisdiction, ownership, legal applicability, treaty
impact, consent, or community position.

## Category integrity

Category membership is many-to-many and comes from the versioned, human-readable
taxonomy configuration. Populate it only through a documented deterministic map
from an exact official source subject heading or official topic label. Every map
entry records the source, exact source label, target category and optional
subcategory, mapping version, rationale, and review provenance.

Do not use AI classification, semantic similarity, or keyword-only rules to
populate public categories. A record whose source has no official subject, or
whose official label has no approved exact mapping, remains `Unclassified`. It
stays discoverable by official title, source, jurisdiction, document identifier,
and legally usable official text or index. Category selection must provide an
`Unclassified and other records` route rather than silently excluding it.

## Inclusion, history, and exclusion

Eligible public records include bills and statutes in all supported statuses;
regulations, rulemakings, executive actions, notices, and implementation
material; grants; litigation and administrative decisions; public state or
federal intergovernmental accords; county policies and ordinances that explicitly
name a Nation; and officially published Tribal government documents.

Source coverage is never assumed to be universal. Publish the actual available
date range per source. Before 1980, prefer a citation and official link for
non-landmark records over an extensive summary. Detailed landmark treatment
requires a verified treaty, court decision, statute, or public state/federal
accord that satisfies the written inclusion criteria, or an official source that
identifies it as foundational. Verification includes the primary identifier,
date, status, official citation or text location, and reproduction permission.

Exclude from the public beta:

- municipal and city policy sources;
- non-public agreements and Tribal materials that are not officially published;
- records lacking a permitted official source or required validation;
- county records without an explicit Nation mention;
- private, personal, credentialed, or sensitive material;
- source text whose terms do not permit republication.

Exclusion from a category is not exclusion from discovery: otherwise valid
unmapped records are `Unclassified`. Full official language or a lengthy official
abstract may be reproduced only when source terms allow it. Otherwise publish an
exact citation, a short source-provided excerpt when permitted, and the official
full-text link.

## Public and private boundary

The public repository contains source code, schemas, taxonomy and adapter
configuration, documentation, synthetic fixtures, instructions, disclaimers,
and approved deployment configuration only. Do not commit raw corpora, cached
API responses, generated policy data, generated AI summaries, real
Nation-specific configuration, credentials, personal data, or private data.

For the retained static application, an approved Pages deployment artifact may
contain approved generated public data. Everything in that artifact is publicly
inspectable. A future document, web-module, application, or structured-output
adapter requires its own approved output and delivery boundary. Hidden or
dot-prefixed paths are not private. No API key, token, credential, private
endpoint, secret, or personal data may enter client code, source maps, assets,
commits, logs, fixtures, or documentation. Approved GitHub Actions secrets
remain build-time only.

The public beta must contain no maps, parcel geometry, land ownership, trust-land
data, fee-land data, Tribally owned parcel data, or sensitive land context. Land
data must not filter results or establish relevance. The public interface must
not imply that its records represent a Nation's complete land interests.

An unimplemented private-extension contract may allow an authorized user to
download an approved source and connect private land context in a separate
private deployment. Its stub must contain no data, credentials, sample sensitive
locations, telemetry, automatic data transmission, or automatic export path.
Activation requires documented Tribal authorization, private-build controls,
and a separate approval. Public builds must reject or omit the private adapter
and its outputs. Private material must never flow into a public build, cache,
log, test fixture, AI input, or deployment artifact.

## Optional AI summaries

AI is optional and build-time only. The public site must work without it and
must make no browser-side LLM call. Display a summary only after the visitor
opens record details, label it `AI-generated source summary`, and place cited
official inputs, source dates, and links beside it.

An approved summary must be succinct, professional, objective, and contain no
em dash. It must make no legal conclusion, rights determination, relevance
claim, or assertion unsupported by its cited inputs. Store model and build
provenance with the cited input set. If no approved summary exists, show source
metadata and permitted official language only; never generate a substitute in
the browser.

## Attribution, corrections, and removal

Carry source-required attribution into the record, dossier, CSV metadata where
appropriate, and deployment notices. Grants.gov content must include:

> This product uses the Grants.gov API but is not endorsed or certified by the
> U.S. Department of Health and Human Services.

Follow the [Grants.gov API terms](https://www.grants.gov/api/terms-conditions)
and each source's current terms. Because Grants.gov API access or use
constitutes acceptance of those terms, make no request and publish no
Grants.gov content until the owner explicitly opens G-B-GRANTS for the exact
then-current terms and build-time operation. Acknowledge the earlier ATNI
Climate Resilience Program Policy Sentinel work while stating that this is an
independent project; do not imply endorsement by ATNI, a Nation, or any source
agency.

Evaluate a correction against the current official source. Record the affected
stable ID and field, old and corrected source values or hashes, evidence URL,
retrieval time, reason, reviewer, and release. Preserve history when appropriate.
If a Nation association, publication right, privacy condition, or official
status cannot be verified, quarantine or remove the affected public content
until resolved and disclose the correction in source health or release notes.
Never silently rewrite evidence or use an AI-generated correction.

No telemetry, search logging, tracking pixel, or automatic user-data
transmission is permitted in the public beta.
