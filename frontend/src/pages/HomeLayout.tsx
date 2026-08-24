/**
 * The signed-in shell: sidebar navigation on the left, the active section on
 * the right. Resume, Cover Letters and Job Track are the three pillars of a
 * job hunt -- the nav makes that structure visible even before the latter two
 * earn real features.
 */

import { NavLink, Outlet } from 'react-router-dom'

import { TemplatePickerProvider, useTemplatePicker } from '../components/TemplatePicker'
import { BriefcaseIcon, FileIcon, MailIcon, Plus } from '../editor/icons'

const NAV = [
  { to: '/', label: 'Resume', icon: FileIcon, end: true },
  { to: '/cover-letters', label: 'Cover Letter', icon: MailIcon },
  { to: '/job-track', label: 'Job Track', icon: BriefcaseIcon },
]

export function HomeLayout() {
  // The provider must wrap the shell that reads the picker, so the shell
  // itself lives one level down.
  return (
    <TemplatePickerProvider>
      <HomeShell />
    </TemplatePickerProvider>
  )
}

function HomeShell() {
  const picker = useTemplatePicker()

  return (
    <div className="home-shell">
      <aside className="home-side">
        <span className="wordmark side-brand">
          <span className="regmark" aria-hidden="true" />
          AgentCV
        </span>

        <button className="btn btn-primary side-cta" onClick={picker.open}>
          <Plus />
          New resume
        </button>

        <nav className="side-nav" aria-label="Sections">
          {NAV.map(({ to, label, icon: Icon, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={rest.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="side-foot">
          <p className="hint">Every change saves as you type.</p>
        </div>
      </aside>

      <main className="home-main">
        <Outlet />
      </main>
    </div>
  )
}
