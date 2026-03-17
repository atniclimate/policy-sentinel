# policy-sentinel

**Sovereignty-centered policy intelligence for rights-holding communities.**

policy-sentinel is a Python engine that ingests a corpus of policies, legislation, litigation, and grant programs; analyzes them for rights implications and status changes; generates sovereignty-framed alerts; and serves a web dashboard for review and action.

Built by and for Indigenous Nations, but designed as general infrastructure. Any rights-holding community -- Tribal Nation, watershed council, Native Hawaiian organization, rural county -- can configure and deploy it.

---

## What it does

1. **Ingests** a policy corpus: federal rules, state legislation, court cases, grant programs, tribal codes -- any governance document with a docket number or identifier
2. **Analyzes** each policy for status, rights implications, and change over time
3. **Alerts** when deadlines, status changes, or escalations occur -- framed in the sovereignty language you configure
4. **Serves** an HTMX dashboard with category-filtered policy cards, status badges, and a notes editor

## What it does not do

- It does not store or transmit Tribal data. Corpus configurations stay with the organization that owns them.
- It does not make sovereignty decisions. It surfaces information; rights holders decide what it means.
- It does not replace legal counsel, policy staff, or Tribal expertise. It extends their capacity.

---

## Features

- **Automated review cycles** -- Weekly (or daily/monthly) policy status checks with draft updates for analyst approval
- **Sovereignty-framed alerts** -- Deadline proximity, status escalation, grant opportunities, all framed in your configured rights language
- **Multi-source adapters** -- Federal Register, LegiScan, CourtListener, Grants.gov, with web search fallback
- **HTMX dashboard** -- Lightweight, interactive policy dashboard served by FastAPI
- **Extensibility hooks** -- Five named integration points (Protocol-typed) for connecting to external systems
- **TSDF data sovereignty** -- Tiered Sovereign Data Framework classification on all data export paths
- **Offline-first** -- Runs entirely offline with a local corpus file; web queries are always opt-in

---

## Quick start

### Install

```bash
pip install policy-sentinel
```

Or install from source:

```bash
git clone https://github.com/atniclimate/policy-sentinel.git
cd policy-sentinel
pip install -e .
```

### Initialize

```bash
policy-sentinel init
```

### Basic usage

```python
from policy_sentinel.app import PolicySentinel

engine = PolicySentinel()
```

---

## Architecture

policy-sentinel uses a two-repository architecture:

- **`policy-sentinel`** (this repo, public) -- The generic, reusable engine: ingestor, analyzer, adapters, schemas, hooks.
- **`[tribe]-policy-sentinel`** (private, per-organization) -- The organization's policy corpus, sovereignty framing, and generated output.

The engine lives here. Your corpus and configuration live in your own repository -- private, on your infrastructure, under your jurisdiction.

See `examples/tribe-deployment-template/` for a template to create your own deployment repository.

---

## Development

```bash
# Set up the development environment
make setup

# Run the full CI check (lint + typecheck + test)
make check

# Individual commands
make lint           # ruff check + format check
make typecheck      # mypy src/
make test           # pytest
```

### Tech stack

- **Language:** Python 3.12+
- **Package manager:** uv (pip fallback)
- **Web framework:** FastAPI + HTMX
- **Data models:** Pydantic v2
- **Database:** SQLAlchemy + SQLite (local-first)
- **Linting:** Ruff
- **Type checking:** mypy (strict mode)
- **Testing:** pytest
- **Documentation:** Sphinx + Furo

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

policy-sentinel welcomes contributions from Tribal tech staff, Indigenous data practitioners, policy analysts, and developers who work in service of rights-holding communities.

---

## License

[Apache 2.0](./LICENSE) -- free to use, modify, and deploy. Attribution appreciated but not required.

If you deploy policy-sentinel for a Tribal Nation or Indigenous organization, we would love to know about it. Not to track you -- just because that is good news worth sharing.

---

*Built with the support of the [ATNI Climate Resilience Program](https://atnitribes.org/climatechange/).*
