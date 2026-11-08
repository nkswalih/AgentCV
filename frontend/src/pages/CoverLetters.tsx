/**
 * Cover Letters -- placeholder section. The shell and empty state exist so the
 * feature lands into a home that already knows where it lives.
 */

import { MailIcon } from '../editor/icons'

export function CoverLetters() {
  return (
    <div className="dash">
      <div className="dash-inner">
        <header className="page-head">
          <h1 className="page-title">Cover Letters</h1>
          <p className="page-sub">
            One tailored letter per application, drafted from the resume it matches.
          </p>
        </header>

        <div className="empty">
          <MailIcon />
          <h2 className="empty-title">No cover letters yet</h2>
          <p className="hint">
            Coming soon: pick a resume, name the role, and draft a letter that reuses
            your strongest lines.
          </p>
        </div>
      </div>
    </div>
  )
}
