import { MODES, PARK, REACH } from '../lib/colors.js'
import { BAND_M, MAX_SNAP_M, WALK_SPEED_M_PER_MIN } from '../lib/settings.js'

function Swatch({ color, hatch }) {
  return <span className={hatch ? 'swatch hatch' : 'swatch'} style={{ '--c': color }} />
}

const fmt = (n) => n.toLocaleString('en-US')

export default function Panel({ modeKey, onMode, reach, status, paintReach, onPaintReach, onClear, children }) {
  const mode = MODES.find((m) => m.key === modeKey)
  return (
    <aside className="panel">
      <h1>Walking reach in central Weimar</h1>
      <p className="hint">Click the ground to start a walk. Click a building to inspect it. Drag to orbit, right-drag to pan, scroll to zoom.</p>

      {children}

      <section>
        <h2>Colour by</h2>
        <div className="modes" role="radiogroup" aria-label="Colour by">
          {MODES.map((m) => (
            <button key={m.key} role="radio" aria-checked={m.key === modeKey} className={m.key === modeKey ? 'on' : ''} onClick={() => onMode(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
        <h3>{mode.title}</h3>
        <ul className="legend">
          {mode.legend.map((item) => (
            <li key={item.label}>
              <Swatch color={item.color} hatch={item.hatch} />
              <span>
                {item.label}
                {item.detail && <small>{item.detail}</small>}
              </span>
            </li>
          ))}
        </ul>
        <ul className="legend park-legend">
          <li>
            <Swatch color={PARK} />
            <span>
              Parks, gardens and cemeteries
              <small>land use “recreation” and “cemetery” in plots.geojson</small>
            </span>
          </li>
        </ul>
        {mode.note && <p className="note">{mode.note}</p>}
      </section>

      <section>
        <h2>Walking reach</h2>
        {status === 'working' && <p className="note">Walking…</p>}
        {status === 'nostreet' && <p className="warn">No walkable street within {MAX_SNAP_M} m of this point. Click closer to a street.</p>}
        {!reach && status !== 'working' && status !== 'nostreet' && <p className="note">No walk yet. Click the ground to start one.</p>}
        {reach && (
          <>
            <table className="reach">
              <thead>
                <tr>
                  <th />
                  <th>Walk</th>
                  <th>Buildings</th>
                  <th>Residents</th>
                </tr>
              </thead>
              <tbody>
                {reach.stats.map((s, i) => (
                  <tr key={s.minutes}>
                    <td>
                      <Swatch color={REACH[i]} />
                    </td>
                    <td>{s.minutes} min</td>
                    <td>{fmt(s.buildings)}</td>
                    <td>
                      ≈ {fmt(s.residents)}
                      {s.missing > 0 && (
                        <small>
                          {s.missing} {s.missing === 1 ? 'cell' : 'cells'} without a figure left out
                        </small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="note">Start: the nearest street junction, {Math.round(reach.snapDistance)} m from your click.</p>
            <label className="check">
              <input type="checkbox" checked={paintReach} onChange={(e) => onPaintReach(e.target.checked)} />
              Colour buildings by walk time
              <small>Turn off to see the colour layer above together with the walk areas.</small>
            </label>
            <button className="link" onClick={onClear}>
              Clear the walk
            </button>
          </>
        )}
      </section>

      <section className="method">
        <h2>How it is worked out</h2>
        <ul>
          <li>
            Walking speed {(WALK_SPEED_M_PER_MIN * 60) / 1000} km/h, which is {WALK_SPEED_M_PER_MIN} m per minute, along the pedestrian network only. The
            walk starts at the nearest junction within {MAX_SNAP_M} m.
          </li>
          <li>
            Each area is the street pieces reached in that time, including the reachable part of the last street, with a band of {BAND_M} m on each side,
            joined into one shape. A building counts if it touches the area.
          </li>
          <li>
            Residents come from the Zensus 2022 100 m squares: each square's residents times the share of the square inside the area, added up and rounded
            to the nearest 10.
          </li>
          <li>Squares where the census published no resident count are not zero. They are left out of the sum and counted next to it.</li>
        </ul>
      </section>
    </aside>
  )
}
