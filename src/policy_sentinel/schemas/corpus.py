"""Corpus configuration models.

A corpus config describes the set of policies a deployment tracks and the
metadata needed to ingest and classify them.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class PolicyEntry(BaseModel):
    """A single policy entry within a corpus configuration.

    Attributes
    ----------
    id : str
        Unique entry identifier.
    title : str
        Human-readable title.
    category : str
        Top-level classification.
    doc_id : str
        External document / docket identifier.
    source_url : str
        Canonical URL for the source document.
    tsdf_tier : str
        Sovereignty classification (default ``"T0"``).
    metadata : dict[str, Any]
        Arbitrary additional metadata.
    """

    id: str
    title: str
    category: str
    doc_id: str
    source_url: str
    tsdf_tier: str = "T0"
    metadata: dict[str, Any] = {}


class CorpusConfig(BaseModel):
    """Top-level corpus configuration loaded from JSON.

    Attributes
    ----------
    name : str
        Display name for the corpus.
    version : str
        Schema version string.
    policies : list[PolicyEntry]
        The list of tracked policies.
    """

    name: str
    version: str
    policies: list[PolicyEntry]
