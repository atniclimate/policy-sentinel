"""Corpus loader -- reads a ``CorpusConfig`` and produces policy records.

The loader works entirely offline with a local corpus JSON file.
Web-based status querying is handled by the analyzer, not the ingestor.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from policy_sentinel.schemas.corpus import CorpusConfig
    from policy_sentinel.schemas.policy import PolicyRecord


class CorpusLoader:
    """Load and validate a policy corpus configuration.

    Methods
    -------
    load(config)
        Parse a ``CorpusConfig`` into validated ``PolicyRecord`` instances.
    """

    def load(self, config: CorpusConfig) -> list[PolicyRecord]:
        """Parse a corpus config into policy records.

        Parameters
        ----------
        config : CorpusConfig
            The corpus configuration to process.

        Returns
        -------
        list[PolicyRecord]
            Validated policy records.

        Raises
        ------
        NotImplementedError
            Stub -- not yet implemented.
        """
        raise NotImplementedError
