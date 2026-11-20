"""Resume import: read an uploaded file, return a reviewable draft.

The uploaded bytes never touch the disk. A resume is read once, reduced to
plain text, and returned as data the client can edit and then save through the
ordinary resume endpoints. Nothing is created here -- the author's review, not
the upload, decides what gets written.
"""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from .. import importer

router = APIRouter(prefix="/api/import", tags=["import"])


@router.post("/extract")
async def extract_resume(file: UploadFile = File(...)) -> dict:
    data = await file.read()
    if not data:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "The file is empty.")
    if len(data) > importer.MAX_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            "That file is larger than 10 MB. Upload the resume itself rather than a bundle.",
        )

    filename = file.filename or "resume"
    kind = importer.detect_format(filename, data)
    if kind is None:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Upload a PDF, DOCX, TXT or LaTeX (.tex) resume.",
        )

    try:
        text = importer.extract_text(kind, data)
        document = importer.parse_resume(text)
    except importer.UnsupportedFile as exc:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, str(exc)) from exc
    except importer.UnreadableFile as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc

    return {
        "format": kind,
        "filename": filename,
        "characters": len(text),
        "document": document,
    }
