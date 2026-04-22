import { useState, useEffect } from 'react'
import { agriAPI, farmersAPI } from '../api/index.js'

const HCOLOR = {
  excellent:'#639922', good:'#1D9E75', moderate:'#BA7517',
  stressed:'#e65100', critical:'#E24B4A', unknown:'#B4B2A9',
}
const HLABEL = {
  excellent:'Excellent', good:'Good', moderate:'Moderate',
  stressed:'Stressed', critical:'Critical', unknown:'No data',
}

function NDVIChart({ readings }) {
  if (!readings || readings.length === 0)
    return <p style={{ color:'#888', fontSize:13 }}>No readings yet.</p>
  const max = 0.8
  return (
    <div>
      <div className="bar-chart">
        {readings.map((r, i) => {
          const ndvi = parseFloat(r.ndvi)
          const color = HCOLOR[r.health] || HCOLOR.unknown
          return (
            <div key={i} className="bar-col">
              <div className="bar-val">{ndvi.toFixed(2)}</div>
              <div className="bar-fill"
                style={{ height:`${Math.max((ndvi/max)*120,2)}px`, background:color }} />
              <div className="bar-lbl">{r.date.slice(5)}</div>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop:10, fontSize:11, color:'#888' }}>
        Green = healthy · Orange = moderate · Red = stressed
      </div>
    </div>
  )
}

function AddFarmModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name:'', area_acres:'', crop_type:'sorghum',
    latitude:'', longitude:'', sowing_date:'',
  })
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    setBusy(true)
    try {
      await farmersAPI.createFarm(form)
      onSaved()
      onClose()
    } catch (ex) {
      alert('Error: ' + JSON.stringify(ex.response?.data))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>Register farm plot</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Plot name</label>
              <input className="form-input" placeholder="e.g. North Field"
                value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Area (acres)</label>
                <input className="form-input" type="number" step="0.1"
                  placeholder="2.5" value={form.area_acres}
                  onChange={e => set('area_acres', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Crop type</label>
                <select className="form-select" value={form.crop_type}
                  onChange={e => set('crop_type', e.target.value)}>
                  <option value="sorghum">Sorghum / Cholam</option>
                  <option value="maize">Maize / Makka Cholam</option>
                  <option value="napier">Napier Grass</option>
                  <option value="paddy">Paddy / Rice</option>
                  <option value="sugarcane">Sugarcane</option>
                  <option value="cotton">Cotton</option>
                  <option value="groundnut">Groundnut</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input className="form-input" type="number" step="0.0001"
                  placeholder="9.9312" value={form.latitude}
                  onChange={e => set('latitude', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input className="form-input" type="number" step="0.0001"
                  placeholder="77.9731" value={form.longitude}
                  onChange={e => set('longitude', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Sowing date</label>
              <input className="form-input" type="date" value={form.sowing_date}
                onChange={e => set('sowing_date', e.target.value)} />
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Register farm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FarmHealth() {
  const [farms, setFarms] = useState([])
  const [selected, setSelected] = useState(null)
  const [trendData, setTrendData] = useState(null)
  const [addModal, setAddModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    agriAPI.healthMap()
      .then(r => { setFarms(r.data); setError('') })
      .catch(() => setError('Could not load farm data.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const selectFarm = async (id) => {
    if (selected === id) {
      setSelected(null)
      setTrendData(null)
      return
    }
    setSelected(id)
    try {
      const r = await agriAPI.ndviTrend(id)
      setTrendData(r.data)
    } catch {
      setTrendData(null)
    }
  }

  const doRefresh = async () => {
    setRefreshing(true)
    try {
      await agriAPI.refreshNDVI()
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  if (error) return (
    <div className="page-body">
      <div className="empty">
        <div className="icon">⚠</div>
        <p>{error}</p>
        <button className="btn btn-primary" style={{ marginTop:16 }} onClick={load}>Try again</button>
      </div>
    </div>
  )

  const sel = farms.find(f => f.farm_id === selected)

  return (
    <div className="page-body">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:600 }}>Farm health map</h2>
          <p style={{ fontSize:13, color:'#888', marginTop:2 }}>Satellite NDVI — updates every 5 days</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-secondary" onClick={doRefresh} disabled={refreshing}>
            {refreshing ? '⟳ Refreshing…' : '⟳ Refresh NDVI'}
          </button>
          <button className="btn btn-primary" onClick={() => setAddModal(true)}>+ Add farm</button>
        </div>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:14, marginBottom:14 }}>
        {Object.entries(HLABEL).filter(([k]) => k !== 'unknown').map(([k, v]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
            <div style={{ width:12, height:12, borderRadius:'50%', background:HCOLOR[k] }} />
            {v}
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14, marginBottom:20 }}>
        {farms.map(f => {
          const color = HCOLOR[f.health_status] || HCOLOR.unknown
          const label = HLABEL[f.health_status] || 'No data'
          const isSel = selected === f.farm_id
          return (
            <div key={f.farm_id} className="card farm-card"
              style={{ border:`2px solid ${isSel ? '#1D9E75' : '#e8e6df'}` }}
              onClick={() => selectFarm(f.farm_id)}>
              <div className="health-bar" style={{ background:color }} />
              <div style={{ padding:'13px 15px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:15 }}>{f.farm_name}</div>
                    <div style={{ fontSize:12, color:'#888', marginTop:2 }}>
                      {f.farmer_name} · {f.village}
                    </div>
                  </div>
                  <span className={`badge badge-${f.health_status}`}>{label}</span>
                </div>
                <div className="ndvi-grid">
                  {[
                    [f.latest_ndvi?.toFixed(2) ?? '—', 'NDVI', color],
                    [f.area_acres, 'acres', '#378ADD'],
                    [f.alert_count, 'alerts', f.alert_count > 0 ? '#e65100' : '#639922'],
                  ].map(([val, sub, c]) => (
                    <div key={sub} className="ndvi-cell">
                      <div className="nv" style={{ color:c }}>{val}</div>
                      <div className="nl">{sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:10, fontSize:12, color:'#888',
                  display:'flex', justifyContent:'space-between' }}>
                  <span>🌾 {f.crop_type}</span>
                  <span>{f.reading_date ? `Updated ${f.reading_date}` : 'No readings yet'}</span>
                </div>
              </div>
            </div>
          )
        })}
        {farms.length === 0 && (
          <div className="empty" style={{ gridColumn:'1/-1' }}>
            <div className="icon">🌾</div>
            <p>No farms registered. Click "+ Add farm".</p>
          </div>
        )}
      </div>

      {selected && sel && trendData && (
        <div className="card" style={{ marginTop:18 }}>
          <div className="card-header">
            <h3>NDVI trend — {sel.farm_name}</h3>
            <button className="btn btn-secondary btn-sm"
              onClick={() => { setSelected(null); setTrendData(null) }}>
              ✕ Close
            </button>
          </div>
          <div className="card-body">
            <NDVIChart readings={trendData.readings} />
          </div>
        </div>
      )}

      {addModal && <AddFarmModal onClose={() => setAddModal(false)} onSaved={load} />}
    </div>
  )
}