"""Resume CRUD.

Requests and responses speak camelCase (the schemas carry aliases) so the React
client can use the payloads directly without a naming shim.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from .. import seed
from ..db import get_db
from ..seed import starter_document

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


def _get_or_404(db: Session, resume_id: str) -> models.Resume:
    resume = db.get(models.Resume, resume_id)
    if resume is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No resume with id {resume_id}")
    return resume


def _dump(document: schemas.ResumeDocument) -> dict:
    # by_alias keeps the stored JSON camelCase, matching what the API emits --
    # one representation everywhere instead of translating at each boundary.
    return document.model_dump(by_alias=True, mode="json")


@router.get("", response_model=list[schemas.ResumeSummary])
def list_resumes(db: Session = Depends(get_db)) -> list[models.Resume]:
    stmt = select(models.Resume).order_by(models.Resume.updated_at.desc())
    return list(db.scalars(stmt))


@router.post("", response_model=schemas.Resume, status_code=status.HTTP_201_CREATED)
def create_resume(
    payload: schemas.ResumeCreate, db: Session = Depends(get_db)
) -> models.Resume:
    document = payload.document or starter_document()
    if payload.template is not None:
        document.settings.template = payload.template
        if payload.document is None:
            # Shorthand create: the named designs ship with their own face.
            font = seed.TEMPLATE_FONTS.get(payload.template)
            if font:
                document.settings.font_family = font
    resume = models.Resume(
        name=payload.name,
        template=document.settings.template.value,
        document=_dump(document),
    )
    db.add(resume)
    db.commit()
    return resume


@router.get("/{resume_id}", response_model=schemas.Resume)
def get_resume(resume_id: str, db: Session = Depends(get_db)) -> models.Resume:
    return _get_or_404(db, resume_id)


@router.put("/{resume_id}", response_model=schemas.Resume)
def update_resume(
    resume_id: str, payload: schemas.ResumeUpdate, db: Session = Depends(get_db)
) -> models.Resume:
    resume = _get_or_404(db, resume_id)

    if payload.name is not None:
        resume.name = payload.name
    if payload.document is not None:
        resume.document = _dump(payload.document)
        # Keep the mirrored column in step with the document it came from.
        resume.template = payload.document.settings.template.value

    db.commit()
    return resume


@router.post("/{resume_id}/duplicate", response_model=schemas.Resume, status_code=201)
def duplicate_resume(resume_id: str, db: Session = Depends(get_db)) -> models.Resume:
    source = _get_or_404(db, resume_id)
    copy = models.Resume(
        name=f"{source.name} (copy)",
        template=source.template,
        # Re-validate rather than deep-copying the raw dict: it normalises any
        # document written by an older version of the schema.
        document=_dump(schemas.ResumeDocument.model_validate(source.document)),
    )
    db.add(copy)
    db.commit()
    return copy


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(resume_id: str, db: Session = Depends(get_db)) -> None:
    db.delete(_get_or_404(db, resume_id))
    db.commit()
