"""Repository pattern for policy record persistence.

Implements the ``PolicyRepository`` protocol defined in
``policy_sentinel.protocols``.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class SqlPolicyRepository:
    """SQLAlchemy-backed policy repository.

    Parameters
    ----------
    session : Session
        An active SQLAlchemy session.
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    def get(self, record_id: str) -> dict[str, Any]:
        """Retrieve a policy record by ID.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError

    def list(self) -> list[dict[str, Any]]:
        """List all policy records.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError

    def save(self, record: dict[str, Any]) -> None:
        """Persist a policy record.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError

    def delete(self, record_id: str) -> None:
        """Delete a policy record by ID.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError
