"""
Persistence Layer.

NeuroMind uses SQLite (via the standard library, async-wrapped) as a
lightweight but REAL persistence layer. This makes the "Enterprise
Memory" and "Organizational Learning Engine" claims literally true:

- Every investigation run is stored and can be retrieved later.
- Every "learning" generated from an incident is written to the
  `learnings` table and is returned by /api/memory-graph/learnings on
  subsequent requests (including after a process restart).
- Agent memory (past investigations, confidence trends) is persisted
  per-agent so /api/agents reflects real historical activity, not a
  static dict.
- Security containment actions and incident state changes are written
  to the database, so refreshing the page reflects the new state.
- Every state-changing action is recorded in `audit_log` with the
  acting principal, for the security/audit story.

The schema is intentionally simple (a handful of tables, no ORM) so it
is easy to inspect, migrate to Postgres later (the SQL is
Postgres-compatible), or swap for a managed database without touching
calling code beyond the connection string.
"""
import json
import os
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

DB_PATH = os.getenv("NEUROMIND_DB_PATH", str(Path(__file__).resolve().parent.parent / "neuromind.db"))

_SCHEMA = """
CREATE TABLE IF NOT EXISTS investigations (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    scenario TEXT,
    state_json TEXT NOT NULL,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS learnings (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL,
    title TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    resolution TEXT NOT NULL,
    lessons_learned TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'seed',
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_memory (
    agent_id TEXT NOT NULL,
    investigation_id TEXT NOT NULL,
    finding TEXT NOT NULL,
    confidence REAL,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS incident_state (
    incident_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS security_state (
    event_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    contained_at REAL,
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    detail TEXT,
    created_at REAL NOT NULL
);
"""


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Defensive: ensure the schema exists on every connection. This is a
    # cheap idempotent no-op once tables exist, and protects against the
    # case where init_db()'s startup hook didn't run for some reason
    # (e.g. an ASGI server that doesn't fire on_event("startup"), or a
    # test harness that calls db functions directly).
    conn.executescript(_SCHEMA)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Create tables if they don't exist and seed initial learnings
    from the bundled past-incident dataset on first run."""
    with get_conn() as conn:
        conn.executescript(_SCHEMA)

        existing = conn.execute("SELECT COUNT(*) AS c FROM learnings").fetchone()["c"]
        if existing == 0:
            from app.data import mock_data as md
            now = time.time()
            for inc in md.PAST_INCIDENTS:
                conn.execute(
                    """INSERT INTO learnings
                       (id, incident_id, title, root_cause, resolution,
                        lessons_learned, source, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, 'seed', ?)""",
                    (
                        f"LRN-{inc['id']}",
                        inc["id"],
                        inc["title"],
                        inc["root_cause"],
                        inc["resolution"],
                        inc["lessons_learned"],
                        now - inc["resolved_days_ago"] * 86400,
                    ),
                )

        existing_inc = conn.execute("SELECT COUNT(*) AS c FROM incident_state").fetchone()["c"]
        if existing_inc == 0:
            from app.data import mock_data as md
            now = time.time()
            for inc in md.ACTIVE_INCIDENTS:
                conn.execute(
                    "INSERT INTO incident_state (incident_id, status, updated_at) VALUES (?, ?, ?)",
                    (inc["id"], "open", now),
                )

        existing_sec = conn.execute("SELECT COUNT(*) AS c FROM security_state").fetchone()["c"]
        if existing_sec == 0:
            from app.data import mock_data as md
            now = time.time()
            for ev in md.SECURITY_EVENTS:
                conn.execute(
                    "INSERT INTO security_state (event_id, status, updated_at) VALUES (?, ?, ?)",
                    (ev["id"], ev.get("status", "investigating"), now),
                )


# ---------------------------------------------------------------------------
# Investigations
# ---------------------------------------------------------------------------

def save_investigation(investigation_id: str, question: str, scenario: str, state: dict):
    with get_conn() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO investigations (id, question, scenario, state_json, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (investigation_id, question, scenario, json.dumps(state), time.time()),
        )


def get_investigation(investigation_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM investigations WHERE id = ?", (investigation_id,)
        ).fetchone()
        return dict(row) if row else None


def list_investigations(limit: int = 20) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, question, scenario, created_at FROM investigations "
            "ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Learnings (Organizational Learning Engine)
# ---------------------------------------------------------------------------

def add_learning(incident_id: str, title: str, root_cause: str, resolution: str,
                  lessons_learned: str, source: str = "investigation") -> dict:
    learning_id = f"LRN-{incident_id}-{int(time.time())}"
    now = time.time()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO learnings
               (id, incident_id, title, root_cause, resolution, lessons_learned, source, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (learning_id, incident_id, title, root_cause, resolution, lessons_learned, source, now),
        )
    return {
        "id": learning_id,
        "incident_id": incident_id,
        "title": title,
        "root_cause": root_cause,
        "resolution": resolution,
        "lessons_learned": lessons_learned,
        "source": source,
        "resolved_days_ago": 0,
    }


def list_learnings() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM learnings ORDER BY created_at DESC"
        ).fetchall()
        now = time.time()
        out = []
        for r in rows:
            d = dict(r)
            d["resolved_days_ago"] = max(0, int((now - d["created_at"]) / 86400))
            out.append(d)
        return out


# ---------------------------------------------------------------------------
# Agent memory
# ---------------------------------------------------------------------------

def record_agent_finding(agent_id: str, investigation_id: str, finding: str, confidence: float | None):
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO agent_memory (agent_id, investigation_id, finding, confidence, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (agent_id, investigation_id, finding, confidence, time.time()),
        )


def get_agent_memory(agent_id: str, limit: int = 5) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT * FROM agent_memory WHERE agent_id = ?
               ORDER BY created_at DESC LIMIT ?""",
            (agent_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]


def count_agent_runs(agent_id: str) -> int:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS c FROM agent_memory WHERE agent_id = ?", (agent_id,)
        ).fetchone()
        return row["c"]


# ---------------------------------------------------------------------------
# Incident state
# ---------------------------------------------------------------------------

def set_incident_status(incident_id: str, status: str):
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO incident_state (incident_id, status, updated_at)
               VALUES (?, ?, ?)
               ON CONFLICT(incident_id) DO UPDATE SET status = excluded.status,
                                                        updated_at = excluded.updated_at""",
            (incident_id, status, time.time()),
        )


def get_incident_status(incident_id: str) -> str:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT status FROM incident_state WHERE incident_id = ?", (incident_id,)
        ).fetchone()
        return row["status"] if row else "open"


def get_all_incident_status() -> dict:
    with get_conn() as conn:
        rows = conn.execute("SELECT incident_id, status FROM incident_state").fetchall()
        return {r["incident_id"]: r["status"] for r in rows}


# ---------------------------------------------------------------------------
# Security state
# ---------------------------------------------------------------------------

def set_security_status(event_id: str, status: str):
    now = time.time()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO security_state (event_id, status, contained_at, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(event_id) DO UPDATE SET status = excluded.status,
                                                     contained_at = excluded.contained_at,
                                                     updated_at = excluded.updated_at""",
            (event_id, status, now if status == "contained" else None, now),
        )


def get_security_status(event_id: str) -> str:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT status FROM security_state WHERE event_id = ?", (event_id,)
        ).fetchone()
        return row["status"] if row else "investigating"


def get_all_security_status() -> dict:
    with get_conn() as conn:
        rows = conn.execute("SELECT event_id, status FROM security_state").fetchall()
        return {r["event_id"]: r["status"] for r in rows}


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

def write_audit(actor: str, action: str, target: str | None = None, detail: str | None = None):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO audit_log (actor, action, target, detail, created_at) VALUES (?, ?, ?, ?, ?)",
            (actor, action, target, detail, time.time()),
        )


def list_audit(limit: int = 50) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]
