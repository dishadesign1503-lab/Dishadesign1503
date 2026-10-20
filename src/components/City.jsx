import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  EdgesGeometry,
  Path,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three'
import { buildBuildingGeometry, paintBuildings } from '../lib/buildingMesh.js'
import { MODES, NO_FIGURE, OUTSIDE, PARK, PARK_EDGE, REACH, STREET, SURFACE } from '../lib/colors.js'
import Ghost from './Ghost.jsx'
import Landmarks from './Landmarks.jsx'

// Ground layers are flat shapes lifted a little apart and drawn in a fixed order,
// so they never flicker against each other.
const FLAT = [-Math.PI / 2, 0, 0] // shape x/y (east/north) -> scene x/-z
const noRaycast = () => null

const toShape = ({ outer, holes }) => {
  const s = new Shape(outer.map(([x, y]) => ({ x, y })))
  for (const h of holes) s.holes.push(new Path(h.map(([x, y]) => ({ x, y }))))
  return s
}
const polysToShapes = (polys) => polys.map(([outer, ...holes]) => toShape({ outer, holes }))

function hatchTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 16
  const g = c.getContext('2d')
  g.fillStyle = SURFACE
  g.fillRect(0, 0, 16, 16)
  g.strokeStyle = NO_FIGURE
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(-4, 20)
  g.lineTo(20, -4)
  g.moveTo(-4, 4)
  g.lineTo(4, -4)
  g.moveTo(12, 20)
  g.lineTo(20, 12)
  g.stroke()
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(1 / 8, 1 / 8) // one stripe every 8 m
  t.colorSpace = SRGBColorSpace
  return t
}

function Ground({ bounds, onClick }) {
  const w = bounds.x1 - bounds.x0
  const h = bounds.y1 - bounds.y0
  const cx = (bounds.x0 + bounds.x1) / 2
  const cy = (bounds.y0 + bounds.y1) / 2
  return (
    <>
      <mesh rotation={FLAT} position={[cx, -0.5, -cy]} renderOrder={-5} raycast={noRaycast}>
        <planeGeometry args={[w * 6, h * 6]} />
        <meshBasicMaterial color={OUTSIDE} depthWrite={false} />
      </mesh>
      <mesh
        rotation={FLAT}
        position={[cx, 0, -cy]}
        renderOrder={-4}
        onClick={(e) => {
          if (e.delta > 4) return // that was a drag, not a click
          onClick([e.point.x, -e.point.z])
        }}
      >
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={SURFACE} depthWrite={false} />
      </mesh>
    </>
  )
}

function Streets({ lines }) {
  const geometry = useMemo(() => {
    const pos = []
    for (const line of lines)
      for (let i = 1; i < line.length; i++) {
        pos.push(line[i - 1][0], 1, -line[i - 1][1], line[i][0], 1, -line[i][1])
      }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
    return g
  }, [lines])
  return (
    <lineSegments geometry={geometry} renderOrder={1} raycast={noRaycast}>
      <lineBasicMaterial color={STREET} transparent opacity={0.9} depthWrite={false} />
    </lineSegments>
  )
}

function Buildings({ buildings, mode, level, onPick }) {
  const { geometry, owner } = useMemo(() => buildBuildingGeometry(buildings), [buildings])
  useEffect(() => {
    paintBuildings(geometry, owner, buildings.length, (i) =>
      level && level[i] >= 0 ? REACH[level[i]] : mode.building(buildings[i]),
    )
  }, [geometry, owner, buildings, mode, level])
  return (
    <mesh
      geometry={geometry}
      onClick={(e) => {
        e.stopPropagation()
        if (e.delta > 4) return
        onPick(owner[e.faceIndex * 3])
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <meshLambertMaterial vertexColors side={DoubleSide} />
    </mesh>
  )
}

// Parks, gardens and cemeteries in green, with a darker edge, just above the ground.
function Parks({ polys }) {
  const fill = useMemo(() => new ShapeGeometry(polysToShapes(polys)), [polys])
  const edges = useMemo(() => outlineGeometry(polys.flat(), 0.2), [polys])
  return (
    <>
      <mesh geometry={fill} rotation={FLAT} position={[0, 0.15, 0]} renderOrder={-3.5} raycast={noRaycast}>
        <meshBasicMaterial color={PARK} transparent opacity={0.75} depthWrite={false} side={DoubleSide} />
      </mesh>
      <lineSegments geometry={edges} renderOrder={-3.4} raycast={noRaycast}>
        <lineBasicMaterial color={PARK_EDGE} transparent depthWrite={false} />
      </lineSegments>
    </>
  )
}

// "Show on map": glide the view to a point, keeping the camera angle.
function CameraFocus({ focus }) {
  const goal = useRef(null)
  const step = useMemo(() => new Vector3(), [])
  useEffect(() => {
    if (focus) goal.current = new Vector3(focus.xy[0], 0, -focus.xy[1])
  }, [focus])
  useFrame((state, delta) => {
    if (!goal.current || !state.controls) return
    step.copy(goal.current).sub(state.controls.target)
    if (step.length() < 1) return (goal.current = null)
    step.multiplyScalar(1 - Math.exp(-Math.min(delta, 0.1) * 4))
    state.controls.target.add(step)
    state.camera.position.add(step)
  })
  return null
}

function CensusCells({ cells, mode }) {
  const geometries = useMemo(() => cells.map((c) => new ShapeGeometry(polysToShapes(c.polys))), [cells])
  const hatch = useMemo(hatchTexture, [])
  return geometries.map((g, i) => {
    const color = mode.cell(cells[i])
    return (
      <mesh key={i} geometry={g} rotation={FLAT} position={[0, 0.3, 0]} renderOrder={-3} raycast={noRaycast}>
        {color ? (
          <meshBasicMaterial color={color} depthWrite={false} side={DoubleSide} />
        ) : (
          <meshBasicMaterial map={hatch} depthWrite={false} side={DoubleSide} />
        )}
      </mesh>
    )
  })
}

// Outline line pieces for flat shapes, lifted to height y.
function outlineGeometry(rings, y) {
  const pos = []
  for (const ring of rings)
    for (let i = 0; i < ring.length; i++) {
      const [ax, ay] = ring[i]
      const [bx, by] = ring[(i + 1) % ring.length]
      pos.push(ax, y, -ay, bx, y, -by)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  return g
}

// Filled areas normally; only outlines when the census squares already colour the ground.
function ReachAreas({ reach, outline }) {
  const fills = useMemo(() => reach.rings.map((shapes) => new ShapeGeometry(shapes.map(toShape))), [reach])
  const lines = useMemo(
    () => reach.rings.map((shapes) => outlineGeometry(shapes.flatMap((s) => [s.outer, ...s.holes]), 0.8)),
    [reach],
  )
  const [sx, sy] = reach.start
  return (
    <>
      {outline
        ? lines.map((g, i) => (
            <lineSegments key={i} geometry={g} renderOrder={1} raycast={noRaycast}>
              <lineBasicMaterial color={REACH[i]} transparent depthWrite={false} />
            </lineSegments>
          ))
        : fills.map((g, i) => (
            <mesh key={i} geometry={g} rotation={FLAT} position={[0, 0.6, 0]} renderOrder={-2} raycast={noRaycast}>
              <meshBasicMaterial color={REACH[i]} transparent opacity={0.5} depthWrite={false} side={DoubleSide} />
            </mesh>
          ))}
      <mesh position={[sx, 4, -sy]} raycast={noRaycast}>
        <cylinderGeometry args={[4, 4, 8, 24]} />
        <meshLambertMaterial color="#0b0b0b" />
      </mesh>
    </>
  )
}

// A dark outline around whatever is being inspected.
function Selection({ data, selected }) {
  const geometry = useMemo(() => {
    if (!selected) return null
    if (selected.type === 'building') {
      return new EdgesGeometry(buildBuildingGeometry([data.buildings[selected.index]]).geometry, 30)
    }
    if (selected.type === 'cell') return outlineGeometry(data.cells[selected.index].polys.map(([outer]) => outer), 1.2)
    return null
  }, [data, selected])
  if (!geometry) return null
  return (
    <lineSegments geometry={geometry} renderOrder={2} raycast={noRaycast}>
      <lineBasicMaterial color="#0b0b0b" depthTest={false} transparent />
    </lineSegments>
  )
}

export default function City({ data, modeKey, reach, paintReach, selected, onGroundClick, onBuildingClick, tracker, focus }) {
  const mode = MODES.find((m) => m.key === modeKey)
  const { bounds } = data
  return (
    <Canvas flat camera={{ position: [700, 1100, 1500], fov: 35, near: 5, far: 20000 }}>
      <color attach="background" args={[OUTSIDE]} />
      {/* intensities in multiples of pi, so a lit roof shows its legend colour */}
      <ambientLight intensity={Math.PI * 0.62} />
      <directionalLight position={[-400, 1000, 300]} intensity={Math.PI * 0.45} />
      <Ground bounds={bounds} onClick={onGroundClick} />
      <Parks polys={data.parks} />
      {mode.cell && <CensusCells cells={data.cells} mode={mode} />}
      {reach && <ReachAreas reach={reach} outline={!!mode.cell} />}
      <Streets lines={data.streetLines} />
      <Buildings buildings={data.buildings} mode={mode} level={paintReach ? reach?.level : null} onPick={onBuildingClick} />
      <Selection data={data} selected={selected} />
      <Landmarks landmarks={tracker.landmarks} discovered={tracker.discovered} hiddenCategories={tracker.hiddenCategories} />
      <Ghost {...tracker} />
      <CameraFocus focus={focus} />
      <OrbitControls makeDefault target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.2} minDistance={60} maxDistance={6000} />
    </Canvas>
  )
}
