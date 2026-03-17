"""Policy-domain Pydantic models.

Defines the core data contracts for policy records and alerts that all
engine components and downstream consumers depend on.
"""

from __future__ import annotations

from datetime import datetime  # noqa: TC003 - Pydantic needs runtime access
from enum import StrEnum

from pydantic import BaseModel


class PolicyStatus(StrEnum):
    """Lifecycle status of a tracked policy."""

    MONITORING = "monitoring"
    ALERT = "alert"
    PENDING = "pending"
    ENACTED = "enacted"
    EXPIRED = "expired"
    LITIGATION = "litigation"


class TSDFTier(StrEnum):
    """Tiered Sovereign Data Framework classification.

    See Also
    --------
    https://github.com/atniclimate/TieredSovereignDataFramework
    """

    T0 = "T0"
    T1 = "T1"
    T2 = "T2"
    T3 = "T3"


class AlertType(StrEnum):
    """Categories of policy alerts."""

    DEADLINE = "deadline"
    CHANGE = "change"
    ESCALATION = "escalation"
    OPPORTUNITY = "opportunity"


class PolicyRecord(BaseModel):
    """A single tracked policy, legislation, or grant programme.

    Attributes
    ----------
    id : str
        Unique record identifier.
    title : str
        Human-readable title.
    category : str
        Top-level classification (federal, state, tribal, grants).
    status : PolicyStatus
        Current lifecycle status.
    summary : str
        Brief description of the policy.
    doc_id : str
        External document / docket identifier.
    source_url : str
        Canonical URL for the source document.
    tsdf_tier : TSDFTier
        Sovereignty classification tier.
    created_at : datetime
        When the record was first created.
    updated_at : datetime
        When the record was last modified.
    """

    id: str
    title: str
    category: str
    status: PolicyStatus
    summary: str
    doc_id: str
    source_url: str
    tsdf_tier: TSDFTier
    created_at: datetime
    updated_at: datetime


class PolicyAlert(BaseModel):
    """An alert generated for a tracked policy.

    Attributes
    ----------
    id : str
        Unique alert identifier.
    policy_id : str
        ID of the associated policy record.
    alert_type : AlertType
        Classification of the alert.
    message : str
        Human-readable alert message.
    created_at : datetime
        When the alert was generated.
    read : bool
        Whether the alert has been acknowledged.
    """

    id: str
    policy_id: str
    alert_type: AlertType
    message: str
    created_at: datetime
    read: bool = False
