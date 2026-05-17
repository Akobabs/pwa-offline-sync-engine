# PWA Offline Sync Engine

A **Progressive Web App (PWA)** built as a research MVP demonstrating **offline-first data synchronization** with a custom **Last-Write-Wins (LWW) conflict resolution engine**.

Based on the paper: *"Design of a Progressive Web App (PWA) for Offline-First Data Synchronization"*

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  React 18 PWA  (Vite + vite-plugin-pwa + Workbox)       │
│                                                          │
│  ┌─────────────┐   ┌─────────────────┐   ┌──────────┐  │
│  │ Service     │   │  IndexedDB      │   │  Sync    │  │
│  │ Worker      │◄──│  (Dexie.js)     │──►│  Engine  │  │
│  │ Cache API   │   │  records        │   │  (LWW)   │  │
│  └─────────────┘   │  syncLog        │   └────┬─────┘  │
│                    └─────────────────┘        │         │
└───────────────────────────────────────────────┼─────────┘
                                                │ POST /api/sync
                                                ▼
                              ┌─────────────────────────────┐
                              │  FastAPI Server             │
                              │  ┌─────────────────────┐   │
                              │  │ conflict.py (LWW)   │   │
                              │  └─────────────────────┘   │
                              │  SQLite (sync.db)           │
                              └─────────────────────────────┘
```

## Key Features

| Feature | Implementation |
|---|---|
| Offline availability | Service Worker + IndexedDB (Dexie.js) |
| Background sync | `online` event + queued `pendingOps` |
| Conflict resolution | Last-Write-Wins (LWW) by ISO 8601 UTC timestamp |
| App installability | Web App Manifest + vite-plugin-pwa |
| Asset caching | Workbox pre-cache + runtime caching strategies |
| Demo conflict sim | `POST /api/simulate-conflict` endpoint |

## Quick Start

### Option 1 — PowerShell (Windows, one command)

```powershell
.\start.ps1
```

Then open [http://localhost:5173](http://localhost:5173)

### Option 2 — Manual

**Server (Python ≥ 3.11):**

```powershell
cd server
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Client (Node.js ≥ 18):**

```powershell
cd client
npm install
npm run dev
```

## Demo Walkthrough

1. **Online mode** — Submit a record. Watch it immediately sync (✓ Synced badge).
2. **Offline mode** — Open DevTools → Network tab → set throttling to **Offline**. Submit records. They get a ⏳ Pending badge and are queued in IndexedDB.
3. **Reconnect** — Restore network. The sync engine fires automatically. Pending records flip to ✓ Synced.
4. **Conflict demo** — Click **⚡ Simulate Server Conflict** in the sidebar (while online). This gives a server record a future timestamp. Then trigger sync — the server wins via LWW and the record shows ⚡ Conflict Resolved.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/status` | Server health + record count |
| `GET` | `/api/records` | All server records |
| `POST` | `/api/sync` | Batch sync with LWW conflict resolution |
| `POST` | `/api/simulate-conflict` | Demo: inject a server-side conflict |

## Project Structure

```
pwa-offline-sync-engine/
├── client/                   # React 18 PWA
│   ├── src/
│   │   ├── db.js             # Dexie IndexedDB schema & helpers
│   │   ├── api.js            # Fetch wrappers for FastAPI
│   │   ├── hooks/
│   │   │   ├── useNetwork.js # online/offline detection
│   │   │   └── useSync.js    # sync engine (queue → POST → resolve)
│   │   └── components/
│   │       ├── NetworkBadge.jsx
│   │       ├── SyncPanel.jsx
│   │       ├── RecordForm.jsx
│   │       └── RecordList.jsx
│   └── vite.config.js        # Vite + PWA + proxy config
└── server/                   # FastAPI backend
    ├── main.py               # API routes
    ├── conflict.py           # LWW algorithm
    └── database.py           # SQLite (aiosqlite)
```

## Tech Stack

**Client:** React 18 · Vite 5 · vite-plugin-pwa · Workbox 7 · Dexie.js 4

**Server:** FastAPI · Python 3.11 · aiosqlite · Pydantic v2

**Storage:** IndexedDB (client) · SQLite (server)
