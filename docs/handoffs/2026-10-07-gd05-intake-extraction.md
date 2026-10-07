# GD-05 intake extraction checkpoint

Current acceptance (2026-10-07): this bounded item is complete after final
independent review and source checkpoint `04d626f`. The complete current-code
`test-gd08-full` receipt exits 0 at 18:15 UTC; all required phases,
synthetic build/artifact and standing checks pass. Protected ignored settings
retain the sole global formatting failure; aggregate `check` is not claimed.
Earlier pending statements and failures below record the historical sequence.
GD-32's incomplete measurement rows remain incomplete; this acceptance does
not establish browser/capacity performance, acquisition or release completion.
The roadmap now selects GD-06; all separate operation gates retain their scope.

GD-05 moves reviewed corpus replay and Washington discovery into intake.
Acceptance remains pending. Recover the selected item and exact write leases
from [ROADMAP.yaml](../../ROADMAP.yaml) and the
[autonomous run record](../development/2026-10-07-autonomous-run.md).

The replay module contains the unchanged reader, profile/capture binding
assertions, replay body and shared safe-file predicate. Its declarations use
existing corpus types and leave undeclared custody/input results opaque.
Washington discovery moves unchanged to its source-specific intake directory.
Relative imports resolve to existing core and intake members; neither new
module imports output or the private seam.

The legacy output path re-exports replay and imports its shared helpers.
Its remaining writer, reader, validation, failure simulation and server bodies
remain unchanged for GD-06. The legacy discovery path is a three-function
re-export shim. This follows the module design's staged extraction; the entire
output file becomes a pure shim in GD-06. Added identity tests cover both
legacy compatibility paths. The eight actual-reader cleanup cases change only
their source URL and preserve their assertions.

Root and both independent reviewers compare the complete moved bodies with
selection commit `b7f3f5d6164a1b20ec02102deec74f34dc003d86`: replay/helper
and discovery bodies, and all retained output bodies, match after line-ending
normalization. Independent intake and integration reviews pass. This comparison
does not establish test acceptance. Lint, typecheck and source-boundary scan
pass. Complete policy validation passes all 145 tests, including both added
compatibility checks and GD-01 characterization, in 299.349 seconds.
Complete assurance passes all 100 tests without skips in 43.450 seconds,
including all eight actual-reader cleanup cases. The complete unit suite
passes all 1,926 tests across 106 files in 239.91 seconds, including module
boundaries, public reachability and retained non-interference coverage.
Synthetic build and artifact validation pass: 3 records, 575 synthetic Nations
and 8 verified assets (`synthetic-439895dd3488b465bfb5`). Required full-suite
attempt `test-gd05-full` exits 1 at 17:18 UTC: corpus passes 13, spine passes
30 with its unchanged privilege skip, and policy passes 136 of 145. Nine
tests fail with `WINDOWS_PROBE_TIMEOUT` at bounded-operation-runner lines
536/637, custody-PDF lines 199/284 and local-output-replay lines
329/395/433/515/535. Later phases do not run. Acceptance remains pending;
focused successes do not replace the failed full run. No module allowlist,
deadline, custody implementation, historical private contract or source
interface changes. No acquisition, publication or private-sharing gate opens.

Immutable validation logs and receipts belong in
`C:/dev/_scratch/policy-sentinel/autonomous-2026-10-07/`.
GD-31, GD-32 and GD-04 retain their unmet full-suite acceptance obligations.
This checkpoint makes no release or product-completion claim.

Reviewed incomplete local commit `88c632fa1ef21274be048874fa23b6c856cc6fce`
contains exactly the eleven leased paths. The live ledger temporarily defers
GD-05 and selects independent GD-07 at priority 317. No dependency completes
and GD-06 remains not_started. Read-only preparation also finds that GD-06's
mechanical output move needs a reviewed composition plan to avoid forbidden
intake imports; it is not dispatched. Recover current execution from the live
ledger and GD-07 manifest in the autonomous run record.
