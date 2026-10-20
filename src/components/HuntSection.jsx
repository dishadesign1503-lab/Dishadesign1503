import { CATEGORIES, LANDMARKS } from '../lib/landmarks.js'
import { BANDS, COLD_M, FOUND_M, HOT_M } from '../lib/hunt.js'
import { ALERT_M, GLOW_START_M } from '../lib/nearBuildings.js'

const SOURCES = [
  { key: 'off', label: 'Off' },
  { key: 'gps', label: 'My location' },
  { key: 'sim', label: 'Test walk' },
]

function GpsMessage({ gps }) {
  switch (gps.state) {
    case 'insecure':
      return <p className="warn">Location only works on a secure page (https or localhost). Use Test walk instead.</p>
    case 'unsupported':
      return <p className="warn">This browser has no location service. Use Test walk instead.</p>
    case 'waiting':
      return <p className="note">Waiting for your position… Your browser may ask for permission.</p>
    case 'denied':
      return (
        <p className="warn">
          Location permission was refused. Allow location for this site in the browser's settings and choose My location again, or use Test walk.
        </p>
      )
    case 'unavailable':
      return <p className="warn">Your position can't be found right now. Still trying… Outdoors with a clear sky works best.</p>
    case 'timeout':
      return <p className="warn">No GPS fix yet. Still trying…</p>
    case 'outside':
      return (
        <p className="warn">
          You are about {gps.km.toFixed(1)} km from the map area, which covers central Weimar only. Use Test walk to try it from here.
        </p>
      )
    case 'ok':
      return <p className="note">Following your position, accurate to about {Math.round(gps.accuracy)} m.</p>
    default:
      return null
  }
}

export function Badge({ category }) {
  const c = CATEGORIES[category]
  return (
    <span className="badge" style={{ '--c': c.color }}>
      {c.icon} {c.label}
    </span>
  )
}

// 15 small segments in the category colours, filled as landmarks are discovered.
function Progress({ discovered }) {
  return (
    <div className="progress">
      <div className="progress-bar" aria-hidden="true">
        {LANDMARKS.map((l) => (
          <span key={l.id} style={{ '--c': l.color }} className={discovered.includes(l.id) ? 'done' : ''} />
        ))}
      </div>
      <p className="progress-label">
        Landmark {discovered.length} of {LANDMARKS.length} Discovered{discovered.length ? '!' : ''}
      </p>
    </div>
  )
}

// One clue at a time, with arrows to page through the others.
function ClueCarousel({ hunt, index, onIndex, current, onNextClue }) {
  const l = LANDMARKS[index]
  const done = hunt.discovered.includes(l.id)
  const locked = hunt.mode === 'ordered' && !done && current && l.id !== current.id
  const isWaiting = hunt.waiting === l.id
  const step = (k) => onIndex((index + k + LANDMARKS.length) % LANDMARKS.length)
  return (
    <div className={`clue ${done ? 'solved' : ''}`} style={{ '--c': done || !locked ? l.color : '#a8a69f' }}>
      <div className="clue-head">
        <button onClick={() => step(-1)} aria-label="Previous clue">
          ‹
        </button>
        <span className="clue-title">
          Clue {index + 1} of {LANDMARKS.length}
          {current && l.id === current.id && hunt.mode === 'ordered' && !isWaiting ? ' · current' : ''}
        </span>
        <button onClick={() => step(1)} aria-label="Next clue">
          ›
        </button>
      </div>
      {locked ? (
        <p className="locked">🔒 Locked. Discover the current landmark to unlock this clue.</p>
      ) : (
        <>
          <Badge category={l.category} />
          <p>{l.clue}</p>
          {done && (
            <p className="clue-solved">
              ✓ Discovered: <strong>{l.name}</strong>
            </p>
          )}
          {isWaiting && (
            <button className="next-clue" onClick={onNextClue}>
              Unlock the next clue →
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function HuntSection(props) {
  const { hunt, onMode, current, clueIndex, onClueIndex, onNextClue, onRestart, proximity } = props
  const { hiddenCategories, onToggleCategory, onFocus } = props
  const { source, onSource, gps, clickToWalk, onClickToWalk, follow, onFollow, buildingAlerts, onBuildingAlerts } = props
  const finished = hunt.discovered.length >= LANDMARKS.length
  const band = proximity && BANDS[proximity.band]
  const found = LANDMARKS.filter((l) => hunt.discovered.includes(l.id))

  return (
    <section className="hunt">
      <h2>Weimar Historic &amp; Cultural Treasure Hunt</h2>
      <div className="modes" role="radiogroup" aria-label="Hunt mode">
        {[
          ['ordered', 'Ordered hunt'],
          ['free', 'Free explore'],
        ].map(([key, label]) => (
          <button key={key} role="radio" aria-checked={hunt.mode === key} className={hunt.mode === key ? 'on' : ''} onClick={() => onMode(key)}>
            {label}
          </button>
        ))}
      </div>
      <Progress discovered={hunt.discovered} />

      {finished ? (
        <div className="clue all-done">
          <p className="clue-title">All {LANDMARKS.length} discovered!</p>
          <p>From the station to the Bauhaus, you have walked through Weimar’s history and culture.</p>
          <button className="link" onClick={onRestart}>
            Start the hunt again
          </button>
        </div>
      ) : (
        <ClueCarousel hunt={hunt} index={clueIndex} onIndex={onClueIndex} current={current} onNextClue={onNextClue} />
      )}

      {!finished && band && !hunt.waiting && (
        <p className="temperature" style={{ '--c': proximity.color }}>
          <span className="temp-dot" />
          <strong>{band.label}</strong> · {Math.round(proximity.distance)} m
          {hunt.mode === 'free' && <span className="temp-what"> to the nearest {CATEGORIES[proximity.landmark.category].short.toLowerCase()} spot</span>}
        </p>
      )}
      <p className="note">
        The ghost glows cyan when cold, purple to gold from {COLD_M} m, coral from {HOT_M} m, and ruby red within {FOUND_M} m.{' '}
        {hunt.mode === 'ordered' ? 'It points to the current clue.' : 'It points to the nearest landmark not yet discovered.'}
      </p>

      <h3>Filter by category</h3>
      <div className="cat-filter">
        {Object.entries(CATEGORIES).map(([key, c]) => {
          const on = !hiddenCategories.includes(key)
          return (
            <button key={key} className={on ? 'on' : ''} style={{ '--c': c.color }} aria-pressed={on} onClick={() => onToggleCategory(key)}>
              {c.icon} {c.short}
            </button>
          )
        })}
      </div>

      <details className="drawer">
        <summary>Discovered landmarks ({found.length})</summary>
        {found.length === 0 && <p className="note">Nothing yet. Discovered landmarks and their history appear here.</p>}
        <ul>
          {found.map((l) => (
            <li key={l.id} style={{ '--c': l.color }}>
              <Badge category={l.category} />
              <strong>{l.name}</strong>
              <p>{l.lore}</p>
              <button className="link" onClick={() => onFocus(l)}>
                Show on map
              </button>
            </li>
          ))}
        </ul>
        {found.length > 0 && !finished && (
          <button className="link" onClick={onRestart}>
            Start the hunt again
          </button>
        )}
      </details>

      <h3>Where is the ghost?</h3>
      <div className="modes" role="radiogroup" aria-label="Position from">
        {SOURCES.map((s) => (
          <button key={s.key} role="radio" aria-checked={s.key === source} className={s.key === source ? 'on' : ''} onClick={() => onSource(s.key)}>
            {s.label}
          </button>
        ))}
      </div>
      {source === 'off' && <p className="note">Choose My location to hunt on foot, or Test walk to try it here.</p>}
      {source === 'gps' && <GpsMessage gps={gps} />}
      {source === 'sim' && (
        <>
          <p className="note">Use the Test walk / Teleport bar at the bottom right to reach any landmark.</p>
          <label className="check">
            <input type="checkbox" checked={clickToWalk} onChange={(e) => onClickToWalk(e.target.checked)} />
            Click the map to walk there
            <small>Off: a click starts the walking reach instead.</small>
          </label>
        </>
      )}
      {source !== 'off' && (
        <>
          <label className="check">
            <input type="checkbox" checked={follow} onChange={(e) => onFollow(e.target.checked)} />
            Follow the ghost with the camera
          </label>
          <label className="check">
            <input type="checkbox" checked={buildingAlerts} onChange={(e) => onBuildingAlerts(e.target.checked)} />
            Building alerts
            <small>
              A red-orange glow at the nearest facade within {GLOW_START_M} m, and its use, floors and height within {ALERT_M} m. In the old town
              that is most of the time.
            </small>
          </label>
        </>
      )}
    </section>
  )
}
