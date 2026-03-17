"""Hook: feed data to the TCR Policy Scanner.

Default stub returns ``None`` (no scanner integration).
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from policy_sentinel.core.logging import get_logger

logger = get_logger(__name__)


@runtime_checkable
class ToTcrScannerHook(Protocol):
    """Protocol for the to-tcr-scanner hook."""

    def __call__(self, data: dict[str, Any]) -> dict[str, Any] | None:
        """Send data to the TCR Policy Scanner.

        Parameters
        ----------
        data : dict[str, Any]
            Scan payload.

        Returns
        -------
        dict[str, Any] | None
            Scanner response, or ``None`` if not configured.
        """
        ...


def default_to_tcr_scanner(data: dict[str, Any]) -> dict[str, Any] | None:
    """Default stub -- no scanner feed.

    Parameters
    ----------
    data : dict[str, Any]
        Scan payload.

    Returns
    -------
    None
        Always returns ``None`` in the default implementation.
    """
    logger.debug("to_tcr_scanner stub called")
    return None
