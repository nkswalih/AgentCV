/**
 * Turning a pasted blob of skills into individual entries.
 *
 * People collect skills from wildly different places -- a comma list in an old
 * CV, a bulleted column in a job ad, a spreadsheet cell, a numbered list out of
 * a chatbot -- and retyping them one at a time is the tedious part of filling
 * in this section. So a paste that clearly carries a list gets split up on the
 * author's behalf.
 */

/**
 * Characters that separate one skill from the next.
 *
 * Note what is deliberately absent. `/` belongs to "CI/CD", "TCP/IP" and
 * "C++/C#"; `+` to "C++"; `.` to "Node.js" and "ASP.NET"; and `-` to
 * "Node-RED", so a hyphen counts only as a line-leading list marker and never
 * mid-line. Splitting on any of those would shred real skill names.
 */
const SEPARATORS = /[,;|\t•·‣▪◦]+/

/** A list marker at the head of a line: "- ", "* ", "• ", "3. ", "1) ". */
const LEADING_MARKER = /^\s*(?:[-*•·‣▪◦⁃]|\d+[.)])\s+/

/** "Languages:" -- a short, comma-free label introducing the rest of its line. */
const LABEL = /^([^,;:|\t]{1,40}):\s*(.*)$/

/**
 * How many skills a paste must yield before the section switches itself to the
 * bulleted layout. Four is enough to be unambiguously a list; below that the
 * author's chosen layout is left alone, so pasting a single name never
 * rearranges the page.
 */
export const BULLET_SWITCH_THRESHOLD = 4

export interface ParsedSkills {
  /** Lifted from a single leading "Label: …" prefix, when the paste had one. */
  category?: string
  skills: string[]
}

/** Whether a pasted string carries list structure worth splitting. */
export function looksLikeList(text: string): boolean {
  return /[\n\r]/.test(text) || SEPARATORS.test(text) || LEADING_MARKER.test(text)
}

export function parseSkillList(text: string): ParsedSkills {
  const labels: string[] = []
  const found: string[] = []

  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = raw.replace(LEADING_MARKER, '').trim()
    if (!line) continue

    const labelled = LABEL.exec(line)
    if (labelled) {
      labels.push(labelled[1].trim())
      line = labelled[2].trim()
      if (!line) continue
    }

    for (const part of line.split(SEPARATORS)) {
      // Trailing punctuation is sentence residue, not part of the name. Only
      // the tail is trimmed, so ".NET" and "Node.js" survive intact.
      const skill = part.trim().replace(/[.,;]+$/, '').trim()
      if (skill) found.push(skill)
    }
  }

  // Case-insensitive dedupe that keeps the first spelling seen.
  const seen = new Set<string>()
  const skills = found.filter((s) => {
    const key = s.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // A category is lifted only when the paste named exactly one. Several labels
  // means the blob spans categories, and guessing which of them owns this group
  // would be worse than leaving the choice to the author.
  return { category: labels.length === 1 ? labels[0] : undefined, skills }
}
