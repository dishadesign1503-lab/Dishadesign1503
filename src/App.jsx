import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import City from './components/City.jsx'
import Panel from './components/Panel.jsx'
import InfoCard from './components/InfoCard.jsx'
import HuntSection from './components/HuntSection.jsx'
import QuickBar from './components/QuickBar.jsx'
import DiscoveryCard from './components/DiscoveryCard.jsx'
import BuildingToast from './components/BuildingToast.jsx'
import { useLabel } from './lib/colors.js'
import { buildBuildingIndex, pickBuildingToVisit } from './lib/nearBuildings.js'
import { cellAt, processKit } from './lib/geo.js'
import { loadHunt, saveHunt, START } from './lib/hunt.js'
import { LANDMARKS } from './lib/landmarks.js'
import { TestWalk } from './lib/sim.js'
import { useGeolocation } from './lib/useGeolocation.js'

// Every data file goes through BASE_URL, so the paths work on localhost and on GitHub Pages.
const FILES = {
  kit: 'kit.json',
  buildings: 'buildings.geojson',
  streets: 'streets.geojson',
  graph: 'streets.graph.json',
  zensus: 'zensus.geojson',
  plots: 'plots.geojson',
}

async function loadKit() {
  const entries = await Promise.all(
    Object.entries(FILES).map(async ([key, file]) => {
      const r = await fetch(`${import.meta.env.BASE_URL}data/${file}`)
      if (!r.ok) throw new Error(`data/${file}: ${r.status}`)
      return [key, await r.json()]
    }),
  )
  return processKit(Object.fromEntries(entries))
}

// Metres from a point to the kit rectangle; 0 inside.
const outsideBy = ({ x0, y0, x1, y1 }, [x, y]) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1))

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [modeKey, setModeKey] = useState('use')
  const [reach, setReach] = useState(null)
  const [status, setStatus] = useState('idle') // idle | working | nostreet
  const [paintReach, setPaintReach] = useState(true) // colour buildings by walk time
  const [selected, setSelected] = useState(null) // { type: 'building' | 'cell' | 'nocell', index }
  const worker = useRef(null)
  const lastRequest = useRef(0)

  // ghost treasure hunt
  const [source, setSource] = useState('off') // off | gps | sim
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(5)
  const [clickToWalk, setClickToWalk] = useState(true)
  const [follow, setFollow] = useState(false)
  const [simTarget, setSimTarget] = useState(null)
  const [proximity, setProximity] = useState(null) // nearest candidate: distance and colour band
  const [hunt, setHunt] = useState(loadHunt) // { mode, discovered: [ids], waiting: id or null }
  const [cards, setCards] = useState([]) // discovery cards still to show, oldest first
  const [clueIndex, setClueIndex] = useState(0)
  const [hiddenCategories, setHiddenCategories] = useState([])
  const [focus, setFocus] = useState(null) // "Show on map"
  const [buildingAlerts, setBuildingAlerts] = useState(true)
  const [toast, setToast] = useState(null) // index of the building in the "Nearby Building" toast
  const toastTiming = useRef({ at: 0, timer: 0 })
  const gpsRef = useRef(null)
  const geo = useGeolocation(source === 'gps')

  useEffect(() => {
    loadKit()
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!data) return
    const w = new Worker(new URL('./lib/reachWorker.js', import.meta.url), { type: 'module' })
    w.postMessage({ type: 'init', graph: data.graph, buildings: data.buildings.map((b) => ({ polys: b.polys })), cells: data.cells })
    w.onmessage = ({ data: msg }) => {
      if (msg.id !== lastRequest.current) return // a newer click is already on its way
      if (msg.result.ok) {
        setReach(msg.result)
        setStatus('idle')
      } else {
        setReach(null)
        setStatus('nostreet')
      }
    }
    worker.current = w
    return () => w.terminate()
  }, [data])

  const landmarks = useMemo(() => (data ? LANDMARKS.map((l) => ({ ...l, xy: data.project(l.lonlat) })) : []), [data])
  const sim = useMemo(() => (data ? new TestWalk(data.graph) : null), [data])
  const buildingIndex = useMemo(() => (data ? buildBuildingIndex(data.buildings) : null), [data])

  // The ghost reports the building within 10 m as it changes. Each toast stays at least
  // 2 s, so walking along a row of houses doesn't make it flicker.
  const onBuilding = useCallback((index) => {
    const tt = toastTiming.current
    clearTimeout(tt.timer)
    const wait = index === null ? 600 : Math.max(0, 2000 - (Date.now() - tt.at))
    tt.timer = setTimeout(() => {
      tt.at = Date.now()
      setToast(index)
    }, wait)
  }, [])
  const walkNearBuilding = () => {
    const pick = pickBuildingToVisit(buildingIndex, data.buildings, data.graph, sim.position)
    if (!pick) return
    const use = data.buildings[pick.index].use
    walkTo(pick.spot, `a nearby building (${use === 'undefined' ? 'unknown use' : useLabel(use)})`)
  }

  // The GPS fix in local metres, or a reason why there is none.
  const gps = useMemo(() => {
    if (geo.status.state !== 'ok' || !geo.coords || !data) return { ...geo.status, xy: null }
    const xy = data.project([geo.coords.longitude, geo.coords.latitude])
    const away = outsideBy(data.bounds, xy)
    if (away > 0) return { state: 'outside', km: away / 1000, xy: null }
    return { state: 'ok', accuracy: geo.coords.accuracy, xy }
  }, [geo, data])
  useEffect(() => {
    gpsRef.current = gps.xy ? { xy: gps.xy, accuracy: gps.accuracy } : null
  }, [gps])

  useEffect(() => saveHunt(hunt), [hunt])
  const byId = (id) => landmarks.find((l) => l.id === id)

  // Ordered hunt: the first landmark in order not yet discovered (or the one just found,
  // until its next clue is unlocked). Free explore: every undiscovered landmark in a shown category.
  const current = hunt.waiting ? byId(hunt.waiting) : (landmarks.find((l) => !hunt.discovered.includes(l.id)) ?? null)
  const candidates = useMemo(() => {
    if (hunt.mode === 'ordered') return current ? [current] : []
    return landmarks.filter((l) => !hunt.discovered.includes(l.id) && !hiddenCategories.includes(l.category))
  }, [hunt, current, landmarks, hiddenCategories])
  useEffect(() => {
    if (current) setClueIndex(landmarks.indexOf(current))
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const onFound = useCallback((id) => {
    setHunt((h) =>
      h.discovered.includes(id) ? h : { ...h, discovered: [...h.discovered, id], waiting: h.mode === 'ordered' ? id : null },
    )
    setCards((c) => (c.includes(id) ? c : [...c, id]))
  }, [])
  const nextClue = () => {
    setHunt((h) => ({ ...h, waiting: null }))
    setCards((c) => c.slice(1))
  }
  const closeCard = () => setCards((c) => c.slice(1))
  const restartHunt = () => {
    setHunt((h) => ({ ...START, mode: h.mode }))
    setCards([])
  }
  const setHuntMode = (mode) => setHunt((h) => ({ ...h, mode, waiting: null }))
  const toggleCategory = (key) =>
    setHiddenCategories((hc) => (hc.includes(key) ? hc.filter((k) => k !== key) : [...hc, key]))

  const walkTo = useCallback(
    (xy, label) => {
      const ok = sim.goTo(xy)
      setSimTarget(ok ? label : null)
      if (ok) setPlaying(true)
    },
    [sim],
  )

  const onGroundClick = useCallback(
    (point) => {
      if (source === 'sim' && clickToWalk) return walkTo(point, 'the point you clicked')
      if (modeKey === 'residents') {
        const i = data.cells.indexOf(cellAt(data.cells, point))
        setSelected(i >= 0 ? { type: 'cell', index: i } : { type: 'nocell' })
      } else setSelected(null)
      setStatus('working')
      worker.current?.postMessage({ type: 'reach', id: ++lastRequest.current, point })
    },
    [data, modeKey, source, clickToWalk, walkTo],
  )

  const onBuildingClick = useCallback((index) => setSelected({ type: 'building', index }), [])
  const onArrive = useCallback(() => setSimTarget(null), [])

  const onMode = (key) => {
    setModeKey(key)
    if (selected && selected.type !== 'building' && key !== 'residents') setSelected(null)
  }

  const onSource = (key) => {
    setSource(key)
    if (source === 'off' && key !== 'off' && modeKey === 'use') setModeKey('plain') // let the hunt colours stand out
    if (key !== 'sim') {
      sim.stop()
      setSimTarget(null)
    }
  }

  const clearWalk = () => {
    lastRequest.current++
    setReach(null)
    setStatus('idle')
  }

  if (error) return <p className="fullmessage error">The city kit didn't load ({error}).</p>
  if (!data) return <p className="fullmessage">Loading the city kit…</p>

  return (
    <div className="app">
      <City
        data={data}
        modeKey={modeKey}
        reach={reach}
        paintReach={paintReach}
        selected={selected}
        onGroundClick={onGroundClick}
        onBuildingClick={onBuildingClick}
        tracker={{
          source,
          sim,
          gpsRef,
          playing,
          speed,
          follow,
          landmarks,
          candidates,
          canDiscover: !hunt.waiting,
          discovered: hunt.discovered,
          hiddenCategories,
          buildings: data.buildings,
          buildingIndex,
          buildingAlerts,
          onBuilding,
          onProximity: setProximity,
          onFound,
          onArrive,
        }}
        focus={focus}
      />
      <Panel
        modeKey={modeKey}
        onMode={onMode}
        reach={reach}
        status={status}
        paintReach={paintReach}
        onPaintReach={setPaintReach}
        onClear={clearWalk}
      >
        <HuntSection
          hunt={hunt}
          onMode={setHuntMode}
          current={current}
          clueIndex={clueIndex}
          onClueIndex={setClueIndex}
          onNextClue={nextClue}
          onRestart={restartHunt}
          proximity={proximity}
          hiddenCategories={hiddenCategories}
          onToggleCategory={toggleCategory}
          onFocus={(l) => setFocus({ xy: byId(l.id).xy, at: Date.now() })}
          source={source}
          onSource={onSource}
          gps={gps}
          clickToWalk={clickToWalk}
          onClickToWalk={setClickToWalk}
          follow={follow}
          onFollow={setFollow}
          buildingAlerts={buildingAlerts}
          onBuildingAlerts={setBuildingAlerts}
        />
      </Panel>
      <InfoCard data={data} selected={selected} reach={reach} onClose={() => setSelected(null)} />
      {source === 'sim' && (
        <QuickBar
          landmarks={landmarks}
          onWalk={(l) => walkTo(l.xy, l.name)}
          onTeleport={(l) => {
            sim.jumpTo(l.xy)
            setSimTarget(null)
          }}
          onWalkNearBuilding={walkNearBuilding}
          walkingTo={simTarget}
          playing={playing}
          onPlaying={setPlaying}
          speed={speed}
          onSpeed={setSpeed}
        />
      )}
      {buildingAlerts && <BuildingToast building={toast === null ? null : data.buildings[toast]} />}
      <DiscoveryCard
        landmark={byId(cards[0])}
        count={hunt.discovered.length}
        ordered={hunt.mode === 'ordered' && hunt.waiting === cards[0]}
        more={cards.length > 1}
        onNext={nextClue}
        onClose={closeCard}
      />
      <p className="attribution">
        Buildings: 3D building models LoD2 © GDI-Th (dl-de/by-2-0). Land use and pedestrian network: Egor Gaydukov, InfAU, Bauhaus-Universität Weimar.
        Census grid: Zensus 2022, © Statistische Ämter des Bundes und der Länder (dl-de/by-2-0).
      </p>
    </div>
  )
}
