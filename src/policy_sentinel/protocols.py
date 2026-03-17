"""Protocol definitions for dependency injection.

All core interfaces are defined here as ``typing.Protocol`` classes with
``@runtime_checkable`` to support both static type checking and runtime
``isinstance()`` verification.
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class PolicyRepository(Protocol):
    """Protocol for policy record persistence."""

    def get(self, record_id: str) -> dict[str, Any]:
        """Retrieve a policy record by ID."""
        ...

    def list(self) -> list[dict[str, Any]]:
        """List all policy records."""
        ...

    def save(self, record: dict[str, Any]) -> None:
        """Persist a policy record."""
        ...

    def delete(self, record_id: str) -> None:
        """Delete a policy record by ID."""
        ...


@runtime_checkable
class AlertRepository(Protocol):
    """Protocol for alert persistence."""

    def get(self, alert_id: str) -> dict[str, Any]:
        """Retrieve an alert by ID."""
        ...

    def list_unread(self) -> list[dict[str, Any]]:
        """List all unread alerts."""
        ...

    def save(self, alert: dict[str, Any]) -> None:
        """Persist an alert."""
        ...

    def mark_read(self, alert_id: str) -> None:
        """Mark an alert as read."""
        ...


@runtime_checkable
class ReviewRepository(Protocol):
    """Protocol for review persistence."""

    def get(self, review_id: str) -> dict[str, Any]:
        """Retrieve a review by ID."""
        ...

    def list_recent(self, count: int = 10) -> list[dict[str, Any]]:
        """List the most recent reviews."""
        ...

    def save(self, review: dict[str, Any]) -> None:
        """Persist a review."""
        ...


@runtime_checkable
class TemplateRenderer(Protocol):
    """Protocol for rendering templates."""

    def render_alert(self, alert: dict[str, Any]) -> str:
        """Render an alert using the configured template."""
        ...

    def render_summary(self, review: dict[str, Any]) -> str:
        """Render a review summary using the configured template."""
        ...


@runtime_checkable
class SourceAdapter(Protocol):
    """Protocol for source adapters that query external data sources.

    Re-exported from ``policy_sentinel.adapters.sources.base`` for
    convenience.
    """

    def query(self, doc_id: str) -> dict[str, Any]:
        """Query the source for the given document ID."""
        ...

    def parse(self, raw_response: dict[str, Any]) -> dict[str, Any]:
        """Parse raw API response into normalised format."""
        ...

    def compare(
        self, previous: dict[str, Any], current: dict[str, Any]
    ) -> dict[str, Any]:
        """Compare previous and current states, return diff."""
        ...
