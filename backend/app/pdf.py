"""PDF rendering via headless Chromium.

Why a browser instead of a Python PDF library (WeasyPrint, ReportLab): the
promise of a resume builder is that the PDF is *exactly* what the live preview
showed. The only way to guarantee that is to print the same HTML/CSS with the
same engine that drew the preview. So the backend drives Chromium to the
frontend's own `/print/:id` route and prints that.

The browser is launched once and reused. A cold Chromium launch costs about a
second, which is very noticeable when it happens on every Download click.
"""

from __future__ import annotations

import asyncio
import os
import sys
import threading
from collections.abc import Coroutine
from typing import Any, TypeVar

from playwright.async_api import Browser, Playwright, async_playwright

FRONTEND_URL = os.environ.get("AGENTCV_FRONTEND_URL", "http://localhost:5173").rstrip("/")

# Chromium's page.pdf() takes CSS lengths, not paper-size names, for anything
# custom -- but it understands these two by name.
_PAPER_FORMATS = {"A4": "A4", "Letter": "Letter"}

T = TypeVar("T")


class BrowserNotAvailable(RuntimeError):
    """Raised when Chromium is missing, with the command that installs it."""


class _RenderLoop:
    """A private event loop, on its own thread, for every Playwright call.

    Playwright talks to Chromium through a subprocess, and asyncio can only
    spawn subprocesses on a loop that supports them. On Windows a
    SelectorEventLoop cannot: it raises a bare `NotImplementedError` whose
    message is the empty string, which is why the failure used to surface as an
    uninformative "PDF render failed: ".

    That loop is not hypothetical -- it is what uvicorn installs whenever it
    runs with `--reload` (`asyncio_loop_factory(use_subprocess=True)`), the very
    command this project documents. Rather than constrain how the server may be
    started, the renderer brings a loop that can spawn subprocesses and marshals
    its work onto it.
    """

    def __init__(self) -> None:
        self._loop: asyncio.AbstractEventLoop | None = None
        self._thread: threading.Thread | None = None
        # A plain threading lock: this guards thread creation, so it must work
        # before any event loop exists.
        self._lock = threading.Lock()

    def _ensure(self) -> asyncio.AbstractEventLoop:
        with self._lock:
            if self._loop is not None:
                return self._loop

            loop = (
                asyncio.ProactorEventLoop()  # type: ignore[attr-defined]
                if sys.platform == "win32"
                else asyncio.new_event_loop()
            )
            thread = threading.Thread(
                target=loop.run_forever, name="agentcv-pdf", daemon=True
            )
            thread.start()
            self._loop, self._thread = loop, thread
            return loop

    async def submit(self, coro: Coroutine[Any, Any, T]) -> T:
        """Run `coro` on the render loop, awaited from the caller's loop."""
        future = asyncio.run_coroutine_threadsafe(coro, self._ensure())
        return await asyncio.wrap_future(future)

    def stop(self) -> None:
        with self._lock:
            loop, thread = self._loop, self._thread
            self._loop = self._thread = None
        if loop is None:
            return
        loop.call_soon_threadsafe(loop.stop)
        if thread is not None:
            thread.join(timeout=5)
        loop.close()


class _Renderer:
    """Owns the single long-lived Playwright + Chromium pair.

    Every coroutine here runs on the render loop, never on the request's loop,
    so the `asyncio.Lock` below is only ever awaited from that one loop.
    """

    def __init__(self) -> None:
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        # Guards launch so concurrent first-requests don't start two browsers.
        self._lock = asyncio.Lock()
        self._loop = _RenderLoop()

    async def _browser_instance(self) -> Browser:
        async with self._lock:
            if self._browser is not None and self._browser.is_connected():
                return self._browser

            try:
                if self._playwright is None:
                    self._playwright = await async_playwright().start()
                self._browser = await self._playwright.chromium.launch()
            except Exception as exc:  # noqa: BLE001 -- surfaced as a clean 503
                raise BrowserNotAvailable(
                    f"Could not start headless Chromium ({type(exc).__name__}: {exc}).\n"
                    "If it is not installed yet, run:\n"
                    "  backend\\.venv\\Scripts\\python.exe -m playwright install chromium"
                ) from exc

            return self._browser

    async def render(self, resume_id: str, paper_size: str = "A4") -> bytes:
        return await self._loop.submit(self._render(resume_id, paper_size))

    async def _render(self, resume_id: str, paper_size: str) -> bytes:
        browser = await self._browser_instance()
        context = await browser.new_context(
            # Chromium's PDF output is device-scale-independent, but a stable
            # viewport keeps any width-based CSS deterministic.
            viewport={"width": 1240, "height": 1754},
            color_scheme="light",
        )
        page = await context.new_page()
        try:
            url = f"{FRONTEND_URL}/print/{resume_id}"
            response = await page.goto(url, wait_until="domcontentloaded", timeout=20_000)
            if response is not None and response.status >= 400:
                raise RuntimeError(f"Print page returned HTTP {response.status} for {url}")

            # The print route sets this flag once the document is in the DOM,
            # so we never capture a half-rendered page or a loading spinner.
            await page.wait_for_selector('[data-print-ready="true"]', timeout=20_000)
            # Web fonts change line-wrapping; printing before they load shifts
            # text and can silently add a page.
            await page.evaluate("document.fonts.ready")

            # Screen media, not print: the template's CSS is written once and
            # used for both, so emulating print media here could only introduce
            # a difference between preview and PDF.
            await page.emulate_media(media="screen", color_scheme="light")

            return await page.pdf(
                format=_PAPER_FORMATS.get(paper_size, "A4"),
                print_background=True,
                # Zero margins on purpose -- the template owns its own page
                # padding, so preview and PDF share one box model.
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                prefer_css_page_size=True,
            )
        finally:
            await context.close()

    async def shutdown(self) -> None:
        if self._browser is not None or self._playwright is not None:
            await self._loop.submit(self._shutdown())
        self._loop.stop()

    async def _shutdown(self) -> None:
        if self._browser is not None:
            await self._browser.close()
            self._browser = None
        if self._playwright is not None:
            await self._playwright.stop()
            self._playwright = None


renderer = _Renderer()
