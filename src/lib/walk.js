// Walking reach: shortest walks along the pedestrian graph, the 25 m band around the
// reached streets, and what lies inside it (buildings, census residents).
// Polygon work (band, union, intersection) uses Clipper, which needs whole numbers,
// so coordinates are stored in centimetres.

import ClipperLib from 'clipper-lib'
import { pointInRing } from './geo.js'
import { nearestNode } from './graph.js'
import { BAND_M, MINUTES, WALK_SPEED_M_PER_MIN } from './settings.js'

const SCALE = 100 // metres -> centimetres
const { Clipper, ClipperOffset, PolyTree, Paths, ClipType, PolyType, PolyFillType, JoinType, EndType } =
  ClipperLib

const toPath = (pts) => pts.map(([x, y]) => ({ X: Math.round(x * SCALE), Y: Math.round(y * SCALE) }))

// ---------- routing ----------

// Dijkstra with a small binary heap. Stops once every remaining node is beyond maxDist.
export function shortestDistances(graph, start, maxDist) {
  const dist = new Float64Array(graph.nodes.length).fill(Infinity)
  dist[start] = 0
  const heap = [[0, start]]
  const push = (item) => {
    heap.push(item)
    let i = heap.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p][0] <= heap[i][0]) break
      ;[heap[p], heap[i]] = [heap[i], heap[p]]
      i = p
    }
  }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()
    if (heap.length) {
      heap[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r
        if (m === i) break
        ;[heap[m], heap[i]] = [heap[i], heap[m]]
        i = m
      }
    }
    return top
  }
  while (heap.length) {
    const [d, u] = pop()
    if (d > dist[u] || d > maxDist) continue
    for (const [v, len] of graph.adj[u]) {
      const nd = d + len
      if (nd < dist[v]) {
        dist[v] = nd
        push([nd, v])
      }
    }
  }
  return dist
}

// The part of an edge's drawn line between fractions t0 and t1 of its length.
function subLine({ line, cum }, t0, t1) {
  const total = cum[cum.length - 1]
  const d0 = t0 * total
  const d1 = t1 * total
  const at = (d) => {
    let i = 1
    while (i < cum.length - 1 && cum[i] < d) i++
    const seg = cum[i] - cum[i - 1] || 1
    const t = (d - cum[i - 1]) / seg
    const [ax, ay] = line[i - 1]
    const [bx, by] = line[i]
    return [ax + (bx - ax) * t, ay + (by - ay) * t]
  }
  const out = [at(d0)]
  for (let i = 1; i < line.length - 1; i++) if (cum[i] > d0 && cum[i] < d1) out.push(line[i])
  out.push(at(d1))
  return out
}

// Street pieces reachable within `limit` metres, including the reachable part of the last edge.
export function reachedLines(graph, dist, start, limit) {
  const lines = [[graph.nodes[start]]]
  for (const e of graph.edges) {
    const a = dist[e.u] < limit ? limit - dist[e.u] : 0 // how far into the edge from u
    const b = dist[e.v] < limit ? limit - dist[e.v] : 0 // how far into the edge from v
    if (a <= 0 && b <= 0) continue
    if (a + b >= e.length) lines.push(e.line)
    else {
      if (a > 0) lines.push(subLine(e, 0, a / e.length))
      if (b > 0) lines.push(subLine(e, 1 - b / e.length, 1))
    }
  }
  return lines
}

// ---------- polygons ----------

function bandAround(lines, band) {
  const co = new ClipperOffset(2, 0.25 * SCALE)
  co.AddPaths(lines.map(toPath), JoinType.jtRound, EndType.etOpenRound)
  const solution = new Paths()
  co.Execute(solution, band * SCALE)
  return solution
}

function clip(type, subject, clipPaths, asTree = false) {
  const c = new Clipper()
  c.AddPaths(subject, PolyType.ptSubject, true)
  c.AddPaths(clipPaths, PolyType.ptClip, true)
  const out = asTree ? new PolyTree() : new Paths()
  c.Execute(type, out, PolyFillType.pftEvenOdd, PolyFillType.pftNonZero)
  return out
}

const netArea = (paths) => paths.reduce((s, p) => s + Clipper.Area(p), 0)

// PolyTree -> list of { outer, holes } in metres, ready for THREE.Shape.
function treeToShapes(tree) {
  const shapes = []
  const toMetres = (path) => path.map(({ X, Y }) => [X / SCALE, Y / SCALE])
  const walk = (node) => {
    for (const child of node.Childs()) {
      if (!child.IsHole()) {
        shapes.push({ outer: toMetres(child.Contour()), holes: child.Childs().map((h) => toMetres(h.Contour())) })
        for (const hole of child.Childs()) walk(hole)
      }
    }
  }
  walk(tree)
  return shapes
}

function bounds(paths) {
  const b = Clipper.GetBounds(paths)
  return [b.left, b.top, b.right, b.bottom] // Clipper's "top" is the smallest y
}
// Building footprints and census cells, prepared once.
export function prepareOverlay(buildings, cells) {
  const boxOf = (polys) => {
    const xs = polys.flatMap((rings) => rings[0].map((p) => p[0]))
    const ys = polys.flatMap((rings) => rings[0].map((p) => p[1]))
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  }
  const b = buildings.map((x) => ({ polys: x.polys, box: boxOf(x.polys) }))
  const c = cells.map((x) => {
    const paths = x.polys.flatMap((rings) => rings.map(toPath))
    return { paths, box: boxOf(x.polys), area: Math.abs(netArea(paths)) }
  })
  return { buildings: b, cells: c }
}

// ---------- distances, for "does this building touch the band?" ----------

function pointSegDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const o = (px, py, qx, qy, rx, ry) => Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px))
  return (
    o(ax, ay, bx, by, cx, cy) * o(ax, ay, bx, by, dx, dy) < 0 && o(cx, cy, dx, dy, ax, ay) * o(cx, cy, dx, dy, bx, by) < 0
  )
}

function segSegDist(a, b) {
  if (segmentsCross(a[0], a[1], a[2], a[3], b[0], b[1], b[2], b[3])) return 0
  return Math.min(
    pointSegDist(a[0], a[1], b[0], b[1], b[2], b[3]),
    pointSegDist(a[2], a[3], b[0], b[1], b[2], b[3]),
    pointSegDist(b[0], b[1], a[0], a[1], a[2], a[3]),
    pointSegDist(b[2], b[3], a[0], a[1], a[2], a[3]),
  )
}

// True when a footprint lies within `band` metres of a street piece, which is exactly
// when it touches the band drawn around that piece.
function polygonNearSegment(polys, seg, band) {
  for (const [outer] of polys) {
    if (pointInRing([seg[0], seg[1]], outer)) return true
    for (let i = 0; i < outer.length; i++) {
      const p = outer[i]
      const q = outer[(i + 1) % outer.length]
      if (segSegDist([p[0], p[1], q[0], q[1]], seg) <= band) return true
    }
  }
  return false
}

// Street pieces as straight segments (remembering their line) in a 50 m grid, each filed under every grid
// square within `band` metres of it, so a lookup returns everything that could touch.
const GRID = 50
function segmentGrid(lines, band) {
  const segs = []
  lines.forEach((line, n) => {
    if (line.length === 1) segs.push([line[0][0], line[0][1], line[0][0], line[0][1], n])
    for (let i = 1; i < line.length; i++) segs.push([line[i - 1][0], line[i - 1][1], line[i][0], line[i][1], n])
  })
  const grid = new Map()
  segs.forEach((s, k) => {
    const gx0 = Math.floor((Math.min(s[0], s[2]) - band) / GRID)
    const gx1 = Math.floor((Math.max(s[0], s[2]) + band) / GRID)
    const gy0 = Math.floor((Math.min(s[1], s[3]) - band) / GRID)
    const gy1 = Math.floor((Math.max(s[1], s[3]) + band) / GRID)
    for (let gx = gx0; gx <= gx1; gx++)
      for (let gy = gy0; gy <= gy1; gy++) {
        const key = gx * 100003 + gy
        if (!grid.has(key)) grid.set(key, [])
        grid.get(key).push(k)
      }
  })
  const seen = new Int32Array(segs.length).fill(-1)
  let stamp = 0
  const near = ([x0, y0, x1, y1]) => {
    stamp++
    const out = []
    for (let gx = Math.floor(x0 / GRID); gx <= Math.floor(x1 / GRID); gx++)
      for (let gy = Math.floor(y0 / GRID); gy <= Math.floor(y1 / GRID); gy++)
        for (const k of grid.get(gx * 100003 + gy) ?? []) {
          if (seen[k] === stamp) continue
          seen[k] = stamp
          out.push(segs[k])
        }
    return out
  }
  return { near }
}

// The whole analysis for one click.
export function computeReach(graph, overlay, cells, point) {
  const snap = nearestNode(graph, point)
  if (!snap) return { ok: false }

  const limits = MINUTES.map((m) => m * WALK_SPEED_M_PER_MIN)
  const dist = shortestDistances(graph, snap.node, limits[limits.length - 1])
  const lines = limits.map((L) => reachedLines(graph, dist, snap.node, L))
  const grids = lines.map((l) => segmentGrid(l, BAND_M))
  const areas = lines.map((l) => bandAround(l, BAND_M))

  // Rings for drawing: the 5-min area, then 10 minus 5, then 15 minus 10.
  const rings = areas.map((a, i) =>
    treeToShapes(i === 0 ? clip(ClipType.ctUnion, a, [], true) : clip(ClipType.ctDifference, a, areas[i - 1], true)),
  )

  // Each building gets the smallest level whose area it touches (0 = 5 min), or -1.
  // The areas are nested, so only what touched a bigger area is tested against the next smaller one.
  const level = new Int8Array(overlay.buildings.length).fill(-1)
  for (let i = limits.length - 1; i >= 0; i--) {
    overlay.buildings.forEach((b, k) => {
      if (i < limits.length - 1 && level[k] !== i + 1) return
      if (grids[i].near(b.box).some((seg) => polygonNearSegment(b.polys, seg, BAND_M))) level[k] = i
    })
  }

  // Residents: population times the share of each cell inside the area. The band is
  // rebuilt from only the street lines near the cell, which gives the same shape there.
  const stats = limits.map((_, i) => {
    let residents = 0
    let missing = 0
    overlay.cells.forEach((c, k) => {
      const segs = grids[i].near(c.box)
      if (!segs.length) return
      const local = bandAround(
        [...new Set(segs.map((s) => s[4]))].map((n) => lines[i][n]),
        BAND_M,
      )
      const share = Math.abs(netArea(clip(ClipType.ctIntersection, c.paths, local))) / c.area
      if (share <= 0) return
      const pop = cells[k].population
      if (pop == null) missing++
      else residents += pop * share
    })
    let buildings = 0
    for (const l of level) if (l >= 0 && l <= i) buildings++
    return { minutes: MINUTES[i], buildings, residents: Math.round(residents / 10) * 10, missing }
  })

  return { ok: true, start: graph.nodes[snap.node], snapDistance: snap.distance, rings, level, stats }
}
