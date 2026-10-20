import { useLabel } from '../lib/colors.js'

// The small notice when the ghost is within 10 m of a building's facade.
export default function BuildingToast({ building }) {
  if (!building) return null
  const use = building.use === 'undefined' ? 'unknown use' : useLabel(building.use)
  return (
    <div className="building-toast" role="status">
      <span className="toast-dot" />
      <strong>Nearby Building:</strong> {use.charAt(0).toUpperCase() + use.slice(1)} • {building.floors} Floors •{' '}
      {building.height.toFixed(1)}m
    </div>
  )
}
