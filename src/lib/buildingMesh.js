// All buildings merged into one mesh: a flat roof at `height` plus walls down to the ground.
// `owner` records which building each vertex belongs to, so colours can be repainted per
// building and a click on a triangle can be traced back to its building.

import { BufferAttribute, BufferGeometry, Color, ShapeUtils, Vector2 } from 'three'

export function buildBuildingGeometry(buildings) {
  const pos = []
  const owner = []
  const add = (x, y, n, i) => {
    pos.push(x, y, -n)
    owner.push(i)
  }

  buildings.forEach((b, i) => {
    const h = b.height
    for (const rings of b.polys) {
      if (rings[0].length < 3) continue
      // roof
      const contour = rings[0].map(([x, y]) => new Vector2(x, y))
      const holes = rings.slice(1).map((r) => r.map(([x, y]) => new Vector2(x, y)))
      const all = contour.concat(...holes)
      for (const tri of ShapeUtils.triangulateShape(contour, holes)) {
        for (const k of tri) add(all[k].x, h, all[k].y, i)
      }
      // walls
      for (const ring of rings) {
        for (let j = 0; j < ring.length; j++) {
          const [px, py] = ring[j]
          const [qx, qy] = ring[(j + 1) % ring.length]
          for (const [x, y, z] of [
            [px, 0, py], [qx, 0, qy], [qx, h, qy],
            [px, 0, py], [qx, h, qy], [px, h, py],
          ]) add(x, y, z, i)
        }
      }
    }
  })

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(pos.length), 3))
  geometry.computeVertexNormals() // not indexed, so each triangle gets its own flat normal
  geometry.computeBoundingSphere()
  return { geometry, owner: Uint32Array.from(owner) }
}

// Paint every vertex with its building's colour. `colorOf(i)` returns a hex string.
export function paintBuildings(geometry, owner, count, colorOf) {
  const perBuilding = new Float32Array(count * 3)
  const c = new Color()
  for (let i = 0; i < count; i++) {
    c.set(colorOf(i))
    perBuilding[i * 3] = c.r
    perBuilding[i * 3 + 1] = c.g
    perBuilding[i * 3 + 2] = c.b
  }
  const attr = geometry.getAttribute('color')
  const arr = attr.array
  for (let v = 0; v < owner.length; v++) {
    const o = owner[v] * 3
    arr[v * 3] = perBuilding[o]
    arr[v * 3 + 1] = perBuilding[o + 1]
    arr[v * 3 + 2] = perBuilding[o + 2]
  }
  attr.needsUpdate = true
}
