// Turns the raw city kit (longitude, latitude) into local metres around the kit centre.
// x points east, y points north. The 3D scene uses x = east, z = -north, y = up.

import { prepareGraph } from './graph.js'

// Equirectangular projection: accurate to well under a metre over a 2 km area.
export function makeProjection([lon0, lat0]) {
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180)
  const ky = 110574
  return ([lon, lat]) => [(lon - lon0) * kx, (lat - lat0) * ky]
}

export function ringArea(ring) {
  let s = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % ring.length]
    s += x1 * y2 - x2 * y1
  }
  return s / 2
}

export function pointInRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function polygonsOf(geometry) {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return [geometry.coordinates]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates
  return []
}

export const GREEN_LANDUSE = ['recreation', 'cemetery']

export function processKit({ kit, buildings, streets, graph, zensus, plots }) {
  const project = makeProjection(kit.center)

  // GeoJSON rings repeat the first point at the end; drop it.
  const projectRing = (ring) => {
    const pts = ring.map(project)
    const a = pts[0]
    const b = pts[pts.length - 1]
    if (pts.length > 1 && a[0] === b[0] && a[1] === b[1]) pts.pop()
    return pts
  }
  const projectPolygons = (geometry) => polygonsOf(geometry).map((poly) => poly.map(projectRing))
  const netArea = (polys) =>
    polys.reduce(
      (sum, [outer, ...holes]) =>
        sum + Math.abs(ringArea(outer)) - holes.reduce((h, r) => h + Math.abs(ringArea(r)), 0),
      0,
    )

  const bs = buildings.features.map((f) => {
    const p = f.properties
    const polys = projectPolygons(f.geometry)
    const floorArea = p.floor_area_m2 ?? {}
    const totalFloorArea = Object.values(floorArea).reduce((a, b) => a + b, 0)
    const footprint = netArea(polys)
    return {
      id: p.id,
      height: p.height,
      floors: p.floors,
      use: p.use ?? 'undefined',
      floorArea,
      totalFloorArea,
      footprint,
      density: footprint > 0 ? totalFloorArea / footprint : 0,
      polys,
    }
  })

  const cells = zensus.features.map((f) => ({ ...f.properties, polys: projectPolygons(f.geometry) }))

  const streetLines = streets.features.map((f) => f.geometry.coordinates.map(project))

  // Parks, gardens and the two cemeteries: the green plots of the land-use map.
  const parks = plots.features
    .filter((f) => GREEN_LANDUSE.includes(f.properties.landuse))
    .flatMap((f) => projectPolygons(f.geometry))

  const [w, s, e, n] = kit.bbox
  const [x0, y0] = project([w, s])
  const [x1, y1] = project([e, n])

  return {
    kit,
    project,
    buildings: bs,
    cells,
    streetLines,
    parks,
    graph: prepareGraph(graph, project),
    bounds: { x0, y0, x1, y1 },
  }
}

export function cellAt(cells, point) {
  return cells.find((c) => c.polys.some(([outer]) => pointInRing(point, outer))) ?? null
}
