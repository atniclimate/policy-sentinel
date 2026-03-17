"""Sovereignty gate -- TSDF boundary enforcement.

Sovereignty Posture
-------------------
The TSDF gate is the primary enforcement point for sovereignty boundaries.
Data classified as Tier 2 (T2) or Tier 3 (T3) MUST NOT cross into public
systems.  Only Tier 0 (T0) and Tier 1 (T1) data may be exported.

See Also
--------
https://github.com/atniclimate/TieredSovereignDataFramework
"""

from policy_sentinel.core.constants import EXPORTABLE_TIERS
from policy_sentinel.schemas.policy import TSDFTier


def classify(tier_str: str) -> TSDFTier:
    """Parse and validate a TSDF tier string.

    Parameters
    ----------
    tier_str : str
        A tier identifier such as ``"T0"``, ``"T1"``, ``"T2"``, or ``"T3"``.

    Returns
    -------
    TSDFTier
        The validated tier enum member.

    Raises
    ------
    ValueError
        If *tier_str* is not a recognised TSDF tier.
    """
    return TSDFTier(tier_str)


def can_export(tier: TSDFTier) -> bool:
    """Return whether data at the given tier may cross the sovereignty boundary.

    Parameters
    ----------
    tier : TSDFTier
        The sovereignty classification to check.

    Returns
    -------
    bool
        ``True`` if the tier is exportable (T0 or T1), ``False`` otherwise.
    """
    return tier.value in EXPORTABLE_TIERS
