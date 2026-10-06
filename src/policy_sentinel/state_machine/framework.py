"""State machine framework for policy status transitions.

Each policy category may define its own set of valid transitions.
Transition rules are loaded from configuration at startup so that
deployments can customise the state graph without modifying engine code.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from policy_sentinel.schemas.policy import PolicyStatus


class StateMachine:
    """Manage policy status transitions.

    Methods
    -------
    transition(current, event)
        Compute the next status given the current status and an event.
    """

    def transition(self, current: PolicyStatus, event: str) -> PolicyStatus:
        """Compute the next status from a transition event.

        Parameters
        ----------
        current : PolicyStatus
            The policy's current lifecycle status.
        event : str
            The event triggering the transition.

        Returns
        -------
        PolicyStatus
            The new status after the transition.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError
