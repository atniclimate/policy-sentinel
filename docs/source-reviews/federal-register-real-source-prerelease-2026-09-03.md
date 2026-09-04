# Federal Register real-source local prerelease qualification

Date: 2026-09-03

Work item: `PNW-05-SRC-FEDERAL-REGISTER-TIER1-BOUNDED-ADMISSION`

Roadmap source ID: `SRC-FEDERAL-REGISTER`

Runtime source ID: `federal-register`

Deployment: `general-federal-local-prerelease@1.0.0`

Selected range: the one explicit published-document identity `2026-16965`

Current review disposition:
`EVIDENCE_BLOCKED_R7_DIGEST_DRIFT_NO_RETRY_FR_A1_CLOSED`

Current source state: source-specific qualification evidence-blocked; D3 and R6
are acceptable only as byte-identical observations for previously reviewed
facts, R7 supports no positive fact, and the source is not contract-qualified,
admitted, activated, bound, artifact-eligible, acquired, or published

## Executive determination

Ten frozen current official-evidence requests are now in custody. D3 and R6 are
post-current-authority byte-identical observations of the deployed OpenAPI and
NARA FAQ, but R7 changed from its approved GovInfo digest and correctly failed
closed as `evidence_digest_drift`. Because no raw R7 body was retained, that
failure establishes no semantic change, outage, withdrawal, custody state,
permission, or provider intent. It leaves the current rendition-custody fact
unresolved and blocks Tier-1 qualification. The consumed R7 attempt cannot be
retried, and historical R5 predates the current reproducible authority graph.
`FR-A1` remains prohibited.

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

The lead issued ten serial HTTPS GETs in three frozen process-local no-follow
observer runs. Every request used the exact host/path, identity encoding,
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
| `FR-D2` | [FederalRegister.gov deployed OpenAPI](https://www.federalregister.gov/api/v1/documentation.json) | `2026-09-03T12:47:42.741Z` through `2026-09-03T12:47:43.414Z` | `200`, JSON, UTF-8, identity | 230,046 / 19 | `06e06bfd397c49d600bab6d6c3eb4c1e2c07394f13544ffe193ae88385448d71` |
| `FR-R4` | [NARA Federal Register FAQ](https://www.archives.gov/federal-register/faqs) | `2026-09-03T12:47:43.415Z` through `2026-09-03T12:47:43.727Z` | `200`, HTML, UTF-8, identity | 83,240 / 8 | `272f27476b26ff1ee8ab534cacbb29595a12aaf05625c3a0923e13b80387441e` |
| `FR-R5` | [GovInfo Federal Register help](https://www.govinfo.gov/help/fr) | `2026-09-03T12:47:43.727Z` through `2026-09-03T12:47:43.878Z` | `200`, HTML, UTF-8, identity | 112,041 / 54 | `6928c58b8617d0b012408eb835bbae0e8b5e7b3496d149552de0622281f0e1c4` |
| `FR-D3` | [FederalRegister.gov deployed OpenAPI](https://www.federalregister.gov/api/v1/documentation.json) | `2026-09-04T06:53:21.291Z` through `2026-09-04T06:53:26.080Z` | `200`, exact-digest evidence accepted | 230,046 / 16 | `06e06bfd397c49d600bab6d6c3eb4c1e2c07394f13544ffe193ae88385448d71` |
| `FR-R6` | [NARA Federal Register FAQ](https://www.archives.gov/federal-register/faqs) | `2026-09-04T06:53:26.093Z` through `2026-09-04T06:53:26.258Z` | `200`, exact-digest evidence accepted | 83,240 / 7 | `272f27476b26ff1ee8ab534cacbb29595a12aaf05625c3a0923e13b80387441e` |
| `FR-R7` | [GovInfo Federal Register help](https://www.govinfo.gov/help/fr) | `2026-09-04T06:53:26.271Z` through `2026-09-04T06:53:26.487Z` | `200` transport; `evidence_digest_drift` | 112,041 / 54 | `a6b78324e66267aed2c3946eca68ba30ae23f8cf42e9c2633d2bb36cd92a3ae5` |

Totals are ten attempts and ten `2xx` transport responses, with nine
evidence-accepted observations and one drift-rejected observation; 1,340,143
identity-encoded response bytes, 278 chunks, zero redirects, zero retries, and
zero retained raw bytes. No `3xx`, `4xx`, `429`, or `5xx` was observed. `FR-A1`
and all portfolio requests remain unissued. The hard ledger is 10 issued, 18
exact-unissued, and 52 unavailable within 80. D3 is byte-identical to D1/D2 and
R6 to R1/R4. R7 is the same observed length as R5 but has a different digest;
length equality is not evidence acceptance and supports no provider fact.

The `FR-D2` aggregate observer also emitted an auxiliary `apiPathCount` value of
zero. That counter is expressly excluded from provider evidence. The 14-path
statement rests instead on `FR-D2`'s exact byte-for-byte digest equality with
the independently measured `FR-D1` and 2026-09-02 OpenAPI bytes; the same D2
observation independently confirmed OpenAPI 3, all 23 selectors, 56 selectable
document fields, and absent root security, terms, and external-documentation
declarations. No request was repeated to repair an aggregate counter.

## Provider facts that the current evidence can support

These are the maximum provider-fact receipts that may be constructed for this
exact scope. Each must retain its originating evidence URL, retrieval time,
response digest, fact kind, exact scope reference, issuance time, validity, and
review chain. The observation establishes only the value stated below.

| Fact kind | Evidence | Exact support | Does not establish |
| --- | --- | --- | --- |
| `source_identity` | `FR-D3` and `FR-R6` | FederalRegister.gov supplies the published-document API for the OFR/NARA publication service. | Issuing-agency identity for the selected document, legal authority, or another host. |
| `field_meaning` | `FR-D3` | OpenAPI 3.0.0, `/api/v1/`, 14 paths, and 56 selectable document fields; the unchanged digest includes all 23 frozen selectors. | Response requiredness, nullability, full response schema, compatibility, or a completeness promise. |
| `access_requirement` | `FR-D3` observation | This exact documentation GET succeeded without a credential and OpenAPI declares no security scheme. | Permanent keyless access or permission for another operation. |
| `official_status` | `FR-R6` | OFR/NARA publication and GPO distribution roles, with official PDF and informational HTML/XML distinguished. | Substantive issuing-agency authority or verified signature status. |
| `reproduction_right` | `FR-R6` | Reproduction is supported only for material appearing in Federal Register editions under 1 CFR 2.6. | Linked content, images, seals, logos, third-party material, or general redistribution rights. |
| `rendition_custody` | `FR-R7` failure only | Unresolved: R7 drift is retained only as aggregate negative evidence, and pre-current-graph R5 cannot substitute. | Any current custody, rendition, coverage, availability, permission, withdrawal, or semantic-change claim. |

D3 and R6 are evidence inputs only; no new provider-fact receipt has been
issued. Any later receipt must preserve the exact fact ceiling above. R7 may
appear only as a failed dated observation, never as a positive provider fact.

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

## Rejected first Tier-1 parser and transport byte freeze

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

The source and security reviewers independently matched these bytes and
rejected them. A caller-supplied fetch implementation could mint a live-looking
success receipt from synthetic bytes; eCFR paths admitted arbitrary
interposed/trailing path segments; and duplicate mandatory agency `raw_name`
values could create ambiguous later issuer authority. Empty URL delimiters and
unsafe CFR scalar path interpolation were also reproducible. The lead accepted
every finding and invalidated the manifest. Repairs remain unapproved until a
new exact byte freeze and all three fresh reviews pass.

The same source review found a separate chronology blocker: the original
`FR-D1`, `FR-R1`, and `FR-R2` accesses occurred before the prospective provider
authority receipts existed. They remain useful historical observations but
cannot be relabeled or retimed as provider facts. At that historical
checkpoint, the coordination record described a seven-authority,
evidence-blocked graph issued at `2026-09-03T12:40:55Z` and an exact
three-request `FR-D2`/`FR-R4`/`FR-R5` amendment for post-authority evidence. The
security adversary supplied exact limited concurrence at
`2026-09-03T12:43:44Z`, and the sovereignty adversary independently returned the
same exact disposition. The three permitted first attempts then completed
serially at `2026-09-03T12:47:42.741Z` through `2026-09-03T12:47:43.878Z` under
the frozen controls. They were the only provider observations eligible for that
then-prospective graph; that graph was later found non-replayable and was
superseded. Neither it nor the amendment and observations supplies a current
provider fact or grant, and they still cannot issue `FR-A1`.

At `2026-09-03T13:02:59Z`, a source-evidence auditor historically reconciled
those three post-authority receipts, six-fact ceiling, authority roles, reuse
and privacy boundaries, request arithmetic, and lifecycle chronology and
returned exact disposition `APPROVE_POST_AUTHORITY_PROVIDER_EVIDENCE`. That
historical approval expressly excluded the auxiliary D2 path counter and used
R5's then-new digest without claiming page-wide stability. It is superseded for
the current authority graph, supplies no current fact or grant, cannot
substitute for current evidence or later parser/gate byte reviews, and cannot
authorize `FR-A1`.

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
- current GovInfo evidence remains digest-drifted and the required
  rendition-custody fact is unresolved;
- any typed link crosses its allowed custody/host/path boundary; or
- the acquired object is not exactly document `2026-16965` or lacks a nonblank
  source-supplied `agencies[].raw_name`.

## Review conclusion and next gate

Current official evidence is not sufficient to complete Tier-1 qualification
or issue `FR-A1`. D3 and R6 preserve only five previously reviewed fact
ceilings; R7's changed digest leaves the required rendition-custody fact
unresolved. The consumed R7 attempt is not retry authority, and the drift may
not be interpreted from length, prior prose, or a historical observation.

Exact source-review disposition: `EVIDENCE_BLOCKED — R7_EVIDENCE_DIGEST_DRIFT;
NO_RETRY; FR-A1_CLOSED.` A future Federal Register recovery requires a
separately authorized, newly frozen and independently reviewed current GovInfo
evidence operation, or a separately reviewed narrower contract that removes
every unsupported GovInfo-dependent claim. Until then the source remains
disabled, not admitted, inactive, unbound, absent from artifacts, and blocked
without preventing authorized source-neutral corpus or portfolio work.

No Nation, ATNI membership, organization position, geography, jurisdictional
relevance, consultation sufficiency, consent, legal applicability, rights
impact, final-law status, or community position is established here. The exact
record, if later admitted, remains `general_jurisdiction` with zero Nation
associations and `Unclassified` unless an exact versioned source-label mapping
separately applies.
