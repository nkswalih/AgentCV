import { useEffect, useRef, useState } from 'react'

import { useEditor } from '../store'
import type { Settings } from '../types'
import { Slider } from './fields'

type PhotoLayout = Settings['photoLayout']

export function PhotoAdjustDialog({ onClose }: { onClose: () => void }) {
  const { doc, updateSettings } = useEditor()
  const [focusX, setFocusX] = useState(doc?.settings.photoLayout.focusX ?? 50)
  const [focusY, setFocusY] = useState(doc?.settings.photoLayout.focusY ?? 50)
  const [zoom, setZoom] = useState(doc?.settings.photoLayout.zoom ?? 1)
  const [dragging, setDragging] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dragging) return
    const move = (event: PointerEvent) => {
      const frame = frameRef.current
      if (!frame) return
      const rect = frame.getBoundingClientRect()
      setFocusX(Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)))
      setFocusY(Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)))
    }
    const stop = () => setDragging(false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop, { once: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
  }, [dragging])

  if (!doc || !doc.basics.photoUrl) return null

  const layout: PhotoLayout = {
    ...doc.settings.photoLayout,
    focusX,
    focusY,
    zoom,
  }

  const save = () => {
    updateSettings({ photoLayout: layout })
    onClose()
  }

  const reset = () => {
    setFocusX(50)
    setFocusY(50)
    setZoom(1)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal photo-adjust-modal" role="dialog" aria-modal="true" aria-labelledby="photo-adjust-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title" id="photo-adjust-title">Adjust photo</h2>
          <button className="btn btn-ghost btn-icon" type="button" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="hint">Drag the image to choose the crop focus. Use zoom to frame the subject.</p>
          <div
            className={`photo-adjust-frame photo-adjust-shape-${layout.shape}`}
            ref={frameRef}
            onPointerDown={() => setDragging(true)}
          >
            <img
              src={doc.basics.photoUrl}
              alt=""
              draggable={false}
              style={{ objectPosition: `${focusX}% ${focusY}%`, transform: `scale(${zoom})`, transformOrigin: `${focusX}% ${focusY}%` }}
            />
          </div>
          <Slider label="Crop zoom" value={zoom} min={1} max={3} step={0.05} unit="×" onChange={setZoom} />
        </div>
        <div className="modal-foot photo-adjust-foot">
          <button className="btn btn-ghost" type="button" onClick={reset}>Reset crop</button>
          <div>
            <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" type="button" onClick={save}>Save crop</button>
          </div>
        </div>
      </div>
    </div>
  )
}
