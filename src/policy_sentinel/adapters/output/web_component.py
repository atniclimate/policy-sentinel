"""Web component output adapter -- renders an embeddable HTML widget."""

from __future__ import annotations

from typing import Any


class WebComponentAdapter:
    """Render analysis results as an embeddable HTML widget.

    Methods
    -------
    render(data)
        Produce an HTML fragment from analysis data.
    """

    def render(self, data: dict[str, Any]) -> bytes:
        """Render an embeddable HTML widget.

        Parameters
        ----------
        data : dict[str, Any]
            The analysis data to render.

        Returns
        -------
        bytes
            The rendered HTML bytes.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError
