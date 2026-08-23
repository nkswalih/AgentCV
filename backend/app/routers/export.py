"""Export endpoints: PDF (Chromium render), DOCX and LaTeX from the document."""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..docx import build_docx
from ..latex import build_tex
from ..pdf import BrowserNotAvailable, renderer

router = APIRouter(prefix="/api/resumes", tags=["export"])


def _filename(name: str, extension: str) -> str:
    """Turn a resume name into a safe download filename."""
    cleaned = re.sub(r"[^\w\s-]", "", name).strip()
    cleaned = re.sub(r"[\s_]+", "_", cleaned)
    return f"{cleaned or 'resume'}.{extension}"


def _load(resume_id: str, db: Session) -> tuple[str, schemas.ResumeDocument]:
    """The resume's display name and its validated document, or 404."""
    resume = db.get(models.Resume, resume_id)
    if resume is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No resume with id {resume_id}")
    return resume.name, schemas.ResumeDocument.model_validate(resume.document)


def _paper(document: schemas.ResumeDocument, options: schemas.ExportRequest | None) -> schemas.PaperSize:
    return options.paper_size if options and options.paper_size else document.settings.paper_size


def _compress_pdf(pdf_bytes: bytes) -> bytes:
    """Shrink a rendered PDF when pypdf is available; otherwise return as-is.

    Chromium already Flate-compresses streams, so the win here is duplicate-
    object removal and re-packed cross-reference tables -- usually 5-20% on
    font-heavy documents.
    """
    try:
        from pypdf import PdfReader, PdfWriter
        import io

        reader = PdfReader(io.BytesIO(pdf_bytes))
        writer = PdfWriter()
        writer.append(reader)
        writer.compress_identical_objects(remove_identicals=True, remove_orphans=True)
        out = io.BytesIO()
        writer.write(out)
        compressed = out.getvalue()
        # A pathological file could grow; never ship a "compressed" result
        # that is larger than what the browser produced.
        return compressed if len(compressed) < len(pdf_bytes) else pdf_bytes
    except Exception:  # noqa: BLE001 -- compression is best-effort by design
        return pdf_bytes


@router.post("/{resume_id}/export/pdf")
async def export_pdf(
    resume_id: str,
    options: schemas.ExportRequest | None = None,
    db: Session = Depends(get_db),
) -> Response:
    name, document = _load(resume_id, db)
    paper = _paper(document, options)

    try:
        pdf_bytes = await renderer.render(resume_id, paper_size=paper.value)
    except BrowserNotAvailable as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 -- render failures are reported, not swallowed
        # The type name matters: some exceptions worth reporting stringify to ""
        # (NotImplementedError is one), and "PDF render failed: " tells nobody
        # anything.
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"PDF render failed: {type(exc).__name__}: {exc}".rstrip(": "),
        ) from exc

    if options and options.compress:
        pdf_bytes = _compress_pdf(pdf_bytes)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{_filename(name, "pdf")}"'
        },
    )


@router.post("/{resume_id}/export/docx")
async def export_docx(
    resume_id: str,
    options: schemas.ExportRequest | None = None,
    db: Session = Depends(get_db),
) -> Response:
    name, document = _load(resume_id, db)
    paper = _paper(document, options)

    docx_bytes = build_docx(document, paper_size=paper)
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{_filename(name, "docx")}"'
        },
    )


@router.post("/{resume_id}/export/tex")
async def export_tex(
    resume_id: str,
    options: schemas.ExportRequest | None = None,
    db: Session = Depends(get_db),
) -> Response:
    name, document = _load(resume_id, db)
    paper = _paper(document, options)

    tex = build_tex(document, paper_size=paper)
    return Response(
        content=tex,
        media_type="application/x-tex",
        headers={
            "Content-Disposition": f'attachment; filename="{_filename(name, "tex")}"'
        },
    )
