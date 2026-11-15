"""AgentCV backend entrypoint.

Run from the backend directory:
    .venv\\Scripts\\python.exe -m uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .db import init_db
from .pdf import renderer
from .routers import export, resumes, uploads
from .routers.uploads import UPLOAD_DIR

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield
    # Chromium is kept warm between exports, so it needs closing explicitly.
    await renderer.shutdown()


app = FastAPI(title="AgentCV", version="0.1.0", lifespan=lifespan)

# Single-user local app: the Vite dev server is the only browser origin, and
# there are no credentials to protect.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.environ.get("AGENTCV_FRONTEND_URL", "http://localhost:5173"),
        "http://localhost:4173",  # vite preview
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resumes.router)
app.include_router(export.router)
app.include_router(uploads.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# Uploaded photos. Chromium fetches these by URL while printing, so they must
# be reachable from the same origin as the print page.
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# When the frontend has been built, serve it from the same origin so the whole
# app runs off one process. Mounted last so it never shadows /api routes.
if FRONTEND_DIST.is_dir():

    class SpaFiles(StaticFiles):
        """Static files with a single-page-app fallback.

        The router owns the URL space: /resume/<id>, /print/<id> and the rest
        exist only in the browser, so a plain static mount answers them with
        404 and the app looks broken on this origin (while working fine on the
        Vite dev server). Anything that is not a real file falls back to
        index.html and lets the client router take it from there.

        A missed *file* is not a route. Serving index.html for, say, a deleted
        icon answers an image request with HTML and teaches the browser to cache
        that HTML under the image URL, so only extensionless paths fall back.
        """

        async def get_response(self, path: str, scope):  # type: ignore[override]
            try:
                return await super().get_response(path, scope)
            except StarletteHTTPException as exc:
                if exc.status_code == 404 and not Path(path).suffix:
                    return await super().get_response("index.html", scope)
                raise

    app.mount("/", SpaFiles(directory=FRONTEND_DIST, html=True), name="frontend")
