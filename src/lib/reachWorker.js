// Runs the walking analysis off the main thread, so the 3D view keeps moving while it works.
import { prepareOverlay, computeReach } from './walk.js'

let state = null

self.onmessage = ({ data }) => {
  if (data.type === 'init') {
    state = { graph: data.graph, cells: data.cells, overlay: prepareOverlay(data.buildings, data.cells) }
  } else if (data.type === 'reach') {
    self.postMessage({ id: data.id, result: computeReach(state.graph, state.overlay, state.cells, data.point) })
  }
}
