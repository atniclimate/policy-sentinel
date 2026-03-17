# policy-sentinel -- Engine Repository
## Claude Code Project Instructions

---

## What this repository is

policy-sentinel is a **public, sovereignty-centered policy intelligence engine** built in Python. It ingests a corpus of policies, legislation, litigation, and grant programs; analyzes them for rights implications and status changes; and emits structured output via adapters (document, web component, standalone app).

This repo contains the **engine only**. It has no knowledge of any specific Tribe's policy corpus. Corpus configurations live in separate, privately-controlled repositories owned by the organizations that deploy the engine.

**Never commit corpus data, Tribal configurations, or organization-specific content to this repository.**

---

## Two-repository architecture

```
policy-sentinel/                          <-- THIS REPO (public engine)
|
+-- src/policy_sentinel/
|   +-- ingestor/                         <-- corpus intake and normalization
|   +-- analyzer/                         <-- status detection, change tracking, alerts
|   +-- adapters/
|   |   +-- output/                       <-- document / web component / app
|   |   +-- sources/                      <-- Federal Register, LegiScan, CourtListener, Grants.gov
|   +-- schemas/                          <-- Pydantic models (shared contracts)
|   +-- tsdf/                             <-- sovereignty data classification gate
|   +-- hooks/                            <-- extensibility hook Protocols
|
+-- examples/
    +-- tribe-deployment-template/        <-- template for new Tribe deployments

[tribe]-policy-sentinel/                  <-- SEPARATE PRIVATE REPO
|
+-- corpus/                               <-- organization's actual policy list
+-- config/                               <-- sovereignty framing, branding, adapter choice
+-- output/                               <-- generated artifacts
+-- reviews/                              <-- weekly review logs
+-- CLAUDE.md                             <-- Tribe-specific Claude Code instructions
```

When working in this repo, you are building the engine. You are never building a Tribe's specific application. If you find yourself writing Tribe-specific content, stop and move it to the examples/ folder or the Tribe's private repo.

---

## Core data contracts

These Pydantic models are the stable API between the engine and any downstream consumer. Changes to these require a version bump and migration notes.

```python
# src/policy_sentinel/schemas/policy.py

from enum import Enum
from pydantic import BaseModel


class PolicyStatus(str, Enum):
    monitoring = "monitoring"
    pending = "pending"
    enacted = "enacted"
    litigation = "litigation"
    expired = "expired"
    alert = "alert"


class SovereigntyFlag(str, Enum):
    T0 = "T0"
    T1 = "T1"
    T2 = "T2"
    T3 = "T3"


class PolicyAlert(BaseModel):
    date: str
    type: str  # "deadline" | "change" | "escalation" | "opportunity"
    message: str
    source_url: str | None = None


class PolicyRecord(BaseModel):
    id: str
    category: str  # "federal" | "idaho" | "state" | "tribal" | "grants" | "municipal"
    title: str
    doc_id: str
    source: str
    date: str
    summary: str
    status: PolicyStatus
    status_default: PolicyStatus
    last_checked: str | None = None
    notes: str | None = None
    alerts: list[PolicyAlert] | None = None
    related_ids: list[str] | None = None
    sovereignty_relevance: SovereigntyFlag | None = None
    rights_frame: str | None = None
```

```python
# src/policy_sentinel/schemas/review.py

from pydantic import BaseModel
from policy_sentinel.schemas.policy import PolicyStatus


class StatusChange(BaseModel):
    id: str
    from_status: PolicyStatus
    to_status: PolicyStatus


class WeeklyReview(BaseModel):
    week: str
    date: str
    policies: list[str]
    reviewer: str | None = None
    summary: str | None = None
    status_changes: list[StatusChange] | None = None
```

```python
# src/policy_sentinel/schemas/corpus.py

from pydantic import BaseModel
from policy_sentinel.schemas.policy import PolicyRecord


class OrgConfig(BaseModel):
    name: str
    sovereignty_frame: str | None = None
    contact: str | None = None


class CorpusConfig(BaseModel):
    org: OrgConfig
    policies: list[PolicyRecord]
    review_cadence: str  # "daily" | "weekly" | "monthly"
    alert_channels: list[str] | None = None
    adapter: str  # "document" | "web_component" | "app"
```

---

## Module responsibilities

### src/policy_sentinel/core/
Shared infrastructure: custom exceptions, structured logging setup, constants.

### src/policy_sentinel/config/
Central settings loader using `pydantic-settings`. Reads from environment variables, `.env` files, and `config.toml`. Provides `SentinelSettings` as the single configuration object.

### src/policy_sentinel/schemas/
Pydantic model definitions only. No logic. This is the shared contract between the engine and Tribe-specific repos. Exported as the public API surface of the package.

### src/policy_sentinel/tsdf/
Tiered Sovereign Data Framework gate. Provides `classify()` to assign sovereignty tiers (T0-T3) and `can_export()` to check whether data may cross a sovereignty boundary. See [TSDF v0.9.2](https://github.com/atniclimate/TieredSovereignDataFramework).

### src/policy_sentinel/db/
SQLAlchemy models, repository pattern, and Alembic migration directory. Provides persistence for PolicyRecord, WeeklyReview, and alert state.

### src/policy_sentinel/ingestor/
Takes a `CorpusConfig` and normalizes it into validated `PolicyRecord` instances. Handles schema validation, docket ID parsing, and deduplication. Must work entirely offline with a local corpus file.

### src/policy_sentinel/analyzer/
Takes `PolicyRecord` instances and returns updated records with status changes, alerts, and review logs. Handles status change detection, alert generation, and weekly review log creation. Runnable without web access (offline mode).

### src/policy_sentinel/state_machine/
Per-category policy status transition framework. Defines valid state transitions for each policy category and enforces transition rules.

### src/policy_sentinel/adapters/output/
Output adapters, each implementing the `OutputAdapter` Protocol:
- `document.py` -- PDF/DOCX formatted briefing (python-docx, reportlab)
- `web_component.py` -- Jinja2 HTML widget for embedding
- `app.py` -- FastAPI + HTMX standalone dashboard

Adapters must be independently importable. A consumer should be able to use `document` without pulling in dashboard dependencies.

### src/policy_sentinel/adapters/sources/
Source adapters, each implementing the `SourceAdapter` Protocol:
- `federal_register.py` -- Federal Register API
- `legiscan.py` -- LegiScan state legislation API
- `courtlistener.py` -- CourtListener/RECAP litigation dockets
- `grants_gov.py` -- Grants.gov opportunity listings
- `duckduckgo.py` -- Web search fallback for general queries

### src/policy_sentinel/hooks/
Five named extensibility hook Protocols with default stub implementations.

### src/policy_sentinel/templates/
Default Jinja2 templates for sovereignty-framed alerts and summaries. Deployments can override these via Jinja2 `ChoiceLoader`.

---

## Sovereignty constraints (architectural, not optional)

1. **No corpus data in this repo.** The engine is corpus-agnostic. Test fixtures use synthetic policy data, never real organizational corpora.

2. **TSDF classification is mandatory.** All data export paths must pass through the TSDF sovereignty gate. The engine handles T0/T1 data only. T2/T3 data must not cross sovereignty boundaries without explicit authorization from the data owner. See the [Tiered Sovereign Data Framework](https://github.com/atniclimate/TieredSovereignDataFramework) for classification details.

3. **Rights framing is configurable, not hardcoded.** The engine does not assume a specific rights frame. The `sovereignty_frame` field in `CorpusConfig` shapes how the analyzer generates summaries and alerts. Treaty rights are treated as jurisdictional baseline, not policy preference.

4. **Offline-first.** The engine must run without any network access when given a local corpus file. Web queries via source adapters are always opt-in.

5. **No telemetry.** The engine does not phone home, log usage, or transmit any data to any endpoint the operator has not explicitly configured.

---

## Cross-repo workflow

When making a change, first determine which repo it belongs in:

| Change type | Target repo | Branch workflow |
|-------------|-------------|-----------------|
| Engine capability (ingestor, analyzer, adapter logic, schema, hook) | policy-sentinel | Branch from `develop`, PR to `develop` |
| Tribe corpus, config, or output | `[tribe]-policy-sentinel` (private) | Direct commits to `main` |
| Bug fix to engine discovered during Tribe work | policy-sentinel | Branch from `develop`, PR to `develop` |
| New Tribe deployment | New `[tribe]-policy-sentinel` repo | Copy from `examples/tribe-deployment-template/` |

**Engine changes flow:** `feature/*` branch -> PR to `develop` -> merge to `develop` -> release merge to `main`.

**Tribe deployment flow:** Update engine dependency version, then direct commits for corpus/config.

If a capability is missing from the engine and you need it for a Tribe deployment, build it in policy-sentinel first, then use it in the Tribe repo.

---

## Extensibility hooks

Five named integration points, implemented as Protocol-typed callables (PEP 544). Each has a default stub implementation so the engine works standalone.

```python
from typing import Protocol, runtime_checkable


@runtime_checkable
class QueryPolicyStatusHook(Protocol):
    """Query external sources for current policy status."""

    def __call__(
        self, policy_id: str, doc_id: str, sources: list[str]
    ) -> "PolicyStatus": ...


@runtime_checkable
class ExportToGraphHook(Protocol):
    """Export policy corpus as graph nodes and edges."""

    def __call__(self, policies: list["PolicyRecord"]) -> "GraphExport": ...


@runtime_checkable
class ToTCRScannerHook(Protocol):
    """Feed policy data into TCR Policy Scanner pipeline."""

    def __call__(self, policies: list["PolicyRecord"]) -> None: ...


@runtime_checkable
class EmitAlertsHook(Protocol):
    """Push alerts to configured channels (email, Slack, dashboard)."""

    def __call__(
        self, alerts: list["PolicyAlert"], channels: list[str]
    ) -> None: ...


@runtime_checkable
class WatchDeadlinesHook(Protocol):
    """Monitor grant and comment period deadlines."""

    def __call__(
        self, policies: list["PolicyRecord"], warning_days: list[int]
    ) -> list["DeadlineWatch"]: ...
```

Default implementations log calls and return sensible defaults. Deployments inject real implementations via constructor parameters on the `PolicySentinel` composition root.

---

## Commit conventions

```
type(scope): short description

Types: feat, fix, refactor, test, docs, chore
Scopes: engine, schemas, adapters, tsdf, dashboard, hooks, cli

Examples:
  feat(adapters): add Federal Register source adapter
  fix(analyzer): correct status escalation logic for litigation entries
  docs(schemas): update PolicyRecord field documentation
  test(hooks): add integration test for emit_alerts hook
```

---

## Branch strategy

- `main` -- stable, releasable
- `develop` -- integration branch for features
- `feature/*` -- individual features, branched from develop
- `fix/*` -- bug fixes, can branch from main for hotfixes

PRs go to `develop`. `develop` merges to `main` on release.

---

## Versioning

Semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes to `PolicyRecord`, `CorpusConfig`, or adapter output format
- **MINOR:** New adapters, new source integrations, new hooks
- **PATCH:** Bug fixes, documentation, performance

Schema changes that break existing `CorpusConfig` files always require a MAJOR bump and a migration guide in `CHANGELOG.md`.

---

## Local development

```bash
make setup          # Create venv, install package + dev deps, install pre-commit hooks
make check          # Run ruff + mypy + pytest (full CI check)
make test           # Run pytest only
make lint           # Run ruff check + ruff format --check
make typecheck      # Run mypy src/
```

---

## Relationship to Tribe-specific repos

When Claude Code is also working in a Tribe-specific repo (e.g., `nez-perce-policy-sentinel`), that repo's `CLAUDE.md` will specify:
- Which version of policy-sentinel engine to use
- The path to the corpus config file
- Which adapter to build against
- Any Tribe-specific sovereignty framing instructions

The Tribe-specific repo imports the engine as a pip dependency:
```
policy-sentinel @ git+https://github.com/atniclimate/policy-sentinel.git@main
```

Changes needed in the engine should be PRed to this repo. Changes to the Tribe's corpus, config, or output stay in the Tribe's private repo.

---

*policy-sentinel exists because rights-holding communities deserve policy intelligence infrastructure that centers their sovereignty. The engine is the tool. Communities decide how to use it.*

*Built with the support of the [ATNI Climate Resilience Program](https://atnitribes.org/climatechange/).*
