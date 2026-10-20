import { useMemo } from 'react'
import { BufferAttribute, BufferGeometry, CanvasTexture, DoubleSide, SRGBColorSpace } from 'three'
import { CATEGORIES } from '../lib/landmarks.js'
import { FOUND_M } from '../lib/hunt.js'

// A pin for every landmark in a shown category: a round icon in the category colour on a
// thin stem. Undiscovered pins are white with a coloured ring and no name; discovered pins
// are filled, named, and get a soft disc on the ground.

const FLAT = [-Math.PI / 2, 0, 0]
const noRaycast = () => null
const VIEW_PX = 900 // sizes below are pixels at this window height; sprites keep their screen size
const FOV = 2 * Math.tan(((35 / 2) * Math.PI) / 180) // the camera's 35° field of view, see City.jsx
const PIN_PX = 30
const LABEL_PX = 22
const STEM_M = 35

const canvasTexture = (c) => {
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

function iconTexture(category, done) {
  const { color, icon } = CATEGORIES[category]
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  g.beginPath()
  g.arc(32, 32, 28, 0, Math.PI * 2)
  g.fillStyle = done ? color : '#ffffff'
  g.fill()
  g.lineWidth = 6
  g.strokeStyle = done ? '#ffffff' : color
  g.stroke()
  g.font = '30px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.globalAlpha = done ? 1 : 0.75
  g.fillText(icon, 32, 35)
  return canvasTexture(c)
}

function labelTexture(text, color) {
  const scale = 2 // sharp on high-resolution screens
  const font = `700 ${11 * scale}px system-ui, -apple-system, 'Segoe UI', sans-serif`
  const c = document.createElement('canvas')
  const g = c.getContext('2d')
  g.font = font
  const w = Math.ceil(g.measureText(text).width) + 16 * scale
  const h = LABEL_PX * scale
  c.width = w
  c.height = h
  g.font = font
  g.fillStyle = 'rgba(252,252,251,0.95)'
  g.strokeStyle = color
  g.lineWidth = 2 * scale
  g.beginPath()
  g.roundRect(scale, scale, w - 2 * scale, h - 2 * scale, 4 * scale)
  g.fill()
  g.stroke()
  g.fillStyle = '#0b0b0b'
  g.textBaseline = 'middle'
  g.fillText(text, 8 * scale, h / 2 + scale / 2)
  return { texture: canvasTexture(c), aspect: w / h }
}

function Pin({ landmark, done }) {
  const icon = useMemo(() => iconTexture(landmark.category, done), [landmark.category, done])
  const label = useMemo(() => (done ? labelTexture(landmark.name, landmark.color) : null), [done, landmark])
  const stem = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 0, STEM_M, 0]), 3))
    return g
  }, [])
  const k = (PIN_PX / VIEW_PX) * FOV
  const kl = (LABEL_PX / VIEW_PX) * FOV
  return (
    <group position={[landmark.xy[0], 0, -landmark.xy[1]]}>
      <lineSegments geometry={stem} raycast={noRaycast}>
        <lineBasicMaterial color={landmark.color} />
      </lineSegments>
      <sprite position={[0, STEM_M, 0]} center={[0.5, 0.15]} scale={[k, k, 1]} renderOrder={7} raycast={noRaycast}>
        <spriteMaterial map={icon} sizeAttenuation={false} depthTest={false} depthWrite={false} transparent />
      </sprite>
      {label && (
        <sprite position={[0, STEM_M, 0]} center={[0.5, -1.25]} scale={[kl * label.aspect, kl, 1]} renderOrder={7} raycast={noRaycast}>
          <spriteMaterial map={label.texture} sizeAttenuation={false} depthTest={false} depthWrite={false} transparent />
        </sprite>
      )}
      {done && (
        <mesh rotation={FLAT} position={[0, 1.4, 0]} renderOrder={0} raycast={noRaycast}>
          <circleGeometry args={[FOUND_M, 48]} />
          <meshBasicMaterial color={landmark.color} transparent opacity={0.22} depthWrite={false} side={DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

export default function Landmarks({ landmarks, discovered, hiddenCategories }) {
  return landmarks
    .filter((l) => !hiddenCategories.includes(l.category))
    .map((l) => <Pin key={l.id} landmark={l} done={discovered.includes(l.id)} />)
}
