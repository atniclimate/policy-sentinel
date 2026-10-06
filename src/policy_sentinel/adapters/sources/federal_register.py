"""Federal Register source adapter stub."""

from __future__ import annotations

from typing import Any


class FederalRegisterAdapter:
    """Query the Federal Register API for policy documents.

    Methods
    -------
    query(doc_id)
        Fetch a document from the Federal Register.
    parse(raw_response)
        Normalise the API response.
    compare(previous, current)
        Detect changes between snapshots.
    """

    def query(self, doc_id: str) -> dict[str, Any]:
        """Query the Federal Register for a document.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError

    def parse(self, raw_response: dict[str, Any]) -> dict[str, Any]:
        """Parse a Federal Register API response.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError

    def compare(
        self, previous: dict[str, Any], current: dict[str, Any]
    ) -> dict[str, Any]:
        """Compare two Federal Register snapshots.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError


# Uncomment when implementing:
# from policy_sentinel.adapters.sources.registry import register
# register("federal_register", FederalRegisterAdapter)
