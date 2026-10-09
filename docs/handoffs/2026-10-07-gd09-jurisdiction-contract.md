# GD-09 synthetic jurisdiction contract

GD-09 was selected as the sole active item after accepted GD-06 source checkpoint
`1def69b2c156973777de826b20ad467778f16b43`. GD-10 becomes ready because
GD-04/06/07/08 are complete; GD-09 has the lowest eligible priority (319).
Its full recursive closure is GD-09 → GD-02 → GD-00, with reviewed completion
commits and approved G-GENERAL-DEV-01 under D-071/D-073/D-079. This local
synthetic contract dispatches no source requests and changes no retained
public record, Nation identity registry or corpus 2.0 contract.

The closed Draft 2020-12 schema ID is
`https://policy-sentinel.invalid/schemas/jurisdiction-ref.schema.v1.json`.
Registry input requires exactly $schema (this ID), schemaVersion ("1.0.0"),
synthetic (true), reservedNamespaces (exactly ["ca","ca-province"]) and entries.
All object levels reject additional properties. Definitions include active
and reserved refs, exact subject, evidence, member, five entry branches and
association. Reserved Canadian forms are modeled but cannot become active
entries, members or associations.

Every entry requires kind, ref, label and evidence. Federal uses kind federal
and ref us. State uses kind state, ref us-state:XX, usps (two uppercase ASCII
letters) and fips (two digit string). County uses kind county, ref
us-county:NNNNN, fips (five digit string) and stateRef. Nation uses kind nation,
ref nation:synthetic-<slug>, reviewState reviewed and exact subject evidence.
Body uses kind body, ref body:<slug> and members [{ref,evidence}]. Jurisdiction
slugs use lowercase ASCII letters/digits with single separating hyphens, at most 64
characters; label is nonblank and at most 256 characters. No current state
lookup table, actual county table or recognition metadata is introduced.

Evidence requires url and locator, with optional exactSubject
{recordRef,ref,text}; Nation evidence requires it. URL must be HTTPS without
credentials or port, with a hostname ending in .invalid; no acquisition or
official-source qualification is implied. Locator is nonblank up to 1024
characters, exact text nonblank up to 8192. Record refs use
record:synthetic-<slug> (up to 128 total characters, with suffix up to 111);
exact subject ref is an active ref. Entry exact subject, when supplied,
matches its entry ref; member exact
subject, when supplied, matches its member ref. Every evidence object is
synthetic declared metadata, including its review state and quoted text.

An association requires exactly $schema, schemaVersion, synthetic, recordRef,
jurisdictionRef, basis, evidence and reviewState. It resolves exactly in the
supplied registry. Basis is issuing_authority or source_stated_scope; review
state is unreviewed, reviewed or rejected. A Nation target requires reviewed
and exactSubject.recordRef/ref matching the association record/target for
both bases. A supplied exactSubject on any association matches those same
fields. No fuzzy, keyword, sponsor, geographic or body-membership inference
is permitted. Body membership never propagates an association to its members.

Registry semantics reject duplicate refs, mismatched supplied codes,
dangling county parents and a county FIPS prefix differing from its parent's
FIPS. Preserve leading zeros. Body members resolve exactly, with no duplicate,
self or cyclic body memberships. Syntax agreement is no geographic or legal
determination. Nonblank textual metadata retains source spelling; no trimming
or semantic rewriting is returned.

Runtime uses existing Ajv 8.20.0 and the shared core protected-key guard.
Module initialization strictly compiles the repository-owned schema, with
allErrors false and all mutation options disabled. No schema or code is
loaded from input or fetched. A helper accepts JSON strings only, validates
shape selector registry/association, bounds raw text to 4,194,304 code units,
and parses without a reviver. Iterative traversal bounds depth 32, nodes
200,000, each array/object 4096 entries, individual strings 8192 characters,
keys 256 characters and combined key/string text 4,194,304 units; reject
nonfinite/unsafe numbers, malformed input and protected keys. Reject caller
objects/getters/proxies before any property access. Freeze the parsed snapshot
before semantic checks and return deeply readonly public results.

`JURISDICTION_REF_SCHEMA_ID` is the constant's exact exported name. Counting
uses root depth zero, one node per JSON value and decoded UTF-16 key/string
units. Synthetic URLs also reject literal backslashes and whitespace, with
complete hostname-label validation. Body cycles use iterative tri-color DFS.

Registry runtime exports exactly that schema ID constant, public
parseJurisdictionRegistry(jsonText: unknown): Readonly<JurisdictionRegistry>,
and documented internal
parseJurisdictionSchemaInput(jsonText: unknown,
shape: "registry" | "association"): unknown. The internal helper returns a
frozen structural snapshot, never a semantically accepted typed registry or
an authority decision. Shared readonly types include JurisdictionRef,
ExactSubject, JurisdictionEvidence, the five entry variants and
JurisdictionRegistry. Association exports its readonly JurisdictionAssociation
type and public parseJurisdictionAssociation(jsonText: unknown,
registryJsonText: unknown): Readonly<JurisdictionAssociation>. It reuses the
internal helper and public registry parser, without a reverse runtime import,
third runtime module or duplicate schema compilation.

Worker A owns exactly four new files:

- src/modules/context/jurisdiction/registry.ts
- schemas/jurisdiction-ref.schema.v1.json
- fixtures/context/jurisdiction-registry.synthetic.valid.json
- tests/context/jurisdiction-registry.test.ts

Worker B owns exactly two new files:

- src/modules/context/jurisdiction/association.ts
- tests/context/jurisdiction-association.test.ts

Workers are not alone in the repository; preserve concurrent work and do not
revert other changes. They do not stage, commit, run validation or expand
leases. Root owns ROADMAP.yaml, this handoff, the autonomous run record and
the GD-06 handoff. Root alone serializes native checks and writes the index.
Dispatch begins only after the exact four-document selection checkpoint
passes full ledger/backbone checks and independent review and is committed.

The fixture covers all five kinds, a state beyond WA/OR/ID and a leading-zero
county. Tests strictly compile both schema entry points and exercise missing,
malformed and additional fields; schema/parser disagreement; code/parent/ref
integrity; dangling/duplicate/cyclic members; reserved Canadian refs; true-only
synthetic mode; real Nation-ref refusal; both exact Nation bases; no member
propagation; deep freezing; hostile objects without invoked traps; iterative
limits; and normalized protected-key variants. New tests are discovered by
the existing unit suite, and backbone discovers the schema. No package,
global module manifest, private seam, protected deadline or existing contract
needs modification. Focused tests, typecheck/lint/source scan, complete npm
test, synthetic build/artifact, standing checks, preservation and independent
source/acceptance review are required.

GD-22 retains originating Nation identity, digest binding and D-079's
us_federal/reserved-empty ca_first_nation obligation. GD-11 retains corpus 2.1
integration; GD-13 retains public successor migration. This step proves only
the local synthetic model. No live coverage, recognition, membership,
official Nation association, jurisdiction, rights or legal-effect claim follows.

Current developer documentation was fetched through the canonical find-docs
CLI route (three attempts, one library resolution and two focused queries):
[Ajv schema management](https://github.com/ajv-validator/ajv/blob/master/docs/guide/managing-schemas.md),
[Ajv JSON Schema drafts](https://github.com/ajv-validator/ajv/blob/master/docs/json-schema.md),
[Ajv strict options](https://github.com/ajv-validator/ajv/blob/master/docs/options.md)
and [data mutation options](https://github.com/ajv-validator/ajv/blob/master/docs/guide/modifying-data.md).
The selected current library documentation is not a dedicated 8.20.0 snapshot;
installed-package compilation and existing repository imports verify the
specific constructor/entry path. A returned 2019-import snippet was not used
as Draft 2020-12 guidance; existing Ajv2020 imports remain authoritative local
examples, and the official draft documentation distinguishes the versions.

Independent selection review passes the exact four-document transition and
six-new-file contract. Full-ledger inventory confirms 62 complete, one active,
three ready, 25 blocked, two deferred and 42 not started, with no missed GD
promotion. Selection roadmap/backbone, owned roadmap formatting and whitespace
checks pass. Root committed the reviewed four-document manifest before issuing
either source lease; implementation and item acceptance were pending at selection.

Selection checkpoint is committed locally as
`0f4ec8d7660007964835693d85b29df2eaa462d0`, exactly four documents.
Both source leases are issued under that reviewed contract. A routine limit
clarification distinguishes jurisdiction slugs (64) from recordRef's existing
separate total bound (128, suffix 111); both workers use the same rule.
No additional files or source operation is introduced.

Both workers return all six source leases. Root reads every complete file and
formats owned files; independent cross-reviews pass production and integration.
The first focused receipt passes four files/125 tests in 33.89 seconds. Review
finds a newline-pattern test masked by a federal constant; root repairs only
the new fixture cases to target state/county/body patterns and assert schema
refusal. First typecheck flags the private refusal arrow's missing target
narrowing; a function declaration preserves its exact throw/error behavior.
Applied corrections pass independent review. Corrected typecheck and lint
pass. Corrected focused and complete validation were still required at that
checkpoint; GD-09 stayed active. All first receipts remain immutable,
including the failed typecheck and temporary owned-format failure before
wrapping repair.

Corrected focused unit passes four files/125 tests in 3.52 seconds. Owned
formatting and prefull roadmap/backbone pass (24 schemas and IDs, 1,376
references). Complete `test-gd09-full` runs from 19:59:30 UTC to 20:11:41 UTC,
exit 0, on frozen corrected source. Corpus 13, spine 30 plus unchanged
privilege skip, policy 148, assurance 100, backbone 26, tier-1 129, knowledge
31, storage 29, development-authority 37, search-measurement nine and unit
109 files/2,049 tests pass; unit duration is 188.91 seconds.

Standing build, artifact, runtime, hooks (47), knowledge, roadmap, backbone,
source scan, lint and typecheck pass. Synthetic build
`synthetic-8d514e1f46547e7cbac8` validates three records, the retained
575-Nation collection and eight hashed assets. Knowledge retains 17 stale
historical observations. Global formatting fails only on protected ignored
.claude/settings.local.json; no aggregate check pass is claimed. The failed
receipt and earlier failed typecheck remain immutable.

Independent final source review passes all six files and confirms substantive
negative cases, exact runtime exports and no remaining code or scope blocker.
Preservation at 20:12:57 UTC checks all 36 owner inputs, six historical
implementation pins and six frozen GD-09 source hashes with zero changes.
The saved final preservation receipt at 20:22:29 UTC confirms the same counts
and unchanged hashes.
The new source snapshot was captured at 20:01:59 UTC during the already-frozen
full run; it is not described as a pre-start snapshot. Final owned-document
checks and exact nine-path checkpoint review precede the source commit and
separate ledger acceptance. GD-09 stayed active until that transition.

Exact nine-path source checkpoint is committed locally as
`8b97383f37e33c0569e57b7e834ac8fd8ef582fc` at 20:24:01 UTC after final
owned formatting, whitespace, roadmap/backbone and independent receipt review.
The separate selection transition accepts this bounded synthetic work and
promotes GD-12 and GD-20 after full dependency/gate reconciliation. GD-10 is
selected at priority 320 under its reviewed production/enforcement contract.
GD-22 real identity, GD-11 corpus integration, GD-13 public successor and
all release/external gates retain their actual prerequisites and boundaries.
