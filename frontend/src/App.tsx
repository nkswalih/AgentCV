import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom'

import { CoverLetters } from './pages/CoverLetters'
import { Dashboard } from './pages/Dashboard'
import { Editor } from './pages/Editor'
import { HomeLayout } from './pages/HomeLayout'
import { JobTrack } from './pages/JobTrack'
import { Print } from './pages/Print'

/** `/new` was a page before the flow became a dialog. Keep the link alive. */
function OldNewRoute() {
  const [params] = useSearchParams()
  const query = params.toString()
  return <Navigate to={query ? `/?${query}` : '/'} replace />
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<HomeLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<OldNewRoute />} />
          <Route path="/cover-letters" element={<CoverLetters />} />
          <Route path="/job-track" element={<JobTrack />} />
        </Route>
        <Route path="/resume/:id" element={<Editor />} />
        {/* Chromium loads this route to produce the PDF. It renders the page
            and nothing else -- no chrome, no scaling, no placeholders. */}
        <Route path="/print/:id" element={<Print />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
