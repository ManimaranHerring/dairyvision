import { useState, useEffect } from 'react'
import { agriAPI, farmersAPI } from '../api/index.js'
import AddFarmWithMap from '../components/AddFarmWithMap.jsx'

const HEALTH_COLOR = {
  excellent: '#1E8449', good: '#1D9E75',
  moderate: '#BA7517', stressed: '#E07B00', critical: '#E24B4A', unknown: '#B4B2A9',
}
const HEALTH_LABEL = {
  excellent: 'Excellent', good: 'Good',
  moderate: 'Moderate', stressed: 'Stressed', critical: 'Critical', unknown: 'No data',
}

function AddFarmModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', crop_type: 'paddy', area_acres: '',
    latitude: '', longitude: '', sowing_date: '',
  })
  const [busy, setBusy] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsMsg, setGpsMsg] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const detectGPS = () => {
    if (!navigator.geolocation) { setGpsMsg('GPS not available on this device'); return }
    setGpsLoading(true)
    setGpsMsg('Detecting location...')
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('latitude', pos.coords.latitude.toFixed(6))
        set('longitude', pos.coords.longitude.toFixed(6))
        setGpsMsg(`Location detected: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`)
        setGpsLoading(false)
      },
      () => { setGpsMsg('Could not detect GPS. Please enter manually.'); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 }
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
      <div className="modal">
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
                <select className="form-select" value={form.crop_type} onChange={e => set('crop_type', e.target.value)}>
                  <option value="paddy">Paddy / Rice</option>
                  <option value="maize">Maize / Corn</option>
                  <option value="sorghum">Sorghum / Jowar</option>
                  <option value="napier">Napier Grass</option>
                  <option value="sugarcane">Sugarcane</option>
                  <option value="cotton">Cotton</option>
                  <option value="groundnut">Groundnut</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Area (acres) *</label>
                <input className="form-input" type="number" step="0.1"
                  placeholder="e.g. 2.5" value={form.area_acres}
                  onChange={e => set('area_acres', e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">GPS Location</label>
              <button type="button" className="btn btn-secondary"
                style={{ marginBottom: 8, width: '100%', justifyContent: 'center' }}
                onClick={detectGPS} disabled={gpsLoading}>
                {gpsLoading ? 'Detecting...' : 'Auto-detect my location'}
              </button>
              {gpsMsg && (
                <div style={{ fontSize: 12, color: gpsMsg.includes('detected') ? '#0F6E56' : '#888', marginBottom: 8 }}>
                  {gpsMsg}
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input className="form-input" type="number" step="0.000001"
                    placeholder="e.g. 9.9312" value={form.latitude}
                    onChange={e => set('latitude', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input className="form-input" type="number" step="0.000001"
                    placeholder="e.g. 77.9731" value={form.longitude}
                    onChange={e => set('longitude', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Sowing date (optional)</label>
              <input className="form-input" type="date" value={form.sowing_date}
                onChange={e => set('sowing_date', e.target.value)} />
            </div>
            <div style={{ background: '#e1f5ee', borderRadius: 6, padding: '9px 12px', fontSize: 12, color: '#0F6E56' }}>
              After adding the farm, click "Refresh NDVI" to get real satellite crop health data.
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

function TrendPanel({ farm, onClose }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    agriAPI.ndviTrend(farm.farm_id).then(r => setData(r.data))
  }, [farm.farm_id])

  const readings = data?.readings || []
  const max = Math.max(...readings.map(r => r.ndvi), 0.6)

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-header">
        <h3>NDVI trend — {farm.farm_name}</h3>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
      </div>
      <div className="card-body">
        {readings.length === 0 ? (
          <p style={{ color: '#888', fontSize: 13 }}>No readings yet. Click Refresh NDVI to fetch satellite data.</p>
        ) : (
          <>
            <div className="bar-chart">
              {readings.map((r, i) => {
                const color = HEALTH_COLOR[r.health] || HEALTH_COLOR.unknown
                return (
                  <div key={i} className="bar-col">
                    <div className="bar-val">{r.ndvi}</div>
                    <div className="bar-fill"
                      style={{ height: `${Math.max((r.ndvi / max) * 120, 2)}px`, background: color }} />
                    <div className="bar-lbl">{r.date.slice(5)}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
              Green = healthy crop. Orange = moderate stress. Red = critical — irrigate immediately.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function FarmHealth() {
  const [farms, setFarms] = useState([])
  const [selected, setSelected] = useState(null)
  const [addModal, setAddModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    agriAPI.healthMap()
      .then(r => setFarms(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const doRefresh = async () => {
    setRefreshing(true)
    try { await agriAPI.refreshNDVI(); await load() }
    finally { setRefreshing(false) }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  const sel = farms.find(f => f.farm_id === selected)

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            Real Sentinel-2 satellite NDVI. Updated every 5 days.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={doRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh NDVI'}
          </button>
          <button className="btn btn-primary" onClick={() => setAddModal(true)}>
            + Add farm
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        {Object.entries(HEALTH_LABEL).filter(([k]) => k !== 'unknown').map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: HEALTH_COLOR[k] }} />
            {v}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 14, marginBottom: 20 }}>
        {farms.map(farm => {
          const color = HEALTH_COLOR[farm.health_status] || HEALTH_COLOR.unknown
          const label = HEALTH_LABEL[farm.health_status] || 'No data'
          const isSel = selected === farm.farm_id
          return (
            <div key={farm.farm_id} className="card farm-card"
              style={{ border: `2px solid ${isSel ? '#1D9E75' : '#e8e6df'}`, cursor: 'pointer' }}
              onClick={() => setSelected(isSel ? null : farm.farm_id)}>
              <div style={{ height: 5, background: color, borderRadius: '10px 10px 0 0' }} />
              <div style={{ padding: '13px 15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{farm.farm_name}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {farm.farmer_name} - {farm.crop_display}
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: color + '22', color,
                  }}>{label}</span>
                </div>
                <div className="ndvi-grid" style={{ marginTop: 12 }}>
                  {[
                    [farm.latest_ndvi ?? '--', 'NDVI', color],
                    [farm.area_acres + ' ac', 'area', '#378ADD'],
                    [farm.alert_count, 'alerts', farm.alert_count > 0 ? '#E24B4A' : '#1D9E75'],
                  ].map(([val, sub, c]) => (
                    <div key={sub} className="ndvi-cell">
                      <div className="nv" style={{ color: c }}>{val}</div>
                      <div className="nl">{sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
                  {farm.last_reading ? `Last updated: ${farm.last_reading}` : 'No readings yet'}
                </div>
              </div>
            </div>
          )
        })}
        {farms.length === 0 && (
          <div className="empty" style={{ gridColumn: '1/-1' }}>
            <div className="icon">🌾</div>
            <p>No farms registered. Click "+ Add farm" to register your first plot.</p>
          </div>
        )}
      </div>

      {selected && sel && <TrendPanel farm={sel} onClose={() => setSelected(null)} />}
      {addModal && <AddFarmWithMap onClose={() => setAddModal(false)} onSaved={load} />}
    </div>
  )
}
