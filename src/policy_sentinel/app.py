"""Composition root for the policy-sentinel engine.

The ``PolicySentinel`` class wires all dependencies at startup and provides the
main programmatic entry point for running reviews and serving the dashboard.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from policy_sentinel.config.settings import SentinelSettings
    from policy_sentinel.schemas.review import WeeklyReview


class PolicySentinel:
    """Main application class -- the composition root.

    Parameters
    ----------
    settings : SentinelSettings
        Application settings controlling database, logging, and adapter behaviour.
    """

    def __init__(self, settings: SentinelSettings) -> None:
        self.settings = settings

    def run_review(self) -> WeeklyReview:
        """Execute a policy review cycle.

        Returns
        -------
        WeeklyReview
            The generated review summary.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError

    def serve(self) -> None:
        """Start the dashboard server.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError
