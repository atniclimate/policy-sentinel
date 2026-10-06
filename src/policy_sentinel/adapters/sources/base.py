"""Source adapter protocol definition.

All source adapters implement this protocol.  The protocol is also
re-exported from ``policy_sentinel.protocols`` for convenience.
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class SourceAdapter(Protocol):
    """Protocol for source adapters that query external data sources."""

    def query(self, doc_id: str) -> dict[str, Any]:
        """Query the source for the given document ID.

        Parameters
        ----------
        doc_id : str
            The external document identifier.

        Returns
        -------
        dict[str, Any]
            Raw response data from the source.
        """
        ...

    def parse(self, raw_response: dict[str, Any]) -> dict[str, Any]:
        """Parse raw API response into normalised format.

        Parameters
        ----------
        raw_response : dict[str, Any]
            The raw response from ``query()``.

        Returns
        -------
        dict[str, Any]
            Normalised policy data.
        """
        ...

    def compare(
        self, previous: dict[str, Any], current: dict[str, Any]
    ) -> dict[str, Any]:
        """Compare previous and current states, return diff.

        Parameters
        ----------
        previous : dict[str, Any]
            Previously recorded state.
        current : dict[str, Any]
            Current state from the source.

        Returns
        -------
        dict[str, Any]
            A description of changes between the two states.
        """
        ...
