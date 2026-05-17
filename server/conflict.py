from datetime import datetime
from typing import Any


def resolve_conflict(
    client_record: dict[str, Any],
    server_record: dict[str, Any] | None,
) -> tuple[dict[str, Any], str]:
    """
    Last-Write-Wins (LWW) conflict resolution.
    Returns (winning_record, resolution_label).
    On timestamp tie, server is authoritative.
    """
    if server_record is None:
        return client_record, "inserted"

    try:
        client_ts = datetime.fromisoformat(client_record.get("timestamp", "1970-01-01T00:00:00"))
        server_ts = datetime.fromisoformat(server_record.get("timestamp", "1970-01-01T00:00:00"))
    except ValueError:
        return server_record, "server_wins_parse_error"

    if client_ts > server_ts:
        return client_record, "client_wins_lww"
    elif server_ts > client_ts:
        return server_record, "server_wins_lww"
    else:
        return server_record, "server_wins_tie"
