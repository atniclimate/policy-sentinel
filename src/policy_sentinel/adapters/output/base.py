"""Output adapter protocol definition."""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class OutputAdapter(Protocol):
    """Protocol for output adapters that render analysis results."""

    def render(self, data: dict[str, Any]) -> bytes:
        """Render analysis data into the target format.

        Parameters
        ----------
        data : dict[str, Any]
            The analysis data to render.

        Returns
        -------
        bytes
            The rendered output.
        """
        ...
