# WebGIS Smart Campus ITERA

Aplikasi WebGIS full-stack untuk mengelola fasilitas kampus dengan FastAPI (backend), PostgreSQL/PostGIS (database), dan React + Vite (frontend).

## Fitur Utama

- Backend FastAPI + PostGIS dengan CRUD fasilitas (GET, POST, PUT, DELETE)
- Endpoint GeoJSON valid FeatureCollection untuk visualisasi peta
- Dashboard peta modern dengan Leaflet + Tailwind CSS
- Tampilan awal full map, panel kiri dibuka melalui tombol WebGIS Smart Campus
- Sidebar list fasilitas + search + flyTo ke titik fasilitas
- Form CRUD fasilitas model dropdown/collapse agar hemat ruang
- Klik peta untuk auto isi longitude dan latitude
- Marker warna dinamis + popup detail + legend

## Struktur Project

- `webgis-itera/` : Backend FastAPI + koneksi PostgreSQL/PostGIS
- `webgis-frontend/` : Frontend React + Leaflet + Tailwind CSS
- `screenshots/` : Tempat menyimpan screenshot dokumentasi tugas

## Prasyarat

Pastikan sudah terpasang:

- Python 3.10+
- Node.js 18+
- PostgreSQL + PostGIS (server dikelola via pgAdmin4)

## Setup Backend

1. Masuk ke folder backend.

```powershell
cd webgis-itera
```

2. Buat/aktifkan virtual environment (opsional tapi direkomendasikan).

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
```

3. Install dependency backend.

```powershell
py -m pip install fastapi uvicorn asyncpg python-dotenv
```

4. Pastikan file `.env` di folder `webgis-itera` berisi koneksi database yang benar.

Contoh:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/webgis_db
```

5. Jalankan backend.

```powershell
py -m uvicorn main:app --app-dir D:\webgis-itera-fullstack\webgis-itera --reload --host 0.0.0.0 --port 8000
```

6. Cek backend:

- API docs: http://localhost:8000/docs
- GeoJSON endpoint: http://localhost:8000/api/fasilitas/geojson

## Setup Frontend

1. Buka terminal baru, lalu masuk ke folder frontend.

```powershell
cd webgis-frontend
```

2. Install dependency frontend.

```powershell
npm install
```

3. Jalankan frontend.

```powershell
npm run dev -- --host 0.0.0.0 --port 5174
```

4. Buka aplikasi di browser:

- http://localhost:5174

## Catatan CORS

Jika frontend berjalan di port berbeda (misalnya 5173 atau 5174), backend harus mengizinkan origin tersebut pada middleware CORS di `webgis-itera/main.py`.

## Endpoint Backend

- GET /api/fasilitas/geojson
- GET /api/fasilitas/
- GET /api/fasilitas/{id}
- POST /api/fasilitas/
- PUT /api/fasilitas/{id}
- DELETE /api/fasilitas/{id}

## Screenshot

Semua screenshot disimpan di folder `screenshots/`.

### 1. Tampilan Peta Utama

![Tampilan Peta Utama](screenshots/01-Peta.png)

### 2. List Fasilitas

![List Fasilitas](screenshots/02-list-fasilitas.png)

### 3. Popup Marker

![Popup Marker](screenshots/03-popup-marker.png)

### 4. Form Tambah/Edit Fasilitas

![Form Tambah Edit](screenshots/04-form-tambah-edit.png)

## Menjalankan Full-Stack (Ringkas)

- Terminal 1 (backend): jalankan FastAPI di port 8000
- Terminal 2 (frontend): jalankan Vite di port 5174
- Pastikan backend aktif dulu, lalu frontend

## Troubleshooting Singkat

- `uvicorn is not recognized`:
  - Jalankan via module: `py -m uvicorn ...`
- CORS blocked:
  - Pastikan origin frontend (contoh `http://localhost:5174`) diizinkan di backend
- Data tidak muncul di peta:
  - Cek endpoint `http://localhost:8000/api/fasilitas/geojson`
  - Pastikan tabel `fasilitas` di database berisi data
- Backend gagal login ke PostgreSQL:
  - Cek kembali `DATABASE_URL` di `.env` (username/password/database)

## Identitas
- Nama: Nahli Saud Ramdani
- NIM: 123140049