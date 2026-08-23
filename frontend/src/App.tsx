import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { Dashboard } from './pages/Dashboard'
import { Editor } from './pages/Editor'
import { Print } from './pages/Print'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/resume/:id" element={<Editor />} />
        {/* Chromium loads this route to produce the PDF. It renders the page
            and nothing else -- no chrome, no scaling, no placeholders. */}
        <Route path="/print/:id" element={<Print />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
