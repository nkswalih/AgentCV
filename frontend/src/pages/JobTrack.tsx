/**
 * Job Track -- placeholder section for the application pipeline the product is
 * growing towards: every role applied to, and where it stands.
 */

import { BriefcaseIcon } from '../editor/icons'

export function JobTrack() {
  return (
    <div className="dash">
      <div className="dash-inner">
        <header className="page-head">
          <h1 className="page-title">Job Track</h1>
          <p className="page-sub">
            Applications in one board -- applied, interviewing, offered, closed.
          </p>
        </header>

        <div className="empty">
          <BriefcaseIcon />
          <h2 className="empty-title">No tracked roles yet</h2>
          <p className="hint">
            Coming soon: add a role, attach the resume and letter you sent, and watch
            it move across the board.
          </p>
        </div>
      </div>
    </div>
  )
}
