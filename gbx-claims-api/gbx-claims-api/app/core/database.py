"""
app/core/database.py
Azure SQL connection pool.
  - Production (AKS):  Managed Identity — no password, token injected automatically
  - Local dev:         SQL auth via DB_USER / DB_PASSWORD in .env
"""

import struct
import pyodbc
import threading
import logging
from contextlib import contextmanager
from azure.identity import DefaultAzureCredential
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Thread-safe simple connection pool ───────────────────────────────────────

_pool: list[pyodbc.Connection] = []
_pool_lock = threading.Lock()


def _get_msi_token() -> str:
    """
    Fetch a short-lived AAD access token for Azure SQL using Managed Identity.
    DefaultAzureCredential works in AKS (Workload Identity) and locally
    (az login / environment vars) without code changes.
    """
    credential = DefaultAzureCredential()
    token = credential.get_token("https://database.windows.net/.default")
    return token.token


def _build_connection() -> pyodbc.Connection:
    if settings.DB_USE_MSI:
        # Convert the bearer token to the byte struct pyodbc expects
        token_bytes = _get_msi_token().encode("utf-16-le")
        token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)
        conn_str = (
            f"DRIVER={{{settings.DB_DRIVER}}};"
            f"SERVER={settings.DB_SERVER};"
            f"DATABASE={settings.DB_NAME};"
            "Encrypt=yes;TrustServerCertificate=no;"
        )
        conn = pyodbc.connect(conn_str, attrs_before={1256: token_struct})
    else:
        # Local dev — SQL auth
        conn_str = (
            f"DRIVER={{{settings.DB_DRIVER}}};"
            f"SERVER={settings.DB_SERVER};"
            f"DATABASE={settings.DB_NAME};"
            f"UID={settings.DB_USER};"
            f"PWD={settings.DB_PASSWORD};"
            "Encrypt=yes;TrustServerCertificate=no;"
        )
        conn = pyodbc.connect(conn_str)

    conn.autocommit = False
    return conn


def get_connection() -> pyodbc.Connection:
    with _pool_lock:
        if _pool:
            conn = _pool.pop()
            try:
                conn.execute("SELECT 1")   # liveness check
                return conn
            except pyodbc.Error:
                logger.warning("Stale connection discarded — creating new one")

    return _build_connection()


def release_connection(conn: pyodbc.Connection) -> None:
    with _pool_lock:
        if len(_pool) < settings.DB_POOL_SIZE:
            _pool.append(conn)
        else:
            conn.close()


@contextmanager
def db_cursor():
    """
    Usage:
        with db_cursor() as cur:
            cur.execute(...)
    Commits on success, rolls back on exception, always returns connection to pool.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        release_connection(conn)
