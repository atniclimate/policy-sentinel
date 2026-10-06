"""Hook: export policy relationships to a graph structure.

Default stub returns ``None`` (no graph export).
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from policy_sentinel.core.logging import get_logger

logger = get_logger(__name__)


@runtime_checkable
class ExportToGraphHook(Protocol):
    """Protocol for the export-to-graph hook."""

    def __call__(self, policies: list[dict[str, Any]]) -> dict[str, Any] | None:
        """Export policy relationships to a graph structure.

        Parameters
        ----------
        policies : list[dict[str, Any]]
            Policy records to export.

        Returns
        -------
        dict[str, Any] | None
            Graph export data, or ``None`` if not configured.
        """
        ...


def default_export_to_graph(
    policies: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Default stub -- no graph export.

    Parameters
    ----------
    policies : list[dict[str, Any]]
        Policy records to export.

    Returns
    -------
    None
        Always returns ``None`` in the default implementation.
    """
    logger.debug("export_to_graph stub called with %d policies", len(policies))
    return None
