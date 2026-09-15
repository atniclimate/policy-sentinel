# Makah demo sovereignty adversarial review C4 and lead dispositions

Accessed: 2026-09-15

A task-assigned, read-only sovereignty adversarial reviewer mirroring the
installed `sovereignty_adversarial_reviewer` boundaries audited the three
reconciled scout reports, the five source reviews, the additive feasibility,
coverage, architecture, data-contract and decision-register changes, the
three schema drafts and the five engine modules as they stood before the
lead's repair pass. The reviewer returned fourteen findings and a FAIL
recommendation pending four material closures. The reviewer's verdict is not
acceptance; the lead's dispositions below are not owner acceptance either.
Checks for personal contact data and sensitive land content returned clean:
no personal name used as a contact, phone, email, signatory or officer name,
and no coordinate, parcel number, real trust or fee status, cultural-site or
exclusion-list content anywhere in scope.

| Id | Severity | Finding (abridged) | Lead disposition |
| --- | --- | --- | --- |
| C4-01 | material | The `landStatusType` vocabulary (trust, fee, allotted, ceded) and a synthetic in-memory adapter land in Git while D-068 is only proposed; D-010 speaks of a documented but unimplemented adapter. | Open, owner decision. The launched packet (exact current owner direction, first in the authority order) specified both the enum and the synthetic test-only adapter interface. The vocabulary is an enum in a private-only schema with synthetic fixtures, not land content; the adapter has no I/O and rejects real data. The owner adopts or amends D-068 at the recorded checkpoint, or directs removal. |
| C4-02 | material | A parcel-scoped export could carry a tribal `whyAssociated` naming any Nation because the mismatch check skipped `scope.kind: parcel`. | Closed. The parcel scope now carries the parcel's `jurisdictionLayers`; the mismatch check runs for both scope kinds and compares `nationId`. The reviewer's counterexample is a negative test in `citation-export.test.ts`. |
| C4-03 | material | The personal-shape token guard is bypassable by an unmarked name and D-068 over-promised rejection. | Closed for the decision text and the guard scope: D-068 (proposed) now states the guard is finite and that agency-level status rests on provenance and source review; `issuingAuthority.name` is scanned; a test documents that an unmarked name passes. Open by design: no validator can prove a value is agency-level. |
| C4-04 | material | `parcelId` accepted an all-digit slug despite "never a bare APN". | Closed. Both schemas require a letter-led slug; the bare-number case is a schema-invalid fixture case; prose now says opacity beyond the pattern is producer discipline. |
| C4-05 | material | A tribal layer carried a free-text Nation name with no identity key, and matching compared names. | Closed. Tribal layers require `nationId` (`nation:<slug>`), non-tribal layers require null (schema `if/then/else`), `resolveParcelQuery` matches only a validated `nationAssociations` entry with the same `nationId`, `whyAssociated` carries the `nationId`, and the schema description states a tribal layer is a candidate label with no identity standing until bound to an accepted identity record. |
| C4-06 | material | The Makah Tribe review asserted `makah.com` as the official domain without an observation establishing it. | Closed. The review now records the domain as observed and its publication authority as an unverified gap. |
| C4-07 | material (owner item) | A scout read FederalRegister.gov's keyless JSON API under terms the project records as unknown. | Open, owner acknowledgement required. Recorded in the C3 report, the federal actions review and the outcome handoff; the lead's own verification used GovInfo PDFs. Not an adapter operation; `FR-A1` not issued. |
| C4-08 | minor | "Candidate allowlist" heading; treaty issuing authority omitted. | Closed. Heading renamed "Exact-document candidates (not an allowlist)"; treaty authority added. |
| C4-09 | minor | Snippet-derived NARA title recorded as if observed; dangling culvert row; Chapter 5B "exists" wording. | Closed. Title prefixed "snippet-derived, unverified"; culvert row reworded as not listed; Chapter 5B now "reported by the scout, not opened". |
| C4-10 | minor | `sensitivity: public` permitted on an object whose non-claim says never public. | Closed. `public` removed from the boundary sensitivity enum and type; a schema-invalid fixture case pins it. |
| C4-11 | note | `whyAssociated` could read as applicability or as a `nationAssociation`. | Closed. Schema description and contract JSDoc state it is layer-match display only, not a nationAssociation, not relevance, never applicability. |
| C4-12 | note | A serialized `PrivateView` was indistinguishable from public output; `loopbackOnly` is caller-attested. | Closed for the marker: `PrivateView` now carries `deploymentProfile: "private"` and `trustDomain`. Open by design: `loopbackOnly` remains a caller attestation, as documented. |
| C4-13 | material (false completion) | Documentation claimed compilation and test enforcement without command output; the foundation validator counted protected-key cases as schema-invalid. | Closed. Protected-key cases are counted separately in `validate-foundation.mjs`; the numeric `$ref` count is restored in the data contract; exact command outputs are recorded in the outcome handoff, and the documentation rows describe what the suites enforce as of that recorded run. |
| C4-14 | minor | "United States" appeared as a synthetic fixture authority name. | Closed. Replaced with "Synthetic Federal Union" in the parcel and export fixtures. |

Remaining open items after repair: C4-01 (owner adoption or amendment of
D-068 relative to D-010), C4-07 (owner acknowledgement of the research API
read), and the two by-design limits recorded in C4-03 and C4-12.

The reviewer read the files listed in its report; it ran no npm script and
asserted nothing about test results. The lead's repair commands and their
outputs are recorded in
[the outcome handoff](../../handoffs/makah-demo-01-groundwork-outcome.md).
