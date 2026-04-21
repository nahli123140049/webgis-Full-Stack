import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMapEvents } from 'react-leaflet'
import api from '../config/api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function MapClickHandler({ onPick }) {
  useMapEvents({
    click: (event) => {
      onPick(event.latlng)
    },
  })

  return null
}

function MapView() {
  const [geojsonData, setGeojsonData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [mapInstance, setMapInstance] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState({
    nama: '',
    jenis: 'Gedung',
    alamat: '',
    longitude: '',
    latitude: '',
  })

  const fetchGeojson = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      const response = await api.get('/fasilitas/geojson')
      setGeojsonData(response.data)
      setError('')
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Terjadi kesalahan saat mengambil data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const loadInitialData = async () => {
      try {
        const response = await api.get('/fasilitas/geojson')
        if (!isMounted) return
        setGeojsonData(response.data)
        setError('')
      } catch (err) {
        if (!isMounted) return
        const message = err.response?.data?.detail || err.message || 'Terjadi kesalahan saat mengambil data'
        setError(message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadInitialData()

    return () => {
      isMounted = false
    }
  }, [])

  const handleRetry = () => {
    fetchGeojson(true)
  }

  const resetForm = () => {
    setForm({
      nama: '',
      jenis: 'Gedung',
      alamat: '',
      longitude: '',
      latitude: '',
    })
    setEditingId(null)
    setFormError('')
    setIsFormOpen(false)
  }

  const getColor = (jenis) => {
    switch (jenis) {
      case 'Masjid': return '#10B981'
      case 'Gedung': return '#F59E0B'
      case 'Embung': return '#0EA5E9'
      case 'Labtek': return '#8B5CF6'
      default: return '#64748B'
    }
  }

  const facilities = useMemo(() => {
    if (!geojsonData?.features) return []
    return geojsonData.features
      .map((feature) => {
        const coordinates = feature.geometry?.coordinates || []
        const [longitude, latitude] = coordinates
        return {
          id: feature.properties?.id,
          nama: feature.properties?.nama || 'Tanpa Nama',
          jenis: feature.properties?.jenis || 'Lainnya',
          alamat: feature.properties?.alamat || '-',
          latitude,
          longitude,
          raw: feature,
        }
      })
      .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
  }, [geojsonData])

  const filteredFacilities = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return facilities
    return facilities.filter((item) => item.nama.toLowerCase().includes(keyword))
  }, [facilities, search])

  const flyToFacility = (facility) => {
    if (!mapInstance) return
    mapInstance.flyTo([facility.latitude, facility.longitude], 18, {
      duration: 1.25,
    })
    setActiveId(facility.id)
  }

  const handleEdit = (facility) => {
    setEditingId(facility.id)
    setIsFormOpen(true)
    setForm({
      nama: facility.nama || '',
      jenis: facility.jenis || 'Gedung',
      alamat: facility.alamat === '-' ? '' : facility.alamat || '',
      longitude: String(facility.longitude),
      latitude: String(facility.latitude),
    })
    setFormError('')
    flyToFacility(facility)
  }

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Yakin ingin menghapus fasilitas ini?')
    if (!confirmed) return

    try {
      setSubmitting(true)
      await api.delete(`/fasilitas/${id}`)
      await fetchGeojson()
      if (editingId === id) resetForm()
      if (activeId === id) setActiveId(null)
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Gagal menghapus data'
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = {
      nama: form.nama.trim(),
      jenis: form.jenis.trim(),
      alamat: form.alamat.trim() || null,
      longitude: Number(form.longitude),
      latitude: Number(form.latitude),
    }

    if (!payload.nama || !payload.jenis) {
      setFormError('Nama dan jenis wajib diisi')
      return
    }

    if (!Number.isFinite(payload.longitude) || !Number.isFinite(payload.latitude)) {
      setFormError('Longitude dan latitude harus berupa angka valid')
      return
    }

    if (payload.longitude < -180 || payload.longitude > 180 || payload.latitude < -90 || payload.latitude > 90) {
      setFormError('Koordinat di luar rentang valid (lon -180..180, lat -90..90)')
      return
    }

    try {
      setSubmitting(true)
      setFormError('')
      if (editingId) {
        await api.put(`/fasilitas/${editingId}`, payload)
      } else {
        await api.post('/fasilitas/', payload)
      }
      await fetchGeojson()
      resetForm()
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Gagal menyimpan data'
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleMapPick = (latlng) => {
    setForm((prev) => ({
      ...prev,
      longitude: latlng.lng.toFixed(6),
      latitude: latlng.lat.toFixed(6),
    }))
    setFormError('')
  }

  const pickedLongitude = Number(form.longitude)
  const pickedLatitude = Number(form.latitude)
  const hasPickedCoordinates = Number.isFinite(pickedLongitude) && Number.isFinite(pickedLatitude)

  const pointToLayer = (feature, latlng) => {
    return L.circleMarker(latlng, {
      radius: 9,
      fillColor: getColor(feature.properties.jenis),
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    })
  }

  const onEachFeature = (feature, layer) => {
    const jenisColor = getColor(feature.properties.jenis)
    layer.bindPopup(`
      <div style="font-family: 'Space Grotesk', sans-serif; min-width: 220px; padding: 2px 0;">
        <h3 style="margin:0; color:#0f172a; font-size: 1rem;">${feature.properties.nama}</h3>
        <p style="margin: 6px 0 8px; color: ${jenisColor}; font-weight: 700; font-size: 0.875rem;">
          ${feature.properties.jenis}
        </p>
        <p style="margin:0; color:#334155; font-size: 0.875rem; line-height: 1.3;">
          ${feature.properties.alamat || '-'}
        </p>
      </div>
    `)

    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 4, fillOpacity: 1 })
      },
      mouseout: (e) => {
        e.target.setStyle({ weight: 2, fillOpacity: 0.8 })
      },
      click: (e) => {
        const map = e.target._map
        map.flyTo(e.latlng, 18, { duration: 1.25 })
        setActiveId(feature.properties.id)
      }
    })
  }

  const legendItems = [
    { label: 'Masjid', color: '#10B981' },
    { label: 'Gedung', color: '#F59E0B' },
    { label: 'Embung', color: '#0EA5E9' },
    { label: 'Labtek', color: '#8B5CF6' },
  ]

  return (
    <section className="relative h-full bg-[radial-gradient(circle_at_15%_20%,_#bbf7d0_0%,_rgba(187,247,208,0)_42%),radial-gradient(circle_at_88%_12%,_#bae6fd_0%,_rgba(186,230,253,0)_35%),linear-gradient(135deg,_#f8fafc_0%,_#e2e8f0_100%)] p-3 sm:p-6">
      <div
        className={`grid h-full gap-3 lg:gap-6 ${
          isSidebarOpen ? 'grid-cols-1 lg:grid-cols-[360px_1fr]' : 'grid-cols-1'
        }`}
      >
        {isSidebarOpen && (
          <aside className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/50 p-5 shadow-xl backdrop-blur-xl">
          <div className="pointer-events-none absolute -top-16 right-0 h-48 w-48 rounded-full bg-emerald-300/25 blur-2xl" />
          <div className="relative flex h-full flex-col">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">WebGIS Smart Campus</p>
              <h1 className="font-heading mt-2 text-2xl font-bold text-slate-800">Daftar Fasilitas ITERA</h1>
              <p className="mt-1 text-sm text-slate-600">CRUD aktif: tambah, edit, hapus, dan klik untuk terbang ke peta.</p>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200/80 bg-white/70 p-3">
              <button
                type="button"
                onClick={() => setIsFormOpen((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {editingId ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
                </span>
                <span className="text-xs font-bold text-emerald-700">
                  {isFormOpen ? 'Tutup' : 'Buka'}
                </span>
              </button>

              {isFormOpen && (
                <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {editingId ? 'Mode Edit Aktif' : 'Form Input'}
                    </p>
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="text-xs font-semibold text-slate-500 transition hover:text-slate-700"
                      >
                        Batal Edit
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={form.nama}
                    onChange={(event) => setForm((prev) => ({ ...prev, nama: event.target.value }))}
                    placeholder="Nama fasilitas"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={form.jenis}
                      onChange={(event) => setForm((prev) => ({ ...prev, jenis: event.target.value }))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                    >
                      <option value="Gedung">Gedung</option>
                      <option value="Masjid">Masjid</option>
                      <option value="Embung">Embung</option>
                      <option value="Labtek">Labtek</option>
                    </select>

                    <input
                      type="text"
                      value={form.alamat}
                      onChange={(event) => setForm((prev) => ({ ...prev, alamat: event.target.value }))}
                      placeholder="Alamat"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="any"
                      value={form.longitude}
                      onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}
                      placeholder="Longitude"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                    />

                    <input
                      type="number"
                      step="any"
                      value={form.latitude}
                      onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))}
                      placeholder="Latitude"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                  <p className="text-[11px] font-medium text-slate-500">
                    Tip: klik area peta untuk mengisi koordinat otomatis.
                  </p>

                  {formError && <p className="text-xs font-semibold text-rose-600">{formError}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Menyimpan...' : editingId ? 'Update Fasilitas' : 'Tambah Fasilitas'}
                  </button>
                </form>
              )}
            </div>

            <div className="mt-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama Bangunan..."
                className="w-full rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="mt-4 flex-1 overflow-hidden">
              {loading && (
                <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">Memuat data fasilitas...</div>
              )}

              {!loading && error && (
                <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm text-rose-700">Gagal mengambil data: {error}</p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    Coba Lagi
                  </button>
                </div>
              )}

              {!loading && !error && (
                <ul className="h-full space-y-2 overflow-y-auto pr-1">
                  {filteredFacilities.length === 0 && (
                    <li className="rounded-xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
                      Tidak ada fasilitas yang cocok dengan pencarian.
                    </li>
                  )}

                  {filteredFacilities.map((facility) => (
                    <li key={facility.id}>
                      <div
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          activeId === facility.id
                            ? 'border-emerald-300 bg-emerald-50 shadow-md'
                            : 'border-slate-200 bg-white/75 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md'
                        }`}
                      >
                        <button type="button" onClick={() => flyToFacility(facility)} className="w-full text-left">
                          <p className="text-sm font-bold text-slate-800">{facility.nama}</p>
                          <p className="mt-1 text-xs font-semibold" style={{ color: getColor(facility.jenis) }}>
                            {facility.jenis}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">{facility.alamat}</p>
                        </button>

                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(facility)}
                            disabled={submitting}
                            className="rounded-md bg-sky-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(facility.id)}
                            disabled={submitting}
                            className="rounded-md bg-rose-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          </aside>
        )}

        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <MapContainer
            center={[-5.3604, 105.3117]}
            zoom={15}
            className="h-full w-full"
            whenReady={(event) => setMapInstance(event.target)}
          >
            <MapClickHandler onPick={handleMapPick} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {geojsonData && (
              <GeoJSON
                data={geojsonData}
                pointToLayer={pointToLayer}
                onEachFeature={onEachFeature}
              />
            )}
            {hasPickedCoordinates && (
              <CircleMarker
                center={[pickedLatitude, pickedLongitude]}
                radius={8}
                pathOptions={{ color: '#0f172a', fillColor: '#22c55e', fillOpacity: 0.85, weight: 2 }}
              >
                <Popup>
                  Koordinat terpilih: {pickedLatitude.toFixed(6)}, {pickedLongitude.toFixed(6)}
                </Popup>
              </CircleMarker>
            )}
          </MapContainer>

          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="absolute left-4 top-4 z-[1000] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 shadow-lg transition hover:bg-white"
          >
            {isSidebarOpen ? 'Tutup Panel' : 'WebGIS Smart Campus'}
          </button>

          <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl border border-slate-200/80 bg-white/90 p-3 shadow-lg backdrop-blur">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">Legend</h3>
            <ul className="space-y-1.5">
              {legendItems.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-xs text-slate-700">
                  <span
                    className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-300"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MapView