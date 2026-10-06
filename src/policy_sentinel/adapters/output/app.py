"""App output adapter -- renders a standalone dashboard application."""

from __future__ import annotations

from typing import Any


class AppAdapter:
    """Render analysis results for the standalone dashboard.

    Methods
    -------
    render(data)
        Produce dashboard-ready data from analysis results.
    """

    def render(self, data: dict[str, Any]) -> bytes:
        """Render dashboard-ready output.

        Parameters
        ----------
        data : dict[str, Any]
            The analysis data to render.

        Returns
        -------
        bytes
            The rendered output bytes.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError
