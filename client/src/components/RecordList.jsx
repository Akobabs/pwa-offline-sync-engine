import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db.js'

const PRI_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' }
const PRI_LABELS = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }

const SYNC_BADGE = {
  pending:           { label: 'Pending',          icon: '⏳', cls: 'badge--pending'  },
  synced:            { label: 'Synced',            icon: '✓',  cls: 'badge--synced'   },
  conflict_resolved: { label: 'Conflict Resolved', icon: '⚡', cls: 'badge--conflict' },
}

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1)   return 'Just now'
  if (diffMin < 60)  return `${diffMin}m ago`
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function StatusSummary({ records }) {
  const counts = records.reduce((acc, r) => {
    acc[r.syncStatus] = (acc[r.syncStatus] || 0) + 1
    return acc
  }, {})
  return (
    <div className="list-stats">
      {counts.synced            > 0 && <span className="list-stat list-stat--synced">{counts.synced} synced</span>}
      {counts.pending           > 0 && <span className="list-stat list-stat--pending">{counts.pending} pending</span>}
      {counts.conflict_resolved > 0 && <span className="list-stat list-stat--conflict">{counts.conflict_resolved} conflict resolved</span>}
    </div>
  )
}

export default function RecordList() {
  const records = useLiveQuery(
    () => db.records.orderBy('timestamp').reverse().toArray(),
    [],
  )

  if (!records) {
    return (
      <div className="list-card list-card--loading">
        <span className="loading-spinner-lg" />
        <span>Loading records…</span>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="list-card list-card--empty">
        <div className="empty-icon">📋</div>
        <h3>No records yet</h3>
        <p>Submit your first field record above. Records created while offline are stored locally and sync automatically when connectivity is restored.</p>
      </div>
    )
  }

  return (
    <section className="list-card">
      <div className="list-header">
        <h2 className="list-title">Records <span className="list-count">{records.length}</span></h2>
        <StatusSummary records={records} />
      </div>

      <ul className="record-list">
        {records.map(r => {
          const badge    = SYNC_BADGE[r.syncStatus] ?? { label: r.syncStatus, icon: '•', cls: '' }
          const priColor = PRI_COLORS[r.priority]   ?? '#94a3b8'
          const priLabel = PRI_LABELS[r.priority]   ?? r.priority

          return (
            <li key={r.id} className={`record-item record-item--${r.syncStatus}`}>
              {/* Priority accent bar */}
              <div className="record-accent" style={{ background: priColor }} />

              <div className="record-body">
                {/* Top row */}
                <div className="record-top">
                  <span className="record-title">{r.title}</span>
                  <span className={`sync-badge ${badge.cls}`}>
                    <span className="sync-badge__icon">{badge.icon}</span>
                    {badge.label}
                  </span>
                </div>

                {/* Meta row */}
                <div className="record-meta">
                  <span className="meta-chip">{r.category}</span>
                  <span className="meta-chip meta-chip--priority" style={{ color: priColor, borderColor: `${priColor}40` }}>
                    ● {priLabel}
                  </span>
                  {r.location && (
                    <span className="meta-chip">📍 {r.location}</span>
                  )}
                  <span className="meta-chip meta-chip--status">{r.status?.replace('_', ' ')}</span>
                  <span className="record-time">{fmtDate(r.timestamp)}</span>
                </div>

                {/* Notes */}
                {r.notes && (
                  <p className="record-notes">{r.notes}</p>
                )}

                {/* Conflict notice */}
                {r.syncStatus === 'conflict_resolved' && (
                  <div className="conflict-notice">
                    <span>⚡</span>
                    <span>Server version applied via Last-Write-Wins (LWW) conflict resolution</span>
                  </div>
                )}

                {/* Pending indicator */}
                {r.syncStatus === 'pending' && (
                  <div className="pending-notice">
                    <span className="pending-notice__dot" />
                    <span>Queued for sync — will upload when server is reachable</span>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
