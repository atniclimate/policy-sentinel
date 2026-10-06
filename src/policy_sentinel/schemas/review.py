"""Weekly review data model."""

from __future__ import annotations

from datetime import date  # noqa: TC003 - Pydantic needs runtime access

from pydantic import BaseModel


class WeeklyReview(BaseModel):
    """Summary of a periodic policy review cycle.

    Attributes
    ----------
    id : str
        Unique review identifier.
    review_date : date
        Date the review was conducted.
    policies_checked : list[str]
        IDs of policies examined during the review.
    changes_detected : int
        Number of status changes found.
    alerts_generated : int
        Number of alerts emitted during the review.
    summary : str
        Human-readable narrative summary.
    """

    id: str
    review_date: date
    policies_checked: list[str]
    changes_detected: int
    alerts_generated: int
    summary: str
