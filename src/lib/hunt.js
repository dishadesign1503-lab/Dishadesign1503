// "Hot & cold": the ghost's glow colour follows the distance to the current target.
// Colours blend smoothly between stops, so the change reads as one continuous spectrum.

import { Color } from 'three'

export const COLD_M = 150 // beyond this: cold
export const HOT_M = 80 // 150–80 m: warmer, 80–35 m: hot
export const FOUND_M = 35 // closer than this: discovered

const STOPS = [
  [170, '#00e5ff'], // cold: neon cyan
  [150, '#a855f7'], // warmer starts: amethyst
  [HOT_M, '#ffb700'], // ...turning amber-gold
  [65, '#ff5722'], // hot: coral-orange
  [FOUND_M, '#ff5722'],
].map(([d, hex]) => [d, new Color(hex)])
const RUBY = new Color('#f43f5e')

export const BANDS = {
  cold: { label: 'Cold', alpha: 0.25 },
  warmer: { label: 'Getting warmer', alpha: 0.3 },
  hot: { label: 'Hot!', alpha: 0.33 },
  found: { label: 'Found it!', alpha: 0.35 },
}

export const bandOf = (d) => (d < FOUND_M ? 'found' : d < HOT_M ? 'hot' : d < COLD_M ? 'warmer' : 'cold')

// Writes the glow colour for distance `d` into `out` (a THREE.Color) and returns it.
export function spectrum(d, out = new Color()) {
  if (d < FOUND_M) return out.copy(RUBY)
  if (d >= STOPS[0][0]) return out.copy(STOPS[0][1])
  for (let i = 1; i < STOPS.length; i++) {
    const [d0, c0] = STOPS[i - 1]
    const [d1, c1] = STOPS[i]
    if (d >= d1) return out.lerpColors(c0, c1, (d0 - d) / (d0 - d1))
  }
  return out.copy(STOPS[STOPS.length - 1][1])
}

// Progress survives a page reload, which matters on a real walk with a phone.
// mode: 'ordered' (one clue after the other) or 'free' (discover anything, in any order).
// waiting: in the ordered hunt, the landmark just found, until the next clue is unlocked.
const KEY = 'weimar-hunt-15'
export const START = { mode: 'ordered', discovered: [], waiting: null }

export function loadHunt() {
  try {
    const h = JSON.parse(localStorage.getItem(KEY))
    if (h && ['ordered', 'free'].includes(h.mode) && Array.isArray(h.discovered)) return { ...START, ...h }
  } catch {
    // no saved progress, or storage is blocked
  }
  return START
}

export function saveHunt(h) {
  try {
    localStorage.setItem(KEY, JSON.stringify(h))
  } catch {
    // storage is blocked; progress lasts until the page closes
  }
}
