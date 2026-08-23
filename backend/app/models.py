"""ORM models.

Only one table. The resume body lives in a JSON column rather than being
normalised into per-section tables: it is always read and written as a whole
document, and the shape changes often while templates are being designed.
The metadata columns are duplicated out of the JSON so the dashboard can list
resumes without deserialising every document.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import JSON, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[str] = mapped_column(
        String(32), primary_key=True, default=lambda: uuid4().hex[:12]
    )
    name: Mapped[str] = mapped_column(String(200), default="Untitled Resume")
    # Mirrored from document.settings.template for cheap dashboard listing.
    template: Mapped[str] = mapped_column(String(40), default="modern")
    document: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, server_default=func.now()
    )
