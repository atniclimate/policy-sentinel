---
name: policy-sentinel-source-review
description:
  Review a proposed official policy source for Policy Sentinel's authority,
  contract, coverage, privacy, reuse, lifecycle, and activation boundary. Use
  for new or materially changed source/adapter feasibility; do not use for
  ordinary code review or to bypass a closed access or terms gate.
---

# Policy Sentinel source review

Produce a path- and source-cited feasibility record that clearly separates
observed evidence, repository inference, unresolved gaps, implementation state,
and activation authority.

## Authority first

Read `AGENTS.md`, `ROADMAP.yaml`, `docs/data-governance.md`,
`docs/source-feasibility.md`, `docs/source-coverage.md`, the source registry,
and the closest prior source review before acting. Treat the originating
government, legislature, court, agency, or Nation as the authority. A catalog,
search result, third-party copy, or model summary is discovery evidence only.

Do not access a source when access or continued access accepts terms, requires
registration/credentials/payment/contact, is prohibited by host policy, or is
outside the exact task authority. Record the gate and stop. Public visibility
and CORS do not authorize use. Use build-time assumptions only; never design a
browser dependency on the provider.

## Review outcome

For the exact source surface and access date, record:

- originating authority, canonical URLs, and whether each surface is an API,
  feed, export, index, document page, file, or discovery-only catalog;
- authentication, terms/action-on-access, attribution, reproduction/excerpt,
  robots or comparable policy, rate, pagination, byte/request/time budgets,
  CORS/static implications, and update cadence;
- exact observed fields, identity, dates, status/lifecycle, relationships,
  subject labels, range, completeness limits, mutable behavior, and failure
  modes;
- the strict public-field allowlist and prohibited raw, personal, contact,
  comment, credential, private, land, cultural, or unrelated content;
- whether exact Nation association or deterministic taxonomy evidence exists,
  without deriving either from names, keywords, geography, eligibility, or
  institutional identity;
- fixture needs for representative, missing, malformed, duplicate, truncated,
  reordered, stale, privacy-bearing, and failure cases;
- source-isolated health and last-known-good behavior; and
- one disposition: viable for a bounded contract, implemented but disabled,
  activation evidence required, terms/credential blocked, evidence blocked, or
  no viable source contract.

State documented range, selected build range, and actual emitted range
separately. State unavailable, not observed, unknown, incomplete, and outside
coverage separately. Never describe research, a fixture, an adapter, or a
successful request as source activation or product coverage.

## Handoff

Return findings to the lead. Do not edit shared authoritative files, create an
adapter, change the source registry, enable a source, accept terms, retain raw
responses, or make an external mutation unless the current task separately and
exactly authorizes that action. Name the precise next evidence or owner gate.
