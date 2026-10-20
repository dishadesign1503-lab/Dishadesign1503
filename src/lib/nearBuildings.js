// "Which building is the ghost next to?" without testing all 4,316 buildings every frame:
// buildings are filed once in a 25 m grid, and each frame only the few buildings in the
// grid squares around the ghost are measured.

import { pointInRing } from './geo.js'
import { nearestNode } from './graph.js'

export const GLOW_START_M = 25 // the red-orange glow starts to blend in here...
export const GLOW_FULL_M = 15 // ...and is at full strength from here
export const ALERT_M = 10 // closer than this: the "Nearby Building" toast

const CELL = 25

export function buildBuildingIndex(buildings) {
  const grid = new Map()
  buildings.forEach((b, i) => {
    const outer = b.polys.flatMap((rings) => rings[0])
    const xs = outer.map((p) => p[0])
    const ys = outer.map((p) => p[1])
    for (let gx = Math.floor(Math.min(...xs) / CELL); gx <= Math.floor(Math.max(...xs) / CELL); gx++)
      for (let gy = Math.floor(Math.min(...ys) / CELL); gy <= Math.floor(Math.max(...ys) / CELL); gy++) {
        const key = gx * 100003 + gy
        if (!grid.has(key)) grid.set(key, [])
        grid.get(key).push(i)
      }
  })
  const seen = new Int32Array(buildings.length).fill(-1)
  let stamp = 0
  // Buildings whose box comes within `r` metres of (x, y).
  const near = (x, y, r) => {
    stamp++
    const out = []
    for (let gx = Math.floor((x - r) / CELL); gx <= Math.floor((x + r) / CELL); gx++)
      for (let gy = Math.floor((y - r) / CELL); gy <= Math.floor((y + r) / CELL); gy++)
        for (const i of grid.get(gx * 100003 + gy) ?? []) {
          if (seen[i] === stamp) continue
          seen[i] = stamp
          out.push(i)
        }
    return out
  }
  return { near }
}

// Distance from a point to a footprint's outline (0 inside), and the closest outline point.
export function distanceToBuilding(b, [x, y]) {
  let best = { d: Infinity, point: null }
  for (const [outer] of b.polys) {
    if (pointInRing([x, y], outer)) return { d: 0, point: [x, y] }
    for (let i = 0; i < outer.length; i++) {
      const [ax, ay] = outer[i]
      const [bx, by] = outer[(i + 1) % outer.length]
      const dx = bx - ax
      const dy = by - ay
      const l2 = dx * dx + dy * dy
      const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0
      const px = ax + t * dx
      const py = ay + t * dy
      const d = Math.hypot(x - px, y - py)
      if (d < best.d) best = { d, point: [px, py] }
    }
  }
  return best
}

// The nearest building within GLOW_START_M, or null.
export function nearestBuilding(index, buildings, pos) {
  let best = null
  for (const i of index.near(pos[0], pos[1], GLOW_START_M)) {
    const r = distanceToBuilding(buildings[i], pos)
    if (r.d <= GLOW_START_M && (!best || r.d < best.d)) best = { index: i, ...r }
  }
  return best
}

// For "Simulate walk near building": a random building within 300 m that has a street
// junction close by, and a spot 6 m outside its facade, on the side facing that junction,
// where no other building is closer.
export function pickBuildingToVisit(index, buildings, graph, from) {
  const options = index.near(from[0], from[1], 300).filter((i) => buildings[i].footprint > 80)
  for (let tries = 0; tries < 40 && options.length; tries++) {
    const i = options[Math.floor(Math.random() * options.length)]
    const [outer] = buildings[i].polys[0]
    const c = outer.reduce((s, p) => [s[0] + p[0] / outer.length, s[1] + p[1] / outer.length], [0, 0])
    const node = nearestNode(graph, c, 60)
    if (!node) continue
    const street = graph.nodes[node.node]
    const facade = distanceToBuilding(buildings[i], street)
    if (facade.d < 8) continue // the junction is too close to the wall to stand 6 m off it
    const k = 6 / facade.d
    const spot = [facade.point[0] + (street[0] - facade.point[0]) * k, facade.point[1] + (street[1] - facade.point[1]) * k]
    if (nearestBuilding(index, buildings, spot)?.index !== i) continue // a neighbour is closer there
    return { index: i, spot }
  }
  return null
}
