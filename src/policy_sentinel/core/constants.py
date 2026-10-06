"""Shared constants for policy-sentinel."""

TSDF_TIERS: tuple[str, ...] = ("T0", "T1", "T2", "T3")
"""Valid TSDF sovereignty tiers, from most open to most restricted."""

EXPORTABLE_TIERS: tuple[str, ...] = ("T0", "T1")
"""Tiers whose data may cross the sovereignty boundary into public systems."""

ALERT_TYPES: tuple[str, ...] = ("deadline", "change", "escalation", "opportunity")
"""Recognised alert type identifiers."""

POLICY_CATEGORIES: tuple[str, ...] = ("federal", "state", "tribal", "grants")
"""Top-level policy classification categories."""
