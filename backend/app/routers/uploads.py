"""Image uploads: profile photos and resume background images.

The uploaded filename is never trusted: the extension is chosen from the
detected content type and the stem is a fresh UUID. That removes path traversal
("../../etc/passwd"), Windows reserved names, and double-extension tricks
("photo.png.html") in one step.
"""

from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile, status

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Raster formats only. SVG is excluded on purpose: it can carry script, and it
# would be served from this app's own origin.
ALLOWED_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}

PHOTO_MAX_BYTES = 5 * 1024 * 1024
BACKGROUND_MAX_BYTES = 10 * 1024 * 1024


async def _save(file: UploadFile, max_bytes: int) -> dict[str, str]:
    suffix = ALLOWED_TYPES.get(file.content_type or "")
    if suffix is None:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Use a PNG, JPEG, or WebP image.",
        )

    # Read with a cap rather than trusting the Content-Length header.
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Keep the image under {max_bytes // 1024 // 1024}MB.",
        )
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The file is empty.")

    name = f"{uuid4().hex}{suffix}"
    (UPLOAD_DIR / name).write_bytes(data)
    return {"url": f"/uploads/{name}"}


@router.post("/photo", status_code=status.HTTP_201_CREATED)
async def upload_photo(file: UploadFile = File(...)) -> dict[str, str]:
    return await _save(file, PHOTO_MAX_BYTES)


@router.post("/background", status_code=status.HTTP_201_CREATED)
async def upload_background(file: UploadFile = File(...)) -> dict[str, str]:
    """Full-page backdrops: same trust model, a larger cap for print quality."""
    return await _save(file, BACKGROUND_MAX_BYTES)
