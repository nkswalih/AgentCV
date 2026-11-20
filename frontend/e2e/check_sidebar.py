"""
E2E: the home shell sidebar -- navigation, active states, placeholders,
and the sub-720px fold into a top bar.
"""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

FRONT = 'http://localhost:5173'
OUT = Path(__file__).resolve().parent / 'artifacts'
OUT.mkdir(parents=True, exist_ok=True)


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        page.goto(FRONT + '/')
        page.wait_for_selector('.home-side')

        # Sidebar structure: brand, More menu, exactly three nav items.
        items = page.locator('.nav-item')
        assert items.count() == 3, f'expected 3 nav items, got {items.count()}'
        labels = [items.nth(i).inner_text().strip() for i in range(3)]
        assert labels == ['Resume', 'Cover Letter', 'Job Tracker'], labels
        assert page.locator('.side-more-btn').inner_text().strip() == 'More'
        assert page.locator('.new-resume-card').inner_text().strip() == 'New resume'

        # Landing on / : Resume active, gallery present.
        assert 'active' in (items.nth(0).get_attribute('class') or '')
        page.wait_for_selector('.thumb-grid')
        page.screenshot(path=str(OUT / 'side_resume.png'))

        # Cover Letter placeholder.
        items.nth(1).click()
        page.wait_for_url('**/cover-letters')
        page.wait_for_selector('.page-title:text-is("Cover Letters")')
        assert page.locator('.page-title').inner_text() == 'Cover Letters'
        assert page.locator('.empty-title').count() == 1
        assert 'active' in (items.nth(1).get_attribute('class') or '')
        assert 'active' not in (items.nth(0).get_attribute('class') or '')
        page.screenshot(path=str(OUT / 'side_letters.png'))

        # Job Track placeholder.
        items.nth(2).click()
        page.wait_for_url('**/job-track')
        page.wait_for_selector('.page-title:text-is("Job Track")')
        assert page.locator('.page-title').inner_text() == 'Job Track'
        assert 'active' in (items.nth(2).get_attribute('class') or '')
        page.screenshot(path=str(OUT / 'side_track.png'))

        # Back to Resume via the brand's own section link.
        items.nth(0).click()
        page.wait_for_selector('.thumb-grid')

        # Narrow viewport: sidebar becomes a top bar.
        page.set_viewport_size({'width': 640, 'height': 800})
        page.wait_for_timeout(150)
        box = page.locator('.home-side').bounding_box()
        assert box['height'] < 90, f'sidebar did not fold flat: {box}'
        assert not page.locator('.side-more').is_visible(), 'More menu should hide on narrow'
        page.screenshot(path=str(OUT / 'side_narrow.png'))

        browser.close()
    print('sidebar OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
