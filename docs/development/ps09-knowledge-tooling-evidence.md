# Knowledge assurance tooling and API evidence

Observed2026-09-05 against installed runtime Node24.19.0/npm12.0.2.
Context7 received only generic API questions, never repository code, source
bodies, configuration or secrets. Resolve and focused query calls completed.
Documentation supports design interpretation; it is not a static analysis or
test result. Actual command outcomes live in the coordination journal/outcome.

## Dependency behavior and version fit

| Dependency | Context7 identity and concept | Primary evidence and installed check | Limits |
| --- | --- | --- | --- |
| YAML2.9.0 | /eemeli/yaml; parseDocument errors, duplicate/multiple documents and alias limits | [public API](https://github.com/eemeli/yaml/blob/main/src/public-api.ts), [options](https://github.com/eemeli/yaml/blob/main/src/options.ts), [errors](https://github.com/eemeli/yaml/blob/main/docs/08_errors.md); installed public-api.js records Document.errors and toJS maxAliasCount defaults100. | Indexed main is unpinned. Returned prose saying multiple documents always throw was resolved against actual source: inspect errors before conversion. New validator forbids aliases and finite oversized input. |
| Vitest4.1.10 | /vitest-dev/vitest/v4.1.6; unhandled-error failure behavior | [unhandled-error configuration](https://github.com/vitest-dev/vitest/blob/v4.1.6/docs/config/onunhandlederror.md); installed cli-api.BK8pd4xc.js checks errors and sets nonzero. | Indexed4.1.6 differs from installed4.1.10; some returned snippets reference main. No dangerouslyIgnoreUnhandledErrors or onUnhandledError filtering introduced. |
| Playwright1.61.1 | /microsoft/playwright/v1.61.0; close rejection and download cancellation | [Browser.close](https://github.com/microsoft/playwright/blob/v1.61.0/docs/src/api/class-browser.md), [Download.cancel](https://github.com/microsoft/playwright/blob/v1.61.0/docs/src/api/class-download.md); installed coreBundle.js56774 awaits cancellation,61099 awaits close and rethrows non-target-close errors. | Indexed1.61.0 differs from installed1.61.1. Package located in the existing C:/dev/GeoBase dependency tree; nothing installed. No new browser run or proof against never-settling cleanup. |

Exact installed paths were inspected read-only. Missing legacy Playwright layout
and truncated bundled searches were followed by exact bounded line reads.
YAML duplicate/multiple/alias regressions and browser synthetic close/write/cancel
tests settle the implemented cases independently of documentation prose.

The worker freshly read official Obsidian
[Bases syntax](https://obsidian.md/help/bases/syntax),
[properties](https://obsidian.md/help/properties) and
[links](https://obsidian.md/help/links). Flat YAML properties, core links and three
Bases require no community plugin, Sync or Publish. Native application rendering
and human usability remain unproven in this session.

## Error-path audit and execution graph

Batch child status2 previously left exit0; empty stderr obscured spawn errors.
Fixed bounded categories preserve nonzero failures and spent-operation selection.
Custody atomic/lock cleanup previously erased the primary error; aggregate
retention now preserves it and failed close leaves the lock. Browser close and
download rejection are observed before owned report sealing; persistence always
attempted on settled cleanup, with console redaction at the final CLI boundary.

Parsing/normalization deliberately rejects malformed input; URL/text exclusions
are fail-closed with surfaced evidence. Validation collects expected invalid-input
issues and rethrows unexpected exceptions. LKG/transport retains failed receipts
and charges attempted operations. Local build buffers reviewed outputs; local
server reads verified output into memory and binds loopback. Search/temporal
operations are network-free and preserve unknown/source-stated semantics.
These reviewed paths are bounded observations, not exhaustive error absence.

Windows stdin delivery error handling and a cleanup promise that never settles
remain explicit risks in the findings register. TypeScript allowJs=false does
not typecheck .mjs; recommended ESLint rules do not establish promise coverage.
PowerShell native statuses are checked immediately; failed/truncated reads and
first failing tests remain recorded.

The Node suite graph now includes seven suites nested in pipeline.test.ts,
nine policy suites, three spine, one corpus, one hooks, one backbone, three
Tier1, one assurance and one knowledge. Vitest TS/TSX discovery is separate.
The formerly omitted backbone/Tier1 suites run after the actual CA guard was
isolated from acquisition. No spent operation is dispatched by that test.

## Optional Graphify disposition

No-go for this run. The approved preparation inspected commit
937e59a5476fcb2665d6c4f4b7c0d0a4142011b6 and package graphifyy0.9.54;
that is dated source assessment, not a current version reconciliation or a
Windows/offline execution result. The preparation supplied no fully pinned
transitive dependency/retrieval/install-script closure for this environment.
This run did not establish that closure, enumerate and retrieve its software
origins, install it, copy code to it or measure benefit. Optional scope therefore
ends without execution; no claim that the tool is inherently unsafe follows.

Retained preparation evidence reports stock graph HTML loading vis-network from
unpkg and call-flow HTML loading Mermaid from jsDelivr, plus query-logging docs
that conflict with pinned code's explicit enable/path behavior. Those views
cannot be called offline from documentation alone. Any later pilot needs current
source reconciliation, exact pinned dependency/origin inventory, reviewed local
assets or omitted HTML, explicit no-query-log configuration, copied tracked-code
allowlist, input/output hashes and actual blocked-network/Windows measurements.
No Codex integration, hooks, MCP, model extraction or product dependency was added.

The mandatory reusable profile and synthetic second-project fixture supply the
small project-neutral scaffold independently. A second real project still needs
owner selection; neighboring repositories and corpora were not scanned.
