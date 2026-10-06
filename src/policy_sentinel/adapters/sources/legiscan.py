"""LegiScan source adapter stub."""

from __future__ import annotations

from typing import Any


class LegiScanAdapter:
    """Query the LegiScan API for state legislation.

    Methods
    -------
    query(doc_id)
        Fetch a bill from LegiScan.
    parse(raw_response)
        Normalise the API response.
    compare(previous, current)
        Detect changes between snapshots.
    """

    def query(self, doc_id: str) -> dict[str, Any]:
        """Query LegiScan for a bill.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError

    def parse(self, raw_response: dict[str, Any]) -> dict[str, Any]:
        """Parse a LegiScan API response.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError

    def compare(
        self, previous: dict[str, Any], current: dict[str, Any]
    ) -> dict[str, Any]:
        """Compare two LegiScan snapshots.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError


# Uncomment when implementing:
# from policy_sentinel.adapters.sources.registry import register
# register("legiscan", LegiScanAdapter)
