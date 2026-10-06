"""DuckDuckGo search source adapter stub."""

from __future__ import annotations

from typing import Any


class DuckDuckGoAdapter:
    """Query DuckDuckGo for policy-related web results.

    Methods
    -------
    query(doc_id)
        Search DuckDuckGo using a document identifier as the query.
    parse(raw_response)
        Normalise the search results.
    compare(previous, current)
        Detect changes between search snapshots.
    """

    def query(self, doc_id: str) -> dict[str, Any]:
        """Search DuckDuckGo.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError

    def parse(self, raw_response: dict[str, Any]) -> dict[str, Any]:
        """Parse DuckDuckGo search results.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError

    def compare(
        self, previous: dict[str, Any], current: dict[str, Any]
    ) -> dict[str, Any]:
        """Compare two search snapshots.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError


# Uncomment when implementing:
# from policy_sentinel.adapters.sources.registry import register
# register("duckduckgo", DuckDuckGoAdapter)
