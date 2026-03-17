# Contributing to policy-sentinel

Contributions welcome from Tribal tech staff, Indigenous data practitioners, policy analysts, and developers who work in service of rights-holding communities.

---

## Getting started

```bash
# Fork and clone
gh repo fork atniclimate/policy-sentinel --clone
cd policy-sentinel

# Set up development environment
make setup

# Create a branch from develop
git checkout develop
git checkout -b feature/your-feature-name
```

---

## Development workflow

### Branch naming

- `feature/*` -- new capabilities
- `fix/*` -- bug fixes

### Commit conventions

```
type(scope): short description

Types: feat, fix, refactor, test, docs, chore
Scopes: engine, schemas, adapters, tsdf, dashboard, hooks, cli
```

### Pull requests

All PRs target `develop`. Include:
- What problem this solves
- How to test it
- Any sovereignty considerations

---

## Code standards

- **Lint & format:** `ruff check .` and `ruff format --check .`
- **Type checking:** `mypy --strict src/`
- **Docstrings:** NumPy format on all modules, classes, and functions
- **Tests:** pytest -- add tests for any new functionality
- **Run everything:** `make check` (lint + typecheck + test)

---

## Sovereignty Review Checklist

Before every PR, verify:

- [ ] No Tribe-specific data in engine repo
- [ ] TSDF tier assertions on data export paths
- [ ] Sovereignty-framed language in user-facing text
- [ ] Pre-commit sovereignty guard passes

---

## Testing

```bash
make test           # Run pytest
make check          # Full CI check (ruff + mypy + pytest)
```

Tests use synthetic data only. Never use real organizational corpora in test fixtures.

---

## What we are not looking for

- Features that centralize Tribal data
- Changes that remove sovereignty framing from the core engine
- Integrations with surveillance-adjacent platforms
- Vendor lock-in to any single API

If unsure whether a contribution fits, open an issue first.

---

*Questions? Open an issue or reach out through the [ATNI Climate Resilience Program](https://atnitribes.org/climatechange/).*
