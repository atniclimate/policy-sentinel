# GD-04 boundary guard checkpoint

GD-04 implements the shared protected-key guard and its record-validation
integration. Acceptance remains pending. Recover the live status and next action
from [ROADMAP.yaml](../../ROADMAP.yaml) and the exact execution leases from the
[autonomous run record](../development/2026-10-07-autonomous-run.md).

The core exports an immutable set of 70 normalized keys, derived from all 77
retained origin spellings. Its strict recursive guard scans descriptors,
including nonenumerable and symbol-held descendants, without invoking getters.
Cycles and deep objects are handled iteratively. Accessors and inspection
failures reject with fixed messages that contain no input values.

Record validation uses the shared key predicate. Only the six exact required
canonical root names are exempt; their descendants remain subject to rejection.
Schema, provenance, identity and aggregated validation errors retain their
existing behavior. Historical private-seam lists remain unchanged. New tests
cover spelling variants and forbidden descendants beneath the canonical roots.

Independent core and integration reviews pass. Lint, typecheck, ledger/backbone,
source scan and the synthetic build/artifact pass. The first unit attempt passes
1,925 tests and fails only its unchanged 45-second pipeline wrapper, which takes
110.838 seconds. Global formatting fails only on the protected ignored local
settings file; that file remains untouched.

The conditional test-harness repair preserves fresh files, the actual YAML
parser, filesystem checks, validator body, CLI cases and deadlines. Ordinary
JSON-shaped module fixtures use the JSON subset of YAML. Other values retain
the original serializer. Review corrected an unusual sparse-array fallback;
direct malformed and duplicate-key YAML bytes now exercise both parser entry
points. The first complete experiment passes 494 cases in 61.442 seconds,
compared with the retained 95.656-second run. It precedes the final correction
and additional syntax test, and does not establish a wrapper pass.

Final unit validation passes all 1,926 tests across 106 files in 266.62 seconds,
including the pipeline wrapper with its unchanged 45-second deadline. The
full `test-gd04-final` attempt passes all 143 policy tests, then fails two of
100 assurance tests: native cleanup reports `BOUNDED_NATIVE_CHILD_FAILED`, and
a reparse refusal receives `WINDOWS_PROBE_TIMEOUT`. Root serializes the same
three assurance files without changing isolation, assertions or deadlines.
Independent scheduling review passes. The complete serialized assurance check
passes all 100 tests without skips in 54.400 seconds. A new full attempt,
`test-gd04-serialized-assurance`, exits 1 before policy: spine passes 26, fails
four on `TIME_LIMIT` (corpus-store lines 174, 502, 539 and 588), and retains
its one privilege skip. Full acceptance remains unmet. Immutable logs and
receipts are retained under
`C:/dev/_scratch/policy-sentinel/autonomous-2026-10-07/`. Neither focused
successes nor this local checkpoint waive GD-04, GD-31 or GD-32 acceptance.
No acquisition, private-data, publication or other external operation is opened.

Reviewed incomplete local commit `9822139befee84711a3c1ad099dcadb2f439be08`
contains the eleven leased paths. The live ledger temporarily defers GD-04
and selects GD-05, whose complete
GD-01/GD-02/GD-00 dependency closure and local synthetic authority are verified.
No other not_started item becomes ready under that transition. Recover the
actual selected item and commit from the live ledger rather than inferring
completion from the implementation or focused test results. Recover the exact
new write leases from the GD-05 manifest in the autonomous run record.
