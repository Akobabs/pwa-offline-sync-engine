import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchStatus } from '../api.js'

const POLL_INTERVAL = 5000

export function useServerStatus(onRecovery) {
  const [status, setStatus] = useState({
    isUp: null, // null = not yet checked
    recordCount: 0,
    lastChecked: null,
    version: null,
  })
  const prevIsUp = useRef(null)
  const onRecoveryRef = useRef(onRecovery)
  onRecoveryRef.current = onRecovery

  const check = useCallback(async () => {
    try {
      const data = await fetchStatus()
      setStatus({
        isUp: true,
        recordCount: data.recordCount ?? 0,
        lastChecked: new Date().toISOString(),
        version: data.version ?? null,
      })
      // Server recovered from a down state → trigger sync
      if (prevIsUp.current === false) {
        onRecoveryRef.current?.()
      }
      prevIsUp.current = true
    } catch {
      setStatus(prev => ({
        ...prev,
        isUp: false,
        lastChecked: new Date().toISOString(),
      }))
      prevIsUp.current = false
    }
  }, [])

  useEffect(() => {
    check()
    const id = setInterval(check, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [check])

  return { serverStatus: status, checkServer: check }
}
