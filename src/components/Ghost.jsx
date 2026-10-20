import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, Color, DoubleSide, SRGBColorSpace, Vector3 } from 'three'
import { BANDS, bandOf, FOUND_M, spectrum } from '../lib/hunt.js'
import { ALERT_M, GLOW_FULL_M, GLOW_START_M, nearestBuilding } from '../lib/nearBuildings.js'

// The ghost avatar: moves every frame inside useFrame, without React re-renders.
// Its glow colour follows the distance to the nearest landmark still to find ("hot & cold"),
// it sends concentric rings when hot, and bursts into golden sparkles on a discovery.
// All glows stay at 0.2–0.35 opacity so the city underneath stays readable; the body
// takes a light tint of the same colour so the temperature reads at a glance.

const FLAT = [-Math.PI / 2, 0, 0]
const noRaycast = () => null
const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const RINGS = 3
const SPARKS = 70
const SPARK_SECONDS = 1.8
const GOLD = [new Color('#ffd600'), new Color('#ffe98a'), new Color('#ffb700')]
const FACADE = '#ff6a3d' // red-orange glow at the base of the nearest building

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

// Sparkle burst: random outward and upward speeds, mostly gold with some of the landmark colour.
function sparkBurst(themeColor) {
  const vel = new Float32Array(SPARKS * 3)
  const col = new Float32Array(SPARKS * 3)
  const theme = new Color(themeColor)
  for (let i = 0; i < SPARKS; i++) {
    const a = Math.random() * Math.PI * 2
    const out = 0.4 + Math.random() * 0.8
    vel.set([Math.cos(a) * out, 0.5 + Math.random(), Math.sin(a) * out], i * 3)
    const c = i % 4 === 3 ? theme : GOLD[i % 3]
    col.set([c.r, c.g, c.b], i * 3)
  }
  return { vel, col }
}

export default function Ghost(props) {
  // candidates: the landmarks the glow can point to; canDiscover: false while a find waits
  const { source, sim, gpsRef, playing, speed, follow, candidates, canDiscover, discovered, onProximity, onFound, onArrive } = props
  // buildings: the red-orange glow at the nearest facade, and the toast within ALERT_M
  const { buildings, buildingIndex, buildingAlerts, onBuilding } = props
  const group = useRef()
  const float = useRef()
  const glow = useRef()
  const rings = useRef([])
  const accuracy = useRef()
  const sparks = useRef()
  const body = useRef([])
  const facade = useRef()
  const nearBuilding = useRef(null) // building index within ALERT_M, as last told to the page
  const shown = useRef(null) // smoothed position on screen
  const sent = useRef({ key: '', time: 0, distance: 0 })
  const found = useRef({ at: -Infinity, color: '#ffd600' }) // the latest discovery
  const reported = useRef(new Set()) // finds already sent, until the page has caught up
  const texture = useMemo(glowTexture, [])
  const [burstColor, setBurstColor] = useState('#ffd600')
  const burst = useMemo(() => sparkBurst(burstColor), [burstColor])
  useEffect(() => reported.current.clear(), [discovered])
  const tmp = useMemo(() => ({ color: new Color(), goal: new Vector3() }), [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1)
    const t = state.clock.elapsedTime

    let pos = null
    let acc = 0
    if (source === 'sim') {
      if (playing && sim.walking && sim.step(dt, speed)) onArrive()
      pos = sim.position
    } else if (source === 'gps' && gpsRef.current) {
      pos = gpsRef.current.xy
      acc = gpsRef.current.accuracy
    }

    if (!pos) {
      group.current.visible = false
      shown.current = null
      if (sent.current.key !== 'none') {
        sent.current.key = 'none'
        onProximity(null)
      }
      if (nearBuilding.current !== null) onBuilding((nearBuilding.current = null))
      return
    }
    group.current.visible = true

    // Glide toward GPS fixes instead of jumping; the test walk is already smooth.
    if (!shown.current || source === 'sim') shown.current = [...pos]
    else {
      const k = 1 - Math.exp(-dt * 4)
      shown.current[0] += (pos[0] - shown.current[0]) * k
      shown.current[1] += (pos[1] - shown.current[1]) * k
    }
    const [x, y] = shown.current
    group.current.position.set(x, 0, -y)

    // Distances from the true position. Nothing left to find: stay cold.
    let target = null
    let d = Infinity
    for (const l of candidates) {
      const dl = Math.hypot(l.xy[0] - pos[0], l.xy[1] - pos[1])
      if (dl < d) [target, d] = [l, dl]
      if (canDiscover && dl < FOUND_M && !reported.current.has(l.id)) {
        reported.current.add(l.id)
        found.current = { at: t, color: l.color }
        setBurstColor(l.color)
        onFound(l.id)
      }
    }
    const band = bandOf(d)
    spectrum(d, tmp.color)

    // Tell the page: at once when the band changes, otherwise 4 times a second.
    const key = `${target?.id}:${band}`
    const s = sent.current
    if (key !== s.key || (t - s.time > 0.25 && Math.abs(d - s.distance) >= 1)) {
      s.key = key
      s.time = t
      s.distance = d
      onProximity(target ? { landmark: target, distance: d, band, color: `#${tmp.color.getHexString()}` } : null)
    }

    // Float, face the camera, and grow when the camera is far away so the ghost keeps
    // about the same size on screen.
    const cam = state.camera.position
    const size = Math.min(6, Math.max(1, Math.hypot(cam.x - x, cam.y, cam.z + y) / 450))
    float.current.scale.setScalar(size)
    float.current.position.y = size * (24 + (reducedMotion ? 0 : Math.sin(t * 2) * 2))
    float.current.rotation.y = Math.atan2(cam.x - x, cam.z + y)

    // Glow in the spectrum colour: cold breathes gently, a fresh find blooms.
    const sinceFound = t - found.current.at
    const bloom = sinceFound < 1.2 ? 1 + 0.8 * Math.sin((sinceFound / 1.2) * Math.PI) : 1
    const breathing = band === 'cold' && !reducedMotion ? Math.sin(t * 1.5) : 0
    glow.current.material.color.copy(tmp.color)
    for (const m of body.current) m.emissive.copy(tmp.color)
    glow.current.material.opacity = BANDS[band].alpha * (1 + 0.15 * breathing)
    glow.current.scale.setScalar(55 * (1 + 0.08 * breathing) * bloom)

    // Rings on the ground: one slow ring when warmer, three concentric rings when hot or found.
    const count = band === 'warmer' ? 1 : band === 'cold' ? 0 : RINGS
    const period = band === 'warmer' ? 2.2 : 1.4
    const reach = band === 'found' ? FOUND_M : 75
    rings.current.forEach((ring, i) => {
      ring.visible = i < count
      if (i >= count) return
      const phase = reducedMotion ? (i + 1) / (RINGS + 1) : (t / period + i / RINGS) % 1
      ring.scale.setScalar(6 + phase * reach)
      ring.material.color.copy(tmp.color)
      ring.material.opacity = 0.35 * (1 - phase)
    })

    // Golden sparkles for the first moments after a find: thrown up and out, then falling.
    const sp = sparks.current
    sp.visible = sinceFound < SPARK_SECONDS && !reducedMotion
    if (sp.visible) {
      const p = sp.geometry.getAttribute('position')
      const k = sinceFound
      for (let i = 0; i < SPARKS; i++) {
        p.setXYZ(
          i,
          burst.vel[i * 3] * 60 * k * size,
          size * (24 + burst.vel[i * 3 + 1] * 70 * k - 45 * k * k),
          burst.vel[i * 3 + 2] * 60 * k * size,
        )
      }
      p.needsUpdate = true
      sp.material.opacity = 1 - sinceFound / SPARK_SECONDS
      sp.material.size = 5 * size
    }

    // Nearest building, from the few in the grid squares around the true position.
    const nb = buildingAlerts ? nearestBuilding(buildingIndex, buildings, pos) : null
    const blend = nb ? Math.min(1, Math.max(0, (GLOW_START_M - nb.d) / (GLOW_START_M - GLOW_FULL_M))) : 0
    facade.current.visible = blend > 0
    if (blend > 0) {
      facade.current.position.set(nb.point[0] - x, 0.5, -(nb.point[1] - y))
      facade.current.material.opacity = 0.35 * blend
    }
    const alertIndex = nb && nb.d < ALERT_M ? nb.index : null
    if (alertIndex !== nearBuilding.current) onBuilding((nearBuilding.current = alertIndex))

    accuracy.current.visible = acc > 0
    if (acc > 0) accuracy.current.scale.setScalar(acc)

    // Follow: slide the camera and its target together, keeping the view angle.
    if (follow && state.controls) {
      const goal = tmp.goal.set(x, 0, -y).sub(state.controls.target).multiplyScalar(1 - Math.exp(-dt * 3))
      state.controls.target.add(goal)
      state.camera.position.add(goal)
    }
  })

  return (
    <group ref={group} visible={false}>
      <mesh rotation={FLAT} position={[0, 0.9, 0]} renderOrder={-1} raycast={noRaycast}>
        <circleGeometry args={[7, 32]} />
        <meshBasicMaterial color="#0b0b0b" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh ref={facade} rotation={FLAT} renderOrder={-1} raycast={noRaycast} visible={false}>
        <circleGeometry args={[16, 48]} />
        <meshBasicMaterial map={texture} color={FACADE} transparent depthWrite={false} side={DoubleSide} />
      </mesh>
      <mesh ref={accuracy} rotation={FLAT} position={[0, 0.7, 0]} renderOrder={-1} raycast={noRaycast}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color="#2a78d6" transparent opacity={0.12} depthWrite={false} side={DoubleSide} />
      </mesh>
      {Array.from({ length: RINGS }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => (rings.current[i] = m)}
          rotation={FLAT}
          position={[0, 1.1 + i * 0.05, 0]}
          renderOrder={0}
          raycast={noRaycast}
        >
          <ringGeometry args={[0.88, 1, 64]} />
          <meshBasicMaterial transparent depthWrite={false} side={DoubleSide} />
        </mesh>
      ))}
      <points ref={sparks} visible={false} renderOrder={6} raycast={noRaycast} frustumCulled={false}>
        <bufferGeometry key={burstColor}>
          <bufferAttribute attach="attributes-position" args={[new Float32Array(SPARKS * 3), 3]} />
          <bufferAttribute attach="attributes-color" args={[burst.col, 3]} />
        </bufferGeometry>
        <pointsMaterial size={7} vertexColors transparent depthWrite={false} depthTest={false} blending={AdditiveBlending} />
      </points>
      <group ref={float}>
        <sprite ref={glow} renderOrder={3} raycast={noRaycast}>
          <spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} />
        </sprite>
        {/* head, body and eyes */}
        <mesh raycast={noRaycast} renderOrder={4}>
          <sphereGeometry args={[6, 24, 16]} />
          <meshLambertMaterial ref={(m) => (body.current[0] = m)} color="#ffffff" emissiveIntensity={0.45} transparent opacity={0.92} />
        </mesh>
        <mesh position={[0, -6, 0]} raycast={noRaycast} renderOrder={4}>
          <cylinderGeometry args={[6, 7.5, 12, 24, 1, true]} />
          <meshLambertMaterial
            ref={(m) => (body.current[1] = m)}
            color="#ffffff"
            emissiveIntensity={0.45}
            transparent
            opacity={0.85}
            side={DoubleSide}
          />
        </mesh>
        {[-2.2, 2.2].map((ex) => (
          <mesh key={ex} position={[ex, 1, 5.3]} raycast={noRaycast} renderOrder={5}>
            <sphereGeometry args={[1.1, 12, 8]} />
            <meshBasicMaterial color="#0b0b0b" />
          </mesh>
        ))}
      </group>
    </group>
  )
}
