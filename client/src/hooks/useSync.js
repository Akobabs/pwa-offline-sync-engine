import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getDeviceId,
  getPendingRecords,
  markSynced,
  markConflictResolved,
  appendSyncLog,
  getRecentSyncLog,
  getAllRecords,
} from '../db.js'
import { postSync } from '../api.js'

export function useSync(isOnline) {
  const [pendingCount, setPendingCount] = useState(0)
  const [syncLog, setSyncLog]           = useState([])
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [isSyncing, setIsSyncing]       = useState(false)
  const syncInFlight = useRef(false)

  const refreshPending = useCallback(async () => {
    const pending = await getPendingRecords()
    setPendingCount(pending.length)
  }, [])

  const refreshLog = useCallback(async () => {
    const log = await getRecentSyncLog(8)
    setSyncLog(log)
  }, [])

  const triggerSync = useCallback(async () => {
    if (syncInFlight.current || !navigator.onLine) return
    syncInFlight.current = true
    setIsSyncing(true)

    try {
      const pending = await getPendingRecords()
      if (pending.length === 0) return

      const deviceId = getDeviceId()
      const operations = pending.map(r => ({
        clientId:  r.clientId,
        title:     r.title,
        category:  r.category,
        notes:     r.notes,
        status:    r.status,
        priority:  r.priority,
        location:  r.location,
        timestamp: r.timestamp,
        deviceId,
      }))

      const result = await postSync(deviceId, operations)

      for (const res of result.results) {
        const isConflict = res.resolution === 'server_wins_lww' ||
                           res.resolution === 'server_wins_tie'

        if (isConflict && res.serverData) {
          await markConflictResolved(res.clientId, res.serverId, res.serverData)
        } else {
          await markSynced(res.clientId, res.serverId, res.serverData)
        }
      }

      const now = new Date().toISOString()
      setLastSyncTime(now)

      const detail = result.conflicts > 0
        ? `${result.synced} record(s) synced · ${result.conflicts} conflict(s) resolved via LWW`
        : `${result.synced} record(s) synced successfully`

      await appendSyncLog('sync_success', detail, result.synced, result.conflicts)
    } catch (err) {
      await appendSyncLog('sync_error', `Sync failed: ${err.message}`, 0)
    } finally {
      syncInFlight.current = false
      setIsSyncing(false)
      await refreshPending()
      await refreshLog()
    }
  }, [refreshPending, refreshLog])

  // Initial load
  useEffect(() => {
    refreshPending()
    refreshLog()
  }, [refreshPending, refreshLog])

  // Auto-sync when going online
  useEffect(() => {
    if (isOnline) triggerSync()
  }, [isOnline, triggerSync])

  return { pendingCount, syncLog, lastSyncTime, isSyncing, triggerSync, refreshPending }
}
