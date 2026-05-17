function Dot({ state }) {
  // state: 'up' | 'down' | 'checking'
  return <span className={`sb-dot sb-dot--${state}`} aria-hidden />
}

function timeSince(iso) {
  if (!iso) return ''
  const s = Math.round((Date.now() - new Date(iso)) / 1000)
  if (s < 5)  return 'just now'
  if (s < 60) return `${s}s ago`
  return `${Math.round(s / 60)}m ago`
}

export default function StatusBar({ isOnline, serverStatus, pendingCount, isSyncing, onSync }) {
  const { isUp, recordCount, lastChecked } = serverStatus

  const networkState  = isOnline ? 'up' : 'down'
  const serverState   = isUp === null ? 'checking' : isUp ? 'up' : 'down'
  const canSync       = isOnline && isUp && !isSyncing && pendingCount > 0

  // Bar accent class
  let barMod = ''
  if (!isOnline)       barMod = 'status-bar--offline'
  else if (isUp === false) barMod = 'status-bar--server-down'

  return (
    <div className={`status-bar ${barMod}`} role="status" aria-live="polite">
      <div className="status-bar__inner">

        {/* ── Left: indicators ── */}
        <div className="sb-indicators">
          {/* Network */}
          <div className="sb-item">
            <Dot state={networkState} />
            <span className="sb-label">Network</span>
            <span className={`sb-value sb-value--${networkState}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <span className="sb-sep" aria-hidden>|</span>

          {/* Server */}
          <div className="sb-item">
            <Dot state={serverState} />
            <span className="sb-label">Server</span>
            <span className={`sb-value sb-value--${serverState}`}>
              {isUp === null && 'Checking…'}
              {isUp === true  && `Running · ${recordCount} record${recordCount !== 1 ? 's' : ''}`}
              {isUp === false && 'Unreachable'}
            </span>
            {lastChecked && (
              <span className="sb-checked">· checked {timeSince(lastChecked)}</span>
            )}
          </div>
        </div>

        {/* ── Right: sync action ── */}
        <div className="sb-actions">
          {pendingCount > 0 && (
            <span className="sb-pending-pill">
              <span className="sb-pending-dot" />
              {pendingCount} pending
            </span>
          )}

          {!isOnline && (
            <span className="sb-hint">Will sync on reconnect</span>
          )}
          {isOnline && isUp === false && (
            <span className="sb-hint sb-hint--warn">Server unreachable — sync paused</span>
          )}

          <button
            className={`sb-sync-btn${isSyncing ? ' sb-sync-btn--syncing' : ''}${pendingCount === 0 && !isSyncing ? ' sb-sync-btn--idle' : ''}`}
            onClick={onSync}
            disabled={!canSync}
            title={
              !isOnline        ? 'No network — sync unavailable'
              : isUp === false ? 'Server unreachable'
              : pendingCount === 0 ? 'All records synced'
              : `Sync ${pendingCount} pending record${pendingCount !== 1 ? 's' : ''}`
            }
          >
            {isSyncing ? (
              <><span className="sb-spinner" />Syncing…</>
            ) : pendingCount > 0 ? (
              <>↑ Sync Now</>
            ) : (
              <>✓ Up to date</>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
