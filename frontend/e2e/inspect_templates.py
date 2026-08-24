"""
Full-resolution visual inspection of every template.

For each design and two content scenarios (full history, short history) it
renders the page standalone at true A4 size, screenshots it at 2x DPI, and
reports the typographic geometry: element sizes, section rhythm, whitespace.

Output: %TEMP%/opencode/full_<tpl>.png, sparse_<tpl>.png, metrics on stdout.
"""

import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

FRONT = 'http://localhost:5173'
OUT = Path(r'C:\Users\MOHAMM~1\AppData\Local\Temp\opencode')
PX_PER_MM = 96 / 25.4
SHEET_W = int(210 * PX_PER_MM)   # 794
SHEET_H = int(297 * PX_PER_MM)   # 1123

TEMPLATES = [
    'classic-pro', 'modern-min', 'executive', 'two-col', 'sidebar', 'editorial',
    'compact', 'creative', 'devtech', 'academic', 'timeline', 'photo-pro',
]

METRICS_JS = """
() => {
  const pt = (px) => Math.round((px * 0.75) * 10) / 10   // px -> pt
  const pg = document.querySelector('.inspect-host .page')
  const name = pg.querySelector('.doc-name')
  const headline = pg.querySelector('.doc-headline')
  const titles = [...pg.querySelectorAll('.doc-section-title')]
  const items = [...pg.querySelectorAll('.doc-item')]
  const secs = [...pg.querySelectorAll('.doc-section')]
  const cs = (el) => getComputedStyle(el)
  const gaps = []
  for (let i = 1; i < secs.length; i++) {
    gaps.push(Math.round(secs[i].getBoundingClientRect().top - secs[i-1].getBoundingClientRect().bottom))
  }
  let bottom = 0
  for (const el of pg.querySelectorAll('*')) {
    const r = el.getBoundingClientRect()
    const b = (r.bottom - pg.getBoundingClientRect().top)
    if (b > bottom) bottom = b
  }
  const sheet = 297 * %(px)f
  return {
    namePt: pt(parseFloat(cs(name).fontSize)),
    nameWeight: cs(name).fontWeight,
    headlinePt: headline ? pt(parseFloat(cs(headline).fontSize)) : null,
    titlePt: titles.length ? pt(parseFloat(cs(titles[0]).fontSize)) : null,
    titleWeight: titles.length ? cs(titles[0]).fontWeight : null,
    titleTransform: titles.length ? cs(titles[0]).textTransform : null,
    itemPt: items.length ? pt(parseFloat(cs(items[0]).fontSize)) : null,
    sectionGapPx: gaps,
    fill: Math.round((bottom / sheet) * 100) / 100,
  }
}
"""


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(
            viewport={'width': SHEET_W + 40, 'height': SHEET_H + 40},
            device_scale_factor=2,
        )
        page.goto(FRONT + '/')
        page.wait_for_timeout(800)
        report = {}
        for tpl in TEMPLATES:
            for variant in ('full', 'sparse'):
                page.evaluate(
                    """(args) => {
                      document.body.innerHTML = ''
                      document.body.style.background = '#888'
                      document.body.style.margin = '0'
                      const host = document.createElement('div')
                      host.className = 'inspect-host'
                      host.style.width = 'fit-content'
                      document.body.appendChild(host)
                      return import('/src/debug/inspect-mount.tsx').then((m) => {
                        m.mountDemo(host, args.tpl, args.variant)
                      })
                    }""",
                    {'tpl': tpl, 'variant': variant},
                )
                page.wait_for_selector('.inspect-host .page')
                page.evaluate('document.fonts.ready.then(() => true)')
                page.wait_for_timeout(500)
                page.locator('.inspect-host .page').screenshot(
                    path=str(OUT / f'{variant}_{tpl}.png')
                )
                if variant == 'full':
                    m = page.evaluate(METRICS_JS % {'px': PX_PER_MM})
                    report[tpl] = m
        browser.close()

    hdr = f'{"template":<12} {"name":>9} {"head":>6} {"title":>11} {"item":>5} {"fill":>5}  gaps'
    print(hdr)
    for tpl, m in report.items():
        t = f"{m['titlePt']}pt/{m['titleWeight']}/{m['titleTransform'] or '-'}"
        gaps = ' '.join(str(g) for g in m['sectionGapPx'])
        print(
            f"{tpl:<12} {str(m['namePt'])+'pt':>9} {str(m['headlinePt']):>6} "
            f"{t:>11} {str(m['itemPt'])+'pt':>5} {m['fill']:>5.2f}  {gaps}"
        )
    with open(OUT / 'metrics.json', 'w') as f:
        json.dump(report, f, indent=1)
    return 0


if __name__ == '__main__':
    sys.exit(main())
