"""
One-page fit check: renders every picker design with the sample document and
verifies the sheet is used properly -- never spilling onto a second page,
never leaving most of the sheet empty.

For each card it reports:
  pages   how many A4 sheets the content spans (must be 1)
  fill    how far down the sheet the content reaches (target ~0.80-0.99)

Also saves a screenshot of every card for visual review.
"""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

FRONT = 'http://localhost:5173'
OUT = Path(r'C:\Users\MOHAMM~1\AppData\Local\Temp\opencode')
PX_PER_MM = 96 / 25.4


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 3000})
        page.goto(FRONT + '/')
        page.wait_for_selector('.side-cta')
        page.click('.side-cta')
        page.wait_for_selector('.tp-card')
        # Webfont metrics decide line wrapping; measure only once they are in.
        page.evaluate('document.fonts.ready.then(() => true)')
        page.wait_for_timeout(1200)

        cards = page.locator('.tp-card')
        n = cards.count()
        failures = []
        print(f'{"template":<16} {"pages":>5} {"fill":>6}')
        for i in range(n):
            card = cards.nth(i)
            tpl = card.locator('.page').get_attribute('class').replace('page tpl-', '')
            stats = card.evaluate(
                """(card) => {
                  const PX = %(px)f;
                  const sheet = 297 * PX;
                  const frame = card.querySelector('.thumb-frame');
                  const scale = parseFloat(getComputedStyle(frame).getPropertyValue('--preview-scale'));
                  const natural = frame.getBoundingClientRect().height / scale;
                  const pages = Math.max(1, Math.ceil(natural / sheet - 0.001));
                  const pg = card.querySelector('.page');
                  let bottom = 0;
                  for (const el of pg.querySelectorAll('*')) {
                    const r = el.offsetTop + el.offsetHeight;
                    if (r > bottom) bottom = r;
                  }
                  return { pages, fill: bottom / sheet };
                }"""
                % {'px': PX_PER_MM},
            )
            flag = ''
            if stats['pages'] != 1:
                flag = '  << OVERFLOW'
                failures.append(f'{tpl}: {stats["pages"]} pages')
            elif stats['fill'] < 0.74:
                flag = '  << UNDERFILLED'
                failures.append(f'{tpl}: fill {stats["fill"]:.2f}')
            print(f'{tpl:<16} {stats["pages"]:>5} {stats["fill"]:>6.2f}{flag}')
            card.screenshot(path=str(OUT / f'tpl_{tpl}.png'))
        browser.close()

    if failures:
        print('\nFAILURES:\n' + '\n'.join(failures))
        return 1
    print('\nfit OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
