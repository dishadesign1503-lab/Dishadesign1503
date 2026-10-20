// Colour modes for the buildings and census cells, with the legend for each.
// Hexes come from a colour-blind-checked palette (checked against the ground colour #fcfcfb).

export const SURFACE = '#fcfcfb' // the ground
export const OUTSIDE = '#eceae4' // beyond the kit area
export const STREET = '#898781'
export const PARK = '#22c55e' // parks, gardens and cemeteries
export const PARK_EDGE = '#16a34a'
export const NEUTRAL = '#dcdad3' // buildings when the census cells carry the colour
export const NO_FIGURE = '#c3c2b7' // census cells without a published figure (hatched)

// Walking reach: one accent hue, darkest = closest.
export const REACH = ['#b42a2e', '#e34948', '#ef8a87']

// Main use, grouped into three families plus "other", so the colours stay tellable apart on a map.
const USE_GROUPS = [
  { label: 'Housing', color: '#2a78d6', uses: ['residential'] },
  {
    label: 'Shops, work, hotels',
    color: '#eda100',
    uses: ['retail', 'food_and_drink', 'office', 'service', 'accommodation', 'entertainment'],
  },
  {
    label: 'Public buildings',
    color: '#1baf7a',
    uses: ['education', 'civic', 'health', 'culture', 'sport', 'transport'],
  },
  { label: 'Other or unknown', color: '#a8a69f', uses: ['undefined', 'light_industrial'] },
]
const groupOf = (use) => USE_GROUPS.find((g) => g.uses.includes(use)) ?? USE_GROUPS[3]

export const useLabel = (use) => use.replaceAll('_', ' ')

// One blue ramp, light to dark, for every "how much" mode.
const RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#0d366b']

// breaks [a, b, c, d] -> 5 classes: < a, a–b, b–c, c–d, >= d
function stepped(breaks, unit, fmt = (v) => v) {
  const classOf = (v) => {
    let i = 0
    while (i < breaks.length && v >= breaks[i]) i++
    return i
  }
  const legend = RAMP.map((color, i) => {
    let label
    if (i === 0) label = `under ${fmt(breaks[0])}`
    else if (i === breaks.length) label = `${fmt(breaks[i - 1])} or more`
    else label = `${fmt(breaks[i - 1])} – ${fmt(breaks[i])}`
    return { color, label: unit ? `${label} ${unit}` : label }
  })
  return { color: (v) => RAMP[classOf(v)], legend }
}

const height = stepped([5, 9, 12, 15], 'm')
const floors = stepped([2, 3, 4, 5], 'floors')
const density = stepped([1.5, 2.5, 3.5, 4.5], '', (v) => v.toFixed(1))
const residents = stepped([25, 50, 100, 150], 'residents')

export const MODES = [
  {
    key: 'plain',
    label: 'Plain',
    title: 'All buildings in one light grey',
    note: 'A quiet base map, so the treasure-hunt colours stand out. It is chosen when the ghost is switched on.',
    building: () => NEUTRAL,
    legend: [{ color: NEUTRAL, label: 'building' }],
  },
  {
    key: 'use',
    label: 'Use',
    title: 'Main use of each building',
    building: (b) => groupOf(b.use).color,
    legend: USE_GROUPS.map((g) => ({ color: g.color, label: g.label, detail: g.uses.map(useLabel).join(', ') })),
  },
  {
    key: 'height',
    label: 'Height',
    title: 'Building height, ground to highest roof point',
    building: (b) => height.color(b.height),
    legend: height.legend,
  },
  {
    key: 'floors',
    label: 'Floors',
    title: 'Floors above ground',
    building: (b) => floors.color(b.floors),
    legend: floors.legend,
  },
  {
    key: 'density',
    label: 'Density',
    title: 'Floor area per m² of footprint',
    note: 'All floor area in the building divided by the area it covers on the ground. 3.0 means three times the footprint is built as floor space.',
    building: (b) => density.color(b.density),
    legend: density.legend,
  },
  {
    key: 'residents',
    label: 'Residents',
    title: 'Residents per 100 m census square (Zensus 2022)',
    note: 'Click a square on the ground to see its census figures. Buildings turn grey in this mode.',
    building: () => NEUTRAL,
    cell: (c) => (c.population == null ? null : residents.color(c.population)),
    legend: [...residents.legend, { color: NO_FIGURE, label: 'no published figure', hatch: true }],
  },
]
