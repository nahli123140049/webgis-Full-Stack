from fastapi import APIRouter, HTTPException
from database import get_pool
from models import FasilitasCreate
import json

router = APIRouter(
    prefix="/api/fasilitas",
    tags=["Fasilitas"]
)

# 1. GeoJSON ditaruh PALING ATAS agar tidak tertukar dengan {id}
@router.get("/geojson")
async def get_fasilitas_geojson():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, nama, jenis, alamat, ST_AsGeoJSON(geom) as geom FROM fasilitas")
        
        features = []
        for row in rows:
            features.append({
                "type": "Feature",
                "geometry": json.loads(row["geom"]),
                "properties": {
                    "id": row["id"],
                    "nama": row["nama"],
                    "jenis": row["jenis"],
                    "alamat": row["alamat"]
                }
            })
        return {"type": "FeatureCollection", "features": features}

# 2. Endpoint Semua Data
@router.get("/")
async def get_all_fasilitas():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT id, nama, jenis, 
            ST_AsGeoJSON(geom) as geom 
            FROM fasilitas LIMIT 100
        """)
        return [dict(row) for row in rows]

# 3. Endpoint Nearby (Cari Terdekat)
@router.get("/nearby")
async def get_nearby(lat: float, lon: float, radius: int = 1000):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT id, nama, jenis, 
            ROUND(ST_Distance(geom::geography, ST_Point($1, $2)::geography)::numeric) as jarak_m
            FROM fasilitas
            WHERE ST_DWithin(geom::geography, ST_Point($1, $2)::geography, $3)
            ORDER BY jarak_m
        """, lon, lat, radius)
        return [dict(row) for row in rows]

# 4. Endpoint Detail Berdasarkan ID (Taruh di bawah geojson)
@router.get("/{id}")
async def get_fasilitas_by_id(id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT id, nama, jenis, alamat, 
            ST_X(geom) as longitude, 
            ST_Y(geom) as latitude 
            FROM fasilitas WHERE id=$1
        """, id)
        if not row:
            raise HTTPException(status_code=404, detail="Fasilitas tidak ditemukan")
        return dict(row)

# 5. Endpoint Create Data (POST)
@router.post("/", status_code=201)
async def create_fasilitas(data: FasilitasCreate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            INSERT INTO fasilitas (nama, jenis, alamat, geom)
            VALUES ($1, $2, $3, ST_SetSRID(ST_Point($4, $5), 4326))
            RETURNING id, nama, jenis, alamat, ST_X(geom) as longitude, ST_Y(geom) as latitude
        """, data.nama, data.jenis, data.alamat, data.longitude, data.latitude)
        return dict(row)

# 6. Endpoint Update Data (PUT)
@router.put("/{id}")
async def update_fasilitas(id: int, data: FasilitasCreate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            UPDATE fasilitas
            SET nama = $1,
                jenis = $2,
                alamat = $3,
                geom = ST_SetSRID(ST_Point($4, $5), 4326)
            WHERE id = $6
            RETURNING id, nama, jenis, alamat, ST_X(geom) as longitude, ST_Y(geom) as latitude
        """, data.nama, data.jenis, data.alamat, data.longitude, data.latitude, id)
        if not row:
            raise HTTPException(status_code=404, detail="Fasilitas tidak ditemukan")
        return dict(row)


# 7. Endpoint Hapus Data (DELETE)
@router.delete("/{id}")
async def delete_fasilitas(id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM fasilitas WHERE id = $1", id)
        deleted_count = int(result.split(" ")[-1])
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Fasilitas tidak ditemukan")
        return {"message": "Fasilitas berhasil dihapus", "id": id}