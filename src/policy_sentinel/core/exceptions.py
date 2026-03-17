"""Custom exception hierarchy for policy-sentinel.

All domain-specific exceptions inherit from ``SentinelError`` so callers
can catch the base class for broad error handling.
"""


class SentinelError(Exception):
    """Base exception for all policy-sentinel errors."""


class SovereigntyBoundaryError(SentinelError):
    """Raised when an operation violates TSDF sovereignty boundaries.

    For example, attempting to export data classified as Tier 2 or Tier 3.
    """


class ConfigurationError(SentinelError):
    """Raised when application configuration is invalid or missing."""


class AdapterError(SentinelError):
    """Raised when a source or output adapter encounters a failure."""


class IngestionError(SentinelError):
    """Raised when corpus loading or parsing fails."""
