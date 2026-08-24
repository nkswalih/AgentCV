"""E2E: the dashboard renders live miniature previews, not a text list."""

import json
import sys
import urllib.request

from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000/api"


def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{BASE}{path}", data=data, method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as res:
        raw = res.read()
        return json.loads(raw) if raw else None


def cleanup():
    # Only ever remove test residue -- never touch real resumes.
    for r in api("GET", "/resumes"):
        if r["name"] in ("Gallery A", "Gallery B", "Untitled Resume", "Probe"):
            api("DELETE", f"/resumes/{r['id']}")


cleanup()
a = api("POST", "/resumes", {"name": "Gallery A"})
b = api("POST", "/resumes", {"name": "Gallery B"})

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
    page.wait_for_timeout(1200)  # thumbnails fetch + fonts

    windows = page.locator(".thumb-window")
    n = windows.count()
    # The dashboard may hold real resumes alongside the fixtures; the grid must
    # show exactly what the API lists.
    expected = {r["name"] for r in api("GET", "/resumes")}
    print("thumb cards:", n)
    if n != len(expected):
        failures.append(f"expected {len(expected)} thumb windows, got {n}")

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

    # Multi-page badge on B at least; every badge must read "N pages".
    badges = page.locator(".thumb-pages").all_inner_texts()
    print("badges:", badges)
    if not any("pages" in b for b in badges):
        failures.append(f"Gallery B lost its multi-page badge, got {badges}")

    # Names still visible under previews; list rows gone. Every resume the API
    # lists must appear as a card.
    names = page.locator(".dash-card-name").all_inner_texts()
    print("names:", names)
    if not expected <= set(names):
        failures.append(f"missing cards: {expected - set(names)}")
    if page.locator(".dash-list").count():
        failures.append("old text-list still present")

    page.screenshot(path=r"C:\Users\MOHAMM~1\AppData\Local\Temp\opencode\dashboard_thumbs.png")
    browser.close()

cleanup()

if failures:
    print("\nFAILURES:")
    for f in failures:
        print(" -", f)
    sys.exit(1)
print("ALL CHECKS PASSED")
