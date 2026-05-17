import aiosqlite
import os
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "sync.db")


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS records (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id   TEXT UNIQUE NOT NULL,
                title       TEXT NOT NULL,
                category    TEXT DEFAULT 'general',
                notes       TEXT DEFAULT '',
                status      TEXT DEFAULT 'open',
                priority    TEXT DEFAULT 'medium',
                location    TEXT DEFAULT '',
                timestamp   TEXT NOT NULL,
                updated_at  TEXT NOT NULL,
                device_id   TEXT DEFAULT ''
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sync_log (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type   TEXT NOT NULL,
                detail       TEXT,
                record_count INTEGER DEFAULT 0,
                created_at   TEXT NOT NULL
            )
        """)
        await db.commit()


async def get_all_records():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM records ORDER BY updated_at DESC") as cur:
            return [dict(r) for r in await cur.fetchall()]


async def get_record_by_client_id(client_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM records WHERE client_id = ?", (client_id,)
        ) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def upsert_record(record: dict) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO records
                (client_id, title, category, notes, status, priority, location, timestamp, updated_at, device_id)
            VALUES
                (:client_id, :title, :category, :notes, :status, :priority, :location, :timestamp, :updated_at, :device_id)
            ON CONFLICT(client_id) DO UPDATE SET
                title      = excluded.title,
                category   = excluded.category,
                notes      = excluded.notes,
                status     = excluded.status,
                priority   = excluded.priority,
                location   = excluded.location,
                timestamp  = excluded.timestamp,
                updated_at = excluded.updated_at,
                device_id  = excluded.device_id
            """,
            record,
        )
        await db.commit()
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM records WHERE client_id = ?", (record["client_id"],)
        ) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def get_record_count() -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT COUNT(*) FROM records") as cur:
            row = await cur.fetchone()
            return row[0] if row else 0


async def log_sync_event(event_type: str, detail: str, record_count: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO sync_log (event_type, detail, record_count, created_at) VALUES (?, ?, ?, ?)",
            (event_type, detail, record_count, datetime.now(timezone.utc).isoformat()),
        )
        await db.commit()
