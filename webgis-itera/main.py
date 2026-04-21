from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # Import ini
from contextlib import asynccontextmanager
from database import get_pool, close_pool
from routers.fasilitas import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    yield
    await close_pool()

app = FastAPI(title="WebGIS API ITERA", lifespan=lifespan)

# --- WAJIB TAMBAHIN INI BIAR BISA CONNECT KE REACT ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)
# ----------------------------------------------------

app.include_router(router)

