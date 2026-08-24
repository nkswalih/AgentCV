"""
E2E: the creation dialog -- live-preview gallery over the twelve-design
system, category chips, structural differences between designs, and the
create -> editor flow end to end.
"""

import sys
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

FRONT = 'http://localhost:5173'
API = 'http://localhost:8000/api/resumes'
OUT = Path(r'C:\Users\MOHAMM~1\AppData\Local\Temp\opencode')


def cleanup(created: list[str]) -> None:
    for rid in created:
        try:
            req = urllib.request.Request(f'{API}/{rid}', method='DELETE')
            urllib.request.urlopen(req, timeout=10)
        except Exception as exc:
            print(f'cleanup failed for {rid}: {exc}')


def main() -> int:
    created: list[str] = []
    try:
        return run(created)
    finally:
        cleanup(created)


def run(created: list[str]) -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        page.goto(FRONT + '/')
        page.wait_for_selector('.side-cta')

        # -- dialog opens from the sidebar CTA --
        page.click('.side-cta')
        page.wait_for_selector('.modal-wide')
        cards = page.locator('.tp-card')
        n_all = cards.count()
        assert n_all == 17, f'expected 17 templates under All, got {n_all}'
        # every card shows a real rendered page miniature
        assert page.locator('.tp-card .thumb-frame .page').count() == 17

        # -- each design's miniature carries its own structure --
        assert page.locator('.tp-card:has(.tpl-two-col .doc-rail)').count() == 1, 'two-col rail missing'
        assert page.locator('.tp-card:has(.tpl-sidebar .doc-rail)').count() == 1, 'sidebar rail missing'
        assert page.locator('.tp-card:has(.tpl-portal-pro .doc-rail)').count() == 1, 'portal-pro rail missing'
        assert page.locator('.tp-card:has(.tpl-modern-deep .doc-rail)').count() == 1, 'modern-deep rail missing'
        assert page.locator('.tp-card:has(.tpl-timeline .tl-item)').count() == 1, 'timeline spine missing'
        assert page.locator('.tp-card:has(.tpl-photo-pro img.doc-portrait)').count() == 1, 'portrait missing'
        assert page.locator('.tp-card:has(.tpl-creative .doc-band)').count() == 1, 'creative band missing'
        assert page.locator('.tp-card:has(.tpl-executive .doc-header)').count() >= 1
        page.screenshot(path=str(OUT / 'dlg_all.png'))

        # -- filters --
        def shown_names(filt: str) -> list[str]:
            page.click(f'.chip:text-is("{filt}")')
            page.wait_for_timeout(120)
            return [cards.nth(i).locator('.tp-name').inner_text() for i in range(cards.count())]

        popular = shown_names('Popular')
        assert popular == ['Classic Professional', 'Modern Minimal', 'Executive'], popular
        simple = shown_names('Simple')
        assert simple == ['Classic Professional', 'Modern Minimal', 'Compact'], simple
        modern = shown_names('Modern')
        assert len(modern) == 5 and 'Editorial' in modern and 'Timeline' in modern, modern
        page.screenshot(path=str(OUT / 'dlg_simple.png'))
        page.click('.chip:text-is("All Templates")')

        # -- create with Two Column; editor must render the right rail --
        page.click('.tp-card:has-text("Two Column")')
        page.wait_for_url('**/resume/**')
        created.append(page.url.rstrip('/').rsplit('/', 1)[-1])
        page.wait_for_selector('.page.tpl-two-col .doc-rail')
        page.wait_for_timeout(400)  # fonts settle
        page.screenshot(path=str(OUT / 'tpl_twocol.png'))

        # -- back home, pick Photo Pro; masthead must render (fresh resumes
        #    have no photoUrl -- the portrait itself is covered by check_fit) --
        page.goto(FRONT + '/')
        page.wait_for_selector('.side-cta')
        page.click('.side-cta')
        page.wait_for_selector('.modal-wide')
        page.click('.tp-card:has-text("Photo Pro")')
        page.wait_for_url('**/resume/**')
        created.append(page.url.rstrip('/').rsplit('/', 1)[-1])
        page.wait_for_selector('.page.tpl-photo-pro .doc-header')
        page.wait_for_timeout(400)
        page.screenshot(path=str(OUT / 'tpl_photopro.png'))

        # -- Escape cancels without creating --
        page.goto(FRONT + '/')
        page.wait_for_selector('.side-cta')
        before = page.locator('.dash-card').count()
        page.click('.side-cta')
        page.wait_for_selector('.modal-wide')
        page.keyboard.press('Escape')
        page.wait_for_selector('.modal-wide', state='detached')
        assert page.locator('.dash-card').count() == before, 'Escape created a resume'

        browser.close()
    print('templates OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
