"""SQLite engine and session wiring."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "agentcv.db"

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    # SQLite refuses cross-thread use by default; FastAPI's threadpool hands
    # sync endpoints to worker threads, so the check has to be relaxed.
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from . import models  # noqa: F401  -- registers tables on Base.metadata

    Base.metadata.create_all(engine)
