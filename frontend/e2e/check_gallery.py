"""E2E: the dashboard renders live miniature previews, not a text list."""

import atexit
import json
import sys
import urllib.request
from collections import Counter
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000/api"
OUT = Path(__file__).resolve().parent / "artifacts"
OUT.mkdir(parents=True, exist_ok=True)


def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{BASE}{path}", data=data, method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as res:
        raw = res.read()
        return json.loads(raw) if raw else None


created: list[str] = []


def cleanup():
    # IDs are captured from this run. A user's similarly named resume is never
    # test residue and must not be removed.
    for resume_id in created:
        try:
            api("DELETE", f"/resumes/{resume_id}")
        except Exception as exc:
            print(f"cleanup failed for {resume_id}: {exc}")


a = api("POST", "/resumes", {"name": "Gallery A"})
created.append(a["id"])
b = api("POST", "/resumes", {"name": "Gallery B"})
created.append(b["id"])
atexit.register(cleanup)

# Give B enough content to span two pages -> badge expected.
doc = b["document"]
exp = doc["sections"][1]
first = dict(exp["items"][0])
exp["items"] = []
for i in range(10):
    item = dict(first, id=f"e{i}", position=f"Role {i}")
    item["bullets"] = ["Achievement text that wraps nicely across the column." for _ in range(4)]
    exp["items"].append(item)
api("PUT", f"/resumes/{b['id']}", {"name": "Gallery B", "document": doc})

failures = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    page.goto("http://localhost:5173/")
    page.wait_for_selector(".thumb-grid")

    # Full documents arrive after the summary list. Wait for every card to
    # replace its loading placeholder with the real rendered page.
    expected_resumes = api("GET", "/resumes")
    page.wait_for_function(
        "expected => document.querySelectorAll('.thumb-window .page').length === expected",
        arg=len(expected_resumes),
    )
    page.wait_for_timeout(300)  # fonts and final scale measurement

    windows = page.locator(".thumb-window")
    n = windows.count()
    # The dashboard may hold real resumes alongside the fixtures; the grid must
    # show exactly what the API lists, including duplicate names.
    print("thumb cards:", n)
    if n != len(expected_resumes):
        failures.append(f"expected {len(expected_resumes)} thumb windows, got {n}")

    # Each window contains a real rendered .page.
    rendered = page.evaluate(
        """Array.from(document.querySelectorAll('.thumb-window')).map(w => ({
            hasPage: !!w.querySelector('.page'),
            w: Math.round(w.getBoundingClientRect().width),
            h: Math.round(w.getBoundingClientRect().height),
            scale: getComputedStyle(w.querySelector('.thumb-frame')).transform,
        }))"""
    )
    print(json.dumps(rendered, indent=2))
    if not all(r["hasPage"] and r["w"] > 100 for r in rendered):
        failures.append("a thumbnail did not render a real resume page")

    # Aspect ratio ~ paper (A4 210/297 = 0.707).
    for r in rendered:
        ratio = r["w"] / r["h"]
        if abs(ratio - 210 / 297) > 0.02:
            failures.append(f"card aspect {ratio:.3f} off paper ratio")

    # Names still visible under previews; list rows gone. Every resume the API
    # lists must appear as a card.
    names = page.locator(".resume-name").all_inner_texts()
    expected_names = Counter(r["name"] or "Untitled resume" for r in expected_resumes)
    print("names:", names)
    if Counter(names) != expected_names:
        failures.append(f"card names differ: expected {expected_names}, got {Counter(names)}")
    if page.locator(".dash-list").count():
        failures.append("old text-list still present")

    page.screenshot(path=str(OUT / "dashboard_thumbs.png"))
    browser.close()

if failures:
    print("\nFAILURES:")
    for f in failures:
        print(" -", f)
    sys.exit(1)
print("ALL CHECKS PASSED")
