const BASE = '/api'

export async function fetchStatus() {
  const res = await fetch(`${BASE}/status`, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error('Server unavailable')
  return res.json()
}

export async function postSync(deviceId, operations) {
  const res = await fetch(`${BASE}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, operations }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`)
  return res.json()
}

export async function postSimulateConflict() {
  const res = await fetch(`${BASE}/simulate-conflict`, {
    method: 'POST',
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error('Simulation failed')
  return res.json()
}

export async function fetchServerRecords() {
  const res = await fetch(`${BASE}/records`, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error('Could not load server records')
  return res.json()
}
