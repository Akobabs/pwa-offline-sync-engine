import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db.js'
import { postSimulateConflict } from '../api.js'

const LOG_ICONS = { sync_success: '✓', sync_error: '✗' }

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmtRelative(iso) {
  if (!iso) return ''
  const s = Math.round((Date.now() - new Date(iso)) / 1000)
  if (s < 5)  return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  return fmt(iso)
}

function MetricCard({ value, label, accent }) {
  return (
    <div className="metric-card">
      <span className="metric-val" style={accent ? { color: accent } : {}}>{value}</span>
      <span className="metric-lbl">{label}</span>
    </div>
  )
}

export default function SyncPanel({ pendingCount, syncLog, lastSyncTime, isSyncing, onManualSync, isOnline, serverStatus }) {
  const [simMsg, setSimMsg]       = useState(null)
  const [simBusy, setSimBusy]     = useState(false)

  const totalLocal  = useLiveQuery(() => db.records.count(), []) ?? '…'
  const totalSynced = useLiveQuery(
    () => db.records.where('syncStatus').anyOf(['synced', 'conflict_resolved']).count(), []
  ) ?? 0
  const totalConflict = useLiveQuery(
    () => db.records.where('syncStatus').equals('conflict_resolved').count(), []
  ) ?? 0

  const canSync = isOnline && serverStatus.isUp && !isSyncing && pendingCount > 0

  async function handleSimulate() {
    setSimBusy(true)
    setSimMsg(null)
    try {
      const res = await postSimulateConflict()
      setSimMsg({ type: 'info', text: res.message })
    } catch {
      setSimMsg({ type: 'error', text: 'Simulation failed — is the server running?' })
    } finally {
      setSimBusy(false)
    }
  }

  return (
    <aside className="sync-panel">

      {/* Header */}
      <div className="panel-section-header">Sync Dashboard</div>

      {/* Metrics */}
      <div className="metric-grid">
        <MetricCard value={pendingCount} label="Pending"  accent={pendingCount > 0 ? 'var(--amber)' : undefined} />
        <MetricCard value={totalLocal}   label="Local" />
        <MetricCard value={totalSynced}  label="Synced"   accent="var(--green)" />
        <MetricCard value={serverStatus.isUp ? serverStatus.recordCount : '—'} label="On Server" accent="var(--blue)" />
      </div>

      {/* Last sync */}
      {lastSyncTime && (
        <div className="last-sync-row">
          <span className="last-sync-icon">↻</span>
          <span>Last sync: <strong>{fmtRelative(lastSyncTime)}</strong></span>
        </div>
      )}

      {/* Manual sync */}
      <button
        className={`panel-sync-btn${canSync ? '' : ' panel-sync-btn--disabled'}`}
        onClick={onManualSync}
        disabled={!canSync}
      >
        {isSyncing
          ? <><span className="panel-spinner" />Syncing…</>
          : pendingCount > 0
            ? <>↑ Sync {pendingCount} Record{pendingCount !== 1 ? 's' : ''}</>
            : <>✓ All Synced</>
        }
      </button>

      {/* Status hints */}
      {!isOnline && (
        <div className="panel-alert panel-alert--warn">
          <span>📡</span>
          <span>Offline — records queued locally. Auto-sync resumes when connectivity is restored.</span>
        </div>
      )}
      {isOnline && serverStatus.isUp === false && (
        <div className="panel-alert panel-alert--warn">
          <span>🔌</span>
          <span>Server unreachable — sync paused. Check that the API server is running on port 8000.</span>
        </div>
      )}
      {totalConflict > 0 && (
        <div className="panel-alert panel-alert--info">
          <span>⚡</span>
          <span>{totalConflict} conflict{totalConflict !== 1 ? 's' : ''} resolved via LWW algorithm.</span>
        </div>
      )}

      {/* Sync log */}
      <div className="panel-section-header" style={{ marginTop: 4 }}>Recent Activity</div>
      {syncLog.length === 0
        ? <p className="panel-empty">No sync activity yet.</p>
        : (
          <ul className="log-list">
            {syncLog.map(e => (
              <li key={e.id} className={`log-entry log-entry--${e.eventType}`}>
                <span className="log-icon">{LOG_ICONS[e.eventType] ?? '•'}</span>
                <div className="log-body">
                  <span className="log-detail">{e.detail}</span>
                  <span className="log-time">{fmt(e.timestamp)}</span>
                </div>
              </li>
            ))}
          </ul>
        )
      }

      {/* Demo controls */}
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        <div className="panel-section-header">Demo Controls</div>
        <button
          className="demo-btn"
          onClick={handleSimulate}
          disabled={simBusy || !isOnline || !serverStatus.isUp}
        >
          {simBusy ? '…' : '⚡ Simulate Server Conflict'}
        </button>
        {simMsg && (
          <p className={`sim-msg sim-msg--${simMsg.type}`}>{simMsg.text}</p>
        )}
        <p className="demo-hint">
          Sets a server record to a future timestamp. Next sync will trigger LWW resolution.
        </p>
      </div>

    </aside>
  )
}
