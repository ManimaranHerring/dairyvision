import { useState, useEffect, useRef } from 'react'
import { farmersAPI } from '../api/index.js'

const CROP_CHOICES = [
  ['paddy','Paddy / Rice'],['maize','Maize / Corn'],
  ['sorghum','Sorghum / Jowar'],['napier','Napier Grass'],
  ['sugarcane','Sugarcane'],['cotton','Cotton'],
  ['groundnut','Groundnut'],['other','Other'],
]

export default function AddFarmWithMap({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name:'', crop_type:'paddy', area_acres:'',
    latitude:'', longitude:'', sowing_date:'',
  })
  const [busy, setBusy]       = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [useMap, setUseMap]   = useState(false)
  const [gpsMsg, setGpsMsg]   = useState('')
  const mapRef    = useRef(null)
  const markerRef = useRef(null)
  const mapObjRef = useRef(null)

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  // Load Leaflet CSS dynamically
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id   = 'leaflet-css'
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    // Load Leaflet JS
    if (window.L) { setMapReady(true); return }
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setMapReady(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!useMap || !mapReady || mapObjRef.current) return
    const L   = window.L
    const lat = parseFloat(form.latitude) || 9.9252
    const lng = parseFloat(form.longitude) || 78.1198
    const map = L.map(mapRef.current).setView([lat, lng], 13)
    mapObjRef.current = map

    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenStreetMap', maxZoom: 19 })
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© Esri', maxZoom: 19 })
    street.addTo(map)
    L.control.layers({'Street': street, 'Satellite': satellite}).addTo(map)

    const icon = L.divIcon({
      html: '<div style="background:#0F6E56;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
      iconSize:[22,22], iconAnchor:[11,11], className:'',
    })
    const marker = L.marker([lat, lng], { draggable:true, icon }).addTo(map)
    marker.bindPopup('<b>Farm location</b><br>Drag to move').openPopup()
    markerRef.current = marker

    const updateCoords = (newLat, newLng) => {
      set('latitude',  parseFloat(newLat.toFixed(6)).toString())
      set('longitude', parseFloat(newLng.toFixed(6)).toString())
    }

    map.on('click', e => {
      marker.setLatLng(e.latlng)
      updateCoords(e.latlng.lat, e.latlng.lng)
    })
    marker.on('dragend', () => {
      const p = marker.getLatLng()
      updateCoords(p.lat, p.lng)
    })
  }, [useMap, mapReady])

  const detectGPS = () => {
    if (!navigator.geolocation) { setGpsMsg('GPS not available'); return }
    setGpsMsg('Detecting...')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6))
        const lng = parseFloat(pos.coords.longitude.toFixed(6))
        set('latitude',  lat.toString())
        set('longitude', lng.toString())
        setGpsMsg(`Detected: ${lat}, ${lng}`)
        if (mapObjRef.current && markerRef.current) {
          mapObjRef.current.setView([lat, lng], 16)
          markerRef.current.setLatLng([lat, lng])
        }
      },
      () => setGpsMsg('Could not detect. Enter manually.'),
      { enableHighAccuracy:true, timeout:10000 }
    )
  }

  const submit = async e => {
    e.preventDefault(); setBusy(true)
    try { await farmersAPI.createFarm(form); onSaved(); onClose() }
    catch (ex) { alert('Error: ' + JSON.stringify(ex.response?.data)) }
    finally { setBusy(false) }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-head">
          <h3>Register farm plot</h3>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Farm / plot name *</label>
              <input className="form-input" placeholder="e.g. Main Field, North Plot"
                value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Crop type *</label>
                <select className="form-select" value={form.crop_type}
                  onChange={e => set('crop_type', e.target.value)}>
                  {CROP_CHOICES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Area (acres) *</label>
                <input className="form-input" type="number" step="0.1"
                  placeholder="2.5" value={form.area_acres}
                  onChange={e => set('area_acres', e.target.value)} required />
              </div>
            </div>

            {/* GPS Method selector */}
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Location method</label>
              <div style={{ display:'flex', gap:8, marginTop:6 }}>
                <button type="button"
                  onClick={() => setUseMap(false)}
                  style={{
                    flex:1, padding:'8px', borderRadius:8, cursor:'pointer',
                    border: `2px solid ${!useMap ? '#0F6E56' : '#e8e6df'}`,
                    background: !useMap ? '#e1f5ee' : 'white',
                    color: !useMap ? '#0F6E56' : '#555', fontSize:13, fontWeight:500,
                  }}>
                  📍 Auto GPS
                </button>
                <button type="button"
                  onClick={() => setUseMap(true)}
                  style={{
                    flex:1, padding:'8px', borderRadius:8, cursor:'pointer',
                    border: `2px solid ${useMap ? '#0F6E56' : '#e8e6df'}`,
                    background: useMap ? '#e1f5ee' : 'white',
                    color: useMap ? '#0F6E56' : '#555', fontSize:13, fontWeight:500,
                  }}>
                  🗺️ Pick on Map
                </button>
              </div>
            </div>

            {!useMap && (
              <div className="form-group">
                <button type="button" className="btn btn-secondary"
                  style={{ width:'100%', justifyContent:'center', marginBottom:8 }}
                  onClick={detectGPS}>
                  📍 Detect my location automatically
                </button>
                {gpsMsg && (
                  <div style={{ fontSize:12, color: gpsMsg.includes('Detected') ? '#0F6E56' : '#888', marginBottom:8 }}>
                    {gpsMsg}
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input className="form-input" type="number" step="0.000001"
                      placeholder="9.9312" value={form.latitude}
                      onChange={e => set('latitude', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input className="form-input" type="number" step="0.000001"
                      placeholder="77.9731" value={form.longitude}
                      onChange={e => set('longitude', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {useMap && (
              <div className="form-group">
                <div style={{ fontSize:12, color:'#888', marginBottom:6 }}>
                  Click on map to place marker. Switch to Satellite view using the layer button (top right of map).
                </div>
                <div ref={mapRef} style={{ height:280, borderRadius:10, border:'2px solid #e8e6df', overflow:'hidden', marginBottom:8 }} />
                {form.latitude && form.longitude && (
                  <div style={{ display:'flex', gap:10, background:'#f9f8f5', borderRadius:8, padding:'8px 12px' }}>
                    <span style={{ fontSize:12, color:'#0F6E56', fontFamily:'monospace' }}>
                      {form.latitude}, {form.longitude}
                    </span>
                    <button type="button" onClick={detectGPS}
                      style={{ marginLeft:'auto', fontSize:12, color:'#0F6E56', background:'none', border:'none', cursor:'pointer' }}>
                      My location
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Sowing date (optional)</label>
              <input className="form-input" type="date" value={form.sowing_date}
                onChange={e => set('sowing_date', e.target.value)} />
            </div>

            <div style={{ background:'#e1f5ee', borderRadius:6, padding:'9px 12px', fontSize:12, color:'#0F6E56' }}>
              After registering, click "Refresh NDVI" to get real satellite crop health data for this location.
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving...' : 'Register farm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
