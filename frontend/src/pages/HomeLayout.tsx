/**
 * The signed-in shell: a floating, warm sidebar card on the left and the active
 * section on the right. Resume, Cover Letters and Job Track are the three
 * pillars of a job hunt, so they stay visible even as the shell gets out of
 * their way.
 */

import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { ChevronDown, LogoMark, UserIcon } from '../editor/icons'

const NAV = [
  { to: '/', label: 'Resume', end: true },
  { to: '/cover-letters', label: 'Cover Letter' },
  { to: '/job-track', label: 'Job Tracker' },
]

export function HomeLayout() {
  return <HomeShell />
}

function HomeShell() {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  // The "More" disclosure behaves like every other popover: any outside click
  // or Escape closes it.
  useEffect(() => {
    if (!moreOpen) return
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  return (
    <div className="home-shell">
      <aside className="home-side">
        <NavLink className="side-brand" to="/" aria-label="AgentCV home">
          <LogoMark />
          <span>agentcv</span>
        </NavLink>

        <nav className="side-nav" aria-label="Sections">
          {NAV.map(({ to, label, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={rest.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <span className="side-divider" aria-hidden="true" />

        <div className="side-more" ref={moreRef}>
          <button
            type="button"
            className="side-more-btn"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            onClick={() => setMoreOpen((v) => !v)}
          >
            More
            <ChevronDown />
          </button>
          {moreOpen && (
            <div className="side-more-menu" role="menu">
              <Link role="menuitem" to="/new" onClick={() => setMoreOpen(false)}>
                Templates
              </Link>
            </div>
          )}
        </div>

        <div className="side-foot">
          <button type="button" className="side-link side-account" title="Coming soon">
            <span className="avatar" aria-hidden="true">
              <UserIcon />
            </span>
            My account
          </button>
        </div>
      </aside>

      <main className="home-main">
        <Outlet />
      </main>
    </div>
  )
}
