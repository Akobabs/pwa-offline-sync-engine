import { useCallback } from 'react'
import StatusBar  from './components/StatusBar.jsx'
import SyncPanel  from './components/SyncPanel.jsx'
import RecordForm from './components/RecordForm.jsx'
import RecordList from './components/RecordList.jsx'
import { useNetwork }      from './hooks/useNetwork.js'
import { useSync }         from './hooks/useSync.js'
import { useServerStatus } from './hooks/useServerStatus.js'

export default function App() {
  const isOnline = useNetwork()
  const { pendingCount, syncLog, lastSyncTime, isSyncing, triggerSync, refreshPending } =
    useSync(isOnline)

  // Auto-sync when server recovers from an outage
  const { serverStatus } = useServerStatus(triggerSync)

  const handleRecordAdded = useCallback(async () => {
    await refreshPending()
    if (isOnline && serverStatus.isUp) await triggerSync()
  }, [isOnline, serverStatus.isUp, triggerSync, refreshPending])

  return (
    <div className="app">
      {/* Sticky status bar */}
      <StatusBar
        isOnline={isOnline}
        serverStatus={serverStatus}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onSync={triggerSync}
      />

      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">
              <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
                <path d="M55 10L22 54h30L34 90l44-46H50L55 10z" fill="white"/>
              </svg>
            </div>
            <div className="logo-text">
              <h1>OfflineSync<span className="logo-pwa"> PWA</span></h1>
              <p>Field Data Collection &amp; Sync Engine</p>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="app-body">
        <SyncPanel
          pendingCount={pendingCount}
          syncLog={syncLog}
          lastSyncTime={lastSyncTime}
          isSyncing={isSyncing}
          onManualSync={triggerSync}
          isOnline={isOnline}
          serverStatus={serverStatus}
        />
        <main className="main-content">
          <RecordForm onAdded={handleRecordAdded} isOnline={isOnline} serverIsUp={serverStatus.isUp} />
          <RecordList />
        </main>
      </div>
    </div>
  )
}
