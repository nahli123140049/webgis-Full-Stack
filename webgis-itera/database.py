import asyncpg
import os
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()
pool = None


def _build_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    host = os.getenv("PGHOST", "localhost")
    port = os.getenv("PGPORT", "5432")
    user = os.getenv("PGUSER", "postgres")
    password = quote_plus(os.getenv("PGPASSWORD", ""))
    database = os.getenv("PGDATABASE", "postgres")
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"

async def get_pool():
    global pool
    if pool is None:
        database_url = _build_database_url()
        try:
            pool = await asyncpg.create_pool(database_url, min_size=2, max_size=20)
        except Exception as exc:
            raise RuntimeError(
                "Gagal konek ke PostgreSQL. Pastikan database pgAdmin aktif dan konfigurasi .env valid."
            ) from exc
    return pool

async def close_pool():
    global pool
    if pool:
        await pool.close()
        pool = None