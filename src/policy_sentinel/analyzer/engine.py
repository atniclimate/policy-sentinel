"""Analysis engine -- orchestrates a review cycle.

Responsible for status change detection, alert generation, and weekly
review log creation.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from policy_sentinel.schemas.review import WeeklyReview


class AnalysisEngine:
    """Run a policy review cycle and produce a summary.

    Methods
    -------
    run_review()
        Execute a full review and return the result.
    """

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
