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

from .db import init_db
from .pdf import renderer
from .routers import export, resumes

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


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# When the frontend has been built, serve it from the same origin so the whole
# app runs off one process. Mounted last so it never shadows /api routes.
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
