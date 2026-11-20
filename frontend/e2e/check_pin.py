"""E2E: at high zoom -- zoom bar stays pinned, BOTH sidebars scroll fully."""

import atexit
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


created: list[str] = []


def cleanup():
    for resume_id in created:
        try:
            api("DELETE", f"/resumes/{resume_id}")
        except Exception as exc:
            print(f"cleanup failed for {resume_id}: {exc}")


resume = api("POST", "/resumes", {"name": "Pin E2E"})
rid = resume["id"]
created.append(rid)
atexit.register(cleanup)

doc = resume["document"]
exp = doc["sections"][1]
first = dict(exp["items"][0])
exp["items"] = []
for i in range(14):
    item = dict(first, id=f"exp{i}", position=f"Role {i}")
    item["bullets"] = ["Achievement text that wraps nicely across the column width." for _ in range(4)]
    exp["items"].append(item)
api("PUT", f"/resumes/{rid}", {"name": "Pin E2E", "document": doc})

failures: list[str] = []

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1500, "height": 900})
    page.goto(f"http://localhost:5173/resume/{rid}")
    page.wait_for_selector(".stage")
    page.wait_for_timeout(800)

    stage = page.locator(".stage")
    left = page.locator(".pane-left")
    right = page.locator(".pane-right")
    bar = page.locator(".zoom-bar")

    # Zoom to ~156% via ctrl+wheel over the LEFT sidebar.
    page.locator(".pane-left").hover()
    for _ in range(6):
        page.keyboard.down("Control")
        page.mouse.wheel(0, -300)
        page.keyboard.up("Control")
        page.wait_for_timeout(80)
    page.wait_for_timeout(300)

    caption = page.locator(".page-caption").inner_text()
    print("caption:", caption)

    # --- 1. Zoom bar stays pinned while the preview scrolls ---
    vp_h = page.evaluate("window.innerHeight")
    bar_before = bar.bounding_box()
    stage.hover()
    page.mouse.move(750, 450)
    for _ in range(6):
        page.mouse.wheel(0, 500)
        page.wait_for_timeout(120)
    bar_after = bar.bounding_box()
    pinned = (
        abs(bar_after["y"] - bar_before["y"]) < 2
        and bar_after["y"] + bar_after["height"] <= vp_h + 1
    )
    print(f"[bar] y {bar_before['y']} -> {bar_after['y']} (viewport {vp_h}) pinned={pinned}")
    if not pinned:
        failures.append("zoom bar drifted while preview scrolled")

    # --- 2. Right sidebar fully scrollable to its last pixel ---
    def can_reach_bottom(locator):
        return locator.evaluate(
            """el => {
                el.scrollTop = 1e7;
                const at = el.scrollTop;
                el.scrollTop = 0;
                return { at, max: el.scrollHeight - el.clientHeight };
            }"""
        )

    r = can_reach_bottom(right)
    ok_r = r["max"] <= 2 or r["at"] >= r["max"] - 1
    print(f"[right] scrollTop reach {r['at']}/{r['max']} ok={ok_r}")
    if not ok_r:
        failures.append(f"right pane cannot scroll to bottom ({r['at']}/{r['max']})")

    l = can_reach_bottom(left)
    ok_l = l["max"] <= 2 or l["at"] >= l["max"] - 1
    print(f"[left] scrollTop reach {l['at']}/{l['max']} ok={ok_l}")
    if not ok_l:
        failures.append(f"left pane cannot scroll to bottom ({l['at']}/{l['max']})")

    # --- 3. Neither pane exceeds the viewport height (no clipped overflow) ---
    heights = page.evaluate(
        """() => {
            const h = sel => document.querySelector(sel)?.getBoundingClientRect().height ?? -1;
            return { left: h('.pane-left'), right: h('.pane-right'), wrap: h('.preview-wrap'), vp: window.innerHeight };
        }"""
    )
    print("[heights]", json.dumps(heights))
    if heights["wrap"] > heights["vp"] + 1:
        failures.append(f"preview wrapper grew beyond viewport ({heights['wrap']} > {heights['vp']})")
    if heights["left"] > heights["vp"] + 1 or heights["right"] > heights["vp"] + 1:
        failures.append("a sidebar grew beyond the viewport")

    browser.close()

if failures:
    print("\nFAILURES:")
    for f in failures:
        print(" -", f)
    sys.exit(1)
print("\nALL CHECKS PASSED")
