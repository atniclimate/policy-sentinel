# Source-authority portfolio discovery

Date completed: 2026-09-04

Work item: `PNW-05-SOURCE-AUTHORITY-PORTFOLIO-DISCOVERY`

Scope: bounded classification and onboarding-cost discovery only

Disposition:
`PORTFOLIO_DISCOVERY_COMPLETE_NO_SOURCE_ADMITTED_NEXT_EVIDENCE_TRANCHE_REQUIRED`

## Executive determination

All owner-named candidates are classified below using the eight required typed
authority roles. The classification completes the portfolio-discovery child;
it does not qualify, admit, activate, bind, acquire from, or publish any source.
Federal Register remains evidence-blocked on the consumed `FR-R7` digest drift,
and `FR-A1` remains closed.

The one authorized portfolio run consumed the first attempt for each exact
request `PF-01` through `PF-17`. All 17 transports returned `2xx` HTML. The
strict observer accepted only `PF-17`, and only for its closed structural
predicates: the exact canonical URL was present, the eleven other evaluated
HTML predicates and the authentication-challenge predicate were false, and the
JSON predicates were unknown. Fourteen responses were `content_invalid`; two
stopped at the 64-chunk body bound. Those sixteen failures support no semantic
source fact. Even the one accepted observation establishes neither SAM.gov
service semantics nor operator authority, rights, privacy, currency, coverage,
completeness, adoption, legal effect, or a Nation position.

The next two recommended candidates after Federal Register are, in order:

1. **Bureau of Indian Affairs administrative-record metadata and links.** It has
   the clearest originating-agency role and high utility, while a narrow public
   record can exclude Tribal Leaders Directory contacts, addresses, and
   geometry. A new tranche must first establish current source identity,
   document taxonomy, schema, reuse/privacy terms, correction lifecycle, exact
   operation, and provenance. The three consumed page observations cannot be
   repeated or promoted into those facts.
2. **ATNI single-resolution metadata and links.** An exact adopted ATNI record
   has the strongest PNW-specific collective-policy value and a clear authority
   ceiling when it is attributed only to ATNI, never to every member Nation.
   The project-owned 64-chunk limit ended the table observation and cannot be
   interpreted as a provider defect or comparative onboarding-cost fact. A new
   tranche must begin with one exact source-supplied resolution URL and establish
   identity, adoption/amendment/withdrawal/supersession semantics, canonical
   custody, reuse/privacy, stable fields, corrections, and a bounded operation.

GAO is the first unranked reserve candidate. If current operator and product
identity are revalidated, GAO's own findings would have a clear institutional
speaker and appear amenable to impersonal metadata-and-link minimization,
subject to source-specific rights/privacy review. It is not selected over ATNI
because the current receipts establish no comparative interface maturity,
while ATNI has materially greater PNW-specific policy value. These
recommendations open no gate and authorize no request.

## Evidence boundary and method

The review uses only:

- the binding owner Phase 6 contract and owner-supplied source landscape;
- committed source registry/reviews as dated retained evidence, not automatic
  current revalidation;
- the committed request plan at canonical plan SHA-256
  `b676acebcec53076742c5e4e831bd1729e8cbb970a1f276a099543358b274e33`;
- the closed-field aggregate receipts from the one live run; and
- the Federal Register qualification report and lifecycle decisions already in
  the repository.

Raw provider bodies were held in memory only, cleared, and never printed or
written. No response text, URL, redirect target, header value, IP address,
cookie, credential, personal/contact field, comment, attachment, or land datum
entered generated custody. Candidate names, operators, purposes, and role
labels in the frozen plan are project hypotheses unless separately supported by
retained primary-source review. A `2xx`, TLS peer, hostname, content digest, or
observer predicate does not turn a hypothesis into authority evidence.

The eight roles are: originating sovereign or organization record;
originating government/agency action; official publisher or rendition
custodian; legislative or judicial official record; intertribal organization
position; coalition/advocacy position or analysis; oversight/research analysis;
and discovery catalog or lead.

## One-run observation ledger

Each request was one serial `GET` with identity encoding, no credential, cookie,
or referrer, no redirect follow, no retry, a 30-second deadline, 1-MiB and
64-chunk limits, fatal UTF-8 decoding, and the exact media allowlist. The whole
run finished within its 600-second deadline.

| ID | Candidate surface | Closed result | Bytes / chunks | Positive predicates |
| --- | --- | --- | ---: | --- |
| `PF-01` | BIA homepage | `2xx` HTML; `content_invalid` | 50,235 / 5 | none |
| `PF-02` | BIA Tribal Leaders Directory service page | `2xx` HTML; `content_invalid` | 47,719 / 4 | none |
| `PF-03` | BIA TLD dataset documentation, not the dataset | `2xx` HTML; `content_invalid` | 46,529 / 4 | none |
| `PF-04` | ATNI resolution table | `2xx` HTML; `body_bound_exceeded` | 818,327 / 64 | none |
| `PF-05` | NCAI resolution index | `2xx` HTML; `content_invalid` | 119,163 / 15 | none |
| `PF-06` | Coalition for Tribal Sovereignty homepage | `2xx` HTML; `body_bound_exceeded` | 154,508 / 64 | none |
| `PF-07` | CRITFC homepage | `2xx` HTML; `content_invalid` | 194,199 / 15 | none |
| `PF-08` | NWIFC homepage | `2xx` HTML; `content_invalid` | 117,079 / 10 | none |
| `PF-09` | NARF homepage | `2xx` HTML; `content_invalid` | 66,102 / 18 | none |
| `PF-10` | AILC policy/legal-analysis page | `2xx` HTML; `content_invalid` | 76,542 / 10 | none |
| `PF-11` | NNI research/policy-analysis page | `2xx` HTML; `content_invalid` | 59,316 / 44 | none |
| `PF-12` | GAO Tribal and Native American issues page | `2xx` HTML; `content_invalid` | 114,353 / 13 | none |
| `PF-13` | Congress.gov API root | `2xx` HTML; `content_invalid` | 174,997 / 19 | none |
| `PF-14` | GovInfo developer portal | `2xx` HTML; `content_invalid` | 61,452 / 42 | none |
| `PF-15` | Regulations.gov API documentation page | `2xx` HTML; `content_invalid` | 59,455 / 5 | none |
| `PF-16` | Data.gov about page | `2xx` HTML; `content_invalid` | 117,849 / 11 | none |
| `PF-17` | GSA public API index, used only as a SAM path lead | `2xx` HTML; `success` | 34,316 / 3 | `html.canonical_exact=true`; eleven other HTML predicates and auth challenge false; JSON predicates unknown |

Portfolio totals are 17 attempts, 17 DNS lookups, 17 HTTPS transports, 17
receipts, 2,312,141 streamed bytes, and 346 chunks. Outcomes are one `success`,
fourteen `content_invalid`, and two `body_bound_exceeded`; there were zero
redirect follows, retries, rate-limit skips, or terminal timeouts. Across all
272 closed predicate slots, one is true, twelve are false, and 259 are unknown.
The sole canonical live-summary line was 371 UTF-8/LF bytes at SHA-256
`1cad9b05bb7e7cd1b457489f61f4c8fa59bf1dd6f14c77cd593807f23831f987`;
it was captured as process output, not persisted in generated custody.

## Candidate classification and onboarding boundary

“Could prove” below means only what a later qualified originating record could
prove within its own role. It is not a finding that the current observation did
prove it. Except where a committed primary-source review is cited, current
terms, reuse, privacy, cadence, correction, coverage, schema, and operational
guarantees remain unknown.

| Candidate and exact operator | Typed authority role and maximum claim | Explicit noncoverage | Access, interface, and evidence result | Minimal safe content, lifecycle, utility, and smallest next tranche |
| --- | --- | --- | --- | --- |
| **Federal Register / OFR / NARA** — Office of the Federal Register within NARA; issuing agencies remain separate | Official publisher or rendition custodian for what was published. The separately identified issuing agency owns the underlying government/agency action; publisher identity alone cannot establish it | Does not prove GovInfo official-rendition custody, substantive issuing authority, docket completeness, current law, finality, Nation relevance, or Nation position | Existing review found a keyless structured API and bounded metadata technically plausible, but current qualification is `EVIDENCE_BLOCKED_R7_DIGEST_DRIFT_NO_RETRY_FR_A1_CLOSED`; terms/privacy and operational guarantees remain incomplete | Allowlisted document identity/date/type/agency/reference/topic metadata and typed links only. Correction/revision/health/LKG require the accepted lifecycle graph. No next request exists under current authority; recovery needs a separately authorized current GovInfo evidence operation or a narrower reviewed contract. |
| **GovInfo** — U.S. Government Publishing Office | Official publisher or rendition custodian; can establish its package/granule identity and an official edition when the exact rendition is verified | Does not become the originating agency, prove docket completeness, or transfer rights across linked content; a generic link does not authenticate a particular rendition | `PF-14` was `content_invalid`. Retained 2026-07-31 review describes mature collection/package concepts but a key-required API and collection-specific coverage; `G-B-GOVINFO` remains closed | Package/granule IDs, collection, dates, modification time, official detail/rendition links, hashes, and separate originating-agency provenance. Keep metadata-and-links unless exact reproduction rights are verified. Any API tranche requires owner-approved registration/key handling and fresh current terms/schema/lifecycle evidence. |
| **Bureau of Indian Affairs / Indian Affairs** — U.S. Department of the Interior | Originating government/agency action for BIA programs, guidance, consultation, directories, and administrative records | BIA is not a Tribal voice. Federal recognition is not ATNI/NCAI membership or assent. The TLD is supplementary, can be stale, and is not recognition authority; no Nation relation may be inferred. A BIA consultation notice or summary proves only BIA's stated process or description, not a named Nation's attendance, position, consent, consultation sufficiency, assent, or resulting action without separate exact originating evidence | `PF-01` through `PF-03` were three `2xx` HTML responses that all failed strict content validation. The requests omitted credentials, but `http.auth_challenge` is unknown; no access requirement, machine contract, terms, privacy, rights, cadence, or change semantic was established | Exact record ID/title/type/date/status/issuing office/canonical link and source update time. Exclude names of contacts/leaders, addresses, phones, email, comments, land/geometry, and raw datasets. Next tranche: current source/operator documentation, one narrow administrative record family, strict schema, corrections, privacy/reuse, health/LKG, and an exact request grant. |
| **ATNI resolutions** — Affiliated Tribes of Northwest Indians, as asserted by the owner-supplied candidate record | Originating organization record plus intertribal organization position for an exact ATNI-adopted resolution and its documented lifecycle | Never an individual member Nation position; does not prove the current 59-member roster, delegate authority outside the record, legal effect, or implementation | `PF-04` reached `2xx` HTML but stopped at 64 chunks before full validation. No canonical, pagination, identity, lifecycle, rights, or privacy predicate resolved | Resolution number, exact title, adoption date/session, issuing body, status/amendment/withdrawal/supersession when explicit, canonical document link, and hash. Highest regional utility but high current onboarding uncertainty. Next tranche: bounded index/document split, adoption and supersession semantics, originating custody, reuse/privacy, stable IDs, and no member-position inference. |
| **NCAI resolutions** — National Congress of American Indians, as asserted by the owner-supplied candidate record | Originating organization record plus intertribal organization position for an exact NCAI-adopted resolution | Not ATNI regional policy, individual Nation policy, law, or proof of membership/assent | `PF-05` was `2xx` HTML and `content_invalid`; all semantic and structural predicates are unknown. Authentication, terms, privacy, rights, cadence, and interface contract remain unproved | Exact resolution ID/title/date/status/body type and canonical link; retain NCAI attribution and lifecycle. Useful national context and crosswalk leads. Next tranche: source identity, resolution lifecycle/custody, stable bounded enumeration, rights/privacy, and exact no-inference rules. |
| **Coalition for Tribal Sovereignty** — coalition operator asserted by the owner-supplied candidate record | Originating organization record for its own material plus coalition/advocacy position or analysis | Participation, a linked item, or a coalition statement does not prove any member organization or Nation position; private/member content is excluded | `PF-06` reached `2xx` HTML but stopped at 64 chunks. The separate login-gated resource described by owner direction was not entered. Public interface, authorship, participant semantics, reuse, privacy, and lifecycle remain unknown | Coalition-authored item identity, date, authorship, item type, exact `speaksFor`/`doesNotSpeakFor`, and originating links. No participant inference or form/login use. Next tranche: public authorship/participant semantics, outbound provenance, stable document identity, rights/privacy, and a bounded public-only path. |
| **CRITFC** — Columbia River Inter-Tribal Fish Commission, as asserted by the owner-supplied candidate record | Originating organization record plus intertribal organization position within an exact documented commission mandate | A commission statement is not each member Tribe's independent or general position and cannot prove rights, ownership, jurisdiction, or legal effect | `PF-07` was `2xx` HTML and `content_invalid`; operator mandate, publication taxonomy, data sensitivity, rights, lifecycle, and machine interface were not revalidated | Commission report/statement ID, title, date, document class, mandate scope, canonical link, and citations; exclude sensitive fisheries/location data. High PNW fisheries/habitat utility. Next tranche: current governance/mandate evidence, document taxonomy, member-attribution rule, licenses/sensitivity, correction semantics, and bounded public metadata. |
| **NWIFC** — Northwest Indian Fisheries Commission, as asserted by the owner-supplied candidate record | Originating organization record plus intertribal organization position within an exact documented commission mandate | A technical or commission publication is not automatically an adopted resolution or each member Tribe's position; no treaty/right conclusion may be inferred | `PF-08` was `2xx` HTML and `content_invalid`; operator, taxonomy, licenses, sensitivity, lifecycle, and machine contract remain unproved | Commission publication identity, date, class, explicit mandate, canonical link, provenance, and safe citations; exclude sensitive fisheries/location data. High western Washington utility. Next tranche mirrors CRITFC with explicit member-attribution and geographic/sensitivity controls. |
| **NARF** — Native American Rights Fund, as asserted by the owner-supplied candidate record | Originating organization record for its own work plus coalition/advocacy position or analysis | Advocacy or counsel analysis is not binding law, an adjudicative outcome, or a client's/Nation's position absent exact authorized originating evidence | `PF-09` was `2xx` HTML and `content_invalid`; publication identity, case-state model, confidentiality boundary, rights/privacy, and interface remain unknown | Publication/case-project metadata, institutional authorship, date, document class, canonical link, primary citations, and explicit advocacy role. A person name is retained only if indispensable to document identity and separately privacy-reviewed/accepted; contacts are always excluded. Next tranche: authorship, litigation/document-form distinctions, citation provenance, privacy/confidentiality, reuse, revision, and stable IDs. |
| **American Indian Law Center** — AILC, as asserted by the owner-supplied candidate record | Originating organization record for its own program material plus coalition/advocacy position or analysis and oversight/research analysis | Analysis is not adopted Nation policy, court holding, current law, or outcome | `PF-10` was `2xx` HTML and `content_invalid`; password-protected pages, forms, mailing lists, and private training were excluded. Public inventory, terms/privacy, authorship, cadence, and lifecycle remain unknown | Public publication metadata, institutional authorship, date/version, analysis class, canonical link, and cited sources. A person name requires indispensable document-identity need plus separate privacy review/acceptance; contacts are excluded. Next tranche: public-only inventory, authorship, taxonomy, rights/privacy, revision semantics, and explicit separation from legal conclusions. |
| **Native Nations Institute** — University of Arizona/Udall Center program, as described by retained owner evidence | Originating organization record for its work plus oversight/research analysis | Academic or case-study analysis is not a Nation's adopted policy; empirical claims require cited originating evidence | `PF-11` was `2xx` HTML and `content_invalid`; research methods, publication metadata, rights, Indigenous-data governance, updates, and interface remain unproved | Publication ID/title, institutional authorship, date/version/method/canonical link, citations, research area, and exact `speaksFor` limits. A person name requires indispensable document-identity need plus separate privacy review/acceptance; contacts are excluded. Next tranche: public publication inventory, methods/citation provenance, reuse/privacy and Indigenous-data-governance controls, corrections, and bounded metadata. |
| **GAO candidate** — U.S. Government Accountability Office operator/role provisionally classified from the owner seed, not revalidated by `PF-12` | If originating identity is revalidated, a GAO product is an originating organization record for its own work plus oversight/research analysis and can establish only GAO's findings and recommendations | Not a Tribal government, advocacy body, court, or executive program owner; recommendations are not law, agency action, or Nation position | `PF-12` was `2xx` HTML and `content_invalid`; this run established no operator semantic, product schema, versioning, rights/privacy, cadence, or interface fact | Report/product ID, title, publication/update dates, product type, recommendation status, official links, and primary citations. Potentially strong federal oversight utility with low necessary data sensitivity. Next tranche: current operator/product/API documentation, stable IDs, version/recommendation lifecycle, reuse/privacy, bounded metadata, and exact health/LKG design. |
| **Congress.gov** — Library of Congress | Legislative or judicial official record for congressional measures, actions, and published text references within field-specific coverage | Subjects, sponsors, eligibility, geography, or text do not prove Nation relevance/position, legal applicability, enactment beyond explicit action, or comprehensive history | `PF-13` was `2xx` HTML and `content_invalid`. Retained 2026-07-31 contract evidence describes a query-bound API key, under-specified envelopes, field-specific coverage, and `G-B-CONGRESS` closed | Official measure/action IDs, exact dates/status, official subject labels, text-version references, and durable links; metadata-and-links only. Next tranche requires explicit registration/key authority, current schema/host/rate/coverage review, pagination/revision/health/LKG, and no keyword Nation inference. |
| **Regulations.gov** — Federal eRulemaking Program / GSA; issuing agencies remain separate | Official publisher/index surface for agency dockets and documents; originating government/agency action remains with the issuing agency | Does not transfer agency authority, establish docket completeness, permit comment/person ingestion, or prove finality, Nation relevance, or legal effect | `PF-15` was `2xx` HTML and `content_invalid`. Retained contract review says API calls require a key and schemas mix high-risk comment/personal fields; `G-B-REGULATIONS` remains closed | Allowlisted governmental docket/document IDs, agency, exact type/subtype/status/date, title, and links. Exclude comments, submitters, contacts, attachments/body text, and arbitrary free text. Next tranche requires explicit key/terms authority, current schema and GET quota, strict field firewall, bounded paging, corrections, and health/LKG. |
| **Data.gov** — U.S. government discovery catalog; originating dataset operators remain separate | Discovery catalog or lead only | Catalog presence does not transfer source authority, rights, privacy, coverage, currency, completeness, admission, or a Nation relation | `PF-16` was `2xx` HTML and `content_invalid`; catalog interface, terms, privacy, freshness, and dataset provenance were not established | Catalog ID/title/publisher/modified date and originating link only when separately reviewed; never substitute catalog metadata for the originating source. Next tranche, if ever needed, is a bounded discovery-only contract with publisher/rights passthrough and no ingestion/admission. |
| **SAM.gov candidate via GSA API index** — General Services Administration index at `open.gsa.gov`; no SAM service path was requested | Discovery catalog or lead only at this checkpoint; a future exact SAM record could be an originating government/agency action only after source qualification | The GSA index cannot prove a SAM endpoint, schema, coverage, entity/award status, access right, currentness, or Nation/organization relationship | `PF-17` is the only strict success: exact canonical link true; forms, JSON-LD, license/version/service-description links, pagination, machine dates, repeated structure, and typed-resource links false. This is no SAM semantic evidence | Retain only the dated index observation and candidate lead. Do not follow links, create an account, use credentials, or ingest entity/person data. Next tranche would first need an exact public SAM service path, operator/contract/terms/privacy review, minimization, lifecycle, and a separately approved operation. |

### Per-candidate range, cadence, and PNW utility

For every portfolio candidate other than the separately contracted Federal
Register pilot, the current selected build range is `none`. Federal Register's
selected contract range is only exact identity `2026-16965`, which was not
acquired. For every candidate, the actual emitted range is `none` and the
emitted record count is zero. “Retained” below means dated repository evidence
that this PF run did not revalidate. Unknown cadence or range stays unknown; it
is not an outage or an absence claim.

| Candidate | Documented/historical coverage feasibility | Update cadence | PNW/persona/scenario utility ceiling |
| --- | --- | --- | --- |
| Federal Register / OFR / NARA | Retained review: API search 1994-forward; separate GovInfo Federal Register collection 1936-forward. Exact pilot identity `2026-16965` was selected in contract but not acquired | Retained federal-business-day publication descriptions, not an SLA; current qualification blocked | High for federal notices such as the roadless-rule scenario, always `general_jurisdiction` absent exact Nation evidence |
| GovInfo | Retained collection- and period-specific package/granule coverage; no portfolio selection | Retained collection-specific publication/reprocessing cadence; current guarantee unknown | Official-edition/rendition verification for federal records, not PNW or Nation policy |
| BIA | Retained evidence distinguishes the annual recognition notice from independently changing TLD data; exact administrative-record range remains unknown | Annual recognition notice plus corrections is retained evidence; TLD and other record cadences remain separate/unknown | High for federal Indian-affairs administration and source leads; cannot provide a Nation position or ATNI membership |
| ATNI resolutions | Historical range and enumerable resolution coverage unknown | Adoption/publication/amendment/withdrawal cadence unknown | Highest direct PNW collective-policy value when an exact record is attributed only to ATNI |
| NCAI resolutions | Historical range and enumerable resolution coverage unknown | Adoption/publication/amendment/withdrawal cadence unknown | National Indigenous-policy context and crosswalk leads; not ATNI regional or member-Nation policy |
| Coalition for Tribal Sovereignty | Public authored-material range unknown; private/member range excluded | Publication/update/supersession cadence unknown | Federal-action and coalition-position leads with coalition-only attribution |
| CRITFC | Public commission publication range and completeness unknown | Publication/correction cadence unknown | High Columbia Basin fisheries, habitat, hydrology, climate, and mandate-specific context |
| NWIFC | Public commission publication range and completeness unknown | Publication/correction cadence unknown | High western Washington treaty-fisheries, habitat, and co-management context within documented mandate |
| NARF | Public publication/case-project metadata range unknown; client/private material excluded | Publication, litigation-state, correction, and revision cadence unknown | Legal context and originating-record leads; never current law, outcome, or client/Nation position by inference |
| AILC | Public publication inventory/range unknown; protected training and form surfaces excluded | Publication/revision cadence unknown | Legal/policy analysis, terminology, training, and citation leads with AILC-only attribution |
| NNI | Public research/publication range unknown | Publication/correction cadence unknown | Governance, natural-resource, data-sovereignty, methods, and taxonomy context; cited originating evidence remains required |
| GAO | Current Tribal-topic product range and interface coverage not established by `PF-12` | Product publication/recommendation-update cadence unknown | Federal program oversight, implementation findings, and agency leads; not law, executive action, or a Nation position |
| Congress.gov | Retained field-specific coverage: introduced measures from 1973, enacted measures from 1951, current bill text from 1993, subjects from 2009, with selected older material; API parity remains unproved | Retained current information usually updates after chamber sessions; no current service guarantee | Federal legislative identity/actions and official subject labels; no Nation relevance or enacted-law inference |
| Regulations.gov | Retained review found no guaranteed historical start, complete agency participation, or comprehensive docket range | Agency-specific mutable docket/document cadence; current guarantees unknown | Federal rulemaking docket/document leads for scenarios; comments, people, attachments, and completeness claims excluded |
| Data.gov | Catalog range and originating-dataset coverage unknown | Catalog/publisher update cadence unknown | Discovery leads only; no authority, rights, coverage, or admission transfer |
| SAM.gov via GSA API index | No SAM-specific service, record family, or historical range was observed | Unknown | Possible future federal service/award/entity lead only; no current SAM source or PNW/Nation claim |

The owner contract permits at most one alternative keyless public
metadata-and-link pilot from BIA, GAO, ATNI resolutions, or NCAI resolutions if
Federal Register remains irreducibly blocked. The ranking above does not select
that pilot or authorize its documentation, implementation, or retrieval. Any
such choice requires a separately frozen and independently reviewed exact
tranche.

## Request budget and generated custody

The hard 80-request ledger is now:

- **27 issued:** the prior ten Federal Register/NARA/GovInfo evidence requests
  plus all seventeen portfolio requests;
- **27 `2xx` transports:** transport status is not evidence acceptance;
- **10 evidence-accepted closed observations:** nine prior observations plus
  `PF-17`; this is not source acceptance, qualification, or admission;
- **17 evidence-rejected observations:** prior `FR-R7` plus sixteen portfolio
  failures;
- **3,652,284 streamed identity bytes and 624 chunks;**
- **one exact-unissued request:** `FR-A1`, still prohibited; and
- **52 unavailable capacity slots:** capacity is not authority.

Thus `27 issued + 1 exact-unissued + 52 unavailable = 80`. No predecessor or
portfolio request may be reset or repeated. The portfolio global latch and all
17 request latches say `retryAuthorized=false` and `reserved_consumed`.

At the report checkpoint, ignored generated custody has 44 files: the eight
unchanged historical authority/Federal Register files, the exact observer, one
global portfolio latch, seventeen request latches, and seventeen receipts. The
observer remains 99,998 bytes at SHA-256
`2cab3b38b33413ce296656662ba94053cc3512b00d85f3c9c5fb48e65c1ec21d`
until a separate reviewed Delete-only transition removes only that helper. The
35 post-run PF custody files are:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `PF-01.attempt` | 224 | `ac8150ea5c382c5f67a49adc6ec8d76a9bde457e02d5d073e4294801a5aaff49` |
| `PF-01.receipt.json` | 1,086 | `81fdacb1fa0d425d0084a0bfc5955db4c1156dde5af7c03ee51be0d83ea724dc` |
| `PF-02.attempt` | 224 | `b61d4710c9105366e956937098fb13539d98034fbc661a2eb0278316d420cf3e` |
| `PF-02.receipt.json` | 1,099 | `8cd476051141c4d8895eedbe16c5c687ebfc6d885c85b32a71bb3ab77f721ac6` |
| `PF-03.attempt` | 224 | `d43ab6f5066b4d0341f3b0c22bb83620f09ee4b0b87f87c4c6bee334fd9ed47a` |
| `PF-03.receipt.json` | 1,102 | `ead9ce486aa80b582320c47d76841c35e24b2743e2ee8bc18c96cd2a45499b20` |
| `PF-04.attempt` | 224 | `7dddef812c09c8a69f446b7429ddd4f0ab7cb9fd30c3d8748897bf78c2d7c1ee` |
| `PF-04.receipt.json` | 1,061 | `2291539bc55d856cf971045ea43c73ebbc4e3efd631364e674822b0c0f9d5371` |
| `PF-05.attempt` | 224 | `8c616b5e2b0ba561d8d45746e1c0b06c5da67b4341e88a8c4a477820ded19797` |
| `PF-05.receipt.json` | 1,119 | `f5868e8f8bfe2e3742e1533a420c6a9abd04f2aba5916e1ef906b1d0150a19ea` |
| `PF-06.attempt` | 224 | `56a222b36f676cc60c1d7f2e2b6360cf981f7461de5c132fd9dee284e6e166a7` |
| `PF-06.receipt.json` | 1,054 | `0b262f577381148ae951754775af34e9ae8dbbdf1e47b06ac1e255f8a1989b84` |
| `PF-07.attempt` | 224 | `26e67440f173321853484327c274a5642479eb32423abac8a2ebc8f88d92660d` |
| `PF-07.receipt.json` | 1,124 | `2c9c671b4ab4ca7946df1a757f7e6954b1e254eb4da9e5b44eba87af13529f04` |
| `PF-08.attempt` | 224 | `5ba3fd3e335368b764a0f6408aeac22a194a5b44905e3651bebe48e5844f6ad7` |
| `PF-08.receipt.json` | 1,123 | `473e3631b5806f473d46028ec8ed328d1d774be4e3ea2f39a153dc50e11e74c6` |
| `PF-09.attempt` | 224 | `3fbe58274daee217e1fe1e5542381e0436bd79beeded985dc5dcacaa8038964d` |
| `PF-09.receipt.json` | 1,104 | `ff2958e48ed21628f516fa213f57e79240c9fb2ae89d395a6c279553d14b5b2c` |
| `PF-10.attempt` | 224 | `606c9543059e07ba9a7e7afd57a447d964384e9c82d63707389b7dfa13fa8214` |
| `PF-10.receipt.json` | 1,108 | `60f7243993ddc2c932035ccb320d66d1eff400783f81d6dcbaebe92dbcbd7de1` |
| `PF-11.attempt` | 224 | `f93436f32f50c03c8b325dfd042446964b7679d99d4ae13ceb1c1299c863e5d6` |
| `PF-11.receipt.json` | 1,105 | `05a8b040f7cfc9d1a5caa27d5e042543a67759c9b2051057250858d349d9600a` |
| `PF-12.attempt` | 224 | `47028435a5a3796dafa1038eff970369ecdf18a01963b4785bbbc78977f13bf7` |
| `PF-12.receipt.json` | 1,106 | `874367feb36e99aeef3cc4e7cd6d94bd0b44968bbf7eda32741bab387709fbe5` |
| `PF-13.attempt` | 224 | `89d1a77a60aeefb27da8cc89489095300516810df6f7bc2bbafc96e5550a0469` |
| `PF-13.receipt.json` | 1,120 | `9b272b984a90a696431ba8cabdbe120659630c2db85635d7e68cffb02504d256` |
| `PF-14.attempt` | 224 | `003448d43444a08e163be5dc07210d4b096c71ca6828fe3b6a9c039c7347d091` |
| `PF-14.receipt.json` | 1,123 | `f9be7b88e1fb01c31ac83801e5bd68766e19f37ae70f9702bec8b210be8870b5` |
| `PF-15.attempt` | 224 | `b61b64bac880ec7dc6a2897bde2af574a54f01d56ac267a51364a53ff1f5ed9d` |
| `PF-15.receipt.json` | 1,101 | `9a726bd60d5e5c5650c8c2d136af83a386aea3d96758e61a30c221b5e2588800` |
| `PF-16.attempt` | 224 | `5d8b0780959492d447720fd65eaf1e8a23a17495530920ea0779006f5a3058a7` |
| `PF-16.receipt.json` | 1,113 | `fb886b9a9cadcf33b068ce567261d1e16c04d6b09d52329ce274f974d96cd705` |
| `PF-17.attempt` | 224 | `ef530f923978cc397b60a30e08ffce0e26b1add1019763bf0ce2d68f85ad96e8` |
| `PF-17.receipt.json` | 1,026 | `095d19dc881c46347694f2916be2ec75a51d3840ebd48800375994e04c2c5aa3` |
| `PF-PORTFOLIO-RUN.attempt` | 244 | `f501870f3b2a04b798c9a97c7783d0f1051201571e2317e0fe756dd5d14d0a52` |

All generated files are ignored, untracked, absent from `HEAD`, canonical
regular single-link files. The source repository contains no raw provider body
or public real-data artifact. The eventual terminal generated inventory must be
the eight historical files plus these 35 immutable post-run files after the
observer alone is deleted.

## Health, LKG, real/synthetic state, and gates

No portfolio candidate has an admitted source configuration, acquisition,
normalized record, analyzed-corpus record, public shard, artifact, source
health state, or checksum-approved last-known-good shard. Failed observations
cannot be relabeled stale or current. Every candidate is either retained
contract evidence, a candidate, or evidence-blocked; all remain disabled and
inactive.

The application's committed demonstration data remains synthetic. The
real-source lifecycle contract and source-neutral analyzed-corpus contract are
implemented, but every real-source corpus creation path still fails closed on
missing lifecycle integration. There is no real-versus-synthetic merge.

Credentials/accounts, affirmative terms acceptance, private data, provider
contact, paid/licensed access, optional AI, outbound notifications, remotes,
push, CI, Pages, deployment, publication, and K0/S0/O0 convergence remain
closed. The complete PNW source pack, local real-source prerelease, PNW regional
release candidate, legacy local release candidate, public beta, and publication
are not complete.
