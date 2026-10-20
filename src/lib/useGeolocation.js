// Follows the device's position with navigator.geolocation.watchPosition while `active`.
// status.state: off | insecure | unsupported | waiting | ok | denied | unavailable | timeout

import { useEffect, useState } from 'react'

export function useGeolocation(active) {
  const [status, setStatus] = useState({ state: 'off' })
  const [coords, setCoords] = useState(null)

  useEffect(() => {
    setCoords(null)
    if (!active) return setStatus({ state: 'off' })
    if (!window.isSecureContext) return setStatus({ state: 'insecure' })
    if (!('geolocation' in navigator)) return setStatus({ state: 'unsupported' })
    setStatus({ state: 'waiting' })
    let hasFix = false
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        hasFix = true
        setCoords(pos.coords)
        setStatus({ state: 'ok' })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setCoords(null)
          setStatus({ state: 'denied' })
        } else if (!hasFix) {
          // keep watching: a fix may still come
          setStatus({ state: err.code === err.TIMEOUT ? 'timeout' : 'unavailable' })
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [active])

  return { status, coords }
}
