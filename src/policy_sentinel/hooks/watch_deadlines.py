"""Hook: watch for approaching policy deadlines.

Default stub returns an empty list (no deadline watches configured).
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from policy_sentinel.core.logging import get_logger

logger = get_logger(__name__)


@runtime_checkable
class WatchDeadlinesHook(Protocol):
    """Protocol for the watch-deadlines hook."""

    def __call__(
        self, policies: list[dict[str, Any]], warning_days: list[int]
    ) -> list[dict[str, Any]]:
        """Check for approaching deadlines.

        Parameters
        ----------
        policies : list[dict[str, Any]]
            Policy records to check.
        warning_days : list[int]
            Day thresholds for generating warnings.

        Returns
        -------
        list[dict[str, Any]]
            Deadline watch entries for policies with upcoming deadlines.
        """
        ...


def default_watch_deadlines(
    policies: list[dict[str, Any]], warning_days: list[int]
) -> list[dict[str, Any]]:
    """Default stub -- no deadline watches.

    Parameters
    ----------
    policies : list[dict[str, Any]]
        Policy records to check.
    warning_days : list[int]
        Day thresholds for generating warnings.

    Returns
    -------
    list[dict[str, Any]]
        Always returns an empty list in the default implementation.
    """
    logger.debug(
        "watch_deadlines stub called with %d policies, thresholds=%s",
        len(policies),
        warning_days,
    )
    return []
