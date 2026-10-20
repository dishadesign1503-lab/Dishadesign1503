import { useState } from 'react'
import { CATEGORIES, LANDMARKS } from '../lib/landmarks.js'

// The "Test walk / Teleport" bar: pick any of the 15 landmarks and walk or jump there,
// so every aura can be tried from a desk, or walk up to a nearby building to try the
// building glow and toast.

const SPEEDS = [1, 5, 20]

export default function QuickBar({ landmarks, onWalk, onTeleport, onWalkNearBuilding, walkingTo, playing, onPlaying, speed, onSpeed }) {
  const [id, setId] = useState(LANDMARKS[0].id)
  const chosen = landmarks.find((l) => l.id === id)
  return (
    <div className="quickbar" role="toolbar" aria-label="Test walk and teleport">
      <div className="quickbar-row">
        <strong>Test walk / Teleport</strong>
        <select value={id} onChange={(e) => setId(e.target.value)} style={{ '--c': chosen.color }} aria-label="Landmark">
          {Object.entries(CATEGORIES).map(([key, c]) => (
            <optgroup key={key} label={`${c.icon} ${c.label}`}>
              {landmarks
                .filter((l) => l.category === key)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="quickbar-row">
        <button className="go" style={{ '--c': chosen.color }} onClick={() => onWalk(chosen)}>
          Walk there
        </button>
        <button className="go" style={{ '--c': chosen.color }} onClick={() => onTeleport(chosen)}>
          Teleport
        </button>
        <button onClick={() => onPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button>
        <div className="seg">
          {SPEEDS.map((v) => (
            <button key={v} className={v === speed ? 'on' : ''} onClick={() => onSpeed(v)}>
              {v}×
            </button>
          ))}
        </div>
      </div>
      <div className="quickbar-row">
        <button className="go building" onClick={onWalkNearBuilding}>
          🏠 Simulate walk near building
        </button>
      </div>
      {walkingTo && <p className="quickbar-status">Walking to {walkingTo}…</p>}
    </div>
  )
}
