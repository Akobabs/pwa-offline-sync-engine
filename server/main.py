from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import List

from database import (
    init_db,
    get_all_records,
    get_record_by_client_id,
    upsert_record,
    get_record_count,
    log_sync_event,
)
from conflict import resolve_conflict

app = FastAPI(title="PWA Offline Sync API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()


# ─── Pydantic models ──────────────────────────────────────────────────────────

class RecordPayload(BaseModel):
    clientId: str
    title: str
    category: str = "general"
    notes: str = ""
    status: str = "open"
    priority: str = "medium"
    location: str = ""
    timestamp: str
    deviceId: str = ""


class SyncRequest(BaseModel):
    deviceId: str
    operations: List[RecordPayload]


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/status")
async def get_status():
    count = await get_record_count()
    return {
        "status": "online",
        "serverTime": datetime.now(timezone.utc).isoformat(),
        "recordCount": count,
        "version": "1.0.0",
    }


@app.get("/api/records")
async def get_records():
    records = await get_all_records()
    return {"records": records, "count": len(records)}


@app.post("/api/sync")
async def sync_data(payload: SyncRequest):
    results = []
    conflicts = 0

    for op in payload.operations:
        server_record = await get_record_by_client_id(op.clientId)

        client_dict = {
            "client_id": op.clientId,
            "title":     op.title,
            "category":  op.category,
            "notes":     op.notes,
            "status":    op.status,
            "priority":  op.priority,
            "location":  op.location,
            "timestamp": op.timestamp,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "device_id": op.deviceId,
        }

        resolved, strategy = resolve_conflict(client_dict, server_record)
        resolved["updated_at"] = datetime.now(timezone.utc).isoformat()

        saved = await upsert_record(resolved)

        if strategy in ("server_wins_lww", "server_wins_tie", "server_wins_parse_error"):
            conflicts += 1

        results.append({
            "clientId":   op.clientId,
            "serverId":   saved["id"] if saved else None,
            "status":     "synced",
            "resolution": strategy,
            "serverData": saved,
        })

    await log_sync_event(
        "sync",
        f"Synced {len(results)} record(s), {conflicts} conflict(s) resolved",
        len(results),
    )

    return {
        "synced":     len(results),
        "conflicts":  conflicts,
        "results":    results,
        "serverTime": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/simulate-conflict")
async def simulate_conflict():
    """Demo: update the most-recent server record with a newer timestamp to force LWW conflict."""
    records = await get_all_records()
    if not records:
        return {"message": "No server records yet — add and sync at least one record first."}

    target = records[0]
    # Give the server record a timestamp 1 minute in the future so it beats the client
    future_ts = (datetime.now(timezone.utc) + timedelta(minutes=1)).isoformat()

    await upsert_record({
        **target,
        "notes":      (target.get("notes", "") + " [SERVER MODIFIED for conflict demo]").strip(),
        "timestamp":  future_ts,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "message": (
            f"Record '{target['title']}' modified on server with a future timestamp. "
            "The next sync will trigger LWW conflict resolution — server will win."
        ),
        "clientId": target["client_id"],
        "newTimestamp": future_ts,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
