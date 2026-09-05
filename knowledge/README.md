# Repository knowledge sidecar

This directory adopts the approved organization review's 41 document records,
18 curated knowledge entries and 17 references. It preserves every original
record field, including proposal labels and the seven inherited references that
still require fresh primary review. Adoption adds validation and a local reading
projection; it does not upgrade evidence maturity, grant work, qualify sources,
accept a release or authorize publication.

The authority owners remain explicit in `profile.yaml`: the repository backbone
owns navigation, `ROADMAP.yaml` owns work status, and the named contracts,
decision register, convergence registry and custody registry retain their own
authority. Generated cards and sidecar observations cannot override them.

## Inputs and historical citations

- `catalog.yaml` preserves document observations and adds verified Git blob pins.
- `entries.yaml` preserves curated summaries, limits and 47 source locators.
- `references.yaml` preserves bibliography provenance and review limitations.
- `profile.yaml` selects this project's namespace, exact documentation allowlist,
  authority owners, reviewed registry selectors and optional scoped relations.
- `template-profile.yaml` is a synthetic adaptation candidate for an
  owner-selected second project; it is not another project's approval.

Each adopted bundle records its original seed artifact name and SHA-256. The
raw seed hash domain is `raw_file_bytes`. The original
`working_file_sha256` remains a dated raw-byte observation, including original
line endings. The added `git_pin` records the Git object ID and SHA-256 of the
exact blob at revision `c65949fef2c8e331097cbaf9c32f04983cde2a64`.
Git pin verification does not certify that a raw working-file hash is equal.

Validation independently reports current raw-byte freshness and a comparison
that removes a BOM and normalizes CRLF to LF in memory. It never rewrites a
source. Current edits visibly stale the relevant observations; historical Git
citations and their exact section/line locators remain verifiable. No command
automatically refreshes pins. A deliberate citation update requires review of
the new revision, source location and observed scope before changing metadata.
The metadata does not pin itself, avoiding a self-referential hash cycle.

Inputs are finite, UTF-8, single-document YAML with unique keys, no expansion of
aliases and strict schemas. IDs resolve exactly and must remain project-scoped;
Windows case-fold collisions are rejected. Only tracked, explicitly listed
repository documentation may be read. Path escapes, self-input, symbolic links,
junctions, hard links and Windows reparse attributes are refused. The native
Windows attribute check fails closed when unavailable. The Policy Sentinel
namespace and original custody registry cannot be replaced in this repository;
both historical custody identities and current additions exclude owner originals.
All eight Policy Sentinel authority roles are bound to their canonical document
IDs and paths; synchronized sidecar edits cannot redirect authority to an experiment.

## Commands and generated files

Run commands from the repository using the selected local runtime:

```powershell
npm run validate:knowledge
npm run test:knowledge
npm run knowledge:generate -- --out <owned-external-parent>/<new-vault-name>
```

Validation prints a bounded JSON report. Generation requires an explicit
external output directory whose parent already exists as a plain directory.
`--root <repository>` selects a separately prepared project with the same four
metadata inputs. The ordinary application build does not generate a vault.

The reading view contains `INDEX.md`, one stable filename per record,
`document.base`, `knowledge.base`, `reference.base`, `navigation.json`,
`validation.json` and `MANIFEST.json`. Colons in IDs become `--` in filenames;
titles never become paths. For this adopted catalog, that is 76 cards and 83
files including the manifest. No source document body, corpus, private path,
remote asset, plugin configuration or `.obsidian` directory is copied.

Markdown text is rendered as literal prose; executable HTML, embeds, wikilinks
and YAML structure cannot be supplied by metadata. Flat properties use quoted
values and replace brackets/angle brackets with visible fullwidth characters;
the repository YAML retains the original values. Generated internal links use
stable card names. This follows Obsidian's documented distinction between
[Markdown links and embedded content](https://obsidian.md/help/links), its
[flat property model](https://obsidian.md/help/properties), and
[YAML Bases filters and table views](https://obsidian.md/help/bases/syntax).
The format is inspectable without an Obsidian installation. A passing parser
fixture is not evidence of app usability or a user study.

Navigation extracts supported inline Markdown links between cataloged files,
omitting comments, code, escaped openers, embeds and HTML lines. It intentionally
does not implement every Markdown construct. Two reviewed registry selectors
add exact component-evidence paths and literal catalog paths from the roadmap.
Uncataloged destinations are counted as omissions, not missing authority or
deletion candidates. These edges are `links_to`; the generator does not infer
acceptance, evidence support or supersession from proximity or keywords.
Stronger relations require exact endpoints, an explicit reviewed scope and a
verified historical source locator in `profile.yaml`.

## Ownership and failure behavior

Generation stages an exclusively created sibling directory, verifies every
generated byte against a manifest, then renames the prior verified view to a
backup and the completed stage into place. Regeneration requires the same
project and source-root alias. It refuses edited files, unknown files, unknown
directories, changed filename case, links and malformed ownership manifests.
An existing empty directory is not a generated view and cannot be adopted by
the publisher. It deletes only files whose current bytes still match the
operation's verified ownership manifest.

Fixtures interrupt staging and inject a failure before publication to verify
preservation and restoration of the prior complete view. Caught failures report
the primary error and cleanup/rollback errors separately through an aggregate
error. This is not an operating-system crash transaction: a crash between
directory renames may leave a backup or stage requiring manual recovery. Do not
delete those directories merely from their names; verify their ownership and
bytes first. Concurrent unknown or edited content is preserved and blocks cleanup.

## Adaptation evidence and limits

The focused fixtures create two independent synthetic Git repositories and
namespaces, validate historical pins and stale current sources, generate
separate graphs and prove no cross-project ID overlap. They exercise YAML
ambiguity and size limits, false authority, missing pins and locators, protected
inputs, literal rendering, case collisions, linked paths, edited or unknown
output, deterministic regeneration and caught interruption recovery.

To adapt the template, first obtain an owner-selected project and local scope.
Choose its namespace and authority owners, list exact documentation paths,
identify protected originals, and create that project's independently reviewed
catalog, entries and references with real Git pins. Do not scan neighboring
projects or reuse Policy Sentinel's evidence claims. The synthetic fixture
demonstrates reusable mechanics only; it does not demonstrate deployment in a
second real project or a universal knowledge service.
