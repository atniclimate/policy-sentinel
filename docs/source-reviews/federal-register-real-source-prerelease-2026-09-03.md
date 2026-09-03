# Federal Register real-source local prerelease qualification

Date: 2026-09-03

Work item: `PNW-05-SRC-FEDERAL-REGISTER-TIER1-BOUNDED-ADMISSION`

Roadmap source ID: `SRC-FEDERAL-REGISTER`

Runtime source ID: `federal-register`

Deployment: `general-federal-local-prerelease@1.0.0`

Selected range: the one explicit published-document identity `2026-16965`

Current review disposition:
`VIABLE_FOR_BOUNDED_CONTRACT_PROCEED_TO_TIER1_BYTE_REVIEW_FR_A1_REMAINS_CLOSED`

Current source state: evidence closure sufficient for exact parser and transport
review; not yet contract-qualified, admitted, activated, bound, artifact-
eligible, acquired, or published

## Executive determination

Four frozen current official-evidence requests establish enough narrow provider
evidence to review the exact Tier-1 parser and transport. They do not yet permit
the document request `FR-A1`. The current deployed OpenAPI bytes exactly match
the independently reviewed 2026-09-02 contract. Current NARA and GovInfo pages
support the publisher/operator, official-edition custody, reproduction, and
rendition distinctions required by this metadata-and-link operation.

No FederalRegister.gov API-specific terms or privacy statement was located in
the reviewed official evidence. GovInfo's policy is operator-specific and does
not fill either gap. The owner-authorized narrow residual path is therefore
recorded below as two separate project decisions with an expiry before 90 days.
Neither decision is provider permission, a provider guarantee, a license, or a
finding about unreviewed operations. Numeric rate, paging, snapshot, retry,
formal response/error schema, service level, and change-notice guarantees also
remain unknown and are contained only by the exact one-document local controls.

`FR-A1` remains prohibited until all of the following occur against exact bytes:

1. the Tier-1 parser and transport enforce every frozen field, request, media,
   byte, chunk, time, redirect, error, issuer, and rendition boundary;
2. source, security, and sovereignty reviewers approve those bytes and the
   exact lifecycle facts, unknowns, residuals, grants, and time bounds;
3. qualification, admission, activation, binding, and acquisition-operation
   receipts resolve within the accepted lifecycle contract; and
4. no hard blocker below has appeared.

Publication, redistribution, a default-build source call, a browser source
call, and general `G-PNW-SOURCE-ACTIVATION` remain closed.

## Current request custody

The lead issued four serial HTTPS GETs through the frozen process-local
no-follow observer. Every request used the exact host/path, identity encoding,
accepted media, UTF-8 policy, 512-KiB and 64-chunk ceilings, one 30-second
deadline, one attempt, no credential/cookie/referrer, and no automatic retry.
Only aggregate receipts and project-owned predicates were emitted. Provider
prose and bodies were not printed or persisted; in-memory byte buffers were
cleared before process exit.

| ID | Official source | UTC interval | Result | Bytes/chunks | SHA-256 |
| --- | --- | --- | --- | ---: | --- |
| `FR-D1` | [FederalRegister.gov deployed OpenAPI](https://www.federalregister.gov/api/v1/documentation.json) | `2026-09-03T11:44:48.420Z` through `2026-09-03T11:44:49.021Z` | `200`, JSON, UTF-8, identity | 230,046 / 17 | `06e06bfd397c49d600bab6d6c3eb4c1e2c07394f13544ffe193ae88385448d71` |
| `FR-R1` | [NARA Federal Register FAQ](https://www.archives.gov/federal-register/faqs) | `2026-09-03T11:44:49.021Z` through `2026-09-03T11:44:49.258Z` | `200`, HTML, UTF-8, identity | 83,240 / 6 | `272f27476b26ff1ee8ab534cacbb29595a12aaf05625c3a0923e13b80387441e` |
| `FR-R2` | [GovInfo Federal Register help](https://www.govinfo.gov/help/fr) | `2026-09-03T11:44:49.258Z` through `2026-09-03T11:44:49.399Z` | `200`, HTML, UTF-8, identity | 112,041 / 54 | `036deef02ddb0e88e32941ab8e36d2062b130b8ed44f84a0c2cf9f70d2081841` |
| `FR-R3` | [GovInfo policies](https://www.govinfo.gov/about/policies) | `2026-09-03T11:44:49.399Z` through `2026-09-03T11:44:49.532Z` | `200`, HTML, UTF-8, identity | 64,162 / 43 | `5189ea6f00ac5b788b6937d6024e9f5924ed958305e31afc7d94f7e4bc40c0a9` |

Totals are four attempts, four `2xx`, 489,489 identity-encoded response bytes,
120 chunks, zero redirects, zero retries, and zero retained raw bytes. No `3xx`,
`4xx`, `429`, or `5xx` was observed. `FR-A1` and all portfolio requests remain
unissued.

## Provider facts that the current evidence can support

These are the maximum provider-fact receipts that may be constructed for this
exact scope. Each must retain its originating evidence URL, retrieval time,
response digest, fact kind, exact scope reference, issuance time, validity, and
review chain. The observation establishes only the value stated below.

| Fact kind | Evidence | Exact support | Does not establish |
| --- | --- | --- | --- |
| `source_identity` | `FR-D1` and `FR-R1` | FederalRegister.gov supplies the published-document API for the OFR/NARA publication service. | Issuing-agency identity for the selected document, legal authority, or another host. |
| `field_meaning` | `FR-D1` | OpenAPI 3.0.0, `/api/v1/`, 14 paths, and 56 selectable document fields; the unchanged digest includes all 23 frozen selectors. | Response requiredness, nullability, full response schema, compatibility, or a completeness promise. |
| `access_requirement` | `FR-D1` observation | This exact documentation GET succeeded without a credential and OpenAPI declares no security scheme. | Permanent keyless access or permission for another operation. |
| `official_status` | `FR-R1` | OFR/NARA publication and GPO distribution roles, with official PDF and informational HTML/XML distinguished. | Substantive issuing-agency authority or verified signature status. |
| `reproduction_right` | `FR-R1` | Reproduction is supported only for material appearing in Federal Register editions under 1 CFR 2.6. | Linked content, images, seals, logos, third-party material, or general redistribution rights. |
| `rendition_custody` | `FR-R1` and `FR-R2` | FederalRegister.gov informational renditions remain distinct from GovInfo official daily-edition custody and its typed renditions. | Current target availability, signature validation, or authority to fetch rendition bodies. |

`FR-R3` is boundary evidence, not a FederalRegister.gov provider-fact receipt.
It establishes that GovInfo addresses copyright/public-domain, privacy/PII, and
image-rights questions on its own surface. It cannot be reused as an API terms
or privacy receipt for FederalRegister.gov.

The selected document's issuing agency is intentionally not prequalified. It
must come from the acquired object's nonempty `agencies[].raw_name`. Missing,
empty, malformed, or contradictory issuer data makes the one-item operation
fail atomically. OFR, NARA, GPO, the title, a topic, another field, or owner
expectation may never substitute for it.

## Exact Tier-1 field and link ceiling

The request has 23 top-level selectors: 18 structured selectors and five typed
link selectors. Replacing top-level `agencies` with its five retained leaves
produces the owner contract's 22 structured fields.

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
html_url
pdf_url
json_url
full_text_xml_url
raw_text_url
```

Within `agencies`, provider envelope keys `url` and `json_url` are recognized
and discarded. Only the five named leaves survive; any other nested or
top-level key is drift. `cfr_references` and `cfr_topics` keep their frozen
nested shapes. `topics` and `cfr_topics` remain separate source schemes and are
`Unclassified` without an exact versioned mapping. Structured
`docket_ids: []` remains empty.

All links are retained as typed provenance/rendition links only. Their exact
HTTPS host, identity-consistent path, role, and custodian must pass. No target
may be requested in this tranche. A URL supplies neither target authority nor
reuse permission.

Tier-2 abstract/action/disposition text, public-inspection content, document
bodies, images, popularity, comments, submitters, attachments, contacts,
people, addresses, signatures, expanded dockets/RIN objects, sensitive
locations, confidential content, and undocumented fields remain excluded.

## Unknown inventory and compensating controls

The lifecycle scope binds nine required unknown kinds and 23 exact questions.
None is silently converted to a provider guarantee.

| Unknown | Current resolution | Exact local containment |
| --- | --- | --- |
| API-specific terms | `not_located_after_diligent_official_source_review` | Separate expiring owner residual; one unpublished metadata/link operation only. |
| API-specific privacy/retention | `not_located_after_diligent_official_source_review` | Separate expiring owner residual; impersonal request and field minimization. |
| Numeric rate/quota/concurrency | No published value established | One serial request; no schedule or throughput claim. |
| Paging and cursor stability | Not established | No paging, cursor, total, ordering, or completeness claim; one exact identity. |
| Snapshot/total consistency | Not established | One exact-document object; duplicate, wrapper, or multi-item shapes fail. |
| Retry/backoff semantics | Not established | No automatic retry; `429` stops; the unused deliberate-retry gate stays closed. |
| Formal response/error schema | Not established | Repository-owned strict allowlist; malformed, missing, null, extra, and media/status drift fail closed. |
| Service level, latency, incident response | Not established | No availability promise; bounded timeout plus later exact health/LKG receipts. |
| Change/deprecation notice | Not established | Exact request/contract fingerprints and fail-closed parser drift. |

OpenAPI's absent security declaration and one credential-free observation are
dated evidence for this exact access check. They do not establish permanent
keyless access. Any later credential, account, key, fee, cookie, clickthrough,
or access-policy requirement is a hard stop.

## Exact owner residual-risk decisions

The owner authorization expressly accepts only these two residual decisions
when every listed condition remains true. The source-evidence review found no
affirmative conflict in the current exact evidence, so the lead records the
following non-provider decisions at the actual post-observation time. They are
not licenses, provider terms, provider privacy guarantees, or permission for a
different source, host, method, field policy, output, deployment, or time.

Common scope:

- host: `www.federalregister.gov`;
- method: `GET`;
- field policy:
  `federal-register-tier1-field-policy@1.0.0`, digest
  `027a9e24aaf23668adb93e4b9959ff02a8cff981bf565d8b7826a1d66fa0d865`;
- output boundary: `ignored_local_prerelease_only`;
- accepted at: `2026-09-03T11:54:01Z`;
- expires at: `2026-12-01T00:00:00Z`, before the 90-day maximum; and
- conditions: `keyless_read_only`, `impersonal_metadata_links_only`,
  `build_time_only`, `bounded_unpublished_local_use`,
  `no_private_contact_comment_attachment_or_sensitive_location`, and
  `no_conflicting_affirmative_restriction`.

| Decision ID | Exact unknown reference | Resolution |
| --- | --- | --- |
| `federal-register-api-terms-residual-decision` | `federal-register-api-terms-unknown@1.0.0` | Owner accepts the bounded residual absence only while the common scope and all six conditions hold. |
| `federal-register-api-privacy-residual-decision` | `federal-register-api-privacy-unknown@1.0.0` | Owner accepts the bounded residual absence only while the common scope and all six conditions hold. |

Expiry, revocation, field-policy drift, scope drift, or failure of one condition
invalidates the affected decision. GovInfo evidence cannot extend either one.

## Tier-1 parser and transport byte-review candidate

The exact nine-file candidate is frozen in the coordination record as a
1,130-byte tab-separated manifest with SHA-256
`3a85bf0767d7db63b8dc3566d33250d70ef2b107af46392b47860516556c9d2d`.
It internally constructs only the frozen 23-selector `FR-A1` URL, requires the
exact final response URL, uses one GET attempt with manual redirect denial,
omits credentials and referrer, requests identity-encoded JSON, enforces one
30-second whole-operation deadline and 65,536-byte/64-chunk ceilings, sanitizes
failures, rejects duplicate or drifted JSON, validates the selected document
and typed links, retains only the field policy, and parses the same bounded
bytes twice before clearing them. Direct object and raw-JSON inputs both have a
32-level nesting ceiling.

The candidate and its focused/retained tests pass locally, but this paragraph
is not independent approval. Any candidate-byte change invalidates the
manifest. Source, security, and sovereignty reviewers must match and approve
the exact bytes together with the complete digest-bound pre-acquisition
lifecycle graph before `FR-A1` can be issued.

## Hard blockers before `FR-A1`

The document request must not be issued if any of these remains or appears:

- exact parser/transport bytes or their adversarial tests are absent, changed,
  or not independently reviewed;
- the six narrow provider-fact receipts, two residual decisions, remaining
  required project controls, source/security/sovereignty reviews,
  qualification, admission, deployment activation, binding, or exact
  acquisition grant do not resolve in one digest-bound lifecycle graph;
- an account, credential, API key, cookie, fee, clickthrough, contact, or terms
  action is required;
- an affirmative incompatible use, reproduction, access, or privacy condition
  is found;
- exact method, host, path, query order, field list, media, UTF-8, identity
  encoding, one-request/one-page/one-item, 65,536-byte, 64-chunk, 30-second,
  zero-redirect, or no-retry behavior cannot be enforced;
- OpenAPI/request/schema drift invalidates the frozen contract;
- any typed link crosses its allowed custody/host/path boundary; or
- the acquired object is not exactly document `2026-16965` or lacks a nonblank
  source-supplied `agencies[].raw_name`.

## Review conclusion and next gate

Current official evidence is sufficient to proceed to exact Tier-1 parser and
transport byte review. It is not sufficient to issue `FR-A1` by itself. After
the implementation and all exact lifecycle receipts exist, fresh source,
security, and sovereignty reviews must approve the complete request and
lifecycle bytes. Only that approval can satisfy the narrow local admission and
activation predicates. It cannot open general source activation,
redistribution, publication, a browser source dependency, or any broader PNW
completion state.

Exact source-review recommendation: `VIABLE FOR A BOUNDED CONTRACT — PROCEED
TO TIER-1 PARSER/TRANSPORT BYTE REVIEW AND TWO NARROW OWNER RESIDUAL-RISK
DECISIONS; FR-A1 REMAINS UNISSUED PENDING THE COMPLETE CURRENT REVIEWED
QUALIFICATION, ADMISSION, ACTIVATION, AND ACQUISITION-GRANT CHAIN.`

No Nation, ATNI membership, organization position, geography, jurisdictional
relevance, consultation sufficiency, consent, legal applicability, rights
impact, final-law status, or community position is established here. The exact
record, if later admitted, remains `general_jurisdiction` with zero Nation
associations and `Unclassified` unless an exact versioned source-label mapping
separately applies.
