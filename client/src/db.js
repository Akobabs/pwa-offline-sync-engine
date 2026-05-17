import Dexie from 'dexie'

export const db = new Dexie('OfflineSyncPWA')

db.version(1).stores({
  records:  '++id, clientId, title, category, notes, status, priority, location, timestamp, syncStatus, serverId',
  syncLog:  '++id, eventType, timestamp, detail, count, conflicts',
})

// ─── Device identity ──────────────────────────────────────────────────────────

export function getDeviceId() {
  let id = localStorage.getItem('pwa_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('pwa_device_id', id)
  }
  return id
}

// ─── Record helpers ───────────────────────────────────────────────────────────

export async function addRecord(fields) {
  const clientId = crypto.randomUUID()
  const now = new Date().toISOString()
  const id = await db.records.add({
    clientId,
    ...fields,
    timestamp:  now,
    syncStatus: 'pending',
    serverId:   null,
  })
  return id
}

export async function getPendingRecords() {
  return db.records.where('syncStatus').equals('pending').toArray()
}

export async function markSynced(clientId, serverId, serverData) {
  await db.records
    .where('clientId')
    .equals(clientId)
    .modify({
      syncStatus: 'synced',
      serverId,
      // If server won, overwrite local fields
      ...(serverData
        ? {
            title:    serverData.title,
            notes:    serverData.notes,
            category: serverData.category,
            status:   serverData.status,
            priority: serverData.priority,
            location: serverData.location,
            timestamp: serverData.timestamp,
          }
        : {}),
    })
}

export async function markConflictResolved(clientId, serverId, serverData) {
  await db.records
    .where('clientId')
    .equals(clientId)
    .modify({
      syncStatus: 'conflict_resolved',
      serverId,
      title:    serverData.title,
      notes:    serverData.notes,
      category: serverData.category,
      status:   serverData.status,
      priority: serverData.priority,
      location: serverData.location,
      timestamp: serverData.timestamp,
    })
}

export async function getAllRecords() {
  return db.records.orderBy('timestamp').reverse().toArray()
}

// ─── Sync log helpers ─────────────────────────────────────────────────────────

export async function appendSyncLog(eventType, detail, count, conflicts = 0) {
  await db.syncLog.add({
    eventType,
    timestamp: new Date().toISOString(),
    detail,
    count,
    conflicts,
  })
  // Keep only the last 50 log entries
  const total = await db.syncLog.count()
  if (total > 50) {
    const oldest = await db.syncLog.orderBy('id').limit(total - 50).primaryKeys()
    await db.syncLog.bulkDelete(oldest)
  }
}

export async function getRecentSyncLog(limit = 8) {
  return db.syncLog.orderBy('id').reverse().limit(limit).toArray()
}
