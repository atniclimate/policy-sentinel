"""Hook: query external sources for current policy status.

Default stub returns ``None`` (no external status available).
Deployments override this to query live sources.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from policy_sentinel.core.logging import get_logger

logger = get_logger(__name__)


@runtime_checkable
class QueryPolicyStatusHook(Protocol):
    """Protocol for the query-policy-status hook."""

    def __call__(self, policy_id: str, sources: list[str]) -> str | None:
        """Query external sources for the current status of a policy.

        Parameters
        ----------
        policy_id : str
            The policy record ID to look up.
        sources : list[str]
            Names of source adapters to query.

        Returns
        -------
        str | None
            The detected status string, or ``None`` if unavailable.
        """
        ...


def default_query_policy_status(
    policy_id: str, sources: list[str]
) -> str | None:
    """Default stub -- no external status query.

    Parameters
    ----------
    policy_id : str
        The policy record ID to look up.
    sources : list[str]
        Names of source adapters to query.

    Returns
    -------
    None
        Always returns ``None`` in the default implementation.
    """
    logger.debug("query_policy_status stub called for %s", policy_id)
    return None
