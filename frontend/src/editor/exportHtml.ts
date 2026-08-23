/**
 * HTML export: a single self-contained .html file.
 *
 * The PDF is the source of truth for looks because it prints the same DOM the
 * preview drew. The HTML export reuses that exact advantage: it captures the
 * live `.page` element and inlines the document stylesheet, so the file opens
 * in any browser looking like the preview, with no server round-trip.
 */

import templatesCss from '../styles/templates.css?raw'

const FONT_LINK =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Noto+Serif:wght@400;600;700&family=Libre+Baskerville:wght@400;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap'

export function downloadHtmlExport(resumeName: string): void {
  const page = document.querySelector('.page')
  if (!page) throw new Error('Open the resume once before exporting HTML')

  // The preview may be scaled to fit its pane via an ancestor transform; the
  // clone carries none of it, so the exported page keeps natural size.
  const body = page.cloneNode(true) as Element

  const safeName = resumeName.trim() || 'Resume'
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeName.replace(/[<>&]/g, '')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT_LINK}">
<style>
body { margin: 0; background: #e8eaee; display: flex; justify-content: center; padding: 16px 0; }
${templatesCss}
</style>
</head>
<body>
${body.outerHTML}
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    const cleaned = safeName.replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '_') || 'resume'
    a.href = url
    a.download = `${cleaned}.html`
    a.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}
