import { useLabel } from '../lib/colors.js'
import { MINUTES } from '../lib/settings.js'

const n0 = (v) => Math.round(v).toLocaleString('en-US')
const n1 = (v) => v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const n2 = (v) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Row({ label, children }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  )
}

function BuildingCard({ b, level }) {
  const uses = Object.entries(b.floorArea).sort((a, c) => c[1] - a[1])
  return (
    <>
      <h2>Building {b.id}</h2>
      <dl>
        <Row label="Main use">{useLabel(b.use)}</Row>
        <Row label="Height">{n1(b.height)} m</Row>
        <Row label="Floors">{b.floors}</Row>
        <Row label="Footprint">{n0(b.footprint)} m²</Row>
        <Row label="Floor area">{n0(b.totalFloorArea)} m²</Row>
        <Row label="Density">{n1(b.density)} m² floor area per m² footprint</Row>
        {level != null && <Row label="Walk">{level >= 0 ? `within ${MINUTES[level]} min` : 'beyond 15 min'}</Row>}
      </dl>
      {uses.length > 0 && (
        <>
          <h3>Floor area by use (estimate)</h3>
          <dl>
            {uses.map(([use, m2]) => (
              <Row key={use} label={useLabel(use)}>
                {n0(m2)} m²
              </Row>
            ))}
          </dl>
        </>
      )}
    </>
  )
}

function CellCard({ c }) {
  const uncertain = new Set(c.uncertain ?? [])
  const v = (key, text) => (c[key] == null ? <em>no figure</em> : uncertain.has(key) ? `${text} (uncertain)` : text)
  return (
    <>
      <h2>Census square, 100 × 100 m</h2>
      <dl>
        <Row label="Residents">{v('population', n0(c.population ?? 0))}</Row>
        <Row label="Average age">{v('avg_age', `${n1(c.avg_age ?? 0)} years`)}</Row>
        <Row label="Rent">{v('rent_eur_m2', `${n2(c.rent_eur_m2 ?? 0)} € per m² per month`)}</Row>
        <Row label="Empty flats">{v('vacancy_pct', `${n1(c.vacancy_pct ?? 0)} %`)}</Row>
        <Row label="Main heating">{v('heating_main', c.heating_main)}</Row>
      </dl>
      <p className="note">
        Zensus 2022, cell {c.id}. Small counts are changed slightly at random to protect privacy, so single squares are approximate. Rent is net, without
        heating and service charges.
      </p>
    </>
  )
}

export default function InfoCard({ data, selected, reach, onClose }) {
  if (!selected) return null
  return (
    <aside className="card">
      <button className="close" onClick={onClose} aria-label="Close">
        ×
      </button>
      {selected.type === 'building' && (
        <BuildingCard b={data.buildings[selected.index]} level={reach ? reach.level[selected.index] : null} />
      )}
      {selected.type === 'cell' && <CellCard c={data.cells[selected.index]} />}
      {selected.type === 'nocell' && (
        <>
          <h2>No census square here</h2>
          <p className="note">The Zensus 2022 file only has squares where the census lists residents, flats or residential buildings.</p>
        </>
      )}
    </aside>
  )
}
