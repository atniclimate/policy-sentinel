"""Application settings powered by pydantic-settings.

Settings are loaded from environment variables (prefixed ``SENTINEL_``),
a ``.env`` file, or constructor arguments.  Deployments override defaults
via their own ``.env`` or environment.
"""

from __future__ import annotations

from pathlib import Path  # noqa: TC003 - Pydantic needs runtime access

from pydantic_settings import BaseSettings, SettingsConfigDict


class SentinelSettings(BaseSettings):
    """Central configuration for the policy-sentinel engine.

    Attributes
    ----------
    database_url : str
        SQLAlchemy database connection string.
    corpus_path : Path | None
        Path to the corpus configuration JSON file.
    log_level : str
        Logging verbosity (DEBUG, INFO, WARNING, ERROR, CRITICAL).
    """

    model_config = SettingsConfigDict(
        env_prefix="SENTINEL_",
        env_file=".env",
        extra="ignore",
    )

    database_url: str = "sqlite:///policies.db"
    corpus_path: Path | None = None
    log_level: str = "INFO"
