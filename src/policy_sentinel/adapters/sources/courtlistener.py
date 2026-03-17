"""CourtListener / RECAP source adapter stub."""

from __future__ import annotations

from typing import Any


class CourtListenerAdapter:
    """Query the CourtListener / RECAP API for litigation documents.

    Methods
    -------
    query(doc_id)
        Fetch a docket or opinion from CourtListener.
    parse(raw_response)
        Normalise the API response.
    compare(previous, current)
        Detect changes between snapshots.
    """

    def query(self, doc_id: str) -> dict[str, Any]:
        """Query CourtListener for a docket.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError

    def parse(self, raw_response: dict[str, Any]) -> dict[str, Any]:
        """Parse a CourtListener API response.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError

    def compare(
        self, previous: dict[str, Any], current: dict[str, Any]
    ) -> dict[str, Any]:
        """Compare two CourtListener snapshots.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError


# Uncomment when implementing:
# from policy_sentinel.adapters.sources.registry import register
# register("courtlistener", CourtListenerAdapter)
