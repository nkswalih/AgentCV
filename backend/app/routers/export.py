"""PDF export."""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..pdf import BrowserNotAvailable, renderer

router = APIRouter(prefix="/api/resumes", tags=["export"])


def _filename(name: str) -> str:
    """Turn a resume name into a safe download filename."""
    cleaned = re.sub(r"[^\w\s-]", "", name).strip()
    cleaned = re.sub(r"[\s_]+", "_", cleaned)
    return f"{cleaned or 'resume'}.pdf"


@router.post("/{resume_id}/export/pdf")
async def export_pdf(
    resume_id: str,
    options: schemas.ExportRequest | None = None,
    db: Session = Depends(get_db),
) -> Response:
    resume = db.get(models.Resume, resume_id)
    if resume is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No resume with id {resume_id}")

    document = schemas.ResumeDocument.model_validate(resume.document)
    paper = options.paper_size if options and options.paper_size else document.settings.paper_size

    try:
        pdf_bytes = await renderer.render(resume_id, paper_size=paper.value)
    except BrowserNotAvailable as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 -- render failures are reported, not swallowed
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"PDF render failed: {exc}"
        ) from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{_filename(resume.name)}"'
        },
    )
