# Makefile for policy-sentinel engine
.PHONY: setup test lint format typecheck check clean build docs help

# Detect uv availability, fall back to pip
UV := $(shell command -v uv 2> /dev/null)
ifdef UV
    PIP_INSTALL = uv pip install
    VENV_CREATE = uv venv
else
    PIP_INSTALL = pip install
    VENV_CREATE = python -m venv
endif

VENV := .venv
PYTHON := $(VENV)/Scripts/python  # Windows; use $(VENV)/bin/python on Unix

setup: ## Create venv, install package and dev deps, install pre-commit hooks
	$(VENV_CREATE) $(VENV)
	$(PIP_INSTALL) -e ".[dev]"
	pre-commit install

test: ## Run pytest
	pytest

lint: ## Run ruff linter
	ruff check .

format: ## Run ruff formatter
	ruff format .

typecheck: ## Run mypy type checker
	mypy src/

check: lint typecheck test ## Run all checks (lint + typecheck + test)

clean: ## Remove build artifacts and caches
	rm -rf build/ dist/ *.egg-info .mypy_cache .pytest_cache .ruff_cache
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

build: ## Build package
	python -m build

docs: ## Build documentation locally
	sphinx-build -b html docs/ docs/_build/html

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
