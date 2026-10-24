# Jev audit of the demo passage rules (2026-10-23)

Development-only use of Jev (TypeSafe `jev-1.14.0`) under D-114. Jev does not
run in the demo or the Worker; it measured the deterministic rules in
`src/demo/rules.ts`, which stay the only thing the page runs.

## Method

`scripts/dev-ai/audit-rules.mjs` read 50 recent Federal Register rules and
proposed rules (25 found by "tribal consultation", 25 newest) from the
official API and GovInfo, and ran the same extractor and rules the Worker
runs. For each rule hit it asked Jev one yes-or-no question about the quoted
sentence (for example "Does this sentence give a date by which something must
happen or on which something takes effect?"). It also asked, for every Tribal
sentence the consultation rule did not match, whether that sentence describes
consultation or coordination with Tribal governments. Readings: above 0.7 yes,
below 0.3 no, between them unsettled. Only public Federal Register sentences
and titles were sent. Requests and outputs are in
`C:/dev/_scratch/policy-sentinel/jev-parallel-20261023/`.

## Findings and changes

| Rule | Before (demo-rules-1.0.2) | After (demo-rules-1.1.0) | Change |
| --- | --- | --- | --- |
| Tribal wording | 90 of 90 yes | 97 of 97 yes | none needed |
| Date or deadline | 35 of 123 hits judged not a deadline (28%) | 14 of 115 (12%) | skip dates that only cite a commenter's letter or an FR page; require the deadline word within 80 characters |
| Consultation wording | consulting firms and company names matched | left out | skip "consulting firm/company/services" and capitalized "Consulting" |
| Consultation wording, recall | 19 Tribal-coordination sentences missed | 4 of them now found | add coordination or engagement with Tribes and E.O. 13175 standard wording |
| Status signal | 14 of 168 judged not a status | unchanged | the tried fix lost as many true hits as it removed |
| "No consultation wording found" | 12 documents, 0 missed Tribal consultation sentences | 15 documents, 0 missed | none needed |

Most remaining "no" readings for consultation wording are Executive Order 13175
statements ("This action does not have Tribal implications"), which the rule
means to show; the audit question asked about a consultation process, so those
readings are a question mismatch, not rule errors.

## Defect found

Five of the sampled documents (11%) failed text extraction with
`CONTROL_CHARACTER`: GovInfo now prints single NUL characters at the start of
header banner lines in short rule files, which the extractor accepted only for
Presidential documents. `src/pipeline/policy-text.mjs` now accepts a single
NUL only at a line start before the first page marker of a Federal Register
file, records it as `source_header_line_nul`, and marks such extractions with a
distinct parser config digest (`nulContract: fr-header-line-nul-v1`), so
earlier digests and the sealed corpus are unchanged. After the fix all 50
documents extracted.

## Regression tests

`tests/demo/rules.test.ts` ("rule audit regressions") and
`tests/pipeline/policy-text.test.mjs` ("rule headers permit single NULs only at
line starts before the first page").
