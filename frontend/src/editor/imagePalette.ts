/**
 * Palette extraction for the Border · Image card.
 *
 * The suggestions are measured from the chosen frame, not invented: the image
 * is downsampled, clustered with k-means, and the heaviest clusters become the
 * swatches. Running it locally keeps the feature offline and means a user's
 * upload never leaves the machine just to be colour-picked.
 */

const SAMPLE_WIDTH = 72
const MAX_SAMPLES = 1800
const ROUNDS = 14

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('')}`
}

function distance(a: number[], b: number[]): number {
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  // Rough perceptual weighting: green carries most of the luminance.
  return dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11
}

function hexDistance(a: string, b: string): number {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return Math.sqrt(distance(parse(a), parse(b)))
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Same-origin for curated backgrounds and uploads; the attribute keeps a
    // future remote source from tainting the canvas without warning.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read the image'))
    img.src = new URL(src, window.location.href).href
  })
}

/**
 * Return up to `count` colours that describe the image, most common first.
 * Returns an empty list when the image cannot be sampled (for example, a
 * cross-origin source that taints the canvas) so the caller can simply hide
 * the suggestions instead of failing the card.
 */
export async function extractPalette(src: string, count = 9): Promise<string[]> {
  let img: HTMLImageElement
  try {
    img = await loadImage(src)
  } catch {
    return []
  }

  const naturalWidth = img.naturalWidth || img.width || SAMPLE_WIDTH
  const naturalHeight = img.naturalHeight || img.height || SAMPLE_WIDTH
  const width = SAMPLE_WIDTH
  const height = Math.max(1, Math.round((naturalHeight / naturalWidth) * width))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)

  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, width, height).data
  } catch {
    return []
  }

  const points: number[][] = []
  const stride = Math.max(1, Math.floor((width * height) / MAX_SAMPLES))
  for (let i = 0; i < data.length; i += 4 * stride) {
    if (data[i + 3] < 200) continue
    points.push([data[i], data[i + 1], data[i + 2]])
  }
  if (points.length === 0) return []
  if (points.length <= count) {
    return [...new Set(points.map(([r, g, b]) => toHex(r, g, b)))]
  }

  // Farthest-point seeding: deterministic, and it spreads the starting
  // centroids across genuinely different colours instead of one busy corner.
  const centroids: number[][] = [points[0]]
  while (centroids.length < count) {
    let best = points[0]
    let bestGap = -1
    for (const p of points) {
      const gap = Math.min(...centroids.map((c) => distance(p, c)))
      if (gap > bestGap) {
        bestGap = gap
        best = p
      }
    }
    centroids.push([...best])
  }

  const weights = new Array(centroids.length).fill(0)
  for (let round = 0; round < ROUNDS; round += 1) {
    const sums = centroids.map(() => [0, 0, 0])
    weights.fill(0)
    for (const p of points) {
      let best = 0
      let bestGap = Infinity
      for (let i = 0; i < centroids.length; i += 1) {
        const gap = distance(p, centroids[i])
        if (gap < bestGap) {
          bestGap = gap
          best = i
        }
      }
      const s = sums[best]
      s[0] += p[0]
      s[1] += p[1]
      s[2] += p[2]
      weights[best] += 1
    }
    for (let i = 0; i < centroids.length; i += 1) {
      if (weights[i] === 0) continue
      centroids[i] = [
        sums[i][0] / weights[i],
        sums[i][1] / weights[i],
        sums[i][2] / weights[i],
      ]
    }
  }

  const ranked = centroids
    .map((c, i) => ({ hex: toHex(c[0], c[1], c[2]), weight: weights[i] }))
    .filter((c) => c.weight > 0)
    .sort((a, b) => b.weight - a.weight)

  // Keep the heaviest cluster of each visually distinct colour family. The
  // threshold is deliberately small: tonal images are the common case, and a
  // lighter/darker variant is still a useful accent choice.
  const kept: { hex: string; weight: number }[] = []
  for (const c of ranked) {
    if (kept.some((k) => hexDistance(k.hex, c.hex) < 12)) continue
    kept.push(c)
    if (kept.length >= count) break
  }
  return kept.map((c) => c.hex)
}
