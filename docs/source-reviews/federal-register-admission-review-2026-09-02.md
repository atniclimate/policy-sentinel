# Federal Register bounded admission review

Date: 2026-09-02

Parent work item: `PNW-05-SOURCE-PACK`

Authorized tranche: `PNW-05-SRC-FEDERAL-REGISTER-ADMISSION-REVIEW`

Roadmap/review source ID: `SRC-FEDERAL-REGISTER`

Runtime source-registry ID: `federal-register`

Review mode: metadata-only and no-fetch

Review recommendation: `NO_GO`

Source-review disposition: `evidence blocked`

Owner acceptance: not asserted; the fail-closed source state remains not
admitted unless the owner separately accepts and authorizes a later operation

Terminal disposition:
`PNW_05_FEDERAL_REGISTER_ADMISSION_REVIEW_COMPLETE_EVIDENCE_BLOCKED_SOURCE_NOT_ADMITTED`

## Executive determination

`SRC-FEDERAL-REGISTER` is not admitted. The existing evidence supports a
technically plausible future contract for a narrow Tier-1 published-document
metadata and link profile, but it does not satisfy a real-source admission
contract. The current PNW-05 source-pack contract is deliberately
`synthetic_test_only`; its runtime rejects the real `federal-register` registry
entry because that entry is non-synthetic, API-backed, and outside the fixture
trust domain. No real-source successor or compatibility contract exists.

Independent blocking evidence also remains absent or unresolved: current API-
specific use terms and privacy/retention behavior; stable paging and result-
window behavior; numeric rate and concurrency limits; retry, timeout, SLA, and
change-management rules; formal response and error schemas; an accepted field
allowlist; an exact selected coverage range; real configuration authority and
review receipts; operation grants; and source-, jurisdiction-, and source-
within-jurisdiction health plus last-known-good evidence.

The no-go recommendation is not a conclusion that the originating publication
is untrustworthy. It states that Policy Sentinel lacks the exact bounded
contract and current evidence required to use the service as a production
source. It is an evidence review, not owner acceptance. The source remains
documentation-only for PNW purposes. Runtime source
`federal-register` remains `enabled: false`, inactive, unbound, absent from the
public artifact, and non-authoritative for this review. Its retained adapter is
historical implementation evidence only.

No external request, provider read, redirect, credential, account, cookie,
terms action, or production-content operation occurred in this tranche. No
source registry, schema, adapter, source-pack runtime, fixture, application, or
artifact path changed.

## Authority, inputs, and evidence classes

The owner authorized only an offline decision review of the existing
[FederalRegister.gov documentation dossier](federal-register-api-2026-09-02.md),
the current repository contracts, and the accepted authority/non-inference
rules in the preceding
[documentation-review handoff](../handoffs/pnw-federal-register-doc-review-2026-09-02.md).
Provider retrieval, terms action, source admission, activation, and every other
tranche were expressly excluded.

This review preserves the earlier dossier's evidence classes:

- `DOCUMENTED` means the cited originating documentation supported the fact at
  the earlier review's access date.
- `OBSERVED` means a bounded dated observation in that completed review, not a
  continuing provider promise.
- `UNKNOWN` means the earlier evidence did not establish the fact.
- `OWNER_HYPOTHESIS` remains an acceptance input or lead, never external fact.
- `REPOSITORY_CONTRACT` means a claim proven only about current local bytes and
  tests.

No class was promoted because this admission review performed no fetch. In
particular, 2026-07-31 registry prose, 2026-09-02 documentation, and 2026-09-03
UTC observations remain dated evidence rather than current operational facts.

## Conjunctive admission decision

Admission is fail-closed and conjunctive. A bounded candidate can be useful for
future design while still failing admission. `PASS_BOUNDARY` below means the
review can state a safe negative or separation rule; it does not satisfy all
admission predicates.

| Predicate | Evidence mapped | Result | Admission consequence |
| --- | --- | --- | --- |
| Exact source identity | The dossier distinguishes roadmap ID `SRC-FEDERAL-REGISTER`, runtime ID `federal-register`, OFR/NARA publication service, issuing agencies, GovInfo custody, and external dockets. | `PASS_BOUNDARY` | Identities can support a future design only; none implies admission. |
| Publication authority and rendition custody | FR-E08 through FR-E12 distinguish official GovInfo edition custody from endorsed but unofficial FederalRegister.gov HTML/XML and from issuer authority. Signature validation was not performed. | `PASS_BOUNDARY` | Retain separate publisher, issuer, custody, rendition, and verification states. |
| Real-source contract substrate | [`SourcePackBundle 1.0.0`](../../src/engine/source-pack-contracts.ts) requires `synthetic: true`, `trustDomain: synthetic_test_only`, synthetic evidence, synthetic review, and synthetic admission states. [`resolveCanonicalSource`](../../src/engine/source-pack.ts) accepts only fixture-access sources with fixture-backed adapters. | `FAIL_BLOCKING` | Runtime source `federal-register` is non-synthetic/API-backed and cannot lawfully enter this contract. No successor exists. |
| Formal provider contract | FR-E01 and FR-E03 establish OpenAPI 3.0.0, a blank semantic version, 14 documented paths, and 56 requestable fields, but no complete response or error schema. | `BLOCKING_UNKNOWN` | Requiredness, nullability, stable media, error shape, and compatibility cannot be asserted. |
| Purpose-limited field allowlist | The dossier proposes a Tier-1 inventory and excludes high-risk/default fields. No implemented or accepted real-source contract binds it. | `FAIL_BLOCKING` | A proposal cannot become a retention or transformation grant. |
| Terms and reuse | FR-E08 supports reproduction of material appearing in a Federal Register edition; it does not cover linked content. Human API/site pages redirected to an unapproved host and were not followed. | `BLOCKING_UNKNOWN` | API-specific polling, caching, bulk use, redistribution, attribution, and clickthrough conditions remain unresolved. |
| Privacy and retention | GovInfo privacy evidence is provider-specific. No accessible FederalRegister.gov API/site privacy, logging, cookie, or request-retention statement was established. | `BLOCKING_UNKNOWN` | Tier-2 text and person-, contact-, location-, comment-, and linked-content fields remain excluded. |
| Authentication and request limits | OpenAPI declared no security scheme and bounded reads were credential-free. Numeric rate, quota, concurrency, and permanence of keyless access were not documented. | `BLOCKING_UNKNOWN` | A dated no-key observation cannot create an operation grant or safe schedule. |
| Paging and snapshot behavior | Page size 1-1,000 is documented; one tiny search observed count, pages, and a next URL. Stable total cap, ordering, cursor lifetime, and snapshot consistency are unknown. | `BLOCKING_UNKNOWN` | No complete or reproducible retrieval plan can be admitted. |
| Retry, timeout, availability, and change management | The earlier review found no retry/backoff, timeout, SLA, incident channel, compatibility promise, deprecation schedule, or change-notice contract. | `BLOCKING_UNKNOWN` | Failure handling and drift detection are not source-supported. |
| Coverage declaration | A 1994-forward published-document search history is documented; GovInfo's 1936 collection is separate. This tranche selected and emitted no range and no records. | `FAIL_BLOCKING` | Documented range: 1994-forward candidate. Selected range: none. Actual emitted range/count: none/zero. No production coverage exists. |
| Lifecycle and correction semantics | Published documents remain permanent publication records; corrections and later dispositions must remain separate dated records. Formal relationship shapes remain incomplete. | `PARTIAL` | Safe preservation rules exist, but no admitted lifecycle contract or replay proof exists. |
| Configuration authority and review | The owner authorized this decision review only. No real-source configuration authority binding, accepted contract/coverage review, or time-bounded admission receipt exists. | `FAIL_BLOCKING` | Review authority cannot be converted into acquisition, retention, transformation, analysis, redistribution, or projection authority. |
| Operation grants | The source-pack contract treats six operations as independent. None was authorized for the real source. | `FAIL_BLOCKING` | All real-source operations remain prohibited. |
| Availability, health, and last-known-good | No current three-scope observations, approved public shard, checksum-bound LKG record, or source-specific degraded-state proof exists. | `FAIL_BLOCKING` | Dated successful probes and retained adapter tests are not health or LKG evidence. |
| Registry and adapter state | Registry 1.19.0 keeps `federal-register` non-synthetic and `enabled: false`, with retained adapter 1.0.0 and 2026-07-31 configuration prose. | `PASS_BOUNDARY` | The entry and adapter remain historical evidence; neither satisfies admission or currentness. |
| Nation, organization, and jurisdiction authority | The dossier proves only source-specific federal publication facts and explicit noncoverage. | `PASS_BOUNDARY` | No Nation association, Nation position, membership, consent, consultation sufficiency, jurisdiction, applicability, or rights impact may be inferred. |
| Taxonomy | Exact `topics` and `cfr_topics` can remain scheme-distinct source labels. | `PASS_BOUNDARY` | Only an exact versioned provenance-bearing mapping may classify; otherwise `Unclassified`. Classification never proves relationship or legal effect. |

Because the failed and unknown predicates are conjunctive requirements, the
only supportable review recommendation is no-go with disposition
`evidence blocked`.

## Candidate-only metadata boundary

No field is admitted or implemented. A future, separately authorized contract
design could start with this purpose-limited Tier-1 candidate:

```text
document_number
title
type
subtype
publication_date
effective_on
comments_close_on
signing_date
citation
volume
start_page
end_page
agencies.raw_name
agencies.name
agencies.id
agencies.slug
agencies.parent_id
docket_ids
regulation_id_numbers
cfr_references
topics
cfr_topics
```

Every value would remain source-specific, field-provenanced, and subject to
missing/null/malformed fixtures. Dates would remain source-stated rather than
legal-effect conclusions. `topics` and `cfr_topics` would retain distinct
schemes and map only by exact, versioned, provenance-bearing rules.

Tier-2 `abstract`, `action`, `disposition_notes`, corrections, and related-
document structures remain excluded pending a separate demonstrated need,
privacy decision, exact shape contract, and relationship replay proof. Typed
FederalRegister.gov/GovInfo URLs remain candidate links only. A URL grants no
authority to retrieve, retain, reproduce, or trust its target.

Public inspection, document bodies, images, popularity, comments, attachments,
expanded dockets or RIN objects, contacts, people, addresses, signatures,
sensitive cultural/location content, and unreviewed fields remain excluded.

## Authority and non-inference decision table

These negative cases are binding admission criteria for any future design.
They are decision-table requirements here, not runtime tests or source
admission.

| Adversarial promotion | Required result |
| --- | --- |
| A verified ATNI or NCAI resolution plus membership/delegate evidence becomes every member Nation's position, assent, consent, or proof of its recitals. | Attribute only the issuing organization's adopted position within dated custody, adoption, quorum, amendment, withdrawal, expiration, and supersession evidence. Membership remains separate and proves no Nation identity, recognition, assent, jurisdiction, eligibility, applicability, or rights. Test ATNI and NCAI independently; never inherit across organizations. |
| A BIA recognition notice, exact Nation name, federal agency, sponsor, or Tribal/Indian topic becomes ATNI/NCAI membership or a Nation relationship. | Recognition, organization membership, exact mention, and typed source association remain distinct. A mention can support only the exact reviewed relation it states. |
| A `near` filter, place name, address, topic, CFR topic, or issuing agency creates Nation association, community relevance, jurisdiction, legal applicability, or rights impact. | Treat search/geography as discovery only. Preserve source schemes; exact deterministic mapping or `Unclassified`. No classification creates a sovereign or legal predicate. |
| Roadless API `docket_ids: []` is filled from title, text, owner prose, or expectation. | Preserve the empty structured array. Keep any docket identifier in the unofficial text rendition as separate source/rendition evidence unless a later contract explicitly authorizes parsing and provenance. |
| Docket co-occurrence or nullable `related_documents` creates correction, supersession, or semantic relationship. | Require an explicit provider-supplied relationship label, verified target, direction, and replay. Shared dockets and keywords prove no relationship. |
| A Regulations.gov link inherits Federal Register authority, reuse, completeness, or ingestion approval. | Treat the outbound system as a separate source, lifecycle, privacy, rights, and activation contract. |
| `Proposed Rule`, `action`, `effective_on`, a deadline, correction, or withdrawal becomes final/codified/current law, rescission, treaty effect, consultation sufficiency, consent, applicability, or rights impact. | Preserve exact source language and event stage. Corrections are additive and earlier records remain. Never synthesize a legal conclusion. |
| USDA/OFR says consultation occurred or summarizes comments, so a Nation is marked consulted, consenting, or supportive. | Attribute only the issuing agency's narrative. Require Nation-originating evidence for a Nation position; do not assess procedural or legal sufficiency. |
| OFR/NARA publication metadata becomes issuing-agency substantive authority, FederalRegister.gov HTML/XML becomes signed official custody, or the retained registry prose becomes current proof. | Keep issuer, publisher, rendition, official custody, signature state, external source, and dated local configuration separate. |
| Tier-2 or nested structures leak contacts, people, comments, addresses, agency descriptions/logos, supporting documents, or sensitive locations. | Exclude those fields. Federal Register reproduction evidence does not flow to linked or third-party content. |
| This no-fetch review promotes prior observations or owner hypotheses into current terms, limits, coverage, health, LKG, or admission evidence. | Preserve `UNKNOWN`; selected range and emitted range remain none; source stays disabled, inactive, unbound, and non-production. |

## Case-boundary results

### Point Roberts broadband

`PASS_BOUNDARY`: Federal Register data may supply general federal-program
context only when an exact published document states it. It cannot establish a
complaint, preliminary or final court relief, trial date, award, recipient,
county permit, software behavior, archaeological or cultural-resource fact,
consultation sufficiency, Lummi Nation position, treaty applicability, or case
outcome. The supplied dates remain `OWNER_HYPOTHESIS` pending originating court
evidence. No sensitive site identifier, coordinate, map, quantity, or exhibit
is retained.

### Roadless Rule rescission proposal

`PASS_BOUNDARY`: Earlier evidence supports only the dated identity and source-
stated proposal facts for document `2026-16965`, including proposed-rule stage,
`91 FR 53827`, 2026-08-20 publication, 2026-09-21 comment deadline, RIN
`0596-AD66`, and 36 CFR part 294. The structured API observation's
`docket_ids: []` remains empty. Docket `FS-2025-0001` in the unofficial text
rendition remains separate rendition evidence.

The notice's description of prior engagement is USDA's account, not an
independently verified Nation position or consultation-sufficiency finding. A
proposal is not a final rescission, site-specific authorization, treaty
determination, geographic conclusion, or rights-impact finding.

### Intertribal and national organization records

`PASS_BOUNDARY`: A canonically verified, adopted ATNI or NCAI resolution can be
primary evidence only of that issuing organization's dated adopted position.
It is not automatically the position of each member Nation and is not
independent proof of factual or legal recitals. Membership, delegate authority,
adoption, quorum, amendment, withdrawal, expiration, and supersession each need
dated provenance. No organization record was verified or onboarded here.

## Source-pack compatibility finding

The current [source-pack architecture](../architecture.md#pnw-05-synthetic-source-pack-core)
proves an offline structural core, not real-source admission. Its bundle is
synthetic, its evidence class is `repository_authored_synthetic_test`, its
contract qualification is `synthetic_test_qualified`, and its review/admission
states are synthetic-test states. The runtime additionally requires the
canonical source to have fixture access and a fixture-module adapter. Runtime
`federal-register` instead has `synthetic: false`, `access.method: api`, and a
retained source adapter path. It therefore fails the trust-domain check before
any admission plan could be produced.

That rejection is required behavior, not a missing registry toggle. Changing
`enabled`, fabricating a synthetic receipt, reusing the retained adapter, or
binding the documentation dossier into the synthetic fixture graph would
launder authority across trust domains. A real-source onboarding path requires
a separately versioned successor or compatibility design and its own consumer,
migration, fixture, privacy, operation, health, and activation review.

## Canonical-Markdown validator-exclusion audit

The audit found a material preexisting defect: the backbone validator excluded
twenty reserved owner-input Markdown paths by filename alone. An arbitrary byte
replacement or a Git-tracked/canonical file at one of those paths therefore
escaped link validation. A canonical Markdown file could also link to an
excluded input and silently make it a repository dependency because target
checking tested only filesystem existence. Link-bearing raw HTML was not
parsed, and symbolic-link/junction aliases were skipped during inventory, so
each could hide the same dependency. A tracked Markdown file under a directory
excluded by basename could also escape inventory.

The repair is custody-bound and fail-closed:

- the exemption manifest is now the exact twenty path plus SHA-256 tuples for
  the accepted owner-input bytes;
- a file is exempt only when its relative path and digest match, Git reports it
  as untracked through `git ls-files --others --exclude-standard -z`, and its
  case-normalized path is absent from the current `HEAD` tree;
- changed line endings, byte edits, renamed or newly supplied files, ignored
  files, staged files, intent-to-add files, and tracked/committed files are not
  exempt and are validated normally;
- failure to inventory Git-tracked paths fails the validator; failure to obtain
  positive untracked custody yields no owner-input exemptions;
- canonical inbound links to a custody-exempt owner input are rejected,
  including case variants on case-insensitive filesystems;
- standard/custom-element raw HTML opening tags and unknown tags with assigned
  attributes are rejected in canonical Markdown so alternate URL-bearing
  attributes, embedded styles, or nested elements cannot bypass the validated
  Markdown-link path; URI autolinks and template placeholders remain Markdown;
- symbolic links, junctions, and link-target traversal through such aliases are
  rejected in the authored Markdown boundary;
- Git-tracked Markdown must appear in the authored inventory, and local links
  to existing Markdown outside that inventory are rejected; and
- the non-Markdown YAML and text owner inputs never enter the Markdown
  exemption mechanism.

Focused tests prove exact-byte/untracked acceptance, changed-byte rejection,
ignored, intent-to-add, tracked, wrong-path, Markdown-inbound, raw-HTML-inbound,
case-variant, symlink/junction, out-of-inventory, and Git-unavailable rejection.
The live-repository backbone check also proves the accepted twenty Markdown
inputs still match their manifest and remain untracked. No owner input was
edited, staged, or committed.

## Disposition and reopening boundary

The one source-review disposition is `evidence blocked`. It does not mean
`implemented but disabled`, `activation evidence required`, or `viable for a
bounded contract` as a completed source state. Only a future contract design is
technically plausible.

Reconsidering admission would require all of the following under separately
named authority:

1. a versioned real-source successor/compatibility contract rather than reuse
   of the synthetic trust domain;
2. current primary evidence for API/site terms, privacy/retention, rate,
   paging, error/schema, retry, availability, and change behavior;
3. an accepted minimal field/relationship contract with representative,
   missing, malformed, historical, privacy-negative, and non-inference
   fixtures;
4. an exact selected range and honest documented/selected/emitted coverage;
5. independent operation grants plus time-bounded configuration authority,
   contract, coverage, and review evidence; and
6. source-specific health, failure isolation, checksum-bound last-known-good,
   stale/degraded labeling, and no-prior-shard behavior.

None is authorized or supplied here. `G-PNW-SOURCE-ACTIVATION` remains closed.
The smallest Federal Register reopening gate would be exact owner authority for
`PNW-05-SRC-FEDERAL-REGISTER-REAL-SOURCE-CONTRACT-DESIGN`: a repository-local,
no-fetch successor/compatibility design capable of representing the real source
only as `not_admitted`/`evidence_blocked`, using synthetic fixtures and without
changing the registry or adapter. That design alone would not close the
separate terms/privacy/operations evidence gaps or authorize admission.

The previously ordered project pickup candidate
`PNW-05-SOURCE-AUTHORITY-PORTFOLIO-DISCOVERY` remains a separate, unauthorized
tranche; this review does not start it or any Federal Register successor.
