"""SQLAlchemy 2.0 declarative models.

Table definitions for persisting policy records, alerts, and reviews.
No query logic lives here -- see ``repository.py`` for data access.
"""

from __future__ import annotations

from datetime import date, datetime  # noqa: TC003 - SQLAlchemy Mapped needs runtime access

from sqlalchemy import Boolean, Date, DateTime, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


class PolicyRecordModel(Base):
    """Persisted representation of a policy record."""

    __tablename__ = "policy_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(512))
    category: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32))
    summary: Mapped[str] = mapped_column(Text)
    doc_id: Mapped[str] = mapped_column(String(256))
    source_url: Mapped[str] = mapped_column(String(2048))
    tsdf_tier: Mapped[str] = mapped_column(String(4))
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class PolicyAlertModel(Base):
    """Persisted representation of a policy alert."""

    __tablename__ = "policy_alerts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    policy_id: Mapped[str] = mapped_column(String(64))
    alert_type: Mapped[str] = mapped_column(String(32))
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    read: Mapped[bool] = mapped_column(Boolean, default=False)


class WeeklyReviewModel(Base):
    """Persisted representation of a weekly review."""

    __tablename__ = "weekly_reviews"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    review_date: Mapped[date] = mapped_column(Date)
    policies_checked: Mapped[str] = mapped_column(Text)  # JSON-encoded list
    changes_detected: Mapped[int] = mapped_column(Integer)
    alerts_generated: Mapped[int] = mapped_column(Integer)
    summary: Mapped[str] = mapped_column(Text)
