"""Grants.gov source adapter stub."""

from __future__ import annotations

from typing import Any


class GrantsGovAdapter:
    """Query the Grants.gov API for grant opportunities.

    Methods
    -------
    query(doc_id)
        Fetch a grant opportunity from Grants.gov.
    parse(raw_response)
        Normalise the API response.
    compare(previous, current)
        Detect changes between snapshots.
    """

    def query(self, doc_id: str) -> dict[str, Any]:
        """Query Grants.gov for an opportunity.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError

    def parse(self, raw_response: dict[str, Any]) -> dict[str, Any]:
        """Parse a Grants.gov API response.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError

    def compare(
        self, previous: dict[str, Any], current: dict[str, Any]
    ) -> dict[str, Any]:
        """Compare two Grants.gov snapshots.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError


# Uncomment when implementing:
# from policy_sentinel.adapters.sources.registry import register
# register("grants_gov", GrantsGovAdapter)
