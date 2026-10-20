// The pedestrian network in local metres, with an adjacency list for routing.
// Only walkable edges are kept.

import { MAX_SNAP_M } from './settings.js'

export function prepareGraph(raw, project) {
  const index = new Map(raw.nodes.map((n, i) => [n.id, i]))
  const nodes = raw.nodes.map((n) => project([n.lon, n.lat]))
  const adj = nodes.map(() => [])
  const edges = []
  for (const e of raw.edges) {
    if (!e.walkable) continue
    const u = index.get(e.from)
    const v = index.get(e.to)
    const line = e.coords.map(project)
    const cum = [0]
    for (let i = 1; i < line.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]))
    }
    const k = edges.length
    edges.push({ u, v, length: e.length, line, cum })
    adj[u].push([v, e.length, k])
    adj[v].push([u, e.length, k])
  }
  return { nodes, adj, edges }
}

export function nearestNode(graph, [x, y], maxDist = MAX_SNAP_M) {
  let best = -1
  let bestD = maxDist
  graph.nodes.forEach(([nx, ny], i) => {
    if (graph.adj[i].length === 0) return // not on a walkable edge
    const d = Math.hypot(nx - x, ny - y)
    if (d <= bestD) {
      bestD = d
      best = i
    }
  })
  return best < 0 ? null : { node: best, distance: bestD }
}

// The street route between two nodes as one line of points, or null if unreachable.
// A plain Dijkstra without a heap is quick enough for under a thousand nodes.
export function routeBetween(graph, from, to) {
  const n = graph.nodes.length
  const dist = new Float64Array(n).fill(Infinity)
  const via = new Int32Array(n).fill(-1) // edge used to arrive
  const done = new Uint8Array(n)
  dist[from] = 0
  for (;;) {
    let u = -1
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i
    if (u < 0 || u === to) break
    done[u] = 1
    for (const [v, len, k] of graph.adj[u]) {
      if (dist[u] + len < dist[v]) {
        dist[v] = dist[u] + len
        via[v] = k
      }
    }
  }
  if (dist[to] === Infinity) return null
  const pieces = []
  for (let v = to; v !== from; ) {
    const e = graph.edges[via[v]]
    const forward = e.v === v // the edge was walked from e.u to e.v
    pieces.push(forward ? e.line : [...e.line].reverse())
    v = forward ? e.u : e.v
  }
  const line = [graph.nodes[from]]
  for (const piece of pieces.reverse()) line.push(...piece.slice(1))
  return line
}
