"""Hook: emit alerts through configured channels.

Default stub logs and returns ``None`` (fire-and-forget).
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from policy_sentinel.core.logging import get_logger

logger = get_logger(__name__)


@runtime_checkable
class EmitAlertsHook(Protocol):
    """Protocol for the emit-alerts hook."""

    def __call__(self, alerts: list[dict[str, Any]]) -> None:
        """Emit alerts through configured channels.

        Parameters
        ----------
        alerts : list[dict[str, Any]]
            Alerts to emit.
        """
        ...


def default_emit_alerts(alerts: list[dict[str, Any]]) -> None:
    """Default stub -- log alerts but do not deliver them.

    Parameters
    ----------
    alerts : list[dict[str, Any]]
        Alerts to emit.
    """
    logger.debug("emit_alerts stub called with %d alerts", len(alerts))
