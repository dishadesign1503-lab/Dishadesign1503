// "Test walk": a pretend walker that follows the street network, so the tracker can be
// tried from a desk. Speed 1 is real walking pace (80 m per minute).

import { nearestNode, routeBetween } from './graph.js'
import { WALK_SPEED_M_PER_MIN } from './settings.js'

const LAST_STEP_M = 150 // walk straight off the street to the target if it is this close

export class TestWalk {
  constructor(graph) {
    this.graph = graph
    this.position = [...graph.nodes[nearestNode(graph, [0, 0], Infinity).node]] // kit centre
    this.line = null
  }

  get walking() {
    return this.line !== null
  }

  // Plan a street route from where the walker is now to `target` ([x, y] in metres).
  goTo(target) {
    const from = nearestNode(this.graph, this.position, Infinity)
    const to = nearestNode(this.graph, target, Infinity)
    const route = from && to && routeBetween(this.graph, from.node, to.node)
    if (!route) return false
    const line = [[...this.position], ...route]
    if (Math.hypot(target[0] - route.at(-1)[0], target[1] - route.at(-1)[1]) <= LAST_STEP_M) line.push(target)
    this.line = line
    this.cum = [0]
    for (let i = 1; i < line.length; i++) {
      this.cum.push(this.cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]))
    }
    this.travelled = 0
    this.segment = 1
    return true
  }

  stop() {
    this.line = null
  }

  // Teleport: jump straight to a point.
  jumpTo(point) {
    this.position = [...point]
    this.line = null
  }

  // Move on by `seconds` at `speed` times walking pace. Returns true on arrival.
  step(seconds, speed) {
    if (!this.line) return false
    const { line, cum } = this
    this.travelled += (seconds * speed * WALK_SPEED_M_PER_MIN) / 60
    const total = cum[cum.length - 1]
    if (this.travelled >= total) {
      this.position = [...line[line.length - 1]]
      this.line = null
      return true
    }
    while (cum[this.segment] < this.travelled) this.segment++
    const i = this.segment
    const t = (this.travelled - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)
    this.position = [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t]
    return false
  }
}
